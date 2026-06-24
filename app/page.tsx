import Link from "next/link"
import { EditorialMobileMenu } from "@/components/editorial-mobile-menu"
import { CommandPalette } from "@/components/command-palette"
import { EditorialThemeToggle } from "@/components/editorial-theme-toggle"
import { HeroGraph } from "@/components/editorial/hero-graph"
import { SectionHeader } from "@/components/editorial/section-header"
import { ExploreDropdown } from "@/components/editorial/explore-dropdown"
import { getLandingData } from "@/lib/landing-data"
import { ECO_LABEL } from "@/lib/eco-tags"
import { SITE_NAV, FOOTER_NAV, EXPLORE_NAV } from "@/lib/nav-config"

export default function HomePage() {
  const {
    graphStats,
    featuredJourneys,
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
            <span className="e-nav__mark" />
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

          <EditorialThemeToggle />

          <EditorialMobileMenu links={[
            ...SITE_NAV.map((l) => ({ label: l.label, href: l.anchor })),
            { label: "Explore", href: "", isSection: true },
            ...EXPLORE_NAV.map((l) => ({ label: l.label, href: l.href })),
          ]} />
        </div>
      </header>

      <main>

        {/* ── Hero — graph is the product ──────────────────────────────────── */}
        <section className="e-hero hp-hero-split" id="top">
          <div className="e-col e-col--wide hp-hero-grid">

            {/* Left: text */}
            <div className="hp-hero-text">
              <div className="e-hero__eyebrow">
                <span className="e-dot" />
                <span>Ecosystem graph</span>
              </div>
              <h1 className="e-hero__title">
                Navigate the Rust ecosystem{" "}
                <em>as a connected graph.</em>
              </h1>
              <p className="e-hero__sub">
                Find jobs through repositories. Find organizations through
                dependencies. Find funding through projects. Start from any node.
              </p>

              <div className="hp-stats">
                {([
                  { value: graphStats.totalRepos.toLocaleString("en-US"), label: "repositories" },
                  { value: String(graphStats.totalOrgs),                   label: "organizations" },
                  { value: String(graphStats.totalPrograms),               label: "funding programs" },
                  { value: String(graphStats.activeJobs),                  label: "active jobs" },
                ] as const).map(({ value, label }) => (
                  <div key={label} className="hp-stat">
                    <span className="hp-stat-v">{value}</span>
                    <span className="hp-stat-l">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: graph — the product */}
            <div className="hp-hero-graph">
              <HeroGraph journeys={featuredJourneys} />
            </div>

          </div>
        </section>

        {/* ── 01 Ecosystems ────────────────────────────────────────────────── */}
        <section id="ecosystems" className="e-section">
          <div className="e-col">
            <SectionHeader
              num="01"
              title="Ecosystems"
              meta={`${featuredEcosystems.length} domains`}
              note="Navigate the graph by domain. Each ecosystem links to its repositories, organizations, and open jobs."
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

        {/* ── 02 Featured Repositories ─────────────────────────────────────── */}
        <section id="repos" className="e-section">
          <div className="e-col">
            <SectionHeader
              num="02"
              title="Featured Repositories"
              meta={`${graphStats.totalRepos.toLocaleString("en-US")} indexed`}
              note="Stars, activity tier, owning organization, and ecosystem — each repo is a node with edges out."
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

        {/* ── 03 Popular Crates ────────────────────────────────────────────── */}
        <section id="crates" className="e-section">
          <div className="e-col">
            <SectionHeader
              num="03"
              title="Popular Crates"
              meta="by reverse-dependency count"
              note="Dependency edges reveal which crates — and the organizations behind them — sit upstream of the whole ecosystem."
              archiveHref="/deps"
              archiveLabel="Explore dependency graph"
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

        {/* ── 04 Funding Programs ──────────────────────────────────────────── */}
        <section id="funding" className="e-section">
          <div className="e-col">
            <SectionHeader
              num="04"
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

        {/* ── 05 Organizations ─────────────────────────────────────────────── */}
        <section id="organizations" className="e-section">
          <div className="e-col">
            <SectionHeader
              num="05"
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

        {/* ── 06 Open Positions ────────────────────────────────────────────── */}
        {featuredJobs.length > 0 && (
          <section id="jobs" className="e-section">
            <div className="e-col">
              <SectionHeader
                num="06"
                title="Open Positions"
                meta={`${graphStats.activeJobs} active`}
                note="Each role connects to the organization's open source footprint and the ecosystems it operates in."
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
      <footer className="e-footer">
        <div className="e-col e-col--wide">
          <div className="e-footer__row">
            <div>
              <div className="e-footer__brand">osspath</div>
              <div className="e-footer__tagline">Curated weekly. Quiet by design.</div>
            </div>
          </div>
          <div className="e-footer__links">
            {FOOTER_NAV.map(l => (
              <Link key={l.href} href={l.href}>{l.label}</Link>
            ))}
          </div>
        </div>
      </footer>

    </div>
  )
}
