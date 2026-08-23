# CHANGELOG.md

Development learning log, per `CLAUDE.md`. For every meaningful change: what, why, how, files
affected, data/control flow, architecture impact, algorithms/data structures, complexity
before/after, memory impact, optimization reasoning, risks, trade-offs, concepts learned,
and questions you should be able to answer.

---

## 2026-08-13

### Change 1: Incremental dashboard-replay caching (the "fast reload pipeline" fix)

**Why:** Opening the dashboard got slower the longer the app had been used, unboundedly.

**How:** `run_dashboard_payload()` in `reelio_alse.py` used to replay the *entire* session
history through the HMM (`model.process_session(...)`) on every single call — O(total
sessions). Added a checkpoint (`dashboard_replay_checkpoint.json`) that stores the model/
baseline/detector/scorer state plus the replay loop's own bookkeeping (`results`,
`sess_labels`, `historical_agg`, `total_st_weight`, `p_capture_timeline`, `session_circadian`)
as of the last replay, along with a per-session fingerprint. On the next call, if the
fingerprints for all previously-cached sessions still match the live CSV, the loop resumes
from the first *new* session instead of session 0. Any mismatch (a session's survey data
changed) falls back to a full replay from scratch — identical to the old, already-correct
behavior. Also wired `MainActivity`'s cold-start path (`onPageFinished`) to skip the Python
recompute entirely when a fresh cached `hmm_results.json` already exists — previously this
skip only applied on Vivo-family devices.

**Files affected:**
- `app/src/main/python/reelio_alse.py` — added `load_replay_checkpoint`,
  `save_replay_checkpoint`, `_session_identity_fingerprint`; modified `run_dashboard_payload`.
- `app/src/main/java/com/example/instatracker/MainActivity.kt` — `onPageFinished` now checks
  `injectCachedPayloadIfAvailable` before falling back to `injectDataWithDebounce`, for all
  devices (was Vivo-only).

**Data/control flow:** CSV → pandas session grouping (unchanged, still O(T), but cheap) →
checkpoint fingerprint check → HMM replay over only new sessions → merged results → JSON
payload → checkpoint saved for next time.

**Algorithms/data structures:** This is a cache-invalidation problem, not a new algorithm — the
underlying HMM math (Baum-Welch-style forward pass, EM weight updates) is unchanged. The
fingerprint is a hash-like equality check (dict comparison) over a handful of small fields per
session; comparing all *N* cached fingerprints before resuming is itself O(N), but N cheap
dict comparisons is nowhere near N HMM inference passes.

**Complexity before:** O(T) HMM inference per dashboard open, T = total sessions ever recorded.
**Complexity after (common case, no session's survey data changed since last open):** O(ΔT)
HMM inference, ΔT = sessions added since last open (typically 1). **Complexity after (a
session's survey data did change):** O(T), same as before — no regression.
This is a *theoretical* improvement — not yet benchmarked on-device.

**Memory impact:** New checkpoint file, roughly the same size class as the pre-existing
`hmm_results.json` + `alse_model_state.json`; grows linearly with session count like those
already do.

**Risks / edge cases:** The fingerprint's correctness depends on it covering every column that
can be rewritten after a session is first recorded. See `docs/DECISIONS.md` → "When this
decision should be reconsidered."

**Concepts learned:** incremental computation vs. full recomputation; cache invalidation via
content fingerprinting rather than timestamp-only checks; why "resume from the last known-good
point" requires the *entire* upstream state (not just the final output) to be checkpointed when
computation is sequential/stateful (EMA baselines, adaptive feature weights).

---

### Change 2: Removed the 1-hour delayed regret survey and retroactive survey features

**Why:** User request — both features removed entirely (not stubbed).

**How:** See `docs/DECISIONS.md` → "Remove the 1-hour delayed regret survey and the
retroactive survey feature" for the full breakdown of what was deleted and why the CSV schema
was deliberately left unchanged.

**Files affected:** `DelayedProbeActivity.kt`, `DelayedProbeReceiver.kt`,
`RetroactiveSurveyActivity.kt` (deleted); `InstaAccessibilityService.kt`, `MainActivity.kt`,
`DashboardActivity.kt`, `MicroProbeActivity.kt`, `AndroidManifest.xml`, `reelio_alse.py`,
`app.jsx`, `DashboardScreen.jsx`, `CalendarScreen.jsx`, `SettingsScreen.jsx` (edited);
`app.bundle.js` (rebuilt via `build_bundle.py`); `README.md`,
`DOOMSCROLLING_METHOD_PIPELINE_FULL_DOC.md` (documentation updated to match).

**Architecture impact:** Simplified the checkpoint fingerprint from Change 1 (see
`docs/DECISIONS.md`) — it no longer needs to track a `retroactive_label_map` overlay, only the
plain survey/label CSV columns.

**Risks / edge cases:** `DelayedRegretScore` and `ComparativeRating` CSV columns remain in the
schema (unused going forward for the former) rather than triggering a schema migration —
intentional, see Decision doc.

**Concepts learned:** removing a feature cleanly means tracing every layer it touches (native
Activity/Receiver → Manifest → JS bridge → Python inference → CSV schema → UI), not just the
entry point; and why "kept but always zero" can be the right call for a column versus a
disruptive schema migration.

---

## Questions you should be able to answer about this session's changes

1. Why did `run_dashboard_payload` used to redo O(T) work on every dashboard open, and what specifically makes the fix O(ΔT) in the common case?
2. Why does the checkpoint use an "all-or-nothing" fallback (any fingerprint mismatch → full replay) instead of resuming from the exact point of a changed session?
3. What's the difference between `alse_model_state.json` and `dashboard_replay_checkpoint.json`, and why does `run_dashboard_payload` not just trust the former directly?
4. Why was the `DelayedRegretScore` CSV column kept instead of removed when the feature that wrote it was deleted?
5. What race condition does `_session_identity_fingerprint` still guard against, now that retroactive labeling is gone?
