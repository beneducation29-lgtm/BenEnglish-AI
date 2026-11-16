import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { ALL_CURRICULUM_UNITS, CurriculumUnit } from '../data/lessonBank';
import { BookOpen, Clock3, ChevronDown, ChevronUp, Headphones, Mic, PenLine, Search, GraduationCap, BriefcaseBusiness } from 'lucide-react';

const skillLabels: Record<string, string> = {
  listening: 'Listening', reading: 'Reading', vocabulary: 'Vocabulary',
  grammar: 'Grammar', speaking: 'Speaking', writing: 'Writing', assessment: 'Assessment',
};
const labLabels: Record<string, string> = {
  listening: 'listening', reading: 'reading-writing', vocabulary: 'vocabulary',
  grammar: 'vocabulary', speaking: 'speaking', writing: 'reading-writing', assessment: 'exam',
};

export const LessonBankView: React.FC = () => {
  const { user, setActiveTab } = useApp();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const isSchool = user.track === 'high_school';
  const units = useMemo(() => ALL_CURRICULUM_UNITS.filter((unit) => {
    if (unit.track !== user.track) return false;
    if (isSchool && unit.grade !== user.grade) return false;
    if (!isSchool && unit.level !== user.cefrLevel) return false;
    const q = query.trim().toLowerCase();
    return !q || [unit.title, unit.description, unit.category, ...unit.vocabularyFocus, ...unit.grammarFocus]
      .some((value) => value.toLowerCase().includes(q));
  }), [user.track, user.grade, user.cefrLevel, query, isSchool]);
  const totalLessons = units.reduce((sum, unit) => sum + unit.steps.length, 0);
  const accent = isSchool ? 'sky' : 'violet';

  return (
    <section className="mb-10 space-y-5">
      <div className={`rounded-3xl border p-6 sm:p-8 ${isSchool ? 'border-sky-200 bg-gradient-to-r from-sky-50 to-white' : 'border-violet-200 bg-gradient-to-r from-violet-50 to-white'}`}>
        <div className={`mb-2 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider ${isSchool ? 'text-sky-700' : 'text-violet-700'}`}>
          {isSchool ? <GraduationCap className="h-4 w-4" /> : <BriefcaseBusiness className="h-4 w-4" />}
          Structured curriculum · Phase 1
        </div>
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">{isSchool ? 'High School Lesson Bank' : 'Professional Lesson Bank'}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{isSchool
              ? `Grade-specific units for ${user.grade || 'Grade 11'}, connecting school themes with all four skills, vocabulary, grammar and assessment.`
              : `CEFR ${user.cefrLevel} workplace units with practical communication tasks, role-based language and integrated skills.`}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="rounded-xl bg-white px-4 py-3 shadow-sm"><div className="text-2xl font-extrabold text-slate-900">{units.length}</div><div className="text-[10px] font-bold uppercase text-slate-500">Units shown</div></div>
            <div className="rounded-xl bg-white px-4 py-3 shadow-sm"><div className="text-2xl font-extrabold text-slate-900">{totalLessons}</div><div className="text-[10px] font-bold uppercase text-slate-500">Learning steps</div></div>
          </div>
        </div>
        <div className="relative mt-5">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search topics, vocabulary or grammar..." className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-sky-300" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {units.map((unit: CurriculumUnit, index) => {
          const isOpen = expanded === unit.id;
          const duration = unit.steps.reduce((sum, step) => sum + step.minutes, 0);
          return (
            <article key={unit.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <button type="button" onClick={() => setExpanded(isOpen ? null : unit.id)} aria-expanded={isOpen} className="w-full p-5 text-left transition hover:bg-slate-50">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-500"><span>{unit.category}</span><span>·</span><span>CEFR {unit.level}</span></div>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${isSchool ? 'bg-sky-50 text-sky-700' : 'bg-violet-50 text-violet-700'}`}>{String(index + 1).padStart(2,'0')}</span>
                </div>
                <h3 className="mt-3 text-lg font-bold text-slate-900">{unit.title}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">{unit.description}</p>
                <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" /> {unit.steps.length} steps</span>
                  <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" /> {duration} min</span>
                  {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </button>
              {isOpen && <div className="space-y-4 border-t border-slate-100 p-5">
                <div><h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">Learning outcomes</h4><ul className="mt-2 space-y-1">{unit.outcomes.map((outcome) => <li key={outcome} className="text-sm text-slate-700">• {outcome}</li>)}</ul></div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-slate-50 p-3"><h4 className="text-xs font-bold text-slate-700">Vocabulary focus</h4><p className="mt-1 text-xs leading-5 text-slate-600">{unit.vocabularyFocus.join(' · ')}</p></div>
                  <div className="rounded-xl bg-slate-50 p-3"><h4 className="text-xs font-bold text-slate-700">Grammar focus</h4><p className="mt-1 text-xs leading-5 text-slate-600">{unit.grammarFocus.join(' · ')}</p></div>
                </div>
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">Lesson sequence</h4>
                  {unit.steps.map((step, stepIndex) => <div key={step.id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${isSchool ? 'bg-sky-50 text-sky-700' : 'bg-violet-50 text-violet-700'}`}>{stepIndex + 1}</span>
                    <div className="min-w-0 flex-1"><div className="text-sm font-semibold text-slate-800">{step.title}</div><div className="text-xs text-slate-500">{skillLabels[step.skill]} · {step.minutes} min</div></div>
                    <button type="button" onClick={() => setActiveTab(step.lab as any)} className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold text-white ${isSchool ? 'bg-sky-600 hover:bg-sky-700' : 'bg-violet-600 hover:bg-violet-700'}`}>Open lab</button>
                  </div>)}
                </div>
              </div>}
            </article>
          );
        })}
      </div>
      {units.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">No units match this search at the selected grade or CEFR level. Try another keyword or update your learning profile.</div>}
      <p className="text-xs leading-5 text-slate-500">Curriculum note: High School themes are mapped to common Grade 10–12 topics and CEFR progression. They are a curated learning framework, not a claim to reproduce every textbook series or an official exhaustive syllabus. Lesson steps open the existing learning labs; full lesson content and assessment packs will be populated in the next phase.</p>
    </section>
  );
};
