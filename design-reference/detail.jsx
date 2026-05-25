// ====== Company Detail (slide-over) ======
const { useState: useState_D, useEffect: useEffect_D } = React;

window.CompanyDetail = function CompanyDetail({ company, onClose }) {
  const [status, setStatus] = useState_D(company.status);
  const [note, setNote] = useState_D(company.note);

  useEffect_D(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const statusOpts = ["none", "saved", "applied", "interviewing", "rejected"];

  const openings = [
    { title: "Senior Distributed Systems Engineer", loc: "Remote · Global", comp: "$240–$290k", tags: ["rust", "consensus"] },
    { title: "Staff Storage Engineer", loc: "Remote · US/EU", comp: "$260–$320k", tags: ["rust", "storage"] },
    { title: "Platform Engineer · Observability", loc: "Remote · Global", comp: "$200–$260k", tags: ["rust", "tracing"] }
  ];

  const timeline = [
    { d: "Today", t: "Updated status", s: "moved from Saved → Applied", c: "var(--accent)" },
    { d: "2d ago", t: "Submitted application", s: "via referral · Jonas", c: "var(--accent)" },
    { d: "1w ago", t: "Saved company", s: "matched filter: Rust + Series A", c: "var(--rust)" },
    { d: "3w ago", t: "First seen", s: "added to your tracked discoveries", c: "var(--fg-3)" }
  ];

  return (
    <div style={{
      position:"fixed", inset: 0, zIndex: 50,
      display:"flex", justifyContent:"flex-end"
    }}>
      {/* scrim */}
      <div onClick={onClose} style={{
        position:"absolute", inset: 0,
        background: "oklch(0 0 0 / 0.4)",
        backdropFilter:"blur(4px)",
        animation:"fadeIn 200ms ease"
      }}/>

      <aside style={{
        position:"relative", width: "min(640px, 90vw)", height:"100%",
        background:"var(--bg-1)", borderLeft:"1px solid var(--line)",
        display:"flex", flexDirection:"column",
        boxShadow:"-30px 0 60px -20px oklch(0 0 0 / 0.5)",
        animation:"slideInR 260ms cubic-bezier(0.2, 0.7, 0.3, 1)"
      }}>
        {/* Header */}
        <div style={{
          padding: "18px 22px 16px", borderBottom:"1px solid var(--line-soft)",
          display:"flex", flexDirection:"column", gap: 14
        }}>
          <div style={{display:"flex", alignItems:"center", gap: 10}}>
            <div style={{display:"flex", alignItems:"center", gap: 5,
              fontFamily:"var(--font-mono)", fontSize: 11, color:"var(--fg-3)"}}>
              <Icon name="grid" size={11}/>
              Companies / {company.category}
            </div>
            <div style={{flex:1}}/>
            <button style={{
              all:"unset", cursor:"pointer", padding: 5, borderRadius: 5,
              color:"var(--fg-2)"
            }}><Icon name="external" size={14}/></button>
            <button onClick={onClose} style={{
              all:"unset", cursor:"pointer", padding: 5, borderRadius: 5,
              color:"var(--fg-2)"
            }}><Icon name="x" size={14}/></button>
          </div>

          <div style={{display:"flex", gap: 14, alignItems:"flex-start"}}>
            <div style={{
              width: 56, height: 56, borderRadius: 12, flexShrink: 0,
              background: `linear-gradient(135deg, ${company.color} 0%, color-mix(in oklch, ${company.color}, transparent 55%) 100%)`,
              display:"flex", alignItems:"center", justifyContent:"center",
              fontFamily:"var(--font-mono)", fontWeight: 600, fontSize: 19,
              color:"oklch(0.99 0 0)",
              boxShadow:"0 1px 0 oklch(1 0 0 / 0.18) inset, 0 6px 16px -6px oklch(0 0 0 / 0.4)"
            }}>{company.initials}</div>
            <div style={{flex:1}}>
              <div style={{display:"flex", alignItems:"center", gap: 10}}>
                <h2 style={{margin:0, fontSize: 22, fontWeight: 600, color:"var(--fg-0)",
                  letterSpacing:"-0.015em"}}>{company.name}</h2>
                <span style={{display:"inline-flex", alignItems:"center", gap: 5,
                  fontFamily:"var(--font-mono)", fontSize: 11, color:"var(--ok)"}}>
                  <HiringPulse state={company.hiring}/>
                  {window.HIRING_META[company.hiring].label}
                </span>
              </div>
              <div style={{
                fontSize: 13, color:"var(--fg-2)", marginTop: 4,
                display:"flex", alignItems:"center", gap: 10, flexWrap:"wrap",
                fontFamily:"var(--font-mono)"
              }}>
                <span>{company.domain}</span>
                <span style={{opacity:0.4}}>·</span>
                <span>{company.funding}</span>
                <span style={{opacity:0.4}}>·</span>
                <span>{company.size} people</span>
                <span style={{opacity:0.4}}>·</span>
                <span>{company.location}</span>
              </div>
            </div>
          </div>

          <p style={{
            margin: 0, fontSize: 14, color:"var(--fg-1)", lineHeight: 1.5, textWrap:"pretty"
          }}>{company.desc}</p>

          {/* Status switcher */}
          <div style={{display:"flex", gap: 6, alignItems:"center"}}>
            <span style={{fontFamily:"var(--font-mono)", fontSize: 10.5,
              color:"var(--fg-3)", textTransform:"uppercase", letterSpacing:"0.06em", marginRight: 4}}>
              Track
            </span>
            {statusOpts.map(s => {
              const meta = window.STATUS_META[s];
              const sel = status === s;
              return (
                <button key={s} onClick={()=>setStatus(s)} style={{
                  all:"unset", cursor:"pointer",
                  display:"inline-flex", alignItems:"center", gap: 5,
                  padding: "4px 9px", borderRadius: 5,
                  fontSize: 11.5, fontFamily:"var(--font-mono)",
                  background: sel ? meta.bg : "var(--bg-2)",
                  color: sel ? meta.color : "var(--fg-2)",
                  border: `1px solid ${sel ? `color-mix(in oklch, ${meta.color}, transparent 60%)` : "var(--line-soft)"}`,
                  transition: "all 120ms"
                }}>
                  {s !== "none" && <StatusDot status={s} size={6}/>}
                  {meta.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div className="scroll" style={{
          flex: 1, overflow:"auto", padding: "20px 22px 32px",
          display:"flex", flexDirection:"column", gap: 24
        }}>
          {/* Stat row */}
          <div style={{
            display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap: 12
          }}>
            {[
              { l: "Open roles", v: company.openings, sub: "actively hiring", c: "var(--fg-0)" },
              { l: "Compensation", v: company.comp.split(" +")[0], sub: company.comp.split(" + ")[1] || "—", c: "var(--rust)" },
              { l: "Last activity", v: company.lastActivity, sub: company.followup ? "follow-up due" : "no action", c: company.followup ? "var(--warn)" : "var(--fg-0)" }
            ].map((s, i) => (
              <div key={i} style={{
                padding: 12, borderRadius: 8,
                background:"var(--bg-2)", border:"1px solid var(--line-soft)"
              }}>
                <div style={{fontFamily:"var(--font-mono)", fontSize: 10.5, color:"var(--fg-3)",
                  textTransform:"uppercase", letterSpacing:"0.06em"}}>{s.l}</div>
                <div style={{fontSize: 17, fontWeight: 600, color: s.c, marginTop: 4,
                  fontVariantNumeric:"tabular-nums"}}>{s.v}</div>
                <div style={{fontSize: 11.5, color:"var(--fg-3)", marginTop: 2}}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Tags */}
          <div style={{display:"flex", flexWrap:"wrap", gap: 5}}>
            {company.tags.map(t => <TagPill key={t}>{t}</TagPill>)}
          </div>

          {/* Open roles */}
          <Section title="Open roles" count={openings.length}>
            <div style={{display:"flex", flexDirection:"column", gap: 6}}>
              {openings.map((r,i) => (
                <div key={i} style={{
                  display:"flex", alignItems:"center", gap: 12,
                  padding: "11px 12px", borderRadius: 8,
                  background:"var(--bg-2)", border:"1px solid var(--line-soft)",
                  cursor:"pointer", transition:"background 120ms"
                }}
                onMouseEnter={e=>e.currentTarget.style.background = "var(--bg-3)"}
                onMouseLeave={e=>e.currentTarget.style.background = "var(--bg-2)"}>
                  <div style={{flex:1, minWidth:0}}>
                    <div style={{fontSize: 13.5, fontWeight: 500, color:"var(--fg-0)"}}>{r.title}</div>
                    <div style={{
                      fontSize: 11.5, color:"var(--fg-3)", fontFamily:"var(--font-mono)",
                      marginTop: 2, display:"flex", gap: 8
                    }}>
                      <span>{r.loc}</span>
                      <span style={{opacity:0.4}}>·</span>
                      <span>{r.comp}</span>
                    </div>
                  </div>
                  <div style={{display:"flex", gap: 4}}>
                    {r.tags.map(t => <TagPill key={t}>{t}</TagPill>)}
                  </div>
                  <Icon name="arrow" size={13} style={{color:"var(--fg-3)"}}/>
                </div>
              ))}
            </div>
          </Section>

          {/* Notes */}
          <Section title="My notes">
            <div style={{
              background:"var(--bg-2)", border:"1px solid var(--line-soft)",
              borderRadius: 8, padding: "10px 12px"
            }}>
              <textarea
                value={note}
                onChange={e=>setNote(e.target.value)}
                placeholder="What's the next step? Who do you know there?"
                style={{
                  all:"unset", width:"100%", minHeight: 56,
                  fontSize: 13, color:"var(--fg-0)", lineHeight: 1.5,
                  fontFamily:"var(--font-sans)", resize:"vertical"
                }}
              />
              <div style={{
                display:"flex", justifyContent:"space-between", alignItems:"center",
                marginTop: 6, paddingTop: 6, borderTop:"1px dashed var(--line-soft)",
                fontSize: 11, color:"var(--fg-3)", fontFamily:"var(--font-mono)"
              }}>
                <span>autosaved · 2 seconds ago</span>
                <span>{note.length} chars</span>
              </div>
            </div>
          </Section>

          {/* Activity */}
          <Section title="Activity">
            <div style={{display:"flex", flexDirection:"column", gap: 0, position:"relative"}}>
              <div style={{
                position:"absolute", left: 7, top: 8, bottom: 12, width: 1,
                background: "var(--line-soft)"
              }}/>
              {timeline.map((t, i) => (
                <div key={i} style={{
                  display:"flex", alignItems:"flex-start", gap: 14,
                  padding: "8px 0", position:"relative"
                }}>
                  <span style={{
                    width: 15, height: 15, borderRadius: 999,
                    background: "var(--bg-1)",
                    border: `2px solid ${t.c}`,
                    flexShrink: 0, marginTop: 2, zIndex: 1
                  }}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize: 13, color:"var(--fg-0)", fontWeight: 500}}>{t.t}</div>
                    <div style={{fontSize: 12, color:"var(--fg-2)", marginTop: 1}}>{t.s}</div>
                  </div>
                  <div style={{fontSize: 11.5, fontFamily:"var(--font-mono)", color:"var(--fg-3)"}}>{t.d}</div>
                </div>
              ))}
            </div>
          </Section>
        </div>

        {/* Footer */}
        <div style={{
          padding: "12px 22px", borderTop:"1px solid var(--line-soft)",
          background:"var(--bg-1)",
          display:"flex", gap: 8, alignItems:"center"
        }}>
          <button style={{
            all:"unset", cursor:"pointer",
            display:"inline-flex", alignItems:"center", gap: 6,
            height: 32, padding: "0 12px", borderRadius: 7,
            fontSize: 12.5, color:"var(--fg-1)",
            border:"1px solid var(--line)"
          }}>
            <Icon name="bell" size={13} style={{color:"var(--fg-3)"}}/>
            Remind me
          </button>
          <button style={{
            all:"unset", cursor:"pointer",
            display:"inline-flex", alignItems:"center", gap: 6,
            height: 32, padding: "0 12px", borderRadius: 7,
            fontSize: 12.5, color:"var(--fg-1)",
            border:"1px solid var(--line)"
          }}>
            <Icon name="archive" size={13} style={{color:"var(--fg-3)"}}/>
            Archive
          </button>
          <div style={{flex:1}}/>
          <button style={{
            all:"unset", cursor:"pointer",
            display:"inline-flex", alignItems:"center", gap: 6,
            height: 32, padding: "0 14px", borderRadius: 7,
            fontSize: 13, fontWeight: 500, color:"oklch(0.99 0 0)",
            background: "var(--accent)",
            boxShadow:"0 1px 0 oklch(1 0 0 / 0.18) inset"
          }}>
            View career page <Icon name="external" size={12}/>
          </button>
        </div>
      </aside>
    </div>
  );
};

function Section({ title, count, children }) {
  return (
    <div>
      <div style={{display:"flex", alignItems:"center", gap: 7, marginBottom: 10}}>
        <h3 style={{margin:0, fontSize: 12, fontFamily:"var(--font-mono)",
          color:"var(--fg-3)", letterSpacing:"0.06em", textTransform:"uppercase"}}>
          {title}
        </h3>
        {count != null && (
          <span style={{
            fontFamily:"var(--font-mono)", fontSize: 10.5,
            padding: "1px 6px", borderRadius: 4,
            background:"var(--bg-2)", color:"var(--fg-3)",
            border:"1px solid var(--line-soft)"
          }}>{count}</span>
        )}
      </div>
      {children}
    </div>
  );
}
