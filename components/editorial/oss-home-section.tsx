import { OSSCard } from "./oss-card"
import type { OSSPath } from "@/content/oss-paths"

interface OSSHomeSectionProps {
  repos: OSSPath[]
  limit?: number
}

export function OSSHomeSection({ repos, limit = 4 }: OSSHomeSectionProps) {
  const featured = [...repos]
    .sort((a, b) => (b.stars ?? 0) - (a.stars ?? 0))
    .slice(0, limit)

  return (
    <div className="e-oss-grid">
      {featured.map(repo => (
        <OSSCard key={repo.href} repo={repo} />
      ))}
    </div>
  )
}
