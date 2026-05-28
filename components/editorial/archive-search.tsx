"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useTransition } from "react"

interface ArchiveSearchProps {
  placeholder?: string
  defaultValue?: string
}

export function ArchiveSearch({ placeholder = "Filter…", defaultValue = "" }: ArchiveSearchProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) params.set("q", value)
      else params.delete("q")
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    })
  }

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
        defaultValue={defaultValue}
        onChange={handleChange}
        autoComplete="off"
        spellCheck={false}
      />
    </div>
  )
}
