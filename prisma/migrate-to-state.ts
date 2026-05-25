import dotenv from "dotenv"
dotenv.config({ path: ".env.local" })
dotenv.config()

import { PrismaClient } from "@/lib/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

// Map old ApplicationStatus → UserCompanyStatus
const STATUS_MAP: Record<string, string> = {
  WISHLIST: "SAVED",
  APPLIED: "APPLIED",
  OA: "OA",
  RECRUITER_CALL: "RECRUITER_CALL",
  INTERVIEWING: "INTERVIEWING",
  FINAL_ROUND: "FINAL_ROUND",
  OFFER: "OFFER",
  REJECTED: "REJECTED",
  GHOSTED: "GHOSTED",
}

async function main() {
  console.log("Starting migration: applications + saved_companies → user_company_states\n")

  // 1. Load all applications
  const applications = await prisma.application.findMany()
  console.log(`Found ${applications.length} applications`)

  // 2. Load all saved companies
  const savedCompanies = await prisma.savedCompany.findMany()
  console.log(`Found ${savedCompanies.length} saved companies`)

  // 3. Build a map: `userId:companyId` → merged state
  type StateData = {
    userId: string
    companyId: string
    status: string
    appliedAt: Date | null
    rejectedAt: Date | null
    notes: string | null
    recruiterName: string | null
    salaryExpectation: string | null
    followUpAt: Date | null
    createdAt: Date
    updatedAt: Date
  }

  const stateMap = new Map<string, StateData>()

  // Seed from saved_companies first (lower priority)
  for (const s of savedCompanies) {
    const key = `${s.userId}:${s.companyId}`
    stateMap.set(key, {
      userId: s.userId,
      companyId: s.companyId,
      status: "SAVED",
      appliedAt: null,
      rejectedAt: null,
      notes: null,
      recruiterName: null,
      salaryExpectation: null,
      followUpAt: null,
      createdAt: s.createdAt,
      updatedAt: s.createdAt,
    })
  }

  // Overwrite / merge from applications (higher priority)
  for (const a of applications) {
    const key = `${a.userId}:${a.companyId}`
    const existing = stateMap.get(key)
    const newStatus = STATUS_MAP[a.status] ?? "SAVED"

    stateMap.set(key, {
      userId: a.userId,
      companyId: a.companyId,
      status: newStatus,
      appliedAt: a.appliedAt ?? null,
      rejectedAt: newStatus === "REJECTED" ? (a.updatedAt ?? null) : null,
      notes: a.notes ?? null,
      recruiterName: a.recruiterName ?? null,
      salaryExpectation: a.salary ?? null,
      followUpAt: a.reminderDate ?? null,
      createdAt: existing?.createdAt ?? a.createdAt,
      updatedAt: a.updatedAt,
    })
  }

  const states = Array.from(stateMap.values())
  console.log(`\nMigrating ${states.length} unique user-company states...`)

  let created = 0
  let skipped = 0

  for (const state of states) {
    const existing = await prisma.userCompanyState.findUnique({
      where: { userId_companyId: { userId: state.userId, companyId: state.companyId } },
    })

    if (existing) {
      skipped++
      continue
    }

    await prisma.userCompanyState.create({
      data: {
        userId: state.userId,
        companyId: state.companyId,
        status: state.status as never,
        appliedAt: state.appliedAt,
        rejectedAt: state.rejectedAt,
        notes: state.notes,
        recruiterName: state.recruiterName,
        salaryExpectation: state.salaryExpectation,
        followUpAt: state.followUpAt,
        createdAt: state.createdAt,
        updatedAt: state.updatedAt,
      },
    })
    created++
  }

  const total = await prisma.userCompanyState.count()
  console.log(`\n✓ Created: ${created}`)
  console.log(`✓ Skipped (already existed): ${skipped}`)
  console.log(`✓ Total user_company_states: ${total}`)
  console.log("\nMigration complete.")
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
