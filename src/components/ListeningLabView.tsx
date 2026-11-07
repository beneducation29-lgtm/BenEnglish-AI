import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { ListeningLesson, SentenceItem, CEFRLevel, LessonTier, VocabItem, WordDefinitionLookup } from '../types';
import { audioEngine, SpeechRecognitionSession } from '../services/speech';
import {
  evaluateDictation,
  DictationEvalData,
  generateAiListeningLesson,
  lookupWordDefinition,
  evaluateShortAnswer,
} from '../services/api';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Volume1,
  RotateCw,
  Repeat,
  Repeat1,
  FastForward,
  Rewind,
  CheckCircle2,
  FileText,
  HelpCircle,
  Mic,
  Bookmark,
  Sparkles,
  Award,
  ChevronRight,
  Headphones,
  Sliders,
  Search,
  BookOpen,
  Compass,
  Clock,
  Flame,
  ArrowRight,
  X,
  Layers,
  ChevronDown,
  ChevronUp,
  Check,
  AlertCircle,
  Plus,
  Target,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const ListeningLabView: React.FC = () => {
  const {
    user,
    playbackSpeed,
    setPlaybackSpeed,
    completeLesson,
    toggleVocabBookmark,
    audioFeedbackSound,
    allListeningLessons,
    addGeneratedLesson,
    recordListeningPlay,
    addListeningSeconds,
    recordDictationAttempt,
    recordComprehensionAttempt,
    addVocabWord,
  } = useApp();

  // Selected Lesson
  const [selectedLesson, setSelectedLesson] = useState<ListeningLesson>(() =>
    allListeningLessons.find((lesson) => lesson.track === user.track && lesson.level === user.cefrLevel) ||
    allListeningLessons.find((lesson) => lesson.track === user.track || lesson.track === 'both') ||
    allListeningLessons[0]
  );

  // Mode Selection: 'intensive' | 'extensive' | 'dictation' | 'comprehension' | 'shadowing'
  const [activeMode, setActiveMode] = useState<
    'intensive' | 'extensive' | 'dictation' | 'comprehension' | 'shadowing'
  >('intensive');

  // Filters
  const [cefrFilter, setCefrFilter] = useState<string>(user.cefrLevel);
  const [trackFilter, setTrackFilter] = useState<string>(user.track);
  const [topicSearch, setTopicSearch] = useState<string>('');
  const [viewMode, setViewMode] = useState<'dashboard' | 'lesson'>('dashboard');

  // Audio Player State
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [activeSentenceIndex, setActiveSentenceIndex] = useState<number>(0);
  const [activeWordCharIndex, setActiveWordCharIndex] = useState<number>(0);
  const [volume, setVolume] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [repeatMode, setRepeatMode] = useState<'none' | 'sentence' | 'paragraph'>('none');
  const [showViTranslation, setShowViTranslation] = useState<boolean>(true);

  // Playback timer & tracking
  const [currentTimeSec, setCurrentTimeSec] = useState<number>(0);
  const estimatedTotalSec = selectedLesson.sentences.length * 4;

  // Dictation Mode State
  const [dictationInput, setDictationInput] = useState('');
  const [dictationResult, setDictationResult] = useState<DictationEvalData | null>(null);
  const [isEvaluatingDictation, setIsEvaluatingDictation] = useState(false);

  // Comprehension Mode State
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [shortAnswerEvaluations, setShortAnswerEvaluations] = useState<Record<number, any>>({});
  const [isEvaluatingShortAnswer, setIsEvaluatingShortAnswer] = useState<number | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  // Shadowing Mode State
  const [isRecordingShadow, setIsRecordingShadow] = useState(false);
  const [shadowTranscript, setShadowTranscript] = useState('');
  const [shadowScore, setShadowScore] = useState<number | null>(null);
  const [shadowSentenceIdx, setShadowSentenceIdx] = useState<number>(0);
  const [shadowSession, setShadowSession] = useState<SpeechRecognitionSession | null>(null);

  // Interactive Word Lookup Modal / Drawer
  const [selectedWordData, setSelectedWordData] = useState<WordDefinitionLookup | null>(null);
  const [isLoadingWordLookup, setIsLoadingWordLookup] = useState(false);

  // AI Lesson Generator Modal State
  const [showGeneratorModal, setShowGeneratorModal] = useState(false);
  const [genTopic, setGenTopic] = useState('');
  const [genLevel, setGenLevel] = useState<CEFRLevel>('B1');
  const [genTrack, setGenTrack] = useState<'high_school' | 'professional' | 'ielts'>('high_school');
  const [isGeneratingLesson, setIsGeneratingLesson] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  // Listen tracking interval
  useEffect(() => {
    let timer: any = null;
    if (isPlaying && !isPaused) {
      timer = setInterval(() => {
        setCurrentTimeSec((prev) => Math.min(estimatedTotalSec, prev + 1));
        addListeningSeconds(1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isPlaying, isPaused, estimatedTotalSec]);

  // Clean audio on lesson change or unmount
  useEffect(() => {
    audioEngine.stop();
    setIsPlaying(false);
    setIsPaused(false);
    setActiveSentenceIndex(0);
    setCurrentTimeSec(0);
    setDictationInput('');
    setDictationResult(null);
    setQuizAnswers({});
    setQuizSubmitted(false);
    setShadowScore(null);
    setShadowTranscript('');
    recordListeningPlay(selectedLesson.id, 0);
  }, [selectedLesson.id]);

  // Handle Play/Pause
  const togglePlay = () => {
    if (isPlaying && !isPaused) {
      audioEngine.pause();
      setIsPaused(true);
    } else if (isPlaying && isPaused) {
      audioEngine.resume();
      setIsPaused(false);
    } else {
      playFromSentence(activeSentenceIndex);
    }
  };

  // Play from specific sentence
  const playFromSentence = (index: number) => {
    if (index >= selectedLesson.sentences.length) {
      setIsPlaying(false);
      setIsPaused(false);
      setActiveSentenceIndex(0);
      setActiveWordCharIndex(0);
      setCurrentTimeSec(0);
      return;
    }

    audioEngine.stop();
    setIsPlaying(true);
    setIsPaused(false);
    setActiveSentenceIndex(index);
    setActiveWordCharIndex(0);
    setCurrentTimeSec(index * 4);

    const s = selectedLesson.sentences[index];
    recordListeningPlay(selectedLesson.id, index);

    audioEngine.speak(s.textEn, {
      rate: playbackSpeed,
      volume: isMuted ? 0 : volume,
      onBoundary: (charIndex) => setActiveWordCharIndex(charIndex),
      onEnd: () => {
        if (repeatMode === 'sentence') {
          playFromSentence(index);
        } else if (repeatMode === 'paragraph') {
          const currentPara = s.paragraphIndex ?? 0;
          const paraSentences = selectedLesson.sentences
            .map((sent, i) => ({ sent, i }))
            .filter((item) => (item.sent.paragraphIndex ?? 0) === currentPara);
          const lastInPara = paraSentences[paraSentences.length - 1];
          if (lastInPara && index === lastInPara.i) {
            playFromSentence(paraSentences[0].i);
          } else {
            playFromSentence(index + 1);
          }
        } else {
          // Play next continuous sentence
          playFromSentence(index + 1);
        }
      },
    });
  };

  // Rewind 5 seconds (jumps back 1 sentence)
  const handleRewind5s = () => {
    const prevIdx = Math.max(0, activeSentenceIndex - 1);
    playFromSentence(prevIdx);
  };

  // Forward 5 seconds (jumps forward 1 sentence)
  const handleForward5s = () => {
    const nextIdx = Math.min(selectedLesson.sentences.length - 1, activeSentenceIndex + 1);
    playFromSentence(nextIdx);
  };

  // Volume change
  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    setIsMuted(newVol === 0);
    audioEngine.setVolume(newVol);
  };

  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      audioEngine.setVolume(volume || 1);
    } else {
      setIsMuted(true);
      audioEngine.setVolume(0);
    }
  };

  // Click on word in transcript for instant dictionary lookup
  const handleWordClick = async (rawWord: string, sentenceText: string) => {
    const cleanWord = rawWord.replace(/[^a-zA-Z'-]/g, '').trim();
    if (!cleanWord || cleanWord.length <= 1) return;

    // Check if word is already in lesson vocabulary
    const inLessonVocab = selectedLesson.vocabulary.find(
      (v) => v.word.toLowerCase() === cleanWord.toLowerCase()
    );

    if (inLessonVocab) {
      setSelectedWordData({
        word: inLessonVocab.word,
        ipa: inLessonVocab.ipa,
        pos: inLessonVocab.pos,
        meaningVi: inLessonVocab.meaningVi,
        definitionEn: inLessonVocab.definitionEn,
        collocations: inLessonVocab.collocations || [],
        exampleEn: inLessonVocab.exampleEn,
        exampleVi: inLessonVocab.exampleVi,
      });
      return;
    }

    // Call server API for instant contextual lookup
    setIsLoadingWordLookup(true);
    setSelectedWordData({
      word: cleanWord,
      ipa: '/.../',
      pos: 'lookup',
      meaningVi: 'Đang tra cứu từ điển...',
      definitionEn: 'Looking up definition in context...',
      collocations: [],
      exampleEn: sentenceText,
      exampleVi: '',
    });

    try {
      const data = await lookupWordDefinition({
        word: cleanWord,
        sentenceContext: sentenceText,
      });
      setSelectedWordData(data);
    } catch (e) {
      console.error(e);
      setSelectedWordData({
        word: cleanWord,
        ipa: `/${cleanWord}/`,
        pos: 'word',
        meaningVi: 'Từ vựng trong bài nghe',
        definitionEn: `Meaning of ${cleanWord} in spoken context`,
        collocations: [],
        exampleEn: sentenceText,
        exampleVi: '',
      });
    } finally {
      setIsLoadingWordLookup(false);
    }
  };

  // Dictation evaluation
  const handleDictationCheck = async () => {
    if (!dictationInput.trim()) return;
    setIsEvaluatingDictation(true);
    setDictationResult(null);

    try {
      const result = await evaluateDictation({
        originalTranscript: selectedLesson.dictationTargetSentence,
        userSubmission: dictationInput.trim(),
      });
      setDictationResult(result);
      const missedWords = result.diffWords
        .filter((w) => w.type !== 'correct')
        .map((w) => w.expected);
      recordDictationAttempt(selectedLesson.id, result.accuracyScore, missedWords);

      if (result.accuracyScore >= 80) {
        audioFeedbackSound();
        confetti({ particleCount: 40, spread: 60 });
        completeLesson(selectedLesson.id, 'listening', result.accuracyScore);
      }
    } catch (e) {
      console.error(e);
      // Fallback calculation
      const orig = selectedLesson.dictationTargetSentence.toLowerCase().split(/\s+/);
      const userW = dictationInput.toLowerCase().split(/\s+/);
      let match = 0;
      orig.forEach((w) => {
        if (userW.includes(w)) match++;
      });
      const score = Math.round((match / orig.length) * 100);
      setDictationResult({
        accuracyScore: score,
        wordMatchCount: match,
        totalWordCount: orig.length,
        diffWords: orig.map((w) => ({
          expected: w,
          received: userW.includes(w) ? w : '(missed)',
          type: userW.includes(w) ? 'correct' : 'missing',
        })),
        listeningAcousticNotes: ['AI evaluation is unavailable. This is a local word-match estimate only; it does not assess accent, connected speech, or acoustic detail.'],
      });
      recordDictationAttempt(selectedLesson.id, score, []);
    } finally {
      setIsEvaluatingDictation(false);
    }
  };

  // Shadowing handler
  const startShadowing = () => {
    setShadowTranscript('');
    setShadowScore(null);
    const s = new SpeechRecognitionSession(
      (state) => setShadowTranscript(state.transcript),
      (err) => console.warn(err),
      (active) => setIsRecordingShadow(active)
    );
    setShadowSession(s);
    s.start();
  };

  const stopShadowing = () => {
    if (shadowSession) shadowSession.stop();
    setIsRecordingShadow(false);

    const target = selectedLesson.sentences[shadowSentenceIdx]?.textEn || '';
    const targetWords = target.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
    const spokenWords = shadowTranscript.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);

    let matchCount = 0;
    targetWords.forEach((tw) => {
      if (spokenWords.includes(tw)) matchCount++;
    });

    const score = Math.min(100, Math.round((matchCount / Math.max(1, targetWords.length)) * 100));
    setShadowScore(score);
    if (score >= 75) {
      audioFeedbackSound();
      completeLesson(selectedLesson.id, 'listening', score);
    }
  };

  // Grade short answer with AI
  const handleGradeShortAnswer = async (qIdx: number, question: string, expectedAnswer: string) => {
    const userAns = quizAnswers[qIdx];
    if (!userAns || !userAns.trim()) return;

    setIsEvaluatingShortAnswer(qIdx);
    try {
      const evalRes = await evaluateShortAnswer({
        question,
        expectedAnswer,
        userResponse: userAns.trim(),
      });
      setShortAnswerEvaluations((prev) => ({ ...prev, [qIdx]: evalRes }));
    } catch (e) {
      console.error(e);
      const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
      const expectedTokens = normalize(expectedAnswer);
      const responseTokens = new Set(normalize(userAns));
      const matched = expectedTokens.filter((token) => responseTokens.has(token)).length;
      const localScore = Math.round((matched / Math.max(expectedTokens.length, 1)) * 100);
      setShortAnswerEvaluations((prev) => ({
        ...prev,
        [qIdx]: {
          isCorrect: localScore >= 70,
          score: localScore,
          feedback: 'AI grading is unavailable. This is a local keyword-overlap estimate, not an AI assessment.',
          feedbackVi: 'AI đang tạm thời không phản hồi. Đây chỉ là ước lượng dựa trên từ khóa trùng khớp, không phải đánh giá AI.',
        },
      }));
    } finally {
      setIsEvaluatingShortAnswer(null);
    }
  };

  // Generate Lesson via AI
  const handleGenerateLesson = async () => {
    if (!genTopic.trim()) return;
    setIsGeneratingLesson(true);
    setGenError(null);

    try {
      const generated = await generateAiListeningLesson({
        topic: genTopic.trim(),
        cefrLevel: genLevel,
        track: genTrack,
        tier: genLevel === 'A1' || genLevel === 'A2' ? 'beginner' : genLevel === 'B1' || genLevel === 'B2' ? 'intermediate' : 'advanced',
      });
      addGeneratedLesson(generated);
      setSelectedLesson(generated);
      setShowGeneratorModal(false);
      setViewMode('lesson');
      audioFeedbackSound();
      confetti({ particleCount: 45, spread: 70 });
    } catch (err: any) {
      console.error(err);
      setGenError(err.message || 'Failed to generate lesson. Please retry.');
    } finally {
      setIsGeneratingLesson(false);
    }
  };

  // Filter lessons
  const filteredLessons = allListeningLessons.filter((l) => {
    if (cefrFilter !== 'all' && l.level !== cefrFilter) return false;
    if (trackFilter !== 'all' && l.track !== trackFilter && l.track !== 'both') return false;
    if (topicSearch.trim()) {
      const term = topicSearch.toLowerCase();
      const matchTitle = l.title.toLowerCase().includes(term);
      const matchCat = l.category.toLowerCase().includes(term);
      const matchSummary = l.summary.toLowerCase().includes(term);
      if (!matchTitle && !matchCat && !matchSummary) return false;
    }
    return true;
  });

  const progress = user.listeningProgress || {
    totalListeningSeconds: 0,
    dailyListeningGoalMinutes: 15,
    dailyListeningSecondsToday: 0,
    dictationAccuracyAvg: 0,
    comprehensionAccuracyAvg: 0,
    dictationAttemptCount: 0,
    comprehensionAttemptCount: 0,
    completedListeningCount: 0,
    recentlyPlayedLessonIds: [],
    misunderstoodVocab: [],
  };

  const dailyGoalPercent = Math.min(
    100,
    Math.round((progress.dailyListeningSecondsToday / (progress.dailyListeningGoalMinutes * 60)) * 100)
  );

  return (
    <div className="space-y-8 pb-16">
      {/* Top Banner Navigation: Switch between Dashboard & Lesson Workspace */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">
            BENENGLISH AI · LISTENING LABORATORY
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Intelligent Listening & Acoustic Comprehension Lab
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Synchronized transcripts, sentence repetition, dictation acoustics, and AI lesson generation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs">
            <button
              onClick={() => setViewMode('dashboard')}
              className={`px-3 py-1.5 font-semibold rounded-lg transition-colors ${
                viewMode === 'dashboard'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Listening Dashboard
            </button>
            <button
              onClick={() => setViewMode('lesson')}
              className={`px-3 py-1.5 font-semibold rounded-lg transition-colors ${
                viewMode === 'lesson'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Lesson Studio ({selectedLesson.level})
            </button>
          </div>

          <button
            onClick={() => setShowGeneratorModal(true)}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Generate AI Lesson</span>
          </button>
        </div>
      </div>

      {/* DASHBOARD VIEW */}
      {viewMode === 'dashboard' && (
        <div className="space-y-8">
          {/* Section 1: Listening Progress & Daily Goals Metric Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Goal Progress Ring/Bar */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold uppercase tracking-wider">DAILY LISTENING GOAL</span>
                <Clock className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="my-2">
                <div className="text-2xl font-extrabold text-slate-900 tabular-nums">
                  {Math.floor(progress.dailyListeningSecondsToday / 60)}{' '}
                  <span className="text-xs font-normal text-slate-400">
                    / {progress.dailyListeningGoalMinutes} mins
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${dailyGoalPercent}%` }}
                  />
                </div>
              </div>
              <span className="text-[11px] text-emerald-700 font-semibold">
                {dailyGoalPercent}% of daily listening goal reached today
              </span>
            </div>

            {/* Dictation Accuracy Avg */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold uppercase tracking-wider">DICTATION ACCURACY</span>
                <Award className="w-4 h-4 text-blue-500" />
              </div>
              <div className="my-2">
                <div className="text-2xl font-extrabold text-slate-900 tabular-nums">
                  {(progress.dictationAttemptCount || 0) > 0 ? `${progress.dictationAccuracyAvg}%` : '—'}
                </div>
                <span className="text-xs text-slate-500">Acoustic word-match average</span>
              </div>
              <span className="text-[11px] text-blue-700 font-semibold">
                {progress.dictationAttemptCount || 0} recorded dictation attempt(s)
              </span>
            </div>

            {/* Comprehension Accuracy Avg */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold uppercase tracking-wider">COMPREHENSION RATE</span>
                <HelpCircle className="w-4 h-4 text-purple-500" />
              </div>
              <div className="my-2">
                <div className="text-2xl font-extrabold text-slate-900 tabular-nums">
                  {(progress.comprehensionAttemptCount || 0) > 0 ? `${progress.comprehensionAccuracyAvg}%` : '—'}
                </div>
                <span className="text-xs text-slate-500">MCQ & Detail questions</span>
              </div>
              <span className="text-[11px] text-purple-700 font-semibold">
                {progress.comprehensionAttemptCount || 0} saved quiz attempt(s)
              </span>
            </div>

            {/* Total Listening Time */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold uppercase tracking-wider">TOTAL LISTENING TIME</span>
                <Headphones className="w-4 h-4 text-amber-500" />
              </div>
              <div className="my-2">
                <div className="text-2xl font-extrabold text-slate-900 tabular-nums">
                  {Math.floor(progress.totalListeningSeconds / 60)}{' '}
                  <span className="text-xs font-normal text-slate-400">minutes</span>
                </div>
                <span className="text-xs text-slate-500">
                  {progress.completedListeningCount} lessons completed
                </span>
              </div>
              <span className="text-[11px] text-amber-700 font-semibold">
                Active ear conditioning
              </span>
            </div>
          </div>

          {/* Section 2: Continue Learning Hero Card */}
          {progress.continueLearningLessonId && (
            <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>CONTINUE LEARNING WHERE YOU LEFT OFF</span>
                </div>
                <h3 className="text-xl font-bold text-white">
                  {allListeningLessons.find((l) => l.id === progress.continueLearningLessonId)?.title ||
                    selectedLesson.title}
                </h3>
                <p className="text-xs text-slate-300 max-w-xl">
                  Resume playback at Sentence {(progress.continueSentenceIndex ?? 0) + 1}. Review the vocabulary highlights or practice shadowing.
                </p>
              </div>

              <button
                onClick={() => {
                  const lesson = allListeningLessons.find(
                    (l) => l.id === progress.continueLearningLessonId
                  );
                  if (lesson) setSelectedLesson(lesson);
                  setViewMode('lesson');
                  playFromSentence(progress.continueSentenceIndex ?? 0);
                }}
                className="px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-2 transition-transform active:scale-95 whitespace-nowrap shrink-0 shadow-sm"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                <span>Resume Lesson</span>
              </button>
            </div>
          )}

          {/* Section 3: Comprehensive Multi-Dimension Filters */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-lg font-bold text-slate-900">
                Curriculum Catalog ({filteredLessons.length} Lessons Available)
              </h2>

              {/* Topic search */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={topicSearch}
                  onChange={(e) => setTopicSearch(e.target.value)}
                  placeholder="Filter by keyword or topic..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Filter Control Bars */}
            <div className="space-y-3 pt-2 border-t border-slate-100 text-xs">
              {/* CEFR Level Filter */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-slate-400 font-semibold w-24 shrink-0">CEFR Level:</span>
                <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                  {['all', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setCefrFilter(lvl)}
                      className={`px-3 py-1 font-semibold rounded-lg transition-colors ${
                        cefrFilter === lvl
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {lvl === 'all' ? 'All Levels' : lvl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Learning Track Filter */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-slate-400 font-semibold w-24 shrink-0">Target Track:</span>
                <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                  {[
                    { id: 'all', label: 'All Curricula' },
                    { id: 'high_school', label: 'High School English' },
                    { id: 'professional', label: 'Professional Workplace' },
                    { id: 'ielts', label: 'IELTS Listening' },
                  ].map((trk) => (
                    <button
                      key={trk.id}
                      onClick={() => setTrackFilter(trk.id)}
                      className={`px-3 py-1 font-semibold rounded-lg transition-colors ${
                        trackFilter === trk.id
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {trk.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Lesson Catalog Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
              {filteredLessons.map((lesson) => {
                const isSelected = lesson.id === selectedLesson.id;
                const isCompleted = user.completedLessonIds.includes(lesson.id);

                return (
                  <div
                    key={lesson.id}
                    onClick={() => {
                      setSelectedLesson(lesson);
                      setViewMode('lesson');
                    }}
                    className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                      isSelected
                        ? 'bg-emerald-50/60 border-emerald-400 ring-2 ring-emerald-200 shadow-sm'
                        : 'bg-slate-50/60 border-slate-200 hover:border-slate-300 hover:bg-white hover:shadow-xs'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="font-extrabold px-2 py-0.5 rounded bg-white text-slate-800 border border-slate-200 text-[10px]">
                          {lesson.level}
                        </span>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{lesson.durationMinutes}m</span>
                          {isCompleted && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 ml-1" />
                          )}
                          {lesson.isAiGenerated && (
                            <span className="text-[10px] text-emerald-700 font-bold px-1.5 py-0.2 bg-emerald-100 rounded">
                              AI Custom
                            </span>
                          )}
                        </div>
                      </div>

                      <h3 className="font-bold text-slate-900 text-base leading-snug line-clamp-2">
                        {lesson.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {lesson.summary}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium truncate">{lesson.category}</span>
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        Start Studio
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 4: Misunderstood Vocabulary Diagnostic */}
          {progress.misunderstoodVocab.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    ACOUSTIC VULNERABILITIES
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    Frequently Misunderstood Words in Listening & Dictation
                  </h3>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {progress.misunderstoodVocab.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex flex-col justify-between gap-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-sm">{item.word}</span>
                      <button
                        onClick={() => audioEngine.speak(item.word, { rate: 0.85 })}
                        className="p-1 text-slate-500 hover:text-emerald-600 rounded"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {item.ipa && (
                      <span className="font-mono text-emerald-700 text-[11px] font-semibold">
                        {item.ipa}
                      </span>
                    )}
                    <span className="text-slate-600 font-medium">{item.meaningVi}</span>
                    <span className="text-[10px] text-rose-600 font-bold">
                      Missed {item.count} {item.count > 1 ? 'times' : 'time'} in listening
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* LESSON STUDIO VIEW */}
      {viewMode === 'lesson' && (
        <div className="space-y-6">
          {/* Main Professional Audio Player Deck */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 mb-1">
                  <span>{selectedLesson.category}</span>
                  <span aria-hidden="true">·</span>
                  <span>CEFR {selectedLesson.level}</span>
                  <span aria-hidden="true">·</span>
                  <span className="capitalize">{selectedLesson.tier || 'Intermediate'}</span>
                </div>
                <h2 className="text-2xl font-bold text-slate-900">{selectedLesson.title}</h2>
              </div>

              {/* Speed Buttons: 0.5x, 0.75x, 1.0x, 1.25x, 1.5x */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto">
                <span className="text-[11px] font-bold text-slate-400 px-1.5">Speed:</span>
                {[0.5, 0.75, 1.0, 1.25, 1.5].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => setPlaybackSpeed(spd)}
                    className={`px-2 py-1 text-xs font-bold rounded-lg transition-colors ${
                      playbackSpeed === spd
                        ? 'bg-white text-emerald-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>

            {/* Audio Scrubber & Controls */}
            <div className="p-5 rounded-2xl bg-slate-900 text-white space-y-4">
              {/* Progress Scrubber Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                  <span>
                    Sentence {activeSentenceIndex + 1} of {selectedLesson.sentences.length}
                  </span>
                  <span>
                    {Math.floor(currentTimeSec / 60)}:
                    {(currentTimeSec % 60).toString().padStart(2, '0')} /{' '}
                    {Math.floor(estimatedTotalSec / 60)}:
                    {(estimatedTotalSec % 60).toString().padStart(2, '0')}
                  </span>
                </div>

                {/* Clickable progress track */}
                <div
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const ratio = (e.clientX - rect.left) / rect.width;
                    const targetSentence = Math.min(
                      selectedLesson.sentences.length - 1,
                      Math.floor(ratio * selectedLesson.sentences.length)
                    );
                    playFromSentence(targetSentence);
                  }}
                  className="w-full bg-slate-800 h-2.5 rounded-full cursor-pointer relative overflow-hidden group"
                >
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all"
                    style={{
                      width: `${((activeSentenceIndex + 1) / selectedLesson.sentences.length) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* Main Transport Controls */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                {/* Play, Rewind 5s, Forward 5s */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleRewind5s}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                    title="Rewind 5 seconds (Previous sentence)"
                  >
                    <Rewind className="w-4 h-4" />
                  </button>

                  <button
                    onClick={togglePlay}
                    className="w-12 h-12 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center font-bold shadow-md hover:scale-105 active:scale-95 transition-all"
                  >
                    {isPlaying && !isPaused ? (
                      <Pause className="w-5 h-5 fill-slate-950" />
                    ) : (
                      <Play className="w-5 h-5 fill-slate-950 ml-0.5" />
                    )}
                  </button>

                  <button
                    onClick={handleForward5s}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                    title="Forward 5 seconds (Next sentence)"
                  >
                    <FastForward className="w-4 h-4" />
                  </button>
                </div>

                {/* Repeat Controls: Sentence, Paragraph, Replay Entire */}
                <div className="flex items-center gap-2 text-xs">
                  <button
                    onClick={() =>
                      setRepeatMode((prev) => (prev === 'sentence' ? 'none' : 'sentence'))
                    }
                    className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-colors font-semibold ${
                      repeatMode === 'sentence'
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                    }`}
                    title="Repeat current sentence"
                  >
                    <Repeat1 className="w-3.5 h-3.5" />
                    <span>Repeat Sentence</span>
                  </button>

                  <button
                    onClick={() =>
                      setRepeatMode((prev) => (prev === 'paragraph' ? 'none' : 'paragraph'))
                    }
                    className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-colors font-semibold ${
                      repeatMode === 'paragraph'
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                    }`}
                    title="Repeat current paragraph"
                  >
                    <Repeat className="w-3.5 h-3.5" />
                    <span>Repeat Section</span>
                  </button>

                  <button
                    onClick={() => playFromSentence(0)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                    title="Replay entire lesson from beginning"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>

                {/* Volume Slider & Mute Toggle */}
                <div className="flex items-center gap-2 text-slate-400">
                  <button onClick={toggleMute} className="hover:text-white transition-colors">
                    {isMuted || volume === 0 ? (
                      <VolumeX className="w-4 h-4 text-rose-400" />
                    ) : volume < 0.5 ? (
                      <Volume1 className="w-4 h-4" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    className="w-16 sm:w-20 accent-emerald-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Mode Switcher Tabs (5 Modes) */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl overflow-x-auto scrollbar-none text-xs">
              <button
                onClick={() => setActiveMode('intensive')}
                className={`px-3.5 py-2 font-bold rounded-xl transition-colors whitespace-nowrap shrink-0 ${
                  activeMode === 'intensive'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                A. Intensive Listening
              </button>
              <button
                onClick={() => setActiveMode('extensive')}
                className={`px-3.5 py-2 font-bold rounded-xl transition-colors whitespace-nowrap shrink-0 ${
                  activeMode === 'extensive'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                B. Extensive Listening
              </button>
              <button
                onClick={() => setActiveMode('dictation')}
                className={`px-3.5 py-2 font-bold rounded-xl transition-colors whitespace-nowrap shrink-0 ${
                  activeMode === 'dictation'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                C. Dictation Test
              </button>
              <button
                onClick={() => setActiveMode('comprehension')}
                className={`px-3.5 py-2 font-bold rounded-xl transition-colors whitespace-nowrap shrink-0 ${
                  activeMode === 'comprehension'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                D. Comprehension Quiz
              </button>
              <button
                onClick={() => setActiveMode('shadowing')}
                className={`px-3.5 py-2 font-bold rounded-xl transition-colors whitespace-nowrap shrink-0 ${
                  activeMode === 'shadowing'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                E. Speech Shadowing
              </button>
            </div>
          </div>

          {/* MODE A: INTENSIVE LISTENING (Sentence by sentence with word definitions & translation) */}
          {activeMode === 'intensive' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Transcript Stream (8 cols) */}
              <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">
                      Interactive Synchronized Transcript
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Click any sentence to play · Click any individual word to inspect definition & IPA
                    </p>
                  </div>

                  <button
                    onClick={() => setShowViTranslation(!showViTranslation)}
                    className={`px-3 py-1 rounded-lg border text-xs font-semibold transition-colors ${
                      showViTranslation
                        ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    {showViTranslation ? 'Vietnamese: ON' : 'Vietnamese: OFF'}
                  </button>
                </div>

                <div className="space-y-3">
                  {selectedLesson.sentences.map((sent, sIdx) => {
                    const isActive = activeSentenceIndex === sIdx;
                    const words = sent.textEn.match(/\S+/g) || [];
                    let wordCursor = 0;
                    const wordRanges = words.map((word) => {
                      const start = sent.textEn.indexOf(word, wordCursor);
                      wordCursor = start + word.length;
                      return { word, start, end: wordCursor };
                    });

                    return (
                      <div
                        key={sent.id}
                        onClick={() => playFromSentence(sIdx)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col gap-2 ${
                          isActive
                            ? 'bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-200'
                            : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100/70 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-baseline gap-2">
                            <span className="w-5 h-5 rounded-md bg-white border border-slate-200 flex items-center justify-center font-mono font-bold text-[10px] text-slate-700 shrink-0">
                              {sIdx + 1}
                            </span>

                            {/* Clickable Words */}
                            <div className="flex flex-wrap gap-x-1.5 gap-y-1 font-semibold text-slate-900 text-sm leading-relaxed">
                              {wordRanges.map(({ word, start, end }, wIdx) => {
                                const clean = word.replace(/[^a-zA-Z]/g, '');
                                const isKeyPhrase = sent.keyPhrases?.some((kp) =>
                                  kp.toLowerCase().includes(clean.toLowerCase())
                                );

                                return (
                                  <span
                                    key={wIdx}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleWordClick(word, sent.textEn);
                                    }}
                                    className={`cursor-pointer rounded px-0.5 transition-colors ${
                                      isActive && activeWordCharIndex >= start && activeWordCharIndex < end
                                        ? 'bg-amber-300 text-amber-950 ring-1 ring-amber-400'
                                        : 'hover:bg-amber-200 hover:text-amber-950'
                                    } ${
                                      isKeyPhrase ? 'underline decoration-emerald-400 decoration-2 underline-offset-2' : ''
                                    }`}
                                  >
                                    {word}
                                  </span>
                                );
                              })}
                            </div>
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              playFromSentence(sIdx);
                            }}
                            className={`p-1.5 rounded-lg shrink-0 ${
                              isActive
                                ? 'bg-emerald-600 text-white'
                                : 'bg-white border border-slate-200 text-slate-600 hover:text-emerald-600'
                            }`}
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Vietnamese Translation */}
                        {showViTranslation && (
                          <div className="text-xs text-slate-600 pl-7 font-medium leading-relaxed">
                            {sent.textVi}
                          </div>
                        )}

                        {/* Phonetic & Linking Focus */}
                        {sent.phoneticFocus && (
                          <div className="text-[11px] text-emerald-800 bg-emerald-100/70 rounded-lg px-2.5 py-1 self-start ml-7 font-medium">
                            💡 {sent.phoneticFocus}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Sidebar: Word Definition Drawer & Target Vocab (4 cols) */}
              <div className="lg:col-span-4 space-y-4">
                {/* Active Clicked Word Inspector Card */}
                {selectedWordData ? (
                  <div className="bg-white rounded-3xl border border-emerald-300 p-5 shadow-sm space-y-3 relative">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
                        INSTANT WORD LOOKUP
                      </span>
                      <button
                        onClick={() => setSelectedWordData(null)}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xl font-extrabold text-slate-900">
                          {selectedWordData.word}
                        </h4>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs text-emerald-700 font-semibold">
                            {selectedWordData.ipa}
                          </span>
                          <span className="text-[10px] text-slate-400 italic">
                            {selectedWordData.pos}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => audioEngine.speak(selectedWordData.word, { rate: 0.85 })}
                          className="p-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                          title="Listen to word pronunciation"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            addVocabWord({
                              id: `v-user-${Date.now()}`,
                              word: selectedWordData.word,
                              ipa: selectedWordData.ipa,
                              pos: selectedWordData.pos,
                              meaningVi: selectedWordData.meaningVi,
                              definitionEn: selectedWordData.definitionEn,
                              exampleEn: selectedWordData.exampleEn,
                              exampleVi: selectedWordData.exampleVi,
                              collocations: selectedWordData.collocations,
                              cefrLevel: selectedLesson.level,
                              topic: selectedLesson.category,
                              track: selectedLesson.track,
                              masteryLevel: 1,
                            });
                            audioFeedbackSound();
                          }}
                          className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-amber-50 hover:text-amber-700 transition-colors"
                          title="Save to Vocabulary Notebook"
                        >
                          <Bookmark className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="text-xs">
                      <span className="font-bold text-emerald-900 block mb-0.5">Nghĩa tiếng Việt:</span>
                      <p className="text-slate-800 font-medium">{selectedWordData.meaningVi}</p>
                    </div>

                    <div className="text-xs text-slate-600">
                      <span className="font-bold text-slate-900 block mb-0.5">English Definition:</span>
                      <p>{selectedWordData.definitionEn}</p>
                    </div>

                    {selectedWordData.collocations.length > 0 && (
                      <div className="text-xs">
                        <span className="font-bold text-slate-900 block mb-1">Collocations:</span>
                        <div className="flex flex-wrap gap-1">
                          {selectedWordData.collocations.map((col, cIdx) => (
                            <span
                              key={cIdx}
                              className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px]"
                            >
                              {col}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-100 text-xs text-slate-600 space-y-1">
                    <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      Interactive Dictionary Helper
                    </span>
                    <p className="leading-relaxed">
                      Click any word in the transcript on the left to see its IPA, Vietnamese definition, and play single-word pronunciation.
                    </p>
                  </div>
                )}

                {/* Lesson Key Vocabulary Highlights */}
                <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Curriculum Vocabulary ({selectedLesson.vocabulary.length})
                  </h4>

                  <div className="space-y-2">
                    {selectedLesson.vocabulary.map((vocab) => (
                      <div
                        key={vocab.id}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs flex flex-col gap-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-sm">{vocab.word}</span>
                          <div className="flex items-center gap-1">
                            <span className="font-mono text-emerald-700 text-[11px]">
                              {vocab.ipa}
                            </span>
                            <button
                              onClick={() => audioEngine.speak(vocab.word, { rate: 0.85 })}
                              className="p-1 text-slate-500 hover:text-emerald-600"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <span className="text-slate-700 font-medium">{vocab.meaningVi}</span>
                        <p className="text-[11px] text-slate-500 italic">"{vocab.exampleEn}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MODE B: EXTENSIVE LISTENING (Continuous playback flow & full story immersion) */}
          {activeMode === 'extensive' && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <span className="text-xs font-bold text-emerald-600 uppercase">
                    EXTENSIVE LISTENING · CONTINUOUS IMMERSION
                  </span>
                  <h3 className="text-xl font-bold text-slate-900 mt-0.5">
                    Uninterrupted Spoken Flow & Narrative
                  </h3>
                </div>
                <button
                  onClick={() => playFromSentence(0)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Play Full Narrative</span>
                </button>
              </div>

              {/* Full script with paragraph division */}
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-base leading-relaxed text-slate-800 space-y-4">
                <p>{selectedLesson.audioSampleText}</p>
              </div>

              {/* Learning Objectives */}
              {selectedLesson.learningObjectives && selectedLesson.learningObjectives.length > 0 && (
                <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-2 text-xs">
                  <span className="font-bold text-slate-900 block">Lesson Objectives:</span>
                  {selectedLesson.learningObjectives.map((obj, oIdx) => (
                    <div key={oIdx} className="flex items-center gap-2 text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{obj}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* MODE C: DICTATION TEST */}
          {activeMode === 'dictation' && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
              <div>
                <span className="text-xs font-bold text-emerald-600 uppercase">
                  DICTATION CLINIC · ACOUSTIC PRECISION
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-0.5">
                  Type Exactly What You Hear
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Listen to the audio excerpt and type the sentence. BenEnglish AI evaluates missing words, spelling, punctuation, and acoustic reductions.
                </p>
              </div>

              {/* Dictation Target Audio Trigger */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() =>
                      audioEngine.speak(selectedLesson.dictationTargetSentence, {
                        rate: playbackSpeed,
                      })
                    }
                    className="w-12 h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center font-bold shadow-xs transition-transform active:scale-95"
                  >
                    <Volume2 className="w-6 h-6" />
                  </button>
                  <div>
                    <span className="font-bold text-sm text-slate-900 block">
                      Play Target Sentence
                    </span>
                    <span className="text-xs text-slate-500">
                      You can replay unlimited times at {playbackSpeed}x speed
                    </span>
                  </div>
                </div>

                <button
                  onClick={() =>
                    audioEngine.speak(selectedLesson.dictationTargetSentence, { rate: 0.75 })
                  }
                  className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <Rewind className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Play Slow (0.75x)</span>
                </button>
              </div>

              {/* Typing Input */}
              <div className="space-y-3">
                <textarea
                  value={dictationInput}
                  onChange={(e) => setDictationInput(e.target.value)}
                  placeholder="Type the sentence here as you hear it..."
                  rows={3}
                  className="w-full p-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />

                <div className="flex justify-end">
                  <button
                    onClick={handleDictationCheck}
                    disabled={isEvaluatingDictation || !dictationInput.trim()}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-2"
                  >
                    {isEvaluatingDictation ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Diagnosing with AI...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Check Dictation Accuracy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Dictation Evaluation Card */}
              {dictationResult && (
                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <div>
                      <span className="text-xs text-slate-500 font-medium">DICTATION SCORE</span>
                      <div className="text-3xl font-extrabold text-slate-900 flex items-center gap-2 mt-0.5">
                        {dictationResult.accuracyScore}%
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                            dictationResult.accuracyScore >= 80
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {dictationResult.accuracyScore >= 80 ? 'Mastered!' : 'Needs Revision'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Word-by-Word Diff */}
                  <div>
                    <span className="text-xs font-bold text-slate-700 block mb-2">
                      Word-by-Word Accuracy Comparison:
                    </span>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {dictationResult.diffWords.map((w, idx) => (
                        <span
                          key={idx}
                          className={`px-2.5 py-1 rounded-md border font-semibold ${
                            w.type === 'correct'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-rose-50 text-rose-800 border-rose-200 line-through'
                          }`}
                        >
                          {w.expected}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Focused listening follow-up: target only words missed in this attempt */}
                  {(() => {
                    const focusWords = Array.from(new Set(
                      dictationResult.diffWords
                        .filter((word) => word.type !== 'correct')
                        .map((word) => word.expected.trim())
                        .filter((word) => word.length > 1 && !/^\(missed\)$/i.test(word))
                    ));
                    if (focusWords.length === 0) return null;
                    return (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5 space-y-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <span className="flex items-center gap-2 text-sm font-extrabold text-amber-900">
                              <Target className="h-4 w-4" /> Your focused listening drill
                            </span>
                            <p className="mt-1 text-xs leading-relaxed text-amber-800">
                              Practice the words that were missing or different in this dictation attempt.
                            </p>
                          </div>
                          <button
                            onClick={() => audioEngine.speak(selectedLesson.dictationTargetSentence, { rate: Math.max(0.7, Math.min(playbackSpeed, 0.9)) })}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-3 py-2 text-xs font-bold text-white hover:bg-amber-700"
                          >
                            <Headphones className="h-4 w-4" /> Replay full sentence slowly
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {focusWords.map((word) => (
                            <button
                              key={word}
                              onClick={() => audioEngine.speak(word, { rate: 0.78 })}
                              title={`Listen to ${word}`}
                              className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-white px-3 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-100"
                            >
                              <Volume2 className="h-3.5 w-3.5" /> {word}
                            </button>
                          ))}
                        </div>
                        <div className="flex flex-col gap-2 border-t border-amber-200 pt-3 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-[11px] text-amber-800">
                            {focusWords.length} focus word{focusWords.length === 1 ? '' : 's'} · Listen, then try the dictation again.
                          </p>
                          <button
                            onClick={() => {
                              setDictationInput('');
                              setDictationResult(null);
                              audioEngine.speak(selectedLesson.dictationTargetSentence, { rate: 0.85 });
                            }}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs font-bold text-amber-900 hover:bg-amber-100"
                          >
                            <RotateCcw className="h-3.5 w-3.5" /> Retry dictation
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Acoustic Notes */}
                  {dictationResult.listeningAcousticNotes.length > 0 && (
                    <div className="p-4 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 space-y-1">
                      <span className="font-bold text-slate-900 flex items-center gap-1.5 text-emerald-800">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                        Acoustic Linking & Phonetic Reductions:
                      </span>
                      {dictationResult.listeningAcousticNotes.map((note, nIdx) => (
                        <p key={nIdx} className="leading-relaxed text-slate-600">
                          • {note}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* MODE D: COMPREHENSION QUIZ */}
          {activeMode === 'comprehension' && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
              <div>
                <span className="text-xs font-bold text-emerald-600 uppercase">
                  COMPREHENSION STUDIO
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-0.5">
                  Detailed Comprehension Exercises
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Multiple-choice, true/false, fill-in-the-blank, and open-ended short answer questions.
                </p>
              </div>

              <div className="space-y-6">
                {selectedLesson.comprehensionQuiz.map((quiz, qIdx) => {
                  const selectedOpt = quizAnswers[qIdx];
                  const isAnswered = selectedOpt !== undefined;
                  const isShortAnswer = quiz.type === 'short_answer';
                  const shortEval = shortAnswerEvaluations[qIdx];

                  return (
                    <div
                      key={qIdx}
                      className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900 text-sm">
                          {qIdx + 1}. {quiz.question}
                        </span>
                        <span className="font-bold text-[10px] uppercase px-2 py-0.5 rounded bg-white text-slate-600 border border-slate-200">
                          {quiz.type.replace('_', ' ')}
                        </span>
                      </div>

                      {/* Options or Input */}
                      {quiz.options && quiz.options.length > 0 ? (
                        <div className="space-y-2">
                          {quiz.options.map((opt, optIdx) => {
                            const isChosen = selectedOpt === opt;
                            const isCorrect = opt === quiz.correctAnswer;

                            return (
                              <button
                                key={optIdx}
                                onClick={() =>
                                  setQuizAnswers((prev) => ({ ...prev, [qIdx]: opt }))
                                }
                                className={`w-full text-left p-3 rounded-xl border text-xs font-medium transition-all flex items-center justify-between ${
                                  isChosen
                                    ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-semibold'
                                    : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                                }`}
                              >
                                <span>{opt}</span>
                                {quizSubmitted && isChosen && (
                                  <span
                                    className={`text-[11px] font-bold ${
                                      isCorrect ? 'text-emerald-600' : 'text-rose-600'
                                    }`}
                                  >
                                    {isCorrect ? '✓ Correct' : '✗ Incorrect'}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        // Short Answer or Fill in the blank input
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={quizAnswers[qIdx] || ''}
                            onChange={(e) =>
                              setQuizAnswers((prev) => ({ ...prev, [qIdx]: e.target.value }))
                            }
                            placeholder="Type your answer here..."
                            className="w-full p-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                          />

                          {isShortAnswer && (
                            <div className="flex justify-end">
                              <button
                                onClick={() =>
                                  handleGradeShortAnswer(qIdx, quiz.question, quiz.correctAnswer)
                                }
                                disabled={
                                  isEvaluatingShortAnswer === qIdx || !quizAnswers[qIdx]?.trim()
                                }
                                className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 disabled:opacity-50"
                              >
                                {isEvaluatingShortAnswer === qIdx ? 'Grading...' : 'Grade Short Answer'}
                              </button>
                            </div>
                          )}

                          {shortEval && (
                            <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs space-y-1">
                              <span className="font-bold text-emerald-800 block">
                                AI Evaluation: {shortEval.score}% ({shortEval.isCorrect ? 'Correct' : 'Needs Polish'})
                              </span>
                              <p className="text-slate-600">{shortEval.feedback}</p>
                              {shortEval.feedbackVi && (
                                <p className="text-slate-500 italic text-[11px]">{shortEval.feedbackVi}</p>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Explanation if submitted */}
                      {quizSubmitted && (
                        <div className="mt-2 p-3.5 rounded-xl bg-white border border-slate-200 text-xs space-y-1">
                          <span className="font-bold text-slate-900 block">
                            Explanation: {quiz.explanationEn}
                          </span>
                          <p className="text-slate-500 italic text-[11px]">{quiz.explanationVi}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => {
                    setQuizSubmitted(true);
                    audioFeedbackSound();
                    recordComprehensionAttempt(selectedLesson.id, 90);
                    completeLesson(selectedLesson.id, 'listening', 90);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs"
                >
                  Submit & Score Comprehension Quiz
                </button>
              </div>
            </div>
          )}

          {/* MODE E: SHADOWING LAB */}
          {activeMode === 'shadowing' && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
              <div>
                <span className="text-xs font-bold text-emerald-600 uppercase">
                  SHADOWING CLINIC · SPEECH REPETITION
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-0.5">
                  Listen, Shadow, and Repeat Aloud
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Listen to the native speaker, record your voice immediately after, and receive word-by-word accuracy feedback.
                </p>
              </div>

              {/* Sentence Selector Strip */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                  <span>TARGET SENTENCE {shadowSentenceIdx + 1} OF {selectedLesson.sentences.length}</span>
                  <div className="flex items-center gap-1">
                    {selectedLesson.sentences.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setShadowSentenceIdx(idx);
                          setShadowTranscript('');
                          setShadowScore(null);
                        }}
                        className={`w-6 h-6 rounded-md text-xs font-bold transition-colors ${
                          shadowSentenceIdx === idx
                            ? 'bg-emerald-600 text-white'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {idx + 1}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="text-base font-bold text-slate-900 leading-relaxed">
                  "{selectedLesson.sentences[shadowSentenceIdx]?.textEn}"
                </div>
                <div className="text-xs text-slate-500 font-medium">
                  {selectedLesson.sentences[shadowSentenceIdx]?.textVi}
                </div>

                <div className="pt-2 flex items-center gap-3">
                  <button
                    onClick={() =>
                      audioEngine.speak(
                        selectedLesson.sentences[shadowSentenceIdx]?.textEn || '',
                        { rate: playbackSpeed }
                      )
                    }
                    className="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-800 flex items-center gap-2"
                  >
                    <Volume2 className="w-4 h-4 text-emerald-600" />
                    <span>Play Model Audio</span>
                  </button>
                </div>
              </div>

              {/* Mic Recording Area */}
              <div className="p-7 rounded-2xl bg-slate-900 text-white text-center space-y-4">
                <div className="text-xs font-medium text-slate-400">
                  {isRecordingShadow
                    ? 'Listening... Speak the sentence aloud into your microphone'
                    : 'Tap the mic and shadow the sentence above'}
                </div>

                <button
                  onClick={isRecordingShadow ? stopShadowing : startShadowing}
                  className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center font-bold transition-all shadow-lg ${
                    isRecordingShadow
                      ? 'bg-rose-500 text-white ring-8 ring-rose-500/20 animate-pulse'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 hover:scale-105'
                  }`}
                >
                  <Mic className="w-7 h-7" />
                </button>

                {shadowTranscript && (
                  <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-200 font-mono max-w-lg mx-auto">
                    You repeated: "{shadowTranscript}"
                  </div>
                )}

                {shadowScore !== null && (
                  <div className="pt-1">
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider block">
                      Transcript Match Estimate
                    </span>
                    <div className="text-3xl font-extrabold text-emerald-400 mt-0.5">
                      {shadowScore}%
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Based on recognized word overlap only; it does not measure pronunciation, accent, or acoustic accuracy.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* AI LISTENING CONTENT GENERATOR MODAL */}
      {showGeneratorModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">AI Listening Lesson Generator</h3>
                  <span className="text-xs text-slate-400">Powered by Gemini 3.8</span>
                </div>
              </div>
              <button
                onClick={() => setShowGeneratorModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Lesson Topic or Theme:
                </label>
                <input
                  type="text"
                  value={genTopic}
                  onChange={(e) => setGenTopic(e.target.value)}
                  placeholder="e.g., Renewable Energy Investments, High School Club Fair, Job Interview..."
                  className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Quick Prompt Ideas */}
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">
                  Suggested Ideas:
                </span>
                <div className="flex flex-wrap gap-1">
                  {[
                    'Urban Farming & Vertical Agriculture',
                    'Cross-Cultural Software Team Standup',
                    'IELTS Section 3: Marine Biology Tutorial',
                    'High School Debate on Social Media',
                  ].map((idea, iIdx) => (
                    <button
                      key={iIdx}
                      onClick={() => setGenTopic(idea)}
                      className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px]"
                    >
                      {idea}
                    </button>
                  ))}
                </div>
              </div>

              {/* CEFR Level & Track Selectors */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">CEFR Level:</label>
                  <select
                    value={genLevel}
                    onChange={(e) => setGenLevel(e.target.value as CEFRLevel)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800"
                  >
                    <option value="A1">A1 (Beginner)</option>
                    <option value="A2">A2 (Elementary)</option>
                    <option value="B1">B1 (Intermediate)</option>
                    <option value="B2">B2 (Upper-Intermediate)</option>
                    <option value="C1">C1 (Advanced)</option>
                    <option value="C2">C2 (Proficient)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Learning Track:</label>
                  <select
                    value={genTrack}
                    onChange={(e) => setGenTrack(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800"
                  >
                    <option value="high_school">High School English</option>
                    <option value="professional">Professional English</option>
                    <option value="ielts">IELTS Listening</option>
                  </select>
                </div>
              </div>

              {genError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                  {genError}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowGeneratorModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateLesson}
                disabled={isGeneratingLesson || !genTopic.trim()}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow-xs"
              >
                {isGeneratingLesson ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Synthesizing Lesson Script...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate & Open Studio</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
