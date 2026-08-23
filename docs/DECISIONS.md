# DECISIONS.md

Record of meaningful architectural and algorithmic decisions, per `CLAUDE.md`.
Each entry: Problem → Decision → Alternatives → Why → Complexity → Trade-offs → Consequences → When to reconsider.

---

## Decision: Remove the 1-hour delayed regret survey and the retroactive survey feature

### Problem

The user asked to remove two features: (1) `DelayedProbeActivity`/`DelayedProbeReceiver` — a
prompt that fired exactly 1 hour after a session ended (`schedulePostSessionProbes` in
`InstaAccessibilityService.kt`), asking the user to retrospectively rate their regret; and
(2) `RetroactiveSurveyActivity` — a dashboard-launched flow letting the user add or edit
survey data for *any past* session at any later time, not just once.

### Decision

Both features were deleted outright, not stubbed or feature-flagged:

- Deleted `DelayedProbeActivity.kt`, `DelayedProbeReceiver.kt`, `RetroactiveSurveyActivity.kt`.
- Removed `schedulePostSessionProbes()` (the `AlarmManager` scheduling call) and its call site
  in `InstaAccessibilityService.kt`.
- Removed the `toggleDelayedSurveys`/`getDelayedSurveysDisabled` and `openRetroactiveSurvey`
  JS-bridge methods from `MainActivity.kt` and `DashboardActivity.kt`, plus the
  `drainPendingRetroactiveLabel`/`mergePendingRetroactiveLabelIntoPayload` plumbing that carried
  a retroactively-submitted label into the dashboard payload.
- Removed the corresponding `<activity>`/`<receiver>` entries from `AndroidManifest.xml`.
- Removed `apply_delayed_label()` and the `retroactive_label_map` construction/lookup/overlay
  logic from `reelio_alse.py`'s `run_dashboard_payload`.
- Removed the "Enable late surveying" toggle from `SettingsScreen.jsx`, the "Label this
  session" button and retroactive-label polling/caching from `DashboardScreen.jsx` and
  `app.jsx`, and the "Retroactively Labeled" badge text from `CalendarScreen.jsx`.
- **Kept the `DelayedRegretScore` and `ComparativeRating` CSV columns** rather than migrating
  the schema. Every write site now writes `DelayedRegretScore = 0` explicitly. `ComparativeRating`
  is untouched — it's also written by the *immediate* post-session survey (`MicroProbeActivity`,
  Step 3), which was not part of this removal.

### Alternatives considered

| Approach | Notes |
|---|---|
| Feature-flag it off (keep code, gate behind a disabled toggle) | Rejected — the user asked to remove the feature, not hide it; dead-but-present code paths (unused Activities, unreachable bridge methods) are exactly the kind of thing that rots and confuses later. |
| Migrate the CSV schema to drop the now-dead columns | Rejected — bumping `SCHEMA_VERSION` and the fixed `EXPECTED_CSV_COLUMNS` count touches every CSV read/write path and every historical file already on a user's device. The columns cost nothing sitting at a constant `0`; a schema migration is a real, separately-justified project on its own, not a natural consequence of removing two UI features. |

### Complexity / consequences

No complexity-relevant change — this was a deletion, not an optimization. The main
consequence worth flagging: it **simplified** the incremental dashboard-replay caching work
done earlier in this session (see the "Incremental dashboard-replay checkpointing" decision
above). That caching design originally had to defend against retroactive label edits rewriting
a session's data out from under an already-cached result — that risk is now structurally gone
for *new* data (labels are written once, shortly after a session ends, and never rewritten
again). The per-session fingerprint check was kept anyway, because a **different**, unrelated
race still exists: the *immediate* post-session survey (`MicroProbeActivity`) patches a
session's CSV row asynchronously, 30-45 seconds after the session ends, and the dashboard can
be opened before that patch lands.

### When this decision should be reconsidered

If a future feature reintroduces any mechanism that rewrites a session's survey/label columns
after the fact (bulk CSV import, a new correction flow, etc.), re-check
`_session_identity_fingerprint()` in `reelio_alse.py` — it only fingerprints the columns that
were mutable under the old features (`PostSessionRating`, `RegretScore`, `MoodBefore`,
`MoodAfter`, `IntendedAction`, `ActualVsIntendedMatch`, `ComparativeRating`); a new mutable
field would need to be added there too, or the replay cache could silently serve stale results.

---

## Decision: Incremental dashboard-replay checkpointing (fast reload pipeline)

### Problem

Opening the dashboard (`MainActivity` on cold start, `DashboardActivity` on resume) got slower as more Instagram usage was logged, and the slowdown was unbounded — it kept getting worse the longer the app was used.

**Confirmed root cause**, traced through the actual code:

- `MainActivity.injectDataWithDebounce` ([MainActivity.kt:259-334](../app/src/main/java/com/example/instatracker/MainActivity.kt#L259-L334)) reads the entire `insta_data.csv` and unconditionally calls `reelio_alse.run_dashboard_payload(...)` on every open — no cache check at all.
- `DashboardActivity` does have a cache (`hmm_results.json`, gated by `isCacheValid` at [DashboardActivity.kt:265-311](../app/src/main/java/com/example/instatracker/DashboardActivity.kt#L265-L311)), but it's invalidated by `hmmFile.lastModified() < csvFile.lastModified()` — and the CSV is appended to on essentially every reel, so in practice this check almost always fails and forces a recompute.
- Inside `run_dashboard_payload` ([reelio_alse.py:2491](../app/src/main/python/reelio_alse.py#L2491)), every call:
  1. Parses the **entire** CSV history with pandas (cheap — just parsing).
  2. Groups it into every session ever recorded.
  3. Instantiates **fresh** `ReelioCLSE()`, `UserBaseline()`, `RegimeDetector()`, `DoomScorer()` objects — i.e. it does **not** warm-start from the persisted `alse_model_state.json`, even though that file exists and is fully populated.
  4. Sequentially replays **every session, in order**, through `model.process_session(...)` — the expensive part (Baum-Welch/EM-style HMM inference, matrix exponentials for the CTMC gap decay, KL-divergence based feature reweighting).

This is O(T) HMM work, where T = total sessions ever recorded, on every single dashboard open — not O(new sessions since last open). That is the actual bug: an algorithmic one, not a hardware limitation.

### Why is it built this way? (an important constraint, not an oversight)

The codebase already has a genuinely incremental, O(1)-per-session path: `run_inference_on_latest` ([reelio_alse.py:2327](../app/src/main/python/reelio_alse.py#L2327)) calls `load_full_state()`, processes only the **latest** session, and calls `save_full_state()` — this is what the background `InstaAccessibilityService` uses for near-real-time scoring after each session ends.

`run_dashboard_payload` deliberately does **not** trust that same checkpoint for its own replay. The reason, confirmed by the comment at [reelio_alse.py:2955-2957](../app/src/main/python/reelio_alse.py#L2955-L2957) ("*picks up from where the full dashboard replay ended*"): the dashboard replay is the **canonical, ground-truth pass** — it recomputes from the raw CSV and then overwrites `alse_model_state.json` so the lightweight live path has something trustworthy to continue from. The live path is allowed to be a cheap approximation between dashboard opens; the dashboard itself is not.

This matters because Reelio supports **retroactive labeling** — a delayed regret/mood survey can arrive up to ~1 hour after a session and rewrite that session's supervised label ([`apply_delayed_label`](../app/src/main/python/reelio_alse.py#L2245), [`RetroactiveSurveyActivity.kt`](../app/src/main/java/com/example/instatracker/RetroactiveSurveyActivity.kt)). Because the HMM's feature weights are learned via KL-divergence across the **entire** session history (Pillar 2 in `REELIO_APP_TECHNICAL_REFERENCE.md`), a label change on session #5 can legitimately change how the model weighs `rewatch_intensity` for every session after it. A naive "just resume from the last new session" cache would silently stop re-incorporating that kind of retroactive correction — a real behavioral regression for an app whose stated design philosophy is "human subjective reality always overrides kinematic inference" (`MODEL_COMPUTATION_GUIDE.md`, Part 5).

### Decision

Add a **separate, dashboard-only checkpoint** (`dashboard_replay_checkpoint.json`, distinct from `alse_model_state.json` so the live incremental path and the dashboard replay never cross-contaminate each other's state) that stores, after every full or partial replay:

- The exact model/baseline/detector/scorer state as of the last processed session (same serialization shape as `save_full_state`/`load_full_state`, reused).
- The already-computed per-session `results` list and the loop's running aggregates (`sess_labels`, `historical_agg`, `total_st_weight`, `p_capture_timeline`, `session_circadian`) needed to keep building the payload without re-deriving them.
- A **fingerprint** per already-processed session: row count, start time, and the 8 survey/label columns that retroactive labeling can change, folded together with any pending `retroactive_label_map` overlay for that session.

On the next call:

1. Compare the live CSV's first *N* sessions (N = however many the checkpoint covers) against the checkpoint's stored fingerprints.
2. **All match →** fast path. Skip re-running the HMM on those *N* sessions entirely; seed the loop state from the checkpoint and only call `model.process_session(...)` for genuinely new sessions (almost always exactly 1 — the session that just triggered opening the dashboard).
3. **Any mismatch (including "no checkpoint yet") →** fall back to exactly today's behavior: full replay from session 0. This is the existing, already-correct code path — nothing about it changes.

This is a binary, all-or-nothing validity check (not "resume from the point of the first changed session") — deliberately, see Trade-offs below.

### Alternatives considered

| Approach | Complexity | Notes |
|---|---|---|
| **A. Do nothing / just add a Kotlin-side file cache** | No change to O(T) | Doesn't fix the actual bug — any new session still forces a full O(T) HMM replay, and the existing `isCacheValid` mtime check already tried this and is defeated by the CSV being appended constantly. |
| **B. Resume from the exact point of divergence** (checkpoint state *per session*, not just the latest) | O(ΔT) always, even when a label changed mid-history | Would need a checkpoint saved after **every** session (not just after the last replay), and would still need to answer "which downstream sessions' weight-learning does this label change actually affect" — the honest answer is *all of them*, via the KL-divergence reweighting, so a truly correct partial-resume isn't meaningfully cheaper than a full replay once you account for it properly. Rejected: adds real complexity for a benefit that mostly evaporates once you handle correctness honestly. |
| **C. Trust `alse_model_state.json` directly for the dashboard too** (drop the "canonical vs. live" separation) | O(ΔT) | Rejected: this is exactly the risk flagged above — the live path's cheaper, approximate updates would leak into what's supposed to be the ground-truth recompute, and retroactive labels applied via `apply_delayed_label` only update two fields (`running_disagreement`, `regret_validator`), not the full model/baseline — so trusting it wholesale would silently drop other historical corrections. |
| **D. (Chosen) Separate checkpoint + fingerprint validity + all-or-nothing fallback** | O(ΔT) in the common case, O(T) only when a historical label actually changed | Preserves the existing full-replay code path byte-for-byte as the fallback (low risk — if the fast path has a bug, the worst case is "as slow as today," never "wrong"). Correctness-first, with the expensive path reserved for the case that actually needs it. |

### Complexity

- **Before:** O(T) HMM inference every dashboard open, T = total sessions ever recorded. Grows without bound as usage accumulates — this is the reported symptom.
- **After (common case — no session was retroactively relabeled since the last open):** O(ΔT) HMM inference, where ΔT = sessions added since the last dashboard open (typically 1). The O(T) cost that remains (CSV parsing, fingerprint comparison, JSON re-serialization) is comparatively cheap — it's arithmetic and I/O, not Baum-Welch/EM — but is *not* eliminated, and is a known, accepted remaining cost (see "When to reconsider").
- **After (label-change case):** O(T), identical to today. No regression versus current behavior.

This is a **theoretical** complexity change, not yet benchmarked — per CLAUDE.md rule 19, I have not measured before/after wall-clock time on-device. The theoretical case is strong (the dominant cost, per-session HMM inference, is confirmed skipped for cached sessions), but it should be verified against real usage before being reported as a measured improvement.

### Space (memory/storage)

New checkpoint file `dashboard_replay_checkpoint.json` duplicates most of what `hmm_results.json` already stores (the `results` array) plus the serialized model/baseline/detector state (same size class as the existing `alse_model_state.json`). This grows roughly linearly with session count, same as `hmm_results.json` already does today — not a new category of unbounded growth, just one more file of a size Reelio already tolerates.

### Trade-offs

- **All-or-nothing invalidation vs. partial resume:** a single retroactive label anywhere in history forces a full O(T) replay, exactly like today — no regression, but no improvement for that specific case either. Chosen deliberately (see Alternative B) because a granular version would add real complexity for a case that, per the app's own architecture, needs the full history anyway.
- **Two state files instead of one:** `alse_model_state.json` (live/approximate) and `dashboard_replay_checkpoint.json` (canonical/replay) now exist side by side, with some duplicated concepts (both hold a serialized model/baseline/detector/scorer). This is intentional isolation, not accidental duplication — but it is one more piece of persisted state to reason about.
- **Fingerprint correctness depends on which columns can retroactively change.** The fingerprint currently covers the 8 survey/label columns plus the `retroactive_label_map` overlay. If a future change introduces another retroactively-editable field that influences `process_session`, it must be added to `_session_identity_fingerprint` or this cache will serve stale results for that field. This is a real, load-bearing assumption — documented here so it doesn't get missed later.

### Consequences

- Dashboard open time should now scale with *how much changed since last open*, not with total historical usage — directly addresses the reported symptom.
- The already-existing, already-correct full-replay code path is preserved unchanged as the fallback; the new code is additive (checkpoint load/save + a validity check) rather than a rewrite of the replay loop's internals.
- `MainActivity.kt`'s `injectDataWithDebounce` also gains the same cache-validity gate `DashboardActivity` already has, so a dashboard open with zero new data avoids even starting the Python interpreter where possible.

### When this decision should be reconsidered

- If a future feature makes retroactive edits **common** (e.g. bulk historical relabeling, CSV import/merge) rather than rare, the "any mismatch → full replay" fallback would fire often and the cache would stop paying for itself — that's when Alternative B (per-session checkpointing) becomes worth its added complexity.
- If T grows large enough that even the "cheap" remaining O(T) work (CSV parsing, fingerprint comparison over the full history, JSON serialization of the full `results` array) becomes the new bottleneck, the next target is making the CSV→session-list step itself incremental (e.g. only parsing CSV rows appended since the last known file offset) rather than re-parsing the whole file every time.
