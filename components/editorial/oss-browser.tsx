"use client"

import { useState, useMemo } from "react"
import { OSSCard } from "./oss-card"
import type { OSSPath } from "@/content/oss-paths"

type SortKey = "stars" | "beginner" | "maintainer" | "issues" | "alpha"
type StarBucket = "any" | "sm" | "md" | "lg" | "xl"

const STAR_BUCKETS: { value: StarBucket; label: string }[] = [
  { value: "any", label: "Any" },
  { value: "sm",  label: "< 1 k" },
  { value: "md",  label: "1 k – 5 k" },
  { value: "lg",  label: "5 k – 20 k" },
  { value: "xl",  label: "20 k +" },
]

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "stars",      label: "Most stars" },
  { value: "beginner",   label: "Beginner-friendly" },
  { value: "maintainer", label: "Maintainer score" },
  { value: "issues",     label: "Issue quality" },
  { value: "alpha",      label: "A → Z" },
]

function starInBucket(stars: number, bucket: StarBucket): boolean {
  if (bucket === "any") return true
  if (bucket === "sm")  return stars < 1000
  if (bucket === "md")  return stars >= 1000 && stars < 5000
  if (bucket === "lg")  return stars >= 5000 && stars < 20000
  return stars >= 20000
}

export function OSSBrowser({ repos }: { repos: OSSPath[] }) {
  const [q, setQ]                       = useState("")
  const [selectedEcos, setSelectedEcos] = useState<Set<string>>(new Set())
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set())
  const [topicSearch, setTopicSearch]   = useState("")
  const [stars, setStars]               = useState<StarBucket>("any")
  const [beginnerOnly, setBeginnerOnly] = useState(false)
  const [sort, setSort]                 = useState<SortKey>("stars")
  const [filtersOpen, setFiltersOpen]   = useState(false)

  const allEcos = useMemo(
    () => [...new Set(repos.map(r => r.eco).filter(Boolean))].sort(),
    [repos]
  )

  const topicFreq = useMemo(() => {
    const freq = new Map<string, number>()
    for (const r of repos) {
      for (const t of r.topics ?? []) {
        if (t === "rust") continue
        freq.set(t, (freq.get(t) ?? 0) + 1)
      }
    }
    return [...freq.entries()].sort((a, b) => b[1] - a[1])
  }, [repos])

  const visibleTopics = useMemo(() => {
    const lc = topicSearch.toLowerCase().trim()
    const list = lc
      ? topicFreq.filter(([t]) => t.includes(lc))
      : topicFreq
    // Always show selected topics even if not in top results
    const topSlice = list.slice(0, 18).map(([t]) => t)
    for (const t of selectedTopics) {
      if (!topSlice.includes(t)) topSlice.push(t)
    }
    return topSlice
  }, [topicFreq, topicSearch, selectedTopics])

  const filtered = useMemo(() => {
    return repos
      .filter(r => {
        if (q) {
          const lc = q.toLowerCase()
          const hit = r.name.toLowerCase().includes(lc)
            || (r.note ?? "").toLowerCase().includes(lc)
            || (r.eco ?? "").toLowerCase().includes(lc)
            || (r.topics ?? []).some(t => t.toLowerCase().includes(lc))
          if (!hit) return false
        }
        if (selectedEcos.size > 0 && !selectedEcos.has(r.eco)) return false
        if (selectedTopics.size > 0 && ![...selectedTopics].every(t => (r.topics ?? []).includes(t))) return false
        if (!starInBucket(r.stars ?? 0, stars)) return false
        if (beginnerOnly && r.beginnerSuitability < 0.65) return false
        return true
      })
      .sort((a, b) => {
        if (sort === "stars")      return (b.stars ?? 0) - (a.stars ?? 0)
        if (sort === "beginner")   return b.beginnerSuitability - a.beginnerSuitability
        if (sort === "maintainer") return b.maintainerFriendliness - a.maintainerFriendliness
        if (sort === "issues")     return b.issueQuality - a.issueQuality
        return a.name.localeCompare(b.name)
      })
  }, [repos, q, selectedEcos, selectedTopics, stars, beginnerOnly, sort])

  const hasFilters = q || selectedEcos.size > 0 || selectedTopics.size > 0 || stars !== "any" || beginnerOnly

  function clearAll() {
    setQ("")
    setSelectedEcos(new Set())
    setSelectedTopics(new Set())
    setTopicSearch("")
    setStars("any")
    setBeginnerOnly(false)
  }

  function toggleSet<T>(prev: Set<T>, val: T): Set<T> {
    const next = new Set(prev)
    next.has(val) ? next.delete(val) : next.add(val)
    return next
  }

  const sidebar = (
    <aside className="oss-sidebar">
      <div className="oss-filters">

        {/* Sort */}
        <div className="oss-filter-group">
          <div className="oss-filter-label">Arrange by</div>
          <select
            className="oss-filter-select"
            value={sort}
            onChange={e => setSort(e.target.value as SortKey)}
          >
            {SORT_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Stars */}
        <div className="oss-filter-group">
          <div className="oss-filter-label">Repo size (stars)</div>
          {STAR_BUCKETS.map(b => (
            <label key={b.value} className="oss-filter-row">
              <input
                type="radio"
                name="stars"
                checked={stars === b.value}
                onChange={() => setStars(b.value)}
                className="oss-filter-radio"
              />
              <span>{b.label}</span>
            </label>
          ))}
        </div>

        {/* Beginner */}
        <div className="oss-filter-group">
          <div className="oss-filter-label">Suitability</div>
          <label className="oss-filter-row">
            <input
              type="checkbox"
              checked={beginnerOnly}
              onChange={e => setBeginnerOnly(e.target.checked)}
              className="oss-filter-radio"
            />
            <span>Beginner-friendly only</span>
          </label>
        </div>

        {/* Ecosystem */}
        <div className="oss-filter-group">
          <div className="oss-filter-label">Ecosystem</div>
          {allEcos.map(eco => (
            <label key={eco} className="oss-filter-row">
              <input
                type="checkbox"
                checked={selectedEcos.has(eco)}
                onChange={() => setSelectedEcos(prev => toggleSet(prev, eco))}
                className="oss-filter-radio"
              />
              <span className="oss-filter-eco">{eco}</span>
            </label>
          ))}
        </div>

        {/* Topics / Dependencies */}
        <div className="oss-filter-group">
          <div className="oss-filter-label">Dependencies & topics</div>
          <input
            className="oss-filter-input"
            placeholder="axum, diesel, tokio…"
            value={topicSearch}
            onChange={e => setTopicSearch(e.target.value)}
          />
          <div className="oss-topic-list">
            {visibleTopics.map(topic => {
              const count = topicFreq.find(([t]) => t === topic)?.[1] ?? 0
              return (
                <label key={topic} className="oss-filter-row">
                  <input
                    type="checkbox"
                    checked={selectedTopics.has(topic)}
                    onChange={() => setSelectedTopics(prev => toggleSet(prev, topic))}
                    className="oss-filter-radio"
                  />
                  <span style={{ flex: 1 }}>{topic}</span>
                  <span className="oss-filter-count">{count}</span>
                </label>
              )
            })}
          </div>
        </div>

        {hasFilters && (
          <button className="oss-filter-clear" onClick={clearAll}>
            ✕ Clear all filters
          </button>
        )}
      </div>
    </aside>
  )

  return (
    <div>
      {/* Top bar */}
      <div className="oss-topbar">
        <input
          className="oss-search"
          placeholder="Search repos, topics, notes…"
          value={q}
          onChange={e => setQ(e.target.value)}
        />
        <div className="oss-topbar-meta">
          <span className="e-section__meta">
            {filtered.length}{hasFilters ? ` of ${repos.length}` : ""}{" "}
            {filtered.length === 1 ? "repository" : "repositories"}
          </span>
          <button
            className="oss-filter-toggle-btn"
            onClick={() => setFiltersOpen(v => !v)}
            aria-expanded={filtersOpen}
          >
            {filtersOpen ? "Hide filters" : "Filters"}
            {(selectedEcos.size + selectedTopics.size) > 0 && (
              <span className="oss-filter-badge">
                {selectedEcos.size + selectedTopics.size}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Layout */}
      <div className={`oss-browser${filtersOpen ? " oss-browser--open" : ""}`}>
        {sidebar}

        <div>
          {filtered.length > 0 ? (
            <div className="e-oss-grid">
              {filtered.map(repo => (
                <OSSCard key={repo.name} repo={repo} />
              ))}
            </div>
          ) : (
            <div className="e-archive-empty">
              No repositories match your filters.{" "}
              {hasFilters && (
                <button
                  className="oss-filter-clear"
                  style={{ display: "inline", marginLeft: 4 }}
                  onClick={clearAll}
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
