"use client"

import { useState } from "react"
import { updatePublished } from "@/lib/admin/actions"
import { ContentItemForm } from "@/components/admin/content-item-form"
import type { ContentType } from "@/lib/admin/types"

interface EditPublishedButtonProps {
  contentType: ContentType
  index: number
  item: Record<string, unknown>
}

export function EditPublishedButton({ contentType, index, item }: EditPublishedButtonProps) {
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <button
        className="adm-btn adm-btn--ghost"
        style={{ padding: "2px 7px", fontSize: 11 }}
        onClick={() => setOpen(true)}
      >
        Edit
      </button>
    )
  }

  return (
    <ContentItemForm
      contentType={contentType}
      title="Edit entry"
      initial={item}
      onClose={() => setOpen(false)}
      onSave={async (patch) => {
        await updatePublished(contentType, index, patch)
        setOpen(false)
      }}
    />
  )
}
