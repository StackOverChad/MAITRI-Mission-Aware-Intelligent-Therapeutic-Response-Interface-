"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Heart, Brain, Send, Radio, Volume2, TrendingUp, AlertTriangle, Mic, Play, Activity } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, YAxis, XAxis, Tooltip, CartesianGrid } from 'recharts';

const API_URL = "http://127.0.0.1:8000";

interface Message {
  role: 'user' | 'ai';
  text: string;
}

interface Forecast {
  predicted_hr: number;
  slope: number;
  status: string;
}

interface Intervention {
  type: string;
  payload: string;
  title: string;
  desc: string;
}

export default function MaitriDashboard() {
  // Add CSS animations
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      @keyframes scan {
        from { transform: translateY(-100%); }
        to { transform: translateY(100%); }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: "Systems Online. Please initialize audio subsystem." }
  ]);
  const [input, setInput] = useState("");
  const [heartRate, setHeartRate] = useState(0);
  const [emotion, setEmotion] = useState("Scanning...");
  const [hrHistory, setHrHistory] = useState<{time: string, val: number}[]>([]);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  
  // FIXED: Using Hex Code for reliable background switching
  const [bgColor, setBgColor] = useState("#000000"); 
  
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const enableAudio = () => {
    if (!audioEnabled) {
      audioRef.current = new Audio("/rain.mp3");
      audioRef.current.loop = true;
      audioRef.current.volume = 0.6;
      audioRef.current.play().then(() => {
        audioRef.current?.pause();
        setAudioEnabled(true);
        setMessages(prev => [...prev, { role: 'ai', text: "Audio Subsystem Initialized. Monitoring active." }]);
      }).catch(e => console.error("Audio init failed", e));
    }
  };

  // 1. POLL BACKEND
  useEffect(() => {
    const interval = setInterval(() => {
      fetch(`${API_URL}/health`)
        .then(res => res.json())
        .then(data => {
          setIsConnected(true);
          const newHR = Math.round(data.current_hr || 0);
          setHeartRate(newHR);
          setEmotion(data.current_emotion || "Neutral");
          
          if (data.forecast) setForecast(data.forecast);

          const now = new Date();
          const timeStr = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;
          if (newHR > 40) {
            setHrHistory(prev => {
              const newData = [...prev, { time: timeStr, val: newHR }];
              if (newData.length > 30) newData.shift();
              return newData;
            });
          }
        })
        .catch(() => setIsConnected(false));
    }, 1000); 
    
    // Intervention Check Loop
    const analyzeInterval = setInterval(() => {
        fetch(`${API_URL}/api/analyze`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hr: 0, hrv: 0, face: "Normal", timestamp: 0 }) 
        })
        .then(res => res.json())
        .then(data => handleInterventions(data.interventions))
        .catch(e => console.log(e));
    }, 2000);

    return () => { clearInterval(interval); clearInterval(analyzeInterval); };
  }, [audioEnabled]);

  const handleInterventions = (actions: Intervention[]) => {
    setInterventions(actions);
    
    // 1. Audio Logic
    if (audioEnabled && audioRef.current) {
        const audioAction = actions.find(a => a.type === 'AUDIO');
        if (audioAction) {
          if (audioRef.current.paused) audioRef.current.play().catch(console.error);
        } else {
          if (!audioRef.current.paused) audioRef.current.pause();
        }
    }

    // 2. Lighting Logic (FIXED: Using Hex Codes)
    const lightAction = actions.find(a => a.type === 'LIGHTING');
    if (lightAction) {
        if (lightAction.payload === 'amber') {
            // Warm Amber/Brown Hex Code (Equivalent to amber-950)
            setBgColor("#451a03"); 
        }
    } else {
        // Standard Space Black
        setBgColor("#000000"); 
    }
  };

  // VOICE FUNCTIONS
  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      utterance.voice = voices.find(v => v.name.includes('Zira') || v.name.includes('Female')) || voices[0];
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      const audioChunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append("file", audioBlob, "recording.webm");
        try {
          const res = await fetch(`${API_URL}/api/transcribe`, { method: "POST", body: formData });
          const data = await res.json();
          if (data.text) { setInput(data.text); sendMessage(data.text); }
        } catch (e) { console.error(e); }
      };
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) { console.error(err); }
  };

  const stopRecording = () => { mediaRecorderRef.current?.stop(); setIsRecording(false); };

  const sendMessage = async (textOverride?: string) => {
    const msgToSend = textOverride || input;
    if (!msgToSend.trim()) return;
    setMessages(prev => [...prev, { role: 'user', text: msgToSend }]);
    setInput("");
    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msgToSend, telemetry: { hr: heartRate } })
      });
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let aiText = "";
      setMessages(prev => [...prev, { role: 'ai', text: "" }]);
      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;
        aiText += decoder.decode(value);
        setMessages(prev => {
          const newArr = [...prev];
          newArr[newArr.length - 1].text = aiText;
          return newArr;
        });
      }
      speak(aiText);
    } catch (e) { setMessages(prev => [...prev, { role: 'ai', text: "⚠️ Comms Offline" }]); }
  };

  return (
    // FIXED: Using inline style for guaranteed color change
    <div 
      className="min-h-screen text-white font-sans p-6 overflow-hidden flex flex-col transition-colors duration-1000 ease-in-out"
      style={{ backgroundColor: bgColor }}
    >
      
      {/* AUDIO UNLOCK OVERLAY */}
      {!audioEnabled && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center backdrop-blur-md">
          <button onClick={enableAudio} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl font-bold text-xl flex items-center gap-3 shadow-2xl shadow-blue-500/50">
            <Play fill="white" /> INITIALIZE SYSTEMS
          </button>
        </div>
      )}

      {/* HEADER */}
      <header className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Brain className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-xl tracking-widest">MAITRI <span className="text-blue-500">CORE</span></h1>
            <p className="text-xs text-white/50 font-mono">BHARATIYA ANTARIKSH STATION</p>
          </div>
        </div>
        <div className="flex gap-4 text-xs font-mono text-white/50">
          <div className="flex items-center gap-2">
            {!audioRef.current?.paused && <div className="flex items-center text-blue-400 gap-1 animate-pulse"><Volume2 size={14}/> AUDIO ACTIVE</div>}
            <Radio size={14} className={isConnected ? "text-green-500" : "text-red-500"} />
            {isConnected ? "ONLINE" : "OFFLINE"}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 h-[calc(100vh-140px)]">
        
        {/* LEFT PANEL - REDESIGNED */}
        <div className="lg:col-span-4 flex flex-col gap-4 h-full overflow-y-auto">
          
          {/* PREMIUM VITALS HUB - COMPLETELY REDESIGNED */}
          <div className="relative rounded-3xl overflow-hidden shrink-0 backdrop-blur-2xl border border-white/10 shadow-2xl" style={{
            background: 'linear-gradient(135deg, rgba(15,23,42,0.8) 0%, rgba(30,27,75,0.6) 25%, rgba(20,33,61,0.7) 50%, rgba(25,25,50,0.8) 100%)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)'
          }}>
            {/* Animated gradient overlay */}
            <div className="absolute inset-0 opacity-30" style={{
              background: 'radial-gradient(circle at 20% 50%, rgba(59,130,246,0.2) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(139,92,246,0.2) 0%, transparent 50%)',
              animation: 'pulse 4s ease-in-out infinite'
            }} />

            <div className="relative z-10 p-8">
              {/* Video Feed - Hexagonal with glow */}
              <div className="mb-8 flex justify-center">
                <div className="relative">
                  {/* Outer glow rings */}
                  <div className="absolute inset-0 rounded-full" style={{
                    width: '240px',
                    height: '240px',
                    background: 'radial-gradient(circle, rgba(59,130,246,0.3) 0%, transparent 70%)',
                    filter: 'blur(20px)',
                    left: '-20px',
                    top: '-20px'
                  }} />
                  
                  {/* Main circular frame */}
                  <div className="relative w-48 h-48 rounded-full overflow-hidden border-4 border-blue-400/60 shadow-[0_0_40px_rgba(59,130,246,0.5),inset_0_0_20px_rgba(59,130,246,0.2)]">
                    <img src={`${API_URL}/video_feed`} className="w-full h-full object-cover" />
                    {/* Animated scan lines */}
                    <div className="absolute inset-0 opacity-20" style={{
                      backgroundImage: 'repeating-linear-gradient(0deg, rgba(59,130,246,0.5) 0px, rgba(59,130,246,0.5) 2px, transparent 2px, transparent 4px)',
                      animation: 'scan 3s linear infinite'
                    }} />
                  </div>

                  {/* Rotating border ring */}
                  <div className="absolute inset-0 rounded-full border-2 border-transparent" style={{
                    borderTopColor: 'rgba(139,92,246,0.6)',
                    borderRightColor: 'rgba(59,130,246,0.3)',
                    animation: 'spin 6s linear infinite',
                    width: '200px',
                    height: '200px',
                    left: '-8px',
                    top: '-8px'
                  }} />
                </div>
              </div>

              {/* Vitals Grid - 2x2 with premium styling */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {/* Heart Rate */}
                <div className="group relative overflow-hidden rounded-2xl p-5 transition-all duration-300 cursor-pointer" style={{
                  background: 'linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(220,38,38,0.1) 100%)',
                  border: '1.5px solid rgba(239,68,68,0.4)',
                  boxShadow: '0 4px 15px rgba(239,68,68,0.1)'
                }} onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(239,68,68,0.3)';
                  e.currentTarget.style.borderColor = 'rgba(239,68,68,0.7)';
                }} onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(239,68,68,0.1)';
                  e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)';
                }}>
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{
                    background: 'radial-gradient(circle at 50% 0%, rgba(239,68,68,0.2) 0%, transparent 70%)'
                  }} />
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                      <span className="text-xs font-mono text-red-300/90 tracking-widest">PULSE</span>
                    </div>
                    <div className="text-4xl font-black text-red-300 tracking-tight">{heartRate > 0 ? heartRate : "--"}</div>
                    <div className="text-xs text-red-300/60 font-mono mt-1">BPM</div>
                  </div>
                </div>

                {/* Emotion */}
                <div className="group relative overflow-hidden rounded-2xl p-5 transition-all duration-300 cursor-pointer" style={{
                  background: 'linear-gradient(135deg, rgba(59,130,246,0.15) 0%, rgba(37,99,235,0.1) 100%)',
                  border: '1.5px solid rgba(59,130,246,0.4)',
                  boxShadow: '0 4px 15px rgba(59,130,246,0.1)'
                }} onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(59,130,246,0.3)';
                  e.currentTarget.style.borderColor = 'rgba(59,130,246,0.7)';
                }} onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(59,130,246,0.1)';
                  e.currentTarget.style.borderColor = 'rgba(59,130,246,0.4)';
                }}>
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{
                    background: 'radial-gradient(circle at 50% 0%, rgba(59,130,246,0.2) 0%, transparent 70%)'
                  }} />
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-pulse" />
                      <span className="text-xs font-mono text-blue-300/90 tracking-widest">STATE</span>
                    </div>
                    <div className="text-3xl font-black text-blue-300 capitalize tracking-tight">{emotion}</div>
                    <div className="text-xs text-blue-300/60 font-mono mt-1">AFFECT</div>
                  </div>
                </div>

                {/* Forecast - spans 2 columns if present */}
                {forecast && (
                  <div className="col-span-2 group relative overflow-hidden rounded-2xl p-5 transition-all duration-300" style={{
                    background: forecast.status === 'RISING' 
                      ? 'linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(249,115,22,0.1) 100%)'
                      : 'linear-gradient(135deg, rgba(34,197,94,0.15) 0%, rgba(16,185,129,0.1) 100%)',
                    border: forecast.status === 'RISING'
                      ? '1.5px solid rgba(239,68,68,0.4)'
                      : '1.5px solid rgba(34,197,94,0.4)',
                    boxShadow: forecast.status === 'RISING'
                      ? '0 4px 15px rgba(239,68,68,0.1)'
                      : '0 4px 15px rgba(34,197,94,0.1)'
                  }} onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = forecast.status === 'RISING'
                      ? '0 8px 25px rgba(239,68,68,0.3)'
                      : '0 8px 25px rgba(34,197,94,0.3)';
                    e.currentTarget.style.borderColor = forecast.status === 'RISING'
                      ? 'rgba(239,68,68,0.7)'
                      : 'rgba(34,197,94,0.7)';
                  }} onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = forecast.status === 'RISING'
                      ? '0 4px 15px rgba(239,68,68,0.1)'
                      : '0 4px 15px rgba(34,197,94,0.1)';
                    e.currentTarget.style.borderColor = forecast.status === 'RISING'
                      ? 'rgba(239,68,68,0.4)'
                      : 'rgba(34,197,94,0.4)';
                  }}>
                    <div className="relative z-10 flex justify-between items-center">
                      <div>
                        <div className="text-xs font-mono text-white/60 tracking-widest mb-2">10-MIN FORECAST</div>
                        <div className="text-3xl font-black text-white tracking-tight">
                          {forecast.predicted_hr > 220 ? "> 220" : forecast.predicted_hr}
                          <span className="text-lg text-white/50 ml-2">BPM</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-3">
                        <div className="text-5xl">
                          {forecast.status === 'RISING' ? (
                            <TrendingUp size={32} className="text-red-400 animate-bounce" />
                          ) : (
                            <Activity size={32} className="text-green-400" />
                          )}
                        </div>
                        <span className={`text-xs font-black px-4 py-2 rounded-full tracking-widest ${
                          forecast.status === 'RISING' 
                            ? 'bg-red-500/40 text-red-200' 
                            : 'bg-green-500/40 text-green-200'
                        }`}>
                          {forecast.status}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ACTIVE INTERVENTIONS - PREMIUM REDESIGNED */}
          {interventions.length > 0 && (
            <div className="relative rounded-2xl overflow-hidden shrink-0 backdrop-blur-xl border border-white/10 shadow-lg" style={{
              background: 'linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(139,92,246,0.08) 100%)',
              boxShadow: '0 8px 32px rgba(59,130,246,0.15), inset 0 1px 0 rgba(255,255,255,0.05)'
            }}>
              {/* Animated background glow */}
              <div className="absolute inset-0 opacity-20" style={{
                background: 'radial-gradient(circle at 50% 0%, rgba(59,130,246,0.3) 0%, transparent 70%)',
                animation: 'pulse 3s ease-in-out infinite'
              }} />
              
              <div className="relative z-10 p-6">
                <h3 className="text-blue-200 text-sm font-black font-mono mb-4 flex items-center gap-3 tracking-widest">
                  <div className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-pulse" />
                  ACTIVE PROTOCOLS
                </h3>
                <div className="space-y-3">
                  {interventions.map((int, idx) => (
                    <div key={idx} className="group relative overflow-hidden rounded-xl p-4 transition-all duration-300 cursor-pointer" style={{
                      background: 'linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(37,99,235,0.05) 100%)',
                      border: '1px solid rgba(59,130,246,0.3)',
                      boxShadow: '0 4px 12px rgba(59,130,246,0.05)'
                    }} onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = '0 8px 20px rgba(59,130,246,0.2)';
                      e.currentTarget.style.borderColor = 'rgba(59,130,246,0.6)';
                    }} onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(59,130,246,0.05)';
                      e.currentTarget.style.borderColor = 'rgba(59,130,246,0.3)';
                    }}>
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{
                        background: 'radial-gradient(circle at 50% 0%, rgba(59,130,246,0.15) 0%, transparent 70%)'
                      }} />
                      <div className="relative z-10">
                        <div className="text-sm font-black text-blue-200 tracking-wide">{int.title}</div>
                        <div className="text-xs text-blue-300/70 mt-2 leading-relaxed">{int.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* BIOMETRIC GRAPH - PREMIUM REDESIGNED */}
          <div className="relative rounded-2xl overflow-hidden flex flex-col min-h-[300px] backdrop-blur-xl border border-white/10 shadow-lg" style={{
            background: 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(20,184,166,0.06) 100%)',
            boxShadow: '0 8px 32px rgba(16,185,129,0.1), inset 0 1px 0 rgba(255,255,255,0.05)'
          }}>
            {/* Animated background glow */}
            <div className="absolute inset-0 opacity-20" style={{
              background: 'radial-gradient(circle at 50% 100%, rgba(16,185,129,0.3) 0%, transparent 70%)',
              animation: 'pulse 4s ease-in-out infinite'
            }} />

            <div className="relative z-10 p-6 pb-4">
              <h3 className="text-sm text-emerald-300/90 font-black font-mono flex items-center gap-3 tracking-widest">
                <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse" />
                BIOMETRIC TIMELINE
              </h3>
            </div>

            <div className="flex-1 w-full relative z-10 px-6 pb-6">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={hrHistory}>
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke="rgba(16,185,129,0.15)" 
                    vertical={false}
                    style={{ opacity: 0.6 }}
                  />
                  <XAxis dataKey="time" hide />
                  <YAxis 
                    domain={[40, 140]} 
                    stroke="rgba(16,185,129,0.25)" 
                    fontSize={10} 
                    width={30}
                    style={{ opacity: 0.7 }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(0,0,0,0.9)', 
                      borderColor: 'rgba(16,185,129,0.6)',
                      borderRadius: '12px',
                      boxShadow: '0 8px 16px rgba(16,185,129,0.2)'
                    }} 
                    itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                    labelStyle={{ color: '#10b981', fontWeight: 'bold' }}
                    cursor={{ stroke: 'rgba(16,185,129,0.3)', strokeWidth: 2 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="val" 
                    stroke="#10b981" 
                    strokeWidth={3.5} 
                    dot={false} 
                    isAnimationActive={false}
                    filter="drop-shadow(0 0 12px rgba(16,185,129,0.8))"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL (CHAT) */}
        <div className="lg:col-span-8 flex flex-col bg-black/30 border border-white/10 rounded-2xl backdrop-blur-sm h-full overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl p-4 ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-gray-800 text-gray-200 rounded-tl-none'}`}>
                  <p className="text-sm leading-relaxed">{msg.text}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="p-4 border-t border-white/10 bg-black/40 flex gap-3 shrink-0 items-center">
            <button 
              onMouseDown={startRecording} onMouseUp={stopRecording}
              className={`p-3 rounded-xl transition-all shadow-lg ${isRecording ? "bg-red-600 text-white scale-110" : "bg-gray-800 text-gray-400"}`}
            >
              <Mic size={20} />
            </button>
            <input 
              className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 text-white"
              placeholder="Speak..." value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            />
            <button onClick={() => sendMessage()} className="p-3 rounded-xl bg-blue-600 text-white"><Send size={20} /></button>
          </div>
        </div>

      </div>
    </div>
  );
}