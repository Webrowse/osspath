import { ApplicationStatus, RustLevel } from "@/lib/generated/prisma"

export type { ApplicationStatus, RustLevel }

export interface CompanyWithUserData {
  id: string
  name: string
  slug: string
  logoUrl: string | null
  description: string
  careersUrl: string
  loginUrl: string | null
  tags: string[]
  remote: boolean
  rustLevel: RustLevel
  atsProvider: string | null
  createdAt: Date
  application?: {
    status: ApplicationStatus
    appliedAt: Date | null
    notes: string | null
    salary: string | null
    recruiterName: string | null
    reminderDate: Date | null
  } | null
  isSaved?: boolean
}

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  WISHLIST: "Wishlist",
  APPLIED: "Applied",
  OA: "Online Assessment",
  RECRUITER_CALL: "Recruiter Call",
  INTERVIEWING: "Interviewing",
  FINAL_ROUND: "Final Round",
  OFFER: "Offer",
  REJECTED: "Rejected",
  GHOSTED: "Ghosted",
}

export const STATUS_COLORS: Record<ApplicationStatus, string> = {
  WISHLIST: "text-zinc-400 bg-zinc-800 border-zinc-700",
  APPLIED: "text-blue-400 bg-blue-950 border-blue-800",
  OA: "text-purple-400 bg-purple-950 border-purple-800",
  RECRUITER_CALL: "text-cyan-400 bg-cyan-950 border-cyan-800",
  INTERVIEWING: "text-yellow-400 bg-yellow-950 border-yellow-800",
  FINAL_ROUND: "text-orange-400 bg-orange-950 border-orange-800",
  OFFER: "text-green-400 bg-green-950 border-green-800",
  REJECTED: "text-red-400 bg-red-950 border-red-800",
  GHOSTED: "text-zinc-500 bg-zinc-900 border-zinc-700",
}

export const RUST_LEVEL_LABELS: Record<RustLevel, string> = {
  NONE: "No Rust",
  PARTIAL: "Some Rust",
  HEAVY: "Heavy Rust",
  CORE: "Rust Core",
}

export const ALL_TAGS = [
  "Rust",
  "Backend",
  "Infrastructure",
  "DevTools",
  "AI Infra",
  "Distributed Systems",
  "Databases",
  "Security",
  "Performance",
  "Cloud",
  "Linux",
  "Networking",
  "Observability",
  "Storage",
  "Compilers",
  "Open Source",
  "Systems",
] as const
