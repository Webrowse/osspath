import Link from "next/link"
import { getSession } from "@/lib/auth"
import { buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SessionProvider } from "@/components/session-provider"
import { Navbar } from "@/components/navbar"
import {
  ArrowRight,
  Bookmark,
  Building2,
  CheckCircle2,
  ExternalLink,
  Layers,
  Search,
  SlidersHorizontal,
  Zap,
} from "lucide-react"

const FEATURED_COMPANIES = [
  { name: "Cloudflare", slug: "cloudflare", tags: ["Rust", "Infrastructure"] },
  { name: "Fly.io", slug: "fly-io", tags: ["Rust", "Cloud"] },
  { name: "Oxide Computer", slug: "oxide-computer", tags: ["Rust", "Systems"] },
  { name: "Turso", slug: "turso", tags: ["Rust", "Databases"] },
  { name: "Zed Industries", slug: "zed-industries", tags: ["Rust", "DevTools"] },
  { name: "ClickHouse", slug: "clickhouse", tags: ["Databases", "Performance"] },
]

const FEATURES = [
  {
    icon: <Bookmark className="h-5 w-5" />,
    title: "Save companies",
    description: "Bookmark companies you want to apply to. Build your target list.",
  },
  {
    icon: <CheckCircle2 className="h-5 w-5" />,
    title: "Track applications",
    description: "Mark applied, set interview stages, log notes and salary expectations.",
  },
  {
    icon: <Search className="h-5 w-5" />,
    title: "Instant search",
    description: "Find companies by name, tag, or tech stack instantly.",
  },
  {
    icon: <SlidersHorizontal className="h-5 w-5" />,
    title: "Filter by focus",
    description: "Filter for Rust, remote, infra, backend, distributed systems.",
  },
  {
    icon: <ExternalLink className="h-5 w-5" />,
    title: "Quick access",
    description: "One-click to careers pages and login portals. No more link hunting.",
  },
  {
    icon: <Zap className="h-5 w-5" />,
    title: "Fast and focused",
    description: "No bloat. No social feed. Just your applications, organized.",
  },
]

const CATEGORIES = [
  { label: "🦀 Rust", query: "rust=1" },
  { label: "Backend", query: "tag=Backend" },
  { label: "Infrastructure", query: "tag=Infrastructure" },
  { label: "DevTools", query: "tag=DevTools" },
  { label: "Databases", query: "tag=Databases" },
  { label: "Distributed Systems", query: "tag=Distributed+Systems" },
  { label: "Security", query: "tag=Security" },
  { label: "AI Infra", query: "tag=AI+Infra" },
  { label: "Cloud", query: "tag=Cloud" },
  { label: "Networking", query: "tag=Networking" },
  { label: "Performance", query: "tag=Performance" },
  { label: "Open Source", query: "tag=Open+Source" },
]

const COMPANY_COUNT = 54

export default async function HomePage() {
  const session = await getSession()
  const companyCount = COMPANY_COUNT

  return (
    <SessionProvider>
      <Navbar />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden pt-20 pb-16 sm:pt-28 sm:pb-24">
          <div className="absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(255,255,255,0.04),transparent)]" />
          </div>
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
            <Badge variant="outline" className="mb-6 text-xs border-white/15 text-muted-foreground">
              {companyCount}+ curated companies
            </Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-tight">
              Track all your remote job
              <br />
              <span className="text-zinc-400">applications in one place.</span>
            </h1>
            <p className="mt-6 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Rust, backend, systems, infra, distributed systems, and remote engineering companies.
              Stop losing track of where you applied.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/companies" className={buttonVariants({ size: "lg" }) + " w-full sm:w-auto h-11 px-6"}>
                Explore Companies
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link
                href={session ? "/dashboard" : "/login"}
                className={buttonVariants({ size: "lg", variant: "secondary" }) + " w-full sm:w-auto h-11 px-6 bg-white/5 hover:bg-white/10 border-white/10"}
              >
                {session ? "Open Dashboard" : "Start Tracking"}
              </Link>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-16 border-t border-border">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
                Everything you need to stay organized
              </h2>
              <p className="mt-3 text-muted-foreground">
                Built for engineers who apply to dozens of companies.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {FEATURES.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-lg border border-border bg-card p-5 space-y-2"
                >
                  <div className="text-muted-foreground">{feature.icon}</div>
                  <h3 className="font-medium text-sm text-foreground">{feature.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Featured Companies */}
        <section className="py-16 border-t border-border">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-xl font-bold text-foreground">Featured Companies</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Curated remote-first engineering companies
                </p>
              </div>
              <Link href="/companies" className={buttonVariants({ variant: "ghost", size: "sm" }) + " text-muted-foreground hover:text-foreground"}>
                View all
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {FEATURED_COMPANIES.map((company) => (
                <Link
                  key={company.slug}
                  href={`/companies/${company.slug}`}
                  className="flex flex-col items-center gap-2 rounded-lg border border-border bg-card p-4 hover:border-white/20 transition-colors"
                >
                  <div className="h-10 w-10 rounded-md bg-white/5 flex items-center justify-center text-sm font-bold text-muted-foreground">
                    {company.name.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-xs font-medium text-foreground text-center">
                    {company.name}
                  </span>
                  <div className="flex flex-wrap gap-1 justify-center">
                    {company.tags.slice(0, 1).map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] text-muted-foreground bg-white/5 px-1.5 py-0.5 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Categories */}
        <section className="py-16 border-t border-border">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8">
              <h2 className="text-xl font-bold text-foreground">Browse by category</h2>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {CATEGORIES.map((cat) => (
                <Link
                  key={cat.label}
                  href={`/companies?${cat.query}`}
                  className="text-sm px-4 py-2 rounded-full border border-border bg-card text-muted-foreground hover:text-foreground hover:border-white/20 transition-colors"
                >
                  {cat.label}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 border-t border-border">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-xl border border-border bg-card p-8 sm:p-12 text-center">
              <div className="flex justify-center mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/10">
                  <Layers className="h-6 w-6 text-white" />
                </div>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
                Your application cockpit
              </h2>
              <p className="mt-3 text-muted-foreground max-w-lg mx-auto">
                See every company you&apos;re tracking, their status, your notes, and reminders —
                all in one compact dashboard.
              </p>
              <div className="mt-8">
                <Link href={session ? "/dashboard" : "/login"} className={buttonVariants({ size: "lg" }) + " h-11 px-8"}>
                  {session ? "Open my dashboard" : "Get started — it's free"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground font-medium">jobs.adarshrust.com</span>
            </div>
            <div className="flex items-center gap-6 text-xs text-muted-foreground">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                GitHub
              </a>
              <a
                href="https://x.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                Twitter/X
              </a>
              <Link href="/privacy" className="hover:text-foreground transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-foreground transition-colors">
                Terms
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </SessionProvider>
  )
}
