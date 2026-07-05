"use client"

import { useState, useTransition } from "react"
import type { ContentType } from "@/lib/admin/types"
import type { ResourceRow, ResourceCategory } from "@/lib/admin/resources"
import { upsertResource, deleteResource } from "@/lib/admin/resource-actions"

const TYPE_LABEL: Partial<Record<ContentType, string>> = {
  pulse: "Stay Updated (pulse)",
  learning: "Learning",
  portals: "Job board",
  grants: "Funding",
  events: "Event",
}

type FormState = {
  type: ContentType
  title: string
  href: string
  kind: string
  description: string
  tags: string
  meta: string
}

export function ResourcesManager({
  category, rows, types, kinds,
}: {
  category: ResourceCategory
  rows: ResourceRow[]
  types: ContentType[]
  kinds: string[]
}) {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  // null = closed, "" = adding, otherwise href being edited
  const [editing, setEditing] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>({ type: types[0], title: "", href: "", kind: kinds[0] ?? "", description: "", tags: "", meta: "" })
  const [q, setQ] = useState("")

  function openAdd() {
    setForm({ type: types[0], title: "", href: "", kind: kinds[0] ?? "", description: "", tags: "", meta: "" })
    setEditing("")
  }

  function openEdit(r: ResourceRow) {
    setForm({ type: r.type, title: r.title, href: r.href, kind: r.kind, description: r.description, tags: r.tags.join(", "), meta: r.meta })
    setEditing(r.href)
  }

  function run(fn: () => Promise<void>) {
    setError(null)
    start(async () => {
      try { await fn(); setEditing(null) } catch (e) { setError(e instanceof Error ? e.message : String(e)) }
    })
  }

  function save() {
    run(() => upsertResource({
      type: form.type,
      title: form.title,
      href: form.href,
      kind: form.kind,
      description: form.description,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      meta: form.meta,
    }, editing || undefined))
  }

  const visible = rows.filter((r) => {
    if (!q) return true
    const s = q.toLowerCase()
    return r.title.toLowerCase().includes(s) || r.href.toLowerCase().includes(s) || r.kind.toLowerCase().includes(s)
  })

  const metaLabel = category === "events" ? "Date (e.g. 12 March)" : category === "opportunities" ? "Status (funding only)" : ""

  return (
    <div>
      <div className="adm-queue-toolbar">
        <input className="adm-search" placeholder="Search title, URL, kind…" value={q} onChange={(e) => setQ(e.target.value)} />
        <span className="adm-queue-toolbar__count">{visible.length} shown</span>
        <button className="adm-btn adm-btn--primary" onClick={openAdd} disabled={pending}>Add resource</button>
      </div>

      {error && <div className="adm-db-warn" style={{ margin: "0 0 8px" }}>{error}</div>}

      {editing !== null && (
        <div className="adm-src-add adm-person-form">
          {types.length > 1 && (
            <div className="adm-field"><label>Stored as</label>
              <select className="adm-select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as ContentType })}>
                {types.map((t) => <option key={t} value={t}>{TYPE_LABEL[t] ?? t}</option>)}
              </select></div>
          )}
          <div className="adm-field"><label>Title *</label>
            <input className="adm-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div className="adm-field"><label>URL *</label>
            <input className="adm-input" placeholder="https://…" value={form.href} onChange={(e) => setForm({ ...form, href: e.target.value })} /></div>
          <div className="adm-field"><label>Kind</label>
            <input className="adm-input" list={`kinds-${category}`} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} />
            <datalist id={`kinds-${category}`}>
              {kinds.map((k) => <option key={k} value={k} />)}
            </datalist></div>
          <div className="adm-field adm-person-form__wide"><label>Description</label>
            <textarea className="adm-input adm-textarea" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          {form.type === "portals" && (
            <div className="adm-field"><label>Tags (comma-separated)</label>
              <input className="adm-input" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} /></div>
          )}
          {metaLabel && (
            <div className="adm-field"><label>{metaLabel}</label>
              <input className="adm-input" value={form.meta} onChange={(e) => setForm({ ...form, meta: e.target.value })} /></div>
          )}
          <div className="adm-form-actions adm-person-form__wide">
            <button className="adm-btn adm-btn--ghost" onClick={() => setEditing(null)} disabled={pending}>Cancel</button>
            <button className="adm-btn adm-btn--primary" onClick={save} disabled={pending || !form.title.trim() || !form.href.trim()}>Save</button>
          </div>
        </div>
      )}

      <div className="adm-src-list">
        {visible.map((r) => (
          <div key={`${r.type}:${r.href}`} className="adm-src">
            <span className="adm-list-row__target">{r.kind || r.type}</span>
            <div className="adm-src__main">
              <span className="adm-src__label">
                <a href={r.href} target="_blank" rel="noopener noreferrer" className="adm-plain-link">{r.title} ↗</a>
              </span>
              <span className="adm-src__meta">{r.description || r.href}{r.meta ? ` · ${r.meta}` : ""}</span>
            </div>
            <button className="adm-btn adm-btn--ghost" onClick={() => openEdit(r)} disabled={pending}>Edit</button>
            <button className="adm-btn adm-btn--ghost" onClick={() => run(() => deleteResource(r.type, r.href))} disabled={pending} title="Remove">✕</button>
          </div>
        ))}
        {visible.length === 0 && (
          <div className="adm-empty"><span className="adm-empty__label">Nothing in this category yet.</span></div>
        )}
      </div>
    </div>
  )
}
