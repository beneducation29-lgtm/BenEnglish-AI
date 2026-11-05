// Client API service for BenEnglish AI endpoints
import { RoleplayScenario, RoleplayAssessmentReport } from '../types';

export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
  phoneticTip?: string;
  correction?: {
    hasMistake: boolean;
    original: string;
    improved: string;
    explanation: string;
    vietnameseTip: string;
  };
}

export interface ConversationResponseData {
  replyText: string;
  phoneticTip: string;
  correction?: {
    hasMistake: boolean;
    original: string;
    improved: string;
    explanation: string;
    vietnameseTip: string;
  };
  suggestedUserReplies: string[];
}

export interface PronunciationEvalData {
  overallScore: number;
  intelligibility: string;
  stressAndRhythmScore?: number;
  ipaTarget: string;
  soundBreakdown: {
    word: string;
    ipa: string;
    status: 'correct' | 'missed_ending' | 'misplaced_stress' | 'substituted';
    feedback: string;
  }[];
  vietnameseLearnerTips: string[];
  minimalPairsDrill: {
    wordA: string;
    wordB: string;
    ipaA: string;
    ipaB: string;
    difference: string;
  }[];
  practiceSentence?: string;
}

export interface DictationEvalData {
  accuracyScore: number;
  wordMatchCount: number;
  totalWordCount: number;
  diffWords: {
    expected: string;
    received: string;
    type: 'correct' | 'missing' | 'incorrect' | 'extra';
  }[];
  listeningAcousticNotes: string[];
  keyVocabularyMissed?: {
    word: string;
    ipa: string;
    vietnameseMeaning: string;
  }[];
}

export interface SpeakingEvalData {
  overallBandEstimate: number;
  cefrEstimate: string;
  rubricScores: {
    lexicalResource: number;
    grammaticalAccuracy: number;
    fluencyCoherence: number;
    relevanceContent: number;
  };
  strengths: string[];
  areasToImprove: string[];
  grammarCorrections: {
    original: string;
    correction: string;
    explanation: string;
    vietnameseNote: string;
  }[];
  upgradedVocabulary: {
    basicWord: string;
    advancedAlternative: string;
    example: string;
  }[];
  improvedSampleAnswer: string;
}

export interface RoleplayResponseData {
  aiDialogue: string;
  scenarioCompleted: boolean;
  goalProgressPercent: number;
  coachingTip: string;
  recommendedResponses: string[];
  objectiveStatuses?: {
    objective: string;
    completed: boolean;
  }[];
}

export interface CoachPlanData {
  coachGreeting: string;
  diagnosticSummary: string;
  dailyPriority: string;
  targetMinutes: number;
  learningCycleSteps: {
    phase: string;
    title: string;
    action: string;
    estimatedMinutes: number;
    recommendedLab: string;
  }[];
  coachMotivationalQuote?: string;
}

export async function sendConversationMessage(payload: {
  message: string;
  history: { role: string; content: string }[];
  tutorPersona: string;
  mode: string;
  track: string;
  userLevel: string;
  occupation?: string;
}): Promise<ConversationResponseData> {
  const res = await fetch('/api/gemini/conversation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to communicate with AI Tutor');
  }
  return data.data;
}

export async function generateConversationSummary(payload: {
  history: { role: string; content: string }[];
  persona: string;
  mode: string;
  track: string;
  userLevel: string;
}): Promise<any> {
  const res = await fetch('/api/gemini/conversation-summary', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to generate conversation summary');
  }
  return data.data;
}

export async function evaluatePronunciation(payload: {
  targetText: string;
  spokenText: string;
  track: string;
}): Promise<PronunciationEvalData> {
  const res = await fetch('/api/gemini/pronunciation-coach', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to evaluate pronunciation');
  }
  return data.data;
}

export async function evaluateDictation(payload: {
  originalTranscript: string;
  userSubmission: string;
}): Promise<DictationEvalData> {
  const res = await fetch('/api/gemini/dictation-eval', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to evaluate dictation');
  }
  return data.data;
}

export async function evaluateSpeaking(payload: {
  topic: string;
  userTranscript: string;
  durationSeconds?: number;
  track: string;
  level: string;
}): Promise<SpeakingEvalData> {
  const res = await fetch('/api/gemini/speaking-eval', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to evaluate speaking response');
  }
  return data.data;
}

export async function sendRoleplayMessage(payload: {
  scenarioId: string;
  scenarioTitle: string;
  userRole: string;
  aiRole: string;
  scenarioGoal: string;
  userMessage: string;
  dialogueHistory: { role: string; content: string }[];
  track: string;
  assistanceMode?: string;
  turnCount: number;
  conversationObjectives?: string[];
  unexpectedTwist?: string;
}): Promise<RoleplayResponseData> {
  const res = await fetch('/api/gemini/roleplay', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to process roleplay step');
  }
  return data.data;
}

export async function fetchRoleplayDebrief(payload: {
  scenarioTitle: string;
  userRole: string;
  aiRole: string;
  track: string;
  level: string;
  assistanceMode?: string;
  dialogueHistory: { role: string; content: string }[];
  conversationObjectives?: string[];
}): Promise<RoleplayAssessmentReport> {
  const res = await fetch('/api/gemini/roleplay-debrief', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to evaluate roleplay debrief');
  }
  return data.data;
}

export async function generateRoleplayScenario(payload: {
  professionOrGrade: string;
  topic: string;
  difficulty: string;
  learningObjectives?: string;
  durationMinutes?: number;
  track: string;
}): Promise<RoleplayScenario> {
  const res = await fetch('/api/gemini/generate-roleplay-scenario', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to generate custom roleplay scenario');
  }
  return data.data;
}

export async function fetchCoachPlan(payload: {
  track: string;
  gradeOrOccupation: string;
  performanceStats?: any;
}): Promise<CoachPlanData> {
  const res = await fetch('/api/gemini/coach-plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to generate personalized coach plan');
  }
  return data.data;
}

export async function generateAiListeningLesson(payload: {
  topic: string;
  cefrLevel: string;
  track: string;
  tier?: string;
}): Promise<any> {
  const res = await fetch('/api/gemini/generate-listening-lesson', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to generate listening lesson');
  }
  return data.data;
}

export async function lookupWordDefinition(payload: {
  word: string;
  sentenceContext?: string;
}): Promise<any> {
  const res = await fetch('/api/gemini/word-lookup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to lookup word definition');
  }
  return data.data;
}

export async function evaluateShortAnswer(payload: {
  question: string;
  expectedAnswer: string;
  userResponse: string;
}): Promise<{ isCorrect: boolean; score: number; feedback: string; feedbackVi: string }> {
  const res = await fetch('/api/gemini/evaluate-short-answer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to evaluate short answer');
  }
  return data.data;
}

export async function evaluateReadAloud(payload: {
  originalPassage: string;
  userTranscript: string;
  durationSeconds?: number;
}): Promise<any> {
  const res = await fetch('/api/gemini/read-aloud-eval', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to evaluate Read Aloud');
  }
  return data.data;
}

export async function generateSpeakingTopic(payload: {
  track: string;
  cefrLevel: string;
  occupationOrGrade?: string;
  previousMistakes?: string[];
}): Promise<any> {
  const res = await fetch('/api/gemini/generate-speaking-topic', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to generate speaking topic');
  }
  return data.data;
}


