import rawEdges from "./lifecycle-edges.json"

export type LifecycleEdgeType = "acquired_by" | "merged_into" | "renamed_to"

export type LifecycleEdge = {
  edge_type:      LifecycleEdgeType
  from_slug:      string
  to_slug:        string
  effective_date: string
  source:         string
}

export const LIFECYCLE_EDGES = rawEdges as LifecycleEdge[]

export function getEdgesFrom(slug: string): LifecycleEdge[] {
  return LIFECYCLE_EDGES.filter(e => e.from_slug === slug)
}

export function getEdgesTo(slug: string): LifecycleEdge[] {
  return LIFECYCLE_EDGES.filter(e => e.to_slug === slug)
}
