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
  parent_org?:     string
  effective_date?: string
}

export const COMPANIES = rawCompanies as EcosystemCompany[]
