import cv2
import numpy as np
import time
from deepface import DeepFace
import logging

logger = logging.getLogger("MAITRI-VISION")

class VisionSystem:
    def __init__(self):
        # --- SHARED STATE ---
        self.face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        self.current_emotion = "Neutral"
        self.last_emotion_update = time.time()

        # --- LAPTOP (LOCAL) STATE ONLY ---
        self.cap = None
        self.is_running = False
        self.local_hr = 72
        self.local_buffer = []
        self.local_buffer_size = 150
        self.local_last_bpm_update = time.time()

    def start_camera(self):
        if self.is_running: return
        self.cap = cv2.VideoCapture(0)
        self.is_running = True
        logger.info("👁️ VISION: Laptop Webcam Active.")

    def stop(self):
        self.is_running = False
        if self.cap: self.cap.release()

    def generate_frames(self):
        """Stream for Laptop Dashboard"""
        while self.is_running:
            if self.cap is None or not self.cap.isOpened():
                time.sleep(0.1)
                continue
            
            success, frame = self.cap.read()
            if not success: break

            # 1. Face Detection
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = self.face_cascade.detectMultiScale(gray, 1.1, 4)

            if len(faces) > 0:
                (x, y, w, h) = faces[0]
                cv2.rectangle(frame, (x, y), (x+w, y+h), (0, 255, 0), 2)
                
                # 2. rPPG (Green Channel)
                roi_x, roi_y, roi_w, roi_h = int(x+w*0.3), int(y+h*0.1), int(w*0.4), int(h*0.2)
                roi = frame[roi_y:roi_y+roi_h, roi_x:roi_x+roi_w]
                cv2.rectangle(frame, (roi_x, roi_y), (roi_x+roi_w, roi_y+roi_h), (255, 0, 0), 1)

                if roi.size > 0:
                    avg_green = np.mean(roi[:, :, 1])
                    self.local_buffer.append(avg_green)
                    
                    if len(self.local_buffer) > self.local_buffer_size:
                        self.local_buffer.pop(0)
                        if time.time() - self.local_last_bpm_update > 1.0:
                            self.calculate_local_bpm()
                            self.local_last_bpm_update = time.time()

                # 3. Emotion (Local)
                if time.time() - self.last_emotion_update > 2.0:
                    self.update_emotion(frame, x, y, w, h)

            # UI Overlay
            cv2.putText(frame, f"HR: {int(self.local_hr)} | {self.current_emotion}", (30, 50), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
            
            ret, buffer = cv2.imencode('.jpg', frame)
            yield (b'--frame\r\n' b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')

    def calculate_local_bpm(self):
        if len(self.local_buffer) < self.local_buffer_size: return
        data = np.array(self.local_buffer)
        data = data - np.mean(data)
        freqs = np.fft.fftfreq(len(data), d=1/30)
        fft_val = np.abs(np.fft.fft(data))
        idx = np.where((freqs > 0.8) & (freqs < 2.5))
        if len(freqs[idx]) > 0:
            bpm = freqs[idx][np.argmax(fft_val[idx])] * 60.0
            self.local_hr = (0.2 * bpm) + (0.8 * self.local_hr)

    # --- MOBILE PROCESSING (EMOTION ONLY) ---
    def process_mobile_frame(self, frame):
        # 1. Face Detect (Handle Rotation)
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = self.face_cascade.detectMultiScale(gray, 1.1, 4)

        if len(faces) == 0:
            frame = cv2.rotate(frame, cv2.ROTATE_90_CLOCKWISE)
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = self.face_cascade.detectMultiScale(gray, 1.1, 4)

        if len(faces) > 0:
            (x, y, w, h) = faces[0]
            # Update Emotion Only
            if time.time() - self.last_emotion_update > 2.0:
                self.update_emotion(frame, x, y, w, h)

        return {"bpm": int(self.local_hr), "emotion": self.current_emotion}

    def update_emotion(self, frame, x, y, w, h):
        try:
            face_img = frame[y:y+h, x:x+w]
            objs = DeepFace.analyze(img_path=face_img, actions=['emotion'], enforce_detection=False, detector_backend='opencv', silent=True)
            self.current_emotion = objs[0]['dominant_emotion']
            self.last_emotion_update = time.time()
        except: pass

    def get_telemetry(self):
        return {"bpm": int(self.local_hr), "emotion": self.current_emotion}
    
    def get_heart_rate(self):
        return int(self.local_hr)

vision = VisionSystem()