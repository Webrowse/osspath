"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { usePostHog } from "posthog-js/react"
import { Building2, X } from "lucide-react"
import { AppSidebar } from "@/components/app-sidebar"
import { AdvancedFilters } from "@/components/advanced-filters"
import { ContentToolbar, type ViewMode } from "@/components/content-toolbar"
import { StatStrip } from "@/components/stat-strip"
import { CompanyRow } from "@/components/company-row"
import { CompanyCard } from "@/components/company-card"
import { Pagination } from "@/components/pagination"
import { useCompanies } from "@/hooks/use-companies"
import type { CompaniesClientData } from "@/lib/companies"
import type { CompanyFilters, TimeFilter } from "@/types"
import {
  STATUS_LABELS,
  TIME_FILTER_LABELS,
  COMPANY_TYPE_LABELS,
  SORT_LABELS,
  parseFilters,
} from "@/types"
import type { SortOption } from "@/types"

interface CompaniesShellProps {
  initialFilters: CompanyFilters
  initialData: CompaniesClientData
  isAuthenticated: boolean
}

function filtersToSearchParams(filters: CompanyFilters): string {
  const p = new URLSearchParams()
  if (filters.q) p.set("q", filters.q)
  filters.statuses.forEach((s) => p.append("status", s))
  filters.tags.forEach((t) => p.append("tag", t))
  if (filters.remoteOnly) p.set("remote", "1")
  if (filters.rustOnly) p.set("rust", "1")
  if (filters.companyType) p.set("company_type", filters.companyType)
  if (filters.timeFilter) p.set("time", filters.timeFilter)
  if (filters.hideNotInterested) p.set("hide_ni", "1")
  if (filters.sort && filters.sort !== "name_asc") p.set("sort", filters.sort)
  if (filters.page > 1) p.set("page", String(filters.page))
  return p.toString()
}

function countActiveFilters(f: CompanyFilters): number {
  let n = 0
  if (f.q.trim()) n++
  n += f.statuses.length
  n += f.tags.length
  if (f.remoteOnly) n++
  if (f.rustOnly) n++
  if (f.companyType) n++
  if (f.timeFilter) n++
  if (f.hideNotInterested) n++
  return n
}

// Human-readable summary of what filters are currently active.
// Used in the empty state to explain zero results.
function describeFilters(f: CompanyFilters): string {
  const parts: string[] = []
  if (f.q.trim()) parts.push(`"${f.q.trim()}"`)
  if (f.statuses.length === 1) parts.push(STATUS_LABELS[f.statuses[0]])
  else if (f.statuses.length > 1) parts.push(`${f.statuses.length} pipeline stages`)
  if (f.timeFilter) parts.push(TIME_FILTER_LABELS[f.timeFilter])
  if (f.remoteOnly) parts.push("remote only")
  if (f.rustOnly) parts.push("Rust only")
  if (f.companyType) parts.push(COMPANY_TYPE_LABELS[f.companyType])
  if (f.tags.length === 1) parts.push(f.tags[0])
  else if (f.tags.length > 1) parts.push(`${f.tags.length} tags`)
  if (f.hideNotInterested) parts.push("hiding not interested")
  return parts.join(" · ")
}

const EMPTY_FILTERS: CompanyFilters = {
  q: "",
  statuses: [],
  tags: [],
  remoteOnly: false,
  rustOnly: false,
  companyType: null,
  timeFilter: null,
  hideNotInterested: false,
  sort: "name_asc",
  page: 1,
}

// One dismissible chip per active filter dimension.
// Gives persistent, scannable visibility into active filters without
// requiring the user to open the sidebar or filter drawer.
function ActiveFilterChips({
  filters,
  onFiltersChange,
}: {
  filters: CompanyFilters
  onFiltersChange: (f: CompanyFilters) => void
}) {
  const chips: Array<{ label: string; onRemove: () => void }> = []

  if (filters.q.trim()) {
    chips.push({
      label: `"${filters.q.trim()}"`,
      onRemove: () => onFiltersChange({ ...filters, q: "", page: 1 }),
    })
  }
  if (filters.statuses.length === 1) {
    chips.push({
      label: STATUS_LABELS[filters.statuses[0]],
      onRemove: () => onFiltersChange({ ...filters, statuses: [], page: 1 }),
    })
  } else if (filters.statuses.length > 1) {
    chips.push({
      label: `${filters.statuses.length} pipeline stages`,
      onRemove: () => onFiltersChange({ ...filters, statuses: [], page: 1 }),
    })
  }
  if (filters.timeFilter) {
    chips.push({
      label: TIME_FILTER_LABELS[filters.timeFilter as TimeFilter],
      onRemove: () => onFiltersChange({ ...filters, timeFilter: null, page: 1 }),
    })
  }
  if (filters.remoteOnly) {
    chips.push({
      label: "Remote only",
      onRemove: () => onFiltersChange({ ...filters, remoteOnly: false, page: 1 }),
    })
  }
  if (filters.rustOnly) {
    chips.push({
      label: "Rust only",
      onRemove: () => onFiltersChange({ ...filters, rustOnly: false, page: 1 }),
    })
  }
  if (filters.companyType) {
    chips.push({
      label: COMPANY_TYPE_LABELS[filters.companyType],
      onRemove: () => onFiltersChange({ ...filters, companyType: null, page: 1 }),
    })
  }
  if (filters.tags.length === 1) {
    chips.push({
      label: filters.tags[0],
      onRemove: () => onFiltersChange({ ...filters, tags: [], page: 1 }),
    })
  } else if (filters.tags.length > 1) {
    chips.push({
      label: `${filters.tags.length} tags`,
      onRemove: () => onFiltersChange({ ...filters, tags: [], page: 1 }),
    })
  }
  if (filters.hideNotInterested) {
    chips.push({
      label: "Hiding not interested",
      onRemove: () => onFiltersChange({ ...filters, hideNotInterested: false, page: 1 }),
    })
  }

  if (chips.length === 0) return null

  return (
    <div
      className="hide-scrollbar"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 16px",
        overflowX: "auto",
        flexShrink: 0,
        borderBottom: "1px solid var(--line-soft)",
      }}
    >
      {chips.map((chip) => (
        <button
          key={chip.label}
          onClick={chip.onRemove}
          title={`Remove: ${chip.label}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            height: 24,
            padding: "0 8px",
            borderRadius: 6,
            border: "1px solid var(--d-accent-line)",
            background: "var(--d-accent-soft)",
            color: "var(--d-accent)",
            fontSize: 11.5,
            fontFamily: "var(--font-sans)",
            cursor: "pointer",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          {chip.label}
          <X size={10} strokeWidth={2.5} />
        </button>
      ))}
      {chips.length > 1 && (
        <button
          onClick={() => onFiltersChange(EMPTY_FILTERS)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            height: 24,
            padding: "0 8px",
            borderRadius: 6,
            border: "1px solid var(--line-soft)",
            background: "transparent",
            color: "var(--fg-3)",
            fontSize: 11.5,
            fontFamily: "var(--font-sans)",
            cursor: "pointer",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          Clear all
        </button>
      )}
    </div>
  )
}

export function CompaniesShell({
  initialFilters,
  initialData,
  isAuthenticated,
}: CompaniesShellProps) {
  const searchParams = useSearchParams()
  const [filters, setFilters] = useState<CompanyFilters>(initialFilters)
  const [view, setView] = useState<ViewMode>("list")
  const [searchValue, setSearchValue] = useState(initialFilters.q)
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)

  const { data, loading } = useCompanies(filters, initialData)
  const searchRef = useRef<HTMLInputElement>(null)
  const urlSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const filterTrackTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFirstMount = useRef(true)
  const filtersRef = useRef(filters)
  filtersRef.current = filters
  const ph = usePostHog()

  const activeFilterCount = useMemo(() => countActiveFilters(filters), [filters])

  // Debounced filter analytics — fires 2s after the last filter change
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false
      return
    }
    if (filterTrackTimer.current) clearTimeout(filterTrackTimer.current)
    filterTrackTimer.current = setTimeout(() => {
      const activeCount = countActiveFilters(filters)
      if (activeCount > 0) {
        ph?.capture("filter_applied", { active_filter_count: activeCount })
      }
    }, 2000)
    return () => {
      if (filterTrackTimer.current) clearTimeout(filterTrackTimer.current)
    }
  }, [filters, ph])

  // Close filter drawer when viewport goes desktop-wide
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)")
    const handler = (e: MediaQueryListEvent) => { if (e.matches) setFilterDrawerOpen(false) }
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (filterDrawerOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => { document.body.style.overflow = "" }
  }, [filterDrawerOpen])

  // "/" shortcut focuses search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as Element).tagName
      if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        searchRef.current?.focus()
        searchRef.current?.select()
      }
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [])

  const syncUrl = useCallback((f: CompanyFilters) => {
    if (urlSyncTimer.current) clearTimeout(urlSyncTimer.current)
    urlSyncTimer.current = setTimeout(() => {
      const qs = filtersToSearchParams(f)
      window.history.replaceState(null, "", qs ? `/companies?${qs}` : "/companies")
    }, 400)
  }, [])

  // Sync filter state when URL changes via Next.js navigation (Link, back/forward).
  // useSearchParams updates on router navigations but NOT on replaceState calls,
  // so user-driven filter changes (typing, chips) don't create a loop.
  useEffect(() => {
    const params: Record<string, string | string[]> = {}
    searchParams.forEach((value, key) => {
      const existing = params[key]
      if (existing) {
        params[key] = Array.isArray(existing) ? [...existing, value] : [existing, value]
      } else {
        params[key] = value
      }
    })
    const parsed = parseFilters(params)
    setFilters(parsed)
    setSearchValue(parsed.q)
  }, [searchParams])

  const handleFiltersChange = useCallback(
    (next: CompanyFilters) => {
      setFilters(next)
      setSearchValue(next.q)  // keep search input in sync when chips or presets clear q
      syncUrl(next)
    },
    [syncUrl],
  )

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchValue(value)
      const next = { ...filtersRef.current, q: value, page: 1 }
      setFilters(next)
      syncUrl(next)
    },
    [syncUrl],
  )

  const handlePageChange = useCallback(
    (page: number) => {
      const next = { ...filtersRef.current, page }
      setFilters(next)
      syncUrl(next)
    },
    [syncUrl],
  )

  const clearFilters = useCallback(() => {
    handleFiltersChange(EMPTY_FILTERS)
    setSearchValue("")
  }, [handleFiltersChange])

  const { companies, total, page, totalPages } = data

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        background: "var(--bg-0)",
        overflow: "hidden",
      }}
    >
      {/* Desktop sidebar — hidden on mobile via CSS */}
      <div className="shell-sidebar" style={{ display: "flex" }}>
        <AppSidebar
          filters={filters}
          onFiltersChange={handleFiltersChange}
          isAuthenticated={isAuthenticated}
          total={total}
          loading={loading}
          statusCounts={data.statusCounts}
        />
      </div>

      {/* Main area */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <StatStrip
          statusCounts={data.statusCounts}
          allCompanies={initialData.allCompanies}
          isAuthenticated={isAuthenticated}
        />

        <ContentToolbar
          searchValue={searchValue}
          onSearchChange={handleSearchChange}
          searchRef={searchRef}
          view={view}
          onViewChange={setView}
          total={total}
          loading={loading}
          activeFilterCount={activeFilterCount}
          onOpenFilters={() => setFilterDrawerOpen(true)}
        />

        {/* Active filter chips — shows when any filter is active */}
        <ActiveFilterChips filters={filters} onFiltersChange={handleFiltersChange} />

        {/* First-run hint — visible while user has no tracked companies */}
        {isAuthenticated && data.statusCounts !== undefined && Object.keys(data.statusCounts).length === 0 && (
          <div
            style={{
              padding: "7px 16px",
              borderBottom: "1px solid var(--line-soft)",
              background: "var(--d-accent-soft)",
              fontSize: 12,
              color: "var(--fg-2)",
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                color: "var(--d-accent)",
                background: "var(--d-accent-soft)",
                border: "1px solid var(--d-accent-line)",
                padding: "1px 6px",
                borderRadius: 4,
                flexShrink: 0,
              }}
            >
              tip
            </span>
            Click any company, then <strong style={{ color: "var(--fg-1)", fontWeight: 500 }}>Start tracking</strong> to add it to your pipeline.
          </div>
        )}

        <main style={{ flex: 1, overflowY: "auto", padding: "12px 16px 24px" }}>
          {/* Page header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 12,
            }}
          >
            <h1
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: "var(--fg-0)",
                margin: 0,
                letterSpacing: "-0.01em",
              }}
            >
              Companies
            </h1>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--fg-3)",
                background: "var(--bg-3)",
                border: "1px solid var(--line-soft)",
                padding: "1px 6px",
                borderRadius: 4,
              }}
            >
              {total}
            </span>
            <div style={{ flex: 1 }} />
            <select
              value={filters.sort ?? "name_asc"}
              onChange={(e) => handleFiltersChange({ ...filters, sort: e.target.value as SortOption, page: 1 })}
              className="sort-select"
              aria-label="Sort companies"
            >
              {(Object.entries(SORT_LABELS) as [SortOption, string][]).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {companies.length === 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: 260,
                gap: 10,
                color: "var(--fg-3)",
                border: "1px solid var(--line-soft)",
                borderRadius: 10,
                background: "var(--bg-1)",
                padding: "0 24px",
              }}
            >
              <Building2 size={28} style={{ opacity: 0.25 }} />
              <p style={{ fontSize: 14, fontWeight: 500, color: "var(--fg-2)", margin: 0 }}>
                No companies matched
              </p>
              {activeFilterCount > 0 ? (
                <>
                  <p
                    style={{
                      fontSize: 11.5,
                      color: "var(--fg-3)",
                      margin: 0,
                      textAlign: "center",
                      maxWidth: 320,
                      fontFamily: "var(--font-mono)",
                      lineHeight: 1.5,
                    }}
                  >
                    {describeFilters(filters)}
                  </p>
                  <button
                    onClick={clearFilters}
                    style={{
                      marginTop: 4,
                      padding: "6px 14px",
                      borderRadius: 6,
                      border: "1px solid var(--line-soft)",
                      background: "transparent",
                      color: "var(--fg-2)",
                      fontSize: 12.5,
                      cursor: "pointer",
                      fontFamily: "var(--font-sans)",
                    }}
                  >
                    Clear all filters
                  </button>
                </>
              ) : (
                <p style={{ fontSize: 12.5, color: "var(--fg-3)", margin: 0 }}>
                  No companies in the database yet
                </p>
              )}
            </div>
          ) : view === "list" ? (
            <div
              style={{
                border: "1px solid var(--line-soft)",
                borderRadius: 10,
                background: "var(--bg-1)",
                overflow: "hidden",
              }}
            >
              {companies.map((company) => (
                <CompanyRow
                  key={company.id}
                  company={company}
                  isAuthenticated={isAuthenticated}
                />
              ))}
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: 12,
              }}
            >
              {companies.map((company) => (
                <CompanyCard
                  key={company.id}
                  company={company}
                  isAuthenticated={isAuthenticated}
                />
              ))}
            </div>
          )}

          <div style={{ paddingTop: 4 }}>
            <Pagination
              page={page}
              totalPages={totalPages}
              total={total}
              onPageChange={handlePageChange}
              loading={loading}
            />
          </div>
        </main>
      </div>

      {/* Mobile filter drawer */}
      {filterDrawerOpen && (
        <div
          className="filter-drawer-back"
          onClick={() => setFilterDrawerOpen(false)}
        >
          <div
            className="filter-drawer-sheet"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div
              style={{
                width: 36,
                height: 4,
                borderRadius: 99,
                background: "var(--line)",
                margin: "12px auto 0",
                flexShrink: 0,
              }}
            />

            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "12px 16px 10px",
                borderBottom: "1px solid var(--line-soft)",
                flexShrink: 0,
                gap: 8,
              }}
            >
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--fg-0)",
                  flex: 1,
                  letterSpacing: "-0.01em",
                }}
              >
                Filters
                {activeFilterCount > 0 && (
                  <span
                    style={{
                      marginLeft: 8,
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      color: "var(--d-accent)",
                      fontWeight: 400,
                    }}
                  >
                    {activeFilterCount} active
                  </span>
                )}
              </span>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  style={{
                    fontSize: 12,
                    color: "var(--fg-3)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "var(--font-sans)",
                    padding: "4px 8px",
                  }}
                >
                  Clear all
                </button>
              )}
              <button
                onClick={() => setFilterDrawerOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  background: "var(--bg-2)",
                  border: "1px solid var(--line-soft)",
                  color: "var(--fg-2)",
                  cursor: "pointer",
                }}
              >
                <X size={13} />
              </button>
            </div>

            {/* Scrollable filter content */}
            <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px 24px" }}>
              <AdvancedFilters
                filters={filters}
                onChange={handleFiltersChange}
                isAuthenticated={isAuthenticated}
                total={total}
                loading={loading}
                statusCounts={data.statusCounts}
              />
            </div>

            {/* Footer — Done button */}
            <div
              style={{
                padding: "12px 16px",
                borderTop: "1px solid var(--line-soft)",
                flexShrink: 0,
              }}
            >
              <button
                onClick={() => setFilterDrawerOpen(false)}
                style={{
                  width: "100%",
                  height: 44,
                  borderRadius: 10,
                  border: "none",
                  background: total === 0 ? "var(--bg-3)" : "var(--d-accent)",
                  color: total === 0 ? "var(--fg-3)" : "oklch(0.99 0 0)",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                  letterSpacing: "-0.01em",
                  transition: "background 150ms",
                }}
              >
                {total === 0
                  ? "No results — try adjusting filters"
                  : `Show ${total} ${total === 1 ? "company" : "companies"}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
