import { CEFRLevel, HighSchoolGrade, TrackType } from '../types';

export type LessonSkill = 'listening' | 'reading' | 'vocabulary' | 'grammar' | 'speaking' | 'writing' | 'assessment';
export interface LessonStep {
  id: string;
  title: string;
  skill: LessonSkill;
  minutes: number;
  objective: string;
  lab: 'listening' | 'speaking' | 'reading-writing' | 'vocabulary' | 'exam' | 'conversation';
}
export interface CurriculumUnit {
  id: string;
  track: TrackType;
  grade?: HighSchoolGrade;
  level: CEFRLevel;
  category: string;
  title: string;
  description: string;
  outcomes: string[];
  vocabularyFocus: string[];
  grammarFocus: string[];
  steps: LessonStep[];
}

const steps = (prefix: string, theme: string): LessonStep[] => [
  { id: prefix + '-listen', title: 'Listen & notice', skill: 'listening', minutes: 12, objective: 'Understand the main message, key details and useful expressions in a level-matched recording.', lab: 'listening' },
  { id: prefix + '-read', title: 'Read for meaning', skill: 'reading', minutes: 12, objective: 'Read a connected text, identify its purpose and infer meaning from context.', lab: 'reading-writing' },
  { id: prefix + '-words', title: 'Build topic vocabulary', skill: 'vocabulary', minutes: 10, objective: 'Learn, pronounce and retrieve useful words and collocations for ' + theme + '.', lab: 'vocabulary' },
  { id: prefix + '-grammar', title: 'Grammar in context', skill: 'grammar', minutes: 10, objective: 'Notice and apply the target language in meaningful sentences.', lab: 'vocabulary' },
  { id: prefix + '-speak', title: 'Speak & interact', skill: 'speaking', minutes: 12, objective: 'Give a clear spoken response and sustain a short interaction about ' + theme + '.', lab: 'speaking' },
  { id: prefix + '-write', title: 'Write to communicate', skill: 'writing', minutes: 12, objective: 'Produce a structured written response for the target audience and purpose.', lab: 'reading-writing' },
  { id: prefix + '-check', title: 'Apply & check', skill: 'assessment', minutes: 8, objective: 'Complete retrieval and comprehension checks; save evidence for the next learning recommendation.', lab: 'exam' },
];

const highSchoolThemes: Array<{ grade: HighSchoolGrade; level: CEFRLevel; items: Array<[string, string, string[], string[]]> }> = [
  { grade: 'Grade 10', level: 'A2', items: [
    ['Family life and generation gaps', 'Family relationships, responsibilities and changing generations', ['generation gap', 'household chores', 'family values'], ['Present simple and present continuous', 'Past simple and used to']],
    ['Humans and the environment', 'Environmental problems and practical green habits', ['carbon footprint', 'renewable energy', 'single-use plastic'], ['Comparatives and superlatives', 'Should, must and have to']],
    ['Music and the arts', 'Music, creative expression and cultural events', ['performance', 'audience', 'inspiration'], ['Present perfect', 'Relative clauses']],
    ['For a better community', 'Volunteering, community projects and social responsibility', ['volunteer', 'donate', 'raise awareness'], ['Gerunds and infinitives', 'Past simple vs present perfect']],
    ['Inventions and technology', 'Useful inventions and the way technology changes daily life', ['invention', 'device', 'artificial intelligence'], ['Passive voice', 'Reported speech basics']],
  ]},
  { grade: 'Grade 11', level: 'B1', items: [
    ['A long and healthy life', 'Healthy routines, wellbeing and informed lifestyle choices', ['balanced diet', 'mental wellbeing', 'preventive care'], ['Present perfect continuous', 'Conditionals type 1 and 2']],
    ['The generation gap', 'Communication, values and resolving intergenerational conflict', ['mutual understanding', 'independence', 'conflict resolution'], ['Modals of obligation and advice', 'Cleft sentences']],
    ['Cities of the future', 'Urbanisation, sustainable transport and smart-city design', ['urbanisation', 'infrastructure', 'sustainable'], ['Future forms', 'Adverbial clauses']],
    ['Social issues', 'Inequality, inclusion and community responses', ['discrimination', 'equal opportunity', 'social support'], ['Relative clauses', 'Participle clauses']],
    ['Global warming', 'Climate evidence, consequences and climate action', ['greenhouse gases', 'biodiversity', 'mitigation'], ['Passive voice review', 'Conditionals and wishes']],
  ]},
  { grade: 'Grade 12', level: 'B1', items: [
    ['Life stories and career paths', 'Personal achievements, role models and future choices', ['achievement', 'career pathway', 'determination'], ['Past perfect', 'Reported speech']],
    ['Urbanisation and sustainable development', 'Urban challenges, migration and sustainable planning', ['migration', 'housing pressure', 'public transport'], ['Articles and quantifiers', 'Complex noun phrases']],
    ['The green movement', 'Environmental campaigns and individual responsibility', ['conservation', 'campaign', 'eco-friendly'], ['Modal verbs in the past', 'Conditional sentences']],
    ['The world of work', 'Employability, workplace skills and career preparation', ['application', 'qualification', 'professional development'], ['Relative clauses', 'Reported questions']],
    ['International organisations and global issues', 'International cooperation, culture and global citizenship', ['cooperation', 'humanitarian', 'global citizen'], ['Conjunctions and discourse markers', 'Mixed grammar revision']],
  ]},
];

export const HIGH_SCHOOL_CURRICULUM: CurriculumUnit[] = highSchoolThemes.flatMap(({ grade, level, items }) =>
  items.map(([title, description, vocabularyFocus, grammarFocus], index) => {
    const id = 'hs-' + grade.toLowerCase().replace(' ', '') + '-' + String(index + 1).padStart(2, '0');
    return {
      id, track: 'high_school' as const, grade, level, category: grade + ' curriculum',
      title, description,
      outcomes: ['Understand and discuss the topic at ' + level + ' level.', 'Use topic vocabulary accurately in context.', 'Integrate listening, reading, speaking and writing around one theme.'],
      vocabularyFocus, grammarFocus, steps: steps(id, title),
    };
  })
);

const professionalThemes: Record<CEFRLevel, Array<[string, string, string[], string[]]>> = {
  A1: [
    ['Starting a new job', 'Introduce yourself, your role and your immediate team', ['job title', 'department', 'colleague'], ['Be: present simple', 'Personal pronouns and possessives']],
    ['Everyday workplace routines', 'Describe schedules, tasks and simple workplace needs', ['schedule', 'task', 'break'], ['Present simple', 'Time and frequency expressions']],
    ['Basic customer interaction', 'Greet customers, clarify simple needs and offer help', ['request', 'help', 'available'], ['Can / can’t', 'Polite questions']],
  ],
  A2: [
    ['Emails and everyday messages', 'Write clear short messages and respond to routine requests', ['subject line', 'attachment', 'follow-up'], ['Past simple', 'Countable and uncountable nouns']],
    ['Arranging meetings', 'Suggest times, confirm details and manage simple changes', ['availability', 'agenda', 'reschedule'], ['Future arrangements', 'Prepositions of time']],
    ['Explaining a product or service', 'Describe features, benefits and basic instructions', ['feature', 'benefit', 'instruction'], ['Comparatives', 'Imperatives and sequencing']],
  ],
  B1: [
    ['Project updates', 'Explain progress, blockers, ownership and next steps', ['milestone', 'dependency', 'deadline'], ['Present perfect for progress', 'First conditional']],
    ['Participating in meetings', 'Share opinions, agree, disagree and clarify decisions', ['agenda item', 'consensus', 'action point'], ['Modals for suggestions', 'Reported statements']],
    ['Handling customer concerns', 'Acknowledge issues, ask questions and propose solutions', ['complaint', 'resolve', 'expectation'], ['Second conditional', 'Reason and result clauses']],
  ],
  B2: [
    ['Presentations with impact', 'Structure a persuasive presentation and handle questions', ['key takeaway', 'evidence', 'recommendation'], ['Signposting language', 'Complex conditionals']],
    ['Negotiation and influencing', 'Explore interests, make proposals and reach agreement', ['trade-off', 'concession', 'mutual benefit'], ['Hedging and diplomacy', 'Modal perfect forms']],
    ['Analysing data and performance', 'Describe trends, explain causes and qualify conclusions', ['benchmark', 'forecast', 'variance'], ['Comparative structures', 'Passive reporting verbs']],
  ],
  C1: [
    ['Strategic decision-making', 'Evaluate options, risks and long-term organisational impact', ['strategic alignment', 'mitigation', 'feasibility'], ['Advanced concession clauses', 'Nominalisation']],
    ['Leading change and difficult conversations', 'Communicate change with empathy, clarity and accountability', ['stakeholder buy-in', 'resistance', 'accountability'], ['Nuanced modality', 'Emphasis and inversion']],
    ['Executive communication', 'Deliver concise recommendations to senior decision-makers', ['executive summary', 'implication', 'prioritisation'], ['Dense noun phrases', 'Cohesion and information flow']],
  ],
  C2: [
    ['Cross-cultural leadership', 'Navigate ambiguity and complex intercultural expectations', ['cultural intelligence', 'implicit meaning', 'rapport'], ['Pragmatic nuance', 'Register and style shifts']],
    ['High-stakes negotiation', 'Manage competing interests and nuanced strategic trade-offs', ['contingency', 'leverage', 'concession'], ['Discourse strategies', 'Precision and qualification']],
    ['Thought leadership and influence', 'Develop a compelling position and defend it with nuance', ['thesis', 'counterargument', 'synthesis'], ['Rhetorical structures', 'Advanced cohesion']],
  ],
};

export const PROFESSIONAL_CURRICULUM: CurriculumUnit[] = (Object.entries(professionalThemes) as Array<[CEFRLevel, typeof professionalThemes[CEFRLevel]]>).flatMap(([level, items]) =>
  items.map(([title, description, vocabularyFocus, grammarFocus], index) => {
    const id = 'pro-' + level.toLowerCase() + '-' + String(index + 1).padStart(2, '0');
    return {
      id, track: 'professional' as const, level, category: 'Professional development',
      title, description,
      outcomes: ['Communicate effectively in this workplace situation at ' + level + ' level.', 'Use precise professional vocabulary and an appropriate register.', 'Transfer the language into a realistic work task.'],
      vocabularyFocus, grammarFocus, steps: steps(id, title),
    };
  })
);

export const ALL_CURRICULUM_UNITS = [...HIGH_SCHOOL_CURRICULUM, ...PROFESSIONAL_CURRICULUM];
