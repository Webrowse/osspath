"use client"

import { useState, useMemo } from "react"
import { OSSCard } from "./oss-card"
import type { OSSPath } from "@/content/oss-paths"

// ── Types ──────────────────────────────────────────────────────────────────

type SortKey      = "stars-desc" | "stars-asc" | "forks-desc" | "updated" | "issues"
type StarBucketKey = "any" | "20-59" | "60-99" | "100-499" | "500-1999" | "2000-9999" | "10000+"

// ── Normalization ──────────────────────────────────────────────────────────

export interface NormalizedRepo extends OSSPath {
  stars:           number
  forks:           number
  openIssuesCount: number
  topics:          string[]
  owner:           string
  language:        string
  license:         string
  activityTier:    "active" | "maintenance" | "dormant"
  dependencies:    string[]
}

function normalize(r: OSSPath): NormalizedRepo {
  return {
    ...r,
    stars:           r.stars           ?? 0,
    forks:           r.forks           ?? 0,
    openIssuesCount: r.openIssuesCount ?? 0,
    topics:          r.topics          ?? [],
    owner:           r.owner           ?? "unknown",
    language:        r.language        ?? "unknown",
    license:         r.license         ?? "unknown",
    activityTier:    (r.activityTier as "active" | "maintenance" | "dormant") ?? "dormant",
    dependencies:    r.dependencies    ?? [],
  }
}

// ── Constants ──────────────────────────────────────────────────────────────

const STAR_BUCKETS: { key: StarBucketKey; label: string; lo: number; hi: number }[] = [
  { key: "any",        label: "Any",            lo: 0,     hi: Infinity },
  { key: "20-59",      label: "20 – 59",        lo: 20,    hi: 59 },
  { key: "60-99",      label: "60 – 99",        lo: 60,    hi: 99 },
  { key: "100-499",    label: "100 – 499",      lo: 100,   hi: 499 },
  { key: "500-1999",   label: "500 – 1,999",    lo: 500,   hi: 1999 },
  { key: "2000-9999",  label: "2,000 – 9,999",  lo: 2000,  hi: 9999 },
  { key: "10000+",     label: "10,000+",         lo: 10000, hi: Infinity },
]

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "stars-desc", label: "Most stars" },
  { value: "stars-asc",  label: "Fewest stars" },
  { value: "forks-desc", label: "Most forks" },
  { value: "updated",    label: "Recently updated" },
  { value: "issues",     label: "Most open issues" },
]

const ACTIVITY_OPTIONS: { value: string; label: string }[] = [
  { value: "active",      label: "Active" },
  { value: "maintenance", label: "Maintenance" },
]

// ── Helpers ────────────────────────────────────────────────────────────────

function toggleSet<T>(prev: Set<T>, val: T): Set<T> {
  const next = new Set(prev)
  if (next.has(val)) next.delete(val); else next.add(val)
  return next
}

function buildFilter(
  items: NormalizedRepo[],
  opts: {
    q: string
    selectedActivity:  Set<string>
    selectedLanguages: Set<string>
    selectedLicenses:  Set<string>
    selectedOwners:    Set<string>
    selectedTopics:    Set<string>
    selectedDeps:      Set<string>
    star?: { lo: number; hi: number }
  }
): NormalizedRepo[] {
  const { q, selectedActivity, selectedLanguages, selectedLicenses,
          selectedOwners, selectedTopics, selectedDeps, star } = opts
  return items.filter(r => {
    if (q) {
      const lc = q.toLowerCase()
      const hit = r.name.toLowerCase().includes(lc)
        || r.owner.toLowerCase().includes(lc)
        || r.topics.some(t => t.toLowerCase().includes(lc))
      if (!hit) return false
    }
    if (star != null && (r.stars < star.lo || r.stars > star.hi)) return false
    if (selectedActivity.size  > 0 && !selectedActivity.has(r.activityTier)) return false
    if (selectedLanguages.size > 0 && !selectedLanguages.has(r.language))    return false
    if (selectedLicenses.size  > 0 && !selectedLicenses.has(r.license))      return false
    if (selectedOwners.size    > 0 && !selectedOwners.has(r.owner))          return false
    if (selectedTopics.size    > 0 &&
        ![...selectedTopics].every(t => r.topics.includes(t))) return false
    if (selectedDeps.size      > 0 &&
        ![...selectedDeps].every(d => r.dependencies.includes(d))) return false
    return true
  })
}

function buildFacets(items: NormalizedRepo[]) {
  const activity:  Record<string, number> = {}
  const languages: Record<string, number> = {}
  const licenses:  Record<string, number> = {}
  const owners:    Record<string, number> = {}
  const topics:    Record<string, number> = {}

  for (const r of items) {
    activity[r.activityTier] = (activity[r.activityTier] ?? 0) + 1
    if (r.language) languages[r.language] = (languages[r.language] ?? 0) + 1
    if (r.license && r.license !== "unknown") {
      licenses[r.license] = (licenses[r.license] ?? 0) + 1
    }
    if (r.owner && r.owner !== "unknown") {
      owners[r.owner] = (owners[r.owner] ?? 0) + 1
    }
    for (const t of r.topics) {
      if (t === "rust") continue
      topics[t] = (topics[t] ?? 0) + 1
    }
  }

  const sort = (obj: Record<string, number>) =>
    Object.entries(obj).sort((a, b) => b[1] - a[1])

  return {
    activity:  sort(activity),
    languages: sort(languages),
    licenses:  sort(licenses),
    owners:    sort(owners),
    topics:    sort(topics),
  }
}

// ── Main component ─────────────────────────────────────────────────────────

export function OSSBrowser({
  repos,
  depPageCounts,
}: {
  repos: OSSPath[]
  depPageCounts?: Record<string, number>
}) {
  const normalized = useMemo(() => repos.map(normalize), [repos])

  // Filter state
  const [q,                 setQ]                 = useState("")
  const [starBucket,        setStarBucket]        = useState<StarBucketKey>("any")
  const [selectedActivity,  setSelectedActivity]  = useState<Set<string>>(new Set())
  const [selectedLanguages, setSelectedLanguages] = useState<Set<string>>(new Set())
  const [selectedLicenses,  setSelectedLicenses]  = useState<Set<string>>(new Set())
  const [selectedOwners,    setSelectedOwners]    = useState<Set<string>>(new Set())
  const [selectedTopics,    setSelectedTopics]    = useState<Set<string>>(new Set())
  const [topicSearch,       setTopicSearch]       = useState("")
  const [ownerSearch,       setOwnerSearch]       = useState("")
  const [selectedDeps,      setSelectedDeps]      = useState<Set<string>>(new Set())
  const [depSearch,         setDepSearch]         = useState("")
  const [sort,              setSort]              = useState<SortKey>("stars-desc")
  const [filtersOpen,       setFiltersOpen]       = useState(false)

  // Shared filter options (everything except star bucket) — for bucket count computation
  const filterOpts = {
    q, selectedActivity, selectedLanguages, selectedLicenses,
    selectedOwners, selectedTopics, selectedDeps,
  }

  // Active bucket object; undefined when "any" so buildFilter skips the star check
  const activeBucket = starBucket === "any"
    ? undefined
    : STAR_BUCKETS.find(b => b.key === starBucket)

  // Full filtered set — drives card display and non-star facets
  const filtered = useMemo(
    () => buildFilter(normalized, { ...filterOpts, star: activeBucket }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [normalized, q, starBucket, selectedActivity, selectedLanguages,
     selectedLicenses, selectedOwners, selectedTopics, selectedDeps]
  )

  // Filtered set WITHOUT the star constraint — drives bucket counts
  const filteredNoStars = useMemo(
    () => buildFilter(normalized, { ...filterOpts }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [normalized, q, selectedActivity, selectedLanguages,
     selectedLicenses, selectedOwners, selectedTopics, selectedDeps]
  )

  // Sorted result — final display order
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sort === "stars-desc") return b.stars - a.stars
      if (sort === "stars-asc")  return a.stars - b.stars
      if (sort === "forks-desc") return b.forks - a.forks
      if (sort === "updated")
        return (b.pushedAt ?? "").localeCompare(a.pushedAt ?? "")
      if (sort === "issues") return b.openIssuesCount - a.openIssuesCount
      return 0
    })
  }, [filtered, sort])

  // Facets from the filtered set (reflect currently applied filters)
  const facets = useMemo(() => buildFacets(filtered), [filtered])

  // Per-bucket counts from the no-star-filter set — each count is repos inside that bucket only
  const bucketCounts = useMemo(() =>
    STAR_BUCKETS.map(b => ({
      ...b,
      count: b.key === "any"
        ? filteredNoStars.length
        : filteredNoStars.filter(r => r.stars >= b.lo && r.stars <= b.hi).length,
    })),
    [filteredNoStars]
  )

  // Visible topics (top 20 + selected always shown)
  const visibleTopics = useMemo(() => {
    const lc = topicSearch.toLowerCase().trim()
    const list = lc
      ? facets.topics.filter(([t]) => t.includes(lc))
      : facets.topics
    const slice = list.slice(0, 20).map(([t]) => t)
    for (const t of selectedTopics) {
      if (!slice.includes(t)) slice.push(t)
    }
    return slice
  }, [facets.topics, topicSearch, selectedTopics])

  // Visible owners (top 12 + selected always shown)
  const visibleOwners = useMemo(() => {
    const lc = ownerSearch.toLowerCase().trim()
    const list = lc
      ? facets.owners.filter(([o]) => o.toLowerCase().includes(lc))
      : facets.owners
    const slice = list.slice(0, 12).map(([o]) => o)
    for (const o of selectedOwners) {
      if (!slice.includes(o)) slice.push(o)
    }
    return slice
  }, [facets.owners, ownerSearch, selectedOwners])

  // Global dep counts — over the full corpus, used as a noise gate.
  // A crate must appear in >= 6 repos globally to show in the default facet,
  // and in >= 2 repos globally to appear in search results.
  // Computed once from normalized (stable after mount).
  const globalDepCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const r of normalized) {
      for (const d of r.dependencies) {
        counts[d] = (counts[d] ?? 0) + 1
      }
    }
    return counts
  }, [normalized])

  // Dependency facets — top crates by frequency across current filtered set
  const depFacets = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const r of filtered) {
      for (const d of r.dependencies) {
        counts[d] = (counts[d] ?? 0) + 1
      }
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1])
  }, [filtered])

  // Visible deps with noise gate:
  //   default  → global count >= 6  (hides internal workspace / monorepo-only crates)
  //   search   → global count >= 2  (hides pure singletons, surfaces niche real crates)
  //   selected → always shown so they can be deselected
  const visibleDeps = useMemo(() => {
    const lc      = depSearch.toLowerCase().trim()
    const minFreq = lc ? 2 : 6
    const list    = depFacets.filter(
      ([d]) => (globalDepCounts[d] ?? 0) >= minFreq && (!lc || d.includes(lc))
    )
    const slice = list.slice(0, 40).map(([d]) => d)
    for (const d of selectedDeps) {
      if (!slice.includes(d)) slice.push(d)
    }
    return slice
  }, [depFacets, depSearch, selectedDeps, globalDepCounts])

  // Active filter count (for mobile badge)
  const activeFilterCount =
    (starBucket !== "any" ? 1 : 0) +
    selectedActivity.size  +
    selectedLanguages.size +
    selectedLicenses.size  +
    selectedOwners.size    +
    selectedTopics.size    +
    selectedDeps.size

  const hasFilters = q !== "" || activeFilterCount > 0

  function clearAll() {
    setQ("")
    setStarBucket("any")
    setSelectedActivity(new Set())
    setSelectedLanguages(new Set())
    setSelectedLicenses(new Set())
    setSelectedOwners(new Set())
    setSelectedTopics(new Set())
    setSelectedDeps(new Set())
    setTopicSearch("")
    setOwnerSearch("")
    setDepSearch("")
  }

  // ── Sidebar ──────────────────────────────────────────────────────────────

  const sidebar = (
    <aside className="oss-sidebar">
      <div className="oss-filters">

        {/* Sort */}
        <div className="oss-filter-group">
          <div className="oss-filter-label">Sort by</div>
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
          <div className="oss-filter-label">Stars</div>
          {bucketCounts.map(b => (
            <label key={b.key} className="oss-filter-row">
              <input
                type="radio"
                name="stars"
                checked={starBucket === b.key}
                onChange={() => setStarBucket(b.key)}
                className="oss-filter-radio"
              />
              <span style={{ flex: 1 }}>{b.label}</span>
              <span className="oss-filter-count">{b.count}</span>
            </label>
          ))}
        </div>

        {/* Activity */}
        <div className="oss-filter-group">
          <div className="oss-filter-label">Activity</div>
          {ACTIVITY_OPTIONS.map(o => {
            const count = facets.activity.find(([k]) => k === o.value)?.[1] ?? 0
            return (
              <label key={o.value} className="oss-filter-row">
                <input
                  type="checkbox"
                  checked={selectedActivity.has(o.value)}
                  onChange={() => setSelectedActivity(prev => toggleSet(prev, o.value))}
                  className="oss-filter-radio"
                />
                <span style={{ flex: 1 }}>{o.label}</span>
                <span className="oss-filter-count">{count}</span>
              </label>
            )
          })}
        </div>

        {/* Language — only shown when multiple languages exist */}
        {facets.languages.length > 1 && (
          <div className="oss-filter-group">
            <div className="oss-filter-label">Language</div>
            {facets.languages.map(([lang, count]) => (
              <label key={lang} className="oss-filter-row">
                <input
                  type="checkbox"
                  checked={selectedLanguages.has(lang)}
                  onChange={() => setSelectedLanguages(prev => toggleSet(prev, lang))}
                  className="oss-filter-radio"
                />
                <span style={{ flex: 1 }}>{lang}</span>
                <span className="oss-filter-count">{count}</span>
              </label>
            ))}
          </div>
        )}

        {/* License */}
        <div className="oss-filter-group">
          <div className="oss-filter-label">License</div>
          {facets.licenses.map(([lic, count]) => (
            <label key={lic} className="oss-filter-row">
              <input
                type="checkbox"
                checked={selectedLicenses.has(lic)}
                onChange={() => setSelectedLicenses(prev => toggleSet(prev, lic))}
                className="oss-filter-radio"
              />
              <span style={{ flex: 1 }}>{lic}</span>
              <span className="oss-filter-count">{count}</span>
            </label>
          ))}
        </div>

        {/* Owner / Org */}
        <div className="oss-filter-group">
          <div className="oss-filter-label">Owner / Org</div>
          <input
            className="oss-filter-input"
            placeholder="Search owners…"
            value={ownerSearch}
            onChange={e => setOwnerSearch(e.target.value)}
          />
          <div className="oss-topic-list">
            {visibleOwners.map(owner => {
              const count = facets.owners.find(([o]) => o === owner)?.[1] ?? 0
              return (
                <label key={owner} className="oss-filter-row">
                  <input
                    type="checkbox"
                    checked={selectedOwners.has(owner)}
                    onChange={() => setSelectedOwners(prev => toggleSet(prev, owner))}
                    className="oss-filter-radio"
                  />
                  <span style={{ flex: 1 }} className="oss-filter-mono">{owner}</span>
                  <span className="oss-filter-count">{count}</span>
                </label>
              )
            })}
          </div>
        </div>

        {/* Topics */}
        <div className="oss-filter-group">
          <div className="oss-filter-label">Topics</div>
          <input
            className="oss-filter-input"
            placeholder="Search topics…"
            value={topicSearch}
            onChange={e => setTopicSearch(e.target.value)}
          />
          <div className="oss-topic-list">
            {visibleTopics.map(topic => {
              const count = facets.topics.find(([t]) => t === topic)?.[1] ?? 0
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

        {/* Dependencies */}
        {depFacets.length > 0 && (
          <div className="oss-filter-group">
            <div className="oss-filter-label">Dependencies</div>
            <input
              className="oss-filter-input"
              placeholder="Search crates…"
              value={depSearch}
              onChange={e => setDepSearch(e.target.value)}
            />
            <div className="oss-topic-list">
              {visibleDeps.map(dep => {
                const count = depFacets.find(([d]) => d === dep)?.[1] ?? 0
                return (
                  <label key={dep} className="oss-filter-row">
                    <input
                      type="checkbox"
                      checked={selectedDeps.has(dep)}
                      onChange={() => setSelectedDeps(prev => toggleSet(prev, dep))}
                      className="oss-filter-radio"
                    />
                    <span style={{ flex: 1 }} className="oss-filter-mono">{dep}</span>
                    <span className="oss-filter-count">{count}</span>
                  </label>
                )
              })}
            </div>
          </div>
        )}

        {hasFilters && (
          <button className="oss-filter-clear" onClick={clearAll}>
            ✕ Clear all filters
          </button>
        )}
      </div>
    </aside>
  )

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Top bar */}
      <div className="oss-topbar">
        <input
          className="oss-search"
          placeholder="Search by name, owner, or topic…"
          value={q}
          onChange={e => setQ(e.target.value)}
        />
        <div className="oss-topbar-meta">
          <span className="e-section__meta">
            {sorted.length}{hasFilters ? ` of ${repos.length}` : ""}{" "}
            {sorted.length === 1 ? "repository" : "repositories"}
          </span>
          <button
            className="oss-filter-toggle-btn"
            onClick={() => setFiltersOpen(v => !v)}
            aria-expanded={filtersOpen}
          >
            {filtersOpen ? "Hide filters" : "Filters"}
            {activeFilterCount > 0 && (
              <span className="oss-filter-badge">{activeFilterCount}</span>
            )}
          </button>
        </div>
      </div>

      {/* Layout */}
      <div className={`oss-browser${filtersOpen ? " oss-browser--open" : ""}`}>
        {sidebar}

        <div>
          {sorted.length > 0 ? (
            <div className="e-oss-grid">
              {sorted.map(repo => (
                <OSSCard key={repo.href} repo={repo as NormalizedRepo} depPageCounts={depPageCounts} />
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
