"use client"

import { usePostHog } from "posthog-js/react"
import { ExternalLink } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"

interface CareersLinkProps {
  href: string
  companyId: string
  companyName: string
}

export function CareersLink({ href, companyId, companyName }: CareersLinkProps) {
  const ph = usePostHog()
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => ph?.capture("careers_page_clicked", { company_id: companyId, company_name: companyName, source: "detail_page" })}
      className={buttonVariants({ size: "sm" }) + " h-8"}
    >
      <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
      Careers page
    </a>
  )
}
