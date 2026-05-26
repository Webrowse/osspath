"use client"

import type { StatusCounts } from "@/lib/companies"

interface StatStripProps {
  statusCounts?: StatusCounts
  isAuthenticated: boolean
}

function StatCell({
  value,
  label,
  subtitle,
  color,
}: {
  value: number
  label: string
  subtitle: string
  color?: string
}) {
  return (
    <div style={{ padding: "8px 12px", background: "var(--bg-1)" }}>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 9.5,
          color: "var(--fg-3)",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 6,
          marginTop: 2,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 20,
            fontWeight: 600,
            color: color ?? "var(--fg-0)",
            letterSpacing: "-0.04em",
            lineHeight: 1,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {value}
        </span>
        <span
          style={{
            fontSize: 10.5,
            color: "var(--fg-3)",
          }}
        >
          {subtitle}
        </span>
      </div>
    </div>
  )
}

export function StatStrip({ statusCounts, isAuthenticated }: StatStripProps) {
  if (!isAuthenticated || !statusCounts) return null

  const tracked = Object.values(statusCounts).reduce((a, b) => a + (b ?? 0), 0)
  const interviewing = (statusCounts.INTERVIEWING ?? 0) + (statusCounts.FINAL_ROUND ?? 0)
  const followUp =
    (statusCounts.RECRUITER_CALL ?? 0) + (statusCounts.OA ?? 0)
  const newOpenings = statusCounts.SAVED ?? 0

  return (
    <div
      className="stat-strip-grid"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 1,
        background: "var(--line-soft)",
        borderRadius: 8,
        overflow: "hidden",
        border: "1px solid var(--line-soft)",
        margin: "12px 16px 0",
        flexShrink: 0,
      }}
    >
      <StatCell value={tracked} label="Tracked" subtitle="across pipeline" />
      <StatCell
        value={interviewing}
        label="Interviewing"
        subtitle="active conversations"
        color={interviewing > 0 ? "var(--d-rust)" : undefined}
      />
      <StatCell
        value={followUp}
        label="Follow-up due"
        subtitle="this week"
        color={followUp > 0 ? "var(--d-warn)" : undefined}
      />
      <StatCell
        value={newOpenings}
        label="New openings"
        subtitle="since last visit"
        color={newOpenings > 0 ? "var(--d-ok)" : undefined}
      />
    </div>
  )
}
