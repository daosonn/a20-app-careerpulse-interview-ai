import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';

// ============================================================
// AI Provider Setup: Gemini (primary) → OpenAI (fallback)
// ============================================================

const getEnv = (key: string) => (import.meta as any).env?.[key] || (process as any).env?.[key] || '';

const geminiApiKey = getEnv('VITE_GEMINI_API_KEY');
const geminiClient = geminiApiKey ? new GoogleGenAI({ apiKey: geminiApiKey }) : null;

const openaiApiKey = getEnv('VITE_OPENAI_API_KEY');
const openaiClient = new OpenAI({
  apiKey: openaiApiKey || 'missing-key',
  dangerouslyAllowBrowser: true,
});

// ============================================================
// Core: Unified AI call with automatic fallback
// ============================================================

async function callGemini(prompt: string, temperature: number): Promise<string> {
  if (!geminiClient) throw new Error('[Gemini] Client not initialized. Check your VITE_GEMINI_API_KEY.');
  const response = await geminiClient.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      temperature,
      responseMimeType: 'application/json',
    },
  });
  const text = response.text;
  if (!text) throw new Error('[Gemini] Empty response');
  return text;
}

async function callGeminiText(prompt: string, temperature: number): Promise<string> {
  if (!geminiClient) throw new Error('[Gemini] Client not initialized. Check your VITE_GEMINI_API_KEY.');
  const response = await geminiClient.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: { temperature },
  });
  const text = response.text;
  if (!text) throw new Error('[Gemini] Empty response');
  return text;
}

async function callOpenAI(prompt: string, temperature: number): Promise<string> {
  const response = await openaiClient.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You are an AI assistant. Always respond with valid JSON only.' },
      { role: 'user', content: prompt },
    ],
    temperature,
    response_format: { type: 'json_object' },
  });
  const text = response.choices[0]?.message?.content;
  if (!text) throw new Error('[OpenAI] Empty response');
  return text;
}

async function callOpenAIText(prompt: string, temperature: number): Promise<string> {
  const response = await openaiClient.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'Respond naturally. Do not wrap in JSON.' },
      { role: 'user', content: prompt },
    ],
    temperature,
  });
  const text = response.choices[0]?.message?.content;
  if (!text) throw new Error('[OpenAI] Empty response');
  return text;
}

async function callAIWithFallback(prompt: string, temperature: number): Promise<string> {
  try {
    console.log('[AI] Calling Gemini...');
    const result = await callGemini(prompt, temperature);
    console.log('[AI] ✅ Gemini responded successfully');
    return result;
  } catch (geminiError) {
    console.warn('[AI] ⚠️ Gemini failed, falling back to OpenAI:', geminiError);
  }
  try {
    console.log('[AI] Calling OpenAI (fallback)...');
    const result = await callOpenAI(prompt, temperature);
    console.log('[AI] ✅ OpenAI responded successfully');
    return result;
  } catch (openaiError) {
    console.error('[AI] ❌ OpenAI also failed:', openaiError);
    throw new Error('Cả Gemini và OpenAI đều không phản hồi. Vui lòng kiểm tra API keys.');
  }
}

async function callAITextFallback(prompt: string, temperature: number): Promise<string> {
  try {
    return await callGeminiText(prompt, temperature);
  } catch {
    return await callOpenAIText(prompt, temperature);
  }
}

// ============================================================
// Audio Transcription (OpenAI Whisper)
// ============================================================

export async function transcribeAudio(audioBlob: Blob, language: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', audioBlob, 'recording.webm');
  formData.append('model', 'whisper-1');
  formData.append('language', language === 'vi' ? 'vi' : 'en');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getEnv('VITE_OPENAI_API_KEY')}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`Whisper transcription failed (${response.status}): ${errText}`);
  }

  const result = await response.json();
  return result.text || '';
}

// ============================================================
// Public Interfaces
// ============================================================

export interface ChatMessage {
  role: 'model' | 'user';
  text: string;
}

export interface InterviewTurnResult {
  phase: number;
  phaseName: string;
  evaluation: {
    scores: {
      relevance: number;
      structure: number;
      specificity: number;
      clarity: number;
      confidence: number;
    };
    starAnalysis: {
      situation: string;
      task: string;
      action: string;
      result: string;
    };
    feedback: string;
    betterVersion: string;
  } | null;
  nextQuestion: string;
  shouldEndInterview?: boolean;
}

// ============================================================
// Interview Phase Definitions
// ============================================================

export const INTERVIEW_PHASES = [
  { id: 1, vi: 'Khởi động', en: 'Warm-up', icon: '👋' },
  { id: 2, vi: 'Giới thiệu bản thân', en: 'Self Introduction', icon: '🗣️' },
  { id: 3, vi: 'Tìm hiểu CV', en: 'CV Deep-dive', icon: '📄' },
  { id: 4, vi: 'Đánh giá năng lực', en: 'Job-fit Assessment', icon: '🎯' },
  { id: 5, vi: 'Động lực & Văn hóa', en: 'Motivation & Culture', icon: '💡' },
  { id: 6, vi: 'Ứng viên hỏi lại', en: 'Your Questions', icon: '❓' },
  { id: 7, vi: 'Kết thúc', en: 'Closing', icon: '🤝' },
];

// ============================================================
// generatePredictedQuestions
// ============================================================

export async function generatePredictedQuestions(
  cvText: string,
  jobDescription: string,
  interviewType: string,
  language: string
): Promise<string[]> {
  const prompt = `
You are an expert technical recruiter.
Generate 5 predicted interview questions based on the CV and JD.

Context:
- Interview Type: ${interviewType}
- Language: ${language === 'vi' ? 'Vietnamese' : 'English'}

Job Description:
${jobDescription}

Candidate CV:
${cvText}

Output ONLY a valid JSON array of 5 question strings.
`;

  const text = await callAIWithFallback(prompt, 0.7);
  const parsed = JSON.parse(text);
  if (Array.isArray(parsed)) return parsed;
  if (parsed.questions && Array.isArray(parsed.questions)) return parsed.questions;
  const arrayValue = Object.values(parsed).find(v => Array.isArray(v));
  if (arrayValue) return arrayValue as string[];
  throw new Error('Invalid response format');
}

// ============================================================
// generateOpeningMessage — Phase 1 warm-up
// ============================================================

export async function generateOpeningMessage(
  cvText: string,
  jobDescription: string,
  language: string,
  isStressTest: boolean
): Promise<string> {
  const langStr = language === 'vi' ? 'Vietnamese' : 'English';
  const prompt = `
You are a professional HR interviewer starting a mock interview.
Language: ${langStr}

${isStressTest
    ? 'You are strict but professional. Keep warm-up brief.'
    : 'You are warm, friendly, and professional.'}

Candidate CV (for reference):
${cvText}

Job Description:
${jobDescription}

Generate the OPENING MESSAGE for Phase 1 (Warm-up):
1. Greet the candidate warmly.
2. Ask ONE standard HR small-talk question to ease nerves. It MUST BE strictly professional and common (e.g., "Em đến có thuận tiện không?", "Hôm nay em tìm công ty có dễ không?", "Đường đi hôm nay thế nào?", "Em chờ lâu không?"). DO NOT ask personal questions like hobbies or weekend plans.
3. Briefly explain the interview structure ("We'll chat for about X minutes, starting with your background, then we'll discuss your experience, and at the end you can ask me anything")
4. Keep it short and make them feel comfortable.

${language === 'vi'
    ? 'Write entirely in Vietnamese. Use natural tone with anh/chị and em/bạn.'
    : 'Write entirely in English.'}

Return ONLY the opening message as plain text (NOT JSON). 4-6 sentences, conversational.
`;

  const text = await callAITextFallback(prompt, 0.8);
  return text.replace(/^["']|["']$/g, '').trim();
}

// ============================================================
// generateSessionSummary
// ============================================================

export async function generateSessionSummary(
  cvText: string,
  jobDescription: string,
  chatHistory: { role: 'user' | 'model'; text: string }[],
  language: string
) {
  const historyText = chatHistory
    .map(t => `${t.role === 'model' ? 'Interviewer' : 'Candidate'}: ${t.text}`)
    .join('\n\n');

  const prompt = `
    You are an expert Career Coach. Review the interview transcript and provide a comprehensive summary.
    
    CV: ${cvText}
    JD: ${jobDescription}
    
    Transcript:
    ${historyText}
    
    Provide:
    1. Professional summary of overall performance (strengths + areas for improvement)
    2. 3-5 actionable key takeaways
    
    Respond in ${language === 'vi' ? 'Vietnamese' : 'English'}.
    Return JSON: { "summary": "...", "keyTakeaways": ["...", "..."] }
  `;

  const text = await callAIWithFallback(prompt, 0.7);
  return JSON.parse(text) as { summary: string; keyTakeaways: string[] };
}

// ============================================================
// processInterviewTurn — 7-Phase Professional Interview
// ============================================================

const INTERVIEW_METHODOLOGY = `
=== PROFESSIONAL INTERVIEW METHODOLOGY (7 Phases) ===

Phase 1: WARM-UP (1-2 turns)
- Casual, friendly standard HR conversation (e.g. "Did you find the office easily?", "How was your commute?"). DO NOT ask personal questions like hobbies or weekend plans. No evaluation needed.
- Goal: make candidate comfortable, explain interview structure.
- After 1-2 exchanges, naturally transition to Phase 2.

Phase 2: SELF-INTRODUCTION (1-2 turns)
- Ask: "Tell me about yourself and your journey"
- Light evaluation (communication, structure, confidence). Provide feedback but no STAR.
- After their introduction, transition to Phase 3.

Phase 3: CV DEEP-DIVE (3-5 turns)
- Pick the most relevant/impressive CV points and dig deep.
- Ask about specific projects, roles, challenges, metrics, learnings.
- Full STAR evaluation with detailed feedback.
- Verify: Did they really do this? How deep? Is it transferable?

Phase 4: JOB-FIT ASSESSMENT (3-5 turns)
- Competency: "Which parts would you pick up fastest?"
- Behavioral: "If deadline is tight but requirements unclear..."
- Situational: "If you disagree with a colleague's approach..."
- Full STAR evaluation.

Phase 5: MOTIVATION & CULTURE (1-2 turns)
- "Why this position?", "What environment helps you thrive?"
- Moderate evaluation. Check genuine interest and alignment.

Phase 6: CANDIDATE QUESTIONS (1-2 turns)
- Invite warmly: "Do you have questions about the role, team, or company?"
- Answer their questions naturally. No evaluation.

Phase 7: CLOSING (1 turn)
- Thank sincerely, mention next steps, end positively.
- Set shouldEndInterview: true. No evaluation.

=== PRINCIPLES ===
- CRITICAL: You MUST remember and continuously reference the entire conversation history. Do NOT ask for information the candidate has already provided.
- Adapt pace to candidate. If answers are shallow, probe deeper before advancing.
- Make phase transitions feel natural, not abrupt.
- Don't repeat questions the candidate already answered.
- In stress test mode: be more challenging in Phases 3-4 but still professional.
`;

export async function processInterviewTurn(
  cvText: string,
  jobDescription: string,
  interviewType: string,
  language: string,
  isStressTest: boolean,
  chatHistory: ChatMessage[],
  latestQuestion: string,
  latestAnswer: string,
  currentPhase: number = 1
): Promise<InterviewTurnResult> {
  const langStr = language === 'vi' ? 'Vietnamese' : 'English';
  const tone = isStressTest
    ? 'You are strict and demanding but professional. Challenge weak answers.'
    : 'You are warm, professional, and encouraging.';

  const needsEval = currentPhase >= 2 && currentPhase <= 5;

  const evalBlock = needsEval ? `"evaluation": {
      "scores": { "relevance": <1-5>, "structure": <1-5>, "specificity": <1-5>, "clarity": <1-5>, "confidence": <1-5> },
      "starAnalysis": { "situation": "<${langStr}>", "task": "<${langStr}>", "action": "<${langStr}>", "result": "<${langStr}>" },
      "feedback": "<detailed feedback in ${langStr}, use **bold** for key points, numbered lists for suggestions>",
      "betterVersion": "<improved version of their answer in ${langStr}>"
    }` : `"evaluation": null`;

  const prompt = `
${tone}
You are conducting a professional mock interview.

${INTERVIEW_METHODOLOGY}

=== CURRENT STATE ===
Current Phase: ${currentPhase} (${INTERVIEW_PHASES[currentPhase - 1]?.en})
Interview Type: ${interviewType}
Language: ${langStr}
Turn: ${Math.floor(chatHistory.length / 2) + 1}

Job Description: ${jobDescription}
Candidate CV: ${cvText}

=== CONVERSATION ===
${chatHistory.map(m => `${m.role === 'model' ? 'Interviewer' : 'Candidate'}: ${m.text}`).join('\n')}

Latest Q: "${latestQuestion}"
Latest A: "${latestAnswer}"

=== INSTRUCTIONS ===
1. Evaluate the answer (if applicable for this phase).
2. Decide: stay in Phase ${currentPhase} or advance to Phase ${Math.min(currentPhase + 1, 7)}.
3. Generate the appropriate next question/statement.
4. If Phase 7 closing is done, set shouldEndInterview: true.

ALL content MUST be in ${langStr}. ${language === 'vi' ? 'Toàn bộ nội dung phải bằng tiếng Việt.' : ''}

Output valid JSON only:
{
  "phase": <number 1-7>,
  "phaseName": "<phase name in ${langStr}>",
  ${evalBlock},
  "nextQuestion": "<in ${langStr}>",
  "shouldEndInterview": <boolean>
}`;

  const text = await callAIWithFallback(prompt, isStressTest ? 0.4 : 0.7);
  const result = JSON.parse(text);

  if (!result.phase) result.phase = currentPhase;
  if (!result.phaseName) {
    const p = INTERVIEW_PHASES[(result.phase || currentPhase) - 1];
    result.phaseName = language === 'vi' ? p?.vi : p?.en;
  }

  return result as InterviewTurnResult;
}
