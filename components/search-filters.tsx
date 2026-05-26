"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useCallback, useTransition } from "react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Search, X } from "lucide-react"
import { ALL_TAGS } from "@/types"
import { cn } from "@/lib/utils"

interface SearchFiltersProps {
  search?: string
  tags?: string[]
  remoteOnly?: boolean
  rustOnly?: boolean
}

export function SearchFilters({ search = "", tags = [], remoteOnly = false, rustOnly = false }: SearchFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const updateParams = useCallback(
    (updates: Record<string, string | string[] | boolean | null>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "" || value === false || (Array.isArray(value) && value.length === 0)) {
          params.delete(key)
        } else if (Array.isArray(value)) {
          params.delete(key)
          value.forEach((v: any) => params.append(key, v))
        } else {
          params.set(key, String(value))
        }
      }
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`)
      })
    },
    [router, pathname, searchParams]
  )

  const handleSearch = useCallback(
    (value: string) => {
      updateParams({ q: value })
    },
    [updateParams]
  )

  const toggleTag = useCallback(
    (tag: string) => {
      const newTags = tags.includes(tag) ? tags.filter((t: any) => t !== tag) : [...tags, tag]
      updateParams({ tag: newTags })
    },
    [tags, updateParams]
  )

  const hasFilters = search || tags.length > 0 || remoteOnly || rustOnly

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search companies..."
          defaultValue={search}
          onChange={(e: any) => {
            const timeout = setTimeout(() => handleSearch(e.target.value), 300)
            return () => clearTimeout(timeout)
          }}
          className="pl-9 bg-white/5 border-white/10 focus:border-white/20 placeholder:text-muted-foreground"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => updateParams({ remote: remoteOnly ? null : "1" })}
          className={cn(
            "text-xs px-2.5 py-1 rounded-full border transition-colors",
            remoteOnly
              ? "bg-green-950/60 border-green-800/60 text-green-400"
              : "bg-white/5 border-white/10 text-zinc-400 hover:text-zinc-300"
          )}
        >
          Remote only
        </button>
        <button
          onClick={() => updateParams({ rust: rustOnly ? null : "1" })}
          className={cn(
            "text-xs px-2.5 py-1 rounded-full border transition-colors",
            rustOnly
              ? "bg-orange-950/60 border-orange-800/60 text-orange-400"
              : "bg-white/5 border-white/10 text-zinc-400 hover:text-zinc-300"
          )}
        >
          🦀 Rust
        </button>

        {ALL_TAGS.slice(0, 8).map((tag: any) => (
          <button
            key={tag}
            onClick={() => toggleTag(tag)}
            className={cn(
              "text-xs px-2.5 py-1 rounded-full border transition-colors",
              tags.includes(tag)
                ? "bg-white/15 border-white/30 text-foreground"
                : "bg-white/5 border-white/10 text-zinc-400 hover:text-zinc-300"
            )}
          >
            {tag}
          </button>
        ))}

        {hasFilters && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => updateParams({ q: null, tag: null, remote: null, rust: null })}
            className="h-6 text-xs text-muted-foreground hover:text-foreground px-2"
          >
            <X className="mr-1 h-3 w-3" />
            Clear
          </Button>
        )}
      </div>
    </div>
  )
}
