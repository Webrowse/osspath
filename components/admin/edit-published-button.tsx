"use client"

import { useState, useTransition } from "react"
import { updatePublished } from "@/lib/admin/actions"
import { CONTENT_SCHEMA } from "@/lib/admin/content-schema"
import type { ContentType } from "@/lib/admin/types"

interface EditPublishedButtonProps {
  contentType: ContentType
  index: number
  item: Record<string, unknown>
}

export function EditPublishedButton({ contentType, index, item }: EditPublishedButtonProps) {
  const [open, setOpen] = useState(false)
  const [fields, setFields] = useState<Record<string, string>>(
    () => Object.fromEntries(
      CONTENT_SCHEMA[contentType].fields.map((f) => [f.key, String(item[f.key] ?? "")])
    )
  )
  const [saving, startSave] = useTransition()

  function set(key: string, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }))
  }

  function handleSave() {
    startSave(async () => {
      const patch: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(fields)) {
        patch[k] = v
      }
      await updatePublished(contentType, index, patch)
      setOpen(false)
    })
  }

  if (!open) {
    return (
      <button
        className="adm-btn adm-btn--ghost"
        style={{ padding: "2px 7px", fontSize: 11 }}
        onClick={() => setOpen(true)}
      >
        Edit
      </button>
    )
  }

  const fieldConfig = CONTENT_SCHEMA[contentType].fields

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.6)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
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
          <span>Edit entry</span>
          <button
            className="adm-btn adm-btn--ghost"
            style={{ padding: "2px 8px", fontSize: 11 }}
            onClick={() => setOpen(false)}
          >
            ✕
          </button>
        </div>

        <div className="adm-form" style={{ maxHeight: "60vh", overflowY: "auto" }}>
          {fieldConfig.map(({ key, label, kind }) => (
            <div key={key} className="adm-field">
              <label>{label}</label>
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
          <button className="adm-btn adm-btn--ghost" onClick={() => setOpen(false)} disabled={saving}>
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
