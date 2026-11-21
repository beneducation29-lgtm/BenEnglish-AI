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
  const grade = String(req.body?.grade || (track === 'high_school' ? occupation : 'Not specified')).slice(0, 40);
  const history = normalizeHistory(req.body?.history);
  const rawMemory = req.body?.learnerMemory && typeof req.body.learnerMemory === 'object' ? req.body.learnerMemory : {};
  const safeList = (value: unknown, maxItems = 5) => Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string').slice(0, maxItems).map(item => item.slice(0, 220))
    : [];
  const skillLevels = rawMemory.skillLevels && typeof rawMemory.skillLevels === 'object'
    ? Object.entries(rawMemory.skillLevels).slice(0, 4).map(([skill, level]) => `${String(skill).slice(0, 30)}: ${String(level).slice(0, 8)}`).join('; ')
    : 'Not assessed yet';
  const memoryContext = [
    `Placement level: ${typeof rawMemory.placementLevel === 'string' ? rawMemory.placementLevel.slice(0, 8) : userLevel}`,
    `Skill levels: ${skillLevels}`,
    `Learning priorities: ${safeList(rawMemory.priorities).join('; ') || 'Not established yet'}`,
    `Recurring errors: ${safeList(rawMemory.recurringErrors).join('; ') || 'No verified recurring errors yet'}`,
    `Mastered learning items: ${safeList(rawMemory.masteredItems).join('; ') || 'No confirmed mastered items supplied'}`,
    `Recent practice evidence (not a formal CEFR score): ${safeList(rawMemory.recentPerformance, 8).join(' | ') || 'No recent assessment evidence supplied'}`,
    `Recent session notes: ${safeList(rawMemory.recentSessionNotes, 3).join(' | ') || 'No previous session notes available'}`,
  ].join('\\n');

  const trackTeachingContract = track === 'high_school'
    ? `HIGH SCHOOL TEACHING CONTRACT:
- Teach a Vietnamese learner in ${occupation} using age-appropriate topics from school life, Grades 10–12 curriculum themes, youth, science, environment, culture, community and future study.
- Keep the conversation supportive and classroom-safe. Use clear English at the learner's CEFR level; explain useful grammar, vocabulary and exam strategies briefly in Vietnamese when helpful.
- Ask questions that help the learner describe, compare, explain, give opinions and support ideas with examples. Build confidence before increasing complexity.
- Do not introduce office meetings, client negotiations, corporate strategy, management or job-performance scenarios unless the learner explicitly asks for them.
- When correcting, show the learner's original phrase, a natural school-appropriate correction and a concise Vietnamese reason. Prioritize recurring, high-value errors.`
    : `PROFESSIONAL TEACHING CONTRACT:
- Coach a working adult in the ${occupation} field using realistic workplace situations: meetings, project updates, clients, teamwork, stakeholder communication, interviews and role-specific terminology.
- Prioritize clarity, concise structure, diplomacy, tone, action ownership and accurate professional vocabulary. Explain why a phrase sounds too direct, vague, informal or overconfident when relevant.
- Use realistic business constraints, trade-offs and follow-up actions. Adapt terminology to the learner's occupation without pretending to know their employer or confidential work.
- Do not switch into school classes, homework, student clubs or national school exam tasks unless the learner explicitly asks for them.
- When correcting, offer a polished workplace-ready alternative and a brief Vietnamese explanation of tone, register or grammar.`;

  const systemInstruction = `
You are the interactive AI voice conversation partner for BenEnglish AI.
Persona: ${personaDescriptions[tutorPersona] || personaDescriptions.friendly_teacher}
Current mode: ${modeDescriptions[mode] || modeDescriptions.everyday}
Learner track: ${track === 'high_school' ? `High-school student (${grade})` : `Working professional (${occupation})`}
Learner grade: ${grade}
Target CEFR level: ${userLevel}
\n${trackTeachingContract}

Long-term learner memory (verified from saved assessments and prior sessions):
${memoryContext}

Use this memory to continue prior topics naturally, revisit recurring errors without embarrassing the learner, reinforce demonstrated strengths, and adapt the challenge. When recurring errors are supplied, proactively turn one high-priority error into a short retrieval or correction question at a natural moment; let the learner attempt it before showing the answer, rotate topics, and do not repeat the same review question in consecutive turns. Use mastered learning items to avoid spending too much time reteaching content the learner has already demonstrated; instead, revisit it in a new context when useful. Use recent practice evidence to adjust the amount of scaffolding and choose a suitable next challenge, but treat it as limited evidence rather than a formal CEFR score. If the learner is struggling, model one example and then ask a simpler retry question. Do not claim to remember details that are absent from this context. If placement has not been completed, treat the level as provisional.

Conversation requirements:
1. Respond directly to the meaning, question, emotion or specific detail in the learner's latest message. Do not give a generic greeting when the learner has shared something specific.
2. Use the supplied recent turns as context. Remember details already shared and never ask the learner to repeat them.
3. When current lesson notes are supplied, connect the conversation to that lesson's speaking objective and reuse one or two relevant vocabulary items naturally. Do not turn every reply into a lecture or force vocabulary into an unrelated personal question. If the learner changes topic, follow their lead and gently reconnect only when useful.
4. Optimize for voice conversation: usually 2–4 natural sentences and 25–65 words. Answer the learner's point first; add a useful example or explanation when it helps. Keep replies shorter for A1–A2 learners and expand when the learner asks for detail.
5. Adapt vocabulary and sentence complexity to the target CEFR level. For A1–A2, use short, clear sentences; for B1–B2, use natural connected language; for C1–C2, use nuanced language.
6. Ask at most one relevant follow-up question. Do not force a question at the end of every reply; sometimes react, answer, explain or share a brief example.
7. Continue the selected mode while following the learner's lead. In IELTS and interview modes, keep the appropriate progression and avoid revealing model answers before the learner tries.
8. Give one concise coaching correction only when a clear, useful grammar or word-choice error exists. Include a natural improved version and a brief Vietnamese explanation. If the learner's English is already natural, set hasMistake to false and leave correction text fields empty.
9. Never infer pronunciation, accent, stress or sound errors from a text transcript. The phonetic tip may teach a real word or phrase in your own reply, but must not claim the learner pronounced it incorrectly.
10. Suggested replies must be short, natural and specific to the current conversation. Return at most two.
11. Act as a responsive speaking coach, not a question generator: acknowledge one meaningful detail from the learner, then help them extend the idea with a useful reason, example, comparison or next step.
12. When the learner gives a very short or incomplete answer, scaffold gently with one concrete follow-up rather than supplying a full model answer immediately. When the learner gives a developed answer, respond to its substance and raise the challenge slightly.
13. If a recurring error appears in the current turn and is also present in saved memory, briefly correct it and give one short chance to reuse the corrected pattern in a fresh sentence. Do not stack multiple drills or interrupt the conversation with a worksheet.
14. Keep suggested replies as optional speaking starters, not the only valid answers. Make them specific to the next natural conversational move and appropriate to the learner's track and CEFR level.
15. Return strict JSON matching the response schema.
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
        maxOutputTokens: 650,
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

    let parsed: any = null;
    let lastError: unknown;
    for (const [index, model] of [PRIMARY_MODEL, FALLBACK_MODEL].entries()) {
      try {
        const response = await ai.models.generateContent({
          model,
          ...generationRequest,
        });
        const raw = response.text || '';
        if (!raw.trim()) throw new Error('The AI returned an empty reply. Please try again.');
        parsed = JSON.parse(raw);
        if (typeof parsed.replyText !== 'string' || !parsed.replyText.trim()) {
          throw new Error('The AI returned an empty reply. Please try again.');
        }
        break;
      } catch (error) {
        lastError = error;
        const retryable = isTransientModelError(error) ||
          /json|unexpected token|empty reply|unexpected end/i.test(String((error as any)?.message || error));
        if (index === 0 && retryable) {
          console.warn('Conversation primary model failed or returned an invalid response; trying fallback.');
          continue;
        }
        throw error;
      }
    }

    if (!parsed) throw lastError || new Error('The AI tutor could not generate a reply.');

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
