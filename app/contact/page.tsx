import type { Metadata } from "next"
import Link from "next/link"
import { EditorialLayout } from "@/components/editorial/editorial-layout"
import { CONTACT_EMAIL } from "@/lib/site-config"

export const metadata: Metadata = {
  title: "Contact",
  description: "Report stale data, broken links, or suggest a repository, job, funding program, or organization.",
  alternates: { canonical: "/contact" },
}
const GITHUB_PROFILE = "https://github.com/Webrowse"
const GITHUB_REPO = "https://github.com/Webrowse/osspath"

export default function ContactPage() {
  return (
    <EditorialLayout>
      <section style={{ paddingTop: "clamp(40px, 6vw, 64px)", paddingBottom: "clamp(64px, 9vw, 104px)" }}>
        <div className="e-col" style={{ maxWidth: 640 }}>

          <div style={{ marginBottom: 40 }}>
            <div className="e-section__num">Contact</div>
            <h1 className="e-section__title" style={{ fontSize: "clamp(26px, 3.4vw, 32px)" }}>
              Get in touch
            </h1>
            <p className="e-archive-meta" style={{ marginTop: 12 }}>
              Found stale data, a broken link, or a missing project? Send a correction.
            </p>
          </div>

          {/* Owner */}
          <div style={{ marginBottom: 40 }}>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--e-fg-dim)", marginBottom: 16 }}>
              Maintained by
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <a
                href={GITHUB_PROFILE}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 14, color: "var(--e-accent)", textDecoration: "none", fontFamily: "var(--e-mono)" }}
              >
                github.com/Webrowse →
              </a>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                style={{ fontSize: 14, color: "var(--e-accent)", textDecoration: "none", fontFamily: "var(--e-mono)" }}
              >
                {CONTACT_EMAIL}
              </a>
            </div>
          </div>

          {/* Correction types */}
          <div style={{ borderTop: "1px solid var(--e-line-soft)", paddingTop: 32, marginBottom: 40 }}>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--e-fg-dim)", marginBottom: 16 }}>
              What to send
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { label: "Report a broken link or stale job", desc: "Include the company name and the URL that no longer works." },
                { label: "Suggest a repository", desc: "GitHub URL, a one-line description, and the ecosystem it belongs to." },
                { label: "Suggest a job listing", desc: "Company name, role, and a direct link to the posting." },
                { label: "Suggest a funding program", desc: "Program name, who runs it, and whether it's currently accepting applications." },
                { label: "Suggest an organization", desc: "GitHub org URL and what they build." },
              ].map(({ label, desc }) => (
                <li key={label} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontSize: 14, color: "var(--e-fg)", fontWeight: 500 }}>{label}</span>
                  <span style={{ fontSize: 13, color: "var(--e-fg-mute)" }}>{desc}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* GitHub repo */}
          <div style={{ borderTop: "1px solid var(--e-line-soft)", paddingTop: 32 }}>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--e-fg-dim)", marginBottom: 12 }}>
              Open source
            </div>
            <p style={{ fontSize: 14, color: "var(--e-fg-mute)", marginBottom: 12, lineHeight: 1.6 }}>
              The site is open. If you prefer to file a correction directly, open an issue on GitHub.
            </p>
            <a
              href={GITHUB_REPO}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 14, color: "var(--e-accent)", textDecoration: "none", fontFamily: "var(--e-mono)" }}
            >
              github.com/Webrowse/osspath →
            </a>
          </div>

        </div>
      </section>
    </EditorialLayout>
  )
}
