import type { Metadata } from "next"
import { EditorialLayout } from "@/components/editorial/editorial-layout"
import { OSSBrowser } from "@/components/editorial/oss-browser"
import { OSS_PATHS } from "@/content/oss-paths"

export const metadata: Metadata = {
  title: "OSS Paths — Approachable Rust Repositories",
  description: "Realistic Rust open-source contribution paths with maintainer context.",
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
                {OSS_PATHS.length} repositories — chosen for responsive maintainers and realistic contribution paths.
                Filter by ecosystem, dependencies, or repo size.
              </p>
            </div>
          </div>

          <OSSBrowser repos={OSS_PATHS} />
        </div>
      </section>
    </EditorialLayout>
  )
}
