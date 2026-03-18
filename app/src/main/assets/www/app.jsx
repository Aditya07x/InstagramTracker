import {
    useState, useEffect, useRef, useMemo,
    D, Styles,
    safeArr, safeNum, maybeNum, isFiniteNumber,
    averageOf, sumOf,
    deriveSessionDurationSec, normalizeDateKey, pickSessionTimestampMs,
    formatDurationSec, formatHourWindow,
} from './shared.jsx';

// ─── TAB ICONS (hand-crafted SVG, no emoji) ──────────────────────────────────
const TabIconMonitor = ({ size = 20, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
        <circle cx="12" cy="12" r="3" />
    </svg>
);
const TabIconCalendar = ({ size = 20, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <rect x="8" y="14" width="3" height="3" rx="0.5" fill={color} stroke="none" />
    </svg>
);
const TabIconDashboard = ({ size = 20, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
);
const TabIconSettings = ({ size = 20, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1.08-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1.08 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001.08 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1.08z" />
    </svg>
);
import { MonitorScreen } from './screens/MonitorScreen.jsx';
import { CaptureCalendarScreen } from './screens/CalendarScreen.jsx';
import { DashboardScreen } from './screens/DashboardScreen.jsx';
import { SettingsScreen } from './screens/SettingsScreen.jsx';

// ─── LoadingState ─────────────────────────────────────────────────────────────
function LoadingState() {
    return (
        <div style={{
            minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
            background: D.bg, color: D.text, fontFamily: "'Space Grotesk', sans-serif", flexDirection: "column", gap: 12
        }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", border: `3px solid rgba(26,22,18,0.08)`, borderTopColor: "#6B3FA0", animation: "spin 1s linear infinite" }} />
            <div className="mono" style={{ fontSize: 10, color: "#9A8E84", letterSpacing: "0.18em" }}>INITIALIZING TRACKER...</div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}

// ─── ONBOARDING QUOTES ────────────────────────────────────────────────────────
const ONBOARD_QUOTES = [
    {
        text: "You have power over your mind, not outside events. Realise this and you will find strength. The algorithm realised it first.",
        tag: "Marcus Aurelius · Meditations"
    },
    {
        text: "When you gaze long into the abyss, the abyss gazes back. The abyss has 1.2 million followers and a Patreon.",
        tag: "Nietzsche · approximately"
    },
    {
        text: "Cogito ergo doom.",
        tag: "Descartes · if he had wifi"
    },
    {
        text: "We are what we repeatedly do. You have opened this app within 12 minutes of waking, without fail, for 19 days. You have become very excellent at something.",
        tag: "Aristotle · Nicomachean Ethics"
    },
    {
        text: "Your screen time report arrives every Sunday like a small honest accountant you have never once listened to. The accountant does not take this personally. The accountant simply returns.",
        tag: "digital confession"
    },
    {
        text: "Know thyself. Before you do, however, allow this 15-second ad for something you whispered about near your phone two days ago.",
        tag: "Oracle of Delphi · 400 BC"
    },
    {
        text: "Not all those who wander are lost. This does not apply to infinite scroll.",
        tag: "Tolkien · The Fellowship of the Ring"
    },
    {
        text: "A journey of a thousand miles begins with a single step. A three-hour session begins with a single tap. The mechanics are identical. The destination is not.",
        tag: "Lao Tzu · Tao Te Ching"
    },
    {
        text: "I can resist everything except temptation. The notification badge is not a temptation. It is an engineered stimulus. This is a meaningful distinction.",
        tag: "Oscar Wilde · Lady Windermere's Fan"
    },
    {
        text: "Big Brother is watching you. Big Brother has also noted your re-watch pattern on dog content at 11:47pm and adjusted your feed accordingly. This detail was not in the first edition.",
        tag: "Orwell · 1984"
    },
    {
        text: "Vindica te tibi. Claim yourself for yourself. The opposite instruction is currently available in your pocket at all times.",
        tag: "Seneca · Letters to Lucilius"
    },
    {
        text: "The mind is everything. What you think, you become. You have been thinking about a raccoon stealing a churro for three days.",
        tag: "Buddha · Dhammapada"
    },
    {
        text: "All the world's a stage. Some have more followers than others. This was not what Jaques meant but it is what happened.",
        tag: "Shakespeare · As You Like It"
    },
    {
        text: "An object in motion stays in motion unless acted upon by an outside force. Reelio is attempting to be the outside force. It is trying its best.",
        tag: "Newton · First Law"
    },
    {
        text: "The unexamined life is not worth living. You have examined 74 strangers' lives this session. Yours remains, as yet, unscheduled.",
        tag: "Socrates · The Apology"
    },
    {
        text: "Peace comes from within. You have checked outside approximately 2,800 times this month. Consistent null result.",
        tag: "Buddha · Dhammapada"
    },
    {
        text: "The road goes ever on and on. Tolkien meant this as an invitation to adventure. Instagram means it as a business model.",
        tag: "Tolkien · The Hobbit"
    },
    {
        text: "Slot machines were redesigned in the 1980s to maximise time between pulls. Short-form video was designed in the 2010s with identical intent and a considerably larger sample size.",
        tag: "game theory"
    },
    {
        text: "This is fine.",
        tag: "the dog · 2013 · still applicable"
    },
    {
        text: "You opened Instagram for a quick look. Archaeologists will later describe this era as the Late Quick Look Period.",
        tag: "future historians · presumably"
    },
    {
        text: "The average human attention span is now shorter than a goldfish's. The goldfish does not have a dopamine problem. The goldfish does not have Instagram.",
        tag: "Microsoft Research · 2015"
    },
    {
        text: "In 2009 the Like button was invented. In 2010 it was deployed to one billion people. Nobody asked the one billion people if this was a good idea.",
        tag: "product history"
    },
    {
        text: "You are not procrastinating. You are pre-experiencing the relief of finishing the thing you have not started.",
        tag: "cognitive reframe · invalid"
    },
    {
        text: "There is a version of you that closed the app after two minutes, went outside, and is now slightly better at being a person. Reelio is trying to introduce you.",
        tag: "ALSE v3.0"
    },
    {
        text: "The present moment always will have been. This one included.",
        tag: "Stoic fragment · unattributed"
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
        tag: "ALSE · session log"
    },
    {
        text: "The app has no closing time. This was also a design decision.",
        tag: "product strategy · 2010"
    },
    {
        text: "Somewhere, a recommendation engine is disappointed in you. Good.",
        tag: "ALSE · root for the underdog"
    },
    {
        text: "You closed the app. It is already thinking about how to get you back.",
        tag: "retention team · always on"
    },
    {
        text: "To do two things at once is to do neither. You were doing one thing. It was also doing one thing. The one thing was you.",
        tag: "Publilius Syrus · updated"
    },
    {
        text: "We shape our tools and thereafter our tools shape us. Marshall McLuhan said this in 1964. He did not know how right he was. He was very right.",
        tag: "McLuhan · Understanding Media"
    },
    {
        text: "The best time to stop was 40 minutes ago. The second best time is now.",
        tag: "ancient proverb · adapted"
    },
    {
        text: "You have seen a video of someone else's dog, someone else's holiday, someone else's kitchen renovation, and someone else's opinion about a film you have not seen. You feel vaguely worse. The model predicted this.",
        tag: "ALSE · session summary"
    },
    {
        text: "The Greek word for idleness is skholē. It is also the root of the word school. They considered rest to be where thinking happened. They did not have push notifications.",
        tag: "etymology"
    },
    {
        text: "This app is free. You are not the customer. This is the oldest joke on the internet. It is still true.",
        tag: "media literacy · 2008 — present"
    },
    {
        text: "Your phone has no idea what time it is where you are emotionally. Reelio is trying to find out.",
        tag: "ALSE v3.0 · calibrating"
    },
    {
        text: "Leisure is the basis of culture. Josef Pieper wrote this in 1948. He meant rest, contemplation, and silence. He did not mean this. But here we are.",
        tag: "Pieper · Leisure the Basis of Culture"
    },
];

// ─── ONBOARDING BLOB CONFIG ──────────────────────────────────────────────────
// Mirrors BlobBackgroundView.kt PRE palette: 7-point irregular forms,
// Catmull-Rom splines, cat-paw drift — no gradients, no circles.
const ONBOARD_BLOB_CONFIG = [
    { cx: 0.12, cy: 0.26, r: 160, color: "#8B5CF6", alpha: 0.28, speed: 16500, phase: 0.0 },
    { cx: 0.82, cy: 0.13, r: 140, color: "#6366F1", alpha: 0.27, speed: 14500, phase: 1.2 },
    { cx: 0.66, cy: 0.48, r: 132, color: "#34D399", alpha: 0.24, speed: 17500, phase: 2.5 },
    { cx: 0.18, cy: 0.80, r: 124, color: "#FBBF24", alpha: 0.26, speed: 15500, phase: 0.7 },
];

function _hexToRgb(hex) {
    return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
}

function _drawOnboardBlobs(ctx, w, h, elapsed) {
    const PI2 = Math.PI * 2;
    const N   = 7;       // points per blob
    const T   = 0.24;    // Catmull-Rom tension
    const sc  = Math.min(w, h) / 400;   // scale to screen size
    ONBOARD_BLOB_CONFIG.forEach(blob => {
        const t      = ((elapsed % blob.speed) / blob.speed) * PI2 + blob.phase;
        const r      = blob.r * sc;
        const driftX = Math.cos(t * 0.7) * r * 0.06;
        const driftY = Math.sin(t * 0.6) * r * 0.05;
        const cx     = blob.cx * w + driftX;
        const cy     = blob.cy * h + driftY;
        const step   = PI2 / N;
        const pts    = [];
        for (let k = 0; k < N; k++) {
            const angle  = k * step + t * 0.18;
            const wobble = r * (1 + 0.12 * Math.sin(t * 2.1 + k * 1.3));
            pts.push({ x: cx + wobble * Math.cos(angle), y: cy + wobble * Math.sin(angle) });
        }
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let k = 0; k < N; k++) {
            const curr  = pts[k];
            const next  = pts[(k + 1) % N];
            const prev  = pts[(k + N - 1) % N];
            const next2 = pts[(k + 2) % N];
            ctx.bezierCurveTo(
                curr.x + (next.x - prev.x) * T,  curr.y + (next.y - prev.y) * T,
                next.x - (next2.x - curr.x) * T, next.y - (next2.y - curr.y) * T,
                next.x, next.y
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
    const rafRef    = useRef(null);
    const t0Ref     = useRef(null);
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const resize = () => {
            const dpr = window.devicePixelRatio || 1;
            const w   = canvas.offsetWidth;
            const h   = canvas.offsetHeight;
            canvas.width  = w * dpr;
            canvas.height = h * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };
        resize();
        window.addEventListener('resize', resize);
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
            window.removeEventListener('resize', resize);
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, []);
    return (
        <canvas ref={canvasRef} style={{
            position: "absolute", inset: 0,
            width: "100%", height: "100%",
            pointerEvents: "none", zIndex: 2,
        }} />
    );
}

// ─── OnboardingState ──────────────────────────────────────────────────────────
function OnboardingState() {
    const checkA11y = () => typeof window.Android?.isAccessibilityEnabled === 'function'
        ? !!window.Android.isAccessibilityEnabled()
        : false;

    const [isAccessibilityActive, setIsAccessibilityActive] = useState(checkA11y);

    useEffect(() => {
        const id = setInterval(() => {
            const cur = checkA11y();
            setIsAccessibilityActive(prev => prev !== cur ? cur : prev);
        }, 1000);
        const onStatus = e => setIsAccessibilityActive(!!e.detail);
        window.addEventListener('a11y-status', onStatus);
        return () => { clearInterval(id); window.removeEventListener('a11y-status', onStatus); };
    }, []);

    const quote = useMemo(() => ONBOARD_QUOTES[Math.floor(Math.random() * ONBOARD_QUOTES.length)], []);

    return (
        <>
        <style>{`
            @keyframes headIn { from { opacity:0; transform: translateY(-18px); } to { opacity:1; transform: translateY(0); } }
            @keyframes cardUp { from { opacity:0; transform: translateY(32px); } to { opacity:1; transform: translateY(0); } }
            @keyframes tagPop { from { opacity:0; transform: scale(0.85) translateY(6px); } to { opacity:1; transform: scale(1) translateY(0); } }
            @keyframes dotPulse { 0%,100% { opacity:0.4; transform: scale(1); } 50% { opacity:1; transform: scale(1.3); } }
        `}</style>

        <div style={{
            minHeight: "100vh",
            background: "#EDE8DF",
            position: "relative",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
        }}>

            {/* ── Decorative blobs ── */}
            <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none", zIndex:1 }}
                 viewBox="0 0 100 100" preserveAspectRatio="none">
                <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="4" stitchTiles="stitch"/>
                    <feColorMatrix type="saturate" values="0"/></filter>
                <rect width="100%" height="100%" filter="url(#grain)" opacity="0.04"/>
            </svg>

            {/* ── Irregular animated blobs (Catmull-Rom, matches survey BlobBackgroundView) ── */}
            <BlobCanvas />

            {/* ── Header text ── */}
            <div style={{
                position: "relative", zIndex: 20,
                padding: "60px 28px 0",
                animation: "headIn 0.6s ease 0.08s both",
            }}>
                <div style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: 52, fontWeight: 700,
                    lineHeight: 1.06, letterSpacing: "-0.02em",
                    color: "#1A1612",
                    marginBottom: 6,
                }}>
                    Reelio
                </div>
                <div style={{
                    fontSize: 9, fontWeight: 800, letterSpacing: "0.28em",
                    textTransform: "uppercase", color: "#9A8E84",
                    marginBottom: 18,
                    fontFamily: "'Nunito', sans-serif",
                }}>
                    ALSE v3.0
                </div>
                <div style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: 36, fontWeight: 700,
                    lineHeight: 1.12, letterSpacing: "-0.02em",
                    color: "#1A1612",
                }}>
                    waiting for<br />
                    <em style={{ fontStyle: "italic", fontWeight: 400 }}>your next move.</em>
                </div>
            </div>

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* ── Bottom section: quote + CTA ── */}
            <div style={{
                position: "relative", zIndex: 20,
                padding: "0 18px 32px",
                animation: "cardUp 0.7s cubic-bezier(0.34,1.3,0.64,1) 0.3s both",
            }}>
                {/* Tag pill */}
                <div style={{
                    display: "inline-flex", alignItems: "center", gap: 7,
                    background: "#4A2580",
                    borderRadius: 99,
                    padding: "6px 16px 6px 10px",
                    marginBottom: 10,
                    animation: "tagPop 0.45s ease 0.6s both",
                }}>
                    <div style={{
                        width: 7, height: 7, borderRadius: "50%",
                        background: "#9B6FCC",
                    }} />
                    <span style={{
                        fontSize: 9, fontWeight: 800, letterSpacing: "0.16em",
                        textTransform: "uppercase", color: "rgba(255,255,255,0.55)",
                        fontFamily: "'Nunito', sans-serif",
                    }}>
                        {quote.tag}
                    </span>
                </div>

                {/* Quote card — pastel purple */}
                <div style={{
                    background: "#E8E0F5",
                    borderRadius: 26,
                    padding: "26px 24px 22px",
                    position: "relative",
                    overflow: "hidden",
                    boxShadow: "0 12px 36px rgba(107,63,160,0.12)",
                }}>
                    {/* Decorative inner glow circles */}
                    <div style={{
                        position:"absolute", top:-30, right:-30,
                        width:120, height:120, borderRadius:"50%",
                        background: "#F3EFFA", opacity:0.45, filter:"blur(30px)",
                        pointerEvents:"none",
                    }}/>
                    <div style={{
                        position:"absolute", bottom:-25, left:-25,
                        width:100, height:100, borderRadius:"50%",
                        background: "#9B6FCC", opacity:0.2, filter:"blur(25px)",
                        pointerEvents:"none",
                    }}/>

                    <p style={{
                        fontFamily: "'Nunito', sans-serif",
                        fontSize: 16, fontWeight: 400, fontStyle: "italic",
                        lineHeight: 1.7, letterSpacing: "-0.005em",
                        color: "#1A1612",
                        position: "relative", zIndex: 1,
                        marginBottom: 22,
                    }}>
                        &ldquo;{quote.text}&rdquo;
                    </p>

                    {/* Footer row */}
                    <div style={{
                        display:"flex", alignItems:"center",
                        justifyContent:"flex-start",
                        position:"relative", zIndex:1,
                    }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                            <div style={{
                                width:8, height:8, borderRadius:"50%",
                                background: "#6B3FA0",
                                animation: "dotPulse 2.4s ease-in-out infinite",
                            }}/>
                            <span style={{
                                fontFamily: "'Space Mono', monospace",
                                fontSize: 9, fontWeight:700, letterSpacing:"0.14em",
                                textTransform:"uppercase", color:"rgba(107,63,160,0.4)",
                            }}>Listening for activity</span>
                        </div>
                    </div>
                </div>

                {/* Accessibility CTA */}
                {!isAccessibilityActive && (
                    <div onClick={() => window.Android?.enableAccessibility?.()} style={{
                        marginTop: 14,
                        background: '#1A1612', borderRadius: 18,
                        padding: '15px 20px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                        boxShadow: '0 8px 24px rgba(26,22,18,0.15)',
                    }}>
                        <span style={{ fontSize: 20 }}>🔓</span>
                        <div style={{ flex: 1 }}>
                            <div style={{
                                fontSize: 13, fontWeight: 800, color: '#F7F3EC',
                                fontFamily: "'Nunito', sans-serif",
                            }}>Enable Accessibility</div>
                            <div style={{
                                fontSize: 10, fontWeight: 600, color: 'rgba(247,243,236,0.55)',
                                fontFamily: "'Nunito', sans-serif",
                            }}>Grant tracking permission</div>
                        </div>
                        <span style={{ color: '#F7F3EC', fontSize: 18 }}>→</span>
                    </div>
                )}

                {/* Hint */}
                <p style={{
                    marginTop: 12, paddingLeft: 4,
                    fontFamily: "'Nunito', sans-serif",
                    fontStyle: "italic",
                    fontSize: 12, color: "rgba(26,22,18,0.22)", lineHeight: 1.5,
                }}>
                    Open Instagram Reels — Reelio starts tracking automatically.
                </p>
            </div>
        </div>
        </>
    );
}

// ─── normalizeData ────────────────────────────────────────────────────────────
function normalizeData(rawData) {
    // Apply any window-scoped retroactive label cache before deriving views.
    // This prevents a brief backend / cache lag from making freshly labeled
    // sessions lose their survey chips or re-show the "Label this session"
    // button after a few seconds.
    const retroCache =
        (typeof window !== "undefined" && window.__retroactiveLabelCache && typeof window.__retroactiveLabelCache === "object")
            ? window.__retroactiveLabelCache
            : {};

    const mergeRetro = (sess) => {
        if (!sess || typeof sess !== "object") return sess;
        const sNum = sess.sessionNum != null ? String(sess.sessionNum) : "";
        const sDate = typeof sess.date === "string" ? sess.date : "";
        const cacheKey = `${sNum}|${sDate}`;
        const override = retroCache[cacheKey];
        return override ? { ...sess, ...override } : sess;
    };

    const sessions = safeArr(rawData?.sessions)
        .filter((s) => s && typeof s === "object")
        .map(mergeRetro);
    const mostRecent = sessions[sessions.length - 1] || null;
    const sessionProbabilities = sessions.map((s) => maybeNum(s.S_t)).filter(isFiniteNumber);
    const sessionDurations = sessions.map((s) => deriveSessionDurationSec(s)).filter(isFiniteNumber);
    const sessionReels = sessions.map((s) => maybeNum(s.nReels)).filter(isFiniteNumber);
    const sessionDwells = sessions.map((s) => maybeNum(s.avgDwell)).filter(isFiniteNumber);
    // transition_matrix = reel-level HMM A (within-session reel-to-reel, typically 0.85–0.95).
    // session_transition_matrix = session-level dominant-state transitions (behaviorally meaningful).
    // NEVER mix the two: session-level metrics must use sessTransition.
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
                    dayLabel: dt.toLocaleDateString(undefined, { weekday: "short" }).toUpperCase(),
                    dateLabel: dt.toLocaleDateString(undefined, { month: "short", day: "numeric" })
                };
            }
        }
        return {
            dayLabel: fallbackLabel || "",
            dateLabel: dateKey || ""
        };
    };

    const timelineEntryFromSource = (entry, prevTs) => {
        const source = entry.raw || entry;
        const ts = isFiniteNumber(entry.ts) ? entry.ts : pickSessionTimestampMs(source);

        let startTime = "";
        if (isFiniteNumber(ts)) {
            startTime = new Date(ts).toTimeString().slice(0, 5);
        }

        const explicitDurationMin = maybeNum(source.durationMin);
        const explicitDurationSec = maybeNum(source.durationSec) ?? maybeNum(source.sessionDurationSec);
        const derivedDurationSec = isFiniteNumber(explicitDurationSec)
            ? explicitDurationSec
            : (isFiniteNumber(entry.durationSec) ? entry.durationSec : deriveSessionDurationSec(source));
        const durationMin = isFiniteNumber(explicitDurationMin)
            ? explicitDurationMin
            : (isFiniteNumber(derivedDurationSec) ? derivedDurationSec / 60 : null);

        const reelCount = maybeNum(source.reelCount) ?? maybeNum(source.nReels) ?? maybeNum(source.totalReels);
        const probability = maybeNum(source.S_t) ?? maybeNum(source.captureProb);
        const explicitGap = maybeNum(source.gapBeforeMin);
        const derivedGap = (isFiniteNumber(prevTs) && isFiniteNumber(ts)) ? (ts - prevTs) / 60000 : null;
        const gapBeforeMin = isFiniteNumber(explicitGap)
            ? explicitGap
            : (isFiniteNumber(derivedGap) ? Math.max(0, derivedGap) : null);

        return {
            startTime,
            durationMin,
            reelCount,
            gapBeforeMin,
            probability,
            isDoom: isFiniteNumber(probability) ? probability >= DOOM_THRESHOLD : Boolean(source.isDoom),
            _ts: ts,
            // Session identity — needed for retroactive labeling bridge call
            _sessionNum:  source.sessionNum  ?? null,
            _sessionDate: source.date        ?? null,
            _rawSessionNum: source._rawSessionNum ?? null,
            _rawStartTime:  source._rawStartTime  ?? null,
            // Survey self-report labels
            postSessionRating:  maybeNum(source.postSessionRating) ?? 0,
            regretScore:        maybeNum(source.regretScore) ?? 0,
            moodBefore:         maybeNum(source.moodBefore) ?? 0,
            moodAfter:          maybeNum(source.moodAfter) ?? 0,
            intendedAction:     source.intendedAction || "",
            actualVsIntended:   maybeNum(source.actualVsIntended) ?? 0,
            comparativeRating:  maybeNum(source.comparativeRating) ?? 0,
            delayedRegretScore: maybeNum(source.delayedRegretScore) ?? 0,
            supervisedDoom:     maybeNum(source.supervisedDoom) ?? 0,
            hasSurvey:          Boolean(source.hasSurvey),
            retroactiveLabel:   Boolean(source.retroactiveLabel),
            // Heuristic and confidence metadata for Fix 1
            heuristicScore:     maybeNum(source.heuristic_score) ?? 0,
            modelConf:          maybeNum(source.model_conf) ?? 1.0,
        };
    };

    const providedTodaySource = safeArr(rawData?.todaySessions)
        .filter((s) => s && typeof s === "object")
        .map((s, idx) => {
            const merged = mergeRetro(s);
            return { raw: merged, idx, ts: pickSessionTimestampMs(merged), durationSec: deriveSessionDurationSec(merged) };
        });

    providedTodaySource.sort((a, b) => {
        if (isFiniteNumber(a.ts) && isFiniteNumber(b.ts)) return a.ts - b.ts;
        return a.idx - b.idx;
    });

    // Fallback: use sessions bucketed under today's actual device date.
    // Do NOT use latestDateKey — it could be yesterday or include all sessions.
    // Use LOCAL date components (not UTC) so sessions after midnight but before UTC-midnight
    // are correctly classified as "today" from the user's perspective. Python timestamps
    // are device-local time with no timezone suffix, so local components must be used.
    const _now = new Date();
    const deviceTodayKey = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, '0')}-${String(_now.getDate()).padStart(2, '0')}`;
    const deviceTodaySessions = dateBuckets[deviceTodayKey]
        ? [...dateBuckets[deviceTodayKey]].sort((a, b) => {
            if (isFiniteNumber(a.ts) && isFiniteNumber(b.ts)) return a.ts - b.ts;
            return a.idx - b.idx;
          })
        : [];

    const todaySource = providedTodaySource.length ? providedTodaySource : deviceTodaySessions;
    let prevTs = null;
    const todaySessionsDetailed = todaySource.map((entry) => {
        const row = timelineEntryFromSource(entry, prevTs);
        if (isFiniteNumber(row._ts)) prevTs = row._ts;
        return row;
    });

    const todaySessions = todaySessionsDetailed.map(({ _ts, probability, ...rest }) => rest);

    const todayDurationSecs = todaySessionsDetailed
        .map((s) => (isFiniteNumber(s.durationMin) ? s.durationMin * 60 : null))
        .filter(isFiniteNumber);
    const derivedActiveTodaySeconds = todayDurationSecs.length ? sumOf(todayDurationSecs) : null;

    const dailyTotals = dateKeys
        .map((k) => {
            const durations = safeArr(dateBuckets[k]).map((x) => x.durationSec).filter(isFiniteNumber);
            return durations.length ? sumOf(durations) : null;
        })
        .filter(isFiniteNumber);

    const dailySessionCounts = dateKeys.map((k) => safeArr(dateBuckets[k]).length).filter(isFiniteNumber);
    const derivedAvgSessions = averageOf(dailySessionCounts);
    const derivedAvgActiveTimeTodaySeconds = averageOf(dailyTotals);

    const interactionsFromToday = todaySource
        .map((entry) => {
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
        })
        .filter(isFiniteNumber);
    const derivedInteractionsToday = interactionsFromToday.length ? sumOf(interactionsFromToday) : null;

    const derivedSessionsToday = todaySessions.length || null;
    const derivedCapturedToday = todaySessionsDetailed.length
        ? todaySessionsDetailed.filter((s) => isFiniteNumber(s.probability) ? s.probability >= DOOM_THRESHOLD : s.isDoom).length
        : null;

    // Sort sessions by startTime to find the two most recent
    const sessionsWithTs = sessions
        .map((s) => ({ raw: s, startMs: pickSessionTimestampMs(s) }))
        .filter((x) => isFiniteNumber(x.startMs))
        .sort((a, b) => a.startMs - b.startMs);

    let derivedGapMin = null;
    if (sessionsWithTs.length >= 2) {
        const prev = sessionsWithTs[sessionsWithTs.length - 2];
        const last = sessionsWithTs[sessionsWithTs.length - 1];
        // Use end-to-start gap (actual break the user experienced), not start-to-start.
        // Python sends endTime as 'YYYY-MM-DDTHH:MM:SS' for each session.
        const prevEndRaw = prev.raw?.endTime;
        let prevEndMs = null;
        if (typeof prevEndRaw === 'string' && prevEndRaw && prevEndRaw !== 'Unknown') {
            const parsed = new Date(prevEndRaw);
            if (!Number.isNaN(parsed.getTime())) prevEndMs = parsed.getTime();
        }
        // Fall back to start-to-start only when endTime is unavailable
        const gapBaseMs = isFiniteNumber(prevEndMs) ? prevEndMs : prev.startMs;
        derivedGapMin = Math.max(0, (last.startMs - gapBaseMs) / 60000);
    }
    const payloadGapMin = maybeNum(rawData?.timeSinceLastSessionMin);
    const timeSinceLastSessionMin = (isFiniteNumber(payloadGapMin) && payloadGapMin > 0)
        ? payloadGapMin
        : derivedGapMin;

    // True current idle time: now − last session end. Python computes this on
    // each dashboard call. Used by the header chip and the inactivity guard.
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

    const riskLabel = (typeof rawData?.riskLabel === "string" && rawData.riskLabel)
        ? rawData.riskLabel
        : (deriveRiskLabel(captureRiskScore) || "SAFE");

    const derivedAvgSessionDurationSec = averageOf(sessionDurations);
    const derivedAvgReelsPerSession = averageOf(sessionReels);
    const derivedAvgDwellTimeSec = averageOf(sessionDwells);
    const derivedTotalWatchedSeconds = sessionDurations.length ? sumOf(sessionDurations) : null;

    // Threshold must match Python's DOOM_PROBABILITY_THRESHOLD = 0.55 exactly.
    // Using > 0.5 here would classify S_t ∈ (0.50, 0.55) as doom — inconsistent with backend.
    const derivedAllTimeCaptureRate = sessionProbabilities.length
        ? sessionProbabilities.filter((p) => p >= DOOM_THRESHOLD).length / sessionProbabilities.length
        : null;

    const lastTenProbs = sessionProbabilities.slice(-10);
    const derivedTenSessionAvgScore = lastTenProbs.length ? averageOf(lastTenProbs) * 100 : null;

    // Session-level persistence/escape come from sess_A (session_transition_matrix), not the
    // reel-level A matrix.  A[1][1] ≈ 0.90 (next reel likely doom) ≠ sess_A[1][1] (next SESSION).
    const sessionDoomPersistence = maybeNum(rawData?.sessionDoomPersistence) ?? maybeNum(sessTransition?.[1]?.[1]);
    const escapeRate = maybeNum(rawData?.escapeRate) ?? maybeNum(sessTransition?.[1]?.[0]);
    const pullIndex = maybeNum(rawData?.pullIndex) ?? ((isFiniteNumber(sessionDoomPersistence) && isFiniteNumber(escapeRate) && escapeRate > 0) ? (sessionDoomPersistence / escapeRate) : null);

    const modelConfidence =
        maybeNum(rawData?.modelConfidence) ??
        maybeNum(rawData?.model_confidence) ??
        maybeNum(rawData?.model_confidence_breakdown?.overall);

    const thisWindowDoomRate = maybeNum(rawData?.thisWindowDoomRate) ?? maybeNum(rawData?.weekly_summary?.this_week_doom_rate);
    const lastWindowDoomRate = maybeNum(rawData?.lastWindowDoomRate) ?? maybeNum(rawData?.weekly_summary?.last_week_doom_rate);
    const weeklyInsight =
        (typeof rawData?.weeklyInsight === "string" && rawData.weeklyInsight) ||
        (typeof rawData?.weekly_summary?.insight === "string" && rawData.weekly_summary.insight) ||
        null;

    let weeklyDelta =
        (typeof rawData?.weeklyDelta === "string" && rawData.weeklyDelta) ||
        (typeof rawData?.weekly_summary?.delta_direction === "string" && rawData.weekly_summary.delta_direction) ||
        null;
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

    const circadianProfile = (circadianFromPayload.length ? circadianFromPayload : circadianFromLegacy)
        .filter((c) => isFiniteNumber(c.hour) && isFiniteNumber(c.captureProb))
        .map((c) => ({
            hour: ((Math.round(c.hour) % 24) + 24) % 24,
            captureProb: Math.max(0, Math.min(1, c.captureProb))
        }))
        .sort((a, b) => a.hour - b.hour);

    const peakCircPoint = circadianProfile.reduce((best, c) => (!best || c.captureProb > best.captureProb ? c : best), null);
    const safeCircPoint = circadianProfile.reduce((best, c) => (!best || c.captureProb < best.captureProb ? c : best), null);

    const derivedPeakWindow = peakCircPoint ? formatHourWindow(peakCircPoint.hour, 2) : null;
    const derivedSafestWindow = safeCircPoint ? formatHourWindow(safeCircPoint.hour, 2) : null;

    const peakRiskWindow = (typeof rawData?.peakRiskWindow === "string" && rawData.peakRiskWindow) || derivedPeakWindow;
    const safestWindow = (typeof rawData?.safestWindow === "string" && rawData.safestWindow) || derivedSafestWindow;

    let circadianPattern = (typeof rawData?.circadianPattern === "string" && rawData.circadianPattern) || null;
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
        const filtered = safeArr(drivers)
            .map((d) => {
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
            })
            .filter(Boolean);

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
        const collected = componentDriverDefs
            .map((d) => ({ name: d.name, value: pickComponentValue(componentSource, d.keys) }))
            .filter((d) => isFiniteNumber(d.value));
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

    const doomDrivers = (existingDrivers.length ? existingDrivers : derivedDrivers)
        .sort((a, b) => safeNum(b.contribution, 0) - safeNum(a.contribution, 0));

    const timelineCapture = safeArr(rawData?.timeline?.p_capture).map((p) => maybeNum(p)).filter(isFiniteNumber);
    const topologyFromPayload = rawData?.sessionTopology;
    const payloadReelData = safeArr(topologyFromPayload?.reelData)
        .map((r, idx) => {
            const captureProb = maybeNum(r?.captureProb);
            if (!isFiniteNumber(captureProb)) return null;
            return {
                index: maybeNum(r?.index) ?? idx + 1,
                captureProb,
                state: captureProb > 0.66 ? "Autopilot" : captureProb > 0.33 ? "Borderline" : "Mindful"
            };
        })
        .filter(Boolean);

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
        safePercent: topologyTotal ? (topologySafeCount / topologyTotal) * 100 : 0,
        borderPercent: topologyTotal ? (topologyBorderCount / topologyTotal) * 100 : 0,
        doomPercent: topologyTotal ? (topologyDoomCount / topologyTotal) * 100 : 0,
        reelData: topologyReelData
    };

    // State transition probabilities are session-level; derive from sessTransition, not transition.
    const derivedCasualToDoom = maybeNum(sessTransition?.[0]?.[1]);
    const derivedDoomToCasual = maybeNum(sessTransition?.[1]?.[0]);
    const stateDynamics = {
        casualToDoomProb: maybeNum(rawData?.stateDynamics?.casualToDoomProb) ?? derivedCasualToDoom,
        doomToCasualProb: maybeNum(rawData?.stateDynamics?.doomToCasualProb) ?? derivedDoomToCasual,
        recoveryWindowSessions: maybeNum(rawData?.stateDynamics?.recoveryWindowSessions) ?? ((isFiniteNumber(derivedDoomToCasual) && derivedDoomToCasual > 0) ? (1 / derivedDoomToCasual) : null),
        recoveryWindowDelta: maybeNum(rawData?.stateDynamics?.recoveryWindowDelta),
        modelConfidence
    };

    const personalCaptureBaselineSec = (() => {
        const recentDurations = sessions
            .map((entry) => {
                const source = entry?.raw || entry || {};
                return maybeNum(entry?.durationSec)
                    ?? maybeNum(source.durationSec)
                    ?? maybeNum(source.sessionDurationSec)
                    ?? deriveSessionDurationSec(source);
            })
            .filter((durationSec) => isFiniteNumber(durationSec) && durationSec >= 20)
            .slice(-30)
            .sort((a, b) => a - b);
        if (!recentDurations.length) return 180;
        const mid = Math.floor(recentDurations.length / 2);
        const median = recentDurations.length % 2
            ? recentDurations[mid]
            : (recentDurations[mid - 1] + recentDurations[mid]) / 2;
        return Math.min(300, Math.max(90, median));
    })();

    const getDailyCaptureWeight = (entry) => {
        const source = entry?.raw || entry || {};
        const explicitDurationSec = maybeNum(source.durationSec) ?? maybeNum(source.sessionDurationSec);
        const fallbackDurationSec = isFiniteNumber(entry?.durationSec) ? entry.durationSec : deriveSessionDurationSec(source);
        const durationSec = isFiniteNumber(explicitDurationSec) ? explicitDurationSec : fallbackDurationSec;
        if (!isFiniteNumber(durationSec) || durationSec <= 0) return 0.2;

        // Reach full influence by the user's recent median session duration,
        // while still aggressively downweighting tiny sessions.
        const baseWeight = Math.min(durationSec / personalCaptureBaselineSec, 1);
        if (durationSec < 30) return Math.max(0.06, baseWeight * 0.2);
        if (durationSec < 60) return Math.max(0.12, baseWeight * 0.45);
        if (durationSec < 120) return Math.max(0.3, baseWeight * 0.75);
        return Math.max(0.45, baseWeight);
    };

    // Derive per-day heatmap from dateBuckets (real organic S_t data from ALSE).
    // Use evidence-weighted aggregation so tiny low-evidence sessions don't swing the day.
    const derivedHeatmapData = dateKeys.map((dateKey) => {
        const bucket = dateBuckets[dateKey] || [];
        const weighted = bucket
            .map((e) => {
                const prob = maybeNum(e.raw?.S_t);
                if (!isFiniteNumber(prob)) return null;
                const weight = getDailyCaptureWeight(e);
                return weight > 0 ? { prob, weight } : null;
            })
            .filter(Boolean);
        const totalWeight = weighted.length ? weighted.reduce((sum, e) => sum + e.weight, 0) : 0;
        const avgCapture = totalWeight > 0
            ? weighted.reduce((sum, e) => sum + (e.prob * e.weight), 0) / totalWeight
            : null;
        const labels = deriveHeatmapLabels(dateKey, dateKey.slice(5));
        return {
            date: dateKey,
            dayLabel: labels.dayLabel,
            dateLabel: labels.dateLabel,
            avgCapture,
            riskLevel: null,
            sessionCount: bucket.length,
        };
    }).filter((d) => isFiniteNumber(d.avgCapture));

    const heatmapData = safeArr(rawData?.heatmapData).length
        ? safeArr(rawData.heatmapData).map((d) => {
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
        })
        : safeArr(rawData?.days14).length
        ? safeArr(rawData.days14).map((d) => {
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
        })
        : derivedHeatmapData;
    heatmapData.sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));

    // Count of consecutive doom sessions from the most recent backwards.
    // Breaks on the first non-doom session — this is a recency count, not a validated "clean streak".
    const derivedDoomStreak = (() => {
        let streak = 0;
        for (let i = sessions.length - 1; i >= 0; i -= 1) {
            const p = maybeNum(sessions[i]?.S_t);
            if (!isFiniteNumber(p) || p < DOOM_THRESHOLD) break;
            streak += 1;
        }
        return streak;
    })();

    // Count of consecutive mindful sessions from the most recent backwards.
    // Breaks on first doom session.
    const derivedMindfulStreak = (() => {
        let streak = 0;
        for (let i = sessions.length - 1; i >= 0; i -= 1) {
            const p = maybeNum(sessions[i]?.S_t);
            if (!isFiniteNumber(p) || p >= DOOM_THRESHOLD) break;
            streak += 1;
        }
        return streak;
    })();

    // Aggregated self-report impact: compare mood shift + regret between
    // autopilot and mindful sessions for quick dashboard insight.
    const moodDissonance = (() => {
        const withMood = sessions.filter((s) => maybeNum(s.moodBefore) > 0 && maybeNum(s.moodAfter) > 0);
        const withRegret = sessions.filter((s) => maybeNum(s.regretScore) > 0);
        if (!withMood.length && !withRegret.length) return null;

        const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
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
            totalSurveyed: withMood.length + withRegret.length,
        };
    })();

    const avgSessions = maybeNum(rawData?.avgSessions) ?? derivedAvgSessions;
    const sessionsToday = maybeNum(rawData?.sessionsToday) ?? derivedSessionsToday;
    const todayVsAvgDelta = maybeNum(rawData?.todayVsAvgDelta) ?? (
        (isFiniteNumber(sessionsToday) && isFiniteNumber(avgSessions) && avgSessions > 0)
            ? ((sessionsToday - avgSessions) / avgSessions) * 100
            : null
    );

    const activeTimeTodaySeconds = maybeNum(rawData?.activeTimeTodaySeconds) ?? derivedActiveTodaySeconds;
    const activeTimeToday = (typeof rawData?.activeTimeToday === "string" && rawData.activeTimeToday)
        ? rawData.activeTimeToday
        : (isFiniteNumber(activeTimeTodaySeconds) ? formatDurationSec(activeTimeTodaySeconds) : null);

    const dataSinceDate =
        (typeof rawData?.dataSinceDate === "string" && rawData.dataSinceDate) ||
        (typeof rawData?.startDate === "string" && rawData.startDate) ||
        earliestDateKey ||
        null;

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
        totalReels: maybeNum(rawData?.totalReels) ?? (sessionReels.length ? sumOf(sessionReels) : (timelineCapture.length || null)),
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
        currentHour: maybeNum(rawData?.currentHour) ?? new Date().getHours(),
        todayVsAvgDelta,
        dataSinceDate,
        totalSessions: sessions.length,
        avgSessions,
        avgActiveTimeTodaySeconds: maybeNum(rawData?.avgActiveTimeTodaySeconds) ?? derivedAvgActiveTimeTodaySeconds,
        last3SessionAutopilotRates: last3SessionAutopilotRates.length ? last3SessionAutopilotRates : derivedLast3SessionAutopilotRates,
        confidenceBreakdown: rawData?.model_confidence_breakdown || null
    };
}

// ─── DOOM THRESHOLD ─────────────────────────────────────────────────────────
// Matches Python's DOOM_PROBABILITY_THRESHOLD = 0.55 — single source of truth.
// The header risk bands (70 / 45 / 25) operate on the 0-100 captureRiskScore scale,
// not the raw S_t probability — different layer, not a conflict.
const DOOM_THRESHOLD = 0.55;

// ─── STATE PALETTE (mirrors MonitorScreen) ───────────────────────────────────
const HEADER_STATE = {
    doom:    { accent: '#C4563A', bg: 'rgba(196,86,58,0.08)', glow: 'rgba(196,86,58,0.4)',  label: 'DOOM',    pulseCycle: '1.2s' },
    hooked:  { accent: '#C4973A', bg: 'rgba(196,151,58,0.08)', glow: 'rgba(196,151,58,0.35)', label: 'HOOKED',  pulseCycle: '1.8s' },
    aware:   { accent: '#6B3FA0', bg: 'rgba(107,63,160,0.06)', glow: 'rgba(107,63,160,0.3)', label: 'AWARE',   pulseCycle: '2.5s' },
    mindful: { accent: '#3A9E6F', bg: 'rgba(58,158,111,0.08)', glow: 'rgba(58,158,111,0.3)', label: 'MINDFUL', pulseCycle: '3s'   },
};
const getHeaderState = (s) =>
    s >= 70 ? HEADER_STATE.doom :
    s >= 45 ? HEADER_STATE.hooked :
    s >= 25 ? HEADER_STATE.aware :
    HEADER_STATE.mindful;

// ─── REELIO HEADER ────────────────────────────────────────────────────────────
function ReelioHeader({ data, isAccessibilityActive, openAccessibilitySettings }) {
    const rawScore = safeNum(data?.captureRiskScore, 0);
    // Prefer true idle time (now − last session end) for the chip; fall back to
    // the historical inter-session gap when the new field isn't present yet.
    const timeSince = maybeNum(data?.idleSinceLastSessionMin) ?? maybeNum(data?.timeSinceLastSessionMin);
    // Inactivity guard: if no sessions today and user has been away 2+ hours,
    // show MINDFUL state so yesterday's DOOM score doesn't linger in the header.
    const isIdleStale = safeNum(data?.sessionsToday, 1) === 0
        && isFiniteNumber(timeSince) && timeSince > 120;
    const score = isIdleStale ? 0 : rawScore;
    const st = getHeaderState(score);
    const activeSeconds = maybeNum(data?.activeTimeTodaySeconds);
    const peakWindow = data?.peakRiskWindow;
    const currentHour = safeNum(data?.currentHour, new Date().getHours());

    // Determine if we're in peak risk window
    const inPeakWindow = (() => {
        if (!peakWindow || typeof peakWindow !== 'string') return false;
        const m = peakWindow.match(/(\d{1,2}):\d{2}\s*-\s*(\d{1,2}):\d{2}/);
        if (!m) return false;
        const start = parseInt(m[1], 10);
        const end = parseInt(m[2], 10);
        if (start <= end) return currentHour >= start && currentHour < end;
        return currentHour >= start || currentHour < end;
    })();

    // Status chip logic
    let chipText, chipDotColor, chipPulse;
    if (!isAccessibilityActive) {
        chipText = '⚠ Enable tracking';
        chipDotColor = D.warn;
        chipPulse = false;
    } else if (isFiniteNumber(timeSince) && timeSince < 5) {
        // Actively tracking or just finished
        const elapsed = isFiniteNumber(activeSeconds) ? formatDurationSec(activeSeconds) : '';
        chipText = elapsed ? `Tracking · ${elapsed}` : 'Tracking';
        chipDotColor = st.accent;
        chipPulse = true;
    } else if (inPeakWindow) {
        chipText = 'Peak hours';
        chipDotColor = D.coral;
        chipPulse = true;
    } else if (isFiniteNumber(timeSince)) {
        const hrs = Math.floor(timeSince / 60);
        const mins = Math.round(timeSince % 60);
        const ago = hrs > 0 ? `${hrs}h ago` : `${mins}m ago`;
        chipText = `Idle · ${ago}`;
        chipDotColor = D.soft;
        chipPulse = false;
    } else {
        chipText = 'Ready';
        chipDotColor = D.safe;
        chipPulse = false;
    }

    // Blend state color into yellow base for the header background
    return (
        <div style={{
            height: 58,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 20px',
            position: 'sticky',
            top: 0,
            zIndex: 100,
            background: '#EDE8DF',
            borderBottom: '1px solid rgba(26,22,18,0.06)',
            transition: 'border-color 0.6s ease',
        }}>
            {/* Left: Logo wordmark with state-colored icon */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <div style={{
                    width: 28, height: 28,
                    borderRadius: '50%',
                    background: st.accent,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: `0 0 10px ${st.glow}`,
                    transition: 'background 0.6s ease, box-shadow 0.6s ease',
                }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <circle cx="7" cy="7" r="3.5" fill="white" fillOpacity="0.9"/>
                        <circle cx="7" cy="7" r="6" stroke="white" strokeOpacity="0.5" strokeWidth="1.2" fill="none"/>
                    </svg>
                </div>
                <span style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: 21,
                    fontWeight: 800,
                    color: D.ink,
                    letterSpacing: '-0.01em',
                    lineHeight: 1,
                }}>Reelio</span>
            </div>

            {/* Right: Status chip */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {!isAccessibilityActive && (
                    <button
                        onClick={openAccessibilitySettings}
                        style={{
                            border: 'none',
                            background: st.accent,
                            color: 'white',
                            borderRadius: 999,
                            padding: '7px 14px',
                            fontFamily: "'Space Grotesk', sans-serif",
                            fontSize: 10,
                            fontWeight: 800,
                            letterSpacing: '0.05em',
                            textTransform: 'uppercase',
                            cursor: 'pointer',
                            boxShadow: `0 2px 10px ${st.glow}`,
                            transition: 'background 0.4s ease',
                        }}
                    >
                        {chipText}
                    </button>
                )}
                {isAccessibilityActive && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 7,
                        background: 'rgba(255,255,255,0.75)',
                        borderRadius: 999,
                        padding: '6px 14px 6px 10px',
                        border: `1.5px solid ${chipPulse ? st.accent : D.borderSoft}`,
                        transition: 'border-color 0.5s ease',
                    }}>
                        <div style={{
                            width: 8, height: 8,
                            borderRadius: '50%',
                            background: chipDotColor,
                            boxShadow: chipPulse ? `0 0 8px ${chipDotColor}` : 'none',
                            animation: chipPulse ? `dotPulse ${st.pulseCycle} ease-in-out infinite` : 'none',
                            transition: 'background 0.4s ease',
                        }} />
                        <span style={{
                            fontFamily: "'Space Grotesk', sans-serif",
                            fontSize: 10,
                            fontWeight: 700,
                            color: chipPulse ? st.accent : D.ink3,
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                            whiteSpace: 'nowrap',
                            transition: 'color 0.4s ease',
                        }}>{chipText}</span>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── ReeliApp ─────────────────────────────────────────────────────────────────
export default function ReeliApp() {
    const [screen, setScreen] = useState("home");
    const [rawData, setRawData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    // Splash: onboarding screen shows for ≥4s on cold start, or until data arrives (whichever is later)
    const [splashDone, setSplashDone] = useState(false);

    const checkA11y = () => typeof window.Android?.isAccessibilityEnabled === 'function'
        ? !!window.Android.isAccessibilityEnabled()
        : false;
    const [isAccessibilityActive, setIsAccessibilityActive] = useState(checkA11y);
    useEffect(() => {
        // Poll every second as a fallback
        const id = setInterval(() => {
            const cur = checkA11y();
            setIsAccessibilityActive(prev => prev !== cur ? cur : prev);
        }, 1000);
        // Hook into Kotlin onResume's window.updateServiceStatus call
        window.updateServiceStatus = (enabled) => {
            setIsAccessibilityActive(!!enabled);
            window.dispatchEvent(new CustomEvent('a11y-status', { detail: !!enabled }));
        };
        // Also respond to cross-component events
        const onStatus = e => setIsAccessibilityActive(!!e.detail);
        window.addEventListener('a11y-status', onStatus);
        return () => { clearInterval(id); window.removeEventListener('a11y-status', onStatus); };
    }, []);

    // 4-second splash timer
    useEffect(() => {
        const tid = setTimeout(() => setSplashDone(true), 4000);
        return () => clearTimeout(tid);
    }, []);

    const openAccessibilitySettings = () => {
        if (window.Android && window.Android.enableAccessibility) {
            window.Android.enableAccessibility();
        }
    };

    useEffect(() => {
        // "No data" errors from Kotlin mean CSV doesn't exist yet — not a real error.
        // Show onboarding instead of a red error screen.
        const isNoDataError = (msg) =>
            typeof msg === 'string' && (
                msg.includes('No data file found') ||
                msg.includes('No data available') ||
                msg.includes('Empty CSV')
            );

        const handleData = (parsed) => {
            if (!parsed) {
                setRawData(null);
                setLoading(false);
                return;
            }
            if (parsed.error) {
                if (isNoDataError(parsed.error)) {
                    // Treat as empty state, not error
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

    // ─── Retroactive Label Polling ──────────────────────────────────────────
    useEffect(() => {
        if (!window.Android || typeof window.Android.drainPendingRetroactiveLabel !== 'function') return;

        const poll = () => {
            try {
                const b64 = window.Android.drainPendingRetroactiveLabel();
                if (b64 && b64.length > 0) {
                    const json = atob(b64);
                    const label = JSON.parse(json);
                    console.log("[Bridge] Received retroactive label update:", label);
                    // Also fire the global callback so DashboardToday + normalizeData
                    // can persist the override via the window-level cache.
                    if (typeof window.onRetroactiveLabelComplete === 'function') {
                        try {
                            window.onRetroactiveLabelComplete(b64);
                        } catch (cbErr) {
                            console.warn("[Bridge] onRetroactiveLabelComplete callback failed:", cbErr);
                        }
                    }
                    
                    setRawData(prev => {
                        if (!prev) return prev;
                        const patch = (list) => safeArr(list).map(s => {
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

        const id = setInterval(poll, 2000);
        return () => clearInterval(id);
    }, []);

    // Memoized — recomputes only when Kotlin pushes new rawData, not on every tab change or state update
    const data = useMemo(() => (rawData ? normalizeData(rawData) : null), [rawData]);

    if (loading) return <LoadingState />;

    if (error) {
        return (
            <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: D.bg, color: "#FF3B3B", padding: 20, textAlign: "center" }}>
                ⚠️ {error}
            </div>
        );
    }

    // Show onboarding when: no data at all, OR splash timer hasn't elapsed yet
    const hasData = rawData && safeArr(rawData.sessions).length > 0;
    if (!hasData || !splashDone) return <OnboardingState />;

    return (
        <div style={{ display: "flex", justifyContent: "center", minHeight: "100vh", background: "#EDE8DF", alignItems: "flex-start" }}>
            <Styles />
            <div
                className="app-shell"
                style={{ position: "relative", display: 'flex', flexDirection: 'column', height: '100vh' }}
                onContextMenu={(e) => e.preventDefault()}
                onSelectStart={(e) => e.preventDefault()}
            >
                <div className="scanlines" />

                <ReelioHeader data={data} isAccessibilityActive={isAccessibilityActive} openAccessibilitySettings={openAccessibilitySettings} />

                <div style={{ overflowY: "auto", flex: 1, paddingBottom: 80 }}>
                    {screen === "home"      && <MonitorScreen data={data} />}
                    {screen === "calendar"  && <CaptureCalendarScreen data={data} />}
                    {screen === "dashboard" && <DashboardScreen data={data} />}
                    {screen === "settings"  && <SettingsScreen data={data} />}
                </div>

                <div className="tab-bar">
                    {[
                        { id: "home",      icon: TabIconMonitor,   label: "Monitor"   },
                        { id: "calendar",  icon: TabIconCalendar,  label: "Calendar"  },
                        { id: "dashboard", icon: TabIconDashboard, label: "Dashboard" },
                        { id: "settings",  icon: TabIconSettings,  label: "Settings"  },
                    ].map(({ id, icon: Icon, label }) => (
                        <button key={id} className={`tab-item ${screen === id ? "active" : ""}`} onClick={() => setScreen(id)}>
                            <Icon size={20} color={screen === id ? "white" : D.muted} />
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
