import { prisma } from "@/lib/prisma"

/**
 * Manual override storage. Configuration, not content: a small hand-curated
 * exception layered on top of automatic pipeline output (a corrected
 * ecosystem tag, a tracked company acquisition) - never scanned, never
 * discovered, always admin-authored. Deliberately not a ContentItem; the
 * generic Published CRUD screen doesn't fit a keyed lookup map or a
 * relationship list.
 *
 * `kind` scopes each override family; `key` is a dedup key whose meaning is
 * kind-specific (see the callers in override-actions.ts).
 */

export type OverrideKind = "eco-tags" | "lifecycle-edges"

export type OverrideRow = {
  id: string
  kind: OverrideKind
  key: string
  data: unknown
  updatedAt: Date
}

function toRow(r: { id: string; kind: string; key: string; data: unknown; updatedAt: Date }): OverrideRow {
  return { id: r.id, kind: r.kind as OverrideKind, key: r.key, data: r.data, updatedAt: r.updatedAt }
}

export async function listOverrides(kind: OverrideKind): Promise<OverrideRow[]> {
  const rows = await prisma.override.findMany({ where: { kind }, orderBy: { key: "asc" } })
  return rows.map(toRow)
}

export async function upsertOverride(kind: OverrideKind, key: string, data: unknown): Promise<void> {
  await prisma.override.upsert({
    where: { kind_key: { kind, key } },
    create: { kind, key, data: data as never },
    update: { data: data as never },
  })
}

export async function deleteOverride(kind: OverrideKind, key: string): Promise<void> {
  await prisma.override.deleteMany({ where: { kind, key } })
}
