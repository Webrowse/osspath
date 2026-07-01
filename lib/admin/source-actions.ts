"use server"

import { revalidatePath } from "next/cache"
import { requireAdmin } from "./require-admin"
import { createSource, updateSource, deleteSource, type SourceInput } from "./sources"

export async function addSource(input: SourceInput) {
  await requireAdmin()
  await createSource(input)
  revalidatePath("/admin/sources")
}

export async function setSourceEnabled(id: string, enabled: boolean) {
  await requireAdmin()
  await updateSource(id, { enabled })
  revalidatePath("/admin/sources")
}

export async function setSourceInterval(id: string, intervalHours: number) {
  await requireAdmin()
  await updateSource(id, { intervalHours })
  revalidatePath("/admin/sources")
}

export async function removeSource(id: string) {
  await requireAdmin()
  await deleteSource(id)
  revalidatePath("/admin/sources")
}
