export type TrackType = 'high_school' | 'professional';

export type HighSchoolGrade = 'Grade 10' | 'Grade 11' | 'Grade 12';
export type ProfessionalOccupation =
  | 'Software & Tech'
  | 'Finance & Banking'
  | 'Sales & Marketing'
  | 'Human Resources'
  | 'Customer Support'
  | 'Healthcare & Medical'
  | 'International Business';

export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export type LessonTier = 'beginner' | 'intermediate' | 'advanced';

export interface SentenceItem {
  id: string;
  paragraphIndex?: number;
  startTime: number;
  endTime: number;
  textEn: string;
  textVi: string;
  phoneticFocus?: string;
  keyPhrases?: string[];
}

export interface VocabItem {
  id: string;
  word: string;
  ipa: string;
  pos: string; // Part of speech: n., v., adj., adv., idiom
  meaningVi: string;
  definitionEn: string;
  exampleEn: string;
  exampleVi: string;
  collocations?: string[];
  cefrLevel: CEFRLevel;
  topic: string;
  track: TrackType | 'both' | 'ielts';
  grade?: HighSchoolGrade;
  masteryLevel: number; // 0 - 5 (spaced repetition)
  lastReviewed?: string;
  nextReviewAt?: string;
  reviewCount?: number;
  successfulReviewCount?: number;
  audioText?: string;
}

export type QuestionType =
  | 'mcq'
  | 'true_false'
  | 'fill_blank'
  | 'main_idea'
  | 'detail'
  | 'short_answer';

export interface ComprehensionQuestion {
  id?: string;
  question: string;
  type: QuestionType;
  options?: string[];
  correctAnswer: string;
  explanationEn: string;
  explanationVi: string;
}

export interface ListeningLesson {
  id: string;
  title: string;
  track: TrackType | 'both' | 'ielts';
  tier?: LessonTier;
  category: string;
  level: CEFRLevel;
  durationMinutes: number;
  summary: string;
  learningObjectives?: string[];
  audioSampleText: string;
  sentences: SentenceItem[];
  vocabulary: VocabItem[];
  comprehensionQuiz: ComprehensionQuestion[];
  dictationTargetSentence: string;
  dictationSentences?: string[];
  isAiGenerated?: boolean;
}

export interface ListeningProgressRecord {
  totalListeningSeconds: number;
  recentlyPlayedLessonIds: string[];
  continueLearningLessonId?: string;
  continueSentenceIndex?: number;
  dailyListeningGoalMinutes: number;
  dailyListeningSecondsToday: number;
  dailyListeningDate?: string;
  dictationAccuracyAvg: number;
  comprehensionAccuracyAvg: number;
  dictationAttemptCount?: number;
  comprehensionAttemptCount?: number;
  completedListeningCount: number;
  misunderstoodVocab: {
    word: string;
    count: number;
    meaningVi: string;
    ipa?: string;
  }[];
}

export interface UserProfile {
  name: string;
  email: string;
  track: TrackType;
  grade?: HighSchoolGrade;
  occupation?: ProfessionalOccupation;
  cefrLevel: CEFRLevel;
  targetGoal: string;
  streakDays: number;
  totalXp: number;
  dailyGoalMinutes: number;
  dailyMinutesSpent: number;
  dailyActivityDate?: string;
  completedLessonIds: string[];
  bookmarkedVocabIds: string[];
  recentSpeakingScores: number[];
  recentListeningScores: number[];
  recentPronunciationScores: number[];
  listeningProgress?: ListeningProgressRecord;
  speakingProgress?: SpeakingProgressRecord;
  conversationProgress?: ConversationProgressRecord;
  roleplayProgress?: RoleplayProgressRecord;
}

export type RoleplayAssistanceMode = 'beginner' | 'normal' | 'challenge';

export interface RoleplayScenario {
  id: string;
  title: string;
  track: TrackType;
  level: CEFRLevel;
  category: string;
  description?: string;
  userRole: string;
  aiRole: string;
  aiAvatar?: string;
  objective: string;
  situation: string;
  learningObjectives?: string[];
  conversationObjectives?: string[];
  evaluationCriteria?: string[];
  unexpectedTwist?: string;
  durationMinutes?: number;
  vocabularyPrep: string[];
  openingAiMessage: string;
  suggestedPhrases: string[];
  isCustomGenerated?: boolean;
}

export interface IPASound {
  symbol: string;
  type: 'vowel_monophthong' | 'vowel_diphthong' | 'consonant_voiced' | 'consonant_voiceless';
  exampleWord: string;
  ipaExample: string;
  vietnameseGuide: string;
  mouthPositionTip: string;
  vietnameseCommonError: string;
  minimalPair: {
    wordA: string;
    ipaA: string;
    wordB: string;
    ipaB: string;
  };
}

export interface PodcastEpisode {
  id: string;
  title: string;
  category: string;
  track: TrackType | 'both';
  level: CEFRLevel;
  duration: string;
  speaker: string;
  audioScript: string;
  sentences: SentenceItem[];
  idioms: { phrase: string; meaningVi: string; example: string }[];
}

export interface IELTSSpeakingPrompt {
  id: string;
  part: 'Part 1' | 'Part 2' | 'Part 3';
  topic: string;
  promptText: string;
  cueCardPoints?: string[];
  suggestedVocab: string[];
  sampleBand75: string;
}

export interface WordDefinitionLookup {
  word: string;
  ipa: string;
  pos: string;
  meaningVi: string;
  definitionEn: string;
  collocations: string[];
  exampleEn: string;
  exampleVi: string;
}

export interface SpeakingResultRecord {
  id: string;
  type: 'read_aloud' | 'shadowing' | 'free_speaking' | 'pronunciation';
  title: string;
  date: string;
  score: number;
  cefrLevel: CEFRLevel;
  wpm?: number;
  userTranscript: string;
  targetText?: string;
  feedbackSummary: string;
}

export interface PronunciationMemoryItem {
  id: string;
  soundSymbol: string;
  pairLabel: string;
  missCount: number;
  lastTested: string;
  wordExamples: string[];
  drilledStatus: 'needs_practice' | 'improving' | 'mastered';
  priority: 'high' | 'medium' | 'low';
}

export interface ReadAloudPassage {
  id: string;
  title: string;
  track: TrackType | 'both';
  level: CEFRLevel;
  category: string;
  text: string;
  sentences: { id: string; text: string; textVi?: string }[];
  focusSounds: string[];
  targetWpm: number;
}

export interface FreeSpeakingTopic {
  id: string;
  title: string;
  track: TrackType | 'both';
  level: CEFRLevel;
  category: string;
  prompt: string;
  guidingQuestions: string[];
  suggestedVocab: string[];
  targetMinutes: number;
}

export interface SpeakingChallenge {
  id: string;
  title: string;
  description: string;
  targetGoal: string;
  xpReward: number;
  isCompleted: boolean;
  progressPercent: number;
  badgeIcon: string;
}

export interface SpeakingProgressRecord {
  totalSpeakingMinutes: number;
  pronunciationAccuracyAvg: number;
  fluencyScoreAvg: number;
  readAloudCompletedCount: number;
  shadowingCompletedCount: number;
  freeSpeakingCompletedCount: number;
  pronunciationMemory: PronunciationMemoryItem[];
  history: SpeakingResultRecord[];
  activeChallenges: SpeakingChallenge[];
}

export type TutorPersonaId =
  | 'friendly_teacher'
  | 'strict_teacher'
  | 'native_partner'
  | 'business_coach'
  | 'ielts_coach';

export type ConversationModeId =
  | 'everyday'
  | 'school'
  | 'business'
  | 'free'
  | 'ielts'
  | 'interview';

export interface ConversationTurnRecord {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  phoneticTip?: string;
  correction?: {
    hasMistake: boolean;
    original: string;
    improved: string;
    explanation: string;
    vietnameseTip: string;
  };
  suggestedReplies?: string[];
}

export interface ConversationSummaryReport {
  summary: string;
  newVocabulary: {
    word: string;
    ipa: string;
    definition: string;
    meaningVi: string;
  }[];
  grammarMistakes: {
    userSaid: string;
    correction: string;
    rule: string;
    vietnameseExplanation: string;
  }[];
  pronunciationObservations: string[];
  strongPoints: string[];
  improvementSuggestions: string[];
  recommendedPractice: {
    lab: 'listening' | 'speaking' | 'roleplay' | 'pronunciation';
    title: string;
    targetFocus: string;
  };
  personalizedExercise?: {
    prompt: string;
    targetPhrases: string[];
    modelAnswer: string;
    focus: string;
  };
}

export interface ConversationSessionRecord {
  id: string;
  title: string;
  startedAt: string;
  durationMinutes: number;
  personaId: TutorPersonaId;
  modeId: ConversationModeId;
  turns: ConversationTurnRecord[];
  summaryReport?: ConversationSummaryReport;
}

export interface ConversationProgressRecord {
  totalConversationMinutes: number;
  completedSessionsCount: number;
  totalTurnsCount: number;
  savedSessions: ConversationSessionRecord[];
}

export interface RoleplayAssessmentReport {
  overallScore: number;
  cefrEquivalent: string;
  taskCompletionScore: number;
  communicationEffectiveness: number;
  fluencyScore: number;
  vocabularyScore: number;
  grammarScore: number;
  appropriatenessScore: number;
  completedObjectives: string[];
  missedObjectives: string[];
  keyStrengths: string[];
  criticalAreasForImprovement: string[];
  grammarAndVocabularyHighlights: {
    original: string;
    correction: string;
    explanation: string;
    vietnameseNote: string;
  }[];
  modelDialogueExcerpt: string;
  actionableNextStep: string;
}

export interface RoleplaySessionRecord {
  id: string;
  scenarioId: string;
  scenarioTitle: string;
  track: TrackType;
  date: string;
  assistanceMode: RoleplayAssistanceMode;
  durationMinutes: number;
  turnsCount: number;
  assessment: RoleplayAssessmentReport;
}

export interface RoleplayProgressRecord {
  totalRoleplayMinutes: number;
  completedScenariosCount: number;
  averageScore: number;
  customScenarios: RoleplayScenario[];
  history: RoleplaySessionRecord[];
}
