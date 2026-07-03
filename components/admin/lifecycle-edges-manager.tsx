"use client"

import { useState, useTransition } from "react"
import { setLifecycleEdge, removeLifecycleEdge, type LifecycleEdgeInput } from "@/lib/admin/override-actions"
import type { OverrideRow } from "@/lib/admin/overrides"

const EDGE_TYPES: LifecycleEdgeInput["edge_type"][] = ["acquired_by", "merged_into", "renamed_to"]

const EMPTY: LifecycleEdgeInput = { edge_type: "acquired_by", from_slug: "", to_slug: "", effective_date: "", source: "" }

export function LifecycleEdgesManager({ rows }: { rows: OverrideRow[] }) {
  const [pending, start] = useTransition()
  const [form, setForm] = useState<LifecycleEdgeInput>(EMPTY)
  const [error, setError] = useState<string | null>(null)

  function submit() {
    if (!form.from_slug.trim() || !form.to_slug.trim()) return
    setError(null)
    start(async () => {
      try {
        await setLifecycleEdge(form)
        setForm(EMPTY)
      } catch (e) {
        setError((e as Error).message)
      }
    })
  }

  return (
    <div>
      <p className="adm-page-meta" style={{ marginBottom: 10 }}>
        Tracked organization/repo lifecycle events - acquisitions, mergers, renames. from_slug and to_slug are
        org or company slugs.
      </p>

      <div className="adm-src-add">
        <input
          className="adm-input"
          placeholder="from_slug (e.g. astral)"
          value={form.from_slug}
          onChange={(e) => setForm({ ...form, from_slug: e.target.value })}
          style={{ minWidth: 140 }}
        />
        <select
          className="adm-select"
          value={form.edge_type}
          onChange={(e) => setForm({ ...form, edge_type: e.target.value as LifecycleEdgeInput["edge_type"] })}
        >
          {EDGE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <input
          className="adm-input"
          placeholder="to_slug (e.g. openai)"
          value={form.to_slug}
          onChange={(e) => setForm({ ...form, to_slug: e.target.value })}
          style={{ minWidth: 140 }}
        />
        <input
          className="adm-input"
          placeholder="effective date (YYYY-MM-DD)"
          value={form.effective_date}
          onChange={(e) => setForm({ ...form, effective_date: e.target.value })}
          style={{ minWidth: 160 }}
        />
        <input
          className="adm-input"
          placeholder="source URL"
          value={form.source}
          onChange={(e) => setForm({ ...form, source: e.target.value })}
          style={{ flex: 1, minWidth: 180 }}
        />
        <button className="adm-btn adm-btn--primary" onClick={submit} disabled={pending || !form.from_slug.trim() || !form.to_slug.trim()}>
          Add
        </button>
      </div>
      {error && <div className="adm-db-warn" style={{ marginLeft: 0, marginBottom: 10 }}>{error}</div>}

      <div className="adm-list-group">
        <div className="adm-list-group__title">Lifecycle edges ({rows.length})</div>
        {rows.length === 0 ? (
          <div className="adm-list-empty">none</div>
        ) : rows.map((r) => {
          const edge = r.data as LifecycleEdgeInput
          return (
            <div key={r.id} className="adm-list-row">
              <span className="adm-list-row__target">{edge.from_slug} → {edge.edge_type} → {edge.to_slug}</span>
              <span className="adm-list-row__value">{edge.effective_date}</span>
              {edge.source && (
                <a href={edge.source} target="_blank" rel="noopener noreferrer" className="adm-list-row__reason">
                  source ↗
                </a>
              )}
              <button
                className="adm-btn adm-btn--ghost"
                onClick={() => start(() => removeLifecycleEdge(r.key))}
                disabled={pending}
                title="Remove"
              >
                ✕
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
