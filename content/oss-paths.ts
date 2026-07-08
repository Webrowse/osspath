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
  /** Tier 1 (Cargo enrichment): parsed manifest/lockfile facts. */
  enrichment?: {
    version: number
    enrichedAt: string
    enrichers: string[]
    sourcePushedAt?: string
    cargo?: {
      edition?: string | null
      msrv?: string | null
      license?: string | null
      isWorkspace?: boolean
      hasManifest?: boolean
      hasLockfile?: boolean
      lockfileCrateCount?: number | null
      features?: string[]
      keywords?: string[]
      categories?: string[]
      crates?: Array<{ name: string; path: string }>
      manifestPaths?: string[]
      dependencies?: string[]
      devDependencies?: string[]
      buildDependencies?: string[]
    }
  }
}

// Slim projection of OSSPath for the /oss browser: drops the large
// enrichment/relationships/ecosystemIntelligence blobs (most of the per-repo
// byte weight) that the client filter UI never reads. Full OSSPath objects
// satisfy this type structurally, so static detail pages can keep passing
// the full record to OSSCard without any change.
export type OSSListRepo = Pick<OSSPath,
  | "name" | "owner" | "href" | "note"
  | "stars" | "forks" | "openIssuesCount"
  | "topics" | "license" | "kind" | "activityTier"
  | "dependencies" | "labels" | "pushedAt"
> & { technologies?: string[] }
