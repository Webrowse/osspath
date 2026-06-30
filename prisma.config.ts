import dotenv from "dotenv"
dotenv.config({ path: ".env.local" })
dotenv.config()

import { defineConfig } from "prisma/config"
import { PrismaPg } from "@prisma/adapter-pg"

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrate: {
    async adapter(datasourceUrl: string) {
      return new PrismaPg({ connectionString: datasourceUrl })
    },
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
})
