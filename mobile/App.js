import { registerRootComponent } from 'expo';
import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator, StatusBar, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Brain, Send, Activity, Heart, Radio, AlertTriangle, Smile, Camera as CameraIcon, Zap, X } from 'lucide-react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

// ⚠️ REPLACE WITH YOUR LAPTOP IP
const PC_IP = "10.22.20.227"; 
const API_URL = `http://${PC_IP}:8000`;

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function App() {
  const [messages, setMessages] = useState([{ role: 'ai', text: "Mobile Link Established. Select Sensor Mode." }]);
  const [input, setInput] = useState("");
  
  // Telemetry
  const [heartRate, setHeartRate] = useState(0);
  const [emotion, setEmotion] = useState("Neutral");
  
  // UI State
  const [bgColor, setBgColor] = useState("#000000");
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef();

  // Camera State
  const [visionMode, setVisionMode] = useState(null); // 'FACE', 'FINGER', or null
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);

  // 1. MAIN LOOP (Sync Logic)
  useEffect(() => {
    const interval = setInterval(() => {
      // LOGIC FIX: 
      // If Mobile Camera is OFF (visionMode is null), send "Normal".
      // This tells the backend: "Ignore me, use the Laptop Webcam for emotion".
      // If Mobile Camera is ON, send the detected emotion to override the Laptop.
      const emotionPayload = (visionMode === 'FACE') ? emotion : "Normal";

      fetch(`${API_URL}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          hr: 0, // Always use Laptop/Backend for HR aggregation
          hrv: 0, 
          face: emotionPayload, 
          timestamp: 0 
        })
      })
      .then(res => res.json())
      .then(data => {
        setIsConnected(true);
        
        // SYNC: If Mobile Camera is OFF, update our UI with what the Laptop sees
        if (!visionMode) {
          setHeartRate(Math.round(data.real_hr || 0));
          // Capitalize the emotion from backend
          const backendEmotion = data.emotion || "Neutral";
          setEmotion(backendEmotion.charAt(0).toUpperCase() + backendEmotion.slice(1));
        } else {
          // If Mobile Camera is ON, we only sync HR (since we are generating the emotion)
          setHeartRate(Math.round(data.real_hr || 0));
        }
        
        handleInterventions(data.interventions);
      })
      .catch(() => setIsConnected(false));
    }, 1000); 
    return () => clearInterval(interval);
  }, [visionMode, emotion]); 

  const handleInterventions = (actions) => {
    const lightAction = actions.find(a => a.type === 'LIGHTING');
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (lightAction && lightAction.payload === 'amber') setBgColor("#451a03");
    else setBgColor("#000000");
  };

  // 2. MOBILE VISION STREAMING
  useEffect(() => {
    let frameTimer;
    if (visionMode && permission?.granted) {
      // Send frames periodically
      frameTimer = setInterval(async () => {
        if (cameraRef.current) {
          try {
            const photo = await cameraRef.current.takePictureAsync({ 
              base64: true, 
              quality: 0.3, 
              skipProcessing: true 
            });
            
            const res = await fetch(`${API_URL}/api/mobile/process_frame`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                image: photo.base64, 
                mode: 'face' // Only using Face mode logic on backend for emotion
              })
            });
            
            const data = await res.json();
            if (data.status === 'success') {
              if (visionMode === 'FACE') setEmotion(data.emotion);
            }
          } catch (e) { 
            // Silent catch 
          }
        }
      }, 1000); // 1 FPS is enough for Emotion
    }
    return () => clearInterval(frameTimer);
  }, [visionMode, permission]);

  const toggleMode = async (mode) => {
    if (!permission?.granted) await requestPermission();
    if (visionMode === mode) setVisionMode(null);
    else setVisionMode(mode);
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, telemetry: { hr: heartRate } })
      });
      const text = await res.text();
      setMessages(prev => [...prev, { role: 'ai', text: text }]);
    } catch (e) { setMessages(prev => [...prev, { role: 'ai', text: "⚠️ Signal Lost." }]); } 
    finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      <StatusBar barStyle="light-content" backgroundColor={bgColor} />
      
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoBox}><Brain color="white" size={24} /></View>
          <View>
            <Text style={styles.title}>MAITRI <Text style={styles.blueText}>MOBILE</Text></Text>
            <Text style={styles.subtitle}>BAS COMMS LINK</Text>
          </View>
        </View>
        <Radio color={isConnected ? "#10b981" : "#ef4444"} size={14} />
      </View>

      {/* CAMERA VIEWFINDER */}
      {visionMode && (
        <View style={styles.cameraBox}>
          <CameraView 
            style={{ flex: 1 }} 
            facing="front"
            ref={cameraRef}
          />
          <View style={styles.overlay}>
            <Text style={styles.overlayText}>
              ANALYZING MICRO-EXPRESSIONS...
            </Text>
          </View>
          <TouchableOpacity onPress={() => setVisionMode(null)} style={styles.closeBtn}>
            <X color="white" size={20} />
          </TouchableOpacity>
        </View>
      )}

      {/* SENSOR CONTROLS */}
      <View style={styles.controlRow}>
        <TouchableOpacity 
          onPress={() => toggleMode('FACE')} 
          style={[styles.btn, visionMode === 'FACE' ? styles.btnActive : null]}
        >
          <Smile color={visionMode === 'FACE' ? "#60a5fa" : "white"} size={20} />
          <Text style={[styles.btnText, visionMode === 'FACE' ? {color: '#60a5fa'} : null]}>
            {visionMode === 'FACE' ? "STOP SENSORS" : "DETECT MOBILE MOOD"}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} ref={scrollViewRef}>
        <View style={styles.row}>
          <View style={styles.metric}>
            <Text style={styles.label}>STATION PULSE</Text>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 5}}>
              <Text style={styles.value}>{heartRate}</Text>
              <Text style={styles.unit}>BPM</Text>
            </View>
          </View>
          <View style={styles.metric}>
            <Text style={styles.label}>AFFECT</Text>
            <Text style={[styles.value, { textTransform: 'capitalize', fontSize: 20 }]}>{emotion}</Text>
          </View>
        </View>

        <View style={styles.chatContainer}>
          {messages.map((msg, idx) => (
            <View key={idx} style={[styles.msg, msg.role === 'user' ? styles.user : styles.ai]}>
              <Text style={styles.msgText}>{msg.text}</Text>
            </View>
          ))}
          {loading && <ActivityIndicator color="#2563eb" style={{ margin: 10 }} />}
        </View>
      </ScrollView>

      <View style={[styles.inputBox, { backgroundColor: 'rgba(0,0,0,0.3)' }]}>
        <TextInput style={styles.input} placeholder="Transmission..." placeholderTextColor="#6b7280" value={input} onChangeText={setInput} onSubmitEditing={sendMessage} />
        <TouchableOpacity onPress={sendMessage} style={styles.sendBtn}><Send color="white" size={20} /></TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 30 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, marginBottom: 10 },
  headerLeft: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  logoBox: { width: 40, height: 40, backgroundColor: '#2563eb', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  title: { color: 'white', fontWeight: 'bold', fontSize: 18 },
  blueText: { color: '#3b82f6' },
  subtitle: { color: '#9ca3af', fontSize: 10, letterSpacing: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  
  cameraBox: { height: 250, marginHorizontal: 20, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#3b82f6', marginBottom: 20 },
  overlay: { position: 'absolute', bottom: 10, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.6)', padding: 5, borderRadius: 4 },
  overlayText: { color: '#10b981', fontSize: 10, fontWeight: 'bold' },
  closeBtn: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.5)', padding: 8, borderRadius: 20 },

  controlRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 20 },
  btn: { flex: 1, flexDirection: 'row', gap: 8, backgroundColor: '#1f2937', padding: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#374151' },
  btnActive: { backgroundColor: 'rgba(37, 99, 235, 0.2)', borderColor: '#3b82f6' },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 12 },

  row: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 20 },
  metric: { flex: 1, backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: 16, borderRadius: 16, borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1 },
  label: { color: '#6b7280', fontSize: 10, marginBottom: 4, letterSpacing: 1 },
  value: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  unit: { color: '#6b7280', fontSize: 12, marginTop: 8 },

  chatContainer: { padding: 20, paddingBottom: 100 },
  msg: { padding: 16, borderRadius: 20, marginBottom: 12, maxWidth: '85%' },
  user: { backgroundColor: '#2563eb', alignSelf: 'flex-end', borderTopRightRadius: 4 },
  ai: { backgroundColor: 'rgba(255,255,255,0.1)', alignSelf: 'flex-start', borderTopLeftRadius: 4 },
  msgText: { color: '#e5e7eb', fontSize: 15 },
  inputBox: { padding: 20, flexDirection: 'row', gap: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  input: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', color: 'white', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16 },
  sendBtn: { backgroundColor: '#2563eb', width: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }
});

export default registerRootComponent(App);