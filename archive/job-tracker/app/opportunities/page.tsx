import { parseOpportunityFilters, getOpportunities } from "@/lib/opportunities"
import { OpportunitiesShell } from "@/components/opportunities-shell"
import type { OppShellFilters } from "@/components/opportunities-shell"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Rust Opportunities",
  description: "Curated Rust engineering opportunities, ranked by accessibility and Rust intensity.",
  openGraph: {
    title: "Rust Opportunities | jobs.adarshrust.com",
    description: "Curated Rust engineering opportunities, ranked by accessibility and Rust intensity.",
    url: "https://jobs.adarshrust.com/opportunities",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rust Opportunities | jobs.adarshrust.com",
    description: "Curated Rust engineering opportunities, ranked by accessibility and Rust intensity.",
    images: ["/opengraph-image"],
  },
  alternates: { canonical: "https://jobs.adarshrust.com/opportunities" },
}

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function scalar(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v
}

export default async function OpportunitiesPage({ searchParams }: PageProps) {
  const raw = await searchParams
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(raw)) {
    const s = scalar(v)
    if (s) params.set(k, s)
  }

  const filters = parseOpportunityFilters(params)
  const { items, total, page, totalPages } = await getOpportunities(filters)

  const shellFilters: OppShellFilters = {
    q: filters.q ?? "",
    rust: filters.rust ?? "",
    level: filters.level ?? "",
    remote: filters.remote ?? false,
    junior: filters.junior ?? false,
    oss: filters.oss ?? false,
    source: filters.source ?? "",
    sort: filters.sort ?? "quality",
  }

  return (
    <OpportunitiesShell
      filters={shellFilters}
      items={items}
      total={total}
      page={page}
      totalPages={totalPages}
    />
  )
}
