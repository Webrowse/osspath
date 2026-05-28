/* Reusable structural components — wireframe-fidelity.
   No icon libraries; inline SVG glyphs only where they earn it. */

const { useState, useEffect, useCallback } = React;

/* ---------- Tiny inline glyphs ---------- */
function ArrowUR({ className = "arr" }) {
  return (
    <svg className={className} width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
      <path d="M2.5 7.5L7.5 2.5M7.5 2.5H3.5M7.5 2.5V6.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ArrowR({ className = "" }) {
  return (
    <svg className={className} width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
      <path d="M2 5h6M5.5 2.5L8 5L5.5 7.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function MenuGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M3 6h12M3 12h12" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}
function CloseGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}

/* ---------- Nav ---------- */
function Nav({ onOpenMenu }) {
  const links = [
    { label: "Jobs",       href: "#jobs" },
    { label: "OSS Paths",  href: "#oss" },
    { label: "Grants",     href: "#grants" },
    { label: "Pulse",      href: "#pulse" },
    { label: "Events",     href: "#events" },
  ];
  return (
    <header className="nav">
      <div className="col col--wide nav__inner">
        <a href="#top" className="nav__brand" aria-label="Rust Opportunities — home">
          <span className="nav__mark" />
          <span>rust opportunities</span>
        </a>
        <nav className="nav__links" aria-label="Primary">
          {links.map(l => (
            <a key={l.href} className="nav__link" href={l.href}>{l.label}</a>
          ))}
        </nav>
        <div className="nav__spacer" />
        <a className="nav__workspace" href="#workspace" title="Workspace — saved jobs, notes, deep research">
          <span>Workspace</span>
          <span className="arr"><ArrowR /></span>
        </a>
        <button className="nav__menu-btn" aria-label="Open menu" onClick={onOpenMenu}>
          <MenuGlyph />
        </button>
      </div>
    </header>
  );
}

/* ---------- Mobile drawer ---------- */
function Drawer({ open, onClose }) {
  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose(); }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const links = [
    { label: "Remote Jobs",          href: "#jobs" },
    { label: "OSS Paths",            href: "#oss" },
    { label: "Grants & Bounties",    href: "#grants" },
    { label: "Ecosystem Pulse",      href: "#pulse" },
    { label: "Events & Learning",    href: "#events" },
    { label: "Companies",            href: "#companies" },
  ];

  return (
    <React.Fragment>
      <div className={"drawer-backdrop" + (open ? " open" : "")} onClick={onClose} aria-hidden={!open} />
      <aside className={"drawer" + (open ? " open" : "")} aria-hidden={!open} aria-label="Menu">
        <div className="drawer__head">
          <span className="nav__brand">
            <span className="nav__mark" />
            <span>rust opportunities</span>
          </span>
          <button className="drawer__close" aria-label="Close menu" onClick={onClose}><CloseGlyph /></button>
        </div>
        <nav className="drawer__nav">
          {links.map(l => (
            <a key={l.href} className="drawer__link" href={l.href} onClick={onClose}>{l.label}</a>
          ))}
        </nav>
        <div className="drawer__footer">
          <a className="drawer__workspace" href="#workspace" onClick={onClose}>
            Workspace <ArrowR />
          </a>
        </div>
      </aside>
    </React.Fragment>
  );
}

/* ---------- Hero ---------- */
function Hero() {
  return (
    <section className="hero" id="top">
      <div className="col">
        <div className="hero__eyebrow">
          <span className="dot" />
          <span>Curated — updated weekly</span>
        </div>
        <h1 className="hero__title">
          Curated Rust ecosystem <span className="accent">opportunities.</span>
        </h1>
        <p className="hero__sub">
          Remote jobs, OSS paths, grants, and quiet ecosystem signals — kept short and read by a human first.
        </p>
      </div>
    </section>
  );
}

/* ---------- Section wrapper ---------- */
function Section({ id, num, title, meta, note, children, wide, className = "" }) {
  return (
    <section id={id} className={"section " + className}>
      <div className={"col" + (wide ? " col--wide" : "")}>
        <header className="section__head">
          <div className="section__title-wrap">
            <span className="section__num">{num}</span>
            <h2 className="section__title">{title}</h2>
          </div>
          {meta && <span className="section__meta">{meta}</span>}
        </header>
        {note && <p className="section__note">{note}</p>}
        {children}
      </div>
    </section>
  );
}

/* ---------- Card components ---------- */

function JobRow({ job }) {
  return (
    <article className="job">
      <div className="job__main">
        <div className="job__head">
          <span className="job__role">{job.role}</span>
          <span className="job__company">— {job.company}</span>
        </div>
        <p className="job__note">{job.note}</p>
        <div className="job__tags">
          {job.tags.map(t => (
            <span key={t} className={"tag" + (t.toLowerCase().includes("junior") ? " tag--accent" : "")}>{t}</span>
          ))}
        </div>
      </div>
      <a className="ext-link job__cta" href="#" aria-label={`Open ${job.role} at ${job.company}`}>
        <span>Open</span><ArrowUR />
      </a>
    </article>
  );
}

function Meter({ label, value, valueLabel, accent }) {
  const pct = Math.round(value * 100);
  return (
    <div className="meter">
      <span className="meter__label">{label}</span>
      <span className="meter__bar"><span className={"meter__fill" + (accent ? " meter__fill--accent" : "")} style={{ width: pct + "%" }} /></span>
      <span className="meter__val">{valueLabel}</span>
    </div>
  );
}

function OSSCard({ item }) {
  return (
    <article className="oss">
      <div className="oss__head">
        <span className="oss__name">{item.name}</span>
        <span className="oss__eco">{item.eco}</span>
      </div>
      <p className="oss__note">{item.note}</p>
      <div className="meter-row">
        <Meter label="Maintainers" value={item.friendliness} valueLabel={item.friendlyLabel} />
        <Meter label="Issues"      value={item.issue_q}       valueLabel={item.issueLabel} />
        <Meter label="Beginners"   value={item.beginner}      valueLabel={item.beginnerLabel} accent />
      </div>
      <div className="oss__foot">
        <span className="tag tag--soft">contribute</span>
        <a className="ext-link" href="#"><span>Open repo</span><ArrowUR /></a>
      </div>
    </article>
  );
}

function GrantTile({ g }) {
  return (
    <a className="grant" href="#">
      <span className="grant__kind">{g.kind}</span>
      <h3 className="grant__name">{g.name}</h3>
      <p className="grant__sub">{g.sub}</p>
      <div className="grant__foot">
        <span>{g.meta}</span>
        <ArrowUR />
      </div>
    </a>
  );
}

function PulseRow({ p }) {
  return (
    <a className="pulse__row" href="#">
      <span className="pulse__kind">{p.kind}</span>
      <span className="pulse__title">
        <b>{p.title}</b>
        <span className="pulse__sub">{p.sub}</span>
      </span>
      <span className="pulse__arrow">↗</span>
    </a>
  );
}

function EventCard({ e }) {
  return (
    <article className="event">
      <div className="event__date">
        <span className="d">{e.day}</span>
        <span className="m">{e.month}</span>
      </div>
      <div className="event__main">
        <h3 className="event__title">{e.title}</h3>
        <span className="event__meta">{e.meta}</span>
      </div>
      <a className="ext-link" href="#"><span>Join</span><ArrowUR /></a>
    </article>
  );
}

function CompanyTile({ c }) {
  return (
    <a className="company" href="#" aria-label={c.name}>
      <span className="company__name">{c.name}</span>
      <span className="company__sector">{c.sector}</span>
      <span className="company__hint">Explore →</span>
    </a>
  );
}

/* ---------- Footer ---------- */
function Footer() {
  return (
    <footer className="footer" id="workspace">
      <div className="col col--wide">
        <div className="footer__row">
          <div>
            <div className="footer__brand">rust opportunities</div>
            <div className="footer__meta">Curated weekly. Quiet by design.</div>
          </div>
          <div>
            <a className="footer__workspace" href="#">
              Open workspace <ArrowR />
            </a>
            <div className="footer__meta" style={{marginTop: 6}}>
              saved jobs · notes · tracking · deep research
            </div>
          </div>
        </div>
        <div className="footer__links">
          <a href="#">About</a>
          <a href="#">Submit a link</a>
          <a href="#">RSS</a>
          <a href="#">Contact</a>
        </div>
      </div>
    </footer>
  );
}

/* ---------- Export to global ---------- */
Object.assign(window, {
  Nav, Drawer, Hero, Section, Footer,
  JobRow, OSSCard, GrantTile, PulseRow, EventCard, CompanyTile,
  ArrowR, ArrowUR,
});
