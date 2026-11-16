export type LearningSkill = 'grammar' | 'vocabulary' | 'pragmatics' | 'listening' | 'reading' | 'speaking' | 'writing';

export interface LearningEvidence {
  skill: LearningSkill;
  correct: boolean;
  topic?: string;
  unitId?: string;
  at: number;
}

export interface LearnerMemory {
  recurringErrors: string[];
  masteredItems: string[];
  lastFocus?: string;
  updatedAt: number;
}

const MEMORY_KEY = 'benenglish-ai-tutor-memory-v1';

export function loadLearnerMemory(): LearnerMemory {
  try {
    const saved = JSON.parse(localStorage.getItem(MEMORY_KEY) || '{}');
    return {
      recurringErrors: Array.isArray(saved.recurringErrors) ? saved.recurringErrors.slice(0, 12) : [],
      masteredItems: Array.isArray(saved.masteredItems) ? saved.masteredItems.slice(0, 12) : [],
      lastFocus: typeof saved.lastFocus === 'string' ? saved.lastFocus : undefined,
      updatedAt: Number(saved.updatedAt) || 0,
    };
  } catch {
    return { recurringErrors: [], masteredItems: [], updatedAt: 0 };
  }
}

export function saveLearnerMemory(memory: LearnerMemory): void {
  try {
    localStorage.setItem(MEMORY_KEY, JSON.stringify({
      ...memory,
      recurringErrors: memory.recurringErrors.slice(0, 12),
      masteredItems: memory.masteredItems.slice(0, 12),
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
  const normalise = (value: string) => value.trim().replace(/\s+/g, ' ').slice(0, 180);
  const errors = [...newErrors, ...current.recurringErrors].map(normalise).filter(Boolean);
  const masteredItems = [...mastered, ...current.masteredItems].map(normalise).filter(Boolean);
  const unique = (items: string[]) => items.filter((item, index) =>
    items.findIndex(other => other.toLowerCase() === item.toLowerCase()) === index
  );
  return {
    recurringErrors: unique(errors).slice(0, 12),
    masteredItems: unique(masteredItems).slice(0, 12),
    lastFocus: newErrors[0] || current.lastFocus,
    updatedAt: Date.now(),
  };
}

export function recommendNextLesson<T extends { id: string; title: string; level: string; theme?: string }>(
  lessons: T[],
  evidence: LearningEvidence[],
  currentLevel: string,
  currentLessonId?: string,
): { lesson: T | null; weakestSkill: LearningSkill | null; accuracy: number | null; reason: string } {
  const recent = evidence.filter(item => Date.now() - item.at < 1000 * 60 * 60 * 24 * 45);
  const bySkill = new Map<LearningSkill, { attempts: number; correct: number }>();
  for (const item of recent) {
    const row = bySkill.get(item.skill) || { attempts: 0, correct: 0 };
    row.attempts += 1;
    if (item.correct) row.correct += 1;
    bySkill.set(item.skill, row);
  }
  const ranked = [...bySkill.entries()]
    .filter(([, value]) => value.attempts >= 2)
    .sort((a, b) => (a[1].correct / a[1].attempts) - (b[1].correct / b[1].attempts));
  const weakestSkill = ranked[0]?.[0] || null;
  const accuracy = ranked.length ? Math.round(ranked[0][1].correct / ranked[0][1].attempts * 100) : null;
  const levelOrder = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const currentIndex = Math.max(0, levelOrder.indexOf(currentLevel));
  const candidates = lessons.filter(lesson => lesson.id !== currentLessonId);
  const sameLevel = candidates.filter(lesson => lesson.level === currentLevel);
  const lesson = sameLevel[0] || candidates.find(item =>
    Math.abs(levelOrder.indexOf(item.level) - currentIndex) <= 1
  ) || candidates[0] || lessons[0] || null;
  const reason = weakestSkill
    ? `Ưu tiên ${weakestSkill} vì độ chính xác gần đây là ${accuracy}% trong ${ranked[0][1].attempts} lượt; bài tiếp theo được chọn ở mức ${lesson?.level || currentLevel}.`
    : 'Chưa có đủ hai lượt đánh giá cho mỗi kỹ năng; tiếp tục bài hiện tại để thu thập bằng chứng trước khi điều chỉnh độ khó.';
  return { lesson, weakestSkill, accuracy, reason };
}
