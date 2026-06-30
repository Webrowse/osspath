import Link from "next/link"
import { readContent } from "@/lib/admin/storage"
import { CONTENT_TYPE_LABELS } from "@/lib/admin/types"
import type { ContentType } from "@/lib/admin/types"
import { DeleteButton } from "@/components/admin/delete-button"
import { EditPublishedButton } from "@/components/admin/edit-published-button"
import { BulkDeleteButton } from "@/components/admin/bulk-delete-button"

const TABS: ContentType[] = ["jobs", "oss", "grants", "pulse", "events", "companies", "portals"]

const PAGE_SIZE = 100

interface PageProps {
  searchParams: Promise<{ type?: string; page?: string }>
}

function getItemLabel(item: Record<string, unknown>, type: ContentType): string {
  if (type === "jobs") return `${item.role ?? "?"} — ${item.company ?? "?"}`
  if (type === "oss")  return String(item.name ?? "?")
  if (type === "grants" || type === "events") return String(item.name ?? item.title ?? "?")
  if (type === "pulse" || type === "portals") return String(item.title ?? item.name ?? "?")
  if (type === "companies") return String(item.name ?? "?")
  return "?"
}

function getItemMeta(item: Record<string, unknown>, type: ContentType): string {
  if (type === "jobs") return [item.checkedAt, item.expiresAt ? `exp ${item.expiresAt}` : ""].filter(Boolean).join(" · ")
  if (type === "oss")  return String(item.eco ?? "")
  if (type === "grants") return String(item.status ?? "")
  if (type === "pulse" || type === "portals") return String(item.kind ?? "")
  if (type === "events") return String(item.meta ?? "")
  if (type === "companies") return String(item.sector ?? "")
  return ""
}

export default async function PublishedPage({ searchParams }: PageProps) {
  const { type = "jobs", page = "0" } = await searchParams
  const activeType = (TABS.includes(type as ContentType) ? type : "jobs") as ContentType
  const pageNum = Math.max(0, parseInt(page) || 0)
  const allItems = await readContent(activeType)
  const totalPages = Math.ceil(allItems.length / PAGE_SIZE)
  const items = allItems.slice(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE)

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
        <span className="adm-page-meta">
          {allItems.length} entries
          {totalPages > 1 && ` · page ${pageNum + 1}/${totalPages}`}
        </span>
        <BulkDeleteButton contentType={activeType} count={allItems.length} />
      </div>

      <div className="adm-content">
        {allItems.length === 0 ? (
          <div className="adm-empty">
            <span className="adm-empty__label">No published {activeType}</span>
          </div>
        ) : (
          <>
            <div>
              {items.map((item, i) => {
                const globalIndex = pageNum * PAGE_SIZE + i
                return (
                  <div key={globalIndex} className="adm-pub-item">
                    <span className="adm-pub-item__name">{getItemLabel(item, activeType)}</span>
                    <span className="adm-pub-item__meta">{getItemMeta(item, activeType)}</span>
                    <a
                      href={String(item.href ?? "#")}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="adm-btn adm-btn--ghost"
                      style={{ padding: "2px 7px", fontSize: 11 }}
                      title="Open URL"
                      aria-label="Open URL"
                    >
                      ↗
                    </a>
                    <EditPublishedButton contentType={activeType} index={globalIndex} item={item} />
                    <DeleteButton contentType={activeType} index={globalIndex} />
                  </div>
                )
              })}
            </div>
            {totalPages > 1 && (
              <div className="adm-pagination">
                {pageNum > 0 ? (
                  <Link href={`/admin/published?type=${activeType}&page=${pageNum - 1}`} className="adm-btn adm-btn--ghost">← Prev</Link>
                ) : <span />}
                <span className="adm-pagination__info">
                  {pageNum * PAGE_SIZE + 1}–{Math.min((pageNum + 1) * PAGE_SIZE, allItems.length)} of {allItems.length}
                </span>
                {pageNum < totalPages - 1 && (
                  <Link href={`/admin/published?type=${activeType}&page=${pageNum + 1}`} className="adm-btn adm-btn--ghost">Next →</Link>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
