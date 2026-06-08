import { Suspense } from "react"
import type { Metadata } from "next"
import { EditorialLayout } from "@/components/editorial/editorial-layout"
import { GrantCard } from "@/components/editorial/grant-card"
import { ArchiveSearch } from "@/components/editorial/archive-search"
import { GRANTS } from "@/content/grants"
import { filterActive, matchesQuery } from "@/lib/content-utils"

export const metadata: Metadata = {
  title: "Rust Grants & Bounties",
  description: "Funding opportunities for Rust ecosystem work — grants, sponsorships, and bounties.",
}

interface PageProps {
  searchParams: Promise<{ q?: string }>
}

export default async function GrantsArchivePage({ searchParams }: PageProps) {
  const { q = "" } = await searchParams
  const active = filterActive(GRANTS)
  const items = q ? active.filter((g) => matchesQuery(g as Record<string, unknown>, q)) : active

  return (
    <EditorialLayout>
      <section style={{ paddingTop: "clamp(40px, 6vw, 64px)", paddingBottom: "clamp(64px, 9vw, 104px)" }}>
        <div className="e-col">
          <div className="e-archive-header">
            <div>
              <div className="e-section__num">Funding</div>
              <h1 className="e-section__title" style={{ fontSize: "clamp(26px, 3.4vw, 32px)" }}>Grants & Bounties</h1>
              <p className="e-archive-meta">
                Funding for Rust ecosystem work. Click through to the source for current terms and deadlines.
              </p>
            </div>
            <Suspense>
              <ArchiveSearch placeholder="Filter by name or type…" defaultValue={q} />
            </Suspense>
          </div>

          <div style={{ marginTop: 8, marginBottom: 24 }}>
            <span className="e-section__meta">
              {items.length} {items.length === 1 ? "opportunity" : "opportunities"}
              {q && ` matching "${q}"`}
            </span>
          </div>

          {items.length > 0 ? (
            <div className="e-grants">
              {items.map((grant) => (
                <GrantCard key={grant.name} grant={grant} />
              ))}
            </div>
          ) : (
            <p className="e-archive-empty">No grants match that filter.</p>
          )}
        </div>
      </section>
    </EditorialLayout>
  )
}
