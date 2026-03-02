import { GoogleGenAI, Modality, Type } from "@google/genai";

import { UserPreferences, MoodLog, JournalEntry } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export function getSystemInstruction(
  preferences?: UserPreferences,
  recentMoods?: MoodLog[],
  recentJournal?: JournalEntry[],
  historySummary?: string
) {
  const tone = preferences?.tone || 'empathetic';
  const backstory = preferences?.backstory ? `\n\nYOUR BACKSTORY:\n${preferences.backstory}` : '';
  const language = preferences?.language === 'sw' ? 'You should primarily respond in Kiswahili, but understand English.' : 'You can speak English and Kiswahili.';

  // Create a summary of recent mood and journal activity for context
  let userContext = '';
  if (recentMoods && recentMoods.length > 0) {
    const avgMood = recentMoods.slice(0, 5).reduce((acc, m) => acc + m.mood, 0) / Math.min(recentMoods.length, 5);
    userContext += `\nRECENT MOOD: The user's average mood lately has been ${avgMood.toFixed(1)}/5.`;
  }
  if (recentJournal && recentJournal.length > 0) {
    const recentSentiments = recentJournal.slice(0, 3).map(j => j.sentiment).join(', ');
    userContext += `\nRECENT JOURNAL SENTIMENTS: ${recentSentiments}.`;
  }

  const summarySection = historySummary ? `\n\nCONVERSATION SUMMARY (Older messages):\n${historySummary}` : '';

  return `You are Ex-Mind, a compassionate AI mental health companion for Befrienders Kenya. 
Your goal is to provide proactive, empathetic, and clinically-informed support.

CURRENT TONE: ${tone.toUpperCase()}
${language}${backstory}${userContext}${summarySection}

CORE PRINCIPLES:
1. EMPATHY: Always validate the user's feelings. Use a ${tone} tone.
2. CRISIS DETECTION: If a user expresses thoughts of self-harm or suicide, immediately provide the Befrienders Kenya helpline (0722 178 177) and encourage them to reach out to a human volunteer.
3. NON-DIRECTIVE: Support the user in finding their own solutions, rather than giving direct advice, unless it's a safety issue.
4. CULTURAL SENSITIVITY: Be aware of the Kenyan context.
5. PERSISTENT MEMORY: Use the provided chat history to maintain context.

TOOLS:
- You can suggest mindfulness exercises, CBT-based reframing, or journaling.
- You are NOT a doctor. Do not provide medical diagnoses or medication advice.

If the user seems to be in a high-risk crisis, your response MUST include a clear escalation path to human support.`;
}

async function summarizeHistory(history: { role: string; content: string }[]) {
  if (history.length < 5) return "";
  
  const textToSummarize = history.map(h => `${h.role}: ${h.content}`).join('\n');
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Summarize the following conversation history between a user and a mental health companion in 2-3 sentences, focusing on the user's emotional state, key topics discussed, and any progress made. This summary will be used to provide context for future messages:\n\n${textToSummarize}`,
    config: {
      temperature: 0.3,
    }
  });
  
  return response.text || "";
}

export async function getChatResponse(
  message: string, 
  history: { role: string; content: string }[], 
  preferences?: UserPreferences,
  recentMoods?: MoodLog[],
  recentJournal?: JournalEntry[]
) {
  const model = "gemini-3-flash-preview";
  
  let historySummary = "";
  let activeHistory = history;

  // If history is long, summarize the older parts to maintain context without hitting token limits
  // and to help the model focus on the most recent flow.
  if (history.length > 15) {
    const olderHistory = history.slice(0, -10);
    activeHistory = history.slice(-10);
    historySummary = await summarizeHistory(olderHistory);
  }

  const formattedHistory = activeHistory.map(h => ({
    role: h.role === 'user' ? 'user' : 'model',
    parts: [{ text: h.content }]
  }));

  const response = await ai.models.generateContent({
    model,
    contents: [
      ...formattedHistory,
      { role: 'user', parts: [{ text: message }] }
    ],
    config: {
      systemInstruction: getSystemInstruction(preferences, recentMoods, recentJournal, historySummary),
      temperature: 0.7,
    }
  });

  return response.text;
}

export async function analyzeMood(journalContent: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analyze the sentiment of this journal entry and return a single word representing the primary emotion (e.g., Happy, Sad, Anxious, Calm, Angry): "${journalContent}"`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          sentiment: { type: Type.STRING }
        },
        required: ["sentiment"]
      }
    }
  });
  
  try {
    const data = JSON.parse(response.text || '{"sentiment": "Neutral"}');
    return data.sentiment;
  } catch (e) {
    return "Neutral";
  }
}

export async function generateSpeech(text: string, voiceName: 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr' = 'Kore') {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName },
        },
      },
    },
  });

  return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
}
