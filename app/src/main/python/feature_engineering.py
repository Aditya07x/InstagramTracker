import pandas as pd
import numpy as np

def build_derived_features(csv_path: str) -> pd.DataFrame:
    """
    Ingests the 36-column V3 Reelio telemetry CSV and computes Layer 4 (Within-Session Derived),
    Layer 5 (Cross-Session Memory), and Layer 6 (Circadian/Physiological Proxies).
    """
    try:
        df = pd.read_csv(csv_path)
    except FileNotFoundError:
        return pd.DataFrame()

    if df.empty or 'StartTime' not in df.columns:
        return df

    # Parse timestamps
    df['StartTime'] = pd.to_datetime(df['StartTime'], errors='coerce')
    df['EndTime'] = pd.to_datetime(df['EndTime'], errors='coerce')
    df = df.sort_values(['SessionNum', 'ReelIndex']).reset_index(drop=True)

    # ==========================================
    # LAYER 4.1: Temporal Rhythm Features
    # ==========================================
    
    # Calculate per-session statistics
    session_stats = df.groupby('SessionNum')['DwellTime'].agg(['mean', 'std', 'count']).reset_index()
    df = df.merge(session_stats, on='SessionNum', suffixes=('', '_session'))
    
    # DwellTime_zscore and DwellTime_pctile
    df['DwellTime_zscore'] = np.where(df['std'] > 0, (df['DwellTime'] - df['mean']) / df['std'], 0.0)
    df['DwellTime_pctile'] = df.groupby('SessionNum')['DwellTime'].rank(pct=True)
    
    # DwellAcceleration: DwellTime[t] - DwellTime[t-1]
    df['DwellAcceleration'] = df.groupby('SessionNum')['DwellTime'].diff().fillna(0.0)
    
    # SessionDwellTrend: Slope of dwell time over the session
    def get_slope(y):
        if len(y) > 1:
            x = np.arange(len(y))
            slope, _ = np.polyfit(x, y, 1)
            return slope
        return 0.0
    
    slopes = df.groupby('SessionNum')['DwellTime'].apply(get_slope).rename('SessionDwellTrend')
    df = df.join(slopes, on='SessionNum')
    
    # EarlyVsLateRatio
    def early_late_ratio(group):
        n = len(group)
        if n > 2:
            early_mean = group.iloc[:n//2]['DwellTime'].mean()
            late_mean = group.iloc[n//2:]['DwellTime'].mean()
            return early_mean / max(late_mean, 1e-3)
        return 1.0
        
    ratios = df.groupby('SessionNum').apply(early_late_ratio).rename('EarlyVsLateRatio')
    df = df.join(ratios, on='SessionNum')

    # ==========================================
    # LAYER 4.2: Interaction Pattern Features
    # ==========================================
    
    df['Interacted'] = df[['Liked', 'Commented', 'Shared', 'Saved']].max(axis=1)
    df['InteractionRate'] = df.groupby('SessionNum')['Interacted'].transform(lambda x: x.rolling(window=5, min_periods=1).mean())
    df['InteractionBurstiness'] = df.groupby('SessionNum')['InteractionRate'].transform('std').fillna(0.0)
    
    # LikeStreakLength
    df['LikeStreakLength'] = df.groupby('SessionNum')['Liked'].transform(lambda x: x.groupby((x != x.shift()).cumsum()).cumsum())
    
    # InteractionDropoff
    def interaction_dropoff(group):
        n = len(group)
        if n > 4:
            early = group.iloc[:n//2]['Interacted'].mean()
            late = group.iloc[n//2:]['Interacted'].mean()
            return early - late
        return 0.0
        
    dropoffs = df.groupby('SessionNum').apply(interaction_dropoff).rename('InteractionDropoff')
    df = df.join(dropoffs, on='SessionNum')
    
    df['SavedWithoutLike'] = np.where((df['Saved'] == 1) & (df['Liked'] == 0), 1, 0)
    
    # ==========================================
    # LAYER 4.3: Scroll Rhythm Features
    # ==========================================
    # We use DwellTime as a proxy for the Inter-Scroll Interval.
    
    cv_func = lambda x: (x.std() / x.mean()) if x.mean() > 0 else 0.0
    scroll_cv = df.groupby('SessionNum')['DwellTime'].apply(cv_func).rename('ScrollIntervalCV')
    df = df.join(scroll_cv, on='SessionNum')
    
    # Rough Entropy estimation (histogram binning)
    def calculate_entropy(x):
        if len(x) < 2: return np.nan   # undefined, not zero
        counts, _ = np.histogram(x, bins=10, density=True)
        probs = counts / counts.sum()
        probs = probs[probs > 0]
        return -np.sum(probs * np.log2(probs))
        
    entropies = df.groupby('SessionNum')['DwellTime'].apply(calculate_entropy).rename('ScrollRhythmEntropy')
    df = df.join(entropies, on='SessionNum')

    # ==========================================
    # LAYER 5: Cross-Session Memory Features
    # ==========================================
    
    df['Date'] = df['StartTime'].dt.date
    
    # SessionsToday
    sessions_today = df.groupby(['Date'])['SessionNum'].transform('nunique')
    df['SessionsToday'] = sessions_today
    
    # TotalDwellToday_min
    dwell_today = df.groupby('Date')['DwellTime'].transform('sum') / 60.0
    df['TotalDwellToday_min'] = dwell_today
    
    # LongestSessionToday_reels
    session_lengths = df.groupby('SessionNum').size().to_dict()
    df['SessionLength'] = df['SessionNum'].map(session_lengths)
    longest_today = df.groupby('Date')['SessionLength'].transform('max')
    df['LongestSessionToday_reels'] = longest_today
    
    # Doom Streak (mock placeholder, usually passed in from HMM decoding)
    df['LastSessionDoomScore'] = 0.5 # Would be updated organically
    df['RollingDoomRate_7d'] = 0.5
    
    df['MorningSessionExists'] = df.groupby('Date')['TimePeriod'].transform(lambda x: 1 if "Morning" in x.values else 0)

    # Personal Baselines
    df['PersonalBaseline_dwell'] = df['DwellTime'].mean()
    df['PersonalBaseline_session'] = df.drop_duplicates('SessionNum')['SessionLength'].mean()

    # ==========================================
    # LAYER 6: Circadian and Physiological
    # ==========================================
    
    # Circadian Phase [0, 1] - fraction of day passed
    df['CircadianPhase'] = df['StartTime'].dt.hour / 24.0 + df['StartTime'].dt.minute / 1440.0
    
    df['WeekendFlag'] = df['StartTime'].dt.dayofweek.isin([5, 6]).astype(int)
    
    # Estimate Sleep proxy
    session_edges = df.groupby('SessionNum').agg({'StartTime': 'min', 'EndTime': 'max'}).reset_index()
    session_edges = session_edges.sort_values('StartTime').reset_index(drop=True)
    session_edges['NextStartTime'] = session_edges['StartTime'].shift(-1)
    session_edges['GapHours'] = (session_edges['NextStartTime'] - session_edges['EndTime']).dt.total_seconds() / 3600.0
    
    session_edges['EstimatedSleepDuration_h'] = session_edges['GapHours'].apply(lambda x: x if x > 3.0 else 7.0)
    session_edges['PriorSleepDur'] = session_edges['EstimatedSleepDuration_h'].shift(1).fillna(7.0)
    
    sleep_dict = session_edges.set_index('SessionNum')['PriorSleepDur'].to_dict()
    df['EstimatedSleepDurationH'] = df['SessionNum'].map(sleep_dict).fillna(7.0)
    
    df['SleepDeprived'] = (df['EstimatedSleepDurationH'] < 6.0).astype(int)
    
    # FIX-02: Mood Delta (Without normalization)
    df['MoodDelta'] = 0.0
    if 'MoodBefore' in df.columns and 'MoodAfter' in df.columns:
        mood_mask = (df['MoodBefore'] > 0) & (df['MoodAfter'] > 0)
        df.loc[mood_mask, 'MoodDelta'] = df.loc[mood_mask, 'MoodAfter'] - df.loc[mood_mask, 'MoodBefore']
        
    # FIX-07: Battery Delta cleanup
    if 'IsCharging' in df.columns and 'BatteryDeltaPerSession' in df.columns:
        df['BatteryDeltaPerSession'] = np.where(
            df['IsCharging'] == 1,
            0.0,
            df['BatteryDeltaPerSession'].clip(upper=0)
        )
        
    # FIX-09: SpeedDwellRatio
    if 'AvgScrollSpeed' in df.columns and 'DwellTime' in df.columns:
        df['SpeedDwellRatio'] = (
            np.log1p(df['AvgScrollSpeed'].clip(lower=0)) /
            np.log1p(df['DwellTime'].clip(lower=0.1))
        )
        speed_dwell_session = df.groupby('SessionNum')['SpeedDwellRatio'].mean().rename('SessionSpeedDwellRatio')
        df = df.join(speed_dwell_session, on='SessionNum')
        
    # FIX-11: LongPause
    if 'AvgScrollSpeed' in df.columns and 'DwellTime' in df.columns:
        DWELL_MEDIAN = df['DwellTime'].median()
        if pd.isna(DWELL_MEDIAN) or DWELL_MEDIAN == 0:
            DWELL_MEDIAN = 5.49
        df['LongPause'] = (
            (df['AvgScrollSpeed'] == 0) &
            (df['DwellTime'] > DWELL_MEDIAN * 2)
        ).astype(int)
        long_pause_rate = df.groupby('SessionNum')['LongPause'].mean().rename('LongPauseRate')
        df = df.join(long_pause_rate, on='SessionNum')
    
    # Consistency Score (variance of start hour)
    start_hours = session_edges.groupby(session_edges['StartTime'].dt.date)['StartTime'].apply(lambda dt: dt.iloc[0].hour + dt.iloc[0].minute/60.0)
    variance_start = start_hours.var()
    df['ConsistencyScore'] = variance_start if not pd.isna(variance_start) else 0.0

    return df

if __name__ == "__main__":
    import os
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    csv_path = os.path.join(BASE_DIR, "files", "insta_data.csv")
    print(f"Reading from: {csv_path}")
    
    # In Android environment via Chaquopy, this would test execution
    try:
        enriched_df = build_derived_features(csv_path)
        print(f"Generated DataFrame with shape: {enriched_df.shape}")
        if not enriched_df.empty:
            print("Successfully baked Layer 4-6 features:")
            cols = [c for c in enriched_df.columns if c not in ['SessionNum', 'ReelIndex', 'StartTime', 'EndTime']]
            print(f"Features mapped: {', '.join(cols[:15])}... (+ {max(0, len(cols)-15)} more)")
    except Exception as e:
        print(f"Preprocessing Error: {str(e)}")
