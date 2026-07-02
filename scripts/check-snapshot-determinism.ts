/**
 * Determinism guard for the snapshot serialiser.
 *
 * Asserts that serialize() produces byte-identical output for equal data
 * regardless of object key insertion order, and preserves array order. This is
 * the property the Git publish step relies on to avoid spurious commits. Runs
 * without a database.
 *
 * Run: tsx scripts/check-snapshot-determinism.ts
 */
import { serialize, snapshotSha256 } from "@/lib/pipeline/snapshot"

// Same data, different key insertion order (including nested objects/arrays).
const a = { name: "ripgrep", stars: 10, meta: { lang: "rust", tags: ["cli", "search"] } }
const b = { meta: { tags: ["cli", "search"], lang: "rust" }, stars: 10, name: "ripgrep" }

const sa = serialize([a])
const sb = serialize([b])

if (sa !== sb) {
  console.error("✗ serialize() is NOT canonical - equal data produced different bytes:")
  console.error("--- a ---\n" + sa + "--- b ---\n" + sb)
  process.exit(1)
}
if (serialize([a]) !== sa) {
  console.error("✗ serialize() is not idempotent across calls")
  process.exit(1)
}
// Array order must be preserved (it carries the DB (createdAt, id) ordering).
if (!sa.includes('"cli"') || sa.indexOf('"cli"') > sa.indexOf('"search"')) {
  console.error("✗ serialize() did not preserve array order")
  process.exit(1)
}

// snapshotSha256: stable for equal content, sensitive to content and file order.
const f1 = [{ path: "content/oss.json", content: sa }, { path: "content/jobs.json", content: "[]\n" }]
const f2 = [{ path: "content/oss.json", content: serialize([b]) }, { path: "content/jobs.json", content: "[]\n" }]
if (snapshotSha256(f1) !== snapshotSha256(f2)) {
  console.error("✗ snapshotSha256 differs for equal content")
  process.exit(1)
}
if (snapshotSha256(f1) === snapshotSha256([f1[1], f1[0]])) {
  console.error("✗ snapshotSha256 is not order-sensitive")
  process.exit(1)
}
if (snapshotSha256(f1) === snapshotSha256([{ ...f1[0], content: f1[0].content + " " }, f1[1]])) {
  console.error("✗ snapshotSha256 is not content-sensitive")
  process.exit(1)
}

console.log("✓ snapshot serialisation + hash are deterministic, canonical, and order-stable")
console.log(sa)
