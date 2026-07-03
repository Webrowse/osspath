import rawGrants from "./grants.json"
import type { EcoTag } from "@/lib/eco-tags"

export type ProgramKind =
  | "grant"
  | "fellowship"
  | "hackathon"
  | "bounty-program"
  | "sponsorship"
  | "treasury"
  | "hardship"

export type ProgramStatus =
  | "open"
  | "rolling"
  | "periodic"
  | "closed"
  | "paused"

export type FundingProgram = {
  slug:         string
  name:         string
  kind:         ProgramKind
  funder_slug:  string
  description:  string
  href:         string
  status:       ProgramStatus
  checkedAt:    string
  ecosystems?:       EcoTag[]
  max_award?:        string
  max_award_usd?:    number
  currency?:         string
  eligibility?:      string
  experience_level?: ("beginner" | "intermediate" | "senior" | "any")[]
  next_deadline?:    string
  rounds_per_year?:  number
  funded_repos?:     string[]
  chain?:            string
  governance_track?: string
  expiresAt?:        string
}

export const GRANTS = rawGrants as unknown as FundingProgram[]
