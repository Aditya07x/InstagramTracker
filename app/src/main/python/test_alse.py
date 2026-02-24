import pandas as pd
from reelio_alse import make_session_key

df = pd.read_csv('insta_data.csv', skiprows=1)
df['_session_key'] = df.apply(make_session_key, axis=1)

for key, group in df.groupby('_session_key'):
    dates = group['StartTime'].str.split(' ').str[0].unique()
    assert len(dates) == 1, f"Collision in {key}: {dates}"

print(" No collisions — all session keys are date-unique")
