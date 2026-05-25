import { Suspense } from "react"
import { getSession } from "@/lib/auth"
import { getCompanies } from "@/lib/companies"
import { SessionProvider } from "@/components/session-provider"
import { Navbar } from "@/components/navbar"
import { CompanyCard } from "@/components/company-card"
import { SearchFilters } from "@/components/search-filters"
import { CompanyGridSkeleton } from "@/components/company-card-skeleton"
import { Building2 } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Companies",
  description: "Browse 54 curated remote engineering companies hiring Rust, backend, systems, and infra engineers.",
  openGraph: {
    title: "Companies | jobs.adarshrust.com",
    description: "Browse 54 curated remote engineering companies hiring Rust, backend, systems, and infra engineers.",
    url: "https://jobs.adarshrust.com/companies",
    type: "website",
  },
}

interface PageProps {
  searchParams: Promise<{
    q?: string
    tag?: string | string[]
    remote?: string
    rust?: string
  }>
}

async function CompanyGrid({
  search,
  tags,
  remoteOnly,
  rustOnly,
  isAuthenticated,
  userId,
}: {
  search: string
  tags: string[]
  remoteOnly: boolean
  rustOnly: boolean
  isAuthenticated: boolean
  userId?: string
}) {
  const companies = await getCompanies({ search, tags, remoteOnly, rustOnly, userId })

  if (companies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Building2 className="h-10 w-10 text-muted-foreground/30 mb-4" />
        <p className="text-sm font-medium text-muted-foreground">No companies found</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Try adjusting your search or filters</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {companies.map((company) => (
        <CompanyCard key={company.id} company={company} isAuthenticated={isAuthenticated} />
      ))}
    </div>
  )
}

export default async function CompaniesPage({ searchParams }: PageProps) {
  const params = await searchParams
  const session = await getSession()

  const search = params.q ?? ""
  const tags = params.tag ? (Array.isArray(params.tag) ? params.tag : [params.tag]) : []
  const remoteOnly = params.remote === "1"
  const rustOnly = params.rust === "1"

  return (
    <SessionProvider>
      <Navbar />
      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-foreground">Companies</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Curated remote-first engineering companies
          </p>
        </div>

        <div className="mb-6">
          <SearchFilters
            search={search}
            tags={tags}
            remoteOnly={remoteOnly}
            rustOnly={rustOnly}
          />
        </div>

        <Suspense fallback={<CompanyGridSkeleton />}>
          <CompanyGrid
            search={search}
            tags={tags}
            remoteOnly={remoteOnly}
            rustOnly={rustOnly}
            isAuthenticated={!!session}
            userId={session?.user?.id}
          />
        </Suspense>
      </main>
    </SessionProvider>
  )
}
