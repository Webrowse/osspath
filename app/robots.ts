import { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/api/", "/admin/", "/demo/"],
    },
    sitemap: "https://osspath.com/sitemap.xml",
  }
}
