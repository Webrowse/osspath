"use client"

import { useState } from "react"
import { enrichNewRepos, rebuildSearchIndex } from "@/lib/admin/actions"

interface ActionState {
  running: boolean
  output: string | null
  error: string | null
}

function useAction(fn: () => Promise<string>) {
  const [state, setState] = useState<ActionState>({ running: false, output: null, error: null })
  function run() {
    if (state.running) return
    setState({ running: true, output: null, error: null })
    fn().then(
      (out) => setState({ running: false, output: out, error: null }),
      (err) => setState({ running: false, output: null, error: String(err) }),
    )
  }
  return { ...state, run }
}

export function MaintenancePanel() {
  const enrich  = useAction(enrichNewRepos)
  const rebuild = useAction(rebuildSearchIndex)

  return (
    <div className="adm-scan-card" id="maintenance" style={{ gridColumn: "1 / -1" }}>
      <div className="adm-scan-card__title">Index Maintenance</div>
      <div className="adm-scan-card__desc">
        Run after approving new OSS repos. <strong>Enrich</strong> fetches Cargo.toml dependencies
        (needed for ecosystem tags). <strong>Rebuild Search</strong> regenerates the search index so
        newly approved repos appear in search. On Railway, both also run automatically at deploy time.
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          className="adm-btn adm-btn--primary"
          onClick={enrich.run}
          disabled={enrich.running || rebuild.running}
        >
          {enrich.running ? "Enriching…" : "Enrich new repos"}
        </button>
        <button
          className="adm-btn adm-btn--primary"
          onClick={rebuild.run}
          disabled={rebuild.running || enrich.running}
        >
          {rebuild.running ? "Rebuilding…" : "Rebuild search index"}
        </button>
      </div>

      {enrich.output && (
        <div className="adm-log" style={{ whiteSpace: "pre-wrap" }}>{enrich.output}</div>
      )}
      {enrich.error && (
        <div className="adm-log" style={{ borderColor: "oklch(0.66 0.18 22 / 0.5)", whiteSpace: "pre-wrap" }}>
          {enrich.error}
        </div>
      )}
      {rebuild.output && (
        <div className="adm-log" style={{ whiteSpace: "pre-wrap" }}>{rebuild.output}</div>
      )}
      {rebuild.error && (
        <div className="adm-log" style={{ borderColor: "oklch(0.66 0.18 22 / 0.5)", whiteSpace: "pre-wrap" }}>
          {rebuild.error}
        </div>
      )}
    </div>
  )
}
