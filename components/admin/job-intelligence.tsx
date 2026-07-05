"use client"

import { useState, useTransition } from "react"
import type { AdminJobRow, AdminCompanyRow } from "@/lib/admin/job-intel"
import type { CareerPath } from "@/lib/admin/curation-types"
import { CAREER_PATHS } from "@/lib/admin/curation-types"
import {
  hideJob, unhideJob, markJobDuplicate, clearJobDuplicate,
  setJobIntelligence, featureCompany,
} from "@/lib/admin/curation-actions"

/**
 * Job intelligence control: correct what the machine detected (career path,
 * skills), hide bad listings, resolve duplicates, and pick featured
 * companies. Corrections are overrides - the scraped job data is untouched.
 */

export function JobIntelligence({ jobs, companies }: { jobs: AdminJobRow[]; companies: AdminCompanyRow[] }) {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [openHref, setOpenHref] = useState<string | null>(null)
  const [showHidden, setShowHidden] = useState(false)
  const [companyQ, setCompanyQ] = useState("")

  function run(fn: () => Promise<void>) {
    setError(null)
    start(async () => {
      try { await fn() } catch (e) { setError(e instanceof Error ? e.message : String(e)) }
    })
  }

  const dupeCount = jobs.filter((j) => j.possibleDuplicates.length > 0 && !j.curation?.duplicateOf).length
  const hiddenCount = jobs.filter((j) => j.curation?.hidden).length
  const visibleJobs = showHidden ? jobs : jobs.filter((j) => !j.curation?.hidden)
  const featuredCompanies = companies.filter((c) => c.featured)
  const visibleCompanies = companies.filter((c) =>
    !companyQ || c.name.toLowerCase().includes(companyQ.toLowerCase()) || c.sector.toLowerCase().includes(companyQ.toLowerCase()),
  )

  return (
    <div className="adm-jobs">
      {error && <div className="adm-db-warn" style={{ margin: "0 0 8px" }}>{error}</div>}

      <section className="adm-jobs__section">
        <div className="adm-list-group__title">
          Live jobs · {dupeCount > 0 ? `${dupeCount} possible duplicate${dupeCount === 1 ? "" : "s"} · ` : ""}
          {hiddenCount} hidden
          <label className="adm-check" style={{ marginLeft: 12 }}>
            <input type="checkbox" checked={showHidden} onChange={(e) => setShowHidden(e.target.checked)} /> show hidden
          </label>
        </div>

        <div className="adm-src-list">
          {visibleJobs.map((job) => (
            <JobCard
              key={job.href}
              job={job}
              open={openHref === job.href}
              onToggle={() => setOpenHref(openHref === job.href ? null : job.href)}
              pending={pending}
              run={run}
            />
          ))}
        </div>
      </section>

      <section className="adm-jobs__section">
        <div className="adm-list-group__title">
          Companies · {featuredCompanies.length} featured
        </div>
        <div className="adm-queue-toolbar">
          <input className="adm-search" placeholder="Search companies…" value={companyQ} onChange={(e) => setCompanyQ(e.target.value)} />
          <span className="adm-queue-toolbar__count">{visibleCompanies.length} shown</span>
        </div>
        <div className="adm-company-grid">
          {visibleCompanies.map((c) => (
            <div key={c.slug} className={`adm-company${c.featured ? " adm-company--featured" : ""}`}>
              <div className="adm-src__main">
                <span className="adm-src__label">{c.name}</span>
                <span className="adm-src__meta">{c.sector || "—"}{c.jobCount > 0 ? ` · ${c.jobCount} job${c.jobCount === 1 ? "" : "s"}` : ""}</span>
              </div>
              <button
                className={`adm-btn ${c.featured ? "adm-btn--primary" : "adm-btn--ghost"}`}
                disabled={pending}
                title={c.featured ? "Unfeature" : "Feature"}
                onClick={() => run(() => featureCompany(c.slug, !c.featured))}
              >★</button>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function JobCard({
  job, open, onToggle, pending, run,
}: {
  job: AdminJobRow
  open: boolean
  onToggle: () => void
  pending: boolean
  run: (fn: () => Promise<void>) => void
}) {
  const c = job.curation
  const effectivePath = c?.path ?? job.detectedPath
  const effectiveSkills = c?.skills ?? job.detectedSkills
  const [reason, setReason] = useState("")
  const [path, setPath] = useState<CareerPath | "">(c?.path ?? "")
  const [skills, setSkills] = useState((c?.skills ?? []).join(", "))

  return (
    <div className={`adm-src adm-job${c?.hidden ? " adm-src--off" : ""}`} style={{ flexDirection: "column", alignItems: "stretch" }}>
      <div className="adm-job__row" onClick={onToggle}>
        <div className="adm-src__main">
          <span className="adm-src__label">
            {job.company} — {job.role}
            {c?.hidden && <span className="adm-chip adm-chip--warn">hidden</span>}
            {c?.duplicateOf && <span className="adm-chip adm-chip--warn">duplicate</span>}
            {job.possibleDuplicates.length > 0 && !c?.duplicateOf && <span className="adm-chip adm-chip--warn">dupe?</span>}
          </span>
          <span className="adm-src__meta">
            path: {effectivePath ?? "?"}{c?.path ? " (corrected)" : " (detected)"} ·
            skills: {effectiveSkills.length > 0 ? effectiveSkills.join(", ") : "?"}{c?.skills ? " (corrected)" : ""}
          </span>
        </div>
        <a className="adm-btn adm-btn--ghost" href={job.href} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>↗</a>
      </div>

      {open && (
        <div className="adm-job__editor">
          <div className="adm-field">
            <label>Audit reason</label>
            <input className="adm-input" placeholder="Why this correction" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>

          <div className="adm-job__editor-grid">
            <div className="adm-field">
              <label>Career path (detected: {job.detectedPath ?? "none"})</label>
              <select className="adm-select" value={path} onChange={(e) => setPath(e.target.value as CareerPath | "")}>
                <option value="">use detection</option>
                {CAREER_PATHS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="adm-field">
              <label>Skills (detected: {job.detectedSkills.join(", ") || "none"})</label>
              <input className="adm-input" placeholder="Tokio, Networking, Linux…" value={skills} onChange={(e) => setSkills(e.target.value)} />
            </div>
          </div>

          <div className="adm-drawer__row">
            <button className="adm-btn adm-btn--primary" disabled={pending}
              onClick={() => run(() => setJobIntelligence(job.href, {
                path: path === "" ? null : path,
                skills: skills.trim() ? skills.split(",").map((s) => s.trim()).filter(Boolean) : null,
              }, reason))}>
              Save correction
            </button>

            {c?.hidden ? (
              <button className="adm-btn adm-btn--ghost" disabled={pending} onClick={() => run(() => unhideJob(job.href, reason))}>Unhide</button>
            ) : (
              <button className="adm-btn adm-btn--reject" disabled={pending} onClick={() => run(() => hideJob(job.href, reason || "hidden by admin"))}>Hide job</button>
            )}

            {c?.duplicateOf ? (
              <button className="adm-btn adm-btn--ghost" disabled={pending} onClick={() => run(() => clearJobDuplicate(job.href, reason))}>
                Not a duplicate
              </button>
            ) : job.possibleDuplicates.length > 0 && (
              <button className="adm-btn adm-btn--reject" disabled={pending} title={`of ${job.possibleDuplicates[0]}`}
                onClick={() => run(() => markJobDuplicate(job.href, job.possibleDuplicates[0], reason || "same company + role"))}>
                Mark duplicate
              </button>
            )}
          </div>

          {c?.duplicateOf && <div className="adm-drawer__hint">duplicate of {c.duplicateOf}</div>}
          {job.possibleDuplicates.length > 0 && !c?.duplicateOf && (
            <div className="adm-drawer__hint">looks like: {job.possibleDuplicates.join(" · ")}</div>
          )}
        </div>
      )}
    </div>
  )
}
