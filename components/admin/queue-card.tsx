"use client"

import { useState, useTransition } from "react"
import { approveItem, rejectItem, updatePendingItem } from "@/lib/admin/actions"
import type { PendingItem, ContentType } from "@/lib/admin/types"

function formatAge(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

function ConfidenceBadge({ score }: { score?: number }) {
  if (score == null) return null
  const pct = Math.round(score * 100)
  const cls = score >= 0.7 ? "adm-card__confidence-hi" : score >= 0.4 ? "adm-card__confidence-med" : ""
  return <span className={`adm-card__confidence ${cls}`}>{pct}% confidence</span>
}

function getTitle(item: PendingItem): string {
  const e = item.extracted
  if (e.role && e.company) return `${e.role} — ${e.company}`
  if (e.role) return String(e.role)
  if (e.name) return String(e.name)
  if (e.title) return String(e.title)
  return "Untitled"
}

function getSubtitle(item: PendingItem): string {
  const e = item.extracted
  if (e.href) return String(e.href)
  if (e.company) return String(e.company)
  return item.sourceUrl
}

function getNote(item: PendingItem): string {
  const e = item.extracted
  if (e.note) return String(e.note)
  if (e.description) return String(e.description)
  return ""
}

interface EditFormProps {
  item: PendingItem
  contentType: ContentType
  onCancel: () => void
  onApproved: () => void
}

function EditForm({ item, contentType, onCancel, onApproved }: EditFormProps) {
  const [fields, setFields] = useState<Record<string, string>>({
    company:          String(item.extracted.company ?? ""),
    role:             String(item.extracted.role ?? ""),
    name:             String(item.extracted.name ?? ""),
    title:            String(item.extracted.title ?? ""),
    href:             String(item.extracted.href ?? item.sourceUrl),
    note:             String(item.extracted.note ?? item.extracted.description ?? ""),
    description:      String(item.extracted.description ?? item.extracted.note ?? ""),
    tags:             (item.extracted.tags as string[] | undefined ?? []).join(", "),
    topics:           (item.extracted.topics as string[] | undefined ?? []).join(", "),
    checkedAt:        new Date().toISOString().split("T")[0],
    expiresAt:        (() => {
      const d = new Date(); d.setMonth(d.getMonth() + 3); return d.toISOString().split("T")[0]
    })(),
  })
  const [pending, startTransition] = useTransition()

  function set(key: string, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }))
  }

  function handleApprove() {
    startTransition(async () => {
      const overrides: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(fields)) {
        if (!v.trim()) continue
        if (k === "tags" || k === "topics") {
          overrides[k] = v.split(",").map((s) => s.trim()).filter(Boolean)
        } else if (k === "checkedAt" || k === "expiresAt") {
          overrides[k] = v
        } else {
          overrides[k] = v
        }
      }
      await approveItem(contentType, item.id, overrides)
      onApproved()
    })
  }

  const relevantFields = getFieldsForType(contentType)

  return (
    <div className="adm-form">
      <div style={{ fontSize: 11.5, color: "var(--fg-2)", marginBottom: 4, fontFamily: "var(--font-geist-mono)" }}>
        Edit before publishing — all fields are optional overrides
      </div>
      <div className="adm-form-row">
        {relevantFields.map(({ key, label, multiline }) => (
          <div key={key} className="adm-field" style={multiline ? { gridColumn: "1 / -1" } : {}}>
            <label>{label}</label>
            {multiline ? (
              <textarea
                className="adm-input adm-textarea"
                value={fields[key] ?? ""}
                onChange={(e) => set(key, e.target.value)}
                rows={2}
              />
            ) : (
              <input
                className="adm-input"
                value={fields[key] ?? ""}
                onChange={(e) => set(key, e.target.value)}
              />
            )}
          </div>
        ))}
      </div>
      <div className="adm-form-actions">
        <button className="adm-btn adm-btn--ghost" onClick={onCancel} disabled={pending}>
          Cancel
        </button>
        <button className="adm-btn adm-btn--approve" onClick={handleApprove} disabled={pending}>
          {pending ? "Publishing…" : "Publish →"}
        </button>
      </div>
    </div>
  )
}

function getFieldsForType(type: ContentType): { key: string; label: string; multiline?: boolean }[] {
  switch (type) {
    case "jobs": return [
      { key: "company",   label: "Company" },
      { key: "role",      label: "Role" },
      { key: "href",      label: "Apply URL" },
      { key: "tags",      label: "Tags (comma-sep)" },
      { key: "topics",    label: "Topics (comma-sep)" },
      { key: "checkedAt", label: "Checked At" },
      { key: "expiresAt", label: "Expires At" },
      { key: "note",      label: "Note", multiline: true },
    ]
    case "oss": return [
      { key: "name",  label: "Repo Name" },
      { key: "eco",   label: "Eco (e.g. CLI · Tooling)" },
      { key: "href",  label: "GitHub URL" },
      { key: "topics", label: "Topics (comma-sep)" },
      { key: "note",  label: "Contributor note", multiline: true },
    ]
    case "grants": return [
      { key: "kind",        label: "Kind (Grant/Bounty/…)" },
      { key: "name",        label: "Name" },
      { key: "href",        label: "URL" },
      { key: "status",      label: "Status" },
      { key: "description", label: "Description", multiline: true },
    ]
    case "pulse": return [
      { key: "kind",        label: "Kind (Newsletter/Forum/…)" },
      { key: "title",       label: "Title" },
      { key: "href",        label: "URL" },
      { key: "description", label: "Description", multiline: true },
    ]
    case "events": return [
      { key: "title",    label: "Title" },
      { key: "day",      label: "Day (num or —)" },
      { key: "month",    label: "Month / Period" },
      { key: "href",     label: "URL" },
      { key: "meta",     label: "Meta (format, cost)" },
      { key: "expiresAt", label: "Expires At" },
    ]
    default: return [
      { key: "name",   label: "Name" },
      { key: "sector", label: "Sector" },
      { key: "href",   label: "URL" },
    ]
  }
}

interface QueueCardProps {
  item: PendingItem
  contentType: ContentType
}

export function QueueCard({ item, contentType }: QueueCardProps) {
  const [editing, setEditing] = useState(false)
  const [done, setDone] = useState(false)
  const [rejecting, startRejectTransition] = useTransition()

  if (done) return null

  function handleReject() {
    startRejectTransition(async () => {
      await rejectItem(contentType, item.id)
      setDone(true)
    })
  }

  const title = getTitle(item)
  const subtitle = getSubtitle(item)
  const note = getNote(item)
  const tags = (item.extracted.tags as string[] | undefined) ?? []
  const rustMentioned = item.extracted.rustMentioned === true
  const remoteConfirmed = item.extracted.remoteConfirmed === true

  return (
    <div className="adm-card">
      <div className="adm-card__head">
        <span className="adm-card__source">{item.source}</span>
        <span className="adm-card__age">{formatAge(item.foundAt)}</span>
        {rustMentioned && <span className="adm-chip adm-chip--rust">Rust</span>}
        {remoteConfirmed && <span className="adm-chip adm-chip--remote">Remote</span>}
        <ConfidenceBadge score={item.confidence} />
      </div>

      <div className="adm-card__body">
        <div className="adm-card__title">{title}</div>
        <div className="adm-card__subtitle">{subtitle}</div>
        {item.whyMatched && (
          <div className="adm-card__why">
            <span className="adm-card__why-label">Matched:</span>
            <span>{item.whyMatched}</span>
            {item.score != null && (
              <span className="adm-card__why-score">score {item.score}</span>
            )}
          </div>
        )}
        {note && <div className="adm-card__note">{note}</div>}
        {item.rawText && (
          <div className="adm-card__raw">{item.rawText.slice(0, 220)}</div>
        )}
        {tags.length > 0 && (
          <div className="adm-card__tags">
            {tags.map((t) => <span key={t} className="adm-chip">{t}</span>)}
          </div>
        )}
      </div>

      {editing ? (
        <EditForm
          item={item}
          contentType={contentType}
          onCancel={() => setEditing(false)}
          onApproved={() => setDone(true)}
        />
      ) : (
        <div className="adm-card__actions">
          <a
            href={item.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="adm-btn adm-btn--ghost"
          >
            Source ↗
          </a>
          <div className="adm-card__actions-spacer" />
          <button
            className="adm-btn adm-btn--reject"
            onClick={handleReject}
            disabled={rejecting}
          >
            {rejecting ? "…" : "Reject"}
          </button>
          <button
            className="adm-btn adm-btn--approve"
            onClick={() => setEditing(true)}
          >
            Edit & Approve →
          </button>
        </div>
      )}
    </div>
  )
}
