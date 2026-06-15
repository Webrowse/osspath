export type CrateDescription = {
  tagline: string
  summary: string
  usage: string
}

export const CRATE_DESCRIPTIONS: Record<string, CrateDescription> = {
  serde: {
    tagline: "Framework for serializing and deserializing Rust data structures.",
    summary: "Serde provides a generic serialization framework through Serialize and Deserialize traits and a derive macro. Any data structure annotated with #[derive(Serialize, Deserialize)] can be converted to and from any supported format — JSON, TOML, YAML, MessagePack, bincode, and more — without writing format-specific code.",
    usage: "Used in virtually every Rust project that touches data interchange: HTTP APIs, configuration files, database records, CLI tools, and network protocols. Format-specific crates like serde_json and toml build on serde's data model, making it the single serialization layer across the entire ecosystem.",
  },

  serde_json: {
    tagline: "JSON serialization and deserialization for Rust, built on serde.",
    summary: "serde_json provides JSON support for the serde ecosystem. It serializes any serde-compatible Rust type to a JSON string and deserializes JSON back to a typed struct. A dynamic Value type handles JSON when the schema is unknown at compile time.",
    usage: "The default choice for JSON in Rust — HTTP request and response bodies, config files, API clients, REST and GraphQL backends, and any code that needs to read or produce JSON.",
  },

  clap: {
    tagline: "Command-line argument parser for Rust applications.",
    summary: "clap is the standard argument parser for Rust CLI tools. It is usable via a builder API or with derive macros on a struct, where fields and attributes declare flags, options, and subcommands. Help text, input validation, and shell completion are generated automatically.",
    usage: "Used by nearly every Rust command-line tool. The derive API turns a typed Rust struct into a complete CLI interface — argument parsing, validation, and help text without boilerplate.",
  },

  tokio: {
    tagline: "Asynchronous runtime for Rust — I/O, timers, and tasks.",
    summary: "Tokio is the dominant async runtime for Rust. It provides an event loop, async I/O for TCP/UDP/files, timers, channels, and a task scheduler. Most async Rust code targets Tokio and uses its types for networking, concurrency, and time.",
    usage: "The de-facto choice for async Rust — web servers, network clients, database drivers, gRPC services, and any application that handles concurrent I/O. Most async-capable libraries in the ecosystem assume a Tokio runtime.",
  },

  thiserror: {
    tagline: "Derive macros for ergonomic custom error types.",
    summary: "thiserror provides a #[derive(Error)] macro that generates std::error::Error implementations for custom error types. Enum variants take #[error(\"...\")] display strings with field interpolation and #[from] attributes for automatic From conversions.",
    usage: "The standard way to define error types in library crates. Typically paired with anyhow: thiserror for typed library-level errors that callers can match on, anyhow for application-level error propagation where the type does not matter.",
  },

  anyhow: {
    tagline: "Flexible error handling and propagation for Rust applications.",
    summary: "anyhow provides a single anyhow::Error type that wraps any error value. Errors gain context with .context(\"...\") and propagate across heterogeneous error types via the ? operator without needing explicit From conversions.",
    usage: "Standard in Rust application code rather than libraries. When callers do not need to inspect the error type — scripts, binaries, tools — anyhow eliminates error-handling boilerplate without sacrificing meaningful messages.",
  },

  tempfile: {
    tagline: "Temporary file and directory creation for tests and tools.",
    summary: "tempfile creates temporary files and directories that are automatically deleted when they go out of scope. It provides unnamed file descriptors, named temporary files with accessible paths, and temporary directories — all with RAII cleanup.",
    usage: "Ubiquitous in test suites. Any test that writes to disk uses tempfile to avoid filesystem pollution and to ensure cleanup on test exit, even on panics or early returns.",
  },

  rand: {
    tagline: "Random number generation for Rust.",
    summary: "rand provides a suite of random number generators, probability distributions, and sampling utilities. It includes cryptographically-appropriate sources via rand_core and fast non-cryptographic generators. Common usage: thread_rng().gen(), random(), and distributions like Uniform and Normal.",
    usage: "Used wherever randomness is needed: simulations, games, testing, shuffling, sampling, UUID generation, and seeding cryptographic material. rand_core defines the RNG trait interface that the broader ecosystem builds on.",
  },

  chrono: {
    tagline: "Date and time library for Rust.",
    summary: "chrono provides date, time, timezone-aware datetime types, duration arithmetic, and parsing and formatting. Core types include NaiveDate and NaiveDateTime for calendar arithmetic without timezone, and DateTime<Tz> for timezone-aware values. Timezone support is extended by the chrono-tz companion crate.",
    usage: "The standard date and time library in Rust. Used for timestamp handling in databases, APIs, log parsing, scheduling, file metadata, and any code that works with human calendar time.",
  },

  regex: {
    tagline: "Regular expressions for Rust — fast, safe, linear-time matching.",
    summary: "regex is the standard regular expression engine for Rust. It guarantees linear-time matching with no backtracking by using finite automata, making it safe against ReDoS attacks on untrusted input. The API supports search, capture groups, replace, and splitting.",
    usage: "Used for text parsing, log analysis, data extraction, input validation, and pattern matching. The linear-time guarantee makes it appropriate for server-side code where input comes from untrusted sources.",
  },

  tracing: {
    tagline: "Structured, contextual, async-aware logging and diagnostics.",
    summary: "tracing provides a framework for instrumenting Rust programs with structured events and spans. Unlike the log crate, tracing events carry typed key-value fields and can be grouped into spans representing units of work, enabling log correlation, distributed tracing, and context propagation across async tasks.",
    usage: "The modern standard for observability in Rust services. Subscribers forward events to stdout, structured JSON logs, OpenTelemetry, Jaeger, and other backends. Used in web servers, gRPC services, and any production code that needs structured logging or tracing.",
  },

  futures: {
    tagline: "Core async primitives and combinators for Rust.",
    summary: "The futures crate provides foundational async building blocks: Stream, Sink, AsyncRead, and AsyncWrite traits, and combinators via FutureExt and StreamExt. It also includes in-process channels, locks, and executor utilities used by runtime-agnostic library code.",
    usage: "The foundational async abstraction layer in Rust. Libraries implement against futures' traits to remain runtime-agnostic. Tokio, async-std, and other runtimes interoperate through these common types.",
  },

  "tracing-subscriber": {
    tagline: "Composable subscribers for the tracing instrumentation framework.",
    summary: "tracing-subscriber provides pre-built implementations for consuming tracing events: a formatting layer for human-readable or JSON output, filter layers controlled via RUST_LOG, and a Registry for composing multiple layers into a single subscriber.",
    usage: "The standard companion to the tracing crate. Used at application startup to configure how tracing events are formatted, filtered, and exported. Most Rust services call tracing_subscriber::init() once in main() and rely on it for all log output.",
  },

  log: {
    tagline: "Lightweight logging facade for Rust — the log! macros.",
    summary: "log is the historic standard logging interface in Rust. It defines the info!, warn!, error!, debug!, and trace! macros and a Log trait for implementors. Actual output is handled by a backend crate — env_logger, tracing-log, or simplelog — initialized once at startup.",
    usage: "Widely used in libraries that need to emit diagnostics without depending on a specific logging implementation. Application code picks the backend; library code uses the log macros and lets the application route output as needed.",
  },

  reqwest: {
    tagline: "Ergonomic HTTP client for Rust, built on hyper and tokio.",
    summary: "reqwest is the standard HTTP client for Rust. It provides a high-level async API for HTTP and HTTPS requests, with support for JSON request and response bodies via serde, multipart forms, streaming bodies, cookies, redirects, and connection pooling. A blocking API is also available.",
    usage: "The default choice for making HTTP requests in Rust — REST API clients, webhooks, web scrapers, download utilities, health checks, and any code that needs to talk HTTP to an external service.",
  },

  toml: {
    tagline: "TOML serialization and deserialization via serde.",
    summary: "The toml crate parses TOML (Tom's Obvious Minimal Language) configuration files and serializes Rust values back to TOML text. It integrates with serde so any #[derive(Deserialize)] struct can be populated directly from a TOML string.",
    usage: "Used for configuration file parsing throughout the Rust ecosystem — Cargo.toml itself is TOML, and tools, services, and CLI applications commonly adopt TOML for human-editable configuration.",
  },

  base64: {
    tagline: "Base64 encoding and decoding for Rust.",
    summary: "base64 provides standard and URL-safe base64 encoding and decoding with configurable padding. It supports the standard RFC 4648 alphabet, the URL-safe alphabet, and padding or no-padding variants via named engine types.",
    usage: "Encoding binary data for text protocols — HTTP Authorization headers, data URIs, email attachments, JWT tokens, and any API that transmits binary payloads as ASCII text.",
  },

  uuid: {
    tagline: "UUID generation and parsing for Rust.",
    summary: "The uuid crate generates and parses Universally Unique Identifiers in v1, v3, v4, v5, v7, and v8 variants. It integrates with serde for JSON serialization and supports formatting as hyphenated, simple, URN, or braced strings.",
    usage: "Used in databases, APIs, and distributed systems where unique identifiers are required — primary keys, request IDs, session tokens, and resource identifiers.",
  },

  sha2: {
    tagline: "SHA-2 cryptographic hash functions — SHA-256, SHA-384, SHA-512.",
    summary: "sha2 implements the SHA-2 family of hash functions following the RustCrypto Digest trait interface, making it composable with other cryptographic primitives. SHA-224, SHA-256, SHA-384, and SHA-512 are all provided.",
    usage: "Used for content hashing, integrity verification, digital signatures, and certificate fingerprinting. SHA-256 is the most common choice for checksum and integrity use cases in production Rust code.",
  },

  criterion: {
    tagline: "Statistics-driven microbenchmarking framework for Rust.",
    summary: "criterion runs benchmarks multiple times with statistical analysis, computing mean and standard deviation, detecting performance regressions across runs, and generating HTML reports. It integrates with cargo bench and supports async benchmarks via tokio.",
    usage: "The standard benchmarking tool in Rust. Used in performance-sensitive libraries and applications to measure and track hot code paths — serialization, parsing, data structures, and algorithm implementations.",
  },

  url: {
    tagline: "URL parsing and manipulation for Rust, following the WHATWG URL standard.",
    summary: "The url crate implements the WHATWG URL Standard for parsing, constructing, and manipulating URLs. It handles scheme, authority, path, query, and fragment, with methods for relative URL resolution, query parameter manipulation, and origin comparison.",
    usage: "Used in HTTP clients, web frameworks, link extractors, and any code that handles URLs from external sources. reqwest and other HTTP libraries use url internally for request construction.",
  },

  libc: {
    tagline: "Raw FFI bindings to C standard library functions and types.",
    summary: "libc provides raw bindings to the C standard library and POSIX APIs for all supported Rust targets — Linux, macOS, Windows, FreeBSD, and others. It defines the C numeric types (c_int, size_t, off_t) and function signatures needed to call system-level APIs from Rust.",
    usage: "Foundation for any crate that wraps system calls or C libraries. Higher-level crates like nix build on libc to provide safe Rust interfaces to POSIX. Also used directly in unsafe code that requires system-level control.",
  },

  bytes: {
    tagline: "Zero-copy byte buffer manipulation for network programming.",
    summary: "bytes provides Bytes and BytesMut — reference-counted byte buffer types that support zero-copy slicing and cheap cloning. Bytes implements shared ownership over a contiguous memory region, so multiple consumers hold views into the same buffer without copying.",
    usage: "Core to the Tokio networking stack. hyper, tonic, axum, and all network protocol implementations use bytes as the buffer type. Used wherever high-throughput byte manipulation is needed without repeated allocation.",
  },

  "async-trait": {
    tagline: "Async functions in Rust traits via a proc-macro.",
    summary: "async-trait provides a #[async_trait] attribute macro that enables async fn in trait definitions. Before native async-in-traits were stabilized in Rust 1.75, this was the only way to define async methods in traits, using Box<dyn Future> internally.",
    usage: "Historically ubiquitous in async Rust codebases for defining async interfaces. Still widely used in codebases that need object-safe async dispatch or that target Rust editions before async trait stabilization.",
  },

  syn: {
    tagline: "Parser for Rust syntax — the foundation of proc-macro crates.",
    summary: "syn parses Rust source code from a proc_macro::TokenStream into a typed abstract syntax tree. It represents every Rust syntactic construct — structs, enums, expressions, types, attributes — and is the foundation for all custom derive and attribute macros.",
    usage: "Not a direct application dependency. syn is used to build proc-macro crates like serde_derive, thiserror, and clap's derive support. Its high repo count reflects how many crates ship their own proc-macros.",
  },

  quote: {
    tagline: "Quasi-quoting for generating Rust code inside proc-macros.",
    summary: "quote provides the quote! macro for constructing TokenStream values from Rust syntax templates with variable interpolation. It is the standard way to emit generated Rust code inside a procedural macro — the output counterpart to syn's parsing.",
    usage: "Used alongside syn in every proc-macro crate. Rarely a direct application dependency — its repo count reflects the prevalence of crates that ship custom derive macros.",
  },

  itertools: {
    tagline: "Extra iterator adaptors, methods, and free functions for Rust.",
    summary: "itertools extends Rust's standard Iterator with additional combinators: chunked, windowed, sorted, grouped, zipped, product, permutations, combinations, deduplication, and more. All methods are zero-cost lazy adaptors following the same pattern as std::iter.",
    usage: "Used when the standard Iterator trait lacks a needed combinator. Common in data processing, graph algorithms, combinatorics, and functional-style Rust code that chains complex iterator pipelines.",
  },

  "proc-macro2": {
    tagline: "Stable TokenStream for use outside proc-macro context.",
    summary: "proc-macro2 provides a usable-outside-proc-macros version of Rust's proc_macro::TokenStream. It allows proc-macro helper libraries like syn and quote to be compiled, tested, and used in regular code rather than only inside procedural macros.",
    usage: "An implementation detail of the syn/quote proc-macro ecosystem. Application code rarely depends on it directly — its high repo count comes from crates that ship proc-macros.",
  },

  hex: {
    tagline: "Hexadecimal encoding and decoding for Rust byte slices.",
    summary: "hex provides functions to encode byte slices to hexadecimal strings and decode hex strings back to bytes. Encoding is allocation-free for fixed-size outputs; decoding validates input and returns descriptive errors on invalid characters.",
    usage: "Used in cryptographic, hashing, and network code where binary data must be represented as printable text — hash digests, public keys, packet dumps, certificate fingerprints, and debug output.",
  },

  "tokio-util": {
    tagline: "Utilities and adaptors extending the tokio async runtime.",
    summary: "tokio-util extends tokio with the Codec trait and Framed type for length-prefixed and line-delimited network protocols, stream utilities, task management primitives, and compatibility adaptors between tokio I/O and futures I/O traits.",
    usage: "Used when building custom network protocols on top of tokio — implementing message framing, line-based protocols, or any codec that splits a raw byte stream into discrete application-level messages.",
  },

  "futures-util": {
    tagline: "Stream and Future combinators from the futures ecosystem.",
    summary: "futures-util provides StreamExt, FutureExt, and associated combinators — map, filter, chain, merge, buffered, and more. It is a lighter-weight subset of the futures crate, giving libraries access to async utilities without pulling in the full futures dependency.",
    usage: "Used in async code that manipulates streams and futures — especially in libraries that want a smaller transitive dependency footprint than the full futures crate while still offering combinator-style async APIs.",
  },

  once_cell: {
    tagline: "Single-assignment cells for lazy and global initialization in Rust.",
    summary: "once_cell provides OnceCell and Lazy types for values initialized exactly once. Lazy<T> initializes on first access; OnceCell<T> allows explicit one-time setting. The standard library adopted these patterns as std::sync::OnceLock and std::sync::LazyLock in Rust 1.70.",
    usage: "Used to initialize global state lazily without static mut or mutex overhead — connection pools, compiled regex, configuration, and any singleton that is expensive to construct but must be shared across threads.",
  },

  env_logger: {
    tagline: "Logger backend for the log crate, configured via RUST_LOG.",
    summary: "env_logger is the simplest logging backend for the log facade. It reads RUST_LOG to configure per-module log levels, then writes formatted output to stderr. Initialization is a single env_logger::init() call at program startup.",
    usage: "The default logger in Rust CLI tools and test suites. Zero configuration in code, runtime-controllable with RUST_LOG=debug or RUST_LOG=myapp=trace, and requiring no setup beyond one line in main().",
  },

  flate2: {
    tagline: "Gzip, zlib, and deflate compression for Rust.",
    summary: "flate2 provides streaming compression and decompression for gzip, zlib, and deflate formats. It wraps a compression backend (miniz_oxide by default, or system zlib) behind a consistent Read/Write streaming API with configurable compression levels.",
    usage: "Used for compressing HTTP responses, reading .gz archives, handling compressed config files, and any code that must read or write deflate-family compressed data.",
  },

  rayon: {
    tagline: "Data parallelism for Rust — parallel iterators over thread pools.",
    summary: "rayon provides parallel iterators that distribute work across a work-stealing thread pool. Any sequential iterator chain can be parallelized by replacing .iter() with .par_iter(). Thread management, load balancing, and synchronization are automatic.",
    usage: "Used in CPU-bound code that processes large collections — image processing, data analysis, search indexing, build systems, and numerical computing. par_iter() is the one-line path from sequential to parallel processing in Rust.",
  },

  dirs: {
    tagline: "Cross-platform standard directory paths — home, config, cache, data.",
    summary: "dirs provides platform-appropriate paths for user home, configuration, cache, data, and temp directories. It follows XDG Base Directory conventions on Linux, AppData on Windows, and Library conventions on macOS.",
    usage: "Used in CLI tools and desktop applications to locate config files, caches, and user data correctly on every platform without hardcoding paths like ~/.config or %APPDATA%.",
  },

  axum: {
    tagline: "Ergonomic web framework for Rust, built on tokio and hyper.",
    summary: "axum uses extractors — types implementing FromRequest — to declare what each handler needs from an HTTP request: JSON body, path parameters, headers, or auth tokens. Routing uses method-specific helpers and supports nested routers and tower middleware layers.",
    usage: "One of the leading web framework choices for Rust services. Used for REST APIs, HTTP backends, and microservices. Tightly integrated with the tokio/tower/hyper stack, making it the natural choice when already using that ecosystem.",
  },

  indexmap: {
    tagline: "Hash map that preserves insertion order.",
    summary: "IndexMap is a hash table that preserves the order entries were inserted, while offering O(1) average lookup, insertion, and removal. It supports indexed access by position and bidirectional iteration in insertion order.",
    usage: "Used when a map needs deterministic iteration order — JSON serialization where key order should be preserved, configuration parsing, and any case where the order entries were added carries meaning.",
  },

  parking_lot: {
    tagline: "Fast mutex and synchronization primitives for Rust.",
    summary: "parking_lot provides Mutex, RwLock, Condvar, and Once implementations that outperform std::sync equivalents under most workloads. They use a compact 1-byte Mutex state and a custom thread-parking mechanism that avoids kernel transitions on uncontended paths.",
    usage: "Used in performance-sensitive code with frequent locking — servers, databases, caches, and runtime internals. The parking_lot::Mutex is a near drop-in replacement for std::sync::Mutex with better throughput under contention.",
  },

  http: {
    tagline: "Shared HTTP types — Request, Response, Method, StatusCode, HeaderMap.",
    summary: "http provides the canonical Rust vocabulary types for HTTP: Request, Response, Method, StatusCode, HeaderMap, Uri, and Version. It is a pure vocabulary crate — no I/O, no networking — used by hyper, axum, reqwest, and tower-http to pass HTTP values between libraries without type mismatches.",
    usage: "Rarely used directly in application code. It is the shared foundation that lets HTTP middleware and libraries from different crates exchange Request and Response values with a common type system.",
  },

  walkdir: {
    tagline: "Recursive directory traversal for Rust.",
    summary: "walkdir provides a simple, efficient iterator that recursively descends into directories. It handles symbolic links, depth limits, and error reporting per-entry without failing the entire traversal on a single inaccessible path.",
    usage: "Used in CLI tools, build systems, indexers, and any code that must walk a directory tree — finding files by extension, generating manifests, measuring disk usage, or processing entire directory structures.",
  },

  strum: {
    tagline: "Derive macros for enums — iteration, display, and string conversion.",
    summary: "strum provides derive macros that add practical functionality to Rust enums: EnumIter to iterate all variants, Display for string formatting, EnumString to parse from strings, and AsRefStr for string views. strum_macros is the companion proc-macro crate.",
    usage: "Used when enum variants need to be converted to and from strings, iterated, or counted — CLI subcommands, configuration keys, state machines, and any enum that requires programmatic traversal.",
  },

  lazy_static: {
    tagline: "Macro for declaring lazily-initialized static variables in Rust.",
    summary: "lazy_static! declares static variables initialized on first access rather than at program start. Under the hood it uses a Once primitive. It has been superseded by once_cell::sync::Lazy and the standard library's std::sync::LazyLock, but remains widely used in existing code.",
    usage: "Used for global singletons — compiled regex, connection pools, configuration — that need to be initialized once and safely shared across threads. New code prefers once_cell or std::LazyLock, but lazy_static remains common in existing Rust projects.",
  },

  "tokio-stream": {
    tagline: "Stream utilities and adaptors for the tokio async runtime.",
    summary: "tokio-stream provides Stream combinators, adaptors from tokio channels and intervals to streams, and wrappers that bridge tokio's async primitives with the futures Stream trait.",
    usage: "Used when consuming tokio channels, timers, or other async producers as streams — database cursors, event pipelines, and server-sent event implementations that need stream-based processing.",
  },

  tower: {
    tagline: "Modular and composable network service middleware for Rust.",
    summary: "tower defines the Service trait — a single async fn(Request) -> Response — and provides middleware that wraps services: rate limiting, timeouts, retries, load balancing, and buffering. It is the middleware abstraction layer used by axum, tonic, and hyper.",
    usage: "The backbone of the Rust HTTP and gRPC middleware ecosystem. Application developers use it indirectly through axum and tonic. Library authors implement Service to write reusable middleware that works across any tower-compatible framework.",
  },

  rustls: {
    tagline: "Modern TLS implementation in pure Rust — no C code.",
    summary: "rustls is a TLS 1.2 and 1.3 implementation written entirely in Rust. It handles certificate verification, mutual authentication, and session resumption. It integrates with tokio via tokio-rustls and replaces OpenSSL-based TLS in the Rust ecosystem.",
    usage: "Used in security-conscious applications and where OpenSSL is undesirable — embedded systems, WebAssembly targets, and production services that require memory-safe TLS without C library dependencies or OpenSSL version management.",
  },

  serde_yaml: {
    tagline: "YAML serialization and deserialization for Rust via serde.",
    summary: "serde_yaml provides YAML support for the serde ecosystem. Any serde-compatible type can be serialized to YAML or deserialized from YAML text. It handles multi-document YAML, anchors, aliases, and the full YAML 1.2 specification.",
    usage: "Used in configuration-heavy tools and Kubernetes-adjacent code where YAML is the standard format — Helm charts, CI/CD pipeline definitions, Ansible-adjacent tooling, and developer tools that read YAML input.",
  },

  "tower-http": {
    tagline: "HTTP-specific tower middleware — tracing, compression, CORS, static files.",
    summary: "tower-http provides ready-to-use HTTP middleware for tower and axum services: request tracing via the tracing crate, response compression with gzip and brotli, CORS headers, static file serving, body size limits, timeout enforcement, and sensitive header redaction.",
    usage: "The standard middleware library for axum web applications. Used in virtually every production axum service to add request logging, response compression, CORS, and auth middleware without writing them from scratch.",
  },

  semver: {
    tagline: "Semantic versioning — parsing, comparison, and constraint matching.",
    summary: "semver parses and compares version strings following the Semantic Versioning 2.0.0 specification. It supports version comparison, sorting, and range constraints (^1.0, >=2.0 <3.0) as used in Cargo.toml dependency specifications.",
    usage: "Used in build tools, package managers, update checkers, and any code that compares or resolves software versions. Cargo itself uses this crate for dependency resolution and version constraint evaluation.",
  },

  bitflags: {
    tagline: "Macro for generating type-safe bitfield flag types.",
    summary: "bitflags! generates a newtype over an integer representing a set of named bit flags. The generated type implements bitwise operations (|, &, ^, !), Display, Debug, and iteration over the currently set flags.",
    usage: "Used in system programming, graphics, OS wrappers, and protocol implementations that use bit fields — file permissions, event masks, capability flags, window style bits, and protocol option fields.",
  },
}
