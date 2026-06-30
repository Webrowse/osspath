import Link from "next/link"
import { readContent } from "@/lib/admin/storage"
import { CONTENT_TYPE_LABELS } from "@/lib/admin/types"
import type { ContentType } from "@/lib/admin/types"
import { BulkDeleteButton } from "@/components/admin/bulk-delete-button"
import { PublishedSearch } from "@/components/admin/published-search"

const TABS: ContentType[] = ["jobs", "oss", "grants", "pulse", "events", "companies", "portals", "news"]

interface PageProps {
  searchParams: Promise<{ type?: string }>
}

export default async function PublishedPage({ searchParams }: PageProps) {
  const { type = "jobs" } = await searchParams
  const activeType = (TABS.includes(type as ContentType) ? type : "jobs") as ContentType
  const allItems = await readContent(activeType)
  const indexed = allItems.map((item, index) => ({ item, index }))

  return (
    <>
      <div className="adm-tabs">
        {TABS.map((t) => (
          <Link
            key={t}
            href={`/admin/published?type=${t}`}
            className={`adm-tab${activeType === t ? " adm-tab--active" : ""}`}
          >
            {CONTENT_TYPE_LABELS[t]}
          </Link>
        ))}
      </div>

      <div className="adm-page-header">
        <span className="adm-page-title">Published — {CONTENT_TYPE_LABELS[activeType]}</span>
        <span className="adm-page-meta">{allItems.length} entries</span>
        <BulkDeleteButton contentType={activeType} count={allItems.length} />
      </div>

      <div className="adm-content">
        {allItems.length === 0 ? (
          <div className="adm-empty">
            <span className="adm-empty__label">No published {activeType}</span>
          </div>
        ) : (
          <PublishedSearch items={indexed} contentType={activeType} />
        )}
      </div>
    </>
  )
}
