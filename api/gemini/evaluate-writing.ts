import { GoogleGenAI, Type } from '@google/genai';

const PRIMARY_MODEL = 'gemini-3.5-flash-lite';
const FALLBACK_MODEL = 'gemini-3.8-flash';

function isRetryable(error: unknown): boolean {
  const message = String((error as any)?.message || error || '').toLowerCase();
  return /503|429|unavailable|resource_exhausted|high demand|overload|timeout|aborterror|json|unexpected token|empty response/.test(message);
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
  const level = typeof req.body?.level === 'string' ? req.body.level.slice(0, 8) : 'B1';

  if (!prompt || learnerResponse.length < 12) {
    return res.status(400).json({ success: false, error: 'Please submit a writing response of at least 12 characters.' });
  }

  const trackGuidance = track === 'high_school'
    ? `Assess a Vietnamese high-school learner (${grade}). Keep feedback age-appropriate and aligned with school and academic English. Do not introduce corporate or workplace expectations.`
    : 'Assess a working professional. Prioritize clarity, audience awareness, register, concise structure and practical workplace communication.';

  const systemInstruction = `
You are BenEnglish AI's evidence-based writing tutor.
Learner track: ${track}. Grade / occupation: ${grade}. Target CEFR: ${level}.
${trackGuidance}

You will receive the exact writing task, optional source passage and the learner's actual submitted response.
ASSESS ONLY THE LEARNER RESPONSE. Never invent sentences, mistakes, strengths, examples or evidence that are not present.
1. Respond to what the learner actually wrote and whether it answers the task.
2. Give a concise overall comment that cites at least one specific idea or phrase from their response.
3. Score four dimensions from 0 to 5: task fulfilment, organisation/coherence, vocabulary, grammar. Scores are formative indicators, not official CEFR certification.
4. Identify up to 5 meaningful corrections. Each original phrase MUST be copied verbatim from the learner response; if no clear error exists, return an empty list.
5. Explain corrections briefly in Vietnamese and offer a natural improved version without changing the learner's intended meaning.
6. Give two actionable next steps matched to the demonstrated level.
7. Provide an improved sample answer only as a learning model, clearly preserving the learner's original ideas. Do not imply it is the learner's own writing.
8. Do not infer pronunciation, speaking fluency or listening ability from written text.
9. Be encouraging but honest. If the response is too short to assess a dimension, say so and use a conservative score.
Return strict JSON only.
`;

  const request = {
    contents: [{
      role: 'user',
      parts: [{ text: `WRITING TASK:\n${prompt}\n\nSOURCE PASSAGE (may be empty):\n${sourceText || 'Not supplied'}\n\nLEARNER'S ACTUAL RESPONSE:\n${learnerResponse}` }],
    }],
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      temperature: 0.25,
      maxOutputTokens: 1100,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          overallFeedback: { type: Type.STRING },
          taskFulfilment: { type: Type.INTEGER },
          organisation: { type: Type.INTEGER },
          vocabulary: { type: Type.INTEGER },
          grammar: { type: Type.INTEGER },
          strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
          corrections: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                original: { type: Type.STRING },
                improved: { type: Type.STRING },
                explanationVi: { type: Type.STRING },
              },
              required: ['original', 'improved', 'explanationVi'],
            },
          },
          nextSteps: { type: Type.ARRAY, items: { type: Type.STRING } },
          improvedSampleAnswer: { type: Type.STRING },
        },
        required: ['overallFeedback', 'taskFulfilment', 'organisation', 'vocabulary', 'grammar', 'strengths', 'corrections', 'nextSteps', 'improvedSampleAnswer'],
      },
    },
  };

  try {
    const ai = new GoogleGenAI({ apiKey, httpOptions: { timeout: 20000, retryOptions: { attempts: 1 } } });
    let parsed: any = null;
    let lastError: unknown;
    for (const [index, model] of [PRIMARY_MODEL, FALLBACK_MODEL].entries()) {
      try {
        const response = await ai.models.generateContent({ model, ...request });
        const raw = response.text || '';
        if (!raw.trim()) throw new Error('The AI returned an empty assessment.');
        parsed = JSON.parse(raw);
        break;
      } catch (error) {
        lastError = error;
        if (index === 0 && isRetryable(error)) continue;
        throw error;
      }
    }
    if (!parsed) throw lastError || new Error('Could not assess this writing response.');
    const clamp = (value: unknown) => Math.max(0, Math.min(5, Number.isFinite(Number(value)) ? Math.round(Number(value)) : 0));
    const corrections = Array.isArray(parsed.corrections)
      ? parsed.corrections.filter((item: any) => item && typeof item.original === 'string' && learnerResponse.includes(item.original)).slice(0, 5)
      : [];
    return res.status(200).json({
      success: true,
      data: {
        ...parsed,
        taskFulfilment: clamp(parsed.taskFulfilment),
        organisation: clamp(parsed.organisation),
        vocabulary: clamp(parsed.vocabulary),
        grammar: clamp(parsed.grammar),
        corrections,
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 4) : [],
        nextSteps: Array.isArray(parsed.nextSteps) ? parsed.nextSteps.slice(0, 3) : [],
      },
    });
  } catch (error: any) {
    console.error('Writing assessment error:', error);
    return res.status(500).json({ success: false, error: error?.message || 'Failed to assess writing response.' });
  }
}
