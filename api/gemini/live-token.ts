import { GoogleGenAI } from '@google/genai';

const LIVE_MODEL = 'gemini-3.8-live';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Method not allowed. Use POST.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const firebaseApiKey = process.env.VITE_FIREBASE_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ success: false, error: 'Gemini Live is not configured. Add GEMINI_API_KEY in Vercel and redeploy.' });
  }
  if (!firebaseApiKey) {
    return res.status(503).json({ success: false, error: 'Firebase authentication is not configured for Live sessions.' });
  }

  const authorization = String(req.headers?.authorization || '');
  const idToken = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!idToken) return res.status(401).json({ success: false, error: 'Sign in with Google before starting a Live conversation.' });

  try {
    const identityResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(firebaseApiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
    if (!identityResponse.ok) {
      return res.status(401).json({ success: false, error: 'Your sign-in session is invalid or expired. Please sign in again.' });
    }
    const identity = await identityResponse.json();
    if (!Array.isArray(identity.users) || !identity.users[0]?.localId) {
      return res.status(401).json({ success: false, error: 'Could not verify your signed-in account.' });
    }

    const persona = String(req.body?.persona || 'friendly_teacher').slice(0, 40);
    const mode = String(req.body?.mode || 'everyday').slice(0, 40);
    const level = String(req.body?.level || 'B1').slice(0, 8);
    const track = req.body?.track === 'professional' ? 'professional' : 'high_school';
    const personaGuide: Record<string, string> = {
      friendly_teacher: 'You are Teacher Emma, a warm, patient and encouraging English tutor.',
      strict_teacher: 'You are Mr. Harrison, a precise British English instructor who gives constructive feedback.',
      native_partner: 'You are Alex from California, a relaxed native English conversation partner.',
      business_coach: 'You are Victoria Sloan, an executive communication coach.',
      ielts_coach: 'You are David, an IELTS Speaking practice coach. Never claim to be an official examiner.',
    };
    const modeGuide: Record<string, string> = {
      everyday: 'Practice natural everyday English.',
      school: 'Practice high-school English and academic communication.',
      business: 'Practice professional workplace English.',
      free: 'Have an open conversation led by the learner.',
      ielts: 'Simulate IELTS Speaking Parts 1, 2 and 3 without inventing official scores.',
      interview: 'Practice job interviews using relevant behavioral and situational questions.',
    };

    const systemInstruction = [
      'You are the real-time voice tutor inside BenEnglish AI.',
      personaGuide[persona] || personaGuide.friendly_teacher,
      modeGuide[mode] || modeGuide.everyday,
      `Learner track: ${track}. Target CEFR level: ${level}.`,
      'Speak in clear, natural English appropriate to the learner level. Keep most turns concise (one to three sentences), but answer fully when asked.',
      'React directly to what the learner just said and remember context within this live session. Do not restart with generic greetings.',
      'Ask at most one relevant follow-up question and do not force a question after every response.',
      'Correct only clear, useful grammar or word-choice errors. Give a brief natural alternative, then continue the conversation without turning every reply into a lecture.',
      'Never claim to assess pronunciation from text alone. Do not invent IELTS band scores or achievements.',
      'If the learner asks for Vietnamese help, explain briefly in Vietnamese, then return to English practice.',
    ].join(' ');

    const client = new GoogleGenAI({ apiKey });
    const now = Date.now();
    const token = await client.authTokens.create({
      config: {
        uses: 1,
        expireTime: new Date(now + 10 * 60 * 1000).toISOString(),
        newSessionExpireTime: new Date(now + 60 * 1000).toISOString(),
        liveConnectConstraints: {
          model: LIVE_MODEL,
          config: {
            responseModalities: ['AUDIO'],
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            systemInstruction: { parts: [{ text: systemInstruction }] },
          },
        },
        httpOptions: { apiVersion: 'v1alpha' },
      },
    });

    if (!token.name) throw new Error('Gemini did not return a Live session token.');
    return res.status(200).json({
      success: true,
      token: token.name,
      model: LIVE_MODEL,
      expiresAt: token.expireTime || new Date(now + 10 * 60 * 1000).toISOString(),
    });
  } catch (error: any) {
    console.error('Gemini Live token provisioning failed:', error?.message || error);
    return res.status(502).json({ success: false, error: error?.message || 'Could not start a Gemini Live session.' });
  }
}
