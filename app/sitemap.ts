import { MetadataRoute } from "next"
import { getQualifiedCrates } from "@/lib/deps-data"
import { getQualifiedTopics } from "@/lib/topics-data"

export const dynamic = "force-dynamic"

const BASE = "https://jobs.adarshrust.com"

async function getStaticUrls(): Promise<MetadataRoute.Sitemap> {
  return [
    { url: BASE,                       lastModified: new Date(), changeFrequency: "weekly",  priority: 1.0 },
    { url: `${BASE}/oss`,              lastModified: new Date(), changeFrequency: "weekly",  priority: 0.9 },
    { url: `${BASE}/jobs`,             lastModified: new Date(), changeFrequency: "daily",   priority: 0.9 },
    { url: `${BASE}/ecosystem`,        lastModified: new Date(), changeFrequency: "weekly",  priority: 0.8 },
    { url: `${BASE}/grants`,           lastModified: new Date(), changeFrequency: "weekly",  priority: 0.8 },
    { url: `${BASE}/events`,           lastModified: new Date(), changeFrequency: "weekly",  priority: 0.7 },
    { url: `${BASE}/pulse`,            lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/portals`,          lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/deps`,             lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/privacy`,          lastModified: new Date(), changeFrequency: "yearly",  priority: 0.2 },
    { url: `${BASE}/terms`,            lastModified: new Date(), changeFrequency: "yearly",  priority: 0.2 },
  ]
}

async function getDependencyUrls(): Promise<MetadataRoute.Sitemap> {
  return getQualifiedCrates().map((crate) => ({
    url: `${BASE}/deps/${crate}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }))
}

async function getTopicUrls(): Promise<MetadataRoute.Sitemap> {
  return getQualifiedTopics().map((topic) => ({
    url: `${BASE}/topics/${topic}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }))
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [staticUrls, depUrls, topicUrls] = await Promise.all([
    getStaticUrls(),
    getDependencyUrls(),
    getTopicUrls(),
  ])
  return [...staticUrls, ...depUrls, ...topicUrls]
}
