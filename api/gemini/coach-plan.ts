import { GoogleGenAI, Type } from '@google/genai';

const PRIMARY_MODEL = 'gemini-3.5-flash-lite';
const FALLBACK_MODEL = 'gemini-3.8-flash';
const ALLOWED_LABS = new Set(['listening', 'speaking', 'conversation', 'roleplay', 'pronunciation']);

function isFiniteScore(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isRetryableCoachError(error: unknown): boolean {
  const message = String((error as any)?.message || error || '').toLowerCase();
  return /503|429|unavailable|resource_exhausted|high demand|overload|timed? ?out|timeout|aborterror|invalid json|incomplete daily plan|does not add up/.test(message);
}

function parseCoachPlan(raw: string): any {
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('The AI Coach returned invalid JSON. Please retry.');
  }

  const steps = parsed?.learningCycleSteps;
  const targetMinutes = parsed?.targetMinutes;
  if (!Array.isArray(steps) || steps.length !== 3) {
    throw new Error('The AI Coach returned an incomplete daily plan. Please retry.');
  }
  if (!Number.isInteger(targetMinutes) || targetMinutes < 20 || targetMinutes > 30) {
    throw new Error('The AI Coach returned an invalid session duration. Please retry.');
  }

  const totalMinutes = steps.reduce((sum: number, step: any) => {
    const minutes = step?.estimatedMinutes;
    if (!Number.isInteger(minutes) || minutes < 1 || !ALLOWED_LABS.has(step?.recommendedLab)) {
      throw new Error('The AI Coach returned an invalid learning step. Please retry.');
    }
    return sum + minutes;
  }, 0);

  if (totalMinutes !== targetMinutes) {
    throw new Error('The AI Coach step durations do not add up to the session target. Please retry.');
  }

  return parsed;
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
  const placementLevel = typeof stats.placementLevel === 'string' ? stats.placementLevel.slice(0, 8) : 'Not assessed';
  const skillLevels = stats.skillLevels && typeof stats.skillLevels === 'object'
    ? Object.entries(stats.skillLevels).slice(0, 4).map(([skill, level]) => `${skill}: ${String(level).slice(0, 8)}`).join('; ')
    : 'No per-skill placement data';

  const evidence = [
    `Latest listening score: ${isFiniteScore(stats.listeningScore) ? `${stats.listeningScore}/100` : 'No recorded assessment yet'}`,
    `Latest speaking score: ${isFiniteScore(stats.speakingScore) ? `${stats.speakingScore}/100` : 'No recorded assessment yet'}`,
    `Latest pronunciation score: ${isFiniteScore(stats.pronunciationScore) ? `${stats.pronunciationScore}/100` : 'No recorded assessment yet'}`,
    `Placement level: ${placementLevel}`,
    `Placement skill levels: ${skillLevels}`,
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
    const ai = new GoogleGenAI({
      apiKey,
      // Prevent SDK retries from keeping a Vercel function open for minutes.
      httpOptions: { timeout: 20000, retryOptions: { attempts: 1 } },
    });

    const generationRequest = {
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
    };

    let parsed: any;
    let lastError: unknown;
    for (const [index, model] of [PRIMARY_MODEL, FALLBACK_MODEL].entries()) {
      try {
        const response = await ai.models.generateContent({ model, ...generationRequest });
        parsed = parseCoachPlan(response.text || '{}');
        break;
      } catch (error) {
        lastError = error;
        if (index === 0 && isRetryableCoachError(error)) {
          console.warn('AI Coach primary model failed validation or is temporarily unavailable; trying fallback.');
          continue;
        }
        throw error;
      }
    }

    if (!parsed) throw lastError || new Error('The AI Coach could not generate a plan.');
    return res.status(200).json({ success: true, data: parsed });
  } catch (error: any) {
    const retryable = isRetryableCoachError(error);
    console.error('BenEnglish coach plan function failed:', error?.message || error);
    return res.status(retryable ? 503 : 502).json({
      success: false,
      error: retryable
        ? 'The AI Coach is temporarily busy. Please try again in a moment.'
        : error?.message || 'The AI Coach could not generate a plan right now. Please try again.',
      retryable,
    });
  }
}
