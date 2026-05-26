import { getDashboardData } from "@/lib/companies"
import { ApplicationRow } from "@/components/application-row"
import { Layers } from "lucide-react"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { DASHBOARD_STATUS_ORDER, STATUS_LABELS } from "@/types"
import type { UserCompanyStatus } from "@/lib/company-status"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Dashboard" }

export default async function DashboardPage() {
  const data = await getDashboardData()

  if (!data || data.states.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/5 mb-4">
          <Layers className="h-7 w-7 text-muted-foreground/40" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">Nothing tracked yet</p>
        <p className="text-xs text-muted-foreground/60 mt-1 max-w-xs">
          Start tracking applications from the companies directory
        </p>
        <Link href="/companies" className={buttonVariants({ size: "sm", variant: "secondary" }) + " mt-4"}>
          Browse companies
        </Link>
      </div>
    )
  }

  const grouped = data.states.reduce(
    (acc: any, s: any) => {
      const key = s.status as UserCompanyStatus
      if (!acc[key]) acc[key] = []
      acc[key].push(s)
      return acc
    },
    {} as Record<UserCompanyStatus, typeof data.states>,
  )

  const orderedKeys = DASHBOARD_STATUS_ORDER.filter((s: any) => grouped[s]?.length > 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold text-foreground">All Applications</h1>
        <p className="text-xs text-muted-foreground mt-0.5">{data.states.length} tracked</p>
      </div>

      {orderedKeys.map((status: any) => (
        <div key={status}>
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {STATUS_LABELS[status as UserCompanyStatus]}
            </h2>
            <span className="text-xs text-muted-foreground/60">{grouped[status as UserCompanyStatus].length}</span>
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
  )
}
