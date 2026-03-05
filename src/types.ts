export interface MoodLog {
  id: number;
  user_id: number;
  mood: number;
  note: string;
  timestamp: string;
}

export interface JournalEntry {
  id: number;
  user_id: number;
  content: string;
  sentiment: string;
  timestamp: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export interface UserPreferences {
  voice: 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr';
  language: 'en' | 'sw';
  tone: 'empathetic' | 'professional' | 'cheerful' | 'calm' | 'direct';
  formality: 'casual' | 'neutral' | 'formal';
  responseLength: 'concise' | 'balanced' | 'detailed';
  backstory?: string;
  aiName?: string;
  isSpeakingEnabled: boolean;
}

export interface SupportContact {
  id: number;
  user_id: number;
  name: string;
  relation: string;
  phone: string;
  email: string;
}

export interface Reminder {
  id: number;
  user_id: number;
  activity: string;
  time: string;
  completed: number;
}
