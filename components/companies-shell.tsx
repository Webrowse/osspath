"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Building2 } from "lucide-react"
import { AppSidebar } from "@/components/app-sidebar"
import { ContentToolbar, type ViewMode } from "@/components/content-toolbar"
import { StatStrip } from "@/components/stat-strip"
import { CompanyRow } from "@/components/company-row"
import { CompanyCard } from "@/components/company-card"
import { Pagination } from "@/components/pagination"
import { useCompanies } from "@/hooks/use-companies"
import type { CompanyListResult } from "@/lib/companies"
import type { CompanyFilters } from "@/types"
import { parseFilters } from "@/types"

interface CompaniesShellProps {
  initialFilters: CompanyFilters
  initialData: CompanyListResult
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

export function CompaniesShell({
  initialFilters,
  initialData,
  isAuthenticated,
}: CompaniesShellProps) {
  const [filters, setFilters] = useState<CompanyFilters>(initialFilters)
  const [view, setView] = useState<ViewMode>("list")
  const [searchValue, setSearchValue] = useState(initialFilters.q)
  const { data, loading } = useCompanies(filters, initialData)
  const searchRef = useRef<HTMLInputElement>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const urlSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  // Debounced URL sync — doesn't trigger Next.js re-render
  const syncUrl = useCallback((f: CompanyFilters) => {
    if (urlSyncTimer.current) clearTimeout(urlSyncTimer.current)
    urlSyncTimer.current = setTimeout(() => {
      const qs = filtersToSearchParams(f)
      window.history.replaceState(null, "", qs ? `/companies?${qs}` : "/companies")
    }, 400)
  }, [])

  // Sync browser back/forward navigation
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
      if (searchTimer.current) clearTimeout(searchTimer.current)
      searchTimer.current = setTimeout(() => {
        const next = { ...filters, q: value, page: 1 }
        setFilters(next)
        syncUrl(next)
      }, 250)
    },
    [filters, syncUrl],
  )

  const handlePageChange = useCallback(
    (page: number) => {
      const next = { ...filters, page }
      setFilters(next)
      syncUrl(next)
    },
    [filters, syncUrl],
  )

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
      {/* Sidebar */}
      <AppSidebar
        filters={filters}
        onFiltersChange={handleFiltersChange}
        isAuthenticated={isAuthenticated}
        total={total}
        loading={loading}
        statusCounts={data.statusCounts}
      />

      {/* Main area */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* KPI strip */}
        <StatStrip statusCounts={data.statusCounts} isAuthenticated={isAuthenticated} />

        {/* Toolbar */}
        <ContentToolbar
          searchValue={searchValue}
          onSearchChange={handleSearchChange}
          searchRef={searchRef}
          view={view}
          onViewChange={setView}
          total={total}
          loading={loading}
        />

        {/* Content */}
        <main style={{ flex: 1, overflowY: "auto", padding: "12px 16px 16px" }}>
          {/* Content header */}
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
                fontSize: 16,
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
            <button
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                height: 28,
                padding: "0 10px",
                borderRadius: 6,
                border: "1px solid var(--line-soft)",
                background: "transparent",
                color: "var(--fg-2)",
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--bg-2)"
                e.currentTarget.style.color = "var(--fg-0)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent"
                e.currentTarget.style.color = "var(--fg-2)"
              }}
            >
              Re-sync
            </button>
            <button
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                height: 28,
                padding: "0 10px",
                borderRadius: 6,
                border: "1px solid var(--d-accent-line)",
                background: "var(--d-accent-soft)",
                color: "var(--d-accent)",
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
                fontWeight: 500,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              + Track company
            </button>
          </div>

          {companies.length === 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: 300,
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
                gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                gap: 12,
                padding: "16px 20px",
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

          <div style={{ padding: "0 0 16px" }}>
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
    </div>
  )
}
