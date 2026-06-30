import type { NewsItem } from "@/content/news"

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  } catch { return iso }
}

export function NewsRow({ item }: { item: NewsItem }) {
  return (
    <a
      className="e-news__row"
      href={item.href}
      target="_blank"
      rel="noopener noreferrer"
    >
      <span className="e-news__kind">{item.kind}</span>
      <span className="e-news__body">
        <span className="e-news__title">{item.title}</span>
        {item.blurb && <span className="e-news__blurb">{item.blurb}</span>}
      </span>
      <span className="e-news__meta">
        {item.source && <span className="e-news__source">{item.source}</span>}
        {item.date && <span className="e-news__date">{formatDate(item.date)}</span>}
      </span>
      <span className="e-news__arrow" aria-hidden="true">↗</span>
    </a>
  )
}
