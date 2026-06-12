"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Grid3x3, LayoutDashboard, Bookmark, Search, GitBranch, Bell } from "lucide-react"


import type { CompanyListItem } from "@/lib/companies"

function hashColor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) {
    h = name.charCodeAt(i) + ((h << 5) - h)
  }
  const hue = Math.abs(h) % 360
  return `oklch(0.70 0.16 ${hue})`
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((w: any) => w[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

interface CmdItem {
  id: string
  kind: "action" | "company"
  label: string
  sub?: string
  slug?: string
  color?: string
  initials?: string
  icon?: React.ReactNode
  href?: string
}

const ACTIONS: CmdItem[] = [
  {
    id: "nav-companies",
    kind: "action",
    label: "Go to Companies",
    icon: <Grid3x3 size={12} />,
    href: "/companies",
  },
  {
    id: "nav-dashboard",
    kind: "action",
    label: "Go to Dashboard",
    icon: <LayoutDashboard size={12} />,
    href: "/dashboard",
  },
  {
    id: "nav-saved",
    kind: "action",
    label: "Saved queue",
    icon: <Bookmark size={12} />,
    href: "/companies?status=SAVED",
  },
  {
    id: "nav-interviewing",
    kind: "action",
    label: "Interviewing queue",
    icon: <GitBranch size={12} />,
    href: "/companies?status=INTERVIEWING&status=FINAL_ROUND",
  },
  {
    id: "nav-followup",
    kind: "action",
    label: "Follow-up due",
    icon: <Bell size={12} />,
    href: "/companies?time=follow_up_due",
  },
]

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter()
  const [q, setQ] = useState("")
  const [idx, setIdx] = useState(0)
  const [companies, setCompanies] = useState<CmdItem[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (open) {
      setQ("")
      setIdx(0)
      setCompanies([])
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const fetchCompanies = useCallback(async (query: string) => {
    if (abortRef.current) abortRef.current.abort()
    if (!query.trim()) {
      setCompanies([])
      setLoading(false)
      return
    }
    abortRef.current = new AbortController()
    setLoading(true)
    try {
      const res = await fetch(
        `/api/companies?q=${encodeURIComponent(query)}&page=1`,
        { signal: abortRef.current.signal },
      )
      if (!res.ok) return
      const data: { companies: CompanyListItem[] } = await res.json()
      const items: CmdItem[] = (data.companies ?? []).slice(0, 8).map((c: any) => ({
        id: `c-${c.id}`,
        kind: "company" as const,
        label: c.name,
        sub: c.description,
        slug: c.slug,
        color: hashColor(c.name),
        initials: getInitials(c.name),
      }))
      setCompanies(items)
    } catch (e) {
      if ((e as Error).name !== "AbortError") setCompanies([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => fetchCompanies(q), 200)
    return () => clearTimeout(t)
  }, [q, fetchCompanies])

  const filteredActions = q
    ? ACTIONS.filter((a: any) => a.label.toLowerCase().includes(q.toLowerCase()))
    : ACTIONS

  const displayItems: CmdItem[] = [...filteredActions, ...companies]

  useEffect(() => setIdx(0), [q])

  if (!open) return null

  const choose = (item: CmdItem) => {
    if (item.kind === "company" && item.slug) {
      router.push(`/companies/${item.slug}`)
    } else if (item.href) {
      router.push(item.href)
    }
    onClose()
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setIdx((i: any) => Math.min(displayItems.length - 1, i + 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setIdx((i: any) => Math.max(0, i - 1))
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (displayItems[idx]) choose(displayItems[idx])
    } else if (e.key === "Escape") {
      e.preventDefault()
      onClose()
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        background: "oklch(0 0 0 / 0.45)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "12vh",
        animation: "d-fade-in 140ms ease",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e: any) => e.stopPropagation()}
        style={{
          width: "min(620px, 92vw)",
          background: "var(--bg-1)",
          border: "1px solid var(--line)",
          borderRadius: 12,
          boxShadow: "0 30px 80px -20px oklch(0 0 0 / 0.6)",
          overflow: "hidden",
          animation: "d-pop-in 180ms cubic-bezier(0.2, 0.7, 0.3, 1)",
        }}
      >
        {/* Input */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 16px",
            borderBottom: "1px solid var(--line-soft)",
          }}
        >
          <Search size={15} style={{ color: "var(--fg-3)", flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={q}
            onChange={(e: any) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search companies, run a command…"
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              fontSize: 14,
              color: "var(--fg-0)",
              fontFamily: "var(--font-sans)",
            }}
          />
          <span style={kbdStyle}>esc</span>
        </div>

        {/* Results */}
        <div style={{ maxHeight: "50vh", overflowY: "auto", padding: 6 }}>
          {displayItems.length === 0 ? (
            <div
              style={{
                padding: "24px 16px",
                textAlign: "center",
                color: "var(--fg-3)",
                fontSize: 13,
              }}
            >
              {loading ? "Searching…" : q ? `No results for "${q}"` : "Start typing to search…"}
            </div>
          ) : (
            displayItems.map((item, i) => (
              <CmdRow
                key={item.id}
                item={item}
                active={idx === i}
                onHover={() => setIdx(i)}
                onSelect={() => choose(item)}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "8px 14px",
            borderTop: "1px solid var(--line-soft)",
            background: "var(--bg-2)",
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontFamily: "var(--font-mono)",
            fontSize: 10.5,
            color: "var(--fg-3)",
          }}
        >
          <span>
            <kbd style={kbdStyle}>↑</kbd> <kbd style={kbdStyle}>↓</kbd> navigate
          </span>
          <span>
            <kbd style={kbdStyle}>↵</kbd> open
          </span>
          <span>
            <kbd style={kbdStyle}>esc</kbd> close
          </span>
          <div style={{ flex: 1 }} />
          <span>{displayItems.length} results</span>
        </div>
      </div>
    </div>
  )
}

function CmdRow({
  item,
  active,
  onHover,
  onSelect,
}: {
  item: CmdItem
  active: boolean
  onHover: () => void
  onSelect: () => void
}) {
  return (
    <button
      onMouseEnter={onHover}
      onClick={onSelect}
      style={{
        all: "unset" as React.CSSProperties["all"],
        cursor: "pointer",
        width: "calc(100% - 12px)",
        margin: "0 6px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 10px",
        borderRadius: 6,
        background: active ? "var(--bg-3)" : "transparent",
        fontSize: 13,
      }}
    >
      {item.kind === "company" ? (
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: 5,
            flexShrink: 0,
            background: `linear-gradient(135deg, ${item.color}, color-mix(in oklch, ${item.color}, transparent 55%))`,
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            fontWeight: 600,
            color: "oklch(0.99 0 0)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {item.initials}
        </div>
      ) : (
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: 5,
            flexShrink: 0,
            background: "var(--bg-2)",
            border: "1px solid var(--line-soft)",
            color: "var(--fg-2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {item.icon}
        </div>
      )}

      <span
        style={{
          color: "var(--fg-0)",
          fontWeight: item.kind === "company" ? 500 : 400,
        }}
      >
        {item.label}
      </span>

      {item.sub && item.kind === "company" && (
        <span
          style={{
            flex: 1,
            fontSize: 11.5,
            color: "var(--fg-3)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {item.sub}
        </span>
      )}

      {item.kind === "company" && (
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--fg-3)",
            marginLeft: "auto",
          }}
        >
          company
        </span>
      )}
    </button>
  )
}

const kbdStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  padding: "1px 5px",
  borderRadius: 3,
  border: "1px solid var(--line-soft)",
  background: "var(--bg-1)",
  color: "var(--fg-2)",
}

// Mount component — registers ⌘K globally, renders the palette
export function CommandPaletteMount() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const openPalette = () => setOpen(true)
    window.addEventListener("open-command-palette", openPalette)

    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => {
      window.removeEventListener("keydown", onKey)
      window.removeEventListener("open-command-palette", openPalette)
    }
  }, [])

  return <CommandPalette open={open} onClose={() => setOpen(false)} />
}
