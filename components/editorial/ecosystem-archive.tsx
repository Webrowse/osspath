"use client"

import Link from "next/link"
import { ArchiveSearch } from "./archive-search"
import { useArchiveFilter } from "@/lib/use-archive-filter"
import type { EcosystemCompany } from "@/content/companies"

export type EcosystemCompanyView = EcosystemCompany & { hasRepos: boolean }

export function EcosystemArchive({ companies }: { companies: EcosystemCompanyView[] }) {
  const { q, filtered, onQueryChange } = useArchiveFilter(companies)

  return (
    <>
      <div className="e-archive-header">
        <div>
          <div className="e-section__num">Who builds Rust</div>
          <h1 className="e-section__title" style={{ fontSize: "clamp(26px, 3.4vw, 32px)" }}>Organizations</h1>
          <p className="e-archive-meta">
            Not all companies listed here are hiring. This page is for ecosystem orientation — who builds what.
          </p>
        </div>
        <ArchiveSearch placeholder="Filter by name or sector…" value={q} onChange={onQueryChange} />
      </div>

      <div style={{ marginTop: 8, marginBottom: 24 }}>
        <span className="e-section__meta">
          {filtered.length} {filtered.length === 1 ? "company" : "companies"}
          {q && ` matching "${q}"`}
        </span>
      </div>

      {filtered.length > 0 ? (
        <div className="e-companies">
          {filtered.map((c) => {
            const hasProfile = !!c.slug
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
                  <span className="e-company__hint" aria-hidden="true">{c.hasRepos ? "Repos →" : "Profile →"}</span>
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
    </>
  )
}
