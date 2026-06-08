import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL!
  const adapter = new PrismaPg({
    connectionString,
    connectionTimeoutMillis: 8_000,  // fail in 8s not 20s when DB is unreachable
    idleTimeoutMillis: 60_000,        // release idle connections after 60s
    max: 10,
  })
  return new PrismaClient({ adapter })
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
