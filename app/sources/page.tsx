import Link from "next/link"
import { SOURCES, CATEGORY_META, CATEGORY_ORDER, getSourcesByCategory } from "@/lib/sources"
import { SourceCard } from "@/components/source-card"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Rust Job Sources",
  description:
    "Curated directory of Rust engineering job sources — boards, communities, newsletters, and remote platforms.",
  openGraph: {
    title: "Rust Job Sources | jobs.adarshrust.com",
    description:
      "Curated directory of Rust engineering job sources — boards, communities, newsletters, and remote platforms.",
    url: "https://jobs.adarshrust.com/sources",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rust Job Sources | jobs.adarshrust.com",
    description: "Curated directory of Rust engineering job sources — boards, communities, newsletters, and remote platforms.",
    images: ["/opengraph-image"],
  },
  alternates: { canonical: "https://jobs.adarshrust.com/sources" },
}

export default function SourcesPage() {
  const byCategory = getSourcesByCategory()

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-baseline justify-between gap-4">
          <h1 className="text-xl font-bold text-foreground">Rust Job Sources</h1>
          <Link
            href="/opportunities"
            className="text-xs text-muted-foreground/60 hover:text-foreground transition-colors whitespace-nowrap"
          >
            ← Curated opportunities
          </Link>
        </div>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-lg leading-relaxed">
          {SOURCES.length} curated sources across {CATEGORY_ORDER.length} categories. Each entry
          is hand-picked — no SEO filler, no link dumps.
        </p>
      </div>

      {/* Category sections */}
      <div className="space-y-10">
        {CATEGORY_ORDER.map((cat) => {
          const sources = byCategory.get(cat) ?? []
          if (sources.length === 0) return null
          const meta = CATEGORY_META[cat]

          return (
            <section key={cat}>
              <div className="mb-3">
                <h2 className="text-sm font-semibold text-foreground">{meta.label}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{meta.description}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {sources.map((source) => (
                  <SourceCard key={source.id} source={source} />
                ))}
              </div>
            </section>
          )
        })}
      </div>

      {/* Footer note */}
      <div className="mt-10 pt-6 border-t border-border">
        <p className="text-xs text-muted-foreground">
          Sources are manually reviewed. Found a high-signal source that should be here?{" "}
          <Link
            href="/companies"
            className="text-foreground/70 hover:text-foreground transition-colors"
          >
            Use the companies directory →
          </Link>
        </p>
      </div>
    </div>
  )
}
