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
  stars?: number
}

export const OSS_PATHS = rawOSS as OSSPath[]
