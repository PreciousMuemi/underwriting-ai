import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  const [lastQuoteId, setLastQuoteId] = useState<number | null>(null);
  const [binding, setBinding] = useState(false);
  const [lastPolicyId, setLastPolicyId] = useState<number | null>(null);
  const [lastPolicyKycStatus, setLastPolicyKycStatus] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  // Issuance flags and flow
  const [issuanceStage, setIssuanceStage] = useState<'idle'|'ask_premium'|'ask_proposal'|'ask_valuation'|'ask_mech'|'done'>('idle');
  const [valuationRequired, setValuationRequired] = useState<boolean>(false);
  const [mechRequired, setMechRequired] = useState<boolean>(false);
  const [issuanceFlags, setIssuanceFlags] = useState({
    full_premium_paid: false,
    proposal_form_received: false,
    valuation_done: false,
    mechanical_assessment_done: false,
  });
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

  // Restore minimal state so user returns where they left off
  useEffect(() => {
    try {
      const raw = localStorage.getItem('chat_resume')
      if (raw) {
        const s = JSON.parse(raw)
        if (s && typeof s === 'object') {
          if (s.lastQuoteId != null) setLastQuoteId(s.lastQuoteId)
          if (s.lastPolicyId != null) setLastPolicyId(s.lastPolicyId)
          if (s.lastPolicyKycStatus != null) setLastPolicyKycStatus(s.lastPolicyKycStatus)
          if (typeof s.isComplete === 'boolean') setIsComplete(s.isComplete)
        }

      }
    } catch {}
  }, [])

  // Persist minimal state on key changes
  useEffect(() => {
    try {
      const s = {
        lastQuoteId,
        lastPolicyId,
        lastPolicyKycStatus,
        isComplete,
      }
      localStorage.setItem('chat_resume', JSON.stringify(s))
    } catch {}
  }, [lastQuoteId, lastPolicyId, lastPolicyKycStatus, isComplete])

  // If we have a policy, refresh it to get latest KYC/status on return
  useEffect(() => {
    const load = async () => {
      if (!lastPolicyId) return
      try {
        const res = await axios.get(`/api/policies/${lastPolicyId}`)
        const policy = (res.data && (res.data as any).policy) || {}
        if (policy?.kyc_status) setLastPolicyKycStatus(policy.kyc_status)
      } catch { /* ignore */ }
    }
    load()
  }, [lastPolicyId])
  const spokenIds = useRef<Set<string>>(new Set());
  // ElevenLabs fallback link state
  const [voiceFallback, setVoiceFallback] = useState(false);
  const elevenAgentUrl = 'https://elevenlabs.io/app/talk-to?agent_id=agent_4601k3adesp7enbbfewxrtqpd4t1';

  // Motor reference and slots
  type AddonCfg = { label: string; allowed_cover_types?: string[]; allowed_categories?: string[]; requires_amount?: boolean };
  type RefData = {
    vehicle_categories: string[];
    cover_types: string[];
    terms: number[];
    addons?: Record<string, AddonCfg>;
  };
  const [refData, setRefData] = useState<RefData | null>(null);
  const [motorSlots, setMotorSlots] = useState<{
    vehicle_category?: string;
    cover_type?: string;
    term_months?: number;
    vehicle_value?: number;
    vehicle_year?: number;
  }>({});

  // Add-ons flow state
  const [addonsStage, setAddonsStage] = useState<'idle'|'ask_any'|'iterating'|'await_amount'|'done'>('idle');
  const [addonOrder, setAddonOrder] = useState<string[]>([]);
  const [addonIndex, setAddonIndex] = useState<number>(0);
  const [selectedAddons, setSelectedAddons] = useState<Record<string, boolean>>({});
  const [addonAmounts, setAddonAmounts] = useState<Record<string, number>>({});

  // Auth gating state
  const [needsAuth, setNeedsAuth] = useState(false);
  const [authStage, setAuthStage] = useState<'idle'|'ask'|'collect_name'|'collect_email'|'collect_password'|'registering'|'done'>('idle');
  const [authTempName, setAuthTempName] = useState<string>('');
  const [authTempEmail, setAuthTempEmail] = useState<string>('');
  
  // Beginner-friendly descriptions for common add-ons
  const addonDescriptions = useMemo(() => ({
    pvt: 'Political Violence & Terrorism cover (damage from riots/terrorism).',
    loss_of_use: 'Covers cost of a temporary vehicle while yours is being repaired.',
    personal_accident: 'Pays out for injuries to the driver and passengers after an accident.',
    road_rescue: 'Towing/roadside assistance if you break down.',
    entertainment_unit: 'Covers damage/theft of in-car entertainment (stereo, screens).',
    windscreen: 'Covers repair/replacement of your windscreen.',
  } as Record<string, string>), []);

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

    // Start or resume a backend conversation for persistence
    (async () => {
      try {
        const res = await axios.post('/api/conversation/start', { prefill: {} });
        const cidVal = (res?.data as any)?.conversation_id;
        if (cidVal !== undefined && cidVal !== null) {
          setConversationId(String(cidVal));
        }
      } catch (e) {
        // Non-fatal
      }
    })();

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
    // Load reference and start with motor question 1
    (async () => {
      try {
        const { data } = await axios.get<RefData>('/api/reference/motor');
        setRefData(data);
        
        setMotorSlots({});
        const vcOpts = (data?.vehicle_categories || ['Private','Commercial','PSV','Motorcycles','Special']).map((label, idx) => ({ label, value: idx }));
        addBotMessage(`Vehicle category? (${vcOpts.map(o => o.label).join(', ')})`, true);
      } catch (err) {
        // fallback defaults
        const fallback: RefData = { vehicle_categories: ['Private','Commercial','PSV','Motorcycles','Special'], cover_types: ['TPO','TPFT','Comprehensive'], terms: [1,3,6,12] };
        setRefData(fallback);
        setMotorSlots({});
        const vcOpts = fallback.vehicle_categories.map((label, idx) => ({ label, value: idx }));
        addBotMessage(`Vehicle category? (${vcOpts.map(o => o.label).join(', ')})`, true);
      } finally {
        // no-op
      }
    })();
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

  // Build dynamic motor questions based on current answers
  const motorQuestions = useMemo(() => {
    const vc = (refData?.vehicle_categories || ['Private','Commercial']).map((label, idx) => ({ label, value: idx }));
    const ct = (refData?.cover_types || ['TPO','TPFT','Comprehensive']).map((label, idx) => ({ label, value: idx }));
    const terms = (refData?.terms || [1,3,6,12]).map((n) => ({ label: String(n), value: n }));
    const arr: Array<{ field: string; question: string; type: 'select'|'number'; options?: {label:string; value:number}[] }>= [];
    if (!motorSlots.vehicle_category) {
      arr.push({ field: 'vehicle_category', question: 'Vehicle category?', type: 'select', options: vc });
      return arr;
    }
    if (!motorSlots.cover_type) {
      arr.push({ field: 'cover_type', question: 'Cover type?', type: 'select', options: ct });
      return arr;
    }
    if (!motorSlots.term_months) {
      arr.push({ field: 'term_months', question: 'Term in months?', type: 'select', options: terms });
      return arr;
    }
    if (motorSlots.cover_type === 'Comprehensive' && motorSlots.vehicle_value == null) {
      arr.push({ field: 'vehicle_value', question: 'Vehicle value in KES?', type: 'number' });
      return arr;
    }
    if (motorSlots.vehicle_year == null) {
      arr.push({ field: 'vehicle_year', question: 'Year of manufacture?', type: 'number' });
      return arr;
    }
    return arr; // empty => motor complete
  }, [refData, motorSlots]);

  // Bind policy from the last saved quote
  const bindPolicy = async () => {
    if (!lastQuoteId || binding) return;
    try {
      setBinding(true);
      const res = await axios.post('/api/policies/bind', {
        quote_id: lastQuoteId,
        coverage: {
          ...issuanceFlags,
          vehicle_year: motorSlots.vehicle_year,
          vehicle_value: motorSlots.vehicle_value,
        }
      });
      const policy = (res.data && (res.data as any).policy) || {};
      setLastPolicyId(policy.id ?? null);
      setLastPolicyKycStatus(policy.kyc_status ?? null);
      addBotMessage(
        t(
          'chat.policy_bound',
          'Policy bound successfully. Policy Number: {{num}}. Effective: {{eff}}',
          { num: policy.policy_number || 'N/A', eff: policy.effective_date || 'now' }
        )
      );
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Failed to bind policy';
      const low = String(msg).toLowerCase();
      if (low.includes('premium')) {
        addBotMessage('Binding failed: Full premium payment is required before activation. Please complete payment and then try binding again.');
      } else if (low.includes('proposal')) {
        addBotMessage('Binding failed: We need a signed proposal form. We\'ll email you the form to sign. Upload it in your account once signed.');
      } else if (low.includes('valuation')) {
        addBotMessage('Binding failed: A vehicle valuation is required for this cover/value. Please get a valuation report and then try binding again.');
      } else if (low.includes('mechanical')) {
        addBotMessage('Binding failed: A mechanical assessment is required. Please complete it and then try binding again.');
      } else {
        addBotMessage(t('chat.error_backend', "{{msg}}", { msg }));
      }
    } finally {
      setBinding(false);
    }
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
        // Persist bot message (final text) once typing finishes
        if (conversationId) {
          try {
            axios.post('/api/conversation/message', { conversation_id: conversationId, sender: 'bot', text });
          } catch {}
        }
      }, 1500);
    }
    // Persist immediate bot message (no typing)
    if (!isTyping && conversationId) {
      try { axios.post('/api/conversation/message', { conversation_id: conversationId, sender: 'bot', text }); } catch {}
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
    // Persist user message
    if (conversationId) {
      try { axios.post('/api/conversation/message', { conversation_id: conversationId, sender: 'user', text }); } catch {}
    }
  };

  // Issue a previously bound policy
  const issuePolicy = async () => {
    if (!lastPolicyId) return;
    // Early guard: avoid duplicate backend errors and noisy messages when KYC pending
    if (lastPolicyKycStatus && lastPolicyKycStatus !== 'verified') {
      addBotMessage(t('chat.kyc_required', 'KYC not complete. Please complete KYC (upload your ID and details) before issuing your policy.'));
      return;
    }
    try {
      const res = await axios.post(`/api/policies/${lastPolicyId}/issue`);
      const policy = (res.data && (res.data as any).policy) || {};
      addBotMessage(
        t(
          'chat.policy_issued',
          'Policy issued. Policy Number: {{num}}. Issued at: {{issued}}',
          { num: policy.policy_number || 'N/A', issued: policy.issued_at || 'now' }
        )
      );
      // Clear persisted resume state after successful issuance
      try { localStorage.removeItem('chat_resume') } catch {}
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Failed to issue policy';
      if (String(msg).toLowerCase().includes('kyc')) {
        setLastPolicyKycStatus(prev => prev || 'pending');
        addBotMessage(t('chat.kyc_required', 'KYC not complete. Please complete KYC (Know Your Customer) in your profile, then come back to issue.'));
      } else {
        addBotMessage(t('chat.error_backend', "{{msg}}", { msg }));
      }
    }
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
        reply('In Kenya, motor insurance is mandatory. Third-party is the minimum legal cover; Comprehensive includes theft, fire, and own damage.');
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

    // Only run FAQ when not answering a select option and not in motor phase
    const currentQ: any = getCurrentQuestion();
    const inMotorPhase = motorQuestions.length > 0;
    const isSelect = currentQ && currentQ.type === 'select';
    const isJustPrivateWord = (displayText || '').trim().toLowerCase() === 'private';
    // If user asked a FAQ, answer and do not advance the flow
    if (!inMotorPhase && !isSelect && !isJustPrivateWord && typeof displayText === 'string' && tryAnswerFAQ(displayText)) {
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

    // If motor not complete, capture motor answers first
    if (motorQuestions.length > 0) {
      const q = motorQuestions[0];
      setTimeout(() => {
        const opts = (q.options || []) as Array<{label:string; value:number}>;
        // Build updated slots locally to avoid TS inference issues
        let updatedSlots = { ...motorSlots } as typeof motorSlots;
        if (q.type === 'select') {
          const chosen = opts.find(o => o.value === value);
          if (!chosen) {
            setIsWaitingForResponse(false);
            const labels = opts.map(o => o.label).join(', ');
            addBotMessage(`Please pick one of the options: ${labels}`, true);
            return;
          }
          if (q.field === 'vehicle_category') {
            updatedSlots = { ...updatedSlots, vehicle_category: chosen.label };
          } else if (q.field === 'cover_type') {
            updatedSlots = { ...updatedSlots, cover_type: chosen.label };
          } else if (q.field === 'term_months') {
            updatedSlots = { ...updatedSlots, term_months: Number(chosen.value) };
          }
        } else if (q.type === 'number') {
          if (q.field === 'vehicle_value') {
            updatedSlots = { ...updatedSlots, vehicle_value: value };
          } else if (q.field === 'vehicle_year') {
            updatedSlots = { ...updatedSlots, vehicle_year: value };
          }
        }
        setMotorSlots(updatedSlots);

        // Decide next question from updatedSlots
        const needCategory = !updatedSlots.vehicle_category;
        const needCover = !updatedSlots.cover_type;
        const needTerm = !updatedSlots.term_months;
        const needValue = (updatedSlots.cover_type === 'Comprehensive') && (updatedSlots.vehicle_value == null);
        const needYear = updatedSlots.vehicle_year == null;
        setIsWaitingForResponse(false);
        if (needCategory) {
          const labels = (refData?.vehicle_categories || ['Private','Commercial','PSV','Motorcycles','Special']);
          addBotMessage(`Vehicle category? (${labels.join(', ')})`, true);
          return;
        }
        if (needCover) {
          const labels = (refData?.cover_types || ['TPO','TPFT','Comprehensive']);
          addBotMessage(`Cover type? (${labels.join(', ')})`, true);
          return;
        }
        if (needTerm) {
          const labels = (refData?.terms || [1,3,6,12]).map(String);
          addBotMessage(`Term in months? (${labels.join(', ')})`, true);
          return;
        }
        if (needValue) {
          addBotMessage('Vehicle value in KES?', true);
          return;
        }
        if (needYear) {
          addBotMessage('Year of manufacture?', true);
          return;
        }
        // Motor complete -> kick off add-ons flow
        setAddonsStage('ask_any');
        addBotMessage('Would you like to add optional benefits (e.g., PV&T, Loss of Use, Road Rescue)?', true);
      }, 300);
      return;
    }

    // Add-ons flow handling
    if (addonsStage !== 'idle' && addonsStage !== 'done') {
      // Ask if user wants any add-ons at all
      if (addonsStage === 'ask_any') {
        setTimeout(() => {
          if (value === 1) {
            // Determine eligible add-ons based on vehicle_category and cover_type
            const coverType = motorSlots.cover_type;
            const vehicleCat = motorSlots.vehicle_category;
            const allKeys = Object.keys(refData?.addons || {});
            const eligible = allKeys.filter(k => {
              const meta = (refData as any)?.addons?.[k] || {};
              const byCover = Array.isArray(meta.allowed_covers) ? meta.allowed_covers.includes(coverType) : true;
              const byCat = Array.isArray(meta.allowed_categories) ? meta.allowed_categories.includes(vehicleCat) : true;
              return byCover && byCat;
            });
            const keys = eligible;
            setAddonOrder(keys);
            setAddonIndex(0);
            // Reset previous selections/amounts before iterating
            setSelectedAddons({});
            setAddonAmounts({});
            setAddonsStage('iterating');
            if (keys.length === 0) {
              // Nothing eligible -> skip to normal flow
              setAddonsStage('done');
              addBotMessage(insuranceQuestions[0].question, true);
            } else {
              const firstKey = keys[0];
              const label = (refData?.addons?.[firstKey]?.label) || firstKey;
              const desc = addonDescriptions[firstKey] || '';
              addBotMessage(`Add ${label}? ${desc ? '(' + desc + ')' : ''}`, true);
            }
          } else {
            // No add-ons -> proceed
            setSelectedAddons({});
            setAddonAmounts({});
            setAddonsStage('done');
            addBotMessage(insuranceQuestions[0].question, true);
          }
          setIsWaitingForResponse(false);
        }, 300);
        return;
      }

      if (addonsStage === 'iterating') {
        const keys = addonOrder;
        const idx = addonIndex;
        if (idx >= keys.length) {
          setAddonsStage('done');
          addBotMessage(insuranceQuestions[0].question, true);
          setIsWaitingForResponse(false);
          return;
        }
        const key = keys[idx];
        const cfg = refData?.addons?.[key];
        // yes/no selection for this add-on
        const yes = value === 1;
        const nextSelected = { ...selectedAddons, [key]: yes };
        setSelectedAddons(nextSelected);
        if (yes && cfg?.requires_amount) {
          // ask amount next
          setAddonsStage('await_amount');
          const label = cfg?.label || key;
          addBotMessage(`Enter sum insured for ${label} (KES)`, true);
          setIsWaitingForResponse(false);
          return;
        }
        // move to next add-on
        const nextIndex = idx + 1;
        setAddonIndex(nextIndex);
        if (nextIndex < keys.length) {
          const nextKey = keys[nextIndex];
          const label = refData?.addons?.[nextKey]?.label || nextKey;
          const desc = addonDescriptions[nextKey] || '';
          addBotMessage(`Add ${label}? ${desc ? '(' + desc + ')' : ''}`, true);
        } else {
          setAddonsStage('done');
          addBotMessage(insuranceQuestions[0].question, true);
        }
        setIsWaitingForResponse(false);
        return;
      }

      if (addonsStage === 'await_amount') {
        // value here is numeric; record it and advance to next add-on
        const keys = addonOrder;
        const idx = addonIndex;
        const key = keys[idx];
        const amount = Number(value) || 0;
        const fieldName = key === 'windscreen' ? 'windscreen_sum_insured' : `${key}_sum_insured`;
        setAddonAmounts(prev => ({ ...prev, [fieldName]: amount }));
        // advance index
        const nextIndex = idx + 1;
        setAddonIndex(nextIndex);
        setAddonsStage('iterating');
        if (nextIndex < keys.length) {
          const nextKey = keys[nextIndex];
          const label = refData?.addons?.[nextKey]?.label || nextKey;
          addBotMessage(`Add ${label}?`, true);
        } else {
          setAddonsStage('done');
          addBotMessage(insuranceQuestions[0].question, true);
        }
        setIsWaitingForResponse(false);
        return;
      }
    }

    // Issuance prerequisites flow handling (post-quote)
    if (issuanceStage !== 'idle' && issuanceStage !== 'done') {
      const yes = value === 1;
      // Advance through issuance questions sequentially
      if (issuanceStage === 'ask_premium') {
        setIssuanceFlags(prev => ({ ...prev, full_premium_paid: yes }));
        setIssuanceStage('ask_proposal');
        setTimeout(() => {
          if (!yes) {
            addBotMessage('No problem. You can pay the premium later. Once paid, you\'ll be able to bind (activate) the policy.', true);
          }
          addBotMessage('Next: Have you submitted the signed proposal form? (This is a basic application form we need for your policy.)', true);
          setIsWaitingForResponse(false);
        }, 300);
        return;
      }
      if (issuanceStage === 'ask_proposal') {
        setIssuanceFlags(prev => ({ ...prev, proposal_form_received: yes }));
        // Decide next required step based on backend flags
        if (valuationRequired) {
          setIssuanceStage('ask_valuation');
          setTimeout(() => {
            if (!yes) {
              addBotMessage('We\'ll email you the proposal form. Please sign and upload it in your account when ready.', true);
            }
            addBotMessage('Has a car valuation been done (only needed for some cars/values)?', true);
            setIsWaitingForResponse(false);
          }, 300);
          return;
        }
        if (mechRequired) {
          setIssuanceStage('ask_mech');
          setTimeout(() => {
            if (!yes) {
              addBotMessage('We\'ll email you the proposal form. Please sign and upload it when ready.', true);
            }
            addBotMessage('Has a mechanical assessment been done (only needed for some cases)?', true);
            setIsWaitingForResponse(false);
          }, 300);
          return;
        }
        // Nothing else required
        setIssuanceStage('done');
        setTimeout(() => {
          addBotMessage('Great. You can bind (activate) the policy now when ready.', true);
          setIsWaitingForResponse(false);
        }, 300);
        return;
      }
      if (issuanceStage === 'ask_valuation') {
        setIssuanceFlags(prev => ({ ...prev, valuation_done: yes }));
        if (mechRequired) {
          setIssuanceStage('ask_mech');
          setTimeout(() => {
            if (!yes) {
              addBotMessage('A valuation report is needed to proceed. You can get this from an approved valuer and try again.', true);
            }
            addBotMessage('Has a mechanical assessment been done (only needed for some cases)?', true);
            setIsWaitingForResponse(false);
          }, 300);
          return;
        }
        setIssuanceStage('done');
        setTimeout(() => {
          if (!yes) {
            addBotMessage('A valuation report is needed. Please complete it, then bind your policy.', true);
          }
          addBotMessage('All set. You can bind (activate) the policy now.', true);
          setIsWaitingForResponse(false);
        }, 300);
        return;
      }
      if (issuanceStage === 'ask_mech') {
        setIssuanceFlags(prev => ({ ...prev, mechanical_assessment_done: yes }));
        setIssuanceStage('done');
        setTimeout(() => {
          if (!yes) {
            addBotMessage('A mechanical assessment is needed before activation. Please complete it, then bind your policy.', true);
          }
          addBotMessage('All issuance checks done. You can bind (activate) the policy now.', true);
          setIsWaitingForResponse(false);
        }, 300);
        return;
      }
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
        BLUEBOOK: (data as any).BLUEBOOK ?? (motorSlots.vehicle_value ? Math.round((motorSlots.vehicle_value as number)/150) : 0),
        TIF: (data as any).TIF ?? 0,
        CAR_TYPE: (data as any).CAR_TYPE ?? 0,
        RED_CAR: (data as any).RED_CAR ?? 0,
        OLDCLAIM: (data as any).OLDCLAIM ?? 0,
        CLM_FREQ: (data as any).CLM_FREQ ?? 0,
        REVOKED: (data as any).REVOKED ?? 0,
        MVR_PTS: (data as any).MVR_PTS ?? 0,
        CLM_AMT: (data as any).CLM_AMT ?? (data as any).OLDCLAIM ?? 0,
        CAR_AGE: (data as any).CAR_AGE ?? 0,
        URBANICITY: (data as any).URBANICITY ?? 0,
      };

      // Build validator-required motor payload
      // Build add-ons list and amounts into payload (filtered by eligibility and selection)
      const selectedAddonKeys = Object.keys(selectedAddons).filter(k => selectedAddons[k]);
      const allAddonKeys = Object.keys(refData?.addons || {});
      const coverType = motorSlots.cover_type;
      const vehicleCat = motorSlots.vehicle_category;
      const eligibleKeys = allAddonKeys.filter(k => {
        const meta = (refData as any)?.addons?.[k] || {};
        const byCover = Array.isArray(meta.allowed_covers) ? meta.allowed_covers.includes(coverType) : true;
        const byCat = Array.isArray(meta.allowed_categories) ? meta.allowed_categories.includes(vehicleCat) : true;
        return byCover && byCat;
      });
      const finalAddonKeys = selectedAddonKeys.filter(k => eligibleKeys.includes(k));
      const filteredAddonAmounts = Object.fromEntries(
        Object.entries(addonAmounts).filter(([k]) => finalAddonKeys.includes(k))
      );
      const payload = {
        vehicle_category: motorSlots.vehicle_category,
        cover_type: motorSlots.cover_type,
        term_months: motorSlots.term_months,
        add_ons: finalAddonKeys,
        vehicle_value: motorSlots.vehicle_value,
        coverage: {
          vehicle_value: motorSlots.vehicle_value,
          vehicle_year: motorSlots.vehicle_year,
        },
        ...modelPayload,
        ...filteredAddonAmounts,
        email_send: true,
        attach_pdf: true,
      };

      const response = await axios.post<PredictionResponse>('/api/predict', payload, {
        headers: { 'Content-Type': 'application/json' }
      });
      
      const result = response.data as any;
      if (result.status === 'success') {
        const riskText = result.risk_level.toLowerCase();
        const conf = (result as any).confidence;
        const confText = typeof conf === 'number' ? t('chat.confidence', ' (confidence {{pct}}%)', { pct: (conf * 100).toFixed(0) }) : '';
        const quoteText = t(
          'chat.quote_result',
          'Based on your data, your predicted risk is {{risk}}{{conf}}. Your insurance quote is KES {{amount}}.',
          {
            risk: riskText,
            conf: confText,
            amount: (result.quote || 0).toLocaleString(),
          }
        );
        setTimeout(() => {
          addBotMessage(quoteText);
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
          if (result.quote_id) {
            setLastQuoteId(result.quote_id as number);
          }
          setValuationRequired(!!result.valuation_required);
          setMechRequired(!!result.mechanical_assessment_required);
          setIssuanceStage('ask_premium');
          addBotMessage('Before we can bind (activate) your policy, we need to confirm a few basics required by Kenyan regulations.', true);
          addBotMessage('First: Have you paid the premium in full? (Payment is required before policy activation.)', true);
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
      const details = error?.response?.data?.details?.errors as string[] | undefined;
      if (error?.response?.status === 401) {
        addBotMessage(t('chat.auth_required', 'You need to log in to get a quote. Please log in and try again.'));
      } else if (backendMsg) {
        const bullet = details && details.length ? `\n- ${details.join('\n- ')}` : '';
        addBotMessage(t('chat.error_backend', "I couldn't calculate the quote: {{msg}}. Please review your answers and try again.", { msg: backendMsg + bullet }));
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
    setMotorSlots({});
    // Ask first motor question again
    const list = (refData?.vehicle_categories || ['Private','Commercial','PSV','Motorcycles','Special']);
    const vcOpts = list.map((label, idx) => ({ label, value: idx }));
    addBotMessage(`Vehicle category? (${vcOpts.map(o => o.label).join(', ')})`, true);
    if (!isAuthenticated) {
      setNeedsAuth(true);
      setAuthStage('ask');
      addBotMessage(t('chat.auth_gate_intro', 'To calculate a quote, I need you to be signed in.'));
      addBotMessage(t('chat.auth_gate_question', 'Do you already have an account with us?'));
    } else {
      setNeedsAuth(false);
      setAuthStage('idle');
      // motor question already posted above
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

    // Motor phase virtual questions
    if (motorQuestions.length > 0) {
      const q = motorQuestions[0];
      return q as any;
    }

    // Add-ons virtual questions
    if (addonsStage !== 'idle' && addonsStage !== 'done') {
      if (addonsStage === 'ask_any') {
        return {
          field: 'ADDONS_ANY',
          question: 'Would you like to add optional benefits?',
          type: 'select',
          options: [
            { label: 'Yes', value: 1 },
            { label: 'No', value: 0 },
          ],
        } as any;
      }
      if (addonsStage === 'iterating') {
        const keys = addonOrder;
        const idx = addonIndex;
        const key = keys[idx];
        const label = (refData?.addons?.[key]?.label) || key;
        return {
          field: `ADDON_${key}`,
          question: `Add ${label}?`,
          type: 'select',
          options: [
            { label: 'Yes', value: 1 },
            { label: 'No', value: 0 },
          ],
        } as any;
      }
      if (addonsStage === 'await_amount') {
        const key = addonOrder[addonIndex];
        const label = (refData?.addons?.[key]?.label) || key;
        return {
          field: `AMOUNT_${key}`,
          question: `Enter sum insured for ${label} (KES)`,
          type: 'number',
        } as any;
      }
    }

    // Issuance prerequisite virtual questions (post-quote)
    if (issuanceStage !== 'idle' && issuanceStage !== 'done') {
      if (issuanceStage === 'ask_premium') {
        return {
          field: 'ISS_PREMIUM',
          question: 'Before binding, have you paid the full premium?',
          type: 'select',
          options: [
            { label: 'Yes', value: 1 },
            { label: 'No', value: 0 },
          ],
        } as any;
      }
      if (issuanceStage === 'ask_proposal') {
        return {
          field: 'ISS_PROPOSAL',
          question: 'Have you submitted the signed proposal form?',
          type: 'select',
          options: [
            { label: 'Yes', value: 1 },
            { label: 'No', value: 0 },
          ],
        } as any;
      }
      if (issuanceStage === 'ask_valuation') {
        return {
          field: 'ISS_VALUATION',
          question: 'Has a valuation been completed (if required)?',
          type: 'select',
          options: [
            { label: 'Yes', value: 1 },
            { label: 'No', value: 0 },
          ],
        } as any;
      }
      if (issuanceStage === 'ask_mech') {
        return {
          field: 'ISS_MECH',
          question: 'Has a mechanical assessment been completed (if required)?',
          type: 'select',
          options: [
            { label: 'Yes', value: 1 },
            { label: 'No', value: 0 },
          ],
        } as any;
      }
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

      {/* Bind/Issue action panel */}
      {isComplete && (
        <div className="px-4 py-3 bg-white border-t border-gray-200">
          {lastPolicyId ? (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-700">
                {lastPolicyKycStatus && lastPolicyKycStatus !== 'verified'
                  ? 'Policy bound. KYC required to issue.'
                  : 'Policy bound. You can issue it now.'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={issuePolicy}
                  disabled={!!lastPolicyKycStatus && lastPolicyKycStatus !== 'verified'}
                  className="px-3 py-1 min-w-28 text-center bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
                >
                  Issue Policy
                </button>
                {lastPolicyKycStatus && lastPolicyKycStatus !== 'verified' && (
                  <button
                    onClick={() => navigate('/app/kyc')}
                    className="px-3 py-1 min-w-28 text-center bg-amber-600 text-white rounded hover:bg-amber-700"
                    title="Complete KYC to enable issuing"
                  >
                    Complete KYC
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-700">Happy with the quote? Bind a policy to lock it in.</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={bindPolicy}
                  disabled={!lastQuoteId || binding}
                  className="px-3 py-1 bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
                  title={!lastQuoteId ? 'No quote available to bind yet' : 'Bind Policy'}
                >
                  {binding ? 'Binding…' : 'Bind Policy'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

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