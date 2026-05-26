import { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/api/", "/login"],
    },
    sitemap: "https://jobs.adarshrust.com/sitemap.xml",
  }
}
