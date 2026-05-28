"use server"

import { addPendingItems } from "./storage"
import { extractWithDeepSeek } from "./deepseek"
import {
  classifyRustSignal,
  scoreJobText,
  shouldQueue,
  QUEUE_THRESHOLD,
} from "./prefilter"
import type { PendingItem, ScanLog } from "./types"

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
      { next: { revalidate: 0 } }
    )
    const data = await res.json()
    const hit = data?.hits?.[0]
    return hit ? parseInt(hit.objectID) : null
  } catch {
    return null
  }
}

export async function scanHNHiring(useAI = false): Promise<ScanLog> {
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
      { next: { revalidate: 0 } }
    )
    const data = await res.json()
    const hits: HNSearchHit[] = data?.hits ?? []
    log.found = hits.length
    log.stages!.fetched = hits.length

    let rustFiltered = 0
    let scoreFiltered = 0
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
      const sourceUrl = `https://news.ycombinator.com/item?id=${hit.objectID}`

      let extracted: Record<string, unknown>
      if (useAI && process.env.DEEPSEEK_API_KEY) {
        const result = await extractWithDeepSeek("jobs", text)
        if (result.ok && result.data) {
          extracted = result.data
        } else {
          log.notes!.push(`AI extract failed for ${id}: ${result.error?.slice(0, 80)}`)
          extracted = extractMinimalJob(text)
        }
      } else {
        extracted = extractMinimalJob(text)
      }

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
    const htmlRes = await fetch(issueUrl, { next: { revalidate: 0 } })
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
      if (useAI && process.env.DEEPSEEK_API_KEY) {
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

  // Time window: repos pushed in the last 90 days
  const since = new Date(Date.now() - 90 * 86400000).toISOString().split("T")[0]

  // Use the `good-first-issues:>5` qualifier (NOT `label:`, which doesn't work
  // for repository search). This is GitHub's standardised metric for repos that
  // actively curate beginner issues.
  const queries = [
    `language:Rust+good-first-issues:>5+pushed:>${since}`,
    // Fallback: any actively pushed Rust repo with help-wanted-issues
    `language:Rust+help-wanted-issues:>3+pushed:>${since}`,
  ]

  try {
    const seen = new Set<number>()
    const pendingItems: PendingItem[] = []
    let totalFetched = 0
    let lowQualityFiltered = 0

    for (let qi = 0; qi < queries.length && pendingItems.length < 15; qi++) {
      const q = queries[qi]
      log.notes!.push(`Query ${qi + 1}: ${decodeURIComponent(q)}`)

      const res = await fetch(
        `https://api.github.com/search/repositories?q=${q}&sort=updated&per_page=25`,
        {
          headers: { Accept: "application/vnd.github.v3+json" },
          next: { revalidate: 0 },
        }
      )

      if (!res.ok) {
        const body = await res.text().catch(() => "")
        if (res.status === 403) {
          log.errors.push(
            `GitHub rate-limited (403). Set GITHUB_TOKEN in .env.local for higher limits.`
          )
        } else {
          log.errors.push(`GitHub API ${res.status}: ${body.slice(0, 200)}`)
        }
        continue
      }

      const data = await res.json()
      const repos = data?.items ?? []
      totalFetched += repos.length
      log.stages![`query${qi + 1}Returned`] = repos.length

      for (const repo of repos) {
        if (seen.has(repo.id)) continue
        seen.add(repo.id)

        // Quality filter: skip repos that look low-quality or stale
        if (repo.archived || repo.disabled) { lowQualityFiltered++; continue }
        if (!repo.has_issues) { lowQualityFiltered++; continue }
        if (repo.stargazers_count < 50) { lowQualityFiltered++; continue }
        if (repo.open_issues_count > 2000) { lowQualityFiltered++; continue } // overwhelming backlog

        const goodFirst = repo.good_first_issues_count ?? 0
        const helpWanted = repo.help_wanted_issues_count ?? 0

        const why: string[] = []
        if (goodFirst > 0) why.push(`${goodFirst} good-first-issues`)
        if (helpWanted > 0) why.push(`${helpWanted} help-wanted issues`)
        why.push(`${repo.stargazers_count} stars`)
        if (repo.has_wiki) why.push("docs/wiki")

        pendingItems.push({
          id: `gh-${repo.id}`,
          type: "oss",
          status: "pending",
          source: "github-oss",
          sourceUrl: repo.html_url,
          foundAt: new Date().toISOString(),
          confidence: 0.6,
          whyMatched: why.join(" · "),
          rawText: `${repo.full_name}: ${repo.description ?? ""}`,
          extracted: {
            name: repo.name,
            eco: inferEco(repo.topics ?? [], repo.description ?? ""),
            href: repo.html_url,
            note: (repo.description ?? "").slice(0, 180),
            topics: (repo.topics ?? []).slice(0, 4),
            maintainerFriendliness: Math.min(0.5 + helpWanted / 100, 0.95),
            issueQuality: Math.min(0.5 + goodFirst / 50, 0.95),
            beginnerSuitability: Math.min(0.4 + goodFirst / 30, 0.95),
            maintainerLabel: helpWanted > 0 ? `${helpWanted} help-wanted` : "Active maintainer",
            issueLabel: goodFirst > 0 ? `${goodFirst} good-first-issues` : "Issues labelled",
            beginnerLabel: goodFirst >= 10 ? "Many beginner issues" : "Some beginner issues",
          },
        })
      }
    }

    log.found = totalFetched
    log.stages!.lowQualityFiltered = lowQualityFiltered
    log.stages!.queued = pendingItems.length
    log.added = addPendingItems("oss", pendingItems)
    log.skipped = totalFetched - pendingItems.length

    if (pendingItems.length === 0 && totalFetched === 0 && log.errors.length === 0) {
      log.notes!.push("No repos returned by either query. Try widening the time window.")
    }
  } catch (e) {
    log.errors.push(`GitHub scan failed: ${String(e)}`)
  }

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

function inferEco(topics: string[], description: string): string {
  const lc = (topics.join(" ") + " " + description).toLowerCase()
  if (lc.includes("tui") || lc.includes("terminal")) return "UI · TUI"
  if (lc.includes("cli") || lc.includes("command")) return "CLI · Tooling"
  if (lc.includes("embedded") || lc.includes("no_std")) return "Embedded · no_std"
  if (lc.includes("parser") || lc.includes("parsing")) return "Parsing · Libraries"
  if (lc.includes("async") || lc.includes("tokio")) return "Async · Runtime"
  if (lc.includes("wasm") || lc.includes("webassembly")) return "WASM · Runtime"
  if (lc.includes("crypto") || lc.includes("security")) return "Security · Crypto"
  if (lc.includes("game") || lc.includes("bevy")) return "Game · Engine"
  return "Libraries · General"
}
