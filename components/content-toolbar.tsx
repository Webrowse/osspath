"use client"

import { type RefObject } from "react"
import { Search, X, List, LayoutGrid } from "lucide-react"
import { useUIPreferences } from "@/lib/theme"

export type ViewMode = "list" | "grid"

interface ContentToolbarProps {
  searchValue: string
  onSearchChange: (v: string) => void
  searchRef?: RefObject<HTMLInputElement | null>
  view: ViewMode
  onViewChange: (v: ViewMode) => void
  total: number
  loading?: boolean
}

export function ContentToolbar({
  searchValue,
  onSearchChange,
  searchRef,
  view,
  onViewChange,
  total,
  loading,
}: ContentToolbarProps) {
  const { density, setDensity } = useUIPreferences()

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 16px",
        borderBottom: "1px solid var(--line-soft)",
        background: "var(--bg-1)",
        flexShrink: 0,
      }}
    >
      {/* Search */}
      <div style={{ position: "relative", flex: 1, maxWidth: 360 }}>
        <Search
          size={13}
          style={{
            position: "absolute",
            left: 9,
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--fg-3)",
            pointerEvents: "none",
          }}
        />
        <input
          ref={searchRef}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search companies…"
          style={{
            width: "100%",
            height: 30,
            padding: "0 28px 0 29px",
            borderRadius: 6,
            background: "var(--bg-2)",
            border: "1px solid var(--line-soft)",
            outline: "none",
            fontSize: 13,
            color: "var(--fg-0)",
            fontFamily: "var(--font-sans)",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "var(--line)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "var(--line-soft)")}
        />
        {searchValue ? (
          <button
            onClick={() => onSearchChange("")}
            style={{
              position: "absolute",
              right: 7,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--fg-3)",
              background: "none",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              padding: 0,
            }}
          >
            <X size={12} />
          </button>
        ) : (
          <span
            style={{
              position: "absolute",
              right: 8,
              top: "50%",
              transform: "translateY(-50%)",
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "var(--fg-3)",
              pointerEvents: "none",
              userSelect: "none",
            }}
          >
            /
          </span>
        )}
      </div>

      {/* Result count */}
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11.5,
          color: loading ? "var(--fg-3)" : "var(--fg-2)",
          transition: "color 120ms",
          marginLeft: 4,
        }}
      >
        {total}
      </span>

      <div style={{ flex: 1 }} />

      {/* Density toggle */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          background: "var(--bg-2)",
          border: "1px solid var(--line-soft)",
          borderRadius: 6,
          overflow: "hidden",
        }}
      >
        <ToolbarBtn
          active={density === "comfortable"}
          onClick={() => setDensity("comfortable")}
          title="Comfortable density"
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <rect x="1" y="2" width="11" height="2.5" rx="1" fill="currentColor" opacity={density === "comfortable" ? 0.85 : 0.35} />
            <rect x="1" y="5.75" width="11" height="2.5" rx="1" fill="currentColor" opacity={density === "comfortable" ? 0.85 : 0.35} />
            <rect x="1" y="9.5" width="11" height="2.5" rx="1" fill="currentColor" opacity={density === "comfortable" ? 0.85 : 0.35} />
          </svg>
        </ToolbarBtn>
        <ToolbarBtn
          active={density === "compact"}
          onClick={() => setDensity("compact")}
          title="Compact density"
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <rect x="1" y="1.5" width="11" height="1.8" rx="0.8" fill="currentColor" opacity={density === "compact" ? 0.85 : 0.35} />
            <rect x="1" y="4.4" width="11" height="1.8" rx="0.8" fill="currentColor" opacity={density === "compact" ? 0.85 : 0.35} />
            <rect x="1" y="7.3" width="11" height="1.8" rx="0.8" fill="currentColor" opacity={density === "compact" ? 0.85 : 0.35} />
            <rect x="1" y="10.2" width="11" height="1.8" rx="0.8" fill="currentColor" opacity={density === "compact" ? 0.85 : 0.35} />
          </svg>
        </ToolbarBtn>
      </div>

      {/* View mode toggle */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          background: "var(--bg-2)",
          border: "1px solid var(--line-soft)",
          borderRadius: 6,
          overflow: "hidden",
        }}
      >
        <ToolbarBtn active={view === "list"} onClick={() => onViewChange("list")} title="List view">
          <List size={13} />
        </ToolbarBtn>
        <ToolbarBtn active={view === "grid"} onClick={() => onViewChange("grid")} title="Grid view">
          <LayoutGrid size={13} />
        </ToolbarBtn>
      </div>
    </div>
  )
}

function ToolbarBtn({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean
  onClick: () => void
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 28,
        height: 28,
        background: active ? "var(--bg-3)" : "transparent",
        border: "none",
        cursor: "pointer",
        color: active ? "var(--fg-0)" : "var(--fg-3)",
        transition: "background 100ms, color 100ms",
      }}
    >
      {children}
    </button>
  )
}
