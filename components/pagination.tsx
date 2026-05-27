"use client"

import { useRef } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface PaginationProps {
  page: number
  totalPages: number
  total: number
  onPageChange: (page: number) => void
  loading?: boolean
}

export function Pagination({ page, totalPages, total, onPageChange, loading }: PaginationProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  if (totalPages <= 1) return null

  const go = (p: number) => {
    const clamped = Math.max(1, Math.min(totalPages, p))
    if (clamped !== page) onPageChange(clamped)
  }

  const handleInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const v = parseInt(inputRef.current?.value ?? "", 10)
      if (!isNaN(v)) go(v)
    }
  }

  return (
    <div className={cn("flex items-center justify-between pt-4", loading && "opacity-60")}>
      <span className="pg-hide-mobile text-xs text-muted-foreground">
        Page {page} of {totalPages} · {total} companies
      </span>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => go(page - 1)}
          disabled={page <= 1}
          className="inline-flex items-center h-9 px-3 text-sm rounded-lg bg-secondary border border-border text-foreground disabled:opacity-40 hover:bg-muted transition-colors"
          style={{ minWidth: 72 }}
        >
          <ChevronLeft className="h-3.5 w-3.5 mr-1" />
          Prev
        </button>

        <div className="pg-input-group flex items-center gap-1">
          <input
            ref={inputRef}
            type="number"
            min={1}
            max={totalPages}
            defaultValue={page}
            key={page}
            onKeyDown={handleInputKey}
            onBlur={(e) => {
              const v = parseInt(e.target.value, 10)
              if (!isNaN(v)) go(v)
            }}
            className="w-12 h-7 text-center text-xs rounded-md bg-secondary border border-border text-foreground focus:outline-none focus:border-ring/50 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <span className="text-xs text-muted-foreground">/ {totalPages}</span>
        </div>

        {/* Mobile page indicator — shown only on small screens */}
        <span
          className="pg-show-mobile"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--fg-3)",
          }}
        >
          {page}/{totalPages}
        </span>

        <button
          onClick={() => go(page + 1)}
          disabled={page >= totalPages}
          className="inline-flex items-center h-9 px-3 text-sm rounded-lg bg-secondary border border-border text-foreground disabled:opacity-40 hover:bg-muted transition-colors"
          style={{ minWidth: 72 }}
        >
          Next
          <ChevronRight className="h-3.5 w-3.5 ml-1" />
        </button>
      </div>
    </div>
  )
}
