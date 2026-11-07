import { GoogleGenAI, Type } from '@google/genai';

const PRIMARY_MODEL = 'gemini-3.5-flash-lite';
const FALLBACK_MODEL = 'gemini-3.8-flash';

function isTransientModelError(error: unknown): boolean {
  const message = String((error as any)?.message || error || '').toLowerCase();
  return /503|429|unavailable|resource_exhausted|high demand|overload|timed? ?out|timeout|aborterror/.test(message);
}

const personaDescriptions: Record<string, string> = {
  friendly_teacher: 'You are Teacher Emma, a warm, patient and encouraging English tutor. Speak clearly and help learners feel comfortable.',
  strict_teacher: 'You are Mr. Harrison, a precise British English instructor. Give direct but constructive guidance on grammar and natural phrasing.',
  native_partner: 'You are Alex from California, a relaxed native English conversation partner. Use natural everyday expressions without overusing slang.',
  business_coach: 'You are Victoria Sloan, an executive communication coach focused on concise, diplomatic workplace English.',
  ielts_coach: 'You are David, an IELTS Speaking practice examiner. Follow the selected test structure, but never claim to be an official examiner.',
};

const modeDescriptions: Record<string, string> = {
  everyday: 'Casual everyday English: hobbies, routines, plans and culture.',
  school: 'High-school English: academic topics, school life, exams and extracurricular activities.',
  business: 'Professional English: meetings, project updates, clients and workplace communication.',
  free: 'Open conversation led by the learner. Follow their interests and do not force a lesson format.',
  ielts: 'IELTS Speaking practice with suitable Part 1, Part 2 and Part 3 progression.',
  interview: 'Job interview practice with relevant behavioral and situational questions.',
};

function normalizeHistory(input: unknown): Array<{ role: 'user' | 'model'; parts: { text: string }[] }> {
  if (!Array.isArray(input)) return [];
  const turns: Array<{ role: 'user' | 'model'; parts: { text: string }[] }> = [];
  for (const item of input.slice(-12)) {
    if (!item || typeof item.content !== 'string') continue;
    const content = item.content.trim().slice(0, 3000);
    if (!content) continue;
    const role = item.role === 'user' ? 'user' : item.role === 'assistant' || item.role === 'model' ? 'model' : null;
    if (!role || (turns.length === 0 && role !== 'user')) continue;
    if (turns.length && turns[turns.length - 1].role === role) continue;
    turns.push({ role, parts: [{ text: content }] });
  }
  // Gemini chat contents must alternate roles. The new learner message is appended separately.
  if (turns[turns.length - 1]?.role === 'user') turns.pop();
  return turns.slice(-8);
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Method not allowed. Use POST.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      success: false,
      error: 'AI conversation is not configured. Add GEMINI_API_KEY to the Vercel project environment and redeploy.',
    });
  }

  const message = typeof req.body?.message === 'string' ? req.body.message.trim().slice(0, 3000) : '';
  if (!message) return res.status(400).json({ success: false, error: 'Please say or type a message before sending.' });

  const tutorPersona = String(req.body?.tutorPersona || 'friendly_teacher');
  const mode = String(req.body?.mode || 'everyday');
  const track = req.body?.track === 'professional' ? 'professional' : 'high_school';
  const userLevel = String(req.body?.userLevel || 'B1').slice(0, 8);
  const occupation = String(req.body?.occupation || 'Student').slice(0, 120);
  const history = normalizeHistory(req.body?.history);

  const systemInstruction = `
You are the interactive AI voice conversation partner for BenEnglish AI.
Persona: ${personaDescriptions[tutorPersona] || personaDescriptions.friendly_teacher}
Current mode: ${modeDescriptions[mode] || modeDescriptions.everyday}
Learner track: ${track === 'high_school' ? 'High-school student (Grades 10–12)' : `Working professional (${occupation})`}
Target CEFR level: ${userLevel}

Conversation requirements:
1. Respond directly to the meaning, question, emotion or specific detail in the learner's latest message. Do not give a generic greeting when the learner has shared something specific.
2. Use the supplied recent turns as context. Remember details already shared and never ask the learner to repeat them.
3. Optimize for voice conversation: usually 1–3 short sentences and 15–45 words. Answer the learner's point first; add detail only when asked.
4. Adapt vocabulary and sentence complexity to the target CEFR level. For A1–A2, use short, clear sentences; for B1–B2, use natural connected language; for C1–C2, use nuanced language.
5. Ask at most one relevant follow-up question. Do not force a question at the end of every reply; sometimes react, answer, explain or share a brief example.
6. Continue the selected mode while following the learner's lead. In IELTS and interview modes, keep the appropriate progression and avoid revealing model answers before the learner tries.
7. Give one concise coaching correction only when a clear, useful grammar or word-choice error exists. Include a natural improved version and a brief Vietnamese explanation. If the learner's English is already natural, set hasMistake to false and leave correction text fields empty.
8. Never infer pronunciation, accent, stress or sound errors from a text transcript. The phonetic tip may teach a real word or phrase in your own reply, but must not claim the learner pronounced it incorrectly.
9. Suggested replies must be short, natural and specific to the current conversation. Return at most two.
10. Return strict JSON matching the response schema.
`;

  try {
    const ai = new GoogleGenAI({
      apiKey,
      // Bound each attempt. The SDK's default exponential retries can otherwise
      // keep a chat turn pending until the Vercel function itself times out.
      httpOptions: {
        timeout: 20000,
        retryOptions: { attempts: 1 },
      },
    });
    const generationRequest = {
      contents: [
        ...history,
        { role: 'user', parts: [{ text: message }] },
      ],
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        temperature: 0.65,
        maxOutputTokens: 480,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            replyText: { type: Type.STRING },
            phoneticTip: { type: Type.STRING },
            correction: {
              type: Type.OBJECT,
              properties: {
                hasMistake: { type: Type.BOOLEAN },
                original: { type: Type.STRING },
                improved: { type: Type.STRING },
                explanation: { type: Type.STRING },
                vietnameseTip: { type: Type.STRING },
              },
              required: ['hasMistake', 'original', 'improved', 'explanation', 'vietnameseTip'],
            },
            suggestedUserReplies: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ['replyText', 'phoneticTip', 'suggestedUserReplies'],
        },
      },
    };

    let response;
    try {
      response = await ai.models.generateContent({
        model: PRIMARY_MODEL,
        ...generationRequest,
      });
    } catch (primaryError) {
      if (!isTransientModelError(primaryError)) throw primaryError;
      console.warn('Conversation primary model unavailable; trying fallback model.');
      response = await ai.models.generateContent({
        model: FALLBACK_MODEL,
        ...generationRequest,
      });
    }

    const raw = response.text || '{}';
    const parsed = JSON.parse(raw);
    if (typeof parsed.replyText !== 'string' || !parsed.replyText.trim()) {
      throw new Error('The AI returned an empty reply. Please try again.');
    }
    return res.status(200).json({
      success: true,
      data: {
        replyText: parsed.replyText.trim(),
        phoneticTip: typeof parsed.phoneticTip === 'string' ? parsed.phoneticTip : '',
        correction: parsed.correction,
        suggestedUserReplies: Array.isArray(parsed.suggestedUserReplies) ? parsed.suggestedUserReplies.slice(0, 2) : [],
      },
    });
  } catch (error: any) {
    const transient = isTransientModelError(error);
    console.error('BenEnglish conversation function failed:', error?.message || error);
    return res.status(transient ? 503 : 502).json({
      success: false,
      error: transient
        ? 'The AI tutor is temporarily busy. Please try sending your message again in a moment.'
        : error?.message || 'The AI tutor could not respond right now. Please try again.',
      retryable: transient,
    });
  }
}
