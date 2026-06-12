"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useRef, useState, useTransition } from "react"
import { usePostHog } from "posthog-js/react"

interface OpportunitiesFiltersProps {
  total: number
}

export function OpportunitiesFilters({ total }: OpportunitiesFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const ph = usePostHog()

  const update = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      params.delete("page")
      if (value) {
        ph?.capture("opportunity_filter_changed", {
          filter_key: key,
          filter_value: value,
          total_results: total,
        })
      }
      startTransition(() => {
        router.push(`/opportunities?${params.toString()}`)
      })
    },
    [router, searchParams, ph, total]
  )

  const get = (key: string) => searchParams.get(key) ?? ""

  const rust = get("rust")
  const level = get("level")
  const remote = get("remote")
  const junior = get("junior")
  const sort = get("sort") || "quality"
  const q = get("q")

  // Controlled search input with debounce — avoids a server round-trip per keystroke
  // and stays in sync with URL on back/forward navigation.
  const [searchValue, setSearchValue] = useState(q)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setSearchValue(q)
  }, [q])

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value
      setSearchValue(val)
      if (searchTimer.current) clearTimeout(searchTimer.current)
      searchTimer.current = setTimeout(() => {
        update("q", val || null)
      }, 350)
    },
    [update],
  )

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        opacity: isPending ? 0.6 : 1,
        transition: "opacity 0.15s",
      }}
    >
      {/* Search + sort row */}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          type="search"
          placeholder="Search by company, role…"
          value={searchValue}
          onChange={handleSearchChange}
          className="opp-filter-input"
          style={{
            flex: 1,
            height: 32,
            padding: "0 10px",
            borderRadius: 6,
            border: "1px solid var(--border)",
            background: "var(--secondary)",
            color: "var(--foreground)",
            fontSize: 13,
            outline: "none",
          }}
        />
        <select
          value={sort}
          onChange={(e) => update("sort", e.target.value === "quality" ? null : e.target.value)}
          style={{
            height: 32,
            padding: "0 8px",
            borderRadius: 6,
            border: "1px solid var(--border)",
            background: "var(--secondary)",
            color: "var(--foreground)",
            fontSize: 12,
            cursor: "pointer",
            outline: "none",
          }}
        >
          <option value="quality">Best match</option>
          <option value="newest">Newest first</option>
        </select>
      </div>

      {/* Filter chips */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        <FilterChip
          label="Rust Core"
          active={rust === "CORE"}
          onClick={() => update("rust", rust === "CORE" ? null : "CORE")}
        />
        <FilterChip
          label="Heavy Rust"
          active={rust === "HIGH"}
          onClick={() => update("rust", rust === "HIGH" ? null : "HIGH")}
        />
        <FilterChip
          label="Junior"
          active={level === "JUNIOR"}
          onClick={() => update("level", level === "JUNIOR" ? null : "JUNIOR")}
        />
        <FilterChip
          label="Mid-level"
          active={level === "MID"}
          onClick={() => update("level", level === "MID" ? null : "MID")}
        />
        <FilterChip
          label="Senior"
          active={level === "SENIOR"}
          onClick={() => update("level", level === "SENIOR" ? null : "SENIOR")}
        />
        <FilterChip
          label="Remote only"
          active={remote === "1"}
          onClick={() => update("remote", remote === "1" ? null : "1")}
        />
        <FilterChip
          label="Junior friendly"
          active={junior === "1"}
          onClick={() => update("junior", junior === "1" ? null : "1")}
        />

        {/* Clear all */}
        {(rust || level || remote || junior || q) && (
          <button
            onClick={() => {
              startTransition(() => router.push("/opportunities"))
            }}
            style={{
              height: 26,
              padding: "0 10px",
              borderRadius: 20,
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--muted-foreground)",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Clear
          </button>
        )}

        <span
          style={{
            marginLeft: "auto",
            fontSize: 12,
            color: "var(--muted-foreground)",
            alignSelf: "center",
          }}
        >
          {total} {total === 1 ? "opportunity" : "opportunities"}
        </span>
      </div>
    </div>
  )
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        height: 26,
        padding: "0 10px",
        borderRadius: 20,
        border: `1px solid ${active ? "var(--ring)" : "var(--border)"}`,
        background: active ? "var(--muted)" : "transparent",
        color: active ? "var(--foreground)" : "var(--muted-foreground)",
        fontSize: 12,
        cursor: "pointer",
        transition: "all 0.1s",
        fontWeight: active ? 500 : 400,
      }}
    >
      {label}
    </button>
  )
}
