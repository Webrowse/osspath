import { MetadataRoute } from "next"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const companies = await prisma.company.findMany({
    select: { slug: true, createdAt: true },
  })

  return [
    { url: "https://jobs.adarshrust.com", lastModified: new Date() },
    { url: "https://jobs.adarshrust.com/companies", lastModified: new Date() },
    ...companies.map((c: any) => ({
      url: `https://jobs.adarshrust.com/companies/${c.slug}`,
      lastModified: c.createdAt,
    })),
  ]
}
