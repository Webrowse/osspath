"use client"

import { useState } from "react"
import type { PendingItem } from "@/lib/admin/types"

interface ExportButtonProps {
  items: PendingItem[]
  contentType: string
}

export function ExportButton({ items, contentType }: ExportButtonProps) {
  const [copied, setCopied] = useState(false)

  function buildPrompt(): string {
    const lines: string[] = [
      `I have ${items.length} pending "${contentType}" entries on OSSPath (a Rust ecosystem directory).`,
      `Please review each one and respond with a table:  # | URL Status | Rust? | Note`,
      ``,
      `For each entry:`,
      `- URL Status: LIVE, DEAD (404/error), or UNKNOWN`,
      `- Rust?: YES if the role/project is genuinely Rust-focused, NO otherwise`,
      `- Note: short observation (duplicate, expired listing, wrong language, looks good, etc.)`,
      ``,
      `---`,
      ``,
    ]

    items.forEach((item, i) => {
      const ext = item.extracted ?? {}
      const title    = String(ext.title ?? ext.name ?? "")
      const company  = String(ext.company ?? ext.org ?? "")
      const href     = String(ext.href ?? item.sourceUrl ?? "")
      const location = String(ext.location ?? "")
      const conf     = item.confidence != null ? `${Math.round(item.confidence * 100)}%` : "?"
      const why      = item.whyMatched ? `  why: ${item.whyMatched}` : ""

      const label = [title, company && `@ ${company}`, location && `(${location})`]
        .filter(Boolean).join(" ")

      lines.push(`${i + 1}. ${label || item.id}`)
      lines.push(`   url: ${href}`)
      lines.push(`   source: ${item.source} · confidence: ${conf}${why}`)
      lines.push("")
    })

    return lines.join("\n")
  }

  function copy() {
    const text = buildPrompt()
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function download() {
    const text = buildPrompt()
    const blob = new Blob([text], { type: "text/plain" })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement("a")
    a.href     = url
    a.download = `osspath-queue-${contentType}-${new Date().toISOString().slice(0, 10)}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (items.length === 0) return null

  return (
    <div style={{ display: "flex", gap: 6 }}>
      <button className="adm-btn adm-btn--ghost" onClick={copy} title="Copy AI review prompt to clipboard — paste into Claude.ai or ChatGPT">
        {copied ? "Copied!" : `Copy for AI review`}
      </button>
      <button className="adm-btn adm-btn--ghost" onClick={download} title="Download as .txt file">
        ↓
      </button>
    </div>
  )
}
