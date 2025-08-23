import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { X, Minimize2, RotateCcw } from 'lucide-react';
import { ChatBubble } from './ChatBubble';
import { ChatInput } from './ChatInput';
import { ChatMessage, InsuranceData, PredictionResponse } from '../types/insurance';
import { insuranceQuestions } from '../data/questions';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
// import { cn } from '../lib/utils';
// ElevenLabs TTS now proxied via backend; no direct client import needed

interface ChatWindowProps {
  isOpen: boolean;
  onClose: () => void;
  onMinimize: () => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ isOpen, onClose, onMinimize }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [insuranceData, setInsuranceData] = useState<Partial<InsuranceData>>({ ID: 1 });
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isBotTyping = messages.some(m => m.sender === 'bot' && m.isTyping);
  const { t } = useTranslation();
  const { isAuthenticated, register } = useAuth();
  const navigate = useNavigate();
  // Voice (TTS) state
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const voiceIdRef = useRef<string>('JBFqnCBsd6RMkjVDRZzb');
  const modelIdRef = useRef<string>('eleven_multilingual_v2');
  const outputFormatRef = useRef<'mp3_44100_128'>('mp3_44100_128');
  const spokenIds = useRef<Set<string>>(new Set());
  // ElevenLabs fallback link state
  const [voiceFallback, setVoiceFallback] = useState(false);
  const elevenAgentUrl = 'https://elevenlabs.io/app/talk-to?agent_id=agent_4601k3adesp7enbbfewxrtqpd4t1';

  // Auth gating state
  const [needsAuth, setNeedsAuth] = useState(false);
  const [authStage, setAuthStage] = useState<'idle'|'ask'|'collect_name'|'collect_email'|'collect_password'|'registering'|'done'>('idle');
  const [authTempName, setAuthTempName] = useState<string>('');
  const [authTempEmail, setAuthTempEmail] = useState<string>('');
  

  useEffect(() => {
    if (!isOpen) return;
    if (messages.length > 0) return;

    if (!isAuthenticated) {
      setNeedsAuth(true);
      setAuthStage('ask');
      addBotMessage(t('chat.auth_gate_intro', 'To calculate a quote, I need you to be signed in.'));
      addBotMessage(t('chat.auth_gate_question', 'Do you already have an account with us?'));
      return;
    }

    // Auth present -> start normal flow with educational intro
    addBotMessage(
      t(
        'chat.kb_insurance_basics',
        'Insurance is protection against financial loss from accidents or risks. It\'s legally required in many places and offers financial protection.'
      )
    );
    addBotMessage(
      t(
        'chat.kb_underwriting_intro',
        'To calculate a fair premium, I\'ll ask about your age, driving history, car make/year, location, and usage. With Pree, quotes are instant.'
      )
    );
    addBotMessage(insuranceQuestions[0].question);
  }, [isOpen, isAuthenticated]);

  // If the user logs out while chat is open, switch to auth gate immediately
  useEffect(() => {
    if (!isOpen) return;
    if (!isAuthenticated) {
      // reset to auth gate
      setMessages([]);
      setCurrentQuestionIndex(0);
      setInsuranceData({ ID: 1 });
      setIsWaitingForResponse(false);
      setIsComplete(false);
      setIsLoading(false);
      setNeedsAuth(true);
      setAuthStage('ask');
      addBotMessage(t('chat.auth_gate_intro', 'To calculate a quote, I need you to be signed in.'));
      addBotMessage(t('chat.auth_gate_question', 'Do you already have an account with us?'));
    }
  }, [isAuthenticated, isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const addBotMessage = (text: string, isTyping = false) => {
    const message: ChatMessage = {
      id: generateId(),
      text,
      sender: 'bot',
      timestamp: new Date(),
      isTyping
    };
    setMessages(prev => [...prev, message]);
    
    if (isTyping) {
      // Simulate typing delay
      setTimeout(() => {
        setMessages(prev => 
          prev.map(msg => 
            msg.id === message.id ? { ...msg, isTyping: false } : msg
          )
        );
      }, 1500);
    }
  };

  // Speak the latest finished bot message when voice is enabled
  useEffect(() => {
    if (!voiceEnabled) return;

    const lastSpeakable = [...messages].reverse().find(m => m.sender === 'bot' && !m.isTyping && m.text && !spokenIds.current.has(m.id));
    if (!lastSpeakable) return;

    (async () => {
      try {
        // Call backend TTS proxy (JWT handled by axios interceptor)
        const res = await axios.post<ArrayBuffer>(
          '/api/tts/speak',
          {
            text: lastSpeakable.text,
            voice_id: voiceIdRef.current,
            model_id: modelIdRef.current,
            output_format: outputFormatRef.current,
          },
          { responseType: 'arraybuffer' }
        );

        const blob = new Blob([res.data], { type: 'audio/mpeg' });
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        await audio.play();
        URL.revokeObjectURL(url);
        spokenIds.current.add(lastSpeakable.id);
      } catch (err) {
        // Non-fatal: show fallback to ElevenLabs web agent
        console.warn('TTS playback failed', err);
        setVoiceFallback(true);
        setVoiceEnabled(false);
      }
    })();
  }, [messages, voiceEnabled]);

  const addUserMessage = (text: string) => {
    const message: ChatMessage = {
      id: generateId(),
      text,
      sender: 'user',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, message]);
  };

  const handleUserResponse = async (displayText: string, value: number) => {
    if (isWaitingForResponse || isComplete) return;

    addUserMessage(displayText);
    setIsWaitingForResponse(true);

    // Lightweight FAQ detection based on user-provided knowledge base
    const tryAnswerFAQ = (text: string): boolean => {
      const q = (text || '').toLowerCase();
      const reply = (msg: string) => addBotMessage(t('chat.kb_answer', msg));

      if (q.includes('what is insurance')) {
        reply('Insurance is protection against financial loss from accidents or risks.');
        return true;
      }
      if (q.includes('why do i need insurance')) {
        reply('It is a legal requirement in most places and provides financial protection.');
        return true;
      }
      if (q.includes('types of insurance')) {
        reply('Common types include auto, health, life, and property insurance.');
        return true;
      }
      if (q.includes('what is underwriting')) {
        reply('Underwriting is how insurers assess your risk to decide your premium.');
        return true;
      }
      if (q.includes('why do you need my') || q.includes('why are you asking')) {
        reply('Each detail helps me calculate a fair, accurate quote for you.');
        return true;
      }
      if (q.includes('what is a premium')) {
        reply('A premium is the amount you pay (monthly/annually) to stay insured.');
        return true;
      }
      if (q.includes('what is coverage')) {
        reply('Coverage is the protection your policy provides (e.g., accident damage, theft).');
        return true;
      }
      if (q.includes('what is an excess') || q.includes('what is a deductible')) {
        reply('Excess (deductible) is what you pay out-of-pocket before insurance kicks in.');
        return true;
      }
      if (q.includes('why is my quote') || q.includes('why did my quote')) {
        reply('Quotes can be higher due to age, claims history, location, or car type.');
        return true;
      }
      if (q.includes('file a claim') || q.includes('how do i file a claim')) {
        reply('Contact your insurer immediately and provide accident details, photos, and a police report.');
        return true;
      }
      if (q.includes('what info do i need for a claim') || q.includes('what information for a claim')) {
        reply('You\'ll need your policy number, incident details, and documents like a police report.');
        return true;
      }
      if (q.includes('how long does a claim') || q.includes('claim take')) {
        reply('Claim duration depends on complexity, but insurers aim to be fast.');
        return true;
      }
      if (q.includes('kenya') || q.includes('third-party') || q.includes('comprehensive')) {
        reply('In Kenya, motor insurance is mandatory. Third-party is the minimum legal cover; comprehensive covers theft, fire, and own damage.');
        return true;
      }
      if (q.includes('lower my premium') || q.includes('reduce my premium')) {
        reply('Safe driving, fewer claims, and choosing a smaller/safer car can help lower your premium.');
        return true;
      }
      if (q.includes('full coverage') || q.includes('do i need comprehensive')) {
        reply('If your car is financed or valuable, comprehensive cover is recommended.');
        return true;
      }
      if (q.includes('privacy') || q.includes('private')) {
        reply('I keep your info private and only use it to calculate your quote.');
        return true;
      }
      if (q.includes('email') && q.includes('pdf')) {
        reply('I can email you a PDF summary of your quote if you\'d like.');
        return true;
      }
      if (q.includes('save') && (q.includes('history') || q.includes('quote'))) {
        reply('Would you like me to save this in your quote history so you can compare later?');
        return true;
      }
      return false;
    };

    // If user asked a FAQ, answer and do not advance the flow
    if (typeof displayText === 'string' && tryAnswerFAQ(displayText)) {
      setTimeout(() => setIsWaitingForResponse(false), 300);
      return;
    }

    // If we're in auth gating, branch here
    if (needsAuth && authStage === 'ask') {
      // Treat select options as: 1 => Yes (has account), 0 => No (register)
      setTimeout(async () => {
        if (value === 1) {
          addBotMessage(t('chat.auth_gate_login_redirect', 'Great! I\'ll take you to the login page. Come back after signing in to continue.'), true);
          setNeedsAuth(false);
          setAuthStage('done');
          setIsWaitingForResponse(false);
          navigate('/login');
          onClose();
          return;
        } else {
          // Ask for name first
          setAuthStage('collect_name');
          addBotMessage(t('chat.auth_gate_ask_name', "Let's create your account. What's your full name?"));
          setIsWaitingForResponse(false);
          return;
        }
      }, 600);
      return;
    }

    // Auth gating: collect name
    if (needsAuth && authStage === 'collect_name') {
      setAuthTempName(displayText.trim());
      setAuthStage('collect_email');
      setTimeout(() => {
        addBotMessage(t('chat.auth_gate_ask_email', 'Thanks! What email should we use for your account?'));
        setIsWaitingForResponse(false);
      }, 400);
      return;
    }

    // Auth gating: collect email and register
    if (needsAuth && authStage === 'collect_email') {
      const email = displayText.trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setTimeout(() => {
          addBotMessage(t('chat.auth_gate_email_invalid', 'That email does not look valid. Please enter a valid email address.'));
          setIsWaitingForResponse(false);
        }, 300);
        return;
      }
      setAuthTempEmail(email);
      setAuthStage('collect_password');
      setTimeout(() => {
        addBotMessage(t('chat.auth_gate_ask_password', 'Great. Please choose a password for your account.'));
        setIsWaitingForResponse(false);
      }, 300);
      return;
    }

    // Auth gating: collect password and register
    if (needsAuth && authStage === 'collect_password') {
      const password = displayText.trim();
      if (password.length < 6) {
        setTimeout(() => {
          addBotMessage(t('chat.auth_gate_password_invalid', 'Password should be at least 6 characters. Please enter a stronger password.'));
          setIsWaitingForResponse(false);
        }, 300);
        return;
      }
      setAuthStage('registering');
      addBotMessage(t('chat.auth_gate_registering', 'No problem, creating a quick account for you...'), true);
      try {
        const res = await register(authTempName || 'User', authTempEmail, password);
        if (res.success) {
          addBotMessage(t('chat.auth_gate_registered', 'All set! You\'re now signed in. Let\'s proceed with your quote.'));
          setNeedsAuth(false);
          setAuthStage('done');
          // proceed to first question
          addBotMessage(insuranceQuestions[0].question, true);
        } else {
          addBotMessage(t('chat.auth_gate_register_fail', 'I could not register you right now. Please use the Login/Sign Up buttons at the top and try again.'));
        }
      } catch {
        addBotMessage(t('chat.auth_gate_register_error', 'Something went wrong during registration. Please try again later.'));
      } finally {
        setIsWaitingForResponse(false);
      }
      return;
    }

    // Update insurance data
    const currentQuestion = insuranceQuestions[currentQuestionIndex];
    const updatedData = { ...insuranceData, [currentQuestion.field]: value };
    setInsuranceData(updatedData);

    // Simulate typing delay before next question
    setTimeout(async () => {
      const nextIndex = currentQuestionIndex + 1;
      
      if (nextIndex < insuranceQuestions.length) {
        // Educational interludes at key points
        if (nextIndex === 1) {
          addBotMessage(
            t(
              'chat.kb_underwriting_details',
              'Underwriting: age, driving history, car make/year, location, and usage help assess risk and set your premium.'
            )
          );
        }
        if (nextIndex === 3) {
          addBotMessage(
            t(
              'chat.kb_policy_premium',
              'Premium = what you pay monthly/annually. Coverage = what\'s protected. Deductible (excess) = what you pay before insurance applies.'
            )
          );
        }
        // Ask next question
        setCurrentQuestionIndex(nextIndex);
        addBotMessage(insuranceQuestions[nextIndex].question, true);
        setIsWaitingForResponse(false);
      } else {
        // All questions answered, get prediction
        setIsComplete(true);
        addBotMessage(t('chat.calculate_quote', 'Perfect! I have all the information I need. Let me calculate your personalized insurance quote... 🤔'), true);
        
        await getPrediction(updatedData as InsuranceData);
      }
    }, 1000);
  };

  const getPrediction = async (data: InsuranceData) => {
    setIsLoading(true);
    
    try {
      // Build full model payload to satisfy backend EXPECTED_FEATURES
      const year = new Date().getFullYear();
      const modelPayload: Record<string, number> = {
        ID: (data as any).ID ?? 1,
        KIDSDRIV: (data as any).KIDSDRIV ?? 0,
        BIRTH: (data as any).BIRTH ?? ((data as any).AGE != null ? year - (data as any).AGE : 0),
        AGE: (data as any).AGE ?? 0,
        HOMEKIDS: (data as any).HOMEKIDS ?? 0,
        YOJ: (data as any).YOJ ?? 0,
        INCOME: (data as any).INCOME ?? 0,
        PARENT1: (data as any).PARENT1 ?? 0,
        HOME_VAL: (data as any).HOME_VAL ?? 0,
        MSTATUS: (data as any).MSTATUS ?? 0,
        GENDER: (data as any).GENDER ?? 0,
        EDUCATION: (data as any).EDUCATION ?? 0,
        OCCUPATION: (data as any).OCCUPATION ?? 0,
        TRAVTIME: (data as any).TRAVTIME ?? 0,
        CAR_USE: (data as any).CAR_USE ?? 0,
        BLUEBOOK: (data as any).BLUEBOOK ?? 0,
        TIF: (data as any).TIF ?? 0,
        CAR_TYPE: (data as any).CAR_TYPE ?? 0,
        RED_CAR: (data as any).RED_CAR ?? 0,
        OLDCLAIM: (data as any).OLDCLAIM ?? 0,
        CLM_FREQ: (data as any).CLM_FREQ ?? 0,
        REVOKED: (data as any).REVOKED ?? 0,
        MVR_PTS: (data as any).MVR_PTS ?? 0,
        CLM_AMT: (data as any).CLM_AMT ?? 0,
        CAR_AGE: (data as any).CAR_AGE ?? 0,
        URBANICITY: (data as any).URBANICITY ?? 0,
      };

      const { data: result } = await axios.post<PredictionResponse>('/api/predict', {
        ...modelPayload,
        email_send: true,
        attach_pdf: true,
      }, {
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (result.status === 'success') {
        const riskText = result.risk_level.toLowerCase();
        const conf = (result as any).confidence;
        const confText = typeof conf === 'number' ? t('chat.confidence', ' (confidence {{pct}}%)', { pct: (conf * 100).toFixed(0) }) : '';
        const quoteText = t('chat.quote_result', 'Based on your data, your predicted risk is {{risk}}{{conf}}. Your insurance quote is KES {{amount}}.', {
          risk: riskText,
          conf: confText,
          amount: result.quote.toLocaleString(),
        });
        
        setTimeout(() => {
          addBotMessage(quoteText);
          // Post-quote educational and Pree-specific messages
          addBotMessage(
            t(
              'chat.kb_kenya_legal',
              'Kenya: Motor insurance is mandatory. Third-party is the minimum legal cover; Comprehensive includes theft, fire, and own damage.'
            )
          );
          addBotMessage(
            t(
              'chat.kb_pree_specific',
              'I keep your info private and only use it to calculate your quote. I can email you a PDF summary or save this to your quote history if you\'d like.'
            )
          );
          setIsLoading(false);
        }, 2000);
      } else {
        addBotMessage(t('chat.error_generic', "I'm sorry, there was an error calculating your quote. Please try again later."));
        setIsLoading(false);
      }
    } catch (error: any) {
      console.error('Prediction error:', error);
      // Try to show backend-provided error details (e.g., missing fields)
      const backendMsg = error?.response?.data?.error as string | undefined;
      if (error?.response?.status === 401) {
        addBotMessage(t('chat.auth_required', 'You need to log in to get a quote. Please log in and try again.'));
      } else if (backendMsg) {
        addBotMessage(t('chat.error_backend', "I couldn't calculate the quote: {{msg}}. Please review your answers and try again.", { msg: backendMsg }));
      } else {
        addBotMessage(t('chat.error_network', "I'm having trouble connecting to our servers. Please ensure the backend is running and try again."));
      }
      setIsLoading(false);
    }
  };

  const resetChat = () => {
    setMessages([]);
    setCurrentQuestionIndex(0);
    setInsuranceData({ ID: 1 });
    setIsWaitingForResponse(false);
    setIsComplete(false);
    setIsLoading(false);
    if (!isAuthenticated) {
      setNeedsAuth(true);
      setAuthStage('ask');
      addBotMessage(t('chat.auth_gate_intro', 'To calculate a quote, I need you to be signed in.'));
      addBotMessage(t('chat.auth_gate_question', 'Do you already have an account with us?'));
    } else {
      setNeedsAuth(false);
      setAuthStage('idle');
      addBotMessage(insuranceQuestions[0].question);
    }
  };

  const getCurrentQuestion = () => {
    if (needsAuth && authStage === 'ask') {
      // Virtual auth question
      return {
        field: 'AUTH_GATE',
        question: t('chat.auth_gate_options', 'Do you have an account with us?'),
        type: 'select',
        options: [
          { label: t('chat.option_yes', 'Yes, I have an account'), value: 1 },
          { label: t('chat.option_no', "No, register me quickly"), value: 0 },
        ],
      } as any;
    }

    if (needsAuth && authStage === 'collect_name') {
      return {
        field: 'AUTH_NAME',
        question: t('chat.auth_gate_ask_name', "Let's create your account. What's your full name?"),
        type: 'text',
      } as any;
    }

    if (needsAuth && authStage === 'collect_email') {
      return {
        field: 'AUTH_EMAIL',
        question: t('chat.auth_gate_ask_email', 'Thanks! What email should we use for your account?'),
        type: 'text',
      } as any;
    }

    if (needsAuth && authStage === 'collect_password') {
      return {
        field: 'AUTH_PASSWORD',
        question: t('chat.auth_gate_ask_password', 'Great. Please choose a password for your account.'),
        type: 'text',
      } as any;
    }

    if (isComplete || currentQuestionIndex >= insuranceQuestions.length) {
      return null;
    }
    return insuranceQuestions[currentQuestionIndex];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 w-96 h-[600px] bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col animate-slide-up z-50 sm:w-96 sm:h-[600px] max-sm:inset-4 max-sm:w-auto max-sm:h-auto max-sm:rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-primary-500 to-secondary-400 text-white rounded-t-lg">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            🛡️
          </div>
          <div>
            <h3 className="font-semibold text-sm">{t('chat.title', 'Insurance Assistant')}</h3>
            <p className="text-xs opacity-90">{t('chat.subtitle', 'Get your personalized quote')}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setVoiceEnabled(v => !v)}
            className="p-1 hover:bg-white/20 rounded transition-colors"
            title={voiceEnabled ? 'Mute voice' : 'Enable voice'}
          >
            {voiceEnabled ? '🔊' : '🔈'}
          </button>
          <button
            onClick={resetChat}
            className="p-1 hover:bg-white/20 rounded transition-colors"
            title="Reset chat"
          >
            <RotateCcw size={16} />
          </button>
          <button
            onClick={onMinimize}
            className="p-1 hover:bg-white/20 rounded transition-colors"
            title="Minimize"
          >
            <Minimize2 size={16} />
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded transition-colors"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((message) => (
          <ChatBubble key={message.id} message={message} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* ElevenLabs TTS fallback notice */}
      {voiceFallback && (
        <div className="px-4 py-2 bg-amber-50 text-amber-800 text-xs border-t border-amber-200">
          <div className="flex items-center justify-between gap-2">
            <span>
              Voice is unavailable. You can continue chatting here, or talk to our voice agent.
            </span>
            <a
              href={elevenAgentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-2 py-1 bg-amber-600 text-white rounded hover:bg-amber-700"
            >
              Open Voice Agent
            </a>
          </div>
        </div>
      )}

      {/* Input (hidden while bot is typing the question) */}
      {!isBotTyping && (
        <ChatInput
          currentQuestion={getCurrentQuestion() as any}
          onSend={handleUserResponse}
          disabled={isWaitingForResponse || isLoading}
        />
      )}

      {/* Progress indicator */}
      {!isComplete && (
        <div className="px-4 py-2 bg-gray-100 border-t border-gray-200">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>Question {currentQuestionIndex + 1} of {insuranceQuestions.length}</span>
            <div className="w-24 bg-gray-200 rounded-full h-1">
              <div 
                className="bg-primary-500 h-1 rounded-full transition-all duration-300"
                style={{ width: `${((currentQuestionIndex + 1) / insuranceQuestions.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};