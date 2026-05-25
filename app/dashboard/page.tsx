import { getDashboardData } from "@/lib/companies"
import { ApplicationRow } from "@/components/application-row"
import { Layers } from "lucide-react"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { STATUS_LABELS } from "@/types"
import { ApplicationStatus } from "@/lib/generated/prisma"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Dashboard" }

const STATUS_ORDER: ApplicationStatus[] = [
  "OFFER",
  "FINAL_ROUND",
  "INTERVIEWING",
  "RECRUITER_CALL",
  "OA",
  "APPLIED",
  "WISHLIST",
  "GHOSTED",
  "REJECTED",
]

export default async function DashboardPage() {
  const data = await getDashboardData()

  if (!data || data.applications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/5 mb-4">
          <Layers className="h-7 w-7 text-muted-foreground/40" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">No applications yet</p>
        <p className="text-xs text-muted-foreground/60 mt-1 max-w-xs">
          Start tracking applications from the companies directory
        </p>
        <Link href="/companies" className={buttonVariants({ size: "sm", variant: "secondary" }) + " mt-4"}>
          Browse companies
        </Link>
      </div>
    )
  }

  const sorted = [...data.applications].sort((a, b) => {
    const ai = STATUS_ORDER.indexOf(a.status as ApplicationStatus)
    const bi = STATUS_ORDER.indexOf(b.status as ApplicationStatus)
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
  })

  const groupedByStatus = sorted.reduce(
    (acc, app) => {
      const key = app.status as ApplicationStatus
      if (!acc[key]) acc[key] = []
      acc[key].push(app)
      return acc
    },
    {} as Record<ApplicationStatus, typeof sorted>
  )

  const orderedKeys = STATUS_ORDER.filter((s) => groupedByStatus[s]?.length > 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground">All Applications</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {data.applications.length} total
          </p>
        </div>
      </div>

      {orderedKeys.map((status) => (
        <div key={status}>
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {STATUS_LABELS[status]}
            </h2>
            <span className="text-xs text-muted-foreground/60">
              {groupedByStatus[status].length}
            </span>
          </div>
          <div className="rounded-lg border border-border bg-card px-4">
            {groupedByStatus[status].map((app) => (
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
      ))}
    </div>
  )
}
