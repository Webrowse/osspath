"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import type { QueueId, QueueItem, HideReason } from "@/lib/admin/curation-types"
import { HIDE_REASONS } from "@/lib/admin/curation-types"
import { featureRepo, hideRepo, setQueueState } from "@/lib/admin/curation-actions"

/**
 * One review queue. Every card is a decision: approve (signal was right,
 * repo is fine), feature, hide, or dismiss (flag was noise). Approve/dismiss
 * are remembered per queue so handled repos never come back.
 */

export function QueueList({ queue, items }: { queue: QueueId; items: QueueItem[] }) {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [reasons, setReasons] = useState<Record<string, string>>({})
  const [hideReasons, setHideReasons] = useState<Record<string, HideReason>>({})
  // Optimistically drop handled cards so the queue feels instant.
  const [handled, setHandled] = useState<Set<string>>(new Set())

  function run(slug: string, fn: () => Promise<void>) {
    setError(null)
    start(async () => {
      try {
        await fn()
        setHandled((s) => new Set(s).add(slug))
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      }
    })
  }

  const visible = items.filter((i) => !handled.has(i.repo.slug))

  return (
    <div className="adm-queue-list">
      {error && <div className="adm-db-warn" style={{ margin: "0 0 8px" }}>{error}</div>}
      {visible.length === 0 && (
        <div className="adm-empty"><span className="adm-empty__label">Queue clear — nothing waiting for review.</span></div>
      )}
      {visible.map(({ repo, why }) => {
        const reason = reasons[repo.slug] ?? ""
        const hideReason = hideReasons[repo.slug] ?? "low-quality"
        return (
          <div key={repo.slug} className="adm-qcard">
            <div className="adm-qcard__main">
              <div className="adm-qcard__head">
                <a href={repo.href} target="_blank" rel="noopener noreferrer" className="adm-qcard__name">{repo.slug} ↗</a>
                <span className="adm-qcard__meta">
                  {repo.stars.toLocaleString()}★ · {repo.activityTier} · {repo.language ?? "?"} · {repo.eco}
                </span>
              </div>
              {repo.note && <p className="adm-qcard__desc">{repo.note}</p>}
              <div className="adm-qcard__why">{why}</div>
            </div>
            <div className="adm-qcard__actions">
              <input
                className="adm-input adm-qcard__reason"
                placeholder="Reason (audit trail)"
                value={reason}
                onChange={(e) => setReasons((m) => ({ ...m, [repo.slug]: e.target.value }))}
              />
              <div className="adm-qcard__buttons">
                <button className="adm-btn adm-btn--ghost" disabled={pending}
                  onClick={() => run(repo.slug, () => setQueueState(repo.slug, queue, "approved", reason))}>
                  ✓ Approve
                </button>
                <button className="adm-btn adm-btn--primary" disabled={pending}
                  onClick={() => run(repo.slug, () => featureRepo(repo.slug, true, reason || `featured from ${queue} queue`))}>
                  ★ Feature
                </button>
                <select className="adm-select" value={hideReason}
                  onChange={(e) => setHideReasons((m) => ({ ...m, [repo.slug]: e.target.value as HideReason }))}>
                  {HIDE_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <button className="adm-btn adm-btn--reject" disabled={pending}
                  onClick={() => run(repo.slug, () => hideRepo(repo.slug, hideReason, reason))}>
                  Hide
                </button>
                <button className="adm-btn adm-btn--ghost" disabled={pending} title="Flag was noise — drop from this queue"
                  onClick={() => run(repo.slug, () => setQueueState(repo.slug, queue, "dismissed", reason))}>
                  Dismiss
                </button>
                <Link className="adm-btn adm-btn--ghost" href={`/admin/repos?q=${encodeURIComponent(repo.slug)}`} title="Edit metadata overrides">
                  Edit
                </Link>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
