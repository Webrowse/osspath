"use client"

import { useState, useTransition } from "react"
import { CONTENT_SCHEMA, type FieldKind } from "@/lib/admin/content-schema"
import type { ContentType } from "@/lib/admin/types"

/**
 * Generic add/edit modal for a published item, driven entirely by
 * CONTENT_SCHEMA[contentType].fields. Shared by AddPublishedButton (empty
 * `initial`, calls createPublished) and EditPublishedButton (pre-filled
 * `initial`, calls updatePublished) - one form, not one per type.
 */

function toFieldString(kind: FieldKind, value: unknown): string {
  if (kind === "tags") return Array.isArray(value) ? value.join(", ") : String(value ?? "")
  return String(value ?? "")
}

function fromFieldValue(kind: FieldKind, value: string): unknown {
  if (kind === "tags") return value.split(",").map((s) => s.trim()).filter(Boolean)
  return value
}

interface ContentItemFormProps {
  contentType: ContentType
  title: string
  initial?: Record<string, unknown>
  onSave: (patch: Record<string, unknown>) => Promise<void>
  onClose: () => void
}

export function ContentItemForm({ contentType, title, initial, onSave, onClose }: ContentItemFormProps) {
  const schema = CONTENT_SCHEMA[contentType]
  const [fields, setFields] = useState<Record<string, string>>(
    () => Object.fromEntries(schema.fields.map((f) => [f.key, toFieldString(f.kind, initial?.[f.key])]))
  )
  const [saving, startSave] = useTransition()

  function set(key: string, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }))
  }

  function handleSave() {
    startSave(async () => {
      const patch: Record<string, unknown> = {}
      for (const f of schema.fields) patch[f.key] = fromFieldValue(f.kind, fields[f.key] ?? "")
      await onSave(patch)
    })
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.6)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: "var(--bg-1, #171717)",
        border: "1px solid var(--line, oklch(0.32 0.01 250))",
        borderRadius: 10,
        width: "100%",
        maxWidth: 480,
        overflow: "hidden",
      }}>
        <div style={{
          padding: "10px 14px",
          borderBottom: "1px solid var(--line-soft, rgba(255,255,255,0.07))",
          fontSize: 13,
          fontWeight: 600,
          color: "var(--fg-0, #e5e5e5)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <span>{title}</span>
          <button
            className="adm-btn adm-btn--ghost"
            style={{ padding: "2px 8px", fontSize: 11 }}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="adm-form" style={{ maxHeight: "60vh", overflowY: "auto" }}>
          {schema.fields.map(({ key, label, kind }) => (
            <div key={key} className="adm-field">
              <label>{label}{kind === "tags" ? " (comma-separated)" : ""}</label>
              {kind === "textarea" ? (
                <textarea
                  className="adm-input adm-textarea"
                  value={fields[key] ?? ""}
                  onChange={(e) => set(key, e.target.value)}
                  rows={3}
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

        <div className="adm-form-actions" style={{ padding: "10px 14px", borderTop: "1px solid var(--line-soft, rgba(255,255,255,0.07))" }}>
          <button className="adm-btn adm-btn--ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="adm-btn adm-btn--primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  )
}
