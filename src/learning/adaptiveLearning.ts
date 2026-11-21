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


export interface PersonalizedPracticeTask {
  skill: LearningSkill;
  title: string;
  reason: string;
  prompt: string;
  guidance: string;
  evidenceCount: number;
  accuracy: number | null;
  source: 'correction' | 'assessment';
}

export function buildPersonalizedPractice(input: {
  evidence: LearningEvidence[];
  memory: LearnerMemory;
  track: 'high_school' | 'professional';
  level: string;
  grade?: string;
  role?: string;
}): PersonalizedPracticeTask | null {
  const recent = input.evidence.filter(item =>
    Number.isFinite(item.at) && Date.now() - item.at >= 0 && Date.now() - item.at <= 45 * 24 * 60 * 60 * 1000
  );
  const school = input.track === 'high_school';
  const context = school ? (input.grade || 'your school life') : (input.role || 'your workplace');
  const latestError = input.memory.recurringErrors.find(item => typeof item === 'string' && item.includes('→'));
  if (latestError) {
    const [original, ...rest] = latestError.split('→');
    const improved = rest.join('→').replace(/\\s*\\(seen \\d+ times\\)\\s*$/i, '').trim();
    if (original?.trim() && improved) {
      const count = input.memory.errorFrequency?.[latestError] || 1;
      return {
        skill: 'grammar',
        title: 'Turn a correction into a habit',
        reason: 'Built from a real correction in your learning history' + (count > 1 ? ` (noticed ${count} times)` : ''),
        prompt: `Earlier version: “${original.trim()}”\\nImproved version: “${improved}”\\n\\nYour task: write one new, natural sentence that uses the same corrected pattern. Then explain the change in one short phrase.`,
        guidance: 'Do not copy the improved sentence. Make a fresh example related to ' + context + '. The tutor will check whether you reused the pattern accurately.',
        evidenceCount: count,
        accuracy: null,
        source: 'correction',
      };
    }
  }

  const bySkill = new Map<string, { attempts: number; correct: number; failedTopics: string[] }>();
  for (const item of recent) {
    const row = bySkill.get(item.skill) || { attempts: 0, correct: 0, failedTopics: [] };
    row.attempts += 1;
    if (item.correct) row.correct += 1;
    else if (item.topic) row.failedTopics.push(item.topic);
    bySkill.set(item.skill, row);
  }
  const weakest = [...bySkill.entries()]
    .filter(([, row]) => row.attempts >= 2)
    .sort((a, b) => (a[1].correct / a[1].attempts) - (b[1].correct / b[1].attempts))[0];
  if (!weakest) return null;

  const [skillName, row] = weakest;
  const skill = skillName as LearningSkill;
  const accuracy = Math.round(row.correct / row.attempts * 100);
  const topic = row.failedTopics[row.failedTopics.length - 1] || (school ? 'school and everyday life' : 'workplace communication');
  const taskBySkill: Record<string, { title: string; prompt: string; guidance: string }> = {
    grammar: {
      title: 'Build accurate sentences',
      prompt: `Focus: ${topic}. Write two original sentences about ${context}. In each sentence, use a clear subject and verb, and make the time relationship easy to understand.`,
      guidance: 'The tutor will check sentence structure, verb forms and whether both sentences communicate your intended meaning.',
    },
    vocabulary: {
      title: 'Retrieve words in context',
      prompt: `Focus: ${topic}. Write three useful English words or expressions you would use in this situation. For each one, write a short sentence that shows its meaning.`,
      guidance: 'Choose expressions you can genuinely use; the tutor will check meaning, collocation and natural use.',
    },
    pragmatics: {
      title: 'Choose the right tone',
      prompt: school
        ? `A classmate disagrees with your idea about “${topic}”. Write a respectful reply that acknowledges their view and explains your own.`
        : `A colleague has a different view about “${topic}”. Write a concise, professional reply that acknowledges their concern and proposes a constructive next step.`,
      guidance: 'The tutor will check politeness, clarity, audience awareness and whether your response moves the conversation forward.',
    },
    listening: {
      title: 'Listen, capture and retell',
      prompt: 'Play the latest English reply from your tutor. Write down three key points you heard, then summarise the message in two sentences.',
      guidance: 'Replay the audio if needed. The tutor will compare your summary with the ideas in the conversation.',
    },
    reading: {
      title: 'Read for meaning',
      prompt: `Use the current lesson passage about “${topic}”. Write its main idea in one sentence, then add two details that support it.`,
      guidance: 'Use information from the passage rather than adding unsupported details. The tutor will check accuracy and evidence.',
    },
    speaking: {
      title: 'Speak with a clear structure',
      prompt: school
        ? `Speak for about 45 seconds about “${topic}”. State your main idea, give one reason, and add a real or imagined example from student life.`
        : `Speak for about 45 seconds about “${topic}”. State the situation, explain your action, and describe the outcome or next step.`,
      guidance: 'You can dictate your answer into the tutor chat. Aim for a connected response rather than isolated phrases.',
    },
    writing: {
      title: 'Write for a clear purpose',
      prompt: school
        ? `Write a short 4-sentence paragraph about “${topic}”. Include a topic sentence, one reason, one example and a closing sentence.`
        : `Write a concise 4-sentence workplace message about “${topic}”. State the purpose, key detail, requested action and next step.`,
      guidance: 'The tutor will check task completion, organisation, grammar and whether the tone fits the audience.',
    },
  };
  const task = taskBySkill[skill] || taskBySkill.speaking;
  return {
    skill,
    title: task.title,
    reason: `Based on ${row.attempts} recent ${skill} checks; observed accuracy is ${accuracy}% (practice evidence, not a CEFR score).`,
    prompt: task.prompt,
    guidance: task.guidance,
    evidenceCount: row.attempts,
    accuracy,
    source: 'assessment',
  };
}
