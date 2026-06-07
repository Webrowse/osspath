"use client"

import { useState, useTransition } from "react"
import { addManualPending, extractWithAI } from "@/lib/admin/actions"
import type { ContentType } from "@/lib/admin/types"
import { CONTENT_TYPE_LABELS } from "@/lib/admin/types"

const TYPES: ContentType[] = ["jobs", "oss", "grants", "pulse", "events", "companies"]

const RAW_TEXT_LABELS: Record<ContentType, string> = {
  jobs:      "Job listing text",
  oss:       "GitHub README or repo description",
  grants:    "Grant / bounty description",
  pulse:     "Newsletter or forum post",
  events:    "Event description",
  companies: "Company description",
}

const RAW_TEXT_PLACEHOLDERS: Record<ContentType, string> = {
  jobs:      "Paste the full job listing or HN hiring comment…",
  oss:       "Paste the GitHub README, repo description, or good-first-issue text…",
  grants:    "Paste the grant announcement or bounty description…",
  pulse:     "Paste the newsletter excerpt or forum post…",
  events:    "Paste the event announcement or CFP description…",
  companies: "Paste the company description or About page text…",
}

export function ManualAddForm() {
  const [type, setType]   = useState<ContentType>("jobs")
  const [url, setUrl]     = useState("")
  const [text, setText]   = useState("")
  const [extracting, startExtract] = useTransition()
  const [adding, startAdd] = useTransition()
  const [extracted, setExtracted] = useState<Record<string, unknown> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [added, setAdded] = useState(false)

  function handleExtract() {
    if (!text.trim()) return
    setError(null)
    startExtract(async () => {
      const result = await extractWithAI(type, text)
      if (result.ok && result.data) {
        setExtracted(result.data)
      } else {
        setError(result.error ?? "Extraction failed")
      }
    })
  }

  function handleAdd() {
    startAdd(async () => {
      const data = extracted ?? {}
      await addManualPending(type, url || text.slice(0, 100), data)
      setAdded(true)
      setUrl("")
      setText("")
      setExtracted(null)
    })
  }

  if (added) return (
    <div style={{ color: "var(--fg-2)", fontSize: 12.5, fontFamily: "var(--font-geist-mono)", padding: "8px 0" }}>
      Added to pending queue.{" "}
      <button className="adm-btn adm-btn--ghost" style={{ padding: "2px 8px" }} onClick={() => setAdded(false)}>
        Add another
      </button>
    </div>
  )

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div className="adm-form-row" style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 8 }}>
        <div className="adm-field">
          <label>Content type</label>
          <select
            className="adm-input"
            value={type}
            onChange={(e) => { setType(e.target.value as ContentType); setExtracted(null) }}
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>{CONTENT_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>
        <div className="adm-field">
          <label title="Becomes the 'Source ↗' link on the queue card">Source URL</label>
          <input
            className="adm-input"
            placeholder="https://… (HN thread, GitHub repo, or job listing URL)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>
      </div>

      <div className="adm-field">
        <label>{RAW_TEXT_LABELS[type] ?? "Raw text"}</label>
        <textarea
          className="adm-input adm-textarea"
          placeholder={RAW_TEXT_PLACEHOLDERS[type] ?? "Paste content here…"}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
        />
      </div>

      {error && (
        <div style={{ fontSize: 12, color: "oklch(0.66 0.18 22)", fontFamily: "var(--font-geist-mono)" }}>
          ✗ {error}
        </div>
      )}

      {extracted && (
        <div style={{ background: "var(--bg-0)", border: "1px solid var(--line-soft)", borderRadius: 5, padding: "8px 10px" }}>
          <div style={{ fontSize: 10.5, color: "var(--fg-3)", fontFamily: "var(--font-geist-mono)", marginBottom: 6, letterSpacing: "0.06em", textTransform: "uppercase" }}>
            Extracted
          </div>
          <pre style={{ fontSize: 11.5, color: "var(--fg-1)", margin: 0, whiteSpace: "pre-wrap", fontFamily: "var(--font-geist-mono)" }}>
            {JSON.stringify(extracted, null, 2)}
          </pre>
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button
          className="adm-btn adm-btn--ghost"
          onClick={handleExtract}
          disabled={text.trim().length === 0 || extracting}
        >
          {extracting ? "Extracting…" : "Extract with AI"}
        </button>
        <button
          className="adm-btn adm-btn--primary"
          onClick={handleAdd}
          disabled={(text.trim().length === 0 && extracted === null) || adding}
        >
          {adding ? "Adding…" : "Add to queue →"}
        </button>
      </div>
    </div>
  )
}
