import type { SearchIndex, SearchRepo } from "./types"

/**
 * Filters combine with AND across facets. Within a multi-value facet
 * (ecosystems, technologies), matching is ANY (OR) - standard multi-select
 * faceted search. `dependencies` is ANY-per-item AND-across-items (a repo must
 * have every listed dependency) - matching the existing /oss page's dependency
 * filter semantics exactly, so this is consistent with prior UX, not a new
 * convention.
 */
export type SearchFilters = {
  ecosystems?: string[]
  technologies?: string[]
  dependencies?: string[]
  companySlug?: string
  license?: string
  domain?: string
  activityTier?: SearchRepo["activityTier"]
  minStars?: number
  isWorkspace?: boolean
  similarTo?: string // a repo slug; returns repos in that repo's `similar` list
}

export function queryRepos(index: SearchIndex, filters: SearchFilters): SearchRepo[] {
  const similarTarget = filters.similarTo
    ? index.repos.find((r) => r.slug === filters.similarTo)
    : undefined

  return index.repos.filter((r) => {
    if (filters.ecosystems?.length && !filters.ecosystems.some((e) => r.ecosystems.includes(e))) return false
    if (filters.technologies?.length && !filters.technologies.some((t) => r.technologies.includes(t))) return false
    if (filters.dependencies?.length && !filters.dependencies.every((d) => r.dependencies.includes(d))) return false
    if (filters.companySlug && r.companySlug !== filters.companySlug) return false
    if (filters.license && r.license !== filters.license) return false
    if (filters.domain && r.domain !== filters.domain) return false
    if (filters.activityTier && r.activityTier !== filters.activityTier) return false
    if (filters.minStars != null && r.stars < filters.minStars) return false
    if (filters.isWorkspace != null && r.isWorkspace !== filters.isWorkspace) return false
    if (filters.similarTo && (!similarTarget || !similarTarget.similar.includes(r.slug))) return false
    return true
  })
}
