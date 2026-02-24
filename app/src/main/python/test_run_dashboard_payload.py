import json
from reelio_alse import run_dashboard_payload

with open('insta_data.csv', 'r') as f:
    csv_content = f.read()

result = run_dashboard_payload(csv_content)
parsed = json.loads(result)
print("circadian length:", len(parsed.get('circadian', [])))
print("circadian sample:", parsed.get('circadian', [])[:3])
