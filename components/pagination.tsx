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
      <span className="text-xs text-muted-foreground">
        Page {page} of {totalPages} · {total} companies
      </span>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => go(page - 1)}
          disabled={page <= 1}
          className="inline-flex items-center h-7 px-2.5 text-xs rounded-md bg-white/5 border border-white/10 text-foreground disabled:opacity-40 hover:bg-white/10 transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5 mr-0.5" />
          Prev
        </button>

        <div className="flex items-center gap-1">
          <input
            ref={inputRef}
            type="number"
            min={1}
            max={totalPages}
            defaultValue={page}
            key={page}
            onKeyDown={handleInputKey}
            onBlur={(e: any) => {
              const v = parseInt(e.target.value, 10)
              if (!isNaN(v)) go(v)
            }}
            className="w-12 h-7 text-center text-xs rounded-md bg-white/5 border border-white/10 text-foreground focus:outline-none focus:border-white/30 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <span className="text-xs text-muted-foreground">/ {totalPages}</span>
        </div>

        <button
          onClick={() => go(page + 1)}
          disabled={page >= totalPages}
          className="inline-flex items-center h-7 px-2.5 text-xs rounded-md bg-white/5 border border-white/10 text-foreground disabled:opacity-40 hover:bg-white/10 transition-colors"
        >
          Next
          <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
        </button>
      </div>
    </div>
  )
}
