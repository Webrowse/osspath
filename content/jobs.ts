import rawJobs from "./jobs.json"
import type { EcoTag } from "@/lib/eco-tags"

export type EditorialJob = {
  slug:           string
  company:        string
  company_slug:   string
  role:           string
  href:           string
  note:           string
  tags:           string[]
  topics:         string[]
  ecosystems:     EcoTag[]
  rustMentioned:  boolean
  remoteConfirmed: boolean
  description?:   string
  checkedAt:      string
  expiresAt:      string
}

export const JOBS = rawJobs as unknown as EditorialJob[]
