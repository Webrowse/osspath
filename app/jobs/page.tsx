import type { Metadata } from "next"
import { EditorialLayout } from "@/components/editorial/editorial-layout"
import { JobsArchive } from "@/components/editorial/jobs-archive"
import { JOBS } from "@/content/jobs"
import { filterActive } from "@/lib/content-utils"

export const metadata: Metadata = {
  title: "Remote Rust Jobs",
  description: "Where the paths lead — open Rust roles at organizations whose open-source work is indexed here. Each role links to the code behind it.",
  alternates: { canonical: "/jobs" },
  openGraph: {
    title: "Remote Rust Jobs",
    description: "Where the paths lead — open Rust roles, each linked to the code behind it.",
    url: "/jobs",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Remote Rust Jobs",
    description: "Curated remote Rust engineering roles. Manually reviewed before listing.",
    images: ["/opengraph-image"],
  },
}

export default function JobsArchivePage() {
  const active = filterActive(JOBS)

  return (
    <EditorialLayout>
      <section style={{ paddingTop: "clamp(40px, 6vw, 64px)", paddingBottom: "clamp(64px, 9vw, 104px)" }}>
        <div className="e-col">
          <JobsArchive jobs={active} />
        </div>
      </section>
    </EditorialLayout>
  )
}
