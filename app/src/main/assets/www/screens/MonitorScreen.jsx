import {
    useState, useEffect,
    D, FactorIcon, Label, CollapsibleSection,
    safeNum, maybeNum, isFiniteNumber, safeArr,
    formatDurationSec, formatMin, parseActiveTimeSeconds,
    getRiskMeta, getHeroSummary, useCountUp,
} from '../shared.jsx';

// ─── SOLID COLOR STATE PALETTE ────────────────────────────────────────────────
// Zero gradients. Every surface is one deliberate flat color.
const STATE = {
    doom: {
        heroBg: '#F5EDE9',
        heroText: '#1A1612',
        heroMute: '#6A5E56',
        label: 'DOOM SCROLLING',
        headline: 'Deep in the\nscroll trap.',
        accent: '#C4563A',
    },
    hooked: {
        heroBg: '#F5F0E2',
        heroText: '#1A1612',
        heroMute: '#6A5E56',
        label: 'HOOKED',
        headline: 'Running on\nautopilot.',
        accent: '#C4973A',
    },
    aware: {
        heroBg: '#E8E0F5',
        heroText: '#1A1612',
        heroMute: '#6A5E56',
        label: 'AWARE',
        headline: 'Mostly\nin control.',
        accent: '#6B3FA0',
    },
    mindful: {
        heroBg: '#EAF3EE',
        heroText: '#1A1612',
        heroMute: '#6A5E56',
        label: 'MINDFUL',
        headline: 'Scrolling with\nintention.',
        accent: '#3A9E6F',
    },
};

const getState = s =>
    s >= 70 ? STATE.doom :
        s >= 45 ? STATE.hooked :
            s >= 25 ? STATE.aware :
                STATE.mindful;

// ─── MOOD FACE — same minimal line-art style as CalendarScreen ───────────────
// Each face: circle background + simple line-art eyes/mouth, no gradients.
const MoodFace = ({ score, size = 100 }) => {
    const r = size / 2;
    // Map score to face type
    const type = score >= 70 ? 'doom' : score >= 45 ? 'hooked' : score >= 25 ? 'aware' : 'mindful';
    const state = getState(score);
    const bg = state.accent;
    const ink = '#1A1612';

    // Scale coordinates from a 100x100 viewBox
    const scale = size / 100;

    const faces = {
        mindful: (
            <g transform={`scale(${scale})`}>
                <circle cx="35" cy="35" r="22" fill={bg} />
                <circle cx="65" cy="35" r="22" fill={bg} />
                <circle cx="35" cy="65" r="22" fill={bg} />
                <circle cx="65" cy="65" r="22" fill={bg} />
                <rect x="35" y="35" width="30" height="30" fill={bg} />
                <path d="M 32 48 Q 38 56 44 48 M 56 48 Q 62 56 68 48" stroke={ink} strokeWidth="4" strokeLinecap="round" fill="none" />
                <path d="M 42 62 Q 50 70 58 62" stroke={ink} strokeWidth="4" strokeLinecap="round" fill="none" />
            </g>
        ),
        aware: (
            <g transform={`scale(${scale})`}>
                <path d="M 50 15 L 85 32 L 85 68 L 50 85 L 15 68 L 15 32 Z" fill={bg} stroke={bg} strokeWidth="10" strokeLinejoin="round" />
                <circle cx="38" cy="50" r="14" fill="#FFF" />
                <circle cx="62" cy="50" r="14" fill="#FFF" />
                <circle cx="33" cy="50" r="5" fill={ink} />
                <circle cx="57" cy="50" r="5" fill={ink} />
            </g>
        ),
        hooked: (
            <g transform={`scale(${scale})`}>
                <path d="M 50 15 L 85 80 L 15 80 Z" fill={bg} stroke={bg} strokeWidth="12" strokeLinejoin="round" />
                <path d="M 32 55 L 43 60 L 32 65 M 68 55 L 57 60 L 68 65" stroke={ink} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                <line x1="45" y1="75" x2="55" y2="75" stroke={ink} strokeWidth="4" strokeLinecap="round" />
            </g>
        ),
        doom: (
            <g transform={`scale(${scale})`}>
                <rect x="15" y="20" width="70" height="65" rx="16" fill={bg} />
                <line x1="28" y1="42" x2="72" y2="42" stroke={ink} strokeWidth="5" strokeLinecap="round" />
                <line x1="32" y1="50" x2="44" y2="50" stroke={ink} strokeWidth="4" strokeLinecap="round" />
                <line x1="56" y1="50" x2="68" y2="50" stroke={ink} strokeWidth="4" strokeLinecap="round" />
                <line x1="42" y1="68" x2="58" y2="68" stroke={ink} strokeWidth="4" strokeLinecap="round" />
            </g>
        ),
    };
    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none" style={{ overflow: 'visible' }}>
            {faces[type]}
        </svg>
    );
};

// ─── HERO BLOCK ───────────────────────────────────────────────────────────────
function HeroBlock({ data }) {
    const idleSince = maybeNum(data.idleSinceLastSessionMin);
    // Suppress stale doom state: no sessions today + away 2+ hours → neutral
    const isIdleStale = safeNum(data.sessionsToday, 1) === 0
        && isFiniteNumber(idleSince) && idleSince > 120;
    const score = isIdleStale ? 0 : safeNum(data.captureRiskScore, 0);
    const st = getState(score);
    const summary = getHeroSummary(data);

    // Alert chips
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
        if (d > 8) chips.push({ t: `↑ Higher risk than usual`, dark: true });
        if (d < -8) chips.push({ t: `↓ Calmer than usual`, dark: false });
    }
    // No fallback chip — if nothing noteworthy, show nothing.

    const lines = st.headline.split('\n');

    return (
        <div style={{
            background: st.heroBg,
            borderRadius: '0 0 44px 44px',
            padding: '24px 24px 32px',
            position: 'relative',
            overflow: 'hidden',
        }}>
            {/* State pill */}
            <div style={{
                display: 'inline-flex',
                background: `${st.accent}20`,
                borderRadius: 999, padding: '5px 16px',
                marginBottom: 22,
            }}>
                <span style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: 10, fontWeight: 700, color: st.accent,
                    letterSpacing: '0.18em', textTransform: 'uppercase',
                }}>{st.label}</span>
            </div>

            {/* Face + headline */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 22 }}>
                <div style={{ flexShrink: 0 }}>
                    <MoodFace score={score} size={108} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    {lines.map((line, i) => (
                        <div key={i} style={{
                            fontFamily: "'Space Grotesk', sans-serif",
                            fontSize: 34, fontWeight: 800,
                            color: st.heroText, lineHeight: 1.05,
                            letterSpacing: '-0.03em',
                        }}>{line}</div>
                    ))}
                    <div style={{
                        fontFamily: "'Nunito', sans-serif",
                        fontSize: 13, fontWeight: 700,
                        color: st.heroMute, marginTop: 10, lineHeight: 1.5,
                    }}>{summary.subtext}</div>
                </div>
            </div>

            {/* Chips — horizontal scroll */}
            <div style={{
                display: 'flex', gap: 8,
                overflowX: 'auto', paddingBottom: 2,
                scrollbarWidth: 'none', msOverflowStyle: 'none',
            }}>
                {chips.map((chip, i) => (
                    <div key={i} style={{
                        whiteSpace: 'nowrap', flexShrink: 0,
                        background: chip.dark ? `${st.accent}30` : `${st.accent}12`,
                        borderRadius: 999, padding: '7px 16px',
                        fontFamily: "'Nunito', sans-serif",
                        fontSize: 12, fontWeight: 800,
                        color: chip.dark ? st.accent : st.heroText,
                    }}>{chip.t}</div>
                ))}
            </div>
        </div>
    );
}

// ─── STATS BENTO ─────────────────────────────────────────────────────────────
// Asymmetric: wide time tile (2fr) + two stacked small tiles (1fr)
function StatsBento({ data }) {
    const sessionsTodayRaw = maybeNum(data.sessionsToday);
    const captured = maybeNum(data.capturedSessionsToday);
    const sessions = isFiniteNumber(sessionsTodayRaw) ? sessionsTodayRaw : 0;
    const mindfulPct = (isFiniteNumber(sessionsTodayRaw) && isFiniteNumber(captured) && sessionsTodayRaw > 0)
        ? Math.round(((sessionsTodayRaw - captured) / sessionsTodayRaw) * 100) : null;

    const parsedActive = parseActiveTimeSeconds(data.activeTimeToday, 0);
    const todaySec = maybeNum(data.activeTimeTodaySeconds) ?? (parsedActive > 0 ? parsedActive : null);
    const avgSec = maybeNum(data.avgActiveTimeTodaySeconds) ?? maybeNum(data.tenSessionAvgActiveTimeSec);
    const hasCmp = isFiniteNumber(todaySec) && isFiniteNumber(avgSec) && avgSec > 0;
    const above = hasCmp ? todaySec >= avgSec : false;
    const avgSessions = maybeNum(data.avgSessions);
    const sessionsCounted = useCountUp(sessions, 600);

    const timeDisplay = (typeof data.activeTimeToday === 'string' && data.activeTimeToday)
        ? data.activeTimeToday
        : (isFiniteNumber(todaySec) ? formatDurationSec(todaySec) : '--');

    return (
        <div style={{ padding: '0 16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>

                {/* TIME — sage-cream card */}
                <div style={{
                    background: '#EAF3EE',
                    borderRadius: 26, padding: '22px 20px',
                    position: 'relative', overflow: 'hidden',
                }}>
                    <div style={{
                        width: 38, height: 38, borderRadius: 12,
                        background: '#3A9E6F',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        marginBottom: 16,
                    }}>
                        <FactorIcon type="session" size={20} color="white" />
                    </div>
                    <div style={{
                        fontFamily: "'Space Grotesk', sans-serif",
                        fontSize: 36, fontWeight: 800,
                        color: '#2A7A54', lineHeight: 1, letterSpacing: '-0.03em',
                    }}>{timeDisplay}</div>
                    <div style={{
                        fontFamily: "'Nunito', sans-serif",
                        fontSize: 11, fontWeight: 900,
                        color: '#3A9E6F',
                        letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 8,
                    }}>On App</div>
                    {hasCmp && (
                        <div style={{
                            marginTop: 6, fontFamily: "'Nunito', sans-serif",
                            fontSize: 12, fontWeight: 800,
                            color: above ? '#2A7A54' : '#6A5E56',
                        }}>{above ? '↑ above avg' : '↓ below avg'}</div>
                    )}
                </div>

                {/* RIGHT COLUMN: stacked sessions + mindful */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {/* SESSIONS — terra-cream */}
                    <div style={{
                        background: '#F5EDE9', borderRadius: 26,
                        padding: '18px 14px', flex: 1,
                        position: 'relative', overflow: 'hidden',
                    }}>
                        <div style={{
                            fontFamily: "'Space Grotesk', sans-serif",
                            fontSize: 36, fontWeight: 800,
                            color: '#A03A25', lineHeight: 1, letterSpacing: '-0.03em',
                        }}>{sessionsCounted}</div>
                        <div style={{
                            fontFamily: "'Nunito', sans-serif",
                            fontSize: 10, fontWeight: 900,
                            color: '#C4563A',
                            letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 6,
                        }}>Sessions</div>
                        {(() => {
                            const diff = isFiniteNumber(sessions) && isFiniteNumber(avgSessions) ? sessions - avgSessions : null;
                            if (!isFiniteNumber(diff)) return null;
                            if (diff > 0.5) return <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 11, fontWeight: 800, color: '#A03A25', marginTop: 4 }}>more than usual</div>;
                            if (diff < -0.5) return <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 11, fontWeight: 800, color: '#6A5E56', marginTop: 4 }}>less than usual</div>;
                            return null;
                        })()}
                    </div>

                    {/* MINDFUL — purple-cream */}
                    <div style={{
                        background: '#EEE9F5', borderRadius: 26,
                        padding: '18px 14px', flex: 1,
                        position: 'relative', overflow: 'hidden',
                    }}>
                        {(() => {
                            const capturedN = isFiniteNumber(captured) ? captured : null;
                            const mindfulN = isFiniteNumber(capturedN) && sessions > 0 ? sessions - capturedN : null;
                            const showFraction = isFiniteNumber(mindfulN) && sessions <= 10;
                            const showPct = isFiniteNumber(mindfulPct) && sessions > 10;
                            return (
                                <>
                                    {showFraction ? (
                                        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 24, fontWeight: 800, color: '#4A2580', lineHeight: 1, letterSpacing: '-0.02em' }}>
                                            {mindfulN}<span style={{ fontSize: 14, fontWeight: 700, opacity: 0.45 }}>/{sessions}</span>
                                        </div>
                                    ) : (
                                        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 800, color: '#4A2580', lineHeight: 1, letterSpacing: '-0.02em' }}>
                                            {showPct ? `${mindfulPct}%` : '--'}
                                        </div>
                                    )}
                                    <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 10, fontWeight: 900, color: '#6B3FA0', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 6 }}>Closed mindfully</div>
                                    <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 10, fontWeight: 700, color: '#9A8E84', marginTop: 3 }}>of today's sessions</div>
                                </>
                            );
                        })()}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── AUTOPILOT CARD ───────────────────────────────────────────────────────────
// Clean navy. Left border accent. No muddy brown.
function AutopilotCard({ data }) {
    const doomRate = maybeNum(data.doomRate);
    const rate = isFiniteNumber(doomRate) ? Math.round(doomRate * 100) : null;
    const lastRates = safeArr(data.last3SessionAutopilotRates).filter(isFiniteNumber);
    const outOf10 = isFiniteNumber(rate) ? Math.round(rate / 10) : null;
    const trendInfo = (() => {
        if (lastRates.length < 3) return null;
        const recent = lastRates.slice(-3);
        const delta = recent[2] - recent[0];
        if (delta <= -0.08) return { text: 'improving last 3 sessions', color: '#2A7A54', bg: '#EAF3EE' };
        if (delta >= 0.08) return { text: 'escalating last 3 sessions', color: '#A03A25', bg: '#F5EDE9' };
        return { text: 'steady across last 3 sessions', color: '#6A5E56', bg: '#F4EFE8' };
    })();

    const accent = !isFiniteNumber(rate) ? '#6B3FA0'
        : rate >= 70 ? '#C4563A'
            : rate >= 40 ? '#C4973A'
                : '#3A9E6F';

    const lines = (!isFiniteNumber(rate)
        ? ['Not enough sessions yet.']
        : rate >= 70
            ? [`${outOf10} out of 10 sessions,`, 'you scroll without thinking.']
            : rate >= 40
                ? [`About ${outOf10} in 10 sessions`, 'are mindless.']
                : [`Only ${outOf10} in 10 sessions`, 'go on autopilot.']
    );

    const display = lastRates.slice(-7);

    return (
        <div style={{ padding: '0 16px' }}>
            <div style={{
                background: '#F7F3EC',
                borderRadius: 26, padding: '22px 20px 20px',
                position: 'relative', overflow: 'hidden',
                borderLeft: `5px solid ${accent}`,
                border: '1.5px solid rgba(26,22,18,0.06)',
                borderLeftWidth: 5, borderLeftStyle: 'solid', borderLeftColor: accent,
            }}>
                <div style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: 10, fontWeight: 700,
                    color: '#9A8E84',
                    letterSpacing: '0.16em', textTransform: 'uppercase',
                    marginBottom: 14,
                }}>Autopilot Rate</div>

                {lines.map((line, i) => (
                    <div key={i} style={{
                        fontFamily: "'Space Grotesk', sans-serif",
                        fontSize: 22, fontWeight: 800, color: '#1A1612',
                        lineHeight: 1.25, letterSpacing: '-0.02em',
                    }}>{line}</div>
                ))}

                {trendInfo && (
                    <div style={{
                        marginTop: 10,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        background: trendInfo.bg,
                        color: trendInfo.color,
                        borderRadius: 999,
                        padding: '5px 10px',
                        fontFamily: "'Nunito', sans-serif",
                        fontSize: 11,
                        fontWeight: 800,
                    }}>
                        {trendInfo.text}
                    </div>
                )}

                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 18 }}>
                    {display.map((v, i) => {
                        const c = v >= 65 ? '#C4563A' : v >= 45 ? '#C4973A' : '#3A9E6F';
                        return <div key={i} style={{ width: 14, height: 14, borderRadius: '50%', background: c, boxShadow: `0 0 10px ${c}, 0 0 4px ${c}`, border: `2px solid ${c}40` }} />;
                    })}
                    {Array.from({ length: Math.max(0, 7 - display.length) }).map((_, i) => (
                        <div key={`e${i}`} style={{ width: 14, height: 14, borderRadius: '50%', border: '1.5px solid rgba(26,22,18,0.15)' }} />
                    ))}
                    {display.length > 0 && (
                        <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: 10, fontWeight: 700, color: '#9A8E84', marginLeft: 4 }}>
                            last {display.length}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── RING CARD — RADAR MAP ────────────────────────────────────────────────────
function RingCard({ data }) {
    const _rawScore = safeNum(data.captureRiskScore, 0);
    const _idleSince = maybeNum(data.idleSinceLastSessionMin);
    const _isIdleStale = safeNum(data.sessionsToday, 1) === 0
        && isFiniteNumber(_idleSince) && _idleSince > 120;
    const score = _isIdleStale ? 0 : _rawScore;
    const st = getState(score);
    const meta = getRiskMeta(score);
    const [disp, setDisp] = useState(0);
    const [active, setActive] = useState(null);

    useEffect(() => {
        const target = Math.max(0, Math.min(100, score));
        const start = performance.now();
        const ease = t => 1 - Math.pow(1 - t, 3);
        let raf;
        const step = now => {
            const p = Math.min(1, (now - start) / 700);
            setDisp(Math.round(target * ease(p)));
            if (p < 1) raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
        return () => cancelAnimationFrame(raf);
    }, [score]);

    // Build factors from actual model drivers (reelio_alse.py COMPONENT_NAMES)
    // label = short axis label for radar; fullLabel = full name shown in detail strip
    const driverDefs = [
        { key: 'Session Length', short: 'Session', iconType: 'session', desc: 'How long your sessions last' },
        { key: 'Exit Conflict', short: 'Exit', iconType: 'exit', desc: 'Difficulty closing the app' },
        { key: 'Rapid Re-entry', short: 'Re-entry', iconType: 'reentry', desc: 'Speed of returning to app' },
        { key: 'Scroll Automaticity', short: 'Scroll', iconType: 'scroll', desc: 'Mindless scrolling patterns' },
        { key: 'Dwell Collapse', short: 'Dwell', iconType: 'dwell', desc: 'Shortening attention per reel' },
        { key: 'Rewatch Compulsion', short: 'Rewatch', iconType: 'rewatch', desc: 'Repeated content consumption' },
        { key: 'Environment', short: 'Environ.', iconType: 'environment', desc: 'Late-night or risky context' },
    ];
    const drivers = safeArr(data.doomDrivers);
    const factors = driverDefs.map(def => {
        const match = drivers.find(d => d.name === def.key);
        const raw = match ? (match.contribution ?? match.weight ?? 0) : 0;
        return {
            label: def.short,
            fullLabel: def.key,
            iconType: def.iconType,
            pct: Math.max(0, Math.min(100, Math.round(raw * 100))),
            desc: def.desc,
        };
    });

    const N = 7;
    const baselinePct = 100 / N;
    const SVG = 340;
    const cx = SVG / 2, cy = SVG / 2;
    const R = 115;
    const LABEL_R = 150;
    const angleOf = i => (i * 2 * Math.PI / N) - Math.PI / 2;
    const ptAt = (i, val) => ({
        x: cx + (val / 100) * R * Math.cos(angleOf(i)),
        y: cy + (val / 100) * R * Math.sin(angleOf(i)),
    });

    const gridLevels = [25, 50, 75, 100];
    const octPath = level => factors.map((_, i) => {
        const p = ptAt(i, level);
        return `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    }).join(' ') + 'Z';

    // Sqrt scaling spreads low-mid values outward while preserving ordering.
    const displayPct = f => Math.sqrt(Math.max(0, f.pct) / 100) * 100;

    const dataPath = factors.map((f, i) => {
        const p = ptAt(i, displayPct(f));
        return `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    }).join(' ') + 'Z';

    const leadPct = Math.max(0, ...factors.map(f => f.pct));
    const baselineWindow = Math.max(8, leadPct - baselinePct);
    const signalScore = factor => {
        if (!factor || factor.pct <= 0 || leadPct <= 0) return 0;
        const aboveBaseline = Math.max(0, factor.pct - baselinePct);
        const baselineComponent = Math.min(1, aboveBaseline / baselineWindow);
        const leaderComponent = Math.min(1, factor.pct / Math.max(leadPct, baselinePct));
        return Math.round(Math.min(100, (baselineComponent * 65) + (leaderComponent * 35)));
    };

    const sevColor = score =>
        score >= 75 ? '#C4563A' :
            score >= 45 ? '#C4973A' :
                score >= 20 ? '#6B3FA0' :
                    '#3A9E6F';

    const sevLabel = score =>
        score >= 75 ? 'Dominant' :
            score >= 45 ? 'Active' :
                score >= 20 ? 'Present' :
                    'Background';

    const handleTap = i => setActive(prev => prev === i ? null : i);
    const af = active !== null ? factors[active] : null;

    return (
        <div style={{ padding: '0 16px' }}>
            <div style={{
                background: '#FDFAF6', borderRadius: 28,
                padding: '20px 16px 16px',
                boxShadow: '0 4px 24px rgba(26,22,18,0.06)',
                border: '1.5px solid rgba(26,22,18,0.06)',
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', marginBottom: 16,
                    gap: 12,
                }}>
                    <div style={{ minWidth: 0 }}>
                        <div style={{
                            fontFamily: "'Space Grotesk', sans-serif",
                            fontSize: 15, fontWeight: 800, color: '#1A1612',
                        }}>What's pulling your attention</div>
                        <div style={{
                            fontFamily: "'Nunito', sans-serif",
                            fontSize: 11, fontWeight: 700, color: '#9A8E84', marginTop: 2,
                        }}>Relative to your current attention mix</div>
                    </div>
                    {/* Driver alert count — how many signals are at risk */}
                    {(() => {
                        const dominantN = factors.filter(f => signalScore(f) >= 75).length;
                        const activeN = factors.filter(f => signalScore(f) >= 45 && signalScore(f) < 75).length;
                        const standoutN = dominantN + activeN;
                        const badgeColor = dominantN > 0 ? '#C4563A' : activeN > 0 ? '#C4973A' : '#3A9E6F';
                        const badgeBg = dominantN > 0 ? '#F5EDE9' : activeN > 0 ? '#F5F0E2' : '#EAF3EE';
                        return (
                            <div style={{ background: badgeBg, border: `1.5px solid ${badgeColor}25`, borderRadius: 16, padding: '8px 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, minWidth: 60 }}>
                                <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 26, fontWeight: 800, color: badgeColor, lineHeight: 1, letterSpacing: '-0.02em' }}>{standoutN}</span>
                                <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 9, fontWeight: 700, color: badgeColor, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 2 }}>of 7 stand out</span>
                            </div>
                        );
                    })()}
                </div>

                {/* Radar chart */}
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <svg width={SVG} height={SVG} viewBox={`0 0 ${SVG} ${SVG}`}
                        overflow="visible"
                        style={{ display: 'block', width: '100%', maxWidth: SVG, overflow: 'visible' }}>

                        {/* Grid octagons */}
                        {gridLevels.map(level => (
                            <path key={level} d={octPath(level)}
                                fill="none"
                                stroke={level === 100 ? '#C8BFB5' : '#E4DED4'}
                                strokeWidth={level === 100 ? 1.2 : 0.7}
                            />
                        ))}

                        {/* Axis lines center → vertices */}
                        {factors.map((_, i) => {
                            const p = ptAt(i, 100);
                            return <line key={`ax${i}`} x1={cx} y1={cy}
                                x2={p.x} y2={p.y}
                                stroke="#E4DED4" strokeWidth="0.7" />;
                        })}

                        {/* 50% reference label */}
                        <text x={cx + 4} y={cy - R * 0.5 - 3}
                            fontFamily="Nunito, sans-serif" fontSize="8"
                            fontWeight="700" fill="#C8BFB5" textAnchor="start">50</text>

                        {/* Filled data polygon — colored by state */}
                        <path d={dataPath}
                            fill={`${st.accent}18`}
                            stroke={st.accent}
                            strokeWidth="2.5"
                            strokeLinejoin="round"
                            style={{ animation: 'radarGrow 0.9s cubic-bezier(0.34,1.56,0.64,1) forwards' }}
                        />

                        {/* Vertex dots */}
                        {factors.map((f, i) => {
                            const p = ptAt(i, displayPct(f));
                            const isAct = active === i;
                            return (
                                <g key={`v${i}`} onClick={() => handleTap(i)} style={{ cursor: 'pointer' }}>
                                    {isAct && (
                                        <circle cx={p.x} cy={p.y} r={14}
                                            fill={`${sevColor(signalScore(f))}12`}
                                            stroke={sevColor(signalScore(f))}
                                            strokeWidth="1.2"
                                        />
                                    )}
                                    <circle cx={p.x} cy={p.y} r={isAct ? 7 : 5}
                                        fill={sevColor(signalScore(f))}
                                        stroke="white" strokeWidth="2.5"
                                        style={{ transition: 'all 0.2s ease' }}
                                    />
                                </g>
                            );
                        })}

                        {/* Axis labels + percentages around perimeter */}
                        {factors.map((f, i) => {
                            const a = angleOf(i);
                            const lx = cx + LABEL_R * Math.cos(a);
                            const ly = cy + LABEL_R * Math.sin(a);
                            const cosA = Math.cos(a);
                            const anchor = cosA < -0.15 ? 'end' : cosA > 0.15 ? 'start' : 'middle';
                            const isAct = active === i;

                            return (
                                <g key={`lb${i}`} onClick={() => handleTap(i)} style={{ cursor: 'pointer' }}>
                                    <text x={lx} y={ly - 3}
                                        textAnchor={anchor}
                                        fontFamily="Space Grotesk, sans-serif"
                                        fontSize={isAct ? '11' : '10'}
                                        fontWeight={isAct ? '800' : '700'}
                                        fill={isAct ? '#1A1612' : '#6A5E56'}
                                    >{f.label}</text>
                                    <text x={lx} y={ly + 10}
                                        textAnchor={anchor}
                                        fontFamily="Space Grotesk, sans-serif"
                                        fontSize="11" fontWeight="800"
                                        fill={sevColor(signalScore(f))}
                                    >{f.pct}%</text>
                                </g>
                            );
                        })}

                        {/* Center state label */}
                        <text x={cx} y={cy + 4} textAnchor="middle"
                            fontFamily="Space Grotesk, sans-serif"
                            fontSize="10" fontWeight="700"
                            fill={st.accent} letterSpacing="0.1em">
                            {(meta.label || 'SAFE').toUpperCase()}
                        </text>
                    </svg>
                </div>

                {/* Tapped factor detail strip */}
                {af && (
                    <div style={{
                        marginTop: 12,
                        background: `${sevColor(signalScore(af))}0C`,
                        border: `1.5px solid ${sevColor(signalScore(af))}25`,
                        borderRadius: 16, padding: '14px 16px',
                        display: 'flex', alignItems: 'center', gap: 12,
                        animation: 'fadeSlideUp 0.3s ease forwards',
                    }}>
                        <div style={{
                            width: 40, height: 40, borderRadius: 12,
                            background: sevColor(signalScore(af)),
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0, boxShadow: `0 3px 10px ${sevColor(signalScore(af))}40`,
                        }}>
                            <FactorIcon type={af.iconType} size={20} color="white" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                                fontFamily: "'Space Grotesk', sans-serif",
                                fontSize: 14, fontWeight: 800, color: '#1A1612',
                            }}>
                                {af.fullLabel} <span style={{ color: sevColor(signalScore(af)) }}>{af.pct}%</span>
                            </div>
                            <div style={{
                                fontFamily: "'Nunito', sans-serif",
                                fontSize: 11, fontWeight: 700,
                                color: '#6A5E56', marginTop: 2,
                            }}>{af.desc}</div>
                        </div>
                        <div style={{
                            fontFamily: "'Space Grotesk', sans-serif",
                            fontSize: 9, fontWeight: 700,
                            color: sevColor(signalScore(af)),
                            letterSpacing: '0.08em', textTransform: 'uppercase',
                            background: `${sevColor(signalScore(af))}15`,
                            padding: '4px 10px', borderRadius: 8, flexShrink: 0,
                        }}>{sevLabel(signalScore(af))}</div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── SESSION PATTERNS ─────────────────────────────────────────────────────────
function SessionPatterns({ data }) {
    const avgDur = maybeNum(data.avgSessionDurationSec);
    const avgReels = maybeNum(data.avgReelsPerSession);
    const avgDwell = maybeNum(data.avgDwellTimeSec);
    // True idle time (now − last session end) preferred; fall back to inter-session gap
    const idleMinBase = maybeNum(data.idleSinceLastSessionMin) ?? maybeNum(data.timeSinceLastSessionMin);
    // Live-ticking idle counter: starts from payload value, increments every 60s
    const [idleMin, setIdleMin] = useState(idleMinBase);
    useEffect(() => {
        setIdleMin(idleMinBase); // reset if new payload arrives
        if (!isFiniteNumber(idleMinBase)) return;
        const ticker = setInterval(() => setIdleMin(prev => (isFiniteNumber(prev) ? prev + 1 : prev)), 60000);
        return () => clearInterval(ticker);
    }, [idleMinBase]);
    const idleColor = isFiniteNumber(idleMin)
        ? (idleMin > 120 ? '#3A9E6F' : idleMin >= 30 ? '#3A9E6F' : '#C4563A')
        : '#6A5E56';
    const idleBg = isFiniteNumber(idleMin)
        ? (idleMin > 120 ? '#EAF3EE' : idleMin >= 30 ? '#EAF3EE' : '#F5EDE9')
        : '#EEE9F5';

    // Tinted cream stat cards — matched to palette
    const tiles = [
        {
            bg: '#EAF3EE', valColor: '#3A9E6F', iconBg: '#3A9E6F', iconType: 'session',
            value: isFiniteNumber(avgDur) ? formatDurationSec(avgDur) : '--',
            label: 'Avg Duration', sub: isFiniteNumber(avgDur) ? 'per session' : null
        },
        {
            bg: '#F5EDE9', valColor: '#C4563A', iconBg: '#C4563A', iconType: 'scroll',
            value: isFiniteNumber(avgReels) ? String(Math.round(avgReels)) : '--',
            label: 'Avg Reels', sub: isFiniteNumber(avgReels) ? 'reels watched' : null
        },
        {
            bg: '#F5F0E2', valColor: '#9A7020', iconBg: '#C4973A', iconType: 'rewatch',
            value: isFiniteNumber(avgDwell) ? `${avgDwell.toFixed(1)}s` : '--',
            label: 'Focus / Reel', sub: isFiniteNumber(avgDwell) ? 'avg attention' : null
        },
        {
            bg: idleBg, valColor: idleColor, iconBg: isFiniteNumber(idleMin) ? (idleMin > 120 ? '#3A9E6F' : idleMin >= 30 ? '#3A9E6F' : '#C4563A') : '#6B3FA0', iconType: 'session',
            value: isFiniteNumber(idleMin) ? formatMin(idleMin) : '--',
            label: 'Since Last Session', sub: isFiniteNumber(idleMin) ? (idleMin < 30 ? 'recent · stay aware' : idleMin < 120 ? '✓ good break' : '✓ well rested') : null
        },
    ];

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {tiles.map((tile, i) => (
                <div key={i} style={{
                    background: tile.bg, borderRadius: 20, padding: '18px 14px',
                    border: '1.5px solid rgba(26,22,18,0.06)',
                }}>
                    <div style={{
                        width: 38, height: 38, borderRadius: 12,
                        background: tile.iconBg,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        marginBottom: 12, boxShadow: `0 3px 10px ${tile.iconBg}55`,
                    }}>
                        <FactorIcon type={tile.iconType} size={20} color="white" />
                    </div>
                    <div style={{
                        fontFamily: "'Space Grotesk', sans-serif",
                        fontSize: 28, fontWeight: 800,
                        color: tile.valColor, lineHeight: 1, letterSpacing: '-0.02em',
                    }}>{tile.value}</div>
                    <div style={{
                        fontFamily: "'Nunito', sans-serif", fontSize: 12, fontWeight: 800,
                        color: tile.valColor, opacity: 0.75,
                        letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 6,
                    }}>{tile.label}</div>
                    {tile.sub && (
                        <div style={{
                            marginTop: 8, display: 'inline-block',
                            background: `${tile.valColor}18`,
                            padding: '4px 10px', borderRadius: 8,
                            fontFamily: "'Nunito', sans-serif",
                            fontSize: 11, fontWeight: 800, color: tile.valColor,
                        }}>{tile.sub}</div>
                    )}
                </div>
            ))}
        </div>
    );
}

// ─── LIFETIME STATS ───────────────────────────────────────────────────────────
function LifetimeStats({ data }) {
    const doomPersist = maybeNum(data.sessionDoomPersistence);
    const escapeR = maybeNum(data.escapeRate);
    const pull = maybeNum(data.pullIndex);
    // stayHookedPct: prefer direct doomPersistence, fall back to pullIndex derivation
    const stayHookedPct = isFiniteNumber(doomPersist) ? Math.round(doomPersist * 100)
        : isFiniteNumber(pull) ? Math.max(0, Math.min(100, Math.round((pull / (pull + 1)) * 100)))
            : null;
    const breakFreePct = isFiniteNumber(stayHookedPct) ? 100 - stayHookedPct : null;

    const totalReels = maybeNum(data.totalReels);
    const totalSess = maybeNum(data.totalSessions);
    const totalWatchedSeconds = maybeNum(data.totalWatchedSeconds);
    const totalWatchedHours = isFiniteNumber(totalWatchedSeconds) ? (totalWatchedSeconds / 3600) : null;
    const estMovies = isFiniteNumber(totalWatchedHours) ? Math.round(totalWatchedHours / 2) : null;
    const totalTimeLabel = isFiniteNumber(totalWatchedSeconds) ? formatDurationSec(totalWatchedSeconds) : null;
    const reelsCounted = useCountUp(isFiniteNumber(totalReels) ? totalReels : 0, 600);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Habit grip */}
            <div style={{ background: '#FDFAF6', borderRadius: 20, padding: '18px 18px', border: '1.5px solid rgba(26,22,18,0.06)' }}>
                <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 10, fontWeight: 900, color: '#9A8E84', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>Habit Grip · All-time</div>
                <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 12, fontWeight: 700, color: '#9A8E84', marginBottom: 14, lineHeight: 1.5 }}>
                    Once you start doom-scrolling in a session, how often does each next reel keep you going?
                </div>
                {isFiniteNumber(stayHookedPct) ? (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 14 }}>
                            <div>
                                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 34, fontWeight: 800, color: '#C4563A', lineHeight: 1 }}>{stayHookedPct}%</div>
                                <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 11, fontWeight: 700, color: '#C4563A', opacity: 0.8, marginTop: 5, maxWidth: 120, lineHeight: 1.4 }}>of the time, the next reel pulls you deeper</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 34, fontWeight: 800, color: '#3A9E6F', lineHeight: 1 }}>{breakFreePct}%</div>
                                <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 11, fontWeight: 700, color: '#3A9E6F', opacity: 0.8, marginTop: 5, maxWidth: 120, lineHeight: 1.4, textAlign: 'right' }}>of the time, you snap out on your own</div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', height: 10, borderRadius: 999, overflow: 'hidden', background: '#E4DED4' }}>
                            <div style={{ width: `${stayHookedPct}%`, background: '#C4563A' }} />
                            <div style={{ flex: 1, background: '#3A9E6F' }} />
                        </div>
                        <div style={{ marginTop: 12, background: stayHookedPct >= 70 ? '#F5EDE9' : stayHookedPct >= 45 ? '#F5F0E2' : '#EAF3EE', borderRadius: 10, padding: '9px 13px', fontFamily: "'Nunito', sans-serif", fontSize: 12, fontWeight: 800, color: stayHookedPct >= 70 ? '#C4563A' : stayHookedPct >= 45 ? '#C4973A' : '#3A9E6F', lineHeight: 1.5 }}>
                            {stayHookedPct >= 70
                                ? `For every 10 reels you watch while hooked, ~${stayHookedPct >= 85 ? 9 : stayHookedPct >= 75 ? 8 : 7} lead to more.`
                                : stayHookedPct >= 45
                                    ? `About half the time you're in doom mode, the next reel keeps you there.`
                                    : `You're fairly good at stopping yourself mid-scroll.`}
                        </div>
                    </>
                ) : (
                    <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 13, color: '#9A8E84', fontWeight: 700 }}>Need more sessions to calculate</div>
                )}
            </div>

            {/* Lifetime consumption */}
            <div style={{ background: '#EEE9F5', borderRadius: 20, padding: '18px 18px', border: '1.5px solid rgba(107,63,160,0.08)' }}>
                <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 10, fontWeight: 900, color: '#9A8E84', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>Lifetime Consumption · Since you started</div>
                <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 12, fontWeight: 700, color: '#9A8E84', marginBottom: 14, lineHeight: 1.5 }}>
                    How much content you've consumed across all sessions ever tracked.
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, marginBottom: 10, flexWrap: 'wrap' }}>
                    <div>
                        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 36, fontWeight: 800, color: '#6B3FA0', letterSpacing: '-0.03em', lineHeight: 1 }}>
                            {isFiniteNumber(totalReels) ? reelsCounted : '--'}
                        </div>
                        <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 11, fontWeight: 700, color: '#6B3FA0', opacity: 0.65, marginTop: 5 }}>reels watched</div>
                    </div>
                    {totalTimeLabel && (
                        <div style={{ paddingBottom: 18 }}>
                            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 800, color: '#6B3FA0', opacity: 0.72, lineHeight: 1 }}>
                                {totalTimeLabel}
                            </div>
                            <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 11, fontWeight: 700, color: '#6B3FA0', opacity: 0.45, marginTop: 5 }}>total time spent</div>
                        </div>
                    )}
                    {isFiniteNumber(totalSess) && totalSess > 0 && (
                        <div style={{ paddingBottom: 18 }}>
                            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 800, color: '#6B3FA0', opacity: 0.5, lineHeight: 1 }}>{totalSess}</div>
                            <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 11, fontWeight: 700, color: '#6B3FA0', opacity: 0.4, marginTop: 5 }}>sessions</div>
                        </div>
                    )}
                </div>
                {isFiniteNumber(totalWatchedHours) && (
                    <div style={{ background: 'rgba(107,63,160,0.06)', borderRadius: 12, padding: '10px 14px' }}>
                        <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 12, fontWeight: 800, color: '#4A2580', lineHeight: 1.5 }}>
                            ≈ {totalWatchedHours.toFixed(1)} hrs of content watched
                            {isFiniteNumber(estMovies) && estMovies > 0 && ` — same as watching ${estMovies} full-length movie${estMovies !== 1 ? 's' : ''} back-to-back`}
                        </div>
                    </div>
                )}
                {!isFiniteNumber(totalWatchedHours) && (
                    <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 12, fontWeight: 700, color: '#9A8E84' }}>Need reel history to estimate time</div>
                )}
            </div>
        </div>
    );
}

// ─── MONITOR SCREEN ───────────────────────────────────────────────────────────
function MonitorScreen({ data }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 36 }}>

            <HeroBlock data={data} />
            <StatsBento data={data} />
            <AutopilotCard data={data} />
            <RingCard data={data} />

            <div style={{ padding: '0 16px' }}>
                <CollapsibleSection title="Today's Sessions" defaultOpen={true}>
                    <SessionPatterns data={data} />
                </CollapsibleSection>
            </div>

            <div style={{ padding: '0 16px' }}>
                <CollapsibleSection title="Lifetime Stats" defaultOpen={false}>
                    <LifetimeStats data={data} />
                </CollapsibleSection>
            </div>
        </div>
    );
}

export { MonitorScreen };
