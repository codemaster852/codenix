import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Play, Pause, RotateCcw, CheckCircle, Plus, Trash2, 
  Music, MessageSquare, List, Brain, Volume2, 
  Settings, Moon, Sun, Send, Cpu, X,
  Coffee, CloudRain, Wind, Zap
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  signInWithCustomToken
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  onSnapshot,
  serverTimestamp,
  orderBy 
} from 'firebase/firestore';

// --- Firebase Configuration ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// --- Web Audio API Context (Singleton) ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// --- Components ---

// 1. Noise Generator Component (The "Sound" Engine)
const NoiseGenerator = ({ type, icon: Icon, label, isActive, volume, onToggle, onVolumeChange }) => {
  const oscillatorRef = useRef(null);
  const gainNodeRef = useRef(null);
  const whiteNoiseNodeRef = useRef(null);

  useEffect(() => {
    if (isActive) {
      startSound();
    } else {
      stopSound();
    }
    return () => stopSound();
  }, [isActive]);

  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = volume;
    }
  }, [volume]);

  const startSound = () => {
    stopSound(); // Ensure clean slate
    gainNodeRef.current = audioCtx.createGain();
    gainNodeRef.current.gain.value = volume;
    gainNodeRef.current.connect(audioCtx.destination);

    if (type === 'binaural') {
      // 40Hz Gamma waves for focus
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      osc1.frequency.value = 400; // Carrier
      osc2.frequency.value = 440; // 40Hz difference
      
      // Pan them left and right for true binaural effect
      const merger = audioCtx.createChannelMerger(2);
      const leftPan = audioCtx.createStereoPanner();
      const rightPan = audioCtx.createStereoPanner();
      leftPan.pan.value = -1;
      rightPan.pan.value = 1;

      osc1.connect(leftPan).connect(merger, 0, 0);
      osc2.connect(rightPan).connect(merger, 0, 1);
      
      merger.connect(gainNodeRef.current);
      
      osc1.start();
      osc2.start();
      oscillatorRef.current = { stop: () => { osc1.stop(); osc2.stop(); } };
    } else {
      // Noise generation
      const bufferSize = 2 * audioCtx.sampleRate;
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const output = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        if (type === 'white') {
          output[i] = white;
        } else if (type === 'pink') {
          output[i] = (lastOut + (0.02 * white)) / 1.02;
          lastOut = output[i];
          output[i] *= 3.5; 
        } else if (type === 'brown') {
           output[i] = (lastOut + (0.02 * white)) / 1.02;
           lastOut = output[i];
           output[i] *= 3.5; 
        }
      }
      // Simple fallback for brown/pink approx if complex algo fails, but standard buffer noise is okay
      // For this demo, we'll use simple white noise filtered for simplicity
      
      const noise = audioCtx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      
      // Filter for "color"
      const filter = audioCtx.createBiquadFilter();
      if (type === 'white') {
        filter.type = 'lowpass';
        filter.frequency.value = 20000;
      } else if (type === 'rain') {
        // Pink-ish
        filter.type = 'lowpass';
        filter.frequency.value = 800;
      } else if (type === 'brown') {
        filter.type = 'lowpass';
        filter.frequency.value = 200;
      }

      noise.connect(filter).connect(gainNodeRef.current);
      noise.start();
      whiteNoiseNodeRef.current = noise;
    }
  };

  let lastOut = 0;

  const stopSound = () => {
    if (oscillatorRef.current) {
      try { oscillatorRef.current.stop(); } catch(e){}
      oscillatorRef.current = null;
    }
    if (whiteNoiseNodeRef.current) {
      try { whiteNoiseNodeRef.current.stop(); } catch(e){}
      whiteNoiseNodeRef.current = null;
    }
  };

  return (
    <div className={`p-4 rounded-xl border transition-all duration-300 ${isActive ? 'bg-indigo-600 border-indigo-500 shadow-lg shadow-indigo-500/20' : 'bg-slate-800 border-slate-700 hover:border-slate-600'}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isActive ? 'bg-indigo-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
            <Icon size={20} />
          </div>
          <span className={`font-medium ${isActive ? 'text-white' : 'text-slate-300'}`}>{label}</span>
        </div>
        <button 
          onClick={onToggle}
          className={`w-10 h-6 rounded-full relative transition-colors ${isActive ? 'bg-emerald-400' : 'bg-slate-600'}`}
        >
          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-200 ${isActive ? 'left-5' : 'left-1'}`} />
        </button>
      </div>
      
      <div className={`transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
        <input 
          type="range" 
          min="0" 
          max="1" 
          step="0.01" 
          value={volume}
          onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
          className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-indigo-400"
        />
      </div>
    </div>
  );
};

// 2. AI Chat Component
const AiAssistant = ({ apiKey }) => {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "Hi! I'm Nix, your study companion. Need help organizing your schedule or explaining a topic?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMsg = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // Simulate "Long Cat API" wrapper using Gemini
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: input }] }],
            systemInstruction: { parts: [{ text: "You are Nix, a helpful, encouraging study assistant on the website StudyNix. Keep answers concise, structured, and perfect for students. Use markdown for bolding key terms." }] }
          })
        }
      );

      const data = await response.json();
      const botText = data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm having trouble connecting to the knowledge base right now.";
      
      setMessages(prev => [...prev, { role: 'assistant', text: botText }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', text: "Network error. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[500px] bg-slate-800 rounded-xl overflow-hidden border border-slate-700 shadow-xl">
      <div className="p-4 bg-slate-900 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="text-indigo-400" size={20} />
          <span className="font-bold text-slate-100">Nix AI</span>
        </div>
        <div className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded">Long Cat v1.0</div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl p-3 text-sm leading-relaxed ${
              m.role === 'user' 
                ? 'bg-indigo-600 text-white rounded-br-none' 
                : 'bg-slate-700 text-slate-200 rounded-bl-none border border-slate-600'
            }`}>
              <div dangerouslySetInnerHTML={{ __html: m.text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br/>') }} />
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-700 rounded-2xl p-3 rounded-bl-none flex gap-2 items-center">
              <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-slate-900 border-t border-slate-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask for study tips..."
            className="flex-1 bg-slate-800 border border-slate-700 text-slate-200 rounded-xl px-4 py-2 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder-slate-500"
          />
          <button 
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

// 3. Task List Component
const TaskManager = ({ user }) => {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!user) return;
    
    // Simple query, sorting in memory to comply with strict Firestore rules
    const q = query(
      collection(db, 'artifacts', appId, 'users', user.uid, 'tasks')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedTasks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Sort in memory (Rule 2: No complex queries)
      loadedTasks.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setTasks(loadedTasks);
    }, (error) => {
      console.error("Firestore error:", error);
    });

    return () => unsubscribe();
  }, [user]);

  const addTask = async (e) => {
    e.preventDefault();
    if (!newTask.trim() || !user) return;

    try {
      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'tasks'), {
        text: newTask,
        completed: false,
        createdAt: serverTimestamp()
      });
      setNewTask('');
    } catch (err) {
      console.error("Add task error", err);
    }
  };

  const toggleTask = async (task) => {
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'tasks', task.id), {
        completed: !task.completed
      });
    } catch (err) { console.error(err); }
  };

  const deleteTask = async (id) => {
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'tasks', id));
    } catch (err) { console.error(err); }
  };

  const filteredTasks = tasks.filter(t => {
    if (filter === 'active') return !t.completed;
    if (filter === 'completed') return t.completed;
    return true;
  });

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-sm h-full flex flex-col">
      <div className="p-4 border-b border-slate-700 flex justify-between items-center">
        <h2 className="font-bold text-slate-200 flex items-center gap-2">
          <List size={20} className="text-indigo-400" /> Tasks
        </h2>
        <div className="flex bg-slate-900 rounded-lg p-1 text-xs font-medium">
          {['all', 'active', 'completed'].map(f => (
            <button 
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-md capitalize transition-colors ${filter === f ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 flex-1 overflow-y-auto space-y-2">
        {filteredTasks.length === 0 ? (
          <div className="text-center text-slate-500 mt-10">
            <p>No tasks found.</p>
            <p className="text-xs mt-1">Add one to get started!</p>
          </div>
        ) : (
          filteredTasks.map(task => (
            <div 
              key={task.id} 
              className={`group flex items-center gap-3 p-3 rounded-lg border transition-all ${
                task.completed 
                  ? 'bg-slate-900/50 border-slate-800 opacity-60' 
                  : 'bg-slate-700 border-slate-600 hover:border-indigo-500/50'
              }`}
            >
              <button 
                onClick={() => toggleTask(task)}
                className={`flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                  task.completed 
                    ? 'bg-indigo-600 border-indigo-600 text-white' 
                    : 'border-slate-500 hover:border-indigo-400'
                }`}
              >
                {task.completed && <CheckCircle size={14} />}
              </button>
              <span className={`flex-1 text-sm ${task.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                {task.text}
              </span>
              <button 
                onClick={() => deleteTask(task.id)}
                className="opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-300 transition-opacity p-1"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}
      </div>

      <form onSubmit={addTask} className="p-4 border-t border-slate-700">
        <div className="relative">
          <input
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            placeholder="Add a new task..."
            className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg pl-4 pr-10 py-2.5 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder-slate-500"
          />
          <button 
            type="submit"
            className="absolute right-2 top-2 p-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-500 transition-colors"
          >
            <Plus size={16} />
          </button>
        </div>
      </form>
    </div>
  );
};

// 4. Timer Component
const Timer = () => {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState('pomodoro'); // pomodoro, short, long
  const intervalRef = useRef(null);

  const modes = {
    pomodoro: { label: 'Focus', min: 25, color: 'text-indigo-400', ring: 'stroke-indigo-500' },
    short: { label: 'Short Break', min: 5, color: 'text-emerald-400', ring: 'stroke-emerald-500' },
    long: { label: 'Long Break', min: 15, color: 'text-cyan-400', ring: 'stroke-cyan-500' }
  };

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            setIsRunning(false);
            new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg').play().catch(()=>{});
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning]);

  const switchMode = (m) => {
    setMode(m);
    setTimeLeft(modes[m].min * 60);
    setIsRunning(false);
  };

  const toggleTimer = () => setIsRunning(!isRunning);
  
  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(modes[mode].min * 60);
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progress = ((modes[mode].min * 60 - timeLeft) / (modes[mode].min * 60)) * 100;
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-slate-800 rounded-xl border border-slate-700 shadow-sm relative overflow-hidden">
      {/* Background decoration */}
      <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-${modes[mode].color.split('-')[1]}-500 to-transparent opacity-50`} />

      <div className="flex gap-2 mb-8 bg-slate-900/50 p-1.5 rounded-xl">
        {Object.keys(modes).map(m => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              mode === m 
                ? 'bg-slate-700 text-white shadow-sm' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            {modes[m].label}
          </button>
        ))}
      </div>

      <div className="relative mb-8">
        {/* SVG Ring */}
        <svg width="280" height="280" className="transform -rotate-90">
          <circle
            cx="140" cy="140" r={radius}
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            className="text-slate-900"
          />
          <circle
            cx="140" cy="140" r={radius}
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className={`transition-all duration-1000 ${modes[mode].ring}`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className={`text-6xl font-mono font-bold tracking-tighter ${modes[mode].color}`}>
            {formatTime(timeLeft)}
          </div>
          <p className="text-slate-500 text-sm mt-2 font-medium tracking-wide uppercase">
            {isRunning ? 'Running' : 'Paused'}
          </p>
        </div>
      </div>

      <div className="flex gap-4">
        <button 
          onClick={toggleTimer}
          className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform hover:scale-105 active:scale-95 ${
            isRunning ? 'bg-amber-500 hover:bg-amber-600' : 'bg-indigo-600 hover:bg-indigo-700'
          }`}
        >
          {isRunning ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
        </button>
        <button 
          onClick={resetTimer}
          className="w-16 h-16 rounded-2xl bg-slate-700 hover:bg-slate-600 text-slate-300 flex items-center justify-center transition-colors hover:text-white"
        >
          <RotateCcw size={24} />
        </button>
      </div>
    </div>
  );
};

// Main App Component
export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sounds, setSounds] = useState({
    white: { active: false, vol: 0.1 },
    rain: { active: false, vol: 0.2 },
    brown: { active: false, vol: 0.3 },
    binaural: { active: false, vol: 0.1 }
  });

  // Auth Init
  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  const toggleSound = (key) => {
    setSounds(prev => ({
      ...prev,
      [key]: { ...prev[key], active: !prev[key].active }
    }));
  };

  const changeVolume = (key, val) => {
    setSounds(prev => ({
      ...prev,
      [key]: { ...prev[key], vol: val }
    }));
  };

  // Gemini API Key (Using empty string as per environment spec)
  const apiKey = ""; 

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30">
      
      {/* Navigation Bar */}
      <nav className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600 p-2 rounded-lg">
                <Cpu size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">
                  StudyNix
                </h1>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Workspace</p>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-1 bg-slate-900/50 p-1 rounded-lg border border-slate-800">
              <button 
                onClick={() => setActiveTab('dashboard')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  activeTab === 'dashboard' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Dashboard
              </button>
              <button 
                onClick={() => setActiveTab('ai')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  activeTab === 'ai' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Ask Nix
              </button>
            </div>

            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
               <span className="text-xs font-bold text-indigo-400">{user ? 'US' : '..'}</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Mobile Tab Switcher */}
        <div className="md:hidden mb-6 flex bg-slate-900 rounded-lg p-1">
           <button 
              onClick={() => setActiveTab('dashboard')}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'dashboard' ? 'bg-indigo-600 text-white' : 'text-slate-400'
              }`}
            >
              Dashboard
            </button>
            <button 
              onClick={() => setActiveTab('ai')}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'ai' ? 'bg-indigo-600 text-white' : 'text-slate-400'
              }`}
            >
              Ask AI
            </button>
        </div>

        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Col: Timer & Sounds */}
            <div className="lg:col-span-7 space-y-6">
              <Timer />
              
              <div className="bg-slate-900/50 rounded-xl p-6 border border-slate-800">
                <div className="flex items-center gap-2 mb-4">
                  <Volume2 className="text-indigo-400" size={20} />
                  <h3 className="font-bold text-slate-200">Audio Sanctuary</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <NoiseGenerator 
                    type="rain" icon={CloudRain} label="Rainy Mood" 
                    isActive={sounds.rain.active} volume={sounds.rain.vol}
                    onToggle={() => toggleSound('rain')} onVolumeChange={(v) => changeVolume('rain', v)}
                  />
                   <NoiseGenerator 
                    type="binaural" icon={Zap} label="Deep Focus (40Hz)" 
                    isActive={sounds.binaural.active} volume={sounds.binaural.vol}
                    onToggle={() => toggleSound('binaural')} onVolumeChange={(v) => changeVolume('binaural', v)}
                  />
                  <NoiseGenerator 
                    type="white" icon={Wind} label="White Noise" 
                    isActive={sounds.white.active} volume={sounds.white.vol}
                    onToggle={() => toggleSound('white')} onVolumeChange={(v) => changeVolume('white', v)}
                  />
                  <NoiseGenerator 
                    type="brown" icon={Coffee} label="Coffee Shop" 
                    isActive={sounds.brown.active} volume={sounds.brown.vol}
                    onToggle={() => toggleSound('brown')} onVolumeChange={(v) => changeVolume('brown', v)}
                  />
                </div>
              </div>
            </div>

            {/* Right Col: Tasks */}
            <div className="lg:col-span-5 h-[600px] lg:h-auto">
              <TaskManager user={user} />
            </div>

          </div>
        )}

        {activeTab === 'ai' && (
          <div className="max-w-3xl mx-auto">
             <AiAssistant apiKey={apiKey} />
             <div className="mt-4 text-center text-xs text-slate-500">
               Powered by Gemini • Configured for Student Assistance
             </div>
          </div>
        )}

      </main>
    </div>
  );
}
