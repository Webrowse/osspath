import type { Metadata } from "next"
import Link from "next/link"
import { EditorialLayout } from "@/components/editorial/editorial-layout"

export const metadata: Metadata = {
  title: "About",
  description:
    "What OSSPath is, what's here, and how it's curated. A map of the Rust ecosystem — jobs, repos, funding, organizations, and community signals.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About — OSSPath",
    description:
      "What OSSPath is, what's here, and how it's curated. A map of the Rust ecosystem — jobs, repos, funding, organizations, and community signals.",
    url: "/about",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "About — OSSPath",
    description:
      "What OSSPath is, what's here, and how it's curated.",
    images: ["/opengraph-image"],
  },
}

const GITHUB_PROFILE    = "https://github.com/Webrowse"
const GITHUB_REPO       = "https://github.com/Webrowse/adarshrust-jobs"
const CONTRIBUTING_URL  = "https://github.com/Webrowse/adarshrust-jobs/blob/main/CONTRIBUTING.md"

const label: React.CSSProperties = {
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "var(--e-fg-dim)",
  marginBottom: 16,
}

const section: React.CSSProperties = {
  borderTop: "1px solid var(--e-line-soft)",
  paddingTop: 32,
  marginBottom: 40,
}

const prose: React.CSSProperties = {
  fontSize: 14,
  color: "var(--e-fg-mute)",
  lineHeight: 1.7,
  maxWidth: "58ch",
}

const extLink: React.CSSProperties = {
  color: "var(--e-accent)",
  textDecoration: "none",
  fontFamily: "var(--e-mono)",
  fontSize: 14,
}

export default function AboutPage() {
  return (
    <EditorialLayout>
      <section style={{ paddingTop: "clamp(40px, 6vw, 64px)", paddingBottom: "clamp(64px, 9vw, 104px)" }}>
        <div className="e-col" style={{ maxWidth: 640 }}>

          {/* Header */}
          <div style={{ marginBottom: 40 }}>
            <div className="e-section__num">About</div>
            <h1 className="e-section__title" style={{ fontSize: "clamp(26px, 3.4vw, 32px)" }}>
              What is OSSPath
            </h1>
            <p style={{ ...prose, marginTop: 16 }}>
              A map of the Rust ecosystem. Not a comprehensive index — a curated one. Jobs,
              repositories, funding programs, organizations, and community signals, selected
              and maintained by hand.
            </p>
            <p style={{ ...prose, marginTop: 12 }}>
              The goal is to give someone working in or around Rust a clear picture of
              what exists and who is involved — without noise.
            </p>
          </div>

          {/* What's here */}
          <div style={section}>
            <div style={label}>What&apos;s here</div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                {
                  label: "Jobs",
                  href:  "/jobs",
                  desc:  "Remote Rust engineering roles. Each listing is reviewed before it appears. No aggregation, no scraping.",
                },
                {
                  label: "Repos",
                  href:  "/oss",
                  desc:  "2,100+ open-source Rust repositories indexed by stars, activity, license, dependencies, and ecosystem.",
                },
                {
                  label: "Funding",
                  href:  "/grants",
                  desc:  "Grants, fellowships, and sponsorships for Rust ecosystem work — from the Rust Foundation, NLnet, and others.",
                },
                {
                  label: "Organizations",
                  href:  "/ecosystem",
                  desc:  "Companies and teams with significant public Rust output. Profile pages show repos, ecosystems, and open roles.",
                },
                {
                  label: "Ecosystems",
                  href:  "/ecosystems",
                  desc:  "The corpus grouped by domain: web, embedded, async, WASM, game development, databases, and more.",
                },
                {
                  label: "Community",
                  href:  "/pulse",
                  desc:  "Newsletters, forums, podcasts, and working-group channels worth following.",
                },
              ].map(({ label: lbl, href, desc }) => (
                <li key={lbl} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <Link
                    href={href}
                    style={{ fontSize: 14, fontWeight: 500, color: "var(--e-fg)", textDecoration: "none" }}
                  >
                    {lbl} →
                  </Link>
                  <span style={{ fontSize: 13, color: "var(--e-fg-mute)", lineHeight: 1.6 }}>{desc}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* What it is not */}
          <div style={section}>
            <div style={label}>What OSSPath is not</div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                "Not a job board aggregator. There is no automated scraping. Jobs are listed one at a time.",
                "Not a startup directory. Organization pages exist only when the org has meaningful public Rust output.",
                "Not a comprehensive repository search engine. The corpus is curated, not exhaustive.",
                "Not affiliated with the Rust project, the Rust Foundation, or any company listed here.",
              ].map((item) => (
                <li key={item} style={{ ...prose, display: "flex", gap: 10, alignItems: "flex-start", maxWidth: "58ch" }}>
                  <span style={{ color: "var(--e-line-2)", flexShrink: 0, marginTop: 2 }}>—</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Curation */}
          <div style={section}>
            <div style={label}>Curation</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <p style={prose}>
                Everything here was added by hand. The goal is not completeness — it is usefulness.
              </p>
              <p style={prose}>
                For repositories: included based on stars, commit recency, license, and dependency graph
                signal. A repository inactive for years with few dependents is not useful to include.
                A crate with modest star counts but broad dependency coverage across the corpus is.
              </p>
              <p style={prose}>
                For jobs: listed only when the posting is currently active, the role genuinely uses
                Rust, and the company is one worth finding.
              </p>
              <p style={prose}>
                For funding: listed when the program is accepting applications or recurring annually.
              </p>
              <p style={prose}>
                Full inclusion criteria, review cadence, and classification rules are documented
                on the{" "}
                <Link href="/methodology" style={{ color: "var(--e-accent)", textDecoration: "none" }}>
                  methodology page
                </Link>
                .
              </p>
            </div>
          </div>

          {/* Corrections */}
          <div style={section}>
            <div style={label}>Corrections and contributions</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <p style={prose}>
                The corpus is maintained manually. Stale data is inevitable — postings expire,
                repositories get archived, organizations change direction.
              </p>
              <p style={prose}>
                If something is wrong, send a correction via the{" "}
                <Link href="/contact" style={{ color: "var(--e-accent)", textDecoration: "none" }}>
                  contact page
                </Link>
                {" "}or open an issue on GitHub. Pull requests are welcome for data corrections
                and new additions that fit the inclusion criteria.
              </p>
              <a
                href={CONTRIBUTING_URL}
                target="_blank"
                rel="noopener noreferrer"
                style={extLink}
              >
                CONTRIBUTING.md →
              </a>
            </div>
          </div>

          {/* Maintained by */}
          <div style={section}>
            <div style={label}>Maintained by</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <p style={prose}>
                A solo project by Adarsh. Built because there was no single place to see the Rust
                ecosystem as a connected graph — repos, funding, organizations, and jobs as related
                nodes rather than separate lists.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
                <a href={GITHUB_PROFILE} target="_blank" rel="noopener noreferrer" style={extLink}>
                  github.com/Webrowse →
                </a>
                <a href={GITHUB_REPO} target="_blank" rel="noopener noreferrer" style={extLink}>
                  github.com/Webrowse/adarshrust-jobs →
                </a>
              </div>
            </div>
          </div>

        </div>
      </section>
    </EditorialLayout>
  )
}
