"use client"

import { PortalRow } from "./portal-row"
import { ArchiveSearch } from "./archive-search"
import { useArchiveFilter } from "@/lib/use-archive-filter"
import type { Portal } from "@/content/portals"

export function PortalsArchive({ portals }: { portals: Portal[] }) {
  const { q, filtered, onQueryChange } = useArchiveFilter(portals)

  return (
    <>
      <div className="e-archive-header">
        <div>
          <div className="e-section__num">Explore · Opportunities</div>
          <h1 className="e-section__title" style={{ fontSize: "clamp(26px, 3.4vw, 32px)" }}>Job Portals</h1>
          <p className="e-archive-meta">
            Rust-relevant job boards and aggregators. Complementary sources — not curated by this site.
          </p>
        </div>
        <ArchiveSearch placeholder="Filter by name or kind…" value={q} onChange={onQueryChange} />
      </div>

      <div style={{ marginTop: 8, marginBottom: 24 }}>
        <span className="e-section__meta">
          {filtered.length} {filtered.length === 1 ? "portal" : "portals"}
          {q && ` matching "${q}"`}
        </span>
      </div>

      {filtered.length > 0 ? (
        <div className="e-pulse">
          {filtered.map((portal) => (
            <PortalRow key={portal.name} portal={portal} />
          ))}
        </div>
      ) : (
        <p className="e-archive-empty">No portals match that filter.</p>
      )}
    </>
  )
}
