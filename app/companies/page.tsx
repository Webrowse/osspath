import { Suspense } from "react"
import { getSession } from "@/lib/auth"
import { getAllCompaniesForClient } from "@/lib/companies"
import { CompaniesShell } from "@/components/companies-shell"
import { parseFilters } from "@/types"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Companies",
  description:
    "Browse curated remote engineering companies hiring Rust, backend, systems, and infra engineers. Filter by stack, hiring signal, and company type.",
  openGraph: {
    title: "Companies | jobs.adarshrust.com",
    description:
      "Browse curated remote engineering companies hiring Rust, backend, systems, and infra engineers.",
    url: "https://jobs.adarshrust.com/companies",
    type: "website",
  },
  alternates: {
    canonical: "https://jobs.adarshrust.com/companies",
  },
}

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function CompaniesPage({ searchParams }: PageProps) {
  const [rawParams, session] = await Promise.all([searchParams, getSession()])
  const isAuthenticated = !!session
  const userId = session?.user?.id

  // Parse filters for initial UI state (URL → sidebar/toolbar state)
  const initialFilters = parseFilters(rawParams)

  // Load all companies + all user states in two parallel DB queries
  const initialData = await getAllCompaniesForClient(userId)

  return (
    <Suspense fallback={null}>
      <CompaniesShell
        initialFilters={initialFilters}
        initialData={initialData}
        isAuthenticated={isAuthenticated}
      />
    </Suspense>
  )
}
