"use server"

import { addPendingItems, readPending, writePending, readContent, readRejected } from "./storage"
import { extractWithDeepSeek } from "./deepseek"
import type { RepoInput } from "./deepseek"
import {
  classifyRustSignal,
  scoreJobText,
  shouldQueue,
  QUEUE_THRESHOLD,
} from "./prefilter"
import type { PendingItem, ScanLog, ContentType } from "./types"
import { collectGrants } from "@/lib/pipeline/scan/grants"
import { collectReddit } from "@/lib/pipeline/scan/reddit"
import { sleep, stripHtml, decodeHTML, extractMinimalJob, estimateConfidence } from "@/lib/pipeline/scan/shared"
import {
  ghFetch, ossSearchPage, ossJunkFilter, ossActivityTier,
  buildOSSExtracted, mapRepoResponse, extractGitHubRepoUrls, RUST_ORGS,
} from "@/lib/pipeline/scan/github"
import { auth } from "@/lib/auth"

async function requireAdmin() {
  const session = await auth()
  const adminEmail = process.env.ADMIN_EMAIL
  if (!adminEmail || session?.user?.email !== adminEmail) {
    throw new Error("Unauthorized")
  }
}

// ── HN Who Is Hiring ──────────────────────────────────────────────────────────

type HNSearchHit = {
  objectID: string
  comment_text?: string
  created_at?: string
}

async function findLatestHNHiringPost(): Promise<number | null> {
  try {
    const res = await fetch(
      "https://hn.algolia.com/api/v1/search_by_date?tags=story,author_whoishiring&query=hiring&hitsPerPage=1",
      { signal: AbortSignal.timeout(15_000), next: { revalidate: 0 } }
    )
    const data = await res.json()
    const hit = data?.hits?.[0]
    return hit ? parseInt(hit.objectID) : null
  } catch {
    return null
  }
}

export async function scanHNHiring(useAI = false): Promise<ScanLog> {
  await requireAdmin()
  // Always use AI when key is present — checkbox is a manual override only
  const shouldUseAI = useAI || !!process.env.DEEPSEEK_API_KEY
  const log: ScanLog = {
    source: "hn-hiring",
    startedAt: new Date().toISOString(),
    found: 0,
    added: 0,
    skipped: 0,
    errors: [],
    stages: {},
    notes: [],
  }

  const storyId = await findLatestHNHiringPost()
  if (!storyId) {
    log.errors.push("Could not locate the latest Who-is-hiring thread")
    log.finishedAt = new Date().toISOString()
    return log
  }
  log.notes!.push(`Scanning HN story ${storyId}`)

  try {
    const res = await fetch(
      `https://hn.algolia.com/api/v1/search?tags=comment,story_${storyId}&query=rust&hitsPerPage=100&attributesToRetrieve=objectID,comment_text,created_at`,
      { signal: AbortSignal.timeout(20_000), next: { revalidate: 0 } }
    )
    const data = await res.json()
    const hits: HNSearchHit[] = data?.hits ?? []
    log.found = hits.length
    log.stages!.fetched = hits.length

    // Build dedup set: pending IDs + already processed (approved or rejected) IDs
    const processedIds = new Set<string>()
    try {
      for (const item of (await readPending("jobs"))) processedIds.add(item.id)
      for (const item of (await readRejected("jobs"))) processedIds.add(item.id)
    } catch { /* non-fatal */ }

    // Also dedup by href against published content
    const publishedHrefs = new Set<string>()
    try {
      for (const item of (await readContent("jobs"))) {
        const href = String(item.href ?? "")
        if (href) publishedHrefs.add(href)
      }
    } catch { /* non-fatal */ }

    let rustFiltered = 0
    let scoreFiltered = 0
    let dupFiltered = 0
    const pendingItems: PendingItem[] = []

    for (const hit of hits) {
      const text = decodeHTML(hit.comment_text ?? "")

      // STAGE 1: Hard Rust pre-filter
      const signal = classifyRustSignal(text)
      if (signal !== "strong") {
        rustFiltered++
        continue
      }

      // STAGE 2: Scoring (remote / seniority / onsite)
      const score = scoreJobText(text)
      if (!shouldQueue(score)) {
        scoreFiltered++
        continue
      }

      const id = `hn-${hit.objectID}`
      if (processedIds.has(id)) { dupFiltered++; continue }

      const sourceUrl = `https://news.ycombinator.com/item?id=${hit.objectID}`

      let extracted: Record<string, unknown>
      if (shouldUseAI) {
        const result = await extractWithDeepSeek("jobs", text)
        if (!result.ok || !result.data) {
          log.notes!.push(`AI extract failed for ${id}: ${result.error?.slice(0, 80)}`)
          extracted = extractMinimalJob(text)
        } else if ((result.data as any).skip === true) {
          // DeepSeek determined this is not a Rust-primary role
          dupFiltered++
          continue
        } else {
          extracted = result.data
        }
      } else {
        extracted = extractMinimalJob(text)
      }

      // Dedup by href against already-published jobs
      const extractedHref = String(extracted.href ?? "")
      if (extractedHref && publishedHrefs.has(extractedHref)) { dupFiltered++; continue }

      pendingItems.push({
        id,
        type: "jobs",
        status: "pending",
        source: "hn-hiring",
        sourceUrl,
        foundAt: hit.created_at ?? new Date().toISOString(),
        confidence: estimateConfidence(extracted),
        score: score.total,
        whyMatched: score.reasons.join(" · "),
        rawText: text.slice(0, 2000),
        extracted,
      })
    }

    log.stages!.rustFiltered  = rustFiltered
    log.stages!.scoreFiltered = scoreFiltered
    log.stages!.dupFiltered   = dupFiltered
    log.stages!.queued        = pendingItems.length
    log.added = await addPendingItems("jobs", pendingItems)
    log.skipped = log.found - pendingItems.length

    if (pendingItems.length === 0 && hits.length > 0) {
      log.notes!.push(
        `No comments passed score threshold (${QUEUE_THRESHOLD}). Try relaxing filters or check different thread.`
      )
    }
  } catch (e) {
    log.errors.push(`Scan failed: ${String(e)}`)
  }

  log.finishedAt = new Date().toISOString()
  return log
}

// ── TWIR Scanner ──────────────────────────────────────────────────────────────

// Fetch a TWIR OSS repo via GitHub API and return a PendingItem, or null if junk.
async function twirFetchOSSRepos(urls: string[], issueUrl: string, label: string): Promise<PendingItem[]> {
  const published = new Set(
    ((await readContent("oss")) as Array<Record<string, unknown>>).map((r) => String(r.href ?? ""))
  )
  const items: PendingItem[] = []
  for (const url of urls) {
    const m = url.match(/github\.com\/([^/]+)\/([^/]+)/)
    if (!m) continue
    if (published.has(url)) continue
    const [, owner, repo] = m
    try {
      const r = await ghFetch(`https://api.github.com/repos/${owner}/${repo}`) as Record<string, unknown>
      const mapped = mapRepoResponse(r)
      const { junk } = ossJunkFilter(mapped)
      if (junk || (mapped.stargazers_count ?? 0) < 10) continue
      items.push({
        id: `twir-oss-${owner}-${repo}`,
        type: "oss",
        status: "pending",
        source: "twir",
        sourceUrl: issueUrl,
        foundAt: new Date().toISOString(),
        confidence: 0.9,
        score: 0.9,
        whyMatched: `Featured in TWIR (${label})`,
        rawText: url,
        extracted: { ...buildOSSExtracted(mapped), labels: [label] },
      })
      await sleep(400)
    } catch { continue }
  }
  return items
}

export async function scanTWIR(useAI = false): Promise<ScanLog> {
  await requireAdmin()
  const shouldUseAI = useAI || !!process.env.DEEPSEEK_API_KEY
  const log: ScanLog = {
    source: "twir",
    startedAt: new Date().toISOString(),
    found: 0, added: 0, skipped: 0, errors: [], stages: {}, notes: [],
  }

  // ── Fetch latest issue ─────────────────────────────────────────────────────
  let issueUrl: string
  try {
    const rssRes = await fetch("https://this-week-in-rust.org/rss.xml", {
      signal: AbortSignal.timeout(15_000), next: { revalidate: 0 },
    })
    const rssText = await rssRes.text()
    const linkMatch = rssText.match(/<link>(https:\/\/this-week-in-rust\.org\/blog\/[^<]+)<\/link>/)
    if (!linkMatch) {
      log.errors.push("Could not parse TWIR RSS feed")
      log.finishedAt = new Date().toISOString()
      return log
    }
    issueUrl = linkMatch[1]
    log.notes!.push(`Latest issue: ${issueUrl}`)
  } catch (e) {
    log.errors.push(`RSS fetch failed: ${String(e)}`)
    log.finishedAt = new Date().toISOString()
    return log
  }

  let html: string
  try {
    const htmlRes = await fetch(issueUrl, { signal: AbortSignal.timeout(20_000), next: { revalidate: 0 } })
    html = await htmlRes.text()
  } catch (e) {
    log.errors.push(`Issue fetch failed: ${String(e)}`)
    log.finishedAt = new Date().toISOString()
    return log
  }

  function section(id: string): string {
    const re = new RegExp(
      `<h2[^>]*id="${id}"[^>]*>[\\s\\S]*?</h2>([\\s\\S]*?)(?=<h[12][^>]*id=|$)`, "i"
    )
    const m = html.match(re)
    return m ? m[1] : ""
  }

  // ── Jobs ───────────────────────────────────────────────────────────────────
  const jobsSection = section("jobs")
  if (jobsSection.length > 50) {
    let entries = Array.from(jobsSection.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi))
      .map((m) => stripHtml(m[1]))
      .filter((s) => s.trim().length > 30)

    if (entries.length === 0) {
      const pText = stripHtml(jobsSection).toLowerCase()
      if (pText.includes("who's hiring thread") || pText.includes("r/rust")) {
        log.notes!.push("TWIR now redirects jobs to r/rust Who's Hiring — use Reddit scanner.")
      } else {
        entries = stripHtml(jobsSection)
          .split(/(?<=\.)\s+(?=[A-Z])/g)
          .filter((s) => /hiring|rust|engineer|developer|apply/i.test(s) && s.length > 50)
        log.notes!.push("Used fallback regex parser for jobs")
      }
    }

    let rustFiltered = 0
    const jobItems: PendingItem[] = []
    for (const text of entries.slice(0, 30)) {
      if (classifyRustSignal(text) !== "strong") { rustFiltered++; continue }
      const score = scoreJobText(text)
      if (!shouldQueue(score)) continue
      let extracted: Record<string, unknown>
      if (shouldUseAI) {
        const result = await extractWithDeepSeek("jobs", text)
        extracted = (result.ok && result.data) ? result.data : extractMinimalJob(text)
      } else {
        extracted = extractMinimalJob(text)
      }
      jobItems.push({
        id: `twir-job-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: "jobs",
        status: "pending",
        source: "twir",
        sourceUrl: issueUrl,
        foundAt: new Date().toISOString(),
        confidence: estimateConfidence(extracted),
        score: score.total,
        whyMatched: score.reasons.join(" · "),
        rawText: text.slice(0, 1000),
        extracted,
      })
    }
    log.stages!.jobsFound = entries.length
    log.stages!.jobsRustFiltered = rustFiltered
    log.stages!.jobsQueued = jobItems.length
    const addedJobs = await addPendingItems("jobs", jobItems)
    log.found += entries.length
    log.added += addedJobs
  }

  // ── Crate of the Week → OSS ────────────────────────────────────────────────
  const cotwHtml = section("crate-of-the-week")
  if (cotwHtml) {
    const urls = extractGitHubRepoUrls(cotwHtml)
    log.stages!.crateOfWeekRepos = urls.length
    const ossItems = await twirFetchOSSRepos(urls.slice(0, 3), issueUrl, "crate-of-week")
    log.found += urls.length
    log.added += await addPendingItems("oss", ossItems)
    log.stages!.crateOfWeekQueued = ossItems.length
  }

  // ── Call for Participation → OSS (cfp label) ───────────────────────────────
  const cfpHtml = section("call-for-participation")
  if (cfpHtml) {
    const urls = extractGitHubRepoUrls(cfpHtml)
    log.stages!.cfpRepos = urls.length
    const ossItems = await twirFetchOSSRepos(urls.slice(0, 12), issueUrl, "cfp")
    log.found += urls.length
    log.added += await addPendingItems("oss", ossItems)
    log.stages!.cfpQueued = ossItems.length
  }

  // ── Events section ─────────────────────────────────────────────────────────
  const eventsHtml = section("events")
  if (eventsHtml.length > 50) {
    const eventItems: PendingItem[] = []
    for (const m of Array.from(eventsHtml.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)).slice(0, 30)) {
      const rawLi = m[1]
      const text = stripHtml(rawLi).trim()
      if (text.length < 20) continue
      const linkMatch = rawLi.match(/href="([^"]+)"/)
      if (!linkMatch || !linkMatch[1].startsWith("http")) continue
      const href = linkMatch[1]
      const dateMatch = text.match(/(\d{4}-\d{2}-\d{2})/)
      const location = text.match(/\|\s*([^|]+)\s*\|/)?.[1]?.trim() ?? ""
      let extracted: Record<string, unknown>
      if (shouldUseAI) {
        const result = await extractWithDeepSeek("events", text)
        extracted = (result.ok && result.data) ? result.data : { name: text.split("|").pop()?.trim() ?? text, href, date: dateMatch?.[1] ?? "", format: "In-Person", location }
      } else {
        extracted = {
          name: text.split("|").pop()?.trim() ?? text,
          href,
          date: dateMatch?.[1] ?? "",
          format: /virtual|online/i.test(text) ? "Online" : "In-Person",
          location,
        }
      }
      eventItems.push({
        id: `twir-event-${href.replace(/[^a-z0-9]/gi, "").slice(-28)}`,
        type: "events",
        status: "pending",
        source: "twir",
        sourceUrl: issueUrl,
        foundAt: new Date().toISOString(),
        confidence: 0.85,
        score: 0.8,
        whyMatched: "Listed in TWIR events section",
        rawText: text.slice(0, 400),
        extracted,
      })
      log.found++
    }
    log.stages!.eventsQueued = eventItems.length
    log.added += await addPendingItems("events", eventItems)
  }

  // ── News & Blog Posts → News ───────────────────────────────────────────────
  const newsHtml = section("updates-from-rust-community") || section("news-blog-posts")
  if (newsHtml.length > 50) {
    const newsItems: PendingItem[] = []
    const linkRe = /<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi
    let lm: RegExpExecArray | null
    while ((lm = linkRe.exec(newsHtml)) !== null) {
      const [, href, rawTitle] = lm
      const title = stripHtml(rawTitle).trim()
      if (!title || title.length < 10) continue
      if (!href.startsWith("http") || href.includes("this-week-in-rust.org")) continue
      newsItems.push({
        id: `twir-news-${href.replace(/[^a-z0-9]/gi, "").slice(-24)}`,
        type: "news",
        status: "pending",
        source: "twir",
        sourceUrl: issueUrl,
        foundAt: new Date().toISOString(),
        confidence: 0.75,
        score: 0.7,
        whyMatched: "Linked in TWIR news section",
        rawText: title,
        extracted: {
          title,
          href,
          kind: "Blog",
          date: new Date().toISOString().slice(0, 10),
          source: "twir",
          blurb: "",
        },
      })
      log.found++
    }
    log.stages!.newsLinksQueued = newsItems.length
    log.added += await addPendingItems("news", newsItems)
  }

  log.skipped = log.found - log.added
  log.finishedAt = new Date().toISOString()
  return log
}

// ── GitHub OSS Scanner (metadata-first, no AI required) ──────────────────────

export async function scanGitHubOSS(): Promise<ScanLog> {
  await requireAdmin()
  const log: ScanLog = {
    source: "github-oss",
    startedAt: new Date().toISOString(),
    found: 0,
    added: 0,
    skipped: 0,
    errors: [],
    stages: {},
    notes: [],
  }

  const since365 = new Date(Date.now() - 365 * 86_400_000).toISOString().split("T")[0]

  // Build dedup sets against everything already in the corpus
  const existingIds   = new Set<string>()
  const existingHrefs = new Set<string>()
  try {
    for (const item of (await readPending("oss"))) {
      existingIds.add(item.id)
      if (item.sourceUrl) existingHrefs.add(item.sourceUrl)
    }
    for (const item of (await readContent("oss"))) {
      const href = String(item.href ?? "")
      if (href) existingHrefs.add(href)
    }
  } catch { /* non-fatal */ }

  const rawRepos: RepoInput[] = []
  const seenIds = new Set<number>()

  function ingest(r: any) {
    if (seenIds.has(r.id)) return
    if (r.archived || r.disabled) return
    seenIds.add(r.id)
    rawRepos.push(mapRepoResponse(r))
  }

  // ── 1. GitHub Search (multiple star ranges + topic-based + issue signals) ──
  // Split by star range so each query stays inside GitHub's 1000-result cap.
  // Two pages at 100 per page = up to 200 repos per query.
  // Sort by `updated` for freshness; GitHub Search API caps results at 10 pages.
  const SEARCH_QUERIES: Array<{ label: string; q: string }> = [
    { label: "stars:20-99",        q: `language:Rust+stars:20..99+pushed:>${since365}` },
    { label: "stars:100-499",      q: `language:Rust+stars:100..499+pushed:>${since365}` },
    { label: "stars:500-1999",     q: `language:Rust+stars:500..1999+pushed:>${since365}` },
    { label: "stars:2000-9999",    q: `language:Rust+stars:2000..9999+pushed:>${since365}` },
    { label: "stars:10000+",       q: `language:Rust+stars:>=10000` },
    { label: "good-first-issues",  q: `language:Rust+good-first-issues:>0+stars:>=20+pushed:>${since365}` },
    { label: "help-wanted",        q: `language:Rust+help-wanted-issues:>0+stars:>=20+pushed:>${since365}` },
    { label: "topic:embedded",     q: `language:Rust+topic:embedded+stars:>=20` },
    { label: "topic:webassembly",  q: `language:Rust+topic:webassembly+stars:>=20` },
    { label: "topic:async-rust",   q: `language:Rust+topic:async-rust+stars:>=20` },
    { label: "topic:database",     q: `language:Rust+topic:database+stars:>=20` },
    { label: "topic:command-line", q: `language:Rust+topic:command-line+stars:>=20` },
  ]

  let searchTotal = 0
  for (const { label, q } of SEARCH_QUERIES) {
    let queryCount = 0
    for (let page = 1; page <= 2; page++) {
      const items = await ossSearchPage(q, page)
      for (const r of items) ingest(r)
      queryCount += items.length
      if (items.length < 100) break // no more pages
      if (page < 2) await sleep(2000) // stay under search rate limit (30 req/min)
    }
    log.stages![`search_${label}`] = queryCount
    searchTotal += queryCount
  }
  log.notes!.push(`Search API: ${searchTotal} results across ${SEARCH_QUERIES.length} queries`)

  // ── 2. Org scans (parallel batches to avoid overwhelming the API) ─────────
  const ORG_BATCH_SIZE = 10
  let orgTotal = 0
  for (let i = 0; i < RUST_ORGS.length; i += ORG_BATCH_SIZE) {
    const batch = RUST_ORGS.slice(i, i + ORG_BATCH_SIZE)
    const results = await Promise.allSettled(
      batch.map((org) =>
        ghFetch(`https://api.github.com/orgs/${org}/repos?type=public&sort=pushed&per_page=100`)
          .then((data) => ({ org, repos: (data as any[]) ?? [] }))
      )
    )
    for (const result of results) {
      if (result.status === "rejected") {
        log.errors.push(`Org scan: ${String(result.reason).slice(0, 80)}`)
        continue
      }
      const { repos } = result.value
      let added = 0
      for (const r of repos) {
        if (r.language && r.language !== "Rust") continue
        ingest(r)
        added++
      }
      orgTotal += added
    }
  }
  log.notes!.push(`Org scans: ${orgTotal} Rust repos across ${RUST_ORGS.length} orgs`)

  log.found = rawRepos.length

  // ── 3. Quality filter (deterministic — no AI) ─────────────────────────────
  const toQueue: PendingItem[] = []
  const rejectionReasons: Record<string, number> = {}
  let dupCount = 0
  let junkCount = 0

  for (const repo of rawRepos) {
    const id = `gh-${repo.id}`

    // Skip repos already in corpus or pending queue
    if (existingIds.has(id) || existingHrefs.has(repo.html_url)) {
      dupCount++
      continue
    }

    // Deterministic quality rules
    const { junk, reason } = ossJunkFilter(repo as any)
    if (junk) {
      junkCount++
      rejectionReasons[reason] = (rejectionReasons[reason] ?? 0) + 1
      continue
    }

    const tier       = ossActivityTier(repo.pushed_at)
    const stars      = repo.stargazers_count
    const confidence = Math.min(0.9, 0.5 + Math.log10(Math.max(1, stars)) / 10)

    toQueue.push({
      id,
      type:       "oss",
      status:     "pending",
      source:     "github-oss",
      sourceUrl:  repo.html_url,
      foundAt:    new Date().toISOString(),
      confidence,
      whyMatched: `${tier} · ★${stars} · ${repo.owner_login}`,
      rawText:    `${repo.full_name}: ${repo.description ?? ""}`,
      extracted:  buildOSSExtracted(repo),
    })
  }

  // ── 4. Queue ──────────────────────────────────────────────────────────────
  log.added = await addPendingItems("oss", toQueue)
  log.skipped = dupCount + junkCount
  log.stages!.queued      = toQueue.length
  log.stages!.duplicates  = dupCount
  log.stages!.junkFiltered = junkCount

  // ── 5. Scan report ────────────────────────────────────────────────────────
  if (Object.keys(rejectionReasons).length > 0) {
    const reasonStr = Object.entries(rejectionReasons)
      .sort((a, b) => b[1] - a[1])
      .map(([r, n]) => `${r}(${n})`)
      .join(", ")
    log.notes!.push(`Quality rejections: ${reasonStr}`)
  }

  // Star bucket distribution of queued repos
  const starBuckets: Record<string, number> = {
    "20-99": 0, "100-499": 0, "500-1999": 0, "2k-9999": 0, "10k+": 0,
  }
  const activityBuckets: Record<string, number> = { active: 0, maintenance: 0, dormant: 0 }
  const ownerCounts: Record<string, number> = {}

  for (const item of toQueue) {
    const s = (item.extracted.stars as number) ?? 0
    if (s < 100)        starBuckets["20-99"]++
    else if (s < 500)   starBuckets["100-499"]++
    else if (s < 2000)  starBuckets["500-1999"]++
    else if (s < 10000) starBuckets["2k-9999"]++
    else                starBuckets["10k+"]++

    const tier = item.extracted.activityTier as string ?? "dormant"
    activityBuckets[tier] = (activityBuckets[tier] ?? 0) + 1

    const owner = item.extracted.owner as string ?? "unknown"
    ownerCounts[owner] = (ownerCounts[owner] ?? 0) + 1
  }

  const starReport = Object.entries(starBuckets).map(([k, v]) => `${k}:${v}`).join(" | ")
  const actReport  = Object.entries(activityBuckets).map(([k, v]) => `${k}:${v}`).join(" | ")
  const topOwners  = Object.entries(ownerCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([o, n]) => `${o}(${n})`)
    .join(", ")

  log.notes!.push(`★ buckets: ${starReport}`)
  log.notes!.push(`Activity: ${actReport}`)
  log.notes!.push(`Top owners: ${topOwners}`)
  log.notes!.push(`Unique repos found: ${rawRepos.length} | already in corpus: ${dupCount} | quality-rejected: ${junkCount} | queued: ${log.added}`)

  log.finishedAt = new Date().toISOString()
  return log
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// ── Shared HN story helper ────────────────────────────────────────────────────

type HNStoryHit = {
  objectID: string
  title?: string
  url?: string
  created_at?: string
}

async function hnSearch(query: string, hitsPerPage = 10): Promise<HNStoryHit[]> {
  try {
    const res = await fetch(
      `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=${hitsPerPage}`,
      { signal: AbortSignal.timeout(15_000), next: { revalidate: 0 } }
    )
    const data = await res.json()
    return data?.hits ?? []
  } catch {
    return []
  }
}

// ── Grants Scanner ────────────────────────────────────────────────────────────

// Legacy wrapper: delegates to the shared core and persists to admin_queue for
// the old scan panel. Kept only until the panel is removed in Stage 4.
export async function scanGrants(): Promise<ScanLog> {
  await requireAdmin()
  const publishedHrefs = new Set((await readContent("grants")).map(i => String(i.href ?? "")))
  const { log, items } = await collectGrants({ isKnown: (href) => publishedHrefs.has(href) })
  log.added = await addPendingItems("grants", items)
  return log
}

// ── Pulse Scanner ─────────────────────────────────────────────────────────────

export async function scanPulse(): Promise<ScanLog> {
  await requireAdmin()
  const log: ScanLog = {
    source: "pulse", startedAt: new Date().toISOString(),
    found: 0, added: 0, skipped: 0, errors: [], stages: {}, notes: [],
  }

  // Community resource repos (newsletter, forum, podcast, blog) — NOT filtered by language
  // because pulse resources often live in non-Rust codebases
  const ghQueries = [
    "topic:rust-newsletter",
    "topic:rust-community",
    "rust+newsletter+in:name",
    "rust+podcast+in:name",
    "rust+blog+resources+in:name,description",
  ]

  const repos: (RepoInput & { homepage?: string })[] = []
  const seenIds = new Set<number>()

  for (const q of ghQueries) {
    try {
      const data = await ghFetch(
        `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=stars&per_page=10`
      ) as { items?: (RepoInput & { homepage?: string })[] }
      const items = data?.items ?? []
      log.stages![`gh_${q.slice(0, 20)}`] = items.length
      for (const r of items) {
        if (!seenIds.has(r.id) && r.stargazers_count >= 20) {
          seenIds.add(r.id); repos.push(r)
        }
      }
    } catch (e) {
      log.errors.push(`GitHub "${q.slice(0, 30)}": ${String(e)}`)
    }
  }

  log.found = repos.length
  const existingIds = new Set((await readPending("pulse")).map(i => i.id))
  const pendingItems: PendingItem[] = []

  for (const repo of repos) {
    const id = `gh-pulse-${repo.id}`
    if (existingIds.has(id)) { log.skipped++; continue }

    const href = repo.homepage || repo.html_url
    const text = [
      `${repo.name}: ${repo.description ?? ""}`,
      `URL: ${href}`,
      `GitHub: ${repo.html_url}`,
    ].join("\n")

    const result = await extractWithDeepSeek("pulse", text)
    if (!result.ok || !result.data) { log.skipped++; continue }

    pendingItems.push({
      id, type: "pulse", status: "pending",
      source: "github-pulse", sourceUrl: repo.html_url,
      foundAt: new Date().toISOString(),
      confidence: 0.6, whyMatched: `${repo.stargazers_count}★ · community resource`,
      rawText: text,
      extracted: { ...result.data, href: result.data.href || href },
    })
  }

  log.stages!.queued = pendingItems.length
  log.added = await addPendingItems("pulse", pendingItems)
  log.finishedAt = new Date().toISOString()
  return log
}

// ── Events Scanner ────────────────────────────────────────────────────────────

export async function scanEvents(): Promise<ScanLog> {
  await requireAdmin()
  const log: ScanLog = {
    source: "events", startedAt: new Date().toISOString(),
    found: 0, added: 0, skipped: 0, errors: [], stages: {}, notes: [],
  }

  const queries = [
    "RustConf 2025",
    "EuroRust 2025",
    "Oxidize conference Rust",
    "Rust Nation conference",
    "Rust workshop conference 2025",
  ]

  const stories: HNStoryHit[] = []
  const seenIds = new Set<string>()

  for (const q of queries) {
    const hits = await hnSearch(q, 5)
    log.stages![`hn_${q.slice(0, 15)}`] = hits.length
    for (const h of hits) {
      if (!seenIds.has(h.objectID)) { seenIds.add(h.objectID); stories.push(h) }
    }
  }

  log.found = stories.length
  const existingIds = new Set((await readPending("events")).map(i => i.id))
  const pendingItems: PendingItem[] = []

  for (const story of stories) {
    const id = `hn-event-${story.objectID}`
    if (existingIds.has(id)) { log.skipped++; continue }

    const sourceUrl = `https://news.ycombinator.com/item?id=${story.objectID}`
    const text = [story.title, story.url ? `URL: ${story.url}` : ""].filter(Boolean).join("\n")

    const result = await extractWithDeepSeek("events", text)
    if (!result.ok || !result.data) { log.skipped++; continue }

    pendingItems.push({
      id, type: "events", status: "pending",
      source: "hn-events", sourceUrl,
      foundAt: story.created_at ?? new Date().toISOString(),
      confidence: 0.65, whyMatched: story.title ?? "",
      rawText: text,
      extracted: { ...result.data, href: result.data.href || story.url || sourceUrl },
    })
  }

  log.stages!.queued = pendingItems.length
  log.added = await addPendingItems("events", pendingItems)
  log.finishedAt = new Date().toISOString()
  return log
}

// ── Portals Scanner ───────────────────────────────────────────────────────────

// Direct Rust pages on major job boards. These are the canonical filtered URLs —
// not the homepage, specifically the Rust search/filter landing page.
const PORTAL_SEEDS = [
  {
    name: "LinkedIn — Rust Developer Jobs",
    kind: "General",
    href: "https://www.linkedin.com/jobs/rust-developer-jobs/",
    description: "LinkedIn filtered for Rust developer roles. Largest professional network, high volume of direct employer postings.",
    tags: ["general", "high-volume"],
  },
  {
    name: "Indeed — Rust Developer Jobs",
    kind: "General",
    href: "https://www.indeed.com/q-rust-developer-jobs.html",
    description: "Indeed filtered for Rust developer roles. Broad reach across startups and enterprise.",
    tags: ["general", "high-volume"],
  },
  {
    name: "Glassdoor — Rust Developer Jobs",
    kind: "General",
    href: "https://www.glassdoor.com/Job/rust-developer-jobs-SRCH_KO0,19.htm",
    description: "Glassdoor Rust jobs with salary transparency and company culture data.",
    tags: ["general", "salary-data"],
  },
  {
    name: "We Work Remotely — Rust",
    kind: "Remote-only",
    href: "https://weworkremotely.com/remote-rust-jobs",
    description: "Dedicated Rust section on one of the largest remote job boards.",
    tags: ["remote-only"],
  },
  {
    name: "Arc.dev — Remote Rust Jobs",
    kind: "Remote-only",
    href: "https://arc.dev/remote-jobs/rust",
    description: "Vetted remote Rust developer roles. Screened candidates and employers.",
    tags: ["remote-only", "vetted"],
  },
  {
    name: "Hired — Rust Engineering",
    kind: "Aggregator",
    href: "https://hired.com/jobs/rust",
    description: "Hired's Rust engineering listings. Tech-focused with salary transparency and company bids.",
    tags: ["aggregator", "salary-data"],
  },
]

export async function scanPortals(): Promise<ScanLog> {
  await requireAdmin()
  const log: ScanLog = {
    source: "portals", startedAt: new Date().toISOString(),
    found: 0, added: 0, skipped: 0, errors: [], stages: {}, notes: [],
  }

  const existingIds = new Set((await readPending("portals")).map(i => i.id))
  const existingHrefs = new Set((await readContent("portals")).map(i => String(i.href ?? "")))
  const pendingItems: PendingItem[] = []

  // Add seeded portals that aren't already published or pending
  for (const portal of PORTAL_SEEDS) {
    const id = `portal-seed-${portal.name.replace(/\W+/g, "-").toLowerCase()}`
    if (existingIds.has(id) || existingHrefs.has(portal.href)) { log.skipped++; continue }

    pendingItems.push({
      id, type: "portals", status: "pending",
      source: "portal-seed", sourceUrl: portal.href,
      foundAt: new Date().toISOString(),
      confidence: 0.9, whyMatched: `Known Rust job portal — ${portal.kind}`,
      rawText: `${portal.name}: ${portal.description}`,
      extracted: portal,
    })
  }

  log.stages!.seeded = pendingItems.length
  log.notes!.push(`${pendingItems.length} known portals queued`)

  // Search HN for any additional portals people discuss
  const hnHits = await hnSearch("rust jobs where apply remote", 10)
  const hnCandidates = hnHits.filter(h => h.url && !h.url.includes("ycombinator"))
  log.stages!.hnCandidates = hnCandidates.length

  for (const story of hnCandidates.slice(0, 5)) {
    const id = `hn-portal-${story.objectID}`
    if (existingIds.has(id)) { log.skipped++; continue }

    const text = [story.title, `URL: ${story.url}`].join("\n")
    const result = await extractWithDeepSeek("portals", text)
    if (!result.ok || !result.data) continue

    pendingItems.push({
      id, type: "portals", status: "pending",
      source: "hn-portals",
      sourceUrl: `https://news.ycombinator.com/item?id=${story.objectID}`,
      foundAt: story.created_at ?? new Date().toISOString(),
      confidence: 0.5, whyMatched: story.title ?? "",
      rawText: text,
      extracted: { ...result.data, href: result.data.href || story.url },
    })
  }

  log.found = PORTAL_SEEDS.length + hnCandidates.length
  log.stages!.queued = pendingItems.length
  log.added = await addPendingItems("portals", pendingItems)
  log.finishedAt = new Date().toISOString()
  return log
}

// ── Companies Scanner ─────────────────────────────────────────────────────────

type GHOrgDetail = {
  id: number
  login: string
  name?: string
  html_url: string
  blog?: string
  description?: string
  public_repos?: number
}

export async function scanCompanies(): Promise<ScanLog> {
  await requireAdmin()
  const log: ScanLog = {
    source: "companies", startedAt: new Date().toISOString(),
    found: 0, added: 0, skipped: 0, errors: [], stages: {}, notes: [],
  }

  // Find high-star Rust repos, group by owning org to discover companies
  const since = new Date(Date.now() - 180 * 86400000).toISOString().split("T")[0]
  const rawRepos: RepoInput[] = []
  const seenRepoIds = new Set<number>()

  try {
    for (const q of [
      `language:Rust+stars:>500+pushed:>${since}+fork:false`,
      `language:Rust+stars:>100+pushed:>${since}+fork:false`,
    ]) {
      const data = await ghFetch(
        `https://api.github.com/search/repositories?q=${q}&sort=stars&per_page=50`
      ) as { items?: RepoInput[] }
      for (const r of data.items ?? []) {
        if (!seenRepoIds.has(r.id)) { seenRepoIds.add(r.id); rawRepos.push(r) }
      }
    }
  } catch (e) {
    log.errors.push(`GitHub search: ${String(e)}`)
  }

  log.found = rawRepos.length
  log.stages!.reposFound = rawRepos.length

  // Group by org, only Organization owners (not personal repos)
  const orgToRepos = new Map<string, { repos: RepoInput[]; stars: number }>()
  for (const repo of rawRepos) {
    const owner = (repo as any).owner
    if (!owner || owner.type !== "Organization") continue
    const login = owner.login as string
    const entry = orgToRepos.get(login) ?? { repos: [], stars: 0 }
    entry.repos.push(repo)
    entry.stars += repo.stargazers_count
    orgToRepos.set(login, entry)
  }

  log.stages!.orgsFound = orgToRepos.size

  // Top 15 orgs by total Rust stars
  const topOrgs = Array.from(orgToRepos.entries())
    .sort((a, b) => b[1].stars - a[1].stars)
    .slice(0, 15)
    .map(([login, { repos, stars }]) => ({ login, repoCount: repos.length, stars }))

  log.notes!.push(`Top ${topOrgs.length} orgs selected out of ${orgToRepos.size}`)

  // Fetch org details in parallel
  const orgDetailResults = await Promise.allSettled(
    topOrgs.map(({ login }) =>
      ghFetch(`https://api.github.com/orgs/${login}`).then(d => d as GHOrgDetail)
    )
  )

  const existingIds = new Set((await readPending("companies")).map(i => i.id))
  const existingNames = new Set((await readContent("companies")).map(i => String(i.name ?? "").toLowerCase()))
  const pendingItems: PendingItem[] = []

  for (let i = 0; i < topOrgs.length; i++) {
    const { login, repoCount, stars } = topOrgs[i]
    const result = orgDetailResults[i]

    if (result.status === "rejected") {
      log.errors.push(`Org ${login}: ${String(result.reason)}`)
      continue
    }

    const org = result.value
    const id = `gh-org-${org.id}`
    const displayName = org.name ?? org.login

    if (existingIds.has(id) || existingNames.has(displayName.toLowerCase())) {
      log.skipped++; continue
    }

    const href = org.blog?.startsWith("http") ? org.blog : org.html_url
    const text = [
      `Org: ${displayName}`,
      org.description ? `About: ${org.description}` : "",
      org.blog ? `Website: ${org.blog}` : "",
      `GitHub: ${org.html_url}`,
      `${repoCount} Rust repos · ${stars} total stars`,
    ].filter(Boolean).join("\n")

    const aiResult = await extractWithDeepSeek("companies", text)
    const extracted = aiResult.ok && aiResult.data
      ? { ...aiResult.data, href: (aiResult.data.href as string)?.startsWith("http") ? aiResult.data.href : href }
      : { name: displayName, sector: "Open Source", href }

    pendingItems.push({
      id, type: "companies", status: "pending",
      source: "github-orgs", sourceUrl: org.html_url,
      foundAt: new Date().toISOString(),
      confidence: 0.65,
      whyMatched: `${repoCount} Rust repos · ${stars} total stars`,
      rawText: text,
      extracted,
    })
  }

  log.stages!.queued = pendingItems.length
  log.added = await addPendingItems("companies", pendingItems)
  log.finishedAt = new Date().toISOString()
  return log
}

// ── GitHub shared helpers ─────────────────────────────────────────────────────

// Expanded organization list covering the broad Rust ecosystem.
// Orgs with mixed-language repos are fine — the org scan already filters by language:Rust.
const RUST_BYTES_FEED = "https://weeklyrust.substack.com/feed"

// ── Rust Bytes newsletter scanner ─────────────────────────────────────────────

/** Fetch and parse the Rust Bytes RSS feed. Returns last `limit` issue item links. */
async function fetchRustBytesIssues(limit = 10): Promise<Array<{ link: string; html: string; guid: string }>> {
  try {
    const res = await fetch(RUST_BYTES_FEED, {
      signal: AbortSignal.timeout(20_000),
      headers: { "User-Agent": "osspath.com/scanner" },
      next: { revalidate: 0 },
    })
    if (!res.ok) throw new Error(`Feed HTTP ${res.status}`)
    const xml = await res.text()

    const items: Array<{ link: string; html: string; guid: string }> = []
    // Extract <item> blocks
    const itemRe = /<item>([\s\S]*?)<\/item>/g
    let im: RegExpExecArray | null
    while ((im = itemRe.exec(xml)) !== null && items.length < limit) {
      const block = im[1]
      const link  = (block.match(/<link>(.*?)<\/link>/) ?? [])[1] ?? ""
      const guid  = (block.match(/<guid[^>]*>(.*?)<\/guid>/) ?? [])[1] ?? link
      // content:encoded is wrapped in CDATA
      const cdataM = block.match(/<content:encoded>\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*<\/content:encoded>/)
      const html   = cdataM ? cdataM[1] : block
      if (link) items.push({ link, html, guid })
    }
    return items
  } catch {
    return []
  }
}

export async function scanRustBytes(): Promise<ScanLog> {
  await requireAdmin()
  const log: ScanLog = {
    source: "rust-bytes",
    startedAt: new Date().toISOString(),
    found: 0,
    added: 0,
    skipped: 0,
    errors: [],
    stages: {},
    notes: [],
  }

  // ── 1. Fetch feed ──────────────────────────────────────────────────────────
  const issues = await fetchRustBytesIssues(10)
  log.stages!.issues = issues.length
  if (issues.length === 0) {
    log.errors.push("Could not fetch Rust Bytes feed — check network or URL")
    log.finishedAt = new Date().toISOString()
    return log
  }
  log.notes!.push(`Parsed ${issues.length} issues from feed`)

  // ── 2. Build dedup sets ────────────────────────────────────────────────────
  const existingHrefs = new Set<string>()
  const existingIds   = new Set<string>()
  try {
    for (const item of (await readPending("oss"))) {
      existingIds.add(item.id)
      if (item.sourceUrl) existingHrefs.add(item.sourceUrl)
    }
    for (const item of (await readContent("oss"))) {
      const h = String(item.href ?? "")
      if (h) existingHrefs.add(h)
    }
  } catch { /* non-fatal */ }

  // ── 3. Extract unique GitHub repo URLs across all issues ──────────────────
  const repoUrls = new Set<string>()
  for (const issue of issues) {
    for (const url of extractGitHubRepoUrls(issue.html)) {
      repoUrls.add(url)
    }
  }
  log.stages!.repoUrlsExtracted = repoUrls.size
  log.found = repoUrls.size

  // ── 4. Fetch GitHub API and filter to Rust repos ──────────────────────────
  const toQueue: PendingItem[] = []
  let dupCount = 0
  let nonRustCount = 0
  let fetchErrors = 0

  for (const repoUrl of repoUrls) {
    // Skip already-known repos
    if (existingHrefs.has(repoUrl)) { dupCount++; continue }

    const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)$/)
    if (!match) continue
    const [, owner, repo] = match

    let ghData: any
    try {
      ghData = await ghFetch(`https://api.github.com/repos/${owner}/${repo}`)
      await sleep(400) // stay well under unauthenticated rate limit (60 req/hr)
    } catch {
      fetchErrors++
      continue
    }

    // Only queue Rust repos
    if (ghData.language !== "Rust") { nonRustCount++; continue }
    if (ghData.archived || ghData.disabled) { nonRustCount++; continue }
    if (ghData.size === 0) { nonRustCount++; continue }

    const id = `gh-${ghData.id}`
    if (existingIds.has(id)) { dupCount++; continue }

    const mapped = mapRepoResponse(ghData)
    const tier   = ossActivityTier(mapped.pushed_at)
    const stars  = mapped.stargazers_count

    toQueue.push({
      id,
      type:       "oss",
      status:     "pending",
      source:     "rust-bytes",
      sourceUrl:  repoUrl,
      foundAt:    new Date().toISOString(),
      confidence: 0.85,
      whyMatched: `rust-bytes · ${tier} · ★${stars}`,
      rawText:    `${ghData.full_name}: ${ghData.description ?? ""}`,
      extracted:  { ...buildOSSExtracted(mapped), labels: ["newsletter-pick"] },
    })
  }

  // ── 5. Queue ───────────────────────────────────────────────────────────────
  log.added = await addPendingItems("oss", toQueue)
  log.skipped = dupCount + nonRustCount + fetchErrors
  log.stages!.queued     = toQueue.length
  log.stages!.duplicates = dupCount
  log.stages!.nonRust    = nonRustCount
  if (fetchErrors > 0) log.errors.push(`${fetchErrors} GitHub API fetch errors`)
  log.notes!.push(`${repoUrls.size} GitHub URLs found → ${toQueue.length} Rust repos → ${log.added} new`)
  log.finishedAt = new Date().toISOString()
  return log
}

// ── Company Careers Scanner (Greenhouse + Lever public APIs) ──────────────────

async function tryGreenhouse(slug: string): Promise<any[]> {
  try {
    const res = await fetch(
      `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(slug)}/jobs`,
      { signal: AbortSignal.timeout(8_000), next: { revalidate: 0 } }
    )
    if (!res.ok) return []
    const data = await res.json() as { jobs?: any[] }
    return data.jobs ?? []
  } catch { return [] }
}

async function tryLever(slug: string): Promise<any[]> {
  try {
    const res = await fetch(
      `https://api.lever.co/v0/postings/${encodeURIComponent(slug)}?mode=json`,
      { signal: AbortSignal.timeout(8_000), next: { revalidate: 0 } }
    )
    if (!res.ok) return []
    return await res.json() as any[]
  } catch { return [] }
}

export async function scanCompanyCareers(): Promise<ScanLog> {
  await requireAdmin()
  const log: ScanLog = {
    source: "company-careers",
    startedAt: new Date().toISOString(),
    found: 0, added: 0, skipped: 0, errors: [], stages: {}, notes: [],
  }

  let companies: Array<{ slug: string; name: string; href: string }>
  try {
    companies = (await readContent("companies")) as typeof companies
  } catch (e) {
    log.errors.push(`Failed to read companies: ${String(e)}`)
    log.finishedAt = new Date().toISOString()
    return log
  }

  let tried = 0
  const pendingItems: PendingItem[] = []

  for (const co of companies) {
    const slug = String(co.slug ?? "")
    if (!slug) continue
    tried++

    const [ghJobs, levJobs] = await Promise.all([tryGreenhouse(slug), tryLever(slug)])
    const allJobs = [...ghJobs, ...levJobs]

    for (const job of allJobs) {
      const title = String(job.title ?? job.text ?? "")
      const desc = stripHtml(String(job.content ?? job.description ?? job.descriptionPlain ?? ""))
      const full = `${title} ${desc}`
      if (!/\brust\b/i.test(full)) continue
      const score = scoreJobText(full)
      if (!shouldQueue(score)) continue
      const href = String(job.absolute_url ?? job.hostedUrl ?? "")
      const ats = ghJobs.includes(job) ? "Greenhouse" : "Lever"
      pendingItems.push({
        id: `careers-${slug}-${String(job.id ?? Math.random().toString(36).slice(2))}`,
        type: "jobs",
        status: "pending",
        source: "company-careers",
        sourceUrl: href || co.href,
        foundAt: new Date().toISOString(),
        confidence: 0.85,
        score: score.total,
        whyMatched: `${co.name} via ${ats}: ${score.reasons.join(" · ")}`,
        rawText: `${title}\n${desc}`.slice(0, 800),
        extracted: {
          title,
          company: co.name,
          href,
          location: String(job.location?.name ?? job.categories?.location ?? ""),
          remote: /remote/i.test(full),
          type: "Full-time",
        },
      })
      log.found++
    }

    if (tried % 15 === 0) await sleep(500)
  }

  log.stages!.companiesTried = tried
  log.stages!.jobsFound = log.found
  log.added = await addPendingItems("jobs", pendingItems)
  log.skipped = log.found - pendingItems.length
  log.finishedAt = new Date().toISOString()
  return log
}

// ── Reddit r/rust Scanner ─────────────────────────────────────────────────────

// Legacy wrapper: delegates to the shared core and persists to admin_queue for
// the old scan panel. Kept only until the panel is removed in Stage 4.
export async function scanRedditRust(): Promise<ScanLog> {
  await requireAdmin()
  const { log, items } = await collectReddit({ isKnown: () => false })
  const jobs = items.filter(i => i.type === "jobs")
  const news = items.filter(i => i.type === "news")
  log.added = (await addPendingItems("jobs", jobs)) + (await addPendingItems("news", news))
  log.skipped = log.found - log.added
  return log
}

// ── Queue Verifier ────────────────────────────────────────────────────────────
// Fetches the live URL of every pending item for a given type, checks it is
// still alive and mentions Rust, and optionally re-extracts fields via AI.

export async function scanVerifyQueue(type: ContentType): Promise<ScanLog> {
  await requireAdmin()
  const log: ScanLog = {
    source: `verify-${type}`,
    startedAt: new Date().toISOString(),
    found: 0, added: 0, skipped: 0, errors: [], stages: {}, notes: [],
  }

  const pending = await readPending(type)
  log.found = pending.length

  if (pending.length === 0) {
    log.notes!.push(`No pending ${type} items to verify.`)
    log.finishedAt = new Date().toISOString()
    return log
  }

  const useAI = !!process.env.DEEPSEEK_API_KEY
  let confirmed = 0, dead = 0, enriched = 0, skipped = 0
  const deadItems: import("./types").DeadItem[] = []

  const BATCH = 8
  const updated = [...pending]

  for (let i = 0; i < pending.length; i += BATCH) {
    const batch = pending.slice(i, i + BATCH)
    const results = await Promise.all(
      batch.map(async (item) => {
        const url = String(item.extracted?.href ?? item.sourceUrl ?? "")
        if (!url.startsWith("http")) return { item, status: "skipped" as const }

        try {
          const res = await fetch(url, {
            method: "GET",
            signal: AbortSignal.timeout(9_000),
            headers: { "User-Agent": "osspath.com/verifier 1.0" },
            next: { revalidate: 0 },
          })

          if (!res.ok) {
            return {
              item: {
                ...item,
                extracted: {
                  ...item.extracted,
                  _verified: false,
                  _httpStatus: res.status,
                  _verifiedAt: new Date().toISOString(),
                },
              },
              status: "dead" as const,
            }
          }

          const rawHtml = await res.text()
          const pageText = stripHtml(rawHtml)
          const hasRust = /\brust\b/i.test(pageText.slice(0, 20_000))

          const patch: Record<string, unknown> = {
            _verified: hasRust,
            _httpStatus: res.status,
            _verifiedAt: new Date().toISOString(),
          }
          let aiEnriched = false

          if (useAI && hasRust) {
            const snippet = pageText.slice(0, 3_500)
            const result = await extractWithDeepSeek(type, snippet)
            if (result.ok && result.data) {
              // Only fill in fields that are currently blank
              for (const [k, v] of Object.entries(result.data)) {
                if (k.startsWith("_")) continue
                const cur = item.extracted[k]
                if ((!cur || cur === "" || cur === 0) && v) patch[k] = v
              }
              aiEnriched = true
            }
          }

          return {
            item: {
              ...item,
              confidence: hasRust
                ? Math.max(item.confidence ?? 0, 0.65)
                : (item.confidence ?? 0.5) * 0.4,
              extracted: { ...item.extracted, ...patch },
            },
            status: (hasRust ? "confirmed" : "dead") as "confirmed" | "dead",
            aiEnriched,
          }
        } catch {
          return { item, status: "skipped" as const }
        }
      })
    )

    for (let j = 0; j < results.length; j++) {
      const { item: updatedItem, status, aiEnriched } = results[j] as {
        item: typeof pending[0]; status: string; aiEnriched?: boolean
      }
      updated[i + j] = updatedItem
      if (status === "confirmed") confirmed++
      else if (status === "dead") {
        dead++
        const e = updatedItem.extracted as Record<string, unknown>
        deadItems.push({
          id: updatedItem.id,
          label: String(e.name ?? e.title ?? e.role ?? updatedItem.sourceUrl ?? updatedItem.id),
          href: String(e.href ?? updatedItem.sourceUrl ?? ""),
          httpStatus: e._httpStatus as number | undefined,
        })
      }
      else skipped++
      if (aiEnriched) enriched++
    }

    if (i + BATCH < pending.length) await sleep(300)
  }

  await writePending(type, updated)

  log.added = confirmed
  log.skipped = dead + skipped
  log.stages!.totalChecked = pending.length
  log.stages!.confirmed = confirmed
  log.stages!.deadOrMoved = dead
  log.stages!.unreachable = skipped
  if (useAI) log.stages!.enrichedWithAI = enriched
  if (dead > 0) {
    log.notes!.push(`${dead} dead links — use "Reject dead" button below to remove them.`)
    log.deadItems = deadItems
  }
  if (enriched > 0) log.notes!.push(`${enriched} items enriched with fresh AI extraction from live page.`)

  log.finishedAt = new Date().toISOString()
  return log
}

// ── Verify Published ──────────────────────────────────────────────────────────
// Checks live URLs of already-published items. Dead links and expired entries
// are returned in log.deadItems so the panel can remove them in one click.

export async function scanVerifyPublished(type: ContentType): Promise<ScanLog> {
  "use server"
  const log: ScanLog = {
    source: `verify-published-${type}`,
    startedAt: new Date().toISOString(),
    found: 0, added: 0, skipped: 0,
    errors: [], stages: {}, notes: [], deadItems: [],
  }

  const { readContent } = await import("./storage")
  const items = await readContent(type)
  log.found = items.length

  if (items.length === 0) {
    log.notes!.push(`No published ${type} items to verify.`)
    log.finishedAt = new Date().toISOString()
    return log
  }

  const today = new Date().toISOString().slice(0, 10)
  let dead = 0, expired = 0, ok = 0

  // ── 1. Date-expiry check (free, instant) ─────────────────────────────────
  if (type === "jobs" || type === "events") {
    for (const item of items) {
      const exp = String(item.expiresAt ?? "")
      if (exp && exp < today) {
        expired++
        log.deadItems!.push({
          id: String(item.href ?? ""),
          label: String(item.name ?? item.title ?? item.role ?? item.href ?? "?"),
          href: String(item.href ?? ""),
          httpStatus: undefined,
        })
      }
    }
    log.stages!.expired = expired
    if (expired > 0) log.notes!.push(`${expired} expired ${type} (past expiresAt date).`)
  }

  // ── 2. HTTP liveness check ────────────────────────────────────────────────
  const toCheck = items.filter(item => {
    const href = String(item.href ?? "")
    if (!href.startsWith("http")) return false
    // Skip items already flagged as expired above
    const exp = String(item.expiresAt ?? "")
    if ((type === "jobs" || type === "events") && exp && exp < today) return false
    return true
  })

  const BATCH = 8
  for (let i = 0; i < toCheck.length; i += BATCH) {
    const batch = toCheck.slice(i, i + BATCH)
    const results = await Promise.all(
      batch.map(async (item) => {
        const url = String(item.href ?? "")
        try {
          const res = await fetch(url, {
            method: "HEAD",
            signal: AbortSignal.timeout(8_000),
            headers: { "User-Agent": "osspath.com/verifier 1.0" },
            next: { revalidate: 0 },
          })
          // Follow up with GET if HEAD not allowed
          if (res.status === 405) {
            const res2 = await fetch(url, {
              method: "GET",
              signal: AbortSignal.timeout(8_000),
              headers: { "User-Agent": "osspath.com/verifier 1.0" },
              next: { revalidate: 0 },
            })
            return { item, ok: res2.ok, status: res2.status }
          }
          return { item, ok: res.ok, status: res.status }
        } catch {
          return { item, ok: false, status: 0 }
        }
      })
    )

    for (const { item, ok: isOk, status } of results) {
      if (isOk) {
        ok++
      } else {
        dead++
        log.deadItems!.push({
          id: String(item.href ?? ""),
          label: String(item.name ?? item.title ?? item.role ?? item.href ?? "?"),
          href: String(item.href ?? ""),
          httpStatus: status || undefined,
        })
      }
    }

    if (i + BATCH < toCheck.length) await sleep(300)
  }

  log.added = ok
  log.skipped = dead
  log.stages!.totalChecked = items.length
  log.stages!.liveChecked = toCheck.length
  log.stages!.ok = ok
  log.stages!.deadLinks = dead

  const totalBad = dead + expired
  if (totalBad > 0) {
    log.notes!.push(`${totalBad} items to remove — use "Remove all" button below.`)
  } else {
    log.notes!.push(`All checked items are live.`)
  }

  log.finishedAt = new Date().toISOString()
  return log
}
