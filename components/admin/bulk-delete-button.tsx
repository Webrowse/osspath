"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { deleteAllPublished } from "@/lib/admin/actions"
import type { ContentType } from "@/lib/admin/types"

interface BulkDeleteButtonProps {
  contentType: ContentType
  count: number
}

export function BulkDeleteButton({ contentType, count }: BulkDeleteButtonProps) {
  const [confirm, setConfirm] = useState(false)
  const [pending, start] = useTransition()
  const router = useRouter()

  if (count === 0) return null

  function handleDelete() {
    if (!confirm) { setConfirm(true); return }
    start(async () => {
      await deleteAllPublished(contentType)
      setConfirm(false)
      router.refresh()
    })
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {confirm && (
        <>
          <span style={{ fontSize: 11.5, color: "var(--fg-3)", fontFamily: "var(--font-geist-mono)" }}>
            Remove all {count} from site?
          </span>
          <button
            className="adm-btn adm-btn--ghost"
            onClick={() => setConfirm(false)}
            disabled={pending}
            style={{ fontSize: 12 }}
          >
            Cancel
          </button>
        </>
      )}
      <button
        className="adm-btn adm-btn--reject"
        onClick={handleDelete}
        disabled={pending}
        style={{ fontSize: 12 }}
      >
        {pending ? "Removing…" : confirm ? `Yes, remove all ${count}` : `Remove all ${count}`}
      </button>
    </div>
  )
}
