import React, { useMemo, useRef, useState } from 'react';
import { ArrowRight, BookOpen, CheckCircle2, Headphones, Loader2, Mic, Sparkles, Volume2 } from 'lucide-react';
import { audioEngine, SpeechRecognitionSession, isSpeechRecognitionSupported } from '../services/speech';
import { evaluatePlacementSpeaking } from '../services/api';
import { CEFRLevel } from '../types';

type Skill = 'listening' | 'reading' | 'understanding';
type Question = { id: string; skill: Skill; prompt: string; options: string[]; answer: number; explanation: string; audio?: string; passage?: string };

const PROFESSIONAL_QUESTIONS: Question[] = [
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

const HIGH_SCHOOL_QUESTIONS: Question[] = [
  { id:'hs-l1',skill:'listening',prompt:'When will the science club meet?',audio:'Good morning, everyone. The science club meeting will take place in Room 204 at a quarter past three on Thursday. Please bring your project notes.',options:['3:00 on Wednesday','3:15 on Thursday','4:15 on Thursday','2:45 on Friday'],answer:1,explanation:'The announcement says the meeting is at 3:15 on Thursday.' },
  { id:'hs-l2',skill:'listening',prompt:'What should students bring to the trip?',audio:'Our visit to the history museum is next Monday. Remember to bring your student card, a notebook and a bottle of water. The school will provide lunch.',options:['Lunch and a camera','A student card, notebook and water','A dictionary and lunch','A map and a notebook'],answer:1,explanation:'Students are asked to bring their student card, notebook and water.' },
  { id:'hs-l3',skill:'listening',prompt:'Why does the teacher change the homework deadline?',audio:'I know you planned to submit the biology report on Friday. Since the laboratory was closed yesterday, you may hand it in next Monday instead.',options:['The teacher is absent','The report topic has changed','The laboratory was closed','Students have an examination'],answer:2,explanation:'The deadline changes because the laboratory was closed.' },
  { id:'hs-l4',skill:'listening',prompt:'What is the main message of the announcement?',audio:'Students who want to join the English speaking contest should register with Ms Lan before the end of this week. The first practice session is scheduled for Tuesday afternoon.',options:['The contest has been cancelled','Students must register this week','The practice session is on Friday','Only teachers can join'],answer:1,explanation:'The announcement asks interested students to register before the end of the week.' },
  { id:'hs-r1',skill:'reading',prompt:'Why did the students create the school garden?',passage:'A group of students started a small garden behind their school. They wanted to learn how plants grow and encourage their classmates to care for the environment. Science teachers helped them choose suitable plants. After one term, the garden became an outdoor learning space.',options:['To sell vegetables','To learn about plants and the environment','To replace the school library','To prepare for a sports event'],answer:1,explanation:'The students created the garden as a practical way to learn about plants and environmental care.' },
  { id:'hs-r2',skill:'reading',prompt:'How did teachers support the project?',passage:'A group of students started a small garden behind their school. They wanted to learn how plants grow and encourage their classmates to care for the environment. Science teachers helped them choose suitable plants. After one term, the garden became an outdoor learning space.',options:['They bought all the equipment','They organised a sports competition','They helped choose suitable plants','They asked students to stop the project'],answer:2,explanation:'Science teachers helped the students select plants for the garden.' },
  { id:'hs-r3',skill:'reading',prompt:'What is the main idea of the passage?',passage:'Many teenagers use online platforms to study English. Videos can help learners hear natural pronunciation, while discussion groups give them opportunities to exchange ideas. However, students should check information carefully and manage their screen time.',options:['Online learning has benefits and requires good habits','Printed books are no longer useful','Teenagers should avoid group work','Pronunciation is not important'],answer:0,explanation:'The passage describes useful features of online learning as well as responsible study habits.' },
  { id:'hs-r4',skill:'reading',prompt:'The word “manage” in the passage is closest in meaning to…',passage:'Many teenagers use online platforms to study English. Videos can help learners hear natural pronunciation, while discussion groups give them opportunities to exchange ideas. However, students should check information carefully and manage their screen time.',options:['Ignore','Control','Increase','Forget'],answer:1,explanation:'Here, “manage” means to control or use screen time carefully.' },
  { id:'hs-u1',skill:'understanding',prompt:'Choose the correct sentence about a school activity.',options:['Our class visit the museum last week.','Our class visited the museum last week.','Our class has visit the museum last week.','Our class visiting the museum last week.'],answer:1,explanation:'A finished action at a specific time in the past uses the past simple: visited.' },
  { id:'hs-u2',skill:'understanding',prompt:'The book _____ I borrowed from the library is very useful.',options:['who','where','which','when'],answer:2,explanation:'Use “which” as the relative pronoun referring to a thing.' },
  { id:'hs-u3',skill:'understanding',prompt:'Which word is closest in meaning to “protect”?',options:['Damage','Keep safe','Discover','Replace'],answer:1,explanation:'“Protect” means to keep someone or something safe.' },
  { id:'hs-u4',skill:'understanding',prompt:'Choose the correct passive sentence: “The students organise the event every year.”',options:['The event is organised every year.','The event organised every year.','The event was organise every year.','The event is organising every year.'],answer:0,explanation:'The present simple passive is formed with am/is/are + past participle.' },
];

const levelForScore = (score: number): CEFRLevel => {
  if (score <= 25) return 'A1';
  if (score <= 50) return 'A2';
  if (score <= 75) return 'B1';
  return 'B2';
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
  track: 'high_school' | 'professional';
  grade?: string;
  occupation?: string;
}

export const PlacementTestView: React.FC<Props> = ({ onComplete, onClose, track, grade, occupation }) => {
  const QUESTIONS = track === 'high_school' ? HIGH_SCHOOL_QUESTIONS : PROFESSIONAL_QUESTIONS;
  const isHighSchool = track === 'high_school';
  const learnerContext = isHighSchool ? (grade || 'Grade 11') : (occupation || 'your profession');
  const speakingPrompt = isHighSchool
    ? 'Describe a school subject, project or activity you find interesting. Explain what you have learned and how it could help you in the future. Give examples and speak for about 45–60 seconds.'
    : 'Describe a challenge you have faced at work or in a professional project. Explain how you approached it, what you learned and what you would do next. Give examples and speak for about 45–60 seconds.';
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
  const counts = useMemo(()=>({listening:QUESTIONS.filter(q=>q.skill==='listening').length,reading:QUESTIONS.filter(q=>q.skill==='reading').length,understanding:QUESTIONS.filter(q=>q.skill==='understanding').length}),[QUESTIONS]);

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
      const speaking = await evaluatePlacementSpeaking({ prompt:speakingPrompt, transcript:speakingText, track });
      const skillScores = {
        listening: Math.round(QUESTIONS.filter(q=>q.skill==='listening' && answers[q.id]===q.answer).length / counts.listening * 100),
        reading: Math.round(QUESTIONS.filter(q=>q.skill==='reading' && answers[q.id]===q.answer).length / counts.reading * 100),
        understanding: Math.round(QUESTIONS.filter(q=>q.skill==='understanding' && answers[q.id]===q.answer).length / counts.understanding * 100),
      };
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

  if (stage==='intro') return <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/60 p-3 sm:p-6"><div className="mx-auto my-6 max-w-3xl rounded-3xl bg-white p-6 shadow-2xl sm:p-9"><div className="flex justify-between"><span className={`rounded-full px-3 py-1 text-xs font-bold ${isHighSchool?'bg-sky-50 text-sky-700':'bg-violet-50 text-violet-700'}`}>BENENGLISH · {isHighSchool?'HIGH SCHOOL':'PROFESSIONAL'} PLACEMENT</span><button onClick={onClose} className="text-slate-400">✕</button></div><div className="mt-7 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"><Sparkles className="h-7 w-7"/></div><h2 className="mt-5 text-3xl font-extrabold text-slate-900">{isHighSchool?'Find your school English starting level':'Find your professional English starting level'}</h2><p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">{isHighSchool?`A diagnostic for ${learnerContext}, using school life, science, learning projects and academic English contexts.`:`A diagnostic for ${learnerContext}, using workplace communication, projects, clients and professional decision-making contexts.`} Listening, Reading, Use of English and Speaking are assessed separately. Your tutor will refine the profile as you learn.</p><div className="mt-7 grid gap-3 sm:grid-cols-2">{[['Listening','4 short audio questions',Headphones],['Reading','4 comprehension questions',BookOpen],['Understanding','4 grammar and vocabulary questions',CheckCircle2],['Speaking','A 45–60 second spoken response',Mic]].map(([title,desc,Icon]:any)=><div key={title} className="rounded-2xl border border-slate-200 p-4"><Icon className="h-5 w-5 text-indigo-600"/><div className="mt-2 font-bold text-slate-900">{title}</div><div className="mt-1 text-xs text-slate-500">{desc}</div></div>)}</div><p className="mt-5 text-xs leading-5 text-slate-500">About 8–12 minutes. Use headphones for Listening. Microphone access is optional if you prefer to type your speaking response. This is an indicative placement check, not an official CEFR certificate.</p><button onClick={()=>setStage('quiz')} className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3.5 font-bold text-white hover:bg-indigo-700">Start placement test <ArrowRight className="h-4 w-4"/></button></div></div>;

  if (stage==='quiz') return <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/60 p-3 sm:p-6"><div className="mx-auto my-6 max-w-3xl rounded-3xl bg-white p-6 shadow-2xl sm:p-9"><div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wider text-indigo-600">{skillLabels[current.skill]} · Question {index+1} of {QUESTIONS.length}</span><button onClick={()=>{audioEngine.stop();onClose();}} className="text-slate-400">✕</button></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-600 transition-all" style={{width:`${(index+1)/QUESTIONS.length*100}%`}}/></div>{current.passage&&<div className="mt-6 rounded-2xl bg-slate-50 p-5 text-sm leading-7 text-slate-700">{current.passage}</div>}{current.audio&&<div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-5"><div className="text-xs font-bold uppercase text-blue-700">Listen carefully · Audio only</div><button onClick={playAudio} className="mt-3 inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-bold text-white"><Volume2 className="h-4 w-4"/> Play audio</button><span className="ml-3 text-xs text-blue-700">{listeningPlayed[current.id]?'Audio played':'Play before answering'}</span></div>}<h2 className="mt-7 text-xl font-bold text-slate-900">{current.prompt}</h2><div className="mt-5 space-y-3">{current.options.map((option,i)=><button key={option} onClick={()=>setAnswers(p=>({...p,[current.id]:i}))} className={`w-full rounded-xl border p-4 text-left text-sm transition ${answers[current.id]===i?'border-indigo-500 bg-indigo-50 text-indigo-900':'border-slate-200 hover:border-indigo-300'}`}><span className="mr-3 inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-bold">{String.fromCharCode(65+i)}</span>{option}</button>)}</div><div className="mt-8 flex justify-between"><button disabled={index===0} onClick={()=>setIndex(i=>i-1)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold disabled:opacity-30">Back</button><button disabled={!answered || (current.skill==='listening'&&!listeningPlayed[current.id])} onClick={()=>index===QUESTIONS.length-1?setStage('speaking'):setIndex(i=>i+1)} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-40">Continue <ArrowRight className="h-4 w-4"/></button></div></div></div>;

  if (stage==='speaking') return <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/60 p-3 sm:p-6"><div className="mx-auto my-6 max-w-3xl rounded-3xl bg-white p-6 shadow-2xl sm:p-9"><div className={`text-xs font-bold uppercase tracking-wider ${isHighSchool?'text-sky-700':'text-violet-700'}`}>Speaking · {isHighSchool?'School English':'Professional English'} · Final section</div><h2 className="mt-4 text-2xl font-extrabold text-slate-900">{isHighSchool?'Talk about a school subject or project':'Talk about a professional challenge'}</h2><p className="mt-3 text-sm leading-7 text-slate-600">{speakingPrompt}</p><div className="mt-6 flex flex-wrap gap-3"><button onClick={recording?stopSpeaking:startSpeaking} className={`inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white ${recording?'bg-rose-600':'bg-indigo-600'}`}><Mic className="h-4 w-4"/>{recording?'Stop recording':'Record my answer'}</button><span className="self-center text-xs text-slate-500">{recording?'Listening… speak naturally':'Microphone is optional'}</span></div><textarea value={speakingText} onChange={e=>setSpeakingText(e.target.value)} rows={6} placeholder="Your spoken transcript appears here. You can also type your answer…" className="mt-5 w-full rounded-2xl border border-slate-200 p-4 text-sm leading-6 outline-none focus:border-indigo-400"/>{error&&<p role="alert" className="mt-3 text-sm text-rose-600">{error}</p>}<button disabled={evaluating||speakingText.trim().length<12} onClick={finishSpeaking} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3.5 font-bold text-white disabled:opacity-50">{evaluating?<><Loader2 className="h-4 w-4 animate-spin"/>Assessing your level…</>:<>Complete assessment <ArrowRight className="h-4 w-4"/></>}</button><button onClick={()=>setStage('quiz')} className="mt-3 w-full text-sm text-slate-500">Back to previous section</button></div></div>;

  return <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/60 p-3 sm:p-6"><div className="mx-auto my-6 max-w-3xl rounded-3xl bg-white p-6 shadow-2xl sm:p-9"><div className="flex items-center gap-2 text-emerald-700"><CheckCircle2 className="h-5 w-5"/><span className="text-xs font-bold uppercase tracking-wider">Assessment complete</span></div><h2 className="mt-4 text-3xl font-extrabold text-slate-900">Your starting profile</h2><p className="mt-2 text-sm text-slate-600">These are provisional estimates from this short diagnostic. Your tutor will refine them using future learning evidence.</p><div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">{Object.entries(assessment.skills).map(([skill,value]:any)=><div key={skill} className="rounded-2xl border border-slate-200 p-4"><div className="text-xs capitalize text-slate-500">{skill}</div><div className="mt-2 text-2xl font-extrabold text-indigo-700">{value.level}</div><div className="mt-1 text-xs text-slate-500">{value.score}/100</div></div>)}</div><div className="mt-5 rounded-2xl bg-indigo-50 p-5"><div className="text-xs font-bold uppercase text-indigo-700">Overall starting level</div><div className="mt-1 text-4xl font-extrabold text-indigo-900">{assessment.overallLevel}</div><p className="mt-3 text-sm leading-6 text-indigo-900">{assessment.speakingFeedback}</p></div>{assessment.priorities?.length>0&&<div className="mt-5"><div className="font-bold text-slate-900">Recommended focus</div><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">{assessment.priorities.map((x:string)=><li key={x}>{x}</li>)}</ul></div>}<button onClick={()=>{onComplete(assessment);audioEngine.stop();}} className="mt-7 w-full rounded-xl bg-indigo-600 px-5 py-3.5 font-bold text-white">Save profile and build my learning path</button></div></div>;
};
