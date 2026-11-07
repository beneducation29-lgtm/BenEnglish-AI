import {
  ListeningLesson,
  ReadAloudPassage,
  FreeSpeakingTopic,
  CEFRLevel,
  TrackType,
} from '../types';

type LessonSeed = {
  id: string;
  title: string;
  track: TrackType;
  level: CEFRLevel;
  category: string;
  summary: string;
  sentences: { en: string; vi: string }[];
  vocabulary: {
    word: string;
    ipa: string;
    pos: string;
    meaningVi: string;
    definitionEn: string;
    exampleEn: string;
    exampleVi: string;
  }[];
  questions: { question: string; options: string[]; answer: string; why: string }[];
};

const buildLesson = (seed: LessonSeed): ListeningLesson => {
  const sentences = seed.sentences.map((sentence, index) => ({
    id: seed.id + '-s' + (index + 1),
    paragraphIndex: index < 2 ? 0 : 1,
    startTime: index * 5,
    endTime: (index + 1) * 5,
    textEn: sentence.en,
    textVi: sentence.vi,
    keyPhrases: sentence.en.split(/[,.!?]/).filter(Boolean).slice(0, 2),
  }));

  return {
    id: seed.id,
    title: seed.title,
    track: seed.track,
    tier: seed.level === 'A1' || seed.level === 'A2' ? 'beginner' : seed.level === 'B1' || seed.level === 'B2' ? 'intermediate' : 'advanced',
    category: seed.category,
    level: seed.level,
    durationMinutes: 3,
    summary: seed.summary,
    learningObjectives: [
      'Understand the main idea and key details in a ' + seed.level + ' listening passage.',
      'Recognize useful phrases in context and reuse them in a short spoken response.',
      'Practice listening more than once before checking the transcript.',
    ],
    audioSampleText: sentences.map((sentence) => sentence.textEn).join(' '),
    sentences,
    vocabulary: seed.vocabulary.map((item, index) => ({
      id: seed.id + '-v' + (index + 1),
      ...item,
      cefrLevel: seed.level,
      topic: seed.category,
      track: seed.track,
      masteryLevel: 0,
    })),
    comprehensionQuiz: seed.questions.map((item) => ({
      question: item.question,
      type: 'mcq' as const,
      options: item.options,
      correctAnswer: item.answer,
      explanationEn: item.why,
      explanationVi: 'Đáp án được nêu trực tiếp trong bài nghe: ' + item.answer + '.',
    })),
    dictationTargetSentence: sentences[Math.min(2, sentences.length - 1)].textEn,
    dictationSentences: sentences.map((sentence) => sentence.textEn),
  };
};

const lessonSeeds: LessonSeed[] = [
  {
    id: 'hs-a1-morning-routine',
    title: 'A Busy School Morning',
    track: 'high_school',
    level: 'A1',
    category: 'Daily Life',
    summary: 'A student describes a simple weekday routine, from waking up to arriving at school.',
    sentences: [
      { en: 'I usually wake up at six thirty and make my bed.', vi: 'Tôi thường thức dậy lúc sáu giờ rưỡi và gấp chăn màn.' },
      { en: 'After breakfast, I pack my books and walk to the bus stop.', vi: 'Sau bữa sáng, tôi xếp sách vở và đi bộ đến trạm xe buýt.' },
      { en: 'The bus arrives at seven fifteen, so I have to be on time.', vi: 'Xe buýt đến lúc bảy giờ mười lăm, vì vậy tôi phải đúng giờ.' },
      { en: 'My first lesson starts at eight, and I feel ready for the day.', vi: 'Tiết học đầu tiên bắt đầu lúc tám giờ và tôi cảm thấy sẵn sàng cho ngày mới.' },
    ],
    vocabulary: [
      { word: 'usually', ipa: '/ˈjuː.ʒu.ə.li/', pos: 'adv.', meaningVi: 'thường xuyên', definitionEn: 'In the way that most often happens.', exampleEn: 'I usually walk to school.', exampleVi: 'Tôi thường đi bộ đến trường.' },
      { word: 'pack', ipa: '/pæk/', pos: 'v.', meaningVi: 'đóng gói, xếp đồ', definitionEn: 'To put things into a bag for a journey or activity.', exampleEn: 'Pack your books before breakfast.', exampleVi: 'Hãy xếp sách trước bữa sáng.' },
      { word: 'on time', ipa: '/ɒn taɪm/', pos: 'phrase', meaningVi: 'đúng giờ', definitionEn: 'At the planned or expected time.', exampleEn: 'The train arrived on time.', exampleVi: 'Chuyến tàu đến đúng giờ.' },
    ],
    questions: [
      { question: 'What time does the student usually wake up?', options: ['Six fifteen', 'Six thirty', 'Seven fifteen', 'Seven thirty'], answer: 'Six thirty', why: 'The speaker says, “I usually wake up at six thirty.”' },
      { question: 'How does the student get to the bus stop?', options: ['By bicycle', 'By car', 'On foot', 'By train'], answer: 'On foot', why: 'The speaker says they walk to the bus stop.' },
    ],
  },
  {
    id: 'hs-a2-asking-directions',
    title: 'Finding the City Library',
    track: 'high_school',
    level: 'A2',
    category: 'Places & Directions',
    summary: 'A visitor asks for directions and learns how to find a public library.',
    sentences: [
      { en: 'Excuse me, could you tell me how to get to the city library?', vi: 'Xin lỗi, bạn có thể chỉ cho tôi đường đến thư viện thành phố không?' },
      { en: 'Go straight for two blocks and turn left at the traffic lights.', vi: 'Đi thẳng hai dãy phố rồi rẽ trái ở đèn giao thông.' },
      { en: 'You will see a small park on your right, opposite the post office.', vi: 'Bạn sẽ thấy một công viên nhỏ bên phải, đối diện bưu điện.' },
      { en: 'The library is next to the park, and it closes at six this evening.', vi: 'Thư viện nằm cạnh công viên và đóng cửa lúc sáu giờ tối nay.' },
    ],
    vocabulary: [
      { word: 'traffic lights', ipa: '/ˈtræf.ɪk laɪts/', pos: 'n. pl.', meaningVi: 'đèn giao thông', definitionEn: 'A set of red, yellow, and green lights that controls road traffic.', exampleEn: 'Turn right after the traffic lights.', exampleVi: 'Rẽ phải sau đèn giao thông.' },
      { word: 'opposite', ipa: '/ˈɒp.ə.zɪt/', pos: 'prep.', meaningVi: 'đối diện', definitionEn: 'On the other side of a space or area.', exampleEn: 'The bank is opposite the station.', exampleVi: 'Ngân hàng ở đối diện nhà ga.' },
      { word: 'next to', ipa: '/nekst tuː/', pos: 'prep.', meaningVi: 'bên cạnh', definitionEn: 'Very close to or beside something.', exampleEn: 'Our classroom is next to the lab.', exampleVi: 'Lớp học của chúng tôi nằm cạnh phòng thí nghiệm.' },
    ],
    questions: [
      { question: 'Where should the visitor turn left?', options: ['At the library', 'At the traffic lights', 'At the park', 'At the post office'], answer: 'At the traffic lights', why: 'The directions say to turn left at the traffic lights.' },
      { question: 'What time does the library close?', options: ['Five o’clock', 'Five thirty', 'Six o’clock', 'Six thirty'], answer: 'Six o’clock', why: 'The final sentence says the library closes at six.' },
    ],
  },
  {
    id: 'hs-b1-online-learning',
    title: 'Making Online Learning Work',
    track: 'high_school',
    level: 'B1',
    category: 'Education & Technology',
    summary: 'A student shares practical ways to stay focused and learn effectively online.',
    sentences: [
      { en: 'Online lessons give students more flexibility, but they also require self-discipline.', vi: 'Các bài học trực tuyến mang lại sự linh hoạt hơn, nhưng cũng đòi hỏi tính tự giác.' },
      { en: 'I plan my study time in short blocks and take a five-minute break between them.', vi: 'Tôi lên kế hoạch học theo từng khoảng ngắn và nghỉ năm phút giữa các khoảng đó.' },
      { en: 'I turn off notifications because messages can easily interrupt my concentration.', vi: 'Tôi tắt thông báo vì tin nhắn có thể dễ dàng làm gián đoạn sự tập trung.' },
      { en: 'At the end of each lesson, I write down one question and explain the main idea in my own words.', vi: 'Cuối mỗi bài học, tôi ghi lại một câu hỏi và diễn giải ý chính bằng lời của mình.' },
    ],
    vocabulary: [
      { word: 'flexibility', ipa: '/ˌflek.səˈbɪl.ə.ti/', pos: 'n.', meaningVi: 'sự linh hoạt', definitionEn: 'The ability to change or adapt easily.', exampleEn: 'Remote study offers flexibility.', exampleVi: 'Việc học từ xa mang lại sự linh hoạt.' },
      { word: 'self-discipline', ipa: '/ˌselfˈdɪs.ə.plɪn/', pos: 'n.', meaningVi: 'tính tự giác, kỷ luật bản thân', definitionEn: 'The ability to control your behavior and work toward a goal.', exampleEn: 'Self-discipline helps me finish tasks.', exampleVi: 'Tính tự giác giúp tôi hoàn thành nhiệm vụ.' },
      { word: 'interrupt', ipa: '/ˌɪn.təˈrʌpt/', pos: 'v.', meaningVi: 'làm gián đoạn', definitionEn: 'To stop something temporarily or break someone’s concentration.', exampleEn: 'Loud music can interrupt your study.', exampleVi: 'Nhạc lớn có thể làm gián đoạn việc học.' },
    ],
    questions: [
      { question: 'Why does the speaker turn off notifications?', options: ['To save battery', 'To avoid interruptions', 'To finish earlier', 'To reduce screen brightness'], answer: 'To avoid interruptions', why: 'The speaker says messages can interrupt concentration.' },
      { question: 'What does the speaker write at the end of each lesson?', options: ['A long summary', 'A new timetable', 'One question and the main idea', 'A list of notifications'], answer: 'One question and the main idea', why: 'The final sentence describes writing one question and explaining the main idea.' },
    ],
  },
  {
    id: 'hs-b2-community-transport',
    title: 'Should Cities Invest in Public Transport?',
    track: 'high_school',
    level: 'B2',
    category: 'Society & Environment',
    summary: 'Two classmates discuss traffic congestion and the long-term value of reliable public transport.',
    sentences: [
      { en: 'Our city has expanded rapidly, and daily traffic congestion is becoming increasingly difficult to manage.', vi: 'Thành phố phát triển nhanh chóng và tình trạng ùn tắc giao thông hằng ngày ngày càng khó kiểm soát.' },
      { en: 'Some residents prefer private vehicles because they offer convenience and flexible schedules.', vi: 'Một số cư dân thích phương tiện cá nhân vì chúng thuận tiện và có lịch trình linh hoạt.' },
      { en: 'However, reliable buses and trains can reduce emissions while making commuting more affordable.', vi: 'Tuy nhiên, xe buýt và tàu đáng tin cậy có thể giảm khí thải đồng thời giúp việc đi lại có chi phí hợp lý hơn.' },
      { en: 'The real challenge is to connect residential areas with schools, workplaces, and transport hubs.', vi: 'Thách thức thực sự là kết nối các khu dân cư với trường học, nơi làm việc và các đầu mối giao thông.' },
    ],
    vocabulary: [
      { word: 'congestion', ipa: '/kənˈdʒes.tʃən/', pos: 'n.', meaningVi: 'sự ùn tắc', definitionEn: 'A situation in which a place is too crowded or traffic moves slowly.', exampleEn: 'Traffic congestion is common during rush hour.', exampleVi: 'Ùn tắc giao thông phổ biến vào giờ cao điểm.' },
      { word: 'emissions', ipa: '/ɪˈmɪʃ.ənz/', pos: 'n. pl.', meaningVi: 'khí thải', definitionEn: 'Gases or substances released into the air.', exampleEn: 'Cleaner buses can reduce emissions.', exampleVi: 'Xe buýt sạch hơn có thể giảm khí thải.' },
      { word: 'commuting', ipa: '/kəˈmjuː.tɪŋ/', pos: 'n.', meaningVi: 'việc đi lại hằng ngày', definitionEn: 'Traveling regularly between home and work or school.', exampleEn: 'Commuting takes an hour each day.', exampleVi: 'Việc đi làm mất một giờ mỗi ngày.' },
    ],
    questions: [
      { question: 'What is one advantage of private vehicles mentioned?', options: ['Lower emissions', 'Flexible schedules', 'Free parking everywhere', 'Shorter city distances'], answer: 'Flexible schedules', why: 'The speaker says private vehicles offer convenience and flexible schedules.' },
      { question: 'What is described as the real challenge?', options: ['Building more shopping malls', 'Connecting key areas across the city', 'Reducing school hours', 'Banning all buses'], answer: 'Connecting key areas across the city', why: 'The final sentence focuses on connecting residential areas with key destinations.' },
    ],
  },
  {
    id: 'pro-a2-first-meeting',
    title: 'Introducing Yourself in a New Team',
    track: 'professional',
    level: 'A2',
    category: 'Workplace Communication',
    summary: 'A new employee introduces their role and asks a colleague about the team’s routine.',
    sentences: [
      { en: 'Good morning, everyone. I am Anna, and I have just joined the sales team.', vi: 'Chào buổi sáng mọi người. Tôi là Anna và vừa gia nhập nhóm kinh doanh.' },
      { en: 'I will mainly support customer enquiries and prepare weekly reports.', vi: 'Tôi chủ yếu hỗ trợ các yêu cầu của khách hàng và chuẩn bị báo cáo hằng tuần.' },
      { en: 'Could someone show me where the shared documents are stored?', vi: 'Ai đó có thể chỉ cho tôi nơi lưu trữ tài liệu dùng chung không?' },
      { en: 'I am looking forward to working with you and learning from the team.', vi: 'Tôi mong được làm việc cùng mọi người và học hỏi từ cả nhóm.' },
    ],
    vocabulary: [
      { word: 'join', ipa: '/dʒɔɪn/', pos: 'v.', meaningVi: 'tham gia, gia nhập', definitionEn: 'To become a member of a group or organization.', exampleEn: 'I joined the marketing team last month.', exampleVi: 'Tôi gia nhập nhóm tiếp thị tháng trước.' },
      { word: 'enquiry', ipa: '/ɪnˈkwaɪə.ri/', pos: 'n.', meaningVi: 'yêu cầu thông tin, câu hỏi', definitionEn: 'A question asking for information.', exampleEn: 'We received an enquiry from a new client.', exampleVi: 'Chúng tôi nhận được yêu cầu từ một khách hàng mới.' },
      { word: 'shared', ipa: '/ʃeəd/', pos: 'adj.', meaningVi: 'dùng chung, được chia sẻ', definitionEn: 'Used or owned by more than one person.', exampleEn: 'Save the file in the shared folder.', exampleVi: 'Lưu tệp vào thư mục dùng chung.' },
    ],
    questions: [
      { question: 'Which team has Anna joined?', options: ['Finance', 'Sales', 'Design', 'Human Resources'], answer: 'Sales', why: 'Anna says she has joined the sales team.' },
      { question: 'What does Anna mainly support?', options: ['Customer enquiries and weekly reports', 'Office cleaning', 'Product delivery', 'Staff recruitment'], answer: 'Customer enquiries and weekly reports', why: 'The second sentence describes her main responsibilities.' },
    ],
  },
  {
    id: 'pro-b1-customer-complaint',
    title: 'Handling a Delayed Delivery',
    track: 'professional',
    level: 'B1',
    category: 'Customer Service',
    summary: 'A support agent acknowledges a delivery delay and offers a clear next step.',
    sentences: [
      { en: 'I understand that your order was expected yesterday, and I am sorry for the inconvenience.', vi: 'Tôi hiểu rằng đơn hàng của quý khách dự kiến đến vào hôm qua và rất xin lỗi vì sự bất tiện này.' },
      { en: 'I have checked the tracking system, and the parcel is currently at the regional distribution centre.', vi: 'Tôi đã kiểm tra hệ thống theo dõi và kiện hàng hiện đang ở trung tâm phân phối khu vực.' },
      { en: 'I will contact the courier now and request an updated delivery estimate.', vi: 'Tôi sẽ liên hệ đơn vị vận chuyển ngay và yêu cầu thời gian giao hàng cập nhật.' },
      { en: 'You will receive a message from us as soon as the new delivery date is confirmed.', vi: 'Quý khách sẽ nhận được tin nhắn từ chúng tôi ngay khi ngày giao hàng mới được xác nhận.' },
    ],
    vocabulary: [
      { word: 'inconvenience', ipa: '/ˌɪn.kənˈviː.ni.əns/', pos: 'n.', meaningVi: 'sự bất tiện', definitionEn: 'A problem or difficulty that causes trouble.', exampleEn: 'We apologize for the inconvenience.', exampleVi: 'Chúng tôi xin lỗi vì sự bất tiện này.' },
      { word: 'distribution centre', ipa: '/ˌdɪs.trɪˈbjuː.ʃən ˌsen.tər/', pos: 'n.', meaningVi: 'trung tâm phân phối', definitionEn: 'A place where goods are stored and sent to customers or shops.', exampleEn: 'The parcel left the distribution centre.', exampleVi: 'Kiện hàng đã rời trung tâm phân phối.' },
      { word: 'estimate', ipa: '/ˈes.tɪ.mət/', pos: 'n.', meaningVi: 'ước tính', definitionEn: 'A calculation of what something will probably cost or how long it will take.', exampleEn: 'The courier gave us a delivery estimate.', exampleVi: 'Đơn vị vận chuyển đưa ra thời gian giao hàng ước tính.' },
    ],
    questions: [
      { question: 'Where is the parcel now?', options: ['At the customer’s home', 'At the regional distribution centre', 'At the airport', 'At the local shop'], answer: 'At the regional distribution centre', why: 'The agent confirms the parcel’s current location.' },
      { question: 'What will the agent do next?', options: ['Cancel the order', 'Contact the courier', 'Ask the customer to collect it', 'Send a replacement immediately'], answer: 'Contact the courier', why: 'The agent says they will contact the courier and request an updated estimate.' },
    ],
  },
  {
    id: 'pro-b2-project-update',
    title: 'Giving a Clear Project Status Update',
    track: 'professional',
    level: 'B2',
    category: 'Meetings & Project Management',
    summary: 'A project lead explains progress, a delivery risk, and the action needed from another team.',
    sentences: [
      { en: 'The project is broadly on track, and the design team completed the revised interface on Monday.', vi: 'Dự án nhìn chung vẫn đúng tiến độ và nhóm thiết kế đã hoàn thành giao diện chỉnh sửa vào thứ Hai.' },
      { en: 'However, integration testing has uncovered two issues affecting the payment workflow.', vi: 'Tuy nhiên, kiểm thử tích hợp đã phát hiện hai vấn đề ảnh hưởng đến quy trình thanh toán.' },
      { en: 'We have assigned an engineer to investigate the root cause and expect an update by tomorrow afternoon.', vi: 'Chúng tôi đã phân công một kỹ sư tìm nguyên nhân gốc rễ và dự kiến có cập nhật vào chiều mai.' },
      { en: 'To protect the launch date, we need the operations team to confirm the rollback procedure today.', vi: 'Để bảo vệ ngày ra mắt, chúng tôi cần nhóm vận hành xác nhận quy trình khôi phục ngay hôm nay.' },
    ],
    vocabulary: [
      { word: 'on track', ipa: '/ɒn træk/', pos: 'phrase', meaningVi: 'đúng tiến độ', definitionEn: 'Progressing as planned.', exampleEn: 'The project remains on track.', exampleVi: 'Dự án vẫn đúng tiến độ.' },
      { word: 'integration testing', ipa: '/ˌɪn.tɪˈɡreɪ.ʃən ˈtes.tɪŋ/', pos: 'n.', meaningVi: 'kiểm thử tích hợp', definitionEn: 'Testing whether different parts of a system work together correctly.', exampleEn: 'Integration testing found a payment bug.', exampleVi: 'Kiểm thử tích hợp phát hiện lỗi thanh toán.' },
      { word: 'rollback', ipa: '/ˈrəʊl.bæk/', pos: 'n.', meaningVi: 'việc quay về phiên bản trước', definitionEn: 'The process of returning software or a system to an earlier state.', exampleEn: 'Prepare a rollback before deployment.', exampleVi: 'Chuẩn bị phương án quay lui trước khi triển khai.' },
    ],
    questions: [
      { question: 'What did integration testing uncover?', options: ['A design delay', 'Two payment workflow issues', 'A staffing problem', 'A budget increase'], answer: 'Two payment workflow issues', why: 'The second sentence identifies two issues in the payment workflow.' },
      { question: 'What confirmation is needed today?', options: ['The marketing plan', 'The rollback procedure', 'The new office location', 'The hiring budget'], answer: 'The rollback procedure', why: 'The final sentence asks operations to confirm the rollback procedure.' },
    ],
  },
  {
    id: 'pro-c1-negotiation',
    title: 'Negotiating a Realistic Delivery Timeline',
    track: 'professional',
    level: 'C1',
    category: 'Negotiation & Leadership',
    summary: 'A manager balances a client’s deadline with quality, dependencies, and a phased delivery proposal.',
    sentences: [
      { en: 'We appreciate the urgency, but committing to the original deadline would expose both teams to avoidable delivery risks.', vi: 'Chúng tôi hiểu tính cấp bách, nhưng cam kết thời hạn ban đầu sẽ khiến cả hai nhóm đối mặt với rủi ro có thể tránh được.' },
      { en: 'The main dependency is the security review, which cannot be shortened without compromising the agreed standard.', vi: 'Phụ thuộc chính là khâu rà soát bảo mật, không thể rút ngắn nếu không làm ảnh hưởng đến tiêu chuẩn đã thống nhất.' },
      { en: 'Rather than delay the entire release, we propose delivering the core workflow first and scheduling the remaining enhancements for the following sprint.', vi: 'Thay vì trì hoãn toàn bộ bản phát hành, chúng tôi đề xuất bàn giao quy trình cốt lõi trước và lên lịch các cải tiến còn lại cho sprint tiếp theo.' },
      { en: 'This phased approach gives your team an early usable outcome while preserving sufficient time for verification.', vi: 'Cách tiếp cận theo giai đoạn giúp nhóm của quý vị sớm có kết quả sử dụng được, đồng thời vẫn giữ đủ thời gian xác minh.' },
    ],
    vocabulary: [
      { word: 'dependency', ipa: '/dɪˈpen.dən.si/', pos: 'n.', meaningVi: 'yếu tố phụ thuộc', definitionEn: 'Something that must happen or be available before another thing can happen.', exampleEn: 'Security approval is a key dependency.', exampleVi: 'Phê duyệt bảo mật là một yếu tố phụ thuộc quan trọng.' },
      { word: 'compromise', ipa: '/ˈkɒm.prə.maɪz/', pos: 'v.', meaningVi: 'làm tổn hại, thỏa hiệp', definitionEn: 'To weaken or damage something, or to reach an agreement by making concessions.', exampleEn: 'Do not compromise product quality.', exampleVi: 'Đừng làm ảnh hưởng đến chất lượng sản phẩm.' },
      { word: 'phased approach', ipa: '/feɪzd əˈprəʊtʃ/', pos: 'n. phrase', meaningVi: 'cách tiếp cận theo từng giai đoạn', definitionEn: 'A plan that delivers work in separate stages.', exampleEn: 'A phased approach reduces delivery risk.', exampleVi: 'Cách triển khai theo giai đoạn giúp giảm rủi ro bàn giao.' },
    ],
    questions: [
      { question: 'Why can the security review not be shortened?', options: ['The client has changed teams', 'It could compromise the agreed standard', 'The budget has expired', 'The core workflow is complete'], answer: 'It could compromise the agreed standard', why: 'The speaker says shortening it would compromise the agreed standard.' },
      { question: 'What does the phased proposal deliver first?', options: ['All enhancements', 'The core workflow', 'The final report', 'The security audit only'], answer: 'The core workflow', why: 'The proposal is to deliver the core workflow first.' },
    ],
  },
];

export const ADDITIONAL_LISTENING_LESSONS: ListeningLesson[] = lessonSeeds.map(buildLesson);

export const ADDITIONAL_FREE_SPEAKING_TOPICS: FreeSpeakingTopic[] = [
  { id: 'fst-hs-a2-weekend', title: 'My Ideal Weekend', track: 'high_school', level: 'A2', category: 'Daily Life', prompt: 'Describe your ideal weekend. Explain what you would do on Saturday and Sunday and who you would spend time with.', guidingQuestions: ['What time would you wake up?', 'Would you prefer staying home or going out?', 'Why would this weekend help you relax?'], suggestedVocab: ['relaxing', 'make plans', 'spend time with', 'look forward to', 'outdoor activity'], targetMinutes: 1 },
  { id: 'fst-hs-a2-school-club', title: 'A School Club I Would Join', track: 'high_school', level: 'A2', category: 'School Life', prompt: 'Choose a school club you would like to join and explain what you hope to learn or contribute.', guidingQuestions: ['What does the club do?', 'What skills could you develop?', 'How could you help other members?'], suggestedVocab: ['take part in', 'work as a team', 'develop a skill', 'organize an event', 'contribute'], targetMinutes: 1 },
  { id: 'fst-hs-b1-tech-study', title: 'Does Technology Make Studying Easier?', track: 'high_school', level: 'B1', category: 'Education & Technology', prompt: 'Give your opinion on whether digital tools make students more effective learners. Include one benefit and one drawback.', guidingQuestions: ['Which tool helps you learn best?', 'How can notifications become a problem?', 'What rule would you set for screen time?'], suggestedVocab: ['digital resources', 'stay focused', 'distraction', 'independent learning', 'screen time'], targetMinutes: 2 },
  { id: 'fst-hs-b1-healthy-habits', title: 'One Habit That Improved My Health', track: 'high_school', level: 'B1', category: 'Health & Lifestyle', prompt: 'Talk about one healthy habit you have developed or want to develop and explain how it affects daily life.', guidingQuestions: ['When did you start?', 'What makes the habit difficult?', 'How could you maintain it?'], suggestedVocab: ['consistent', 'balanced routine', 'sleep schedule', 'stay hydrated', 'long-term benefit'], targetMinutes: 2 },
  { id: 'fst-hs-b2-volunteering', title: 'Should Volunteering Be Part of School Life?', track: 'high_school', level: 'B2', category: 'Community & Society', prompt: 'Discuss whether schools should require students to complete community service. Present both sides before giving your position.', guidingQuestions: ['What can students gain from volunteering?', 'Could compulsory service become meaningless?', 'How should schools recognize genuine contribution?'], suggestedVocab: ['community service', 'civic responsibility', 'compulsory', 'meaningful contribution', 'social awareness'], targetMinutes: 2 },
  { id: 'fst-hs-b2-career-ai', title: 'How Will AI Change Future Careers?', track: 'high_school', level: 'B2', category: 'Careers & Future', prompt: 'Explain how artificial intelligence may change the jobs young people will do. Identify skills that will remain valuable.', guidingQuestions: ['Which tasks could be automated?', 'Why will communication still matter?', 'How should students prepare now?'], suggestedVocab: ['automation', 'adaptability', 'critical thinking', 'transferable skills', 'lifelong learning'], targetMinutes: 2 },
  { id: 'fst-pro-a2-workday', title: 'Describe a Typical Workday', track: 'professional', level: 'A2', category: 'Workplace Communication', prompt: 'Describe a typical working day, including your main tasks and one thing you enjoy about your job.', guidingQuestions: ['When does your day start?', 'Who do you work with?', 'What task takes the most time?'], suggestedVocab: ['daily task', 'colleague', 'schedule', 'deadline', 'take a break'], targetMinutes: 1 },
  { id: 'fst-pro-b1-teamwork', title: 'What Makes a Good Teammate?', track: 'professional', level: 'B1', category: 'Teamwork', prompt: 'Describe the qualities of a reliable teammate and give an example of how good teamwork helps a project.', guidingQuestions: ['Why is communication important?', 'How should a team handle disagreement?', 'What does accountability look like?'], suggestedVocab: ['reliable', 'accountability', 'supportive', 'share responsibility', 'constructive feedback'], targetMinutes: 2 },
  { id: 'fst-pro-b1-customer', title: 'Turning a Customer Complaint into a Solution', track: 'professional', level: 'B1', category: 'Customer Service', prompt: 'Explain how you would respond to an unhappy customer while remaining professional and finding a practical solution.', guidingQuestions: ['How would you show empathy?', 'What information would you check?', 'How would you confirm the next step?'], suggestedVocab: ['acknowledge', 'resolve an issue', 'follow up', 'expectation', 'inconvenience'], targetMinutes: 2 },
  { id: 'fst-pro-b2-remote', title: 'Is Hybrid Work Better Than Office Work?', track: 'professional', level: 'B2', category: 'Workplace & Leadership', prompt: 'Compare hybrid and office-based work. Recommend a model for a team that needs both focused work and collaboration.', guidingQuestions: ['Which tasks need face-to-face discussion?', 'How can remote staff stay included?', 'What outcomes should managers measure?'], suggestedVocab: ['hybrid arrangement', 'collaboration', 'autonomy', 'measurable outcome', 'team alignment'], targetMinutes: 2 },
  { id: 'fst-pro-b2-feedback', title: 'Giving Feedback Without Damaging Trust', track: 'professional', level: 'B2', category: 'Leadership', prompt: 'Describe how a manager can give honest feedback while maintaining a constructive relationship with an employee.', guidingQuestions: ['Why should feedback be specific?', 'How can the employee respond?', 'What should happen after the discussion?'], suggestedVocab: ['constructive', 'specific example', 'actionable', 'mutual respect', 'follow-up'], targetMinutes: 2 },
  { id: 'fst-pro-c1-priorities', title: 'Managing Competing Priorities', track: 'professional', level: 'C1', category: 'Leadership & Strategy', prompt: 'Explain how you would prioritize several urgent projects when resources are limited. Defend your decision-making framework.', guidingQuestions: ['How do you compare impact and urgency?', 'When should a deadline be renegotiated?', 'How do you communicate trade-offs?'], suggestedVocab: ['resource allocation', 'trade-off', 'strategic impact', 'escalate', 'feasibility'], targetMinutes: 3 },
];

export const ADDITIONAL_READ_ALOUD_PASSAGES: ReadAloudPassage[] = [
  { id: 'ra-hs-a2-small-goals', title: 'Small Goals, Real Progress', track: 'high_school', level: 'A2', category: 'Study Skills', text: 'Learning a language takes time. I practice for fifteen minutes every day. I review old words before learning new ones. Small steps help me build a habit that lasts.', sentences: [{ id: 'ra-hs-a2-s1', text: 'Learning a language takes time.', textVi: 'Học một ngôn ngữ cần thời gian.' }, { id: 'ra-hs-a2-s2', text: 'I practice for fifteen minutes every day.', textVi: 'Tôi luyện tập mười lăm phút mỗi ngày.' }, { id: 'ra-hs-a2-s3', text: 'I review old words before learning new ones.', textVi: 'Tôi ôn từ cũ trước khi học từ mới.' }, { id: 'ra-hs-a2-s4', text: 'Small steps help me build a habit that lasts.', textVi: 'Những bước nhỏ giúp tôi xây dựng thói quen lâu dài.' }], focusSounds: ['final /s/ in takes and steps', 'stress in language and practice'], targetWpm: 100 },
  { id: 'ra-hs-b1-digital-balance', title: 'Finding a Healthy Digital Balance', track: 'high_school', level: 'B1', category: 'Technology & Well-being', text: 'Digital devices make information easy to access, but constant notifications can interrupt concentration. Students can protect their attention by setting clear study periods and keeping their phones out of reach. A balanced routine makes technology a useful tool rather than a constant distraction.', sentences: [{ id: 'ra-hs-b1-s1', text: 'Digital devices make information easy to access.', textVi: 'Thiết bị số giúp việc tiếp cận thông tin trở nên dễ dàng.' }, { id: 'ra-hs-b1-s2', text: 'Constant notifications can interrupt concentration.', textVi: 'Thông báo liên tục có thể làm gián đoạn sự tập trung.' }, { id: 'ra-hs-b1-s3', text: 'Students can protect their attention by setting clear study periods.', textVi: 'Học sinh có thể bảo vệ sự tập trung bằng cách đặt ra khoảng thời gian học rõ ràng.' }, { id: 'ra-hs-b1-s4', text: 'A balanced routine makes technology a useful tool rather than a constant distraction.', textVi: 'Một lịch trình cân bằng biến công nghệ thành công cụ hữu ích thay vì yếu tố gây xao nhãng.' }], focusSounds: ['ending /ts/ in devices', 'stress in concentration and distraction'], targetWpm: 115 },
  { id: 'ra-hs-b2-urban-green', title: 'Why Urban Green Spaces Matter', track: 'high_school', level: 'B2', category: 'Environment & Society', text: 'Urban green spaces do more than improve the appearance of a city. Trees provide shade, absorb some air pollutants, and create places where residents can exercise or meet. When local authorities protect parks during development, they invest in public health and stronger communities.', sentences: [{ id: 'ra-hs-b2-s1', text: 'Urban green spaces do more than improve the appearance of a city.', textVi: 'Không gian xanh đô thị làm được nhiều hơn việc cải thiện diện mạo thành phố.' }, { id: 'ra-hs-b2-s2', text: 'Trees provide shade and absorb some air pollutants.', textVi: 'Cây xanh tạo bóng mát và hấp thụ một phần chất ô nhiễm trong không khí.' }, { id: 'ra-hs-b2-s3', text: 'Residents can use these places to exercise or meet.', textVi: 'Cư dân có thể sử dụng những nơi này để tập thể dục hoặc gặp gỡ.' }, { id: 'ra-hs-b2-s4', text: 'Protecting parks is an investment in public health and stronger communities.', textVi: 'Bảo vệ công viên là một khoản đầu tư cho sức khỏe cộng đồng và các cộng đồng gắn kết hơn.' }], focusSounds: ['word stress in urban and pollutants', 'linking in public health'], targetWpm: 125 },
  { id: 'ra-pro-b1-meetings', title: 'Making Meetings More Useful', track: 'professional', level: 'B1', category: 'Workplace Communication', text: 'A useful meeting has a clear purpose and a short agenda. Participants should share relevant updates and identify decisions that need to be made. Before the meeting ends, everyone should understand the next action and who is responsible for it.', sentences: [{ id: 'ra-pro-b1-s1', text: 'A useful meeting has a clear purpose and a short agenda.', textVi: 'Một cuộc họp hiệu quả có mục đích rõ ràng và chương trình ngắn gọn.' }, { id: 'ra-pro-b1-s2', text: 'Participants should share relevant updates.', textVi: 'Người tham gia nên chia sẻ những cập nhật liên quan.' }, { id: 'ra-pro-b1-s3', text: 'The team should identify decisions that need to be made.', textVi: 'Nhóm nên xác định những quyết định cần được đưa ra.' }, { id: 'ra-pro-b1-s4', text: 'Everyone should understand the next action and who is responsible for it.', textVi: 'Mọi người nên hiểu hành động tiếp theo và ai chịu trách nhiệm.' }], focusSounds: ['stress in purpose and agenda', 'final /s/ in updates and decisions'], targetWpm: 120 },
  { id: 'ra-pro-b2-customer-trust', title: 'Building Trust with Customers', track: 'professional', level: 'B2', category: 'Customer Experience', text: 'Customer trust develops when a company communicates clearly and keeps its promises. If a problem occurs, a timely explanation is often more valuable than a vague apology. Teams should take ownership, provide realistic options, and follow up until the issue is resolved.', sentences: [{ id: 'ra-pro-b2-s1', text: 'Customer trust develops when a company communicates clearly.', textVi: 'Niềm tin của khách hàng được hình thành khi công ty giao tiếp rõ ràng.' }, { id: 'ra-pro-b2-s2', text: 'A timely explanation is often more valuable than a vague apology.', textVi: 'Một lời giải thích kịp thời thường có giá trị hơn lời xin lỗi mơ hồ.' }, { id: 'ra-pro-b2-s3', text: 'Teams should take ownership and provide realistic options.', textVi: 'Các nhóm nên nhận trách nhiệm và đưa ra những lựa chọn thực tế.' }, { id: 'ra-pro-b2-s4', text: 'Follow up until the issue is resolved.', textVi: 'Tiếp tục theo dõi cho đến khi vấn đề được giải quyết.' }], focusSounds: ['stress in valuable and realistic', 'ending /d/ in resolved'], targetWpm: 130 },
  { id: 'ra-pro-c1-change', title: 'Leading Through Organizational Change', track: 'professional', level: 'C1', category: 'Leadership & Strategy', text: 'Organizational change rarely succeeds through announcements alone. Leaders need to explain the rationale, acknowledge uncertainty, and create channels for employees to raise concerns. Consistent communication, visible accountability, and measurable milestones help turn a strategic plan into sustained progress.', sentences: [{ id: 'ra-pro-c1-s1', text: 'Organizational change rarely succeeds through announcements alone.', textVi: 'Thay đổi trong tổ chức hiếm khi thành công chỉ nhờ các thông báo.' }, { id: 'ra-pro-c1-s2', text: 'Leaders need to explain the rationale and acknowledge uncertainty.', textVi: 'Lãnh đạo cần giải thích cơ sở lý do và thừa nhận những điều chưa chắc chắn.' }, { id: 'ra-pro-c1-s3', text: 'Employees need channels to raise concerns.', textVi: 'Nhân viên cần có kênh để nêu lên những mối quan ngại.' }, { id: 'ra-pro-c1-s4', text: 'Measurable milestones help turn a strategic plan into sustained progress.', textVi: 'Các cột mốc đo lường được giúp biến kế hoạch chiến lược thành tiến triển bền vững.' }], focusSounds: ['stress in organizational and rationale', 'linking in sustained progress'], targetWpm: 135 },
];
