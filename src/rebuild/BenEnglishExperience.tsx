import React, { useEffect, useRef, useState } from 'react';
import { sendConversationMessage, evaluateWriting, WritingAssessmentData } from '../services/api';
import { GRADE_CEFR_CURRICULUM } from '../data/gradeCefrCurriculum';
import DeepPracticeHub from './DeepPracticeHub';
import PronunciationCoach from './PronunciationCoach';
import {
  ArrowRight, AudioLines, BookOpen, BriefcaseBusiness, Check, ChevronRight,
  Clock3, Flame, GraduationCap, Headphones, MessageCircle,
  Mic2, Sparkles, Target, TrendingUp, Trophy, Volume2, VolumeX
} from 'lucide-react';

type Track = 'high_school' | 'professional';
type Learner = { track: Track; name: string; grade: string; role: string; level: string; goal: string; minutes: number; onboarded: boolean };
type Section = 'today' | 'tutor' | 'learn' | 'progress';

const defaults: Learner = { track: 'high_school', name: '', grade: 'Grade 12', role: 'Student', level: 'A2', goal: 'Speak confidently', minutes: 15, onboarded: false };

const trackCopy = {
  high_school: {
    name: 'High School English', sub: 'For Vietnamese students · Grades 10–12', tint: 'sky',
    greeting: 'Build confidence. Get exam-ready.',
    focus: 'School English, real-life communication and graduation exams.',
    subjects: ['Grade 10–12 vocabulary', 'Grammar & sentence patterns', 'Reading comprehension', 'Listening & speaking', 'THPT exam practice'],
    today: 'Talking about future plans', goal: 'Describe your study plans and ambitions',
    coach: 'Emma', coachRole: 'Your patient English teacher',
    color: 'bg-sky-600', soft: 'bg-sky-50', ink: 'text-sky-700', border: 'border-sky-100',
    gradient: 'from-sky-600 via-blue-600 to-indigo-700'
  },
  professional: {
    name: 'Professional English', sub: 'For ambitious people at work', tint: 'violet',
    greeting: 'Speak clearly. Move your career forward.',
    focus: 'Meetings, presentations, interviews and global teamwork.',
    subjects: ['Meetings & collaboration', 'Presentations & pitching', 'Business writing & email', 'Interviews & negotiation', 'Industry vocabulary'],
    today: 'Giving a concise project update', goal: 'Explain progress, blockers and next steps',
    coach: 'Alex', coachRole: 'Your practical communication coach',
    color: 'bg-violet-600', soft: 'bg-violet-50', ink: 'text-violet-700', border: 'border-violet-100',
    gradient: 'from-violet-700 via-indigo-700 to-slate-900'
  }
};

const tasks = [
  { icon: Mic2, label: 'Speak with your AI tutor', detail: 'A short, natural conversation', time: '5 min', section: 'tutor' as Section },
  { icon: Headphones, label: 'Listen to real English', detail: 'Authentic voices and accents', time: '5 min', section: 'learn' as Section },
  { icon: BookOpen, label: 'Learn and remember', detail: 'Useful phrases in context', time: '5 min', section: 'learn' as Section }
];

function Pill({ children, active = false }: { children: React.ReactNode; active?: boolean }) {
  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${active ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>{children}</span>;
}

export default function BenEnglishExperience() {
  const [learner, setLearner] = useState<Learner>(() => {
    try { const saved = localStorage.getItem('benenglish-v2-profile'); return saved ? { ...defaults, ...JSON.parse(saved) } : defaults; } catch { return defaults; }
  });
  const [section, setSection] = useState<Section>('today');
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<{ role: 'coach' | 'learner'; text: string; correction?: { original: string; improved: string; explanation: string; vietnameseTip: string } }[]>([]);
  const [isTutorLoading, setIsTutorLoading] = useState(false);
  const [tutorError, setTutorError] = useState('');
  const [autoSpeakReplies, setAutoSpeakReplies] = useState(true);
  const [isSpeakingCoach, setIsSpeakingCoach] = useState(false);
  const [speechRate, setSpeechRate] = useState(0.95);
  const [englishVoices, setEnglishVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState('');
  const [speechNotice, setSpeechNotice] = useState('');
  const [isListeningLearner, setIsListeningLearner] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [voiceInputNotice, setVoiceInputNotice] = useState('');
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef('');
  const submitVoiceOnEndRef = useRef(false);
  const [failedTutorMessage, setFailedTutorMessage] = useState('');
  const [curriculumLevel, setCurriculumLevel] = useState('');
  const [writingFeedback, setWritingFeedback] = useState<WritingAssessmentData | null>(null);
  const [isAssessingWriting, setIsAssessingWriting] = useState(false);
  const [writingError, setWritingError] = useState('');
  const [quizChoice, setQuizChoice] = useState<number | null>(null);
  const [quizChecked, setQuizChecked] = useState(false);
  const [quizIndex, setQuizIndex] = useState(0);
  const [readingResponse, setReadingResponse] = useState('');
  const [writingDraft, setWritingDraft] = useState('');
  const [reviewChecks, setReviewChecks] = useState<boolean[]>([false, false, false]);
  const [skillProgress, setSkillProgress] = useState<Record<string, string[]>>(() => { try { return JSON.parse(localStorage.getItem('benenglish-skill-progress-v1') || '{}'); } catch { return {}; } });
  const track = trackCopy[learner.track];
  const isSchool = learner.track === 'high_school';
  const schoolGrade = learner.grade === 'Grade 10' ? 10 : learner.grade === 'Grade 11' ? 11 : 12;
  const curriculumUnits = GRADE_CEFR_CURRICULUM.filter(unit => unit.track === learner.track && (learner.track !== 'high_school' || unit.grade === learner.grade));
  const activeCurriculum = curriculumUnits.find(unit => unit.level === curriculumLevel) || curriculumUnits.find(unit => unit.level === learner.level) || curriculumUnits[0];
  const schoolTier = learner.level === 'A1' || learner.level === 'A2' ? 'foundation' : learner.level === 'B2' || learner.level === 'C1' ? 'stretch' : 'core';
  const schoolQuiz = schoolGrade === 10
    ? (schoolTier === 'foundation'
      ? [{q:'Choose the correct sentence.',options:['She go to school by bus.','She goes to school by bus.','She going to school by bus.'],answer:1,why:'With he / she / it in the present simple, add -s or -es to the verb.'},{q:'Complete: We are interested ___ learning about climate change.',options:['on','at','in'],answer:2,why:'The correct collocation is interested in + noun or V-ing.'}]
      : schoolTier === 'stretch'
      ? [{q:'Choose the sentence with the closest meaning: “Although it was raining, they continued the match.”',options:['It was raining, so they stopped the match.','Despite the rain, they continued the match.','Because of the rain, they continued the match.'],answer:1,why:'Although + clause can be rewritten as despite + noun phrase.'},{q:'Choose the best completion: If students ___ more regularly, they would feel more confident.',options:['practise','practised','will practise'],answer:1,why:'This is a second conditional: If + past simple, would + base verb.'}]
      : [{q:'Choose the correct form: My brother usually ___ his homework after dinner.',options:['do','does','is do'],answer:1,why:'Use does with the third-person singular subject “my brother”.'},{q:'Choose the best word: Public transport can reduce air ___.',options:['pollution','population','permission'],answer:0,why:'Pollution means harmful substances in the environment.'}])
    : schoolGrade === 11
    ? (schoolTier === 'foundation'
      ? [{q:'Complete: I have lived here ___ 2020.',options:['for','since','during'],answer:1,why:'Use since with a starting point in time; use for with a duration.'},{q:'Choose the correct relative pronoun: A teacher is someone ___ helps students learn.',options:['who','where','when'],answer:0,why:'Use who to refer to a person.'}]
      : schoolTier === 'stretch'
      ? [{q:'Choose the best connector: The solution is affordable; ___, it may take longer to implement.',options:['therefore','however','for example'],answer:1,why:'However introduces a contrast between two ideas.'},{q:'Choose the correct form: The new policy is expected ___ next month.',options:['to introduce','to be introduced','introducing'],answer:1,why:'The policy receives the action, so use the passive infinitive.'}]
      : [{q:'Complete: If we use less plastic, we ___ waste.',options:['reduce','reduced','will reduce'],answer:2,why:'First conditional: If + present simple, will + base verb.'},{q:'Choose the correct phrase: She is responsible ___ organising the event.',options:['for','to','with'],answer:0,why:'The fixed phrase is responsible for + noun or V-ing.'}])
    : (schoolTier === 'foundation'
      ? [{q:'Choose the correct sentence.',options:['I have never visited Singapore.','I never have visit Singapore.','I has never visited Singapore.'],answer:0,why:'Present perfect: have/has + past participle.'},{q:'Complete: The more you practise, the ___ you become.',options:['confident','more confident','most confident'],answer:1,why:'Use the comparative pattern: the more…, the more…'}]
      : schoolTier === 'stretch'
      ? [{q:'Choose the best completion: Not only ___ the deadline, but she also improved the final report.',options:['she met','did she meet','she did meet'],answer:1,why:'After “Not only” at the beginning, use subject–auxiliary inversion.'},{q:'Choose the closest meaning: “The campaign was so successful that it was extended.”',options:['The campaign was too successful to extend.','Such was the campaign’s success that it was extended.','The campaign was successful unless it was extended.'],answer:1,why:'Such + be + noun phrase can express a result with that.'}]
      : [{q:'Choose the correct reported speech: “I am preparing for the exam,” he said.',options:['He said he is preparing for the exam.','He said he was preparing for the exam.','He said I was preparing for the exam.'],answer:1,why:'In standard reported speech, present continuous usually shifts to past continuous.'},{q:'Choose the best word: The evidence strongly ___ the need for change.',options:['suggests','avoids','prevents'],answer:0,why:'Suggests means indicates or gives a reason to believe something.'}]);
  const professionalQuiz = ({
    A1:[{q:'Choose the correct workplace introduction.',options:['I work as a designer.','I working designer.','I am work designer.'],answer:0,why:'Use “I work as a…” to describe your job.'},{q:'Complete: Could you ___ that again, please?',options:['repeat','repeats','repeating'],answer:0,why:'After could, use the base form of the verb.'}],
    A2:[{q:'Choose the most polite request.',options:['Send me the file now.','Could you send me the file, please?','You must sending the file.'],answer:1,why:'Could you…? makes a request more polite.'},{q:'Complete: I have worked here ___ three years.',options:['since','for','from'],answer:1,why:'Use for with a period of time.'}],
    B1:[{q:'Choose the best phrase for a progress update.',options:['We finished already maybe.','We have completed the first stage and are testing the next one.','We completing stage one.'],answer:1,why:'A concise update states completed work and the current next step.'},{q:'Choose the correct phrase: I look forward to ___ from you.',options:['hear','hearing','heard'],answer:1,why:'Look forward to is followed by a noun or gerund (-ing).'}],
    B2:[{q:'Choose the most diplomatic way to disagree in a meeting.',options:['That idea is wrong.','I see your point; could we also consider another option?','No, do it my way.'],answer:1,why:'Acknowledge the other view, then introduce an alternative respectfully.'},{q:'Complete: Had we received the data earlier, we ___ the report yesterday.',options:['would finish','would have finished','will have finished'],answer:1,why:'This is a third conditional describing an unreal past result.'}],
    C1:[{q:'Choose the clearest executive summary sentence.',options:['There are many things that we did and some things remain.','We delivered the pilot; the remaining risk is supplier readiness.','The pilot, which was something we did, has things left.'],answer:1,why:'Strong executive communication is concise and foregrounds outcome and risk.'},{q:'Choose the best phrase to qualify a recommendation.',options:['This will definitely solve every issue.','The evidence suggests this option is likely to reduce delays.','There is no possible downside.'],answer:1,why:'Qualified language communicates evidence and avoids overstating certainty.'}]
  } as Record<string,{q:string;options:string[];answer:number;why:string}[]>)[learner.level] || [{q:'Choose the clearest sentence for your current level.',options:['I can explain my idea clearly.','I can explaining my idea clear.','I explaining clearly idea.'],answer:0,why:'Use a complete subject + verb + object structure.'}];
  const quizItems = isSchool ? schoolQuiz : professionalQuiz;
  const currentQuiz = quizItems[quizIndex % quizItems.length];
  const skillLabels = [{ id: 'listening', label: 'Listening comprehension' }, { id: 'reading', label: 'Reading comprehension' }, { id: 'writing', label: 'Writing accuracy' }, { id: 'speaking', label: 'Speaking performance' }, { id: 'vocabulary', label: 'Vocabulary retrieval' }, { id: 'grammar', label: 'Grammar application' }, { id: 'exam', label: 'Mixed-skill checkpoint' }];
  const completedSkillCount = Object.values(skillProgress).reduce((total, skills) => total + skills.length, 0);
  const practisedUnitCount = Object.values(skillProgress).filter(skills => skills.length > 0).length;

  useEffect(() => { localStorage.setItem('benenglish-v2-profile', JSON.stringify(learner)); }, [learner]);
  useEffect(() => {
    if (!('speechSynthesis' in window)) { setSpeechNotice('Your browser does not support spoken replies. Try the latest Chrome or Edge.'); return; }
    const loadVoices = () => setEnglishVoices(window.speechSynthesis.getVoices().filter(voice => voice.lang.toLowerCase().startsWith('en')));
    loadVoices(); window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => { window.speechSynthesis.removeEventListener('voiceschanged', loadVoices); window.speechSynthesis.cancel(); };
  }, []);
  useEffect(() => {
    if (section !== 'tutor') {
      if ('speechSynthesis' in window) { window.speechSynthesis.cancel(); setIsSpeakingCoach(false); }
      if (recognitionRef.current) {
        submitVoiceOnEndRef.current = false;
        try { recognitionRef.current.abort(); } catch { recognitionRef.current = null; }
        setIsListeningLearner(false);
      }
    }
  }, [section]);
  useEffect(() => () => {
    if (recognitionRef.current) { try { recognitionRef.current.abort(); } catch { /* already stopped */ } }
  }, []);
  useEffect(() => { const refresh = () => { try { setSkillProgress(JSON.parse(localStorage.getItem('benenglish-skill-progress-v1') || '{}')); } catch { setSkillProgress({}); } }; window.addEventListener('benenglish-skill-progress-updated', refresh); return () => window.removeEventListener('benenglish-skill-progress-updated', refresh); }, []);
  useEffect(() => {
    setQuizChoice(null);
    setQuizChecked(false);
    setQuizIndex(0);
    setReadingResponse('');
    setWritingDraft('');
    setReviewChecks([false, false, false]);
    setCurriculumLevel('');
    setWritingFeedback(null);
    setWritingError('');
  }, [learner.track, learner.grade, learner.level]);
  const update = (patch: Partial<Learner>) => setLearner(prev => ({ ...prev, ...patch }));
  const completeOnboarding = () => { update({ onboarded: true }); setSection('today'); };
  const stopCoachSpeech = () => { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); setIsSpeakingCoach(false); };
  const speakCoachText = (text: string) => {
    if (!('speechSynthesis' in window) || !text.trim()) { setSpeechNotice('Spoken English is unavailable in this browser. Please try Chrome or Edge.'); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.trim());
    utterance.lang = 'en-US'; utterance.rate = speechRate; utterance.pitch = 1; utterance.volume = 1;
    const voice = englishVoices.find(item => item.name === selectedVoiceName) || englishVoices.find(item => /natural|google|samantha|daniel/i.test(item.name)) || englishVoices[0];
    if (voice) utterance.voice = voice;
    utterance.onstart = () => { setIsSpeakingCoach(true); setSpeechNotice(''); };
    utterance.onend = () => setIsSpeakingCoach(false);
    utterance.onerror = event => { setIsSpeakingCoach(false); if (event.error !== 'canceled' && event.error !== 'interrupted') setSpeechNotice('The selected voice could not play. Choose another English voice or try again.'); };
    setSpeechNotice(''); window.speechSynthesis.speak(utterance);
  };
  const stopLearnerRecording = (submit: boolean) => {
    if (!recognitionRef.current) return;
    submitVoiceOnEndRef.current = submit;
    try { recognitionRef.current.stop(); } catch { setIsListeningLearner(false); }
  };
  const startLearnerRecording = () => {
    const speechWindow = window as Window & { SpeechRecognition?: new () => any; webkitSpeechRecognition?: new () => any };
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setVoiceInputNotice('Voice input is not supported in this browser. Please use the text box or try Chrome or Edge.');
      return;
    }
    if (isTutorLoading) return;
    stopCoachSpeech();
    setVoiceInputNotice('');
    setLiveTranscript('');
    finalTranscriptRef.current = '';
    submitVoiceOnEndRef.current = false;
    const recognition = new Recognition();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event: any) => {
      let interim = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result[0]?.transcript || '';
        if (result.isFinal) finalTranscriptRef.current += (finalTranscriptRef.current ? ' ' : '') + transcript.trim();
        else interim += transcript;
      }
      setLiveTranscript([finalTranscriptRef.current, interim].filter(Boolean).join(' ').trim());
    };
    recognition.onerror = (event: any) => {
      submitVoiceOnEndRef.current = false;
      setVoiceInputNotice(event.error === 'not-allowed' || event.error === 'service-not-allowed'
        ? 'Microphone permission is blocked. Allow microphone access in your browser settings and try again.'
        : event.error === 'no-speech'
          ? 'No speech was detected. Try again and speak a little closer to the microphone.'
          : 'Voice recognition stopped unexpectedly. Your recognised words are kept in the text box.');
    };
    recognition.onend = () => {
      setIsListeningLearner(false);
      recognitionRef.current = null;
      const transcript = finalTranscriptRef.current.trim();
      if (submitVoiceOnEndRef.current) {
        submitVoiceOnEndRef.current = false;
        if (transcript) {
          setMessage('');
          setLiveTranscript('');
          sendMessage(transcript);
        } else {
          setVoiceInputNotice('I could not recognise a complete sentence. Please try again or type your answer.');
        }
      } else if (transcript) {
        setMessage(transcript);
        setLiveTranscript('');
        setVoiceInputNotice('Your words are ready to review. Press Send when you are happy with the transcript.');
      }
    };
    recognitionRef.current = recognition;
    try {
      recognition.start();
      setIsListeningLearner(true);
    } catch {
      recognitionRef.current = null;
      setIsListeningLearner(false);
      setVoiceInputNotice('The microphone could not start. Please check browser permission and try again.');
    }
  };
  const sendMessage = async (retryText?: string) => {
    const retrying = typeof retryText === 'string';
    const text = (retryText ?? message).trim();
    if (!text || isTutorLoading) return;
    const recentTurns = messages.slice(-8).map(turn => ({ role: turn.role === 'learner' ? 'user' : 'assistant', content: turn.text }));
    // A failed learner turn is already in the transcript. Do not append it twice on Retry.
    const lastTurn = recentTurns[recentTurns.length - 1];
    const history = retrying && lastTurn?.role === 'user' && lastTurn.content === text
      ? recentTurns.slice(0, -1)
      : recentTurns;
    if (!retrying) {
      setMessages(prev => [...prev, { role: 'learner', text }]);
      setMessage('');
    }
    setTutorError('');
    setIsTutorLoading(true);
    try {
      const response = await sendConversationMessage({
        message: text,
        history,
        tutorPersona: isSchool ? 'friendly_teacher' : 'business_coach',
        mode: isSchool ? 'school' : 'business',
        track: learner.track,
        userLevel: ['A1','A2','B1','B2','C1','C2'].includes(learner.level) ? learner.level : 'A2',
        occupation: isSchool ? learner.grade : learner.role,
        grade: learner.grade,
        learnerMemory: { priorities: [learner.goal], recentSessionNotes: [], recurringErrors: [] },
      });
      setMessages(prev => [...prev, {
        role: 'coach',
        text: response.replyText + (response.phoneticTip ? '\n\nPronunciation tip: ' + response.phoneticTip : ''),
        correction: response.correction?.hasMistake ? response.correction : undefined,
      }]);
      if (autoSpeakReplies) speakCoachText(response.replyText);
      setFailedTutorMessage('');
    } catch (error) {
      setFailedTutorMessage(text);
      setTutorError(error instanceof Error ? error.message : 'The AI tutor could not respond. Your message is preserved; please retry.');
    } finally {
      setIsTutorLoading(false);
    }
  };

  const assessWritingDraft = async () => {
    if (writingDraft.trim().split(/\\s+/).filter(Boolean).length < 8) {
      setWritingError('Please write at least 8 words before requesting feedback.');
      return;
    }
    setIsAssessingWriting(true);
    setWritingError('');
    setWritingFeedback(null);
    try {
      const feedback = await evaluateWriting({
        prompt: activeCurriculum?.writing.prompt || (isSchool ? 'Write a paragraph about a skill you want to develop.' : 'Write a concise professional message with a clear action.'),
        learnerResponse: writingDraft,
        sourceText: activeCurriculum?.reading.passage || '',
        track: learner.track,
        grade: learner.grade,
        level: activeCurriculum?.level || (['A1','A2','B1','B2','C1','C2'].includes(learner.level) ? learner.level : 'A2'),
      });
      setWritingFeedback(feedback);
    } catch (error) {
      setWritingError(error instanceof Error ? error.message : 'Could not assess this draft.');
    } finally {
      setIsAssessingWriting(false);
    }
  };

  if (!learner.onboarded) {
    const steps = [
      { eyebrow: 'WELCOME TO BENENGLISH', title: 'English that moves with you.', desc: 'A personal learning experience built around your life, your goals and your level.' },
      { eyebrow: 'CHOOSE YOUR PROGRAMME', title: 'What brings you here?', desc: 'Your learning space, lessons and practice topics will be designed around this choice.' },
      { eyebrow: 'YOUR STARTING POINT', title: 'Let’s find your level.', desc: 'Choose your best estimate for now. A full adaptive placement assessment will refine it as you learn.' },
      { eyebrow: 'YOUR PERSONAL PLAN', title: 'Make learning a daily habit.', desc: 'We’ll shape short sessions around the time you can realistically make.' }
    ];
    const step = steps[onboardingStep];
    return <div className="min-h-screen bg-[#f7f8fc] text-slate-900">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6"><div className="flex items-center gap-2.5"><div className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-950 text-white"><AudioLines size={21}/></div><span className="text-lg font-extrabold tracking-tight">benenglish<span className="text-indigo-600">.</span></span></div><span className="text-xs font-bold tracking-widest text-slate-400">YOUR ENGLISH, YOUR WAY</span></header>
      <main className="mx-auto grid max-w-6xl gap-10 px-5 pb-16 pt-8 lg:grid-cols-[1fr_0.85fr] lg:items-center">
        <section className="max-w-xl">
          <Pill>STEP {onboardingStep + 1} OF 4</Pill><p className="mt-8 text-xs font-extrabold tracking-[.22em] text-indigo-600">{step.eyebrow}</p><h1 className="mt-4 text-5xl font-extrabold leading-[1.06] tracking-tight sm:text-6xl">{step.title}</h1><p className="mt-5 max-w-lg text-lg leading-8 text-slate-500">{step.desc}</p>
          {onboardingStep === 0 && <div className="mt-9 space-y-3"><div className="flex items-center gap-3 text-sm font-semibold text-slate-600"><Check className="text-emerald-500" size={18}/> Personalised learning path</div><div className="flex items-center gap-3 text-sm font-semibold text-slate-600"><Check className="text-emerald-500" size={18}/> Speak without fear of making mistakes</div><div className="flex items-center gap-3 text-sm font-semibold text-slate-600"><Check className="text-emerald-500" size={18}/> Clear feedback and measurable progress</div></div>}
          {onboardingStep === 1 && <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {(['high_school','professional'] as Track[]).map(t => <button key={t} onClick={() => update({ track: t })} className={`rounded-3xl border-2 p-5 text-left transition ${learner.track === t ? 'border-indigo-600 bg-white shadow-lg shadow-indigo-100' : 'border-slate-200 bg-white/60 hover:border-slate-300'}`}><div className={`mb-5 grid h-12 w-12 place-items-center rounded-2xl ${t === 'high_school' ? 'bg-sky-100 text-sky-700' : 'bg-violet-100 text-violet-700'}`}>{t === 'high_school' ? <GraduationCap/> : <BriefcaseBusiness/>}</div><div className="font-extrabold">{trackCopy[t].name}</div><p className="mt-2 text-sm leading-6 text-slate-500">{trackCopy[t].sub}</p>{learner.track === t && <div className="mt-4 flex items-center gap-2 text-xs font-bold text-indigo-700"><Check size={15}/> SELECTED</div>}</button>)}
          </div>}
          {onboardingStep === 2 && <div className="mt-8 space-y-5"><label className="block text-sm font-bold">What should we call you?<input value={learner.name} onChange={e => update({ name: e.target.value })} placeholder="Your name" className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 outline-none focus:border-indigo-500"/></label><div className="text-sm font-bold">Your current English level</div><div className="grid grid-cols-3 gap-2 sm:grid-cols-6">{['A1','A2','B1','B2','C1','Not sure'].map(l => <button key={l} onClick={() => update({ level: l })} className={`rounded-xl border px-2 py-3 text-sm font-bold ${learner.level === l ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-500'}`}>{l}</button>)}</div>{isSchool ? <label className="block text-sm font-bold">Your current grade<select value={learner.grade} onChange={e => update({ grade: e.target.value })} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5"><option>Grade 10</option><option>Grade 11</option><option>Grade 12</option></select></label> : <label className="block text-sm font-bold">Your work area<input value={learner.role} onChange={e => update({ role: e.target.value })} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5"/></label>}</div>}
          {onboardingStep === 3 && <div className="mt-8 space-y-6"><div><div className="mb-3 text-sm font-bold">Your main goal</div><div className="grid gap-2 sm:grid-cols-2">{(isSchool ? ['Speak confidently','Improve school results','Prepare for graduation exam','Build a foundation for IELTS'] : ['Speak confidently at work','Lead meetings & presentations','Prepare for interviews','Work with international teams']).map(g => <button key={g} onClick={() => update({ goal: g })} className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold ${learner.goal === g ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white'}`}>{g}</button>)}</div></div><div><div className="mb-3 text-sm font-bold">Daily learning time</div><div className="grid grid-cols-4 gap-2">{[5,10,15,20].map(n => <button key={n} onClick={() => update({ minutes: n })} className={`rounded-2xl border py-4 text-sm font-extrabold ${learner.minutes === n ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 bg-white'}`}>{n} min</button>)}</div></div></div>}
          <div className="mt-10 flex items-center gap-3"><button onClick={() => onboardingStep === 3 ? completeOnboarding() : setOnboardingStep(s => s + 1)} className="inline-flex items-center gap-3 rounded-2xl bg-slate-950 px-7 py-4 text-sm font-bold text-white shadow-lg shadow-slate-300 transition hover:-translate-y-0.5">{onboardingStep === 3 ? 'Create my learning plan' : onboardingStep === 0 ? 'Get started' : 'Continue'}<ArrowRight size={17}/></button>{onboardingStep > 0 && <button onClick={() => setOnboardingStep(s => s - 1)} className="rounded-2xl px-5 py-4 text-sm font-bold text-slate-500">Back</button>}</div>
        </section>
        <aside className={`relative min-h-[520px] overflow-hidden rounded-[2rem] bg-gradient-to-br ${track.gradient} p-8 text-white shadow-2xl shadow-indigo-200 sm:p-10`}><div className="absolute -right-20 -top-20 h-72 w-72 rounded-full border border-white/15"/><div className="absolute -bottom-24 -left-20 h-80 w-80 rounded-full border border-white/15"/><div className="relative flex h-full min-h-[450px] flex-col justify-between"><div><div className="flex items-center justify-between"><span className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold tracking-widest">BENENGLISH AI</span><Sparkles size={22}/></div><div className="mt-16 max-w-sm"><p className="text-sm font-semibold text-white/65">A BETTER WAY TO LEARN</p><h2 className="mt-4 text-4xl font-extrabold leading-tight">Learn to speak. Not just to study.</h2><p className="mt-5 leading-7 text-white/75">Short, focused practice that helps you turn English knowledge into real communication.</p></div></div><div className="rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur"><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/15"><MessageCircle/></div><div><div className="font-bold">Your AI speaking partner</div><div className="mt-1 text-xs text-white/65">Patient · Personal · Always ready</div></div><div className="ml-auto flex items-end gap-1">{[12,22,16,28,14,24,11].map((h,i)=><span key={i} className="w-1 rounded-full bg-white/80" style={{height:h}}/>)}</div></div></div></div></aside>
      </main>
    </div>;
  }

  return <div className="min-h-screen bg-[#f7f8fc] text-slate-900">
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/90 backdrop-blur-xl"><div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6"><div className="flex items-center gap-2.5"><div className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-950 text-white"><AudioLines size={21}/></div><span className="text-lg font-extrabold tracking-tight">benenglish<span className="text-indigo-600">.</span></span></div><div className="hidden items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600 sm:flex"><span className={`h-2 w-2 rounded-full ${isSchool ? 'bg-sky-500' : 'bg-violet-500'}`}/>{track.name}</div><button onClick={() => { update({ onboarded: false }); setOnboardingStep(1); }} className="rounded-xl px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100">Switch programme</button></div></header>
    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-7 sm:px-6 lg:grid-cols-[230px_1fr]">
      <aside className="hidden lg:block"><div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70"><div className="px-3 pb-4 pt-2"><div className="text-[10px] font-extrabold tracking-[.2em] text-slate-400">YOUR LEARNING SPACE</div><div className="mt-2 text-sm font-extrabold">{track.name}</div><div className="mt-1 text-xs text-slate-400">{isSchool ? learner.grade : learner.role}</div></div>{([{id:'today',label:'Today',icon:Target},{id:'tutor',label:'AI speaking tutor',icon:MessageCircle},{id:'learn',label:'Learning library',icon:BookOpen},{id:'progress',label:'My progress',icon:TrendingUp}] as const).map(item=><button key={item.id} onClick={() => setSection(item.id)} className={`mb-1 flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-semibold transition ${section === item.id ? `${track.soft} ${track.ink}` : 'text-slate-500 hover:bg-slate-50'}`}><item.icon size={18}/>{item.label}</button>)}</div><div className="mt-4 rounded-3xl bg-slate-950 p-5 text-white"><Sparkles className="text-amber-300" size={20}/><div className="mt-4 text-sm font-extrabold">Your next milestone</div><p className="mt-2 text-xs leading-5 text-slate-400">Complete your first 5 practice sessions and build your learning streak.</p><div className="mt-4 h-1.5 rounded-full bg-white/10"><div className="h-full w-1/5 rounded-full bg-amber-300"/></div><div className="mt-2 text-[10px] font-bold text-slate-500">0 / 5 SESSIONS</div></div></aside>
      <main className="min-w-0">
        {section === 'today' && <><div className={`relative overflow-hidden rounded-[2rem] bg-gradient-to-br ${track.gradient} p-7 text-white sm:p-10`}><div className="absolute -right-16 -top-24 h-72 w-72 rounded-full border border-white/15"/><div className="relative max-w-2xl"><div className="flex flex-wrap items-center gap-2"><Pill active>{isSchool ? 'GRADE-ALIGNED LEARNING' : 'CAREER-READY ENGLISH'}</Pill><span className="text-xs font-semibold text-white/60">CEFR {learner.level}</span></div><p className="mt-8 text-sm font-semibold text-white/70">GOOD TO SEE YOU{learner.name ? `, ${learner.name.toUpperCase()}` : ''}</p><h1 className="mt-3 text-4xl font-extrabold leading-tight sm:text-5xl">{track.greeting}</h1><p className="mt-4 max-w-xl leading-7 text-white/75">{track.focus}</p><button onClick={() => setSection('tutor')} className="mt-8 inline-flex items-center gap-3 rounded-2xl bg-white px-6 py-4 text-sm font-extrabold text-slate-950 transition hover:-translate-y-0.5">Start speaking practice <ArrowRight size={17}/></button></div></div>
          <div className="mt-7 grid gap-4 sm:grid-cols-3">{[{icon:Flame,value:'0 days',label:'Learning streak'},{icon:Clock3,value:`${learner.minutes} min`,label:'Daily target'},{icon:Trophy,value:'Getting started',label:'Your level'}].map((x,i)=><div key={i} className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70"><div className="flex items-center justify-between"><span className="text-xs font-semibold text-slate-400">{x.label}</span><x.icon className={track.ink} size={18}/></div><div className="mt-3 text-xl font-extrabold">{x.value}</div></div>)}</div>
          <section className="mt-9"><div className="flex items-end justify-between"><div><p className={`text-xs font-extrabold tracking-[.18em] ${track.ink}`}>YOUR DAILY PLAN</p><h2 className="mt-2 text-2xl font-extrabold">A little practice goes a long way.</h2></div><span className="text-xs font-semibold text-slate-400">{learner.minutes} minutes</span></div><div className="mt-5 grid gap-3">{tasks.map((task,i)=><button key={task.label} onClick={() => setSection(task.section)} className="group flex items-center gap-4 rounded-3xl bg-white p-4 text-left shadow-sm ring-1 ring-slate-200/70 transition hover:-translate-y-0.5 hover:shadow-md sm:p-5"><div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${track.soft} ${track.ink}`}><task.icon size={21}/></div><div className="min-w-0 flex-1"><div className="font-extrabold">{task.label}</div><div className="mt-1 text-xs text-slate-400">{task.detail}</div></div><span className="hidden text-xs font-bold text-slate-400 sm:block">{task.time}</span><ChevronRight className="text-slate-300 transition group-hover:translate-x-1" size={19}/></button>)}</div></section>
          <section className="mt-9 rounded-3xl border border-slate-200 bg-white p-6"><div className="flex items-center gap-2"><BookOpen className={track.ink} size={19}/><p className="text-xs font-extrabold tracking-[.16em] text-slate-400">YOUR PROGRAMME</p></div><h3 className="mt-3 text-xl font-extrabold">{track.name}</h3><p className="mt-2 text-sm text-slate-500">{track.today} — {track.goal}</p><div className="mt-5 flex flex-wrap gap-2">{track.subjects.map(s=><Pill key={s}>{s}</Pill>)}</div></section>
        </>}
        {section === 'tutor' && <section className="overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-slate-200/70"><div className={`bg-gradient-to-r ${track.gradient} p-7 text-white sm:p-9`}><Pill active>AI SPEAKING STUDIO</Pill><h1 className="mt-5 text-3xl font-extrabold">Your conversation starts here.</h1><p className="mt-2 text-sm text-white/70">{track.coach} · {track.coachRole}</p></div>
          <div className="border-b border-slate-100 bg-slate-50/70 p-5 sm:px-8">
            <div className="text-xs font-extrabold tracking-[.16em] text-slate-400">CHOOSE A REAL-LIFE SITUATION</div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {(isSchool ? [
                {title:'At school',desc:'Talk about a subject you enjoy.',prompt:'I enjoy studying science because…'},
                {title:'Future plans',desc:'Explain what you want to do next.',prompt:'After I finish high school, I hope to…'},
                {title:'Everyday opinion',desc:'Give a reason and one example.',prompt:'I think protecting the environment is important because…'}
              ] : [
                {title:'Project update',desc:'Progress, blocker and next step.',prompt:'The project is on track. We have completed…'},
                {title:'Meeting request',desc:'Make a polite request.',prompt:'Could we move our meeting to…?'},
                {title:'Interview answer',desc:'Describe a skill with an example.',prompt:'One strength I bring to this role is…'}
              ]).map(s=><button key={s.title} onClick={()=>setMessage(s.prompt)} className="rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:border-slate-300"><div className="text-sm font-extrabold">{s.title}</div><p className="mt-1 text-xs leading-5 text-slate-500">{s.desc}</p><span className={`mt-2 inline-flex text-[11px] font-bold ${track.ink}`}>Use this starter →</span></button>)}
            </div>
          </div>
          <div className="grid gap-6 p-5 sm:p-8 lg:grid-cols-[.8fr_1.2fr]"><div className="rounded-3xl bg-slate-50 p-6"><div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-white text-4xl shadow-sm">👩‍🏫</div><h2 className="mt-4 text-center text-xl font-extrabold">{track.coach}</h2><p className="mt-1 text-center text-xs text-slate-400">Personal AI English tutor</p><div className="mt-6 space-y-3 text-sm text-slate-600"><div className="flex items-center gap-2"><Check size={16} className="text-emerald-500"/> Natural conversation practice</div><div className="flex items-center gap-2"><Check size={16} className="text-emerald-500"/> Corrections after you speak</div><div className="flex items-center gap-2"><Check size={16} className="text-emerald-500"/> Practice matched to your level</div></div><div className="mt-6 rounded-2xl bg-white p-4">
                <div className="flex items-center justify-between gap-3"><div className="text-sm font-extrabold text-slate-800">AI voice replies</div><button type="button" role="switch" aria-checked={autoSpeakReplies} onClick={() => setAutoSpeakReplies(value => !value)} className={'relative h-6 w-11 rounded-full transition ' + (autoSpeakReplies ? 'bg-emerald-500' : 'bg-slate-300')}><span className={'absolute top-1 h-4 w-4 rounded-full bg-white transition ' + (autoSpeakReplies ? 'left-6' : 'left-1')}/></button></div>
                <p className="mt-2 text-xs leading-5 text-slate-500">{autoSpeakReplies ? 'Teacher ' + track.coach + ' will read each new reply aloud.' : 'Automatic voice playback is off. Use the speaker button on any reply.'}</p>
                <label className="mt-4 block text-xs font-bold text-slate-600">English voice</label>
                <select value={selectedVoiceName} onChange={event => setSelectedVoiceName(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-200">
                  <option value="">Automatic best available voice</option>
                  {englishVoices.map(voice => <option key={voice.name} value={voice.name}>{voice.name} · {voice.lang}</option>)}
                </select>
                <div className="mt-4 flex items-center justify-between"><label htmlFor="coach-speech-rate" className="text-xs font-bold text-slate-600">Speaking speed</label><span className="text-xs font-bold text-indigo-700">{speechRate.toFixed(2)}×</span></div>
                <input id="coach-speech-rate" aria-label="Speaking speed" type="range" min="0.7" max="1.15" step="0.05" value={speechRate} onChange={event => setSpeechRate(Number(event.target.value))} className="mt-2 w-full accent-indigo-600"/>
                <p className="mt-3 text-[11px] leading-5 text-slate-400">Audio uses the English voices available on this device and browser. Voice quality and accents vary by device.</p>
                {speechNotice && <p role="status" className="mt-2 text-xs text-amber-700">{speechNotice}</p>}
              </div></div><div className="flex min-h-[390px] flex-col rounded-3xl border border-slate-200 p-4 sm:p-5"><div className="flex items-center justify-between border-b border-slate-100 pb-3"><div className="font-extrabold">Practice conversation</div><div className="flex items-center gap-2"><Pill>CEFR {learner.level}</Pill>{isSpeakingCoach && <button type="button" onClick={stopCoachSpeech} className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700"><VolumeX size={14}/> Stop</button>}</div></div><div className="flex-1 space-y-4 overflow-y-auto py-5">{messages.length === 0 && <div className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">Hi{learner.name ? ` ${learner.name}` : ''}! I'm {track.coach}. Let's practise: <strong>{track.today.toLowerCase()}</strong>. What would you like to tell me about it?</div>}{messages.map((m,i)=><div key={i} className={`max-w-[90%] rounded-2xl p-4 text-sm leading-6 ${m.role === 'learner' ? 'ml-auto bg-indigo-600 text-white' : 'bg-slate-50 text-slate-700'}`}><div className="whitespace-pre-wrap">{m.text}</div>{m.role === "coach" && <div className="mt-3 flex flex-wrap items-center gap-2"><button type="button" onClick={() => isSpeakingCoach ? stopCoachSpeech() : speakCoachText(m.text)} className="inline-flex items-center gap-2 rounded-xl bg-indigo-50 px-3 py-2 text-xs font-extrabold text-indigo-700 transition hover:bg-indigo-100"><Volume2 size={15}/>{isSpeakingCoach ? "Stop speaking" : "Listen to reply"}</button><span className="text-[10px] text-slate-400">English audio</span></div>}{m.correction && <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-950"><div className="font-extrabold">A useful correction</div><p className="mt-1 line-through opacity-70">{m.correction.original}</p><p className="font-bold">{m.correction.improved}</p><p className="mt-1">{m.correction.explanation}</p><p className="mt-1 text-amber-800">{m.correction.vietnameseTip}</p></div>}</div>)}</div>{isTutorLoading && <div className="mb-3 rounded-xl bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700">Teacher is reading your answer and preparing a response…</div>}{tutorError && <div role="alert" className="mb-3 rounded-xl bg-rose-50 p-3 text-xs text-rose-700">{tutorError}<button type="button" disabled={isTutorLoading} onClick={()=>sendMessage(failedTutorMessage)} className="ml-2 font-extrabold underline disabled:opacity-50">Retry</button></div>}<div className="mb-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-extrabold text-slate-700">Speak to {track.coach}</div>
              {isListeningLearner
                ? <button type="button" onClick={() => stopLearnerRecording(true)} className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-3 py-2 text-xs font-extrabold text-white"><Mic2 size={14}/> Finish & send</button>
                : <button type="button" disabled={isTutorLoading} onClick={startLearnerRecording} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-extrabold text-white disabled:opacity-40"><Mic2 size={14}/> Start speaking</button>}
              {isListeningLearner && <button type="button" onClick={() => stopLearnerRecording(false)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600">Stop & review</button>}
            </div>
            {isListeningLearner && <p className="mt-2 text-xs font-semibold text-rose-700">Listening… Speak naturally. Your words will not be sent until you choose Finish & send.</p>}
            {liveTranscript && <p aria-live="polite" className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-600">{liveTranscript}</p>}
            {voiceInputNotice && <p role="status" className="mt-2 text-xs leading-5 text-amber-700">{voiceInputNotice}</p>}
          </div>
          <div className="flex gap-2"><input value={message} onChange={e=>setMessage(e.target.value)} onKeyDown={e=>e.key==='Enter'&&!isTutorLoading&&sendMessage()} placeholder="Type or review your recognised words..." className="min-w-0 flex-1 rounded-2xl bg-slate-100 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-300"/><button disabled={isTutorLoading||!message.trim()} onClick={()=>sendMessage()} className="rounded-2xl bg-slate-950 px-4 text-sm font-bold text-white disabled:opacity-40">{isTutorLoading?'…':'Send'}</button></div></div></div><div className="px-5 pb-6 sm:px-8"><PronunciationCoach track={learner.track} level={learner.level} contextLabel={isSchool ? learner.grade : learner.role} /></div></section>}
        {section === 'learn' && <div>
          <div className={`rounded-[2rem] bg-gradient-to-br ${track.gradient} p-7 text-white sm:p-9`}>
            <Pill active>SHORT, REAL-WORLD LESSONS</Pill>
            <h1 className="mt-5 text-3xl font-extrabold sm:text-4xl">Listen. Notice. Speak naturally.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">Mỗi bài chỉ tập trung vào một tình huống, một nhóm từ và một điểm phát âm. Nghe người thật trước, xem hướng dẫn sau, rồi tự nói lại.</p>
            <div className="mt-6 flex flex-wrap gap-2"><Pill active>Human-recorded audio</Pill><Pill active>Pronunciation</Pill><Pill active>Stress & intonation</Pill></div>
          </div>

          {activeCurriculum && <section className="mt-7 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><p className={`text-xs font-extrabold tracking-[.18em] ${track.ink}`}>YOUR GRADE + CEFR LESSON</p><h2 className="mt-2 text-2xl font-extrabold">{activeCurriculum.title}</h2><p className="mt-1 text-sm text-slate-500">{activeCurriculum.theme}</p></div><label className="text-xs font-bold text-slate-500">CEFR level<select value={activeCurriculum.level} onChange={e=>{setCurriculumLevel(e.target.value);setWritingFeedback(null);}} className="mt-1 block rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-extrabold text-slate-800">{curriculumUnits.map(unit=><option key={unit.id} value={unit.level}>{unit.level}</option>)}</select></label></div>
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <article className="rounded-2xl border border-sky-100 bg-sky-50/60 p-4"><div className="flex items-center gap-2 text-sm font-extrabold text-sky-900"><Headphones size={17}/> 01 · Listening</div><p className="mt-2 text-xs leading-5 text-slate-600">Original lesson script. Device speech synthesis is a preview voice, not a recorded human speaker.</p><p className="mt-3 text-sm leading-6 text-slate-800">{activeCurriculum.listening.script}</p><button onClick={()=>{if('speechSynthesis' in window){window.speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(activeCurriculum.listening.script);utterance.lang='en-US';window.speechSynthesis.speak(utterance);}}} className="mt-3 rounded-xl bg-sky-700 px-3 py-2 text-xs font-bold text-white">Play device voice preview</button><details className="mt-3 rounded-xl bg-white p-3"><summary className="cursor-pointer text-xs font-bold text-sky-900">{activeCurriculum.listening.questions[0].prompt}</summary><p className="mt-2 text-xs text-slate-700">Answer: {activeCurriculum.listening.questions[0].answer}</p><p className="mt-1 text-xs text-slate-500">{activeCurriculum.listening.questions[0].explanation}</p></details></article>
              <article className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4"><div className="flex items-center gap-2 text-sm font-extrabold text-indigo-900"><BookOpen size={17}/> 02 · Reading</div><p className="mt-3 text-sm leading-7 text-slate-800">{activeCurriculum.reading.passage}</p><details className="mt-3 rounded-xl bg-white p-3"><summary className="cursor-pointer text-xs font-bold text-indigo-900">{activeCurriculum.reading.questions[0].prompt}</summary><p className="mt-2 text-xs text-slate-700">Answer: {activeCurriculum.reading.questions[0].answer}</p><p className="mt-1 text-xs text-slate-500">{activeCurriculum.reading.questions[0].explanation}</p></details></article>
              <article className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4"><div className="flex items-center gap-2 text-sm font-extrabold text-emerald-900"><BookOpen size={17}/> 03 · Writing</div><p className="mt-3 text-sm leading-6 text-slate-800">{activeCurriculum.writing.prompt}</p><div className="mt-3 flex flex-wrap gap-2">{activeCurriculum.writing.checklist.map(item=><Pill key={item}>{item}</Pill>)}</div><div className="mt-3 text-xs text-slate-600">Your draft below is assessed against this exact task and reading context.</div></article>
              <article className="rounded-2xl border border-violet-100 bg-violet-50/60 p-4"><div className="flex items-center gap-2 text-sm font-extrabold text-violet-900"><Mic2 size={17}/> 04 · Speaking</div><p className="mt-3 text-sm leading-6 text-slate-800">{activeCurriculum.speaking.prompt}</p><div className="mt-3 space-y-2">{activeCurriculum.speaking.followUps.map((question,index)=><p key={question} className="rounded-xl bg-white p-3 text-xs text-slate-700"><strong>Follow-up {index+1}:</strong> {question}</p>)}</div><p className="mt-2 text-[11px] text-slate-500">Suggested speaking time: {activeCurriculum.speaking.targetMinutes} minute(s)</p></article>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">{activeCurriculum.vocabulary.map(item=><div key={item.word} className="rounded-xl bg-slate-50 px-3 py-2 text-xs"><strong>{item.word}</strong><span className="ml-2 text-slate-500">{item.meaningVi}</span><p className="mt-1 text-slate-500">{item.example}</p></div>)}</div>
            <div className="mt-3 text-xs text-slate-500">Grammar focus: {activeCurriculum.grammarFocus.join(' · ')}</div>
          </section>}
          {activeCurriculum && <DeepPracticeHub unit={activeCurriculum} track={learner.track} grade={learner.grade} level={learner.level} />}

          <section className="mt-7">
            <div className="flex items-end justify-between gap-3"><div><p className={`text-xs font-extrabold tracking-[.18em] ${track.ink}`}>YOUR COURSE MAP</p><h2 className="mt-2 text-2xl font-extrabold">{isSchool ? `Grade ${learner.grade.replace('Grade ', '')} learning path` : 'Workplace communication path'}</h2></div><Pill>{isSchool ? 'School curriculum' : 'CEFR-based practice'}</Pill></div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{isSchool ? 'Các chủ đề dưới đây là khung ôn luyện theo năng lực và chủ điểm thường gặp ở bậc THPT; giáo viên có thể điều chỉnh theo bộ sách trường đang học.' : 'Học theo tình huống công việc thực tế. Mỗi chủ đề kết hợp cụm từ, cấu trúc lịch sự và một nhiệm vụ giao tiếp có đầu ra rõ ràng.'}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {(isSchool ? [
                {n:'01',title:'People & relationships',desc:'Describe people, relationships and everyday experiences.',out:'Write a short profile'},
                {n:'02',title:'Education & future plans',desc:'Talk about learning choices, goals and future careers.',out:'Explain a study plan'},
                {n:'03',title:'Environment & community',desc:'Discuss local issues and practical solutions.',out:'Give an opinion with reasons'},
                {n:'04',title:'Technology & communication',desc:'Explain how technology changes daily life.',out:'Compare advantages and risks'},
                {n:'05',title:'Culture & global issues',desc:'Share views about culture, travel and global citizenship.',out:'Summarise a short text'},
                {n:'06',title:'Exam skills & revision',desc:'Practise reading, cloze tests, sentence ordering and error correction.',out:'Complete a timed mini test'}
              ] : [
                {n:'01',title:'Introductions & networking',desc:'Introduce your role, experience and company clearly.',out:'Deliver a 30-second introduction'},
                {n:'02',title:'Meetings & updates',desc:'Share progress, blockers and next steps concisely.',out:'Give a one-minute project update'},
                {n:'03',title:'Professional email',desc:'Write clear requests, replies and follow-ups.',out:'Draft a short action email'},
                {n:'04',title:'Presentations',desc:'Structure a message and highlight key evidence.',out:'Present one recommendation'},
                {n:'05',title:'Problem-solving',desc:'Clarify issues, suggest options and agree actions.',out:'Lead a short solution discussion'},
                {n:'06',title:'Interviews & negotiation',desc:'Explain achievements and negotiate respectfully.',out:'Answer a behavioural question'}
              ]).map(m=><article key={m.n} className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70"><div className="flex items-center justify-between"><span className={`text-xs font-extrabold ${track.ink}`}>MODULE {m.n}</span><span className="text-[10px] font-bold text-slate-400">10–15 MIN</span></div><h3 className="mt-3 font-extrabold">{m.title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{m.desc}</p><div className={`mt-4 rounded-xl px-3 py-2 text-xs font-bold ${track.soft} ${track.ink}`}>Outcome: {m.out}</div></article>)}
            </div>
          </section>

          <section className="mt-8 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><p className={`text-xs font-extrabold tracking-[.18em] ${track.ink}`}>LEVEL-MATCHED PRACTICE</p><h2 className="mt-2 text-2xl font-extrabold">One question at the right challenge.</h2></div><div className="flex gap-2"><Pill>{isSchool ? learner.grade : 'Professional'}</Pill><Pill>CEFR {learner.level}</Pill></div></div>
            <p className="mt-2 text-sm leading-6 text-slate-500">{isSchool ? 'Bài tập được chọn theo cả khối lớp và trình độ bạn tự khai báo. Lớp học quyết định mạch kiến thức; CEFR điều chỉnh độ khó câu hỏi.' : 'Bài tập được chọn trực tiếp theo CEFR để tăng dần độ chính xác, độ tinh tế và khả năng dùng tiếng Anh trong công việc.'}</p>
            <div className="mt-5 rounded-2xl bg-slate-50 p-5">
              <div className="text-xs font-bold text-slate-400">QUESTION {(quizIndex % quizItems.length)+1} OF {quizItems.length}</div>
              <h3 className="mt-3 text-base font-extrabold leading-7">{currentQuiz.q}</h3>
              <div className="mt-4 grid gap-2">{currentQuiz.options.map((option,i)=><button key={option} disabled={quizChecked} onClick={()=>setQuizChoice(i)} className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${quizChecked && i===currentQuiz.answer ? 'border-emerald-400 bg-emerald-50 text-emerald-800' : quizChoice===i ? `border-current ${track.soft} ${track.ink}` : 'border-slate-200 bg-white hover:border-slate-300'} ${quizChecked && quizChoice===i && i!==currentQuiz.answer ? 'border-rose-300 bg-rose-50 text-rose-700' : ''}`}>{String.fromCharCode(65+i)}. {option}</button>)}</div>
              {quizChecked && <div className={`mt-4 rounded-xl p-4 text-sm leading-6 ${quizChoice===currentQuiz.answer?'bg-emerald-50 text-emerald-900':'bg-amber-50 text-amber-900'}`}><strong>{quizChoice===currentQuiz.answer?'Correct. Well done!':'Not quite — learn from this.'}</strong><p className="mt-1">{currentQuiz.why}</p></div>}
              <div className="mt-5 flex flex-wrap gap-2">{!quizChecked ? <button disabled={quizChoice===null} onClick={()=>setQuizChecked(true)} className={`rounded-xl px-5 py-3 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-40 ${track.color}`}>Check answer</button> : <button onClick={()=>{setQuizIndex(i=>i+1);setQuizChoice(null);setQuizChecked(false);}} className={`rounded-xl px-5 py-3 text-sm font-extrabold text-white ${track.color}`}>Next question <ArrowRight size={14} className="ml-1 inline"/></button>}<button onClick={()=>{setQuizChoice(null);setQuizChecked(false);setQuizIndex(0);}} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-500">Reset practice</button></div>
            </div>
            <p className="mt-3 text-xs text-slate-400">Đây là bài luyện tập mẫu theo hồ sơ hiện tại, chưa phải bài kiểm tra xếp lớp hoặc điểm đánh giá năng lực chính thức.</p>
          </section>

          <section className="mt-8 grid gap-4 lg:grid-cols-2">
            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
              <p className={`text-xs font-extrabold tracking-[.18em] ${track.ink}`}>{isSchool ? 'VOCABULARY IN CONTEXT' : 'WORKPLACE PHRASE BANK'}</p>
              <h2 className="mt-2 text-xl font-extrabold">{isSchool ? 'Useful words for Grade 10–12' : 'Phrases you can use at work'}</h2>
              <div className="mt-4 space-y-3">
                {(isSchool ? [
                  ['achieve','đạt được','Students can achieve their goals with regular practice.'],
                  ['environment','môi trường','We should protect the environment.'],
                  ['opportunity','cơ hội','Volunteering is a good opportunity to learn.'],
                  ['responsible for','chịu trách nhiệm về','We are responsible for our choices.'],
                  ['take part in','tham gia','Many students take part in school activities.']
                ] : [
                  ['Could you clarify…?','Bạn có thể làm rõ…?','Could you clarify the deadline for this task?'],
                  ['I’m responsible for…','Tôi phụ trách…','I’m responsible for the monthly report.'],
                  ['The main priority is…','Ưu tiên chính là…','The main priority is improving customer response time.'],
                  ['We’re on track.','Chúng ta đang đúng tiến độ.','We’re on track to finish by Friday.'],
                  ['I’ll follow up on…','Tôi sẽ tiếp tục xử lý/theo dõi…','I’ll follow up on the supplier’s reply.']
                ]).map(([term,meaning,example])=><div key={term} className="border-b border-slate-100 pb-3 last:border-0"><div className="flex flex-wrap items-baseline justify-between gap-2"><strong className="text-sm">{term}</strong><span className="text-xs text-slate-400">{meaning}</span></div><p className="mt-1 text-xs italic leading-5 text-slate-500">{example}</p></div>)}
              </div>
            </div>
            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
              <p className={`text-xs font-extrabold tracking-[.18em] ${track.ink}`}>GRAMMAR THAT HELPS YOU SPEAK</p>
              <h2 className="mt-2 text-xl font-extrabold">{isSchool ? 'Core sentence patterns' : 'Clear and polite communication'}</h2>
              <div className="mt-4 space-y-4">
                {(isSchool ? [
                  ['Present perfect','S + have/has + past participle','I have studied English for three years.','Nói về trải nghiệm hoặc việc bắt đầu trong quá khứ còn liên quan hiện tại.'],
                  ['First conditional','If + present simple, will + verb','If we work together, we will finish on time.','Diễn tả điều kiện có thể xảy ra ở hiện tại/tương lai.'],
                  ['Relative clauses','who / which / that','A volunteer is someone who helps others.','Bổ sung thông tin cho người hoặc vật.']
                ] : [
                  ['Polite requests','Could you + verb…? / Would you mind + V-ing…?','Could you send me the updated file?','Yêu cầu lịch sự, phù hợp khi làm việc với đồng nghiệp/khách hàng.'],
                  ['Progress update','We have + past participle…','We have completed the first stage.','Báo cáo kết quả đã đạt được đến hiện tại.'],
                  ['Diplomatic language','It might be worth + V-ing…','It might be worth reviewing the timeline.','Đề xuất nhẹ nhàng, tránh nghe quá trực tiếp.']
                ]).map(([name,pattern,example,note])=><div key={name}><div className="text-sm font-extrabold">{name}</div><div className={`mt-1 text-xs font-bold ${track.ink}`}>{pattern}</div><p className="mt-1 text-sm">{example}</p><p className="mt-1 text-xs leading-5 text-slate-400">{note}</p></div>)}
              </div>
            </div>
          </section>

          <section className="mt-8 rounded-3xl bg-slate-950 p-6 text-white sm:p-7">
            <p className="text-xs font-extrabold tracking-[.18em] text-amber-300">READ, THINK & PRODUCE</p>
            <h2 className="mt-2 text-2xl font-extrabold">{isSchool ? 'A short reading: Small actions matter' : 'A workplace reading: A useful project update'}</h2>
            <p className="mt-4 text-sm leading-7 text-slate-200">{isSchool ? 'Our school started a small project to reduce plastic waste. Students bring reusable bottles and sort rubbish after lunch. At first, only a few students joined. After the class shared photos and explained the benefits, more students became interested. The project shows that simple actions can make a difference when people work together.' : 'The product team has finished the first stage of the website update. The new layout is ready, but the mobile checkout still needs testing. The team will review the main issues this afternoon and share a revised timeline tomorrow. The project is still on track, provided that the payment test is completed by Thursday.'}</p>
            <div className="mt-5 rounded-2xl bg-white/10 p-4">
              <label className="block text-xs font-extrabold tracking-wider text-white/65" htmlFor="reading-response">YOUR READING RESPONSE</label>
              <p className="mt-2 text-sm font-semibold">{isSchool ? 'Why did more students become interested in the project?' : 'What must happen before the project can stay on track?'}</p>
              <textarea id="reading-response" value={readingResponse} onChange={e=>setReadingResponse(e.target.value)} rows={3} placeholder={isSchool ? 'Write one complete sentence…' : 'Summarise the dependency in one or two sentences…'} className="mt-3 w-full rounded-xl border border-white/15 bg-slate-900/40 px-3 py-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/50" />
              <div className="mt-2 text-xs text-white/55">{readingResponse.trim().split(/\s+/).filter(Boolean).length} words · Your answer stays in this browser preview.</div>
              <div className="mt-3 rounded-xl bg-white/10 p-3 text-xs leading-5 text-white/80"><strong>Self-check:</strong> {isSchool ? 'Mention the photos and the explanation of the benefits.' : 'Mention completion of the payment test by Thursday.'} This is a reading hint, not an automatic score.</div>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-white/10 p-4"><div className="text-xs font-extrabold text-white/60">CHECK YOUR UNDERSTANDING</div><p className="mt-2 text-sm font-semibold">{isSchool ? 'Why did more students join the project?' : 'What is the main blocker, and what is the next action?'}</p><p className="mt-2 text-xs text-white/60">{isSchool ? 'Answer in one complete sentence.' : 'Answer in two concise sentences.'}</p></div>
              <div className="rounded-2xl bg-white/10 p-4"><div className="text-xs font-extrabold text-white/60">YOUR OUTPUT TASK</div><p className="mt-2 text-sm font-semibold">{isSchool ? 'Write 3 sentences about one action that can improve your school or community.' : 'Give a 45-second spoken update: progress, one blocker and the next step.'}</p><p className="mt-2 text-xs text-white/60">Focus on clear meaning before using difficult vocabulary.</p></div>
            </div>
          </section>

          <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6">
            <p className={`text-xs font-extrabold tracking-[.18em] ${track.ink}`}>WRITING & SPEAKING CHALLENGE</p>
            <h2 className="mt-2 text-xl font-extrabold">{isSchool ? 'Build a clear paragraph' : 'Turn an idea into a professional message'}</h2>
            <div className="mt-3 text-sm leading-6 text-slate-500">{activeCurriculum?.writing.prompt || (isSchool ? 'Write a clear paragraph about a skill you want to develop.' : 'Write a concise professional email with a clear action.')}</div>
            <textarea value={writingDraft} onChange={e=>setWritingDraft(e.target.value)} rows={5} placeholder={isSchool ? 'Write your paragraph here…' : 'Draft your professional email here…'} className="mt-4 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 outline-none focus:border-indigo-400" />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400"><span>{writingDraft.trim().split(/\s+/).filter(Boolean).length} words</span><span>{isSchool ? `${learner.grade} · CEFR ${activeCurriculum?.level || learner.level}` : `Professional · CEFR ${activeCurriculum?.level || learner.level}`}</span></div>
            <div className="mt-3 flex flex-wrap items-center gap-2"><button disabled={isAssessingWriting||writingDraft.trim().split(/\s+/).filter(Boolean).length<8} onClick={assessWritingDraft} className={`rounded-xl px-4 py-3 text-sm font-extrabold text-white disabled:opacity-40 ${track.color}`}>{isAssessingWriting?'Teacher is reviewing your draft…':'Get evidence-based AI feedback'}</button><span className="text-xs text-slate-500">Corrections are checked against your actual words.</span></div>
            {writingError && <p role="alert" className="mt-3 rounded-xl bg-rose-50 p-3 text-xs text-rose-700">{writingError}</p>}
            {writingFeedback && <div className="mt-4 space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4"><div className="text-sm font-extrabold text-slate-900">Teacher’s feedback on your writing</div><p className="text-sm leading-6 text-slate-700">{writingFeedback.overallFeedback}</p><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{[{label:'Task',value:writingFeedback.taskFulfilment},{label:'Organisation',value:writingFeedback.organisation},{label:'Vocabulary',value:writingFeedback.vocabulary},{label:'Grammar',value:writingFeedback.grammar}].map(item=><div key={item.label} className="rounded-xl bg-white p-3"><div className="text-[10px] text-slate-500">{item.label}</div><div className="text-lg font-extrabold text-emerald-700">{item.value}/5</div></div>)}</div>{writingFeedback.corrections.map((item,index)=><div key={index} className="rounded-xl bg-white p-3 text-xs"><p className="text-rose-700 line-through">{item.original}</p><p className="mt-1 font-bold text-emerald-700">{item.improved}</p><p className="mt-1 text-slate-600">{item.explanationVi}</p></div>)}<ul className="list-disc space-y-1 pl-5 text-xs text-slate-700">{writingFeedback.nextSteps.map((item,index)=><li key={index}>{item}</li>)}</ul>{writingFeedback.improvedSampleAnswer&&<details className="rounded-xl bg-white p-3"><summary className="cursor-pointer text-xs font-bold">View separate model answer</summary><p className="mt-2 whitespace-pre-wrap text-xs leading-6 text-slate-700">{writingFeedback.improvedSampleAnswer}</p></details>}</div>}
            <div className="mt-4 rounded-2xl bg-slate-50 p-4"><div className="text-xs font-extrabold tracking-wider text-slate-500">MY WRITING CHECKLIST</div><div className="mt-3 space-y-3">{(isSchool ? ['I answer the topic directly.','I support my idea with relevant details.','I use complete sentences and check verb forms.'] : ['My purpose is clear in the opening.','I include the key detail and a specific action.','My tone is polite and the message is easy to scan.']).map((item,i)=><label key={item} className="flex cursor-pointer items-start gap-3 text-sm text-slate-600"><input type="checkbox" checked={reviewChecks[i]} onChange={e=>setReviewChecks(prev=>prev.map((v,j)=>j===i?e.target.checked:v))} className="mt-0.5 h-4 w-4 rounded border-slate-300"/><span>{item}</span></label>)}</div><p className="mt-3 text-xs text-slate-400">{reviewChecks.filter(Boolean).length}/3 checks complete · Self-review only; no AI grading is claimed.</p></div>
            <div className="mt-4 flex flex-wrap gap-2"><button onClick={()=>setSection('tutor')} className={`inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-extrabold text-white ${track.color}`}>Discuss this with {track.coach} <ArrowRight size={15}/></button><button onClick={()=>{setWritingDraft('');setReviewChecks([false,false,false]);}} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-500">Clear draft</button></div>
          </section>

          <section className="mt-7">
            <div className="flex items-end justify-between gap-3"><div><p className={`text-xs font-extrabold tracking-[.18em] ${track.ink}`}>TODAY'S LESSON</p><h2 className="mt-2 text-2xl font-extrabold">{isSchool ? 'Meet someone new' : 'Make a clear first impression'}</h2></div><Pill>{isSchool ? 'A1 · Beginner' : 'A2 · Pre-intermediate'}</Pill></div>
            <div className="mt-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-3"><div><div className="text-sm font-extrabold">{isSchool ? 'VOA Learning English · Lesson 1' : 'British Council · Changing a meeting time'}</div><p className="mt-1 text-xs text-slate-400">Giọng người thật · {isSchool ? 'American English' : 'British / international English'}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${track.soft} ${track.ink}`}>{isSchool ? 'School & everyday life' : 'Workplace communication'}</span></div>
              {isSchool ? <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-bold"><Headphones size={17}/> Listen to the original recording</div>
                <audio controls preload="none" className="w-full" src="https://voa-audio.voanews.eu/vle/2016/02/08/49485bf8-4277-47f6-9abe-617ee2473f8c.mp3?download=1">Your browser does not support audio playback.</audio>
                <p className="mt-2 text-xs leading-5 text-slate-500">Audio do VOA phát hành. BenEnglish phát trực tiếp từ máy chủ nguồn, không tải lại hoặc lưu trữ bản ghi.</p>
                <a className={`mt-3 inline-flex items-center gap-2 text-xs font-extrabold ${track.ink}`} href="https://learningenglish.voanews.com/a/lets-learn-english-lesson-one/3111026.html" target="_blank" rel="noreferrer">Open original lesson & transcript <ArrowRight size={14}/></a>
              </div> : <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-sm font-bold"><Headphones size={17}/> Listen to two colleagues</div>
                <p className="mt-2 text-sm leading-6 text-slate-500">Nghe cuộc hội thoại đổi lịch họp, chú ý cách đề nghị lịch sự và cách xác nhận thông tin.</p>
                <a className={`mt-3 inline-flex items-center gap-2 text-sm font-extrabold ${track.ink}`} href="https://learnenglish.britishcouncil.org/free-resources/listening/a2/changing-meeting-time" target="_blank" rel="noreferrer">Play the original human recording <ArrowRight size={15}/></a>
              </div>}
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-100 p-4"><div className="text-xs font-extrabold tracking-wider text-slate-400">KEY LANGUAGE</div>{(isSchool ? [{w:'Nice to meet you.',m:'Rất vui được gặp bạn.'},{w:'Are you ...?',m:'Bạn có phải là ... không?'},{w:'Welcome to ...',m:'Chào mừng đến ...'}] : [{w:'Would it be possible to ...?',m:'Liệu có thể ... được không?'},{w:'Could we make it ...?',m:'Chúng ta có thể chuyển sang ... không?'},{w:'That would really help me.',m:'Điều đó sẽ giúp tôi rất nhiều.'}]).map(x=><div key={x.w} className="mt-3"><div className="text-sm font-bold">{x.w}</div><div className="mt-1 text-xs text-slate-500">{x.m}</div></div>)}</div>
                <div className="rounded-2xl border border-slate-100 p-4"><div className="text-xs font-extrabold tracking-wider text-slate-400">SAY IT NATURALLY</div>
                  <div className="mt-3 text-sm font-bold">{isSchool ? 'NICE to MEET you.' : 'WOULD it be POSsible to MOVE it?'}</div>
                  <p className="mt-2 text-xs leading-5 text-slate-500">Chữ IN HOA là từ mang trọng âm câu: nói rõ hơn, dài hơn một chút. Các từ chức năng thường nhẹ và nhanh hơn.</p>
                  <div className="mt-3 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900"><strong>Intonation:</strong> {isSchool ? 'Câu hỏi Yes/No thường lên giọng nhẹ ở cuối; câu chào hỏi thân thiện giữ nhịp tự nhiên, không đọc từng từ rời.' : 'Dùng giọng lên nhẹ khi đưa ra lựa chọn; hạ giọng ở cuối câu xác nhận để nghe chắc chắn và chuyên nghiệp.'}</div>
                </div>
              </div>
              <div className="mt-5 rounded-2xl bg-indigo-50 p-4"><div className="flex items-center gap-2 text-sm font-extrabold text-indigo-800"><Mic2 size={17}/> 3-step shadowing</div><ol className="mt-2 list-decimal space-y-1 pl-5 text-xs leading-5 text-indigo-900"><li>Nghe một lượt, chưa nhìn transcript.</li><li>Nghe lại và chú ý từ được nhấn, chỗ ngắt hơi và giọng lên/xuống.</li><li>Bấm phát lại từng đoạn trên trang nguồn, nói đuổi theo người nói 2–3 lần.</li></ol></div>
              <p className="mt-4 text-[11px] leading-5 text-slate-400">Lưu ý: audio, transcript và bài tập thuộc nhà xuất bản. BenEnglish dẫn tới nguồn gốc; không giả lập giọng người thật bằng TTS và không tự nhận audio ngoài là nội dung do app sở hữu.</p>
            </div>
          </section>

          <section className="mt-8">
            <p className={`text-xs font-extrabold tracking-[.18em] ${track.ink}`}>PRONUNCIATION MINI-LESSON</p>
            <h2 className="mt-2 text-2xl font-extrabold">Make every sentence easier to follow.</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70"><div className="text-sm font-extrabold">1. Word stress · Trọng âm từ</div><p className="mt-2 text-sm leading-6 text-slate-500">Một âm tiết nổi bật hơn trong từ dài. Ví dụ: <strong>TA</strong>ble, be<strong>GIN</strong>, im<strong>POR</strong>tant. Không nhấn đều mọi âm tiết.</p><span className="mt-3 inline-block text-xs font-bold text-slate-400">Listen for the strong syllable</span></div>
              <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70"><div className="text-sm font-extrabold">2. Sentence stress · Trọng âm câu</div><p className="mt-2 text-sm leading-6 text-slate-500">Nhấn từ mang thông tin mới: “I need the <strong>BLUE</strong> one”, không đọc mọi từ cùng lực.</p><span className="mt-3 inline-block text-xs font-bold text-slate-400">Content words stand out</span></div>
              <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70"><div className="text-sm font-extrabold">3. Intonation · Ngữ điệu</div><p className="mt-2 text-sm leading-6 text-slate-500">Giọng lên/xuống truyền tải thái độ và ý định. Câu hỏi Yes/No thường lên giọng; câu trần thuật thường hạ giọng.</p><span className="mt-3 inline-block text-xs font-bold text-slate-400">Meaning changes with the tune</span></div>
              <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70"><div className="text-sm font-extrabold">4. Linking & pauses · Nối âm và ngắt</div><p className="mt-2 text-sm leading-6 text-slate-500">Nối phụ âm cuối với nguyên âm đầu: “pick‿it‿up”. Ngắt theo cụm ý, không dừng sau từng từ.</p><span className="mt-3 inline-block text-xs font-bold text-slate-400">Speak in thought groups</span></div>
            </div>
            <a className="mt-4 inline-flex items-center gap-2 text-sm font-extrabold text-indigo-700" href="https://downloads.bbc.co.uk/learningenglish/features/the_pronunciation_lounge/pron_lounge_episode_8_transcript_.pdf" target="_blank" rel="noreferrer">BBC lesson: sentence stress <ArrowRight size={15}/></a>
          </section>

          <section className="mt-8">
            <p className={`text-xs font-extrabold tracking-[.18em] ${track.ink}`}>MORE REAL VOICES</p><h2 className="mt-2 text-2xl font-extrabold">Choose one source. Keep it simple.</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {(isSchool ? [
                {name:'British Council LearnEnglish Teens',desc:'School-friendly listening from A1 to C1, with exercises.',url:'https://learnenglishteens.britishcouncil.org/skills/listening'},
                {name:'VOA · Let’s Learn English',desc:'American voices, short video lessons and pronunciation practice.',url:'https://learningenglish.voanews.com/p/5644.html'},
                {name:'ELLLO A1–B1',desc:'Natural conversations with speakers from different countries.',url:'https://www.elllo.org/'},
                {name:'BBC Learning English',desc:'Short lessons for listening, vocabulary and pronunciation.',url:'https://www.bbc.co.uk/learningenglish'}
              ] : [
                {name:'British Council Business English',desc:'Workplace conversations, phone calls and meeting language.',url:'https://learnenglish.britishcouncil.org/business-english'},
                {name:'British Council · Audio Zone',desc:'Natural speakers, transcripts and exercises for B2–C1.',url:'https://learnenglish.britishcouncil.org/free-resources/general/audio-zone'},
                {name:'ELLLO B1–C1',desc:'Real speakers and a range of accents for global communication.',url:'https://www.elllo.org/'},
                {name:'BBC Learning English',desc:'Pronunciation, connected speech and everyday English.',url:'https://www.bbc.co.uk/learningenglish'}
              ]).map(r=><a key={r.name} href={r.url} target="_blank" rel="noreferrer" className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 transition hover:-translate-y-0.5 hover:shadow-md"><div className="font-extrabold">{r.name}</div><p className="mt-2 text-sm leading-6 text-slate-500">{r.desc}</p><span className={`mt-3 inline-flex items-center gap-2 text-xs font-extrabold ${track.ink}`}>Open free lessons <ArrowRight size={14}/></span></a>)}
            </div>
          </section>
        </div>}
        {section === 'progress' && <section className="rounded-[2rem] bg-white p-7 shadow-sm ring-1 ring-slate-200/70 sm:p-9">
          <p className={`text-xs font-extrabold tracking-[.18em] ${track.ink}`}>YOUR LEARNING JOURNEY</p>
          <h1 className="mt-2 text-3xl font-extrabold">Progress that means something.</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">Thống kê số hoạt động bạn thực sự hoàn thành trong Deep Practice Studio. Không tự tạo điểm CEFR hoặc phần trăm năng lực khi chưa có đủ bài đánh giá.</p>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-950 p-5 text-white"><div className="text-3xl font-black">{completedSkillCount}</div><div className="mt-1 text-xs text-white/65">Skill activities completed</div></div>
            <div className="rounded-2xl bg-slate-50 p-5"><div className="text-3xl font-black text-slate-900">{practisedUnitCount}</div><div className="mt-1 text-xs text-slate-500">Lesson units practised</div></div>
          </div>
          <h2 className="mt-7 text-lg font-extrabold">Practice by skill</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {skillLabels.map(item => {
              const count = Object.values(skillProgress).filter(skills => skills.includes(item.id)).length;
              return <div key={item.id} className="rounded-2xl border border-slate-100 p-4">
                <div className="flex items-center justify-between gap-3"><span className="text-sm font-bold">{item.label}</span><span className="text-xs font-extrabold text-slate-500">{count} units</span></div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${track.color}`} style={{ width: `${Math.min(100, count / Math.max(1, curriculumUnits.length) * 100)}%` }}/></div>
                <p className="mt-2 text-[11px] text-slate-400">{count ? 'Recorded practice in this browser' : 'No completed activity recorded yet'}</p>
              </div>;
            })}
          </div>
          <p className="mt-4 text-xs leading-5 text-slate-400">Tiến độ Deep Practice hiện được lưu trên trình duyệt đang sử dụng; chưa đồng bộ giữa các thiết bị hoặc tài khoản. Các đánh giá AI và lịch sử học cũ vẫn được giữ nguyên.</p>
          <button onClick={()=>setSection('learn')} className={`mt-7 rounded-2xl px-5 py-3 text-sm font-bold text-white ${track.color}`}>Continue your lesson</button>
        </section>}
        <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-slate-200 bg-white/95 px-2 py-2 backdrop-blur lg:hidden">{([{id:'today',label:'Today',icon:Target},{id:'tutor',label:'Tutor',icon:MessageCircle},{id:'learn',label:'Learn',icon:BookOpen},{id:'progress',label:'Progress',icon:TrendingUp}] as const).map(item=><button key={item.id} onClick={()=>setSection(item.id)} className={`flex flex-col items-center gap-1 rounded-xl py-2 text-[10px] font-bold ${section===item.id?track.ink:'text-slate-400'}`}><item.icon size={19}/>{item.label}</button>)}</nav>
      </main>
    </div>
    <footer className="pb-24 pt-8 text-center text-[11px] text-slate-400">BENENGLISH AI · BUILT AROUND REAL LEARNING, REAL VOICES AND REAL PROGRESS</footer>
  </div>;
}
