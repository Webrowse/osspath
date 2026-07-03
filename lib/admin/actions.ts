"use server"

import { revalidatePath } from "next/cache"
import { readContent, writeContent, removeContent } from "./storage"
import { requireAdmin } from "./require-admin"
import type { ContentType } from "./types"

/**
 * Published-content actions used by the admin Published page. Pipeline-scanned
 * types (jobs, oss, ...) get new items from the scanner; purely editorial types
 * (authors, ...) have no scanner, so createPublished is their only way to gain
 * a new item. Generic over every ContentType either way.
 */

export async function createPublished(type: ContentType, data: Record<string, unknown>) {
  await requireAdmin()
  const items = await readContent(type)
  const stamped = { ...data, checkedAt: new Date().toISOString().split("T")[0] }
  await writeContent(type, [...items, stamped])
  revalidatePath("/admin/published")
  revalidatePath("/")
}

export async function deletePublished(type: ContentType, index: number) {
  await requireAdmin()
  await removeContent(type, index)
  revalidatePath("/admin/published")
  revalidatePath("/")
}

export async function deleteAllPublished(type: ContentType) {
  await requireAdmin()
  await writeContent(type, [])
  revalidatePath("/admin/published")
  revalidatePath("/")
}

export async function updatePublished(
  type: ContentType,
  index: number,
  patch: Record<string, unknown>,
) {
  await requireAdmin()
  const items = await readContent(type)
  if (index < 0 || index >= items.length) throw new Error("Index out of range")
  const updated = items.map((item, i) =>
    i === index ? { ...item, ...patch, checkedAt: new Date().toISOString().split("T")[0] } : item,
  )
  await writeContent(type, updated)
  revalidatePath("/admin/published")
  revalidatePath("/")
}
