"use client"

import { useState } from "react"
import { scanVerifyQueue } from "@/lib/admin/scanners"
import type { ScanLog } from "@/lib/admin/types"
import type { ContentType } from "@/lib/admin/types"

const TYPES: { value: ContentType; label: string }[] = [
  { value: "jobs",      label: "Jobs" },
  { value: "oss",       label: "OSS Repos" },
  { value: "grants",    label: "Funding" },
  { value: "pulse",     label: "Pulse" },
  { value: "events",    label: "Events" },
  { value: "companies", label: "Companies" },
  { value: "portals",   label: "Job Portals" },
]

export function VerifyPanel() {
  const [type, setType]       = useState<ContentType>("jobs")
  const [log, setLog]         = useState<ScanLog | null>(null)
  const [pending, setPending] = useState(false)

  function run() {
    if (pending) return
    setLog(null)
    setPending(true)
    scanVerifyQueue(type).then(result => {
      setLog(result)
      setPending(false)
    }).catch(err => {
      setLog({
        source: `verify-${type}`,
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        found: 0, added: 0, skipped: 0,
        errors: [String(err)],
      })
      setPending(false)
    })
  }

  function formatLog(l: ScanLog): string {
    const duration = l.finishedAt
      ? `${Math.round((new Date(l.finishedAt).getTime() - new Date(l.startedAt).getTime()) / 1000)}s`
      : "…"
    const lines = [
      `Source:     ${l.source}`,
      `Checked:    ${l.found}`,
      `Confirmed:  ${l.added}   ← live + Rust found`,
      `Dead/Moved: ${l.skipped}  ← bad links (flagged _verified:false)`,
      `Time:       ${duration}`,
    ]
    if (l.stages && Object.keys(l.stages).length > 0) {
      lines.push("", "Breakdown:")
      for (const [k, v] of Object.entries(l.stages)) {
        lines.push(`  ${k.padEnd(22)} ${v}`)
      }
    }
    if (l.notes && l.notes.length > 0) {
      lines.push("", "Notes:")
      l.notes.forEach((n) => lines.push(`  • ${n}`))
    }
    if (l.errors.length > 0) {
      lines.push("", `ERRORS (${l.errors.length}):`)
      l.errors.forEach((e) => lines.push(`  ✗ ${e}`))
    }
    return lines.join("\n")
  }

  const hasErrors = log && log.errors.length > 0

  return (
    <div className="adm-scan-card" id="verify">
      <div className="adm-scan-card__title">Verify Pending Queue</div>
      <div className="adm-scan-card__desc">
        Fetches every pending item&apos;s URL, checks it returns 200 and still mentions Rust.
        Dead links are flagged with <code>_verified:false</code> so you can bulk-reject them.
        If a DeepSeek key is set, also re-extracts blank fields from the live page.
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as ContentType)}
          disabled={pending}
          className="adm-select"
        >
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <button
          className="adm-btn adm-btn--primary"
          onClick={run}
          disabled={pending}
        >
          {pending ? "Verifying…" : "Run verify"}
        </button>
      </div>

      {log && (
        <div
          className="adm-log"
          style={hasErrors ? { borderColor: "oklch(0.66 0.18 22 / 0.5)" } : {}}
        >
          {formatLog(log)}
        </div>
      )}
    </div>
  )
}
