import type { Metadata } from "next"
import { EditorialLayout } from "@/components/editorial/editorial-layout"
import { CONTACT_EMAIL } from "@/lib/site-config"

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy policy for OSSPath — what data we collect and how it is used.",
}

export default function PrivacyPage() {
  return (
    <EditorialLayout>
      <section style={{ paddingTop: "clamp(40px, 6vw, 64px)", paddingBottom: "clamp(64px, 9vw, 104px)" }}>
        <div className="e-col">
          <header className="e-section__head" style={{ marginBottom: 32 }}>
            <div className="e-section__title-wrap">
              <h1 className="e-section__title">Privacy Policy</h1>
            </div>
          </header>

          <div style={{
            fontSize: 15.5,
            lineHeight: 1.7,
            color: "var(--e-fg-mute)",
            display: "flex",
            flexDirection: "column",
            gap: 16,
            maxWidth: "58ch",
          }}>
            <p>
              OSSPath is a public directory. No account or login is required to browse
              the site. We do not collect names, email addresses, or any personally
              identifiable information from visitors.
            </p>
            <p>
              Your theme preference is stored in your browser&rsquo;s localStorage. This
              data never leaves your device.
            </p>
            <p>
              We do not sell, share, or use visitor data for advertising.
            </p>
            <p>
              To report a concern or request data removal, contact{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                style={{ color: "var(--e-accent)", textDecoration: "underline", textUnderlineOffset: 3 }}
              >
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </div>
        </div>
      </section>
    </EditorialLayout>
  )
}
