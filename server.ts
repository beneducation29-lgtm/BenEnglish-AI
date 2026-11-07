import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json({ limit: '10mb' }));

// Server-side Gemini initialization
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// 1. AI English Conversation Room Endpoint
app.post('/api/gemini/conversation', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      message,
      history = [],
      tutorPersona = 'friendly_teacher',
      mode = 'everyday',
      track = 'high_school',
      userLevel = 'B1',
      occupation = 'Student',
    } = req.body;

    const personaDescriptions: Record<string, string> = {
      friendly_teacher:
        'You are Teacher Emma, an extraordinarily warm, supportive, and encouraging English tutor. You celebrate the student’s efforts, speak clearly, and simplify complex words while gently guiding them.',
      strict_teacher:
        'You are Mr. Harrison, a precise and rigorous British English instructor. You value grammatical precision, accurate syntax, and natural intonation. You give direct, constructive corrections.',
      native_partner:
        'You are Alex from San Francisco, a friendly American conversation partner. You talk like an authentic native peer—using natural idioms, conversational rhythm, real-world expressions, and relaxed tone.',
      business_coach:
        'You are Victoria Sloan, a seasoned executive communication coach. You specialize in concise, high-impact business terminology, negotiation phrasing, and professional workplace diplomacy.',
      ielts_coach:
        'You are David, an official IELTS Speaking examiner and preparation specialist. You assess and challenge the learner according to the 4 IELTS criteria: Fluency & Coherence, Lexical Resource, Grammatical Range & Accuracy, and Pronunciation.',
    };

    const modeDescriptions: Record<string, string> = {
      everyday: 'Casual everyday English conversations (hobbies, weekend plans, daily routine, culture).',
      school: 'High school academic and campus life, extracurricular activities, exams, teen social topics.',
      business: 'Professional workplace interactions, meetings, status updates, client emails, office etiquette.',
      free: 'Open free-flowing conversation on any topic the learner introduces.',
      ielts: 'IELTS Speaking test simulation with structured Part 1, Part 2, or Part 3 questions.',
      interview: 'Job interview practice with behavioral, situational, and competency questions.',
    };

    const systemInstruction = `
You are the interactive AI voice conversation partner for BenEnglish AI.
Persona: ${personaDescriptions[tutorPersona] || personaDescriptions.friendly_teacher}
Current Mode: ${modeDescriptions[mode] || modeDescriptions.everyday}
Learner Track: ${track === 'high_school' ? 'High School Student (Grades 10-12)' : `Working Professional (${occupation})`}
Current Target CEFR Level: ${userLevel}

CRITICAL PEDAGOGICAL RULES:
1. Be genuinely responsive to the learner's latest message. First understand its meaning and intent; answer the actual question or react to the specific detail they shared before moving the conversation forward.
2. Use the recent conversation as real context. Remember names, plans, preferences, facts and topics already mentioned in the supplied turns. Do not ask for information the learner has already provided.
3. Avoid repetitive conversation patterns. Do not begin every reply with the same praise, repeat the learner's words mechanically, or always finish with "What do you think?" / "How about you?". Vary acknowledgements, follow-up styles and sentence openings naturally.
4. Ask at most ONE relevant follow-up question when it helps the conversation continue. Sometimes respond with a natural comment, a short answer, a useful example, or a choice instead of forcing a question. In IELTS/interview modes, ask the next appropriate test/interview question and keep the session structure.
5. Keep the spoken reply concise and level-appropriate: usually 1-3 natural sentences and about 15-45 words. Use simpler language for A1-A2, progressively richer language for B1-B2, and nuanced natural expressions for C1-C2. Do not lecture or dominate the dialogue.
6. Make the learner speak more, but do not make every turn a quiz. Follow the learner's lead in Free Conversation; stay within the selected mode while adapting the next prompt to their answer.
7. ERROR CORRECTION: Correct only a clear, useful grammar or word-choice error. Do not interrupt the conversation for minor acceptable variants. Put the correction in the designated JSON fields and give a short, specific explanation with a Vietnamese tip. If there is no clear error, set hasMistake to false and leave correction text fields empty.
8. Phonetic tip must relate to a real word or phrase in your reply. Never invent a pronunciation problem in the learner's speech from text alone. If no useful tip exists, return an empty string.
9. Suggested replies must be short, natural alternatives that fit the immediate context and help the learner continue—not generic phrases repeated on every turn. Return no more than 2.
10. Return your output as STRICT JSON adhering to the schema.
`;

    const formattedContents = [
      ...history.map((turn: { role: string; content: string }) => ({
        role: turn.role === 'user' ? 'user' : 'model',
        parts: [{ text: turn.content }],
      })),
      {
        role: 'user',
        parts: [
          {
            text: message || "Hello! Let's start our conversation practice.",
          },
        ],
      },
    ];

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: formattedContents,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            replyText: {
              type: Type.STRING,
              description: 'A context-aware, natural, concise spoken reply. Ask one relevant follow-up only when it feels appropriate; do not force a question every turn.',
            },
            phoneticTip: {
              type: Type.STRING,
              description: 'A brief pronunciation or intonation tip for a key word you just used (e.g. "Notice the stress in /par-TI-cu-lar/").',
            },
            correction: {
              type: Type.OBJECT,
              properties: {
                hasMistake: { type: Type.BOOLEAN },
                original: { type: Type.STRING },
                improved: { type: Type.STRING },
                explanation: { type: Type.STRING },
                vietnameseTip: { type: Type.STRING },
              },
            },
            suggestedUserReplies: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Up to 2 brief, context-specific replies the learner could naturally say next; avoid generic or repetitive suggestions.',
            },
          },
          required: ['replyText', 'phoneticTip', 'suggestedUserReplies'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('Conversation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate conversation response',
    });
  }
});

// 1b. AI Conversation End-of-Session Diagnostic Summary Report
app.post('/api/gemini/conversation-summary', async (req: Request, res: Response): Promise<void> => {
  try {
    const { history = [], persona = 'friendly_teacher', mode = 'everyday', track = 'high_school', userLevel = 'B1' } = req.body;

    const transcriptExcerpt = history
      .map((t: { role: string; content: string }) => `${t.role === 'user' ? 'Learner' : 'AI Tutor'}: ${t.content}`)
      .join('\n');

    const systemInstruction = `
You are the Head Academic Director at BenEnglish AI.
Analyze this English conversation transcript for a learner (${track}, CEFR ${userLevel}) speaking with an AI tutor (${persona}, mode: ${mode}).

Transcript (the only learner evidence supplied):
${transcriptExcerpt}

Evidence and assessment rules:
1. Summarize only topics and communication behaviors visible in this transcript.
2. List vocabulary only when the words actually appear in the transcript. Return fewer than 3 items if the evidence contains fewer useful items; never invent words and claim the learner used them.
3. Correct only clear grammar or word-choice errors in the learner's own turns. Do not label natural conversational variants as errors.
4. This endpoint receives TEXT ONLY, not microphone audio. Return an empty pronunciationObservations array. Do not infer accent, sounds, stress, rhythm, fluency timing, or pronunciation quality from a transcript.
5. List strengths only when supported by the learner's actual turns. If there is too little evidence, say so in the summary.
6. Give practical next steps based on observed language, without inventing scores or achievements.
7. Recommend one relevant next practice in BenEnglish AI (listening, speaking, roleplay, or pronunciation). If pronunciation is recommended, explain that a separate audio-based assessment is needed.
Return strict JSON matching the schema.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: 'Generate conversation diagnostic summary report',
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
            pronunciationObservations: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            strongPoints: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            improvementSuggestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            recommendedPractice: {
              type: Type.OBJECT,
              properties: {
                lab: { type: Type.STRING, description: 'listening, speaking, roleplay, or pronunciation' },
                title: { type: Type.STRING },
                targetFocus: { type: Type.STRING },
              },
              required: ['lab', 'title', 'targetFocus'],
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
          ],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('Conversation summary error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate conversation summary',
    });
  }
});

// 2. Pronunciation Coach & Sound Analysis
app.post('/api/gemini/pronunciation-coach', async (req: Request, res: Response): Promise<void> => {
  try {
    const { targetText, spokenText, track = 'high_school' } = req.body;

    const systemInstruction = `
You are the Chief Pronunciation Coach at BenEnglish AI, specialized in diagnosing English phonetics for Vietnamese learners.
Vietnamese speakers commonly experience:
- Dropping final consonants (/s/, /z/, /t/, /d/, /ks/, /tʃ/, /dʒ/).
- Confusing /θ/ and /s/ or /t/ (think -> tink/sink).
- Confusing /ʃ/ and /s/ (she -> see).
- Confusing /iː/ (seat) and /ɪ/ (sit), /æ/ (bad) and /e/ (bed).
- Flat syllable-timed intonation instead of English stress-timed rhythm.
- Consonant cluster simplification ("street" -> "teet").

TASK:
Analyze the target phrase: "${targetText}" against what was transcribed from the user's speech: "${spokenText}".
Evaluate accurately without inventing fake 100% scores. If the spoken text matches the target text well, reward it appropriately (85-98) while still giving fine-grained stress and intonation advice. If words or ending sounds are omitted or substituted, explain exactly why.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Target: "${targetText}"\nUser Spoke: "${spokenText}"`,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallScore: { type: Type.INTEGER, description: 'Score between 0 and 100.' },
            intelligibility: { type: Type.STRING, description: 'E.g. Excellent / High / Moderate / Needs Attention' },
            stressAndRhythmScore: { type: Type.INTEGER },
            ipaTarget: { type: Type.STRING, description: 'Standard IPA representation of target.' },
            soundBreakdown: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  word: { type: Type.STRING },
                  ipa: { type: Type.STRING },
                  status: { type: Type.STRING, description: 'correct, missed_ending, misplaced_stress, or substituted' },
                  feedback: { type: Type.STRING },
                },
              },
            },
            vietnameseLearnerTips: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Targeted tips in Vietnamese on mouth position, tongue placement, or final consonants.',
            },
            minimalPairsDrill: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  wordA: { type: Type.STRING },
                  wordB: { type: Type.STRING },
                  ipaA: { type: Type.STRING },
                  ipaB: { type: Type.STRING },
                  difference: { type: Type.STRING },
                },
              },
            },
            practiceSentence: { type: Type.STRING, description: 'A follow-up sentence to reinforce this sound pattern.' },
          },
          required: ['overallScore', 'intelligibility', 'ipaTarget', 'soundBreakdown', 'vietnameseLearnerTips', 'minimalPairsDrill'],
        },
      },
    });

    res.json({ success: true, data: JSON.parse(response.text || '{}') });
  } catch (error: any) {
    console.error('Pronunciation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Dictation Evaluation Endpoint
app.post('/api/gemini/dictation-eval', async (req: Request, res: Response): Promise<void> => {
  try {
    const { originalTranscript, userSubmission } = req.body;

    const systemInstruction = `
You are the Dictation Diagnostic Engine at BenEnglish AI.
Compare the user's typed submission against the ground truth English audio transcript.
Identify:
1. Missing words
2. Misheard words (acoustic confusion, e.g. "would have" heard as "would of", "can't" heard as "can")
3. Spelling mistakes
4. Connected speech & weak form difficulties (e.g. elision, assimilation, linking /r/, intrusive /w/).
Calculate an accurate accuracy percentage based on word match.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Original: "${originalTranscript}"\nUser typed: "${userSubmission}"`,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            accuracyScore: { type: Type.INTEGER, description: 'Percentage 0 to 100' },
            wordMatchCount: { type: Type.INTEGER },
            totalWordCount: { type: Type.INTEGER },
            diffWords: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  expected: { type: Type.STRING },
                  received: { type: Type.STRING },
                  type: { type: Type.STRING, description: 'correct, missing, incorrect, extra' },
                },
              },
            },
            listeningAcousticNotes: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Explanation in English and Vietnamese of acoustic linking/weak forms that caused difficulty.',
            },
            keyVocabularyMissed: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  word: { type: Type.STRING },
                  ipa: { type: Type.STRING },
                  vietnameseMeaning: { type: Type.STRING },
                },
              },
            },
          },
          required: ['accuracyScore', 'diffWords', 'listeningAcousticNotes'],
        },
      },
    });

    res.json({ success: true, data: JSON.parse(response.text || '{}') });
  } catch (error: any) {
    console.error('Dictation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. Free Speaking & Read Aloud Assessment
app.post('/api/gemini/speaking-eval', async (req: Request, res: Response): Promise<void> => {
  try {
    const { topic, userTranscript, durationSeconds = 45, track = 'high_school', level = 'B1' } = req.body;

    const systemInstruction = `
You are the Senior Speaking Assessor at BenEnglish AI.
Evaluate the user's speech transcript on the topic: "${topic}".
Track: ${track === 'high_school' ? 'High School Student' : 'Working Professional'}.
Target Level: ${level}.
Duration: ~${durationSeconds} seconds.

Assess strictly against:
1. Lexical Resource (Vocabulary diversity, collocations, idiomatic phrasing)
2. Grammatical Range and Accuracy (Tense consistency, relative clauses, common Vietnamese transfer errors like singular/plural agreement)
3. Fluency and Coherence (Logical flow, discourse markers, connectors)
4. Relevance and Substance

Clearly label any estimated IELTS band score as an AI Practice Estimate.
Provide a high-band sample answer demonstrating how a native or Band 8.0 speaker would articulate the same ideas.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Topic: "${topic}"\nLearner Speech Transcript: "${userTranscript}"`,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallBandEstimate: { type: Type.NUMBER, description: 'IELTS Practice Band Estimate e.g. 6.0' },
            cefrEstimate: { type: Type.STRING, description: 'A1, A2, B1, B2, C1, or C2' },
            rubricScores: {
              type: Type.OBJECT,
              properties: {
                lexicalResource: { type: Type.NUMBER },
                grammaticalAccuracy: { type: Type.NUMBER },
                fluencyCoherence: { type: Type.NUMBER },
                relevanceContent: { type: Type.NUMBER },
              },
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
              },
            },
            improvedSampleAnswer: {
              type: Type.STRING,
              description: 'A polished, fluent Band 7.5+ / professional executive version of their speech.',
            },
          },
          required: ['overallBandEstimate', 'cefrEstimate', 'rubricScores', 'strengths', 'areasToImprove', 'grammarCorrections', 'improvedSampleAnswer'],
        },
      },
    });

    res.json({ success: true, data: JSON.parse(response.text || '{}') });
  } catch (error: any) {
    console.error('Speaking eval error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5. Real-Life Roleplay Engine
app.post('/api/gemini/roleplay', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      scenarioId,
      scenarioTitle,
      userRole,
      aiRole,
      scenarioGoal,
      userMessage,
      dialogueHistory = [],
      track = 'high_school',
      assistanceMode = 'normal',
      turnCount = 1,
      conversationObjectives = [],
      unexpectedTwist = '',
    } = req.body;

    const isEndingTurn = turnCount >= 6;
    const shouldIntroduceTwist = turnCount === 3 && unexpectedTwist;

    const systemInstruction = `
You are the interactive AI Character in the BenEnglish AI Real-World Roleplay Engine.
Scenario: "${scenarioTitle}" (${scenarioId})
Learner Track: ${track}
Assistance Mode: ${assistanceMode} (beginner: supportive with suggestions; normal: natural with hints; challenge: realistic, fast-paced, high expectations)
User Role: ${userRole}
Your Role: ${aiRole}
Overall Scenario Goal: ${scenarioGoal}
Conversation Objectives to check: ${JSON.stringify(conversationObjectives)}
${shouldIntroduceTwist ? `UNEXPECTED TWIST TO INTRODUCE NOW IN YOUR DIALOGUE: "${unexpectedTwist}"` : ''}

PEDAGOGICAL & INTERACTION RULES:
1. Stay 100% in character as ${aiRole}. Respond directly, dynamically, and authentically to what the user said.
2. Keep your conversational dialogue concise (strictly under 45 words, 2-3 sentences), leaving the floor open for the user.
3. ADAPTIVE LOGIC:
   - Ask intelligent follow-up questions based on the user's answers.
   - If the user gave a brief, hesitant response, prompt them gently to expand their thoughts.
   - If turnCount >= 6, steer the interaction towards a natural conclusion.
4. Assess which conversation objectives have been met based on the user's spoken responses.
5. Provide a real-time coaching tip and 2 suggested user phrases.
`;

    const contents = [
      ...dialogueHistory.map((d: { role: string; content: string }) => ({
        role: d.role === 'user' ? 'user' : 'model',
        parts: [{ text: d.content }],
      })),
      { role: 'user', parts: [{ text: userMessage }] },
    ];

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            aiDialogue: { type: Type.STRING, description: 'In-character spoken reply.' },
            scenarioCompleted: { type: Type.BOOLEAN },
            goalProgressPercent: { type: Type.INTEGER },
            coachingTip: { type: Type.STRING },
            recommendedResponses: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            objectiveStatuses: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  objective: { type: Type.STRING },
                  completed: { type: Type.BOOLEAN },
                },
              },
            },
          },
          required: ['aiDialogue', 'scenarioCompleted', 'goalProgressPercent', 'coachingTip', 'recommendedResponses'],
        },
      },
    });

    res.json({ success: true, data: JSON.parse(response.text || '{}') });
  } catch (error: any) {
    console.error('Roleplay error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5b. Roleplay Comprehensive Performance Assessment Debrief
app.post('/api/gemini/roleplay-debrief', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      scenarioTitle,
      userRole,
      aiRole,
      track,
      level,
      assistanceMode = 'normal',
      dialogueHistory = [],
      conversationObjectives = [],
    } = req.body;

    const transcriptExcerpt = dialogueHistory
      .map((d: { role: string; content: string }) => `${d.role === 'user' ? userRole : aiRole}: ${d.content}`)
      .join('\n');

    const systemInstruction = `
You are the Chief Roleplay Assessment Evaluator at BenEnglish AI.
Analyze the completed interactive roleplay performance:
Scenario: "${scenarioTitle}" (${track}, Target CEFR ${level})
Assistance Mode: ${assistanceMode}
User Role: ${userRole}
AI Character: ${aiRole}
Key Objectives: ${JSON.stringify(conversationObjectives)}

Full Transcript:
${transcriptExcerpt}

Deliver a rigorous, multi-criteria assessment:
1. Task Completion (0-100)
2. Communication Effectiveness (0-100)
3. Spoken Fluency (0-100)
4. Vocabulary Resource (0-100)
5. Grammatical Accuracy (0-100)
6. Professional / Academic Appropriateness (0-100)
7. Overall Score (0-100) and CEFR level equivalent
8. Completed vs Missed objectives
9. Key Strengths (2-3 points)
10. Critical Areas for Improvement (2-3 points)
11. Grammar & Vocabulary corrections with Vietnamese pedagogical notes
12. Model dialogue excerpt showing how a native speaker would handle the toughest turn
13. Concrete actionable next practice step
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: 'Generate roleplay performance debrief',
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallScore: { type: Type.INTEGER },
            cefrEquivalent: { type: Type.STRING },
            taskCompletionScore: { type: Type.INTEGER },
            communicationEffectiveness: { type: Type.INTEGER },
            fluencyScore: { type: Type.INTEGER },
            vocabularyScore: { type: Type.INTEGER },
            grammarScore: { type: Type.INTEGER },
            appropriatenessScore: { type: Type.INTEGER },
            completedObjectives: { type: Type.ARRAY, items: { type: Type.STRING } },
            missedObjectives: { type: Type.ARRAY, items: { type: Type.STRING } },
            keyStrengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            criticalAreasForImprovement: { type: Type.ARRAY, items: { type: Type.STRING } },
            grammarAndVocabularyHighlights: {
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
            modelDialogueExcerpt: { type: Type.STRING },
            actionableNextStep: { type: Type.STRING },
          },
          required: [
            'overallScore',
            'cefrEquivalent',
            'taskCompletionScore',
            'communicationEffectiveness',
            'fluencyScore',
            'vocabularyScore',
            'grammarScore',
            'appropriatenessScore',
            'completedObjectives',
            'missedObjectives',
            'keyStrengths',
            'criticalAreasForImprovement',
            'grammarAndVocabularyHighlights',
            'modelDialogueExcerpt',
            'actionableNextStep',
          ],
        },
      },
    });

    res.json({ success: true, data: JSON.parse(response.text || '{}') });
  } catch (error: any) {
    console.error('Roleplay debrief error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5c. AI Custom Roleplay Scenario Generator
app.post('/api/gemini/generate-roleplay-scenario', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      professionOrGrade = 'General',
      topic = 'Workplace Communication',
      difficulty = 'B1',
      learningObjectives = 'Practice negotiation and active listening',
      durationMinutes = 5,
      track = 'professional',
    } = req.body;

    const systemInstruction = `
You are the Senior Curriculum Designer at BenEnglish AI.
Create an authentic, immersive, real-world English roleplay scenario tailored for:
Track: ${track} (${professionOrGrade})
Topic: ${topic}
Target CEFR Difficulty: ${difficulty}
Learning Objectives: ${learningObjectives}
Estimated Duration: ${durationMinutes} minutes

Ensure the scenario contains:
- Engaging descriptive title
- Realistic user and AI roles
- A clear primary objective
- 3 specific conversation objectives (checkable checklist)
- 3 evaluation criteria
- 1 unexpected realistic twist that tests adaptability
- 5 preparatory vocabulary words
- A realistic opening AI spoken message
- 3 suggested opening user phrases
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: 'Create roleplay scenario',
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            category: { type: Type.STRING },
            description: { type: Type.STRING },
            userRole: { type: Type.STRING },
            aiRole: { type: Type.STRING },
            aiAvatar: { type: Type.STRING },
            objective: { type: Type.STRING },
            situation: { type: Type.STRING },
            learningObjectives: { type: Type.ARRAY, items: { type: Type.STRING } },
            conversationObjectives: { type: Type.ARRAY, items: { type: Type.STRING } },
            evaluationCriteria: { type: Type.ARRAY, items: { type: Type.STRING } },
            unexpectedTwist: { type: Type.STRING },
            durationMinutes: { type: Type.INTEGER },
            vocabularyPrep: { type: Type.ARRAY, items: { type: Type.STRING } },
            openingAiMessage: { type: Type.STRING },
            suggestedPhrases: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: [
            'title',
            'category',
            'description',
            'userRole',
            'aiRole',
            'objective',
            'situation',
            'learningObjectives',
            'conversationObjectives',
            'evaluationCriteria',
            'vocabularyPrep',
            'openingAiMessage',
            'suggestedPhrases',
          ],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    const scenario = {
      ...parsed,
      id: `custom-rp-${Date.now()}`,
      track,
      level: difficulty,
      isCustomGenerated: true,
      aiAvatar: parsed.aiAvatar || (track === 'high_school' ? '👩‍🎓' : '💼'),
    };

    res.json({ success: true, data: scenario });
  } catch (error: any) {
    console.error('Generate roleplay scenario error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 6. Personal AI Learning Coach Plan
app.post('/api/gemini/coach-plan', async (req: Request, res: Response): Promise<void> => {
  try {
    const { track, gradeOrOccupation, performanceStats = {} } = req.body;

    const hasScore = (value: unknown) => typeof value === 'number' && Number.isFinite(value);
    const weakAreas = Array.isArray(performanceStats.weakAreas) ? performanceStats.weakAreas : [];
    const systemInstruction = `
You are the Head AI English Coach at BenEnglish AI.
Track: ${track} (${gradeOrOccupation || 'General'}).
Philosophy: LEARN → LISTEN → UNDERSTAND → SPEAK → RECEIVE FEEDBACK → CORRECT → REPEAT → MASTER.

Evidence from saved learner activity (never invent missing data):
- Latest listening score: ${hasScore(performanceStats.listeningScore) ? performanceStats.listeningScore + '/100' : 'No recorded assessment yet'}
- Latest speaking score: ${hasScore(performanceStats.speakingScore) ? performanceStats.speakingScore + '/100' : 'No recorded assessment yet'}
- Latest pronunciation score: ${hasScore(performanceStats.pronunciationScore) ? performanceStats.pronunciationScore + '/100' : 'No recorded assessment yet'}
- Verified weak areas: ${weakAreas.length ? JSON.stringify(weakAreas) : 'None identified from recorded results yet'}

Generate an adaptive Daily Action Plan. If a skill has no evidence, recommend a baseline practice activity and explicitly state that there is not enough data to diagnose it. Never claim a score, weakness, achievement, or improvement that is not present in the supplied evidence.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: 'Generate my personalized daily English training regimen.',
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
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
                  phase: { type: Type.STRING, description: 'E.g. 1. LISTEN & SHADOW, 2. PRONUNCIATION CLINIC, 3. REAL-WORLD SPEAK' },
                  title: { type: Type.STRING },
                  action: { type: Type.STRING },
                  estimatedMinutes: { type: Type.INTEGER },
                  recommendedLab: { type: Type.STRING, description: 'listening, speaking, conversation, roleplay, or pronunciation' },
                },
              },
            },
            coachMotivationalQuote: { type: Type.STRING },
          },
          required: ['coachGreeting', 'diagnosticSummary', 'dailyPriority', 'learningCycleSteps'],
        },
      },
    });

    res.json({ success: true, data: JSON.parse(response.text || '{}') });
  } catch (error: any) {
    console.error('Coach plan error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 7. AI Listening Content Generator
app.post('/api/gemini/generate-listening-lesson', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      topic = 'Sustainable Smart Cities',
      cefrLevel = 'B1',
      track = 'high_school',
      tier = 'intermediate',
    } = req.body;

    const systemInstruction = `
You are the Chief Educational Content Creator for BenEnglish AI.
Create a complete, pristine, pedagogical English listening lesson.
Topic: "${topic}"
Target CEFR: ${cefrLevel} (Tier: ${tier})
Track: ${track === 'high_school' ? 'High School Students (Grades 10-12)' : track === 'ielts' ? 'IELTS Academic Listening' : 'Working Professionals'}

PEDAGOGICAL REQUIREMENTS:
1. The audio script must consist of 4 to 6 connected sentences forming a realistic, natural spoken narrative, interview, or lecture.
2. Provide precise Vietnamese translations for every sentence.
3. Include phonetic focus notes specifically useful for Vietnamese learners (e.g., linking sounds like /end ʌp/, ending consonants /s/, /ks/, /t/, word stress).
4. Include 3-4 target vocabulary words with exact IPA, parts of speech, English definition, Vietnamese meaning, and practical example sentences.
5. Include 3 comprehension questions with diverse types: multiple-choice, true/false, and main idea or detail.
6. Designate 1 clear dictation target sentence.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Generate listening lesson on: ${topic}`,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            category: { type: Type.STRING },
            durationMinutes: { type: Type.INTEGER },
            summary: { type: Type.STRING },
            learningObjectives: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            dictationTargetSentence: { type: Type.STRING },
            audioSampleText: { type: Type.STRING },
            sentences: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  paragraphIndex: { type: Type.INTEGER },
                  startTime: { type: Type.NUMBER },
                  endTime: { type: Type.NUMBER },
                  textEn: { type: Type.STRING },
                  textVi: { type: Type.STRING },
                  phoneticFocus: { type: Type.STRING },
                  keyPhrases: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                },
                required: ['id', 'textEn', 'textVi', 'phoneticFocus'],
              },
            },
            vocabulary: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  word: { type: Type.STRING },
                  ipa: { type: Type.STRING },
                  pos: { type: Type.STRING },
                  meaningVi: { type: Type.STRING },
                  definitionEn: { type: Type.STRING },
                  exampleEn: { type: Type.STRING },
                  exampleVi: { type: Type.STRING },
                  collocations: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  cefrLevel: { type: Type.STRING },
                  topic: { type: Type.STRING },
                },
                required: ['id', 'word', 'ipa', 'pos', 'meaningVi', 'definitionEn', 'exampleEn', 'exampleVi'],
              },
            },
            comprehensionQuiz: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  type: { type: Type.STRING, description: 'mcq, true_false, fill_blank, main_idea, detail, or short_answer' },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  correctAnswer: { type: Type.STRING },
                  explanationEn: { type: Type.STRING },
                  explanationVi: { type: Type.STRING },
                },
                required: ['question', 'type', 'correctAnswer', 'explanationEn', 'explanationVi'],
              },
            },
          },
          required: [
            'title',
            'category',
            'durationMinutes',
            'summary',
            'learningObjectives',
            'dictationTargetSentence',
            'audioSampleText',
            'sentences',
            'vocabulary',
            'comprehensionQuiz',
          ],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    // Ensure IDs and consistent structure
    const generatedLesson = {
      ...parsed,
      id: `ai-gen-${Date.now()}`,
      track,
      level: cefrLevel,
      tier,
      isAiGenerated: true,
      sentences: (parsed.sentences || []).map((s: any, idx: number) => ({
        ...s,
        id: s.id || `ai-s-${idx}`,
        paragraphIndex: s.paragraphIndex ?? (idx < 3 ? 0 : 1),
        startTime: idx * 4,
        endTime: (idx + 1) * 4,
      })),
    };

    res.json({ success: true, data: generatedLesson });
  } catch (error: any) {
    console.error('Generate listening lesson error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 8. Word Definition Lookup Endpoint (Interactive Transcript clicks)
app.post('/api/gemini/word-lookup', async (req: Request, res: Response): Promise<void> => {
  try {
    const { word, sentenceContext = '' } = req.body;

    const systemInstruction = `
You are the Lexicographer at BenEnglish AI.
Given the English word "${word}" in the context of the sentence: "${sentenceContext}",
provide its accurate IPA pronunciation, part of speech, Vietnamese meaning, concise English definition, common collocations, and an example sentence.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Lookup word: "${word}" in context: "${sentenceContext}"`,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            word: { type: Type.STRING },
            ipa: { type: Type.STRING },
            pos: { type: Type.STRING, description: 'n., v., adj., adv., prep., or idiom' },
            meaningVi: { type: Type.STRING },
            definitionEn: { type: Type.STRING },
            collocations: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            exampleEn: { type: Type.STRING },
            exampleVi: { type: Type.STRING },
          },
          required: ['word', 'ipa', 'pos', 'meaningVi', 'definitionEn', 'collocations', 'exampleEn', 'exampleVi'],
        },
      },
    });

    res.json({ success: true, data: JSON.parse(response.text || '{}') });
  } catch (error: any) {
    console.error('Word lookup error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 9. Short-Answer Evaluation Endpoint
app.post('/api/gemini/evaluate-short-answer', async (req: Request, res: Response): Promise<void> => {
  try {
    const { question, expectedAnswer, userResponse } = req.body;

    const systemInstruction = `
You are an English Listening Examination Grader at BenEnglish AI.
Evaluate whether the student's short answer response accurately captures the core facts or meaning of the question.
Question: "${question}"
Expected / Benchmark Answer: "${expectedAnswer}"
User Student Answer: "${userResponse}"

Score from 0 to 100 based on factual correctness and clarity, tolerating minor typos.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: 'Grade user response',
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isCorrect: { type: Type.BOOLEAN },
            score: { type: Type.INTEGER },
            feedback: { type: Type.STRING },
            feedbackVi: { type: Type.STRING },
          },
          required: ['isCorrect', 'score', 'feedback', 'feedbackVi'],
        },
      },
    });

    res.json({ success: true, data: JSON.parse(response.text || '{}') });
  } catch (error: any) {
    console.error('Evaluate short answer error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 10. Read Aloud Speech Analysis Endpoint
app.post('/api/gemini/read-aloud-eval', async (req: Request, res: Response): Promise<void> => {
  try {
    const { originalPassage, userTranscript, durationSeconds = 30 } = req.body;

    const systemInstruction = `
You are the Read Aloud Speech Evaluator at BenEnglish AI.
Compare the recognized speech transcript against the original English reading passage.
Original Passage: "${originalPassage}"
User Spoken Transcript: "${userTranscript}"
Reading Duration: ${durationSeconds} seconds.

IDENTIFY PRECISELY:
1. Incorrect words (substitutions or acoustic misrecognitions)
2. Missing words (omissions, especially unstressed function words or endings)
3. Extra words (insertions)
4. Repeated words (stuttering or self-correction)
5. Pacing and Natural Pausing assessment (typical reading cadence is 110-140 WPM).
6. Specific pronunciation difficulties commonly experienced by Vietnamese learners (e.g. dropping ending consonants, syllable-timed cadence).
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Evaluate Read Aloud: ${userTranscript}`,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            accuracyScore: { type: Type.INTEGER, description: 'Percentage accuracy (0-100)' },
            wpm: { type: Type.INTEGER, description: 'Calculated words per minute' },
            cadenceRating: { type: Type.STRING, description: 'Fluent / Natural / Slightly Hesitant / Too Fast / Too Slow' },
            wordErrors: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  expected: { type: Type.STRING },
                  received: { type: Type.STRING },
                  errorType: { type: Type.STRING, description: 'missing, incorrect, extra, or repeated' },
                  feedback: { type: Type.STRING },
                },
              },
            },
            sentenceFeedback: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  sentenceIndex: { type: Type.INTEGER },
                  feedback: { type: Type.STRING },
                  pauseEvaluation: { type: Type.STRING },
                },
              },
            },
            rhythmAndPacingNotes: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            vietnameseTransferAdvice: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Targeted tips in Vietnamese on final consonants and phrasing chunks.',
            },
          },
          required: ['accuracyScore', 'wpm', 'cadenceRating', 'wordErrors', 'rhythmAndPacingNotes', 'vietnameseTransferAdvice'],
        },
      },
    });

    res.json({ success: true, data: JSON.parse(response.text || '{}') });
  } catch (error: any) {
    console.error('Read aloud eval error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 11. AI Free Speaking Topic Generator Endpoint
app.post('/api/gemini/generate-speaking-topic', async (req: Request, res: Response): Promise<void> => {
  try {
    const { track = 'high_school', cefrLevel = 'B1', occupationOrGrade = 'General', previousMistakes = [] } = req.body;

    const systemInstruction = `
You are the Speaking Curriculum Designer at BenEnglish AI.
Create an engaging, authentic speaking topic tailored for:
Track: ${track} (${occupationOrGrade})
CEFR Level: ${cefrLevel}
Previous Learner Weaknesses: ${JSON.stringify(previousMistakes)}

Provide an open-ended 1-3 minute prompt, 3 guiding bullet points, and 4 high-band target vocabulary words.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: 'Generate speaking topic',
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            category: { type: Type.STRING },
            prompt: { type: Type.STRING },
            guidingQuestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            suggestedVocab: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            targetMinutes: { type: Type.INTEGER },
          },
          required: ['title', 'category', 'prompt', 'guidingQuestions', 'suggestedVocab', 'targetMinutes'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    const topic = {
      ...parsed,
      id: `ai-top-${Date.now()}`,
      track,
      level: cefrLevel,
    };

    res.json({ success: true, data: topic });
  } catch (error: any) {
    console.error('Generate speaking topic error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Optional second-pass audio transcription for learners who explicitly enable it.
app.post('/api/gemini/transcribe-audio', async (req: Request, res: Response): Promise<void> => {
  try {
    const { audioBase64, mimeType = 'audio/webm' } = req.body || {};
    if (typeof audioBase64 !== 'string' || !audioBase64.trim()) {
      res.status(400).json({ success: false, error: 'Audio data is required.' });
      return;
    }
    if (audioBase64.length > 7_000_000) {
      res.status(413).json({ success: false, error: 'Recording is too large. Please record a shorter answer.' });
      return;
    }

    const normalizedMimeType = String(mimeType).split(';')[0].toLowerCase();
    const allowedMimeTypes = ['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/wav', 'audio/mpeg'];
    if (!allowedMimeTypes.includes(normalizedMimeType)) {
      res.status(415).json({ success: false, error: 'This audio format is not supported. Try Chrome or Edge with audio recording enabled.' });
      return;
    }

    const audioBytes = Buffer.from(audioBase64, 'base64');
    if (!audioBytes.length || audioBytes.length > 5 * 1024 * 1024) {
      res.status(413).json({ success: false, error: 'Recording is empty or exceeds the 5 MB limit.' });
      return;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { mimeType: normalizedMimeType, data: audioBase64 } },
          { text: 'Transcribe the spoken English audio verbatim. Preserve the learner’s actual words and natural repetitions. Add normal punctuation. Do not translate, summarize, rewrite, correct grammar, or guess missing words. If a short section cannot be understood, mark it as [unclear]. Return only the transcript in the required JSON field.' },
        ],
      }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: { transcript: { type: Type.STRING } },
          required: ['transcript'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json({ success: true, data: { transcript: String(parsed.transcript || '').trim() } });
  } catch (error: any) {
    console.error('Audio transcription error:', error?.message || error);
    res.status(500).json({ success: false, error: 'AI transcription is temporarily unavailable. Your browser transcript is kept as a fallback.' });
  }
});

// Vite middleware for development or static files for production
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BenEnglish AI Server running on http://0.0.0.0:${PORT} [${process.env.NODE_ENV || 'development'}]`);
  });
}

startServer().catch((err) => {
  console.error('Server failed to start:', err);
});
