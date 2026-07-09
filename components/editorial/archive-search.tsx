"use client"

interface ArchiveSearchProps {
  placeholder?: string
  value: string
  onChange: (value: string) => void
}

export function ArchiveSearch({ placeholder = "Filter…", value, onChange }: ArchiveSearchProps) {
  return (
    <div className="e-archive-search">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" className="e-archive-search__icon">
        <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2" />
        <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
      <input
        type="search"
        className="e-archive-search__input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
        spellCheck={false}
      />
    </div>
  )
}
