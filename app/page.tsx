import Link from "next/link"
import { EditorialMobileMenu } from "@/components/editorial-mobile-menu"
import { CommandPalette } from "@/components/command-palette"
import { EditorialThemeToggle } from "@/components/editorial-theme-toggle"
import { HeroEvidence } from "@/components/editorial/hero-evidence"
import { SectionHeader } from "@/components/editorial/section-header"
import { ExploreDropdown } from "@/components/editorial/explore-dropdown"
import { getLandingData } from "@/lib/landing-data"
import { getPathCardStats } from "@/lib/career-paths"
import { ECO_LABEL } from "@/lib/eco-tags"
import { EditorialFooter } from "@/components/editorial/editorial-footer"
import { SITE_NAV, EXPLORE_NAV } from "@/lib/nav-config"

export default function HomePage() {
  const pathCards = getPathCardStats()
  const {
    graphStats,
    heroEvidence,
    featuredFundingPrograms,
    featuredRepositories,
    featuredOrganizations,
    featuredEcosystems,
    featuredCrates,
    featuredJobs,
  } = getLandingData()

  return (
    <div className="editorial-root">

      {/* ── Nav ──────────────────────────────────────────────────────────────── */}
      <header className="e-nav">
        <div className="e-col e-col--wide e-nav__inner">
          <Link href="/" className="e-nav__brand" aria-label="OSSPath — home">
            <svg width="22" height="22" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
              <polygon fill="currentColor" points="15,4 24.53,9.5 24.53,20.5 15,26 5.47,20.5 5.47,9.5"/>
              <polygon fill="currentColor" points="32,21 41.53,26.5 41.53,37.5 32,43 22.47,37.5 22.47,26.5"/>
              <polygon fill="#CE422B" points="49,38 58.53,43.5 58.53,54.5 49,60 39.47,54.5 39.47,43.5"/>
            </svg>
            <span>osspath</span>
          </Link>

          <nav className="e-nav__links" aria-label="Primary">
            {SITE_NAV.map((l) => (
              <a key={l.anchor} className="e-nav__link" href={l.anchor}>{l.label}</a>
            ))}
            <ExploreDropdown />
          </nav>

          <div className="e-nav__spacer" />

          <CommandPalette />

          <Link href="/paths" className="e-btn e-btn--sm e-nav__start">
            Start your route
          </Link>

          <EditorialThemeToggle />

          <EditorialMobileMenu links={[
            ...SITE_NAV.map((l) => ({ label: l.label, href: l.anchor })),
            { label: "Explore", href: "", isSection: true },
            ...EXPLORE_NAV.map((l) => ({ label: l.label, href: l.href })),
          ]} />
        </div>
      </header>

      <main>

        {/* ── Hero — evidence is the product ───────────────────────────────── */}
        <section className="e-hero hp-hero-split" id="top">
          <div className="e-col e-col--x hp-hero-grid">

            {/* Left: text */}
            <div className="hp-hero-text">
              <div className="e-hero__eyebrow">
                <span className="e-dot" />
                <span>Career navigation</span>
              </div>
              <h1 className="e-hero__title">
                Find your path to a{" "}
                <em>Rust engineering job.</em>
              </h1>
              <p className="e-hero__sub">
                Pick a destination. OSSPath maps the route — the skills that
                matter, the real code that proves them, the companies that hire —
                computed from {graphStats.totalRepos.toLocaleString("en-US")} production
                Rust repositories, not opinion.
              </p>

              <div className="hp-dest__label" id="destinations">I want to become a…</div>
              <div className="hp-dest">
                {pathCards.map(p => (
                  <Link key={p.slug} href={`/paths/${p.slug}`} className="hp-dest__card">
                    <span className="hp-dest__title">{p.shortTitle}</span>
                    <span className="hp-dest__meta">
                      {p.evidenceRepos.toLocaleString("en-US")} repos of evidence
                      {p.openJobs > 0 && <> · {p.openJobs} open role{p.openJobs !== 1 ? "s" : ""}</>}
                    </span>
                  </Link>
                ))}
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 24, alignItems: "center" }}>
                <Link href="/paths" className="e-btn">Map my route →</Link>
                <a href="#how" className="e-btn e-btn--ghost">How it works</a>
              </div>
              <p style={{ marginTop: 16, fontSize: 12, color: "var(--e-fg-dim)" }}>
                Every number on this page is live from the corpus · verified {graphStats.lastAnalyzed}
              </p>
            </div>

            {/* Right: live crate evidence — the product */}
            <div className="hp-hero-graph">
              <HeroEvidence
                crates={heroEvidence}
                totalRepos={graphStats.totalRepos}
                lastAnalyzed={graphStats.lastAnalyzed}
              />
            </div>

          </div>
        </section>

        {/* ── How it works — the product in four checkpoints ───────────────── */}
        <section id="how" className="hp-story" aria-label="How OSSPath works">
          <div className="e-col e-col--x">
            <div className="hp-story__grid">
              <div className="hp-story__step">
                <span className="hp-story__k">01 · Destination</span>
                <span className="hp-story__t">Pick where you&apos;re going</span>
                <p className="hp-story__d">Backend, systems, infrastructure, or embedded — a real job, not a certificate.</p>
              </div>
              <div className="hp-story__step">
                <span className="hp-story__k">02 · Route</span>
                <span className="hp-story__t">We map the route</span>
                <p className="hp-story__d">Skill legs computed from {graphStats.totalRepos.toLocaleString("en-US")} production Rust codebases — not opinion.</p>
              </div>
              <div className="hp-story__step">
                <span className="hp-story__k">03 · Proof</span>
                <span className="hp-story__t">Repos prove your skill</span>
                <p className="hp-story__d">Read real architectures, land real PRs, build projects that survive review.</p>
              </div>
              <div className="hp-story__step">
                <span className="hp-story__k">04 · Arrival</span>
                <span className="hp-story__t">Jobs are the destination</span>
                <p className="hp-story__d">Every route ends at the companies hiring for exactly that stack.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── 01 Popular Crates ────────────────────────────────────────────── */}
        <section id="crates" className="e-section">
          <div className="e-col e-col--wide">
            <SectionHeader
              num="01"
              title="Popular Crates"
              meta="by real-world usage"
              note="The crates real projects depend on most — with the share of indexed repositories that actually use each one, and the organizations behind them."
              archiveHref="/deps"
              archiveLabel="Explore all crates"
            />
            <div className="hp-crate-panel">
              <div className="hp-crate-head">
                <span>crate</span>
                <span>used by · {graphStats.totalRepos.toLocaleString("en-US")} repos indexed</span>
              </div>
              {featuredCrates.map((c) => (
                <Link key={c.name} href={c.href} className="hp-crate-row">
                  <div className="hp-crate-name-wrap">
                    <span className="hp-crate-name">{c.name}</span>
                    <span className="hp-crate-desc">{c.description.split(".")[0]}.</span>
                  </div>
                  <div className="hp-crate-bar-wrap">
                    <div className="hp-crate-bar" style={{ width: `${Math.min(c.pctOfCorpus, 100)}%` }} />
                  </div>
                  <span className="hp-crate-pct">{c.pctOfCorpus}%</span>
                  <span className="hp-crate-n">{c.repoCount.toLocaleString("en-US")}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── 02 Ecosystems ────────────────────────────────────────────────── */}
        <section id="ecosystems" className="e-section e-section--band">
          <div className="e-col e-col--wide">
            <SectionHeader
              num="02"
              title="Ecosystems"
              meta={`${featuredEcosystems.length} domains`}
              note="Pick a domain — the repositories that define it, the organizations working in it, and the roles and funding attached to it."
            />
            <div className="hp-eco-grid">
              {featuredEcosystems.map((eco) => (
                <Link key={eco.tag} href={`/ecosystems/${eco.tag}`} className="hp-eco-card">
                  <span className="hp-eco-name">{eco.label}</span>
                  <div className="hp-eco-counts">
                    <span><b>{eco.repoCount.toLocaleString("en-US")}</b> repos</span>
                    {eco.jobCount > 0 && (
                      <span><b>{eco.jobCount}</b> job{eco.jobCount !== 1 ? "s" : ""}</span>
                    )}
                    {eco.programCount > 0 && (
                      <span><b>{eco.programCount}</b> program{eco.programCount !== 1 ? "s" : ""}</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── 03 Featured Repositories ─────────────────────────────────────── */}
        <section id="repos" className="e-section">
          <div className="e-col e-col--wide">
            <SectionHeader
              num="03"
              title="Featured Repositories"
              meta={`${graphStats.totalRepos.toLocaleString("en-US")} indexed`}
              note="The most-starred active projects in the corpus — who maintains each one, what it builds on, and whether it's funded."
              archiveHref="/oss"
              archiveLabel={`All ${graphStats.totalRepos.toLocaleString("en-US")} repositories`}
            />
            <div className="hp-repo-grid">
              {featuredRepositories.map((r) => (
                <Link key={r.fullName} href={r.href} className="hp-repo-card">
                  <div className="hp-repo-head">
                    <span className="hp-repo-name">
                      <span className="hp-repo-owner">{r.owner}/</span>{r.name}
                    </span>
                    <span className="hp-repo-stars">
                      ★ {r.stars >= 1000
                        ? `${(Math.round(r.stars / 100) / 10).toFixed(1)}k`
                        : r.stars}
                    </span>
                  </div>
                  <p className="hp-repo-desc">{r.description}</p>
                  <div className="hp-repo-foot">
                    {r.org && <span className="hp-repo-org">{r.org.name}</span>}
                    <span className="hp-repo-eco">{r.ecoLabel}</span>
                    {r.isFunded && <span className="hp-repo-funded">funded</span>}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── 04 Organizations ─────────────────────────────────────────────── */}
        <section id="organizations" className="e-section">
          <div className="e-col e-col--wide">
            <SectionHeader
              num="04"
              title="Organizations"
              meta={`${graphStats.totalOrgs} indexed`}
              note="Companies, projects, and nonprofits — each linked to the repos it owns, the programs that fund it, and the roles it's hiring for."
              archiveHref="/ecosystem"
              archiveLabel={`Browse all ${graphStats.totalOrgs}`}
            />
            <div className="hp-org-grid">
              {featuredOrganizations.map((org) => (
                <Link key={org.slug} href={org.href} className="hp-org-card">
                  <span className="hp-org-name">{org.name}</span>
                  <span className="hp-org-sector">{org.sector}</span>
                  <div className="hp-org-meta">
                    <span>{org.repoCount} repos</span>
                    <span>★ {(org.totalStars / 1000).toFixed(0)}k</span>
                  </div>
                  {org.ecosystems.length > 0 && (
                    <div className="hp-org-ecos">
                      {org.ecosystems.slice(0, 2).map(eco => (
                        <span key={eco} className={`e-oss__eco-badge e-oss__eco-badge--${eco}`}>
                          {ECO_LABEL[eco]}
                        </span>
                      ))}
                    </div>
                  )}
                  {org.jobCount > 0 && (
                    <span className="hp-org-hiring">
                      {org.jobCount} open role{org.jobCount !== 1 ? "s" : ""}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── 05 Funding Programs ──────────────────────────────────────────── */}
        <section id="funding" className="e-section e-section--band">
          <div className="e-col e-col--wide">
            <SectionHeader
              num="05"
              title="Funding Programs"
              meta={`${graphStats.totalPrograms} programs · ${graphStats.fundingLinks} funded repos`}
              note="Rolling grants, sponsored bounties, and program funding — the money that keeps the ecosystem moving."
              archiveHref="/grants"
              archiveLabel={`View all ${graphStats.totalPrograms}`}
            />
            <div className="hp-fund-grid">
              {featuredFundingPrograms.map((p) => (
                <Link key={p.slug} href={p.href} className="hp-fund-card">
                  <div className="hp-fund-head">
                    <span className="hp-fund-name">{p.name}</span>
                    <span className={"hp-fund-badge hp-fund-badge--" + p.status}>{p.status}</span>
                  </div>
                  {p.funder && (
                    <span className="hp-fund-funder">{p.funder.name}</span>
                  )}
                  <p className="hp-fund-desc">{p.description}</p>
                  {p.ecosystems.length > 0 && (
                    <div className="hp-fund-ecos">
                      {p.ecosystems.slice(0, 3).map(eco => (
                        <span key={eco} className={`e-oss__eco-badge e-oss__eco-badge--${eco}`}>
                          {ECO_LABEL[eco]}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="hp-fund-foot">
                    <span className="hp-fund-repos">{p.fundedCount} funded repos</span>
                    {p.maxAward && <span className="hp-fund-award">{p.maxAward}</span>}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── 06 Open Positions ────────────────────────────────────────────── */}
        {featuredJobs.length > 0 && (
          <section id="jobs" className="e-section">
            <div className="e-col e-col--wide">
              <SectionHeader
                num="06"
                title="Open Positions"
                meta={`${graphStats.activeJobs} active · hand-reviewed`}
                note="A small, curated set — roles at organizations whose open source work is indexed here, each linked to the code the team maintains."
                archiveHref="/jobs"
                archiveLabel={`Browse all ${graphStats.activeJobs} jobs`}
              />
              <div className="hp-job-list">
                {featuredJobs.map(job => (
                  <Link key={job.slug} href={`/jobs/${job.slug}`} className="hp-job-row">
                    <div className="hp-job-ecos">
                      {(job.ecosystems ?? []).slice(0, 2).map(eco => (
                        <span key={eco} className={`e-oss__eco-badge e-oss__eco-badge--${eco}`}>
                          {ECO_LABEL[eco]}
                        </span>
                      ))}
                    </div>
                    <div className="hp-job-info">
                      <span className="hp-job-company">{job.company}</span>
                      <span className="hp-job-role">{job.role}</span>
                    </div>
                    <span className="hp-job-arrow">→</span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

      </main>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <EditorialFooter />

    </div>
  )
}
