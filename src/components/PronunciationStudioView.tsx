import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { IPA_SOUNDS_DATA } from '../data/curriculumData';
import { IPASound } from '../types';
import { audioEngine, SpeechRecognitionSession } from '../services/speech';
import {
  Volume2,
  Mic,
  Sparkles,
  Award,
  Layers,
  ChevronRight,
  HelpCircle,
  CheckCircle2,
} from 'lucide-react';

export const PronunciationStudioView: React.FC = () => {
  const { audioFeedbackSound, completeLesson } = useApp();

  const [selectedSound, setSelectedSound] = useState<IPASound>(IPA_SOUNDS_DATA[0]);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  // Mic test for minimal pair
  const [isRecording, setIsRecording] = useState(false);
  const [userSpokenText, setUserSpokenText] = useState('');
  const [matchScore, setMatchScore] = useState<number | null>(null);
  const [session, setSession] = useState<SpeechRecognitionSession | null>(null);

  const categories = [
    { id: 'all', label: 'All IPA Sounds' },
    { id: 'consonant_voiceless', label: 'Voiceless Consonants' },
    { id: 'consonant_voiced', label: 'Voiced Consonants' },
    { id: 'vowel_monophthong', label: 'Vowels & Monophthongs' },
  ];

  const filteredSounds = IPA_SOUNDS_DATA.filter((s) => {
    if (activeCategory === 'all') return true;
    return s.type === activeCategory;
  });

  const startMinimalPairRecording = () => {
    setUserSpokenText('');
    setMatchScore(null);

    const s = new SpeechRecognitionSession(
      (state) => setUserSpokenText(state.transcript),
      (err) => console.warn(err),
      (active) => setIsRecording(active)
    );
    setSession(s);
    s.start();
  };

  const stopMinimalPairRecording = () => {
    if (session) session.stop();
    setIsRecording(false);

    const cleanSpoken = userSpokenText.toLowerCase().trim();
    const targetA = selectedSound.minimalPair.wordA.toLowerCase();
    const targetB = selectedSound.minimalPair.wordB.toLowerCase();

    if (cleanSpoken.includes(targetA)) {
      setMatchScore(95);
      audioFeedbackSound();
      completeLesson('ipa-' + selectedSound.symbol, 'speaking', 95);
    } else if (cleanSpoken.includes(targetB)) {
      setMatchScore(50);
    } else {
      setMatchScore(65);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">
              PRONUNCIATION STUDIO · PHONETICS & IPA
            </div>
            <h1 className="text-2xl font-bold text-slate-900">
              Interactive IPA Phonetic Matrix
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Specialized mouth position guides and minimal pairs tailored for Vietnamese learners.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto bg-slate-100 p-1 rounded-xl border border-slate-200">
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCategory(c.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  activeCategory === c.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: IPA Grid (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Phonetic Symbols ({filteredSounds.length})
            </h3>
            <span className="text-[11px] text-slate-500">Tap symbol to inspect</span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
            {filteredSounds.map((sound) => {
              const isSelected = sound.symbol === selectedSound.symbol;

              return (
                <button
                  key={sound.symbol}
                  onClick={() => {
                    setSelectedSound(sound);
                    setUserSpokenText('');
                    setMatchScore(null);
                    audioEngine.speak(sound.exampleWord, { rate: 0.9 });
                  }}
                  className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                    isSelected
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm scale-105'
                      : 'bg-slate-50 border-slate-200 hover:border-emerald-300 text-slate-900 hover:bg-white'
                  }`}
                >
                  <span className="font-mono font-bold text-lg sm:text-xl">
                    {sound.symbol}
                  </span>
                  <span
                    className={`text-[11px] font-medium ${
                      isSelected ? 'text-emerald-100' : 'text-slate-500'
                    }`}
                  >
                    {sound.exampleWord}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Detailed Anatomy & Minimal Pair Drill (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-start justify-between pb-5 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center font-mono font-extrabold text-2xl text-emerald-800 shadow-xs">
                  {selectedSound.symbol}
                </div>
                <div>
                  <div className="text-xs font-bold text-emerald-600 uppercase">
                    {selectedSound.type.replace('_', ' ')}
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    Example Word: "{selectedSound.exampleWord}"
                  </h2>
                  <span className="font-mono text-xs text-slate-500 font-semibold">
                    {selectedSound.ipaExample}
                  </span>
                </div>
              </div>

              <button
                onClick={() => audioEngine.speak(selectedSound.exampleWord, { rate: 0.85 })}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Volume2 className="w-4 h-4 text-emerald-600" />
                <span>Hear Audio</span>
              </button>
            </div>

            {/* Vietnamese Specific Guide & Common Error */}
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                <span className="font-bold text-slate-900 block">
                  Hướng dẫn phát âm chuẩn:
                </span>
                <p className="text-slate-700 leading-relaxed">
                  {selectedSound.vietnameseGuide}
                </p>
              </div>

              {/* Mouth position */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 text-xs space-y-1.5">
                <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  Mouth & Tongue Position (Vị trí môi & đầu lưỡi):
                </span>
                <p className="text-slate-700 leading-relaxed">
                  {selectedSound.mouthPositionTip}
                </p>
              </div>

              {/* Common Vietnamese Error Callout */}
              <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 text-xs text-rose-950 space-y-1">
                <span className="font-bold block">
                  ⚠️ Lỗi người Việt thường gặp nhất:
                </span>
                <p className="text-rose-900 leading-relaxed">
                  {selectedSound.vietnameseCommonError}
                </p>
              </div>
            </div>

            {/* Minimal Pair Drill */}
            <div className="pt-4 border-t border-slate-100 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    ACOUSTIC DISCRIMINATION
                  </span>
                  <h3 className="text-base font-bold text-slate-900 mt-0.5">
                    Minimal Pair Comparison Drill
                  </h3>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-center">
                <div
                  onClick={() =>
                    audioEngine.speak(selectedSound.minimalPair.wordA, { rate: 0.9 })
                  }
                  className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 cursor-pointer hover:bg-emerald-100 transition-colors"
                >
                  <span className="text-xl font-bold text-slate-900 block">
                    {selectedSound.minimalPair.wordA}
                  </span>
                  <span className="font-mono text-xs text-emerald-800 font-semibold">
                    {selectedSound.minimalPair.ipaA}
                  </span>
                </div>

                <div
                  onClick={() =>
                    audioEngine.speak(selectedSound.minimalPair.wordB, { rate: 0.9 })
                  }
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <span className="text-xl font-bold text-slate-900 block">
                    {selectedSound.minimalPair.wordB}
                  </span>
                  <span className="font-mono text-xs text-slate-500 font-semibold">
                    {selectedSound.minimalPair.ipaB}
                  </span>
                </div>
              </div>

              {/* Mic Drill for Minimal Pair */}
              <div className="p-5 rounded-2xl bg-slate-900 text-white text-center space-y-3">
                <span className="text-xs text-slate-400 block font-medium">
                  Practice saying "{selectedSound.minimalPair.wordA}" into the mic:
                </span>

                <button
                  onClick={
                    isRecording ? stopMinimalPairRecording : startMinimalPairRecording
                  }
                  className={`w-14 h-14 rounded-full mx-auto flex items-center justify-center font-bold transition-all ${
                    isRecording
                      ? 'bg-rose-500 text-white ring-4 ring-rose-500/20 animate-pulse'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                  }`}
                >
                  <Mic className="w-6 h-6" />
                </button>

                {userSpokenText && (
                  <div className="text-xs font-mono text-slate-200">
                    Transcribed: "{userSpokenText}"
                  </div>
                )}

                {matchScore !== null && (
                  <div className="pt-1 text-sm font-bold text-emerald-400">
                    {matchScore >= 80 ? '✓ Excellent sound distinction!' : '▲ Try emphasizing the tongue position'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
