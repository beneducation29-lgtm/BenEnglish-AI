import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { READ_ALOUD_PASSAGES } from '../data/curriculumData';
import { GRADE_CEFR_CURRICULUM } from '../data/gradeCefrCurriculum';
import { ReadAloudPassage } from '../types';
import { audioEngine, isSpeechSynthesisSupported } from '../services/speech';
import { lookupWordDefinition, evaluateWriting, WritingAssessmentData } from '../services/api';
import { BookOpen, PenLine, Volume2, Pause, Search, Save, CheckCircle2, Clock3, Sparkles, BookText } from 'lucide-react';

type Mode = 'reading' | 'writing';
type WordLookup = { word: string; ipa?: string; pos?: string; meaningVi?: string; definitionEn?: string; exampleEn?: string; exampleVi?: string };

export const ReadingWritingView: React.FC = () => {
  const { user } = useApp();
  const readingLevel = user.placementAssessment?.skills.reading.level || user.cefrLevel;
  const [mode, setMode] = useState<Mode>('reading');
  const [selectedId, setSelectedId] = useState('');
  const [showTranslation, setShowTranslation] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedWord, setSelectedWord] = useState('');
  const [lookup, setLookup] = useState<WordLookup | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [draft, setDraft] = useState('');
  const [savedAt, setSavedAt] = useState('');
  const [writingFeedback, setWritingFeedback] = useState<WritingAssessmentData | null>(null);
  const [isAssessingWriting, setIsAssessingWriting] = useState(false);
  const [writingError, setWritingError] = useState('');
  const [readingAnswers, setReadingAnswers] = useState<Record<string, string>>({});
  const [showReadingAnswers, setShowReadingAnswers] = useState(false);

  const curriculumUnits = useMemo(
    () => GRADE_CEFR_CURRICULUM.filter((unit) => unit.track === user.track && (user.track !== 'high_school' || !user.grade || unit.grade === user.grade)),
    [user.track, user.grade]
  );
  const passages = useMemo(() => [
    ...READ_ALOUD_PASSAGES.filter((item) => item.track === 'both' || item.track === user.track),
    ...curriculumUnits.map((unit) => ({
      id: unit.id,
      title: unit.title,
      track: unit.track,
      level: unit.level,
      category: unit.theme,
      text: unit.reading.passage,
      sentences: (unit.reading.passage.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [unit.reading.passage]).map((text, index) => ({ id: unit.id + '-r-' + index, text: text.trim() })),
      focusSounds: unit.vocabulary.map((item) => item.word),
      targetWpm: unit.level === 'A1' || unit.level === 'A2' ? 90 : unit.level === 'B1' ? 115 : 135,
    } as ReadAloudPassage)),
  ], [user.track, curriculumUnits]);
  const passage: ReadAloudPassage = passages.find((item) => item.id === selectedId) || passages.find((item) => item.level === readingLevel) || passages[0] || READ_ALOUD_PASSAGES[0];
  const activeUnit = curriculumUnits.find((unit) => unit.id === passage?.id);
  const storageKey = `benenglish_writing_draft_v1:${user.email || 'guest'}:${passage.id}`;

  useEffect(() => {
    if (!selectedId && passages[0]) {
      const matched = passages.find((item) => item.level === readingLevel) || passages[0];
      setSelectedId(matched.id);
    }
  }, [passages, selectedId, readingLevel]);

  useEffect(() => {
    try {
      setDraft(localStorage.getItem(storageKey) || '');
      setSavedAt('');
    } catch { setDraft(''); }
  }, [storageKey]);

  useEffect(() => () => audioEngine.stop(), []);

  const wordCount = draft.trim() ? draft.trim().split(/\s+/).length : 0;
  const playPassage = () => {
    if (!isSpeechSynthesisSupported()) return;
    if (isPlaying) {
      audioEngine.stop();
      setIsPlaying(false);
      return;
    }
    setIsPlaying(true);
    audioEngine.speak(activeUnit?.listening.script || passage.text, {
      rate: 0.92,
      onEnd: () => setIsPlaying(false),
      onError: () => setIsPlaying(false),
    });
  };

  const inspectWord = async (word: string) => {
    const clean = word.replace(/^[^a-zA-Z'-]+|[^a-zA-Z'-]+$/g, '');
    if (!clean) return;
    setSelectedWord(clean);
    setLookup(null);
    setLookupError('');
    setLookupLoading(true);
    try {
      const result = await lookupWordDefinition({ word: clean, sentenceContext: passage.text });
      setLookup(result as WordLookup);
    } catch (error) {
      setLookupError(error instanceof Error ? error.message : 'Could not load this word yet.');
    } finally {
      setLookupLoading(false);
    }
  };

  const saveDraft = () => {
    try {
      localStorage.setItem(storageKey, draft);
      setSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch {
      setSavedAt('Storage unavailable');
    }
  };

  const writingPrompt = activeUnit?.writing.prompt || (user.track === 'high_school'
    ? `Write a short response about “${passage.title}”. Summarize the main idea, explain one important detail, and add your own opinion.`
    : `Write a concise professional response inspired by “${passage.title}”. Summarize the key point, explain its business relevance, and recommend one action.`);

  const assessDraft = async () => {
    if (wordCount < 8) { setWritingError('Please write at least 8 words so the tutor has enough evidence to assess.'); return; }
    setIsAssessingWriting(true); setWritingError(''); setWritingFeedback(null);
    try {
      const feedback = await evaluateWriting({ prompt: writingPrompt, learnerResponse: draft, sourceText: passage.text, track: user.track, grade: user.grade, level: activeUnit?.level || readingLevel });
      setWritingFeedback(feedback);
    } catch (error) { setWritingError(error instanceof Error ? error.message : 'Could not assess this response.'); }
    finally { setIsAssessingWriting(false); }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-14">
      <section className="rounded-3xl bg-slate-950 px-6 py-7 text-white sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-300">
              <BookText className="h-4 w-4" /> Two skills · One learning flow
            </div>
            <h1 className="text-2xl font-extrabold sm:text-3xl">Read with purpose. Write with clarity.</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">Read level-matched passages, explore vocabulary in context, then turn what you understand into your own writing.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
            <span className="block text-xs text-slate-400">Your level</span><strong className="text-lg">{readingLevel}</strong>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2">
        <button onClick={() => setMode('reading')} className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-colors ${mode === 'reading' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
          <BookOpen className="h-4 w-4" /> Reading
        </button>
        <button onClick={() => setMode('writing')} className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-colors ${mode === 'writing' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
          <PenLine className="h-4 w-4" /> Writing
        </button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="min-w-0 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">{mode === 'reading' ? 'Reading practice' : 'Writing from reading'}</span>
              <h2 className="mt-1 text-xl font-bold text-slate-900">{passage.title}</h2>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{passage.level} · {passage.category}</span>
          </div>

          <label className="mb-4 block text-xs font-semibold text-slate-600">
            Choose a passage
            <select value={passage.id} onChange={(event) => { setSelectedId(event.target.value); setSelectedWord(''); setLookup(null); setWritingFeedback(null); setReadingAnswers({}); setShowReadingAnswers(false); }} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-emerald-500">
              {passages.map((item) => <option key={item.id} value={item.id}>{item.level} · {item.title}</option>)}
            </select>
          </label>

          {mode === 'reading' ? (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-slate-500">Tap any word to see its meaning in context.</p>
                <button onClick={() => setShowTranslation((value) => !value)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">{showTranslation ? 'Hide Vietnamese' : 'Show Vietnamese'}</button>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 text-base leading-9 text-slate-800 sm:p-6 sm:text-lg">
                {passage.sentences.map((sentence, index) => (
                  <span key={sentence.id}>
                    {sentence.text.split(/(\s+)/).map((part, wordIndex) => /^\s+$/.test(part) ? part : (
                      <button key={wordIndex} onClick={() => inspectWord(part)} className={`rounded px-0.5 text-left decoration-emerald-400 underline-offset-4 hover:bg-emerald-100 hover:underline ${selectedWord.toLowerCase() === part.replace(/[^a-zA-Z'-]/g, '').toLowerCase() ? 'bg-emerald-100 text-emerald-800' : ''}`}>{part}</button>
                    ))}
                    {showTranslation && sentence.textVi && <span className="block border-b border-slate-200 pb-3 pt-1 text-sm leading-6 text-slate-500">{sentence.textVi}</span>}
                    {index < passage.sentences.length - 1 && <span> </span>}
                  </span>
                ))}
              </div>
              {activeUnit && <div className="mt-5 space-y-3">
                <section className="rounded-2xl border border-sky-100 bg-sky-50/60 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-bold text-sky-900"><Volume2 className="h-4 w-4" /> Listening · {activeUnit.level}</div>
                  <p className="text-xs leading-5 text-slate-600">Listen to the original lesson script. This preview uses your device's speech-synthesis voice, not a recorded human speaker.</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{activeUnit.listening.script}</p>
                  <details className="mt-2"><summary className="cursor-pointer text-xs font-semibold text-sky-800">Listening comprehension question</summary><div className="mt-2 rounded-xl bg-white p-3 text-sm"><p className="font-semibold">{activeUnit.listening.questions[0].prompt}</p><p className="mt-2 text-xs text-slate-600">Answer: {activeUnit.listening.questions[0].answer}</p><p className="mt-1 text-xs text-slate-500">{activeUnit.listening.questions[0].explanation}</p></div></details>
                </section>
                <section className="rounded-2xl border border-violet-100 bg-violet-50/60 p-4">
                  <div className="mb-2 text-sm font-bold text-violet-900">Speaking · {activeUnit.level}</div>
                  <p className="text-sm leading-6 text-slate-700">{activeUnit.speaking.prompt}</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-600">{activeUnit.speaking.followUps.map((question) => <li key={question}>{question}</li>)}</ul>
                </section>
                <section className="rounded-2xl border border-emerald-100 bg-white p-4">
                  <div className="mb-2 text-sm font-bold text-emerald-900">Reading comprehension</div>
                  {activeUnit.reading.questions.map((question) => <div key={question.id} className="mb-3 last:mb-0"><p className="text-sm font-semibold text-slate-800">{question.prompt}</p><div className="mt-2 grid gap-2 sm:grid-cols-2">{question.options.map((option) => <label key={option} className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 p-2 text-xs text-slate-700"><input type="radio" name={question.id} value={option} checked={readingAnswers[question.id] === option} onChange={() => { setReadingAnswers((prev) => ({...prev,[question.id]:option})); setShowReadingAnswers(false); }} />{option}</label>)}</div>{showReadingAnswers && <p className="mt-2 text-xs text-slate-600">{readingAnswers[question.id] === question.answer ? 'Correct. ' : 'Correct answer: ' + question.answer + '. '}{question.explanation}</p>}</div>)}
                  <button onClick={() => setShowReadingAnswers(true)} className="mt-2 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white">Check reading answers</button>
                </section>
              </div>}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button onClick={playPassage} className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-700">
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}{isPlaying ? 'Stop audio' : activeUnit ? 'Play listening script · device voice' : 'Listen to passage'}
                </button>
                <span className="flex items-center gap-1 text-xs text-slate-500"><Clock3 className="h-3.5 w-3.5" /> Target pace {passage.targetWpm} WPM</span>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
                <div className="mb-1 flex items-center gap-2 text-xs font-bold text-emerald-800"><Sparkles className="h-4 w-4" /> Writing task</div>
                <p className="text-sm leading-6 text-slate-700">{writingPrompt}</p>
                <p className="mt-2 text-xs text-slate-500">Suggested target: {user.cefrLevel === 'A1' || user.cefrLevel === 'A2' ? '50–80' : user.cefrLevel === 'B1' || user.cefrLevel === 'B2' ? '100–150' : '180–250'} words.</p>
              </div>
              <textarea value={draft} onChange={(event) => { setDraft(event.target.value); setWritingFeedback(null); setWritingError(''); }} rows={12} placeholder="Write your response here. Try to use 2–3 expressions from the passage..." className="w-full resize-y rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-7 text-slate-800 outline-none placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-slate-500">{wordCount} words · Drafts are saved in this browser for your account.</span>
                <button onClick={saveDraft} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700"><Save className="h-4 w-4" /> Save draft</button>
              </div>
              <div className="flex flex-wrap items-center gap-3"><button onClick={assessDraft} disabled={isAssessingWriting || wordCount < 8} className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"><Sparkles className="h-4 w-4" /> {isAssessingWriting ? 'Teacher is reviewing your writing…' : 'Get AI writing feedback'}</button><span className="text-xs text-slate-500">Teacher reviews your submitted text, not a sample answer.</span></div>
              {writingError && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700">{writingError}</p>}
              {writingFeedback && <section className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4" aria-live="polite"><div><h3 className="font-bold text-slate-900">Your tutor’s feedback</h3><p className="mt-2 text-sm leading-6 text-slate-700">{writingFeedback.overallFeedback}</p></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{[{label:'Task',value:writingFeedback.taskFulfilment},{label:'Organisation',value:writingFeedback.organisation},{label:'Vocabulary',value:writingFeedback.vocabulary},{label:'Grammar',value:writingFeedback.grammar}].map((item) => <div key={item.label} className="rounded-xl bg-white p-3"><p className="text-[11px] text-slate-500">{item.label}</p><p className="text-lg font-extrabold text-emerald-700">{item.value}/5</p></div>)}</div>{writingFeedback.strengths.length>0 && <div><h4 className="text-sm font-bold text-slate-800">What you did well</h4><ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">{writingFeedback.strengths.map((item,index)=><li key={index}>{item}</li>)}</ul></div>}{writingFeedback.corrections.length>0 && <div><h4 className="text-sm font-bold text-slate-800">Corrections from your actual text</h4><div className="mt-2 space-y-2">{writingFeedback.corrections.map((item,index)=><div key={index} className="rounded-xl bg-white p-3 text-sm"><p className="text-rose-700 line-through">{item.original}</p><p className="mt-1 font-semibold text-emerald-700">{item.improved}</p><p className="mt-1 text-xs leading-5 text-slate-600">{item.explanationVi}</p></div>)}</div></div>}<div><h4 className="text-sm font-bold text-slate-800">Your next steps</h4><ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">{writingFeedback.nextSteps.map((item,index)=><li key={index}>{item}</li>)}</ul></div>{writingFeedback.improvedSampleAnswer && <details className="rounded-xl bg-white p-3"><summary className="cursor-pointer text-sm font-bold text-slate-800">View an improved model answer</summary><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{writingFeedback.improvedSampleAnswer}</p><p className="mt-2 text-[11px] text-slate-500">A separate learning model based on your ideas — not your original submission.</p></details>}</section>}
              {savedAt && <p className="flex items-center gap-1 text-xs text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> Saved at {savedAt}</p>}
              <div className="rounded-2xl border border-slate-200 p-4">
                <h3 className="mb-2 text-sm font-bold text-slate-800">Before you finish</h3>
                <ul className="space-y-2 text-xs leading-5 text-slate-600">
                  <li>• Does the first sentence make your main idea clear?</li>
                  <li>• Did you support your point with details from the passage?</li>
                  <li>• Did you check verb tense, subject–verb agreement and punctuation?</li>
                  <li>• Does your conclusion add a thought rather than repeat the introduction?</li>
                </ul>
                <p className="mt-3 text-[11px] text-slate-400">Your draft is not automatically graded. AI writing feedback will be added as a separate, evidence-based assessment.</p>
              </div>
            </div>
          )}
        </section>

        <aside className="space-y-4">
          {mode === 'reading' ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-5">
              <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900"><Search className="h-4 w-4 text-emerald-600" /> Word explorer</div>
              {!selectedWord && <p className="text-xs leading-5 text-slate-500">Select a word in the passage to explore its meaning, pronunciation and example.</p>}
              {selectedWord && <div className="space-y-2">
                <p className="text-lg font-extrabold text-slate-900">{selectedWord}</p>
                {lookupLoading && <p className="text-xs text-slate-500">Looking up this word…</p>}
                {lookupError && <p className="text-xs text-rose-600">{lookupError}</p>}
                {lookup && <>
                  <p className="text-xs font-semibold text-emerald-700">{lookup.ipa || ''} {lookup.pos ? `· ${lookup.pos}` : ''}</p>
                  <p className="text-sm font-semibold text-slate-800">{lookup.meaningVi || 'Meaning unavailable'}</p>
                  {lookup.definitionEn && <p className="text-xs leading-5 text-slate-600">{lookup.definitionEn}</p>}
                  {lookup.exampleEn && <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-medium text-slate-700">{lookup.exampleEn}</p>{lookup.exampleVi && <p className="mt-1 text-xs text-slate-500">{lookup.exampleVi}</p>}</div>}
                </>}
              </div>}
            </div>
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-white p-5">
              <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900"><BookOpen className="h-4 w-4 text-emerald-600" /> Useful expressions</div>
              <p className="text-xs leading-5 text-slate-600">Re-read the passage and collect useful phrases before writing. Aim to reuse language naturally, not copy whole sentences.</p>
              <button onClick={() => setMode('reading')} className="mt-3 text-xs font-bold text-emerald-700 hover:underline">Back to passage →</button>
            </div>
          )}
          <div className="rounded-3xl bg-slate-900 p-5 text-white">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-300">Study sequence</p>
            <ol className="mt-3 space-y-3 text-xs text-slate-300">
              <li className="flex gap-2"><span className="font-bold text-white">01</span> Read once for the main idea.</li>
              <li className="flex gap-2"><span className="font-bold text-white">02</span> Explore unfamiliar words in context.</li>
              <li className="flex gap-2"><span className="font-bold text-white">03</span> Listen and notice natural phrasing.</li>
              <li className="flex gap-2"><span className="font-bold text-white">04</span> Write a short response using what you learned.</li>
            </ol>
          </div>
        </aside>
      </div>
    </div>
  );
};
