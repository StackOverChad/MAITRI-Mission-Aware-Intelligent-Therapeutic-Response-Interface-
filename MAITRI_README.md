````markdown
# MAITRI: Mission-Aware Intelligent Therapeutic Response Interface

### 🚀 AI Astronaut Assistant for the Bharatiya Antariksh Station (BAS)

**MAITRI** is an autonomous, multimodal AI ecosystem designed to support the mental and physical well-being of astronauts during long-duration space missions.

Unlike standard chatbots, MAITRI runs **locally** (Offline-First), sees you via **Computer Vision**, hears you via **Speech Recognition**, remembers your personal details via **Long-Term Memory**, and predicts your future health via a **Digital Twin**.

---

## 🌟 Key Features

### 1. 🧠 Local Cognitive Core
Powered by **Llama-3** or **Phi-3** running locally via Ollama. No data leaves the "station" (your computer) for inference, ensuring mission security and privacy.

### 2. 👁️ Multimodal Sensing (The "Eyes")
* **rPPG (Remote Photoplethysmography):** Detects **Heart Rate** in real-time using a standard webcam (no wearable sensors required).
* **Affective Computing:** Uses **DeepFace** to detect emotional states (Happy, Sad, Fear, Angry, Disgust) from facial micro-expressions.

### 3. 🔮 Digital Twin (The "Prophet")
* **Predictive Analytics:** Uses **Scikit-Learn** linear regression to analyze your biometric trends over the last 30 minutes.
* **Burnout Warning:** Predicts your heart rate 10 minutes into the future. If the trend is "RISING," it warns you *before* you reach exhaustion.

### 4. 💾 Long-Term Memory (The "Hippocampus")
* **RAG Architecture:** Uses **Pinecone** (Vector DB) to store and recall past conversations.
* **Contextual Awareness:** If you tell MAITRI "My daughter is Ananya," it will remember that fact days later and use it in future conversations.

### 5. 🌊 Environmental Control (The "Response")
* **Acoustic Dampening:** Automatically plays soothing soundscapes (Rain/White Noise) when high stress (>90 BPM) is detected.
* **Circadian Lighting:** Changes the entire dashboard UI color (e.g., to Warm Amber) if "Sadness" or "Fatigue" is detected to physically soothe the astronaut.

### 6. 🗣️ Hands-Free Voice Interface
* **Ears:** Uses **Faster-Whisper** for real-time, highly accurate speech-to-text running locally on the CPU.
* **Mouth:** Uses the browser's Neural Text-to-Speech (TTS) to speak responses aloud.

---

## 🛠️ Tech Stack

* **Frontend:** Next.js 14 (React), Tailwind CSS, Recharts (Data Visualization).
* **Backend:** Python FastAPI, Uvicorn.
* **AI Engine:** Ollama (Llama-3 / Phi-3).
* **Vision & ML:** OpenCV, SciPy, DeepFace, Scikit-Learn.
* **Memory:** Pinecone (Vector DB), Sentence-Transformers (Local Embeddings).
* **Voice:** Faster-Whisper.

---

## 📋 Prerequisites

Before starting, ensure you have the following installed:

1.  **Python 3.10+**
2.  **Node.js 18+** (for the dashboard)
3.  **Webcam** (Essential for biometrics)
4.  **Ollama** (Installed and running)

---

## ⚙️ Installation Guide

Follow these steps to set up the complete system on your local machine.

### Phase 1: Setup the AI Brain (Ollama)

We use **Ollama** to run the heavy AI models locally.

1.  **Download Ollama:** [https://ollama.com/download](https://ollama.com/download)
2.  **Install:** Run the setup file.
3.  **Download the Model:** Open your terminal and run:
    ```powershell
    ollama run llama3
    ```
    *(Note: If your computer is slow, use `ollama run phi3` for a faster, lightweight model).*

### Phase 2: Setup the Backend (The Core)

1.  **Navigate to the backend folder:**
    ```bash
    cd maitri-local/backend
    ```

2.  **Create a Virtual Environment:**
    ```bash
    python -m venv venv
    ```

3.  **Activate the Environment:**
    * **Windows:** `.\venv\Scripts\activate`
    * **Mac/Linux:** `source venv/bin/activate`

4.  **Install Dependencies:**
    ```bash
    pip install -r requirements.txt
    ```
    *This installs FastAPI, OpenCV, DeepFace, Pinecone client, Whisper, and other ML libraries (approx. 2GB).*

### Phase 3: Setup Memory (Pinecone)

To enable memory, we use **Pinecone** (a vector database).

1.  **Get API Key:**
    * Go to [Pinecone.io](https://www.pinecone.io/) and sign up (Free Tier).
    * Create a new Index named `maitri-memory`.
    * **IMPORTANT:** Set Dimensions to `384` (to match our local embedding model).
    * Copy your **API Key** and **Index Host URL**.

2.  **Configure Environment:**
    * Open `backend/.env` file.
    * Paste your keys:
    ```ini
    PINECONE_API_KEY=your_actual_api_key_here
    PINECONE_INDEX_HOST=[https://your-index-url.pinecone.io](https://your-index-url.pinecone.io)
    MODEL_STORAGE_PATH=E:/MAITRI_Models  # Or wherever you want to store huge files
    ```

### Phase 4: Setup the Frontend (The Dashboard)

1.  **Navigate to the frontend folder:**
    ```bash
    cd ../frontend
    ```

2.  **Install Node Modules:**
    ```bash
    npm install
    ```

3.  **Add Audio Assets:**
    * Ensure you have a file named `rain.mp3` inside `frontend/public/` for the stress-relief feature to work.

---

## 🚀 How to Run the Project

You need to run two terminals simultaneously.

### Terminal 1: Start the Backend
```powershell
cd maitri-local/backend
.\venv\Scripts\activate
python main.py
````

  * **Wait:** The first time you run this, it may take a few minutes to download the DeepFace and Whisper models.
  * **Success Check:** You should see `👁️ VISION: Webcam Active` and `✅ COGNITIVE: Connected to Ollama`.
  * **Note:** Your webcam light should turn on.

### Terminal 2: Start the Frontend

```powershell
cd maitri-local/frontend
npm run dev
```

### Access the Interface

Open your browser and go to:
👉 **http://localhost:3000**

-----

## 🕹️ User Guide: Testing the Features

### 1\. Initialize Audio

Click the large **"INITIALIZE SYSTEMS"** button on the screen overlay. This unlocks the browser's audio engine (browsers block auto-play by default).

### 2\. Test Vision & Heart Rate

  * Look at the camera. A green box with "TARGET LOCKED" will track your face.
  * Wait 10-15 seconds. The "LIVE PULSE" number in the corner will stabilize as the buffer fills.
  * **Action:** Do jumping jacks or hold your breath. Watch the graph rise.

### 3\. Test the "Digital Twin"

  * If your heart rate rises steadily (e.g., 70 -\> 75 -\> 80), look at the **FORECAST** card.
  * It will change to **"RISING" (Red)** and warn you of fatigue in 10 minutes.

### 4\. Test Emotion & Environment

  * Make a **Sad** or **Angry** face at the camera.
  * **Watch:** The "AFFECT" badge in the video feed changes.
  * **React:** The background color of the dashboard will fade to **Warm Amber**, and the Rain sound will start playing automatically to soothe you.

### 5\. Test Voice & Memory

  * Hold the **Mic Button**. Say: *"My blood type is O Positive."*
  * Refresh the page (simulating a reboot).
  * Hold the Mic and ask: *"What is my blood type?"*
  * MAITRI will speak the answer back: *"Your blood type is O Positive."*

-----

## ⚠️ Troubleshooting

  * **Graph is Flat / 0 BPM:** Ensure your face is well-lit. The rPPG algorithm needs light to detect blood flow changes in your skin.
  * **"Ollama Offline" Error:** Ensure the Ollama app is running in your system tray (bottom right of Windows taskbar).
  * **"Pinecone Error":** Check your `.env` file. Ensure you selected **384 dimensions** when creating the index on the Pinecone website.
  * **Audio not playing:** Ensure you clicked the "Initialize" button and `rain.mp3` exists in the public folder.

-----

## 📜 License

This project is a prototype developed for the **Bharatiya Antariksh Station (BAS)** concept demonstration.

```
```