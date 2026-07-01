import { prisma } from "@/lib/prisma"
import type { ContentType } from "@/lib/admin/types"
import { normalizeUrl } from "@/lib/admin/lists"

/**
 * Pipeline data access. Writes published content directly to content_items
 * (the source of truth); the build regenerates content/*.json from it. Kept
 * separate from the legacy admin storage so migrating the pipeline never
 * extends the old queue-based workflow.
 */

/** Published data objects for a type (read-only input for scanners like careers). */
export async function readPublished(type: ContentType): Promise<Record<string, unknown>[]> {
  const rows = await prisma.contentItem.findMany({ where: { type }, orderBy: { createdAt: "asc" } })
  return rows.map((r) => r.data as Record<string, unknown>)
}

/** Set of normalised hrefs already published for a type (for dedup). */
export async function publishedHrefSet(type: ContentType): Promise<Set<string>> {
  const rows = await prisma.contentItem.findMany({
    where: { type },
    select: { href: true, data: true },
  })
  const set = new Set<string>()
  for (const r of rows) {
    if (r.href) set.add(normalizeUrl(r.href))
    const dataHref = String((r.data as Record<string, unknown>)?.href ?? "")
    if (dataHref) set.add(normalizeUrl(dataHref))
  }
  return set
}

/** Insert accepted items for a type. DB only; JSON is a build artifact. */
export async function publishBatch(type: ContentType, items: Record<string, unknown>[]): Promise<number> {
  if (items.length === 0) return 0
  await prisma.contentItem.createMany({
    data: items.map((item) => ({
      type,
      href: String(item.href ?? "") || null,
      data: item as never,
    })),
  })
  return items.length
}

/** Remove published items of a type whose expiresAt is before today. */
export async function removeExpired(type: ContentType, today: string): Promise<number> {
  const rows = await prisma.contentItem.findMany({ where: { type }, select: { id: true, data: true } })
  const expiredIds = rows
    .filter((r) => {
      const exp = String((r.data as Record<string, unknown>)?.expiresAt ?? "")
      return exp !== "" && exp < today
    })
    .map((r) => r.id)
  if (expiredIds.length === 0) return 0
  await prisma.contentItem.deleteMany({ where: { id: { in: expiredIds } } })
  return expiredIds.length
}

/** Remove published items of a type by href (dead-link cleanup). */
export async function removeByHrefs(type: ContentType, hrefs: string[]): Promise<number> {
  if (hrefs.length === 0) return 0
  const norm = new Set(hrefs.map(normalizeUrl))
  const rows = await prisma.contentItem.findMany({ where: { type }, select: { id: true, href: true, data: true } })
  const ids = rows
    .filter((r) => {
      const h = r.href ? normalizeUrl(r.href) : ""
      const dh = normalizeUrl(String((r.data as Record<string, unknown>)?.href ?? ""))
      return norm.has(h) || norm.has(dh)
    })
    .map((r) => r.id)
  if (ids.length === 0) return 0
  await prisma.contentItem.deleteMany({ where: { id: { in: ids } } })
  return ids.length
}
