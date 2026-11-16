import type { TrackType, HighSchoolGrade, CEFRLevel } from '../types';

/**
 * Structured curriculum catalogue for the two BenEnglish programmes.
 * Lesson activities are original learning prompts, not claimed recordings.
 * Listening items link to publisher-hosted human audio in the existing Listening Lab.
 */
export type CurriculumSkill = 'listening' | 'reading' | 'writing' | 'speaking';
export interface SkillActivity {
  skill: CurriculumSkill;
  title: string;
  objective: string;
  task: string;
  evidence: string;
  durationMinutes: number;
}
export interface CurriculumUnit {
  id: string;
  track: TrackType;
  grade?: HighSchoolGrade;
  cefrLevel: CEFRLevel;
  title: string;
  theme: string;
  vocabularyFocus: string[];
  grammarFocus: string[];
  activities: SkillActivity[];
}

const skillNames: Record<CurriculumSkill, string> = {
  listening: 'Listen and understand',
  reading: 'Read and interpret',
  writing: 'Write with purpose',
  speaking: 'Speak and interact',
};

const skillObjectives: Record<CEFRLevel, Record<CurriculumSkill, string>> = {
  A1: { listening:'Recognise familiar words and simple information spoken clearly.', reading:'Understand short, simple texts with familiar vocabulary.', writing:'Write simple sentences and a short connected message.', speaking:'Exchange basic information using short, rehearsed phrases.' },
  A2: { listening:'Understand common phrases and the main point of short, clear messages.', reading:'Find predictable information in short everyday texts.', writing:'Write a short description or message using simple connected sentences.', speaking:'Describe routines, people and plans in a simple sequence.' },
  B1: { listening:'Understand the main points of clear speech on familiar school, social or work topics.', reading:'Understand factual texts and identify main ideas and supporting details.', writing:'Produce a connected text with reasons, examples and a clear sequence.', speaking:'Explain opinions and experiences and respond to follow-up questions.' },
  B2: { listening:'Follow extended speech, argument and most standard discussions.', reading:'Understand articles and reports with viewpoints and complex argument.', writing:'Develop a clear, detailed argument with appropriate register and cohesion.', speaking:'Interact with fluency, justify a position and compare alternatives.' },
  C1: { listening:'Follow implicit meaning, stance and complex extended discourse.', reading:'Interpret demanding texts, tone, nuance and implied assumptions.', writing:'Produce well-structured, precise texts for complex purposes and audiences.', speaking:'Express nuanced ideas fluently, flexibly and with appropriate register.' },
  C2: { listening:'Understand virtually all spoken language, including subtle pragmatic meaning.', reading:'Interpret virtually all forms of written language with precision.', writing:'Communicate complex distinctions clearly and stylistically appropriately.', speaking:'Express fine shades of meaning spontaneously and precisely.' },
};

const levelThemes: Record<CEFRLevel, { theme: string; vocabulary: string[]; grammar: string[] }> = {
  A1:{theme:'Personal world and everyday communication',vocabulary:['personal information','family','school or workplace objects','daily routines'],grammar:['be and have','present simple','articles and plurals','basic questions']},
  A2:{theme:'Daily life, community and practical tasks',vocabulary:['places and directions','food and services','study or job routines','plans and experiences'],grammar:['past simple','future plans','comparatives','countable and uncountable nouns']},
  B1:{theme:'Experiences, choices and social issues',vocabulary:['education and careers','environment','technology','health and community'],grammar:['present perfect','conditionals','relative clauses','reported speech']},
  B2:{theme:'Analysis, argument and independent communication',vocabulary:['innovation','society and culture','leadership','evidence and outcomes'],grammar:['passive structures','complex clauses','modal deduction','cohesion and hedging']},
  C1:{theme:'Critical thinking and nuanced communication',vocabulary:['policy and impact','research and evidence','strategic decisions','ethical dilemmas'],grammar:['inversion and emphasis','advanced conditionals','nominalisation','stance and register']},
  C2:{theme:'Precision, synthesis and specialist discourse',vocabulary:['abstract concepts','specialist terminology','rhetorical nuance','idiomatic precision'],grammar:['stylistic variation','pragmatic implication','complex information structure','rhetorical control']},
};

const activity = (skill: CurriculumSkill, level: CEFRLevel, theme: string, track: TrackType): SkillActivity => {
  const school = track === 'high_school';
  const context = school ? 'Vietnamese high-school life, academic study and age-appropriate real-world themes' : 'authentic workplace communication and role-specific professional situations';
  const tasks: Record<CurriculumSkill, string> = {
    listening: `Listen to a level-matched human recording about ${theme.toLowerCase()}. Identify the main message, key details and speaker intention; then complete a short note-taking or comprehension task. Use an attributed publisher recording in the Listening Lab.`,
    reading: `Read an original ${level}-level text about ${theme.toLowerCase()}. Identify its main idea, locate supporting evidence, infer meaning from context and answer a short response question.`,
    writing: `Write a level-appropriate response about ${theme.toLowerCase()}. Plan the purpose and audience, develop your ideas, then submit your own draft for AI feedback grounded in the exact text you wrote.`,
    speaking: `Give a spoken response about ${theme.toLowerCase()}. State your main idea, support it with a relevant detail and respond to one adaptive follow-up from the AI tutor.`,
  };
  return { skill, title: skillNames[skill], objective: skillObjectives[level][skill], task: tasks[skill] + ' Context: ' + context + '.', evidence: skill === 'listening' ? 'Comprehension answers and notes' : skill === 'reading' ? 'Text-based answers and evidence' : skill === 'writing' ? 'Learner draft, rubric and corrections tied to quoted text' : 'Speech transcript and turn-by-turn conversational evidence', durationMinutes: skill === 'writing' || skill === 'speaking' ? 8 : 6 };
};

const levels: CEFRLevel[] = ['A1','A2','B1','B2','C1'];
const schoolGrades: HighSchoolGrade[] = ['Grade 10','Grade 11','Grade 12'];
const professionalThemes: Record<CEFRLevel,string> = {
  A1:'Introducing yourself and describing your role',
  A2:'Daily tasks, customer requests and arranging a meeting',
  B1:'Explaining a project update and solving a routine problem',
  B2:'Presenting recommendations and negotiating priorities',
  C1:'Leading a complex discussion and communicating strategic risk',
};
const schoolThemes: Record<HighSchoolGrade,string> = {
  'Grade 10':'School life, friendships, healthy habits and the environment',
  'Grade 11':'Community issues, cultural identity, technology and future careers',
  'Grade 12':'Higher education, career choices, global challenges and exam readiness',
};

export const COMPLETE_GRADE_CEFR_CURRICULUM: CurriculumUnit[] = [
  ...schoolGrades.flatMap((grade, gradeIndex) => levels.map((level, levelIndex) => {
    const theme = schoolThemes[grade];
    const band = levelThemes[level];
    return {
      id: `hs-g${gradeIndex + 10}-${level.toLowerCase()}`,
      track: 'high_school' as const, grade, cefrLevel: level,
      title: `${grade} · ${level} · ${theme.split(',')[0]}`,
      theme,
      vocabularyFocus: band.vocabulary,
      grammarFocus: band.grammar,
      activities: (['listening','reading','writing','speaking'] as CurriculumSkill[]).map(skill => activity(skill, level, theme, 'high_school')),
    };
  })),
  ...levels.map(level => {
    const theme = professionalThemes[level];
    const band = levelThemes[level];
    return {
      id: `professional-${level.toLowerCase()}`,
      track: 'professional' as const, cefrLevel: level,
      title: `Professional English · ${level} · ${theme}`,
      theme,
      vocabularyFocus: band.vocabulary,
      grammarFocus: band.grammar,
      activities: (['listening','reading','writing','speaking'] as CurriculumSkill[]).map(skill => activity(skill, level, theme, 'professional')),
    };
  }),
];

export function getCurriculumUnits(input: { track: TrackType; grade?: HighSchoolGrade; level?: CEFRLevel }): CurriculumUnit[] {
  return COMPLETE_GRADE_CEFR_CURRICULUM.filter(unit =>
    unit.track === input.track &&
    (input.track !== 'high_school' || !input.grade || unit.grade === input.grade) &&
    (!input.level || unit.cefrLevel === input.level)
  );
}

export function getSkillActivity(input: { track: TrackType; grade?: HighSchoolGrade; level: CEFRLevel; skill: CurriculumSkill }): SkillActivity | undefined {
  return getCurriculumUnits(input).find(unit => true)?.activities.find(item => item.skill === input.skill);
}
