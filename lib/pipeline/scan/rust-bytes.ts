import type { ScanResult, Candidate, ScanContext } from "@/lib/pipeline/types"
import type { ScanLog } from "@/lib/admin/types"
import { sleep } from "./shared"
import { ghFetch, mapRepoResponse, ossActivityTier, buildOSSExtracted, extractGitHubRepoUrls } from "./github"

/**
 * Rust Bytes newsletter scanner core — Category 1 (structured).
 *
 * The newsletter is parsed deterministically to extract GitHub repo URLs; each
 * new repo's metadata comes from the GitHub API and is built deterministically.
 * No DeepSeek. ctx.isKnown skips repos already published or blocklisted before
 * the GitHub fetch.
 */

const RUST_BYTES_FEED = "https://weeklyrust.substack.com/feed"

/** Fetch and parse the Rust Bytes RSS feed. Returns last `limit` issue items. */
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
    const itemRe = /<item>([\s\S]*?)<\/item>/g
    let im: RegExpExecArray | null
    while ((im = itemRe.exec(xml)) !== null && items.length < limit) {
      const block = im[1]
      const link = (block.match(/<link>(.*?)<\/link>/) ?? [])[1] ?? ""
      const guid = (block.match(/<guid[^>]*>(.*?)<\/guid>/) ?? [])[1] ?? link
      const cdataM = block.match(/<content:encoded>\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*<\/content:encoded>/)
      const html = cdataM ? cdataM[1] : block
      if (link) items.push({ link, html, guid })
    }
    return items
  } catch {
    return []
  }
}

export async function collectRustBytes(ctx: ScanContext): Promise<ScanResult> {
  const log: ScanLog = {
    source: "rust-bytes", startedAt: new Date().toISOString(),
    found: 0, added: 0, skipped: 0, errors: [], stages: {}, notes: [],
  }
  const items: Candidate[] = []

  const issues = await fetchRustBytesIssues(10)
  log.stages!.issues = issues.length
  if (issues.length === 0) {
    log.errors.push("Could not fetch Rust Bytes feed — check network or URL")
    log.finishedAt = new Date().toISOString()
    return { log, items }
  }

  const repoUrls = new Set<string>()
  for (const issue of issues) {
    for (const url of extractGitHubRepoUrls(issue.html)) repoUrls.add(url)
  }
  log.stages!.repoUrlsExtracted = repoUrls.size
  log.found = repoUrls.size

  let dupCount = 0
  let nonRustCount = 0
  let fetchErrors = 0

  for (const repoUrl of repoUrls) {
    if (ctx.isKnown(repoUrl)) { dupCount++; continue }
    const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)$/)
    if (!match) continue
    const [, owner, repo] = match

    let ghData: { id: number; language?: string | null; archived?: boolean; disabled?: boolean; size?: number; full_name?: string; description?: string | null }
    try {
      ghData = await ghFetch(`https://api.github.com/repos/${owner}/${repo}`) as typeof ghData
      await sleep(400)
    } catch {
      fetchErrors++
      continue
    }

    if (ghData.language !== "Rust") { nonRustCount++; continue }
    if (ghData.archived || ghData.disabled) { nonRustCount++; continue }
    if (ghData.size === 0) { nonRustCount++; continue }

    const mapped = mapRepoResponse(ghData)
    const tier = ossActivityTier(mapped.pushed_at)
    const stars = mapped.stargazers_count
    items.push({
      id: `gh-${ghData.id}`,
      type: "oss", status: "pending", source: "rust-bytes",
      sourceUrl: repoUrl, foundAt: new Date().toISOString(),
      confidence: 0.85, whyMatched: `rust-bytes · ${tier} · ★${stars}`,
      rawText: `${ghData.full_name}: ${ghData.description ?? ""}`,
      extracted: { ...buildOSSExtracted(mapped), labels: ["newsletter-pick"] },
    })
  }

  log.skipped = dupCount + nonRustCount + fetchErrors
  log.stages!.queued = items.length
  log.stages!.duplicates = dupCount
  log.stages!.nonRust = nonRustCount
  if (fetchErrors > 0) log.errors.push(`${fetchErrors} GitHub API fetch errors`)
  log.notes!.push(`${repoUrls.size} GitHub URLs → ${items.length} new Rust repos`)
  log.finishedAt = new Date().toISOString()
  return { log, items }
}
