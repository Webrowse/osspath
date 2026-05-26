"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
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
import type { CompanyFilters } from "@/types"
import { parseFilters } from "@/types"

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

export function CompaniesShell({
  initialFilters,
  initialData,
  isAuthenticated,
}: CompaniesShellProps) {
  const [filters, setFilters] = useState<CompanyFilters>(initialFilters)
  const [view, setView] = useState<ViewMode>("list")
  const [searchValue, setSearchValue] = useState(initialFilters.q)
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)

  const { data, loading } = useCompanies(filters, initialData)
  const searchRef = useRef<HTMLInputElement>(null)
  const urlSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const filtersRef = useRef(filters)
  filtersRef.current = filters

  const activeFilterCount = useMemo(() => countActiveFilters(filters), [filters])

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

  useEffect(() => {
    const onPop = () => {
      const params: Record<string, string | string[]> = {}
      new URLSearchParams(window.location.search).forEach((value, key) => {
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
    }
    window.addEventListener("popstate", onPop)
    return () => window.removeEventListener("popstate", onPop)
  }, [])

  const handleFiltersChange = useCallback(
    (next: CompanyFilters) => {
      setFilters(next)
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
        <StatStrip statusCounts={data.statusCounts} isAuthenticated={isAuthenticated} />

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
              }}
            >
              <Building2 size={28} style={{ opacity: 0.25 }} />
              <p style={{ fontSize: 14, fontWeight: 500, color: "var(--fg-2)", margin: 0 }}>
                No companies matched
              </p>
              <p style={{ fontSize: 12.5, color: "var(--fg-3)", margin: 0 }}>
                Try adjusting your filters
              </p>
              {activeFilterCount > 0 && (
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
                  Clear filters
                </button>
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
                  background: "var(--d-accent)",
                  color: "oklch(0.99 0 0)",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                  letterSpacing: "-0.01em",
                }}
              >
                {total === 0
                  ? "No results"
                  : `Show ${total} ${total === 1 ? "company" : "companies"}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
