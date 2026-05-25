"use client"

import { useTransition } from "react"
import Image from "next/image"
import Link from "next/link"
import { toast } from "sonner"
import { ExternalLink, MoreHorizontal } from "lucide-react"
import { StatusBadge } from "@/components/status-badge"
import { ApplicationDialog } from "@/components/application-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { removeCompanyState } from "@/actions/company"
import type { UserCompanyStatus } from "@/lib/generated/prisma"

interface ApplicationRowProps {
  companyId: string
  companyName: string
  companySlug: string
  companyLogoUrl: string | null
  careersUrl: string
  loginUrl: string | null
  userState: {
    status: UserCompanyStatus
    appliedAt: Date | null
    rejectedAt?: Date | null
    followUpAt?: Date | null
    lastCheckedAt?: Date | null
    notes: string | null
    salaryExpectation?: string | null
    recruiterName: string | null
  }
}

export function ApplicationRow({
  companyId,
  companyName,
  companySlug,
  companyLogoUrl,
  careersUrl,
  loginUrl,
  userState,
}: ApplicationRowProps) {
  const [isPending, startTransition] = useTransition()

  const handleRemove = () => {
    startTransition(async () => {
      try {
        await removeCompanyState(companyId)
        toast.success("Removed")
      } catch {
        toast.error("Failed to remove")
      }
    })
  }

  return (
    <div className="flex items-center gap-3 py-3 border-b border-border last:border-0">
      <div className="flex-shrink-0 h-8 w-8 rounded bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
        {companyLogoUrl ? (
          <Image
            src={companyLogoUrl}
            alt={`${companyName} logo`}
            width={32}
            height={32}
            className="h-full w-full object-contain p-0.5"
            unoptimized
          />
        ) : (
          <span className="text-xs font-bold text-muted-foreground">
            {companyName.slice(0, 2).toUpperCase()}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Link
            href={`/companies/${companySlug}`}
            className="text-sm font-medium text-foreground hover:text-white transition-colors truncate"
          >
            {companyName}
          </Link>
          <StatusBadge status={userState.status} />
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          {userState.appliedAt && (
            <span className="text-xs text-muted-foreground">
              Applied {new Date(userState.appliedAt).toLocaleDateString()}
            </span>
          )}
          {userState.recruiterName && (
            <span className="text-xs text-muted-foreground">{userState.recruiterName}</span>
          )}
          {userState.salaryExpectation && (
            <span className="text-xs text-muted-foreground">{userState.salaryExpectation}</span>
          )}
          {userState.followUpAt && (
            <span className="text-xs text-yellow-500/70">
              Follow-up {new Date(userState.followUpAt).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        <a
          href={careersUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Open careers"
          className="inline-flex items-center justify-center h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>

        <ApplicationDialog
          companyId={companyId}
          companyName={companyName}
          userState={userState}
          trigger={
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-muted-foreground hover:text-foreground px-2"
            >
              Edit
            </Button>
          }
        />

        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex items-center justify-center h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
            <MoreHorizontal className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {loginUrl && (
              <DropdownMenuItem render={<a href={loginUrl} target="_blank" rel="noopener noreferrer" />}>
                Open login portal
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              className="text-red-400"
              onClick={handleRemove}
              disabled={isPending}
            >
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
