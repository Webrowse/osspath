"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const SIDEBAR_LINKS = [
  { href: "/dashboard", label: "All" },
  { href: "/dashboard/saved", label: "Saved" },
  { href: "/dashboard/applied", label: "Applied" },
]

export function DashboardSidebar() {
  const pathname = usePathname()

  return (
    <aside className="md:w-44 flex-shrink-0">
      <div className="md:sticky md:top-22">
        <p className="text-xs font-medium text-muted-foreground px-2 mb-2">Applications</p>
        <nav className="space-y-0.5">
          {SIDEBAR_LINKS.map((link) => {
            const isActive = link.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors",
                  isActive
                    ? "bg-white/10 text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                )}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}
