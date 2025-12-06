import os
import time
from dotenv import load_dotenv
from pinecone import Pinecone
from sentence_transformers import SentenceTransformer

# Load Keys
load_dotenv()
api_key = os.getenv("PINECONE_API_KEY")
host = os.getenv("PINECONE_INDEX_HOST")

print("🔍 DIAGNOSTIC: Testing Memory Systems...")

if not api_key or "paste_your_key" in api_key:
    print("❌ ERROR: Your .env file still has the placeholder key!")
    print("   -> Go to backend/.env and paste your real Pinecone API Key.")
    exit()

try:
    # 1. Connect to Cloud
    print("☁️ Connecting to Pinecone...")
    pc = Pinecone(api_key=api_key)
    index = pc.Index(host=host)
    print("   -> Connection Successful.")

    # 2. Load Brain (Encoder)
    print("🧠 Loading Encoder Model...")
    encoder = SentenceTransformer('all-MiniLM-L6-v2')
    print("   -> Encoder Ready.")

    # 3. Save a Test Memory
    test_fact = "My son's name is Rah."
    print(f"💾 Saving Fact: '{test_fact}'")
    vector = encoder.encode(test_fact).tolist()
    unique_id = "test_memory_1"
    index.upsert(vectors=[(unique_id, vector, {"text": test_fact})])
    
    # Wait for cloud consistency (takes 2-10 seconds sometimes)
    print("⏳ Waiting 5 seconds for cloud sync...")
    time.sleep(5)

    # 4. Try to Recall it
    query = "What is the name of my son?"
    print(f"🔎 Asking: '{query}'")
    query_vec = encoder.encode(query).tolist()
    
    results = index.query(
        vector=query_vec,
        top_k=1,
        include_metadata=True
    )

    if results['matches']:
        found_text = results['matches'][0]['metadata']['text']
        score = results['matches'][0]['score']
        print(f"✅ SUCCESS! Recalled: '{found_text}' (Confidence: {score:.2f})")
    else:
        print("❌ FAILED: Cloud returned no results.")

except Exception as e:
    print(f"❌ CRITICAL ERROR: {e}")