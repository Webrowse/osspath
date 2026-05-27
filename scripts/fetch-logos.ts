/**
 * Fetch and store company logos locally.
 * Run: tsx scripts/fetch-logos.ts
 *
 * Sources (in order):
 *   1. Simple Icons CDN — SVG, covers most tech brands
 *   2. Clearbit Logo API — PNG fallback using company domain
 *
 * Saves to public/logos/{slug}.{svg|png} and updates logoUrl in DB.
 */

import dotenv from "dotenv"
dotenv.config({ path: ".env.local" })
dotenv.config()

import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import * as fs from "fs"
import * as path from "path"
import * as https from "https"
import * as http from "http"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

// Simple Icons slug: lowercase, strip all non-alphanumeric
function toSiSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
}

// company.slug → Simple Icons slug (empty string = skip SI, go to next source)
const SI_OVERRIDES: Record<string, string> = {
  "grafana-labs": "grafana",
  "red-hat": "redhat",
  "cockroach-labs": "cockroachlabs",
  "hugging-face": "huggingface",
  "tokio-rs": "tokio",
  "1password": "1password",
  "apple-sear": "apple",
  "google-android": "google",
  // No Simple Icons entry
  "fly-io": "",
  "zed-industries": "",
  "aws": "",
  "microsoft-rust": "",
  "embark-studios": "",
  "parity-technologies": "",
  "oxide-computer": "",
  "ferrous-systems": "",
  "materialize": "",
  "turso": "",
  "sourcegraph": "",
  "ardan-labs": "",
  "mux": "",
  "svix": "",
  "tremor": "",
  "turing": "",
}

// company.slug → domain for Google favicon (override when careersUrl domain is wrong)
const FAVICON_DOMAIN_OVERRIDES: Record<string, string> = {
  "aws": "aws.amazon.com",
  "microsoft-rust": "microsoft.com",
  "apple-sear": "apple.com",
  "google-android": "google.com",
  "fly-io": "fly.io",
  "zed-industries": "zed.dev",
  "ferrous-systems": "ferrous-systems.com",
  "parity-technologies": "parity.io",
  "ardan-labs": "ardanlabs.com",
  "tremor": "tremor.rs",
  "embark-studios": "embark-studios.com",
}

// ATS-hosted careers pages — domain is the ATS, not the company
const ATS_DOMAINS = ["lever.co", "greenhouse.io", "workable.com", "ashbyhq.com", "jobs.lever.co"]

function extractDomain(careersUrl: string): string | null {
  try {
    const parsed = new URL(careersUrl)
    let hostname = parsed.hostname.replace(/^www\./, "")

    if (ATS_DOMAINS.some((d) => hostname.includes(d))) return null

    // Strip common subdomain prefixes that aren't part of the brand
    for (const prefix of ["about.", "careers.", "jobs.", "apply.", "hire.", "work."]) {
      if (hostname.startsWith(prefix)) {
        hostname = hostname.slice(prefix.length)
        break
      }
    }

    return hostname
  } catch {
    return null
  }
}

type FetchResult = { data: Buffer; contentType: string }

function fetchUrl(targetUrl: string, redirects = 0): Promise<FetchResult | null> {
  if (redirects > 3) return Promise.resolve(null)
  return new Promise((resolve) => {
    const parsed = new URL(targetUrl)
    const client = parsed.protocol === "https:" ? https : http
    const req = client.get(targetUrl, { timeout: 8000 }, (res) => {
      if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
        resolve(fetchUrl(res.headers.location, redirects + 1))
        return
      }
      if (!res.statusCode || res.statusCode >= 400) {
        res.resume()
        resolve(null)
        return
      }
      const chunks: Buffer[] = []
      res.on("data", (chunk: Buffer) => chunks.push(chunk))
      res.on("end", () =>
        resolve({ data: Buffer.concat(chunks), contentType: res.headers["content-type"] ?? "" })
      )
      res.on("error", () => resolve(null))
    })
    req.on("error", () => resolve(null))
    req.on("timeout", () => {
      req.destroy()
      resolve(null)
    })
  })
}

async function main() {
  const logosDir = path.join(process.cwd(), "public", "logos")
  fs.mkdirSync(logosDir, { recursive: true })

  const companies = await prisma.company.findMany({
    select: { id: true, name: true, slug: true, careersUrl: true, logoUrl: true },
    orderBy: { name: "asc" },
  })

  let fetched = 0, skipped = 0, missed = 0

  for (const company of companies) {
    if (company.logoUrl?.startsWith("/logos/")) {
      process.stdout.write(`  skip  ${company.name}\n`)
      skipped++
      continue
    }

    let buf: Buffer | null = null
    let ext = "png"
    let source = ""

    // ── 1. Simple Icons (SVG) ─────────────────────────────────────────────────
    const siKey = SI_OVERRIDES[company.slug]
    const siSlug = siKey !== undefined ? siKey : toSiSlug(company.name)

    if (siSlug) {
      const res = await fetchUrl(`https://cdn.simpleicons.org/${siSlug}`)
      if (res && res.contentType.includes("svg") && res.data.length > 100) {
        buf = res.data
        ext = "svg"
        source = `si:${siSlug}`
      }
    }

    // ── 2. Clearbit (PNG) ────────────────────────────────────────────────────
    if (!buf && company.careersUrl) {
      const domain = extractDomain(company.careersUrl)
      if (domain) {
        const res = await fetchUrl(`https://logo.clearbit.com/${domain}`)
        if (res && res.data.length > 500) {
          buf = res.data
          ext = res.contentType.includes("svg") ? "svg" : "png"
          source = `clearbit:${domain}`
        }
      }
    }

    // ── 3. Google favicon (PNG, 128×128) ────────────────────────────────────
    if (!buf) {
      const domain =
        FAVICON_DOMAIN_OVERRIDES[company.slug] ??
        (company.careersUrl ? extractDomain(company.careersUrl) : null)
      if (domain) {
        const res = await fetchUrl(
          `https://www.google.com/s2/favicons?domain=${domain}&sz=256`
        )
        // Google returns a ~726-byte globe placeholder when no icon exists — accept smaller ones
        if (res && res.data.length > 280 && res.data.length < 720 && !res.contentType.includes("html")) {
          buf = res.data
          ext = "png"
          source = `gfavicon:${domain}`
        }
      }
    }

    if (!buf) {
      process.stdout.write(`  miss  ${company.name}\n`)
      missed++
      continue
    }

    const fileName = `${company.slug}.${ext}`
    fs.writeFileSync(path.join(logosDir, fileName), buf)

    await prisma.company.update({
      where: { id: company.id },
      data: { logoUrl: `/logos/${fileName}` },
    })

    process.stdout.write(`  ok    ${company.name.padEnd(30)} /logos/${fileName}  (${source})\n`)
    fetched++

    // Polite rate limiting
    await new Promise((r) => setTimeout(r, 120))
  }

  process.stdout.write(`\nDone: ${fetched} fetched, ${skipped} already local, ${missed} missed\n`)
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
