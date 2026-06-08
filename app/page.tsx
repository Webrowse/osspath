import Link from "next/link"
import { EditorialMobileMenu } from "@/components/editorial-mobile-menu"
import { SectionHeader } from "@/components/editorial/section-header"
import { JobCard } from "@/components/editorial/job-card"
import { OSSHomeSection } from "@/components/editorial/oss-home-section"
import { GrantCard } from "@/components/editorial/grant-card"
import { PulseRow } from "@/components/editorial/pulse-item"
import { EventCard } from "@/components/editorial/event-card"
import { CompanyGrid } from "@/components/editorial/company-grid"
import { PortalRow } from "@/components/editorial/portal-row"
import { JOBS } from "@/content/jobs"
import { OSS_PATHS } from "@/content/oss-paths"
import { GRANTS } from "@/content/grants"
import { PULSE } from "@/content/pulse"
import { EVENTS } from "@/content/events"
import { COMPANIES } from "@/content/companies"
import { PORTALS } from "@/content/portals"
import { filterActive } from "@/lib/content-utils"
import { SITE_CONFIG } from "@/lib/site-config"
import { SITE_NAV } from "@/lib/nav-config"

// Max items shown per section on the homepage — View All appears when total exceeds this
const LIMITS = { jobs: 4, grants: 4, pulse: 4, events: 3, companies: 8 }

export default function HomePage() {
  // Auto-hide expired content at build time
  const activeJobs   = filterActive(JOBS)
  const activeGrants = filterActive(GRANTS)
  const activeEvents = filterActive(EVENTS)

  const featuredJobs      = activeJobs.slice(0, LIMITS.jobs)
  const featuredGrants    = activeGrants.slice(0, LIMITS.grants)
  const featuredPulse     = PULSE.slice(0, LIMITS.pulse)
  const featuredEvents    = activeEvents.slice(0, LIMITS.events)
  const featuredCompanies = COMPANIES.slice(0, LIMITS.companies)

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

          <EditorialMobileMenu links={
            SITE_NAV.map((l) => ({ label: l.label, href: l.archive }))
          } />
        </div>
      </header>

      <main>

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section className="e-hero" id="top">
          <div className="e-col">
            <div className="e-hero__eyebrow">
              <span className="e-dot" />
              <span>Curated — updated weekly</span>
            </div>
            <h1 className="e-hero__title">
              Curated Rust ecosystem{" "}
              <em>opportunities.</em>
            </h1>
            <p className="e-hero__sub">
              Remote jobs, OSS paths, grants, and quiet ecosystem signals —
              kept short and read by a human first.
            </p>
          </div>
        </section>

        {/* ── 01 Remote Rust Jobs ──────────────────────────────────────────── */}
        <section id="jobs" className="e-section">
          <div className="e-col">
            <SectionHeader
              num="01"
              title="Remote Rust Jobs"
              meta={activeJobs.length > 0 ? `${activeJobs.length} open · verified this week` : "checking for openings"}
              note="Rust-explicit roles only. Each entry links directly to the company careers page."
              archiveHref={activeJobs.length > LIMITS.jobs ? "/jobs" : undefined}
              archiveLabel={`View all ${activeJobs.length}`}
            />
            <div className="e-jobs">
              {featuredJobs.map((job) => (
                <JobCard key={`${job.company}-${job.role}`} job={job} />
              ))}
            </div>
          </div>
        </section>

        {/* ── 02 OSS Paths ─────────────────────────────────────────────────── */}
        <section id="oss" className="e-section">
          <div className="e-col">
            <SectionHeader
              num="02"
              title="OSS Paths"
              meta={`${OSS_PATHS.length} repositories · 4 featured`}
              note="Realistic places to make a first or fifth contribution. Maintainer responsiveness, issue quality, and a short human note on each."
              archiveHref="/oss"
              archiveLabel={`View all ${OSS_PATHS.length}`}
            />
            <OSSHomeSection repos={OSS_PATHS} />
          </div>
        </section>

        {/* ── 03 Grants & Bounties ─────────────────────────────────────────── */}
        <section id="grants" className="e-section">
          <div className="e-col">
            <SectionHeader
              num="03"
              title="Grants & Bounties"
              meta={`${activeGrants.length} listed`}
              note="Grants, sponsorships, and funded opportunities in the Rust ecosystem. Click out for current terms."
              archiveHref={activeGrants.length > LIMITS.grants ? "/grants" : undefined}
              archiveLabel={`View all ${activeGrants.length}`}
            />
            <div className="e-grants">
              {featuredGrants.map((grant) => (
                <GrantCard key={grant.name} grant={grant} />
              ))}
            </div>
          </div>
        </section>

        {/* ── 04 Ecosystem Pulse ───────────────────────────────────────────── */}
        <section id="pulse" className="e-section">
          <div className="e-col">
            <SectionHeader
              num="04"
              title="Ecosystem Pulse"
              meta="important internet places"
              note="Forums, newsletters, working-group notes, and community spaces worth following."
              archiveHref={PULSE.length > LIMITS.pulse ? "/pulse" : undefined}
              archiveLabel={`View all ${PULSE.length}`}
            />
            <div className="e-pulse">
              {featuredPulse.map((item) => (
                <PulseRow key={item.title} item={item} />
              ))}
            </div>
          </div>
        </section>

        {/* ── 05 Events & Learning ─────────────────────────────────────────── */}
        <section id="events" className="e-section">
          <div className="e-col">
            <SectionHeader
              num="05"
              title="Events & Learning"
              meta="time-bound · free"
              note="Conferences, workshops, and recurring community calls. Temporary opportunities worth knowing about."
              archiveHref={activeEvents.length > LIMITS.events ? "/events" : undefined}
              archiveLabel={`View all ${activeEvents.length}`}
            />
            <div className="e-events">
              {featuredEvents.map((event) => (
                <EventCard key={event.title} event={event} />
              ))}
            </div>
          </div>
        </section>

        {/* ── 06 Companies Using Rust ──────────────────────────────────────── */}
        <section id="companies" className="e-section e-section--companies">
          <div className="e-col e-col--wide">
            <SectionHeader
              num="06"
              title="Companies Using Rust"
              meta="exploratory"
              note="Not all companies listed here are hiring. Useful for orientation — who builds what in the Rust ecosystem."
              archiveHref={COMPANIES.length > LIMITS.companies ? "/ecosystem" : undefined}
              archiveLabel={`View all ${COMPANIES.length}`}
            />
            <CompanyGrid companies={featuredCompanies} />
          </div>
        </section>

        {/* ── 07 Job Portals ───────────────────────────────────────────────── */}
        <section id="portals" className="e-section">
          <div className="e-col">
            <SectionHeader
              num="07"
              title="Job Portals"
              meta="where else to look"
              note="Rust-relevant job boards and aggregators. Complementary sources — not curated by this site."
            />
            <div className="e-pulse">
              {PORTALS.map((portal) => (
                <PortalRow key={portal.name} portal={portal} />
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
