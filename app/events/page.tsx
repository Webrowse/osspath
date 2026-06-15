import { Suspense } from "react"
import type { Metadata } from "next"
import { EditorialLayout } from "@/components/editorial/editorial-layout"
import { EventCard } from "@/components/editorial/event-card"
import { ArchiveSearch } from "@/components/editorial/archive-search"
import { EVENTS } from "@/content/events"
import { filterActive, matchesQuery } from "@/lib/content-utils"

export const metadata: Metadata = {
  title: "Rust Events & Conferences",
  description: "Upcoming Rust conferences, workshops, and community events — RustConf, EuroRust, Oxidize, and recurring community calls.",
  alternates: { canonical: "/events" },
  openGraph: {
    title: "Rust Events & Conferences",
    description: "Upcoming Rust conferences, workshops, and community events — curated and kept current.",
    url: "/events",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rust Events & Conferences",
    description: "Upcoming Rust conferences, workshops, and recurring community events.",
    images: ["/opengraph-image"],
  },
}

interface PageProps {
  searchParams: Promise<{ q?: string }>
}

export default async function EventsArchivePage({ searchParams }: PageProps) {
  const { q = "" } = await searchParams
  const active = filterActive(EVENTS)
  const items = q ? active.filter((e) => matchesQuery(e as Record<string, unknown>, q)) : active

  return (
    <EditorialLayout>
      <section style={{ paddingTop: "clamp(40px, 6vw, 64px)", paddingBottom: "clamp(64px, 9vw, 104px)" }}>
        <div className="e-col">
          <div className="e-archive-header">
            <div>
              <div className="e-section__num">Calendar</div>
              <h1 className="e-section__title" style={{ fontSize: "clamp(26px, 3.4vw, 32px)" }}>Events & Learning</h1>
              <p className="e-archive-meta">
                Conferences, workshops, and recurring community sessions. Temporary opportunities only.
              </p>
            </div>
            <Suspense>
              <ArchiveSearch placeholder="Filter by title or type…" defaultValue={q} />
            </Suspense>
          </div>

          <div style={{ marginTop: 8, marginBottom: 24 }}>
            <span className="e-section__meta">
              {items.length} {items.length === 1 ? "event" : "events"}
              {q && ` matching "${q}"`}
            </span>
          </div>

          {items.length > 0 ? (
            <div className="e-events">
              {items.map((event) => (
                <EventCard key={event.title} event={event} />
              ))}
            </div>
          ) : (
            <p className="e-archive-empty">No events match that filter.</p>
          )}
        </div>
      </section>
    </EditorialLayout>
  )
}
