import Link from "next/link"
import { getPendingCounts } from "@/lib/admin/storage"
import type { ContentType } from "@/lib/admin/types"
import { CONTENT_TYPE_LABELS } from "@/lib/admin/types"
import "./admin.css"

const SCAN_LINKS = [
  { label: "HN Hiring",  href: "/admin/scan#hn" },
  { label: "TWIR",       href: "/admin/scan#twir" },
  { label: "GitHub OSS", href: "/admin/scan#github" },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const counts = getPendingCounts()
  const total = Object.values(counts).reduce((a, b) => a + b, 0)

  const queueTypes: ContentType[] = ["jobs", "oss", "grants", "pulse", "events", "companies"]

  return (
    <div className="adm">
      <aside className="adm-sidebar">
        <div className="adm-sidebar__brand">
          <span className="adm-sidebar__mark" />
          <span>editorial</span>
          <span className="adm-sidebar__env">localhost</span>
        </div>

        <nav className="adm-nav">
          <div className="adm-nav__section">Queue</div>
          <Link href="/admin/queue" className="adm-nav__item adm-nav__item--queue">
            <span>All pending</span>
            {total > 0 && <span className="adm-badge">{total}</span>}
          </Link>
          {queueTypes.map((t) => (
            <Link key={t} href={`/admin/queue?type=${t}`} className="adm-nav__item adm-nav__item--sub">
              <span>{CONTENT_TYPE_LABELS[t]}</span>
              {counts[t] > 0 && <span className="adm-badge adm-badge--dim">{counts[t]}</span>}
            </Link>
          ))}

          <div className="adm-nav__section">Scan</div>
          <Link href="/admin/scan" className="adm-nav__item">Scan sources</Link>
          {SCAN_LINKS.map((s) => (
            <Link key={s.href} href={s.href} className="adm-nav__item adm-nav__item--sub">
              {s.label}
            </Link>
          ))}
          <Link href="/admin/test-deepseek" className="adm-nav__item adm-nav__item--sub">
            Test DeepSeek API
          </Link>

          <div className="adm-nav__section">Published</div>
          {queueTypes.map((t) => (
            <Link key={t} href={`/admin/published?type=${t}`} className="adm-nav__item adm-nav__item--sub">
              {CONTENT_TYPE_LABELS[t]}
            </Link>
          ))}
        </nav>

        <div className="adm-sidebar__footer">
          <Link href="/" className="adm-sidebar__home" target="_blank" rel="noopener">
            ↗ Public site
          </Link>
        </div>
      </aside>

      <main className="adm-main">
        {children}
      </main>
    </div>
  )
}
