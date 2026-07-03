import type { GraphBuilder } from "../types"
import { nodeId } from "../types"

/** One Repository node per enriched repo. No edges - other builders connect it. */
export const repositoryNodesBuilder: GraphBuilder = (corpus) => ({
  nodes: corpus.repos.map((r) => ({ id: nodeId.repository(r.slug), type: "repository", label: r.slug })),
  edges: [],
})
