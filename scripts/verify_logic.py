import pandas as pd
import numpy as np
import sys
import os

# Mock classes to simulate baseline and scorer
class MockBaseline:
    def __init__(self):
        self.entropy_baseline = 2.0
        self.session_len_mu = 10.0
        self.session_len_sig = 5.0
        self.exit_rate_baseline = 0.05
        self.rewatch_rate_base = 0.05

sys.path.append(r'c:\Android Projects\InstagramTracker\app\src\main\python')
from reelio_alse import DoomScorer, UserBaseline

scorer = DoomScorer()
baseline = MockBaseline()

# Test Case 1: Low entropy (Rhythmic) -> High Automaticity
df_rhythmic = pd.DataFrame({
    'AppExitAttempts': [0],
    'ScrollRhythmEntropy': [0.5], # Low
    'SessionDwellTrend': [0.0],
    'BackScrollCount': [0],
    'AmbientLuxStart': [50],
    'IsCharging': [0],
    'CircadianPhase': [0.5],
    'StartTime': ['2026-02-27T12:00:00Z']
})

res_rhythmic = scorer.score(df_rhythmic, baseline, gap_min=60.0)
print(f"Rhythmic Automaticity: {res_rhythmic['components']['scroll_automaticity']:.4f}")

# Test Case 2: High entropy (Chaotic) -> Low Automaticity
df_chaotic = pd.DataFrame({
    'AppExitAttempts': [0],
    'ScrollRhythmEntropy': [3.5], # High
    'SessionDwellTrend': [0.0],
    'BackScrollCount': [0],
    'AmbientLuxStart': [50],
    'IsCharging': [0],
    'CircadianPhase': [0.5],
    'StartTime': ['2026-02-27T12:00:00Z']
})

res_chaotic = scorer.score(df_chaotic, baseline, gap_min=60.0)
print(f"Chaotic Automaticity: {res_chaotic['components']['scroll_automaticity']:.4f}")

# Test Case 3: Rapid Re-entry
res_rapid = scorer.score(df_rhythmic, baseline, gap_min=0.5)
print(f"Rapid Re-entry Score (0.5 min): {res_rapid['components']['rapid_reentry']:.4f}")

# Test Case 4: Environment Score (Late night + Dark)
df_dark_night = pd.DataFrame({
    'AppExitAttempts': [0],
    'ScrollRhythmEntropy': [2.0],
    'SessionDwellTrend': [0.0],
    'BackScrollCount': [0],
    'AmbientLuxStart': [5], # Dark
    'IsCharging': [0],
    'CircadianPhase': [0.1], # Late night
    'StartTime': ['2026-02-27T03:00:00Z'],
    'SleepStart': [1],
    'SleepEnd': [8]
})

res_env = scorer.score(df_dark_night, baseline, gap_min=60.0)
print(f"Environment Score (Dark/Night): {res_env['components']['environment']:.4f}")
