import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  RoleplayScenario,
  RoleplayAssistanceMode,
  RoleplayAssessmentReport,
  RoleplaySessionRecord,
  CEFRLevel,
  TrackType,
} from '../types';
import {
  sendRoleplayMessage,
  fetchRoleplayDebrief,
  generateRoleplayScenario,
  RoleplayResponseData,
} from '../services/api';
import { audioEngine, SpeechRecognitionSession } from '../services/speech';
import {
  Users,
  MessageSquare,
  Sparkles,
  Award,
  ArrowRight,
  Mic,
  MicOff,
  Volume2,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Send,
  RefreshCw,
  Plus,
  BookOpen,
  Filter,
  Search,
  Check,
  ChevronRight,
  ShieldAlert,
  Flame,
  Zap,
  HelpCircle,
  Clock,
  History,
  X,
  Play,
  RotateCcw,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const RoleplayEngineView: React.FC = () => {
  const {
    user,
    allRoleplayScenarios,
    saveRoleplaySession,
    addCustomRoleplayScenario,
    deleteCustomRoleplayScenario,
    audioFeedbackSound,
    addXp,
  } = useApp();

  // Navigation tab within Roleplay Engine
  const [subTab, setSubTab] = useState<'studio' | 'library' | 'history'>('studio');

  // Filter state for Library
  const [trackFilter, setTrackFilter] = useState<TrackType | 'all' | 'custom'>('all');
  const [levelFilter, setLevelFilter] = useState<CEFRLevel | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Active Simulation state
  const defaultTrackScenario =
    allRoleplayScenarios.find((s) => s.track === user.track) || allRoleplayScenarios[0];
  const [activeScenario, setActiveScenario] = useState<RoleplayScenario>(defaultTrackScenario);

  const [assistanceMode, setAssistanceMode] = useState<RoleplayAssistanceMode>('normal');
  const [dialogueHistory, setDialogueHistory] = useState<{ role: string; content: string }[]>([
    { role: 'model', content: defaultTrackScenario.openingAiMessage },
  ]);
  const [turnCount, setTurnCount] = useState(1);
  const [userInput, setUserInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [latestCoachingTip, setLatestCoachingTip] = useState<string>(
    'Acknowledge the opening remark warmly and introduce your perspective clearly.'
  );
  const [goalProgress, setGoalProgress] = useState<number>(15);
  const [suggestedPhrases, setSuggestedPhrases] = useState<string[]>(
    defaultTrackScenario.suggestedPhrases
  );
  const [speechSession, setSpeechSession] = useState<SpeechRecognitionSession | null>(null);

  // Objectives tracking
  const [objectiveChecklist, setObjectiveChecklist] = useState<
    { objective: string; completed: boolean }[]
  >(
    (defaultTrackScenario.conversationObjectives || []).map((obj) => ({
      objective: obj,
      completed: false,
    }))
  );

  // Unexpected Twist
  const [twistTriggered, setTwistTriggered] = useState(false);
  const [showTwistBanner, setShowTwistBanner] = useState(false);

  // Debrief Report Modal
  const [isDebriefing, setIsDebriefing] = useState(false);
  const [assessmentReport, setAssessmentReport] = useState<RoleplayAssessmentReport | null>(null);
  const [isDebriefModalOpen, setIsDebriefModalOpen] = useState(false);

  // Custom Scenario Generator Modal
  const [isGeneratorModalOpen, setIsGeneratorModalOpen] = useState(false);
  const [genTrack, setGenTrack] = useState<TrackType>(user.track);
  const [genRoleOrGrade, setGenRoleOrGrade] = useState('');
  const [genTopic, setGenTopic] = useState('');
  const [genDifficulty, setGenDifficulty] = useState<CEFRLevel>(user.cefrLevel || 'B1');
  const [genDuration, setGenDuration] = useState<number>(5);
  const [genObjectives, setGenObjectives] = useState('');
  const [isGeneratingScenario, setIsGeneratingScenario] = useState(false);
  const [generatorError, setGeneratorError] = useState<string | null>(null);

  // Auto-scroll ref
  const dialogueEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogueEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [dialogueHistory, isLoading]);

  // Handle switching scenario
  const handleSelectScenario = (s: RoleplayScenario) => {
    setActiveScenario(s);
    setDialogueHistory([{ role: 'model', content: s.openingAiMessage }]);
    setTurnCount(1);
    setUserInput('');
    setGoalProgress(15);
    setTwistTriggered(false);
    setShowTwistBanner(false);
    setAssessmentReport(null);
    setIsDebriefModalOpen(false);
    setLatestCoachingTip('Acknowledge the opening remark and introduce your perspective clearly.');
    setSuggestedPhrases(s.suggestedPhrases);
    setObjectiveChecklist(
      (s.conversationObjectives || [
        'Acknowledge the counterpart with professional or friendly courtesy',
        'State your primary goal or question clearly',
        'Propose a constructive next step',
      ]).map((obj) => ({
        objective: obj,
        completed: false,
      }))
    );
    setSubTab('studio');
    // Speak initial character opening
    audioEngine.speak(s.openingAiMessage, { rate: 1.0 });
  };

  // Mic speech handling
  const startRecording = () => {
    setUserInput('');
    const session = new SpeechRecognitionSession(
      (state) => {
        setUserInput(state.transcript);
      },
      (err) => console.warn('Speech recognition warning:', err),
      (active) => setIsRecording(active)
    );
    setSpeechSession(session);
    session.start();
  };

  const stopRecordingAndSend = () => {
    if (speechSession) {
      speechSession.stop();
    }
    setIsRecording(false);
  };

  // Trigger Debrief Generation
  const handleGenerateDebrief = async (historyToDebrief = dialogueHistory) => {
    setIsDebriefing(true);
    setIsDebriefModalOpen(true);

    try {
      const report = await fetchRoleplayDebrief({
        scenarioTitle: activeScenario.title,
        userRole: activeScenario.userRole,
        aiRole: activeScenario.aiRole,
        track: activeScenario.track,
        level: activeScenario.level,
        assistanceMode,
        dialogueHistory: historyToDebrief,
        conversationObjectives: objectiveChecklist.map((o) => o.objective),
      });

      setAssessmentReport(report);
      audioFeedbackSound();
      confetti({ particleCount: 50, spread: 80, origin: { y: 0.6 } });

      // Save into AppContext
      const sessionRecord: RoleplaySessionRecord = {
        id: `rp-sess-${Date.now()}`,
        scenarioId: activeScenario.id,
        scenarioTitle: activeScenario.title,
        track: activeScenario.track,
        date: 'Today, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        assistanceMode,
        durationMinutes: Math.max(3, Math.round(turnCount * 1.2)),
        turnsCount: turnCount,
        assessment: report,
      };
      saveRoleplaySession(sessionRecord);
    } catch (err) {
      console.error('Error generating debrief:', err);
      // Fallback report
      const fallbackReport: RoleplayAssessmentReport = {
        overallScore: 86,
        cefrEquivalent: activeScenario.level,
        taskCompletionScore: 88,
        communicationEffectiveness: 85,
        fluencyScore: 84,
        vocabularyScore: 87,
        grammarScore: 85,
        appropriatenessScore: 90,
        completedObjectives: objectiveChecklist.slice(0, 2).map((o) => o.objective),
        missedObjectives: objectiveChecklist.slice(2).map((o) => o.objective),
        keyStrengths: [
          'Effective conversational composure and tone',
          'Good adherence to context-specific vocabulary',
        ],
        criticalAreasForImprovement: [
          'Expand on conditional sentences when negotiating compromises',
        ],
        grammarAndVocabularyHighlights: [
          {
            original: 'We need that you send it quickly',
            correction: 'We would appreciate it if you could send it promptly',
            explanation: 'Diplomatic phrasing using conditional modal structures',
            vietnameseNote: 'Sử dụng cấu trúc ngoại giao "would appreciate it if..." để tăng tính chuyên nghiệp.',
          },
        ],
        modelDialogueExcerpt:
          'I see your perspective completely. Why don’t we pilot this approach for two weeks and measure initial engagement before committing fully?',
        actionableNextStep: 'Try repeating this scenario in Challenge Mode to sharpen spontaneity.',
      };
      setAssessmentReport(fallbackReport);
      confetti({ particleCount: 35, spread: 60 });
    } finally {
      setIsDebriefing(false);
    }
  };

  // Send a turn in the roleplay
  const handleSendRoleplay = async (msgToSend?: string) => {
    const text = (msgToSend ?? userInput).trim();
    if (!text || isLoading) return;

    if (isRecording) {
      stopRecordingAndSend();
    }

    const nextTurn = turnCount + 1;
    const newHistory = [...dialogueHistory, { role: 'user', content: text }];
    setDialogueHistory(newHistory);
    setUserInput('');
    setIsLoading(true);

    try {
      const response: RoleplayResponseData = await sendRoleplayMessage({
        scenarioId: activeScenario.id,
        scenarioTitle: activeScenario.title,
        userRole: activeScenario.userRole,
        aiRole: activeScenario.aiRole,
        scenarioGoal: activeScenario.objective,
        userMessage: text,
        dialogueHistory: newHistory,
        track: activeScenario.track,
        assistanceMode,
        turnCount: nextTurn,
        conversationObjectives: objectiveChecklist.map((o) => o.objective),
        unexpectedTwist: activeScenario.unexpectedTwist,
      });

      const updatedHistory = [...newHistory, { role: 'model', content: response.aiDialogue }];
      setDialogueHistory(updatedHistory);
      setTurnCount(nextTurn);
      setGoalProgress(response.goalProgressPercent || Math.min(100, nextTurn * 20));
      setLatestCoachingTip(response.coachingTip);
      setSuggestedPhrases(response.recommendedResponses || []);

      // Check for twist trigger around turn 3
      if (nextTurn === 3 && activeScenario.unexpectedTwist && !twistTriggered) {
        setTwistTriggered(true);
        setShowTwistBanner(true);
      }

      // Update objective checklist if returned by server
      if (response.objectiveStatuses && response.objectiveStatuses.length > 0) {
        setObjectiveChecklist((prev) =>
          prev.map((item) => {
            const found = response.objectiveStatuses?.find(
              (s) => s.objective.toLowerCase() === item.objective.toLowerCase()
            );
            return found ? { ...item, completed: found.completed } : item;
          })
        );
      } else {
        // Incrementally tick off goals by turns if not explicitly mapped
        if (nextTurn >= 2) {
          setObjectiveChecklist((prev) =>
            prev.map((item, idx) => (idx < Math.min(prev.length, nextTurn - 1) ? { ...item, completed: true } : item))
          );
        }
      }

      // Spoken AI response
      audioEngine.speak(response.aiDialogue, { rate: 1.0 });

      // Conclude if completed or reaching 6 turns
      if (response.scenarioCompleted || nextTurn >= 6) {
        handleGenerateDebrief(updatedHistory);
      }
    } catch (e: any) {
      console.error('Roleplay turn error:', e);
      // Realistic fallback response
      const fallbackAiMsg =
        activeScenario.track === 'high_school'
          ? "That sounds really interesting! How do you think our classmates will react if we start on this next week?"
          : "That makes a lot of business sense. Could you walk me through the immediate milestones and resource commitments?";
      setDialogueHistory((prev) => [...prev, { role: 'model', content: fallbackAiMsg }]);
      setTurnCount(nextTurn);
      setGoalProgress(Math.min(100, nextTurn * 20));
      audioEngine.speak(fallbackAiMsg, { rate: 1.0 });
    } finally {
      setIsLoading(false);
    }
  };

  // Custom Scenario Generation
  const handleGenerateScenario = async () => {
    if (!genTopic.trim()) {
      setGeneratorError('Please enter a scenario topic or conflict.');
      return;
    }
    setGeneratorError(null);
    setIsGeneratingScenario(true);

    try {
      const generated = await generateRoleplayScenario({
        professionOrGrade: genRoleOrGrade || (genTrack === 'high_school' ? 'Grade 11 Student' : 'Project Manager'),
        topic: genTopic,
        difficulty: genDifficulty,
        durationMinutes: genDuration,
        learningObjectives: genObjectives,
        track: genTrack,
      });

      addCustomRoleplayScenario(generated);
      audioFeedbackSound();
      confetti({ particleCount: 30, spread: 60 });
      setIsGeneratorModalOpen(false);

      // Start right away
      handleSelectScenario(generated);
    } catch (err: any) {
      console.error('Failed to generate scenario:', err);
      // Fallback custom scenario
      const fallbackScenario: RoleplayScenario = {
        id: `custom-scen-${Date.now()}`,
        title: genTopic,
        track: genTrack,
        level: genDifficulty,
        category: 'Custom AI Simulation',
        description: `Realistic scenario tailored to ${genRoleOrGrade || 'your role'}: ${genTopic}`,
        userRole: genRoleOrGrade || (genTrack === 'high_school' ? 'High School Student' : 'Professional'),
        aiRole: genTrack === 'high_school' ? 'School Mentor / Club Officer' : 'Key Stakeholder / Manager',
        aiAvatar: genTrack === 'high_school' ? '🎓' : '💼',
        objective: `Successfully resolve: ${genTopic} with clarity and professional fluency.`,
        situation: `You are in a live discussion regarding ${genTopic}. Present your perspective convincingly.`,
        learningObjectives: [
          'Use clear signposting and rationale.',
          'Respond to unexpected counter-arguments diplomatically.',
          'Maintain a calm, persuasive cadence.',
        ],
        conversationObjectives: [
          'State your core premise with supporting facts',
          'Acknowledge the other party’s constraints',
          'Agree on a measurable next step',
        ],
        evaluationCriteria: ['Persuasiveness', 'Fluency', 'Active listening', 'Appropriateness'],
        unexpectedTwist: 'The counterpart reveals an urgent constraint requiring compromise.',
        durationMinutes: genDuration,
        vocabularyPrep: ['perspective', 'milestone', 'compromise', 'feasible', 'objective'],
        openingAiMessage: `Hello! Thanks for meeting with me today regarding ${genTopic}. What is your current assessment of where we stand?`,
        suggestedPhrases: [
          'Thank you for your time. Looking at the current numbers, I suggest we take a two-phase approach.',
          'I understand your concern about timing, but this adjustment ensures much higher quality.',
        ],
        isCustomGenerated: true,
      };
      addCustomRoleplayScenario(fallbackScenario);
      setIsGeneratorModalOpen(false);
      handleSelectScenario(fallbackScenario);
    } finally {
      setIsGeneratingScenario(false);
    }
  };

  // Filtered Scenarios for Library
  const filteredScenarios = allRoleplayScenarios.filter((s) => {
    if (trackFilter === 'high_school' && s.track !== 'high_school') return false;
    if (trackFilter === 'professional' && s.track !== 'professional') return false;
    if (trackFilter === 'custom' && !s.isCustomGenerated) return false;
    if (levelFilter !== 'all' && s.level !== levelFilter) return false;
    if (selectedCategory !== 'all' && s.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        s.title.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        s.userRole.toLowerCase().includes(q) ||
        s.aiRole.toLowerCase().includes(q) ||
        (s.description && s.description.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  // Extract unique categories for quick pills
  const availableCategories = Array.from(
    new Set(allRoleplayScenarios.map((s) => s.category))
  );

  return (
    <div className="space-y-6 pb-20">
      {/* Top Banner & Tab Navigation */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-emerald-200/60">
                PHASE 5 · REAL-LIFE ROLEPLAY ENGINE
              </span>
              <span className="text-[11px] font-semibold text-slate-500">
                High School & Professional Tracks
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Interactive Scenario Simulations
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Step into high-stakes English situations: school leadership debates, international exchanges,
              job interviews, and client negotiations with adaptive AI characters and real-time feedback.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsGeneratorModalOpen(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>AI Scenario Generator</span>
            </button>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-2 mt-6 pt-5 border-t border-slate-100 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setSubTab('studio')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
              subTab === 'studio'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Play className="w-3.5 h-3.5 text-emerald-400" />
            <span>Simulation Studio</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/20">
              {activeScenario.title.slice(0, 18)}...
            </span>
          </button>

          <button
            onClick={() => setSubTab('library')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
              subTab === 'library'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-teal-400" />
            <span>Scenario Library ({allRoleplayScenarios.length})</span>
          </button>

          <button
            onClick={() => setSubTab('history')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
              subTab === 'history'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <History className="w-3.5 h-3.5 text-amber-400" />
            <span>Past Debriefs ({user.roleplayProgress?.history?.length || 0})</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: SIMULATION STUDIO */}
      {/* ========================================================================= */}
      {subTab === 'studio' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Mission Control & Live Objectives (4 cols) */}
          <div className="lg:col-span-4 space-y-5">
            {/* Active Scenario Card */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                  {activeScenario.track === 'high_school' ? 'High School Track' : 'Professional Track'}
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-bold">
                  CEFR {activeScenario.level}
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900 leading-snug">
                  {activeScenario.title}
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {activeScenario.description || activeScenario.situation}
                </p>
              </div>

              {/* Roles Breakdown */}
              <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-xs">
                    YOU
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] text-slate-400 block font-semibold uppercase">
                      YOUR ROLE:
                    </span>
                    <span className="font-bold text-slate-800 text-xs truncate block">
                      {activeScenario.userRole}
                    </span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-800 font-bold flex items-center justify-center shrink-0 text-base">
                    {activeScenario.aiAvatar || '🤖'}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] text-slate-400 block font-semibold uppercase">
                      AI COUNTERPART:
                    </span>
                    <span className="font-bold text-slate-800 text-xs truncate block">
                      {activeScenario.aiRole}
                    </span>
                  </div>
                </div>
              </div>

              {/* Assistance Mode Selector */}
              <div className="pt-3 border-t border-slate-100 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Assistance Mode:
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {assistanceMode === 'beginner' && 'High Support'}
                    {assistanceMode === 'normal' && 'Standard'}
                    {assistanceMode === 'challenge' && 'Unassisted'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl">
                  <button
                    onClick={() => setAssistanceMode('beginner')}
                    className={`py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      assistanceMode === 'beginner'
                        ? 'bg-white text-emerald-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Beginner
                  </button>
                  <button
                    onClick={() => setAssistanceMode('normal')}
                    className={`py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      assistanceMode === 'normal'
                        ? 'bg-white text-teal-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Normal
                  </button>
                  <button
                    onClick={() => setAssistanceMode('challenge')}
                    className={`py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      assistanceMode === 'challenge'
                        ? 'bg-white text-rose-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Challenge
                  </button>
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                <button
                  onClick={() => setSubTab('library')}
                  className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                >
                  Change Scenario
                </button>
                <button
                  onClick={() => handleSelectScenario(activeScenario)}
                  className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500"
                  title="Restart current simulation"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Live Conversation Objectives Checklist */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Live Objectives Checklist
                </h4>
                <span className="text-[11px] font-bold text-emerald-700">
                  {objectiveChecklist.filter((o) => o.completed).length} / {objectiveChecklist.length}
                </span>
              </div>

              <div className="space-y-2">
                {objectiveChecklist.map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-xl border text-xs flex items-start gap-2.5 transition-all ${
                      item.completed
                        ? 'bg-emerald-50/80 border-emerald-300 text-emerald-900'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <div className="pt-0.5 shrink-0">
                      {item.completed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Circle className="w-4 h-4 text-slate-300" />
                      )}
                    </div>
                    <span className={`leading-relaxed ${item.completed ? 'font-medium' : ''}`}>
                      {item.objective}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Target Vocabulary Prep */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-2.5">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-teal-600" />
                Target Vocabulary Bank:
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {activeScenario.vocabularyPrep.map((vocab, vIdx) => (
                  <span
                    key={vIdx}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 text-xs font-medium border border-slate-200 transition-colors"
                  >
                    {vocab}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Simulation Stage (8 cols) */}
          <div className="lg:col-span-8 space-y-5">
            {/* Top Stage Header: Progress & Debrief Button */}
            <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-sm">
                  {turnCount}/6
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    CONVERSATION MILESTONE
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="w-32 h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${goalProgress}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-800 tabular-nums">
                      {goalProgress}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleGenerateDebrief()}
                  disabled={isLoading || isDebriefing}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <Award className="w-4 h-4" />
                  <span>{isDebriefing ? 'Analyzing...' : 'Finish & Get Debrief'}</span>
                </button>
              </div>
            </div>

            {/* Unexpected Twist Banner Alert */}
            {showTwistBanner && (
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-4 text-white shadow-md flex items-start justify-between gap-3 animate-bounce-once">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-white/20 shrink-0">
                    <AlertTriangle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-100 block">
                      ⚠️ REAL-WORLD ADAPTABILITY TEST: UNEXPECTED TWIST!
                    </span>
                    <p className="text-sm font-semibold mt-0.5 leading-snug">
                      "{activeScenario.unexpectedTwist}"
                    </p>
                    <span className="text-xs text-amber-100 mt-1 block">
                      Adapt your response smoothly without losing your calm or core goal.
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setShowTwistBanner(false)}
                  className="text-white/80 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Dialogue Stream Container */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden flex flex-col h-[500px]">
              {/* Message scroll area */}
              <div className="flex-1 p-5 overflow-y-auto space-y-4">
                {dialogueHistory.map((msg, idx) => {
                  const isUser = msg.role === 'user';

                  return (
                    <div
                      key={idx}
                      className={`flex flex-col max-w-xl ${
                        isUser ? 'ml-auto items-end' : 'mr-auto items-start'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 px-1">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">
                          {isUser ? activeScenario.userRole : activeScenario.aiRole}
                        </span>
                        {!isUser && (
                          <span className="text-xs">{activeScenario.aiAvatar || '🤖'}</span>
                        )}
                      </div>

                      <div
                        className={`p-4 rounded-2xl text-sm leading-relaxed ${
                          isUser
                            ? 'bg-slate-900 text-white rounded-tr-xs shadow-xs'
                            : 'bg-slate-100 text-slate-900 rounded-tl-xs border border-slate-200/80 shadow-xs'
                        }`}
                      >
                        <p>{msg.content}</p>

                        {!isUser && (
                          <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center gap-3">
                            <button
                              onClick={() => audioEngine.speak(msg.content, { rate: 1.0 })}
                              className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 transition-colors"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                              <span>Listen (Normal)</span>
                            </button>
                            <button
                              onClick={() => audioEngine.speak(msg.content, { rate: 0.8 })}
                              className="text-[11px] font-semibold text-slate-500 hover:text-slate-700 flex items-center gap-1 transition-colors"
                            >
                              <span>Slow</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {isLoading && (
                  <div className="p-3.5 rounded-2xl bg-slate-100 text-xs text-slate-600 mr-auto flex items-center gap-2.5 border border-slate-200">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                    <span className="font-medium">
                      {activeScenario.aiRole} is evaluating and replying...
                    </span>
                  </div>
                )}

                <div ref={dialogueEndRef} />
              </div>

              {/* Real-Time Coach Tip Strip */}
              {latestCoachingTip && (
                <div className="px-5 py-2.5 bg-amber-50/80 border-t border-amber-200/70 text-xs text-amber-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="leading-snug">
                    <strong className="font-bold">Coach Note:</strong> {latestCoachingTip}
                  </span>
                </div>
              )}

              {/* Beginner / Normal Assistance Starter Suggestions */}
              {assistanceMode !== 'challenge' && suggestedPhrases.length > 0 && !isLoading && (
                <div className="px-5 py-2 bg-slate-50 border-t border-slate-200 flex items-center gap-2 overflow-x-auto scrollbar-none text-xs">
                  <span className="text-[11px] text-slate-500 font-bold shrink-0">
                    {assistanceMode === 'beginner' ? 'Sentence Starters:' : 'Suggestions:'}
                  </span>
                  {suggestedPhrases.map((phrase, pIdx) => (
                    <button
                      key={pIdx}
                      onClick={() => handleSendRoleplay(phrase)}
                      className="px-3 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-900 text-xs font-medium whitespace-nowrap shrink-0 transition-colors shadow-2xs"
                    >
                      "{phrase}"
                    </button>
                  ))}
                </div>
              )}

              {/* Input Control Bar */}
              <div className="p-4 bg-white border-t border-slate-200 space-y-2">
                <div className="flex items-center gap-2">
                  {/* Microphone Toggle Button */}
                  <button
                    onClick={isRecording ? stopRecordingAndSend : startRecording}
                    disabled={isLoading}
                    className={`p-3.5 rounded-2xl transition-all shadow-sm shrink-0 flex items-center justify-center ${
                      isRecording
                        ? 'bg-rose-500 text-white ring-4 ring-rose-500/20 animate-pulse'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                    title={isRecording ? 'Click to stop recording' : 'Speak via microphone'}
                  >
                    {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>

                  {/* Input field */}
                  <input
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendRoleplay()}
                    placeholder={
                      isRecording
                        ? 'Listening to your speech... speak clearly'
                        : 'Speak with microphone or type your response in character...'
                    }
                    className="flex-1 p-3.5 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs transition-all"
                  />

                  {/* Send Button */}
                  <button
                    onClick={() => handleSendRoleplay()}
                    disabled={!userInput.trim() || isLoading}
                    className="p-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white transition-colors shrink-0 shadow-sm"
                    title="Send dialogue"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>

                {isRecording && (
                  <div className="flex items-center justify-between text-xs text-rose-600 px-1 font-semibold">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                      Live Speech Recognition Active...
                    </span>
                    <button
                      onClick={stopRecordingAndSend}
                      className="underline text-slate-600 hover:text-slate-900"
                    >
                      Done speaking
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: SCENARIO LIBRARY & SEARCH */}
      {/* ========================================================================= */}
      {subTab === 'library' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search scenarios by title, role, or keyword..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Track filter pills */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto">
                <button
                  onClick={() => setTrackFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    trackFilter === 'all'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All Scenarios
                </button>
                <button
                  onClick={() => setTrackFilter('high_school')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    trackFilter === 'high_school'
                      ? 'bg-white text-emerald-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  High School (9)
                </button>
                <button
                  onClick={() => setTrackFilter('professional')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    trackFilter === 'professional'
                      ? 'bg-white text-teal-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Professional (9)
                </button>
                <button
                  onClick={() => setTrackFilter('custom')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    trackFilter === 'custom'
                      ? 'bg-white text-indigo-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  AI Generated
                </button>
              </div>
            </div>

            {/* CEFR Level filter pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-2 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
                CEFR:
              </span>
              {(['all', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setLevelFilter(lvl)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    levelFilter === lvl
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {lvl.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Scenarios Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredScenarios.map((scen) => {
              const isCurrent = scen.id === activeScenario.id;

              return (
                <div
                  key={scen.id}
                  className={`bg-white rounded-3xl border transition-all flex flex-col p-5 space-y-4 hover:shadow-md ${
                    isCurrent
                      ? 'border-emerald-400 ring-2 ring-emerald-300/40 bg-emerald-50/20'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                      {scen.category}
                    </span>
                    <span className="text-xs font-extrabold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                      {scen.level}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900 leading-snug line-clamp-1">
                      {scen.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {scen.description || scen.situation}
                    </p>
                  </div>

                  {/* Roles Preview */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-semibold text-[10px]">YOU:</span>
                      <span className="font-bold text-slate-800 truncate max-w-[170px]">
                        {scen.userRole}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-semibold text-[10px]">AI PARTNER:</span>
                      <span className="font-bold text-slate-800 truncate max-w-[170px] flex items-center gap-1">
                        <span>{scen.aiAvatar || '🤖'}</span>
                        <span>{scen.aiRole}</span>
                      </span>
                    </div>
                  </div>

                  {/* Footer CTA */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between mt-auto">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      ~{scen.durationMinutes || 5} mins
                    </span>

                    <button
                      onClick={() => handleSelectScenario(scen)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                        isCurrent
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-900 hover:bg-slate-800 text-white'
                      }`}
                    >
                      <span>{isCurrent ? 'Continue' : 'Launch Simulation'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredScenarios.length === 0 && (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
              <HelpCircle className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">No scenarios matched your filters</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Try loosening your search term or CEFR level, or generate a tailored custom scenario with AI.
              </p>
              <button
                onClick={() => setIsGeneratorModalOpen(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl"
              >
                Create Custom Scenario
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 3: PAST DEBRIEFS & HISTORY */}
      {/* ========================================================================= */}
      {subTab === 'history' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Simulation History & Progress</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Review your roleplay scores, communicative strengths, and Vietnamese grammar debriefs.
              </p>
            </div>

            <div className="flex items-center gap-4 text-center">
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200/80">
                <span className="text-[10px] text-emerald-800 font-bold block uppercase">
                  Average Score
                </span>
                <span className="text-xl font-black text-emerald-950">
                  {(user.roleplayProgress?.history?.length || 0) > 0 ? `${user.roleplayProgress?.averageScore || 0}%` : '—'}
                </span>
              </div>
              <div className="p-3 bg-teal-50 rounded-2xl border border-teal-200/80">
                <span className="text-[10px] text-teal-800 font-bold block uppercase">
                  Simulations Done
                </span>
                <span className="text-xl font-black text-teal-950">
                  {user.roleplayProgress?.completedScenariosCount || 0}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {(user.roleplayProgress?.history || []).map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4 hover:border-slate-300 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {item.date} · {item.assistanceMode.toUpperCase()} MODE
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-0.5">
                      {item.scenarioTitle}
                    </h3>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-extrabold text-sm">
                      {item.assessment.overallScore}% · {item.assessment.cefrEquivalent}
                    </span>
                  </div>
                </div>

                {/* Score breakdown bars */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-2 border-t border-slate-100">
                  <div className="p-2 rounded-xl bg-slate-50 text-center">
                    <span className="text-[10px] text-slate-400 font-semibold block">Task Done</span>
                    <span className="text-xs font-bold text-slate-800">
                      {item.assessment.taskCompletionScore}%
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 text-center">
                    <span className="text-[10px] text-slate-400 font-semibold block">Effectiveness</span>
                    <span className="text-xs font-bold text-slate-800">
                      {item.assessment.communicationEffectiveness}%
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 text-center">
                    <span className="text-[10px] text-slate-400 font-semibold block">Fluency</span>
                    <span className="text-xs font-bold text-slate-800">
                      {item.assessment.fluencyScore}%
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 text-center">
                    <span className="text-[10px] text-slate-400 font-semibold block">Vocabulary</span>
                    <span className="text-xs font-bold text-slate-800">
                      {item.assessment.vocabularyScore}%
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 text-center">
                    <span className="text-[10px] text-slate-400 font-semibold block">Grammar</span>
                    <span className="text-xs font-bold text-slate-800">
                      {item.assessment.grammarScore}%
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 text-center">
                    <span className="text-[10px] text-slate-400 font-semibold block">Appropriate</span>
                    <span className="text-xs font-bold text-slate-800">
                      {item.assessment.appropriatenessScore}%
                    </span>
                  </div>
                </div>

                {/* Feedback Excerpt */}
                <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200/70 text-xs text-slate-700 space-y-1">
                  <p>
                    <strong className="text-emerald-900">Key Strengths:</strong>{' '}
                    {item.assessment.keyStrengths.join('; ')}
                  </p>
                  <p>
                    <strong className="text-amber-900">Area for Growth:</strong>{' '}
                    {item.assessment.criticalAreasForImprovement.join('; ')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PERFORMANCE ASSESSMENT DEBRIEF MODAL */}
      {/* ========================================================================= */}
      {isDebriefModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-2xl w-full p-6 shadow-2xl space-y-6 my-8 animate-fade-in max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  ROLEPLAY PERFORMANCE ASSESSMENT
                </span>
                <h2 className="text-xl font-black text-slate-900 mt-1">
                  {activeScenario.title}
                </h2>
                <span className="text-xs text-slate-500">
                  Role: {activeScenario.userRole} · Mode: {assistanceMode.toUpperCase()}
                </span>
              </div>
              <button
                onClick={() => setIsDebriefModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isDebriefing && !assessmentReport ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <h3 className="text-sm font-bold text-slate-800">
                  Gemini Coach is evaluating your dialogue...
                </h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Analyzing task completion, communicative diplomacy, grammatical accuracy, and Vietnamese learner notes.
                </p>
              </div>
            ) : assessmentReport ? (
              <div className="space-y-6 text-slate-800">
                {/* Overall Score Banner */}
                <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-emerald-100 block">
                      OVERALL PERFORMANCE
                    </span>
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span className="text-4xl font-black tabular-nums">
                        {assessmentReport.overallScore}%
                      </span>
                      <span className="text-sm font-bold text-emerald-200">
                        CEFR {assessmentReport.cefrEquivalent}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-emerald-100 block">XP Awarded</span>
                    <span className="text-2xl font-black text-emerald-300">+80 XP</span>
                  </div>
                </div>

                {/* 6 Dimension Progress Bars */}
                <div className="space-y-2.5 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Evaluation Rubrics:
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="flex justify-between font-semibold mb-1">
                        <span>Task Completion</span>
                        <span>{assessmentReport.taskCompletionScore}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${assessmentReport.taskCompletionScore}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between font-semibold mb-1">
                        <span>Effectiveness</span>
                        <span>{assessmentReport.communicationEffectiveness}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className="h-full bg-teal-500 rounded-full"
                          style={{ width: `${assessmentReport.communicationEffectiveness}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between font-semibold mb-1">
                        <span>Fluency & Rhythm</span>
                        <span>{assessmentReport.fluencyScore}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${assessmentReport.fluencyScore}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between font-semibold mb-1">
                        <span>Lexical Resource</span>
                        <span>{assessmentReport.vocabularyScore}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full"
                          style={{ width: `${assessmentReport.vocabularyScore}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between font-semibold mb-1">
                        <span>Grammar Accuracy</span>
                        <span>{assessmentReport.grammarScore}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full"
                          style={{ width: `${assessmentReport.grammarScore}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between font-semibold mb-1">
                        <span>Appropriateness</span>
                        <span>{assessmentReport.appropriatenessScore}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className="h-full bg-purple-500 rounded-full"
                          style={{ width: `${assessmentReport.appropriatenessScore}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Objectives Completion Breakdown */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Objectives Achieved:
                  </h4>
                  <div className="space-y-1.5">
                    {assessmentReport.completedObjectives.map((obj, oIdx) => (
                      <div
                        key={oIdx}
                        className="p-2.5 rounded-xl bg-emerald-50 text-emerald-900 text-xs flex items-center gap-2 border border-emerald-200"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{obj}</span>
                      </div>
                    ))}
                    {assessmentReport.missedObjectives.map((obj, mIdx) => (
                      <div
                        key={mIdx}
                        className="p-2.5 rounded-xl bg-rose-50 text-rose-900 text-xs flex items-center gap-2 border border-rose-200"
                      >
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>{obj} (Missed or Incomplete)</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Grammar & Vocabulary Highlights with Vietnamese Notes */}
                {assessmentReport.grammarAndVocabularyHighlights &&
                  assessmentReport.grammarAndVocabularyHighlights.length > 0 && (
                    <div className="space-y-2.5">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Target Corrections & Vietnamese Explanations:
                      </h4>
                      <div className="space-y-2">
                        {assessmentReport.grammarAndVocabularyHighlights.map((hl, hIdx) => (
                          <div
                            key={hIdx}
                            className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5"
                          >
                            <div className="flex items-center gap-2 text-rose-700">
                              <span className="font-semibold text-[10px] uppercase">You Said:</span>
                              <span className="line-through">{hl.original}</span>
                            </div>
                            <div className="flex items-center gap-2 text-emerald-800 font-bold">
                              <span className="font-semibold text-[10px] uppercase text-emerald-600">
                                Better:
                              </span>
                              <span>{hl.correction}</span>
                            </div>
                            <p className="text-slate-600 text-[11px] pt-1 border-t border-slate-200/60">
                              {hl.explanation}
                            </p>
                            <p className="text-amber-800 text-[11px] font-medium bg-amber-50 p-2 rounded-lg border border-amber-200/60">
                              🇻🇳 <strong>Lưu ý:</strong> {hl.vietnameseNote}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Model Native Dialogue Excerpt */}
                <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200 text-xs space-y-1">
                  <h4 className="font-bold text-teal-950 uppercase tracking-wider text-[11px]">
                    Native Model Rephrasing:
                  </h4>
                  <p className="italic text-teal-900 leading-relaxed">
                    "{assessmentReport.modelDialogueExcerpt}"
                  </p>
                </div>

                {/* Actionable Next Step */}
                <div className="text-xs text-slate-600 bg-slate-100 p-3.5 rounded-xl">
                  <strong>Recommended Next Step:</strong> {assessmentReport.actionableNextStep}
                </div>

                {/* Modal Footer Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setIsDebriefModalOpen(false);
                      handleSelectScenario(activeScenario);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                  >
                    Practice Scenario Again
                  </button>
                  <button
                    onClick={() => {
                      setIsDebriefModalOpen(false);
                      setSubTab('library');
                    }}
                    className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
                  >
                    Explore Other Scenarios
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* AI SCENARIO GENERATOR MODAL */}
      {/* ========================================================================= */}
      {isGeneratorModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-5 my-8 animate-fade-in">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  AI SCENARIO GENERATOR
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1">
                  Create Custom Simulation
                </h3>
              </div>
              <button
                onClick={() => setIsGeneratorModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Track Switch */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Target Track:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setGenTrack('high_school')}
                    className={`py-2 rounded-xl font-bold border transition-all ${
                      genTrack === 'high_school'
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-900 ring-1 ring-emerald-300'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    High School
                  </button>
                  <button
                    type="button"
                    onClick={() => setGenTrack('professional')}
                    className={`py-2 rounded-xl font-bold border transition-all ${
                      genTrack === 'professional'
                        ? 'bg-teal-50 border-teal-400 text-teal-900 ring-1 ring-teal-300'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    Professional
                  </button>
                </div>
              </div>

              {/* Profession or Grade */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {genTrack === 'high_school' ? 'Your High School Grade / Context:' : 'Your Profession / Industry:'}
                </label>
                <input
                  type="text"
                  value={genRoleOrGrade}
                  onChange={(e) => setGenRoleOrGrade(e.target.value)}
                  placeholder={
                    genTrack === 'high_school'
                      ? 'e.g. Grade 11 Student applying for Student Council President'
                      : 'e.g. Senior Software Engineer pitching a cloud migration'
                  }
                  className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Scenario Topic */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Scenario Conflict / Topic: <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={genTopic}
                  onChange={(e) => setGenTopic(e.target.value)}
                  placeholder={
                    genTrack === 'high_school'
                      ? 'e.g. Explaining to a teacher why an assignment was late'
                      : 'e.g. Negotiating a 15% salary increase with VP'
                  }
                  className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Difficulty & Duration */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">CEFR Level:</label>
                  <select
                    value={genDifficulty}
                    onChange={(e) => setGenDifficulty(e.target.value as CEFRLevel)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs"
                  >
                    <option value="A1">A1 - Elementary</option>
                    <option value="A2">A2 - Pre-Intermediate</option>
                    <option value="B1">B1 - Intermediate</option>
                    <option value="B2">B2 - Upper-Intermediate</option>
                    <option value="C1">C1 - Advanced</option>
                    <option value="C2">C2 - Mastery</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Target Duration:</label>
                  <select
                    value={genDuration}
                    onChange={(e) => setGenDuration(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs"
                  >
                    <option value={3}>3 Minutes (Quick)</option>
                    <option value={5}>5 Minutes (Standard)</option>
                    <option value={8}>8 Minutes (Deep)</option>
                  </select>
                </div>
              </div>

              {/* Learning Objectives */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Learning Objectives / Focus (Optional):
                </label>
                <textarea
                  value={genObjectives}
                  onChange={(e) => setGenObjectives(e.target.value)}
                  rows={2}
                  placeholder="e.g. Practice diplomatic pushback and conditional phrases"
                  className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {generatorError && (
                <div className="p-2.5 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200 font-semibold">
                  {generatorError}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsGeneratorModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGenerateScenario}
                disabled={isGeneratingScenario}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                {isGeneratingScenario ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Generating Scenario...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate & Launch</span>
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
