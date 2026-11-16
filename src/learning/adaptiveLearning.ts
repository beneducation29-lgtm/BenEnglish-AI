export type LearningSkill = 'grammar' | 'vocabulary' | 'pragmatics' | 'listening' | 'reading' | 'speaking' | 'writing';

export interface LearningEvidence {
  skill: LearningSkill | string;
  correct: boolean;
  topic?: string;
  unitId?: string;
  at: number;
}

export interface LearnerMemory {
  recurringErrors: string[];
  masteredItems: string[];
  lastFocus?: string;
  errorFrequency?: Record<string, number>;
  updatedAt: number;
}

const MEMORY_KEY = 'benenglish-ai-tutor-memory-v1';

const normalise = (value: string) => value.trim().replace(/\s+/g, ' ').slice(0, 180);
const unique = (items: string[]) => items.filter((item, index) =>
  items.findIndex(other => other.toLowerCase() === item.toLowerCase()) === index
);

export function loadLearnerMemory(): LearnerMemory {
  try {
    const saved = JSON.parse(localStorage.getItem(MEMORY_KEY) || '{}');
    const errorFrequency = saved.errorFrequency && typeof saved.errorFrequency === 'object'
      ? Object.fromEntries(Object.entries(saved.errorFrequency).filter(([key, value]) =>
          typeof key === 'string' && Number.isFinite(Number(value))
        ).map(([key, value]) => [normalise(key), Math.max(1, Number(value))]).slice(0, 12))
      : {};
    return {
      recurringErrors: Array.isArray(saved.recurringErrors) ? saved.recurringErrors.slice(0, 12) : [],
      masteredItems: Array.isArray(saved.masteredItems) ? saved.masteredItems.slice(0, 12) : [],
      lastFocus: typeof saved.lastFocus === 'string' ? saved.lastFocus : undefined,
      errorFrequency,
      updatedAt: Number(saved.updatedAt) || 0,
    };
  } catch {
    return { recurringErrors: [], masteredItems: [], errorFrequency: {}, updatedAt: 0 };
  }
}

export function saveLearnerMemory(memory: LearnerMemory): void {
  try {
    localStorage.setItem(MEMORY_KEY, JSON.stringify({
      ...memory,
      recurringErrors: memory.recurringErrors.slice(0, 12),
      masteredItems: memory.masteredItems.slice(0, 12),
      errorFrequency: Object.fromEntries(Object.entries(memory.errorFrequency || {}).slice(0, 12)),
      updatedAt: Date.now(),
    }));
  } catch {
    // Storage may be unavailable or full; the current learning session can continue.
  }
}

export function mergeLearnerMemory(
  current: LearnerMemory,
  newErrors: string[],
  mastered: string[] = [],
): LearnerMemory {
  const frequency = { ...(current.errorFrequency || {}) };
  for (const raw of newErrors) {
    const error = normalise(raw);
    if (!error) continue;
    const key = Object.keys(frequency).find(item => item.toLowerCase() === error.toLowerCase()) || error;
    frequency[key] = (frequency[key] || 0) + 1;
  }
  const rankedErrors = Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .map(([error, count]) => count > 1 ? error + ' (seen ' + count + ' times)' : error);
  const masteredItems = unique([
    ...mastered.map(normalise),
    ...current.masteredItems.map(normalise),
  ].filter(Boolean));
  return {
    recurringErrors: rankedErrors.slice(0, 12),
    masteredItems: masteredItems.slice(0, 12),
    errorFrequency: Object.fromEntries(Object.entries(frequency).sort((a, b) => b[1] - a[1]).slice(0, 12)),
    lastFocus: newErrors.map(normalise).find(Boolean) || current.lastFocus,
    updatedAt: Date.now(),
  };
}

const SKILL_TERMS: Record<string, string[]> = {
  grammar: ['grammar', 'tense', 'conditional', 'clause', 'sentence', 'verb', 'structure'],
  vocabulary: ['vocabulary', 'word', 'phrase', 'collocation', 'lexical'],
  pragmatics: ['communication', 'customer', 'polite', 'meeting', 'negotiation', 'interaction'],
  listening: ['listening', 'audio', 'podcast', 'conversation', 'announcement'],
  reading: ['reading', 'article', 'text', 'report', 'passage'],
  speaking: ['speaking', 'presentation', 'conversation', 'interview', 'discussion', 'roleplay'],
  writing: ['writing', 'email', 'essay', 'report', 'recommendation', 'proposal'],
};

function tokens(value: string): string[] {
  return value.toLowerCase().split(/[^a-z0-9]+/).filter(token => token.length > 2);
}

export function recommendNextLesson<T extends { id: string; title: string; level: string; theme?: string }>(
  lessons: T[],
  evidence: LearningEvidence[],
  currentLevel: string,
  currentLessonId?: string,
): { lesson: T | null; weakestSkill: LearningSkill | null; accuracy: number | null; reason: string } {
  const recent = evidence.filter(item => Number.isFinite(item.at) && Date.now() - item.at < 1000 * 60 * 60 * 24 * 45);
  const bySkill = new Map<string, { attempts: number; correct: number; failedTopics: Map<string, number> }>();
  for (const item of recent) {
    const row = bySkill.get(item.skill) || { attempts: 0, correct: 0, failedTopics: new Map<string, number>() };
    row.attempts += 1;
    if (item.correct) row.correct += 1;
    else if (item.topic) row.failedTopics.set(item.topic, (row.failedTopics.get(item.topic) || 0) + 1);
    bySkill.set(item.skill, row);
  }

  const ranked = [...bySkill.entries()]
    .filter(([, value]) => value.attempts >= 2)
    .sort((a, b) => (a[1].correct / a[1].attempts) - (b[1].correct / b[1].attempts));
  if (!ranked.length) {
    return {
      lesson: null,
      weakestSkill: null,
      accuracy: null,
      reason: 'Chưa có đủ bằng chứng (ít nhất 2 lượt ở cùng một kỹ năng trong 45 ngày). Hãy hoàn thành thêm bài đánh giá; hệ thống chưa tự suy đoán điểm yếu.',
    };
  }

  const [weakestSkillName, weakestData] = ranked[0];
  const weakestSkill = weakestSkillName as LearningSkill;
  const accuracy = Math.round(weakestData.correct / weakestData.attempts * 100);
  const topic = [...weakestData.failedTopics.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const levelOrder = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const currentIndex = Math.max(0, levelOrder.indexOf(currentLevel));
  const candidates = lessons.filter(lesson => lesson.id !== currentLessonId);
  const skillTerms = SKILL_TERMS[weakestSkill] || [weakestSkill];
  const topicTokens = topic ? tokens(topic) : [];

  const scored = candidates.map(lesson => {
    const searchable = (lesson.title + ' ' + (lesson.theme || '')).toLowerCase();
    const skillMatch = skillTerms.some(term => searchable.includes(term)) ? 4 : 0;
    const topicMatch = topicTokens.filter(token => searchable.includes(token)).length * 3;
    const levelDistance = Math.abs(levelOrder.indexOf(lesson.level) - currentIndex);
    const levelScore = levelDistance === 0 ? 3 : levelDistance === 1 ? 1 : -levelDistance * 2;
    const previouslyAttempted = recent.some(item => item.unitId === lesson.id);
    return { lesson, score: skillMatch + topicMatch + levelScore - (previouslyAttempted ? 1 : 0) };
  }).sort((a, b) => b.score - a.score);

  const lesson = scored[0]?.lesson || lessons.find(item => item.id !== currentLessonId) || null;
  const reason = [
    'Ưu tiên ' + weakestSkill + ' vì độ chính xác gần đây là ' + accuracy + '% trong ' + weakestData.attempts + ' lượt.',
    topic ? 'Chủ đề sai lặp lại: ' + topic + '.' : '',
    lesson ? 'Bài tiếp theo được chọn theo mức ' + lesson.level + ' và mức độ liên quan đến kỹ năng cần củng cố.' : '',
  ].filter(Boolean).join(' ');
  return { lesson, weakestSkill, accuracy, reason };
}
