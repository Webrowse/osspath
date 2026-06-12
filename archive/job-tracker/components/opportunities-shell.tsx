"use client"

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Search, X } from "lucide-react"
import { usePostHog } from "posthog-js/react"
import Link from "next/link"
import { OpportunityRow } from "@/components/opportunity-row"
import type { OpportunityListItem } from "@/lib/opportunities"

export interface OppShellFilters {
  q: string
  rust: string
  level: string
  remote: boolean
  junior: boolean
  oss: boolean
  source: string
  sort: string
}

interface OpportunitiesShellProps {
  filters: OppShellFilters
  items: OpportunityListItem[]
  total: number
  page: number
  totalPages: number
}

function buildQS(
  filters: OppShellFilters,
  overrides: Partial<OppShellFilters & { page: number }>,
): string {
  const f = { ...filters, ...overrides }
  const p = new URLSearchParams()
  if (f.q) p.set("q", f.q)
  if (f.rust) p.set("rust", f.rust)
  if (f.level) p.set("level", f.level)
  if (f.remote) p.set("remote", "1")
  if (f.junior) p.set("junior", "1")
  if (f.oss) p.set("oss", "1")
  if (f.source) p.set("source", f.source)
  if (f.sort && f.sort !== "quality") p.set("sort", f.sort)
  const pg = overrides.page ?? 1
  if (pg > 1) p.set("page", String(pg))
  return p.toString()
}

// Preset discovery queues — named filter combinations that feel operational, not generic.
const QUEUES: { label: string; desc: string; qs: string; accent: string }[] = [
  {
    label: "Beginner Remote",
    desc: "Junior/intern-friendly roles with remote + junior-friendly flags",
    qs: "remote=1&junior=1&sort=quality",
    accent: "var(--d-accent)",
  },
  {
    label: "🦀 Core Rust",
    desc: "Only roles where Rust is the primary language",
    qs: "rust=CORE&sort=quality",
    accent: "var(--d-rust)",
  },
  {
    label: "OSS Path",
    desc: "Roles at companies with open-source contribution paths",
    qs: "oss=1&sort=quality",
    accent: "oklch(0.72 0.14 290)",
  },
  {
    label: "Recently Posted",
    desc: "Newest listings first — catch fresh openings",
    qs: "sort=newest",
    accent: "var(--d-ok)",
  },
  {
    label: "Remote Core",
    desc: "Remote-only Rust-core roles — highest signal",
    qs: "rust=CORE&remote=1&sort=quality",
    accent: "var(--d-rust)",
  },
  {
    label: "Jr-Friendly",
    desc: "Companies explicitly welcoming junior engineers",
    qs: "junior=1&sort=quality",
    accent: "oklch(0.75 0.14 225)",
  },
]

export function OpportunitiesShell({
  filters,
  items,
  total,
  page,
  totalPages,
}: OpportunitiesShellProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const ph = usePostHog()

  const [searchValue, setSearchValue] = useState(filters.q)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync input with back/forward navigation
  useEffect(() => {
    setSearchValue(filters.q)
  }, [filters.q])

  // Stable ref always includes live searchValue so chip clicks don't lose in-flight search text
  const filtersRef = useRef(filters)
  filtersRef.current = { ...filters, q: searchValue }

  const go = useCallback(
    (qs: string) => {
      startTransition(() => {
        router.push(qs ? `/opportunities?${qs}` : "/opportunities")
      })
    },
    [router],
  )

  const update = useCallback(
    (key: keyof OppShellFilters | "page", val: string | boolean | number | null) => {
      const overrides: Partial<OppShellFilters & { page: number }> = {}
      if (key === "page") {
        overrides.page = val as number
      } else {
        (overrides as Record<string, unknown>)[key] = val ?? ""
        overrides.page = 1
      }
      if (val && key !== "page") {
        ph?.capture("opportunity_filter_changed", {
          filter_key: key,
          filter_value: val,
          total_results: total,
        })
      }
      go(buildQS(filtersRef.current, overrides))
    },
    [go, ph, total],
  )

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value
      setSearchValue(val)
      if (searchTimer.current) clearTimeout(searchTimer.current)
      searchTimer.current = setTimeout(() => {
        go(buildQS(filtersRef.current, { q: val, page: 1 }))
      }, 350)
    },
    [go],
  )

  const clearSearch = useCallback(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    setSearchValue("")
    go(buildQS(filtersRef.current, { q: "", page: 1 }))
  }, [go])

  const hasFilters = !!(
    filters.q || filters.rust || filters.level ||
    filters.remote || filters.junior || filters.oss || filters.source
  )

  const clearAll = useCallback(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    setSearchValue("")
    go(
      buildQS(
        { q: "", rust: "", level: "", remote: false, junior: false, oss: false, source: "", sort: filtersRef.current.sort },
        {},
      ),
    )
  }, [go])

  // Optimistic local filter: instantly narrows visible rows while server fetch is in-flight.
  // Applies to title + companyName only (mirrors the server-side search columns).
  const optimisticItems = useMemo(() => {
    const q = searchValue.trim().toLowerCase()
    if (!q) return items
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.companyName.toLowerCase().includes(q),
    )
  }, [items, searchValue])

  // Show optimistic count when user has typed ahead of confirmed server state
  const displayTotal = searchValue !== filters.q ? optimisticItems.length : total

  const isEmpty = optimisticItems.length === 0

  return (
    <div>
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
          Rust Opportunities
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
            transition: "opacity 120ms",
            opacity: isPending ? 0.5 : 1,
          }}
        >
          {displayTotal}
        </span>
        <div style={{ flex: 1 }} />
        <Link
          href="/sources"
          style={{
            fontSize: 11,
            color: "var(--fg-3)",
            textDecoration: "none",
            fontFamily: "var(--font-mono)",
            whiteSpace: "nowrap",
          }}
        >
          sources →
        </Link>
      </div>

      {/* Beginner pathway callout — first-time user orientation */}
      {!hasFilters && (
        <div
          style={{
            padding: "9px 12px",
            borderRadius: 7,
            border: "1px solid color-mix(in oklch, var(--d-accent), transparent 65%)",
            background: "var(--d-accent-soft)",
            marginBottom: 10,
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: 12, color: "var(--fg-2)", flex: 1, minWidth: 160 }}>
            <span style={{ fontWeight: 600, color: "var(--fg-0)" }}>First Rust job?</span>
            {" "}Start with beginner-remote roles or OSS contribution paths — both have lower barriers than direct senior applications.
          </span>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", flexShrink: 0 }}>
            <button
              onClick={() => go("remote=1&junior=1&sort=quality")}
              style={{
                height: 24,
                padding: "0 10px",
                borderRadius: 5,
                border: "1px solid var(--d-accent-line)",
                background: "transparent",
                color: "var(--d-accent)",
                fontSize: 11.5,
                fontFamily: "var(--font-mono)",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Beginner Remote →
            </button>
            <button
              onClick={() => go("oss=1&sort=quality")}
              style={{
                height: 24,
                padding: "0 10px",
                borderRadius: 5,
                border: "1px solid oklch(0.72 0.14 290 / 0.3)",
                background: "transparent",
                color: "oklch(0.72 0.14 290)",
                fontSize: 11.5,
                fontFamily: "var(--font-mono)",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              OSS Path →
            </button>
          </div>
        </div>
      )}

      {/* Discovery queues — shown when no filters active */}
      {!hasFilters && (
        <div style={{ marginBottom: 10 }}>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "var(--fg-4)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              marginBottom: 5,
            }}
          >
            Queues
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {QUEUES.map((q) => (
              <button
                key={q.qs}
                title={q.desc}
                onClick={() => go(q.qs)}
                style={{
                  height: 24,
                  padding: "0 9px",
                  borderRadius: 5,
                  border: "1px solid var(--line-soft)",
                  background: "var(--bg-1)",
                  color: "var(--fg-2)",
                  fontSize: 11.5,
                  fontFamily: "var(--font-mono)",
                  cursor: "pointer",
                  transition: "border-color 100ms, color 100ms, background 100ms",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = q.accent
                  e.currentTarget.style.color = q.accent
                  e.currentTarget.style.background = "var(--bg-2)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--line-soft)"
                  e.currentTarget.style.color = "var(--fg-2)"
                  e.currentTarget.style.background = "var(--bg-1)"
                }}
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div
        style={{
          padding: "8px 10px",
          background: "var(--bg-1)",
          border: "1px solid var(--line-soft)",
          borderRadius: 8,
          marginBottom: 8,
          display: "flex",
          flexDirection: "column",
          gap: 7,
          opacity: isPending ? 0.65 : 1,
          transition: "opacity 150ms",
        }}
      >
        {/* Search row */}
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
            <Search
              size={12}
              style={{
                position: "absolute",
                left: 9,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--fg-3)",
                pointerEvents: "none",
              }}
            />
            <input
              type="search"
              value={searchValue}
              onChange={handleSearchChange}
              placeholder="Search role, company…"
              style={{
                width: "100%",
                height: 30,
                padding: "0 26px 0 27px",
                borderRadius: 6,
                border: "1px solid var(--line-soft)",
                background: "var(--bg-2)",
                color: "var(--fg-0)",
                fontSize: 12.5,
                fontFamily: "var(--font-sans)",
                outline: "none",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--line)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--line-soft)")}
            />
            {searchValue && (
              <button
                onClick={clearSearch}
                style={{
                  position: "absolute",
                  right: 7,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--fg-3)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  padding: 2,
                }}
              >
                <X size={11} />
              </button>
            )}
          </div>

          <select
            value={filters.sort || "quality"}
            onChange={(e) => update("sort", e.target.value)}
            style={{
              height: 30,
              padding: "0 7px",
              borderRadius: 6,
              border: "1px solid var(--line-soft)",
              background: "var(--bg-2)",
              color: "var(--fg-1)",
              fontSize: 12,
              cursor: "pointer",
              outline: "none",
              fontFamily: "var(--font-sans)",
              flexShrink: 0,
            }}
          >
            <option value="quality">Best match</option>
            <option value="newest">Newest first</option>
          </select>

          {hasFilters && (
            <button
              onClick={clearAll}
              style={{
                height: 30,
                padding: "0 9px",
                borderRadius: 6,
                border: "1px solid var(--line-soft)",
                background: "transparent",
                color: "var(--fg-3)",
                fontSize: 11.5,
                cursor: "pointer",
                fontFamily: "var(--font-mono)",
                flexShrink: 0,
              }}
            >
              clear
            </button>
          )}
        </div>

        {/* Filter chips */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
          <Chip
            label="🦀 Core"
            active={filters.rust === "CORE"}
            onClick={() => update("rust", filters.rust === "CORE" ? "" : "CORE")}
            activeColor="var(--d-rust)"
            activeBg="color-mix(in oklch, var(--d-rust), transparent 88%)"
            activeBorder="color-mix(in oklch, var(--d-rust), transparent 55%)"
          />
          <Chip
            label="High"
            active={filters.rust === "HIGH"}
            onClick={() => update("rust", filters.rust === "HIGH" ? "" : "HIGH")}
            activeColor="oklch(0.78 0.13 65)"
            activeBg="oklch(0.78 0.13 65 / 0.10)"
            activeBorder="oklch(0.78 0.13 65 / 0.32)"
          />
          <Sep />
          <Chip
            label="Junior"
            active={filters.level === "JUNIOR"}
            onClick={() => update("level", filters.level === "JUNIOR" ? "" : "JUNIOR")}
          />
          <Chip
            label="Mid"
            active={filters.level === "MID"}
            onClick={() => update("level", filters.level === "MID" ? "" : "MID")}
          />
          <Chip
            label="Senior"
            active={filters.level === "SENIOR"}
            onClick={() => update("level", filters.level === "SENIOR" ? "" : "SENIOR")}
          />
          <Sep />
          <Chip
            label="Remote"
            active={filters.remote}
            onClick={() => update("remote", !filters.remote)}
            activeColor="var(--d-ok)"
            activeBg="color-mix(in oklch, var(--d-ok), transparent 88%)"
            activeBorder="color-mix(in oklch, var(--d-ok), transparent 55%)"
          />
          <Chip
            label="Jr-friendly"
            active={filters.junior}
            onClick={() => update("junior", !filters.junior)}
            activeColor="var(--d-accent)"
            activeBg="var(--d-accent-soft)"
            activeBorder="var(--d-accent-line)"
          />
          <Chip
            label="OSS path"
            active={filters.oss}
            onClick={() => update("oss", !filters.oss)}
            activeColor="oklch(0.72 0.14 290)"
            activeBg="oklch(0.72 0.14 290 / 0.10)"
            activeBorder="oklch(0.72 0.14 290 / 0.28)"
          />
          <Chip
            label="Curated"
            active={filters.source === "CURATED"}
            onClick={() => update("source", filters.source === "CURATED" ? "" : "CURATED")}
            activeColor="oklch(0.65 0.12 310)"
            activeBg="oklch(0.65 0.12 310 / 0.10)"
            activeBorder="oklch(0.65 0.12 310 / 0.28)"
          />
        </div>
      </div>

      {/* Results */}
      <div
        style={{
          // Only dim during pending when the optimistic filter matches the confirmed state.
          // If user is ahead of server (typing), optimistic results are fresh — don't dim them.
          opacity: isPending && searchValue === filters.q ? 0.4 : 1,
          transition: "opacity 220ms",
        }}
      >
        {isEmpty ? (
          <div style={{ padding: "52px 0", textAlign: "center" }}>
            <p style={{ fontSize: 13, color: "var(--fg-3)", margin: 0 }}>
              No opportunities match your filters.
            </p>
            {(hasFilters || searchValue) && (
              <button
                onClick={clearAll}
                style={{
                  marginTop: 12,
                  padding: "5px 14px",
                  borderRadius: 6,
                  border: "1px solid var(--line-soft)",
                  background: "transparent",
                  color: "var(--fg-2)",
                  fontSize: 12,
                  cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                }}
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div
            style={{
              borderRadius: 8,
              border: "1px solid var(--line-soft)",
              overflow: "hidden",
              background: "var(--bg-1)",
            }}
          >
            {optimisticItems.map((opp, idx) => (
              <OpportunityRow
                key={opp.id}
                id={opp.id}
                position={(page - 1) * 20 + idx + 1}
                source={opp.source}
                title={opp.title}
                companyName={opp.companyName}
                companySlug={opp.company?.slug}
                companyLogoUrl={opp.company?.logoUrl}
                sourceUrl={opp.sourceUrl}
                rustSignal={opp.rustSignal}
                experienceLevel={opp.experienceLevel}
                isRemote={opp.isRemote}
                isJuniorFriendly={opp.isJuniorFriendly}
                hasOssPath={opp.hasOssPath}
                salary={opp.salary}
                location={opp.location}
                postedAt={opp.postedAt}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 16,
            paddingTop: 12,
            borderTop: "1px solid var(--line-soft)",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--fg-3)",
            }}
          >
            {page} / {totalPages}
          </span>
          <div style={{ display: "flex", gap: 6 }}>
            {page > 1 && (
              <PageBtn
                label="← prev"
                onClick={() => go(buildQS(filtersRef.current, { page: page - 1 }))}
              />
            )}
            {page < totalPages && (
              <PageBtn
                label="next →"
                onClick={() => go(buildQS(filtersRef.current, { page: page + 1 }))}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Sep() {
  return (
    <div
      style={{ width: 1, height: 14, background: "var(--line-soft)", flexShrink: 0 }}
    />
  )
}

function Chip({
  label,
  active,
  onClick,
  activeColor = "var(--fg-1)",
  activeBg = "var(--bg-3)",
  activeBorder = "var(--line)",
}: {
  label: string
  active: boolean
  onClick: () => void
  activeColor?: string
  activeBg?: string
  activeBorder?: string
}) {
  return (
    <button
      onClick={onClick}
      style={{
        height: 22,
        padding: "0 8px",
        borderRadius: 20,
        border: `1px solid ${active ? activeBorder : "var(--line-soft)"}`,
        background: active ? activeBg : "transparent",
        color: active ? activeColor : "var(--fg-3)",
        fontSize: 11.5,
        fontFamily: "var(--font-mono)",
        cursor: "pointer",
        transition: "border-color 100ms, background 100ms, color 100ms",
        fontWeight: active ? 500 : 400,
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      {label}
    </button>
  )
}

function PageBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        height: 28,
        padding: "0 10px",
        borderRadius: 6,
        border: "1px solid var(--line-soft)",
        background: "var(--bg-2)",
        color: "var(--fg-1)",
        fontSize: 12,
        fontFamily: "var(--font-mono)",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  )
}
