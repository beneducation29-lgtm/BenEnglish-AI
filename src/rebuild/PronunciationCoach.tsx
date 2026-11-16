import React, { useEffect, useRef, useState } from 'react';
import { Activity, AudioLines, CheckCircle2, CircleAlert, Mic, MicOff, Play, RotateCcw, Volume2 } from 'lucide-react';
import { analyzePronunciationAudio, PronunciationAudioCoachData } from '../services/api';

type Props = { track: string; level: string; contextLabel: string };
type PronunciationProgressEntry = {
  id: number;
  createdAt: number;
  audioAssessment: 'assessable' | 'not_assessable';
  transcript: string;
  audioSummary: string;
  soundTargets: PronunciationAudioCoachData['soundTargets'];
  modelSentence: string;
  strengths: string[];
};

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the recording. Please record again.'));
    reader.onloadend = () => {
      const result = String(reader.result || '');
      const comma = result.indexOf(',');
      if (comma < 0) reject(new Error('The recording could not be prepared for analysis.'));
      else resolve(result.slice(comma + 1));
    };
    reader.readAsDataURL(blob);
  });
}

export default function PronunciationCoach({ track, level, contextLabel }: Props) {
  const [recording, setRecording] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const [recordingUrl, setRecordingUrl] = useState('');
  const [seconds, setSeconds] = useState(0);
  const [targetText, setTargetText] = useState('');
  const [report, setReport] = useState<PronunciationAudioCoachData | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [progressEntries, setProgressEntries] = useState<PronunciationProgressEntry[]>([]);
  const progressStorageKey = `benenglish-pronunciation-progress-v1:${track}:${level}:${contextLabel}`;
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(progressStorageKey) || '[]');
      setProgressEntries(Array.isArray(saved) ? saved.slice(0, 40) : []);
    } catch {
      setProgressEntries([]);
    }
  }, [progressStorageKey]);

  const saveProgressEntry = (result: PronunciationAudioCoachData) => {
    const entry: PronunciationProgressEntry = {
      id: Date.now(),
      createdAt: Date.now(),
      audioAssessment: result.audioAssessment,
      transcript: result.transcript.slice(0, 500),
      audioSummary: result.audioSummary.slice(0, 500),
      soundTargets: result.soundTargets.slice(0, 4),
      modelSentence: result.modelSentence.slice(0, 300),
      strengths: result.strengths.slice(0, 3),
    };
    setProgressEntries(previous => {
      const next = [entry, ...previous].slice(0, 40);
      try { localStorage.setItem(progressStorageKey, JSON.stringify(next)); } catch {
        setNotice('This browser could not save progress. Your current coaching report is still available.');
      }
      return next;
    });
  };

  const assessableEntries = progressEntries.filter(entry => entry.audioAssessment === 'assessable');
  const soundFrequency = assessableEntries.flatMap(entry => entry.soundTargets).reduce<Record<string, { count: number; word: string; ipa: string; tip: string }>>((totals, target) => {
    const key = (target.ipa || target.word).toLowerCase().trim();
    if (!key) return totals;
    if (!totals[key]) totals[key] = { count: 0, word: target.word, ipa: target.ipa, tip: target.practiceTipVi };
    totals[key].count += 1;
    if (target.practiceTipVi) totals[key].tip = target.practiceTipVi;
    return totals;
  }, {});
  const recurringSoundTargets = Object.values(soundFrequency).sort((a, b) => b.count - a.count).slice(0, 3);

  const releaseMicrophone = () => {
    streamRef.current?.getTracks().forEach(trackItem => trackItem.stop());
    streamRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timerRef.current = null;
    timeoutRef.current = null;
  };

  useEffect(() => () => {
    releaseMicrophone();
    if (recordingUrl) URL.revokeObjectURL(recordingUrl);
  }, [recordingUrl]);

  const startRecording = async () => {
    setError('');
    setNotice('');
    setReport(null);
    setRecordingBlob(null);
    if (recordingUrl) URL.revokeObjectURL(recordingUrl);
    setRecordingUrl('');
    setSeconds(0);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Audio recording is not supported here. Please use the latest Chrome or Edge and allow microphone access.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      streamRef.current = stream;
      const preferred = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find(type => MediaRecorder.isTypeSupported(type));
      const recorder = preferred ? new MediaRecorder(stream, { mimeType: preferred }) : new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = event => { if (event.data.size > 0) chunksRef.current.push(event.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (blob.size > 0) {
          setRecordingBlob(blob);
          setRecordingUrl(URL.createObjectURL(blob));
          setNotice('Recording saved. Listen once, then ask the coach to analyse the actual audio.');
        } else setError('No audio was captured. Please try recording again.');
        releaseMicrophone();
      };
      recorder.start(250);
      setRecording(true);
      timerRef.current = setInterval(() => setSeconds(value => value + 1), 1000);
      timeoutRef.current = setTimeout(() => {
        if (recorder.state === 'recording') recorder.stop();
        setRecording(false);
        setNotice('The 30-second recording limit was reached.');
      }, 30000);
    } catch (cause) {
      releaseMicrophone();
      setRecording(false);
      setError(cause instanceof Error && cause.name === 'NotAllowedError'
        ? 'Microphone permission is blocked. Allow access in your browser settings and try again.'
        : 'The microphone could not start. Check that it is connected and not being used by another app.');
    }
  };

  const stopRecording = () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    setRecording(false);
  };

  const analyse = async () => {
    if (!recordingBlob || analyzing) return;
    setAnalyzing(true);
    setError('');
    setNotice('');
    try {
      const audioBase64 = await blobToBase64(recordingBlob);
      const result = await analyzePronunciationAudio({
        audioBase64,
        mimeType: recordingBlob.type.split(';')[0] || 'audio/webm',
        targetText: targetText.trim(),
        track,
        level,
      });
      setReport(result);
      setNotice(result.audioAssessment === 'not_assessable'
        ? 'The audio did not provide enough clear evidence for a reliable pronunciation assessment.'
        : 'Audio analysis complete. Review the sound observations and practise the model sentence.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Audio analysis failed. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const speakModel = (text: string) => {
    if (!('speechSynthesis' in window) || !text.trim()) {
      setError('Model audio is not available in this browser. Try Chrome or Edge.');
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.88;
    const voices = window.speechSynthesis.getVoices();
    utterance.voice = voices.find(voice => voice.lang.toLowerCase().startsWith('en') && /natural|google|samantha|daniel/i.test(voice.name))
      || voices.find(voice => voice.lang.toLowerCase().startsWith('en')) || null;
    window.speechSynthesis.speak(utterance);
  };

  return <section className="mt-6 rounded-3xl border border-indigo-100 bg-white p-5 shadow-sm sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><div className="flex items-center gap-2 text-xs font-extrabold tracking-[.14em] text-indigo-600"><AudioLines size={15}/> PRONUNCIATION COACH</div>
        <h2 className="mt-2 text-xl font-extrabold text-slate-900">Speak. Listen. Improve.</h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">Record your real voice. The coach listens to the audio itself, then separates sound feedback from grammar and vocabulary feedback.</p>
      </div>
      <span className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700">{track === 'high_school' ? 'High School' : 'Professional'} · {level}</span>
    </div>

    <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr]">
      <div className="rounded-2xl bg-slate-50 p-4">
        <label className="text-xs font-bold text-slate-700">Optional: sentence you want to practise</label>
        <textarea value={targetText} onChange={event => setTargetText(event.target.value)} rows={2} placeholder="Paste a sentence, or leave blank for free speaking..." className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200"/>
        <p className="mt-2 text-[11px] leading-5 text-slate-500">Context: {contextLabel}. If you provide a target sentence, the coach can compare what you intended to say with what it hears.</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {!recording
            ? <button type="button" onClick={startRecording} disabled={analyzing} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"><Mic size={16}/> Record my voice</button>
            : <button type="button" onClick={stopRecording} className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white"><MicOff size={16}/> Stop recording · {seconds}s</button>}
          {recording && <span className="animate-pulse text-xs font-semibold text-rose-600">Recording — speak naturally</span>}
        </div>
        {recordingUrl && <div className="mt-4 rounded-xl bg-white p-3"><div className="mb-2 text-xs font-bold text-slate-600">Your recording · {seconds}s</div><audio controls src={recordingUrl} className="w-full"/></div>}
        <button type="button" onClick={analyse} disabled={!recordingBlob || analyzing || recording} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">
          <Activity size={16}/>{analyzing ? 'Listening carefully to your audio…' : 'Analyse my pronunciation & English'}
        </button>
      </div>
      <div className="rounded-2xl border border-slate-100 p-4">
        <div className="text-sm font-extrabold text-slate-900">What the coach checks</div>
        <ul className="mt-3 space-y-3 text-sm text-slate-600">
          <li><strong className="text-slate-800">Sound production:</strong> final consonants, vowel contrasts, consonant clusters and word stress when audible.</li>
          <li><strong className="text-slate-800">Grammar:</strong> specific sentence errors and clear Vietnamese explanations.</li>
          <li><strong className="text-slate-800">Vocabulary:</strong> more natural or precise expressions for your learning track and CEFR level.</li>
          <li><strong className="text-slate-800">Repeat practice:</strong> a model sentence, audio playback and one focused task for your next attempt.</li>
        </ul>
        <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800">Pronunciation feedback is based on the uploaded recording, not just speech-to-text. If audio quality is insufficient, the coach will say so instead of inventing a score.</p>
      </div>
    </div>

    <div className="mt-5 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><div className="text-xs font-extrabold tracking-wider text-indigo-700">YOUR PRONUNCIATION PROGRESS</div><h3 className="mt-1 text-lg font-extrabold text-slate-900">A practice plan that remembers</h3></div>
        <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-indigo-700">{assessableEntries.length} audio-reviewed {assessableEntries.length === 1 ? 'attempt' : 'attempts'}</span>
      </div>
      <p className="mt-1 text-xs leading-5 text-slate-600">Progress is saved in this browser for this learning track and level. Audio recordings are not saved in your progress history.</p>
      {recurringSoundTargets.length > 0 ? <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {recurringSoundTargets.map((target,index)=><div key={target.ipa || target.word} className="rounded-xl bg-white p-3">
          <div className="flex items-center justify-between"><span className="text-[10px] font-extrabold tracking-wider text-indigo-600">{index === 0 ? 'TOP FOCUS' : 'ALSO PRACTISE'}</span><span className="text-[10px] font-bold text-slate-400">{target.count}× noted</span></div>
          <div className="mt-2 text-base font-extrabold text-slate-900">{target.word} <span className="font-medium text-indigo-600">{target.ipa}</span></div>
          <p className="mt-1 text-xs leading-5 text-slate-600">{target.tip}</p>
          <p className="mt-2 text-[11px] font-semibold text-indigo-700">{track === 'professional' ? 'Workplace speaking drill' : 'School & everyday English drill'} · {level}</p>
        </div>)}
      </div> : <div className="mt-4 rounded-xl bg-white p-4 text-sm text-slate-600">{assessableEntries.length === 0 ? 'Complete an audio assessment to discover which sounds deserve more practice. Unclear recordings are not counted as pronunciation evidence.' : 'No recurring sound target has appeared yet. Keep practising varied sentences to build a useful pattern.'}</div>}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2"><div className="text-xs font-extrabold text-slate-700">RECENT PRACTICE</div><span className="text-[11px] text-slate-500">Up to 40 summaries stored locally</span></div>
      {progressEntries.length > 0 ? <div className="mt-2 space-y-2">
        {progressEntries.slice(0,5).map(entry=><div key={entry.id} className="flex flex-wrap items-start justify-between gap-2 rounded-xl bg-white px-3 py-2.5">
          <div className="min-w-0 flex-1"><div className="text-xs font-bold text-slate-800">{entry.soundTargets.length ? entry.soundTargets.map(target=>target.word).join(' · ') : entry.audioAssessment === 'not_assessable' ? 'Audio needs a clearer recording' : 'Speaking practice'}</div><p className="mt-1 truncate text-xs text-slate-500">{entry.transcript || entry.audioSummary}</p></div>
          <div className="shrink-0 text-right"><div className={'text-[10px] font-extrabold ' + (entry.audioAssessment === 'assessable' ? 'text-emerald-700' : 'text-amber-700')}>{entry.audioAssessment === 'assessable' ? 'REVIEWED' : 'NOT ASSESSABLE'}</div><time className="text-[10px] text-slate-400">{new Date(entry.createdAt).toLocaleDateString()}</time></div>
        </div>)}
      </div> : <p className="mt-2 text-xs text-slate-500">Your completed sessions will appear here.</p>}
    </div>

    {error && <div role="alert" className="mt-4 flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-700"><CircleAlert size={17} className="mt-0.5 shrink-0"/>{error}</div>}
    {notice && <div role="status" className="mt-4 flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 size={17} className="mt-0.5 shrink-0"/>{notice}</div>}

    {report && <div className="mt-5 space-y-4 border-t border-slate-100 pt-5">
      <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-lg font-extrabold text-slate-900">Your coaching report</h3><span className={'rounded-full px-3 py-1.5 text-xs font-bold ' + (report.audioAssessment === 'not_assessable' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800')}>{report.audioAssessment === 'not_assessable' ? 'Audio not clear enough' : 'Audio evidence reviewed'}</span></div>
      {report.transcript && <div className="rounded-xl bg-slate-50 p-4"><div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">What the coach heard</div><p className="mt-2 text-sm font-semibold text-slate-800">{report.transcript}</p></div>}
      {report.audioAssessment !== 'not_assessable' && <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 p-4"><div className="text-xs font-extrabold text-indigo-700">PRONUNCIATION · AUDIO-BASED</div><p className="mt-2 text-sm leading-6 text-slate-700">{report.audioSummary}</p>
          {report.soundTargets.map((item,index)=><div key={index} className="mt-3 border-t border-slate-100 pt-3"><div className="text-sm font-bold text-slate-900">{item.word} <span className="font-normal text-indigo-600">{item.ipa}</span></div><p className="mt-1 text-xs leading-5 text-slate-600">{item.observation}</p><p className="mt-1 text-xs font-semibold text-indigo-700">{item.practiceTipVi}</p></div>)}
        </div>
        <div className="rounded-xl border border-slate-200 p-4"><div className="text-xs font-extrabold text-emerald-700">GRAMMAR & VOCABULARY · TRANSCRIPT</div>
          {report.grammarCorrections.map((item,index)=><div key={index} className="mt-3 border-b border-slate-100 pb-3"><p className="text-xs text-rose-700 line-through">{item.original}</p><p className="mt-1 text-sm font-bold text-emerald-700">{item.correction}</p><p className="mt-1 text-xs leading-5 text-slate-600">{item.explanationVi}</p></div>)}
          {report.vocabularyUpgrades.map((item,index)=><div key={index} className="mt-3"><p className="text-xs text-slate-500">{item.original}</p><p className="text-sm font-bold text-slate-900">{item.upgrade}</p><p className="text-xs leading-5 text-slate-600">{item.whyVi}</p><p className="mt-1 text-xs italic text-indigo-700">{item.example}</p></div>)}
          {!report.grammarCorrections.length && !report.vocabularyUpgrades.length && <p className="mt-3 text-sm text-slate-600">No major grammar or vocabulary issue was found in this transcript.</p>}
        </div>
      </div>}
      {report.audioAssessment === 'not_assessable' && <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">{report.audioSummary}</p>}
      {report.modelSentence && <div className="rounded-2xl bg-indigo-50 p-4"><div className="text-xs font-extrabold text-indigo-700">MODEL SENTENCE · LISTEN & REPEAT</div><p className="mt-2 text-base font-bold text-slate-900">{report.modelSentence}</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={()=>speakModel(report.modelSentence)} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white"><Volume2 size={15}/> Hear model</button>{recordingUrl && <button type="button" onClick={()=>{setReport(null);setNotice('Record your improved attempt and compare the new coaching notes.');}} className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs font-bold text-indigo-700"><RotateCcw size={15}/> Practise again</button>}</div><p className="mt-3 text-xs leading-5 text-indigo-800">{report.repeatTaskVi}</p></div>}
      {report.strengths.length > 0 && <div className="rounded-xl bg-emerald-50 p-4"><div className="text-xs font-extrabold text-emerald-800">WHAT YOU DID WELL</div><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-emerald-900">{report.strengths.map((item,index)=><li key={index}>{item}</li>)}</ul></div>}
    </div>}
  </section>;
}
