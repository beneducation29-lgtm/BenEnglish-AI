import { GoogleGenAI, Type } from '@google/genai';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Method not allowed. Use POST.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      success: false,
      error: 'AI conversation summary is not configured. Add GEMINI_API_KEY to the Vercel project environment and redeploy.',
    });
  }

  const history = Array.isArray(req.body?.history) ? req.body.history.slice(-24) : [];
  const transcript = history
    .filter((turn: any) => turn && typeof turn.content === 'string')
    .map((turn: any) => `${turn.role === 'user' ? 'Learner' : 'AI Tutor'}: ${turn.content.trim().slice(0, 3000)}`)
    .join('\n')
    .slice(0, 18000);

  if (!transcript.trim()) {
    return res.status(400).json({ success: false, error: 'There is not enough conversation history to generate a report.' });
  }

  const persona = String(req.body?.persona || 'friendly_teacher').slice(0, 80);
  const mode = String(req.body?.mode || 'everyday').slice(0, 80);
  const track = req.body?.track === 'professional' ? 'professional' : 'high_school';
  const userLevel = String(req.body?.userLevel || 'B1').slice(0, 8);

  const systemInstruction = `
You are the Head Academic Director at BenEnglish AI.
Analyze this English conversation for a learner (${track}, CEFR ${userLevel}) with tutor ${persona} in mode ${mode}.

Transcript (the only learner evidence supplied):
${transcript}

Evidence rules:
1. Summarize only topics and communication behaviors visible in this transcript.
2. List vocabulary only when the learner actually used it. Never invent words and claim the learner used them.
3. Correct only clear grammar or word-choice errors in learner turns. Do not label natural conversational variants as errors.
4. This endpoint receives text only, not microphone audio. Return an empty pronunciationObservations array. Do not infer accent, sounds, stress, rhythm, voice quality or speaking speed.
5. List strengths only when supported by the learner's actual turns. If evidence is limited, say so.
6. Give practical next steps without inventing scores or achievements.
7. Recommend one relevant BenEnglish AI practice area.
8. Create one short, personalized speaking exercise based on the learner's actual mistakes or gaps in this transcript. Include a prompt, 2–4 target phrases, a concise model answer, and one clear focus. If evidence is limited, make the exercise simple and do not invent a weakness.
9. Keep the report concise and actionable. Do not generate numerical scores unless explicitly supported by a validated scoring rubric.
Return strict JSON matching the schema.
`;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: 'Generate a concise, evidence-grounded conversation diagnostic report.',
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            newVocabulary: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  word: { type: Type.STRING },
                  ipa: { type: Type.STRING },
                  definition: { type: Type.STRING },
                  meaningVi: { type: Type.STRING },
                },
                required: ['word', 'ipa', 'definition', 'meaningVi'],
              },
            },
            grammarMistakes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  userSaid: { type: Type.STRING },
                  correction: { type: Type.STRING },
                  rule: { type: Type.STRING },
                  vietnameseExplanation: { type: Type.STRING },
                },
                required: ['userSaid', 'correction', 'rule', 'vietnameseExplanation'],
              },
            },
            pronunciationObservations: { type: Type.ARRAY, items: { type: Type.STRING } },
            strongPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
            improvementSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
            recommendedPractice: {
              type: Type.OBJECT,
              properties: {
                lab: { type: Type.STRING },
                title: { type: Type.STRING },
                targetFocus: { type: Type.STRING },
              },
              required: ['lab', 'title', 'targetFocus'],
            },
            personalizedExercise: {
              type: Type.OBJECT,
              properties: {
                prompt: { type: Type.STRING },
                targetPhrases: { type: Type.ARRAY, items: { type: Type.STRING } },
                modelAnswer: { type: Type.STRING },
                focus: { type: Type.STRING },
              },
              required: ['prompt', 'targetPhrases', 'modelAnswer', 'focus'],
            },
          },
          required: [
            'summary',
            'newVocabulary',
            'grammarMistakes',
            'pronunciationObservations',
            'strongPoints',
            'improvementSuggestions',
            'recommendedPractice',
            'personalizedExercise',
          ],
        },
      },
    });
    const parsed = JSON.parse(response.text || '{}');
    return res.status(200).json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('BenEnglish conversation summary failed:', error?.message || error);
    return res.status(502).json({
      success: false,
      error: error?.message || 'The conversation report could not be generated right now.',
    });
  }
}
