"""
Synthetic long-term validation harness for Reelio ALSE.

This script generates schema-accurate synthetic CSV datasets and then
cross-verifies model output against expected scenario behavior.

Key goals:
- Match the exact REQUIRED_COLUMNS schema.
- Simulate correlated behavioral signals.
- Support long-horizon drift scenarios (improving vs worsening).
- Validate expected-vs-observed trends using run_dashboard_payload and run_full_pipeline.
"""

from __future__ import annotations

import argparse
import io
import json
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Tuple

import numpy as np
import pandas as pd

from reelio_alse import (
    DOOM_PROBABILITY_THRESHOLD,
    EXPECTED_SCHEMA_VERSION,
    REQUIRED_COLUMNS,
    run_dashboard_payload,
    run_full_pipeline,
)


HIGH_RISK_INTENTS = [
    "Stressed / Avoidance",
    "Bored / Nothing to do",
    "Procrastinating something",
]

LOW_RISK_INTENTS = [
    "Quick break (intentional)",
    "Specific content lookup",
]

NEUTRAL_INTENTS = [
    "Habit / autopilot",
    "No clear reason",
]

PREVIOUS_CONTEXTS = [
    "Work / Study",
    "Boredom",
    "After meal",
    "Before sleep",
    "Transit",
]

AUDIO_OUTPUTS = ["SPEAKER", "WIRED", "BLUETOOTH"]


def _safe_mean(values: List[float], default: float = 0.0) -> float:
    if not values:
        return float(default)
    return float(np.mean(values))


def _to_jsonable(obj):
    if isinstance(obj, dict):
        return {k: _to_jsonable(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_to_jsonable(v) for v in obj]
    if isinstance(obj, tuple):
        return tuple(_to_jsonable(v) for v in obj)
    if isinstance(obj, np.generic):
        return obj.item()
    return obj


@dataclass
class CalibrationProfile:
    session_reels_mu: float = 22.0
    session_reels_sigma: float = 8.0
    dwell_mu: float = 7.0           # real mean=6.9s
    dwell_sigma: float = 6.8        # real std=6.8s
    speed_mu: float = 10.4          # real mean (capped outliers at 30)
    speed_sigma: float = 8.0        # real std is wide
    gap_q10: float = 6.0
    gap_q50: float = 35.0
    gap_q90: float = 240.0
    exit_rate_base: float = 0.06
    rewatch_rate_base: float = 0.08

    # 24-element hour probabilities
    weekday_hour_probs: np.ndarray = field(default_factory=lambda: np.ones(24, dtype=float) / 24.0)
    weekend_hour_probs: np.ndarray = field(default_factory=lambda: np.ones(24, dtype=float) / 24.0)


@dataclass
class ScenarioEval:
    scenario: str
    sessions_generated: int
    sessions_scored: int
    mean_first_window: float
    mean_last_window: float
    delta_last_minus_first: float
    model_confidence: float
    model_confidence_pipeline: float
    night_mean_doom: float
    day_mean_doom: float
    session_transition_matrix: List[List[float]]
    checks: Dict[str, bool]
    notes: Dict[str, float]


def _load_csv_with_optional_schema_prefix(csv_path: Path) -> pd.DataFrame:
    text = csv_path.read_text(encoding="utf-8")
    lines = text.splitlines()
    if lines and lines[0].startswith("SCHEMA_VERSION="):
        text = "\n".join(lines[1:])
    return pd.read_csv(io.StringIO(text))


def load_calibration_profile(calibration_csv: Path | None) -> CalibrationProfile:
    profile = CalibrationProfile()
    if calibration_csv is None or not calibration_csv.exists():
        return profile

    try:
        df = _load_csv_with_optional_schema_prefix(calibration_csv)
        if "StartTime" not in df.columns:
            return profile

        # Session-level aggregates
        dt = pd.to_datetime(df["StartTime"], errors="coerce")
        df = df.copy()
        df["_dt"] = dt
        df = df[df["_dt"].notna()]
        if len(df) == 0:
            return profile

        df["_session_key"] = df["_dt"].dt.strftime("%Y-%m-%d") + "__" + df["SessionNum"].astype(str)

        session_stats: List[Tuple[int, float, float, float]] = []
        gaps: List[float] = []
        for _, s_df in df.groupby("_session_key"):
            if "CumulativeReels" in s_df.columns:
                reels = int(pd.to_numeric(s_df["CumulativeReels"], errors="coerce").dropna().nunique())
            else:
                reels = int(len(s_df))
            reels = max(1, reels)

            dwell_vals = pd.to_numeric(s_df.get("DwellTime", 0.0), errors="coerce").fillna(0.0).values
            speed_vals = pd.to_numeric(s_df.get("AvgScrollSpeed", 0.0), errors="coerce").fillna(0.0).values
            exit_vals = pd.to_numeric(s_df.get("AppExitAttempts", 0.0), errors="coerce").fillna(0.0).values
            rewatch_vals = pd.to_numeric(s_df.get("BackScrollCount", 0.0), errors="coerce").fillna(0.0).values

            mean_dwell = float(np.mean(dwell_vals)) if len(dwell_vals) else 0.0
            mean_speed = float(np.mean(speed_vals)) if len(speed_vals) else 0.0
            exit_rate = float(np.sum(exit_vals) / reels)
            rewatch_rate = float(np.sum(rewatch_vals) / reels)
            session_stats.append((reels, mean_dwell, mean_speed, exit_rate))
            profile.rewatch_rate_base = float(np.mean([profile.rewatch_rate_base, rewatch_rate]))

            if "TimeSinceLastSessionMin" in s_df.columns:
                g = pd.to_numeric(s_df["TimeSinceLastSessionMin"], errors="coerce").fillna(0.0).iloc[0]
                if g > 0:
                    gaps.append(float(g))

        if session_stats:
            reels_all = [x[0] for x in session_stats]
            dwell_all = [x[1] for x in session_stats if x[1] > 0]
            speed_all = [x[2] for x in session_stats if x[2] > 0]
            exit_all = [x[3] for x in session_stats]

            profile.session_reels_mu = float(np.clip(np.mean(reels_all), 8.0, 60.0))
            profile.session_reels_sigma = float(np.clip(np.std(reels_all), 3.0, 30.0))
            profile.dwell_mu = float(np.clip(_safe_mean(dwell_all, profile.dwell_mu), 0.8, 8.0))
            profile.dwell_sigma = float(np.clip(np.std(dwell_all) if len(dwell_all) > 1 else profile.dwell_sigma, 0.5, 4.0))
            profile.speed_mu = float(np.clip(_safe_mean(speed_all, profile.speed_mu), 2.0, 15.0))
            profile.speed_sigma = float(np.clip(np.std(speed_all) if len(speed_all) > 1 else profile.speed_sigma, 0.5, 6.0))
            profile.exit_rate_base = float(np.clip(_safe_mean(exit_all, profile.exit_rate_base), 0.01, 0.35))

        if len(gaps) >= 5:
            profile.gap_q10 = float(np.clip(np.quantile(gaps, 0.10), 1.0, 240.0))
            profile.gap_q50 = float(np.clip(np.quantile(gaps, 0.50), 2.0, 720.0))
            profile.gap_q90 = float(np.clip(np.quantile(gaps, 0.90), 5.0, 2880.0))

        # Hour-of-day distributions
        df["_hour"] = df["_dt"].dt.hour
        df["_is_weekend"] = df["_dt"].dt.weekday >= 5

        # Collapse to one timestamp per session to avoid per-reel overweighting
        sess_starts = df.sort_values("_dt").groupby("_session_key").first().reset_index()

        weekday_hist = np.ones(24, dtype=float)
        weekend_hist = np.ones(24, dtype=float)

        for _, row in sess_starts.iterrows():
            h = int(row["_hour"])
            if bool(row["_is_weekend"]):
                weekend_hist[h] += 1.0
            else:
                weekday_hist[h] += 1.0

        profile.weekday_hour_probs = weekday_hist / weekday_hist.sum()
        profile.weekend_hour_probs = weekend_hist / weekend_hist.sum()

    except Exception as exc:
        print(f"CALIBRATION_WARNING: Failed to parse calibration CSV ({exc}). Using defaults.")

    return profile


def _java_day_of_week(dt: datetime) -> int:
    # Java Calendar mapping: Sunday=1 ... Saturday=7
    # Python weekday: Monday=0 ... Sunday=6
    return ((dt.weekday() + 1) % 7) + 1


def _time_period_from_hour(hour: int) -> str:
    if 5 <= hour < 12:
        return "Morning"
    if 12 <= hour < 17:
        return "Afternoon"
    if 17 <= hour < 22:
        return "Evening"
    if 22 <= hour or hour < 2:
        return "Night"
    return "Late Night"


def _clip(value: float, low: float, high: float) -> float:
    return float(np.clip(value, low, high))


def _scenario_risk(scenario: str, idx: int, total: int, rng: np.random.Generator) -> float:
    denom = max(1, total - 1)
    t = idx / denom

    if scenario == "improving":
        base = 0.82 - 0.62 * t
    elif scenario == "worsening":
        base = 0.24 + 0.62 * t
    elif scenario == "late_night_clusters":
        base = 0.52 + 0.18 * np.sin(2 * np.pi * t * 2.0)
    elif scenario == "stable_casual":
        base = 0.22 + 0.06 * np.sin(2 * np.pi * t)
    else:
        base = 0.50

    noise = rng.normal(0.0, 0.05)
    return _clip(base + noise, 0.05, 0.95)


def _sample_gap_minutes(risk: float, profile: CalibrationProfile, rng: np.random.Generator) -> float:
    # High risk -> shorter gap, low risk -> longer gap.
    target = np.interp(risk, [0.0, 1.0], [profile.gap_q90, profile.gap_q10])
    jitter = float(rng.lognormal(mean=0.0, sigma=0.45))
    return _clip(target * jitter, 1.0, 2880.0)


def _sample_target_hour(
    is_weekend: bool,
    scenario: str,
    risk: float,
    profile: CalibrationProfile,
    rng: np.random.Generator,
) -> int:
    probs = profile.weekend_hour_probs.copy() if is_weekend else profile.weekday_hour_probs.copy()

    if scenario == "late_night_clusters":
        night_boost = np.array([1.8 if (h >= 21 or h <= 2) else 0.7 for h in range(24)], dtype=float)
        weekend_amp = 1.3 if is_weekend else 1.0
        probs *= night_boost * weekend_amp
    else:
        # General risk influence: higher risk nudges toward evening/night.
        night_bias = np.array([1.0 + 0.7 * risk if (h >= 20 or h <= 1) else 1.0 for h in range(24)], dtype=float)
        probs *= night_bias

    probs = np.clip(probs, 1e-6, None)
    probs /= probs.sum()
    return int(rng.choice(np.arange(24), p=probs))


def _sample_intended_action(risk: float, scenario: str, rng: np.random.Generator) -> str:
    if scenario == "stable_casual":
        pool = LOW_RISK_INTENTS + ["Quick break (intentional)"]
        return str(rng.choice(pool))

    if risk >= 0.70:
        return str(rng.choice(HIGH_RISK_INTENTS))
    if risk <= 0.30:
        return str(rng.choice(LOW_RISK_INTENTS))
    return str(rng.choice(NEUTRAL_INTENTS + LOW_RISK_INTENTS + HIGH_RISK_INTENTS))


def _compute_slope(values: List[float]) -> float:
    if len(values) < 2:
        return 0.0
    x = np.arange(len(values), dtype=float)
    y = np.array(values, dtype=float)
    slope = np.polyfit(x, y, 1)[0]
    return float(slope)


def _build_session_rows(
    session_num: int,
    start_dt: datetime,
    gap_min: float,
    risk: float,
    profile: CalibrationProfile,
    scenario: str,
    rng: np.random.Generator,
    battery_start: float,
) -> Tuple[List[Dict[str, object]], datetime, float]:
    # Session context
    hour = start_dt.hour
    time_period = _time_period_from_hour(hour)
    day_of_week = _java_day_of_week(start_dt)
    is_weekend = 1 if day_of_week in (1, 7) else 0
    circadian_phase = (hour + start_dt.minute / 60.0) / 24.0
    is_dark_window = hour >= 21 or hour < 6

    # Strengthen explicit circadian pattern for the late-night stress scenario.
    # Night sessions are intentionally generated as higher-risk than daytime sessions.
    if scenario == "late_night_clusters":
        if is_dark_window:
            risk = _clip(risk + 0.22, 0.05, 0.98)
        elif 10 <= hour <= 17:
            risk = _clip(risk - 0.12, 0.05, 0.98)

    # Session length: longer when risk is higher.
    reels_center = profile.session_reels_mu * (0.75 + 1.05 * risk)
    n_reels = int(np.clip(np.round(rng.normal(reels_center, profile.session_reels_sigma * 0.45)), 3, 220))

    base_dwell = profile.dwell_mu * (1.35 - 0.95 * risk)  # higher risk => lower dwell
    base_speed = profile.speed_mu * (0.85 + 1.05 * risk)  # higher risk => faster swipes

    # Session-level relationships
    session_entropy = _clip(3.5 - 2.3 * risk + rng.normal(0.0, 0.2), 0.15, 4.0)
    session_rewatch_rate = _clip(profile.rewatch_rate_base * (0.6 + 2.5 * risk), 0.0, 0.8)
    session_exit_rate = _clip(profile.exit_rate_base * (0.6 + 2.8 * risk), 0.0, 0.8)

    # Higher risk gives stronger negative trend in dwell over the session.
    trend_strength = _clip(0.05 + 0.55 * risk + rng.normal(0.0, 0.05), 0.0, 0.9)

    # Survey consistency with behavioral risk.
    post_session_rating = int(np.clip(np.round(5.0 - 4.0 * risk + rng.normal(0.0, 0.5)), 1, 5))
    regret_score = int(np.clip(np.round(1.0 + 4.0 * risk + rng.normal(0.0, 0.5)), 1, 5))
    delayed_regret = int(np.clip(np.round(1.0 + 4.0 * (0.85 * risk + 0.15 * rng.random()) + rng.normal(0.0, 0.4)), 1, 5))
    # ComparativeRating: 5 = "much better than usual", 1 = "much worse than usual".
    # High risk sessions should be rated as worse → invert the risk mapping.
    comparative_rating = int(np.clip(np.round(5.0 - 4.0 * risk + rng.normal(0.0, 0.7)), 1, 5))

    intended_action = _sample_intended_action(risk, scenario, rng)

    # MoodBefore uses encoded values expected by normalize_prestate_risk.
    if risk >= 0.8:
        mood_before = int(rng.choice([7, 10]))
    elif risk >= 0.5:
        mood_before = int(rng.choice([6, 7]))
    elif risk >= 0.25:
        mood_before = int(rng.choice([2, 6]))
    else:
        mood_before = int(rng.choice([1, 2]))

    # MoodAfter uses 1..5 style affective level in current model amplifiers.
    mood_after = int(np.clip(np.round(5.0 - 3.5 * risk + rng.normal(0.0, 0.6)), 1, 5))
    mood_delta = int(np.clip(np.round((3.0 - risk * 3.0) - (mood_after - 3.0)), -4, 4))

    low_risk_intent_used = intended_action in LOW_RISK_INTENTS
    actual_vs_intended = 0 if (low_risk_intent_used and risk >= 0.65) else 2

    # Night context is stronger in late-night scenario.
    lux_base = 12.0 if is_dark_window else 75.0
    if scenario == "late_night_clusters" and is_dark_window:
        lux_base = 6.0

    ambient_lux_start = _clip(lux_base + rng.normal(0.0, 12.0), 0.0, 300.0)

    rows: List[Dict[str, object]] = []
    dwell_values: List[float] = []

    t_cursor = start_dt
    likes_total = 0
    comments_total = 0
    shares_total = 0
    saves_total = 0

    cumulative_reels = 0

    for reel_idx in range(1, n_reels + 1):
        cumulative_reels += 1

        # Negative drift by index; stronger when risk is high.
        rel = (reel_idx - 1) / max(1, n_reels - 1)
        trend_factor = 1.0 - trend_strength * rel
        dwell = _clip(base_dwell * trend_factor + rng.normal(0.0, profile.dwell_sigma * 0.25), 0.20, 45.0)
        speed = _clip(base_speed * (1.0 + 0.15 * rel * risk) + rng.normal(0.0, profile.speed_sigma * 0.25), 0.5, 30.0)

        dwell_values.append(dwell)

        is_ad = 1 if rng.random() < (0.07 + 0.06 * risk) else 0
        app_exit_attempt = 1 if rng.random() < session_exit_rate else 0
        back_scroll = int(rng.poisson(session_rewatch_rate))

        # Dead columns — always zero in real data
        liked = 0
        commented = 0
        shared = 0
        saved = 0

        likes_total += liked
        comments_total += commented
        shares_total += shared
        saves_total += saved

        scroll_pause_count = int(rng.poisson(0.15 + 0.55 * risk))
        pause_ms = int(scroll_pause_count * _clip(rng.normal(600.0, 220.0), 150.0, 2600.0))

        swipe_completion = _clip(0.95 - 0.45 * risk + rng.normal(0.0, 0.10), 0.10, 1.00)
        max_speed = _clip(speed * (1.0 + abs(rng.normal(0.18, 0.20))), speed, 45.0)

        start_time = t_cursor
        end_time = start_time + timedelta(seconds=float(dwell))
        t_cursor = end_time

        rolling = np.array(dwell_values, dtype=float)
        rolling_mean = float(np.mean(rolling))
        rolling_std = float(np.std(rolling))

        row = {
            "SessionNum": session_num,
            "ReelIndex": reel_idx,
            "StartTime": start_time.strftime("%Y-%m-%d %H:%M:%S"),
            "EndTime": end_time.strftime("%H:%M:%S"),
            "DwellTime": round(float(dwell), 3),
            "TimePeriod": time_period,
            "AvgScrollSpeed": round(float(speed), 3),
            "MaxScrollSpeed": round(float(max_speed), 3),
            "RollingMean": round(rolling_mean, 3),
            "RollingStd": round(rolling_std, 3),
            "CumulativeReels": cumulative_reels,
            "ScrollStreak": reel_idx if rng.random() < 0.6 else max(0, reel_idx - 2),
            "Liked": 0,
            "Commented": 0,
            "Shared": 0,
            "Saved": 0,
            "LikeLatency": -1,
            "CommentLatency": -1,
            "ShareLatency": -1,
            "SaveLatency": -1,
            "InteractionDwellRatio": 0,
            "ScrollDirection": 1,
            "BackScrollCount": back_scroll,
            "ScrollPauseCount": scroll_pause_count,
            "ScrollPauseDurationMs": pause_ms,
            "SwipeCompletionRatio": round(float(swipe_completion), 3),
            "HasCaption": 1 if rng.random() < 0.90 else 0,
            "CaptionExpanded": 1 if rng.random() < (0.07 + 0.09 * (1.0 - risk)) else 0,
            "HasAudio": 1 if rng.random() < 0.85 else 0,
            "IsAd": is_ad,
            "AdSkipLatencyMs": int(_clip(rng.normal(1000.0 + 900.0 * risk, 650.0), 120.0, 12000.0)) if is_ad else -1,
            "AppExitAttempts": app_exit_attempt,
            "ReturnLatencyS": round(float(_clip(rng.normal(4.0, 2.5), 0.0, 40.0)), 2) if app_exit_attempt else 0.0,
            "NotificationsDismissed": 0,
            "NotificationsActedOn": 0,
            "ProfileVisits": 1 if rng.random() < (0.01 + 0.03 * (1.0 - risk)) else 0,
            "ProfileVisitDurationS": round(float(_clip(rng.normal(4.0, 2.0), 0.0, 40.0)), 2),
            "HashtagTaps": 1 if rng.random() < (0.005 + 0.02 * (1.0 - risk)) else 0,
            "AmbientLuxStart": round(float(ambient_lux_start), 2),
            "AmbientLuxEnd": round(float(_clip(ambient_lux_start + rng.normal(0.0, 14.0), 0.0, 300.0)), 2),
            "LuxDelta": 0.0,  # backfilled below
            "IsScreenInDarkRoom": 1 if ambient_lux_start < 15 else 0,
            "AccelVariance": round(float(_clip(rng.normal(0.05 + 0.08 * risk, 0.04), 0.0, 1.2)), 4),
            "MicroMovementRms": 0,
            "PostureShiftCount": int(rng.poisson(0.2 + 0.8 * risk)),
            "IsStationary": 1 if rng.random() < (0.6 + 0.3 * risk) else 0,
            "DeviceOrientation": 1,  # always portrait in real data
            "BatteryStart": round(float(battery_start), 1),
            "BatteryDeltaPerSession": 0.0,  # backfilled per session
            "IsCharging": 1 if rng.random() < 0.46 else 0,  # real=46%
            "Headphones": 0,
            "AudioOutputType": "SPEAKER",
            "PreviousApp": "unknown",
            "PreviousAppDurationS": 0,
            "PreviousAppCategory": "unknown",
            "DirectLaunch": 0,
            "TimeSinceLastSessionMin": round(float(gap_min), 2),
            "DayOfWeek": day_of_week,
            "IsHoliday": 0,
            "ScreenOnCount1hr": 0,
            "ScreenOnDuration1hr": 0,
            "NightMode": 1,  # always 1 in real data
            "DND": 0,
            "SessionTriggeredByNotif": 0,
            "DwellTimeZscore": 0.0,  # backfilled below
            "DwellTimePctile": 0.0,  # backfilled below
            "DwellAcceleration": 0.0,  # backfilled below
            "SessionDwellTrend": 0.0,  # backfilled below
            "EarlyVsLateRatio": 0.0,  # backfilled below
            "InteractionRate": 0.0,  # backfilled below
            "InteractionBurstiness": 0,
            "LikeStreakLength": 0,  # backfilled below
            "InteractionDropoff": 0.0,  # backfilled below
            "SavedWithoutLike": 0,
            "CommentAbandoned": 0,
            "ScrollIntervalCV": round(float(_clip(rng.normal(1.9 - 0.9 * risk, 0.45), 0.2, 5.0)), 4),
            "ScrollBurstDuration": int(np.clip(np.round(rng.normal(260.0 + 140.0 * risk, 95.0)), 20, 1500)),
            "InterBurstRestDuration": int(np.clip(np.round(rng.normal(210.0 - 70.0 * risk, 80.0)), 5, 1200)),
            "ScrollRhythmEntropy": round(float(session_entropy + rng.normal(0.0, 0.12)), 4),
            "UniqueAudioCount": int(np.clip(np.round(rng.normal(2.5 + 2.0 * (1.0 - risk), 1.8)), 1, 20)),
            "RepeatContentFlag": 0,
            "ContentRepeatRate": 0,
            "CircadianPhase": round(float(circadian_phase), 4),
            "SleepProxyScore": 0,
            "EstimatedSleepDurationH": 0,
            "ConsistencyScore": 0,
            "IsWeekend": 0,
            "After closing Instagram I feel...": post_session_rating,
            "Why are you opening this?": intended_action,
            "ActualVsIntendedMatch": actual_vs_intended,
            "Did this session go as intended?": regret_score,
            "Right now I feel...": mood_before,
            "MoodAfter": mood_after,
            "MoodDelta": 0,
            "SleepStart": 23,
            "SleepEnd": 7,
            "What were you just doing?": str(rng.choice(PREVIOUS_CONTEXTS)),
            "DelayedRegretScore": 0,
            "This session was...": comparative_rating,
            "MorningRestScore": 0,
        }

        rows.append(row)

    # Session-level derived backfill
    session_dwell = np.array([float(r["DwellTime"]) for r in rows], dtype=float)
    dwell_mu = float(np.mean(session_dwell))
    dwell_sig = float(np.std(session_dwell)) if len(session_dwell) > 1 else 1.0
    dwell_sig = max(dwell_sig, 1e-6)

    slope = _compute_slope(session_dwell.tolist())
    early = session_dwell[: max(1, len(session_dwell) // 2)]
    late = session_dwell[max(1, len(session_dwell) // 2) :]
    early_late_ratio = float(np.mean(early) / max(np.mean(late), 1e-6)) if len(late) else 1.0

    # Interaction trend
    first_half = rows[: max(1, len(rows) // 2)]
    second_half = rows[max(1, len(rows) // 2) :]
    first_int = sum(int(r["Liked"]) + int(r["Commented"]) + int(r["Shared"]) + int(r["Saved"]) for r in first_half)
    second_int = sum(int(r["Liked"]) + int(r["Commented"]) + int(r["Shared"]) + int(r["Saved"]) for r in second_half)
    interaction_dropoff = float((first_int - second_int) / max(1, len(rows)))

    like_streak = 0
    current_streak = 0
    for idx, row in enumerate(rows):
        d = float(row["DwellTime"])
        z = (d - dwell_mu) / dwell_sig
        pct = 100.0 * (np.sum(session_dwell <= d) / len(session_dwell))
        accel = d - float(rows[idx - 1]["DwellTime"]) if idx > 0 else 0.0

        interactions_here = int(row["Liked"]) + int(row["Commented"]) + int(row["Shared"]) + int(row["Saved"])
        interaction_rate = interactions_here / max(1, idx + 1)

        if int(row["Liked"]) == 1:
            current_streak += 1
        else:
            current_streak = 0
        like_streak = max(like_streak, current_streak)

        row["DwellTimeZscore"] = round(float(z), 3)
        row["DwellTimePctile"] = round(float(pct), 2)
        row["DwellAcceleration"] = round(float(accel), 3)
        row["SessionDwellTrend"] = round(float(slope), 4)
        row["EarlyVsLateRatio"] = round(float(early_late_ratio), 3)
        row["InteractionRate"] = round(float(interaction_rate), 4)
        row["LikeStreakLength"] = like_streak
        row["InteractionDropoff"] = round(float(interaction_dropoff), 4)

        lux_end = float(row["AmbientLuxEnd"])
        row["LuxDelta"] = round(lux_end - float(row["AmbientLuxStart"]), 3)

    # Battery drain per session
    total_dwell_sec = float(np.sum(session_dwell))
    battery_delta = round(float(_clip(total_dwell_sec / 1200.0 + rng.normal(0.2, 0.25), -1.5, 5.0)), 3)
    for row in rows:
        row["BatteryDeltaPerSession"] = battery_delta

    battery_end = _clip(battery_start - max(0.0, battery_delta) + rng.normal(0.0, 0.3), 5.0, 100.0)

    return rows, t_cursor, battery_end


def generate_synthetic_dataset(
    scenario: str,
    n_sessions: int,
    profile: CalibrationProfile,
    seed: int,
) -> Tuple[pd.DataFrame, Dict[str, object]]:
    rng = np.random.default_rng(seed)

    rows: List[Dict[str, object]] = []
    latent_risk: List[float] = []

    # Start sufficiently in the past so weekly summaries have realistic windows.
    now = datetime.now().replace(microsecond=0)
    start_anchor = now - timedelta(days=max(30, n_sessions // 2 + 7))
    session_start = start_anchor
    battery = float(_clip(rng.normal(82.0, 10.0), 20.0, 100.0))

    for sess_idx in range(n_sessions):
        risk = _scenario_risk(scenario, sess_idx, n_sessions, rng)

        # Weekend-aware hour targeting
        is_weekend = session_start.weekday() >= 5
        target_hour = _sample_target_hour(is_weekend, scenario, risk, profile, rng)

        # Gap distribution + risk relationship
        gap_min = _sample_gap_minutes(risk, profile, rng)
        candidate = session_start + timedelta(minutes=gap_min)

        # Move candidate toward targeted hour while preserving chronology
        # Keep minute/second conservative so long sessions do not spill into next date,
        # which would otherwise split one SessionNum into two dashboard session keys.
        candidate = candidate.replace(hour=target_hour, minute=int(rng.integers(0, 36)), second=int(rng.integers(0, 31)))
        if candidate <= session_start:
            candidate += timedelta(days=1)

        sess_rows, sess_end, battery = _build_session_rows(
            session_num=sess_idx + 1,
            start_dt=candidate,
            gap_min=gap_min,
            risk=risk,
            profile=profile,
            scenario=scenario,
            rng=rng,
            battery_start=battery,
        )

        rows.extend(sess_rows)
        latent_risk.append(risk)
        session_start = sess_end

        # Add inter-session idle baseline drift
        session_start += timedelta(minutes=float(_clip(rng.normal(8.0, 5.0), 0.0, 45.0)))

    df = pd.DataFrame(rows)

    # Guarantee exact schema order and presence
    for col in REQUIRED_COLUMNS:
        if col not in df.columns:
            df[col] = 0
    df = df[REQUIRED_COLUMNS]

    metadata = {
        "scenario": scenario,
        "n_sessions": n_sessions,
        "seed": seed,
        "latent_risk_mean": float(np.mean(latent_risk)) if latent_risk else 0.0,
        "latent_risk_first": float(np.mean(latent_risk[: max(1, min(5, len(latent_risk)))])) if latent_risk else 0.0,
        "latent_risk_last": float(np.mean(latent_risk[-max(1, min(5, len(latent_risk))):])) if latent_risk else 0.0,
    }

    return df, metadata


def _df_to_csv_text(df: pd.DataFrame, with_schema_prefix: bool) -> str:
    csv_body = df.to_csv(index=False)
    if not with_schema_prefix:
        return csv_body
    return f"SCHEMA_VERSION={EXPECTED_SCHEMA_VERSION}\n" + csv_body


def evaluate_scenario(
    scenario: str,
    csv_with_schema: Path,
    csv_plain: Path,
) -> ScenarioEval:
    csv_text = csv_with_schema.read_text(encoding="utf-8")

    payload_raw = run_dashboard_payload(csv_text)
    payload = json.loads(payload_raw)
    if "error" in payload:
        raise RuntimeError(f"run_dashboard_payload failed for {scenario}: {payload['error']}")

    model = run_full_pipeline(str(csv_plain))
    conf_pipeline = float(model.compute_model_confidence_breakdown().get("overall", 0.0))

    sessions = payload.get("sessions", [])
    st = [float(s.get("S_t", 0.0)) for s in sessions]

    if not st:
        raise RuntimeError(f"No sessions scored for scenario={scenario}.")

    window = max(3, min(10, len(st) // 5 if len(st) >= 5 else len(st)))
    first_mean = _safe_mean(st[:window])
    last_mean = _safe_mean(st[-window:])
    delta = last_mean - first_mean

    # Hour-based analysis
    night_vals: List[float] = []
    day_vals: List[float] = []
    for s in sessions:
        ts = str(s.get("startTime", ""))
        val = float(s.get("S_t", 0.0))
        dt = pd.to_datetime(ts, errors="coerce")
        if pd.isna(dt):
            continue
        h = int(dt.hour)
        if h >= 20 or h <= 3:
            night_vals.append(val)
        if 10 <= h <= 17:
            day_vals.append(val)

    night_mean = _safe_mean(night_vals, default=_safe_mean(st))
    day_mean = _safe_mean(day_vals, default=_safe_mean(st))

    model_conf = float(payload.get("model_confidence", 0.0))
    sess_a = payload.get("model_parameters", {}).get("session_transition_matrix", [[0.5, 0.5], [0.5, 0.5]])

    checks: Dict[str, bool] = {
        "confidence_reaches_minimum": bool(model_conf >= 0.25),
        "pipeline_confidence_matches_payload": bool(abs(model_conf - conf_pipeline) <= 0.20),
        "non_trivial_scoring": bool(np.std(st) >= 0.02),
        "threshold_crossings_observed": bool(
            any(x >= DOOM_PROBABILITY_THRESHOLD for x in st) or any(x < 0.35 for x in st)
        ),
    }

    if scenario == "improving":
        checks["trend_direction_expected"] = bool(delta <= -0.05)
        checks["last_window_healthier"] = bool(last_mean < first_mean)
    elif scenario == "worsening":
        checks["trend_direction_expected"] = bool(delta >= 0.05)
        checks["last_window_worse"] = bool(last_mean > first_mean)
    elif scenario == "late_night_clusters":
        checks["night_risk_higher_than_day"] = bool(night_mean >= day_mean + 0.03)
        checks["trend_direction_expected"] = True
    elif scenario == "stable_casual":
        checks["trend_direction_expected"] = bool(abs(delta) <= 0.12)
        checks["overall_low_risk"] = bool(_safe_mean(st) <= 0.55)

    notes = {
        "mean_all_sessions": _safe_mean(st),
        "std_all_sessions": float(np.std(st)),
        "doom_share": float(np.mean(np.array(st) >= DOOM_PROBABILITY_THRESHOLD)),
    }

    return ScenarioEval(
        scenario=scenario,
        sessions_generated=int(pd.read_csv(csv_plain).groupby("SessionNum").ngroups),
        sessions_scored=len(sessions),
        mean_first_window=float(first_mean),
        mean_last_window=float(last_mean),
        delta_last_minus_first=float(delta),
        model_confidence=float(model_conf),
        model_confidence_pipeline=float(conf_pipeline),
        night_mean_doom=float(night_mean),
        day_mean_doom=float(day_mean),
        session_transition_matrix=sess_a,
        checks=checks,
        notes=notes,
    )


def run_harness(
    scenarios: List[str],
    n_sessions: int,
    seed: int,
    output_dir: Path,
    calibration_csv: Path | None,
) -> Dict[str, object]:
    output_dir.mkdir(parents=True, exist_ok=True)

    profile = load_calibration_profile(calibration_csv)

    all_reports: Dict[str, object] = {
        "created_at": datetime.now().isoformat(),
        "n_sessions": n_sessions,
        "seed": seed,
        "calibration_csv": str(calibration_csv) if calibration_csv else None,
        "profile": {
            "session_reels_mu": profile.session_reels_mu,
            "session_reels_sigma": profile.session_reels_sigma,
            "dwell_mu": profile.dwell_mu,
            "dwell_sigma": profile.dwell_sigma,
            "speed_mu": profile.speed_mu,
            "speed_sigma": profile.speed_sigma,
            "gap_q10": profile.gap_q10,
            "gap_q50": profile.gap_q50,
            "gap_q90": profile.gap_q90,
            "exit_rate_base": profile.exit_rate_base,
            "rewatch_rate_base": profile.rewatch_rate_base,
        },
        "scenarios": {},
    }

    for i, scenario in enumerate(scenarios):
        scenario_seed = seed + i * 997
        print(f"\n=== Scenario: {scenario} (seed={scenario_seed}) ===")

        df, metadata = generate_synthetic_dataset(
            scenario=scenario,
            n_sessions=n_sessions,
            profile=profile,
            seed=scenario_seed,
        )

        scenario_dir = output_dir / scenario
        scenario_dir.mkdir(parents=True, exist_ok=True)

        csv_plain = scenario_dir / "synthetic_plain.csv"
        csv_with_schema = scenario_dir / "synthetic_with_schema.csv"

        csv_plain.write_text(_df_to_csv_text(df, with_schema_prefix=False), encoding="utf-8")
        csv_with_schema.write_text(_df_to_csv_text(df, with_schema_prefix=True), encoding="utf-8")

        eval_result = evaluate_scenario(scenario, csv_with_schema, csv_plain)

        passes = sum(1 for ok in eval_result.checks.values() if ok)
        total = len(eval_result.checks)

        print(f"Sessions generated/scored: {eval_result.sessions_generated}/{eval_result.sessions_scored}")
        print(
            "Trend first->last: "
            f"{eval_result.mean_first_window:.3f} -> {eval_result.mean_last_window:.3f} "
            f"(delta {eval_result.delta_last_minus_first:+.3f})"
        )
        print(
            f"Night vs day doom mean: {eval_result.night_mean_doom:.3f} vs {eval_result.day_mean_doom:.3f}"
        )
        print(
            "Model confidence payload/pipeline: "
            f"{eval_result.model_confidence:.3f} / {eval_result.model_confidence_pipeline:.3f}"
        )
        print(f"Checks passed: {passes}/{total}")

        report = {
            "metadata": metadata,
            "evaluation": {
                "scenario": eval_result.scenario,
                "sessions_generated": eval_result.sessions_generated,
                "sessions_scored": eval_result.sessions_scored,
                "mean_first_window": eval_result.mean_first_window,
                "mean_last_window": eval_result.mean_last_window,
                "delta_last_minus_first": eval_result.delta_last_minus_first,
                "model_confidence": eval_result.model_confidence,
                "model_confidence_pipeline": eval_result.model_confidence_pipeline,
                "night_mean_doom": eval_result.night_mean_doom,
                "day_mean_doom": eval_result.day_mean_doom,
                "session_transition_matrix": eval_result.session_transition_matrix,
                "checks": eval_result.checks,
                "notes": eval_result.notes,
                "pass_ratio": f"{passes}/{total}",
            },
            "files": {
                "csv_plain": str(csv_plain),
                "csv_with_schema": str(csv_with_schema),
            },
        }

        report_jsonable = _to_jsonable(report)
        (scenario_dir / "report.json").write_text(json.dumps(report_jsonable, indent=2), encoding="utf-8")
        all_reports["scenarios"][scenario] = report_jsonable

    all_reports = _to_jsonable(all_reports)
    (output_dir / "summary.json").write_text(json.dumps(all_reports, indent=2), encoding="utf-8")

    return all_reports


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Synthetic long-term validation harness for Reelio ALSE")
    parser.add_argument(
        "--scenario",
        type=str,
        default="improving",
        choices=["improving", "worsening", "late_night_clusters", "stable_casual"],
        help="Single scenario to run",
    )
    parser.add_argument(
        "--run-all",
        action="store_true",
        help="Run all built-in scenarios",
    )
    parser.add_argument(
        "--sessions",
        type=int,
        default=120,
        help="Number of synthetic sessions per scenario",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="Random seed for reproducibility",
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default="synthetic_validation",
        help="Directory for generated CSV and reports",
    )
    parser.add_argument(
        "--calibration-csv",
        type=str,
        default="",
        help="Optional real CSV path for distribution calibration",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    scenarios = [
        "improving",
        "worsening",
        "late_night_clusters",
        "stable_casual",
    ] if args.run_all else [args.scenario]

    calibration_csv = Path(args.calibration_csv).resolve() if args.calibration_csv else None
    output_dir = Path(args.output_dir).resolve()

    summary = run_harness(
        scenarios=scenarios,
        n_sessions=max(10, int(args.sessions)),
        seed=int(args.seed),
        output_dir=output_dir,
        calibration_csv=calibration_csv,
    )

    print("\n=== COMPLETE ===")
    print(f"Summary written to: {output_dir / 'summary.json'}")
    print(f"Scenarios: {', '.join(summary['scenarios'].keys())}")


if __name__ == "__main__":
    main()
