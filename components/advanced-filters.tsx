"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import type { UserCompanyStatus } from "@prisma/client"
import type { CompanyFilters, TimeFilter } from "@/types"
import { STATUS_LABELS, TIME_FILTER_LABELS, ALL_TAGS } from "@/types"
import type { StatusCounts } from "@/lib/companies"

const TRACKING_STATUSES: UserCompanyStatus[] = [
  "SAVED",
  "APPLIED",
  "OA",
  "RECRUITER_CALL",
  "INTERVIEWING",
  "FINAL_ROUND",
  "OFFER",
  "REJECTED",
  "GHOSTED",
  "NO_OPENINGS",
  "HIRING_FREEZE",
  "NOT_INTERESTED",
]

const STATUS_DOT: Partial<Record<UserCompanyStatus, string>> = {
  SAVED: "var(--fg-2)",
  APPLIED: "var(--d-accent)",
  OA: "var(--d-accent)",
  RECRUITER_CALL: "var(--d-accent)",
  INTERVIEWING: "var(--d-rust)",
  FINAL_ROUND: "var(--d-rust)",
  OFFER: "var(--d-ok)",
  REJECTED: "var(--d-danger)",
  GHOSTED: "var(--d-danger)",
  NOT_INTERESTED: "var(--fg-3)",
  NO_OPENINGS: "var(--fg-3)",
  HIRING_FREEZE: "var(--fg-3)",
}

const TIME_FILTERS: TimeFilter[] = [
  "applied_today",
  "applied_7d",
  "applied_30d",
  "applied_older_30d",
  "follow_up_due",
  "not_checked_7d",
  "not_checked_14d",
  "updated_7d",
]

interface AdvancedFiltersProps {
  filters: CompanyFilters
  onChange: (next: CompanyFilters) => void
  isAuthenticated: boolean
  total: number
  loading?: boolean
  statusCounts?: StatusCounts
}

export function AdvancedFilters({
  filters,
  onChange,
  isAuthenticated,
  total,
  loading,
  statusCounts,
}: AdvancedFiltersProps) {
  const [showAllTags, setShowAllTags] = useState(false)
  const [openGroups, setOpenGroups] = useState({
    tracking: true,
    company: true,
    time: false,
    tags: true,
  })
  const patch = (partial: Partial<CompanyFilters>) =>
    onChange({ ...filters, ...partial, page: 1 })

  const toggleStatus = (status: UserCompanyStatus) => {
    const next = filters.statuses.includes(status)
      ? filters.statuses.filter((s) => s !== status)
      : [...filters.statuses, status]
    patch({ statuses: next })
  }

  const toggleTag = (tag: string) => {
    const next = filters.tags.includes(tag)
      ? filters.tags.filter((t) => t !== tag)
      : [...filters.tags, tag]
    patch({ tags: next })
  }

  const hasAnyFilter =
    !!filters.q ||
    filters.statuses.length > 0 ||
    filters.tags.length > 0 ||
    filters.remoteOnly ||
    filters.rustOnly ||
    !!filters.companyType ||
    !!filters.timeFilter ||
    filters.hideNotInterested

  const clearAll = () => {
    onChange({
      q: "",
      statuses: [],
      tags: [],
      remoteOnly: false,
      rustOnly: false,
      companyType: null,
      timeFilter: null,
      hideNotInterested: false,
      page: 1,
    })
  }

  const toggleGroup = (key: keyof typeof openGroups) =>
    setOpenGroups((g) => ({ ...g, [key]: !g[key] }))

  const visibleTags = showAllTags ? ALL_TAGS : ALL_TAGS.slice(0, 10)

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Results + clear */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11.5,
            color: loading ? "var(--fg-3)" : "var(--fg-2)",
            transition: "color 120ms",
          }}
        >
          <span style={{ color: "var(--fg-1)" }}>{total}</span>{" "}
          {hasAnyFilter ? "matched" : "companies"}
        </span>
        {hasAnyFilter && (
          <button
            onClick={clearAll}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--fg-2)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          >
            clear
          </button>
        )}
      </div>

      {/* Tracking */}
      {isAuthenticated && (
        <FilterSection
          title="Tracking"
          open={openGroups.tracking}
          onToggle={() => toggleGroup("tracking")}
        >
          {TRACKING_STATUSES.map((status) => {
            const active = filters.statuses.includes(status)
            const count = statusCounts?.[status]
            const dot = STATUS_DOT[status]
            return (
              <FilterCheckRow
                key={status}
                label={STATUS_LABELS[status] ?? status}
                active={active}
                dot={dot}
                count={count}
                onToggle={() => toggleStatus(status)}
              />
            )
          })}
          <FilterCheckRow
            label="Hide not interested"
            active={filters.hideNotInterested}
            onToggle={() => patch({ hideNotInterested: !filters.hideNotInterested })}
          />
        </FilterSection>
      )}

      {/* Company */}
      <FilterSection
        title="Company"
        open={openGroups.company}
        onToggle={() => toggleGroup("company")}
      >
        <FilterCheckRow
          label="Remote only"
          active={filters.remoteOnly}
          dot="var(--d-ok)"
          onToggle={() => patch({ remoteOnly: !filters.remoteOnly })}
        />
        <FilterCheckRow
          label="Rust (any level)"
          active={filters.rustOnly}
          dot="var(--d-rust)"
          onToggle={() => patch({ rustOnly: !filters.rustOnly })}
        />
      </FilterSection>

      {/* Time */}
      {isAuthenticated && (
        <FilterSection
          title="Time"
          open={openGroups.time}
          onToggle={() => toggleGroup("time")}
        >
          {TIME_FILTERS.map((tf) => (
            <FilterCheckRow
              key={tf}
              label={TIME_FILTER_LABELS[tf]}
              active={filters.timeFilter === tf}
              onToggle={() =>
                patch({ timeFilter: filters.timeFilter === tf ? null : tf })
              }
            />
          ))}
        </FilterSection>
      )}

      {/* Tags */}
      <FilterSection
        title="Tags"
        open={openGroups.tags}
        onToggle={() => toggleGroup("tags")}
      >
        {visibleTags.map((tag) => (
          <FilterCheckRow
            key={tag}
            label={tag}
            active={filters.tags.includes(tag)}
            onToggle={() => toggleTag(tag)}
          />
        ))}
        <button
          onClick={() => setShowAllTags((v) => !v)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 8px",
            borderRadius: 5,
            fontSize: 12,
            color: "var(--fg-3)",
            background: "none",
            border: "none",
            cursor: "pointer",
            width: "100%",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.color = "var(--fg-1)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.color = "var(--fg-3)")
          }
        >
          {showAllTags ? "Show less" : `+${ALL_TAGS.length - 10} more`}
        </button>
      </FilterSection>
    </div>
  )
}

function FilterSection({
  title,
  open,
  onToggle,
  children,
}: {
  title: string
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          width: "100%",
          padding: "3px 4px",
          background: "none",
          border: "none",
          cursor: "pointer",
          fontSize: 12,
          fontWeight: 500,
          color: "var(--fg-1)",
        }}
      >
        <ChevronDown
          size={12}
          style={{
            transform: open ? "none" : "rotate(-90deg)",
            transition: "transform 120ms",
            color: "var(--fg-3)",
            flexShrink: 0,
          }}
        />
        {title}
      </button>
      {open && (
        <div style={{ display: "flex", flexDirection: "column", gap: 1, marginTop: 4 }}>
          {children}
        </div>
      )}
    </div>
  )
}

function FilterCheckRow({
  label,
  active,
  dot,
  count,
  onToggle,
}: {
  label: string
  active: boolean
  dot?: string
  count?: number
  onToggle: () => void
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onToggle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "5px 8px",
        borderRadius: 5,
        fontSize: 12.5,
        color: active ? "var(--fg-0)" : "var(--fg-1)",
        background: active ? "var(--bg-3)" : hovered ? "var(--bg-2)" : "transparent",
        border: "none",
        cursor: "pointer",
        width: "100%",
        textAlign: "left",
        transition: "background 100ms",
      }}
    >
      {/* Custom checkbox */}
      <span
        style={{
          width: 13,
          height: 13,
          borderRadius: 4,
          flexShrink: 0,
          border: `1.5px solid ${active ? "var(--d-accent)" : "var(--line)"}`,
          background: active ? "var(--d-accent)" : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 120ms",
        }}
      >
        {active && (
          <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
            <path d="M1 3L3 5L7 1" stroke="oklch(0.99 0 0)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </span>
      {/* Color dot */}
      {dot && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: 999,
            background: dot,
            flexShrink: 0,
          }}
        />
      )}
      <span style={{ flex: 1 }}>{label}</span>
      {count != null && (
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10.5,
            color: "var(--fg-3)",
          }}
        >
          {count}
        </span>
      )}
    </button>
  )
}
