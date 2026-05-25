import { Badge } from "@/components/ui/badge"
import { STATUS_LABELS, STATUS_COLORS } from "@/types"
import type { UserCompanyStatus } from "@prisma/client"
import { cn } from "@/lib/utils"

interface StatusBadgeProps {
  status: UserCompanyStatus | string
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const label = STATUS_LABELS[status as UserCompanyStatus] ?? status
  const colors = STATUS_COLORS[status as UserCompanyStatus] ?? "text-zinc-400 bg-zinc-800 border-zinc-700"

  return (
    <Badge variant="outline" className={cn("text-xs h-5 font-medium", colors, className)}>
      {label}
    </Badge>
  )
}
