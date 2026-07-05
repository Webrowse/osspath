import Link from "next/link"
import { FOOTER_GROUPS, FOOTER_TAGLINE } from "@/lib/nav-config"

export function EditorialFooter() {
  return (
    <footer className="e-footer">
      <div className="e-col e-col--wide">
        <div className="e-footer__grid">

          <div className="e-footer__id">
            <div className="e-footer__brand">
              <svg width="18" height="18" viewBox="0 0 64 64" aria-hidden="true" focusable="false" style={{ display: "inline", verticalAlign: "text-bottom", marginRight: 8 }}>
                <polygon fill="currentColor" points="15,4 24.53,9.5 24.53,20.5 15,26 5.47,20.5 5.47,9.5"/>
                <polygon fill="currentColor" points="32,21 41.53,26.5 41.53,37.5 32,43 22.47,37.5 22.47,26.5"/>
                <polygon fill="#CE422B" points="49,38 58.53,43.5 58.53,54.5 49,60 39.47,54.5 39.47,43.5"/>
              </svg>
              osspath
            </div>
            <p className="e-footer__tagline">{FOOTER_TAGLINE}</p>
          </div>

          {FOOTER_GROUPS.map(group => (
            <nav key={group.label} className="e-footer__group" aria-label={group.label}>
              <div className="e-footer__group-label">{group.label}</div>
              <ul className="e-footer__group-list">
                {group.items.map(item => (
                  <li key={item.href}>
                    <Link href={item.href}>{item.label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

        </div>
      </div>
    </footer>
  )
}
