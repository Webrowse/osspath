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
  owner?: string
  license?: string | null
  pushedAt?: string
  activityTier?: "active" | "maintenance" | "dormant"
  /** @deprecated Derived from goodFirstIssuesCount which is always 0. */
  beginnerFriendly?: boolean
  ecosystem?: string[]
  dependencies?: string[]
  depsCheckedAt?: string
}

export const OSS_PATHS = rawOSS as OSSPath[]
