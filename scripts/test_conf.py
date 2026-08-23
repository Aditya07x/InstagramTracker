import sys
sys.path.append('app/src/main/python')
import json
from reelio_alse import run_dashboard_payload

with open('insta_data (5).csv', 'r', encoding='utf-8') as f:
    data = f.read()

out = run_dashboard_payload(data)
res = json.loads(out)
print(f"Confidence: {res.get('model_confidence')}")
print(f"Doom Score: {res['sessions'][-1]['S_t']}")
