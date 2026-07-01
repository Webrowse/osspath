import { extractWithDeepSeek } from "@/lib/admin/deepseek"
import type { RepoInput } from "@/lib/admin/deepseek"
import type { ScanResult, Candidate, ScanContext } from "@/lib/pipeline/types"
import type { ScanLog } from "@/lib/admin/types"
import { ghFetch } from "./github"

/**
 * Companies scanner core — Category 2 (semi-structured).
 *
 * Orgs are discovered deterministically from high-star Rust repos. The company
 * name and href are structured, but sector requires semantic understanding, so
 * DeepSeek runs to extract it for genuinely new orgs (skipped for known ones via
 * ctx.isKnown); a deterministic default is used if DeepSeek is unavailable.
 */

type GHOrgDetail = {
  id: number
  login: string
  name?: string
  html_url: string
  blog?: string
  description?: string
  public_repos?: number
}

type OrgRepo = RepoInput & { owner?: { type?: string; login?: string } }

export async function collectCompanies(ctx: ScanContext): Promise<ScanResult> {
  const log: ScanLog = {
    source: "companies", startedAt: new Date().toISOString(),
    found: 0, added: 0, skipped: 0, errors: [], stages: {}, notes: [],
  }
  const items: Candidate[] = []

  const since = new Date(Date.now() - 180 * 86_400_000).toISOString().split("T")[0]
  const rawRepos: OrgRepo[] = []
  const seenRepoIds = new Set<number>()
  try {
    for (const q of [
      `language:Rust+stars:>500+pushed:>${since}+fork:false`,
      `language:Rust+stars:>100+pushed:>${since}+fork:false`,
    ]) {
      const data = await ghFetch(
        `https://api.github.com/search/repositories?q=${q}&sort=stars&per_page=50`,
      ) as { items?: OrgRepo[] }
      for (const r of data.items ?? []) {
        if (!seenRepoIds.has(r.id)) { seenRepoIds.add(r.id); rawRepos.push(r) }
      }
    }
  } catch (e) {
    log.errors.push(`GitHub search: ${String(e)}`)
  }
  log.found = rawRepos.length
  log.stages!.reposFound = rawRepos.length

  // Group by Organization owner, rank by total Rust stars.
  const orgToRepos = new Map<string, { repos: OrgRepo[]; stars: number }>()
  for (const repo of rawRepos) {
    const owner = repo.owner
    if (!owner || owner.type !== "Organization" || !owner.login) continue
    const entry = orgToRepos.get(owner.login) ?? { repos: [], stars: 0 }
    entry.repos.push(repo)
    entry.stars += repo.stargazers_count
    orgToRepos.set(owner.login, entry)
  }
  log.stages!.orgsFound = orgToRepos.size

  const topOrgs = Array.from(orgToRepos.entries())
    .sort((a, b) => b[1].stars - a[1].stars)
    .slice(0, 15)
    .map(([login, { repos, stars }]) => ({ login, repoCount: repos.length, stars }))

  const orgDetailResults = await Promise.allSettled(
    topOrgs.map(({ login }) => ghFetch(`https://api.github.com/orgs/${login}`).then((d) => d as GHOrgDetail)),
  )

  let aiUsed = 0
  for (let i = 0; i < topOrgs.length; i++) {
    const { login, repoCount, stars } = topOrgs[i]
    const result = orgDetailResults[i]
    if (result.status === "rejected") { log.errors.push(`Org ${login}: ${String(result.reason)}`); continue }

    const org = result.value
    const href = org.blog?.startsWith("http") ? org.blog : org.html_url
    if (ctx.isKnown(href) || ctx.isKnown(org.html_url)) { log.skipped++; continue }

    const displayName = org.name ?? org.login
    const text = [
      `Org: ${displayName}`,
      org.description ? `About: ${org.description}` : "",
      org.blog ? `Website: ${org.blog}` : "",
      `GitHub: ${org.html_url}`,
      `${repoCount} Rust repos · ${stars} total stars`,
    ].filter(Boolean).join("\n")

    // Sector needs semantics: DeepSeek for new orgs, deterministic fallback otherwise.
    const aiResult = await extractWithDeepSeek("companies", text)
    if (aiResult.ok && aiResult.data) aiUsed++
    const extracted = aiResult.ok && aiResult.data
      ? { ...aiResult.data, href: (aiResult.data.href as string)?.startsWith("http") ? aiResult.data.href : href }
      : { name: displayName, sector: "Open Source", href }

    items.push({
      id: `gh-org-${org.id}`,
      type: "companies", status: "pending", source: "github-orgs",
      sourceUrl: org.html_url, foundAt: new Date().toISOString(),
      confidence: 0.65, whyMatched: `${repoCount} Rust repos · ${stars} total stars`,
      rawText: text, extracted,
    })
  }

  log.stages!.aiUsed = aiUsed
  log.stages!.queued = items.length
  log.finishedAt = new Date().toISOString()
  return { log, items }
}
