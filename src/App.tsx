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

const AppShell: React.FC = () => {
  const { authUser, authLoading } = useAuth();

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-sm font-semibold text-slate-600">Loading your learning profile…</div>;
  }

  return (
    <AppProvider key={authUser?.uid || 'guest'}>
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-emerald-200 selection:text-emerald-950">
        <Header />
        <div className="flex-1">
          <MainContent />
        </div>
        <footer className="bg-white border-t border-slate-200 py-8 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 space-y-2">
            <div className="flex items-center justify-center gap-2 font-medium text-slate-700">
              <Headphones className="w-4 h-4 text-emerald-600" />
              <span>BenEnglish AI — Your Personal AI English Learning Academy</span>
            </div>
            <p className="text-slate-400">
              LEARN → LISTEN → UNDERSTAND → SPEAK → RECEIVE FEEDBACK → CORRECT → REPEAT → MASTER
            </p>
            <div className="pt-2 text-[11px] text-slate-400">
              Tailored for High School Students (Grades 10–12) and International Working Professionals.
            </div>
          </div>
        </footer>
      </div>
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
