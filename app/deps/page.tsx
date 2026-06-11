import type { Metadata } from "next"
import Link from "next/link"
import { EditorialLayout } from "@/components/editorial/editorial-layout"
import { DepsBrowser } from "@/components/editorial/deps-browser"
import { getQualifiedCrates, getDepStarWeights } from "@/lib/deps-data"
import { getCompanionIndex } from "@/lib/oss-data"

export const metadata: Metadata = {
  title: "Rust Dependencies — Browse Crate Pages",
  description: "Explore crate-specific pages for 500+ Rust dependencies. See which projects use each crate, companion crates by lift, and total star weight.",
  alternates: { canonical: "https://jobs.adarshrust.com/deps" },
  openGraph: {
    title: "Rust Dependencies — Browse Crate Pages",
    description: "500+ Rust crate pages — repo counts, star weight, companion crates.",
    url: "https://jobs.adarshrust.com/deps",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
}

export default function DepsIndexPage() {
  const index       = getCompanionIndex()
  const starWeights = getDepStarWeights()
  const qualified   = getQualifiedCrates()

  const crates = qualified.map(name => ({
    name,
    repoCount:  index[name]?.repoCount ?? 0,
    starWeight: starWeights[name]      ?? 0,
  }))

  const topCount      = crates.filter(c => c.repoCount >= 100).length
  const emergingCount = crates.filter(c => c.repoCount < 100).length

  return (
    <EditorialLayout>
      <section style={{ paddingTop: "clamp(40px, 6vw, 64px)", paddingBottom: "clamp(64px, 9vw, 104px)" }}>
        <div className="e-col e-col--wide">

          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" style={{ marginBottom: 24 }}>
            <Link href="/oss" style={{ fontSize: 13, color: "var(--color-muted)", textDecoration: "none" }}>
              ← OSS Paths
            </Link>
          </nav>

          {/* Header */}
          <header style={{ marginBottom: 32 }}>
            <div className="e-section__num">Ecosystem</div>
            <h1 className="e-section__title" style={{ fontSize: "clamp(22px, 2.8vw, 28px)" }}>
              Dependencies
            </h1>
            <p className="e-archive-meta" style={{ marginTop: 8 }}>
              {crates.length} crates with dedicated pages —{" "}
              {topCount} widely used, {emergingCount} emerging.
              Each page shows which repositories use the crate, companion crates by lift, and activity breakdown.
            </p>
          </header>

          <DepsBrowser crates={crates} />
        </div>
      </section>
    </EditorialLayout>
  )
}
