import {
    useState, D, safeNum, maybeNum, isFiniteNumber, safeArr,
} from '../shared.jsx';


// ─── 4 CAPTURE STATES — aligned exactly with MonitorScreen hero card ──────────
// Thresholds: avgCapture is S_t in [0, 1] (ALSE posterior probability)
// doom ≥ 0.70 | hooked ≥ 0.45 | aware ≥ 0.25 | mindful < 0.25
const CAPTURE_STATES = [
    { id: 'doom', label: 'Doom', cellBg: '#F5EDE9', accent: '#C4563A', textColor: '#A03A25' },
    { id: 'hooked', label: 'Hooked', cellBg: '#F5F0E2', accent: '#C4973A', textColor: '#7A6020' },
    { id: 'aware', label: 'Aware', cellBg: '#E8E0F5', accent: '#6B3FA0', textColor: '#4A2580' },
    { id: 'mindful', label: 'Mindful', cellBg: '#EAF3EE', accent: '#3A9E6F', textColor: '#2A7A54' },
];

const stateFromCapture = (avgCapture) => {
    if (avgCapture >= 0.70) return CAPTURE_STATES[0]; // doom
    if (avgCapture >= 0.45) return CAPTURE_STATES[1]; // hooked
    if (avgCapture >= 0.25) return CAPTURE_STATES[2]; // aware
    return CAPTURE_STATES[3];                          // mindful
};

const derivePersonalCaptureBaselineSec = (dateBuckets) => {
    const recentDurations = Object.values(dateBuckets || {})
        .flatMap((bucket) => safeArr(bucket))
        .map((entry) => {
            const source = entry?.raw || entry || {};
            return maybeNum(entry?.durationSec)
                ?? maybeNum(source.durationSec)
                ?? maybeNum(source.sessionDurationSec);
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
};

const getDayCaptureWeight = (entry, personalBaselineSec = 180) => {
    const source = entry?.raw || entry || {};
    const durationSec = maybeNum(entry?.durationSec)
        ?? maybeNum(source.durationSec)
        ?? maybeNum(source.sessionDurationSec);
    if (!isFiniteNumber(durationSec) || durationSec <= 0) return 0.2;

    const baseWeight = Math.min(durationSec / personalBaselineSec, 1);
    if (durationSec < 30) return Math.max(0.06, baseWeight * 0.2);
    if (durationSec < 60) return Math.max(0.12, baseWeight * 0.45);
    if (durationSec < 120) return Math.max(0.3, baseWeight * 0.75);
    return Math.max(0.45, baseWeight);
};

// ─── CaptureIcon — 4 minimal line-art faces, one per capture state ────────────
const CaptureIcon = ({ stateId, size = 22 }) => {
    const ink = '#1A1612';
    const state = CAPTURE_STATES.find(s => s.id === stateId) || CAPTURE_STATES[3];
    const bg = state.accent;
    const scale = size / 100;

    if (stateId === 'doom') return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none" style={{ overflow: 'visible' }}>
            <g transform={`scale(${scale})`}>
                <rect x="15" y="20" width="70" height="65" rx="16" fill={bg} />
                <line x1="28" y1="42" x2="72" y2="42" stroke={ink} strokeWidth="5" strokeLinecap="round" />
                <line x1="32" y1="50" x2="44" y2="50" stroke={ink} strokeWidth="4" strokeLinecap="round" />
                <line x1="56" y1="50" x2="68" y2="50" stroke={ink} strokeWidth="4" strokeLinecap="round" />
                <line x1="42" y1="68" x2="58" y2="68" stroke={ink} strokeWidth="4" strokeLinecap="round" />
            </g>
        </svg>
    );

    if (stateId === 'hooked') return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none" style={{ overflow: 'visible' }}>
            <g transform={`scale(${scale})`}>
                <path d="M 50 15 L 85 80 L 15 80 Z" fill={bg} stroke={bg} strokeWidth="12" strokeLinejoin="round" />
                <path d="M 32 55 L 43 60 L 32 65 M 68 55 L 57 60 L 68 65" stroke={ink} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                <line x1="45" y1="75" x2="55" y2="75" stroke={ink} strokeWidth="4" strokeLinecap="round" />
            </g>
        </svg>
    );

    if (stateId === 'aware') return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none" style={{ overflow: 'visible' }}>
            <g transform={`scale(${scale})`}>
                <path d="M 50 15 L 85 32 L 85 68 L 50 85 L 15 68 L 15 32 Z" fill={bg} stroke={bg} strokeWidth="10" strokeLinejoin="round" />
                <circle cx="38" cy="50" r="14" fill="#FFF" />
                <circle cx="62" cy="50" r="14" fill="#FFF" />
                <circle cx="33" cy="50" r="5" fill={ink} />
                <circle cx="57" cy="50" r="5" fill={ink} />
            </g>
        </svg>
    );

    // mindful
    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none" style={{ overflow: 'visible' }}>
            <g transform={`scale(${scale})`}>
                <circle cx="35" cy="35" r="22" fill={bg} />
                <circle cx="65" cy="35" r="22" fill={bg} />
                <circle cx="35" cy="65" r="22" fill={bg} />
                <circle cx="65" cy="65" r="22" fill={bg} />
                <rect x="35" y="35" width="30" height="30" fill={bg} />
                <path d="M 32 48 Q 38 56 44 48 M 56 48 Q 62 56 68 48" stroke={ink} strokeWidth="4" strokeLinecap="round" fill="none" />
                <path d="M 42 62 Q 50 70 58 62" stroke={ink} strokeWidth="4" strokeLinecap="round" fill="none" />
            </g>
        </svg>
    );
};

// ─── DayDetailSheet ──────────────────────────────────────────────────────────
const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

function DayDetailSheet({ dateStr, dayBucket, personalCaptureBaselineSec, onClose }) {
    if (!dateStr || !dayBucket) return null;

    const [y, m, d] = dateStr.split('-').map(Number);
    const label = `${d} ${monthNames[m - 1]}, ${y}`;

    // dayBucket entries: { raw: session, durationSec, ts }
    const sessions = safeArr(dayBucket).sort((a, b) => {
        const at = isFiniteNumber(a.ts) ? a.ts : 0;
        const bt = isFiniteNumber(b.ts) ? b.ts : 0;
        return at - bt;
    });

    const weighted = sessions
        .map((e) => {
            const prob = maybeNum(e.raw?.S_t);
            if (!isFiniteNumber(prob)) return null;
            const weight = getDayCaptureWeight(e, personalCaptureBaselineSec);
            return weight > 0 ? { prob, weight } : null;
        })
        .filter(Boolean);
    const totalWeight = weighted.length
        ? weighted.reduce((sum, e) => sum + e.weight, 0)
        : 0;
    const avgCapture = totalWeight > 0
        ? weighted.reduce((sum, e) => sum + (e.prob * e.weight), 0) / totalWeight
        : null;
    const dayState = isFiniteNumber(avgCapture) ? stateFromCapture(avgCapture) : CAPTURE_STATES[2];

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 200,
            display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        }} onClick={onClose}>
            {/* Backdrop */}
            <div style={{
                position: 'absolute', inset: 0,
                background: 'rgba(0,0,0,0.38)',
            }} />
            {/* Sheet */}
            <div style={{
                position: 'relative', zIndex: 1,
                background: 'white', borderRadius: '22px 22px 0 0',
                padding: '0 0 32px',
                maxHeight: '72vh', overflowY: 'auto',
                boxShadow: '0 -6px 32px rgba(0,0,0,0.18)',
            }} onClick={e => e.stopPropagation()}>
                {/* Drag handle */}
                <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, marginBottom: 4 }}>
                    <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.12)' }} />
                </div>
                {/* Title row */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 20px 14px',
                    borderBottom: `3px solid ${dayState.accent}22`,
                    borderLeft: `5px solid ${dayState.accent}`,
                }}>
                    <div>
                        <div style={{
                            fontFamily: "'Space Grotesk', sans-serif",
                            fontSize: 18, fontWeight: 800, color: D.ink,
                        }}>{label}</div>
                        <div style={{
                            fontFamily: "'Nunito', sans-serif",
                            fontSize: 12, fontWeight: 700,
                            color: dayState.accent, marginTop: 2,
                        }}>{dayState.label} · {sessions.length} session{sessions.length !== 1 ? 's' : ''} · avg {isFiniteNumber(avgCapture) ? Math.round(avgCapture * 100) : '--'}% capture</div>
                    </div>
                    <button onClick={onClose} style={{
                        width: 30, height: 30, borderRadius: '50%',
                        border: '1.5px solid rgba(0,0,0,0.12)',
                        background: 'rgba(0,0,0,0.04)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', fontSize: 16, color: D.soft,
                    }}>×</button>
                </div>

                {/* Per-session list */}
                <div style={{ padding: '14px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {sessions.length === 0 && (
                        <div style={{
                            fontFamily: "'Nunito', sans-serif", fontSize: 13,
                            color: D.soft, textAlign: 'center', padding: '20px 0',
                        }}>No session detail available</div>
                    )}
                    {sessions.map((entry, i) => {
                        const s = entry.raw || {};
                        const prob = maybeNum(s.S_t);
                        const state = isFiniteNumber(prob) ? stateFromCapture(prob) : CAPTURE_STATES[2];
                        const reels = maybeNum(s.nReels);
                        const dwell = maybeNum(s.avgDwell);
                        const period = typeof s.timePeriod === 'string' && s.timePeriod !== 'Unknown' ? s.timePeriod : null;
                        const postSessionRating = maybeNum(s.postSessionRating);
                        const regretScore = maybeNum(s.regretScore);
                        const moodAfter = maybeNum(s.moodAfter);
                        const comparativeRating = maybeNum(s.comparativeRating);
                        const intendedAction = typeof s.intendedAction === 'string' ? s.intendedAction : '';
                        const retroactiveLabel = Boolean(s.retroactiveLabel);
                        // Treat a session as surveyed only when at least one of the
                        // core survey fields is present. This guards against legacy
                        // payloads where hasSurvey may be true but all metrics are 0.
                        const hasSurvey =
                            (isFiniteNumber(postSessionRating) && postSessionRating > 0) ||
                            (isFiniteNumber(regretScore) && regretScore > 0) ||
                            (isFiniteNumber(moodAfter) && moodAfter > 0) ||
                            (isFiniteNumber(comparativeRating) && comparativeRating > 0);

                        // Format start time
                        let startLabel = '--';
                        if (typeof s.startTime === 'string' && s.startTime && s.startTime !== 'Unknown') {
                            const dt = new Date(s.startTime);
                            if (!Number.isNaN(dt.getTime())) {
                                startLabel = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                            }
                        }

                        // Duration from durationSec
                        let durLabel = '--';
                        if (isFiniteNumber(entry.durationSec) && entry.durationSec > 0) {
                            const mins = Math.floor(entry.durationSec / 60);
                            const secs = Math.round(entry.durationSec % 60);
                            durLabel = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
                        }

                        return (
                            <div key={i} style={{
                                background: state.cellBg,
                                borderRadius: 14,
                                padding: '12px 14px',
                                border: `1.5px solid ${state.accent}30`,
                                display: 'flex', alignItems: 'center', gap: 12,
                            }}>
                                {/* State dot */}
                                <div style={{
                                    width: 36, height: 36, borderRadius: 10,
                                    background: state.accent,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0,
                                }}>
                                    <CaptureIcon stateId={state.id} size={20} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                        fontFamily: "'Space Grotesk', sans-serif",
                                        fontSize: 13, fontWeight: 800, color: D.ink,
                                    }}>Session {i + 1} · {startLabel}{period ? `  ·  ${period}` : ''}</div>
                                    <div style={{
                                        fontFamily: "'Nunito', sans-serif",
                                        fontSize: 11, fontWeight: 600, color: D.ink2,
                                        marginTop: 3,
                                    }}>
                                        {isFiniteNumber(reels) ? `${Math.round(reels)} reels` : '--'}
                                        {'  ·  '}
                                        {durLabel}
                                        {isFiniteNumber(dwell) ? `  ·  ${dwell.toFixed(1)}s/reel` : ''}
                                    </div>
                                    {hasSurvey && (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                                            <span style={{
                                                fontSize: 10, fontWeight: 900, padding: '4px 10px', borderRadius: 8,
                                                background: 'rgba(58,158,111,0.10)', border: '1px solid rgba(58,158,111,0.20)', color: '#3A9E6F',
                                                textTransform: 'uppercase', letterSpacing: '0.02em'
                                            }}>
                                                {retroactiveLabel ? 'Retroactively Labeled' : 'Surveyed'}
                                            </span>
                                            {isFiniteNumber(postSessionRating) && postSessionRating > 0 && (
                                                <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 8, background: '#EEE9F5', color: '#6B3FA0' }}>
                                                    Rating {postSessionRating}/5
                                                </span>
                                            )}
                                            {isFiniteNumber(regretScore) && regretScore > 0 && (
                                                <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 8, background: regretScore >= 4 ? '#F5EDE9' : '#EAF3EE', color: regretScore >= 4 ? '#C4563A' : '#2A7A54' }}>
                                                    Regret {regretScore}/5
                                                </span>
                                            )}
                                            {isFiniteNumber(moodAfter) && moodAfter > 0 && (
                                                <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 8, background: '#EEE9F5', color: '#6B3FA0' }}>
                                                    Mood {moodAfter}/5
                                                </span>
                                            )}
                                            {isFiniteNumber(comparativeRating) && comparativeRating > 0 && (
                                                <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 8, background: '#F5F0E2', color: '#9A7020' }}>
                                                    Experience {comparativeRating}/5
                                                </span>
                                            )}
                                            {intendedAction && intendedAction !== '0' && intendedAction !== '0.0' && (
                                                <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 8, background: '#F5F0E2', color: '#9A7020' }}>
                                                    Intent: {intendedAction}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                                {/* Capture badge */}
                                {isFiniteNumber(prob) && (
                                    <div style={{
                                        fontFamily: "'Space Grotesk', sans-serif",
                                        fontSize: 16, fontWeight: 800,
                                        color: state.accent, minWidth: 40, textAlign: 'right',
                                    }}>{Math.round(prob * 100)}%</div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// ─── CaptureCalendarScreen ────────────────────────────────────────────────────
function CaptureCalendarScreen({ data }) {
    const [viewMonth, setViewMonth] = useState(() => {
        const now = new Date();
        return { year: now.getFullYear(), month: now.getMonth() };
    });
    const [selectedDay, setSelectedDay] = useState(null);

    // heatmapData is derived in app.jsx from real per-session S_t values
    const heatmap = safeArr(data.heatmapData);
    const totalSessions = safeNum(data.totalSessions, 0);
    const totalReels = safeNum(data.totalReels, 0);
    const avgScore = safeNum(data.tenSessionAvgScore, safeNum(data.captureRiskScore, 0));
    const modelConfidence = maybeNum(data.modelConfidence);
    // dateBuckets passed from app.jsx for per-session drill-down
    const dateBuckets = data.dateBuckets || {};
    const personalCaptureBaselineSec = derivePersonalCaptureBaselineSec(dateBuckets);

    const dayLookup = {};
    heatmap.forEach(d => {
        if (d.date) dayLookup[d.date] = d;
    });

    const year = viewMonth.year;
    const month = viewMonth.month;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDow = firstDay.getDay();

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const prevMonth = () => setViewMonth(prev => {
        const m = prev.month - 1;
        return m < 0 ? { year: prev.year - 1, month: 11 } : { year: prev.year, month: m };
    });
    const nextMonth = () => setViewMonth(prev => {
        const m = prev.month + 1;
        return m > 11 ? { year: prev.year + 1, month: 0 } : { year: prev.year, month: m };
    });

    const cells = [];
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const entry = dayLookup[dateStr];
        const avgCapture = entry ? maybeNum(entry.avgCapture) : null;
        cells.push({
            day: d,
            dateStr,
            avgCapture: isFiniteNumber(avgCapture) ? avgCapture : null,
            sessionCount: entry ? (maybeNum(entry.sessionCount) ?? 0) : 0,
        });
    }

    const monthEntries = cells.filter(c => c && isFiniteNumber(c.avgCapture));
    const monthAvgCapture = monthEntries.length
        ? monthEntries.reduce((s, c) => s + c.avgCapture, 0) / monthEntries.length
        : null;
    const monthState = isFiniteNumber(monthAvgCapture) ? stateFromCapture(monthAvgCapture) : CAPTURE_STATES[2];

    const controlRate = isFiniteNumber(monthAvgCapture)
        ? Math.round((1 - monthAvgCapture) * 100) : null;

    const summaryLines = {
        doom: 'Doom-scroll patterns dominated this month. Your ALSE score stayed high.',
        hooked: 'Capture was elevated — you were pulled in often. Watch for quick re-entries.',
        aware: 'A mixed month. Some sessions ran long, but you recovered most of the time.',
        mindful: 'Your capture rate was low this month. You scrolled with intention.',
    };

    const daysWithData = monthEntries.length;
    const sessionsThisMonth = monthEntries.reduce((sum, c) => sum + safeNum(c.sessionCount, 0), 0);

    return (
        <>
            <div style={{ padding: '0 16px 32px', position: 'relative', zIndex: 1 }}>
                {/* ── Header ── */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '18px 0 6px',
                }}>
                    <button onClick={prevMonth} style={{
                        width: 36, height: 36, borderRadius: '50%',
                        border: `1.5px solid ${D.border}`,
                        background: 'white', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', cursor: 'pointer', color: D.ink, fontSize: 18,
                    }}>‹</button>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{
                            fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 800,
                            color: D.ink, letterSpacing: '-0.02em',
                        }}>Capture Calendar</div>
                        <div style={{
                            fontFamily: "'Nunito', sans-serif", fontSize: 12, fontWeight: 700,
                            color: D.soft, marginTop: 2,
                        }}>{monthNames[month]}, {year} · avg capture risk per day</div>
                    </div>
                    <button onClick={nextMonth} style={{
                        width: 36, height: 36, borderRadius: '50%',
                        border: `1.5px solid ${D.border}`,
                        background: 'white', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', cursor: 'pointer', color: D.ink, fontSize: 18,
                    }}>›</button>
                </div>

                {/* ── Day labels ── */}
                <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4,
                    marginTop: 14, marginBottom: 6,
                }}>
                    {dayNames.map(d => (
                        <div key={d} style={{
                            textAlign: 'center',
                            fontFamily: "'Space Grotesk', sans-serif",
                            fontSize: 10, fontWeight: 700, color: D.soft,
                            letterSpacing: '0.06em', textTransform: 'uppercase',
                            padding: '4px 0',
                        }}>{d}</div>
                    ))}
                </div>

                {/* ── Calendar grid ── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 5 }}>
                    {cells.map((cell, idx) => {
                        if (!cell) return <div key={`empty-${idx}`} />;

                        const today = new Date();
                        const isToday = cell.day === today.getDate()
                            && month === today.getMonth()
                            && year === today.getFullYear();
                        const isFuture = new Date(year, month, cell.day) > today;
                        const state = isFiniteNumber(cell.avgCapture)
                            ? stateFromCapture(cell.avgCapture) : null;

                        if (isFuture || !state) {
                            return (
                                <div key={cell.dateStr} style={{
                                    aspectRatio: '1', borderRadius: 12,
                                    background: isFuture
                                        ? 'rgba(255,255,255,0.30)'
                                        : 'rgba(255,255,255,0.55)',
                                    display: 'flex', flexDirection: 'column',
                                    alignItems: 'center', justifyContent: 'center',
                                    border: isToday
                                        ? `2px solid ${D.purple}`
                                        : '1.5px solid rgba(255,255,255,0.6)',
                                }}>
                                    <span style={{
                                        fontSize: 10, fontWeight: 700,
                                        color: D.soft,
                                        fontFamily: "'Space Grotesk', sans-serif",
                                    }}>{cell.day}</span>
                                </div>
                            );
                        }

                        return (
                            <div key={cell.dateStr}
                                title={`${state.label} · ${cell.sessionCount} session${cell.sessionCount !== 1 ? 's' : ''} · avg ${Math.round(cell.avgCapture * 100)}% capture`}
                                onClick={() => setSelectedDay(cell.dateStr)}
                                style={{
                                    aspectRatio: '1', borderRadius: 12,
                                    background: state.cellBg,
                                    display: 'flex', flexDirection: 'column',
                                    alignItems: 'center', justifyContent: 'center',
                                    border: isToday
                                        ? `2.5px solid ${state.accent}`
                                        : `1.5px solid ${state.accent}30`,
                                    boxShadow: `0 2px 6px ${state.accent}28`,
                                    cursor: 'pointer',
                                }}
                            >
                                <CaptureIcon stateId={state.id} size={22} />
                            </div>
                        );
                    })}
                </div>

                {/* ── Legend ── */}
                <div style={{
                    display: 'flex', gap: 10, justifyContent: 'center',
                    marginTop: 14, flexWrap: 'wrap',
                }}>
                    {CAPTURE_STATES.map(s => (
                        <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <div style={{
                                width: 12, height: 12, borderRadius: 4,
                                background: s.cellBg,
                                border: `1.5px solid ${s.accent}60`,
                            }} />
                            <span style={{
                                fontSize: 10, fontWeight: 700, color: D.ink2,
                                fontFamily: "'Nunito', sans-serif",
                            }}>{s.label}</span>
                        </div>
                    ))}
                </div>

                {/* ── Monthly Summary ── */}
                <div style={{
                    marginTop: 14, background: 'white',
                    borderRadius: 20, padding: '20px 18px',
                    border: `3px solid ${monthState.accent}40`,
                    borderLeft: `5px solid ${monthState.accent}`,
                }}>
                    <div style={{
                        fontFamily: "'Nunito', sans-serif", fontSize: 11, fontWeight: 700,
                        color: D.soft, letterSpacing: '0.08em', textTransform: 'uppercase',
                        marginBottom: 6,
                    }}>Monthly Capture Pattern</div>
                    <div style={{
                        fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 800,
                        color: monthState.accent, letterSpacing: '-0.02em', marginBottom: 6,
                    }}>{monthState.label}</div>
                    <div style={{
                        fontFamily: "'Nunito', sans-serif", fontSize: 13, fontWeight: 600,
                        color: D.ink2, lineHeight: 1.5,
                    }}>{summaryLines[monthState.id]}</div>
                    {isFiniteNumber(monthAvgCapture) && (
                        <div style={{
                            marginTop: 10, display: 'flex', alignItems: 'center', gap: 8,
                        }}>
                            {/* Capture bar */}
                            <div style={{
                                flex: 1, height: 8, borderRadius: 8,
                                background: 'rgba(0,0,0,0.07)', overflow: 'hidden',
                            }}>
                                <div style={{
                                    height: '100%', borderRadius: 8,
                                    width: `${Math.round(monthAvgCapture * 100)}%`,
                                    background: monthState.accent,
                                }} />
                            </div>
                            <span style={{
                                fontFamily: "'Space Grotesk', sans-serif",
                                fontSize: 13, fontWeight: 800, color: monthState.accent,
                                minWidth: 38, textAlign: 'right',
                            }}>{Math.round(monthAvgCapture * 100)}%</span>
                            <span style={{
                                fontFamily: "'Nunito', sans-serif",
                                fontSize: 11, fontWeight: 600, color: D.soft,
                            }}>avg capture</span>
                        </div>
                    )}
                </div>

                {/* ── Stats row ── */}
                <div style={{
                    display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 12,
                }}>
                    {[
                        {
                            label: 'Reels',
                            value: totalReels > 0 ? totalReels.toLocaleString() : '--',
                            sub: 'all time',
                            accent: '#C4563A',
                        },
                        {
                            label: 'Sessions',
                            value: sessionsThisMonth > 0
                                ? `${sessionsThisMonth}`
                                : (totalSessions || '--'),
                            sub: daysWithData > 0 ? `over ${daysWithData}d` : 'this month',
                            accent: '#6B3FA0',
                        },
                        {
                            label: 'Confidence',
                            value: isFiniteNumber(modelConfidence) ? `${Math.round(modelConfidence * 100)}%` : '--',
                            sub: 'model accuracy',
                            accent: '#3A9E6F',
                        },
                    ].map((stat, i) => (
                        <div key={i} style={{
                            background: '#FDFAF6', borderRadius: 16,
                            padding: '14px 10px', textAlign: 'center',
                            border: `1.5px solid ${stat.accent}25`,
                        }}>
                            <div style={{
                                fontFamily: "'Space Grotesk', sans-serif",
                                fontSize: 10, fontWeight: 700, color: D.soft,
                                letterSpacing: '0.1em', textTransform: 'uppercase',
                                marginBottom: 6,
                            }}>{stat.label}</div>
                            <div style={{
                                fontFamily: "'Space Grotesk', sans-serif",
                                fontSize: 22, fontWeight: 800,
                                color: D.ink, lineHeight: 1, letterSpacing: '-0.02em',
                            }}>{stat.value}</div>
                            <div style={{
                                fontFamily: "'Nunito', sans-serif",
                                fontSize: 10, fontWeight: 600, color: D.soft, marginTop: 4,
                            }}>{stat.sub}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Day Detail Sheet ── */}
            {selectedDay && (
                <DayDetailSheet
                    dateStr={selectedDay}
                    dayBucket={dateBuckets[selectedDay]}
                    personalCaptureBaselineSec={personalCaptureBaselineSec}
                    onClose={() => setSelectedDay(null)}
                />
            )}
        </>
    );
}

export { CaptureCalendarScreen };

