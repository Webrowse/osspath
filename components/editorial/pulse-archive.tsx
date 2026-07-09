"use client"

import { PulseRow } from "./pulse-item"
import { ArchiveSearch } from "./archive-search"
import { useArchiveFilter } from "@/lib/use-archive-filter"
import type { PulseItem } from "@/content/pulse"

export function PulseArchive({ items: allItems }: { items: PulseItem[] }) {
  const { q, filtered, onQueryChange } = useArchiveFilter(allItems)

  return (
    <>
      <div className="e-archive-header">
        <div>
          <div className="e-section__num">Explore · Stay updated</div>
          <h1 className="e-section__title" style={{ fontSize: "clamp(26px, 3.4vw, 32px)" }}>Community Signals</h1>
          <p className="e-archive-meta">
            Community spaces, forums, newsletters, and podcasts worth following.
          </p>
        </div>
        <ArchiveSearch placeholder="Filter by title or type…" value={q} onChange={onQueryChange} />
      </div>

      <div style={{ marginTop: 8, marginBottom: 24 }}>
        <span className="e-section__meta">
          {filtered.length} {filtered.length === 1 ? "resource" : "resources"}
          {q && ` matching "${q}"`}
        </span>
      </div>

      {filtered.length > 0 ? (
        <div className="e-pulse">
          {filtered.map((item) => (
            <PulseRow key={item.title} item={item} />
          ))}
        </div>
      ) : (
        <p className="e-archive-empty">No resources match that filter.</p>
      )}
    </>
  )
}
