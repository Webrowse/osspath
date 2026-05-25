// ====== Command Palette ======
const { useState: useState_K, useEffect: useEffect_K, useMemo: useMemo_K, useRef: useRef_K } = React;

window.CommandPalette = function CommandPalette({ open, onClose, onPickCompany, onNavigate }) {
  const [q, setQ] = useState_K("");
  const [idx, setIdx] = useState_K(0);
  const inputRef = useRef_K();

  useEffect_K(() => {
    if (open) {
      setQ(""); setIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const items = useMemo_K(() => {
    const ql = q.toLowerCase();
    const actions = [
      { id: "nav-explorer", kind: "action", label: "Go to Companies", icon: "grid", shortcut: "G C", run: () => onNavigate("explorer") },
      { id: "nav-tracking", kind: "action", label: "Go to Tracking", icon: "target", shortcut: "G T", run: () => onNavigate("tracking") },
      { id: "nav-inbox", kind: "action", label: "Open Inbox", icon: "inbox", shortcut: "G I", run: () => onNavigate("inbox") },
      { id: "nav-saved", kind: "action", label: "Saved companies", icon: "bookmark", shortcut: "G S", run: () => onNavigate("saved") },
      { id: "track", kind: "action", label: "Track a new company…", icon: "plus", shortcut: "T", run: () => {} },
      { id: "theme", kind: "action", label: "Switch theme", icon: "settings", shortcut: "⌘T", run: () => {} },
      { id: "view-grid", kind: "action", label: "View as grid", icon: "grid", run: () => {} },
      { id: "view-list", kind: "action", label: "View as list", icon: "list", run: () => {} },
      { id: "view-table", kind: "action", label: "View as table", icon: "table", run: () => {} }
    ];
    const companies = window.COMPANIES.map(c => ({
      id: "c-"+c.id, kind: "company", label: c.name, sub: c.desc,
      tags: c.tags, color: c.color, initials: c.initials, status: c.status,
      run: () => { onPickCompany(c); }
    }));
    const filtered = [...actions, ...companies].filter(x => {
      if (!ql) return true;
      return x.label.toLowerCase().includes(ql) ||
             (x.sub && x.sub.toLowerCase().includes(ql)) ||
             (x.tags && x.tags.some(t => t.toLowerCase().includes(ql)));
    }).slice(0, 12);
    return filtered;
  }, [q]);

  useEffect_K(() => { setIdx(0); }, [q]);

  if (!open) return null;

  const choose = (i) => {
    const it = items[i];
    if (it) { it.run(); onClose(); }
  };

  const onKey = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setIdx(i => Math.min(items.length - 1, i + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setIdx(i => Math.max(0, i - 1)); }
    else if (e.key === "Enter") { e.preventDefault(); choose(idx); }
    else if (e.key === "Escape") { e.preventDefault(); onClose(); }
  };

  return (
    <div style={{
      position:"fixed", inset: 0, zIndex: 60,
      background: "oklch(0 0 0 / 0.45)", backdropFilter:"blur(6px)",
      display:"flex", alignItems:"flex-start", justifyContent:"center",
      paddingTop: "12vh", animation:"fadeIn 140ms ease"
    }} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{
        width: "min(620px, 92vw)",
        background: "var(--bg-1)",
        border: "1px solid var(--line)",
        borderRadius: 12,
        boxShadow:"0 30px 80px -20px oklch(0 0 0 / 0.6)",
        overflow:"hidden",
        animation:"popIn 180ms cubic-bezier(0.2, 0.7, 0.3, 1)"
      }}>
        <div style={{
          display:"flex", alignItems:"center", gap: 10,
          padding: "12px 16px", borderBottom: "1px solid var(--line-soft)"
        }}>
          <Icon name="search" size={15} style={{color:"var(--fg-3)"}}/>
          <input
            ref={inputRef}
            value={q}
            onChange={e=>setQ(e.target.value)}
            onKeyDown={onKey}
            placeholder="Search companies, run a command…"
            style={{
              all:"unset", flex:1, fontSize: 14, color:"var(--fg-0)",
              fontFamily:"var(--font-sans)"
            }}
          />
          <span style={{fontFamily:"var(--font-mono)", fontSize: 10.5, color:"var(--fg-3)",
            padding:"2px 6px", borderRadius: 4, border:"1px solid var(--line-soft)"}}>esc</span>
        </div>

        <div className="scroll" style={{maxHeight: "50vh", overflow:"auto", padding: 6}}>
          {items.length === 0 ? (
            <div style={{padding: "24px 16px", textAlign:"center", color:"var(--fg-3)", fontSize: 13}}>
              No matches for “{q}”.
            </div>
          ) : items.map((it, i) => (
            <button key={it.id}
              onMouseEnter={()=>setIdx(i)}
              onClick={()=>choose(i)}
              style={{
                all:"unset", cursor:"pointer", width:"calc(100% - 12px)", margin: "0 6px",
                display:"flex", alignItems:"center", gap: 10,
                padding: "8px 10px", borderRadius: 6,
                background: idx === i ? "var(--bg-3)" : "transparent",
                fontSize: 13
              }}>
              {it.kind === "company" ? (
                <div style={{
                  width: 22, height: 22, borderRadius: 5, flexShrink: 0,
                  background: `linear-gradient(135deg, ${it.color}, color-mix(in oklch, ${it.color}, transparent 55%))`,
                  fontFamily:"var(--font-mono)", fontSize: 10, fontWeight: 600,
                  color:"oklch(0.99 0 0)",
                  display:"flex", alignItems:"center", justifyContent:"center"
                }}>{it.initials}</div>
              ) : (
                <div style={{
                  width: 22, height: 22, borderRadius: 5, flexShrink: 0,
                  background:"var(--bg-2)", border:"1px solid var(--line-soft)",
                  color:"var(--fg-2)",
                  display:"flex", alignItems:"center", justifyContent:"center"
                }}><Icon name={it.icon || "arrow"} size={12}/></div>
              )}
              <span style={{color: "var(--fg-0)", fontWeight: it.kind === "company" ? 500 : 400}}>{it.label}</span>
              {it.sub && it.kind === "company" && (
                <span style={{
                  flex:1, fontSize: 11.5, color:"var(--fg-3)",
                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"
                }}>{it.sub}</span>
              )}
              {it.shortcut && (
                <span style={{
                  fontFamily:"var(--font-mono)", fontSize: 10, color:"var(--fg-3)",
                  padding: "1px 6px", borderRadius: 4,
                  border:"1px solid var(--line-soft)", marginLeft:"auto"
                }}>{it.shortcut}</span>
              )}
              {it.kind === "company" && (
                <span style={{
                  fontFamily:"var(--font-mono)", fontSize: 10, color:"var(--fg-3)", marginLeft:"auto"
                }}>company</span>
              )}
            </button>
          ))}
        </div>

        <div style={{
          padding: "8px 14px", borderTop: "1px solid var(--line-soft)",
          background: "var(--bg-2)",
          display:"flex", alignItems:"center", gap: 14,
          fontFamily:"var(--font-mono)", fontSize: 10.5, color:"var(--fg-3)"
        }}>
          <span><kbd style={kbdStyle}>↑</kbd> <kbd style={kbdStyle}>↓</kbd> navigate</span>
          <span><kbd style={kbdStyle}>↵</kbd> open</span>
          <span><kbd style={kbdStyle}>esc</kbd> close</span>
          <div style={{flex:1}}/>
          <span>{items.length} results</span>
        </div>
      </div>
    </div>
  );
};

const kbdStyle = {
  padding: "1px 5px", borderRadius: 3,
  border: "1px solid var(--line-soft)", background: "var(--bg-1)",
  marginRight: 2, color: "var(--fg-2)"
};
