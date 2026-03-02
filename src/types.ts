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
  backstory?: string;
}
