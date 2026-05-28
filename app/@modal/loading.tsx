"use client"

import { X } from "lucide-react"
import { panelStore } from "@/lib/panel-store"
import { CompanyAvatar } from "@/components/company-avatar"

// Rendered immediately by Next.js Suspense while the @modal RSC resolves.
// panelStore is populated by CompanyRow before router.push, so name/logo
// are available synchronously on the first render of this component.
export default function PanelLoading() {
  const { name, logoUrl } = panelStore

  return (
    <>
      {/* Backdrop — appears on the first frame */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 200,
          background: "oklch(0 0 0 / 0.28)",
          backdropFilter: "blur(2px)",
          WebkitBackdropFilter: "blur(2px)",
        }}
      />

      {/* Panel shell — identical geometry to CompanyPeekPanel */}
      <div
        style={{
          position: "fixed",
          right: 0,
          top: 0,
          bottom: 0,
          width: "min(480px, 100vw)",
          zIndex: 201,
          background: "var(--bg-0)",
          borderLeft: "1px solid var(--line-soft)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "-16px 0 48px oklch(0 0 0 / 0.22)",
        }}
      >
        {/* Header — non-interactive clone of real header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            padding: "0 12px",
            height: 36,
            borderBottom: "1px solid var(--line-soft)",
            flexShrink: 0,
            background: "var(--bg-1)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 22,
              height: 22,
              borderRadius: 5,
              border: "1px solid var(--line-soft)",
              color: "var(--fg-4)",
            }}
          >
            <X size={11} />
          </div>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-4)" }}>Esc</span>
          <div style={{ flex: 1 }} />
          <Skel w={80} h={20} r={4} />
        </div>

        {/* Identity block — uses row data if available */}
        <div style={{ padding: "10px 14px 9px", borderBottom: "1px solid var(--line-soft)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 5 }}>
            {name ? (
              <CompanyAvatar name={name} logoUrl={logoUrl} size={24} />
            ) : (
              <Skel w={24} h={24} r={5} />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              {name ? (
                <span
                  style={{
                    fontSize: 13.5,
                    fontWeight: 600,
                    color: "var(--fg-0)",
                    letterSpacing: "-0.015em",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    display: "block",
                  }}
                >
                  {name}
                </span>
              ) : (
                <Skel w={160} h={14} r={3} />
              )}
            </div>
            <Skel w={64} h={18} r={4} />
          </div>
          {/* Context chips skeleton */}
          <div style={{ display: "flex", gap: 3 }}>
            <Skel w={54} h={17} r={3} />
            <Skel w={70} h={17} r={3} />
            <Skel w={46} h={17} r={3} />
          </div>
        </div>

        {/* Body skeleton — mimics the section structure */}
        <div style={{ flex: 1, overflow: "hidden" }}>
          {/* Application section */}
          <div style={{ padding: "9px 14px 10px", borderBottom: "1px solid var(--line-soft)" }}>
            <Skel w={80} h={9} r={2} style={{ marginBottom: 8 }} />
            {/* Stage track */}
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 9 }}>
              {[32, 10, 38, 10, 52, 10, 28, 10, 44, 10, 28].map((w, i) =>
                i % 2 === 0 ? (
                  <Skel key={i} w={w} h={i === 4 ? 14 : 6} r={i === 4 ? 3 : 99} />
                ) : (
                  <Skel key={i} w={w} h={1} r={0} />
                )
              )}
            </div>
            {/* Info rows */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <Skel w={60} h={11} r={2} />
                <Skel w={100} h={11} r={2} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Skel w={60} h={11} r={2} />
                <Skel w={80} h={11} r={2} />
              </div>
            </div>
            {/* Next action hint */}
            <Skel w="90%" h={11} r={2} style={{ marginTop: 10 }} />
          </div>

          {/* Notes section */}
          <div style={{ padding: "9px 14px 10px", borderBottom: "1px solid var(--line-soft)" }}>
            <Skel w={44} h={9} r={2} style={{ marginBottom: 7 }} />
            <Skel w="100%" h={11} r={2} style={{ marginBottom: 4 }} />
            <Skel w="75%" h={11} r={2} />
          </div>

          {/* Actions */}
          <div style={{ padding: "9px 14px", borderBottom: "1px solid var(--line-soft)", display: "flex", gap: 6 }}>
            <Skel w={102} h={26} r={5} />
            <Skel w={56} h={26} r={5} />
            <div style={{ flex: 1 }} />
            <Skel w={72} h={26} r={5} />
          </div>

          {/* About */}
          <div style={{ padding: "10px 14px" }}>
            <Skel w={44} h={9} r={2} style={{ marginBottom: 7 }} />
            <Skel w="100%" h={11} r={2} style={{ marginBottom: 4 }} />
            <Skel w="88%" h={11} r={2} style={{ marginBottom: 4 }} />
            <Skel w="65%" h={11} r={2} />
          </div>
        </div>
      </div>
    </>
  )
}

function Skel({
  w,
  h,
  r = 3,
  style,
}: {
  w: number | string
  h: number
  r?: number
  style?: React.CSSProperties
}) {
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: r,
        background: "var(--bg-3)",
        flexShrink: 0,
        animation: "d-pulse 1.8s ease-in-out infinite",
        ...style,
      }}
    />
  )
}
