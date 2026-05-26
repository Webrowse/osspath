export const USER_COMPANY_STATUSES = [
  "NOT_APPLIED",
  "SAVED",
  "APPLIED",
  "OA",
  "RECRUITER_CALL",
  "INTERVIEWING",
  "FINAL_ROUND",
  "OFFER",
  "REJECTED",
  "GHOSTED",
  "NO_OPENINGS",
  "HIRING_FREEZE",
  "NOT_INTERESTED",
] as const

export type UserCompanyStatus =
  (typeof USER_COMPANY_STATUSES)[number]
