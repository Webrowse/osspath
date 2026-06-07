import Link from "next/link"
import { EditorialMobileMenu } from "@/components/editorial-mobile-menu"
import { EditorialNav } from "@/components/editorial/editorial-nav"
import { SITE_NAV } from "@/lib/nav-config"
import { SITE_CONFIG } from "@/lib/site-config"

interface EditorialLayoutProps {
  children: React.ReactNode
}

export function EditorialLayout({ children }: EditorialLayoutProps) {
  return (
    <div className="editorial-root">
      <header className="e-nav">
        <div className="e-col e-col--wide e-nav__inner">
          <Link href="/" className="e-nav__brand" aria-label="Rust Opportunities — home">
            <span className="e-nav__mark" />
            <span>rust opportunities</span>
          </Link>

          {/* Desktop nav links — client component for active-state highlighting */}
          <EditorialNav />

          <div className="e-nav__spacer" />

          <Link
            className="e-nav__workspace"
            href="/companies"
            title="Job tracker — save companies, track applications, take notes"
          >
            <span>Job Tracker</span>
            <span aria-hidden="true">→</span>
          </Link>

          <EditorialMobileMenu links={[
            { label: "← Home",     href: "/" },
            ...SITE_NAV.map((l) => ({ label: l.label, href: l.archive })),
          ]} />
        </div>
      </header>

      <main style={{ flex: 1 }}>
        {children}
      </main>

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
            <a href={SITE_CONFIG.submitUrl as string}>Submit a link</a>
            <Link href="/privacy">Privacy</Link>
            <Link href="/login">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
