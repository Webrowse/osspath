import type { Metadata } from "next"
import Link from "next/link"
import { EditorialLayout } from "@/components/editorial/editorial-layout"
import { OSSBrowser } from "@/components/editorial/oss-browser"
import type { OSSListRepo } from "@/content/oss-paths"
import { getOSSRepos } from "@/lib/oss-data"
import { getDepPageCounts, getQualifiedCrates } from "@/lib/deps-data"
import { getOwnerCompanyIndex } from "@/lib/company-data"

export const metadata: Metadata = {
  title: "Repos — Rust Ecosystem",
  description: "2,000+ curated Rust repositories filtered by stars, activity, license, and topic. Find realistic open-source contribution paths with maintainer context.",
  alternates: { canonical: "/oss" },
  openGraph: {
    title: "Repos — Rust Ecosystem",
    description: "2,000+ curated Rust repositories. Filter by stars, activity, license, and topic to find your next contribution.",
    url: "/oss",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Repos — Rust Ecosystem",
    description: "2,000+ curated Rust repositories filtered by stars, activity, and topic.",
    images: ["/opengraph-image"],
  },
}

export default function OSSArchivePage() {
  const depPageCounts = getDepPageCounts()
  const depPageCount  = getQualifiedCrates().length
  // Plain, serializable owner -> company map for the client component
  // (lib/company-data.ts is server-only, so OSSBrowser can't call it itself).
  const companyByOwner = Object.fromEntries(
    [...getOwnerCompanyIndex().entries()].map(([owner, c]) => [owner, { slug: c.slug, name: c.name }]),
  )
  // Slim projection sent to the client: drops enrichment/relationships/
  // ecosystemIntelligence (the bulk of each repo's JSON weight) since the
  // browser's filter UI never reads them.
  const repos: OSSListRepo[] = getOSSRepos().map((r) => ({
    name: r.name,
    owner: r.owner,
    href: r.href,
    note: r.note,
    stars: r.stars,
    forks: r.forks,
    openIssuesCount: r.openIssuesCount,
    topics: r.topics,
    license: r.license,
    kind: r.kind,
    activityTier: r.activityTier,
    dependencies: r.dependencies,
    labels: r.labels,
    pushedAt: r.pushedAt,
    technologies: r.ecosystemIntelligence?.technologies,
  }))

  return (
    <EditorialLayout>
      <section style={{ paddingTop: "clamp(32px, 4vw, 48px)", paddingBottom: "clamp(64px, 9vw, 104px)" }}>
        <div className="e-col e-col--wide">
          <div className="e-archive-header" style={{ marginBottom: 20 }}>
            <div>
              <div className="e-section__num">Directory</div>
              <h1 className="e-section__title" style={{ fontSize: "clamp(22px, 2.8vw, 28px)" }}>
                Repositories
              </h1>
              <p className="e-archive-meta">
                {repos.length} curated Rust repositories — filter by stars, activity, license, owner, topic, ecosystem, or dependency.{" "}
                <Link href="/deps" style={{ color: "var(--e-accent)", textDecoration: "none" }}>
                  Browse {depPageCount} crate pages →
                </Link>
              </p>
            </div>
          </div>

          <OSSBrowser
            repos={repos}
            depPageCounts={depPageCounts}
            companyByOwner={companyByOwner}
          />
        </div>
      </section>
    </EditorialLayout>
  )
}
