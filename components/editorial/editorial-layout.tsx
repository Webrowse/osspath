import Link from "next/link"
import { EditorialMobileMenu } from "@/components/editorial-mobile-menu"
import { EditorialNav } from "@/components/editorial/editorial-nav"
import { CommandPalette } from "@/components/command-palette"
import { EditorialThemeToggle } from "@/components/editorial-theme-toggle"
import { SITE_NAV, FOOTER_NAV, EXPLORE_NAV } from "@/lib/nav-config"

interface EditorialLayoutProps {
  children: React.ReactNode
}

export function EditorialLayout({ children }: EditorialLayoutProps) {
  return (
    <div className="editorial-root">
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

          {/* Desktop nav links — client component for active-state highlighting */}
          <EditorialNav />

          <div className="e-nav__spacer" />

          <CommandPalette />

          <EditorialThemeToggle />

          <EditorialMobileMenu links={[
            { label: "← Home",     href: "/" },
            ...SITE_NAV.map((l) => ({ label: l.label, href: l.archive })),
            { label: "Explore",    href: "",   isSection: true },
            ...EXPLORE_NAV.map((l) => ({ label: l.label, href: l.href })),
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
              <div className="e-footer__brand">
            <svg width="18" height="18" viewBox="0 0 64 64" aria-hidden="true" focusable="false" style={{ display: "inline", verticalAlign: "text-bottom", marginRight: 8 }}>
              <polygon fill="currentColor" points="15,4 24.53,9.5 24.53,20.5 15,26 5.47,20.5 5.47,9.5"/>
              <polygon fill="currentColor" points="32,21 41.53,26.5 41.53,37.5 32,43 22.47,37.5 22.47,26.5"/>
              <polygon fill="#CE422B" points="49,38 58.53,43.5 58.53,54.5 49,60 39.47,54.5 39.47,43.5"/>
            </svg>
            osspath
          </div>
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
