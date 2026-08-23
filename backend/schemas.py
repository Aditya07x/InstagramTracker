from pydantic import BaseModel
from typing import List
from datetime import datetime

class ReelIngest(BaseModel):
    reel_index: int
    start_time: datetime
    end_time: datetime
    dwell_time_sec: float

class SessionIngest(BaseModel):
    client_session_id: str
    session_start: datetime
    session_end: datetime
    duration_seconds: float
    reels: List[ReelIngest]

class BatchIngestRequest(BaseModel):
    user_id: str
    sessions: List[SessionIngest]
