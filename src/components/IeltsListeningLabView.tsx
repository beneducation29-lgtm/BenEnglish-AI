import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { IELTS_LISTENING_MOCK_01, IELTSPart, IELTSQuestion } from '../data/ieltsListeningMockTest';
import { Headphones, Play, Pause, RotateCcw, CheckCircle2, Clock3, Mic, BookOpen, Volume2, Lock, ArrowLeft, ArrowRight } from 'lucide-react';

type Mode = 'home' | 'track_lesson' | 'test' | 'result' | 'review' | 'adaptive' | 'shadow' | 'dictation';
type SavedTest = { id: string; date: string; correct: number; total: number; band: number; partScores: number[]; answers: Record<number,string> };
type SavedShadow = { id: string; date: string; partId: number; transcriptMatch: number; target: string; recognised: string };
const STORAGE_VERSION = 'v2';
const bandFor = (score: number) => score >= 39 ? 9 : score >= 37 ? 8.5 : score >= 35 ? 8 : score >= 32 ? 7.5 : score >= 30 ? 7 : score >= 26 ? 6.5 : score >= 23 ? 6 : score >= 18 ? 5.5 : score >= 16 ? 5 : score >= 13 ? 4.5 : score >= 10 ? 4 : score >= 8 ? 3.5 : score >= 6 ? 3 : score >= 4 ? 2.5 : score >= 2 ? 2 : 1;
const normalise = (value: string) => value.toLowerCase().trim().replace(/&/g, 'and').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ');
const acceptedAnswers = (q: IELTSQuestion) => [q.answer, ...(q.accepted || [])].map(normalise);

const LISTENING_SOURCES = [
  { id:'bc', name:'British Council LearnEnglish', kind:'Graded listening', levels:'A1–C1', description:'Free recorded listening activities with speakers from different countries and comprehension exercises.', url:'https://learnenglish.britishcouncil.org/free-resources/listening', tracks:['high_school','professional'] },
  { id:'voa', name:'VOA Learning English', kind:'Audio & video', levels:'A1–B2', description:'Human-presented news and learning programmes, often with transcripts and a slower delivery pace.', url:'https://learningenglish.voanews.com/', tracks:['high_school','professional'] },
  { id:'elllo', name:'ELLLO', kind:'Real conversations', levels:'A1–C1', description:'Conversations with speakers from many countries, with audio, transcripts and quizzes.', url:'https://elllo.org/', tracks:['high_school','professional'] },
  { id:'bbc', name:'BBC Learning English', kind:'Lessons & podcasts', levels:'A2–C1', description:'British English videos, interviews and short listening programmes.', url:'https://www.bbc.co.uk/learningenglish', tracks:['high_school','professional'] },
  { id:'esllab', name:'Randall’s ESL Cyber Listening Lab', kind:'Listening quizzes', levels:'A1–C1', description:'Recorded everyday and academic conversations with comprehension questions.', url:'https://www.esl-lab.com/', tracks:['high_school','professional'] },
  { id:'ted', name:'TED Talks', kind:'Talks & presentations', levels:'B1–C2', description:'Real speakers on science, education, technology and business; many talks provide transcripts.', url:'https://www.ted.com/talks', tracks:['high_school','professional'] },
  { id:'bep', name:'Business English Pod', kind:'Workplace English', levels:'B1–C1', description:'Meetings, presentations, negotiations and workplace conversations; check each lesson for free access.', url:'https://www.businessenglishpod.com/', tracks:['professional'] },
  { id:'bbc-youtube', name:'BBC Learning English · YouTube', kind:'Video channel', levels:'A2–C1', description:'Teacher-led videos and natural examples with YouTube captions.', url:'https://www.youtube.com/@bbclearningenglish', tracks:['high_school','professional'] },
  { id:'voa-youtube', name:'VOA Learning English · YouTube', kind:'Video channel', levels:'A1–B2', description:'Human-presented English learning videos, news and everyday topics.', url:'https://www.youtube.com/@voalearningenglish', tracks:['high_school','professional'] },
];

const ListeningSourceHub: React.FC<{track:'high_school'|'professional'}> = ({track}) => {
  const [videoUrl,setVideoUrl] = useState(''); const [embedUrl,setEmbedUrl] = useState(''); const [error,setError] = useState('');
  const school = track === 'high_school';
  const sources = LISTENING_SOURCES.filter(source => source.tracks.includes(track));
  const loadVideo = (event: React.FormEvent) => {
    event.preventDefault();
    try { const url = new URL(videoUrl.trim()); const host = url.hostname.toLowerCase().replace('www.',''); let id = '';
      if (host === 'youtu.be') id = url.pathname.split('/').filter(Boolean)[0] || '';
      if (['youtube.com','m.youtube.com','youtube-nocookie.com'].includes(host)) { if (url.pathname === '/watch') id = url.searchParams.get('v') || ''; else if (/^\\/(embed|shorts)\\//.test(url.pathname)) id = url.pathname.split('/')[2] || ''; }
      if (!/^[a-zA-Z0-9_-]{11}$/.test(id)) throw new Error('invalid');
      setEmbedUrl('https://www.youtube-nocookie.com/embed/' + id); setError('');
    } catch { setEmbedUrl(''); setError('Link YouTube chưa hợp lệ hoặc video không cho phép nhúng.'); }
  };
  return <section className={'mb-6 rounded-3xl border bg-white p-5 md:p-7 ' + (school?'border-sky-200':'border-violet-200')}>
    <div className='flex flex-wrap items-start justify-between gap-3'><div><div className={'text-xs font-extrabold tracking-widest ' + (school?'text-sky-700':'text-violet-700')}>AUTHENTIC LISTENING · REAL SPEAKERS</div>
      <h2 className='mt-1 text-2xl font-extrabold text-slate-900'>Nghe tiếng Anh từ nguồn thật</h2>
      <p className='mt-2 max-w-3xl text-sm leading-6 text-slate-600'>Audio và video được phát từ website hoặc kênh gốc — không dùng giọng đọc AI/TTS của BenEnglish. Chọn nguồn theo trình độ, nghe giọng người thật và mở transcript/phụ đề tại nguồn.</p></div>
      <span className={'rounded-full px-3 py-1 text-xs font-bold ' + (school?'bg-sky-50 text-sky-800':'bg-violet-50 text-violet-800')}>{school?'HIGH SCHOOL':'PROFESSIONAL'}</span></div>
    <div className='mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3'>{sources.map(source => <a key={source.id} href={source.url} target='_blank' rel='noreferrer' className='rounded-2xl border border-slate-200 p-4 transition hover:border-slate-400 hover:shadow-sm'>
      <div className='flex items-center justify-between gap-2'><span className='text-sm font-bold text-slate-900'>{source.name}</span><ExternalLink size={15} className='shrink-0 text-slate-400'/></div>
      <div className={'mt-2 text-[10px] font-extrabold uppercase tracking-wider ' + (school?'text-sky-700':'text-violet-700')}>{source.kind} · {source.levels}</div><p className='mt-2 text-xs leading-5 text-slate-600'>{source.description}</p></a>)}</div>
    <div className='mt-6 rounded-2xl bg-slate-50 p-4 md:p-5'><div className='flex items-center gap-2'><Play size={17}/><h3 className='font-bold text-slate-900'>Phát video YouTube ngay trong Listening</h3></div>
      <p className='mt-1 text-xs text-slate-500'>Dán link video bạn chọn. BenEnglish chỉ nhúng trình phát chính thức, không tải hoặc lưu video.</p>
      <form onSubmit={loadVideo} className='mt-3 flex flex-col gap-2 sm:flex-row'><input value={videoUrl} onChange={e=>setVideoUrl(e.target.value)} placeholder='https://www.youtube.com/watch?v=...' className='min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm'/><button className={'rounded-xl px-5 py-3 text-sm font-bold text-white ' + (school?'bg-sky-700':'bg-violet-700')}>Load video</button></form>
      {error&&<p role='alert' className='mt-2 text-xs text-rose-600'>{error}</p>}{embedUrl&&<div className='mt-4 aspect-video max-w-4xl overflow-hidden rounded-2xl bg-black'><iframe src={embedUrl} title='Authentic English listening video from YouTube' className='h-full w-full' allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share' referrerPolicy='strict-origin-when-cross-origin' allowFullScreen/></div>}</div>
    <p className='mt-4 text-[11px] leading-5 text-slate-500'>Nội dung vẫn thuộc chủ sở hữu nguồn. App chỉ liên kết hoặc nhúng theo cơ chế chính thức; không sao chép audio, transcript hay phụ đề nếu chưa có quyền. Miễn phí truy cập không đồng nghĩa được phép tái phân phối.</p>
  </section>;
};

export const ListeningLabView: React.FC = () => {
  const { user, allListeningLessons, recordListeningPlay, recordComprehensionAttempt, addListeningSeconds } = useApp();
  const storageKey = `benenglish_ielts_listening_${STORAGE_VERSION}_${(user.email || 'guest').toLowerCase()}`;
  const [mode, setMode] = useState<Mode>('home');
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [lessonAnswers, setLessonAnswers] = useState<Record<number,string>>({});
  const [lessonSubmitted, setLessonSubmitted] = useState(false);
  const [isTrackAudioPlaying, setIsTrackAudioPlaying] = useState(false);
  const [activePart, setActivePart] = useState(1);
  const [answers, setAnswers] = useState<Record<number,string>>({});
  const [played, setPlayed] = useState<number[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(30 * 60);
  const [tests, setTests] = useState<SavedTest[]>(() => { try { return JSON.parse(localStorage.getItem(storageKey) || '{"tests":[]}').tests || []; } catch { return []; } });
  const [shadows, setShadows] = useState<SavedShadow[]>(() => { try { return JSON.parse(localStorage.getItem(storageKey) || '{"shadows":[]}').shadows || []; } catch { return []; } });
  const [shadowPart, setShadowPart] = useState(1);
  const [recording, setRecording] = useState(false);
  const [recognised, setRecognised] = useState('');
  const [shadowMessage, setShadowMessage] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [activeTranscriptWord, setActiveTranscriptWord] = useState(-1);
  const [reviewAnswers, setReviewAnswers] = useState<Record<number,string>>({});
  const [reviewChecked, setReviewChecked] = useState<number[]>([]);
  const [adaptiveAnswers, setAdaptiveAnswers] = useState<Record<number,string>>({});
  const [adaptiveChecked, setAdaptiveChecked] = useState<number[]>([]);
  const [dictationPart, setDictationPart] = useState(1);
  const [dictationAnswers, setDictationAnswers] = useState<Record<number,string>>({});
  const [dictationChecked, setDictationChecked] = useState(false);
  const trackLessons = allListeningLessons.filter(lesson => lesson.track === user.track);
  const selectedLesson = trackLessons.find(lesson => lesson.id === selectedLessonId) || trackLessons[0];
  const lessonCorrectCount = selectedLesson?.comprehensionQuiz.filter((question,index) => normalise(lessonAnswers[index] || '') === normalise(question.correctAnswer)).length || 0;
  const parts = IELTS_LISTENING_MOCK_01;
  const part: IELTSPart = parts[activePart - 1];
  const shadow: IELTSPart = parts[shadowPart - 1];
  const dictation: IELTSPart = parts[dictationPart - 1];
  const dictationTokens = useMemo(() => dictation.transcript.match(/\b[\w'-]+\b/g) || [], [dictation.transcript]);
  const dictationTargets = useMemo(() => dictationTokens.map((word,index)=>({word,index})).filter(item => item.index % 6 === 2).slice(0,12), [dictationTokens]);
  const dictationCorrect = dictationTargets.filter(item => normalise(dictationAnswers[item.index] || '') === normalise(item.word)).length;
  const transcriptWords = useMemo(() => {
    const words: Array<{ text: string; start: number; end: number }> = [];
    const pattern = /\S+/g;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(shadow.transcript)) !== null) {
      words.push({ text: match[0], start: match.index, end: match.index + match[0].length });
    }
    return words;
  }, [shadow.transcript]);
  const allQuestions = useMemo(() => parts.flatMap(p => p.questions), [parts]);
  useEffect(() => {
    if (mode !== 'test' || submitted || secondsLeft <= 0) return;
    const timerId = window.setInterval(() => setSecondsLeft(value => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timerId);
  }, [mode, submitted, secondsLeft > 0]);
  const completedCount = tests.length;
  const saveRecords = (nextTests: SavedTest[], nextShadows: SavedShadow[]) => {
    setTests(nextTests); setShadows(nextShadows);
    localStorage.setItem(storageKey, JSON.stringify({ tests: nextTests, shadows: nextShadows }));
  };
  const speak = (_text: string, _rate = 1) => {
    setShadowMessage('BenEnglish không tạo giọng đọc tổng hợp. Hãy chọn một recording người thật trong thư viện Authentic Listening phía trên; transcript nội bộ chỉ dùng để ôn tập văn bản.');
  };
  const openTrackLesson = (lessonId: string) => {
    setSelectedLessonId(lessonId);
    setLessonAnswers({});
    setLessonSubmitted(false);
    setMode('track_lesson');
    recordListeningPlay(lessonId, 0);
  };
  const playTrackLesson = () => {
    setIsTrackAudioPlaying(false);
    setShadowMessage('Bài học mẫu này hiện chỉ có transcript, chưa có recording người thật được cấp phép. Hãy chọn nguồn audio/video thật ở thư viện phía trên.');
  };
  const submitTrackLesson = () => {
    if (!selectedLesson || lessonSubmitted) return;
    const score = Math.round(100 * lessonCorrectCount / Math.max(1, selectedLesson.comprehensionQuiz.length));
    recordComprehensionAttempt(selectedLesson.id, score);
    setLessonSubmitted(true);
  };
  const startTest = () => {
    window.speechSynthesis?.cancel();
    setAnswers({}); setPlayed([]); setSubmitted(false); setSecondsLeft(30 * 60); setActivePart(1); setMode('test');
  };
  const playPart = (partId: number) => {
    setShadowMessage('Bản mock IELTS này chưa có file recording người thật; không phát giọng tổng hợp và không tính là đã nghe. Hãy dùng nguồn Authentic Listening phía trên để luyện nghe thật.');
    setPlayed(current => current.filter(id => id !== partId));
  };
  const submitTest = () => {
    window.speechSynthesis?.cancel();
    const correct = allQuestions.filter(q => acceptedAnswers(q).includes(normalise(answers[q.id] || ''))).length;
    const partScores = parts.map(p => p.questions.filter(q => acceptedAnswers(q).includes(normalise(answers[q.id] || ''))).length);
    const record: SavedTest = { id: `test-${Date.now()}`, date: new Date().toISOString(), correct, total: 40, band: bandFor(correct), partScores, answers };
    saveRecords([record, ...tests].slice(0, 50), shadows);
    setSubmitted(true); setMode('result');
  };
  useEffect(() => {
    if (mode === 'test' && secondsLeft === 0 && !submitted) submitTest();
  }, [secondsLeft, mode, submitted]);
  const result = tests[0];
  useEffect(() => () => { window.speechSynthesis?.cancel(); }, []);
  const startShadowRecognition = () => {
    const w = window as any;
    const Recognition = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Recognition) { setShadowMessage('Trình duyệt chưa hỗ trợ nhận diện giọng nói. Bạn vẫn có thể nghe và luyện nhại thủ công.'); return; }
    const recognizer = new Recognition();
    recognizer.lang = 'en-US'; recognizer.continuous = true; recognizer.interimResults = true;
    recognizer.onresult = (event: any) => {
      let value = '';
      for (let i = 0; i < event.results.length; i++) value += event.results[i][0].transcript + ' ';
      setRecognised(value.trim());
    };
    recognizer.onerror = () => { setRecording(false); setShadowMessage('Không thể nhận diện giọng nói. Hãy kiểm tra quyền microphone.'); };
    recognizer.onend = () => setRecording(false);
    recognizer.start(); (window as any).__benListeningRecognizer = recognizer;
    setRecognised(''); setShadowMessage('Đang ghi nhận nội dung lời nói. Kết quả chỉ phản ánh độ trùng khớp văn bản, không phải điểm phát âm.'); setRecording(true);
  };
  const stopShadowRecognition = () => {
    try { (window as any).__benListeningRecognizer?.stop(); } catch {}
    setRecording(false);
    const target = shadow.transcript;
    const targetTokens = normalise(target).split(' ').filter(Boolean);
    const recognisedTokens = normalise(recognised).split(' ').filter(Boolean);
    const matched = targetTokens.filter(token => recognisedTokens.includes(token)).length;
    const match = Math.round(100 * matched / Math.max(1, targetTokens.length));
    const record: SavedShadow = { id: `shadow-${Date.now()}`, date: new Date().toISOString(), partId: shadowPart, transcriptMatch: match, target, recognised };
    saveRecords(tests, [record, ...shadows].slice(0, 100));
    setShadowMessage(`Độ trùng khớp văn bản ước tính: ${match}%. Đây không phải điểm IELTS hay điểm phát âm.`);
  };
  const currentTest = tests[0];
  const missedQuestions = currentTest ? allQuestions.filter(q => !acceptedAnswers(q).includes(normalise(currentTest.answers[q.id] || ''))) : [];
  const adaptiveQuestions = useMemo(() => {
    const missFrequency = new Map<number, number>();
    tests.slice(0, 10).forEach(test => allQuestions.forEach(q => {
      if (!acceptedAnswers(q).includes(normalise(test.answers[q.id] || ''))) {
        missFrequency.set(q.id, (missFrequency.get(q.id) || 0) + 1);
      }
    }));
    return allQuestions
      .filter(q => missFrequency.has(q.id))
      .sort((a, b) => (missFrequency.get(b.id) || 0) - (missFrequency.get(a.id) || 0) || a.id - b.id)
      .slice(0, 8);
  }, [tests, allQuestions]);
  const adaptiveCorrectCount = adaptiveQuestions.filter(q => adaptiveChecked.includes(q.id) && acceptedAnswers(q).includes(normalise(adaptiveAnswers[q.id] || ''))).length;
  const reviewCorrectCount = missedQuestions.filter(q => acceptedAnswers(q).includes(normalise(reviewAnswers[q.id] || ''))).length;
  const formatTime = (n: number) => `${Math.floor(n/60).toString().padStart(2,'0')}:${(n%60).toString().padStart(2,'0')}`;
  const transcriptSegments = shadow.transcript.split(/(\s+)/);
  let transcriptWordIndex = 0;

  return <div className="space-y-6 pb-12">\n    <ListeningSourceHub track={user.track} />
    <section className={`rounded-3xl bg-gradient-to-br ${user.track === 'high_school' ? 'from-sky-950 via-blue-900 to-cyan-950' : 'from-violet-950 via-purple-900 to-indigo-950'} p-7 md:p-9 text-white shadow-lg`}>
      <div className={`flex items-center gap-2 ${user.track === 'high_school' ? 'text-sky-300' : 'text-violet-300'} text-xs font-bold tracking-[.18em] uppercase`}><Headphones size={16}/> BenEnglish AI · {user.track === 'high_school' ? 'School Listening Studio' : 'Professional Listening Studio'}</div>
      <div className="mt-4 flex flex-col md:flex-row md:items-end md:justify-between gap-5">
        <div><h1 className="text-3xl md:text-4xl font-bold">{user.track === 'high_school' ? 'Listen, understand & learn' : 'Listen for workplace impact'}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">{user.track === 'high_school' ? `Bài nghe theo chủ đề học đường, môi trường, khoa học và đời sống học sinh · ${user.grade || 'Grade 11'} · ${user.cefrLevel}` : `Bài nghe công sở, cuộc họp, dự án và giao tiếp chuyên ngành · ${user.occupation || 'Professional'} · ${user.cefrLevel}`}</p></div>
        <div className="grid grid-cols-2 gap-3 text-center"><div className="rounded-2xl bg-white/10 px-5 py-3"><div className="text-2xl font-bold">{completedCount}</div><div className="text-[11px] text-slate-300">Bài test đã làm</div></div><div className="rounded-2xl bg-white/10 px-5 py-3"><div className="text-2xl font-bold">{shadows.length}</div><div className="text-[11px] text-slate-300">Lần shadowing</div></div></div>
      </div>
    </section>

    {mode === 'home' && <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><div className={`text-xs font-extrabold tracking-widest ${user.track === 'high_school' ? 'text-sky-700' : 'text-violet-700'}`}>{user.track === 'high_school' ? 'HIGH SCHOOL CURRICULUM' : 'PROFESSIONAL ENGLISH CURRICULUM'}</div><h2 className="mt-1 text-2xl font-bold text-slate-900">{user.track === 'high_school' ? 'School-topic listening library' : 'Workplace listening library'}</h2><p className="mt-1 text-sm text-slate-600">{user.track === 'high_school' ? 'Luyện nghe về trường học, tuổi trẻ, môi trường, khoa học và các chủ đề phổ thông.' : `Luyện nghe tình huống công việc, họp nhóm và ngôn ngữ theo lĩnh vực ${user.occupation || 'của bạn'}.`}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{trackLessons.length} bài học</span></div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{trackLessons.slice(0,9).map(lesson=><button key={lesson.id} onClick={()=>openTrackLesson(lesson.id)} className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${user.track === 'high_school' ? 'border-sky-100 hover:border-sky-300' : 'border-violet-100 hover:border-violet-300'}`}><div className="flex items-center justify-between gap-2"><span className={`text-[10px] font-extrabold uppercase tracking-wider ${user.track === 'high_school' ? 'text-sky-700' : 'text-violet-700'}`}>{lesson.category}</span><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold">{lesson.level}</span></div><h3 className="mt-3 font-bold text-slate-900">{lesson.title}</h3><p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-600">{lesson.summary}</p><div className="mt-4 flex items-center justify-between text-xs font-semibold text-slate-500"><span>{lesson.durationMinutes} phút · {lesson.comprehensionQuiz.length} câu hỏi</span><span className={user.track === 'high_school' ? 'text-sky-700' : 'text-violet-700'}>Mở bài <ArrowRightIcon/></span></div></button>)}</div>
        {trackLessons.length === 0 && <p className="mt-4 text-sm text-slate-500">Chưa có bài nghe cho lộ trình này.</p>}
      </section>
      <div className="grid lg:grid-cols-3 gap-5">
      <button onClick={startTest} className="lg:col-span-2 text-left rounded-3xl bg-white border border-slate-200 p-7 hover:border-emerald-400 hover:shadow-md transition">
        <div className="flex items-center justify-between"><span className="rounded-full bg-emerald-50 text-emerald-700 px-3 py-1 text-xs font-bold">MOCK TEST 01 · ORIGINAL CONTENT</span><Headphones className="text-emerald-600"/></div>
        <h2 className="mt-5 text-2xl font-bold">IELTS Listening Full Test</h2><p className="mt-2 text-sm text-slate-600">4 recordings · 40 questions · 30 minutes · one playback per part</p>
        <div className="mt-6 grid grid-cols-4 gap-2">{parts.map(p=><div key={p.id} className="rounded-xl bg-slate-50 p-3"><div className="text-xs font-bold text-emerald-700">PART {p.id}</div><div className="mt-1 text-xs text-slate-500">{p.context}</div><div className="mt-2 text-xs font-semibold">10 câu</div></div>)}</div>
        <div className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white">Bắt đầu bài thi <ArrowRightIcon/></div>
      </button>
      <div className="rounded-3xl bg-white border border-slate-200 p-6">
        <div className="flex items-center gap-2 text-violet-700"><Mic size={18}/><span className="font-bold">Listening Shadowing</span></div>
        <h2 className="mt-4 text-xl font-bold">Nghe – nhại – đối chiếu</h2><p className="mt-2 text-sm text-slate-600 leading-6">Nghe lại không giới hạn, xem transcript, tự thu âm và xem độ trùng khớp văn bản nhận diện.</p>
        <button onClick={()=>{setShadowPart(1);setRecognised('');setShadowMessage('');setShowTranscript(false);setMode('shadow');}} className="mt-6 w-full rounded-xl bg-violet-600 px-4 py-3 text-sm font-bold text-white">Mở phòng Shadowing</button>
        <p className="mt-3 text-xs text-slate-400">Không quy đổi shadowing thành IELTS band hoặc điểm phát âm.</p>
      </div>
      <div className="rounded-3xl border border-cyan-100 bg-cyan-50 p-6">
        <div className="flex items-center gap-2 text-cyan-800"><BookOpen size={18}/><span className="font-bold">Listening Dictation</span></div>
        <h2 className="mt-4 text-xl font-bold">Nghe và điền từ còn thiếu</h2><p className="mt-2 text-sm leading-6 text-slate-600">Luyện nhận diện từ khóa, dạng số, tên riêng và chính tả bằng transcript của từng Part.</p>
        <button onClick={()=>{setDictationPart(1);setDictationAnswers({});setDictationChecked(false);setMode('dictation');}} className="mt-6 w-full rounded-xl bg-cyan-700 px-4 py-3 text-sm font-bold text-white">Bắt đầu Dictation</button>
      </div>
      <div className="lg:col-span-3 rounded-3xl border border-indigo-100 bg-indigo-50 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><div className="text-xs font-bold tracking-widest text-indigo-700">ADAPTIVE LISTENING</div><h3 className="mt-1 font-bold text-slate-900">Luyện theo lỗi thường gặp</h3><p className="mt-1 text-sm text-slate-600">Tổng hợp tối đa 10 bài gần nhất, ưu tiên dạng câu hỏi bạn thường trả lời sai. Lượt luyện này không thay đổi điểm thi hay lịch sử cũ.</p><p className="mt-2 text-xs font-semibold text-indigo-700">{adaptiveQuestions.length ? `${adaptiveQuestions.length} câu được chọn từ lịch sử của bạn` : 'Hoàn thành một bài test để mở luyện tập thích ứng.'}</p></div>
          <button disabled={!adaptiveQuestions.length} onClick={()=>{setAdaptiveAnswers({});setAdaptiveChecked([]);setMode('adaptive');}} className="shrink-0 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300">Bắt đầu luyện thích ứng</button>
        </div>
      </div>
      <div className="lg:col-span-3 rounded-3xl bg-white border border-slate-200 p-6">
        <h3 className="font-bold text-slate-900">Lịch sử IELTS Listening</h3>
        {tests.length===0 ? <p className="mt-3 text-sm text-slate-500">Bạn chưa hoàn thành bài test nào.</p> : <div className="mt-4 space-y-2">{tests.slice(0,5).map(t=><div key={t.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm"><span>{new Date(t.date).toLocaleString('vi-VN')}</span><span className="font-semibold">{t.correct}/40 · Band tham khảo {t.band.toFixed(1)}</span></div>)}</div>}
      </div>
      </div>
    </div>}

    {mode === 'track_lesson' && selectedLesson && <section className="rounded-3xl border border-slate-200 bg-white p-6 md:p-8">
      <button onClick={()=>{window.speechSynthesis?.cancel();setIsTrackAudioPlaying(false);setMode('home');}} className="text-sm font-semibold text-slate-500">← Quay lại thư viện nghe</button>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-3"><div><div className={`text-xs font-extrabold tracking-widest ${user.track === 'high_school' ? 'text-sky-700' : 'text-violet-700'}`}>{selectedLesson.category} · {selectedLesson.level}</div><h2 className="mt-1 text-2xl font-bold text-slate-900">{selectedLesson.title}</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{selectedLesson.summary}</p></div><span className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold">{selectedLesson.durationMinutes} phút</span></div>
      {selectedLesson.learningObjectives?.length ? <div className="mt-5 rounded-2xl bg-slate-50 p-4"><b className="text-sm">Mục tiêu bài học</b><ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-600">{selectedLesson.learningObjectives.map(item=><li key={item}>{item}</li>)}</ul></div> : null}
      <div className={`mt-5 rounded-2xl p-4 ${user.track === 'high_school' ? 'bg-sky-50' : 'bg-violet-50'}`}><div className="flex flex-wrap items-center justify-between gap-3"><div><b className="text-sm text-slate-900">Nghe bài học</b><p className="mt-1 text-xs text-slate-600">Audio được đọc từ script bài học bằng giọng đọc của trình duyệt.</p></div><button onClick={isTrackAudioPlaying ? ()=>{window.speechSynthesis?.cancel();setIsTrackAudioPlaying(false);} : playTrackLesson} className={`rounded-xl px-4 py-2.5 text-sm font-bold text-white ${user.track === 'high_school' ? 'bg-sky-600' : 'bg-violet-600'}`}>{isTrackAudioPlaying ? 'Dừng audio' : '▶ Phát bài nghe'}</button></div></div>
      <details className="mt-4 rounded-2xl border border-slate-200 p-4"><summary className="cursor-pointer text-sm font-bold">Xem transcript song ngữ</summary><div className="mt-3 space-y-3">{selectedLesson.sentences.map(sentence=><div key={sentence.id} className="border-b border-slate-100 pb-3 last:border-0"><p className="text-sm font-semibold text-slate-800">{sentence.textEn}</p><p className="mt-1 text-xs text-slate-500">{sentence.textVi}</p>{sentence.phoneticFocus && <p className="mt-1 text-[11px] text-slate-400">Pronunciation: {sentence.phoneticFocus}</p>}</div>)}</div></details>
      <div className="mt-6"><h3 className="text-lg font-bold text-slate-900">Kiểm tra khả năng nghe hiểu</h3><p className="mt-1 text-xs text-slate-500">Trả lời dựa trên nội dung audio, sau đó kiểm tra và xem giải thích.</p><div className="mt-4 space-y-4">{selectedLesson.comprehensionQuiz.map((question,index)=><div key={question.id || index} className="rounded-2xl border border-slate-200 p-4"><p className="text-sm font-semibold text-slate-800">{index+1}. {question.question}</p>{question.options?.length ? <div className="mt-3 grid gap-2 sm:grid-cols-2">{question.options.map(option=><button key={option} disabled={lessonSubmitted} onClick={()=>setLessonAnswers(v=>({...v,[index]:option}))} className={`rounded-xl border p-3 text-left text-xs ${lessonAnswers[index]===option?'border-slate-800 bg-slate-100 font-bold':'border-slate-200 hover:bg-slate-50'}`}>{option}</button>)}</div> : <input disabled={lessonSubmitted} value={lessonAnswers[index]||''} onChange={e=>setLessonAnswers(v=>({...v,[index]:e.target.value}))} className="mt-3 w-full rounded-xl border border-slate-300 p-3 text-sm" placeholder="Nhập câu trả lời..."/>}{lessonSubmitted && <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs"><b>Đáp án: {question.correctAnswer}</b><p className="mt-1 text-slate-600">{question.explanationVi}</p></div>}</div>)}</div><div className="mt-5 flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-slate-500">{lessonSubmitted ? `Kết quả: ${lessonCorrectCount}/${selectedLesson.comprehensionQuiz.length} câu đúng` : `${Object.keys(lessonAnswers).length}/${selectedLesson.comprehensionQuiz.length} câu đã trả lời`}</span><button disabled={lessonSubmitted || Object.keys(lessonAnswers).length !== selectedLesson.comprehensionQuiz.length} onClick={submitTrackLesson} className={`rounded-xl px-5 py-3 text-sm font-bold text-white disabled:opacity-40 ${user.track === 'high_school' ? 'bg-sky-600' : 'bg-violet-600'}`}>{lessonSubmitted ? 'Đã lưu kết quả' : 'Kiểm tra đáp án'}</button></div></div>
    </section>}

    {mode === 'test' && <section className="rounded-3xl bg-white border border-slate-200 p-5 md:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><div className="text-xs font-bold tracking-widest text-emerald-700">IELTS LISTENING MOCK TEST 01</div><h2 className="mt-1 text-2xl font-bold">Part {activePart}: {part.title}</h2><p className="text-sm text-slate-500">{part.context} · {part.speaker}</p></div><div className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold"><Clock3 size={16}/>{formatTime(secondsLeft)} <span className="text-[10px] text-slate-400">(30 phút)</span></div></div>
      <div className="mt-5 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-emerald-500" style={{width:`${activePart*25}%`}}/></div>
      <div className="mt-5 flex flex-wrap gap-2">{parts.map(p=><button key={p.id} onClick={()=>setActivePart(p.id)} className={`rounded-xl px-4 py-2 text-xs font-bold ${activePart===p.id?'bg-slate-900 text-white':'bg-slate-100 text-slate-600'}`}>Part {p.id} · Q{p.questions[0].id}–{p.questions[9].id}</button>)}</div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4"><div className="text-sm"><b>Audio recording</b><p className="text-xs text-slate-600 mt-1">Phát một lần trong chế độ thi. Nội dung giọng đọc được tổng hợp từ script gốc.</p></div><button disabled={played.includes(activePart)} onClick={()=>playPart(activePart)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white disabled:bg-slate-300"><Play size={16}/>{played.includes(activePart)?'Đã phát':'Phát recording'}</button></div>
      <div className="mt-6 space-y-4">{part.questions.map(q=><div key={q.id} className="rounded-2xl border border-slate-200 p-4"><div className="text-xs font-bold text-emerald-700">QUESTION {q.id}</div><p className="mt-1 font-semibold text-slate-800">{q.prompt}</p>{q.options ? <div className="mt-3 grid sm:grid-cols-3 gap-2">{q.options.map(option=><button key={option} onClick={()=>setAnswers(v=>({...v,[q.id]:option}))} className={`rounded-xl border px-3 py-2 text-sm text-left ${answers[q.id]===option?'border-emerald-500 bg-emerald-50 text-emerald-800':'border-slate-200 hover:bg-slate-50'}`}>{option}</button>)}</div> : <input value={answers[q.id]||''} onChange={e=>setAnswers(v=>({...v,[q.id]:e.target.value}))} placeholder="Your answer..." className="mt-3 w-full max-w-xl rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500"/>}</div>)}</div>
      <div className="mt-6 flex flex-wrap justify-between gap-3"><button onClick={()=>setMode('home')} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold">Thoát bài thi</button><div className="flex gap-2">{activePart>1&&<button onClick={()=>setActivePart(v=>v-1)} className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold">Part trước</button>}{activePart<4?<button onClick={()=>setActivePart(v=>v+1)} className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white">Part tiếp theo</button>:<button onClick={submitTest} className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white">Nộp bài & xem kết quả</button>}</div></div>
      <p className="mt-3 text-xs text-slate-400">Đã điền {Object.values(answers).filter(Boolean).length}/40 câu · Bạn có thể chuyển Part để rà soát trước khi nộp.</p>
    </section>}

    {mode === 'result' && currentTest && <section className="space-y-5">
      <div className="rounded-3xl bg-white border border-slate-200 p-7"><div className="text-xs font-bold tracking-widest text-emerald-700">TEST REPORT</div><h2 className="mt-2 text-3xl font-bold">Kết quả IELTS Listening</h2><div className="mt-6 grid sm:grid-cols-3 gap-3"><div className="rounded-2xl bg-slate-950 p-5 text-white"><div className="text-sm text-slate-300">Raw score</div><div className="mt-1 text-4xl font-bold">{currentTest.correct}<span className="text-lg text-slate-400">/40</span></div></div><div className="rounded-2xl bg-emerald-50 p-5"><div className="text-sm text-emerald-800">Estimated band</div><div className="mt-1 text-4xl font-bold text-emerald-800">{currentTest.band.toFixed(1)}</div></div><div className="rounded-2xl bg-slate-100 p-5"><div className="text-sm text-slate-600">Accuracy</div><div className="mt-1 text-4xl font-bold">{Math.round(currentTest.correct/40*100)}%</div></div></div><p className="mt-4 text-xs text-amber-700">Band chỉ mang tính tham khảo. Ngưỡng quy đổi có thể thay đổi theo từng phiên bản đề; đây không phải kết quả IELTS chính thức.</p>
        <div className="mt-6 grid sm:grid-cols-4 gap-3">{currentTest.partScores.map((score,i)=><div key={i} className="rounded-xl border border-slate-200 p-4"><div className="text-xs text-slate-500">Part {i+1}</div><div className="mt-1 text-2xl font-bold">{score}/10</div></div>)}</div>
      </div>
      <div className="rounded-3xl bg-white border border-slate-200 p-6"><h3 className="text-xl font-bold">Phân tích lỗi & bằng chứng transcript</h3>{(() => {
          const missed = allQuestions.filter(q => !acceptedAnswers(q).includes(normalise(currentTest.answers[q.id] || '')));
          const grouped = missed.reduce<Record<string, number>>((acc, q) => { acc[q.focus] = (acc[q.focus] || 0) + 1; return acc; }, {});
          const priorities = Object.entries(grouped).sort((a, b) => b[1] - a[1]).slice(0, 3);
          return <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <h4 className="font-bold text-amber-950">Ưu tiên ôn tập cá nhân</h4>
            <p className="mt-1 text-xs text-amber-800">Các nhóm kỹ năng có nhiều câu sai nhất trong bài vừa làm:</p>
            {priorities.length ? <div className="mt-3 grid sm:grid-cols-3 gap-2">{priorities.map(([focus, count]) => <div key={focus} className="rounded-xl bg-white p-3"><div className="text-sm font-semibold text-slate-800">{focus}</div><div className="mt-1 text-xs text-amber-700">{count} câu cần củng cố</div></div>)}</div> : <p className="mt-2 text-sm text-emerald-700">Không phát hiện nhóm lỗi — hãy thử đề khó hơn để kiểm tra độ ổn định.</p>}
            <p className="mt-3 text-xs text-amber-800">Gợi ý: nghe lại Part chứa câu sai, ghi chú từ khóa và cách diễn đạt tương đương trước khi làm đề tiếp theo.</p>
          </div>;
        })()}
        <div className="mt-4 space-y-3">{allQuestions.filter(q=>!acceptedAnswers(q).includes(normalise(currentTest.answers[q.id]||''))).map(q=><div key={q.id} className="rounded-xl bg-rose-50 p-4"><div className="text-xs font-bold text-rose-700">Q{q.id} · {q.focus}</div><p className="mt-1 text-sm font-semibold">{q.prompt}</p><p className="mt-1 text-sm">Bạn trả lời: <b>{currentTest.answers[q.id]||'Chưa trả lời'}</b> · Đáp án: <b>{q.answer}</b></p><p className="mt-2 text-xs text-slate-600">Bằng chứng: “{q.evidence}”</p><p className="mt-1 text-xs text-slate-600">{q.explanation}</p></div>)}{currentTest.correct===40&&<p className="text-sm text-emerald-700">Xuất sắc! Bạn trả lời đúng toàn bộ câu hỏi.</p>}</div></div>
      <div className="flex flex-wrap gap-3"><button onClick={()=>{setMode('home');setActivePart(1);}} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold">Về trang chính</button>{missedQuestions.length>0&&<button onClick={()=>{setReviewAnswers({});setReviewChecked([]);setMode('review');}} className="rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-white">Luyện lại {missedQuestions.length} câu sai</button>}<button onClick={startTest} className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white">Làm lại bài test</button></div>
    </section>}

    {mode === 'review' && currentTest && <section className="rounded-3xl bg-white border border-slate-200 p-5 md:p-7"><button onClick={()=>setMode('result')} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500"><ArrowLeft size={16}/> Quay lại kết quả</button><div className="mt-4"><div className="text-xs font-bold tracking-widest text-amber-700">PERSONAL ERROR REVIEW</div><h2 className="mt-1 text-2xl font-bold">Luyện lại câu hỏi còn sai</h2><p className="mt-2 text-sm text-slate-600">Bộ câu hỏi được lấy từ những câu bạn trả lời sai hoặc bỏ trống ở bài vừa làm. Hãy thử trả lời lại trước khi xem giải thích.</p></div><div className="mt-5 flex items-center justify-between rounded-2xl bg-amber-50 p-4"><span className="text-sm font-semibold text-amber-900">Đã trả lời đúng trong lượt ôn</span><b className="text-xl text-amber-900">{reviewCorrectCount}/{missedQuestions.length}</b></div><div className="mt-5 space-y-4">{missedQuestions.map(q=>{const correct=acceptedAnswers(q).includes(normalise(reviewAnswers[q.id]||''));const checked=reviewChecked.includes(q.id);return <div key={q.id} className="rounded-2xl border border-slate-200 p-4"><div className="text-xs font-bold text-amber-700">QUESTION {q.id} · {q.focus}</div><p className="mt-1 font-semibold text-slate-800">{q.prompt}</p><input value={reviewAnswers[q.id]||''} onChange={e=>{setReviewAnswers(v=>({...v,[q.id]:e.target.value}));setReviewChecked(v=>v.filter(id=>id!==q.id));}} placeholder="Nhập câu trả lời của bạn..." className="mt-3 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-amber-500"/><div className="mt-3 flex flex-wrap items-center gap-2"><button onClick={()=>setReviewChecked(v=>v.includes(q.id)?v:[...v,q.id])} disabled={!reviewAnswers[q.id]?.trim()} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-40">Kiểm tra</button>{checked&&<span className={`text-sm font-bold ${correct?'text-emerald-700':'text-rose-700'}`}>{correct?'Chính xác!':'Chưa chính xác – hãy xem gợi ý bên dưới.'}</span>}</div>{checked&&<div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm"><p><b>Đáp án:</b> {q.answer}</p><p className="mt-1 text-slate-600">{q.explanation}</p><p className="mt-2 text-xs text-slate-500">Bằng chứng: “{q.evidence}”</p></div>}</div>;})}</div><div className="mt-6 flex flex-wrap justify-between gap-3"><button onClick={()=>setMode('result')} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold">Xem lại báo cáo</button><button onClick={()=>{setReviewAnswers({});setReviewChecked([]);}} className="rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-white">Làm lại lượt ôn</button></div></section>}

    {mode === 'adaptive' && <section className="rounded-3xl bg-white border border-slate-200 p-5 md:p-7"><button onClick={()=>setMode('home')} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500"><ArrowLeft size={16}/> Quay lại Listening</button><div className="mt-4"><div className="text-xs font-bold tracking-widest text-indigo-700">ADAPTIVE PRACTICE · RECENT 10 TESTS</div><h2 className="mt-1 text-2xl font-bold">Luyện đúng điểm còn yếu</h2><p className="mt-2 text-sm text-slate-600">Các câu dưới đây được ưu tiên theo tần suất sai trong tối đa 10 bài gần nhất. Hãy tự trả lời trước khi kiểm tra.</p></div><div className="mt-5 flex items-center justify-between rounded-2xl bg-indigo-50 p-4"><span className="text-sm font-semibold text-indigo-900">Số câu đúng đã kiểm tra</span><b className="text-xl text-indigo-900">{adaptiveCorrectCount}/{adaptiveChecked.length}</b></div><div className="mt-5 space-y-4">{adaptiveQuestions.map(q=>{const correct=acceptedAnswers(q).includes(normalise(adaptiveAnswers[q.id]||''));const checked=adaptiveChecked.includes(q.id);const frequency=tests.slice(0,10).filter(test=>!acceptedAnswers(q).includes(normalise(test.answers[q.id]||''))).length;return <div key={q.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div className="text-xs font-bold text-indigo-700">QUESTION {q.id} · {q.focus}</div><span className="rounded-full bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-700">Sai {frequency}/{Math.min(tests.length,10)} bài gần nhất</span></div><p className="mt-2 font-semibold text-slate-800">{q.prompt}</p><input value={adaptiveAnswers[q.id]||''} onChange={e=>{setAdaptiveAnswers(v=>({...v,[q.id]:e.target.value}));setAdaptiveChecked(v=>v.filter(id=>id!==q.id));}} placeholder="Nhập câu trả lời..." className="mt-3 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500"/><div className="mt-3 flex flex-wrap items-center gap-2"><button onClick={()=>setAdaptiveChecked(v=>v.includes(q.id)?v:[...v,q.id])} disabled={!adaptiveAnswers[q.id]?.trim()} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-40">Kiểm tra</button>{checked&&<span className={`text-sm font-bold ${correct?'text-emerald-700':'text-rose-700'}`}>{correct?'Chính xác!':'Chưa chính xác – xem đáp án và giải thích.'}</span>}</div>{checked&&<div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm"><p><b>Đáp án:</b> {q.answer}</p><p className="mt-1 text-slate-600">{q.explanation}</p><p className="mt-2 text-xs text-slate-500">Bằng chứng transcript: “{q.evidence}”</p></div>}</div>;})}</div><div className="mt-6 flex flex-wrap justify-between gap-3"><button onClick={()=>setMode('home')} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold">Kết thúc lượt luyện</button><button onClick={()=>{setAdaptiveAnswers({});setAdaptiveChecked([]);}} className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white">Làm lại lượt luyện</button></div><p className="mt-3 text-xs text-slate-500">Kết quả lượt luyện hiện chỉ dùng trong phiên này; không ghi đè bài thi, điểm band hoặc lịch sử học tập.</p></section>}

    {mode === 'dictation' && <section className="rounded-3xl bg-white border border-slate-200 p-5 md:p-7"><button onClick={()=>setMode('home')} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500"><ArrowLeft size={16}/> Quay lại Listening</button><div className="mt-4"><div className="text-xs font-bold tracking-widest text-cyan-700">LISTENING DICTATION</div><h2 className="mt-1 text-2xl font-bold">Nghe và điền từ còn thiếu</h2><p className="mt-2 text-sm text-slate-600">Nghe đoạn hội thoại/bài nói, sau đó điền những từ bị khuyết. Transcript đầy đủ chỉ xuất hiện sau khi bạn kiểm tra.</p></div><div className="mt-5 flex flex-wrap items-center justify-between gap-3"><select value={dictationPart} onChange={e=>{setDictationPart(Number(e.target.value));setDictationAnswers({});setDictationChecked(false);}} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">{parts.map(p=><option key={p.id} value={p.id}>Part {p.id}: {p.title}</option>)}</select><button onClick={()=>speak(dictation.transcript,0.9)} className="inline-flex items-center gap-2 rounded-xl bg-cyan-700 px-4 py-3 text-sm font-bold text-white"><Play size={16}/>Nghe recording</button></div><div className="mt-5 rounded-2xl border border-slate-200 p-4"><div className="flex items-center justify-between gap-2"><b className="text-sm">Điền {dictationTargets.length} từ còn thiếu</b><span className="text-xs text-slate-500">{dictation.context}</span></div><div className="mt-4 space-y-3">{dictationTargets.map((item,index)=>{const correct=normalise(dictationAnswers[item.index]||'')===normalise(item.word);return <div key={item.index} className="grid grid-cols-[36px_1fr] items-center gap-3"><span className="text-xs font-bold text-cyan-700">{index+1}.</span><div><input value={dictationAnswers[item.index]||''} onChange={e=>{setDictationAnswers(v=>({...v,[item.index]:e.target.value}));setDictationChecked(false);}} placeholder="Nghe và nhập từ..." className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-600"/>{dictationChecked&&<p className={`mt-1 text-xs font-semibold ${correct?'text-emerald-700':'text-rose-700'}`}>{correct?'Chính xác':`Đáp án: ${item.word}`}</p>}</div></div>;})}</div></div>{dictationChecked&&<div className="mt-4 rounded-2xl bg-cyan-50 p-4"><div className="text-sm font-bold text-cyan-900">Kết quả: {dictationCorrect}/{dictationTargets.length} từ đúng ({Math.round(dictationCorrect/Math.max(1,dictationTargets.length)*100)}%)</div><p className="mt-1 text-xs text-cyan-800">Chú ý cả chính tả, số ít/số nhiều và dạng từ. Đây là bài luyện nội bộ, không phải điểm IELTS.</p><details className="mt-3"><summary className="cursor-pointer text-sm font-semibold text-cyan-900">Xem transcript đầy đủ</summary><p className="mt-2 text-sm leading-7 text-slate-700">{dictation.transcript}</p></details></div>}<div className="mt-5 flex flex-wrap gap-2"><button onClick={()=>setDictationChecked(true)} className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white">Kiểm tra đáp án</button><button onClick={()=>{setDictationAnswers({});setDictationChecked(false);}} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold">Làm lại</button></div></section>}

    {mode === 'shadow' && <section className="rounded-3xl bg-white border border-slate-200 p-5 md:p-7"><button onClick={()=>{window.speechSynthesis?.cancel();setMode('home');}} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500"><ArrowLeft size={16}/> Quay lại</button><div className="mt-4 flex flex-wrap items-center justify-between gap-3"><div><div className="text-xs font-bold tracking-widest text-violet-700">SHADOWING STUDIO</div><h2 className="mt-1 text-2xl font-bold">Nghe nhại theo từng Part</h2></div><select value={shadowPart} onChange={e=>{setShadowPart(Number(e.target.value));setRecognised('');setShadowMessage('');setShowTranscript(false);setActiveTranscriptWord(-1);window.speechSynthesis?.cancel();}} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">{parts.map(p=><option key={p.id} value={p.id}>Part {p.id}: {p.title}</option>)}</select></div>
      <div className="mt-5 rounded-2xl bg-violet-50 p-4"><div className="flex items-center gap-2 font-bold text-violet-900"><Volume2 size={18}/> Recording · Part {shadowPart}</div><p className="mt-1 text-xs text-violet-700">Khác với chế độ thi, bạn có thể nghe lại không giới hạn và thay đổi tốc độ bằng nút bên dưới.</p><div className="mt-3 flex flex-wrap gap-2"><button onClick={()=>speak(shadow.transcript,0.8)} className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white">Nghe chậm 0.8×</button><button onClick={()=>speak(shadow.transcript,1)} className="rounded-xl bg-violet-700 px-4 py-2 text-sm font-bold text-white">Nghe 1.0×</button><button onClick={()=>{window.speechSynthesis?.cancel();setActiveTranscriptWord(-1);}} className="rounded-xl border border-violet-200 px-4 py-2 text-sm font-semibold text-violet-800"><Pause size={14} className="inline mr-1"/>Dừng</button></div></div>
      <div className="mt-5 rounded-2xl border border-slate-200 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2 text-sm font-bold"><BookOpen size={17}/> Transcript</div><button type="button" aria-expanded={showTranscript} onClick={()=>setShowTranscript(value=>!value)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">{showTranscript?'Ẩn transcript':'Hiện transcript'}</button></div>{showTranscript&&<><div className="mt-3 flex items-center justify-between gap-2 text-xs text-slate-500"><span>Transcript được tô sáng theo lời đọc khi trình duyệt hỗ trợ sự kiện đồng bộ.</span>{activeTranscriptWord>=0&&<b className="shrink-0 text-violet-700">Từ {activeTranscriptWord+1}/{transcriptWords.length}</b>}</div><p className="mt-3 whitespace-pre-wrap text-sm leading-8 text-slate-700" >{transcriptSegments.map((token,index)=>{if(!token.trim())return <React.Fragment key={index}>{token}</React.Fragment>;const wordIndex=transcriptWordIndex++;return <span key={index} className={wordIndex===activeTranscriptWord?'rounded bg-amber-200 px-0.5 text-slate-950 transition-colors':'transition-colors'}>{token}</span>;})}</p></>}</div>
      <div className="mt-5 rounded-2xl border border-slate-200 p-5"><div className="font-bold">Ghi âm và đối chiếu lời nói</div><p className="mt-1 text-xs text-slate-500">Cho phép trình duyệt truy cập microphone. Độ trùng khớp chỉ so sánh văn bản được nhận diện; không đánh giá âm vị, trọng âm hoặc ngữ điệu.</p><div className="mt-3 flex flex-wrap gap-2">{!recording?<button onClick={startShadowRecognition} className="rounded-xl bg-rose-600 px-4 py-3 text-sm font-bold text-white"><Mic size={16} className="inline mr-2"/>Bắt đầu ghi nhận</button>:<button onClick={stopShadowRecognition} className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white">Dừng & đối chiếu</button>}<button onClick={()=>setRecognised('')} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold">Xóa bản nhận diện</button></div><div className="mt-3 min-h-20 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">{recognised||'Nội dung nhận diện sẽ xuất hiện tại đây...'}</div>{shadowMessage&&<p className="mt-3 text-sm font-semibold text-violet-700">{shadowMessage}</p>}</div>
      <div className="mt-5"><h3 className="font-bold">Lịch sử Shadowing gần đây</h3>{shadows.length===0?<p className="mt-2 text-sm text-slate-500">Chưa có phiên luyện tập.</p>:<div className="mt-2 space-y-2">{shadows.slice(0,5).map(s=><div key={s.id} className="flex justify-between rounded-xl bg-slate-50 p-3 text-xs"><span>Part {s.partId} · {new Date(s.date).toLocaleString('vi-VN')}</span><b>{s.transcriptMatch}% text match</b></div>)}</div>}</div>
    </section>}
  </div>;
};

const ArrowRightIcon = () => <ArrowRight size={16}/>;
