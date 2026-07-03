"use client"

import { useState, useTransition } from "react"
import { setEcoOverride, removeEcoOverride } from "@/lib/admin/override-actions"
import { ECO_TAG_ORDER } from "@/lib/eco-tags"
import type { OverrideRow } from "@/lib/admin/overrides"

export function EcoOverridesManager({ rows }: { rows: OverrideRow[] }) {
  const [pending, start] = useTransition()
  const [form, setForm] = useState({ repo: "", tags: "" })
  const [error, setError] = useState<string | null>(null)

  function submit() {
    if (!form.repo.trim() || !form.tags.trim()) return
    setError(null)
    start(async () => {
      try {
        await setEcoOverride(form.repo.trim(), form.tags.split(",").map((t) => t.trim()))
        setForm({ repo: "", tags: "" })
      } catch (e) {
        setError((e as Error).message)
      }
    })
  }

  return (
    <div>
      <p className="adm-page-meta" style={{ marginBottom: 10 }}>
        Manual ecosystem-tag corrections, keyed by repo. Checked before the automatic classifier - use only for
        confirmed mis-classifications. Valid tags: {ECO_TAG_ORDER.join(", ")}.
      </p>

      <div className="adm-src-add">
        <input
          className="adm-input"
          placeholder="owner/repo"
          value={form.repo}
          onChange={(e) => setForm({ ...form, repo: e.target.value })}
          style={{ flex: 1, minWidth: 180 }}
        />
        <input
          className="adm-input"
          placeholder="tags, comma-separated (e.g. embedded, wasm)"
          value={form.tags}
          onChange={(e) => setForm({ ...form, tags: e.target.value })}
          style={{ flex: 1, minWidth: 220 }}
        />
        <button className="adm-btn adm-btn--primary" onClick={submit} disabled={pending || !form.repo.trim() || !form.tags.trim()}>
          Add
        </button>
      </div>
      {error && <div className="adm-db-warn" style={{ marginLeft: 0, marginBottom: 10 }}>{error}</div>}

      <div className="adm-list-group">
        <div className="adm-list-group__title">Eco-tag overrides ({rows.length})</div>
        {rows.length === 0 ? (
          <div className="adm-list-empty">none</div>
        ) : rows.map((r) => (
          <div key={r.id} className="adm-list-row">
            <span className="adm-list-row__target">{r.key}</span>
            <span className="adm-list-row__value">{(r.data as string[]).join(", ")}</span>
            <button
              className="adm-btn adm-btn--ghost"
              onClick={() => start(() => removeEcoOverride(r.key))}
              disabled={pending}
              title="Remove"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
