import { unstable_cache } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"
import type { CompanyFilters, TimeFilter } from "@/types"
import { PAGE_SIZE } from "@/types"
import type { UserCompanyStatus } from "@/lib/generated/prisma"

// ─── Where clause builders ────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyWhere = any

function buildCompanyWhere(
  filters: Pick<CompanyFilters, "q" | "tags" | "remoteOnly" | "rustOnly" | "companyType">,
): AnyWhere {
  const where: AnyWhere = {}
  if (filters.q) {
    where.OR = [
      { name: { contains: filters.q, mode: "insensitive" } },
      { description: { contains: filters.q, mode: "insensitive" } },
    ]
  }
  if (filters.remoteOnly) where.remote = true
  if (filters.rustOnly) where.rustLevel = { not: "NONE" }
  if (filters.tags.length > 0) where.tags = { hasEvery: filters.tags }
  if (filters.companyType) where.companyType = filters.companyType
  return where
}

function buildTimeCondition(timeFilter: TimeFilter, userId: string): AnyWhere {
  const now = new Date()
  const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  switch (timeFilter) {
    case "applied_today":
      return { userStates: { some: { userId, appliedAt: { gte: today } } } }
    case "applied_7d":
      return { userStates: { some: { userId, appliedAt: { gte: daysAgo(7) } } } }
    case "applied_30d":
      return { userStates: { some: { userId, appliedAt: { gte: daysAgo(30) } } } }
    case "applied_older_30d":
      return { userStates: { some: { userId, appliedAt: { lt: daysAgo(30) } } } }
    case "not_checked_7d":
      return {
        userStates: {
          some: { userId, OR: [{ lastCheckedAt: { lt: daysAgo(7) } }, { lastCheckedAt: null }] },
        },
      }
    case "not_checked_14d":
      return {
        userStates: {
          some: { userId, OR: [{ lastCheckedAt: { lt: daysAgo(14) } }, { lastCheckedAt: null }] },
        },
      }
    case "updated_7d":
      return { userStates: { some: { userId, updatedAt: { gte: daysAgo(7) } } } }
    case "follow_up_due":
      return { userStates: { some: { userId, followUpAt: { lte: now } } } }
  }
}

function buildFullWhere(filters: CompanyFilters, userId: string): AnyWhere {
  const conditions: AnyWhere[] = [buildCompanyWhere(filters)]
  const { statuses, hideNotInterested, timeFilter } = filters

  if (statuses.length > 0) {
    const hasNotApplied = statuses.includes("NOT_APPLIED")
    const others = statuses.filter((s) => s !== "NOT_APPLIED")

    if (hasNotApplied && others.length === 0) {
      conditions.push({ userStates: { none: { userId } } })
    } else if (hasNotApplied) {
      conditions.push({
        OR: [
          { userStates: { none: { userId } } },
          { userStates: { some: { userId, status: { in: others } } } },
        ],
      })
    } else {
      conditions.push({ userStates: { some: { userId, status: { in: statuses } } } })
    }
  }

  if (timeFilter) conditions.push(buildTimeCondition(timeFilter, userId))

  if (hideNotInterested) {
    conditions.push({
      NOT: { userStates: { some: { userId, status: "NOT_INTERESTED" as UserCompanyStatus } } },
    })
  }

  return conditions.length === 1 ? conditions[0] : { AND: conditions }
}

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
  { revalidate: 300 },
)

// Paginated + filtered base query — for server-side pagination fallback
const fetchBaseCompanies = unstable_cache(
  async (whereJson: string, skip: number, take: number) => {
    const where = JSON.parse(whereJson)
    const [companies, total] = await Promise.all([
      prisma.company.findMany({ where, orderBy: { name: "asc" }, skip, take }),
      prisma.company.count({ where }),
    ])
    return { companies, total }
  },
  ["companies-base"],
  { revalidate: 60 },
)

// All user states for a given user — lightweight (users track <200 companies)
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
  { revalidate: 30 },
)

// Fetch user states only for a specific set of company IDs
async function fetchUserStates(userId: string, companyIds: string[]) {
  if (companyIds.length === 0) return new Map<string, CompanyState>()
  const rows = await prisma.userCompanyState.findMany({
    where: { userId, companyId: { in: companyIds } },
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
  return new Map(rows.map((r) => [r.companyId, r as CompanyState]))
}

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

// ─── Main getCompanies ────────────────────────────────────────────────────────

export async function getCompanies(
  filters: CompanyFilters,
  userId?: string,
): Promise<CompanyListResult> {
  const skip = (filters.page - 1) * PAGE_SIZE
  const hasUserFilters =
    !!userId &&
    (filters.statuses.length > 0 || !!filters.timeFilter || filters.hideNotInterested)

  let companies: Awaited<ReturnType<typeof prisma.company.findMany>>
  let total: number

  if (hasUserFilters) {
    const where = buildFullWhere(filters, userId!)
    ;[companies, total] = await Promise.all([
      prisma.company.findMany({ where, orderBy: { name: "asc" }, skip, take: PAGE_SIZE }),
      prisma.company.count({ where }),
    ])
  } else {
    const where = buildCompanyWhere(filters)
    const result = await fetchBaseCompanies(JSON.stringify(where), skip, PAGE_SIZE)
    companies = result.companies
    total = result.total
  }

  const [stateMap, statusCountRows] = await Promise.all([
    userId
      ? fetchUserStates(userId, companies.map((c) => c.id))
      : Promise.resolve(new Map<string, CompanyState>()),
    userId
      ? prisma.userCompanyState.groupBy({
          by: ["status"],
          where: { userId },
          _count: { status: true },
        })
      : Promise.resolve([]),
  ])

  const statusCounts: StatusCounts = Object.fromEntries(
    statusCountRows.map((r) => [r.status, r._count.status]),
  )

  return {
    companies: mergeCompanies(companies, stateMap),
    total,
    page: filters.page,
    pageSize: PAGE_SIZE,
    totalPages: Math.ceil(total / PAGE_SIZE),
    statusCounts: userId ? statusCounts : undefined,
  }
}

// ─── Client-side data load (all companies + all user states, parallel) ────────

export async function getAllCompaniesForClient(userId?: string): Promise<CompaniesClientData> {
  const [baseCompanies, userStateRows] = await Promise.all([
    fetchAllCompaniesBase(),
    userId ? fetchAllUserStates(userId) : Promise.resolve([]),
  ])

  const stateMap = new Map(userStateRows.map((r) => [r.companyId, r as CompanyState]))

  // Compute statusCounts from in-memory rows — no extra DB round trip
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
  { revalidate: 60 },
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

  return { states }
}
