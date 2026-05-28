import { Suspense } from "react"
import type { Metadata } from "next"
import { EditorialLayout } from "@/components/editorial/editorial-layout"
import { OSSCard } from "@/components/editorial/oss-card"
import { ArchiveSearch } from "@/components/editorial/archive-search"
import { OSS_PATHS } from "@/content/oss-paths"
import { matchesQuery } from "@/lib/content-utils"

export const metadata: Metadata = {
  title: "OSS Paths — Approachable Rust Repositories",
  description: "Realistic Rust open-source contribution paths with maintainer context.",
}

interface PageProps {
  searchParams: Promise<{ q?: string }>
}

export default async function OSSArchivePage({ searchParams }: PageProps) {
  const { q = "" } = await searchParams
  const items = q ? OSS_PATHS.filter((r) => matchesQuery(r as Record<string, unknown>, q)) : OSS_PATHS

  return (
    <EditorialLayout>
      <section style={{ paddingTop: "clamp(40px, 6vw, 64px)", paddingBottom: "clamp(64px, 9vw, 104px)" }}>
        <div className="e-col">
          <div className="e-archive-header">
            <div>
              <div className="e-section__num">Archive</div>
              <h1 className="e-section__title" style={{ fontSize: "clamp(26px, 3.4vw, 32px)" }}>OSS Paths</h1>
              <p className="e-archive-meta">
                Repos chosen for responsive maintainers and realistic contribution paths. Metrics are observations, not scores.
              </p>
            </div>
            <Suspense>
              <ArchiveSearch placeholder="Filter by name, topic, or keyword…" defaultValue={q} />
            </Suspense>
          </div>

          <div style={{ marginTop: 8, marginBottom: 24 }}>
            <span className="e-section__meta">
              {items.length} {items.length === 1 ? "repository" : "repositories"}
              {q && ` matching "${q}"`}
            </span>
          </div>

          {items.length > 0 ? (
            <div className="e-oss-grid">
              {items.map((repo) => (
                <OSSCard key={repo.name} repo={repo} />
              ))}
            </div>
          ) : (
            <p className="e-archive-empty">No repositories match that filter.</p>
          )}
        </div>
      </section>
    </EditorialLayout>
  )
}
