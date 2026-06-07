"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { SITE_NAV } from "@/lib/nav-config"

export function EditorialNav() {
  const pathname = usePathname()
  return (
    <nav className="e-nav__links" aria-label="Primary">
      {SITE_NAV.map((l) => (
        <Link
          key={l.archive}
          className={`e-nav__link${pathname === l.archive ? " e-nav__link--active" : ""}`}
          href={l.archive}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  )
}
