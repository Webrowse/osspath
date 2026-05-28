import type { EcosystemCompany } from "@/content/companies"

export function CompanyGrid({ companies }: { companies: EcosystemCompany[] }) {
  return (
    <div className="e-companies">
      {companies.map((c) => (
        <a
          key={c.name}
          className="e-company"
          href={c.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={c.name}
        >
          <span className="e-company__name">{c.name}</span>
          <span className="e-company__sector">{c.sector}</span>
          <span className="e-company__hint" aria-hidden="true">Visit →</span>
        </a>
      ))}
    </div>
  )
}
