import rawCompanies from "./companies.json"
import type { EcoTag } from "@/lib/eco-tags"

export type OrgType   = "company" | "project" | "nonprofit"
export type OrgStatus = "active" | "acquired" | "merged" | "inactive"

export type EcosystemCompany = {
  name:            string
  slug:            string
  sector:          string
  href:            string
  github_org?:     string | null
  description?:    string
  type?:           OrgType
  ecosystems?:     EcoTag[]
  status?:         OrgStatus
  /** Slug of the acquiring/parent company. Must resolve to a valid company slug in this corpus. */
  parent_org?:     string
  /** ISO date of acquisition/status change. Format: YYYY-MM-DD. Use YYYY-MM-01 when only the month is known. */
  effective_date?: string
}

export const COMPANIES = rawCompanies as EcosystemCompany[]
