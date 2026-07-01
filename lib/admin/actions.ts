"use server"

import { revalidatePath } from "next/cache"
import { readContent, writeContent, removeContent } from "./storage"
import { requireAdmin } from "./require-admin"
import type { ContentType } from "./types"

/**
 * Published-content actions used by the admin Published page. The scan/approve
 * workflow is gone; content is produced by the pipeline. These actions cover
 * manual curation: removing or editing already-published items.
 */

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
