import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
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
  Calendar
} from 'lucide-react';
import { getChatResponse, analyzeMood, generateSpeech } from './services/geminiService';
import { MoodLog, JournalEntry, ChatMessage, UserPreferences, SupportContact, Reminder } from './types';

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

const BreathingExercise = ({ onClose }: { onClose: () => void }) => {
  const [phase, setPhase] = useState<'Inhale' | 'Hold' | 'Exhale'>('Inhale');
  
  useEffect(() => {
    const sequence = async () => {
      while (true) {
        setPhase('Inhale');
        await new Promise(r => setTimeout(r, 4000));
        setPhase('Hold');
        await new Promise(r => setTimeout(r, 4000));
        setPhase('Exhale');
        await new Promise(r => setTimeout(r, 4000));
      }
    };
    sequence();
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-brand-olive/95 flex flex-col items-center justify-center p-6 text-white"
    >
      <button onClick={onClose} className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full">
        <X size={24} />
      </button>
      
      <motion.div
        animate={{
          scale: phase === 'Inhale' ? 1.5 : phase === 'Hold' ? 1.5 : 1,
        }}
        transition={{ duration: 4, ease: "easeInOut" }}
        className="w-48 h-48 rounded-full border-4 border-white/30 flex items-center justify-center mb-12"
      >
        <div className="w-32 h-32 rounded-full bg-white/20 flex items-center justify-center">
          <span className="serif text-2xl font-medium">{phase}</span>
        </div>
      </motion.div>
      
      <h2 className="serif text-3xl mb-2 text-center">Box Breathing</h2>
      <p className="text-sm opacity-70 text-center max-w-xs">Follow the circle. Inhale for 4s, hold for 4s, exhale for 4s.</p>
    </motion.div>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'chat' | 'journal' | 'toolbox' | 'settings'>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [journalInput, setJournalInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [moodLogs, setMoodLogs] = useState<MoodLog[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [supportContacts, setSupportContacts] = useState<SupportContact[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [showMoodPicker, setShowMoodPicker] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [showBreathing, setShowBreathing] = useState(false);
  const [showCrisisInfo, setShowCrisisInfo] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences>({
    voice: 'Kore',
    language: 'en',
    tone: 'empathetic',
    backstory: '',
    isSpeakingEnabled: true
  });

  const chatEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchData = async () => {
    try {
      const [moodRes, journalRes, chatRes, prefRes, supportRes, reminderRes] = await Promise.all([
        fetch('/api/mood/1'),
        fetch('/api/journal/1'),
        fetch('/api/chat/1'),
        fetch('/api/preferences/1'),
        fetch('/api/support/1'),
        fetch('/api/reminders/1')
      ]);
      
      if (moodRes.ok) setMoodLogs(await moodRes.json());
      if (journalRes.ok) setJournalEntries(await journalRes.json());
      if (chatRes.ok) setMessages(await chatRes.json());
      if (prefRes.ok) setPreferences(await prefRes.json());
      if (supportRes.ok) setSupportContacts(await supportRes.json());
      if (reminderRes.ok) setReminders(await reminderRes.json());
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleRequestVolunteer = async () => {
    try {
      await fetch('/api/volunteer-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: 1 })
      });
      alert("A Befrienders volunteer has been notified and will reach out to you soon.");
    } catch (error) {
      console.error('Error requesting volunteer:', error);
    }
  };

  const handleAddContact = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
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
        body: JSON.stringify({ user_id: 1, ...contact })
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
    const formData = new FormData(e.currentTarget);
    const reminder = {
      activity: formData.get('activity') as string,
      time: formData.get('time') as string,
    };

    try {
      await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: 1, ...reminder })
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

    if (isRecording) {
      setIsRecording(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = preferences.language === 'sw' ? 'sw-KE' : 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsRecording(true);
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
      setIsRecording(false);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsRecording(false);
    };

    recognition.start();
  };

  const savePreferences = async (newPrefs: UserPreferences) => {
    try {
      await fetch('/api/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: 1, preferences: newPrefs })
      });
    } catch (error) {
      console.error('Error saving preferences:', error);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;

    const userMessage: ChatMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      // Save user message
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: 1, ...userMessage })
      });

      const responseText = await getChatResponse(input, messages, preferences, moodLogs, journalEntries);
      const aiMessage: ChatMessage = { role: 'model', content: responseText || 'I am here for you.' };
      
      setMessages(prev => [...prev, aiMessage]);
      
      // Save AI message
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: 1, ...aiMessage })
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
    try {
      await fetch('/api/mood', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: 1, mood, note: '' })
      });
      setShowMoodPicker(false);
      fetchData();
    } catch (error) {
      console.error('Error logging mood:', error);
    }
  };

  const handleJournalSubmit = async (content: string) => {
    try {
      const sentiment = await analyzeMood(content);
      await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: 1, content, sentiment })
      });
      fetchData();
    } catch (error) {
      console.error('Error saving journal:', error);
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto bg-white shadow-2xl overflow-hidden">
      {/* Header */}
      <header className="p-6 border-b border-brand-cream flex justify-between items-center bg-brand-cream/30">
        <div>
          <h1 className="text-2xl font-serif font-medium text-brand-olive">Ex-Mind</h1>
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
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] p-4 rounded-2xl ${
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
                      isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-white/20 text-white hover:bg-white/30'
                    }`}
                  >
                    {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
                  </button>
                </div>
                <div className="mt-2 text-[10px] opacity-50 text-right">Press Ctrl+Enter to save</div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-widest opacity-40">Past Entries</h3>
                {journalEntries.map((entry) => (
                  <div key={entry.id} className="p-4 bg-white border border-brand-cream rounded-2xl shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] text-brand-olive/60">{new Date(entry.timestamp).toLocaleDateString()}</span>
                      <span className="px-2 py-0.5 bg-brand-cream rounded-full text-[10px] font-medium text-brand-olive uppercase tracking-tighter">
                        {entry.sentiment}
                      </span>
                    </div>
                    <p className="text-sm text-brand-ink/80 line-clamp-2">{entry.content}</p>
                  </div>
                ))}
              </div>
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
                  { title: 'Mindfulness', desc: '5-minute breathing exercise', color: 'bg-blue-50 text-blue-700', action: () => setShowBreathing(true) },
                  { title: 'CBT Reframing', desc: 'Challenge negative thoughts', color: 'bg-emerald-50 text-emerald-700' },
                  { title: 'Crisis Plan', desc: 'Your emergency safety steps', color: 'bg-red-50 text-red-700' },
                  { title: 'Request Help', desc: 'Ask a Befrienders volunteer to call', color: 'bg-orange-50 text-orange-700', action: handleRequestVolunteer },
                  { title: 'Gratitude', desc: 'List 3 things you are thankful for', color: 'bg-amber-50 text-amber-700' },
                  { title: 'Body Scan', desc: 'Connect with your physical self', color: 'bg-purple-50 text-purple-700' },
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
              className="space-y-8 pb-10"
            >
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Users size={16} className="text-brand-olive" />
                  <h3 className="text-xs font-semibold uppercase tracking-widest opacity-40">Circle of Support</h3>
                </div>
                <div className="space-y-3 mb-4">
                  {supportContacts.map(contact => (
                    <div key={contact.id} className="p-3 bg-white border border-brand-cream rounded-xl flex justify-between items-center shadow-sm">
                      <div>
                        <p className="text-sm font-medium">{contact.name}</p>
                        <p className="text-[10px] opacity-60">{contact.relation} • {contact.phone}</p>
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
                  <button type="submit" className="col-span-2 p-2 bg-brand-olive text-white text-xs rounded-lg font-medium flex items-center justify-center gap-2">
                    <Plus size={14} /> Add Contact
                  </button>
                </form>
              </section>

              <section>
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

              <section>
                <h3 className="text-xs font-semibold uppercase tracking-widest opacity-40 mb-4">AI Voice Persona</h3>
                <div className="grid grid-cols-2 gap-3">
                  {['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'].map((v) => (
                    <button 
                      key={v}
                      onClick={() => {
                        const newPrefs = { ...preferences, voice: v as any };
                        setPreferences(newPrefs);
                        savePreferences(newPrefs);
                      }}
                      className={`p-3 rounded-xl text-sm border transition-all ${
                        preferences.voice === v 
                          ? 'bg-brand-olive text-white border-brand-olive' 
                          : 'bg-white text-brand-ink border-brand-cream hover:border-brand-olive/30'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="text-xs font-semibold uppercase tracking-widest opacity-40 mb-4">AI Tone</h3>
                <div className="grid grid-cols-2 gap-3">
                  {['empathetic', 'professional', 'cheerful', 'calm', 'direct'].map((t) => (
                    <button 
                      key={t}
                      onClick={() => {
                        const newPrefs = { ...preferences, tone: t as any };
                        setPreferences(newPrefs);
                        savePreferences(newPrefs);
                      }}
                      className={`p-3 rounded-xl text-sm border transition-all capitalize ${
                        preferences.tone === t 
                          ? 'bg-brand-olive text-white border-brand-olive' 
                          : 'bg-white text-brand-ink border-brand-cream hover:border-brand-olive/30'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="text-xs font-semibold uppercase tracking-widest opacity-40 mb-4">AI Backstory</h3>
                <p className="text-[10px] opacity-60 mb-2 italic">Give your companion a history or specific context to influence its responses.</p>
                <textarea 
                  value={preferences.backstory || ''}
                  onChange={(e) => {
                    const newPrefs = { ...preferences, backstory: e.target.value };
                    setPreferences(newPrefs);
                  }}
                  onBlur={() => savePreferences(preferences)}
                  className="w-full bg-brand-cream/30 border border-brand-cream rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-olive/20 min-h-[100px] placeholder:text-brand-ink/30"
                  placeholder="e.g. You are a retired therapist who loves nature..."
                />
              </section>

              <section>
                <h3 className="text-xs font-semibold uppercase tracking-widest opacity-40 mb-4">Language</h3>
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
      </main>

      {/* Input Area (Chat Only) */}
      {activeTab === 'chat' && (
        <div className="p-4 border-t border-brand-cream bg-white relative">
          <AnimatePresence>
            {isRecording && (
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
                isRecording 
                  ? 'bg-red-500 text-white shadow-lg shadow-red-200' 
                  : 'bg-brand-cream text-brand-olive hover:bg-brand-cream/80'
              }`}
            >
              {isRecording && (
                <motion.div 
                  layoutId="recording-ring"
                  className="absolute inset-0 rounded-full border-2 border-red-500"
                  initial={{ scale: 1, opacity: 0.5 }}
                  animate={{ scale: 1.5, opacity: 0 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                />
              )}
              {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
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
          { id: 'toolbox', icon: Heart, label: 'Toolbox' },
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
        {showBreathing && <BreathingExercise onClose={() => setShowBreathing(false)} />}
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
