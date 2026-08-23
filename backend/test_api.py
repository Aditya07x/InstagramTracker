import requests
from datetime import datetime, timezone
import json
import redis

url = "http://localhost:8000/v1/sessions/batch"
headers = {
    "Authorization": "Bearer dummy_token",
    "Content-Type": "application/json"
}

payload = {
    "user_id": "test_user_1",
    "sessions": [
        {
            "client_session_id": f"session_abc_{datetime.now().timestamp()}",
            "session_start": datetime.now(timezone.utc).isoformat(),
            "session_end": datetime.now(timezone.utc).isoformat(),
            "duration_seconds": 120.5,
            "reels": [
                {
                    "reel_index": 0,
                    "start_time": datetime.now(timezone.utc).isoformat(),
                    "end_time": datetime.now(timezone.utc).isoformat(),
                    "dwell_time_sec": 10.0
                }
            ]
        }
    ]
}

print("Sending POST request to Ingestion API...")
response = requests.post(url, headers=headers, json=payload)
print(f"Status Code: {response.status_code}")
print(f"Response Body: {response.text}")

if response.status_code == 200:
    print("\nConnecting to Redis to verify stream...")
    r = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
    messages = r.xrange("session.ingested", min="-", max="+")
    if messages:
        print("Successfully found messages in Redis stream 'session.ingested':")
        for msg_id, data in messages:
            print(f"ID: {msg_id} -> {data}")
    else:
        print("Error: No messages found in Redis stream!")
