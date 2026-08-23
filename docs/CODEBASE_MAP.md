# CODEBASE_MAP.md

Where everything lives, per `CLAUDE.md`. Kept concise and scannable — see `ARCHITECTURE.md`
(when written) for responsibilities/why, and `DATA_FLOW.md` (when written) for how data moves.

```text
InstagramTracker/
├── app/src/main/
│   ├── java/com/example/instatracker/
│   │   ├── InstaAccessibilityService.kt   Core tracking engine + session/reel lifecycle,
│   │   │                                  CSV writer, sensor listeners, survey scheduling
│   │   ├── InteractionDetector.kt         Click classification (LIKE/COMMENT/SHARE/SAVE)
│   │   ├── ReelContextDetector.kt         Reel feed + overlay scroll disambiguation
│   │   ├── MainActivity.kt                App launcher: WebView host + JS bridge + dashboard
│   │   │                                  injection (cold-start + onResume paths)
│   │   ├── DashboardActivity.kt           Secondary WebView host, same dashboard, own cache gate
│   │   ├── MicroProbeActivity.kt          Immediate post-session 3-step survey (~30-45s delay)
│   │   ├── IntentionProbeActivity.kt      Pre-session intention capture
│   │   ├── PostSurveyReceiver.kt          BroadcastReceiver -> MicroProbeActivity
│   │   ├── SettingsActivity.kt            App settings screen host (if present)
│   │   ├── SurveyUIUtils.kt               Shared survey animation/rendering helpers
│   │   ├── BlobBackgroundView.kt          Animated background canvas view
│   │   ├── WeeklyNotificationWorker.kt    WorkManager weekly digest notification
│   │   ├── DatabaseProvider.kt            Room singleton + migrations
│   │   └── db/                            Room entities/DAOs (SessionEntity, ReelEntity, ...)
│   ├── python/
│   │   └── reelio_alse.py                 ~4000-line Chaquopy module: the HMM engine
│   │                                      (ReelioCLSE, UserBaseline, RegimeDetector,
│   │                                       DoomScorer, RegretValidator), CSV/session
│   │                                       parsing, run_dashboard_payload (full/incremental
│   │                                       replay), run_inference_on_latest (live scoring),
│   │                                       PDF report generation
│   └── assets/www/                        React dashboard (loaded into WebView)
│       ├── build_bundle.py                Concatenates + esbuild-transpiles JSX -> app.bundle.js
│       ├── app.jsx                        Root component: data fetch, normalizeData(), tabs
│       ├── shared.jsx                     Shared UI primitives/hooks
│       └── screens/
│           ├── MonitorScreen.jsx
│           ├── DashboardScreen.jsx        Today view: timeline, session detail, survey chips
│           ├── CalendarScreen.jsx         Calendar/session-history view
│           └── SettingsScreen.jsx         Survey rate, sleep schedule, data export/clear
├── docs/                                  This documentation set (CLAUDE.md rules, decisions,
│                                          changelog, this map)
├── graphify-out/                          Auto-generated codebase knowledge graph (partial —
│                                          extraction started but graph.json was never built)
└── tools/simulation_playground/           Standalone Python harness for synthetic data testing
```

## Runtime state files (on-device, `filesDir`, not source-controlled)

| File | Written by | Read by | Purpose |
|---|---|---|---|
| `insta_data.csv` | `InstaAccessibilityService.appendToCsv` (append-only, one row per reel) | Everything | Ground-truth behavioral log |
| `alse_model_state.json` | `run_inference_on_latest` (per-session, live), `run_dashboard_payload` (after full/incremental replay) | Both of the above | "Live" model checkpoint — approximate between dashboard opens, reset to canonical after each replay |
| `dashboard_replay_checkpoint.json` | `run_dashboard_payload` (new, see `docs/DECISIONS.md`) | `run_dashboard_payload` | Incremental-replay checkpoint: model state + already-computed session results + per-session fingerprints |
| `hmm_results.json` | `MainActivity`/`DashboardActivity` after computing a fresh payload | `MainActivity`/`DashboardActivity` (cache read, avoids invoking Python at all) | Final JSON payload cache for instant dashboard paint |

## Key cross-cutting relationships

- **Two Python entry points into the same HMM, different cost profiles:** `run_inference_on_latest` (O(1) per call, live scoring after one session) vs. `run_dashboard_payload` (O(ΔT) after the incremental-replay fix; O(T) before it / on fallback).
- **`GLOBAL_PYTHON_LOCK`** (`InstaAccessibilityService` companion object) serializes all Chaquopy calls across the background service and both dashboard Activities — Python/Chaquopy is not safely re-entrant here.
- **Survey data flow:** `MicroProbeActivity` is the only remaining source of post-hoc survey/label writes (immediate, ~30-45s after session end). The 1-hour delayed probe and the anytime-later retroactive survey were removed — see `docs/DECISIONS.md`.
