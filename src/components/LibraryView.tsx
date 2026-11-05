import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PODCAST_EPISODES } from '../data/curriculumData';
import { PodcastEpisode } from '../types';
import { audioEngine } from '../services/speech';
import {
  Headphones,
  Play,
  Pause,
  Volume2,
  BookOpen,
  Sparkles,
  Bookmark,
  Share2,
} from 'lucide-react';

export const LibraryView: React.FC = () => {
  const { playbackSpeed, setPlaybackSpeed } = useApp();

  const [selectedEpisode, setSelectedEpisode] = useState<PodcastEpisode>(PODCAST_EPISODES[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showViTranslation, setShowViTranslation] = useState(true);

  const togglePlayback = () => {
    if (isPlaying) {
      audioEngine.stop();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      audioEngine.speak(selectedEpisode.audioScript, {
        rate: playbackSpeed,
        onEnd: () => setIsPlaying(false),
      });
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Top Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">
            MULTIMEDIA LEARNING LIBRARY · PODCASTS & MASTERCLASSES
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Categorized Audio & Video Library
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Psychology, Leadership, Technology, and Cultural Insights with synchronized bilingual transcripts.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Episodes List (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1 mb-2">
              All Episodes ({PODCAST_EPISODES.length})
            </h3>
            {PODCAST_EPISODES.map((ep) => {
              const isSelected = ep.id === selectedEpisode.id;

              return (
                <button
                  key={ep.id}
                  onClick={() => {
                    audioEngine.stop();
                    setIsPlaying(false);
                    setSelectedEpisode(ep);
                  }}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all flex flex-col gap-1 ${
                    isSelected
                      ? 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-300 text-slate-900'
                      : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px]">
                      {ep.level}
                    </span>
                    <span className="text-slate-500 font-medium">{ep.duration}</span>
                  </div>
                  <div className="font-bold text-sm leading-snug">{ep.title}</div>
                  <div className="text-[11px] text-slate-500 truncate">{ep.speaker}</div>
                </button>
              );
            })}
          </div>

          {/* Key Idioms Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              Featured Idioms & Collocations:
            </h3>
            <div className="space-y-2.5">
              {selectedEpisode.idioms.map((idiom, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                  <span className="font-bold text-slate-900 block">{idiom.phrase}</span>
                  <span className="text-emerald-700 font-medium">{idiom.meaningVi}</span>
                  <p className="text-[11px] text-slate-500 italic mt-1">"{idiom.example}"</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Multimedia Stage & Bilingual Transcript (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
              <div>
                <span className="text-xs font-bold text-emerald-600 uppercase">
                  {selectedEpisode.category} · {selectedEpisode.level}
                </span>
                <h2 className="text-2xl font-bold text-slate-900 mt-0.5">
                  {selectedEpisode.title}
                </h2>
                <span className="text-xs text-slate-500 block mt-1">
                  Speaker: {selectedEpisode.speaker}
                </span>
              </div>

              {/* Translation toggle & speed */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowViTranslation(!showViTranslation)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                    showViTranslation
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                      : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  {showViTranslation ? 'Vietnamese: ON' : 'Vietnamese: OFF'}
                </button>
              </div>
            </div>

            {/* Audio Bar */}
            <div className="p-4 rounded-2xl bg-slate-900 text-white flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={togglePlayback}
                  className="w-12 h-12 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center font-bold shadow-md hover:scale-105 transition-all"
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 fill-slate-950" />
                  ) : (
                    <Play className="w-5 h-5 fill-slate-950 ml-0.5" />
                  )}
                </button>
                <div>
                  <span className="text-xs text-slate-400 font-medium">AUDIO STREAM</span>
                  <span className="text-sm font-semibold text-white block">
                    {isPlaying ? 'Playing masterclass audio...' : 'Tap play to start audio'}
                  </span>
                </div>
              </div>

              <div className="text-xs font-mono text-slate-400 tabular-nums">
                {selectedEpisode.duration}
              </div>
            </div>

            {/* Sentences Stream */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Transcript & Translation:</h3>
              <div className="space-y-3">
                {selectedEpisode.sentences.map((sent, idx) => (
                  <div
                    key={sent.id}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-semibold text-slate-900 text-sm leading-relaxed">
                        {sent.textEn}
                      </p>
                      <button
                        onClick={() => audioEngine.speak(sent.textEn, { rate: playbackSpeed })}
                        className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-emerald-600 shrink-0"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {showViTranslation && (
                      <p className="text-xs text-slate-600 font-medium leading-relaxed">
                        {sent.textVi}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
