/**
 * CLI: write the current published snapshot to content/<type>.json.
 *
 * Materialises PostgreSQL into the canonical JSON files via the single exporter
 * in lib/pipeline/snapshot.ts. Used to generate the initial tracked snapshot
 * and for manual re-exports (npm run db:export). The pipeline uses the same
 * exportSnapshot() at publish time; this script is the local/CLI entrypoint.
 *
 * Fail-closed: exportSnapshot() builds every file in memory first, so a DB
 * failure aborts before anything is written.
 *
 * Run: tsx scripts/export-snapshot.ts
 */
import { writeFileSync, mkdirSync, existsSync } from "fs"
import { join } from "path"
import { config } from "dotenv"

// Load env before the Prisma client is constructed (dynamic import in main()).
config({ path: ".env.local" })
config()

async function main() {
  const { exportSnapshot } = await import("@/lib/pipeline/snapshot")
  const files = await exportSnapshot()
  const dir = join(process.cwd(), "content")
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  for (const file of files) {
    writeFileSync(join(process.cwd(), file.path), file.content, "utf-8")
    console.log(`  ✓ ${file.path} (${file.content.length} bytes)`)
  }
  console.log(`\n✓ Wrote ${files.length} snapshot files`)
}

main().catch((err) => {
  console.error(`✗ export-snapshot: failed reading from DB (no files written): ${(err as Error)?.message ?? err}`)
  process.exit(1)
})
