import "server-only"

import { getOSSRepos } from "@/lib/oss-data"
import { getLiveDepCounts, getQualifiedCrates } from "@/lib/deps-data"
import { getOwnerCompanyIndex } from "@/lib/company-data"
import { getCurationOverlay } from "@/lib/curation-overlay"
import { JOBS } from "@/content/jobs"
import { filterActive } from "@/lib/content-utils"
import type { EditorialJob } from "@/content/jobs"
import type { EcoTag } from "@/lib/eco-tags"
import type { OSSPublicRepo } from "@/content/oss-paths"

// ─── Model ────────────────────────────────────────────────────────────────────
//
// A career path is a set of CAPABILITIES - the rigid part. Each capability
// states outcomes you must come away understanding; those never flex.
//
// How you get there is the flexible part: each capability offers several
// APPROACHES - genuinely different classes of repositories that can teach and
// prove the same skill. The corpus supplies the repos at build time; nothing
// below hardcodes a blessed list. Repos are vehicles; the capability is the
// destination.

export type SkillLevel = "required" | "recommended" | "bonus"

export type RepoDifficulty = "approachable" | "intermediate" | "advanced"

/** One way in: a class of repos that teaches/proves the capability. */
export interface Approach {
  id:       string
  name:     string
  vehicle:  string     // what working with this class of repo teaches you
  crates:   string[]   // dependency evidence - repos that USE these qualify
  keywords: string[]   // domain evidence - repos that ARE this (name/topics/note)
  /** Crates are alternatives (actix vs rocket vs warp): one hit qualifies
   *  even on a long list. Without it, long lists require two hits. */
  anyCrate?: boolean
  /** Dependency evidence is too generic here (tokio, hyper…): keywords decide
   *  membership, crates only influence ranking and the browse link. */
  kwRequired?: boolean
}

export interface Capability {
  id:         string
  name:       string
  level:      SkillLevel
  weight:     number     // share of path readiness (sums ~100 per path)
  why:        string     // evidence-flavored: what the corpus shows
  outcomes:   string[]   // RIGID: what you must come away understanding
  concepts:   string[]   // non-crate skills the capability assumes
  checklist:  string[]   // self-assessment: concrete "I have done X" items
  project:    string     // one concrete portfolio project
  approaches: Approach[] // FLEXIBLE: pick any vehicle, same destination
}

export interface CareerPathDef {
  slug:         string
  title:        string
  shortTitle:   string
  tagline:      string
  ecoTags:      EcoTag[]     // job/company matching
  roleKeywords: string[]     // matched against job role + topics
  capabilities: Capability[]
}

export type ResolvedCrate = {
  name:      string
  liveCount: number
  href:      string | null   // /deps page when one exists
}

/** A comparable alternative: one repo that can carry you up this approach. */
export type AltRepo = {
  fullName:            string
  href:                string
  stars:               number
  note:                string
  difficulty:          RepoDifficulty
  signals:             string[]  // why this repo earned its slot
  contributorFriendly: boolean   // active + landable backlog
  curated:             boolean   // a human explicitly featured it
}

export type ResolvedApproach = Omit<Approach, "crates"> & {
  crates:       ResolvedCrate[]
  repos:        AltRepo[]       // approachable → advanced, up to 3 per band
  totalMatches: number          // corpus-wide matches, before the cut
  browseHref:   string | null   // deep link into /oss for the full set
}

export type ResolvedCapability = Omit<Capability, "approaches"> & {
  approaches:    ResolvedApproach[]
  totalEvidence: number   // distinct corpus repos matching any approach
}

export type PathOrg = { name: string; slug: string; href: string; hiring: boolean }

export type ResolvedPath = {
  slug:          string
  title:         string
  shortTitle:    string
  tagline:       string
  capabilities:  ResolvedCapability[]
  jobs:          EditorialJob[]
  orgs:          PathOrg[]
  evidenceRepos: number      // distinct corpus repos matching any capability
}

export type PathCardStats = {
  slug:            string
  title:           string
  shortTitle:      string
  tagline:         string
  evidenceRepos:   number
  openJobs:        number
  capabilityCount: number
}

// ─── Path definitions ─────────────────────────────────────────────────────────
// Editorial content. Numbers are NEVER written here — every count and every
// repo shown in the UI is resolved live from the corpus at build time.

const PATH_DEFS: CareerPathDef[] = [
  {
    slug:       "backend",
    title:      "Rust Backend Engineer",
    shortTitle: "Backend Engineer",
    tagline:    "Build the APIs and services companies run in production — the most-hired Rust role.",
    ecoTags:    ["axum", "tokio", "database"],
    roleKeywords: ["backend", "api", "web", "product engineer", "full-stack", "fullstack", "platform"],
    capabilities: [
      {
        id: "foundations", name: "Rust Foundations", level: "required", weight: 15,
        outcomes: [
          "model data with the type system instead of runtime checks",
          "design error types that callers can actually handle",
          "explain ownership and lifetimes without looking them up",
        ],
        concepts: ["ownership & borrowing", "Result-based error handling", "traits & generics", "cargo workspaces"],
        why: "Every production service in the corpus sits on the same base layer: typed serialization and structured errors. This is the vocabulary the rest of the path assumes.",
        checklist: [
          "I can model a JSON API's types with serde derive and custom (de)serializers",
          "I design error types with thiserror in libraries and anyhow in binaries",
          "I can explain ownership and lifetimes without looking them up",
          "I've published or maintained a crate/binary with a clean cargo project layout",
        ],
        project: "Build a CLI tool with clap that ingests JSON/CSV with serde and reports typed, recoverable errors — small, finished, and pinned on your GitHub.",
        approaches: [
          {
            id: "tools", name: "Command-line tools",
            vehicle: "Small finished binaries — the fastest honest feedback loop for ownership, errors, and project layout.",
            crates: ["clap", "serde", "anyhow"],
            keywords: ["cli"],
          },
          {
            id: "formats", name: "Data & formats",
            vehicle: "Parsers, converters, and serializers — repos where the type system does the heavy lifting.",
            crates: ["serde", "serde_json", "csv", "toml"],
            keywords: ["parser", "serialization", "converter"],
          },
        ],
      },
      {
        id: "async", name: "Async Rust & Tokio", level: "required", weight: 20,
        outcomes: [
          "understand tasks, cancellation, and why blocking the runtime is a bug",
          "understand channels and backpressure as design tools",
          "operate concurrent code you can reason about under load",
        ],
        concepts: ["tasks vs threads", "cancellation & timeouts", "channels & backpressure", "pinning (working knowledge)"],
        why: "Async is the defining skill gap between hobby Rust and production Rust — the runtime layer beneath nearly every service repo in this corpus.",
        checklist: [
          "I've built a program that runs concurrent tasks with tokio::spawn and joins them safely",
          "I use timeouts and cancellation (select!, CancellationToken) deliberately",
          "I can move data between tasks with mpsc/broadcast channels and explain backpressure",
          "I can explain what .await yields to and why blocking the runtime is a bug",
        ],
        project: "Write a concurrent scraper or queue worker: bounded concurrency, per-task timeouts, graceful shutdown on Ctrl-C.",
        approaches: [
          {
            id: "runtime", name: "Runtime & task patterns",
            vehicle: "Repos built directly on tokio primitives — read how real services structure tasks, shutdown, and channels.",
            crates: ["tokio", "tokio-util", "futures"],
            keywords: ["async runtime"],
          },
          {
            id: "clients", name: "Network clients & scrapers",
            vehicle: "Concurrent HTTP clients under rate limits and timeouts — async pressure-tested against the real internet.",
            crates: ["reqwest", "hyper", "tokio"],
            keywords: ["scraper", "crawler", "downloader", "http client"],
          },
          {
            id: "workers", name: "Workers & background jobs",
            vehicle: "Queue consumers and schedulers — where cancellation, retries, and backpressure stop being theory.",
            crates: ["lapin", "apalis"],
            keywords: ["job queue", "worker", "scheduler", "task queue"],
          },
        ],
      },
      {
        id: "web", name: "Web Services", level: "required", weight: 20,
        outcomes: [
          "ship an HTTP API with auth, validation, and error mapping",
          "understand middleware as composable services",
          "consume external APIs defensively (retries, timeouts, idempotency)",
        ],
        concepts: ["REST design", "middleware/layers", "auth (JWT/sessions)", "streaming responses"],
        why: "The axum/tower stack is the corpus's dominant way to ship HTTP services — but any of these stacks proves the same ability.",
        checklist: [
          "I've shipped an HTTP API with extractors, typed responses, and error mapping",
          "I've written or composed middleware (auth, rate limiting, request IDs)",
          "I've consumed external APIs with reqwest, handling retries and timeouts",
          "I can explain what tower's Service trait abstracts and why it matters",
        ],
        project: "Ship a real REST API: auth, pagination, input validation, OpenAPI docs — deployed somewhere public with its URL in the README.",
        approaches: [
          {
            id: "axum", name: "The axum/tower stack",
            vehicle: "The corpus's dominant stack — most job listings implicitly assume it, and tower's Service trait repays study.",
            crates: ["axum", "tower", "tower-http", "hyper"],
            keywords: [],
          },
          {
            id: "other-frameworks", name: "Other frameworks",
            vehicle: "actix-web, rocket, poem, warp — different ergonomics, same HTTP fundamentals. Fluency transfers.",
            crates: ["actix-web", "rocket", "warp", "poem", "salvo"],
            keywords: [],
            anyCrate: true,
          },
          {
            id: "real-apis", name: "APIs running in production",
            vehicle: "Services companies operate in the open — read how auth, versioning, and errors look at scale.",
            crates: ["axum", "actix-web", "utoipa"],
            keywords: ["api server", "rest api", "self-hosted"],
          },
        ],
      },
      {
        id: "data", name: "Databases & Persistence", level: "required", weight: 15,
        outcomes: [
          "understand transactions, isolation, and connection pooling",
          "keep schema changes deployable (migrations as code)",
          "choose between SQL, embedded, and cache storage deliberately",
        ],
        concepts: ["PostgreSQL", "migrations", "connection pooling", "transactions & isolation"],
        why: "Persistence separates demo APIs from hireable experience. Which store you learn on matters less than proving you understand the tradeoffs.",
        checklist: [
          "I've built a service with migrations checked into the repo",
          "I understand connection pooling and have tuned pool size under load",
          "I can write and reason about a transaction with correct error rollback",
          "I've used Redis (or similar) for caching or queues from Rust",
        ],
        project: "Add PostgreSQL to your API: migrations, a transactional endpoint, and an integration test that runs against a real database (testcontainers).",
        approaches: [
          {
            id: "sql", name: "SQL, compile-checked",
            vehicle: "sqlx/diesel/sea-orm codebases — the compile-time-checked query patterns reviewers look for in Rust.",
            crates: ["sqlx", "diesel", "sea-orm"],
            keywords: [],
          },
          {
            id: "embedded-kv", name: "Embedded & key-value stores",
            vehicle: "rusqlite/sled/redb/rocksdb users — persistence without a server, and a window into how storage actually works.",
            crates: ["rusqlite", "sled", "redb", "rocksdb"],
            keywords: [],
            anyCrate: true,
          },
          {
            id: "cache-queue", name: "Caching & queues",
            vehicle: "Redis-backed services — the cache/queue layer most production incidents route through.",
            crates: ["redis", "deadpool-redis", "bb8"],
            keywords: ["cache", "caching"],
          },
        ],
      },
      {
        id: "observability", name: "Observability", level: "recommended", weight: 15,
        outcomes: [
          "instrument services so a stranger can debug them from telemetry",
          "understand spans, context propagation, and structured events",
          "find a slow request in production without adding println",
        ],
        concepts: ["structured logging", "spans & context propagation", "dashboards & alerts"],
        why: "The corpus shows tracing wherever services run for real — it's the difference between 'it works on my machine' and operating software.",
        checklist: [
          "I instrument services with tracing spans, not println!",
          "I've configured tracing-subscriber with per-module filters and JSON output",
          "I've exported metrics or traces to something (Prometheus, OTLP, honeycomb…)",
          "I can find a slow request in production from telemetry alone",
        ],
        project: "Instrument your API end-to-end: request spans, error events, latency metrics — screenshot the trace waterfall in your README.",
        approaches: [
          {
            id: "instrumented", name: "Instrumented services",
            vehicle: "Repos that carry serious tracing/metrics setups — steal their subscriber configs and span discipline.",
            crates: ["tracing", "tracing-subscriber", "metrics", "opentelemetry"],
            keywords: [],
          },
          {
            id: "observability-tools", name: "Observability tooling itself",
            vehicle: "Log shippers, collectors, and monitors written in Rust — learn observability by building the pipeline.",
            crates: ["prometheus", "tracing"],
            keywords: ["monitoring", "logging", "observability", "telemetry"],
            kwRequired: true,
          },
        ],
      },
      {
        id: "production", name: "Testing & Shipping", level: "recommended", weight: 15,
        outcomes: [
          "trust your test suite enough to deploy on green",
          "containerize and ship a service with CI you wrote",
          "understand config, health checks, and graceful shutdown",
        ],
        concepts: ["Docker", "CI pipelines", "integration testing", "graceful shutdown & config"],
        why: "Hiring managers read your tests before your handlers. Repos in this corpus that companies actually run all carry serious test suites.",
        checklist: [
          "My projects run integration tests against real dependencies in CI",
          "I've containerized a Rust service with a small multi-stage Dockerfile",
          "I use snapshot or property tests where they beat example tests",
          "My services read config from the environment and shut down gracefully",
        ],
        project: "Give your API a production spine: Dockerfile, GitHub Actions CI running integration tests, health checks, and zero-warning clippy.",
        approaches: [
          {
            id: "test-discipline", name: "Serious test suites",
            vehicle: "Repos whose testing you should imitate — snapshot tests, property tests, containers in CI.",
            crates: ["insta", "proptest", "testcontainers", "mockall"],
            keywords: [],
          },
        ],
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
    capabilities: [
      {
        id: "foundations", name: "Unsafe, FFI & the Edges", level: "required", weight: 15,
        outcomes: [
          "understand what unsafe blocks promise and what they cost",
          "cross an FFI boundary in both directions without UB",
          "review unsafe code critically instead of trusting it",
        ],
        concepts: ["ownership deeply", "unsafe fundamentals", "FFI basics", "no-panic discipline"],
        why: "Systems roles assume the same base layer as every other Rust job — plus comfort at the edges where safe Rust meets the operating system.",
        checklist: [
          "I can explain aliasing rules and why unsafe blocks carry proof obligations",
          "I've called into C (or been called from it) across an FFI boundary",
          "I know when to reach for Box/Rc/Arc/Cow and what each costs",
          "I've read unsafe code in a real crate and could review it critically",
        ],
        project: "Write safe Rust bindings over a small C library — document the invariants each unsafe block relies on.",
        approaches: [
          {
            id: "bindings", name: "Bindings & FFI layers",
            vehicle: "Crates that wrap C libraries safely — the canonical unsafe-review reading list.",
            crates: ["libc", "bindgen", "cc"],
            keywords: ["bindings", "ffi", "sys crate"],
          },
          {
            id: "low-level-tools", name: "Low-level tools",
            vehicle: "Tools that touch processes, memory, and files directly — systems judgment in binary-sized doses.",
            crates: ["nix", "libc"],
            keywords: ["strace", "ptrace", "debugger", "disassembler", "hex editor", "system call", "reverse engineering", "elf", "binary analysis"],
            kwRequired: true,
          },
        ],
      },
      {
        id: "memory", name: "Memory & Data Layout", level: "required", weight: 20,
        outcomes: [
          "understand stack vs heap, cache lines, and layout costs",
          "process data zero-copy where it matters and prove the win",
          "profile allocations instead of guessing",
        ],
        concepts: ["stack vs heap", "cache lines & locality", "zero-copy parsing", "allocation profiling"],
        why: "Zero-copy buffer handling is the recurring pattern across the corpus's runtimes, proxies, and databases — the skill that makes Rust worth hiring for.",
        checklist: [
          "I can explain why Bytes enables zero-copy sharing and when it doesn't help",
          "I've memory-mapped a file and processed it without loading it whole",
          "I've found and fixed an allocation hot spot using a profiler",
          "I can reason about struct layout, padding, and #[repr(...)]",
        ],
        project: "Build a binary file parser (e.g. a WAL or image format) that's zero-copy where possible — benchmark it against a naive version.",
        approaches: [
          {
            id: "zero-copy", name: "Buffers & zero-copy",
            vehicle: "Repos built on bytes/memmap2/bytemuck — where buffer discipline is the architecture.",
            crates: ["bytes", "memmap2", "bytemuck", "smallvec"],
            keywords: [],
          },
          {
            id: "codecs", name: "Parsers & codecs",
            vehicle: "Binary format readers and writers — layout, endianness, and framing made concrete.",
            crates: ["nom", "byteorder", "binrw"],
            keywords: ["decoder", "encoder", "codec", "binary format"],
          },
          {
            id: "compression", name: "Compression & encoding",
            vehicle: "Compressors and archivers — throughput-obsessed code where every allocation shows up in the benchmark.",
            crates: ["flate2", "zstd", "lz4"],
            keywords: ["compression", "archiver", "compressor"],
          },
        ],
      },
      {
        id: "concurrency", name: "Concurrency & Parallelism", level: "required", weight: 20,
        outcomes: [
          "understand what Send and Sync actually promise the compiler",
          "choose between channels, locks, and lock-free structures and justify it",
          "measure parallel speedups instead of assuming them",
        ],
        concepts: ["Send/Sync semantics", "lock-free vs locked", "work stealing", "atomics & ordering (basics)"],
        why: "These crates are the corpus's standard answers to shared state — knowing which one a problem needs is the systems interview in miniature.",
        checklist: [
          "I've parallelized a CPU-bound workload with rayon and measured the speedup",
          "I can choose between channels, Mutex, RwLock, and dashmap and justify it",
          "I understand what Send and Sync actually promise the compiler",
          "I've debugged a real deadlock or race and can tell the story",
        ],
        project: "Build a parallel grep or log analyzer: rayon for scanning, crossbeam channels for results, a benchmark table in the README.",
        approaches: [
          {
            id: "data-parallel", name: "Data parallelism",
            vehicle: "rayon-powered tools — embarrassingly parallel work done properly, with measurable speedups.",
            crates: ["rayon"],
            keywords: [],
          },
          {
            id: "shared-state", name: "Locks, channels & lock-free",
            vehicle: "crossbeam/parking_lot/dashmap users — the shared-state decisions systems interviews probe.",
            crates: ["crossbeam", "parking_lot", "dashmap", "arc-swap"],
            keywords: [],
          },
        ],
      },
      {
        id: "networking", name: "Networking & Protocols", level: "required", weight: 20,
        outcomes: [
          "understand what happens between connect() and the first byte",
          "implement a wire protocol with framing you can defend",
          "run TLS on both ends and know what the handshake costs",
        ],
        concepts: ["TCP/UDP semantics", "TLS handshakes", "protocol framing", "epoll/io_uring awareness"],
        why: "The corpus's proxies, VPNs, and RPC layers all live here — TLS with rustls and hand-rolled framing over tokio are their common denominator.",
        checklist: [
          "I've implemented a small wire protocol with length-prefixed framing",
          "I've configured TLS (rustls) on both client and server ends",
          "I can explain what happens between connect() and the first byte",
          "I've load-tested a network service and interpreted the bottleneck",
        ],
        project: "Write a TCP chat or key-value server with a documented wire protocol, TLS, and a stress-test client — numbers in the README.",
        approaches: [
          {
            id: "transports", name: "Transports & TLS",
            vehicle: "QUIC, TLS, and raw-socket codebases — the transport layer read from source.",
            crates: ["rustls", "quinn", "socket2", "s2n-quic"],
            keywords: ["quic", "tls"],
          },
          {
            id: "proxies", name: "Proxies, tunnels & VPNs",
            vehicle: "Traffic that flows through your code — framing, backpressure, and failure handling at line rate.",
            crates: ["tokio", "hyper", "rustls"],
            keywords: ["proxy", "tunnel", "vpn", "load balancer"],
            kwRequired: true,
          },
          {
            id: "protocol-impls", name: "Protocol implementations",
            vehicle: "DNS, SSH, MQTT, HTTP servers built from the RFC up — the deepest form of protocol fluency.",
            crates: ["tokio", "bytes"],
            keywords: ["dns", "ssh", "mqtt", "protocol implementation", "http server"],
            kwRequired: true,
          },
        ],
      },
      {
        id: "performance", name: "Performance Engineering", level: "recommended", weight: 15,
        outcomes: [
          "benchmark honestly and know why microbenchmarks lie",
          "read a flamegraph and act on it",
          "make something measurably faster and document before/after",
        ],
        concepts: ["Linux perf tooling", "flamegraphs", "benchmark methodology", "SIMD awareness"],
        why: "Measured claims beat adjectives. Corpus projects that win adoption publish criterion benchmarks — do the same in your portfolio.",
        checklist: [
          "I benchmark with criterion and know why microbenchmarks lie",
          "I've read a flamegraph and acted on it",
          "I can use perf/dtrace (or pprof) on a running Rust process",
          "I've made something measurably faster and documented before/after",
        ],
        project: "Take any earlier project and make it 2× faster — publish the flamegraphs, the benchmark suite, and what didn't work.",
        approaches: [
          {
            id: "benchmarked", name: "Benchmark-driven projects",
            vehicle: "Repos with serious criterion suites — read how performance claims get earned.",
            crates: ["criterion", "divan"],
            keywords: [],
          },
          {
            id: "perf-tools", name: "Profilers & perf tooling",
            vehicle: "The instruments themselves — profilers, flamegraph generators, benchmark harnesses in Rust.",
            crates: ["pprof", "inferno"],
            keywords: ["profiler", "flamegraph", "benchmark"],
          },
        ],
      },
      {
        id: "os", name: "OS & Platform", level: "bonus", weight: 10,
        outcomes: [
          "understand containers in terms of namespaces and cgroups",
          "know what fsync guarantees and what it costs",
          "write software that survives kill -9 correctly",
        ],
        concepts: ["Linux syscalls", "processes & signals", "filesystems", "containers from first principles"],
        why: "The differentiator: corpus tools that manage processes, namespaces, and files directly are where systems hires get made.",
        checklist: [
          "I've used nix/libc to work with signals, pipes, or process control",
          "I can explain what a container is in terms of namespaces and cgroups",
          "I know what fsync guarantees and what it costs",
          "I've written something that survives kill -9 correctly",
        ],
        project: "Build a minimal process supervisor (start, restart, signal forwarding, log capture) using nix — no shelling out.",
        approaches: [
          {
            id: "syscalls", name: "Processes & syscalls",
            vehicle: "Supervisors, shells, and init systems — the process lifecycle owned directly.",
            crates: ["nix", "libc"],
            keywords: ["shell", "init", "supervisor", "sandbox"],
          },
          {
            id: "kernel-adjacent", name: "eBPF, io_uring & kernel-adjacent",
            vehicle: "Where Rust meets the kernel — observability and I/O at the syscall boundary and below.",
            crates: ["aya", "io-uring", "libbpf-rs"],
            keywords: ["ebpf", "bpf", "io_uring", "kernel"],
          },
          {
            id: "filesystems", name: "Files & filesystems",
            vehicle: "FUSE filesystems, sync tools, and storage utilities — durability semantics learned the honest way.",
            crates: ["fuser", "notify"],
            keywords: ["filesystem", "fuse", "backup"],
          },
        ],
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
    capabilities: [
      {
        id: "foundations", name: "Async Production Systems", level: "required", weight: 15,
        outcomes: [
          "operate (not just build) long-running async services",
          "write code that assumes the network will fail",
          "debug a task leak or a stuck future",
        ],
        concepts: ["everything from the Backend path's first two legs", "deadlines everywhere", "graceful degradation"],
        why: "Infrastructure roles assume backend fluency — the corpus's infra projects are async services first, distributed systems second.",
        checklist: [
          "I'm comfortable with the full Backend path through Async Rust",
          "I've operated (not just built) a long-running async service",
          "I can debug a task leak or a stuck future",
          "I write code that assumes the network will fail",
        ],
        project: "If you haven't: complete the Backend path's API project — it's the substrate everything below runs on.",
        approaches: [
          {
            id: "production-services", name: "Services run in anger",
            vehicle: "Long-running daemons operated by real organizations — read their shutdown, retry, and failure paths.",
            crates: ["tokio", "tracing", "tower"],
            keywords: ["daemon", "self-hosted"],
          },
          {
            id: "sdks", name: "Clients & SDKs",
            vehicle: "Cloud and database clients — the defensive-programming patterns of code that talks to unreliable things.",
            crates: ["aws-config", "aws-sdk-s3", "etcd-client"],
            keywords: ["sdk", "client library"],
            anyCrate: true,
          },
        ],
      },
      {
        id: "networking", name: "Networking Under Failure", level: "required", weight: 15,
        outcomes: [
          "understand network failures: partitions, timeouts, retries, backpressure",
          "understand what proxies and load balancers actually do to your traffic",
          "reason about latency budgets across hops",
        ],
        concepts: ["TCP vs QUIC tradeoffs", "connection pooling & reuse", "retry storms & jitter", "health checking"],
        why: "Every distributed failure is a network failure first. The corpus's proxies, DNS servers, and transports are where those failures live in readable code.",
        checklist: [
          "I've configured retries with backoff and jitter and can explain retry storms",
          "I can trace a request through a proxy/LB and name what can break at each hop",
          "I've handled partial failure (some backends down) without cascading",
          "I can explain what QUIC changes versus TCP+TLS and when it matters",
        ],
        project: "Build a small L7 reverse proxy: health checks, per-backend circuit breaking, and a chaos script that kills backends while a load test runs.",
        approaches: [
          {
            id: "proxies", name: "Proxies & service mesh",
            vehicle: "Production proxies and mesh dataplanes — the code your packets already flow through.",
            crates: ["hyper", "tower", "rustls"],
            keywords: ["proxy", "load balancer", "service mesh", "gateway", "ingress"],
            kwRequired: true,
          },
          {
            id: "name-transport", name: "DNS & transports",
            vehicle: "Name resolution and QUIC/TLS stacks — the layers underneath everything, implemented from the RFC.",
            crates: ["quinn", "rustls", "hickory-resolver"],
            keywords: ["dns", "quic", "resolver"],
          },
          {
            id: "rpc", name: "RPC & service communication",
            vehicle: "tonic/gRPC services — deadlines, streaming, and versioned APIs between services.",
            crates: ["tonic", "prost", "tower"],
            keywords: ["grpc", "rpc"],
          },
        ],
      },
      {
        id: "coordination", name: "Coordination & Consensus", level: "required", weight: 20,
        outcomes: [
          "understand consensus: what Raft guarantees and what breaks it",
          "understand leader election, membership, and split brain",
          "understand why exactly-once delivery is a lie and what to do instead",
        ],
        concepts: ["Raft mental model", "quorums & fencing", "clocks & ordering", "idempotency as a design tool"],
        why: "The corpus puts consensus in code you can read — implementations, coordination clients, and the databases built on them. Theory is table stakes; these repos are the source.",
        checklist: [
          "I can explain Raft's happy path and what breaks it",
          "I can design leader election with fencing tokens and explain split brain",
          "I understand why exactly-once delivery is a lie and what to do instead",
          "I can design a partition-tolerant version of a feature and name the trade-offs",
        ],
        project: "Build a replicated key-value store on a Raft crate: three nodes, leader failover test, and a README explaining exactly what is and isn't guaranteed.",
        approaches: [
          {
            id: "consensus-impls", name: "Consensus implementations",
            vehicle: "Raft and consensus libraries themselves — read the state machine, not the blog post about it.",
            crates: ["openraft", "raft"],
            keywords: ["raft", "consensus", "paxos"],
          },
          {
            id: "coordination-clients", name: "Coordination services & clients",
            vehicle: "etcd/ZooKeeper-style coordination from the client side — locks, leases, and watches in production shape.",
            crates: ["etcd-client", "zookeeper"],
            keywords: ["etcd", "leader election", "service discovery"],
          },
          {
            id: "distributed-db", name: "Distributed databases",
            vehicle: "The systems that put consensus to work — replication, transactions, and failure recovery at scale.",
            crates: ["raft", "openraft"],
            keywords: ["distributed database", "distributed transactions", "distributed-systems", "replication"],
          },
        ],
      },
      {
        id: "streaming", name: "Queues & Streaming", level: "required", weight: 15,
        outcomes: [
          "understand queues: delivery guarantees, visibility timeouts, dead letters",
          "understand streams versus queues and when each fits",
          "design consumers that survive redelivery and reordering",
        ],
        concepts: ["at-least-once semantics", "consumer groups & offsets", "backpressure end-to-end", "windowing basics"],
        why: "Queues are how distributed systems absorb failure. The corpus's stream processors, log shippers, and messaging clients show the semantics in running code.",
        checklist: [
          "I've built something on a log/queue (Kafka, NATS, Redis streams)",
          "I handle redelivery: my consumers are idempotent and I can prove it",
          "I can explain consumer groups, offsets, and what rebalancing does",
          "I've measured and fixed a backpressure problem end-to-end",
        ],
        project: "Build a work-queue system with at-least-once delivery, visibility timeouts, and a chaos test that kills workers mid-job.",
        approaches: [
          {
            id: "stream-processors", name: "Stream processors & pipelines",
            vehicle: "The engines that transform data in motion — windowing, watermarks, and exactly-once claims to audit.",
            crates: ["arrow", "rdkafka"],
            keywords: ["stream processing", "etl", "data pipeline", "observability pipeline"],
          },
          {
            id: "messaging", name: "Messaging systems & clients",
            vehicle: "Kafka/NATS/AMQP from both sides — brokers and the clients that survive them.",
            crates: ["rdkafka", "async-nats", "lapin", "rumqttc"],
            keywords: ["kafka", "nats", "message broker", "pubsub"],
            anyCrate: true,
          },
        ],
      },
      {
        id: "storage", name: "Storage Tradeoffs", level: "recommended", weight: 15,
        outcomes: [
          "understand storage tradeoffs: LSM vs B-tree, WALs, compaction",
          "know what fsync guarantees and what durability actually costs",
          "work against object storage semantics without pretending it's a filesystem",
        ],
        concepts: ["LSM trees vs B-trees", "WALs & durability", "compaction", "object storage semantics"],
        why: "Rust's storage-engine corpus is unusually strong — reading these codebases is the fastest route to credible storage conversations.",
        checklist: [
          "I've embedded a KV store (rocksdb/redb/sled) and tuned its options",
          "I can explain an LSM tree and what compaction costs",
          "I know what a WAL guarantees and how fsync fits in",
          "I've worked against S3-style object storage semantics from Rust",
        ],
        project: "Write a tiny persistent KV store: WAL, crash-recovery test, and a README explaining your durability guarantees honestly.",
        approaches: [
          {
            id: "engines", name: "Storage engines",
            vehicle: "B-tree and LSM engines you can read end to end — the WAL, the compactor, the recovery path.",
            crates: ["rocksdb", "sled", "redb"],
            keywords: ["storage engine", "lsm", "b-tree", "key-value"],
          },
          {
            id: "query-engines", name: "Query & analytics engines",
            vehicle: "DataFusion/Arrow-based engines — columnar layouts, vectorized execution, and SQL planners in Rust.",
            crates: ["datafusion", "arrow", "parquet"],
            keywords: ["query engine", "olap", "analytics", "dataframe"],
          },
          {
            id: "object-storage", name: "Object storage & data lakes",
            vehicle: "S3-semantics systems — multipart uploads, listing pathologies, and eventual consistency handled honestly.",
            crates: ["object_store", "aws-sdk-s3", "opendal"],
            keywords: ["object storage", "s3", "data lake", "blob"],
          },
        ],
      },
      {
        id: "reliability", name: "Observability & Reliability", level: "required", weight: 20,
        outcomes: [
          "propagate trace context across service boundaries",
          "understand SLOs, error budgets, and load shedding",
          "run async systems in production and learn from their incidents",
        ],
        concepts: ["SLOs & error budgets", "distributed tracing", "rate limiting & load shedding", "incident habits"],
        why: "Infra engineers are judged on behavior under failure. The corpus's reliability layers — tracing, otel, governor — are the tools of that judgment.",
        checklist: [
          "I propagate trace context across service boundaries",
          "I've defined an SLO and wired an alert that respects it",
          "I've implemented rate limiting or load shedding on a real path",
          "I've run or participated in a blameless postmortem",
        ],
        project: "Add distributed tracing across two services with OpenTelemetry — include the cross-service trace screenshot and an SLO doc.",
        approaches: [
          {
            id: "telemetry", name: "Telemetry & tracing",
            vehicle: "OpenTelemetry-instrumented systems and the collectors themselves — context propagation done for real.",
            crates: ["opentelemetry", "opentelemetry-otlp"],
            keywords: ["telemetry", "observability", "apm"],
          },
          {
            id: "reliability-patterns", name: "Reliability patterns",
            vehicle: "Rate limiters, circuit breakers, and load shedders — the code between you and the retry storm.",
            crates: ["governor", "tower_governor", "backon"],
            keywords: ["rate limiting", "circuit breaker", "resilience", "retries"],
            anyCrate: true,
          },
          {
            id: "orchestration", name: "Kubernetes & operators",
            vehicle: "kube-rs controllers and platform tooling — reconcile loops as production Rust.",
            crates: ["kube", "k8s-openapi"],
            keywords: ["kubernetes", "operator", "controller"],
          },
        ],
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
    capabilities: [
      {
        id: "foundations", name: "no_std Foundations", level: "required", weight: 20,
        outcomes: [
          "build and flash a no_std binary to real hardware",
          "size data structures from a memory budget",
          "debug on-target with defmt/RTT instead of hope",
        ],
        concepts: ["no_std vs std", "panic handlers", "const generics", "memory budgets"],
        why: "Everything on-target starts here: the corpus's firmware shares heapless data structures and defmt logging as its baseline.",
        checklist: [
          "I've built and flashed a no_std binary to real hardware",
          "I use heapless collections and can size them from a memory budget",
          "I've set up defmt/RTT logging and used it to debug on-target",
          "I can explain what disappears without std and how to live without it",
        ],
        project: "Blink an LED the honest way: bare no_std project, linker script understood, defmt logs streaming — write up the toolchain setup.",
        approaches: [
          {
            id: "bare-metal", name: "Bare-metal firmware",
            vehicle: "Real no_std projects — startup code, panic handlers, and memory budgets you can copy.",
            crates: ["heapless", "defmt", "cortex-m-rt"],
            keywords: ["no_std", "bare-metal", "firmware"],
          },
          {
            id: "soc-ecosystems", name: "SoC ecosystems",
            vehicle: "esp32/nRF/STM32/RP2040 projects — pick the chip on your desk and read its community's patterns.",
            crates: ["esp-hal", "embassy-nrf", "embassy-stm32", "rp2040-hal"],
            keywords: ["esp32", "stm32", "nrf52", "rp2040"],
            anyCrate: true,
          },
        ],
      },
      {
        id: "hal", name: "HALs & Peripherals", level: "required", weight: 25,
        outcomes: [
          "drive SPI/I2C/UART peripherals from a datasheet",
          "write interrupt handlers that share state safely",
          "map a register layout to a typed API",
        ],
        concepts: ["GPIO/SPI/I2C/UART", "interrupts", "DMA", "datasheets as source of truth"],
        why: "embedded-hal is the trait layer the whole Rust embedded corpus organizes around — driver work against it is the portfolio unit that counts.",
        checklist: [
          "I've driven SPI/I2C peripherals from Rust against a datasheet",
          "I've written an interrupt handler and shared state with it safely",
          "I've written or ported an embedded-hal driver for a sensor/chip",
          "I can read a register map and map it to a typed API",
        ],
        project: "Write and publish an embedded-hal driver crate for a cheap sensor — with docs, an example, and CI building for a target triple.",
        approaches: [
          {
            id: "hal-impls", name: "HAL implementations",
            vehicle: "The HALs themselves — how register blocks become safe typed APIs, chip by chip.",
            crates: ["embedded-hal", "cortex-m"],
            keywords: ["hal", "peripheral access"],
          },
          {
            id: "drivers", name: "Device drivers",
            vehicle: "Sensor and chip drivers against embedded-hal — the highest-leverage embedded portfolio unit.",
            crates: ["embedded-hal", "embedded-hal-async"],
            keywords: ["sensor", "display driver", "device driver"],
          },
        ],
      },
      {
        id: "async-embedded", name: "Async on Hardware", level: "recommended", weight: 20,
        outcomes: [
          "understand async with zero threads and one core",
          "structure firmware as tasks instead of hand-rolled state machines",
          "serialize structured messages over constrained links",
        ],
        concepts: ["async without an OS", "executors on MCUs", "power & timing", "message serialization"],
        why: "Embassy is the corpus's fastest-growing embedded pattern — async task models replacing hand-rolled state machines on MCUs.",
        checklist: [
          "I've run multiple embassy tasks on a microcontroller",
          "I can explain how async works with zero threads and one core",
          "I've serialized structured messages over UART/radio with postcard",
          "I've measured and reduced power draw or latency in a firmware loop",
        ],
        project: "Build a sensor node on embassy: async sampling task, postcard frames over serial, host-side Rust decoder — one repo, both ends.",
        approaches: [
          {
            id: "embassy", name: "The Embassy ecosystem",
            vehicle: "embassy-based firmware — executors, timers, and drivers in the corpus's fastest-growing embedded pattern.",
            crates: ["embassy-executor", "embassy-time", "embassy-sync"],
            keywords: ["embassy"],
          },
          {
            id: "comms", name: "Radios & wire protocols",
            vehicle: "BLE, LoRa, and serial protocol stacks — constrained-link communication with real framing budgets.",
            crates: ["nrf-softdevice", "trouble-host", "lorawan-device"],
            keywords: ["ble", "bluetooth", "lorawan", "zigbee", "can bus", "postcard"],
          },
        ],
      },
      {
        id: "systems-bridge", name: "Host Tools & The Bridge", level: "recommended", weight: 20,
        outcomes: [
          "own the flash-debug-test loop, not just the firmware",
          "build host-side tools that talk to your hardware",
          "automate hardware tests so they run on every commit",
        ],
        concepts: ["flashing & debugging pipelines", "host-side tooling", "hardware-in-the-loop testing"],
        why: "Embedded teams hire people who improve the loop: the corpus's probe-rs ecosystem shows Rust owning the flash-debug-test pipeline itself.",
        checklist: [
          "I flash and debug through probe-rs (or can set it up from scratch)",
          "I've built a host-side CLI that talks to my firmware",
          "I've automated a hardware test that runs on every commit",
          "I can bisect a firmware bug between host, transport, and target",
        ],
        project: "Build a host CLI for your sensor node: live plotting or logging over serial, a --flash subcommand, and a HIL smoke test in CI.",
        approaches: [
          {
            id: "probe-tooling", name: "Probe & flash tooling",
            vehicle: "The probe-rs ecosystem — debug probes, flashing, and RTT as Rust code you can extend.",
            crates: ["probe-rs"],
            keywords: ["probe", "flashing", "debugger", "jtag", "swd"],
          },
          {
            id: "host-clis", name: "Host-side companions",
            vehicle: "CLIs and daemons that talk serial/USB to hardware — the bridge code every hardware team needs.",
            crates: ["serialport", "nusb", "rusb"],
            keywords: ["uart", "serial port", "serial monitor", "flashing"],
          },
        ],
      },
      {
        id: "rigor", name: "Reliability & Rigor", level: "bonus", weight: 15,
        outcomes: [
          "design firmware that survives watchdogs, brownouts, and bad flash",
          "design a safe OTA/rollback scheme",
          "think in field failure modes, not demo conditions",
        ],
        concepts: ["watchdogs & brownouts", "OTA updates", "safety mindsets", "power analysis"],
        why: "Firmware that ships must survive the field. This leg is thin on crates and heavy on judgment — the corpus's mature firmware shows both.",
        checklist: [
          "My firmware handles watchdog resets and reports why it rebooted",
          "I've designed (or can design) a safe OTA/rollback scheme",
          "I property-test protocol parsing that faces the real world",
          "I think in failure modes: brownout, flash wear, cosmic-ray bitflips",
        ],
        project: "Add a watchdog, a reboot-reason register, and a crash-count report to your node — then document the failure modes you now survive.",
        approaches: [
          {
            id: "field-hardened", name: "Field-hardened firmware",
            vehicle: "Bootloaders, OTA systems, and watchdog-disciplined projects — firmware built for hostile reality.",
            crates: ["embedded-storage", "sequential-storage"],
            keywords: ["bootloader", "ota", "watchdog", "firmware update"],
          },
        ],
      },
    ],
  },
]

// ─── Matching ─────────────────────────────────────────────────────────────────

type RepoCtx = {
  r:        OSSPublicRepo
  deps:     ReadonlySet<string>
  haystack: string   // lowercased name + topics + note, for keyword matching
}

const KW_CACHE = new Map<string, RegExp>()
function kwRegex(kw: string): RegExp {
  let rx = KW_CACHE.get(kw)
  if (!rx) {
    rx = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i")
    KW_CACHE.set(kw, rx)
  }
  return rx
}

/** Evidence that a repo can carry a learner up this approach. Keyword hits
 *  identify repos that ARE the domain (a DNS server, a Raft implementation);
 *  dependency hits identify repos that USE the approach's stack. Either
 *  qualifies — 2 dep hits required when the crate list is long, so serde
 *  alone never makes a repo "about" a leg. */
function approachEvidence(ctx: RepoCtx, a: Approach): { hit: boolean; kwScore: number; depHits: number } {
  let kwScore = 0
  for (const kw of a.keywords) {
    if (kwRegex(kw).test(ctx.r.name)) kwScore += 4
    else if (kwRegex(kw).test(ctx.haystack)) kwScore += 2
  }
  kwScore = Math.min(kwScore, 8)

  let depHits = 0
  for (const c of a.crates) if (ctx.deps.has(c)) depHits++

  const need = a.anyCrate ? 1 : a.crates.length <= 3 ? 1 : 2
  const kwHit = kwScore >= 2
  const depHit = a.crates.length > 0 && depHits >= need
  return { hit: a.kwRequired ? kwHit : kwHit || depHit, kwScore, depHits }
}

function difficultyOf(r: OSSPublicRepo): RepoDifficulty {
  const cargo  = r.enrichment?.cargo
  const locked = cargo?.lockfileCrateCount ?? null
  const stars  = r.stars ?? 0
  if ((locked != null && locked > 700) || stars > 30_000) return "advanced"
  if (stars < 3_000 && cargo?.isWorkspace !== true)       return "approachable"
  return "intermediate"
}

const OVERLAY_DIFFICULTY: Record<string, RepoDifficulty> = {
  beginner: "approachable", intermediate: "intermediate", advanced: "advanced",
}

function contributorFriendly(r: OSSPublicRepo): boolean {
  const stars  = r.stars ?? 0
  const issues = r.openIssuesCount ?? 0
  return r.activityTier === "active" && stars >= 300 && stars <= 15_000 && issues >= 10 && issues <= 300
}

function pushRecency(r: OSSPublicRepo): "week" | "month" | null {
  if (!r.pushedAt) return null
  const age = Date.now() - new Date(r.pushedAt).getTime()
  if (age <= 7  * 24 * 3600 * 1000) return "week"
  if (age <= 30 * 24 * 3600 * 1000) return "month"
  return null
}

function fmtStars(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}k`
  return String(n)
}

// ─── Approach resolution ──────────────────────────────────────────────────────
// Per approach: every qualifying repo is ranked, then up to REPOS_PER_BAND
// are surfaced per difficulty band so alternatives stay comparable. The full
// match count and a corpus deep-link keep the door open — the UI shows a
// sample of vehicles, never "the" list.

const REPOS_PER_BAND = 3

function resolveApproach(
  a: Approach,
  candidates: RepoCtx[],
  ownerIndex: ReturnType<typeof getOwnerCompanyIndex>,
  overlayRepos: Record<string, { featured?: boolean; hidden?: unknown; overrides?: { difficulty?: string; careerPaths?: string[] } }>,
  pathSlug: string,
  liveCounts: Record<string, number>,
  qualified: Set<string>,
  claimed: Set<string>,          // repos already surfaced by an earlier approach of the same capability
  evidence: Set<string>,         // accumulates every matching slug for capability/path counts
): ResolvedApproach {
  type Scored = { ctx: RepoCtx; score: number; kwScore: number; depHits: number; slug: string; overlay?: (typeof overlayRepos)[string] }

  const matches: Scored[] = []
  for (const ctx of candidates) {
    const { hit, kwScore, depHits } = approachEvidence(ctx, a)
    if (!hit) continue
    const slug = `${ctx.r.owner}/${ctx.r.name}`
    const overlay = overlayRepos[slug]
    if (overlay?.hidden) continue   // humans said no - it leaves every route
    evidence.add(slug)

    const org = ctx.r.owner ? ownerIndex.get(ctx.r.owner.toLowerCase()) : undefined
    const pathBoost = overlay?.overrides?.careerPaths?.includes(pathSlug) ? 6 : 0
    const score =
      kwScore * 1.5 +
      Math.min(depHits, 4) +
      Math.log10((ctx.r.stars ?? 0) + 1) +
      (ctx.r.activityTier === "active" ? 2 : 0) +
      (org ? 1 : 0) +
      (overlay?.featured ? 8 : 0) +
      pathBoost
    matches.push({ ctx, score, kwScore, depHits, slug, overlay })
  }

  matches.sort((x, y) => y.score - x.score)

  const bands: Record<RepoDifficulty, AltRepo[]> = { approachable: [], intermediate: [], advanced: [] }
  for (const m of matches) {
    if (claimed.has(m.slug)) continue
    const r = m.ctx.r
    const difficulty =
      OVERLAY_DIFFICULTY[m.overlay?.overrides?.difficulty ?? ""] ?? difficultyOf(r)
    if (bands[difficulty].length >= REPOS_PER_BAND) continue

    const org = r.owner ? ownerIndex.get(r.owner.toLowerCase()) : undefined
    const rec = pushRecency(r)
    const friendly = contributorFriendly(r)
    const signals = [
      `★ ${fmtStars(r.stars ?? 0)}`,
      ...(org ? [`run by ${org.name}`] : []),
      ...(friendly ? [`${r.openIssuesCount ?? 0} open issues · landable`] : []),
      ...(!friendly && rec ? [`pushed this ${rec}`] : []),
      ...(m.overlay?.featured ? ["curator pick"] : []),
    ].slice(0, 3)

    bands[difficulty].push({
      fullName:            m.slug,
      href:                `/oss/${r.owner}/${r.name}`,
      stars:               r.stars ?? 0,
      note:                r.note,
      difficulty,
      signals,
      contributorFriendly: friendly,
      curated:             !!m.overlay?.featured,
    })
    claimed.add(m.slug)
    if (bands.approachable.length + bands.intermediate.length + bands.advanced.length >= REPOS_PER_BAND * 3) break
  }

  const crates: ResolvedCrate[] = a.crates.map(name => ({
    name,
    liveCount: liveCounts[name] ?? 0,
    href:      qualified.has(name) ? `/deps/${name}` : null,
  }))

  const browseHref = a.crates.length > 0
    ? `/oss?${a.crates.slice(0, 3).map(c => `dep=${encodeURIComponent(c)}`).join("&")}`
    : null

  return {
    id: a.id,
    name: a.name,
    vehicle: a.vehicle,
    keywords: a.keywords,
    crates,
    repos: [...bands.approachable, ...bands.intermediate, ...bands.advanced],
    totalMatches: matches.length,
    browseHref,
  }
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
  const overlay    = getCurationOverlay().repos as Record<string, { featured?: boolean; hidden?: unknown; overrides?: { difficulty?: string; careerPaths?: string[] } }>
  const activeJobs = filterActive(JOBS)

  // Vehicles must be studyable: real description, a live owner, not a link
  // list, not dormant, and above the noise floor.
  const candidates: RepoCtx[] = repos
    .filter(r => r.owner && r.note && r.kind !== "reference")
    .filter(r => r.activityTier !== "dormant")
    .filter(r => (r.stars ?? 0) >= 50)
    .map(r => ({
      r,
      deps: new Set(r.dependencies ?? []),
      haystack: `${(r.topics ?? []).join(" ")} ${r.note ?? ""}`.toLowerCase(),
    }))

  _resolved = new Map()

  for (const def of PATH_DEFS) {
    const pathEvidence = new Set<string>()

    const capabilities: ResolvedCapability[] = def.capabilities.map(cap => {
      const capEvidence = new Set<string>()
      const claimed = new Set<string>()
      const approaches = cap.approaches.map(a =>
        resolveApproach(a, candidates, ownerIndex, overlay, def.slug, liveCounts, qualified, claimed, capEvidence),
      )
      for (const slug of capEvidence) pathEvidence.add(slug)
      return { ...cap, approaches, totalEvidence: capEvidence.size }
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
    for (const slug of pathEvidence) {
      const owner = slug.split("/")[0]
      const c = ownerIndex.get(owner.toLowerCase())
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
      capabilities,
      jobs,
      orgs,
      evidenceRepos: pathEvidence.size,
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
    slug:            p.slug,
    title:           p.title,
    shortTitle:      p.shortTitle,
    tagline:         p.tagline,
    evidenceRepos:   p.evidenceRepos,
    openJobs:        p.jobs.length,
    capabilityCount: p.capabilities.length,
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
    areas:      string[]   // matched capability names, aka "good for learning"
  }>
  difficulty:      RepoDifficulty
  contribution:    string | null   // portfolio-impact sentence, when earned
}

export function getRepoCareerRelevance(repo: OSSPublicRepo): RepoCareerRelevance | null {
  const ctx: RepoCtx = {
    r: repo,
    deps: new Set(repo.dependencies ?? []),
    haystack: `${(repo.topics ?? []).join(" ")} ${repo.note ?? ""}`.toLowerCase(),
  }
  if (ctx.deps.size === 0 && (repo.topics ?? []).length === 0) return null

  const paths: RepoCareerRelevance["paths"] = []
  for (const def of PATH_DEFS) {
    // Foundations legs match half the corpus — require something more specific.
    const matched = def.capabilities.filter(cap =>
      cap.id !== "foundations" && cap.approaches.some(a => approachEvidence(ctx, a).hit)
    )
    if (matched.length > 0) {
      paths.push({
        slug:       def.slug,
        shortTitle: def.shortTitle,
        href:       `/paths/${def.slug}`,
        areas:      matched.map(c => c.name),
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
