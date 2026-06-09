import { MetadataRoute } from "next"
import { prisma } from "@/lib/prisma"
import { getQualifiedCrates } from "@/lib/deps-data"
import { getQualifiedTopics } from "@/lib/topics-data"

export const dynamic = "force-dynamic"

const BASE = "https://jobs.adarshrust.com"

// ── Static editorial pages ─────────────────────────────────────────────────────
// Update priority/frequency here when content velocity changes.
async function getStaticUrls(): Promise<MetadataRoute.Sitemap> {
  return [
    { url: BASE,                       lastModified: new Date(), changeFrequency: "weekly",  priority: 1.0 },
    { url: `${BASE}/oss`,              lastModified: new Date(), changeFrequency: "weekly",  priority: 0.9 },
    { url: `${BASE}/jobs`,             lastModified: new Date(), changeFrequency: "daily",   priority: 0.9 },
    { url: `${BASE}/companies`,        lastModified: new Date(), changeFrequency: "daily",   priority: 0.9 },
    { url: `${BASE}/events`,           lastModified: new Date(), changeFrequency: "weekly",  priority: 0.8 },
    { url: `${BASE}/grants`,           lastModified: new Date(), changeFrequency: "weekly",  priority: 0.8 },
    { url: `${BASE}/pulse`,            lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/portals`,          lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/ecosystem`,        lastModified: new Date(), changeFrequency: "weekly",  priority: 0.7 },
    { url: `${BASE}/opportunities`,    lastModified: new Date(), changeFrequency: "daily",   priority: 0.7 },
    { url: `${BASE}/sources`,          lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/workflow`,         lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/changelog`,        lastModified: new Date(), changeFrequency: "weekly",  priority: 0.4 },
    { url: `${BASE}/privacy`,          lastModified: new Date(), changeFrequency: "yearly",  priority: 0.2 },
    { url: `${BASE}/terms`,            lastModified: new Date(), changeFrequency: "yearly",  priority: 0.2 },
  ]
}

// ── Dynamic: workspace company pages ──────────────────────────────────────────
async function getCompanyUrls(): Promise<MetadataRoute.Sitemap> {
  const companies = await prisma.company.findMany({
    select: { slug: true, updatedAt: true },
  })
  return companies.map((c) => ({
    url: `${BASE}/companies/${c.slug}`,
    lastModified: c.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }))
}

// ── Dynamic: /deps/{crate} ─────────────────────────────────────────────────────
async function getDependencyUrls(): Promise<MetadataRoute.Sitemap> {
  return getQualifiedCrates().map((crate) => ({
    url: `${BASE}/deps/${crate}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }))
}

// ── Dynamic: /topics/{topic} ──────────────────────────────────────────────────
async function getTopicUrls(): Promise<MetadataRoute.Sitemap> {
  return getQualifiedTopics().map((topic) => ({
    url: `${BASE}/topics/${topic}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }))
}

// ── Plug-in point for future dynamic routes ────────────────────────────────────
// async function getOrgUrls(): Promise<MetadataRoute.Sitemap> {
//   // Aggregate owners from content/oss.json, emit /orgs/{owner}
// }

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [staticUrls, companyUrls, depUrls, topicUrls] = await Promise.all([
    getStaticUrls(),
    getCompanyUrls(),
    getDependencyUrls(),
    getTopicUrls(),
  ])
  return [...staticUrls, ...companyUrls, ...depUrls, ...topicUrls]
}
