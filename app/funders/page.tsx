import type { Metadata } from "next"
import Link from "next/link"
import { EditorialLayout } from "@/components/editorial/editorial-layout"
import { FUNDERS } from "@/content/funders"
import { PROGRAMS } from "@/content/programs"
import { ECO_LABEL } from "@/lib/eco-tags"

export const metadata: Metadata = {
  title: "Rust Funding Organizations",
  description: "Foundations, government programs, and organizations that fund Rust ecosystem work — grants, fellowships, audits, and more.",
  alternates: { canonical: "/funders" },
  openGraph: {
    title: "Rust Funding Organizations",
    description: "Foundations, government programs, and organizations that fund Rust ecosystem work.",
    url: "/funders",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rust Funding Organizations",
    description: "Foundations and programs that fund Rust ecosystem work.",
    images: ["/opengraph-image"],
  },
}

const KIND_LABEL: Record<string, string> = {
  foundation: "Foundation",
  company:    "Company",
  protocol:   "Protocol",
  government: "Government",
  platform:   "Platform",
  collective: "Collective",
}

export default function FundersPage() {
  const programsByFunder = new Map<string, number>()
  for (const p of PROGRAMS) {
    programsByFunder.set(p.funder_slug, (programsByFunder.get(p.funder_slug) ?? 0) + 1)
  }

  return (
    <EditorialLayout>
      <section style={{ paddingTop: "clamp(40px, 6vw, 64px)", paddingBottom: "clamp(64px, 9vw, 104px)" }}>
        <div className="e-col">

          <div style={{ marginBottom: 40 }}>
            <div className="e-section__num">Funding</div>
            <h1 className="e-section__title" style={{ fontSize: "clamp(26px, 3.4vw, 32px)" }}>
              Funding Organizations
            </h1>
            <p className="e-archive-meta">
              {FUNDERS.length} organizations funding Rust ecosystem work —{" "}
              foundations, government programs, and open source platforms.{" "}
              <Link href="/grants" style={{ color: "var(--e-accent)", textDecoration: "none" }}>
                Browse all programs →
              </Link>
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gap: 1,
              border: "1px solid var(--e-line-soft)",
              borderRadius: 6,
              overflow: "hidden",
            }}
          >
            {FUNDERS.map(funder => {
              const programCount = programsByFunder.get(funder.slug) ?? 0
              return (
                <Link
                  key={funder.slug}
                  href={`/funders/${funder.slug}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: "8px 24px",
                    alignItems: "start",
                    padding: "18px 20px",
                    background: "var(--e-surface-1)",
                    textDecoration: "none",
                    borderBottom: "1px solid var(--e-line-soft)",
                    transition: "background 0.15s",
                  }}
                  className="funder-row"
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                      <span style={{ fontSize: 15, fontWeight: 600, color: "var(--e-fg)", fontFamily: "var(--e-mono)" }}>
                        {funder.name}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          color: "var(--e-fg-dim)",
                          border: "1px solid var(--e-line-soft)",
                          padding: "1px 6px",
                          borderRadius: 3,
                        }}
                      >
                        {KIND_LABEL[funder.kind] ?? funder.kind}
                      </span>
                      {funder.hq_country && (
                        <span style={{ fontSize: 11, color: "var(--e-fg-faint)" }}>
                          {funder.hq_country}
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 13, color: "var(--e-fg-dim)", margin: 0, lineHeight: 1.5, maxWidth: 560 }}>
                      {funder.description}
                    </p>
                    {funder.ecosystems && funder.ecosystems.length > 0 && (
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                        {funder.ecosystems.slice(0, 6).map(tag => (
                          <span
                            key={tag}
                            className={`e-oss__eco-badge e-oss__eco-badge--${tag}`}
                            style={{ pointerEvents: "none" }}
                          >
                            {ECO_LABEL[tag]}
                          </span>
                        ))}
                        {funder.ecosystems.length > 6 && (
                          <span style={{ fontSize: 11, color: "var(--e-fg-faint)", alignSelf: "center" }}>
                            +{funder.ecosystems.length - 6}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div style={{ textAlign: "right", paddingTop: 2 }}>
                    {programCount > 0 && (
                      <div style={{ fontSize: 13, color: "var(--e-fg-dim)", fontFamily: "var(--e-mono)" }}>
                        {programCount} {programCount === 1 ? "program" : "programs"}
                      </div>
                    )}
                    <div style={{ fontSize: 12, color: "var(--e-accent)", marginTop: 4 }}>
                      →
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>

        </div>
      </section>
    </EditorialLayout>
  )
}
