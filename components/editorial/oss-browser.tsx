"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import { useRouter, usePathname } from "next/navigation"
import { OSSCard } from "./oss-card"
import { getEcoTags, ECO_LABEL } from "@/lib/eco-tags"
import type { EcoTag } from "@/lib/eco-tags"
import type { OSSListRepo } from "@/content/oss-paths"

// ── Types ──────────────────────────────────────────────────────────────────

type SortKey       = "stars-desc" | "stars-asc" | "forks-desc" | "updated" | "issues"
type StarBucketKey = "any" | "20-59" | "60-99" | "100-499" | "500-1999" | "2000-9999" | "10000+"
type DropdownId    = "license" | "topics" | "owner" | "deps" | "tech" | "company"
type KindFilter    = "all" | "code" | "reference"

const PAGE_SIZE = 100

// ── Normalization ──────────────────────────────────────────────────────────

export interface NormalizedRepo extends OSSListRepo {
  stars:           number
  forks:           number
  openIssuesCount: number
  topics:          string[]
  owner:           string
  kind:            "code" | "reference"
  license:         string
  activityTier:    "active" | "maintenance" | "dormant"
  dependencies:    string[]
  ecoTags:         EcoTag[]
  technologies:    string[]
  companyName:     string | null
}

function normalize(r: OSSListRepo, companyByOwner: Record<string, { slug: string; name: string }>): NormalizedRepo {
  return {
    ...r,
    stars:           r.stars           ?? 0,
    forks:           r.forks           ?? 0,
    openIssuesCount: r.openIssuesCount ?? 0,
    topics:          r.topics          ?? [],
    owner:           r.owner,
    kind:            r.kind            ?? "code",
    license:         r.license         ?? "unknown",
    activityTier:    (r.activityTier as "active" | "maintenance" | "dormant") ?? "dormant",
    dependencies:    r.dependencies    ?? [],
    ecoTags:         getEcoTags(r.dependencies, { owner: r.owner, name: r.name ?? undefined, topics: r.topics ?? undefined }),
    technologies:    r.technologies ?? [],
    companyName:     companyByOwner[r.owner.toLowerCase()]?.name ?? null,
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
    selectedKind:      KindFilter
    selectedActivity:  Set<string>
    selectedLicenses:  Set<string>
    selectedOwners:    Set<string>
    selectedTopics:    Set<string>
    selectedDeps:      Set<string>
    selectedEcos:      Set<EcoTag>
    selectedTechs:     Set<string>
    selectedCompanies: Set<string>
    star?: { lo: number; hi: number }
  }
): NormalizedRepo[] {
  const { q, selectedKind, selectedActivity, selectedLicenses,
          selectedOwners, selectedTopics, selectedDeps, selectedEcos,
          selectedTechs, selectedCompanies, star } = opts
  return items.filter(r => {
    if (q) {
      const lc = q.toLowerCase()
      const hit = r.name.toLowerCase().includes(lc)
        || r.owner.toLowerCase().includes(lc)
        || r.topics.some(t => t.toLowerCase().includes(lc))
      if (!hit) return false
    }
    if (star != null && (r.stars < star.lo || r.stars > star.hi)) return false
    if (selectedKind !== "all" && r.kind !== selectedKind)         return false
    if (selectedActivity.size  > 0 && !selectedActivity.has(r.activityTier)) return false
    if (selectedLicenses.size  > 0 && !selectedLicenses.has(r.license))      return false
    if (selectedOwners.size    > 0 && !selectedOwners.has(r.owner))          return false
    if (selectedTopics.size    > 0 &&
        ![...selectedTopics].every(t => r.topics.includes(t))) return false
    if (selectedDeps.size      > 0 &&
        ![...selectedDeps].every(d => r.dependencies.includes(d))) return false
    if (selectedEcos.size      > 0 &&
        !r.ecoTags.some(tag => selectedEcos.has(tag))) return false
    if (selectedTechs.size     > 0 &&
        ![...selectedTechs].every(t => r.technologies.includes(t))) return false
    if (selectedCompanies.size > 0 &&
        !selectedCompanies.has(r.companyName ?? "")) return false
    return true
  })
}

function buildFacets(items: NormalizedRepo[]) {
  const activity:   Record<string, number> = {}
  const licenses:   Record<string, number> = {}
  const owners:     Record<string, number> = {}
  const topics:     Record<string, number> = {}
  const techs:      Record<string, number> = {}
  const companies:  Record<string, number> = {}

  for (const r of items) {
    activity[r.activityTier] = (activity[r.activityTier] ?? 0) + 1
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
    for (const t of r.technologies) {
      techs[t] = (techs[t] ?? 0) + 1
    }
    if (r.companyName) {
      companies[r.companyName] = (companies[r.companyName] ?? 0) + 1
    }
  }

  const sort = (obj: Record<string, number>) =>
    Object.entries(obj).sort((a, b) => b[1] - a[1])

  return {
    activity:  sort(activity),
    licenses:  sort(licenses),
    owners:    sort(owners),
    topics:    sort(topics),
    techs:     sort(techs),
    companies: sort(companies),
  }
}

// ── Main component ─────────────────────────────────────────────────────────

const ECO_OPTIONS: { value: EcoTag; label: string }[] = [
  { value: "bevy",       label: "Bevy" },
  { value: "tauri",      label: "Tauri" },
  { value: "blockchain", label: "Blockchain" },
  { value: "embedded",   label: "Embedded" },
  { value: "ai",         label: "AI / ML" },
  { value: "wasm",       label: "WASM" },
  { value: "database",   label: "Database" },
  { value: "grpc",       label: "gRPC" },
  { value: "cli",        label: "CLI / TUI" },
  { value: "axum",       label: "Web (axum)" },
  { value: "tokio",      label: "Tokio" },
]

export function OSSBrowser({
  repos,
  depPageCounts,
  companyByOwner,
}: {
  repos: OSSListRepo[]
  depPageCounts?: Record<string, number>
  companyByOwner?: Record<string, { slug: string; name: string }>
}) {
  const router   = useRouter()
  const pathname = usePathname()
  const normalized = useMemo(
    () => repos.map(r => normalize(r, companyByOwner ?? {})),
    [repos, companyByOwner],
  )

  // Filter state
  const [q,                 setQ]                 = useState("")
  const [starBucket,        setStarBucket]        = useState<StarBucketKey>("any")
  const [selectedKind,      setSelectedKind]      = useState<KindFilter>("all")
  const [selectedActivity,  setSelectedActivity]  = useState<Set<string>>(new Set())
  const [selectedLicenses,  setSelectedLicenses]  = useState<Set<string>>(new Set())
  const [selectedOwners,    setSelectedOwners]    = useState<Set<string>>(new Set())
  const [selectedTopics,    setSelectedTopics]    = useState<Set<string>>(new Set())
  const [topicSearch,       setTopicSearch]       = useState("")
  const [ownerSearch,       setOwnerSearch]       = useState("")
  const [selectedDeps,      setSelectedDeps]      = useState<Set<string>>(new Set())
  const [depSearch,         setDepSearch]         = useState("")
  const [selectedEcos,      setSelectedEcos]      = useState<Set<EcoTag>>(new Set())
  const [selectedTechs,     setSelectedTechs]     = useState<Set<string>>(new Set())
  const [techSearch,        setTechSearch]        = useState("")
  const [selectedCompanies, setSelectedCompanies] = useState<Set<string>>(new Set())
  const [companySearch,     setCompanySearch]     = useState("")
  const [sort,              setSort]              = useState<SortKey>("stars-desc")
  const [openDropdown,      setOpenDropdown]      = useState<DropdownId | null>(null)
  const [visibleCount,      setVisibleCount]      = useState(PAGE_SIZE)
  const [filterSheetOpen,   setFilterSheetOpen]   = useState(false)
  const [mounted,           setMounted]           = useState(false)

  // Apply dep/eco filters from the URL once on mount. Deliberately not read
  // via useSearchParams(): that hook forces Next to bail this whole component
  // to client-only rendering during static generation, which would drop the
  // repo grid from the crawled HTML. Reading window.location.search in an
  // effect keeps the unfiltered grid in the static output and layers the
  // requested filter on top right after hydration.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const deps = params.getAll("dep")
    const ecos = params.getAll("eco").filter((e): e is EcoTag => ECO_OPTIONS.some(o => o.value === e))
    if (deps.length) setSelectedDeps(new Set(deps))
    if (ecos.length) setSelectedEcos(new Set(ecos))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync selectedDeps + selectedEcos → URL
  useEffect(() => {
    const params = new URLSearchParams()
    for (const d of selectedDeps) params.append("dep", d)
    for (const e of selectedEcos) params.append("eco", e)
    const qs = params.toString()
    const target = qs ? `${pathname}?${qs}` : pathname
    router.replace(target, { scroll: false })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDeps, selectedEcos])

  // Close open dropdown on outside click
  const fbRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!openDropdown) return
    function onDown(e: MouseEvent) {
      if (!fbRef.current?.contains(e.target as Node)) {
        setOpenDropdown(null)
      }
    }
    document.addEventListener("mousedown", onDown)
    return () => document.removeEventListener("mousedown", onDown)
  }, [openDropdown])

  function toggleDropdown(id: DropdownId) {
    setOpenDropdown(prev => prev === id ? null : id)
  }

  const filterOpts = {
    q, selectedKind, selectedActivity, selectedLicenses,
    selectedOwners, selectedTopics, selectedDeps, selectedEcos,
    selectedTechs, selectedCompanies,
  }

  const activeBucket = starBucket === "any"
    ? undefined
    : STAR_BUCKETS.find(b => b.key === starBucket)

  // Filtered set — all active filters applied
  const filtered = useMemo(
    () => buildFilter(normalized, { ...filterOpts, star: activeBucket }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [normalized, q, starBucket, selectedKind, selectedActivity,
     selectedLicenses, selectedOwners, selectedTopics, selectedDeps, selectedEcos,
     selectedTechs, selectedCompanies]
  )

  // Filtered without star constraint — drives bucket counts
  const filteredNoStars = useMemo(
    () => buildFilter(normalized, { ...filterOpts }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [normalized, q, selectedKind, selectedActivity,
     selectedLicenses, selectedOwners, selectedTopics, selectedDeps, selectedEcos,
     selectedTechs, selectedCompanies]
  )

  // Sorted display list
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sort === "stars-desc") return b.stars - a.stars
      if (sort === "stars-asc")  return a.stars - b.stars
      if (sort === "forks-desc") return b.forks - a.forks
      if (sort === "updated")    return (b.pushedAt ?? "").localeCompare(a.pushedAt ?? "")
      if (sort === "issues")     return b.openIssuesCount - a.openIssuesCount
      return 0
    })
  }, [filtered, sort])

  // Reset visible count when sorted set changes (filter or sort applied)
  useEffect(() => { setVisibleCount(PAGE_SIZE) }, [sorted])

  // Portal mount guard
  useEffect(() => { setMounted(true) }, [])

  // Scroll lock while filter sheet is open
  useEffect(() => {
    document.body.style.overflow = filterSheetOpen ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [filterSheetOpen])

  // Escape key closes filter sheet
  useEffect(() => {
    if (!filterSheetOpen) return
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setFilterSheetOpen(false) }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [filterSheetOpen])

  // Eco counts from full corpus (stable regardless of eco filter)
  const allEcoCounts = useMemo(() => {
    const counts: Partial<Record<EcoTag, number>> = {}
    for (const r of normalized) {
      for (const tag of r.ecoTags) counts[tag] = (counts[tag] ?? 0) + 1
    }
    return counts
  }, [normalized])

  // Displayed repos (pagination slice)
  const displayed = sorted.slice(0, visibleCount)

  // Facets from full corpus — option lists never shrink when filters are applied
  const allFacets = useMemo(() => buildFacets(normalized), [normalized])

  // Facets from filtered set — counts reflect current selection
  const facets = useMemo(() => buildFacets(filtered), [filtered])

  // Per-bucket counts (no-star filter so all buckets stay populated)
  const bucketCounts = useMemo(() =>
    STAR_BUCKETS.map(b => ({
      ...b,
      count: b.key === "any"
        ? filteredNoStars.length
        : filteredNoStars.filter(r => r.stars >= b.lo && r.stars <= b.hi).length,
    })),
    [filteredNoStars]
  )

  // Dep counts from full corpus — option stability for the deps dropdown
  const globalDepCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const r of normalized) {
      for (const d of r.dependencies) {
        counts[d] = (counts[d] ?? 0) + 1
      }
    }
    return counts
  }, [normalized])

  // Dep counts from filtered set — for counts shown in the panel
  const depFacets = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const r of filtered) {
      for (const d of r.dependencies) {
        counts[d] = (counts[d] ?? 0) + 1
      }
    }
    return counts
  }, [filtered])

  // Topics panel options — from full corpus, filtered by search
  const visibleTopics = useMemo(() => {
    const lc = topicSearch.toLowerCase().trim()
    const list = lc
      ? allFacets.topics.filter(([t]) => t.includes(lc))
      : allFacets.topics
    const slice = list.slice(0, 20).map(([t]) => t)
    for (const t of selectedTopics) {
      if (!slice.includes(t)) slice.push(t)
    }
    return slice
  }, [allFacets.topics, topicSearch, selectedTopics])

  // Owners panel options — from full corpus, filtered by search
  const visibleOwners = useMemo(() => {
    const lc = ownerSearch.toLowerCase().trim()
    const list = lc
      ? allFacets.owners.filter(([o]) => o.toLowerCase().includes(lc))
      : allFacets.owners
    const slice = list.slice(0, 12).map(([o]) => o)
    for (const o of selectedOwners) {
      if (!slice.includes(o)) slice.push(o)
    }
    return slice
  }, [allFacets.owners, ownerSearch, selectedOwners])

  // Technologies panel options - from full corpus, filtered by search
  const visibleTechs = useMemo(() => {
    const lc = techSearch.toLowerCase().trim()
    const list = lc
      ? allFacets.techs.filter(([t]) => t.toLowerCase().includes(lc))
      : allFacets.techs
    const slice = list.slice(0, 20).map(([t]) => t)
    for (const t of selectedTechs) {
      if (!slice.includes(t)) slice.push(t)
    }
    return slice
  }, [allFacets.techs, techSearch, selectedTechs])

  // Companies panel options - from full corpus, filtered by search
  const visibleCompanies = useMemo(() => {
    const lc = companySearch.toLowerCase().trim()
    const list = lc
      ? allFacets.companies.filter(([c]) => c.toLowerCase().includes(lc))
      : allFacets.companies
    const slice = list.slice(0, 20).map(([c]) => c)
    for (const c of selectedCompanies) {
      if (!slice.includes(c)) slice.push(c)
    }
    return slice
  }, [allFacets.companies, companySearch, selectedCompanies])

  // Deps panel options — from full corpus, filtered by search
  const visibleDeps = useMemo(() => {
    const lc = depSearch.toLowerCase().trim()
    const minFreq = lc ? 2 : 6
    const list = Object.entries(globalDepCounts)
      .filter(([d, c]) => c >= minFreq && (!lc || d.includes(lc)))
      .sort((a, b) => b[1] - a[1])
    const slice = list.slice(0, 40).map(([d]) => d)
    for (const d of selectedDeps) {
      if (!slice.includes(d)) slice.push(d)
    }
    return slice
  }, [globalDepCounts, depSearch, selectedDeps])

  // Active chip descriptors for the chips strip
  const activeChips = useMemo(() => {
    const chips: { key: string; label: string; onRemove: () => void }[] = []
    if (q) {
      chips.push({ key: `q:${q}`, label: `"${q}"`,
        onRemove: () => setQ("") })
    }
    if (starBucket !== "any") {
      const b = STAR_BUCKETS.find(b => b.key === starBucket)!
      chips.push({ key: `stars:${starBucket}`, label: `★ ${b.label}`,
        onRemove: () => setStarBucket("any") })
    }
    if (selectedKind !== "all") {
      chips.push({ key: `kind:${selectedKind}`, label: selectedKind === "code" ? "Code" : "Reference",
        onRemove: () => setSelectedKind("all") })
    }
    for (const a of selectedActivity) {
      const label = ACTIVITY_OPTIONS.find(o => o.value === a)?.label ?? a
      chips.push({ key: `activity:${a}`, label,
        onRemove: () => setSelectedActivity(prev => toggleSet(prev, a)) })
    }
    for (const lic of selectedLicenses) {
      chips.push({ key: `lic:${lic}`, label: lic,
        onRemove: () => setSelectedLicenses(prev => toggleSet(prev, lic)) })
    }
    for (const o of selectedOwners) {
      chips.push({ key: `owner:${o}`, label: o,
        onRemove: () => setSelectedOwners(prev => toggleSet(prev, o)) })
    }
    for (const t of selectedTopics) {
      chips.push({ key: `topic:${t}`, label: `#${t}`,
        onRemove: () => setSelectedTopics(prev => toggleSet(prev, t)) })
    }
    for (const d of selectedDeps) {
      chips.push({ key: `dep:${d}`, label: d,
        onRemove: () => setSelectedDeps(prev => toggleSet(prev, d)) })
    }
    for (const e of selectedEcos) {
      const label = ECO_OPTIONS.find(o => o.value === e)?.label ?? e
      chips.push({ key: `eco:${e}`, label,
        onRemove: () => setSelectedEcos(prev => toggleSet(prev, e)) })
    }
    for (const t of selectedTechs) {
      chips.push({ key: `tech:${t}`, label: t,
        onRemove: () => setSelectedTechs(prev => toggleSet(prev, t)) })
    }
    for (const c of selectedCompanies) {
      chips.push({ key: `company:${c}`, label: c,
        onRemove: () => setSelectedCompanies(prev => toggleSet(prev, c)) })
    }
    return chips
  }, [q, starBucket, selectedKind, selectedActivity, selectedLicenses,
      selectedOwners, selectedTopics, selectedDeps, selectedEcos,
      selectedTechs, selectedCompanies])

  function clearAll() {
    setQ("")
    setStarBucket("any")
    setSelectedKind("all")
    setSelectedActivity(new Set())
    setSelectedLicenses(new Set())
    setSelectedOwners(new Set())
    setSelectedTopics(new Set())
    setSelectedDeps(new Set())
    setSelectedEcos(new Set())
    setSelectedTechs(new Set())
    setSelectedCompanies(new Set())
    setTopicSearch("")
    setOwnerSearch("")
    setDepSearch("")
    setTechSearch("")
    setCompanySearch("")
    setOpenDropdown(null)
  }

  // Count of rail-specific active filters (used for the mobile trigger badge)
  const railFilterCount =
    (starBucket !== "any" ? 1 : 0) +
    (selectedKind !== "all" ? 1 : 0) +
    selectedActivity.size +
    selectedEcos.size

  function renderRailGroups() {
    return (
      <>
        <div className="oss-rail-group">
          <div className="oss-rail-label">Sort</div>
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

        <div className="oss-rail-group">
          <div className="oss-rail-label">Stars</div>
          <select
            className="oss-filter-select"
            value={starBucket}
            onChange={e => setStarBucket(e.target.value as StarBucketKey)}
          >
            {bucketCounts.map(b => (
              <option key={b.key} value={b.key}>
                {b.label} ({b.count})
              </option>
            ))}
          </select>
        </div>

        <div className="oss-rail-group">
          <div className="oss-rail-label">Activity</div>
          {ACTIVITY_OPTIONS.map(o => {
            const count = facets.activity.find(([k]) => k === o.value)?.[1] ?? 0
            return (
              <label key={o.value} className="oss-filter-row">
                <input
                  type="checkbox"
                  className="oss-filter-radio"
                  checked={selectedActivity.has(o.value)}
                  onChange={() => setSelectedActivity(prev => toggleSet(prev, o.value))}
                />
                <span style={{ flex: 1 }}>{o.label}</span>
                <span className="oss-filter-count">{count}</span>
              </label>
            )
          })}
        </div>

        <div className="oss-rail-group">
          <div className="oss-rail-label">Type</div>
          {(["all", "code", "reference"] as KindFilter[]).map(k => {
            const count = k === "all"
              ? normalized.length
              : normalized.filter(r => r.kind === k).length
            const label = k === "all" ? "All" : k === "code" ? "Code" : "Reference"
            return (
              <label key={k} className="oss-filter-row">
                <input
                  type="radio"
                  className="oss-filter-radio"
                  checked={selectedKind === k}
                  onChange={() => setSelectedKind(k)}
                />
                <span style={{ flex: 1 }}>{label}</span>
                <span className="oss-filter-count">{count}</span>
              </label>
            )
          })}
        </div>

        <div className="oss-rail-group">
          <div className="oss-rail-label">Ecosystem</div>
          {ECO_OPTIONS.map(o => {
            const count = allEcoCounts[o.value] ?? 0
            return (
              <label key={o.value} className="oss-filter-row">
                <input
                  type="checkbox"
                  className="oss-filter-radio"
                  checked={selectedEcos.has(o.value)}
                  onChange={() => setSelectedEcos(prev => toggleSet(prev, o.value))}
                />
                <span style={{ flex: 1 }}>{o.label}</span>
                <span className="oss-filter-count">{count}</span>
              </label>
            )
          })}
        </div>
      </>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="oss-discovery">

      {/* Sticky filter bar */}
      <div className="oss-fb" ref={fbRef}>
        <input
          className="oss-fb-search"
          placeholder="Search repos…"
          value={q}
          onChange={e => setQ(e.target.value)}
        />

        <div className="oss-fb-dropdowns">

          {/* License */}
          <div className="oss-dd">
            <button
              type="button"
              className={`oss-dd-btn${selectedLicenses.size > 0 ? " oss-dd-btn--on" : ""}`}
              onClick={() => toggleDropdown("license")}
            >
              License{selectedLicenses.size > 0 ? ` (${selectedLicenses.size})` : ""} ▾
            </button>
            {openDropdown === "license" && (
              <div className="oss-dd-panel">
                <div className="oss-dd-list">
                  {allFacets.licenses.map(([lic]) => {
                    const count = facets.licenses.find(([l]) => l === lic)?.[1] ?? 0
                    return (
                      <label key={lic} className="oss-dd-row">
                        <input
                          type="checkbox"
                          className="oss-filter-radio"
                          checked={selectedLicenses.has(lic)}
                          onChange={() => setSelectedLicenses(prev => toggleSet(prev, lic))}
                        />
                        <span className="oss-dd-option">{lic}</span>
                        <span className="oss-dd-count">{count}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Topics */}
          <div className="oss-dd">
            <button
              type="button"
              className={`oss-dd-btn${selectedTopics.size > 0 ? " oss-dd-btn--on" : ""}`}
              onClick={() => toggleDropdown("topics")}
            >
              Topics{selectedTopics.size > 0 ? ` (${selectedTopics.size})` : ""} ▾
            </button>
            {openDropdown === "topics" && (
              <div className="oss-dd-panel oss-dd-panel--wide">
                <input
                  className="oss-dd-input"
                  placeholder="Search topics…"
                  value={topicSearch}
                  onChange={e => setTopicSearch(e.target.value)}
                  autoFocus
                />
                <div className="oss-dd-list">
                  {visibleTopics.map(topic => {
                    const count = facets.topics.find(([t]) => t === topic)?.[1] ?? 0
                    return (
                      <label key={topic} className="oss-dd-row">
                        <input
                          type="checkbox"
                          className="oss-filter-radio"
                          checked={selectedTopics.has(topic)}
                          onChange={() => setSelectedTopics(prev => toggleSet(prev, topic))}
                        />
                        <span className="oss-dd-option">{topic}</span>
                        <span className="oss-dd-count">{count}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Owners */}
          <div className="oss-dd">
            <button
              type="button"
              className={`oss-dd-btn${selectedOwners.size > 0 ? " oss-dd-btn--on" : ""}`}
              onClick={() => toggleDropdown("owner")}
            >
              Owner{selectedOwners.size > 0 ? ` (${selectedOwners.size})` : ""} ▾
            </button>
            {openDropdown === "owner" && (
              <div className="oss-dd-panel oss-dd-panel--wide">
                <input
                  className="oss-dd-input"
                  placeholder="Search owners…"
                  value={ownerSearch}
                  onChange={e => setOwnerSearch(e.target.value)}
                  autoFocus
                />
                <div className="oss-dd-list">
                  {visibleOwners.map(owner => {
                    const count = facets.owners.find(([o]) => o === owner)?.[1] ?? 0
                    return (
                      <label key={owner} className="oss-dd-row">
                        <input
                          type="checkbox"
                          className="oss-filter-radio"
                          checked={selectedOwners.has(owner)}
                          onChange={() => setSelectedOwners(prev => toggleSet(prev, owner))}
                        />
                        <span className="oss-dd-option oss-filter-mono">{owner}</span>
                        <span className="oss-dd-count">{count}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Dependencies */}
          <div className="oss-dd">
            <button
              type="button"
              className={`oss-dd-btn${selectedDeps.size > 0 ? " oss-dd-btn--on" : ""}`}
              onClick={() => toggleDropdown("deps")}
            >
              Deps{selectedDeps.size > 0 ? ` (${selectedDeps.size})` : ""} ▾
            </button>
            {openDropdown === "deps" && (
              <div className="oss-dd-panel oss-dd-panel--wide oss-dd-panel--right">
                <input
                  className="oss-dd-input"
                  placeholder="Search crates…"
                  value={depSearch}
                  onChange={e => setDepSearch(e.target.value)}
                  autoFocus
                />
                <div className="oss-dd-list">
                  {visibleDeps.map(dep => {
                    const count = depFacets[dep] ?? 0
                    return (
                      <label key={dep} className="oss-dd-row">
                        <input
                          type="checkbox"
                          className="oss-filter-radio"
                          checked={selectedDeps.has(dep)}
                          onChange={() => setSelectedDeps(prev => toggleSet(prev, dep))}
                        />
                        <span className="oss-dd-option oss-filter-mono">{dep}</span>
                        <span className="oss-dd-count">{count}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Technologies (Tier 2 Ecosystem Intelligence) */}
          <div className="oss-dd">
            <button
              type="button"
              className={`oss-dd-btn${selectedTechs.size > 0 ? " oss-dd-btn--on" : ""}`}
              onClick={() => toggleDropdown("tech")}
            >
              Technology{selectedTechs.size > 0 ? ` (${selectedTechs.size})` : ""} ▾
            </button>
            {openDropdown === "tech" && (
              <div className="oss-dd-panel oss-dd-panel--wide">
                <input
                  className="oss-dd-input"
                  placeholder="Search technologies..."
                  value={techSearch}
                  onChange={e => setTechSearch(e.target.value)}
                  autoFocus
                />
                <div className="oss-dd-list">
                  {visibleTechs.map(tech => {
                    const count = facets.techs.find(([t]) => t === tech)?.[1] ?? 0
                    return (
                      <label key={tech} className="oss-dd-row">
                        <input
                          type="checkbox"
                          className="oss-filter-radio"
                          checked={selectedTechs.has(tech)}
                          onChange={() => setSelectedTechs(prev => toggleSet(prev, tech))}
                        />
                        <span className="oss-dd-option">{tech}</span>
                        <span className="oss-dd-count">{count}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Companies (Knowledge Graph maintained_by_company) */}
          <div className="oss-dd">
            <button
              type="button"
              className={`oss-dd-btn${selectedCompanies.size > 0 ? " oss-dd-btn--on" : ""}`}
              onClick={() => toggleDropdown("company")}
            >
              Company{selectedCompanies.size > 0 ? ` (${selectedCompanies.size})` : ""} ▾
            </button>
            {openDropdown === "company" && (
              <div className="oss-dd-panel oss-dd-panel--wide oss-dd-panel--right">
                <input
                  className="oss-dd-input"
                  placeholder="Search companies..."
                  value={companySearch}
                  onChange={e => setCompanySearch(e.target.value)}
                  autoFocus
                />
                <div className="oss-dd-list">
                  {visibleCompanies.map(company => {
                    const count = facets.companies.find(([c]) => c === company)?.[1] ?? 0
                    return (
                      <label key={company} className="oss-dd-row">
                        <input
                          type="checkbox"
                          className="oss-filter-radio"
                          checked={selectedCompanies.has(company)}
                          onChange={() => setSelectedCompanies(prev => toggleSet(prev, company))}
                        />
                        <span className="oss-dd-option">{company}</span>
                        <span className="oss-dd-count">{count}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Mobile filter trigger — lives inside the sticky bar, hidden on desktop */}
        <button
          type="button"
          className="oss-filter-trigger"
          onClick={() => setFilterSheetOpen(true)}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M1 3h12M3 7h8M5 11h4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
          </svg>
          Filters{railFilterCount > 0 ? ` (${railFilterCount})` : ""}
        </button>

        <span className="oss-fb-count">
          {filtered.length !== repos.length
            ? `${filtered.length} / ${repos.length}`
            : String(repos.length)}
        </span>
      </div>

      {/* Active chips strip */}
      {activeChips.length > 0 && (
        <div className="oss-chips-strip">
          {activeChips.map(chip => (
            <button key={chip.key} className="oss-chip" type="button" onClick={chip.onRemove}>
              {chip.label}<span className="oss-chip-x">×</span>
            </button>
          ))}
          <button type="button" className="oss-chip-clear" onClick={clearAll}>
            Clear all
          </button>
        </div>
      )}

      {/* Mobile filter bottom sheet */}
      {mounted && createPortal(
        <div
          className={`oss-filter-sheet-back${filterSheetOpen ? " open" : ""}`}
          onClick={() => setFilterSheetOpen(false)}
          aria-hidden={!filterSheetOpen}
        >
          <div
            className="oss-filter-sheet"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-label="Filter options"
          >
            <div className="oss-filter-sheet__head">
              <span className="oss-filter-sheet__title">Filters</span>
              <button
                type="button"
                className="oss-filter-sheet__close"
                aria-label="Close filters"
                onClick={() => setFilterSheetOpen(false)}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="oss-filter-sheet__body">
              {renderRailGroups()}
            </div>
            <div className="oss-filter-sheet__foot">
              <button type="button" className="oss-chip-clear" onClick={() => { clearAll(); setFilterSheetOpen(false) }}>
                Clear all
              </button>
              <button type="button" className="oss-filter-sheet__done" onClick={() => setFilterSheetOpen(false)}>
                Done
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Main layout — left rail + grid */}
      <div className="oss-layout">

        {/* Sticky left rail */}
        <aside className="oss-rail">
          {renderRailGroups()}
        </aside>

        {/* Repository grid */}
        <div>
          {sorted.length > 0 ? (
            <>
              <div className="e-oss-grid">
                {displayed.map(repo => (
                  <OSSCard
                    key={repo.href}
                    repo={repo as NormalizedRepo}
                    depPageCounts={depPageCounts}
                  />
                ))}
              </div>
              {visibleCount < sorted.length && (
                <div className="oss-load-more">
                  <button
                    type="button"
                    className="oss-load-more-btn"
                    onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
                  >
                    Load {Math.min(PAGE_SIZE, sorted.length - visibleCount)} more
                    <span className="oss-load-more-meta">
                      {visibleCount} of {sorted.length}
                    </span>
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="e-archive-empty">
              No repositories match.{" "}
              <button type="button" className="oss-chip-clear" onClick={clearAll}>
                Clear filters
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
