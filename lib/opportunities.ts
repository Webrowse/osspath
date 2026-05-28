import { prisma } from "@/lib/prisma"
import type { ExperienceLevel, OpportunitySource, RustSignal } from "@prisma/client"

export interface OpportunityFilters {
  q?: string
  rust?: RustSignal
  level?: ExperienceLevel
  remote?: boolean
  junior?: boolean
  oss?: boolean
  source?: OpportunitySource
  sort?: "quality" | "newest"
  page?: number
}

const PAGE_SIZE = 20

export function parseOpportunityFilters(params: URLSearchParams): OpportunityFilters {
  const rust = params.get("rust")
  const level = params.get("level")
  const source = params.get("source")
  const sort = params.get("sort")

  return {
    q: params.get("q") ?? undefined,
    rust: (rust as RustSignal) || undefined,
    level: (level as ExperienceLevel) || undefined,
    remote: params.get("remote") === "1" ? true : undefined,
    junior: params.get("junior") === "1" ? true : undefined,
    oss: params.get("oss") === "1" ? true : undefined,
    source: (source as OpportunitySource) || undefined,
    sort: sort === "newest" ? "newest" : "quality",
    page: Math.max(1, parseInt(params.get("page") ?? "1", 10) || 1),
  }
}

export async function getOpportunities(filters: OpportunityFilters) {
  const page = filters.page ?? 1
  const skip = (page - 1) * PAGE_SIZE

  // Quality floor: hide low-signal items from the default feed.
  // CURATED source items are exempt (they're hand-picked regardless of score).
  const qualityFloor = {
    OR: [
      { source: "CURATED" },
      { baseQualityScore: { gte: 58 } },
    ],
  }

  // Staleness filter: hide items older than 60 days unless CURATED or no date set.
  // Most ATS postings expire within 30–45 days; 60 days is generous.
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
  const freshnessFilter = {
    OR: [
      { source: "CURATED" },
      { postedAt: null },
      { postedAt: { gte: sixtyDaysAgo } },
    ],
  }

  const baseConditions = [qualityFloor, freshnessFilter]

  const where: Record<string, unknown> = {
    isActive: true,
    AND: baseConditions,
  }

  if (filters.q) {
    const q = filters.q.trim()
    // bodyText is excluded: ILIKE on @db.Text is a sequential scan without a GIN index.
    where.AND = [
      ...baseConditions,
      {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { companyName: { contains: q, mode: "insensitive" } },
        ],
      },
    ]
  }

  if (filters.rust) where.rustSignal = filters.rust
  if (filters.level) where.experienceLevel = filters.level
  if (filters.remote) where.isRemote = true
  if (filters.junior) where.isJuniorFriendly = true
  if (filters.oss) where.hasOssPath = true
  if (filters.source) where.source = filters.source

  const orderBy =
    filters.sort === "newest"
      ? [{ postedAt: "desc" as const }, { baseQualityScore: "desc" as const }]
      : [{ baseQualityScore: "desc" as const }, { postedAt: "desc" as const }]

  const [total, items] = await Promise.all([
    prisma.opportunity.count({ where }),
    prisma.opportunity.findMany({
      where,
      orderBy,
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        source: true,
        sourceUrl: true,
        title: true,
        companyName: true,
        companyId: true,
        location: true,
        salary: true,
        isRemote: true,
        tags: true,
        experienceLevel: true,
        rustSignal: true,
        baseQualityScore: true,
        isJuniorFriendly: true,
        hasOssPath: true,
        postedAt: true,
        company: {
          select: { slug: true, logoUrl: true },
        },
      },
    }),
  ])

  return {
    items,
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.ceil(total / PAGE_SIZE),
  }
}

export type OpportunityListItem = Awaited<ReturnType<typeof getOpportunities>>["items"][number]

export async function getOpportunitiesForCompany(companyId: string, limit = 4) {
  return prisma.opportunity.findMany({
    where: { companyId, isActive: true },
    orderBy: [{ baseQualityScore: "desc" }, { postedAt: "desc" }],
    take: limit,
    select: {
      id: true,
      title: true,
      sourceUrl: true,
      experienceLevel: true,
      rustSignal: true,
      isRemote: true,
      salary: true,
      postedAt: true,
      isJuniorFriendly: true,
    },
  })
}
