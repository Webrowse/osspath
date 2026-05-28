import type { ExperienceLevel, RustSignal } from "@prisma/client"

export function computeBaseQualityScore(opts: {
  rustSignal: RustSignal
  experienceLevel?: ExperienceLevel | null
  isRemote?: boolean | null
  hasOssPath?: boolean
  company?: { juniorAccessible: boolean; openSourceRepo: string | null } | null
}): number {
  let score = 40

  // Rust signal: the primary quality axis
  score += { CORE: 30, HIGH: 20, MEDIUM: 8, LOW: 0 }[opts.rustSignal]

  // Experience level: strongly bias toward accessible roles.
  // SENIOR/STAFF penalties are intentional — dominating with unreachable roles harms the feed.
  if (opts.experienceLevel) {
    score += { INTERN: 22, JUNIOR: 22, MID: 10, SENIOR: -10, STAFF: -22 }[opts.experienceLevel]
  }

  // Remote: core to the platform's value proposition
  if (opts.isRemote) score += 15
  else score -= 8  // soft onsite penalty — de-prioritizes foreign onsite roles

  if (opts.company?.juniorAccessible) score += 10
  if (opts.hasOssPath || opts.company?.openSourceRepo) score += 6

  return Math.max(0, Math.min(100, score))
}
