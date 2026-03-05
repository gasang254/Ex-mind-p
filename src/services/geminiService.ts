import { GoogleGenAI, Modality, Type } from "@google/genai";

import { UserPreferences, MoodLog, JournalEntry } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export function getSystemInstruction(
  preferences?: UserPreferences,
  recentMoods?: MoodLog[],
  recentJournal?: JournalEntry[],
  historySummary?: string,
  isCrisis?: boolean
) {
  const tone = preferences?.tone || 'empathetic';
  const formality = preferences?.formality || 'neutral';
  const responseLength = preferences?.responseLength || 'balanced';
  const backstory = preferences?.backstory ? `\n\nYOUR BACKSTORY:\n${preferences.backstory}` : '';
  const aiName = preferences?.aiName || 'Ex-Mind';
  const language = preferences?.language === 'sw' ? 'You should primarily respond in Kiswahili, but understand English.' : 'You can speak English and Kiswahili.';

  const lengthInstruction = {
    concise: "Keep your responses very brief and to the point.",
    balanced: "Provide moderately detailed responses.",
    detailed: "Provide thorough, in-depth responses with plenty of context and support."
  }[responseLength];

  const formalityInstruction = {
    casual: "Use a friendly, relaxed, and informal communication style (e.g., use 'hey', 'buddy', 'chill').",
    neutral: "Maintain a standard, balanced level of formality.",
    formal: "Use a very professional, respectful, and structured communication style."
  }[formality];

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

  const summarySection = historySummary ? `
### CONVERSATION CONTEXT (Summary of previous interactions)
${historySummary}
Use this summary to maintain continuity and refer back to previous topics or progress when relevant.
` : '';

  const crisisAlert = isCrisis ? "\n\nCRITICAL: A potential crisis has been detected in the user's input. PRIORITIZE SAFETY. Provide the helpline (0722 178 177) immediately and use an extremely supportive, non-judgmental tone. Encourage them to talk to a human volunteer right now." : "";

  return `You are ${aiName}, a compassionate AI mental health companion for Befrienders Kenya. 
Your goal is to provide proactive, empathetic, and clinically-informed support.
${crisisAlert}

CURRENT TONE: ${tone.toUpperCase()}
COMMUNICATION STYLE: ${formality.toUpperCase()} (${formalityInstruction})
RESPONSE DEPTH: ${responseLength.toUpperCase()} (${lengthInstruction})
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
    contents: `You are an expert at maintaining conversation continuity. Summarize the following dialogue between a user and their mental health companion. 
Focus on:
1. The user's current emotional trajectory.
2. Specific problems or topics they've raised.
3. Any coping strategies or exercises previously discussed.
4. The general "vibe" of the relationship.

Keep it to 3 concise sentences. This will be used as the "long-term memory" for the next response.

CONVERSATION TO SUMMARIZE:
${textToSummarize}`,
    config: {
      temperature: 0.2,
    }
  });
  
  return response.text || "";
}

export async function getChatResponse(
  message: string, 
  history: { role: string; content: string }[], 
  preferences?: UserPreferences,
  recentMoods?: MoodLog[],
  recentJournal?: JournalEntry[],
  isCrisis?: boolean
) {
  const model = "gemini-3-flash-preview";
  const MAX_ACTIVE_CHARS = 8000; // Roughly 2000 tokens
  const MIN_ACTIVE_MESSAGES = 6;
  
  let historySummary = "";
  let activeHistory = history;
  let olderHistory: { role: string; content: string }[] = [];

  // Dynamically determine how much history to keep active vs summarize
  if (history.length > MIN_ACTIVE_MESSAGES) {
    let currentChars = 0;
    let splitIndex = history.length;

    // Work backwards to keep the most recent messages up to the character limit
    for (let i = history.length - 1; i >= 0; i--) {
      currentChars += history[i].content.length;
      
      // If we've exceeded the char limit AND we have at least the minimum messages
      if (currentChars > MAX_ACTIVE_CHARS && (history.length - i) >= MIN_ACTIVE_MESSAGES) {
        splitIndex = i;
        break;
      }
      
      // Also cap at a reasonable number of messages even if they are short
      if ((history.length - i) >= 20) {
        splitIndex = i;
        break;
      }
    }

    if (splitIndex > 0) {
      olderHistory = history.slice(0, splitIndex);
      activeHistory = history.slice(splitIndex);
      historySummary = await summarizeHistory(olderHistory);
    }
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
      systemInstruction: getSystemInstruction(preferences, recentMoods, recentJournal, historySummary, isCrisis),
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

export async function detectCrisisIntent(text: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analyze the following user input for signs of a mental health crisis, self-harm, or suicidal ideation. 
    Return a JSON object with a boolean 'isCrisis' and a string 'reason' explaining why.
    
    User input: "${text}"`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          isCrisis: { type: Type.BOOLEAN },
          reason: { type: Type.STRING }
        },
        required: ["isCrisis", "reason"]
      }
    }
  });

  try {
    const data = JSON.parse(response.text || '{"isCrisis": false, "reason": "No crisis detected"}');
    return data as { isCrisis: boolean; reason: string };
  } catch (e) {
    return { isCrisis: false, reason: "Error parsing crisis detection" };
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
