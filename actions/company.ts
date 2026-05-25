"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { ApplicationStatus } from "@/lib/generated/prisma"

export async function saveCompany(companyId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  await prisma.savedCompany.upsert({
    where: { userId_companyId: { userId: session.user.id, companyId } },
    create: { userId: session.user.id, companyId },
    update: {},
  })

  revalidatePath("/dashboard")
  revalidatePath("/companies")
}

export async function unsaveCompany(companyId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  await prisma.savedCompany.deleteMany({
    where: { userId: session.user.id, companyId },
  })

  revalidatePath("/dashboard")
  revalidatePath("/companies")
}

export async function upsertApplication(
  companyId: string,
  data: {
    status?: ApplicationStatus
    appliedAt?: string | null
    notes?: string | null
    recruiterName?: string | null
    salary?: string | null
    reminderDate?: string | null
  }
) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const parsed = {
    status: data.status ?? "WISHLIST",
    appliedAt: data.appliedAt ? new Date(data.appliedAt) : null,
    notes: data.notes ?? null,
    recruiterName: data.recruiterName ?? null,
    salary: data.salary ?? null,
    reminderDate: data.reminderDate ? new Date(data.reminderDate) : null,
  } as const

  await prisma.application.upsert({
    where: { userId_companyId: { userId: session.user.id, companyId } },
    create: { userId: session.user.id, companyId, ...parsed },
    update: parsed,
  })

  revalidatePath("/dashboard")
  revalidatePath("/companies")
}

export async function deleteApplication(companyId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  await prisma.application.deleteMany({
    where: { userId: session.user.id, companyId },
  })

  revalidatePath("/dashboard")
  revalidatePath("/companies")
}
