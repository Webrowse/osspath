import type { Metadata } from "next"
import { EditorialLayout } from "@/components/editorial/editorial-layout"
import { LEARNING } from "@/content/learning"

export const metadata: Metadata = {
  title: "Learn Rust — Curated Resources",
  description: "A curated set of books, exercises, references, and videos for learning Rust — opinionated, not exhaustive.",
  alternates: { canonical: "/learning" },
  openGraph: {
    title: "Learn Rust — Curated Resources",
    description: "Books, exercises, references, and videos for learning Rust — curated by OSSPath.",
    url: "/learning",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Learn Rust — Curated Resources",
    description: "Curated books, exercises, and references for learning Rust.",
    images: ["/opengraph-image"],
  },
}

const KIND_ORDER = ["Book", "Reference", "Exercises", "Video", "Essays", "Article"] as const

export default function LearningPage() {
  const sorted = [...LEARNING].sort(
    (a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind)
  )

  return (
    <EditorialLayout>
      <section style={{ paddingTop: "clamp(40px, 6vw, 64px)", paddingBottom: "clamp(64px, 9vw, 104px)" }}>
        <div className="e-col">

          <div className="e-archive-header">
            <div>
              <div className="e-section__num">Explore · Learn deeply</div>
              <h1 className="e-section__title" style={{ fontSize: "clamp(26px, 3.4vw, 32px)" }}>
                Learning
              </h1>
              <p className="e-archive-meta">
                Books, exercises, and references for understanding Rust.
                Curated for quality — not a directory of everything that exists.
              </p>
            </div>
          </div>

          <div style={{ marginTop: 8, marginBottom: 32 }}>
            <span className="e-section__meta">{LEARNING.length} resources</span>
          </div>

          <div className="e-pulse">
            {sorted.map((item) => (
              <a
                key={item.title}
                className="e-pulse__row"
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="e-pulse__kind">{item.kind}</span>
                <span className="e-pulse__title">
                  <b>{item.title}</b>
                  <span className="e-pulse__sub">{item.description}</span>
                </span>
                <span className="e-pulse__arrow" aria-hidden="true">↗</span>
              </a>
            ))}
          </div>

        </div>
      </section>
    </EditorialLayout>
  )
}
