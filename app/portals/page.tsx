import { Suspense } from "react"
import type { Metadata } from "next"
import { EditorialLayout } from "@/components/editorial/editorial-layout"
import { PortalRow } from "@/components/editorial/portal-row"
import { ArchiveSearch } from "@/components/editorial/archive-search"
import { PORTALS } from "@/content/portals"
import { matchesQuery } from "@/lib/content-utils"

export const metadata: Metadata = {
  title: "Job Portals",
  description: "Rust-relevant job boards and aggregators to search alongside this site.",
}

interface PageProps {
  searchParams: Promise<{ q?: string }>
}

export default async function PortalsArchivePage({ searchParams }: PageProps) {
  const { q = "" } = await searchParams
  const items = q ? PORTALS.filter((p) => matchesQuery(p as Record<string, unknown>, q)) : PORTALS

  return (
    <EditorialLayout>
      <section style={{ paddingTop: "clamp(40px, 6vw, 64px)", paddingBottom: "clamp(64px, 9vw, 104px)" }}>
        <div className="e-col">
          <div className="e-archive-header">
            <div>
              <div className="e-section__num">Resources</div>
              <h1 className="e-section__title" style={{ fontSize: "clamp(26px, 3.4vw, 32px)" }}>Job Portals</h1>
              <p className="e-archive-meta">
                Rust-relevant job boards and aggregators. Complementary sources — not curated by this site.
              </p>
            </div>
            <Suspense>
              <ArchiveSearch placeholder="Filter by name or kind…" defaultValue={q} />
            </Suspense>
          </div>

          <div style={{ marginTop: 8, marginBottom: 24 }}>
            <span className="e-section__meta">
              {items.length} {items.length === 1 ? "portal" : "portals"}
              {q && ` matching "${q}"`}
            </span>
          </div>

          {items.length > 0 ? (
            <div className="e-pulse">
              {items.map((portal) => (
                <PortalRow key={portal.name} portal={portal} />
              ))}
            </div>
          ) : (
            <p className="e-archive-empty">No portals match that filter.</p>
          )}
        </div>
      </section>
    </EditorialLayout>
  )
}
