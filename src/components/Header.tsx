import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Headphones, Mic, BookOpen, ChevronDown, Flame, Award,
  LayoutDashboard, MessageCircle, Users, AudioLines, Library, BookMarked,
  GraduationCap, BarChart3,
} from 'lucide-react';

const coreLinks = [
  { id: 'listening' as const, label: 'Listen', icon: Headphones },
  { id: 'speaking' as const, label: 'Speak', icon: Mic },
  { id: 'reading-writing' as const, label: 'Read & Write', icon: BookOpen },
];

const moreLinks = [
  { id: 'conversation' as const, label: 'AI Conversation', icon: MessageCircle, description: 'Practice real conversations' },
  { id: 'roleplay' as const, label: 'Roleplay', icon: Users, description: 'Practice real-life situations' },
  { id: 'pronunciation' as const, label: 'Pronunciation', icon: AudioLines, description: 'Train individual sounds' },
  { id: 'library' as const, label: 'Learning Library', icon: Library, description: 'Podcasts and videos' },
  { id: 'vocabulary' as const, label: 'Vocabulary & Grammar', icon: BookMarked, description: 'Words, phrases and grammar' },
  { id: 'exam' as const, label: 'Exam Preparation', icon: GraduationCap, description: 'School exams and IELTS' },
];

export const Header: React.FC = () => {
  const { user, activeTab, setActiveTab, switchTrack } = useApp();
  const [showMore, setShowMore] = useState(false);
  const [showTrackDropdown, setShowTrackDropdown] = useState(false);
  const isMoreActive = moreLinks.some((item) => item.id === activeTab) || activeTab === 'progress';

  const navButton = (id: typeof coreLinks[number]['id'] | 'home', label: string, Icon: React.ElementType) => (
    <button
      key={id}
      onClick={() => { setActiveTab(id); setShowMore(false); }}
      aria-current={activeTab === id ? 'page' : undefined}
      className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
        activeTab === id ? 'bg-emerald-50 text-emerald-800' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </button>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <button onClick={() => setActiveTab('home')} className="flex shrink-0 items-center gap-2.5 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white">
            <Headphones className="h-5 w-5" />
          </span>
          <span className="font-display text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl">
            BenEnglish <span className="text-emerald-600">AI</span>
          </span>
        </button>

        <nav aria-label="Main learning navigation" className="flex min-w-0 flex-1 items-center justify-center gap-1 overflow-x-auto px-1 scrollbar-none">
          {navButton('home', 'Home', LayoutDashboard)}
          {coreLinks.map(({ id, label, icon: Icon }) => navButton(id, label, Icon))}
          <div className="relative shrink-0">
            <button
              onClick={() => setShowMore((value) => !value)}
              aria-expanded={showMore}
              className={`flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                isMoreActive || showMore ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              More <ChevronDown className={`h-4 w-4 transition-transform ${showMore ? 'rotate-180' : ''}`} />
            </button>
            {showMore && (
              <>
                <button aria-label="Close menu" className="fixed inset-0 z-40 cursor-default" onClick={() => setShowMore(false)} />
                <div className="absolute right-0 z-50 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                  <p className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">More learning tools</p>
                  {moreLinks.map(({ id, label, icon: Icon, description }) => (
                    <button key={id} onClick={() => { setActiveTab(id); setShowMore(false); }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-slate-50 ${activeTab === id ? 'bg-emerald-50 text-emerald-800' : 'text-slate-700'}`}>
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="min-w-0"><span className="block text-sm font-semibold">{label}</span><span className="block text-[11px] text-slate-500">{description}</span></span>
                    </button>
                  ))}
                  <div className="my-2 border-t border-slate-100" />
                  <button onClick={() => { setActiveTab('progress'); setShowMore(false); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-slate-700 hover:bg-slate-50">
                    <BarChart3 className="h-4 w-4" /><span className="text-sm font-semibold">My progress</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <div className="hidden items-center gap-1.5 text-xs font-semibold text-amber-600 xl:flex">
            <Flame className="h-4 w-4 fill-amber-500" /> {user.streakDays}d
          </div>
          <div className="relative">
            <button onClick={() => setShowTrackDropdown((value) => !value)} className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="hidden lg:inline">{user.track === 'high_school' ? 'High School' : 'Professional'}</span>
              <span className="lg:hidden">Track</span>
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {showTrackDropdown && (
              <div className="absolute right-0 z-50 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                <button onClick={() => { switchTrack('high_school'); setShowTrackDropdown(false); }} className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50">
                  <span className="block font-semibold">High School English</span><span className="text-xs text-slate-500">Grades 10–12, school exams and IELTS</span>
                </button>
                <button onClick={() => { switchTrack('professional'); setShowTrackDropdown(false); }} className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50">
                  <span className="block font-semibold">Professional English</span><span className="text-xs text-slate-500">Workplace and business communication</span>
                </button>
              </div>
            )}
          </div>
          <button onClick={() => setActiveTab('progress')} aria-label="My progress" className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white hover:bg-slate-700">
            <Award className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-1.5 text-center text-[10px] font-medium text-slate-500 sm:hidden">
        {user.track === 'high_school' ? 'High School English' : 'Professional English'} · {user.cefrLevel} · {user.totalXp} XP
      </div>
    </header>
  );
};
