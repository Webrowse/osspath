"use client"

import { useTransition } from "react"
import { deletePublished } from "@/lib/admin/actions"
import type { ContentType } from "@/lib/admin/types"

export function DeleteButton({ contentType, index }: { contentType: ContentType; index: number }) {
  const [pending, startTransition] = useTransition()

  function handleDelete() {
    if (!confirm("Remove this entry from the public site?")) return
    startTransition(() => deletePublished(contentType, index))
  }

  return (
    <button
      className="adm-btn adm-btn--danger"
      style={{ padding: "2px 7px", fontSize: 11 }}
      onClick={handleDelete}
      disabled={pending}
    >
      {pending ? "…" : "Remove"}
    </button>
  )
}
