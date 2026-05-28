"use client"

import { useState, useTransition } from "react"
import { scanHNHiring, scanTWIR, scanGitHubOSS } from "@/lib/admin/scanners"
import type { ScanLog } from "@/lib/admin/types"

interface ScannerPanelProps {
  id: "hn" | "twir" | "github"
  title: string
  description: string
  source: string
}

export function ScannerPanel({ id, title, description }: ScannerPanelProps) {
  const [log, setLog]       = useState<ScanLog | null>(null)
  const [useAI, setUseAI]   = useState(false)
  const [pending, start]    = useTransition()

  function run() {
    setLog(null)
    start(async () => {
      let result: ScanLog
      if (id === "hn")         result = await scanHNHiring(useAI)
      else if (id === "twir")  result = await scanTWIR(useAI)
      else                     result = await scanGitHubOSS()
      setLog(result)
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

      {id !== "github" && (
        <label style={{
          display: "flex", alignItems: "center", gap: 7,
          fontSize: 12, color: "var(--fg-2)", cursor: "pointer",
        }}>
          <input
            type="checkbox"
            checked={useAI}
            onChange={(e) => setUseAI(e.target.checked)}
            style={{ accentColor: "oklch(0.62 0.14 42)" }}
          />
          Use DeepSeek AI extraction
          <span style={{ color: "var(--fg-3)", fontSize: 11, fontFamily: "var(--font-geist-mono)" }}>
            (test key at <a href="/admin/test-deepseek" style={{ color: "oklch(0.62 0.14 42)" }}>/admin/test-deepseek</a>)
          </span>
        </label>
      )}

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
