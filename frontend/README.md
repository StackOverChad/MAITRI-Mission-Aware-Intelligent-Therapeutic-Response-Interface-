# MAITRI: Mission-Aware Intelligent Therapeutic Response Interface

### 🚀 AI Astronaut Assistant for the Bharatiya Antariksh Station (BAS)

**MAITRI** is an autonomous, multimodal AI ecosystem designed to support the mental and physical well-being of astronauts during long-duration space missions.

Unlike standard chatbots, MAITRI runs **locally** (Offline-First), sees you via **Computer Vision**, hears you via **Speech Recognition**, remembers your personal details via **Long-Term Memory**, and predicts your future health via a **Digital Twin**. It includes a synchronized **Mobile Comms Link** for portable monitoring.

---

## 🌟 Key Features

### 1. 🧠 Local Cognitive Core
Powered by **TinyLlama** or **Phi-3** running locally via Ollama. No data leaves the "station" (your computer) for inference, ensuring mission security and privacy.

### 2. 👁️ Dual-Core Vision System
* **Laptop Vision:** Uses rPPG (Remote Photoplethysmography) to detect **Heart Rate** via the webcam.
* **Mobile Vision:** Streams video frames from the mobile app to the backend for real-time **Emotion Detection** and **Pulse Monitoring**.
* **Affective Computing:** Uses **DeepFace** to detect emotional states (Happy, Sad, Fear, Angry, Disgust).

### 3. 🔮 Digital Twin (The "Prophet")
* **Predictive Analytics:** Uses **Scikit-Learn** linear regression to analyze your biometric trends over the last 30 minutes.
* **Burnout Warning:** Predicts your heart rate 10 minutes into the future. If the trend is "RISING," it warns you *before* you reach exhaustion.

### 4. 💾 Time-Aware Memory (The "Hippocampus")
* **RAG Architecture:** Uses **Pinecone** (Vector DB) to store and recall past conversations.
* **Temporal Awareness:** The system timestamps memories and resolves conflicts by prioritizing the most recent information (e.g., updating family details).

### 5. 🌊 Environmental Control (The "Response")
* **Acoustic Dampening:** Automatically plays soothing soundscapes (Rain/White Noise) when high stress (>90 BPM) is detected.
* **Circadian Lighting:** Changes the entire dashboard and mobile app UI color (e.g., to Warm Amber) if "Sadness" or "Fatigue" is detected to physically soothe the astronaut.

### 6. 📱 Mobile Comms Link
* **React Native App:** A portable "Communicator" that syncs telemetry with the main console.
* **Remote Sensors:** Allows the astronaut to use the phone's camera as a biometric sensor while moving around the station.

### 7. 🗣️ Hands-Free Voice Interface
* **Ears:** Uses **Faster-Whisper** for real-time, highly accurate speech-to-text running locally on the CPU.
* **Mouth:** Uses the browser's Neural Text-to-Speech (TTS) to speak responses aloud.

---

## 🛠️ Tech Stack

* **Frontend (Console):** Next.js 14 (React), Tailwind CSS, Recharts (Data Visualization).
* **Mobile:** React Native (Expo).
* **Backend:** Python FastAPI, Uvicorn.
* **AI Engine:** Ollama (TinyLlama / Phi-3).
* **Vision & ML:** OpenCV, SciPy, DeepFace, Scikit-Learn.
* **Memory:** Pinecone (Vector DB), Sentence-Transformers (Local Embeddings).
* **Voice:** Faster-Whisper.

---

## 📋 Prerequisites

Before starting, ensure you have the following installed:

1.  **Python 3.10+**
2.  **Node.js 18+**
3.  **Webcam** (Essential for biometrics)
4.  **Ollama** (Installed and running)
5.  **Expo Go** App (Installed on your phone)

---

## ⚙️ Installation Guide

### Phase 1: Setup the AI Brain (Ollama)

We use **Ollama** to run the heavy AI models locally.

1.  Download & Install **Ollama**: [https://ollama.com/download](https://ollama.com/download)
2.  Open terminal and run:
    ```powershell
    ollama run tinyllama
    ```
    *(Note: You can use `phi3` if your computer has >8GB RAM).*

### Phase 2: Setup the Backend (The Core)

1.  Navigate to the backend folder:
    ```bash
    cd maitri-local/backend
    ```
2.  Create & Activate Virtual Environment:
    ```bash
    python -m venv venv
    # Windows:
    .\venv\Scripts\activate
    # Mac/Linux:
    source venv/bin/activate
    ```
3.  Install Dependencies (approx. 2GB):
    ```bash
    pip install -r requirements.txt
    ```

### Phase 3: Setup Memory (Pinecone)

1.  Get a free API Key from [Pinecone.io](https://www.pinecone.io/).
2.  Create a new Index named `maitri-memory`.
3.  **IMPORTANT:** Set Dimensions to `384` (to match our local embedding model).
4.  Update `backend/.env`:
    ```ini
    PINECONE_API_KEY=your_actual_api_key_here
    PINECONE_INDEX_HOST=[https://your-index-url.pinecone.io](https://your-index-url.pinecone.io)
    ```

### Phase 4: Setup the Frontends

**Laptop Dashboard:**
1.  Navigate to frontend: `cd ../frontend`
2.  Install: `npm install`
3.  Ensure `rain.mp3` exists in `frontend/public/`.

**Mobile App:**
1.  Navigate to mobile: `cd ../mobile`
2.  Install: `npm install`

---

## 🚀 How to Run the Project

You need to run three terminals simultaneously.

### Terminal 1: Backend
```powershell
cd maitri-local/backend
.\venv\Scripts\activate
python main.py
Note the IP Address: The console will print 📡 Connect Phone to: http://192.168.x.x:8000. You need this for the mobile app.

Terminal 2: Laptop Dashboard
PowerShell

cd maitri-local/frontend
npm run dev
Open http://localhost:3000.

Terminal 3: Mobile App
Open mobile/App.js and update const PC_IP = "YOUR_LAPTOP_IP";.

Run:

PowerShell

cd maitri-local/mobile
npx expo start -c
Scan the QR code with your phone.

🕹️ User Guide
1. Initialize Audio
Click the large "INITIALIZE SYSTEMS" button on the Laptop Dashboard. This unlocks the audio engine.

2. Test Vision & Heart Rate
Laptop: Look at the webcam. A green box tracks your face. Wait 10s for the pulse to stabilize.

Mobile: Tap "DETECT MOOD" on your phone. It will stream frames to the laptop, and the laptop will tell your phone (and the dashboard) how you are feeling.

3. Test the "Digital Twin"
If your heart rate rises steadily (e.g., do jumping jacks), the FORECAST card will turn RED ("RISING") and warn you of fatigue.

4. Test Environmental Control
Make a Sad or Angry face at the camera.

React: Both the Laptop and Mobile App backgrounds will fade to Warm Amber, and rain sounds will play.

5. Test Voice & Memory
Hold the Mic Button. Say: "My blood type is O Positive."

Refresh the page.

Hold the Mic and ask: "What is my blood type?"

MAITRI will speak the answer back: "Your blood type is O Positive."

📜 License
This project is a prototype developed for the Bharatiya Antariksh Station (BAS) concept demonstration.