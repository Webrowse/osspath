"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import type { UserCompanyStatus } from "@/lib/company-status"
import type { CompanyFilters, TimeFilter } from "@/types"
import { STATUS_LABELS, TIME_FILTER_LABELS, ALL_TAGS } from "@/types"
import type { StatusCounts } from "@/lib/companies"

const PIPELINE_STATUSES: UserCompanyStatus[] = [
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

// Exclusive calendar-day buckets — a company matches exactly one
const TIMELINE_FILTERS: TimeFilter[] = [
  "applied_today",
  "applied_7d",
  "applied_30d",
  "applied_older_30d",
]

// Review freshness and follow-up — cumulative thresholds
const ATTENTION_FILTERS: TimeFilter[] = [
  "follow_up_due",
  "not_checked_7d",
  "not_checked_14d",
  "updated_7d",
]

const EMPTY_FILTERS: CompanyFilters = {
  q: "",
  statuses: [],
  tags: [],
  remoteOnly: false,
  rustOnly: false,
  companyType: null,
  timeFilter: null,
  hideNotInterested: false,
  page: 1,
}

// Quick-access presets replace all active filters with a single click
const PRESETS: Array<{ label: string; filters: Partial<CompanyFilters> }> = [
  {
    label: "Active pipeline",
    filters: { statuses: ["APPLIED", "OA", "RECRUITER_CALL", "INTERVIEWING", "FINAL_ROUND"] },
  },
  { label: "Follow-up due", filters: { timeFilter: "follow_up_due" } },
  { label: "Not reviewed 7d", filters: { timeFilter: "not_checked_7d" } },
  { label: "Saved", filters: { statuses: ["SAVED"] } },
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
    pipeline: true,
    timeline: true,
    attention: true,
    company: true,
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

  const setTimeFilter = (tf: TimeFilter) =>
    patch({ timeFilter: filters.timeFilter === tf ? null : tf })

  const hasAnyFilter =
    !!filters.q ||
    filters.statuses.length > 0 ||
    filters.tags.length > 0 ||
    filters.remoteOnly ||
    filters.rustOnly ||
    !!filters.companyType ||
    !!filters.timeFilter ||
    filters.hideNotInterested

  const clearAll = () => onChange(EMPTY_FILTERS)

  const toggleGroup = (key: keyof typeof openGroups) =>
    setOpenGroups((g) => ({ ...g, [key]: !g[key] }))

  const visibleTags = showAllTags ? ALL_TAGS : ALL_TAGS.slice(0, 10)

  // Per-section active state for header indicators
  const pipelineActive = filters.statuses.length > 0 || filters.hideNotInterested
  const timelineActive = !!filters.timeFilter && TIMELINE_FILTERS.includes(filters.timeFilter)
  const attentionActive = !!filters.timeFilter && ATTENTION_FILTERS.includes(filters.timeFilter)
  const companyActive = filters.remoteOnly || filters.rustOnly || !!filters.companyType
  const tagsActive = filters.tags.length > 0

  const pipelineActiveLabel =
    filters.statuses.length === 1
      ? STATUS_LABELS[filters.statuses[0]]
      : filters.statuses.length > 1
      ? `${filters.statuses.length} stages`
      : filters.hideNotInterested
      ? "hiding NI"
      : undefined

  const timelineActiveLabel =
    filters.timeFilter && timelineActive ? TIME_FILTER_LABELS[filters.timeFilter] : undefined
  const attentionActiveLabel =
    filters.timeFilter && attentionActive ? TIME_FILTER_LABELS[filters.timeFilter] : undefined
  const tagsActiveLabel =
    filters.tags.length === 1
      ? filters.tags[0]
      : filters.tags.length > 1
      ? `${filters.tags.length} tags`
      : undefined

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
              padding: "2px 6px",
              borderRadius: 4,
              marginRight: -6,
            }}
          >
            clear
          </button>
        )}
      </div>


      {/* Quick-access presets — authenticated only */}
      {isAuthenticated && (
        <div>
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "var(--fg-3)",
              letterSpacing: "0.05em",
              margin: "0 0 6px 4px",
            }}
          >
            QUICK FILTER
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {PRESETS.map((preset) => (
              <PresetBtn
                key={preset.label}
                label={preset.label}
                onClick={() => onChange({ ...EMPTY_FILTERS, ...preset.filters })}
              />
            ))}
          </div>
        </div>
      )}

      {/* Pipeline — multi-select checkboxes */}
      {isAuthenticated && (
        <FilterSection
          title="Pipeline"
          hasActive={pipelineActive}
          activeLabel={pipelineActiveLabel}
          open={openGroups.pipeline}
          onToggle={() => toggleGroup("pipeline")}
        >
          {PIPELINE_STATUSES.map((status) => {
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

      {/* Timeline — exclusive calendar-day buckets */}
      {isAuthenticated && (
        <FilterSection
          title="Timeline"
          hint="choose one"
          hasActive={timelineActive}
          activeLabel={timelineActiveLabel}
          open={openGroups.timeline}
          onToggle={() => toggleGroup("timeline")}
        >
          <div role="radiogroup" aria-label="Timeline filter">
            {TIMELINE_FILTERS.map((tf) => (
              <FilterRadioRow
                key={tf}
                label={TIME_FILTER_LABELS[tf]}
                active={filters.timeFilter === tf}
                onToggle={() => setTimeFilter(tf)}
              />
            ))}
          </div>
        </FilterSection>
      )}

      {/* Needs Attention — review freshness + follow-up */}
      {isAuthenticated && (
        <FilterSection
          title="Needs Attention"
          hint="choose one"
          hasActive={attentionActive}
          activeLabel={attentionActiveLabel}
          open={openGroups.attention}
          onToggle={() => toggleGroup("attention")}
        >
          <div role="radiogroup" aria-label="Needs Attention filter">
            {ATTENTION_FILTERS.map((tf) => (
              <FilterRadioRow
                key={tf}
                label={TIME_FILTER_LABELS[tf]}
                active={filters.timeFilter === tf}
                onToggle={() => setTimeFilter(tf)}
              />
            ))}
          </div>
        </FilterSection>
      )}

      {/* Company */}
      <FilterSection
        title="Company"
        hasActive={companyActive}
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

      {/* Tags */}
      <FilterSection
        title="Tags"
        hasActive={tagsActive}
        activeLabel={tagsActiveLabel}
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
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--fg-1)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--fg-3)")}
        >
          {showAllTags ? "Show less" : `+${ALL_TAGS.length - 10} more`}
        </button>
      </FilterSection>
    </div>
  )
}

function PresetBtn({ label, onClick }: { label: string; onClick: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        height: 22,
        padding: "0 8px",
        borderRadius: 4,
        border: `1px solid ${hovered ? "var(--line)" : "var(--line-soft)"}`,
        background: hovered ? "var(--bg-3)" : "var(--bg-2)",
        color: hovered ? "var(--fg-0)" : "var(--fg-2)",
        fontSize: 11,
        fontFamily: "var(--font-sans)",
        cursor: "pointer",
        whiteSpace: "nowrap",
        transition: "all 100ms",
      }}
    >
      {label}
    </button>
  )
}

function FilterSection({
  title,
  hint,
  hasActive,
  activeLabel,
  open,
  onToggle,
  children,
}: {
  title: string
  hint?: string
  hasActive?: boolean
  activeLabel?: string
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  // When active: show activeLabel (if any) in accent color; else fall back to hint
  const subtitleText = hasActive && activeLabel ? activeLabel : !hasActive ? hint : undefined

  return (
    <div>
      <button
        onClick={onToggle}
        aria-expanded={open}
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
          minWidth: 0,
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
        <span style={{ flexShrink: 0 }}>{title}</span>
        {subtitleText && (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: hasActive ? "var(--d-accent)" : "var(--fg-3)",
              fontWeight: 400,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              minWidth: 0,
            }}
          >
            · {subtitleText}
          </span>
        )}
        {/* Dot signals active state when there's no text label to show */}
        {hasActive && !activeLabel && (
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: 999,
              background: "var(--d-accent)",
              flexShrink: 0,
              marginLeft: 2,
            }}
          />
        )}
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
      aria-pressed={active}
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

function FilterRadioRow({
  label,
  active,
  onToggle,
}: {
  label: string
  active: boolean
  onToggle: () => void
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onToggle}
      role="radio"
      aria-checked={active}
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
      <span
        style={{
          width: 13,
          height: 13,
          borderRadius: 999,
          flexShrink: 0,
          border: `1.5px solid ${active ? "var(--d-accent)" : "var(--line)"}`,
          background: "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 120ms",
        }}
      >
        {active && (
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              background: "var(--d-accent)",
            }}
          />
        )}
      </span>
      <span style={{ flex: 1 }}>{label}</span>
    </button>
  )
}
