import rawCompanies from "./companies.json"

export type EcosystemCompany = {
  name: string
  sector: string
  href: string
  note?: string
}

export const COMPANIES = rawCompanies as EcosystemCompany[]
