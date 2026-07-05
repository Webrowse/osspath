"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import Link from "next/link"

/** Serializable slice of a ResolvedArea — everything the tracker needs. */
export type TrackerArea = {
  id:        string
  name:      string
  weight:    number
  checklist: string[]
  project:   string
  studyHref: string | null   // top study repo for the "next step" card
  studyName: string | null
}

const BAR_SEGMENTS = 10

function storageKey(slug: string) {
  return `osspath-readiness-${slug}`
}

function itemKey(areaId: string, idx: number) {
  return `${areaId}:${idx}`
}

export function ReadinessTracker({ pathSlug, pathTitle, areas }: {
  pathSlug:  string
  pathTitle: string
  areas:     TrackerArea[]
}) {
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [loaded,  setLoaded]  = useState(false)

  const readStorage = useCallback(() => {
    try {
      const raw = localStorage.getItem(storageKey(pathSlug))
      setChecked(raw ? new Set(JSON.parse(raw) as string[]) : new Set())
    } catch { /* fresh start beats a crash */ }
  }, [pathSlug])

  useEffect(() => {
    readStorage()
    setLoaded(true)
    // LegChecklist instances broadcast this after every toggle
    window.addEventListener("osspath-readiness", readStorage)
    return () => window.removeEventListener("osspath-readiness", readStorage)
  }, [readStorage])

  const { areaScores, overall, nextArea } = useMemo(() => {
    const areaScores = areas.map(a => {
      const done = a.checklist.filter((_, i) => checked.has(itemKey(a.id, i))).length
      return { area: a, done, total: a.checklist.length, frac: a.checklist.length ? done / a.checklist.length : 0 }
    })
    const totalWeight = areas.reduce((s, a) => s + a.weight, 0) || 1
    const overall = Math.round(
      areaScores.reduce((s, x) => s + x.frac * x.area.weight, 0) / totalWeight * 100
    )
    const nextArea = areaScores.find(x => x.frac < 1) ?? null
    return { areaScores, overall, nextArea }
  }, [areas, checked])

  return (
    <div className="rt" data-loaded={loaded}>

      {/* ── Score header ─────────────────────────────────────────────── */}
      <div className="rt__head">
        <div>
          <div className="rt__label">Your readiness · {pathTitle}</div>
          <div className="rt__score" aria-live="polite">
            {overall}<span className="rt__pct">%</span>
          </div>
        </div>
        <p className="rt__honesty">
          Self-assessed against the checklist below. Saved in this browser only —
          no account, no tracking. Honest ticks make an honest map.
        </p>
      </div>

      {/* ── Per-area bars ────────────────────────────────────────────── */}
      <div className="rt__bars">
        {areaScores.map(({ area, done, total, frac }) => {
          const filled = Math.round(frac * BAR_SEGMENTS)
          return (
            <a key={area.id} href={`#leg-${area.id}`} className="rt__row">
              <span className="rt__row-name">{area.name}</span>
              <span className="rt__row-bar" aria-hidden="true">
                {"█".repeat(filled)}{"░".repeat(BAR_SEGMENTS - filled)}
              </span>
              <span className="rt__row-n">{done}/{total}</span>
            </a>
          )
        })}
      </div>

      {/* ── Next step ────────────────────────────────────────────────── */}
      {nextArea ? (
        <div className="rt__next">
          <div className="rt__next-label">Next step → {nextArea.area.name}</div>
          <p className="rt__next-body">{nextArea.area.project}</p>
          {nextArea.area.studyHref && nextArea.area.studyName && (
            <Link href={nextArea.area.studyHref} className="rt__next-link">
              Study how {nextArea.area.studyName} does it →
            </Link>
          )}
        </div>
      ) : (
        <div className="rt__next rt__next--done">
          <div className="rt__next-label">Route complete</div>
          <p className="rt__next-body">
            Every leg is checked. Your evidence should now speak for itself —
            point your applications at the repos that prove it.
          </p>
        </div>
      )}
    </div>
  )
}

/** Per-leg checklist, rendered inline inside each route stop. */
export function LegChecklist({ pathSlug, areaId, items }: {
  pathSlug: string
  areaId:   string
  items:    string[]
}) {
  const [checked, setChecked] = useState<Set<string>>(new Set())

  useEffect(() => {
    const read = () => {
      try {
        const raw = localStorage.getItem(storageKey(pathSlug))
        setChecked(raw ? new Set(JSON.parse(raw) as string[]) : new Set())
      } catch { setChecked(new Set()) }
    }
    read()
    // Same-tab sync: every toggle broadcasts this custom event
    window.addEventListener("osspath-readiness", read)
    return () => window.removeEventListener("osspath-readiness", read)
  }, [pathSlug])

  const toggle = (idx: number) => {
    const key = itemKey(areaId, idx)
    try {
      const raw  = localStorage.getItem(storageKey(pathSlug))
      const next = new Set(raw ? (JSON.parse(raw) as string[]) : [])
      if (next.has(key)) next.delete(key)
      else next.add(key)
      localStorage.setItem(storageKey(pathSlug), JSON.stringify([...next]))
      setChecked(next)
      window.dispatchEvent(new Event("osspath-readiness"))
    } catch {}
  }

  return (
    <ul className="leg-check">
      {items.map((item, i) => {
        const on = checked.has(itemKey(areaId, i))
        return (
          <li key={i}>
            <label className={"leg-check__item" + (on ? " is-on" : "")}>
              <input
                type="checkbox"
                checked={on}
                onChange={() => toggle(i)}
                className="leg-check__box"
              />
              <span className="leg-check__mark" aria-hidden="true">{on ? "▣" : "▢"}</span>
              <span className="leg-check__text">{item}</span>
            </label>
          </li>
        )
      })}
    </ul>
  )
}
