import { extractWithDeepSeek } from "@/lib/admin/deepseek"
import type { RepoInput } from "@/lib/admin/deepseek"
import type { ScanResult, Candidate, ScanContext } from "@/lib/pipeline/types"
import type { ScanLog } from "@/lib/admin/types"
import { ghFetch } from "./github"

/**
 * GitHub Pulse scanner core — Category 2 (semi-structured).
 *
 * Repo metadata is structured, so a candidate is built deterministically first.
 * DeepSeek runs only as a fallback when the deterministic result is incomplete
 * (unknown kind or missing description) and the repo is new. Clear cases never
 * touch DeepSeek.
 */

type PulseRepo = RepoInput & { homepage?: string }

const GH_QUERIES = [
  "topic:rust-newsletter",
  "topic:rust-community",
  "rust+newsletter+in:name",
  "rust+podcast+in:name",
  "rust+blog+resources+in:name,description",
]

/** Deterministically classify a community resource from its signals. */
function deriveKind(repo: PulseRepo): string {
  const hay = `${repo.name} ${repo.description ?? ""} ${(repo.topics ?? []).join(" ")}`.toLowerCase()
  if (hay.includes("newsletter")) return "Newsletter"
  if (hay.includes("podcast")) return "Podcast"
  if (hay.includes("forum")) return "Forum"
  if (hay.includes("blog")) return "Blog"
  if (hay.includes("community") || hay.includes("discord") || hay.includes("matrix")) return "Community"
  return ""
}

function isComplete(e: Record<string, unknown>): boolean {
  return Boolean(e.kind && e.title && e.href && e.description)
}

export async function collectPulse(ctx: ScanContext): Promise<ScanResult> {
  const log: ScanLog = {
    source: "pulse", startedAt: new Date().toISOString(),
    found: 0, added: 0, skipped: 0, errors: [], stages: {}, notes: [],
  }
  const items: Candidate[] = []

  const repos: PulseRepo[] = []
  const seenIds = new Set<number>()
  for (const q of GH_QUERIES) {
    try {
      const data = await ghFetch(
        `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=stars&per_page=10`,
      ) as { items?: PulseRepo[] }
      const found = data?.items ?? []
      log.stages![`gh_${q.slice(0, 20)}`] = found.length
      for (const r of found) {
        if (!seenIds.has(r.id) && r.stargazers_count >= 20) { seenIds.add(r.id); repos.push(r) }
      }
    } catch (e) {
      log.errors.push(`GitHub "${q.slice(0, 30)}": ${String(e)}`)
    }
  }
  log.found = repos.length

  let deterministic = 0
  let aiFallback = 0
  for (const repo of repos) {
    const href = repo.homepage || repo.html_url
    if (ctx.isKnown(href) || ctx.isKnown(repo.html_url)) { log.skipped++; continue }

    // Deterministic first.
    const draft: Record<string, unknown> = {
      kind: deriveKind(repo),
      title: repo.name,
      href,
      description: repo.description ?? "",
    }

    let extracted: Record<string, unknown>
    if (isComplete(draft)) {
      extracted = draft
      deterministic++
    } else {
      // Fallback: semantic extraction only when deterministic is insufficient.
      const text = [`${repo.name}: ${repo.description ?? ""}`, `URL: ${href}`, `GitHub: ${repo.html_url}`].join("\n")
      const result = await extractWithDeepSeek("pulse", text)
      if (!result.ok || !result.data) { log.skipped++; continue }
      extracted = { ...result.data, href: result.data.href || href }
      aiFallback++
    }

    items.push({
      id: `gh-pulse-${repo.id}`,
      type: "pulse", status: "pending", source: "github-pulse",
      sourceUrl: repo.html_url, foundAt: new Date().toISOString(),
      confidence: 0.6, whyMatched: `${repo.stargazers_count}★ · community resource`,
      rawText: `${repo.name}: ${repo.description ?? ""}`,
      extracted,
    })
  }

  log.stages!.deterministic = deterministic
  log.stages!.aiFallback = aiFallback
  log.stages!.queued = items.length
  log.finishedAt = new Date().toISOString()
  return { log, items }
}
