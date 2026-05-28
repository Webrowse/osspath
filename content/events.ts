import rawEvents from "./events.json"

export type EcosystemEvent = {
  day: string
  month: string
  title: string
  meta: string
  href: string
  recurring?: boolean
  checkedAt: string
  expiresAt?: string
}

export const EVENTS = rawEvents as EcosystemEvent[]
