/**
 * Knowledge Graph - generic types.
 *
 * A graph is exactly two shapes, regardless of what they represent: a Node
 * (type + id + label) and an Edge (type + from + to). There is no per-node-type
 * or per-edge-type special casing anywhere in this module - "Repository",
 * "Crate", "Company" are just string values of `type`, not different TypeScript
 * shapes. This is what lets new node/edge types be added by writing a new
 * builder, never by touching the engine (see engine.ts).
 *
 * Nodes are lightweight references, not copies: a Crate node is `{id, type,
 * label}`, nothing else - the crate's dependents, the repo's stars, a
 * company's sector, etc. all continue to live only on the content_items rows
 * that already hold them. The graph represents topology, not a second copy of
 * the corpus.
 */

export type GraphNode = { id: string; type: string; label: string }
export type GraphEdge = { id: string; type: string; from: string; to: string }

/** A crate that is a member of a repo's Cargo workspace. */
export type CorpusCrateRef = { name: string; path: string }

/**
 * The slice of Tier 1 + Tier 2 data a graph builder needs, narrowed to exactly
 * those fields - graph/ does not depend on the full enrich/ or corpus/ module
 * shapes, keeping graph generation independent of how those tiers are
 * implemented internally.
 */
export type CorpusRepo = {
  slug: string   // "owner/name" - the repo's node identity
  owner: string  // GitHub org/user login, for company matching
  cargo?: {
    dependencies: string[]
    isWorkspace: boolean
    crates: CorpusCrateRef[]
  }
  ecosystems: string[]
  technologies: string[]
}

export type CorpusCompany = { slug: string; name: string; githubOrg: string | null }

export type CorpusSnapshot = { repos: CorpusRepo[]; companies: CorpusCompany[] }

/**
 * A graph builder is a pure function: corpus in, some nodes and/or edges out.
 * Adding a new node or edge type means writing a new builder and adding it to
 * the registry (engine.ts) - the assembly/dedup/hashing engine never changes.
 */
export type GraphBuilder = (corpus: CorpusSnapshot) => { nodes: GraphNode[]; edges: GraphEdge[] }

/** Deterministic, stable node ids - same real-world entity always maps to the same id. */
export const nodeId = {
  repository: (slug: string): string => `repository:${slug}`,
  crate: (name: string): string => `crate:${name}`,
  company: (slug: string): string => `company:${slug}`,
  ecosystem: (tag: string): string => `ecosystem:${tag}`,
  technology: (name: string): string => `technology:${name}`,
}

/** Deterministic edge id from its endpoints and type - identical edges collapse for free. */
export function edgeId(type: string, from: string, to: string): string {
  return `${from}--${type}-->${to}`
}
