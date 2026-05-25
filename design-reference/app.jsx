// ====== Main App ======
const { useState: useState_A, useEffect: useEffect_A } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "graphite",
  "view": "landing",
  "accent": "#5a8df2"
}/*EDITMODE-END*/;

function App() {
  const [tweak, setTweak] = useTweaks(TWEAK_DEFAULTS);

  const [view, setView] = useState_A(tweak.view || "explorer");
  const [picked, setPicked] = useState_A(null);
  const [cmdOpen, setCmdOpen] = useState_A(false);
  const [navActive, setNavActive] = useState_A("explorer");

  // Sync view from tweak
  useEffect_A(() => { if (tweak.view && tweak.view !== view) setView(tweak.view); }, [tweak.view]);

  // Apply theme
  useEffect_A(() => {
    document.documentElement.setAttribute("data-theme", tweak.theme || "graphite");
  }, [tweak.theme]);

  // Apply accent — uses hex so it plays nicely with the curated TweakColor swatches
  useEffect_A(() => {
    const map = {
      "#5a8df2": { full: "oklch(0.68 0.14 240)", soft: "oklch(0.68 0.14 240 / 0.14)", line: "oklch(0.68 0.14 240 / 0.35)" },
      "#d97757": { full: "oklch(0.72 0.16 45)",  soft: "oklch(0.72 0.16 45 / 0.14)",  line: "oklch(0.72 0.16 45 / 0.35)" },
      "#a06bed": { full: "oklch(0.65 0.18 295)", soft: "oklch(0.65 0.18 295 / 0.14)", line: "oklch(0.65 0.18 295 / 0.35)" },
      "#38b69b": { full: "oklch(0.70 0.14 160)", soft: "oklch(0.70 0.14 160 / 0.14)", line: "oklch(0.70 0.14 160 / 0.35)" }
    };
    const m = map[tweak.accent] || map["#5a8df2"];
    document.documentElement.style.setProperty("--accent", m.full);
    document.documentElement.style.setProperty("--accent-soft", m.soft);
    document.documentElement.style.setProperty("--accent-line", m.line);
  }, [tweak.accent]);

  // ⌘K
  useEffect_A(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault(); setCmdOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const goExplorer = () => { setView("explorer"); setTweak("view", "explorer"); };
  const goLanding = () => { setView("landing"); setTweak("view", "landing"); };

  return (
    <div style={{
      width:"100vw", height:"100vh", overflow:"hidden",
      background:"var(--bg-0)", color:"var(--fg-1)"
    }}>
      {view === "landing" ? (
        <Landing onEnterApp={goExplorer} onPickCompany={(c) => { goExplorer(); setTimeout(()=>setPicked(c), 100); }}/>
      ) : (
        <Explorer
          onPickCompany={setPicked}
          onOpenCmd={() => setCmdOpen(true)}
          navActive={navActive}
          setNavActive={setNavActive}
        />
      )}

      {picked && <CompanyDetail company={picked} onClose={()=>setPicked(null)}/>}
      <CommandPalette
        open={cmdOpen}
        onClose={()=>setCmdOpen(false)}
        onPickCompany={(c)=>{ setView("explorer"); setTweak("view", "explorer"); setPicked(c); }}
        onNavigate={(v)=>{ setNavActive(v); setView("explorer"); setTweak("view", "explorer"); }}
      />

      {/* Floating quick-actions: view switcher + cmd-k hint */}
      {view !== "landing" && (
        <div style={{
          position:"fixed", bottom: 18, left: "50%", transform: "translateX(-50%)",
          display:"flex", gap: 6, padding: 4,
          background: "color-mix(in oklch, var(--bg-1), transparent 5%)",
          border:"1px solid var(--line)", borderRadius: 10,
          boxShadow:"0 12px 36px -16px oklch(0 0 0 / 0.5), 0 0 0 1px var(--line-soft)",
          backdropFilter:"blur(12px)", zIndex: 30
        }}>
          <FloatBtn onClick={goLanding} icon="home" label="Landing"/>
          <FloatBtn onClick={()=>setCmdOpen(true)} icon="cmd" label="Command" shortcut="⌘K"/>
          <FloatBtn icon="bell" label="Notifications" badge="3"/>
        </div>
      )}

      <TweaksPanel title="Tweaks">
        <TweakSection label="Theme"/>
        <TweakRadio
          label="Surface"
          value={tweak.theme}
          onChange={v => setTweak("theme", v)}
          options={[
            { value: "graphite", label: "Graphite" },
            { value: "warm", label: "Warm Dark" },
            { value: "midnight", label: "Midnight" },
            { value: "light", label: "Light" }
          ]}
        />
        <TweakColor
          label="Accent"
          value={tweak.accent}
          onChange={v => setTweak("accent", v)}
          options={["#5a8df2", "#d97757", "#a06bed", "#38b69b"]}
        />

        <TweakSection label="View"/>
        <TweakRadio
          label="Screen"
          value={tweak.view}
          onChange={v => { setTweak("view", v); setView(v); }}
          options={[
            { value: "landing", label: "Landing" },
            { value: "explorer", label: "Workspace" }
          ]}
        />

        <TweakSection label="Quick actions"/>
        <TweakButton label="Open ⌘K palette" onClick={() => setCmdOpen(true)}/>
        <TweakButton label="Preview a company" secondary onClick={() => setPicked(window.COMPANIES[1])}/>
      </TweaksPanel>
    </div>
  );
}

function FloatBtn({ icon, label, shortcut, badge, onClick }) {
  return (
    <button onClick={onClick} style={{
      all:"unset", cursor:"pointer", position:"relative",
      display:"inline-flex", alignItems:"center", gap: 6,
      padding: "6px 10px", borderRadius: 7,
      fontSize: 12, color:"var(--fg-1)",
      transition:"background 120ms"
    }}
    onMouseEnter={e=>e.currentTarget.style.background = "var(--bg-3)"}
    onMouseLeave={e=>e.currentTarget.style.background = "transparent"}>
      <Icon name={icon} size={13} style={{color:"var(--fg-2)"}}/>
      {label}
      {shortcut && (
        <span style={{
          fontFamily:"var(--font-mono)", fontSize: 10, color:"var(--fg-3)",
          padding:"1px 5px", borderRadius: 4, border:"1px solid var(--line-soft)"
        }}>{shortcut}</span>
      )}
      {badge && (
        <span style={{
          position:"absolute", top: 4, right: 6,
          width: 14, height: 14, borderRadius: 999,
          background:"var(--rust)", color:"oklch(0.99 0 0)",
          fontSize: 9, fontFamily:"var(--font-mono)", fontWeight: 600,
          display:"flex", alignItems:"center", justifyContent:"center"
        }}>{badge}</span>
      )}
    </button>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
