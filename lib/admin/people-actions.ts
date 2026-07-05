"use server"

import { revalidatePath } from "next/cache"
import { requireAdmin } from "./require-admin"
import { readContent, writeContent } from "./storage"
import { recordAudit } from "./audit"

/**
 * People directory actions over the published "authors" content type.
 * Purpose-built rather than the generic Published CRUD: the form speaks the
 * directory's language (GitHub handle, blog, expertise) and every change is
 * audited. Items are identified by GitHub handle (fallback: name).
 */

export type PersonInput = {
  name: string
  handle: string      // GitHub username
  href: string        // personal website
  writing: string     // blog / writing URL
  description: string
  tags: string[]      // expertise: async, compiler, embedded, systems, ...
}

function personKey(p: { handle?: unknown; name?: unknown }): string {
  return String(p.handle || p.name || "").toLowerCase()
}

function clean(input: PersonInput): Record<string, unknown> {
  const name = input.name.trim()
  if (!name) throw new Error("Name is required")
  return {
    name,
    handle: input.handle.trim().replace(/^@/, ""),
    href: input.href.trim(),
    writing: input.writing.trim(),
    description: input.description.trim(),
    tags: input.tags.map((t) => t.trim().toLowerCase()).filter(Boolean),
    checkedAt: new Date().toISOString().slice(0, 10),
  }
}

export async function upsertPerson(input: PersonInput, originalKey?: string) {
  await requireAdmin()
  const item = clean(input)
  const items = await readContent("authors")
  const key = originalKey?.toLowerCase() || personKey(item)
  const idx = items.findIndex((p) => personKey(p) === key)

  if (idx >= 0) {
    const before = items[idx]
    items[idx] = { ...before, ...item }
    await writeContent("authors", items)
    await recordAudit({ action: "person.update", target: personKey(item), changes: { from: before, to: items[idx] } })
  } else {
    items.push(item)
    await writeContent("authors", items)
    await recordAudit({ action: "person.add", target: personKey(item), changes: { added: item } })
  }
  revalidatePath("/admin/people")
}

export async function deletePerson(key: string, reason?: string) {
  await requireAdmin()
  const items = await readContent("authors")
  const idx = items.findIndex((p) => personKey(p) === key.toLowerCase())
  if (idx < 0) return
  const [removed] = items.splice(idx, 1)
  await writeContent("authors", items)
  await recordAudit({ action: "person.remove", target: key.toLowerCase(), changes: { removed }, reason })
  revalidatePath("/admin/people")
}
