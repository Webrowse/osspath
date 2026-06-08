import rawJobs from "./jobs.json"

export type EditorialJob = {
  company: string
  role: string
  href: string
  note: string
  tags: string[]
  topics: string[]
  source: string
  rustMentioned: boolean
  remoteConfirmed: boolean
  checkedAt: string
  expiresAt: string
}

export const JOBS = rawJobs as unknown as EditorialJob[]
