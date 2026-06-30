"use client"

import { useState } from "react"
import {
  scanHNHiring, scanGitHubOSS, scanRustBytes,
  scanGrants, scanPulse, scanEvents, scanPortals, scanCompanies,
  scanTWIR, scanCompanyCareers, scanRedditRust,
} from "@/lib/admin/scanners"
import type { ScanLog } from "@/lib/admin/types"

type ScannerId =
  | "hn" | "github" | "rust-bytes" | "grants" | "pulse"
  | "events" | "portals" | "companies"
  | "twir" | "careers" | "reddit"

interface ScannerPanelProps {
  id: ScannerId
  title: string
  description: string
  source: string
}

export function ScannerPanel({ id, title, description }: ScannerPanelProps) {
  const [log, setLog]       = useState<ScanLog | null>(null)
  const [pending, setPending] = useState(false)

  function run() {
    if (pending) return
    setLog(null)
    setPending(true)

    const scanFn =
      id === "hn"        ? scanHNHiring      :
      id === "rust-bytes"? scanRustBytes     :
      id === "grants"    ? scanGrants        :
      id === "pulse"     ? scanPulse         :
      id === "events"    ? scanEvents        :
      id === "portals"   ? scanPortals       :
      id === "companies" ? scanCompanies     :
      id === "twir"      ? scanTWIR          :
      id === "careers"   ? scanCompanyCareers:
      id === "reddit"    ? scanRedditRust    :
      scanGitHubOSS

    scanFn().then(result => {
      setLog(result)
      setPending(false)
    }).catch(err => {
      setLog({
        source: id,
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
      `Source:   ${l.source}`,
      `Found:    ${l.found}`,
      `Added:    ${l.added}   ← new entries in queue`,
      `Skipped:  ${l.skipped}  ← filtered or duplicates`,
      `Time:     ${duration}`,
    ]

    if (l.stages && Object.keys(l.stages).length > 0) {
      lines.push("", "Pipeline:")
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
    <div className="adm-scan-card" id={id}>
      <div className="adm-scan-card__title">{title}</div>
      <div className="adm-scan-card__desc">{description}</div>

      <button
        className="adm-btn adm-btn--primary"
        onClick={run}
        disabled={pending}
        style={{ alignSelf: "flex-start" }}
      >
        {pending ? "Scanning…" : "Run scan"}
      </button>

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
