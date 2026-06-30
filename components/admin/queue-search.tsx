"use client"

import { useState, useMemo } from "react"
import { QueueCard } from "@/components/admin/queue-card"
import type { PendingItem, ContentType } from "@/lib/admin/types"

const PAGE_SIZE = 50

interface QueueSearchProps {
  items: PendingItem[]
  contentType: ContentType
}

function matchesQuery(item: PendingItem, q: string): boolean {
  const e = item.extracted
  const fields = [
    e.title, e.role, e.name, e.company, e.org,
    e.href, e.eco, e.kind, e.location,
    item.sourceUrl, item.source, item.rawText, item.whyMatched,
  ]
  return fields.some(f => f && String(f).toLowerCase().includes(q))
}

export function QueueSearch({ items, contentType }: QueueSearchProps) {
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(0)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? items.filter(item => matchesQuery(item, q)) : items
  }, [items, query])

  // Reset to first page when query changes
  const safeQuery = query
  useMemo(() => { setPage(0) }, [safeQuery]) // eslint-disable-line react-hooks/exhaustive-deps

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const pageItems = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <div>
      <div className="adm-queue-toolbar">
        <input
          type="search"
          className="adm-search"
          placeholder={`Search ${items.length} items…`}
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        {query && (
          <span className="adm-queue-toolbar__count">
            {filtered.length} match{filtered.length !== 1 ? "es" : ""}
          </span>
        )}
        {!query && totalPages > 1 && (
          <span className="adm-queue-toolbar__count">
            Page {page + 1} / {totalPages}
          </span>
        )}
      </div>

      {pageItems.length === 0 ? (
        <div className="adm-empty">
          <span className="adm-empty__label">No matches for &ldquo;{query}&rdquo;</span>
        </div>
      ) : (
        pageItems.map(item => (
          <QueueCard key={item.id} item={item} contentType={contentType} />
        ))
      )}

      {totalPages > 1 && (
        <div className="adm-pagination">
          <button
            className="adm-btn adm-btn--ghost"
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            ← Prev
          </button>
          <span className="adm-pagination__info">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <button
            className="adm-btn adm-btn--ghost"
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
