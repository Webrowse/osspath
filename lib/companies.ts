import { unstable_cache } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"
import type { UserCompanyStatus } from "@/lib/company-status"

// ─── Types ────────────────────────────────────────────────────────────────────

export type CompanyState = {
  status: UserCompanyStatus
  appliedAt: Date | null
  rejectedAt: Date | null
  offerReceivedAt: Date | null
  lastCheckedAt: Date | null
  lastOpeningSeenAt: Date | null
  followUpAt: Date | null
  notes: string | null
  recruiterName: string | null
  salaryExpectation: string | null
  updatedAt: Date
}

export type CompanyListItem = {
  id: string
  name: string
  slug: string
  logoUrl: string | null
  description: string
  careersUrl: string
  loginUrl: string | null
  tags: string[]
  remote: boolean
  rustLevel: string
  atsProvider: string | null
  companyType: string | null
  isHiring: boolean
  createdAt: Date
  userState: CompanyState | null
}

export type StatusCounts = Partial<Record<UserCompanyStatus, number>>

export type CompanyListResult = {
  companies: CompanyListItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  statusCounts?: StatusCounts
}

// Full dataset for client-side filtering — loaded once on initial page render
export type CompaniesClientData = {
  allCompanies: CompanyListItem[]
  statusCounts?: StatusCounts
}

// ─── Cached base queries ──────────────────────────────────────────────────────

// Full company list — no user data, cached 5 min. Used for client-side filtering.
const fetchAllCompaniesBase = unstable_cache(
  async () => prisma.company.findMany({ orderBy: { name: "asc" } }),
  ["companies-all"],
  { revalidate: 300, tags: ["companies"] },
)

// All user states for a given user — cached 30s, busted on any mutation via revalidateTag
const fetchAllUserStates = unstable_cache(
  async (userId: string) => {
    return prisma.userCompanyState.findMany({
      where: { userId },
      select: {
        companyId: true,
        status: true,
        appliedAt: true,
        rejectedAt: true,
        offerReceivedAt: true,
        lastCheckedAt: true,
        lastOpeningSeenAt: true,
        followUpAt: true,
        notes: true,
        recruiterName: true,
        salaryExpectation: true,
        updatedAt: true,
      },
    })
  },
  ["user-states-all"],
  { revalidate: 30, tags: ["user-states"] },
)

function mergeCompanies(
  companies: Awaited<ReturnType<typeof prisma.company.findMany>>,
  stateMap: Map<string, CompanyState>,
): CompanyListItem[] {
  return companies.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    logoUrl: c.logoUrl,
    description: c.description,
    careersUrl: c.careersUrl,
    loginUrl: c.loginUrl,
    tags: c.tags,
    remote: c.remote,
    rustLevel: c.rustLevel,
    atsProvider: c.atsProvider,
    companyType: c.companyType,
    isHiring: c.isHiring,
    createdAt: c.createdAt,
    userState: stateMap.get(c.id) ?? null,
  }))
}

// ─── Client-side data load (all companies + all user states, parallel) ────────

export async function getAllCompaniesForClient(userId?: string): Promise<CompaniesClientData> {
  const [baseCompanies, userStateRows] = await Promise.all([
    fetchAllCompaniesBase(),
    userId ? fetchAllUserStates(userId) : Promise.resolve([]),
  ])

  const stateMap = new Map(userStateRows.map((r) => [r.companyId, r as CompanyState]))

  const statusCounts: StatusCounts = {}
  for (const r of userStateRows) {
    statusCounts[r.status] = (statusCounts[r.status] ?? 0) + 1
  }

  return {
    allCompanies: mergeCompanies(baseCompanies, stateMap),
    statusCounts: userId ? statusCounts : undefined,
  }
}

// ─── Single company ───────────────────────────────────────────────────────────

const fetchBaseCompany = unstable_cache(
  async (slug: string) => prisma.company.findUnique({ where: { slug } }),
  ["company-by-slug"],
  { revalidate: 60, tags: ["companies"] },
)

export async function getCompanyBySlug(slug: string, userId?: string) {
  const [company, state] = await Promise.all([
    fetchBaseCompany(slug),
    userId
      ? prisma.userCompanyState.findFirst({ where: { userId, company: { slug } } })
      : Promise.resolve(null),
  ])

  if (!company) return null

  return {
    id: company.id,
    name: company.name,
    slug: company.slug,
    logoUrl: company.logoUrl,
    description: company.description,
    careersUrl: company.careersUrl,
    loginUrl: company.loginUrl,
    tags: company.tags,
    remote: company.remote,
    rustLevel: company.rustLevel,
    atsProvider: company.atsProvider,
    companyType: company.companyType,
    isHiring: company.isHiring,
    createdAt: company.createdAt,
    userState: state ?? null,
  }
}

// ─── Related companies ────────────────────────────────────────────────────────

export async function getRelatedCompanies(
  companyId: string,
  tags: string[],
  limit = 6,
): Promise<CompanyListItem[]> {
  if (tags.length === 0) return []
  const rows = await prisma.company.findMany({
    where: { id: { not: companyId }, tags: { hasSome: tags } },
    orderBy: { name: "asc" },
    take: limit,
  })
  return rows.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    logoUrl: c.logoUrl,
    description: c.description,
    careersUrl: c.careersUrl,
    loginUrl: c.loginUrl,
    tags: c.tags,
    remote: c.remote,
    rustLevel: c.rustLevel,
    atsProvider: c.atsProvider,
    companyType: c.companyType,
    isHiring: c.isHiring,
    createdAt: c.createdAt,
    userState: null,
  }))
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

const ACTIVE_PIPELINE_STATUSES = [
  "APPLIED",
  "OA",
  "RECRUITER_CALL",
  "INTERVIEWING",
  "FINAL_ROUND",
  "OFFER",
] as const

export type DashboardMetrics = {
  total: number
  activePipeline: number
  followUpsDue: number
}

export async function getDashboardData() {
  const session = await getSession()
  if (!session?.user?.id) return null

  const states = await prisma.userCompanyState.findMany({
    where: {
      userId: session.user.id,
      status: { notIn: ["NOT_APPLIED", "NOT_INTERESTED"] },
    },
    include: { company: true },
    orderBy: { updatedAt: "desc" },
  })

  // End of today in UTC — followUpAt dates on or before this are overdue
  const now = new Date()
  const todayEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59))

  const metrics: DashboardMetrics = {
    total: states.length,
    activePipeline: states.filter((s) =>
      (ACTIVE_PIPELINE_STATUSES as readonly string[]).includes(s.status)
    ).length,
    followUpsDue: states.filter(
      (s) => s.followUpAt && new Date(s.followUpAt) <= todayEnd
    ).length,
  }

  return { states, metrics }
}
