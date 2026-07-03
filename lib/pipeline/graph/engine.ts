import type { CorpusSnapshot, GraphBuilder, GraphNode, GraphEdge } from "./types"
import { repositoryNodesBuilder } from "./builders/repository"
import { crateGraphBuilder } from "./builders/crates"
import { ecosystemTechnologyBuilder } from "./builders/ecosystem-technology"
import { companyBuilder } from "./builders/company"

/**
 * The registry. A future node/edge type (e.g. a "Grant" node, a "funded_by"
 * edge) is added by writing one more builder and appending it here - nothing
 * below this line ever needs to change for that. graphProcessor.ts (Tier 2
 * registration) runs this after the ecosystem/relationships processors in the
 * same Refresh, so it always sees this run's freshest Tier 2 output.
 */
export const GRAPH_BUILDERS: GraphBuilder[] = [
  repositoryNodesBuilder,
  crateGraphBuilder,
  ecosystemTechnologyBuilder,
  companyBuilder,
]

/**
 * Runs every builder over the corpus and merges the results into one graph.
 * Generic over node/edge type by construction: this function never inspects
 * `type`, it only ever merges by `id`. Nodes/edges are deduplicated by their
 * deterministic id (last builder wins on a node id collision - array order is
 * fixed, so this stays deterministic); output is sorted by id so the result is
 * byte-identical for an unchanged corpus regardless of Postgres row order.
 */
export function buildGraph(
  corpus: CorpusSnapshot,
  builders: GraphBuilder[] = GRAPH_BUILDERS,
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes = new Map<string, GraphNode>()
  const edges = new Map<string, GraphEdge>()

  for (const builder of builders) {
    const result = builder(corpus)
    for (const n of result.nodes) nodes.set(n.id, n)
    for (const e of result.edges) edges.set(e.id, e)
  }

  return {
    nodes: [...nodes.values()].sort((a, b) => a.id.localeCompare(b.id)),
    edges: [...edges.values()].sort((a, b) => a.id.localeCompare(b.id)),
  }
}
