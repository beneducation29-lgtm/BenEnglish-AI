import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import {
  Headphones, Mic, BookOpen, ChevronDown, Flame,
  LayoutDashboard, MessageCircle, Users, AudioLines, Library, BookMarked,
  GraduationCap, BarChart3, LogIn, LogOut,
} from 'lucide-react';

const coreLinks = [
  { id: 'listening' as const, label: 'Listen', icon: Headphones },
  { id: 'reading-writing' as const, label: 'Read & Write', icon: BookOpen },
];

const speakLinks = [
  { id: 'speaking' as const, label: 'Speaking practice', icon: Mic, description: 'Read aloud, shadow and speak freely' },
  { id: 'conversation' as const, label: 'AI Conversation', icon: MessageCircle, description: 'Talk naturally with your AI tutor' },
  { id: 'roleplay' as const, label: 'Roleplay', icon: Users, description: 'Practise real-life situations' },
  { id: 'pronunciation' as const, label: 'Pronunciation', icon: AudioLines, description: 'Train sounds and difficult words' },
];

const moreLinks = [
  { id: 'library' as const, label: 'Learning Library', icon: Library, description: 'Podcasts and videos' },
  { id: 'vocabulary' as const, label: 'Vocabulary & Grammar', icon: BookMarked, description: 'Words, phrases and grammar' },
  { id: 'exam' as const, label: 'Exam Preparation', icon: GraduationCap, description: 'School exams and IELTS' },
];

export const Header: React.FC = () => {
  const { user, activeTab, setActiveTab, switchTrack } = useApp();
  const { authUser, isGoogleAuthConfigured, signInWithGoogle, signOut } = useAuth();
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);
  const [showTrackDropdown, setShowTrackDropdown] = useState(false);
  const [showSpeak, setShowSpeak] = useState(false);
  const isHighSchool = user.track === 'high_school';
  const theme = isHighSchool
    ? { accent: 'text-sky-700', logo: 'bg-sky-600', logoText: 'text-sky-600', focus: 'focus-visible:ring-sky-500', active: 'bg-sky-50 text-sky-800', dot: 'bg-sky-500', border: 'border-sky-200', panel: 'bg-sky-50', hover: 'hover:bg-sky-50' }
    : { accent: 'text-violet-700', logo: 'bg-violet-600', logoText: 'text-violet-600', focus: 'focus-visible:ring-violet-500', active: 'bg-violet-50 text-violet-800', dot: 'bg-violet-500', border: 'border-violet-200', panel: 'bg-violet-50', hover: 'hover:bg-violet-50' };
  const isMoreActive = moreLinks.some((item) => item.id === activeTab) || activeTab === 'progress';
  const isSpeakActive = speakLinks.some((item) => item.id === activeTab);

  const navButton = (id: typeof coreLinks[number]['id'] | 'home', label: string, Icon: React.ElementType) => (
    <button
      key={id}
      onClick={() => { setActiveTab(id); setShowMore(false); }}
      aria-current={activeTab === id ? 'page' : undefined}
      className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
        activeTab === id ? theme.active : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </button>
  );

  return (
    <header className={`sticky top-0 z-50 border-b ${theme.border} bg-white/95 backdrop-blur-md transition-colors duration-300`}>
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <button onClick={() => setActiveTab('home')} className={`flex shrink-0 items-center gap-2.5 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 ${theme.focus}`}>
          <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${theme.logo} text-white`}>
            <Headphones className="h-5 w-5" />
          </span>
          <span className="font-display text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl">
            BenEnglish <span className={theme.logoText}>AI</span>
          </span>
        </button>

        <nav aria-label="Main learning navigation" className="flex min-w-0 flex-1 items-center justify-center gap-1 overflow-x-auto px-1 scrollbar-none">
          {navButton('home', 'Home', LayoutDashboard)}
          {coreLinks.map(({ id, label, icon: Icon }) => navButton(id, label, Icon))}
          <div className="relative shrink-0">
            <button
              onClick={() => { setShowSpeak((value) => !value); setShowMore(false); }}
              aria-expanded={showSpeak}
              className={`flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${isSpeakActive || showSpeak ? theme.active : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <Mic className="h-4 w-4" /> Speak <ChevronDown className={`h-4 w-4 transition-transform ${showSpeak ? 'rotate-180' : ''}`} />
            </button>
            {showSpeak && (
              <>
                <button aria-label="Close speaking menu" className="fixed inset-0 z-40 cursor-default" onClick={() => setShowSpeak(false)} />
                <div className="absolute left-0 z-50 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                  <p className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">One place for speaking practice</p>
                  {speakLinks.map(({ id, label, icon: Icon, description }) => (
                    <button key={id} onClick={() => { setActiveTab(id); setShowSpeak(false); }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-slate-50 ${activeTab === id ? theme.active : 'text-slate-700'}`}>
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="min-w-0"><span className="block text-sm font-semibold">{label}</span><span className="block text-[11px] text-slate-500">{description}</span></span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
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
                    <button key={id} onClick={() => { setActiveTab(id); setShowMore(false); setShowSpeak(false); }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-slate-50 ${activeTab === id ? theme.active : 'text-slate-700'}`}>
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
          <div className="relative">
            {authUser ? (
              <button
                onClick={async () => { try { await signOut(); setAuthMessage(null); } catch { setAuthMessage('Could not sign out. Please try again.'); } }}
                className={`flex max-w-[190px] items-center gap-2 rounded-xl border ${theme.border} ${theme.panel} px-2.5 py-2 text-xs font-semibold ${theme.accent} ${theme.hover}`}
                title={authUser.email || 'Signed in with Google'}
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">{(authUser.displayName || authUser.email || 'G').charAt(0).toUpperCase()}</span>
                <span className="hidden max-w-[105px] truncate sm:inline">{authUser.displayName || authUser.email}</span>
                <LogOut className="h-3.5 w-3.5 shrink-0" />
              </button>
            ) : (
              <button
                onClick={async () => { try { setAuthMessage(null); await signInWithGoogle(); } catch (error: any) { setAuthMessage(error?.message || 'Google sign-in could not be completed.'); } }}
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700"
                title="Sign in with your Google account"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Continue with Google</span>
                <span className="sm:hidden">Google</span>
              </button>
            )}
            {authMessage && <div role="status" className="absolute right-0 top-full z-[60] mt-2 w-64 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-900 shadow-lg">{authMessage}</div>}
          </div>
          <div className="hidden items-center gap-1.5 text-xs font-semibold text-amber-600 xl:flex">
            <Flame className="h-4 w-4 fill-amber-500" /> {user.streakDays}d
          </div>
          <div className="relative">
            <button onClick={() => setShowTrackDropdown((value) => !value)} aria-label="Switch learning track" aria-expanded={showTrackDropdown} className={`flex items-center gap-1.5 rounded-xl border ${theme.border} ${theme.panel} px-2.5 py-2 text-xs font-semibold ${theme.accent} transition-colors`}>
              <span className={`h-2 w-2 rounded-full ${theme.dot}`} />
              <span className="hidden lg:inline">{isHighSchool ? 'High School English' : 'Professional English'}</span>
              <span className="lg:hidden">Track</span>
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {showTrackDropdown && (
              <div className="absolute right-0 z-50 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                <p className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Choose your learning experience</p>
                <button onClick={() => { switchTrack('high_school'); setShowTrackDropdown(false); }} aria-pressed={isHighSchool} className={`w-full rounded-xl border p-3 text-left transition-colors ${isHighSchool ? 'border-sky-300 bg-sky-50' : 'border-transparent hover:bg-slate-50'}`}>
                  <span className="flex items-center justify-between"><span className="font-bold text-sky-800">High School English</span>{isHighSchool && <span className="rounded-full bg-sky-600 px-2 py-0.5 text-[9px] font-bold text-white">ACTIVE</span>}</span>
                  <span className="mt-1 block text-xs text-slate-600">Grades 10–12 · School curriculum · Exams · Academic English</span>
                </button>
                <button onClick={() => { switchTrack('professional'); setShowTrackDropdown(false); }} aria-pressed={!isHighSchool} className={`mt-2 w-full rounded-xl border p-3 text-left transition-colors ${!isHighSchool ? 'border-violet-300 bg-violet-50' : 'border-transparent hover:bg-slate-50'}`}>
                  <span className="flex items-center justify-between"><span className="font-bold text-violet-800">Professional English</span>{!isHighSchool && <span className="rounded-full bg-violet-600 px-2 py-0.5 text-[9px] font-bold text-white">ACTIVE</span>}</span>
                  <span className="mt-1 block text-xs text-slate-600">Workplace · Business communication · Industry English</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className={`border-t border-slate-100 ${theme.panel} px-4 py-1.5 text-center text-[10px] font-semibold ${theme.accent} sm:hidden`}>
        {user.track === 'high_school' ? 'High School English' : 'Professional English'} · {user.cefrLevel} · {user.totalXp} XP
      </div>
    </header>
  );
};
