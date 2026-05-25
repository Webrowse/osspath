// ====== Companies Explorer ======
const { useState, useMemo, useEffect, useRef } = React;

function StatusDot({ status, size = 8 }) {
  const meta = window.STATUS_META[status] || window.STATUS_META.none;
  return (
    <span style={{
      display: "inline-block", width: size, height: size, borderRadius: 999,
      background: meta.color, flexShrink: 0,
      boxShadow: status === "interviewing" ? `0 0 0 3px ${meta.bg}` : "none"
    }}/>
  );
}

function HiringPulse({ state }) {
  const colorMap = {
    "actively-hiring": "var(--ok)",
    "selective": "var(--warn)",
    "no-openings": "var(--fg-3)"
  };
  const c = colorMap[state];
  return (
    <span style={{position:"relative", display:"inline-flex", width: 8, height: 8}}>
      <span style={{position:"absolute", inset:0, borderRadius:999, background: c, opacity: 0.9}}/>
      {state === "actively-hiring" && (
        <span style={{
          position:"absolute", inset:-3, borderRadius:999, border:`1.5px solid ${c}`,
          opacity: 0.5, animation:"pulse 2s ease-out infinite"
        }}/>
      )}
    </span>
  );
}

function CompanyLogo({ c, size = 36 }) {
  const initialsSize = size >= 44 ? 15 : size >= 36 ? 13 : 11;
  return (
    <div style={{
      width: size, height: size, borderRadius: 9, flexShrink: 0,
      background: `linear-gradient(135deg, ${c.color} 0%, color-mix(in oklch, ${c.color}, transparent 55%) 100%)`,
      display:"flex", alignItems:"center", justifyContent:"center",
      fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: initialsSize,
      color: "oklch(0.99 0 0)", letterSpacing: "0.02em",
      boxShadow: "0 1px 0 oklch(1 0 0 / 0.15) inset, 0 1px 8px -2px oklch(0 0 0 / 0.4)"
    }}>
      {c.initials}
    </div>
  );
}

function TagPill({ children, kind = "default" }) {
  return (
    <span style={{
      display:"inline-flex", alignItems:"center", gap: 4,
      padding: "2px 7px", borderRadius: 5,
      fontFamily: "var(--font-mono)", fontSize: 11,
      background: "var(--bg-3)", color: "var(--fg-2)",
      border: "1px solid var(--line-soft)",
      whiteSpace: "nowrap"
    }}>{children}</span>
  );
}

function StatusBadge({ status, compact }) {
  if (status === "none") return null;
  const meta = window.STATUS_META[status];
  return (
    <span style={{
      display:"inline-flex", alignItems:"center", gap:5,
      padding: compact ? "1px 6px" : "2px 8px",
      borderRadius: 5, fontSize: 11,
      fontFamily: "var(--font-mono)", letterSpacing:"0.01em",
      background: meta.bg, color: meta.color,
      border: `1px solid color-mix(in oklch, ${meta.color}, transparent 70%)`
    }}>
      <StatusDot status={status} size={6}/>
      {meta.label}
    </span>
  );
}

// === Sidebar ===
function Sidebar({ active, setActive, filters, toggleFilter, clearFilters, counts }) {
  const navItems = [
    { id: "explorer", icon: "grid", label: "Companies", count: 25 },
    { id: "tracking", icon: "target", label: "Tracking", count: counts.tracked },
    { id: "inbox", icon: "inbox", label: "Inbox", count: 3 },
    { id: "saved", icon: "bookmark", label: "Saved", count: counts.saved },
    { id: "queues", icon: "layers", label: "Smart queues", soon: true },
    { id: "activity", icon: "pulse", label: "Activity" }
  ];

  return (
    <aside style={{
      width: 248, borderRight: "1px solid var(--line-soft)",
      background: "var(--bg-1)", display:"flex", flexDirection:"column",
      flexShrink: 0
    }} className="scroll">
      {/* Brand */}
      <div style={{
        padding: "16px 16px 12px", display:"flex", alignItems:"center", gap: 10,
        borderBottom: "1px solid var(--line-soft)"
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: "linear-gradient(135deg, var(--rust) 0%, var(--accent) 100%)",
          display:"flex", alignItems:"center", justifyContent:"center",
          color: "white", fontWeight: 700, fontSize: 13,
          fontFamily: "var(--font-mono)"
        }}>j.</div>
        <div style={{display:"flex", flexDirection:"column", lineHeight:1.1}}>
          <div style={{fontWeight: 600, color: "var(--fg-0)", fontSize: 13.5}}>jobs.adarshrust</div>
          <div style={{fontSize: 11, color: "var(--fg-3)", fontFamily:"var(--font-mono)"}}>v0.4 · workspace</div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{padding: "10px 8px", display:"flex", flexDirection:"column", gap: 1}}>
        {navItems.map(item => (
          <button key={item.id}
            onClick={()=>setActive(item.id)}
            style={{
              all:"unset", cursor: item.soon ? "default" : "pointer",
              display:"flex", alignItems:"center", gap: 10,
              padding: "7px 10px", borderRadius: 7,
              fontSize: 13, color: active === item.id ? "var(--fg-0)" : "var(--fg-1)",
              background: active === item.id ? "var(--bg-3)" : "transparent",
              opacity: item.soon ? 0.45 : 1,
              transition: "background 120ms"
            }}
            onMouseEnter={e=>{ if (active !== item.id && !item.soon) e.currentTarget.style.background = "var(--bg-2)"; }}
            onMouseLeave={e=>{ if (active !== item.id) e.currentTarget.style.background = "transparent"; }}
          >
            <Icon name={item.icon} size={15}/>
            <span style={{flex:1}}>{item.label}</span>
            {item.soon && <span style={{
              fontFamily:"var(--font-mono)", fontSize: 9.5,
              padding: "1px 5px", border:"1px solid var(--line)",
              borderRadius: 4, color: "var(--fg-3)"
            }}>SOON</span>}
            {!item.soon && item.count != null && (
              <span style={{
                fontFamily:"var(--font-mono)", fontSize: 11, color: "var(--fg-3)"
              }}>{item.count}</span>
            )}
          </button>
        ))}
      </nav>

      <div style={{height: 1, background: "var(--line-soft)", margin: "8px 12px"}}/>

      {/* Filters */}
      <div style={{padding:"4px 12px 8px", display:"flex", justifyContent:"space-between", alignItems:"center"}}>
        <span style={{
          fontSize: 11, fontFamily:"var(--font-mono)", letterSpacing:"0.06em",
          color:"var(--fg-3)", textTransform: "uppercase"
        }}>Filters</span>
        {Object.values(filters).some(s => s.size > 0) && (
          <button onClick={clearFilters} style={{
            all:"unset", cursor:"pointer", fontSize: 11, color:"var(--fg-2)",
            fontFamily:"var(--font-mono)"
          }}>clear</button>
        )}
      </div>

      <div style={{padding:"0 8px 24px", display:"flex", flexDirection:"column", gap: 14, overflow:"auto"}} className="scroll">
        {window.FILTER_GROUPS.map(group => (
          <FilterGroup key={group.id} group={group} selected={filters[group.id]} toggle={(opt)=>toggleFilter(group.id, opt)}/>
        ))}
      </div>

      {/* Footer */}
      <div style={{
        marginTop:"auto", padding: "10px 12px",
        borderTop: "1px solid var(--line-soft)",
        display:"flex", alignItems:"center", gap: 10
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: 7,
          background: "var(--bg-3)", border:"1px solid var(--line)",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontFamily:"var(--font-mono)", fontSize: 11, color:"var(--fg-1)"
        }}>AR</div>
        <div style={{flex:1, minWidth:0}}>
          <div style={{fontSize: 12.5, color:"var(--fg-0)", fontWeight: 500}}>Adarsh R.</div>
          <div style={{fontSize: 11, color:"var(--fg-3)", fontFamily:"var(--font-mono)"}}>backend · remote</div>
        </div>
        <Icon name="settings" size={14}/>
      </div>
    </aside>
  );
}

function FilterGroup({ group, selected, toggle }) {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <button onClick={()=>setOpen(!open)} style={{
        all:"unset", cursor:"pointer", width:"100%",
        padding: "4px 4px", display:"flex", alignItems:"center", gap: 6,
        fontSize: 12, color:"var(--fg-1)", fontWeight: 500
      }}>
        <Icon name="chevronDown" size={12} style={{ transform: open ? "none" : "rotate(-90deg)", transition: "transform 120ms", opacity: 0.6 }}/>
        {group.title}
      </button>
      {open && (
        <div style={{display:"flex", flexDirection:"column", gap: 1, marginTop: 4}}>
          {group.options.map(opt => {
            const isSel = selected.has(opt.id);
            const colorVar = opt.color ? `var(--${opt.color})` : "var(--fg-2)";
            return (
              <button key={opt.id} onClick={()=>toggle(opt.id)} style={{
                all:"unset", cursor:"pointer",
                display:"flex", alignItems:"center", gap: 8,
                padding: "5px 8px", borderRadius: 5,
                fontSize: 12.5,
                color: isSel ? "var(--fg-0)" : "var(--fg-1)",
                background: isSel ? "var(--bg-3)" : "transparent",
                transition: "background 100ms"
              }}
              onMouseEnter={e=>{ if (!isSel) e.currentTarget.style.background = "var(--bg-2)"; }}
              onMouseLeave={e=>{ if (!isSel) e.currentTarget.style.background = "transparent"; }}
              >
                <span style={{
                  width: 13, height: 13, borderRadius: 4,
                  border: `1.5px solid ${isSel ? "var(--accent)" : "var(--line)"}`,
                  background: isSel ? "var(--accent)" : "transparent",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  transition: "all 120ms"
                }}>
                  {isSel && <Icon name="check" size={10} stroke={2.5} style={{color: "oklch(0.99 0 0)"}}/>}
                </span>
                {opt.color && (
                  <span style={{width: 6, height:6, borderRadius:999, background: colorVar, flexShrink:0}}/>
                )}
                <span style={{flex:1}}>{opt.label}</span>
                {opt.count != null && (
                  <span style={{fontFamily:"var(--font-mono)", fontSize: 10.5, color:"var(--fg-3)"}}>{opt.count}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// === Top bar ===
function TopBar({ query, setQuery, view, setView, density, setDensity, sort, setSort, onOpenCmd }) {
  return (
    <div style={{
      height: 52, borderBottom: "1px solid var(--line-soft)",
      background: "var(--bg-1)", display:"flex", alignItems:"center",
      padding: "0 16px", gap: 12, flexShrink: 0
    }}>
      <div style={{
        flex: 1, maxWidth: 560,
        display:"flex", alignItems:"center", gap: 8,
        height: 32, padding: "0 10px", borderRadius: 7,
        background: "var(--bg-2)", border: "1px solid var(--line-soft)",
        transition: "border 120ms"
      }}>
        <Icon name="search" size={14} style={{color:"var(--fg-3)"}}/>
        <input
          value={query}
          onChange={e=>setQuery(e.target.value)}
          placeholder="Search companies, tags, locations…"
          style={{
            all: "unset", flex: 1, fontSize: 13, color:"var(--fg-0)",
            fontFamily: "var(--font-sans)"
          }}
        />
        <button onClick={onOpenCmd} style={{
          all:"unset", cursor:"pointer", display:"flex", alignItems:"center", gap: 3,
          fontFamily:"var(--font-mono)", fontSize: 10.5, color:"var(--fg-3)",
          padding: "2px 5px", border:"1px solid var(--line)", borderRadius: 4
        }}>⌘K</button>
      </div>

      <div style={{flex:1}}/>

      {/* Sort */}
      <button style={{
        all:"unset", cursor:"pointer",
        display:"flex", alignItems:"center", gap: 6,
        height: 30, padding: "0 10px", borderRadius: 6,
        fontSize: 12.5, color:"var(--fg-1)",
        border:"1px solid var(--line-soft)"
      }}>
        <Icon name="sliders" size={13} style={{color:"var(--fg-3)"}}/>
        Sort: {sort}
        <Icon name="chevronDown" size={11} style={{color:"var(--fg-3)"}}/>
      </button>

      {/* Density */}
      <div style={{
        display:"flex", height: 30, border:"1px solid var(--line-soft)",
        borderRadius: 6, padding: 2, gap: 1
      }}>
        {["comfortable","compact"].map(d => (
          <button key={d} onClick={()=>setDensity(d)} style={{
            all:"unset", cursor:"pointer",
            padding: "0 9px", borderRadius: 4,
            fontSize: 11.5, fontFamily:"var(--font-mono)",
            color: density === d ? "var(--fg-0)" : "var(--fg-3)",
            background: density === d ? "var(--bg-3)" : "transparent"
          }}>{d === "compact" ? "compact" : "comfy"}</button>
        ))}
      </div>

      {/* View toggle */}
      <div style={{
        display:"flex", height: 30, border:"1px solid var(--line-soft)",
        borderRadius: 6, padding: 2, gap: 1
      }}>
        {[{id:"grid", icon:"grid"},{id:"list", icon:"list"},{id:"table", icon:"table"}].map(v => (
          <button key={v.id} onClick={()=>setView(v.id)} style={{
            all:"unset", cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center",
            width: 26, borderRadius: 4,
            color: view === v.id ? "var(--fg-0)" : "var(--fg-3)",
            background: view === v.id ? "var(--bg-3)" : "transparent"
          }}>
            <Icon name={v.icon} size={13}/>
          </button>
        ))}
      </div>
    </div>
  );
}

// === Active filter chips ===
function ActiveFilters({ filters, toggleFilter, clearFilters, resultCount }) {
  const active = [];
  Object.entries(filters).forEach(([groupId, set]) => {
    const group = window.FILTER_GROUPS.find(g => g.id === groupId);
    set.forEach(opt => {
      const o = group?.options.find(x => x.id === opt);
      active.push({ groupId, opt, label: o?.label || opt, color: o?.color });
    });
  });

  if (active.length === 0) {
    return (
      <div style={{display:"flex", alignItems:"center", gap: 10, fontSize: 12.5, color: "var(--fg-3)", flexShrink: 0}}>
        <span style={{fontFamily:"var(--font-mono)", color:"var(--fg-2)"}}>{resultCount}</span>
        <span>companies · no filters applied</span>
      </div>
    );
  }

  return (
    <div style={{display:"flex", alignItems:"center", gap: 6, flexWrap:"wrap", flexShrink: 0}}>
      <span style={{fontFamily:"var(--font-mono)", fontSize: 12.5, color:"var(--fg-1)"}}>
        {resultCount}
      </span>
      <span style={{fontSize: 12.5, color: "var(--fg-3)", marginRight: 4}}>
        results matching
      </span>
      {active.map(a => (
        <button key={a.groupId+a.opt} onClick={()=>toggleFilter(a.groupId, a.opt)} style={{
          all:"unset", cursor:"pointer",
          display:"flex", alignItems:"center", gap: 5,
          padding: "2px 4px 2px 8px", borderRadius: 5,
          fontSize: 11.5, fontFamily:"var(--font-mono)",
          background: "var(--bg-2)", border: "1px solid var(--line-soft)",
          color: "var(--fg-1)"
        }}>
          {a.color && <span style={{width:5,height:5,borderRadius:999, background:`var(--${a.color})`}}/>}
          {a.label}
          <span style={{
            display:"inline-flex", padding:2, borderRadius: 3, color:"var(--fg-3)",
            marginLeft: 2
          }}><Icon name="x" size={10}/></span>
        </button>
      ))}
      <button onClick={clearFilters} style={{
        all:"unset", cursor:"pointer",
        fontSize: 11.5, color:"var(--fg-2)", marginLeft: 4,
        fontFamily:"var(--font-mono)"
      }}>clear all</button>
    </div>
  );
}

// === Company card (grid view) ===
function CompanyCard({ c, onClick, onAction }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={()=>setHovered(true)}
      onMouseLeave={()=>setHovered(false)}
      onClick={onClick}
      style={{
        position:"relative",
        background: "var(--bg-1)",
        border: "1px solid var(--line-soft)",
        borderRadius: "var(--r)",
        padding: "var(--pad-card)",
        cursor: "pointer",
        transition: "transform 140ms, border-color 140ms, background 140ms",
        transform: hovered ? "translateY(-1px)" : "none",
        borderColor: hovered ? "var(--line)" : "var(--line-soft)",
        background: hovered ? "var(--bg-2)" : "var(--bg-1)",
        display:"flex", flexDirection:"column", gap: "var(--gap-card)"
      }}
    >
      {/* status accent stripe */}
      {c.status !== "none" && (
        <div style={{
          position:"absolute", left:0, top: 10, bottom: 10, width: 2,
          background: window.STATUS_META[c.status].color, borderRadius: "0 2px 2px 0",
          opacity: 0.8
        }}/>
      )}

      {/* Header row */}
      <div style={{display:"flex", alignItems:"flex-start", gap: 12}}>
        <CompanyLogo c={c} size={40}/>
        <div style={{flex:1, minWidth: 0}}>
          <div style={{display:"flex", alignItems:"center", gap: 8, marginBottom: 2}}>
            <div style={{fontSize: "var(--fs-card-name)", fontWeight: 600, color:"var(--fg-0)", letterSpacing:"-0.005em"}}>
              {c.name}
            </div>
            <StatusBadge status={c.status}/>
          </div>
          <div style={{
            fontSize: 11.5, color:"var(--fg-3)", fontFamily:"var(--font-mono)",
            display:"flex", alignItems:"center", gap: 8
          }}>
            <span>{c.domain}</span>
            <span style={{opacity:0.4}}>·</span>
            <span>{c.funding}</span>
            <span style={{opacity:0.4}}>·</span>
            <span>{c.size} ppl</span>
          </div>
        </div>
        <button onClick={(e)=>{ e.stopPropagation(); onAction("save", c); }} style={{
          all:"unset", cursor:"pointer", padding: 4, borderRadius: 5,
          color: c.status === "saved" ? "var(--rust)" : "var(--fg-3)",
          opacity: hovered || c.status === "saved" ? 1 : 0,
          transition: "opacity 120ms, color 120ms"
        }}>
          <Icon name="bookmark" size={14}/>
        </button>
      </div>

      {/* Description */}
      <div style={{
        fontSize: "var(--fs-card-desc)", color:"var(--fg-1)", lineHeight: 1.45,
        textWrap: "pretty"
      }}>{c.desc}</div>

      {/* Tags */}
      <div style={{display:"flex", gap: 5, flexWrap:"wrap"}}>
        {c.tags.map(t => <TagPill key={t}>{t}</TagPill>)}
      </div>

      {/* Footer row */}
      <div style={{
        display:"flex", alignItems:"center", gap: 10,
        paddingTop: 10, borderTop: "1px dashed var(--line-soft)",
        fontFamily:"var(--font-mono)", fontSize: 11, color: "var(--fg-2)"
      }}>
        <span style={{display:"inline-flex", alignItems:"center", gap: 5}}>
          <HiringPulse state={c.hiring}/>
          {c.openings > 0 ? `${c.openings} open` : "no openings"}
        </span>
        <span style={{opacity:0.4}}>·</span>
        <span style={{display:"inline-flex", alignItems:"center", gap: 5}}>
          <Icon name="map" size={11} style={{color:"var(--fg-3)"}}/>
          {c.location.replace("Remote (","").replace(")","")}
        </span>
        <div style={{flex:1}}/>
        <span style={{color:"var(--fg-3)"}}>{c.lastActivity}</span>
      </div>
    </div>
  );
}

// === List row ===
function CompanyRow({ c, onClick, onAction }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={()=>setHovered(true)}
      onMouseLeave={()=>setHovered(false)}
      onClick={onClick}
      style={{
        display:"flex", alignItems:"center", gap: 14,
        padding: "0 14px",
        height: "var(--row-h)",
        background: hovered ? "var(--bg-2)" : "transparent",
        borderBottom: "1px solid var(--line-soft)",
        cursor: "pointer", position:"relative"
      }}
    >
      {c.status !== "none" && (
        <div style={{
          position:"absolute", left:0, top:6, bottom:6, width:2,
          background: window.STATUS_META[c.status].color, opacity: 0.7
        }}/>
      )}
      <CompanyLogo c={c} size={28}/>
      <div style={{display:"flex", flexDirection:"column", flexShrink:0, width: 180}}>
        <div style={{fontSize: 13.5, fontWeight: 600, color:"var(--fg-0)"}}>{c.name}</div>
        <div style={{fontSize: 11, color:"var(--fg-3)", fontFamily:"var(--font-mono)"}}>{c.domain}</div>
      </div>
      <div style={{
        flex:1, fontSize: 12.5, color:"var(--fg-1)",
        overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"
      }}>{c.desc}</div>

      <div style={{display:"flex", gap: 4, flexShrink:0}}>
        {c.tags.slice(0,2).map(t => <TagPill key={t}>{t}</TagPill>)}
      </div>

      <div style={{
        width: 110, fontSize: 11.5, color:"var(--fg-2)",
        display:"flex", alignItems:"center", gap: 6, flexShrink:0,
        fontFamily:"var(--font-mono)"
      }}>
        <HiringPulse state={c.hiring}/>
        {c.openings > 0 ? `${c.openings} open` : "—"}
      </div>

      <div style={{width: 110, flexShrink:0}}>
        <StatusBadge status={c.status}/>
      </div>

      <div style={{
        width: 36, fontFamily:"var(--font-mono)", fontSize: 11,
        color:"var(--fg-3)", textAlign:"right", flexShrink:0
      }}>{c.lastActivity}</div>
    </div>
  );
}

// === Stat header ===
function StatStrip({ counts }) {
  const items = [
    { label: "Tracked", value: counts.tracked, sub: "across pipeline", color: "var(--fg-0)" },
    { label: "Interviewing", value: counts.interviewing, sub: "active conversations", color: "var(--rust)" },
    { label: "Follow-up due", value: counts.followup, sub: "this week", color: "var(--warn)" },
    { label: "New openings", value: counts.newOpenings, sub: "since last visit", color: "var(--ok)" }
  ];
  return (
    <div style={{display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap: 1,
      background: "var(--line-soft)", border:"1px solid var(--line-soft)",
      borderRadius: "var(--r)", overflow:"hidden", flexShrink: 0}}>
      {items.map(it => (
        <div key={it.label} style={{padding: "12px 14px", background: "var(--bg-1)"}}>
          <div style={{fontSize: 11, fontFamily:"var(--font-mono)", color:"var(--fg-3)",
            textTransform:"uppercase", letterSpacing:"0.06em"}}>{it.label}</div>
          <div style={{display:"flex", alignItems:"baseline", gap: 6, marginTop: 4}}>
            <span style={{fontSize: 24, fontWeight: 600, color: it.color, fontVariantNumeric:"tabular-nums"}}>{it.value}</span>
            <span style={{fontSize: 11.5, color:"var(--fg-3)"}}>{it.sub}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

window.Explorer = function Explorer({ onPickCompany, onOpenCmd, navActive, setNavActive }) {
  const [query, setQuery] = useState("");
  const [view, setView] = useState("grid");
  const [density, setDensity] = useState("comfortable");
  const [sort, setSort] = useState("Activity");
  const [filters, setFilters] = useState({
    status: new Set(), hiring: new Set(), category: new Set(), remote: new Set(), stage: new Set()
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-density", density);
  }, [density]);

  const toggleFilter = (group, opt) => {
    setFilters(prev => {
      const s = new Set(prev[group]);
      s.has(opt) ? s.delete(opt) : s.add(opt);
      return { ...prev, [group]: s };
    });
  };
  const clearFilters = () => setFilters({
    status: new Set(), hiring: new Set(), category: new Set(), remote: new Set(), stage: new Set()
  });

  const filtered = useMemo(() => {
    return window.COMPANIES.filter(c => {
      if (query) {
        const q = query.toLowerCase();
        if (!(c.name.toLowerCase().includes(q) ||
              c.desc.toLowerCase().includes(q) ||
              c.tags.some(t => t.toLowerCase().includes(q)) ||
              c.domain.toLowerCase().includes(q))) return false;
      }
      if (filters.status.size) {
        const matches = [...filters.status].some(s => {
          if (s === "followup") return c.followup;
          return c.status === s;
        });
        if (!matches) return false;
      }
      if (filters.hiring.size && !filters.hiring.has(c.hiring)) return false;
      if (filters.category.size && !filters.category.has(c.category)) return false;
      if (filters.remote.size) {
        const matches = [...filters.remote].some(r => c.location.includes(r));
        if (!matches) return false;
      }
      if (filters.stage.size && !filters.stage.has(c.funding)) return false;
      return true;
    });
  }, [query, filters]);

  const counts = {
    tracked: window.COMPANIES.filter(c => c.status === "applied" || c.status === "interviewing").length,
    saved: window.COMPANIES.filter(c => c.status === "saved").length,
    interviewing: window.COMPANIES.filter(c => c.status === "interviewing").length,
    followup: window.COMPANIES.filter(c => c.followup).length,
    newOpenings: 12
  };

  return (
    <div style={{display:"flex", height:"100%", background:"var(--bg-0)"}}>
      <Sidebar active={navActive} setActive={setNavActive}
        filters={filters} toggleFilter={toggleFilter} clearFilters={clearFilters}
        counts={counts}/>

      <main style={{flex: 1, display:"flex", flexDirection:"column", minWidth:0}}>
        <TopBar query={query} setQuery={setQuery}
          view={view} setView={setView}
          density={density} setDensity={setDensity}
          sort={sort} setSort={setSort}
          onOpenCmd={onOpenCmd}/>

        <div className="scroll" style={{
          flex: 1, padding: "20px 24px 32px", overflow:"auto",
          display:"flex", flexDirection:"column", gap: 18
        }}>
          {/* All direct children below set flexShrink:0 so the scrolling parent
              doesn't crush short fixed-content blocks like the stat strip. */}
          {/* Header */}
          <div style={{display:"flex", alignItems:"flex-end", justifyContent:"space-between", gap: 16, flexShrink: 0}}>
            <div>
              <div style={{display:"flex", alignItems:"center", gap: 10}}>
                <h1 style={{margin:0, fontSize: 22, fontWeight: 600, color:"var(--fg-0)",
                  letterSpacing:"-0.015em"}}>Companies</h1>
                <span style={{
                  fontFamily:"var(--font-mono)", fontSize: 11,
                  padding:"2px 7px", borderRadius: 5,
                  background:"var(--bg-2)", border:"1px solid var(--line-soft)",
                  color:"var(--fg-2)"
                }}>{window.COMPANIES.length}</span>
              </div>
              <div style={{marginTop: 4, fontSize: 13, color:"var(--fg-2)"}}>
                Discover, track and follow up on Rust-ecosystem opportunities.
              </div>
            </div>
            <div style={{display:"flex", gap: 8}}>
              <button style={{
                all:"unset", cursor:"pointer",
                display:"inline-flex", alignItems:"center", gap: 6,
                height: 30, padding: "0 11px", borderRadius: 6,
                fontSize: 12.5, color:"var(--fg-1)",
                border:"1px solid var(--line-soft)"
              }}>
                <Icon name="refresh" size={13} style={{color:"var(--fg-3)"}}/> Re-sync
              </button>
              <button style={{
                all:"unset", cursor:"pointer",
                display:"inline-flex", alignItems:"center", gap: 6,
                height: 30, padding: "0 11px", borderRadius: 6,
                fontSize: 12.5, color:"oklch(0.99 0 0)", fontWeight: 500,
                background: "var(--accent)",
                boxShadow: "0 1px 0 oklch(1 0 0 / 0.18) inset"
              }}>
                <Icon name="plus" size={13}/> Track company
              </button>
            </div>
          </div>

          {/* Stats */}
          <StatStrip counts={counts}/>

          {/* Active filters */}
          <ActiveFilters filters={filters} toggleFilter={toggleFilter} clearFilters={clearFilters} resultCount={filtered.length}/>

          {/* Results */}
          {filtered.length === 0 ? (
            <div style={{
              padding: "60px 20px", textAlign:"center", color:"var(--fg-3)",
              border:"1px dashed var(--line-soft)", borderRadius:"var(--r)"
            }}>
              <div style={{fontSize: 14, color:"var(--fg-1)", marginBottom: 6}}>No matches</div>
              <div style={{fontSize: 12.5}}>Try clearing some filters or refine your query.</div>
            </div>
          ) : view === "grid" ? (
            <div style={{
              display:"grid",
              gridTemplateColumns: density === "compact"
                ? "repeat(auto-fill, minmax(280px, 1fr))"
                : "repeat(auto-fill, minmax(340px, 1fr))",
              gap: density === "compact" ? 10 : 14
            }}>
              {filtered.map(c => (
                <CompanyCard key={c.id} c={c} onClick={()=>onPickCompany(c)} onAction={()=>{}}/>
              ))}
            </div>
          ) : view === "list" ? (
            <div style={{
              border:"1px solid var(--line-soft)", borderRadius:"var(--r)",
              background:"var(--bg-1)", overflow:"hidden"
            }}>
              {filtered.map(c => <CompanyRow key={c.id} c={c} onClick={()=>onPickCompany(c)}/>)}
            </div>
          ) : (
            <TableView companies={filtered} onPick={onPickCompany}/>
          )}
        </div>
      </main>
    </div>
  );
};

function TableView({ companies, onPick }) {
  const cols = ["Company", "Description", "Category", "Stage", "Comp", "Hiring", "Status", "Last"];
  return (
    <div style={{
      border:"1px solid var(--line-soft)", borderRadius:"var(--r)",
      background:"var(--bg-1)", overflow:"hidden"
    }}>
      <div style={{
        display:"grid",
        gridTemplateColumns: "220px 1fr 130px 100px 150px 110px 130px 60px",
        padding: "10px 14px", gap: 12,
        fontSize: 11, fontFamily:"var(--font-mono)", color:"var(--fg-3)",
        textTransform:"uppercase", letterSpacing:"0.06em",
        borderBottom: "1px solid var(--line-soft)",
        background: "var(--bg-2)"
      }}>
        {cols.map(c => <div key={c}>{c}</div>)}
      </div>
      {companies.map(c => (
        <div key={c.id} onClick={()=>onPick(c)} style={{
          display:"grid",
          gridTemplateColumns: "220px 1fr 130px 100px 150px 110px 130px 60px",
          gap: 12, padding: "10px 14px",
          borderBottom: "1px solid var(--line-soft)",
          fontSize: 12.5, alignItems:"center", cursor:"pointer"
        }}
        onMouseEnter={e=>e.currentTarget.style.background = "var(--bg-2)"}
        onMouseLeave={e=>e.currentTarget.style.background = "transparent"}>
          <div style={{display:"flex", alignItems:"center", gap: 10, minWidth:0}}>
            <CompanyLogo c={c} size={26}/>
            <div style={{minWidth:0}}>
              <div style={{fontWeight: 600, color:"var(--fg-0)"}}>{c.name}</div>
              <div style={{fontSize: 10.5, color:"var(--fg-3)", fontFamily:"var(--font-mono)"}}>{c.domain}</div>
            </div>
          </div>
          <div style={{overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", color:"var(--fg-1)"}}>{c.desc}</div>
          <div style={{color:"var(--fg-2)", fontSize: 12}}>{c.category}</div>
          <div style={{color:"var(--fg-2)", fontFamily:"var(--font-mono)", fontSize: 11.5}}>{c.funding}</div>
          <div style={{color:"var(--fg-2)", fontFamily:"var(--font-mono)", fontSize: 11}}>{c.comp.split(" +")[0]}</div>
          <div style={{display:"flex", alignItems:"center", gap: 6, fontSize: 11.5, fontFamily:"var(--font-mono)", color:"var(--fg-2)"}}>
            <HiringPulse state={c.hiring}/>{c.openings > 0 ? `${c.openings}` : "—"}
          </div>
          <div><StatusBadge status={c.status} compact/></div>
          <div style={{fontFamily:"var(--font-mono)", fontSize: 11, color:"var(--fg-3)", textAlign:"right"}}>{c.lastActivity}</div>
        </div>
      ))}
    </div>
  );
}
