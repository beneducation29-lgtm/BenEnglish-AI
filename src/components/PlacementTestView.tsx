import React, { useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Headphones, Loader2, Mic, Play, Sparkles, Volume2 } from 'lucide-react';
import { audioEngine, SpeechRecognitionSession, isSpeechRecognitionSupported } from '../services/speech';
import { evaluatePlacementSpeaking } from '../services/api';
import { CEFRLevel } from '../types';

type Skill = 'listening' | 'reading' | 'understanding';
type Question = { id: string; skill: Skill; prompt: string; options: string[]; answer: number; explanation: string; audio?: string; passage?: string };

const QUESTIONS: Question[] = [
  { id:'l1',skill:'listening',prompt:'What time does the speaker say the meeting starts?',audio:'Hi everyone. Just a quick reminder: our team meeting has moved from nine thirty to ten fifteen tomorrow morning. Please bring your project updates.',options:['9:30 a.m.','10:15 a.m.','Tomorrow afternoon','11:15 a.m.'],answer:1,explanation:'The speaker says the meeting has moved to ten fifteen.' },
  { id:'l2',skill:'listening',prompt:'Why is the woman calling?',audio:'Hello, this is Anna from the travel desk. I am calling because your flight to Singapore has been delayed by two hours. Your new departure time is six forty this evening.',options:['To cancel a hotel','To change a meeting','To explain a flight delay','To confirm a reservation'],answer:2,explanation:'Anna calls to inform the listener about a flight delay.' },
  { id:'l3',skill:'listening',prompt:'What does the man need to do first?',audio:'Before you send the report to the client, please check the figures on page four. The design team has already approved the layout.',options:['Ask the design team','Check the figures','Call the client','Rewrite the report'],answer:1,explanation:'He should check the figures on page four before sending the report.' },
  { id:'l4',skill:'listening',prompt:'What is the main problem?',audio:'I usually take the bus to work, but today the roads are extremely busy because of the heavy rain. I think I will arrive about twenty minutes late.',options:['The bus is broken','The office is closed','The weather is affecting traffic','The speaker forgot the address'],answer:2,explanation:'Heavy rain has caused traffic delays.' },
  { id:'r1',skill:'reading',prompt:'According to the passage, why did Maya start cycling to work?',passage:'Maya used to drive to the office every day. Last year, she decided to cycle instead. She wanted to become more active and reduce the time she spent sitting in traffic. At first, the journey was tiring, but after a few weeks she felt healthier and more energetic.',options:['It was cheaper than walking','She wanted to exercise and avoid traffic','Her office moved closer','She disliked public transport'],answer:1,explanation:'She wanted to be more active and spend less time in traffic.' },
  { id:'r2',skill:'reading',prompt:'What happened after a few weeks?',passage:'Maya used to drive to the office every day. Last year, she decided to cycle instead. She wanted to become more active and reduce the time she spent sitting in traffic. At first, the journey was tiring, but after a few weeks she felt healthier and more energetic.',options:['She bought a car','She stopped cycling','She felt healthier and more energetic','She changed jobs'],answer:2,explanation:'The passage states that she felt healthier and more energetic.' },
  { id:'r3',skill:'reading',prompt:'What is the writer mainly describing?',passage:'Many companies now allow employees to work remotely for part of the week. This can reduce commuting time and give people more flexibility. However, teams need clear communication and agreed expectations to avoid misunderstandings.',options:['The history of office buildings','Benefits and challenges of remote work','How to apply for a new job','Why commuting is becoming faster'],answer:1,explanation:'The passage presents both benefits and challenges of remote work.' },
  { id:'r4',skill:'reading',prompt:'What does “agreed expectations” most nearly mean?',passage:'Many companies now allow employees to work remotely for part of the week. This can reduce commuting time and give people more flexibility. However, teams need clear communication and agreed expectations to avoid misunderstandings.',options:['Rules everyone understands','Unexpected changes','Personal preferences only','Long working hours'],answer:0,explanation:'It means shared understanding about what is expected.' },
  { id:'u1',skill:'understanding',prompt:'Choose the grammatically correct sentence.',options:['She go to school every day.','She goes to school every day.','She going to school every day.','She gone to school every day.'],answer:1,explanation:'With he, she or it in the present simple, add -s to the verb.' },
  { id:'u2',skill:'understanding',prompt:'If I _____ more time, I would learn another language.',options:['have','will have','had','am having'],answer:2,explanation:'The second conditional uses if + past simple, would + base verb.' },
  { id:'u3',skill:'understanding',prompt:'Which word is closest in meaning to “reliable”?',options:['Dependable','Expensive','Temporary','Confusing'],answer:0,explanation:'Reliable means someone or something can be trusted or depended on.' },
  { id:'u4',skill:'understanding',prompt:'Choose the best connector: “The task was difficult; _____, we completed it on time.”',options:['because','however','unless','for example'],answer:1,explanation:'However introduces a contrast between difficulty and successful completion.' },
];

const levelForScore = (score: number): CEFRLevel => {
  if (score <= 25) return 'A1';
  if (score <= 45) return 'A2';
  if (score <= 65) return 'B1';
  if (score <= 82) return 'B2';
  return 'C1';
};

interface Props {
  onComplete: (assessment: {
    completedAt: string;
    overallLevel: CEFRLevel;
    skills: Record<'listening'|'speaking'|'reading'|'understanding', { score: number; level: CEFRLevel; evidence: string }>;
    strengths: string[];
    priorities: string[];
    speakingFeedback: string;
  }) => void;
  onClose: () => void;
}

export const PlacementTestView: React.FC<Props> = ({ onComplete, onClose }) => {
  const [stage,setStage] = useState<'intro'|'quiz'|'speaking'|'result'>('intro');
  const [index,setIndex] = useState(0);
  const [answers,setAnswers] = useState<Record<string,number>>({});
  const [speakingText,setSpeakingText] = useState('');
  const [listeningPlayed,setListeningPlayed] = useState<Record<string,boolean>>({});
  const [recording,setRecording] = useState(false);
  const [evaluating,setEvaluating] = useState(false);
  const [error,setError] = useState('');
  const [assessment,setAssessment] = useState<any>(null);
  const recognitionRef = useRef<SpeechRecognitionSession|null>(null);
  const current = QUESTIONS[index];
  const answered = answers[current?.id] !== undefined;
  const skillLabels: Record<Skill,string> = { listening:'Listening',reading:'Reading',understanding:'Use of English' };
  const counts = useMemo(()=>({listening:4,reading:4,understanding:4}),[]);

  const playAudio = () => {
    if (!current?.audio) return;
    audioEngine.speak(current.audio,{rate:0.92,onEnd:()=>setListeningPlayed(p=>({...p,[current.id]:true}))});
  };

  const startSpeaking = () => {
    setError('');
    if (!isSpeechRecognitionSupported()) {
      setError('Trình duyệt chưa hỗ trợ nhận diện giọng nói. Bạn có thể nhập câu trả lời bên dưới.');
      return;
    }
    const session = new SpeechRecognitionSession(
      state => setSpeakingText(state.transcript),
      message => setError(message),
      active => setRecording(active),
    );
    recognitionRef.current = session;
    setSpeakingText('');
    session.start();
    setRecording(true);
  };

  const stopSpeaking = () => {
    recognitionRef.current?.stop(text => { setSpeakingText(text); setRecording(false); });
  };

  const finishSpeaking = async () => {
    if (speakingText.trim().length < 12) {
      setError('Hãy nói hoặc nhập ít nhất một vài câu để AI có đủ dữ liệu đánh giá.');
      return;
    }
    setEvaluating(true); setError('');
    try {
      const speaking = await evaluatePlacementSpeaking({ prompt:'Describe a skill you would like to learn and explain why it is important to you. Give examples and speak for about 45–60 seconds.', transcript:speakingText, track:'general' });
      const skillScores = {
        listening: Math.round(Object.values(answers).filter((_,i)=>QUESTIONS[i]?.skill==='listening').length / counts.listening * 100),
        reading: Math.round(Object.entries(answers).filter(([id,v])=>QUESTIONS.find(q=>q.id===id)?.skill==='reading' && QUESTIONS.find(q=>q.id===id)?.answer===v).length / counts.reading * 100),
        understanding: Math.round(Object.entries(answers).filter(([id,v])=>QUESTIONS.find(q=>q.id===id)?.skill==='understanding' && QUESTIONS.find(q=>q.id===id)?.answer===v).length / counts.understanding * 100),
      };
      // Count listening answers against their own answer key; never infer a score from an unplayed item.
      skillScores.listening = Math.round(QUESTIONS.filter(q=>q.skill==='listening' && answers[q.id]===q.answer).length / counts.listening * 100);
      const skills = {
        listening:{score:skillScores.listening,level:levelForScore(skillScores.listening),evidence:'4 short audio-comprehension questions'},
        reading:{score:skillScores.reading,level:levelForScore(skillScores.reading),evidence:'4 reading-comprehension questions'},
        understanding:{score:skillScores.understanding,level:levelForScore(skillScores.understanding),evidence:'4 grammar and vocabulary questions'},
        speaking:{score:speaking.score,level:speaking.cefrLevel as CEFRLevel,evidence:'AI review of your spoken-response transcript'},
      };
      const scores = Object.values(skills).map(s=>s.score);
      const average = Math.round(scores.reduce((a,b)=>a+b,0)/scores.length);
      const result = {
        completedAt:new Date().toISOString(),
        overallLevel:levelForScore(average),
        skills,
        strengths:speaking.strengths || [],
        priorities:speaking.priorities || [],
        speakingFeedback:speaking.feedback || '',
      };
      setAssessment(result); setStage('result');
    } catch (e:any) {
      setError(e?.message || 'Không thể đánh giá bài nói lúc này. Vui lòng thử lại.');
    } finally { setEvaluating(false); }
  };

  if (stage==='intro') return <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/60 p-3 sm:p-6"><div className="mx-auto my-6 max-w-3xl rounded-3xl bg-white p-6 shadow-2xl sm:p-9"><div className="flex justify-between"><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">BENENGLISH · PLACEMENT</span><button onClick={onClose} className="text-slate-400">✕</button></div><div className="mt-7 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"><Sparkles className="h-7 w-7"/></div><h2 className="mt-5 text-3xl font-extrabold text-slate-900">Discover your English level</h2><p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">A short diagnostic across Listening, Reading, Use of English and Speaking. Your results create a starting profile; the AI tutor will keep refining it as you learn.</p><div className="mt-7 grid gap-3 sm:grid-cols-2">{[['Listening','4 short audio questions',Headphones],['Reading','4 comprehension questions',BookOpen],['Understanding','4 grammar and vocabulary questions',CheckCircle2],['Speaking','A 45–60 second spoken response',Mic]].map(([title,desc,Icon]:any)=><div key={title} className="rounded-2xl border border-slate-200 p-4"><Icon className="h-5 w-5 text-indigo-600"/><div className="mt-2 font-bold text-slate-900">{title}</div><div className="mt-1 text-xs text-slate-500">{desc}</div></div>)}</div><p className="mt-5 text-xs leading-5 text-slate-500">About 8–12 minutes. Use headphones for Listening. Microphone access is optional if you prefer to type your speaking response. This is an indicative placement check, not an official CEFR certificate.</p><button onClick={()=>setStage('quiz')} className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3.5 font-bold text-white hover:bg-indigo-700">Start placement test <ArrowRight className="h-4 w-4"/></button></div></div>;

  if (stage==='quiz') return <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/60 p-3 sm:p-6"><div className="mx-auto my-6 max-w-3xl rounded-3xl bg-white p-6 shadow-2xl sm:p-9"><div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wider text-indigo-600">{skillLabels[current.skill]} · Question {index+1} of {QUESTIONS.length}</span><button onClick={()=>{audioEngine.stop();onClose();}} className="text-slate-400">✕</button></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-600 transition-all" style={{width:`${(index+1)/QUESTIONS.length*100}%`}}/></div>{current.passage&&<div className="mt-6 rounded-2xl bg-slate-50 p-5 text-sm leading-7 text-slate-700">{current.passage}</div>}{current.audio&&<div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-5"><div className="text-xs font-bold uppercase text-blue-700">Listen carefully · Audio only</div><button onClick={playAudio} className="mt-3 inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-bold text-white"><Volume2 className="h-4 w-4"/> Play audio</button><span className="ml-3 text-xs text-blue-700">{listeningPlayed[current.id]?'Audio played':'Play before answering'}</span></div>}<h2 className="mt-7 text-xl font-bold text-slate-900">{current.prompt}</h2><div className="mt-5 space-y-3">{current.options.map((option,i)=><button key={option} onClick={()=>setAnswers(p=>({...p,[current.id]:i}))} className={`w-full rounded-xl border p-4 text-left text-sm transition ${answers[current.id]===i?'border-indigo-500 bg-indigo-50 text-indigo-900':'border-slate-200 hover:border-indigo-300'}`}><span className="mr-3 inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-bold">{String.fromCharCode(65+i)}</span>{option}</button>)}</div><div className="mt-8 flex justify-between"><button disabled={index===0} onClick={()=>setIndex(i=>i-1)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold disabled:opacity-30">Back</button><button disabled={!answered || (current.skill==='listening'&&!listeningPlayed[current.id])} onClick={()=>index===QUESTIONS.length-1?setStage('speaking'):setIndex(i=>i+1)} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-40">Continue <ArrowRight className="h-4 w-4"/></button></div></div></div>;

  if (stage==='speaking') return <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/60 p-3 sm:p-6"><div className="mx-auto my-6 max-w-3xl rounded-3xl bg-white p-6 shadow-2xl sm:p-9"><div className="text-xs font-bold uppercase tracking-wider text-indigo-600">Speaking · Final section</div><h2 className="mt-4 text-2xl font-extrabold text-slate-900">Tell us about a skill you want to learn</h2><p className="mt-3 text-sm leading-7 text-slate-600">Describe a skill you would like to learn and explain why it is important to you. Give examples and speak for about 45–60 seconds.</p><div className="mt-6 flex flex-wrap gap-3"><button onClick={recording?stopSpeaking:startSpeaking} className={`inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white ${recording?'bg-rose-600':'bg-indigo-600'}`}><Mic className="h-4 w-4"/>{recording?'Stop recording':'Record my answer'}</button><span className="self-center text-xs text-slate-500">{recording?'Listening… speak naturally':'Microphone is optional'}</span></div><textarea value={speakingText} onChange={e=>setSpeakingText(e.target.value)} rows={6} placeholder="Your spoken transcript appears here. You can also type your answer…" className="mt-5 w-full rounded-2xl border border-slate-200 p-4 text-sm leading-6 outline-none focus:border-indigo-400"/>{error&&<p role="alert" className="mt-3 text-sm text-rose-600">{error}</p>}<button disabled={evaluating||speakingText.trim().length<12} onClick={finishSpeaking} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3.5 font-bold text-white disabled:opacity-50">{evaluating?<><Loader2 className="h-4 w-4 animate-spin"/>Assessing your level…</>:<>Complete assessment <ArrowRight className="h-4 w-4"/></>}</button><button onClick={()=>setStage('quiz')} className="mt-3 w-full text-sm text-slate-500">Back to previous section</button></div></div>;

  return <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/60 p-3 sm:p-6"><div className="mx-auto my-6 max-w-3xl rounded-3xl bg-white p-6 shadow-2xl sm:p-9"><div className="flex items-center gap-2 text-emerald-700"><CheckCircle2 className="h-5 w-5"/><span className="text-xs font-bold uppercase tracking-wider">Assessment complete</span></div><h2 className="mt-4 text-3xl font-extrabold text-slate-900">Your starting profile</h2><p className="mt-2 text-sm text-slate-600">These are provisional estimates from this short diagnostic. Your tutor will refine them using future learning evidence.</p><div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">{Object.entries(assessment.skills).map(([skill,value]:any)=><div key={skill} className="rounded-2xl border border-slate-200 p-4"><div className="text-xs capitalize text-slate-500">{skill}</div><div className="mt-2 text-2xl font-extrabold text-indigo-700">{value.level}</div><div className="mt-1 text-xs text-slate-500">{value.score}/100</div></div>)}</div><div className="mt-5 rounded-2xl bg-indigo-50 p-5"><div className="text-xs font-bold uppercase text-indigo-700">Overall starting level</div><div className="mt-1 text-4xl font-extrabold text-indigo-900">{assessment.overallLevel}</div><p className="mt-3 text-sm leading-6 text-indigo-900">{assessment.speakingFeedback}</p></div>{assessment.priorities?.length>0&&<div className="mt-5"><div className="font-bold text-slate-900">Recommended focus</div><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">{assessment.priorities.map((x:string)=><li key={x}>{x}</li>)}</ul></div>}<button onClick={()=>{onComplete(assessment);audioEngine.stop();}} className="mt-7 w-full rounded-xl bg-indigo-600 px-5 py-3.5 font-bold text-white">Save profile and build my learning path</button></div></div>;
};
