"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signIn, signOut, useSession } from "next-auth/react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { LogOut, LayoutDashboard, ArrowRight } from "lucide-react"
import { PreferencesSwitcher } from "@/components/preferences-switcher"

const NAV_LINKS = [
  {
    href: "/companies",
    label: "Companies",
    match: (p: string) => p.startsWith("/companies"),
  },
  {
    href: "/workflow",
    label: "Workflow",
    match: (p: string) => p === "/workflow",
  },
  {
    href: "/demo",
    label: "Demo",
    match: (p: string) => false, // demo redirects; never shows as active
    isDemo: true,
  },
]

export function Navbar() {
  const pathname = usePathname()
  const { data: session, status } = useSession()
  const isOnLanding = pathname === "/"

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        borderBottom: "1px solid var(--line-soft)",
        background: "color-mix(in oklch, var(--bg-0), transparent 15%)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      <div
        className="nav-inner"
        style={{
          maxWidth: 1240,
          margin: "0 auto",
          padding: "0 32px",
          height: 52,
          display: "flex",
          alignItems: "center",
          gap: 0,
        }}
      >
        {/* Logo */}
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            textDecoration: "none",
            marginRight: 32,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: 7,
              background: "linear-gradient(135deg, var(--d-rust) 0%, var(--d-accent) 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "oklch(0.99 0 0)",
              fontWeight: 700,
              fontSize: 12,
              fontFamily: "var(--font-mono)",
              flexShrink: 0,
            }}
          >
            j.
          </div>
          <span
            style={{
              fontSize: 13.5,
              fontWeight: 600,
              color: "var(--fg-0)",
              letterSpacing: "-0.01em",
              whiteSpace: "nowrap",
            }}
          >
            jobs.adarshrust
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              padding: "1px 5px",
              borderRadius: 4,
              background: "var(--bg-2)",
              border: "1px solid var(--line-soft)",
              color: "var(--fg-3)",
            }}
          >
            v0.4
          </span>
        </Link>

        {/* Nav */}
        <nav
          className="nav-links"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            flex: 1,
          }}
        >
          {NAV_LINKS.map((link: any) => {
            const active = link.match(pathname)
            return (
              <Link
                key={link.label}
                href={link.href}
                style={{
                  position: "relative",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "5px 10px",
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: active ? 500 : 400,
                  color: active ? "var(--fg-0)" : "var(--fg-2)",
                  background: active ? "var(--bg-2)" : "transparent",
                  textDecoration: "none",
                  transition: "color 100ms, background 100ms",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e: any) => {
                  if (!active) {
                    e.currentTarget.style.color = "var(--fg-0)"
                    e.currentTarget.style.background = "var(--bg-2)"
                  }
                }}
                onMouseLeave={(e: any) => {
                  if (!active) {
                    e.currentTarget.style.color = "var(--fg-2)"
                    e.currentTarget.style.background = "transparent"
                  }
                }}
              >
                {link.label}
                {link.isDemo && (
                  <span
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: 999,
                      background: "var(--d-ok)",
                      flexShrink: 0,
                      animation: "d-pulse 2.5s ease-out infinite",
                    }}
                  />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Spacer — pushes auth right when nav is hidden on mobile */}
        <div style={{ flex: 1 }} />

        {/* Right side */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexShrink: 0,
          }}
        >
          <PreferencesSwitcher />

          {/* ⌘K — opens command palette */}
          <button
            className="nav-cmd"
            onClick={() => window.dispatchEvent(new Event("open-command-palette"))}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--fg-3)",
              marginRight: 4,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
            title="Open command palette"
          >
            <kbd
              style={{
                padding: "1px 5px",
                borderRadius: 4,
                border: "1px solid var(--line)",
                background: "var(--bg-2)",
                color: "var(--fg-2)",
                fontSize: 10,
                cursor: "pointer",
              }}
            >
              ⌘K
            </kbd>
          </button>

          {status === "loading" ? (
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 999,
                background: "var(--bg-3)",
                animation: "d-pulse 1.5s ease-in-out infinite",
              }}
            />
          ) : session?.user ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "4px 10px 4px 5px",
                  borderRadius: 20,
                  border: "1px solid var(--line-soft)",
                  background: "var(--bg-2)",
                  cursor: "pointer",
                  outline: "none",
                }}
              >
                <Avatar style={{ width: 22, height: 22 }}>
                  <AvatarImage src={session.user.image ?? undefined} />
                  <AvatarFallback
                    style={{
                      background: "var(--bg-3)",
                      fontSize: 9,
                      color: "var(--fg-1)",
                    }}
                  >
                    {session.user.name?.slice(0, 2).toUpperCase() ?? "U"}
                  </AvatarFallback>
                </Avatar>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: "var(--fg-0)",
                    maxWidth: 100,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {session.user.name?.split(" ")[0]}
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" style={{ minWidth: 180 }}>
                <div style={{ padding: "8px 10px 6px" }}>
                  <p
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: "var(--fg-0)",
                      margin: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {session.user.name}
                  </p>
                  <p
                    style={{
                      fontSize: 11,
                      color: "var(--fg-3)",
                      margin: "2px 0 0",
                      fontFamily: "var(--font-mono)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {session.user.email}
                  </p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem render={<Link href="/dashboard" />}>
                  <LayoutDashboard size={13} style={{ marginRight: 8 }} />
                  Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem render={<Link href="/companies" />}>
                  <span style={{ marginRight: 8, fontSize: 13 }}>⌘</span>
                  Open workspace
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => signOut({ callbackUrl: "/" })}
                  style={{ color: "var(--d-danger)", cursor: "pointer" }}
                >
                  <LogOut size={13} style={{ marginRight: 8 }} />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <button
                onClick={() => signIn()}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 13,
                  color: "var(--fg-2)",
                  padding: "5px 8px",
                  borderRadius: 6,
                  transition: "color 100ms",
                  fontFamily: "var(--font-sans)",
                }}
                onMouseEnter={(e: any) => (e.currentTarget.style.color = "var(--fg-0)")}
                onMouseLeave={(e: any) => (e.currentTarget.style.color = "var(--fg-2)")}
              >
                Sign in
              </button>

              <Link
                href="/companies"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  height: 30,
                  padding: "0 12px",
                  borderRadius: 7,
                  fontSize: 12.5,
                  fontWeight: 500,
                  color: "oklch(0.99 0 0)",
                  background: isOnLanding ? "var(--d-accent)" : "var(--bg-3)",
                  border: isOnLanding ? "none" : "1px solid var(--line-soft)",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                  transition: "opacity 100ms",
                  boxShadow: isOnLanding
                    ? "0 1px 0 oklch(1 0 0 / 0.18) inset"
                    : "none",
                  ...(isOnLanding ? {} : { color: "var(--fg-0)" }),
                }}
                onMouseEnter={(e: any) => (e.currentTarget.style.opacity = "0.85")}
                onMouseLeave={(e: any) => (e.currentTarget.style.opacity = "1")}
              >
                {isOnLanding ? (
                  <>
                    Get started
                    <ArrowRight size={12} />
                  </>
                ) : (
                  "Open app"
                )}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
