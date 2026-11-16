import { GoogleGenAI, Type } from '@google/genai';

function clampScore(value: unknown): number {
  const score = Number(value);
  return Number.isFinite(score) ? Math.max(0, Math.min(5, Math.round(score))) : 0;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Method not allowed. Use POST.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ success: false, error: 'Writing feedback is not configured. Add GEMINI_API_KEY to the Vercel project environment.' });
  }

  const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim().slice(0, 1800) : '';
  const learnerResponse = typeof req.body?.learnerResponse === 'string' ? req.body.learnerResponse.trim().slice(0, 8000) : '';
  const sourceText = typeof req.body?.sourceText === 'string' ? req.body.sourceText.trim().slice(0, 5000) : '';
  const track = req.body?.track === 'professional' ? 'professional' : 'high_school';
  const grade = typeof req.body?.grade === 'string' ? req.body.grade.slice(0, 40) : 'Not specified';
  const level = typeof req.body?.level === 'string' && /^(A1|A2|B1|B2|C1|C2)$/.test(req.body.level) ? req.body.level : 'B1';

  if (!prompt || learnerResponse.length < 20) {
    return res.status(400).json({ success: false, error: 'Please submit a writing response of at least 20 characters.' });
  }

  const trackGuidance = track === 'high_school'
    ? `Assess a Vietnamese high-school learner (${grade}). Keep feedback age-appropriate and aligned with academic English. Do not introduce workplace expectations.`
    : 'Assess a working professional. Prioritise clarity, audience awareness, register, concise structure and practical workplace communication.';

  const systemInstruction = `
You are BenEnglish AI's evidence-based writing tutor.
Track: ${track}. Grade / role: ${grade}. Target CEFR: ${level}.
${trackGuidance}

You receive a task, optional source passage and the learner's exact submitted text.
EVIDENCE RULES:
- Assess only the submitted learner response. Never pretend a model answer is the learner's writing.
- The overall feedback must refer to at least one specific idea or exact phrase actually present in the response.
- Score task fulfilment, organisation/coherence, vocabulary and grammar from 0 to 5. These are formative scores, not official CEFR certification.
- Return at most 5 corrections. Every "original" must be an exact contiguous substring copied verbatim from the learner response. If no genuine error exists, return no corrections.
- Explain each correction briefly in Vietnamese and preserve the intended meaning.
- Give up to 3 actionable next steps matched to the learner's target CEFR.
- The improved sample answer is a separate learning model based on the learner's ideas, not a rewrite represented as their original work.
- Do not infer speaking, pronunciation or listening ability from writing.
- If the response does not provide enough evidence for a criterion, state that limitation rather than inventing evidence.
Return strict JSON only.
`;

  try {
    const ai = new GoogleGenAI({ apiKey, httpOptions: { timeout: 20000, retryOptions: { attempts: 1 } } });
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [{
        role: 'user',
        parts: [{ text: 'WRITING TASK:\n' + prompt + '\n\nSOURCE PASSAGE:\n' + (sourceText || 'Not supplied') + '\n\nLEARNER ACTUAL RESPONSE:\n' + learnerResponse }],
      }],
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        temperature: 0.25,
        maxOutputTokens: 1200,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallFeedback: { type: Type.STRING },
            taskFulfilment: { type: Type.INTEGER },
            organisation: { type: Type.INTEGER },
            vocabulary: { type: Type.INTEGER },
            grammar: { type: Type.INTEGER },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            corrections: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: {
              original: { type: Type.STRING }, improved: { type: Type.STRING }, explanationVi: { type: Type.STRING },
            }, required: ['original','improved','explanationVi'] } },
            nextSteps: { type: Type.ARRAY, items: { type: Type.STRING } },
            improvedSampleAnswer: { type: Type.STRING },
          },
          required: ['overallFeedback','taskFulfilment','organisation','vocabulary','grammar','strengths','corrections','nextSteps','improvedSampleAnswer'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    if (typeof parsed.overallFeedback !== 'string') throw new Error('The writing assessor returned an incomplete response.');
    const corrections = Array.isArray(parsed.corrections)
      ? parsed.corrections.filter((item: any) => item && typeof item.original === 'string' && item.original.length > 0 && learnerResponse.includes(item.original)).slice(0, 5)
      : [];
    return res.status(200).json({ success: true, data: {
      ...parsed,
      taskFulfilment: clampScore(parsed.taskFulfilment),
      organisation: clampScore(parsed.organisation),
      vocabulary: clampScore(parsed.vocabulary),
      grammar: clampScore(parsed.grammar),
      corrections,
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 4) : [],
      nextSteps: Array.isArray(parsed.nextSteps) ? parsed.nextSteps.slice(0, 3) : [],
    }});
  } catch (error: any) {
    console.error('BenEnglish writing assessment failed:', error?.message || error);
    return res.status(502).json({ success: false, error: error?.message || 'The writing assessment could not be generated right now.' });
  }
}
