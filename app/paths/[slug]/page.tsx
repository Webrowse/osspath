import { notFound } from "next/navigation"
import Link from "next/link"
import type { Metadata } from "next"
import { EditorialLayout } from "@/components/editorial/editorial-layout"
import { JobCard } from "@/components/editorial/job-card"
import { ReadinessTracker, LegChecklist } from "@/components/career/readiness-tracker"
import type { TrackerArea } from "@/components/career/readiness-tracker"
import { ApproachSwitcher, type ApproachTab } from "@/components/career/approach-switcher"
import { getCareerPath, getCareerPathSlugs, type ResolvedApproach } from "@/lib/career-paths"
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
  if (!getCareerPathSlugs().includes(slug)) return { title: "Not Found" }
  const path = getCareerPath(slug)
  if (!path) return { title: "Not Found" }

  const title = `${path.title} — Career Path`
  const description = `The capabilities that make a ${path.title} — with multiple routes to each one, drawn live from ${path.evidenceRepos.toLocaleString("en-US")} production Rust repositories. Same destination, your choice of journey.`

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

const DIFFICULTY_LABEL: Record<string, string> = {
  approachable: "approachable",
  intermediate: "intermediate",
  advanced:     "advanced",
}

/** One approach's repo alternatives - server-rendered, toggled by the switcher. */
function ApproachPanel({ approach }: { approach: ResolvedApproach }) {
  return (
    <div>
      {approach.crates.length > 0 && (
        <div className="appr__crates">
          {approach.crates.map(c =>
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
      )}

      <div className="route__repos">
        {approach.repos.map(r => (
          <Link key={r.fullName} href={r.href} className="route__repo">
            <span className="route__repo-top">
              <span className="route__repo-name">
                {r.fullName}
                <span className={`appr__diff appr__diff--${r.difficulty}`}>
                  {DIFFICULTY_LABEL[r.difficulty]}
                </span>
              </span>
              <span className="route__repo-meta">{r.signals.join(" · ")}</span>
            </span>
            <span className="route__repo-note">{r.note}</span>
          </Link>
        ))}
        {approach.repos.length === 0 && (
          <p className="route__concepts">No strong matches surfaced right now — browse the corpus link below.</p>
        )}
      </div>

      {approach.totalMatches > approach.repos.length && approach.browseHref && (
        <div className="appr__browse">
          <Link href={approach.browseHref}>
            {approach.totalMatches.toLocaleString("en-US")} repos in the corpus can prove this — browse them all →
          </Link>
        </div>
      )}
    </div>
  )
}

export default async function CareerPathPage({ params }: PageProps) {
  const { slug } = await params
  // Cheap check against the static path-slug list (no corpus I/O) before
  // getCareerPath() runs full capability/approach resolution over the whole
  // corpus — dynamicParams=false means every live invocation is a miss.
  if (!getCareerPathSlugs().includes(slug)) notFound()
  const path = getCareerPath(slug)
  if (!path) notFound()

  const stats = getGraphStats()

  const trackerAreas: TrackerArea[] = path.capabilities.map(cap => {
    const firstRepo = cap.approaches.flatMap(a => a.repos)[0] ?? null
    return {
      id:        cap.id,
      name:      cap.name,
      weight:    cap.weight,
      checklist: cap.checklist,
      project:   cap.project,
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
                  The capabilities are fixed — the repos that get you there are your
                  choice. Live evidence from {path.evidenceRepos.toLocaleString("en-US")} of{" "}
                  {stats.totalRepos.toLocaleString("en-US")} indexed production repositories
                  · verified {stats.lastAnalyzed}.
                </p>
              </div>

              <ReadinessTracker pathSlug={path.slug} pathTitle={path.title} areas={trackerAreas} />
            </aside>

            <div className="pj__content">
          <div className="route" style={{ marginTop: 28 }}>
            {path.capabilities.map((cap, i) => (
              <section key={cap.id} id={`leg-${cap.id}`} className="route__leg">
                <div className="route__marker" aria-hidden="true">
                  <span className="route__n">{String(i + 1).padStart(2, "0")}</span>
                </div>

                <div className="route__body">
                  <div className="route__head">
                    <h2 className="route__name">{cap.name}</h2>
                    <span className={`route__level route__level--${cap.level}`}>
                      {LEVEL_LABEL[cap.level]}
                    </span>
                    {cap.totalEvidence > 0 && (
                      <span className="cap__evidence-n">
                        {cap.totalEvidence.toLocaleString("en-US")} repos of evidence
                      </span>
                    )}
                  </div>

                  <p className="route__why">{cap.why}</p>

                  {/* The rigid part: what this cluster must leave you with */}
                  <div className="route__block">
                    <div className="route__label">The destination — non-negotiable</div>
                    <ul className="cap__outcomes">
                      {cap.outcomes.map(o => (
                        <li key={o}>{o}</li>
                      ))}
                    </ul>
                    {cap.concepts.length > 0 && (
                      <div className="route__concepts">
                        + beyond Cargo: {cap.concepts.join(" · ")}
                      </div>
                    )}
                  </div>

                  {/* The flexible part: pick any vehicle */}
                  <div className="route__block">
                    <div className="route__label">
                      The vehicles — {cap.approaches.length > 1
                        ? `${cap.approaches.length} ways in, any combination works`
                        : "pick a repo and go deep"}
                    </div>
                    <ApproachSwitcher
                      tabs={cap.approaches.map((a): ApproachTab => ({
                        id: a.id, name: a.name, vehicle: a.vehicle, totalMatches: a.totalMatches,
                      }))}
                      panels={cap.approaches.map(a => (
                        <ApproachPanel key={a.id} approach={a} />
                      ))}
                    />
                  </div>

                  {/* Build */}
                  <div className="route__block">
                    <div className="route__label">Prove it — build this</div>
                    <p className="route__project">{cap.project}</p>
                  </div>

                  {/* Self-assessment */}
                  <div className="route__block">
                    <div className="route__label">Can you honestly tick these?</div>
                    <LegChecklist pathSlug={path.slug} areaId={cap.id} items={cap.checklist} />
                  </div>
                </div>
              </section>
            ))}
          </div>

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
