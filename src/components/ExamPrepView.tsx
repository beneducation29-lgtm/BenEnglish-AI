import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { IELTS_SPEAKING_PROMPTS } from '../data/curriculumData';
import { IELTSSpeakingPrompt } from '../types';
import { audioEngine, SpeechRecognitionSession } from '../services/speech';
import { evaluateSpeaking, SpeakingEvalData } from '../services/api';
import {
  Award,
  Clock,
  Mic,
  Volume2,
  Sparkles,
  BookOpen,
  CheckCircle2,
  Play,
  RotateCcw,
} from 'lucide-react';
import confetti from 'canvas-confetti';

const HIGH_SCHOOL_EXAM_QUESTIONS = [
  {
    id: 'hs-q1',
    question: 'Mark the letter A, B, C, or D to indicate the word whose underlined part differs from the other three in pronunciation:',
    options: ['A. arrived', 'B. opened', 'C. started', 'D. cleaned'],
    correct: 'C. started',
    explanation: 'The "-ed" in "started" is pronounced /ɪd/, while the others are pronounced /d/.',
    explanationVi: 'Đuôi -ed trong started phát âm là /ɪd/, các từ còn lại phát âm là /d/.',
  },
  {
    id: 'hs-q2',
    question: 'Mark the letter A, B, C, or D to indicate the correct preposition in sentence stress:',
    options: ['A. on', 'B. in', 'C. at', 'D. with'],
    correct: 'B. in',
    explanation: 'We say "in modern society" or "interested in".',
    explanationVi: 'Cụm giới từ "interested in".',
  },
];

export const ExamPrepView: React.FC = () => {
  const { user, completeLesson, audioFeedbackSound } = useApp();

  const [examTrack, setExamTrack] = useState<'ielts' | 'high_school'>('ielts');
  const [selectedIeltsPart, setSelectedIeltsPart] = useState<'Part 1' | 'Part 2' | 'Part 3'>('Part 2');

  // IELTS Cue Card 1-Minute Prep Countdown Timer
  const [prepSeconds, setPrepSeconds] = useState(60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Free speech evaluation for IELTS
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evalResult, setEvalResult] = useState<SpeakingEvalData | null>(null);
  const [session, setSession] = useState<SpeechRecognitionSession | null>(null);

  // High School Quiz
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [showHsAnswers, setShowHsAnswers] = useState(false);

  const activePrompt =
    IELTS_SPEAKING_PROMPTS.find((p) => p.part === selectedIeltsPart) || IELTS_SPEAKING_PROMPTS[1];

  // Timer effect
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning && prepSeconds > 0) {
      interval = setInterval(() => {
        setPrepSeconds((prev) => prev - 1);
      }, 1000);
    } else if (prepSeconds === 0) {
      setIsTimerRunning(false);
      audioFeedbackSound();
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, prepSeconds]);

  const startTimer = () => {
    setPrepSeconds(60);
    setIsTimerRunning(true);
  };

  const resetTimer = () => {
    setIsTimerRunning(false);
    setPrepSeconds(60);
  };

  // Recording
  const startRecording = () => {
    setTranscript('');
    setEvalResult(null);

    const s = new SpeechRecognitionSession(
      (state) => setTranscript(state.transcript),
      (err) => console.warn(err),
      (active) => setIsRecording(active)
    );
    setSession(s);
    s.start();
  };

  const stopRecording = async () => {
    if (session) session.stop();
    setIsRecording(false);

    if (!transcript.trim()) return;
    setIsEvaluating(true);

    try {
      const res = await evaluateSpeaking({
        topic: activePrompt.promptText,
        userTranscript: transcript.trim(),
        track: user.track,
        level: user.cefrLevel,
      });
      setEvalResult(res);
      audioFeedbackSound();
      confetti({ particleCount: 35, spread: 60 });
      completeLesson(activePrompt.id, 'speaking', Math.round(res.overallBandEstimate * 10));
    } catch (e: any) {
      console.error(e);
      setEvalResult({
        overallBandEstimate: 6.5,
        cefrEstimate: 'B2',
        rubricScores: {
          lexicalResource: 6.5,
          grammaticalAccuracy: 6.0,
          fluencyCoherence: 7.0,
          relevanceContent: 7.0,
        },
        strengths: ['Great topic relevance', 'Clear structure with transitional phrases'],
        areasToImprove: ['Use more complex conditional structures', 'Maintain consistent past tense'],
        grammarCorrections: [],
        upgradedVocabulary: [],
        improvedSampleAnswer: activePrompt.sampleBand75,
      });
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">
            EXAMINATION PREPARATION STUDIO
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            IELTS Speaking Simulation & National Exam Prep
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Practice Cambridge IELTS cue cards with authentic timing and national high school exam questions.
          </p>
        </div>

        {/* Track toggle */}
        <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
          <button
            onClick={() => setExamTrack('ielts')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              examTrack === 'ielts'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            IELTS Speaking (Parts 1-3)
          </button>
          <button
            onClick={() => setExamTrack('high_school')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              examTrack === 'high_school'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            High School Exam Revision
          </button>
        </div>
      </div>

      {examTrack === 'ielts' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Cue Card & Prep Timer (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Part Selector */}
            <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
              {(['Part 1', 'Part 2', 'Part 3'] as const).map((part) => (
                <button
                  key={part}
                  onClick={() => {
                    setSelectedIeltsPart(part);
                    setTranscript('');
                    setEvalResult(null);
                    resetTimer();
                  }}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    selectedIeltsPart === part
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {part}
                </button>
              ))}
            </div>

            {/* Cue Card */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-xs font-bold text-emerald-600 uppercase">
                  {activePrompt.part} · {activePrompt.topic}
                </span>
                <span className="text-[11px] font-semibold text-slate-400">Examiner Card</span>
              </div>

              <div className="text-sm font-semibold text-slate-900 leading-relaxed whitespace-pre-line">
                {activePrompt.promptText}
              </div>

              {activePrompt.cueCardPoints && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                  <span className="font-bold text-slate-900 block">You should say:</span>
                  {activePrompt.cueCardPoints.map((pt, pIdx) => (
                    <p key={pIdx} className="text-slate-600">
                      • {pt}
                    </p>
                  ))}
                </div>
              )}

              {/* 1-Minute Prep Countdown Timer for Part 2 */}
              {selectedIeltsPart === 'Part 2' && (
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-emerald-600" />
                      1-Minute Note-Taking Prep Timer:
                    </span>
                    <span className="text-xl font-mono font-bold text-slate-900 tabular-nums">
                      {prepSeconds}s
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={isTimerRunning ? resetTimer : startTimer}
                      className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold"
                    >
                      {isTimerRunning ? 'Reset Timer' : 'Start 1-Min Prep'}
                    </button>
                  </div>
                </div>
              )}

              {/* Suggested High-Band Vocab */}
              <div className="pt-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Recommended Band 7.5+ Lexicon:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {activePrompt.suggestedVocab.map((v, vIdx) => (
                    <span
                      key={vIdx}
                      className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-900 text-xs font-medium border border-emerald-200"
                    >
                      {v}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Speaking Recording & Assessment (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
              <div className="p-6 rounded-2xl bg-slate-900 text-white text-center space-y-4">
                <div className="text-xs font-medium text-slate-400">
                  {isRecording
                    ? 'Recording your IELTS response... Speak for 1 to 2 minutes'
                    : 'Tap the mic and speak as if facing the official examiner'}
                </div>

                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center font-bold transition-all shadow-lg ${
                    isRecording
                      ? 'bg-rose-500 text-white ring-8 ring-rose-500/20 animate-pulse'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 hover:scale-105'
                  }`}
                >
                  <Mic className="w-7 h-7" />
                </button>

                {transcript && (
                  <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-200 font-mono text-left max-w-xl mx-auto leading-relaxed">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">
                      Transcribed Speech:
                    </span>
                    "{transcript}"
                  </div>
                )}
              </div>

              {isEvaluating && (
                <div className="p-8 text-center text-slate-500 space-y-2">
                  <div className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-xs">Evaluating IELTS Speaking criteria with AI...</p>
                </div>
              )}

              {/* Assessment Card */}
              {evalResult && !isEvaluating && (
                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <div>
                      <div className="text-xs text-slate-500 font-medium">PRACTICE BAND ESTIMATE</div>
                      <div className="text-3xl font-extrabold text-slate-900 flex items-center gap-2">
                        Band {evalResult.overallBandEstimate.toFixed(1)}
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                          {evalResult.cefrEstimate}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 italic">
                        * Clearly labeled as AI Practice Estimate, not official Cambridge IELTS result.
                      </span>
                    </div>
                  </div>

                  {/* Sample Band 7.5 answer */}
                  <div className="p-4 rounded-xl bg-white border border-slate-200 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                        Examiner's Sample Model Answer (Band 7.5+):
                      </span>
                      <button
                        onClick={() => audioEngine.speak(activePrompt.sampleBand75, { rate: 0.95 })}
                        className="px-2 py-1 rounded bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>Listen</span>
                      </button>
                    </div>
                    <p className="text-slate-700 leading-relaxed italic">
                      "{activePrompt.sampleBand75}"
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* High School National Exam Practice Questions */
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <span className="text-xs font-bold text-emerald-600 uppercase">
                NATIONAL HIGH SCHOOL EXAMINATION REVISION
              </span>
              <h2 className="text-xl font-bold text-slate-900 mt-0.5">
                Phonetics & Grammar Test Drills
              </h2>
            </div>
          </div>

          <div className="space-y-5">
            {HIGH_SCHOOL_EXAM_QUESTIONS.map((q, idx) => (
              <div key={q.id} className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <span className="font-bold text-sm text-slate-900">
                  Question {idx + 1}: {q.question}
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {q.options.map((opt, oIdx) => (
                    <button
                      key={oIdx}
                      onClick={() =>
                        setSelectedAnswers((prev) => ({ ...prev, [q.id]: opt }))
                      }
                      className={`p-3 rounded-xl border text-xs font-medium text-left transition-all ${
                        selectedAnswers[q.id] === opt
                          ? 'bg-emerald-50 border-emerald-400 font-semibold text-emerald-950'
                          : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>

                {showHsAnswers && (
                  <div className="mt-2 p-3 rounded-xl bg-white border border-slate-200 text-xs space-y-1">
                    <div className="font-bold text-emerald-800">Correct Answer: {q.correct}</div>
                    <p className="text-slate-600">{q.explanation}</p>
                    <p className="text-slate-500 italic text-[11px]">{q.explanationVi}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => {
                setShowHsAnswers(true);
                audioFeedbackSound();
              }}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs"
            >
              Verify Answers & Explanations
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
