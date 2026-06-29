"use server"

import { addPendingItems, readPending, readContent, readRejected } from "./storage"
import { extractWithDeepSeek, inferEcoFromRepo, deriveTopicsFromRepo } from "./deepseek"
import type { RepoInput } from "./deepseek"
import {
  classifyRustSignal,
  scoreJobText,
  shouldQueue,
  QUEUE_THRESHOLD,
} from "./prefilter"
import type { PendingItem, ScanLog } from "./types"
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
      for (const item of readPending("jobs")) processedIds.add(item.id)
      for (const item of readRejected("jobs")) processedIds.add(item.id)
    } catch { /* non-fatal */ }

    // Also dedup by href against published content
    const publishedHrefs = new Set<string>()
    try {
      for (const item of readContent("jobs")) {
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
    log.added   = addPendingItems("jobs", pendingItems)
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

export async function scanTWIR(useAI = false): Promise<ScanLog> {
  await requireAdmin()
  const shouldUseAI = useAI || !!process.env.DEEPSEEK_API_KEY
  const log: ScanLog = {
    source: "twir",
    startedAt: new Date().toISOString(),
    found: 0,
    added: 0,
    skipped: 0,
    errors: [],
    stages: {},
    notes: [],
  }

  try {
    const rssRes = await fetch("https://this-week-in-rust.org/rss.xml", {
      signal: AbortSignal.timeout(15_000),
      next: { revalidate: 0 },
    })
    const rssText = await rssRes.text()
    const linkMatch = rssText.match(
      /<link>(https:\/\/this-week-in-rust\.org\/blog\/[^<]+)<\/link>/
    )
    if (!linkMatch) {
      log.errors.push("Could not parse TWIR RSS feed")
      log.finishedAt = new Date().toISOString()
      return log
    }

    const issueUrl = linkMatch[1]
    log.notes!.push(`Latest issue: ${issueUrl}`)
    const htmlRes = await fetch(issueUrl, { signal: AbortSignal.timeout(15_000), next: { revalidate: 0 } })
    const html = await htmlRes.text()

    // Extract the Jobs section by its h2 id="jobs" anchor
    const jobsMatch = html.match(
      /<h2[^>]*id="jobs"[^>]*>.*?<\/h2>([\s\S]*?)<h[12]/i
    )
    const jobsSection = jobsMatch ? jobsMatch[1] : ""

    if (!jobsSection || jobsSection.length < 50) {
      log.errors.push("Jobs section not found in TWIR issue")
      log.finishedAt = new Date().toISOString()
      return log
    }

    // Extract <li> items first (TWIR's preferred format for jobs)
    const liMatches = Array.from(
      jobsSection.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)
    )
    let entries = liMatches
      .map((m) => stripHtml(m[1]))
      .filter((s) => s.trim().length > 30)

    // Detect TWIR's "no jobs, see r/rust" redirect pattern
    if (entries.length === 0) {
      const pText = stripHtml(jobsSection).toLowerCase()
      if (pText.includes("who's hiring thread") || pText.includes("r/rust")) {
        log.notes!.push(
          "TWIR has stopped publishing jobs — it now redirects to r/rust Who's Hiring."
        )
        log.notes!.push(
          "Recommendation: use the HN Hiring scanner, or check r/rust manually."
        )
        log.finishedAt = new Date().toISOString()
        return log
      }
      // Fallback: regex scan for "$Company is hiring..." pattern
      const fallbackEntries = stripHtml(jobsSection)
        .split(/(?<=\.)\s+(?=[A-Z])/g)
        .filter((s) => /hiring|rust|engineer|developer|apply/i.test(s) && s.length > 50)
      entries = fallbackEntries
      log.notes!.push("Used fallback regex parser")
    }

    log.found = entries.length
    log.stages!.entriesExtracted = entries.length

    let rustFiltered = 0
    let scoreFiltered = 0
    const pendingItems: PendingItem[] = []

    for (const text of entries.slice(0, 30)) {
      const signal = classifyRustSignal(text)
      if (signal !== "strong") {
        rustFiltered++
        continue
      }

      const score = scoreJobText(text)
      if (!shouldQueue(score)) {
        scoreFiltered++
        continue
      }

      let extracted: Record<string, unknown>
      if (shouldUseAI) {
        const result = await extractWithDeepSeek("jobs", text)
        if (result.ok && result.data) extracted = result.data
        else extracted = extractMinimalJob(text)
      } else {
        extracted = extractMinimalJob(text)
      }

      pendingItems.push({
        id: `twir-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
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

    log.stages!.rustFiltered  = rustFiltered
    log.stages!.scoreFiltered = scoreFiltered
    log.stages!.queued        = pendingItems.length
    log.added = addPendingItems("jobs", pendingItems)
    log.skipped = log.found - pendingItems.length
  } catch (e) {
    log.errors.push(`TWIR scan failed: ${String(e)}`)
  }

  log.finishedAt = new Date().toISOString()
  return log
}

// ── GitHub OSS Scanner (metadata-first, no AI required) ──────────────────────

// Deterministic quality filter — no AI needed.
// Returns { junk: true, reason } for repos that should not enter the corpus.
function ossJunkFilter(r: RepoInput & { archived?: boolean; disabled?: boolean }): { junk: boolean; reason: string } {
  if (r.archived || r.disabled) return { junk: true, reason: "archived or disabled" }
  if ((r.stargazers_count ?? 0) < 20) return { junk: true, reason: "under 20 stars" }

  const nameLc = r.name.toLowerCase()
  const descLc = (r.description ?? "").toLowerCase()

  // Awesome lists and curated link collections
  if (nameLc.startsWith("awesome-") || nameLc.startsWith("awesome_") || nameLc === "awesome") {
    return { junk: true, reason: "awesome-list" }
  }
  if (/^(list-of|curated|resources|links)-/.test(nameLc)) {
    return { junk: true, reason: "resource list" }
  }
  if (descLc.includes("curated list") || descLc.includes("a list of") ||
      descLc.includes("collection of resources") || descLc.includes("a collection of awesome")) {
    return { junk: true, reason: "curated list (description)" }
  }

  // Learning / tutorial / course repos
  if (/-(tutorial|tutorials|guide|guides|course|courses|workshop|workshops|book|exercises|kata)s?$/.test(nameLc)) {
    return { junk: true, reason: "learning resource" }
  }
  if (/^(learn|learning|tutorial|guide|course|workshop|book|study)-/.test(nameLc)) {
    return { junk: true, reason: "learning resource" }
  }

  // Documentation repos
  if (nameLc === "docs" || nameLc === "documentation" || nameLc.endsWith("-docs") || nameLc.endsWith(".github.io")) {
    return { junk: true, reason: "documentation repo" }
  }

  // Mirror / fork repos
  if (descLc.startsWith("mirror of") || descLc.startsWith("[mirror]") || descLc.includes("auto-mirror")) {
    return { junk: true, reason: "mirror repository" }
  }
  if (nameLc.endsWith("-mirror") || nameLc.startsWith("mirror-")) {
    return { junk: true, reason: "mirror repository" }
  }

  // Empty repos (no code at all)
  if (r.size === 0) return { junk: true, reason: "empty repository" }

  // Non-English repos — CJK/non-Latin scripts in name or description.
  // u flag is required: without it, emoji surrogate pairs (U+D83C etc.) falsely match BMP ranges.
  // Parenthesized name translations like "Hayabusa (隼)" are stripped before testing.
  const NON_ENGLISH = /[぀-ヿ㐀-䶿一-鿿가-퟿豈-﫿Ѐ-ӿ؀-ۿ֐-׿ऀ-ॿ฀-๿]/u
  const stripParens = (s: string) => s.replace(/\s*\([^)]*\)/g, "")
  if (NON_ENGLISH.test(stripParens(r.name)) || NON_ENGLISH.test(stripParens(r.description ?? ""))) {
    return { junk: true, reason: "non-English script" }
  }

  return { junk: false, reason: "" }
}

// Derive activityTier deterministically from pushed_at timestamp
function ossActivityTier(pushedAt: string): "active" | "maintenance" | "dormant" {
  if (!pushedAt) return "dormant"
  const days = (Date.now() - new Date(pushedAt).getTime()) / 86_400_000
  if (days <= 30) return "active"
  if (days <= 90) return "maintenance"
  return "dormant"
}

// Build the complete extracted object from raw GitHub API data — no AI required.
function buildOSSExtracted(repo: RepoInput): Record<string, unknown> {
  const tier = ossActivityTier(repo.pushed_at)
  const eco  = inferEcoFromRepo(repo.topics, repo.name, repo.description ?? "")
  return {
    // Display fields
    name:  repo.name,
    eco,
    href:  repo.html_url,
    note:  repo.description ?? "",
    topics: deriveTopicsFromRepo(repo),
    // GitHub objective metadata
    stars:                 repo.stargazers_count,
    forks:                 repo.forks_count,
    openIssuesCount:       repo.open_issues_count,
    goodFirstIssuesCount:  repo.good_first_issues_count ?? 0,
    helpWantedIssuesCount: repo.help_wanted_issues_count ?? 0,
    language:              repo.language ?? null,
    owner:                 repo.owner_login ?? "",
    license:               repo.license_spdx_id ?? null,
    pushedAt:              repo.pushed_at,
    activityTier:          tier,
    // AI-score fields kept at neutral defaults for schema compatibility.
    // These are no longer used in the OSS browser (Phase 1 removed them).
    maintainerFriendliness: 0.5,
    issueQuality:           0.5,
    beginnerSuitability:    0.5,
    maintainerLabel:        "",
    issueLabel:             `${repo.open_issues_count} open issues`,
    beginnerLabel:          "",
    ecosystem:              [],
    beginnerFriendly:       (repo.good_first_issues_count ?? 0) > 0,
    queue:                  true,
    skipReason:             "",
  }
}

// Paginated GitHub search — fetches up to `pages` pages at 100 results each.
// Inserts a polite delay between pages to respect the 30 req/min search limit.
async function ossSearchPage(query: string, page: number): Promise<any[]> {
  try {
    const data = await ghFetch(
      `https://api.github.com/search/repositories?q=${query}&sort=updated&per_page=100&page=${page}`
    ) as { items?: any[] }
    return data?.items ?? []
  } catch {
    return []
  }
}

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
    for (const item of readPending("oss")) {
      existingIds.add(item.id)
      if (item.sourceUrl) existingHrefs.add(item.sourceUrl)
    }
    for (const item of readContent("oss")) {
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
  log.added   = addPendingItems("oss", toQueue)
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

function decodeHTML(text: string): string {
  return text
    .replace(/&amp;/g,  "&")
    .replace(/&lt;/g,   "<")
    .replace(/&gt;/g,   ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&nbsp;/g, " ")
    .replace(/<p>/g,    "\n")
    .replace(/<br\s*\/?>/g, "\n")
}

function stripHtml(text: string): string {
  return text
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim()
}

function extractMinimalJob(text: string): Record<string, unknown> {
  const lower = text.toLowerCase()
  return {
    note: text.slice(0, 200).trim(),
    rustMentioned: lower.includes("rust"),
    remoteConfirmed: /\bremote\b/i.test(text),
    tags: [
      ...(/\bremote\b/i.test(text) ? ["Remote"] : []),
      ...(lower.includes("eu") || lower.includes("europe") ? ["EU"] : []),
      ...(/\bus\b|\bunited states\b/i.test(text) ? ["US"] : []),
      ...(/\bjunior\b/i.test(text) ? ["Junior-friendly"] : []),
    ].slice(0, 3),
    topics: [
      ...(lower.includes("embedded") ? ["embedded"] : []),
      ...(lower.includes("wasm") || lower.includes("webassembly") ? ["wasm"] : []),
      ...(lower.includes("backend") ? ["backend"] : []),
      ...(lower.includes("infra") ? ["infra"] : []),
      ...(lower.includes("crypto") || lower.includes("blockchain") ? ["blockchain"] : []),
    ].slice(0, 3),
  }
}

function estimateConfidence(extracted: Record<string, unknown>): number {
  let score = 0.3
  if (extracted.company) score += 0.15
  if (extracted.role) score += 0.15
  if (extracted.href) score += 0.2
  if (extracted.rustMentioned) score += 0.1
  if (extracted.remoteConfirmed) score += 0.1
  return Math.min(score, 1)
}

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

// Rejects placeholder/hallucinated URLs DeepSeek sometimes invents
function isRealGrantUrl(href: unknown, fallback: string): boolean {
  if (!href || typeof href !== "string") return false
  if (!href.startsWith("http")) return false
  if (href.includes("example.com")) return false
  if (href.includes("ycombinator.com")) return false
  if (href === fallback) return false
  return true
}

// Known Rust grant programs — seeded directly, no scraping needed
const KNOWN_GRANTS = [
  {
    id: "grant-rustfound-community",
    name: "Rust Foundation Community Grants",
    kind: "Grant",
    description: "Funded work on Rust libraries, tools, and education. Open to individuals and teams worldwide.",
    status: "Open",
    href: "https://foundation.rust-lang.org/grants/",
  },
  {
    id: "grant-rustfound-fellowships",
    name: "Rust Foundation Fellowships",
    kind: "Grant",
    description: "Paid fellowships for contributors who want to work full-time on the Rust compiler, toolchain, or ecosystem.",
    status: "Open",
    href: "https://foundation.rust-lang.org/grants/fellowships/",
  },
]

export async function scanGrants(): Promise<ScanLog> {
  await requireAdmin()
  const log: ScanLog = {
    source: "grants", startedAt: new Date().toISOString(),
    found: 0, added: 0, skipped: 0, errors: [], stages: {}, notes: [],
  }

  const existingIds = new Set(readPending("grants").map(i => i.id))
  const existingHrefs = new Set(readContent("grants").map(i => String(i.href ?? "")))
  const pendingItems: PendingItem[] = []

  // ── 1. Seeded known programs ──────────────────────────────────────────────
  for (const grant of KNOWN_GRANTS) {
    if (existingIds.has(grant.id) || existingHrefs.has(grant.href)) { log.skipped++; continue }
    pendingItems.push({
      id: grant.id, type: "grants", status: "pending",
      source: "grant-seed", sourceUrl: grant.href,
      foundAt: new Date().toISOString(),
      confidence: 0.9, whyMatched: "Known Rust Foundation grant program",
      rawText: `${grant.name}: ${grant.description}`,
      extracted: grant,
    })
  }
  log.stages!.seeded = pendingItems.length

  // ── 2. Scrape foundation.rust-lang.org for grant/bounty/fellowship articles ─
  const articleLinks: { title: string; href: string }[] = []
  for (const pageUrl of ["https://foundation.rust-lang.org/grants/", "https://foundation.rust-lang.org/news/"]) {
    try {
      const res = await fetch(pageUrl, {
        signal: AbortSignal.timeout(15_000),
        headers: { "User-Agent": "osspath.com/scanner" },
        next: { revalidate: 0 },
      })
      const html = await res.text()
      const linkRe = /<a\s[^>]*href="([^"]+)"[^>]*>([^<]{10,120})<\/a>/gi
      let m: RegExpExecArray | null
      while ((m = linkRe.exec(html)) !== null) {
        const [, href, rawTitle] = m
        const title = rawTitle.trim().replace(/\s+/g, " ")
        const lower = (href + title).toLowerCase()
        if (!lower.includes("grant") && !lower.includes("bounty") && !lower.includes("fellow")) continue
        const full = href.startsWith("http") ? href : `https://foundation.rust-lang.org${href}`
        if (!articleLinks.find(l => l.href === full)) articleLinks.push({ title, href: full })
      }
    } catch (e) {
      log.errors.push(`Scrape ${pageUrl}: ${String(e)}`)
    }
  }

  log.found = KNOWN_GRANTS.length + articleLinks.length
  log.stages!.articlesFound = articleLinks.length
  log.notes!.push(`${articleLinks.length} grant-related articles found on foundation.rust-lang.org`)

  // ── 3. DeepSeek-extract each article (with skip guard) ───────────────────
  for (const article of articleLinks.slice(0, 10)) {
    const id = `foundation-${Buffer.from(article.href).toString("base64").slice(0, 16)}`
    if (existingIds.has(id) || existingHrefs.has(article.href)) { log.skipped++; continue }

    const text = `${article.title}\nURL: ${article.href}`
    const result = await extractWithDeepSeek("grants", text)

    // DeepSeek returns {skip:true} when content isn't actually a grant
    if (!result.ok || !result.data || (result.data as any).skip === true) { log.skipped++; continue }

    const rawHref = String(result.data.href ?? "")
    const resolvedHref = isRealGrantUrl(rawHref, article.href) ? rawHref : article.href

    pendingItems.push({
      id, type: "grants", status: "pending",
      source: "foundation-news", sourceUrl: article.href,
      foundAt: new Date().toISOString(),
      confidence: 0.75, whyMatched: article.title,
      rawText: text,
      extracted: { ...result.data, href: resolvedHref },
    })
  }

  log.stages!.queued = pendingItems.length
  log.added = addPendingItems("grants", pendingItems)
  log.finishedAt = new Date().toISOString()
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
  const existingIds = new Set(readPending("pulse").map(i => i.id))
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
  log.added = addPendingItems("pulse", pendingItems)
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
  const existingIds = new Set(readPending("events").map(i => i.id))
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
  log.added = addPendingItems("events", pendingItems)
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

  const existingIds = new Set(readPending("portals").map(i => i.id))
  const existingHrefs = new Set(readContent("portals").map(i => String(i.href ?? "")))
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
  log.added = addPendingItems("portals", pendingItems)
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

  const existingIds = new Set(readPending("companies").map(i => i.id))
  const existingNames = new Set(readContent("companies").map(i => String(i.name ?? "").toLowerCase()))
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
  log.added = addPendingItems("companies", pendingItems)
  log.finishedAt = new Date().toISOString()
  return log
}

// ── GitHub shared helpers ─────────────────────────────────────────────────────

function sleep(ms: number) { return new Promise<void>(r => setTimeout(r, ms)) }

// Expanded organization list covering the broad Rust ecosystem.
// Orgs with mixed-language repos are fine — the org scan already filters by language:Rust.
const RUST_ORGS = [
  // Core language and toolchain
  "rust-lang", "rust-cli",
  // Async / networking
  "tokio-rs", "hyperium", "smol-rs", "quinn-rs", "libp2p",
  // Embedded / systems
  "embassy-rs", "oxidecomputer", "redox-os",
  // WebAssembly
  "rustwasm", "bytecodealliance", "fermyon", "wasmerio",
  // Application frameworks / UI
  "tauri-apps", "slint-ui", "bevyengine", "linebender",
  // ORM / serialization / core libs
  "diesel-rs", "serde-rs", "rayon-rs",
  // FFI / interop
  "PyO3",
  // Data / ML
  "pola-rs", "tracel-ai", "lance-format",
  // Search / databases / storage
  "meilisearch", "qdrant", "paradedb", "databend-labs",
  "risingwavelabs", "quickwit-oss", "GreptimeTeam", "pgcentralfoundation",
  // Observability / DevTools
  "vectordotdev", "rerun-io", "gitbutlerapp",
  // Shell / terminal
  "nushell", "zellij-org",
  // Package / environment management
  "astral-sh", "prefix-dev",
  // VCS tooling
  "jj-vcs",
  // Runtimes / languages
  "denoland", "firecracker-microvm",
  // Big-tech Rust projects (filtered by language=Rust in scan)
  "awslabs", "cloudflare", "microsoft", "google", "mozilla",
  // Database / distributed systems
  "tikv", "pingcap", "apache",
  // Infrastructure
  "cachix",
]

const GH_HEADERS = {
  Accept: "application/vnd.github.v3+json",
  "User-Agent": "osspath.com/scanner",
  ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
}

const RUST_BYTES_FEED = "https://weeklyrust.substack.com/feed"

async function ghFetch(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: GH_HEADERS, signal: AbortSignal.timeout(20_000), next: { revalidate: 0 } })
  if (res.status === 403) throw new Error("GitHub rate-limited (403). Set GITHUB_TOKEN in .env.local.")
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${url}`)
  return res.json()
}

// ── Rust Bytes newsletter scanner ─────────────────────────────────────────────

/** Extract unique github.com/{owner}/{repo} URLs from raw HTML, normalised to base URL. */
function extractGitHubRepoUrls(html: string): string[] {
  const seen = new Set<string>()
  const re = /https?:\/\/github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    const [, owner, repo] = m
    // skip .github org config repos, and common non-code paths
    if (repo === ".github" || owner === "topics" || owner === "trending") continue
    seen.add(`https://github.com/${owner}/${repo}`)
  }
  return [...seen]
}

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
    for (const item of readPending("oss")) {
      existingIds.add(item.id)
      if (item.sourceUrl) existingHrefs.add(item.sourceUrl)
    }
    for (const item of readContent("oss")) {
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
  log.added   = addPendingItems("oss", toQueue)
  log.skipped = dupCount + nonRustCount + fetchErrors
  log.stages!.queued     = toQueue.length
  log.stages!.duplicates = dupCount
  log.stages!.nonRust    = nonRustCount
  if (fetchErrors > 0) log.errors.push(`${fetchErrors} GitHub API fetch errors`)
  log.notes!.push(`${repoUrls.size} GitHub URLs found → ${toQueue.length} Rust repos → ${log.added} new`)
  log.finishedAt = new Date().toISOString()
  return log
}

function mapRepoResponse(r: any): RepoInput {
  return {
    id:                       r.id,
    name:                     r.name,
    full_name:                r.full_name,
    description:              r.description ?? null,
    topics:                   r.topics ?? [],
    stargazers_count:         r.stargazers_count ?? 0,
    pushed_at:                r.pushed_at ?? "",
    size:                     r.size ?? 0,
    open_issues_count:        r.open_issues_count ?? 0,
    good_first_issues_count:  r.good_first_issues_count,
    help_wanted_issues_count: r.help_wanted_issues_count,
    forks_count:              r.forks_count ?? 0,
    html_url:                 r.html_url ?? "",
    language:                 r.language ?? null,
    owner_login:              r.owner?.login ?? "",
    license_spdx_id:          r.license?.spdx_id ?? null,
  }
}

