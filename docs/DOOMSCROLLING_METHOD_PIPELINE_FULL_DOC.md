# Reelio Doomscrolling Metrics: Full Plain-Language Method Document

This document explains the exact method pipeline used in this app, in simple language, with full coverage of:

1. every data point collected,
2. every shown UI metric and where it comes from,
3. every math step used to generate doom/capture scores and dashboard outputs.

## Section 1: All Data Collected (with plain meaning)

### 1.1 Where data is stored

The app uses 4 storage layers:

- Raw event CSV: `insta_data.csv` (one row per processed reel event, schema version 5, 100 columns).
- Local Room database tables:
  - `sessions`
  - `reels`
  - `scroll_events`
- Model state file: `alse_model_state.json` (learned HMM and baseline memory).
- Dashboard cache file: `hmm_results.json` (precomputed payload injected into the WebView UI).

There is also preference storage (`InstaTrackerPrefs`) for values like sleep window settings, morning rest score, pending survey context, and pending retroactive label payload.

---

### 1.2 CSV schema (100 collected columns)

Below is the full schema used by the Python model and dashboard payload.

#### A) Session identity and timing

- `SessionNum`: session counter (resets by day logic, then increments).
- `ReelIndex`: index of processed reel row inside session.
- `StartTime`: timestamp when that reel started.
- `EndTime`: wall-clock end time used for that row/session segment.
- `DwellTime`: seconds spent before next reel transition.
- `TimePeriod`: coarse bucket from current hour (`Morning`, `Afternoon`, `Evening`, `Night`, `Late Night`).

#### B) Scroll speed and rolling behavior

- `AvgScrollSpeed`: average scroll distance proxy from captured scroll distances.
- `MaxScrollSpeed`: max scroll speed proxy in that sample window.
- `RollingMean`: rolling dwell mean over a short dwell window.
- `RollingStd`: rolling dwell standard deviation over that same window.
- `CumulativeReels`: cumulative reel count in session (used heavily for dedupe and true reel counting).
- `ScrollStreak`: streak of fast short dwells (continuous scroll behavior).

#### C) Interaction events and latencies

- `Liked`: net like state (odd/even toggle logic on like taps).
- `Commented`: comment interaction happened.
- `Shared`: share interaction happened.
- `Saved`: save interaction happened.
- `LikeLatency`: time to first like event.
- `CommentLatency`: time to first comment event.
- `ShareLatency`: time to first share event.
- `SaveLatency`: time to first save event.
- `InteractionDwellRatio`: first interaction latency divided by dwell time, clipped to [0,1].

#### D) Scroll structure and pauses

- `ScrollDirection`: direction class captured by accessibility event logic.
- `BackScrollCount`: how many reverse/back scrolls occurred.
- `ScrollPauseCount`: pause count while scrolling.
- `ScrollPauseDurationMs`: accumulated pause duration.
- `SwipeCompletionRatio`: clean swipes / swipe attempts.

#### E) Content attributes

- `HasCaption`: caption present.
- `CaptionExpanded`: caption expanded by user.
- `HasAudio`: audio present.
- `IsAd`: ad detected.
- `AdSkipLatencyMs`: latency before skipping ad-like content.

#### F) Exit/return pressure and notification behavior

- `AppExitAttempts`: attempts to leave app/session context.
- `ReturnLatencyS`: return latency signal.
- `NotificationsDismissed`: notification dismiss count.
- `NotificationsActedOn`: notification acted-on count.
- `ProfileVisits`: profile visit count.
- `ProfileVisitDurationS`: profile visit duration.
- `HashtagTaps`: hashtag tap count.

#### G) Physical environment and device context

- `AmbientLuxStart`: ambient light at start (fallback 50 if unavailable).
- `AmbientLuxEnd`: ambient light at end (fallback 50 if unavailable).
- `LuxDelta`: light change (`end - start`, clipped).
- `IsScreenInDarkRoom`: dark-room flag.
- `AccelVariance`: motion variance from accelerometer magnitude stream.
- `MicroMovementRms`: reserved column (currently written as 0).
- `PostureShiftCount`: posture/pose shift count proxy.
- `IsStationary`: 1 if movement variance is very low.
- `DeviceOrientation`: orientation snapshot.
- `BatteryStart`: battery level at session/reel start context.
- `BatteryDeltaPerSession`: battery drop (`start - end`) across session context.
- `IsCharging`: charging flag at start.
- `Headphones`: headphone connected flag.
- `AudioOutputType`: audio output route category.

#### H) Previous app context and re-entry context

- `PreviousApp`: last foreground package before Instagram.
- `PreviousAppDurationS`: duration spent there before Instagram foreground.
- `PreviousAppCategory`: mapped category (`launcher`, `system_ui`, `social`, etc).
- `DirectLaunch`: true when previous category is launcher.
- `TimeSinceLastSessionMin`: minutes since previous session end.
- `DayOfWeek`: calendar day index.
- `IsHoliday`: currently Sunday flag.
- `ScreenOnCount1hr`: screen interactive event count over last hour.
- `ScreenOnDuration1hr`: interactive screen-on duration over last hour.
- `NightMode`: system night mode flag.
- `DND`: do-not-disturb flag.
- `SessionTriggeredByNotif`: true when previous app context suggests notification/system UI trigger.

#### I) Within-session derived behavior features

- `DwellTimeZscore`: dwell z-score from a running mean and running spread.
- `DwellTimePctile`: approximate percentile from running sorted dwell list.
- `DwellAcceleration`: current dwell minus previous dwell, clipped.
- `SessionDwellTrend`: running slope of dwell as reel index increases.
- `EarlyVsLateRatio`: average early-session dwell divided by late-session dwell.
- `InteractionRate`: interaction events per reel count.
- `InteractionBurstiness`: variance-like interaction burst metric.
- `LikeStreakLength`: max consecutive like streak.
- `InteractionDropoff`: late interactions divided by early interactions.
- `SavedWithoutLike`: save happened while net like is false.
- `CommentAbandoned`: comment flow opened but not completed signal.
- `ScrollIntervalCV`: coefficient of variation of scroll intervals.
- `ScrollBurstDuration`: current scroll burst duration.
- `InterBurstRestDuration`: rest time between bursts.
- `ScrollRhythmEntropy`: entropy over interval bins (200ms binning).
- `UniqueAudioCount`: unique audio tracks seen in session context.
- `RepeatContentFlag`: reserved column (currently written as 0).
- `ContentRepeatRate`: reserved column (currently written as 0.0).

#### J) Circadian and sleep proxies

- `CircadianPhase`: fraction of day from current time (`minutes_since_midnight / 1440`).
- `SleepProxyScore`: binary proxy from whether current phase is inside configured sleep window.
- `EstimatedSleepDurationH`: overlap hours between session gap and configured sleep window.
- `ConsistencyScore`: consistency of first-session time over recent days.
- `IsWeekend`: Saturday/Sunday flag.

#### K) Active probes and self-report labels

- `PostSessionRating`: post-session rating (1-5 when answered).
- `IntendedAction`: intent label string.
- `ActualVsIntendedMatch`: intent match indicator.
- `RegretScore`: immediate regret score.
- `MoodBefore`: pre-session mood/state code.
- `MoodAfter`: post-session mood value.
- `MoodDelta`: `MoodAfter - MoodBefore`.
- `SleepStart`: configured sleep start hour.
- `SleepEnd`: configured sleep end hour.
- `PreviousContext`: saved previous-context string from prefs.
- `DelayedRegretScore`: delayed follow-up regret score.
- `ComparativeRating`: follow-up comparative session rating.
- `MorningRestScore`: morning rest self-report/proxy from prefs.

Important current implementation notes:

- Some columns are placeholders today (`MicroMovementRms`, `RepeatContentFlag`, `ContentRepeatRate`).
- Several survey fields are written as 0 until survey or retroactive label patching updates them.

---

### 1.3 Room database entities collected

These are separate from the CSV and kept in Room.

#### `sessions` table (`SessionEntity`)

- Identity/time: `sessionId`, `sessionStart`, `sessionEnd`, `durationSeconds`, `timeOfDayCategory`, `isLateNight`.
- Basic behavior: `totalScrolls`, `maxReelStreak`, `burstCount`, `scrollsPerMinute`, `likeCount`, `commentClickCount`, `shareCount`, `saveCount`.
- Exposure/speed proxies: `immersionScore`, `totalReelsViewed`, `avgReelExposure`, `maxReelExposure`, `meanScrollInterval`, `scrollIntervalVariance`, `peakAcceleration`, `velocityProxy`, `maxVelocityProxy`, `avgBurstDuration`, `maxBurstDuration`.
- Derived layers: `sessionDwellTrend`, `earlyVsLateRatio`, `interactionRate`, `interactionDropoff`, `scrollIntervalCV`, `scrollRhythmEntropy`.
- Cross-session memory: `sessionsToday`, `totalDwellTodayMin`, `longestSessionTodayReels`, `lastSessionDoomScore`, `rollingDoomRate7d`, `doomStreakLength`, `morningSessionExists`.
- Circadian/sleep: `circadianPhase`, `sleepProxyScore`, `estimatedSleepDurationH`, `consistencyScore`.
- Probe labels: `postSessionRating`, `intendedAction`, `actualVsIntendedMatch`, `regretScore`, `moodBefore`, `moodAfter`, `moodDelta`.

#### `reels` table (`ReelEntity`)

- `reelId`, `sessionId`, `reelIndex`, `startTime`, `endTime`.
- Reel-level behavior: `dwellTimeSec`, `avgScrollSpeed`, `maxScrollSpeed`, `scrollFrictionIndex`.
- Reel interactions: `liked`, `commented`, `paused`.
- Reel score proxy: `immersionScore`.

#### `scroll_events` table (`ScrollEventEntity`)

- `eventId`, `reelId`, `timestamp`, `velocity`, `acceleration`.

---

### 1.4 Model state and payload data also generated and stored

This app does not only store raw event rows. It also stores:

- learned model memory (so scoring is personalized over time), and
- a ready-to-render dashboard payload.

#### A) Model state (`alse_model_state.json`) - what the model remembers

- `A` (2x2 matrix): reel-to-reel transition probabilities inside a session.
  - state `0` = casual/mindful
  - state `1` = doom/captured
- `pi` (2 values): start-of-session state prior before reading the current reels.
- `q_01`, `q_10`: cross-session pull/escape rates used to adapt transitions when there is a session gap.
- `mu` and `sigma` (7 features x 2 states): per-feature state averages and spreads.
- `rho_dwell_speed` (2 values): dwell/speed correlation per state.
- `feature_weights` (7 values): how much each feature influences HMM likelihood.
- `logistic_weights` (9 values): how context shifts the start prior (`pi`).
- `running_disagreement`, `last_label_conf`, `labeled_sessions`: memory for model-vs-label disagreement and label trust.
- `SS_recent`, `SS_medium`, `SS_long`: short/medium/long memory banks used in parameter updates.
- scorer state: `component_weights` for the 7 heuristic drivers.
- baseline memory: personal norms for dwell, speed, session length, exits, rewatch, entropy, and session frequency.

#### B) Dashboard cache (`hmm_results.json`) - what React receives

Top-level payload groups:

- `sessions[]` (one object per session):
  - identity/time: `sessionNum`, `_rawSessionNum`, `_rawStartTime`, `date`, `startTime`, `endTime`
  - core scores: `S_t`, `dominantState`, `raw_S_t`, `dayAdjustedCapture`, `dayFrequencyRisk`, `sessionsThatDay`
  - behavior volume: `nReels`, `avgDwell`, `sessionDurationSec`
  - interaction totals: `totalLikes`, `totalComments`, `totalShares`, `totalSaves`, `totalInteractions`, `interactionRate`
  - survey labels: `postSessionRating`, `regretScore`, `moodBefore`, `moodAfter`, `intendedAction`, `actualVsIntended`, `comparativeRating`, `delayedRegretScore`, `supervisedDoom`, `hasSurvey`, `retroactiveLabel`
  - explainability: `heuristic_score`, `heuristic_components`, `session_top_driver`
- `model_parameters`:
  - `transition_matrix` (reel-level)
  - `session_transition_matrix` (session-level)
  - `doom_persistence_score_per_reel`
- global summaries:
  - `historical_drivers`, `top_historical_driver`
  - `timeline.p_capture`
  - `circadian`
  - `model_confidence`, `model_confidence_breakdown`
  - `feature_weights`, `scorer_component_weights`
  - `captureRiskScore`, `sessionsToday`, `idleSinceLastSessionMin`, `todayFrequencyRisk`
  - `weekly_summary`, `day_frequency_summary`

This cache is injected into WebView and then normalized in React before any screen renders.

#### C) Active probes (all questions, all options, exact scoring)

##### Pre-session probe (`IntentionProbeActivity`)

Step 1 question: `Right now I feel...`

- `Calm and focused` -> `MoodBefore = 1`
- `Fine, just taking a break` -> `MoodBefore = 2`
- `A bit restless or bored` -> `MoodBefore = 6`
- `Tired / winding down` -> `MoodBefore = 7`
- `Stressed or overwhelmed` -> `MoodBefore = 10`
- `Skip` -> `MoodBefore = 0`

Python converts `MoodBefore` to a risk value:

- `1 -> 0.0`
- `2 -> 0.1`
- `6 -> 0.6`
- `7 -> 0.7`
- `10 -> 1.0`
- `0` or missing -> `0.5` (neutral fallback)

Step 2 question: `What were you just doing?`

- stored as text in `PreviousContext`:
  - `Work / Study`
  - `Socializing`
  - `Relaxing`
  - `Chores / Task`
  - `Just woke up`
  - `Boredom`
- `Skip` -> `unknown`

Step 3 question: `Why are you opening this?`

- stored as text in `IntendedAction`:
  - `Bored / Nothing to do`
  - `Stressed / Avoidance`
  - `Procrastinating something`
  - `Habit / Automatic`
  - `Quick break (intentional)`
- `Skip` -> empty string

##### Post-session probe (`MicroProbeActivity`)

Step 1 question: `After closing Instagram, I feel...`

- `Refreshed / entertained` -> `PostSessionRating = 5`
- `About the same as before` -> `PostSessionRating = 4`
- `A little drained` -> `PostSessionRating = 3`
- `Regret I opened it` -> `PostSessionRating = 2`
- `Worse than before I opened it` -> `PostSessionRating = 1`
- `Skip` -> `PostSessionRating = 0`

Derived `MoodAfter` from `PostSessionRating`:

- rating `>= 4` -> `MoodAfter = 5`
- rating `== 3` -> `MoodAfter = 3`
- rating `<= 2` -> `MoodAfter = 1`
- skipped -> `MoodAfter = 0`

Step 2 question: `Did this session go as intended?`

- `Yes, it went as planned` -> `RegretScore = 1`
- `Somewhat` -> `RegretScore = 3`
- `No, it went off track` -> `RegretScore = 5`
- `Skip` -> `RegretScore = 0`

Step 3 question: `This session was...`

- `Intentional - I got what I came for` -> `ComparativeRating = 5`
- `Okay, nothing special` -> `ComparativeRating = 4`
- `Longer than I wanted` -> `ComparativeRating = 3`
- `A waste of time` -> `ComparativeRating = 2`
- `I could not stop - it took over` -> `ComparativeRating = 1`
- `Skip` -> `ComparativeRating = 0`

`ActualVsIntendedMatch` mapping:

- empty intention -> `0`
- `Habit / Automatic` -> `1`
- `Stressed / Avoidance` -> `0`
- `Procrastinating something` -> `0`
- else based on regret:
  - `RegretScore >= 4` -> `0`
  - `RegretScore <= 2` -> `1`
  - otherwise -> `2` (mixed/unclear)

##### Delayed follow-up probe (`DelayedProbeActivity`) — REMOVED

> This feature (and `DelayedProbeActivity`/`DelayedProbeReceiver`) was removed. The section
> below is kept as a historical record of what the pipeline used to do. `DelayedRegretScore`
> remains a CSV column for backward compatibility with historical data but is now always `0`.

Trigger rule:

- only sessions that were sampled (`isSurveySession == true`), and
- only if inferred session doom score `>= 0.35`.

Schedule:

- delayed prompt fires at `sessionEnd + 60 minutes`.

Question:

- `Now that you've had some time to step away - how do you feel about that session?`

Options and scoring:

- `I'm glad I took that break` -> `DelayedRegretScore = 1`
- `It was fine, no regrets` -> `2`
- `I wish I'd stopped a bit sooner` -> `3`
- `I regret opening Instagram at all` -> `4`
- `I still feel off / distracted from it` -> `5`
- `Skip` -> no delayed score

##### Retroactive probe (`RetroactiveSurveyActivity`) — REMOVED

> This feature (`RetroactiveSurveyActivity`, and the ability to add/edit survey data for a
> past session from the dashboard) was removed. The section below is kept as a historical
> record of what the pipeline used to do.

- Used the same 3 post-session questions/options as `MicroProbeActivity`.
- Difference from live micro-probe: if user tapped skip, existing prefilled values were kept (not overwritten to 0).
- Patched cached payload and CSV rows, then marked `retroactiveLabel = true`.


## Section 2: All UI Metrics by Screen, with backend lineage

### 2.1 End-to-end data path before any screen renders

For every screen (Monitor, Calendar, Dashboard), the path is the same and deterministic:

1. Accessibility capture writes rows to `insta_data.csv`.
2. Session end runs latest-session inference (`run_inference_on_latest`) and updates state memory.
3. If the session is survey-eligible, post-session prompt is queued with random delay:
  - minimum: `30,000 ms` (30s)
  - maximum: `45,000 ms` (45s)
4. Receiver guards prevent duplicate surveys:
  - pending session must match,
  - survey must not already be completed for that session,
  - survey UI must not already be open.
5. ~~Delayed probe is scheduled at `+60 minutes`~~ — removed; see the "REMOVED" note in
   Section 1 above.
6. Survey answers patch labels in prefs/CSV/cache and can trigger re-inference for latest session.
7. Dashboard generation (`run_dashboard_payload`) replays all sessions from CSV, rebuilds per-session outputs, applies recurrence adjustment, and assembles payload JSON.
8. Native layer stores this payload in `hmm_results.json` and injects it into WebView (`injectDataB64`).
9. React `normalizeData` standardizes numbers, computes derived metrics, applies today-only guards, and builds screen-ready objects.
10. Each screen renders only normalized values.

So every shown metric is either:

- direct from Python payload, or
- a React derivation from payload sessions.

Important guardrails in this path:

- Doom class cutoff is always `S_t >= 0.55`.
- Header stale guard uses inactivity + no-today-sessions:
  - if `sessionsToday == 0` and `idleSinceLastSessionMin > 120`, header score is forced to `0`.
- If Python background inference is unavailable on some devices, service fallback is:
  - `fallback = clip(avg(sessionDwellTimes) / 10, 0, 1)`.

---

### 2.2 Monitor screen metrics and lineage

#### Hero state (top face + label + headline)

- Visual state labels shown in hero: `DOOM`, `HOOKED`, `AWARE`, `MINDFUL`.
- Score source chain:
  - primary: latest session probability `S_t` from normalized sessions,
  - converted to 0-100 with `captureRiskScore = S_t * 100`,
  - fallback: payload `captureRiskScore` if latest session `S_t` is missing.
- Stale-score guard:
  - if `sessionsToday == 0` and `idleSinceLastSessionMin > 120`, hero score is forced to `0`.
- Header state thresholds (0-100 scale):
  - `score >= 70` -> `DOOM`
  - `45 <= score < 70` -> `HOOKED`
  - `25 <= score < 45` -> `AWARE`
  - `score < 25` -> `MINDFUL`
- The doom threshold (`0.55`) and header thresholds (`70/45/25`) are different layers:
  - `0.55` classifies a session probability,
  - `70/45/25` colors the header ring on a percent scale.

#### Hero summary text

- Uses:
  - `sessionsToday`
  - `capturedSessionsToday`
  - `peakRiskWindow`
  - `safestWindow`
- Exact lineage:
  - `sessionsToday`: count of sessions with local-device date = today.
  - `capturedSessionsToday`: today sessions where `S_t >= 0.55`.
  - `peakRiskWindow`/`safestWindow`: highest/lowest circadian risk bins from `circadianProfile` (2-hour bins).

#### Hero chips

- `Back in Xm`: from `timeSinceLastSessionMin`.
- `N autopilot in a row`: from `doomStreak` (consecutive latest sessions with `S_t >= 0.55`).
- `N mindful in a row`: from `mindfulStreak` (consecutive latest sessions with `S_t < 0.55`).
- `Higher/lower risk than usual`: compares `captureRiskScore` vs `tenSessionAvgScore`.

Streak tolerance detail (explicit):

- streaks are purely session-order based, not clock-time based.
- there is no time-gap expiry (no 2-hour, 12-hour, or day reset rule inside streak loop).
- streak loop stops only when it meets:
  - opposite class, or
  - missing/invalid probability.

#### Stats Bento card

- On App:
  - `activeTimeToday` or formatted `activeTimeTodaySeconds`.
  - derived from sum of today session durations.
- Sessions:
  - `sessionsToday` count from today timeline bucket.
- Closed mindfully:
  - uses `capturedSessionsToday` and `sessionsToday`.
  - mindful percent = `(sessionsToday - capturedSessionsToday) / sessionsToday`.

Threshold used inside this card:

- `capturedSessionsToday` counts only sessions with `S_t >= 0.55`.

#### Autopilot Rate card

- Uses `doomRate` from normalized data.
- `doomRate` = all-time capture rate from all sessions in normalize step:
  - count sessions where `S_t >= 0.55` / total sessions.
- Also shows recent trend chips from `last3SessionAutopilotRates`.
  - payload may provide this directly,
  - fallback derives it from recent probabilities (rounded percentages).

#### Attention pull radar card

- Uses `doomDrivers` list in normalized data.
- Driver values come from Python payload `historical_drivers` (or fallback component map), then normalized to sum to `1.0`.
- Radar axes shown:
  - Session Length
  - Rewatch Compulsion
  - Rapid Re-entry
  - Exit Conflict
  - Scroll Automaticity
  - Dwell Collapse
  - Environment

Each radar axis meaning and math:

- `Session Length`
  - meaning: how far this session length is above personal norm.
  - core formula: `c_length = min(nReels / (baselineLenMean + 2*baselineLenSigma), 1)`.
- `Rewatch Compulsion`
  - meaning: repeated back-scroll behavior versus personal baseline.
  - formula base: if back-scroll is zero, component is `0`; otherwise `min(backScrollPerReel / max(0.01, baselineRewatch + 0.01), 1)`.
- `Rapid Re-entry`
  - meaning: how quickly user returned after prior session.
  - formula base: `exp(-gapMin/gapScale)` when gap is known, else `0`.
  - then scaled by evidence gate: `0.35 + 0.65*behaviorEvidence`.
- `Exit Conflict`
  - meaning: user tried to leave but kept getting pulled back in-session.
  - formula base: `1 - exp(-exitRate/exitScale)`.
- `Scroll Automaticity`
  - meaning: low/rigid scroll rhythm compared with personal baseline rhythm.
  - blend: absolute low entropy + drop from personal entropy baseline.
- `Dwell Collapse`
  - meaning: late-session dwell trend dropping versus personal trend baseline.
  - formula base: `(baselineTrend - currentTrend) / trendScale`, clipped.
- `Environment`
  - meaning: context risk from rest disruption, immersion setup, entry context, and routine disruption.
  - computed in environment model, then scaled by the same evidence gate as rapid re-entry.

Display normalization for radar:

- raw axis components are non-negative,
- then each axis is divided by total driver sum,
- so all 7 displayed contributions sum to exactly `1.0`.

#### Today's Sessions collapsible

- Avg Duration: `avgSessionDurationSec`.
- Avg Reels: `todayAvgReels` fallback `avgReelsPerSession`.
- Focus/Reel: `avgDwellTimeSec`.
- Since Last Session: `idleSinceLastSessionMin` fallback `timeSinceLastSessionMin`.

Time metric behavior:

- `idleSinceLastSessionMin` = now minus latest session end time.
- `timeSinceLastSessionMin` = historical inter-session gap from latest row context.
- UI prefers true idle time first.

#### Lifetime Stats collapsible

- Habit Grip:
  - Back-to-back autopilot rate from `sessionDoomPersistence`.
  - Self-recovery from `escapeRate`.
- Lifetime consumption:
  - `totalReels`
  - `totalWatchedSeconds`
  - `totalSessions`

Definitions:

- `sessionDoomPersistence` = session-to-session probability of staying in doom state.
- `escapeRate` = session-to-session probability of moving from doom to mindful.
- `pullIndex = sessionDoomPersistence / escapeRate` when `escapeRate > 0`.

---

### 2.3 Calendar screen metrics and lineage

#### Calendar day cell state (Doom/Hooked/Aware/Mindful)

- Per-day value = day `avgCapture` from `heatmapData`.
- Day `avgCapture` is built in `normalizeData` from date buckets:
  - each session contributes with weight based on its duration and personal baseline length.
- Calendar state thresholds:
  - `avgCapture >= 0.70`: Doom
  - `>= 0.45`: Hooked
  - `>= 0.25`: Aware
  - `< 0.25`: Mindful

#### Monthly summary card

- Monthly state comes from average of all day `avgCapture` values in visible month.
- `avg capture` bar is this monthly mean.

#### Bottom 3 stats in Calendar

- Reels: `totalReels` (all-time).
- Sessions: month total from visible month day cells (`sessionCount` sum).
- Confidence: `modelConfidence`.

#### Day detail sheet (tap any day)

For each session in that day, UI shows:

- start time
- reels count
- session duration
- average dwell
- session capture percent
- survey chips (rating/regret/mood/experience/intent)

Backend lineage:

- Session records come from `dateBuckets` created in `normalizeData` from payload sessions.
- Survey values are from session payload fields (plus retroactive label cache overlays if available).

---

### 2.4 Dashboard screen metrics and lineage

Dashboard has 3 tabs: Today, This Week, All Time.

#### Dashboard Today

1) Today's Session Timeline

- One node per session in `todaySessions`.
- Dot color:
  - autopilot if session `S_t >= 0.55`
  - mindful otherwise.
- Node labels use session start time and duration.
- Session detail panel shows:
  - duration, reel count
  - survey tags if present
  - model callout (`Reelio said: Autopilot/Mindful`)
  - heuristic-blend warning if low confidence (`modelConf < 0.70`)

2) Retroactive label action

- `Label this session` button appears for sessions with identity but no valid survey values.
- It sends session identity + prefill values through native bridge.
- Native flow patches cached payload and CSV-backed signals, then UI updates immediately.

3) Mood Dissonance card

- Uses `moodDissonance` object derived in `normalizeData` by splitting surveyed sessions into:
  - autopilot sessions
  - mindful sessions
- Displays:
  - avg mood change for each group
  - avg regret for each group
  - summary sentence based on gap thresholds.

#### Dashboard This Week

1) Weekly Snapshot line chart

- Uses last 7 entries from `heatmapData`.
- Y value shown as autopilot percent (`doomRate * 100`).
- Main summary value: `thisWindowDoomRate`.

2) Weekly Heatmap bars

- Also from `heatmapData`.
- Each day bar shows:
  - autopilot rate percent (`doomRate`)
  - intensity (`avgCapture`)
  - session count
- Reference line is weekly average of shown day bars.

3) Weekly Insight card

- Uses:
  - `thisWindowDoomRate`
  - `lastWindowDoomRate`
  - derived delta direction text
  - confidence text from `modelConfidence` and coverage logic.

#### Dashboard All Time

1) Behavioral Baseline card

Shows four metrics:

- Autopilot Rate (All Sessions): `allTimeCaptureRate`
- Back-to-Back Autopilot Rate: `sessionDoomPersistence`
- Self-Recovery Rate: `escapeRate`
- Trap Pressure Ratio: `pullIndex`

2) Historical Vulnerability Pattern

- Uses `circadianProfile`.
- Line chart is risk by hour window.
- Also shows safest and riskiest windows.

3) State Dynamics (collapsible)

- Uses `stateDynamics` transition probabilities:
  - mindful -> autopilot (`casualToDoomProb`)
  - autopilot -> mindful (`doomToCasualProb`)
- Self-loop percentages are shown too (`1 - transition`).
- Recovery window text uses `recoveryWindowSessions` and optional `recoveryWindowDelta`.

4) Session Topology (collapsible)

- Uses `sessionTopology.reelData` (timeline of per-reel capture probabilities).
- Shows overall percentages:
  - mindful (<33%)
  - borderline (33-65%)
  - autopilot (>=66%)
- Includes smoothing slider for readability.


## Section 3: All Mathematics Used (plain-language but exact)

This section lists the actual equations used in capture scoring and metric generation.

### 3.1 Core thresholds used across pipeline

- Doom classification threshold (single source):
  - `DOOM_PROBABILITY_THRESHOLD = 0.55`
- Heuristic labels:
  - DOOM if `doom_score >= 0.55`
  - BORDERLINE if `0.35 <= doom_score < 0.55`
  - CASUAL otherwise
- Monitor state bands are a separate 0-100 UI scale:
  - `>=70`, `>=45`, `>=25`, else low.

---

### 3.2 Raw feature math in Kotlin (before Python)

#### Dwell stats per reel

- Dwell seconds:
  - `dwellSec = (now - lastReelStartTime) / 1000`

- Running z-score using incremental updates:
  - running mean and running spread updated each reel
  - `z = (dwellSec - sessionMean) / max(sessionStd, 1.0)`
  - clipped to `[-8, 8]`

- Dwell percentile:
  - insert dwell into running sorted list (max 50 values)
  - `pctile = insertIndex / listSize * 100`

- Dwell acceleration:
  - `accel = dwellSec - prevDwellSec`
  - clipped to `[-120, 120]`

- Session dwell trend (running slope):
  - linear regression slope over reel index vs dwell
  - clipped to `[-20, 20]`

- Early vs late ratio:
  - `ratio = avgFirstHalfDwell / avgSecondHalfDwell`
  - clipped to `[0, 10]`

#### Interaction behavior

- First interaction latency:
  - min of like/comment/share/save latency values that are > 0.

- Interaction dwell ratio:
  - `firstInteractionLatency / dwellMs` clipped to `[0,1]`.

- Swipe completion ratio:
  - `cleanSwipes / swipeAttempts` (default 1 when no attempts).

- Interaction rate:
  - `interactionEvents / reelCount` clipped `[0,1]`.

- Burstiness:
  - running spread of where interactions happen across the session.

- Dropoff:
  - `lateInteractions / earlyInteractions` clipped `[0,1]`.

#### Scroll rhythm

- Scroll interval CV:
  - `std(intervals) / mean(intervals)` clipped `[0,10]`.

- Scroll rhythm entropy:
  - bin intervals by 200ms
  - entropy: `-sum(p_i * log2(p_i))`
  - clipped `[0,4]`.

#### Environment/session context

- `luxDelta = ambientLuxEnd - ambientLuxStart` clipped to +/-1000.
- `isStationary = 1` when accel variance is below threshold.
- `batteryDelta = batteryStart - batteryEnd`.
- `circadianPhase = minutesSinceMidnight / 1440`.
- `consistencyScore = clip(1 - stdMinutes/180, 0, 1)` from first-session time history.
- `estimatedSleepDurationH` = overlap hours between session gap and configured sleep window, clipped to `[0,14]`.

---

### 3.3 Preprocessing math in Python

#### Transform features

- `log_dwell = log(max(DwellTime, 1e-3))`
- `log_speed = log(max(AvgScrollSpeed, 1.0))`
- `rewatch_intensity = log1p(BackScrollCount)`
- `exit_flag = log1p(AppExitAttempts)`
- `dwell_pctile` uses `DwellTimePctile` if available, otherwise rank percentile.
- `scroll_interval_cv` uses CSV value if available, otherwise `std(dwell)/mean(dwell)` fallback.

#### Effective reel count

- If `CumulativeReels` exists, use unique count (robust to jumps/dupes).
- Else fallback to row count.

#### Session behavior evidence (important gate)

- Compute two evidence terms:
  - `reelEvidence = nReels / targetReels`
  - `durationEvidence = totalDwell / targetDurationSec`
- `behaviorEvidence = clip(max(reelEvidence, durationEvidence), 0, 1)`.

This is used later so very short sessions do not look doom mostly because of context alone.

---

### 3.4 Supervised label math (survey-driven target)

`compute_supervised_doom_label` builds one supervised target in `[0,1]` from survey signals.

#### Step A: convert each answer option to numeric doom-space

Immediate regret (`RegretScore`, from step "Did this session go as intended?"):

- `Yes, it went as planned` -> `RegretScore=1` -> `imm=1/5=0.20`
- `Somewhat` -> `RegretScore=3` -> `imm=3/5=0.60`
- `No, it went off track` -> `RegretScore=5` -> `imm=5/5=1.00`

Delayed reflection (`DelayedRegretScore`, from 1-hour follow-up):

- option 1 -> `del=1/5=0.20`
- option 2 -> `del=0.40`
- option 3 -> `del=0.60`
- option 4 -> `del=0.80`
- option 5 -> `del=1.00`

Comparative session rating (`ComparativeRating`, 5 best to 1 worst):

- `5` -> `comp=(5-5)/4=0.00`
- `4` -> `0.25`
- `3` -> `0.50`
- `2` -> `0.75`
- `1` -> `1.00`

Post-session feeling (`PostSessionRating`, 5 best to 1 worst):

- `5` -> `postDoom=(5-5)/4=0.00`
- `4` -> `0.25`
- `3` -> `0.50`
- `2` -> `0.75`
- `1` -> `1.00`

#### Step B: apply priority chain and blend ratios

Priority order is strict:

1. delayed regret
2. comparative rating
3. immediate regret
4. post-session rating

Exact branch math:

- If delayed regret exists:
  - delayed + comparative + post: `0.50*del + 0.30*comp + 0.20*postDoom`
  - delayed + comparative: `0.60*del + 0.40*comp`
  - delayed + post: `0.75*del + 0.25*postDoom`
  - delayed only: `del`

- Else if comparative exists:
  - comparative + post: `0.55*comp + 0.25*imm + 0.20*postDoom`
  - comparative only: `0.70*comp + 0.30*imm`

- Else if immediate regret and post exist:
  - `0.60*imm + 0.40*postDoom`

- Else if only post exists:
  - `min(postDoom, 0.60)`

- Else:
  - `imm` (or zero if no immediate regret either)

#### Step C: modifiers after base label

- If there is no explicit label but mood delta exists:
  - `label = clip(0.5 + clip(-moodDelta*0.05, -0.15, 0.15), 0, 1)`
- Intent mismatch (`ActualVsIntendedMatch == 0`): add `+0.10`
- Intent confirmed match (`==1`) and label already positive: subtract `0.04`
- High-risk intention text (`Stressed / Avoidance`, `Bored / Nothing to do`, `Procrastinating something`): add `+0.25`
- Final clamp: `label = clip(label, 0, 1)`

So every survey option affects the final supervised target through explicit numeric conversions and fixed branch weights.

---

### 3.5 Environment risk math (context risk)

The environment risk model combines 4 context blocks:

1. rest disruption
2. immersion setup
3. entry context
4. routine disruption

Key internal formulas:

- quick return risk:
  - `quickReturnRisk = clip((45 - gapMin)/45, 0, 1)`
- consistency risk:
  - `consistencyRisk = clip(consistencyScore/6, 0, 1)`
- short sleep risk:
  - starts from `(6.5 - estimatedSleepHours)/2.5`, then confidence-weighted.

Block blends:

- `restDisruption = clip(0.50*sleepIntrusion + 0.20*fatigue + 0.18*sleepProxy + 0.12*shortSleepRisk, 0, 1)`
- `immersionSetupRisk = clip(0.30*lowLux + 0.30*darkRoom + 0.14*nightMode + 0.14*dnd + 0.12*chargingAnomaly, 0, 1)`
- `entryContextRisk = clip(0.34*notifTrigger + 0.22*directLaunch + 0.24*quickReturnRisk + 0.20*prevAppRisk, 0, 1)`
- `routineDisruption = clip(0.42*hourAnomaly + 0.28*consistencyRisk + 0.30*(hourAnomaly*consistencyRisk), 0, 1)`

Then synergy boost for stacked elevated context:

- count how many of the 4 are >= 0.45
- synergy grows when multiple are elevated.

Final context risk:

- base blend: `0.42*rest + 0.22*immersion + 0.20*entry + 0.16*routine`
- plus synergy term using max block
- clipped to `[0,1]`.

---

### 3.6 Heuristic DoomScorer math (interpretable components) + deeper HMM parameter explanation

#### 3.6A Heuristic components (the human-readable driver layer)

The heuristic has 7 components:

1. session length
2. exit conflict
3. rapid re-entry
4. scroll automaticity
5. dwell collapse
6. rewatch compulsion
7. environment

Initial component weights are equal (`1/7` each), then they are updated gradually.

Component formulas:

- Session length:
  - `c_length = min(nReels / (baselineLenMean + 2*baselineLenSigma), 1)`

- Exit conflict:
  - `c_exit = 1 - exp(-exitRate / exitScale)`

- Rapid re-entry:
  - `c_rapid = exp(-gapMin/gapScale)` when gap known, else `0`

- Scroll automaticity:
  - blend of:
    - absolute low-entropy term, and
    - drop from personal entropy baseline

- Dwell collapse:
  - compare latest dwell trend to personal trend baseline and scale

- Rewatch compulsion:
  - based on back-scroll rate versus personal baseline rewatch rate

- Environment:
  - environment risk model output (Section 3.5)

Evidence gate:

- `c_rapid` and `c_env` are both scaled by:
  - `contextEvidenceScale = 0.35 + 0.65*behaviorEvidence`

Raw heuristic score:

- `ds = dot(componentWeights, componentVector)`

Special adjustments:

- Late-night environment amplifier:
  - if in sleep window and environment risk high:
  - `ds = ds * (1 + 0.25*behaviorEvidence)`

- Hard floor for clear struggle:
  - if total exit attempts `>= 2`, force `ds = max(ds, 0.35)`

- Survey/intent amplifiers:
  - add to `amp`:
    - `+0.20` if low post rating or regret `>= 3`
    - `+0.15` if moodAfter `<= 2`
    - `+0.10` if confirmed intent mismatch
    - `+0.15` if behavior-based intent mismatch
  - final: `ds = clip(ds * (1 + amp), 0, 1)`

Display note:

- component values are normalized to sum to `1.0` for radar readability.

#### 3.6B HMM parameter deep dive (requested)

Core hidden states:

- State `0`: mindful/casual mode
- State `1`: doom/captured mode

Observed feature vector per reel (7 features):

1. `log_dwell`
2. `log_speed`
3. `rhythm_dissociation`
4. `rewatch_intensity`
5. `exit_flag`
6. `dwell_pctile`
7. `scroll_interval_cv`

Main HMM parameters and what each means:

- `A` (2x2): reel-to-reel transition matrix inside one session.
  - `A[0][1]`: chance of moving from mindful reel-state to doom reel-state.
  - `A[1][0]`: chance of escaping doom reel-state to mindful reel-state.

- `pi` (2 values): session-start prior before seeing current reels.
  - default prior starts near `[0.65, 0.35]`, then context adjusts it.

- `mu[k,s]` and `sigma[k,s]`:
  - mean and spread for feature `k` in state `s`.
  - these are updated from weighted sufficient statistics each replay.

- `rho_dwell_speed[s]`:
  - correlation between dwell and speed in state `s`.
  - dwell+speed are scored jointly with a bivariate Gaussian, not as isolated independent terms.

- `feature_weights[k]`:
  - relative feature influence in emission likelihood.
  - recalculated from separability signal, then normalized to sum to `1`.

- `q_01`, `q_10` (continuous-time gap rates):
  - used to adapt transitions when there is a gap between sessions.
  - gap-adapted matrix uses:
    - `lam = q_01 + q_10`
    - `exp_term = exp(-lam * gap_hours)`
    - then:
      - `A_gap[0,1] = q_01*(1-exp_term)/lam`
      - `A_gap[1,0] = q_10*(1-exp_term)/lam`
      - diagonals are the remaining probability mass.

- `logistic_weights` (9 context coefficients):
  - controls contextual start prior logit before each session.
  - context vector includes time phase, gap, rest disruption, entry risk, weekend, stress/avoidance flag, and pre-session mood risk.

- `h` (2 hazard-like persistence parameters):
  - updated with priors from long-window session counts and lengths.
  - constrained ranges:
    - `h[0]` clipped to `[0.05, 0.60]`
    - `h[1]` clipped to `[0.01, 0.25]`

Parameter safety constraints that are enforced:

- doom speed mean must stay above casual speed mean,
- doom rewatch/exit means must stay above casual,
- pull rate should stay above escape rate (`q_01 > q_10`),
- sigmas, probabilities, and correlations are clipped into safe numeric ranges.

#### 3.6C Complete HMM weight inventory + update workflow

This subsection lists all HMM-related weights and exactly how each one is updated.

##### 1) Transition/start weights

- Reel transition matrix `A` (initial):
  - row 0: `[0.8, 0.2]`
  - row 1: `[0.3, 0.7]`
- Start prior `pi` (initial): `[0.65, 0.35]`

How they update:

- `A` is updated in M-step from mixed expected transitions:
  - `sum_xi_mix = w_r*SS_recent.sum_xi + w_m*SS_medium.sum_xi + w_l*SS_long.sum_xi`
  - each row normalized: `A[i,:] = sum_xi_mix[i,:] / row_sum`
- `pi` is recomputed each session from contextual prior logic (see item 3 below).

##### 2) Emission feature weights (`feature_weights`)

- 7 features, initial weights are equal:
  - each starts at `1/7`.
- Feature order:
  - `log_dwell`, `log_speed`, `rhythm_dissociation`, `rewatch_intensity`, `exit_flag`, `dwell_pctile`, `scroll_interval_cv`.

How they are used:

- In emission likelihood, each feature log-likelihood is multiplied by its weight.
- `log_dwell` and `log_speed` are scored jointly with bivariate Gaussian and use combined weight `(w0 + w1)`.

How they update:

- Per feature, separability score is computed (KL-style signal between state 0 and state 1).
- Negative KL values are floored to `0`.
- If total separability `sum_kl > 1e-9`:
  - `feature_weights = kl_divs / sum_kl`
- Else fallback:
  - all active features reset to equal weight.
- Safety:
  - `feature_weights` clipped to minimum `1e-9`, then renormalized to sum `1.0`.

##### 3) Contextual prior weights (`logistic_weights`)

- Initial 9-value vector:
  - `[0.0, 0.5, 0.3, 0.2, 0.8, 0.6, 0.0, 0.9, 0.7]`

Context vector order (same length 9):

1. bias term (`1.0`)
2. `sin(circadian_phase)`
3. `cos(circadian_phase)`
4. normalized gap (`gap_hr / 10`)
5. `rest_disruption`
6. `entry_context_risk`
7. weekend flag
8. stress/avoidance flag
9. pre-session mood risk

How they are used to build `pi`:

- `logit = dot(logistic_weights, ctx)`
- `pi1 = sigmoid(logit)` then clipped to `[0.1, 0.9]`
- contextual prior: `[1-pi1, pi1]`
- then blended with fixed prior `[0.65, 0.35]` using:
  - `pi_weight = min(1, n_sessions_seen/5)`
  - final `pi = pi_weight*contextual_pi + (1-pi_weight)*fixed_prior`

How they update:

- starts updating after at least 5 sessions.
- target is first-step posterior doom probability `gamma_t0[1]`.
- prediction is `y_hat = sigmoid(dot(weights, ctx))`.
- error = `y_hat - target`.
- learning rate decays with sessions:
  - `lr = 0.01 * (0.98 ^ n_sessions_seen)`
- update rule:
  - `logistic_weights = logistic_weights - lr * error * ctx`

##### 4) Gap transition rates (`q_01`, `q_10`)

- Initial values:
  - `q_01 = 0.5` (mindful -> doom pull rate)
  - `q_10 = 0.5` (doom -> mindful escape rate)

How they are used:

- build gap-adjusted transition matrix `A_gap` with matrix-exponential closed form using:
  - `lam = q_01 + q_10`
  - `exp_term = exp(-lam * gap_hours)`

How they update:

- update only when:
  - `1 minute <= gap <= 48 hours`, and
  - at least 5 sessions have been seen.
- optimize expected transition objective with finite differences:
  - finite-difference step = `0.01`
  - gradient clipped to `[-1, 1]`
  - parameter update step = `+ 0.05 * gradient`
- then safety clips:
  - lower bound during step: `>= 1e-6`
  - global clip stage: `[0.01, 5.0]`
  - architectural constraint enforced: `q_01 > q_10`

##### 5) Multi-timescale memory-bank weights

- Sufficient-statistics banks:
  - recent, medium, long
- per-session bank decay constants:
  - recent `rho = 0.60`
  - medium `rho = 0.85`
  - long `rho = 0.97`
- update form per bank:
  - `bank = rho*bank + (1-rho)*new_stats`
- special case:
  - long bank update is skipped on regime alerts.

M-step bank-mix weights (`w_r`, `w_m`, `w_l`):

- if `n_sessions_seen < 5`:
  - `(0.70, 0.30, 0.00)`
- else if regime alert is active:
  - `(0.60, 0.30, 0.10)`
- else normal steady learning:
  - `(0.20, 0.50, 0.30)`

These mix weights are used for:

- emission stats (`sum_gamma`, `sum_x`, `sum_x2`, `sum_xy`), and
- transition stats (`sum_xi`) when updating `A`.

##### 6) Hazard-like persistence weights (`h`)

- Initial `h = [0.15, 0.05]`
- M-step Bayesian-style update from long-bank session counts and lengths:
  - priors:
    - `alpha_prior = [3.0, 1.0]`
    - `beta_prior = [5.0, 12.0]`
  - per state:
    - `a_post = n_sess + alpha_prior - 1`
    - `b_post = (sum_len - n_sess) + beta_prior - 1`
    - `h = a_post / (a_post + b_post)`
- safety clips:
  - `h[0]` in `[0.05, 0.60]`
  - `h[1]` in `[0.01, 0.25]`
  - enforce `h[0] > h[1]`.

##### 7) Label-blend weights that influence reported HMM probability

- label confidence levels:
  - delayed+comparative: `1.00`
  - delayed only: `0.85`
  - comparative only: `0.70`
  - immediate regret: `0.50`
  - post-only: `0.35`
- disagreement memory hyperparameters:
  - `disagreement_lr = 0.05`
  - `disagreement_decay = 0.80`
  - `max_disagreement_bias = 0.10`

Update behavior:

- bias term:
  - `bias = clip((supervised - hmm) * label_conf * 0.05, -0.10, 0.10)`
- running disagreement update with confidence-aware decay:
  - `effective_decay = 0.80^(2 - label_conf)` (or using last label confidence when current session is unlabeled)
  - running memory clipped to `[-0.25, 0.25]`.

End result:

- these weights decide how strongly user labels pull reported probability toward supervised signal versus raw HMM posterior.

---

### 3.7 HMM probability, blending, and arbitration math

#### Raw HMM posterior

- Forward-backward computes gamma over states per reel.
- Raw session doom probability:
  - `rawMeanDoom = mean(gamma[:, doomState])`

#### Early-session prior blend

- `alphaConf = min(1, nSessionsSeen/10)`
- `blended = alphaConf*rawMeanDoom + (1-alphaConf)*contextualPrior`

Interpretation:

- first sessions trust contextual prior more,
- by session 10+, blend is almost fully data-driven.

#### Label disagreement bias memory and supervised blend ratios

- Label confidence values:
  - delayed+comparative: 1.00
  - delayed only: 0.85
  - comparative only: 0.70
  - immediate regret: 0.50
  - post-only: 0.35
- disagreement bias:
  - if label exists and disagreement > 0.10:
  - `bias = clip((supervised - hmm) * labelConf * 0.05, -0.10, 0.10)`

Reported probability before arbitration:

- if label exists:
  - `reported_blended = (1-labelConf)*rawMeanDoom + labelConf*supervisedDoom`
- if label missing:
  - `reported_blended = rawMeanDoom + running_disagreement`

Running disagreement decay:

- when a label exists:
  - `effectiveDecay = 0.80^(2 - labelConf)`
- when no label exists:
  - same formula but uses last stored `labelConf`
- memory clip: `running_disagreement` is clipped to `[-0.25, 0.25]`.

#### Reported session probability in replay payload

In `run_dashboard_payload`, the reported score can move toward heuristic score:

- `disagreement = abs(heuristic - doomProb)`
- `lengthSignal = clip(effectiveReels / (baselineLenMean + baselineLenSigma), 0, 1)`
- `arbitration = clip(0.05 + 0.45*behaviorEvidence + 0.25*lengthSignal + 0.25*disagreement, 0, 0.9)`
- if confidence very high and disagreement small: `arbitration *= 0.35`
- final:
  - `S_t_reported = clip(doomProb + arbitration*(heuristic - doomProb), 0, 1)`

Low-evidence suppression:

- if not explicitly labeled and behavior evidence is very low and session is very short:
  - cap `S_t_reported <= 0.45`

This prevents 1-2 reel sessions from turning entire day high-risk by inertia.

---

### 3.8 Frequency recurrence and day-level adjustment math

After session replay, the model applies a day-frequency pass.

Frequency risk:

- if baseline daily sessions < 0.75, risk = 0.
- else:
  - `freqRatio = sessionsToday / baselineDailySessions`
  - `freqRisk = clip((freqRatio - 1.35)/1.65, 0, 1)`

Day behavior and boost:

- `meanRaw = mean(raw session S_t for that day)`
- `peakRaw = max(raw session S_t for that day)`
- `dayBehavior = clip(max(peakRaw, 0.65*meanRaw + 0.35*peakRaw), 0, 1)`
- `freqBoost = clip(0.18*freqRisk*(0.35 + 0.65*dayBehavior), 0, 0.18)`
- `dayCapture = clip(dayBehavior + freqBoost, 0, 1)`

Per-session same-day boost:

- later sessions get larger ordinal weight.
- `sessionBoost = clip(0.12*freqRisk*(0.25 + 0.75*rawSt)*ordinalWeight, 0, 0.12)`
- `adjustedSt = clip(rawSt + sessionBoost, 0, 1)`

Adjusted `S_t` is what dashboard sessions use afterward.

---

### 3.9 Calibration and final top-level score math

Calibration bias correction function:

- `apply_calibration(raw) = clip(raw - 0.357, 0, 1)`

In Python payload assembly:

- `captureRiskScore = apply_calibration(latestSessionS_t) * 100`

Important UI behavior detail:

- `normalizeData` usually computes display `captureRiskScore` from latest session `S_t * 100` directly when present.
- The payload-level calibrated `captureRiskScore` is used mainly as fallback.

So, in current UI practice, latest session `S_t` often drives the header score directly.

---

### 3.10 Confidence math

Confidence is computed from 4 parts, each in `[0,1]`.

1) Volume confidence (`C_volume`)

- `C_volume = clip(n_sessions_seen / 20, 0, 1)`
- reaches max at about 20 sessions.

2) State-separation confidence (`C_separation`)

- model computes per-feature separation between mindful and doom distributions,
- sums them into `D_B`, then:
  - `C_separation = clip(1 - exp(-D_B / 1.5), 0, 1)`

3) Stability confidence (`C_stability`)

- based on regime alert frequency:
  - `alert_rate = n_regime_alerts / n_sessions_seen`
  - `C_stability = clip(1 - alert_rate, 0, 1)`

4) Supervision confidence (`C_supervision`)

- label coverage:
  - `label_coverage = clip(labeled_sessions / n_sessions_seen, 0, 1)`
- agreement quality:
  - `disagreement_penalty = clip(abs(running_disagreement)/0.25, 0, 1)`
  - `agreement_quality = 1 - disagreement_penalty`
- if no labels exist, `C_supervision = 0`
- else:
  - `C_supervision = 0.6*label_coverage + 0.4*agreement_quality`

Main blend ratios:

- `overallBase = 0.35*C_volume + 0.35*C_separation + 0.20*C_stability + 0.10*C_supervision`

Readiness gate (prevents false "high confidence" on tiny data):

- `readiness = 0.5*C_volume + 0.5*C_separation`
- `gate = 0.35 + 0.65*readiness`
- final:
  - `overall = overallBase * gate`

Practical interpretation:

- if data volume and separation are weak, gate stays closer to `0.35` and confidence is suppressed.
- if both become strong, gate approaches `1.0` and `overall` approaches `overallBase`.

UI displays this `overall` as model confidence and may show calibration hints from the same breakdown.

---

### 3.11 UI aggregation math in `normalizeData`

Main derived formulas used by screens:

- all-time capture rate:
  - `count(session S_t >= 0.55) / total sessions`
- ten-session average score:
  - mean of last 10 session probabilities * 100
- daily heatmap `avgCapture`:
  - weighted mean of day sessions by duration-based weight
- today captured sessions:
  - count of today sessions where `S_t >= 0.55`
- streaks:
  - consecutive sessions from latest backward under condition (doom or mindful)
- mood dissonance:
  - grouped means across surveyed doom vs surveyed mindful sessions
- state dynamics recovery window fallback:
  - `1 / doomToCasualProb` when available

---

### 3.12 Fallback scoring path if background Python inference is disabled

In service mode where background Python inference is disabled, fallback score is:

- `fallback = clip(avg(sessionDwellTimes) / 10, 0, 1)`

This fallback is much simpler than ALSE and is used for service stability on some OEM devices.


End of full method document.
