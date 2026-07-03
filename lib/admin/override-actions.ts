"use server"

import { revalidatePath } from "next/cache"
import { requireAdmin } from "./require-admin"
import { upsertOverride, deleteOverride } from "./overrides"
import { isEcoTag, type EcoTag } from "@/lib/eco-tags"

/**
 * Kind-specific override actions. Each override family gets its own typed,
 * validated entry point rather than one generic "set arbitrary JSON" action -
 * the point of purpose-built editors is that the server actions understand
 * the shape they're writing, same as any other admin action in this app.
 */

// ── Eco-tag overrides (lookup map: "owner/repo" -> EcoTag[]) ───────────────────

export async function setEcoOverride(repoSlug: string, tags: string[]) {
  await requireAdmin()
  const slug = repoSlug.trim()
  if (!slug.includes("/")) throw new Error(`Repo slug must be "owner/repo", got: ${slug}`)
  const cleaned = tags.map((t) => t.trim()).filter(Boolean)
  const invalid = cleaned.filter((t) => !isEcoTag(t))
  if (invalid.length > 0) throw new Error(`Unknown ecosystem tag(s): ${invalid.join(", ")}`)
  await upsertOverride("eco-tags", slug, cleaned as EcoTag[])
  revalidatePath("/admin/overrides")
  revalidatePath("/")
}

export async function removeEcoOverride(repoSlug: string) {
  await requireAdmin()
  await deleteOverride("eco-tags", repoSlug)
  revalidatePath("/admin/overrides")
  revalidatePath("/")
}

// ── Lifecycle edges (relationship list: acquired_by | merged_into | renamed_to) ─

export type LifecycleEdgeInput = {
  edge_type: "acquired_by" | "merged_into" | "renamed_to"
  from_slug: string
  to_slug: string
  effective_date: string
  source: string
}

function edgeKey(e: Pick<LifecycleEdgeInput, "edge_type" | "from_slug" | "to_slug">): string {
  return `${e.edge_type}:${e.from_slug}:${e.to_slug}`
}

export async function setLifecycleEdge(edge: LifecycleEdgeInput) {
  await requireAdmin()
  const clean: LifecycleEdgeInput = {
    edge_type: edge.edge_type,
    from_slug: edge.from_slug.trim(),
    to_slug: edge.to_slug.trim(),
    effective_date: edge.effective_date.trim(),
    source: edge.source.trim(),
  }
  if (!clean.from_slug || !clean.to_slug) throw new Error("from_slug and to_slug are required")
  await upsertOverride("lifecycle-edges", edgeKey(clean), clean)
  revalidatePath("/admin/overrides")
  revalidatePath("/")
}

export async function removeLifecycleEdge(key: string) {
  await requireAdmin()
  await deleteOverride("lifecycle-edges", key)
  revalidatePath("/admin/overrides")
  revalidatePath("/")
}
