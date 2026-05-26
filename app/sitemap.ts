import { MetadataRoute } from "next"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

const BASE = "https://jobs.adarshrust.com"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const companies = await prisma.company.findMany({
    select: { slug: true, updatedAt: true },
  })

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: new Date(), changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE}/companies`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/workflow`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/changelog`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.5 },
    { url: `${BASE}/privacy`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE}/terms`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.2 },
  ]

  const companyPages: MetadataRoute.Sitemap = companies.map((c: any) => ({
    url: `${BASE}/companies/${c.slug}`,
    lastModified: c.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }))

  return [...staticPages, ...companyPages]
}
