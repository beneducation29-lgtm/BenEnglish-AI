import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Headphones, Mic, Sparkles, BookOpen, User, Flame, Award } from 'lucide-react';

export const Header: React.FC = () => {
  const { user, activeTab, setActiveTab, switchTrack } = useApp();
  const [showTrackDropdown, setShowTrackDropdown] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-16">
          {/* Zone 1: Brand wordmark (single line, no subtitle chips) */}
          <button
            onClick={() => setActiveTab('home')}
            className="flex items-center gap-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-lg group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
              <Headphones className="w-5 h-5" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight text-slate-900 whitespace-nowrap shrink-0">
              BenEnglish <span className="text-emerald-600 font-extrabold">AI</span>
            </span>
          </button>

          {/* Zone 2: 4-5 concise nav links (single line, whitespace-nowrap) */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <button
              onClick={() => setActiveTab('home')}
              className={`whitespace-nowrap shrink-0 transition-colors py-1 ${
                activeTab === 'home'
                  ? 'text-emerald-600 font-semibold border-b-2 border-emerald-600'
                  : 'hover:text-slate-900'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('listening')}
              className={`whitespace-nowrap shrink-0 transition-colors py-1 ${
                activeTab === 'listening'
                  ? 'text-emerald-600 font-semibold border-b-2 border-emerald-600'
                  : 'hover:text-slate-900'
              }`}
            >
              Listening Lab
            </button>
            <button
              onClick={() => setActiveTab('speaking')}
              className={`whitespace-nowrap shrink-0 transition-colors py-1 ${
                activeTab === 'speaking'
                  ? 'text-emerald-600 font-semibold border-b-2 border-emerald-600'
                  : 'hover:text-slate-900'
              }`}
            >
              Speaking Lab
            </button>
            <button
              onClick={() => setActiveTab('conversation')}
              className={`whitespace-nowrap shrink-0 transition-colors py-1 ${
                activeTab === 'conversation'
                  ? 'text-emerald-600 font-semibold border-b-2 border-emerald-600'
                  : 'hover:text-slate-900'
              }`}
            >
              AI Voice Room
            </button>
            <button
              onClick={() => setActiveTab('roleplay')}
              className={`whitespace-nowrap shrink-0 transition-colors py-1 ${
                activeTab === 'roleplay'
                  ? 'text-emerald-600 font-semibold border-b-2 border-emerald-600'
                  : 'hover:text-slate-900'
              }`}
            >
              Roleplay
            </button>
          </nav>

          {/* Zone 3: 1 Primary Action (Track switch & Profile quick bar) */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Quick stats unboxed */}
            <div className="hidden lg:flex items-center gap-3 text-xs text-slate-600 font-medium">
              <span className="flex items-center gap-1 text-amber-600 font-semibold">
                <Flame className="w-4 h-4 fill-amber-500" />
                {user.streakDays}d streak
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span className="tabular-nums">{user.totalXp} XP</span>
            </div>

            {/* Track Switcher Button */}
            <div className="relative">
              <button
                onClick={() => setShowTrackDropdown(!showTrackDropdown)}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100 hover:border-slate-300 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow-xs"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>
                  {user.track === 'high_school' ? 'High School Track' : 'Professional Track'}
                </span>
                <span className="text-slate-400 text-[10px]">▼</span>
              </button>

              {showTrackDropdown && (
                <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-lg py-2 z-50">
                  <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Switch Learning Track
                  </div>
                  <button
                    onClick={() => {
                      switchTrack('high_school');
                      setShowTrackDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex flex-col gap-0.5 hover:bg-slate-50 ${
                      user.track === 'high_school' ? 'bg-emerald-50 text-emerald-900 font-medium' : 'text-slate-700'
                    }`}
                  >
                    <span className="font-semibold">Track A: High School English</span>
                    <span className="text-[11px] text-slate-500">Grades 10-12, School Exams & IELTS</span>
                  </button>
                  <button
                    onClick={() => {
                      switchTrack('professional');
                      setShowTrackDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex flex-col gap-0.5 hover:bg-slate-50 ${
                      user.track === 'professional' ? 'bg-emerald-50 text-emerald-900 font-medium' : 'text-slate-700'
                    }`}
                  >
                    <span className="font-semibold">Track B: Professional English</span>
                    <span className="text-[11px] text-slate-500">Workplace, Meetings, Interviews & Business</span>
                  </button>
                </div>
              )}
            </div>

            {/* Progress CTA */}
            <button
              onClick={() => setActiveTab('progress')}
              className="px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
            >
              <Award className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">My Progress</span>
            </button>
          </div>
        </div>
      </div>

      {/* Secondary Sub-nav for Deep Labs (Mobile & Secondary Hubs) */}
      <div className="bg-slate-50/90 border-t border-slate-200/80 px-4 sm:px-6 lg:px-8 py-2 overflow-x-auto scrollbar-none">
        <div className="max-w-7xl mx-auto flex items-center gap-2 text-xs">
          <span className="text-slate-400 font-medium whitespace-nowrap shrink-0 pr-1">
            Learning Studios:
          </span>
          <button
            onClick={() => setActiveTab('pronunciation')}
            className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'pronunciation'
                ? 'bg-white text-emerald-700 font-semibold shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            IPA Pronunciation Studio
          </button>
          <button
            onClick={() => setActiveTab('library')}
            className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'library'
                ? 'bg-white text-emerald-700 font-semibold shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Podcast & Video Library
          </button>
          <button
            onClick={() => setActiveTab('vocabulary')}
            className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'vocabulary'
                ? 'bg-white text-emerald-700 font-semibold shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Vocabulary & Grammar Engine
          </button>
          <button
            onClick={() => setActiveTab('exam')}
            className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'exam'
                ? 'bg-white text-emerald-700 font-semibold shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Exam & IELTS Prep
          </button>
        </div>
      </div>
    </header>
  );
};
