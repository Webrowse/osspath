import type { Metadata } from "next"
import Link from "next/link"
import { EditorialLayout } from "@/components/editorial/editorial-layout"
import { OSSBrowser } from "@/components/editorial/oss-browser"
import { OSS_PATHS } from "@/content/oss-paths"
import { getDepPageCounts, getQualifiedCrates } from "@/lib/deps-data"

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

interface PageProps {
  searchParams: Promise<{ dep?: string | string[]; eco?: string | string[] }>
}

export default async function OSSArchivePage({ searchParams }: PageProps) {
  const { dep, eco } = await searchParams
  const initialDeps = Array.isArray(dep) ? dep : dep ? [dep] : []
  const initialEcos = Array.isArray(eco) ? eco : eco ? [eco] : []
  const depPageCounts = getDepPageCounts()
  const depPageCount  = getQualifiedCrates().length

  return (
    <EditorialLayout>
      <section style={{ paddingTop: "clamp(32px, 4vw, 48px)", paddingBottom: "clamp(64px, 9vw, 104px)" }}>
        <div className="e-col e-col--wide">
          <div className="e-archive-header" style={{ marginBottom: 20 }}>
            <div>
              <div className="e-section__num">Directory</div>
              <h1 className="e-section__title" style={{ fontSize: "clamp(22px, 2.8vw, 28px)" }}>
                OSS Paths
              </h1>
              <p className="e-archive-meta">
                {OSS_PATHS.length} curated Rust repositories — filter by stars, activity, license, owner, topic, ecosystem, or dependency.{" "}
                <Link href="/deps" style={{ color: "var(--e-accent)", textDecoration: "none" }}>
                  Browse {depPageCount} crate pages →
                </Link>
              </p>
            </div>
          </div>

          <OSSBrowser
            repos={OSS_PATHS}
            depPageCounts={depPageCounts}
            initialDeps={initialDeps}
            initialEcos={initialEcos}
          />
        </div>
      </section>
    </EditorialLayout>
  )
}
