/* Placeholder content. Invented names only — no real companies, jobs, or grants. */

const data = {
  jobs: [
    {
      role: "Systems Engineer — Storage",
      company: "Crate Labs",
      tags: ["Remote", "EU / Americas"],
      note: "Small team building a content-addressed storage layer in Rust. Mid-to-senior.",
    },
    {
      role: "Embedded Engineer",
      company: "Ferrite Systems",
      tags: ["Remote", "Junior-friendly"],
      note: "no_std work on industrial sensors. Will pair with you for the first month.",
    },
    {
      role: "Compiler / Tooling Intern",
      company: "Quiet Mesh Foundation",
      tags: ["Remote", "Internship", "Junior-friendly"],
      note: "Three-month engagement on a static analysis pass. Stipend listed.",
    },
    {
      role: "Backend Engineer — Networking",
      company: "Embers IO",
      tags: ["Remote", "EU"],
      note: "Async Rust on a privacy-respecting routing layer. Production codebase, small team.",
    },
    {
      role: "Developer Advocate",
      company: "Plinth Studio",
      tags: ["Remote", "Writing-heavy"],
      note: "Half engineer, half writer. Maintains an opinionated docs site.",
    },
  ],

  oss: [
    {
      name: "calmgraph",
      eco: "Tooling · CLI",
      friendliness: 0.85,
      issue_q: 0.7,
      beginner: 0.8,
      friendlyLabel: "Responsive maintainers",
      issueLabel: "Well-scoped issues",
      beginnerLabel: "Friendly for first PRs",
      note: "Maintainer tags ‘mentored’ on small issues and writes a short context note on each.",
    },
    {
      name: "ember-fs",
      eco: "Embedded · no_std",
      friendliness: 0.65,
      issue_q: 0.6,
      beginner: 0.55,
      friendlyLabel: "Steady, async-reply",
      issueLabel: "Some labelling",
      beginnerLabel: "Some entry points",
      note: "Async maintainer responses. Two recent ‘good first issue’ threads got merged within a week.",
    },
    {
      name: "rqq-utils",
      eco: "Networking · libs",
      friendliness: 0.75,
      issue_q: 0.8,
      beginner: 0.45,
      friendlyLabel: "Active reviewer",
      issueLabel: "Thoughtfully labelled",
      beginnerLabel: "Intermediate territory",
      note: "Most issues need understanding of the protocol first. Good once you’re past the README.",
    },
    {
      name: "loom-paint",
      eco: "Graphics · 2D",
      friendliness: 0.9,
      issue_q: 0.65,
      beginner: 0.85,
      friendlyLabel: "Very welcoming",
      issueLabel: "Mixed quality",
      beginnerLabel: "Great for first PRs",
      note: "Maintainer hosts a monthly contributor call. Will pair-program on first PRs.",
    },
  ],

  grants: [
    { kind: "Grant", name: "Small Ecosystem Grant — Spring", sub: "Up to a moderate stipend for solo maintainers and small teams.", meta: "Rolling" },
    { kind: "Bounty", name: "Performance bounty — parser", sub: "Improve a parser implementation against a benchmark suite.", meta: "Open" },
    { kind: "Hackathon", name: "Quiet Mesh Hack Weekend", sub: "Async, two-week build window. Networking and tooling tracks.", meta: "Closes soon" },
    { kind: "Sponsorship", name: "Independent maintainer fund", sub: "Monthly sponsorship for sustained contributions to small libraries.", meta: "Open" },
    { kind: "Bounty", name: "Docs bounty — async runtime guide", sub: "Long-form explainer wanted. Editor will pair on revisions.", meta: "Open" },
    { kind: "Grant", name: "Research grant — type systems", sub: "Six-month engagement for academic or independent researchers.", meta: "Apply by Q3" },
  ],

  pulse: [
    {
      kind: "Newsletter",
      title: "This Week in (a quieter) Rust",
      sub: "A weekly digest. Short, opinionated, occasional silence.",
    },
    {
      kind: "Forum",
      title: "users.rust-lang — Help & Learn",
      sub: "Long-running help forum. Slow, thoughtful answers.",
    },
    {
      kind: "Discussion",
      title: "RFC: small-string optimisation revisited",
      sub: "Active thread on the internals forum. Worth lurking.",
    },
    {
      kind: "Update",
      title: "Async working group — quarterly notes",
      sub: "Plain text. Low-noise. Read it whole.",
    },
    {
      kind: "Community",
      title: "Embedded WG matrix room",
      sub: "Friendly. Beginners actively welcomed.",
    },
    {
      kind: "Newsletter",
      title: "Compile Times — research roundup",
      sub: "Monthly. Papers, talks, internal notes.",
    },
  ],

  events: [
    { day: "14", month: "Jun", title: "Async runtimes — open workshop", meta: "Remote · Free · 90 min" },
    { day: "22", month: "Jun", title: "Embedded Rust meetup — show & tell", meta: "Remote · Free · 60 min" },
    { day: "03", month: "Jul", title: "Pair-programming hour: first OSS PR", meta: "Remote · Free · Limited seats" },
    { day: "11", month: "Jul", title: "Compiler internals reading group", meta: "Recurring · Free" },
    { day: "—",  month: "Jul", title: "Office hours: ecosystem maintainers", meta: "Drop-in · Friday afternoons" },
  ],

  companies: [
    { name: "Crate Labs",        sector: "Storage" },
    { name: "Ferrite Systems",   sector: "Embedded" },
    { name: "Embers IO",         sector: "Networking" },
    { name: "Plinth Studio",     sector: "Tooling" },
    { name: "Quiet Mesh",        sector: "Infra" },
    { name: "Loom Paint",        sector: "Graphics" },
    { name: "Northvane",         sector: "Databases" },
    { name: "Slate & Steel",     sector: "Robotics" },
    { name: "Coastline Audio",   sector: "Audio / DSP" },
    { name: "Faintline Labs",    sector: "Security" },
    { name: "Hilltop Compute",   sector: "Cloud" },
    { name: "Wisp Energy",       sector: "Energy / IoT" },
  ],
};

window.__data = data;
