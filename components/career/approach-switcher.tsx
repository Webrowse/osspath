"use client"

import { useState, type ReactNode } from "react"

export type ApproachTab = {
  id:           string
  name:         string
  vehicle:      string
  totalMatches: number
}

/**
 * The flexible half of a capability: several genuinely different vehicle
 * classes, one destination. Tabs switch which approach's repos are visible;
 * every panel stays server-rendered and in the DOM (SEO), inactive ones get
 * the `hidden` attribute. No persistence on purpose - the right vehicle
 * differs per capability, so each cluster starts on its first approach.
 */
export function ApproachSwitcher({ tabs, panels }: { tabs: ApproachTab[]; panels: ReactNode[] }) {
  const [active, setActive] = useState(0)

  if (tabs.length === 0) return null
  const current = tabs[Math.min(active, tabs.length - 1)]

  return (
    <div className="appr">
      {tabs.length > 1 && (
        <div className="appr__tabs" role="tablist" aria-label="Ways to build this capability — any vehicle works">
          {tabs.map((t, i) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={i === active}
              className={"appr__tab" + (i === active ? " is-on" : "")}
              onClick={() => setActive(i)}
            >
              {t.name}
              {t.totalMatches > 0 && <span className="appr__tab-n">{t.totalMatches}</span>}
            </button>
          ))}
        </div>
      )}
      <p className="appr__vehicle">{current.vehicle}</p>
      {panels.map((panel, i) => (
        <div key={tabs[i]?.id ?? i} role="tabpanel" hidden={i !== active}>
          {panel}
        </div>
      ))}
    </div>
  )
}
