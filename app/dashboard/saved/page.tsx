import { getDashboardData, type CompanyListItem } from "@/lib/companies"
import { CompanyCard } from "@/components/company-card"
import { Bookmark } from "lucide-react"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { getSession } from "@/lib/auth"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Saved" }

export default async function SavedPage() {
  const [data, session] = await Promise.all([getDashboardData(), getSession()])

  if (!data || data.saved.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/5 mb-4">
          <Bookmark className="h-7 w-7 text-muted-foreground/40" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">No saved companies</p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Save companies from the directory to build your wishlist
        </p>
        <Link href="/companies" className={buttonVariants({ size: "sm", variant: "secondary" }) + " mt-4"}>
          Browse companies
        </Link>
      </div>
    )
  }

  const companies: CompanyListItem[] = data.saved.map((s) => {
    const app = data.applications.find((a) => a.companyId === s.companyId)
    return {
      ...s.company,
      isSaved: true,
      application: app ?? undefined,
    } as CompanyListItem
  })

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-foreground">Saved Companies</h1>
        <p className="text-xs text-muted-foreground mt-0.5">{companies.length} saved</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {companies.map((company) => (
          <CompanyCard
            key={company.id}
            company={company}
            isAuthenticated={!!session}
          />
        ))}
      </div>
    </div>
  )
}
