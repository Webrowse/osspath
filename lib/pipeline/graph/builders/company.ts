import type { GraphBuilder, GraphNode } from "../types"
import { nodeId, edgeId } from "../types"

/**
 * Company nodes and maintained_by_company edges: a repo's GitHub owner/org
 * login matched against a company's declared github_org (both structured,
 * deterministic fields - no AI at this linkage, even though a company's other
 * fields, e.g. sector, were originally populated by DeepSeek elsewhere).
 *   Repository --maintained_by_company--> Company
 */
export const companyBuilder: GraphBuilder = (corpus) => {
  const nodes = new Map<string, GraphNode>()
  const edges = []

  const orgToCompany = new Map(
    corpus.companies.filter((c) => c.githubOrg).map((c) => [c.githubOrg!.toLowerCase(), c]),
  )

  for (const repo of corpus.repos) {
    const company = orgToCompany.get(repo.owner.toLowerCase())
    if (!company) continue
    const repoId = nodeId.repository(repo.slug)
    const companyId = nodeId.company(company.slug)
    if (!nodes.has(companyId)) nodes.set(companyId, { id: companyId, type: "company", label: company.name })
    edges.push({ id: edgeId("maintained_by_company", repoId, companyId), type: "maintained_by_company", from: repoId, to: companyId })
  }

  return { nodes: [...nodes.values()], edges }
}
