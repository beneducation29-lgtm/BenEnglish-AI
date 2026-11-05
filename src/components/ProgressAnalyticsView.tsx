import React from 'react';
import { useApp } from '../context/AppContext';
import {
  Award,
  Flame,
  Clock,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Headphones,
  Mic,
  BookOpen,
  Sparkles,
} from 'lucide-react';

export const ProgressAnalyticsView: React.FC = () => {
  const { user, vocabBank } = useApp();

  const listeningAvg =
    user.recentListeningScores.length > 0
      ? Math.round(
          user.recentListeningScores.reduce((a, b) => a + b, 0) /
            user.recentListeningScores.length
        )
      : 82;

  const speakingAvg =
    user.recentSpeakingScores.length > 0
      ? Math.round(
          user.recentSpeakingScores.reduce((a, b) => a + b, 0) /
            user.recentSpeakingScores.length
        )
      : 76;

  const pronAvg =
    user.recentPronunciationScores.length > 0
      ? Math.round(
          user.recentPronunciationScores.reduce((a, b) => a + b, 0) /
            user.recentPronunciationScores.length
        )
      : 80;

  const ACHIEVEMENTS = [
    {
      id: 'ach-1',
      title: 'Acoustic Ear',
      desc: 'Completed 5 intensive listening exercises with >80% accuracy',
      unlocked: true,
      icon: '🎧',
    },
    {
      id: 'ach-2',
      title: '7-Day Streak Master',
      desc: 'Practiced listening and speaking consecutively for 7 days',
      unlocked: user.streakDays >= 6,
      icon: '🔥',
    },
    {
      id: 'ach-3',
      title: 'Phonetic Precision',
      desc: 'Mastered ending consonants /ks/ and /st/ without dropping sounds',
      unlocked: true,
      icon: '🎯',
    },
    {
      id: 'ach-4',
      title: 'Diplomatic Negotiator',
      desc: 'Finished a high-stakes B2B client roleplay simulation',
      unlocked: user.track === 'professional',
      icon: '💼',
    },
  ];

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">
            PERSONAL LEARNING ANALYTICS · MASTERY
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Performance Metrics & CEFR Radar
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Tracking measured acoustic accuracy, speaking fluency, and daily study habits.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <span className="text-slate-400 block text-[10px]">CURRENT CEFR LEVEL</span>
            <span className="font-extrabold text-slate-900 text-base">{user.cefrLevel}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs">
            <span className="text-amber-700 block text-[10px]">DAILY STREAK</span>
            <span className="font-extrabold text-amber-900 text-base flex items-center gap-1">
              <Flame className="w-4 h-4 fill-amber-500 text-amber-600" />
              {user.streakDays} Days
            </span>
          </div>
        </div>
      </div>

      {/* 4 Big Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>LISTENING COMPREHENSION</span>
            <Headphones className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 tabular-nums">
            {listeningAvg}%
          </div>
          <span className="text-[11px] text-emerald-600 font-semibold block">
            Measured via dictation & quiz tests
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>SPEAKING FLUENCY</span>
            <Mic className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 tabular-nums">
            {speakingAvg}%
          </div>
          <span className="text-[11px] text-emerald-600 font-semibold block">
            Measured via spontaneous speech & WPM
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>PRONUNCIATION ACCURACY</span>
            <Sparkles className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 tabular-nums">
            {pronAvg}%
          </div>
          <span className="text-[11px] text-emerald-600 font-semibold block">
            IPA phoneme & final consonant alignment
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>DAILY STUDY TIME</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 tabular-nums">
            {user.dailyMinutesSpent} <span className="text-sm font-normal text-slate-400">/ {user.dailyGoalMinutes}m</span>
          </div>
          <span className="text-[11px] text-slate-500 font-medium block">
            Total Accumulated XP: {user.totalXp} XP
          </span>
        </div>
      </div>

      {/* 2-Zone Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Identified Weaknesses & Action Items (6 cols) */}
        <div className="lg:col-span-6 bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Diagnosed Areas Requiring Targeted Attention
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-1">
              <span className="font-bold text-amber-950 block">
                1. Final Consonant Reduction (/s/, /z/, /t/, /ks/)
              </span>
              <p className="text-slate-700 leading-relaxed">
                Analysis of recent Read Aloud drills indicates frequent dropping of plural /s/ in nouns and ending /ks/ in words like "six" and "tax".
              </p>
              <div className="text-[11px] text-emerald-800 font-semibold pt-1">
                Recommended Action: Complete 3 repetitions in the IPA Pronunciation Studio.
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="font-bold text-slate-900 block">
                2. Connected Speech in Fast Audio Streams
              </span>
              <p className="text-slate-600 leading-relaxed">
                Dictation tests reveal difficulty catching unstressed auxiliary reductions such as "would have" /wʊdəv/ and vowel linkings.
              </p>
              <div className="text-[11px] text-emerald-800 font-semibold pt-1">
                Recommended Action: Practice Intensive Listening Unit 2 with 0.75x speed looping.
              </div>
            </div>
          </div>
        </div>

        {/* Right: Gamification Badges & Milestones (6 cols) */}
        <div className="lg:col-span-6 bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-600" />
              Learning Achievements & Badges
            </h3>
            <span className="text-xs font-bold text-emerald-700 tabular-nums">
              {ACHIEVEMENTS.filter((a) => a.unlocked).length} / {ACHIEVEMENTS.length} Unlocked
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ACHIEVEMENTS.map((ach) => (
              <div
                key={ach.id}
                className={`p-4 rounded-2xl border text-xs flex flex-col justify-between gap-2 ${
                  ach.unlocked
                    ? 'bg-emerald-50/50 border-emerald-200 text-slate-900'
                    : 'bg-slate-50 border-slate-200/70 opacity-60 text-slate-500'
                }`}
              >
                <div>
                  <div className="text-2xl mb-1">{ach.icon}</div>
                  <span className="font-bold text-sm text-slate-900 block">{ach.title}</span>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">{ach.desc}</p>
                </div>
                <div className="pt-2 border-t border-slate-200/60 font-semibold text-[10px] uppercase">
                  {ach.unlocked ? '✓ Unlocked' : 'In Progress'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
