import { prisma } from "@/lib/prisma"
import type { Exporter } from "./index"
import { buildSearchIndex } from "@/lib/pipeline/search/index-builder"
import type { SearchCorpus, SearchCorpusRepo } from "@/lib/pipeline/search/types"
import { serialize } from "@/lib/pipeline/snapshot"
import { publishSnapshot } from "@/lib/pipeline/github-publisher"

/**
 * Tier 3 exporter: the Search 2.0 index.
 *
 * Reads only what Tier 1 (enrichment.cargo), Tier 2 (ecosystemIntelligence,
 * relationships), and the Knowledge Graph (maintained_by_company edges)
 * already computed - no new enrichment, no re-deriving the graph's company
 * matching. Publishes as its own file via the same atomic-commit-with-no-op-gate
 * publishSnapshot() the content snapshot exporter uses, so an unchanged corpus
 * produces zero writes here too. Independent of the content snapshot: a
 * failure here never blocks or is blocked by it (separate commits, separate
 * no-op gates), matching how Tier 3 exporters are already isolated.
 */

export const SEARCH_INDEX_VERSION = 1
const SEARCH_INDEX_PATH = "content/search-index.json"

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []
}

type GraphData = {
  nodes?: Array<{ id: string; type: string; label: string }>
  edges?: Array<{ type: string; from: string; to: string }>
}

async function loadCompanyByRepoSlug(): Promise<Map<string, { slug: string; name: string }>> {
  const graph = await prisma.graphSnapshot.findUnique({ where: { id: "singleton" } })
  const companyByRepoSlug = new Map<string, { slug: string; name: string }>()
  if (!graph) return companyByRepoSlug

  const data = graph.data as GraphData
  const companyLabel = new Map((data.nodes ?? []).filter((n) => n.type === "company").map((n) => [n.id, n.label]))
  for (const edge of data.edges ?? []) {
    if (edge.type !== "maintained_by_company") continue
    const repoSlug = edge.from.replace(/^repository:/, "")
    const companySlug = edge.to.replace(/^company:/, "")
    companyByRepoSlug.set(repoSlug, { slug: companySlug, name: companyLabel.get(edge.to) ?? companySlug })
  }
  return companyByRepoSlug
}

async function loadSearchCorpus(): Promise<SearchCorpus> {
  const [ossRows, companyByRepoSlug] = await Promise.all([
    prisma.contentItem.findMany({ where: { type: "oss" } }),
    loadCompanyByRepoSlug(),
  ])

  const repos: SearchCorpusRepo[] = []
  for (const row of ossRows) {
    const data = row.data as Record<string, unknown>
    const owner = typeof data.owner === "string" ? data.owner : ""
    const name = typeof data.name === "string" ? data.name : ""
    if (!owner || !name) continue

    const cargo = (data.enrichment as { cargo?: Record<string, unknown> } | undefined)?.cargo
    const ecoIntel = data.ecosystemIntelligence as Record<string, unknown> | undefined
    const relationships = data.relationships as
      | { similar?: Array<{ repo: string }>; companions?: Array<{ name: string }> }
      | undefined

    repos.push({
      slug: `${owner}/${name}`,
      name,
      href: typeof data.href === "string" ? data.href : "",
      stars: typeof data.stars === "number" ? data.stars : 0,
      activityTier: typeof data.activityTier === "string" ? data.activityTier : null,
      cargo: cargo
        ? {
            license: typeof cargo.license === "string" ? cargo.license : null,
            msrv: typeof cargo.msrv === "string" ? cargo.msrv : null,
            isWorkspace: cargo.isWorkspace === true,
            hasLockfile: cargo.hasLockfile === true,
            categories: asStringArray(cargo.categories),
            keywords: asStringArray(cargo.keywords),
            dependencies: asStringArray(cargo.dependencies),
          }
        : undefined,
      ecosystemIntelligence: ecoIntel
        ? {
            ecosystems: asStringArray(ecoIntel.ecosystems),
            technologies: asStringArray(ecoIntel.technologies),
            domain: typeof ecoIntel.domain === "string" ? ecoIntel.domain : null,
            confidence: typeof ecoIntel.confidence === "number" ? ecoIntel.confidence : 0,
          }
        : undefined,
      relationships: relationships
        ? {
            similar: (relationships.similar ?? []).map((s) => s.repo),
            companions: (relationships.companions ?? []).map((c) => c.name),
          }
        : undefined,
    })
  }

  return { repos, companyByRepoSlug }
}

export const searchIndexExporter: Exporter = {
  name: "search-index",

  async run(report) {
    const corpus = await loadSearchCorpus()
    const { repos, facets } = buildSearchIndex(corpus)
    const content = serialize({ version: SEARCH_INDEX_VERSION, computedAt: new Date().toISOString(), repos, facets })

    const result = await publishSnapshot([{ path: SEARCH_INDEX_PATH, content }])
    const suffix = result.state === "committed" ? ` (${result.commitSha.slice(0, 7)})` : ""
    report.notes.push(`search-index: ${result.state}${suffix} - ${repos.length} repos indexed`)
    if (result.state === "failed") report.errors.push(`search-index publish failed: ${result.error}`)
  },
}
