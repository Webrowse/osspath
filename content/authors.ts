import rawAuthors from "./authors.json"

export type Author = {
  name: string
  handle: string
  href: string
  writing: string
  description: string
  tags: string[]
  checkedAt: string
}

export const AUTHORS = rawAuthors as Author[]
