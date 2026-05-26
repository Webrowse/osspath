"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ExternalLink, Bookmark, BookmarkCheck } from "lucide-react"
import { StatusBadge } from "@/components/status-badge"
import { ApplicationDialog } from "@/components/application-dialog"
import { CompanyAvatar } from "@/components/company-avatar"
import type { CompanyListItem, CompanyState } from "@/lib/companies"
import { markCompanyStatus } from "@/actions/company"

const RUST_LABEL: Record<string, string> = {
  PARTIAL: "Some Rust",
  HEAVY: "Heavy Rust",
  CORE: "Rust Core",
}

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

interface CompanyCardProps {
  company: CompanyListItem
  isAuthenticated: boolean
}

export function CompanyCard({ company, isAuthenticated }: CompanyCardProps) {
  const router = useRouter()
  const [localState, setLocalState] = useState(company.userState)
  const [tagsExpanded, setTagsExpanded] = useState(false)
  const [hovered, setHovered] = useState(false)

  const currentStatus = localState?.status ?? null
  const isSaved = currentStatus === "SAVED"
  const stripeColor = currentStatus ? STRIPE_COLOR[currentStatus] : null

  const handleCardClick = (e: React.MouseEvent) => {
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
      setLocalState((s: any) => ({ ...(s ?? ({} as CompanyState)), status: "SAVED" }))
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
    setLocalState((s: any) => ({ ...(s ?? ({} as CompanyState)), status: next }))
    try {
      await markCompanyStatus(company.id, next)
      toast.success(already ? "Moved to saved" : "Marked as applied")
    } catch {
      setLocalState(prev)
      toast.error("Something went wrong")
    }
  }

  const isApplied = currentStatus === "APPLIED"
  const isInPipeline =
    currentStatus !== null &&
    ["OA", "RECRUITER_CALL", "INTERVIEWING", "FINAL_ROUND", "OFFER"].includes(currentStatus)

  const rustLabel = RUST_LABEL[company.rustLevel]
  const VISIBLE_TAGS = 3
  const extraTags = company.tags.length - VISIBLE_TAGS
  const displayedTags = tagsExpanded ? company.tags : company.tags.slice(0, VISIBLE_TAGS)

  return (
    <div
      onClick={handleCardClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative flex flex-col cursor-pointer overflow-hidden"
      style={{
        padding: "var(--dp)",
        gap: "var(--dgap)",
        background: hovered ? "var(--bg-2)" : "var(--bg-1)",
        border: `1px solid ${hovered ? "var(--line)" : "var(--line-soft)"}`,
        borderRadius: 10,
        transform: hovered ? "translateY(-1px)" : "none",
        transition: "transform 140ms, border-color 140ms, background 140ms",
      }}
    >
      {/* Status stripe */}
      {stripeColor && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: 0,
            top: 10,
            bottom: 10,
            width: 2,
            borderRadius: "0 2px 2px 0",
            background: stripeColor,
            opacity: 0.85,
          }}
        />
      )}

      {/* Header: logo + name + save */}
      <div className="flex items-start gap-2.5">
        <CompanyAvatar name={company.name} logoUrl={company.logoUrl} size={38} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap">
            <Link
              href={`/companies/${company.slug}`}
              className="font-semibold leading-snug hover:opacity-80 transition-opacity"
              style={{
                fontSize: "var(--fs-card-name, 15px)",
                color: "var(--fg-0)",
                letterSpacing: "-0.005em",
              }}
              tabIndex={-1}
            >
              {company.name}
            </Link>
            {currentStatus && currentStatus !== "NOT_APPLIED" && (
              <StatusBadge status={currentStatus} />
            )}
          </div>
          {/* Meta row: type · remote · rust */}
          <div
            className="flex items-center gap-1.5 mt-0.5 flex-wrap"
            style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-3)" }}
          >
            {company.companyType && <span>{company.companyType}</span>}
            {company.companyType && (company.remote || rustLabel) && (
              <span style={{ opacity: 0.4 }}>·</span>
            )}
            {company.remote && <span style={{ color: "var(--d-ok)" }}>Remote</span>}
            {company.remote && rustLabel && <span style={{ opacity: 0.4 }}>·</span>}
            {rustLabel && <span style={{ color: "var(--d-rust)" }}>🦀 {rustLabel}</span>}
          </div>
        </div>

        <button
          onClick={handleToggleSave}
          className="flex-shrink-0 p-1 rounded transition-colors mt-0.5"
          style={{
            color: isSaved ? "var(--d-rust)" : "var(--fg-3)",
            opacity: hovered || isSaved ? 1 : 0.35,
            transition: "opacity 120ms, color 120ms",
          }}
          aria-label={isSaved ? "Unsave" : "Save"}
        >
          {isSaved ? (
            <BookmarkCheck className="h-3.5 w-3.5" />
          ) : (
            <Bookmark className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {/* Description */}
      <p
        className="line-clamp-2 leading-relaxed"
        style={{ fontSize: "var(--fs-card-desc, 13px)", color: "var(--fg-1)" }}
      >
        {company.description}
      </p>

      {/* Tags */}
      <div className="flex flex-wrap gap-1">
        {displayedTags.map((tag: any) => (
          <span
            key={tag}
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "2px 7px",
              borderRadius: 5,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              background: "var(--bg-3)",
              color: "var(--fg-2)",
              border: "1px solid var(--line-soft)",
              whiteSpace: "nowrap",
            }}
          >
            {tag}
          </span>
        ))}
        {!tagsExpanded && extraTags > 0 && (
          <button
            onClick={(e: any) => {
              e.stopPropagation()
              setTagsExpanded(true)
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "2px 7px",
              borderRadius: 5,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              background: "var(--bg-3)",
              color: "var(--fg-3)",
              border: "1px solid var(--line-soft)",
            }}
          >
            +{extraTags}
          </button>
        )}
      </div>

      {/* Footer */}
      <div
        className="flex items-center gap-2 pt-2 mt-auto"
        style={{
          borderTop: "1px dashed var(--line-soft)",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--fg-2)",
        }}
      >
        <span className="inline-flex items-center gap-1.5">
          <HiringPulse isHiring={company.isHiring} />
          {company.isHiring ? "Hiring" : "No openings"}
        </span>

        <span style={{ opacity: 0.4 }}>·</span>

        <a
          href={company.careersUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 transition-opacity hover:opacity-70"
          style={{ color: "var(--fg-2)" }}
        >
          Careers <ExternalLink className="h-2.5 w-2.5" />
        </a>

        <div className="flex-1" />

        {isInPipeline ? (
          <ApplicationDialog
            companyId={company.id}
            companyName={company.name}
            userState={localState}
            trigger={
              <button style={actionBtnStyle}>Edit</button>
            }
          />
        ) : (
          <button
            onClick={handleMarkApplied}
            style={{
              ...actionBtnStyle,
              border: `1px solid ${isApplied ? "var(--d-accent-line)" : "var(--line-soft)"}`,
              background: isApplied ? "var(--d-accent-soft)" : "transparent",
              color: isApplied ? "var(--d-accent)" : "var(--fg-1)",
            }}
          >
            {isApplied ? "Applied ✓" : "Apply"}
          </button>
        )}
      </div>
    </div>
  )
}

const actionBtnStyle: React.CSSProperties = {
  padding: "2px 8px",
  borderRadius: 5,
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
    <span
      className="relative inline-flex flex-shrink-0"
      style={{ width: 8, height: 8 }}
    >
      <span
        className="absolute inset-0 rounded-full"
        style={{ background: color, opacity: 0.9 }}
      />
      {isHiring && (
        <span
          className="absolute rounded-full"
          style={{
            inset: -3,
            border: `1.5px solid ${color}`,
            opacity: 0.5,
            animation: "d-pulse 2s ease-out infinite",
          }}
        />
      )}
    </span>
  )
}
