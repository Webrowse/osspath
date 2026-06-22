// ====== Landing Page ======
const { useState: useState_L, useEffect: useEffect_L, useRef: useRef_L } = React;

// ====== Product Nav ======
const NAV_ITEMS = [
  { id: "companies", label: "Companies" },
  { id: "workflow",  label: "Workflow" },
  { id: "demo",      label: "Demo", action: true, icon: "play" },
  { id: "changelog", label: "Changelog", badge: true }
];

function ProductNav({ onEnterApp }) {
  const [active, setActive] = useState_L("companies");
  const [scrolled, setScrolled] = useState_L(false);
  const navRef = useRef_L(null);
  const itemRefs = useRef_L({});
  const [pillStyle, setPillStyle] = useState_L({ left: 0, width: 0, opacity: 0 });

  // Scroll-spy across in-page sections
  useEffect_L(() => {
    const scroller = navRef.current?.closest(".scroll") || window;
    const getScrollTop = () => scroller === window ? window.scrollY : scroller.scrollTop;

    const onScroll = () => {
      setScrolled(getScrollTop() > 8);
      const sections = ["companies","workflow","changelog","roadmap"];
      const positions = sections.map(id => {
        const el = document.getElementById(id);
        if (!el) return { id, top: Infinity };
        const rect = el.getBoundingClientRect();
        return { id, top: rect.top };
      });
      // Active = the section whose top is closest to (but past) 120px from viewport top
      const above = positions.filter(p => p.top <= 140);
      const current = above.length ? above[above.length - 1].id : "companies";
      // Roadmap rolls under "changelog" for nav purposes
      setActive(current === "roadmap" ? "changelog" : current);
    };
    onScroll();
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => scroller.removeEventListener("scroll", onScroll);
  }, []);

  // Slide the active pill underline
  useEffect_L(() => {
    const el = itemRefs.current[active];
    if (!el || !navRef.current) return;
    const navRect = navRef.current.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    setPillStyle({
      left: r.left - navRect.left,
      width: r.width,
      opacity: 1
    });
  }, [active]);

  const onClickItem = (id) => {
    if (id === "demo") { onEnterApp(); return; }
    const el = document.getElementById(id);
    if (el) {
      const scroller = navRef.current?.closest(".scroll");
      if (scroller) {
        const top = el.getBoundingClientRect().top + scroller.scrollTop - 64;
        scroller.scrollTo({ top, behavior: "smooth" });
      } else {
        window.scrollTo({ top: el.offsetTop - 64, behavior: "smooth" });
      }
    }
  };

  return (
    <div style={{
      position:"sticky", top: 0, zIndex: 20,
      backdropFilter: "saturate(140%) blur(14px)",
      WebkitBackdropFilter: "saturate(140%) blur(14px)",
      background: scrolled
        ? "color-mix(in oklch, var(--bg-0), transparent 18%)"
        : "color-mix(in oklch, var(--bg-0), transparent 35%)",
      borderBottom: `1px solid ${scrolled ? "var(--line)" : "var(--line-soft)"}`,
      transition: "background 200ms, border-color 200ms"
    }}>
      <div style={{
        maxWidth: 1240, margin: "0 auto",
        height: 54, padding: "0 28px",
        display:"flex", alignItems:"center", gap: 22
      }}>
        {/* Brand block */}
        <a onClick={()=>onClickItem("companies")} style={{
          all:"unset", cursor:"pointer",
          display:"flex", alignItems:"center", gap: 9
        }}>
          <div style={{
            width: 24, height: 24, borderRadius: 6,
            background: "linear-gradient(135deg, var(--rust) 0%, var(--accent) 100%)",
            display:"flex", alignItems:"center", justifyContent:"center",
            color:"oklch(0.99 0 0)", fontWeight: 700, fontSize: 11,
            fontFamily:"var(--font-mono)",
            boxShadow:"0 1px 0 oklch(1 0 0 / 0.18) inset"
          }}>j.</div>
          <span style={{color:"var(--fg-0)", fontWeight: 600, fontSize: 13.5, letterSpacing:"-0.01em"}}>
            osspath
          </span>
        </a>

        {/* Vertical divider */}
        <div style={{width: 1, height: 18, background:"var(--line)"}}/>

        {/* Workspace pill */}
        <div style={{
          display:"flex", alignItems:"center", gap: 6,
          padding:"3px 8px 3px 6px", borderRadius: 6,
          background: "var(--bg-2)", border:"1px solid var(--line-soft)",
          fontSize: 11.5, fontFamily:"var(--font-mono)", color:"var(--fg-2)"
        }}>
          <span style={{
            width: 5, height: 5, borderRadius: 999,
            background: "var(--ok)",
            boxShadow:"0 0 0 3px color-mix(in oklch, var(--ok), transparent 80%)"
          }}/>
          <span style={{color:"var(--fg-0)"}}>v0.4.2</span>
          <span style={{opacity:0.4}}>·</span>
          <span>all systems operational</span>
        </div>

        {/* Nav items */}
        <nav ref={navRef} style={{
          position:"relative",
          display:"flex", alignItems:"center", gap: 2,
          marginLeft: 8
        }}>
          {/* Active pill */}
          <div style={{
            position:"absolute", top: 6, bottom: 6,
            left: pillStyle.left, width: pillStyle.width, opacity: pillStyle.opacity,
            background: "var(--bg-3)", borderRadius: 6,
            border: "1px solid var(--line-soft)",
            transition: "left 280ms cubic-bezier(0.4, 0.0, 0.2, 1), width 280ms cubic-bezier(0.4, 0.0, 0.2, 1), opacity 200ms",
            pointerEvents:"none"
          }}/>
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              ref={el => { if (el) itemRefs.current[item.id] = el; }}
              onClick={()=>onClickItem(item.id)}
              style={{
                all:"unset", cursor:"pointer", position:"relative",
                display:"inline-flex", alignItems:"center", gap: 7,
                padding: "5px 11px", borderRadius: 6,
                fontSize: 13,
                fontWeight: active === item.id ? 500 : 400,
                color: active === item.id ? "var(--fg-0)" : "var(--fg-2)",
                transition: "color 160ms"
              }}
              onMouseEnter={e=>{ if (active !== item.id) e.currentTarget.style.color = "var(--fg-1)"; }}
              onMouseLeave={e=>{ if (active !== item.id) e.currentTarget.style.color = "var(--fg-2)"; }}
            >
              {item.icon && (
                <Icon name={item.icon} size={10} style={{
                  color: item.id === "demo" ? "var(--accent)" : "currentColor",
                  opacity: 0.9
                }}/>
              )}
              {item.label}
              {item.badge && <NavPulseDot/>}
              {item.id === "demo" && (
                <span style={{
                  fontFamily:"var(--font-mono)", fontSize: 9.5, color:"var(--fg-3)",
                  padding: "1px 4px", borderRadius: 3,
                  border:"1px solid var(--line-soft)",
                  marginLeft: 1
                }}>live</span>
              )}
            </button>
          ))}
        </nav>

        <div style={{flex:1}}/>

        {/* Right-side: search hint + sign in + open app */}
        <button onClick={onEnterApp} style={{
          all:"unset", cursor:"pointer",
          display:"inline-flex", alignItems:"center", gap: 6,
          height: 28, padding: "0 8px", borderRadius: 6,
          fontSize: 11.5, color:"var(--fg-3)",
          border:"1px solid var(--line-soft)",
          fontFamily:"var(--font-mono)"
        }}>
          <Icon name="search" size={11}/>
          <span>Search</span>
          <span style={{
            padding:"1px 4px", borderRadius: 3,
            border:"1px solid var(--line-soft)", marginLeft: 2,
            color:"var(--fg-2)"
          }}>⌘K</span>
        </button>

        <a style={{
          cursor:"pointer", fontSize: 13, color:"var(--fg-1)",
          padding: "0 4px"
        }}
        onMouseEnter={e=>e.currentTarget.style.color = "var(--fg-0)"}
        onMouseLeave={e=>e.currentTarget.style.color = "var(--fg-1)"}>
          Sign in
        </a>

        <button onClick={onEnterApp} style={{
          all:"unset", cursor:"pointer",
          display:"inline-flex", alignItems:"center", gap: 6,
          height: 30, padding: "0 12px", borderRadius: 7,
          fontSize: 12.5, fontWeight: 500, color:"oklch(0.99 0 0)",
          background: "var(--accent)",
          boxShadow: "0 1px 0 oklch(1 0 0 / 0.18) inset, 0 4px 14px -6px var(--accent)"
        }}>
          Open app <Icon name="arrow" size={12}/>
        </button>
      </div>
    </div>
  );
}

function NavPulseDot() {
  return (
    <span style={{position:"relative", display:"inline-flex", width: 6, height: 6, marginLeft: 1}}>
      <span style={{position:"absolute", inset: 0, borderRadius: 999, background:"var(--rust)"}}/>
      <span style={{
        position:"absolute", inset: -2, borderRadius: 999,
        border: "1.5px solid var(--rust)", opacity: 0.5,
        animation: "pulse 2.2s ease-out infinite"
      }}/>
    </span>
  );
}

// ====== Changelog Section ======
function ChangelogSection() {
  const entries = [
    {
      ver: "v0.4.2", date: "2026.05.22", tag: "improvement",
      title: "Optimistic filtering",
      desc: "Filter sidebar applies state locally before re-querying. Stack 6 filters with no visible latency."
    },
    {
      ver: "v0.4.1", date: "2026.05.14", tag: "feature",
      title: "Compact density mode",
      desc: "New compact toggle in the top bar trims row heights to 40px and switches the grid to 4-up at standard widths."
    },
    {
      ver: "v0.4.0", date: "2026.05.06", tag: "feature",
      title: "Command palette",
      desc: "⌘K opens a unified jump-to surface across companies, actions, and saved views. Fuzzy match, full keyboard."
    },
    {
      ver: "v0.3.9", date: "2026.04.28", tag: "improvement",
      title: "Hiring signals",
      desc: "Pulse indicators distinguish actively-hiring from selective. Backed by a new biweekly scrape of 412 career pages."
    },
    {
      ver: "v0.3.8", date: "2026.04.19", tag: "feature",
      title: "Follow-up queues",
      desc: "Saved companies resurface 7 days after activity stalls. Snooze and dismiss with keyboard shortcuts."
    },
    {
      ver: "v0.3.7", date: "2026.04.10", tag: "fix",
      title: "Sidebar redesign",
      desc: "Filter groups collapse independently, counts update live, and the rail now scrolls separately from the content."
    }
  ];

  const tagMeta = {
    feature:     { color: "var(--accent)", label: "feature" },
    improvement: { color: "var(--rust)",   label: "improvement" },
    fix:         { color: "var(--ok)",     label: "fix" }
  };

  return (
    <section id="changelog" data-nav-section="changelog" style={{
      maxWidth: 1240, margin:"0 auto", padding:"72px 32px",
      scrollMarginTop: 80
    }}>
      <div style={{
        display:"flex", alignItems:"flex-end", justifyContent:"space-between",
        gap: 24, marginBottom: 28, flexWrap:"wrap"
      }}>
        <SectionHeader
          kicker="Changelog"
          title={<>Shipped this month. <br/>Every week.</>}
          desc="We move fast and we say so. Subscribe to the RSS feed or follow along here — no marketing fluff, just what changed and why."
        />
        <div style={{display:"flex", gap: 8}}>
          <button style={{
            all:"unset", cursor:"pointer",
            display:"inline-flex", alignItems:"center", gap: 6,
            height: 32, padding: "0 12px", borderRadius: 7,
            fontSize: 12.5, color:"var(--fg-1)",
            border:"1px solid var(--line)",
            fontFamily:"var(--font-mono)"
          }}>
            <Icon name="radio" size={12} style={{color:"var(--fg-3)"}}/>
            rss feed
          </button>
          <button style={{
            all:"unset", cursor:"pointer",
            display:"inline-flex", alignItems:"center", gap: 6,
            height: 32, padding: "0 12px", borderRadius: 7,
            fontSize: 12.5, color:"var(--fg-1)",
            border:"1px solid var(--line)"
          }}>
            <Icon name="external" size={12} style={{color:"var(--fg-3)"}}/>
            full changelog
          </button>
        </div>
      </div>

      {/* Entries */}
      <div style={{
        position:"relative",
        display:"flex", flexDirection:"column"
      }}>
        {/* Spine */}
        <div style={{
          position:"absolute", top: 14, bottom: 14, left: 90, width: 1,
          background: "var(--line-soft)"
        }}/>

        {entries.map((e, i) => {
          const tm = tagMeta[e.tag];
          return (
            <div key={i} style={{
              display:"grid", gridTemplateColumns:"82px 1fr",
              gap: 24, padding: "14px 0",
              borderBottom: i === entries.length - 1 ? "none" : "1px dashed var(--line-soft)"
            }}>
              {/* Date column */}
              <div style={{position:"relative", paddingTop: 2}}>
                <div style={{fontSize: 11, fontFamily:"var(--font-mono)", color:"var(--fg-3)"}}>{e.date}</div>
                <div style={{fontSize: 11, fontFamily:"var(--font-mono)", color:"var(--fg-2)", marginTop: 2}}>{e.ver}</div>
              </div>

              {/* Content column with spine dot */}
              <div style={{position:"relative", paddingLeft: 24}}>
                <span style={{
                  position:"absolute", left: -8, top: 6,
                  width: 12, height: 12, borderRadius: 999,
                  background: "var(--bg-0)",
                  border: `2px solid ${tm.color}`
                }}/>
                <div style={{display:"flex", alignItems:"center", gap: 8, marginBottom: 4}}>
                  <span style={{
                    display:"inline-block",
                    padding: "1px 7px", borderRadius: 4,
                    fontFamily:"var(--font-mono)", fontSize: 10.5,
                    color: tm.color, background: `color-mix(in oklch, ${tm.color}, transparent 86%)`,
                    border: `1px solid color-mix(in oklch, ${tm.color}, transparent 70%)`
                  }}>{tm.label}</span>
                  <h4 style={{margin:0, fontSize: 14.5, fontWeight: 600, color:"var(--fg-0)",
                    letterSpacing:"-0.005em"}}>{e.title}</h4>
                </div>
                <p style={{margin:0, fontSize: 13, color:"var(--fg-2)", lineHeight: 1.5,
                  textWrap:"pretty", maxWidth: 640}}>{e.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

window.Landing = function Landing({ onEnterApp, onPickCompany }) {  const sample = window.COMPANIES.slice(0, 6);

  return (
    <div style={{
      height:"100%", overflow:"auto", background:"var(--bg-0)",
      color:"var(--fg-1)"
    }} className="scroll">
      <ProductNav onEnterApp={onEnterApp}/>

      {/* Hero */}
      <section style={{
        maxWidth: 1240, margin: "0 auto",
        padding: "80px 32px 56px",
        display:"grid", gridTemplateColumns:"1.05fr 1fr", gap: 56, alignItems:"center"
      }}>
        <div>
          <div style={{
            display:"inline-flex", alignItems:"center", gap: 8,
            padding: "5px 10px 5px 7px", borderRadius: 999,
            background: "var(--bg-2)", border:"1px solid var(--line-soft)",
            fontSize: 11.5, color:"var(--fg-2)", fontFamily:"var(--font-mono)"
          }}>
            <span style={{
              width: 18, height:18, borderRadius:999,
              background:"var(--rust-soft)", color:"var(--rust)",
              display:"inline-flex", alignItems:"center", justifyContent:"center"
            }}><Icon name="flame" size={11}/></span>
            <span style={{color:"var(--fg-0)"}}>now in private beta</span>
            <span style={{opacity:0.5}}>·</span>
            <span>tracking 412 companies</span>
          </div>

          <h1 style={{
            margin: "20px 0 0", fontSize: 56, lineHeight: 1.02,
            fontWeight: 600, color:"var(--fg-0)",
            letterSpacing:"-0.025em", textWrap:"balance"
          }}>
            A career operating system <br/>
            for <span style={{
              background: "linear-gradient(95deg, var(--rust) 20%, var(--accent) 80%)",
              WebkitBackgroundClip: "text", backgroundClip: "text",
              color: "transparent"
            }}>remote engineers</span>.
          </h1>

          <p style={{
            marginTop: 22, fontSize: 16.5, lineHeight: 1.5,
            color:"var(--fg-2)", maxWidth: 540, textWrap:"pretty"
          }}>
            Discover high-signal opportunities in the Rust ecosystem, track every application,
            and stop losing momentum to dozens of open tabs. Built for engineers who treat
            their job search like a system.
          </p>

          <div style={{display:"flex", gap: 10, marginTop: 28, alignItems:"center"}}>
            <button onClick={onEnterApp} style={{
              all:"unset", cursor:"pointer",
              display:"inline-flex", alignItems:"center", gap: 7,
              height: 40, padding: "0 16px", borderRadius: 8,
              fontSize: 14, fontWeight: 500, color:"oklch(0.99 0 0)",
              background:"var(--accent)",
              boxShadow:"0 1px 0 oklch(1 0 0 / 0.2) inset, 0 8px 24px -10px var(--accent)"
            }}>
              Explore demo <Icon name="arrow" size={13}/>
            </button>
            <button style={{
              all:"unset", cursor:"pointer",
              display:"inline-flex", alignItems:"center", gap: 7,
              height: 40, padding: "0 16px", borderRadius: 8,
              fontSize: 14, color:"var(--fg-0)",
              border:"1px solid var(--line)"
            }}>
              <Icon name="users" size={13} style={{color:"var(--fg-2)"}}/>
              Request invite
            </button>
            <span style={{fontSize: 11.5, color:"var(--fg-3)", fontFamily:"var(--font-mono)", marginLeft: 6}}>
              free during beta
            </span>
          </div>

          {/* Trust strip */}
          <div style={{
            marginTop: 44, paddingTop: 24,
            borderTop: "1px solid var(--line-soft)",
            display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap: 24
          }}>
            {[
              { k: "412", l: "companies tracked", c: "var(--fg-0)" },
              { k: "1,180+", l: "open roles indexed", c: "var(--rust)" },
              { k: "97%", l: "remote-first listings", c: "var(--accent)" }
            ].map((x,i) => (
              <div key={i}>
                <div style={{fontSize: 22, fontWeight: 600, color: x.c, letterSpacing:"-0.01em",
                  fontVariantNumeric:"tabular-nums"}}>{x.k}</div>
                <div style={{fontSize: 12, color:"var(--fg-3)", marginTop: 2}}>{x.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: device-style preview */}
        <HeroPreview onEnter={onEnterApp}/>
      </section>

      {/* Section: company previews */}
      <section id="companies" data-nav-section="companies" style={{maxWidth: 1240, margin:"0 auto", padding:"64px 32px 64px", scrollMarginTop: 80}}>
        <SectionHeader
          kicker="Companies"
          title="High-signal opportunities, curated like a tasting menu."
          desc="Every company is hand-picked for engineering depth, remote culture, and compensation transparency. No agencies. No ghost listings."
        />

        <div style={{
          display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap: 14,
          marginTop: 28
        }}>
          {sample.map(c => (
            <PreviewCard key={c.id} c={c} onClick={()=>onPickCompany(c)}/>
          ))}
        </div>

        <div style={{
          marginTop: 18, display:"flex", justifyContent:"center"
        }}>
          <button onClick={onEnterApp} style={{
            all:"unset", cursor:"pointer",
            display:"inline-flex", alignItems:"center", gap: 7,
            padding: "8px 14px", borderRadius: 8,
            fontSize: 13, color:"var(--fg-1)",
            border:"1px solid var(--line)"
          }}>
            Explore all 412 companies <Icon name="arrow" size={12}/>
          </button>
        </div>
      </section>

      {/* Section: Workflow (filters preview + dashboard) */}
      <section id="workflow" data-nav-section="workflow" style={{
        background: "var(--bg-1)", borderTop:"1px solid var(--line-soft)",
        borderBottom:"1px solid var(--line-soft)", scrollMarginTop: 80
      }}>
        <div style={{maxWidth: 1240, margin:"0 auto", padding:"72px 32px",
          display:"grid", gridTemplateColumns:"1fr 1.2fr", gap: 56, alignItems:"center"}}>
          <div>
            <SectionHeader
              kicker="Workflow · Filter"
              title={<>Slice 412 companies <br/>down to the 12 that matter.</>}
              desc="Stack filters by stage, compensation, remote region, hiring state and tracking status. Saved views remember your stack between sessions."
              inline
            />
            <ul style={{
              marginTop: 24, padding: 0, listStyle: "none",
              display:"flex", flexDirection:"column", gap: 12
            }}>
              {[
                { i: "boltSm", t: "Instant filtering", s: "No reloads, no waterfalls — all filters apply in under a frame." },
                { i: "target", t: "Saved views", s: "Pin your power-user stack. Switch contexts in one tap." },
                { i: "spark", t: "Smart queues", s: "Resurface companies you saved but never followed up on." }
              ].map((f,i) => (
                <li key={i} style={{display:"flex", gap: 12, alignItems:"flex-start"}}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                    background: "var(--bg-3)", border:"1px solid var(--line-soft)",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    color:"var(--accent)"
                  }}>
                    <Icon name={f.i} size={14}/>
                  </div>
                  <div>
                    <div style={{fontSize: 14, fontWeight: 500, color:"var(--fg-0)"}}>{f.t}</div>
                    <div style={{fontSize: 13, color:"var(--fg-2)", marginTop: 2, lineHeight: 1.45}}>{f.s}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <FiltersPreview/>
        </div>
      </section>

      {/* Dashboard preview */}
      <section style={{maxWidth: 1240, margin:"0 auto", padding:"72px 32px"}}>
        <SectionHeader
          kicker="Workflow · Track"
          title={<>One view for every conversation in flight.</>}
          desc="Track applications across status, surface follow-ups before they go stale, and keep momentum without spreadsheets, browser tabs, or that one Notion page from 2023."
          centered
        />

        <DashboardPreview/>

        <div style={{
          marginTop: 24, display:"flex", justifyContent:"center"
        }}>
          <button onClick={onEnterApp} style={{
            all:"unset", cursor:"pointer",
            display:"inline-flex", alignItems:"center", gap: 7,
            height: 40, padding: "0 16px", borderRadius: 8,
            fontSize: 14, fontWeight: 500, color:"oklch(0.99 0 0)",
            background: "var(--accent)",
            boxShadow:"0 1px 0 oklch(1 0 0 / 0.2) inset, 0 8px 24px -10px var(--accent)"
          }}>
            Open workspace <Icon name="arrow" size={13}/>
          </button>
        </div>
      </section>

      {/* Changelog */}
      <ChangelogSection/>

      {/* Roadmap */}
      <section id="roadmap" data-nav-section="roadmap" style={{
        background:"var(--bg-1)", borderTop:"1px solid var(--line-soft)", scrollMarginTop: 80
      }}>
        <div style={{maxWidth: 1240, margin:"0 auto", padding:"64px 32px"}}>
          <SectionHeader
            kicker="Roadmap"
            title={<>From job board → career operating system.</>}
            desc="We started by indexing Rust companies. We're building toward a system that knows your pipeline better than you do."
          />

          <div style={{
            marginTop: 32,
            display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap: 14
          }}>
            {[
              { stage: "Now", t: "Companies + tracking", s: "412 companies, 5-state tracking, sidebar filters, saved views.", color:"var(--ok)" },
              { stage: "Q3", t: "Openings + timelines", s: "Per-role timelines, recruiter contacts, compensation comparison.", color:"var(--accent)" },
              { stage: "Q4", t: "Smart queues", s: "Resurface stale applications, suggest follow-up windows, batch outreach.", color:"var(--rust)" },
              { stage: "2026", t: "Career intelligence", s: "Cohort comp data, hiring trends, automated discovery for your stack.", color:"var(--warn)" }
            ].map((p,i) => (
              <div key={i} style={{
                padding: 18, borderRadius: "var(--r)",
                background:"var(--bg-2)", border:"1px solid var(--line-soft)",
                display:"flex", flexDirection:"column", gap: 8
              }}>
                <div style={{display:"flex", alignItems:"center", gap: 6,
                  fontFamily:"var(--font-mono)", fontSize: 10.5,
                  color: p.color, textTransform:"uppercase", letterSpacing:"0.06em"}}>
                  <span style={{width:6, height:6, borderRadius:999, background:p.color}}/>
                  {p.stage}
                </div>
                <div style={{fontSize: 14, fontWeight: 600, color:"var(--fg-0)"}}>{p.t}</div>
                <div style={{fontSize: 12.5, color:"var(--fg-2)", lineHeight: 1.45}}>{p.s}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        padding: "40px 32px 56px", textAlign:"center"
      }}>
        <div style={{
          maxWidth: 1240, margin: "0 auto",
          display:"flex", alignItems:"center", justifyContent:"space-between",
          fontSize: 12, color:"var(--fg-3)", fontFamily:"var(--font-mono)"
        }}>
          <span>osspath · built by remote engineers, for remote engineers</span>
          <span>v0.4.2 · 2026.05</span>
        </div>
      </footer>
    </div>
  );
};

function SectionHeader({ kicker, title, desc, centered, inline }) {  return (
    <div style={{
      textAlign: centered ? "center" : "left",
      maxWidth: centered ? 720 : (inline ? "none" : 640),
      margin: centered ? "0 auto" : 0
    }}>
      <div style={{
        display:"inline-block",
        fontFamily:"var(--font-mono)", fontSize: 11,
        color:"var(--accent)", textTransform:"uppercase", letterSpacing:"0.1em",
        marginBottom: 12
      }}>
        — {kicker}
      </div>
      <h2 style={{
        margin: 0, fontSize: 30, fontWeight: 600, color:"var(--fg-0)",
        letterSpacing:"-0.018em", lineHeight: 1.15, textWrap:"balance"
      }}>{title}</h2>
      {desc && <p style={{
        marginTop: 10, fontSize: 15, color:"var(--fg-2)",
        lineHeight: 1.5, maxWidth: centered ? 580 : 540,
        marginLeft: centered ? "auto" : 0, marginRight: centered ? "auto" : 0,
        textWrap:"pretty"
      }}>{desc}</p>}
    </div>
  );
}

function PreviewCard({ c, onClick }) {
  const [h, setH] = useState_L(false);
  return (
    <div onClick={onClick}
      onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{
        background:"var(--bg-1)", border:"1px solid var(--line-soft)",
        borderRadius:"var(--r)", padding: 16, cursor:"pointer",
        display:"flex", flexDirection:"column", gap: 12,
        transition:"all 140ms",
        transform: h ? "translateY(-1px)" : "none",
        borderColor: h ? "var(--line)" : "var(--line-soft)"
      }}>
      <div style={{display:"flex", alignItems:"center", gap: 10}}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: `linear-gradient(135deg, ${c.color} 0%, color-mix(in oklch, ${c.color}, transparent 55%) 100%)`,
          display:"flex", alignItems:"center", justifyContent:"center",
          fontFamily:"var(--font-mono)", fontWeight: 600, fontSize: 12,
          color:"oklch(0.99 0 0)"
        }}>{c.initials}</div>
        <div style={{flex:1}}>
          <div style={{fontSize: 14, fontWeight: 600, color:"var(--fg-0)"}}>{c.name}</div>
          <div style={{fontSize: 11, color:"var(--fg-3)", fontFamily:"var(--font-mono)"}}>{c.domain}</div>
        </div>
        <div style={{
          display:"inline-flex", alignItems:"center", gap: 5,
          fontSize: 11, fontFamily:"var(--font-mono)", color:"var(--ok)"
        }}>
          <HiringPulse state={c.hiring}/>
          {c.openings}
        </div>
      </div>
      <div style={{fontSize: 13, color:"var(--fg-1)", lineHeight: 1.45, textWrap:"pretty"}}>{c.desc}</div>
      <div style={{display:"flex", gap: 4, flexWrap:"wrap"}}>
        {c.tags.slice(0,3).map(t => <TagPillL key={t}>{t}</TagPillL>)}
      </div>
    </div>
  );
}

function TagPillL({ children }) {
  return (
    <span style={{
      display:"inline-flex", padding: "2px 7px", borderRadius: 5,
      fontFamily:"var(--font-mono)", fontSize: 11,
      background:"var(--bg-3)", color:"var(--fg-2)",
      border:"1px solid var(--line-soft)"
    }}>{children}</span>
  );
}

// === Hero preview — fake explorer screenshot ===
function HeroPreview({ onEnter }) {
  return (
    <div style={{
      position:"relative",
      background:"var(--bg-1)",
      border:"1px solid var(--line)",
      borderRadius: 14,
      padding: 0, overflow:"hidden",
      boxShadow:"0 30px 80px -30px oklch(0 0 0 / 0.6), 0 0 0 1px var(--line-soft)",
      transform:"perspective(2000px) rotateY(-3deg) rotateX(2deg)"
    }}>
      {/* fake titlebar */}
      <div style={{
        display:"flex", alignItems:"center", gap: 6,
        padding: "10px 12px", borderBottom: "1px solid var(--line-soft)",
        background:"var(--bg-2)"
      }}>
        <span style={{width:10, height:10, borderRadius:999, background:"oklch(0.66 0.18 22 / 0.7)"}}/>
        <span style={{width:10, height:10, borderRadius:999, background:"oklch(0.78 0.13 80 / 0.7)"}}/>
        <span style={{width:10, height:10, borderRadius:999, background:"oklch(0.72 0.14 155 / 0.7)"}}/>
        <div style={{flex:1, display:"flex", justifyContent:"center"}}>
          <span style={{fontFamily:"var(--font-mono)", fontSize: 11, color:"var(--fg-3)"}}>
            osspath.com/companies
          </span>
        </div>
      </div>

      {/* fake explorer */}
      <div style={{display:"flex", height: 380}}>
        {/* sidebar */}
        <div style={{
          width: 130, background:"var(--bg-1)", borderRight:"1px solid var(--line-soft)",
          padding: "10px 8px", display:"flex", flexDirection:"column", gap: 2,
          fontSize: 11
        }}>
          {[
            { l: "Companies", a: true, n: 412 },
            { l: "Tracking", n: 18 },
            { l: "Inbox", n: 3 },
            { l: "Saved", n: 24 }
          ].map((x,i) => (
            <div key={i} style={{
              display:"flex", padding:"5px 7px", borderRadius: 5,
              background: x.a ? "var(--bg-3)" : "transparent",
              color: x.a ? "var(--fg-0)" : "var(--fg-2)"
            }}>
              <span style={{flex:1}}>{x.l}</span>
              <span style={{fontFamily:"var(--font-mono)", color:"var(--fg-3)"}}>{x.n}</span>
            </div>
          ))}
          <div style={{height: 1, background:"var(--line-soft)", margin: "8px 0"}}/>
          <div style={{
            fontFamily:"var(--font-mono)", fontSize: 9.5,
            color:"var(--fg-3)", padding: "4px 7px", textTransform:"uppercase",
            letterSpacing:"0.06em"
          }}>Filters</div>
          {[
            { l: "Applied", dot: "var(--accent)" },
            { l: "Interviewing", dot: "var(--rust)", on: true },
            { l: "Follow-up", dot: "var(--warn)", on: true },
            { l: "Hiring", dot: "var(--ok)" },
            { l: "Remote · EU", dot: "var(--fg-2)" }
          ].map((f, i) => (
            <div key={i} style={{
              display:"flex", alignItems:"center", gap: 6,
              padding:"4px 7px", borderRadius: 5, color: f.on ? "var(--fg-0)":"var(--fg-2)",
              background: f.on ? "var(--bg-3)" : "transparent"
            }}>
              <span style={{
                width: 11, height: 11, borderRadius: 3,
                border: `1.5px solid ${f.on ? "var(--accent)" : "var(--line)"}`,
                background: f.on ? "var(--accent)" : "transparent"
              }}/>
              <span style={{width: 5, height:5, borderRadius:999, background: f.dot}}/>
              <span>{f.l}</span>
            </div>
          ))}
        </div>

        {/* content */}
        <div style={{flex:1, padding: 14, display:"flex", flexDirection:"column", gap: 10, background:"var(--bg-0)"}}>
          <div style={{
            display:"flex", alignItems:"center", gap: 8, height: 26,
            padding: "0 10px", borderRadius: 6,
            background:"var(--bg-2)", border:"1px solid var(--line-soft)",
            fontSize: 11, color:"var(--fg-3)"
          }}>
            <Icon name="search" size={11}/>
            <span>actively hiring · rust</span>
            <div style={{flex:1}}/>
            <span style={{fontFamily:"var(--font-mono)"}}>⌘K</span>
          </div>
          <div style={{display:"flex", gap: 6, alignItems:"center"}}>
            <span style={{fontFamily:"var(--font-mono)", fontSize: 11, color:"var(--fg-0)"}}>14</span>
            <span style={{fontSize: 11, color:"var(--fg-3)"}}>results</span>
            <span style={{
              padding: "1px 6px", borderRadius: 4, fontSize: 10,
              fontFamily:"var(--font-mono)", background:"var(--bg-2)",
              border:"1px solid var(--line-soft)", color:"var(--fg-2)"
            }}>interviewing</span>
            <span style={{
              padding: "1px 6px", borderRadius: 4, fontSize: 10,
              fontFamily:"var(--font-mono)", background:"var(--bg-2)",
              border:"1px solid var(--line-soft)", color:"var(--fg-2)"
            }}>follow-up due</span>
          </div>

          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap: 8, marginTop: 4}}>
            {window.COMPANIES.slice(0,4).map(c => (
              <div key={c.id} style={{
                background:"var(--bg-1)", border:"1px solid var(--line-soft)",
                borderRadius: 8, padding: 10,
                display:"flex", flexDirection:"column", gap: 6
              }}>
                <div style={{display:"flex", alignItems:"center", gap: 7}}>
                  <div style={{
                    width: 22, height: 22, borderRadius: 5,
                    background: `linear-gradient(135deg, ${c.color}, color-mix(in oklch, ${c.color}, transparent 55%))`,
                    fontFamily:"var(--font-mono)", fontSize: 9, fontWeight: 600,
                    color:"oklch(0.99 0 0)",
                    display:"flex", alignItems:"center", justifyContent:"center"
                  }}>{c.initials}</div>
                  <span style={{fontSize: 12, fontWeight: 600, color:"var(--fg-0)"}}>{c.name}</span>
                </div>
                <div style={{fontSize: 10.5, color:"var(--fg-2)", lineHeight: 1.4,
                  display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical",
                  overflow:"hidden"}}>{c.desc}</div>
                <div style={{display:"flex", gap: 4, marginTop: 2}}>
                  {c.tags.slice(0,2).map(t => (
                    <span key={t} style={{
                      fontFamily:"var(--font-mono)", fontSize: 9,
                      padding:"1px 4px", borderRadius: 3,
                      background:"var(--bg-3)", color:"var(--fg-2)"
                    }}>{t}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// === Filters preview ===
function FiltersPreview() {
  return (
    <div style={{
      background: "var(--bg-2)",
      border: "1px solid var(--line-soft)",
      borderRadius: 14, padding: 16,
      boxShadow:"0 20px 60px -30px oklch(0 0 0 / 0.5)"
    }}>
      <div style={{display:"grid", gridTemplateColumns:"180px 1fr", gap: 16}}>
        {/* fake filter rail */}
        <div style={{display:"flex", flexDirection:"column", gap: 14}}>
          <div>
            <div style={{fontFamily:"var(--font-mono)", fontSize: 10, color:"var(--fg-3)",
              letterSpacing:"0.06em", textTransform:"uppercase", marginBottom: 6}}>Tracking</div>
            {[
              { l: "Applied", c: "var(--accent)", on: true, n: 5 },
              { l: "Interviewing", c: "var(--rust)", on: true, n: 2 },
              { l: "Saved", c: "var(--fg-2)", n: 7 },
              { l: "Follow-up", c: "var(--warn)", on: true, n: 5 }
            ].map((x,i) => (
              <FilterPreviewRow key={i} {...x}/>
            ))}
          </div>
          <div>
            <div style={{fontFamily:"var(--font-mono)", fontSize: 10, color:"var(--fg-3)",
              letterSpacing:"0.06em", textTransform:"uppercase", marginBottom: 6}}>Hiring</div>
            {[
              { l: "Actively hiring", c: "var(--ok)", on: true },
              { l: "Selective", c: "var(--warn)" },
              { l: "No openings", c: "var(--fg-3)" }
            ].map((x,i) => (
              <FilterPreviewRow key={i} {...x}/>
            ))}
          </div>
        </div>

        <div style={{display:"flex", flexDirection:"column", gap: 8}}>
          <div style={{
            display:"flex", alignItems:"center", gap: 6, flexWrap:"wrap",
            padding: 8, borderRadius: 7, background:"var(--bg-3)",
            border:"1px solid var(--line-soft)"
          }}>
            <span style={{fontSize: 11, fontFamily:"var(--font-mono)", color:"var(--fg-0)"}}>9</span>
            <span style={{fontSize: 11, color:"var(--fg-3)"}}>results matching</span>
            {[
              { l: "Applied", c: "var(--accent)" },
              { l: "Interviewing", c: "var(--rust)" },
              { l: "Follow-up", c: "var(--warn)" },
              { l: "Actively hiring", c: "var(--ok)" }
            ].map((p,i) => (
              <span key={i} style={{
                display:"inline-flex", alignItems:"center", gap: 4,
                padding: "1px 6px 1px 8px", borderRadius: 4,
                fontFamily:"var(--font-mono)", fontSize: 10,
                background:"var(--bg-1)", border:"1px solid var(--line-soft)",
                color:"var(--fg-1)"
              }}>
                <span style={{width:5,height:5,borderRadius:999, background:p.c}}/>
                {p.l}
                <span style={{opacity:0.5}}>×</span>
              </span>
            ))}
          </div>

          {window.COMPANIES.filter(c => (c.status === "interviewing" || c.followup) && c.hiring === "actively-hiring").slice(0,4).map(c => (
            <div key={c.id} style={{
              display:"flex", gap: 10, alignItems:"center",
              padding: 9, borderRadius: 7,
              background:"var(--bg-1)", border:"1px solid var(--line-soft)"
            }}>
              <div style={{
                width: 26, height: 26, borderRadius: 6,
                background: `linear-gradient(135deg, ${c.color}, color-mix(in oklch, ${c.color}, transparent 55%))`,
                fontFamily:"var(--font-mono)", fontSize: 10, fontWeight: 600,
                color:"oklch(0.99 0 0)",
                display:"flex", alignItems:"center", justifyContent:"center"
              }}>{c.initials}</div>
              <div style={{flex:1, minWidth:0}}>
                <div style={{fontSize: 12.5, fontWeight: 600, color:"var(--fg-0)"}}>{c.name}</div>
                <div style={{fontSize: 11, color:"var(--fg-3)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>{c.desc}</div>
              </div>
              <StatusBadge status={c.status} compact/>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FilterPreviewRow({ l, c, on, n }) {
  return (
    <div style={{
      display:"flex", alignItems:"center", gap: 7,
      padding: "4px 7px", borderRadius: 5,
      background: on ? "var(--bg-3)" : "transparent",
      color: on ? "var(--fg-0)" : "var(--fg-2)",
      fontSize: 11.5, marginBottom: 1
    }}>
      <span style={{
        width: 12, height: 12, borderRadius: 3,
        border: `1.5px solid ${on ? "var(--accent)" : "var(--line)"}`,
        background: on ? "var(--accent)" : "transparent"
      }}/>
      <span style={{width: 5, height:5, borderRadius:999, background: c}}/>
      <span style={{flex:1}}>{l}</span>
      {n != null && <span style={{fontFamily:"var(--font-mono)", fontSize: 10, color:"var(--fg-3)"}}>{n}</span>}
    </div>
  );
}

function DashboardPreview() {
  return (
    <div style={{
      marginTop: 32, padding: 0,
      background:"var(--bg-1)", border:"1px solid var(--line)",
      borderRadius: 14, overflow:"hidden",
      boxShadow:"0 40px 100px -40px oklch(0 0 0 / 0.6)"
    }}>
      <div style={{display:"flex", height: 480}}>
        {/* mini sidebar */}
        <div style={{
          width: 56, background:"var(--bg-1)",
          borderRight: "1px solid var(--line-soft)",
          padding: "12px 0", display:"flex", flexDirection:"column",
          alignItems:"center", gap: 6
        }}>
          {["grid","target","inbox","bookmark","layers","pulse"].map((n,i) => (
            <div key={i} style={{
              width: 34, height: 30, borderRadius: 6,
              background: i === 0 ? "var(--bg-3)" : "transparent",
              color: i === 0 ? "var(--fg-0)" : "var(--fg-3)",
              display:"flex", alignItems:"center", justifyContent:"center"
            }}>
              <Icon name={n} size={15}/>
            </div>
          ))}
        </div>

        <div style={{flex:1, display:"flex", flexDirection:"column"}}>
          {/* topbar */}
          <div style={{
            height: 44, display:"flex", alignItems:"center",
            padding: "0 14px", gap: 10,
            borderBottom: "1px solid var(--line-soft)",
            background:"var(--bg-1)"
          }}>
            <div style={{
              display:"flex", alignItems:"center", gap: 7,
              flex: 1, maxWidth: 380, height: 26, padding: "0 8px",
              borderRadius: 6, background:"var(--bg-2)",
              border:"1px solid var(--line-soft)",
              fontSize: 11, color:"var(--fg-3)"
            }}>
              <Icon name="search" size={11}/>
              <span>Search companies, tags, locations…</span>
              <div style={{flex:1}}/>
              <span style={{fontFamily:"var(--font-mono)", padding:"1px 4px", borderRadius: 3, border:"1px solid var(--line)"}}>⌘K</span>
            </div>
            <div style={{flex:1}}/>
            <span style={{fontFamily:"var(--font-mono)", fontSize: 10, color:"var(--fg-3)",
              padding:"2px 7px", borderRadius: 4, border:"1px solid var(--line-soft)"}}>
              comfy
            </span>
            <span style={{display:"flex", gap: 1, padding: 2, borderRadius: 5, border:"1px solid var(--line-soft)"}}>
              {["grid","list","table"].map((v,i) => (
                <span key={i} style={{
                  width: 22, height: 22, display:"flex", alignItems:"center", justifyContent:"center",
                  borderRadius: 3, background: i === 0 ? "var(--bg-3)" : "transparent",
                  color: i === 0 ? "var(--fg-0)" : "var(--fg-3)"
                }}><Icon name={v} size={11}/></span>
              ))}
            </span>
          </div>

          {/* body */}
          <div style={{flex:1, padding: 16, background:"var(--bg-0)", display:"flex", flexDirection:"column", gap: 12, overflow:"hidden"}}>
            {/* stat strip */}
            <div style={{
              display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap: 1,
              background:"var(--line-soft)", borderRadius: 8, overflow:"hidden",
              border:"1px solid var(--line-soft)"
            }}>
              {[
                { l: "TRACKED", v: "18", s: "across pipeline", c: "var(--fg-0)" },
                { l: "INTERVIEWING", v: "2", s: "active", c: "var(--rust)" },
                { l: "FOLLOW-UP", v: "5", s: "this week", c: "var(--warn)" },
                { l: "NEW", v: "12", s: "since visit", c: "var(--ok)" }
              ].map((s, i) => (
                <div key={i} style={{padding: "8px 10px", background:"var(--bg-1)"}}>
                  <div style={{fontFamily:"var(--font-mono)", fontSize: 9, color:"var(--fg-3)", letterSpacing:"0.06em"}}>{s.l}</div>
                  <div style={{display:"flex", alignItems:"baseline", gap: 5, marginTop: 2}}>
                    <span style={{fontSize: 18, fontWeight: 600, color: s.c, fontVariantNumeric:"tabular-nums"}}>{s.v}</span>
                    <span style={{fontSize: 10, color:"var(--fg-3)"}}>{s.s}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* mini cards */}
            <div style={{display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap: 10}}>
              {window.COMPANIES.slice(0,6).map(c => (
                <div key={c.id} style={{
                  background:"var(--bg-1)", border:"1px solid var(--line-soft)",
                  borderRadius: 8, padding: 10, position:"relative",
                  display:"flex", flexDirection:"column", gap: 8
                }}>
                  {c.status !== "none" && (
                    <span style={{
                      position:"absolute", left:0, top:8, bottom:8, width:2,
                      background: window.STATUS_META[c.status].color, opacity: 0.7
                    }}/>
                  )}
                  <div style={{display:"flex", alignItems:"center", gap: 7}}>
                    <div style={{
                      width: 24, height: 24, borderRadius: 6,
                      background: `linear-gradient(135deg, ${c.color}, color-mix(in oklch, ${c.color}, transparent 55%))`,
                      fontFamily:"var(--font-mono)", fontSize: 10, fontWeight: 600,
                      color:"oklch(0.99 0 0)",
                      display:"flex", alignItems:"center", justifyContent:"center"
                    }}>{c.initials}</div>
                    <div style={{flex:1, minWidth:0}}>
                      <div style={{fontSize: 12, fontWeight: 600, color:"var(--fg-0)"}}>{c.name}</div>
                      <div style={{fontSize: 10, color:"var(--fg-3)"}}>{c.domain}</div>
                    </div>
                    <StatusBadge status={c.status} compact/>
                  </div>
                  <div style={{fontSize: 11, color:"var(--fg-2)", lineHeight: 1.4,
                    display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden"}}>{c.desc}</div>
                  <div style={{
                    display:"flex", gap: 8, alignItems:"center", paddingTop: 6,
                    borderTop:"1px dashed var(--line-soft)",
                    fontFamily:"var(--font-mono)", fontSize: 10, color:"var(--fg-2)"
                  }}>
                    <span style={{display:"inline-flex", alignItems:"center", gap: 4}}>
                      <HiringPulse state={c.hiring}/>
                      {c.openings} open
                    </span>
                    <div style={{flex:1}}/>
                    <span style={{color:"var(--fg-3)"}}>{c.lastActivity}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
