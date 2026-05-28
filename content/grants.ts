import rawGrants from "./grants.json"

export type GrantKind = "Grant" | "Bounty" | "Hackathon" | "Sponsorship"

export type EditorialGrant = {
  kind: GrantKind
  name: string
  description: string
  status: string
  href: string
  checkedAt: string
  expiresAt?: string
}

export const GRANTS = rawGrants as EditorialGrant[]
