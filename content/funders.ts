import rawFunders from "./funders.json"
import type { EcoTag } from "@/lib/eco-tags"

export type FunderKind =
  | "foundation"
  | "company"
  | "protocol"
  | "government"
  | "platform"
  | "collective"

export type Funder = {
  slug:         string
  name:         string
  kind:         FunderKind
  description:  string
  href:         string
  checkedAt:    string
  company_slug?: string
  ecosystems?:   EcoTag[]
  github_org?:   string
  hq_country?:   string
  logo_href?:    string
  chain?:        string
}

export const FUNDERS = rawFunders as Funder[]
