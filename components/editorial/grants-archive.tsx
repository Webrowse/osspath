"use client"

import { GrantCard } from "./grant-card"
import { ArchiveSearch } from "./archive-search"
import { useArchiveFilter } from "@/lib/use-archive-filter"
import type { FundingProgram } from "@/content/grants"

export function GrantsArchive({ programs }: { programs: FundingProgram[] }) {
  const { q, filtered, onQueryChange } = useArchiveFilter(programs)

  return (
    <>
      <div className="e-archive-header">
        <div>
          <div className="e-section__num">Funding</div>
          <h1 className="e-section__title" style={{ fontSize: "clamp(26px, 3.4vw, 32px)" }}>Funding Programs</h1>
          <p className="e-archive-meta">
            Curated funding for Rust ecosystem work. Each program links to the funder for current terms and deadlines.{" "}
            <a href="/funders" style={{ color: "var(--e-accent)", textDecoration: "none" }}>Browse funders →</a>
          </p>
        </div>
        <ArchiveSearch placeholder="Filter by name or type…" value={q} onChange={onQueryChange} />
      </div>

      <div style={{ marginTop: 8, marginBottom: 24 }}>
        <span className="e-section__meta">
          {filtered.length} {filtered.length === 1 ? "program" : "programs"}
          {q && ` matching "${q}"`}
        </span>
      </div>

      {filtered.length > 0 ? (
        <div className="e-grants">
          {filtered.map((program) => (
            <GrantCard key={program.slug} program={program} />
          ))}
        </div>
      ) : (
        <p className="e-archive-empty">No programs match that filter.</p>
      )}
    </>
  )
}
