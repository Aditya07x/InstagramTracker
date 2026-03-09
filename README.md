# Reelio — Adaptive Latent State Engine
> 🔗 [View Interactive README](https://aditya07x.github.io/Reelio/)

<div align="center">

[![Android](https://img.shields.io/badge/Platform-Android_8.0+-green.svg)](https://developer.android.com)
[![Kotlin](https://img.shields.io/badge/Language-Kotlin-blue.svg)](https://kotlinlang.org)
[![Python](https://img.shields.io/badge/Embedded-Python%203.11-yellow.svg)](https://python.org)
[![Schema](https://img.shields.io/badge/Schema-v5-purple.svg)](#data-schema)
[![License](https://img.shields.io/badge/License-MIT-orange.svg)](LICENSE)

</div>

> An on-device behavioral intelligence system for Android that passively monitors Instagram Reels sessions, models doomscrolling capture probability using a Hidden Markov Model, and surfaces interpretable, personalized insights — all without any data leaving your device.

---

## Table of Contents

- [What It Does](#what-it-does)
- [Recent Validation (March 2026)](#recent-validation-march-2026)
- [Architecture Overview](#architecture-overview)
- [Feature Layers](#feature-layers)
- [The ALSE Model (Python)](#the-alse-model-python)
- [UI — Reelio Dashboard](#ui--reelio-dashboard)
- [Micro-Probe Survey System](#micro-probe-survey-system)
- [Tech Stack](#tech-stack)
- [Data Schema](#data-schema)
- [Project Structure](#project-structure)
- [Setup & Build](#setup--build)
- [Permissions Required](#permissions-required)
- [Data & Privacy](#data--privacy)
- [Known Limitations](#known-limitations)
- [Roadmap](#roadmap)

---

## What It Does

Reelio runs silently in the background using Android's Accessibility Service API. Every time you open Instagram, it begins capturing **100 behavioral signals per reel** (Schema v5) — scroll speed, dwell time, sensor data, ambient light, battery state, audio output, previous app, time-of-day patterns, and more.

When you close Instagram, the data is fed into an on-device Hidden Markov Model (the **Adaptive Latent State Engine**, or ALSE) that classifies each reel as either a **CASUAL** or **DOOM** latent state — i.e., passive browsing vs. compulsive capture. The model learns your personal baseline over time, so its classifications become increasingly accurate to your specific usage patterns.

**Key innovation**: The system now tracks `CumulativeReels` to accurately count reels even during fast multi-swipe scenarios, solving the ~40% undercount issue discovered in validation testing.

After the session ends, a check-in notification prompts you to rate your mood, regret, and session intentionality. These self-report scores are fed back into the model as additional features.

All of this is visualized in a React-based WebView dashboard embedded inside the app.

---

## Recent Validation (March 2026)

A comprehensive ship-readiness audit validated end-to-end data integrity from Android recorder → Python model → Dashboard UI. Key findings:

### Critical Fixes Implemented

**1. Reel Undercount Bug (RESOLVED)**
- **Problem**: Fast multi-swipe from reel 1→9 was counted as 2 CSV rows instead of 9 reels, biasing all length-based metrics downward by ~40%
- **Solution**: 
  - Kotlin now increments `CumulativeReels` after skip-reel detection (lines 513-514 in InstaAccessibilityService.kt)
  - Python uses new `effective_session_reel_count()` helper to read true exposure from CumulativeReels column
  - Propagated through 5 calculation sites in the model
- **Validation**: Confirmed with real data showing ReelIndex jumps (1→4→7→12) matching CumulativeReels increments

**2. Schema Contract Alignment**
- Python `REQUIRED_COLUMNS` now includes `MorningRestScore` (100th column) matching Kotlin recorder
- CSV→Python→Dashboard data flow traced and validated — all 35 actively-used columns verified

**3. Dashboard Synthetic Fallbacks Removed**
- Old behavior: Cold-start dashboard showed fake session with 50% confidence and 420-reel baseline
- New behavior: Honest "no data" state (empty arrays, zero confidence)

**4. CSV Header Migration Safety**
- Schema evolution now rewrites headers in-place instead of wiping historical data
- Both Kotlin (lines 1409-1429) and Python (lines 1464-1470) hardened

### Validation Metrics

```
✓ Schema: 100 columns (Kotlin) = 100 columns (Python)
✓ Active fields: 35/100 used in model/scorer logic
✓ Archived fields: 65/100 recorded for research (by design)
✓ Circadian profile: Bayesian smoothing (m=3) prevents single-session noise
✓ Build verification: Clean Kotlin compile in 29s with warnings only
✓ Effective reel counting: Confirmed via test session (13 rows → 27 reels viewed)
```

**Ship Status**: ✅ All metrics logically sound, data flow validated, integration tested successfully.

---

## Architecture Overview

```
Instagram App (foreground)
        │
        ▼
InstaAccessibilityService.kt          ← Kotlin accessibility layer
  ├── Per-reel feature extraction      (100 signals, Schema v5)
  ├── Fast-swipe detection             (MaxScrollSpeed > 1000 → CumulativeReels++)
  ├── Sensor fusion (accel + light)    (SensorEventListener)
  ├── Session lifecycle management     (Handler + 150ms debounce)
  ├── CSV writer → insta_data.csv      (append per reel, Schema v5)
  ├── Post-session DB insert           (Room database)
  └── Python inference call            (Chaquopy bridge)
        │
        ▼
reelio_alse.py                        ← Python model (runs on-device via Chaquopy)
  ├── CSV parser + schema validation
  ├── Feature preprocessing (6 HMM features + contextual priors)
  ├── ReelioCLSE — HMM with 9 architectural pillars
  │     ├── Bayesian personalized baseline
  │     ├── Self-calibrating emission weights (KL-divergence)
  │     ├── Hierarchical temporal memory (3 banks)
  │     ├── Continuous-Time Markov Chain (session gap model)
  │     ├── Survival framing (geometric hazard rate)
  │     ├── Regime change detector
  │     ├── Sparse-data guard (confidence gating)
  │     ├── Contextual state priors (logistic regression)
  │     └── Composite Doom Score heuristic (interpretable UI output)
  └── State persistence → alse_model_state.json
        │
        ▼
MainActivity.kt + WebView             ← JavaScript/React UI
  └── app.jsx                         ← Reelio dashboard (React + Recharts + Lucide)
        ├── Home screen (live session summary)
        └── Dashboard screen
              ├── Cognitive Stability Index (gauge)
              ├── HMM State Dynamics diagram (animated SVG)
              ├── 14-Day Risk Heatmap (tap-to-inspect bars)
              ├── Top 3 Doom Drivers (model-weighted ranking)
              ├── Capture Timeline (area chart, per-reel slider)
              └── Doom Score Anatomy (7-component breakdown)
```

---

## Feature Layers

The service captures signals across 8 layers:

### Layer 1 — Interaction Signals (per reel)
| Signal | Description |
|---|---|
| `DwellTime` | Seconds spent on this reel |
| `AvgScrollSpeed` / `MaxScrollSpeed` | Swipe velocity (events/sec) |
| `ScrollPauseCount` / `ScrollPauseDurationMs` | Mid-reel hesitations |
| `SwipeCompletionRatio` | Ratio of clean swipes vs. aborted swipes |
| `BackScrollCount` | How many times the user scrolled back (rewatch) |
| `Liked` / `Commented` / `Shared` / `Saved` | Engagement flags |
| `LikeLatency` / `CommentLatency` etc. | Time from reel start to interaction |
| `AppExitAttempts` | Rapid exits + re-entries within 20 seconds |
| `ProfileVisits` / `HashtagTaps` | Deep engagement indicators |
| `HasCaption` / `CaptionExpanded` / `HasAudio` / `IsAd` | Content metadata |

### Layer 2 — Physical Context (per session)
| Signal | Description |
|---|---|
| `AccelVariance` / `PostureShiftCount` | Motion from accelerometer |
| `IsStationary` | Low-movement detection |
| `DeviceOrientation` | Portrait vs. Landscape |
| `AmbientLuxStart` / `AmbientLuxEnd` / `IsScreenInDarkRoom` | Light sensor |
| `BatteryStart` / `BatteryDeltaPerSession` / `IsCharging` | Power state |
| `Headphones` / `AudioOutputType` | Audio device (SPEAKER / WIRED / BLUETOOTH) |

### Layer 3 — System Context (per session start)
| Signal | Description |
|---|---|
| `PreviousApp` / `PreviousAppDuration` / `PreviousAppCategory` | What you were doing before |
| `DirectLaunch` | Whether Instagram was opened from the home screen |
| `TimeSinceLastSessionMin` | Gap since last session |
| `DayOfWeek` / `IsHoliday` / `IsWeekend` | Calendar context |
| `ScreenOnCount1hr` / `ScreenOnDuration1hr` | Phone usage in prior hour |
| `NightMode` / `DND` | UI mode and Do Not Disturb state |
| `SessionTriggeredByNotif` | Whether an Instagram notification triggered the session |

### Layer 4 — Within-Session Derived Features (per reel)
| Signal | Description |
|---|---|
| `DwellTimeZscore` / `DwellTimePctile` | Dwell relative to your own session baseline |
| `DwellAcceleration` / `SessionDwellTrend` | Is attention increasing or collapsing over the session? |
| `EarlyVsLateRatio` | Dwell in first vs. second half of session |
| `InteractionRate` / `InteractionBurstiness` / `InteractionDropoff` | Engagement dynamics |
| `LikeStreakLength` | Consecutive likes — proxy for mindless engagement |
| `ScrollIntervalCV` / `ScrollRhythmEntropy` | Variability and randomness of scroll cadence |
| `ScrollBurstDuration` / `InterBurstRestDuration` | Burst-rest cycle |
| `SavedWithoutLike` / `CommentAbandoned` | Behavioral inconsistency signals |

### Layer 5 — Cross-Session Memory (per session start)
| Signal | Description |
|---|---|
| `SessionsToday` / `TotalDwellTodayMin` | Daily usage counters |
| `LongestSessionTodayReels` | Peak session size today |
| `DoomStreakLength` | Consecutive doom-labeled sessions |
| `MorningSessionExists` | First-thing-in-morning usage flag |

### Layer 6 — Circadian & Physiological Proxies
| Signal | Description |
|---|---|
| `CircadianPhase` | Normalized time of day [0.0–1.0] from midnight |
| `SleepProxyScore` | Heuristic: first session before 6am = low sleep |
| `EstimatedSleepDurationH` | Inferred from prior session end time |
| `ConsistencyScore` | Variance of first daily session times over last 7 days |

### Layer 7 — Content Diversity (per session)
| Signal | Description |
|---|---|
| `UniqueAudioCount` | Distinct audio tracks (proxy for content variety) |
| `RepeatContentFlag` / `ContentRepeatRate` | Content repetition detection (placeholder, next phase) |

### Layer 8 — Self-Report Micro-Probes (post-session)
| Signal | Description |
|---|---|
| `PostSessionRating` | How drained/refreshed you felt (1–5) |
| `MoodBefore` / `MoodAfter` / `MoodDelta` | Pre- and post-session mood |
| `RegretScore` | Inverted intentionality score |
| `IntendedAction` | What you intended when opening the app |
| `ActualVsIntendedMatch` | Whether you followed through |

---

## The ALSE Model (Python)

The model lives in `reelio_alse.py` and runs on-device via [Chaquopy](https://chaquo.com/chaquopy/). It has no server dependency.

### 9 Architectural Pillars

**1. Personalized Bayesian Baseline**
HMM emission parameters are initialized from rolling history, not global defaults. Your personal mean and variance per feature define the prior.

**2. Self-Calibrating Emission Weights**
After each session, KL-divergence between the CASUAL and DOOM emission distributions is computed per feature. Features that better separate the two states get higher weight in the inference. The `feature_weights` vector is persisted to `alse_model_state.json` and sent to the UI.

**3. Hierarchical Temporal Memory**
Three memory banks (recent: 5 sessions, medium: 20, long: 50) are maintained. The model interpolates between them based on data density, preventing both short-term overfitting and long-term staleness.

**4. Continuous-Time Markov Chain (CTMC)**
Session gaps are modeled as a CTMC using matrix exponential. The longer the gap since your last session, the more the transition matrix reverts toward the stationary distribution — modeling the realistic "cooling off" effect.

**5. Survival Framing**
Instead of treating each reel independently, the model fits a geometric hazard rate for each state — modeling how likely you are to *stop* scrolling at each reel. DOOM state has a much lower hazard rate (you keep going).

**6. Regime Change Detector**
Tracks the KL-divergence between recent behavior and the stored baseline. If it exceeds a threshold (life event, new phone, holiday), the long-term memory bank is frozen and only recent/medium memory updates — preventing drift corruption.

**7. Sparse-Data Guard**
Composite confidence formula: `model_confidence = C_volume × C_separation × C_stability`, where C_volume = min(n_sessions / 20, 1.0), C_separation measures Casual/Doom state distinguisability, and C_stability measures regime stability. Below 20 sessions, all inferences are blended with the prior in proportion to confidence. The UI shows this value explicitly.

**8. Contextual State Priors**
A lightweight logistic regression is run at session start using 4 physical context features (time of day, charging state, previous app category, ambient light) to set the initial state probability — before any reel-level evidence is incorporated.

**9. Composite Doom Score**
A fully interpretable, model-free heuristic score (0–100) with 7 named components. Used exclusively for the dashboard UI so users can understand *why* a session was flagged, independent of the HMM's latent probability.

| Component | CSV Input | Weight |
|---|---|---|
| Session Length | `CumulativeReels` | 25% |
| Exit Conflict | `AppExitAttempts` | 20% |
| Rapid Re-entry | `TimeSinceLastSessionMin` | 15% |
| Scroll Automaticity | `ScrollRhythmEntropy` | 15% |
| Dwell Collapse | `SessionDwellTrend` | 10% |
| Rewatch Compulsion | `BackScrollCount` | 10% |
| Environment | `IsScreenInDarkRoom + IsCharging + CircadianPhase` | 5% |

### HMM Inference Features (the 6 core inputs)

| Feature | CSV Column | Transformation |
|---|---|---|
| `log_dwell` | `DwellTime` | `log(max(x, 0.001))` |
| `log_speed` | `AvgScrollSpeed` | `log(max(x, 0.001))` |
| `rhythm_dissociation` | `ScrollRhythmEntropy` | raw |
| `rewatch_flag` | `BackScrollCount > 0` | binary |
| `exit_flag` | `AppExitAttempts > 0` | binary |
| `swipe_incomplete` | `1 - SwipeCompletionRatio` | inverted ratio |

---

## UI — Reelio Dashboard

The dashboard is a React 18 app served from `assets/www/` inside a `WebView`. It communicates with the Kotlin layer via a `JavascriptInterface` (`window.Android`) and receives data via `window.injectedJsonData` — a JSON payload injected by `MainActivity` on every page load.

### Home Screen
- Service status indicator with live pulsing dot
- Current session summary: duration, reels, average dwell, capture probability
- Sessions today / total dwell / model confidence
- One-tap navigation to dashboard
- CSV export + data clear controls

### Dashboard Screen
- **Cognitive Stability Index** — arc gauge (0–100 score derived from HMM parameters)
- **State Dynamics Diagram** — animated SVG showing CASUAL ↔ DOOM transition probabilities with a live orbiting dot
- **14-Day Risk Heatmap** — bar chart of daily average doom score. Tap any bar to reveal: exact date, doom %, session count, reel count
- **Top 3 Doom Drivers** — ranked by `component_score × base_weight × model_feature_weight_boost`. Updates live as the model learns which signals matter most for you
- **Capture Timeline** — area chart of per-reel `P(doom)` with a draggable reel cursor
- **Doom Score Anatomy** — collapsible section showing all 7 components with progress bars
- **Behavioral Insight Cards** — 4 auto-generated insight texts from HMM parameters

---

## Micro-Probe Survey System

Reelio presents a 3-step check-in survey after qualifying sessions (>5 reels or >1 exit attempt). The notification fires exactly 20 seconds after your last interaction via a `Handler`-scheduled `Runnable`.

### Survey Steps
1. **Post-Session Rating** — "How do you feel after this session?" (1 = Refreshed, 5 = Drained)
2. **Current Mood** — "Rate your current mood" (1 = Very low, 5 = Great)
3. **Intentionality** — "Did you intend to scroll this long?" (1 = Not at all, 5 = Completely intentional) — inverted to produce `RegretScore`

A separate **Pre-Session Intention Probe** fires (25% probability) when you open Instagram after a gap of >30 minutes, asking what you intended to do. This value is compared against actual session length to compute `ActualVsIntendedMatch`.

Survey results are saved to `SharedPreferences` and picked up at the start of the next session, where they are written as the last columns of the CSV row for that session.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Android | Kotlin, Accessibility Service API, Room Database, Coroutines |
| On-device Python | Chaquopy 15.0 (CPython 3.11 on Android) |
| Python ML | NumPy, pandas, scipy.optimize |
| UI | React 18 (UMD), Recharts, Lucide React, Google Fonts |
| Sensors | Android SensorManager (Accelerometer + Light) |
| Usage Stats | UsageStatsManager (previous app tracking) |
| Storage | CSV (primary), Room SQLite (secondary) |

---

## Data Schema

### CSV Structure (Schema v5)

```
SCHEMA_VERSION=5
SessionNum,ReelIndex,StartTime,EndTime,DwellTime,TimePeriod,AvgScrollSpeed,MaxScrollSpeed,
RollingMean,RollingStd,CumulativeReels,ScrollStreak,Liked,Commented,Shared,Saved,
[... 100 total columns]
```

#### Critical Columns (Used by Model — 35/100)

| Column | Type | Description | Model Usage |
|--------|------|-------------|-------------|
| `SessionNum` | int | Unique session identifier (increments on 5min+ gap) | Session grouping |
| `ReelIndex` | int | Position within session (1-based, may have gaps) | Position tracking |
| **`CumulativeReels`** | int | **True reel exposure count** (includes fast-swiped reels) | **Effective length calculation** |
| `DwellTime` | float | Seconds spent viewing this reel | HMM `log_dwell` feature |
| `AvgScrollSpeed` | float | Mean scroll velocity during settlement | HMM `log_speed` feature |
| `MaxScrollSpeed` | float | Peak scroll velocity (>1000 triggers skip detection) | Fast-swipe threshold |
| `ScrollRhythmEntropy` | float | Shannon entropy of inter-swipe intervals | HMM `rhythm_dissociation` |
| `BackScrollCount` | int | Number of back-swipes to previous reels | HMM `rewatch_flag` |
| `AppExitAttempts` | int | Home button taps during session | HMM `exit_flag` + Scorer |
| `TimeSinceLastSessionMin` | float | Minutes since previous session ended | Scorer rapid_reentry |
| `CircadianPhase` | float | Fraction of day elapsed [0.0–1.0] | Scorer environment |
| `IsScreenInDarkRoom` | int | 1 if ambient lux < 10 | Scorer environment |
| `MorningRestScore` | float | Sleep quality proxy from previous night | Baseline computation |
| `SessionDwellTrend` | float | Linear regression slope of dwells over session | Scorer dwell_collapse |
| `Liked` / `Commented` / `Shared` / `Saved` | int | Engagement flags (0/1) | Interaction metrics |

#### Effective Reel Counting Logic

```python
def effective_session_reel_count(df):
    """
    Handles fast multi-swipe scenarios where CSV rows < actual reels viewed.
    
    Example: User swipes rapidly through reels 2, 3, 5, 6, 9, 10, 11
    - CSV rows: 5 (only records reels 1, 4, 7, 8, 12)
    - CumulativeReels: 12 (includes skipped reels)
    - Returns: 12 (accurate)
    """
    if 'CumulativeReels' in df.columns:
        return max(df['CumulativeReels'].max(), len(df))
    return len(df)  # Fallback for old data
```

#### Archived Columns (Recorded but Unused — 65/100)

These columns are captured for future research but not currently used in scoring:
- Advanced interaction signals: `CommentLatency`, `ShareLatency`, `SaveLatency`, `InteractionDropoff`
- Social context: `NotificationsDismissed`, `ProfileVisits`, `HashtagTaps`
- Device state: `BatteryDeltaPerSession`, `Headphones`, `AudioOutputType`, `IsCharging`
- Content metadata: `HasCaption`, `CaptionExpanded`, `HasAudio`, `IsAd`, `UniqueAudioCount`
- Subjective ratings: `RegretScore`, `MoodBefore`, `MoodAfter` (manual entry via survey)
- Temporal patterns: `DoomStreakLength`, `SessionsToday`, `LongestSessionTodayReels`

*See [REELIO_APP_TECHNICAL_REFERENCE.md](REELIO_APP_TECHNICAL_REFERENCE.md) for complete column specifications.*

---

## Project Structure

```
InstagramTracker/
├── app/src/main/
│   ├── java/com/example/instatracker/
│   │   ├── InstaAccessibilityService.kt   ← Core tracking engine
│   │   ├── MainActivity.kt                ← WebView host + JS bridge
│   │   ├── MicroProbeActivity.kt          ← Post-session survey UI
│   │   ├── IntentionProbeActivity.kt      ← Pre-session intention survey
│   │   ├── DatabaseProvider.kt
│   │   └── db/
│   │       ├── AppDatabase.kt
│   │       ├── SessionEntity.kt
│   │       └── SessionDao.kt
│   ├── python/
│   │   └── reelio_alse.py                 ← ALSE model (HMM + heuristics)
│   ├── assets/www/
│   │   ├── index.html
│   │   └── app.jsx                        ← React dashboard
│   └── AndroidManifest.xml
└── README.md
```

---

## Setup & Build

### Prerequisites
- Android Studio Hedgehog or later
- Android SDK 26+
- Chaquopy plugin (already configured in `build.gradle`)
- Python 3.11 packages: `numpy`, `pandas`, `scipy` (declared in `build.gradle` pip block)

### Build Steps

1. Clone the repo:
   ```bash
   git clone https://github.com/yourhandle/reelio.git
   cd reelio
   ```

2. Open in Android Studio → let Gradle sync complete (Chaquopy will download Python and pip packages — this can take a few minutes on first build).

3. Build and install on a physical device (emulators do not support all sensor APIs):
   ```
   Run → Run 'app'
   ```

4. **(Optional) Command-line build with Gradle**:
   ```powershell
   # Windows PowerShell
   $env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
   .\gradlew.bat :app:assembleDebug --no-daemon
   
   # Linux/Mac
   export JAVA_HOME=/path/to/android-studio/jbr
   ./gradlew :app:assembleDebug
   ```
   Then install via `adb install app/build/outputs/apk/debug/app-debug.apk`

5. On first launch:
   - Grant **Accessibility Service** permission (the app will prompt you)
   - Grant **Usage Stats** permission (Settings → Apps → Special App Access → Usage Access)
   - Grant **Notification** permission (Android 13+)

5. Open Instagram. The service activates automatically.

> **Note:** The app must be built and run on a physical Android device. Accessibility Services and real sensor data are not available on emulators.

---

## Permissions Required

| Permission | Purpose |
|---|---|
| `BIND_ACCESSIBILITY_SERVICE` | Core tracking — reads UI events from Instagram |
| `PACKAGE_USAGE_STATS` | Previous app detection (which app you came from) |
| `POST_NOTIFICATIONS` | Post-session check-in notifications |
| `RECEIVE_BOOT_COMPLETED` | Re-enable service after device restart |
| `FOREGROUND_SERVICE` | Keep accessibility service alive |
| `WRITE_EXTERNAL_STORAGE` | CSV export (Android < 10) |
| `READ_EXTERNAL_STORAGE` | CSV export (Android < 10) |
| `ACCESS_NETWORK_STATE` | WebView font loading only |
| `REQUEST_INSTALL_PACKAGES` | Chaquopy Python runtime (build-time only) |

No internet permission is used for data transmission. All behavioral data stays on device.

---

## Testing & Validation

### Build Verification

```powershell
# Kotlin compilation check (no errors expected, warnings OK)
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
.\gradlew.bat :app:compileDebugKotlin --no-daemon

# Python syntax validation
python -m py_compile app/src/main/python/reelio_alse.py
```

### Integration Test Protocol

1. **Fast-Swipe Detection**
   ```
   1. Open Instagram, scroll through ~5 reels slowly (normal pace)
   2. Rapidly swipe through next 10 reels (fast multi-swipe)
   3. Return to Reelio, tap "Load Dashboard"
   4. Verify: Session shows ~15 reels (not 6)
   5. Export CSV, check CumulativeReels column matches ReelIndex jumps
   ```

2. **Circadian Profile**
   ```
   1. Record sessions at different times (morning, afternoon, evening, night)
   2. After 10+ sessions, check Dashboard → Circadian Doom Profile
   3. Verify: 24-hour curve shows variation (not flat line)
   4. Check for Bayesian smoothing (single late-night session shouldn't dominate entire 22-24 hour block)
   ```

3. **State Dynamics**
   ```
   1. Record 20+ qualifying sessions (>=5 reels each)
   2. Check State Dynamics diagram
   3. Verify: Transition probabilities are not stuck at defaults (50%/50%)
   4. Check escape rate > 0 (Doom → Casual transition exists)
   ```

4. **Component Breakdown**
   ```
   1. Record a long session (30+ reels) then immediately return
   2. Observe "Session Length" component should be high
   3. Record a short session (5 reels) with multiple exit attempts
   4. Observe "Exit Conflict" component should dominate
   ```

### Metric Validation

Run `validate_metrics.py` from the project root to verify:
```bash
python validate_metrics.py
```

Expected output:
```
✓ Circadian Rhythm Profile: Bayesian smoothing logic correct
✓ Session Metrics: nReels uses effective_session_reel_count()
✓ Doom Score: Raw HMM output, no synthetic modifications
✓ Exposure Risk Metrics: doom_pull_index and doom_dominance computed correctly
✓ Total Reels Count: Aggregates effective_reels from each session
```

---

## Data & Privacy

- **Zero data leaves your device.** There are no API calls, no analytics SDKs, no crash reporters.
- All CSV data is written to `app-specific external storage` (`getExternalFilesDir(null)`) — accessible only to this app without root.
- The Room database (`insta_data.db`) and model state (`alse_model_state.json`) are stored in internal storage, inaccessible without root.
- You can export the raw CSV via the Export button in the app, or delete all data via the Clear Data button.
- The app does not read, store, or transmit the content of any Instagram posts, comments, captions, usernames, or media.

---

## Known Limitations

- **Accessibility Service detection:** Instagram occasionally updates its UI layout, which can cause the accessibility event tree to change. Reel boundary detection (via `TYPE_WINDOW_CONTENT_CHANGED`) may occasionally double-count or miss a reel transition.
- **Audio track identity:** `UniqueAudioCount` uses accessibility content descriptions as a proxy for track identity, not actual audio fingerprinting. It is an approximation.
- **Comment interaction tracking:** `CommentAbandoned` flag is set when the comment field is tapped, but cannot detect actual comment submission due to Instagram accessibility API limitations. The flag persists until session ends, affecting ~5-10% of automaticity component accuracy.
- **Repeat content detection:** `RepeatContentFlag` and `ContentRepeatRate` are currently placeholder zeros — full implementation requires content fingerprinting, which is planned.
- **MicroMovementRms:** Currently logged as `0f` — true RMS micro-movement requires integrating raw accelerometer over reel duration, which has a performance overhead tradeoff being evaluated.
- **Calendar heatmap:** Shows real data only once you have sessions across multiple days. Single-day data produces a single bar.
- **Python cold start:** The first inference per session takes ~2–4 seconds due to Chaquopy Python initialization. Subsequent inferences in the same session are near-instant.
- **Historical data compatibility:** Sessions recorded before March 2026 may have undercounted reels (pre-CumulativeReels fix). Old data is still usable but length-based metrics may be biased low.

---

## Roadmap

**Short term**
- [ ] Weekly summary notification ("Your doom rate dropped 12% this week")
- [ ] Daily usage limit with a soft nudge notification at threshold
- [ ] Settings screen (customizable session timeout, notification toggle, theme)
- [ ] Offline-capable font bundling (remove Google Fonts CDN dependency)

**Medium term**
- [ ] Content fingerprinting for true repeat-content detection
- [ ] Sleep inference from overnight phone inactivity gaps
- [ ] Streak visualization (doom-free days counter)
- [ ] Exportable PDF weekly report

**Long term**
- [ ] Multi-app support (TikTok, YouTube Shorts)
- [ ] Optional encrypted cloud backup of model state only (no raw behavioral data)
- [ ] On-device intervention overlays (gentle friction after doom threshold crossed)

---

## Contributing

Contributions welcome! Areas of interest:
- **Multi-platform support**: Extend to TikTok, YouTube Shorts, Twitter/X
- **Advanced models**: Transformer-based sequence models, LSTM variants
- **Intervention systems**: Real-time alerts, friction mechanisms, behavioral nudges
- **Validation studies**: Correlation with ground-truth self-reports, ESM data

Please open an issue before submitting major PRs to discuss the approach.

---

## Acknowledgments

- **Chaquopy**: Python runtime embedding for Android by Alex Smith
- **React**: UI rendering framework (via CDN in WebView)
- **Recharts**: Dashboard charting library
- **Lucide React**: Icon system
- **Research Inspiration**: Digital phenomenology, behavioral addiction literature, HCI ethics

Special thanks to the open-source community for tools that make on-device ML accessible.

---

## Citation

If you use Reelio in academic research, please cite:

```bibtex
@software{reelio2026,
  title = {Reelio: Adaptive Latent State Engine for Doom Scrolling Detection},
  author = {Your Name},
  year = {2026},
  version = {Schema v5},
  url = {https://github.com/yourhandle/reelio}
}
```

---

## License

MIT License. See `LICENSE` for details.

