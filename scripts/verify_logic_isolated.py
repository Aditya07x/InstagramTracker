import numpy as np

# Isolated logic from reelio_alse.py for local verification
DOOM_PROBABILITY_THRESHOLD = 0.55

class MockBaseline:
    def __init__(self):
        self.entropy_baseline = 2.0
        self.session_len_mu = 10.0
        self.session_len_sig = 5.0
        self.exit_rate_baseline = 0.05
        self.rewatch_rate_base = 0.05

class DoomScorer:
    def __init__(self, thresholds: dict = None):
        self.thresholds = thresholds or {'DOOM': DOOM_PROBABILITY_THRESHOLD, 'BORDERLINE': 0.35}
        self.component_weights = np.array([0.25, 0.20, 0.15, 0.15, 0.10, 0.10, 0.05])
        self.n_updates = 0

    def score(self, session_df_dict, baseline, gap_min: float, prev_S_t: float = 0.0) -> dict:
        n_reels = len(session_df_dict['AppExitAttempts'])
        
        c_length = min(n_reels / max(1.0, baseline.session_len_mu + 2 * baseline.session_len_sig), 1.0)
        
        exit_sum = sum(session_df_dict['AppExitAttempts']) / n_reels
        baseline_exit = max(baseline.exit_rate_baseline, 0.05)
        c_volconst = 1.0 - np.exp(-exit_sum / (baseline_exit + 0.5))
        c_volconst = float(np.clip(c_volconst, 0.0, 1.0))
        
        if gap_min <= 0:
            c_rapid = 0.0
        elif gap_min < 3:
            c_rapid = 1.0
        elif gap_min < 7:
            c_rapid = 0.6
        elif gap_min < 15:
            c_rapid = 0.3
        else:
            c_rapid = 0.0
            
        final_entropy = session_df_dict['ScrollRhythmEntropy'][-1]
        c_auto = float(np.clip(1.0 - (final_entropy / 4.0), 0.0, 1.0))
        
        trend_raw = session_df_dict['SessionDwellTrend'][-1]
        trend = float(np.clip(trend_raw, -2.0, 2.0))
        c_collapse = float(np.clip(-trend / 2.0, 0.0, 1.0))
        
        rewatch_sum = sum(session_df_dict['BackScrollCount']) / n_reels
        c_rewatch = min(rewatch_sum / max(0.01, baseline.rewatch_rate_base + 0.01), 1.0)
        
        lux = session_df_dict['AmbientLuxStart'][0]
        chrge = session_df_dict['IsCharging'][0]
        phase = session_df_dict['CircadianPhase'][0]
        
        sleep_start = 1
        sleep_end = 8
        hour = 5 # Mock hour
        
        in_sleep_window = (sleep_start <= hour < sleep_end)
        is_dark_rm = 1.0 if (lux < 15 and (phase > 0.75 or phase < 0.25)) else 0.0
        sleep_penalty = 1.0 if in_sleep_window else 0.0
        c_env_base = (
            0.15 * is_dark_rm +
            0.15 * float(chrge) +
            0.10 * float(lux < 5) +
            0.30 * sleep_penalty
        )
        c_env = float(np.clip(c_env_base, 0.0, 1.0))
        
        w = self.component_weights
        c_vec = np.array([
            c_length, c_volconst, c_rapid,
            c_auto, c_collapse, c_rewatch, c_env
        ])
        ds = float(np.dot(w, c_vec))
        
        components = {
            'session_length': float(c_length),
            'exit_conflict': float(c_volconst),
            'rapid_reentry': float(c_rapid),
            'scroll_automaticity': float(c_auto),
            'dwell_collapse': float(c_collapse),
            'rewatch_compulsion': float(c_rewatch),
            'environment': float(c_env),
        }
        return {'components': components, 'doom_score': ds}

scorer = DoomScorer()
baseline = MockBaseline()

# Test Case 1: Low entropy (Rhythmic) -> High Automaticity
df_rhythmic = {
    'AppExitAttempts': [0],
    'ScrollRhythmEntropy': [0.5], 
    'SessionDwellTrend': [0.0],
    'BackScrollCount': [0],
    'AmbientLuxStart': [50],
    'IsCharging': [0],
    'CircadianPhase': [0.5]
}
res_rhythmic = scorer.score(df_rhythmic, baseline, gap_min=60.0)
print(f"Rhythmic Automaticity: {res_rhythmic['components']['scroll_automaticity']:.4f}")

# Test Case 2: High entropy (Chaotic) -> Low Automaticity
df_chaotic = {
    'AppExitAttempts': [0],
    'ScrollRhythmEntropy': [3.5], 
    'SessionDwellTrend': [0.0],
    'BackScrollCount': [0],
    'AmbientLuxStart': [50],
    'IsCharging': [0],
    'CircadianPhase': [0.5]
}
res_chaotic = scorer.score(df_chaotic, baseline, gap_min=60.0)
print(f"Chaotic Automaticity: {res_chaotic['components']['scroll_automaticity']:.4f}")

# Test Case 3: Rapid Re-entry
res_rapid = scorer.score(df_rhythmic, baseline, gap_min=0.5)
print(f"Rapid Re-entry Score (0.5 min): {res_rapid['components']['rapid_reentry']:.4f}")

# Test Case 4: Environment Score (Late night + Dark)
df_dark_night = {
    'AppExitAttempts': [0],
    'ScrollRhythmEntropy': [2.0],
    'SessionDwellTrend': [0.0],
    'BackScrollCount': [0],
    'AmbientLuxStart': [5], 
    'IsCharging': [0],
    'CircadianPhase': [0.9] # Late night
}
res_env = scorer.score(df_dark_night, baseline, gap_min=60.0)
print(f"Environment Score (Dark/Night): {res_env['components']['environment']:.4f}")
