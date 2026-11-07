import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  evaluatePronunciation,
  evaluateSpeaking,
  evaluateReadAloud,
  generateSpeakingTopic,
  PronunciationEvalData,
  SpeakingEvalData,
} from '../services/api';
import { audioEngine, SpeechRecognitionSession, isSpeechRecognitionSupported } from '../services/speech';
import {
  IPA_SOUNDS_DATA,
  READ_ALOUD_PASSAGES,
  FREE_SPEAKING_TOPICS_CATALOG,
  SPEAKING_CHALLENGES,
} from '../data/curriculumData';
import { ADDITIONAL_FREE_SPEAKING_TOPICS, ADDITIONAL_READ_ALOUD_PASSAGES } from '../data/skillsPracticePack';
import {
  Mic,
  Volume2,
  Sparkles,
  Award,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  BookOpen,
  ArrowRight,
  TrendingUp,
  Clock,
  Play,
  RotateCcw,
  Zap,
  Target,
  Compass,
  Filter,
  Check,
  ChevronRight,
  Flame,
  Info,
  Sliders,
  FileText,
  VolumeX,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { CEFRLevel, TrackType, ReadAloudPassage, FreeSpeakingTopic, SpeakingResultRecord, IPASound } from '../types';

type SpeakingTab =
  | 'dashboard'
  | 'coach'
  | 'read_aloud'
  | 'shadowing'
  | 'free_speaking'
  | 'memory'
  | 'challenges_history';

export const SpeakingLabView: React.FC = () => {
  const {
    user,
    completeLesson,
    audioFeedbackSound,
    recordSpeakingResult,
    updatePronunciationMemoryMiss,
    markPronunciationDrillMastered,
    completeSpeakingChallenge,
    addSpeakingMinutes,
  } = useApp();

  const [activeTab, setActiveTab] = useState<SpeakingTab>('dashboard');
  const [selectedCefr, setSelectedCefr] = useState<string>(user.cefrLevel);
  const [selectedTrackFilter, setSelectedTrackFilter] = useState<string>(user.track);

  // Mic permission status
  const [hasMicSupport] = useState<boolean>(isSpeechRecognitionSupported());
  const [micError, setMicError] = useState<string | null>(null);

  // -------------------------------------------------------------
  // 1. PRONUNCIATION COACH STATE
  // -------------------------------------------------------------
  const [ipaCategory, setIpaCategory] = useState<'vowels' | 'consonants' | 'suprasegmentals'>('consonants');
  const [selectedSound, setSelectedSound] = useState<IPASound>(IPA_SOUNDS_DATA[0]);
  const [isRecordingCoach, setIsRecordingCoach] = useState(false);
  const [coachTranscript, setCoachTranscript] = useState('');
  const [coachSession, setCoachSession] = useState<SpeechRecognitionSession | null>(null);
  const [coachEvalResult, setCoachEvalResult] = useState<PronunciationEvalData | null>(null);
  const [isEvaluatingCoach, setIsEvaluatingCoach] = useState(false);
  const [drillingWord, setDrillingWord] = useState<string>(IPA_SOUNDS_DATA[0].exampleWord);

  // -------------------------------------------------------------
  // 2. READ ALOUD STATE
  // -------------------------------------------------------------
  const allReadAloudPassages = [...READ_ALOUD_PASSAGES, ...ADDITIONAL_READ_ALOUD_PASSAGES];
  const allFreeSpeakingTopics = [...FREE_SPEAKING_TOPICS_CATALOG, ...ADDITIONAL_FREE_SPEAKING_TOPICS];

  const filteredPassages = allReadAloudPassages.filter((p) => {
    const matchTrack =
      selectedTrackFilter === 'all' || p.track === selectedTrackFilter || p.track === 'both';
    const matchCefr = selectedCefr === 'all' || p.level === selectedCefr;
    return matchTrack && matchCefr;
  });

  const [selectedPassage, setSelectedPassage] = useState<ReadAloudPassage>(
    filteredPassages[0] || allReadAloudPassages[0]
  );
  const [readAloudMode, setReadAloudMode] = useState<'full' | 'sentence'>('full');
  const [activeSentenceIndex, setActiveSentenceIndex] = useState(0);
  const [isRecordingReadAloud, setIsRecordingReadAloud] = useState(false);
  const [readAloudTranscript, setReadAloudTranscript] = useState('');
  const [readAloudSession, setReadAloudSession] = useState<SpeechRecognitionSession | null>(null);
  const [readAloudDuration, setReadAloudDuration] = useState(0);
  const [readAloudTimerId, setReadAloudTimerId] = useState<any>(null);
  const [readAloudResult, setReadAloudResult] = useState<any | null>(null);
  const [isEvaluatingReadAloud, setIsEvaluatingReadAloud] = useState(false);

  // -------------------------------------------------------------
  // 3. SHADOWING ENGINE STATE
  // -------------------------------------------------------------
  const shadowingSentences = selectedPassage.sentences || [];
  const [shadowingIndex, setShadowingIndex] = useState(0);
  const [shadowingSpeed, setShadowingSpeed] = useState<number>(0.9);
  const [isListeningNative, setIsListeningNative] = useState(false);
  const [isRecordingShadow, setIsRecordingShadow] = useState(false);
  const [shadowTranscript, setShadowTranscript] = useState('');
  const [shadowSession, setShadowSession] = useState<SpeechRecognitionSession | null>(null);
  const [shadowDiffResult, setShadowDiffResult] = useState<{
    score: number;
    tokens: { word: string; status: 'matched' | 'missed' | 'extra' }[];
    feedback: string;
  } | null>(null);

  // -------------------------------------------------------------
  // 4. FREE SPEAKING STATE
  // -------------------------------------------------------------
  const filteredTopics = allFreeSpeakingTopics.filter((t) => {
    const matchTrack =
      selectedTrackFilter === 'all' || t.track === selectedTrackFilter || t.track === 'both';
    const matchCefr = selectedCefr === 'all' || t.level === selectedCefr;
    return matchTrack && matchCefr;
  });

  const [selectedTopic, setSelectedTopic] = useState<FreeSpeakingTopic>(
    filteredTopics[0] || allFreeSpeakingTopics[0]
  );
  const [isRecordingFree, setIsRecordingFree] = useState(false);
  const [freeTranscript, setFreeTranscript] = useState('');
  const [useAiTranscription, setUseAiTranscription] = useState(false);
  const [freeSession, setFreeSession] = useState<SpeechRecognitionSession | null>(null);
  const [freeDuration, setFreeDuration] = useState(0);
  const [freeTimerId, setFreeTimerId] = useState<any>(null);
  const [freeEvalResult, setFreeEvalResult] = useState<SpeakingEvalData | null>(null);
  const [isEvaluatingFree, setIsEvaluatingFree] = useState(false);
  const [isGeneratingCustomTopic, setIsGeneratingCustomTopic] = useState(false);

  // -------------------------------------------------------------
  // 5. PRONUNCIATION MEMORY ACTIVE DRILL MODAL
  // -------------------------------------------------------------
  const [activeMemoryDrillItem, setActiveMemoryDrillItem] = useState<any | null>(null);
  const [memoryDrillStep, setMemoryDrillStep] = useState<'listen' | 'record' | 'result'>('listen');
  const [memoryDrillTranscript, setMemoryDrillTranscript] = useState('');
  const [isRecordingMemory, setIsRecordingMemory] = useState(false);
  const [memorySession, setMemorySession] = useState<SpeechRecognitionSession | null>(null);

  // Clean up timers & sessions on unmount
  useEffect(() => {
    return () => {
      if (readAloudTimerId) clearInterval(readAloudTimerId);
      if (freeTimerId) clearInterval(freeTimerId);
      audioEngine.stop();
    };
  }, [readAloudTimerId, freeTimerId]);

  // Synchronize drilling word when selected sound changes
  useEffect(() => {
    setDrillingWord(selectedSound.exampleWord);
    setCoachTranscript('');
    setCoachEvalResult(null);
  }, [selectedSound]);

  // -------------------------------------------------------------
  // HANDLERS: PRONUNCIATION COACH
  // -------------------------------------------------------------
  const playNativeSound = (text: string, rate: number = 0.85) => {
    audioEngine.stop();
    audioEngine.speak(text, { rate, pitch: 1.0 });
  };

  const startCoachRecording = (targetWord: string) => {
    setCoachTranscript('');
    setCoachEvalResult(null);
    setMicError(null);

    const session = new SpeechRecognitionSession(
      (state) => {
        setCoachTranscript(state.transcript);
      },
      (err) => setMicError(err),
      (active) => setIsRecordingCoach(active)
    );
    setCoachSession(session);
    session.start();
  };

  const stopCoachRecording = async (targetText: string) => {
    if (coachSession) coachSession.stop();
    setIsRecordingCoach(false);

    if (!coachTranscript.trim()) return;
    setIsEvaluatingCoach(true);

    try {
      const result = await evaluatePronunciation({
        targetText,
        spokenText: coachTranscript.trim(),
        track: user.track,
      });
      setCoachEvalResult(result);

      if (result.overallScore >= 75) {
        audioFeedbackSound();
        confetti({ particleCount: 30, spread: 50 });
        completeLesson('coach-drill', 'speaking', result.overallScore);
      } else {
        // Track mistake in Pronunciation Memory
        updatePronunciationMemoryMiss(
          `${selectedSound.minimalPair.wordA} vs ${selectedSound.minimalPair.wordB}`,
          selectedSound.symbol
        );
      }
    } catch (e: any) {
      console.error('Pronunciation evaluation unavailable', e);
      setCoachEvalResult(null);
      setMicError('AI pronunciation analysis is unavailable right now. No score was fabricated; please retry when the service is available.');
    } finally {
      setIsEvaluatingCoach(false);
    }
  };

  // -------------------------------------------------------------
  // HANDLERS: READ ALOUD
  // -------------------------------------------------------------
  const startReadAloud = () => {
    setReadAloudTranscript('');
    setReadAloudResult(null);
    setReadAloudDuration(0);
    setMicError(null);

    const startTime = Date.now();
    const timer = setInterval(() => {
      setReadAloudDuration(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    setReadAloudTimerId(timer);

    const session = new SpeechRecognitionSession(
      (state) => {
        setReadAloudTranscript(state.transcript);
      },
      (err) => setMicError(err),
      (active) => setIsRecordingReadAloud(active)
    );
    setReadAloudSession(session);
    session.start();
  };

  const stopReadAloud = async () => {
    if (readAloudTimerId) clearInterval(readAloudTimerId);
    if (readAloudSession) readAloudSession.stop();
    setIsRecordingReadAloud(false);

    const targetPassageText =
      readAloudMode === 'full'
        ? selectedPassage.text
        : selectedPassage.sentences[activeSentenceIndex]?.text || selectedPassage.text;

    if (!readAloudTranscript.trim()) return;
    setIsEvaluatingReadAloud(true);

    try {
      const data = await evaluateReadAloud({
        originalPassage: targetPassageText,
        userTranscript: readAloudTranscript.trim(),
        durationSeconds: Math.max(readAloudDuration, 5),
      });

      setReadAloudResult(data);
      audioFeedbackSound();

      if (data.accuracyScore >= 80) {
        confetti({ particleCount: 35, spread: 60 });
      }

      // Record result
      const record: SpeakingResultRecord = {
        id: `spk-ra-${Date.now()}`,
        title: selectedPassage.title,
        type: 'read_aloud',
        date: 'Just now',
        score: data.accuracyScore,
        cefrLevel: selectedPassage.level,
        wpm: data.wpm,
        userTranscript: readAloudTranscript.trim(),
        targetText: targetPassageText,
        feedbackSummary: `Cadence: ${data.cadenceRating} (${data.wpm} WPM). ${data.rhythmAndPacingNotes?.[0] || 'Good effort!'}`,
      };
      recordSpeakingResult(record);
      addSpeakingMinutes(Math.ceil(readAloudDuration / 60));
    } catch (e: any) {
      console.error('Read-aloud evaluation unavailable', e);
      setReadAloudResult(null);
      setMicError('AI read-aloud evaluation is unavailable right now. No score was generated; please retry when the service is available.');
    } finally {
      setIsEvaluatingReadAloud(false);
    }
  };

  // -------------------------------------------------------------
  // HANDLERS: SHADOWING ENGINE
  // -------------------------------------------------------------
  const currentShadowingSentence = shadowingSentences[shadowingIndex] || {
    id: 's-def',
    text: selectedPassage.text,
    textVi: 'Nội dung luyện nói',
  };

  const playNativeShadowing = () => {
    setIsListeningNative(true);
    audioEngine.stop();
    audioEngine.speak(currentShadowingSentence.text, {
      rate: shadowingSpeed,
      onEnd: () => setIsListeningNative(false),
      onError: () => setIsListeningNative(false),
    });
  };

  const startShadowRecording = () => {
    setShadowTranscript('');
    setShadowDiffResult(null);
    setMicError(null);

    const session = new SpeechRecognitionSession(
      (state) => {
        setShadowTranscript(state.transcript);
      },
      (err) => setMicError(err),
      (active) => setIsRecordingShadow(active)
    );
    setShadowSession(session);
    session.start();
  };

  const stopShadowRecording = () => {
    if (shadowSession) shadowSession.stop();
    setIsRecordingShadow(false);

    if (!shadowTranscript.trim()) return;

    // Word token comparison
    const targetClean = currentShadowingSentence.text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(Boolean);

    const spokenClean = shadowTranscript
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(Boolean);

    let matchCount = 0;
    const tokens = targetClean.map((w) => {
      const isMatched = spokenClean.includes(w);
      if (isMatched) matchCount++;
      return {
        word: w,
        status: (isMatched ? 'matched' : 'missed') as 'matched' | 'missed',
      };
    });

    const score = Math.round((matchCount / Math.max(targetClean.length, 1)) * 100);

    const diff = {
      score,
      tokens,
      feedback:
        score >= 85
          ? 'Exceptional shadowing rhythm and transcript correspondence!'
          : score >= 65
          ? 'Good attempt. Pay attention to missed unstressed words and ending consonants.'
          : 'Sentence needs repetition. Listen closely to the native pause boundaries.',
    };

    setShadowDiffResult(diff);
    if (score >= 80) {
      audioFeedbackSound();
      confetti({ particleCount: 25, spread: 40 });
    }

    // Save record
    const record: SpeakingResultRecord = {
      id: `spk-shd-${Date.now()}`,
      title: `Shadowing: ${selectedPassage.title} (Sentence ${shadowingIndex + 1})`,
      type: 'shadowing',
      date: 'Just now',
      score,
      cefrLevel: selectedPassage.level,
      userTranscript: shadowTranscript.trim(),
      targetText: currentShadowingSentence.text,
      feedbackSummary: diff.feedback,
    };
    recordSpeakingResult(record);
  };

  // -------------------------------------------------------------
  // HANDLERS: FREE SPEAKING
  // -------------------------------------------------------------
  const handleGenerateAiTopic = async () => {
    setIsGeneratingCustomTopic(true);
    try {
      const data = await generateSpeakingTopic({
        track: user.track,
        cefrLevel: user.cefrLevel,
        occupationOrGrade: user.track === 'high_school' ? user.grade : user.occupation,
        previousMistakes: user.speakingProgress?.pronunciationMemory.map((p) => p.pairLabel),
      });

      const newTopic: FreeSpeakingTopic = {
        id: `ai-top-${Date.now()}`,
        title: data.title,
        track: user.track,
        level: user.cefrLevel,
        category: data.category,
        prompt: data.prompt,
        guidingQuestions: data.guidingQuestions || [],
        suggestedVocab: data.suggestedVocab || [],
        targetMinutes: data.targetMinutes || 2,
      };

      setSelectedTopic(newTopic);
      audioFeedbackSound();
    } catch (e: any) {
      console.warn('Generate topic fallback', e);
    } finally {
      setIsGeneratingCustomTopic(false);
    }
  };

  const startFreeSpeaking = () => {
    setFreeTranscript('');
    setFreeEvalResult(null);
    setFreeDuration(0);
    setMicError(null);

    const startTime = Date.now();
    const timer = setInterval(() => {
      setFreeDuration(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    setFreeTimerId(timer);

    const session = new SpeechRecognitionSession(
      (state) => {
        setFreeTranscript(state.transcript);
      },
      (err) => setMicError(err),
      (active) => setIsRecordingFree(active),
      undefined,
      { cloudTranscription: useAiTranscription }
    );
    setFreeSession(session);
    session.start();
  };

  const stopFreeSpeaking = () => {
    if (freeTimerId) clearInterval(freeTimerId);

    const evaluateTranscript = async (recognizedText: string) => {
      const transcript = recognizedText.trim();
      setFreeTranscript(recognizedText);
      setIsRecordingFree(false);
      if (!transcript) {
        setMicError('No complete speech transcript was captured. Try again or type your response.');
        return;
      }

      setIsEvaluatingFree(true);
      try {
        const data = await evaluateSpeaking({
          topic: selectedTopic.title + ': ' + selectedTopic.prompt,
          userTranscript: transcript,
          durationSeconds: Math.max(freeDuration, 10),
          track: user.track,
          level: selectedTopic.level,
        });

        setFreeEvalResult(data);
        audioFeedbackSound();
        if (data.overallBandEstimate >= 6.5) confetti({ particleCount: 40, spread: 60 });

        const score = Math.round(data.overallBandEstimate * 10);
        const record: SpeakingResultRecord = {
          id: 'spk-free-' + Date.now(),
          title: selectedTopic.title,
          type: 'free_speaking',
          date: 'Just now',
          score,
          cefrLevel: selectedTopic.level,
          userTranscript: transcript,
          feedbackSummary: 'Band ' + data.overallBandEstimate + ' (' + data.cefrEstimate + '). Fluency: ' + data.rubricScores.fluencyCoherence + '/10. ' + (data.strengths[0] || ''),
        };
        recordSpeakingResult(record);
        addSpeakingMinutes(Math.ceil(freeDuration / 60));
      } catch (e: any) {
        console.error('Free-speaking evaluation unavailable', e);
        setFreeEvalResult(null);
        setMicError('AI speaking evaluation is unavailable right now. No band score or feedback was invented; please retry when the service is available.');
      } finally {
        setIsEvaluatingFree(false);
      }
    };

    if (freeSession) {
      freeSession.stop((recognizedText) => {
        void evaluateTranscript(recognizedText || freeTranscript);
      });
    } else {
      void evaluateTranscript(freeTranscript);
    }
  };

  // -------------------------------------------------------------
  // HANDLERS: PRONUNCIATION MEMORY DRILL
  // -------------------------------------------------------------
  const openMemoryDrill = (item: any) => {
    setActiveMemoryDrillItem(item);
    setMemoryDrillStep('listen');
    setMemoryDrillTranscript('');
    setIsRecordingMemory(false);
  };

  const startMemoryDrillRecording = () => {
    setMemoryDrillTranscript('');
    setMicError(null);

    const session = new SpeechRecognitionSession(
      (state) => {
        setMemoryDrillTranscript(state.transcript);
      },
      (err) => setMicError(err),
      (active) => setIsRecordingMemory(active)
    );
    setMemorySession(session);
    session.start();
  };

  const stopMemoryDrillRecording = () => {
    if (memorySession) memorySession.stop();
    setIsRecordingMemory(false);
    setMemoryDrillStep('result');
    audioFeedbackSound();
  };

  // -------------------------------------------------------------
  // PROGRESS STATS
  // -------------------------------------------------------------
  const speakingStats = user.speakingProgress || {
    totalSpeakingMinutes: 0,
    pronunciationAccuracyAvg: 0,
    fluencyScoreAvg: 0,
    readAloudCompletedCount: 0,
    shadowingCompletedCount: 0,
    freeSpeakingCompletedCount: 0,
    pronunciationMemory: [],
    history: [],
    activeChallenges: SPEAKING_CHALLENGES.map((challenge) => ({ ...challenge, isCompleted: false, progressPercent: 0 })),
  };
  const pronunciationSampleCount = speakingStats.history.filter((item) => item.type === 'pronunciation').length;
  const fluencySampleCount = speakingStats.history.filter((item) => item.type === 'free_speaking').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* --------------------------------------------------------- */}
      {/* SECTION 1: HEADER & STUDIO SELECTOR                       */}
      {/* --------------------------------------------------------- */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-teal-600 bg-teal-50 px-2.5 py-0.5 rounded-md border border-teal-200">
                AI Speaking & Pronunciation Lab
              </span>
              <span className="text-xs text-slate-500">
                Track: {user.track === 'high_school' ? `High School (${user.grade})` : `Professional (${user.occupation})`}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              Master Natural Spoken English & Native Rhythm
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-3xl">
              From exact IPA tongue placement to 130 WPM fluent reading cadence and IELTS Band 7.5+ impromptu speaking.
            </p>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            <div className="flex items-center gap-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-slate-500 font-medium">CEFR:</span>
              <select
                value={selectedCefr}
                onChange={(e) => setSelectedCefr(e.target.value)}
                className="bg-transparent font-semibold text-slate-800 outline-none cursor-pointer"
              >
                <option value="all">All Levels</option>
                <option value="A1">A1 Beginner</option>
                <option value="A2">A2 Elementary</option>
                <option value="B1">B1 Intermediate</option>
                <option value="B2">B2 Upper-Int</option>
                <option value="C1">C1 Advanced</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
              <Compass className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-slate-500 font-medium">Track:</span>
              <select
                value={selectedTrackFilter}
                onChange={(e) => setSelectedTrackFilter(e.target.value)}
                className="bg-transparent font-semibold text-slate-800 outline-none cursor-pointer"
              >
                <option value="all">All Curricula</option>
                <option value="high_school">High School</option>
                <option value="professional">Professional</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 overflow-x-auto mt-6 pt-4 border-t border-slate-100 scrollbar-none">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: Target },
            { id: 'coach', label: 'Pronunciation Coach', icon: Mic },
            { id: 'read_aloud', label: 'Read Aloud Studio', icon: FileText },
            { id: 'shadowing', label: 'Shadowing Engine', icon: Sparkles },
            { id: 'free_speaking', label: 'Free Speaking', icon: Flame },
            { id: 'memory', label: 'Pronunciation Memory', icon: BookOpen },
            { id: 'challenges_history', label: 'Challenges & Log', icon: Award },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as SpeakingTab)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-teal-400' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mic Warning Banner if unsupported or denied */}
      {(!hasMicSupport || micError) && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              {micError ||
                'Microphone access is recommended for real-time speech recognition. If unavailable, you can still test with sample voice inputs.'}
            </span>
          </div>
          {micError && (
            <button
              onClick={() => setMicError(null)}
              className="text-amber-700 underline text-[11px] font-medium ml-2"
            >
              Dismiss
            </button>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 1: SPEAKING DASHBOARD                                 */}
      {/* ========================================================= */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Key Metric Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Speaking Practice</span>
                <Clock className="w-4 h-4 text-teal-600" />
              </div>
              <div className="mt-2 text-2xl font-black text-slate-900">
                {speakingStats.totalSpeakingMinutes} <span className="text-xs font-normal text-slate-500">mins</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Recorded speech sessions</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Pronunciation Acc.</span>
                <Target className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="mt-2 text-2xl font-black text-slate-900">
                {pronunciationSampleCount ? `${speakingStats.pronunciationAccuracyAvg}%` : '—'}
              </div>
              <p className="text-[11px] text-emerald-600 mt-0.5">IPA phoneme accuracy</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Cadence & Fluency</span>
                <TrendingUp className="w-4 h-4 text-blue-600" />
              </div>
              <div className="mt-2 text-2xl font-black text-slate-900">
                {fluencySampleCount ? `${speakingStats.fluencyScoreAvg}/100` : '—'}
              </div>
              <p className="text-[11px] text-blue-600 mt-0.5">110-140 WPM optimal</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Drills Completed</span>
                <Award className="w-4 h-4 text-amber-600" />
              </div>
              <div className="mt-2 text-2xl font-black text-slate-900">
                {speakingStats.readAloudCompletedCount +
                  speakingStats.shadowingCompletedCount +
                  speakingStats.freeSpeakingCompletedCount}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Read, Shadow & Free</p>
            </div>
          </div>

          {/* Quick Studio Launch Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Pronunciation Coach */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between hover:border-teal-300 transition-colors shadow-xs">
              <div>
                <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 mb-3">
                  <Mic className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Pronunciation Coach</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Interactive IPA matrix with anatomical mouth diagrams, minimal pairs (Ship vs. Sheep), and Vietnamese transfer guides.
                </p>
                <div className="mt-3 flex items-center gap-2 text-xs font-medium text-slate-500">
                  <span className="bg-slate-100 px-2 py-0.5 rounded">44 Phonemes</span>
                  <span className="bg-slate-100 px-2 py-0.5 rounded">Stress & Intonation</span>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('coach')}
                className="mt-5 w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>Launch Coach</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Read Aloud Studio */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between hover:border-blue-300 transition-colors shadow-xs">
              <div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 mb-3">
                  <FileText className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Read Aloud Studio</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Sentence-by-sentence reading with real-time Words Per Minute (WPM) tracking, unnatural pause detection, and word omission diffs.
                </p>
                <div className="mt-3 flex items-center gap-2 text-xs font-medium text-slate-500">
                  <span className="bg-slate-100 px-2 py-0.5 rounded">Cadence Gauge</span>
                  <span className="bg-slate-100 px-2 py-0.5 rounded">Vietnamese Advice</span>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('read_aloud')}
                className="mt-5 w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>Launch Read Aloud</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Shadowing Engine */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between hover:border-purple-300 transition-colors shadow-xs">
              <div>
                <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700 mb-3">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Shadowing Engine</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Listen-and-repeat studio with native playback at 0.5x–1x, voice recording, transcript diffing, and repetition recommendations.
                </p>
                <div className="mt-3 flex items-center gap-2 text-xs font-medium text-slate-500">
                  <span className="bg-slate-100 px-2 py-0.5 rounded">Speed Control</span>
                  <span className="bg-slate-100 px-2 py-0.5 rounded">Zero Fake Phonetics</span>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('shadowing')}
                className="mt-5 w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>Launch Shadowing</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Personalized Memory Preview & Challenges Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Pronunciation Memory High Priority */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-rose-600" />
                  <h3 className="font-bold text-slate-900 text-sm">Personalized Pronunciation Memory</h3>
                </div>
                <button
                  onClick={() => setActiveTab('memory')}
                  className="text-xs font-semibold text-teal-700 hover:underline"
                >
                  View All ({speakingStats.pronunciationMemory.length})
                </button>
              </div>

              <div className="space-y-2.5">
                {speakingStats.pronunciationMemory.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {item.soundSymbol}
                        </span>
                        <span className="text-xs font-bold text-slate-800">{item.pairLabel}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Miss count: <span className="text-rose-600 font-semibold">{item.missCount} times</span> • Tested: {item.lastTested}
                      </p>
                    </div>

                    <button
                      onClick={() => openMemoryDrill(item)}
                      className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition-colors"
                    >
                      Drill Now
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Daily Speaking Challenges Preview */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-600" />
                  <h3 className="font-bold text-slate-900 text-sm">Active Speaking Challenges</h3>
                </div>
                <button
                  onClick={() => setActiveTab('challenges_history')}
                  className="text-xs font-semibold text-teal-700 hover:underline"
                >
                  View Log
                </button>
              </div>

              <div className="space-y-3">
                {speakingStats.activeChallenges.slice(0, 3).map((ch) => (
                  <div key={ch.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{ch.badgeIcon}</span>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">{ch.title}</h4>
                          <p className="text-[11px] text-slate-500">{ch.description}</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-amber-600">+{ch.xpReward} XP</span>
                    </div>

                    <div className="mt-2.5 flex items-center gap-2">
                      <div className="flex-1 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-amber-500 h-full rounded-full transition-all"
                          style={{ width: `${ch.progressPercent}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-semibold text-slate-600">
                        {ch.progressPercent}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: PRONUNCIATION COACH (IPA TRAINING)                 */}
      {/* ========================================================= */}
      {activeTab === 'coach' && (
        <div className="space-y-6">
          {/* Sub-category selector */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Phoneme Matrix:</span>
              <div className="flex items-center gap-1">
                {(['consonants', 'vowels', 'suprasegmentals'] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setIpaCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-colors ${
                      ipaCategory === cat
                        ? 'bg-teal-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat === 'suprasegmentals' ? 'Stress & Rhythm' : cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-xs text-slate-500 italic">
              Specialized for Vietnamese native speakers overcoming ending consonant elisions & vowel shifts.
            </div>
          </div>

          {/* Sound Matrix Selection Strip */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <div className="text-xs font-bold text-slate-500 mb-2">Select Target Sound to Train:</div>
            <div className="flex flex-wrap gap-2">
              {IPA_SOUNDS_DATA.filter((s) => {
                if (ipaCategory === 'vowels') return s.type.startsWith('vowel');
                if (ipaCategory === 'consonants') return s.type.startsWith('consonant');
                return true;
              }).map((sound) => {
                const isSelected = selectedSound.symbol === sound.symbol;
                return (
                  <button
                    key={sound.symbol}
                    onClick={() => setSelectedSound(sound)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
                      isSelected
                        ? 'bg-slate-900 text-teal-300 ring-2 ring-teal-500 shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span>{sound.symbol}</span>
                    <span className="text-[10px] font-sans font-normal opacity-80">({sound.exampleWord})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sound Deep-Dive Workbench */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 7 cols: Anatomical Guide & Vietnamese Pitfalls */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-xs">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center font-mono text-2xl font-black text-teal-800 shadow-xs">
                    {selectedSound.symbol}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-extrabold text-slate-900">Sound {selectedSound.symbol}</h3>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {selectedSound.type.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Primary word: <span className="font-semibold text-slate-800">{selectedSound.exampleWord}</span> ({selectedSound.ipaExample})
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => playNativeSound(selectedSound.exampleWord)}
                  className="px-3.5 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>Listen Audio</span>
                </button>
              </div>

              {/* Anatomical Mouth Position Guide Graphic */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-teal-600" />
                    Anatomical Mouth & Tongue Position:
                  </span>
                  <span className="text-[11px] text-teal-700 font-semibold bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                    Articulatory Phonetics
                  </span>
                </div>

                {/* Diagrammatic Visualizer */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-medium">Lip Formation</span>
                    <span className="font-bold text-slate-800 text-xs mt-0.5 block">
                      {selectedSound.symbol.includes('ʃ') || selectedSound.symbol.includes('uː')
                        ? 'Rounded & Flared'
                        : selectedSound.symbol.includes('iː')
                        ? 'Spread Smile'
                        : 'Neutral Open'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-medium">Tongue Tip</span>
                    <span className="font-bold text-slate-800 text-xs mt-0.5 block">
                      {selectedSound.symbol.includes('θ') || selectedSound.symbol.includes('ð')
                        ? 'Between Front Teeth'
                        : selectedSound.symbol.includes('t') || selectedSound.symbol.includes('d')
                        ? 'Alveolar Ridge'
                        : 'Lower Behind Teeth'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-medium">Vocal Cords</span>
                    <span className="font-bold text-slate-800 text-xs mt-0.5 block">
                      {selectedSound.type.includes('voiced') ? 'Vibrating (Rung)' : 'Silent Airflow (Gió)'}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  {selectedSound.mouthPositionTip}
                </p>
              </div>

              {/* Vietnamese Guide & Common Vietnamese Transfer Error */}
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs space-y-1">
                  <span className="font-bold text-emerald-900 block flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Hướng dẫn phát âm chuẩn cho người Việt:
                  </span>
                  <p className="text-emerald-800 leading-relaxed">{selectedSound.vietnameseGuide}</p>
                </div>

                <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200 text-xs space-y-1">
                  <span className="font-bold text-rose-900 block flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    Lỗi sai kinh điển của người học Việt Nam:
                  </span>
                  <p className="text-rose-800 leading-relaxed">{selectedSound.vietnameseCommonError}</p>
                </div>
              </div>

              {/* Minimal Pair Comparison Card */}
              <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-teal-400">
                    Minimal Pair Contrast Drill
                  </span>
                  <span className="text-[11px] text-slate-400">Do not confuse these two!</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="p-3 rounded-xl bg-slate-800 border border-slate-700">
                    <span className="text-lg font-extrabold text-teal-300 block">
                      {selectedSound.minimalPair.wordA}
                    </span>
                    <span className="font-mono text-xs text-slate-400 block mt-0.5">
                      {selectedSound.minimalPair.ipaA}
                    </span>
                    <button
                      onClick={() => playNativeSound(selectedSound.minimalPair.wordA)}
                      className="mt-2 text-[11px] font-semibold text-teal-400 hover:text-teal-300 flex items-center justify-center gap-1 mx-auto"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Play</span>
                    </button>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-800 border border-slate-700">
                    <span className="text-lg font-extrabold text-amber-300 block">
                      {selectedSound.minimalPair.wordB}
                    </span>
                    <span className="font-mono text-xs text-slate-400 block mt-0.5">
                      {selectedSound.minimalPair.ipaB}
                    </span>
                    <button
                      onClick={() => playNativeSound(selectedSound.minimalPair.wordB)}
                      className="mt-2 text-[11px] font-semibold text-amber-400 hover:text-amber-300 flex items-center justify-center gap-1 mx-auto"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Play</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right 5 cols: Live Repetition & Evaluation Studio */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between space-y-4 shadow-xs">
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                  <Mic className="w-4 h-4 text-teal-600" />
                  Live Repetition Practice
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Say the target word into your microphone. The AI will verify enunciation and track recurring pitfalls.
                </p>

                {/* Target Word Display */}
                <div className="mt-4 p-5 rounded-2xl bg-teal-50/50 border border-teal-200/80 text-center">
                  <span className="text-xs font-semibold text-teal-700 uppercase tracking-wider block">
                    Target Word to Pronounce:
                  </span>
                  <div className="mt-1 text-3xl font-black text-slate-900">{drillingWord}</div>
                  <span className="font-mono text-xs text-teal-800 font-semibold mt-1 inline-block">
                    {selectedSound.ipaExample}
                  </span>

                  <div className="mt-3 flex items-center justify-center gap-2">
                    <button
                      onClick={() => setDrillingWord(selectedSound.exampleWord)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                        drillingWord === selectedSound.exampleWord
                          ? 'bg-teal-600 text-white'
                          : 'bg-white text-slate-700 border border-slate-200'
                      }`}
                    >
                      {selectedSound.exampleWord}
                    </button>
                    <button
                      onClick={() => setDrillingWord(selectedSound.minimalPair.wordA)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                        drillingWord === selectedSound.minimalPair.wordA
                          ? 'bg-teal-600 text-white'
                          : 'bg-white text-slate-700 border border-slate-200'
                      }`}
                    >
                      {selectedSound.minimalPair.wordA}
                    </button>
                    <button
                      onClick={() => setDrillingWord(selectedSound.minimalPair.wordB)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                        drillingWord === selectedSound.minimalPair.wordB
                          ? 'bg-teal-600 text-white'
                          : 'bg-white text-slate-700 border border-slate-200'
                      }`}
                    >
                      {selectedSound.minimalPair.wordB}
                    </button>
                  </div>
                </div>

                {/* Mic Action Controls */}
                <div className="mt-5 text-center">
                  {!isRecordingCoach ? (
                    <button
                      onClick={() => startCoachRecording(drillingWord)}
                      className="w-full py-3.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99]"
                    >
                      <Mic className="w-4 h-4" />
                      <span>Start Recording</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => stopCoachRecording(drillingWord)}
                      className="w-full py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-md animate-pulse transition-all"
                    >
                      <div className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                      <span>Stop & Evaluate Enunciation</span>
                    </button>
                  )}

                  {coachTranscript && (
                    <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-left">
                      <span className="text-[10px] text-slate-400 block font-medium uppercase">
                        Recognized Speech:
                      </span>
                      <p className="text-xs font-semibold text-slate-800 mt-0.5">"{coachTranscript}"</p>
                    </div>
                  )}
                </div>

                {/* Evaluation Feedback */}
                {isEvaluatingCoach && (
                  <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-600 flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-teal-600" />
                    <span>Analyzing enunciation against phonetic standard...</span>
                  </div>
                )}

                {coachEvalResult && (
                  <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">Enunciation Score:</span>
                      <span
                        className={`text-sm font-black ${
                          coachEvalResult.overallScore >= 75 ? 'text-emerald-600' : 'text-amber-600'
                        }`}
                      >
                        {coachEvalResult.overallScore}/100
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed">
                      {coachEvalResult.soundBreakdown?.[0]?.feedback || coachEvalResult.intelligibility}
                    </p>

                    {coachEvalResult.overallScore < 75 && (
                      <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-[11px] text-rose-800">
                        Added to your <strong>Personalized Pronunciation Memory</strong> for targeted repetition.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom Tip */}
              <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Web Speech API transcription combined with acoustic contrast analysis.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: READ ALOUD STUDIO (WPM & CADENCE ANALYSIS)          */}
      {/* ========================================================= */}
      {activeTab === 'read_aloud' && (
        <div className="space-y-6">
          {/* Passage Selector Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Select Reading Passage:
                </span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {filteredPassages.map((p) => {
                    const isSelected = selectedPassage.id === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => {
                          setSelectedPassage(p);
                          setActiveSentenceIndex(0);
                          setReadAloudTranscript('');
                          setReadAloudResult(null);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                          isSelected
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        <span>{p.title}</span>
                        <span className="ml-1 text-[10px] opacity-70">({p.level})</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Reading Mode Switcher */}
              <div className="flex items-center gap-1 self-start sm:self-auto bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setReadAloudMode('full')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                    readAloudMode === 'full' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Full Passage
                </button>
                <button
                  onClick={() => setReadAloudMode('sentence')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                    readAloudMode === 'sentence' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Sentence-by-Sentence
                </button>
              </div>
            </div>
          </div>

          {/* Reading Studio Board */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 7 cols: The Passage Text */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-extrabold text-slate-900">{selectedPassage.title}</h3>
                    <span className="text-[10px] font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded">
                      CEFR {selectedPassage.level}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">Category: {selectedPassage.category}</p>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block font-medium">Target Cadence:</span>
                  <span className="text-xs font-extrabold text-slate-800">
                    {selectedPassage.targetWpm} WPM
                  </span>
                </div>
              </div>

              {/* Text Display */}
              {readAloudMode === 'full' ? (
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 leading-relaxed text-sm md:text-base font-medium text-slate-800">
                  {selectedPassage.text}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-5 rounded-2xl bg-teal-50/50 border border-teal-200 leading-relaxed text-base md:text-lg font-semibold text-slate-900">
                    {selectedPassage.sentences[activeSentenceIndex]?.text}
                  </div>
                  {selectedPassage.sentences[activeSentenceIndex]?.textVi && (
                    <p className="text-xs text-slate-500 italic px-2">
                      Dịch: {selectedPassage.sentences[activeSentenceIndex]?.textVi}
                    </p>
                  )}

                  {/* Sentence navigator */}
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-slate-500 font-medium">
                      Sentence {activeSentenceIndex + 1} of {selectedPassage.sentences.length}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        disabled={activeSentenceIndex === 0}
                        onClick={() => {
                          setActiveSentenceIndex((prev) => Math.max(0, prev - 1));
                          setReadAloudTranscript('');
                          setReadAloudResult(null);
                        }}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-semibold disabled:opacity-40"
                      >
                        Prev
                      </button>
                      <button
                        disabled={activeSentenceIndex === selectedPassage.sentences.length - 1}
                        onClick={() => {
                          setActiveSentenceIndex((prev) =>
                            Math.min(selectedPassage.sentences.length - 1, prev + 1)
                          );
                          setReadAloudTranscript('');
                          setReadAloudResult(null);
                        }}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-semibold disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Focus Phonetics Checklist */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-teal-600" />
                  Passage Phonetic Focus Checklist:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedPassage.focusSounds.map((snd, idx) => (
                    <span
                      key={idx}
                      className="text-xs bg-white border border-slate-200 text-slate-700 px-2.5 py-1 rounded-lg font-medium"
                    >
                      {snd}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Right 5 cols: Recording Controls, Live WPM Meter, and AI Evaluation */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
              <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Mic className="w-4 h-4 text-blue-600" />
                Read Aloud Cadence Studio
              </h4>

              {/* Live Timer & WPM Meter */}
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-medium uppercase">Time Elapsed</span>
                  <span className="text-xl font-black text-slate-900 font-mono mt-0.5 block">
                    {Math.floor(readAloudDuration / 60)}:
                    {(readAloudDuration % 60).toString().padStart(2, '0')}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-medium uppercase">Ideal Pace</span>
                  <span className="text-xl font-black text-teal-600 font-mono mt-0.5 block">110-140 WPM</span>
                </div>
              </div>

              {/* Mic Controls */}
              <div>
                {!isRecordingReadAloud ? (
                  <button
                    onClick={startReadAloud}
                    className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99]"
                  >
                    <Mic className="w-4 h-4" />
                    <span>Start Reading Aloud</span>
                  </button>
                ) : (
                  <button
                    onClick={stopReadAloud}
                    className="w-full py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-md animate-pulse transition-all"
                  >
                    <div className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                    <span>Finish & Evaluate Reading</span>
                  </button>
                )}
              </div>

              {/* Live Transcript Stream */}
              {readAloudTranscript && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <span className="text-[10px] text-slate-400 block font-medium uppercase">
                    Live Recognized Speech:
                  </span>
                  <p className="text-slate-800 font-medium mt-1 leading-relaxed">
                    "{readAloudTranscript}"
                  </p>
                </div>
              )}

              {/* Evaluating Spinner */}
              {isEvaluatingReadAloud && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-600 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                  <span>Calculating cadence, identifying word omissions & natural pauses...</span>
                </div>
              )}

              {/* Evaluation Results Breakdown */}
              {readAloudResult && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3.5">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">
                        Reading Cadence
                      </span>
                      <span className="text-base font-extrabold text-slate-900">
                        {readAloudResult.wpm} WPM • {readAloudResult.cadenceRating}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">
                        Accuracy
                      </span>
                      <span className="text-base font-black text-emerald-600">
                        {readAloudResult.accuracyScore}%
                      </span>
                    </div>
                  </div>

                  {/* Word Errors (Missing, Incorrect, Extra, Repeated) */}
                  {readAloudResult.wordErrors?.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-800 block">
                        Word-Level Discrepancies ({readAloudResult.wordErrors.length}):
                      </span>
                      <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                        {readAloudResult.wordErrors.map((err: any, eIdx: number) => (
                          <div
                            key={eIdx}
                            className="p-2 rounded-lg bg-white border border-slate-200 text-[11px] flex items-center justify-between"
                          >
                            <div>
                              <span className="font-semibold text-rose-700">{err.expected}</span>
                              {err.received && (
                                <span className="text-slate-400 text-[10px]"> (said: "{err.received}")</span>
                              )}
                              <span className="ml-2 text-[10px] uppercase font-bold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                                {err.errorType}
                              </span>
                            </div>
                            <span className="text-slate-500 text-[10px] max-w-[140px] truncate">
                              {err.feedback}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Vietnamese Advice */}
                  {readAloudResult.vietnameseTransferAdvice?.length > 0 && (
                    <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-xs text-teal-900 space-y-1">
                      <span className="font-bold block flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                        Lời khuyên nhịp điệu cho người Việt:
                      </span>
                      {readAloudResult.vietnameseTransferAdvice.map((adv: string, aIdx: number) => (
                        <p key={aIdx} className="text-[11px] text-teal-800 leading-relaxed">
                          • {adv}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: SHADOWING ENGINE                                   */}
      {/* ========================================================= */}
      {activeTab === 'shadowing' && (
        <div className="space-y-6">
          {/* Workflow Header Banner */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 md:p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-teal-400">
                  Step-by-Step Listen-and-Repeat Workflow
                </span>
                <h3 className="text-xl font-extrabold mt-1">
                  Shadowing: Train English Prosody & Rhythm
                </h3>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                  1. Listen to native speech • 2. Repeat sentence into mic • 3. Transcribe & compare tokens • 4. Repeat until effortless.
                </p>
              </div>

              {/* Speed Slider */}
              <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-xl self-start md:self-auto">
                <Sliders className="w-3.5 h-3.5 text-teal-400" />
                <span className="text-xs text-slate-300 font-medium">Speed:</span>
                {[0.75, 0.9, 1.0].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => setShadowingSpeed(spd)}
                    className={`px-2 py-0.5 rounded text-xs font-bold transition-colors ${
                      shadowingSpeed === spd ? 'bg-teal-500 text-slate-900' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Shadowing Sentence Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Sentence {shadowingIndex + 1} of {shadowingSentences.length || 1}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  disabled={shadowingIndex === 0}
                  onClick={() => {
                    setShadowingIndex((p) => Math.max(0, p - 1));
                    setShadowTranscript('');
                    setShadowDiffResult(null);
                  }}
                  className="px-3 py-1 rounded-lg border border-slate-200 text-xs font-semibold disabled:opacity-40"
                >
                  Previous Sentence
                </button>
                <button
                  disabled={shadowingIndex === shadowingSentences.length - 1}
                  onClick={() => {
                    setShadowingIndex((p) => Math.min(shadowingSentences.length - 1, p + 1));
                    setShadowTranscript('');
                    setShadowDiffResult(null);
                  }}
                  className="px-3 py-1 rounded-lg border border-slate-200 text-xs font-semibold disabled:opacity-40"
                >
                  Next Sentence
                </button>
              </div>
            </div>

            {/* Target Sentence Display */}
            <div className="p-6 rounded-2xl bg-teal-50/40 border border-teal-200/80 text-center space-y-2">
              <span className="text-xs font-semibold text-teal-700 uppercase tracking-wider">
                Listen Closely to the Intonation Contour:
              </span>
              <p className="text-xl md:text-2xl font-extrabold text-slate-900 leading-snug max-w-3xl mx-auto">
                "{currentShadowingSentence.text}"
              </p>
              {currentShadowingSentence.textVi && (
                <p className="text-xs text-slate-500 italic mt-1">
                  Nghĩa: {currentShadowingSentence.textVi}
                </p>
              )}

              {/* Action Buttons: Native Listen & Mic Record */}
              <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
                <button
                  disabled={isListeningNative}
                  onClick={playNativeShadowing}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50"
                >
                  <Volume2 className="w-4 h-4 text-teal-400" />
                  <span>{isListeningNative ? 'Playing Native Audio...' : 'Listen to Native Model'}</span>
                </button>

                {!isRecordingShadow ? (
                  <button
                    onClick={startShadowRecording}
                    className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
                  >
                    <Mic className="w-4 h-4" />
                    <span>Shadow Now (Record Repetition)</span>
                  </button>
                ) : (
                  <button
                    onClick={stopShadowRecording}
                    className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs animate-pulse transition-colors"
                  >
                    <div className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                    <span>Stop & Compare Shadowing</span>
                  </button>
                )}
              </div>
            </div>

            {/* Recognized Speech Stream */}
            {shadowTranscript && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <span className="text-[10px] text-slate-400 block font-medium uppercase">
                  Your Recognized Repetition:
                </span>
                <p className="text-slate-800 font-semibold mt-1 text-sm">"{shadowTranscript}"</p>
              </div>
            )}

            {/* Token Diff Comparison */}
            {shadowDiffResult && (
              <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div>
                    <span className="text-xs font-bold text-slate-900">Word-Level Transcript Match</span>
                    <p className="text-[11px] text-slate-500">{shadowDiffResult.feedback}</p>
                  </div>
                  <span
                    className={`text-xl font-black ${
                      shadowDiffResult.score >= 80 ? 'text-emerald-600' : 'text-amber-600'
                    }`}
                  >
                    {shadowDiffResult.score}%
                  </span>
                </div>

                {/* Token Highlights */}
                <div className="flex flex-wrap gap-2 text-sm">
                  {shadowDiffResult.tokens.map((tok, tIdx) => (
                    <span
                      key={tIdx}
                      className={`px-2.5 py-1 rounded-lg font-medium border text-xs ${
                        tok.status === 'matched'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-rose-50 text-rose-800 border-rose-200 line-through'
                      }`}
                    >
                      {tok.word}
                    </span>
                  ))}
                </div>

                {/* Scientific Distinction Note */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 leading-relaxed flex items-start gap-2">
                  <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Educational Transparency:</strong> This tool utilizes browser Web Speech API transcription to compare word accuracy, missing tokens, and speech tempo. It does not fabricate microscopic acoustic phonetic scores.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 5: FREE SPEAKING (AI TOPIC GENERATION & RUBRIC EVAL)  */}
      {/* ========================================================= */}
      {activeTab === 'free_speaking' && (
        <div className="space-y-6">
          {/* Topic Header & AI Generator Button */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Select or Generate Impromptu Speaking Topic:
                </span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {filteredTopics.map((top) => {
                    const isSelected = selectedTopic.id === top.id;
                    return (
                      <button
                        key={top.id}
                        onClick={() => {
                          setSelectedTopic(top);
                          setFreeTranscript('');
                          setFreeEvalResult(null);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                          isSelected
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        <span>{top.title}</span>
                        <span className="ml-1 text-[10px] opacity-70">({top.level})</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* AI Topic Generator Button */}
              <button
                disabled={isGeneratingCustomTopic}
                onClick={handleGenerateAiTopic}
                className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors shrink-0 self-start md:self-auto disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isGeneratingCustomTopic ? 'Generating...' : 'AI Custom Topic'}</span>
              </button>
            </div>
          </div>

          {/* Free Speaking Workbench */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 7 cols: Prompt & Guiding Questions */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-xs">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded">
                    CEFR {selectedTopic.level} • {selectedTopic.category}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    Target: {selectedTopic.targetMinutes} minutes
                  </span>
                </div>
                <h3 className="text-xl font-extrabold text-slate-900 mt-2">{selectedTopic.title}</h3>
                <p className="text-xs md:text-sm text-slate-700 mt-2 leading-relaxed font-medium bg-slate-50 p-4 rounded-xl border border-slate-200">
                  {selectedTopic.prompt}
                </p>
              </div>

              {/* Guiding Questions */}
              {selectedTopic.guidingQuestions?.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-900 block flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-teal-600" />
                    Guiding Thought Questions:
                  </span>
                  <div className="space-y-1.5 text-xs text-slate-600">
                    {selectedTopic.guidingQuestions.map((q, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
                        • {q}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggested Vocabulary */}
              {selectedTopic.suggestedVocab?.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-900 block flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    High-Band Vocabulary to Try Incorporating:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedTopic.suggestedVocab.map((voc, vIdx) => (
                      <span
                        key={vIdx}
                        className="text-xs font-medium text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200"
                      >
                        {voc}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right 5 cols: Recording studio & AI Rubric Evaluation */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
              <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Mic className="w-4 h-4 text-teal-600" />
                Spoken Response Studio
              </h4>
              <label className="flex items-start gap-2 rounded-xl bg-slate-50 border border-slate-200 p-3 text-[11px] text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useAiTranscription}
                  disabled={isRecordingFree}
                  onChange={(event) => setUseAiTranscription(event.target.checked)}
                  className="mt-0.5 accent-teal-600"
                />
                <span>
                  <span className="block font-semibold text-slate-800">AI transcription</span>
                  <span className="block">Optional second transcript using the recording. Audio is sent to Gemini only when enabled.</span>
                </span>
              </label>

              {/* Elapsed Timer Display */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <span className="text-[10px] text-slate-400 block font-medium uppercase">
                  Recording Duration
                </span>
                <span className="text-3xl font-black text-slate-900 font-mono mt-0.5 block">
                  {Math.floor(freeDuration / 60)}:
                  {(freeDuration % 60).toString().padStart(2, '0')}
                </span>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Target: 1 to 3 minutes uninterrupted speech
                </span>
              </div>

              {/* Mic Button */}
              <div>
                {!isRecordingFree ? (
                  <button
                    onClick={startFreeSpeaking}
                    className="w-full py-3.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99]"
                  >
                    <Mic className="w-4 h-4" />
                    <span>Start Impromptu Speaking</span>
                  </button>
                ) : (
                  <button
                    onClick={stopFreeSpeaking}
                    className="w-full py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-md animate-pulse transition-all"
                  >
                    <div className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                    <span>Finish & Evaluate Speech</span>
                  </button>
                )}
              </div>

              {/* Live Transcript Stream */}
              {freeTranscript && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <span className="text-[10px] text-slate-400 block font-medium uppercase">
                    Transcribed Speech:
                  </span>
                  <p className="text-slate-800 font-medium mt-1 leading-relaxed">
                    "{freeTranscript}"
                  </p>
                </div>
              )}

              {/* Evaluating Spinner */}
              {isEvaluatingFree && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-600 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-teal-600" />
                  <span>Evaluating Lexical Resource, Grammar, Fluency & Coherence...</span>
                </div>
              )}
            </div>
          </div>

          {/* Full Free Speaking Evaluation Report */}
          {freeEvalResult && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    AI Practice Estimate · Transcript-based
                  </span>
                  <h3 className="text-xl font-extrabold text-slate-900 mt-1">
                    CEFR {freeEvalResult.cefrEstimate} • Overall Band {freeEvalResult.overallBandEstimate}
                  </h3>
                </div>
                <p className="mt-3 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-[11px] leading-relaxed text-blue-900">
                  This assessment uses the words captured by speech recognition. It can review vocabulary, grammar and how ideas are organized, but it cannot reliably assess pronunciation, accent, intonation, pauses or speaking speed without analyzing the audio itself.
                </p>

                {/* Rubric Breakdown Grid */}
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-medium">Lexical</span>
                    <span className="font-extrabold text-slate-900">
                      {freeEvalResult.rubricScores.lexicalResource}/10
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-medium">Grammar</span>
                    <span className="font-extrabold text-slate-900">
                      {freeEvalResult.rubricScores.grammaticalAccuracy}/10
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-medium">Fluency</span>
                    <span className="font-extrabold text-slate-900">
                      {freeEvalResult.rubricScores.fluencyCoherence}/10
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-medium">Relevance</span>
                    <span className="font-extrabold text-slate-900">
                      {freeEvalResult.rubricScores.relevanceContent}/10
                    </span>
                  </div>
                </div>
              </div>

              {/* Strengths & Growth Areas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-1.5">
                  <span className="font-bold text-emerald-900 block flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Key Strengths:
                  </span>
                  {freeEvalResult.strengths.map((str, sIdx) => (
                    <p key={sIdx} className="text-emerald-800 leading-relaxed">
                      ✓ {str}
                    </p>
                  ))}
                </div>

                <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-1.5">
                  <span className="font-bold text-amber-900 block flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    Targeted Areas for Growth:
                  </span>
                  {freeEvalResult.areasToImprove.map((area, aIdx) => (
                    <p key={aIdx} className="text-amber-800 leading-relaxed">
                      ▲ {area}
                    </p>
                  ))}
                </div>
              </div>

              {/* Grammar Corrections */}
              {freeEvalResult.grammarCorrections?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-900">
                    Grammar Corrections & Vietnamese Linguistic Notes:
                  </h4>
                  <div className="space-y-2">
                    {freeEvalResult.grammarCorrections.map((corr, cIdx) => (
                      <div
                        key={cIdx}
                        className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex flex-col gap-1"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-rose-700 line-through font-medium">{corr.original}</span>
                          <span className="text-slate-400">→</span>
                          <span className="text-emerald-700 font-bold">{corr.correction}</span>
                        </div>
                        <p className="text-slate-600 mt-0.5">{corr.explanation}</p>
                        {corr.vietnameseNote && (
                          <p className="text-slate-500 italic text-[11px]">
                            💡 {corr.vietnameseNote}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upgraded Vocabulary */}
              {freeEvalResult.upgradedVocabulary?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-900">Vocabulary Upgrades for Higher Bands:</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {freeEvalResult.upgradedVocabulary.map((up, uIdx) => (
                      <div key={uIdx} className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 line-through">{up.basicWord}</span>
                          <span className="text-teal-700 font-bold">{up.advancedAlternative}</span>
                        </div>
                        <p className="text-[11px] text-slate-600 italic mt-1.5">"{up.example}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Polished Model Sample Answer */}
              <div className="p-5 rounded-2xl bg-teal-50/60 border border-teal-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-teal-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-teal-600" />
                    AI suggested answer · compare and improve
                  </span>
                  <button
                    onClick={() =>
                      audioEngine.speak(freeEvalResult.improvedSampleAnswer, { rate: 0.95 })
                    }
                    className="px-3 py-1 text-xs font-medium text-teal-800 hover:bg-teal-100 rounded-lg flex items-center gap-1 border border-teal-300"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Listen</span>
                  </button>
                </div>
                <p className="text-xs md:text-sm text-slate-800 leading-relaxed italic">
                  "{freeEvalResult.improvedSampleAnswer}"
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 6: PERSONALIZED PRONUNCIATION MEMORY                  */}
      {/* ========================================================= */}
      {activeTab === 'memory' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-rose-600">
                  Targeted Revision Engine
                </span>
                <h3 className="text-xl font-extrabold text-slate-900 mt-1">
                  Personalized Pronunciation Memory
                </h3>
                <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                  Automatically archives sound contrasts and word endings you have stumbled on during Read Aloud, Shadowing, or Free Speaking sessions.
                </p>
              </div>

              <div className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl self-start md:self-auto">
                {speakingStats.pronunciationMemory.length} Tracked Pitfalls
              </div>
            </div>

            {/* List of memory items */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              {speakingStats.pronunciationMemory.map((item) => (
                <div
                  key={item.id}
                  className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-teal-300 transition-all shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-lg">
                        {item.soundSymbol}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          item.priority === 'high'
                            ? 'bg-rose-100 text-rose-700'
                            : item.priority === 'medium'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {item.priority} priority
                      </span>
                    </div>

                    <h4 className="text-base font-extrabold text-slate-900">{item.pairLabel}</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Tested: {item.lastTested} • Encountered misses:{' '}
                      <span className="font-bold text-rose-600">{item.missCount} times</span>
                    </p>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {item.wordExamples.map((ex, exIdx) => (
                        <span
                          key={exIdx}
                          className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono"
                        >
                          {ex}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={() => markPronunciationDrillMastered(item.id)}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                        item.drilledStatus === 'mastered'
                          ? 'text-emerald-700 bg-emerald-50'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {item.drilledStatus === 'mastered' ? '✓ Mastered' : 'Mark Mastered'}
                    </button>

                    <button
                      onClick={() => openMemoryDrill(item)}
                      className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-colors shadow-xs"
                    >
                      Launch Drill
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 7: CHALLENGES & PREVIOUS SPEAKING RESULTS LOG         */}
      {/* ========================================================= */}
      {activeTab === 'challenges_history' && (
        <div className="space-y-6">
          {/* Active Speaking Challenges */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-600">
                  Cadence & Milestone Tracking
                </span>
                <h3 className="text-xl font-extrabold text-slate-900 mt-1">
                  Speaking Mastery Challenges
                </h3>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                Earn XP towards your weekly goal
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {speakingStats.activeChallenges.map((ch) => (
                <div
                  key={ch.id}
                  className="p-5 rounded-2xl bg-slate-50 border border-slate-200/90 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl">{ch.badgeIcon}</span>
                        <div>
                          <h4 className="text-sm font-extrabold text-slate-900">{ch.title}</h4>
                          <span className="text-[11px] text-amber-700 font-bold">
                            +{ch.xpReward} XP Reward
                          </span>
                        </div>
                      </div>

                      {ch.isCompleted ? (
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-lg">
                          Completed
                        </span>
                      ) : (
                        <button
                          onClick={() => completeSpeakingChallenge(ch.id)}
                          className="text-xs font-semibold text-teal-700 hover:underline"
                        >
                          Check In
                        </button>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 mt-2.5 leading-relaxed">
                      {ch.description}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">Goal: {ch.targetGoal}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200/70 flex items-center gap-3">
                    <div className="flex-1 bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-amber-500 h-full rounded-full transition-all"
                        style={{ width: `${ch.progressPercent}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-700">{ch.progressPercent}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chronological History Log */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <h3 className="text-lg font-extrabold text-slate-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-slate-600" />
              Previous Speaking Results Log
            </h3>

            <div className="space-y-3">
              {speakingStats.history.map((record) => (
                <div
                  key={record.id}
                  className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          record.type === 'read_aloud'
                            ? 'bg-blue-100 text-blue-800'
                            : record.type === 'shadowing'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-teal-100 text-teal-800'
                        }`}
                      >
                        {record.type.replace('_', ' ')}
                      </span>
                      <span className="font-extrabold text-slate-900 text-sm">{record.title}</span>
                      <span className="text-slate-400 text-[11px]">• {record.date}</span>
                    </div>

                    {record.wpm && (
                      <span className="text-[11px] font-semibold text-blue-700 mr-2">
                        Cadence: {record.wpm} WPM
                      </span>
                    )}

                    <p className="text-slate-600 italic">"{record.feedbackSummary}"</p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-slate-400 uppercase font-medium block">Score</span>
                    <span className="text-base font-black text-slate-900">{record.score}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: PRONUNCIATION MEMORY FLASHCARD DRILL               */}
      {/* ========================================================= */}
      {activeMemoryDrillItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-7 shadow-2xl border border-slate-100 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-600">
                Memory Flashcard Drill
              </span>
              <button
                onClick={() => setActiveMemoryDrillItem(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕ Close
              </button>
            </div>

            <div className="text-center space-y-2">
              <span className="font-mono text-sm font-bold text-teal-800 bg-teal-50 px-3 py-1 rounded-lg border border-teal-200 inline-block">
                {activeMemoryDrillItem.soundSymbol}
              </span>
              <h3 className="text-2xl font-black text-slate-900">
                {activeMemoryDrillItem.pairLabel}
              </h3>
              <p className="text-xs text-slate-500">
                Listen to the acoustic contrast, then pronounce the distinction clearly.
              </p>
            </div>

            {/* Word examples */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <span className="text-xs font-bold text-slate-800 block text-center">
                Example Pairs:
              </span>
              <div className="space-y-2 text-center text-xs">
                {activeMemoryDrillItem.wordExamples.map((ex: string, idx: number) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between px-4 font-medium"
                  >
                    <span>{ex}</span>
                    <button
                      onClick={() => audioEngine.speak(ex.split(' vs ')[0] || ex, { rate: 0.85 })}
                      className="text-teal-700 hover:text-teal-900 text-xs flex items-center gap-1 font-semibold"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Audio</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Drill Mic Control */}
            <div className="text-center">
              {!isRecordingMemory ? (
                <button
                  onClick={startMemoryDrillRecording}
                  className="w-full py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-md transition-colors"
                >
                  <Mic className="w-4 h-4" />
                  <span>Record Distinction Test</span>
                </button>
              ) : (
                <button
                  onClick={stopMemoryDrillRecording}
                  className="w-full py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-md animate-pulse transition-colors"
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                  <span>Stop & Check Distinction</span>
                </button>
              )}

              {memoryDrillTranscript && (
                <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-left">
                  <span className="text-[10px] text-slate-400 uppercase font-medium">Recognized:</span>
                  <p className="text-slate-800 font-semibold mt-0.5">"{memoryDrillTranscript}"</p>
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                onClick={() => {
                  markPronunciationDrillMastered(activeMemoryDrillItem.id);
                  setActiveMemoryDrillItem(null);
                }}
                className="text-xs font-bold text-emerald-700 hover:underline"
              >
                Mark as Mastered (+25 XP)
              </button>

              <button
                onClick={() => setActiveMemoryDrillItem(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
