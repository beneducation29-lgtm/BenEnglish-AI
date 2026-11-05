import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { PODCAST_EPISODES } from '../data/curriculumData';
import { PodcastEpisode } from '../types';
import { audioEngine, isSpeechSynthesisSupported } from '../services/speech';
import {
  Headphones, Play, Pause, Square, Volume2, BookOpen, Sparkles,
  Bookmark, Search, Video, Clock3, CheckCircle2, ExternalLink,
  Languages, Filter, Radio, AlertCircle,
} from 'lucide-react';

type LibraryTab = 'podcasts' | 'video';
type LibraryProgress = {
  completedIds: string[];
  recentIds: string[];
  bookmarks: string[];
};

const STORAGE_KEY = 'benenglish_library_progress_v1';
const EMPTY_PROGRESS: LibraryProgress = { completedIds: [], recentIds: [], bookmarks: [] };

function readProgress(): LibraryProgress {
  if (typeof window === 'undefined') return EMPTY_PROGRESS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_PROGRESS;
    const parsed = JSON.parse(raw) as Partial<LibraryProgress>;
    return {
      completedIds: Array.isArray(parsed.completedIds) ? parsed.completedIds : [],
      recentIds: Array.isArray(parsed.recentIds) ? parsed.recentIds : [],
      bookmarks: Array.isArray(parsed.bookmarks) ? parsed.bookmarks : [],
    };
  } catch {
    return EMPTY_PROGRESS;
  }
}

function getYouTubeEmbedUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    const host = url.hostname.toLowerCase().replace(/^www\\./, '');
    let videoId = '';
    if (host === 'youtu.be') videoId = url.pathname.split('/').filter(Boolean)[0] || '';
    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
      if (url.pathname === '/watch') videoId = url.searchParams.get('v') || '';
      else if (url.pathname.startsWith('/embed/')) videoId = url.pathname.split('/')[2] || '';
      else if (url.pathname.startsWith('/shorts/')) videoId = url.pathname.split('/')[2] || '';
    }
    return /^[a-zA-Z0-9_-]{11}$/.test(videoId)
      ? `https://www.youtube-nocookie.com/embed/${videoId}`
      : null;
  } catch {
    return null;
  }
}

export const LibraryView: React.FC = () => {
  const { playbackSpeed, setPlaybackSpeed, user } = useApp();
  const [activeTab, setActiveTab] = useState<LibraryTab>('podcasts');
  const [selectedEpisode, setSelectedEpisode] = useState<PodcastEpisode>(PODCAST_EPISODES[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [activeSentenceId, setActiveSentenceId] = useState<string | null>(null);
  const [showViTranslation, setShowViTranslation] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [progress, setProgress] = useState<LibraryProgress>(readProgress);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoError, setVideoError] = useState('');
  const [videoEmbedUrl, setVideoEmbedUrl] = useState('');

  const categories = useMemo(
    () => Array.from(new Set(PODCAST_EPISODES.map((episode) => episode.category))).sort(),
    []
  );

  const filteredEpisodes = useMemo(() => PODCAST_EPISODES.filter((episode) => {
    const matchesTrack = episode.track === 'both' || episode.track === user.track;
    const query = searchQuery.trim().toLowerCase();
    const matchesQuery = !query || [
      episode.title, episode.category, episode.speaker, episode.audioScript,
    ].some((value) => value.toLowerCase().includes(query));
    const matchesLevel = selectedLevel === 'all' || episode.level === selectedLevel;
    const matchesCategory = selectedCategory === 'all' || episode.category === selectedCategory;
    return matchesTrack && matchesQuery && matchesLevel && matchesCategory;
  }), [searchQuery, selectedLevel, selectedCategory, user.track]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch {
      // Browser storage can be unavailable in private or restricted contexts.
    }
  }, [progress]);

  useEffect(() => () => audioEngine.stop(), []);

  const updateRecent = (episodeId: string) => {
    setProgress((previous) => ({
      ...previous,
      recentIds: [episodeId, ...previous.recentIds.filter((id) => id !== episodeId)].slice(0, 8),
    }));
  };

  const markCompleted = (episodeId: string) => {
    setProgress((previous) => ({
      ...previous,
      completedIds: previous.completedIds.includes(episodeId)
        ? previous.completedIds
        : [...previous.completedIds, episodeId],
    }));
  };

  const playEpisode = (episode: PodcastEpisode) => {
    if (!isSpeechSynthesisSupported()) {
      setIsPlaying(false);
      setIsPaused(false);
      return;
    }
    setSelectedEpisode(episode);
    setIsPlaying(true);
    setIsPaused(false);
    setActiveSentenceId(episode.sentences[0]?.id || null);
    updateRecent(episode.id);

    const sentenceOffsets = episode.sentences.map((sentence) => ({
      id: sentence.id,
      start: episode.audioScript.indexOf(sentence.textEn),
      end: episode.audioScript.indexOf(sentence.textEn) + sentence.textEn.length,
    }));

    audioEngine.speak(episode.audioScript, {
      rate: playbackSpeed,
      onBoundary: (charIndex) => {
        const current = sentenceOffsets.find((item) => item.start >= 0 && charIndex >= item.start && charIndex < item.end);
        if (current) setActiveSentenceId(current.id);
      },
      onEnd: () => {
        setIsPlaying(false);
        setIsPaused(false);
        setActiveSentenceId(null);
        markCompleted(episode.id);
      },
      onError: () => {
        setIsPlaying(false);
        setIsPaused(false);
      },
    });
  };

  const togglePlayback = () => {
    if (!isPlaying) {
      playEpisode(selectedEpisode);
      return;
    }
    if (isPaused) {
      audioEngine.resume();
      setIsPaused(false);
    } else {
      audioEngine.pause();
      setIsPaused(true);
    }
  };

  const stopPlayback = () => {
    audioEngine.stop();
    setIsPlaying(false);
    setIsPaused(false);
    setActiveSentenceId(null);
  };

  const playSentence = (sentenceId: string, text: string) => {
    audioEngine.stop();
    setIsPlaying(true);
    setIsPaused(false);
    setActiveSentenceId(sentenceId);
    audioEngine.speak(text, {
      rate: playbackSpeed,
      onEnd: () => {
        setIsPlaying(false);
        setIsPaused(false);
        setActiveSentenceId(null);
      },
      onError: () => {
        setIsPlaying(false);
        setIsPaused(false);
      },
    });
  };

  const toggleBookmark = (episodeId: string) => {
    setProgress((previous) => ({
      ...previous,
      bookmarks: previous.bookmarks.includes(episodeId)
        ? previous.bookmarks.filter((id) => id !== episodeId)
        : [...previous.bookmarks, episodeId],
    }));
  };

  const submitVideo = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const embed = getYouTubeEmbedUrl(videoUrl);
    if (!embed) {
      setVideoError('Please enter a valid YouTube video URL.');
      setVideoEmbedUrl('');
      return;
    }
    setVideoError('');
    setVideoEmbedUrl(embed);
  };

  const selectedIsBookmarked = progress.bookmarks.includes(selectedEpisode.id);
  const selectedIsCompleted = progress.completedIds.includes(selectedEpisode.id);

  return (
    <div className="space-y-8 pb-16">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700">
              <Headphones className="h-4 w-4" /> Phase 6 · Multimedia Learning Library
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">Podcast & Video Learning Studio</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
              Listen to level-based English content, follow the transcript, review Vietnamese meaning,
              and save useful lessons for later.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:min-w-[300px]">
            <div className="rounded-2xl bg-slate-50 p-3 text-center">
              <strong className="block text-xl text-slate-900">{PODCAST_EPISODES.length}</strong>
              <span className="text-[10px] font-semibold uppercase text-slate-500">Lessons</span>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3 text-center">
              <strong className="block text-xl text-slate-900">{progress.completedIds.length}</strong>
              <span className="text-[10px] font-semibold uppercase text-slate-500">Completed</span>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3 text-center">
              <strong className="block text-xl text-slate-900">{progress.bookmarks.length}</strong>
              <span className="text-[10px] font-semibold uppercase text-slate-500">Saved</span>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2 border-b border-slate-100 pb-4">
          <button onClick={() => setActiveTab('podcasts')} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${activeTab === 'podcasts' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
            <Radio className="h-4 w-4" /> Podcasts & Audio
          </button>
          <button onClick={() => setActiveTab('video')} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${activeTab === 'video' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
            <Video className="h-4 w-4" /> Video Player
          </button>
        </div>

        {activeTab === 'video' ? (
          <div className="space-y-5 pt-5">
            <div className="max-w-3xl">
              <h2 className="text-lg font-bold text-slate-900">Study with a YouTube video</h2>
              <p className="mt-1 text-sm text-slate-500">Embed a video you are allowed to access. YouTube captions and playback controls remain managed by YouTube.</p>
              <form onSubmit={submitVideo} className="mt-4 flex flex-col gap-2 sm:flex-row">
                <input value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} placeholder="Paste a YouTube URL…" aria-label="YouTube video URL" className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
                <button type="submit" className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700">Load video</button>
              </form>
              {videoError && <p role="alert" className="mt-2 flex items-center gap-2 text-sm text-rose-600"><AlertCircle className="h-4 w-4" />{videoError}</p>}
            </div>
            {videoEmbedUrl ? (
              <div className="max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-black">
                <div className="aspect-video">
                  <iframe src={videoEmbedUrl} title="Embedded English learning video" className="h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
                </div>
              </div>
            ) : (
              <div className="flex min-h-48 max-w-4xl flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <Video className="h-9 w-9 text-slate-400" />
                <p className="mt-3 font-semibold text-slate-700">Your video workspace is ready</p>
                <p className="mt-1 text-sm text-slate-500">Paste a valid YouTube link above to load the player.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 pt-5 lg:grid-cols-12">
            <aside className="space-y-4 lg:col-span-4">
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <label className="relative block">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search lessons, topics, speakers…" className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-xs outline-none focus:border-emerald-500" />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-[11px] font-semibold text-slate-500">CEFR level
                    <select value={selectedLevel} onChange={(event) => setSelectedLevel(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-800">
                      <option value="all">All levels</option>
                      {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((level) => <option key={level} value={level}>{level}</option>)}
                    </select>
                  </label>
                  <label className="text-[11px] font-semibold text-slate-500">Category
                    <select value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-800">
                      <option value="all">All topics</option>
                      {categories.map((category) => <option key={category} value={category}>{category}</option>)}
                    </select>
                  </label>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-500"><Filter className="h-3.5 w-3.5" /> Showing content for <strong className="text-slate-700">{user.track === 'high_school' ? 'High School' : 'Professional'} Track</strong></div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Available episodes</h3>
                  <span className="text-xs text-slate-400">{filteredEpisodes.length} found</span>
                </div>
                {filteredEpisodes.length === 0 && <div className="rounded-xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">No lessons match these filters.</div>}
                {filteredEpisodes.map((episode) => {
                  const selected = episode.id === selectedEpisode.id;
                  const saved = progress.bookmarks.includes(episode.id);
                  return (
                    <button key={episode.id} onClick={() => { stopPlayback(); setSelectedEpisode(episode); }} className={`w-full rounded-2xl border p-4 text-left transition ${selected ? 'border-emerald-400 bg-emerald-50 ring-1 ring-emerald-200' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-700">{episode.level}</span>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500">
                          {progress.completedIds.includes(episode.id) && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
                          {saved && <Bookmark className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />}
                          <span>{episode.duration}</span>
                        </div>
                      </div>
                      <span className="mt-2 block text-sm font-bold leading-snug text-slate-900">{episode.title}</span>
                      <span className="mt-1 block text-[11px] text-slate-500">{episode.category}</span>
                      <span className="mt-2 block truncate text-[10px] text-slate-400">{episode.speaker}</span>
                    </button>
                  );
                })}
              </div>
            </aside>

            <section className="space-y-5 lg:col-span-8">
              <div className="rounded-2xl bg-slate-950 p-5 text-white sm:p-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                      {selectedEpisode.category} <span className="text-slate-600">·</span> {selectedEpisode.level}
                    </div>
                    <h2 className="mt-2 text-xl font-bold sm:text-2xl">{selectedEpisode.title}</h2>
                    <p className="mt-1 text-xs text-slate-400">{selectedEpisode.speaker}</p>
                  </div>
                  <button onClick={() => toggleBookmark(selectedEpisode.id)} aria-label={selectedIsBookmarked ? 'Remove bookmark' : 'Bookmark lesson'} className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800">
                    <Bookmark className={`h-4 w-4 ${selectedIsBookmarked ? 'fill-amber-400 text-amber-400' : ''}`} /> {selectedIsBookmarked ? 'Saved' : 'Save lesson'}
                  </button>
                </div>

                <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <button onClick={togglePlayback} aria-label={isPlaying && !isPaused ? 'Pause audio' : isPaused ? 'Resume audio' : 'Play audio'} className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-400 text-slate-950 transition hover:bg-emerald-300">
                      {isPlaying && !isPaused ? <Pause className="h-5 w-5 fill-current" /> : <Play className="ml-0.5 h-5 w-5 fill-current" />}
                    </button>
                    <button onClick={stopPlayback} aria-label="Stop audio" className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800"><Square className="h-4 w-4 fill-current" /></button>
                    <div>
                      <div className="text-sm font-semibold">{isPlaying ? (isPaused ? 'Audio paused' : 'Speaking lesson…') : selectedIsCompleted ? 'Lesson completed' : 'Ready to listen'}</div>
                      <div className="mt-0.5 text-[10px] text-slate-400">Browser text-to-speech · English voice</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <label htmlFor="library-speed" className="text-[11px] text-slate-400">Speed</label>
                    <select id="library-speed" value={playbackSpeed} onChange={(event) => setPlaybackSpeed(Number(event.target.value))} className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-white">
                      {[0.75, 0.9, 1, 1.1, 1.25, 1.5].map((speed) => <option key={speed} value={speed}>{speed}×</option>)}
                    </select>
                  </div>
                </div>
                {!isSpeechSynthesisSupported() && <p className="mt-4 flex items-center gap-2 text-xs text-amber-300"><AlertCircle className="h-4 w-4" />Text-to-speech is not supported by this browser.</p>}
                <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-3 text-[10px] text-slate-400">
                  <span className="flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" /> Approx. {selectedEpisode.duration}</span>
                  <span>{selectedIsCompleted ? 'Completed' : 'Not completed yet'}</span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-slate-900">Interactive transcript</h3>
                    <p className="mt-1 text-xs text-slate-500">Play the full lesson or tap any sentence to hear it again.</p>
                  </div>
                  <button onClick={() => setShowViTranslation((value) => !value)} className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${showViTranslation ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-600'}`}>
                    <Languages className="mr-1 inline h-3.5 w-3.5" /> Vietnamese {showViTranslation ? 'ON' : 'OFF'}
                  </button>
                </div>
                <div className="space-y-3">
                  {selectedEpisode.sentences.map((sentence, index) => {
                    const active = activeSentenceId === sentence.id;
                    return (
                      <article key={sentence.id} className={`rounded-xl border p-4 transition ${active ? 'border-emerald-300 bg-emerald-50 ring-1 ring-emerald-100' : 'border-slate-100 bg-slate-50'}`}>
                        <div className="flex items-start gap-3">
                          <span className="pt-0.5 text-[10px] font-bold text-slate-400">{String(index + 1).padStart(2, '0')}</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold leading-relaxed text-slate-900">{sentence.textEn}</p>
                            {showViTranslation && <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{sentence.textVi}</p>}
                            {sentence.phoneticFocus && <p className="mt-2 text-[11px] text-emerald-800"><Sparkles className="mr-1 inline h-3 w-3" />{sentence.phoneticFocus}</p>}
                          </div>
                          <button onClick={() => playSentence(sentence.id, sentence.textEn)} aria-label={`Play sentence ${index + 1}`} className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:border-emerald-300 hover:text-emerald-700"><Volume2 className="h-4 w-4" /></button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900"><BookOpen className="h-4 w-4 text-emerald-600" /> Featured expressions</h3>
                  <div className="space-y-3">
                    {selectedEpisode.idioms.map((idiom) => <div key={idiom.phrase} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                      <p className="text-xs font-bold text-slate-900">{idiom.phrase}</p>
                      <p className="mt-0.5 text-xs text-emerald-700">{idiom.meaningVi}</p>
                      <p className="mt-1 text-[11px] italic text-slate-500">{idiom.example}</p>
                    </div>)}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <h3 className="mb-3 text-sm font-bold text-slate-900">Your library activity</h3>
                  <div className="space-y-2 text-xs text-slate-600">
                    <p className="flex items-center justify-between"><span>Saved lessons</span><strong className="text-slate-900">{progress.bookmarks.length}</strong></p>
                    <p className="flex items-center justify-between"><span>Completed lessons</span><strong className="text-slate-900">{progress.completedIds.length}</strong></p>
                    <p className="flex items-center justify-between"><span>Recent lessons</span><strong className="text-slate-900">{progress.recentIds.length}</strong></p>
                  </div>
                  {progress.recentIds.length > 0 && <div className="mt-4 border-t border-slate-100 pt-3">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Recently played</p>
                    {progress.recentIds.map((id) => {
                      const episode = PODCAST_EPISODES.find((item) => item.id === id);
                      return episode ? <button key={id} onClick={() => { stopPlayback(); setSelectedEpisode(episode); }} className="mb-1 block w-full truncate text-left text-xs font-medium text-emerald-700 hover:underline">{episode.title}</button> : null;
                    })}
                  </div>}
                  <p className="mt-4 text-[10px] leading-relaxed text-slate-400">Learning history and bookmarks are saved in this browser on this device. They are not yet synced across accounts.</p>
                </div>
              </div>
            </section>
          </div>
        )}
      </section>
    </div>
  );
};
