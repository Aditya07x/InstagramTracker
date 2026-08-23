from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import psycopg2
import redis
from schemas import BatchIngestRequest

app = FastAPI(title="Reelio API")
security = HTTPBearer()

# Connect to Redis
r = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Stub JWT Authentication"""
    if credentials.credentials != "dummy_token":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return "authenticated_user"

@app.post("/v1/sessions/batch")
async def ingest_batch(payload: BatchIngestRequest, user=Depends(verify_token)):
    """
    Accepts a batch of sessions, writes to Postgres, and pushes to Redis Streams.
    """
    conn = psycopg2.connect(
        dbname="reelio_db",
        user="reelio",
        password="reelio_password",
        host="localhost",
        port="5432"
    )
    cursor = conn.cursor()
    try:
        processed_count = 0
        for session in payload.sessions:
            # Idempotent insert
            cursor.execute("""
                INSERT INTO sessions (
                    user_id, client_session_id, session_start, session_end, duration_seconds
                ) VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (client_session_id) DO NOTHING
                RETURNING id;
            """, (
                payload.user_id, 
                session.client_session_id, 
                session.session_start, 
                session.session_end, 
                session.duration_seconds
            ))
            row = cursor.fetchone()
            
            # If a new row was inserted (not a duplicate)
            if row:
                session_db_id = row[0]
                
                # Insert associated reels
                for reel in session.reels:
                    cursor.execute("""
                        INSERT INTO reels (
                            session_id, reel_index, start_time, end_time, dwell_time_sec
                        ) VALUES (%s, %s, %s, %s, %s)
                    """, (
                        session_db_id, 
                        reel.reel_index, 
                        reel.start_time, 
                        reel.end_time, 
                        reel.dwell_time_sec
                    ))
                
                # Push event to Redis Stream for the background worker
                r.xadd("session.ingested", {
                    "user_id": payload.user_id,
                    "client_session_id": session.client_session_id,
                    "session_db_id": str(session_db_id)
                })
                processed_count += 1
                
        conn.commit()
        return {"status": "success", "sessions_queued": processed_count}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@app.get("/v1/users/{user_id}/dashboard")
async def get_dashboard(user_id: str, user=Depends(verify_token)):
    """BFF Endpoint for the dashboard"""
    return {
        "user_id": user_id,
        "pull_index": 4.2,
        "capture_rate": 0.65,
        "latest_insight": "Your scrolling pattern indicates Rapid Re-entry."
    }
