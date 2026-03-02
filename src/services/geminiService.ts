import { GoogleGenAI, Modality, Type } from "@google/genai";

import { UserPreferences } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export function getSystemInstruction(preferences?: UserPreferences) {
  const tone = preferences?.tone || 'empathetic';
  const backstory = preferences?.backstory ? `\n\nYOUR BACKSTORY:\n${preferences.backstory}` : '';
  const language = preferences?.language === 'sw' ? 'You should primarily respond in Kiswahili, but understand English.' : 'You can speak English and Kiswahili.';

  return `You are Ex-Mind, a compassionate AI mental health companion for Befrienders Kenya. 
Your goal is to provide proactive, empathetic, and clinically-informed support.

CURRENT TONE: ${tone.toUpperCase()}
${language}${backstory}

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

export async function getChatResponse(message: string, history: { role: string; content: string }[], preferences?: UserPreferences) {
  const model = "gemini-3-flash-preview";
  
  const formattedHistory = history.map(h => ({
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
      systemInstruction: getSystemInstruction(preferences),
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
