/**
 * Search 2.0 - types.
 *
 * The search index is a pure projection of Tier 1 (Cargo enrichment), Tier 2
 * (Ecosystem Intelligence + relationships), and the Knowledge Graph's
 * maintained_by_company edges. It computes nothing new - no scoring, no
 * classification - it only reshapes already-derived knowledge into a form a
 * static site can filter quickly. `SearchCorpus*` types are narrowed inputs,
 * decoupled from enrich/corpus/graph's internal module shapes (the same
 * independence discipline graph/types.ts uses), so this module does not need
 * to change if those tiers' internal representations change.
 */

export type SearchRepo = {
  slug: string   // "owner/name"
  name: string
  href: string
  stars: number
  activityTier: "active" | "maintenance" | "dormant" | null
  license: string | null
  msrv: string | null
  isWorkspace: boolean
  hasLockfile: boolean
  categories: string[]
  keywords: string[]
  dependencies: string[]
  ecosystems: string[]
  technologies: string[]
  domain: string | null
  ecosystemConfidence: number
  companySlug: string | null
  companyName: string | null
  similar: string[]      // repo slugs, from Tier 2 relationships
  companions: string[]   // crate names, from Tier 2 relationships
}

export type SearchFacets = {
  ecosystems: string[]
  technologies: string[]
  licenses: string[]
  categories: string[]
  domains: string[]
  companies: Array<{ slug: string; name: string }>
}

export type SearchIndex = {
  version: number
  computedAt: string
  repos: SearchRepo[]
  facets: SearchFacets
}

// ── Builder input (narrowed corpus) ────────────────────────────────────────────

export type SearchCorpusRepo = {
  slug: string
  name: string
  href: string
  stars: number
  activityTier: string | null
  cargo?: {
    license: string | null
    msrv: string | null
    isWorkspace: boolean
    hasLockfile: boolean
    categories: string[]
    keywords: string[]
    dependencies: string[]
  }
  ecosystemIntelligence?: {
    ecosystems: string[]
    technologies: string[]
    domain: string | null
    confidence: number
  }
  relationships?: {
    similar: string[]      // already projected to repo slugs
    companions: string[]   // already projected to crate names
  }
}

export type SearchCorpus = {
  repos: SearchCorpusRepo[]
  /** repo slug -> company, read from the Knowledge Graph's maintained_by_company edges. */
  companyByRepoSlug: Map<string, { slug: string; name: string }>
}
