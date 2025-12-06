import os
import logging
import asyncio
import time
import shutil
import base64
import cv2
import datetime
import numpy as np
from fastapi import FastAPI, BackgroundTasks, UploadFile, File, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv
from deepface import DeepFace 

# Import Custom Modules
from vision import vision 
from predictor import predictor

# --- CONFIGURATION ---
load_dotenv()
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("MAITRI-CORE")

PINECONE_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_HOST = os.getenv("PINECONE_INDEX_HOST")

# --- DATA MODELS ---
class Telemetry(BaseModel):
    hr: int
    hrv: int
    face: str
    timestamp: int

class ChatRequest(BaseModel):
    message: str
    telemetry: dict

class MobileImage(BaseModel):
    image: str
    mode: str

# --- SPEECH CENTER ---
class SpeechCenter:
    def __init__(self):
        self.model = None
        try:
            logger.info("🎙️ SPEECH: Loading Whisper Model...")
            from faster_whisper import WhisperModel
            self.model = WhisperModel("tiny.en", device="cpu", compute_type="int8")
            logger.info("✅ SPEECH: Whisper Model Ready")
        except: pass

    def transcribe(self, file_path):
        if not self.model: return ""
        try:
            segments, _ = self.model.transcribe(file_path, beam_size=5)
            return " ".join([segment.text for segment in segments]).strip()
        except: return ""

speech = SpeechCenter()

# --- MEMORY CENTER (RAG - SMART FILTERING) ---
class MemoryCenter:
    def __init__(self):
        self.encoder = None
        self.index = None
        self.offline_mode = False
        try:
            logger.info("🧠 MEMORY: Loading Embedding Model...")
            from sentence_transformers import SentenceTransformer
            self.encoder = SentenceTransformer('all-MiniLM-L6-v2')
            
            if PINECONE_KEY and "paste" not in PINECONE_KEY:
                from pinecone import Pinecone
                pc = Pinecone(api_key=PINECONE_KEY)
                self.index = pc.Index(host=PINECONE_HOST)
                logger.info("✅ MEMORY: Cloud Online")
            else: self.offline_mode = True
        except: self.offline_mode = True

    def save_memory(self, text):
        if self.offline_mode: return
        try:
            vector = self.encoder.encode(text).tolist()
            # Use timestamp for ID and Metadata
            ts = int(time.time())
            unique_id = str(ts)
            readable_time = datetime.datetime.fromtimestamp(ts).strftime('%Y-%m-%d %H:%M:%S')
            
            # Save Date/Time in Metadata
            self.index.upsert(vectors=[(unique_id, vector, {
                "text": text, 
                "created_at": readable_time, 
                "timestamp": ts
            })])
            logger.info(f"💾 SAVED ({readable_time}): '{text}'")
        except: pass

    def recall(self, query):
        if self.offline_mode: return ""
        try:
            query_vector = self.encoder.encode(query).tolist()
            results = self.index.query(vector=query_vector, top_k=5, include_metadata=True)
            
            # 1. Sort results by timestamp (Newest First)
            matches = results['matches']
            matches.sort(key=lambda x: x['metadata'].get('timestamp', 0), reverse=True)
            
            # 2. STRICT FILTERING: Only return the #1 most recent relevant memory
            # This prevents the AI from seeing the old "Rah" memory at all.
            if len(matches) > 0:
                top_match = matches[0]
                if top_match['score'] > 0.35:
                    date = top_match['metadata'].get('created_at', 'Unknown Date')
                    text = top_match['metadata']['text']
                    # We return ONLY this one line
                    return f"[{date}] {text}"
            
            return ""
        except: return ""

memory = MemoryCenter()

# --- AI ENGINE (OLLAMA) ---
class CognitiveEngine:
    def __init__(self):
        self.client = None
        try:
            import ollama
            self.client = ollama.AsyncClient()
        except: pass

    async def generate_thought_stream(self, user_message, system_prompt, past_context, background_tasks):
        if not self.client:
            yield "⚠️ Ollama Offline."
            return

        final_prompt = system_prompt
        
        # INJECT ONLY THE NEWEST MEMORY
        if past_context:
            final_prompt += f"\n\nCONFIRMED FACT:\n{past_context}\n\nINSTRUCTION: The fact above is the absolute truth. Ignore any previous knowledge that conflicts with it."

        try:
            # Using 'tinyllama'
            async for part in await self.client.chat(
                model='tinyllama', 
                messages=[{'role':'system','content':final_prompt},{'role':'user','content':user_message}], 
                stream=True
            ):
                yield part['message']['content']
        except Exception as e:
            logger.error(f"AI Gen Error: {e}")
            yield "⚠️ AI Memory Error."
        
        # Only save meaningful inputs
        if len(user_message.split()) > 2:
            background_tasks.add_task(memory.save_memory, f"User said: {user_message}")

ai = CognitiveEngine()
app = FastAPI(title="MAITRI Local Core")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- STARTUP / SHUTDOWN ---
@app.on_event("startup")
async def startup_event():
    vision.start_camera()

@app.on_event("shutdown")
async def shutdown_event():
    vision.stop()

# --- ENDPOINTS ---

@app.get("/health")
def health_check():
    telemetry = vision.get_telemetry()
    predictor.add_reading(telemetry['bpm'])
    forecast = predictor.predict_trend(10)
    
    return {
        "status": "online", 
        "current_hr": telemetry['bpm'],
        "current_emotion": telemetry['emotion'],
        "forecast": forecast
    }

@app.post("/api/analyze")
def analyze_telemetry(data: Telemetry):
    telemetry = vision.get_telemetry()
    real_hr = telemetry['bpm']
    emotion = str(telemetry['emotion']).lower()
    
    actions = []
    
    # 1. Stress
    if real_hr > 90:
        actions.append({"id": "INT-HR", "type": "AUDIO", "payload": "rain.mp3", "title": "High Stress", "desc": "Heart Rate critical."})
    
    # 2. Emotion
    if emotion in ["sad", "fear", "angry", "disgust"]:
        print(f"🚨 TRIGGER: Detected negative emotion '{emotion}'. Deploying Lights.")
        actions.append({
            "id": "INT-EMO", 
            "type": "LIGHTING", 
            "payload": "amber", 
            "title": "Emotional Distress", 
            "desc": f"Detected {emotion}. Adjusting lights to soothe."
        })

    return {"interventions": actions, "real_hr": real_hr, "emotion": emotion}

@app.post("/api/mobile/process_frame")
async def analyze_mobile_face(data: MobileImage):
    try:
        image_bytes = base64.b64decode(data.image)
        nparr = np.frombuffer(image_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        result = vision.process_mobile_frame(frame)
        return {"status": "success", "emotion": result['emotion'], "hr": result['bpm']}
    except Exception as e:
        logger.error(f"Mobile Vision Error: {e}")
        return {"status": "error", "emotion": "Neutral", "hr": 0}

@app.post("/api/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    temp_filename = f"temp_{int(time.time())}.webm"
    try:
        with open(temp_filename, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        text = speech.transcribe(temp_filename)
        return {"text": text}
    finally:
        if os.path.exists(temp_filename): os.remove(temp_filename)

@app.post("/api/chat")
async def chat_endpoint(req: ChatRequest, background_tasks: BackgroundTasks):
    telemetry = vision.get_telemetry()
    past_info = memory.recall(req.message)
    
    system_prompt = f"""You are MAITRI, a helpful AI assistant.
    Current User Status: Heart Rate {telemetry['bpm']} BPM.
    Instructions: Answer the user's question directly. Be concise.
    """
    
    return StreamingResponse(
        ai.generate_thought_stream(req.message, system_prompt, past_info, background_tasks),
        media_type="text/event-stream"
    )

@app.get("/video_feed")
def video_feed():
    return StreamingResponse(vision.generate_frames(), media_type="multipart/x-mixed-replace; boundary=frame")

if __name__ == "__main__":
    import uvicorn
    import socket
    hostname = socket.gethostname()
    local_ip = socket.gethostbyname(hostname)
    print(f"🚀 MAITRI MOBILE LINK ACTIVE")
    print(f"📡 Connect Phone to: http://{local_ip}:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000)