/**
 * Guard for the Knowledge Graph engine (lib/pipeline/graph/*).
 * Pure functions, synthetic fixtures, no DB, no network.
 * Run: tsx scripts/check-graph-engine.ts
 */
import { repositoryNodesBuilder } from "@/lib/pipeline/graph/builders/repository"
import { crateGraphBuilder } from "@/lib/pipeline/graph/builders/crates"
import { ecosystemTechnologyBuilder } from "@/lib/pipeline/graph/builders/ecosystem-technology"
import { companyBuilder } from "@/lib/pipeline/graph/builders/company"
import { buildGraph, GRAPH_BUILDERS } from "@/lib/pipeline/graph/engine"
import type { CorpusSnapshot, GraphBuilder } from "@/lib/pipeline/graph/types"

let failed = 0
function assert(label: string, cond: boolean) { if (!cond) { console.error(`x ${label}`); failed++ } }

const corpus: CorpusSnapshot = {
  repos: [
    {
      slug: "tokio-rs/axum", owner: "tokio-rs",
      cargo: { dependencies: ["tokio", "tower", "hyper"], isWorkspace: true, crates: [{ name: "axum-core", path: "axum-core" }, { name: "axum", path: "." }] },
      ecosystems: ["web", "async"], technologies: ["Axum", "Tower"],
    },
    {
      slug: "someone/api-server", owner: "someone",
      cargo: { dependencies: ["axum", "sqlx"], isWorkspace: false, crates: [] },
      ecosystems: ["web", "database"], technologies: ["Axum", "SQLx"],
    },
    { slug: "nobody/no-manifest", owner: "nobody", ecosystems: [], technologies: [] }, // Tier 1 found no Cargo.toml
  ],
  companies: [
    { slug: "tokio", name: "Tokio Project", githubOrg: "tokio-rs" },
    { slug: "unrelated", name: "Unrelated Co", githubOrg: null },
  ],
}

// ── repositoryNodesBuilder ──────────────────────────────────────────────────
{
  const { nodes, edges } = repositoryNodesBuilder(corpus)
  assert("one node per repo", nodes.length === 3)
  assert("node id is repository:slug", nodes.some((n) => n.id === "repository:tokio-rs/axum" && n.type === "repository"))
  assert("no edges from this builder", edges.length === 0)
}

// ── crateGraphBuilder ────────────────────────────────────────────────────────
{
  const { nodes, edges } = crateGraphBuilder(corpus)
  assert("axum depends_on tokio", edges.some((e) => e.type === "depends_on" && e.from === "repository:tokio-rs/axum" && e.to === "crate:tokio"))
  assert("axum-core is a workspace member of tokio-rs/axum", edges.some((e) => e.type === "member_of_workspace" && e.from === "crate:axum-core" && e.to === "repository:tokio-rs/axum"))
  assert("api-server depends_on the axum crate", edges.some((e) => e.type === "depends_on" && e.from === "repository:someone/api-server" && e.to === "crate:axum"))
  assert("no-manifest repo contributes no crate edges", !edges.some((e) => e.from === "repository:nobody/no-manifest"))
  assert("shared crate 'tower' is one node, not duplicated", nodes.filter((n) => n.id === "crate:tower").length === 1)
}

// ── ecosystemTechnologyBuilder ───────────────────────────────────────────────
{
  const { edges } = ecosystemTechnologyBuilder(corpus)
  assert("axum repo belongs_to_ecosystem web", edges.some((e) => e.type === "belongs_to_ecosystem" && e.from === "repository:tokio-rs/axum" && e.to === "ecosystem:web"))
  assert("axum repo uses_technology Axum", edges.some((e) => e.type === "uses_technology" && e.from === "repository:tokio-rs/axum" && e.to === "technology:Axum"))
}

// ── companyBuilder ────────────────────────────────────────────────────────────
{
  const { nodes, edges } = companyBuilder(corpus)
  assert("tokio-rs/axum maintained_by_company tokio", edges.some((e) => e.type === "maintained_by_company" && e.from === "repository:tokio-rs/axum" && e.to === "company:tokio"))
  assert("no company match for someone/api-server -> no edge", !edges.some((e) => e.from === "repository:someone/api-server"))
  assert("only matched companies become nodes", nodes.length === 1 && nodes[0].id === "company:tokio")
}

// ── buildGraph: assembly, dedup, determinism ─────────────────────────────────
{
  const a = buildGraph(corpus)
  const b = buildGraph(corpus)
  assert("assembly is non-empty", a.nodes.length > 0 && a.edges.length > 0)
  assert("no duplicate node ids after merging all builders", new Set(a.nodes.map((n) => n.id)).size === a.nodes.length)
  assert("no duplicate edge ids after merging all builders", new Set(a.edges.map((e) => e.id)).size === a.edges.length)
  assert("nodes sorted by id", a.nodes.every((n, i) => i === 0 || a.nodes[i - 1].id.localeCompare(n.id) <= 0))
  assert("determinism: same corpus twice -> byte-identical graph", JSON.stringify(a) === JSON.stringify(b))
}

// ── Extensibility: a brand-new node/edge type integrates with zero engine changes ──
{
  type FakeCorpus = CorpusSnapshot & { grants?: Array<{ slug: string; name: string; fundedRepoSlug: string }> }
  const extended: FakeCorpus = { ...corpus, grants: [{ slug: "rust-foundation-2026", name: "Rust Foundation Grant", fundedRepoSlug: "tokio-rs/axum" }] }

  const grantBuilder: GraphBuilder = (c) => {
    const grants = (c as FakeCorpus).grants ?? []
    return {
      nodes: grants.map((g) => ({ id: `grant:${g.slug}`, type: "grant", label: g.name })),
      edges: grants.map((g) => ({
        id: `repository:${g.fundedRepoSlug}--funded_by-->grant:${g.slug}`,
        type: "funded_by", from: `repository:${g.fundedRepoSlug}`, to: `grant:${g.slug}`,
      })),
    }
  }

  // The exact same buildGraph() used in production, with one extra builder appended.
  const result = buildGraph(extended, [...GRAPH_BUILDERS, grantBuilder])
  assert("new node type 'grant' appears in the merged graph", result.nodes.some((n) => n.type === "grant" && n.id === "grant:rust-foundation-2026"))
  assert("new edge type 'funded_by' appears in the merged graph", result.edges.some((e) => e.type === "funded_by"))
  assert("pre-existing node/edge types are untouched by the addition", result.edges.some((e) => e.type === "depends_on") && result.edges.some((e) => e.type === "belongs_to_ecosystem"))
}

if (failed) { console.error(`\n${failed} assertion(s) failed`); process.exit(1) }
console.log("ok - knowledge graph: builders, assembly, determinism, and extensibility are correct")
