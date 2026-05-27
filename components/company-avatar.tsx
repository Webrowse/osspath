"use client"

import { useState } from "react"

export function hashColor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) {
    h = name.charCodeAt(i) + ((h << 5) - h)
  }
  const hue = Math.abs(h) % 360
  return `oklch(0.70 0.16 ${hue})`
}

interface CompanyAvatarProps {
  name: string
  logoUrl: string | null
  size?: number
}

export function CompanyAvatar({ name, logoUrl, size = 36 }: CompanyAvatarProps) {
  // Track whether the external logo loaded successfully.
  // Start with 'idle' so initials render immediately; logo fades in on success.
  const [logoState, setLogoState] = useState<"idle" | "loaded" | "error">("idle")

  const color = hashColor(name)
  const radius = size >= 44 ? 10 : size >= 36 ? 8 : 6
  const fontSize = size >= 44 ? 14 : size >= 36 ? 12 : 10
  const dim = `${size}px`

  const initials = name
    .trim()
    .split(/\s+/)
    .map((w: string) => w[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase()

  return (
    <div
      className="flex-shrink-0 overflow-hidden flex items-center justify-center"
      style={{
        position: "relative",
        width: dim,
        height: dim,
        borderRadius: `${radius}px`,
        background: logoState === "loaded"
          ? "var(--bg-2)"
          : `linear-gradient(135deg, ${color} 0%, color-mix(in oklch, ${color}, transparent 55%) 100%)`,
        boxShadow: "0 1px 0 oklch(1 0 0 / 0.15) inset, 0 1px 8px -2px oklch(0 0 0 / 0.4)",
        transition: "background 150ms ease-in",
        border: logoState === "loaded" ? "1px solid var(--line-soft)" : "none",
      }}
    >
      {/* Initials — always rendered as the base layer */}
      <span
        aria-hidden
        className="select-none"
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--font-mono)",
          fontWeight: 600,
          fontSize,
          color: "oklch(0.99 0 0)",
          letterSpacing: "0.02em",
        }}
      >
        {initials}
      </span>

      {/* Logo — overlaid, starts invisible, fades in only on successful load */}
      {logoUrl && logoState !== "error" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt=""
          aria-hidden
          width={size}
          height={size}
          onLoad={() => setLogoState("loaded")}
          onError={() => setLogoState("error")}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "contain",
            padding: "12.5%",
            opacity: logoState === "loaded" ? 1 : 0,
            transition: logoState === "loaded" ? "opacity 120ms ease-in" : "none",
          }}
        />
      )}
    </div>
  )
}
