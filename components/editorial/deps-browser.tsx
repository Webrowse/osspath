"use client"

import { useState, useMemo } from "react"
import Link from "next/link"

export type DepEntry = {
  name:       string
  repoCount:  number
  starWeight: number
}

type SortKey = "count" | "stars"

function fmtStar(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`
  return String(n)
}

export function DepsBrowser({ crates }: { crates: DepEntry[] }) {
  const [q,    setQ]    = useState("")
  const [sort, setSort] = useState<SortKey>("count")

  const filtered = useMemo(() => {
    const lc = q.toLowerCase().trim()
    return lc ? crates.filter(c => c.name.includes(lc)) : crates
  }, [crates, q])

  const sorted = useMemo(() =>
    [...filtered].sort((a, b) =>
      sort === "count" ? b.repoCount - a.repoCount : b.starWeight - a.starWeight
    ),
    [filtered, sort]
  )

  const isSearching = q.trim().length > 0

  const top      = !isSearching ? sorted.filter(c => c.repoCount >= 100)  : []
  const emerging = !isSearching ? sorted.filter(c => c.repoCount < 100)   : []

  return (
    <div>
      {/* Search + sort bar */}
      <div className="oss-fb" style={{ position: "static", marginBottom: 32 }}>
        <input
          className="oss-fb-search"
          placeholder="Search crates…"
          value={q}
          onChange={e => setQ(e.target.value)}
          autoComplete="off"
        />
        <div className="oss-fb-dropdowns">
          <span style={{ fontSize: 12, color: "var(--e-fg-mute)", fontFamily: "var(--e-ui)", marginRight: 2 }}>Sort:</span>
          <button
            type="button"
            className={`oss-dd-btn${sort === "count" ? " oss-dd-btn--on" : ""}`}
            onClick={() => setSort("count")}
          >
            Repos
          </button>
          <button
            type="button"
            className={`oss-dd-btn${sort === "stars" ? " oss-dd-btn--on" : ""}`}
            onClick={() => setSort("stars")}
          >
            Stars
          </button>
        </div>
        <span className="oss-fb-count">{sorted.length}</span>
      </div>

      {isSearching ? (
        <div className="deps-grid">
          {sorted.map(c => <DepCard key={c.name} entry={c} />)}
          {sorted.length === 0 && (
            <p style={{ color: "var(--color-muted)", fontSize: 14 }}>No crates match.</p>
          )}
        </div>
      ) : (
        <>
          {top.length > 0 && (
            <section style={{ marginBottom: 48 }}>
              <div className="deps-section-label">Top crates</div>
              <div className="deps-grid">
                {top.map(c => <DepCard key={c.name} entry={c} />)}
              </div>
            </section>
          )}
          {emerging.length > 0 && (
            <section>
              <div className="deps-section-label">Emerging crates</div>
              <div className="deps-grid">
                {emerging.map(c => <DepCard key={c.name} entry={c} />)}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}

function DepCard({ entry }: { entry: DepEntry }) {
  return (
    <Link href={`/deps/${entry.name}`} className="deps-card">
      <span className="deps-card__name">{entry.name}</span>
      <div className="deps-card__meta">
        <span className="deps-card__count">{entry.repoCount} repos</span>
        <span className="deps-card__stars">★ {fmtStar(entry.starWeight)}</span>
      </div>
    </Link>
  )
}
