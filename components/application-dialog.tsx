"use client"

import { useState, useTransition } from "react"
import type React from "react"
import { toast } from "sonner"
import { usePostHog } from "posthog-js/react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { upsertCompanyState, removeCompanyState } from "@/actions/company"
import type { UserCompanyStatus } from "@/lib/company-status"
import { STATUS_LABELS } from "@/types"
import { Trash2 } from "lucide-react"

const STATUSES: UserCompanyStatus[] = [
  "SAVED",
  "APPLIED",
  "OA",
  "RECRUITER_CALL",
  "INTERVIEWING",
  "FINAL_ROUND",
  "OFFER",
  "REJECTED",
  "GHOSTED",
  "NO_OPENINGS",
  "HIRING_FREEZE",
  "NOT_INTERESTED",
]

interface ApplicationDialogProps {
  companyId: string
  companyName: string
  userState?: {
    status: string
    appliedAt?: Date | null
    rejectedAt?: Date | null
    followUpAt?: Date | null
    lastCheckedAt?: Date | null
    notes?: string | null
    recruiterName?: string | null
    salaryExpectation?: string | null
  } | null
  trigger: React.ReactNode
  onSuccess?: () => void
}

function toDateInput(d: Date | null | undefined) {
  return d ? new Date(d).toISOString().split("T")[0] : ""
}

export function ApplicationDialog({
  companyId,
  companyName,
  userState,
  trigger,
  onSuccess,
}: ApplicationDialogProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [confirmRemove, setConfirmRemove] = useState(false)
  const ph = usePostHog()

  const [status, setStatus] = useState<UserCompanyStatus>(
    (userState?.status as UserCompanyStatus) ?? "SAVED",
  )
  const [appliedAt, setAppliedAt] = useState(toDateInput(userState?.appliedAt))
  const [rejectedAt, setRejectedAt] = useState(toDateInput(userState?.rejectedAt))
  const [followUpAt, setFollowUpAt] = useState(toDateInput(userState?.followUpAt))
  const [lastCheckedAt, setLastCheckedAt] = useState(toDateInput(userState?.lastCheckedAt))
  const [recruiterName, setRecruiterName] = useState(userState?.recruiterName ?? "")
  const [salaryExpectation, setSalaryExpectation] = useState(userState?.salaryExpectation ?? "")
  const [notes, setNotes] = useState(userState?.notes ?? "")

  const handleSave = () => {
    startTransition(async () => {
      try {
        await upsertCompanyState(companyId, {
          status,
          appliedAt: appliedAt || null,
          rejectedAt: rejectedAt || null,
          followUpAt: followUpAt || null,
          lastCheckedAt: lastCheckedAt || null,
          recruiterName: recruiterName || null,
          salaryExpectation: salaryExpectation || null,
          notes: notes || null,
        })
        ph?.capture("company_tracked", {
          company_id: companyId,
          company_name: companyName,
          status,
          is_new: !userState,
          had_follow_up: !!followUpAt,
        })
        toast.success("Saved")
        setOpen(false)
        onSuccess?.()
      } catch {
        toast.error("Failed to save")
      }
    })
  }

  const handleRemove = () => {
    if (!confirmRemove) { setConfirmRemove(true); return }
    startTransition(async () => {
      try {
        await removeCompanyState(companyId)
        ph?.capture("company_untracked", { company_id: companyId, company_name: companyName })
        toast.success("Removed")
        setOpen(false)
        setConfirmRemove(false)
        onSuccess?.()
      } catch {
        toast.error("Failed to remove")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-base">{companyName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select value={status} onValueChange={(v: string | null) => v && setStatus(v as UserCompanyStatus)}>
              <SelectTrigger className="h-8 text-sm bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="text-sm">
                    {STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {status !== "SAVED" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Applied date</Label>
                <Input
                  type="date"
                  value={appliedAt}
                  onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setAppliedAt(e.target.value)}
                  className="h-8 text-sm bg-secondary border-border"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Follow-up date</Label>
                <Input
                  type="date"
                  value={followUpAt}
                  onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setFollowUpAt(e.target.value)}
                  className="h-8 text-sm bg-secondary border-border"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Last checked</Label>
              <Input
                type="date"
                value={lastCheckedAt}
                onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setLastCheckedAt(e.target.value)}
                className="h-8 text-sm bg-secondary border-border"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Rejected date</Label>
              <Input
                type="date"
                value={rejectedAt}
                onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setRejectedAt(e.target.value)}
                className="h-8 text-sm bg-secondary border-border"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Recruiter name</Label>
              <Input
                value={recruiterName}
                onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setRecruiterName(e.target.value)}
                placeholder="e.g. Jane Smith"
                className="h-8 text-sm bg-secondary border-border"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Salary / comp</Label>
              <Input
                value={salaryExpectation}
                onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setSalaryExpectation(e.target.value)}
                placeholder="e.g. $180k + equity"
                className="h-8 text-sm bg-secondary border-border"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Notes</Label>
            <Textarea
              value={notes}
              onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setNotes(e.target.value)}
              placeholder="Interview notes, recruiter feedback, follow-ups..."
              className="text-sm bg-secondary border-border resize-none min-h-[80px]"
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 pt-2">
          {userState && (
            confirmRemove ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Remove all tracking?</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleRemove}
                  disabled={isPending}
                  className="text-red-400 hover:text-red-300 hover:bg-red-950/30 h-7 px-2"
                >
                  {isPending ? "Removing…" : "Yes, remove"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setConfirmRemove(false)}
                  disabled={isPending}
                  className="h-7 px-2"
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleRemove}
                disabled={isPending}
                className="text-red-400 hover:text-red-300 hover:bg-red-950/30 h-8"
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Remove
              </Button>
            )
          )}
          <div className="flex gap-2 ml-auto">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setOpen(false)}
              className="h-8 bg-secondary"
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isPending} className="h-8">
              {isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
