import rawNews from "./news.json"

export type NewsKind = "Release" | "Blog" | "Announcement" | "Tutorial" | "Discussion" | "Project"

export type NewsItem = {
  title: string
  href: string
  kind: NewsKind
  date: string
  source?: string
  blurb?: string
  checkedAt: string
}

export const NEWS = rawNews as NewsItem[]
