"use server"

import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"
import { revalidatePath, revalidateTag } from "next/cache"
import type { UserCompanyStatus } from "@/lib/company-status"

async function requireUser() {
  const session = await getSession()
  if (!session?.user?.id) throw new Error("Unauthorized")
  return session.user.id
}

function revalidateAll() {
  revalidateTag("user-states")
  revalidatePath("/dashboard")
  revalidatePath("/companies")
}

export async function upsertCompanyState(
  companyId: string,
  data: {
    status: UserCompanyStatus
    appliedAt?: string | null
    rejectedAt?: string | null
    offerReceivedAt?: string | null
    lastCheckedAt?: string | null
    lastOpeningSeenAt?: string | null
    followUpAt?: string | null
    remindAfterDays?: number | null
    recruiterName?: string | null
    notes?: string | null
    salaryExpectation?: string | null
  },
) {
  const userId = await requireUser()

  const parsed = {
    status: data.status,
    appliedAt: data.appliedAt ? new Date(data.appliedAt) : undefined,
    rejectedAt: data.rejectedAt ? new Date(data.rejectedAt) : undefined,
    offerReceivedAt: data.offerReceivedAt ? new Date(data.offerReceivedAt) : undefined,
    lastCheckedAt: data.lastCheckedAt ? new Date(data.lastCheckedAt) : undefined,
    lastOpeningSeenAt: data.lastOpeningSeenAt ? new Date(data.lastOpeningSeenAt) : undefined,
    followUpAt: data.followUpAt ? new Date(data.followUpAt) : undefined,
    remindAfterDays: data.remindAfterDays ?? null,
    recruiterName: data.recruiterName ?? null,
    notes: data.notes ?? null,
    salaryExpectation: data.salaryExpectation ?? null,
  }

  await prisma.userCompanyState.upsert({
    where: { userId_companyId: { userId, companyId } },
    create: { userId, companyId, ...parsed },
    update: parsed,
  })

  revalidateAll()
}

export async function removeCompanyState(companyId: string) {
  const userId = await requireUser()

  await prisma.userCompanyState.deleteMany({
    where: { userId, companyId },
  })

  revalidateAll()
}

// Quick actions for the company card
export async function markCompanyStatus(companyId: string, status: UserCompanyStatus) {
  const userId = await requireUser()

  const extra: Record<string, Date | null> = {}
  if (status === "APPLIED") extra.appliedAt = new Date()
  if (status === "REJECTED") extra.rejectedAt = new Date()
  if (status === "OFFER") extra.offerReceivedAt = new Date()
  if (status === "NO_OPENINGS" || status === "HIRING_FREEZE") {
    extra.lastCheckedAt = new Date()
  }

  await prisma.userCompanyState.upsert({
    where: { userId_companyId: { userId, companyId } },
    create: { userId, companyId, status, ...extra },
    update: { status, ...extra },
  })

  revalidateAll()
}

export async function markChecked(companyId: string) {
  const userId = await requireUser()

  await prisma.userCompanyState.upsert({
    where: { userId_companyId: { userId, companyId } },
    create: { userId, companyId, lastCheckedAt: new Date() },
    update: { lastCheckedAt: new Date() },
  })

  revalidateAll()
}
