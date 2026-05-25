import { getSession } from "@/lib/auth"
import { getCompanies } from "@/lib/companies"
import { CompaniesShell } from "@/components/companies-shell"
import { parseFilters } from "@/types"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Companies",
  description:
    "Browse 54 curated remote engineering companies hiring Rust, backend, systems, and infra engineers.",
  openGraph: {
    title: "Companies | jobs.adarshrust.com",
    description:
      "Browse 54 curated remote engineering companies hiring Rust, backend, systems, and infra engineers.",
    url: "https://jobs.adarshrust.com/companies",
    type: "website",
  },
}

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function CompaniesPage({ searchParams }: PageProps) {
  const [rawParams, session] = await Promise.all([searchParams, getSession()])
  const isAuthenticated = !!session
  const userId = session?.user?.id

  const filters = parseFilters(rawParams)
  const initialData = await getCompanies(filters, userId)

  return (
    <CompaniesShell
      initialFilters={filters}
      initialData={initialData}
      isAuthenticated={isAuthenticated}
    />
  )
}
