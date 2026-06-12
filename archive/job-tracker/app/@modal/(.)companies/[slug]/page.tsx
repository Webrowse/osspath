import { notFound } from "next/navigation"
import { getSession } from "@/lib/auth"
import { getCompanyBySlug, getUserCompanyState } from "@/lib/companies"
import { getOpportunitiesForCompany } from "@/lib/opportunities"
import { CompanyPeekPanel } from "@/components/company-peek-panel"

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function CompanyModalPage({ params }: PageProps) {
  const { slug } = await params
  const [session, company] = await Promise.all([getSession(), getCompanyBySlug(slug)])

  if (!company) notFound()

  const [userState, openRoles] = await Promise.all([
    session?.user?.id
      ? getUserCompanyState(company.id, session.user.id)
      : Promise.resolve(null),
    getOpportunitiesForCompany(company.id),
  ])

  return (
    <CompanyPeekPanel
      company={{ ...company, userState: userState ?? null }}
      openRoles={openRoles}
      isAuthenticated={!!session?.user}
    />
  )
}
