import psycopg2
from pgvector.psycopg2 import register_vector
import redis

# Test PostgreSQL
try:
    print("Connecting to PostgreSQL...")
    conn = psycopg2.connect(
        dbname="reelio_db",
        user="reelio",
        password="reelio_password",
        host="localhost",
        port="5432"
    )
    register_vector(conn)
    cursor = conn.cursor()
    
    print("Testing Vector Insertion...")
    cursor.execute("""
        INSERT INTO psych_corpus_chunks (source, title, text, embedding) 
        VALUES (%s, %s, %s, %s) 
        RETURNING id;
    """, ("test_source", "test_title", "test_text", [0.1, 0.2, 0.3] + [0.0]*1533))
    inserted_id = cursor.fetchone()[0]
    conn.commit()
    print(f"Successfully inserted vector chunk with ID {inserted_id}")
    
    print("Testing Vector Querying...")
    cursor.execute("""
        SELECT id, text, embedding <-> %s::vector AS distance 
        FROM psych_corpus_chunks 
        ORDER BY distance LIMIT 1;
    """, ([0.1, 0.2, 0.3] + [0.0]*1533,))
    result = cursor.fetchone()
    print(f"Closest match ID: {result[0]}, Distance: {result[2]}")
    
    conn.close()
    print("PostgreSQL integration successful!")

except Exception as e:
    print(f"PostgreSQL connection failed: {e}")

# Test Redis
try:
    print("\nConnecting to Redis...")
    r = redis.Redis(host='localhost', port=6379, db=0)
    r.set('test_key', 'test_value')
    val = r.get('test_key').decode('utf-8')
    assert val == 'test_value'
    print("Redis integration successful!")
except Exception as e:
    print(f"Redis connection failed: {e}")
