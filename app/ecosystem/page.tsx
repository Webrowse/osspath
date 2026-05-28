import { Suspense } from "react"
import type { Metadata } from "next"
import { EditorialLayout } from "@/components/editorial/editorial-layout"
import { ArchiveSearch } from "@/components/editorial/archive-search"
import { COMPANIES } from "@/content/companies"
import { matchesQuery } from "@/lib/content-utils"

export const metadata: Metadata = {
  title: "Companies Using Rust",
  description: "Ecosystem orientation — who builds what with Rust. Not all companies listed are hiring.",
}

interface PageProps {
  searchParams: Promise<{ q?: string }>
}

export default async function EcosystemPage({ searchParams }: PageProps) {
  const { q = "" } = await searchParams
  const items = q ? COMPANIES.filter((c) => matchesQuery(c as Record<string, unknown>, q)) : COMPANIES

  return (
    <EditorialLayout>
      <section style={{ paddingTop: "clamp(40px, 6vw, 64px)", paddingBottom: "clamp(64px, 9vw, 104px)" }}>
        <div className="e-col e-col--wide">
          <div className="e-archive-header">
            <div>
              <div className="e-section__num">Archive</div>
              <h1 className="e-section__title" style={{ fontSize: "clamp(26px, 3.4vw, 32px)" }}>Companies Using Rust</h1>
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
              {items.map((c) => (
                <a
                  key={c.name}
                  className="e-company"
                  href={c.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={c.name}
                >
                  <span className="e-company__name">{c.name}</span>
                  <span className="e-company__sector">{c.sector}</span>
                  <span className="e-company__hint" aria-hidden="true">Visit →</span>
                </a>
              ))}
            </div>
          ) : (
            <p className="e-archive-empty">No companies match that filter.</p>
          )}

          <div style={{ marginTop: 28, paddingTop: 20, borderTop: "1px solid var(--e-line-soft)" }}>
            <p style={{ fontSize: 14, color: "var(--e-fg-dim)", fontFamily: "var(--e-mono)", margin: 0 }}>
              Track companies, save notes, and monitor hiring signals in the{" "}
              <a
                href="/companies"
                style={{ color: "var(--e-accent)", textDecoration: "none", borderBottom: "1px dashed currentColor" }}
              >
                Research Workspace →
              </a>
            </p>
          </div>
        </div>
      </section>
    </EditorialLayout>
  )
}
