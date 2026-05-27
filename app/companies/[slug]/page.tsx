import { notFound } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns"
import { getSession } from "@/lib/auth"
import { getCompanyBySlug, getRelatedCompanies } from "@/lib/companies"
import { captureServerEvent } from "@/lib/analytics"
import { Navbar } from "@/components/navbar"
import { StatusBadge } from "@/components/status-badge"
import { ApplicationDialog } from "@/components/application-dialog"
import { CompanyAvatar } from "@/components/company-avatar"
import { CareersLink } from "@/components/careers-link"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { ArrowLeft, Globe } from "lucide-react"
import { RUST_LEVEL_LABELS } from "@/types"
import type { Metadata } from "next"

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const company = await getCompanyBySlug(slug)
  if (!company) return { title: "Company not found" }
  const title = `${company.name} Jobs`
  const description = `${company.description} Track your application to ${company.name}.`
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://jobs.adarshrust.com/companies/${slug}`,
      type: "website",
    },
    twitter: { card: "summary_large_image", title, description },
    alternates: {
      canonical: `https://jobs.adarshrust.com/companies/${slug}`,
    },
  }
}

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs text-foreground">{value}</span>
    </div>
  )
}

export default async function CompanyPage({ params }: PageProps) {
  const { slug } = await params
  const [session, company] = await Promise.all([getSession(), getCompanyBySlug(slug)])

  if (!company) notFound()

  const [companyWithState, related] = await Promise.all([
    session?.user?.id ? getCompanyBySlug(slug, session.user.id) : Promise.resolve(company),
    getRelatedCompanies(company.id, company.tags, 6),
  ])

  const c = companyWithState ?? company

  if (session?.user?.id) {
    captureServerEvent(session.user.id, {
      event: "company_viewed",
      props: { company_id: c.id, company_name: c.name, company_slug: slug, is_authenticated: true },
    }).catch(() => {})
  }

  const pageUrl = `https://jobs.adarshrust.com/companies/${slug}`
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": pageUrl,
    name: c.name,
    description: c.description,
    url: c.careersUrl,
    ...(c.logoUrl ? { logo: c.logoUrl } : {}),
  }

  const rustLabel = RUST_LEVEL_LABELS[c.rustLevel as keyof typeof RUST_LEVEL_LABELS]

  return (
    <>
      <Navbar />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="flex-1 mx-auto max-w-5xl w-full px-4 sm:px-6 lg:px-8 py-6">
        <Link
          href="/companies"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-5"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All companies
        </Link>

        {/* Company header */}
        <div className="flex items-start gap-4 mb-4">
          <CompanyAvatar name={c.name} logoUrl={c.logoUrl} size={48} />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-xl font-bold text-foreground leading-tight">{c.name}</h1>
              {c.userState && <StatusBadge status={c.userState.status} />}
            </div>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{c.description}</p>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-5">
          {c.remote && (
            <Badge
              variant="outline"
              className="text-xs text-green-400 border-green-800/60 bg-green-950/30"
            >
              Remote
            </Badge>
          )}
          {c.rustLevel !== "NONE" && (
            <Badge
              variant="outline"
              className="text-xs text-orange-400 border-orange-800/60 bg-orange-950/30"
            >
              🦀 {rustLabel}
            </Badge>
          )}
          {!c.isHiring && (
            <Badge
              variant="outline"
              className="text-xs text-muted-foreground border-border bg-secondary/50"
            >
              Not actively hiring
            </Badge>
          )}
          {c.tags.map((tag: string) => (
            <Badge
              key={tag}
              variant="secondary"
              className="text-xs bg-secondary text-muted-foreground border-transparent"
            >
              {tag}
            </Badge>
          ))}
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-4">
          {/* ── Left: links + metadata ── */}
          <div className="space-y-4">
            {/* Action links */}
            <div className="flex flex-wrap gap-2">
              <CareersLink href={c.careersUrl} companyId={c.id} companyName={c.name} />
              {c.loginUrl && (
                <a
                  href={c.loginUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={
                    buttonVariants({ size: "sm", variant: "secondary" }) +
                    " h-8 bg-secondary hover:bg-muted"
                  }
                >
                  <Globe className="mr-1.5 h-3.5 w-3.5" />
                  Login portal
                </a>
              )}
            </div>

            {/* Metadata */}
            <div className="rounded-md border border-border bg-card/50 px-3 py-1">
              {c.atsProvider && <MetaRow label="ATS" value={c.atsProvider} />}
              {c.companyType && <MetaRow label="Type" value={c.companyType} />}
              <MetaRow
                label="Hiring status"
                value={
                  <span className="flex items-center gap-1.5">
                    {c.isHiring ? (
                      <span className="text-green-400">Actively hiring</span>
                    ) : (
                      <span className="text-muted-foreground">Not currently hiring</span>
                    )}
                    {c.lastHiringCheckAt && (
                      <span className="text-muted-foreground/50">
                        · verified {format(new Date(c.lastHiringCheckAt), "d MMM")}
                      </span>
                    )}
                  </span>
                }
              />
            </div>
          </div>

          {/* ── Right: user tracking ── */}
          <div>
            {session ? (
              <div className="rounded-md border border-border bg-card p-4 space-y-3">
                <h2 className="text-sm font-semibold text-foreground">Your tracking</h2>

                {c.userState ? (
                  <>
                    <div className="space-y-0">
                      {c.userState.appliedAt && (
                        <MetaRow
                          label="Applied"
                          value={format(new Date(c.userState.appliedAt), "d MMM yyyy")}
                        />
                      )}
                      {c.userState.recruiterName && (
                        <MetaRow label="Recruiter" value={c.userState.recruiterName} />
                      )}
                      {c.userState.salaryExpectation && (
                        <MetaRow label="Comp" value={c.userState.salaryExpectation} />
                      )}
                      {c.userState.followUpAt && (
                        <MetaRow
                          label="Follow-up"
                          value={
                            <span className="text-yellow-400">
                              {format(new Date(c.userState.followUpAt), "d MMM yyyy")}
                            </span>
                          }
                        />
                      )}
                      {c.userState.lastCheckedAt && (
                        <MetaRow
                          label="Last checked"
                          value={format(new Date(c.userState.lastCheckedAt), "d MMM yyyy")}
                        />
                      )}
                    </div>

                    {c.userState.notes && (
                      <div className="pt-2 border-t border-border">
                        <p className="text-[11px] text-muted-foreground mb-1">Notes</p>
                        <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed line-clamp-4">
                          {c.userState.notes}
                        </p>
                      </div>
                    )}

                    <ApplicationDialog
                      companyId={c.id}
                      companyName={c.name}
                      userState={c.userState}
                      trigger={
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-7 text-xs w-full bg-secondary hover:bg-muted"
                        >
                          Edit status
                        </Button>
                      }
                    />
                  </>
                ) : (
                  <ApplicationDialog
                    companyId={c.id}
                    companyName={c.name}
                    userState={null}
                    trigger={
                      <Button size="sm" className="h-8 text-sm w-full">
                        Start tracking
                      </Button>
                    }
                  />
                )}
              </div>
            ) : (
              <div className="rounded-md border border-border bg-card/50 p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  <Link href="/login" className="text-foreground hover:underline">
                    Sign in
                  </Link>{" "}
                  to track your application
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Related companies */}
        {related.length > 0 && (
          <div className="mt-8">
            <h2 className="text-sm font-semibold text-foreground mb-3">
              Related companies
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {related.map((rel: any) => (
                <Link
                  key={rel.id}
                  href={`/companies/${rel.slug}`}
                  className="flex items-start gap-2.5 p-3 rounded-md border border-border bg-card/50 hover:border-white/20 hover:bg-card transition-colors"
                >
                  <CompanyAvatar name={rel.name} logoUrl={rel.logoUrl} size={28} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground leading-tight truncate">
                      {rel.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                      {rel.description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </>
  )
}
