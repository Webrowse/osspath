import type { RepoInput } from "@/lib/admin/deepseek"
import type { ScanResult, Candidate, ScanContext } from "@/lib/pipeline/types"
import type { ScanLog } from "@/lib/admin/types"
import { sleep } from "./shared"
import {
  ghFetch, ossSearchPage, ossJunkFilter, ossActivityTier,
  buildOSSExtracted, mapRepoResponse, RUST_ORGS,
} from "./github"

/**
 * GitHub OSS scanner core — Category 1 (structured).
 *
 * GitHub metadata is fully structured, so candidates are built deterministically
 * (junk filter, activity tier, eco from topics). No DeepSeek. ctx.isKnown skips
 * repos already published or blocklisted before building a candidate.
 */
export async function collectGitHubOSS(ctx: ScanContext): Promise<ScanResult> {
  const log: ScanLog = {
    source: "github-oss", startedAt: new Date().toISOString(),
    found: 0, added: 0, skipped: 0, errors: [], stages: {}, notes: [],
  }
  const items: Candidate[] = []

  const since365 = new Date(Date.now() - 365 * 86_400_000).toISOString().split("T")[0]

  const rawRepos: RepoInput[] = []
  const seenIds = new Set<number>()
  function ingest(r: { id: number; archived?: boolean; disabled?: boolean; language?: string | null }) {
    if (seenIds.has(r.id)) return
    if (r.archived || r.disabled) return
    seenIds.add(r.id)
    rawRepos.push(mapRepoResponse(r))
  }

  // ── 1. GitHub Search (star ranges + topic + issue signals) ─────────────────
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
      const results = await ossSearchPage(q, page)
      for (const r of results) ingest(r)
      queryCount += results.length
      if (results.length < 100) break
      if (page < 2) await sleep(2000)
    }
    log.stages![`search_${label}`] = queryCount
    searchTotal += queryCount
  }
  log.notes!.push(`Search API: ${searchTotal} results across ${SEARCH_QUERIES.length} queries`)

  // ── 2. Org scans (parallel batches) ────────────────────────────────────────
  const ORG_BATCH_SIZE = 10
  let orgTotal = 0
  for (let i = 0; i < RUST_ORGS.length; i += ORG_BATCH_SIZE) {
    const batch = RUST_ORGS.slice(i, i + ORG_BATCH_SIZE)
    const results = await Promise.allSettled(
      batch.map((org) =>
        ghFetch(`https://api.github.com/orgs/${org}/repos?type=public&sort=pushed&per_page=100`)
          .then((data) => ({ org, repos: (data as { id: number; language?: string | null }[]) ?? [] })),
      ),
    )
    for (const result of results) {
      if (result.status === "rejected") {
        log.errors.push(`Org scan: ${String(result.reason).slice(0, 80)}`)
        continue
      }
      for (const r of result.value.repos) {
        if (r.language && r.language !== "Rust") continue
        ingest(r)
        orgTotal++
      }
    }
  }
  log.notes!.push(`Org scans: ${orgTotal} Rust repos across ${RUST_ORGS.length} orgs`)
  log.found = rawRepos.length

  // ── 3. Deterministic quality filter — no AI ────────────────────────────────
  const rejectionReasons: Record<string, number> = {}
  let dupCount = 0
  let junkCount = 0

  for (const repo of rawRepos) {
    if (ctx.isKnown(repo.html_url)) { dupCount++; continue }

    const { junk, reason } = ossJunkFilter(repo)
    if (junk) {
      junkCount++
      rejectionReasons[reason] = (rejectionReasons[reason] ?? 0) + 1
      continue
    }

    const tier = ossActivityTier(repo.pushed_at)
    const stars = repo.stargazers_count
    const confidence = Math.min(0.9, 0.5 + Math.log10(Math.max(1, stars)) / 10)

    items.push({
      id: `gh-${repo.id}`,
      type: "oss", status: "pending", source: "github-oss",
      sourceUrl: repo.html_url, foundAt: new Date().toISOString(),
      confidence,
      whyMatched: `${tier} · ★${stars} · ${repo.owner_login}`,
      rawText: `${repo.full_name}: ${repo.description ?? ""}`,
      extracted: buildOSSExtracted(repo),
    })
  }

  log.skipped = dupCount + junkCount
  log.stages!.queued = items.length
  log.stages!.duplicates = dupCount
  log.stages!.junkFiltered = junkCount
  if (Object.keys(rejectionReasons).length > 0) {
    const reasonStr = Object.entries(rejectionReasons).sort((a, b) => b[1] - a[1]).map(([r, n]) => `${r}(${n})`).join(", ")
    log.notes!.push(`Quality rejections: ${reasonStr}`)
  }
  log.notes!.push(`Unique found: ${rawRepos.length} | already known: ${dupCount} | quality-rejected: ${junkCount} | new: ${items.length}`)

  log.finishedAt = new Date().toISOString()
  return { log, items }
}
