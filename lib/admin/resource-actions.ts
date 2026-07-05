"use server"

import { revalidatePath } from "next/cache"
import { requireAdmin } from "./require-admin"
import { readContent, writeContent } from "./storage"
import { recordAudit } from "./audit"
import type { ContentType } from "./types"

/**
 * Resource library actions. Each edit routes to the underlying content type
 * (pulse / learning / portals / grants / events) so the public snapshots keep
 * their existing shapes; the admin just stops caring which bucket a link
 * lives in. Identity is href within its type.
 */

const RESOURCE_TYPES: ContentType[] = ["pulse", "learning", "portals", "grants", "events"]

export type ResourceInput = {
  type: ContentType
  title: string
  href: string
  kind: string
  description: string
  tags: string[]
  meta: string // events: "12 March" style date; grants: status
}

function assertType(type: ContentType) {
  if (!RESOURCE_TYPES.includes(type)) throw new Error(`Not a resource type: ${type}`)
}

/** Project the normalised form back into the type's stored field names. */
function denormalize(input: ResourceInput): Record<string, unknown> {
  const title = input.title.trim()
  const href = input.href.trim()
  if (!title) throw new Error("Title is required")
  if (!href) throw new Error("URL is required")
  const description = input.description.trim()
  const kind = input.kind.trim()
  const checkedAt = new Date().toISOString().slice(0, 10)

  switch (input.type) {
    case "pulse":
    case "learning":
      return { title, href, kind, description, checkedAt }
    case "portals":
      return { name: title, href, kind, description, tags: input.tags.map((t) => t.trim()).filter(Boolean) }
    case "grants":
      return { name: title, href, kind, description, status: input.meta.trim() || "open" }
    case "events": {
      const [day, ...rest] = input.meta.trim().split(/\s+/)
      return { title, href, meta: description, day: day ?? "", month: rest.join(" "), expiresAt: "" }
    }
    default:
      throw new Error(`Not a resource type: ${input.type}`)
  }
}

export async function upsertResource(input: ResourceInput, originalHref?: string) {
  await requireAdmin()
  assertType(input.type)
  const item = denormalize(input)
  const items = await readContent(input.type)
  const key = (originalHref ?? input.href).trim()
  const idx = items.findIndex((r) => String(r.href ?? "") === key)

  if (idx >= 0) {
    const before = items[idx]
    items[idx] = { ...before, ...item }
    await writeContent(input.type, items)
    await recordAudit({ action: "resource.update", target: input.href.trim(), changes: { type: input.type, from: before, to: items[idx] } })
  } else {
    items.push(item)
    await writeContent(input.type, items)
    await recordAudit({ action: "resource.add", target: input.href.trim(), changes: { type: input.type, added: item } })
  }
  revalidatePath("/admin/resources")
}

export async function deleteResource(type: ContentType, href: string, reason?: string) {
  await requireAdmin()
  assertType(type)
  const items = await readContent(type)
  const idx = items.findIndex((r) => String(r.href ?? "") === href)
  if (idx < 0) return
  const [removed] = items.splice(idx, 1)
  await writeContent(type, items)
  await recordAudit({ action: "resource.remove", target: href, changes: { type, removed }, reason })
  revalidatePath("/admin/resources")
}
