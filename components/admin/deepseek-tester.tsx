"use client"

import { useState, useTransition } from "react"
import { runDeepSeekDiagnostic } from "@/lib/admin/actions"

export function DeepSeekTester() {
  const [result, setResult] = useState<string | null>(null)
  const [running, start] = useTransition()

  function handleTest() {
    start(async () => {
      const r = await runDeepSeekDiagnostic()
      setResult(r)
    })
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 640 }}>
      <div style={{ fontSize: 12.5, color: "var(--fg-2)", lineHeight: 1.6 }}>
        Sends a minimal request to DeepSeek API and shows the raw result.
        Use this to confirm API key, endpoint, and model are working before running scans.
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button
          className="adm-btn adm-btn--primary"
          onClick={handleTest}
          disabled={running}
        >
          {running ? "Testing…" : "Send test request"}
        </button>
      </div>

      {result && (
        <div
          className="adm-log"
          style={{ maxHeight: "none", whiteSpace: "pre-wrap", wordBreak: "break-word" }}
        >
          {result}
        </div>
      )}
    </div>
  )
}
