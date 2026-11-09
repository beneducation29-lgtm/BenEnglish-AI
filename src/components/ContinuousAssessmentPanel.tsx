import React from 'react';
import { Activity, ArrowDownRight, ArrowUpRight, Minus, Target } from 'lucide-react';
import type { UserProfile } from '../types';
import { buildAdaptiveLearnerSnapshot } from '../services/adaptiveLearning';

type Metric = {
  label: string;
  score: number | null;
  samples: number;
  confidence: string;
  change: number | null;
};

const average = (values: number[]) => values.length
  ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
  : null;

function getTrend(values: number[]): number | null {
  const clean = values.filter(value => Number.isFinite(value) && value >= 0 && value <= 100);
  if (clean.length < 4) return null;
  const midpoint = Math.floor(clean.length / 2);
  return average(clean.slice(midpoint))! - average(clean.slice(0, midpoint))!;
}

function Trend({ change }: { change: number | null }) {
  if (change === null) return <span className="text-xs text-slate-400">Need 4+ attempts</span>;
  if (change > 0) return <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"><ArrowUpRight className="h-3.5 w-3.5" /> +{change} pts</span>;
  if (change < 0) return <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700"><ArrowDownRight className="h-3.5 w-3.5" /> {change} pts</span>;
  return <span className="inline-flex items-center gap-1 text-xs text-slate-500"><Minus className="h-3.5 w-3.5" /> Stable</span>;
}

export const ContinuousAssessmentPanel: React.FC<{ user: UserProfile }> = ({ user }) => {
  const learner = buildAdaptiveLearnerSnapshot(user);
  const listeningHistory = user.listeningProgress?.history || [];
  const speakingHistory = user.speakingProgress?.history || [];
  const listening = listeningHistory.length
    ? listeningHistory.map(item => item.score)
    : (user.recentListeningScores || []);
  const speaking = speakingHistory.length
    ? speakingHistory.map(item => item.score)
    : (user.recentSpeakingScores || []);
  const pronunciation = user.recentPronunciationScores || [];
  const placement = user.placementAssessment;
  const recentAttempts = [
    ...listeningHistory.map(item => ({
      id: item.id,
      title: item.type === 'dictation' ? 'Listening · Dictation' : 'Listening · Comprehension',
      date: item.date,
      score: item.score,
    })),
    ...speakingHistory.map(item => ({
      id: item.id,
      title: `Speaking · ${item.title}`,
      date: item.date,
      score: item.score,
    })),
    ...(user.roleplayProgress?.history || []).map(item => ({
      id: item.id,
      title: `Roleplay · ${item.scenarioTitle}`,
      date: item.date,
      score: item.assessment.overallScore,
    })),
  ].filter(item => Number.isFinite(item.score) && item.score >= 0 && item.score <= 100)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const metrics: Metric[] = [
    { label: 'Listening', score: learner.skillEvidence.listening.score, samples: learner.skillEvidence.listening.samples, confidence: learner.skillEvidence.listening.confidence, change: getTrend(listening) },
    { label: 'Speaking', score: learner.skillEvidence.speaking.score, samples: learner.skillEvidence.speaking.samples, confidence: learner.skillEvidence.speaking.confidence, change: getTrend(speaking) },
    { label: 'Pronunciation', score: learner.skillEvidence.pronunciation.score, samples: learner.skillEvidence.pronunciation.samples, confidence: learner.skillEvidence.pronunciation.confidence, change: getTrend(pronunciation) },
    { label: 'Reading', score: placement?.skills.reading.score ?? null, samples: placement ? 1 : 0, confidence: placement ? 'medium' : 'low', change: null },
  ];

  const assessedCount = metrics.filter(metric => metric.score !== null).length;
  const recommended = learner.recommendedFocus.map(skill => skill.replace(/^./, char => char.toUpperCase())).join(' & ');

  return (
    <section aria-labelledby="continuous-assessment-title" className="rounded-3xl border border-sky-100 bg-gradient-to-br from-white via-sky-50/50 to-indigo-50/60 p-5 shadow-sm sm:p-7">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-700"><Activity className="h-4 w-4" /> Continuous assessment</div>
          <h2 id="continuous-assessment-title" className="mt-1 text-xl font-extrabold text-slate-900">Your progress, based on real attempts</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">Scores and trends are calculated from saved practice results. Skills without enough evidence stay unassessed instead of receiving an estimated score.</p>
        </div>
        <span className="w-fit rounded-full border border-sky-100 bg-white px-3 py-1.5 text-xs font-semibold text-sky-800">{assessedCount}/4 skills assessed</span>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(metric => (
          <div key={metric.label} className="rounded-2xl border border-white bg-white/90 p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-700">{metric.label}</h3>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{metric.confidence} confidence</span>
            </div>
            <div className="mt-3 flex items-end gap-1">
              {metric.score === null ? <span className="text-2xl font-extrabold text-slate-300">—</span> : <><span className="text-3xl font-extrabold tracking-tight text-slate-900">{metric.score}</span><span className="pb-1 text-xs text-slate-400">/100</span></>}
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="text-xs text-slate-500">{metric.samples} saved sample{metric.samples === 1 ? '' : 's'}</span>
              <Trend change={metric.change} />
            </div>
            {metric.score !== null && <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-sky-500" style={{ width: `${Math.max(0, Math.min(100, metric.score))}%` }} /></div>}
          </div>
        ))}
      </div>

      {recentAttempts.length > 0 && (
        <div className="mt-4 rounded-2xl border border-slate-100 bg-white/90 p-4">
          <div className="text-xs font-bold uppercase tracking-wide text-slate-600">Recent assessed attempts</div>
          <ul className="mt-3 divide-y divide-slate-100">
            {recentAttempts.map(item => (
              <li key={item.id} className="flex flex-col gap-1 py-2 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                  <p className="text-xs text-slate-400">{Number.isFinite(new Date(item.date).getTime()) ? new Date(item.date).toLocaleString() : 'Date unavailable'}</p>
                </div>
                <span className="text-sm font-bold tabular-nums text-slate-700">{item.score}/100</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-indigo-100 bg-white/80 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-xl bg-indigo-50 p-2 text-indigo-700"><Target className="h-4 w-4" /></div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-indigo-700">Recommended focus</div>
            <p className="mt-1 text-sm font-semibold text-slate-900">{recommended || 'Complete a few more assessed activities'}</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">{learner.weakAreas[0] || learner.recurringErrors[0] || 'Keep practising across the four skills. The recommendation will become more precise as you save more results.'}</p>
          </div>
        </div>
        <div className="text-xs text-slate-500 sm:max-w-[220px] sm:text-right">{learner.recurringErrors.length ? `${learner.recurringErrors.length} recurring error pattern(s) detected from saved conversation feedback.` : 'No repeated error pattern has been confirmed yet.'}</div>
      </div>
    </section>
  );
};
