import { Suspense } from "react"
import type { Metadata } from "next"
import { EditorialLayout } from "@/components/editorial/editorial-layout"
import { GrantCard } from "@/components/editorial/grant-card"
import { ArchiveSearch } from "@/components/editorial/archive-search"
import { GRANTS } from "@/content/grants"
import { filterActive, matchesQuery } from "@/lib/content-utils"

export const metadata: Metadata = {
  title: "Rust Funding",
  description: "Funding opportunities for Rust ecosystem work — Rust Foundation grants, fellowships, NLnet programs, government investment, and more.",
  alternates: { canonical: "/grants" },
  openGraph: {
    title: "Rust Funding",
    description: "Rust Foundation grants, NLnet, Sovereign Tech Fund, OpenSSF, and more — curated funding for Rust ecosystem work.",
    url: "/grants",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rust Funding",
    description: "Funding opportunities for Rust ecosystem work — grants, fellowships, and more.",
    images: ["/opengraph-image"],
  },
}

interface PageProps {
  searchParams: Promise<{ q?: string }>
}

export default async function GrantsArchivePage({ searchParams }: PageProps) {
  const { q = "" } = await searchParams
  const active = filterActive(GRANTS)
  const items  = q ? active.filter((p) => matchesQuery(p as Record<string, unknown>, q)) : active

  return (
    <EditorialLayout>
      <section style={{ paddingTop: "clamp(40px, 6vw, 64px)", paddingBottom: "clamp(64px, 9vw, 104px)" }}>
        <div className="e-col">
          <div className="e-archive-header">
            <div>
              <div className="e-section__num">Funding</div>
              <h1 className="e-section__title" style={{ fontSize: "clamp(26px, 3.4vw, 32px)" }}>Funding Programs</h1>
              <p className="e-archive-meta">
                Curated funding for Rust ecosystem work. Each program links to the funder for current terms and deadlines.{" "}
                <a href="/funders" style={{ color: "var(--e-accent)", textDecoration: "none" }}>Browse funders →</a>
              </p>
            </div>
            <Suspense>
              <ArchiveSearch placeholder="Filter by name or type…" defaultValue={q} />
            </Suspense>
          </div>

          <div style={{ marginTop: 8, marginBottom: 24 }}>
            <span className="e-section__meta">
              {items.length} {items.length === 1 ? "program" : "programs"}
              {q && ` matching "${q}"`}
            </span>
          </div>

          {items.length > 0 ? (
            <div className="e-grants">
              {items.map((program) => (
                <GrantCard key={program.slug} program={program} />
              ))}
            </div>
          ) : (
            <p className="e-archive-empty">No programs match that filter.</p>
          )}
        </div>
      </section>
    </EditorialLayout>
  )
}
