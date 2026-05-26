import { getDashboardData } from "@/lib/companies"
import { ApplicationRow } from "@/components/application-row"
import { ArrowRight } from "lucide-react"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { DASHBOARD_STATUS_ORDER, STATUS_LABELS } from "@/types"
import type { UserCompanyStatus } from "@/lib/company-status"
import type { Metadata } from "next"

const ACTIVE_STATUSES_QS =
  "status=APPLIED&status=OA&status=RECRUITER_CALL&status=INTERVIEWING&status=FINAL_ROUND&status=OFFER"

export const metadata: Metadata = { title: "Dashboard" }

export default async function DashboardPage() {
  const data = await getDashboardData()

  if (!data || data.states.length === 0) {
    return (
      <div className="flex flex-col items-start py-12 max-w-sm">
        <h1 className="text-lg font-bold text-foreground mb-1">Pipeline</h1>
        <p className="text-xs text-muted-foreground mb-8">Nothing tracked yet</p>

        <div className="w-full space-y-3 mb-8">
          {[
            "Browse companies — find ones worth your attention",
            "Click any card → \"Start tracking\" to add to your pipeline",
            "Set status and follow-up date after applying",
            "Return here to see the full picture across all applications",
          ].map((text, i) => (
            <div key={i} className="flex items-start gap-3">
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  color: "var(--d-accent)",
                  background: "var(--d-accent-soft)",
                  border: "1px solid var(--d-accent-line)",
                  borderRadius: 4,
                  padding: "1px 6px",
                  flexShrink: 0,
                  marginTop: 2,
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
            </div>
          ))}
        </div>

        <Link
          href="/companies"
          className={buttonVariants({ size: "sm" }) + " gap-1.5"}
        >
          Browse companies
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    )
  }

  const { states, metrics } = data

  const grouped = states.reduce(
    (acc: any, s: any) => {
      const key = s.status as UserCompanyStatus
      if (!acc[key]) acc[key] = []
      acc[key].push(s)
      return acc
    },
    {} as Record<UserCompanyStatus, typeof states>,
  )

  const orderedKeys = DASHBOARD_STATUS_ORDER.filter((s: any) => grouped[s]?.length > 0)

  return (
    <div className="space-y-6">
      {/* Pipeline metrics strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 1,
          background: "var(--line-soft)",
          borderRadius: 8,
          overflow: "hidden",
          border: "1px solid var(--line-soft)",
        }}
      >
        {[
          { label: "Tracked", value: metrics.total, sub: "in pipeline", color: "var(--fg-0)", href: `/companies?${ACTIVE_STATUSES_QS}&status=SAVED&status=REJECTED&status=GHOSTED&status=NO_OPENINGS&status=HIRING_FREEZE` },
          { label: "Active", value: metrics.activePipeline, sub: "in progress", color: "var(--d-accent)", href: `/companies?${ACTIVE_STATUSES_QS}` },
          {
            label: "Follow-up",
            value: metrics.followUpsDue,
            sub: "overdue",
            color: metrics.followUpsDue > 0 ? "var(--d-warn)" : "var(--fg-3)",
            href: "/companies?time=follow_up_due",
          },
        ].map((stat) =>
          stat.value > 0 ? (
            <Link key={stat.label} href={stat.href} className="stat-tile">
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  color: "var(--fg-3)",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  marginBottom: 4,
                }}
              >
                {stat.label}
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span style={{ fontSize: 22, fontWeight: 600, color: stat.color, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
                  {stat.value}
                </span>
                <span style={{ fontSize: 11, color: "var(--fg-3)" }}>{stat.sub}</span>
              </div>
            </Link>
          ) : (
            <div key={stat.label} className="stat-tile">
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  color: "var(--fg-3)",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  marginBottom: 4,
                }}
              >
                {stat.label}
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span style={{ fontSize: 22, fontWeight: 600, color: stat.color, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
                  {stat.value}
                </span>
                <span style={{ fontSize: 11, color: "var(--fg-3)" }}>{stat.sub}</span>
              </div>
            </div>
          )
        )}
      </div>

      {/* Application groups */}
      <div>
        <h1 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          All Applications
        </h1>

        <div className="space-y-6">
          {orderedKeys.map((status: any) => (
            <div key={status}>
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {STATUS_LABELS[status as UserCompanyStatus]}
                </h2>
                <span className="text-xs text-muted-foreground/60">
                  {grouped[status as UserCompanyStatus].length}
                </span>
              </div>
              <div className="rounded-lg border border-border bg-card px-4">
                {grouped[status as UserCompanyStatus].map((s: any) => (
                  <ApplicationRow
                    key={s.id}
                    companyId={s.company.id}
                    companyName={s.company.name}
                    companySlug={s.company.slug}
                    companyLogoUrl={s.company.logoUrl}
                    careersUrl={s.company.careersUrl}
                    loginUrl={s.company.loginUrl}
                    userState={{
                      status: s.status as UserCompanyStatus,
                      appliedAt: s.appliedAt,
                      rejectedAt: s.rejectedAt,
                      followUpAt: s.followUpAt,
                      lastCheckedAt: s.lastCheckedAt,
                      notes: s.notes,
                      salaryExpectation: s.salaryExpectation,
                      recruiterName: s.recruiterName,
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
