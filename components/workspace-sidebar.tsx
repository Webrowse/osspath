"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { signIn, signOut, useSession } from "next-auth/react"
import {
  LayoutDashboard,
  Bookmark,
  LogOut,
  LogIn,
  Building2,
  GitBranch,
  Bell,
  Briefcase,
  Globe,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { PreferencesSwitcher } from "@/components/preferences-switcher"

const NAV_ITEMS = [
  { href: "/companies", label: "Companies", icon: <Building2 size={14} /> },
  { href: "/opportunities", label: "Opportunities", icon: <Briefcase size={14} /> },
  { href: "/opportunities?remote=1&junior=1", label: "Beginner Remote", icon: null, indent: true },
  { href: "/opportunities?rust=CORE&remote=1", label: "Core Rust", icon: null, indent: true },
  { href: "/sources", label: "Sources", icon: <Globe size={14} /> },
  { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard size={14} /> },
  { href: "/companies?status=SAVED", label: "Saved", icon: <Bookmark size={14} /> },
  {
    href: "/companies?status=INTERVIEWING&status=FINAL_ROUND",
    label: "Interviewing",
    icon: <GitBranch size={14} />,
  },
  { href: "/companies?time=follow_up_due", label: "Follow-up due", icon: <Bell size={14} /> },
]

export function WorkspaceSidebar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { data: session } = useSession()

  return (
    <aside
      style={{
        width: 248,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        borderRight: "1px solid var(--line-soft)",
        background: "var(--bg-0)",
        overflow: "hidden",
      }}
    >
      {/* Workspace header — links back to editorial homepage */}
      <Link
        href="/"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 9,
          padding: "0 14px",
          height: 52,
          borderBottom: "1px solid var(--line-soft)",
          borderTop: "2px solid oklch(0.62 0.14 42 / 0.7)",
          flexShrink: 0,
          textDecoration: "none",
        }}
        onMouseEnter={(e: any) => (e.currentTarget.style.background = "var(--bg-2)")}
        onMouseLeave={(e: any) => (e.currentTarget.style.background = "transparent")}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: "linear-gradient(135deg, oklch(0.62 0.14 42) 0%, oklch(0.68 0.14 240) 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "oklch(0.99 0 0)",
            fontWeight: 700,
            fontSize: 13,
            fontFamily: "var(--font-mono)",
            flexShrink: 0,
          }}
        >
          r.
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 12.5,
              fontWeight: 600,
              color: "var(--fg-0)",
              letterSpacing: "-0.01em",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            Rust Opportunities
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--fg-3)",
            }}
          >
            workspace
          </div>
        </div>
      </Link>

      {/* Nav */}
      <nav style={{ padding: "8px 8px 0", flexShrink: 0 }}>
        {NAV_ITEMS.map((item) => {
          const [base, qs] = item.href.split("?")
          const isIndented = "indent" in item && item.indent
          const active = isIndented
            ? pathname === base && qs === searchParams.toString()
            : pathname === base || pathname.startsWith(base + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: isIndented ? "4px 8px 4px 28px" : "6px 8px",
                borderRadius: 6,
                fontSize: isIndented ? 12 : 13,
                color: active ? "var(--fg-0)" : isIndented ? "var(--fg-3)" : "var(--fg-2)",
                background: active ? "var(--bg-2)" : "transparent",
                textDecoration: "none",
                transition: "background 100ms, color 100ms",
                marginBottom: 1,
                fontWeight: active ? 500 : 400,
              }}
              onMouseEnter={(e: any) => {
                if (!active) {
                  e.currentTarget.style.background = "var(--bg-2)"
                  e.currentTarget.style.color = isIndented ? "var(--fg-1)" : "var(--fg-0)"
                }
              }}
              onMouseLeave={(e: any) => {
                if (!active) {
                  e.currentTarget.style.background = "transparent"
                  e.currentTarget.style.color = isIndented ? "var(--fg-3)" : "var(--fg-2)"
                }
              }}
            >
              {item.icon}
              <span style={{ flex: 1 }}>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div style={{ flex: 1 }} />

      {/* Preferences */}
      <div style={{ padding: "4px 8px", display: "flex", justifyContent: "flex-end" }}>
        <PreferencesSwitcher />
      </div>

      {/* User footer */}
      <div
        style={{
          borderTop: "1px solid var(--line-soft)",
          padding: "10px 12px",
          flexShrink: 0,
        }}
      >
        {session?.user ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Avatar style={{ width: 26, height: 26, flexShrink: 0 }}>
              <AvatarImage src={session.user.image ?? undefined} />
              <AvatarFallback
                style={{
                  background: "var(--bg-3)",
                  fontSize: 10,
                  color: "var(--fg-1)",
                }}
              >
                {session.user.name?.slice(0, 2).toUpperCase() ?? "U"}
              </AvatarFallback>
            </Avatar>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: "var(--fg-0)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  margin: 0,
                  lineHeight: 1.3,
                }}
              >
                {session.user.name}
              </p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              style={{
                display: "flex",
                alignItems: "center",
                padding: 4,
                borderRadius: 4,
                color: "var(--fg-3)",
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
              title="Sign out"
              onMouseEnter={(e: any) => (e.currentTarget.style.color = "var(--fg-1)")}
              onMouseLeave={(e: any) => (e.currentTarget.style.color = "var(--fg-3)")}
            >
              <LogOut size={13} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => signIn()}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              width: "100%",
              padding: "6px 8px",
              borderRadius: 6,
              border: "1px solid var(--line-soft)",
              background: "transparent",
              color: "var(--fg-2)",
              fontSize: 12.5,
              cursor: "pointer",
              transition: "background 100ms, color 100ms",
            }}
            onMouseEnter={(e: any) => {
              e.currentTarget.style.background = "var(--bg-2)"
              e.currentTarget.style.color = "var(--fg-0)"
            }}
            onMouseLeave={(e: any) => {
              e.currentTarget.style.background = "transparent"
              e.currentTarget.style.color = "var(--fg-2)"
            }}
          >
            <LogIn size={13} />
            Sign in to track
          </button>
        )}
      </div>
    </aside>
  )
}
