import type { CEFRLevel, UserProfile } from '../types';

export type LearnerSkill = 'listening' | 'speaking' | 'reading' | 'understanding' | 'pronunciation';

export interface AdaptiveLearnerSnapshot {
  placementLevel: CEFRLevel | null;
  skillLevels: Partial<Record<LearnerSkill, CEFRLevel>>;
  skillEvidence: Record<LearnerSkill, { score: number | null; samples: number; confidence: 'low' | 'medium' | 'high'; note: string }>;
  weakAreas: string[];
  recurringErrors: string[];
  recentSessionNotes: string[];
  recommendedFocus: LearnerSkill[];
  evidenceSummary: string[];
}

const average = (values: number[]) => values.length
  ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
  : null;

const levelFromEvidence = (score: number): CEFRLevel => {
  if (score < 30) return 'A1';
  if (score < 48) return 'A2';
  if (score < 66) return 'B1';
  if (score < 82) return 'B2';
  if (score < 93) return 'C1';
  return 'C2';
};

const safeScore = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;

export function buildAdaptiveLearnerSnapshot(user: UserProfile): AdaptiveLearnerSnapshot {
  const placement = user.placementAssessment;
  const listening = user.listeningProgress;
  const speaking = user.speakingProgress;
  const conversations = user.conversationProgress?.savedSessions || [];
  const roleplays = user.roleplayProgress?.history || [];

  const recentListening = (user.recentListeningScores || []).filter(safeScore).slice(-5);
  const listeningAttempts = (listening?.dictationAttemptCount || 0) + (listening?.comprehensionAttemptCount || 0);
  const listeningMeasures = [
    ...recentListening,
    ...(listening && (listening.dictationAttemptCount || 0) > 0 && safeScore(listening.dictationAccuracyAvg) ? [listening.dictationAccuracyAvg] : []),
    ...(listening && (listening.comprehensionAttemptCount || 0) > 0 && safeScore(listening.comprehensionAccuracyAvg) ? [listening.comprehensionAccuracyAvg] : []),
  ];
  const speakingHistory = (speaking?.history || []).slice(-5).map(item => item.score).filter(safeScore);
  const recentSpeaking = (user.recentSpeakingScores || []).filter(safeScore).slice(-5);
  const speakingMeasures = speakingHistory.length ? speakingHistory : recentSpeaking;
  const pronunciationMeasures = (user.recentPronunciationScores || []).filter(safeScore).slice(-5);
  const roleplayScores = roleplays.slice(-5).map(item => item.assessment?.overallScore).filter(safeScore);
  const conversationMistakes = conversations.slice(-6).flatMap(session =>
    (session.summaryReport?.grammarMistakes || []).map(item => ({
      original: item.userSaid,
      correction: item.correction,
      rule: item.rule,
    }))
  );

  const skillEvidence: AdaptiveLearnerSnapshot['skillEvidence'] = {
    listening: {
      score: average(listeningMeasures),
      samples: Math.max(recentListening.length, listeningAttempts),
      confidence: Math.max(recentListening.length, listeningAttempts) >= 5 ? 'high' : Math.max(recentListening.length, listeningAttempts) >= 2 ? 'medium' : 'low',
      note: listeningMeasures.length ? 'Based on saved listening assessments and dictation/comprehension attempts.' : 'No scored listening attempts are saved yet.',
    },
    speaking: {
      score: average(speakingMeasures),
      samples: speakingMeasures.length,
      confidence: speakingMeasures.length >= 5 ? 'high' : speakingMeasures.length >= 2 ? 'medium' : 'low',
      note: speakingMeasures.length ? 'Based on saved speaking evaluations.' : 'No scored speaking evaluations are saved yet.',
    },
    reading: {
      score: placement?.skills.reading.score ?? null,
      samples: placement ? 1 : 0,
      confidence: placement ? 'medium' : 'low',
      note: placement ? placement.skills.reading.evidence : 'Reading has not been assessed yet.',
    },
    understanding: {
      score: placement?.skills.understanding.score ?? null,
      samples: placement ? 1 : 0,
      confidence: placement ? 'medium' : 'low',
      note: placement ? placement.skills.understanding.evidence : 'Use of English has not been assessed yet.',
    },
    pronunciation: {
      score: average(pronunciationMeasures),
      samples: pronunciationMeasures.length,
      confidence: pronunciationMeasures.length >= 5 ? 'high' : pronunciationMeasures.length >= 2 ? 'medium' : 'low',
      note: pronunciationMeasures.length ? 'Based on saved pronunciation evaluation scores; transcript-only evidence is not treated as pronunciation evidence.' : 'No pronunciation evaluation scores are saved yet.',
    },
  };

  const skillLevels: AdaptiveLearnerSnapshot['skillLevels'] = {};
  for (const skill of Object.keys(skillEvidence) as LearnerSkill[]) {
    const placed = skill === 'pronunciation' ? undefined : placement?.skills[skill];
    const evidence = skillEvidence[skill];
    if (placed?.level) skillLevels[skill] = placed.level;
    else if (evidence.score !== null && evidence.samples >= 2) skillLevels[skill] = levelFromEvidence(evidence.score);
  }

  const weakAreas: string[] = [...(placement?.priorities || [])];
  (listening?.misunderstoodVocab || []).filter(item => item.count >= 2).slice(0, 5)
    .forEach(item => weakAreas.push(`Listening vocabulary: “${item.word}” missed ${item.count} times`));

  const errorCounts = new Map<string, { count: number; original: string; correction: string; rule: string }>();
  for (const error of conversationMistakes) {
    const key = error.rule.trim().toLowerCase() || error.original.trim().toLowerCase();
    if (!key) continue;
    const current = errorCounts.get(key);
    errorCounts.set(key, {
      count: (current?.count || 0) + 1,
      original: error.original,
      correction: error.correction,
      rule: error.rule,
    });
  }
  const recurringErrors = [...errorCounts.values()].filter(item => item.count >= 2)
    .sort((a, b) => b.count - a.count).slice(0, 5)
    .map(item => `${item.rule} (observed ${item.count} times; e.g. “${item.original}” → “${item.correction}”)`);

  roleplays.slice(-4).flatMap(item => item.assessment?.criticalAreasForImprovement || [])
    .slice(0, 4).forEach(item => weakAreas.push(`Roleplay feedback: ${item}`));

  const candidates = (Object.entries(skillEvidence) as [LearnerSkill, AdaptiveLearnerSnapshot['skillEvidence'][LearnerSkill]][])
    .filter(([skill, evidence]) => evidence.score !== null && (evidence.samples >= 2 || (skill !== 'pronunciation' && placement?.skills[skill]?.score !== undefined)))
    .sort((a, b) => (a[1].score ?? 100) - (b[1].score ?? 100));
  const recommendedFocus = candidates.slice(0, 2).map(([skill]) => skill);
  if (!recommendedFocus.length) {
    if (!placement) recommendedFocus.push('listening', 'speaking');
    else recommendedFocus.push('speaking');
  }

  const evidenceSummary = (Object.entries(skillEvidence) as [LearnerSkill, AdaptiveLearnerSnapshot['skillEvidence'][LearnerSkill]][])
    .map(([skill, evidence]) => `${skill}: ${evidence.score === null ? 'not assessed' : `${evidence.score}/100 from ${evidence.samples} saved sample(s)`} (${evidence.confidence} confidence)`);

  return {
    placementLevel: placement?.overallLevel || null,
    skillLevels,
    skillEvidence,
    weakAreas: [...new Set(weakAreas)].slice(0, 12),
    recurringErrors,
    recentSessionNotes: conversations.slice(-3).reverse()
      .map(session => session.summaryReport?.summary || '')
      .filter(Boolean),
    recommendedFocus,
    evidenceSummary,
  };
}
