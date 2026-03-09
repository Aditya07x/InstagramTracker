
import json
import pandas as pd
import numpy as np

def test_smoothing():
    # Mock data resembling the user's situation
    # Many evening sessions (20:00) with moderate doom (0.5)
    # One morning session (10:00) with high doom (0.8)
    data = []
    for _ in range(10):
        data.append({'h': 20, 'doom': 0.5})
    data.append({'h': 10, 'doom': 0.8})
    
    df_circ = pd.DataFrame(data)
    personal_avg_doom = float(df_circ['doom'].mean())
    print(f"Global Average Doom: {personal_avg_doom:.3f}")
    
    m = 3.0
    circadian_map = []
    
    for h in range(0, 24, 2):
        mask = df_circ['h'].isin([h, h+1])
        if len(df_circ) > 0 and mask.any():
            subset = df_circ[mask]['doom']
            raw_val = subset.mean()
            val = (subset.sum() + m * personal_avg_doom) / (len(subset) + m)
            print(f"Hour {h:02d}: Raw={raw_val:.3f}, Smoothed={val:.3f}, Count={len(subset)}")
        else:
            val = personal_avg_doom
        circadian_map.append({'h': f"{h:02d}", 'doom': round(float(val), 2)})

if __name__ == "__main__":
    test_smoothing()
