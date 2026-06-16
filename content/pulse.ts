import rawPulse from "./pulse.json"

export type PulseKind = "Newsletter" | "Forum" | "Blog" | "Community" | "Podcast" | "Learning"

export type PulseItem = {
  kind: PulseKind
  title: string
  description: string
  href: string
  checkedAt: string
}

export const PULSE = rawPulse as PulseItem[]
