import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

/**
 * Audit trail for manual curation. Every human change made through the admin
 * records what changed, when, and why - the accountability layer that makes
 * hand overrides trustworthy. Append-only: the app never updates or deletes
 * rows.
 *
 * Fail-open on a missing table (P2021): a checkout whose code is ahead of the
 * database schema (before `npm run db:sync-schema`) must not brick curation
 * actions - same tolerance the dashboard applies to publish_metadata.
 */

export type AuditEntry = {
  id: string
  actor: string
  action: string
  target: string
  changes: unknown
  reason: string | null
  createdAt: Date
}

export async function recordAudit(entry: {
  action: string
  target: string
  changes?: unknown
  reason?: string | null
}): Promise<void> {
  const session = await auth()
  const actor = session?.user?.email ?? "unknown"
  try {
    await prisma.auditLog.create({
      data: {
        actor,
        action: entry.action,
        target: entry.target,
        changes: (entry.changes ?? undefined) as never,
        reason: entry.reason?.trim() || null,
      },
    })
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === "P2021") {
      console.warn("[audit] audit_log table missing - run `npm run db:sync-schema`. Entry dropped:", entry.action, entry.target)
      return
    }
    throw e
  }
}

export type AuditFilter = {
  action?: string
  target?: string
  limit?: number
}

export async function listAudit(filter: AuditFilter = {}): Promise<AuditEntry[]> {
  const { action, target, limit = 200 } = filter
  try {
    const rows = await prisma.auditLog.findMany({
      where: {
        ...(action ? { action: { startsWith: action } } : {}),
        ...(target ? { target: { contains: target, mode: "insensitive" } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(limit, 500),
    })
    return rows.map((r) => ({
      id: r.id,
      actor: r.actor,
      action: r.action,
      target: r.target,
      changes: r.changes,
      reason: r.reason,
      createdAt: r.createdAt,
    }))
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === "P2021") return []
    throw e
  }
}

/** Distinct action prefixes present in the log, for the filter dropdown. */
export async function listAuditActions(): Promise<string[]> {
  try {
    const rows = await prisma.auditLog.findMany({ distinct: ["action"], select: { action: true }, orderBy: { action: "asc" } })
    return rows.map((r) => r.action)
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === "P2021") return []
    throw e
  }
}
