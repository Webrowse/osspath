"use server"

import { addPendingItems, readPending, readContent, readRejected } from "./storage"
import { extractWithDeepSeek, classifyReposWithDeepSeek } from "./deepseek"
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

// ── GitHub OSS Scanner ────────────────────────────────────────────────────────

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

  const since = new Date(Date.now() - 90 * 86400000).toISOString().split("T")[0]

  // Dedup against already-known items
  const existingIds = new Set<string>()
  try {
    for (const item of readPending("oss")) existingIds.add(item.id)
    for (const item of readContent("oss")) {
      const href = String(item.href ?? "")
      if (href) existingIds.add(`gh-${href}`)
    }
  } catch { /* non-fatal */ }

  const rawRepos: RepoInput[] = []
  const seenIds = new Set<number>()

  // ── 1. Search queries: good-first-issues, help-wanted, star ranges ────────
  const searchQueries = [
    `language:Rust+good-first-issues:>5+pushed:>${since}`,
    `language:Rust+help-wanted-issues:>3+pushed:>${since}`,
    `language:Rust+stars:20..500+pushed:>${since}`,
    `language:Rust+stars:501..2000+pushed:>${since}`,
  ]

  for (const q of searchQueries) {
    try {
      const data = await ghFetch(
        `https://api.github.com/search/repositories?q=${q}&sort=updated&per_page=50`
      ) as { items?: RepoInput[] }
      const items = data?.items ?? []
      log.stages![`search_${q.slice(0, 30)}`] = items.length
      for (const r of items) {
        if (seenIds.has(r.id)) continue
        if ((r as any).archived || (r as any).disabled) continue
        if (r.stargazers_count < 10) continue
        seenIds.add(r.id)
        rawRepos.push(r)
      }
    } catch (e) {
      log.errors.push(`Search failed (${q.slice(0, 40)}): ${String(e)}`)
    }
  }

  // ── 2. Org scans (parallel) ───────────────────────────────────────────────
  const cutoff = new Date(Date.now() - 90 * 86400000)
  const orgResults = await Promise.allSettled(
    RUST_ORGS.map((org) =>
      ghFetch(`https://api.github.com/orgs/${org}/repos?type=public&sort=pushed&per_page=50`)
        .then((data) => ({ org, repos: data as RepoInput[] }))
    )
  )
  for (const result of orgResults) {
    if (result.status === "rejected") {
      log.errors.push(`Org scan failed: ${String(result.reason)}`)
      continue
    }
    const { org, repos } = result.value
    let orgAdded = 0
    for (const r of repos) {
      if (seenIds.has(r.id)) continue
      if ((r as any).language && (r as any).language !== "Rust") continue
      if (r.stargazers_count < 10) continue
      if (new Date(r.pushed_at) < cutoff) continue
      if ((r as any).archived || (r as any).disabled) continue
      seenIds.add(r.id)
      rawRepos.push(r)
      orgAdded++
    }
    log.stages![`org_${org}`] = orgAdded
  }

  // Cap before DeepSeek: top 60 by stars
  rawRepos.sort((a, b) => b.stargazers_count - a.stargazers_count)
  const toClassify = rawRepos.slice(0, 60)

  log.found = rawRepos.length
  log.notes!.push(`${rawRepos.length} unique repos collected, classifying top ${toClassify.length} with DeepSeek`)

  if (toClassify.length === 0) {
    log.finishedAt = new Date().toISOString()
    return log
  }

  // ── 3. DeepSeek batch classification ─────────────────────────────────────
  const BATCH = 15
  const pendingItems: PendingItem[] = []
  let dsSkipped = 0
  let dsErrors = 0

  for (let i = 0; i < toClassify.length; i += BATCH) {
    const batch = toClassify.slice(i, i + BATCH)
    const { results, error } = await classifyReposWithDeepSeek(batch)
    if (error) {
      log.errors.push(`DeepSeek batch ${i / BATCH + 1}: ${error}`)
      dsErrors += batch.length
    }

    for (let j = 0; j < batch.length; j++) {
      const repo = batch[j]
      const cls = results[j]
      const id = `gh-${repo.id}`

      if (existingIds.has(id)) { dsSkipped++; continue }
      if (!cls.queue) {
        dsSkipped++
        log.notes!.push(`Skipped ${repo.full_name}: ${cls.skipReason}`)
        continue
      }

      const whyParts: string[] = []
      if (cls.ecosystem.length > 0) whyParts.push(cls.ecosystem.join(" · "))
      whyParts.push(cls.activityTier)
      if (cls.beginnerFriendly) whyParts.push("beginner-friendly")
      whyParts.push(`${repo.stargazers_count} stars`)

      pendingItems.push({
        id,
        type: "oss",
        status: "pending",
        source: "github-oss",
        sourceUrl: repo.html_url,
        foundAt: new Date().toISOString(),
        confidence: cls.beginnerSuitability,
        whyMatched: whyParts.join(" · "),
        rawText: `${repo.full_name}: ${repo.description ?? ""}`,
        extracted: cls as unknown as Record<string, unknown>,
      })
    }
  }

  log.stages!.deepseekSkipped = dsSkipped
  log.stages!.deepseekErrors  = dsErrors
  log.stages!.queued          = pendingItems.length
  log.added   = addPendingItems("oss", pendingItems)
  log.skipped = toClassify.length - pendingItems.length

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
        headers: { "User-Agent": "jobs.adarshrust.com/scanner" },
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

const RUST_ORGS = [
  "tokio-rs", "hyperium", "embassy-rs", "rustwasm", "bytecodealliance",
  "tauri-apps", "bevyengine", "linebender", "rust-lang", "rust-cli",
  "diesel-rs", "smol-rs",
]

const GH_HEADERS = {
  Accept: "application/vnd.github.v3+json",
  "User-Agent": "jobs.adarshrust.com/scanner",
  ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
}

async function ghFetch(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: GH_HEADERS, signal: AbortSignal.timeout(20_000), next: { revalidate: 0 } })
  if (res.status === 403) throw new Error("GitHub rate-limited (403). Set GITHUB_TOKEN in .env.local.")
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${url}`)
  return res.json()
}

