import type { NextConfig } from "next"
import path from "path"

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  async redirects() {
    return [
      { source: "/companies/:path*", destination: "/", permanent: true },
      { source: "/dashboard/:path*", destination: "/", permanent: true },
      { source: "/workflow",         destination: "/", permanent: true },
      { source: "/sources",          destination: "/", permanent: true },
      { source: "/demo",             destination: "/", permanent: true },
      { source: "/opportunities",    destination: "/jobs", permanent: true },
    ]
  },
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg"],
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "logo.clearbit.com",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
}

export default nextConfig
