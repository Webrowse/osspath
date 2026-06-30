import Link from "next/link"
import { readPendingUnpublished, getPendingCounts } from "@/lib/admin/storage"
import { CONTENT_TYPE_LABELS } from "@/lib/admin/types"
import type { ContentType } from "@/lib/admin/types"
import { BulkActions } from "@/components/admin/bulk-actions"
import { QueueSearch } from "@/components/admin/queue-search"
import { ExportButton } from "@/components/admin/export-button"

const TABS: ContentType[] = ["jobs", "oss", "grants", "pulse", "events", "companies", "portals"]

interface PageProps {
  searchParams: Promise<{ type?: string }>
}

export default async function QueuePage({ searchParams }: PageProps) {
  const { type = "jobs" } = await searchParams
  const activeType = (TABS.includes(type as ContentType) ? type : "jobs") as ContentType
  const [items, tabCounts] = await Promise.all([
    readPendingUnpublished(activeType),
    getPendingCounts(),
  ])

  return (
    <>
      {/* Tab bar */}
      <div className="adm-tabs">
        {TABS.map((t) => (
          <Link
            key={t}
            href={`/admin/queue?type=${t}`}
            className={`adm-tab${activeType === t ? " adm-tab--active" : ""}${tabCounts[t] === 0 ? " adm-tab--empty" : ""}`}
          >
            {CONTENT_TYPE_LABELS[t]}
            {tabCounts[t] > 0
              ? <span className="adm-badge adm-badge--dim">{tabCounts[t]}</span>
              : <span className="adm-badge" style={{ opacity: 0.35 }}>0</span>
            }
          </Link>
        ))}
      </div>

      {/* Page header */}
      <div className="adm-page-header">
        <span className="adm-page-title">
          Pending — {CONTENT_TYPE_LABELS[activeType]}
        </span>
        <span className="adm-page-meta">
          {items.length} item{items.length !== 1 ? "s" : ""}
        </span>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <ExportButton items={items} contentType={activeType} />
          <BulkActions contentType={activeType} items={items} />
        </div>
      </div>

      {/* Queue */}
      <div className="adm-content">
        {items.length === 0 ? (
          <div className="adm-empty">
            <span className="adm-empty__label">Queue is empty</span>
            <span>Scan sources or add manually to populate</span>
            <Link href="/admin/scan" className="adm-btn adm-btn--ghost" style={{ marginTop: 8 }}>
              Go to Scan →
            </Link>
          </div>
        ) : (
          <QueueSearch items={items} contentType={activeType} />
        )}
      </div>
    </>
  )
}
