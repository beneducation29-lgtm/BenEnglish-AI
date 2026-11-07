import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { VocabItem, HighSchoolGrade, CEFRLevel } from '../types';
import { audioEngine } from '../services/speech';
import { TRACK_GRAMMAR_CLINICS } from '../data/trackGrammarClinics';
import {
  BookOpen,
  Volume2,
  Sparkles,
  Bookmark,
  CheckCircle2,
  RotateCw,
  Search,
  Filter,
} from 'lucide-react';
import confetti from 'canvas-confetti';

const GRAMMAR_CLINICS = [
  {
    id: 'g-01',
    title: 'Ending Consonants & S-Plural Concord',
    level: 'High School & Pro',
    issue: 'Vietnamese is an isolating language without inflectional morphology; learners often omit ending -s, -es, or third-person singular markers.',
    correctExample: 'She analyzes the market data carefully. (Not: She analyze)',
    incorrectExample: 'She analyze the market data.',
    ruleVi: 'Quy tắc hòa hợp chủ ngữ và động từ số ít ở thì hiện tại đơn, luôn phát âm đuôi /s/, /z/, hoặc /ɪz/.',
  },
  {
    id: 'g-02',
    title: 'Past Tense Form & Pronunciation of -ed',
    level: 'CEFR B1-B2',
    issue: 'Dropping the -ed sound or pronouncing all -ed endings as /ɪd/.',
    correctExample: 'We finished the audit yesterday (/fɪnɪʃt/).',
    incorrectExample: 'We finish the audit yesterday.',
    ruleVi: 'Đuôi -ed có 3 cách đọc: /t/ (sau âm vô thanh), /d/ (sau âm hữu thanh), /ɪd/ (chỉ sau /t/ và /d/).',
  },
  {
    id: 'g-03',
    title: 'Articles: A, An, The vs Zero Article',
    level: 'CEFR B1-C1',
    issue: 'Vietnamese uses classifier words ("cái", "con") rather than definite articles, leading to omitting "the" before specific nouns.',
    correctExample: 'The revenue generated in Q2 surpassed our expectations.',
    incorrectExample: 'Revenue generated in Q2 surpassed expectations.',
    ruleVi: 'Dùng "the" khi danh từ đã được xác định rõ bởi mệnh đề phụ hoặc ngữ cảnh chung.',
  },
];

export const VocabularyGrammarView: React.FC = () => {
  const { vocabBank, toggleVocabBookmark, recordVocabReview, user, audioFeedbackSound } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'flashcards' | 'dictionary' | 'grammar'>('flashcards');
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState<'all' | HighSchoolGrade>('all');
  const [levelFilter, setLevelFilter] = useState<'all' | CEFRLevel>('all');

  const trackVocab = useMemo(() => vocabBank.filter((word) => {
    const belongsToTrack = word.track === user.track || word.track === 'both';
    const matchesGrade = user.track !== 'high_school' || gradeFilter === 'all' || !word.grade || word.grade === gradeFilter;
    const matchesLevel = user.track !== 'professional' || levelFilter === 'all' || word.cefrLevel === levelFilter;
    return belongsToTrack && matchesGrade && matchesLevel;
  }), [vocabBank, user.track, gradeFilter, levelFilter]);

  const dueVocabBank = useMemo(() => {
    const now = Date.now();
    return trackVocab.filter((word) => !word.nextReviewAt || new Date(word.nextReviewAt).getTime() <= now);
  }, [trackVocab]);
  const currentWord = dueVocabBank[currentFlashcardIndex] || dueVocabBank[0];

  const handleNextFlashcard = (remembered: boolean) => {
    if (!currentWord) return;
    recordVocabReview(currentWord.id, remembered);
    setIsFlipped(false);
    if (remembered) audioFeedbackSound();
    // The reviewed card leaves the due queue; restart at the first remaining due card.
    setCurrentFlashcardIndex(0);
  };

  const reviewedWordsCount = trackVocab.filter((word) => (word.reviewCount || 0) > 0).length;
  const totalReviewCount = trackVocab.reduce((sum, word) => sum + (word.reviewCount || 0), 0);
  const successfulReviewCount = trackVocab.reduce((sum, word) => sum + (word.successfulReviewCount || 0), 0);
  const selfReportedRetention = totalReviewCount ? Math.round((successfulReviewCount / totalReviewCount) * 100) : null;

  const filteredVocab = trackVocab.filter(
    (v) =>
      v.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.meaningVi.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.topic.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const visibleGrammarClinics = [
    ...GRAMMAR_CLINICS,
    ...TRACK_GRAMMAR_CLINICS.filter((clinic) =>
      clinic.track === user.track &&
      (user.track !== 'high_school' || gradeFilter === 'all' || clinic.grade === gradeFilter)
    ),
  ];

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">
            VOCABULARY & GRAMMAR ENGINE · RETENTION
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Spaced Repetition & Contextual Lexicon
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Build long-term memory with collocations, IPA audio, and Vietnamese grammar clinics.
          </p>
        </div>

        {/* Sub Tabs */}
        <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
          <button
            onClick={() => setActiveSubTab('flashcards')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeSubTab === 'flashcards'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Spaced Flashcards
          </button>
          <button
            onClick={() => setActiveSubTab('dictionary')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeSubTab === 'dictionary'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Vocab Bank ({vocabBank.length})
          </button>
          <button
            onClick={() => setActiveSubTab('grammar')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeSubTab === 'grammar'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Grammar Clinics
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="text-xs text-slate-500">Words due now</div><div className="mt-1 text-2xl font-bold text-slate-900">{dueVocabBank.length}</div></div>
        <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="text-xs text-slate-500">Words personally reviewed</div><div className="mt-1 text-2xl font-bold text-slate-900">{reviewedWordsCount}</div></div>
        <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="text-xs text-slate-500">Self-reported recall</div><div className="mt-1 text-2xl font-bold text-slate-900">{selfReportedRetention === null ? '—' : selfReportedRetention + '%'}</div><div className="text-[10px] text-slate-500">{totalReviewCount} review decisions · not an objective test score</div></div>
      </div>

      {/* Tab 1: Spaced Repetition Flashcard */}
      {activeSubTab === 'flashcards' && currentWord && (
        <div className="max-w-xl mx-auto space-y-6">
          <div className="text-center text-xs text-slate-500 font-medium">
            CARD {currentFlashcardIndex + 1} OF {dueVocabBank.length} DUE · MASTERY LEVEL {currentWord.masteryLevel}/5
          </div>

          {/* Flashcard Body */}
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="cursor-pointer min-h-[300px] p-8 rounded-3xl bg-white border-2 border-slate-200 hover:border-emerald-400 transition-all shadow-md flex flex-col justify-between text-center relative"
          >
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                {currentWord.grade || currentWord.cefrLevel}
              </span>
              <span className="text-[10px] text-slate-400">{currentWord.topic}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  audioEngine.speak(currentWord.word, { rate: 0.9 });
                }}
                className="p-2 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>

            {!isFlipped ? (
              // Front: Word, IPA, POS
              <div className="py-8 space-y-3">
                <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">
                  {currentWord.word}
                </h2>
                <div className="font-mono text-emerald-700 font-semibold text-base">
                  {currentWord.ipa}
                </div>
                <span className="text-xs text-slate-400 italic font-medium">
                  {currentWord.pos}
                </span>
                <p className="text-xs text-slate-400 pt-4">Tap anywhere to flip card</p>
              </div>
            ) : (
              // Back: Meaning, Definition, Examples, Collocations
              <div className="py-4 space-y-3 text-left">
                <div className="text-center pb-2 border-b border-slate-100">
                  <div className="text-xl font-bold text-emerald-800">
                    {currentWord.meaningVi}
                  </div>
                  <div className="text-xs text-slate-600 mt-1">
                    {currentWord.definitionEn}
                  </div>
                </div>

                <div className="text-xs space-y-1">
                  <span className="font-bold text-slate-900 block">Example Sentence:</span>
                  <p className="text-slate-800 italic">"{currentWord.exampleEn}"</p>
                  <p className="text-slate-500">{currentWord.exampleVi}</p>
                </div>

                {currentWord.collocations && currentWord.collocations.length > 0 && (
                  <div className="text-xs pt-2">
                    <span className="font-bold text-slate-900 block mb-1">
                      Common Collocations:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {currentWord.collocations.map((col, cIdx) => (
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
            )}

            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              {isFlipped ? 'Tap to flip back' : 'Spaced Repetition Engine'}
            </div>
          </div>

          {/* Review Decision Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handleNextFlashcard(false)}
              className="p-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
            >
              Still Learning (Repeat)
            </button>
            <button
              onClick={() => handleNextFlashcard(true)}
              className="p-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition-colors"
            >
              Remembered Well (+1 Level · XP)
            </button>
          </div>
        </div>
      )}

      {activeSubTab === 'flashcards' && !currentWord && (
        <div className="mx-auto max-w-xl rounded-3xl border border-emerald-200 bg-emerald-50 p-8 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
          <h2 className="mt-3 text-xl font-bold text-slate-900">You are all caught up</h2>
          <p className="mt-2 text-sm text-slate-600">There are no vocabulary cards due right now. Come back when your next review is scheduled.</p>
          <p className="mt-3 text-xs text-slate-500">{vocabBank.length} words in your bank · review history is saved on this device.</p>
        </div>
      )}

      {/* Tab 2: Full Vocab Bank List */}
      {activeSubTab === 'dictionary' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search English word or Vietnamese meaning..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {user.track === 'high_school' ? (
                <select value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value as 'all' | HighSchoolGrade)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-700">
                  <option value="all">All grades · 10–12</option>
                  <option value="Grade 10">Grade 10</option>
                  <option value="Grade 11">Grade 11</option>
                  <option value="Grade 12">Grade 12</option>
                </select>
              ) : (
                <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value as 'all' | CEFRLevel)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-700">
                  <option value="all">All professional levels</option>
                  {(['A1','A2','B1','B2','C1','C2'] as CEFRLevel[]).map((level) => <option key={level} value={level}>{level}</option>)}
                </select>
              )}
              <span className="text-xs text-slate-500 font-medium">Showing {filteredVocab.length} words</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredVocab.map((vocab) => (
              <div
                key={vocab.id}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-base">{vocab.word}</span>
                    <span className="font-mono text-emerald-700 font-semibold">{vocab.ipa}</span>
                    <span className="text-slate-400 text-[10px]">{vocab.pos}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => audioEngine.speak(vocab.word, { rate: 0.9 })}
                      className="p-1 text-slate-500 hover:text-emerald-600 rounded"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => toggleVocabBookmark(vocab.id)}
                      className={`p-1 rounded ${
                        user.bookmarkedVocabIds.includes(vocab.id)
                          ? 'text-amber-500 fill-amber-500'
                          : 'text-slate-400'
                      }`}
                    >
                      <Bookmark className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="font-semibold text-emerald-900">{vocab.meaningVi}</div>
                <div className="text-[10px] text-slate-400">{vocab.grade || vocab.cefrLevel} · {vocab.topic}</div>
                <p className="text-slate-600">{vocab.definitionEn}</p>
                <div className="pt-1 text-[11px] text-slate-500 italic">
                  "{vocab.exampleEn}"
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Grammar Clinics for Vietnamese Learners */}
      {activeSubTab === 'grammar' && (
        <div className="space-y-4">
          {visibleGrammarClinics.map((clinic) => (
            <div
              key={clinic.id}
              className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base text-slate-900">{clinic.title}</h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  {clinic.level}
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">{clinic.issue}</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                  <span className="font-bold text-emerald-900 block mb-0.5">✓ Correct Natural Form:</span>
                  <p className="text-emerald-950 font-medium">{clinic.correctExample}</p>
                </div>
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
                  <span className="font-bold text-rose-900 block mb-0.5">✗ Common Mistake:</span>
                  <p className="text-rose-950 font-medium line-through">{clinic.incorrectExample}</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
                <strong>Giải thích ngữ pháp:</strong> {clinic.ruleVi}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
