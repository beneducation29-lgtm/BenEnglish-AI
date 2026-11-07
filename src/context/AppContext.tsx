import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  UserProfile,
  TrackType,
  HighSchoolGrade,
  ProfessionalOccupation,
  CEFRLevel,
  VocabItem,
  ListeningLesson,
  ListeningProgressRecord,
  SpeakingProgressRecord,
  SpeakingResultRecord,
  PronunciationMemoryItem,
  ConversationProgressRecord,
  ConversationSessionRecord,
  RoleplayScenario,
  RoleplaySessionRecord,
  RoleplayProgressRecord,
  RoleplayAssistanceMode,
} from '../types';
import {
  INITIAL_VOCABULARY_BANK,
  HIGH_SCHOOL_LISTENING_LESSONS,
  PROFESSIONAL_LISTENING_LESSONS,
  IELTS_LISTENING_LESSONS,
  SPEAKING_CHALLENGES,
  ROLEPLAY_SCENARIOS,
} from '../data/curriculumData';
import { ADDITIONAL_LISTENING_LESSONS } from '../data/skillsPracticePack';
import { useAuth } from './AuthContext';

const accountStorageKey = (key: string, uid?: string) => uid ? `${key}:${uid}` : key;

const getLocalDateKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

export type ActiveTab =
  | 'home'
  | 'listening'
  | 'speaking'
  | 'reading-writing'
  | 'conversation'
  | 'roleplay'
  | 'pronunciation'
  | 'library'
  | 'vocabulary'
  | 'exam'
  | 'progress';

interface AppContextType {
  user: UserProfile;
  activeTab: ActiveTab;
  playbackSpeed: number;
  setActiveTab: (tab: ActiveTab) => void;
  setPlaybackSpeed: (speed: number) => void;
  switchTrack: (track: TrackType) => void;
  updateGrade: (grade: HighSchoolGrade) => void;
  updateOccupation: (occ: ProfessionalOccupation) => void;
  updateCefrLevel: (level: CEFRLevel) => void;
  addXp: (xp: number) => void;
  completeLesson: (lessonId: string, type: 'listening' | 'speaking' | 'roleplay', score?: number) => void;
  vocabBank: VocabItem[];
  addVocabWord: (word: VocabItem) => void;
  toggleVocabBookmark: (id: string) => void;
  recordVocabReview: (id: string, remembered: boolean) => void;
  audioFeedbackSound: () => void;
  // Phase 2: Listening Lab State & Methods
  allListeningLessons: ListeningLesson[];
  addGeneratedLesson: (lesson: ListeningLesson) => void;
  recordListeningPlay: (lessonId: string, sentenceIndex?: number) => void;
  addListeningSeconds: (seconds: number) => void;
  recordDictationAttempt: (lessonId: string, score: number, missedWords?: string[]) => void;
  recordComprehensionAttempt: (lessonId: string, score: number) => void;
  // Phase 3: Speaking Lab State & Methods
  recordSpeakingResult: (result: SpeakingResultRecord) => void;
  updatePronunciationMemoryMiss: (pairLabel: string, soundSymbol: string) => void;
  markPronunciationDrillMastered: (id: string) => void;
  completeSpeakingChallenge: (challengeId: string) => void;
  addSpeakingMinutes: (minutes: number) => void;
  // Phase 4: Conversation Room State & Methods
  saveConversationSession: (session: ConversationSessionRecord) => void;
  deleteConversationSession: (sessionId: string) => void;
  clearAllConversationHistory: () => void;
  addConversationMinutes: (minutes: number) => void;
  // Phase 5: Roleplay Engine State & Methods
  allRoleplayScenarios: RoleplayScenario[];
  saveRoleplaySession: (session: RoleplaySessionRecord) => void;
  addCustomRoleplayScenario: (scenario: RoleplayScenario) => void;
  deleteCustomRoleplayScenario: (scenarioId: string) => void;
  addRoleplayMinutes: (minutes: number) => void;
}

const defaultListeningProgress: ListeningProgressRecord = {
  totalListeningSeconds: 0,
  recentlyPlayedLessonIds: [],
  continueLearningLessonId: undefined,
  continueSentenceIndex: 0,
  dailyListeningGoalMinutes: 15,
  dailyListeningSecondsToday: 0,
  dailyListeningDate: getLocalDateKey(),
  dictationAccuracyAvg: 0,
  comprehensionAccuracyAvg: 0,
  dictationAttemptCount: 0,
  comprehensionAttemptCount: 0,
  completedListeningCount: 0,
  misunderstoodVocab: [],
};

const defaultSpeakingProgress: SpeakingProgressRecord = {
  totalSpeakingMinutes: 0,
  pronunciationAccuracyAvg: 0,
  fluencyScoreAvg: 0,
  readAloudCompletedCount: 0,
  shadowingCompletedCount: 0,
  freeSpeakingCompletedCount: 0,
  pronunciationMemory: [],
  history: [],
  activeChallenges: SPEAKING_CHALLENGES.map((challenge) => ({
    ...challenge,
    isCompleted: false,
    progressPercent: 0,
  })),
};

const defaultConversationProgress: ConversationProgressRecord = {
  totalConversationMinutes: 0,
  completedSessionsCount: 0,
  totalTurnsCount: 0,
  savedSessions: [],
};

const defaultRoleplayProgress: RoleplayProgressRecord = {
  totalRoleplayMinutes: 0,
  completedScenariosCount: 0,
  averageScore: 0,
  customScenarios: [],
  history: [],
};

const defaultUser: UserProfile = {
  name: 'Ben Learner',
  email: 'beneducation29@gmail.com',
  track: 'high_school',
  grade: 'Grade 11',
  occupation: 'Software & Tech',
  cefrLevel: 'B1',
  targetGoal: 'IELTS Speaking 7.0 & Academic Fluency',
  streakDays: 0,
  totalXp: 0,
  dailyGoalMinutes: 25,
  dailyMinutesSpent: 0,
  dailyActivityDate: getLocalDateKey(),
  completedLessonIds: [],
  bookmarkedVocabIds: [],
  recentSpeakingScores: [],
  recentListeningScores: [],
  recentPronunciationScores: [],
  listeningProgress: defaultListeningProgress,
  speakingProgress: defaultSpeakingProgress,
  conversationProgress: defaultConversationProgress,
  roleplayProgress: defaultRoleplayProgress,
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { authUser } = useAuth();
  const [user, setUser] = useState<UserProfile>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(accountStorageKey('benenglish_user', authUser?.uid));
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Remove only the known demo records shipped in the original starter profile.
          // Learner-created records and custom content are retained.
          const oldSpeakingHistory = parsed.speakingProgress?.history || [];
          const speakingHistory = oldSpeakingHistory.filter((item: any) => !String(item.id).startsWith('spk-hist-'));
          const conversationSessions = (parsed.conversationProgress?.savedSessions || []).filter((item: any) => item.id !== 'conv-init-1');
          const roleplayHistory = (parsed.roleplayProgress?.history || []).filter((item: any) => item.id !== 'rp-hist-1');
          const legacySeedScores = (values: number[], seed: number[]) =>
            Array.isArray(values) && seed.every((value, index) => values[index] === value)
              ? values.slice(seed.length)
              : (Array.isArray(values) ? values : []);
          const todayKey = getLocalDateKey();
          const legacyListening = parsed.listeningProgress || {};
          const legacySpeaking = parsed.speakingProgress || {};
          const seededPronunciationMisses: Record<string, number> = { 'pm-01': 4, 'pm-02': 5, 'pm-03': 3, 'pm-04': 2, 'pm-05': 1 };
          const pronunciationMemory = (legacySpeaking.pronunciationMemory || []).map((item: any) => ({
            ...item,
            missCount: Math.max(0, item.missCount - (seededPronunciationMisses[item.id] || 0)),
          })).filter((item: any) => item.missCount > 0);
          const legacyConversation = parsed.conversationProgress || {};
          const legacyRoleplay = parsed.roleplayProgress || {};
          const listeningHadOnlyDemo = (legacyListening.recentlyPlayedLessonIds || []).every((id: string) => ['hs-env-01', 'pro-meet-01'].includes(id));
          return {
            ...defaultUser,
            ...parsed,
            name: authUser?.displayName || parsed.name,
            email: authUser?.email || parsed.email,
            streakDays: Math.max(0, (parsed.streakDays || 0) - 6),
            totalXp: Math.max(0, (parsed.totalXp || 0) - 1850),
            dailyMinutesSpent: parsed.dailyActivityDate === todayKey ? Math.max(0, (parsed.dailyMinutesSpent || 0) - 16) : 0,
            dailyActivityDate: todayKey,
            completedLessonIds: (parsed.completedLessonIds || []).filter((id: string) => id !== 'hs-env-01'),
            bookmarkedVocabIds: (parsed.bookmarkedVocabIds || []).filter((id: string) => !['v-b1-01', 'v-hs-1'].includes(id)),
            recentSpeakingScores: legacySeedScores(parsed.recentSpeakingScores, [72, 78, 81]),
            recentListeningScores: legacySeedScores(parsed.recentListeningScores, [80, 85, 90]),
            recentPronunciationScores: legacySeedScores(parsed.recentPronunciationScores, [75, 82, 84]),
            listeningProgress: {
              ...defaultListeningProgress,
              ...legacyListening,
              totalListeningSeconds: Math.max(0, (legacyListening.totalListeningSeconds || 0) - 1420),
              dailyListeningSecondsToday: legacyListening.dailyListeningDate === todayKey ? Math.max(0, (legacyListening.dailyListeningSecondsToday || 0) - 480) : 0,
              dailyListeningDate: todayKey,
              completedListeningCount: Math.max(0, (legacyListening.completedListeningCount || 0) - 2),
              recentlyPlayedLessonIds: listeningHadOnlyDemo
                ? []
                : (legacyListening.recentlyPlayedLessonIds || []).filter((id: string) => !['hs-env-01', 'pro-meet-01'].includes(id)),
              misunderstoodVocab: (legacyListening.misunderstoodVocab || []).filter((item: any) => !['deliverable', 'single-use'].includes(item.word)),
              dictationAccuracyAvg: 0,
              comprehensionAccuracyAvg: 0,
              dictationAttemptCount: 0,
              comprehensionAttemptCount: 0,
            },
            speakingProgress: {
              ...defaultSpeakingProgress,
              ...legacySpeaking,
              totalSpeakingMinutes: Math.max(0, (legacySpeaking.totalSpeakingMinutes || 0) - 24),
              readAloudCompletedCount: Math.max(0, (legacySpeaking.readAloudCompletedCount || 0) - 4),
              shadowingCompletedCount: Math.max(0, (legacySpeaking.shadowingCompletedCount || 0) - 6),
              freeSpeakingCompletedCount: Math.max(0, (legacySpeaking.freeSpeakingCompletedCount || 0) - 3),
              history: speakingHistory,
              pronunciationMemory,
              pronunciationAccuracyAvg: speakingHistory.length ? Math.round(speakingHistory.reduce((sum: number, item: any) => sum + item.score, 0) / speakingHistory.length) : 0,
              fluencyScoreAvg: 0,
            },
            conversationProgress: {
              ...defaultConversationProgress,
              ...legacyConversation,
              totalConversationMinutes: Math.max(0, (legacyConversation.totalConversationMinutes || 0) - 32),
              completedSessionsCount: Math.max(0, (legacyConversation.completedSessionsCount || 0) - 3),
              totalTurnsCount: Math.max(0, (legacyConversation.totalTurnsCount || 0) - 22),
              savedSessions: conversationSessions,
            },
            roleplayProgress: {
              ...defaultRoleplayProgress,
              ...legacyRoleplay,
              totalRoleplayMinutes: Math.max(0, (legacyRoleplay.totalRoleplayMinutes || 0) - 18),
              completedScenariosCount: Math.max(0, (legacyRoleplay.completedScenariosCount || 0) - 2),
              averageScore: roleplayHistory.length
                ? Math.round(roleplayHistory.reduce((sum: number, item: any) => sum + item.assessment.overallScore, 0) / roleplayHistory.length)
                : 0,
              customScenarios: legacyRoleplay.customScenarios || [],
              history: roleplayHistory,
            },
          };
        } catch (e) {
          // ignore
        }
      }
    }
    return { ...defaultUser, name: authUser?.displayName || defaultUser.name, email: authUser?.email || defaultUser.email };
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);

  const [vocabBank, setVocabBank] = useState<VocabItem[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(accountStorageKey('benenglish_vocab', authUser?.uid));
      if (saved) {
        try {
          return (JSON.parse(saved) as VocabItem[]).map((item) => item.reviewCount === undefined ? { ...item, masteryLevel: 0, lastReviewed: undefined, nextReviewAt: undefined, reviewCount: 0, successfulReviewCount: 0 } : item);
        } catch (e) {
          // ignore
        }
      }
    }
    return INITIAL_VOCABULARY_BANK.map((item) => ({ ...item, masteryLevel: 0, lastReviewed: undefined, nextReviewAt: undefined, reviewCount: 0, successfulReviewCount: 0 }));
  });

  const [customLessons, setCustomLessons] = useState<ListeningLesson[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(accountStorageKey('benenglish_custom_lessons', authUser?.uid));
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          // ignore
        }
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem(accountStorageKey('benenglish_user', authUser?.uid), JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    localStorage.setItem(accountStorageKey('benenglish_vocab', authUser?.uid), JSON.stringify(vocabBank));
  }, [vocabBank]);

  useEffect(() => {
    localStorage.setItem(accountStorageKey('benenglish_custom_lessons', authUser?.uid), JSON.stringify(customLessons));
  }, [customLessons]);

  const allListeningLessons: ListeningLesson[] = [
    ...HIGH_SCHOOL_LISTENING_LESSONS,
    ...PROFESSIONAL_LISTENING_LESSONS,
    ...IELTS_LISTENING_LESSONS,
    ...ADDITIONAL_LISTENING_LESSONS,
    ...customLessons,
  ];

  const addGeneratedLesson = (lesson: ListeningLesson) => {
    setCustomLessons((prev) => [lesson, ...prev]);
  };

  const recordListeningPlay = (lessonId: string, sentenceIndex: number = 0) => {
    setUser((prev) => {
      const current = prev.listeningProgress || defaultListeningProgress;
      const filteredRecent = current.recentlyPlayedLessonIds.filter((id) => id !== lessonId);
      const newRecent = [lessonId, ...filteredRecent].slice(0, 8);

      return {
        ...prev,
        listeningProgress: {
          ...current,
          recentlyPlayedLessonIds: newRecent,
          continueLearningLessonId: lessonId,
          continueSentenceIndex: sentenceIndex,
        },
      };
    });
  };

  const addListeningSeconds = (seconds: number) => {
    if (!Number.isFinite(seconds) || seconds <= 0) return;
    setUser((prev) => {
      const current = prev.listeningProgress || defaultListeningProgress;
      const todayKey = getLocalDateKey();
      const dailySeconds = current.dailyListeningDate === todayKey ? current.dailyListeningSecondsToday : 0;
      const dailyMinutes = prev.dailyActivityDate === todayKey ? prev.dailyMinutesSpent : 0;
      return {
        ...prev,
        dailyActivityDate: todayKey,
        dailyMinutesSpent: dailyMinutes + seconds / 60,
        listeningProgress: {
          ...current,
          totalListeningSeconds: current.totalListeningSeconds + seconds,
          dailyListeningSecondsToday: dailySeconds + seconds,
          dailyListeningDate: todayKey,
        },
      };
    });
  };

  const recordDictationAttempt = (lessonId: string, score: number, missedWords: string[] = []) => {
    setUser((prev) => {
      const current = prev.listeningProgress || defaultListeningProgress;
      const attempts = current.dictationAttemptCount || 0;
      const newAvg = Math.round((current.dictationAccuracyAvg * attempts + score) / (attempts + 1));

      let newMisunderstood = [...current.misunderstoodVocab];
      missedWords.forEach((word) => {
        const found = newMisunderstood.find((m) => m.word.toLowerCase() === word.toLowerCase());
        if (found) {
          found.count += 1;
        } else {
          newMisunderstood.push({ word, count: 1, meaningVi: 'Từ chưa nghe rõ trong chính tả' });
        }
      });

      return {
        ...prev,
        totalXp: prev.totalXp + 30,
        listeningProgress: {
          ...current,
          dictationAccuracyAvg: newAvg,
          dictationAttemptCount: attempts + 1,
          misunderstoodVocab: newMisunderstood.slice(0, 10),
        },
      };
    });
  };

  const recordComprehensionAttempt = (lessonId: string, score: number) => {
    setUser((prev) => {
      const current = prev.listeningProgress || defaultListeningProgress;
      const attempts = current.comprehensionAttemptCount || 0;
      const newAvg = Math.round((current.comprehensionAccuracyAvg * attempts + score) / (attempts + 1));
      return {
        ...prev,
        totalXp: prev.totalXp + 40,
        listeningProgress: {
          ...current,
          comprehensionAccuracyAvg: newAvg,
          comprehensionAttemptCount: attempts + 1,
        },
      };
    });
  };

  const switchTrack = (track: TrackType) => {
    setUser((prev) => ({
      ...prev,
      track,
      targetGoal:
        track === 'high_school'
          ? 'High School Exam 9.0+ & IELTS Prep'
          : 'International Workplace & Meeting Fluency',
    }));
  };

  const updateGrade = (grade: HighSchoolGrade) => {
    setUser((prev) => ({ ...prev, grade }));
  };

  const updateOccupation = (occupation: ProfessionalOccupation) => {
    setUser((prev) => ({ ...prev, occupation }));
  };

  const updateCefrLevel = (cefrLevel: CEFRLevel) => {
    setUser((prev) => ({ ...prev, cefrLevel }));
  };

  const addXp = (amount: number) => {
    setUser((prev) => ({
      ...prev,
      totalXp: prev.totalXp + amount,
    }));
  };

  const completeLesson = (lessonId: string, type: 'listening' | 'speaking' | 'roleplay', score?: number) => {
    setUser((prev) => {
      const alreadyCompleted = prev.completedLessonIds.includes(lessonId);
      if (alreadyCompleted) return prev;
      const currentListen = prev.listeningProgress || defaultListeningProgress;
      const nextScores = typeof score === 'number' && Number.isFinite(score)
        ? [...(type === 'listening' ? prev.recentListeningScores : type === 'speaking' ? prev.recentSpeakingScores : prev.recentPronunciationScores).slice(-19), Math.max(0, Math.min(100, score))]
        : null;
      return {
        ...prev,
        completedLessonIds: [...prev.completedLessonIds, lessonId],
        totalXp: prev.totalXp + 50,
        ...(type === 'listening' && nextScores ? { recentListeningScores: nextScores } : {}),
        ...(type === 'speaking' && nextScores ? { recentSpeakingScores: nextScores } : {}),

        listeningProgress: {
          ...currentListen,
          completedListeningCount: type === 'listening' ? currentListen.completedListeningCount + 1 : currentListen.completedListeningCount,
        },
      };
    });
  };

  const addVocabWord = (word: VocabItem) => {
    setVocabBank((prev) => {
      if (prev.some((v) => v.word.toLowerCase() === word.word.toLowerCase())) {
        return prev;
      }
      return [word, ...prev];
    });
  };

  const toggleVocabBookmark = (id: string) => {
    setUser((prev) => {
      const exists = prev.bookmarkedVocabIds.includes(id);
      return {
        ...prev,
        bookmarkedVocabIds: exists
          ? prev.bookmarkedVocabIds.filter((item) => item !== id)
          : [...prev.bookmarkedVocabIds, id],
      };
    });
  };

  // Phase 7: persist an honest, lightweight spaced-repetition schedule per vocabulary item.
  const recordVocabReview = (id: string, remembered: boolean) => {
    const now = new Date();
    setVocabBank((previous) => previous.map((item) => {
      if (item.id !== id) return item;
      const nextCount = (item.reviewCount || 0) + 1;
      const masteryLevel = remembered
        ? Math.min(5, item.masteryLevel + 1)
        : Math.max(0, item.masteryLevel - 1);
      const intervalsInDays = [1, 3, 7, 14, 30];
      const nextReview = new Date(now.getTime() + (remembered
        ? intervalsInDays[Math.max(0, Math.min(4, masteryLevel - 1))] * 24 * 60 * 60 * 1000
        : 10 * 60 * 1000));
      return {
        ...item,
        masteryLevel,
        lastReviewed: now.toISOString(),
        nextReviewAt: nextReview.toISOString(),
        reviewCount: nextCount,
        successfulReviewCount: (item.successfulReviewCount || 0) + (remembered ? 1 : 0),
      };
    }));
    if (remembered) {
      setUser((previous) => ({ ...previous, totalXp: previous.totalXp + 5 }));
    }
  };

  const audioFeedbackSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.25);
    } catch (e) {
      // AudioContext muted or not allowed
    }
  };

  const recordSpeakingResult = (result: SpeakingResultRecord) => {
    setUser((prev) => {
      const spk = prev.speakingProgress || defaultSpeakingProgress;
      const newHistory = [result, ...spk.history].slice(0, 15);

      let newReadAloudCount = spk.readAloudCompletedCount;
      let newShadowingCount = spk.shadowingCompletedCount;
      let newFreeSpeakingCount = spk.freeSpeakingCompletedCount;
      let xpEarned = 35;

      if (result.type === 'read_aloud') {
        newReadAloudCount += 1;
        xpEarned = 45;
      } else if (result.type === 'shadowing') {
        newShadowingCount += 1;
        xpEarned = 40;
      } else if (result.type === 'free_speaking') {
        newFreeSpeakingCount += 1;
        xpEarned = 60;
      }

      const priorSpeakingScores = spk.history.map((item) => item.score).filter(Number.isFinite);
      const newSpeakingAvg = Math.round((priorSpeakingScores.reduce((sum, value) => sum + value, 0) + result.score) / (priorSpeakingScores.length + 1));
      const previousPronunciationScores = spk.history.filter((item) => item.type === 'pronunciation').map((item) => item.score).filter(Number.isFinite);
      const newPronuncAvg = result.type === 'pronunciation' ? Math.round((previousPronunciationScores.reduce((sum, value) => sum + value, 0) + result.score) / (previousPronunciationScores.length + 1)) : spk.pronunciationAccuracyAvg;
      const newFluencyAvg = result.type === 'free_speaking' ? newSpeakingAvg : spk.fluencyScoreAvg;

      return {
        ...prev,
        totalXp: prev.totalXp + xpEarned,

        recentSpeakingScores: [...prev.recentSpeakingScores.slice(-4), result.score],
        speakingProgress: {
          ...spk,
          totalSpeakingMinutes: spk.totalSpeakingMinutes,
          readAloudCompletedCount: newReadAloudCount,
          shadowingCompletedCount: newShadowingCount,
          freeSpeakingCompletedCount: newFreeSpeakingCount,
          pronunciationAccuracyAvg: newPronuncAvg,
          fluencyScoreAvg: newFluencyAvg,
          history: newHistory,
        },
      };
    });
  };

  const updatePronunciationMemoryMiss = (pairLabel: string, soundSymbol: string) => {
    setUser((prev) => {
      const spk = prev.speakingProgress || defaultSpeakingProgress;
      const existing = [...spk.pronunciationMemory];
      const index = existing.findIndex(
        (m) => m.pairLabel.toLowerCase() === pairLabel.toLowerCase() || m.soundSymbol === soundSymbol
      );
      if (index >= 0) {
        existing[index] = {
          ...existing[index],
          missCount: existing[index].missCount + 1,
          lastTested: 'Just now',
          drilledStatus: 'needs_practice',
          priority: 'high',
        };
      } else {
        existing.unshift({
          id: `pm-${Date.now()}`,
          soundSymbol,
          pairLabel,
          missCount: 1,
          lastTested: 'Just now',
          wordExamples: [pairLabel],
          drilledStatus: 'needs_practice',
          priority: 'high',
        });
      }
      return {
        ...prev,
        speakingProgress: {
          ...spk,
          pronunciationMemory: existing,
        },
      };
    });
  };

  const markPronunciationDrillMastered = (id: string) => {
    setUser((prev) => {
      const spk = prev.speakingProgress || defaultSpeakingProgress;
      const updated = spk.pronunciationMemory.map((item) =>
        item.id === id
          ? { ...item, drilledStatus: 'mastered' as const, priority: 'low' as const, lastTested: 'Just now' }
          : item
      );
      return {
        ...prev,
        totalXp: prev.totalXp + 25,
        speakingProgress: {
          ...spk,
          pronunciationMemory: updated,
        },
      };
    });
  };

  const completeSpeakingChallenge = (challengeId: string) => {
    setUser((prev) => {
      const spk = prev.speakingProgress || defaultSpeakingProgress;
      const challenges = spk.activeChallenges.map((ch) =>
        ch.id === challengeId ? { ...ch, isCompleted: true, progressPercent: 100 } : ch
      );
      const target = spk.activeChallenges.find((c) => c.id === challengeId);
      const xp = target ? target.xpReward : 50;
      return {
        ...prev,
        totalXp: prev.totalXp + xp,
        speakingProgress: {
          ...spk,
          activeChallenges: challenges,
        },
      };
    });
  };

  const addSpeakingMinutes = (minutes: number) => {
    setUser((prev) => {
      const spk = prev.speakingProgress || defaultSpeakingProgress;
      return {
        ...prev,
        dailyActivityDate: getLocalDateKey(),
        dailyMinutesSpent: (prev.dailyActivityDate === getLocalDateKey() ? prev.dailyMinutesSpent : 0) + minutes,
        speakingProgress: {
          ...spk,
          totalSpeakingMinutes: spk.totalSpeakingMinutes + minutes,
        },
      };
    });
  };

  const saveConversationSession = (session: ConversationSessionRecord) => {
    setUser((prev) => {
      const conv = prev.conversationProgress || defaultConversationProgress;
      const updated = [session, ...conv.savedSessions.filter((s) => s.id !== session.id)].slice(0, 20);
      return {
        ...prev,
        totalXp: prev.totalXp + 50,
        dailyActivityDate: getLocalDateKey(),
        dailyMinutesSpent: (prev.dailyActivityDate === getLocalDateKey() ? prev.dailyMinutesSpent : 0) + session.durationMinutes,
        conversationProgress: {
          ...conv,
          totalConversationMinutes: conv.totalConversationMinutes + session.durationMinutes,
          completedSessionsCount: conv.completedSessionsCount + 1,
          totalTurnsCount: conv.totalTurnsCount + session.turns.length,
          savedSessions: updated,
        },
      };
    });
  };

  const deleteConversationSession = (sessionId: string) => {
    setUser((prev) => {
      const conv = prev.conversationProgress || defaultConversationProgress;
      return {
        ...prev,
        conversationProgress: {
          ...conv,
          savedSessions: conv.savedSessions.filter((s) => s.id !== sessionId),
        },
      };
    });
  };

  const clearAllConversationHistory = () => {
    setUser((prev) => {
      const conv = prev.conversationProgress || defaultConversationProgress;
      return {
        ...prev,
        conversationProgress: {
          ...conv,
          savedSessions: [],
        },
      };
    });
  };

  const addConversationMinutes = (minutes: number) => {
    setUser((prev) => {
      const conv = prev.conversationProgress || defaultConversationProgress;
      return {
        ...prev,
        dailyActivityDate: getLocalDateKey(),
        dailyMinutesSpent: (prev.dailyActivityDate === getLocalDateKey() ? prev.dailyMinutesSpent : 0) + minutes,
        conversationProgress: {
          ...conv,
          totalConversationMinutes: conv.totalConversationMinutes + minutes,
        },
      };
    });
  };

  // Phase 5: Roleplay Engine Methods
  const allRoleplayScenarios: RoleplayScenario[] = [
    ...ROLEPLAY_SCENARIOS,
    ...(user.roleplayProgress?.customScenarios || []),
  ];

  const saveRoleplaySession = (session: RoleplaySessionRecord) => {
    setUser((prev) => {
      const rp = prev.roleplayProgress || defaultRoleplayProgress;
      const newHistory = [session, ...rp.history.filter((s) => s.id !== session.id)].slice(0, 20);
      const previousScores = rp.history.map((item) => item.assessment.overallScore).filter(Number.isFinite);
      const newCount = previousScores.length + 1;
      const newAvgScore = Math.round((previousScores.reduce((sum, value) => sum + value, 0) + session.assessment.overallScore) / newCount);

      return {
        ...prev,
        totalXp: prev.totalXp + 80,
        dailyActivityDate: getLocalDateKey(),
        dailyMinutesSpent: (prev.dailyActivityDate === getLocalDateKey() ? prev.dailyMinutesSpent : 0) + session.durationMinutes,
        roleplayProgress: {
          ...rp,
          totalRoleplayMinutes: rp.totalRoleplayMinutes + session.durationMinutes,
          completedScenariosCount: newCount,
          averageScore: newAvgScore,
          history: newHistory,
        },
      };
    });
  };

  const addCustomRoleplayScenario = (scenario: RoleplayScenario) => {
    setUser((prev) => {
      const rp = prev.roleplayProgress || defaultRoleplayProgress;
      const existing = rp.customScenarios || [];
      const updated = [scenario, ...existing.filter((s) => s.id !== scenario.id)];
      return {
        ...prev,
        totalXp: prev.totalXp + 40,
        roleplayProgress: {
          ...rp,
          customScenarios: updated,
        },
      };
    });
  };

  const deleteCustomRoleplayScenario = (scenarioId: string) => {
    setUser((prev) => {
      const rp = prev.roleplayProgress || defaultRoleplayProgress;
      const existing = rp.customScenarios || [];
      return {
        ...prev,
        roleplayProgress: {
          ...rp,
          customScenarios: existing.filter((s) => s.id !== scenarioId),
        },
      };
    });
  };

  const addRoleplayMinutes = (minutes: number) => {
    setUser((prev) => {
      const rp = prev.roleplayProgress || defaultRoleplayProgress;
      return {
        ...prev,
        dailyActivityDate: getLocalDateKey(),
        dailyMinutesSpent: (prev.dailyActivityDate === getLocalDateKey() ? prev.dailyMinutesSpent : 0) + minutes,
        roleplayProgress: {
          ...rp,
          totalRoleplayMinutes: rp.totalRoleplayMinutes + minutes,
        },
      };
    });
  };

  return (
    <AppContext.Provider
      value={{
        user,
        activeTab,
        playbackSpeed,
        setActiveTab,
        setPlaybackSpeed,
        switchTrack,
        updateGrade,
        updateOccupation,
        updateCefrLevel,
        addXp,
        completeLesson,
        vocabBank,
        addVocabWord,
        toggleVocabBookmark,
        recordVocabReview,
        audioFeedbackSound,
        allListeningLessons,
        addGeneratedLesson,
        recordListeningPlay,
        addListeningSeconds,
        recordDictationAttempt,
        recordComprehensionAttempt,
        recordSpeakingResult,
        updatePronunciationMemoryMiss,
        markPronunciationDrillMastered,
        completeSpeakingChallenge,
        addSpeakingMinutes,
        saveConversationSession,
        deleteConversationSession,
        clearAllConversationHistory,
        addConversationMinutes,
        allRoleplayScenarios,
        saveRoleplaySession,
        addCustomRoleplayScenario,
        deleteCustomRoleplayScenario,
        addRoleplayMinutes,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
