import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  MessageCircle, 
  Book, 
  Heart, 
  Settings, 
  Mic, 
  MicOff, 
  Send, 
  Plus, 
  ChevronRight,
  AlertTriangle,
  Globe,
  Smile,
  Frown,
  Meh,
  Sun,
  Moon,
  Volume2,
  VolumeX,
  Users,
  Trash2,
  Phone,
  Mail,
  X,
  Bell,
  Clock,
  CheckCircle,
  Calendar,
  User,
  Camera,
  Upload,
  Play,
  Pause,
  RotateCcw,
  Wind,
  Zap,
  Leaf,
  TrendingUp,
  Activity,
  BarChart3
} from 'lucide-react';
import { getChatResponse, analyzeMood, generateSpeech, detectCrisisIntent } from './services/geminiService';
import { MoodLog, JournalEntry, ChatMessage, UserPreferences, SupportContact, Reminder, Session, UserProfile } from './types';

const MOODS = [
  { value: 1, icon: Frown, label: 'Struggling', color: 'text-red-500' },
  { value: 2, icon: Meh, label: 'Down', color: 'text-orange-500' },
  { value: 3, icon: Meh, label: 'Okay', color: 'text-yellow-500' },
  { value: 4, icon: Smile, label: 'Good', color: 'text-green-500' },
  { value: 5, icon: Sun, label: 'Great', color: 'text-blue-500' },
];

const Waveform = () => (
  <div className="flex items-center justify-center gap-1.5 h-10 px-4">
    {[...Array(6)].map((_, i) => (
      <motion.div
        key={i}
        className="w-1.5 bg-red-500 rounded-full"
        animate={{
          height: [10, 30, 10],
          opacity: [0.5, 1, 0.5]
        }}
        transition={{
          duration: 0.8,
          repeat: Infinity,
          delay: i * 0.12,
          ease: "easeInOut"
        }}
      />
    ))}
  </div>
);

const Login = ({ onLogin }: { onLogin: (user: UserProfile) => void }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = isRegistering ? '/api/auth/register' : '/api/auth/login';
    const body = isRegistering ? { email, password, name } : { email, password };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();

      if (res.ok) {
        if (isRegistering) {
          setIsRegistering(false);
          setError('Registration successful! Please login.');
        } else {
          onLogin(data.user);
        }
      } else {
        setError(data.error || 'Something went wrong');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-[40px] p-10 shadow-xl border border-brand-cream"
      >
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-brand-olive/10 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <Heart size={32} className="text-brand-olive" fill="currentColor" />
          </div>
          <h1 className="serif text-3xl text-brand-olive">Ex-Mind</h1>
          <p className="text-xs opacity-50 uppercase tracking-widest mt-2">
            {isRegistering ? 'Create your account' : 'Welcome back'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegistering && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 ml-1">Full Name</label>
              <input 
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-sm p-4 bg-brand-cream/30 border border-brand-cream rounded-2xl outline-none focus:ring-2 focus:ring-brand-olive/20"
                placeholder="John Doe"
                required
              />
            </div>
          )}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 ml-1">Email Address</label>
            <input 
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full text-sm p-4 bg-brand-cream/30 border border-brand-cream rounded-2xl outline-none focus:ring-2 focus:ring-brand-olive/20"
              placeholder="your@email.com"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 ml-1">Password</label>
            <input 
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full text-sm p-4 bg-brand-cream/30 border border-brand-cream rounded-2xl outline-none focus:ring-2 focus:ring-brand-olive/20"
              placeholder="••••••••"
              required
            />
          </div>

          {error && <p className="text-xs text-red-500 text-center">{error}</p>}

          <button 
            type="submit"
            disabled={loading}
            className="w-full p-4 bg-brand-olive text-white rounded-2xl font-bold uppercase tracking-widest text-xs shadow-lg shadow-brand-olive/20 hover:bg-brand-olive/90 transition-all disabled:opacity-50"
          >
            {loading ? 'Processing...' : (isRegistering ? 'Register' : 'Login')}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button 
            onClick={() => setIsRegistering(!isRegistering)}
            className="text-xs font-bold text-brand-olive uppercase tracking-widest hover:underline"
          >
            {isRegistering ? 'Already have an account? Login' : 'New here? Create account'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const MindfulnessExercise = ({ onClose, isTab = false }: { onClose: () => void, isTab?: boolean }) => {
  const [activeExercise, setActiveExercise] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [phase, setPhase] = useState<'Inhale' | 'Hold' | 'Exhale'>('Inhale');
  const [timer, setTimer] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const EXERCISES = [
    { 
      id: 1, 
      title: 'Box Breathing', 
      desc: 'Equalize your breath to calm the nervous system.', 
      icon: Wind, 
      color: 'bg-blue-500',
      type: 'visual',
      audio: 'https://cdn.pixabay.com/audio/2022/03/15/audio_783338758b.mp3'
    },
    { 
      id: 2, 
      title: 'Body Scan', 
      desc: 'Connect with physical sensations to ground yourself.', 
      icon: Zap, 
      color: 'bg-purple-500',
      type: 'audio',
      audio: 'https://cdn.pixabay.com/audio/2021/11/25/audio_91b32e02d9.mp3'
    },
    { 
      id: 3, 
      title: 'Morning Zen', 
      desc: 'Start your day with clarity and intention.', 
      icon: Sun, 
      color: 'bg-amber-500',
      type: 'audio',
      audio: 'https://cdn.pixabay.com/audio/2022/05/27/audio_1808f3030e.mp3'
    },
    { 
      id: 4, 
      title: 'Sleep Well', 
      desc: 'Gentle guidance to drift into peaceful sleep.', 
      icon: Moon, 
      color: 'bg-indigo-500',
      type: 'audio',
      audio: 'https://cdn.pixabay.com/audio/2022/03/10/audio_c8c8a73484.mp3'
    },
    { 
      id: 5, 
      title: 'Anxiety Relief', 
      desc: 'Quick practice to release tension and worry.', 
      icon: Heart, 
      color: 'bg-rose-500',
      type: 'audio',
      audio: 'https://cdn.pixabay.com/audio/2021/08/09/audio_884b9047ea.mp3'
    },
    { 
      id: 6, 
      title: 'Forest Ambient', 
      desc: 'Immerse yourself in nature sounds for deep focus.', 
      icon: Leaf, 
      color: 'bg-emerald-500',
      type: 'ambient',
      audio: 'https://cdn.pixabay.com/audio/2022/01/18/audio_d0c6ff1cbd.mp3'
    }
  ];

  useEffect(() => {
    let interval: any;
    if (isPlaying && activeExercise === 1) {
      interval = setInterval(() => {
        setTimer(t => {
          const next = t + 1;
          if (next <= 4) setPhase('Inhale');
          else if (next <= 8) setPhase('Hold');
          else if (next <= 12) setPhase('Exhale');
          else if (next <= 16) setPhase('Hold');
          else return 0;
          return next;
        });
      }, 1000);
    } else {
      setTimer(0);
      setPhase('Inhale');
    }
    return () => clearInterval(interval);
  }, [isPlaying, activeExercise]);

  const togglePlay = () => {
    if (!activeExercise) return;
    if (isPlaying) {
      audioRef.current?.pause();
    } else {
      audioRef.current?.play();
    }
    setIsPlaying(!isPlaying);
  };

  const selectExercise = (id: number) => {
    setActiveExercise(id);
    setIsPlaying(false);
    setTimer(0);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  const containerClasses = isTab 
    ? "w-full h-full flex flex-col items-center justify-center p-4"
    : "fixed inset-0 z-50 bg-brand-ink/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-white";

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={containerClasses}
    >
      {!isTab && (
        <button onClick={onClose} className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition-colors">
          <X size={24} />
        </button>
      )}

      {!activeExercise ? (
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h2 className={`serif text-3xl mb-2 ${isTab ? 'text-brand-olive' : 'text-white'}`}>Guided Meditations</h2>
            <p className={`text-sm opacity-60 ${isTab ? 'text-brand-ink' : 'text-white'}`}>Choose a practice to begin your journey to calm.</p>
          </div>
          
          <div className="grid grid-cols-1 gap-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
            {EXERCISES.map((ex) => (
              <button 
                key={ex.id}
                onClick={() => selectExercise(ex.id)}
                className={`w-full p-6 border rounded-3xl flex items-center gap-4 transition-all text-left group ${
                  isTab 
                    ? 'bg-white border-brand-cream hover:border-brand-olive/30 shadow-sm' 
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
              >
                <div className={`p-4 rounded-2xl ${ex.color} text-white shadow-lg group-hover:scale-110 transition-transform`}>
                  <ex.icon size={24} />
                </div>
                <div>
                  <h3 className={`font-medium text-lg ${isTab ? 'text-brand-ink' : 'text-white'}`}>{ex.title}</h3>
                  <p className={`text-xs opacity-50 ${isTab ? 'text-brand-ink' : 'text-white'}`}>{ex.desc}</p>
                </div>
                <ChevronRight size={20} className={`ml-auto opacity-20 ${isTab ? 'text-brand-ink' : 'text-white'}`} />
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="w-full max-w-md flex flex-col items-center gap-12">
          <div className="text-center">
            <button 
              onClick={() => setActiveExercise(null)}
              className={`text-[10px] uppercase tracking-widest opacity-40 hover:opacity-100 mb-2 flex items-center gap-1 mx-auto ${isTab ? 'text-brand-ink' : 'text-white'}`}
            >
              <RotateCcw size={10} /> Change Exercise
            </button>
            <h2 className={`serif text-3xl ${isTab ? 'text-brand-olive' : 'text-white'}`}>{EXERCISES.find(e => e.id === activeExercise)?.title}</h2>
          </div>

          <div className="relative w-64 h-64 flex items-center justify-center">
            {/* Visual Cues for Breathing */}
            {activeExercise === 1 && (
              <>
                <motion.div 
                  animate={{ 
                    scale: phase === 'Inhale' ? 1.5 : phase === 'Hold' && timer <= 8 ? 1.5 : 1,
                    opacity: isPlaying ? 0.3 : 0.1
                  }}
                  transition={{ duration: 4, ease: "easeInOut" }}
                  className="absolute inset-0 bg-blue-500 rounded-full blur-3xl"
                />
                <motion.div 
                  animate={{ 
                    scale: phase === 'Inhale' ? 1.5 : phase === 'Hold' && timer <= 8 ? 1.5 : 1,
                  }}
                  transition={{ duration: 4, ease: "easeInOut" }}
                  className={`w-32 h-32 border-4 rounded-full flex items-center justify-center relative z-10 ${isTab ? 'border-brand-olive/20' : 'border-white/20'}`}
                >
                  <span className={`text-sm font-bold uppercase tracking-widest ${isTab ? 'text-brand-olive' : 'text-white'}`}>
                    {isPlaying ? phase : 'Ready'}
                  </span>
                </motion.div>
              </>
            )}

            {/* Audio Visualizer for others */}
            {activeExercise !== 1 && (
              <div className="flex items-center gap-2">
                {[...Array(12)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ 
                      height: isPlaying ? [10, 40, 10] : 10,
                      opacity: isPlaying ? [0.3, 1, 0.3] : 0.3
                    }}
                    transition={{ 
                      duration: 0.8, 
                      repeat: Infinity, 
                      delay: i * 0.1,
                      ease: "easeInOut"
                    }}
                    className={`w-1.5 rounded-full ${isTab ? 'bg-brand-olive' : 'bg-white'}`}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col items-center gap-6 w-full">
            <div className="flex items-center gap-8">
              <button 
                onClick={() => {
                  setIsPlaying(false);
                  setTimer(0);
                  setPhase('Inhale');
                  if (audioRef.current) {
                    audioRef.current.pause();
                    audioRef.current.currentTime = 0;
                  }
                }}
                className={`p-4 rounded-full transition-all ${isTab ? 'bg-brand-cream text-brand-olive hover:bg-brand-olive/10' : 'bg-white/10 text-white hover:bg-white/20'}`}
                title="Reset Exercise"
              >
                <RotateCcw size={24} />
              </button>
              <button 
                onClick={togglePlay}
                className={`w-20 h-20 rounded-full flex items-center justify-center shadow-2xl hover:scale-105 transition-transform ${isTab ? 'bg-brand-olive text-white' : 'bg-white text-brand-ink'}`}
              >
                {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
              </button>
            </div>
            
            <p className={`text-xs opacity-40 text-center max-w-[200px] ${isTab ? 'text-brand-ink' : 'text-white'}`}>
              {isPlaying 
                ? "Find a comfortable position and follow the guidance." 
                : "Press play to begin your session."}
            </p>
          </div>

          <audio 
            ref={audioRef} 
            src={EXERCISES.find(e => e.id === activeExercise)?.audio} 
            loop 
            onEnded={() => setIsPlaying(false)}
          />
        </div>
      )}
    </motion.div>
  );
};

const Sessions = ({ sessions, onBook, onCancel }: { sessions: Session[], onBook: (e: React.FormEvent<HTMLFormElement>) => void, onCancel: (id: number) => void }) => {
  return (
    <div className="flex flex-col gap-8">
      <div className="bg-white rounded-[40px] p-8 shadow-sm border border-brand-cream">
        <h2 className="serif text-2xl text-brand-olive mb-6">Book a Session</h2>
        <form onSubmit={onBook} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 ml-1">Session Type</label>
            <select 
              name="type"
              className="w-full text-sm p-4 bg-brand-cream/30 border border-brand-cream rounded-2xl outline-none focus:ring-2 focus:ring-brand-olive/20"
              required
            >
              <option value="chat">Chat Session</option>
              <option value="voice">Voice Call</option>
              <option value="video">Video Session</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 ml-1">Date & Time</label>
            <input 
              type="datetime-local"
              name="scheduled_at"
              className="w-full text-sm p-4 bg-brand-cream/30 border border-brand-cream rounded-2xl outline-none focus:ring-2 focus:ring-brand-olive/20"
              required
            />
          </div>
          <div className="md:col-span-2 space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 ml-1">Notes (Optional)</label>
            <textarea 
              name="notes"
              className="w-full text-sm p-4 bg-brand-cream/30 border border-brand-cream rounded-2xl outline-none focus:ring-2 focus:ring-brand-olive/20 min-h-[100px]"
              placeholder="Anything you'd like to discuss?"
            />
          </div>
          <button 
            type="submit"
            className="md:col-span-2 p-4 bg-brand-olive text-white rounded-2xl font-bold uppercase tracking-widest text-xs shadow-lg shadow-brand-olive/20 hover:bg-brand-olive/90 transition-all"
          >
            Book Session
          </button>
        </form>
      </div>

      <div className="bg-white rounded-[40px] p-8 shadow-sm border border-brand-cream">
        <h2 className="serif text-2xl text-brand-olive mb-6">Upcoming Sessions</h2>
        <div className="space-y-4">
          {sessions.length === 0 ? (
            <p className="text-sm opacity-50 text-center py-8 italic">No upcoming sessions booked.</p>
          ) : (
            sessions.map((session) => (
              <div key={session.id} className="flex items-center justify-between p-6 bg-brand-cream/20 border border-brand-cream rounded-3xl">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl ${
                    session.type === 'chat' ? 'bg-blue-100 text-blue-600' : 
                    session.type === 'voice' ? 'bg-green-100 text-green-600' : 
                    'bg-purple-100 text-purple-600'
                  }`}>
                    {session.type === 'chat' ? <MessageCircle size={20} /> : 
                     session.type === 'voice' ? <Phone size={20} /> : 
                     <Calendar size={20} />}
                  </div>
                  <div>
                    <h3 className="font-medium capitalize">{session.type} Session</h3>
                    <p className="text-xs opacity-50">{new Date(session.scheduled_at).toLocaleString()}</p>
                    {session.notes && <p className="text-xs mt-1 italic">"{session.notes}"</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full ${
                    session.status === 'scheduled' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {session.status}
                  </span>
                  <button 
                    onClick={() => onCancel(session.id!)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'journal' | 'progress' | 'mindfulness' | 'toolbox' | 'settings' | 'sessions'>('chat');
  const [settingsTab, setSettingsTab] = useState<'profile' | 'persona' | 'notifications' | 'appearance'>('profile');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [journalInput, setJournalInput] = useState('');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [moodLogs, setMoodLogs] = useState<MoodLog[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [supportContacts, setSupportContacts] = useState<SupportContact[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [showMoodPicker, setShowMoodPicker] = useState(true);
  const [isRecordingChat, setIsRecordingChat] = useState(false);
  const [isRecordingJournal, setIsRecordingJournal] = useState(false);
  const [showBreathing, setShowBreathing] = useState(false);
  const [showCrisisInfo, setShowCrisisInfo] = useState(false);
  const [showGratitude, setShowGratitude] = useState(false);
  const [gratitudeEntries, setGratitudeEntries] = useState<string[]>(['', '', '']);
  const [userProfile, setUserProfile] = useState({ name: 'User', email: '', profile_picture: null as string | null });
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const notifiedRemindersRef = useRef<Set<string>>(new Set());
  const [preferences, setPreferences] = useState<UserPreferences>({
    voice: 'Kore',
    language: 'en',
    tone: 'empathetic',
    formality: 'neutral',
    responseLength: 'balanced',
    aiName: 'Ex-Mind',
    backstory: '',
    isSpeakingEnabled: true
  });

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-save journal draft
  useEffect(() => {
    const savedDraft = localStorage.getItem('journal_draft');
    if (savedDraft) {
      setJournalInput(savedDraft);
    }

    // Check for existing session
    const savedUser = localStorage.getItem('exmind_user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        setIsLoggedIn(true);
      } catch (e) {
        console.error("Failed to parse saved user", e);
      }
    }
  }, []);

  const handleLogin = (loggedInUser: UserProfile) => {
    setUser(loggedInUser);
    setIsLoggedIn(true);
    localStorage.setItem('exmind_user', JSON.stringify(loggedInUser));
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUser(null);
    localStorage.removeItem('exmind_user');
  };

  // Debounced save (saves 2s after typing stops)
  useEffect(() => {
    if (!journalInput.trim()) return;
    
    setIsSaving(true);
    const timer = setTimeout(() => {
      localStorage.setItem('journal_draft', journalInput);
      setLastSaved(new Date());
      setIsSaving(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, [journalInput]);

  // Periodic save (saves every 30s if changed)
  useEffect(() => {
    const interval = setInterval(() => {
      if (journalInput.trim()) {
        localStorage.setItem('journal_draft', journalInput);
        setLastSaved(new Date());
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [journalInput]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Reminder Notification Check
  useEffect(() => {
    const checkReminders = () => {
      if (notificationPermission !== 'granted' || reminders.length === 0) return;

      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const todayStr = now.toDateString();

      reminders.forEach(reminder => {
        const reminderKey = `${reminder.id}-${todayStr}`;
        if (reminder.time === currentTime && !reminder.completed && !notifiedRemindersRef.current.has(reminderKey)) {
          new Notification("Ex-Mind Reminder", {
            body: `Time for: ${reminder.activity}`,
            icon: "/favicon.ico" // Assuming a favicon exists
          });
          notifiedRemindersRef.current.add(reminderKey);
        }
      });
    };

    const interval = setInterval(checkReminders, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [reminders, notificationPermission]);

  const requestNotificationPermission = async () => {
    if (typeof Notification === 'undefined') return;
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
  };

  const fetchData = async () => {
    if (!user) return;
    try {
      const [moodRes, journalRes, chatRes, prefRes, supportRes, reminderRes, userRes, sessionRes] = await Promise.all([
        fetch(`/api/mood/${user.id}`),
        fetch(`/api/journal/${user.id}`),
        fetch(`/api/chat/${user.id}`),
        fetch(`/api/preferences/${user.id}`),
        fetch(`/api/support/${user.id}`),
        fetch(`/api/reminders/${user.id}`),
        fetch(`/api/user/${user.id}`),
        fetch(`/api/sessions/${user.id}`)
      ]);
      
      if (moodRes.ok) setMoodLogs(await moodRes.json());
      if (journalRes.ok) setJournalEntries(await journalRes.json());
      if (chatRes.ok) setMessages(await chatRes.json());
      if (prefRes.ok) setPreferences(await prefRes.json());
      if (supportRes.ok) setSupportContacts(await supportRes.json());
      if (reminderRes.ok) setReminders(await reminderRes.json());
      if (userRes.ok) setUserProfile(await userRes.json());
      if (sessionRes.ok) setSessions(await sessionRes.json());
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchData();
    }
  }, [isLoggedIn]);

  const handleBookSession = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const formData = new FormData(e.currentTarget);
    const newSession = {
      user_id: user.id,
      type: formData.get('type') as string,
      scheduled_at: formData.get('scheduled_at') as string,
      notes: formData.get('notes') as string,
    };

    try {
      await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSession)
      });
      fetchData();
      (e.target as HTMLFormElement).reset();
      alert('Session booked successfully!');
    } catch (error) {
      console.error('Error booking session:', error);
    }
  };

  const handleCancelSession = async (id: number) => {
    try {
      await fetch(`/api/sessions/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (error) {
      console.error('Error cancelling session:', error);
    }
  };

  const sentimentCounts = journalEntries.reduce((acc, entry) => {
    acc[entry.sentiment] = (acc[entry.sentiment] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sentimentData = Object.entries(sentimentCounts).map(([name, value]) => ({ name, value }));
  const SENTIMENT_COLORS: Record<string, string> = {
    'Happy': '#10B981',
    'Sad': '#3B82F6',
    'Anxious': '#F59E0B',
    'Calm': '#14B8A6',
    'Angry': '#EF4444',
    'Neutral': '#6B7280',
  };

  const SENTIMENT_VALUES: Record<string, number> = {
    'Happy': 5,
    'Calm': 4,
    'Neutral': 3,
    'Anxious': 2,
    'Sad': 1,
    'Angry': 1,
  };

  const getWeeklyStats = () => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const thisWeekMoods = moodLogs.filter(m => new Date(m.timestamp) >= oneWeekAgo);
    const lastWeekMoods = moodLogs.filter(m => {
      const d = new Date(m.timestamp);
      return d >= twoWeeksAgo && d < oneWeekAgo;
    });

    const thisWeekAvg = thisWeekMoods.length > 0 
      ? thisWeekMoods.reduce((acc, m) => acc + m.mood, 0) / thisWeekMoods.length 
      : 0;
    const lastWeekAvg = lastWeekMoods.length > 0 
      ? lastWeekMoods.reduce((acc, m) => acc + m.mood, 0) / lastWeekMoods.length 
      : 0;

    return {
      thisWeekAvg,
      lastWeekAvg,
      improvement: lastWeekAvg > 0 ? ((thisWeekAvg - lastWeekAvg) / lastWeekAvg) * 100 : 0
    };
  };

  const weeklyStats = getWeeklyStats();

  const calculateStreak = () => {
    const allDates = [
      ...moodLogs.map(m => new Date(m.timestamp).toDateString()),
      ...journalEntries.map(j => new Date(j.timestamp).toDateString())
    ];
    
    const uniqueDates = Array.from(new Set(allDates))
      .map(d => new Date(d))
      .sort((a, b) => b.getTime() - a.getTime());

    if (uniqueDates.length === 0) return 0;

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const lastActivityDate = new Date(uniqueDates[0]);
    lastActivityDate.setHours(0, 0, 0, 0);

    // If last activity was more than 1 day ago, streak is broken
    const diffDays = Math.floor((today.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 1) return 0;

    let currentDate = lastActivityDate;
    for (const date of uniqueDates) {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      
      const diff = Math.floor((currentDate.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diff === 0) {
        if (streak === 0) streak = 1;
        continue;
      } else if (diff === 1) {
        streak++;
        currentDate = d;
      } else {
        break;
      }
    }
    
    return streak;
  };

  const streak = calculateStreak();

  const detectCrisis = async (text: string) => {
    const crisisKeywords = [
      'suicide', 'kill myself', 'end my life', 'end it all', 'self harm', 
      'hurt myself', 'want to die', 'dying', 'hopeless', 'worthless', 
      'give up', 'no reason to live', 'better off dead', 'suicidal',
      'hurt me', 'kill me', 'end me', 'goodbye world', 'final goodbye',
      'overdose', 'cut myself', 'hanging myself', 'jump off', 'bridge',
      'no point', 'everything is dark', 'cannot go on', 'can\'t go on',
      'suffocating', 'trapped', 'never get better', 'hate my life',
      'wish i was never born', 'don\'t want to wake up', 'sleep forever'
    ];
    
    const lowerText = text.toLowerCase();
    const hasKeyword = crisisKeywords.some(keyword => lowerText.includes(keyword));
    
    if (hasKeyword) return true;

    // If no keyword, use sophisticated intent detection
    try {
      const { isCrisis } = await detectCrisisIntent(text);
      return isCrisis;
    } catch (e) {
      console.error('Crisis intent detection failed:', e);
      return false;
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const formData = new FormData(e.currentTarget);
    const updatedProfile = {
      ...userProfile,
      name: formData.get('name') as string,
      email: formData.get('email') as string,
    };

    try {
      await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, ...updatedProfile })
      });
      setUserProfile(updatedProfile);
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const handleProfilePictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      const updatedProfile = { ...userProfile, profile_picture: base64String };
      
      try {
        await fetch('/api/user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: user.id, ...updatedProfile })
        });
        setUserProfile(updatedProfile);
      } catch (error) {
        console.error('Error uploading profile picture:', error);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRequestVolunteer = async () => {
    if (!user) return;
    try {
      await fetch('/api/volunteer-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id })
      });
      alert("A Befrienders volunteer has been notified and will reach out to you soon.");
    } catch (error) {
      console.error('Error requesting volunteer:', error);
    }
  };

  const handleAddContact = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const formData = new FormData(e.currentTarget);
    const contact = {
      name: formData.get('name') as string,
      relation: formData.get('relation') as string,
      phone: formData.get('phone') as string,
      email: formData.get('email') as string,
    };

    try {
      await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, ...contact })
      });
      fetchData();
      (e.target as HTMLFormElement).reset();
    } catch (error) {
      console.error('Error adding contact:', error);
    }
  };

  const handleDeleteContact = async (id: number) => {
    try {
      await fetch(`/api/support/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (error) {
      console.error('Error deleting contact:', error);
    }
  };

  const handleAddReminder = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const formData = new FormData(e.currentTarget);
    const reminder = {
      activity: formData.get('activity') as string,
      time: formData.get('time') as string,
    };

    try {
      await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, ...reminder })
      });
      fetchData();
      (e.target as HTMLFormElement).reset();
    } catch (error) {
      console.error('Error adding reminder:', error);
    }
  };

  const handleDeleteReminder = async (id: number) => {
    try {
      await fetch(`/api/reminders/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (error) {
      console.error('Error deleting reminder:', error);
    }
  };

  const handleToggleReminder = async (id: number, completed: boolean) => {
    try {
      await fetch(`/api/reminders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed })
      });
      fetchData();
    } catch (error) {
      console.error('Error toggling reminder:', error);
    }
  };

  const toggleRecording = (target: 'chat' | 'journal') => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    const isCurrentlyRecording = target === 'chat' ? isRecordingChat : isRecordingJournal;

    if (isCurrentlyRecording) {
      if (target === 'chat') setIsRecordingChat(false);
      else setIsRecordingJournal(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = preferences.language === 'sw' ? 'sw-KE' : 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      if (target === 'chat') setIsRecordingChat(true);
      else setIsRecordingJournal(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (target === 'chat') {
        setInput(prev => prev + ' ' + transcript);
      } else {
        setJournalInput(prev => prev + ' ' + transcript);
      }
    };

    recognition.onend = () => {
      if (target === 'chat') setIsRecordingChat(false);
      else setIsRecordingJournal(false);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      if (target === 'chat') setIsRecordingChat(false);
      else setIsRecordingJournal(false);
    };

    recognition.start();
  };

  const savePreferences = async (newPrefs: UserPreferences) => {
    if (!user) return;
    try {
      await fetch('/api/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, preferences: newPrefs })
      });
    } catch (error) {
      console.error('Error saving preferences:', error);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || !user) return;

    const userMessage: ChatMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    
    const isCrisisDetected = await detectCrisis(input);
    if (isCrisisDetected) {
      setShowCrisisInfo(true);
    }
    
    setInput('');
    setIsTyping(true);

    try {
      // Save user message
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, ...userMessage })
      });

      const responseText = await getChatResponse(input, messages, preferences, moodLogs, journalEntries, isCrisisDetected);
      const aiMessage: ChatMessage = { role: 'model', content: responseText || `I am ${preferences.aiName || 'Ex-Mind'}, and I am here for you.` };
      
      setMessages(prev => [...prev, aiMessage]);
      
      // Save AI message
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, ...aiMessage })
      });

      // Speak if enabled
      if (preferences.isSpeakingEnabled) {
        const audioData = await generateSpeech(aiMessage.content, preferences.voice);
        if (audioData) {
          const audio = new Audio(`data:audio/wav;base64,${audioData}`);
          audioRef.current = audio;
          audio.play();
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleMoodSubmit = async (mood: number) => {
    if (!user) return;
    try {
      await fetch('/api/mood', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, mood, note: '' })
      });
      setShowMoodPicker(false);
      fetchData();
    } catch (error) {
      console.error('Error logging mood:', error);
    }
  };

  const handleJournalSubmit = async (content: string) => {
    if (!user) return;
    const isCrisisDetected = await detectCrisis(content);
    if (isCrisisDetected) {
      setShowCrisisInfo(true);
    }
    
    try {
      const sentiment = await analyzeMood(content);
      await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, content, sentiment })
      });
      localStorage.removeItem('journal_draft');
      setLastSaved(null);
      fetchData();
    } catch (error) {
      console.error('Error saving journal:', error);
    }
  };

  const handleGratitudeSubmit = async () => {
    const content = `Gratitude List:\n1. ${gratitudeEntries[0]}\n2. ${gratitudeEntries[1]}\n3. ${gratitudeEntries[2]}`;
    await handleJournalSubmit(content);
    setShowGratitude(false);
    setGratitudeEntries(['', '', '']);
  };

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto bg-white shadow-2xl overflow-hidden">
      {/* Header */}
      <header className="p-6 border-b border-brand-cream flex justify-between items-center bg-brand-cream/30">
        <div>
          <h1 className="text-2xl font-serif font-medium text-brand-olive">{preferences.aiName || 'Ex-Mind'}</h1>
          <p className="text-xs text-brand-olive/60 uppercase tracking-widest">Mental Health Companion</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => {
              const newPrefs = { ...preferences, isSpeakingEnabled: !preferences.isSpeakingEnabled };
              setPreferences(newPrefs);
              savePreferences(newPrefs);
            }}
            className={`p-2 rounded-full transition-colors ${preferences.isSpeakingEnabled ? 'bg-brand-olive text-white' : 'bg-white text-brand-olive border border-brand-olive/20'}`}
          >
            {preferences.isSpeakingEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <button 
            onClick={() => setShowCrisisInfo(true)}
            className="bg-red-50 text-red-600 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 border border-red-100 hover:bg-red-100 transition-colors"
          >
            <AlertTriangle size={12} />
            Crisis Help
          </button>
          <div 
            onClick={() => setActiveTab('settings')}
            className="w-10 h-10 rounded-full overflow-hidden bg-brand-cream border-2 border-white shadow-sm cursor-pointer hover:scale-105 transition-transform flex items-center justify-center"
          >
            {userProfile.profile_picture ? (
              <img 
                src={userProfile.profile_picture} 
                alt="Profile" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <User size={20} className="text-brand-olive/40" />
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative p-4">
        <AnimatePresence mode="wait">
          {activeTab === 'chat' && (
            <motion.div 
              key="chat"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col h-full"
            >
              {showMoodPicker && moodLogs.length === 0 && (
                <div className="mb-8 p-6 bg-brand-cream rounded-3xl text-center">
                  <h2 className="serif text-xl mb-4">How are you feeling right now?</h2>
                  <div className="flex justify-center gap-4">
                    {MOODS.map((m) => (
                      <button
                        key={m.value}
                        onClick={() => handleMoodSubmit(m.value)}
                        className="flex flex-col items-center gap-2 group"
                      >
                        <div className={`p-3 rounded-full bg-white shadow-sm group-hover:scale-110 transition-transform ${m.color}`}>
                          <m.icon size={24} />
                        </div>
                        <span className="text-[10px] uppercase tracking-tighter opacity-60">{m.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex-1 space-y-4 pb-4">
                {messages.map((msg, i) => (
                  <div 
                    key={i} 
                    className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    <div className={`w-8 h-8 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center border border-brand-cream shadow-sm ${msg.role === 'user' ? 'bg-brand-olive/10' : 'bg-brand-cream'}`}>
                      {msg.role === 'user' ? (
                        userProfile.profile_picture ? (
                          <img 
                            src={userProfile.profile_picture} 
                            alt="User" 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <User size={14} className="text-brand-olive" />
                        )
                      ) : (
                        <Heart size={14} className="text-brand-olive" />
                      )}
                    </div>
                    <div className={`max-w-[80%] p-4 rounded-2xl ${
                      msg.role === 'user' 
                        ? 'bg-brand-olive text-white rounded-tr-none' 
                        : 'bg-brand-cream/50 text-brand-ink rounded-tl-none border border-brand-olive/10'
                    }`}>
                      <div className="text-sm leading-relaxed markdown-body">
                        {msg.role === 'model' ? (
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        ) : (
                          msg.content
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-brand-cream/30 p-4 rounded-2xl rounded-tl-none">
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-brand-olive/40 rounded-full animate-bounce"></span>
                        <span className="w-1.5 h-1.5 bg-brand-olive/40 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                        <span className="w-1.5 h-1.5 bg-brand-olive/40 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            </motion.div>
          )}

          {activeTab === 'journal' && (
            <motion.div 
              key="journal"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="p-6 bg-brand-olive text-white rounded-3xl shadow-lg relative">
                <h2 className="serif text-2xl mb-2">Daily Reflection</h2>
                <p className="text-sm opacity-80 mb-4">Write down your thoughts. No one is judging.</p>
                <div className="relative">
                  <textarea 
                    className="w-full bg-white/10 border border-white/20 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-white/30 min-h-[150px] placeholder:text-white/40 pr-12"
                    placeholder="What's on your mind today?"
                    value={journalInput}
                    onChange={(e) => setJournalInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.ctrlKey) {
                        handleJournalSubmit(journalInput);
                        setJournalInput('');
                      }
                    }}
                  />
                  <button 
                    onClick={() => toggleRecording('journal')}
                    className={`absolute bottom-4 right-4 p-2 rounded-full transition-all ${
                      isRecordingJournal ? 'bg-red-500 text-white animate-pulse' : 'bg-white/20 text-white hover:bg-white/30'
                    }`}
                  >
                    {isRecordingJournal ? <MicOff size={18} /> : <Mic size={18} />}
                  </button>
                </div>
                <div className="mt-2 flex justify-between items-center">
                  <div className="text-[10px] opacity-50 italic flex items-center gap-2">
                    {isSaving ? (
                      <span className="flex items-center gap-1">
                        <RotateCcw size={10} className="animate-spin" /> Saving...
                      </span>
                    ) : (
                      lastSaved && `Draft auto-saved at ${lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    )}
                  </div>
                  <div className="text-[10px] opacity-50">Press Ctrl+Enter to save</div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-widest opacity-40">Past Entries</h3>
                {journalEntries.map((entry) => {
                  const sentimentConfig: Record<string, { icon: any, color: string, bg: string }> = {
                    'Happy': { icon: Smile, color: 'text-green-600', bg: 'bg-green-50' },
                    'Sad': { icon: Frown, color: 'text-blue-600', bg: 'bg-blue-50' },
                    'Anxious': { icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50' },
                    'Calm': { icon: Heart, color: 'text-teal-600', bg: 'bg-teal-50' },
                    'Angry': { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
                    'Neutral': { icon: Meh, color: 'text-gray-600', bg: 'bg-gray-50' },
                  };
                  const config = sentimentConfig[entry.sentiment] || sentimentConfig['Neutral'];
                  
                  return (
                    <div key={entry.id} className="p-5 bg-white border border-brand-cream rounded-3xl shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] font-medium text-brand-olive/40 uppercase tracking-widest">
                          {new Date(entry.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${config.bg} ${config.color} border border-current/10`}>
                          <config.icon size={12} />
                          <span className="text-[10px] font-bold uppercase tracking-tighter">
                            {entry.sentiment}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-brand-ink/80 leading-relaxed">{entry.content}</p>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {activeTab === 'sessions' && (
            <motion.div 
              key="sessions"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Sessions 
                sessions={sessions} 
                onBook={handleBookSession} 
                onCancel={handleCancelSession} 
              />
            </motion.div>
          )}

          {activeTab === 'progress' && (
            <motion.div 
              key="progress"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8 pb-10"
            >
              <div className="text-center mb-8">
                <h2 className="serif text-3xl text-brand-olive">Your Journey</h2>
                <p className="text-xs opacity-50 uppercase tracking-widest mt-1">Visualizing your growth and patterns</p>
              </div>

               {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-6 rounded-3xl border border-brand-cream shadow-sm flex flex-col justify-between">
                  <div className="flex items-center gap-2 mb-4 opacity-40">
                    <TrendingUp size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Weekly Progress</span>
                  </div>
                  <div className="flex items-end gap-3">
                    <p className="text-3xl font-serif text-brand-olive">{weeklyStats.thisWeekAvg.toFixed(1)}</p>
                    {weeklyStats.lastWeekAvg > 0 && (
                      <div className={`flex items-center text-[10px] font-bold mb-1 ${weeklyStats.improvement >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {weeklyStats.improvement >= 0 ? '↑' : '↓'} {Math.abs(weeklyStats.improvement).toFixed(0)}%
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] opacity-50 mt-1">Average mood this week</p>
                </div>
                
                <div className="bg-white p-6 rounded-3xl border border-brand-cream shadow-sm flex flex-col justify-between relative overflow-hidden">
                  <div className="flex items-center gap-2 mb-4 opacity-40">
                    <Zap size={14} className={streak > 0 ? "text-orange-500 opacity-100" : ""} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Current Streak</span>
                  </div>
                  <p className="text-3xl font-serif text-brand-olive">{streak}d</p>
                  <p className="text-[10px] opacity-50 mt-1">Consecutive days active</p>
                  {streak > 0 && (
                    <motion.div 
                      animate={{ opacity: [0.1, 0.2, 0.1], scale: [1, 1.1, 1] }}
                      transition={{ duration: 3, repeat: Infinity }}
                      className="absolute -bottom-4 -right-4 text-orange-500/10"
                    >
                      <Zap size={80} fill="currentColor" />
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Mood Trends Chart */}
              <section className="bg-white p-6 rounded-3xl border border-brand-cream shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                  <TrendingUp size={16} className="text-brand-olive" />
                  <h3 className="text-xs font-semibold uppercase tracking-widest opacity-40">Mood Trends</h3>
                </div>
                <div className="h-56 w-full">
                  {moodLogs.length > 1 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={moodLogs.slice(-14).map(m => ({ 
                        date: new Date(m.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                        mood: m.mood 
                      }))}>
                        <defs>
                          <linearGradient id="colorMood" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#5A5A40" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#5A5A40" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E6E6E6" />
                        <XAxis 
                          dataKey="date" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 10, fill: '#141414', opacity: 0.4 }} 
                        />
                        <YAxis 
                          domain={[1, 5]} 
                          ticks={[1, 2, 3, 4, 5]} 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 10, fill: '#141414', opacity: 0.4 }} 
                        />
                        <Tooltip 
                          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: '12px' }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="mood" 
                          stroke="#5A5A40" 
                          strokeWidth={2} 
                          fillOpacity={1} 
                          fill="url(#colorMood)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs opacity-40 italic">
                      Log more moods to see your trends
                    </div>
                  )}
                </div>
              </section>

               {/* Sentiment Distribution */}
              <div className="grid grid-cols-1 gap-6">
                <section className="bg-white p-6 rounded-3xl border border-brand-cream shadow-sm">
                  <div className="flex items-center gap-2 mb-6">
                    <Smile size={16} className="text-brand-olive" />
                    <h3 className="text-xs font-semibold uppercase tracking-widest opacity-40">Journal Sentiment Distribution</h3>
                  </div>
                  <div className="h-64 w-full flex flex-col items-center relative">
                    {journalEntries.length > 0 ? (
                      <>
                        <ResponsiveContainer width="100%" height="80%">
                          <PieChart>
                            <Pie
                              data={sentimentData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {sentimentData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={SENTIMENT_COLORS[entry.name] || '#6B7280'} />
                              ))}
                            </Pie>
                            <Tooltip 
                              contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                          <span className="text-[10px] font-bold uppercase tracking-widest opacity-30 block">Total</span>
                          <span className="text-xl font-serif text-brand-olive">{journalEntries.length}</span>
                        </div>
                        <div className="flex flex-wrap justify-center gap-3 mt-4">
                          {sentimentData.map((entry) => (
                            <div key={entry.name} className="flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: SENTIMENT_COLORS[entry.name] || '#6B7280' }} />
                              <span className="text-[10px] font-bold uppercase tracking-tighter opacity-60">{entry.name}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs opacity-40 italic">
                        Write in your journal to see sentiment analysis
                      </div>
                    )}
                  </div>
                </section>

                <section className="bg-white p-6 rounded-3xl border border-brand-cream shadow-sm">
                  <div className="flex items-center gap-2 mb-6">
                    <BarChart3 size={16} className="text-brand-olive" />
                    <h3 className="text-xs font-semibold uppercase tracking-widest opacity-40">Sentiment Timeline</h3>
                  </div>
                  <div className="h-56 w-full">
                    {journalEntries.length > 1 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={journalEntries.slice(-10).map(j => ({
                          date: new Date(j.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                          value: SENTIMENT_VALUES[j.sentiment] || 3,
                          sentiment: j.sentiment
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E6E6E6" />
                          <XAxis 
                            dataKey="date" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 10, fill: '#141414', opacity: 0.4 }} 
                          />
                          <YAxis 
                            domain={[0, 5]} 
                            hide
                          />
                          <Tooltip 
                            cursor={{ fill: '#F5F5F0' }}
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                  <div className="bg-white p-3 rounded-2xl shadow-xl border border-brand-cream text-xs">
                                    <p className="font-bold mb-1">{data.date}</p>
                                    <p className="flex items-center gap-2">
                                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: SENTIMENT_COLORS[data.sentiment] }} />
                                      {data.sentiment}
                                    </p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Bar 
                            dataKey="value" 
                            radius={[10, 10, 10, 10]}
                            barSize={20}
                          >
                            {journalEntries.slice(-10).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={SENTIMENT_COLORS[entry.sentiment] || '#6B7280'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs opacity-40 italic">
                        Write more journal entries to see your sentiment timeline
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </motion.div>
          )}

          {activeTab === 'mindfulness' && (
            <motion.div 
              key="mindfulness"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="h-full"
            >
              <MindfulnessExercise onClose={() => setActiveTab('toolbox')} isTab />
            </motion.div>
          )}

          {activeTab === 'toolbox' && (
            <motion.div 
              key="toolbox"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-8"
            >
              <div className="grid grid-cols-2 gap-4">
                {[
                  { title: 'Mindfulness', desc: 'Guided breathing & meditation', color: 'bg-blue-50 text-blue-700', action: () => setShowBreathing(true) },
                  { title: 'CBT Reframing', desc: 'Challenge negative thoughts', color: 'bg-emerald-50 text-emerald-700' },
                  { title: 'Crisis Support', desc: 'Immediate help & resources', color: 'bg-red-50 text-red-700', action: () => setShowCrisisInfo(true) },
                  { title: 'Request Help', desc: 'Ask a Befrienders volunteer to call', color: 'bg-orange-50 text-orange-700', action: handleRequestVolunteer },
                  { title: 'Gratitude', desc: 'List 3 things you are thankful for', color: 'bg-amber-50 text-amber-700', action: () => setShowGratitude(true) },
                  { title: 'Body Scan', desc: 'Deep relaxation session', color: 'bg-purple-50 text-purple-700', action: () => setShowBreathing(true) },
                ].map((tool, i) => (
                  <div 
                    key={i} 
                    onClick={tool.action}
                    className={`p-5 rounded-3xl ${tool.color} cursor-pointer hover:scale-[1.02] transition-transform flex flex-col justify-between min-h-[120px] shadow-sm`}
                  >
                    <h3 className="serif text-lg mb-1">{tool.title}</h3>
                    <p className="text-[10px] opacity-70 leading-tight">{tool.desc}</p>
                  </div>
                ))}
              </div>

              <section className="bg-brand-cream/20 p-6 rounded-3xl border border-brand-cream/50">
                <div className="flex items-center gap-2 mb-6">
                  <Bell size={18} className="text-brand-olive" />
                  <h3 className="text-xs font-semibold uppercase tracking-widest opacity-40">Self-Care Reminders</h3>
                </div>

                <div className="space-y-3 mb-6">
                  {reminders.length === 0 && (
                    <p className="text-xs text-brand-ink/40 italic text-center py-4">No reminders set. Add one below.</p>
                  )}
                  {reminders.map((reminder) => (
                    <div 
                      key={reminder.id} 
                      className={`p-4 bg-white rounded-2xl flex justify-between items-center shadow-sm border transition-all ${
                        reminder.completed ? 'opacity-50 border-transparent' : 'border-brand-cream'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => handleToggleReminder(reminder.id, !reminder.completed)}
                          className={`p-1 rounded-full transition-colors ${
                            reminder.completed ? 'text-green-500' : 'text-brand-olive/20 hover:text-brand-olive/40'
                          }`}
                        >
                          <CheckCircle size={20} />
                        </button>
                        <div>
                          <p className={`text-sm font-medium ${reminder.completed ? 'line-through' : ''}`}>
                            {reminder.activity}
                          </p>
                          <div className="flex items-center gap-1 opacity-40">
                            <Clock size={10} />
                            <span className="text-[10px]">{reminder.time}</span>
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleDeleteReminder(reminder.id)}
                        className="p-2 text-red-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleAddReminder} className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <input 
                      name="activity" 
                      placeholder="Activity (e.g. Drink water)" 
                      className="text-xs p-3 bg-white border border-brand-cream rounded-xl outline-none focus:ring-2 focus:ring-brand-olive/20" 
                      required 
                    />
                    <input 
                      name="time" 
                      type="time" 
                      className="text-xs p-3 bg-white border border-brand-cream rounded-xl outline-none focus:ring-2 focus:ring-brand-olive/20" 
                      required 
                    />
                  </div>
                  <button 
                    type="submit" 
                    className="w-full p-3 bg-brand-olive text-white text-xs rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-brand-olive/90 transition-colors"
                  >
                    <Plus size={14} /> Add Reminder
                  </button>
                </form>
              </section>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div 
              key="settings"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6 pb-10"
            >
              <div className="text-center mb-6">
                <h2 className="serif text-3xl text-brand-olive">Settings</h2>
                <p className="text-xs opacity-50 uppercase tracking-widest mt-1">Customize your experience</p>
                <button 
                  onClick={handleLogout}
                  className="mt-4 px-4 py-2 bg-red-50 text-red-600 rounded-full text-[10px] font-bold uppercase tracking-widest border border-red-100 hover:bg-red-100 transition-colors"
                >
                  Logout
                </button>
              </div>

              {/* Settings Sub-Navigation */}
              <div className="flex gap-2 overflow-x-auto pb-2 mb-2 no-scrollbar border-b border-brand-cream/30">
                {[
                  { id: 'profile', label: 'Profile', icon: User },
                  { id: 'persona', label: 'AI Persona', icon: Heart },
                  { id: 'notifications', label: 'Notifications', icon: Bell },
                  { id: 'appearance', label: 'Appearance', icon: Volume2 },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSettingsTab(s.id as any)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${
                      settingsTab === s.id 
                        ? 'bg-brand-olive text-white shadow-md' 
                        : 'text-brand-ink/40 hover:text-brand-ink/60'
                    }`}
                  >
                    <s.icon size={12} />
                    {s.label}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                {settingsTab === 'profile' && (
                  <motion.div 
                    key="profile-settings"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-8"
                  >
                    {/* User Profile Section */}
                    <section className="bg-white p-6 rounded-3xl border border-brand-cream shadow-sm">
                      <div className="flex items-center gap-2 mb-6">
                        <User size={16} className="text-brand-olive" />
                        <h3 className="text-xs font-semibold uppercase tracking-widest opacity-40">Your Profile</h3>
                      </div>
                      
                      <div className="flex flex-col items-center mb-6">
                        <div className="relative group">
                          <div className="w-24 h-24 rounded-full overflow-hidden bg-brand-cream flex items-center justify-center border-4 border-white shadow-md">
                            {userProfile.profile_picture ? (
                              <img 
                                src={userProfile.profile_picture} 
                                alt="Profile" 
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <User size={40} className="text-brand-olive/30" />
                            )}
                          </div>
                          <label className="absolute bottom-0 right-0 p-2 bg-brand-olive text-white rounded-full shadow-lg cursor-pointer hover:scale-110 transition-transform">
                            <Camera size={14} />
                            <input 
                              type="file" 
                              className="hidden" 
                              accept="image/*"
                              onChange={handleProfilePictureUpload}
                            />
                          </label>
                        </div>
                        <p className="mt-3 text-sm font-medium">{userProfile.name}</p>
                        <p className="text-[10px] opacity-50">{userProfile.email || 'No email set'}</p>
                      </div>

                      <form onSubmit={handleUpdateProfile} className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 ml-1">Full Name</label>
                          <input 
                            name="name" 
                            defaultValue={userProfile.name}
                            placeholder="Your Name" 
                            className="w-full text-xs p-3 bg-brand-cream/30 border border-brand-cream rounded-xl outline-none focus:ring-2 focus:ring-brand-olive/20" 
                            required 
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 ml-1">Email Address</label>
                          <input 
                            name="email" 
                            type="email"
                            defaultValue={userProfile.email}
                            placeholder="your@email.com" 
                            className="w-full text-xs p-3 bg-brand-cream/30 border border-brand-cream rounded-xl outline-none focus:ring-2 focus:ring-brand-olive/20" 
                            required 
                          />
                        </div>
                        <button 
                          type="submit" 
                          className="w-full p-3 bg-brand-olive text-white text-xs rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-brand-olive/90 transition-colors"
                        >
                          <Upload size={14} /> Update Profile
                        </button>
                      </form>
                    </section>

                    <section className="bg-white p-6 rounded-3xl border border-brand-cream shadow-sm">
                      <div className="flex items-center gap-2 mb-4">
                        <Users size={16} className="text-brand-olive" />
                        <h3 className="text-xs font-semibold uppercase tracking-widest opacity-40">Circle of Support</h3>
                      </div>
                      <div className="space-y-3 mb-4">
                        {supportContacts.length === 0 && (
                          <p className="text-[10px] opacity-40 italic text-center py-4">No contacts added yet.</p>
                        )}
                        {supportContacts.map(contact => (
                          <div key={contact.id} className="p-3 bg-brand-cream/10 border border-brand-cream rounded-xl flex justify-between items-center">
                            <div>
                              <p className="text-sm font-medium">{contact.name}</p>
                              <p className="text-[10px] opacity-60">{contact.relation} • {contact.phone}</p>
                              {contact.email && <p className="text-[10px] opacity-40">{contact.email}</p>}
                            </div>
                            <button onClick={() => handleDeleteContact(contact.id)} className="p-2 text-red-400 hover:text-red-600">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                      <form onSubmit={handleAddContact} className="grid grid-cols-2 gap-2">
                        <input name="name" placeholder="Name" className="text-xs p-2 bg-brand-cream/30 border border-brand-cream rounded-lg outline-none" required />
                        <input name="relation" placeholder="Relation" className="text-xs p-2 bg-brand-cream/30 border border-brand-cream rounded-lg outline-none" required />
                        <input name="phone" placeholder="Phone" className="text-xs p-2 bg-brand-cream/30 border border-brand-cream rounded-lg outline-none" required />
                        <input name="email" type="email" placeholder="Email" className="text-xs p-2 bg-brand-cream/30 border border-brand-cream rounded-lg outline-none" />
                        <button type="submit" className="col-span-2 p-2 bg-brand-olive text-white text-xs rounded-lg font-medium flex items-center justify-center gap-2">
                          <Plus size={14} /> Add Contact
                        </button>
                      </form>
                    </section>
                  </motion.div>
                )}

                {settingsTab === 'persona' && (
                  <motion.div 
                    key="persona-settings"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-8"
                  >
                    <section className="bg-white p-6 rounded-3xl border border-brand-cream shadow-sm">
                      <div className="flex items-center gap-2 mb-6">
                        <Heart size={16} className="text-brand-olive" />
                        <h3 className="text-xs font-semibold uppercase tracking-widest opacity-40">AI Companion Persona</h3>
                      </div>

                      <div className="space-y-6">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 ml-1">Companion Name</label>
                          <input 
                            value={preferences.aiName || ''}
                            onChange={(e) => {
                              const newPrefs = { ...preferences, aiName: e.target.value };
                              setPreferences(newPrefs);
                            }}
                            onBlur={() => savePreferences(preferences)}
                            placeholder="e.g. Ex-Mind, Serenity, Hope..." 
                            className="w-full text-xs p-3 bg-brand-cream/30 border border-brand-cream rounded-xl outline-none focus:ring-2 focus:ring-brand-olive/20" 
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 ml-1">AI Tone</label>
                          <div className="grid grid-cols-2 gap-2">
                            {['empathetic', 'professional', 'cheerful', 'calm', 'direct'].map((t) => (
                              <button 
                                key={t}
                                onClick={() => {
                                  const newPrefs = { ...preferences, tone: t as any };
                                  setPreferences(newPrefs);
                                  savePreferences(newPrefs);
                                }}
                                className={`p-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all ${
                                  preferences.tone === t 
                                    ? 'bg-brand-olive text-white border-brand-olive' 
                                    : 'bg-white text-brand-ink border-brand-cream hover:border-brand-olive/30'
                                }`}
                              >
                                {t}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 ml-1">Communication Style</label>
                          <div className="grid grid-cols-3 gap-2">
                            {['casual', 'neutral', 'formal'].map((f) => (
                              <button 
                                key={f}
                                onClick={() => {
                                  const newPrefs = { ...preferences, formality: f as any };
                                  setPreferences(newPrefs);
                                  savePreferences(newPrefs);
                                }}
                                className={`p-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all ${
                                  preferences.formality === f 
                                    ? 'bg-brand-olive text-white border-brand-olive' 
                                    : 'bg-white text-brand-ink border-brand-cream hover:border-brand-olive/30'
                                }`}
                              >
                                {f}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 ml-1">Response Depth</label>
                          <div className="grid grid-cols-3 gap-2">
                            {['concise', 'balanced', 'detailed'].map((l) => (
                              <button 
                                key={l}
                                onClick={() => {
                                  const newPrefs = { ...preferences, responseLength: l as any };
                                  setPreferences(newPrefs);
                                  savePreferences(newPrefs);
                                }}
                                className={`p-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all ${
                                  preferences.responseLength === l 
                                    ? 'bg-brand-olive text-white border-brand-olive' 
                                    : 'bg-white text-brand-ink border-brand-cream hover:border-brand-olive/30'
                                }`}
                              >
                                {l}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 ml-1">AI Backstory & Context</label>
                          <p className="text-[9px] opacity-50 mb-2 italic">Give your companion a specific personality or background.</p>
                          <textarea 
                            value={preferences.backstory || ''}
                            onChange={(e) => {
                              const newPrefs = { ...preferences, backstory: e.target.value };
                              setPreferences(newPrefs);
                            }}
                            onBlur={() => savePreferences(preferences)}
                            className="w-full bg-brand-cream/30 border border-brand-cream rounded-xl p-4 text-xs focus:outline-none focus:ring-2 focus:ring-brand-olive/20 min-h-[120px] placeholder:text-brand-ink/30 leading-relaxed"
                            placeholder="e.g. You are a retired therapist who loves nature..."
                          />
                        </div>
                      </div>
                    </section>

                    <section className="bg-white p-6 rounded-3xl border border-brand-cream shadow-sm">
                      <div className="flex items-center gap-2 mb-4">
                        <Volume2 size={16} className="text-brand-olive" />
                        <h3 className="text-xs font-semibold uppercase tracking-widest opacity-40">AI Voice Selection</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'].map((v) => (
                          <div key={v} className="relative group">
                            <button 
                              onClick={() => {
                                const newPrefs = { ...preferences, voice: v as any };
                                setPreferences(newPrefs);
                                savePreferences(newPrefs);
                              }}
                              className={`w-full p-3 rounded-xl text-sm border transition-all text-left pr-10 ${
                                preferences.voice === v 
                                  ? 'bg-brand-olive text-white border-brand-olive' 
                                  : 'bg-white text-brand-ink border-brand-cream hover:border-brand-olive/30'
                              }`}
                            >
                              {v}
                            </button>
                            <button 
                              onClick={async (e) => {
                                e.stopPropagation();
                                const previewText = preferences.language === 'sw' ? `Hujambo, mimi ni ${v}.` : `Hello, I am ${v}.`;
                                const audioData = await generateSpeech(previewText, v as any);
                                if (audioData) {
                                  const audio = new Audio(`data:audio/wav;base64,${audioData}`);
                                  audio.play();
                                }
                              }}
                              className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors ${
                                preferences.voice === v ? 'text-white/60 hover:text-white' : 'text-brand-olive/40 hover:text-brand-olive'
                              }`}
                              title="Preview Voice"
                            >
                              <Play size={14} fill="currentColor" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </section>
                  </motion.div>
                )}

                {settingsTab === 'notifications' && (
                  <motion.div 
                    key="notifications-settings"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-8"
                  >
                    <section className="bg-white p-6 rounded-3xl border border-brand-cream shadow-sm">
                      <div className="flex items-center justify-between p-4 bg-brand-cream/20 rounded-2xl border border-brand-cream">
                        <div className="flex items-center gap-3">
                          <Bell size={18} className="text-brand-olive" />
                          <div>
                            <h3 className="text-sm font-medium">System Notifications</h3>
                            <p className="text-[10px] opacity-60">Get alerts for your self-care reminders</p>
                          </div>
                        </div>
                        <button 
                          onClick={requestNotificationPermission}
                          disabled={notificationPermission === 'granted'}
                          className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-tighter transition-all ${
                            notificationPermission === 'granted' 
                              ? 'bg-green-100 text-green-600 cursor-default' 
                              : 'bg-brand-olive text-white hover:bg-brand-olive/90'
                          }`}
                        >
                          {notificationPermission === 'granted' ? 'Enabled' : 'Enable'}
                        </button>
                      </div>
                      <p className="mt-4 text-[10px] opacity-40 italic">
                        Notifications help you stay on track with your mindfulness and self-care goals.
                      </p>
                    </section>
                  </motion.div>
                )}

                {settingsTab === 'appearance' && (
                  <motion.div 
                    key="appearance-settings"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-8"
                  >
                    <section className="bg-white p-6 rounded-3xl border border-brand-cream shadow-sm">
                      <div className="flex items-center justify-between p-4 bg-brand-cream/20 rounded-2xl border border-brand-cream">
                        <div className="flex items-center gap-3">
                          <Volume2 size={18} className="text-brand-olive" />
                          <div>
                            <h3 className="text-sm font-medium">Speech Output</h3>
                            <p className="text-[10px] opacity-60">Enable AI voice for responses</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => {
                            const newPrefs = { ...preferences, isSpeakingEnabled: !preferences.isSpeakingEnabled };
                            setPreferences(newPrefs);
                            savePreferences(newPrefs);
                          }}
                          className={`w-12 h-6 rounded-full transition-all relative ${preferences.isSpeakingEnabled ? 'bg-brand-olive' : 'bg-brand-cream'}`}
                        >
                          <motion.div 
                            animate={{ x: preferences.isSpeakingEnabled ? 24 : 2 }}
                            className="absolute top-1 left-0 w-4 h-4 bg-white rounded-full shadow-sm"
                          />
                        </button>
                      </div>
                    </section>

                    <section className="bg-white p-6 rounded-3xl border border-brand-cream shadow-sm">
                      <div className="flex items-center gap-2 mb-4">
                        <Globe size={16} className="text-brand-olive" />
                        <h3 className="text-xs font-semibold uppercase tracking-widest opacity-40">Language</h3>
                      </div>
                      <div className="flex gap-3">
                        {[{ id: 'en', label: 'English' }, { id: 'sw', label: 'Kiswahili' }].map((l) => (
                          <button 
                            key={l.id}
                            onClick={() => {
                              const newPrefs = { ...preferences, language: l.id as any };
                              setPreferences(newPrefs);
                              savePreferences(newPrefs);
                            }}
                            className={`flex-1 p-3 rounded-xl text-sm border transition-all ${
                              preferences.language === l.id 
                                ? 'bg-brand-olive text-white border-brand-olive' 
                                : 'bg-white text-brand-ink border-brand-cream hover:border-brand-olive/30'
                            }`}
                          >
                            {l.label}
                          </button>
                        ))}
                      </div>
                    </section>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Input Area (Chat Only) */}
      {activeTab === 'chat' && (
        <div className="p-4 border-t border-brand-cream bg-white relative">
          <AnimatePresence>
            {isRecordingChat && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute -top-14 left-0 right-0 flex justify-center pointer-events-none"
              >
                <div className="bg-white/90 backdrop-blur-sm border border-red-100 px-6 py-2 rounded-full shadow-lg flex items-center gap-3">
                  <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest animate-pulse">Listening</span>
                  <Waveform />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <button 
              type="button"
              onClick={() => toggleRecording('chat')}
              className={`p-3 rounded-full transition-all relative ${
                isRecordingChat 
                  ? 'bg-red-500 text-white shadow-lg shadow-red-200' 
                  : 'bg-brand-cream text-brand-olive hover:bg-brand-cream/80'
              }`}
            >
              {isRecordingChat && (
                <motion.div 
                  layoutId="recording-ring"
                  className="absolute inset-0 rounded-full border-2 border-red-500"
                  initial={{ scale: 1, opacity: 0.5 }}
                  animate={{ scale: 1.5, opacity: 0 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                />
              )}
              {isRecordingChat ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
            <input 
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 bg-brand-cream/50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand-olive/20 outline-none"
            />
            <button 
              type="submit"
              disabled={!input.trim() || isTyping}
              className="p-3 bg-brand-olive text-white rounded-full disabled:opacity-50 transition-opacity"
            >
              <Send size={20} />
            </button>
          </form>
        </div>
      )}

      {/* Navigation */}
      <nav className="p-4 border-t border-brand-cream bg-brand-cream/10 flex justify-around items-center">
        {[
          { id: 'chat', icon: MessageCircle, label: 'Companion' },
          { id: 'journal', icon: Book, label: 'Journal' },
          { id: 'sessions', icon: Calendar, label: 'Sessions' },
          { id: 'mindfulness', icon: Moon, label: 'Meditate' },
          { id: 'progress', icon: TrendingUp, label: 'Progress' },
          { id: 'settings', icon: Settings, label: 'Settings' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex flex-col items-center gap-1 transition-all ${
              activeTab === tab.id ? 'text-brand-olive scale-110' : 'text-brand-olive/40 hover:text-brand-olive/60'
            }`}
          >
            <tab.icon size={20} />
            <span className="text-[9px] font-semibold uppercase tracking-tighter">{tab.label}</span>
          </button>
        ))}
      </nav>

      <AnimatePresence>
        {showBreathing && <MindfulnessExercise onClose={() => setShowBreathing(false)} />}
        
        {/* Gratitude Modal */}
        <AnimatePresence>
          {showGratitude && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-brand-ink/40 backdrop-blur-sm"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-white w-full max-w-sm rounded-[40px] p-8 shadow-2xl relative"
              >
                <button 
                  onClick={() => setShowGratitude(false)}
                  className="absolute top-6 right-6 p-2 text-brand-ink/20 hover:text-brand-ink/40"
                >
                  <X size={20} />
                </button>

                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Heart size={32} />
                  </div>
                  <h2 className="serif text-2xl mb-2">Gratitude List</h2>
                  <p className="text-sm opacity-60">What are 3 things you're thankful for today?</p>
                </div>

                <div className="space-y-3 mb-8">
                  {gratitudeEntries.map((entry, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-amber-500 font-serif italic text-lg w-4">{i + 1}.</span>
                      <input 
                        value={entry}
                        onChange={(e) => {
                          const newEntries = [...gratitudeEntries];
                          newEntries[i] = e.target.value;
                          setGratitudeEntries(newEntries);
                        }}
                        placeholder="Something good..."
                        className="flex-1 p-3 bg-amber-50/50 border border-amber-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-amber-200"
                      />
                    </div>
                  ))}
                </div>

                <button 
                  onClick={handleGratitudeSubmit}
                  disabled={gratitudeEntries.some(e => !e.trim())}
                  className="w-full p-4 bg-amber-500 text-white rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-amber-600 transition-colors disabled:opacity-50"
                >
                  Save to Journal
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {showCrisisInfo && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={() => setShowCrisisInfo(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertTriangle size={32} />
              </div>
              <h2 className="serif text-2xl mb-4 text-brand-ink">You are not alone.</h2>
              <p className="text-sm text-brand-ink/70 mb-8 leading-relaxed">
                If you are feeling overwhelmed or having thoughts of self-harm, please reach out to the Befrienders Kenya helpline. They are here to listen and support you.
              </p>
              <div className="bg-brand-cream p-4 rounded-2xl mb-8">
                <p className="text-xs uppercase tracking-widest opacity-60 mb-1">Helpline Number</p>
                <p className="text-2xl font-mono font-bold text-brand-olive">0722 178 177</p>
              </div>
              <button 
                onClick={() => setShowCrisisInfo(false)}
                className="w-full py-4 bg-brand-olive text-white rounded-2xl font-medium hover:bg-brand-olive/90 transition-colors"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
