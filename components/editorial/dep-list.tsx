"use client"

import { useState } from "react"
import Link from "next/link"

const VISIBLE_LIMIT = 8

const CHIP_STYLE = { cursor: "pointer", fontFamily: "var(--font-ibm-plex-mono)", fontSize: 12 } as const

interface DepListProps {
  deps: string[]
}

export function DepList({ deps }: DepListProps) {
  const [expanded, setExpanded] = useState(false)

  if (deps.length === 0) return null

  const hasMore   = deps.length > VISIBLE_LIMIT
  const visible   = expanded || !hasMore ? deps : deps.slice(0, VISIBLE_LIMIT)
  const remainder = deps.length - VISIBLE_LIMIT

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
      {visible.map(dep => (
        <Link key={dep} href={`/deps/${dep}`} style={{ textDecoration: "none" }}>
          <span className="e-tag e-tag--soft" style={CHIP_STYLE}>{dep}</span>
        </Link>
      ))}

      {hasMore && !expanded && (
        <span
          role="button"
          tabIndex={0}
          onClick={() => setExpanded(true)}
          onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setExpanded(true) } }}
          className="e-tag e-tag--soft e-dep-btn"
          style={CHIP_STYLE}
          aria-label={`Show ${remainder} more dependencies`}
        >
          +{remainder} more
        </span>
      )}

      {expanded && (
        <span
          role="button"
          tabIndex={0}
          onClick={() => setExpanded(false)}
          onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setExpanded(false) } }}
          className="e-tag e-tag--soft e-dep-btn"
          style={CHIP_STYLE}
          aria-label="Collapse dependency list"
        >
          Show less
        </span>
      )}
    </div>
  )
}
