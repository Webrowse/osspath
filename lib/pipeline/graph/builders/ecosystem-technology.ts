import type { GraphBuilder, GraphNode } from "../types"
import { nodeId, edgeId } from "../types"

/**
 * Ecosystem and Technology nodes, from Tier 2's Ecosystem Intelligence:
 *   Repository --belongs_to_ecosystem--> Ecosystem
 *   Repository --uses_technology--> Technology
 * Distinct from crates.ts's depends_on: Crate nodes are Tier 1's exhaustive raw
 * dependency list; Technology nodes are Tier 2's curated, named subset with
 * ecosystem classification attached (e.g. crate "tokio-postgres" -> technology
 * "PostgreSQL"). Both are real, non-duplicate relationships.
 */
export const ecosystemTechnologyBuilder: GraphBuilder = (corpus) => {
  const nodes = new Map<string, GraphNode>()
  const edges = []

  for (const repo of corpus.repos) {
    const repoId = nodeId.repository(repo.slug)

    for (const eco of repo.ecosystems) {
      const ecoId = nodeId.ecosystem(eco)
      if (!nodes.has(ecoId)) nodes.set(ecoId, { id: ecoId, type: "ecosystem", label: eco })
      edges.push({ id: edgeId("belongs_to_ecosystem", repoId, ecoId), type: "belongs_to_ecosystem", from: repoId, to: ecoId })
    }

    for (const tech of repo.technologies) {
      const techId = nodeId.technology(tech)
      if (!nodes.has(techId)) nodes.set(techId, { id: techId, type: "technology", label: tech })
      edges.push({ id: edgeId("uses_technology", repoId, techId), type: "uses_technology", from: repoId, to: techId })
    }
  }

  return { nodes: [...nodes.values()], edges }
}
