import { notFound } from "next/navigation"
import Link from "next/link"
import type { Metadata } from "next"
import { EditorialLayout } from "@/components/editorial/editorial-layout"
import { JobCard } from "@/components/editorial/job-card"
import { ReadinessTracker, LegChecklist } from "@/components/career/readiness-tracker"
import type { TrackerArea } from "@/components/career/readiness-tracker"
import { ClimbChooser } from "@/components/career/climb-chooser"
import { getCareerPath, getCareerPathSlugs } from "@/lib/career-paths"
import { getGraphStats } from "@/lib/landing-data"

export const dynamicParams = false

interface PageProps {
  params: Promise<{ slug: string }>
}

export function generateStaticParams(): { slug: string }[] {
  return getCareerPathSlugs().map(slug => ({ slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const path = getCareerPath(slug)
  if (!path) return { title: "Not Found" }

  const title = `${path.title} — Career Path`
  const description = `The route to becoming a ${path.title}: required skills with evidence from ${path.evidenceRepos.toLocaleString("en-US")} production Rust repositories, repos to study, projects to build, and companies hiring.`

  return {
    title,
    description,
    alternates: { canonical: `/paths/${slug}` },
    openGraph: {
      title, description,
      url: `/paths/${slug}`, type: "website",
      images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", title, description, images: ["/opengraph-image"] },
  }
}

const LEVEL_LABEL: Record<string, string> = {
  required:    "required",
  recommended: "recommended",
  bonus:       "differentiator",
}

export default async function CareerPathPage({ params }: PageProps) {
  const { slug } = await params
  const path = getCareerPath(slug)
  if (!path) notFound()

  const stats = getGraphStats()

  const trackerAreas: TrackerArea[] = path.areas.map(a => {
    const firstRepo = a.routes.learning[0] ?? a.routes.contributor[0] ?? a.routes.production[0] ?? null
    return {
      id:        a.id,
      name:      a.name,
      weight:    a.weight,
      checklist: a.checklist,
      project:   a.project,
      studyHref: firstRepo?.href ?? null,
      studyName: firstRepo?.fullName ?? null,
    }
  })

  return (
    <EditorialLayout>
      <section style={{ paddingTop: "clamp(32px, 5vw, 48px)", paddingBottom: "clamp(64px, 9vw, 104px)" }}>
        <div className="e-col e-col--x">

          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" style={{ marginBottom: 28 }}>
            <Link href="/paths" style={{ fontSize: 13, color: "var(--e-fg-mute)", textDecoration: "none" }}>
              ← All destinations
            </Link>
          </nav>

          {/* Journey layout: sticky rail answers “where am I going / where am
              I now / what's next”; the canvas holds the climb itself. */}
          <div className="pj">

            <aside className="pj__rail">
              <div>
                <div className="pj__dest-eyebrow">
                  <span className="e-dot" />
                  Destination
                </div>
                <h1 className="pj__dest-title">{path.title}</h1>
                <p className="pj__dest-tagline">{path.tagline}</p>
                <p className="pj__evidence">
                  Milestones are fixed — how you climb each one is yours. Live evidence
                  from {path.evidenceRepos.toLocaleString("en-US")} of{" "}
                  {stats.totalRepos.toLocaleString("en-US")} indexed production repositories
                  · verified {stats.lastAnalyzed}.
                </p>
              </div>

              <ReadinessTracker pathSlug={path.slug} pathTitle={path.title} areas={trackerAreas} />
            </aside>

            <div className="pj__content">
          <ClimbChooser>
          <div className="route" style={{ marginTop: 28 }}>
            {path.areas.map((area, i) => (
              <section key={area.id} id={`leg-${area.id}`} className="route__leg">
                <div className="route__marker" aria-hidden="true">
                  <span className="route__n">{String(i + 1).padStart(2, "0")}</span>
                </div>

                <div className="route__body">
                  <div className="route__head">
                    <h2 className="route__name">{area.name}</h2>
                    <span className={`route__level route__level--${area.level}`}>
                      {LEVEL_LABEL[area.level]}
                    </span>
                  </div>

                  <p className="route__why">{area.why}</p>

                  {/* Evidence crates */}
                  <div className="route__block">
                    <div className="route__label">The evidence</div>
                    <div className="route__crates">
                      {area.crates.map(c =>
                        c.href ? (
                          <Link key={c.name} href={c.href} className="route__crate">
                            <span className="route__crate-name">{c.name}</span>
                            {c.liveCount > 0 && (
                              <span className="route__crate-n">{c.liveCount.toLocaleString("en-US")} repos</span>
                            )}
                          </Link>
                        ) : (
                          <span key={c.name} className="route__crate route__crate--flat">
                            <span className="route__crate-name">{c.name}</span>
                            {c.liveCount > 0 && (
                              <span className="route__crate-n">{c.liveCount.toLocaleString("en-US")} repos</span>
                            )}
                          </span>
                        )
                      )}
                    </div>
                    {area.concepts.length > 0 && (
                      <div className="route__concepts">
                        + beyond Cargo: {area.concepts.join(" · ")}
                      </div>
                    )}
                  </div>

                  {/* Climbing routes: same summit, pick your terrain */}
                  {(["learning", "contributor", "production"] as const).map(routeId => {
                    const repos = area.routes[routeId]
                    if (repos.length === 0) return null
                    const meta = {
                      learning: {
                        label: "Learning route · goal: understand",
                        note:  "Small, focused codebases — the leg's crates aren't buried under everything else. Readable in a weekend.",
                      },
                      contributor: {
                        label: "Contributor route · goal: OSS proof",
                        note:  "Actively maintained with a landable issue backlog — merged PRs here are portfolio evidence.",
                      },
                      production: {
                        label: "Production route · goal: professional ability",
                        note:  "The serious architectures — read how teams running this at scale structure it.",
                      },
                    }[routeId]
                    return (
                      <div key={routeId} className={`route__block climb climb--${routeId}`}>
                        <div className="route__label">{meta.label}</div>
                        <div className="route__repos">
                          {repos.map(r => (
                            <Link key={r.fullName} href={r.href} className="route__repo">
                              <span className="route__repo-top">
                                <span className="route__repo-name">{r.fullName}</span>
                                <span className="route__repo-meta">
                                  {r.signals.join(" · ")}
                                </span>
                              </span>
                              <span className="route__repo-note">{r.note}</span>
                            </Link>
                          ))}
                        </div>
                        <div className="route__concepts">{meta.note}</div>
                      </div>
                    )
                  })}

                  {/* Build */}
                  <div className="route__block">
                    <div className="route__label">Prove it — build this</div>
                    <p className="route__project">{area.project}</p>
                  </div>

                  {/* Self-assessment */}
                  <div className="route__block">
                    <div className="route__label">Can you honestly tick these?</div>
                    <LegChecklist pathSlug={path.slug} areaId={area.id} items={area.checklist} />
                  </div>
                </div>
              </section>
            ))}
          </div>
          </ClimbChooser>

          {/* ── The destination: who hires ─────────────────────────────── */}
          <div style={{ marginTop: 56 }}>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--e-fg-dim)", marginBottom: 12 }}>
              At the end of this road
            </div>

            {path.orgs.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <p style={{ margin: "0 0 10px", fontSize: 13, color: "var(--e-fg-mute)" }}>
                  Organizations building with this stack in the open:
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {path.orgs.map(o => (
                    <Link key={o.slug} href={o.href} style={{ textDecoration: "none" }}>
                      <span className="e-tag e-tag--soft" style={{ cursor: "pointer", fontFamily: "var(--e-mono)", fontSize: 12 }}>
                        {o.name}{o.hiring ? " · hiring" : ""}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {path.jobs.length > 0 && (
              <div>
                <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--e-fg-mute)" }}>
                  Open roles matching this destination right now:
                </p>
                <div className="e-jobs">
                  {path.jobs.slice(0, 4).map(job => (
                    <JobCard key={job.slug} job={job} />
                  ))}
                </div>
                {path.jobs.length > 4 && (
                  <div style={{ marginTop: 12 }}>
                    <Link href="/jobs" style={{ fontSize: 13, color: "var(--e-accent)", textDecoration: "none", fontFamily: "var(--e-mono)" }}>
                      All {path.jobs.length} matching roles →
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

            </div>{/* /pj__content */}
          </div>{/* /pj */}

          {/* Footer */}
          <div style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid var(--e-line-soft)", display: "flex", gap: 24, flexWrap: "wrap" }}>
            <Link href="/paths" style={{ fontSize: 13, color: "var(--e-fg-mute)", textDecoration: "none" }}>
              ← All destinations
            </Link>
            <Link href="/oss" style={{ fontSize: 13, color: "var(--e-fg-mute)", textDecoration: "none" }}>
              Browse the evidence corpus →
            </Link>
          </div>

        </div>
      </section>
    </EditorialLayout>
  )
}
