import os
import time
import json
import redis
import psycopg2
from pgvector.psycopg2 import register_vector
# import requests # We will use this when a real GROQ key is provided

# Connect to Redis
r = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

# Connect to Postgres
def get_db_connection():
    conn = psycopg2.connect(
        dbname="reelio_db",
        user="reelio",
        password="reelio_password",
        host="localhost",
        port="5432"
    )
    register_vector(conn)
    return conn

def generate_rag_insight(session_db_id):
    """
    Mock RAG pipeline.
    In production, this queries the LLM (Groq) with the fetched psychology context.
    """
    GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # 1. Fetch Session details (we'll just pretend it's Rapid Re-entry for this step)
        # Normally: cursor.execute("SELECT * FROM sessions WHERE id = %s", (session_db_id,))
        
        # 2. Retrieve relevant context from Vector DB (we're using a dummy vector here)
        print(f"Retrieving psychology context for session {session_db_id}...")
        cursor.execute("""
            SELECT title, text FROM psych_corpus_chunks 
            ORDER BY embedding <-> %s::vector LIMIT 1;
        """, ([0.1] * 1536,))
        context_chunk = cursor.fetchone()
        
        context_title = context_chunk[0] if context_chunk else "No context"
        
        # 3. Call Groq API (Mocked for now until API key is provided)
        if not GROQ_API_KEY:
            print("No GROQ_API_KEY found, using mock LLM response...")
            narrative = f"[MOCK LLM] Your scrolling pattern indicates you were trapped in a loop. Based on the psychology of '{context_title}', you should put the phone down."
        else:
            print("Groq API key found! Generating real response...")
            # Real API call goes here
            narrative = f"Real LLM output for session {session_db_id}"
            
        # 4. Save insight to DB
        cursor.execute("""
            INSERT INTO insights (session_id, narrative_text, model_used)
            VALUES (%s, %s, %s)
        """, (session_db_id, narrative, "mock_or_groq_llama3"))
        
        conn.commit()
        print(f"Insight generated and saved for session {session_db_id}")
        
    except Exception as e:
        conn.rollback()
        print(f"Error generating insight: {e}")
    finally:
        cursor.close()
        conn.close()

def listen_for_events():
    print("RAG Worker listening for 'session.ingested' events on Redis...")
    last_id = '0'
    while True:
        try:
            # Block and wait for new messages
            events = r.xread({'session.ingested': last_id}, count=1, block=5000)
            if events:
                stream, messages = events[0]
                for message_id, data in messages:
                    print(f"Received new session event: {data}")
                    session_db_id = data.get('session_db_id')
                    
                    if session_db_id:
                        generate_rag_insight(session_db_id)
                        
                    last_id = message_id
        except Exception as e:
            print(f"Redis polling error: {e}")
            time.sleep(5)

if __name__ == "__main__":
    listen_for_events()
