import Link from "next/link"
import { EditorialLayout } from "@/components/editorial/editorial-layout"

export default function NotFound() {
  return (
    <EditorialLayout>
      <section style={{ paddingTop: "clamp(64px, 10vw, 120px)", paddingBottom: "clamp(64px, 9vw, 104px)" }}>
        <div className="e-col">
          <header className="e-section__head" style={{ marginBottom: 24 }}>
            <div className="e-section__title-wrap">
              <span style={{
                fontFamily: "var(--e-mono)",
                fontSize: 11,
                letterSpacing: "0.12em",
                color: "var(--e-fg-faint)",
                textTransform: "uppercase",
                display: "block",
                marginBottom: 12,
              }}>
                404
              </span>
              <h1 className="e-section__title">Page not found</h1>
            </div>
          </header>

          <div style={{
            fontSize: 15.5,
            lineHeight: 1.7,
            color: "var(--e-fg-mute)",
            display: "flex",
            flexDirection: "column",
            gap: 16,
            maxWidth: "48ch",
          }}>
            <p>
              This node doesn&rsquo;t exist in the graph — the path you followed may be
              stale, renamed, or never part of the corpus.
            </p>
            <p>
              <Link href="/" style={{ color: "var(--e-accent)", textDecoration: "underline", textUnderlineOffset: 3 }}>
                Return to the map
              </Link>
              {" "}and navigate from a known node.
            </p>
          </div>
        </div>
      </section>
    </EditorialLayout>
  )
}
