import { unstable_cache } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WhereClause = any

function buildWhere(
  search: string,
  tags: string[],
  remoteOnly: boolean,
  rustOnly: boolean,
): WhereClause {
  const where: WhereClause = {}
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ]
  }
  if (remoteOnly) where.remote = true
  if (rustOnly) where.rustLevel = { not: "NONE" }
  if (tags.length > 0) where.tags = { hasSome: tags }
  return where
}

// Base company list — cached 60s, shared across all users
const fetchBaseCompanies = unstable_cache(
  async (search: string, tags: string[], remoteOnly: boolean, rustOnly: boolean) =>
    prisma.company.findMany({
      where: buildWhere(search, tags, remoteOnly, rustOnly),
      orderBy: { name: "asc" },
    }),
  ["companies-list"],
  { revalidate: 60 },
)

// Individual company — cached 60s
const fetchBaseCompany = unstable_cache(
  async (slug: string) => prisma.company.findUnique({ where: { slug } }),
  ["company-by-slug"],
  { revalidate: 60 },
)

// User-specific overlay — always fresh, fetches all in two queries
async function getUserData(userId: string) {
  const [applications, saved] = await Promise.all([
    prisma.application.findMany({
      where: { userId },
      select: {
        companyId: true,
        status: true,
        appliedAt: true,
        notes: true,
        salary: true,
        recruiterName: true,
        reminderDate: true,
      },
    }),
    prisma.savedCompany.findMany({
      where: { userId },
      select: { companyId: true },
    }),
  ])
  return {
    applicationMap: new Map(applications.map((a) => [a.companyId, a])),
    savedSet: new Set(saved.map((s) => s.companyId)),
  }
}

export async function getCompanies(opts?: {
  search?: string
  tags?: string[]
  remoteOnly?: boolean
  rustOnly?: boolean
  userId?: string
}) {
  const search = opts?.search ?? ""
  const tags = opts?.tags ?? []
  const remoteOnly = opts?.remoteOnly ?? false
  const rustOnly = opts?.rustOnly ?? false
  const userId = opts?.userId

  // Cached company list and user data fetched in parallel
  const [companies, userData] = await Promise.all([
    fetchBaseCompanies(search, tags, remoteOnly, rustOnly),
    userId ? getUserData(userId) : Promise.resolve(null),
  ])

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
    createdAt: c.createdAt,
    application: userData ? (userData.applicationMap.get(c.id) ?? null) : undefined,
    isSaved: userData ? userData.savedSet.has(c.id) : undefined,
  }))
}

export type CompanyListItem = Awaited<ReturnType<typeof getCompanies>>[number]

export async function getCompanyBySlug(slug: string, userId?: string) {
  // Cached company and user data fetched in parallel
  const [company, userData] = await Promise.all([
    fetchBaseCompany(slug),
    userId ? getUserData(userId) : Promise.resolve(null),
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
    createdAt: company.createdAt,
    application: userData ? (userData.applicationMap.get(company.id) ?? null) : undefined,
    isSaved: userData ? userData.savedSet.has(company.id) : undefined,
  }
}

// Dashboard data — user-specific, always fresh. Uses cached getSession for dedup.
export async function getDashboardData() {
  const session = await getSession()
  if (!session?.user?.id) return null

  const [applications, saved] = await Promise.all([
    prisma.application.findMany({
      where: { userId: session.user.id },
      include: { company: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.savedCompany.findMany({
      where: { userId: session.user.id },
      include: { company: true },
      orderBy: { createdAt: "desc" },
    }),
  ])

  return { applications, saved }
}
