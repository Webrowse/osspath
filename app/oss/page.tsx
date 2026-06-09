import type { Metadata } from "next"
import { EditorialLayout } from "@/components/editorial/editorial-layout"
import { OSSBrowser } from "@/components/editorial/oss-browser"
import { OSS_PATHS } from "@/content/oss-paths"

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

          <OSSBrowser repos={OSS_PATHS} />
        </div>
      </section>
    </EditorialLayout>
  )
}
