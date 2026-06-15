"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

interface NavLink {
  label: string
  href: string
}

export function EditorialMobileMenu({ links }: { links: NavLink[] }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  return (
    <>
      <button
        className="e-nav__menu-btn"
        aria-label="Open menu"
        onClick={() => setOpen(true)}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <path d="M3 6h12M3 12h12" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
        </svg>
      </button>

      <div
        className={`e-backdrop${open ? " open" : ""}`}
        onClick={() => setOpen(false)}
        aria-hidden
      />

      <div className="e-drawer-wrap">
        <aside className={`e-drawer${open ? " open" : ""}`} aria-hidden={!open} aria-label="Menu">
          <div className="e-drawer__head">
            <span className="e-nav__brand">
              <span className="e-nav__mark" />
              <span>rust atlas</span>
            </span>
            <button className="e-drawer__close" aria-label="Close menu" onClick={() => setOpen(false)}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <nav className="e-drawer__nav">
            {links.map(l => (
              <a
                key={l.href}
                className="e-drawer__link"
                href={l.href}
                onClick={() => setOpen(false)}
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="e-drawer__footer" />
        </aside>
      </div>
    </>
  )
}
