import type { Metadata } from "next"
import { EditorialLayout } from "@/components/editorial/editorial-layout"
import { AUTHORS } from "@/content/authors"

export const metadata: Metadata = {
  title: "Rust Authors — Writers and Maintainers Worth Following",
  description: "A curated list of writers, crate authors, and educators whose work is worth following to understand the Rust ecosystem.",
  alternates: { canonical: "/authors" },
  openGraph: {
    title: "Rust Authors Worth Following",
    description: "Writers, crate authors, and educators whose output helps you understand Rust — curated by OSSPath.",
    url: "/authors",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rust Authors Worth Following",
    description: "Writers, crate authors, and educators who shaped the Rust ecosystem.",
    images: ["/opengraph-image"],
  },
}

export default function AuthorsPage() {
  return (
    <EditorialLayout>
      <section style={{ paddingTop: "clamp(40px, 6vw, 64px)", paddingBottom: "clamp(64px, 9vw, 104px)" }}>
        <div className="e-col">

          <div className="e-archive-header">
            <div>
              <div className="e-section__num">Explore</div>
              <h1 className="e-section__title" style={{ fontSize: "clamp(26px, 3.4vw, 32px)" }}>
                Authors
              </h1>
              <p className="e-archive-meta">
                Writers, crate authors, and educators whose output is worth following
                to understand how Rust thinks and where it is going. Not exhaustive — opinionated.
              </p>
            </div>
          </div>

          <div style={{ marginTop: 8, marginBottom: 32 }}>
            <span className="e-section__meta">{AUTHORS.length} authors</span>
          </div>

          <div className="e-pulse">
            {AUTHORS.map((author) => (
              <div key={author.handle} className="e-author-row">
                <div className="e-author-identity">
                  <span className="e-author-name">{author.name}</span>
                  <span className="e-author-handle">@{author.handle}</span>
                </div>
                <p className="e-author-desc">{author.description}</p>
                <div className="e-author-links">
                  <a
                    href={author.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="e-author-link"
                  >
                    GitHub ↗
                  </a>
                  {author.writing !== author.href && (
                    <a
                      href={author.writing}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="e-author-link"
                    >
                      Writing ↗
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>
    </EditorialLayout>
  )
}
