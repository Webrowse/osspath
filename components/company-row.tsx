"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { toast } from "sonner"
import { usePostHog } from "posthog-js/react"
import { ExternalLink, Bookmark, BookmarkCheck } from "lucide-react"
import { CompanyAvatar } from "@/components/company-avatar"
import { StatusBadge } from "@/components/status-badge"
import { ApplicationDialog } from "@/components/application-dialog"
import type { CompanyListItem, CompanyState } from "@/lib/companies"
import { markCompanyStatus } from "@/actions/company"
import { formatDistanceToNowStrict } from "date-fns"
import { panelStore } from "@/lib/panel-store"

const STRIPE_COLOR: Record<string, string> = {
  SAVED: "var(--fg-2)",
  APPLIED: "var(--d-accent)",
  OA: "var(--d-accent)",
  RECRUITER_CALL: "var(--d-accent)",
  INTERVIEWING: "var(--d-rust)",
  FINAL_ROUND: "var(--d-rust)",
  OFFER: "var(--d-ok)",
  REJECTED: "var(--d-danger)",
  GHOSTED: "var(--d-danger)",
  NOT_INTERESTED: "var(--fg-3)",
  NO_OPENINGS: "var(--fg-3)",
  HIRING_FREEZE: "var(--fg-3)",
}

const RUST_LABEL: Record<string, string> = {
  PARTIAL: "Some Rust",
  HEAVY: "Heavy Rust",
  CORE: "Rust Core",
}

interface CompanyRowProps {
  company: CompanyListItem
  isAuthenticated: boolean
}

export function CompanyRow({ company, isAuthenticated }: CompanyRowProps) {
  const router = useRouter()
  const ph = usePostHog()
  const [localState, setLocalState] = useState(company.userState)
  const [hovered, setHovered] = useState(false)

  const currentStatus = localState?.status ?? null
  const isSaved = currentStatus === "SAVED"
  const stripeColor = currentStatus ? STRIPE_COLOR[currentStatus] : null
  const isInPipeline =
    currentStatus !== null &&
    ["OA", "RECRUITER_CALL", "INTERVIEWING", "FINAL_ROUND", "OFFER"].includes(currentStatus)
  const isApplied = currentStatus === "APPLIED"
  const rustLabel = RUST_LABEL[company.rustLevel]

  const updatedAt = localState?.updatedAt ?? company.createdAt
  const timeAgo = formatDistanceToNowStrict(new Date(updatedAt), { addSuffix: false })
    .replace(" seconds", "s").replace(" second", "s")
    .replace(" minutes", "m").replace(" minute", "m")
    .replace(" hours", "h").replace(" hour", "h")
    .replace(" days", "d").replace(" day", "d")
    .replace(" months", "mo").replace(" month", "mo")
    .replace(" years", "y").replace(" year", "y")

  const handleRowClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button,a")) return
    // Populate store before navigation so loading.tsx can render company
    // name and logo immediately without waiting for the server response.
    panelStore.name = company.name
    panelStore.logoUrl = company.logoUrl ?? null
    panelStore.status = localState?.status ?? null
    router.push(`/companies/${company.slug}`)
  }

  const handleToggleSave = async (e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (!isAuthenticated) { toast.error("Sign in to save companies"); return }
    const prev = localState
    if (isSaved) {
      setLocalState(null)
    } else {
      setLocalState((s) => ({ ...(s ?? ({} as CompanyState)), status: "SAVED" }))
    }
    try {
      if (isSaved) {
        await markCompanyStatus(company.id, "NOT_APPLIED")
        ph?.capture("company_unsaved", { company_id: company.id, company_name: company.name })
        toast.success("Removed from saved")
      } else {
        await markCompanyStatus(company.id, "SAVED")
        ph?.capture("company_saved", { company_id: company.id, company_name: company.name })
        toast.success("Saved")
      }
    } catch {
      setLocalState(prev)
      toast.error("Something went wrong")
    }
  }

  const handleMarkApplied = async (e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (!isAuthenticated) { toast.error("Sign in to track applications"); return }
    const prev = localState
    const already = currentStatus === "APPLIED"
    const next = already ? ("SAVED" as const) : ("APPLIED" as const)
    setLocalState((s) => ({ ...(s ?? ({} as CompanyState)), status: next }))
    try {
      await markCompanyStatus(company.id, next)
      if (!already) {
        ph?.capture("company_applied_quick", { company_id: company.id, company_name: company.name })
      }
      toast.success(already ? "Moved to saved" : "Marked as applied")
    } catch {
      setLocalState(prev)
      toast.error("Something went wrong")
    }
  }

  const visibleTagsDesktop = company.tags.slice(0, 2)
  const visibleTagsMobile = company.tags.slice(0, 3)

  return (
    <div
      className="row-outer"
      onClick={handleRowClick}
      onMouseEnter={() => { setHovered(true); router.prefetch(`/companies/${company.slug}`) }}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        cursor: "pointer",
        background: hovered ? "var(--bg-2)" : "transparent",
        borderBottom: "1px solid var(--line-soft)",
        transition: "background 100ms",
      }}
    >
      {/* Status stripe */}
      {stripeColor && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: 0,
            top: 8,
            bottom: 8,
            width: 2,
            borderRadius: "0 2px 2px 0",
            background: stripeColor,
            opacity: 0.85,
          }}
        />
      )}

      {/* ── Desktop row ── */}
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
          <CompanyAvatar name={company.name} logoUrl={company.logoUrl} size={26} />
        </div>

        <div style={{ width: 170, flexShrink: 0, minWidth: 0, overflow: "hidden" }}>
          <Link
            href={`/companies/${company.slug}`}
            onClick={(e) => e.stopPropagation()}
            style={{
              display: "block",
              fontWeight: 600,
              fontSize: 13.5,
              color: "var(--fg-0)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              lineHeight: 1.3,
              letterSpacing: "-0.005em",
            }}
            tabIndex={-1}
          >
            {company.name}
          </Link>
          {company.companyType && (
            <span
              style={{
                display: "block",
                fontFamily: "var(--font-mono)",
                fontSize: 10.5,
                color: "var(--fg-3)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                lineHeight: 1.3,
              }}
            >
              {company.companyType}
            </span>
          )}
        </div>

        <div
          style={{
            flex: 1,
            minWidth: 0,
            fontFamily: "var(--font-mono)",
            fontSize: 11.5,
            color: "var(--fg-3)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {company.description}
        </div>

        <div style={{ display: "flex", gap: 4, flexShrink: 0, width: 160, overflow: "hidden" }}>
          {visibleTagsDesktop.map((tag) => (
            <span
              key={tag}
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "1px 6px",
                borderRadius: 4,
                fontFamily: "var(--font-mono)",
                fontSize: 10.5,
                background: "var(--bg-3)",
                color: "var(--fg-2)",
                border: "1px solid var(--line-soft)",
                whiteSpace: "nowrap",
              }}
            >
              {tag.toLowerCase()}
            </span>
          ))}
        </div>

        <div
          style={{
            width: 88,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            gap: 5,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: company.isHiring ? "var(--fg-2)" : "var(--fg-3)",
          }}
          title={company.lastHiringCheckAt ? `Verified ${format(new Date(company.lastHiringCheckAt), "d MMM yyyy")}` : undefined}
        >
          <HiringPulse isHiring={company.isHiring} />
          {company.isHiring ? "Hiring" : "No openings"}
        </div>

        <div style={{ width: 110, flexShrink: 0, display: "flex", alignItems: "center", gap: 6 }}>
          {currentStatus && currentStatus !== "NOT_APPLIED" ? (
            isInPipeline ? (
              <ApplicationDialog
                companyId={company.id}
                companyName={company.name}
                userState={localState}
                trigger={<button style={actionBtnStyle}>Edit</button>}
              />
            ) : (
              <StatusBadge status={currentStatus} />
            )
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); handleMarkApplied() }}
              style={{
                ...actionBtnStyle,
                opacity: hovered || isApplied ? 1 : 0,
                transition: "opacity 100ms",
                border: `1px solid ${isApplied ? "var(--d-accent-line)" : "var(--line-soft)"}`,
                background: isApplied ? "var(--d-accent-soft)" : "transparent",
                color: isApplied ? "var(--d-accent)" : "var(--fg-1)",
              }}
            >
              {isApplied ? "Applied ✓" : "Apply"}
            </button>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <a
            href={company.careersUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              e.stopPropagation()
              ph?.capture("careers_page_clicked", { company_id: company.id, company_name: company.name, source: "list_row" })
            }}
            style={{
              display: "flex",
              alignItems: "center",
              color: "var(--fg-3)",
              opacity: hovered ? 1 : 0,
              transition: "opacity 100ms",
            }}
            aria-label="Careers page"
          >
            <ExternalLink size={12} />
          </a>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10.5,
              color: "var(--fg-3)",
              minWidth: 28,
              textAlign: "right",
            }}
          >
            {timeAgo}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); handleToggleSave() }}
            style={{
              display: "flex",
              alignItems: "center",
              padding: 3,
              borderRadius: 4,
              color: isSaved ? "var(--d-rust)" : "var(--fg-3)",
              background: "none",
              border: "none",
              cursor: "pointer",
              opacity: hovered || isSaved ? 1 : 0.3,
              transition: "opacity 120ms, color 120ms",
            }}
            aria-label={isSaved ? "Unsave" : "Save"}
          >
            {isSaved ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
          </button>
        </div>
      </div>

      {/* ── Mobile card ── */}
      <div className="row-mobile" style={{ gap: 10 }}>
        {/* Header: avatar + name + meta + bookmark */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <CompanyAvatar name={company.name} logoUrl={company.logoUrl} size={36} />

          <div style={{ flex: 1, minWidth: 0 }}>
            <Link
              href={`/companies/${company.slug}`}
              onClick={(e) => e.stopPropagation()}
              style={{
                display: "block",
                fontWeight: 600,
                fontSize: 15,
                color: "var(--fg-0)",
                letterSpacing: "-0.01em",
                lineHeight: 1.25,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {company.name}
            </Link>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: "2px 6px",
                marginTop: 3,
                fontFamily: "var(--font-mono)",
                fontSize: 11.5,
                color: "var(--fg-3)",
                lineHeight: 1.5,
              }}
            >
              {company.companyType && <span>{company.companyType}</span>}
              {company.remote && (
                <>
                  {company.companyType && <span style={{ opacity: 0.4 }}>·</span>}
                  <span style={{ color: "var(--d-ok)" }}>Remote</span>
                </>
              )}
              {rustLabel && (
                <>
                  <span style={{ opacity: 0.4 }}>·</span>
                  <span style={{ color: "var(--d-rust)" }}>🦀 {rustLabel}</span>
                </>
              )}
            </div>
          </div>

          {/* Bookmark — always visible on mobile */}
          <button
            onClick={(e) => handleToggleSave(e)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 36,
              height: 36,
              borderRadius: 8,
              color: isSaved ? "var(--d-rust)" : "var(--fg-3)",
              background: isSaved ? "var(--d-rust-soft)" : "var(--bg-2)",
              border: `1px solid ${isSaved ? "oklch(0.72 0.16 45 / 0.25)" : "var(--line-soft)"}`,
              cursor: "pointer",
              flexShrink: 0,
              transition: "color 120ms, background 120ms",
            }}
            aria-label={isSaved ? "Unsave" : "Save"}
          >
            {isSaved ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
          </button>
        </div>

        {/* Tags */}
        {visibleTagsMobile.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {visibleTagsMobile.map((tag) => (
              <span
                key={tag}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "3px 8px",
                  borderRadius: 5,
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  background: "var(--bg-3)",
                  color: "var(--fg-2)",
                  border: "1px solid var(--line-soft)",
                }}
              >
                {tag.toLowerCase()}
              </span>
            ))}
            {company.tags.length > 3 && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "3px 8px",
                  borderRadius: 5,
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  background: "transparent",
                  color: "var(--fg-3)",
                  border: "1px solid var(--line-soft)",
                }}
              >
                +{company.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Footer: hiring state + actions */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: company.isHiring ? "var(--fg-1)" : "var(--fg-3)",
            }}
          >
            <HiringPulse isHiring={company.isHiring} />
            <span>{company.isHiring ? "Hiring" : "No openings"}</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <a
              href={company.careersUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                e.stopPropagation()
                ph?.capture("careers_page_clicked", { company_id: company.id, company_name: company.name, source: "list_row" })
              }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 32,
                height: 32,
                borderRadius: 7,
                background: "var(--bg-2)",
                border: "1px solid var(--line-soft)",
                color: "var(--fg-3)",
                textDecoration: "none",
              }}
              aria-label="Careers page"
            >
              <ExternalLink size={13} />
            </a>

            {isInPipeline ? (
              <ApplicationDialog
                companyId={company.id}
                companyName={company.name}
                userState={localState}
                trigger={<button style={mobileActionBtnStyle}>Edit tracking</button>}
              />
            ) : (
              <button
                onClick={(e) => handleMarkApplied(e)}
                style={{
                  ...mobileActionBtnStyle,
                  border: `1px solid ${isApplied ? "var(--d-accent-line)" : "var(--line-soft)"}`,
                  background: isApplied ? "var(--d-accent-soft)" : "var(--bg-2)",
                  color: isApplied ? "var(--d-accent)" : "var(--fg-1)",
                  fontWeight: isApplied ? 500 : 400,
                }}
              >
                {isApplied ? "Applied ✓" : "Apply"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const actionBtnStyle: React.CSSProperties = {
  padding: "2px 8px",
  borderRadius: 4,
  fontSize: 11,
  fontFamily: "var(--font-mono)",
  border: "1px solid var(--line-soft)",
  background: "transparent",
  color: "var(--fg-1)",
  cursor: "pointer",
}

const mobileActionBtnStyle: React.CSSProperties = {
  height: 32,
  padding: "0 12px",
  borderRadius: 8,
  fontSize: 13,
  fontFamily: "var(--font-sans)",
  border: "1px solid var(--line-soft)",
  background: "var(--bg-2)",
  color: "var(--fg-1)",
  cursor: "pointer",
  whiteSpace: "nowrap",
}

function HiringPulse({ isHiring }: { isHiring: boolean }) {
  const color = isHiring ? "var(--d-ok)" : "var(--fg-3)"
  return (
    <span style={{ position: "relative", display: "inline-flex", width: 7, height: 7, flexShrink: 0 }}>
      <span style={{ position: "absolute", inset: 0, borderRadius: 999, background: color, opacity: 0.9 }} />
      {isHiring && (
        <span
          style={{
            position: "absolute",
            inset: -3,
            borderRadius: 999,
            border: `1.5px solid ${color}`,
            opacity: 0.5,
            animation: "d-pulse 2s ease-out infinite",
          }}
        />
      )}
    </span>
  )
}
