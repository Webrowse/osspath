"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signIn, signOut, useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { PreferencesSwitcher } from "@/components/preferences-switcher"
import { cn } from "@/lib/utils"
import { LayoutDashboard, LogOut } from "lucide-react"

const navLinks = [
  { href: "/companies", label: "Companies" },
  { href: "/dashboard", label: "How it works" },
  { href: "/companies", label: "Changelog" },
  { href: "/companies", label: "About" },
]

export function Navbar() {
  const pathname = usePathname()
  const { data: session, status } = useSession()

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5">
              {/* j. gradient logo */}
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
              <span className="font-semibold text-sm tracking-tight text-foreground">
                jobs.adarshrust
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10.5,
                  padding: "1px 6px",
                  borderRadius: 4,
                  background: "var(--bg-2)",
                  border: "1px solid var(--line-soft)",
                  color: "var(--fg-2)",
                }}
              >
                v0.4
              </span>
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className={cn(
                    "px-3 py-1.5 text-sm rounded-md transition-colors",
                    pathname === link.href
                      ? "bg-white/12 text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/6"
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-1.5">
            <span
              className="hidden md:flex items-center gap-1.5 mr-1"
              style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-3)" }}
            >
              <kbd
                style={{
                  padding: "1px 5px",
                  borderRadius: 4,
                  border: "1px solid var(--line)",
                  background: "var(--bg-2)",
                  color: "var(--fg-2)",
                  fontSize: 10,
                }}
              >
                ⌘K
              </kbd>
            </span>
            <PreferencesSwitcher />
            {status === "loading" ? (
              <div className="h-8 w-8 rounded-full bg-white/10 animate-pulse" />
            ) : session?.user ? (
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-2 rounded-full outline-none">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={session.user.image ?? undefined} />
                    <AvatarFallback className="bg-white/10 text-xs">
                      {session.user.name?.slice(0, 2).toUpperCase() ?? "U"}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium truncate">{session.user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{session.user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem render={<Link href="/dashboard" />}>
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="text-red-400 cursor-pointer"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => signIn()}
                className="text-xs h-8"
              >
                Sign in
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
