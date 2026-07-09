"use client"

import { EventCard } from "./event-card"
import { ArchiveSearch } from "./archive-search"
import { useArchiveFilter } from "@/lib/use-archive-filter"
import type { EcosystemEvent } from "@/content/events"

export function EventsArchive({ events }: { events: EcosystemEvent[] }) {
  const { q, filtered, onQueryChange } = useArchiveFilter(events)

  return (
    <>
      <div className="e-archive-header">
        <div>
          <div className="e-section__num">Explore · Out in the world</div>
          <h1 className="e-section__title" style={{ fontSize: "clamp(26px, 3.4vw, 32px)" }}>Rust Events</h1>
          <p className="e-archive-meta">
            Conferences, workshops, and recurring community sessions. Temporary opportunities only.
          </p>
        </div>
        <ArchiveSearch placeholder="Filter by title or type…" value={q} onChange={onQueryChange} />
      </div>

      <div style={{ marginTop: 8, marginBottom: 24 }}>
        <span className="e-section__meta">
          {filtered.length} {filtered.length === 1 ? "event" : "events"}
          {q && ` matching "${q}"`}
        </span>
      </div>

      {filtered.length > 0 ? (
        <div className="e-events">
          {filtered.map((event) => (
            <EventCard key={event.title} event={event} />
          ))}
        </div>
      ) : (
        <p className="e-archive-empty">No events match that filter.</p>
      )}
    </>
  )
}
