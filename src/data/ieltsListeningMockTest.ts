export type IELTSQuestion = {
  id: number;
  prompt: string;
  answer: string;
  accepted?: string[];
  options?: string[];
  explanation: string;
  evidence: string;
  focus: string;
};
export type IELTSPart = {
  id: number;
  title: string;
  context: string;
  speaker: string;
  transcript: string;
  questions: IELTSQuestion[];
};

export const IELTS_LISTENING_MOCK_01: IELTSPart[] = [
  {
    id: 1, title: 'Booking a weekend course', context: 'Everyday conversation', speaker: 'Two speakers',
    transcript: 'Good morning, Greenford Language Centre. How can I help? Hello, I would like to book a weekend photography course. Certainly. We have a beginner course starting on Saturday the 14th of June. It runs for six weeks, from nine thirty until twelve thirty. The fee is 180 pounds, and that includes the printed handbook, although students need to bring their own camera. Is there a discount for students? Yes, students receive a 15 percent reduction if they show a valid student card when they register. The classes take place in Room 204, on the second floor. You can register online, but payment must be completed by Thursday. We have twelve places available and four are already taken. The tutor is called Helen Morris, and she specialises in outdoor photography. Thank you. I will register this afternoon.',
    questions: [
      {id:1,prompt:'Which course does the caller want to book?',answer:'photography',options:['Cooking','Photography','Painting'],explanation:'The caller explicitly asks to book a weekend photography course.',evidence:'“I would like to book a weekend photography course.”',focus:'Identifying the main request'},
      {id:2,prompt:'What date does the course begin?',answer:'14 June',accepted:['14th June','June 14','14 June'],explanation:'The start date is Saturday the 14th of June.',evidence:'“starting on Saturday the 14th of June.”',focus:'Dates'},
      {id:3,prompt:'How many weeks does the course last?',answer:'six',accepted:['6','six weeks'],explanation:'The course runs for six weeks.',evidence:'“It runs for six weeks.”',focus:'Numbers'},
      {id:4,prompt:'What time does the class finish?',answer:'12:30',accepted:['12.30','twelve thirty','12 30'],explanation:'The class runs from 9:30 until 12:30.',evidence:'“from nine thirty until twelve thirty.”',focus:'Times'},
      {id:5,prompt:'What is the full course fee in pounds?',answer:'180',accepted:['£180','180 pounds'],explanation:'The advertised fee is 180 pounds before any discount.',evidence:'“The fee is 180 pounds.”',focus:'Prices'},
      {id:6,prompt:'What must students bring themselves?',answer:'camera',accepted:['a camera','their own camera'],explanation:'The handbook is included, but the camera is not provided.',evidence:'“students need to bring their own camera.”',focus:'Contrasting information'},
      {id:7,prompt:'What reduction is available to students?',answer:'15%',accepted:['15 percent','15 per cent'],explanation:'A valid student card gives a 15 percent reduction.',evidence:'“students receive a 15 percent reduction.”',focus:'Percentages'},
      {id:8,prompt:'Which room is used for the class?',answer:'204',accepted:['room 204'],explanation:'The class takes place in Room 204.',evidence:'“The classes take place in Room 204.”',focus:'Numbers and locations'},
      {id:9,prompt:'By which day must payment be completed?',answer:'Thursday',explanation:'Online registration is possible, but payment is due by Thursday.',evidence:'“payment must be completed by Thursday.”',focus:'Deadlines'},
      {id:10,prompt:'What is the tutor’s surname?',answer:'Morris',accepted:['Helen Morris'],explanation:'The tutor is Helen Morris.',evidence:'“The tutor is called Helen Morris.”',focus:'Names and spelling'}
    ]
  },
  {
    id: 2, title: 'A guide to Riverside Park', context: 'Public information announcement', speaker: 'One speaker',
    transcript: 'Welcome to Riverside Park. The main entrance is beside the bus station, and the visitor centre is the first building on your left. The café is directly opposite the visitor centre, while the children’s playground is behind the café, next to the lake. If you are interested in local history, the small museum is at the far end of the rose garden. It opens at ten in the morning and closes at four thirty. Guided tours leave from the information desk at eleven fifteen every day except Monday. The park has two bicycle rental points. The northern point is near the old bridge, and the southern point is beside the sports centre. Please note that the outdoor swimming pool is closed this week for maintenance. However, the tennis courts remain open until seven in the evening. Visitors can use the free drinking-water fountains near the playground and the main car park.',
    questions: [
      {id:11,prompt:'Where is the main entrance?',answer:'bus station',accepted:['beside the bus station','near the bus station'],explanation:'The entrance is beside the bus station.',evidence:'“The main entrance is beside the bus station.”',focus:'Map and location language'},
      {id:12,prompt:'Which building is first on the left?',answer:'visitor centre',accepted:['the visitor centre'],explanation:'The visitor centre is the first building on the left.',evidence:'“the visitor centre is the first building on your left.”',focus:'Directions'},
      {id:13,prompt:'What is directly opposite the visitor centre?',answer:'café',accepted:['cafe','the café'],explanation:'The café is directly opposite the visitor centre.',evidence:'“The café is directly opposite the visitor centre.”',focus:'Spatial relationships'},
      {id:14,prompt:'Where is the playground?',answer:'behind the café',accepted:['behind the cafe','next to the lake'],explanation:'It is behind the café and next to the lake.',evidence:'“the children’s playground is behind the café, next to the lake.”',focus:'Spatial relationships'},
      {id:15,prompt:'Where can visitors find the museum?',answer:'rose garden',accepted:['at the far end of the rose garden'],explanation:'The museum is at the far end of the rose garden.',evidence:'“the small museum is at the far end of the rose garden.”',focus:'Location details'},
      {id:16,prompt:'At what time does the museum close?',answer:'4:30',accepted:['4.30','four thirty','16:30'],explanation:'The museum closes at four thirty.',evidence:'“closes at four thirty.”',focus:'Times'},
      {id:17,prompt:'On which day are guided tours not available?',answer:'Monday',explanation:'Tours run every day except Monday.',evidence:'“every day except Monday.”',focus:'Negative information'},
      {id:18,prompt:'Where is the northern bicycle rental point?',answer:'old bridge',accepted:['near the old bridge'],explanation:'The northern rental point is near the old bridge.',evidence:'“The northern point is near the old bridge.”',focus:'Directions'},
      {id:19,prompt:'Which facility is closed this week?',answer:'swimming pool',accepted:['outdoor swimming pool'],explanation:'The outdoor swimming pool is closed for maintenance.',evidence:'“the outdoor swimming pool is closed this week for maintenance.”',focus:'Distractors'},
      {id:20,prompt:'Until what time are the tennis courts open?',answer:'7 pm',accepted:['7','seven','seven in the evening','19:00'],explanation:'The courts remain open until seven in the evening.',evidence:'“the tennis courts remain open until seven in the evening.”',focus:'Times'}
    ]
  },
  {
    id: 3, title: 'Planning a university research project', context: 'Education and training discussion', speaker: 'Three speakers',
    transcript: 'Tutor: Let us review your project on urban transport. Have you decided on the research question? Maya: We want to investigate why commuters are choosing bicycles instead of buses. Daniel: We originally planned to compare three cities, but that would make the project too broad. Tutor: I agree. Focus on one city and compare travel behaviour in the city centre and the suburbs. Maya: We can collect data through an online questionnaire. Daniel: We should also interview local transport planners. Tutor: Good idea, but remember to obtain written permission before recording interviews. Maya: We have contacted the university library. They can provide access to government reports and transport statistics. Daniel: What about the schedule? Tutor: Submit your research proposal by 8 October. The pilot questionnaire should be ready by 22 October, and the final report is due on 12 December. Maya: We will divide the tasks. I will analyse the questionnaire results, and Daniel will summarise the interviews. Tutor: Make sure you include a section on research limitations. You should also explain how seasonal weather might influence cycling figures.',
    questions: [
      {id:21,prompt:'What is the project’s main topic?',answer:'urban transport',accepted:['transport in cities'],explanation:'The tutor identifies the project as being about urban transport.',evidence:'“your project on urban transport.”',focus:'Main idea'},
      {id:22,prompt:'Why did the students abandon the three-city comparison?',answer:'too broad',accepted:['the project would be too broad'],explanation:'They decided that comparing three cities would make the project too broad.',evidence:'“that would make the project too broad.”',focus:'Reason and paraphrase'},
      {id:23,prompt:'Which two areas should they compare?',answer:'city centre and suburbs',accepted:['the city centre and the suburbs'],explanation:'The tutor recommends comparing the centre with the suburbs.',evidence:'“compare travel behaviour in the city centre and the suburbs.”',focus:'Matching information'},
      {id:24,prompt:'What method will they use to collect questionnaire data?',answer:'online questionnaire',explanation:'Maya proposes an online questionnaire.',evidence:'“We can collect data through an online questionnaire.”',focus:'Research methods'},
      {id:25,prompt:'Whom will Daniel and Maya interview?',answer:'transport planners',accepted:['local transport planners'],explanation:'Daniel suggests interviewing local transport planners.',evidence:'“We should also interview local transport planners.”',focus:'Speaker attribution'},
      {id:26,prompt:'What must they obtain before recording interviews?',answer:'written permission',explanation:'The tutor says written permission is required before recording.',evidence:'“obtain written permission before recording interviews.”',focus:'Requirements'},
      {id:27,prompt:'Which institution will provide reports and statistics?',answer:'university library',explanation:'The university library can provide access to the sources.',evidence:'“They can provide access to government reports and transport statistics.”',focus:'Identifying source'},
      {id:28,prompt:'When is the research proposal due?',answer:'8 October',accepted:['October 8','8th October'],explanation:'The proposal deadline is 8 October.',evidence:'“Submit your research proposal by 8 October.”',focus:'Dates'},
      {id:29,prompt:'Who will analyse the questionnaire results?',answer:'Maya',explanation:'Maya takes responsibility for questionnaire analysis.',evidence:'“I will analyse the questionnaire results.”',focus:'Speaker attribution'},
      {id:30,prompt:'What factor might influence cycling figures?',answer:'seasonal weather',accepted:['weather','seasonal changes in weather'],explanation:'The tutor asks them to explain the influence of seasonal weather.',evidence:'“how seasonal weather might influence cycling figures.”',focus:'Cause and effect'}
    ]
  },
  {
    id: 4, title: 'How urban trees support city life', context: 'Academic mini-lecture', speaker: 'One speaker',
    transcript: 'Today I will discuss the role of urban trees in improving city environments. Trees provide shade, which can reduce surface temperatures during heatwaves. Researchers have found that streets with mature tree cover may feel several degrees cooler than streets without it. Trees also absorb some airborne pollutants, although their effectiveness depends on species, leaf structure and local conditions. Another important benefit is the management of rainwater. Tree roots help water enter the soil, reducing the amount that flows directly into drainage systems. However, planting programmes require careful planning. Young trees need regular watering during their first two summers, and local authorities must choose species that can tolerate pollution and limited root space. Community involvement is also essential. In one recent study, survival rates were higher in neighbourhoods where residents volunteered to water and monitor young trees. The researchers recommended a simple maintenance record, including the planting date, species name and watering schedule. They concluded that long-term care, rather than the number of trees planted in a single year, is the best measure of programme success.',
    questions: [
      {id:31,prompt:'What can tree shade reduce during heatwaves?',answer:'surface temperatures',explanation:'Shade lowers the temperature of exposed surfaces.',evidence:'“Trees provide shade, which can reduce surface temperatures during heatwaves.”',focus:'Cause and effect'},
      {id:32,prompt:'What type of trees are compared with streets without tree cover?',answer:'mature trees',accepted:['mature tree cover'],explanation:'The lecture compares streets with mature tree cover to those without it.',evidence:'“streets with mature tree cover may feel several degrees cooler.”',focus:'Key detail'},
      {id:33,prompt:'Which factor affects how well trees absorb pollutants?',answer:'leaf structure',accepted:['species','local conditions'],explanation:'Species, leaf structure and local conditions all affect pollutant absorption.',evidence:'“depends on species, leaf structure and local conditions.”',focus:'Multiple factors'},
      {id:34,prompt:'What do tree roots help rainwater enter?',answer:'soil',accepted:['the soil'],explanation:'Roots help water enter the soil.',evidence:'“Tree roots help water enter the soil.”',focus:'Process'},
      {id:35,prompt:'For how many summers do young trees need regular watering?',answer:'two',accepted:['2','two summers'],explanation:'Regular watering is needed during the first two summers.',evidence:'“during their first two summers.”',focus:'Numbers'},
      {id:36,prompt:'What must local authorities choose carefully?',answer:'tree species',accepted:['species','suitable species'],explanation:'Authorities must select species suited to pollution and limited root space.',evidence:'“choose species that can tolerate pollution and limited root space.”',focus:'Paraphrase'},
      {id:37,prompt:'Where were tree survival rates higher?',answer:'neighbourhoods with resident volunteers',accepted:['neighbourhoods where residents volunteered'],explanation:'Survival was higher where residents helped maintain the trees.',evidence:'“survival rates were higher in neighbourhoods where residents volunteered.”',focus:'Evidence'},
      {id:38,prompt:'What should a maintenance record include besides the planting date?',answer:'species name and watering schedule',accepted:['species and watering schedule','species name, watering schedule'],explanation:'The record should include the species name and watering schedule.',evidence:'“including the planting date, species name and watering schedule.”',focus:'List completion'},
      {id:39,prompt:'What does the lecturer say is a better measure than the number planted in one year?',answer:'long-term care',accepted:['long term care'],explanation:'The conclusion prioritises ongoing maintenance over a one-year planting total.',evidence:'“long-term care, rather than the number of trees planted in a single year.”',focus:'Conclusion'},
      {id:40,prompt:'What is the overall subject of the lecture?',answer:'urban trees',accepted:['the benefits of urban trees','trees in cities'],explanation:'The lecture explains environmental and community benefits of urban trees.',evidence:'“the role of urban trees in improving city environments.”',focus:'Main idea'}
    ]
  }
];
