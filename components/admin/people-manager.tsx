"use client"

import { useState, useTransition } from "react"
import { upsertPerson, deletePerson } from "@/lib/admin/people-actions"

export type PersonRow = {
  name: string
  handle: string
  href: string
  writing: string
  description: string
  tags: string[]
}

const EXPERTISE_SUGGESTIONS = ["async", "compiler", "embedded", "systems", "networking", "wasm", "unsafe", "performance", "databases", "teaching"]

const EMPTY: PersonRow = { name: "", handle: "", href: "", writing: "", description: "", tags: [] }

function keyOf(p: PersonRow): string {
  return (p.handle || p.name).toLowerCase()
}

export function PeopleManager({ people }: { people: PersonRow[] }) {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  // null = closed, "" = adding new, otherwise the key being edited
  const [editing, setEditing] = useState<string | null>(null)
  const [form, setForm] = useState<PersonRow>(EMPTY)
  const [q, setQ] = useState("")

  function openAdd() {
    setForm(EMPTY)
    setEditing("")
  }

  function openEdit(p: PersonRow) {
    setForm(p)
    setEditing(keyOf(p))
  }

  function run(fn: () => Promise<void>) {
    setError(null)
    start(async () => {
      try { await fn(); setEditing(null) } catch (e) { setError(e instanceof Error ? e.message : String(e)) }
    })
  }

  function save() {
    const originalKey = editing || undefined
    run(() => upsertPerson({ ...form, tags: form.tags }, originalKey))
  }

  const visible = people.filter((p) => {
    if (!q) return true
    const s = q.toLowerCase()
    return p.name.toLowerCase().includes(s) || p.handle.toLowerCase().includes(s) || p.tags.some((t) => t.includes(s))
  })

  return (
    <div>
      <div className="adm-queue-toolbar">
        <input className="adm-search" placeholder="Search name, handle, expertise…" value={q} onChange={(e) => setQ(e.target.value)} />
        <span className="adm-queue-toolbar__count">{visible.length} shown</span>
        <button className="adm-btn adm-btn--primary" onClick={openAdd} disabled={pending}>Add person</button>
      </div>

      {error && <div className="adm-db-warn" style={{ margin: "0 0 8px" }}>{error}</div>}

      {editing !== null && (
        <div className="adm-src-add adm-person-form">
          <div className="adm-field"><label>Name *</label>
            <input className="adm-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="adm-field"><label>GitHub handle</label>
            <input className="adm-input" placeholder="dtolnay" value={form.handle} onChange={(e) => setForm({ ...form, handle: e.target.value })} /></div>
          <div className="adm-field"><label>Website</label>
            <input className="adm-input" placeholder="https://…" value={form.href} onChange={(e) => setForm({ ...form, href: e.target.value })} /></div>
          <div className="adm-field"><label>Blog / writing</label>
            <input className="adm-input" placeholder="https://…" value={form.writing} onChange={(e) => setForm({ ...form, writing: e.target.value })} /></div>
          <div className="adm-field adm-person-form__wide"><label>Why they matter</label>
            <textarea className="adm-input adm-textarea" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="adm-field adm-person-form__wide"><label>Expertise (comma-separated)</label>
            <input className="adm-input" placeholder="async, compiler, embedded…" value={form.tags.join(", ")}
              onChange={(e) => setForm({ ...form, tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })} />
            <div className="adm-person-form__suggestions">
              {EXPERTISE_SUGGESTIONS.filter((s) => !form.tags.includes(s)).map((s) => (
                <button key={s} type="button" className="adm-chip adm-chip--click" onClick={() => setForm({ ...form, tags: [...form.tags, s] })}>+{s}</button>
              ))}
            </div>
          </div>
          <div className="adm-form-actions adm-person-form__wide">
            <button className="adm-btn adm-btn--ghost" onClick={() => setEditing(null)} disabled={pending}>Cancel</button>
            <button className="adm-btn adm-btn--primary" onClick={save} disabled={pending || !form.name.trim()}>Save</button>
          </div>
        </div>
      )}

      <div className="adm-src-list">
        {visible.map((p) => (
          <div key={keyOf(p)} className="adm-src">
            <div className="adm-src__main">
              <span className="adm-src__label">
                {p.name}
                {p.handle && <a className="adm-person-handle" href={`https://github.com/${p.handle}`} target="_blank" rel="noopener noreferrer">@{p.handle}</a>}
              </span>
              <span className="adm-src__meta">{p.description || "no description"}</span>
              <span className="adm-person-tags">
                {p.tags.map((t) => <span key={t} className="adm-chip adm-chip--dim">{t}</span>)}
              </span>
            </div>
            <button className="adm-btn adm-btn--ghost" onClick={() => openEdit(p)} disabled={pending}>Edit</button>
            <button className="adm-btn adm-btn--ghost" onClick={() => run(() => deletePerson(keyOf(p)))} disabled={pending} title="Remove">✕</button>
          </div>
        ))}
        {visible.length === 0 && (
          <div className="adm-empty"><span className="adm-empty__label">No people yet — add the maintainers worth following.</span></div>
        )}
      </div>
    </div>
  )
}
