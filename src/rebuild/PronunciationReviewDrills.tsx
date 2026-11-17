import React, { useEffect, useMemo, useState } from 'react';

type Props = { track: string; level: string; contextLabel: string };
type ProgressEntry = {
  id: number;
  createdAt: number;
  audioAssessment: 'assessable' | 'not_assessable';
  soundTargets: { word: string; ipa: string; observation: string; practiceTipVi: string }[];
  modelSentence: string;
};
type Drill = {
  key: string;
  word: string;
  ipa: string;
  tip: string;
  observation: string;
  sentence: string;
  noted: number;
};

export default function PronunciationReviewDrills({ track, level, contextLabel }: Props) {
  const progressKey = `benenglish-pronunciation-progress-v1:${track}:${level}:${contextLabel}`;
  const practiceKey = `${progressKey}:self-practice-v1`;
  const [entries, setEntries] = useState<ProgressEntry[]>([]);
  const [practiceCounts, setPracticeCounts] = useState<Record<string, number>>({});
  const [notice, setNotice] = useState('');

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(progressKey) || '[]');
      setEntries(Array.isArray(saved) ? saved.filter((entry: ProgressEntry) =>
        entry && entry.audioAssessment === 'assessable' && Array.isArray(entry.soundTargets)
      ).slice(0, 40) : []);
      const counts = JSON.parse(localStorage.getItem(practiceKey) || '{}');
      setPracticeCounts(counts && typeof counts === 'object' ? counts : {});
    } catch {
      setEntries([]);
      setPracticeCounts({});
    }
  }, [progressKey, practiceKey]);

  const drills = useMemo(() => {
    const grouped = new Map<string, Drill>();
    for (const entry of entries) {
      for (const target of entry.soundTargets || []) {
        const word = String(target.word || '').trim();
        const ipa = String(target.ipa || '').trim();
        const key = (ipa || word).toLowerCase();
        if (!key) continue;
        const previous = grouped.get(key);
        grouped.set(key, {
          key,
          word,
          ipa,
          tip: String(target.practiceTipVi || previous?.tip || ''),
          observation: String(target.observation || previous?.observation || ''),
          sentence: String(entry.modelSentence || previous?.sentence || ''),
          noted: (previous?.noted || 0) + 1,
        });
      }
    }
    return [...grouped.values()]
      .map(item => ({ ...item, practiceCount: Number(practiceCounts[item.key]) || 0 }))
      .sort((a, b) => b.noted - a.noted)
      .slice(0, 3);
  }, [entries, practiceCounts]);

  const playModel = (text: string) => {
    if (!text.trim() || !('speechSynthesis' in window)) {
      setNotice('Trình duyệt chưa hỗ trợ phát âm mẫu. Bạn có thể đọc câu mẫu hiển thị bên dưới.');
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.82;
    const voices = window.speechSynthesis.getVoices();
    utterance.voice = voices.find(voice => voice.lang.toLowerCase().startsWith('en')) || null;
    window.speechSynthesis.speak(utterance);
    setNotice('Nghe mẫu một lần, sau đó lặp lại chậm và cuối cùng nói với tốc độ tự nhiên.');
  };

  const markPractised = (key: string) => {
    setPracticeCounts(previous => {
      const next = { ...previous, [key]: (Number(previous[key]) || 0) + 1 };
      try { localStorage.setItem(practiceKey, JSON.stringify(next)); } catch {
        setNotice('Không thể lưu lượt tự luyện trong trình duyệt này.');
      }
      return next;
    });
    setNotice('Đã ghi nhận một lượt tự luyện. Hãy ghi âm và đánh giá lại để kiểm tra thay đổi bằng bằng chứng âm thanh.');
  };

  if (!drills.length) return null;

  return <section className="mt-5 rounded-2xl border border-sky-100 bg-sky-50/70 p-4 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div>
        <div className="text-[11px] font-extrabold tracking-wider text-sky-700">PERSONALISED SOUND REVIEW</div>
        <h3 className="mt-1 text-lg font-extrabold text-slate-900">Bài luyện phát âm theo lỗi thường gặp</h3>
        <p className="mt-1 text-xs leading-5 text-slate-600">Ưu tiên âm đã xuất hiện trong các lần đánh giá âm thanh của {track === 'professional' ? 'Professional English' : 'High School English'} · {level}. Lượt tự luyện không được tính là điểm phát âm.</p>
      </div>
      <span className="rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-sky-700">{drills.length} mục cần ôn</span>
    </div>
    <div className="mt-3 grid gap-3 md:grid-cols-3">
      {drills.map((drill, index) => <article key={drill.key} className="rounded-xl border border-sky-100 bg-white p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-extrabold tracking-wider text-sky-700">{index === 0 ? 'ƯU TIÊN ÔN TẬP' : 'ÔN THÊM'}</span>
          <span className="text-[10px] font-semibold text-slate-400">Ghi nhận {drill.noted} lần</span>
        </div>
        <div className="mt-2 text-lg font-extrabold text-slate-900">{drill.word} <span className="text-sm font-semibold text-sky-700">{drill.ipa}</span></div>
        {drill.observation && <p className="mt-1 text-xs leading-5 text-slate-600">{drill.observation}</p>}
        {drill.tip && <p className="mt-2 rounded-lg bg-sky-50 p-2 text-xs leading-5 text-sky-900">{drill.tip}</p>}
        {drill.sentence && <p className="mt-3 text-xs font-semibold leading-5 text-slate-800">“{drill.sentence}”</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => playModel(drill.sentence || drill.word)} className="inline-flex items-center gap-1.5 rounded-lg bg-sky-700 px-3 py-2 text-xs font-bold text-white">Nghe mẫu</button>
          <button type="button" onClick={() => markPractised(drill.key)} className="rounded-lg border border-sky-200 px-3 py-2 text-xs font-bold text-sky-800">Đã tự luyện · {Number(practiceCounts[drill.key]) || 0}</button>
        </div>
        <p className="mt-2 text-[10px] leading-4 text-slate-400">Gợi ý: nghe → lặp chậm 3 lần → nói lại tự nhiên → ghi âm để đánh giá.</p>
      </article>)}
    </div>
    {notice && <p role="status" className="mt-3 text-xs leading-5 text-sky-900">{notice}</p>}
  </section>;
}
