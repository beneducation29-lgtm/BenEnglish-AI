import type { CEFRLevel, HighSchoolGrade, TrackType } from '../types';
import type { GradeCefrLessonUnit, CurriculumQuestion } from './gradeCefrCurriculum';

type LessonSeed = {
  id: string;
  track: TrackType;
  grade?: HighSchoolGrade;
  level: Exclude<CEFRLevel, 'C2'>;
  title: string;
  theme: string;
  vocabulary: GradeCefrLessonUnit['vocabulary'];
  grammarFocus: string[];
  listeningScript: string;
  listeningQuestions: Array<{ prompt: string; options: string[]; answer: string; explanation: string }>;
  readingPassage: string;
  readingQuestions: Array<{ prompt: string; options: string[]; answer: string; explanation: string }>;
  writingPrompt: string;
  speakingPrompt: string;
  followUps: string[];
};

const questions = (unitId: string, skill: 'listen' | 'read', items: LessonSeed['listeningQuestions']): CurriculumQuestion[] =>
  items.map((item, index) => ({
    id: unitId + '-' + skill + '-' + (index + 1),
    prompt: item.prompt,
    options: item.options,
    answer: item.answer,
    explanation: item.explanation,
  }));

const build = (seed: LessonSeed): GradeCefrLessonUnit => ({
  id: seed.id,
  track: seed.track,
  grade: seed.grade,
  level: seed.level,
  title: seed.title,
  theme: seed.theme,
  vocabulary: seed.vocabulary,
  grammarFocus: seed.grammarFocus,
  listening: {
    script: seed.listeningScript,
    audioMode: 'speech_synthesis_preview',
    questions: questions(seed.id, 'listen', seed.listeningQuestions),
  },
  reading: {
    passage: seed.readingPassage,
    questions: questions(seed.id, 'read', seed.readingQuestions),
  },
  writing: {
    prompt: seed.writingPrompt,
    checklist: [
      'Answer every part of the task with relevant details.',
      'Organise ideas so the reader can follow the message.',
      'Use the target vocabulary and grammar accurately.',
      'Check spelling, verb forms and punctuation before submitting.',
    ],
  },
  speaking: {
    prompt: seed.speakingPrompt,
    followUps: seed.followUps,
    targetMinutes: seed.level === 'A1' || seed.level === 'A2' ? 1 : 2,
  },
});

const seeds: LessonSeed[] = [
  {
    id: 'hs10-a2-community', track: 'high_school', grade: 'Grade 10', level: 'A2',
    title: 'A Greener School Community', theme: 'School environment and everyday responsibility',
    vocabulary: [
      { word: 'reusable', meaningVi: 'có thể tái sử dụng', example: 'Students bring reusable bottles to school.' },
      { word: 'sort waste', meaningVi: 'phân loại rác', example: 'Our class sorts waste after lunch.' },
      { word: 'take part', meaningVi: 'tham gia', example: 'Many students take part in the clean-up.' },
    ],
    grammarFocus: ['should / shouldn’t for advice', 'because and so for reasons and results', 'imperatives for instructions'],
    listeningScript: 'Our school is starting a green Friday project. Every class will collect paper, plastic and cans in separate boxes. Students should bring reusable bottles and switch off lights when they leave a room. The environmental club will check the results at the end of each month. We hope these small actions will make our school cleaner.',
    listeningQuestions: [
      { prompt: 'What will classes collect separately?', options: ['Books and uniforms', 'Paper, plastic and cans', 'Food and water'], answer: 'Paper, plastic and cans', explanation: 'The speaker names three materials for separate collection.' },
      { prompt: 'When will the club check the results?', options: ['Every Friday', 'At the end of each month', 'At the end of the school year'], answer: 'At the end of each month', explanation: 'The final sentence about monitoring gives a monthly schedule.' },
    ],
    readingPassage: 'A greener school does not need expensive equipment. Students can start by using both sides of a sheet of paper, bringing a refillable water bottle and keeping classrooms tidy. Teachers can place clearly labelled recycling boxes in shared areas. When students work together and measure what they change, good habits are more likely to continue.',
    readingQuestions: [
      { prompt: 'Which action is suggested in the passage?', options: ['Use a new sheet for every note', 'Bring a refillable bottle', 'Leave lights on'], answer: 'Bring a refillable bottle', explanation: 'The passage recommends bringing a refillable water bottle.' },
      { prompt: 'Why should students measure their changes?', options: ['To help good habits continue', 'To make lessons longer', 'To avoid working together'], answer: 'To help good habits continue', explanation: 'The final sentence links measuring change with lasting habits.' },
    ],
    writingPrompt: 'Write an 80–100-word message for your class noticeboard. Suggest three simple actions that can make your school greener and explain why they help.',
    speakingPrompt: 'Suggest a small environmental project for your class. Explain what students should do and how you can organise it.',
    followUps: ['Which action would be easiest for your class to start this week?', 'How could you encourage students who do not want to participate?'],
  },
  {
    id: 'hs10-b1-digital', track: 'high_school', grade: 'Grade 10', level: 'B1',
    title: 'Using Social Media Wisely', theme: 'Digital citizenship and online communication',
    vocabulary: [
      { word: 'privacy settings', meaningVi: 'cài đặt quyền riêng tư', example: 'Check your privacy settings before sharing photos.' },
      { word: 'misinformation', meaningVi: 'thông tin sai lệch', example: 'Misinformation can spread quickly online.' },
      { word: 'verify', meaningVi: 'xác minh', example: 'Verify a claim before you repost it.' },
    ],
    grammarFocus: ['first conditional for consequences', 'reported statements', 'modals of advice and obligation'],
    listeningScript: 'Our teacher asked us to discuss social media habits. One student said that social platforms help her stay in touch with friends, but she turns off notifications while studying. Another student explained that he checks the source and date before sharing a news story. They agreed that online communication is useful when people protect their privacy and think before they post.',
    listeningQuestions: [
      { prompt: 'What does the first student do while studying?', options: ['Turns off notifications', 'Shares more videos', 'Checks every message'], answer: 'Turns off notifications', explanation: 'She says she turns off notifications to focus on studying.' },
      { prompt: 'What does the second student check before sharing news?', options: ['The number of likes', 'The source and date', 'The colour of the website'], answer: 'The source and date', explanation: 'He checks both the source and publication date.' },
    ],
    readingPassage: 'Social media can help teenagers discover ideas and maintain friendships, but online information needs careful evaluation. A dramatic headline is not proof that a story is accurate. Readers should look for the original source, compare reports and check when the information was published. They should also avoid posting personal details that could put themselves or other people at risk.',
    readingQuestions: [
      { prompt: 'What is the main advice about online information?', options: ['Trust dramatic headlines', 'Evaluate sources and publication dates', 'Share stories immediately'], answer: 'Evaluate sources and publication dates', explanation: 'The passage recommends checking the original source and date and comparing reports.' },
      { prompt: 'What should teenagers avoid sharing?', options: ['Personal details that create risk', 'School subjects', 'Public library opening hours'], answer: 'Personal details that create risk', explanation: 'The final sentence warns against exposing personal details.' },
    ],
    writingPrompt: 'Write 120–150 words advising younger students how to use social media responsibly. Include benefits, two risks and practical advice.',
    speakingPrompt: 'Discuss whether social media helps or distracts students. Give a balanced opinion and a personal example.',
    followUps: ['Should schools teach students how to check online information?', 'How can people disagree respectfully online?'],
  },
  {
    id: 'hs11-a2-cultural', track: 'high_school', grade: 'Grade 11', level: 'A2',
    title: 'A Festival in My Region', theme: 'Culture, festivals and local traditions',
    vocabulary: [
      { word: 'traditional costume', meaningVi: 'trang phục truyền thống', example: 'People wear traditional costumes during the festival.' },
      { word: 'procession', meaningVi: 'đoàn diễu hành', example: 'A procession moves through the main street.' },
      { word: 'celebrate', meaningVi: 'tổ chức kỷ niệm, ăn mừng', example: 'Families celebrate together every spring.' },
    ],
    grammarFocus: ['past simple for events', 'there was / there were', 'adjectives and adverbs'],
    listeningScript: 'Last weekend, my family visited a festival in our province. There were food stalls, traditional music and a colourful procession. My younger brother tried a local dish for the first time. We took photographs, but we also listened to the stories told by older people. It was a busy day, and we returned home in the evening.',
    listeningQuestions: [
      { prompt: 'When did the family visit the festival?', options: ['Last weekend', 'Next month', 'Yesterday morning'], answer: 'Last weekend', explanation: 'The speaker opens by saying the visit was last weekend.' },
      { prompt: 'What did the younger brother try?', options: ['A local dish', 'A traditional dance', 'A musical instrument'], answer: 'A local dish', explanation: 'The speaker says the younger brother tried a local dish.' },
    ],
    readingPassage: 'Many communities organise festivals to remember important people, celebrate the harvest or welcome a new season. Visitors can enjoy music, food and traditional games. A festival is also a chance for young people to learn why a custom matters. Respectful visitors follow local rules and keep public places clean.',
    readingQuestions: [
      { prompt: 'Why do communities organise festivals?', options: ['Only to sell food', 'To remember, celebrate or welcome a season', 'To close public places'], answer: 'To remember, celebrate or welcome a season', explanation: 'The opening sentence gives three common purposes.' },
      { prompt: 'How can visitors show respect?', options: ['Ignore local rules', 'Keep public places clean', 'Take objects home'], answer: 'Keep public places clean', explanation: 'The final sentence includes keeping public places clean.' },
    ],
    writingPrompt: 'Write 80–100 words describing a festival you have attended or would like to attend. Mention activities, food and why it is special.',
    speakingPrompt: 'Describe a festival in your region and tell a visitor what they can see and do.',
    followUps: ['Which tradition should young people learn about?', 'How can a festival welcome visitors without losing its local character?'],
  },
  {
    id: 'hs11-b1-career', track: 'high_school', grade: 'Grade 11', level: 'B1',
    title: 'Choosing a Future Career', theme: 'Career orientation and personal strengths',
    vocabulary: [
      { word: 'strength', meaningVi: 'điểm mạnh', example: 'Communication is one of her strengths.' },
      { word: 'qualification', meaningVi: 'bằng cấp, trình độ chuyên môn', example: 'The role requires a relevant qualification.' },
      { word: 'career path', meaningVi: 'con đường nghề nghiệp', example: 'He is exploring a career path in engineering.' },
    ],
    grammarFocus: ['future forms: will, be going to and present continuous', 'infinitives of purpose', 'comparatives for evaluating options'],
    listeningScript: 'Our career adviser asked us to think about what we enjoy and what we do well. Minh is interested in engineering because he likes solving practical problems. Hoa plans to study languages because she enjoys communicating with people from different cultures. The adviser reminded us that a career choice can change as we gain experience, so we should research several options before deciding.',
    listeningQuestions: [
      { prompt: 'Why is Minh interested in engineering?', options: ['He likes solving practical problems', 'He wants to travel every week', 'His friend chose it'], answer: 'He likes solving practical problems', explanation: 'The speaker directly connects his interest with problem-solving.' },
      { prompt: 'What does the adviser recommend?', options: ['Choose immediately', 'Research several options', 'Avoid gaining experience'], answer: 'Research several options', explanation: 'The final sentence recommends researching options before deciding.' },
    ],
    readingPassage: 'Choosing a career is not simply about selecting a job title. Students should consider their interests, strengths, working conditions and the skills required in a particular field. Talking to people who already do the job can provide realistic information. Short courses, volunteering and work experience may also help students test whether an occupation suits them.',
    readingQuestions: [
      { prompt: 'What should students consider when choosing a career?', options: ['Only the salary', 'Interests, strengths and job requirements', 'Their friends’ decisions'], answer: 'Interests, strengths and job requirements', explanation: 'The second sentence lists these factors.' },
      { prompt: 'How can students test whether a job suits them?', options: ['Avoid talking to workers', 'Try courses or work experience', 'Choose based on a title'], answer: 'Try courses or work experience', explanation: 'The final sentence suggests short courses, volunteering and experience.' },
    ],
    writingPrompt: 'Write 130–160 words about a career you are considering. Explain why it interests you, which skills it requires and what you will do to prepare.',
    speakingPrompt: 'Compare two possible career paths and explain which one suits your strengths better.',
    followUps: ['How important is salary compared with job satisfaction?', 'What can schools do to help students make informed career choices?'],
  },
  {
    id: 'hs12-b1-global', track: 'high_school', grade: 'Grade 12', level: 'B1',
    title: 'Global Citizenship and International Cooperation', theme: 'Global issues and responsible citizenship',
    vocabulary: [
      { word: 'cooperation', meaningVi: 'sự hợp tác', example: 'International cooperation can address shared problems.' },
      { word: 'humanitarian', meaningVi: 'nhân đạo', example: 'The organisation provides humanitarian support.' },
      { word: 'awareness', meaningVi: 'nhận thức', example: 'The campaign raises awareness of climate risks.' },
    ],
    grammarFocus: ['passive voice in formal contexts', 'relative clauses', 'linking expressions for contrast and result'],
    listeningScript: 'Our school invited a volunteer who had worked on a clean-water project in Southeast Asia. She explained that local communities were consulted before equipment was installed. The project succeeded because residents received training and helped maintain the systems. She said international support is most effective when it strengthens local knowledge instead of replacing it.',
    listeningQuestions: [
      { prompt: 'Why did the clean-water project succeed?', options: ['Residents received training and helped maintain it', 'The equipment was expensive', 'The project avoided local consultation'], answer: 'Residents received training and helped maintain it', explanation: 'The speaker identifies training and local maintenance as reasons for success.' },
      { prompt: 'What makes international support effective?', options: ['Replacing local knowledge', 'Strengthening local knowledge', 'Working without consultation'], answer: 'Strengthening local knowledge', explanation: 'The final sentence makes this point directly.' },
    ],
    readingPassage: 'Global citizenship begins with recognising that many challenges cross national borders. Public health, climate change and access to education require cooperation between governments, organisations and communities. International projects are more sustainable when local people help define priorities and evaluate results. Young people can contribute by learning about global issues, checking information and taking practical action in their own communities.',
    readingQuestions: [
      { prompt: 'Which approach makes international projects more sustainable?', options: ['Local people help set priorities and evaluate results', 'Decisions are made without communities', 'Projects focus only on publicity'], answer: 'Local people help set priorities and evaluate results', explanation: 'The third sentence identifies local participation as essential.' },
      { prompt: 'What can young people do?', options: ['Ignore global issues', 'Learn, verify information and take local action', 'Wait for governments to act'], answer: 'Learn, verify information and take local action', explanation: 'The final sentence lists these practical contributions.' },
    ],
    writingPrompt: 'Write 150–180 words explaining how Vietnamese students can contribute to one global issue through local action.',
    speakingPrompt: 'Choose a global issue and explain what schools, communities and individuals can do about it.',
    followUps: ['Why is local participation important in international projects?', 'How can students distinguish reliable global news from misinformation?'],
  },
  {
    id: 'hs12-b2-exam', track: 'high_school', grade: 'Grade 12', level: 'B2',
    title: 'Reading Data and Evaluating Arguments', theme: 'Academic literacy and exam preparation',
    vocabulary: [
      { word: 'correlation', meaningVi: 'mối tương quan', example: 'Correlation does not always prove causation.' },
      { word: 'counterargument', meaningVi: 'lập luận phản biện', example: 'A strong essay addresses a relevant counterargument.' },
      { word: 'evidence-based', meaningVi: 'dựa trên bằng chứng', example: 'The report makes an evidence-based recommendation.' },
    ],
    grammarFocus: ['concession and contrast clauses', 'reported claims and reporting verbs', 'complex sentences with reduced clauses'],
    listeningScript: 'A recent school survey found that students who planned their study time reported less last-minute stress. However, the survey does not prove that planning alone caused the difference. Students who plan may also have more support at home. The researcher recommended a follow-up study that considers these other factors before schools introduce a new policy.',
    listeningQuestions: [
      { prompt: 'What limitation does the researcher identify?', options: ['The survey proves causation', 'Other factors may explain the difference', 'No students completed the survey'], answer: 'Other factors may explain the difference', explanation: 'The speaker says home support may be another factor.' },
      { prompt: 'What is recommended next?', options: ['A follow-up study', 'An immediate national policy', 'Ending all study planning'], answer: 'A follow-up study', explanation: 'The final sentence recommends further research.' },
    ],
    readingPassage: 'Academic arguments are strongest when claims are proportionate to the evidence. A study may show an association between two variables without demonstrating that one causes the other. Readers should examine the sample, method and limitations before accepting a conclusion. In an essay, acknowledging a reasonable counterargument can make the writer’s position more convincing, provided that the response is supported by evidence rather than dismissed emotionally.',
    readingQuestions: [
      { prompt: 'What should readers examine before accepting a study’s conclusion?', options: ['Sample, method and limitations', 'The author’s popularity', 'The length of the title'], answer: 'Sample, method and limitations', explanation: 'The third sentence lists these elements.' },
      { prompt: 'Why address a counterargument?', options: ['To make a position more convincing', 'To avoid using evidence', 'To change the topic'], answer: 'To make a position more convincing', explanation: 'The final sentence explains how a fair response strengthens an argument.' },
    ],
    writingPrompt: 'Write a 200–230-word argumentative essay on whether schools should limit students’ use of smartphones. Use evidence, acknowledge a counterargument and reach a justified conclusion.',
    speakingPrompt: 'Evaluate a school policy using evidence. State a position, address an opposing view and explain your conclusion.',
    followUps: ['What makes a source credible?', 'When can a statistic create a misleading impression?'],
  },
  {
    id: 'pro-a1-customer', track: 'professional', level: 'A1',
    title: 'Welcoming a Customer', theme: 'Basic customer service and polite interaction',
    vocabulary: [
      { word: 'welcome', meaningVi: 'chào đón', example: 'Welcome to our office.' },
      { word: 'request', meaningVi: 'yêu cầu', example: 'How can I help with your request?' },
      { word: 'available', meaningVi: 'có sẵn', example: 'This service is available today.' },
    ],
    grammarFocus: ['polite questions with can and could', 'there is / there are', 'basic present simple'],
    listeningScript: 'Good morning. Welcome to Green Office Supplies. How can I help you today? We have notebooks, folders and printer paper. The blue folders are available now, but the large notebooks will arrive tomorrow. Would you like me to show you the options?',
    listeningQuestions: [
      { prompt: 'Which product is available now?', options: ['Large notebooks', 'Blue folders', 'Printer paper only'], answer: 'Blue folders', explanation: 'The speaker says the blue folders are available now.' },
      { prompt: 'When will the large notebooks arrive?', options: ['Tomorrow', 'Next week', 'This afternoon'], answer: 'Tomorrow', explanation: 'The speaker gives tomorrow as the arrival time.' },
    ],
    readingPassage: 'Thank you for contacting our support desk. Our team is available from 8:30 a.m. to 5:00 p.m., Monday to Friday. Please include your order number when you send a question. We will reply as soon as possible. If your request is urgent, call the service number on your receipt.',
    readingQuestions: [
      { prompt: 'When is the support desk available?', options: ['Every day', 'Monday to Friday', 'Weekends only'], answer: 'Monday to Friday', explanation: 'The notice states the working days explicitly.' },
      { prompt: 'What should customers include in a question?', options: ['Their order number', 'A password', 'A personal photograph'], answer: 'Their order number', explanation: 'The notice asks customers to include the order number.' },
    ],
    writingPrompt: 'Write a short welcome message to a customer. Introduce your service and ask one polite question about what they need.',
    speakingPrompt: 'Welcome a customer, ask what they need and offer one suitable option.',
    followUps: ['How would you ask a customer to wait politely?', 'What would you say if an item is not available?'],
  },
  {
    id: 'pro-a1-team', track: 'professional', level: 'A1',
    title: 'A Simple Team Introduction', theme: 'Roles, departments and daily responsibilities',
    vocabulary: [
      { word: 'team', meaningVi: 'đội, nhóm', example: 'I work with a small team.' },
      { word: 'manager', meaningVi: 'quản lý', example: 'My manager checks our weekly plan.' },
      { word: 'responsibility', meaningVi: 'trách nhiệm', example: 'One responsibility is answering emails.' },
    ],
    grammarFocus: ['present simple for routines', 'possessive adjectives', 'adverbs of frequency'],
    listeningScript: 'Hi, I am David. I work in the finance team. I prepare simple reports and check invoices. My manager is Maria. We have a short team meeting every Monday. I usually work with two colleagues, and we help each other when the office is busy.',
    listeningQuestions: [
      { prompt: 'Which team does David work in?', options: ['Finance', 'Marketing', 'Human resources'], answer: 'Finance', explanation: 'David introduces himself as a member of the finance team.' },
      { prompt: 'When does the team meet?', options: ['Every Friday', 'Every Monday', 'Every afternoon'], answer: 'Every Monday', explanation: 'The speaker says the team has a short meeting every Monday.' },
    ],
    readingPassage: 'Team members have different responsibilities. A project assistant organises documents and updates the task list. A designer prepares visual materials. A team manager helps colleagues agree on priorities. Clear roles make it easier for everyone to understand what to do next.',
    readingQuestions: [
      { prompt: 'What does a project assistant do?', options: ['Organises documents and updates the task list', 'Approves every company budget', 'Designs the office building'], answer: 'Organises documents and updates the task list', explanation: 'The second sentence describes the assistant’s tasks.' },
      { prompt: 'Why are clear roles useful?', options: ['They remove all meetings', 'They clarify what people should do', 'They make every job identical'], answer: 'They clarify what people should do', explanation: 'The final sentence explains the benefit of clear roles.' },
    ],
    writingPrompt: 'Write 6–8 sentences introducing your team, your role and two regular responsibilities.',
    speakingPrompt: 'Introduce your role to a new colleague in about one minute.',
    followUps: ['Which task do you do most often?', 'Who do you work with during a normal day?'],
  },
  {
    id: 'pro-a2-email', track: 'professional', level: 'A2',
    title: 'Writing a Clear Follow-up Email', theme: 'Workplace email and action requests',
    vocabulary: [
      { word: 'attachment', meaningVi: 'tệp đính kèm', example: 'Please see the report in the attachment.' },
      { word: 'confirm', meaningVi: 'xác nhận', example: 'Could you confirm the meeting time?' },
      { word: 'deadline', meaningVi: 'hạn chót', example: 'The deadline is Thursday afternoon.' },
    ],
    grammarFocus: ['polite requests', 'present perfect for completed actions', 'sequencing and time expressions'],
    listeningScript: 'Hi Anna, I have sent the updated sales report by email. Could you check the attachment and confirm that the figures are correct? We need to share the final version with the director by Thursday afternoon. If you notice any changes, please let me know before lunch tomorrow.',
    listeningQuestions: [
      { prompt: 'What does Anna need to check?', options: ['The meeting room', 'The attached sales report', 'A travel booking'], answer: 'The attached sales report', explanation: 'The speaker asks Anna to check the attachment.' },
      { prompt: 'When is the final version due?', options: ['Thursday afternoon', 'Friday morning', 'Tomorrow at lunch'], answer: 'Thursday afternoon', explanation: 'The speaker states the final deadline is Thursday afternoon.' },
    ],
    readingPassage: 'Subject: Follow-up on today’s meeting. Hello team, thank you for your time this morning. I have attached the revised action list. Please review your assigned tasks and confirm the expected completion date by 3 p.m. tomorrow. If a deadline is at risk, reply with the reason and a proposed solution. Best regards, Linh.',
    readingQuestions: [
      { prompt: 'What should team members confirm?', options: ['Their assigned task completion date', 'Their annual leave', 'The office address'], answer: 'Their assigned task completion date', explanation: 'The email asks each person to confirm the expected completion date.' },
      { prompt: 'What should someone do if a deadline is at risk?', options: ['Stay silent', 'Explain the reason and propose a solution', 'Delete the action list'], answer: 'Explain the reason and propose a solution', explanation: 'The final instruction asks for both the reason and a proposed solution.' },
    ],
    writingPrompt: 'Write a 90–120-word follow-up email after a meeting. Summarise one decision, assign an action and request confirmation by a clear deadline.',
    speakingPrompt: 'Explain a task update to a colleague and politely ask them to confirm one detail.',
    followUps: ['How can you make an email easier to scan?', 'What is a polite way to remind someone about a deadline?'],
  },
  {
    id: 'pro-a2-phone', track: 'professional', level: 'A2',
    title: 'Handling a Simple Phone Enquiry', theme: 'Telephone etiquette and information gathering',
    vocabulary: [
      { word: 'transfer', meaningVi: 'chuyển máy', example: 'I will transfer your call to the sales team.' },
      { word: 'extension', meaningVi: 'số máy lẻ', example: 'Please dial extension 204.' },
      { word: 'available', meaningVi: 'có mặt, sẵn sàng', example: 'The account manager is not available.' },
    ],
    grammarFocus: ['indirect questions', 'will for offers and promises', 'polite clarification phrases'],
    listeningScript: 'Good afternoon, Bright Travel. This is Kim speaking. How may I help you? You would like to speak to our account manager about a booking? Certainly. She is in a meeting at the moment. May I take your name and number? I will ask her to call you back before five o’clock.',
    listeningQuestions: [
      { prompt: 'Why can the caller not speak to the account manager immediately?', options: ['She is in a meeting', 'She is on holiday', 'The office is closed'], answer: 'She is in a meeting', explanation: 'Kim explains that the account manager is currently in a meeting.' },
      { prompt: 'When will the account manager call back?', options: ['Before five o’clock', 'Tomorrow morning', 'Next Monday'], answer: 'Before five o’clock', explanation: 'Kim promises a call back before five.' },
    ],
    readingPassage: 'When answering a business call, greet the caller and identify your organisation. Listen carefully, take notes and repeat important details such as names, dates and telephone numbers. If you need to transfer the call, explain where it is going. If the right person is unavailable, offer to take a message or arrange a call back.',
    readingQuestions: [
      { prompt: 'Which details should be repeated carefully?', options: ['Names, dates and phone numbers', 'Office decorations', 'Personal opinions'], answer: 'Names, dates and phone numbers', explanation: 'The passage highlights these details as important.' },
      { prompt: 'What can you offer if a colleague is unavailable?', options: ['End the call without explanation', 'Take a message or arrange a call back', 'Ask the caller to phone every hour'], answer: 'Take a message or arrange a call back', explanation: 'The final sentence gives both options.' },
    ],
    writingPrompt: 'Write a short telephone message for a colleague. Include the caller’s name, reason for calling, contact number and requested action.',
    speakingPrompt: 'Role-play a phone call: greet a caller, clarify their request and offer a call back.',
    followUps: ['How would you check that you heard a name correctly?', 'What would you say before transferring a call?'],
  },
  {
    id: 'pro-b1-meeting', track: 'professional', level: 'B1',
    title: 'Contributing to a Team Meeting', theme: 'Opinions, clarification and meeting actions',
    vocabulary: [
      { word: 'agenda', meaningVi: 'chương trình họp', example: 'The first item on the agenda is the launch plan.' },
      { word: 'clarify', meaningVi: 'làm rõ', example: 'Could you clarify the main concern?' },
      { word: 'action point', meaningVi: 'đầu việc cần thực hiện', example: 'I will record that as an action point.' },
    ],
    grammarFocus: ['modals for suggestions', 'indirect questions', 'reported decisions'],
    listeningScript: 'Before we move to the next agenda item, I would like to clarify the launch date. The design team can finish the revised screens by Wednesday, but testing will need two additional days. Could we move the review meeting to Friday morning? If everyone agrees, I will update the project plan and send the action points after this meeting.',
    listeningQuestions: [
      { prompt: 'Why does the speaker suggest moving the review meeting?', options: ['Testing needs two additional days', 'The design team is unavailable all week', 'The project has been cancelled'], answer: 'Testing needs two additional days', explanation: 'The speaker explains that testing requires two more days.' },
      { prompt: 'What will the speaker send after the meeting?', options: ['A new job advert', 'The action points', 'A customer invoice'], answer: 'The action points', explanation: 'The speaker promises to update the plan and send the action points.' },
    ],
    readingPassage: 'A productive meeting gives participants a clear purpose and a realistic agenda. People should have an opportunity to contribute, but discussion needs to remain focused on the decision required. At the end, the chair should confirm what has been agreed, who owns each action and when the work is due. Written notes reduce confusion later.',
    readingQuestions: [
      { prompt: 'What should the chair confirm at the end?', options: ['Decisions, owners and deadlines', 'Everyone’s personal schedule', 'Only the meeting location'], answer: 'Decisions, owners and deadlines', explanation: 'The third sentence identifies all three elements.' },
      { prompt: 'Why are written notes useful?', options: ['They replace all communication', 'They reduce later confusion', 'They make meetings longer'], answer: 'They reduce later confusion', explanation: 'The final sentence states this purpose.' },
    ],
    writingPrompt: 'Write 140–170 words of meeting minutes. Record two decisions, two action owners and their deadlines.',
    speakingPrompt: 'Contribute to a short project meeting. Give an opinion, ask for clarification and summarise one action.',
    followUps: ['How can a chair include quieter participants?', 'What should happen when a decision cannot be reached?'],
  },
  {
    id: 'pro-b1-customer', track: 'professional', level: 'B1',
    title: 'Responding to a Customer Complaint', theme: 'Customer care and service recovery',
    vocabulary: [
      { word: 'acknowledge', meaningVi: 'ghi nhận', example: 'We acknowledge the inconvenience caused.' },
      { word: 'resolve', meaningVi: 'giải quyết', example: 'Our team will resolve the issue as soon as possible.' },
      { word: 'refund', meaningVi: 'hoàn tiền', example: 'The customer requested a refund.' },
    ],
    grammarFocus: ['past simple for incident reports', 'present perfect for actions taken', 'polite conditional offers'],
    listeningScript: 'Thank you for telling us about the delayed delivery. I understand that you needed the equipment for today’s training session, and I am sorry for the inconvenience. I have checked the tracking record and contacted the courier. We can deliver a replacement tomorrow morning or arrange a refund. Which option would work better for you?',
    listeningQuestions: [
      { prompt: 'What caused the customer’s problem?', options: ['A delayed delivery', 'An incorrect invoice', 'A cancelled training session'], answer: 'A delayed delivery', explanation: 'The agent acknowledges that the delivery was delayed.' },
      { prompt: 'Which options does the agent offer?', options: ['A replacement or a refund', 'A discount on a holiday', 'A new training course'], answer: 'A replacement or a refund', explanation: 'The final question offers those two solutions.' },
    ],
    readingPassage: 'A good complaint response begins by listening without interruption and acknowledging the customer’s experience. The employee should establish the facts, explain what can be done and give a realistic timeframe. If the problem cannot be solved immediately, the customer should still know who is responsible for the next update. A respectful response can rebuild trust even when the original service has failed.',
    readingQuestions: [
      { prompt: 'What should an employee do first?', options: ['Argue about the complaint', 'Listen and acknowledge the experience', 'Promise an impossible result'], answer: 'Listen and acknowledge the experience', explanation: 'The opening sentence identifies listening and acknowledgement as the first step.' },
      { prompt: 'What should happen if the issue cannot be solved immediately?', options: ['No further contact', 'The customer is told who will provide the next update', 'The complaint is deleted'], answer: 'The customer is told who will provide the next update', explanation: 'The passage says the customer should know who owns the next update.' },
    ],
    writingPrompt: 'Write a 150–180-word response to a customer whose order arrived late. Acknowledge the issue, explain the next step and offer a realistic solution.',
    speakingPrompt: 'Role-play a service recovery conversation with an unhappy customer. Show empathy and agree on a next step.',
    followUps: ['When should a complaint be escalated to a manager?', 'How can a team learn from repeated complaints?'],
  },
  {
    id: 'pro-b2-presentation', track: 'professional', level: 'B2',
    title: 'Delivering a Persuasive Presentation', theme: 'Presentations, evidence and audience engagement',
    vocabulary: [
      { word: 'key takeaway', meaningVi: 'thông điệp cốt lõi', example: 'The key takeaway is that response times have improved.' },
      { word: 'evidence', meaningVi: 'bằng chứng', example: 'The recommendation is supported by customer evidence.' },
      { word: 'engagement', meaningVi: 'sự tương tác', example: 'A short question can increase audience engagement.' },
    ],
    grammarFocus: ['signposting and cohesive devices', 'comparative structures for data', 'hedging recommendations'],
    listeningScript: 'The pilot reduced average response time from twelve hours to seven. That is a meaningful improvement, although the sample covered only three teams. The next step is to test the process with a larger group before making a company-wide recommendation. I will focus on the two conditions that made the pilot successful: clear ownership and a shared response template.',
    listeningQuestions: [
      { prompt: 'How much did average response time decrease?', options: ['Five hours', 'Seven hours', 'Twelve hours'], answer: 'Five hours', explanation: 'The change from twelve to seven hours is a five-hour reduction.' },
      { prompt: 'Why is a larger test needed?', options: ['The pilot covered only three teams', 'The process failed completely', 'The company has no customers'], answer: 'The pilot covered only three teams', explanation: 'The speaker explicitly notes the limited sample.' },
    ],
    readingPassage: 'A persuasive presentation does not depend on the number of slides. It depends on a clear argument, credible evidence and a recommendation that follows logically from the analysis. Presenters should explain what the audience needs to decide, distinguish measured results from assumptions and leave time for questions. Visuals are useful when they clarify a comparison or reveal a pattern that would be difficult to explain verbally.',
    readingQuestions: [
      { prompt: 'What should presenters distinguish?', options: ['Measured results and assumptions', 'Slides and chairs', 'Questions and introductions'], answer: 'Measured results and assumptions', explanation: 'The passage explicitly recommends separating measured results from assumptions.' },
      { prompt: 'When are visuals useful?', options: ['When they clarify comparisons or patterns', 'When they decorate every slide', 'When they replace the recommendation'], answer: 'When they clarify comparisons or patterns', explanation: 'The final sentence describes the analytical purpose of visuals.' },
    ],
    writingPrompt: 'Prepare a 180–220-word presentation brief recommending one workplace improvement. State the problem, provide evidence, acknowledge a limitation and propose the next step.',
    speakingPrompt: 'Deliver a two-minute presentation recommending a change to a work process. End with one clear action for the audience.',
    followUps: ['How would you respond to a challenging question?', 'What makes evidence persuasive to a non-specialist audience?'],
  },
  {
    id: 'pro-b2-negotiation', track: 'professional', level: 'B2',
    title: 'Reaching Agreement in a Negotiation', theme: 'Negotiation strategy and mutually beneficial outcomes',
    vocabulary: [
      { word: 'concession', meaningVi: 'sự nhượng bộ', example: 'A small concession may help both sides reach agreement.' },
      { word: 'mutual benefit', meaningVi: 'lợi ích chung', example: 'The revised schedule offers mutual benefit.' },
      { word: 'constraint', meaningVi: 'hạn chế, ràng buộc', example: 'Budget is our main constraint.' },
    ],
    grammarFocus: ['conditional proposals', 'diplomatic language and hedging', 'concession clauses'],
    listeningScript: 'We understand that the supplier needs a longer payment period. Our constraint is the quarterly cash-flow plan. If you can guarantee delivery in two batches and hold the unit price for six months, we could extend payment to forty-five days. That would give both teams more certainty. Shall we review the revised terms together?',
    listeningQuestions: [
      { prompt: 'What does the supplier want?', options: ['A longer payment period', 'A higher unit price', 'Fewer delivery records'], answer: 'A longer payment period', explanation: 'The speaker acknowledges the supplier’s request for more time to pay.' },
      { prompt: 'What conditions are linked to the proposed extension?', options: ['Two delivery batches and a six-month price hold', 'Immediate payment and one delivery', 'A new office location'], answer: 'Two delivery batches and a six-month price hold', explanation: 'The speaker makes both conditions part of the proposal.' },
    ],
    readingPassage: 'Preparation is essential to a successful negotiation. Before a meeting, identify your priorities, the other party’s likely interests and the limits you cannot cross. During the discussion, ask questions before making concessions. A proposal is more likely to last when both sides understand what they are giving and receiving, and when the final terms are recorded clearly.',
    readingQuestions: [
      { prompt: 'What should negotiators do before making concessions?', options: ['Ask questions', 'Hide their priorities', 'Accept every request'], answer: 'Ask questions', explanation: 'The passage advises asking questions before making concessions.' },
      { prompt: 'Why should final terms be recorded?', options: ['To ensure both sides understand the agreement', 'To avoid all future communication', 'To make the process longer'], answer: 'To ensure both sides understand the agreement', explanation: 'The final sentence stresses clarity about what each side gives and receives.' },
    ],
    writingPrompt: 'Write a 200–240-word negotiation proposal. Identify the other party’s interest, your main constraint, two conditions and a mutually beneficial offer.',
    speakingPrompt: 'Negotiate a delivery schedule with a supplier. Ask questions, make a conditional offer and confirm the agreement.',
    followUps: ['Which issue would you be willing to trade, and why?', 'How would you respond if the other party rejects your first proposal?'],
  },
  {
    id: 'pro-c1-leadership', track: 'professional', level: 'C1',
    title: 'Leading a Team Through Change', theme: 'Change leadership and stakeholder communication',
    vocabulary: [
      { word: 'stakeholder alignment', meaningVi: 'sự thống nhất giữa các bên liên quan', example: 'Stakeholder alignment is critical before implementation.' },
      { word: 'implementation risk', meaningVi: 'rủi ro triển khai', example: 'The plan identifies implementation risks early.' },
      { word: 'accountability', meaningVi: 'trách nhiệm giải trình', example: 'Clear accountability supports effective delivery.' },
    ],
    grammarFocus: ['nuanced modality for recommendations', 'concession and contrast at paragraph level', 'nominalisation in formal communication'],
    listeningScript: 'The proposed operating model should reduce duplicated work, but its success will depend on how the transition is managed. Teams are understandably concerned about changes to ownership and reporting lines. We should therefore publish the decision principles, identify what will remain unchanged and give managers a clear route for escalating unintended consequences. The objective is not to eliminate uncertainty overnight; it is to make the process transparent and accountable.',
    listeningQuestions: [
      { prompt: 'What is the main condition for the model’s success?', options: ['How the transition is managed', 'Removing every manager', 'Avoiding communication'], answer: 'How the transition is managed', explanation: 'The speaker says success depends on managing the transition.' },
      { prompt: 'What is the stated objective?', options: ['Eliminate all uncertainty immediately', 'Make the process transparent and accountable', 'Delay every decision'], answer: 'Make the process transparent and accountable', explanation: 'The final sentence defines the objective.' },
    ],
    readingPassage: 'Organisational change is often presented as a sequence of decisions, yet employees experience it as a shift in expectations, relationships and control. Leaders who communicate only the intended benefits risk appearing detached from these practical concerns. Credible change communication explains the rationale, acknowledges trade-offs, identifies what remains open to influence and demonstrates how feedback will affect implementation. Consistency matters, but so does the willingness to revise a plan when evidence reveals an unintended consequence.',
    readingQuestions: [
      { prompt: 'Why can communication focused only on benefits fail?', options: ['It ignores employees’ practical concerns', 'It provides too much accountability', 'It invites too much evidence'], answer: 'It ignores employees’ practical concerns', explanation: 'The second sentence explains that employees also experience changes in relationships and control.' },
      { prompt: 'What should leaders do when evidence reveals unintended consequences?', options: ['Refuse to reconsider the plan', 'Be willing to revise the plan', 'Stop communicating'], answer: 'Be willing to revise the plan', explanation: 'The final sentence explicitly supports revising a plan when evidence warrants it.' },
    ],
    writingPrompt: 'Write a 230–280-word leadership note explaining a significant organisational change. Address the rationale, stakeholder concerns, trade-offs, accountability and feedback mechanisms.',
    speakingPrompt: 'Brief a team about a difficult change. Explain the rationale, acknowledge uncertainty and invite questions without making unsupported promises.',
    followUps: ['How would you respond to resistance from a high-performing employee?', 'Which signals would show that the change is creating unintended harm?'],
  },
  {
    id: 'pro-c1-executive', track: 'professional', level: 'C1',
    title: 'Writing an Executive Recommendation', theme: 'Executive summaries and evidence-led decisions',
    vocabulary: [
      { word: 'feasibility', meaningVi: 'tính khả thi', example: 'The review assesses the financial feasibility of the proposal.' },
      { word: 'implication', meaningVi: 'hệ quả, hàm ý', example: 'The report explains the operational implications.' },
      { word: 'prioritisation', meaningVi: 'sự ưu tiên', example: 'Clear prioritisation helps teams allocate resources.' },
    ],
    grammarFocus: ['concise complex sentences', 'nominalisation and information density', 'qualifying claims with evidence'],
    listeningScript: 'The analysis supports a phased rollout rather than an immediate national launch. The pilot indicates a reduction in processing time, but the evidence is not yet sufficient to estimate the long-term staffing impact. I recommend extending the pilot to two additional regions, with a defined review point after eight weeks. This would improve the evidence base while limiting the cost of premature expansion.',
    listeningQuestions: [
      { prompt: 'What rollout approach is recommended?', options: ['An immediate national launch', 'A phased rollout', 'Cancelling the project'], answer: 'A phased rollout', explanation: 'The speaker recommends a phased rollout based on the current evidence.' },
      { prompt: 'Why extend the pilot?', options: ['To strengthen evidence while limiting premature cost', 'To avoid measuring outcomes', 'To increase uncertainty'], answer: 'To strengthen evidence while limiting premature cost', explanation: 'The final sentence gives both reasons.' },
    ],
    readingPassage: 'An executive recommendation should make the decision visible early. It should state the preferred option, explain the evidence supporting it, identify material uncertainties and specify what approval is required. Background information belongs in the document only when it changes the decision. A concise structure respects the reader’s limited attention without concealing complexity; it distinguishes what is known, what is assumed and what must be tested next.',
    readingQuestions: [
      { prompt: 'What should an executive recommendation make visible early?', options: ['The decision and preferred option', 'Every historical detail', 'The writer’s personal biography'], answer: 'The decision and preferred option', explanation: 'The opening sentence says the decision should be visible early.' },
      { prompt: 'How should background information be selected?', options: ['Include everything', 'Include it when it affects the decision', 'Remove all evidence'], answer: 'Include it when it changes the decision', explanation: 'The passage says background belongs only when it changes the decision.' },
    ],
    writingPrompt: 'Write a 220–260-word executive recommendation. State the decision required, compare two options, qualify the evidence and identify the approval or next action needed.',
    speakingPrompt: 'Present a recommendation to a senior decision-maker in 90 seconds, then respond to a question about risk or evidence.',
    followUps: ['Which uncertainty would most affect your recommendation?', 'How would you communicate a recommendation when the evidence is incomplete?'],
  },

  {
    id: 'pro-b1-it-sprint', track: 'professional', level: 'B1',
    title: 'Explaining a Software Sprint Update', theme: 'Technology teams, project delivery and clear status reporting',
    vocabulary: [
      { word: 'sprint', meaningVi: 'chu kỳ phát triển ngắn', example: 'The team plans the next sprint on Monday.' },
      { word: 'blocker', meaningVi: 'trở ngại làm đình trệ công việc', example: 'A missing approval is the main blocker.' },
      { word: 'deploy', meaningVi: 'triển khai phần mềm', example: 'We plan to deploy the update on Thursday.' },
    ],
    grammarFocus: ['present perfect for completed work', 'past simple for specific incidents', 'will / going to for next actions'],
    listeningScript: 'Good morning, everyone. During this sprint, we have completed the new account settings page and fixed the two highest-priority login bugs. We found one blocker: the test environment is not receiving updated customer records. The platform team is investigating it. If the issue is resolved by Wednesday, we are going to deploy the release on Thursday. Otherwise, we will move the deployment to next week. I will share another update tomorrow afternoon.',
    listeningQuestions: [
      { prompt: 'Which work has the team completed?', options: ['The account settings page and two login fixes', 'A new payment platform', 'The customer support handbook'], answer: 'The account settings page and two login fixes', explanation: 'The speaker identifies the settings page and two login bugs as completed work.' },
      { prompt: 'What will happen if the blocker is not resolved by Wednesday?', options: ['The release will be cancelled permanently', 'Deployment will move to next week', 'The team will skip testing'], answer: 'Deployment will move to next week', explanation: 'The speaker gives this as the alternative deployment plan.' },
    ],
    readingPassage: 'A useful sprint update helps colleagues understand progress without requiring them to read every task record. It should separate completed work from work still in progress, identify blockers and name the person responsible for the next action. Dates should be realistic rather than optimistic guesses. When a delivery date depends on an unresolved issue, explain the condition clearly and provide a time for the next update. This makes the report reliable and gives other teams a chance to adjust their plans.',
    readingQuestions: [
      { prompt: 'What should a sprint update separate?', options: ['Completed work and work still in progress', 'Developers and customers', 'Budgets and office locations'], answer: 'Completed work and work still in progress', explanation: 'The second sentence explicitly asks for this distinction.' },
      { prompt: 'What should a writer do when a date depends on an unresolved issue?', options: ['Present the date as guaranteed', 'Explain the condition and next update time', 'Avoid mentioning the issue'], answer: 'Explain the condition and next update time', explanation: 'The passage recommends making the dependency and next update explicit.' },
    ],
    writingPrompt: 'Write a 130–160-word sprint update for a cross-functional team. Include completed work, one blocker, its owner, a conditional delivery date and the next update time.',
    speakingPrompt: 'Give a one-minute stand-up update. Explain what you completed, what you are working on and whether anything is blocking progress.',
    followUps: ['How would you explain a delay to a non-technical stakeholder?', 'What information should never be hidden in a project status report?'],
  },
  {
    id: 'pro-b1-finance-budget', track: 'professional', level: 'B1',
    title: 'Discussing a Department Budget', theme: 'Finance, budgets and evidence-based workplace decisions',
    vocabulary: [
      { word: 'allocate', meaningVi: 'phân bổ', example: 'We need to allocate more money to staff training.' },
      { word: 'forecast', meaningVi: 'dự báo', example: 'The forecast shows higher travel costs next quarter.' },
      { word: 'overrun', meaningVi: 'chi phí vượt ngân sách', example: 'The project had a small budget overrun.' },
    ],
    grammarFocus: ['comparatives for financial options', 'quantifiers and numbers', 'polite requests and suggestions'],
    listeningScript: 'I have reviewed the department budget for the next quarter. Training costs are expected to rise by ten percent because two new systems are being introduced. However, travel spending was lower than forecast last quarter, so we may be able to move part of that budget. I suggest keeping the total budget unchanged and reallocating the available funds to staff training. Could each team send its revised estimate by Friday?',
    listeningQuestions: [
      { prompt: 'Why are training costs expected to rise?', options: ['Two new systems are being introduced', 'The office is moving abroad', 'Travel prices have doubled'], answer: 'Two new systems are being introduced', explanation: 'The speaker links the increase to the introduction of two systems.' },
      { prompt: 'What does the speaker suggest?', options: ['Increase the total budget immediately', 'Reallocate some travel funds to training', 'Cancel staff training'], answer: 'Reallocate some travel funds to training', explanation: 'The speaker proposes moving available funds while keeping the total unchanged.' },
    ],
    readingPassage: 'A department budget is a plan, not a guarantee that every estimate will be correct. Managers should compare actual spending with the forecast regularly and explain significant differences. If one activity costs more than expected, the team can consider changing the timing, reducing the scope or reallocating funds from a lower-priority activity. Any change should be recorded so that colleagues understand the reason and the effect on other plans.',
    readingQuestions: [
      { prompt: 'What should managers compare regularly?', options: ['Actual spending and the forecast', 'Staff birthdays and holidays', 'Office size and team names'], answer: 'Actual spending and the forecast', explanation: 'The passage recommends regular comparison of actual spending with forecasts.' },
      { prompt: 'Why should budget changes be recorded?', options: ['To explain the reason and effect on other plans', 'To prevent all future changes', 'To replace the annual report'], answer: 'To explain the reason and effect on other plans', explanation: 'The final sentence gives this purpose directly.' },
    ],
    writingPrompt: 'Write a 130–160-word email to your manager explaining a budget variance. State the original estimate, actual change, likely reason and one practical recommendation.',
    speakingPrompt: 'Explain a small budget overrun to your manager and recommend how the team should respond.',
    followUps: ['When is reallocating funds better than requesting more money?', 'How can a team make financial forecasts more reliable?'],
  },

  {
    id: 'pro-b1-customer-success', track: 'professional', level: 'B1',
    title: 'Handling a Customer Complaint', theme: 'Customer service, active listening and practical problem-solving',
    vocabulary: [
      { word: 'acknowledge', meaningVi: 'ghi nhận, thừa nhận', example: 'First, acknowledge the customer’s concern.' },
      { word: 'resolve', meaningVi: 'giải quyết', example: 'We aim to resolve the issue within one working day.' },
      { word: 'follow up', meaningVi: 'liên hệ lại để cập nhật', example: 'I will follow up after the replacement is sent.' },
    ],
    grammarFocus: ['polite requests and indirect questions', 'past simple for describing incidents', 'will and present continuous for next steps'],
    listeningScript: 'Thank you for explaining what happened. I understand that the delivery arrived two days late and that one item was missing. I am sorry for the inconvenience. I will check the warehouse record now and arrange for the missing item to be sent by express delivery. You will receive a confirmation email this afternoon. May I contact you tomorrow to make sure everything has arrived?',
    listeningQuestions: [
      { prompt: 'What problems did the customer report?', options: ['A late delivery and a missing item', 'A damaged payment card', 'An incorrect account password'], answer: 'A late delivery and a missing item', explanation: 'The agent repeats both problems before offering a solution.' },
      { prompt: 'When will the agent send a confirmation email?', options: ['Tomorrow morning', 'This afternoon', 'Next week'], answer: 'This afternoon', explanation: 'The agent says the confirmation email will arrive this afternoon.' },
    ],
    readingPassage: 'A good complaint-handling process begins with listening rather than defending the organisation. The employee should confirm the facts, explain what can be done and give a realistic time for the next update. If the issue cannot be solved immediately, the customer should still know who is responsible for it. A short follow-up message can prevent repeated contact and show that the organisation has taken the concern seriously.',
    readingQuestions: [
      { prompt: 'What should an employee do first?', options: ['Defend the organisation', 'Listen and confirm the facts', 'Promise an immediate refund in every case'], answer: 'Listen and confirm the facts', explanation: 'The passage says the process begins with listening and confirming facts.' },
      { prompt: 'Why is a follow-up message useful?', options: ['It can prevent repeated contact and show ownership', 'It replaces the need to solve the issue', 'It guarantees that no complaint will happen again'], answer: 'It can prevent repeated contact and show ownership', explanation: 'The final sentence explains both benefits.' },
    ],
    writingPrompt: 'Write a 130–160-word reply to a customer whose order arrived late and incomplete. Acknowledge the problem, explain the action you will take and give a clear follow-up time.',
    speakingPrompt: 'Role-play a customer-service call. Listen to a complaint, clarify the facts, apologise appropriately and explain the next action.',
    followUps: ['What should you say when you cannot promise an immediate solution?', 'How can a team learn from repeated customer complaints?'],
  },
  {
    id: 'pro-b2-marketing-campaign', track: 'professional', level: 'B2',
    title: 'Presenting a Marketing Campaign Review', theme: 'Marketing strategy, campaign metrics and evidence-led recommendations',
    vocabulary: [
      { word: 'conversion rate', meaningVi: 'tỷ lệ chuyển đổi', example: 'The conversion rate increased after the landing page changed.' },
      { word: 'target audience', meaningVi: 'đối tượng khách hàng mục tiêu', example: 'The campaign was designed for a younger target audience.' },
      { word: 'return on investment', meaningVi: 'tỷ suất hoàn vốn', example: 'The team is reviewing return on investment before extending the campaign.' },
    ],
    grammarFocus: ['comparatives and trend language for data', 'present perfect for campaign results', 'hedging when evidence is limited'],
    listeningScript: 'The campaign reached  forty thousand people over four weeks, and website visits increased by eighteen percent. However, the conversion rate rose by only two percent, which suggests that awareness did not translate into sales as strongly as we expected. The strongest results came from returning visitors rather than new audiences. I recommend testing a clearer product message and comparing the cost per acquisition before increasing the budget.',
    listeningQuestions: [
      { prompt: 'Which metric increased by eighteen percent?', options: ['Website visits', 'Conversion rate', 'The campaign budget'], answer: 'Website visits', explanation: 'The speaker reports an eighteen-percent increase in website visits.' },
      { prompt: 'What does the speaker recommend before increasing the budget?', options: ['Stop measuring campaign results', 'Test the message and compare acquisition costs', 'Target only existing customers'], answer: 'Test the message and compare acquisition costs', explanation: 'The final sentence gives both proposed actions.' },
    ],
    readingPassage: 'A campaign review should connect activity to business outcomes. Reach and impressions indicate how many people may have seen a message, but they do not show whether the campaign generated qualified interest or revenue. Teams should compare conversion rates, acquisition costs and customer quality across channels. Results also need context: seasonality, pricing changes and audience differences can affect performance. Recommendations should therefore distinguish observed results from possible explanations and propose a test that can reduce uncertainty.',
    readingQuestions: [
      { prompt: 'Why are reach and impressions insufficient on their own?', options: ['They do not show whether qualified interest or revenue was generated', 'They measure customer satisfaction perfectly', 'They automatically calculate profit'], answer: 'They do not show whether qualified interest or revenue was generated', explanation: 'The passage distinguishes exposure metrics from business outcomes.' },
      { prompt: 'What should recommendations distinguish?', options: ['Observed results and possible explanations', 'Old campaigns and office locations', 'Design preferences and job titles'], answer: 'Observed results and possible explanations', explanation: 'The final sentence explicitly makes this distinction.' },
    ],
    writingPrompt: 'Write a 180–220-word campaign review for a marketing manager. Summarise two results, explain one limitation and recommend a measurable next experiment.',
    speakingPrompt: 'Present a two-minute campaign review. Explain what worked, what did not meet expectations and which experiment you would run next.',
    followUps: ['Which metric would you prioritise if the objective were customer retention?', 'How would you explain a positive result when the sample size is small?'],
  },
  {
    id: 'pro-b2-hr-performance', track: 'professional', level: 'B2',
    title: 'Giving Constructive Performance Feedback', theme: 'Human resources, coaching conversations and professional development',
    vocabulary: [
      { word: 'specific example', meaningVi: 'ví dụ cụ thể', example: 'Use a specific example to explain the feedback.' },
      { word: 'development goal', meaningVi: 'mục tiêu phát triển', example: 'Agree on one realistic development goal.' },
      { word: 'action plan', meaningVi: 'kế hoạch hành động', example: 'The action plan includes a review date.' },
    ],
    grammarFocus: ['diplomatic language and softening', 'present perfect for progress over time', 'modal verbs for achievable recommendations'],
    listeningScript: 'You have built strong relationships with clients this quarter, and your handover notes are much clearer than they were in January. One area to develop is prioritisation when several urgent requests arrive together. In the last project, two internal updates were delayed because the client request took all your attention. Let us agree on a simple priority checklist and review how it works in four weeks. How does that sound to you?',
    listeningQuestions: [
      { prompt: 'Which strength does the manager mention?', options: ['Clearer handover notes', 'Faster budget approval', 'Leading a new department'], answer: 'Clearer handover notes', explanation: 'The manager explicitly praises the improvement in handover notes.' },
      { prompt: 'What development action do they agree to try?', options: ['A priority checklist', 'A new reporting system for every team', 'An immediate role change'], answer: 'A priority checklist', explanation: 'The manager proposes a checklist and a review in four weeks.' },
    ],
    readingPassage: 'Constructive performance feedback is most useful when it is timely, specific and connected to an agreed goal. General comments such as “be more organised” give an employee little guidance. A manager can describe an observable situation, explain its impact and invite the employee to discuss possible causes. The conversation should end with an action that both people consider realistic, together with a date to review progress. Feedback is a development process, not a label attached to a person.',
    readingQuestions: [
      { prompt: 'Why are general comments such as “be more organised” unhelpful?', options: ['They give little practical guidance', 'They are always too positive', 'They include too many measurable details'], answer: 'They give little practical guidance', explanation: 'The passage contrasts general comments with specific, actionable feedback.' },
      { prompt: 'What should the conversation end with?', options: ['A realistic action and a review date', 'A permanent judgement about the employee', 'An unrelated list of company rules'], answer: 'A realistic action and a review date', explanation: 'The passage recommends agreeing on an action and a date to review progress.' },
    ],
    writingPrompt: 'Write a 160–200-word follow-up email after a performance conversation. Recognise one strength, summarise one development area, confirm an agreed action and state the review date.',
    speakingPrompt: 'Role-play a performance conversation. Give evidence-based feedback, invite the employee’s perspective and agree on a practical next step.',
    followUps: ['How can a manager discuss a repeated problem without discouraging an employee?', 'What evidence would show that the development action is working?'],
  },

];

export const EXPANDED_LESSON_BANK: GradeCefrLessonUnit[] = seeds.map(build);
export const ALL_GRADE_CEFR_LESSONS: GradeCefrLessonUnit[] = [...EXPANDED_LESSON_BANK];
