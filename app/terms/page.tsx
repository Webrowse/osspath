import type { Metadata } from "next"
import { EditorialLayout } from "@/components/editorial/editorial-layout"

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of service for osspath.com.",
}

export default function TermsPage() {
  return (
    <EditorialLayout>
      <section style={{ paddingTop: "clamp(40px, 6vw, 64px)", paddingBottom: "clamp(64px, 9vw, 104px)" }}>
        <div className="e-col">
          <div className="e-section__num">Legal</div>
          <h1 className="e-section__title" style={{ fontSize: "clamp(22px, 3vw, 28px)", marginBottom: 32 }}>
            Terms of Service
          </h1>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 640 }}>
            <p style={{ fontSize: 14, color: "var(--e-fg-dim)", lineHeight: 1.7 }}>
              By using osspath.com, you agree to use it for personal and research purposes only.
            </p>
            <p style={{ fontSize: 14, color: "var(--e-fg-dim)", lineHeight: 1.7 }}>
              This is a free tool provided as-is, without warranty of any kind.
            </p>
            <p style={{ fontSize: 14, color: "var(--e-fg-dim)", lineHeight: 1.7 }}>
              Do not use this service to scrape, spam, or abuse any third-party systems.
            </p>
          </div>
        </div>
      </section>
    </EditorialLayout>
  )
}
