import type { Metadata } from "next"
import Link from "next/link"
import { EditorialLayout } from "@/components/editorial/editorial-layout"

export const metadata: Metadata = {
  title: "Methodology",
  description:
    "How OSSPath is built, curated, reviewed, and maintained. Inclusion criteria, data sources, ecosystem classification, and correction process.",
  alternates: { canonical: "/methodology" },
  openGraph: {
    title: "Methodology — OSSPath",
    description:
      "How OSSPath is built, curated, reviewed, and maintained. Inclusion criteria, data sources, ecosystem classification, and correction process.",
    url: "/methodology",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Methodology — OSSPath",
    description:
      "How OSSPath is built, curated, reviewed, and maintained.",
    images: ["/opengraph-image"],
  },
}

const GITHUB_REPO      = "https://github.com/Webrowse/adarshrust-jobs"
const CONTRIBUTING_URL = "https://github.com/Webrowse/adarshrust-jobs/blob/main/CONTRIBUTING.md"

// ── Shared style constants ────────────────────────────────────────────────────

const label: React.CSSProperties = {
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "var(--e-fg-dim)",
  marginBottom: 16,
}

const sectionDiv: React.CSSProperties = {
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

const subhead: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: "var(--e-fg)",
  marginBottom: 6,
  marginTop: 20,
}

const extLink: React.CSSProperties = {
  color: "var(--e-accent)",
  textDecoration: "none",
  fontFamily: "var(--e-mono)",
  fontSize: 14,
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function CriteriaBlock({
  title,
  included,
  excluded,
}: {
  title: string
  included: string[]
  excluded: string[]
}) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={subhead}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {included.map((item) => (
          <div key={item} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <span style={{ color: "var(--e-accent)", flexShrink: 0, fontSize: 12, marginTop: 3 }}>✓</span>
            <span style={{ ...prose, maxWidth: "52ch" }}>{item}</span>
          </div>
        ))}
        {excluded.length > 0 && (
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--e-line-soft)" }}>
            {excluded.map((item) => (
              <div key={item} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginTop: 4 }}>
                <span style={{ color: "var(--e-fg-dim)", flexShrink: 0, fontSize: 12, marginTop: 3 }}>✗</span>
                <span style={{ ...prose, color: "var(--e-fg-dim)", maxWidth: "52ch" }}>{item}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function MethodologyPage() {
  return (
    <EditorialLayout>
      <section style={{ paddingTop: "clamp(40px, 6vw, 64px)", paddingBottom: "clamp(64px, 9vw, 104px)" }}>
        <div className="e-col" style={{ maxWidth: 640 }}>

          {/* Header */}
          <div style={{ marginBottom: 40 }}>
            <div className="e-section__num">Methodology</div>
            <h1 className="e-section__title" style={{ fontSize: "clamp(26px, 3.4vw, 32px)" }}>
              How OSSPath is built
            </h1>
            <p style={{ ...prose, marginTop: 16 }}>
              Everything in OSSPath was added by a human. This page explains what that
              means in practice — what gets included, how it gets classified, how often it
              is re-verified, and how to report a mistake.
            </p>
          </div>

          {/* 1. Principles */}
          <div style={sectionDiv}>
            <div style={label}>Principles</div>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <div style={subhead}>Curation over aggregation</div>
                <p style={prose}>
                  No entries are added automatically. Each job, funding program, and organization
                  is reviewed and added individually. Repository metadata — stars, topics, and
                  dependency data — is fetched from the GitHub API, but inclusion decisions are
                  made by hand. The corpus stays small on purpose.
                </p>
              </div>

              <div>
                <div style={subhead}>Accuracy over coverage</div>
                <p style={prose}>
                  A smaller set of accurate, current entries is more useful than a larger set
                  that includes stale or misclassified ones. When coverage and accuracy conflict,
                  accuracy wins. Entries are removed when they can no longer be verified.
                </p>
              </div>

              <div>
                <div style={subhead}>Human review</div>
                <p style={prose}>
                  Each entry is checked against the inclusion criteria before it appears. New
                  entries are not added automatically. The value of the corpus depends on this
                  not changing.
                </p>
              </div>

              <div>
                <div style={subhead}>Public corrections</div>
                <p style={prose}>
                  The underlying data is open source. Mistakes can be seen, reported, and fixed
                  in public. Review intervals and inclusion criteria are documented so that
                  readers can evaluate the freshness of any given entry.
                </p>
              </div>
            </div>
          </div>

          {/* 2. Inclusion criteria */}
          <div style={sectionDiv}>
            <div style={label}>Inclusion criteria</div>
            <p style={{ ...prose, marginBottom: 24 }}>
              Each entity type has its own criteria. All of the following must be true for an
              entry to be included — not some.
            </p>

            <CriteriaBlock
              title="Jobs"
              included={[
                "Rust is explicitly named in the job description (not inferred from company reputation)",
                "Remote work is confirmed by the company (not 'remote-friendly' ambiguity)",
                "The posting is currently active and accessible",
                "Rust is used in production, not experimentally",
              ]}
              excluded={[
                "Roles where Rust is one of several acceptable languages",
                "In-office or relocation-required roles",
                "Recruiting agency or third-party board listings",
                "Companies where Rust usage is inferred rather than documented",
              ]}
            />

            <CriteriaBlock
              title="Repositories"
              included={[
                "Actively maintained — recent commit activity in the last 90 days",
                "Maintainer engages with issues and pull requests",
                "A realistic path exists for new contributors to make a meaningful contribution",
                "The project is Rust-primary or Rust-significant",
              ]}
              excluded={[
                "Abandoned or archived projects",
                "Projects where the maintainer does not welcome outside contributions",
              ]}
            />

            <CriteriaBlock
              title="Funding programs"
              included={[
                "Currently accepting applications or has a defined recurring cycle",
                "Explicitly supports Rust ecosystem work",
                "The application process is publicly documented",
              ]}
              excluded={[
                "General open-source grants with no Rust focus",
                "Programs that have been closed for more than one year without a stated reopening",
              ]}
            />

            <CriteriaBlock
              title="Companies and organizations"
              included={[
                "Rust usage in production is publicly documented — blog posts, conference talks, or open-source output",
                "Usage is in a core product, not only in internal tooling",
                "Organization profile pages require meaningful public Rust repositories",
              ]}
              excluded={[
                "Companies where Rust usage is inferred from job postings alone",
                "Companies that adopted Rust experimentally and switched away",
                "Companies using Rust only in non-strategic internal tools",
              ]}
            />

            <CriteriaBlock
              title="Community resources"
              included={[
                "Covers the Rust ecosystem specifically (not general programming with occasional Rust mention)",
                "Actively maintained — newsletter publishing, forum moderation, or regular episode output",
                "Non-trivial signal-to-noise ratio",
              ]}
              excluded={[
                "Generic programming newsletters that mention Rust occasionally",
                "Inactive or unmaintained forums and communities",
              ]}
            />
          </div>

          {/* 3. Entity types */}
          <div style={sectionDiv}>
            <div style={label}>Entity types</div>
            <p style={{ ...prose, marginBottom: 20 }}>
              OSSPath currently tracks seven entity types. Each has its own archive page,
              inclusion criteria, and review cadence.
            </p>

            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { name: "Repositories",    href: "/oss",       desc: "Open-source Rust projects from GitHub, indexed by stars, activity, license, and dependency graph." },
                { name: "Organizations",   href: "/ecosystem", desc: "Companies and teams with a public GitHub presence and meaningful Rust open-source output." },
                { name: "Funding programs", href: "/grants",   desc: "Grants, fellowships, and sponsorships from the Rust Foundation, NLnet, Sovereign Tech Fund, and others." },
                { name: "Funders",         href: "/funders",   desc: "The foundations and institutions that run funding programs." },
                { name: "Jobs",            href: "/jobs",      desc: "Remote Rust engineering roles, manually reviewed." },
                { name: "Community",       href: "/pulse",     desc: "Newsletters, forums, podcasts, and working-group channels." },
                { name: "Ecosystems",      href: "/ecosystems", desc: "Domain groupings derived from dependency graph analysis — 11 domains currently tracked." },
              ].map(({ name, href, desc }) => (
                <li key={name} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <Link href={href} style={{ fontSize: 14, fontWeight: 500, color: "var(--e-fg)", textDecoration: "none" }}>
                    {name} →
                  </Link>
                  <span style={{ fontSize: 13, color: "var(--e-fg-mute)", lineHeight: 1.6 }}>{desc}</span>
                </li>
              ))}
            </ul>

            <p style={{ ...prose, marginTop: 20 }}>
              Dependency pages (<Link href="/deps" style={{ color: "var(--e-accent)", textDecoration: "none" }}>/deps</Link>)
              {" "}and topic pages (<Link href="/oss" style={{ color: "var(--e-accent)", textDecoration: "none" }}>/topics</Link>)
              {" "}are derived views over the repository corpus rather than independently curated entity types.
              Events are tracked separately at{" "}
              <Link href="/events" style={{ color: "var(--e-accent)", textDecoration: "none" }}>/events</Link>.
            </p>
          </div>

          {/* 4. Data collection */}
          <div style={sectionDiv}>
            <div style={label}>Data collection</div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <div style={subhead}>Sources</div>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                  {[
                    "GitHub — repository metadata (stars, topics, activity, Cargo.toml dependencies), organization membership",
                    "Company careers pages — reviewed directly for job listings",
                    "Grant program websites — reviewed directly for funding status and application windows",
                    "Conference and event sites — reviewed for dates and registration links",
                  ].map((item) => (
                    <li key={item} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                      <span style={{ color: "var(--e-fg-dim)", flexShrink: 0, marginTop: 3, fontSize: 12 }}>–</span>
                      <span style={{ ...prose }}>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <div style={subhead}>Review process</div>
                <p style={prose}>
                  New entries are reviewed against the inclusion criteria before being added.
                  Existing entries are re-verified on a rolling schedule:
                </p>
                <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                  {[
                    ["Jobs",                  "every 7 days"],
                    ["Grants & events",       "every 14 days"],
                    ["Repositories",          "every 30 days"],
                    ["Companies & community", "every 60 days"],
                  ].map(([entity, cadence]) => (
                    <div key={entity} style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
                      <span style={{ fontSize: 13, color: "var(--e-fg)", fontWeight: 500, minWidth: 160 }}>{entity}</span>
                      <span style={{ fontSize: 13, color: "var(--e-fg-mute)", fontFamily: "var(--e-mono)" }}>{cadence}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div style={subhead}>Classification</div>
                <p style={prose}>
                  Repository ecosystem tags are derived from Cargo.toml dependency data collected
                  during corpus refresh. GitHub topic tags and organization owner signals are used
                  as supplementary inputs. No LLM or AI classification is used.
                </p>
              </div>
            </div>
          </div>

          {/* 5. Ecosystem classification */}
          <div style={sectionDiv}>
            <div style={label}>Ecosystem classification</div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <p style={prose}>
                Repositories are classified into one of eleven domain ecosystems:
              </p>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {[
                  "Bevy Game Engine", "Tauri Desktop", "Blockchain",
                  "Embedded / no_std", "AI & Machine Learning", "WebAssembly",
                  "Database", "gRPC & Networking", "CLI & TUI",
                  "Web & APIs", "Async / Tokio",
                ].map((eco) => (
                  <span
                    key={eco}
                    style={{
                      fontSize: 12,
                      fontFamily: "var(--e-mono)",
                      color: "var(--e-fg-mute)",
                      background: "var(--e-bg-2)",
                      border: "1px solid var(--e-line-soft)",
                      borderRadius: 4,
                      padding: "2px 8px",
                    }}
                  >
                    {eco}
                  </span>
                ))}
              </div>

              <div>
                <div style={subhead}>How a tag is assigned</div>
                <p style={prose}>
                  Each ecosystem has a rule consisting of a set of specific crate names. If a
                  repository&apos;s dependency list contains any of those crates, the rule
                  matches — this is an inclusive OR within each rule. For blockchain repositories,
                  the GitHub organization owner and repository topic tags are also considered
                  when dependency data is absent or ambiguous.
                </p>
              </div>

              <div>
                <div style={subhead}>Why a repository can appear in multiple ecosystems</div>
                <p style={prose}>
                  Rules run in specificity order, and a repository receives up to two matching
                  tags. A repository that builds a command-line tool over an HTTP API will
                  match both CLI & TUI and Web & APIs. This is intentional — the repository
                  is genuinely relevant to both views, and excluding it from one would be
                  arbitrary. Ecosystem pages are therefore overlapping, not partitioned.
                </p>
              </div>

              <div>
                <div style={subhead}>What is not classified</div>
                <p style={prose}>
                  Repositories with no dependency data and no topic or owner signals receive
                  no ecosystem tag and do not appear on any ecosystem page. They remain
                  discoverable through the repository archive and topic/dependency pages.
                </p>
              </div>
            </div>
          </div>

          {/* 6. Corrections */}
          <div style={sectionDiv}>
            <div style={label}>Corrections</div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <p style={prose}>
                Stale data is inevitable in a manually maintained corpus. Job postings expire,
                repositories get archived, funding programs close, and organizations change focus.
              </p>
              <p style={prose}>
                To report an error, open a GitHub issue or use the{" "}
                <Link href="/contact" style={{ color: "var(--e-accent)", textDecoration: "none" }}>
                  contact page
                </Link>
                . Include the URL of the incorrect entry and what the correct state should be.
                Pull requests with direct data corrections are also accepted.
              </p>
              <p style={prose}>
                There is no automated correction queue. Each report is reviewed and applied
                manually, typically within a few days.
              </p>
              <a
                href={GITHUB_REPO + "/issues"}
                target="_blank"
                rel="noopener noreferrer"
                style={extLink}
              >
                Open an issue →
              </a>
            </div>
          </div>

          {/* 7. Open source */}
          <div style={sectionDiv}>
            <div style={label}>Open source</div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <p style={prose}>
                The full dataset, classification rules, and site code are public. The corpus
                can be inspected, the rules can be read, and the methodology described here
                can be verified against the source.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
                <a href={GITHUB_REPO} target="_blank" rel="noopener noreferrer" style={extLink}>
                  github.com/Webrowse/adarshrust-jobs →
                </a>
                <a href={CONTRIBUTING_URL} target="_blank" rel="noopener noreferrer" style={extLink}>
                  CONTRIBUTING.md →
                </a>
              </div>
            </div>
          </div>

        </div>
      </section>
    </EditorialLayout>
  )
}
