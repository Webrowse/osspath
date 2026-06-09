import { Suspense } from "react"
import type { Metadata } from "next"
import { EditorialLayout } from "@/components/editorial/editorial-layout"
import { JobCard } from "@/components/editorial/job-card"
import { ArchiveSearch } from "@/components/editorial/archive-search"
import { JOBS } from "@/content/jobs"
import { filterActive, matchesQuery } from "@/lib/content-utils"

export const metadata: Metadata = {
  title: "Remote Rust Jobs",
  description: "Curated remote Rust engineering roles — explicit Rust only, manually verified before listing. No job board noise.",
  alternates: { canonical: "https://jobs.adarshrust.com/jobs" },
  openGraph: {
    title: "Remote Rust Jobs",
    description: "Curated remote Rust engineering roles — explicit Rust only, manually verified before listing.",
    url: "https://jobs.adarshrust.com/jobs",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Remote Rust Jobs",
    description: "Curated remote Rust engineering roles — explicit Rust only, manually verified.",
    images: ["/opengraph-image"],
  },
}

interface PageProps {
  searchParams: Promise<{ q?: string }>
}

export default async function JobsArchivePage({ searchParams }: PageProps) {
  const { q = "" } = await searchParams
  const active = filterActive(JOBS)
  const items = q ? active.filter((j) => matchesQuery(j as Record<string, unknown>, q)) : active

  return (
    <EditorialLayout>
      <section style={{ paddingTop: "clamp(40px, 6vw, 64px)", paddingBottom: "clamp(64px, 9vw, 104px)" }}>
        <div className="e-col">
          <div className="e-archive-header">
            <div>
              <div className="e-section__num">Open positions</div>
              <h1 className="e-section__title" style={{ fontSize: "clamp(26px, 3.4vw, 32px)" }}>Remote Rust Jobs</h1>
              <p className="e-archive-meta">
                Rust-explicit roles only. Each entry links directly to the company careers page and is manually verified before listing.
              </p>
            </div>
            <Suspense>
              <ArchiveSearch placeholder="Filter by company, role, or keyword…" defaultValue={q} />
            </Suspense>
          </div>

          <div style={{ marginTop: 8, marginBottom: 24 }}>
            <span className="e-section__meta">
              {items.length} {items.length === 1 ? "result" : "results"}
              {q && ` for "${q}"`}
            </span>
          </div>

          {items.length > 0 ? (
            <div className="e-jobs">
              {items.map((job) => (
                <JobCard key={`${job.company}-${job.role}`} job={job} />
              ))}
            </div>
          ) : (
            <p className="e-archive-empty">No jobs match that filter.</p>
          )}
        </div>
      </section>
    </EditorialLayout>
  )
}
