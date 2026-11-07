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
import { PlacementTestView } from './PlacementTestView';
import { buildAdaptiveLearnerSnapshot } from '../services/adaptiveLearning';

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
  const [showPlacementTest, setShowPlacementTest] = useState(false);
  const { savePlacementAssessment } = useApp();

  const loadDailyPlan = async () => {
    setLoadingPlan(true);
    setPlanError(null);
    const learner = buildAdaptiveLearnerSnapshot(user);
    const focusLabel = learner.recommendedFocus.map(skill => skill[0].toUpperCase() + skill.slice(1)).join(' & ');
    try {
      const data = await fetchCoachPlan({
        track: user.track,
        gradeOrOccupation: user.track === 'high_school' ? user.grade || 'Grade 11' : user.occupation || 'Software & Tech',
        performanceStats: {
          listeningScore: learner.skillEvidence.listening.score,
          speakingScore: learner.skillEvidence.speaking.score,
          pronunciationScore: learner.skillEvidence.pronunciation.score,
          weakAreas: learner.weakAreas,
          recurringErrors: learner.recurringErrors,
          recentSessionNotes: learner.recentSessionNotes,
          evidenceSummary: learner.evidenceSummary,
          recommendedFocus: learner.recommendedFocus,
          placementLevel: learner.placementLevel,
          skillLevels: learner.skillLevels,
          sampleCounts: Object.fromEntries(Object.entries(learner.skillEvidence).map(([skill, evidence]) => [skill, evidence.samples])),
        },
      });
      setCoachPlan(data);
    } catch (err: any) {
      console.error(err);
      setPlanError('AI Coach is temporarily unavailable. This evidence-based practice plan was created from your saved learning record.');
      const focus = learner.recommendedFocus[0] || 'listening';
      const focusLab = focus === 'understanding' || focus === 'reading' ? 'reading-writing'
        : focus === 'pronunciation' ? 'pronunciation'
        : focus === 'speaking' ? 'speaking' : 'listening';
      const focusAction = learner.weakAreas[0] || learner.recurringErrors[0]
        || `Build more ${focus} evidence so your tutor can estimate this skill with greater confidence.`;
      setCoachPlan({
        coachGreeting: `Welcome back, ${user.name}. Let's make today's practice count.`,
        diagnosticSummary: learner.evidenceSummary.join(' · '),
        dailyPriority: `Focus today: ${focusLabel}. ${focusAction}`,
        targetMinutes: 25,
        learningCycleSteps: [
          { phase: '1. TARGETED PRACTICE', title: `Strengthen ${focus}`, action: focusAction, estimatedMinutes: 10, recommendedLab: focusLab },
          { phase: '2. RETRIEVE & APPLY', title: 'Use what you learned', action: learner.recurringErrors[0] || 'Complete a short task without looking at the model answer, then check your result.', estimatedMinutes: 7, recommendedLab: focus === 'speaking' ? 'conversation' : 'listening' },
          { phase: '3. REFLECT & REPEAT', title: 'Check your progress', action: 'Save your result and note one thing that felt easier and one thing to practise next time.', estimatedMinutes: 8, recommendedLab: 'conversation' },
        ],
        coachMotivationalQuote: 'Small, consistent practice turns feedback into progress.',
      });
    } finally {
      setLoadingPlan(false);
    }
  };

  useEffect(() => {
    loadDailyPlan();
  }, [user.track, user.grade, user.occupation, user.placementAssessment?.completedAt]);

  return (
    <div className="space-y-10 pb-16">
      {showPlacementTest && (
        <PlacementTestView
          onClose={() => setShowPlacementTest(false)}
          onComplete={(assessment) => {
            savePlacementAssessment(assessment);
            setShowPlacementTest(false);
            setPlanError(null);
          }}
        />
      )}

      <section className="rounded-3xl border border-indigo-100 bg-gradient-to-r from-indigo-50 via-white to-blue-50 p-5 shadow-sm sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-700">
              <Sparkles className="h-4 w-4" /> Your personal English tutor
            </div>
            <h2 className="mt-2 text-xl font-extrabold text-slate-900 sm:text-2xl">
              {user.placementAssessment ? 'Your learning profile is ready' : 'First, discover your English level'}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {user.placementAssessment
                ? `Your current starting level is ${user.placementAssessment.overallLevel}. Retake the diagnostic when you want to refresh your four-skill profile.`
                : 'Take a short four-skill diagnostic so BenEnglish AI can choose the right level for Listening, Speaking, Reading and Use of English.'}
            </p>
            {user.placementAssessment && (
              <div className="mt-3 flex flex-wrap gap-2">
                {Object.entries(user.placementAssessment.skills).map(([skill, result]) => (
                  <span key={skill} className="rounded-full border border-indigo-100 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-800">
                    {skill}: {result.level}
                  </span>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => setShowPlacementTest(true)} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700">
            <Sparkles className="h-4 w-4" /> {user.placementAssessment ? 'Retake placement test' : 'Start placement test'} <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>
      {/* AI-first hero: compact, warm and focused on listening + speaking */}
      <section className="relative isolate overflow-hidden rounded-[2rem] border border-amber-100 bg-[#fff9e9] shadow-sm">
        <div className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full bg-amber-200/50 blur-3xl" />
        <div className="grid min-h-[390px] lg:grid-cols-2">
          <div className="relative z-10 flex flex-col justify-center p-7 sm:p-10 lg:p-12">
            <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full bg-amber-100 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.14em] text-amber-700">
              <Sparkles className="h-4 w-4" /> AI English speaking coach
            </div>
            <h1 className="max-w-xl font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-blue-700 sm:text-5xl lg:text-[3.35rem]">
              Listen better.<br />Speak with <span className="text-amber-500">confidence.</span>
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-7 text-slate-700 sm:text-base">
              Practice real conversations, train your listening reflexes and get clear AI feedback.
              A focused daily path for Vietnamese learners at school and at work.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <button onClick={() => setActiveTab('conversation')} className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:bg-blue-700">
                <Mic className="h-4 w-4" /> Practice with AI <ArrowRight className="h-4 w-4" />
              </button>
              <button onClick={() => setActiveTab('listening')} className="inline-flex items-center justify-center gap-2 rounded-full border border-blue-300 bg-white px-6 py-3.5 text-sm font-bold text-blue-700 transition hover:bg-blue-50">
                <Headphones className="h-4 w-4" /> Train listening
              </button>
            </div>
            <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-slate-600">
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Level-matched practice</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Feedback from your real attempts</span>
            </div>
          </div>
          <div className="relative flex min-h-[280px] items-center justify-center overflow-hidden bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-500 p-6 sm:p-10">
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,white_1px,transparent_1px)] [background-size:28px_28px]" />
            <div className="relative flex w-full max-w-lg items-center justify-center gap-4 sm:gap-7">
              <div className="w-[46%] rotate-[-5deg] rounded-[1.8rem] border-[7px] border-slate-800 bg-white p-4 shadow-2xl">
                <div className="mb-5 flex items-center justify-between text-[10px] font-bold text-slate-500"><span>LISTENING LAB</span><Headphones className="h-4 w-4 text-blue-600" /></div>
                <div className="rounded-xl bg-blue-50 p-3">
                  <div className="mb-2 text-xs font-bold text-blue-800">Hear the difference</div>
                  <div className="flex h-12 items-center justify-center gap-1">
                    {["h-4","h-7","h-10","h-6","h-9","h-5","h-11","h-7","h-4","h-8","h-10","h-6","h-9","h-5","h-11","h-7","h-4","h-8","h-6"].map((height,i)=><span key={i} className={`w-1.5 ${height} rounded-full bg-blue-500`} />)}
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-blue-100"><div className="h-1.5 w-2/3 rounded-full bg-blue-500" /></div>
                </div>
                <div className="mt-4 space-y-2"><div className="h-2 w-full rounded bg-slate-100"/><div className="h-2 w-4/5 rounded bg-slate-100"/><div className="h-2 w-3/5 rounded bg-slate-100"/></div>
                <div className="mt-4 rounded-full bg-emerald-50 px-3 py-2 text-center text-[10px] font-bold text-emerald-700">Listen · Understand · Repeat</div>
              </div>
              <div className="w-[46%] rotate-[6deg] rounded-[1.8rem] border-[7px] border-slate-800 bg-slate-950 p-3 shadow-2xl">
                <div className="mb-4 flex items-center justify-between text-[10px] font-bold text-slate-300"><span>AI SPEAKING ROOM</span><span className="h-2 w-2 rounded-full bg-emerald-400"/></div>
                <div className="flex h-28 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-700 to-indigo-950">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-400 text-slate-900 shadow-lg"><Volume2 className="h-8 w-8"/></div>
                </div>
                <div className="mt-4 rounded-xl bg-white/10 p-3">
                  <div className="mb-2 text-[10px] font-bold text-amber-300">Your AI coach</div>
                  <div className="text-[10px] leading-4 text-white">“Tell me about your day. What happened next?”</div>
                </div>
                <div className="mt-3 flex items-center justify-center gap-2 rounded-full bg-blue-500 py-2 text-[10px] font-bold text-white"><Mic className="h-3 w-3"/> Start speaking</div>
              </div>
            </div>
            <div className="absolute bottom-5 left-5 rounded-full bg-white/90 px-4 py-2 text-xs font-extrabold text-blue-700 shadow">Your practice. Your pace. Your progress.</div>
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

          {/* 4. Reading & Writing */}
          <div
            onClick={() => setActiveTab('reading-writing')}
            className="group cursor-pointer rounded-2xl bg-white border border-slate-200 p-5 hover:border-emerald-400 hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-lg mb-1 group-hover:text-emerald-700 transition-colors">
                Reading & Writing
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Read level-matched passages, explore words in context, then write and save your own response.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-emerald-600">
              <span>Read → Understand → Write</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
