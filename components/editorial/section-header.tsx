import Link from "next/link"

interface SectionHeaderProps {
  num: string
  title: string
  meta?: string
  note?: string
  archiveHref?: string
  archiveLabel?: string
}

export function SectionHeader({ num, title, meta, note, archiveHref, archiveLabel = "View all" }: SectionHeaderProps) {
  return (
    <>
      <header className="e-section__head">
        <div className="e-section__title-wrap">
          <span className="e-section__num">{num}</span>
          <h2 className="e-section__title">{title}</h2>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {meta && <span className="e-section__meta">{meta}</span>}
          {archiveHref && (
            <Link href={archiveHref} className="e-section__archive-link" prefetch={true}>
              {archiveLabel} →
            </Link>
          )}
        </div>
      </header>
      {note && <p className="e-section__note">{note}</p>}
    </>
  )
}
