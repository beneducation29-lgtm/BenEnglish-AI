import React from 'react';
import { useApp } from '../context/AppContext';
import { Award, Clock, Headphones, Mic, BookOpen, AlertTriangle } from 'lucide-react';

const MetricCard: React.FC<{ label: string; value: string; detail: string; icon: React.ReactNode }> = ({ label, value, detail, icon }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-2">
    <div className="flex items-center justify-between text-xs text-slate-500"><span>{label}</span>{icon}</div>
    <div className="text-3xl font-extrabold text-slate-900 tabular-nums">{value}</div>
    <p className="text-[11px] text-slate-500">{detail}</p>
  </div>
);

export const ProgressAnalyticsView: React.FC = () => {
  const { user, vocabBank } = useApp();
  const listening = user.listeningProgress;
  const speaking = user.speakingProgress;
  const dictationSamples = listening?.dictationAttemptCount || 0;
  const comprehensionSamples = listening?.comprehensionAttemptCount || 0;
  const listeningSamples = dictationSamples + comprehensionSamples;
  const listeningTotal = (listening?.dictationAccuracyAvg || 0) * dictationSamples + (listening?.comprehensionAccuracyAvg || 0) * comprehensionSamples;
  const listeningAvg = listeningSamples ? Math.round(listeningTotal / listeningSamples) : null;
  const speakingHistory = speaking?.history || [];
  const speakingAvg = speakingHistory.length
    ? Math.round(speakingHistory.reduce((sum, item) => sum + item.score, 0) / speakingHistory.length)
    : null;
  const pronunciationResults = speakingHistory.filter((item) => item.type === 'pronunciation');
  const pronunciationAvg = pronunciationResults.length
    ? Math.round(pronunciationResults.reduce((sum, item) => sum + item.score, 0) / pronunciationResults.length)
    : null;
  const reviewedWords = vocabBank.filter((item) => (item.reviewCount || 0) > 0);
  const totalReviews = reviewedWords.reduce((sum, item) => sum + (item.reviewCount || 0), 0);
  const successReviews = reviewedWords.reduce((sum, item) => sum + (item.successfulReviewCount || 0), 0);
  const retentionRate = totalReviews ? Math.round((successReviews / totalReviews) * 100) : null;
  const weakWords = listening?.misunderstoodVocab || [];
  const recentFeedback = speakingHistory.slice(0, 4);
  const achievements = [
    { title: 'First Listening Assessment', desc: 'Complete one dictation or comprehension assessment.', unlocked: listeningSamples >= 1, icon: '🎧' },
    { title: 'Listening Explorer', desc: 'Complete five listening lessons.', unlocked: (listening?.completedListeningCount || 0) >= 5, icon: '📚' },
    { title: 'Speaking Practice', desc: 'Save five evaluated speaking attempts.', unlocked: speakingHistory.length >= 5, icon: '🎙️' },
    { title: 'Vocabulary Habit', desc: 'Complete twenty vocabulary reviews.', unlocked: totalReviews >= 20, icon: '🧠' },
  ];
  const unlocked = achievements.filter((item) => item.unlocked).length;

  return (
    <div className="space-y-8 pb-16">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="text-xs font-semibold uppercase tracking-wider text-emerald-600 mb-1">PERSONAL LEARNING ANALYTICS · REAL ACTIVITY</div>
        <h1 className="text-2xl font-bold text-slate-900">Your learning evidence</h1>
        <p className="mt-2 text-sm text-slate-500">Only completed activities and saved assessment results are counted. A dash means there is not enough recorded data yet.</p>
        <div className="mt-4 flex flex-wrap gap-3 text-xs">
          <span className="rounded-lg bg-slate-100 px-3 py-2 text-slate-700">Level: {user.cefrLevel}</span>
          <span className="rounded-lg bg-slate-100 px-3 py-2 text-slate-700">XP earned: {user.totalXp}</span>
          <span className="rounded-lg bg-slate-100 px-3 py-2 text-slate-700">Completed lessons: {user.completedLessonIds.length}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricCard label="LISTENING ASSESSMENTS" value={listeningAvg === null ? '—' : `${listeningAvg}%`} detail={`${listeningSamples} recorded assessment(s)`} icon={<Headphones className="w-4 h-4 text-blue-500" />} />
        <MetricCard label="SPEAKING EVALUATIONS" value={speakingAvg === null ? '—' : `${speakingAvg}%`} detail={`${speakingHistory.length} saved evaluation(s)`} icon={<Mic className="w-4 h-4 text-emerald-500" />} />
        <MetricCard label="PRONUNCIATION" value={pronunciationAvg === null ? '—' : `${pronunciationAvg}%`} detail={`${pronunciationResults.length} pronunciation-specific evaluation(s)`} icon={<Award className="w-4 h-4 text-purple-500" />} />
        <MetricCard label="VOCABULARY RETENTION" value={retentionRate === null ? '—' : `${retentionRate}%`} detail={`${totalReviews} actual review(s) · ${reviewedWords.length} word(s) reviewed`} icon={<BookOpen className="w-4 h-4 text-amber-500" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 space-y-4">
          <h2 className="font-bold text-slate-900 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" /> Areas to revisit</h2>
          {weakWords.length ? (
            <div className="space-y-2">{weakWords.slice(0, 8).map((item) => (
              <div key={item.word} className="flex items-center justify-between gap-3 rounded-xl bg-amber-50 p-3 text-sm">
                <div><strong className="text-slate-900">{item.word}</strong><p className="text-xs text-slate-600">{item.meaningVi}</p></div>
                <span className="text-xs font-semibold text-amber-800">{item.count} miss(es)</span>
              </div>
            ))}</div>
          ) : <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No missed listening words have been recorded yet. Complete a dictation exercise to build this list.</p>}
          {recentFeedback.length > 0 && <div className="border-t border-slate-100 pt-3 space-y-2"><h3 className="text-xs font-bold text-slate-600">RECENT SPEAKING FEEDBACK</h3>{recentFeedback.map((item) => <div key={item.id} className="text-sm text-slate-600"><strong className="text-slate-800">{item.title}:</strong> {item.feedbackSummary}</div>)}</div>}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 space-y-4">
          <div className="flex items-center justify-between gap-3"><h2 className="font-bold text-slate-900">Achievements</h2><span className="text-xs font-semibold text-emerald-700">{unlocked}/{achievements.length} unlocked</span></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{achievements.map((item) => (
            <div key={item.title} className={`rounded-2xl border p-4 ${item.unlocked ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200 bg-slate-50 opacity-70'}`}>
              <div className="text-2xl mb-2">{item.icon}</div><strong className="text-sm text-slate-900">{item.title}</strong><p className="mt-1 text-xs text-slate-600">{item.desc}</p>
              <div className="mt-3 border-t border-slate-200/70 pt-2 text-[10px] font-bold uppercase">{item.unlocked ? '✓ Unlocked' : 'Not yet earned'}</div>
            </div>
          ))}</div>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800"><Clock className="w-4 h-4 text-amber-500" /> Recorded study time</div>
        <p className="mt-2 text-2xl font-extrabold text-slate-900">{Math.floor(user.dailyMinutesSpent)} min</p>
        <p className="text-xs text-slate-500">Time is added by measured activity timers or session durations. Listening and speaking totals are not estimated from lesson completion.</p>
      </section>
    </div>
  );
};
