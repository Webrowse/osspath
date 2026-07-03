import type { GraphBuilder, GraphNode } from "../types"
import { nodeId, edgeId } from "../types"

/**
 * Crate nodes and their two edge types, from Tier 1's Cargo enrichment:
 *   Repository --depends_on--> Crate            (every dependency, repo-level
 *                                                 granularity - Tier 1 already
 *                                                 aggregates workspace deps)
 *   Crate --member_of_workspace--> Repository    (for workspace repos, each
 *                                                 member crate)
 * A crate referenced both ways (e.g. tokio is a workspace member of its own
 * repo AND a dependency of thousands of others) gets both edges - that is a
 * real, accurate relationship, not a duplicate.
 */
export const crateGraphBuilder: GraphBuilder = (corpus) => {
  const nodes = new Map<string, GraphNode>()
  const edges = []

  for (const repo of corpus.repos) {
    if (!repo.cargo) continue
    const repoId = nodeId.repository(repo.slug)

    for (const dep of repo.cargo.dependencies) {
      const crateId = nodeId.crate(dep)
      if (!nodes.has(crateId)) nodes.set(crateId, { id: crateId, type: "crate", label: dep })
      edges.push({ id: edgeId("depends_on", repoId, crateId), type: "depends_on", from: repoId, to: crateId })
    }

    if (repo.cargo.isWorkspace) {
      for (const crate of repo.cargo.crates) {
        const crateId = nodeId.crate(crate.name)
        if (!nodes.has(crateId)) nodes.set(crateId, { id: crateId, type: "crate", label: crate.name })
        edges.push({ id: edgeId("member_of_workspace", crateId, repoId), type: "member_of_workspace", from: crateId, to: repoId })
      }
    }
  }

  return { nodes: [...nodes.values()], edges }
}
