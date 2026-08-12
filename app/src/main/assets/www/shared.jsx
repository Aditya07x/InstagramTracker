// ─── Shared: globals, constants, utilities, base components ─────────────────
// All screens import from this file.

const { useState, useEffect, useRef, useMemo } = React;
const RechartsLib = window.Recharts || window.recharts || {};
const LucideLib = window.lucideReact || window.LucideReact || {};

const ChartNull = () => null;
const ChartPassThrough = ({ children }) => React.createElement(React.Fragment, null, children);
const ChartContainerFallback = ({ width = "100%", height = 120, children }) => {
    const w = typeof width === "number" ? `${width}px` : width;
    const h = typeof height === "number" ? `${height}px` : height;
    return React.createElement("div", { style: { width: w, height: h } }, children);
};

const IconFallback = ({ size = 16, color = "currentColor", style = {} }) => (
    React.createElement(
        "svg",
        {
            width: size,
            height: size,
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: color,
            strokeWidth: 2,
            strokeLinecap: "round",
            strokeLinejoin: "round",
            style: { display: "inline-block", verticalAlign: "middle", flexShrink: 0, ...style }
        },
        React.createElement("circle", { cx: "12", cy: "12", r: "8" })
    )
);

const {
    AreaChart = ChartPassThrough,
    Area = ChartNull,
    XAxis = ChartNull,
    YAxis = ChartNull,
    Tooltip = ChartNull,
    ResponsiveContainer = ChartContainerFallback,
    ReferenceLine = ChartNull,
    LineChart = ChartPassThrough,
    Line = ChartNull,
    BarChart = ChartPassThrough,
    Bar = ChartNull
} = RechartsLib;

const {
    Eye = IconFallback,
    Zap = IconFallback,
    Shield = IconFallback,
    Clock = IconFallback,
    Brain = IconFallback,
    Activity = IconFallback,
    AlertTriangle = IconFallback,
    ChevronRight = IconFallback,
    Radio = IconFallback,
    Download = IconFallback,
    Trash2 = IconFallback,
    Settings = IconFallback,
    ArrowLeft = IconFallback,
    TrendingDown = IconFallback,
    Lock = IconFallback,
    Cpu = IconFallback,
    BarChart2 = IconFallback,
    Moon = IconFallback,
    Battery = IconFallback,
    Wifi = IconFallback,
    ChevronUp = IconFallback,
    ChevronDown = IconFallback,
    Calendar = IconFallback,
    Target = IconFallback,
    Sparkles = IconFallback
} = LucideLib;

const D = {
    // ── Ground colours ──
    bg: "#EDE8DF",
    cream: "#EDE8DF",
    cardLight: "#F7F3EC",
    cardWhite: "#FDFAF6",
    section: "#E4DED4",
    nav: "#F0EBE2",
    surface: "#FDFAF6",
    card: "#F7F3EC",
    // ── Doom spectrum (only saturated colours) ──
    safe: "#3A9E6F",
    warn: "#C4973A",
    danger: "#C4563A",
    deepDoom: "#A03030",
    // ── Brand purple ──
    purple: "#6B3FA0",
    purpleDark: "#4A2580",
    purpleL: "#F3EFFA",
    brandMedium: "#9B6FCC",
    brandSoft: "#E8E0F5",
    brandFaint: "#F3EFFA",
    // ── Typography on cream ──
    ink: "#1A1612",
    ink2: "#6A5E56",
    ink3: "#9A8E84",
    inkSoft: "#6A5E56",
    text: "#1A1612",
    textBrand: "#6B3FA0",
    soft: "#9A8E84",
    muted: "#9A8E84",
    // ── Borders ──
    border: "rgba(26,22,18,0.10)",
    borderSoft: "rgba(26,22,18,0.06)",
    // ── Semantic aliases (map to doom spectrum) ──
    info: "#6B3FA0",
    pink: "#C4563A",
    coral: "#C4563A",
    yellow: "#C4973A",
    blue: "#6B3FA0",
    green: "#3A9E6F",
    sage: "#3A9E6F",
    lavender: "#E8E0F5",
    peach: "#C4973A",
    teal: "#3A9E6F",
};

const Styles = () => (
    <style>{`
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            -webkit-user-select: none;
            user-select: none;
            -webkit-touch-callout: none;
        }

    .app-shell {
      width: 100%;
      background: #EDE8DF;
      font-family: 'Nunito', sans-serif;
      font-weight: 600;
      color: ${D.text};
      position: relative;
      overflow: hidden;
      max-width: 520px;
      margin: 0 auto;
    }
    .mono  { font-family: 'Space Mono', monospace; }
    .spacemono { font-family: 'Space Mono', monospace; }
    .grotesk { font-family: 'Space Grotesk', sans-serif; font-weight: 700; }

    .scanlines {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.02);
      pointer-events: none; z-index: 1;
    }

    .card {
      background: ${D.cardWhite};
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border-radius: 20px;
      box-shadow: 0 4px 20px rgba(26,22,18,0.06), 0 1px 4px rgba(26,22,18,0.04);
      border: 1.5px solid ${D.borderSoft};
      position: relative;
      overflow: hidden;
      z-index: 2;
    }
    
    .card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
            background: rgba(107,63,160,0.15);
      opacity: 0.5;
    }

    .tab-bar {
      position: fixed; bottom: 0; left: 0; right: 0;
      z-index: 100;
            background: ${D.nav};
      display: flex;
      border-radius: 36px 36px 0 0;
      box-shadow: 0 -2px 16px rgba(26,22,18,0.08);
      padding: 10px 20px 20px;
      border-top: 1px solid rgba(26,22,18,0.06);
      max-width: 520px;
      margin: 0 auto;
    }
    .tab-item {
      flex: 1; padding: 6px 8px;
      display: flex; flex-direction: column;
      align-items: center; gap: 4px;
      cursor: pointer; border: none;
      background: transparent; color: ${D.ink3};
      font-family: 'Space Grotesk', sans-serif; font-size: 9px;
      font-weight: 800; letter-spacing: 0.04em;
      transition: all 0.2s;
      border-radius: 24px;
    }
    .tab-item.active { 
            background: ${D.purple};
      color: white;
      transform: scale(1.05);
    }

    .sub-tabs {
      display: flex;
      gap: 8px;
      overflow-x: auto;
      scrollbar-width: none;
      -ms-overflow-style: none;
    }
    .sub-tabs::-webkit-scrollbar { display: none; }

    .sub-tab {
      border: 2px solid ${D.borderSoft};
      background: ${D.cardWhite};
      color: ${D.ink2};
      border-radius: 999px;
      padding: 10px 18px;
      font-size: 12px;
      font-weight: 800;
      font-family: 'Space Grotesk', sans-serif;
      letter-spacing: 0.02em;
      white-space: nowrap;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.34,1.2,0.64,1);
      box-shadow: 0 2px 8px rgba(26,22,18,0.04);
    }

    .sub-tab.active {
      border-color: transparent;
      color: white;
            background: ${D.purple};
      box-shadow: 0 5px 20px rgba(107,63,160,0.3);
      transform: scale(1.06) translateY(-1px);
    }
    
    .sub-tab:hover:not(.active) {
      border-color: rgba(107,63,160,0.2);
      background: rgba(107,63,160,0.04);
      transform: translateY(-1px);
    }

    .btn-primary {
      width: 100%;
      padding: 14px;
      border-radius: 12px;
      border: none;
      cursor: pointer;
      font-family: 'Space Grotesk', sans-serif;
      font-size: 14px;
      font-weight: 700;
            background: ${D.purple};
      color: ${D.cardWhite};
    }

    .chip-strip {
      display: flex;
      gap: 8px;
      overflow-x: auto;
      padding-bottom: 2px;
      scrollbar-width: none;
      -ms-overflow-style: none;
    }
    .chip-strip::-webkit-scrollbar { display: none; }

    .chip {
      white-space: nowrap;
      border-radius: 999px;
      padding: 6px 10px;
      font-size: 12px;
      border: 1px solid transparent;
      background: rgba(255,255,255,0.04);
      color: #c3d0d0;
    }

    .fade-card {
      opacity: 0;
      transform: translateY(12px);
      animation: fadeSlideUp 380ms ease forwards;
    }

    @keyframes fadeSlideUp {
      from { opacity: 0; transform: translateY(16px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.15); }
    }

    @keyframes bounceIn {
      0% { opacity: 0; transform: scale(0.85); }
      60% { transform: scale(1.05); }
      100% { opacity: 1; transform: scale(1); }
    }

    @keyframes chipBounce {
      0% { opacity: 0; transform: scale(0); }
      70% { transform: scale(1.15); }
      100% { opacity: 1; transform: scale(1); }
    }

    @keyframes radarGrow {
      0% { opacity: 0; transform: scale(0.3); transform-origin: center; }
      60% { transform: scale(1.04); }
      100% { opacity: 1; transform: scale(1); }
    }

    @keyframes radarPulse {
      0%, 100% { opacity: 0.5; transform: scale(1); }
      50% { opacity: 1; transform: scale(1.15); }
    }

    @keyframes headerGlow {
      0%, 100% { box-shadow: 0 0 6px var(--header-glow-color, rgba(61,220,132,0.4)); }
      50% { box-shadow: 0 0 14px var(--header-glow-color, rgba(61,220,132,0.6)); }
    }

    @keyframes dotPulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(0.75); }
    }

    .hero-pulse { animation: pulse 2s ease-in-out infinite; }

    .ring-chip {
      position: absolute;
      width: 46px;
      height: 46px;
      border-radius: 50%;
      background: white;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 16px rgba(26,22,18,0.08);
      cursor: pointer;
      transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1);
      font-size: 18px;
      z-index: 2;
    }
    .ring-chip:hover { transform: scale(1.18); }

    .verdict-pill {
            background: ${D.brandSoft};
      border-radius: 28px;
      padding: 12px 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      position: relative;
      overflow: hidden;
      margin-top: 14px;
    }
    .verdict-pill::before {
      content: '';
      position: absolute;
      right: -20px;
      top: -20px;
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: rgba(255,210,63,0.12);
    }

    .factor {
      background: white;
      border-radius: 22px;
      margin-bottom: 10px;
      overflow: hidden;
      box-shadow: 0 3px 16px rgba(26,22,18,0.06);
      cursor: pointer;
      transition: all 0.25s cubic-bezier(0.34,1.2,0.64,1);
      border: 1.5px solid ${D.borderSoft};
    }
    .factor:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 28px rgba(26,22,18,0.08);
    }
    .factor:active { transform: scale(0.98); }

    .f-desc {
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.45s cubic-bezier(0.34,1,0.64,1), padding 0.45s;
            background: rgba(107,63,160,0.04);
      font-size: 12px;
      font-weight: 700;
      font-family: 'Nunito', sans-serif;
      color: ${D.inkSoft};
      line-height: 1.65;
    }
    .f-desc.open {
      max-height: 140px;
      padding: 14px 18px 16px;
    }
  `}</style>
);

// ─── Base UI components ───────────────────────────────────────────────────────

const Label = ({ children, style = {} }) => (
    <span style={{
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: 10,
        letterSpacing: "0.14em",
        color: D.soft,
        textTransform: "uppercase",
        fontWeight: 700,
        ...style
    }}>{children}</span>
);

function EmptyState({ message }) {
    return (
        <div style={{ textAlign: "center", padding: "28px 14px" }}>
            <div style={{
                width: 48, height: 48, borderRadius: 16,
                margin: "0 auto 12px",
                background: 'rgba(155,111,204,0.25)',
                border: `1.5px solid rgba(107,63,160,0.1)`,
                display: "flex", alignItems: "center", justifyContent: "center"
            }}>
                <Activity size={20} color={D.purple} />
            </div>
            <div style={{ 
                fontFamily: "'Nunito', sans-serif", 
                fontSize: 13, fontWeight: 700, 
                color: D.soft,
                lineHeight: 1.5
            }}>{message || "Not enough data yet"}</div>
        </div>
    );
}

function CollapsibleSection({ title, badge, defaultOpen = false, children }) {
    const [open, setOpen] = React.useState(defaultOpen);
    return React.createElement('div', { style: { marginBottom: 16 } },
        React.createElement('div', {
            onClick: () => setOpen(!open),
            style: {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '14px 18px',
                background: open ? 'rgba(107,63,160,0.04)' : 'rgba(232,224,245,0.5)',
                borderRadius: open ? '16px 16px 0 0' : 16,
                cursor: 'pointer',
                userSelect: 'none',
                border: '1.5px solid rgba(26,22,18,0.06)',
                borderBottom: open ? 'none' : '1.5px solid rgba(26,22,18,0.06)'
            }
        },
            React.createElement('span', {
                style: {
                    color: '#8338EC', fontSize: 11, letterSpacing: '0.12em',
                    textTransform: 'uppercase', fontWeight: 900,
                    fontFamily: "'Space Grotesk', sans-serif"
                }
            }, title),
            React.createElement('div', { style: { display: 'flex', gap: 8, alignItems: 'center' } },
                badge && React.createElement('span', {
                    style: {
                        background: 'rgba(255,0,110,0.2)', color: '#ff006e',
                        padding: '2px 8px', borderRadius: 4, fontSize: 11
                    }
                }, badge),
                React.createElement('span', {
                    style: {
                        color: '#666', fontSize: 18, transform: open ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.2s'
                    }
                }, '⌄')
            )
        ),
        open && React.createElement('div', {
            style: {
                background: 'rgba(255,255,255,0.7)',
                borderRadius: '0 0 16px 16px',
                border: '1.5px solid rgba(26,22,18,0.06)',
                borderTop: 'none',
                padding: 16
            }
        }, children)
    );
}

function StatusPill({ label, type }) {
    const colors = {
        safe: { bg: 'rgba(0,255,136,0.15)', border: '#00ff88', text: '#00ff88' },
        warning: { bg: 'rgba(255,171,0,0.15)', border: '#ffab00', text: '#ffab00' },
        danger: { bg: 'rgba(255,59,59,0.15)', border: '#ff3b3b', text: '#ff3b3b' },
        info: { bg: 'rgba(0,229,255,0.15)', border: '#00e5ff', text: '#00e5ff' },
        neutral: {
            bg: 'rgba(255,255,255,0.08)', border: 'rgba(255,255,255,0.2)',
            text: '#999'
        }
    };
    const c = colors[type] || colors.neutral;
    return React.createElement('span', {
        style: {
            background: c.bg,
            border: `1px solid ${c.border}`,
            color: c.text,
            padding: '3px 10px',
            borderRadius: 20,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.06em',
            whiteSpace: 'nowrap',
            boxShadow: '0 0 8px currentColor'
        }
    }, label);
}

const InsightBox = ({ body }) => (
    <div style={{
        background: 'rgba(0, 229, 255, 0.06)',
        borderLeft: '3px solid rgba(0, 229, 255, 0.4)',
        borderRadius: 8,
        padding: '14px 16px'
    }}>
        <div style={{ color: '#00e5ff', fontWeight: 700, marginBottom: 6 }}>What this means:</div>
        <div style={{ color: '#b0b8b8', fontSize: 14, lineHeight: 1.6 }}>{body}</div>
    </div>
);

// ─── Utility functions ────────────────────────────────────────────────────────

const isFiniteNumber = (v) => (typeof v === "number" && Number.isFinite(v));
const safeNum = (v, fallback = 0) => (isFiniteNumber(v) ? v : fallback);
const maybeNum = (v) => (isFiniteNumber(v) ? v : null);
const safeArr = (v) => (Array.isArray(v) ? v : []);

const averageOf = (vals) => {
    const nums = safeArr(vals).filter(isFiniteNumber);
    if (!nums.length) return null;
    return nums.reduce((acc, n) => acc + n, 0) / nums.length;
};

const sumOf = (vals) => safeArr(vals).filter(isFiniteNumber).reduce((acc, n) => acc + n, 0);

const formatHour = (hour) => `${String((hour + 24) % 24).padStart(2, "0")}:00`;

const formatHourWindow = (hour, span = 2) => {
    if (!isFiniteNumber(hour)) return null;
    const h = ((Math.round(hour) % 24) + 24) % 24;
    const end = (h + span) % 24;
    return `${formatHour(h)}-${formatHour(end)}`;
};

const normalizeDateKey = (session) => {
    const startRaw = session?.startTime;
    if (typeof startRaw === "string" && startRaw && startRaw !== "Unknown") {
        const match = startRaw.match(/^(\d{4}-\d{2}-\d{2})[T\s]/);
        if (match) return match[1];

        const dt = new Date(startRaw);
        if (!Number.isNaN(dt.getTime())) {
            // Use LOCAL date components to avoid timezone cross-day misclassification.
            // Python timestamps are in device-local time (no timezone suffix); UTC-based
            // .toISOString() shifts after-midnight sessions into the previous UTC day.
            const y = dt.getFullYear();
            const mo = String(dt.getMonth() + 1).padStart(2, '0');
            const d = String(dt.getDate()).padStart(2, '0');
            return `${y}-${mo}-${d}`;
        }
    }
    const dateRaw = String(session?.date || "").trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) return dateRaw;
    if (/^\d{2}-\d{2}$/.test(dateRaw)) {
        const year = new Date().getFullYear();
        return `${year}-${dateRaw}`;
    }
    return null;
};

const pickSessionTimestampMs = (session) => {
    const startRaw = session?.startTime;
    if (typeof startRaw === "string" && startRaw && startRaw !== "Unknown") {
        const ms = Date.parse(startRaw);
        if (!Number.isNaN(ms)) return ms;
    }
    return null;
};

const deriveSessionDurationSec = (session) => {
    const explicitSec =
        maybeNum(session?.durationSec) ??
        maybeNum(session?.sessionDurationSec) ??
        maybeNum(session?.totalDurationSec);
    if (isFiniteNumber(explicitSec) && explicitSec > 0) return explicitSec;
    const reels = maybeNum(session?.nReels);
    const dwell = maybeNum(session?.avgDwell);
    if (isFiniteNumber(reels) && reels > 0 && isFiniteNumber(dwell) && dwell > 0) {
        return reels * dwell;
    }
    return null;
};

const formatMin = (min) => {
    const m = safeNum(min, 0);
    if (m < 1) return `${Math.round(m * 60)}s`;
    const hh = Math.floor(m / 60);
    const mm = Math.floor(m % 60);
    if (hh > 0) return `${hh}h ${mm}m`;
    return `${mm}m`;
};

const formatDurationSec = (sec) => {
    const s = Math.round(safeNum(sec, 0));
    const m = Math.floor(s / 60);
    const r = s % 60;
    if (m > 0) return `${m}m ${r}s`;
    return `${r}s`;
};

const parseActiveTimeSeconds = (str, fallback = 0) => {
    if (typeof str !== "string" || !str.trim()) return fallback;
    let total = 0;
    const m = str.match(/(\d+)m/);
    const s = str.match(/(\d+)s/);
    const h = str.match(/(\d+)h/);
    if (h) total += parseInt(h[1], 10) * 3600;
    if (m) total += parseInt(m[1], 10) * 60;
    if (s) total += parseInt(s[1], 10);
    return total || fallback;
};

const getRiskMeta = (score) => {
    const s = safeNum(score, 0);
    if (s >= 70) return { label: "CRITICAL", color: D.danger, hint: "Exit Instagram 2 reels earlier than you want to" };
    if (s >= 45) return { label: "ELEVATED", color: D.warn, hint: "Watch your session length today" };
    if (s >= 25) return { label: "STABLE", color: D.info, hint: "You're building a good pattern" };
    return { label: "SAFE", color: D.safe, hint: "Great consistency this week" };
};

function getHeroSummary(data) {
    const score = safeNum(data.captureRiskScore, 0);
    const sessionsToday = safeNum(data.sessionsToday, 0);
    const capturedSessions = safeNum(data.capturedSessionsToday, 0);
    const capturedPct = sessionsToday > 0 ? Math.round((capturedSessions / sessionsToday) * 100) : null;
    const peakWindow = typeof data.peakRiskWindow === "string" ? data.peakRiskWindow : null;
    const safeWindow = typeof data.safestWindow === "string" ? data.safestWindow : null;

    if (sessionsToday === 0) {
        return {
            headline: "No sessions tracked today yet.",
            subtext: "Open Instagram as usual. Reelio will update your score after your next session.",
            color: D.info
        };
    }
    if (score >= 70) {
        return {
            headline: "High autopilot risk right now.",
            subtext: `Captured in ${capturedSessions}/${sessionsToday} sessions${capturedPct !== null ? ` (${capturedPct}%)` : ""}${peakWindow ? `. Peak risk window: ${peakWindow}.` : "."}`,
            color: D.danger
        };
    } else if (score >= 45) {
        return {
            headline: "Mixed signals today.",
            subtext: `Captured in ${capturedSessions}/${sessionsToday} sessions${capturedPct !== null ? ` (${capturedPct}%)` : ""}${safeWindow ? `. Lowest-risk window: ${safeWindow}.` : "."}`,
            color: D.warn
        };
    }
    return {
        headline: "You are staying in control.",
        subtext: `Only ${capturedSessions} of ${sessionsToday} sessions crossed into autopilot${safeWindow ? `. Your lowest-risk window is ${safeWindow}.` : "."}`,
        color: D.safe
    };
}

function useCountUp(targetValue, duration = 600) {
    const [value, setValue] = useState(0);
    const startedRef = useRef(false);

    useEffect(() => {
        const target = safeNum(targetValue, 0);
        if (startedRef.current) {
            setValue(target);
            return;
        }
        startedRef.current = true;
        const start = performance.now();
        let raf = 0;
        const tick = (now) => {
            const p = Math.min(1, (now - start) / duration);
            setValue(Math.round(target * p));
            if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [targetValue, duration]);

    return value;
}

const getAccuracyMeta = (confidence) => {
    if (!isFiniteNumber(confidence)) {
        return { show: false, needed: null, known: false };
    }
    const conf = confidence;
    if (conf >= 0.6) {
        return { show: true, value: `${Math.round(conf * 100)}%`, known: true };
    }
    const needed = Math.max(0, Math.ceil((0.6 - conf) * 20));
    return { show: false, needed, known: true };
};

const fadeDelayStyle = (idx) => ({ animationDelay: `${idx * 50}ms` });

// ─── Pure SVG Factor Icons ────────────────────────────────────────────────────
const FactorIcon = ({ type, size = 22, color = "white" }) => {
    const s = size;
    const props = { width: s, height: s, viewBox: "0 0 24 24", fill: "none", style: { display: 'block', flexShrink: 0 } };

    switch (type) {
        case 'session':
            return (
                <svg {...props}>
                    <path d="M6 2h12v5l-4 5 4 5v5H6v-5l4-5-4-5V2z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" fill="none"/>
                    <path d="M6 7h12" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
                    <path d="M6 17h12" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
                    <path d="M9 17c0-1.5 1.5-2.5 3-3s3-1.5 3-3" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
                </svg>
            );
        case 'rewatch':
            return (
                <svg {...props}>
                    <ellipse cx="12" cy="12" rx="9" ry="5.5" stroke={color} strokeWidth="1.8" fill="none"/>
                    <circle cx="12" cy="12" r="3" stroke={color} strokeWidth="1.8" fill="none"/>
                    <circle cx="12" cy="12" r="1.2" fill={color}/>
                    <path d="M4 8 Q12 3 20 8" stroke={color} strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.45"/>
                </svg>
            );
        case 'reentry':
            return (
                <svg {...props}>
                    <path d="M13 2L4.5 13.5H11L10 22L19.5 10.5H13L13 2Z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" fill={color} fillOpacity="0.25"/>
                    <path d="M13 2L4.5 13.5H11L10 22L19.5 10.5H13L13 2Z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" fill="none"/>
                </svg>
            );
        case 'scroll':
            return (
                <svg {...props}>
                    <rect x="8" y="10" width="8" height="12" rx="4" stroke={color} strokeWidth="1.8" fill="none"/>
                    <line x1="12" y1="10" x2="12" y2="6" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
                    <path d="M9 6 L12 2 L15 6" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                    <line x1="8" y1="16" x2="16" y2="16" stroke={color} strokeWidth="1.4" strokeLinecap="round" opacity="0.5"/>
                </svg>
            );
        case 'dwell':
            return (
                <svg {...props}>
                    <rect x="3" y="4" width="4" height="16" rx="2" fill={color} opacity="0.9"/>
                    <rect x="10" y="7" width="4" height="13" rx="2" fill={color} opacity="0.7"/>
                    <rect x="17" y="11" width="4" height="9" rx="2" fill={color} opacity="0.5"/>
                    <path d="M3 20 L21 20" stroke={color} strokeWidth="1.2" strokeLinecap="round" opacity="0.3"/>
                </svg>
            );
        case 'exit':
            return (
                <svg {...props}>
                    <path d="M13 4H5a1 1 0 00-1 1v14a1 1 0 001 1h8" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                    <path d="M16 8l4 4-4 4" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                    <line x1="9" y1="12" x2="20" y2="12" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
                    <line x1="9" y1="9" x2="9" y2="15" stroke={color} strokeWidth="1.4" strokeLinecap="round" opacity="0.5"/>
                </svg>
            );
        case 'environment':
            return (
                <svg {...props}>
                    <path d="M21 12.5A9 9 0 1111.5 3a7 7 0 009.5 9.5z" stroke={color} strokeWidth="1.8" strokeLinecap="round" fill={color} fillOpacity="0.15"/>
                    <path d="M17 8l-1.5 3H18l-2 4" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                </svg>
            );
        case 'cumulative':
            return (
                <svg {...props}>
                    <ellipse cx="12" cy="17" rx="8" ry="3" stroke={color} strokeWidth="1.6" fill="none" opacity="0.5"/>
                    <ellipse cx="12" cy="12" rx="8" ry="3" stroke={color} strokeWidth="1.6" fill="none" opacity="0.7"/>
                    <ellipse cx="12" cy="7"  rx="8" ry="3" stroke={color} strokeWidth="1.8" fill="none"/>
                    <line x1="4"  y1="7"  x2="4"  y2="17" stroke={color} strokeWidth="1.4" opacity="0.4"/>
                    <line x1="20" y1="7"  x2="20" y2="17" stroke={color} strokeWidth="1.4" opacity="0.4"/>
                </svg>
            );
        default:
            return (
                <svg {...props}>
                    <circle cx="12" cy="12" r="8" stroke={color} strokeWidth="1.8" fill="none"/>
                    <circle cx="12" cy="12" r="2" fill={color}/>
                </svg>
            );
    }
};

// ─── Exports ──────────────────────────────────────────────────────────────────
export {
    // React hooks
    useState, useEffect, useRef, useMemo,
    // Recharts
    AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
    LineChart, Line, BarChart, Bar,
    // Lucide icons
    Eye, Zap, Shield, Clock, Brain, Activity, AlertTriangle, ChevronRight,
    Radio, Download, Trash2, Settings, ArrowLeft, TrendingDown, Lock, Cpu,
    BarChart2, Moon, Battery, Wifi, ChevronUp, ChevronDown, Calendar,
    Target, Sparkles,
    // Constants & styles
    D, Styles,
    // UI components
    Label, EmptyState, CollapsibleSection, StatusPill, InsightBox, FactorIcon,
    // Utilities
    isFiniteNumber, safeNum, maybeNum, safeArr, averageOf, sumOf,
    formatHour, formatHourWindow, normalizeDateKey, pickSessionTimestampMs,
    deriveSessionDurationSec, formatMin, formatDurationSec,
    parseActiveTimeSeconds, getRiskMeta, getHeroSummary,
    useCountUp, getAccuracyMeta, fadeDelayStyle,
};
