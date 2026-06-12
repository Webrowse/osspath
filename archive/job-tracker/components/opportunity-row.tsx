"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { usePostHog } from "posthog-js/react"
import { CompanyAvatar } from "@/components/company-avatar"
import type { ExperienceLevel, OpportunitySource, RustSignal } from "@prisma/client"

const SIGNAL: Record<RustSignal, { stripe: string; label: string; color: string }> = {
  CORE:   { stripe: "var(--d-rust)",       label: "🦀 Core", color: "var(--d-rust)" },
  HIGH:   { stripe: "oklch(0.78 0.13 65)", label: "High",    color: "oklch(0.78 0.13 65)" },
  MEDIUM: { stripe: "oklch(0.65 0.09 90)", label: "Med",     color: "oklch(0.65 0.09 90)" },
  LOW:    { stripe: "var(--line-soft)",    label: "Low",     color: "var(--fg-4)" },
}

const LEVEL_SHORT: Record<ExperienceLevel, string> = {
  INTERN: "Intern",
  JUNIOR: "Jr",
  MID:    "Mid",
  SENIOR: "Sr",
  STAFF:  "Staff",
}

function compactAge(postedAt: Date | null | undefined): string {
  if (!postedAt) return ""
  const days = Math.floor((Date.now() - new Date(postedAt).getTime()) / 86_400_000)
  if (days < 1) return "today"
  if (days < 7) return `${days}d`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks}w`
  return `${Math.floor(days / 30)}mo`
}

interface OpportunityRowProps {
  id: string
  position: number
  source: OpportunitySource
  title: string
  companyName: string
  companySlug?: string | null
  companyLogoUrl?: string | null
  sourceUrl: string
  rustSignal: RustSignal
  experienceLevel?: ExperienceLevel | null
  isRemote: boolean
  isJuniorFriendly: boolean
  hasOssPath: boolean
  salary?: string | null
  location?: string | null
  postedAt?: Date | null
}

export function OpportunityRow({
  id,
  position,
  source,
  title,
  companyName,
  companySlug,
  companyLogoUrl,
  sourceUrl,
  rustSignal,
  experienceLevel,
  isRemote,
  isJuniorFriendly,
  hasOssPath,
  location,
  postedAt,
}: OpportunityRowProps) {
  const router = useRouter()
  const ph = usePostHog()
  const [hovered, setHovered] = useState(false)

  const sig = SIGNAL[rustSignal]
  const ageStr = compactAge(postedAt)
  const levelShort = experienceLevel ? LEVEL_SHORT[experienceLevel] : null
  const isStale = postedAt
    ? Math.floor((Date.now() - new Date(postedAt).getTime()) / 86_400_000) > 60
    : false

  function handleRowClick(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest("button,a")) return
    if (companySlug) {
      ph?.capture("opportunity_company_opened", {
        opportunity_id: id,
        company_name: companyName,
        company_slug: companySlug,
        rust_signal: rustSignal,
        position,
      })
      router.push(`/companies/${companySlug}`)
    } else {
      // No linked company — fall back to external link
      ph?.capture("opportunity_apply_clicked", {
        opportunity_id: id,
        company_name: companyName,
        rust_signal: rustSignal,
        source,
        position,
      })
      window.open(sourceUrl, "_blank", "noopener,noreferrer")
    }
  }

  function handleApplyClick(e: React.MouseEvent) {
    e.stopPropagation()
    ph?.capture("opportunity_apply_clicked", {
      opportunity_id: id,
      company_name: companyName,
      rust_signal: rustSignal,
      source,
      position,
    })
  }

  return (
    <div
      className="row-outer"
      onClick={handleRowClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        cursor: companySlug ? "pointer" : "default",
        background: hovered && companySlug ? "var(--bg-2)" : "transparent",
        borderBottom: "1px solid var(--line-soft)",
        transition: "background 100ms",
      }}
    >
      {/* Rust signal stripe */}
      {rustSignal !== "LOW" && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: 0,
            top: 8,
            bottom: 8,
            width: 2,
            borderRadius: "0 2px 2px 0",
            background: sig.stripe,
            opacity: rustSignal === "MEDIUM" ? 0.55 : 0.85,
          }}
        />
      )}

      {/* Desktop row */}
      <div
        className="row-desktop"
        style={{
          gap: 12,
          padding: "0 14px 0 18px",
          height: "var(--row-h, 48px)",
          overflow: "hidden",
        }}
      >
        <div style={{ flexShrink: 0 }}>
          <CompanyAvatar name={companyName} logoUrl={companyLogoUrl ?? null} size={22} />
        </div>

        {/* Title + company */}
        <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
          <div
            style={{
              fontWeight: 600,
              fontSize: 13.5,
              color: "var(--fg-0)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              lineHeight: 1.3,
              letterSpacing: "-0.005em",
            }}
          >
            {title}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              fontFamily: "var(--font-mono)",
              fontSize: 10.5,
              color: "var(--fg-3)",
              lineHeight: 1.3,
            }}
          >
            {/* Company name: Link for keyboard accessibility; mouse users click the row */}
            {companySlug ? (
              <Link
                href={`/companies/${companySlug}`}
                onClick={(e) => e.stopPropagation()}
                style={{ color: "inherit", textDecoration: "none" }}
              >
                {companyName}
              </Link>
            ) : (
              <span>{companyName}</span>
            )}
            {location && (
              <>
                <span style={{ opacity: 0.4 }}>·</span>
                <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {location}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Rust signal */}
        <div
          style={{
            width: 52,
            flexShrink: 0,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: sig.color,
            textAlign: "right",
            whiteSpace: "nowrap",
          }}
        >
          {sig.label}
        </div>

        {/* Experience level */}
        <div
          style={{
            width: 30,
            flexShrink: 0,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--fg-3)",
            textAlign: "right",
          }}
        >
          {levelShort ?? ""}
        </div>

        {/* Indicator dots: remote · junior-friendly · oss */}
        <div
          style={{
            display: "flex",
            gap: 3,
            flexShrink: 0,
            width: 36,
            alignItems: "center",
            justifyContent: "flex-end",
          }}
        >
          {isRemote && <Dot color="var(--d-ok)" title="Remote" />}
          {isJuniorFriendly && <Dot color="oklch(0.75 0.14 225)" title="Junior-friendly" />}
          {hasOssPath && <Dot color="oklch(0.72 0.14 290)" title="OSS path" />}
        </div>

        {/* Age */}
        <div
          style={{
            width: 28,
            flexShrink: 0,
            fontFamily: "var(--font-mono)",
            fontSize: 10.5,
            color: isStale ? "var(--d-warn)" : "var(--fg-4)",
            textAlign: "right",
          }}
          title={isStale ? "Posting may be expired" : undefined}
        >
          {ageStr}
        </div>

        {/* Apply — secondary outbound action */}
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleApplyClick}
          style={{
            display: "inline-flex",
            alignItems: "center",
            height: 22,
            padding: "0 8px",
            borderRadius: 5,
            border: `1px solid ${hovered ? "var(--line)" : "var(--line-soft)"}`,
            background: "transparent",
            color: hovered ? "var(--fg-1)" : "var(--fg-3)",
            fontSize: 11,
            fontFamily: "var(--font-mono)",
            textDecoration: "none",
            whiteSpace: "nowrap",
            flexShrink: 0,
            transition: "border-color 100ms, color 100ms",
            cursor: "pointer",
          }}
          aria-label="Apply for this role (opens external site)"
        >
          Apply ↗
        </a>
      </div>

      {/* Mobile card */}
      <div className="row-mobile" style={{ gap: 8, padding: "10px 14px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <CompanyAvatar name={companyName} logoUrl={companyLogoUrl ?? null} size={32} />
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Title — tapping the card navigates to company if linked */}
            <div
              style={{
                fontWeight: 600,
                fontSize: 14,
                color: "var(--fg-0)",
                letterSpacing: "-0.01em",
                lineHeight: 1.25,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {title}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "2px 5px",
                marginTop: 3,
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--fg-3)",
                lineHeight: 1.5,
              }}
            >
              <span>{companyName}</span>
              {location && (
                <>
                  <span style={{ opacity: 0.4 }}>·</span>
                  <span>{location}</span>
                </>
              )}
              <span style={{ opacity: 0.4 }}>·</span>
              <span style={{ color: sig.color }}>{sig.label}</span>
              {levelShort && (
                <>
                  <span style={{ opacity: 0.4 }}>·</span>
                  <span>{levelShort}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {isRemote && (
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--d-ok)" }}>
                Remote
              </span>
            )}
            {isJuniorFriendly && (
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "oklch(0.75 0.14 225)" }}>
                Jr-friendly
              </span>
            )}
            {hasOssPath && (
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "oklch(0.72 0.14 290)" }}>
                OSS
              </span>
            )}
            {ageStr && (
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: isStale ? "var(--d-warn)" : "var(--fg-4)",
                }}
              >
                {ageStr}
              </span>
            )}
          </div>

          {/* Apply — explicit outbound action on mobile */}
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleApplyClick}
            style={{
              display: "inline-flex",
              alignItems: "center",
              height: 28,
              padding: "0 10px",
              borderRadius: 6,
              border: "1px solid var(--line-soft)",
              background: "var(--bg-2)",
              color: "var(--fg-2)",
              fontSize: 11.5,
              fontFamily: "var(--font-mono)",
              textDecoration: "none",
              whiteSpace: "nowrap",
              flexShrink: 0,
              cursor: "pointer",
            }}
            aria-label="Apply for this role (opens external site)"
          >
            Apply ↗
          </a>
        </div>
      </div>
    </div>
  )
}

function Dot({ color, title }: { color: string; title: string }) {
  return (
    <span
      title={title}
      style={{
        display: "inline-block",
        width: 6,
        height: 6,
        borderRadius: 999,
        background: color,
        flexShrink: 0,
        opacity: 0.75,
      }}
    />
  )
}
