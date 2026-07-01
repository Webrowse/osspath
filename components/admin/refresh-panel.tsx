"use client"

import { useState, useTransition } from "react"
import { runRefresh, unlockPipeline } from "@/lib/pipeline/actions"
import type { RunRow } from "@/lib/admin/pipeline-runs"

function fmt(d: Date | string | null): string {
  if (!d) return "—"
  const date = typeof d === "string" ? new Date(d) : d
  return date.toLocaleString()
}

function ReportSummary({ run }: { run: RunRow }) {
  const r = run.report
  if (!r) return <div className="adm-log">No report.</div>
  const added = Object.entries(r.added).filter(([, n]) => n > 0)
  const removed = Object.entries(r.removed).filter(([, n]) => n > 0)
  const lines = [
    `Status:    ${run.status}${run.dirty ? " · published content changed" : ""}`,
    `Finished:  ${fmt(run.finishedAt)}`,
    "",
    `Scanned:   ${r.scanned}`,
    `Blocked:   ${r.blocked}`,
    `Verified:  ${r.verified}`,
    `Reviewed:  ${r.reviewed}`,
    `Published: ${r.published}`,
    `Skipped:   ${r.skipped}`,
    added.length ? `Added:     ${added.map(([t, n]) => `${t}:${n}`).join("  ")}` : "",
    removed.length ? `Removed:   ${removed.map(([t, n]) => `${t}:${n}`).join("  ")}` : "",
  ]
  if (r.errors.length) {
    lines.push("", `Errors (${r.errors.length}):`)
    r.errors.slice(0, 8).forEach((e) => lines.push(`  ✗ ${e}`))
  }
  return <div className="adm-log">{lines.filter((l) => l !== "" || true).join("\n")}</div>
}

interface RefreshPanelProps {
  initialActive: RunRow | null
  initialLatest: RunRow | null
}

export function RefreshPanel({ initialActive, initialLatest }: RefreshPanelProps) {
  const [latest, setLatest] = useState<RunRow | null>(initialLatest)
  const [active, setActive] = useState<RunRow | null>(initialActive)
  const [blocked, setBlocked] = useState(false)
  const [pending, start] = useTransition()

  function refresh() {
    setBlocked(false)
    start(async () => {
      const res = await runRefresh()
      if (res.started) { setLatest(res.run); setActive(null) }
      else { setActive(res.active); setBlocked(true) }
    })
  }

  function unlock() {
    start(async () => {
      await unlockPipeline()
      setActive(null)
      setBlocked(false)
    })
  }

  return (
    <div className="adm-content" style={{ maxWidth: 640 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <button className="adm-btn adm-btn--primary" onClick={refresh} disabled={pending}>
          {pending ? "Running…" : "Refresh"}
        </button>
        {(active || blocked) && (
          <button className="adm-btn adm-btn--ghost" onClick={unlock} disabled={pending}>
            Force unlock
          </button>
        )}
      </div>

      {blocked && active && (
        <div className="adm-db-warn" style={{ marginLeft: 0 }}>
          A run is already in progress (started {fmt(active.startedAt)}). Try again shortly.
        </div>
      )}

      {latest ? (
        <>
          <div className="adm-page-meta" style={{ marginBottom: 6 }}>Last run</div>
          <ReportSummary run={latest} />
        </>
      ) : (
        <div className="adm-log">No runs yet. Press Refresh to run the pipeline.</div>
      )}
    </div>
  )
}
