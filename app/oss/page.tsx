import type { Metadata } from "next"
import Link from "next/link"
import { EditorialLayout } from "@/components/editorial/editorial-layout"
import { OSSBrowser } from "@/components/editorial/oss-browser"
import { OSS_PATHS } from "@/content/oss-paths"
import { getCompanionIndex, getDepPageCounts, DEP_PAGE_THRESHOLD } from "@/lib/deps-data"

export const metadata: Metadata = {
  title: "OSS Paths — Approachable Rust Repositories",
  description: "2,000+ curated Rust repositories filtered by stars, activity, license, and topic. Find realistic open-source contribution paths with maintainer context.",
  alternates: { canonical: "https://jobs.adarshrust.com/oss" },
  openGraph: {
    title: "OSS Paths — Approachable Rust Repositories",
    description: "2,000+ curated Rust repositories. Filter by stars, activity, license, and topic to find your next contribution.",
    url: "https://jobs.adarshrust.com/oss",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "OSS Paths — Approachable Rust Repositories",
    description: "2,000+ curated Rust repositories filtered by stars, activity, and topic.",
    images: ["/opengraph-image"],
  },
}

export default function OSSArchivePage() {
  const depPageCounts = getDepPageCounts()
  const featuredDeps = Object.entries(getCompanionIndex())
    .filter(([, v]) => v.repoCount >= DEP_PAGE_THRESHOLD)
    .sort((a, b) => b[1].repoCount - a[1].repoCount)
    .slice(0, 24)
    .map(([name]) => name)

  return (
    <EditorialLayout>
      <section style={{ paddingTop: "clamp(40px, 6vw, 64px)", paddingBottom: "clamp(64px, 9vw, 104px)" }}>
        <div className="e-col e-col--wide">
          <div className="e-archive-header" style={{ marginBottom: 28 }}>
            <div>
              <div className="e-section__num">Directory</div>
              <h1 className="e-section__title" style={{ fontSize: "clamp(26px, 3.4vw, 32px)" }}>
                OSS Paths
              </h1>
              <p className="e-archive-meta">
                {OSS_PATHS.length} repositories — curated for active maintenance and real contribution opportunities.
                Filter by stars, activity, license, owner, or topic.
              </p>
            </div>
          </div>

          {/* ── Popular dependencies ──────────────────────────────────────────── */}
          {featuredDeps.length > 0 && (
            <div style={{ marginBottom: 40 }}>
              <div
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--color-muted)",
                  marginBottom: 12,
                }}
              >
                Popular Rust Dependencies
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {featuredDeps.map((crate) => (
                  <Link key={crate} href={`/deps/${crate}`} style={{ textDecoration: "none" }}>
                    <span
                      className="e-tag e-tag--soft"
                      style={{ cursor: "pointer", fontFamily: "var(--font-ibm-plex-mono)", fontSize: 12 }}
                    >
                      {crate}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <OSSBrowser repos={OSS_PATHS} depPageCounts={depPageCounts} />
        </div>
      </section>
    </EditorialLayout>
  )
}
