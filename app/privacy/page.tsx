import type { Metadata } from "next"
import { EditorialLayout } from "@/components/editorial/editorial-layout"

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy policy for Rust Opportunities — what data we collect, how it's used, and how to delete your account.",
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
              Rust Opportunities is a personal project for curating the Rust ecosystem and,
              optionally, tracking remote engineering job applications.
            </p>
            <p>
              We collect only your email, name, and profile image from your OAuth provider
              (GitHub or Google) for authentication purposes. This data is used only to
              identify your account.
            </p>
            <p>
              Your application data (companies, statuses, notes) is private and only
              visible to you when signed in.
            </p>
            <p>
              We do not sell, share, or use your data for advertising.
            </p>
            <p>
              You can delete your account and all associated data at any time by contacting{" "}
              <a
                href="mailto:great.adarsh@gmail.com"
                style={{ color: "var(--e-accent)", textDecoration: "underline", textUnderlineOffset: 3 }}
              >
                great.adarsh@gmail.com
              </a>
              .
            </p>
          </div>
        </div>
      </section>
    </EditorialLayout>
  )
}
