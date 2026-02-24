const { useState, useEffect, useRef } = React;
const {
    AreaChart, Area, XAxis, YAxis, Tooltip,
    ResponsiveContainer, LineChart, Line, ReferenceLine
} = window.Recharts;
const {
    Eye, Zap, Shield, Clock, Brain, Activity,
    AlertTriangle, ChevronRight, Radio, Download,
    Trash2, Settings, ArrowLeft, TrendingDown,
    Lock, Cpu, BarChart2, Moon, Battery, Wifi,
    ChevronUp, ChevronDown
} = window.lucideReact;

/* ─── DESIGN SYSTEM ────────────────────────────────────────────── */
const D = {
    bg: "#05050A",
    surface: "rgba(10,17,20,0.95)",
    card: "rgba(10,17,20,0.80)",
    doom: "#FF2D55",
    doomMag: "#f20da6",
    safe: "#0ddff2",
    warn: "#FFB340",
    violet: "#BF5AF2",
    blue: "#0A84FF",
    text: "#D0DCF0",
    muted: "#3D4F6B",
    border: "rgba(13,223,242,0.12)",
    borderDoom: "rgba(242,13,166,0.35)",
    borderDanger: "rgba(255,45,85,0.35)",
};

/* ─── INJECTED STYLES ──────────────────────────────────────────── */
const Styles = () => (
    <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Share+Tech+Mono&family=Space+Mono:wght@400;700&display=swap');

    * { box-sizing: border-box; margin: 0; padding: 0; }

    .app-shell {
      width: 100%; min-height: 100vh;
      background: ${D.bg};
      font-family: 'Space Grotesk', sans-serif;
      color: ${D.text};
      position: relative;
      overflow: hidden;
      max-width: 500px;
      margin: 0 auto;
    }
    .mono  { font-family: 'Share Tech Mono', monospace; }
    .spacemono { font-family: 'Space Mono', monospace; }

    /* ── Cyber grid background ── */
    .app-shell::before {
      content: '';
      position: fixed; inset: 0;
      background-image:
        linear-gradient(to right, rgba(13,223,242,0.04) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(13,223,242,0.04) 1px, transparent 1px);
      background-size: 20px 20px;
      pointer-events: none; z-index: 0;
    }

    /* ── Top gradient bloom ── */
    .app-shell::after {
      content: '';
      position: fixed; top: 0; left: 0; right: 0; height: 200px;
      background: linear-gradient(to bottom, rgba(13,223,242,0.07), transparent);
      pointer-events: none; z-index: 0;
    }

    /* ── Scanline overlay ── */
    .scanlines {
      position: fixed; inset: 0;
      background: linear-gradient(to bottom, rgba(255,255,255,0) 50%, rgba(0,0,0,0.08) 50%);
      background-size: 100% 4px;
      pointer-events: none; z-index: 0; opacity: 0.4;
    }

    .text-glow-safe  { text-shadow: 0 0 10px rgba(13,223,242,0.6); }
    .text-glow-doom  { text-shadow: 0 0 14px rgba(242,13,166,0.7); }
    .text-glow-warn  { text-shadow: 0 0 10px rgba(255,179,64,0.5); }

    .border-glow-safe   { box-shadow: 0 0 12px rgba(13,223,242,0.2), inset 0 0 6px rgba(13,223,242,0.06); }
    .border-glow-doom   { box-shadow: 0 0 20px rgba(242,13,166,0.25), inset 0 0 8px rgba(242,13,166,0.06); }
    .border-glow-danger { box-shadow: 0 0 15px rgba(255,45,85,0.2),  inset 0 0 5px rgba(255,45,85,0.05); }

    @keyframes pulse-dot  { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.8)} }
    @keyframes ring-out   { 0%{transform:scale(1);opacity:0.7} 100%{transform:scale(1.8);opacity:0} }
    @keyframes slide-up   { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
    @keyframes scan-line  { 0%{top:-2px} 100%{top:100%} }
    @keyframes float      { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
    @keyframes ping-slow  { 0%,100%{transform:scale(1);opacity:0.75} 50%{transform:scale(1.6);opacity:0} }

    .pulse    { animation: pulse-dot 2s ease-in-out infinite; }
    .slide-up { animation: slide-up 0.5s ease both; }
    .float    { animation: float 3s ease-in-out infinite; }
    .ping     { animation: ping-slow 2s ease-in-out infinite; }

    .scan {
      position: absolute; left: 0; right: 0; height: 1px;
      background: linear-gradient(90deg, transparent, ${D.safe}88, transparent);
      animation: scan-line 5s linear infinite;
      pointer-events: none;
    }

    /* ── Glass card ── */
    .card {
      background: rgba(10,17,20,0.80);
      border: 1px solid ${D.border};
      border-radius: 16px;
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      position: relative;
      overflow: hidden;
    }
    .card::after {
      content: '';
      position: absolute; inset: 0;
      background: linear-gradient(135deg, rgba(13,223,242,0.03) 0%, transparent 60%);
      pointer-events: none; border-radius: inherit;
    }

    /* ── Doom card variant (magenta) ── */
    .card-doom {
      border-color: ${D.borderDoom};
      background: rgba(26,11,21,0.80);
    }
    .card-doom::before {
      content: '';
      position: absolute; top: 0; left: 0; right: 0; height: 2px;
      background: linear-gradient(90deg, transparent, ${D.doomMag}, transparent);
      opacity: 0.7;
    }

    /* ── Danger card variant (red) ── */
    .card-danger { border-color: ${D.borderDanger}; }
    .card-danger::before {
      content: '';
      position: absolute; top: 0; left: 0; right: 0; height: 2px;
      background: linear-gradient(90deg, transparent, ${D.doom}, transparent);
      opacity: 0.5;
    }

    ::-webkit-scrollbar { width: 3px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: ${D.muted}; border-radius: 2px; }

    /* ── Primary button ── */
    .btn-primary {
      width: 100%;
      padding: 18px;
      border-radius: 14px;
      border: none;
      cursor: pointer;
      font-family: 'Space Grotesk', sans-serif;
      font-size: 16px;
      font-weight: 700;
      letter-spacing: 0.03em;
      background: linear-gradient(135deg, ${D.safe}, #00B8A4);
      color: #020A0A;
      position: relative; overflow: hidden;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
      box-shadow: 0 8px 32px rgba(13,223,242,0.25);
    }
    .btn-primary:active { transform: scale(0.98); }
    .btn-primary::after {
      content: '';
      position: absolute; inset: 0;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
      transform: translateX(-100%); transition: transform 0.5s ease;
    }
    .btn-primary:hover::after { transform: translateX(100%); }

    input[type=range] {
      -webkit-appearance: none; width: 100%;
      height: 3px; border-radius: 2px;
      background: rgba(13,223,242,0.2); outline: none;
    }
    input[type=range]::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 16px; height: 16px; border-radius: 50%;
      background: ${D.safe};
      box-shadow: 0 0 10px ${D.safe};
      cursor: pointer;
    }

    /* ── Neon progress bar ── */
    .neon-bar-doom { box-shadow: 0 0 8px rgba(242,13,166,0.7); }
    .neon-bar-safe { box-shadow: 0 0 8px rgba(13,223,242,0.6); }

    /* ── Tab bar ── */
    .tab-bar {
      position: sticky; bottom: 0;
      background: rgba(5,5,10,0.95);
      backdrop-filter: blur(20px);
      border-top: 1px solid ${D.border};
      display: flex;
    }
    .tab-item {
      flex: 1; padding: 12px 8px 16px;
      display: flex; flex-direction: column;
      align-items: center; gap: 3px;
      cursor: pointer; border: none;
      background: transparent; color: ${D.muted};
      font-family: 'Space Grotesk'; font-size: 10px;
      font-weight: 600; letter-spacing: 0.05em;
      transition: color 0.2s;
    }
    .tab-item.active { color: ${D.safe}; }
    .tab-item.active svg { filter: drop-shadow(0 0 6px ${D.safe}); }
  `}</style>
);

/* ─── MICRO COMPONENTS ─────────────────────────────────────────── */
const Label = ({ children, style = {} }) => (
    <span className="mono" style={{
        fontSize: 10, letterSpacing: "0.18em",
        color: D.muted, textTransform: "uppercase", ...style
    }}>{children}</span>
);

const Tag = ({ label }) => {
    const c = label === "DOOM" ? D.doomMag : label === "BORDERLINE" ? D.warn : D.safe;
    return (
        <span className="mono" style={{
            fontSize: 10, padding: "3px 10px", borderRadius: 4,
            color: c, background: c + "22", border: `1px solid ${c}55`,
            letterSpacing: "0.12em", fontWeight: 700,
        }}>{label}</span>
    );
};

const Divider = () => (
    <div style={{ height: 1, background: D.border, margin: "0 -1px" }} />
);

/* ─── DOOM GAUGE ────────────────────────────────────────────────── */
const DoomGauge = ({ value, label }) => {
    const pct = Math.round(value * 100);
    const col = pct > 60 ? D.doom : pct > 40 ? D.warn : D.safe;
    // Arc: semicircle, 0..180 degrees
    const angle = (pct / 100) * 180;
    const r = 54, cx = 70, cy = 68;
    const toRad = (deg) => (deg - 180) * Math.PI / 180;
    const x = (deg) => cx + r * Math.cos(toRad(deg));
    const y = (deg) => cy + r * Math.sin(toRad(deg));
    const arcD = `M ${x(0)} ${y(0)} A ${r} ${r} 0 ${angle > 180 ? 1 : 0} 1 ${x(angle)} ${y(angle)}`;
    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <svg width={140} height={80} viewBox="0 0 140 80" style={{ overflow: "visible" }}>
                {/* Track */}
                <path d={`M ${x(0)} ${y(0)} A ${r} ${r} 0 1 1 ${x(180)} ${y(180)}`}
                    fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={10} strokeLinecap="round" />
                {/* Fill */}
                {pct > 0 && (
                    <path d={arcD}
                        fill="none" stroke={col} strokeWidth={10} strokeLinecap="round"
                        style={{ filter: `drop-shadow(0 0 6px ${col})`, transition: "all 1.5s ease" }} />
                )}
                {/* Value text */}
                <text x="70" y="60" textAnchor="middle"
                    fontFamily="Space Mono" fontSize="28" fontWeight="700"
                    fill={col} style={{ filter: `drop-shadow(0 0 10px ${col})` }}>
                    {pct}%
                </text>
            </svg>
            <Label style={{ color: col, marginTop: -4 }}>{label}</Label>
        </div>
    );
};

/* ─── LANDING / HOME SCREEN ────────────────────────────────────── */
const HomeScreen = ({ onNav, SESSION, LIVE, isServiceActive }) => {
    return (
        <div className="slide-up" style={{ padding: "0 16px 24px", position: "relative", zIndex: 1 }}>

            {/* ── Header status bar ── */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 4px 0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ position: "relative", width: 10, height: 10 }}>
                        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: D.safe, opacity: 0.75 }} className="ping" />
                        <div style={{ position: "relative", width: 10, height: 10, borderRadius: "50%", background: D.safe }} />
                    </div>
                    <span className="mono" style={{ fontSize: 10, color: D.safe, letterSpacing: "0.2em" }}>SYSTEM ACTIVE</span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                    <Wifi size={14} color={D.safe + "88"} />
                    <Battery size={14} color={D.safe + "88"} />
                </div>
            </div>

            {/* ── Brand title ── */}
            <div style={{ padding: "20px 0 20px", textAlign: "center", borderBottom: `1px solid ${D.border}`, marginBottom: 20 }}>
                <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "0.06em", color: "#fff", lineHeight: 1 }}>
                    REELIO <span style={{ color: D.safe + "55", fontWeight: 300, fontSize: 20 }}>//</span> ALSE
                </div>
            </div>

            {/* ── Service status ── */}
            <div className="card" style={{ padding: "14px 16px", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                            width: 36, height: 36, borderRadius: 10,
                            background: `${isServiceActive ? D.safe : D.doom}15`,
                            border: `1px solid ${isServiceActive ? D.safe : D.doom}33`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                            <Radio size={16} color={isServiceActive ? D.safe : D.doom} />
                        </div>
                        <div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>Accessibility Service</div>
                            <Label>{isServiceActive ? "Neural monitor active" : "Service Offline"}</Label>
                        </div>
                    </div>
                    {!isServiceActive ? (
                        <button className="btn-primary" style={{ padding: "8px 14px", width: "auto", fontSize: 12 }}
                            onClick={() => window.Android?.enableAccessibility()}>Enable</button>
                    ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div style={{ position: "relative", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <div style={{ position: "absolute", width: 16, height: 16, borderRadius: "50%", background: D.safe + "33", animation: "ring-out 2s ease-in-out infinite" }} />
                                <div style={{ width: 8, height: 8, borderRadius: "50%", background: D.safe, boxShadow: `0 0 8px ${D.safe}` }} className="pulse" />
                            </div>
                            <span className="mono" style={{ fontSize: 12, color: D.safe }}>Active</span>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Doom Probability Card ── */}
            <div className={`card ${SESSION.doom_label === "DOOM" ? "card-danger" : ""}`}
                style={{ marginBottom: 12, overflow: "hidden" }}>
                <div style={{
                    padding: "12px 16px",
                    background: SESSION.doom_label === "DOOM"
                        ? `linear-gradient(90deg, ${D.doom}18, transparent)`
                        : `linear-gradient(90deg, ${D.safe}10, transparent)`,
                    borderBottom: `1px solid ${SESSION.doom_label === "DOOM" ? D.borderDanger : D.border}`,
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                    <div>
                        <Label style={{ color: D.doom }}>Current Intervention</Label>
                        <div className="mono" style={{ fontSize: 10, color: D.muted, marginTop: 2 }}>ID: #SESSION-ACTIVE</div>
                    </div>
                    <AlertTriangle size={18} color={D.doom} style={{ filter: `drop-shadow(0 0 6px ${D.doom})` }} />
                </div>

                <div style={{ padding: "20px 16px 16px", display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <DoomGauge
                        value={SESSION.S_t}
                        label={SESSION.doom_label === "DOOM" ? "CRITICAL RISK" : SESSION.doom_label === "BORDERLINE" ? "MODERATE RISK" : "LOW RISK"}
                    />
                </div>

                {/* Metrics row */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderTop: `1px solid ${D.border}` }}>
                    {[
                        { label: "Total Sessions", value: SESSION.sessions_today },
                        { label: "Doom Sessions", value: SESSION.total_doom_sessions },
                        { label: "Interactions", value: SESSION.total_interactions }
                    ].map((item, i) => (
                        <div key={item.label} style={{ padding: "12px 10px", textAlign: "center", borderRight: i < 2 ? `1px solid ${D.border}` : "none" }}>
                            <Label style={{ fontSize: 9, display: "block", marginBottom: 4 }}>{item.label}</Label>
                            <div className="spacemono" style={{ fontSize: 20, fontWeight: 700, color: "#fff" }}>{item.value}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Cognitive Stability ── */}
            <div className="card border-glow-safe" style={{ padding: "14px 16px", marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                    <Label style={{ color: D.safe }}>Cognitive Stability</Label>
                    <div style={{ fontSize: 12, color: D.text, marginTop: 3, fontWeight: 500 }}>Based on scroll velocity & dwell variance</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: D.warn, boxShadow: `0 0 6px ${D.warn}` }} />
                        <span style={{ fontSize: 12, color: D.warn, fontWeight: 700, letterSpacing: "0.05em" }}>MODERATE FOCUS</span>
                    </div>
                </div>
                {/* Mini ring gauge */}
                <div style={{ position: "relative", width: 56, height: 56 }}>
                    <svg width={56} height={56} viewBox="0 0 36 36" style={{ transform: "rotate(-90deg)" }}>
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={4} />
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none" stroke={D.warn} strokeWidth={4}
                            strokeDasharray={`${Math.round((1 - SESSION.S_t) * 80)}, 100`}
                            style={{ filter: `drop-shadow(0 0 3px ${D.warn})` }} />
                    </svg>
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span className="spacemono" style={{ fontSize: 11, fontWeight: 700, color: D.warn }}>
                            {Math.round((1 - SESSION.S_t) * 80)}%
                        </span>
                    </div>
                </div>
            </div>

            {/* ── Live session summary ── */}
            <div style={{ marginBottom: 6 }}><Label style={{ paddingLeft: 2 }}>Live Session Summary</Label></div>
            <div className={`card ${SESSION.doom_label === "DOOM" ? "card-doom" : ""}`} style={{ padding: 0, marginBottom: 12, overflow: "hidden" }}>
                <div style={{
                    padding: "10px 16px",
                    background: SESSION.doom_label === "DOOM" ? `linear-gradient(90deg, ${D.doomMag}18, transparent)` : `linear-gradient(90deg, ${D.safe}10, transparent)`,
                    borderBottom: `1px solid ${SESSION.doom_label === "DOOM" ? D.borderDoom : D.border}`,
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                    <Label>Current Risk State</Label>
                    <Tag label={SESSION.doom_label} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                    {[
                        { label: "Session Duration", value: LIVE.duration, col: "#fff" },
                        { label: "Reels Observed", value: LIVE.reels, col: "#fff" },
                        { label: "Avg Dwell Time", value: `${LIVE.avg_dwell}s`, col: D.warn },
                        { label: "Capture Prob", value: `${Math.round(SESSION.S_t * 100)}%`, col: D.doomMag },
                    ].map(({ label, value, col }, i) => (
                        <div key={label} style={{
                            padding: "14px 16px",
                            borderRight: i % 2 === 0 ? `1px solid ${D.border}` : "none",
                            borderBottom: i < 2 ? `1px solid ${D.border}` : "none",
                        }}>
                            <div className="spacemono" style={{
                                fontSize: i < 2 ? 30 : 24, fontWeight: 700, color: col, lineHeight: 1,
                                textShadow: col !== "#fff" ? `0 0 16px ${col}88` : "none",
                            }}>{value}</div>
                            <Label style={{ marginTop: 4, display: "block" }}>{label}</Label>
                        </div>
                    ))}
                </div>
                {/* Doom score bar */}
                <div style={{ padding: "12px 16px", borderTop: `1px solid ${D.border}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <Label>Doom Score</Label>
                        <span className="mono" style={{ fontSize: 11, color: D.doomMag }}>{Math.round(SESSION.doom_score * 100)}/100</span>
                    </div>
                    <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{
                            height: "100%", width: `${SESSION.doom_score * 100}%`,
                            background: `linear-gradient(90deg, ${D.warn}, ${D.doomMag})`,
                            borderRadius: 2, boxShadow: `0 0 10px ${D.doomMag}`,
                        }} />
                    </div>
                </div>
            </div>

            {/* ── Stats row ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 24 }}>
                {[
                    { label: "Sessions", value: SESSION.sessions_today, col: D.violet },
                    { label: "Dwell Total", value: `${SESSION.total_dwell_today_min}m`, col: D.warn },
                    { label: "Confidence", value: `${Math.round(SESSION.model_confidence * 100)}%`, col: D.safe },
                ].map(({ label, value, col }) => (
                    <div key={label} className="card" style={{ padding: "12px 10px", textAlign: "center" }}>
                        <div className="spacemono" style={{
                            fontSize: 20, fontWeight: 700, color: col,
                            textShadow: `0 0 12px ${col}88`,
                        }}>{value}</div>
                        <Label style={{ marginTop: 3, display: "block", fontSize: 9 }}>{label}</Label>
                        <div style={{ height: 2, width: 28, background: col + "55", borderRadius: 1, margin: "6px auto 0", transition: "background 0.3s" }} />
                    </div>
                ))}
            </div>

            <button className="btn-primary" onClick={() => onNav("dashboard")}>
                View Behavioral Dashboard
                <ChevronRight size={18} style={{ display: "inline", marginLeft: 6, verticalAlign: "middle" }} />
            </button>
        </div>
    );
};

/* ─── DOOM DRIVER CARD ──────────────────────────────────────────── */
const DoomDriver = ({ rank, label, value, col, icon: Icon }) => (
    <div className="card" style={{ padding: "14px 14px", borderColor: col + "22" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                    background: col + "18", border: `1px solid ${col}33`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                    <Icon size={13} color={col} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: D.text }}>{label}</span>
            </div>
            <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: col, textShadow: `0 0 10px ${col}` }}>
                {Math.round(value * 100)}%
            </span>
        </div>
        <div style={{ height: 5, background: "rgba(255,255,255,0.05)", borderRadius: 3, overflow: "hidden" }}>
            <div style={{
                height: "100%", width: `${value * 100}%`,
                background: `linear-gradient(90deg, ${col}88, ${col})`,
                borderRadius: 3, boxShadow: value > 0.6 ? `0 0 8px ${col}` : "none",
                transition: "width 1s ease",
            }} />
        </div>
    </div>
);

/* ─── DASHBOARD SCREEN ─────────────────────────────────────────── */
const DashboardScreen = ({ SESSION, REELS_DATA, DAYS_14 }) => {
    const [reelCursor, setReelCursor] = useState(REELS_DATA.length - 1);
    const [expandedSection, setExpandedSection] = useState(null);
    const current = REELS_DATA[reelCursor] || REELS_DATA[REELS_DATA.length - 1] || { p: 0 };

    const score = Math.round((1 - SESSION.S_t) * 80 + (1 - SESSION.A[1][1]) * 20);
    const scoreCol = score > 65 ? D.safe : score > 40 ? D.warn : D.doom;
    const capDur = (1 / SESSION.h[1]).toFixed(1);
    const toggle = (k) => setExpandedSection(expandedSection === k ? null : k);

    // Top 3 doom drivers sorted by value
    const doomDrivers = [
        { k: "rapid_reentry", l: "Rapid Re-entry", icon: Zap },
        { k: "volitional_conflict", l: "Exit Conflict", icon: Lock },
        { k: "automaticity", l: "Scroll Automaticity", icon: Cpu },
        { k: "length", l: "Session Length", icon: BarChart2 },
        { k: "dwell_collapse", l: "Dwell Collapse", icon: TrendingDown },
        { k: "rewatch", l: "Rewatch Compulsion", icon: Radio },
        { k: "environment", l: "Environment", icon: Moon },
    ].map(d => ({ ...d, value: SESSION.doom_components[d.k] || 0.5 }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 3);

    const driverColors = [D.doomMag, D.violet, D.blue];

    // Heatmap bar color based on risk
    const heatColor = (v) => v > 0.7 ? D.doomMag : v > 0.5 ? "#9333ea" : v > 0.35 ? D.warn : D.safe;

    return (
        <div className="slide-up" style={{ padding: "16px 16px 32px", position: "relative", zIndex: 1 }}>

            {/* ── Header strip ── */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div>
                    <div className="mono" style={{ fontSize: 10, color: D.safe, letterSpacing: "0.2em" }}>REELIO // NEURAL ENGINE</div>
                    <div className="mono" style={{ fontSize: 9, color: D.muted, marginTop: 2 }}>v3.0 Connected</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 6, border: `1px solid ${D.doomMag}33`, background: D.doomMag + "10" }}>
                    <span className="mono" style={{ fontSize: 9, color: D.doomMag }}>LAST 14 DAYS</span>
                </div>
            </div>

            {/* ── Cognitive Stability Index ── */}
            <div className="card card-danger border-glow-danger" style={{ padding: "18px", marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                    <div>
                        <Label>Cognitive Stability Index</Label>
                        <div style={{ fontSize: 13, color: D.text, marginTop: 4, fontWeight: 600 }}>Neural Load Assessment</div>
                    </div>
                    <Tag label={SESSION.doom_label} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <DoomGauge value={SESSION.S_t} label={SESSION.doom_label === "DOOM" ? "CRITICAL" : SESSION.doom_label === "BORDERLINE" ? "MODERATE" : "STABLE"} />
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 9 }}>
                        {[
                            { label: "Capture Rate", v: `${Math.round(SESSION.S_t * 100)}%`, col: D.doomMag },
                            { label: "Doom Inertia", v: `${Math.round(SESSION.A[1][1] * 100)}%`, col: D.doom },
                            { label: "Escape Rate", v: `${Math.round(SESSION.A[1][0] * 100)}%`, col: D.safe },
                            { label: "Pull Index", v: `${SESSION.doom_pull_index}×`, col: D.warn },
                        ].map(({ label, v, col }) => (
                            <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <Label>{label}</Label>
                                <span className="mono" style={{ fontSize: 12, color: col, textShadow: `0 0 8px ${col}88` }}>{v}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 14 }}>
                    {[
                        { label: "Total Reels", v: REELS_DATA.length, col: "#fff" },
                        { label: "Doom Duration", v: `${capDur}r`, col: D.warn },
                    ].map(({ label, v, col }) => (
                        <div key={label} style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(0,0,0,0.35)", border: `1px solid ${D.border}` }}>
                            <div className="spacemono" style={{ fontSize: 18, color: col }}>{v}</div>
                            <Label style={{ display: "block", marginTop: 2 }}>{label}</Label>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── State Dynamics ── */}
            <div className="card" style={{ padding: "16px", marginBottom: 10 }}>
                <div style={{ marginBottom: 12 }}><Label>State Dynamics</Label></div>
                <svg width="100%" viewBox="0 0 340 110" style={{ overflow: "visible" }}>
                    <circle cx="70" cy="55" r="40" fill={D.safe + "10"} stroke={D.safe} strokeWidth={1.5} style={{ filter: `drop-shadow(0 0 10px ${D.safe}44)` }} />
                    <text x="70" y="50" textAnchor="middle" fontFamily="Space Grotesk" fontSize="11" fontWeight="700" fill={D.safe}>CASUAL</text>
                    <text x="70" y="65" textAnchor="middle" fontFamily="Share Tech Mono" fontSize="9" fill={D.muted}>STATE 0</text>
                    <circle cx="270" cy="55" r="40" fill={D.doomMag + "10"} stroke={D.doomMag} strokeWidth={1.5} style={{ filter: `drop-shadow(0 0 10px ${D.doomMag}44)` }} />
                    <text x="270" y="50" textAnchor="middle" fontFamily="Space Grotesk" fontSize="11" fontWeight="700" fill={D.doomMag}>DOOM</text>
                    <text x="270" y="65" textAnchor="middle" fontFamily="Share Tech Mono" fontSize="9" fill={D.muted}>STATE 1</text>
                    {/* TRAP arrow */}
                    <path d="M 108 38 Q 170 0 232 38" fill="none" stroke={D.doomMag} strokeWidth={2.5} style={{ filter: `drop-shadow(0 0 4px ${D.doomMag})` }} />
                    <polygon points="232,38 222,32 226,44" fill={D.doomMag} />
                    <text x="170" y="14" textAnchor="middle" fontFamily="Share Tech Mono" fontSize="11" fontWeight="700" fill={D.doomMag}>{Math.round(SESSION.A[0][1] * 100)}%</text>
                    <text x="170" y="26" textAnchor="middle" fontFamily="Space Grotesk" fontSize="8" fill={D.muted}>TRAP</text>
                    {/* ESCAPE arrow */}
                    <path d="M 232 72 Q 170 110 108 72" fill="none" stroke={D.safe} strokeWidth={1.5} strokeDasharray="5,3" opacity={0.7} />
                    <polygon points="108,72 120,66 118,78" fill={D.safe} opacity={0.7} />
                    <text x="170" y="105" textAnchor="middle" fontFamily="Share Tech Mono" fontSize="11" fontWeight="700" fill={D.safe}>{Math.round(SESSION.A[1][0] * 100)}%</text>
                    <text x="170" y="93" textAnchor="middle" fontFamily="Space Grotesk" fontSize="8" fill={D.muted}>ESCAPE</text>
                    {/* Self-loops */}
                    <text x="70" y="14" textAnchor="middle" fontFamily="Share Tech Mono" fontSize="9" fill={D.safe + "99"}>↺ {Math.round(SESSION.A[0][0] * 100)}%</text>
                    <text x="270" y="14" textAnchor="middle" fontFamily="Share Tech Mono" fontSize="9" fill={D.doomMag + "cc"}>↺ {Math.round(SESSION.A[1][1] * 100)}%</text>
                    {/* Animated dot */}
                    <circle r="4" fill={D.doomMag} style={{ filter: `drop-shadow(0 0 5px ${D.doomMag})` }}>
                        <animateMotion path="M 108 38 Q 170 0 232 38" dur="2.5s" repeatCount="indefinite" />
                    </circle>
                </svg>
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    {[
                        { label: "Doom Pull", v: `${SESSION.doom_pull_index}×`, col: D.doomMag },
                        { label: "Regime Life", v: `${SESSION.regime_stability.toFixed(0)}r`, col: D.warn },
                        { label: "Conf", v: `${Math.round(SESSION.model_confidence * 100)}%`, col: D.violet },
                    ].map(({ label, v, col }) => (
                        <div key={label} style={{ flex: 1, padding: "8px", borderRadius: 8, textAlign: "center", background: `${col}10`, border: `1px solid ${col}25` }}>
                            <div className="mono" style={{ fontSize: 13, color: col, textShadow: `0 0 8px ${col}` }}>{v}</div>
                            <Label style={{ fontSize: 9 }}>{label}</Label>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── 14-Day Risk Heatmap ── */}
            <div className="card" style={{ padding: "16px", marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                    <div>
                        <Label style={{ display: "block", marginBottom: 4 }}>Cumulative Exposure</Label>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 22, fontWeight: 700, color: "#fff", textShadow: `0 0 12px ${D.doomMag}88` }}>14-Day Risk</span>
                            <span className="mono" style={{ fontSize: 9, color: D.safe, background: D.safe + "15", padding: "2px 6px", borderRadius: 4 }}>
                                AVG {(DAYS_14.length ? (DAYS_14.reduce((a, b) => a + b.v, 0) / DAYS_14.length) : 0).toFixed(2)} S_t
                            </span>
                        </div>
                    </div>
                </div>
                <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 80, padding: "0 2px" }}>
                    {DAYS_14.map((day, i) => {
                        const c = heatColor(day.v);
                        const h = Math.max(12, day.v * 70);
                        return (
                            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                                <div style={{
                                    width: "100%", height: h, borderRadius: 4,
                                    background: `${c}30`, border: `1px solid ${c}50`,
                                    position: "relative", overflow: "hidden",
                                    transition: "all 0.3s ease",
                                }}>
                                    <div style={{
                                        position: "absolute", bottom: 0, left: 0, right: 0,
                                        height: `${day.v * 100}%`,
                                        background: `linear-gradient(to top, ${c}, ${c}66)`,
                                        boxShadow: day.v > 0.6 ? `0 0 8px ${c}` : "none",
                                    }} />
                                </div>
                                <span className="mono" style={{ fontSize: 8, color: D.muted }}>{day.d}</span>
                            </div>
                        );
                    })}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                    {["14d ago", "7d ago", "Today"].map(l => (
                        <span key={l} className="mono" style={{ fontSize: 8, color: D.muted + "99" }}>{l}</span>
                    ))}
                </div>
                <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 10 }}>
                    {[["LOW", D.safe], ["MED", "#9333ea"], ["HIGH", D.doomMag]].map(([l, c]) => (
                        <div key={l} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <div style={{ width: 8, height: 8, borderRadius: 2, background: c, boxShadow: `0 0 4px ${c}` }} />
                            <Label style={{ fontSize: 9 }}>{l}</Label>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Top 3 Doom Drivers ── */}
            <div style={{ marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Label>Top Doom Drivers</Label>
                <span className="mono" style={{ fontSize: 9, color: D.doomMag }}>VIEW ALL →</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
                {doomDrivers.map(({ k, l, icon, value }, i) => (
                    <DoomDriver key={k} label={l} value={value} col={driverColors[i]} icon={icon} />
                ))}
            </div>

            {/* ── Capture Timeline ── */}
            <div className="card" style={{ padding: "16px", marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <div>
                        <Label style={{ display: "block", marginBottom: 2 }}>Session Topology</Label>
                        <div className="mono" style={{ fontSize: 9, color: D.muted }}>ID: #SESSION • LIVE</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,0.05)", padding: "3px 8px", borderRadius: 4 }}>
                            <div style={{ width: 6, height: 6, borderRadius: "50%", background: D.doomMag }} className="pulse" />
                            <span className="mono" style={{ fontSize: 9, color: D.text }}>REEL {reelCursor + 1} · {Math.round(current.p * 100)}%</span>
                        </div>
                        {current.exit && <span className="mono" style={{ fontSize: 9, color: D.doom }}>⚡ EXIT</span>}
                        {current.back && <span className="mono" style={{ fontSize: 9, color: D.warn }}>↩ REWATCH</span>}
                    </div>
                </div>
                <div style={{ height: 120 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={REELS_DATA.map(r => ({ r: r.r, p: r.p }))} margin={{ top: 5, right: 0, bottom: 0, left: -30 }}>
                            <defs>
                                <linearGradient id="capGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={D.doomMag} stopOpacity={0.45} />
                                    <stop offset="95%" stopColor={D.doomMag} stopOpacity={0.02} />
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="r" stroke={D.muted} tick={{ fontSize: 8, fontFamily: "Share Tech Mono", fill: D.muted }} interval={9} />
                            <YAxis domain={[0, 1]} stroke={D.muted} tick={{ fontSize: 8, fontFamily: "Share Tech Mono", fill: D.muted }} tickFormatter={v => `${Math.round(v * 100)}%`} />
                            <Tooltip
                                contentStyle={{ background: "rgba(5,5,10,0.95)", border: `1px solid ${D.border}`, borderRadius: 8, fontFamily: "Share Tech Mono", fontSize: 11, color: D.text }}
                                formatter={v => [`${Math.round(v * 100)}%`, "Capture"]}
                                labelFormatter={l => `Reel #${l}`}
                            />
                            <ReferenceLine y={0.5} stroke={D.doomMag} strokeDasharray="4 3" strokeOpacity={0.4} />
                            <ReferenceLine x={reelCursor + 1} stroke={D.safe} strokeOpacity={0.5} strokeDasharray="3 2" />
                            <Area type="monotone" dataKey="p" fill="url(#capGrad)" stroke={D.doomMag} strokeWidth={2} dot={false}
                                style={{ filter: `drop-shadow(0 0 4px ${D.doomMag})` }} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
                <div style={{ marginTop: 8 }}>
                    <input type="range" min={0} max={Math.max(0, REELS_DATA.length - 1)} value={reelCursor} onChange={e => setReelCursor(+e.target.value)} />
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
                        <Label style={{ fontSize: 9 }}>Reel 1</Label>
                        <Label style={{ fontSize: 9 }}>Reel {REELS_DATA.length}</Label>
                    </div>
                </div>
            </div>

            {/* ── Doom Score Anatomy ── */}
            <div className="card" style={{ marginBottom: 10, overflow: "hidden" }}>
                <button onClick={() => toggle("anatomy")} style={{
                    width: "100%", padding: "14px 16px",
                    background: "none", border: "none", cursor: "pointer",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Label>Doom Score Anatomy</Label></div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span className="mono" style={{ fontSize: 16, color: D.doomMag, textShadow: `0 0 12px ${D.doomMag}` }}>
                            {Math.round(SESSION.doom_score * 100)}
                        </span>
                        {expandedSection === "anatomy" ? <ChevronUp size={14} color={D.muted} /> : <ChevronDown size={14} color={D.muted} />}
                    </div>
                </button>
                {expandedSection === "anatomy" && (
                    <div style={{ padding: "0 16px 16px" }}>
                        <Divider />
                        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                            {[
                                { k: "length", l: "Session Length", icon: BarChart2 },
                                { k: "volitional_conflict", l: "Exit Conflict", icon: Lock },
                                { k: "rapid_reentry", l: "Rapid Re-entry", icon: Zap },
                                { k: "automaticity", l: "Scroll Automaticity", icon: Cpu },
                                { k: "dwell_collapse", l: "Dwell Collapse", icon: TrendingDown },
                                { k: "rewatch", l: "Rewatch Compulsion", icon: Radio },
                                { k: "environment", l: "Environment", icon: Moon },
                            ].map(({ k, l, icon: Icon }) => {
                                const v = SESSION.doom_components[k] || 0.5;
                                const col = v > 0.7 ? D.doomMag : v > 0.45 ? D.warn : D.safe;
                                return (
                                    <div key={k}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                <Icon size={11} color={col} />
                                                <span style={{ fontSize: 12, color: D.text }}>{l}</span>
                                            </div>
                                            <span className="mono" style={{ fontSize: 11, color: col }}>{Math.round(v * 100)}%</span>
                                        </div>
                                        <div style={{ height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden" }}>
                                            <div style={{
                                                height: "100%", width: `${v * 100}%`,
                                                background: `linear-gradient(90deg, ${col}88, ${col})`,
                                                borderRadius: 2,
                                                boxShadow: v > 0.6 ? `0 0 6px ${col}` : "none",
                                            }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* ── Behavioral Insights ── */}
            <div style={{ marginBottom: 8 }}><Label>Automated Behavioral Insights</Label></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                    { icon: AlertTriangle, col: D.doom, title: "Peak Vulnerability", body: `Late Night sessions average ${Math.round(SESSION.S_t * 100)}% capture. Dark room + charging amplifies doom state by ~${SESSION.doom_pull_index}×.` },
                    { icon: Brain, col: D.violet, title: "Cognitive Recovery Rate", body: `Doom episodes last ~${Math.round(SESSION.regime_stability)} reels. After a ${Math.round(Math.log(2) / (SESSION.q_01 + SESSION.q_10) * 60)}min break, capture probability halves.` },
                    { icon: Lock, col: D.warn, title: "Scroll Inertia Model", body: `Passive state retention at ${Math.round(SESSION.A[1][1] * 100)}%. Once captured, doom is ${SESSION.doom_pull_index}× harder to escape.` },
                    { icon: Activity, col: D.safe, title: "Model Confidence", body: `${Math.round(SESSION.model_confidence * 100)}% personalized confidence. Significant accuracy gains expected at 20+ sessions.` },
                ].map(({ icon: Icon, col, title, body }) => (
                    <div key={title} className="card" style={{ padding: "14px", borderColor: col + "18" }}>
                        <div style={{ display: "flex", gap: 12 }}>
                            <div style={{
                                width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                                background: `${col}15`, border: `1px solid ${col}30`,
                                display: "flex", alignItems: "center", justifyContent: "center",
                            }}>
                                <Icon size={15} color={col} />
                            </div>
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: D.text, marginBottom: 4 }}>{title}</div>
                                <div style={{ fontSize: 12, color: D.muted, lineHeight: 1.5 }}>{body}</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

/* ─── SETTINGS SCREEN ───────────────────────────────────────────── */
const SettingsScreen = ({ onNav }) => {
    const [surveyProb, setSurveyProb] = useState(0.3);
    const [sleepStart, setSleepStart] = useState(23);
    const [sleepEnd, setSleepEnd] = useState(7);

    useEffect(() => {
        if (window.Android) {
            setSurveyProb(window.Android.getSurveyFrequency());
            const sleepStr = window.Android.getSleepSchedule();
            const [s, e] = sleepStr.split(",").map(Number);
            setSleepStart(s);
            setSleepEnd(e);
        }
    }, []);

    const handleSurveyChange = (e) => {
        const val = parseFloat(e.target.value);
        setSurveyProb(val);
        window.Android?.setSurveyFrequency(val);
    };

    const handleSleepChange = (type, val) => {
        const v = parseInt(val, 10);
        if (type === "start") {
            setSleepStart(v);
            window.Android?.setSleepSchedule(v, sleepEnd);
        } else {
            setSleepEnd(v);
            window.Android?.setSleepSchedule(sleepStart, v);
        }
    };

    return (
        <div className="slide-up" style={{ padding: "16px 16px 32px", position: "relative", zIndex: 1 }}>

            <div style={{ display: "flex", alignItems: "center", marginBottom: 20, padding: "14px 4px 0" }}>
                <Settings size={20} color={D.safe} style={{ filter: `drop-shadow(0 0 6px ${D.safe})`, marginRight: 10 }} />
                <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", letterSpacing: "0.05em" }}>SYSTEM PREFERENCES</div>
            </div>

            <div className="card" style={{ padding: "16px", marginBottom: 16 }}>
                <Label style={{ display: "block", marginBottom: 16, color: D.safe }}>Micro-Probe Calibration</Label>
                <div style={{ fontSize: 12, color: D.text, marginBottom: 16, lineHeight: 1.5 }}>
                    Adjust the frequency of active psychological surveys deployed during sessions. Lower frequencies may reduce model confidence accuracy.
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span className="mono" style={{ fontSize: 11, color: surveyProb === 0 ? D.muted : D.safe }}>{surveyProb === 0 ? "OFF" : surveyProb < 0.2 ? "LOW" : surveyProb < 0.6 ? "STANDARD" : "AGGRESSIVE"}</span>
                    <span className="mono" style={{ fontSize: 11, color: D.text }}>{Math.round(surveyProb * 100)}%</span>
                </div>
                <input type="range" min="0" max="1" step="0.1" value={surveyProb} onChange={handleSurveyChange}
                    style={{
                        width: "100%", height: 3, background: "rgba(13,223,242,0.2)", borderRadius: 2, appearance: "none", outline: "none",
                        accentColor: D.safe, marginTop: 4, marginBottom: 4
                    }}
                />
            </div>

            <div className="card" style={{ padding: "16px", marginBottom: 16 }}>
                <Label style={{ display: "block", marginBottom: 16, color: D.violet }}>Sleep Proximity Model</Label>
                <div style={{ fontSize: 12, color: D.text, marginBottom: 16, lineHeight: 1.5 }}>
                    Define typical sleep boundaries to calibrate ALSE circadian capture penalties. Activity inside these boundaries aggressively flags as 'Doom'.
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                        <Label style={{ fontSize: 9, display: "block", marginBottom: 6 }}>Bedtime Hour</Label>
                        <select value={sleepStart} onChange={(e) => handleSleepChange("start", e.target.value)}
                            style={{
                                width: "100%", padding: "10px", background: "rgba(0,0,0,0.5)", border: `1px solid ${D.border}`,
                                color: "#fff", borderRadius: 8, fontFamily: "Space Mono", fontSize: 14, outline: "none", cursor: "pointer"
                            }}>
                            {Array.from({ length: 24 }, (_, i) => (
                                <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <Label style={{ fontSize: 9, display: "block", marginBottom: 6 }}>Wake-up Hour</Label>
                        <select value={sleepEnd} onChange={(e) => handleSleepChange("end", e.target.value)}
                            style={{
                                width: "100%", padding: "10px", background: "rgba(0,0,0,0.5)", border: `1px solid ${D.border}`,
                                color: "#fff", borderRadius: 8, fontFamily: "Space Mono", fontSize: 14, outline: "none", cursor: "pointer"
                            }}>
                            {Array.from({ length: 24 }, (_, i) => (
                                <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="card card-danger" style={{ padding: "16px", marginBottom: 16 }}>
                <Label style={{ display: "block", marginBottom: 16, color: D.doom }}>Data Management</Label>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <button className="btn-primary" onClick={() => window.Android?.exportCsv()} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: `linear-gradient(135deg, ${D.muted}, #1a2436)`, color: "#fff", padding: "14px" }}>
                        <Download size={15} /> Export Behavioral Baseline
                    </button>
                    <button className="btn-primary" onClick={() => window.Android?.clearData()} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: `linear-gradient(135deg, ${D.doomMag}, #7a0854)`, color: "#fff", padding: "14px", boxShadow: `0 8px 32px ${D.doomMag}33` }}>
                        <Trash2 size={15} /> Flush Tracking Data
                    </button>
                </div>
            </div>

            <div style={{ textAlign: "center", marginTop: 24, marginBottom: 8 }}>
                <div className="mono" style={{ fontSize: 10, color: D.muted, letterSpacing: "0.15em" }}>ALSE ENGINE CONFIGURATION</div>
                <div className="mono" style={{ fontSize: 9, color: D.muted, marginTop: 4 }}>v3.0 INTEGRATION</div>
            </div>
        </div>
    );
};

/* ─── APP SHELL ─────────────────────────────────────────────────── */
export default function ReeliApp() {
    const [screen, setScreen] = useState("home");
    const [rawData, setRawData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isServiceActive, setIsServiceActive] = useState(false);

    useEffect(() => {
        if (window.Android) setIsServiceActive(window.Android.isAccessibilityEnabled());
        window.updateServiceStatus = (isActive) => setIsServiceActive(isActive);

        const handleData = (parsed) => {
            if (parsed.error) {
                setError(parsed.error);
            } else if (parsed.sessions && parsed.sessions.length > 0) {
                setRawData(parsed);
                setError(null);
            } else {
                setError("No sufficient data yet. Scroll a few more reels!");
            }
            setLoading(false);
        };

        window.reactDataCallback = handleData;
        if (window.injectedJsonData) handleData(window.injectedJsonData);

        const timer = setTimeout(() => {
            if (!window.injectedJsonData) {
                setLoading(false);
                setError("Waiting for Tracker injection... (Make sure accessibility service is active and you have scrolled Reels)");
            }
        }, 10000);
        return () => clearTimeout(timer);
    }, []);

    if (loading) return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: D.bg, color: D.text, fontFamily: 'Space Grotesk, sans-serif', flexDirection: "column", gap: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", border: `3px solid ${D.muted}`, borderTopColor: D.safe, animation: "spin 1s linear infinite" }} />
            <div className="mono" style={{ fontSize: 11, color: D.muted, letterSpacing: "0.2em" }}>INITIALIZING ENGINE...</div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );

    if (error) return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: D.bg, color: D.doom, fontFamily: 'Space Grotesk, sans-serif', padding: 20, textAlign: "center" }}>
            ⚠️ {error}
        </div>
    );

    if (!rawData) return null;

    const mostRecentSession = rawData.sessions[rawData.sessions.length - 1];
    const allSessionsSt = rawData.sessions.map(s => s.S_t);
    const avgSt = allSessionsSt.reduce((a, b) => a + b, 0) / rawData.sessions.length;
    const A = rawData.model_parameters.transition_matrix || [[0.8, 0.2], [0.2, 0.8]];

    const derivedSession = {
        ...mostRecentSession,
        doom_label: mostRecentSession.S_t > 0.6 ? "DOOM" : mostRecentSession.S_t > 0.35 ? "BORDERLINE" : "CASUAL",
        doom_score: mostRecentSession.S_t,
        model_confidence: Math.min(1.0, rawData.sessions.length / 20),
        doom_pull_index: ((A[0][1] / Math.max(0.01, A[1][0])) * 1.5).toFixed(1),
        regime_stability: 1.0 / (1.0 - A[1][1] + 0.001),
        regime_alert: mostRecentSession.S_t > (avgSt + 0.2),
        sessions_today: rawData.sessions.length,
        total_doom_sessions: rawData.sessions.filter(s => s.S_t > 0.65).length,
        total_interactions: rawData.sessions.reduce((acc, s) => acc + (s.likes || 0) + (s.comments || 0) + (s.shares || 0) + (s.saves || 0), 0),
        total_dwell_today_min: (rawData.sessions.length * 5),
        A: A,
        q_01: 0.31, q_10: 0.13, h: [0.156, 0.037],
        doom_components: {
            length: Math.random() * 0.5 + 0.4,
            volitional_conflict: Math.random() * 0.5 + 0.4,
            rapid_reentry: Math.random() * 0.5 + 0.4,
            automaticity: Math.random() * 0.5 + 0.4,
            dwell_collapse: Math.random() * 0.5 + 0.4,
            rewatch: Math.random() * 0.5 + 0.4,
            environment: Math.random() * 0.5 + 0.4,
        },
    };

    const derivedLive = {
        duration: "LIVE",
        reels: rawData.timeline?.p_capture?.length || 0,
        avg_dwell: 3.5,
    };

    const timelineData = (rawData.timeline?.p_capture || []).map((p, i) => ({
        r: i + 1, p,
        exit: Math.random() > 0.95,
        back: Math.random() > 0.95,
    }));

    const mockDays = Array.from({ length: 14 }, (_, i) => ({
        d: ["M", "T", "W", "T", "F", "S", "S"][i % 7],
        n: i + 8,
        v: parseFloat((avgSt * 0.7 + Math.random() * 0.3).toFixed(2)),
        s: Math.floor(2 + Math.random() * 5),
    }));

    return (
        <div style={{ display: "flex", justifyContent: "center", minHeight: "100vh", background: "#000", alignItems: "flex-start" }}>
            <Styles />
            <div className="app-shell" style={{ position: "relative" }}>
                <div className="scanlines" />
                <div className="scan" />

                {/* Top nav bar */}
                <div style={{
                    height: 44, display: "flex", alignItems: "center",
                    justifyContent: "space-between", padding: "0 20px",
                    position: "sticky", top: 0, zIndex: 100,
                    background: "rgba(5,5,10,0.9)", backdropFilter: "blur(20px)",
                    borderBottom: `1px solid ${D.border}`,
                }}>
                    {screen === "dashboard" ? (
                        <button onClick={() => setScreen("home")} style={{
                            background: "none", border: "none", cursor: "pointer",
                            display: "flex", alignItems: "center", gap: 4,
                            color: D.safe, fontFamily: "Space Grotesk", fontSize: 13, fontWeight: 600,
                        }}>
                            <ArrowLeft size={16} /> Home
                        </button>
                    ) : (
                        <div className="mono" style={{ fontSize: 11, color: D.muted }}>v3.0</div>
                    )}
                    <div className="mono" style={{ fontSize: 11, color: D.muted }}>SYNCED ▲</div>
                </div>

                {/* Scrollable content */}
                <div style={{ overflowY: "auto", height: "calc(100vh - 44px - 56px)" }}>
                    {screen === "home" ? <HomeScreen onNav={setScreen} SESSION={derivedSession} LIVE={derivedLive} isServiceActive={isServiceActive} />
                        : screen === "dashboard" ? <DashboardScreen SESSION={derivedSession} REELS_DATA={timelineData} DAYS_14={mockDays} />
                            : <SettingsScreen onNav={setScreen} />}
                </div>

                {/* Tab bar */}
                <div className="tab-bar">
                    {[
                        { id: "home", icon: Eye, label: "Monitor" },
                        { id: "dashboard", icon: BarChart2, label: "Dashboard" },
                        { id: "settings", icon: Settings, label: "Settings" },
                    ].map(({ id, icon: Icon, label }) => (
                        <button key={id} className={`tab-item ${screen === id ? "active" : ""}`}
                            onClick={() => setScreen(id)}>
                            <Icon size={20} />
                            <span>{label}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<ReeliApp />);