"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { approveAll, rejectAll } from "@/lib/admin/actions"
import type { ContentType } from "@/lib/admin/types"

interface BulkActionsProps {
  contentType: ContentType
  count: number
}

export function BulkActions({ contentType, count }: BulkActionsProps) {
  const [confirmReject, setConfirmReject] = useState(false)
  const [approvingAll, startApprove] = useTransition()
  const [rejectingAll, startReject] = useTransition()
  const router = useRouter()

  if (count === 0) return null

  function handleApproveAll() {
    startApprove(async () => {
      await approveAll(contentType)
      router.refresh()
    })
  }

  function handleRejectAll() {
    if (!confirmReject) { setConfirmReject(true); return }
    startReject(async () => {
      await rejectAll(contentType)
      setConfirmReject(false)
      router.refresh()
    })
  }

  const busy = approvingAll || rejectingAll

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <button
        className="adm-btn adm-btn--approve"
        onClick={handleApproveAll}
        disabled={busy}
        style={{ fontSize: 12 }}
      >
        {approvingAll ? "Publishing all…" : `Approve all ${count}`}
      </button>

      {confirmReject ? (
        <>
          <span style={{ fontSize: 11.5, color: "var(--fg-3)", fontFamily: "var(--font-geist-mono)" }}>
            Reject all {count} permanently?
          </span>
          <button
            className="adm-btn adm-btn--reject"
            onClick={handleRejectAll}
            disabled={busy}
            style={{ fontSize: 12 }}
          >
            {rejectingAll ? "Rejecting…" : "Yes, reject all"}
          </button>
          <button
            className="adm-btn adm-btn--ghost"
            onClick={() => setConfirmReject(false)}
            disabled={busy}
            style={{ fontSize: 12 }}
          >
            Cancel
          </button>
        </>
      ) : (
        <button
          className="adm-btn adm-btn--reject"
          onClick={handleRejectAll}
          disabled={busy}
          style={{ fontSize: 12 }}
        >
          Reject all {count}
        </button>
      )}
    </div>
  )
}
