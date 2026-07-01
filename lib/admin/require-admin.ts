import { auth } from "@/lib/auth"

/** Throws unless the current session is the configured admin account. */
export async function requireAdmin(): Promise<void> {
  const session = await auth()
  const adminEmail = process.env.ADMIN_EMAIL
  if (!adminEmail || session?.user?.email !== adminEmail) {
    throw new Error("Unauthorized")
  }
}
