"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { X, Bookmark, BookmarkCheck } from "lucide-react"
import { toast } from "sonner"
import { usePostHog } from "posthog-js/react"
import { CompanyAvatar } from "@/components/company-avatar"
import { ApplicationDialog } from "@/components/application-dialog"
import { markCompanyStatus } from "@/actions/company"
import type { CompanyListItem, CompanyState } from "@/lib/companies"
import { STATUS_LABELS, RUST_LEVEL_LABELS } from "@/types"
import type { ExperienceLevel, RustSignal } from "@prisma/client"

// ── Types ─────────────────────────────────────────────────────────────────────

type PeekCompany = Omit<CompanyListItem, "createdAt"> & {
  userState: CompanyState | null
}

type OpenRole = {
  id: string
  title: string
  sourceUrl: string
  experienceLevel: ExperienceLevel | null
  rustSignal: RustSignal
  isRemote: boolean
  salary: string | null
  postedAt: Date | null
  isJuniorFriendly: boolean
}

interface CompanyPeekPanelProps {
  company: PeekCompany
  openRoles: OpenRole[]
  isAuthenticated: boolean
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ACTIVE_PIPELINE = new Set([
  "APPLIED", "OA", "RECRUITER_CALL", "INTERVIEWING", "FINAL_ROUND", "OFFER",
])

const PIPELINE_STAGES = [
  { key: "SAVED",          short: "Saved"    },
  { key: "APPLIED",        short: "Applied"  },
  { key: "OA",             short: "OA"       },
  { key: "RECRUITER_CALL", short: "Recruiter"},
  { key: "INTERVIEWING",   short: "Interview"},
  { key: "FINAL_ROUND",    short: "Final"    },
  { key: "OFFER",          short: "Offer"    },
]

const STATUS_STYLE: Record<string, { color: string; bg: string; border: string }> = {
  SAVED:          { color: "oklch(0.82 0.13 82)",  bg: "oklch(0.82 0.13 82 / 0.13)",  border: "oklch(0.82 0.13 82 / 0.35)"  },
  APPLIED:        { color: "oklch(0.72 0.14 230)", bg: "oklch(0.72 0.14 230 / 0.12)", border: "oklch(0.72 0.14 230 / 0.35)" },
  OA:             { color: "oklch(0.72 0.16 290)", bg: "oklch(0.72 0.16 290 / 0.12)", border: "oklch(0.72 0.16 290 / 0.35)" },
  RECRUITER_CALL: { color: "oklch(0.78 0.14 200)", bg: "oklch(0.78 0.14 200 / 0.12)", border: "oklch(0.78 0.14 200 / 0.35)" },
  INTERVIEWING:   { color: "oklch(0.82 0.13 82)",  bg: "oklch(0.82 0.13 82 / 0.13)",  border: "oklch(0.82 0.13 82 / 0.35)"  },
  FINAL_ROUND:    { color: "oklch(0.78 0.15 55)",  bg: "oklch(0.78 0.15 55 / 0.13)",  border: "oklch(0.78 0.15 55 / 0.35)"  },
  OFFER:          { color: "var(--d-ok)",           bg: "color-mix(in oklch, var(--d-ok), transparent 86%)",    border: "color-mix(in oklch, var(--d-ok), transparent 58%)"    },
  REJECTED:       { color: "var(--d-danger)",       bg: "color-mix(in oklch, var(--d-danger), transparent 90%)", border: "color-mix(in oklch, var(--d-danger), transparent 65%)" },
  GHOSTED:        { color: "var(--fg-3)",           bg: "var(--bg-3)",                border: "var(--line)"                  },
  NO_OPENINGS:    { color: "var(--fg-3)",           bg: "var(--bg-3)",                border: "var(--line)"                  },
  HIRING_FREEZE:  { color: "var(--fg-3)",           bg: "var(--bg-3)",                border: "var(--line)"                  },
  NOT_INTERESTED: { color: "var(--fg-4)",           bg: "transparent",               border: "var(--line-soft)"             },
  NOT_APPLIED:    { color: "var(--fg-4)",           bg: "transparent",               border: "var(--line-soft)"             },
}

const SIGNAL_COLOR: Record<RustSignal, string> = {
  CORE:   "var(--d-rust)",
  HIGH:   "oklch(0.78 0.13 65)",
  MEDIUM: "oklch(0.65 0.09 90)",
  LOW:    "var(--fg-4)",
}
const SIGNAL_LABEL: Record<RustSignal, string> = {
  CORE: "🦀 Core", HIGH: "High", MEDIUM: "Med", LOW: "Low",
}
const LEVEL_SHORT: Record<ExperienceLevel, string> = {
  INTERN: "Intern", JUNIOR: "Jr", MID: "Mid", SENIOR: "Sr", STAFF: "Staff",
}

// ── Utility functions ─────────────────────────────────────────────────────────

function fmtDate(d: Date | string | null, year = false): string {
  if (!d) return ""
  return new Date(d).toLocaleDateString("en-US", {
    month: "short", day: "numeric", ...(year ? { year: "numeric" } : {}),
  })
}

function daysDiff(from: Date | string): number {
  return Math.round((Date.now() - new Date(from).getTime()) / 86400000)
}

type UrgencyLevel = "error" | "warn" | "ok" | "info"
type Urgency = { level: UrgencyLevel; message: string }

function getUrgency(state: CompanyState | null): Urgency | null {
  if (!state) return null
  const now = Date.now()

  if (state.followUpAt && new Date(state.followUpAt).getTime() < now) {
    const d = Math.round((now - new Date(state.followUpAt).getTime()) / 86400000)
    return { level: "error", message: `Follow-up overdue ${d} day${d === 1 ? "" : "s"} — reach out or update status` }
  }
  if (state.status === "OFFER") {
    return { level: "ok", message: "Offer received — compare total comp, equity, and team fit" }
  }
  if (state.status === "FINAL_ROUND") {
    return { level: "warn", message: "Final round — prepare negotiation range and decision criteria" }
  }
  if (state.status === "APPLIED" && state.appliedAt && !state.followUpAt) {
    const d = Math.round((now - new Date(state.appliedAt).getTime()) / 86400000)
    if (d >= 14) return { level: "info", message: `Applied ${d} days ago — set a follow-up date to stay on track` }
  }
  return null
}

function getNextAction(status: string | null, appliedAt: Date | null, followUpAt: Date | null): string | null {
  if (!status || status === "NOT_APPLIED") return null
  switch (status) {
    case "SAVED":
      return "Open roles above are your entry point — apply directly or check the careers page."
    case "APPLIED": {
      if (appliedAt && !followUpAt) {
        const d = daysDiff(appliedAt)
        if (d >= 14) return `${d} days since applying with no follow-up set — a brief check-in is appropriate.`
      }
      if (followUpAt && new Date(followUpAt).getTime() > Date.now()) {
        const d = Math.round((new Date(followUpAt).getTime() - Date.now()) / 86400000)
        return `Follow-up planned in ${d} day${d === 1 ? "" : "s"} — if no response, a brief email is appropriate.`
      }
      return "Application submitted — monitor for recruiter contact."
    }
    case "OA":         return "Complete the online assessment promptly — delays signal low interest."
    case "RECRUITER_CALL": return "Prep your intro, questions about the team, and your Rust background."
    case "INTERVIEWING":   return "Document each round. Prepare systems design and async Rust patterns."
    case "FINAL_ROUND":    return "Prepare negotiation range and your decision criteria before the offer."
    case "OFFER":          return "Evaluate total comp, equity timeline, team quality, and growth potential."
    case "REJECTED":       return "Note what you'd do differently. Rust teams hire in cycles — revisit in 6 months."
    case "GHOSTED":        return "One follow-up email is appropriate. After that, redirect energy to open roles."
    case "NO_OPENINGS":    return "Check back monthly — Rust teams grow fast. Watch their blog and job page."
    case "HIRING_FREEZE":  return "Freezes lift. Keep this tracked and revisit when they post again."
    default:               return null
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CompanyPeekPanel({ company, openRoles, isAuthenticated }: CompanyPeekPanelProps) {
  const router = useRouter()
  const ph = usePostHog()
  const [localState, setLocalState] = useState(company.userState)

  const close = useCallback(() => router.back(), [router])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") close() }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [close])

  useEffect(() => {
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = "" }
  }, [])

  const currentStatus = localState?.status ?? null
  const isSaved = currentStatus === "SAVED"
  const isInPipeline = currentStatus !== null && ACTIVE_PIPELINE.has(currentStatus)
  const isTracked = currentStatus !== null && currentStatus !== "NOT_APPLIED"
  const rustLabel = RUST_LEVEL_LABELS[company.rustLevel as keyof typeof RUST_LEVEL_LABELS]
  const statusStyle = currentStatus ? (STATUS_STYLE[currentStatus] ?? STATUS_STYLE.NOT_APPLIED) : null
  const urgency = getUrgency(localState)
  const nextAction = getNextAction(currentStatus, localState?.appliedAt ?? null, localState?.followUpAt ?? null)
  const stageIdx = PIPELINE_STAGES.findIndex(s => s.key === currentStatus)

  const URGENCY_COLORS: Record<UrgencyLevel, { bg: string; border: string; color: string; dot: string }> = {
    error: { bg: "color-mix(in oklch, var(--d-danger), transparent 90%)", border: "color-mix(in oklch, var(--d-danger), transparent 65%)", color: "var(--d-danger)", dot: "var(--d-danger)" },
    warn:  { bg: "oklch(0.78 0.15 55 / 0.12)", border: "oklch(0.78 0.15 55 / 0.35)", color: "oklch(0.78 0.15 55)", dot: "oklch(0.78 0.15 55)" },
    ok:    { bg: "color-mix(in oklch, var(--d-ok), transparent 87%)", border: "color-mix(in oklch, var(--d-ok), transparent 55%)", color: "var(--d-ok)", dot: "var(--d-ok)" },
    info:  { bg: "var(--d-accent-soft)", border: "var(--d-accent-line)", color: "var(--d-accent)", dot: "var(--d-accent)" },
  }

  async function handleToggleSave() {
    if (!isAuthenticated) { toast.error("Sign in to save companies"); return }
    const prev = localState
    setLocalState(isSaved ? null : (s) => ({ ...(s ?? ({} as CompanyState)), status: "SAVED" }))
    try {
      if (isSaved) {
        await markCompanyStatus(company.id, "NOT_APPLIED")
        ph?.capture("company_unsaved", { company_id: company.id, source: "peek_panel" })
        toast.success("Removed from saved")
      } else {
        await markCompanyStatus(company.id, "SAVED")
        ph?.capture("company_saved", { company_id: company.id, source: "peek_panel" })
        toast.success("Saved")
      }
    } catch {
      setLocalState(prev)
      toast.error("Something went wrong")
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={close}
        aria-hidden
        style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: "oklch(0 0 0 / 0.28)",
          backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)",
        }}
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${company.name} details`}
        style={{
          position: "fixed", right: 0, top: 0, bottom: 0,
          width: "min(480px, 100vw)", zIndex: 201,
          background: "var(--bg-0)",
          borderLeft: "1px solid var(--line-soft)",
          display: "flex", flexDirection: "column", overflow: "hidden",
          boxShadow: "-16px 0 48px oklch(0 0 0 / 0.22)",
        }}
      >

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div style={{
          display: "flex", alignItems: "center", gap: 7,
          padding: "0 12px", height: 36,
          borderBottom: "1px solid var(--line-soft)",
          flexShrink: 0, background: "var(--bg-1)",
        }}>
          <button
            onClick={close}
            aria-label="Close panel"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 22, height: 22, borderRadius: 5,
              border: "1px solid var(--line-soft)", background: "transparent",
              color: "var(--fg-3)", cursor: "pointer", flexShrink: 0,
            }}
          >
            <X size={11} />
          </button>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-4)", userSelect: "none" }}>Esc</span>
          <div style={{ flex: 1 }} />
          <Link
            href={`/companies/${company.slug}`}
            style={{
              fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--fg-3)",
              textDecoration: "none", padding: "2px 7px", borderRadius: 4,
              border: "1px solid var(--line-soft)", background: "transparent",
            }}
          >
            Full page →
          </Link>
        </div>

        {/* ── Scrollable body ─────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: "auto" }}>

          {/* ── Urgency banner ─────────────────────────────────────────────── */}
          {urgency && (() => {
            const c = URGENCY_COLORS[urgency.level]
            return (
              <div style={{
                padding: "7px 14px",
                background: c.bg,
                borderBottom: `1px solid ${c.border}`,
                display: "flex", alignItems: "flex-start", gap: 7,
              }}>
                <div style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: c.dot, flexShrink: 0, marginTop: 4,
                }} />
                <p style={{ fontSize: 11.5, color: c.color, margin: 0, lineHeight: 1.45 }}>
                  {urgency.message}
                </p>
              </div>
            )
          })()}

          {/* ── Identity ───────────────────────────────────────────────────── */}
          <div style={{ padding: "10px 14px 9px", borderBottom: "1px solid var(--line-soft)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 4 }}>
              <CompanyAvatar name={company.name} logoUrl={company.logoUrl} size={24} />
              <span style={{
                fontSize: 13.5, fontWeight: 600, color: "var(--fg-0)",
                letterSpacing: "-0.015em", flex: 1, minWidth: 0,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {company.name}
              </span>
              {currentStatus && statusStyle && (
                <span style={{
                  fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 500,
                  color: statusStyle.color, background: statusStyle.bg,
                  border: `1px solid ${statusStyle.border}`,
                  padding: "1px 7px", borderRadius: 4, whiteSpace: "nowrap", flexShrink: 0,
                }}>
                  {STATUS_LABELS[currentStatus as keyof typeof STATUS_LABELS] ?? currentStatus}
                </span>
              )}
            </div>
            {/* Compact context line */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
              {company.companyType && <Pill>{company.companyType}</Pill>}
              {company.rustLevel !== "NONE" && rustLabel && <Pill rust>🦀 {rustLabel}</Pill>}
              {company.remote && <Pill>Remote</Pill>}
              {company.isHiring ? <Pill ok>Hiring</Pill> : <Pill muted>Not hiring</Pill>}
            </div>
          </div>

          {/* ── Open roles ─────────────────────────────────────────────────── */}
          {openRoles.length > 0 && (
            <div style={{ borderBottom: "1px solid var(--line-soft)" }}>
              <div style={{
                padding: "7px 14px 5px",
                display: "flex", alignItems: "center", gap: 6,
              }}>
                <span style={{
                  fontFamily: "var(--font-mono)", fontSize: 9.5, fontWeight: 600,
                  color: "var(--fg-4)", letterSpacing: "0.07em", textTransform: "uppercase",
                }}>
                  Open Roles
                </span>
                <span style={{
                  fontFamily: "var(--font-mono)", fontSize: 9.5,
                  color: "var(--d-ok)",
                  background: "color-mix(in oklch, var(--d-ok), transparent 87%)",
                  border: "1px solid color-mix(in oklch, var(--d-ok), transparent 60%)",
                  padding: "0 5px", borderRadius: 3,
                }}>
                  {openRoles.length} active
                </span>
              </div>

              {openRoles.map((role, i) => (
                <div
                  key={role.id}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "6px 14px",
                    borderTop: i === 0 ? "1px solid var(--line-soft)" : "1px solid color-mix(in oklch, var(--line-soft), transparent 50%)",
                    background: "var(--bg-0)",
                  }}
                >
                  {/* Rust signal stripe */}
                  <div style={{
                    width: 2, alignSelf: "stretch", borderRadius: 1,
                    background: SIGNAL_COLOR[role.rustSignal],
                    flexShrink: 0,
                    opacity: role.rustSignal === "LOW" ? 0.3 : 0.8,
                  }} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 12, fontWeight: 500, color: "var(--fg-0)",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {role.title}
                    </div>
                    <div style={{ display: "flex", gap: 5, marginTop: 1.5, alignItems: "center" }}>
                      <span style={{
                        fontFamily: "var(--font-mono)", fontSize: 10,
                        color: SIGNAL_COLOR[role.rustSignal],
                      }}>
                        {SIGNAL_LABEL[role.rustSignal]}
                      </span>
                      {role.experienceLevel && (
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-4)" }}>
                          · {LEVEL_SHORT[role.experienceLevel]}
                        </span>
                      )}
                      {role.isRemote && (
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-4)" }}>
                          · Remote
                        </span>
                      )}
                      {role.salary && (
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-3)" }}>
                          · {role.salary}
                        </span>
                      )}
                    </div>
                  </div>

                  <a
                    href={role.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => ph?.capture("opportunity_apply_clicked", { opportunity_id: role.id, source: "peek_panel" })}
                    style={{
                      height: 24, padding: "0 8px",
                      borderRadius: 4, border: "1px solid var(--line-soft)",
                      background: "transparent", color: "var(--fg-2)",
                      fontSize: 11, fontFamily: "var(--font-mono)",
                      textDecoration: "none", display: "inline-flex",
                      alignItems: "center", whiteSpace: "nowrap", flexShrink: 0,
                    }}
                  >
                    Apply ↗
                  </a>
                </div>
              ))}

              <div style={{ padding: "5px 14px 7px" }}>
                <Link
                  href={`/opportunities?q=${encodeURIComponent(company.name)}`}
                  style={{
                    fontSize: 11, fontFamily: "var(--font-mono)",
                    color: "var(--fg-3)", textDecoration: "none",
                  }}
                >
                  All opportunities for {company.name} →
                </Link>
              </div>
            </div>
          )}

          {/* ── Application state ──────────────────────────────────────────── */}
          {isTracked ? (
            <div style={{ padding: "9px 14px 10px", borderBottom: "1px solid var(--line-soft)" }}>
              <Label>Application</Label>

              {/* Stage track */}
              {stageIdx >= 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 1, margin: "5px 0 7px" }}>
                  {PIPELINE_STAGES.map((stage, i) => {
                    const isPast    = i < stageIdx
                    const isCurrent = i === stageIdx
                    const isFuture  = i > stageIdx
                    const c = statusStyle?.color ?? "var(--fg-3)"
                    return (
                      <div key={stage.key} style={{ display: "flex", alignItems: "center" }}>
                        {i > 0 && (
                          <div style={{
                            width: 8, height: 1,
                            background: isPast ? c : "var(--line-soft)",
                            opacity: isPast ? 0.35 : 1,
                          }} />
                        )}
                        <div
                          title={stage.short}
                          style={{
                            borderRadius: isCurrent ? 3 : "50%",
                            background: isCurrent ? c : isPast ? `color-mix(in oklch, ${c}, transparent 55%)` : "transparent",
                            border: isFuture ? "1px solid var(--line-soft)" : "none",
                            width: isCurrent ? "auto" : 5,
                            height: isCurrent ? 14 : 5,
                            minWidth: 5,
                            padding: isCurrent ? "0 5px" : 0,
                            display: "flex", alignItems: "center",
                            fontFamily: "var(--font-mono)", fontSize: 9,
                            color: "var(--bg-0)", fontWeight: 600,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {isCurrent ? stage.short : ""}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Dates + context */}
              <div style={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
                {localState?.appliedAt && (
                  <InfoRow label="Applied" value={fmtDate(localState.appliedAt, true)} />
                )}
                {localState?.followUpAt && (
                  <InfoRow
                    label="Follow-up"
                    value={fmtDate(localState.followUpAt)}
                    accent={daysDiff(localState.followUpAt) > 0 ? "danger" : undefined}
                  />
                )}
                {localState?.recruiterName && (
                  <InfoRow label="Recruiter" value={localState.recruiterName} />
                )}
                {localState?.salaryExpectation && (
                  <InfoRow label="Salary" value={localState.salaryExpectation} />
                )}
                {localState?.rejectedAt && currentStatus === "REJECTED" && (
                  <InfoRow label="Rejected" value={fmtDate(localState.rejectedAt)} />
                )}
                {localState?.offerReceivedAt && currentStatus === "OFFER" && (
                  <InfoRow label="Offer" value={fmtDate(localState.offerReceivedAt)} />
                )}
              </div>

              {/* Next action */}
              {nextAction && (
                <p style={{
                  fontSize: 11.5, color: "var(--fg-3)", margin: "8px 0 0",
                  lineHeight: 1.5, fontStyle: "italic",
                }}>
                  → {nextAction}
                </p>
              )}
            </div>
          ) : isAuthenticated ? (
            /* Not tracked yet — make it easy to start */
            <div style={{
              padding: "10px 14px",
              borderBottom: "1px solid var(--line-soft)",
              background: "var(--bg-1)",
            }}>
              <p style={{ fontSize: 12, color: "var(--fg-3)", margin: "0 0 8px" }}>
                Not tracking this company yet.
              </p>
              <div style={{ display: "flex", gap: 6 }}>
                <ApplicationDialog
                  companyId={company.id}
                  companyName={company.name}
                  userState={null}
                  trigger={
                    <button style={{
                      ...btn,
                      background: "var(--d-accent-soft)",
                      borderColor: "var(--d-accent-line)",
                      color: "var(--d-accent)", fontWeight: 500,
                    }}>
                      Start tracking
                    </button>
                  }
                />
                <button
                  onClick={handleToggleSave}
                  style={{ ...btn, display: "inline-flex", alignItems: "center", gap: 4 }}
                >
                  <Bookmark size={11} />
                  Save for later
                </button>
              </div>
            </div>
          ) : null}

          {/* ── Notes ──────────────────────────────────────────────────────── */}
          {isTracked && (
            <div style={{
              padding: "9px 14px 10px",
              borderBottom: "1px solid var(--line-soft)",
              background: localState?.notes
                ? "color-mix(in oklch, var(--bg-1), transparent 40%)"
                : "transparent",
            }}>
              <Label>Notes</Label>
              {localState?.notes ? (
                <p style={{
                  fontSize: 12, color: "var(--fg-1)", lineHeight: 1.65,
                  margin: "4px 0 0", whiteSpace: "pre-wrap",
                }}>
                  {localState.notes}
                </p>
              ) : (
                <p style={{ fontSize: 11.5, color: "var(--fg-4)", margin: "3px 0 0", fontStyle: "italic" }}>
                  No notes — add them via Edit tracking.
                </p>
              )}
            </div>
          )}

          {/* ── Action bar ─────────────────────────────────────────────────── */}
          {(isTracked || !isAuthenticated) && (
            <div style={{
              padding: "9px 14px",
              borderBottom: "1px solid var(--line-soft)",
              display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center",
            }}>
              {isAuthenticated ? (
                <>
                  <ApplicationDialog
                    companyId={company.id}
                    companyName={company.name}
                    userState={localState}
                    trigger={
                      <button style={{
                        ...btn,
                        background: isInPipeline ? "color-mix(in oklch, var(--d-accent), transparent 88%)" : "transparent",
                        borderColor: isInPipeline ? "var(--d-accent-line)" : "var(--line-soft)",
                        color: isInPipeline ? "var(--d-accent)" : "var(--fg-1)",
                        fontWeight: isInPipeline ? 500 : 400,
                      }}>
                        {isInPipeline ? "Edit tracking" : "Update status"}
                      </button>
                    }
                  />
                  <button
                    onClick={handleToggleSave}
                    style={{
                      ...btn, display: "inline-flex", alignItems: "center", gap: 4,
                      color: isSaved ? "var(--d-rust)" : "var(--fg-3)",
                      borderColor: isSaved ? "color-mix(in oklch, var(--d-rust), transparent 55%)" : "var(--line-soft)",
                      background: isSaved ? "color-mix(in oklch, var(--d-rust), transparent 90%)" : "transparent",
                    }}
                  >
                    {isSaved ? <BookmarkCheck size={11} /> : <Bookmark size={11} />}
                    {isSaved ? "Saved" : "Save"}
                  </button>
                  <div style={{ flex: 1 }} />
                  <a
                    href={company.careersUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => ph?.capture("careers_link_clicked", { company_id: company.id, source: "peek_panel" })}
                    style={{ ...btn, display: "inline-flex", textDecoration: "none", color: "var(--fg-3)" }}
                  >
                    Careers ↗
                  </a>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    style={{
                      ...btn, display: "inline-flex", textDecoration: "none",
                      background: "var(--d-accent-soft)", borderColor: "var(--d-accent-line)",
                      color: "var(--d-accent)", fontWeight: 500,
                    }}
                  >
                    Sign in to track
                  </Link>
                  <div style={{ flex: 1 }} />
                  <a
                    href={company.careersUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ ...btn, display: "inline-flex", textDecoration: "none", color: "var(--fg-3)" }}
                  >
                    Careers ↗
                  </a>
                </>
              )}
            </div>
          )}

          {/* ── Company context (below fold) ───────────────────────────────── */}
          <div style={{ padding: "10px 14px 16px" }}>
            <Label>About</Label>
            <p style={{ fontSize: 12, color: "var(--fg-2)", lineHeight: 1.6, margin: "4px 0 0" }}>
              {company.description}
            </p>
            {company.tags.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 7 }}>
                {company.tags.map(tag => (
                  <span
                    key={tag}
                    style={{
                      fontFamily: "var(--font-mono)", fontSize: 10,
                      color: "var(--fg-3)", background: "var(--bg-2)",
                      border: "1px solid var(--line-soft)", padding: "1px 6px", borderRadius: 3,
                    }}
                  >
                    {tag.toLowerCase()}
                  </span>
                ))}
              </div>
            )}
            {company.atsProvider && (
              <div style={{ marginTop: 8 }}>
                <InfoRow label="ATS" value={company.atsProvider} />
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: "var(--font-mono)", fontSize: 9.5, fontWeight: 600,
      color: "var(--fg-4)", letterSpacing: "0.08em", textTransform: "uppercase",
    }}>
      {children}
    </div>
  )
}

function Pill({ children, rust, ok, muted }: {
  children: React.ReactNode
  rust?: boolean; ok?: boolean; muted?: boolean
}) {
  const color = rust ? "var(--d-rust)" : ok ? "var(--d-ok)" : muted ? "var(--fg-4)" : "var(--fg-3)"
  const border = rust
    ? "color-mix(in oklch, var(--d-rust), transparent 62%)"
    : ok
      ? "color-mix(in oklch, var(--d-ok), transparent 62%)"
      : "var(--line-soft)"
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      height: 17, padding: "0 6px", borderRadius: 3,
      fontFamily: "var(--font-mono)", fontSize: 9.5,
      color, border: `1px solid ${border}`, background: "transparent", whiteSpace: "nowrap",
    }}>
      {children}
    </span>
  )
}

function InfoRow({ label, value, accent }: {
  label: string
  value: React.ReactNode
  accent?: "danger"
}) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
      <span style={{
        fontFamily: "var(--font-mono)", fontSize: 10.5,
        color: "var(--fg-4)", flexShrink: 0, minWidth: 68,
      }}>
        {label}
      </span>
      <span style={{
        fontFamily: "var(--font-mono)", fontSize: 11,
        color: accent === "danger" ? "var(--d-danger)" : "var(--fg-2)",
      }}>
        {value}
      </span>
    </div>
  )
}

const btn: React.CSSProperties = {
  height: 26, padding: "0 10px", borderRadius: 5,
  fontSize: 11.5, fontFamily: "var(--font-mono)",
  border: "1px solid var(--line-soft)", background: "transparent",
  color: "var(--fg-1)", cursor: "pointer", whiteSpace: "nowrap",
}
