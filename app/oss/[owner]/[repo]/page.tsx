import { notFound } from "next/navigation"
import Link from "next/link"
import type { Metadata } from "next"
import { EditorialLayout } from "@/components/editorial/editorial-layout"
import { OSSCard } from "@/components/editorial/oss-card"
import { getOSSRepos } from "@/lib/oss-data"
import { getOSSRepoDetails } from "@/lib/oss-detail-data"
import { getDepPageCounts } from "@/lib/deps-data"
import { getEcoTags, ECO_LABEL } from "@/lib/eco-tags"
import { getCompanyForOwner } from "@/lib/company-data"
import { getProgramsForRepo } from "@/lib/grants-data"
import { DepList } from "@/components/editorial/dep-list"
import { CorrectionLink } from "@/components/editorial/correction-link"
import { getRepoCareerRelevance } from "@/lib/career-paths"

export const dynamicParams = false

interface PageProps {
  params: Promise<{ owner: string; repo: string }>
}

// ── Static params ──────────────────────────────────────────────────────────────

export async function generateStaticParams(): Promise<{ owner: string; repo: string }[]> {
  // getOSSRepos() throws at build time if any record is missing owner/name/href.
  // owner is required in OSSPath — no filter needed.
  return getOSSRepos().map(r => ({ owner: r.owner, repo: r.name }))
}

// ── Metadata ───────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { owner, repo } = await params
  const r = getOSSRepos().find(r => r.owner === owner && r.name === repo)
  if (!r) return { title: "Not Found" }

  const title = `${repo} — ${owner}`
  const desc  = r.note ?? `Open source Rust repository ${owner}/${repo}.`

  return {
    title,
    description: desc,
    alternates: { canonical: `/oss/${owner}/${repo}` },
    openGraph: {
      title,
      description: desc,
      url: `/oss/${owner}/${repo}`,
      type: "website",
      images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: desc,
      images: ["/opengraph-image"],
    },
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`
  return n.toLocaleString()
}

function fmtPushedAt(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function OSSRepoPage({ params }: PageProps) {
  const { owner, repo: repoName } = await params
  const r = getOSSRepoDetails().find(r => r.owner === owner && r.name === repoName)
  if (!r) notFound()

  const depPageCounts = getDepPageCounts()
  const stars         = r.stars           ?? 0
  const forks         = r.forks           ?? 0
  const openIssues    = r.openIssuesCount ?? 0
  const tier          = r.activityTier    ?? "dormant"
  const licenseLabel  = !r.license                    ? "License unknown"
                      : r.license === "NOASSERTION"   ? "Not identified"
                      : r.license
  const ecoTags       = getEcoTags(r.dependencies, { owner: r.owner ?? undefined, name: r.name ?? undefined, topics: r.topics ?? undefined })
  const company       = r.owner ? getCompanyForOwner(r.owner) : undefined
  const slug          = `${owner}/${repoName}`
  const fundingForRepo = getProgramsForRepo(slug)

  // Similar repos: Tier 2 relationships (Jaccard similarity on Cargo deps),
  // computed by the pipeline and stored inline on the repo record. Each match
  // carries its overlap score plus the most distinctive shared crates
  // (lowest corpus-wide usage first) so the suggestion explains itself.
  // Cross-referenced against the slim public list — OSSCard only needs
  // list-level fields, not the full detail record.
  const slugIndex     = Object.fromEntries(getOSSRepos().map(r => [`${r.owner}/${r.name}`, r]))
  const ownDeps       = new Set(r.dependencies ?? [])
  const similarRepos  = (r.relationships?.similar ?? [])
    .slice(0, 10)
    .flatMap(e => {
      const repo = slugIndex[e.repo]
      if (!repo) return []
      const shared = (repo.dependencies ?? [])
        .filter(d => ownDeps.has(d) && d in depPageCounts)
        .sort((a, b) => (depPageCounts[a] ?? 0) - (depPageCounts[b] ?? 0))
        .slice(0, 3)
      return [{ repo, score: e.score, shared }]
    })

  // Companion crates: Tier 2 co-occurrence - crates commonly used alongside
  // this repo's own dependencies.
  const companionCrates = (r.relationships?.companions ?? []).map(c => c.name)

  // Technologies: Tier 2 Ecosystem Intelligence's curated, named subset of deps.
  const technologies = r.ecosystemIntelligence?.technologies ?? []

  // Build profile: Tier 1 Cargo enrichment — the facts a developer would
  // otherwise dig out of Cargo.toml / Cargo.lock by hand.
  const cargo = r.enrichment?.cargo
  const buildFacts: Array<[string, string]> = []
  if (cargo?.edition)  buildFacts.push(["Edition", cargo.edition])
  if (cargo?.msrv)     buildFacts.push(["MSRV", cargo.msrv])
  if (cargo?.isWorkspace != null) {
    buildFacts.push(["Layout", cargo.isWorkspace
      ? `Workspace · ${cargo.crates?.length ?? 0} crates`
      : "Single crate"])
  }
  if (cargo?.features?.length)      buildFacts.push(["Features", String(cargo.features.length)])
  if (cargo?.lockfileCrateCount)    buildFacts.push(["Lockfile crates", cargo.lockfileCrateCount.toLocaleString("en-US")])

  // Classification provenance: deterministic reasoning strings from Tier 2.
  const classification = r.ecosystemIntelligence

  // Career relevance: which route legs this repo is evidence for.
  const career = getRepoCareerRelevance(r)

  // Qualified deps sorted by their own page's dependent count — all of them, slicing happens in DepList
  const sortedDeps = (r.dependencies ?? [])
    .filter(d => d in depPageCounts)
    .sort((a, b) => (depPageCounts[b] ?? 0) - (depPageCounts[a] ?? 0))

  return (
    <EditorialLayout>
      <section style={{ paddingTop: "clamp(40px, 6vw, 64px)", paddingBottom: "clamp(64px, 9vw, 104px)" }}>
        <div className="e-col">

          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" style={{ marginBottom: 24 }}>
            <Link href="/oss" style={{ fontSize: 13, color: "var(--color-muted)", textDecoration: "none" }}>
              ← Repositories
            </Link>
          </nav>

          {/* Header */}
          <header style={{ marginBottom: 32 }}>
            <div className="e-section__num">{owner}</div>
            <h1
              className="e-section__title"
              style={{ fontSize: "clamp(26px, 3.4vw, 36px)", fontFamily: "var(--font-ibm-plex-mono)" }}
            >
              {repoName}
            </h1>
            {r.note && (
              <p className="e-archive-meta" style={{ marginTop: 8 }}>{r.note}</p>
            )}
          </header>

          {/* Stats + actions */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "8px 24px",
              alignItems: "flex-start",
              marginBottom: 40,
              paddingBottom: 24,
              borderBottom: "1px solid var(--color-border)",
            }}
          >
            <div style={{ display: "flex", gap: "8px 24px", flexWrap: "wrap", flex: 1 }}>
              {(
                [
                  ["Stars",  fmt(stars)],
                  ["Forks",  fmt(forks)],
                  ["Issues", fmt(openIssues)],
                ] as const
              ).map(([label, value]) => (
                <div key={label} style={{ minWidth: 60 }}>
                  <div style={{ fontSize: 20, fontWeight: 600, color: "var(--color-foreground)", lineHeight: 1.1 }}>
                    {value}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--color-muted)", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    {label}
                  </div>
                </div>
              ))}
              <div style={{ minWidth: 60 }}>
                <div style={{ fontSize: 13, fontFamily: "var(--e-mono)", fontWeight: 500, color: "var(--color-foreground)", lineHeight: 1.2 }}>
                  {licenseLabel}
                </div>
                <div style={{ fontSize: 11, color: "var(--color-muted)", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  License
                </div>
              </div>
              <div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", paddingTop: 2 }}>
                  <span className={`e-oss__activity e-oss__activity--${tier}`}>{tier}</span>
                  {ecoTags.map(tag => (
                    <Link
                      key={tag}
                      href={`/ecosystems/${tag}`}
                      className={`e-oss__eco-badge e-oss__eco-badge--${tag}`}
                      style={{ textDecoration: "none" }}
                    >
                      {ECO_LABEL[tag]}
                    </Link>
                  ))}
                </div>
              </div>
              {r.pushedAt && (
                <div style={{ width: "100%", marginTop: 4 }}>
                  <span style={{ fontSize: 11, fontFamily: "var(--e-mono)", color: "var(--color-muted)" }}>
                    Last GitHub commit: {fmtPushedAt(r.pushedAt)}
                  </span>
                </div>
              )}
            </div>
            <a
              href={r.href}
              target="_blank"
              rel="noopener noreferrer"
              className="e-ext-link"
              style={{ marginTop: 4 }}
            >
              View on GitHub →
            </a>
          </div>

          {/* Ecosystem badges */}
          {ecoTags.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-muted)", marginBottom: 10 }}>
                Ecosystem
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {ecoTags.map(tag => (
                  <Link
                    key={tag}
                    href={`/ecosystems/${tag}`}
                    className={`e-oss__eco-badge e-oss__eco-badge--${tag} e-oss__eco-badge--lg`}
                    style={{ textDecoration: "none" }}
                  >
                    {ECO_LABEL[tag]}
                  </Link>
                ))}
              </div>
              {classification && classification.reasoning.length > 0 && (
                <details style={{ marginTop: 12 }}>
                  <summary style={{ fontSize: 12, color: "var(--e-fg-dim)", cursor: "pointer" }}>
                    Why this classification
                  </summary>
                  <ul style={{ margin: "8px 0 0", paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 }}>
                    {classification.reasoning.map((line, i) => (
                      <li key={i} style={{ fontSize: 12, fontFamily: "var(--e-mono)", color: "var(--e-fg-dim)", lineHeight: 1.5 }}>
                        {line}
                      </li>
                    ))}
                  </ul>
                  <div style={{ marginTop: 6, fontSize: 11, color: "var(--e-fg-dim)" }}>
                    Rule-based classification from parsed dependencies
                    {" · "}confidence {Math.round(classification.confidence * 100)}%
                  </div>
                </details>
              )}
            </div>
          )}

          {/* Career relevance — why a job-seeker should care about this repo */}
          {career && (
            <div className="repo-career" style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--e-fg-dim)" }}>
                Why this repo matters for your career
              </div>

              <div className="repo-career__row">
                <span style={{ fontSize: 12, color: "var(--e-fg-mute)", alignSelf: "center" }}>Good for learning:</span>
                {[...new Set(career.paths.flatMap(p => p.areas))].slice(0, 4).map(area => (
                  <span key={area} className="repo-career__chip">{area}</span>
                ))}
                <span className="repo-career__chip" style={{ borderStyle: "dashed" }}>
                  {career.difficulty}
                </span>
              </div>

              <div className="repo-career__row">
                <span style={{ fontSize: 12, color: "var(--e-fg-mute)", alignSelf: "center" }}>On the route to:</span>
                {career.paths.map(p => (
                  <Link key={p.slug} href={p.href} className="repo-career__chip">
                    {p.shortTitle} →
                  </Link>
                ))}
              </div>

              {career.contribution && (
                <p className="repo-career__note">{career.contribution}</p>
              )}
              <p className="repo-career__note" style={{ opacity: 0.8 }}>
                Derived from this repo&apos;s Cargo dependencies and activity — difficulty is an
                estimate from codebase size and scope.
              </p>
            </div>
          )}

          {/* Build profile (Tier 1 Cargo enrichment) */}
          {buildFacts.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-muted)", marginBottom: 10 }}>
                Build profile
              </div>
              <div style={{ display: "flex", gap: "8px 28px", flexWrap: "wrap" }}>
                {buildFacts.map(([label, value]) => (
                  <div key={label} style={{ minWidth: 60 }}>
                    <div style={{ fontSize: 14, fontFamily: "var(--e-mono)", fontWeight: 500, color: "var(--color-foreground)", lineHeight: 1.3 }}>
                      {value}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--color-muted)", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      {label}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 8, fontSize: 11, color: "var(--e-fg-dim)" }}>
                Parsed from Cargo.toml{cargo?.hasLockfile ? " and Cargo.lock" : ""}
                {r.enrichment?.enrichedAt ? ` · ${r.enrichment.enrichedAt.slice(0, 10)}` : ""}
              </div>
            </div>
          )}

          {/* Technologies (Tier 2 Ecosystem Intelligence) */}
          {technologies.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-muted)", marginBottom: 10 }}>
                Technologies
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {technologies.map(t => (
                  <span
                    key={t}
                    className="e-tag e-tag--soft"
                    style={{ fontFamily: "var(--font-ibm-plex-mono)", fontSize: 12 }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Company */}
          {company && (
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--e-fg-dim)", marginBottom: 10 }}>
                Maintained by
              </div>
              <Link
                href={`/ecosystem/${company.slug}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  textDecoration: "none",
                  color: "var(--e-fg)",
                }}
              >
                <span style={{ fontFamily: "var(--e-mono)", fontSize: 14, fontWeight: 500 }}>{company.name}</span>
                <span style={{ fontSize: 12, color: "var(--e-fg-dim)" }}>{company.sector}</span>
                <span style={{ fontSize: 12, color: "var(--e-accent)" }}>→</span>
              </Link>
            </div>
          )}

          {/* Funded by */}
          {fundingForRepo.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--e-fg-dim)", marginBottom: 10 }}>
                Funded by
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {fundingForRepo.map(({ program: p, funder: f }) => (
                  <div key={p.slug} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <Link
                      href={`/grants/${p.slug}`}
                      style={{ fontSize: 14, fontFamily: "var(--e-mono)", fontWeight: 500, color: "var(--e-fg)", textDecoration: "none" }}
                    >
                      {p.name}
                    </Link>
                    {f && (
                      <span style={{ fontSize: 12, color: "var(--e-fg-dim)" }}>
                        {"via "}
                        <Link href={`/funders/${f.slug}`} style={{ color: "var(--e-accent)", textDecoration: "none" }}>
                          {f.name}
                        </Link>
                      </span>
                    )}
                    <span
                      style={{
                        fontSize: 11,
                        padding: "2px 7px",
                        borderRadius: 3,
                        background: "var(--e-line-soft)",
                        color: "var(--e-fg-dim)",
                        fontFamily: "var(--e-mono)",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {p.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contribution signals */}
          {openIssues > 0 && (
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-muted)", marginBottom: 10 }}>
                Contribution
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                <a
                  href={`${r.href}/issues`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: 13,
                    fontFamily: "var(--e-mono)",
                    color: tier === "active" ? "var(--e-accent)" : "var(--color-muted)",
                    textDecoration: "none",
                  }}
                >
                  {openIssues} open issue{openIssues !== 1 ? "s" : ""} →
                </a>
                {tier === "active" && openIssues > 0 && (
                  <span style={{ fontSize: 12, color: "var(--color-muted)" }}>
                    active project
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Dependencies */}
          {sortedDeps.length > 0 && (
            <div style={{ marginBottom: 40 }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-muted)", marginBottom: 12 }}>
                Dependencies ({sortedDeps.length} total)
              </div>
              <DepList deps={sortedDeps} />
            </div>
          )}

          {/* Companion crates (Tier 2 co-occurrence) */}
          {companionCrates.length > 0 && (
            <div style={{ marginBottom: 40 }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-muted)", marginBottom: 12 }}>
                Often used with
              </div>
              <DepList deps={companionCrates} />
            </div>
          )}

          {/* Similar repos */}
          {similarRepos.length > 0 && (
            <div style={{ marginBottom: 40 }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-muted)", marginBottom: 6 }}>
                Similar repositories
              </div>
              <p style={{ margin: "0 0 16px", fontSize: 12, color: "var(--e-fg-dim)", maxWidth: "68ch" }}>
                Matched by dependency overlap in Cargo manifests — each card notes
                the most distinctive crates both projects share.
              </p>
              <div className="e-oss-grid">
                {similarRepos.map(({ repo, score, shared }) => (
                  <div key={repo.href}>
                    <OSSCard repo={repo} depPageCounts={depPageCounts} />
                    <div
                      style={{
                        marginTop: 6,
                        fontSize: 11,
                        fontFamily: "var(--e-mono)",
                        color: "var(--e-fg-dim)",
                        lineHeight: 1.5,
                      }}
                    >
                      {shared.length > 0 && <>shares {shared.join(", ")} · </>}
                      {Math.round(score * 100)}% dependency overlap
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div style={{ marginTop: 32, paddingTop: 24, borderTop: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Link href="/oss" style={{ fontSize: 13, color: "var(--color-muted)", textDecoration: "none" }}>
                ← Browse all repos
              </Link>
              {(r.checkedAt || r.depsCheckedAt) && (
                <span style={{ fontSize: 11, color: "var(--e-fg-dim)" }}>
                  {r.checkedAt && <>Metadata checked {r.checkedAt}</>}
                  {r.checkedAt && r.depsCheckedAt && " · "}
                  {r.depsCheckedAt && <>dependencies parsed {r.depsCheckedAt}</>}
                </span>
              )}
            </div>
            <CorrectionLink />
          </div>

        </div>
      </section>
    </EditorialLayout>
  )
}
