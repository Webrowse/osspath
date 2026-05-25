// Tiny inline icons — stroke-based, 16px default
const Icon = ({ name, size = 16, stroke = 1.6, style }) => {
  const paths = {
    search: <><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.3-4.3"/></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
    list: <><path d="M4 6h16M4 12h16M4 18h16"/></>,
    table: <><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 4v16"/></>,
    filter: <><path d="M3 5h18l-7 9v6l-4-2v-4z"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6"/></>,
    arrowDown: <><path d="M12 5v14M6 13l6 6 6-6"/></>,
    check: <><path d="M5 12.5l4.5 4.5L19 7"/></>,
    bookmark: <><path d="M6 4h12v17l-6-4-6 4z"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    bell: <><path d="M6 16V11a6 6 0 1112 0v5l2 2H4z"/><path d="M10 21h4"/></>,
    flame: <><path d="M12 3c2 3 5 4 5 9a5 5 0 11-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-8z"/></>,
    spark: <><path d="M12 3v5M12 16v5M3 12h5M16 12h5M6 6l3 3M15 15l3 3M18 6l-3 3M9 15l-3 3"/></>,
    cmd: <><path d="M9 6a3 3 0 10-3 3h12a3 3 0 10-3-3v12a3 3 0 103-3H6a3 3 0 10-3 3z"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 01-4 0v-.1a1.7 1.7 0 00-1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 010-4h.1a1.7 1.7 0 001.5-1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3h0a1.7 1.7 0 001-1.5V3a2 2 0 014 0v.1a1.7 1.7 0 001 1.5h0a1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8v0a1.7 1.7 0 001.5 1H21a2 2 0 010 4h-.1a1.7 1.7 0 00-1.5 1z"/></>,
    x: <><path d="M6 6l12 12M18 6L6 18"/></>,
    external: <><path d="M14 4h6v6M10 14L20 4M20 13v5a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h5"/></>,
    chevron: <><path d="M8 6l6 6-6 6"/></>,
    chevronDown: <><path d="M6 9l6 6 6-6"/></>,
    chevronUp: <><path d="M6 15l6-6 6 6"/></>,
    dot: <><circle cx="12" cy="12" r="3"/></>,
    map: <><path d="M9 4l-6 3v13l6-3 6 3 6-3V4l-6 3z"/><path d="M9 4v13M15 7v13"/></>,
    coins: <><circle cx="9" cy="9" r="5"/><circle cx="15" cy="15" r="5"/></>,
    sparkles: <><path d="M12 3v6M12 15v6M3 12h6M15 12h6"/></>,
    layers: <><path d="M12 3L3 8l9 5 9-5z"/><path d="M3 13l9 5 9-5M3 18l9 5 9-5"/></>,
    archive: <><rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v11a1 1 0 001 1h12a1 1 0 001-1V8M10 13h4"/></>,
    target: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/></>,
    inbox: <><path d="M3 13l3-9h12l3 9M3 13v6a2 2 0 002 2h14a2 2 0 002-2v-6M3 13h5l1 3h6l1-3h5"/></>,
    sliders: <><path d="M4 6h7M14 6h6M4 12h3M10 12h10M4 18h12M19 18h1"/><circle cx="12" cy="6" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="17" cy="18" r="2"/></>,
    users: <><circle cx="9" cy="8" r="3"/><path d="M3 20c0-3 3-5 6-5s6 2 6 5"/><circle cx="17" cy="9" r="2.5"/><path d="M15 20c0-2 2-3.5 4-3.5s2 0 2 0"/></>,
    pulse: <><path d="M3 12h4l2-6 4 12 2-6h6"/></>,
    notes: <><path d="M6 3h9l4 4v14H6z"/><path d="M9 10h7M9 14h7M9 18h4"/></>,
    radio: <><circle cx="12" cy="12" r="3"/><path d="M7.5 16.5a6 6 0 010-9M16.5 7.5a6 6 0 010 9M4.5 19.5a10 10 0 010-15M19.5 4.5a10 10 0 010 15"/></>,
    boltSm: <><path d="M13 3L4 14h7l-1 7 9-11h-7z"/></>,
    star: <><path d="M12 3l2.7 6 6.3.6-4.8 4.4 1.4 6.4L12 17l-5.6 3.4L7.8 14 3 9.6 9.3 9z"/></>,
    arrowUpRight: <><path d="M7 17L17 7M9 7h8v8"/></>,
    play: <><path d="M6 4l14 8-14 8z"/></>,
    refresh: <><path d="M20 11A8 8 0 006 6l-2 2M4 13a8 8 0 0014 5l2-2M20 4v4h-4M4 20v-4h4"/></>,
    rust: <><circle cx="12" cy="12" r="9"/><path d="M12 6v12M8 8h6a2 2 0 010 4H8M8 12h7l3 4"/></>,
    home: <><path d="M3 11l9-8 9 8v9a2 2 0 01-2 2h-4v-7h-6v7H5a2 2 0 01-2-2z"/></>
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
      style={style}>
      {paths[name]}
    </svg>
  );
};

window.Icon = Icon;
