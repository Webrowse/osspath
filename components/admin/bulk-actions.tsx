"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { approveAllBatch, rejectAllBatch } from "@/lib/admin/actions"
import type { ContentType, PendingItem } from "@/lib/admin/types"

const BATCH = 50

interface BulkActionsProps {
  contentType: ContentType
  items: PendingItem[]
}

export function BulkActions({ contentType, items }: BulkActionsProps) {
  const [confirmReject, setConfirmReject] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number; label: string } | null>(null)
  const router = useRouter()

  const busy = progress !== null
  const count = items.length
  if (count === 0) return null

  async function handleApproveAll() {
    if (busy) return
    const ids = items.map(i => i.id)
    setProgress({ done: 0, total: ids.length, label: "Publishing" })

    let done = 0
    for (let i = 0; i < ids.length; i += BATCH) {
      const chunk = ids.slice(i, i + BATCH)
      const res = await approveAllBatch(contentType, chunk)
      done += res.approved
      setProgress({ done, total: ids.length, label: "Publishing" })
    }

    setProgress(null)
    router.refresh()
  }

  async function handleRejectAll() {
    if (!confirmReject) { setConfirmReject(true); return }
    if (busy) return
    const ids = items.map(i => i.id)
    setProgress({ done: 0, total: ids.length, label: "Rejecting" })

    let done = 0
    for (let i = 0; i < ids.length; i += BATCH) {
      const chunk = ids.slice(i, i + BATCH)
      const res = await rejectAllBatch(contentType, chunk)
      done += res.rejected
      setProgress({ done, total: ids.length, label: "Rejecting" })
    }

    setProgress(null)
    setConfirmReject(false)
    router.refresh()
  }

  if (progress) {
    const pct = Math.round((progress.done / progress.total) * 100)
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div className="adm-progress">
          <div className="adm-progress__bar" style={{ width: `${pct}%` }} />
        </div>
        <span className="adm-progress__label">
          {progress.label} {progress.done} / {progress.total}
        </span>
      </div>
    )
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <button
        className="adm-btn adm-btn--approve"
        onClick={handleApproveAll}
        disabled={busy}
        style={{ fontSize: 12 }}
      >
        Approve all {count}
      </button>

      {confirmReject ? (
        <>
          <span style={{ fontSize: 11.5, color: "var(--fg-3)", fontFamily: "var(--font-geist-mono)" }}>
            Reject all {count}?
          </span>
          <button className="adm-btn adm-btn--reject" onClick={handleRejectAll} disabled={busy} style={{ fontSize: 12 }}>
            Yes, reject all
          </button>
          <button className="adm-btn adm-btn--ghost" onClick={() => setConfirmReject(false)} disabled={busy} style={{ fontSize: 12 }}>
            Cancel
          </button>
        </>
      ) : (
        <button className="adm-btn adm-btn--reject" onClick={handleRejectAll} disabled={busy} style={{ fontSize: 12 }}>
          Reject all {count}
        </button>
      )}
    </div>
  )
}
