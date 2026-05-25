import { getDashboardData } from "@/lib/companies"
import { ApplicationRow } from "@/components/application-row"
import { CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { ApplicationStatus } from "@/lib/generated/prisma"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Applied" }

const APPLIED_STATUSES: ApplicationStatus[] = [
  "APPLIED",
  "OA",
  "RECRUITER_CALL",
  "INTERVIEWING",
  "FINAL_ROUND",
  "OFFER",
]

export default async function AppliedPage() {
  const data = await getDashboardData()

  const applied = data?.applications.filter((a) =>
    APPLIED_STATUSES.includes(a.status as ApplicationStatus)
  ) ?? []

  if (applied.length === 0) {
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
        <h1 className="text-lg font-bold text-foreground">Applied</h1>
        <p className="text-xs text-muted-foreground mt-0.5">{applied.length} active applications</p>
      </div>

      <div className="rounded-lg border border-border bg-card px-4">
        {applied.map((app) => (
          <ApplicationRow
            key={app.id}
            companyId={app.company.id}
            companyName={app.company.name}
            companySlug={app.company.slug}
            companyLogoUrl={app.company.logoUrl}
            companyTags={app.company.tags}
            careersUrl={app.company.careersUrl}
            loginUrl={app.company.loginUrl}
            application={{
              status: app.status as ApplicationStatus,
              appliedAt: app.appliedAt,
              notes: app.notes,
              salary: app.salary,
              recruiterName: app.recruiterName,
              reminderDate: app.reminderDate,
            }}
          />
        ))}
      </div>
    </div>
  )
}
