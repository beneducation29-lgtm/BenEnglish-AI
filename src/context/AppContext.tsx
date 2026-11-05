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
  DEFAULT_PRONUNCIATION_MEMORY,
  ROLEPLAY_SCENARIOS,
} from '../data/curriculumData';

export type ActiveTab =
  | 'home'
  | 'listening'
  | 'speaking'
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
  totalListeningSeconds: 1420, // ~23 mins
  recentlyPlayedLessonIds: ['hs-env-01', 'pro-meet-01'],
  continueLearningLessonId: 'hs-env-01',
  continueSentenceIndex: 2,
  dailyListeningGoalMinutes: 15,
  dailyListeningSecondsToday: 480, // 8 mins
  dictationAccuracyAvg: 84,
  comprehensionAccuracyAvg: 88,
  completedListeningCount: 2,
  misunderstoodVocab: [
    { word: 'deliverable', count: 2, meaningVi: 'sản phẩm bàn giao cam kết', ipa: '/dɪˈlɪv.ər.ə.bəl/' },
    { word: 'single-use', count: 1, meaningVi: 'dùng một lần', ipa: '/ˌsɪŋ.ɡəlˈjuːs/' },
  ],
};

const defaultSpeakingProgress: SpeakingProgressRecord = {
  totalSpeakingMinutes: 24,
  pronunciationAccuracyAvg: 83,
  fluencyScoreAvg: 80,
  readAloudCompletedCount: 4,
  shadowingCompletedCount: 6,
  freeSpeakingCompletedCount: 3,
  pronunciationMemory: DEFAULT_PRONUNCIATION_MEMORY,
  history: [
    {
      id: 'spk-hist-1',
      title: 'Youth Climate Initiative & Clean Ocean Drive',
      type: 'read_aloud',
      date: 'Today, 10:15 AM',
      score: 86,
      cefrLevel: 'B1',
      wpm: 122,
      userTranscript: 'Last semester our high school launched a comprehensive youth climate initiative...',
      targetText: 'Last semester, our high school launched a comprehensive youth climate initiative...',
      feedbackSummary: 'Great cadence (122 WPM). Good attention to ending consonant clusters.',
    },
    {
      id: 'spk-hist-2',
      title: 'Agile Sprint Planning & Resource Allocation',
      type: 'shadowing',
      date: 'Yesterday, 4:30 PM',
      score: 91,
      cefrLevel: 'B2',
      userTranscript: 'Today we need to lock down the scope for Sprint 24.',
      targetText: 'Today we need to lock down the scope for Sprint 24.',
      feedbackSummary: 'Near-perfect transcription match. High rhythmic fluency.',
    },
    {
      id: 'spk-hist-3',
      title: 'High School Smartphones Debate',
      type: 'free_speaking',
      date: '2 days ago',
      score: 79,
      cefrLevel: 'B1',
      userTranscript: 'In my opinion, smartphones can be very useful for research, but notifications distract students.',
      feedbackSummary: 'Clear thesis statement. Expand linking phrases like "Furthermore" and "On the other hand".',
    },
  ],
  activeChallenges: SPEAKING_CHALLENGES,
};

const defaultConversationProgress: ConversationProgressRecord = {
  totalConversationMinutes: 32,
  completedSessionsCount: 3,
  totalTurnsCount: 22,
  savedSessions: [
    {
      id: 'conv-init-1',
      title: 'School Life & Marine Biology Discussion',
      startedAt: 'Today, 2:15 PM',
      durationMinutes: 6,
      personaId: 'friendly_teacher',
      modeId: 'school',
      turns: [
        {
          id: 'turn-1',
          role: 'assistant',
          content: "Hello! I'm Teacher Emma. How has your school day been going so far? Tell me about your favorite class or what you did today!",
          timestamp: '2:15 PM',
          phoneticTip: "Notice the natural rhythm: 'How has your day been /going/ so far?'",
        },
        {
          id: 'turn-2',
          role: 'user',
          content: 'I had an interesting biology class today. We studied marine ecosystems and coral reefs.',
          timestamp: '2:16 PM',
        },
        {
          id: 'turn-3',
          role: 'assistant',
          content: "Marine ecosystems are fascinating! Coral reefs support so much biodiversity. Did your teacher explain how rising ocean temperatures affect them?",
          timestamp: '2:16 PM',
          phoneticTip: "Stress on the third syllable: /bi-o-di-VER-si-ty/",
        },
      ],
      summaryReport: {
        summary: 'Engaging dialogue discussing high school biology, ocean temperatures, and environmental conservation.',
        newVocabulary: [
          { word: 'biodiversity', ipa: '/ˌbaɪ.əʊ.daɪˈvɜː.sə.ti/', definition: 'The variety of plant and animal life in a habitat.', meaningVi: 'sự đa dạng sinh học' },
          { word: 'marine', ipa: '/məˈriːn/', definition: 'Related to or found in the sea.', meaningVi: 'thuộc về biển' },
        ],
        grammarMistakes: [],
        pronunciationObservations: ['Clear phrasing', 'Good pacing on multi-syllable terms'],
        strongPoints: ['Natural topical transitions', 'Good use of academic vocabulary'],
        improvementSuggestions: ['Continue practicing relative clauses with "which" and "where"'],
        recommendedPractice: {
          lab: 'listening',
          title: 'Youth Climate Initiative & Clean Ocean Drive',
          targetFocus: 'Academic environmental vocabulary',
        },
      },
    },
  ],
};

const defaultRoleplayProgress: RoleplayProgressRecord = {
  totalRoleplayMinutes: 18,
  completedScenariosCount: 2,
  averageScore: 86,
  customScenarios: [],
  history: [
    {
      id: 'rp-hist-1',
      scenarioId: 'rp-hs-friends',
      scenarioTitle: 'Making Friends: Joining the Campus Club',
      track: 'high_school',
      date: 'Yesterday, 3:20 PM',
      assistanceMode: 'normal',
      durationMinutes: 6,
      turnsCount: 5,
      assessment: {
        overallScore: 88,
        cefrEquivalent: 'B1+',
        taskCompletionScore: 90,
        communicationEffectiveness: 88,
        fluencyScore: 84,
        vocabularyScore: 86,
        grammarScore: 88,
        appropriatenessScore: 92,
        completedObjectives: [
          'Ask about the meeting schedule and membership fee',
          'Explain your interest in technology or problem-solving',
          'Exchange social handles or phone numbers to stay updated',
        ],
        missedObjectives: [],
        keyStrengths: [
          'Friendly and proactive interpersonal tone',
          'Natural follow-up questioning technique',
        ],
        criticalAreasForImprovement: [
          'Use richer transitions when shifting subjects',
        ],
        grammarAndVocabularyHighlights: [
          {
            original: 'I am study here since two years',
            correction: "I've been studying here for two years",
            explanation: 'Present perfect continuous for ongoing duration',
            vietnameseNote: 'Dùng thì hiện tại hoàn thành tiếp diễn cho hành động kéo dài từ quá khứ đến hiện tại.',
          },
        ],
        modelDialogueExcerpt: "I'd love to have you join us! Our robotics team meets every Wednesday at 4 PM in the science wing.",
        actionableNextStep: 'Try Normal or Challenge mode on high-stakes negotiations next.',
      },
    },
  ],
};

const defaultUser: UserProfile = {
  name: 'Ben Learner',
  email: 'beneducation29@gmail.com',
  track: 'high_school',
  grade: 'Grade 11',
  occupation: 'Software & Tech',
  cefrLevel: 'B1',
  targetGoal: 'IELTS Speaking 7.0 & Academic Fluency',
  streakDays: 6,
  totalXp: 1850,
  dailyGoalMinutes: 25,
  dailyMinutesSpent: 16,
  completedLessonIds: ['hs-env-01'],
  bookmarkedVocabIds: ['v-b1-01', 'v-hs-1'],
  recentSpeakingScores: [72, 78, 81],
  recentListeningScores: [80, 85, 90],
  recentPronunciationScores: [75, 82, 84],
  listeningProgress: defaultListeningProgress,
  speakingProgress: defaultSpeakingProgress,
  conversationProgress: defaultConversationProgress,
  roleplayProgress: defaultRoleplayProgress,
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('benenglish_user');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return {
            ...defaultUser,
            ...parsed,
            listeningProgress: {
              ...defaultListeningProgress,
              ...(parsed.listeningProgress || {}),
            },
            speakingProgress: {
              ...defaultSpeakingProgress,
              ...(parsed.speakingProgress || {}),
            },
            conversationProgress: {
              ...defaultConversationProgress,
              ...(parsed.conversationProgress || {}),
            },
            roleplayProgress: {
              ...defaultRoleplayProgress,
              ...(parsed.roleplayProgress || {}),
              customScenarios: parsed.roleplayProgress?.customScenarios || [],
              history: parsed.roleplayProgress?.history || defaultRoleplayProgress.history,
            },
          };
        } catch (e) {
          // ignore
        }
      }
    }
    return defaultUser;
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);

  const [vocabBank, setVocabBank] = useState<VocabItem[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('benenglish_vocab');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          // ignore
        }
      }
    }
    return INITIAL_VOCABULARY_BANK;
  });

  const [customLessons, setCustomLessons] = useState<ListeningLesson[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('benenglish_custom_lessons');
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
    localStorage.setItem('benenglish_user', JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    localStorage.setItem('benenglish_vocab', JSON.stringify(vocabBank));
  }, [vocabBank]);

  useEffect(() => {
    localStorage.setItem('benenglish_custom_lessons', JSON.stringify(customLessons));
  }, [customLessons]);

  const allListeningLessons: ListeningLesson[] = [
    ...HIGH_SCHOOL_LISTENING_LESSONS,
    ...PROFESSIONAL_LISTENING_LESSONS,
    ...IELTS_LISTENING_LESSONS,
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
    setUser((prev) => {
      const current = prev.listeningProgress || defaultListeningProgress;
      return {
        ...prev,
        dailyMinutesSpent: prev.dailyMinutesSpent + Math.floor(seconds / 60),
        listeningProgress: {
          ...current,
          totalListeningSeconds: current.totalListeningSeconds + seconds,
          dailyListeningSecondsToday: current.dailyListeningSecondsToday + seconds,
        },
      };
    });
  };

  const recordDictationAttempt = (lessonId: string, score: number, missedWords: string[] = []) => {
    setUser((prev) => {
      const current = prev.listeningProgress || defaultListeningProgress;
      const newAvg = Math.round((current.dictationAccuracyAvg * 3 + score) / 4);

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
          misunderstoodVocab: newMisunderstood.slice(0, 10),
        },
      };
    });
  };

  const recordComprehensionAttempt = (lessonId: string, score: number) => {
    setUser((prev) => {
      const current = prev.listeningProgress || defaultListeningProgress;
      const newAvg = Math.round((current.comprehensionAccuracyAvg * 3 + score) / 4);
      return {
        ...prev,
        totalXp: prev.totalXp + 40,
        listeningProgress: {
          ...current,
          comprehensionAccuracyAvg: newAvg,
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
      const newCompleted = prev.completedLessonIds.includes(lessonId)
        ? prev.completedLessonIds
        : [...prev.completedLessonIds, lessonId];
      const newRecent = score
        ? type === 'listening'
          ? [...prev.recentListeningScores.slice(-4), score]
          : type === 'speaking'
          ? [...prev.recentSpeakingScores.slice(-4), score]
          : [...prev.recentPronunciationScores.slice(-4), score]
        : prev.recentSpeakingScores;

      const currentListen = prev.listeningProgress || defaultListeningProgress;
      const newCompletedCount =
        type === 'listening' && !prev.completedLessonIds.includes(lessonId)
          ? currentListen.completedListeningCount + 1
          : currentListen.completedListeningCount;

      return {
        ...prev,
        completedLessonIds: newCompleted,
        totalXp: prev.totalXp + 50,
        dailyMinutesSpent: prev.dailyMinutesSpent + 6,
        ...(type === 'listening' ? { recentListeningScores: newRecent } : {}),
        ...(type === 'speaking' ? { recentSpeakingScores: newRecent } : {}),
        ...(type === 'roleplay' ? { recentPronunciationScores: newRecent } : {}),
        listeningProgress: {
          ...currentListen,
          completedListeningCount: newCompletedCount,
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

      const newPronuncAvg = Math.round((spk.pronunciationAccuracyAvg * 3 + result.score) / 4);
      const newFluencyAvg = Math.round(
        (spk.fluencyScoreAvg * 3 + (result.score > 70 ? result.score : 70)) / 4
      );

      return {
        ...prev,
        totalXp: prev.totalXp + xpEarned,
        dailyMinutesSpent: prev.dailyMinutesSpent + 5,
        recentSpeakingScores: [...prev.recentSpeakingScores.slice(-4), result.score],
        speakingProgress: {
          ...spk,
          totalSpeakingMinutes: spk.totalSpeakingMinutes + 3,
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
        dailyMinutesSpent: prev.dailyMinutesSpent + minutes,
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
        dailyMinutesSpent: prev.dailyMinutesSpent + session.durationMinutes,
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
        dailyMinutesSpent: prev.dailyMinutesSpent + minutes,
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
      const newCount = rp.completedScenariosCount + 1;
      const newAvgScore = Math.round(
        (rp.averageScore * rp.completedScenariosCount + session.assessment.overallScore) / newCount
      );

      return {
        ...prev,
        totalXp: prev.totalXp + 80,
        dailyMinutesSpent: prev.dailyMinutesSpent + session.durationMinutes,
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
        dailyMinutesSpent: prev.dailyMinutesSpent + minutes,
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
