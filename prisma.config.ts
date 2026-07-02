import dotenv from "dotenv"
dotenv.config({ path: ".env.local" })
dotenv.config()

import { defineConfig } from "prisma/config"

// Build/CLI operations (migrate diff, db push) prefer the public proxy URL,
// which is reachable during a Railway build; the runtime app uses the internal
// DATABASE_URL. Falls back to DATABASE_URL when no public URL is set (local dev).
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env["DATABASE_PUBLIC_URL"] ?? process.env["DATABASE_URL"],
  },
})
