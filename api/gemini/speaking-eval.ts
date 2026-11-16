import { GoogleGenAI, Type } from '@google/genai';

const MODELS = ['gemini-3.5-flash-lite', 'gemini-3.8-flash'] as const;
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

function isTransient(error: unknown): boolean {
  return /429|503|504|unavailable|resource_exhausted|high demand|overload|timeout|timed out|deadline/i
    .test(String((error as any)?.message || error));
}

function clampRubric(value: unknown): number {
  const score = Number(value);
  return Number.isFinite(score) ? Math.max(1, Math.min(5, Math.round(score))) : 1;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Method not allowed. Use POST.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ success: false, error: 'Speaking assessment is not configured. Add GEMINI_API_KEY to the Vercel project environment.' });
  }

  const userTranscript = typeof req.body?.userTranscript === 'string'
    ? req.body.userTranscript.trim().slice(0, 5000)
    : '';
  const topic = typeof req.body?.topic === 'string' ? req.body.topic.trim().slice(0, 500) : '';
  const track = req.body?.track === 'professional' ? 'professional' : 'high_school';
  const level = LEVELS.includes(req.body?.level) ? req.body.level : 'A2';
  const durationSeconds = Number.isFinite(Number(req.body?.durationSeconds))
    ? Math.max(0, Math.min(600, Math.round(Number(req.body.durationSeconds))))
    : 0;

  if (userTranscript.split(/\\s+/).filter(Boolean).length < 8) {
    return res.status(400).json({ success: false, error: 'Please provide at least 8 recognised words before requesting a speaking assessment.' });
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: { timeout: 20000, retryOptions: { attempts: 1 } },
  });
  const request = {
    contents: [{
      role: 'user',
      parts: [{
        text: [
          'LEARNER TRACK: ' + track,
          'TARGET CEFR: ' + level,
          'SPEAKING TASK: ' + (topic || 'Describe an experience and explain your ideas.'),
          'RECORDED RESPONSE DURATION IN SECONDS: ' + (durationSeconds || 'not available'),
          'AUTOMATIC SPEECH TRANSCRIPT:',
          userTranscript,
        ].join('\\n'),
      }],
    }],
    config: {
      systemInstruction: `You are BenEnglish AI's careful, supportive CEFR-aligned speaking assessor.
Assess the learner's spoken response from the transcript and task evidence only.
Score these four dimensions from 1 to 5: lexicalResource, grammaticalAccuracy, fluencyCoherence, relevanceContent.
Fluency/coherence may consider transcript length, discourse markers, repetition and the supplied duration, but do not claim to measure pauses, speech rate, accent, pronunciation, stress or intonation from text.
Do not fabricate an acoustic pronunciation score. State clearly in areasToImprove that pronunciation requires direct audio analysis when no acoustic evidence is supplied.
Estimate CEFR conservatively from this short speaking sample; do not award C1/C2 from a short or weak sample. This is formative feedback, not an official certificate.
Every grammarCorrections.original must be an exact contiguous substring of the transcript. Return no correction if no genuine error is evidenced.
Offer useful vocabulary upgrades that fit the learner's track and level. improvedSampleAnswer must be a separate model, not represented as the learner's original words.
Return valid JSON only.`,
      responseMimeType: 'application/json',
      temperature: 0.2,
      maxOutputTokens: 1100,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          overallBandEstimate: { type: Type.NUMBER },
          cefrEstimate: { type: Type.STRING },
          rubricScores: {
            type: Type.OBJECT,
            properties: {
              lexicalResource: { type: Type.INTEGER },
              grammaticalAccuracy: { type: Type.INTEGER },
              fluencyCoherence: { type: Type.INTEGER },
              relevanceContent: { type: Type.INTEGER },
            },
            required: ['lexicalResource', 'grammaticalAccuracy', 'fluencyCoherence', 'relevanceContent'],
          },
          strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
          areasToImprove: { type: Type.ARRAY, items: { type: Type.STRING } },
          grammarCorrections: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                original: { type: Type.STRING },
                correction: { type: Type.STRING },
                explanation: { type: Type.STRING },
                vietnameseNote: { type: Type.STRING },
              },
              required: ['original', 'correction', 'explanation', 'vietnameseNote'],
            },
          },
          upgradedVocabulary: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                basicWord: { type: Type.STRING },
                advancedAlternative: { type: Type.STRING },
                example: { type: Type.STRING },
              },
              required: ['basicWord', 'advancedAlternative', 'example'],
            },
          },
          improvedSampleAnswer: { type: Type.STRING },
        },
        required: ['overallBandEstimate', 'cefrEstimate', 'rubricScores', 'strengths', 'areasToImprove', 'grammarCorrections', 'upgradedVocabulary', 'improvedSampleAnswer'],
      },
    },
  };

  try {
    let result: any = null;
    let lastError: unknown;
    for (const [index, model] of MODELS.entries()) {
      try {
        const response = await ai.models.generateContent({ model, ...request });
        result = JSON.parse(response.text || '{}');
        if (!result.rubricScores || !LEVELS.includes(result.cefrEstimate)) {
          throw new Error('The speaking assessor returned an incomplete result.');
        }
        result.overallBandEstimate = Math.max(1, Math.min(9, Number(result.overallBandEstimate) || 1));
        for (const key of ['lexicalResource', 'grammaticalAccuracy', 'fluencyCoherence', 'relevanceContent']) {
          result.rubricScores[key] = clampRubric(result.rubricScores[key]);
        }
        result.grammarCorrections = Array.isArray(result.grammarCorrections)
          ? result.grammarCorrections.filter((item: any) =>
              item && typeof item.original === 'string' && item.original.length > 0 && userTranscript.includes(item.original)
            ).slice(0, 5)
          : [];
        result.strengths = Array.isArray(result.strengths) ? result.strengths.slice(0, 4) : [];
        result.areasToImprove = Array.isArray(result.areasToImprove) ? result.areasToImprove.slice(0, 4) : [];
        result.upgradedVocabulary = Array.isArray(result.upgradedVocabulary) ? result.upgradedVocabulary.slice(0, 4) : [];
        if (userTranscript.split(/\\s+/).length < 35 && ['C1', 'C2'].includes(result.cefrEstimate)) {
          result.cefrEstimate = 'B2';
        }
        if (!result.areasToImprove.some((item: string) => /pronunciation|audio|phát âm/i.test(item))) {
          result.areasToImprove.push('Pronunciation, stress and intonation need direct audio analysis; this transcript-only score does not assess them.');
        }
        break;
      } catch (error) {
        lastError = error;
        if (index === 0 && (isTransient(error) || /json|unexpected token|incomplete/i.test(String((error as any)?.message || error)))) continue;
        throw error;
      }
    }
    if (!result) throw lastError || new Error('Could not assess the speaking response.');
    return res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    const retryable = isTransient(error);
    console.error('BenEnglish speaking assessment failed:', error?.message || error);
    return res.status(retryable ? 503 : 502).json({
      success: false,
      error: retryable ? 'The speaking assessor is temporarily busy. Your transcript is preserved; please try again.' : error?.message || 'The speaking assessment could not be generated.',
    });
  }
}
