import { getDashboardData } from "@/lib/companies"
import { ApplicationRow } from "@/components/application-row"
import { CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { ACTIVE_PIPELINE_STATUSES } from "@/types"
import type { UserCompanyStatus } from "@/lib/company-status"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Applied" }

export default async function AppliedPage() {
  const data = await getDashboardData()

  const active = data?.states.filter((s: any) =>
    ACTIVE_PIPELINE_STATUSES.includes(s.status as UserCompanyStatus),
  ) ?? []

  if (active.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/5 mb-4">
          <CheckCircle2 className="h-7 w-7 text-muted-foreground/40" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">No active applications</p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Mark companies as Applied to track them here
        </p>
        <Link href="/companies" className={buttonVariants({ size: "sm", variant: "secondary" }) + " mt-4"}>
          Browse companies
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-foreground">Active Applications</h1>
        <p className="text-xs text-muted-foreground mt-0.5">{active.length} in pipeline</p>
      </div>
      <div className="rounded-lg border border-border bg-card px-4">
        {active.map((s: any) => (
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
  )
}
