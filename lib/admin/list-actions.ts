"use server"

import { revalidatePath } from "next/cache"
import { requireAdmin } from "./require-admin"
import { addEntry, removeEntry, type ListKind, type ListTarget } from "./lists"

export async function addListEntry(input: {
  kind: ListKind
  target: ListTarget
  value: string
  reason?: string
}) {
  await requireAdmin()
  if (!input.value.trim()) return
  await addEntry({ ...input, source: "manual" })
  revalidatePath("/admin/lists")
}

export async function removeListEntry(id: string) {
  await requireAdmin()
  await removeEntry(id)
  revalidatePath("/admin/lists")
}
