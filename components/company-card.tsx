"use client"

import { useState, useTransition } from "react"
import Image from "next/image"
import Link from "next/link"
import { toast } from "sonner"
import { ExternalLink, Bookmark, BookmarkCheck, ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/status-badge"
import { CompanyListItem } from "@/lib/companies"
import { saveCompany, unsaveCompany, upsertApplication } from "@/actions/company"
import { cn } from "@/lib/utils"

interface CompanyCardProps {
  company: CompanyListItem
  isAuthenticated: boolean
}

const RUST_COLORS = {
  NONE: null,
  PARTIAL: "text-orange-400 bg-orange-950/50 border-orange-800/50",
  HEAVY: "text-orange-400 bg-orange-950/50 border-orange-800/50",
  CORE: "text-orange-400 bg-orange-900/60 border-orange-700/60",
}

export function CompanyCard({ company, isAuthenticated }: CompanyCardProps) {
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(company.isSaved ?? false)
  const [status, setStatus] = useState(company.application?.status ?? null)

  const handleSave = () => {
    if (!isAuthenticated) {
      toast.error("Sign in to save companies")
      return
    }
    startTransition(async () => {
      try {
        if (saved) {
          await unsaveCompany(company.id)
          setSaved(false)
          toast.success("Removed from saved")
        } else {
          await saveCompany(company.id)
          setSaved(true)
          toast.success("Saved to wishlist")
        }
      } catch {
        toast.error("Something went wrong")
      }
    })
  }

  const handleMarkApplied = () => {
    if (!isAuthenticated) {
      toast.error("Sign in to track applications")
      return
    }
    startTransition(async () => {
      try {
        const newStatus = status === "APPLIED" ? "WISHLIST" : "APPLIED"
        await upsertApplication(company.id, {
          status: newStatus,
          appliedAt: newStatus === "APPLIED" ? new Date().toISOString() : null,
        })
        setStatus(newStatus)
        toast.success(newStatus === "APPLIED" ? "Marked as applied" : "Moved to wishlist")
      } catch {
        toast.error("Something went wrong")
      }
    })
  }

  return (
    <div className="group relative flex flex-col gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:border-white/15">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex-shrink-0 h-9 w-9 rounded-md bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center">
            {company.logoUrl ? (
              <Image
                src={company.logoUrl}
                alt={`${company.name} logo`}
                width={36}
                height={36}
                className="h-full w-full object-contain p-1"
                unoptimized
              />
            ) : (
              <span className="text-sm font-bold text-muted-foreground">
                {company.name.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <Link
              href={`/companies/${company.slug}`}
              className="font-medium text-sm text-foreground hover:text-white transition-colors flex items-center gap-1"
            >
              {company.name}
              <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
            </Link>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {company.description}
            </p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={isPending}
          className={cn(
            "flex-shrink-0 p-1.5 rounded transition-colors",
            saved
              ? "text-yellow-400 hover:text-yellow-300"
              : "text-muted-foreground hover:text-foreground"
          )}
          aria-label={saved ? "Unsave company" : "Save company"}
        >
          {saved ? (
            <BookmarkCheck className="h-4 w-4" />
          ) : (
            <Bookmark className="h-4 w-4" />
          )}
        </button>
      </div>

      <div className="flex flex-wrap gap-1">
        {company.remote && (
          <Badge variant="outline" className="text-xs h-5 text-green-400 border-green-800/60 bg-green-950/30">
            Remote
          </Badge>
        )}
        {company.rustLevel !== "NONE" && RUST_COLORS[company.rustLevel as keyof typeof RUST_COLORS] && (
          <Badge variant="outline" className={cn("text-xs h-5", RUST_COLORS[company.rustLevel as keyof typeof RUST_COLORS])}>
            🦀 {company.rustLevel === "CORE" ? "Rust Core" : company.rustLevel === "HEAVY" ? "Heavy Rust" : "Some Rust"}
          </Badge>
        )}
        {company.tags.slice(0, 3).map((tag) => (
          <Badge key={tag} variant="secondary" className="text-xs h-5 bg-white/5 text-zinc-400 border-white/5">
            {tag}
          </Badge>
        ))}
        {company.tags.length > 3 && (
          <Badge variant="secondary" className="text-xs h-5 bg-white/5 text-zinc-500 border-white/5">
            +{company.tags.length - 3}
          </Badge>
        )}
      </div>

      {status && (
        <div className="flex items-center gap-2">
          <StatusBadge status={status} />
        </div>
      )}

      <div className="flex items-center gap-2 mt-auto pt-1">
        <a
          href={company.careersUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center h-7 text-xs flex-1 rounded-lg bg-white/5 hover:bg-white/10 text-foreground border border-white/5 transition-colors px-2.5"
        >
          <ExternalLink className="mr-1.5 h-3 w-3" />
          Careers
        </a>
        {company.loginUrl && (
          <a
            href={company.loginUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center h-7 text-xs flex-1 rounded-lg bg-white/5 hover:bg-white/10 text-foreground border border-white/5 transition-colors px-2.5"
          >
            <ExternalLink className="mr-1.5 h-3 w-3" />
            Portal
          </a>
        )}
        <Button
          size="sm"
          variant={status === "APPLIED" ? "default" : "secondary"}
          className={cn(
            "h-7 text-xs",
            status === "APPLIED"
              ? "bg-blue-600 hover:bg-blue-700 text-white"
              : "bg-white/5 hover:bg-white/10 border-white/5"
          )}
          onClick={handleMarkApplied}
          disabled={isPending}
        >
          {status === "APPLIED" ? "Applied ✓" : "Mark Applied"}
        </Button>
      </div>
    </div>
  )
}
