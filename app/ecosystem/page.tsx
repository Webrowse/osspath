import { Suspense } from "react"
import Link from "next/link"
import type { Metadata } from "next"
import { EditorialLayout } from "@/components/editorial/editorial-layout"
import { ArchiveSearch } from "@/components/editorial/archive-search"
import { COMPANIES } from "@/content/companies"
import { matchesQuery } from "@/lib/content-utils"
import { getOwnerCompanyIndex } from "@/lib/company-data"

export const metadata: Metadata = {
  title: "Companies Using Rust in Production",
  description: "Ecosystem orientation — who builds what with Rust. Tokio, Cloudflare, Microsoft, Mozilla, and more. Not all companies listed are actively hiring.",
  alternates: { canonical: "/ecosystem" },
  openGraph: {
    title: "Companies Using Rust in Production",
    description: "Who builds what with Rust — ecosystem orientation across infrastructure, databases, networking, and tooling.",
    url: "/ecosystem",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Companies Using Rust in Production",
    description: "Who builds what with Rust — ecosystem orientation across infrastructure, databases, and tooling.",
    images: ["/opengraph-image"],
  },
}

interface PageProps {
  searchParams: Promise<{ q?: string }>
}

export default async function EcosystemPage({ searchParams }: PageProps) {
  const { q = "" } = await searchParams
  const items       = q ? COMPANIES.filter((c) => matchesQuery(c as Record<string, unknown>, q)) : COMPANIES
  const ownerIndex  = getOwnerCompanyIndex()

  return (
    <EditorialLayout>
      <section style={{ paddingTop: "clamp(40px, 6vw, 64px)", paddingBottom: "clamp(64px, 9vw, 104px)" }}>
        <div className="e-col e-col--wide">
          <div className="e-archive-header">
            <div>
              <div className="e-section__num">Who builds Rust</div>
              <h1 className="e-section__title" style={{ fontSize: "clamp(26px, 3.4vw, 32px)" }}>Organizations</h1>
              <p className="e-archive-meta">
                Not all companies listed here are hiring. This page is for ecosystem orientation — who builds what.
              </p>
            </div>
            <Suspense>
              <ArchiveSearch placeholder="Filter by name or sector…" defaultValue={q} />
            </Suspense>
          </div>

          <div style={{ marginTop: 8, marginBottom: 24 }}>
            <span className="e-section__meta">
              {items.length} {items.length === 1 ? "company" : "companies"}
              {q && ` matching "${q}"`}
            </span>
          </div>

          {items.length > 0 ? (
            <div className="e-companies">
              {items.map((c) => {
                const hasProfile = !!c.slug
                const hasRepos   = c.github_org ? ownerIndex.has(c.github_org.toLowerCase()) : false
                const sectorLine = c.status === "acquired"
                  ? `${c.sector} · Acquired`
                  : c.sector
                if (hasProfile) {
                  return (
                    <Link
                      key={c.name}
                      href={`/ecosystem/${c.slug}`}
                      className="e-company"
                      aria-label={c.name}
                    >
                      <span className="e-company__name">{c.name}</span>
                      <span className="e-company__sector">{sectorLine}</span>
                      <span className="e-company__hint" aria-hidden="true">{hasRepos ? "Repos →" : "Profile →"}</span>
                    </Link>
                  )
                }
                return (
                  <a
                    key={c.name}
                    className="e-company"
                    href={c.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={c.name}
                  >
                    <span className="e-company__name">{c.name}</span>
                    <span className="e-company__sector">{sectorLine}</span>
                    <span className="e-company__hint" aria-hidden="true">Visit →</span>
                  </a>
                )
              })}
            </div>
          ) : (
            <p className="e-archive-empty">No companies match that filter.</p>
          )}

        </div>
      </section>
    </EditorialLayout>
  )
}
