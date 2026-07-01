"use client"

import { useState, useTransition } from "react"
import { addListEntry, removeListEntry } from "@/lib/admin/list-actions"
import type { ListEntryRow, ListKind, ListTarget } from "@/lib/admin/lists"

const TARGETS: ListTarget[] = ["url", "domain", "org", "repo", "company", "topic", "keyword", "author"]

export function ListsManager({ entries }: { entries: ListEntryRow[] }) {
  const [pending, start] = useTransition()
  const [form, setForm] = useState({ kind: "block" as ListKind, target: "domain" as ListTarget, value: "", reason: "" })

  const block = entries.filter((e) => e.kind === "block")
  const allow = entries.filter((e) => e.kind === "allow")

  function submit() {
    if (!form.value.trim()) return
    start(async () => {
      await addListEntry({ kind: form.kind, target: form.target, value: form.value.trim(), reason: form.reason.trim() || undefined })
      setForm({ ...form, value: "", reason: "" })
    })
  }

  function group(title: string, rows: ListEntryRow[]) {
    return (
      <div className="adm-list-group">
        <div className="adm-list-group__title">{title} ({rows.length})</div>
        {rows.length === 0 ? (
          <div className="adm-list-empty">none</div>
        ) : rows.map((e) => (
          <div key={e.id} className="adm-list-row">
            <span className="adm-list-row__target">{e.target}</span>
            <span className="adm-list-row__value">{e.value}</span>
            {e.reason && <span className="adm-list-row__reason">{e.reason}</span>}
            {e.source === "reviewer" && <span className="adm-list-row__auto">auto</span>}
            <button className="adm-btn adm-btn--ghost" onClick={() => start(() => removeListEntry(e.id))} disabled={pending} title="Remove">✕</button>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div>
      <div className="adm-src-add">
        <select className="adm-select" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as ListKind })}>
          <option value="block">block</option>
          <option value="allow">allow</option>
        </select>
        <select className="adm-select" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value as ListTarget })}>
          {TARGETS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <input className="adm-input" placeholder="value (e.g. spam.com or owner/repo)" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} style={{ flex: 1, minWidth: 180 }} />
        <input className="adm-input" placeholder="reason (optional)" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
        <button className="adm-btn adm-btn--primary" onClick={submit} disabled={pending || !form.value.trim()}>Add</button>
      </div>

      {group("Blocklist", block)}
      {group("Allowlist", allow)}
    </div>
  )
}
