import "server-only"

import { getOSSRepos } from "@/lib/oss-data"
import { getLiveDepCounts, getQualifiedCrates } from "@/lib/deps-data"
import { getOwnerCompanyIndex } from "@/lib/company-data"
import { JOBS } from "@/content/jobs"
import { filterActive } from "@/lib/content-utils"
import type { EditorialJob } from "@/content/jobs"
import type { EcoTag } from "@/lib/eco-tags"
import type { OSSPath } from "@/content/oss-paths"

// ─── Types ────────────────────────────────────────────────────────────────────

export type SkillLevel = "required" | "recommended" | "bonus"

/** One leg of a career route. Crates are the evidence; concepts cover
 *  everything a Cargo.toml can't prove (PostgreSQL, Linux, Docker…). */
export interface SkillArea {
  id:        string
  name:      string
  why:       string          // evidence-flavored: what the corpus shows
  level:     SkillLevel
  weight:    number          // share of path readiness (should sum ~100)
  crates:    string[]        // evidence crates, most important first
  concepts:  string[]        // non-crate skills
  checklist: string[]        // self-assessment: concrete "I have done X" items
  project:   string          // one concrete portfolio project for this leg
}

export interface CareerPathDef {
  slug:         string
  title:        string
  shortTitle:   string       // for cards/nav
  tagline:      string
  ecoTags:      EcoTag[]     // job/company matching
  roleKeywords: string[]     // matched against job role + topics
  areas:        SkillArea[]
}

export type ResolvedCrate = {
  name:      string
  liveCount: number
  href:      string | null   // /deps page when one exists
}

export type StudyRepo = {
  fullName:   string
  href:       string
  stars:      number
  note:       string
  difficulty: "approachable" | "intermediate" | "advanced"
}

/** One climbing route up a skill leg. Same summit, different terrain. */
export type ClimbRoute = "learning" | "contributor" | "production"

export type RouteRepo = {
  fullName: string
  href:     string
  stars:    number
  note:     string
  signals:  string[]   // the quality signals that earned this repo its slot
}

export type ResolvedArea = Omit<SkillArea, "crates"> & {
  crates: ResolvedCrate[]
  routes: Record<ClimbRoute, RouteRepo[]>
}

export type PathOrg = { name: string; slug: string; href: string; hiring: boolean }

export type ResolvedPath = {
  slug:          string
  title:         string
  shortTitle:    string
  tagline:       string
  areas:         ResolvedArea[]
  jobs:          EditorialJob[]
  orgs:          PathOrg[]
  evidenceRepos: number      // distinct corpus repos matching any leg
}

export type PathCardStats = {
  slug:          string
  title:         string
  shortTitle:    string
  tagline:       string
  evidenceRepos: number
  openJobs:      number
  areaCount:     number
}

// ─── Path definitions ─────────────────────────────────────────────────────────
// Editorial content. Numbers are NEVER written here — every count shown in the
// UI is resolved live from the corpus at build time.

const PATH_DEFS: CareerPathDef[] = [
  {
    slug:       "backend",
    title:      "Rust Backend Engineer",
    shortTitle: "Backend Engineer",
    tagline:    "Build the APIs and services companies run in production — the most-hired Rust role.",
    ecoTags:    ["axum", "tokio", "database"],
    roleKeywords: ["backend", "api", "web", "product engineer", "full-stack", "fullstack", "platform"],
    areas: [
      {
        id: "foundations", name: "Rust Foundations", level: "required", weight: 20,
        crates: ["serde", "thiserror", "anyhow", "clap"],
        concepts: ["ownership & borrowing", "Result-based error handling", "traits & generics", "cargo workspaces"],
        why: "Every production service in the corpus sits on the same base layer: typed serialization and structured errors. This is the vocabulary the rest of the path assumes.",
        checklist: [
          "I can model a JSON API's types with serde derive and custom (de)serializers",
          "I design error types with thiserror in libraries and anyhow in binaries",
          "I can explain ownership and lifetimes without looking them up",
          "I've published or maintained a crate/binary with a clean cargo project layout",
        ],
        project: "Build a CLI tool with clap that ingests JSON/CSV with serde and reports typed, recoverable errors — small, finished, and pinned on your GitHub.",
      },
      {
        id: "async", name: "Async Rust & Tokio", level: "required", weight: 20,
        crates: ["tokio", "futures", "async-trait", "tokio-util"],
        concepts: ["tasks vs threads", "cancellation & timeouts", "channels & backpressure", "pinning (working knowledge)"],
        why: "Async is the defining skill gap between hobby Rust and production Rust — the runtime layer beneath nearly every service repo in this corpus.",
        checklist: [
          "I've built a program that runs concurrent tasks with tokio::spawn and joins them safely",
          "I use timeouts and cancellation (select!, CancellationToken) deliberately",
          "I can move data between tasks with mpsc/broadcast channels and explain backpressure",
          "I can explain what .await yields to and why blocking the runtime is a bug",
        ],
        project: "Write a concurrent scraper or queue worker: bounded concurrency, per-task timeouts, graceful shutdown on Ctrl-C.",
      },
      {
        id: "web", name: "Web Services", level: "required", weight: 20,
        crates: ["axum", "tower", "tower-http", "hyper", "reqwest"],
        concepts: ["REST design", "middleware/layers", "auth (JWT/sessions)", "streaming responses"],
        why: "The axum/tower stack is the corpus's dominant way to ship HTTP services — and the stack most job listings implicitly assume.",
        checklist: [
          "I've shipped an axum API with extractors, typed responses, and error mapping",
          "I've written or composed tower middleware (auth, rate limiting, request IDs)",
          "I've consumed external APIs with reqwest, handling retries and timeouts",
          "I can explain what tower's Service trait abstracts and why it matters",
        ],
        project: "Ship a real REST API: auth, pagination, input validation, OpenAPI docs — deployed somewhere public with its URL in the README.",
      },
      {
        id: "data", name: "Databases & Persistence", level: "required", weight: 15,
        crates: ["sqlx", "diesel", "redis", "rusqlite"],
        concepts: ["PostgreSQL", "migrations", "connection pooling", "transactions & isolation"],
        why: "Persistence separates demo APIs from hireable experience. sqlx's compile-time-checked SQL is the pattern reviewers look for in Rust codebases.",
        checklist: [
          "I've built a service on sqlx or diesel with migrations checked into the repo",
          "I understand connection pooling and have tuned pool size under load",
          "I can write and reason about a transaction with correct error rollback",
          "I've used Redis (or similar) for caching or queues from Rust",
        ],
        project: "Add PostgreSQL to your API: migrations, a transactional endpoint, and an integration test that runs against a real database (testcontainers).",
      },
      {
        id: "observability", name: "Observability", level: "recommended", weight: 15,
        crates: ["tracing", "tracing-subscriber", "metrics", "opentelemetry"],
        concepts: ["structured logging", "spans & context propagation", "dashboards & alerts"],
        why: "The corpus shows tracing wherever services run for real — it's the difference between 'it works on my machine' and operating software.",
        checklist: [
          "I instrument services with tracing spans, not println!",
          "I've configured tracing-subscriber with per-module filters and JSON output",
          "I've exported metrics or traces to something (Prometheus, OTLP, honeycomb…)",
          "I can find a slow request in production from telemetry alone",
        ],
        project: "Instrument your API end-to-end: request spans, error events, latency metrics — screenshot the trace waterfall in your README.",
      },
      {
        id: "production", name: "Testing & Shipping", level: "recommended", weight: 10,
        crates: ["testcontainers", "insta", "proptest", "mockall"],
        concepts: ["Docker", "CI pipelines", "integration testing", "graceful shutdown & config"],
        why: "Hiring managers read your tests before your handlers. Repos in this corpus that companies actually run all carry serious test suites.",
        checklist: [
          "My projects run integration tests against real dependencies in CI",
          "I've containerized a Rust service with a small multi-stage Dockerfile",
          "I use snapshot or property tests where they beat example tests",
          "My services read config from the environment and shut down gracefully",
        ],
        project: "Give your API a production spine: Dockerfile, GitHub Actions CI running integration tests, health checks, and zero-warning clippy.",
      },
    ],
  },
  {
    slug:       "systems",
    title:      "Rust Systems Engineer",
    shortTitle: "Systems Engineer",
    tagline:    "Own performance, concurrency, and the layer where Rust replaces C and C++.",
    ecoTags:    ["tokio", "cli"],
    roleKeywords: ["systems", "performance", "kernel", "low-level", "core engineer", "runtime", "compiler"],
    areas: [
      {
        id: "foundations", name: "Rust Foundations", level: "required", weight: 15,
        crates: ["serde", "thiserror", "clap", "libc"],
        concepts: ["ownership deeply", "unsafe fundamentals", "FFI basics", "no-panic discipline"],
        why: "Systems roles assume the same base layer as every other Rust job — plus comfort at the edges where safe Rust meets the operating system.",
        checklist: [
          "I can explain aliasing rules and why unsafe blocks carry proof obligations",
          "I've called into C (or been called from it) across an FFI boundary",
          "I know when to reach for Box/Rc/Arc/Cow and what each costs",
          "I've read unsafe code in a real crate and could review it critically",
        ],
        project: "Write safe Rust bindings over a small C library — document the invariants each unsafe block relies on.",
      },
      {
        id: "memory", name: "Memory & Data Layout", level: "required", weight: 20,
        crates: ["bytes", "memmap2", "smallvec", "bytemuck"],
        concepts: ["stack vs heap", "cache lines & locality", "zero-copy parsing", "allocation profiling"],
        why: "Zero-copy buffer handling is the recurring pattern across the corpus's runtimes, proxies, and databases — the skill that makes Rust worth hiring for.",
        checklist: [
          "I can explain why Bytes enables zero-copy sharing and when it doesn't help",
          "I've memory-mapped a file and processed it without loading it whole",
          "I've found and fixed an allocation hot spot using a profiler",
          "I can reason about struct layout, padding, and #[repr(...)]",
        ],
        project: "Build a binary file parser (e.g. a WAL or image format) that's zero-copy where possible — benchmark it against a naive version.",
      },
      {
        id: "concurrency", name: "Concurrency & Parallelism", level: "required", weight: 20,
        crates: ["crossbeam", "rayon", "parking_lot", "dashmap"],
        concepts: ["Send/Sync semantics", "lock-free vs locked", "work stealing", "atomics & ordering (basics)"],
        why: "These four crates are the corpus's standard answers to shared state — knowing which one a problem needs is the systems interview in miniature.",
        checklist: [
          "I've parallelized a CPU-bound workload with rayon and measured the speedup",
          "I can choose between channels, Mutex, RwLock, and dashmap and justify it",
          "I understand what Send and Sync actually promise the compiler",
          "I've debugged a real deadlock or race and can tell the story",
        ],
        project: "Build a parallel grep or log analyzer: rayon for scanning, crossbeam channels for results, a benchmark table in the README.",
      },
      {
        id: "networking", name: "Networking & Protocols", level: "required", weight: 20,
        crates: ["tokio", "socket2", "rustls", "quinn", "hyper"],
        concepts: ["TCP/UDP semantics", "TLS handshakes", "protocol framing", "epoll/io_uring awareness"],
        why: "The corpus's proxies, VPNs, and RPC layers all live here — TLS with rustls and hand-rolled framing over tokio are their common denominator.",
        checklist: [
          "I've implemented a small wire protocol with length-prefixed framing",
          "I've configured TLS (rustls) on both client and server ends",
          "I can explain what happens between connect() and the first byte",
          "I've load-tested a network service and interpreted the bottleneck",
        ],
        project: "Write a TCP chat or key-value server with a documented wire protocol, TLS, and a stress-test client — numbers in the README.",
      },
      {
        id: "performance", name: "Performance Engineering", level: "recommended", weight: 15,
        crates: ["criterion", "pprof", "divan"],
        concepts: ["Linux perf tooling", "flamegraphs", "benchmark methodology", "SIMD awareness"],
        why: "Measured claims beat adjectives. Corpus projects that win adoption publish criterion benchmarks — do the same in your portfolio.",
        checklist: [
          "I benchmark with criterion and know why microbenchmarks lie",
          "I've read a flamegraph and acted on it",
          "I can use perf/dtrace (or pprof) on a running Rust process",
          "I've made something measurably faster and documented before/after",
        ],
        project: "Take any earlier project and make it 2× faster — publish the flamegraphs, the benchmark suite, and what didn't work.",
      },
      {
        id: "os", name: "OS & Platform", level: "bonus", weight: 10,
        crates: ["nix", "libc", "io-uring"],
        concepts: ["Linux syscalls", "processes & signals", "filesystems", "containers from first principles"],
        why: "The differentiator leg: corpus tools that manage processes, namespaces, and files directly are where systems hires get made.",
        checklist: [
          "I've used nix/libc to work with signals, pipes, or process control",
          "I can explain what a container is in terms of namespaces and cgroups",
          "I know what fsync guarantees and what it costs",
          "I've written something that survives kill -9 correctly",
        ],
        project: "Build a minimal process supervisor (start, restart, signal forwarding, log capture) using nix — no shelling out.",
      },
    ],
  },
  {
    slug:       "infrastructure",
    title:      "Rust Infrastructure Engineer",
    shortTitle: "Infrastructure Engineer",
    tagline:    "Build the distributed systems, storage, and platform layers other engineers stand on.",
    ecoTags:    ["grpc", "database", "tokio"],
    roleKeywords: ["infrastructure", "distributed", "platform", "sre", "reliability", "cloud", "storage", "data platform"],
    areas: [
      {
        id: "foundations", name: "Rust + Async Foundations", level: "required", weight: 15,
        crates: ["tokio", "serde", "thiserror", "futures"],
        concepts: ["everything from the Backend path's first two legs"],
        why: "Infrastructure roles assume backend fluency — the corpus's infra projects are async services first, distributed systems second.",
        checklist: [
          "I'm comfortable with the full Backend path through Async Rust",
          "I've operated (not just built) a long-running async service",
          "I can debug a task leak or a stuck future",
          "I write code that assumes the network will fail",
        ],
        project: "If you haven't: complete the Backend path's API project — it's the substrate everything below runs on.",
      },
      {
        id: "rpc", name: "RPC & Service Communication", level: "required", weight: 20,
        crates: ["tonic", "prost", "tower", "hyper"],
        concepts: ["gRPC & protobuf", "deadlines & retries", "load balancing", "API versioning"],
        why: "tonic/prost is how the corpus's services talk to each other — the lingua franca of Rust infrastructure interviews.",
        checklist: [
          "I've defined protobuf schemas and shipped a tonic service from them",
          "I implement deadlines, retries with backoff, and idempotency deliberately",
          "I've used tower layers for cross-cutting concerns on RPC paths",
          "I can explain streaming RPCs and where they beat unary calls",
        ],
        project: "Build two services that talk over gRPC with deadlines, retries, and a shared proto crate — document the failure modes you handled.",
      },
      {
        id: "distributed", name: "Distributed Systems", level: "required", weight: 20,
        crates: ["etcd-client", "rdkafka", "redis"],
        concepts: ["consensus (Raft mental model)", "leader election", "exactly-once myths", "clocks & ordering"],
        why: "The corpus's databases and queues put these ideas in code you can read — theory is table stakes, sourced from running systems.",
        checklist: [
          "I can explain Raft's happy path and what breaks it",
          "I've built something on a log/queue (Kafka, NATS, Redis streams)",
          "I understand why exactly-once delivery is a lie and what to do instead",
          "I can design a partition-tolerant version of a feature and name the trade-offs",
        ],
        project: "Build a work-queue system with at-least-once delivery, visibility timeouts, and a chaos test that kills workers mid-job.",
      },
      {
        id: "storage", name: "Storage Engines", level: "recommended", weight: 15,
        crates: ["rocksdb", "redb", "sled", "object_store"],
        concepts: ["LSM trees vs B-trees", "WALs & durability", "compaction", "object storage semantics"],
        why: "Rust's storage-engine corpus is unusually strong — reading these codebases is the fastest route to credible storage conversations.",
        checklist: [
          "I've embedded a KV store (rocksdb/redb/sled) and tuned its options",
          "I can explain an LSM tree and what compaction costs",
          "I know what a WAL guarantees and how fsync fits in",
          "I've worked against S3-style object storage semantics from Rust",
        ],
        project: "Write a tiny persistent KV store: WAL, crash-recovery test, and a README explaining your durability guarantees honestly.",
      },
      {
        id: "cloud", name: "Cloud & Orchestration", level: "recommended", weight: 15,
        crates: ["kube", "aws-config", "aws-sdk-s3", "object_store"],
        concepts: ["Kubernetes objects & controllers", "IaC awareness", "IAM/least privilege", "cost as a constraint"],
        why: "The corpus's operators and cloud tooling show Rust moving into platform teams — kube-rs controllers are the portfolio piece that proves it.",
        checklist: [
          "I've deployed my own services to Kubernetes and debugged them there",
          "I've written or modified a controller/operator (kube-rs) or serious cloud automation",
          "I use the AWS/GCP SDKs from Rust with scoped credentials",
          "I can read a cluster incident from events, logs, and metrics",
        ],
        project: "Write a small Kubernetes operator in Rust (kube-rs) that manages something real — a CRD, reconcile loop, and failure handling.",
      },
      {
        id: "observability", name: "Observability & Reliability", level: "required", weight: 15,
        crates: ["tracing", "opentelemetry", "metrics", "governor"],
        concepts: ["SLOs & error budgets", "distributed tracing", "rate limiting & load shedding", "incident habits"],
        why: "Infra engineers are judged on behavior under failure. The corpus's reliability layers — tracing, otel, governor — are the tools of that judgment.",
        checklist: [
          "I propagate trace context across service boundaries",
          "I've defined an SLO and wired an alert that respects it",
          "I've implemented rate limiting or load shedding on a real path",
          "I've run or participated in a blameless postmortem",
        ],
        project: "Add distributed tracing across your gRPC services with OpenTelemetry — include the cross-service trace screenshot and an SLO doc.",
      },
    ],
  },
  {
    slug:       "embedded",
    title:      "Embedded Rust Engineer",
    shortTitle: "Embedded Engineer",
    tagline:    "Ship Rust on microcontrollers and hardware — the field where memory safety pays hardest.",
    ecoTags:    ["embedded"],
    roleKeywords: ["embedded", "firmware", "hardware", "iot", "robotics", "rtos", "bare-metal"],
    areas: [
      {
        id: "foundations", name: "no_std Foundations", level: "required", weight: 20,
        crates: ["heapless", "defmt", "serde"],
        concepts: ["no_std vs std", "panic handlers", "const generics", "memory budgets"],
        why: "Everything on-target starts here: the corpus's firmware shares heapless data structures and defmt logging as its baseline.",
        checklist: [
          "I've built and flashed a no_std binary to real hardware",
          "I use heapless collections and can size them from a memory budget",
          "I've set up defmt/RTT logging and used it to debug on-target",
          "I can explain what disappears without std and how to live without it",
        ],
        project: "Blink an LED the honest way: bare no_std project, linker script understood, defmt logs streaming — write up the toolchain setup.",
      },
      {
        id: "hal", name: "HALs & Peripherals", level: "required", weight: 25,
        crates: ["embedded-hal", "cortex-m", "embedded-hal-async"],
        concepts: ["GPIO/SPI/I2C/UART", "interrupts", "DMA", "datasheets as source of truth"],
        why: "embedded-hal is the trait layer the whole Rust embedded corpus organizes around — driver work against it is the portfolio unit that counts.",
        checklist: [
          "I've driven SPI/I2C peripherals from Rust against a datasheet",
          "I've written an interrupt handler and shared state with it safely",
          "I've written or ported an embedded-hal driver for a sensor/chip",
          "I can read a register map and map it to a typed API",
        ],
        project: "Write and publish an embedded-hal driver crate for a cheap sensor — with docs, an example, and CI building for a target triple.",
      },
      {
        id: "async-embedded", name: "Async on Hardware (Embassy)", level: "recommended", weight: 20,
        crates: ["embassy-executor", "embassy-time", "postcard"],
        concepts: ["async without an OS", "executors on MCUs", "power & timing", "message serialization"],
        why: "Embassy is the corpus's fastest-growing embedded pattern — async task models replacing hand-rolled state machines on MCUs.",
        checklist: [
          "I've run multiple embassy tasks on a microcontroller",
          "I can explain how async works with zero threads and one core",
          "I've serialized structured messages over UART/radio with postcard",
          "I've measured and reduced power draw or latency in a firmware loop",
        ],
        project: "Build a sensor node on embassy: async sampling task, postcard frames over serial, host-side Rust decoder — one repo, both ends.",
      },
      {
        id: "systems-bridge", name: "Host Tools & The Bridge", level: "recommended", weight: 20,
        crates: ["probe-rs", "serialport", "clap", "tokio"],
        concepts: ["flashing & debugging pipelines", "host-side tooling", "hardware-in-the-loop testing"],
        why: "Embedded teams hire people who improve the loop: the corpus's probe-rs ecosystem shows Rust owning the flash-debug-test pipeline itself.",
        checklist: [
          "I flash and debug through probe-rs (or can set it up from scratch)",
          "I've built a host-side CLI that talks to my firmware",
          "I've automated a hardware test that runs on every commit",
          "I can bisect a firmware bug between host, transport, and target",
        ],
        project: "Build a host CLI for your sensor node: live plotting or logging over serial, a --flash subcommand, and a HIL smoke test in CI.",
      },
      {
        id: "rigor", name: "Reliability & Rigor", level: "bonus", weight: 15,
        crates: ["defmt-test", "proptest"],
        concepts: ["watchdogs & brownouts", "OTA updates", "safety mindsets", "power analysis"],
        why: "Firmware that ships must survive the field. This leg is thin on crates and heavy on judgment — the corpus's mature firmware shows both.",
        checklist: [
          "My firmware handles watchdog resets and reports why it rebooted",
          "I've designed (or can design) a safe OTA/rollback scheme",
          "I property-test protocol parsing that faces the real world",
          "I think in failure modes: brownout, flash wear, cosmic-ray bitflips",
        ],
        project: "Add a watchdog, a reboot-reason register, and a crash-count report to your node — then document the failure modes you now survive.",
      },
    ],
  },
]

// ─── Matching helpers ─────────────────────────────────────────────────────────

/** Does a repo provide evidence for a skill area? Requires 2 matching crates
 *  (1 when the area lists ≤3) so serde alone never makes a repo "about" a leg. */
function repoMatchesArea(deps: ReadonlySet<string>, area: SkillArea): boolean {
  const need = area.crates.length <= 3 ? 1 : 2
  let hits = 0
  for (const c of area.crates) {
    if (deps.has(c) && ++hits >= need) return true
  }
  return false
}

function difficultyOf(r: OSSPath): StudyRepo["difficulty"] {
  const cargo  = r.enrichment?.cargo
  const locked = cargo?.lockfileCrateCount ?? null
  const stars  = r.stars ?? 0
  if ((locked != null && locked > 700) || stars > 30_000) return "advanced"
  if (stars < 3_000 && cargo?.isWorkspace !== true)       return "approachable"
  return "intermediate"
}

// ─── Route selection ──────────────────────────────────────────────────────────
// Three climbs per leg, chosen by different quality-signal profiles. A repo
// appears on at most one route per leg (production claims first, then
// contributor, then learning) so the climbs read as genuine alternatives.

const ROUTE_REPOS_MAX = 3

function pushRecency(r: OSSPath): "week" | "month" | null {
  if (!r.pushedAt) return null
  const age = Date.now() - new Date(r.pushedAt).getTime()
  if (age <= 7  * 24 * 3600 * 1000) return "week"
  if (age <= 30 * 24 * 3600 * 1000) return "month"
  return null
}

function selectRoutes(
  candidates: OSSPath[],
  ownerIndex: ReturnType<typeof getOwnerCompanyIndex>,
): Record<ClimbRoute, RouteRepo[]> {
  const taken = new Set<string>()
  const keyOf = (r: OSSPath) => `${r.owner}/${r.name}`

  const toRouteRepo = (r: OSSPath, signals: string[]): RouteRepo => ({
    fullName: keyOf(r),
    href:     `/oss/${r.owner}/${r.name}`,
    stars:    r.stars ?? 0,
    note:     r.note,
    signals,
  })

  // Production: serious, architecture-grade codebases — high stars, or a known
  // organization running it in the open. Complexity is a feature here.
  const production = candidates
    .filter(r => r.activityTier === "active")
    .filter(r => {
      const stars = r.stars ?? 0
      const orgOwned = r.owner ? ownerIndex.has(r.owner.toLowerCase()) : false
      return stars >= 8_000 || (orgOwned && stars >= 2_000)
    })
    .sort((a, b) => (b.stars ?? 0) - (a.stars ?? 0))
    .slice(0, ROUTE_REPOS_MAX)
    .map(r => {
      taken.add(keyOf(r))
      const org    = r.owner ? ownerIndex.get(r.owner.toLowerCase()) : undefined
      const cargo  = r.enrichment?.cargo
      const signals = [
        `★ ${fmtStars(r.stars ?? 0)}`,
        ...(org ? [`run by ${org.name}`] : []),
        ...(cargo?.isWorkspace ? [`workspace · ${cargo.crates?.length ?? "?"} crates`] : []),
        ...(!cargo?.isWorkspace && cargo?.lockfileCrateCount ? [`${cargo.lockfileCrateCount} locked deps`] : []),
      ]
      return toRouteRepo(r, signals)
    })

  // Contributor: active maintainers + a landable backlog. Recency of pushes is
  // the "maintainers respond" proxy; the issue band keeps PRs realistic.
  const contributor = candidates
    .filter(r => r.activityTier === "active" && !taken.has(keyOf(r)))
    .filter(r => {
      const stars  = r.stars ?? 0
      const issues = r.openIssuesCount ?? 0
      return stars >= 300 && stars <= 15_000 && issues >= 10 && issues <= 300
    })
    .sort((a, b) => {
      const ra = pushRecency(a) === "week" ? 1 : 0
      const rb = pushRecency(b) === "week" ? 1 : 0
      return rb - ra || (b.stars ?? 0) - (a.stars ?? 0)
    })
    .slice(0, ROUTE_REPOS_MAX)
    .map(r => {
      taken.add(keyOf(r))
      const rec = pushRecency(r)
      return toRouteRepo(r, [
        `${r.openIssuesCount ?? 0} open issues`,
        ...(rec ? [`pushed this ${rec}`] : []),
        `★ ${fmtStars(r.stars ?? 0)}`,
      ])
    })

  // Learning: small, focused codebases where the leg's crates aren't buried —
  // few direct dependencies, no sprawling workspace, readable in a weekend.
  const learning = candidates
    .filter(r => !taken.has(keyOf(r)))
    .filter(r => r.activityTier === "active" || r.activityTier === "maintenance")
    .filter(r => {
      const stars = r.stars ?? 0
      const deps  = r.dependencies?.length ?? 0
      const ws    = r.enrichment?.cargo?.isWorkspace === true
      return stars >= 100 && stars <= 4_000 && deps > 0 && deps <= 45 && !ws
    })
    .sort((a, b) =>
      // all candidates here are already small & focused — within that band,
      // community-vetted (higher stars) beats merely tiny
      (b.stars ?? 0) - (a.stars ?? 0) ||
      (a.dependencies?.length ?? 99) - (b.dependencies?.length ?? 99)
    )
    .slice(0, ROUTE_REPOS_MAX)
    .map(r => {
      taken.add(keyOf(r))
      return toRouteRepo(r, [
        `${r.dependencies?.length ?? 0} direct deps`,
        `★ ${fmtStars(r.stars ?? 0)}`,
        ...(r.enrichment?.cargo && !r.enrichment.cargo.isWorkspace ? ["single crate"] : []),
      ])
    })

  return { learning, contributor, production }
}

function fmtStars(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}k`
  return String(n)
}

// ─── Resolution (cached per build) ────────────────────────────────────────────

const PATH_ORGS_MAX = 10

let _resolved: Map<string, ResolvedPath> | null = null

function resolveAll(): Map<string, ResolvedPath> {
  if (_resolved) return _resolved

  const repos      = getOSSRepos()
  const liveCounts = getLiveDepCounts()
  const qualified  = new Set(getQualifiedCrates())
  const ownerIndex = getOwnerCompanyIndex()
  const activeJobs = filterActive(JOBS)

  const repoDeps = repos.map(r => ({ r, deps: new Set(r.dependencies ?? []) }))

  _resolved = new Map()

  for (const def of PATH_DEFS) {
    const evidenceSlugs = new Set<string>()

    const areas: ResolvedArea[] = def.areas.map(area => {
      const matching = repoDeps.filter(({ deps }) => repoMatchesArea(deps, area))
      for (const { r } of matching) evidenceSlugs.add(`${r.owner}/${r.name}`)

      const candidates = matching
        .map(({ r }) => r)
        .filter(r => r.owner && r.note)

      const routes = selectRoutes(candidates, ownerIndex)

      const crates: ResolvedCrate[] = area.crates.map(name => ({
        name,
        liveCount: liveCounts[name] ?? 0,
        href:      qualified.has(name) ? `/deps/${name}` : null,
      }))

      return { ...area, crates, routes }
    })

    // Jobs: role/topic keyword match scores highest, ecosystem overlap second.
    const jobs = activeJobs
      .map(j => {
        const hay = `${j.role} ${(j.topics ?? []).join(" ")}`.toLowerCase()
        const kw  = def.roleKeywords.filter(k => hay.includes(k)).length
        const eco = (j.ecosystems ?? []).filter(e => def.ecoTags.includes(e)).length
        return { j, score: kw * 3 + eco }
      })
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(x => x.j)

    // Orgs: companies hiring for the path, then companies whose repos are
    // evidence for it (by count of matching repos).
    const hiringSlugs = new Set(jobs.map(j => j.company_slug))
    const orgRepoCounts = new Map<string, { name: string; slug: string; n: number }>()
    for (const { r, deps } of repoDeps) {
      if (!r.owner) continue
      if (!def.areas.some(a => repoMatchesArea(deps, a))) continue
      const c = ownerIndex.get(r.owner.toLowerCase())
      if (!c) continue
      const e = orgRepoCounts.get(c.slug) ?? { name: c.name, slug: c.slug, n: 0 }
      e.n++
      orgRepoCounts.set(c.slug, e)
    }
    const orgs: PathOrg[] = [...orgRepoCounts.values()]
      .sort((a, b) =>
        Number(hiringSlugs.has(b.slug)) - Number(hiringSlugs.has(a.slug)) || b.n - a.n
      )
      .slice(0, PATH_ORGS_MAX)
      .map(o => ({
        name:   o.name,
        slug:   o.slug,
        href:   `/ecosystem/${o.slug}`,
        hiring: hiringSlugs.has(o.slug),
      }))

    _resolved.set(def.slug, {
      slug:          def.slug,
      title:         def.title,
      shortTitle:    def.shortTitle,
      tagline:       def.tagline,
      areas,
      jobs,
      orgs,
      evidenceRepos: evidenceSlugs.size,
    })
  }

  return _resolved
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getCareerPathSlugs(): string[] {
  return PATH_DEFS.map(p => p.slug)
}

export function getCareerPath(slug: string): ResolvedPath | undefined {
  return resolveAll().get(slug)
}

export function getAllCareerPaths(): ResolvedPath[] {
  return getCareerPathSlugs().map(s => resolveAll().get(s)!)
}

export function getPathCardStats(): PathCardStats[] {
  return getAllCareerPaths().map(p => ({
    slug:          p.slug,
    title:         p.title,
    shortTitle:    p.shortTitle,
    tagline:       p.tagline,
    evidenceRepos: p.evidenceRepos,
    openJobs:      p.jobs.length,
    areaCount:     p.areas.length,
  }))
}

// ─── Job → path matching ──────────────────────────────────────────────────────

export type JobPathMatch = {
  path:    ResolvedPath
  signals: string[]   // human-readable reasons for the match
}

export function matchPathForJob(job: EditorialJob): JobPathMatch | null {
  const hay = `${job.role} ${(job.topics ?? []).join(" ")}`.toLowerCase()

  let best: { def: CareerPathDef; score: number; signals: string[] } | null = null
  for (const def of PATH_DEFS) {
    const kwHits  = def.roleKeywords.filter(k => hay.includes(k))
    const ecoHits = (job.ecosystems ?? []).filter(e => def.ecoTags.includes(e))
    const score   = kwHits.length * 3 + ecoHits.length
    if (score > 0 && (!best || score > best.score)) {
      best = {
        def,
        score,
        signals: [
          ...kwHits.map(k => `role mentions “${k}”`),
          ...ecoHits.map(e => `works in the ${e} ecosystem`),
        ],
      }
    }
  }
  if (!best) return null
  const path = resolveAll().get(best.def.slug)!
  return { path, signals: best.signals.slice(0, 3) }
}

// ─── Repo → career relevance ──────────────────────────────────────────────────

export type RepoCareerRelevance = {
  paths: Array<{
    slug:       string
    shortTitle: string
    href:       string
    areas:      string[]   // matched area names, aka "good for learning"
  }>
  difficulty:      StudyRepo["difficulty"]
  contribution:    string | null   // portfolio-impact sentence, when earned
}

export function getRepoCareerRelevance(repo: OSSPath): RepoCareerRelevance | null {
  const deps = new Set(repo.dependencies ?? [])
  if (deps.size === 0) return null

  const paths: RepoCareerRelevance["paths"] = []
  for (const def of PATH_DEFS) {
    const matched = def.areas.filter(a => repoMatchesArea(deps, a))
    // Foundations legs match half the corpus — require something more specific.
    const specific = matched.filter(a => a.id !== "foundations")
    if (specific.length > 0) {
      paths.push({
        slug:       def.slug,
        shortTitle: def.shortTitle,
        href:       `/paths/${def.slug}`,
        areas:      specific.map(a => a.name),
      })
    }
  }
  if (paths.length === 0) return null

  const stars  = repo.stars ?? 0
  const issues = repo.openIssuesCount ?? 0
  const contribution =
    repo.activityTier === "active" && issues >= 10 && issues <= 300 && stars >= 300 && stars <= 15_000
      ? `Realistic first-contribution target: active project, ${issues} open issues, small enough for a newcomer PR to land.`
      : repo.activityTier === "active" && issues > 300
        ? `Active with ${issues} open issues — a backlog this size means triage first; look for “good first issue” labels before diving in.`
        : null

  return { paths, difficulty: difficultyOf(repo), contribution }
}
