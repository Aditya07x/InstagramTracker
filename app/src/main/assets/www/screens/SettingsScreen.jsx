import {
    useState, useEffect, D, Label, fadeDelayStyle,
    safeNum, maybeNum, useCountUp, getAccuracyMeta,
    Download, Trash2,
} from '../shared.jsx';

// ─── SettingsScreen ───────────────────────────────────────────────────────────
function SettingsScreen({ data, onShowOnboarding }) {
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

    return (
        <div style={{ padding: "16px 16px 32px", position: "relative", zIndex: 1 }}>
            <div style={{ marginBottom: 20, padding: "8px 2px 0" }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: D.ink, fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.01em' }}>App Settings</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: D.soft, fontFamily: "'Nunito', sans-serif" }}>Customize your experience</div>
            </div>

            <div className="card fade-card" style={{ ...fadeDelayStyle(0), padding: 14, marginBottom: 12 }}>
                <Label style={{ color: D.info }}>Your Baseline</Label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 10 }}>
                    <div>
                        <div className="spacemono" style={{ fontSize: 20, color: D.ink, fontWeight: 700 }}>{baselineSessionsCounted}</div>
                        <div style={{ color: D.muted, fontSize: 11 }}>Sessions tracked</div>
                    </div>
                    <div>
                        <div style={{
                            fontSize: 16,
                            color: accuracyMeta.show ? D.green : D.yellow,
                            fontWeight: 800,
                            fontFamily: "'Space Grotesk', sans-serif",
                            display: 'flex', alignItems: 'center', gap: 6
                        }}>
                            {!accuracyMeta.show && (
                                <div style={{ width: 7, height: 7, borderRadius: '50%', background: D.yellow, boxShadow: `0 0 8px ${D.yellow}`, animation: 'pulse 1.5s ease-in-out infinite' }} />
                            )}
                            {accuracyMeta.show ? `${Math.round(modelAccuracy * 100)}%` : (accuracyMeta.known ? "Calibrating" : "--")}
                        </div>
                        <div style={{ color: D.soft, fontSize: 11, fontWeight: 700, fontFamily: "'Nunito', sans-serif" }}>
                            {accuracyMeta.show ? "Model accuracy" : (accuracyMeta.known ? `${accuracyMeta.needed} more sessions` : "unavailable")}
                        </div>
                    </div>
                    <div>
                        <div className="spacemono" style={{ fontSize: 14, color: D.ink, fontWeight: 700, marginTop: 4 }}>{sinceDate || "--"}</div>
                        <div style={{ color: D.muted, fontSize: 11 }}>Data since</div>
                    </div>
                </div>
            </div>

            <div className="card fade-card" style={{
                ...fadeDelayStyle(1),
                padding: 14,
                marginBottom: 12,
                background: 'linear-gradient(135deg, rgba(107,63,160,0.04), rgba(196,86,58,0.04))',
                borderColor: 'rgba(107,63,160,0.12)'
            }}>
                <Label style={{ display: "block", marginBottom: 10, color: D.purple, fontWeight: 800, fontSize: 11 }}>Check-in Frequency</Label>
                <div style={{ fontSize: 13, color: D.ink, marginBottom: 12, lineHeight: 1.5, fontWeight: 600 }}>
                    How often the app asks how you feel after a session. More check-ins = smarter insights.
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span className="mono" style={{ fontSize: 11, color: D.muted, fontWeight: 700 }}>0%</span>
                    <span className="mono" style={{ fontSize: 15, color: D.purple, fontWeight: 800 }}>{Math.round(surveyProb * 100)}%</span>
                    <span className="mono" style={{ fontSize: 11, color: D.muted, fontWeight: 700 }}>100%</span>
                </div>
                <input type="range" min="0" max="1" step="0.01" value={surveyProb} onChange={handleSurveyChange} style={{
                    accentColor: D.purple
                }} />
            </div>

            <div className="card fade-card" style={{ ...fadeDelayStyle(2), padding: 14, marginBottom: 12 }}>
                <Label style={{ display: "block", marginBottom: 10, color: D.info }}>Sleep Schedule</Label>
                <div style={{ fontSize: 13, color: D.text, marginBottom: 12, lineHeight: 1.5 }}>
                    Tell us when you sleep so we can flag late-night scrolling more accurately.
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                        <Label style={{ fontSize: 9, display: "block", marginBottom: 5 }}>Bedtime</Label>
                        <select value={sleepStart} onChange={(e) => handleSleepChange("start", e.target.value)} style={{
                            width: "100%", padding: "9px", background: "#E4DED4", border: `1px solid ${D.borderSoft}`,
                            color: D.ink, borderRadius: 8, fontFamily: "Space Mono", fontSize: 13, outline: "none"
                        }}>
                            {Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{i.toString().padStart(2, "0")}:00</option>)}
                        </select>
                    </div>
                    <div>
                        <Label style={{ fontSize: 9, display: "block", marginBottom: 5 }}>Wake-up</Label>
                        <select value={sleepEnd} onChange={(e) => handleSleepChange("end", e.target.value)} style={{
                            width: "100%", padding: "9px", background: "#E4DED4", border: `1px solid ${D.borderSoft}`,
                            color: D.ink, borderRadius: 8, fontFamily: "Space Mono", fontSize: 13, outline: "none"
                        }}>
                            {Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{i.toString().padStart(2, "0")}:00</option>)}
                        </select>
                    </div>
                </div>
            </div>

            <div className="card fade-card" style={{ ...fadeDelayStyle(3), padding: 14, marginBottom: 12, borderColor: "rgba(196,86,58,0.35)" }}>
                <Label style={{ display: "block", marginBottom: 10, color: D.danger }}>Data Management</Label>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <button onClick={() => window.Android && window.Android.exportCsv && window.Android.exportCsv()} style={{
                        width: '100%', padding: '14px', borderRadius: 14,
                        cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif",
                        fontSize: 14, fontWeight: 700, letterSpacing: '0.02em',
                        background: 'transparent',
                        color: D.purple,
                        border: `2px solid rgba(107,63,160,0.35)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                    }}>
                        <Download size={15} /> Export My Data
                    </button>
                    <button onClick={onShowOnboarding} style={{
                        width: '100%', padding: '14px', borderRadius: 14,
                        cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif",
                        fontSize: 14, fontWeight: 700, letterSpacing: '0.02em',
                        background: 'transparent',
                        color: D.ink,
                        border: `2px solid rgba(26,22,18,0.35)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                    }}>
                        View Onboarding
                    </button>
                    <button onClick={onReset} style={{
                        width: '100%', padding: '14px', borderRadius: 14,
                        cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif",
                        fontSize: 14, fontWeight: 700, letterSpacing: '0.02em',
                        background: '#C4563A',
                        color: '#F7F3EC', border: 'none',
                        boxShadow: '0 4px 16px rgba(196,86,58,0.3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                    }}>
                        <Trash2 size={15} /> Reset My Baseline
                    </button>
                </div>
                <div style={{ marginTop: 10, color: D.muted, fontSize: 12, lineHeight: 1.5 }}>
                    This permanently clears your history and the app will start learning you from scratch.
                </div>
            </div>
        </div>
    );
}

export { SettingsScreen };
