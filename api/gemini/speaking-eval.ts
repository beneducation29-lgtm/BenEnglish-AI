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
  const audioBase64 = typeof req.body?.audioBase64 === 'string' ? req.body.audioBase64 : '';
  const audioMimeType = req.body?.audioMimeType === 'audio/wav' ? 'audio/wav' : '';
  if (audioBase64 && (!audioMimeType || audioBase64.length > 2_100_000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(audioBase64))) {
    return res.status(400).json({ success: false, error: 'The audio sample is invalid or too large. Record a shorter answer and try again.' });
  }

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
      parts: [
        {
          text: [
            'LEARNER TRACK: ' + track,
            'TARGET CEFR: ' + level,
            'SPEAKING TASK: ' + (topic || 'Describe an experience and explain your ideas.'),
            'RECORDED RESPONSE DURATION IN SECONDS: ' + (durationSeconds || 'not available'),
            'AUTOMATIC SPEECH TRANSCRIPT:',
            userTranscript,
            audioBase64 ? 'AUDIO EVIDENCE IS ATTACHED. Assess only audible evidence and report uncertainty when the recording is unclear.' : 'NO AUDIO EVIDENCE IS ATTACHED. Do not provide an acoustic pronunciation score.',
          ].join('\\n'),
        },
        ...(audioBase64 ? [{ inlineData: { mimeType: audioMimeType, data: audioBase64 } }] : []),
      ],
    }],
    config: {
      systemInstruction: `You are BenEnglish AI's careful, supportive CEFR-aligned speaking assessor.
Assess the learner's spoken response from the transcript and task evidence.
Score these four dimensions from 1 to 5: lexicalResource, grammaticalAccuracy, fluencyCoherence, relevanceContent.
When an audio recording is attached, listen to the actual audio and additionally score pronunciation from 1 to 5. Assess intelligibility, segmental accuracy (consonants/vowels/final sounds) and stress/intonation only where audible. Give a few specific heard-to-suggested examples only when genuinely supported by the recording; do not infer accent identity or penalise a legitimate accent. If the audio is unclear, say so and lower confidence rather than guessing.
When no audio is attached, do not fabricate an acoustic pronunciation score and state that pronunciation needs direct audio analysis.
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
              pronunciation: { type: Type.INTEGER },
            },
            required: ['lexicalResource', 'grammaticalAccuracy', 'fluencyCoherence', 'relevanceContent'],
          },
          audioEvidenceAvailable: { type: Type.BOOLEAN },
          pronunciationAssessment: {
            type: Type.OBJECT,
            properties: {
              intelligibility: { type: Type.INTEGER },
              segmentalAccuracy: { type: Type.INTEGER },
              stressAndIntonation: { type: Type.INTEGER },
              feedback: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    heard: { type: Type.STRING },
                    suggested: { type: Type.STRING },
                    explanation: { type: Type.STRING },
                  },
                  required: ['heard', 'suggested', 'explanation'],
                },
              },
            },
            required: ['intelligibility', 'segmentalAccuracy', 'stressAndIntonation', 'feedback'],
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
        result.audioEvidenceAvailable = Boolean(audioBase64);
        if (audioBase64 && result.rubricScores.pronunciation !== undefined && result.pronunciationAssessment) {
          result.rubricScores.pronunciation = clampRubric(result.rubricScores.pronunciation);
          for (const key of ['intelligibility', 'segmentalAccuracy', 'stressAndIntonation']) {
            result.pronunciationAssessment[key] = clampRubric(result.pronunciationAssessment[key]);
          }
          result.pronunciationAssessment.feedback = Array.isArray(result.pronunciationAssessment.feedback)
            ? result.pronunciationAssessment.feedback.filter((item: any) => item && typeof item.heard === 'string' && typeof item.suggested === 'string' && typeof item.explanation === 'string').slice(0, 4)
            : [];
        } else {
          delete result.rubricScores.pronunciation;
          delete result.pronunciationAssessment;
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
        if (!audioBase64 && !result.areasToImprove.some((item: string) => /pronunciation|audio|phát âm/i.test(item))) {
          result.areasToImprove.push('Pronunciation, stress and intonation need direct audio analysis; this transcript-only score does not assess them.');
        }
        if (audioBase64 && !result.pronunciationAssessment) {
          result.areasToImprove.push('The recording did not provide enough clear acoustic evidence for a reliable pronunciation score. Please record again in a quiet place.');
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
