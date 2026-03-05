export interface MoodLog {
  id: number;
  user_id: string | number;
  mood: number;
  note: string;
  timestamp: string;
}

export interface JournalEntry {
  id: number;
  user_id: string | number;
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
  user_id: string | number;
  name: string;
  relation: string;
  phone: string;
  email: string;
}

export interface Reminder {
  id: number;
  user_id: string | number;
  activity: string;
  time: string;
  completed: number;
}

export interface Session {
  id: number;
  user_id: string | number;
  volunteer_id?: number;
  type: 'chat' | 'voice' | 'video';
  status: 'scheduled' | 'completed' | 'cancelled';
  scheduled_at: string;
  notes?: string;
  timestamp: string;
}

export interface UserProfile {
  id: string | number;
  email: string;
  name: string;
  profile_picture?: string | null;
}
