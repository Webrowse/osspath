import type { SearchCorpus, SearchRepo, SearchFacets } from "./types"

/**
 * Pure projection: SearchCorpus (already-derived Tier 1/2/Graph data) ->
 * {repos, facets}. No new classification or scoring - every field is a direct
 * read of an existing value. Deterministic: output is sorted, so identical
 * input always yields byte-identical output regardless of Postgres row order.
 */
export function buildSearchIndex(corpus: SearchCorpus): { repos: SearchRepo[]; facets: SearchFacets } {
  const repos: SearchRepo[] = corpus.repos
    .map((r) => {
      const company = corpus.companyByRepoSlug.get(r.slug)
      return {
        slug: r.slug,
        name: r.name,
        href: r.href,
        stars: r.stars,
        activityTier: (r.activityTier as SearchRepo["activityTier"]) ?? null,
        license: r.cargo?.license ?? null,
        msrv: r.cargo?.msrv ?? null,
        isWorkspace: r.cargo?.isWorkspace ?? false,
        hasLockfile: r.cargo?.hasLockfile ?? false,
        categories: [...(r.cargo?.categories ?? [])].sort(),
        keywords: [...(r.cargo?.keywords ?? [])].sort(),
        dependencies: [...(r.cargo?.dependencies ?? [])].sort(),
        ecosystems: [...(r.ecosystemIntelligence?.ecosystems ?? [])].sort(),
        technologies: [...(r.ecosystemIntelligence?.technologies ?? [])].sort(),
        domain: r.ecosystemIntelligence?.domain ?? null,
        ecosystemConfidence: r.ecosystemIntelligence?.confidence ?? 0,
        companySlug: company?.slug ?? null,
        companyName: company?.name ?? null,
        similar: [...(r.relationships?.similar ?? [])],
        companions: [...(r.relationships?.companions ?? [])].sort(),
      }
    })
    .sort((a, b) => a.slug.localeCompare(b.slug))

  const uniqSorted = (values: string[]): string[] => [...new Set(values)].sort()

  const companyMap = new Map<string, string>()
  for (const r of repos) if (r.companySlug && r.companyName) companyMap.set(r.companySlug, r.companyName)

  const facets: SearchFacets = {
    ecosystems: uniqSorted(repos.flatMap((r) => r.ecosystems)),
    technologies: uniqSorted(repos.flatMap((r) => r.technologies)),
    licenses: uniqSorted(repos.map((r) => r.license).filter((x): x is string => !!x)),
    categories: uniqSorted(repos.flatMap((r) => r.categories)),
    domains: uniqSorted(repos.map((r) => r.domain).filter((x): x is string => !!x)),
    companies: [...companyMap.entries()].map(([slug, name]) => ({ slug, name })).sort((a, b) => a.slug.localeCompare(b.slug)),
  }

  return { repos, facets }
}
