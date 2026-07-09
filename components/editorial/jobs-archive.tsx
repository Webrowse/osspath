"use client"

import { JobCard } from "./job-card"
import { ArchiveSearch } from "./archive-search"
import { useArchiveFilter } from "@/lib/use-archive-filter"
import type { EditorialJob } from "@/content/jobs"

export function JobsArchive({ jobs }: { jobs: EditorialJob[] }) {
  const { q, filtered, onQueryChange } = useArchiveFilter(jobs)

  return (
    <>
      <div className="e-archive-header">
        <div>
          <div className="e-section__num">Open positions</div>
          <h1 className="e-section__title" style={{ fontSize: "clamp(26px, 3.4vw, 32px)" }}>Remote Rust Jobs</h1>
          <p className="e-archive-meta">
            Where the paths lead. Every role is hand-reviewed and linked to the organization&apos;s open-source footprint.
          </p>
        </div>
        <ArchiveSearch placeholder="Filter by company, role, or keyword…" value={q} onChange={onQueryChange} />
      </div>

      <div style={{ marginTop: 8, marginBottom: 24 }}>
        <span className="e-section__meta">
          {filtered.length} {filtered.length === 1 ? "result" : "results"}
          {q && ` for "${q}"`}
        </span>
      </div>

      {filtered.length > 0 ? (
        <div className="e-jobs">
          {filtered.map((job) => (
            <JobCard key={`${job.company}-${job.role}`} job={job} />
          ))}
        </div>
      ) : (
        <p className="e-archive-empty">No jobs match that filter.</p>
      )}
    </>
  )
}
