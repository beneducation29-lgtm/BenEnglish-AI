import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import {
  sendConversationMessage,
  generateConversationSummary,
  ConversationResponseData,
} from '../services/api';
import { audioEngine, SpeechRecognitionSession, isSpeechRecognitionSupported } from '../services/speech';
import {
  TutorPersonaId,
  ConversationModeId,
  ConversationTurnRecord,
  ConversationSessionRecord,
  ConversationSummaryReport,
} from '../types';
import {
  Mic,
  Volume2,
  VolumeX,
  Sparkles,
  Send,
  RefreshCw,
  Award,
  ArrowRight,
  Clock,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Trash2,
  X,
  Sliders,
  ChevronRight,
  Flame,
  MessageSquare,
  History,
  Shield,
  Square,
  HelpCircle,
  Plus,
  Play,
  Pause,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface TutorPersonaConfig {
  id: TutorPersonaId;
  name: string;
  badge: string;
  role: string;
  description: string;
  avatar: string;
  voicePitch: number;
  voiceRate: number;
  voiceAccent: 'US' | 'GB';
  openingMessageHighSchool: string;
  openingMessageProfessional: string;
}

const TUTOR_PERSONAS: TutorPersonaConfig[] = [
  {
    id: 'friendly_teacher',
    name: 'Teacher Emma',
    badge: 'Friendly Teacher',
    role: 'Patient Academic Mentor',
    description: 'Supportive, patient, explains clearly, and celebrates small milestones.',
    avatar: '👩‍🏫',
    voicePitch: 1.05,
    voiceRate: 0.95,
    voiceAccent: 'US',
    openingMessageHighSchool:
      "Hello there! I'm Teacher Emma. How has your school day been going so far? Tell me about your favorite class or what you've been working on!",
    openingMessageProfessional:
      "Hello and welcome! I'm Teacher Emma. I'm here to help you practice English in a relaxed, encouraging environment. What would you like to chat about today?",
  },
  {
    id: 'strict_teacher',
    name: 'Mr. Harrison',
    badge: 'Strict Teacher',
    role: 'Rigorous British Grammarian',
    description: 'High standards, precise syntax, formal British phrasing, and immediate constructive corrections.',
    avatar: '👨‍🏫',
    voicePitch: 0.95,
    voiceRate: 0.92,
    voiceAccent: 'GB',
    openingMessageHighSchool:
      "Good day. I am Mr. Harrison. In our session today, we will focus on grammatical precision and academic vocabulary. What topic are you currently studying in your English curriculum?",
    openingMessageProfessional:
      "Good day. I am Mr. Harrison. Precision in spoken English is indispensable for professional credibility. Let us begin: summarize your primary workplace objective for this week.",
  },
  {
    id: 'native_partner',
    name: 'Alex (California)',
    badge: 'Native Partner',
    role: 'Casual American Peer',
    description: 'Authentic everyday conversational rhythm, natural idioms, relaxed slang, and cultural context.',
    avatar: '🧑‍💻',
    voicePitch: 1.0,
    voiceRate: 1.02,
    voiceAccent: 'US',
    openingMessageHighSchool:
      "Hey! What's up? I'm Alex. Always down to chat about campus life, weekend plans, music, or whatever's on your mind. How's everything going with you lately?",
    openingMessageProfessional:
      "Hey there! I'm Alex. Great to connect! Let's keep things natural and conversational. How's your week shaping up at work?",
  },
  {
    id: 'business_coach',
    name: 'Victoria Sloan',
    badge: 'Business Coach',
    role: 'Executive Workplace Strategist',
    description: 'Concise, high-impact workplace terminology, diplomacy, meeting facilitation, and negotiation.',
    avatar: '👩‍💼',
    voicePitch: 1.0,
    voiceRate: 0.98,
    voiceAccent: 'US',
    openingMessageHighSchool:
      "Welcome. I'm Victoria Sloan. Developing executive presence early will give you an immense competitive advantage. What leadership role or school project are you leading this term?",
    openingMessageProfessional:
      "Good day. I'm Victoria Sloan. In today's global enterprise, concise, diplomatic communication drives business results. Walk me through a recent stakeholder decision or project milestone you managed.",
  },
  {
    id: 'ielts_coach',
    name: 'Examiner David',
    badge: 'IELTS Coach',
    role: 'Official Speaking Examiner',
    description: 'Official Band 7.5+ scoring rubrics, discourse markers, lexical resource, and fluency drills.',
    avatar: '👨‍🎓',
    voicePitch: 0.95,
    voiceRate: 0.95,
    voiceAccent: 'GB',
    openingMessageHighSchool:
      "Good afternoon. I am Examiner David. In this session, we will simulate the IELTS Speaking test. Let's begin with Part 1: Could you tell me a little about the neighborhood or town where you currently live?",
    openingMessageProfessional:
      "Good afternoon. I am Examiner David. For candidates seeking Band 7.0 and above, topical coherence and idiomatic vocabulary are vital. Let's start with Part 1: What do you find most rewarding about your current occupation?",
  },
];

const CONVERSATION_MODES: { id: ConversationModeId; name: string; description: string; badge: string }[] = [
  { id: 'everyday', name: 'Everyday English', description: 'Casual daily life, hobbies, weekend plans, cultural topics', badge: 'Casual' },
  { id: 'school', name: 'High School English', description: 'Academic topics, school clubs, exams, campus life', badge: 'Academic' },
  { id: 'business', name: 'Professional English', description: 'Office meetings, project updates, cross-border teamwork', badge: 'Workplace' },
  { id: 'free', name: 'Free Conversation', description: 'Open spontaneous discussion on any topic you choose', badge: 'Open' },
  { id: 'ielts', name: 'IELTS Speaking', description: 'Structured Part 1, 2, and 3 examination simulation', badge: 'Test Prep' },
  { id: 'interview', name: 'Job Interview', description: 'Behavioral, situational, and competency STAR questions', badge: 'Career' },
];

export const ConversationRoomView: React.FC = () => {
  const { authUser } = useAuth();
  const {
    user,
    playbackSpeed,
    setPlaybackSpeed,
    audioFeedbackSound,
    saveConversationSession,
    deleteConversationSession,
    clearAllConversationHistory,
    addConversationMinutes,
    addVocabWord,
    setActiveTab,
  } = useApp();

  // Active persona and mode
  const [selectedPersonaId, setSelectedPersonaId] = useState<TutorPersonaId>(
    user.track === 'high_school' ? 'friendly_teacher' : 'business_coach'
  );
  const [selectedModeId, setSelectedModeId] = useState<ConversationModeId>(
    user.track === 'high_school' ? 'school' : 'business'
  );

  const activePersona =
    TUTOR_PERSONAS.find((p) => p.id === selectedPersonaId) || TUTOR_PERSONAS[0];

  // Conversation turns
  const [turns, setTurns] = useState<ConversationTurnRecord[]>([
    {
      id: 'init-turn',
      role: 'assistant',
      content:
        user.track === 'high_school'
          ? activePersona.openingMessageHighSchool
          : activePersona.openingMessageProfessional,
      timestamp: 'Just now',
      phoneticTip: "Focus on natural rhythm and pausing at punctuation boundaries.",
      suggestedReplies: [
        user.track === 'high_school'
          ? "I had a great chemistry lab today."
          : "We just finished our quarterly project sprint.",
        user.track === 'high_school'
          ? "Our school is preparing for sports week."
          : "I'm optimizing our team's cross-border workflows.",
      ],
    },
  ]);

  // Session state
  const [isSessionActive, setIsSessionActive] = useState(true);
  const [sessionStartTime, setSessionStartTime] = useState<number>(Date.now());
  const [sessionElapsedSeconds, setSessionElapsedSeconds] = useState(0);

  // Audio & Mic state
  const [hasMicSupport] = useState<boolean>(isSpeechRecognitionSupported());
  const [isHandsFreeMode, setIsHandsFreeMode] = useState(true); // Auto-continue listening
  const [isMuted, setIsMuted] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isAiResponding, setIsAiResponding] = useState(false);
  const [conversationError, setConversationError] = useState<string | null>(null);
  const [failedMessage, setFailedMessage] = useState<string | null>(null);
  const [failedTurnId, setFailedTurnId] = useState<string | null>(null);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [aiCaption, setAiCaption] = useState('');
  const [liveModeStatus, setLiveModeStatus] = useState<'off' | 'connecting' | 'connected' | 'listening' | 'speaking'>('off');
  const [liveModeError, setLiveModeError] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const [useAiTranscription, setUseAiTranscription] = useState(false);
  const [finalTranscript, setFinalTranscript] = useState('');
  const [inputText, setInputText] = useState('');

  // Drawers & Modals
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [showCorrectionsDrawer, setShowCorrectionsDrawer] = useState(false);
  const [summaryReportModal, setSummaryReportModal] = useState<ConversationSummaryReport | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [viewingPastSession, setViewingPastSession] = useState<ConversationSessionRecord | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const liveTranscriptRef = useRef('');
  const micSessionRef = useRef<SpeechRecognitionSession | null>(null);
  const autoSendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHandsFreeModeRef = useRef(isHandsFreeMode);
  const isSessionActiveRef = useRef(isSessionActive);
  const isAiRespondingRef = useRef(isAiResponding);
  const sendLockRef = useRef(false);
  const liveSessionRef = useRef<any>(null);
  const liveInputBufferRef = useRef('');
  const liveInputFinalRef = useRef(false);
  const liveInputTurnCompleteRef = useRef(false);
  const liveOutputBufferRef = useRef('');

  // Keep async speech callbacks synchronized with the latest React state.
  useEffect(() => { isHandsFreeModeRef.current = isHandsFreeMode; }, [isHandsFreeMode]);
  useEffect(() => { isSessionActiveRef.current = isSessionActive; }, [isSessionActive]);
  useEffect(() => { isAiRespondingRef.current = isAiResponding; }, [isAiResponding]);

  // Timer effect
  useEffect(() => {
    let timer: any = null;
    if (isSessionActive) {
      timer = setInterval(() => {
        setSessionElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isSessionActive]);

  // Scroll to bottom on new turn
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns, isAiResponding, liveTranscript]);

  // Stop audio and microphone on unmount without tying cleanup to every session state update.
  useEffect(() => {
    return () => {
      audioEngine.stop();
      void liveSessionRef.current?.close();
      liveSessionRef.current = null;
      micSessionRef.current?.stop();
      micSessionRef.current = null;
      if (autoSendTimerRef.current) clearTimeout(autoSendTimerRef.current);
    };
  }, []);

  // -------------------------------------------------------------
  // GEMINI LIVE: native, bidirectional audio conversation
  // -------------------------------------------------------------
  const stopGeminiLive = async () => {
    const session = liveSessionRef.current;
    liveSessionRef.current = null;
    if (session) await session.close();
    setLiveModeStatus('off');
    setIsRecording(false);
    setIsAiSpeaking(false);
    setAiCaption('');
    setLiveTranscript('');
    liveInputBufferRef.current = '';
    liveInputFinalRef.current = false;
    liveInputTurnCompleteRef.current = false;
    liveOutputBufferRef.current = '';
  };

  const startGeminiLive = async () => {
    if (!authUser) {
      setLiveModeError('Sign in with Google to use real-time AI voice conversation.');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setLiveModeError('Microphone streaming is not supported in this browser. Use the standard Speaking mode instead.');
      return;
    }
    setLiveModeError(null);
    liveInputBufferRef.current = '';
    liveInputFinalRef.current = false;
    liveInputTurnCompleteRef.current = false;
    liveOutputBufferRef.current = '';
    const { GeminiLiveSpeakingSession } = await import('../services/geminiLive');
    const live = new GeminiLiveSpeakingSession({
      onStatus: (status) => {
        if (status === 'connecting') setLiveModeStatus('connecting');
        if (status === 'connected' || status === 'listening') {
          setLiveModeStatus('listening');
          setIsRecording(true);
          setIsAiSpeaking(false);
          setConversationError(null);
        }
        if (status === 'speaking') {
          setLiveModeStatus('speaking');
          setIsRecording(false);
          setIsAiSpeaking(true);
        }
        if (status === 'closed') {
          setLiveModeStatus('off');
          setIsRecording(false);
          setIsAiSpeaking(false);
        }
      },
      onInputTranscript: (text, isFinal) => {
        if (!text) return;
        if (isFinal) {
          liveInputBufferRef.current = `${liveInputBufferRef.current} ${text}`.trim();
          liveInputFinalRef.current = true;
          setLiveTranscript(liveInputBufferRef.current);
          setFinalTranscript(liveInputBufferRef.current);
          if (liveInputTurnCompleteRef.current) {
            const transcript = liveInputBufferRef.current.trim();
            if (transcript) {
              setTurns((prev) => [...prev, {
                id: `live-user-${Date.now()}`,
                role: 'user',
                content: transcript,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              }]);
            }
            liveInputBufferRef.current = '';
            liveInputFinalRef.current = false;
            liveInputTurnCompleteRef.current = false;
            setLiveTranscript('');
            setFinalTranscript('');
          }
        } else {
          setLiveTranscript(`${liveInputBufferRef.current} ${text}`.trim());
        }
      },
      onInputTurnComplete: () => {
        liveInputTurnCompleteRef.current = true;
        if (!liveInputFinalRef.current) return;
        const transcript = liveInputBufferRef.current.trim();
        if (transcript) {
          setTurns((prev) => [...prev, {
            id: `live-user-${Date.now()}`,
            role: 'user',
            content: transcript,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }]);
        }
        liveInputBufferRef.current = '';
        liveInputFinalRef.current = false;
        liveInputTurnCompleteRef.current = false;
        setLiveTranscript('');
        setFinalTranscript('');
      },
      onOutputTranscript: (text, isFinal) => {
        if (text) {
          liveOutputBufferRef.current = `${liveOutputBufferRef.current} ${text}`.trim();
          setAiCaption(liveOutputBufferRef.current);
        }
        if (isFinal) {
          const transcript = liveOutputBufferRef.current.trim();
          if (transcript) {
            setTurns((prev) => [...prev, {
              id: `live-ai-${Date.now()}`,
              role: 'assistant',
              content: transcript,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            }]);
          }
          liveOutputBufferRef.current = '';
          setAiCaption('');
          setIsAiSpeaking(false);
        }
      },
      onError: (message) => {
        setLiveModeError(message);
        setConversationError(message);
      },
    });
    liveSessionRef.current = live;
    try {
      const idToken = await authUser.getIdToken();
      await live.connect(idToken, {
        persona: selectedPersonaId,
        mode: selectedModeId,
        level: user.cefrLevel,
        track: user.track,
      });
      live.sendText('Please greet me briefly as my selected English tutor and invite me to start speaking. Keep it natural and appropriate to my CEFR level.');
    } catch (error: any) {
      await live.close();
      if (liveSessionRef.current === live) liveSessionRef.current = null;
      setLiveModeStatus('off');
      setIsRecording(false);
      setLiveModeError(error?.message || 'Could not start real-time voice conversation.');
    }
  };

  // -------------------------------------------------------------
  // AI SPEECH SYNTHESIS ENGINE
  // -------------------------------------------------------------
  const speakAiReply = (text: string, onFinish?: () => void) => {
    if (isMuted) {
      onFinish?.();
      if (isHandsFreeModeRef.current && isSessionActiveRef.current) {
        window.setTimeout(() => startListening(), 350);
      }
      return;
    }

    setAiCaption('');
    setIsAiSpeaking(true);
    audioEngine.stop();

    // Select suitable voice based on persona accent
    const voices = audioEngine.getEnglishVoices();
    let preferredVoiceName: string | undefined = undefined;

    if (activePersona.voiceAccent === 'GB') {
      const gbVoice = voices.find(
        (v) => v.lang.startsWith('en-GB') || v.name.includes('UK') || v.name.includes('British') || v.name.includes('Daniel')
      );
      if (gbVoice) preferredVoiceName = gbVoice.name;
    } else {
      const usVoice = voices.find(
        (v) => v.lang.startsWith('en-US') || v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha')
      );
      if (usVoice) preferredVoiceName = usVoice.name;
    }

    audioEngine.speak(text, {
      rate: activePersona.voiceRate * playbackSpeed,
      pitch: activePersona.voicePitch,
      voiceName: preferredVoiceName,
      onBoundary: (charIndex) => {
        const nextWordEnd = text.indexOf(' ', charIndex + 1);
        setAiCaption(text.slice(0, nextWordEnd > -1 ? nextWordEnd : Math.min(text.length, charIndex + 36)));
      },
      onEnd: () => {
        setIsAiSpeaking(false);
        onFinish?.();
        // Hands-Free loop: automatically start listening again
        setAiCaption(text);
        if (isHandsFreeModeRef.current && isSessionActiveRef.current) {
          window.setTimeout(() => startListening(), 350);
        }
      },
      onError: () => {
        setIsAiSpeaking(false);
        setAiCaption('');
        onFinish?.();
        if (isHandsFreeModeRef.current && isSessionActiveRef.current) {
          window.setTimeout(() => startListening(), 350);
        }
      },
    });
  };

  // Interruption handler: User stops AI speech instantly
  const interruptAiSpeech = () => {
    audioEngine.stop();
    setIsAiSpeaking(false);
    setAiCaption('');
    startListening();
  };

  // -------------------------------------------------------------
  // SPEECH RECOGNITION (LISTENING)
  // -------------------------------------------------------------
  const startListening = () => {
    if (!hasMicSupport && !useAiTranscription) {
      setMicError('Speech recognition is not supported in this browser. Enable AI transcription or type your response instead.');
      return;
    }
    if (isAiRespondingRef.current) return;
    if (isAiSpeaking) {
      audioEngine.stop();
      setIsAiSpeaking(false);
    }
    if (micSessionRef.current?.active) return;

    setMicError(null);
    setLiveTranscript('');
    liveTranscriptRef.current = '';
    setFinalTranscript('');
    const session = new SpeechRecognitionSession(
      (state) => {
        liveTranscriptRef.current = state.transcript;
        setLiveTranscript(state.transcript);
        setFinalTranscript(state.finalTranscript);

        // In Hands-Free mode, submit after a natural pause once the browser
        // has confirmed at least one final speech segment. Interim words alone
        // never trigger a send, so short thinking pauses are less likely to cut
        // the learner off.
        if (autoSendTimerRef.current) clearTimeout(autoSendTimerRef.current);
        if (isHandsFreeModeRef.current && state.finalTranscript.trim().length >= 2) {
          autoSendTimerRef.current = setTimeout(() => {
            if (micSessionRef.current?.active) stopListeningAndSend();
          }, 1250);
        }
      },
      (err) => {
        setMicError(err);
        setIsRecording(false);
      },
      (active) => setIsRecording(active),
      undefined,
      { cloudTranscription: useAiTranscription }
    );
    micSessionRef.current = session;
    session.start();
  };

  const stopListeningAndSend = () => {
    if (autoSendTimerRef.current) {
      clearTimeout(autoSendTimerRef.current);
      autoSendTimerRef.current = null;
    }
    const session = micSessionRef.current;
    if (!session) {
      const fallbackText = inputText.trim();
      if (fallbackText) sendMessage(fallbackText);
      return;
    }

    session.stop((recognizedText) => {
      micSessionRef.current = null;
      setIsRecording(false);
      const messageText = recognizedText.trim() || liveTranscriptRef.current.trim() || inputText.trim();
      if (messageText) {
        sendMessage(messageText);
      } else {
        setMicError('I did not catch a complete phrase. Please try again or type your message.');
      }
      liveTranscriptRef.current = '';
      setLiveTranscript('');
      setFinalTranscript('');
      setInputText('');
    });
  };

  // -------------------------------------------------------------
  // SEND MESSAGE HANDLER
  // -------------------------------------------------------------
  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || sendLockRef.current || isAiRespondingRef.current) return;
    if (liveSessionRef.current && liveModeStatus !== 'off') {
      const content = messageText.trim();
      setTurns((prev) => [...prev, { id: `live-text-${Date.now()}`, role: 'user', content, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
      liveSessionRef.current.sendText(content);
      setInputText('');
      return;
    }
    sendLockRef.current = true;
    isAiRespondingRef.current = true;

    // User Turn
    const userTurn: ConversationTurnRecord = {
      id: `turn-u-${Date.now()}`,
      role: 'user',
      content: messageText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    if (micSessionRef.current?.active) micSessionRef.current.stop();
    micSessionRef.current = null;
    setTurns((prev) => [...prev, userTurn]);
    setInputText('');
    setLiveTranscript('');
    liveTranscriptRef.current = '';
    setFinalTranscript('');
    setMicError(null);
    setConversationError(null);
    setFailedMessage(null);
    setFailedTurnId(null);
    setIsAiResponding(true);

    try {
      // Build history for backend API
      // The first assistant turn is a locally-authored greeting, not a
      // Gemini response. Sending it as the first model turn can invalidate
      // provider chat history. Keep only real alternating turns and let the
      // current learner message be the final user content below.
      const historyPayload = turns
        .filter((turn) => turn.id !== 'init-turn')
        .slice(-8)
        .map((turn) => ({ role: turn.role, content: turn.content }))
        .filter((turn, index, items) => index > 0 || turn.role === 'user')
        .filter((turn, index, items) => index === 0 || turn.role !== items[index - 1].role);

      const response: ConversationResponseData = await sendConversationMessage({
        message: messageText.trim(),
        history: historyPayload,
        tutorPersona: selectedPersonaId,
        mode: selectedModeId,
        track: user.track,
        userLevel: user.cefrLevel,
        occupation: user.track === 'high_school' ? user.grade : user.occupation,
        learnerMemory: {
          placementLevel: user.placementAssessment?.overallLevel || user.cefrLevel,
          skillLevels: user.placementAssessment?.skills
            ? Object.fromEntries(Object.entries(user.placementAssessment.skills).map(([skill, result]) => [skill, result.level]))
            : {},
          priorities: [
            ...(user.placementAssessment?.priorities || []),
            ...(user.conversationProgress?.savedSessions || []).slice(0, 2)
              .flatMap(session => session.summaryReport?.improvementSuggestions || []),
          ].slice(0, 5),
          recurringErrors: [
            ...(user.conversationProgress?.savedSessions || []).slice(0, 3)
              .flatMap(session => (session.summaryReport?.grammarMistakes || []).map(item => `${item.userSaid} → ${item.correction}`)),
            ...(user.listeningProgress?.misunderstoodVocab || []).slice(0, 4)
              .map(item => `Listening vocabulary: ${item.word} (missed ${item.count} times)`),
          ].slice(0, 5),
          recentSessionNotes: (user.conversationProgress?.savedSessions || []).slice(0, 3)
            .map(session => session.summaryReport?.summary || '')
            .filter(Boolean),
        },
      });

      // AI Turn
      const aiTurn: ConversationTurnRecord = {
        id: `turn-ai-${Date.now()}`,
        role: 'assistant',
        content: response.replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        phoneticTip: response.phoneticTip,
        correction: response.correction?.hasMistake ? response.correction : undefined,
        suggestedReplies: response.suggestedUserReplies || [],
      };

      setTurns((prev) => [...prev, aiTurn]);
      setFailedMessage(null);
      setFailedTurnId(null);
      setIsAiResponding(false);
      isAiRespondingRef.current = false;
      sendLockRef.current = false;

      // Play AI voice
      speakAiReply(response.replyText);
    } catch (e: any) {
      console.error('Conversation API unavailable', e);
      setIsAiResponding(false);
      isAiRespondingRef.current = false;
      sendLockRef.current = false;
      setFailedMessage(messageText.trim());
      setFailedTurnId(userTurn.id);
      const detail = typeof e?.message === 'string' && e.message.trim()
        ? e.message.trim()
        : 'Không nhận được phản hồi từ AI.';
      setConversationError(`AI chưa thể phản hồi: ${detail}. Tin nhắn của bạn vẫn được giữ lại.`);
    }
  };

  const retryFailedMessage = () => {
    if (!failedMessage || sendLockRef.current || isAiRespondingRef.current) return;
    const message = failedMessage;
    const failedId = failedTurnId;
    if (failedId) setTurns((prev) => prev.filter((turn) => turn.id !== failedId));
    setFailedMessage(null);
    setFailedTurnId(null);
    setConversationError(null);
    void sendMessage(message);
  };

  // -------------------------------------------------------------
  // END SESSION & GENERATE SUMMARY REPORT
  // -------------------------------------------------------------
  const endCurrentSession = async () => {
    audioEngine.stop();
    await stopGeminiLive();
    if (micSessionRef.current) micSessionRef.current.stop();
    micSessionRef.current = null;
    setIsRecording(false);
    setIsAiSpeaking(false);
    setIsSessionActive(false);
    isSessionActiveRef.current = false;
    setIsGeneratingSummary(true);

    const durationMins = Math.max(1, Math.round(sessionElapsedSeconds / 60));

    try {
      const summaryData = await generateConversationSummary({
        history: turns.map((t) => ({ role: t.role, content: t.content })),
        persona: activePersona.name,
        mode: selectedModeId,
        track: user.track,
        userLevel: user.cefrLevel,
      });

      setSummaryReportModal(summaryData);
      audioFeedbackSound();
      confetti({ particleCount: 45, spread: 60 });

      // Save session in persistent history
      const sessionRecord: ConversationSessionRecord = {
        id: `conv-sess-${Date.now()}`,
        title: `${activePersona.name} • ${CONVERSATION_MODES.find((m) => m.id === selectedModeId)?.name || 'English Chat'}`,
        startedAt: 'Just now',
        durationMinutes: durationMins,
        personaId: selectedPersonaId,
        modeId: selectedModeId,
        turns: [...turns],
        summaryReport: summaryData,
      };

      saveConversationSession(sessionRecord);
      addConversationMinutes(durationMins);
    } catch (e: any) {
      console.warn('Summary generation error, using fallback report', e);
      const fallbackSummary: ConversationSummaryReport = {
        summary: 'The conversation was saved, but the AI diagnostic report could not be generated. No vocabulary, grammar, fluency, or pronunciation findings have been invented.',
        newVocabulary: [],
        grammarMistakes: [],
        pronunciationObservations: [],
        strongPoints: [],
        improvementSuggestions: [
          'Try generating the session report again when the AI service is available.',
          'This room stores speech-to-text transcripts only; pronunciation and accent cannot be assessed from transcript text.',
        ],
        recommendedPractice: {
          lab: 'speaking',
          title: 'Continue a short English conversation',
          targetFocus: 'Build another transcript sample; no diagnostic score is available for this session.',
        },
      };

      setSummaryReportModal(fallbackSummary);
      const sessionRecord: ConversationSessionRecord = {
        id: `conv-sess-${Date.now()}`,
        title: `${activePersona.name} • Spoken Session`,
        startedAt: 'Just now',
        durationMinutes: durationMins,
        personaId: selectedPersonaId,
        modeId: selectedModeId,
        turns: [...turns],
        summaryReport: fallbackSummary,
      };
      saveConversationSession(sessionRecord);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  // Start a fresh new session
  const startNewSession = (persona: TutorPersonaId, mode: ConversationModeId) => {
    audioEngine.stop();
    void stopGeminiLive();
    setSelectedPersonaId(persona);
    setSelectedModeId(mode);

    const targetPersona = TUTOR_PERSONAS.find((p) => p.id === persona) || TUTOR_PERSONAS[0];
    const initialGreeting =
      user.track === 'high_school'
        ? targetPersona.openingMessageHighSchool
        : targetPersona.openingMessageProfessional;

    setTurns([
      {
        id: `init-${Date.now()}`,
        role: 'assistant',
        content: initialGreeting,
        timestamp: 'Just now',
        phoneticTip: "Focus on clear enunciation and natural rhythm.",
      },
    ]);

    setSessionElapsedSeconds(0);
    setIsSessionActive(true);
    isSessionActiveRef.current = true;
    isAiRespondingRef.current = false;
    sendLockRef.current = false;
    setIsAiResponding(false);
    setIsAiSpeaking(false);
    setAiCaption('');
    if (autoSendTimerRef.current) {
      clearTimeout(autoSendTimerRef.current);
      autoSendTimerRef.current = null;
    }
    micSessionRef.current?.stop();
    micSessionRef.current = null;
    setIsRecording(false);
    setSummaryReportModal(null);
    setViewingPastSession(null);

    // Speak initial greeting
    setTimeout(() => {
      speakAiReply(initialGreeting);
    }, 400);
  };

  // Extract all corrections across the current session
  const sessionCorrections = turns
    .filter((t) => t.correction && t.correction.hasMistake)
    .map((t) => t.correction!);

  const pastSessions = user.conversationProgress?.savedSessions || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* --------------------------------------------------------- */}
      {/* 1. ROOM CONTROLS & STATUS BAR                             */}
      {/* --------------------------------------------------------- */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 md:p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Persona & Mode Badge */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-2xl shadow-xs shrink-0">
              {activePersona.avatar}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base md:text-lg font-extrabold text-slate-900">
                  {activePersona.name}
                </h2>
                <span className="text-[10px] font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded">
                  {activePersona.badge}
                </span>
                <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  {CONVERSATION_MODES.find((m) => m.id === selectedModeId)?.name}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                {activePersona.role} • {activePersona.description}
              </p>
            </div>
          </div>

          {/* Quick Controls: Hands-Free, Mute, History, End Session */}
          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            {/* Live Session Timer */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-mono font-bold text-slate-800">
              <Clock className="w-3.5 h-3.5 text-teal-600" />
              <span>
                {Math.floor(sessionElapsedSeconds / 60)}:
                {(sessionElapsedSeconds % 60).toString().padStart(2, '0')}
              </span>
            </div>

            {/* Hands-Free Voice Mode Toggle */}
            <button
              onClick={() => {
                const next = !isHandsFreeMode;
                isHandsFreeModeRef.current = next;
                setIsHandsFreeMode(next);
                if (!next && autoSendTimerRef.current) {
                  clearTimeout(autoSendTimerRef.current);
                  autoSendTimerRef.current = null;
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                isHandsFreeMode
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              title="Continuous Hands-Free voice turn-taking"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Hands-Free {isHandsFreeMode ? 'ON' : 'OFF'}</span>
            </button>

            <button
              onClick={() => liveModeStatus === 'off' ? void startGeminiLive() : void stopGeminiLive()}
              disabled={liveModeStatus === 'connecting'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all disabled:opacity-60 ${
                liveModeStatus !== 'off'
                  ? 'bg-violet-600 text-white border-violet-500'
                  : 'bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100'
              }`}
              title="Gemini Live: natural, bidirectional voice conversation"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>{liveModeStatus === 'connecting' ? 'Connecting Live…' : liveModeStatus === 'off' ? 'Live Voice' : 'Stop Live'}</span>
            </button>

            {/* Mute Toggle */}
            <button
              onClick={() => {
                if (!isMuted) audioEngine.stop();
                setIsMuted(!isMuted);
              }}
              className={`p-2 rounded-xl text-xs font-semibold border transition-colors ${
                isMuted
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
              }`}
              title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Corrections Review Drawer Toggle */}
            <button
              onClick={() => setShowCorrectionsDrawer(!showCorrectionsDrawer)}
              className="relative p-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 transition-colors"
              title="Review Corrections in Current Session"
            >
              <AlertCircle className="w-4 h-4" />
              {sessionCorrections.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] font-bold flex items-center justify-center">
                  {sessionCorrections.length}
                </span>
              )}
            </button>

            {/* History Drawer Toggle */}
            <button
              onClick={() => setShowHistoryDrawer(!showHistoryDrawer)}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 transition-colors"
              title="Past Saved Conversations"
            >
              <History className="w-4 h-4" />
            </button>

            {/* End Conversation Button */}
            {isSessionActive ? (
              <button
                disabled={isGeneratingSummary}
                onClick={endCurrentSession}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                <Square className="w-3.5 h-3.5 fill-white" />
                <span>End & Report</span>
              </button>
            ) : (
              <button
                onClick={() => startNewSession(selectedPersonaId, selectedModeId)}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>New Session</span>
              </button>
            )}
          </div>
        </div>

        {/* Persona & Mode Quick Switch Strip */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
            <span className="text-slate-400 font-semibold mr-1 shrink-0">Tutor:</span>
            {TUTOR_PERSONAS.map((persona) => {
              const isSelected = selectedPersonaId === persona.id;
              return (
                <button
                  key={persona.id}
                  onClick={() => startNewSession(persona.id, selectedModeId)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/70'
                  }`}
                >
                  <span>{persona.avatar}</span>
                  <span>{persona.name.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-semibold shrink-0">Mode:</span>
            <select
              value={selectedModeId}
              onChange={(e) =>
                startNewSession(selectedPersonaId, e.target.value as ConversationModeId)
              }
              className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 rounded-xl px-2.5 py-1.5 outline-none cursor-pointer"
            >
              {CONVERSATION_MODES.map((mode) => (
                <option key={mode.id} value={mode.id}>
                  {mode.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* --------------------------------------------------------- */}
      {/* 2. REAL-TIME WAVEFORM & INTERACTION BANNER                */}
      {/* --------------------------------------------------------- */}
      <div className="bg-slate-900 text-white rounded-3xl p-5 md:p-6 shadow-md relative overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-56 h-56 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          {/* Avatar with Status Ring */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div
                className={`w-16 h-16 rounded-2xl bg-slate-800 border-2 flex items-center justify-center text-3xl shadow-inner transition-all ${
                  isAiSpeaking
                    ? 'border-teal-400 ring-4 ring-teal-500/20 scale-105'
                    : isRecording
                    ? 'border-emerald-400 ring-4 ring-emerald-500/20 scale-105'
                    : isAiResponding
                    ? 'border-amber-400 ring-4 ring-amber-500/20 animate-pulse'
                    : 'border-slate-700'
                }`}
              >
                {activePersona.avatar}
              </div>

              {/* Status Dot */}
              <div
                className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-900 flex items-center justify-center ${
                  isAiSpeaking
                    ? 'bg-teal-400'
                    : isRecording
                    ? 'bg-emerald-400 animate-ping'
                    : isAiResponding
                    ? 'bg-amber-400'
                    : 'bg-slate-500'
                }`}
              />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-teal-400">
                  {isAiSpeaking
                    ? `${activePersona.name} is Speaking...`
                    : isRecording
                    ? 'Listening to You...'
                    : isAiResponding
                    ? 'Formulating Response...'
                    : 'Ready to Converse'}
                </span>
                {isHandsFreeMode && (
                  <span className="text-[10px] font-semibold text-teal-300 bg-teal-950/80 border border-teal-800/80 px-2 py-0.5 rounded-full">
                    Hands-Free Active
                  </span>
                )}
              </div>
              <h3 className="text-lg font-extrabold mt-0.5">{activePersona.name}</h3>
              {isAiSpeaking && aiCaption && (
                <p aria-live="off" className="mt-1 max-w-xl text-[11px] leading-relaxed text-teal-100 line-clamp-2">{aiCaption}</p>
              )}
              <p className="text-xs text-slate-400">
                {isRecording
                  ? 'Speak naturally at standard cadence'
                  : isAiSpeaking
                  ? (liveModeStatus !== 'off' ? 'Speak naturally to interrupt the AI' : 'Tap "Interrupt" or start speaking to cut in')
                  : 'Tap the microphone or say something to begin'}
              </p>
            </div>
          </div>

          {/* Voice activity indicator: animated status only, not measured microphone amplitude. */}
          <div className="flex items-center gap-3">
            <div aria-label={isRecording ? 'Microphone is active' : isAiSpeaking ? 'AI voice is playing' : 'Voice activity idle'} className="flex items-center gap-1.5 h-12 px-4 py-2 rounded-2xl bg-slate-800/80 border border-slate-700/80">
              {Array.from({ length: 18 }, (_, idx) => idx).map((idx) => (
                <div
                  key={idx}
                  className={`w-1 rounded-full ${
                    isAiSpeaking
                      ? 'bg-teal-400 animate-pulse'
                      : isRecording
                      ? 'bg-emerald-400 animate-pulse'
                      : 'bg-slate-600'
                  }`}
                  style={{ height: `${10 + (idx % 5) * 5}px`, animationDelay: `${idx * 35}ms` }}
                />
              ))}
            </div>

            <label className="flex items-start gap-2 max-w-[190px] text-[11px] leading-snug text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={useAiTranscription}
                disabled={isRecording}
                onChange={(event) => setUseAiTranscription(event.target.checked)}
                className="mt-0.5 accent-teal-500"
              />
              <span>
                <span className="block font-semibold text-slate-200">AI transcription</span>
                <span className="block text-slate-400">Sends this recording to AI for a second transcript.</span>
              </span>
            </label>

            {/* Interruption Button when AI is speaking */}
            {isAiSpeaking && liveModeStatus === 'off' && (
              <button
                onClick={interruptAiSpeech}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/40 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Pause className="w-3.5 h-3.5" />
                <span>Interrupt AI</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {liveModeError && (
        <div role="status" className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-xs text-violet-900 flex items-start justify-between gap-3">
          <span>{liveModeError}</span>
          <button onClick={() => setLiveModeError(null)} aria-label="Dismiss Live mode error"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* --------------------------------------------------------- */}
      {/* 3. CONVERSATION TRANSCRIPT & INLINE CORRECTIONS           */}
      {/* --------------------------------------------------------- */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm flex flex-col h-[520px]">
        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {turns.map((turn) => {
            const isUser = turn.role === 'user';
            return (
              <div
                key={turn.id}
                className={`flex gap-3 max-w-2xl ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                {/* Avatar Icon */}
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-sm shadow-xs ${
                    isUser
                      ? 'bg-teal-600 text-white font-bold'
                      : 'bg-slate-900 text-white text-base'
                  }`}
                >
                  {isUser ? 'You' : activePersona.avatar}
                </div>

                <div className="space-y-2 max-w-xl">
                  {/* Speech Bubble */}
                  <div
                    className={`p-4 rounded-2xl text-xs md:text-sm leading-relaxed ${
                      isUser
                        ? 'bg-teal-600 text-white rounded-tr-none shadow-xs font-medium'
                        : 'bg-slate-50 border border-slate-200/90 text-slate-900 rounded-tl-none shadow-xs'
                    }`}
                  >
                    <p>{turn.content}</p>

                    {/* AI Phonetic / Intonation Tip */}
                    {!isUser && turn.phoneticTip && (
                      <div className="mt-2.5 pt-2 border-t border-slate-200/70 text-[11px] text-teal-800 flex items-center gap-1.5 font-medium">
                        <Sparkles className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                        <span>{turn.phoneticTip}</span>
                      </div>
                    )}
                  </div>

                  {/* Inline Intelligent Correction Card (if user made an error) */}
                  {!isUser && turn.correction && turn.correction.hasMistake && (
                    <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-xs space-y-1.5 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-900 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                          Gentle Language Polish:
                        </span>
                        <button
                          onClick={() =>
                            audioEngine.speak(turn.correction!.improved, { rate: 0.9 })
                          }
                          className="text-[11px] font-semibold text-amber-800 hover:text-amber-950 flex items-center gap-1 underline"
                        >
                          <Volume2 className="w-3 h-3" />
                          <span>Listen Model</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-rose-700 line-through">
                          {turn.correction.original}
                        </span>
                        <span className="text-slate-400">→</span>
                        <span className="text-emerald-700 font-bold">
                          {turn.correction.improved}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-700">{turn.correction.explanation}</p>
                      {turn.correction.vietnameseTip && (
                        <p className="text-[10px] text-amber-800 italic">
                          💡 {turn.correction.vietnameseTip}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Replay Button & Timestamp */}
                  <div className={`flex items-center gap-2 text-[10px] text-slate-400 ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <span>{turn.timestamp}</span>
                    {!isUser && (
                      <button
                        onClick={() => speakAiReply(turn.content)}
                        className="text-slate-500 hover:text-teal-700 flex items-center gap-0.5 font-medium"
                      >
                        <Volume2 className="w-3 h-3" />
                        <span>Replay Voice</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Live Recording Stream Preview */}
          {(isRecording || liveTranscript) && (
            <div className="flex gap-3 max-w-2xl ml-auto flex-row-reverse">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 text-xs font-bold">
                You
              </div>
              <div className="min-w-0 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs md:text-sm text-emerald-900 rounded-tr-none shadow-xs">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="text-[10px] text-emerald-700 font-bold uppercase">
                    {isRecording ? 'Listening · live transcript' : 'Recognized speech'}
                  </span>
                  {finalTranscript && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-semibold text-emerald-800">Confirmed words</span>}
                </div>
                <p aria-live="polite" aria-atomic="true" className="break-words">
                  {finalTranscript && <span>{finalTranscript}</span>}
                  {liveTranscript.replace(finalTranscript, '').trim() && (
                    <span className="italic text-emerald-700/70"> {liveTranscript.replace(finalTranscript, '').trim()}</span>
                  )}
                  {!liveTranscript && <span className="text-emerald-700/70">Speak naturally. Your words will appear here.</span>}
                </p>
                <p className="mt-2 text-[10px] text-emerald-700/70">Speech-to-text transcript only · no pronunciation score is inferred.</p>
              </div>
            </div>
          )}

          {/* AI Responding Spinner */}
          {isAiResponding && (
            <div className="flex gap-3 max-w-md mr-auto">
              <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
                {activePersona.avatar}
              </div>
              <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-teal-600" />
                <span>{activePersona.name} is formulating response...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Quick Replies Strip */}
        {turns.length > 0 &&
          turns[turns.length - 1].suggestedReplies &&
          turns[turns.length - 1].suggestedReplies!.length > 0 &&
          !isAiResponding && (
            <div className="px-4 md:px-6 py-2.5 bg-slate-50 border-t border-slate-200/80 flex items-center gap-2 overflow-x-auto scrollbar-none text-xs">
              <span className="text-slate-400 font-medium shrink-0">Suggestions:</span>
              {turns[turns.length - 1].suggestedReplies!.map((reply, rIdx) => (
                <button
                  key={rIdx}
                  onClick={() => sendMessage(reply)}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-300 text-slate-700 hover:text-teal-900 whitespace-nowrap shrink-0 transition-colors font-medium shadow-2xs"
                >
                  "{reply}"
                </button>
              ))}
            </div>
          )}

        {/* --------------------------------------------------------- */}
        {conversationError && (
          <div role="alert" className="mx-4 mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <span className="min-w-0 flex-1">{conversationError}</span>
            {failedMessage && (
              <button
                type="button"
                onClick={retryFailedMessage}
                disabled={isAiResponding}
                className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-amber-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-amber-800 disabled:opacity-50"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Thử gửi lại
              </button>
            )}
          </div>
        )}
        {micError && <div role="alert" className="mx-4 mb-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800">{micError}</div>}

        {/* 4. BOTTOM INTERACTION BAR: MIC & TEXT FALLBACK            */}
        {/* --------------------------------------------------------- */}
        <div className="p-4 bg-white border-t border-slate-200 rounded-b-3xl">
          <div className="flex items-center gap-2">
            {/* Primary Voice Mic Button */}
            <button
              onClick={isRecording ? stopListeningAndSend : liveTranscript.trim() ? () => sendMessage(liveTranscript.trim()) : startListening}
              disabled={isAiResponding}
              className={`min-w-[54px] h-[54px] rounded-2xl flex items-center justify-center transition-all shadow-md shrink-0 active:scale-95 ${
                isRecording
                  ? 'bg-rose-600 text-white ring-4 ring-rose-500/20 animate-pulse'
                  : 'bg-teal-600 hover:bg-teal-500 text-white'
              }`}
              title={isRecording ? (isHandsFreeMode ? 'Send now, or pause naturally to send automatically' : 'Finish speaking and send') : liveTranscript.trim() ? 'Send recognized speech' : 'Start English speech recognition'}
            >
              {isRecording ? <Square className="w-5 h-5 fill-white" /> : liveTranscript.trim() ? <Send className="w-5 h-5" /> : <Mic className="w-6 h-6" />}
            </button>

            {/* Text Input Fallback */}
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage(inputText)}
              placeholder={
                isRecording
                  ? (isHandsFreeMode ? 'Listening… pause briefly after your sentence and AI will reply automatically.' : 'Listening to your speech... (tap square to finish and send)')
                  : 'Speak through microphone or type your message here...'
              }
              className="flex-1 p-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs md:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />

            {/* Send Button */}
            <button
              onClick={() => sendMessage(inputText)}
              disabled={!inputText.trim() || isAiResponding}
              className="p-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white transition-colors shrink-0"
              title="Send text message"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 5. MODAL: END-OF-SESSION DIAGNOSTIC SUMMARY REPORT        */}
      {/* ========================================================= */}
      {summaryReportModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 md:p-8 shadow-2xl border border-slate-100 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
                  <Award className="w-4 h-4" />
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-teal-700">
                  Conversation Session Diagnostic Report
                </span>
              </div>
              <button
                onClick={() => setSummaryReportModal(null)}
                className="text-slate-400 hover:text-slate-700 font-bold text-sm"
              >
                ✕ Close
              </button>
            </div>

            {/* Overview Banner */}
            <div className="p-5 rounded-2xl bg-teal-50/60 border border-teal-200 space-y-2">
              <h3 className="text-lg font-extrabold text-slate-900">Session Completed!</h3>
              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                {summaryReportModal.summary}
              </p>
            </div>

            {/* Key Vocabulary Discovered */}
            {summaryReportModal.newVocabulary?.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
                  <BookOpen className="w-4 h-4 text-teal-600" />
                  Key Vocabulary from this Dialogue:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {summaryReportModal.newVocabulary.map((voc, vIdx) => (
                    <div
                      key={vIdx}
                      className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-slate-900 text-sm">{voc.word}</span>
                          <span className="font-mono text-[11px] text-slate-400">{voc.ipa}</span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-1">{voc.definition}</p>
                        <p className="text-[11px] text-teal-800 font-semibold italic">
                          Nghĩa: {voc.meaningVi}
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          addVocabWord({
                            id: `voc-${Date.now()}-${vIdx}`,
                            word: voc.word,
                            ipa: voc.ipa,
                            pos: 'word',
                            meaningVi: voc.meaningVi,
                            definitionEn: voc.definition,
                            exampleEn: `Used in conversation with ${activePersona.name}`,
                            exampleVi: 'Sử dụng trong buổi đàm thoại thực tế',
                            cefrLevel: user.cefrLevel,
                            topic: selectedModeId,
                            track: user.track,
                            masteryLevel: 1,
                          });
                          audioFeedbackSound();
                        }}
                        className="mt-2 text-[10px] font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add to Personal Vocabulary Bank</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Grammar Mistakes & Explanations */}
            {summaryReportModal.grammarMistakes?.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  Targeted Grammar Corrections:
                </h4>
                <div className="space-y-2">
                  {summaryReportModal.grammarMistakes.map((gm, gIdx) => (
                    <div
                      key={gIdx}
                      className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs space-y-1"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-rose-700 line-through font-medium">{gm.userSaid}</span>
                        <span className="text-slate-400">→</span>
                        <span className="text-emerald-700 font-bold">{gm.correction}</span>
                      </div>
                      <p className="text-slate-700">{gm.rule}</p>
                      <p className="text-[11px] text-amber-800 italic">
                        💡 {gm.vietnameseExplanation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {summaryReportModal.personalizedExercise && (
              <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 space-y-3">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-amber-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" /> Your Personal Speaking Drill
                </h4>
                <p className="text-sm font-semibold text-slate-900">{summaryReportModal.personalizedExercise.prompt}</p>
                <p className="text-xs text-amber-900">Focus: {summaryReportModal.personalizedExercise.focus}</p>
                {summaryReportModal.personalizedExercise.targetPhrases?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {summaryReportModal.personalizedExercise.targetPhrases.map((phrase, index) => (
                      <span key={index} className="rounded-full bg-white border border-amber-200 px-3 py-1 text-[11px] font-semibold text-amber-900">{phrase}</span>
                    ))}
                  </div>
                )}
                <div className="rounded-xl bg-white/80 border border-amber-100 p-3">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Model answer</span>
                  <p className="text-xs leading-relaxed text-slate-800">{summaryReportModal.personalizedExercise.modelAnswer}</p>
                </div>
                <button
                  onClick={() => {
                    setSummaryReportModal(null);
                    startNewSession(selectedPersonaId, 'free');
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold"
                >
                  Practise this in a new conversation
                </button>
              </div>
            )}

            {/* Strengths & Observations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1.5">
                <span className="font-bold text-emerald-900 block flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Demonstrated Strengths:
                </span>
                {summaryReportModal.strongPoints.map((sp, sIdx) => (
                  <p key={sIdx} className="text-emerald-800 leading-relaxed">
                    ✓ {sp}
                  </p>
                ))}
              </div>

              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 space-y-1.5">
                <span className="font-bold text-blue-900 block flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  Pronunciation & Intonation Notes:
                </span>
                {summaryReportModal.pronunciationObservations.map((po, pIdx) => (
                  <p key={pIdx} className="text-blue-800 leading-relaxed">
                    • {po}
                  </p>
                ))}
              </div>
            </div>

            {/* Recommended Next Practice */}
            {summaryReportModal.recommendedPractice && (
              <div className="p-4 rounded-2xl bg-slate-900 text-white flex items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400 block">
                    Recommended Next Practice
                  </span>
                  <h5 className="text-sm font-extrabold mt-0.5">
                    {summaryReportModal.recommendedPractice.title}
                  </h5>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Focus: {summaryReportModal.recommendedPractice.targetFocus}
                  </p>
                </div>

                <button
                  onClick={() => {
                    setSummaryReportModal(null);
                    setActiveTab(summaryReportModal.recommendedPractice.lab as any);
                  }}
                  className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-900 font-extrabold text-xs shrink-0 transition-colors flex items-center gap-1.5"
                >
                  <span>Go to Practice</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 6. DRAWER: CORRECTIONS REVIEW DRAWER                      */}
      {/* ========================================================= */}
      {showCorrectionsDrawer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in">
          <div className="bg-white w-full max-w-md h-full p-6 shadow-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Session Corrections ({sessionCorrections.length})
                  </h3>
                </div>
                <button
                  onClick={() => setShowCorrectionsDrawer(false)}
                  className="text-slate-400 hover:text-slate-700 font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="mt-4 space-y-3 overflow-y-auto max-h-[75vh] pr-1">
                {sessionCorrections.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    <span>No errors detected so far! Keep speaking naturally.</span>
                  </div>
                ) : (
                  sessionCorrections.map((corr, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-rose-700 line-through font-medium">
                          {corr.original}
                        </span>
                        <span className="text-slate-400">→</span>
                        <span className="text-emerald-700 font-bold">{corr.improved}</span>
                      </div>
                      <p className="text-slate-600">{corr.explanation}</p>
                      {corr.vietnameseTip && (
                        <p className="text-[11px] text-amber-800 italic">
                          💡 {corr.vietnameseTip}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            <button
              onClick={() => setShowCorrectionsDrawer(false)}
              className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold"
            >
              Back to Conversation
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 7. DRAWER: PAST SESSIONS & PRIVACY MANAGEMENT             */}
      {/* ========================================================= */}
      {showHistoryDrawer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in">
          <div className="bg-white w-full max-w-md h-full p-6 shadow-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-slate-700" />
                  <h3 className="font-extrabold text-slate-900 text-base">Conversation History</h3>
                </div>
                <button
                  onClick={() => setShowHistoryDrawer(false)}
                  className="text-slate-400 hover:text-slate-700 font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Data Privacy Notice */}
              <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 flex items-start gap-2">
                <Shield className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                <span>
                  All dialogue is stored locally on your device for learning recall. You can remove individual sessions or wipe all logs below.
                </span>
              </div>

              {/* Saved Sessions List */}
              <div className="mt-4 space-y-3 overflow-y-auto max-h-[65vh] pr-1">
                {pastSessions.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    No past sessions found. Completed sessions will be archived here.
                  </div>
                ) : (
                  pastSessions.map((sess) => (
                    <div
                      key={sess.id}
                      className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-slate-900">{sess.title}</span>
                        <button
                          onClick={() => deleteConversationSession(sess.id)}
                          className="text-slate-400 hover:text-rose-600 transition-colors"
                          title="Delete this session"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        <span>{sess.startedAt}</span>
                        <span>•</span>
                        <span>{sess.durationMinutes} mins</span>
                        <span>•</span>
                        <span>{sess.turns.length} turns</span>
                      </div>

                      {sess.summaryReport && (
                        <p className="text-[11px] text-slate-600 line-clamp-2 italic">
                          "{sess.summaryReport.summary}"
                        </p>
                      )}

                      <button
                        onClick={() => {
                          setTurns(sess.turns);
                          setShowHistoryDrawer(false);
                          if (sess.summaryReport) {
                            setSummaryReportModal(sess.summaryReport);
                          }
                        }}
                        className="text-[11px] font-bold text-teal-700 hover:underline flex items-center gap-1"
                      >
                        <span>Review Transcript & Report</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Clear All History Button (Privacy Requirement) */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                disabled={pastSessions.length === 0}
                onClick={() => {
                  if (confirm('Clear all conversation history? This cannot be undone.')) {
                    clearAllConversationHistory();
                  }
                }}
                className="text-xs font-semibold text-rose-600 hover:text-rose-800 disabled:opacity-30 flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete All History</span>
              </button>

              <button
                onClick={() => setShowHistoryDrawer(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
