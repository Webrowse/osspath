import { prisma } from "@/lib/prisma"
import type { CorpusProcessor } from "../corpus"
import { buildGraph } from "./engine"
import { serialize, snapshotSha256 } from "../snapshot"
import type { CorpusSnapshot, CorpusRepo, CorpusCompany, CorpusCrateRef } from "./types"

/**
 * Tier 2 processor: Knowledge Graph.
 *
 * Reads only Tier 1 (data.enrichment.cargo) and Tier 2 (data.ecosystemIntelligence)
 * fields already on content_items - no new fetch, no duplication of that data
 * (the graph stores lightweight node references, never a copy of the underlying
 * attributes). Builds the graph via the generic engine, then writes ONE
 * versioned snapshot row, gated by a whole-graph content hash (reusing the same
 * canonical-JSON + SHA-256 the Git snapshot exporter uses) so an unchanged
 * corpus produces zero writes. Independent of Tier 3: nothing exports or
 * renders this yet.
 */

export const GRAPH_VERSION = 1

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []
}

function asCrateRefs(v: unknown): CorpusCrateRef[] {
  if (!Array.isArray(v)) return []
  return v
    .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
    .map((x) => ({ name: String(x.name ?? ""), path: String(x.path ?? "") }))
    .filter((x) => x.name.length > 0)
}

async function loadCorpusSnapshot(): Promise<CorpusSnapshot> {
  const [ossRows, companyRows] = await Promise.all([
    prisma.contentItem.findMany({ where: { type: "oss" } }),
    prisma.contentItem.findMany({ where: { type: "companies" } }),
  ])

  const repos: CorpusRepo[] = []
  for (const row of ossRows) {
    const data = row.data as Record<string, unknown>
    const owner = typeof data.owner === "string" ? data.owner : ""
    const name = typeof data.name === "string" ? data.name : ""
    if (!owner || !name) continue

    const cargo = (data.enrichment as { cargo?: Record<string, unknown> } | undefined)?.cargo
    const ecoIntel = data.ecosystemIntelligence as { ecosystems?: unknown; technologies?: unknown } | undefined

    repos.push({
      slug: `${owner}/${name}`,
      owner,
      cargo: cargo
        ? {
            dependencies: asStringArray(cargo.dependencies),
            isWorkspace: cargo.isWorkspace === true,
            crates: asCrateRefs(cargo.crates),
          }
        : undefined,
      ecosystems: asStringArray(ecoIntel?.ecosystems),
      technologies: asStringArray(ecoIntel?.technologies),
    })
  }

  const companies: CorpusCompany[] = []
  for (const row of companyRows) {
    const data = row.data as Record<string, unknown>
    const slug = typeof data.slug === "string" ? data.slug : ""
    if (!slug) continue
    companies.push({
      slug,
      name: typeof data.name === "string" ? data.name : slug,
      githubOrg: typeof data.github_org === "string" ? data.github_org : null,
    })
  }

  return { repos, companies }
}

export const graphProcessor: CorpusProcessor = {
  name: "graph",

  async run() {
    const corpus = await loadCorpusSnapshot()
    const { nodes, edges } = buildGraph(corpus)
    const contentHash = snapshotSha256([{ path: "graph", content: serialize({ nodes, edges }) }])

    const existing = await prisma.graphSnapshot.findUnique({ where: { id: "singleton" } })
    if (existing && existing.version === GRAPH_VERSION && existing.contentHash === contentHash) {
      return { notes: [`unchanged - ${nodes.length} nodes, ${edges.length} edges (hash match, no write)`] }
    }

    const computedAt = new Date()
    await prisma.graphSnapshot.upsert({
      where: { id: "singleton" },
      create: {
        id: "singleton", version: GRAPH_VERSION, nodeCount: nodes.length, edgeCount: edges.length,
        contentHash, data: { nodes, edges } as never, computedAt,
      },
      update: {
        version: GRAPH_VERSION, nodeCount: nodes.length, edgeCount: edges.length,
        contentHash, data: { nodes, edges } as never, computedAt,
      },
    })
    return { notes: [`graph updated - ${nodes.length} nodes, ${edges.length} edges`] }
  },
}
