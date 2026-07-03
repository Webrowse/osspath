"use client"

import { useState, useTransition } from "react"
import { runEnrichmentBackfill } from "@/lib/pipeline/maintenance-actions"
import type { BackfillProgress } from "@/lib/pipeline/backfill"
import type { RunRow } from "@/lib/admin/pipeline-runs"

interface BackfillPanelProps {
  initialProgress: BackfillProgress | null
  initialActive: RunRow | null
}

export function BackfillPanel({ initialProgress, initialActive }: BackfillPanelProps) {
  const [progress, setProgress] = useState<BackfillProgress | null>(initialProgress)
  const [active, setActive] = useState<RunRow | null>(initialActive)
  const [lastResult, setLastResult] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function runBatch() {
    setLastResult(null)
    start(async () => {
      const res = await runEnrichmentBackfill()
      if (res.started) {
        setProgress(res.result.progress)
        setActive(null)
        setLastResult(
          `Batch done: ${res.result.succeeded} enriched, ${res.result.failed} failed, ${res.result.processed} processed`,
        )
      } else {
        setActive(res.active)
      }
    })
  }

  const done = progress ? progress.remaining === 0 : false

  return (
    <div className="adm-content" style={{ maxWidth: 640 }}>
      {progress ? (
        <>
          <div className="adm-page-meta" style={{ marginBottom: 10 }}>
            Enrichment v{progress.version}: {progress.enriched} / {progress.total} repos enriched
            {" "}({progress.remaining} remaining)
          </div>

          <button className="adm-btn adm-btn--primary" onClick={runBatch} disabled={pending || done || !!active}>
            {pending ? "Enriching..." : done ? "All repos enriched" : "Run backfill batch"}
          </button>

          {active && (
            <div className="adm-db-warn" style={{ marginLeft: 0, marginTop: 12 }}>
              A pipeline run (Refresh or backfill) is already in progress. Try again shortly.
            </div>
          )}

          {lastResult && <div className="adm-log" style={{ marginTop: 12 }}>{lastResult}</div>}

          <div className="adm-log" style={{ marginTop: 12 }}>
            {"Each batch enriches up to 100 repos and can be re-run until 0 remain.\n"}
            {"A repo is re-selected when its enrichment version is behind, or its\n"}
            {"source pushedAt changed. Failed repos back off for 6 hours before retry."}
          </div>
        </>
      ) : (
        <div className="adm-db-warn" style={{ marginLeft: 0 }}>DB unreachable - enrichment progress unavailable</div>
      )}
    </div>
  )
}
