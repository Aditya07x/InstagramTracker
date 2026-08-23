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
    // 1. Color Palette: Warm Linen Paper Ground
    bg: "#F5F1EA",             // Warm linen / paper tone (#F5F1EA)
    cream: "#F5F1EA",
    paper: "#FAF8F5",          // Crisp warm paper background
    cardLight: "#FAF8F5",
    cardWhite: "#FFFFFF",
    section: "#EDE7DC",
    nav: "#EAE3D5",
    surface: "#FAF8F5",
    card: "#FAF8F5",

    // Primary Accent: Dusty Powder Blue (#A8C5D6 range)
    primary: "#A8C5D6",
    primaryDark: "#6E93A9",
    primarySoft: "#EBF2F7",
    powderBlue: "#A8C5D6",
    powderBlueDark: "#6E93A9",
    powderBlueSoft: "#EBF2F7",
    purple: "#A8C5D6",         // Alias for backward compatibility with active nav state
    purpleDark: "#6E93A9",
    purpleL: "#EBF2F7",
    brandMedium: "#85A8BD",
    brandSoft: "#EBF2F7",
    brandFaint: "#F4F8FA",

    // Secondary Accents (Soft, Muted Paper Tones)
    sage: "#9EB384",           // Soft Sage Green (stat card accent)
    sageSoft: "#F0F4EC",
    sageDark: "#6B8252",
    blush: "#E5C3C6",          // Soft Blush Pink (stat card accent)
    blushSoft: "#FAF0F2",
    blushDark: "#B88A8E",
    peach: "#F7D1BA",          // Muted Peach (stat card accent)
    peachSoft: "#FAF2EC",
    peachDark: "#C99A7F",
    lavender: "#E3DBF0",

    // Soft Charcoal Typography (No Pure Black)
    ink: "#2D3436",            // Primary soft charcoal
    ink2: "#545B5E",           // Secondary charcoal
    ink3: "#7F8C8D",           // Muted charcoal
    inkSoft: "#545B5E",
    text: "#2D3436",
    textBrand: "#6E93A9",
    soft: "#7F8C8D",
    muted: "#7F8C8D",

    // Paper Borders & Shadows
    border: "rgba(45, 52, 54, 0.10)",
    borderSoft: "rgba(45, 52, 54, 0.06)",
    paperShadow: "0 4px 16px -2px rgba(45, 52, 54, 0.07), 0 2px 5px -1px rgba(45, 52, 54, 0.04)",
    paperShadowLift: "0 8px 24px -4px rgba(45, 52, 54, 0.11), 0 3px 8px -2px rgba(45, 52, 54, 0.06)",

    // Calm Semantic Mapping (No Alarmist Reds/Oranges)
    safe: "#9EB384",           // Gentle Sage
    warn: "#F7D1BA",           // Muted Peach
    danger: "#E5C3C6",         // Soft Blush
    deepDoom: "#D4A5A9",
    info: "#A8C5D6",           // Powder Blue
    pink: "#E5C3C6",
    coral: "#E5C3C6",
    yellow: "#F7D1BA",
    blue: "#A8C5D6",
    green: "#9EB384",
    teal: "#9EB384",
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
            background: ${D.bg};
            background-image: 
                radial-gradient(rgba(45, 52, 54, 0.03) 1.2px, transparent 1.2px),
                linear-gradient(180deg, #F5F1EA 0%, #EFE8DC 100%);
            background-size: 18px 18px, 100% 100%;
            font-family: 'Space Grotesk', 'Nunito', sans-serif;
            font-weight: 600;
            color: ${D.text};
            position: relative;
            overflow: hidden;
            max-width: 520px;
            margin: 0 auto;
            min-height: 100vh;
        }

        .mono { font-family: 'Space Mono', monospace; }
        .spacemono { font-family: 'Space Mono', monospace; }
        .grotesk { font-family: 'Space Grotesk', sans-serif; font-weight: 700; }

        .scanlines {
            position: fixed; inset: 0;
            background: rgba(0,0,0,0.008);
            pointer-events: none; z-index: 1;
        }

        /* ── 2. Shape Language: Faceted Origami Cards ── */
        .card, .origami-card {
            background: ${D.paper};
            /* Angled top-right paper fold cut */
            clip-path: polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%);
            box-shadow: ${D.paperShadow};
            border: 1px solid ${D.borderSoft};
            position: relative;
            overflow: hidden;
            z-index: 2;
            transition: transform 0.22s cubic-bezier(0.34, 1.2, 0.64, 1), box-shadow 0.22s ease;
        }

        /* Gently-faceted / Hexagonal Card Frame (Hero Card) */
        .hex-card {
            background: ${D.paper};
            clip-path: polygon(14px 0, calc(100% - 14px) 0, 100% 14px, 100% calc(100% - 14px), calc(100% - 14px) 100%, 14px 100%, 0 calc(100% - 14px), 0 14px);
            box-shadow: ${D.paperShadowLift};
            border: 1px solid ${D.borderSoft};
            position: relative;
            overflow: hidden;
            z-index: 2;
            transition: transform 0.22s ease, box-shadow 0.22s ease;
        }

        /* Subtle Corner Origami Dog-Ear Fold Accent */
        .card::before, .hex-card::before {
            content: '';
            position: absolute;
            top: 0;
            right: 0;
            width: 0;
            height: 0;
            border-style: solid;
            border-width: 0 16px 16px 0;
            border-color: transparent rgba(45, 52, 54, 0.08) transparent transparent;
            pointer-events: none;
            z-index: 3;
        }

        .card::after, .hex-card::after {
            content: '';
            position: absolute;
            top: 0;
            right: 0;
            width: 0;
            height: 0;
            border-style: solid;
            border-width: 0 15px 15px 0;
            border-color: transparent ${D.bg} transparent transparent;
            pointer-events: none;
            z-index: 4;
        }

        /* ── Origami Fold Ribbon & Badges ── */
        .origami-tag {
            display: inline-flex;
            align-items: center;
            padding: 4px 12px;
            font-family: 'Space Grotesk', sans-serif;
            font-size: 10px;
            font-weight: 800;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            color: ${D.ink2};
            background: ${D.powderBlueSoft};
            border: 1px solid rgba(168, 197, 214, 0.35);
            clip-path: polygon(0 0, 100% 0, calc(100% - 6px) 50%, 100% 100%, 0 100%);
            box-shadow: 0 2px 6px rgba(45, 52, 54, 0.04);
        }

        .origami-tag-sage {
            background: ${D.sageSoft};
            border-color: rgba(158, 179, 132, 0.35);
            color: ${D.sageDark};
        }

        .origami-tag-blush {
            background: ${D.blushSoft};
            border-color: rgba(229, 195, 198, 0.35);
            color: ${D.blushDark};
        }

        .origami-tag-peach {
            background: ${D.peachSoft};
            border-color: rgba(247, 209, 186, 0.35);
            color: ${D.peachDark};
        }

        /* ── Origami Tab Bar Ribbon ── */
        .tab-bar {
            position: fixed; bottom: 0; left: 0; right: 0;
            z-index: 100;
            background: linear-gradient(180deg, #F5F1EA 0%, #EAE3D5 100%);
            display: flex;
            clip-path: polygon(12px 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%, 0 12px);
            box-shadow: 0 -6px 20px -2px rgba(45, 52, 54, 0.08);
            padding: 10px 16px 20px;
            border-top: 1px solid rgba(45, 52, 54, 0.08);
            max-width: 520px;
            margin: 0 auto;
        }

        .tab-item {
            flex: 1; padding: 8px;
            display: flex; flex-direction: column;
            align-items: center; gap: 4px;
            cursor: pointer; border: none;
            background: transparent; color: ${D.ink3};
            font-family: 'Space Grotesk', sans-serif; font-size: 10px;
            font-weight: 700; letter-spacing: 0.04em;
            transition: all 0.2s ease;
            clip-path: polygon(6px 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%, 0 6px);
        }

        .tab-item.active { 
            background: ${D.powderBlue};
            color: ${D.ink};
            box-shadow: 0 4px 12px rgba(168, 197, 214, 0.45);
            transform: translateY(-2px);
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
      border: 1px solid rgba(26,22,18,0.10);
      background: linear-gradient(145deg, #FFFFFF 0%, #F7F2EA 100%);
      color: ${D.ink2};
      border-radius: 20px;
      padding: 10px 18px;
      font-size: 12px;
      font-weight: 800;
      font-family: 'Space Grotesk', sans-serif;
      letter-spacing: 0.02em;
      white-space: nowrap;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.34,1.2,0.64,1);
      box-shadow: 0 3px 10px rgba(26,22,18,0.05);
    }

    .sub-tab.active {
      border-color: transparent;
      color: white;
      background: linear-gradient(135deg, ${D.purple} 0%, ${D.purpleDark} 100%);
      box-shadow: 0 6px 18px rgba(107,63,160,0.35);
      transform: scale(1.05) translateY(-1px);
    }
    
    .sub-tab:hover:not(.active) {
      border-color: rgba(107,63,160,0.2);
      background: rgba(107,63,160,0.04);
      transform: translateY(-1px);
    }

    .btn-primary {
      width: 100%;
      padding: 14px;
      border-radius: 18px;
      border: 1px solid rgba(255,255,255,0.2);
      cursor: pointer;
      font-family: 'Space Grotesk', sans-serif;
      font-size: 14px;
      font-weight: 700;
      background: linear-gradient(135deg, ${D.purple} 0%, ${D.purpleDark} 100%);
      color: ${D.cardWhite};
      box-shadow: 0 6px 18px rgba(107,63,160,0.3);
      transition: transform 0.15s, box-shadow 0.15s;
    }
    .btn-primary:active {
      transform: scale(0.98);
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
    if (s >= 70) return { label: "PAUSE & REFLECT", color: D.blushDark, hint: "A gentle break can refresh your mind" };
    if (s >= 45) return { label: "BUILDING MINDFULNESS", color: D.peachDark, hint: "Notice how your focus feels right now" };
    if (s >= 25) return { label: "PEACEFUL FLOW", color: D.powderBlueDark, hint: "You're keeping a gentle, steady pace" };
    return { label: "MINDFUL CALM", color: D.sageDark, hint: "Lovely focus and balance today" };
};

function getHeroSummary(data) {
    const score = safeNum(data.captureRiskScore, 0);
    const sessionsToday = safeNum(data.sessionsToday, 0);
    const capturedSessions = safeNum(data.capturedSessionsToday, 0);
    const mindfulSessions = Math.max(0, sessionsToday - capturedSessions);
    const capturedPct = sessionsToday > 0 ? Math.round((capturedSessions / sessionsToday) * 100) : null;
    const peakWindow = typeof data.peakRiskWindow === "string" ? data.peakRiskWindow : null;
    const safeWindow = typeof data.safestWindow === "string" ? data.safestWindow : null;

    if (sessionsToday === 0) {
        return {
            headline: "Fold your mind into calm.",
            subtext: "No sessions tracked yet today. Open Instagram when ready, Reelio keeps your pace light.",
            color: D.powderBlueDark
        };
    }
    if (score >= 70) {
        return {
            headline: "Fold your mind into calm.",
            subtext: `${mindfulSessions} of ${sessionsToday} sessions mindful today${safeWindow ? `. Your most balanced window: ${safeWindow}.` : "."}`,
            color: D.blushDark
        };
    } else if (score >= 45) {
        return {
            headline: "Finding your balance.",
            subtext: `${mindfulSessions} of ${sessionsToday} sessions mindful today${safeWindow ? `. Most peaceful window: ${safeWindow}.` : "."}`,
            color: D.peachDark
        };
    }
    return {
        headline: "A peaceful rhythm today.",
        subtext: `${mindfulSessions} of ${sessionsToday} sessions mindful today${safeWindow ? `. Best flow window: ${safeWindow}.` : "."}`,
        color: D.sageDark
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

// ─── 3. Iconography & Mascot Components ──────────────────────────────────────

const OrigamiCraneIcon = ({ size = 26, color = "#6E93A9" }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
        <polygon points="32,8 54,28 32,24" fill={color} opacity="0.9" />
        <polygon points="32,8 10,28 32,24" fill={color} opacity="0.75" />
        <polygon points="32,24 54,28 32,56" fill={color} opacity="0.6" />
        <polygon points="32,24 10,28 32,56" fill={color} opacity="0.4" />
        <polygon points="32,8 44,20 32,24" fill="#FFFFFF" opacity="0.4" />
        <line x1="32" y1="8" x2="32" y2="56" stroke={color} strokeWidth="1.5" opacity="0.8" />
    </svg>
);

const OrigamiMascot = ({ mood = "calm", size = 115 }) => {
    return (
        <svg width={size} height={size} viewBox="0 0 100 100" fill="none" style={{ display: 'block', margin: '0 auto' }}>
            <defs>
                <linearGradient id="origamiBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#C4DFEE" />
                    <stop offset="60%" stopColor="#A8C5D6" />
                    <stop offset="100%" stopColor="#8DAEC3" />
                </linearGradient>
                <linearGradient id="origamiEarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#EBF2F7" />
                    <stop offset="100%" stopColor="#C4DFEE" />
                </linearGradient>
            </defs>

            {/* Left Ear Fold */}
            <polygon points="22,18 42,42 16,46" fill="url(#origamiEarGrad)" />
            <polygon points="22,18 34,36 16,46" fill="rgba(255,255,255,0.4)" />

            {/* Right Ear Fold */}
            <polygon points="78,18 84,46 58,42" fill="url(#origamiEarGrad)" />
            <polygon points="78,18 84,46 66,36" fill="rgba(45,52,54,0.08)" />

            {/* Main Head Fold (Faceted Fox/Dog Face) */}
            <polygon points="50,22 84,46 50,84" fill="url(#origamiBodyGrad)" />
            <polygon points="50,22 16,46 50,84" fill="url(#origamiBodyGrad)" opacity="0.85" />

            {/* Facet Shadows for 3D Origami Depth */}
            <polygon points="50,22 50,84 66,48" fill="rgba(255,255,255,0.25)" />
            <polygon points="50,22 50,84 34,48" fill="rgba(45,52,54,0.08)" />

            {/* Folded Snout / Nose Origami Piece */}
            <polygon points="50,56 62,72 50,84" fill="#6E93A9" />
            <polygon points="50,56 38,72 50,84" fill="#5A7D93" />
            <polygon points="50,78 54,84 46,84" fill="#2D3436" />

            {/* Friendly Gentle Closed Eyes (Calm & Encouraging) */}
            <path d="M 32 46 Q 38 52 44 46" stroke="#2D3436" strokeWidth="3" strokeLinecap="round" fill="none" />
            <path d="M 56 46 Q 62 52 68 46" stroke="#2D3436" strokeWidth="3" strokeLinecap="round" fill="none" />

            {/* Gentle Blush Cheeks */}
            <circle cx="30" cy="54" r="5" fill="#E5C3C6" opacity="0.65" />
            <circle cx="70" cy="54" r="5" fill="#E5C3C6" opacity="0.65" />
        </svg>
    );
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
    // UI components & Mascot
    Label, EmptyState, CollapsibleSection, StatusPill, InsightBox, FactorIcon,
    OrigamiCraneIcon, OrigamiMascot,
    // Utilities
    isFiniteNumber, safeNum, maybeNum, safeArr, averageOf, sumOf,
    formatHour, formatHourWindow, normalizeDateKey, pickSessionTimestampMs,
    deriveSessionDurationSec, formatMin, formatDurationSec,
    parseActiveTimeSeconds, getRiskMeta, getHeroSummary,
    useCountUp, getAccuracyMeta, fadeDelayStyle,
};
