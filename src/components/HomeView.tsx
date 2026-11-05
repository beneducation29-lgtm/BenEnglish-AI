import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Headphones,
  Mic,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Clock,
  Flame,
  Award,
  BookOpen,
  MessageSquare,
  Users,
  Volume2,
  RefreshCw,
  Compass,
} from 'lucide-react';
import { fetchCoachPlan, CoachPlanData } from '../services/api';
import { HighSchoolGrade, ProfessionalOccupation, CEFRLevel } from '../types';

export const HomeView: React.FC = () => {
  const {
    user,
    setActiveTab,
    switchTrack,
    updateGrade,
    updateOccupation,
    updateCefrLevel,
  } = useApp();

  const [coachPlan, setCoachPlan] = useState<CoachPlanData | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);

  const loadDailyPlan = async () => {
    setLoadingPlan(true);
    setPlanError(null);
    try {
      const data = await fetchCoachPlan({
        track: user.track,
        gradeOrOccupation: user.track === 'high_school' ? user.grade || 'Grade 11' : user.occupation || 'Software & Tech',
        performanceStats: {
          listeningScore: user.recentListeningScores.length ? user.recentListeningScores[user.recentListeningScores.length - 1] : null,
          speakingScore: user.recentSpeakingScores.length ? user.recentSpeakingScores[user.recentSpeakingScores.length - 1] : null,
          pronunciationScore: user.recentPronunciationScores.length ? user.recentPronunciationScores[user.recentPronunciationScores.length - 1] : null,
          weakAreas: (user.listeningProgress?.misunderstoodVocab || []).map((item) => `Listening: ${item.word} (${item.count} missed)`),
        },
      });
      setCoachPlan(data);
    } catch (err: any) {
      console.error(err);
      setPlanError('AI Coach is offline. Showing a general practice plan; no performance diagnosis is available.');
      // Fallback structured plan
      setCoachPlan({
        coachGreeting: `Good day ${user.name}! Ready to elevate your spoken English today?`,
        diagnosticSummary:
          'No verified assessment data is available yet. Complete listening or speaking activities to receive evidence-based recommendations.',
        dailyPriority:
          user.track === 'high_school' ? 'Build your first listening and speaking activity history' : 'Build your first workplace English activity history',
        targetMinutes: 25,
        learningCycleSteps: [
          {
            phase: '1. LEARN & LISTEN',
            title: 'Intensive Listening Lab',
            action: 'Listen to native dialogues, identify linking sounds (/end ʌp/), and note unfamiliar collocations.',
            estimatedMinutes: 8,
            recommendedLab: 'listening',
          },
          {
            phase: '2. PRONUNCIATION CLINIC',
            title: 'IPA Sound Mastery',
            action: 'Choose a pronunciation drill and save an evaluation before treating any sound as a personal weakness.',
            estimatedMinutes: 6,
            recommendedLab: 'pronunciation',
          },
          {
            phase: '3. SPEAK & RECEIVE FEEDBACK',
            title: 'Voice AI Conversation Room',
            action: 'Complete a short conversation and review the saved feedback.',
            estimatedMinutes: 11,
            recommendedLab: 'conversation',
          },
        ],
        coachMotivationalQuote:
          '"Fluency is not the absence of mistakes; it is the courage to speak through them until accuracy becomes second nature."',
      });
    } finally {
      setLoadingPlan(false);
    }
  };

  useEffect(() => {
    loadDailyPlan();
  }, [user.track, user.grade, user.occupation]);

  return (
    <div className="space-y-10 pb-16">
      {/* Hero Showcase with Generated Visual Asset */}
      <section className="relative overflow-hidden rounded-3xl bg-slate-950 text-white shadow-xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch min-h-[440px]">
          {/* Left Text Zone */}
          <div className="lg:col-span-7 p-8 sm:p-12 flex flex-col justify-between z-10">
            <div>
              <div className="flex items-center gap-2 text-xs font-medium text-emerald-400 mb-3">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>BENENGLISH AI ACADEMY</span>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span className="text-slate-300">Listening & Speaking Specialization</span>
              </div>

              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
                Master Spoken English with Your <span className="text-emerald-400">Personal AI Tutor</span>
              </h1>

              <p className="mt-4 text-sm sm:text-base text-slate-300 max-w-xl leading-relaxed">
                Designed specifically for Vietnamese high school students and ambitious professionals.
                Practice real conversations, conquer pronunciation hurdles, and prepare for exams with instantaneous acoustic feedback.
              </p>
            </div>

            {/* Core Philosophy Banner */}
            <div className="mt-6 pt-6 border-t border-slate-800/80">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                The BenEnglish 8-Stage Mastery Cycle:
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] sm:text-xs text-slate-300 font-medium">
                <span className="text-emerald-400 font-semibold">LEARN</span>
                <span className="text-slate-600">→</span>
                <span>LISTEN</span>
                <span className="text-slate-600">→</span>
                <span>UNDERSTAND</span>
                <span className="text-slate-600">→</span>
                <span className="text-emerald-400 font-semibold">SPEAK</span>
                <span className="text-slate-600">→</span>
                <span>FEEDBACK</span>
                <span className="text-slate-600">→</span>
                <span>CORRECT</span>
                <span className="text-slate-600">→</span>
                <span>REPEAT</span>
                <span className="text-slate-600">→</span>
                <span className="text-amber-400 font-bold">MASTER</span>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                onClick={() => setActiveTab('conversation')}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm transition-all shadow-md hover:shadow-emerald-500/20 flex items-center gap-2 whitespace-nowrap shrink-0"
              >
                <Mic className="w-4 h-4" />
                <span>Start AI Voice Room</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setActiveTab('listening')}
                className="px-5 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-white font-medium text-sm transition-colors border border-slate-700/80 flex items-center gap-2 whitespace-nowrap shrink-0"
              >
                <Headphones className="w-4 h-4 text-emerald-400" />
                <span>Open Listening Lab</span>
              </button>
            </div>
          </div>

          {/* Right Hero Image */}
          <div className="lg:col-span-5 relative min-h-[260px] lg:min-h-full">
            <img
              src="/src/assets/images/benenglish_hero_banner_1793851275036.jpg"
              alt="BenEnglish AI Academy Learners practicing listening and speaking"
              referrerPolicy="no-referrer"
              className="absolute inset-0 w-full h-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-slate-950 via-slate-950/30 to-transparent"></div>
          </div>
        </div>
      </section>

      {/* Track & Personalization Configuration Strip */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="text-xs text-slate-500 font-medium">YOUR ACTIVE LEARNING TRACK</div>
            <h2 className="text-xl font-bold text-slate-900 mt-1 flex items-center gap-2">
              {user.track === 'high_school' ? 'Track A: High School English' : 'Track B: Professional English'}
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                Level {user.cefrLevel}
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {user.track === 'high_school'
                ? `Current Level: ${user.grade || 'Grade 11'} · Curricula aligned with CEFR & National Examinations`
                : `Domain: ${user.occupation || 'Software & Tech'} · Workplace & Global Business English`}
            </p>
          </div>

          {/* Controls: Track Switcher & Grade / Occupation Selector */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex rounded-lg bg-slate-100 p-1 border border-slate-200">
              <button
                onClick={() => switchTrack('high_school')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  user.track === 'high_school'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                High School (Grades 10-12)
              </button>
              <button
                onClick={() => switchTrack('professional')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  user.track === 'professional'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Professional Track
              </button>
            </div>

            {user.track === 'high_school' ? (
              <select
                value={user.grade || 'Grade 11'}
                onChange={(e) => updateGrade(e.target.value as HighSchoolGrade)}
                className="text-xs font-medium bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Grade 10">Grade 10 (Lớp 10)</option>
                <option value="Grade 11">Grade 11 (Lớp 11)</option>
                <option value="Grade 12">Grade 12 (Lớp 12 & Thi TN)</option>
              </select>
            ) : (
              <select
                value={user.occupation || 'Software & Tech'}
                onChange={(e) => updateOccupation(e.target.value as ProfessionalOccupation)}
                className="text-xs font-medium bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Software & Tech">Software & Technology</option>
                <option value="Finance & Banking">Finance & Banking</option>
                <option value="Sales & Marketing">Sales & Marketing</option>
                <option value="Human Resources">Human Resources (HR)</option>
                <option value="Customer Support">Customer Support</option>
                <option value="Healthcare & Medical">Healthcare & Medical</option>
                <option value="International Business">International Business</option>
              </select>
            )}

            <select
              value={user.cefrLevel}
              onChange={(e) => updateCefrLevel(e.target.value as CEFRLevel)}
              className="text-xs font-medium bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="A1">CEFR A1</option>
              <option value="A2">CEFR A2</option>
              <option value="B1">CEFR B1</option>
              <option value="B2">CEFR B2</option>
              <option value="C1">CEFR C1</option>
            </select>
          </div>
        </div>
      </section>

      {/* AI Learning Coach: Adaptive Daily Action Plan */}
      <section className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-emerald-600 tracking-wide">
                ADAPTIVE LEARNING COACH
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                Personalized Training Regimen For Today
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadDailyPlan}
              disabled={loadingPlan}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingPlan ? 'animate-spin' : ''}`} />
              <span>Regenerate Plan</span>
            </button>
          </div>
        </div>

        {loadingPlan ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-500">
            <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-sm">Personalizing your speaking & listening plan with Gemini...</p>
          </div>
        ) : coachPlan ? (
          <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 text-slate-800 text-sm leading-relaxed">
              <p className="font-semibold text-emerald-950 mb-1">{coachPlan.coachGreeting}</p>
              <p className="text-slate-700">{coachPlan.diagnosticSummary}</p>
              <div className="mt-3 flex items-center gap-3 text-xs text-emerald-800 font-medium">
                <span className="font-semibold text-emerald-900">Today's Priority:</span>
                <span>{coachPlan.dailyPriority}</span>
                <span aria-hidden="true" className="text-emerald-300">·</span>
                <span>Target: {coachPlan.targetMinutes} minutes</span>
              </div>
            </div>

            {/* 3 Steps in Cycle */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {coachPlan.learningCycleSteps.map((step, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200 hover:border-emerald-300 hover:bg-white transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider mb-1">
                      {step.phase}
                    </div>
                    <h3 className="font-bold text-slate-900 text-base mb-2">{step.title}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed mb-4">{step.action}</p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-200/70 text-xs">
                    <span className="text-slate-500 flex items-center gap-1 font-medium">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {step.estimatedMinutes} mins
                    </span>
                    <button
                      onClick={() => setActiveTab((step.recommendedLab as any) || 'listening')}
                      className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 hover:underline"
                    >
                      <span>Open Lab</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {coachPlan.coachMotivationalQuote && (
              <div className="text-center italic text-xs text-slate-500 pt-2">
                {coachPlan.coachMotivationalQuote}
              </div>
            )}
          </div>
        ) : null}
      </section>

      {/* 4 Core Studios Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              CORE LABS
            </div>
            <h2 className="text-2xl font-bold text-slate-900">
              Choose Your Learning Activity
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* 1. Listening Lab */}
          <div
            onClick={() => setActiveTab('listening')}
            className="group cursor-pointer rounded-2xl bg-white border border-slate-200 p-5 hover:border-emerald-400 hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Headphones className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-lg mb-1 group-hover:text-emerald-700 transition-colors">
                Listening Lab
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Intensive listening, dictation typing test, comprehension quizzes, and sentence shadowing with speed control (0.5x–1.5x).
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-emerald-600">
              <span>5 Activities Inside</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* 2. Speaking Lab */}
          <div
            onClick={() => setActiveTab('speaking')}
            className="group cursor-pointer rounded-2xl bg-white border border-slate-200 p-5 hover:border-emerald-400 hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Mic className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-lg mb-1 group-hover:text-emerald-700 transition-colors">
                Speaking Lab
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Pronunciation coach, Read Aloud with WPM speed, and Free Speaking with detailed IELTS Band & CEFR rubric evaluation.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-emerald-600">
              <span>Rubric Feedback</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* 3. AI Voice Room */}
          <div
            onClick={() => setActiveTab('conversation')}
            className="group cursor-pointer rounded-2xl bg-white border border-slate-200 p-5 hover:border-emerald-400 hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-lg mb-1 group-hover:text-emerald-700 transition-colors">
                AI Voice Room
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Speak directly with 5 tutor personalities across 6 conversation modes. Immediate gentle error correction and spoken responses.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-emerald-600">
              <span>Voice Interaction</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* 4. Real-Life Roleplay */}
          <div
            onClick={() => setActiveTab('roleplay')}
            className="group cursor-pointer rounded-2xl bg-white border border-slate-200 p-5 hover:border-emerald-400 hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-lg mb-1 group-hover:text-emerald-700 transition-colors">
                Roleplay Engine
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Step into authentic situations: Job interviews, client negotiations, exchange student chats, and student council debates.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-emerald-600">
              <span>Goal Tracking</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
