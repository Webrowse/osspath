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
  const [imgError, setImgError] = useState(false)

  const color = hashColor(name)
  const radius = size >= 44 ? 10 : size >= 36 ? 8 : 6
  const fontSize = size >= 44 ? 14 : size >= 36 ? 12 : 10

  const initials = name
    .trim()
    .split(/\s+/)
    .map((w: any) => w[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase()

  const dim = `${size}px`

  return (
    <div
      className="flex-shrink-0 overflow-hidden flex items-center justify-center"
      style={{
        width: dim,
        height: dim,
        borderRadius: `${radius}px`,
        background: `linear-gradient(135deg, ${color} 0%, color-mix(in oklch, ${color}, transparent 55%) 100%)`,
        boxShadow: "0 1px 0 oklch(1 0 0 / 0.15) inset, 0 1px 8px -2px oklch(0 0 0 / 0.4)",
      }}
    >
      {logoUrl && !imgError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt=""
          aria-hidden
          width={size}
          height={size}
          onError={() => setImgError(true)}
          className="h-full w-full object-contain p-1"
        />
      ) : (
        <span
          className="select-none"
          style={{
            fontFamily: "var(--font-mono)",
            fontWeight: 600,
            fontSize,
            color: "oklch(0.99 0 0)",
            letterSpacing: "0.02em",
          }}
        >
          {initials}
        </span>
      )}
    </div>
  )
}
