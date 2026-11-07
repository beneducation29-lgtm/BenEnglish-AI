import { GoogleGenAI, Type } from '@google/genai';

const MODEL = 'gemini-3.8-flash';

function isFiniteScore(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
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
      error: 'AI Coach is not configured. Add GEMINI_API_KEY to the Vercel project environment and redeploy.',
    });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const track = body.track === 'professional' ? 'professional' : 'high_school';
  const gradeOrOccupation = String(body.gradeOrOccupation || 'General').slice(0, 120);
  const stats = body.performanceStats && typeof body.performanceStats === 'object'
    ? body.performanceStats
    : {};
  const weakAreas = Array.isArray(stats.weakAreas)
    ? stats.weakAreas.filter((item: unknown) => typeof item === 'string').slice(0, 12)
    : [];

  const evidence = [
    `Latest listening score: ${isFiniteScore(stats.listeningScore) ? `${stats.listeningScore}/100` : 'No recorded assessment yet'}`,
    `Latest speaking score: ${isFiniteScore(stats.speakingScore) ? `${stats.speakingScore}/100` : 'No recorded assessment yet'}`,
    `Latest pronunciation score: ${isFiniteScore(stats.pronunciationScore) ? `${stats.pronunciationScore}/100` : 'No recorded assessment yet'}`,
    `Verified weak areas: ${weakAreas.length ? JSON.stringify(weakAreas) : 'None identified from recorded results yet'}`,
  ].join('\n');

  const systemInstruction = `
You are the Head AI English Coach at BenEnglish AI.
Learner track: ${track} (${gradeOrOccupation}).
Learning cycle: LEARN → LISTEN → UNDERSTAND → SPEAK → RECEIVE FEEDBACK → CORRECT → REPEAT → MASTER.

Verified learner evidence:
${evidence}

Create a practical adaptive daily action plan. Never invent scores, weaknesses, achievements or improvements. If a skill has no evidence, recommend a baseline practice and explicitly say there is not enough data to diagnose it. Use exactly three balanced steps, with realistic minute estimates that add up to targetMinutes (20–30). recommendedLab must be one of: listening, speaking, conversation, roleplay, pronunciation. Greet the learner warmly and keep all coaching specific, concise and actionable.
`;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: 'Generate a personalized daily English learning plan based only on the verified evidence provided.',
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        temperature: 0.55,
        maxOutputTokens: 900,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            coachGreeting: { type: Type.STRING },
            diagnosticSummary: { type: Type.STRING },
            dailyPriority: { type: Type.STRING },
            targetMinutes: { type: Type.INTEGER },
            learningCycleSteps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  phase: { type: Type.STRING },
                  title: { type: Type.STRING },
                  action: { type: Type.STRING },
                  estimatedMinutes: { type: Type.INTEGER },
                  recommendedLab: { type: Type.STRING },
                },
                required: ['phase', 'title', 'action', 'estimatedMinutes', 'recommendedLab'],
              },
            },
            coachMotivationalQuote: { type: Type.STRING },
          },
          required: ['coachGreeting', 'diagnosticSummary', 'dailyPriority', 'targetMinutes', 'learningCycleSteps'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    if (!Array.isArray(parsed.learningCycleSteps) || parsed.learningCycleSteps.length !== 3) {
      throw new Error('The AI Coach returned an incomplete daily plan. Please try again.');
    }

    return res.status(200).json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('BenEnglish coach plan function failed:', error?.message || error);
    return res.status(502).json({
      success: false,
      error: error?.message || 'The AI Coach could not generate a plan right now. Please try again.',
    });
  }
}
