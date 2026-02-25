"""
Adaptive Latent State Engine (ALSE) v3.0
========================================
A pure Python, on-device behavioral intelligence system for modeling "doomscrolling" 
capture without ground truth labels. This implementation adheres to 9 architectural pillars
to survive sparse data and unsupervised tracking.

Pillars:
1. Personalized Bayesian Baseline: HMM priors anchored to user's rolling history.
2. Self-Calibrating Emission Model: Feature weights adjust based on KL-divergences between learned states.
3. Hierarchical Temporal Memory: Maintains 3 memory banks (recent, medium, long) to handle shifting baselines.
4. Continuous-Time Markov Chain (CTMC): Asymmetric session gap transitions via matrix exponential.
5. Survival Framing (Geometric Hazard): Models session stopping (hazard rates) instead of per-reel continuation.
6. Regime Change Detector: Halts long-term updates if life events cause sudden behavioral distribution shifts.
7. Sparse-Data Guard: Calculates model confidence and gracefully backs off to priors early on.
8. Contextual State Priors: Logistic regression determining start state probabilities from physical context.
9. Composite Doom Score: An interpretable, model-free heuristic score explicitly for UI presentation.
"""

import json
import os
import math
from datetime import datetime
import numpy as np
import pandas as pd

# NO scipy.linalg, hmmlearn, sklearn or scipy.stats ALLOWED
from scipy.optimize import fmin_bfgs, minimize

EXPECTED_SCHEMA_VERSION = 4

REQUIRED_COLUMNS = [
    "SessionNum", "ReelIndex", "StartTime", "EndTime", "DwellTime", "TimePeriod",
    "AvgScrollSpeed", "MaxScrollSpeed", "RollingMean", "RollingStd", "CumulativeReels",
    "ScrollStreak", "Liked", "Commented", "Shared", "Saved",
    "LikeLatency", "CommentLatency", "ShareLatency", "SaveLatency", "InteractionDwellRatio",
    "ScrollDirection", "BackScrollCount", "ScrollPauseCount", "ScrollPauseDurationMs", "SwipeCompletionRatio",
    "HasCaption", "CaptionExpanded", "HasAudio", "IsAd", "AdSkipLatencyMs",
    "AppExitAttempts", "ReturnLatencyS",
    "NotificationsDismissed", "NotificationsActedOn", "ProfileVisits", "ProfileVisitDurationS",
    "HashtagTaps",
    "AmbientLuxStart", "AmbientLuxEnd", "LuxDelta", "IsScreenInDarkRoom",
    "AccelVariance", "MicroMovementRms", "PostureShiftCount", "IsStationary", "DeviceOrientation",
    "BatteryStart", "BatteryDeltaPerSession", "IsCharging",
    "Headphones", "AudioOutputType",
    "PreviousApp", "PreviousAppDurationS", "PreviousAppCategory", "DirectLaunch",
    "TimeSinceLastSessionMin", "DayOfWeek", "IsHoliday",
    "ScreenOnCount1hr", "ScreenOnDuration1hr", "NightMode", "DND",
    "SessionTriggeredByNotif",
    "DwellTimeZscore", "DwellTimePctile", "DwellAcceleration", "SessionDwellTrend", "EarlyVsLateRatio",
    "InteractionRate", "InteractionBurstiness", "LikeStreakLength", "InteractionDropoff", "SavedWithoutLike", "CommentAbandoned",
    "ScrollIntervalCV", "ScrollBurstDuration", "InterBurstRestDuration", "ScrollRhythmEntropy",
    "UniqueAudioCount", "RepeatContentFlag", "ContentRepeatRate",
    "CircadianPhase", "SleepProxyScore", "EstimatedSleepDurationH", "ConsistencyScore", "IsWeekend",
    "PostSessionRating", "IntendedAction", "ActualVsIntendedMatch", "RegretScore", "MoodBefore", "MoodAfter", "MoodDelta",
    "SleepStart", "SleepEnd"
]

class SchemaError(Exception):
    pass

def validate_csv_schema(df):
    missing_cols = set(REQUIRED_COLUMNS) - set(df.columns)
    if missing_cols:
        raise SchemaError(f"Missing columns: {missing_cols}. Update InstaAccessibilityService or REQUIRED_COLUMNS.")

def preprocess_session(df):
    df = df.copy()
    
    defaults = {
        'AppExitAttempts': 0.0,
        'BackScrollCount': 0.0,
        'ScrollRhythmEntropy': 0.0,
        'SessionDwellTrend': 0.0,
        'AmbientLuxStart': 50.0,
        'IsCharging': 0.0,
        'CircadianPhase': 0.5,
        'PostSessionRating': 0.0,
        'RegretScore': 0.0,
        'MoodDelta': 0.0,
        'TimeSinceLastSessionMin': 60.0,
        'DayOfWeek': 0.0,
        'StartTime': '2026-01-01T12:00:00Z',
        'SleepStart': 23,
        'SleepEnd': 7
    }
    for col, val in defaults.items():
        if col not in df.columns:
            df[col] = val

    if 'log_dwell' not in df.columns:
        df['log_dwell'] = np.log(np.maximum(df['DwellTime'] if 'DwellTime' in df.columns else 1.0, 1e-3))
    if 'log_speed' not in df.columns:
        df['log_speed'] = np.log(np.maximum(df['AvgScrollSpeed'] if 'AvgScrollSpeed' in df.columns else 1.0, 1e-3))
    if 'rhythm_dissociation' not in df.columns:
        df['rhythm_dissociation'] = df['ScrollRhythmEntropy']
    if 'rewatch_flag' not in df.columns:
        df['rewatch_flag'] = (df['BackScrollCount'] > 0).astype(float)
    if 'exit_flag' not in df.columns:
        df['exit_flag'] = (df['AppExitAttempts'] > 0).astype(float)
    if 'swipe_incomplete' not in df.columns:
        df['swipe_incomplete'] = 1.0 - (df['SwipeCompletionRatio'] if 'SwipeCompletionRatio' in df.columns else 1.0)
        
    num_cols = df.select_dtypes(include=[np.number]).columns
    df[num_cols] = df[num_cols].fillna(0)
    str_cols = df.select_dtypes(include=['object', 'string']).columns
    df[str_cols] = df[str_cols].fillna("")
    return df

class UserBaseline:
    """
    Pillar 1: Personalized Bayesian Baseline.
    Tracks the user's historical distribution of every behavioral signal to anchor priors.
    """
    def __init__(self):
        self.dwell_mu_personal = 1.6
        self.dwell_sig_personal = 0.5
        self.speed_mu_personal = 0.0
        self.speed_sig_personal = 1.0
        self.session_len_mu = 10.0
        self.session_len_sig = 5.0
        self.typical_hour = np.ones(24) / 24.0
        self.typical_gap_mu = 120.0
        self.exit_rate_baseline = 0.05
        self.rewatch_rate_base = 0.1
        self.entropy_baseline = 1.0
        self.n_sessions_seen = 0
        self.last_updated = datetime.now().isoformat()

    def update(self, session_df, S_t, adaptive_rho):
        if len(session_df) == 0:
            return
        
        sess_len = len(session_df)
        log_dwells = session_df['log_dwell'].values
        m_dwell = np.mean(log_dwells)
        s_dwell = np.std(log_dwells) if sess_len > 1 else 0.5
        
        log_speeds = session_df['log_speed'].values
        m_speed = np.mean(log_speeds)
        s_speed = np.std(log_speeds) if sess_len > 1 else 1.0
        
        exits = session_df['AppExitAttempts'].sum() / sess_len
        rewatches = session_df['BackScrollCount'].sum() / sess_len
        entropy = session_df['ScrollRhythmEntropy'].mean()
        
        rho = adaptive_rho
        
        self.dwell_mu_personal = rho * self.dwell_mu_personal + (1 - rho) * m_dwell
        self.dwell_sig_personal = rho * self.dwell_sig_personal + (1 - rho) * s_dwell
        self.speed_mu_personal = rho * self.speed_mu_personal + (1 - rho) * m_speed
        self.speed_sig_personal = rho * self.speed_sig_personal + (1 - rho) * s_speed
        
        # FIX (Bug 6): cache old_mu before updating so MAD uses prior mean, not new mean
        old_mu = self.session_len_mu
        self.session_len_mu = rho * self.session_len_mu + (1 - rho) * sess_len
        self.session_len_sig = rho * self.session_len_sig + (1 - rho) * np.abs(sess_len - old_mu)
        
        self.exit_rate_baseline = rho * self.exit_rate_baseline + (1 - rho) * exits
        self.rewatch_rate_base = rho * self.rewatch_rate_base + (1 - rho) * rewatches
        self.entropy_baseline = rho * self.entropy_baseline + (1 - rho) * entropy
        
        start_time_str = session_df.iloc[0]['StartTime']
        try:
            hour = datetime.fromisoformat(start_time_str.replace('Z', '+00:00')).hour
        except:
            hour = 12
        h_vec = np.zeros(24)
        h_vec[hour] = 1.0
        self.typical_hour = rho * self.typical_hour + (1 - rho) * h_vec
        self.typical_hour /= np.sum(self.typical_hour)
        
        self.n_sessions_seen += 1
        self.last_updated = datetime.now().isoformat()

    def get_priors(self) -> dict:
        return {
            'mu_prior_doom': self.dwell_mu_personal + 1.5 * self.dwell_sig_personal,
            'mu_prior_casual': self.dwell_mu_personal - 0.5 * self.dwell_sig_personal,
            'speed_mu_prior_doom': self.speed_mu_personal,
            'speed_mu_prior_casual': self.speed_mu_personal + self.speed_sig_personal,
            'exit_rate_prior': self.exit_rate_baseline,
            'rewatch_rate_prior': self.rewatch_rate_base
        }

    def to_dict(self) -> dict:
        d = self.__dict__.copy()
        d['typical_hour'] = self.typical_hour.tolist()
        return d

    @classmethod
    def from_dict(cls, d) -> 'UserBaseline':
        obj = cls()
        obj.__dict__.update(d)
        if isinstance(d.get('typical_hour'), list):
            obj.typical_hour = np.array(d['typical_hour'])
        return obj

def kl_divergence_categorical(p, q):
    eps = 1e-9
    p = np.clip(p, eps, 1.0)
    q = np.clip(q, eps, 1.0)
    p = p / np.sum(p)
    q = q / np.sum(q)
    return np.sum(p * np.log(p / q))

def logsumexp(log_probs):
    log_probs = np.array(log_probs)
    a_max = np.max(log_probs)
    if np.isneginf(a_max): return -np.inf
    return a_max + np.log(np.sum(np.exp(log_probs - a_max)))

class RegimeDetector:
    """
    Pillar 6: Regime Change Detector.
    Halts long-term memory updates if sudden behavioral shifts occur to protect the baseline.
    """
    def __init__(self):
        self.doom_history = []
        self.dwell_history = []
        self.len_history = []
        self.hour_history = []
        self.regime_alert = False
        self.alert_duration = 0

    def update(self, S_t, session_df, baseline: UserBaseline) -> bool:
        if len(session_df) == 0:
            return self.regime_alert
            
        m_dwell = session_df['log_dwell'].mean()
        sess_len = len(session_df)
        
        try:
            time_str = session_df.iloc[0]['StartTime'].replace('Z', '+00:00')
            hr = datetime.fromisoformat(time_str).hour
        except:
            hr = 12
            
        self.doom_history.append(S_t)
        self.dwell_history.append(m_dwell)
        self.len_history.append(sess_len)
        self.hour_history.append(hr)
        
        if len(self.doom_history) > 30:
            self.doom_history.pop(0)
            self.dwell_history.pop(0)
            self.len_history.pop(0)
            self.hour_history.pop(0)
            
        if len(self.doom_history) < 7:
            return False
            
        doom_7d = np.mean(self.doom_history[-7:])
        doom_30d = np.mean(self.doom_history)
        doom_std_30d = np.std(self.doom_history) if len(self.doom_history) > 1 else 0.1
        if doom_std_30d < 0.05: doom_std_30d = 0.05
        
        dwell_7d_mu = np.mean(self.dwell_history[-7:])
        len_7d_mu = np.mean(self.len_history[-7:])
        
        recent_hours = np.zeros(24)
        for h in self.hour_history[-7:]:
            recent_hours[h] += 1
        recent_hours /= max(1, np.sum(recent_hours))
        
        kl_hours = kl_divergence_categorical(recent_hours, baseline.typical_hour)
        
        crit_a = doom_7d > (doom_30d + 2.5 * doom_std_30d)
        crit_b = abs(dwell_7d_mu - baseline.dwell_mu_personal) > (2.0 * baseline.dwell_sig_personal)
        crit_c = abs(len_7d_mu - baseline.session_len_mu) > (2.5 * baseline.session_len_sig)
        crit_d = kl_hours > 1.5
        
        any_crit_met = crit_a or crit_b or crit_c or crit_d
        
        if self.regime_alert:
            self.alert_duration += 1
            cleared_a = doom_7d <= (doom_30d + 1.5 * doom_std_30d)
            if self.alert_duration >= 3 and cleared_a and not (crit_b or crit_c or crit_d):
                self.regime_alert = False
                self.alert_duration = 0
        else:
            if any_crit_met:
                self.regime_alert = True
                self.alert_duration = 1
                
        return self.regime_alert

    def to_dict(self) -> dict:
        return self.__dict__.copy()

    @classmethod
    def from_dict(cls, d) -> 'RegimeDetector':
        obj = cls()
        obj.__dict__.update(d)
        return obj

class DoomScorer:
    """
    Pillar 9: Composite Doom Score.
    Model-free interpretable layer that runs in parallel with HMM.
    """
    def __init__(self, thresholds: dict = None):
        self.thresholds = thresholds or {'DOOM': 0.55, 'BORDERLINE': 0.35}

    def score(self, session_df, baseline: UserBaseline, gap_min: float, prev_S_t: float = 0.0) -> dict:
        if len(session_df) == 0:
            return {'doom_score': 0.0, 'label': 'CASUAL', 'components': {}}
            
        n_reels = len(session_df)
        
        c_length = min(n_reels / max(1.0, baseline.session_len_mu + 2 * baseline.session_len_sig), 1.0)
        
        exit_sum = session_df['AppExitAttempts'].sum() / n_reels
        c_volconst = min(exit_sum / max(0.01, baseline.exit_rate_baseline + 0.01), 1.0)
        
        if gap_min < 0:
            c_rapid = 0.0
        elif gap_min < 3:
            c_rapid = 1.0
        elif gap_min < 7:
            c_rapid = 0.7
        elif gap_min < 15:
            c_rapid = 0.3
        else:
            c_rapid = 0.0
            
        mean_entropy = session_df['ScrollRhythmEntropy'].mean()
        raw_auto = 1.0 - (mean_entropy / max(0.01, baseline.entropy_baseline))
        c_auto = np.clip(raw_auto, 0.0, 1.0)
        
        trend = session_df['SessionDwellTrend'].mean() if 'SessionDwellTrend' in session_df else 0.0
        c_collapse = np.clip(-trend * 10, 0.0, 1.0)
        
        rewatch_sum = session_df['BackScrollCount'].sum() / n_reels
        c_rewatch = min(rewatch_sum / max(0.01, baseline.rewatch_rate_base + 0.01), 1.0)
        
        lux = session_df['AmbientLuxStart'].iloc[0] if 'AmbientLuxStart' in session_df else 50.0
        chrge = session_df['IsCharging'].iloc[0] if 'IsCharging' in session_df else 0
        phase = session_df['CircadianPhase'].iloc[0] if 'CircadianPhase' in session_df else 0.5
        
        sleep_start = int(session_df['SleepStart'].iloc[0]) if 'SleepStart' in session_df.columns else 23
        sleep_end   = int(session_df['SleepEnd'].iloc[0])   if 'SleepEnd'   in session_df.columns else 7

        try:
            hour = pd.to_datetime(session_df['StartTime'].iloc[0]).hour
        except:
            hour = 12

        if sleep_start > sleep_end:
            in_sleep_window = (hour >= sleep_start) or (hour < sleep_end)
        else:
            in_sleep_window = (sleep_start <= hour < sleep_end)

        is_dark_rm = 1.0 if (lux < 15 and (phase > 0.75 or phase < 0.25)) else 0.0
        sleep_penalty = 1.0 if in_sleep_window else 0.0
        c_env = 0.25 * is_dark_rm + 0.25 * float(chrge) + 0.10 * float(lux < 5) + 0.40 * sleep_penalty
        
        ds = (
            0.25 * c_length +
            0.20 * c_volconst +
            0.15 * c_rapid +
            0.15 * c_auto +
            0.10 * c_collapse +
            0.10 * c_rewatch +
            0.05 * c_env
        )
        
        # FIX (Bug 9): additive amplifiers, not multiplicative chain
        post_rating = session_df['PostSessionRating'].iloc[0] if 'PostSessionRating' in session_df else 0
        regret = session_df['RegretScore'].iloc[0] if 'RegretScore' in session_df else 0
        mood_delta = session_df['MoodDelta'].iloc[0] if 'MoodDelta' in session_df else 0
        
        amp = 0.0
        if (post_rating > 0 and post_rating < 3) or regret == 1:
            amp += 0.20
        if mood_delta < -1:
            amp += 0.15
        ds = np.clip(ds * (1.0 + amp), 0.0, 1.0)
            
        label = 'DOOM' if ds >= self.thresholds['DOOM'] else 'BORDERLINE' if ds >= self.thresholds['BORDERLINE'] else 'CASUAL'
        
        comps = {
            'length': c_length,
            'volitional_conflict': c_volconst,
            'rapid_reentry': c_rapid,
            'automaticity': c_auto,
            'dwell_collapse': c_collapse,
            'rewatch': c_rewatch,
            'environment': c_env
        }
        
        return {
            'doom_score': ds,
            'label': label,
            'components': comps
        }
    
class ReelioCLSE:
    def __init__(self):
        self.SS_recent = self._empty_bank()
        self.SS_medium = self._empty_bank()
        self.SS_long = self._empty_bank()
        
        self.A = np.array([[0.8, 0.2], [0.3, 0.7]])
        self.pi = np.array([0.65, 0.35])
        
        self.q_01 = 0.5
        self.q_10 = 0.5
        
        self.h = np.array([0.15, 0.05])
        
        self.num_features = 6
        self.feature_weights = np.ones(self.num_features) / self.num_features
        self.feature_mask = np.ones(self.num_features, dtype=bool)
        
        self.mu = np.zeros((self.num_features, 2))
        self.sigma = np.ones((self.num_features, 2))
        self.p_bern = np.full((self.num_features, 2), 0.5)
        self.rho_dwell_speed = np.zeros(2)
        
        self.logistic_weights = np.array([0.0, 0.5, 0.3, 0.2, 0.8, 0.6, 0.0])
        
        self.n_sessions_seen = 0
        self.n_regime_alerts = 0
        self.labeled_sessions = 0
        self.session_ll_history = []
        self._checkpoint_dict = {}

    def _empty_bank(self):
        return {
            'sum_xi': np.zeros((2, 2)),
            'sum_gamma': np.zeros(2),
            'sum_x': np.zeros((6, 2)),
            'sum_x2': np.zeros((6, 2)),
            'sum_xy': np.zeros(2),
            'n_sessions': np.zeros(2),
            'sum_len': np.zeros(2)
        }

    def _initialize_from_data(self, df: pd.DataFrame, baseline: UserBaseline):
        priors = baseline.get_priors()
        
        self.mu[0, 0] = priors['mu_prior_casual']
        self.mu[0, 1] = priors['mu_prior_doom']
        self.sigma[0, :] = baseline.dwell_sig_personal
        
        self.mu[1, 0] = priors['speed_mu_prior_casual']
        self.mu[1, 1] = priors['speed_mu_prior_doom']
        self.sigma[1, :] = baseline.speed_sig_personal
        
        self.mu[2, :] = 0.5
        self.sigma[2, :] = 0.2
        self.p_bern[3, :] = priors['rewatch_rate_prior']
        self.p_bern[4, :] = priors['exit_rate_prior']
        self.p_bern[5, :] = 0.5
        
        for bank in [self.SS_recent, self.SS_medium, self.SS_long]:
            bank['sum_gamma'] = np.array([2.0, 1.0])
            bank['sum_xi'] = np.array([[1.8, 0.2], [0.3, 0.7]])
            bank['sum_x'] = self.mu * bank['sum_gamma']
            bank['sum_x2'] = (self.sigma**2 + self.mu**2) * bank['sum_gamma']
            bank['sum_xy'] = (self.mu[0] * self.mu[1]) * bank['sum_gamma']
            bank['n_sessions'] = np.array([1.0, 0.5])
            bank['sum_len'] = np.array([10.0, 10.0])
            
    def _checkpoint(self):
        self._checkpoint_dict = {
            'mu': self.mu.copy(),
            'sigma': self.sigma.copy(),
            'p_bern': self.p_bern.copy(),
            'A': self.A.copy(),
            'pi': self.pi.copy(),
            'h': self.h.copy(),
            'feature_weights': self.feature_weights.copy(),
            'n_sessions_seen': self.n_sessions_seen,
            'n_regime_alerts': self.n_regime_alerts,
            'labeled_sessions': self.labeled_sessions
        }

    def _rollback(self):
        # FIX (Bug 2): explicitly cast JSON-deserialized lists back to numpy arrays
        ARRAY_KEYS = {'mu', 'sigma', 'A', 'pi', 'h', 'p_bern', 'feature_weights', 'rho_dwell_speed'}
        for k, v in self._checkpoint_dict.items():
            if k in ARRAY_KEYS:
                setattr(self, k, np.array(v))
            else:
                setattr(self, k, v)

    def _a_gap(self, delta_t_hours: float) -> np.ndarray:
        if delta_t_hours < 1/60.0:
            return self.A
        delta_t_hours = min(48.0, delta_t_hours)
        
        lam = self.q_01 + self.q_10
        if lam < 1e-9:
            return np.eye(2)
            
        exp_term = np.exp(-lam * delta_t_hours)
        A_gap = np.zeros((2, 2))
        A_gap[0, 0] = (self.q_10 + self.q_01 * exp_term) / lam
        A_gap[0, 1] = self.q_01 * (1 - exp_term) / lam
        A_gap[1, 0] = self.q_10 * (1 - exp_term) / lam
        A_gap[1, 1] = (self.q_01 + self.q_10 * exp_term) / lam
        
        A_gap[0, :] /= A_gap[0, :].sum()
        A_gap[1, :] /= A_gap[1, :].sum()
        return A_gap

    def _log_emission_gaussian(self, x, mu, sigma) -> float:
        sigma = max(sigma, 0.05)
        return -0.5 * np.log(2 * np.pi) - np.log(sigma) - ((x - mu)**2) / (2 * sigma**2)

    def _log_emission_bernoulli(self, x, p) -> float:
        p = np.clip(p, 0.01, 0.99)
        return x * np.log(p) + (1 - x) * np.log(1 - p)

    def _bivariate_log_emission(self, ld, lv, state) -> float:
        mu_d = self.mu[0, state]
        sig_d = max(self.sigma[0, state], 0.05)
        mu_v = self.mu[1, state]
        sig_v = max(self.sigma[1, state], 0.05)
        rho = np.clip(self.rho_dwell_speed[state], -0.95, 0.95)
        
        z_d = (ld - mu_d) / sig_d
        z_v = (lv - mu_v) / sig_v
        
        denom = max(1 - rho**2, 1e-9)
        log_norm = -np.log(2 * np.pi * sig_d * sig_v * np.sqrt(denom))
        exp_term = -0.5 / denom * (z_d**2 - 2 * rho * z_d * z_v + z_v**2)
        return log_norm + exp_term

    def _log_emission(self, features: np.ndarray, state: int) -> float:
        ll = 0.0
        w = self.feature_weights
        
        if self.feature_mask[0] and self.feature_mask[1]:
            biv_ll = self._bivariate_log_emission(features[0], features[1], state)
            ll += (w[0] + w[1]) * biv_ll
        else:
            if self.feature_mask[0]:
                ll += w[0] * self._log_emission_gaussian(features[0], self.mu[0, state], self.sigma[0, state])
            if self.feature_mask[1]:
                ll += w[1] * self._log_emission_gaussian(features[1], self.mu[1, state], self.sigma[1, state])
                
        if self.feature_mask[2]:
            ll += w[2] * self._log_emission_gaussian(features[2], self.mu[2, state], self.sigma[2, state])
        if self.feature_mask[3]:
            ll += w[3] * self._log_emission_bernoulli(features[3], self.p_bern[3, state])
        if self.feature_mask[4]:
            ll += w[4] * self._log_emission_bernoulli(features[4], self.p_bern[4, state])
        if self.feature_mask[5]:
            ll += w[5] * self._log_emission_gaussian(features[5], self.mu[5, state], self.sigma[5, state])
            
        return ll

    def _forward_log(self, obs: np.ndarray, A_first: np.ndarray) -> np.ndarray:
        T = len(obs)
        alpha = np.zeros((T, 2))
        
        for s in range(2):
            log_emit = self._log_emission(obs[0], s)
            alpha[0, s] = np.log(max(self.pi[s], 1e-300)) + log_emit
            
        log_A = np.log(np.clip(self.A, 1e-300, 1.0))
        log_A_first = np.log(np.clip(A_first, 1e-300, 1.0))
        
        for t in range(1, T):
            trans = log_A_first if t == 1 else log_A
            for s in range(2):
                log_emit = self._log_emission(obs[t], s)
                alpha[t, s] = logsumexp([alpha[t-1, i] + trans[i, s] for i in range(2)]) + log_emit
                
        return alpha

    def _backward_log(self, obs: np.ndarray, A_first: np.ndarray) -> np.ndarray:
        T = len(obs)
        beta = np.zeros((T, 2))
        
        log_A = np.log(np.clip(self.A, 1e-300, 1.0))
        log_A_first = np.log(np.clip(A_first, 1e-300, 1.0))
        
        for t in range(T-2, -1, -1):
            trans = log_A_first if t == 0 else log_A
            for s in range(2):
                terms = [trans[s, j] + self._log_emission(obs[t+1], j) + beta[t+1, j] for j in range(2)]
                beta[t, s] = logsumexp(terms)
                
        return beta

    def _e_step(self, obs: np.ndarray, A_first: np.ndarray):
        T = len(obs)
        alpha = self._forward_log(obs, A_first)
        beta = self._backward_log(obs, A_first)
        
        log_prob_obs = logsumexp(alpha[T-1, :])
        
        gamma = np.zeros((T, 2))
        for t in range(T):
            for s in range(2):
                gamma[t, s] = np.exp(alpha[t, s] + beta[t, s] - log_prob_obs)
            gamma[t, :] /= np.clip(gamma[t, :].sum(), 1e-9, None)
            
        xi = np.zeros((T-1, 2, 2))
        log_A = np.log(np.clip(self.A, 1e-300, 1.0))
        log_A_first = np.log(np.clip(A_first, 1e-300, 1.0))
        
        for t in range(T-1):
            trans = log_A_first if t == 0 else log_A
            for i in range(2):
                for j in range(2):
                    log_xi = alpha[t, i] + trans[i, j] + self._log_emission(obs[t+1], j) + beta[t+1, j]
                    xi[t, i, j] = np.exp(log_xi - log_prob_obs)
            # FIX (Bug 3): removed per-timestep xi normalization — xi[t] already sums to 1
            # by construction from forward-backward; normalizing here destroyed relative scale
            
        return gamma, xi, log_prob_obs

    def _update_ss(self, gamma: np.ndarray, xi: np.ndarray, obs: np.ndarray, dominant: int, sess_len: int, regime_alert: bool):
        T = len(obs)
        new_ss = self._empty_bank()
        
        new_ss['sum_gamma'] = gamma.sum(axis=0)
        
        if T > 1:
            new_ss['sum_xi'] = xi.sum(axis=0)
            
        new_ss['n_sessions'][dominant] = 1.0
        new_ss['sum_len'][dominant] = sess_len
        
        for t in range(T):
            for s in range(2):
                new_ss['sum_x'][:, s] += gamma[t, s] * obs[t]
                new_ss['sum_x2'][:, s] += gamma[t, s] * (obs[t] ** 2)
                new_ss['sum_xy'][s] += gamma[t, s] * obs[t, 0] * obs[t, 1]
                
        rhos = [0.60, 0.85, 0.97]
        banks = [self.SS_recent, self.SS_medium, self.SS_long]
        
        for i, bank in enumerate(banks):
            if i == 2 and regime_alert:
                continue
                
            rho = rhos[i]
            for k in bank.keys():
                bank[k] = rho * bank[k] + (1 - rho) * new_ss[k]

    def decode(self, obs: np.ndarray, A_first: np.ndarray, ctx: np.ndarray = None):
        T = len(obs)
        V = np.zeros((T, 2))
        ptr = np.zeros((T, 2), dtype=int)
        
        for s in range(2):
            V[0, s] = np.log(max(self.pi[s], 1e-300)) + self._log_emission(obs[0], s)
            
        log_A = np.log(np.clip(self.A, 1e-300, 1.0))
        log_A_first = np.log(np.clip(A_first, 1e-300, 1.0))
        
        for t in range(1, T):
            trans = log_A_first if t == 1 else log_A
            for s in range(2):
                seq_probs = [V[t-1, prev] + trans[prev, s] for prev in range(2)]
                best_prev = np.argmax(seq_probs)
                V[t, s] = seq_probs[best_prev] + self._log_emission(obs[t], s)
                ptr[t, s] = best_prev
                
        best_last = np.argmax(V[T-1, :])
        path = [best_last]
        for t in range(T-1, 0, -1):
            path.insert(0, ptr[t, path[0]])
            
        gamma, _, _ = self._e_step(obs, A_first)
        raw_doom_prob = np.mean(gamma[:, 1])
        
        alpha_conf = min(1.0, self.n_sessions_seen / 10.0)
        p_prior = self._compute_contextual_pi(ctx)[1] if ctx is not None else self.pi[1]
        
        doom_prob = alpha_conf * raw_doom_prob + (1.0 - alpha_conf) * p_prior
        
        return path, doom_prob, gamma

    def compute_model_confidence(self) -> float:
        C_volume = min(self.n_sessions_seen / 20.0, 1.0)

        mu_doom   = self.mu[0, 1]
        mu_casual = self.mu[0, 0]
        sigma_avg = (self.sigma[0, 0] + self.sigma[0, 1]) / 2

        if sigma_avg > 0:
            separation = (mu_doom - mu_casual) / sigma_avg
            C_separation = float(np.clip(separation / 2.0, 0.0, 1.0))
        else:
            C_separation = 0.0

        if self.n_sessions_seen > 0:
            alert_rate = self.n_regime_alerts / self.n_sessions_seen
            C_stability = float(np.clip(1.0 - (alert_rate / 0.5), 0.0, 1.0))
        else:
            C_stability = 0.0

        confidence = (
            0.50 * C_volume +
            0.30 * C_separation +
            0.20 * C_stability
        )

        if self.labeled_sessions == 0:
            return float(min(confidence, 0.60))
        elif self.labeled_sessions < 10:
            cap = 0.60 + (self.labeled_sessions / 10.0) * 0.20
            return float(min(confidence, cap))
        else:
            return float(min(confidence, 0.90))

    def _update_feature_weights(self):
        kl_divs = np.zeros(self.num_features)
        
        for k in range(self.num_features):
            if not self.feature_mask[k]:
                continue
            if k in (0, 1, 2, 5):  # Gaussian
                mu1, sig1 = self.mu[k, 0], self.sigma[k, 0]
                mu2, sig2 = self.mu[k, 1], self.sigma[k, 1]
                kl = np.log(sig2/sig1) + (sig1**2 + (mu1-mu2)**2)/(2*sig2**2) - 0.5
                # FIX (Bug 5): floor at 0 — KL can be negative when sig1 > sig2 with similar means,
                # producing negative feature weights after normalization
                kl_divs[k] = np.maximum(kl, 0.0)
            else:  # Bernoulli
                p1 = self.p_bern[k, 0]
                p2 = self.p_bern[k, 1]
                kl = p1 * np.log(p1/p2) + (1-p1) * np.log((1-p1)/(1-p2))
                kl_divs[k] = kl
                
        sum_kl = np.sum(kl_divs)
        if sum_kl > 1e-9:
            self.feature_weights = kl_divs / sum_kl
        else:
            self.feature_weights[self.feature_mask] = 1.0 / np.sum(self.feature_mask)

    def _update_ctmc_rates(self, gamma_prev: np.ndarray, gamma_curr: np.ndarray, delta_t: float):
        if delta_t < 1/60.0 or delta_t > 48.0 or self.n_sessions_seen < 5:
            return
            
        def L_gap(q01, q10):
            lam = q01 + q10
            if lam < 1e-9: return -1e9
            exp_term = np.exp(-lam * delta_t)
            A_gap = np.zeros((2, 2))
            A_gap[0, 0] = (q10 + q01 * exp_term) / lam
            A_gap[0, 1] = q01 * (1 - exp_term) / lam
            A_gap[1, 0] = q10 * (1 - exp_term) / lam
            A_gap[1, 1] = (q01 + q10 * exp_term) / lam
            
            expected_transition = gamma_prev @ np.log(np.clip(A_gap, 1e-300, 1.0)) @ gamma_curr
            return expected_transition
            
        step = 0.01
        grad_01 = (L_gap(self.q_01 + step, self.q_10) - L_gap(self.q_01 - step, self.q_10)) / (2*step)
        grad_10 = (L_gap(self.q_01, self.q_10 + step) - L_gap(self.q_01, self.q_10 - step)) / (2*step)
        
        self.q_01 += 0.05 * grad_01
        self.q_10 += 0.05 * grad_10

    def _compute_contextual_pi(self, ctx: np.ndarray) -> np.ndarray:
        if self.n_sessions_seen < 5:
            return np.array([0.65, 0.35])
            
        logit = np.dot(self.logistic_weights, ctx)
        pi1 = 1.0 / (1.0 + np.exp(-np.clip(logit, -10, 10)))
        pi1 = np.clip(pi1, 0.1, 0.9)
        return np.array([1 - pi1, pi1])

    def _update_contextual_prior(self, ctx: np.ndarray, gamma_t0: np.ndarray):
        if self.n_sessions_seen < 5:
            return
            
        y_t = gamma_t0[1]
        logit = np.dot(self.logistic_weights, ctx)
        y_hat = 1.0 / (1.0 + np.exp(-np.clip(logit, -10, 10)))
        
        error = y_hat - y_t
        lr = 0.01 * (0.98 ** self.n_sessions_seen)
        self.logistic_weights -= lr * error * ctx

    def _clip_params(self):
        self.sigma = np.clip(self.sigma, 0.05, None)
        self.A = np.clip(self.A, 1e-9, 1.0)
        self.A[0, :] /= self.A[0, :].sum()
        self.A[1, :] /= self.A[1, :].sum()
        self.pi /= self.pi.sum()
        
        self.h[0] = np.clip(self.h[0], 0.05, 0.60)
        self.h[1] = np.clip(self.h[1], 0.01, 0.25)
        if self.h[0] <= self.h[1]:
            temp = self.h[0]
            self.h[0] = np.clip(self.h[1] + 0.01, 0.05, 0.60)
            self.h[1] = np.clip(temp - 0.01, 0.01, 0.25)
            
        self.q_01 = np.clip(self.q_01, 0.01, 5.0)
        self.q_10 = np.clip(self.q_10, 0.01, 5.0)
        
        self.feature_weights = np.clip(self.feature_weights, 1e-9, None)
        self.feature_weights /= self.feature_weights.sum()
        self.rho_dwell_speed = np.clip(self.rho_dwell_speed, -0.95, 0.95)
        self.p_bern = np.clip(self.p_bern, 0.01, 0.99)

    def _m_step(self, regime_alert: bool):
        self._checkpoint()
        
        if self.n_sessions_seen < 5:
            w_r, w_m, w_l = 0.70, 0.30, 0.0
        elif regime_alert:
            w_r, w_m, w_l = 0.60, 0.30, 0.10
        else:
            w_r, w_m, w_l = 0.20, 0.50, 0.30
            
        g_mix = (w_r * self.SS_recent['sum_gamma'] +
                 w_m * self.SS_medium['sum_gamma'] +
                 w_l * self.SS_long['sum_gamma'])
                 
        x_mix = (w_r * self.SS_recent['sum_x'] +
                 w_m * self.SS_medium['sum_x'] +
                 w_l * self.SS_long['sum_x'])
                 
        x2_mix = (w_r * self.SS_recent['sum_x2'] +
                  w_m * self.SS_medium['sum_x2'] +
                  w_l * self.SS_long['sum_x2'])
                  
        xy_mix = (w_r * self.SS_recent['sum_xy'] +
                  w_m * self.SS_medium['sum_xy'] +
                  w_l * self.SS_long['sum_xy'])
                  
        # Update emissions
        for s in range(2):
            if g_mix[s] > 1e-3:
                self.mu[:, s] = x_mix[:, s] / g_mix[s]
                var = (x2_mix[:, s] / g_mix[s]) - (self.mu[:, s] ** 2)

                # FIX (Bug 7): branch Bernoulli vs Gaussian — only compute sigma for
                # continuous features; copy mu directly to p_bern for discrete ones
                for k in range(self.num_features):
                    if k in (3, 4):  # Bernoulli features
                        self.p_bern[k, s] = np.clip(self.mu[k, s], 0.01, 0.99)
                    else:  # Gaussian features
                        self.sigma[k, s] = np.sqrt(max(var[k], 0.0025))

                cov = (xy_mix[s] / g_mix[s]) - (self.mu[0, s] * self.mu[1, s])
                self.rho_dwell_speed[s] = cov / (self.sigma[0, s] * self.sigma[1, s] + 1e-9)
                
        # FIX (Bug 4): A matrix uses the same weighted bank mix as all other params
        sum_xi_mix = (w_r * self.SS_recent['sum_xi'] +
                      w_m * self.SS_medium['sum_xi'] +
                      w_l * self.SS_long['sum_xi'])
        for i in range(2):
            den = sum_xi_mix[i, :].sum()
            if den > 1e-3:
                self.A[i, :] = sum_xi_mix[i, :] / den
                
        # Update Hazard
        alpha_prior = [3.0, 1.0]
        beta_prior = [5.0, 12.0]
        for s in range(2):
            n_sess = self.SS_long['n_sessions'][s]
            sum_len = self.SS_long['sum_len'][s]
            a_post = n_sess + alpha_prior[s] - 1
            b_post = (sum_len - n_sess) + beta_prior[s] - 1
            if a_post + b_post > 0:
                self.h[s] = a_post / (a_post + b_post)
                
        self._clip_params()
        
        if np.isnan(self.mu).any() or np.isnan(self.A).any() or np.isnan(self.sigma).any():
            self._rollback()
            print("WARNING: NaN detected in M-step. Rolled back.")

    def process_session(self, df: pd.DataFrame, baseline: UserBaseline, regime_detector: RegimeDetector, prev_gamma: np.ndarray = None):
        if len(df) < 2:
            return None, None, None
            
        obs = df[['log_dwell', 'log_speed', 'rhythm_dissociation', 'rewatch_flag', 'exit_flag', 'swipe_incomplete']].values
        
        if self.n_sessions_seen == 0:
            self._initialize_from_data(df, baseline)
            
        gap_hr = df['TimeSinceLastSessionMin'].iloc[0] / 60.0 if 'TimeSinceLastSessionMin' in df else 2.0
        phase = df['CircadianPhase'].iloc[0] if 'CircadianPhase' in df else 0.5
        day_of_week = df['DayOfWeek'].iloc[0] if 'DayOfWeek' in df else 0
        lux = df['AmbientLuxStart'].iloc[0] if 'AmbientLuxStart' in df else 50.0
        chrge = df['IsCharging'].iloc[0] if 'IsCharging' in df else 0
        
        ctx = np.array([
            1.0,
            np.sin(phase * 2 * np.pi),
            np.cos(phase * 2 * np.pi),
            gap_hr / 10.0,
            1.0 if lux < 10 else 0.0,
            1.0 if chrge else 0.0,
            1.0 if day_of_week in (1, 7) else 0.0
        ])
        
        A_first = self._a_gap(gap_hr)
        self.pi = self._compute_contextual_pi(ctx)
        
        gamma, xi, ll = self._e_step(obs, A_first)
        self.session_ll_history.append(ll)
        
        dominant_state = np.argmax(gamma.sum(axis=0))
        reg_alert = regime_detector.update(np.mean(gamma[:, 1]), df, baseline)
        if reg_alert:
            self.n_regime_alerts += 1
            
        post_rating = df['PostSessionRating'].iloc[0] if 'PostSessionRating' in df else 0
        regret = df['RegretScore'].iloc[0] if 'RegretScore' in df else 0
        if post_rating != 0 or regret != 0:
            self.labeled_sessions += 1
        
        self._update_ss(gamma, xi, obs, dominant_state, len(df), reg_alert)
        self.n_sessions_seen += 1
        
        baseline.update(df, np.mean(gamma[:, 1]), 0.95 if not reg_alert else 0.99)
        self._update_contextual_prior(ctx, gamma[0])
        
        if prev_gamma is not None:
            self._update_ctmc_rates(prev_gamma[-1], gamma[0], gap_hr)
            
        self._m_step(reg_alert)
        self._update_feature_weights()
        
        path, d_prob, _ = self.decode(obs, A_first, ctx)
        
        return path, d_prob, gamma

def validate_model(model: ReelioCLSE) -> list:
    errors = []
    
    if model.mu[0, 1] <= model.mu[0, 0]:
        errors.append("Validation Failed: Doom Dwell mu must be > Casual Dwell mu")

    # FIX (Bug 10): removed arbitrary sigma ordering check — doom sigma > casual sigma
    # is not architecturally required; only doom MEAN must be higher
        
    if model.mu[1, 1] >= model.mu[1, 0]:
        errors.append("Validation Failed: Doom Speed mu must be < Casual Speed mu")
        
    if model.p_bern[3, 1] <= model.p_bern[3, 0]:
        errors.append("Validation Failed: Doom Rewatch Rate must be > Casual Rewatch Rate")
        
    if model.p_bern[4, 1] >= model.p_bern[4, 0]:
        errors.append("Validation Failed: Doom Exit Rate must be < Casual Exit Rate")
        
    if model.q_10 >= model.q_01:
        errors.append("Validation Failed: q_10 (escape) must be < q_01 (pull)")
        
    if model.h[1] >= model.h[0]:
        errors.append("Validation Failed: Doom hazard rate must be < Casual hazard rate")
        
    if not np.isclose(np.sum(model.feature_weights), 1.0):
        errors.append(f"Validation Failed: Feature weights do not sum to 1. Sum={np.sum(model.feature_weights)}")
        
    if np.any(model.sigma <= 0):
        errors.append("Validation Failed: Sigma contains negative or zero values.")
        
    if np.isnan(model.mu).any() or np.isnan(model.A).any():
        errors.append("Validation Failed: NaNs present in model parameters.")
        
    return errors

def load_full_state(state_path: str):
    if not os.path.exists(state_path):
        return ReelioCLSE(), UserBaseline(), RegimeDetector(), DoomScorer(), None
        
    with open(state_path, 'r') as f:
        data = json.load(f)
        
    if data.get('model_version', 0.0) < 3.0:
        return ReelioCLSE(), UserBaseline(), RegimeDetector(), DoomScorer(), None
        
    model = ReelioCLSE()
    model._checkpoint_dict = data.get('model_state', {})
    model._rollback()
    
    if 'n_sessions_seen' not in model._checkpoint_dict:
        model.n_sessions_seen = data.get('model_state', {}).get('n_sessions_seen', 0)
    if 'n_regime_alerts' not in model._checkpoint_dict:
        model.n_regime_alerts = data.get('model_state', {}).get('n_regime_alerts', 0)
    if 'labeled_sessions' not in model._checkpoint_dict:
        model.labeled_sessions = data.get('model_state', {}).get('labeled_sessions', 0)
    
    baseline = UserBaseline.from_dict(data.get('baseline_state', {}))
    
    detector = RegimeDetector()
    d_state = data.get('detector_state', {})
    detector.doom_history = d_state.get('doom_history', [])
    detector.dwell_history = d_state.get('dwell_history', [])
    detector.len_history = d_state.get('len_history', [])
    detector.hour_history = d_state.get('hour_history', [])
    detector.regime_alert = d_state.get('regime_alert', False)
    
    scorer = DoomScorer()
    
    prev_g = data.get('prev_gamma')
    prev_gamma = np.array(prev_g) if prev_g is not None else None
    
    return model, baseline, detector, scorer, prev_gamma

def save_full_state(state_path: str, model, baseline, detector, prev_gamma):
    model._checkpoint()
    
    data = {
        'model_version': 3.0,
        'model_state': model._checkpoint_dict,
        'baseline_state': baseline.to_dict(),
        'detector_state': {
            'doom_history': detector.doom_history,
            'dwell_history': detector.dwell_history,
            'len_history': detector.len_history,
            'hour_history': detector.hour_history,
            'regime_alert': detector.regime_alert
        },
        'prev_gamma': prev_gamma.tolist() if prev_gamma is not None else None
    }
    with open(state_path, 'w') as f:
        json.dump(data, f, default=lambda x: x.tolist() if isinstance(x, np.ndarray) else x)

def run_inference_on_latest(new_session_csv_path: str, model_state_path: str) -> dict:
    with open(new_session_csv_path, 'r') as f:
        first_line = f.readline().strip()
        if first_line != f"SCHEMA_VERSION={EXPECTED_SCHEMA_VERSION}":
            raise SchemaError(f"Expected SCHEMA_VERSION={EXPECTED_SCHEMA_VERSION}, got: {first_line}")
        session_df = pd.read_csv(f)
        
    validate_csv_schema(session_df)
    
    model, baseline, detector, scorer, prev_gamma = load_full_state(model_state_path)
    session_df = preprocess_session(session_df)
    
    if len(session_df) < 2:
        return {"doom_score": 0.0, "doom_label": "UNSCORED", "model_confidence": 0.0}
        
    path, doom_prob, gamma = model.process_session(session_df, baseline, detector, prev_gamma)
    
    gap_hr = session_df['TimeSinceLastSessionMin'].iloc[0] / 60.0 if 'TimeSinceLastSessionMin' in session_df else 2.0
    # FIX (Bug 8): save and use scorer result instead of discarding it
    scorer_result = scorer.score(session_df, baseline, gap_hr)
    
    save_full_state(model_state_path, model, baseline, detector, gamma)
    
    confidence = float(model.compute_model_confidence())
    # FIX (Bug 1): doom_prob is a scalar float, not an array — compare directly
    label = "DOOMSCROLLING" if doom_prob > 0.65 else "CASUAL"
    
    return {
        "doom_score": float(doom_prob),
        "doom_label": label,
        "model_confidence": confidence,
        "heuristic_score": scorer_result.get('doom_score', 0.0),
        "heuristic_label": scorer_result.get('label', 'CASUAL'),
        "heuristic_components": scorer_result.get('components', {})
    }

def make_session_key(row):
    try:
        date_part = str(row['StartTime']).split(' ')[0]
    except:
        date_part = "unknown"
    return f"{date_part}__{row['SessionNum']}"

def run_full_pipeline(csv_path: str, state_path: str = None) -> ReelioCLSE:
    df = pd.read_csv(csv_path)
    
    model = ReelioCLSE()
    baseline = UserBaseline()
    detector = RegimeDetector()
    scorer = DoomScorer()
    
    df['_session_key'] = df.apply(make_session_key, axis=1)
    session_list = sorted(
        df.groupby('_session_key'),
        key=lambda x: x[1]['StartTime'].iloc[0]
    )
    prev_gamma = None
    
    for sess_id, s_df in session_list:
        s_df = preprocess_session(s_df)
        if len(s_df) < 2:
            continue
            
        path, doom_prob, gamma = model.process_session(s_df, baseline, detector, prev_gamma)
        prev_gamma = gamma
        
        s_obj = scorer.score(s_df, baseline, s_df['TimeSinceLastSessionMin'].iloc[0] if 'TimeSinceLastSessionMin' in s_df else 60.0)
        
    val_errs = validate_model(model)
    if val_errs:
        for e in val_errs:
            print(e)
            
    if state_path:
        with open(state_path, 'w') as f:
            json.dump(model._checkpoint_dict, f, default=lambda x: x.tolist() if isinstance(x, np.ndarray) else x)
            
    return model


def run_dashboard_payload(csv_data: str, state_path: str = None) -> str:
    import io

    if not csv_data or not csv_data.strip():
        return json.dumps({"error": "Empty CSV data", "sessions": []})
        
    try:
        lines = csv_data.split('\n')
        if lines and lines[0].startswith("SCHEMA_VERSION="):
            lines = lines[1:]
            
        # Dynamically fix schema mismatches (e.g., 94 columns vs 96 columns)
        # by forcing the header to always be the REQUIRED_COLUMNS.
        # Pandas will automatically pad older, shorter rows with NaN.
        if lines:
            header_cols = lines[0].split(',')
            if len(header_cols) < len(REQUIRED_COLUMNS):
                lines[0] = ','.join(REQUIRED_COLUMNS)
                
        csv_data = '\n'.join(lines)
        df = pd.read_csv(io.StringIO(csv_data))
    except Exception as e:
        return json.dumps({"error": f"CSV parse error: {str(e)}", "sessions": []})
        
    model = ReelioCLSE()
    baseline = UserBaseline()
    detector = RegimeDetector()
    
    if 'SessionNum' not in df.columns:
        return json.dumps({"error": "Schema missing SessionNum", "sessions": []})

    df['_session_key'] = df.apply(make_session_key, axis=1)
    session_list = sorted(
        df.groupby('_session_key'),
        key=lambda x: x[1]['StartTime'].iloc[0]
    )
    prev_gamma = None
    
    results = []
    p_capture_timeline = []
    session_circadian = []
    
    for sess_id, s_df in session_list:
        try:
            s_df = preprocess_session(s_df.copy())
            if len(s_df) < 2:
                continue
                
            path, doom_prob, gamma = model.process_session(s_df, baseline, detector, prev_gamma)
            prev_gamma = gamma
            
            mean_gamma_1 = float(np.mean(gamma[:, 1]))
            doom_reel_fraction = float(np.mean(gamma[:, 1] > 0.5))
            dom_state = 1 if doom_reel_fraction > 0.20 else 0
            S_t_reported = doom_reel_fraction
            
            time_period = s_df['TimePeriod'].iloc[0] if 'TimePeriod' in s_df.columns else "Unknown"
            
            try:
                date_str = pd.to_datetime(s_df['StartTime'].iloc[0]).strftime('%m-%d')
            except:
                date_str = "Unknown"
            
            avg_dwell = float(s_df['DwellTime'].mean()) if 'DwellTime' in s_df.columns else float(np.exp(s_df['log_dwell']).mean())

            # FIX: aggregate interaction counts per session and include in payload
            # Liked/Commented/Shared/Saved are per-reel binary flags — .sum() = total count
            total_likes    = int(s_df['Liked'].sum())     if 'Liked'      in s_df.columns else 0
            total_comments = int(s_df['Commented'].sum()) if 'Commented'  in s_df.columns else 0
            total_shares   = int(s_df['Shared'].sum())    if 'Shared'     in s_df.columns else 0
            total_saves    = int(s_df['Saved'].sum())     if 'Saved'      in s_df.columns else 0
            # InteractionRate is already a derived per-reel ratio — mean across session
            interaction_rate = float(s_df['InteractionRate'].mean()) if 'InteractionRate' in s_df.columns else 0.0
            
            # Get exact end time of the session for the live ticker
            end_time_str = "Unknown"
            if 'EndTime' in s_df.columns:
                end_time_str = str(s_df['EndTime'].iloc[-1])
            
            results.append({
                "sessionNum":          str(sess_id),
                "S_t":                 S_t_reported,
                "dominantState":       dom_state,
                "nReels":              len(s_df),
                "avgDwell":            avg_dwell,
                "timePeriod":          str(time_period),
                "date":                str(date_str),
                "endTime":             end_time_str,
                # Interaction data — previously missing from payload entirely
                "totalLikes":          total_likes,
                "totalComments":       total_comments,
                "totalShares":         total_shares,
                "totalSaves":          total_saves,
                "totalInteractions":   total_likes + total_comments + total_shares + total_saves,
                "interactionRate":     round(interaction_rate, 4)
            })
            
            p_capture_timeline.extend(gamma[:, 1].round(3).tolist())
            
            try:
                hour = pd.to_datetime(s_df['StartTime'].iloc[0]).hour if 'StartTime' in s_df.columns else 12
            except:
                hour = 12
            session_circadian.append({'h': hour, 'doom': mean_gamma_1})
            
        except Exception as e:
            continue
            
    regime_stability = 1.0 / (1.0 - model.A[1, 1]) if (1.0 - model.A[1, 1]) > 1e-5 else 999.0
    
    df_circ = pd.DataFrame(session_circadian) if session_circadian else pd.DataFrame(columns=['h', 'doom'])
    circadian_map = []
    # Use personal average doom as neutral fallback for unobserved hours
    # instead of a hardcoded baseline that fabricates risk patterns
    personal_avg_doom = float(df_circ['doom'].mean()) if len(df_circ) > 0 else 0.5

    for h in range(0, 24, 2):
        mask = df_circ['h'].isin([h, h+1])
        if len(df_circ) > 0 and mask.any():
            val = float(df_circ[mask]['doom'].mean())
        else:
            val = personal_avg_doom
        circadian_map.append({'h': f"{h:02d}", 'doom': round(val, 2)})
        
    output_payload = {
        "model_parameters": {
            "transition_matrix": model.A.tolist(),
            "regime_stability_score": float(regime_stability)
        },
        "sessions": results,
        "timeline": {
            "p_capture": p_capture_timeline
        },
        "circadian": circadian_map,
        "model_confidence": float(model.compute_model_confidence())
    }
    return json.dumps(output_payload)

if __name__ == "__main__":
    pass