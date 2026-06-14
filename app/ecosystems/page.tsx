import type { Metadata } from "next"
import Link from "next/link"
import { EditorialLayout } from "@/components/editorial/editorial-layout"
import { getFeaturedEcosystems } from "@/lib/landing-data"
import { getOrgsByEco } from "@/lib/ecosystem-data"
import { ECO_TAG_ORDER } from "@/lib/eco-tags"
import type { EcoTag } from "@/lib/eco-tags"

export const metadata: Metadata = {
  title: "Ecosystems",
  description: "Browse the Rust ecosystem by domain. Each ecosystem groups repositories, organizations, funding opportunities, and related signals.",
  alternates: { canonical: "/ecosystems" },
  openGraph: {
    title: "Ecosystems — Rust Ecosystem",
    description: "Browse the Rust ecosystem by domain. Each ecosystem groups repositories, organizations, funding opportunities, and related signals.",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ecosystems — Rust Ecosystem",
    description: "Browse the Rust ecosystem by domain.",
    images: ["/opengraph-image"],
  },
}

const ECO_DESCRIPTIONS: Record<EcoTag, string> = {
  bevy:       "Game engine and real-time rendering — games, simulations, and interactive applications.",
  tauri:      "Cross-platform desktop and mobile applications using web frontends.",
  blockchain: "Blockchain infrastructure, smart contracts, and Web3 tooling.",
  embedded:   "Bare-metal and RTOS development for microcontrollers and constrained systems.",
  ai:         "Machine learning, data science, and AI inference at the systems layer.",
  wasm:       "WebAssembly runtimes, toolchains, compilers, and host bindings.",
  database:   "Storage engines, query layers, and data infrastructure.",
  grpc:       "RPC frameworks, protocol buffers, and network service tooling.",
  cli:        "Command-line tools, terminal UI, and shell scripting interfaces.",
  axum:       "HTTP APIs, REST services, and web frameworks built on Tower and Hyper.",
  tokio:      "Async runtimes, I/O primitives, and concurrent network programming.",
}

export default function EcosystemsIndexPage() {
  const ecosystems = getFeaturedEcosystems()
  const orgCounts = Object.fromEntries(
    ECO_TAG_ORDER.map(tag => [tag, getOrgsByEco(tag).length])
  ) as Record<EcoTag, number>

  return (
    <EditorialLayout>
      <section style={{ paddingTop: "clamp(40px, 6vw, 64px)", paddingBottom: "clamp(64px, 9vw, 104px)" }}>
        <div className="e-col">

          <div className="e-archive-header" style={{ marginBottom: 20 }}>
            <div>
              <div className="e-section__num">Directory</div>
              <h1 className="e-section__title" style={{ fontSize: "clamp(26px, 3.4vw, 32px)" }}>
                Ecosystems
              </h1>
              <p className="e-archive-meta">
                Browse the Rust ecosystem by domain. Each ecosystem groups repositories, organizations, funding opportunities, and related signals.
              </p>
            </div>
          </div>

          <div style={{ marginTop: 8, marginBottom: 32 }}>
            <span className="e-section__meta">
              {ecosystems.length} ecosystems
            </span>
          </div>

          <div className="hp-eco-grid">
            {ecosystems.map((eco) => {
              const orgCount = orgCounts[eco.tag] ?? 0
              return (
                <Link key={eco.tag} href={`/ecosystems/${eco.tag}`} className="hp-eco-card">
                  <span className="hp-eco-name">{eco.label}</span>
                  <p style={{
                    fontSize: 12,
                    color: "var(--e-fg-mute)",
                    margin: "4px 0 10px",
                    lineHeight: 1.5,
                  }}>
                    {ECO_DESCRIPTIONS[eco.tag]}
                  </p>
                  <div className="hp-eco-counts">
                    <span><b>{eco.repoCount.toLocaleString("en-US")}</b> repos</span>
                    {orgCount > 0 && (
                      <span><b>{orgCount}</b> org{orgCount !== 1 ? "s" : ""}</span>
                    )}
                    {eco.programCount > 0 && (
                      <span><b>{eco.programCount}</b> program{eco.programCount !== 1 ? "s" : ""}</span>
                    )}
                    {eco.jobCount > 0 && (
                      <span><b>{eco.jobCount}</b> job{eco.jobCount !== 1 ? "s" : ""}</span>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>

        </div>
      </section>
    </EditorialLayout>
  )
}
