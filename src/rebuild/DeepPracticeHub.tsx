import React, { useEffect, useMemo, useState } from 'react';
import type { GradeCefrLessonUnit } from '../data/gradeCefrCurriculum';
import { evaluateSpeaking, evaluateWriting, sendConversationMessage } from '../services/api';

type Skill = 'listening' | 'reading' | 'writing' | 'speaking' | 'vocabulary' | 'grammar' | 'exam';
type Props = { unit: GradeCefrLessonUnit; track: string; grade: string; level: string };
type SpeakingResult = Awaited<ReturnType<typeof evaluateSpeaking>>;

const skillTabs: { id: Skill; label: string; sub: string }[] = [
  { id: 'listening', label: 'Listening', sub: 'Listen · understand · check' },
  { id: 'reading', label: 'Reading', sub: 'Read · infer · explain' },
  { id: 'writing', label: 'Writing', sub: 'Plan · draft · improve' },
  { id: 'speaking', label: 'Speaking', sub: 'Respond · record · review' },
  { id: 'vocabulary', label: 'Vocabulary', sub: 'Recall · use · retain' },
  { id: 'grammar', label: 'Grammar', sub: 'Notice · apply · correct' },
  { id: 'exam', label: 'Exam practice', sub: 'Mixed-skill checkpoint' },
];

const readProgress = (): Record<string, string[]> => {
  try {
    const value = JSON.parse(localStorage.getItem('benenglish-skill-progress-v1') || '{}');
    return value && typeof value === 'object' ? value : {};
  } catch { return {}; }
};

export default function DeepPracticeHub({ unit, track, grade, level }: Props) {
  const [activeSkill, setActiveSkill] = useState<Skill>('listening');
  const [progress, setProgress] = useState<Record<string, string[]>>(readProgress);
  const [listeningChoice, setListeningChoice] = useState('');
  const [readingChoice, setReadingChoice] = useState('');
  const [showListeningAnswer, setShowListeningAnswer] = useState(false);
  const [showReadingAnswer, setShowReadingAnswer] = useState(false);
  const [vocabIndex, setVocabIndex] = useState(0);
  const [showVocabMeaning, setShowVocabMeaning] = useState(false);
  const [writingDraft, setWritingDraft] = useState('');
  const [writingResult, setWritingResult] = useState<Awaited<ReturnType<typeof evaluateWriting>> | null>(null);
  const [writingBusy, setWritingBusy] = useState(false);
  const [writingError, setWritingError] = useState('');
  const [speakingTranscript, setSpeakingTranscript] = useState('');
  const [speakingBusy, setSpeakingBusy] = useState(false);
  const [speakingRecording, setSpeakingRecording] = useState(false);
  const [speakingError, setSpeakingError] = useState('');
  const [speakingResult, setSpeakingResult] = useState<SpeakingResult | null>(null);
  const [grammarDraft, setGrammarDraft] = useState('');
  const [grammarFeedback, setGrammarFeedback] = useState('');
  const [grammarBusy, setGrammarBusy] = useState(false);
  const [examAnswers, setExamAnswers] = useState<Record<string, string>>({});
  const [examSubmitted, setExamSubmitted] = useState(false);

  const key = unit.id;
  const completed = progress[key] || [];
  const activeVocabulary = unit.vocabulary[vocabIndex % Math.max(1, unit.vocabulary.length)];
  const listeningQuestion = unit.listening.questions[0];
  const readingQuestion = unit.reading.questions[0];
  const examScore = useMemo(() => {
    const items = [
      { id: 'listening', answer: listeningQuestion.answer },
      { id: 'reading', answer: readingQuestion.answer },
    ];
    return items.filter(item => (examAnswers[item.id] || '') === item.answer).length;
  }, [examAnswers, listeningQuestion.answer, readingQuestion.answer]);

  useEffect(() => {
    localStorage.setItem('benenglish-skill-progress-v1', JSON.stringify(progress));
  }, [progress]);

  useEffect(() => {
    setActiveSkill('listening');
    setListeningChoice('');
    setReadingChoice('');
    setShowListeningAnswer(false);
    setShowReadingAnswer(false);
    setWritingDraft('');
    setWritingResult(null);
    setWritingError('');
    setSpeakingTranscript('');
    setSpeakingResult(null);
    setSpeakingError('');
    setGrammarDraft('');
    setGrammarFeedback('');
    setExamAnswers({});
    setExamSubmitted(false);
  }, [unit.id]);

  const markComplete = (skill: Skill) => setProgress(previous => ({
    ...previous,
    [key]: Array.from(new Set([...(previous[key] || []), skill])),
  }));

  const playListening = () => {
    if (!('speechSynthesis' in window)) {
      setSpeakingError('Speech playback is not supported in this browser.');
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(unit.listening.script);
    utterance.lang = 'en-US';
    utterance.rate = 0.92;
    window.speechSynthesis.speak(utterance);
  };

  const assessWriting = async () => {
    if (writingDraft.trim().split(/\\s+/).filter(Boolean).length < 8) {
      setWritingError('Write at least 8 words so the tutor has enough evidence to review.');
      return;
    }
    setWritingBusy(true);
    setWritingError('');
    setWritingResult(null);
    try {
      const result = await evaluateWriting({
        prompt: unit.writing.prompt,
        learnerResponse: writingDraft,
        sourceText: unit.reading.passage,
        track,
        grade,
        level: unit.level,
      });
      setWritingResult(result);
      markComplete('writing');
    } catch (error) {
      setWritingError(error instanceof Error ? error.message : 'Writing feedback is temporarily unavailable.');
    } finally {
      setWritingBusy(false);
    }
  };

  const startSpeaking = () => {
    const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Recognition) {
      setSpeakingError('Speech recognition is not available in this browser. You can type your spoken answer below and request feedback.');
      return;
    }
    setSpeakingError('');
    const recognition = new Recognition();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let index = 0; index < event.results.length; index += 1) transcript += event.results[index][0].transcript + ' ';
      setSpeakingTranscript(transcript.trim());
    };
    recognition.onerror = (event: any) => {
      setSpeakingError('Microphone recognition: ' + String(event.error || 'could not start'));
      setSpeakingRecording(false);
    };
    recognition.onend = () => setSpeakingRecording(false);
    try {
      recognition.start();
      setSpeakingRecording(true);
      (window as any).__benEnglishRecognition = recognition;
    } catch {
      setSpeakingError('The microphone could not start. Check browser permission and try again.');
      setSpeakingRecording(false);
    }
  };

  const stopSpeaking = () => {
    try { (window as any).__benEnglishRecognition?.stop(); } catch { /* already stopped */ }
    setSpeakingRecording(false);
  };

  const assessSpeaking = async () => {
    if (speakingTranscript.trim().split(/\\s+/).filter(Boolean).length < 5) {
      setSpeakingError('Please record or enter at least 5 words before requesting feedback.');
      return;
    }
    setSpeakingBusy(true);
    setSpeakingError('');
    try {
      const result = await evaluateSpeaking({
        topic: unit.speaking.prompt,
        userTranscript: speakingTranscript,
        track,
        level: unit.level,
      });
      setSpeakingResult(result);
      markComplete('speaking');
    } catch (error) {
      setSpeakingError(error instanceof Error ? error.message : 'Speaking feedback is temporarily unavailable.');
    } finally {
      setSpeakingBusy(false);
    }
  };

  const reviewGrammar = async () => {
    if (grammarDraft.trim().length < 8) return;
    setGrammarBusy(true);
    setGrammarFeedback('');
    try {
      const response = await sendConversationMessage({
        message: 'Please review this learner-created example sentence for the grammar focus "' + unit.grammarFocus.join(', ') + '". Sentence: "' + grammarDraft.trim() + '". Explain whether it is correct, give one correction if needed, and provide one short practice prompt. Explain in Vietnamese at CEFR ' + unit.level + '.',
        history: [],
        tutorPersona: track === 'high_school' ? 'friendly_teacher' : 'business_coach',
        mode: track === 'high_school' ? 'school' : 'business',
        track,
        userLevel: unit.level,
        grade,
        occupation: grade,
      });
      setGrammarFeedback(response.replyText);
      markComplete('grammar');
    } catch (error) {
      setGrammarFeedback(error instanceof Error ? error.message : 'Grammar feedback is temporarily unavailable.');
    } finally {
      setGrammarBusy(false);
    }
  };

  const renderQuestion = (kind: 'listening' | 'reading' | 'exam') => {
    const question = kind === 'listening' ? listeningQuestion : readingQuestion;
    const selected = kind === 'listening' ? listeningChoice : readingChoice;
    const revealed = kind === 'listening' ? showListeningAnswer : showReadingAnswer;
    const setSelected = kind === 'listening' ? setListeningChoice : setReadingChoice;
    const setRevealed = kind === 'listening' ? setShowListeningAnswer : setShowReadingAnswer;
    return <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-sm font-extrabold text-slate-900">{question.prompt}</p>
      <div className="mt-3 grid gap-2">{question.options.map(option => <button key={option} onClick={() => { setSelected(option); if (kind === 'exam') setExamAnswers(previous => ({ ...previous, [kind]: option })); }} className={'rounded-xl border px-3 py-3 text-left text-sm ' + (selected === option ? 'border-indigo-400 bg-indigo-50 font-bold text-indigo-800' : 'border-slate-200 hover:border-slate-300')}>{option}</button>)}</div>
      {revealed && <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm"><strong>{selected === question.answer ? 'Correct' : 'Review this answer'}</strong><p className="mt-1">{question.explanation}</p><p className="mt-1 text-xs text-slate-500">Answer: {question.answer}</p></div>}
      <button onClick={() => { setRevealed(true); if (selected === question.answer) markComplete(kind); }} disabled={!selected} className="mt-3 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-40">{revealed ? 'Checked' : 'Check answer'}</button>
    </div>;
  };

  return <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="text-xs font-extrabold tracking-[.18em] text-indigo-600">DEEP PRACTICE STUDIO</p><h2 className="mt-2 text-2xl font-extrabold">Build each skill, one clear step at a time.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Bài luyện được liên kết trực tiếp với chủ đề, khối lớp và CEFR hiện tại. Tiến độ của Studio được lưu riêng trên trình duyệt này.</p></div>
      <div className="rounded-2xl bg-slate-50 px-4 py-3 text-right"><div className="text-2xl font-black text-slate-900">{completed.length}/7</div><div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">skills practised</div></div>
    </div>
    <div className="mt-5 flex gap-2 overflow-x-auto pb-2">{skillTabs.map(tab => <button key={tab.id} onClick={() => setActiveSkill(tab.id)} className={'shrink-0 rounded-xl border px-3 py-2 text-left ' + (activeSkill === tab.id ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600')}><span className="block text-xs font-extrabold">{tab.label}</span><span className={'mt-1 block text-[10px] ' + (activeSkill === tab.id ? 'text-white/65' : 'text-slate-400')}>{completed.includes(tab.id) ? '✓ Practised' : tab.sub}</span></button>)}</div>

    {activeSkill === 'listening' && <div className="mt-5 rounded-2xl bg-sky-50 p-5"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-lg font-extrabold text-sky-950">01 · Listening comprehension</h3><span className="text-xs font-bold text-sky-700">Preview voice · not human audio</span></div><p className="mt-3 text-sm leading-7 text-slate-700">{unit.listening.script}</p><button onClick={playListening} className="mt-3 rounded-xl bg-sky-700 px-4 py-2.5 text-xs font-bold text-white">Play listening preview</button>{renderQuestion('listening')}<p className="mt-3 text-xs leading-5 text-slate-500">Chiến lược: nghe lần 1 nắm ý chính; nghe lần 2 ghi từ khóa; chỉ xem đáp án sau khi đã chọn.</p></div>}

    {activeSkill === 'reading' && <div className="mt-5 rounded-2xl bg-indigo-50 p-5"><h3 className="text-lg font-extrabold text-indigo-950">02 · Reading for meaning</h3><p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-700">{unit.reading.passage}</p>{renderQuestion('reading')}<div className="mt-3 rounded-xl bg-white/80 p-3 text-xs leading-5 text-slate-600">Đọc câu hỏi trước, tìm từ khóa trong đoạn, xác định câu chứa bằng chứng rồi mới chọn đáp án. Không suy luận vượt quá nội dung bài.</div></div>}

    {activeSkill === 'writing' && <div className="mt-5 rounded-2xl bg-emerald-50 p-5"><h3 className="text-lg font-extrabold text-emerald-950">03 · Writing workshop</h3><p className="mt-2 text-sm text-slate-700">{unit.writing.prompt}</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{unit.writing.checklist.map(item => <div key={item} className="rounded-xl bg-white p-3 text-xs text-slate-600">□ {item}</div>)}</div><textarea value={writingDraft} onChange={event => setWritingDraft(event.target.value)} rows={6} placeholder="Write your answer here…" className="mt-4 w-full rounded-xl border border-emerald-200 bg-white p-3 text-sm leading-6 outline-none focus:border-emerald-500"/><div className="mt-2 flex flex-wrap items-center justify-between gap-2"><span className="text-xs text-slate-500">{writingDraft.trim().split(/\\s+/).filter(Boolean).length} words · CEFR {unit.level}</span><button disabled={writingBusy} onClick={assessWriting} className="rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">{writingBusy ? 'Reviewing…' : 'Get AI writing feedback'}</button></div>{writingError && <p role="alert" className="mt-3 text-sm text-rose-700">{writingError}</p>}{writingResult && <div className="mt-4 space-y-3 rounded-xl bg-white p-4"><p className="text-sm leading-6 text-slate-700">{writingResult.overallFeedback}</p><div className="grid grid-cols-4 gap-2">{[['Task',writingResult.taskFulfilment],['Flow',writingResult.organisation],['Words',writingResult.vocabulary],['Grammar',writingResult.grammar]].map(([label,score])=><div key={String(label)} className="rounded-lg bg-emerald-50 p-2"><div className="text-[10px] text-slate-500">{label}</div><div className="text-lg font-black text-emerald-800">{score}/5</div></div>)}</div>{writingResult.corrections.map((item,index)=><div key={index} className="rounded-lg bg-slate-50 p-3 text-xs"><p className="text-rose-700 line-through">{item.original}</p><p className="mt-1 font-bold text-emerald-700">{item.improved}</p><p className="mt-1 text-slate-600">{item.explanationVi}</p></div>)}{writingResult.nextSteps.map(item=><p key={item} className="text-xs text-slate-600">→ {item}</p>)}<details className="rounded-lg bg-slate-50 p-3"><summary className="cursor-pointer text-xs font-bold">Model answer</summary><p className="mt-2 whitespace-pre-line text-sm leading-6">{writingResult.improvedSampleAnswer}</p></details></div>}</div>}

    {activeSkill === 'speaking' && <div className="mt-5 rounded-2xl bg-violet-50 p-5"><h3 className="text-lg font-extrabold text-violet-950">04 · Speaking coach</h3><p className="mt-2 text-sm leading-6 text-slate-700">{unit.speaking.prompt}</p><div className="mt-3 space-y-2">{unit.speaking.followUps.map(item=><p key={item} className="rounded-xl bg-white p-3 text-xs text-slate-600">{item}</p>)}</div><div className="mt-4 flex flex-wrap gap-2"><button onClick={speakingRecording ? stopSpeaking : startSpeaking} className={'rounded-xl px-4 py-2.5 text-xs font-bold text-white ' + (speakingRecording ? 'bg-rose-600' : 'bg-violet-700')}>{speakingRecording ? 'Stop recording' : 'Start microphone'}</button><span className="self-center text-xs text-slate-500">Speech-to-text transcript is assessed; this is not acoustic phoneme scoring.</span></div><textarea value={speakingTranscript} onChange={event => setSpeakingTranscript(event.target.value)} rows={4} placeholder="Your recognised or typed answer appears here…" className="mt-3 w-full rounded-xl border border-violet-200 bg-white p-3 text-sm leading-6"/><button disabled={speakingBusy} onClick={assessSpeaking} className="mt-2 rounded-xl bg-violet-700 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">{speakingBusy ? 'Evaluating…' : 'Evaluate my speaking response'}</button>{speakingError && <p role="alert" className="mt-3 text-sm text-rose-700">{speakingError}</p>}{speakingResult && <div className="mt-4 space-y-3 rounded-xl bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm">CEFR estimate: {speakingResult.cefrEstimate}</strong><span className="text-xs font-bold text-violet-700">Practice band {speakingResult.overallBandEstimate}</span></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{Object.entries(speakingResult.rubricScores).map(([label,score])=><div key={label} className="rounded-lg bg-violet-50 p-2"><div className="text-[10px] text-slate-500">{label.replace(/([A-Z])/g,' $1')}</div><div className="font-black">{score}/9</div></div>)}</div>{speakingResult.strengths.map(item=><p key={item} className="text-xs text-emerald-700">+ {item}</p>)}{speakingResult.areasToImprove.map(item=><p key={item} className="text-xs text-amber-800">→ {item}</p>)}{speakingResult.grammarCorrections.map(item=><div key={item.original} className="rounded-lg bg-slate-50 p-3 text-xs"><span className="text-rose-700 line-through">{item.original}</span><p className="mt-1 font-bold text-emerald-700">{item.correction}</p><p className="mt-1 text-slate-600">{item.vietnameseNote}</p></div>)}<details className="rounded-lg bg-slate-50 p-3"><summary className="cursor-pointer text-xs font-bold">Suggested stronger answer</summary><p className="mt-2 text-sm leading-6">{speakingResult.improvedSampleAnswer}</p></details></div>}</div>}

    {activeSkill === 'vocabulary' && <div className="mt-5 rounded-2xl bg-amber-50 p-5"><h3 className="text-lg font-extrabold text-amber-950">05 · Vocabulary retrieval</h3><p className="mt-2 text-sm text-slate-600">Hãy tự nhớ nghĩa trước khi mở đáp án. Sau đó đọc ví dụ thành tiếng và tự đặt câu mới.</p>{activeVocabulary ? <div className="mt-4 rounded-2xl bg-white p-5"><div className="text-xs font-bold uppercase tracking-wider text-slate-400">Word {vocabIndex+1} of {unit.vocabulary.length}</div><div className="mt-3 text-2xl font-black text-slate-900">{activeVocabulary.word}</div><button onClick={()=>setShowVocabMeaning(value=>!value)} className="mt-3 rounded-xl border border-amber-200 px-4 py-2 text-xs font-bold text-amber-900">{showVocabMeaning ? 'Hide meaning' : 'Reveal meaning'}</button>{showVocabMeaning && <div className="mt-3 rounded-xl bg-amber-50 p-3"><p className="text-sm font-bold">{activeVocabulary.meaningVi}</p><p className="mt-1 text-sm text-slate-600">{activeVocabulary.example}</p></div>}<button onClick={()=>{setVocabIndex(index=>index+1);setShowVocabMeaning(false);if(vocabIndex+1>=unit.vocabulary.length)markComplete('vocabulary');}} className="mt-3 block rounded-xl bg-amber-700 px-4 py-2.5 text-xs font-bold text-white">Next word</button></div> : <p className="mt-3 text-sm">No vocabulary item has been added to this unit yet.</p>}</div>}

    {activeSkill === 'grammar' && <div className="mt-5 rounded-2xl bg-cyan-50 p-5"><h3 className="text-lg font-extrabold text-cyan-950">06 · Grammar clinic</h3><p className="mt-2 text-sm text-slate-700">Focus: {unit.grammarFocus.join(' · ')}</p><p className="mt-3 text-sm text-slate-600">Viết một câu của riêng bạn có sử dụng một cấu trúc trong bài. AI sẽ kiểm tra cách dùng, giải thích lỗi và đưa bài luyện tiếp theo.</p><textarea value={grammarDraft} onChange={event=>setGrammarDraft(event.target.value)} rows={3} placeholder="Write one original sentence…" className="mt-3 w-full rounded-xl border border-cyan-200 bg-white p-3 text-sm"/><button onClick={reviewGrammar} disabled={grammarBusy||grammarDraft.trim().length<8} className="mt-2 rounded-xl bg-cyan-800 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">{grammarBusy?'Checking…':'Ask AI to check my sentence'}</button>{grammarFeedback && <div className="mt-3 whitespace-pre-wrap rounded-xl bg-white p-4 text-sm leading-6 text-slate-700">{grammarFeedback}</div>}</div>}

    {activeSkill === 'exam' && <div className="mt-5 rounded-2xl bg-slate-100 p-5"><h3 className="text-lg font-extrabold text-slate-950">07 · Mixed-skill checkpoint</h3><p className="mt-2 text-sm text-slate-600">A short formative checkpoint from this unit. It is practice evidence, not an official CEFR certificate or school exam grade.</p>{renderQuestion('listening')}{renderQuestion('reading')}{!examSubmitted ? <button onClick={()=>setExamSubmitted(true)} disabled={!examAnswers.listening&&!examAnswers.reading} className="mt-4 rounded-xl bg-slate-900 px-4 py-3 text-xs font-bold text-white disabled:opacity-40">Submit checkpoint</button> : <div className="mt-4 rounded-xl bg-white p-4"><div className="text-xl font-black">{examScore}/2 correct</div><p className="mt-1 text-sm text-slate-600">Review the explanations above, then revisit the skill that needs more practice.</p><button onClick={()=>{setExamAnswers({});setExamSubmitted(false);setListeningChoice('');setReadingChoice('');setShowListeningAnswer(false);setShowReadingAnswer(false);}} className="mt-3 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold">Retry checkpoint</button></div>}</div>}
  </section>;
}
