import Link from "next/link"
import { EditorialMobileMenu } from "@/components/editorial-mobile-menu"
import { HeroGraph } from "@/components/editorial/hero-graph"
import { SectionHeader } from "@/components/editorial/section-header"
import { getLandingData } from "@/lib/landing-data"
import { SITE_CONFIG } from "@/lib/site-config"
import { SITE_NAV } from "@/lib/nav-config"

export default function HomePage() {
  const {
    graphStats,
    featuredJourneys,
    featuredFundingPrograms,
    featuredRepositories,
    featuredOrganizations,
    featuredEcosystems,
    featuredCrates,
  } = getLandingData()

  return (
    <div className="editorial-root">

      {/* ── Nav ──────────────────────────────────────────────────────────────── */}
      <header className="e-nav">
        <div className="e-col e-col--wide e-nav__inner">
          <Link href="/" className="e-nav__brand" aria-label="Rust Opportunities — home">
            <span className="e-nav__mark" />
            <span>rust opportunities</span>
          </Link>

          <nav className="e-nav__links" aria-label="Primary">
            {SITE_NAV.map((l) => (
              <a key={l.anchor} className="e-nav__link" href={l.archive}>{l.label}</a>
            ))}
          </nav>

          <div className="e-nav__spacer" />

          <Link
            className="e-nav__workspace"
            href="/companies"
            title="Job tracker — save companies, track applications, take notes"
          >
            <span>Job Tracker</span>
            <span aria-hidden="true">→</span>
          </Link>

          <EditorialMobileMenu links={SITE_NAV.map((l) => ({ label: l.label, href: l.archive }))} />
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
                <span>OSS Paths — the Rust ecosystem graph</span>
              </div>
              <h1 className="e-hero__title">
                Navigate the Rust ecosystem{" "}
                <em>as a connected graph.</em>
              </h1>
              <p className="e-hero__sub">
                Find jobs through repositories. Find organizations through
                dependencies. Find funding through projects. Start from any node.
              </p>

              <div className="hp-graph-legend">
                {([
                  { label: "Fund",  color: "#c2562c" },
                  { label: "Repo",  color: "#3d6b9e" },
                  { label: "Eco",   color: "#6a7a3f" },
                  { label: "Org",   color: "#7a5c8c" },
                  { label: "Crate", color: "#8a6030" },
                  { label: "Job",   color: "#2b6b4a" },
                ] as const).map(({ label, color }) => (
                  <span key={label} className="hp-legend-tok" style={{ "--nc": color } as React.CSSProperties}>
                    <span className="hp-legend-dot" />
                    {label}
                  </span>
                ))}
              </div>

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
              archiveHref="/oss"
              archiveLabel="Browse repositories"
            />
            <div className="hp-eco-grid">
              {featuredEcosystems.map((eco) => (
                <Link key={eco.tag} href={eco.reposHref} className="hp-eco-card">
                  <span className="hp-eco-name">{eco.label}</span>
                  <div className="hp-eco-counts">
                    <span><b>{eco.repoCount.toLocaleString("en-US")}</b> repos</span>
                    {eco.jobCount > 0 && (
                      <span><b>{eco.jobCount}</b> job{eco.jobCount !== 1 ? "s" : ""}</span>
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
              archiveLabel={`Explore all ${graphStats.totalRepos.toLocaleString("en-US")}`}
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
                  <span className="hp-crate-name">{c.name}</span>
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
                  <div className="hp-org-meta">
                    <span>{org.repoCount} repos</span>
                    <span>★ {(org.totalStars / 1000).toFixed(0)}k</span>
                  </div>
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

      </main>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer className="e-footer">
        <div className="e-col e-col--wide">
          <div className="e-footer__row">
            <div>
              <div className="e-footer__brand">rust opportunities</div>
              <div className="e-footer__tagline">Curated weekly. Quiet by design.</div>
            </div>
            <div>
              <Link className="e-footer__workspace" href="/companies">
                Job Tracker →
              </Link>
              <div className="e-footer__tagline" style={{ marginTop: 6 }}>
                saved jobs · notes · tracking · deep research
              </div>
            </div>
          </div>
          <div className="e-footer__links">
            <a href={SITE_CONFIG.submitUrl} rel="noopener noreferrer">Submit a link</a>
            <Link href="/privacy">Privacy</Link>
            <Link href="/login?callbackUrl=%2Fdashboard">Sign in</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}
