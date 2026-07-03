import rawOSS from "./oss.json"

export type OSSPath = {
  name: string
  eco: string
  href: string
  note: string
  maintainerFriendliness: number
  issueQuality: number
  beginnerSuitability: number
  maintainerLabel: string
  issueLabel: string
  beginnerLabel: string
  topics: string[]
  checkedAt: string
  // GitHub objective metadata
  stars?: number
  forks?: number
  openIssuesCount?: number
  /** @deprecated GitHub REST API does not return this field. Always 0. Revive via GraphQL or Issues API enrichment. */
  goodFirstIssuesCount?: number
  /** @deprecated GitHub REST API does not return this field. Always 0. Revive via GraphQL or Issues API enrichment. */
  helpWantedIssuesCount?: number
  language?: string | null
  kind?: "code" | "reference"
  owner: string
  license?: string | null
  pushedAt?: string
  activityTier?: "active" | "maintenance" | "dormant"
  /** @deprecated Derived from goodFirstIssuesCount which is always 0. */
  beginnerFriendly?: boolean
  ecosystem?: string[]
  dependencies?: string[]
  depsCheckedAt?: string
  labels?: string[]
  /** Tier 2 (Corpus Intelligence): similarity + companion-crate relationships. Not yet rendered. */
  relationships?: {
    version: number
    computedAt: string
    similar: Array<{ repo: string; score: number }>
    companions: Array<{ name: string; count: number; percent: number }>
  }
  /**
   * Tier 2 (Corpus Intelligence): deterministic, rule-based ecosystem/technology/
   * domain classification from Tier 1 Cargo data. Distinct from the older `ecosystem`
   * field above. Not yet rendered.
   */
  ecosystemIntelligence?: {
    version: number
    computedAt: string
    ecosystems: string[]
    technologies: string[]
    domain: string | null
    confidence: number
    reasoning: string[]
  }
}

export const OSS_PATHS = rawOSS as OSSPath[]
