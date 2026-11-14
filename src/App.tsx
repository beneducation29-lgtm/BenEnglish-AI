/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { HomeView } from './components/HomeView';
import { ListeningLabView } from './components/ListeningLabView';
import { SpeakingLabView } from './components/SpeakingLabView';
import { ReadingWritingView } from './components/ReadingWritingView';
import { ConversationRoomView } from './components/ConversationRoomView';
import { RoleplayEngineView } from './components/RoleplayEngineView';
import { PronunciationStudioView } from './components/PronunciationStudioView';
import { LibraryView } from './components/LibraryView';
import { VocabularyGrammarView } from './components/VocabularyGrammarView';
import { ExamPrepView } from './components/ExamPrepView';
import { ProgressAnalyticsView } from './components/ProgressAnalyticsView';
import { Headphones, Heart } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';

const MainContent: React.FC = () => {
  const { activeTab } = useApp();

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
      {activeTab === 'home' && <HomeView />}
      {activeTab === 'listening' && <ListeningLabView />}
      {activeTab === 'speaking' && <SpeakingLabView />}
      {activeTab === 'reading-writing' && <ReadingWritingView />}
      {activeTab === 'conversation' && <ConversationRoomView />}
      {activeTab === 'roleplay' && <RoleplayEngineView />}
      {activeTab === 'pronunciation' && <PronunciationStudioView />}
      {activeTab === 'library' && <LibraryView />}
      {activeTab === 'vocabulary' && <VocabularyGrammarView />}
      {activeTab === 'exam' && <ExamPrepView />}
      {activeTab === 'progress' && <ProgressAnalyticsView />}
    </main>
  );
};

const TrackThemedExperience: React.FC = () => {
  const { user } = useApp();
  const isHighSchool = user.track === 'high_school';
  const theme = isHighSchool
    ? { page: 'bg-sky-50/50', selection: 'selection:bg-sky-200 selection:text-sky-950', accent: 'text-sky-700', footerIcon: 'text-sky-600', footerBorder: 'border-sky-100', label: 'HIGH SCHOOL ENGLISH · GRADES 10–12', description: 'School curriculum · Academic foundations · Exams' }
    : { page: 'bg-violet-50/40', selection: 'selection:bg-violet-200 selection:text-violet-950', accent: 'text-violet-700', footerIcon: 'text-violet-600', footerBorder: 'border-violet-100', label: 'PROFESSIONAL ENGLISH', description: 'Workplace communication · Business skills · Industry English' };

  return (
    <div className={`min-h-screen ${theme.page} text-slate-900 flex flex-col font-sans ${theme.selection} transition-colors duration-300`}>
      <Header />
      <div className={`border-b ${theme.footerBorder} bg-white/70 px-4 py-2 text-center`}>
        <p className={`text-[10px] font-extrabold tracking-[0.16em] ${theme.accent}`}>{theme.label}</p>
        <p className="mt-0.5 text-[11px] text-slate-500">{theme.description}</p>
      </div>
      <div className="flex-1">
        <MainContent />
      </div>
      <footer className="border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 space-y-2">
          <div className="flex items-center justify-center gap-2 font-medium text-slate-700">
            <Headphones className={`w-4 h-4 ${theme.footerIcon}`} />
            <span>BenEnglish AI — Your Personal AI English Learning Academy</span>
          </div>
          <p className="text-slate-400">LEARN → LISTEN → UNDERSTAND → SPEAK → RECEIVE FEEDBACK → CORRECT → REPEAT → MASTER</p>
          <div className="pt-2 text-[11px] text-slate-400">
            {isHighSchool ? 'Designed for Vietnamese high school learners in Grades 10–12.' : 'Designed for working professionals and international workplace communication.'}
          </div>
        </div>
      </footer>
    </div>
  );
};

const AppShell: React.FC = () => {
  const { authUser, authLoading } = useAuth();

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-sm font-semibold text-slate-600">Loading your learning profile…</div>;
  }

  return (
    <AppProvider key={authUser?.uid || 'guest'}>
      <TrackThemedExperience />
    </AppProvider>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
