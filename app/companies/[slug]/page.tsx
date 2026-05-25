import { notFound } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { getSession } from "@/lib/auth"
import { getCompanyBySlug } from "@/lib/companies"
import { SessionProvider } from "@/components/session-provider"
import { Navbar } from "@/components/navbar"
import { StatusBadge } from "@/components/status-badge"
import { ApplicationDialog } from "@/components/application-dialog"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { ArrowLeft, ExternalLink, Globe } from "lucide-react"
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
  const description = `${company.description} Track your application to ${company.name} on jobs.adarshrust.com.`
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://jobs.adarshrust.com/companies/${slug}`,
      type: "website",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  }
}

export default async function CompanyPage({ params }: PageProps) {
  const { slug } = await params
  const session = await getSession()
  const company = await getCompanyBySlug(slug, session?.user?.id)

  if (!company) notFound()

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: company.name,
    description: company.description,
    url: company.careersUrl,
    ...(company.logoUrl ? { logo: company.logoUrl } : {}),
  }

  return (
    <SessionProvider>
      <Navbar />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="flex-1 mx-auto max-w-3xl w-full px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href="/companies"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          All companies
        </Link>

        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 h-14 w-14 rounded-lg bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center">
              {company.logoUrl ? (
                <Image
                  src={company.logoUrl}
                  alt={`${company.name} logo`}
                  width={56}
                  height={56}
                  className="h-full w-full object-contain p-2"
                  unoptimized
                />
              ) : (
                <span className="text-lg font-bold text-muted-foreground">
                  {company.name.slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-foreground">{company.name}</h1>
              <p className="text-sm text-muted-foreground mt-1">{company.description}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 mt-5">
            {company.remote && (
              <Badge variant="outline" className="text-xs text-green-400 border-green-800/60 bg-green-950/30">
                Remote
              </Badge>
            )}
            {company.rustLevel !== "NONE" && (
              <Badge variant="outline" className="text-xs text-orange-400 border-orange-800/60 bg-orange-950/30">
                🦀 {RUST_LEVEL_LABELS[company.rustLevel]}
              </Badge>
            )}
            {company.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs bg-white/5 text-zinc-400 border-white/5">
                {tag}
              </Badge>
            ))}
          </div>

          {company.atsProvider && (
            <p className="text-xs text-muted-foreground mt-3">
              ATS: <span className="text-foreground">{company.atsProvider}</span>
            </p>
          )}

          <div className="flex flex-wrap gap-2 mt-6">
            <a
              href={company.careersUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ size: "sm" }) + " h-8"}
            >
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              Careers page
            </a>
            {company.loginUrl && (
              <a
                href={company.loginUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ size: "sm", variant: "secondary" }) + " h-8 bg-white/5 hover:bg-white/10"}
              >
                <Globe className="mr-1.5 h-3.5 w-3.5" />
                Login portal
              </a>
            )}
          </div>
        </div>

        {/* Application Tracking */}
        {session ? (
          <div className="mt-4 rounded-xl border border-border bg-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Your application</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Track your status, notes, and interview progress
                </p>
              </div>
              {company.application && (
                <StatusBadge status={company.application.status} />
              )}
            </div>

            {company.application ? (
              <div className="space-y-3 text-sm">
                {company.application.appliedAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-xs">Applied</span>
                    <span className="text-xs text-foreground">
                      {new Date(company.application.appliedAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {company.application.recruiterName && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-xs">Recruiter</span>
                    <span className="text-xs text-foreground">{company.application.recruiterName}</span>
                  </div>
                )}
                {company.application.salary && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-xs">Comp</span>
                    <span className="text-xs text-foreground">{company.application.salary}</span>
                  </div>
                )}
                {company.application.reminderDate && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-xs">Reminder</span>
                    <span className="text-xs text-foreground">
                      {new Date(company.application.reminderDate).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {company.application.notes && (
                  <div className="pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-1">Notes</p>
                    <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                      {company.application.notes}
                    </p>
                  </div>
                )}

                <div className="pt-3">
                  <ApplicationDialog
                    companyId={company.id}
                    companyName={company.name}
                    application={company.application}
                    trigger={
                      <Button size="sm" variant="secondary" className="h-7 text-xs bg-white/5 hover:bg-white/10">
                        Edit application
                      </Button>
                    }
                  />
                </div>
              </div>
            ) : (
              <ApplicationDialog
                companyId={company.id}
                companyName={company.name}
                application={null}
                trigger={
                  <Button size="sm" className="h-8 text-sm">
                    Track this application
                  </Button>
                }
              />
            )}
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-border bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground">
              <Link href="/login" className="text-foreground hover:underline">
                Sign in
              </Link>{" "}
              to track your application to {company.name}
            </p>
          </div>
        )}
      </main>
    </SessionProvider>
  )
}
