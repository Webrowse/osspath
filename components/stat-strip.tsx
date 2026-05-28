"use client"

import Link from "next/link"
import type { StatusCounts } from "@/lib/companies"

// All statuses that represent active user tracking (excludes NOT_APPLIED, NOT_INTERESTED)
const TRACKED_QS =
  "status=SAVED&status=APPLIED&status=OA&status=RECRUITER_CALL" +
  "&status=INTERVIEWING&status=FINAL_ROUND&status=OFFER" +
  "&status=REJECTED&status=GHOSTED&status=NO_OPENINGS&status=HIRING_FREEZE"

interface StatStripProps {
  statusCounts?: StatusCounts
  followUpDue: number
  newOpenings: number
  isAuthenticated: boolean
}

function StatTile({
  value,
  label,
  subtitle,
  color,
  href,
}: {
  value: number
  label: string
  subtitle: string
  color?: string
  href: string
}) {
  const inner = (
    <>
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
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 2 }}>
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
        <span style={{ fontSize: 10.5, color: "var(--fg-3)" }}>{subtitle}</span>
      </div>
    </>
  )

  if (value > 0) {
    return (
      <Link href={href} scroll={false} className="stat-strip-tile" style={{ cursor: "pointer" }}>
        {inner}
      </Link>
    )
  }

  return (
    <div className="stat-strip-tile" style={{ cursor: "default", opacity: 0.6 }}>
      {inner}
    </div>
  )
}

export function StatStrip({ statusCounts, followUpDue, newOpenings, isAuthenticated }: StatStripProps) {
  if (!isAuthenticated || !statusCounts) return null

  // Tracked: all companies with any non-passive user status
  const tracked = Object.entries(statusCounts)
    .filter(([s]) => s !== "NOT_APPLIED" && s !== "NOT_INTERESTED")
    .reduce((sum, [, n]) => sum + (n ?? 0), 0)

  // Interviewing: active conversation stages
  const interviewing = (statusCounts.INTERVIEWING ?? 0) + (statusCounts.FINAL_ROUND ?? 0)

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
      <StatTile
        value={tracked}
        label="Tracked"
        subtitle="in pipeline"
        href={`/companies?${TRACKED_QS}`}
      />
      <StatTile
        value={interviewing}
        label="Interviewing"
        subtitle="active"
        color={interviewing > 0 ? "var(--d-rust)" : undefined}
        href="/companies?status=INTERVIEWING&status=FINAL_ROUND"
      />
      <StatTile
        value={followUpDue}
        label="Follow-up"
        subtitle="overdue"
        color={followUpDue > 0 ? "var(--d-warn)" : undefined}
        href="/companies?time=follow_up_due"
      />
      <StatTile
        value={newOpenings}
        label="New openings"
        subtitle="verified 14d"
        color={newOpenings > 0 ? "var(--d-ok)" : undefined}
        href="/companies?sort=verified_recent"
      />
    </div>
  )
}
