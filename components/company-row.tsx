"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ExternalLink, Bookmark, BookmarkCheck } from "lucide-react"
import { CompanyAvatar } from "@/components/company-avatar"
import { StatusBadge } from "@/components/status-badge"
import { ApplicationDialog } from "@/components/application-dialog"
import type { CompanyListItem, CompanyState } from "@/lib/companies"
import { markCompanyStatus } from "@/actions/company"
import { formatDistanceToNowStrict } from "date-fns"

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

interface CompanyRowProps {
  company: CompanyListItem
  isAuthenticated: boolean
}

export function CompanyRow({ company, isAuthenticated }: CompanyRowProps) {
  const router = useRouter()
  const [localState, setLocalState] = useState(company.userState)
  const [hovered, setHovered] = useState(false)

  const currentStatus = localState?.status ?? null
  const isSaved = currentStatus === "SAVED"
  const stripeColor = currentStatus ? STRIPE_COLOR[currentStatus] : null
  const isInPipeline =
    currentStatus !== null &&
    ["OA", "RECRUITER_CALL", "INTERVIEWING", "FINAL_ROUND", "OFFER"].includes(currentStatus)
  const isApplied = currentStatus === "APPLIED"

  const updatedAt = localState?.updatedAt ?? company.createdAt
  const timeAgo = formatDistanceToNowStrict(new Date(updatedAt), { addSuffix: false })
    .replace(" seconds", "s")
    .replace(" second", "s")
    .replace(" minutes", "m")
    .replace(" minute", "m")
    .replace(" hours", "h")
    .replace(" hour", "h")
    .replace(" days", "d")
    .replace(" day", "d")
    .replace(" months", "mo")
    .replace(" month", "mo")
    .replace(" years", "y")
    .replace(" year", "y")

  const handleRowClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button,a")) return
    router.push(`/companies/${company.slug}`)
  }

  const handleToggleSave = async () => {
    if (!isAuthenticated) {
      toast.error("Sign in to save companies")
      return
    }
    const prev = localState
    if (isSaved) {
      setLocalState(null)
    } else {
      setLocalState((s) => ({ ...(s ?? ({} as CompanyState)), status: "SAVED" }))
    }
    try {
      if (isSaved) {
        await markCompanyStatus(company.id, "NOT_APPLIED")
        toast.success("Removed from saved")
      } else {
        await markCompanyStatus(company.id, "SAVED")
        toast.success("Saved")
      }
    } catch {
      setLocalState(prev)
      toast.error("Something went wrong")
    }
  }

  const handleMarkApplied = async () => {
    if (!isAuthenticated) {
      toast.error("Sign in to track applications")
      return
    }
    const prev = localState
    const already = currentStatus === "APPLIED"
    const next = already ? ("SAVED" as const) : ("APPLIED" as const)
    setLocalState((s) => ({ ...(s ?? ({} as CompanyState)), status: next }))
    try {
      await markCompanyStatus(company.id, next)
      toast.success(already ? "Moved to saved" : "Marked as applied")
    } catch {
      setLocalState(prev)
      toast.error("Something went wrong")
    }
  }

  const visibleTags = company.tags.slice(0, 2)

  return (
    <div
      onClick={handleRowClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "0 14px 0 18px",
        height: "var(--row-h, 48px)",
        cursor: "pointer",
        background: hovered ? "var(--bg-2)" : "transparent",
        borderBottom: "1px solid var(--line-soft)",
        transition: "background 100ms",
        overflow: "hidden",
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

      {/* Avatar */}
      <div style={{ flexShrink: 0 }}>
        <CompanyAvatar name={company.name} logoUrl={company.logoUrl} size={28} />
      </div>

      {/* Name + type */}
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

      {/* Description — shown as secondary metadata (CP-4) */}
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

      {/* Tags */}
      <div
        style={{
          display: "flex",
          gap: 4,
          flexShrink: 0,
          width: 160,
          overflow: "hidden",
        }}
      >
        {visibleTags.map((tag) => (
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

      {/* Hiring state */}
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
      >
        <HiringPulse isHiring={company.isHiring} />
        {company.isHiring ? "Hiring" : "No openings"}
      </div>

      {/* Status badge / actions */}
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

      {/* Time + careers + save */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        <a
          href={company.careersUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
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
