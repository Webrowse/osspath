function App() {
  const { useState } = React;
  const [menu, setMenu] = useState(false);
  const d = window.__data;

  return (
    <div className="page">
      <Nav onOpenMenu={() => setMenu(true)} />
      <Drawer open={menu} onClose={() => setMenu(false)} />

      <main>
        <Hero />

        <Section
          id="jobs"
          num="01"
          title="Remote Rust Jobs"
          meta={`${d.jobs.length} open · this week`}
          note="Rust-explicit roles only. Read once, then linked out. Quality over volume."
        >
          <div className="jobs">
            {d.jobs.map((j, i) => <JobRow key={i} job={j} />)}
          </div>
        </Section>

        <Section
          id="oss"
          num="02"
          title="OSS Paths"
          meta="approachable repositories"
          note="Realistic places to make a first or fifth contribution. Maintainer responsiveness, issue quality, and a short human note on each."
        >
          <div className="oss-grid">
            {d.oss.map((o, i) => <OSSCard key={i} item={o} />)}
          </div>
        </Section>

        <Section
          id="grants"
          num="03"
          title="Grants & Bounties"
          meta={`${d.grants.length} listed`}
          note="Grants, hackathons, sponsorships and small bounties. Light list; click out for terms."
        >
          <div className="grants">
            {d.grants.map((g, i) => <GrantTile key={i} g={g} />)}
          </div>
        </Section>

        <Section
          id="pulse"
          num="04"
          title="Ecosystem Pulse"
          meta="important internet places"
          note="Forums, newsletters, working-group notes, and threads worth lurking in."
        >
          <div className="pulse">
            {d.pulse.map((p, i) => <PulseRow key={i} p={p} />)}
          </div>
        </Section>

        <Section
          id="events"
          num="05"
          title="Events & Learning"
          meta="free · time-bound"
          note="Workshops, meetups, office hours. Temporary opportunities, not roadmap content."
        >
          <div className="events">
            {d.events.map((e, i) => <EventCard key={i} e={e} />)}
          </div>
        </Section>

        <Section
          id="companies"
          num="06"
          title="Companies Using Rust"
          meta="exploratory"
          note="Not all companies listed here are hiring. Useful for orientation — who builds what."
          wide
          className="section--companies section--quiet"
        >
          <div className="companies">
            {d.companies.map((c, i) => <CompanyTile key={i} c={c} />)}
          </div>
        </Section>
      </main>

      <Footer />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
