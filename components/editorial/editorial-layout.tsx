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
            <span className="e-nav__mark" />
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
