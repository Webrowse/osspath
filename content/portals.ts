import rawPortals from "./portals.json"

export type Portal = {
  name: string
  kind: string
  href: string
  description: string
  tags: string[]
}

export const PORTALS = rawPortals as Portal[]
