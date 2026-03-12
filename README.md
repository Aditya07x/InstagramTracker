# Reelio — Adaptive Latent State Engine

> 🔗 [View Interactive README](https://aditya07x.github.io/Reelio/)

<div align="center">

[![Android](https://img.shields.io/badge/Platform-Android_8.0+-brightgreen.svg)](https://developer.android.com)
[![Kotlin](https://img.shields.io/badge/Language-Kotlin-7F52FF.svg)](https://kotlinlang.org)
[![Python](https://img.shields.io/badge/Embedded-Python%203.11-3776AB.svg)](https://python.org)
[![Room DB](https://img.shields.io/badge/Database-Room_v2-blue.svg)](#database)
[![Schema](https://img.shields.io/badge/CSV_Schema-v5-purple.svg)](#data-schema)
[![License](https://img.shields.io/badge/License-MIT-orange.svg)](LICENSE)

</div>

> An on-device behavioral intelligence system for Android that passively monitors Instagram Reels sessions, models doomscrolling capture probability using a Hidden Markov Model, and surfaces interpretable, personalized insights — all without any data leaving your device.

---

## Table of Contents

- [What It Does](#what-it-does)
- [Architecture Overview](#architecture-overview)
- [Key Modules](#key-modules)
- [Feature Layers](#feature-layers)
- [The ALSE Model (Python)](#the-alse-model-python)
- [Interaction Detection Engine](#interaction-detection-engine)
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
- [Changelog](#changelog)

---

## What It Does

Reelio runs silently in the background using Android's **Accessibility Service API**. Every time you open Instagram, it begins capturing **100 behavioral signals per reel** (Schema v5) — scroll speed, dwell time, sensor data, ambient light, battery state, audio output, previous app, time-of-day patterns, and more.

When you close Instagram, the data is fed into an on-device Hidden Markov Model (the **Adaptive Latent State Engine**, ALSE) that classifies each session as either **CASUAL** or **DOOMSCROLLING** — passive browsing vs. compulsive capture. The model learns your personal baseline over time.

```
📱 Instagram  →  🔍 Accessibility Service  →  🧠 On-device HMM  →  📊 Dashboard
   (events)         (100 signals/reel)          (ALSE classifier)     (React UI)
```

**What makes it different:**
- 🔒 **100% on-device** — no API calls, no servers, no data leaves your phone
- 🧠 **Personalized** — learns your own scroll baseline, not a population average
- 📊 **Interpretable** — each doom score is explained with 7 named contributing components
- 🔁 **Adaptive** — weekly model updates via background `WorkManager` job

---

## Architecture Overview

```
Instagram App (foreground)
        │
        ▼
InstaAccessibilityService.kt       ← Kotlin accessibility layer (main engine)
  ├── InteractionDetector.kt        ← Click/like/comment/save/share recognition
  ├── ReelContextDetector.kt        ← Reel boundary & overlay scroll disambiguation
  ├── SessionManager.kt             ← Per-session state machine & CSV builder
  ├── Per-reel feature extraction   (100 signals, Schema v5)
  ├── Fast-swipe detection          (CumulativeReels counter)
  ├── Sensor fusion (accel + light) (SensorEventListener)
  ├── Session lifecycle management  (Coroutines + 150ms debounce)
  ├── CSV writer → insta_data.csv   (append per reel, Dispatchers.IO)
  ├── Post-session DB insert         (Room database v2, Dispatchers.IO)
  └── Python inference call         (Chaquopy bridge)
        │
        ▼
reelio_alse.py                     ← Python model (runs on-device via Chaquopy)
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
MainActivity.kt + WebView          ← JavaScript/React UI
  └── app.jsx                      ← Reelio dashboard (React 18 + Recharts + Lucide)
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

## Key Modules

### `InstaAccessibilityService.kt` — The Core Engine
The heart of Reelio. Receives every accessibility event from Instagram and routes it through the detection and segmentation pipeline. Key responsibilities:

| Responsibility | Implementation |
|---|---|
| Reel boundary detection | Scroll settle debounce (150ms) + index comparison |
| Comment/share sheet tracking | `isOverlaySheetOpen` flag with 1.5s debounce + live tree verify |
| Skip-reel counting | `CumulativeReels` incremented per skipped index gap |
| Frame rate protection | CSV/DB writes dispatched to `Dispatchers.IO` (never main thread) |
| Session lifecycle | Start/end detection via 5-min idle timeout |
| Sensor fusion | Accelerometer + light sensor merged per reel |

### `InteractionDetector.kt` — Click Intelligence
Classifies every `TYPE_VIEW_CLICKED` event into an `InteractionType` (LIKE / COMMENT / SHARE / SAVE). Uses a tiered matching strategy:

1. **View ID matching** — matches Instagram's internal resource names
2. **Content description** — multilingual keyword list (English, Spanish, French, and more)
3. **Text fallback** — matches visible text on the node tree
4. **Null-safe snapshot** — works even if `event.source` is null (common on comment icon taps)

### `ReelContextDetector.kt` — Scroll Disambiguation
Prevents comment-section scrolls from being misinterpreted as reel swipes. Provides:
- `isInReelContext()` — BFS traversal to confirm a full-screen reel feed is visible
- `isOverlayVisible()` — Checks for `bottom_sheet` / `comment_layout` / `share_sheet` view IDs in the live window tree, used to clear the overlay flag if Instagram misses the close event

### `SessionManager.kt` — State Machine
Encapsulates the per-session state (liked, commented, shared, saved, dwell timings, scroll metrics). Handles the `processPreviousReel()` function — computing all Welford running-stats updates and building the CSV row.

### `WeeklyNotificationWorker.kt` — Weekly Digest
A `WorkManager` task scheduled each Sunday at 9 AM that:
1. Runs Python inference on the week's CSV data
2. Extracts `doom_score`, `session_count`, `avg_dwell` via proper Chaquopy Map API
3. Fires a summary notification: *"Your doom rate this week was 63%. Down 8% from last week."*

### `MicroProbeActivity.kt` / `IntentionProbeActivity.kt` — Survey UI
Animated survey screens that collect post-session self-report data. Results are persisted in `SharedPreferences` and merged into the next CSV write.

---

## Feature Layers

The service captures 100 signals across 8 layers:

<details>
<summary><strong>Layer 1 — Per-Reel Interaction Signals</strong></summary>

| Signal | Description |
|---|---|
| `DwellTime` | Seconds spent on this reel |
| `AvgScrollSpeed` / `MaxScrollSpeed` | Swipe velocity (events/sec) |
| `ScrollPauseCount` / `ScrollPauseDurationMs` | Mid-reel hesitations |
| `SwipeCompletionRatio` | Ratio of clean swipes vs. aborted swipes |
| `BackScrollCount` | How many times the user scrolled back (rewatch) |
| `Liked` / `Commented` / `Shared` / `Saved` | Engagement flags (0/1) |
| `LikeLatency` / `CommentLatency` / `ShareLatency` / `SaveLatency` | Time from reel start to first interaction |
| `CommentAbandoned` | Comment sheet opened but no text submitted |
| `SavedWithoutLike` | Bookmarked without liking (behavioral inconsistency signal) |
| `AppExitAttempts` | Rapid exits + re-entries within 20 seconds |
| `ProfileVisits` / `HashtagTaps` | Deep engagement indicators |
| `HasCaption` / `CaptionExpanded` / `HasAudio` / `IsAd` | Content metadata |
| `AdSkipLatency` | Time until ad was skipped |

</details>

<details>
<summary><strong>Layer 2 — Physical Context (per session)</strong></summary>

| Signal | Description |
|---|---|
| `AccelVariance` / `PostureShiftCount` | Motion from accelerometer |
| `IsStationary` | Low-movement detection |
| `DeviceOrientation` | Portrait vs. Landscape |
| `AmbientLuxStart` / `AmbientLuxEnd` / `IsScreenInDarkRoom` | Light sensor |
| `BatteryStart` / `BatteryDelta` / `IsCharging` | Power state |
| `Headphones` / `AudioOutputType` | Audio device (SPEAKER / WIRED / BLUETOOTH) |

</details>

<details>
<summary><strong>Layer 3 — System Context (per session start)</strong></summary>

| Signal | Description |
|---|---|
| `PreviousApp` / `PreviousAppDuration` / `PreviousAppCategory` | What you were doing before |
| `DirectLaunch` | Whether Instagram was opened from the home screen |
| `TimeSinceLastSessionMin` | Gap since last session |
| `DayOfWeek` / `IsHoliday` / `IsWeekend` | Calendar context |
| `ScreenOnCount1hr` / `ScreenOnDuration1hr` | Phone usage in prior hour |
| `NightMode` / `DND` | UI mode and Do Not Disturb state |
| `SessionTriggeredByNotif` | Whether an Instagram notification triggered the session |

</details>

<details>
<summary><strong>Layer 4 — Within-Session Derived Features (per reel)</strong></summary>

| Signal | Description |
|---|---|
| `DwellTimeZscore` / `DwellTimePctile` | Dwell relative to your own session baseline |
| `DwellAcceleration` / `SessionDwellTrend` | Is attention increasing or collapsing? |
| `EarlyVsLateRatio` | Dwell in first vs. second half of session |
| `InteractionRate` / `InteractionBurstiness` / `InteractionDropoff` | Engagement dynamics |
| `LikeStreakLength` | Consecutive likes — proxy for mindless engagement |
| `ScrollIntervalCV` / `ScrollRhythmEntropy` | Variability and randomness of scroll cadence |
| `ScrollBurstDuration` / `InterBurstRestDuration` | Burst-rest cycle |

</details>

<details>
<summary><strong>Layer 5 — Cross-Session Memory (per session)</strong></summary>

| Signal | Description |
|---|---|
| `SessionsToday` / `TotalDwellTodayMin` | Daily usage counters |
| `LongestSessionTodayReels` | Peak session size today |
| `DoomStreakLength` | Consecutive doom-labeled sessions |
| `MorningSessionExists` | First-thing-in-morning usage flag |

</details>

<details>
<summary><strong>Layer 6 — Circadian & Physiological Proxies</strong></summary>

| Signal | Description |
|---|---|
| `CircadianPhase` | Normalized time of day [0.0–1.0] from midnight |
| `SleepProxyScore` | Heuristic: first session before 6am = low sleep |
| `EstimatedSleepDurationH` | Inferred from prior session end time |
| `ConsistencyScore` | Variance of first daily session times over last 7 days |

</details>

<details>
<summary><strong>Layer 7 — Content Diversity & Layer 8 — Self-Report Micro-Probes</strong></summary>

**Layer 7 — Content Diversity**

| Signal | Description |
|---|---|
| `UniqueAudioCount` | Distinct audio tracks (proxy for content variety) |
| `RepeatContentFlag` / `ContentRepeatRate` | [Placeholder — future content fingerprinting] |

**Layer 8 — Self-Report Micro-Probes (post-session)**

| Signal | Description |
|---|---|
| `PostSessionRating` | How drained/refreshed you felt (1–5) |
| `MoodBefore` / `MoodAfter` | Pre- and post-session mood |
| `RegretScore` | Inverted intentionality score |
| `IntendedAction` | What you intended when opening the app |
| `ActualVsIntendedMatch` | Whether you followed through |
| `DelayedRegretScore` | Regret rated 1 hour after the session (via delayed alarm) |
| `ComparativeRating` | This session vs. your typical session (better/worse) |

</details>

---

## The ALSE Model (Python)

The model lives in `reelio_alse.py` and runs on-device via [Chaquopy](https://chaquo.com/chaquopy/). No server required.

### 9 Architectural Pillars

| # | Pillar | Summary |
|---|---|---|
| 1 | **Personalized Bayesian Baseline** | Emission params initialized from rolling history, not global defaults |
| 2 | **Self-Calibrating Emission Weights** | KL-divergence scores features separating CASUAL vs DOOM; weights persist to disk |
| 3 | **Hierarchical Temporal Memory** | 3 banks (5 / 20 / 50 sessions); interpolated by data density to prevent staleness |
| 4 | **Continuous-Time Markov Chain** | Session gap modeled via matrix exponential — long gaps revert toward stationarity |
| 5 | **Survival Framing** | Geometric hazard rate per state — DOOM state has much lower escape hazard |
| 6 | **Regime Change Detector** | KL-divergence vs baseline monitors for life events; freezes long-term memory if exceeded |
| 7 | **Sparse-Data Guard** | `confidence = C_volume × C_separation × C_stability` — below 20 sessions, blends with prior |
| 8 | **Contextual State Priors** | Lightweight logistic regression on 4 context features sets initial state before reel evidence |
| 9 | **Composite Doom Score** | Fully interpretable 7-component heuristic (0–100) for the UI, independent of the HMM |

### Composite Doom Score Components

| Component | CSV Input | Weight |
|---|---|---|
| Session Length | `CumulativeReels` | 25% |
| Exit Conflict | `AppExitAttempts` | 20% |
| Rapid Re-entry | `TimeSinceLastSessionMin` | 15% |
| Scroll Automaticity | `ScrollRhythmEntropy` | 15% |
| Dwell Collapse | `SessionDwellTrend` | 10% |
| Rewatch Compulsion | `BackScrollCount` | 10% |
| Environment | `IsScreenInDarkRoom + IsCharging + CircadianPhase` | 5% |

### HMM Inference Features (6 core inputs)

| Feature | CSV Column | Transformation |
|---|---|---|
| `log_dwell` | `DwellTime` | `log(max(x, 0.001))` |
| `log_speed` | `AvgScrollSpeed` | `log(max(x, 0.001))` |
| `rhythm_dissociation` | `ScrollRhythmEntropy` | raw |
| `rewatch_flag` | `BackScrollCount > 0` | binary |
| `exit_flag` | `AppExitAttempts > 0` | binary |
| `swipe_incomplete` | `1 - SwipeCompletionRatio` | inverted ratio |

---

## Interaction Detection Engine

`InteractionDetector.kt` uses a layered resolution strategy to identify every tap:

```
TYPE_VIEW_CLICKED received
    │
    ├─ 1. Resource ID match?  (e.g. "com.instagram.android:id/like_button")  → LIKE
    ├─ 2. Content description match?  (multilingual: "like", "me gusta", "j'aime" …)
    ├─ 3. Text match?  ("like", "comment", "share", "save" and translations)
    ├─ 4. Node tree scan?  (BFS over nearby siblings for context)
    └─ 5. Null-safe fallback  (event.text + event.contentDescription when source=null)
```

**Overlay state management** ensures comment section scrolls never trigger false reel advances:

```
Comment icon tapped
    ↓  isOverlaySheetOpen = true  (immediate, from click handler)
    ↓  overlayOpenTimeMs = now     (debounce anchor)
         │
         ├─ TYPE_VIEW_SCROLLED fires while open → scroll dropped
         │      If debounce passed (>1.5s): query rootInActiveWindow
         │      If no bottom_sheet found → isOverlaySheetOpen = false ✓
         │
         └─ TYPE_WINDOW_STATE_CHANGED close event
                If now - overlayOpenTimeMs > 1500ms → isOverlaySheetOpen = false ✓
```

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

| Widget | Description |
|---|---|
| **Cognitive Stability Index** | Arc gauge (0–100) derived from HMM transition stability |
| **State Dynamics Diagram** | Animated SVG — CASUAL ↔ DOOM transition probabilities with orbiting dot |
| **14-Day Risk Heatmap** | Daily avg doom bar chart; tap any bar to inspect exact date, doom %, session count |
| **Top 3 Doom Drivers** | Ranked by `component_score × base_weight × feature_weight_boost` |
| **Capture Timeline** | Per-reel P(doom) area chart with a draggable cursor |
| **Doom Score Anatomy** | Collapsible 7-component breakdown with progress bars |
| **Behavioral Insight Cards** | 4 auto-generated interpretive texts from HMM parameters |

---

## Micro-Probe Survey System

Reelio presents a 3-step check-in after qualifying sessions (≥5 reels). The notification fires after a configurable probability check at session end.

### Survey Steps

| Step | Question | Output Field |
|---|---|---|
| 1 | *"How do you feel after this session?"* (1=Refreshed, 5=Drained) | `PostSessionRating` |
| 2 | *"Rate your current mood"* (1=Very low, 5=Great) | `MoodAfter` |
| 3 | *"Did you intend to scroll this long?"* (1=Not at all, 5=Yes) | `RegretScore` (inverted) |

A **Pre-Session Intention Probe** fires when you open Instagram after a gap >30 min, capturing `IntendedAction` which is later compared against actual session length to compute `ActualVsIntendedMatch`.

A **Delayed Regret Probe** fires 1 hour after your session via `AlarmManager`, capturing retrospective regret that often differs from in-the-moment responses.

Survey responses are stored in `SharedPreferences` and merged into the next CSV row at session end.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Android | Kotlin, Accessibility Service API, Coroutines (`Dispatchers.IO`) |
| Database | Room v2 (SQLite), schema migrations for zero-data-loss upgrades |
| On-device Python | Chaquopy 15.0 (CPython 3.11 on Android) |
| Python ML | NumPy, pandas, scipy.optimize |
| Background Jobs | WorkManager (`WeeklyNotificationWorker`) |
| UI | React 18 (UMD), Recharts, Lucide React, Google Fonts |
| Sensors | Android SensorManager (Accelerometer + Light) |
| Storage | CSV (primary per-reel log), Room SQLite (secondary per-session summary) |

---

## Data Schema

### CSV Structure (Schema v5)

```
SCHEMA_VERSION=5
SessionNum,ReelIndex,StartTime,EndTime,DwellTime,TimePeriod,...
[100 total columns]
```

#### Key Columns Used by the Model

| Column | Type | Description | Usage |
|--------|------|-------------|-------|
| `SessionNum` | int | Unique session identifier | Grouping |
| `ReelIndex` | int | Position within session | Position tracking |
| **`CumulativeReels`** | **int** | **True reel count** (includes fast-swiped) | **Effective length** |
| `DwellTime` | float | Seconds on this reel | HMM `log_dwell` |
| `AvgScrollSpeed` | float | Mean swipe velocity | HMM `log_speed` |
| `ScrollRhythmEntropy` | float | Shannon entropy of inter-swipe intervals | HMM `rhythm_dissociation` |
| `BackScrollCount` | int | Back-swipes | HMM `rewatch_flag` |
| `AppExitAttempts` | int | Home button taps | HMM `exit_flag` + Scorer |
| `TimeSinceLastSessionMin` | float | Gap since last session | Scorer `rapid_reentry` |
| `CircadianPhase` | float | Fraction of day [0.0–1.0] | Scorer `environment` |
| `SessionDwellTrend` | float | Linear regression slope over session | Scorer `dwell_collapse` |
| `Liked` / `Commented` / `Shared` / `Saved` | int | Engagement flags | Interaction metrics |

#### Effective Reel Counting

```python
def effective_session_reel_count(df):
    """
    Handles fast multi-swipe: user swiped reels 1→9 rapidly.
    - CSV rows written: 2 (only dwelled reels)  
    - CumulativeReels max: 9
    Returns: 9  ✓ accurate
    """
    if 'CumulativeReels' in df.columns:
        return max(df['CumulativeReels'].max(), len(df))
    return len(df)
```

#### Archived Columns (65/100 — recorded for future research)

These are captured but not currently used in model scoring:
- `CommentLatency`, `ShareLatency`, `SaveLatency`, `InteractionDropoff`
- `NotificationsDismissed`, `ProfileVisits`, `HashtagTaps`
- `BatteryDelta`, `Headphones`, `AudioOutputType`, `IsCharging`
- `HasCaption`, `CaptionExpanded`, `HasAudio`, `IsAd`, `UniqueAudioCount`
- `RegretScore`, `MoodBefore`, `MoodAfter`

---

## Project Structure

```
InstagramTracker/
├── app/src/main/
│   ├── java/com/example/instatracker/
│   │   ├── InstaAccessibilityService.kt   ← Core tracking engine + session lifecycle
│   │   ├── InteractionDetector.kt          ← Click classification (LIKE/COMMENT/SHARE/SAVE)
│   │   ├── ReelContextDetector.kt          ← Reel feed + overlay scroll disambiguation
│   │   ├── SessionManager.kt               ← Per-session state machine + CSV builder
│   │   ├── MainActivity.kt                 ← WebView host + JS bridge + data injection
│   │   ├── DashboardActivity.kt            ← Dashboard cache validation + navigation
│   │   ├── MicroProbeActivity.kt           ← Post-session 3-step survey UI
│   │   ├── IntentionProbeActivity.kt       ← Pre-session intention capture
│   │   ├── DelayedProbeActivity.kt         ← 1-hour post-session regret probe
│   │   ├── DelayedProbeReceiver.kt         ← BroadcastReceiver for delayed alarm
│   │   ├── PostSurveyReceiver.kt           ← BroadcastReceiver for post-session alarm
│   │   ├── SettingsActivity.kt             ← App settings (survey rate, sleep hours, theme)
│   │   ├── CSVExporter.kt                  ← CSV export handler
│   │   ├── SurveyUIUtils.kt                ← Shared survey animation + rendering logic
│   │   ├── WeeklyNotificationWorker.kt     ← WorkManager Sunday digest notification
│   │   ├── PreferencesHelper.kt            ← SharedPreferences wrapper
│   │   ├── DatabaseProvider.kt             ← Room singleton + migrations
│   │   ├── BlobBackgroundView.kt           ← Animated background canvas view
│   │   └── db/
│   │       ├── AppDatabase.kt              ← Room database definition (v2)
│   │       ├── SessionEntity.kt            ← Session row model (incl. saveCount)
│   │       ├── SessionDao.kt               ← Session queries
│   │       ├── ReelEntity.kt               ← Per-reel row model
│   │       ├── ReelDao.kt
│   │       ├── ScrollEventEntity.kt
│   │       └── ScrollDao.kt
│   ├── python/
│   │   └── reelio_alse.py                  ← ALSE model (HMM + heuristics + survey integration)
│   ├── assets/www/
│   │   ├── index.html                      ← WebView shell
│   │   └── app.jsx                         ← React 18 dashboard
│   └── AndroidManifest.xml
└── README.md
```

---

## Setup & Build

### Prerequisites
- **Android Studio** Hedgehog or later
- **Android SDK** 26+ (Android 8.0)
- **Physical Android device** (emulators don't support Accessibility Services or real sensors)
- Chaquopy and NumPy/pandas/scipy are pre-configured in `build.gradle` — no manual setup needed

### Build Steps

**1. Clone and open:**
```bash
git clone https://github.com/yourhandle/reelio.git
```
Open in Android Studio → let Gradle sync complete. Chaquopy will download Python + packages on first build (~2-3 min).

**2. Run on device:**
```
Run → Run 'app'  (or Shift+F10)
```

**3. (Optional) Command-line build:**
```powershell
# Windows
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
.\gradlew.bat :app:assembleDebug --no-daemon

# Linux / macOS
export JAVA_HOME=/path/to/android-studio/jbr
./gradlew :app:assembleDebug
```
Then: `adb install app/build/outputs/apk/debug/app-debug.apk`

**4. First launch permissions:**
- **Accessibility Service** — required, app will prompt you
- **Usage Stats** → Settings → Apps → Special App Access → Usage Access
- **Notifications** — required on Android 13+

**5. Open Instagram.** The service activates automatically and begins tracking.

> **Note:** Physical device required. Accessibility Services and sensor data are unavailable on emulators.

---

## Permissions Required

| Permission | Purpose |
|---|---|
| `BIND_ACCESSIBILITY_SERVICE` | Core tracking — reads UI events from Instagram |
| `PACKAGE_USAGE_STATS` | Previous app detection |
| `POST_NOTIFICATIONS` | Post-session check-in + weekly digest notifications |
| `RECEIVE_BOOT_COMPLETED` | Re-enable service after device restart |
| `FOREGROUND_SERVICE` | Keep accessibility service alive |
| `SCHEDULE_EXACT_ALARM` | Precise delayed-regret probe timing (Android 12+) |
| `ACCESS_NETWORK_STATE` | WebView font loading only |

> 🔒 No internet permission is used for data transmission. All behavioral data stays on your device.

---

## Data & Privacy

- **Zero data leaves your device.** No API calls, no analytics SDKs, no crash reporters.
- CSV data is written to app-specific internal storage (`filesDir`) — accessible only to this app.
- The Room database (`insta_tracker.db`) and model state (`alse_model_state.json`) are in internal storage, inaccessible without root.
- Export raw CSV via the **Export** button, or delete everything via **Clear Data**.
- The app does **not** read, store, or transmit the content of any Instagram posts, comments, captions, usernames, or media. Only UI structure (button labels, accessibility descriptions) is observed — never content.

---

## Known Limitations

- **Instagram UI changes:** Instagram occasionally updates view hierarchies. If reel index detection breaks after an Instagram update, disabling and re-enabling the accessibility service typically resolves it.
- **Comment tracking:** Comment detection now fires on the icon tap itself (not just sheet open) and uses a live overlay verification system. However, actual text submission tracking is not possible via Accessibility APIs — only the `CommentAbandoned` flag is set.
- **Audio identity:** `UniqueAudioCount` uses accessibility content descriptions as a proxy, not audio fingerprinting — it is an approximation.
- **Repeat content:** `RepeatContentFlag` is currently a placeholder (always 0) — full implementation requires content hashing.
- **Python cold start:** First inference per app process takes ~2–4s due to Chaquopy init. Subsequent calls are near-instant.
- **Pre-March 2026 data:** Sessions recorded before the `CumulativeReels` fix may undercount reels by ~40%. Old data remains usable but length-based metrics may be biased low.

---

## Roadmap

### ✅ Completed
- [x] Hidden Markov Model with 9 architectural pillars
- [x] 100-signal per-reel CSV recorder (Schema v5)
- [x] React 18 WebView dashboard with 6 chart types
- [x] 3-step post-session survey + pre-session intention probe
- [x] Delayed regret probe (1hr post-session alarm)
- [x] Weekly digest notification via WorkManager
- [x] Settings screen (survey rate, sleep hours, theme)
- [x] Multilingual interaction detection (EN/ES/FR)
- [x] Comment icon tap → comment registered (no text required)
- [x] Comment overlay debounce + live tree verification
- [x] CSV/DB writes dispatched to IO thread (no frame drops)
- [x] Room database migration system (v1 → v2, zero data loss)
- [x] `SaveCount` field in `SessionEntity`
- [x] Offline font bundling (removes CDN dependency)

### 🔜 Short Term
- [ ] Daily usage limit with soft nudge notification at threshold
- [ ] Doom-free streak counter with visualization
- [ ] Push notification when weekly doom rate drops (positive reinforcement)

### 🗓️ Medium Term
- [ ] Content fingerprinting for true repeat-content detection
- [ ] Sleep inference from overnight phone inactivity gaps
- [ ] Exportable PDF weekly report

### 🌐 Long Term
- [ ] Multi-app support (TikTok, YouTube Shorts, Twitter/X)
- [ ] Optional encrypted cloud backup of model state only
- [ ] On-device intervention overlays (gentle friction after doom threshold crossed)

---

## Changelog

### March 2026
- **Fixed:** Comment icon tap now registers as `commented=1` even without a text keyboard event
- **Fixed:** `isOverlaySheetOpen` no longer gets stuck — closing the comment sheet without a `TYPE_WINDOW_STATE_CHANGED` event is now caught by live window tree verification on the next scroll
- **Fixed:** Room database crash (`IllegalStateException: schema changed`) — added `MIGRATION_1_2` to add `saveCount` column without wiping existing session history
- **Fixed:** `Skipped 389 frames` Choreographer warning — `appendToCsv()` and `SharedPreferences.edit().apply()` now run on `Dispatchers.IO` instead of the main accessibility thread
- **Fixed:** `WeeklyNotificationWorker` always showed hardcoded fallback text — replaced `.toString()` on PyObject (Python repr) with proper Chaquopy `.asMap()` extraction
- **Fixed:** `validate_model_soft()` called on fresh uninitialized model during startup — now gated on `n_sessions_seen > 0`
- **Added:** `MIGRATION_1_2` in `DatabaseProvider.kt` for seamless Room schema upgrades
- **Added:** `isOverlayVisible()` in `ReelContextDetector.kt` — BFS scan for overlay view IDs

### Earlier in 2026
- **Fixed:** Reel undercount bug — fast multi-swipe from reel 1→9 now correctly records 9 reels via `CumulativeReels`
- **Fixed:** Dashboard cold-start showed synthetic 420-reel baseline — now shows honest empty state
- **Fixed:** CSV header migration now rewrites in-place instead of wiping historical data
- **Validated:** 100 columns (Kotlin) = 100 columns (Python REQUIRED_COLUMNS)

---

## Contributing

Contributions welcome! Areas of interest:
- **Multi-platform support** — TikTok, YouTube Shorts, Twitter/X
- **Advanced models** — Transformer sequences, LSTM variants
- **Intervention systems** — Real-time alerts, friction mechanisms, behavioral nudges
- **Validation studies** — Correlation with ground-truth self-reports, ESM data

Please open an issue before submitting major PRs to discuss the approach.

---

## Citation

If you use Reelio in academic research:

```bibtex
@software{reelio2026,
  title  = {Reelio: Adaptive Latent State Engine for Doomscrolling Detection},
  author = {Your Name},
  year   = {2026},
  note   = {Schema v5, on-device HMM via Chaquopy},
  url    = {https://github.com/yourhandle/reelio}
}
```

---

## Acknowledgments

- **[Chaquopy](https://chaquo.com/chaquopy/)** — Python runtime embedding for Android
- **[React 18](https://react.dev/)** — Dashboard UI (served via WebView)
- **[Recharts](https://recharts.org/)** — Dashboard charting
- **[Lucide React](https://lucide.dev/)** — Icon system
- **Research Inspiration** — Digital phenomenology, behavioral addiction literature, HCI ethics

---

<div align="center">

MIT License · Built with curiosity about attention, not profit

</div>
