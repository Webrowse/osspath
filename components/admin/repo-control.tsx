"use client"

import { useMemo, useState, useTransition } from "react"
import type { AdminRepoRow, HideReason, Difficulty, CareerPath } from "@/lib/admin/curation-types"
import { HIDE_REASONS, DIFFICULTIES, CAREER_PATHS } from "@/lib/admin/curation-types"
import {
  featureRepo, hideRepo, unhideRepo, setRepoNote, setRepoOverrides,
  bulkHideRepos, bulkFeatureRepos, bulkClearCuration,
} from "@/lib/admin/curation-actions"

/**
 * Repository control: the dense operator table over the whole corpus.
 * Filtering/sorting is all client-side (the corpus is a few thousand trimmed
 * rows); mutations go through the audited curation server actions.
 */

const PAGE_SIZE = 100

type Filters = {
  q: string
  starsMin: string
  starsMax: string
  activity: "" | "active" | "maintenance" | "dormant" | "stale"
  updatedWithin: "" | "7" | "30" | "90" | "365"
  language: string
  ecosystem: string
  companyBacked: boolean
  hasIssues: boolean
  state: "" | "hidden" | "featured" | "overridden" | "noted" | "untouched"
  flag: "" | "missing" | "suspicious" | "unclassified"
}

const EMPTY_FILTERS: Filters = {
  q: "", starsMin: "", starsMax: "", activity: "", updatedWithin: "",
  language: "", ecosystem: "", companyBacked: false, hasIssues: false, state: "", flag: "",
}

type SortKey = "stars" | "pushedAt" | "confidence" | "name" | "openIssues"

const DAY = 24 * 60 * 60 * 1000

function daysAgo(iso: string | null): number | null {
  if (!iso) return null
  const t = Date.parse(iso)
  return Number.isNaN(t) ? null : Math.floor((Date.now() - t) / DAY)
}

function fmtAge(iso: string | null): string {
  const d = daysAgo(iso)
  if (d === null) return "–"
  if (d < 1) return "today"
  if (d < 30) return `${d}d`
  if (d < 365) return `${Math.floor(d / 30)}mo`
  return `${Math.floor(d / 365)}y`
}

function matches(r: AdminRepoRow, f: Filters): boolean {
  if (f.q) {
    const q = f.q.toLowerCase()
    if (!r.slug.toLowerCase().includes(q) && !r.eco.toLowerCase().includes(q) && !r.note.toLowerCase().includes(q)) return false
  }
  if (f.starsMin && r.stars < Number(f.starsMin)) return false
  if (f.starsMax && r.stars > Number(f.starsMax)) return false
  if (f.activity === "stale") {
    const age = daysAgo(r.pushedAt)
    if (r.activityTier !== "dormant" && !(age !== null && age > 180)) return false
  } else if (f.activity && r.activityTier !== f.activity) return false
  if (f.updatedWithin) {
    const age = daysAgo(r.pushedAt)
    if (age === null || age > Number(f.updatedWithin)) return false
  }
  if (f.language && (r.language ?? "") !== f.language) return false
  if (f.ecosystem && !r.ecosystems.includes(f.ecosystem) && r.eco !== f.ecosystem) return false
  if (f.companyBacked && !r.companyBacked) return false
  if (f.hasIssues && r.openIssues === 0) return false
  if (f.state === "hidden" && !r.curation?.hidden) return false
  if (f.state === "featured" && !r.curation?.featured) return false
  if (f.state === "overridden" && !r.curation?.overrides) return false
  if (f.state === "noted" && !r.curation?.note) return false
  if (f.state === "untouched" && r.curation) return false
  if (f.flag === "missing" && r.missing.length === 0) return false
  if (f.flag === "suspicious" && !r.suspicious) return false
  if (f.flag === "unclassified" && r.confidence !== null) return false
  return true
}

export function RepoControl({
  repos,
  initialFilters,
}: {
  repos: AdminRepoRow[]
  initialFilters?: { activity?: string; state?: string; flag?: string; q?: string }
}) {
  const [filters, setFilters] = useState<Filters>({
    ...EMPTY_FILTERS,
    q: initialFilters?.q ?? "",
    activity: (["active", "maintenance", "dormant", "stale"].includes(initialFilters?.activity ?? "") ? initialFilters!.activity : "") as Filters["activity"],
    state: (["hidden", "featured", "overridden", "noted", "untouched"].includes(initialFilters?.state ?? "") ? initialFilters!.state : "") as Filters["state"],
    flag: (["missing", "suspicious", "unclassified"].includes(initialFilters?.flag ?? "") ? initialFilters!.flag : "") as Filters["flag"],
  })
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "stars", dir: -1 })
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [openSlug, setOpenSlug] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const languages = useMemo(
    () => [...new Set(repos.map((r) => r.language).filter((l): l is string => !!l))].sort(),
    [repos],
  )
  const ecosystems = useMemo(
    () => [...new Set(repos.flatMap((r) => [r.eco, ...r.ecosystems]).filter(Boolean))].sort(),
    [repos],
  )

  const filtered = useMemo(() => {
    const rows = repos.filter((r) => matches(r, filters))
    const dir = sort.dir
    rows.sort((a, b) => {
      switch (sort.key) {
        case "stars": return dir * (a.stars - b.stars)
        case "openIssues": return dir * (a.openIssues - b.openIssues)
        case "confidence": return dir * ((a.confidence ?? -1) - (b.confidence ?? -1))
        case "pushedAt": return dir * ((Date.parse(a.pushedAt ?? "") || 0) - (Date.parse(b.pushedAt ?? "") || 0))
        case "name": return dir * a.slug.localeCompare(b.slug)
      }
    })
    return rows
  }, [repos, filters, sort])

  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const openRepo = openSlug ? repos.find((r) => r.slug === openSlug) ?? null : null

  function setF<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((f) => ({ ...f, [key]: value }))
    setPage(0)
  }

  function run(fn: () => Promise<void>) {
    setError(null)
    start(async () => {
      try { await fn() } catch (e) { setError(e instanceof Error ? e.message : String(e)) }
    })
  }

  function toggleSort(key: SortKey) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: -1 }))
  }

  function toggleSelect(slug: string) {
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(slug)) next.delete(slug)
      else next.add(slug)
      return next
    })
  }

  function togglePage() {
    setSelected((s) => {
      const next = new Set(s)
      const allSelected = pageRows.every((r) => next.has(r.slug))
      for (const r of pageRows) allSelected ? next.delete(r.slug) : next.add(r.slug)
      return next
    })
  }

  const arrow = (key: SortKey) => (sort.key === key ? (sort.dir === -1 ? " ↓" : " ↑") : "")

  return (
    <div className="adm-repo-layout">
      <div className="adm-repo-main">
        <div className="adm-filterbar">
          <input
            className="adm-search"
            placeholder="Search owner/repo, eco, description…"
            value={filters.q}
            onChange={(e) => setF("q", e.target.value)}
          />
          <input className="adm-input adm-input--num" placeholder="★ min" value={filters.starsMin} onChange={(e) => setF("starsMin", e.target.value.replace(/\D/g, ""))} />
          <input className="adm-input adm-input--num" placeholder="★ max" value={filters.starsMax} onChange={(e) => setF("starsMax", e.target.value.replace(/\D/g, ""))} />
          <select className="adm-select" value={filters.activity} onChange={(e) => setF("activity", e.target.value as Filters["activity"])}>
            <option value="">activity: any</option>
            <option value="active">active</option>
            <option value="maintenance">maintenance</option>
            <option value="dormant">dormant</option>
            <option value="stale">stale (180d+)</option>
          </select>
          <select className="adm-select" value={filters.updatedWithin} onChange={(e) => setF("updatedWithin", e.target.value as Filters["updatedWithin"])}>
            <option value="">updated: any</option>
            <option value="7">last 7d</option>
            <option value="30">last 30d</option>
            <option value="90">last 90d</option>
            <option value="365">last year</option>
          </select>
          <select className="adm-select" value={filters.language} onChange={(e) => setF("language", e.target.value)}>
            <option value="">language: any</option>
            {languages.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
          <select className="adm-select" value={filters.ecosystem} onChange={(e) => setF("ecosystem", e.target.value)}>
            <option value="">ecosystem: any</option>
            {ecosystems.map((e2) => <option key={e2} value={e2}>{e2}</option>)}
          </select>
          <select className="adm-select" value={filters.state} onChange={(e) => setF("state", e.target.value as Filters["state"])}>
            <option value="">curation: any</option>
            <option value="featured">featured</option>
            <option value="hidden">hidden</option>
            <option value="overridden">has overrides</option>
            <option value="noted">has note</option>
            <option value="untouched">untouched</option>
          </select>
          <select className="adm-select" value={filters.flag} onChange={(e) => setF("flag", e.target.value as Filters["flag"])}>
            <option value="">quality: any</option>
            <option value="missing">missing data</option>
            <option value="suspicious">suspicious</option>
            <option value="unclassified">unclassified</option>
          </select>
          <label className="adm-check"><input type="checkbox" checked={filters.companyBacked} onChange={(e) => setF("companyBacked", e.target.checked)} /> company-backed</label>
          <label className="adm-check"><input type="checkbox" checked={filters.hasIssues} onChange={(e) => setF("hasIssues", e.target.checked)} /> has issues</label>
          <button className="adm-btn adm-btn--ghost" onClick={() => { setFilters(EMPTY_FILTERS); setPage(0) }}>Reset</button>
          <span className="adm-queue-toolbar__count">{filtered.length.toLocaleString()} match</span>
        </div>

        {error && <div className="adm-db-warn" style={{ margin: "8px 0" }}>{error}</div>}

        {selected.size > 0 && (
          <BulkBar
            count={selected.size}
            pending={pending}
            onFeature={(reason) => run(async () => { await bulkFeatureRepos([...selected], reason); setSelected(new Set()) })}
            onHide={(hideReason, reason) => run(async () => { await bulkHideRepos([...selected], hideReason, reason); setSelected(new Set()) })}
            onClear={(reason) => run(async () => { await bulkClearCuration([...selected], reason); setSelected(new Set()) })}
            onDeselect={() => setSelected(new Set())}
          />
        )}

        <div className="adm-tablewrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th className="adm-table__check">
                  <input type="checkbox" checked={pageRows.length > 0 && pageRows.every((r) => selected.has(r.slug))} onChange={togglePage} />
                </th>
                <th onClick={() => toggleSort("name")} className="adm-table__sortable">repo{arrow("name")}</th>
                <th onClick={() => toggleSort("stars")} className="adm-table__sortable adm-table__num">★{arrow("stars")}</th>
                <th onClick={() => toggleSort("openIssues")} className="adm-table__sortable adm-table__num">issues{arrow("openIssues")}</th>
                <th onClick={() => toggleSort("pushedAt")} className="adm-table__sortable">pushed{arrow("pushedAt")}</th>
                <th>tier</th>
                <th onClick={() => toggleSort("confidence")} className="adm-table__sortable adm-table__num">conf{arrow("confidence")}</th>
                <th>eco</th>
                <th>signals</th>
                <th>curation</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r) => (
                <tr
                  key={r.slug}
                  className={`adm-table__row${openSlug === r.slug ? " adm-table__row--open" : ""}${r.curation?.hidden ? " adm-table__row--hidden" : ""}`}
                  onClick={() => setOpenSlug(openSlug === r.slug ? null : r.slug)}
                >
                  <td className="adm-table__check" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selected.has(r.slug)} onChange={() => toggleSelect(r.slug)} />
                  </td>
                  <td className="adm-table__name" title={r.note}>{r.slug}</td>
                  <td className="adm-table__num">{r.stars.toLocaleString()}</td>
                  <td className="adm-table__num">{r.openIssues.toLocaleString()}</td>
                  <td>{fmtAge(r.pushedAt)}</td>
                  <td><span className={`adm-tier adm-tier--${r.activityTier}`}>{r.activityTier}</span></td>
                  <td className={`adm-table__num${r.confidence !== null && r.confidence < 0.35 ? " adm-table__warn" : ""}`}>
                    {r.confidence === null ? "–" : r.confidence.toFixed(2)}
                  </td>
                  <td className="adm-table__eco">{r.eco}</td>
                  <td className="adm-table__signals">
                    {r.companyBacked && <span className="adm-chip" title="owner is a tracked company org">co</span>}
                    {r.suspicious && <span className="adm-chip adm-chip--warn" title="high stars, weak engineering signals">sus</span>}
                    {r.missing.length > 0 && <span className="adm-chip adm-chip--dim" title={`missing: ${r.missing.join(", ")}`}>miss {r.missing.length}</span>}
                  </td>
                  <td className="adm-table__signals">
                    {r.curation?.featured && <span className="adm-chip adm-chip--accent">featured</span>}
                    {r.curation?.hidden && <span className="adm-chip adm-chip--warn">{r.curation.hidden.reason}</span>}
                    {r.curation?.overrides && <span className="adm-chip">override</span>}
                    {r.curation?.note && <span className="adm-chip adm-chip--dim" title={r.curation.note}>note</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {pageRows.length === 0 && (
            <div className="adm-empty"><span className="adm-empty__label">No repos match these filters</span></div>
          )}
        </div>

        <div className="adm-pagination">
          <button className="adm-btn adm-btn--ghost" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>← Prev</button>
          <span className="adm-pagination__info">page {page + 1} / {pageCount}</span>
          <button className="adm-btn adm-btn--ghost" disabled={page >= pageCount - 1} onClick={() => setPage((p) => p + 1)}>Next →</button>
        </div>
      </div>

      {openRepo && (
        <RepoEditor
          key={openRepo.slug}
          repo={openRepo}
          pending={pending}
          run={run}
          onClose={() => setOpenSlug(null)}
        />
      )}
    </div>
  )
}

// ── Bulk action bar ───────────────────────────────────────────────────────────

function BulkBar({
  count, pending, onFeature, onHide, onClear, onDeselect,
}: {
  count: number
  pending: boolean
  onFeature: (reason: string) => void
  onHide: (hideReason: HideReason, reason: string) => void
  onClear: (reason: string) => void
  onDeselect: () => void
}) {
  const [reason, setReason] = useState("")
  const [hideReason, setHideReason] = useState<HideReason>("low-quality")

  return (
    <div className="adm-bulkbar">
      <span className="adm-bulkbar__count">{count} selected</span>
      <input
        className="adm-input adm-bulkbar__reason"
        placeholder="Reason (recorded in audit trail)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      <button className="adm-btn adm-btn--primary" disabled={pending} onClick={() => onFeature(reason)}>Feature</button>
      <select className="adm-select" value={hideReason} onChange={(e) => setHideReason(e.target.value as HideReason)}>
        {HIDE_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
      </select>
      <button className="adm-btn adm-btn--reject" disabled={pending} onClick={() => onHide(hideReason, reason)}>Hide</button>
      <button className="adm-btn adm-btn--ghost" disabled={pending} onClick={() => onClear(reason)}>Clear curation</button>
      <button className="adm-btn adm-btn--ghost" onClick={onDeselect}>✕</button>
    </div>
  )
}

// ── Repo detail editor ────────────────────────────────────────────────────────

function RepoEditor({
  repo, pending, run, onClose,
}: {
  repo: AdminRepoRow
  pending: boolean
  run: (fn: () => Promise<void>) => void
  onClose: () => void
}) {
  const c = repo.curation
  const [reason, setReason] = useState("")
  const [note, setNote] = useState(c?.note ?? "")
  const [hideReason, setHideReason] = useState<HideReason>(c?.hidden?.reason ?? "low-quality")
  const [difficulty, setDifficulty] = useState<Difficulty | "">(c?.overrides?.difficulty ?? "")
  const [paths, setPaths] = useState<CareerPath[]>(c?.overrides?.careerPaths ?? [])
  const [learning, setLearning] = useState(c?.overrides?.learningValue?.toString() ?? "")
  const [contribution, setContribution] = useState(c?.overrides?.contributionValue?.toString() ?? "")
  const [signal, setSignal] = useState(c?.overrides?.careerSignal?.toString() ?? "")

  function togglePath(p: CareerPath) {
    setPaths((ps) => (ps.includes(p) ? ps.filter((x) => x !== p) : [...ps, p]))
  }

  function saveOverrides() {
    run(() => setRepoOverrides(repo.slug, {
      difficulty: difficulty || undefined,
      careerPaths: paths,
      learningValue: learning ? Number(learning) : undefined,
      contributionValue: contribution ? Number(contribution) : undefined,
      careerSignal: signal ? Number(signal) : undefined,
    }, reason))
  }

  return (
    <aside className="adm-drawer">
      <div className="adm-drawer__head">
        <div className="adm-drawer__title">
          <a href={repo.href} target="_blank" rel="noopener noreferrer">{repo.slug} ↗</a>
          <span className="adm-drawer__meta">
            {repo.stars.toLocaleString()}★ · {repo.activityTier} · {repo.language ?? "?"} · {repo.license ?? "no license"}
          </span>
        </div>
        <button className="adm-btn adm-btn--ghost" onClick={onClose}>✕</button>
      </div>

      {repo.note && <p className="adm-drawer__desc">{repo.note}</p>}

      <div className="adm-drawer__facts">
        <span>confidence {repo.confidence === null ? "–" : repo.confidence.toFixed(2)}</span>
        <span>{repo.depCount} deps</span>
        <span>{repo.openIssues} open issues</span>
        {repo.domain && <span>{repo.domain}</span>}
        {repo.companyBacked && <span>company-backed</span>}
        {repo.missing.length > 0 && <span className="adm-table__warn">missing: {repo.missing.join(", ")}</span>}
      </div>

      <div className="adm-field">
        <label>Audit reason — why are you changing this?</label>
        <input className="adm-input" placeholder={'e.g. "maintainer recommended it"'} value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>

      <div className="adm-drawer__section">
        <div className="adm-drawer__section-title">Visibility</div>
        <div className="adm-drawer__row">
          {repo.curation?.featured ? (
            <button className="adm-btn adm-btn--ghost" disabled={pending} onClick={() => run(() => featureRepo(repo.slug, false, reason))}>★ Unfeature</button>
          ) : (
            <button className="adm-btn adm-btn--primary" disabled={pending} onClick={() => run(() => featureRepo(repo.slug, true, reason))}>★ Feature</button>
          )}
          {repo.curation?.hidden ? (
            <button className="adm-btn adm-btn--ghost" disabled={pending} onClick={() => run(() => unhideRepo(repo.slug, reason))}>Unhide</button>
          ) : (
            <>
              <select className="adm-select" value={hideReason} onChange={(e) => setHideReason(e.target.value as HideReason)}>
                {HIDE_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <button className="adm-btn adm-btn--reject" disabled={pending} onClick={() => run(() => hideRepo(repo.slug, hideReason, reason))}>Hide</button>
            </>
          )}
        </div>
        {repo.curation?.hidden && (
          <div className="adm-drawer__hint">hidden as “{repo.curation.hidden.reason}” {repo.curation.hidden.note ? `— ${repo.curation.hidden.note}` : ""}</div>
        )}
      </div>

      <div className="adm-drawer__section">
        <div className="adm-drawer__section-title">Curator note</div>
        <textarea className="adm-input adm-textarea" rows={2} placeholder="Shown alongside the repo, signed by the humans" value={note} onChange={(e) => setNote(e.target.value)} />
        <div className="adm-drawer__row">
          <button className="adm-btn adm-btn--ghost" disabled={pending || note === (c?.note ?? "")} onClick={() => run(() => setRepoNote(repo.slug, note))}>Save note</button>
        </div>
      </div>

      <div className="adm-drawer__section">
        <div className="adm-drawer__section-title">Overrides — layered on top of raw data</div>
        <div className="adm-field">
          <label>Difficulty</label>
          <select className="adm-select" value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty | "")}>
            <option value="">no override</option>
            {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="adm-field">
          <label>Career relevance</label>
          <div className="adm-drawer__row">
            {CAREER_PATHS.map((p) => (
              <label key={p} className="adm-check">
                <input type="checkbox" checked={paths.includes(p)} onChange={() => togglePath(p)} /> {p}
              </label>
            ))}
          </div>
        </div>
        <div className="adm-drawer__scores">
          <div className="adm-field">
            <label>Learning value</label>
            <input className="adm-input adm-input--num" type="number" min={1} max={100} placeholder="1–100" value={learning} onChange={(e) => setLearning(e.target.value)} />
          </div>
          <div className="adm-field">
            <label>Contribution value</label>
            <input className="adm-input adm-input--num" type="number" min={1} max={100} placeholder="1–100" value={contribution} onChange={(e) => setContribution(e.target.value)} />
          </div>
          <div className="adm-field">
            <label>Career signal</label>
            <input className="adm-input adm-input--num" type="number" min={1} max={100} placeholder="1–100" value={signal} onChange={(e) => setSignal(e.target.value)} />
          </div>
        </div>
        <div className="adm-drawer__row">
          <button className="adm-btn adm-btn--primary" disabled={pending} onClick={saveOverrides}>Save overrides</button>
          {c?.overrides && (
            <button className="adm-btn adm-btn--ghost" disabled={pending} onClick={() => run(() => setRepoOverrides(repo.slug, {}, reason || "cleared overrides"))}>Clear</button>
          )}
        </div>
      </div>
    </aside>
  )
}
