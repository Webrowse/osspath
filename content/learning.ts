import rawLearning from "./learning.json"

export type LearningKind = "Book" | "Reference" | "Exercises" | "Video" | "Essays" | "Article"

export type LearningItem = {
  kind: LearningKind
  title: string
  description: string
  href: string
  checkedAt: string
}

export const LEARNING = rawLearning as LearningItem[]
