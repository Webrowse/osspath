import Link from "next/link"
import { headers } from "next/headers"
import { notFound } from "next/navigation"
import { getPendingCounts, getPublishedCounts } from "@/lib/admin/storage"
import type { ContentType } from "@/lib/admin/types"
import { CONTENT_TYPE_LABELS } from "@/lib/admin/types"
import { getSession, signOut } from "@/lib/auth"
import "./admin.css"

const ADMIN_EMAIL = process.env.ADMIN_EMAIL
const ZERO_COUNTS = { jobs: 0, oss: 0, grants: 0, pulse: 0, events: 0, companies: 0, portals: 0, news: 0 }

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const host = (await headers()).get("host") ?? ""
  const isLocal = host.startsWith("localhost") || host.startsWith("127.0.0.1") || host.startsWith("::1")

  if (!isLocal) notFound()

  const session = await getSession()
  if (!session?.user?.email || session.user.email !== ADMIN_EMAIL) {
    notFound()
  }

  let counts = ZERO_COUNTS
  let publishedCounts = ZERO_COUNTS
  let dbDown = false
  try {
    ;[counts, publishedCounts] = await Promise.all([getPendingCounts(), getPublishedCounts()])
  } catch {
    dbDown = true
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0)

  const queueTypes: ContentType[] = ["jobs", "oss", "grants", "pulse", "events", "companies", "portals", "news"]

  return (
    <div className="adm">
      <aside className="adm-sidebar">
        <div className="adm-sidebar__brand">
          <span className="adm-sidebar__mark" />
          <span>editorial</span>
          <span className="adm-sidebar__env">{isLocal ? "localhost" : "live"}</span>
        </div>

        {dbDown && (
          <div className="adm-db-warn">DB unreachable — counts unavailable</div>
        )}

        <nav className="adm-nav">
          <div className="adm-nav__section">Queue</div>
          <Link href={`/admin/queue?type=${total > 0 ? (Object.entries(counts).find(([,v]) => v > 0)?.[0] ?? "jobs") : "jobs"}`} className="adm-nav__item adm-nav__item--queue">
            <span>Queue</span>
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
          <Link href="/admin/test-deepseek" className="adm-nav__item adm-nav__item--sub">
            Test DeepSeek API
          </Link>

          <div className="adm-nav__section">Published</div>
          {queueTypes.map((t) => (
            <Link key={t} href={`/admin/published?type=${t}`} className="adm-nav__item adm-nav__item--sub">
              <span>{CONTENT_TYPE_LABELS[t]}</span>
              {publishedCounts[t] > 0 && <span className="adm-badge adm-badge--dim">{publishedCounts[t]}</span>}
            </Link>
          ))}
        </nav>

        <div className="adm-sidebar__footer">
          <div className="adm-sidebar__user">
            <span className="adm-sidebar__user-dot" />
            <span className="adm-sidebar__user-email">{session.user.email}</span>
          </div>
          <form action={async () => {
            "use server"
            await signOut({ redirectTo: "/login" })
          }}>
            <button type="submit" className="adm-sidebar__signout">Sign out</button>
          </form>
          <Link href="/" className="adm-sidebar__home" target="_blank" rel="noopener">
            ↗ Public site
          </Link>
          <Link href="/companies" className="adm-sidebar__home" target="_blank" rel="noopener" style={{ display: "block", marginTop: 4 }}>
            → Workspace
          </Link>
        </div>
      </aside>

      <main className="adm-main">
        {children}
      </main>
    </div>
  )
}
