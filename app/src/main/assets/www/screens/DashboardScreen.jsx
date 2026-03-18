import {
    useState, useEffect, D, FactorIcon, Label, EmptyState, CollapsibleSection, StatusPill, InsightBox,
    fadeDelayStyle, safeNum, maybeNum, isFiniteNumber, safeArr, getAccuracyMeta,
    AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
    LineChart, Line, BarChart, Bar,
    BarChart2, Radio, Zap, Lock, Cpu, TrendingDown, Moon, Activity,
} from '../shared.jsx';

// ─── mapDriverIcon ────────────────────────────────────────────────────────────
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

// ─── driverEnglish ────────────────────────────────────────────────────────────
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

    const fmtDelta = (v) => (isFiniteNumber(v) ? `${v > 0 ? '+' : ''}${v.toFixed(1)}` : '--');
    const fmtScore = (v) => (isFiniteNumber(v) ? `${v.toFixed(1)}/5` : '--');
    const moodColor = (v) => !isFiniteNumber(v) ? D.muted : v >= 0 ? '#2A7A54' : '#C4563A';

    const summary = (() => {
        if (isFiniteNumber(doomMood) && isFiniteNumber(mindfulMood)) {
            const gap = mindfulMood - doomMood;
            if (gap >= 0.6) return 'Mindful sessions are leaving you noticeably better than autopilot ones.';
            if (gap <= -0.6) return 'Recent data is unusual: autopilot sessions look better than mindful ones.';
            return 'Mood difference between session types is currently small.';
        }
        if (isFiniteNumber(doomRegret) && isFiniteNumber(mindfulRegret)) {
            const gap = doomRegret - mindfulRegret;
            if (gap >= 0.6) return 'Autopilot sessions carry higher regret than mindful sessions.';
            if (gap <= -0.6) return 'Regret is currently higher in mindful sessions than autopilot sessions.';
            return 'Regret difference between session types is currently small.';
        }
        return 'More post-session check-ins will sharpen this comparison.';
    })();

    return (
        <div className="card fade-card" style={{ ...fadeDelayStyle(0.05), padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Label style={{ color: D.ink }}>Mood Dissonance</Label>
                <span style={{ fontSize: 10, fontWeight: 800, color: D.muted }}>
                    {isFiniteNumber(totalSurveyed) ? `${Math.round(totalSurveyed)} check-ins` : 'survey sample'}
                </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div style={{ background: '#F5EDE9', borderRadius: 12, padding: '10px 10px 8px' }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: '#A03A25', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Autopilot</div>
                    <div style={{ marginTop: 6, fontSize: 18, fontWeight: 800, color: moodColor(doomMood), fontFamily: 'Space Grotesk' }}>{fmtDelta(doomMood)}</div>
                    <div style={{ marginTop: 2, fontSize: 11, color: D.muted }}>avg mood change</div>
                    <div style={{ marginTop: 6, fontSize: 12, fontWeight: 700, color: '#A03A25' }}>Regret {fmtScore(doomRegret)}</div>
                </div>

                <div style={{ background: '#EAF3EE', borderRadius: 12, padding: '10px 10px 8px' }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: '#2A7A54', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Mindful</div>
                    <div style={{ marginTop: 6, fontSize: 18, fontWeight: 800, color: moodColor(mindfulMood), fontFamily: 'Space Grotesk' }}>{fmtDelta(mindfulMood)}</div>
                    <div style={{ marginTop: 2, fontSize: 11, color: D.muted }}>avg mood change</div>
                    <div style={{ marginTop: 6, fontSize: 12, fontWeight: 700, color: '#2A7A54' }}>Regret {fmtScore(mindfulRegret)}</div>
                </div>
            </div>

            <div style={{ marginTop: 10, fontSize: 12, color: D.ink2, lineHeight: 1.45 }}>
                {summary}
            </div>
        </div>
    );
}

// ─── DashboardToday ───────────────────────────────────────────────────────────
function DashboardToday({ data }) {
    const drivers = safeArr(data.doomDrivers);
    const sortedDrivers = [...drivers].sort((a, b) => safeNum(b.contribution, 0) - safeNum(a.contribution, 0));
    const topThree = sortedDrivers.slice(0, 3);

    const timeline = safeArr(data.todaySessions);
    const [selectedTimelineIdx, setSelectedTimelineIdx] = useState(null);
    const [expandedFactors, setExpandedFactors] = useState({});
    // Tracks in-place survey overrides after a retroactive label is submitted.
    // Key = sessionNum (string), value = label field object.
    const [retroactiveOverrides, setRetroactiveOverrides] = useState({});

    useEffect(() => {
        // Registered by DashboardActivity.drainPendingRetroactiveLabel() / MainActivity.
        // The payload is a Base64-encoded JSON string from RetroactiveSurveyActivity.
        window.onRetroactiveLabelComplete = (b64) => {
            try {
                const label = JSON.parse(atob(b64));
                const key = String(label.sessionNum);
                const date = String(label.date || "");
                // Persist a window-scoped cache so that even if the native
                // dashboard payload is briefly stale, the UI will continue to
                // show the retroactive survey metrics instead of reverting.
                try {
                    const cacheKey = `${key}|${date}`;
                    window.__retroactiveLabelCache = window.__retroactiveLabelCache || {};
                    window.__retroactiveLabelCache[cacheKey] = {
                        postSessionRating:  label.postSessionRating ?? 0,
                        regretScore:        label.regretScore ?? 0,
                        moodAfter:          label.moodAfter ?? 0,
                        moodBefore:         label.moodBefore ?? 0,
                        intendedAction:     label.intendedAction ?? "",
                        comparativeRating:  label.comparativeRating ?? 0,
                        delayedRegretScore: label.delayedRegretScore ?? 0,
                        hasSurvey:          true,
                        retroactiveLabel:   true,
                    };
                } catch (cacheErr) {
                    console.warn('retroactive label cache update failed:', cacheErr);
                }
                setRetroactiveOverrides((prev) => ({ ...prev, [key]: label }));
            } catch (e) {
                console.error('onRetroactiveLabelComplete parse error:', e);
            }
        };
        return () => { window.onRetroactiveLabelComplete = undefined; };
    }, []);

    const circadian = safeArr(data.circadianProfile);
    const circData = circadian;

    const factorConfig = {
        'Session Length':     { color: D.yellow,   gradient: 'linear-gradient(135deg,#C4973A,#9A7020)', iconType: 'session' },
        'Rewatch Compulsion': { color: D.pink,     gradient: 'linear-gradient(135deg,#C4563A,#A03030)', iconType: 'rewatch' },
        'Rapid Re-entry':     { color: D.coral,    gradient: 'linear-gradient(135deg,#C4563A,#A03A25)', iconType: 'reentry' },
        'Scroll Automaticity':{ color: D.blue,     gradient: 'linear-gradient(135deg,#6B3FA0,#4A2580)', iconType: 'scroll' },
        'Dwell Collapse':     { color: D.sage,     gradient: 'linear-gradient(135deg,#3A9E6F,#2A7A54)', iconType: 'dwell' },
        'Exit Conflict':      { color: D.lavender, gradient: 'linear-gradient(135deg,#9B6FCC,#6B3FA0)', iconType: 'exit' },
        'Environment':        { color: D.peach,    gradient: 'linear-gradient(135deg,#C4973A,#9A7020)', iconType: 'environment' },
        'Cumulative':         { color: D.teal,     gradient: 'linear-gradient(135deg,#3A9E6F,#2A7A54)', iconType: 'cumulative' }
    };

    const getFactorStyle = (name) => {
        const normalized = name.trim();
        return factorConfig[normalized] || { color: D.purple, gradient: `linear-gradient(135deg, ${D.purple}, ${D.purpleDark})`, iconType: 'default' };
    };

    const toggleFactor = (idx) => {
        setExpandedFactors(prev => ({ ...prev, [idx]: !prev[idx] }));
    };

    const [showAll, setShowAll] = useState(false);
    const displayedDrivers = showAll ? sortedDrivers : topThree;
    const hiddenCount = sortedDrivers.length - topThree.length;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="card fade-card" style={{ ...fadeDelayStyle(0), padding: 14 }}>
                <div style={{ marginBottom: 10 }}>
                    <Label style={{ color: D.ink }}>Today's Session Timeline</Label>
                </div>
                {!timeline.length ? (
                    <EmptyState message="No sessions recorded yet today" />
                ) : (
                    <>
                        {(() => {
                            const cols = Math.min(Math.max(4, Math.ceil(timeline.length / 2)), 5);
                            const rows = Math.ceil(timeline.length / cols);
                            const cellW = 100 / cols; // percentage per column
                            const cellH = 76;         // fixed grid row height in px
                            const gap = 8;            // grid row gap in px
                            const step = cellH + gap;  // actual Y distance between row tops
                            const dotOff = 10;         // dot center offset from cell top
                            const svgH = rows * cellH + (rows - 1) * gap; // total grid height

                            // Boustrophedon positions: x in 0-100 %, y in px
                            const pts = timeline.map((_, idx) => {
                                const row = Math.floor(idx / cols);
                                const colInRow = idx % cols;
                                const col = row % 2 === 1 ? (cols - 1 - colInRow) : colInRow;
                                return { row, col, x: (col + 0.5) * cellW, y: row * step + dotOff };
                            });

                            // Build SVG path
                            let pathD = '';
                            if (pts.length > 0) {
                                pathD = `M ${pts[0].x} ${pts[0].y}`;
                                for (let i = 1; i < pts.length; i++) {
                                    const prev = pts[i - 1];
                                    const curr = pts[i];
                                    if (prev.row === curr.row) {
                                        pathD += ` L ${curr.x} ${curr.y}`;
                                    } else {
                                        // U-turn: loop out past the edge dot, curve down to next row
                                        const edgeRight = prev.x > 50;
                                        const loopX = edgeRight ? 108 : -8; // extend past 0-100 range
                                        const midY = (prev.y + curr.y) / 2;
                                        pathD += ` C ${loopX} ${midY}, ${loopX} ${midY}, ${curr.x} ${curr.y}`;
                                    }
                                }
                            }

                            return (
                                <div style={{ position: 'relative', paddingTop: 8, minHeight: svgH }}>
                                    {/* Thread SVG: viewBox x=0-100 maps to 0%-100% width, y in pixels */}
                                    <svg style={{ position: 'absolute', top: 8, left: 0, width: '100%', height: svgH, pointerEvents: 'none', zIndex: 0, overflow: 'visible' }} viewBox={`0 0 100 ${svgH}`} preserveAspectRatio="none">
                                        <path d={pathD} fill="none" stroke={D.muted} strokeWidth="2" opacity="0.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                                    </svg>

                                    {/* Session dots in boustrophedon grid */}
                                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gridAutoRows: cellH, rowGap: gap }}>
                                        {(() => {
                                            // Create a flat grid with empty cells to place items in boustrophedon order
                                            const grid = Array.from({ length: rows * cols }, () => null);
                                            timeline.forEach((s, idx) => {
                                                const row = Math.floor(idx / cols);
                                                const colInRow = idx % cols;
                                                const isReversed = row % 2 === 1;
                                                const col = isReversed ? (cols - 1 - colInRow) : colInRow;
                                                grid[row * cols + col] = { s, idx };
                                            });
                                            return grid.map((cell, gi) => {
                                                if (!cell) return <div key={`empty-${gi}`} />;
                                                const { s, idx } = cell;
                                                const c = s.isDoom ? D.danger : D.safe;
                                                const durationMin = maybeNum(s.durationMin);
                                                const isSelected = selectedTimelineIdx === idx;
                                                return (
                                                    <div
                                                        key={`${s.startTime}-${idx}`}
                                                        onClick={() => setSelectedTimelineIdx(isSelected ? null : idx)}
                                                        style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, cursor: "pointer", position: 'relative', paddingBottom: 4, zIndex: 1 }}
                                                    >
                                                        <div style={{ 
                                                            width: isSelected ? 24 : 20, 
                                                            height: isSelected ? 24 : 20, 
                                                            borderRadius: "50%", 
                                                            background: c, 
                                                            boxShadow: `0 0 ${isSelected ? 18 : 12}px ${c}, 0 0 ${isSelected ? 6 : 3}px ${c}`,
                                                            border: isSelected ? `3px solid white` : `2px solid ${c}40`,
                                                            transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)', 
                                                            zIndex: 1, 
                                                            position: 'relative' 
                                                        }} />
                                                        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 11, fontWeight: 700, color: D.ink }}>{(s.startTime || "").slice(0, 5) || `S${idx + 1}`}</div>
                                                        <div style={{ background: `${c}25`, borderRadius: 6, padding: '2px 6px', fontFamily: "'Nunito', sans-serif", fontSize: 10, fontWeight: 800, color: c }}>
                                                            {isFiniteNumber(durationMin) ? `${Math.round(durationMin)}m` : "--"}
                                                        </div>
                                                    </div>
                                                );
                                            });
                                        })()}
                                    </div>
                                </div>
                            );
                        })()}
                        {selectedTimelineIdx !== null && timeline[selectedTimelineIdx] && (() => {
                            const rawSel = timeline[selectedTimelineIdx];
                            // Apply any retroactive label that was submitted this session
                            const override = retroactiveOverrides[String(rawSel._sessionNum)] ?? null;
                            const sel = override ? { ...rawSel, ...override } : rawSel;
                            // Combine backend flag with the presence of at least one
                            // core survey metric. This prevents stale or legacy
                            // hasSurvey=true values (with all-zero fields) from
                            // hiding the retroactive survey option.
                            const hasCoreSurveyMetric =
                                (maybeNum(sel.postSessionRating) > 0) ||
                                (maybeNum(sel.regretScore) > 0) ||
                                (maybeNum(sel.moodAfter) > 0) ||
                                (maybeNum(sel.comparativeRating) > 0);
                            const hasSurvey = sel.hasSurvey === true && hasCoreSurveyMetric;
                            return (
                                <div style={{ marginTop: 10 }}>
                                    <div style={{ fontSize: 12, color: D.muted }}>
                                        {(sel.startTime || "--:--").slice(0, 5)} · {isFiniteNumber(maybeNum(sel.durationMin)) ? `${Math.round(sel.durationMin)} min` : "duration unavailable"} · {isFiniteNumber(maybeNum(sel.reelCount)) ? `${Math.round(sel.reelCount)} reels` : "reel count unavailable"}
                                    </div>
                                    {hasSurvey && (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                                            {maybeNum(sel.postSessionRating) > 0 && (
                                                <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 8, background: '#EEE9F5', color: '#6B3FA0' }}>
                                                    Rating {sel.postSessionRating}/5
                                                </span>
                                            )}
                                            {maybeNum(sel.regretScore) > 0 && (
                                                <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 8, background: sel.regretScore >= 4 ? '#F5EDE9' : '#EAF3EE', color: sel.regretScore >= 4 ? '#C4563A' : '#2A7A54' }}>
                                                    Regret {sel.regretScore}/5
                                                </span>
                                            )}
                                            {maybeNum(sel.moodAfter) > 0 && (
                                                <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 8, background: '#EEE9F5', color: '#6B3FA0' }}>
                                                    Mood {sel.moodAfter}/5
                                                </span>
                                            )}
                                            {maybeNum(sel.comparativeRating) > 0 && (
                                                <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 8, background: '#F5F0E2', color: '#9A7020' }}>
                                                    Experience {sel.comparativeRating}/5
                                                </span>
                                            )}
                                            {sel.intendedAction && sel.intendedAction !== "0" && sel.intendedAction !== "0.0" && (
                                                <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 8, background: '#F5F0E2', color: '#9A7020' }}>
                                                    Intent: {sel.intendedAction}
                                                </span>
                                            )}
                                            {sel.retroactiveLabel && (
                                                <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 8, background: '#F0EBF8', color: '#6B3FA0', opacity: 0.75 }}>
                                                    ✎ retroactive
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    {!hasSurvey && (
                                        <div style={{ marginTop: 6 }}>
                                            {sel.isDoom !== undefined && (
                                                <div style={{ fontSize: 10, color: D.muted, opacity: 0.7, marginBottom: 5 }}>
                                                    Reelio said: <strong style={{ color: sel.isDoom ? D.danger : D.safe }}>
                                                        {sel.isDoom ? 'Autopilot' : 'Mindful'}
                                                    </strong>
                                                    {sel.modelConf < 0.70 && (
                                                    <span style={{ marginLeft: 6, fontSize: 9, background: `${D.warn}15`, color: D.warn, padding: '1px 5px', borderRadius: 4, fontWeight: 800 }}>
                                                        HEURISTIC BLEND ({(sel.modelConf * 100).toFixed(0)}% CONF)
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                        {sel.modelConf < 0.70 && (
                                            <div style={{ marginTop: 6, fontSize: 10, color: D.muted, lineHeight: 1.4, padding: '8px 10px', background: `${D.warn}05`, borderRadius: 10, border: `1px solid ${D.warn}15` }}>
                                                <div style={{ color: D.warn, fontWeight: 900, marginBottom: 2 }}>⚠️ Behavioral Calibration Active</div>
                                                Current model confidence is low ({(sel.modelConf * 100).toFixed(0)}%). Reelio is blending HMM state inference with heuristic scoring ({Math.round(sel.heuristicScore * 100)}%) to ensure capture events are not missed during learning.
                                            </div>
                                        )}

                                            {hasSurvey && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                                                    <div style={{ padding: '4px 10px', background: 'rgba(58,158,111,0.1)', border: '1px solid rgba(58,158,111,0.2)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3A9E6F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                            <polyline points="20 6 9 17 4 12" />
                                                        </svg>
                                                        <span style={{ fontSize: 10, fontWeight: 900, color: '#3A9E6F', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                                                            {sel.retroactiveLabel ? "Retroactively Labeled" : "Surveyed"}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}

                                            {sel._sessionNum != null && sel._sessionDate && !hasSurvey && (
                                                <button
                                                    onClick={() => {
                                                        const predSummary = sel.isDoom !== undefined
                                                            ? `Reelio said: ${sel.isDoom ? 'Autopilot' : 'Mindful'}`
                                                            : '';
                                                        const prefill = JSON.stringify({
                                                            postSessionRating: sel.postSessionRating || 0,
                                                            regretScore:       sel.regretScore       || 0,
                                                            moodBefore:        sel.moodBefore         || 0,
                                                            moodAfter:         sel.moodAfter          || 0,
                                                            intendedAction:    sel.intendedAction      || '',
                                                            comparativeRating: sel.comparativeRating  || 0,
                                                            _rawSessionNum:    sel._rawSessionNum,
                                                            _rawStartTime:     sel._rawStartTime
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
                                                                // Provide immediate visual feedback that the call was made
                                                                console.log("[Bridge] Call to native openRetroactiveSurvey succeeded.");
                                                            } else {
                                                                console.warn("[Bridge] window.Android.openRetroactiveSurvey not found");
                                                                alert("Native bridge (window.Android) is not available. This feature only works inside the app.");
                                                            }
                                                        } catch (err) {
                                                            console.error("[Bridge] Native call failed", err);
                                                            alert("System error launching survey: " + err.message);
                                                        }
                                                    }}
                                                    style={{
                                                        display: 'inline-flex', alignItems: 'center', gap: 5,
                                                        fontSize: 11, fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif",
                                                        color: D.purple, background: 'rgba(107,63,160,0.10)',
                                                        border: '1.5px solid rgba(107,63,160,0.18)',
                                                        borderRadius: 10, padding: '6px 12px',
                                                        cursor: 'pointer', letterSpacing: '0.02em'
                                                    }}
                                                >
                                                    ✎ Label this session
                                                </button>
                                            )}
                                            {(sel._sessionNum == null || !sel._sessionDate) && (
                                                <div style={{ fontSize: 10, color: D.muted, opacity: 0.6 }}>No survey data</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                    </>
                )}
            </div>

            <MoodDissonanceCard data={data} />
        </div>
    );
}

// ─── DashboardWeek ────────────────────────────────────────────────────────────
function DashboardWeek({ data }) {
    const heatmap = safeArr(data.heatmapData);
    const heat = heatmap.filter((d) => isFiniteNumber(maybeNum(d.avgCapture)));
    const [selectedDay, setSelectedDay] = useState(null);

    const thisWeekRate = maybeNum(data.thisWindowDoomRate);
    const lastWeekRate = maybeNum(data.lastWindowDoomRate);
    const delta = (isFiniteNumber(thisWeekRate) && isFiniteNumber(lastWeekRate)) ? thisWeekRate - lastWeekRate : null;

    const baselineScore = maybeNum(data.tenSessionAvgScore);
    const underAvgDays = isFiniteNumber(baselineScore)
        ? heat.filter((d) => safeNum(d.avgCapture, 0) < baselineScore / 100).length
        : null;

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

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {weeklyTrendData.length > 0 && (
                <div className="card fade-card" style={{
                    ...fadeDelayStyle(0),
                    padding: '18px 16px',
                    background: 'linear-gradient(135deg, rgba(107,63,160,0.05), rgba(74,37,128,0.05))',
                    borderColor: 'rgba(107,63,160,0.12)'
                }}>
                    <div style={{ marginBottom: 14 }}>
                        <Label style={{ color: D.purple, fontSize: 11, fontWeight: 800 }}>Weekly Snapshot</Label>
                        <div style={{ color: D.ink, fontSize: 14, fontWeight: 800, marginTop: 4, fontFamily: 'Nunito' }}>Your focus trend</div>
                    </div>
                    <div style={{ height: 150 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={weeklyTrendData} margin={{ top: 12, right: 12, left: 8, bottom: 8 }}>
                                <XAxis dataKey="day" tick={{ fill: D.muted, fontSize: 10 }} />
                                <YAxis 
                                    tick={{ fill: D.muted, fontSize: 10 }} 
                                    domain={[0, 100]} 
                                    width={44}
                                    label={{ value: 'Autopilot (%)', angle: -90, position: 'insideLeft', offset: 4, fontSize: 10, fill: D.muted }}
                                />
                                <Tooltip 
                                    contentStyle={{ background: D.cardLight, border: `1px solid ${D.borderSoft}`, borderRadius: 10, fontSize: 12, color: D.ink, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                                    formatter={(v) => [`${v}%`, 'Autopilot']}
                                    labelStyle={{ color: D.muted, fontWeight: 700 }}
                                />
                                <Line type="monotone" dataKey="score" stroke={D.purple} strokeWidth={2.5} dot={{ fill: D.purple, r: 4, stroke: D.cardLight, strokeWidth: 2 }} activeDot={{ r: 6, fill: D.purple, stroke: D.cardLight, strokeWidth: 2 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                    <div style={{ marginTop: 8, padding: '10px 12px', background: 'rgba(107,63,160,0.06)', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: 12, color: D.ink2, fontWeight: 600 }}>Avg this week</div>
                        <div style={{ fontSize: 16, fontWeight: 900, color: D.purple, fontFamily: 'Nunito' }}>
                            {Math.round(weeklyTrendData.reduce((sum, d) => sum + d.score, 0) / weeklyTrendData.length)}%
                        </div>
                    </div>
                </div>
            )}

            <div className="card fade-card" style={{ ...fadeDelayStyle(0), padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <Label style={{ color: D.ink }}>Weekly Heatmap</Label>
                    {heat.length ? (
                        <StatusPill
                            label={isFiniteNumber(underAvgDays) ? `${underAvgDays} days under your average` : "Weekly baseline unavailable"}
                            type={isFiniteNumber(underAvgDays) && underAvgDays > 0 ? "safe" : "info"}
                        />
                    ) : null}
                </div>
                {!heat.length ? (
                    <EmptyState message="Not enough weekly data yet" />
                ) : (
                    <>
                        <div style={{ height: 180 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                {(() => {
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
                                    const avgVal = heatData.length > 0 
                                        ? Math.round(heatData.reduce((sum, d) => sum + d.value, 0) / heatData.length) 
                                        : 0;
                                    
                                    const getBarColor = (val) => {
                                        if (val < 33) return "#2A7A54"; // Green (safe)
                                        if (val < 66) return "#D4A574"; // Amber (borderline)
                                        return "#C4563A"; // Red (risk)
                                    };

                                    return (
                                        <BarChart data={heatData} margin={{ top: 12, right: 8, left: -8, bottom: 32 }}>
                                            <XAxis dataKey="day" tick={{ fill: D.muted, fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                                            <YAxis 
                                                tick={{ fill: D.muted, fontSize: 10 }} 
                                                label={{ value: "Autopilot Rate (%)", angle: -90, position: "insideLeft", offset: -12, fontSize: 10, fill: D.muted }}
                                                domain={[0, 100]}
                                            />
                                            <Tooltip
                                                contentStyle={{ background: D.cardLight, border: `1px solid ${D.borderSoft}`, borderRadius: 10, fontSize: 12, color: D.ink, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                                                formatter={(v, name, props) => {
                                                    const sessions = props.payload.sessions;
                                                    return [`${v}% autopilot - ${isFiniteNumber(sessions) ? sessions + ' session' + (sessions !== 1 ? 's' : '') : 'N/A'}`, 'Risk'];
                                                }}
                                                labelStyle={{ color: D.muted, fontWeight: 700 }}
                                                labelFormatter={(label, payload) => {
                                                    const first = safeArr(payload)[0]?.payload;
                                                    return first?.dateLabel ? `${label} · ${first.dateLabel}` : label;
                                                }}
                                            />
                                            <ReferenceLine 
                                                y={avgVal} 
                                                stroke={D.info} 
                                                strokeDasharray="5 5" 
                                                label={{ value: `Weekly Avg: ${avgVal}%`, position: "right", fill: D.muted, fontSize: 9, offset: 4 }} 
                                            />
                                            <Bar 
                                                dataKey="value" 
                                                onClick={(entry) => setSelectedDay(entry && entry.payload ? entry.payload : null)}
                                                shape={({ x, y, width, height, value }) => (
                                                    <rect
                                                        x={x}
                                                        y={y}
                                                        width={width}
                                                        height={height}
                                                        fill={getBarColor(value)}
                                                    />
                                                )}
                                            />
                                        </BarChart>
                                    );
                                })()}
                            </ResponsiveContainer>
                        </div>
                        {selectedDay && (
                            <div style={{ marginTop: 12, padding: "8px 10px", background: "rgba(107,63,160,0.08)", borderLeft: `3px solid ${D.info}`, color: D.muted, fontSize: 12, borderRadius: 4 }}>
                                <strong>{selectedDay.day}{selectedDay.dateLabel ? ` · ${selectedDay.dateLabel}` : ""}:</strong> {Math.round(selectedDay.raw)}% autopilot · {isFiniteNumber(maybeNum(selectedDay.sessions)) ? selectedDay.sessions + " session" + (selectedDay.sessions !== 1 ? "s" : "") : "N/A"}
                            </div>
                        )}
                    </>
                )}
            </div>

            <div className="card fade-card" style={{ ...fadeDelayStyle(1), padding: 14 }}>
                <div style={{ marginBottom: 8 }}><Label style={{ color: D.ink }}>Weekly Insight</Label></div>
                {!heat.length ? (
                    <EmptyState message="Need more sessions to compare this week vs last week" />
                ) : (
                    <>
                        <div style={{ fontSize: 13, color: D.text, marginBottom: 10 }}>{confidenceText}</div>
                        <div style={{ fontSize: 13, color: D.muted }}>
                            This week: {isFiniteNumber(thisWeekRate) ? `${Math.round(thisWeekRate * 100)}%` : "--"} autopilot  |  Last week: {isFiniteNumber(lastWeekRate) ? `${Math.round(lastWeekRate * 100)}%` : "--"}  |  {isFiniteNumber(delta) ? (delta < 0 ? "↓ better" : delta > 0 ? "↑ worse" : "stable") : "comparison unavailable"}
                        </div>
                    </>
                )}
            </div>


        </div>
    );
}

// ─── DashboardAllTime ─────────────────────────────────────────────────────────
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

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="card fade-card" style={{ ...fadeDelayStyle(0), padding: 14 }}>
                <div style={{ marginBottom: 8 }}><Label style={{ color: D.ink }}>Behavioral Baseline</Label></div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {[
                        { title: "Autopilot Rate (All Sessions)", value: isFiniteNumber(allTimeCaptureRate) ? `${Math.round(allTimeCaptureRate * 100)}%` : "--", desc: "Share of all sessions that entered autopilot" },
                        { title: "Back-to-Back Autopilot Rate", value: isFiniteNumber(sessionDoomPersistence) ? `${Math.round(sessionDoomPersistence * 100)}%` : "--", desc: "How often autopilot sessions cluster" },
                        { title: "Self-Recovery Rate", value: isFiniteNumber(escapeRate) ? `${Math.round(escapeRate * 100)}%` : "--", desc: "How often you return to mindful browsing" },
                        { title: "Trap Pressure Ratio", value: isFiniteNumber(pullIndex) ? `${pullIndex.toFixed(1)}x` : "--", desc: "Trap pressure relative to recovery pressure" }
                    ].map((m) => (
                        <div key={m.title} style={{ border: `1px solid ${D.borderSoft}`, borderRadius: 10, padding: 10 }}>
                            <div style={{ fontSize: 12, color: D.muted }}>{m.title}</div>
                            <div className="spacemono" style={{ fontSize: 22, color: D.ink, marginTop: 4, fontWeight: 700 }}>{m.value}</div>
                            <div style={{ marginTop: 4, fontSize: 11, color: D.muted }}>{m.desc}</div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="card fade-card" style={{ ...fadeDelayStyle(1), padding: 14 }}>
                <div style={{ marginBottom: 8 }}><Label style={{ color: D.ink }}>Your Historical Vulnerability Pattern</Label></div>
                <div style={{ fontSize: 11, color: D.muted, marginBottom: 10 }}>Across all sessions you've recorded</div>
                {safeArr(data.circadianProfile).length < 3 ? (
                    <EmptyState message="Need at least 3 sessions to reveal your risk pattern" />
                ) : (
                    (() => {
                        const [circSmooth, setCircSmooth] = useState(0);
                        const circProfile = safeArr(data.circadianProfile);
                        const fmtHour = (h) => {
                            const hr = ((h % 24) + 24) % 24;
                            if (hr === 0) return '12 AM';
                            if (hr === 12) return '12 PM';
                            return hr < 12 ? `${hr} AM` : `${hr - 12} PM`;
                        };
                        const circRaw = circProfile.map((p) => ({
                            h: p.hour,
                            p: safeNum(p.captureProb, 0),
                            label: fmtHour(p.hour)
                        }));
                        
                        const smoothCirc = (data, win) => {
                            if (win <= 1) return data;
                            return data.map((pt, idx) => {
                                const half = Math.floor(win / 2);
                                let sum = 0, count = 0;
                                for (let j = idx - half; j <= idx + half; j++) {
                                    const k = ((j % data.length) + data.length) % data.length;
                                    sum += data[k].p; count++;
                                }
                                return { ...pt, p: sum / count };
                            });
                        };
                        
                        const circWin = circSmooth === 0 ? 1 : circSmooth === 1 ? 2 : 3;
                        const circData = smoothCirc(circRaw, circWin);
                        
                        const peakPt = circProfile.reduce((best, c) => (!best || c.captureProb > best.captureProb ? c : best), null);
                        const safePt = circProfile.reduce((best, c) => (!best || c.captureProb < best.captureProb ? c : best), null);
                        
                        const formatHr = (hour) => {
                            const h = ((hour % 24) + 24) % 24;
                            if (h === 0) return '12 AM';
                            if (h === 12) return '12 PM';
                            return h < 12 ? `${h} AM` : `${h - 12} PM`;
                        };

                        return (
                            <>
                                <div style={{ height: 200 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={circData} margin={{ top: 8, right: 12, left: 8, bottom: 8 }}>
                                            <XAxis dataKey="label" tick={{ fill: D.muted, fontSize: 10 }} />
                                            <YAxis 
                                                label={{ value: 'Autopilot Risk (%)', angle: -90, position: 'insideLeft', offset: 4, style: { fontSize: 10, fill: D.muted } }} 
                                                tick={{ fill: D.muted, fontSize: 10 }} 
                                                width={44}
                                            />
                                            <Tooltip 
                                                contentStyle={{ background: D.cardLight, border: `1px solid ${D.borderSoft}`, borderRadius: 10, fontSize: 12, color: D.ink, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }} 
                                                formatter={(v) => [`${Math.round(v * 100)}% autopilot risk`, 'Risk']} 
                                                labelStyle={{ color: D.muted, fontWeight: 700 }}
                                            />
                                            <Line type="monotone" dataKey="p" stroke={D.info} strokeWidth={2.5} dot={{ fill: D.info, r: 3 }} activeDot={{ r: 5, stroke: D.cardLight, strokeWidth: 2 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6, padding: '6px 0' }}>
                                    <span style={{ fontSize: 11, color: D.muted, flexShrink: 0 }}>Smoothing</span>
                                    <input 
                                        type="range" min="0" max="2" step="1" 
                                        value={circSmooth} 
                                        onChange={(e) => setCircSmooth(parseInt(e.target.value))}
                                        style={{ flex: 1 }}
                                    />
                                    <span style={{ fontSize: 11, color: D.muted, flexShrink: 0, minWidth: 40, textAlign: 'right' }}>
                                        {['Raw', 'Smooth', 'Extra'][circSmooth]}
                                    </span>
                                </div>
                                {peakPt && safePt && (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
                                        <div style={{ position: 'relative', border: `1px solid rgba(58,158,111,0.25)`, borderRadius: 14, padding: '14px 12px 12px', overflow: 'hidden', background: 'rgba(58,158,111,0.03)' }}>
                                            <div style={{ position: 'absolute', top: 8, right: 8, width: 36, height: 36 }}>
                                                <svg viewBox="0 0 36 36" width="36" height="36">
                                                    <path d="M18 4 C18 4 6 14 10 24 C12 28 16 30 18 32 C20 30 24 28 26 24 C30 14 18 4 18 4Z" fill="#2A7A54" opacity="0.3" />
                                                    <path d="M18 4 C18 4 6 14 10 24 C12 28 16 30 18 32 C20 30 24 28 26 24 C30 14 18 4 18 4Z" fill="none" stroke="#2A7A54" strokeWidth="1.5" opacity="0.7" />
                                                    <path d="M18 12 L18 26" stroke="#2A7A54" strokeWidth="1" opacity="0.5" />
                                                    <path d="M14 18 Q18 16 22 18" stroke="#2A7A54" strokeWidth="0.8" opacity="0.4" fill="none" />
                                                    <path d="M15 22 Q18 20 21 22" stroke="#2A7A54" strokeWidth="0.8" opacity="0.4" fill="none" />
                                                </svg>
                                            </div>
                                            <div style={{ fontSize: 10, fontWeight: 700, color: D.safe, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Safest Window</div>
                                            <div className="spacemono" style={{ fontSize: 20, fontWeight: 800, color: D.ink }}>{formatHr(safePt.hour)}</div>
                                            <div style={{ fontSize: 11, color: D.muted, marginTop: 4 }}>{Math.round(safePt.captureProb * 100)}% risk</div>
                                        </div>
                                        <div style={{ position: 'relative', border: `1px solid rgba(196,86,58,0.25)`, borderRadius: 14, padding: '14px 12px 12px', overflow: 'hidden', background: 'rgba(196,86,58,0.03)' }}>
                                            <div style={{ position: 'absolute', top: 8, right: 8, width: 36, height: 36 }}>
                                                <svg viewBox="0 0 36 36" width="36" height="36">
                                                    <path d="M18 4 C18 4 6 14 10 24 C12 28 16 30 18 32 C20 30 24 28 26 24 C30 14 18 4 18 4Z" fill="#C4563A" opacity="0.3" />
                                                    <path d="M18 4 C18 4 6 14 10 24 C12 28 16 30 18 32 C20 30 24 28 26 24 C30 14 18 4 18 4Z" fill="none" stroke="#C4563A" strokeWidth="1.5" opacity="0.7" />
                                                    <path d="M18 12 L18 26" stroke="#C4563A" strokeWidth="1" opacity="0.5" />
                                                    <path d="M14 18 Q18 16 22 18" stroke="#C4563A" strokeWidth="0.8" opacity="0.4" fill="none" />
                                                    <path d="M15 22 Q18 20 21 22" stroke="#C4563A" strokeWidth="0.8" opacity="0.4" fill="none" />
                                                </svg>
                                            </div>
                                            <div style={{ fontSize: 10, fontWeight: 700, color: D.danger, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Riskiest Window</div>
                                            <div className="spacemono" style={{ fontSize: 20, fontWeight: 800, color: D.ink }}>{formatHr(peakPt.hour)}</div>
                                            <div style={{ fontSize: 11, color: D.muted, marginTop: 4 }}>{Math.round(peakPt.captureProb * 100)}% risk</div>
                                        </div>
                                    </div>
                                )}
                            </>
                        );
                    })()
                )}
            </div>

            <CollapsibleSection title="State Dynamics" defaultOpen={false}>
                {(() => {
                    const c2d = maybeNum(data.stateDynamics?.casualToDoomProb);
                    const d2c = maybeNum(data.stateDynamics?.doomToCasualProb);
                    const clampProb = (p) => isFiniteNumber(p) ? Math.max(0, Math.min(1, p)) : 0;
                    const c2dProb = clampProb(c2d);
                    const d2cProb = clampProb(d2c);
                    const c2cProb = isFiniteNumber(c2d) ? clampProb(1 - c2d) : 0;
                    const d2dProb = isFiniteNumber(d2c) ? clampProb(1 - d2c) : 0;
                    const c2dPct = isFiniteNumber(c2d) ? `${Math.round(c2d * 100)}%` : '--';
                    const d2cPct = isFiniteNumber(d2c) ? `${Math.round(d2c * 100)}%` : '--';
                    const c2cPct = isFiniteNumber(c2d) ? `${Math.round((1 - c2d) * 100)}%` : '--';
                    const d2dPct = isFiniteNumber(d2c) ? `${Math.round((1 - d2c) * 100)}%` : '--';
                    const flowDuration = (p, slow = 4.8, fast = 2.1) => `${(slow - ((slow - fast) * p)).toFixed(2)}s`;
                    const laneWidth = (p, min = 2.5, max = 6) => (min + (max - min) * p).toFixed(2);
                    const laneOpacity = (p, min = 0.22, max = 0.88) => (min + (max - min) * p).toFixed(2);
                    const nodeHalo = (p) => (0.12 + (0.18 * p)).toFixed(2);
                    return (
                <div style={{ marginBottom: 8 }}>
                    <style>{`
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
                    `}</style>
                    <svg width="100%" viewBox="0 0 320 160">
                        <defs>
                            <filter id="laneGlow" x="-50%" y="-50%" width="200%" height="200%">
                                <feGaussianBlur stdDeviation="3.2" result="blur" />
                                <feMerge>
                                    <feMergeNode in="blur" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                        </defs>
                        {/* Self-loop: Mindful → Mindful */}
                        <path d="M 56 36 C 34 14 106 14 84 36" fill="none" stroke={D.safe} strokeOpacity={laneOpacity(c2cProb, 0.18, 0.45)} strokeWidth={laneWidth(c2cProb, 1.3, 2.6)} strokeDasharray="4 3" />
                        <polygon points="84,36 80,30 87,31" fill={D.safe} />
                        <text x="70" y="8" textAnchor="middle" fontFamily="Space Mono" fontSize="10" fontWeight="700" fill={D.safe}>{c2cPct}</text>
                        <text x="70" y="20" textAnchor="middle" fontFamily="Nunito" fontSize="9" fontWeight="800" fill={D.safe} opacity="0.75">stay mindful</text>
                        <circle r={2.1 + (c2cProb * 1.1)} fill={D.safe} style={{ offsetPath: "path('M 56 36 C 34 14 106 14 84 36')", animation: `loopTravel ${flowDuration(c2cProb, 4.8, 2.8)} linear 0.2s infinite` }} />

                        {/* Self-loop: Autopilot → Autopilot */}
                        <path d="M 236 36 C 214 14 286 14 264 36" fill="none" stroke={D.danger} strokeOpacity={laneOpacity(d2dProb, 0.18, 0.45)} strokeWidth={laneWidth(d2dProb, 1.3, 2.6)} strokeDasharray="4 3" />
                        <polygon points="264,36 260,30 267,31" fill={D.danger} />
                        <text x="250" y="8" textAnchor="middle" fontFamily="Space Mono" fontSize="10" fontWeight="700" fill={D.danger}>{d2dPct}</text>
                        <text x="250" y="20" textAnchor="middle" fontFamily="Nunito" fontSize="9" fontWeight="800" fill={D.danger} opacity="0.75">stay autopilot</text>
                        <circle r={2.1 + (d2dProb * 1.1)} fill={D.danger} style={{ offsetPath: "path('M 236 36 C 214 14 286 14 264 36')", animation: `loopTravel ${flowDuration(d2dProb, 4.9, 2.7)} linear 0.8s infinite` }} />

                        {/* Mindful node */}
                        <g style={{ animation: 'pulseNode 3s ease-in-out infinite' }}>
                            <circle cx="70" cy="88" r="43" fill={`rgba(58,158,111,${nodeHalo(c2cProb)})`} />
                            <circle cx="70" cy="88" r="38" fill="rgba(58,158,111,0.10)" stroke={D.safe} strokeWidth="2.2" />
                            <text x="70" y="83" textAnchor="middle" fontFamily="Space Grotesk" fontSize="11" fontWeight="800" fill={D.safe}>Mindful</text>
                            <text x="70" y="97" textAnchor="middle" fontFamily="Space Grotesk" fontSize="11" fontWeight="800" fill={D.safe}>Browsing</text>
                        </g>
                        {/* Autopilot node */}
                        <g style={{ animation: 'pulseNode 3s ease-in-out 1.5s infinite' }}>
                            <circle cx="250" cy="88" r="43" fill={`rgba(196,86,58,${nodeHalo(d2dProb)})`} />
                            <circle cx="250" cy="88" r="38" fill="rgba(196,86,58,0.10)" stroke={D.danger} strokeWidth="2.2" />
                            <text x="250" y="91" textAnchor="middle" fontFamily="Space Grotesk" fontSize="11" fontWeight="800" fill={D.danger}>Autopilot</text>
                        </g>
                        {/* Forward arrow: Mindful → Autopilot */}
                        <path d="M 110 70 Q 160 41 210 70" fill="none" stroke={D.danger} strokeOpacity={laneOpacity(c2dProb, 0.16, 0.28)} strokeWidth={laneWidth(c2dProb, 5.5, 10)} filter="url(#laneGlow)" style={{ animation: 'pulseLane 2.6s ease-in-out infinite' }} />
                        <path id="pathForward" d="M 110 70 Q 160 41 210 70" fill="none" stroke={D.danger} strokeOpacity={laneOpacity(c2dProb, 0.45, 1)} strokeWidth={laneWidth(c2dProb, 2.4, 5.6)} strokeLinecap="round" />
                        <polygon points="210,70 201,64 204,74" fill={D.danger} />
                        {/* Forward percentage label */}
                        <text x="160" y="36" textAnchor="middle" fontFamily="Space Mono" fontSize="11" fontWeight="800" fill={D.danger}>{c2dPct}</text>
                        <text x="160" y="24" textAnchor="middle" fontFamily="Nunito" fontSize="9" fontWeight="800" fill={D.danger} opacity="0.78">slip into autopilot</text>
                        {/* Moving dot: Mindful → Autopilot */}
                        <circle r={3.2 + (c2dProb * 1.8)} fill={D.danger} style={{ offsetPath: "path('M 110 70 Q 160 41 210 70')", animation: `flowTravel ${flowDuration(c2dProb, 4.6, 2.2)} linear infinite` }} />
                        {/* Return arrow: Autopilot → Mindful */}
                        <path d="M 210 106 Q 160 135 110 106" fill="none" stroke={D.safe} strokeOpacity={laneOpacity(d2cProb, 0.16, 0.28)} strokeWidth={laneWidth(d2cProb, 5, 9)} filter="url(#laneGlow)" style={{ animation: 'pulseLane 2.9s ease-in-out 0.5s infinite' }} />
                        <path id="pathBack" d="M 210 106 Q 160 135 110 106" fill="none" stroke={D.safe} strokeOpacity={laneOpacity(d2cProb, 0.45, 1)} strokeWidth={laneWidth(d2cProb, 2.2, 5.2)} strokeLinecap="round" strokeDasharray="5 3" />
                        <polygon points="110,106 119,100 117,111" fill={D.safe} />
                        {/* Return percentage label */}
                        <text x="160" y="148" textAnchor="middle" fontFamily="Space Mono" fontSize="11" fontWeight="800" fill={D.safe}>{d2cPct}</text>
                        <text x="160" y="136" textAnchor="middle" fontFamily="Nunito" fontSize="9" fontWeight="800" fill={D.safe} opacity="0.78">recover to mindful</text>
                        {/* Moving dot: Autopilot → Mindful */}
                        <circle r={3.2 + (d2cProb * 1.8)} fill={D.safe} style={{ offsetPath: "path('M 210 106 Q 160 135 110 106')", animation: `flowTravel ${flowDuration(d2cProb, 4.6, 2.2)} linear 0.6s infinite` }} />
                    </svg>
                    <div style={{ marginTop: 10, fontSize: 11, color: D.muted, lineHeight: 1.45 }}>
                        Dot speed reflects how often the switch happens. Lane thickness shows how strong that transition is.
                    </div>
                </div>
                    );
                })()}
                <div style={{ marginTop: 12, color: D.muted, fontSize: 13, lineHeight: 1.5 }}>
                    {isFiniteNumber(recoveryWindow)
                        ? `Once you enter autopilot mode, you typically recover within ${recoveryWindow.toFixed(1)} sessions.${isFiniteNumber(recoveryDelta) ? ` That is ${recoveryDelta <= 0 ? "better" : "worse"} than last month.` : ""}`
                        : "Not enough transition data yet to estimate recovery window."}
                </div>
                <div style={{ marginTop: 10 }}>
                    {confMeta.show ? (
                        <div style={{ color: D.info, fontSize: 12 }}>Prediction Accuracy: {Math.round(conf * 100)}%</div>
                    ) : confMeta.known ? (
                        <div style={{ color: D.muted, fontSize: 12 }}>Still learning your patterns · {confMeta.needed} more sessions to full accuracy</div>
                    ) : (
                        <div style={{ color: D.muted, fontSize: 12 }}>Prediction accuracy not available in this dataset.</div>
                    )}
                </div>
            </CollapsibleSection>

            <CollapsibleSection title={`Session Topology (${totalReels} reels)`} defaultOpen={false}>
                {safeArr(topology.reelData).length === 0 ? (
                    <EmptyState message="Not enough data for session topology" />
                ) : (
                    <>
                        {(() => {
                            const [topoSmooth, setTopoSmooth] = useState(0);
                            const rawReelData = safeArr(topology.reelData).map((r) => ({ 
                                i: r.index, 
                                p: Math.round(safeNum(r.captureProb, 0) * 100) 
                            }));
                            
                            const smoothData = (data, windowSize) => {
                                if (windowSize <= 1) return data;
                                return data.map((point, idx) => {
                                    const half = Math.floor(windowSize / 2);
                                    const start = Math.max(0, idx - half);
                                    const end = Math.min(data.length - 1, idx + half);
                                    let sum = 0, count = 0;
                                    for (let j = start; j <= end; j++) { sum += data[j].p; count++; }
                                    return { ...point, p: Math.round(sum / count) };
                                });
                            };
                            
                            const windowSize = topoSmooth === 0 ? 1 : topoSmooth === 1 ? 3 : topoSmooth === 2 ? 7 : 15;
                            const reelData = smoothData(rawReelData, windowSize);
                            const maxReel = reelData.length > 0 ? reelData[reelData.length - 1].i : 0;
                            
                            const smoothSafe = reelData.length > 0 ? Math.round(reelData.filter(d => d.p < 33).length / reelData.length * 100) : 0;
                            const smoothDoom = reelData.length > 0 ? Math.round(reelData.filter(d => d.p >= 66).length / reelData.length * 100) : 0;
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
                            
                            return (
                                <>
                                    <div style={{ marginBottom: 10, color: D.text, fontSize: 13 }}>
                                        Across all {totalReels} reels: {smoothSafe}% mindful, {smoothBorder}% borderline, {smoothDoom}% autopilot
                                    </div>
                                    <div style={{ display: "flex", height: 10, borderRadius: 999, overflow: "hidden", background: "#E4DED4", marginBottom: 12 }}>
                                        <div style={{ width: `${smoothSafe}%`, background: D.safe, transition: 'width 0.3s ease' }} />
                                        <div style={{ width: `${smoothBorder}%`, background: D.warn, transition: 'width 0.3s ease' }} />
                                        <div style={{ width: `${smoothDoom}%`, background: D.danger, transition: 'width 0.3s ease' }} />
                                    </div>
                                    <div style={{ height: 210 }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={reelData} margin={{ top: 12, right: 12, left: 8, bottom: 8 }}>
                                                <XAxis 
                                                    dataKey="i" 
                                                    tick={{ fill: D.muted, fontSize: 10 }} 
                                                    ticks={explicitTicks}
                                                    type="number"
                                                    domain={[0, maxReel]}
                                                />
                                                <YAxis 
                                                    tick={{ fill: D.muted, fontSize: 10 }} 
                                                    label={{ value: "Capture Risk (%)", angle: -90, position: "insideLeft", offset: 4, fontSize: 10, fill: D.muted }}
                                                    domain={[0, 100]}
                                                    width={44}
                                                />
                                                <Tooltip
                                                    contentStyle={{ background: D.cardLight, border: `1px solid ${D.borderSoft}`, borderRadius: 10, fontSize: 12, color: D.ink, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                                                    formatter={(v) => {
                                                        let riskLevel = "Mindful";
                                                        if (v >= 33 && v < 66) riskLevel = "Borderline";
                                                        if (v >= 66) riskLevel = "Autopilot";
                                                        return [`${v}% - ${riskLevel}`, "Risk"];
                                                    }}
                                                    labelStyle={{ color: D.muted, fontWeight: 700 }}
                                                    labelFormatter={(label) => `Reel #${label}`}
                                                />
                                                
                                                <ReferenceLine 
                                                    y={33} 
                                                    stroke={D.borderSoft} 
                                                    strokeDasharray="3 3"
                                                    opacity={0.4}
                                                />
                                                <ReferenceLine 
                                                    y={66} 
                                                    stroke={D.borderSoft} 
                                                    strokeDasharray="3 3"
                                                    opacity={0.4}
                                                />
                                                
                                                <Line 
                                                    type="monotone" 
                                                    dataKey="p" 
                                                    stroke={D.danger} 
                                                    strokeWidth={2.5}
                                                    dot={false}
                                                    activeDot={{ r: 5, fill: D.danger, stroke: D.cardLight, strokeWidth: 2 }}
                                                    isAnimationActive={false}
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6, padding: '6px 0' }}>
                                        <span style={{ fontSize: 11, color: D.muted, flexShrink: 0 }}>Smoothing</span>
                                        <input 
                                            type="range" min="0" max="3" step="1" 
                                            value={topoSmooth} 
                                            onChange={(e) => setTopoSmooth(parseInt(e.target.value))}
                                            style={{ flex: 1 }}
                                        />
                                        <span style={{ fontSize: 11, color: D.muted, flexShrink: 0, minWidth: 40, textAlign: 'right' }}>
                                            {['Raw', 'Low', 'Med', 'High'][topoSmooth]}
                                        </span>
                                    </div>
                                </>
                            );
                        })()}
                    </>
                )}
            </CollapsibleSection>
        </div>
    );
}

// ─── DashboardScreen ──────────────────────────────────────────────────────────
function DashboardScreen({ data }) {
    const [subTab, setSubTab] = useState("today");

    return (
        <div style={{ padding: "16px 16px 32px", position: "relative", zIndex: 1 }}>
            <div style={{ marginBottom: 14 }}>
                <div className="sub-tabs">
                    <button className={`sub-tab ${subTab === "today" ? "active" : ""}`} onClick={() => setSubTab("today")}>Today</button>
                    <button className={`sub-tab ${subTab === "week"  ? "active" : ""}`} onClick={() => setSubTab("week")}>This Week</button>
                    <button className={`sub-tab ${subTab === "all"   ? "active" : ""}`} onClick={() => setSubTab("all")}>All Time</button>
                </div>
            </div>

            {subTab === "today" && <DashboardToday data={data} />}
            {subTab === "week"  && <DashboardWeek data={data} />}
            {subTab === "all"   && <DashboardAllTime data={data} />}
        </div>
    );
}

export { DashboardScreen };
