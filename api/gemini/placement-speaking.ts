import { GoogleGenAI, Type } from '@google/genai';

const PRIMARY_MODEL = 'gemini-3.5-flash-lite';
const FALLBACK_MODEL = 'gemini-3.8-flash';

function transient(error: unknown): boolean {
  return /503|429|unavailable|resource_exhausted|high demand|overload|timeout|timed out/i.test(String((error as any)?.message || error));
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Method not allowed. Use POST.' });
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(503).json({ success: false, error: 'Placement assessment is not configured.' });

  const transcript = typeof req.body?.transcript === 'string' ? req.body.transcript.trim().slice(0, 5000) : '';
  const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim().slice(0, 500) : '';
  if (transcript.split(/\s+/).filter(Boolean).length < 8) {
    return res.status(400).json({ success: false, error: 'Please provide a longer spoken response so the assessment is meaningful.' });
  }

  const ai = new GoogleGenAI({ apiKey, httpOptions: { timeout: 20000, retryOptions: { attempts: 1 } } });
  const request = {
    contents: `Speaking prompt: ${prompt}\nLearner response transcript: ${transcript}`,
    config: {
      systemInstruction: `You are a careful CEFR-aligned English speaking assessor. Assess only evidence visible in the transcript. Do not infer pronunciation, accent, intonation or listening ability from text. Score communicative effectiveness, grammatical control, vocabulary range and coherence from 0 to 100. Estimate a conservative CEFR level (A1, A2, B1, B2, C1, C2); short responses or limited evidence must not be rated above B2. Identify concrete strengths and 2-3 useful learning priorities. Give concise supportive feedback. Do not claim this is an official CEFR certificate. Return valid JSON only.`,
      responseMimeType: 'application/json',
      temperature: 0.2,
      maxOutputTokens: 700,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.INTEGER },
          cefrLevel: { type: Type.STRING },
          strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
          priorities: { type: Type.ARRAY, items: { type: Type.STRING } },
          feedback: { type: Type.STRING },
          rubric: {
            type: Type.OBJECT,
            properties: {
              grammar: { type: Type.INTEGER },
              vocabulary: { type: Type.INTEGER },
              coherence: { type: Type.INTEGER },
              taskFulfilment: { type: Type.INTEGER },
            },
            required: ['grammar', 'vocabulary', 'coherence', 'taskFulfilment'],
          },
        },
        required: ['score', 'cefrLevel', 'strengths', 'priorities', 'feedback', 'rubric'],
      },
    },
  };

  try {
    let result: any = null;
    let lastError: unknown;
    for (const [index, model] of [PRIMARY_MODEL, FALLBACK_MODEL].entries()) {
      try {
        const response = await ai.models.generateContent({ model, ...request });
        result = JSON.parse(response.text || '{}');
        const levels = ['A1','A2','B1','B2','C1','C2'];
        if (!Number.isFinite(result.score) || !levels.includes(result.cefrLevel) || typeof result.feedback !== 'string') {
          throw new Error('The speaking assessor returned an incomplete result.');
        }
        result.score = Math.max(0, Math.min(100, Math.round(result.score)));
        result.strengths = Array.isArray(result.strengths) ? result.strengths.slice(0,4) : [];
        result.priorities = Array.isArray(result.priorities) ? result.priorities.slice(0,4) : [];
        if (transcript.split(/\s+/).length < 35 && ['C1','C2'].includes(result.cefrLevel)) result.cefrLevel = 'B2';
        break;
      } catch (error) {
        lastError = error;
        if (index === 0 && (transient(error) || /json|unexpected token|incomplete/i.test(String((error as any)?.message || error)))) continue;
        throw error;
      }
    }
    if (!result) throw lastError || new Error('Could not assess the speaking response.');
    return res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    const retryable = transient(error);
    console.error('Placement speaking assessment failed:', error?.message || error);
    return res.status(retryable ? 503 : 502).json({ success: false, error: retryable ? 'The assessor is temporarily busy. Please try again.' : error?.message || 'Could not assess this response.' });
  }
}
