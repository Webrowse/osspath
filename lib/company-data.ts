import "server-only"
import type { EcosystemCompany } from "@/content/companies"
import { COMPANIES } from "@/content/companies"
import { getOSSRepos } from "@/lib/oss-data"
import { getEcoTags, ECO_LABEL } from "@/lib/eco-tags"
import { getDepPageCounts } from "@/lib/deps-data"
import type { OSSPath } from "@/content/oss-paths"
import type { EcoTag } from "@/lib/eco-tags"

export type { EcosystemCompany }

export type CompanyProfile = EcosystemCompany & {
  repos:              OSSPath[]
  repoCount:          number
  totalStars:         number
  topRepo:            OSSPath | null
  ecosystems:         EcoTag[]
  topDeps:            string[]
  activityBreakdown:  { active: number; maintenance: number; dormant: number }
}

// owner (lowercase) → company — built once, reused across requests
let _ownerIndex: Map<string, EcosystemCompany> | null = null

export function getOwnerCompanyIndex(): Map<string, EcosystemCompany> {
  if (_ownerIndex) return _ownerIndex
  _ownerIndex = new Map()
  for (const c of COMPANIES) {
    if (c.github_org) _ownerIndex.set(c.github_org.toLowerCase(), c)
  }
  return _ownerIndex
}

export function getCompanyBySlug(slug: string): EcosystemCompany | undefined {
  return COMPANIES.find(c => c.slug === slug)
}

export function getCompanyForOwner(owner: string): EcosystemCompany | undefined {
  return getOwnerCompanyIndex().get(owner.toLowerCase())
}

export function buildCompanyProfile(company: EcosystemCompany): CompanyProfile {
  const allRepos    = getOSSRepos()
  const depCounts   = getDepPageCounts()

  const repos = company.github_org
    ? allRepos
        .filter(r => r.owner?.toLowerCase() === company.github_org!.toLowerCase())
        .sort((a, b) => (b.stars ?? 0) - (a.stars ?? 0))
    : []

  const repoCount  = repos.length
  const totalStars = repos.reduce((s, r) => s + (r.stars ?? 0), 0)
  const topRepo    = repos[0] ?? null

  // Union of ecosystem tags across all repos
  const ecoSet = new Set<EcoTag>()
  for (const r of repos) {
    getEcoTags(r.dependencies, {
      owner:  r.owner  ?? undefined,
      name:   r.name   ?? undefined,
      topics: r.topics ?? undefined,
    }).forEach(t => ecoSet.add(t))
  }
  // Sort by ECO_LABEL key order (most-specific first)
  const ECO_ORDER: EcoTag[] = ["bevy","tauri","blockchain","embedded","ai","wasm","database","grpc","cli","axum","tokio"]
  const ecosystems = ECO_ORDER.filter(t => ecoSet.has(t))

  // Most-used qualified deps across all repos
  const depFreq: Record<string, number> = {}
  for (const r of repos) {
    for (const d of r.dependencies ?? []) {
      if (d in depCounts) depFreq[d] = (depFreq[d] ?? 0) + 1
    }
  }
  const topDeps = Object.entries(depFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([dep]) => dep)

  const activityBreakdown = { active: 0, maintenance: 0, dormant: 0 }
  for (const r of repos) {
    const tier = r.activityTier ?? "dormant"
    if      (tier === "active")      activityBreakdown.active++
    else if (tier === "maintenance") activityBreakdown.maintenance++
    else                             activityBreakdown.dormant++
  }

  return { ...company, repos, repoCount, totalStars, topRepo, ecosystems, topDeps, activityBreakdown }
}

// Companies that have at least one repo depending on the given crate.
export function getCompaniesForDep(crate: string): EcosystemCompany[] {
  const ownerIndex = getOwnerCompanyIndex()
  const matched    = new Set<string>()

  for (const r of getOSSRepos()) {
    if (!r.owner || !r.dependencies?.includes(crate)) continue
    const company = ownerIndex.get(r.owner.toLowerCase())
    if (company) matched.add(company.slug)
  }

  // Deduplicate by slug — COMPANIES may contain orphan duplicates
  const seen = new Set<string>()
  return COMPANIES.filter(c => {
    if (!matched.has(c.slug)) return false
    if (seen.has(c.slug)) return false
    seen.add(c.slug)
    return true
  })
}

export { COMPANIES, ECO_LABEL }
