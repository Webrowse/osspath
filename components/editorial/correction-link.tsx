import Link from "next/link"

export function CorrectionLink() {
  return (
    <Link
      href="/contact"
      style={{
        fontSize: 12,
        color: "var(--e-fg-faint)",
        textDecoration: "none",
        fontFamily: "var(--e-mono)",
        whiteSpace: "nowrap",
      }}
    >
      Something inaccurate? Report a correction →
    </Link>
  )
}
