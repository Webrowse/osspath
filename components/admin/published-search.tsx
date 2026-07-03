"use client"

import { useState, useMemo } from "react"
import { DeleteButton } from "@/components/admin/delete-button"
import { EditPublishedButton } from "@/components/admin/edit-published-button"
import { CONTENT_BEHAVIOR } from "@/lib/admin/content-behavior"
import type { ContentType } from "@/lib/admin/types"

const PAGE_SIZE = 100

export type IndexedItem = { item: Record<string, unknown>; index: number }

function scoreItem(item: Record<string, unknown>, q: string): number {
  const name = String(item.name ?? item.title ?? item.role ?? "").toLowerCase()
  if (name.startsWith(q)) return 3
  if (name.includes(q)) return 2
  const inOtherField = Object.entries(item).some(([k, v]) => {
    if (k === "name" || k === "title" || k === "role") return false
    if (typeof v === "string") return v.toLowerCase().includes(q)
    if (Array.isArray(v)) return v.some(s => typeof s === "string" && s.toLowerCase().includes(q))
    return false
  })
  return inOtherField ? 1 : 0
}

function matchesQuery(item: Record<string, unknown>, q: string): boolean {
  return scoreItem(item, q) > 0
}

interface PublishedSearchProps {
  items: IndexedItem[]
  contentType: ContentType
}

export function PublishedSearch({ items, contentType }: PublishedSearchProps) {
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(0)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items
      .map(entry => ({ entry, score: scoreItem(entry.item, q) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ entry }) => entry)
  }, [items, query])

  useMemo(() => { setPage(0) }, [query]) // eslint-disable-line react-hooks/exhaustive-deps

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
        pageItems.map(({ item, index }) => (
          <div key={index} className="adm-pub-item">
            <span className="adm-pub-item__name">{CONTENT_BEHAVIOR[contentType].listLabel(item)}</span>
            <span className="adm-pub-item__meta">{CONTENT_BEHAVIOR[contentType].listMeta(item)}</span>
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
            <EditPublishedButton contentType={contentType} index={index} item={item} />
            <DeleteButton contentType={contentType} index={index} />
          </div>
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
