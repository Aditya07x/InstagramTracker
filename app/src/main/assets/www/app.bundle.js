(() => {
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
  const IconFallback = ({ size = 16, color = "currentColor", style = {} }) => React.createElement(
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
    teal: "#3A9E6F"
  };
  const Styles = () => /* @__PURE__ */ React.createElement("style", null, `
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
  `);
  const Label = ({ children, style = {} }) => /* @__PURE__ */ React.createElement("span", { style: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 10,
    letterSpacing: "0.14em",
    color: D.soft,
    textTransform: "uppercase",
    fontWeight: 700,
    ...style
  } }, children);
  function EmptyState({ message }) {
    return /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", padding: "28px 14px" } }, /* @__PURE__ */ React.createElement("div", { style: {
      width: 48,
      height: 48,
      borderRadius: 16,
      margin: "0 auto 12px",
      background: "rgba(155,111,204,0.25)",
      border: `1.5px solid rgba(107,63,160,0.1)`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    } }, /* @__PURE__ */ React.createElement(Activity, { size: 20, color: D.purple })), /* @__PURE__ */ React.createElement("div", { style: {
      fontFamily: "'Nunito', sans-serif",
      fontSize: 13,
      fontWeight: 700,
      color: D.soft,
      lineHeight: 1.5
    } }, message || "Not enough data yet"));
  }
  function CollapsibleSection({ title, badge, defaultOpen = false, children }) {
    const [open, setOpen] = React.useState(defaultOpen);
    return React.createElement(
      "div",
      { style: { marginBottom: 16 } },
      React.createElement(
        "div",
        {
          onClick: () => setOpen(!open),
          style: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "14px 18px",
            background: open ? "rgba(107,63,160,0.04)" : "rgba(232,224,245,0.5)",
            borderRadius: open ? "16px 16px 0 0" : 16,
            cursor: "pointer",
            userSelect: "none",
            border: "1.5px solid rgba(26,22,18,0.06)",
            borderBottom: open ? "none" : "1.5px solid rgba(26,22,18,0.06)"
          }
        },
        React.createElement("span", {
          style: {
            color: "#8338EC",
            fontSize: 11,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            fontWeight: 900,
            fontFamily: "'Space Grotesk', sans-serif"
          }
        }, title),
        React.createElement(
          "div",
          { style: { display: "flex", gap: 8, alignItems: "center" } },
          badge && React.createElement("span", {
            style: {
              background: "rgba(255,0,110,0.2)",
              color: "#ff006e",
              padding: "2px 8px",
              borderRadius: 4,
              fontSize: 11
            }
          }, badge),
          React.createElement("span", {
            style: {
              color: "#666",
              fontSize: 18,
              transform: open ? "rotate(180deg)" : "none",
              transition: "transform 0.2s"
            }
          }, "\u2304")
        )
      ),
      open && React.createElement("div", {
        style: {
          background: "rgba(255,255,255,0.7)",
          borderRadius: "0 0 16px 16px",
          border: "1.5px solid rgba(26,22,18,0.06)",
          borderTop: "none",
          padding: 16
        }
      }, children)
    );
  }
  function StatusPill({ label, type }) {
    const colors = {
      safe: { bg: "rgba(0,255,136,0.15)", border: "#00ff88", text: "#00ff88" },
      warning: { bg: "rgba(255,171,0,0.15)", border: "#ffab00", text: "#ffab00" },
      danger: { bg: "rgba(255,59,59,0.15)", border: "#ff3b3b", text: "#ff3b3b" },
      info: { bg: "rgba(0,229,255,0.15)", border: "#00e5ff", text: "#00e5ff" },
      neutral: {
        bg: "rgba(255,255,255,0.08)",
        border: "rgba(255,255,255,0.2)",
        text: "#999"
      }
    };
    const c = colors[type] || colors.neutral;
    return React.createElement("span", {
      style: {
        background: c.bg,
        border: `1px solid ${c.border}`,
        color: c.text,
        padding: "3px 10px",
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.06em",
        whiteSpace: "nowrap",
        boxShadow: "0 0 8px currentColor"
      }
    }, label);
  }
  const InsightBox = ({ body }) => /* @__PURE__ */ React.createElement("div", { style: {
    background: "rgba(0, 229, 255, 0.06)",
    borderLeft: "3px solid rgba(0, 229, 255, 0.4)",
    borderRadius: 8,
    padding: "14px 16px"
  } }, /* @__PURE__ */ React.createElement("div", { style: { color: "#00e5ff", fontWeight: 700, marginBottom: 6 } }, "What this means:"), /* @__PURE__ */ React.createElement("div", { style: { color: "#b0b8b8", fontSize: 14, lineHeight: 1.6 } }, body));
  const isFiniteNumber = (v) => typeof v === "number" && Number.isFinite(v);
  const safeNum = (v, fallback = 0) => isFiniteNumber(v) ? v : fallback;
  const maybeNum = (v) => isFiniteNumber(v) ? v : null;
  const safeArr = (v) => Array.isArray(v) ? v : [];
  const averageOf = (vals) => {
    const nums = safeArr(vals).filter(isFiniteNumber);
    if (!nums.length) return null;
    return nums.reduce((acc, n) => acc + n, 0) / nums.length;
  };
  const sumOf = (vals) => safeArr(vals).filter(isFiniteNumber).reduce((acc, n) => acc + n, 0);
  const formatHour = (hour) => `${String((hour + 24) % 24).padStart(2, "0")}:00`;
  const formatHourWindow = (hour, span = 2) => {
    if (!isFiniteNumber(hour)) return null;
    const h = (Math.round(hour) % 24 + 24) % 24;
    const end = (h + span) % 24;
    return `${formatHour(h)}-${formatHour(end)}`;
  };
  const normalizeDateKey = (session) => {
    const startRaw = session?.startTime;
    if (typeof startRaw === "string" && startRaw && startRaw !== "Unknown") {
      const dt = new Date(startRaw);
      if (!Number.isNaN(dt.getTime())) {
        const y = dt.getFullYear();
        const mo = String(dt.getMonth() + 1).padStart(2, "0");
        const d = String(dt.getDate()).padStart(2, "0");
        return `${y}-${mo}-${d}`;
      }
    }
    const dateRaw = String(session?.date || "").trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) return dateRaw;
    if (/^\d{2}-\d{2}$/.test(dateRaw)) {
      const year = (/* @__PURE__ */ new Date()).getFullYear();
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
    const explicitSec = maybeNum(session?.durationSec) ?? maybeNum(session?.sessionDurationSec) ?? maybeNum(session?.totalDurationSec);
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
    const capturedPct = sessionsToday > 0 ? Math.round(capturedSessions / sessionsToday * 100) : null;
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
  const FactorIcon = ({ type, size = 22, color = "white" }) => {
    const s = size;
    const props = { width: s, height: s, viewBox: "0 0 24 24", fill: "none", style: { display: "block", flexShrink: 0 } };
    switch (type) {
      case "session":
        return /* @__PURE__ */ React.createElement("svg", { ...props }, /* @__PURE__ */ React.createElement("path", { d: "M6 2h12v5l-4 5 4 5v5H6v-5l4-5-4-5V2z", stroke: color, strokeWidth: "1.8", strokeLinejoin: "round", fill: "none" }), /* @__PURE__ */ React.createElement("path", { d: "M6 7h12", stroke: color, strokeWidth: "1.8", strokeLinecap: "round" }), /* @__PURE__ */ React.createElement("path", { d: "M6 17h12", stroke: color, strokeWidth: "1.8", strokeLinecap: "round" }), /* @__PURE__ */ React.createElement("path", { d: "M9 17c0-1.5 1.5-2.5 3-3s3-1.5 3-3", stroke: color, strokeWidth: "1.5", strokeLinecap: "round", opacity: "0.6" }));
      case "rewatch":
        return /* @__PURE__ */ React.createElement("svg", { ...props }, /* @__PURE__ */ React.createElement("ellipse", { cx: "12", cy: "12", rx: "9", ry: "5.5", stroke: color, strokeWidth: "1.8", fill: "none" }), /* @__PURE__ */ React.createElement("circle", { cx: "12", cy: "12", r: "3", stroke: color, strokeWidth: "1.8", fill: "none" }), /* @__PURE__ */ React.createElement("circle", { cx: "12", cy: "12", r: "1.2", fill: color }), /* @__PURE__ */ React.createElement("path", { d: "M4 8 Q12 3 20 8", stroke: color, strokeWidth: "1.2", strokeLinecap: "round", fill: "none", opacity: "0.45" }));
      case "reentry":
        return /* @__PURE__ */ React.createElement("svg", { ...props }, /* @__PURE__ */ React.createElement("path", { d: "M13 2L4.5 13.5H11L10 22L19.5 10.5H13L13 2Z", stroke: color, strokeWidth: "1.8", strokeLinejoin: "round", fill: color, fillOpacity: "0.25" }), /* @__PURE__ */ React.createElement("path", { d: "M13 2L4.5 13.5H11L10 22L19.5 10.5H13L13 2Z", stroke: color, strokeWidth: "1.8", strokeLinejoin: "round", fill: "none" }));
      case "scroll":
        return /* @__PURE__ */ React.createElement("svg", { ...props }, /* @__PURE__ */ React.createElement("rect", { x: "8", y: "10", width: "8", height: "12", rx: "4", stroke: color, strokeWidth: "1.8", fill: "none" }), /* @__PURE__ */ React.createElement("line", { x1: "12", y1: "10", x2: "12", y2: "6", stroke: color, strokeWidth: "1.8", strokeLinecap: "round" }), /* @__PURE__ */ React.createElement("path", { d: "M9 6 L12 2 L15 6", stroke: color, strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", fill: "none" }), /* @__PURE__ */ React.createElement("line", { x1: "8", y1: "16", x2: "16", y2: "16", stroke: color, strokeWidth: "1.4", strokeLinecap: "round", opacity: "0.5" }));
      case "dwell":
        return /* @__PURE__ */ React.createElement("svg", { ...props }, /* @__PURE__ */ React.createElement("rect", { x: "3", y: "4", width: "4", height: "16", rx: "2", fill: color, opacity: "0.9" }), /* @__PURE__ */ React.createElement("rect", { x: "10", y: "7", width: "4", height: "13", rx: "2", fill: color, opacity: "0.7" }), /* @__PURE__ */ React.createElement("rect", { x: "17", y: "11", width: "4", height: "9", rx: "2", fill: color, opacity: "0.5" }), /* @__PURE__ */ React.createElement("path", { d: "M3 20 L21 20", stroke: color, strokeWidth: "1.2", strokeLinecap: "round", opacity: "0.3" }));
      case "exit":
        return /* @__PURE__ */ React.createElement("svg", { ...props }, /* @__PURE__ */ React.createElement("path", { d: "M13 4H5a1 1 0 00-1 1v14a1 1 0 001 1h8", stroke: color, strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", fill: "none" }), /* @__PURE__ */ React.createElement("path", { d: "M16 8l4 4-4 4", stroke: color, strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", fill: "none" }), /* @__PURE__ */ React.createElement("line", { x1: "9", y1: "12", x2: "20", y2: "12", stroke: color, strokeWidth: "1.8", strokeLinecap: "round" }), /* @__PURE__ */ React.createElement("line", { x1: "9", y1: "9", x2: "9", y2: "15", stroke: color, strokeWidth: "1.4", strokeLinecap: "round", opacity: "0.5" }));
      case "environment":
        return /* @__PURE__ */ React.createElement("svg", { ...props }, /* @__PURE__ */ React.createElement("path", { d: "M21 12.5A9 9 0 1111.5 3a7 7 0 009.5 9.5z", stroke: color, strokeWidth: "1.8", strokeLinecap: "round", fill: color, fillOpacity: "0.15" }), /* @__PURE__ */ React.createElement("path", { d: "M17 8l-1.5 3H18l-2 4", stroke: color, strokeWidth: "1.6", strokeLinecap: "round", strokeLinejoin: "round", fill: "none" }));
      case "cumulative":
        return /* @__PURE__ */ React.createElement("svg", { ...props }, /* @__PURE__ */ React.createElement("ellipse", { cx: "12", cy: "17", rx: "8", ry: "3", stroke: color, strokeWidth: "1.6", fill: "none", opacity: "0.5" }), /* @__PURE__ */ React.createElement("ellipse", { cx: "12", cy: "12", rx: "8", ry: "3", stroke: color, strokeWidth: "1.6", fill: "none", opacity: "0.7" }), /* @__PURE__ */ React.createElement("ellipse", { cx: "12", cy: "7", rx: "8", ry: "3", stroke: color, strokeWidth: "1.8", fill: "none" }), /* @__PURE__ */ React.createElement("line", { x1: "4", y1: "7", x2: "4", y2: "17", stroke: color, strokeWidth: "1.4", opacity: "0.4" }), /* @__PURE__ */ React.createElement("line", { x1: "20", y1: "7", x2: "20", y2: "17", stroke: color, strokeWidth: "1.4", opacity: "0.4" }));
      default:
        return /* @__PURE__ */ React.createElement("svg", { ...props }, /* @__PURE__ */ React.createElement("circle", { cx: "12", cy: "12", r: "8", stroke: color, strokeWidth: "1.8", fill: "none" }), /* @__PURE__ */ React.createElement("circle", { cx: "12", cy: "12", r: "2", fill: color }));
    }
  };
  const STATE = {
    doom: {
      heroBg: "#F5EDE9",
      heroText: "#1A1612",
      heroMute: "#6A5E56",
      label: "DOOM SCROLLING",
      headline: "Deep in the\nscroll trap.",
      accent: "#C4563A"
    },
    hooked: {
      heroBg: "#F5F0E2",
      heroText: "#1A1612",
      heroMute: "#6A5E56",
      label: "HOOKED",
      headline: "Running on\nautopilot.",
      accent: "#C4973A"
    },
    aware: {
      heroBg: "#E8E0F5",
      heroText: "#1A1612",
      heroMute: "#6A5E56",
      label: "AWARE",
      headline: "Mostly\nin control.",
      accent: "#6B3FA0"
    },
    mindful: {
      heroBg: "#EAF3EE",
      heroText: "#1A1612",
      heroMute: "#6A5E56",
      label: "MINDFUL",
      headline: "Scrolling with\nintention.",
      accent: "#3A9E6F"
    }
  };
  const getState = (s) => s >= 70 ? STATE.doom : s >= 45 ? STATE.hooked : s >= 25 ? STATE.aware : STATE.mindful;
  const MoodFace = ({ score, size = 100 }) => {
    const r = size / 2;
    const type = score >= 70 ? "doom" : score >= 45 ? "hooked" : score >= 25 ? "aware" : "mindful";
    const state = getState(score);
    const bg = state.accent;
    const ink = "#1A1612";
    const scale = size / 100;
    const faces = {
      mindful: /* @__PURE__ */ React.createElement("g", { transform: `scale(${scale})` }, /* @__PURE__ */ React.createElement("circle", { cx: "35", cy: "35", r: "22", fill: bg }), /* @__PURE__ */ React.createElement("circle", { cx: "65", cy: "35", r: "22", fill: bg }), /* @__PURE__ */ React.createElement("circle", { cx: "35", cy: "65", r: "22", fill: bg }), /* @__PURE__ */ React.createElement("circle", { cx: "65", cy: "65", r: "22", fill: bg }), /* @__PURE__ */ React.createElement("rect", { x: "35", y: "35", width: "30", height: "30", fill: bg }), /* @__PURE__ */ React.createElement("path", { d: "M 32 48 Q 38 56 44 48 M 56 48 Q 62 56 68 48", stroke: ink, strokeWidth: "4", strokeLinecap: "round", fill: "none" }), /* @__PURE__ */ React.createElement("path", { d: "M 42 62 Q 50 70 58 62", stroke: ink, strokeWidth: "4", strokeLinecap: "round", fill: "none" })),
      aware: /* @__PURE__ */ React.createElement("g", { transform: `scale(${scale})` }, /* @__PURE__ */ React.createElement("path", { d: "M 50 15 L 85 32 L 85 68 L 50 85 L 15 68 L 15 32 Z", fill: bg, stroke: bg, strokeWidth: "10", strokeLinejoin: "round" }), /* @__PURE__ */ React.createElement("circle", { cx: "38", cy: "50", r: "14", fill: "#FFF" }), /* @__PURE__ */ React.createElement("circle", { cx: "62", cy: "50", r: "14", fill: "#FFF" }), /* @__PURE__ */ React.createElement("circle", { cx: "33", cy: "50", r: "5", fill: ink }), /* @__PURE__ */ React.createElement("circle", { cx: "57", cy: "50", r: "5", fill: ink })),
      hooked: /* @__PURE__ */ React.createElement("g", { transform: `scale(${scale})` }, /* @__PURE__ */ React.createElement("path", { d: "M 50 15 L 85 80 L 15 80 Z", fill: bg, stroke: bg, strokeWidth: "12", strokeLinejoin: "round" }), /* @__PURE__ */ React.createElement("path", { d: "M 32 55 L 43 60 L 32 65 M 68 55 L 57 60 L 68 65", stroke: ink, strokeWidth: "4", strokeLinecap: "round", strokeLinejoin: "round", fill: "none" }), /* @__PURE__ */ React.createElement("line", { x1: "45", y1: "75", x2: "55", y2: "75", stroke: ink, strokeWidth: "4", strokeLinecap: "round" })),
      doom: /* @__PURE__ */ React.createElement("g", { transform: `scale(${scale})` }, /* @__PURE__ */ React.createElement("rect", { x: "15", y: "20", width: "70", height: "65", rx: "16", fill: bg }), /* @__PURE__ */ React.createElement("line", { x1: "28", y1: "42", x2: "72", y2: "42", stroke: ink, strokeWidth: "5", strokeLinecap: "round" }), /* @__PURE__ */ React.createElement("line", { x1: "32", y1: "50", x2: "44", y2: "50", stroke: ink, strokeWidth: "4", strokeLinecap: "round" }), /* @__PURE__ */ React.createElement("line", { x1: "56", y1: "50", x2: "68", y2: "50", stroke: ink, strokeWidth: "4", strokeLinecap: "round" }), /* @__PURE__ */ React.createElement("line", { x1: "42", y1: "68", x2: "58", y2: "68", stroke: ink, strokeWidth: "4", strokeLinecap: "round" }))
    };
    return /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: `0 0 ${size} ${size}`, fill: "none", style: { overflow: "visible" } }, faces[type]);
  };
  function HeroBlock({ data }) {
    const idleSince = maybeNum(data.idleSinceLastSessionMin);
    const isIdleStale = safeNum(data.sessionsToday, 1) === 0 && isFiniteNumber(idleSince) && idleSince > 120;
    const score = isIdleStale ? 0 : safeNum(data.captureRiskScore, 0);
    const st = getState(score);
    const summary = getHeroSummary(data);
    const timeSince = maybeNum(data.timeSinceLastSessionMin);
    const avg = maybeNum(data.tenSessionAvgScore);
    const doomStreak = maybeNum(data.doomStreak);
    const mindfulStreak = maybeNum(data.mindfulStreak);
    const chips = [];
    if (isFiniteNumber(timeSince) && timeSince < 30)
      chips.push({ t: `Back in ${Math.max(1, Math.round(timeSince))}m`, dark: true });
    if (isFiniteNumber(doomStreak) && doomStreak >= 3)
      chips.push({ t: `${doomStreak} autopilot in a row`, dark: true });
    if (isFiniteNumber(mindfulStreak) && mindfulStreak >= 3)
      chips.push({ t: `${mindfulStreak} mindful in a row`, dark: false });
    if (isFiniteNumber(score) && isFiniteNumber(avg)) {
      const d = score - avg;
      if (d > 8) chips.push({ t: `\u2191 Higher risk than usual`, dark: true });
      if (d < -8) chips.push({ t: `\u2193 Calmer than usual`, dark: false });
    }
    const lines = st.headline.split("\n");
    return /* @__PURE__ */ React.createElement("div", { style: {
      background: st.heroBg,
      borderRadius: "0 0 44px 44px",
      padding: "24px 24px 32px",
      position: "relative",
      overflow: "hidden"
    } }, /* @__PURE__ */ React.createElement("div", { style: {
      display: "inline-flex",
      background: `${st.accent}20`,
      borderRadius: 999,
      padding: "5px 16px",
      marginBottom: 22
    } }, /* @__PURE__ */ React.createElement("span", { style: {
      fontFamily: "'Space Grotesk', sans-serif",
      fontSize: 10,
      fontWeight: 700,
      color: st.accent,
      letterSpacing: "0.18em",
      textTransform: "uppercase"
    } }, st.label)), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 18, marginBottom: 22 } }, /* @__PURE__ */ React.createElement("div", { style: { flexShrink: 0 } }, /* @__PURE__ */ React.createElement(MoodFace, { score, size: 108 })), /* @__PURE__ */ React.createElement("div", { style: { flex: 1, minWidth: 0 } }, lines.map((line, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: {
      fontFamily: "'Space Grotesk', sans-serif",
      fontSize: 34,
      fontWeight: 800,
      color: st.heroText,
      lineHeight: 1.05,
      letterSpacing: "-0.03em"
    } }, line)), /* @__PURE__ */ React.createElement("div", { style: {
      fontFamily: "'Nunito', sans-serif",
      fontSize: 13,
      fontWeight: 700,
      color: st.heroMute,
      marginTop: 10,
      lineHeight: 1.5
    } }, summary.subtext))), /* @__PURE__ */ React.createElement("div", { style: {
      display: "flex",
      gap: 8,
      overflowX: "auto",
      paddingBottom: 2,
      scrollbarWidth: "none",
      msOverflowStyle: "none"
    } }, chips.map((chip, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: {
      whiteSpace: "nowrap",
      flexShrink: 0,
      background: chip.dark ? `${st.accent}30` : `${st.accent}12`,
      borderRadius: 999,
      padding: "7px 16px",
      fontFamily: "'Nunito', sans-serif",
      fontSize: 12,
      fontWeight: 800,
      color: chip.dark ? st.accent : st.heroText
    } }, chip.t))));
  }
  function StatsBento({ data }) {
    const sessionsTodayRaw = maybeNum(data.sessionsToday);
    const captured = maybeNum(data.capturedSessionsToday);
    const sessions = isFiniteNumber(sessionsTodayRaw) ? sessionsTodayRaw : 0;
    const mindfulPct = isFiniteNumber(sessionsTodayRaw) && isFiniteNumber(captured) && sessionsTodayRaw > 0 ? Math.round((sessionsTodayRaw - captured) / sessionsTodayRaw * 100) : null;
    const parsedActive = parseActiveTimeSeconds(data.activeTimeToday, 0);
    const todaySec = maybeNum(data.activeTimeTodaySeconds) ?? (parsedActive > 0 ? parsedActive : null);
    const avgSec = maybeNum(data.avgActiveTimeTodaySeconds) ?? maybeNum(data.tenSessionAvgActiveTimeSec);
    const hasCmp = isFiniteNumber(todaySec) && isFiniteNumber(avgSec) && avgSec > 0;
    const above = hasCmp ? todaySec >= avgSec : false;
    const avgSessions = maybeNum(data.avgSessions);
    const sessionsCounted = useCountUp(sessions, 600);
    const timeDisplay = typeof data.activeTimeToday === "string" && data.activeTimeToday ? data.activeTimeToday : isFiniteNumber(todaySec) ? formatDurationSec(todaySec) : "--";
    return /* @__PURE__ */ React.createElement("div", { style: { padding: "0 16px" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 } }, /* @__PURE__ */ React.createElement("div", { style: {
      background: "#EAF3EE",
      borderRadius: 26,
      padding: "22px 20px",
      position: "relative",
      overflow: "hidden"
    } }, /* @__PURE__ */ React.createElement("div", { style: {
      width: 38,
      height: 38,
      borderRadius: 12,
      background: "#3A9E6F",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16
    } }, /* @__PURE__ */ React.createElement(FactorIcon, { type: "session", size: 20, color: "white" })), /* @__PURE__ */ React.createElement("div", { style: {
      fontFamily: "'Space Grotesk', sans-serif",
      fontSize: 36,
      fontWeight: 800,
      color: "#2A7A54",
      lineHeight: 1,
      letterSpacing: "-0.03em"
    } }, timeDisplay), /* @__PURE__ */ React.createElement("div", { style: {
      fontFamily: "'Nunito', sans-serif",
      fontSize: 11,
      fontWeight: 900,
      color: "#3A9E6F",
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      marginTop: 8
    } }, "On App"), hasCmp && /* @__PURE__ */ React.createElement("div", { style: {
      marginTop: 6,
      fontFamily: "'Nunito', sans-serif",
      fontSize: 12,
      fontWeight: 800,
      color: above ? "#2A7A54" : "#6A5E56"
    } }, above ? "\u2191 above avg" : "\u2193 below avg")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 10 } }, /* @__PURE__ */ React.createElement("div", { style: {
      background: "#F5EDE9",
      borderRadius: 26,
      padding: "18px 14px",
      flex: 1,
      position: "relative",
      overflow: "hidden"
    } }, /* @__PURE__ */ React.createElement("div", { style: {
      fontFamily: "'Space Grotesk', sans-serif",
      fontSize: 36,
      fontWeight: 800,
      color: "#A03A25",
      lineHeight: 1,
      letterSpacing: "-0.03em"
    } }, sessionsCounted), /* @__PURE__ */ React.createElement("div", { style: {
      fontFamily: "'Nunito', sans-serif",
      fontSize: 10,
      fontWeight: 900,
      color: "#C4563A",
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      marginTop: 6
    } }, "Sessions"), (() => {
      const diff = isFiniteNumber(sessions) && isFiniteNumber(avgSessions) ? sessions - avgSessions : null;
      if (!isFiniteNumber(diff)) return null;
      if (diff > 0.5) return /* @__PURE__ */ React.createElement("div", { style: { fontFamily: "'Nunito', sans-serif", fontSize: 11, fontWeight: 800, color: "#A03A25", marginTop: 4 } }, "more than usual");
      if (diff < -0.5) return /* @__PURE__ */ React.createElement("div", { style: { fontFamily: "'Nunito', sans-serif", fontSize: 11, fontWeight: 800, color: "#6A5E56", marginTop: 4 } }, "less than usual");
      return null;
    })()), /* @__PURE__ */ React.createElement("div", { style: {
      background: "#EEE9F5",
      borderRadius: 26,
      padding: "18px 14px",
      flex: 1,
      position: "relative",
      overflow: "hidden"
    } }, (() => {
      const capturedN = isFiniteNumber(captured) ? captured : null;
      const mindfulN = isFiniteNumber(capturedN) && sessions > 0 ? sessions - capturedN : null;
      const showFraction = isFiniteNumber(mindfulN) && sessions <= 10;
      const showPct = isFiniteNumber(mindfulPct) && sessions > 10;
      return /* @__PURE__ */ React.createElement(React.Fragment, null, showFraction ? /* @__PURE__ */ React.createElement("div", { style: { fontFamily: "'Space Grotesk', sans-serif", fontSize: 24, fontWeight: 800, color: "#4A2580", lineHeight: 1, letterSpacing: "-0.02em" } }, mindfulN, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 14, fontWeight: 700, opacity: 0.45 } }, "/", sessions)) : /* @__PURE__ */ React.createElement("div", { style: { fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 800, color: "#4A2580", lineHeight: 1, letterSpacing: "-0.02em" } }, showPct ? `${mindfulPct}%` : "--"), /* @__PURE__ */ React.createElement("div", { style: { fontFamily: "'Nunito', sans-serif", fontSize: 10, fontWeight: 900, color: "#6B3FA0", letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 6 } }, "Closed mindfully"), /* @__PURE__ */ React.createElement("div", { style: { fontFamily: "'Nunito', sans-serif", fontSize: 10, fontWeight: 700, color: "#9A8E84", marginTop: 3 } }, "of today's sessions"));
    })()))));
  }
  function AutopilotCard({ data }) {
    const doomRate = maybeNum(data.doomRate);
    const rate = isFiniteNumber(doomRate) ? Math.round(doomRate * 100) : null;
    const lastRates = safeArr(data.last3SessionAutopilotRates).filter(isFiniteNumber);
    const outOf10 = isFiniteNumber(rate) ? Math.round(rate / 10) : null;
    const trendInfo = (() => {
      if (lastRates.length < 3) return null;
      const recent = lastRates.slice(-3);
      const delta = recent[2] - recent[0];
      if (delta <= -0.08) return { text: "improving last 3 sessions", color: "#2A7A54", bg: "#EAF3EE" };
      if (delta >= 0.08) return { text: "escalating last 3 sessions", color: "#A03A25", bg: "#F5EDE9" };
      return { text: "steady across last 3 sessions", color: "#6A5E56", bg: "#F4EFE8" };
    })();
    const accent = !isFiniteNumber(rate) ? "#6B3FA0" : rate >= 70 ? "#C4563A" : rate >= 40 ? "#C4973A" : "#3A9E6F";
    const lines = !isFiniteNumber(rate) ? ["Not enough sessions yet."] : rate >= 70 ? [`${outOf10} out of 10 sessions,`, "you scroll without thinking."] : rate >= 40 ? [`About ${outOf10} in 10 sessions`, "are mindless."] : [`Only ${outOf10} in 10 sessions`, "go on autopilot."];
    const display = lastRates.slice(-7);
    return /* @__PURE__ */ React.createElement("div", { style: { padding: "0 16px" } }, /* @__PURE__ */ React.createElement("div", { style: {
      background: "#F7F3EC",
      borderRadius: 26,
      padding: "22px 20px 20px",
      position: "relative",
      overflow: "hidden",
      borderLeft: `5px solid ${accent}`,
      border: "1.5px solid rgba(26,22,18,0.06)",
      borderLeftWidth: 5,
      borderLeftStyle: "solid",
      borderLeftColor: accent
    } }, /* @__PURE__ */ React.createElement("div", { style: {
      fontFamily: "'Space Grotesk', sans-serif",
      fontSize: 10,
      fontWeight: 700,
      color: "#9A8E84",
      letterSpacing: "0.16em",
      textTransform: "uppercase",
      marginBottom: 14
    } }, "Autopilot Rate"), lines.map((line, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: {
      fontFamily: "'Space Grotesk', sans-serif",
      fontSize: 22,
      fontWeight: 800,
      color: "#1A1612",
      lineHeight: 1.25,
      letterSpacing: "-0.02em"
    } }, line)), trendInfo && /* @__PURE__ */ React.createElement("div", { style: {
      marginTop: 10,
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      background: trendInfo.bg,
      color: trendInfo.color,
      borderRadius: 999,
      padding: "5px 10px",
      fontFamily: "'Nunito', sans-serif",
      fontSize: 11,
      fontWeight: 800
    } }, trendInfo.text), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8, alignItems: "center", marginTop: 18 } }, display.map((v, i) => {
      const c = v >= 65 ? "#C4563A" : v >= 45 ? "#C4973A" : "#3A9E6F";
      return /* @__PURE__ */ React.createElement("div", { key: i, style: { width: 14, height: 14, borderRadius: "50%", background: c, boxShadow: `0 0 10px ${c}, 0 0 4px ${c}`, border: `2px solid ${c}40` } });
    }), Array.from({ length: Math.max(0, 7 - display.length) }).map((_, i) => /* @__PURE__ */ React.createElement("div", { key: `e${i}`, style: { width: 14, height: 14, borderRadius: "50%", border: "1.5px solid rgba(26,22,18,0.15)" } })), display.length > 0 && /* @__PURE__ */ React.createElement("span", { style: { fontFamily: "'Nunito', sans-serif", fontSize: 10, fontWeight: 700, color: "#9A8E84", marginLeft: 4 } }, "last ", display.length))));
  }
  function RingCard({ data }) {
    const _rawScore = safeNum(data.captureRiskScore, 0);
    const _idleSince = maybeNum(data.idleSinceLastSessionMin);
    const _isIdleStale = safeNum(data.sessionsToday, 1) === 0 && isFiniteNumber(_idleSince) && _idleSince > 120;
    const score = _isIdleStale ? 0 : _rawScore;
    const st = getState(score);
    const meta = getRiskMeta(score);
    const [disp, setDisp] = useState(0);
    const [active, setActive] = useState(null);
    useEffect(() => {
      const target = Math.max(0, Math.min(100, score));
      const start = performance.now();
      const ease = (t) => 1 - Math.pow(1 - t, 3);
      let raf;
      const step = (now) => {
        const p = Math.min(1, (now - start) / 700);
        setDisp(Math.round(target * ease(p)));
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
      return () => cancelAnimationFrame(raf);
    }, [score]);
    const driverDefs = [
      { key: "Session Length", short: "Session", iconType: "session", desc: "How long your sessions last" },
      { key: "Exit Conflict", short: "Exit", iconType: "exit", desc: "Difficulty closing the app" },
      { key: "Rapid Re-entry", short: "Re-entry", iconType: "reentry", desc: "Speed of returning to app" },
      { key: "Scroll Automaticity", short: "Scroll", iconType: "scroll", desc: "Mindless scrolling patterns" },
      { key: "Dwell Collapse", short: "Dwell", iconType: "dwell", desc: "Shortening attention per reel" },
      { key: "Rewatch Compulsion", short: "Rewatch", iconType: "rewatch", desc: "Repeated content consumption" },
      { key: "Environment", short: "Environ.", iconType: "environment", desc: "Late-night or risky context" }
    ];
    const drivers = safeArr(data.doomDrivers);
    const factors = driverDefs.map((def) => {
      const match = drivers.find((d) => d.name === def.key);
      const raw = match ? match.contribution ?? match.weight ?? 0 : 0;
      return {
        label: def.short,
        fullLabel: def.key,
        iconType: def.iconType,
        pct: Math.max(0, Math.min(100, Math.round(raw * 100))),
        desc: def.desc
      };
    });
    const N = 7;
    const baselinePct = 100 / N;
    const SVG = 340;
    const cx = SVG / 2, cy = SVG / 2;
    const R = 115;
    const LABEL_R = 150;
    const angleOf = (i) => i * 2 * Math.PI / N - Math.PI / 2;
    const ptAt = (i, val) => ({
      x: cx + val / 100 * R * Math.cos(angleOf(i)),
      y: cy + val / 100 * R * Math.sin(angleOf(i))
    });
    const gridLevels = [25, 50, 75, 100];
    const octPath = (level) => factors.map((_, i) => {
      const p = ptAt(i, level);
      return `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    }).join(" ") + "Z";
    const displayPct = (f) => Math.sqrt(Math.max(0, f.pct) / 100) * 100;
    const dataPath = factors.map((f, i) => {
      const p = ptAt(i, displayPct(f));
      return `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    }).join(" ") + "Z";
    const leadPct = Math.max(0, ...factors.map((f) => f.pct));
    const baselineWindow = Math.max(8, leadPct - baselinePct);
    const signalScore = (factor) => {
      if (!factor || factor.pct <= 0 || leadPct <= 0)
        return 0;
      const aboveBaseline = Math.max(0, factor.pct - baselinePct);
      const baselineComponent = Math.min(1, aboveBaseline / baselineWindow);
      const leaderComponent = Math.min(1, factor.pct / Math.max(leadPct, baselinePct));
      return Math.round(Math.min(100, baselineComponent * 65 + leaderComponent * 35));
    };
    const sevColor = (score) => score >= 75 ? "#C4563A" : score >= 45 ? "#C4973A" : score >= 20 ? "#6B3FA0" : "#3A9E6F";
    const sevLabel = (score) => score >= 75 ? "Dominant" : score >= 45 ? "Active" : score >= 20 ? "Present" : "Background";
    const handleTap = (i) => setActive((prev) => prev === i ? null : i);
    const af = active !== null ? factors[active] : null;
    return /* @__PURE__ */ React.createElement("div", { style: { padding: "0 16px" } }, /* @__PURE__ */ React.createElement("div", { style: {
      background: "#FDFAF6",
      borderRadius: 28,
      padding: "20px 16px 16px",
      boxShadow: "0 4px 24px rgba(26,22,18,0.06)",
      border: "1.5px solid rgba(26,22,18,0.06)"
    } }, /* @__PURE__ */ React.createElement("div", { style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 16,
      gap: 12
    } }, /* @__PURE__ */ React.createElement("div", { style: { minWidth: 0 } }, /* @__PURE__ */ React.createElement("div", { style: {
      fontFamily: "'Space Grotesk', sans-serif",
      fontSize: 15,
      fontWeight: 800,
      color: "#1A1612"
    } }, "What's pulling your attention"), /* @__PURE__ */ React.createElement("div", { style: {
      fontFamily: "'Nunito', sans-serif",
      fontSize: 11,
      fontWeight: 700,
      color: "#9A8E84",
      marginTop: 2
    } }, "Relative to your current attention mix")), (() => {
      const dominantN = factors.filter((f) => signalScore(f) >= 75).length;
      const activeN = factors.filter((f) => signalScore(f) >= 45 && signalScore(f) < 75).length;
      const standoutN = dominantN + activeN;
      const badgeColor = dominantN > 0 ? "#C4563A" : activeN > 0 ? "#C4973A" : "#3A9E6F";
      const badgeBg = dominantN > 0 ? "#F5EDE9" : activeN > 0 ? "#F5F0E2" : "#EAF3EE";
      return /* @__PURE__ */ React.createElement("div", { style: { background: badgeBg, border: `1.5px solid ${badgeColor}25`, borderRadius: 16, padding: "8px 14px", display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, minWidth: 60 } }, /* @__PURE__ */ React.createElement("span", { style: { fontFamily: "'Space Grotesk', sans-serif", fontSize: 26, fontWeight: 800, color: badgeColor, lineHeight: 1, letterSpacing: "-0.02em" } }, standoutN), /* @__PURE__ */ React.createElement("span", { style: { fontFamily: "'Space Grotesk', sans-serif", fontSize: 9, fontWeight: 700, color: badgeColor, letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 2 } }, "of 7 stand out"));
    })()), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "center" } }, /* @__PURE__ */ React.createElement(
      "svg",
      {
        width: SVG,
        height: SVG,
        viewBox: `0 0 ${SVG} ${SVG}`,
        overflow: "visible",
        style: { display: "block", width: "100%", maxWidth: SVG, overflow: "visible" }
      },
      gridLevels.map((level) => /* @__PURE__ */ React.createElement(
        "path",
        {
          key: level,
          d: octPath(level),
          fill: "none",
          stroke: level === 100 ? "#C8BFB5" : "#E4DED4",
          strokeWidth: level === 100 ? 1.2 : 0.7
        }
      )),
      factors.map((_, i) => {
        const p = ptAt(i, 100);
        return /* @__PURE__ */ React.createElement(
          "line",
          {
            key: `ax${i}`,
            x1: cx,
            y1: cy,
            x2: p.x,
            y2: p.y,
            stroke: "#E4DED4",
            strokeWidth: "0.7"
          }
        );
      }),
      /* @__PURE__ */ React.createElement(
        "text",
        {
          x: cx + 4,
          y: cy - R * 0.5 - 3,
          fontFamily: "Nunito, sans-serif",
          fontSize: "8",
          fontWeight: "700",
          fill: "#C8BFB5",
          textAnchor: "start"
        },
        "50"
      ),
      /* @__PURE__ */ React.createElement(
        "path",
        {
          d: dataPath,
          fill: `${st.accent}18`,
          stroke: st.accent,
          strokeWidth: "2.5",
          strokeLinejoin: "round",
          style: { animation: "radarGrow 0.9s cubic-bezier(0.34,1.56,0.64,1) forwards" }
        }
      ),
      factors.map((f, i) => {
        const p = ptAt(i, displayPct(f));
        const isAct = active === i;
        return /* @__PURE__ */ React.createElement("g", { key: `v${i}`, onClick: () => handleTap(i), style: { cursor: "pointer" } }, isAct && /* @__PURE__ */ React.createElement(
          "circle",
          {
            cx: p.x,
            cy: p.y,
            r: 14,
            fill: `${sevColor(signalScore(f))}12`,
            stroke: sevColor(signalScore(f)),
            strokeWidth: "1.2"
          }
        ), /* @__PURE__ */ React.createElement(
          "circle",
          {
            cx: p.x,
            cy: p.y,
            r: isAct ? 7 : 5,
            fill: sevColor(signalScore(f)),
            stroke: "white",
            strokeWidth: "2.5",
            style: { transition: "all 0.2s ease" }
          }
        ));
      }),
      factors.map((f, i) => {
        const a = angleOf(i);
        const lx = cx + LABEL_R * Math.cos(a);
        const ly = cy + LABEL_R * Math.sin(a);
        const cosA = Math.cos(a);
        const anchor = cosA < -0.15 ? "end" : cosA > 0.15 ? "start" : "middle";
        const isAct = active === i;
        return /* @__PURE__ */ React.createElement("g", { key: `lb${i}`, onClick: () => handleTap(i), style: { cursor: "pointer" } }, /* @__PURE__ */ React.createElement(
          "text",
          {
            x: lx,
            y: ly - 3,
            textAnchor: anchor,
            fontFamily: "Space Grotesk, sans-serif",
            fontSize: isAct ? "11" : "10",
            fontWeight: isAct ? "800" : "700",
            fill: isAct ? "#1A1612" : "#6A5E56"
          },
          f.label
        ), /* @__PURE__ */ React.createElement(
          "text",
          {
            x: lx,
            y: ly + 10,
            textAnchor: anchor,
            fontFamily: "Space Grotesk, sans-serif",
            fontSize: "11",
            fontWeight: "800",
            fill: sevColor(signalScore(f))
          },
          f.pct,
          "%"
        ));
      }),
      /* @__PURE__ */ React.createElement(
        "text",
        {
          x: cx,
          y: cy + 4,
          textAnchor: "middle",
          fontFamily: "Space Grotesk, sans-serif",
          fontSize: "10",
          fontWeight: "700",
          fill: st.accent,
          letterSpacing: "0.1em"
        },
        (meta.label || "SAFE").toUpperCase()
      )
    )), af && /* @__PURE__ */ React.createElement("div", { style: {
      marginTop: 12,
      background: `${sevColor(signalScore(af))}0C`,
      border: `1.5px solid ${sevColor(signalScore(af))}25`,
      borderRadius: 16,
      padding: "14px 16px",
      display: "flex",
      alignItems: "center",
      gap: 12,
      animation: "fadeSlideUp 0.3s ease forwards"
    } }, /* @__PURE__ */ React.createElement("div", { style: {
      width: 40,
      height: 40,
      borderRadius: 12,
      background: sevColor(signalScore(af)),
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      boxShadow: `0 3px 10px ${sevColor(signalScore(af))}40`
    } }, /* @__PURE__ */ React.createElement(FactorIcon, { type: af.iconType, size: 20, color: "white" })), /* @__PURE__ */ React.createElement("div", { style: { flex: 1, minWidth: 0 } }, /* @__PURE__ */ React.createElement("div", { style: {
      fontFamily: "'Space Grotesk', sans-serif",
      fontSize: 14,
      fontWeight: 800,
      color: "#1A1612"
    } }, af.fullLabel, " ", /* @__PURE__ */ React.createElement("span", { style: { color: sevColor(signalScore(af)) } }, af.pct, "%")), /* @__PURE__ */ React.createElement("div", { style: {
      fontFamily: "'Nunito', sans-serif",
      fontSize: 11,
      fontWeight: 700,
      color: "#6A5E56",
      marginTop: 2
    } }, af.desc)), /* @__PURE__ */ React.createElement("div", { style: {
      fontFamily: "'Space Grotesk', sans-serif",
      fontSize: 9,
      fontWeight: 700,
      color: sevColor(signalScore(af)),
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      background: `${sevColor(signalScore(af))}15`,
      padding: "4px 10px",
      borderRadius: 8,
      flexShrink: 0
    } }, sevLabel(signalScore(af))))));
  }
  function SessionPatterns({ data }) {
    const avgDur = maybeNum(data.avgSessionDurationSec);
    const avgReels = maybeNum(data.avgReelsPerSession);
    const avgDwell = maybeNum(data.avgDwellTimeSec);
    const idleMinBase = maybeNum(data.idleSinceLastSessionMin) ?? maybeNum(data.timeSinceLastSessionMin);
    const [idleMin, setIdleMin] = useState(idleMinBase);
    useEffect(() => {
      setIdleMin(idleMinBase);
      if (!isFiniteNumber(idleMinBase)) return;
      const ticker = setInterval(() => setIdleMin((prev) => isFiniteNumber(prev) ? prev + 1 : prev), 6e4);
      return () => clearInterval(ticker);
    }, [idleMinBase]);
    const idleColor = isFiniteNumber(idleMin) ? idleMin > 120 ? "#3A9E6F" : idleMin >= 30 ? "#3A9E6F" : "#C4563A" : "#6A5E56";
    const idleBg = isFiniteNumber(idleMin) ? idleMin > 120 ? "#EAF3EE" : idleMin >= 30 ? "#EAF3EE" : "#F5EDE9" : "#EEE9F5";
    const tiles = [
      {
        bg: "#EAF3EE",
        valColor: "#3A9E6F",
        iconBg: "#3A9E6F",
        iconType: "session",
        value: isFiniteNumber(avgDur) ? formatDurationSec(avgDur) : "--",
        label: "Avg Duration",
        sub: isFiniteNumber(avgDur) ? "per session" : null
      },
      {
        bg: "#F5EDE9",
        valColor: "#C4563A",
        iconBg: "#C4563A",
        iconType: "scroll",
        value: isFiniteNumber(avgReels) ? String(Math.round(avgReels)) : "--",
        label: "Avg Reels",
        sub: isFiniteNumber(avgReels) ? "reels watched" : null
      },
      {
        bg: "#F5F0E2",
        valColor: "#9A7020",
        iconBg: "#C4973A",
        iconType: "rewatch",
        value: isFiniteNumber(avgDwell) ? `${avgDwell.toFixed(1)}s` : "--",
        label: "Focus / Reel",
        sub: isFiniteNumber(avgDwell) ? "avg attention" : null
      },
      {
        bg: idleBg,
        valColor: idleColor,
        iconBg: isFiniteNumber(idleMin) ? idleMin > 120 ? "#3A9E6F" : idleMin >= 30 ? "#3A9E6F" : "#C4563A" : "#6B3FA0",
        iconType: "session",
        value: isFiniteNumber(idleMin) ? formatMin(idleMin) : "--",
        label: "Since Last Session",
        sub: isFiniteNumber(idleMin) ? idleMin < 30 ? "recent \xB7 stay aware" : idleMin < 120 ? "\u2713 good break" : "\u2713 well rested" : null
      }
    ];
    return /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 } }, tiles.map((tile, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: {
      background: tile.bg,
      borderRadius: 20,
      padding: "18px 14px",
      border: "1.5px solid rgba(26,22,18,0.06)"
    } }, /* @__PURE__ */ React.createElement("div", { style: {
      width: 38,
      height: 38,
      borderRadius: 12,
      background: tile.iconBg,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 12,
      boxShadow: `0 3px 10px ${tile.iconBg}55`
    } }, /* @__PURE__ */ React.createElement(FactorIcon, { type: tile.iconType, size: 20, color: "white" })), /* @__PURE__ */ React.createElement("div", { style: {
      fontFamily: "'Space Grotesk', sans-serif",
      fontSize: 28,
      fontWeight: 800,
      color: tile.valColor,
      lineHeight: 1,
      letterSpacing: "-0.02em"
    } }, tile.value), /* @__PURE__ */ React.createElement("div", { style: {
      fontFamily: "'Nunito', sans-serif",
      fontSize: 12,
      fontWeight: 800,
      color: tile.valColor,
      opacity: 0.75,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      marginTop: 6
    } }, tile.label), tile.sub && /* @__PURE__ */ React.createElement("div", { style: {
      marginTop: 8,
      display: "inline-block",
      background: `${tile.valColor}18`,
      padding: "4px 10px",
      borderRadius: 8,
      fontFamily: "'Nunito', sans-serif",
      fontSize: 11,
      fontWeight: 800,
      color: tile.valColor
    } }, tile.sub))));
  }
  function LifetimeStats({ data }) {
    const doomPersist = maybeNum(data.sessionDoomPersistence);
    const escapeR = maybeNum(data.escapeRate);
    const pull = maybeNum(data.pullIndex);
    const stayHookedPct = isFiniteNumber(doomPersist) ? Math.round(doomPersist * 100) : isFiniteNumber(pull) ? Math.max(0, Math.min(100, Math.round(pull / (pull + 1) * 100))) : null;
    const breakFreePct = isFiniteNumber(stayHookedPct) ? 100 - stayHookedPct : null;
    const totalReels = maybeNum(data.totalReels);
    const totalSess = maybeNum(data.totalSessions);
    const totalWatchedSeconds = maybeNum(data.totalWatchedSeconds);
    const totalWatchedHours = isFiniteNumber(totalWatchedSeconds) ? totalWatchedSeconds / 3600 : null;
    const estMovies = isFiniteNumber(totalWatchedHours) ? Math.round(totalWatchedHours / 2) : null;
    const totalTimeLabel = isFiniteNumber(totalWatchedSeconds) ? formatDurationSec(totalWatchedSeconds) : null;
    const reelsCounted = useCountUp(isFiniteNumber(totalReels) ? totalReels : 0, 600);
    return /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 10 } }, /* @__PURE__ */ React.createElement("div", { style: { background: "#FDFAF6", borderRadius: 20, padding: "18px 18px", border: "1.5px solid rgba(26,22,18,0.06)" } }, /* @__PURE__ */ React.createElement("div", { style: { fontFamily: "'Nunito', sans-serif", fontSize: 10, fontWeight: 900, color: "#9A8E84", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 } }, "Habit Grip \xB7 All-time"), /* @__PURE__ */ React.createElement("div", { style: { fontFamily: "'Nunito', sans-serif", fontSize: 12, fontWeight: 700, color: "#9A8E84", marginBottom: 14, lineHeight: 1.5 } }, "Once you start doom-scrolling in a session, how often does each next reel keep you going?"), isFiniteNumber(stayHookedPct) ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 14 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontFamily: "'Space Grotesk', sans-serif", fontSize: 34, fontWeight: 800, color: "#C4563A", lineHeight: 1 } }, stayHookedPct, "%"), /* @__PURE__ */ React.createElement("div", { style: { fontFamily: "'Nunito', sans-serif", fontSize: 11, fontWeight: 700, color: "#C4563A", opacity: 0.8, marginTop: 5, maxWidth: 120, lineHeight: 1.4 } }, "of the time, the next reel pulls you deeper")), /* @__PURE__ */ React.createElement("div", { style: { textAlign: "right" } }, /* @__PURE__ */ React.createElement("div", { style: { fontFamily: "'Space Grotesk', sans-serif", fontSize: 34, fontWeight: 800, color: "#3A9E6F", lineHeight: 1 } }, breakFreePct, "%"), /* @__PURE__ */ React.createElement("div", { style: { fontFamily: "'Nunito', sans-serif", fontSize: 11, fontWeight: 700, color: "#3A9E6F", opacity: 0.8, marginTop: 5, maxWidth: 120, lineHeight: 1.4, textAlign: "right" } }, "of the time, you snap out on your own"))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", height: 10, borderRadius: 999, overflow: "hidden", background: "#E4DED4" } }, /* @__PURE__ */ React.createElement("div", { style: { width: `${stayHookedPct}%`, background: "#C4563A" } }), /* @__PURE__ */ React.createElement("div", { style: { flex: 1, background: "#3A9E6F" } })), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 12, background: stayHookedPct >= 70 ? "#F5EDE9" : stayHookedPct >= 45 ? "#F5F0E2" : "#EAF3EE", borderRadius: 10, padding: "9px 13px", fontFamily: "'Nunito', sans-serif", fontSize: 12, fontWeight: 800, color: stayHookedPct >= 70 ? "#C4563A" : stayHookedPct >= 45 ? "#C4973A" : "#3A9E6F", lineHeight: 1.5 } }, stayHookedPct >= 70 ? `For every 10 reels you watch while hooked, ~${stayHookedPct >= 85 ? 9 : stayHookedPct >= 75 ? 8 : 7} lead to more.` : stayHookedPct >= 45 ? `About half the time you're in doom mode, the next reel keeps you there.` : `You're fairly good at stopping yourself mid-scroll.`)) : /* @__PURE__ */ React.createElement("div", { style: { fontFamily: "'Nunito', sans-serif", fontSize: 13, color: "#9A8E84", fontWeight: 700 } }, "Need more sessions to calculate")), /* @__PURE__ */ React.createElement("div", { style: { background: "#EEE9F5", borderRadius: 20, padding: "18px 18px", border: "1.5px solid rgba(107,63,160,0.08)" } }, /* @__PURE__ */ React.createElement("div", { style: { fontFamily: "'Nunito', sans-serif", fontSize: 10, fontWeight: 900, color: "#9A8E84", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 } }, "Lifetime Consumption \xB7 Since you started"), /* @__PURE__ */ React.createElement("div", { style: { fontFamily: "'Nunito', sans-serif", fontSize: 12, fontWeight: 700, color: "#9A8E84", marginBottom: 14, lineHeight: 1.5 } }, "How much content you've consumed across all sessions ever tracked."), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "flex-end", gap: 20, marginBottom: 10, flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontFamily: "'Space Grotesk', sans-serif", fontSize: 36, fontWeight: 800, color: "#6B3FA0", letterSpacing: "-0.03em", lineHeight: 1 } }, isFiniteNumber(totalReels) ? reelsCounted : "--"), /* @__PURE__ */ React.createElement("div", { style: { fontFamily: "'Nunito', sans-serif", fontSize: 11, fontWeight: 700, color: "#6B3FA0", opacity: 0.65, marginTop: 5 } }, "reels watched")), totalTimeLabel && /* @__PURE__ */ React.createElement("div", { style: { paddingBottom: 18 } }, /* @__PURE__ */ React.createElement("div", { style: { fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 800, color: "#6B3FA0", opacity: 0.72, lineHeight: 1 } }, totalTimeLabel), /* @__PURE__ */ React.createElement("div", { style: { fontFamily: "'Nunito', sans-serif", fontSize: 11, fontWeight: 700, color: "#6B3FA0", opacity: 0.45, marginTop: 5 } }, "total time spent")), isFiniteNumber(totalSess) && totalSess > 0 && /* @__PURE__ */ React.createElement("div", { style: { paddingBottom: 18 } }, /* @__PURE__ */ React.createElement("div", { style: { fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 800, color: "#6B3FA0", opacity: 0.5, lineHeight: 1 } }, totalSess), /* @__PURE__ */ React.createElement("div", { style: { fontFamily: "'Nunito', sans-serif", fontSize: 11, fontWeight: 700, color: "#6B3FA0", opacity: 0.4, marginTop: 5 } }, "sessions"))), isFiniteNumber(totalWatchedHours) && /* @__PURE__ */ React.createElement("div", { style: { background: "rgba(107,63,160,0.06)", borderRadius: 12, padding: "10px 14px" } }, /* @__PURE__ */ React.createElement("div", { style: { fontFamily: "'Nunito', sans-serif", fontSize: 12, fontWeight: 800, color: "#4A2580", lineHeight: 1.5 } }, "\u2248 ", totalWatchedHours.toFixed(1), " hrs of content watched", isFiniteNumber(estMovies) && estMovies > 0 && ` \u2014 same as watching ${estMovies} full-length movie${estMovies !== 1 ? "s" : ""} back-to-back`)), !isFiniteNumber(totalWatchedHours) && /* @__PURE__ */ React.createElement("div", { style: { fontFamily: "'Nunito', sans-serif", fontSize: 12, fontWeight: 700, color: "#9A8E84" } }, "Need reel history to estimate time")));
  }
  function MonitorScreen({ data }) {
    return /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 16, paddingBottom: 36 } }, /* @__PURE__ */ React.createElement(HeroBlock, { data }), /* @__PURE__ */ React.createElement(StatsBento, { data }), /* @__PURE__ */ React.createElement(AutopilotCard, { data }), /* @__PURE__ */ React.createElement(RingCard, { data }), /* @__PURE__ */ React.createElement("div", { style: { padding: "0 16px" } }, /* @__PURE__ */ React.createElement(CollapsibleSection, { title: "Today's Sessions", defaultOpen: true }, /* @__PURE__ */ React.createElement(SessionPatterns, { data }))), /* @__PURE__ */ React.createElement("div", { style: { padding: "0 16px" } }, /* @__PURE__ */ React.createElement(CollapsibleSection, { title: "Lifetime Stats", defaultOpen: false }, /* @__PURE__ */ React.createElement(LifetimeStats, { data }))));
  }
  const mapDriverIcon = (name) => {
    const k = String(name || "").toLowerCase();
    if (k.includes("length")) return BarChart2;
    if (k.includes("rewatch")) return Radio;
    if (k.includes("rapid") || k.includes("re-entry")) return Zap;
    if (k.includes("exit")) return Lock;
    if (k.includes("automatic")) return Cpu;
    if (k.includes("dwell")) return TrendingDown;
    if (k.includes("environment")) return Moon;
    return Activity;
  };
  const driverEnglish = (driver, monitorData) => {
    const name = String(driver.name || "");
    if (typeof driver.detail === "string" && driver.detail.trim()) return driver.detail;
    const raw = String(driver.rawValue || "").trim();
    if (/Session Length/i.test(name)) return "You stayed longer than your usual pattern";
    if (/Rewatch Compulsion/i.test(name)) return raw ? `Rewatch signal value: ${raw}` : "Rewatch behavior contributed to this score";
    if (/Rapid Re-entry/i.test(name)) return "Short gaps between sessions increased risk";
    if (/Exit Conflict/i.test(name)) return "Exit-attempt friction contributed to this score";
    if (/Scroll Automaticity/i.test(name)) return "Scroll rhythm became more automatic";
    if (/Dwell Collapse/i.test(name)) return "Attention per reel dropped as the session progressed";
    if (/Environment/i.test(name)) return "Time-of-day and context patterns increased risk";
    return "This driver contributed to your score today";
  };
  function MoodDissonanceCard({ data }) {
    const mood = data?.moodDissonance;
    if (!mood) return null;
    const doomMood = maybeNum(mood.doomMoodDelta);
    const mindfulMood = maybeNum(mood.mindfulMoodDelta);
    const doomRegret = maybeNum(mood.doomAvgRegret);
    const mindfulRegret = maybeNum(mood.mindfulAvgRegret);
    const totalSurveyed = maybeNum(mood.totalSurveyed);
    const fmtDelta = (v) => isFiniteNumber(v) ? `${v > 0 ? "+" : ""}${v.toFixed(1)}` : "--";
    const fmtScore = (v) => isFiniteNumber(v) ? `${v.toFixed(1)}/5` : "--";
    const moodColor = (v) => !isFiniteNumber(v) ? D.muted : v >= 0 ? "#2A7A54" : "#C4563A";
    const summary = (() => {
      if (isFiniteNumber(doomMood) && isFiniteNumber(mindfulMood)) {
        const gap = mindfulMood - doomMood;
        if (gap >= 0.6) return "Mindful sessions are leaving you noticeably better than autopilot ones.";
        if (gap <= -0.6) return "Recent data is unusual: autopilot sessions look better than mindful ones.";
        return "Mood difference between session types is currently small.";
      }
      if (isFiniteNumber(doomRegret) && isFiniteNumber(mindfulRegret)) {
        const gap = doomRegret - mindfulRegret;
        if (gap >= 0.6) return "Autopilot sessions carry higher regret than mindful sessions.";
        if (gap <= -0.6) return "Regret is currently higher in mindful sessions than autopilot sessions.";
        return "Regret difference between session types is currently small.";
      }
      return "More post-session check-ins will sharpen this comparison.";
    })();
    return /* @__PURE__ */ React.createElement("div", { className: "card fade-card", style: { ...fadeDelayStyle(0.05), padding: 14 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 } }, /* @__PURE__ */ React.createElement(Label, { style: { color: D.ink } }, "Mood Dissonance"), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, fontWeight: 800, color: D.muted } }, isFiniteNumber(totalSurveyed) ? `${Math.round(totalSurveyed)} check-ins` : "survey sample")), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 } }, /* @__PURE__ */ React.createElement("div", { style: { background: "#F5EDE9", borderRadius: 12, padding: "10px 10px 8px" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, fontWeight: 800, color: "#A03A25", textTransform: "uppercase", letterSpacing: "0.08em" } }, "Autopilot"), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 6, fontSize: 18, fontWeight: 800, color: moodColor(doomMood), fontFamily: "Space Grotesk" } }, fmtDelta(doomMood)), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 2, fontSize: 11, color: D.muted } }, "avg mood change"), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 6, fontSize: 12, fontWeight: 700, color: "#A03A25" } }, "Regret ", fmtScore(doomRegret))), /* @__PURE__ */ React.createElement("div", { style: { background: "#EAF3EE", borderRadius: 12, padding: "10px 10px 8px" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, fontWeight: 800, color: "#2A7A54", textTransform: "uppercase", letterSpacing: "0.08em" } }, "Mindful"), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 6, fontSize: 18, fontWeight: 800, color: moodColor(mindfulMood), fontFamily: "Space Grotesk" } }, fmtDelta(mindfulMood)), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 2, fontSize: 11, color: D.muted } }, "avg mood change"), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 6, fontSize: 12, fontWeight: 700, color: "#2A7A54" } }, "Regret ", fmtScore(mindfulRegret)))), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 10, fontSize: 12, color: D.ink2, lineHeight: 1.45 } }, summary));
  }
  function DashboardToday({ data }) {
    const drivers = safeArr(data.doomDrivers);
    const sortedDrivers = [...drivers].sort((a, b) => safeNum(b.contribution, 0) - safeNum(a.contribution, 0));
    const topThree = sortedDrivers.slice(0, 3);
    const timeline = safeArr(data.todaySessions);
    const [selectedTimelineIdx, setSelectedTimelineIdx] = useState(null);
    const [expandedFactors, setExpandedFactors] = useState({});
    const [retroactiveOverrides, setRetroactiveOverrides] = useState({});
    useEffect(() => {
      window.onRetroactiveLabelComplete = (b64) => {
        try {
          const label = JSON.parse(atob(b64));
          const key = String(label.sessionNum);
          setRetroactiveOverrides((prev) => ({ ...prev, [key]: label }));
        } catch (e) {
          console.error("onRetroactiveLabelComplete parse error:", e);
        }
      };
      return () => {
        window.onRetroactiveLabelComplete = void 0;
      };
    }, []);
    const circadian = safeArr(data.circadianProfile);
    const circData = circadian;
    const factorConfig = {
      "Session Length": { color: D.yellow, gradient: "linear-gradient(135deg,#C4973A,#9A7020)", iconType: "session" },
      "Rewatch Compulsion": { color: D.pink, gradient: "linear-gradient(135deg,#C4563A,#A03030)", iconType: "rewatch" },
      "Rapid Re-entry": { color: D.coral, gradient: "linear-gradient(135deg,#C4563A,#A03A25)", iconType: "reentry" },
      "Scroll Automaticity": { color: D.blue, gradient: "linear-gradient(135deg,#6B3FA0,#4A2580)", iconType: "scroll" },
      "Dwell Collapse": { color: D.sage, gradient: "linear-gradient(135deg,#3A9E6F,#2A7A54)", iconType: "dwell" },
      "Exit Conflict": { color: D.lavender, gradient: "linear-gradient(135deg,#9B6FCC,#6B3FA0)", iconType: "exit" },
      "Environment": { color: D.peach, gradient: "linear-gradient(135deg,#C4973A,#9A7020)", iconType: "environment" },
      "Cumulative": { color: D.teal, gradient: "linear-gradient(135deg,#3A9E6F,#2A7A54)", iconType: "cumulative" }
    };
    const getFactorStyle = (name) => {
      const normalized = name.trim();
      return factorConfig[normalized] || { color: D.purple, gradient: `linear-gradient(135deg, ${D.purple}, ${D.purpleDark})`, iconType: "default" };
    };
    const toggleFactor = (idx) => {
      setExpandedFactors((prev) => ({ ...prev, [idx]: !prev[idx] }));
    };
    const [showAll, setShowAll] = useState(false);
    const displayedDrivers = showAll ? sortedDrivers : topThree;
    const hiddenCount = sortedDrivers.length - topThree.length;
    return /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 12 } }, /* @__PURE__ */ React.createElement("div", { className: "card fade-card", style: { ...fadeDelayStyle(0), padding: 14 } }, /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 10 } }, /* @__PURE__ */ React.createElement(Label, { style: { color: D.ink } }, "Today's Session Timeline")), !timeline.length ? /* @__PURE__ */ React.createElement(EmptyState, { message: "No sessions recorded yet today" }) : /* @__PURE__ */ React.createElement(React.Fragment, null, (() => {
      const cols = Math.min(Math.max(4, Math.ceil(timeline.length / 2)), 5);
      const rows = Math.ceil(timeline.length / cols);
      const cellW = 100 / cols;
      const cellH = 76;
      const gap = 8;
      const step = cellH + gap;
      const dotOff = 10;
      const svgH = rows * cellH + (rows - 1) * gap;
      const pts = timeline.map((_, idx) => {
        const row = Math.floor(idx / cols);
        const colInRow = idx % cols;
        const col = row % 2 === 1 ? cols - 1 - colInRow : colInRow;
        return { row, col, x: (col + 0.5) * cellW, y: row * step + dotOff };
      });
      let pathD = "";
      if (pts.length > 0) {
        pathD = `M ${pts[0].x} ${pts[0].y}`;
        for (let i = 1; i < pts.length; i++) {
          const prev = pts[i - 1];
          const curr = pts[i];
          if (prev.row === curr.row) {
            pathD += ` L ${curr.x} ${curr.y}`;
          } else {
            const edgeRight = prev.x > 50;
            const loopX = edgeRight ? 108 : -8;
            const midY = (prev.y + curr.y) / 2;
            pathD += ` C ${loopX} ${midY}, ${loopX} ${midY}, ${curr.x} ${curr.y}`;
          }
        }
      }
      return /* @__PURE__ */ React.createElement("div", { style: { position: "relative", paddingTop: 8, minHeight: svgH } }, /* @__PURE__ */ React.createElement("svg", { style: { position: "absolute", top: 8, left: 0, width: "100%", height: svgH, pointerEvents: "none", zIndex: 0, overflow: "visible" }, viewBox: `0 0 100 ${svgH}`, preserveAspectRatio: "none" }, /* @__PURE__ */ React.createElement("path", { d: pathD, fill: "none", stroke: D.muted, strokeWidth: "2", opacity: "0.5", strokeLinecap: "round", strokeLinejoin: "round", vectorEffect: "non-scaling-stroke" })), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gridAutoRows: cellH, rowGap: gap } }, (() => {
        const grid = Array.from({ length: rows * cols }, () => null);
        timeline.forEach((s, idx) => {
          const row = Math.floor(idx / cols);
          const colInRow = idx % cols;
          const isReversed = row % 2 === 1;
          const col = isReversed ? cols - 1 - colInRow : colInRow;
          grid[row * cols + col] = { s, idx };
        });
        return grid.map((cell, gi) => {
          if (!cell) return /* @__PURE__ */ React.createElement("div", { key: `empty-${gi}` });
          const { s, idx } = cell;
          const c = s.isDoom ? D.danger : D.safe;
          const durationMin = maybeNum(s.durationMin);
          const isSelected = selectedTimelineIdx === idx;
          return /* @__PURE__ */ React.createElement(
            "div",
            {
              key: `${s.startTime}-${idx}`,
              onClick: () => setSelectedTimelineIdx(isSelected ? null : idx),
              style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 5, cursor: "pointer", position: "relative", paddingBottom: 4, zIndex: 1 }
            },
            /* @__PURE__ */ React.createElement("div", { style: {
              width: isSelected ? 24 : 20,
              height: isSelected ? 24 : 20,
              borderRadius: "50%",
              background: c,
              boxShadow: `0 0 ${isSelected ? 18 : 12}px ${c}, 0 0 ${isSelected ? 6 : 3}px ${c}`,
              border: isSelected ? `3px solid white` : `2px solid ${c}40`,
              transition: "all 0.2s cubic-bezier(0.34,1.56,0.64,1)",
              zIndex: 1,
              position: "relative"
            } }),
            /* @__PURE__ */ React.createElement("div", { style: { fontFamily: "'Space Grotesk', sans-serif", fontSize: 11, fontWeight: 700, color: D.ink } }, (s.startTime || "").slice(0, 5) || `S${idx + 1}`),
            /* @__PURE__ */ React.createElement("div", { style: { background: `${c}25`, borderRadius: 6, padding: "2px 6px", fontFamily: "'Nunito', sans-serif", fontSize: 10, fontWeight: 800, color: c } }, isFiniteNumber(durationMin) ? `${Math.round(durationMin)}m` : "--")
          );
        });
      })()));
    })(), selectedTimelineIdx !== null && timeline[selectedTimelineIdx] && (() => {
      const rawSel = timeline[selectedTimelineIdx];
      const override = retroactiveOverrides[String(rawSel._sessionNum)] ?? null;
      const sel = override ? { ...rawSel, ...override } : rawSel;
      const hasSurvey = maybeNum(sel.postSessionRating) > 0 || maybeNum(sel.regretScore) > 0 || maybeNum(sel.moodAfter) > 0 || maybeNum(sel.comparativeRating) > 0 || maybeNum(sel.delayedRegretScore) > 0;
      return /* @__PURE__ */ React.createElement("div", { style: { marginTop: 10 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: D.muted } }, (sel.startTime || "--:--").slice(0, 5), " \xB7 ", isFiniteNumber(maybeNum(sel.durationMin)) ? `${Math.round(sel.durationMin)} min` : "duration unavailable", " \xB7 ", isFiniteNumber(maybeNum(sel.reelCount)) ? `${Math.round(sel.reelCount)} reels` : "reel count unavailable"), hasSurvey && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 } }, maybeNum(sel.postSessionRating) > 0 && /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 8, background: "#EEE9F5", color: "#6B3FA0" } }, "Rating ", sel.postSessionRating, "/5"), maybeNum(sel.regretScore) > 0 && /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 8, background: sel.regretScore >= 4 ? "#F5EDE9" : "#EAF3EE", color: sel.regretScore >= 4 ? "#C4563A" : "#2A7A54" } }, "Regret ", sel.regretScore, "/5"), maybeNum(sel.moodAfter) > 0 && /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 8, background: "#EEE9F5", color: "#6B3FA0" } }, "Mood ", sel.moodAfter, "/5"), maybeNum(sel.comparativeRating) > 0 && /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 8, background: "#F5F0E2", color: "#9A7020" } }, "Experience ", sel.comparativeRating, "/5"), sel.intendedAction && sel.intendedAction !== "0" && sel.intendedAction !== "0.0" && /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 8, background: "#F5F0E2", color: "#9A7020" } }, "Intent: ", sel.intendedAction), sel.retroactiveLabel && /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 8, background: "#F0EBF8", color: "#6B3FA0", opacity: 0.75 } }, "\u270E retroactive")), !hasSurvey && /* @__PURE__ */ React.createElement("div", { style: { marginTop: 6 } }, sel.isDoom !== void 0 && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: D.muted, opacity: 0.7, marginBottom: 5 } }, "Reelio said: ", /* @__PURE__ */ React.createElement("strong", { style: { color: sel.isDoom ? D.danger : D.safe } }, sel.isDoom ? "Autopilot" : "Mindful"), sel.modelConf < 0.7 && /* @__PURE__ */ React.createElement("span", { style: { marginLeft: 6, fontSize: 9, background: `${D.warn}15`, color: D.warn, padding: "1px 5px", borderRadius: 4, fontWeight: 800 } }, "HEURISTIC BLEND (", (sel.modelConf * 100).toFixed(0), "% CONF)")), sel.modelConf < 0.7 && /* @__PURE__ */ React.createElement("div", { style: { marginTop: 6, fontSize: 10, color: D.muted, lineHeight: 1.4, padding: "8px 10px", background: `${D.warn}05`, borderRadius: 10, border: `1px solid ${D.warn}15` } }, /* @__PURE__ */ React.createElement("div", { style: { color: D.warn, fontWeight: 900, marginBottom: 2 } }, "\u26A0\uFE0F Behavioral Calibration Active"), "Current model confidence is low (", (sel.modelConf * 100).toFixed(0), "%). Reelio is blending HMM state inference with heuristic scoring (", Math.round(sel.heuristicScore * 100), "%) to ensure capture events are not missed during learning."), hasSurvey && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 6, marginTop: 8 } }, /* @__PURE__ */ React.createElement("div", { style: { padding: "4px 10px", background: "rgba(58,158,111,0.1)", border: "1px solid rgba(58,158,111,0.2)", borderRadius: 8, display: "flex", alignItems: "center", gap: 6 } }, /* @__PURE__ */ React.createElement("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "#3A9E6F", strokeWidth: "3", strokeLinecap: "round", strokeLinejoin: "round" }, /* @__PURE__ */ React.createElement("polyline", { points: "20 6 9 17 4 12" })), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, fontWeight: 900, color: "#3A9E6F", textTransform: "uppercase", letterSpacing: "0.02em" } }, sel.retroactiveLabel ? "Retroactively Labeled" : "Surveyed"))), sel._sessionNum != null && sel._sessionDate && !hasSurvey && /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => {
            const predSummary = sel.isDoom !== void 0 ? `Reelio said: ${sel.isDoom ? "Autopilot" : "Mindful"}` : "";
            const prefill = JSON.stringify({
              postSessionRating: sel.postSessionRating || 0,
              regretScore: sel.regretScore || 0,
              moodBefore: sel.moodBefore || 0,
              moodAfter: sel.moodAfter || 0,
              intendedAction: sel.intendedAction || "",
              comparativeRating: sel.comparativeRating || 0
            });
            const sNum = sel._sessionNum;
            const sDate = sel._sessionDate;
            if (!sNum || !sDate) {
              console.error("[Bridge] Missing session identity", { sNum, sDate });
              alert(`Cannot label session: identifiers missing (ID: ${sNum}, Date: ${sDate}). Try refreshing the dashboard.`);
              return;
            }
            const logPayload = JSON.stringify({
              sessionNum: String(sNum),
              date: String(sDate),
              predSummary,
              prefill
            });
            console.log("[Bridge] Launching openRetroactiveSurvey: " + logPayload);
            try {
              if (window.Android && window.Android.openRetroactiveSurvey) {
                window.Android.openRetroactiveSurvey(
                  String(sNum),
                  String(sDate),
                  String(predSummary),
                  String(prefill)
                );
                console.log("[Bridge] Call to native openRetroactiveSurvey succeeded.");
              } else {
                console.warn("[Bridge] window.Android.openRetroactiveSurvey not found");
                alert("Native bridge (window.Android) is not available. This feature only works inside the app.");
              }
            } catch (err) {
              console.error("[Bridge] Native call failed", err);
              alert("System error launching survey: " + err.message);
            }
          },
          style: {
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            fontSize: 11,
            fontWeight: 800,
            fontFamily: "'Space Grotesk', sans-serif",
            color: D.purple,
            background: "rgba(107,63,160,0.10)",
            border: "1.5px solid rgba(107,63,160,0.18)",
            borderRadius: 10,
            padding: "6px 12px",
            cursor: "pointer",
            letterSpacing: "0.02em"
          }
        },
        "\u270E Label this session"
      ), (sel._sessionNum == null || !sel._sessionDate) && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: D.muted, opacity: 0.6 } }, "No survey data")));
    })())), /* @__PURE__ */ React.createElement(MoodDissonanceCard, { data }));
  }
  function DashboardWeek({ data }) {
    const heatmap = safeArr(data.heatmapData);
    const heat = heatmap.filter((d) => isFiniteNumber(maybeNum(d.avgCapture)));
    const [selectedDay, setSelectedDay] = useState(null);
    const thisWeekRate = maybeNum(data.thisWindowDoomRate);
    const lastWeekRate = maybeNum(data.lastWindowDoomRate);
    const delta = isFiniteNumber(thisWeekRate) && isFiniteNumber(lastWeekRate) ? thisWeekRate - lastWeekRate : null;
    const baselineScore = maybeNum(data.tenSessionAvgScore);
    const underAvgDays = isFiniteNumber(baselineScore) ? heat.filter((d) => safeNum(d.avgCapture, 0) < baselineScore / 100).length : null;
    const modelConf = maybeNum(data.modelConfidence);
    const confMeta = getAccuracyMeta(modelConf);
    let confidenceText = "Model confidence is not available in this payload.";
    const sessionsCount = safeNum(data.totalSessions, 0);
    if (confMeta.known) {
      if (confMeta.show) {
        confidenceText = `Model confidence is ${Math.round(modelConf * 100)}% based on ${sessionsCount} sessions.`;
      } else {
        confidenceText = `Model is still calibrating${isFiniteNumber(confMeta.needed) ? ` (${confMeta.needed} more sessions to reach full confidence)` : ""}.`;
      }
    }
    const weeklyTrendData = heat.slice(-7).map((d, i) => ({
      day: d.dayLabel || ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"][i],
      dateLabel: d.dateLabel || d.date || "",
      score: Math.round(safeNum(d.avgCapture, 0) * 100),
      index: i
    }));
    return /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 12 } }, weeklyTrendData.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "card fade-card", style: {
      ...fadeDelayStyle(0),
      padding: "18px 16px",
      background: "linear-gradient(135deg, rgba(107,63,160,0.05), rgba(74,37,128,0.05))",
      borderColor: "rgba(107,63,160,0.12)"
    } }, /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 14 } }, /* @__PURE__ */ React.createElement(Label, { style: { color: D.purple, fontSize: 11, fontWeight: 800 } }, "Weekly Snapshot"), /* @__PURE__ */ React.createElement("div", { style: { color: D.ink, fontSize: 14, fontWeight: 800, marginTop: 4, fontFamily: "Nunito" } }, "Your focus trend")), /* @__PURE__ */ React.createElement("div", { style: { height: 150 } }, /* @__PURE__ */ React.createElement(ResponsiveContainer, { width: "100%", height: "100%" }, /* @__PURE__ */ React.createElement(LineChart, { data: weeklyTrendData, margin: { top: 12, right: 12, left: 8, bottom: 8 } }, /* @__PURE__ */ React.createElement(XAxis, { dataKey: "day", tick: { fill: D.muted, fontSize: 10 } }), /* @__PURE__ */ React.createElement(
      YAxis,
      {
        tick: { fill: D.muted, fontSize: 10 },
        domain: [0, 100],
        width: 44,
        label: { value: "Autopilot (%)", angle: -90, position: "insideLeft", offset: 4, fontSize: 10, fill: D.muted }
      }
    ), /* @__PURE__ */ React.createElement(
      Tooltip,
      {
        contentStyle: { background: D.cardLight, border: `1px solid ${D.borderSoft}`, borderRadius: 10, fontSize: 12, color: D.ink, boxShadow: "0 4px 16px rgba(0,0,0,0.08)" },
        formatter: (v) => [`${v}%`, "Autopilot"],
        labelStyle: { color: D.muted, fontWeight: 700 }
      }
    ), /* @__PURE__ */ React.createElement(Line, { type: "monotone", dataKey: "score", stroke: D.purple, strokeWidth: 2.5, dot: { fill: D.purple, r: 4, stroke: D.cardLight, strokeWidth: 2 }, activeDot: { r: 6, fill: D.purple, stroke: D.cardLight, strokeWidth: 2 } })))), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 8, padding: "10px 12px", background: "rgba(107,63,160,0.06)", borderRadius: 12, display: "flex", justifyContent: "space-between", alignItems: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: D.ink2, fontWeight: 600 } }, "Avg this week"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 16, fontWeight: 900, color: D.purple, fontFamily: "Nunito" } }, Math.round(weeklyTrendData.reduce((sum, d) => sum + d.score, 0) / weeklyTrendData.length), "%"))), /* @__PURE__ */ React.createElement("div", { className: "card fade-card", style: { ...fadeDelayStyle(0), padding: 14 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 } }, /* @__PURE__ */ React.createElement(Label, { style: { color: D.ink } }, "Weekly Heatmap"), heat.length ? /* @__PURE__ */ React.createElement(
      StatusPill,
      {
        label: isFiniteNumber(underAvgDays) ? `${underAvgDays} days under your average` : "Weekly baseline unavailable",
        type: isFiniteNumber(underAvgDays) && underAvgDays > 0 ? "safe" : "info"
      }
    ) : null), !heat.length ? /* @__PURE__ */ React.createElement(EmptyState, { message: "Not enough weekly data yet" }) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { height: 180 } }, /* @__PURE__ */ React.createElement(ResponsiveContainer, { width: "100%", height: "100%" }, (() => {
      const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
      const heatData = heat.map((d, i) => {
        const rawVal = safeNum(d.avgCapture, 0) * 100;
        return {
          day: d.dayLabel || dayNames[i % 7],
          dateLabel: d.dateLabel || d.date || "",
          value: Math.round(rawVal),
          sessions: maybeNum(d.sessionCount),
          raw: rawVal
        };
      });
      const avgVal = heatData.length > 0 ? Math.round(heatData.reduce((sum, d) => sum + d.value, 0) / heatData.length) : 0;
      const getBarColor = (val) => {
        if (val < 33) return "#2A7A54";
        if (val < 66) return "#D4A574";
        return "#C4563A";
      };
      return /* @__PURE__ */ React.createElement(BarChart, { data: heatData, margin: { top: 12, right: 8, left: -8, bottom: 32 } }, /* @__PURE__ */ React.createElement(XAxis, { dataKey: "day", tick: { fill: D.muted, fontSize: 10 }, angle: -45, textAnchor: "end", height: 60 }), /* @__PURE__ */ React.createElement(
        YAxis,
        {
          tick: { fill: D.muted, fontSize: 10 },
          label: { value: "Autopilot Rate (%)", angle: -90, position: "insideLeft", offset: -12, fontSize: 10, fill: D.muted },
          domain: [0, 100]
        }
      ), /* @__PURE__ */ React.createElement(
        Tooltip,
        {
          contentStyle: { background: D.cardLight, border: `1px solid ${D.borderSoft}`, borderRadius: 10, fontSize: 12, color: D.ink, boxShadow: "0 4px 16px rgba(0,0,0,0.08)" },
          formatter: (v, name, props) => {
            const sessions = props.payload.sessions;
            return [`${v}% autopilot - ${isFiniteNumber(sessions) ? sessions + " session" + (sessions !== 1 ? "s" : "") : "N/A"}`, "Risk"];
          },
          labelStyle: { color: D.muted, fontWeight: 700 },
          labelFormatter: (label, payload) => {
            const first = safeArr(payload)[0]?.payload;
            return first?.dateLabel ? `${label} · ${first.dateLabel}` : label;
          }
        }
      ), /* @__PURE__ */ React.createElement(
        ReferenceLine,
        {
          y: avgVal,
          stroke: D.info,
          strokeDasharray: "5 5",
          label: { value: `Weekly Avg: ${avgVal}%`, position: "right", fill: D.muted, fontSize: 9, offset: 4 }
        }
      ), /* @__PURE__ */ React.createElement(
        Bar,
        {
          dataKey: "value",
          onClick: (entry) => setSelectedDay(entry && entry.payload ? entry.payload : null),
          shape: ({ x, y, width, height, value }) => /* @__PURE__ */ React.createElement(
            "rect",
            {
              x,
              y,
              width,
              height,
              fill: getBarColor(value)
            }
          )
        }
      ));
    })())), selectedDay && /* @__PURE__ */ React.createElement("div", { style: { marginTop: 12, padding: "8px 10px", background: "rgba(107,63,160,0.08)", borderLeft: `3px solid ${D.info}`, color: D.muted, fontSize: 12, borderRadius: 4 } }, /* @__PURE__ */ React.createElement("strong", null, selectedDay.day, selectedDay.dateLabel ? ` · ${selectedDay.dateLabel}` : "", ":"), " ", Math.round(selectedDay.raw), "% autopilot \xB7 ", isFiniteNumber(maybeNum(selectedDay.sessions)) ? selectedDay.sessions + " session" + (selectedDay.sessions !== 1 ? "s" : "") : "N/A"))), /* @__PURE__ */ React.createElement("div", { className: "card fade-card", style: { ...fadeDelayStyle(1), padding: 14 } }, /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 8 } }, /* @__PURE__ */ React.createElement(Label, { style: { color: D.ink } }, "Weekly Insight")), !heat.length ? /* @__PURE__ */ React.createElement(EmptyState, { message: "Need more sessions to compare this week vs last week" }) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: D.text, marginBottom: 10 } }, confidenceText), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: D.muted } }, "This week: ", isFiniteNumber(thisWeekRate) ? `${Math.round(thisWeekRate * 100)}%` : "--", " autopilot  |  Last week: ", isFiniteNumber(lastWeekRate) ? `${Math.round(lastWeekRate * 100)}%` : "--", "  |  ", isFiniteNumber(delta) ? delta < 0 ? "\u2193 better" : delta > 0 ? "\u2191 worse" : "stable" : "comparison unavailable"))));
  }
  function DashboardAllTime({ data }) {
    const topology = data.sessionTopology || {};
    const totalReels = safeNum(topology.totalReels, 0);
    const safePct = safeNum(topology.safePercent, 0);
    const borderPct = safeNum(topology.borderPercent, 0);
    const doomPct = safeNum(topology.doomPercent, 0);
    const conf = maybeNum(data.modelConfidence) ?? maybeNum(data.stateDynamics?.modelConfidence);
    const confMeta = getAccuracyMeta(conf);
    const allTimeCaptureRate = maybeNum(data.allTimeCaptureRate);
    const sessionDoomPersistence = maybeNum(data.sessionDoomPersistence);
    const escapeRate = maybeNum(data.escapeRate);
    const pullIndex = maybeNum(data.pullIndex);
    const recoveryWindow = maybeNum(data.stateDynamics?.recoveryWindowSessions);
    const recoveryDelta = maybeNum(data.stateDynamics?.recoveryWindowDelta);
    return /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 12 } }, /* @__PURE__ */ React.createElement("div", { className: "card fade-card", style: { ...fadeDelayStyle(0), padding: 14 } }, /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 8 } }, /* @__PURE__ */ React.createElement(Label, { style: { color: D.ink } }, "Behavioral Baseline")), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 } }, [
      { title: "Autopilot Rate (All Sessions)", value: isFiniteNumber(allTimeCaptureRate) ? `${Math.round(allTimeCaptureRate * 100)}%` : "--", desc: "Share of all sessions that entered autopilot" },
      { title: "Back-to-Back Autopilot Rate", value: isFiniteNumber(sessionDoomPersistence) ? `${Math.round(sessionDoomPersistence * 100)}%` : "--", desc: "How often autopilot sessions cluster" },
      { title: "Self-Recovery Rate", value: isFiniteNumber(escapeRate) ? `${Math.round(escapeRate * 100)}%` : "--", desc: "How often you return to mindful browsing" },
      { title: "Trap Pressure Ratio", value: isFiniteNumber(pullIndex) ? `${pullIndex.toFixed(1)}x` : "--", desc: "Trap pressure relative to recovery pressure" }
    ].map((m) => /* @__PURE__ */ React.createElement("div", { key: m.title, style: { border: `1px solid ${D.borderSoft}`, borderRadius: 10, padding: 10 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: D.muted } }, m.title), /* @__PURE__ */ React.createElement("div", { className: "spacemono", style: { fontSize: 22, color: D.ink, marginTop: 4, fontWeight: 700 } }, m.value), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 4, fontSize: 11, color: D.muted } }, m.desc))))), /* @__PURE__ */ React.createElement("div", { className: "card fade-card", style: { ...fadeDelayStyle(1), padding: 14 } }, /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 8 } }, /* @__PURE__ */ React.createElement(Label, { style: { color: D.ink } }, "Your Historical Vulnerability Pattern")), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: D.muted, marginBottom: 10 } }, "Across all sessions you've recorded"), safeArr(data.circadianProfile).length < 3 ? /* @__PURE__ */ React.createElement(EmptyState, { message: "Need at least 3 sessions to reveal your risk pattern" }) : (() => {
      const [circSmooth, setCircSmooth] = useState(0);
      const circProfile = safeArr(data.circadianProfile);
      const fmtHour = (h) => {
        const hr = (h % 24 + 24) % 24;
        if (hr === 0) return "12 AM";
        if (hr === 12) return "12 PM";
        return hr < 12 ? `${hr} AM` : `${hr - 12} PM`;
      };
      const circRaw = circProfile.map((p) => ({
        h: p.hour,
        p: safeNum(p.captureProb, 0),
        label: fmtHour(p.hour)
      }));
      const smoothCirc = (data2, win) => {
        if (win <= 1) return data2;
        return data2.map((pt, idx) => {
          const half = Math.floor(win / 2);
          let sum = 0, count = 0;
          for (let j = idx - half; j <= idx + half; j++) {
            const k = (j % data2.length + data2.length) % data2.length;
            sum += data2[k].p;
            count++;
          }
          return { ...pt, p: sum / count };
        });
      };
      const circWin = circSmooth === 0 ? 1 : circSmooth === 1 ? 2 : 3;
      const circData = smoothCirc(circRaw, circWin);
      const peakPt = circProfile.reduce((best, c) => !best || c.captureProb > best.captureProb ? c : best, null);
      const safePt = circProfile.reduce((best, c) => !best || c.captureProb < best.captureProb ? c : best, null);
      const formatHr = (hour) => {
        const h = (hour % 24 + 24) % 24;
        if (h === 0) return "12 AM";
        if (h === 12) return "12 PM";
        return h < 12 ? `${h} AM` : `${h - 12} PM`;
      };
      return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { height: 200 } }, /* @__PURE__ */ React.createElement(ResponsiveContainer, { width: "100%", height: "100%" }, /* @__PURE__ */ React.createElement(LineChart, { data: circData, margin: { top: 8, right: 12, left: 8, bottom: 8 } }, /* @__PURE__ */ React.createElement(XAxis, { dataKey: "label", tick: { fill: D.muted, fontSize: 10 } }), /* @__PURE__ */ React.createElement(
        YAxis,
        {
          label: { value: "Autopilot Risk (%)", angle: -90, position: "insideLeft", offset: 4, style: { fontSize: 10, fill: D.muted } },
          tick: { fill: D.muted, fontSize: 10 },
          width: 44
        }
      ), /* @__PURE__ */ React.createElement(
        Tooltip,
        {
          contentStyle: { background: D.cardLight, border: `1px solid ${D.borderSoft}`, borderRadius: 10, fontSize: 12, color: D.ink, boxShadow: "0 4px 16px rgba(0,0,0,0.08)" },
          formatter: (v) => [`${Math.round(v * 100)}% autopilot risk`, "Risk"],
          labelStyle: { color: D.muted, fontWeight: 700 }
        }
      ), /* @__PURE__ */ React.createElement(Line, { type: "monotone", dataKey: "p", stroke: D.info, strokeWidth: 2.5, dot: { fill: D.info, r: 3 }, activeDot: { r: 5, stroke: D.cardLight, strokeWidth: 2 } })))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10, marginTop: 6, padding: "6px 0" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, color: D.muted, flexShrink: 0 } }, "Smoothing"), /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "range",
          min: "0",
          max: "2",
          step: "1",
          value: circSmooth,
          onChange: (e) => setCircSmooth(parseInt(e.target.value)),
          style: { flex: 1 }
        }
      ), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, color: D.muted, flexShrink: 0, minWidth: 40, textAlign: "right" } }, ["Raw", "Smooth", "Extra"][circSmooth])), peakPt && safePt && /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { position: "relative", border: `1px solid rgba(58,158,111,0.25)`, borderRadius: 14, padding: "14px 12px 12px", overflow: "hidden", background: "rgba(58,158,111,0.03)" } }, /* @__PURE__ */ React.createElement("div", { style: { position: "absolute", top: 8, right: 8, width: 36, height: 36 } }, /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 36 36", width: "36", height: "36" }, /* @__PURE__ */ React.createElement("path", { d: "M18 4 C18 4 6 14 10 24 C12 28 16 30 18 32 C20 30 24 28 26 24 C30 14 18 4 18 4Z", fill: "#2A7A54", opacity: "0.3" }), /* @__PURE__ */ React.createElement("path", { d: "M18 4 C18 4 6 14 10 24 C12 28 16 30 18 32 C20 30 24 28 26 24 C30 14 18 4 18 4Z", fill: "none", stroke: "#2A7A54", strokeWidth: "1.5", opacity: "0.7" }), /* @__PURE__ */ React.createElement("path", { d: "M18 12 L18 26", stroke: "#2A7A54", strokeWidth: "1", opacity: "0.5" }), /* @__PURE__ */ React.createElement("path", { d: "M14 18 Q18 16 22 18", stroke: "#2A7A54", strokeWidth: "0.8", opacity: "0.4", fill: "none" }), /* @__PURE__ */ React.createElement("path", { d: "M15 22 Q18 20 21 22", stroke: "#2A7A54", strokeWidth: "0.8", opacity: "0.4", fill: "none" }))), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, fontWeight: 700, color: D.safe, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 } }, "Safest Window"), /* @__PURE__ */ React.createElement("div", { className: "spacemono", style: { fontSize: 20, fontWeight: 800, color: D.ink } }, formatHr(safePt.hour)), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: D.muted, marginTop: 4 } }, Math.round(safePt.captureProb * 100), "% risk")), /* @__PURE__ */ React.createElement("div", { style: { position: "relative", border: `1px solid rgba(196,86,58,0.25)`, borderRadius: 14, padding: "14px 12px 12px", overflow: "hidden", background: "rgba(196,86,58,0.03)" } }, /* @__PURE__ */ React.createElement("div", { style: { position: "absolute", top: 8, right: 8, width: 36, height: 36 } }, /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 36 36", width: "36", height: "36" }, /* @__PURE__ */ React.createElement("path", { d: "M18 4 C18 4 6 14 10 24 C12 28 16 30 18 32 C20 30 24 28 26 24 C30 14 18 4 18 4Z", fill: "#C4563A", opacity: "0.3" }), /* @__PURE__ */ React.createElement("path", { d: "M18 4 C18 4 6 14 10 24 C12 28 16 30 18 32 C20 30 24 28 26 24 C30 14 18 4 18 4Z", fill: "none", stroke: "#C4563A", strokeWidth: "1.5", opacity: "0.7" }), /* @__PURE__ */ React.createElement("path", { d: "M18 12 L18 26", stroke: "#C4563A", strokeWidth: "1", opacity: "0.5" }), /* @__PURE__ */ React.createElement("path", { d: "M14 18 Q18 16 22 18", stroke: "#C4563A", strokeWidth: "0.8", opacity: "0.4", fill: "none" }), /* @__PURE__ */ React.createElement("path", { d: "M15 22 Q18 20 21 22", stroke: "#C4563A", strokeWidth: "0.8", opacity: "0.4", fill: "none" }))), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, fontWeight: 700, color: D.danger, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 } }, "Riskiest Window"), /* @__PURE__ */ React.createElement("div", { className: "spacemono", style: { fontSize: 20, fontWeight: 800, color: D.ink } }, formatHr(peakPt.hour)), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: D.muted, marginTop: 4 } }, Math.round(peakPt.captureProb * 100), "% risk"))));
    })()), /* @__PURE__ */ React.createElement(CollapsibleSection, { title: "State Dynamics", defaultOpen: false }, (() => {
      const c2d = maybeNum(data.stateDynamics?.casualToDoomProb);
      const d2c = maybeNum(data.stateDynamics?.doomToCasualProb);
      const clampProb = (p) => isFiniteNumber(p) ? Math.max(0, Math.min(1, p)) : 0;
      const c2dProb = clampProb(c2d);
      const d2cProb = clampProb(d2c);
      const c2cProb = isFiniteNumber(c2d) ? clampProb(1 - c2d) : 0;
      const d2dProb = isFiniteNumber(d2c) ? clampProb(1 - d2c) : 0;
      const c2dPct = isFiniteNumber(c2d) ? `${Math.round(c2d * 100)}%` : "--";
      const d2cPct = isFiniteNumber(d2c) ? `${Math.round(d2c * 100)}%` : "--";
      const c2cPct = isFiniteNumber(c2d) ? `${Math.round((1 - c2d) * 100)}%` : "--";
      const d2dPct = isFiniteNumber(d2c) ? `${Math.round((1 - d2c) * 100)}%` : "--";
      const flowDuration = (p, slow = 4.8, fast = 2.1) => `${(slow - (slow - fast) * p).toFixed(2)}s`;
      const laneWidth = (p, min = 2.5, max = 6) => (min + (max - min) * p).toFixed(2);
      const laneOpacity = (p, min = 0.22, max = 0.88) => (min + (max - min) * p).toFixed(2);
      const nodeHalo = (p) => (0.12 + 0.18 * p).toFixed(2);
      return /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 8 } }, /* @__PURE__ */ React.createElement("style", null, `
                        @keyframes flowTravel {
                            0%   { offset-distance: 0%; opacity: 0; transform: scale(0.86); }
                            12%  { opacity: 1; transform: scale(1); }
                            88%  { opacity: 1; transform: scale(1); }
                            100% { offset-distance: 100%; opacity: 0; transform: scale(0.86); }
                        }
                        @keyframes loopTravel {
                            0%   { offset-distance: 0%; opacity: 0; }
                            15%  { opacity: 0.95; }
                            85%  { opacity: 0.95; }
                            100% { offset-distance: 100%; opacity: 0; }
                        }
                        @keyframes pulseNode {
                            0%, 100% { transform: scale(1); }
                            50% { transform: scale(1.03); }
                        }
                        @keyframes pulseLane {
                            0%, 100% { opacity: 0.55; }
                            50% { opacity: 1; }
                        }
`), /* @__PURE__ */ React.createElement("svg", { width: "100%", viewBox: "0 0 320 160" }, /* @__PURE__ */ React.createElement("defs", null, /* @__PURE__ */ React.createElement("filter", { id: "laneGlow", x: "-50%", y: "-50%", width: "200%", height: "200%" }, /* @__PURE__ */ React.createElement("feGaussianBlur", { stdDeviation: "3.2", result: "blur" }), /* @__PURE__ */ React.createElement("feMerge", null, /* @__PURE__ */ React.createElement("feMergeNode", { in: "blur" }), /* @__PURE__ */ React.createElement("feMergeNode", { in: "SourceGraphic" })))), /* @__PURE__ */ React.createElement("path", { d: "M 56 36 C 34 14 106 14 84 36", fill: "none", stroke: D.safe, strokeOpacity: laneOpacity(c2cProb, 0.18, 0.45), strokeWidth: laneWidth(c2cProb, 1.3, 2.6), strokeDasharray: "4 3" }), /* @__PURE__ */ React.createElement("polygon", { points: "84,36 80,30 87,31", fill: D.safe }), /* @__PURE__ */ React.createElement("text", { x: "70", y: "8", textAnchor: "middle", fontFamily: "Space Mono", fontSize: "10", fontWeight: "700", fill: D.safe }, c2cPct), /* @__PURE__ */ React.createElement("text", { x: "70", y: "20", textAnchor: "middle", fontFamily: "Nunito", fontSize: "9", fontWeight: "800", fill: D.safe, opacity: "0.75" }, "stay mindful"), /* @__PURE__ */ React.createElement("circle", { r: 2.1 + c2cProb * 1.1, fill: D.safe, style: { offsetPath: "path('M 56 36 C 34 14 106 14 84 36')", animation: `loopTravel ${flowDuration(c2cProb, 4.8, 2.8)} linear 0.2s infinite` } }), /* @__PURE__ */ React.createElement("path", { d: "M 236 36 C 214 14 286 14 264 36", fill: "none", stroke: D.danger, strokeOpacity: laneOpacity(d2dProb, 0.18, 0.45), strokeWidth: laneWidth(d2dProb, 1.3, 2.6), strokeDasharray: "4 3" }), /* @__PURE__ */ React.createElement("polygon", { points: "264,36 260,30 267,31", fill: D.danger }), /* @__PURE__ */ React.createElement("text", { x: "250", y: "8", textAnchor: "middle", fontFamily: "Space Mono", fontSize: "10", fontWeight: "700", fill: D.danger }, d2dPct), /* @__PURE__ */ React.createElement("text", { x: "250", y: "20", textAnchor: "middle", fontFamily: "Nunito", fontSize: "9", fontWeight: "800", fill: D.danger, opacity: "0.75" }, "stay autopilot"), /* @__PURE__ */ React.createElement("circle", { r: 2.1 + d2dProb * 1.1, fill: D.danger, style: { offsetPath: "path('M 236 36 C 214 14 286 14 264 36')", animation: `loopTravel ${flowDuration(d2dProb, 4.9, 2.7)} linear 0.8s infinite` } }), /* @__PURE__ */ React.createElement("g", { style: { animation: "pulseNode 3s ease-in-out infinite" } }, /* @__PURE__ */ React.createElement("circle", { cx: "70", cy: "88", r: "43", fill: `rgba(58,158,111,${nodeHalo(c2cProb)})` }), /* @__PURE__ */ React.createElement("circle", { cx: "70", cy: "88", r: "38", fill: "rgba(58,158,111,0.10)", stroke: D.safe, strokeWidth: "2.2" }), /* @__PURE__ */ React.createElement("text", { x: "70", y: "83", textAnchor: "middle", fontFamily: "Space Grotesk", fontSize: "11", fontWeight: "800", fill: D.safe }, "Mindful"), /* @__PURE__ */ React.createElement("text", { x: "70", y: "97", textAnchor: "middle", fontFamily: "Space Grotesk", fontSize: "11", fontWeight: "800", fill: D.safe }, "Browsing")), /* @__PURE__ */ React.createElement("g", { style: { animation: "pulseNode 3s ease-in-out 1.5s infinite" } }, /* @__PURE__ */ React.createElement("circle", { cx: "250", cy: "88", r: "43", fill: `rgba(196,86,58,${nodeHalo(d2dProb)})` }), /* @__PURE__ */ React.createElement("circle", { cx: "250", cy: "88", r: "38", fill: "rgba(196,86,58,0.10)", stroke: D.danger, strokeWidth: "2.2" }), /* @__PURE__ */ React.createElement("text", { x: "250", y: "91", textAnchor: "middle", fontFamily: "Space Grotesk", fontSize: "11", fontWeight: "800", fill: D.danger }, "Autopilot")), /* @__PURE__ */ React.createElement("path", { d: "M 110 70 Q 160 41 210 70", fill: "none", stroke: D.danger, strokeOpacity: laneOpacity(c2dProb, 0.16, 0.28), strokeWidth: laneWidth(c2dProb, 5.5, 10), filter: "url(#laneGlow)", style: { animation: "pulseLane 2.6s ease-in-out infinite" } }), /* @__PURE__ */ React.createElement("path", { id: "pathForward", d: "M 110 70 Q 160 41 210 70", fill: "none", stroke: D.danger, strokeOpacity: laneOpacity(c2dProb, 0.45, 1), strokeWidth: laneWidth(c2dProb, 2.4, 5.6), strokeLinecap: "round" }), /* @__PURE__ */ React.createElement("polygon", { points: "210,70 201,64 204,74", fill: D.danger }), /* @__PURE__ */ React.createElement("text", { x: "160", y: "36", textAnchor: "middle", fontFamily: "Space Mono", fontSize: "11", fontWeight: "800", fill: D.danger }, c2dPct), /* @__PURE__ */ React.createElement("text", { x: "160", y: "24", textAnchor: "middle", fontFamily: "Nunito", fontSize: "9", fontWeight: "800", fill: D.danger, opacity: "0.78" }, "slip into autopilot"), /* @__PURE__ */ React.createElement("circle", { r: 3.2 + c2dProb * 1.8, fill: D.danger, style: { offsetPath: "path('M 110 70 Q 160 41 210 70')", animation: `flowTravel ${flowDuration(c2dProb, 4.6, 2.2)} linear infinite` } }), /* @__PURE__ */ React.createElement("path", { d: "M 210 106 Q 160 135 110 106", fill: "none", stroke: D.safe, strokeOpacity: laneOpacity(d2cProb, 0.16, 0.28), strokeWidth: laneWidth(d2cProb, 5, 9), filter: "url(#laneGlow)", style: { animation: "pulseLane 2.9s ease-in-out 0.5s infinite" } }), /* @__PURE__ */ React.createElement("path", { id: "pathBack", d: "M 210 106 Q 160 135 110 106", fill: "none", stroke: D.safe, strokeOpacity: laneOpacity(d2cProb, 0.45, 1), strokeWidth: laneWidth(d2cProb, 2.2, 5.2), strokeLinecap: "round", strokeDasharray: "5 3" }), /* @__PURE__ */ React.createElement("polygon", { points: "110,106 119,100 117,111", fill: D.safe }), /* @__PURE__ */ React.createElement("text", { x: "160", y: "148", textAnchor: "middle", fontFamily: "Space Mono", fontSize: "11", fontWeight: "800", fill: D.safe }, d2cPct), /* @__PURE__ */ React.createElement("text", { x: "160", y: "136", textAnchor: "middle", fontFamily: "Nunito", fontSize: "9", fontWeight: "800", fill: D.safe, opacity: "0.78" }, "recover to mindful"), /* @__PURE__ */ React.createElement("circle", { r: 3.2 + d2cProb * 1.8, fill: D.safe, style: { offsetPath: "path('M 210 106 Q 160 135 110 106')", animation: `flowTravel ${flowDuration(d2cProb, 4.6, 2.2)} linear 0.6s infinite` } })), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 10, fontSize: 11, color: D.muted, lineHeight: 1.45 } }, "Dot speed reflects how often the switch happens. Lane thickness shows how strong that transition is."));
    })(), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 12, color: D.muted, fontSize: 13, lineHeight: 1.5 } }, isFiniteNumber(recoveryWindow) ? `Once you enter autopilot mode, you typically recover within ${recoveryWindow.toFixed(1)} sessions.${isFiniteNumber(recoveryDelta) ? ` That is ${recoveryDelta <= 0 ? "better" : "worse"} than last month.` : ""}` : "Not enough transition data yet to estimate recovery window."), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 10 } }, confMeta.show ? /* @__PURE__ */ React.createElement("div", { style: { color: D.info, fontSize: 12 } }, "Prediction Accuracy: ", Math.round(conf * 100), "%") : confMeta.known ? /* @__PURE__ */ React.createElement("div", { style: { color: D.muted, fontSize: 12 } }, "Still learning your patterns \xB7 ", confMeta.needed, " more sessions to full accuracy") : /* @__PURE__ */ React.createElement("div", { style: { color: D.muted, fontSize: 12 } }, "Prediction accuracy not available in this dataset."))), /* @__PURE__ */ React.createElement(CollapsibleSection, { title: `Session Topology (${totalReels} reels)`, defaultOpen: false }, safeArr(topology.reelData).length === 0 ? /* @__PURE__ */ React.createElement(EmptyState, { message: "Not enough data for session topology" }) : /* @__PURE__ */ React.createElement(React.Fragment, null, (() => {
      const [topoSmooth, setTopoSmooth] = useState(0);
      const rawReelData = safeArr(topology.reelData).map((r) => ({
        i: r.index,
        p: Math.round(safeNum(r.captureProb, 0) * 100)
      }));
      const smoothData = (data2, windowSize2) => {
        if (windowSize2 <= 1) return data2;
        return data2.map((point, idx) => {
          const half = Math.floor(windowSize2 / 2);
          const start = Math.max(0, idx - half);
          const end = Math.min(data2.length - 1, idx + half);
          let sum = 0, count = 0;
          for (let j = start; j <= end; j++) {
            sum += data2[j].p;
            count++;
          }
          return { ...point, p: Math.round(sum / count) };
        });
      };
      const windowSize = topoSmooth === 0 ? 1 : topoSmooth === 1 ? 3 : topoSmooth === 2 ? 7 : 15;
      const reelData = smoothData(rawReelData, windowSize);
      const maxReel = reelData.length > 0 ? reelData[reelData.length - 1].i : 0;
      const smoothSafe = reelData.length > 0 ? Math.round(reelData.filter((d) => d.p < 33).length / reelData.length * 100) : 0;
      const smoothDoom = reelData.length > 0 ? Math.round(reelData.filter((d) => d.p >= 66).length / reelData.length * 100) : 0;
      const smoothBorder = Math.max(0, 100 - smoothSafe - smoothDoom);
      const getTickInterval = (max) => {
        if (max <= 30) return 5;
        if (max <= 80) return 10;
        if (max <= 200) return 20;
        if (max <= 500) return 50;
        return 100;
      };
      const tickInterval = getTickInterval(maxReel);
      const explicitTicks = [];
      for (let t = tickInterval; t <= maxReel; t += tickInterval) explicitTicks.push(t);
      if (explicitTicks.length === 0 && maxReel > 0) explicitTicks.push(maxReel);
      return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 10, color: D.text, fontSize: 13 } }, "Across all ", totalReels, " reels: ", smoothSafe, "% mindful, ", smoothBorder, "% borderline, ", smoothDoom, "% autopilot"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", height: 10, borderRadius: 999, overflow: "hidden", background: "#E4DED4", marginBottom: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { width: `${smoothSafe}%`, background: D.safe, transition: "width 0.3s ease" } }), /* @__PURE__ */ React.createElement("div", { style: { width: `${smoothBorder}%`, background: D.warn, transition: "width 0.3s ease" } }), /* @__PURE__ */ React.createElement("div", { style: { width: `${smoothDoom}%`, background: D.danger, transition: "width 0.3s ease" } })), /* @__PURE__ */ React.createElement("div", { style: { height: 210 } }, /* @__PURE__ */ React.createElement(ResponsiveContainer, { width: "100%", height: "100%" }, /* @__PURE__ */ React.createElement(LineChart, { data: reelData, margin: { top: 12, right: 12, left: 8, bottom: 8 } }, /* @__PURE__ */ React.createElement(
        XAxis,
        {
          dataKey: "i",
          tick: { fill: D.muted, fontSize: 10 },
          ticks: explicitTicks,
          type: "number",
          domain: [0, maxReel]
        }
      ), /* @__PURE__ */ React.createElement(
        YAxis,
        {
          tick: { fill: D.muted, fontSize: 10 },
          label: { value: "Capture Risk (%)", angle: -90, position: "insideLeft", offset: 4, fontSize: 10, fill: D.muted },
          domain: [0, 100],
          width: 44
        }
      ), /* @__PURE__ */ React.createElement(
        Tooltip,
        {
          contentStyle: { background: D.cardLight, border: `1px solid ${D.borderSoft}`, borderRadius: 10, fontSize: 12, color: D.ink, boxShadow: "0 4px 16px rgba(0,0,0,0.08)" },
          formatter: (v) => {
            let riskLevel = "Mindful";
            if (v >= 33 && v < 66) riskLevel = "Borderline";
            if (v >= 66) riskLevel = "Autopilot";
            return [`${v}% - ${riskLevel}`, "Risk"];
          },
          labelStyle: { color: D.muted, fontWeight: 700 },
          labelFormatter: (label) => `Reel #${label}`
        }
      ), /* @__PURE__ */ React.createElement(
        ReferenceLine,
        {
          y: 33,
          stroke: D.borderSoft,
          strokeDasharray: "3 3",
          opacity: 0.4
        }
      ), /* @__PURE__ */ React.createElement(
        ReferenceLine,
        {
          y: 66,
          stroke: D.borderSoft,
          strokeDasharray: "3 3",
          opacity: 0.4
        }
      ), /* @__PURE__ */ React.createElement(
        Line,
        {
          type: "monotone",
          dataKey: "p",
          stroke: D.danger,
          strokeWidth: 2.5,
          dot: false,
          activeDot: { r: 5, fill: D.danger, stroke: D.cardLight, strokeWidth: 2 },
          isAnimationActive: false
        }
      )))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10, marginTop: 6, padding: "6px 0" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, color: D.muted, flexShrink: 0 } }, "Smoothing"), /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "range",
          min: "0",
          max: "3",
          step: "1",
          value: topoSmooth,
          onChange: (e) => setTopoSmooth(parseInt(e.target.value)),
          style: { flex: 1 }
        }
      ), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, color: D.muted, flexShrink: 0, minWidth: 40, textAlign: "right" } }, ["Raw", "Low", "Med", "High"][topoSmooth])));
    })())));
  }
  function DashboardScreen({ data }) {
    const [subTab, setSubTab] = useState("today");
    return /* @__PURE__ */ React.createElement("div", { style: { padding: "16px 16px 32px", position: "relative", zIndex: 1 } }, /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 14 } }, /* @__PURE__ */ React.createElement("div", { className: "sub-tabs" }, /* @__PURE__ */ React.createElement("button", { className: `sub-tab ${subTab === "today" ? "active" : ""}`, onClick: () => setSubTab("today") }, "Today"), /* @__PURE__ */ React.createElement("button", { className: `sub-tab ${subTab === "week" ? "active" : ""}`, onClick: () => setSubTab("week") }, "This Week"), /* @__PURE__ */ React.createElement("button", { className: `sub-tab ${subTab === "all" ? "active" : ""}`, onClick: () => setSubTab("all") }, "All Time"))), subTab === "today" && /* @__PURE__ */ React.createElement(DashboardToday, { data }), subTab === "week" && /* @__PURE__ */ React.createElement(DashboardWeek, { data }), subTab === "all" && /* @__PURE__ */ React.createElement(DashboardAllTime, { data }));
  }
  const CAPTURE_STATES = [
    { id: "doom", label: "Doom", cellBg: "#F5EDE9", accent: "#C4563A", textColor: "#A03A25" },
    { id: "hooked", label: "Hooked", cellBg: "#F5F0E2", accent: "#C4973A", textColor: "#7A6020" },
    { id: "aware", label: "Aware", cellBg: "#E8E0F5", accent: "#6B3FA0", textColor: "#4A2580" },
    { id: "mindful", label: "Mindful", cellBg: "#EAF3EE", accent: "#3A9E6F", textColor: "#2A7A54" }
  ];
  const stateFromCapture = (avgCapture) => {
    if (avgCapture >= 0.7) return CAPTURE_STATES[0];
    if (avgCapture >= 0.45) return CAPTURE_STATES[1];
    if (avgCapture >= 0.25) return CAPTURE_STATES[2];
    return CAPTURE_STATES[3];
  };
  const derivePersonalCaptureBaselineSec = (dateBuckets) => {
    const recentDurations = Object.values(dateBuckets || {}).flatMap((bucket) => safeArr(bucket)).map((entry) => {
      const source = entry?.raw || entry || {};
      return maybeNum(entry?.durationSec) ?? maybeNum(source.durationSec) ?? maybeNum(source.sessionDurationSec);
    }).filter((durationSec) => isFiniteNumber(durationSec) && durationSec >= 20).slice(-30).sort((a, b) => a - b);
    if (!recentDurations.length)
      return 180;
    const mid = Math.floor(recentDurations.length / 2);
    const median = recentDurations.length % 2 ? recentDurations[mid] : (recentDurations[mid - 1] + recentDurations[mid]) / 2;
    return Math.min(300, Math.max(90, median));
  };
  const getDayCaptureWeight = (entry, personalBaselineSec = 180) => {
    const source = entry?.raw || entry || {};
    const durationSec = maybeNum(entry?.durationSec) ?? maybeNum(source.durationSec) ?? maybeNum(source.sessionDurationSec);
    if (!isFiniteNumber(durationSec) || durationSec <= 0)
      return 0.2;
    const baseWeight = Math.min(durationSec / personalBaselineSec, 1);
    if (durationSec < 30)
      return Math.max(0.06, baseWeight * 0.2);
    if (durationSec < 60)
      return Math.max(0.12, baseWeight * 0.45);
    if (durationSec < 120)
      return Math.max(0.3, baseWeight * 0.75);
    return Math.max(0.45, baseWeight);
  };
  const CaptureIcon = ({ stateId, size = 22 }) => {
    const ink = "#1A1612";
    const state = CAPTURE_STATES.find((s) => s.id === stateId) || CAPTURE_STATES[3];
    const bg = state.accent;
    const scale = size / 100;
    if (stateId === "doom") return /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: `0 0 ${size} ${size}`, fill: "none", style: { overflow: "visible" } }, /* @__PURE__ */ React.createElement("g", { transform: `scale(${scale})` }, /* @__PURE__ */ React.createElement("rect", { x: "15", y: "20", width: "70", height: "65", rx: "16", fill: bg }), /* @__PURE__ */ React.createElement("line", { x1: "28", y1: "42", x2: "72", y2: "42", stroke: ink, strokeWidth: "5", strokeLinecap: "round" }), /* @__PURE__ */ React.createElement("line", { x1: "32", y1: "50", x2: "44", y2: "50", stroke: ink, strokeWidth: "4", strokeLinecap: "round" }), /* @__PURE__ */ React.createElement("line", { x1: "56", y1: "50", x2: "68", y2: "50", stroke: ink, strokeWidth: "4", strokeLinecap: "round" }), /* @__PURE__ */ React.createElement("line", { x1: "42", y1: "68", x2: "58", y2: "68", stroke: ink, strokeWidth: "4", strokeLinecap: "round" })));
    if (stateId === "hooked") return /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: `0 0 ${size} ${size}`, fill: "none", style: { overflow: "visible" } }, /* @__PURE__ */ React.createElement("g", { transform: `scale(${scale})` }, /* @__PURE__ */ React.createElement("path", { d: "M 50 15 L 85 80 L 15 80 Z", fill: bg, stroke: bg, strokeWidth: "12", strokeLinejoin: "round" }), /* @__PURE__ */ React.createElement("path", { d: "M 32 55 L 43 60 L 32 65 M 68 55 L 57 60 L 68 65", stroke: ink, strokeWidth: "4", strokeLinecap: "round", strokeLinejoin: "round", fill: "none" }), /* @__PURE__ */ React.createElement("line", { x1: "45", y1: "75", x2: "55", y2: "75", stroke: ink, strokeWidth: "4", strokeLinecap: "round" })));
    if (stateId === "aware") return /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: `0 0 ${size} ${size}`, fill: "none", style: { overflow: "visible" } }, /* @__PURE__ */ React.createElement("g", { transform: `scale(${scale})` }, /* @__PURE__ */ React.createElement("path", { d: "M 50 15 L 85 32 L 85 68 L 50 85 L 15 68 L 15 32 Z", fill: bg, stroke: bg, strokeWidth: "10", strokeLinejoin: "round" }), /* @__PURE__ */ React.createElement("circle", { cx: "38", cy: "50", r: "14", fill: "#FFF" }), /* @__PURE__ */ React.createElement("circle", { cx: "62", cy: "50", r: "14", fill: "#FFF" }), /* @__PURE__ */ React.createElement("circle", { cx: "33", cy: "50", r: "5", fill: ink }), /* @__PURE__ */ React.createElement("circle", { cx: "57", cy: "50", r: "5", fill: ink })));
    return /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: `0 0 ${size} ${size}`, fill: "none", style: { overflow: "visible" } }, /* @__PURE__ */ React.createElement("g", { transform: `scale(${scale})` }, /* @__PURE__ */ React.createElement("circle", { cx: "35", cy: "35", r: "22", fill: bg }), /* @__PURE__ */ React.createElement("circle", { cx: "65", cy: "35", r: "22", fill: bg }), /* @__PURE__ */ React.createElement("circle", { cx: "35", cy: "65", r: "22", fill: bg }), /* @__PURE__ */ React.createElement("circle", { cx: "65", cy: "65", r: "22", fill: bg }), /* @__PURE__ */ React.createElement("rect", { x: "35", y: "35", width: "30", height: "30", fill: bg }), /* @__PURE__ */ React.createElement("path", { d: "M 32 48 Q 38 56 44 48 M 56 48 Q 62 56 68 48", stroke: ink, strokeWidth: "4", strokeLinecap: "round", fill: "none" }), /* @__PURE__ */ React.createElement("path", { d: "M 42 62 Q 50 70 58 62", stroke: ink, strokeWidth: "4", strokeLinecap: "round", fill: "none" })));
  };
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
  ];
  function DayDetailSheet({ dateStr, dayBucket, personalCaptureBaselineSec, onClose }) {
    if (!dateStr || !dayBucket) return null;
    const [y, m, d] = dateStr.split("-").map(Number);
    const label = `${d} ${monthNames[m - 1]}, ${y}`;
    const sessions = safeArr(dayBucket).sort((a, b) => {
      const at = isFiniteNumber(a.ts) ? a.ts : 0;
      const bt = isFiniteNumber(b.ts) ? b.ts : 0;
      return at - bt;
    });
    const weighted = sessions.map((e) => {
      const prob = maybeNum(e.raw?.S_t);
      if (!isFiniteNumber(prob))
        return null;
      const weight = getDayCaptureWeight(e, personalCaptureBaselineSec);
      return weight > 0 ? { prob, weight } : null;
    }).filter(Boolean);
    const totalWeight = weighted.length ? weighted.reduce((sum, e) => sum + e.weight, 0) : 0;
    const avgCapture = totalWeight > 0 ? weighted.reduce((sum, e) => sum + e.prob * e.weight, 0) / totalWeight : null;
    const dayState = isFiniteNumber(avgCapture) ? stateFromCapture(avgCapture) : CAPTURE_STATES[2];
    return /* @__PURE__ */ React.createElement("div", { style: {
      position: "fixed",
      inset: 0,
      zIndex: 200,
      display: "flex",
      flexDirection: "column",
      justifyContent: "flex-end"
    }, onClick: onClose }, /* @__PURE__ */ React.createElement("div", { style: {
      position: "absolute",
      inset: 0,
      background: "rgba(0,0,0,0.38)"
    } }), /* @__PURE__ */ React.createElement("div", { style: {
      position: "relative",
      zIndex: 1,
      background: "white",
      borderRadius: "22px 22px 0 0",
      padding: "0 0 32px",
      maxHeight: "72vh",
      overflowY: "auto",
      boxShadow: "0 -6px 32px rgba(0,0,0,0.18)"
    }, onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "center", paddingTop: 12, marginBottom: 4 } }, /* @__PURE__ */ React.createElement("div", { style: { width: 40, height: 4, borderRadius: 2, background: "rgba(0,0,0,0.12)" } })), /* @__PURE__ */ React.createElement("div", { style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "10px 20px 14px",
      borderBottom: `3px solid ${dayState.accent}22`,
      borderLeft: `5px solid ${dayState.accent}`
    } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: {
      fontFamily: "'Space Grotesk', sans-serif",
      fontSize: 18,
      fontWeight: 800,
      color: D.ink
    } }, label), /* @__PURE__ */ React.createElement("div", { style: {
      fontFamily: "'Nunito', sans-serif",
      fontSize: 12,
      fontWeight: 700,
      color: dayState.accent,
      marginTop: 2
    } }, dayState.label, " \xB7 ", sessions.length, " session", sessions.length !== 1 ? "s" : "", " \xB7 avg ", isFiniteNumber(avgCapture) ? Math.round(avgCapture * 100) : "--", "% capture")), /* @__PURE__ */ React.createElement("button", { onClick: onClose, style: {
      width: 30,
      height: 30,
      borderRadius: "50%",
      border: "1.5px solid rgba(0,0,0,0.12)",
      background: "rgba(0,0,0,0.04)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      fontSize: 16,
      color: D.soft
    } }, "\xD7")), /* @__PURE__ */ React.createElement("div", { style: { padding: "14px 16px 0", display: "flex", flexDirection: "column", gap: 10 } }, sessions.length === 0 && /* @__PURE__ */ React.createElement("div", { style: {
      fontFamily: "'Nunito', sans-serif",
      fontSize: 13,
      color: D.soft,
      textAlign: "center",
      padding: "20px 0"
    } }, "No session detail available"), sessions.map((entry, i) => {
      const s = entry.raw || {};
      const prob = maybeNum(s.S_t);
      const state = isFiniteNumber(prob) ? stateFromCapture(prob) : CAPTURE_STATES[2];
      const reels = maybeNum(s.nReels);
      const dwell = maybeNum(s.avgDwell);
      const period = typeof s.timePeriod === "string" && s.timePeriod !== "Unknown" ? s.timePeriod : null;
      const postSessionRating = maybeNum(s.postSessionRating);
      const regretScore = maybeNum(s.regretScore);
      const moodAfter = maybeNum(s.moodAfter);
      const comparativeRating = maybeNum(s.comparativeRating);
      const intendedAction = typeof s.intendedAction === "string" ? s.intendedAction : "";
      const retroactiveLabel = Boolean(s.retroactiveLabel);
      const delayedRegretScore = maybeNum(s.delayedRegretScore);
      const hasSurvey = isFiniteNumber(postSessionRating) && postSessionRating > 0 || isFiniteNumber(regretScore) && regretScore > 0 || isFiniteNumber(moodAfter) && moodAfter > 0 || isFiniteNumber(comparativeRating) && comparativeRating > 0 || isFiniteNumber(delayedRegretScore) && delayedRegretScore > 0;
      let startLabel = "--";
      if (typeof s.startTime === "string" && s.startTime && s.startTime !== "Unknown") {
        const dt = new Date(s.startTime);
        if (!Number.isNaN(dt.getTime())) {
          startLabel = dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        }
      }
      let durLabel = "--";
      if (isFiniteNumber(entry.durationSec) && entry.durationSec > 0) {
        const mins = Math.floor(entry.durationSec / 60);
        const secs = Math.round(entry.durationSec % 60);
        durLabel = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
      }
      return /* @__PURE__ */ React.createElement("div", { key: i, style: {
        background: state.cellBg,
        borderRadius: 14,
        padding: "12px 14px",
        border: `1.5px solid ${state.accent}30`,
        display: "flex",
        alignItems: "center",
        gap: 12
      } }, /* @__PURE__ */ React.createElement("div", { style: {
        width: 36,
        height: 36,
        borderRadius: 10,
        background: state.accent,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0
      } }, /* @__PURE__ */ React.createElement(CaptureIcon, { stateId: state.id, size: 20 })), /* @__PURE__ */ React.createElement("div", { style: { flex: 1, minWidth: 0 } }, /* @__PURE__ */ React.createElement("div", { style: {
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: 13,
        fontWeight: 800,
        color: D.ink
      } }, "Session ", i + 1, " \xB7 ", startLabel, period ? `  \xB7  ${period}` : ""), /* @__PURE__ */ React.createElement("div", { style: {
        fontFamily: "'Nunito', sans-serif",
        fontSize: 11,
        fontWeight: 600,
        color: D.ink2,
        marginTop: 3
      } }, isFiniteNumber(reels) ? `${Math.round(reels)} reels` : "--", "  \xB7  ", durLabel, isFiniteNumber(dwell) ? `  \xB7  ${dwell.toFixed(1)}s/reel` : ""), hasSurvey && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 } }, /* @__PURE__ */ React.createElement("span", { style: {
        fontSize: 10,
        fontWeight: 900,
        padding: "4px 10px",
        borderRadius: 8,
        background: "rgba(58,158,111,0.10)",
        border: "1px solid rgba(58,158,111,0.20)",
        color: "#3A9E6F",
        textTransform: "uppercase",
        letterSpacing: "0.02em"
      } }, retroactiveLabel ? "Retroactively Labeled" : "Surveyed"), isFiniteNumber(postSessionRating) && postSessionRating > 0 && /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 8, background: "#EEE9F5", color: "#6B3FA0" } }, "Rating ", postSessionRating, "/5"), isFiniteNumber(regretScore) && regretScore > 0 && /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 8, background: regretScore >= 4 ? "#F5EDE9" : "#EAF3EE", color: regretScore >= 4 ? "#C4563A" : "#2A7A54" } }, "Regret ", regretScore, "/5"), isFiniteNumber(moodAfter) && moodAfter > 0 && /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 8, background: "#EEE9F5", color: "#6B3FA0" } }, "Mood ", moodAfter, "/5"), isFiniteNumber(comparativeRating) && comparativeRating > 0 && /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 8, background: "#F5F0E2", color: "#9A7020" } }, "Experience ", comparativeRating, "/5"), intendedAction && intendedAction !== "0" && intendedAction !== "0.0" && /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 8, background: "#F5F0E2", color: "#9A7020" } }, "Intent: ", intendedAction))), isFiniteNumber(prob) && /* @__PURE__ */ React.createElement("div", { style: {
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: 16,
        fontWeight: 800,
        color: state.accent,
        minWidth: 40,
        textAlign: "right"
      } }, Math.round(prob * 100), "%"));
    }))));
  }
  function CaptureCalendarScreen({ data }) {
    const [viewMonth, setViewMonth] = useState(() => {
      const now = /* @__PURE__ */ new Date();
      return { year: now.getFullYear(), month: now.getMonth() };
    });
    const [selectedDay, setSelectedDay] = useState(null);
    const heatmap = safeArr(data.heatmapData);
    const totalSessions = safeNum(data.totalSessions, 0);
    const totalReels = safeNum(data.totalReels, 0);
    const avgScore = safeNum(data.tenSessionAvgScore, safeNum(data.captureRiskScore, 0));
    const modelConfidence = maybeNum(data.modelConfidence);
    const dateBuckets = data.dateBuckets || {};
    const personalCaptureBaselineSec = derivePersonalCaptureBaselineSec(dateBuckets);
    const dayLookup = {};
    heatmap.forEach((d) => {
      if (d.date) dayLookup[d.date] = d;
    });
    const year = viewMonth.year;
    const month = viewMonth.month;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDow = firstDay.getDay();
    const monthNames2 = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December"
    ];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const prevMonth = () => setViewMonth((prev) => {
      const m = prev.month - 1;
      return m < 0 ? { year: prev.year - 1, month: 11 } : { year: prev.year, month: m };
    });
    const nextMonth = () => setViewMonth((prev) => {
      const m = prev.month + 1;
      return m > 11 ? { year: prev.year + 1, month: 0 } : { year: prev.year, month: m };
    });
    const cells = [];
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const entry = dayLookup[dateStr];
      const avgCapture = entry ? maybeNum(entry.avgCapture) : null;
      cells.push({
        day: d,
        dateStr,
        avgCapture: isFiniteNumber(avgCapture) ? avgCapture : null,
        sessionCount: entry ? maybeNum(entry.sessionCount) ?? 0 : 0
      });
    }
    const monthEntries = cells.filter((c) => c && isFiniteNumber(c.avgCapture));
    const monthAvgCapture = monthEntries.length ? monthEntries.reduce((s, c) => s + c.avgCapture, 0) / monthEntries.length : null;
    const monthState = isFiniteNumber(monthAvgCapture) ? stateFromCapture(monthAvgCapture) : CAPTURE_STATES[2];
    const controlRate = isFiniteNumber(monthAvgCapture) ? Math.round((1 - monthAvgCapture) * 100) : null;
    const summaryLines = {
      doom: "Doom-scroll patterns dominated this month. Your ALSE score stayed high.",
      hooked: "Capture was elevated \u2014 you were pulled in often. Watch for quick re-entries.",
      aware: "A mixed month. Some sessions ran long, but you recovered most of the time.",
      mindful: "Your capture rate was low this month. You scrolled with intention."
    };
    const daysWithData = monthEntries.length;
    const sessionsThisMonth = monthEntries.reduce((sum, c) => sum + safeNum(c.sessionCount, 0), 0);
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { padding: "0 16px 32px", position: "relative", zIndex: 1 } }, /* @__PURE__ */ React.createElement("div", { style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "18px 0 6px"
    } }, /* @__PURE__ */ React.createElement("button", { onClick: prevMonth, style: {
      width: 36,
      height: 36,
      borderRadius: "50%",
      border: `1.5px solid ${D.border}`,
      background: "white",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      color: D.ink,
      fontSize: 18
    } }, "\u2039"), /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center" } }, /* @__PURE__ */ React.createElement("div", { style: {
      fontFamily: "'Space Grotesk', sans-serif",
      fontSize: 20,
      fontWeight: 800,
      color: D.ink,
      letterSpacing: "-0.02em"
    } }, "Capture Calendar"), /* @__PURE__ */ React.createElement("div", { style: {
      fontFamily: "'Nunito', sans-serif",
      fontSize: 12,
      fontWeight: 700,
      color: D.soft,
      marginTop: 2
    } }, monthNames2[month], ", ", year, " \xB7 avg capture risk per day")), /* @__PURE__ */ React.createElement("button", { onClick: nextMonth, style: {
      width: 36,
      height: 36,
      borderRadius: "50%",
      border: `1.5px solid ${D.border}`,
      background: "white",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      color: D.ink,
      fontSize: 18
    } }, "\u203A")), /* @__PURE__ */ React.createElement("div", { style: {
      display: "grid",
      gridTemplateColumns: "repeat(7, 1fr)",
      gap: 4,
      marginTop: 14,
      marginBottom: 6
    } }, dayNames.map((d) => /* @__PURE__ */ React.createElement("div", { key: d, style: {
      textAlign: "center",
      fontFamily: "'Space Grotesk', sans-serif",
      fontSize: 10,
      fontWeight: 700,
      color: D.soft,
      letterSpacing: "0.06em",
      textTransform: "uppercase",
      padding: "4px 0"
    } }, d))), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 5 } }, cells.map((cell, idx) => {
      if (!cell) return /* @__PURE__ */ React.createElement("div", { key: `empty-${idx}` });
      const today = /* @__PURE__ */ new Date();
      const isToday = cell.day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
      const isFuture = new Date(year, month, cell.day) > today;
      const state = isFiniteNumber(cell.avgCapture) ? stateFromCapture(cell.avgCapture) : null;
      if (isFuture || !state) {
        return /* @__PURE__ */ React.createElement("div", { key: cell.dateStr, style: {
          aspectRatio: "1",
          borderRadius: 12,
          background: isFuture ? "rgba(255,255,255,0.30)" : "rgba(255,255,255,0.55)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          border: isToday ? `2px solid ${D.purple}` : "1.5px solid rgba(255,255,255,0.6)"
        } }, /* @__PURE__ */ React.createElement("span", { style: {
          fontSize: 10,
          fontWeight: 700,
          color: D.soft,
          fontFamily: "'Space Grotesk', sans-serif"
        } }, cell.day));
      }
      return /* @__PURE__ */ React.createElement(
        "div",
        {
          key: cell.dateStr,
          title: `${state.label} \xB7 ${cell.sessionCount} session${cell.sessionCount !== 1 ? "s" : ""} \xB7 avg ${Math.round(cell.avgCapture * 100)}% capture`,
          onClick: () => setSelectedDay(cell.dateStr),
          style: {
            aspectRatio: "1",
            borderRadius: 12,
            background: state.cellBg,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            border: isToday ? `2.5px solid ${state.accent}` : `1.5px solid ${state.accent}30`,
            boxShadow: `0 2px 6px ${state.accent}28`,
            cursor: "pointer"
          }
        },
        /* @__PURE__ */ React.createElement(CaptureIcon, { stateId: state.id, size: 22 })
      );
    })), /* @__PURE__ */ React.createElement("div", { style: {
      display: "flex",
      gap: 10,
      justifyContent: "center",
      marginTop: 14,
      flexWrap: "wrap"
    } }, CAPTURE_STATES.map((s) => /* @__PURE__ */ React.createElement("div", { key: s.id, style: { display: "flex", alignItems: "center", gap: 5 } }, /* @__PURE__ */ React.createElement("div", { style: {
      width: 12,
      height: 12,
      borderRadius: 4,
      background: s.cellBg,
      border: `1.5px solid ${s.accent}60`
    } }), /* @__PURE__ */ React.createElement("span", { style: {
      fontSize: 10,
      fontWeight: 700,
      color: D.ink2,
      fontFamily: "'Nunito', sans-serif"
    } }, s.label)))), /* @__PURE__ */ React.createElement("div", { style: {
      marginTop: 14,
      background: "white",
      borderRadius: 20,
      padding: "20px 18px",
      border: `3px solid ${monthState.accent}40`,
      borderLeft: `5px solid ${monthState.accent}`
    } }, /* @__PURE__ */ React.createElement("div", { style: {
      fontFamily: "'Nunito', sans-serif",
      fontSize: 11,
      fontWeight: 700,
      color: D.soft,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      marginBottom: 6
    } }, "Monthly Capture Pattern"), /* @__PURE__ */ React.createElement("div", { style: {
      fontFamily: "'Space Grotesk', sans-serif",
      fontSize: 28,
      fontWeight: 800,
      color: monthState.accent,
      letterSpacing: "-0.02em",
      marginBottom: 6
    } }, monthState.label), /* @__PURE__ */ React.createElement("div", { style: {
      fontFamily: "'Nunito', sans-serif",
      fontSize: 13,
      fontWeight: 600,
      color: D.ink2,
      lineHeight: 1.5
    } }, summaryLines[monthState.id]), isFiniteNumber(monthAvgCapture) && /* @__PURE__ */ React.createElement("div", { style: {
      marginTop: 10,
      display: "flex",
      alignItems: "center",
      gap: 8
    } }, /* @__PURE__ */ React.createElement("div", { style: {
      flex: 1,
      height: 8,
      borderRadius: 8,
      background: "rgba(0,0,0,0.07)",
      overflow: "hidden"
    } }, /* @__PURE__ */ React.createElement("div", { style: {
      height: "100%",
      borderRadius: 8,
      width: `${Math.round(monthAvgCapture * 100)}%`,
      background: monthState.accent
    } })), /* @__PURE__ */ React.createElement("span", { style: {
      fontFamily: "'Space Grotesk', sans-serif",
      fontSize: 13,
      fontWeight: 800,
      color: monthState.accent,
      minWidth: 38,
      textAlign: "right"
    } }, Math.round(monthAvgCapture * 100), "%"), /* @__PURE__ */ React.createElement("span", { style: {
      fontFamily: "'Nunito', sans-serif",
      fontSize: 11,
      fontWeight: 600,
      color: D.soft
    } }, "avg capture"))), /* @__PURE__ */ React.createElement("div", { style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr 1fr",
      gap: 10,
      marginTop: 12
    } }, [
      {
        label: "Reels",
        value: totalReels > 0 ? totalReels.toLocaleString() : "--",
        sub: "all time",
        accent: "#C4563A"
      },
      {
        label: "Sessions",
        value: sessionsThisMonth > 0 ? `${sessionsThisMonth}` : totalSessions || "--",
        sub: daysWithData > 0 ? `over ${daysWithData}d` : "this month",
        accent: "#6B3FA0"
      },
      {
        label: "Confidence",
        value: isFiniteNumber(modelConfidence) ? `${Math.round(modelConfidence * 100)}%` : "--",
        sub: "model accuracy",
        accent: "#3A9E6F"
      }
    ].map((stat, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: {
      background: "#FDFAF6",
      borderRadius: 16,
      padding: "14px 10px",
      textAlign: "center",
      border: `1.5px solid ${stat.accent}25`
    } }, /* @__PURE__ */ React.createElement("div", { style: {
      fontFamily: "'Space Grotesk', sans-serif",
      fontSize: 10,
      fontWeight: 700,
      color: D.soft,
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      marginBottom: 6
    } }, stat.label), /* @__PURE__ */ React.createElement("div", { style: {
      fontFamily: "'Space Grotesk', sans-serif",
      fontSize: 22,
      fontWeight: 800,
      color: D.ink,
      lineHeight: 1,
      letterSpacing: "-0.02em"
    } }, stat.value), /* @__PURE__ */ React.createElement("div", { style: {
      fontFamily: "'Nunito', sans-serif",
      fontSize: 10,
      fontWeight: 600,
      color: D.soft,
      marginTop: 4
    } }, stat.sub))))), selectedDay && /* @__PURE__ */ React.createElement(
      DayDetailSheet,
      {
        dateStr: selectedDay,
        dayBucket: dateBuckets[selectedDay],
        personalCaptureBaselineSec,
        onClose: () => setSelectedDay(null)
      }
    ));
  }
  function SettingsScreen({ data }) {
    const [surveyProb, setSurveyProb] = useState(0.3);
    const [sleepStart, setSleepStart] = useState(23);
    const [sleepEnd, setSleepEnd] = useState(7);
    useEffect(() => {
      if (window.Android) {
        if (window.Android.getSurveyFrequency) {
          setSurveyProb(safeNum(window.Android.getSurveyFrequency(), 0.3));
        }
        if (window.Android.getSleepSchedule) {
          const sleepStr = window.Android.getSleepSchedule();
          if (typeof sleepStr === "string" && sleepStr.includes(",")) {
            const [s, e] = sleepStr.split(",").map(Number);
            if (!Number.isNaN(s)) setSleepStart(s);
            if (!Number.isNaN(e)) setSleepEnd(e);
          }
        }
      }
    }, []);
    const handleSurveyChange = (e) => {
      const val = parseFloat(e.target.value);
      setSurveyProb(val);
      if (window.Android && window.Android.setSurveyFrequency) window.Android.setSurveyFrequency(val);
    };
    const handleSleepChange = (type, val) => {
      const v = parseInt(val, 10);
      if (type === "start") {
        setSleepStart(v);
        if (window.Android && window.Android.setSleepSchedule) window.Android.setSleepSchedule(v, sleepEnd);
      } else {
        setSleepEnd(v);
        if (window.Android && window.Android.setSleepSchedule) window.Android.setSleepSchedule(sleepStart, v);
      }
    };
    const baselineSessions = safeNum(data.totalSessions, safeNum(data.sessionsToday, 0));
    const baselineSessionsCounted = useCountUp(baselineSessions, 600);
    const modelAccuracy = maybeNum(data.modelConfidence);
    const accuracyMeta = getAccuracyMeta(modelAccuracy);
    const sinceDate = typeof data.dataSinceDate === "string" ? data.dataSinceDate : null;
    const onReset = () => {
      const ok = window.confirm("Are you sure? This cannot be undone. The app will rebuild your baseline from new sessions.");
      if (!ok) return;
      if (window.Android && window.Android.clearData) window.Android.clearData();
    };
    return /* @__PURE__ */ React.createElement("div", { style: { padding: "16px 16px 32px", position: "relative", zIndex: 1 } }, /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 20, padding: "8px 2px 0" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 20, fontWeight: 800, color: D.ink, fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.01em" } }, "App Settings"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, fontWeight: 700, color: D.soft, fontFamily: "'Nunito', sans-serif" } }, "Customize your experience")), /* @__PURE__ */ React.createElement("div", { className: "card fade-card", style: { ...fadeDelayStyle(0), padding: 14, marginBottom: 12 } }, /* @__PURE__ */ React.createElement(Label, { style: { color: D.info } }, "Your Baseline"), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 10 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "spacemono", style: { fontSize: 20, color: D.ink, fontWeight: 700 } }, baselineSessionsCounted), /* @__PURE__ */ React.createElement("div", { style: { color: D.muted, fontSize: 11 } }, "Sessions tracked")), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: {
      fontSize: 16,
      color: accuracyMeta.show ? D.green : D.yellow,
      fontWeight: 800,
      fontFamily: "'Space Grotesk', sans-serif",
      display: "flex",
      alignItems: "center",
      gap: 6
    } }, !accuracyMeta.show && /* @__PURE__ */ React.createElement("div", { style: { width: 7, height: 7, borderRadius: "50%", background: D.yellow, boxShadow: `0 0 8px ${D.yellow}`, animation: "pulse 1.5s ease-in-out infinite" } }), accuracyMeta.show ? `${Math.round(modelAccuracy * 100)}%` : accuracyMeta.known ? "Calibrating" : "--"), /* @__PURE__ */ React.createElement("div", { style: { color: D.soft, fontSize: 11, fontWeight: 700, fontFamily: "'Nunito', sans-serif" } }, accuracyMeta.show ? "Model accuracy" : accuracyMeta.known ? `${accuracyMeta.needed} more sessions` : "unavailable")), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "spacemono", style: { fontSize: 14, color: D.ink, fontWeight: 700, marginTop: 4 } }, sinceDate || "--"), /* @__PURE__ */ React.createElement("div", { style: { color: D.muted, fontSize: 11 } }, "Data since")))), /* @__PURE__ */ React.createElement("div", { className: "card fade-card", style: {
      ...fadeDelayStyle(1),
      padding: 14,
      marginBottom: 12,
      background: "linear-gradient(135deg, rgba(107,63,160,0.04), rgba(196,86,58,0.04))",
      borderColor: "rgba(107,63,160,0.12)"
    } }, /* @__PURE__ */ React.createElement(Label, { style: { display: "block", marginBottom: 10, color: D.purple, fontWeight: 800, fontSize: 11 } }, "Check-in Frequency"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: D.ink, marginBottom: 12, lineHeight: 1.5, fontWeight: 600 } }, "How often the app asks how you feel after a session. More check-ins = smarter insights."), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 6 } }, /* @__PURE__ */ React.createElement("span", { className: "mono", style: { fontSize: 11, color: D.muted, fontWeight: 700 } }, "0%"), /* @__PURE__ */ React.createElement("span", { className: "mono", style: { fontSize: 15, color: D.purple, fontWeight: 800 } }, Math.round(surveyProb * 100), "%"), /* @__PURE__ */ React.createElement("span", { className: "mono", style: { fontSize: 11, color: D.muted, fontWeight: 700 } }, "100%")), /* @__PURE__ */ React.createElement("input", { type: "range", min: "0", max: "1", step: "0.01", value: surveyProb, onChange: handleSurveyChange, style: {
      accentColor: D.purple
    } })), /* @__PURE__ */ React.createElement("div", { className: "card fade-card", style: { ...fadeDelayStyle(2), padding: 14, marginBottom: 12 } }, /* @__PURE__ */ React.createElement(Label, { style: { display: "block", marginBottom: 10, color: D.info } }, "Sleep Schedule"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: D.text, marginBottom: 12, lineHeight: 1.5 } }, "Tell us when you sleep so we can flag late-night scrolling more accurately."), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement(Label, { style: { fontSize: 9, display: "block", marginBottom: 5 } }, "Bedtime"), /* @__PURE__ */ React.createElement("select", { value: sleepStart, onChange: (e) => handleSleepChange("start", e.target.value), style: {
      width: "100%",
      padding: "9px",
      background: "#E4DED4",
      border: `1px solid ${D.borderSoft}`,
      color: D.ink,
      borderRadius: 8,
      fontFamily: "Space Mono",
      fontSize: 13,
      outline: "none"
    } }, Array.from({ length: 24 }, (_, i) => /* @__PURE__ */ React.createElement("option", { key: i, value: i }, i.toString().padStart(2, "0"), ":00")))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement(Label, { style: { fontSize: 9, display: "block", marginBottom: 5 } }, "Wake-up"), /* @__PURE__ */ React.createElement("select", { value: sleepEnd, onChange: (e) => handleSleepChange("end", e.target.value), style: {
      width: "100%",
      padding: "9px",
      background: "#E4DED4",
      border: `1px solid ${D.borderSoft}`,
      color: D.ink,
      borderRadius: 8,
      fontFamily: "Space Mono",
      fontSize: 13,
      outline: "none"
    } }, Array.from({ length: 24 }, (_, i) => /* @__PURE__ */ React.createElement("option", { key: i, value: i }, i.toString().padStart(2, "0"), ":00")))))), /* @__PURE__ */ React.createElement("div", { className: "card fade-card", style: { ...fadeDelayStyle(3), padding: 14, marginBottom: 12, borderColor: "rgba(196,86,58,0.35)" } }, /* @__PURE__ */ React.createElement(Label, { style: { display: "block", marginBottom: 10, color: D.danger } }, "Data Management"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 10 } }, /* @__PURE__ */ React.createElement("button", { onClick: () => window.Android && window.Android.exportCsv && window.Android.exportCsv(), style: {
      width: "100%",
      padding: "14px",
      borderRadius: 14,
      cursor: "pointer",
      fontFamily: "'Space Grotesk', sans-serif",
      fontSize: 14,
      fontWeight: 700,
      letterSpacing: "0.02em",
      background: "transparent",
      color: D.purple,
      border: `2px solid rgba(107,63,160,0.35)`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8
    } }, /* @__PURE__ */ React.createElement(Download, { size: 15 }), " Export My Data"), /* @__PURE__ */ React.createElement("button", { onClick: onReset, style: {
      width: "100%",
      padding: "14px",
      borderRadius: 14,
      cursor: "pointer",
      fontFamily: "'Space Grotesk', sans-serif",
      fontSize: 14,
      fontWeight: 700,
      letterSpacing: "0.02em",
      background: "#C4563A",
      color: "#F7F3EC",
      border: "none",
      boxShadow: "0 4px 16px rgba(196,86,58,0.3)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8
    } }, /* @__PURE__ */ React.createElement(Trash2, { size: 15 }), " Reset My Baseline")), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 10, color: D.muted, fontSize: 12, lineHeight: 1.5 } }, "This permanently clears your history and the app will start learning you from scratch.")));
  }
  const TabIconMonitor = ({ size = 20, color = "currentColor" }) => /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round" }, /* @__PURE__ */ React.createElement("path", { d: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" }), /* @__PURE__ */ React.createElement("circle", { cx: "12", cy: "12", r: "3" }));
  const TabIconCalendar = ({ size = 20, color = "currentColor" }) => /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round" }, /* @__PURE__ */ React.createElement("rect", { x: "3", y: "4", width: "18", height: "18", rx: "2" }), /* @__PURE__ */ React.createElement("line", { x1: "16", y1: "2", x2: "16", y2: "6" }), /* @__PURE__ */ React.createElement("line", { x1: "8", y1: "2", x2: "8", y2: "6" }), /* @__PURE__ */ React.createElement("line", { x1: "3", y1: "10", x2: "21", y2: "10" }), /* @__PURE__ */ React.createElement("rect", { x: "8", y: "14", width: "3", height: "3", rx: "0.5", fill: color, stroke: "none" }));
  const TabIconDashboard = ({ size = 20, color = "currentColor" }) => /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round" }, /* @__PURE__ */ React.createElement("line", { x1: "18", y1: "20", x2: "18", y2: "10" }), /* @__PURE__ */ React.createElement("line", { x1: "12", y1: "20", x2: "12", y2: "4" }), /* @__PURE__ */ React.createElement("line", { x1: "6", y1: "20", x2: "6", y2: "14" }));
  const TabIconSettings = ({ size = 20, color = "currentColor" }) => /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round" }, /* @__PURE__ */ React.createElement("circle", { cx: "12", cy: "12", r: "3" }), /* @__PURE__ */ React.createElement("path", { d: "M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1.08-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1.08 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001.08 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1.08z" }));
  function LoadingState() {
    return /* @__PURE__ */ React.createElement("div", { style: {
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: D.bg,
      color: D.text,
      fontFamily: "'Space Grotesk', sans-serif",
      flexDirection: "column",
      gap: 12
    } }, /* @__PURE__ */ React.createElement("div", { style: { width: 36, height: 36, borderRadius: "50%", border: `3px solid rgba(26,22,18,0.08)`, borderTopColor: "#6B3FA0", animation: "spin 1s linear infinite" } }), /* @__PURE__ */ React.createElement("div", { className: "mono", style: { fontSize: 10, color: "#9A8E84", letterSpacing: "0.18em" } }, "INITIALIZING TRACKER..."), /* @__PURE__ */ React.createElement("style", null, `@keyframes spin { to { transform: rotate(360deg); } }`));
  }
  const ONBOARD_QUOTES = [
    {
      text: "You have power over your mind, not outside events. Realise this and you will find strength. The algorithm realised it first.",
      tag: "Marcus Aurelius \xB7 Meditations"
    },
    {
      text: "When you gaze long into the abyss, the abyss gazes back. The abyss has 1.2 million followers and a Patreon.",
      tag: "Nietzsche \xB7 approximately"
    },
    {
      text: "Cogito ergo doom.",
      tag: "Descartes \xB7 if he had wifi"
    },
    {
      text: "We are what we repeatedly do. You have opened this app within 12 minutes of waking, without fail, for 19 days. You have become very excellent at something.",
      tag: "Aristotle \xB7 Nicomachean Ethics"
    },
    {
      text: "Your screen time report arrives every Sunday like a small honest accountant you have never once listened to. The accountant does not take this personally. The accountant simply returns.",
      tag: "digital confession"
    },
    {
      text: "Know thyself. Before you do, however, allow this 15-second ad for something you whispered about near your phone two days ago.",
      tag: "Oracle of Delphi \xB7 400 BC"
    },
    {
      text: "Not all those who wander are lost. This does not apply to infinite scroll.",
      tag: "Tolkien \xB7 The Fellowship of the Ring"
    },
    {
      text: "A journey of a thousand miles begins with a single step. A three-hour session begins with a single tap. The mechanics are identical. The destination is not.",
      tag: "Lao Tzu \xB7 Tao Te Ching"
    },
    {
      text: "I can resist everything except temptation. The notification badge is not a temptation. It is an engineered stimulus. This is a meaningful distinction.",
      tag: "Oscar Wilde \xB7 Lady Windermere's Fan"
    },
    {
      text: "Big Brother is watching you. Big Brother has also noted your re-watch pattern on dog content at 11:47pm and adjusted your feed accordingly. This detail was not in the first edition.",
      tag: "Orwell \xB7 1984"
    },
    {
      text: "Vindica te tibi. Claim yourself for yourself. The opposite instruction is currently available in your pocket at all times.",
      tag: "Seneca \xB7 Letters to Lucilius"
    },
    {
      text: "The mind is everything. What you think, you become. You have been thinking about a raccoon stealing a churro for three days.",
      tag: "Buddha \xB7 Dhammapada"
    },
    {
      text: "All the world's a stage. Some have more followers than others. This was not what Jaques meant but it is what happened.",
      tag: "Shakespeare \xB7 As You Like It"
    },
    {
      text: "An object in motion stays in motion unless acted upon by an outside force. Reelio is attempting to be the outside force. It is trying its best.",
      tag: "Newton \xB7 First Law"
    },
    {
      text: "The unexamined life is not worth living. You have examined 74 strangers' lives this session. Yours remains, as yet, unscheduled.",
      tag: "Socrates \xB7 The Apology"
    },
    {
      text: "Peace comes from within. You have checked outside approximately 2,800 times this month. Consistent null result.",
      tag: "Buddha \xB7 Dhammapada"
    },
    {
      text: "The road goes ever on and on. Tolkien meant this as an invitation to adventure. Instagram means it as a business model.",
      tag: "Tolkien \xB7 The Hobbit"
    },
    {
      text: "Slot machines were redesigned in the 1980s to maximise time between pulls. Short-form video was designed in the 2010s with identical intent and a considerably larger sample size.",
      tag: "game theory"
    },
    {
      text: "This is fine.",
      tag: "the dog \xB7 2013 \xB7 still applicable"
    },
    {
      text: "You opened Instagram for a quick look. Archaeologists will later describe this era as the Late Quick Look Period.",
      tag: "future historians \xB7 presumably"
    },
    {
      text: "The average human attention span is now shorter than a goldfish's. The goldfish does not have a dopamine problem. The goldfish does not have Instagram.",
      tag: "Microsoft Research \xB7 2015"
    },
    {
      text: "In 2009 the Like button was invented. In 2010 it was deployed to one billion people. Nobody asked the one billion people if this was a good idea.",
      tag: "product history"
    },
    {
      text: "You are not procrastinating. You are pre-experiencing the relief of finishing the thing you have not started.",
      tag: "cognitive reframe \xB7 invalid"
    },
    {
      text: "There is a version of you that closed the app after two minutes, went outside, and is now slightly better at being a person. Reelio is trying to introduce you.",
      tag: "ALSE v3.0"
    },
    {
      text: "The present moment always will have been. This one included.",
      tag: "Stoic fragment \xB7 unattributed"
    },
    {
      text: "Boredom is a skill. It was once the only option available. It produced most of Western literature.",
      tag: "pre-2007"
    },
    {
      text: "Variable reward schedules are also how slot machines work. This is not a coincidence. This was a design decision made in a meeting by people who knew exactly what they were doing.",
      tag: "behavioral economics"
    },
    {
      text: "Your attention is the most valuable thing you own. Several publicly listed companies agree with you.",
      tag: "market capitalisation"
    },
    {
      text: "Every reel you watched tonight had a team of engineers whose sole job was to make sure you watched the next one. You were not bored. You were outgunned.",
      tag: "ALSE \xB7 session log"
    },
    {
      text: "The app has no closing time. This was also a design decision.",
      tag: "product strategy \xB7 2010"
    },
    {
      text: "Somewhere, a recommendation engine is disappointed in you. Good.",
      tag: "ALSE \xB7 root for the underdog"
    },
    {
      text: "You closed the app. It is already thinking about how to get you back.",
      tag: "retention team \xB7 always on"
    },
    {
      text: "To do two things at once is to do neither. You were doing one thing. It was also doing one thing. The one thing was you.",
      tag: "Publilius Syrus \xB7 updated"
    },
    {
      text: "We shape our tools and thereafter our tools shape us. Marshall McLuhan said this in 1964. He did not know how right he was. He was very right.",
      tag: "McLuhan \xB7 Understanding Media"
    },
    {
      text: "The best time to stop was 40 minutes ago. The second best time is now.",
      tag: "ancient proverb \xB7 adapted"
    },
    {
      text: "You have seen a video of someone else's dog, someone else's holiday, someone else's kitchen renovation, and someone else's opinion about a film you have not seen. You feel vaguely worse. The model predicted this.",
      tag: "ALSE \xB7 session summary"
    },
    {
      text: "The Greek word for idleness is skhol\u0113. It is also the root of the word school. They considered rest to be where thinking happened. They did not have push notifications.",
      tag: "etymology"
    },
    {
      text: "This app is free. You are not the customer. This is the oldest joke on the internet. It is still true.",
      tag: "media literacy \xB7 2008 \u2014 present"
    },
    {
      text: "Your phone has no idea what time it is where you are emotionally. Reelio is trying to find out.",
      tag: "ALSE v3.0 \xB7 calibrating"
    },
    {
      text: "Leisure is the basis of culture. Josef Pieper wrote this in 1948. He meant rest, contemplation, and silence. He did not mean this. But here we are.",
      tag: "Pieper \xB7 Leisure the Basis of Culture"
    }
  ];
  const ONBOARD_BLOB_CONFIG = [
    { cx: 0.12, cy: 0.26, r: 160, color: "#8B5CF6", alpha: 0.28, speed: 16500, phase: 0 },
    { cx: 0.82, cy: 0.13, r: 140, color: "#6366F1", alpha: 0.27, speed: 14500, phase: 1.2 },
    { cx: 0.66, cy: 0.48, r: 132, color: "#34D399", alpha: 0.24, speed: 17500, phase: 2.5 },
    { cx: 0.18, cy: 0.8, r: 124, color: "#FBBF24", alpha: 0.26, speed: 15500, phase: 0.7 }
  ];
  function _hexToRgb(hex) {
    return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
  }
  function _drawOnboardBlobs(ctx, w, h, elapsed) {
    const PI2 = Math.PI * 2;
    const N = 7;
    const T = 0.24;
    const sc = Math.min(w, h) / 400;
    ONBOARD_BLOB_CONFIG.forEach((blob) => {
      const t = elapsed % blob.speed / blob.speed * PI2 + blob.phase;
      const r = blob.r * sc;
      const driftX = Math.cos(t * 0.7) * r * 0.06;
      const driftY = Math.sin(t * 0.6) * r * 0.05;
      const cx = blob.cx * w + driftX;
      const cy = blob.cy * h + driftY;
      const step = PI2 / N;
      const pts = [];
      for (let k = 0; k < N; k++) {
        const angle = k * step + t * 0.18;
        const wobble = r * (1 + 0.12 * Math.sin(t * 2.1 + k * 1.3));
        pts.push({ x: cx + wobble * Math.cos(angle), y: cy + wobble * Math.sin(angle) });
      }
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let k = 0; k < N; k++) {
        const curr = pts[k];
        const next = pts[(k + 1) % N];
        const prev = pts[(k + N - 1) % N];
        const next2 = pts[(k + 2) % N];
        ctx.bezierCurveTo(
          curr.x + (next.x - prev.x) * T,
          curr.y + (next.y - prev.y) * T,
          next.x - (next2.x - curr.x) * T,
          next.y - (next2.y - curr.y) * T,
          next.x,
          next.y
        );
      }
      ctx.closePath();
      const [rr, gg, bb] = _hexToRgb(blob.color);
      ctx.fillStyle = `rgba(${rr},${gg},${bb},${blob.alpha})`;
      ctx.fill();
    });
  }
  function BlobCanvas() {
    const canvasRef = useRef(null);
    const rafRef = useRef(null);
    const t0Ref = useRef(null);
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      const resize = () => {
        const dpr = window.devicePixelRatio || 1;
        const w = canvas.offsetWidth;
        const h = canvas.offsetHeight;
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      };
      resize();
      window.addEventListener("resize", resize);
      t0Ref.current = performance.now();
      const loop = () => {
        const elapsed = performance.now() - t0Ref.current;
        const w = canvas.offsetWidth;
        const h = canvas.offsetHeight;
        ctx.clearRect(0, 0, w, h);
        _drawOnboardBlobs(ctx, w, h, elapsed);
        rafRef.current = requestAnimationFrame(loop);
      };
      loop();
      return () => {
        window.removeEventListener("resize", resize);
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      };
    }, []);
    return /* @__PURE__ */ React.createElement("canvas", { ref: canvasRef, style: {
      position: "absolute",
      inset: 0,
      width: "100%",
      height: "100%",
      pointerEvents: "none",
      zIndex: 2
    } });
  }
  function OnboardingState() {
    const checkA11y = () => typeof window.Android?.isAccessibilityEnabled === "function" ? !!window.Android.isAccessibilityEnabled() : false;
    const [isAccessibilityActive, setIsAccessibilityActive] = useState(checkA11y);
    useEffect(() => {
      const id = setInterval(() => {
        const cur = checkA11y();
        setIsAccessibilityActive((prev) => prev !== cur ? cur : prev);
      }, 1e3);
      const onStatus = (e) => setIsAccessibilityActive(!!e.detail);
      window.addEventListener("a11y-status", onStatus);
      return () => {
        clearInterval(id);
        window.removeEventListener("a11y-status", onStatus);
      };
    }, []);
    const quote = useMemo(() => ONBOARD_QUOTES[Math.floor(Math.random() * ONBOARD_QUOTES.length)], []);
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("style", null, `
            @keyframes headIn { from { opacity:0; transform: translateY(-18px); } to { opacity:1; transform: translateY(0); } }
            @keyframes cardUp { from { opacity:0; transform: translateY(32px); } to { opacity:1; transform: translateY(0); } }
            @keyframes tagPop { from { opacity:0; transform: scale(0.85) translateY(6px); } to { opacity:1; transform: scale(1) translateY(0); } }
            @keyframes dotPulse { 0%,100% { opacity:0.4; transform: scale(1); } 50% { opacity:1; transform: scale(1.3); } }
        `), /* @__PURE__ */ React.createElement("div", { style: {
      minHeight: "100vh",
      background: "#EDE8DF",
      position: "relative",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column"
    } }, /* @__PURE__ */ React.createElement(
      "svg",
      {
        style: { position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 1 },
        viewBox: "0 0 100 100",
        preserveAspectRatio: "none"
      },
      /* @__PURE__ */ React.createElement("filter", { id: "grain" }, /* @__PURE__ */ React.createElement("feTurbulence", { type: "fractalNoise", baseFrequency: "0.7", numOctaves: "4", stitchTiles: "stitch" }), /* @__PURE__ */ React.createElement("feColorMatrix", { type: "saturate", values: "0" })),
      /* @__PURE__ */ React.createElement("rect", { width: "100%", height: "100%", filter: "url(#grain)", opacity: "0.04" })
    ), /* @__PURE__ */ React.createElement(BlobCanvas, null), /* @__PURE__ */ React.createElement("div", { style: {
      position: "relative",
      zIndex: 20,
      padding: "60px 28px 0",
      animation: "headIn 0.6s ease 0.08s both"
    } }, /* @__PURE__ */ React.createElement("div", { style: {
      fontFamily: "'Space Grotesk', sans-serif",
      fontSize: 52,
      fontWeight: 700,
      lineHeight: 1.06,
      letterSpacing: "-0.02em",
      color: "#1A1612",
      marginBottom: 6
    } }, "Reelio"), /* @__PURE__ */ React.createElement("div", { style: {
      fontSize: 9,
      fontWeight: 800,
      letterSpacing: "0.28em",
      textTransform: "uppercase",
      color: "#9A8E84",
      marginBottom: 18,
      fontFamily: "'Nunito', sans-serif"
    } }, "ALSE v3.0"), /* @__PURE__ */ React.createElement("div", { style: {
      fontFamily: "'Space Grotesk', sans-serif",
      fontSize: 36,
      fontWeight: 700,
      lineHeight: 1.12,
      letterSpacing: "-0.02em",
      color: "#1A1612"
    } }, "waiting for", /* @__PURE__ */ React.createElement("br", null), /* @__PURE__ */ React.createElement("em", { style: { fontStyle: "italic", fontWeight: 400 } }, "your next move."))), /* @__PURE__ */ React.createElement("div", { style: { flex: 1 } }), /* @__PURE__ */ React.createElement("div", { style: {
      position: "relative",
      zIndex: 20,
      padding: "0 18px 32px",
      animation: "cardUp 0.7s cubic-bezier(0.34,1.3,0.64,1) 0.3s both"
    } }, /* @__PURE__ */ React.createElement("div", { style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 7,
      background: "#4A2580",
      borderRadius: 99,
      padding: "6px 16px 6px 10px",
      marginBottom: 10,
      animation: "tagPop 0.45s ease 0.6s both"
    } }, /* @__PURE__ */ React.createElement("div", { style: {
      width: 7,
      height: 7,
      borderRadius: "50%",
      background: "#9B6FCC"
    } }), /* @__PURE__ */ React.createElement("span", { style: {
      fontSize: 9,
      fontWeight: 800,
      letterSpacing: "0.16em",
      textTransform: "uppercase",
      color: "rgba(255,255,255,0.55)",
      fontFamily: "'Nunito', sans-serif"
    } }, quote.tag)), /* @__PURE__ */ React.createElement("div", { style: {
      background: "#E8E0F5",
      borderRadius: 26,
      padding: "26px 24px 22px",
      position: "relative",
      overflow: "hidden",
      boxShadow: "0 12px 36px rgba(107,63,160,0.12)"
    } }, /* @__PURE__ */ React.createElement("div", { style: {
      position: "absolute",
      top: -30,
      right: -30,
      width: 120,
      height: 120,
      borderRadius: "50%",
      background: "#F3EFFA",
      opacity: 0.45,
      filter: "blur(30px)",
      pointerEvents: "none"
    } }), /* @__PURE__ */ React.createElement("div", { style: {
      position: "absolute",
      bottom: -25,
      left: -25,
      width: 100,
      height: 100,
      borderRadius: "50%",
      background: "#9B6FCC",
      opacity: 0.2,
      filter: "blur(25px)",
      pointerEvents: "none"
    } }), /* @__PURE__ */ React.createElement("p", { style: {
      fontFamily: "'Nunito', sans-serif",
      fontSize: 16,
      fontWeight: 400,
      fontStyle: "italic",
      lineHeight: 1.7,
      letterSpacing: "-0.005em",
      color: "#1A1612",
      position: "relative",
      zIndex: 1,
      marginBottom: 22
    } }, "\u201C", quote.text, "\u201D"), /* @__PURE__ */ React.createElement("div", { style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "flex-start",
      position: "relative",
      zIndex: 1
    } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } }, /* @__PURE__ */ React.createElement("div", { style: {
      width: 8,
      height: 8,
      borderRadius: "50%",
      background: "#6B3FA0",
      animation: "dotPulse 2.4s ease-in-out infinite"
    } }), /* @__PURE__ */ React.createElement("span", { style: {
      fontFamily: "'Space Mono', monospace",
      fontSize: 9,
      fontWeight: 700,
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      color: "rgba(107,63,160,0.4)"
    } }, "Listening for activity")))), !isAccessibilityActive && /* @__PURE__ */ React.createElement("div", { onClick: () => window.Android?.enableAccessibility?.(), style: {
      marginTop: 14,
      background: "#1A1612",
      borderRadius: 18,
      padding: "15px 20px",
      display: "flex",
      alignItems: "center",
      gap: 12,
      cursor: "pointer",
      boxShadow: "0 8px 24px rgba(26,22,18,0.15)"
    } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 20 } }, "\u{1F513}"), /* @__PURE__ */ React.createElement("div", { style: { flex: 1 } }, /* @__PURE__ */ React.createElement("div", { style: {
      fontSize: 13,
      fontWeight: 800,
      color: "#F7F3EC",
      fontFamily: "'Nunito', sans-serif"
    } }, "Enable Accessibility"), /* @__PURE__ */ React.createElement("div", { style: {
      fontSize: 10,
      fontWeight: 600,
      color: "rgba(247,243,236,0.55)",
      fontFamily: "'Nunito', sans-serif"
    } }, "Grant tracking permission")), /* @__PURE__ */ React.createElement("span", { style: { color: "#F7F3EC", fontSize: 18 } }, "\u2192")), /* @__PURE__ */ React.createElement("p", { style: {
      marginTop: 12,
      paddingLeft: 4,
      fontFamily: "'Nunito', sans-serif",
      fontStyle: "italic",
      fontSize: 12,
      color: "rgba(26,22,18,0.22)",
      lineHeight: 1.5
    } }, "Open Instagram Reels \u2014 Reelio starts tracking automatically."))));
  }
  function normalizeData(rawData) {
    const sessions = safeArr(rawData?.sessions).filter((s) => s && typeof s === "object");
    const mostRecent = sessions[sessions.length - 1] || null;
    const sessionProbabilities = sessions.map((s) => maybeNum(s.S_t)).filter(isFiniteNumber);
    const sessionDurations = sessions.map((s) => deriveSessionDurationSec(s)).filter(isFiniteNumber);
    const sessionReels = sessions.map((s) => maybeNum(s.nReels)).filter(isFiniteNumber);
    const sessionDwells = sessions.map((s) => maybeNum(s.avgDwell)).filter(isFiniteNumber);
    const transition = rawData?.model_parameters?.transition_matrix;
    const sessTransition = rawData?.model_parameters?.session_transition_matrix;
    const dateBuckets = {};
    sessions.forEach((s, idx) => {
      const key = normalizeDateKey(s);
      if (!key) return;
      if (!dateBuckets[key]) dateBuckets[key] = [];
      dateBuckets[key].push({
        raw: s,
        idx,
        ts: pickSessionTimestampMs(s),
        durationSec: deriveSessionDurationSec(s)
      });
    });
    const dateKeys = Object.keys(dateBuckets).sort();
    const latestDateKey = dateKeys.length ? dateKeys[dateKeys.length - 1] : null;
    const earliestDateKey = dateKeys.length ? dateKeys[0] : null;
    const latestDateSessions = latestDateKey ? [...dateBuckets[latestDateKey]] : [];
    latestDateSessions.sort((a, b) => {
      if (isFiniteNumber(a.ts) && isFiniteNumber(b.ts)) return a.ts - b.ts;
      return a.idx - b.idx;
    });
    const deriveHeatmapLabels = (dateKey, fallbackLabel = "") => {
      if (typeof dateKey === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
        const dt = new Date(`${dateKey}T12:00:00`);
        if (!Number.isNaN(dt.getTime())) {
          return {
            dayLabel: dt.toLocaleDateString(void 0, { weekday: "short" }).toUpperCase(),
            dateLabel: dt.toLocaleDateString(void 0, { month: "short", day: "numeric" })
          };
        }
      }
      return {
        dayLabel: fallbackLabel || "",
        dateLabel: dateKey || ""
      };
    };
    const timelineEntryFromSource = (entry, prevTs2) => {
      const source = entry.raw || entry;
      const ts = isFiniteNumber(entry.ts) ? entry.ts : pickSessionTimestampMs(source);
      let startTime = "";
      if (isFiniteNumber(ts)) {
        startTime = new Date(ts).toTimeString().slice(0, 5);
      }
      const explicitDurationMin = maybeNum(source.durationMin);
      const explicitDurationSec = maybeNum(source.durationSec) ?? maybeNum(source.sessionDurationSec);
      const derivedDurationSec = isFiniteNumber(explicitDurationSec) ? explicitDurationSec : isFiniteNumber(entry.durationSec) ? entry.durationSec : deriveSessionDurationSec(source);
      const durationMin = isFiniteNumber(explicitDurationMin) ? explicitDurationMin : isFiniteNumber(derivedDurationSec) ? derivedDurationSec / 60 : null;
      const reelCount = maybeNum(source.reelCount) ?? maybeNum(source.nReels) ?? maybeNum(source.totalReels);
      const probability = maybeNum(source.S_t) ?? maybeNum(source.captureProb);
      const explicitGap = maybeNum(source.gapBeforeMin);
      const derivedGap = isFiniteNumber(prevTs2) && isFiniteNumber(ts) ? (ts - prevTs2) / 6e4 : null;
      const gapBeforeMin = isFiniteNumber(explicitGap) ? explicitGap : isFiniteNumber(derivedGap) ? Math.max(0, derivedGap) : null;
      return {
        startTime,
        durationMin,
        reelCount,
        gapBeforeMin,
        probability,
        isDoom: isFiniteNumber(probability) ? probability >= DOOM_THRESHOLD : Boolean(source.isDoom),
        _ts: ts,
        // Session identity — needed for retroactive labeling bridge call
        _sessionNum: source.sessionNum ?? null,
        _sessionDate: source.date ?? null,
        // Survey self-report labels
        postSessionRating: maybeNum(source.postSessionRating) ?? 0,
        regretScore: maybeNum(source.regretScore) ?? 0,
        moodBefore: maybeNum(source.moodBefore) ?? 0,
        moodAfter: maybeNum(source.moodAfter) ?? 0,
        intendedAction: source.intendedAction || "",
        actualVsIntended: maybeNum(source.actualVsIntended) ?? 0,
        comparativeRating: maybeNum(source.comparativeRating) ?? 0,
        delayedRegretScore: maybeNum(source.delayedRegretScore) ?? 0,
        supervisedDoom: maybeNum(source.supervisedDoom) ?? 0,
        hasSurvey: Boolean(source.hasSurvey),
        retroactiveLabel: Boolean(source.retroactiveLabel),
        // Heuristic and confidence metadata for Fix 1
        heuristicScore: maybeNum(source.heuristic_score) ?? 0,
        modelConf: maybeNum(source.model_conf) ?? 1
      };
    };
    const providedTodaySource = safeArr(rawData?.todaySessions).filter((s) => s && typeof s === "object").map((s, idx) => ({ raw: s, idx, ts: pickSessionTimestampMs(s), durationSec: deriveSessionDurationSec(s) }));
    providedTodaySource.sort((a, b) => {
      if (isFiniteNumber(a.ts) && isFiniteNumber(b.ts)) return a.ts - b.ts;
      return a.idx - b.idx;
    });
    const _now = /* @__PURE__ */ new Date();
    const deviceTodayKey = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, "0")}-${String(_now.getDate()).padStart(2, "0")}`;
    const deviceTodaySessions = dateBuckets[deviceTodayKey] ? [...dateBuckets[deviceTodayKey]].sort((a, b) => {
      if (isFiniteNumber(a.ts) && isFiniteNumber(b.ts)) return a.ts - b.ts;
      return a.idx - b.idx;
    }) : [];
    const todaySource = providedTodaySource.length ? providedTodaySource : deviceTodaySessions;
    let prevTs = null;
    const todaySessionsDetailed = todaySource.map((entry) => {
      const row = timelineEntryFromSource(entry, prevTs);
      if (isFiniteNumber(row._ts)) prevTs = row._ts;
      return row;
    });
    const todaySessions = todaySessionsDetailed.map(({ _ts, probability, ...rest }) => rest);
    const todayDurationSecs = todaySessionsDetailed.map((s) => isFiniteNumber(s.durationMin) ? s.durationMin * 60 : null).filter(isFiniteNumber);
    const derivedActiveTodaySeconds = todayDurationSecs.length ? sumOf(todayDurationSecs) : null;
    const dailyTotals = dateKeys.map((k) => {
      const durations = safeArr(dateBuckets[k]).map((x) => x.durationSec).filter(isFiniteNumber);
      return durations.length ? sumOf(durations) : null;
    }).filter(isFiniteNumber);
    const dailySessionCounts = dateKeys.map((k) => safeArr(dateBuckets[k]).length).filter(isFiniteNumber);
    const derivedAvgSessions = averageOf(dailySessionCounts);
    const derivedAvgActiveTimeTodaySeconds = averageOf(dailyTotals);
    const interactionsFromToday = todaySource.map((entry) => {
      const s = entry.raw || entry;
      const explicit = maybeNum(s.totalInteractions);
      if (isFiniteNumber(explicit)) return explicit;
      const parts = [
        maybeNum(s.totalLikes),
        maybeNum(s.totalComments),
        maybeNum(s.totalShares),
        maybeNum(s.totalSaves),
        maybeNum(s.likes),
        maybeNum(s.comments),
        maybeNum(s.shares),
        maybeNum(s.saves)
      ].filter(isFiniteNumber);
      return parts.length ? sumOf(parts) : null;
    }).filter(isFiniteNumber);
    const derivedInteractionsToday = interactionsFromToday.length ? sumOf(interactionsFromToday) : null;
    const derivedSessionsToday = todaySessions.length || null;
    const derivedCapturedToday = todaySessionsDetailed.length ? todaySessionsDetailed.filter((s) => isFiniteNumber(s.probability) ? s.probability >= DOOM_THRESHOLD : s.isDoom).length : null;
    const sessionsWithTs = sessions.map((s) => ({ raw: s, startMs: pickSessionTimestampMs(s) })).filter((x) => isFiniteNumber(x.startMs)).sort((a, b) => a.startMs - b.startMs);
    let derivedGapMin = null;
    if (sessionsWithTs.length >= 2) {
      const prev = sessionsWithTs[sessionsWithTs.length - 2];
      const last = sessionsWithTs[sessionsWithTs.length - 1];
      const prevEndRaw = prev.raw?.endTime;
      let prevEndMs = null;
      if (typeof prevEndRaw === "string" && prevEndRaw && prevEndRaw !== "Unknown") {
        const parsed = new Date(prevEndRaw);
        if (!Number.isNaN(parsed.getTime())) prevEndMs = parsed.getTime();
      }
      const gapBaseMs = isFiniteNumber(prevEndMs) ? prevEndMs : prev.startMs;
      derivedGapMin = Math.max(0, (last.startMs - gapBaseMs) / 6e4);
    }
    const payloadGapMin = maybeNum(rawData?.timeSinceLastSessionMin);
    const timeSinceLastSessionMin = isFiniteNumber(payloadGapMin) && payloadGapMin > 0 ? payloadGapMin : derivedGapMin;
    const idleSinceLastSessionMin = maybeNum(rawData?.idleSinceLastSessionMin);
    const captureRiskScoreRaw = maybeNum(rawData?.captureRiskScore) ?? (isFiniteNumber(maybeNum(mostRecent?.S_t)) ? maybeNum(mostRecent?.S_t) * 100 : null);
    const captureRiskScore = isFiniteNumber(captureRiskScoreRaw) ? Math.max(0, Math.min(100, captureRiskScoreRaw)) : null;
    const deriveRiskLabel = (score) => {
      if (!isFiniteNumber(score)) return null;
      if (score >= 70) return "CRITICAL";
      if (score >= 45) return "ELEVATED";
      if (score >= 25) return "STABLE";
      return "SAFE";
    };
    const riskLabel = typeof rawData?.riskLabel === "string" && rawData.riskLabel ? rawData.riskLabel : deriveRiskLabel(captureRiskScore) || "SAFE";
    const derivedAvgSessionDurationSec = averageOf(sessionDurations);
    const derivedAvgReelsPerSession = averageOf(sessionReels);
    const derivedAvgDwellTimeSec = averageOf(sessionDwells);
    const derivedTotalWatchedSeconds = sessionDurations.length ? sumOf(sessionDurations) : null;
    const derivedAllTimeCaptureRate = sessionProbabilities.length ? sessionProbabilities.filter((p) => p >= DOOM_THRESHOLD).length / sessionProbabilities.length : null;
    const lastTenProbs = sessionProbabilities.slice(-10);
    const derivedTenSessionAvgScore = lastTenProbs.length ? averageOf(lastTenProbs) * 100 : null;
    const sessionDoomPersistence = maybeNum(rawData?.sessionDoomPersistence) ?? maybeNum(sessTransition?.[1]?.[1]);
    const escapeRate = maybeNum(rawData?.escapeRate) ?? maybeNum(sessTransition?.[1]?.[0]);
    const pullIndex = maybeNum(rawData?.pullIndex) ?? (isFiniteNumber(sessionDoomPersistence) && isFiniteNumber(escapeRate) && escapeRate > 0 ? sessionDoomPersistence / escapeRate : null);
    const modelConfidence = maybeNum(rawData?.modelConfidence) ?? maybeNum(rawData?.model_confidence) ?? maybeNum(rawData?.model_confidence_breakdown?.overall);
    const thisWindowDoomRate = maybeNum(rawData?.thisWindowDoomRate) ?? maybeNum(rawData?.weekly_summary?.this_week_doom_rate);
    const lastWindowDoomRate = maybeNum(rawData?.lastWindowDoomRate) ?? maybeNum(rawData?.weekly_summary?.last_week_doom_rate);
    const weeklyInsight = typeof rawData?.weeklyInsight === "string" && rawData.weeklyInsight || typeof rawData?.weekly_summary?.insight === "string" && rawData.weekly_summary.insight || null;
    let weeklyDelta = typeof rawData?.weeklyDelta === "string" && rawData.weeklyDelta || typeof rawData?.weekly_summary?.delta_direction === "string" && rawData.weekly_summary.delta_direction || null;
    if (!weeklyDelta && isFiniteNumber(thisWindowDoomRate) && isFiniteNumber(lastWindowDoomRate)) {
      const diff = thisWindowDoomRate - lastWindowDoomRate;
      weeklyDelta = diff <= -0.03 ? "Improving" : diff >= 0.03 ? "Worsening" : "Stable";
    }
    const parseHour = (v) => {
      if (isFiniteNumber(v)) return v;
      if (typeof v === "string" && /^\d{1,2}$/.test(v.trim())) return parseInt(v.trim(), 10);
      return null;
    };
    const circadianFromPayload = safeArr(rawData?.circadianProfile).map((c) => ({
      hour: parseHour(c?.hour),
      captureProb: maybeNum(c?.captureProb)
    }));
    const circadianFromLegacy = safeArr(rawData?.circadian).map((c) => ({
      hour: parseHour(c?.h),
      captureProb: maybeNum(c?.doom)
    }));
    const circadianProfile = (circadianFromPayload.length ? circadianFromPayload : circadianFromLegacy).filter((c) => isFiniteNumber(c.hour) && isFiniteNumber(c.captureProb)).map((c) => ({
      hour: (Math.round(c.hour) % 24 + 24) % 24,
      captureProb: Math.max(0, Math.min(1, c.captureProb))
    })).sort((a, b) => a.hour - b.hour);
    const peakCircPoint = circadianProfile.reduce((best, c) => !best || c.captureProb > best.captureProb ? c : best, null);
    const safeCircPoint = circadianProfile.reduce((best, c) => !best || c.captureProb < best.captureProb ? c : best, null);
    const derivedPeakWindow = peakCircPoint ? formatHourWindow(peakCircPoint.hour, 2) : null;
    const derivedSafestWindow = safeCircPoint ? formatHourWindow(safeCircPoint.hour, 2) : null;
    const peakRiskWindow = typeof rawData?.peakRiskWindow === "string" && rawData.peakRiskWindow || derivedPeakWindow;
    const safestWindow = typeof rawData?.safestWindow === "string" && rawData.safestWindow || derivedSafestWindow;
    let circadianPattern = typeof rawData?.circadianPattern === "string" && rawData.circadianPattern || null;
    if (!circadianPattern && peakCircPoint && safeCircPoint && peakRiskWindow && safestWindow) {
      circadianPattern = `Highest risk around ${peakRiskWindow} (${Math.round(peakCircPoint.captureProb * 100)}%), lowest around ${safestWindow} (${Math.round(safeCircPoint.captureProb * 100)}%).`;
    }
    const driverDetailForName = (name) => {
      if (/Session Length/i.test(name) && isFiniteNumber(maybeNum(mostRecent?.nReels))) {
        return `Most recent session had ${Math.round(mostRecent.nReels)} reels.`;
      }
      if (/Rapid Re-entry/i.test(name) && isFiniteNumber(timeSinceLastSessionMin)) {
        return `Gap before the latest session was ${Math.round(timeSinceLastSessionMin)} minutes.`;
      }
      if (/Dwell Collapse/i.test(name) && isFiniteNumber(maybeNum(mostRecent?.avgDwell))) {
        return `Latest average dwell was ${mostRecent.avgDwell.toFixed(1)}s per reel.`;
      }
      if (/Rewatch Compulsion/i.test(name) && isFiniteNumber(maybeNum(mostRecent?.avgCaptureLength))) {
        return `Recent average capture length was ${mostRecent.avgCaptureLength.toFixed(1)} reels.`;
      }
      if (/Environment/i.test(name) && typeof mostRecent?.timePeriod === "string" && mostRecent.timePeriod && mostRecent.timePeriod !== "Unknown") {
        return `Recent high-weight sessions occurred during ${mostRecent.timePeriod.toLowerCase()} periods.`;
      }
      return "";
    };
    const normalizeDrivers = (drivers) => {
      const filtered = safeArr(drivers).map((d) => {
        const contribution = maybeNum(d?.contribution) ?? maybeNum(d?.weight);
        if (!isFiniteNumber(contribution)) return null;
        const name = typeof d?.name === "string" && d.name ? d.name : "Unlabeled driver";
        return {
          name,
          contribution,
          weight: maybeNum(d?.weight),
          rawValue: d?.rawValue,
          detail: driverDetailForName(name)
        };
      }).filter(Boolean);
      const totalContribution = sumOf(filtered.map((d) => d.contribution));
      return filtered.map((d) => {
        const normalized = totalContribution > 0 ? d.contribution / totalContribution : d.contribution;
        return {
          name: d.name,
          contribution: normalized,
          weight: isFiniteNumber(d.weight) ? d.weight : normalized,
          rawValue: d.rawValue,
          detail: d.detail
        };
      });
    };
    const existingDrivers = normalizeDrivers(rawData?.doomDrivers);
    const pickComponentValue = (obj, keys) => {
      for (let i = 0; i < keys.length; i++) {
        const candidate = maybeNum(obj?.[keys[i]]);
        if (isFiniteNumber(candidate)) return candidate;
      }
      return null;
    };
    const componentSource = rawData?.historical_drivers || rawData?.doom_components || rawData?.scorer_component_weights || null;
    const componentDriverDefs = [
      { name: "Session Length", keys: ["session_length", "length"] },
      { name: "Rewatch Compulsion", keys: ["rewatch_compulsion", "rewatch"] },
      { name: "Rapid Re-entry", keys: ["rapid_reentry", "rapidReentry"] },
      { name: "Exit Conflict", keys: ["exit_conflict", "volitional_conflict"] },
      { name: "Scroll Automaticity", keys: ["scroll_automaticity", "automaticity"] },
      { name: "Dwell Collapse", keys: ["dwell_collapse"] },
      { name: "Environment", keys: ["environment"] }
    ];
    let derivedDrivers = [];
    if (componentSource && typeof componentSource === "object") {
      const collected = componentDriverDefs.map((d) => ({ name: d.name, value: pickComponentValue(componentSource, d.keys) })).filter((d) => isFiniteNumber(d.value));
      const total = sumOf(collected.map((d) => d.value));
      derivedDrivers = collected.map((d) => {
        const normalized = total > 0 ? d.value / total : d.value;
        return {
          name: d.name,
          weight: normalized,
          contribution: normalized,
          rawValue: null,
          detail: driverDetailForName(d.name)
        };
      });
    }
    const doomDrivers = (existingDrivers.length ? existingDrivers : derivedDrivers).sort((a, b) => safeNum(b.contribution, 0) - safeNum(a.contribution, 0));
    const timelineCapture = safeArr(rawData?.timeline?.p_capture).map((p) => maybeNum(p)).filter(isFiniteNumber);
    const topologyFromPayload = rawData?.sessionTopology;
    const payloadReelData = safeArr(topologyFromPayload?.reelData).map((r, idx) => {
      const captureProb = maybeNum(r?.captureProb);
      if (!isFiniteNumber(captureProb)) return null;
      return {
        index: maybeNum(r?.index) ?? idx + 1,
        captureProb,
        state: captureProb > 0.66 ? "Autopilot" : captureProb > 0.33 ? "Borderline" : "Mindful"
      };
    }).filter(Boolean);
    const derivedTopologyData = timelineCapture.map((p, i) => ({
      index: i + 1,
      captureProb: p,
      state: p > 0.66 ? "Autopilot" : p > 0.33 ? "Borderline" : "Mindful"
    }));
    const topologyReelData = payloadReelData.length ? payloadReelData : derivedTopologyData;
    const topologyTotal = topologyReelData.length;
    const topologySafeCount = topologyReelData.filter((r) => r.captureProb <= 0.33).length;
    const topologyBorderCount = topologyReelData.filter((r) => r.captureProb > 0.33 && r.captureProb <= 0.66).length;
    const topologyDoomCount = topologyReelData.filter((r) => r.captureProb > 0.66).length;
    const sessionTopology = {
      totalReels: isFiniteNumber(maybeNum(topologyFromPayload?.totalReels)) ? topologyFromPayload.totalReels : topologyTotal,
      sessions: sessions.length,
      safePercent: topologyTotal ? topologySafeCount / topologyTotal * 100 : 0,
      borderPercent: topologyTotal ? topologyBorderCount / topologyTotal * 100 : 0,
      doomPercent: topologyTotal ? topologyDoomCount / topologyTotal * 100 : 0,
      reelData: topologyReelData
    };
    const derivedCasualToDoom = maybeNum(sessTransition?.[0]?.[1]);
    const derivedDoomToCasual = maybeNum(sessTransition?.[1]?.[0]);
    const stateDynamics = {
      casualToDoomProb: maybeNum(rawData?.stateDynamics?.casualToDoomProb) ?? derivedCasualToDoom,
      doomToCasualProb: maybeNum(rawData?.stateDynamics?.doomToCasualProb) ?? derivedDoomToCasual,
      recoveryWindowSessions: maybeNum(rawData?.stateDynamics?.recoveryWindowSessions) ?? (isFiniteNumber(derivedDoomToCasual) && derivedDoomToCasual > 0 ? 1 / derivedDoomToCasual : null),
      recoveryWindowDelta: maybeNum(rawData?.stateDynamics?.recoveryWindowDelta),
      modelConfidence
    };
    const personalCaptureBaselineSec = (() => {
      const recentDurations = sessions.map((entry) => {
        const source = entry?.raw || entry || {};
        return maybeNum(entry?.durationSec) ?? maybeNum(source.durationSec) ?? maybeNum(source.sessionDurationSec) ?? deriveSessionDurationSec(source);
      }).filter((durationSec) => isFiniteNumber(durationSec) && durationSec >= 20).slice(-30).sort((a, b) => a - b);
      if (!recentDurations.length)
        return 180;
      const mid = Math.floor(recentDurations.length / 2);
      const median = recentDurations.length % 2 ? recentDurations[mid] : (recentDurations[mid - 1] + recentDurations[mid]) / 2;
      return Math.min(300, Math.max(90, median));
    })();
    const getDailyCaptureWeight = (entry) => {
      const source = entry?.raw || entry || {};
      const explicitDurationSec = maybeNum(source.durationSec) ?? maybeNum(source.sessionDurationSec);
      const fallbackDurationSec = isFiniteNumber(entry?.durationSec) ? entry.durationSec : deriveSessionDurationSec(source);
      const durationSec = isFiniteNumber(explicitDurationSec) ? explicitDurationSec : fallbackDurationSec;
      if (!isFiniteNumber(durationSec) || durationSec <= 0)
        return 0.2;
      const baseWeight = Math.min(durationSec / personalCaptureBaselineSec, 1);
      if (durationSec < 30)
        return Math.max(0.06, baseWeight * 0.2);
      if (durationSec < 60)
        return Math.max(0.12, baseWeight * 0.45);
      if (durationSec < 120)
        return Math.max(0.3, baseWeight * 0.75);
      return Math.max(0.45, baseWeight);
    };
    const derivedHeatmapData = dateKeys.map((dateKey) => {
      const bucket = dateBuckets[dateKey] || [];
      const weighted = bucket.map((e) => {
        const prob = maybeNum(e.raw?.S_t);
        if (!isFiniteNumber(prob))
          return null;
        const weight = getDailyCaptureWeight(e);
        return weight > 0 ? { prob, weight } : null;
      }).filter(Boolean);
      const totalWeight = weighted.length ? weighted.reduce((sum, e) => sum + e.weight, 0) : 0;
      const avgCapture = totalWeight > 0 ? weighted.reduce((sum, e) => sum + e.prob * e.weight, 0) / totalWeight : null;
      const labels = deriveHeatmapLabels(dateKey, dateKey.slice(5));
      return {
        date: dateKey,
        dayLabel: labels.dayLabel,
        dateLabel: labels.dateLabel,
        avgCapture,
        riskLevel: null,
        sessionCount: bucket.length
      };
    }).filter((d) => isFiniteNumber(d.avgCapture));
    const heatmapData = safeArr(rawData?.heatmapData).length ? safeArr(rawData.heatmapData).map((d) => {
      const date = d?.date || "";
      const labels = deriveHeatmapLabels(date, d?.dayLabel || d?.d || "");
      return {
        date,
        dayLabel: labels.dayLabel,
        dateLabel: labels.dateLabel,
        avgCapture: maybeNum(d?.avgCapture) ?? maybeNum(d?.v),
        riskLevel: d?.riskLevel || null,
        sessionCount: maybeNum(d?.sessionCount) ?? maybeNum(d?.s)
      };
    }) : safeArr(rawData?.days14).length ? safeArr(rawData.days14).map((d) => {
      const date = d?.date || "";
      const labels = deriveHeatmapLabels(date, d?.dayLabel || d?.d || "");
      return {
        date,
        dayLabel: labels.dayLabel,
        dateLabel: labels.dateLabel,
        avgCapture: maybeNum(d?.avgCapture) ?? maybeNum(d?.v),
        riskLevel: d?.riskLevel || null,
        sessionCount: maybeNum(d?.sessionCount) ?? maybeNum(d?.s)
      };
    }) : derivedHeatmapData;
    heatmapData.sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));
    const derivedDoomStreak = (() => {
      let streak = 0;
      for (let i = sessions.length - 1; i >= 0; i -= 1) {
        const p = maybeNum(sessions[i]?.S_t);
        if (!isFiniteNumber(p) || p < DOOM_THRESHOLD) break;
        streak += 1;
      }
      return streak;
    })();
    const derivedMindfulStreak = (() => {
      let streak = 0;
      for (let i = sessions.length - 1; i >= 0; i -= 1) {
        const p = maybeNum(sessions[i]?.S_t);
        if (!isFiniteNumber(p) || p >= DOOM_THRESHOLD) break;
        streak += 1;
      }
      return streak;
    })();
    const moodDissonance = (() => {
      const withMood = sessions.filter((s) => maybeNum(s.moodBefore) > 0 && maybeNum(s.moodAfter) > 0);
      const withRegret = sessions.filter((s) => maybeNum(s.regretScore) > 0);
      if (!withMood.length && !withRegret.length) return null;
      const avg = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
      const isDoomSession = (s) => {
        const p = maybeNum(s.S_t);
        return isFiniteNumber(p) && p >= DOOM_THRESHOLD;
      };
      const doomMood = withMood.filter(isDoomSession);
      const mindfulMood = withMood.filter((s) => !isDoomSession(s));
      const doomRegret = withRegret.filter(isDoomSession);
      const mindfulRegret = withRegret.filter((s) => !isDoomSession(s));
      return {
        doomMoodDelta: avg(doomMood.map((s) => maybeNum(s.moodAfter) - maybeNum(s.moodBefore)).filter(isFiniteNumber)),
        mindfulMoodDelta: avg(mindfulMood.map((s) => maybeNum(s.moodAfter) - maybeNum(s.moodBefore)).filter(isFiniteNumber)),
        doomAvgRegret: avg(doomRegret.map((s) => maybeNum(s.regretScore)).filter(isFiniteNumber)),
        mindfulAvgRegret: avg(mindfulRegret.map((s) => maybeNum(s.regretScore)).filter(isFiniteNumber)),
        doomSurveyed: Math.max(doomMood.length, doomRegret.length),
        mindfulSurveyed: Math.max(mindfulMood.length, mindfulRegret.length),
        totalSurveyed: withMood.length + withRegret.length
      };
    })();
    const avgSessions = maybeNum(rawData?.avgSessions) ?? derivedAvgSessions;
    const sessionsToday = maybeNum(rawData?.sessionsToday) ?? derivedSessionsToday;
    const todayVsAvgDelta = maybeNum(rawData?.todayVsAvgDelta) ?? (isFiniteNumber(sessionsToday) && isFiniteNumber(avgSessions) && avgSessions > 0 ? (sessionsToday - avgSessions) / avgSessions * 100 : null);
    const activeTimeTodaySeconds = maybeNum(rawData?.activeTimeTodaySeconds) ?? derivedActiveTodaySeconds;
    const activeTimeToday = typeof rawData?.activeTimeToday === "string" && rawData.activeTimeToday ? rawData.activeTimeToday : isFiniteNumber(activeTimeTodaySeconds) ? formatDurationSec(activeTimeTodaySeconds) : null;
    const dataSinceDate = typeof rawData?.dataSinceDate === "string" && rawData.dataSinceDate || typeof rawData?.startDate === "string" && rawData.startDate || earliestDateKey || null;
    const last3SessionAutopilotRates = safeArr(rawData?.last3SessionAutopilotRates).filter(isFiniteNumber);
    const derivedLast3SessionAutopilotRates = sessionProbabilities.slice(-7).map((p) => Math.round(p * 100));
    return {
      captureRiskScore,
      riskLabel,
      sessionsToday,
      activeTimeToday,
      activeTimeTodaySeconds,
      interactionsToday: maybeNum(rawData?.interactionsToday) ?? derivedInteractionsToday,
      capturedSessionsToday: maybeNum(rawData?.capturedSessionsToday) ?? derivedCapturedToday,
      avgSessionDurationSec: maybeNum(rawData?.avgSessionDurationSec) ?? derivedAvgSessionDurationSec,
      avgReelsPerSession: maybeNum(rawData?.avgReelsPerSession) ?? maybeNum(rawData?.avgNReels) ?? derivedAvgReelsPerSession,
      avgDwellTimeSec: maybeNum(rawData?.avgDwellTimeSec) ?? derivedAvgDwellTimeSec,
      timeSinceLastSessionMin,
      idleSinceLastSessionMin,
      pullIndex,
      totalReels: maybeNum(rawData?.totalReels) ?? (sessionReels.length ? sumOf(sessionReels) : timelineCapture.length || null),
      totalWatchedSeconds: maybeNum(rawData?.totalWatchedSeconds) ?? derivedTotalWatchedSeconds,
      doomRate: maybeNum(rawData?.doomRate) ?? derivedAllTimeCaptureRate,
      tenSessionAvgScore: maybeNum(rawData?.tenSessionAvgScore) ?? derivedTenSessionAvgScore,
      allTimeCaptureRate: maybeNum(rawData?.allTimeCaptureRate) ?? derivedAllTimeCaptureRate,
      sessionDoomPersistence,
      escapeRate,
      modelConfidence,
      weeklyInsight,
      thisWindowDoomRate,
      lastWindowDoomRate,
      weeklyDelta,
      circadianProfile,
      peakRiskWindow,
      safestWindow,
      circadianPattern,
      doomDrivers,
      sessionTopology,
      stateDynamics,
      heatmapData,
      dateBuckets,
      todaySessions,
      doomStreak: maybeNum(rawData?.doomStreak) ?? derivedDoomStreak,
      mindfulStreak: maybeNum(rawData?.mindfulStreak) ?? derivedMindfulStreak,
      moodDissonance,
      currentHour: maybeNum(rawData?.currentHour) ?? (/* @__PURE__ */ new Date()).getHours(),
      todayVsAvgDelta,
      dataSinceDate,
      totalSessions: sessions.length,
      avgSessions,
      avgActiveTimeTodaySeconds: maybeNum(rawData?.avgActiveTimeTodaySeconds) ?? derivedAvgActiveTimeTodaySeconds,
      last3SessionAutopilotRates: last3SessionAutopilotRates.length ? last3SessionAutopilotRates : derivedLast3SessionAutopilotRates,
      confidenceBreakdown: rawData?.model_confidence_breakdown || null
    };
  }
  const DOOM_THRESHOLD = 0.55;
  const HEADER_STATE = {
    doom: { accent: "#C4563A", bg: "rgba(196,86,58,0.08)", glow: "rgba(196,86,58,0.4)", label: "DOOM", pulseCycle: "1.2s" },
    hooked: { accent: "#C4973A", bg: "rgba(196,151,58,0.08)", glow: "rgba(196,151,58,0.35)", label: "HOOKED", pulseCycle: "1.8s" },
    aware: { accent: "#6B3FA0", bg: "rgba(107,63,160,0.06)", glow: "rgba(107,63,160,0.3)", label: "AWARE", pulseCycle: "2.5s" },
    mindful: { accent: "#3A9E6F", bg: "rgba(58,158,111,0.08)", glow: "rgba(58,158,111,0.3)", label: "MINDFUL", pulseCycle: "3s" }
  };
  const getHeaderState = (s) => s >= 70 ? HEADER_STATE.doom : s >= 45 ? HEADER_STATE.hooked : s >= 25 ? HEADER_STATE.aware : HEADER_STATE.mindful;
  function ReelioHeader({ data, isAccessibilityActive, openAccessibilitySettings }) {
    const rawScore = safeNum(data?.captureRiskScore, 0);
    const timeSince = maybeNum(data?.idleSinceLastSessionMin) ?? maybeNum(data?.timeSinceLastSessionMin);
    const isIdleStale = safeNum(data?.sessionsToday, 1) === 0 && isFiniteNumber(timeSince) && timeSince > 120;
    const score = isIdleStale ? 0 : rawScore;
    const st = getHeaderState(score);
    const activeSeconds = maybeNum(data?.activeTimeTodaySeconds);
    const peakWindow = data?.peakRiskWindow;
    const currentHour = safeNum(data?.currentHour, (/* @__PURE__ */ new Date()).getHours());
    const inPeakWindow = (() => {
      if (!peakWindow || typeof peakWindow !== "string") return false;
      const m = peakWindow.match(/(\d{1,2}):\d{2}\s*-\s*(\d{1,2}):\d{2}/);
      if (!m) return false;
      const start = parseInt(m[1], 10);
      const end = parseInt(m[2], 10);
      if (start <= end) return currentHour >= start && currentHour < end;
      return currentHour >= start || currentHour < end;
    })();
    let chipText, chipDotColor, chipPulse;
    if (!isAccessibilityActive) {
      chipText = "\u26A0 Enable tracking";
      chipDotColor = D.warn;
      chipPulse = false;
    } else if (isFiniteNumber(timeSince) && timeSince < 5) {
      const elapsed = isFiniteNumber(activeSeconds) ? formatDurationSec(activeSeconds) : "";
      chipText = elapsed ? `Tracking \xB7 ${elapsed}` : "Tracking";
      chipDotColor = st.accent;
      chipPulse = true;
    } else if (inPeakWindow) {
      chipText = "Peak hours";
      chipDotColor = D.coral;
      chipPulse = true;
    } else if (isFiniteNumber(timeSince)) {
      const hrs = Math.floor(timeSince / 60);
      const mins = Math.round(timeSince % 60);
      const ago = hrs > 0 ? `${hrs}h ago` : `${mins}m ago`;
      chipText = `Idle \xB7 ${ago}`;
      chipDotColor = D.soft;
      chipPulse = false;
    } else {
      chipText = "Ready";
      chipDotColor = D.safe;
      chipPulse = false;
    }
    return /* @__PURE__ */ React.createElement("div", { style: {
      height: 58,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 20px",
      position: "sticky",
      top: 0,
      zIndex: 100,
      background: "#EDE8DF",
      borderBottom: "1px solid rgba(26,22,18,0.06)",
      transition: "border-color 0.6s ease"
    } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 9 } }, /* @__PURE__ */ React.createElement("div", { style: {
      width: 28,
      height: 28,
      borderRadius: "50%",
      background: st.accent,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: `0 0 10px ${st.glow}`,
      transition: "background 0.6s ease, box-shadow 0.6s ease"
    } }, /* @__PURE__ */ React.createElement("svg", { width: "14", height: "14", viewBox: "0 0 14 14", fill: "none" }, /* @__PURE__ */ React.createElement("circle", { cx: "7", cy: "7", r: "3.5", fill: "white", fillOpacity: "0.9" }), /* @__PURE__ */ React.createElement("circle", { cx: "7", cy: "7", r: "6", stroke: "white", strokeOpacity: "0.5", strokeWidth: "1.2", fill: "none" }))), /* @__PURE__ */ React.createElement("span", { style: {
      fontFamily: "'Space Grotesk', sans-serif",
      fontSize: 21,
      fontWeight: 800,
      color: D.ink,
      letterSpacing: "-0.01em",
      lineHeight: 1
    } }, "Reelio")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } }, !isAccessibilityActive && /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: openAccessibilitySettings,
        style: {
          border: "none",
          background: st.accent,
          color: "white",
          borderRadius: 999,
          padding: "7px 14px",
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          cursor: "pointer",
          boxShadow: `0 2px 10px ${st.glow}`,
          transition: "background 0.4s ease"
        }
      },
      chipText
    ), isAccessibilityActive && /* @__PURE__ */ React.createElement("div", { style: {
      display: "flex",
      alignItems: "center",
      gap: 7,
      background: "rgba(255,255,255,0.75)",
      borderRadius: 999,
      padding: "6px 14px 6px 10px",
      border: `1.5px solid ${chipPulse ? st.accent : D.borderSoft}`,
      transition: "border-color 0.5s ease"
    } }, /* @__PURE__ */ React.createElement("div", { style: {
      width: 8,
      height: 8,
      borderRadius: "50%",
      background: chipDotColor,
      boxShadow: chipPulse ? `0 0 8px ${chipDotColor}` : "none",
      animation: chipPulse ? `dotPulse ${st.pulseCycle} ease-in-out infinite` : "none",
      transition: "background 0.4s ease"
    } }), /* @__PURE__ */ React.createElement("span", { style: {
      fontFamily: "'Space Grotesk', sans-serif",
      fontSize: 10,
      fontWeight: 700,
      color: chipPulse ? st.accent : D.ink3,
      letterSpacing: "0.04em",
      textTransform: "uppercase",
      whiteSpace: "nowrap",
      transition: "color 0.4s ease"
    } }, chipText))));
  }
  function ReeliApp() {
    const [screen, setScreen] = useState("home");
    const [rawData, setRawData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [splashDone, setSplashDone] = useState(false);
    const checkA11y = () => typeof window.Android?.isAccessibilityEnabled === "function" ? !!window.Android.isAccessibilityEnabled() : false;
    const [isAccessibilityActive, setIsAccessibilityActive] = useState(checkA11y);
    useEffect(() => {
      const id = setInterval(() => {
        const cur = checkA11y();
        setIsAccessibilityActive((prev) => prev !== cur ? cur : prev);
      }, 1e3);
      window.updateServiceStatus = (enabled) => {
        setIsAccessibilityActive(!!enabled);
        window.dispatchEvent(new CustomEvent("a11y-status", { detail: !!enabled }));
      };
      const onStatus = (e) => setIsAccessibilityActive(!!e.detail);
      window.addEventListener("a11y-status", onStatus);
      return () => {
        clearInterval(id);
        window.removeEventListener("a11y-status", onStatus);
      };
    }, []);
    useEffect(() => {
      const tid = setTimeout(() => setSplashDone(true), 4e3);
      return () => clearTimeout(tid);
    }, []);
    const openAccessibilitySettings = () => {
      if (window.Android && window.Android.enableAccessibility) {
        window.Android.enableAccessibility();
      }
    };
    useEffect(() => {
      const isNoDataError = (msg) => typeof msg === "string" && (msg.includes("No data file found") || msg.includes("No data available") || msg.includes("Empty CSV"));
      const handleData = (parsed) => {
        if (!parsed) {
          setRawData(null);
          setLoading(false);
          return;
        }
        if (parsed.error) {
          if (isNoDataError(parsed.error)) {
            setRawData(null);
            setError(null);
          } else {
            setError(parsed.error);
          }
          setLoading(false);
          return;
        }
        setRawData(parsed);
        setError(null);
        setLoading(false);
      };
      window.reactDataCallback = handleData;
      if (window.injectedJsonData) {
        handleData(window.injectedJsonData);
      } else {
        setLoading(false);
      }
      return () => {
        window.reactDataCallback = null;
      };
    }, []);
    useEffect(() => {
      if (!window.Android || typeof window.Android.drainPendingRetroactiveLabel !== "function") return;
      const poll = () => {
        try {
          const b64 = window.Android.drainPendingRetroactiveLabel();
          if (b64 && b64.length > 0) {
            const json = atob(b64);
            const label = JSON.parse(json);
            console.log("[Bridge] Received retroactive label update:", label);
            setRawData((prev) => {
              if (!prev) return prev;
              const patch = (list) => safeArr(list).map((s) => {
                if (String(s.sessionNum) === String(label.sessionNum) && s.date === label.date) {
                  return { ...s, ...label };
                }
                return s;
              });
              return {
                ...prev,
                sessions: patch(prev.sessions),
                todaySessions: patch(prev.todaySessions)
              };
            });
          }
        } catch (err) {
          console.error("[Bridge] Failed to drain retroactive label:", err);
        }
      };
      const id = setInterval(poll, 2e3);
      return () => clearInterval(id);
    }, []);
    const data = useMemo(() => rawData ? normalizeData(rawData) : null, [rawData]);
    if (loading) return /* @__PURE__ */ React.createElement(LoadingState, null);
    if (error) {
      return /* @__PURE__ */ React.createElement("div", { style: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: D.bg, color: "#FF3B3B", padding: 20, textAlign: "center" } }, "\u26A0\uFE0F ", error);
    }
    const hasData = rawData && safeArr(rawData.sessions).length > 0;
    if (!hasData || !splashDone) return /* @__PURE__ */ React.createElement(OnboardingState, null);
    return /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "center", minHeight: "100vh", background: "#EDE8DF", alignItems: "flex-start" } }, /* @__PURE__ */ React.createElement(Styles, null), /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "app-shell",
        style: { position: "relative", display: "flex", flexDirection: "column", height: "100vh" },
        onContextMenu: (e) => e.preventDefault(),
        onSelectStart: (e) => e.preventDefault()
      },
      /* @__PURE__ */ React.createElement("div", { className: "scanlines" }),
      /* @__PURE__ */ React.createElement(ReelioHeader, { data, isAccessibilityActive, openAccessibilitySettings }),
      /* @__PURE__ */ React.createElement("div", { style: { overflowY: "auto", flex: 1, paddingBottom: 80 } }, screen === "home" && /* @__PURE__ */ React.createElement(MonitorScreen, { data }), screen === "calendar" && /* @__PURE__ */ React.createElement(CaptureCalendarScreen, { data }), screen === "dashboard" && /* @__PURE__ */ React.createElement(DashboardScreen, { data }), screen === "settings" && /* @__PURE__ */ React.createElement(SettingsScreen, { data })),
      /* @__PURE__ */ React.createElement("div", { className: "tab-bar" }, [
        { id: "home", icon: TabIconMonitor, label: "Monitor" },
        { id: "calendar", icon: TabIconCalendar, label: "Calendar" },
        { id: "dashboard", icon: TabIconDashboard, label: "Dashboard" },
        { id: "settings", icon: TabIconSettings, label: "Settings" }
      ].map(({ id, icon: Icon, label }) => /* @__PURE__ */ React.createElement("button", { key: id, className: `tab-item ${screen === id ? "active" : ""}`, onClick: () => setScreen(id) }, /* @__PURE__ */ React.createElement(Icon, { size: 20, color: screen === id ? "white" : D.muted }), /* @__PURE__ */ React.createElement("span", null, label))))
    ));
  }
  const root = ReactDOM.createRoot(document.getElementById("root"));
  root.render(/* @__PURE__ */ React.createElement(ReeliApp, null));
})();
