import type { Metadata } from "next"
import { EditorialLayout } from "@/components/editorial/editorial-layout"
import { EventsArchive } from "@/components/editorial/events-archive"
import { EVENTS } from "@/content/events"
import { filterActive } from "@/lib/content-utils"

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

export default function EventsArchivePage() {
  const active = filterActive(EVENTS)

  return (
    <EditorialLayout>
      <section style={{ paddingTop: "clamp(40px, 6vw, 64px)", paddingBottom: "clamp(64px, 9vw, 104px)" }}>
        <div className="e-col">
          <EventsArchive events={active} />
        </div>
      </section>
    </EditorialLayout>
  )
}
