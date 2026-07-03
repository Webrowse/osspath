"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createPublished } from "@/lib/admin/actions"
import { ContentItemForm } from "@/components/admin/content-item-form"
import { CONTENT_SCHEMA } from "@/lib/admin/content-schema"
import type { ContentType } from "@/lib/admin/types"

interface AddPublishedButtonProps {
  contentType: ContentType
}

export function AddPublishedButton({ contentType }: AddPublishedButtonProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  if (!open) {
    return (
      <button className="adm-btn adm-btn--ghost" onClick={() => setOpen(true)}>
        + Add
      </button>
    )
  }

  return (
    <ContentItemForm
      contentType={contentType}
      title={`Add ${CONTENT_SCHEMA[contentType].label} entry`}
      onClose={() => setOpen(false)}
      onSave={async (patch) => {
        await createPublished(contentType, patch)
        setOpen(false)
        router.refresh()
      }}
    />
  )
}
