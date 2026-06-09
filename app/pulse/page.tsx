import { Suspense } from "react"
import type { Metadata } from "next"
import { EditorialLayout } from "@/components/editorial/editorial-layout"
import { PulseRow } from "@/components/editorial/pulse-item"
import { ArchiveSearch } from "@/components/editorial/archive-search"
import { PULSE } from "@/content/pulse"
import { matchesQuery } from "@/lib/content-utils"

export const metadata: Metadata = {
  title: "Ecosystem Pulse — Rust Community",
  description: "The important Rust community spaces — This Week in Rust, the Rust Users Forum, community newsletters, podcasts, and working-group channels.",
  alternates: { canonical: "https://jobs.adarshrust.com/pulse" },
  openGraph: {
    title: "Ecosystem Pulse — Rust Community",
    description: "Curated Rust community spaces — newsletters, forums, podcasts, and working-group channels worth following.",
    url: "https://jobs.adarshrust.com/pulse",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ecosystem Pulse — Rust Community",
    description: "Rust newsletters, forums, podcasts, and community channels — curated.",
    images: ["/opengraph-image"],
  },
}

interface PageProps {
  searchParams: Promise<{ q?: string }>
}

export default async function PulseArchivePage({ searchParams }: PageProps) {
  const { q = "" } = await searchParams
  const items = q ? PULSE.filter((p) => matchesQuery(p as Record<string, unknown>, q)) : PULSE

  return (
    <EditorialLayout>
      <section style={{ paddingTop: "clamp(40px, 6vw, 64px)", paddingBottom: "clamp(64px, 9vw, 104px)" }}>
        <div className="e-col">
          <div className="e-archive-header">
            <div>
              <div className="e-section__num">Community</div>
              <h1 className="e-section__title" style={{ fontSize: "clamp(26px, 3.4vw, 32px)" }}>Ecosystem Pulse</h1>
              <p className="e-archive-meta">
                Community spaces, forums, newsletters, and podcasts worth following.
              </p>
            </div>
            <Suspense>
              <ArchiveSearch placeholder="Filter by title or type…" defaultValue={q} />
            </Suspense>
          </div>

          <div style={{ marginTop: 8, marginBottom: 24 }}>
            <span className="e-section__meta">
              {items.length} {items.length === 1 ? "resource" : "resources"}
              {q && ` matching "${q}"`}
            </span>
          </div>

          {items.length > 0 ? (
            <div className="e-pulse">
              {items.map((item) => (
                <PulseRow key={item.title} item={item} />
              ))}
            </div>
          ) : (
            <p className="e-archive-empty">No resources match that filter.</p>
          )}
        </div>
      </section>
    </EditorialLayout>
  )
}
