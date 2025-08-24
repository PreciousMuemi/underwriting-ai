import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

type Msg = { role: 'system'|'bot'|'user'; text: string };

type RefData = {
  vehicle_categories: string[];
  cover_types: string[];
  terms: number[];
  addons: Record<string, { label: string; allowed_cover_types?: string[]; requires_amount?: boolean }>
};

type Slots = {
  vehicle_category?: string;
  cover_type?: string;
  term_months?: number;
  coverage_vehicle_value?: number;
  coverage_vehicle_year?: number;
  add_ons?: Array<{ code: string; amount?: number }>;
  // Minimal subset for model features
  age?: number; // AGE
  car_type?: string; // CAR_TYPE (we'll map to numeric)
  commute_minutes?: number; // TRAVTIME
  urbanicity?: 'Urban' | 'Rural'; // URBANICITY
  claims_count?: number; // CLM_FREQ
  claims_amount?: number; // CLM_AMT
  car_age?: number; // CAR_AGE
};

// API response types
type PredictResponse = {
  quote: number;
  risk_level: string;
  valuation_required?: boolean;
  mechanical_assessment_required?: boolean;
};

const ChatbotInterface: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([{
    role: 'bot',
    text: 'Insurance is protection against financial loss from accidents or risks. It\'s legally required in many places and offers financial protection.'
  }, {
    role: 'bot',
    text: 'To calculate a fair premium, I\'ll ask about your age, driving history, car make/year, location, and usage. With Pree, quotes are instant.'
  }, {
    role: 'bot',
    text: 'Type "quote" to begin.'
  }]);
  const [input, setInput] = useState('');
  const [refData, setRefData] = useState<RefData | null>(null);
  const [loadingRef, setLoadingRef] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const [slots, setSlots] = useState<Slots>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const loadRef = async () => {
      try {
        setLoadingRef(true);
        const { data } = await axios.get<RefData>('/api/reference/motor');
        setRefData(data);
      } catch {
        setMessages(m => [...m, { role: 'bot', text: 'Unable to load reference data. Predictions may be limited.' }]);
      } finally {
        setLoadingRef(false);
      }
    };
    loadRef();
  }, []);

  const nextMissing = useMemo(() => {
    if (!collecting) return null;
    if (!slots.vehicle_category) return 'vehicle_category';
    if (!slots.cover_type) return 'cover_type';
    if (!slots.term_months) return 'term_months';
    if (slots.cover_type === 'Comprehensive' && slots.coverage_vehicle_value == null) return 'coverage_vehicle_value';
    if (slots.coverage_vehicle_year == null) return 'coverage_vehicle_year';
    if (slots.age == null) return 'age';
    if (!slots.car_type) return 'car_type';
    if (slots.commute_minutes == null) return 'commute_minutes';
    if (!slots.urbanicity) return 'urbanicity';
    if (slots.claims_count == null) return 'claims_count';
    if (slots.claims_amount == null) return 'claims_amount';
    if (slots.car_age == null) return 'car_age';
    return null;
  }, [collecting, slots]);

  useEffect(() => {
    if (!collecting) return;
    if (!nextMissing) {
      // ready to quote
      void submitQuote();
      return;
    }
    // ask for the next slot
    if (nextMissing === 'vehicle_category') {
      const opts = refData?.vehicle_categories?.join(', ') || 'Private, Commercial';
      addBot(`Vehicle category? (${opts})`);
    } else if (nextMissing === 'cover_type') {
      const opts = refData?.cover_types?.join(', ') || 'TPO, TPFT, Comprehensive';
      addBot(`Cover type? (${opts})`);
    } else if (nextMissing === 'term_months') {
      const opts = (refData?.terms || [1,3,6,12]).join(', ');
      addBot(`Term in months? (${opts})`);
    } else if (nextMissing === 'coverage_vehicle_value') {
      addBot('Vehicle value in KES? e.g., 1,500,000');
    } else if (nextMissing === 'coverage_vehicle_year') {
      addBot('Year of manufacture? e.g., 2014');
    } else if (nextMissing === 'age') {
      addBot('How old are you?');
    } else if (nextMissing === 'car_type') {
      addBot('Which best describes your car type? (Sedan, SUV, Minivan, Sports Car, Van, Pickup)');
    } else if (nextMissing === 'commute_minutes') {
      addBot("What's your typical one-way commute time (minutes)?");
    } else if (nextMissing === 'urbanicity') {
      addBot('Is your primary driving location Urban or Rural?');
    } else if (nextMissing === 'claims_count') {
      addBot('How many claims or violations in the last 3 years? (number)');
    } else if (nextMissing === 'claims_amount') {
      addBot('Total amount for past claims (KES)? If none, enter 0.');
    } else if (nextMissing === 'car_age') {
      addBot('How many years old is your car?');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextMissing, collecting]);

  const addUser = (text: string) => setMessages(m => [...m, { role: 'user', text }]);
  const addBot = (text: string) => setMessages(m => [...m, { role: 'bot', text }]);

  const normalize = (s: string) => s.trim();

  const parseNumber = (s: string): number | null => {
    const n = Number(s.replace(/[,\s]/g, ''));
    return Number.isFinite(n) ? n : null;
  };

  const handleValueForSlot = (slot: string, value: string) => {
    const v = normalize(value);
    if (slot === 'vehicle_category') {
      const ok = !refData || refData.vehicle_categories.includes(v);
      if (!ok) {
        addBot(`Invalid category. Allowed: ${refData?.vehicle_categories.join(', ')}`);
        return;
      }
      setSlots(s => ({ ...s, vehicle_category: v }));
    } else if (slot === 'cover_type') {
      const ok = !refData || refData.cover_types.includes(v);
      if (!ok) { addBot(`Invalid cover type. Allowed: ${refData?.cover_types.join(', ')}`); return; }
      setSlots(s => ({ ...s, cover_type: v }));
    } else if (slot === 'term_months') {
      const n = parseNumber(v);
      const ok = n != null && (!refData || refData.terms.includes(n));
      if (!ok) { addBot(`Invalid term. Allowed: ${(refData?.terms || []).join(', ')}`); return; }
      setSlots(s => ({ ...s, term_months: n! }));
    } else if (slot === 'coverage_vehicle_value') {
      const n = parseNumber(v);
      if (n == null || n <= 0) { addBot('Please provide a valid positive number.'); return; }
      setSlots(s => ({ ...s, coverage_vehicle_value: n! }));
    } else if (slot === 'coverage_vehicle_year') {
      const n = parseNumber(v);
      const year = new Date().getFullYear();
      if (n == null || n < 1970 || n > year) { addBot(`Please enter a year between 1970 and ${year}.`); return; }
      setSlots(s => ({ ...s, coverage_vehicle_year: n! }));
    } else if (slot === 'age') {
      const n = parseNumber(v);
      if (n == null || n < 16 || n > 100) { addBot('Please enter a valid age (16-100).'); return; }
      setSlots(s => ({ ...s, age: n }));
    } else if (slot === 'car_type') {
      const allowed = ['Sedan','SUV','Minivan','Sports Car','Van','Pickup'];
      const match = allowed.find(a => a.toLowerCase() === v.toLowerCase());
      if (!match) { addBot(`Please choose one: ${allowed.join(', ')}`); return; }
      setSlots(s => ({ ...s, car_type: match }));
    } else if (slot === 'commute_minutes') {
      const n = parseNumber(v);
      if (n == null || n < 0 || n > 300) { addBot('Enter minutes between 0 and 300.'); return; }
      setSlots(s => ({ ...s, commute_minutes: n }));
    } else if (slot === 'urbanicity') {
      const norm = v.toLowerCase();
      if (norm !== 'urban' && norm !== 'rural') { addBot('Please reply Urban or Rural.'); return; }
      setSlots(s => ({ ...s, urbanicity: norm === 'urban' ? 'Urban' : 'Rural' }));
    } else if (slot === 'claims_count') {
      const n = parseNumber(v);
      if (n == null || n < 0 || n > 10) { addBot('Enter a number between 0 and 10.'); return; }
      setSlots(s => ({ ...s, claims_count: n }));
    } else if (slot === 'claims_amount') {
      const n = parseNumber(v);
      if (n == null || n < 0) { addBot('Enter 0 or a positive amount.'); return; }
      setSlots(s => ({ ...s, claims_amount: n }));
    } else if (slot === 'car_age') {
      const n = parseNumber(v);
      if (n == null || n < 0 || n > 50) { addBot('Enter years between 0 and 50.'); return; }
      setSlots(s => ({ ...s, car_age: n }));
    }
  };

  const submitQuote = async () => {
    if (!isAuthenticated) {
      addBot('Please log in to get a quote.');
      setCollecting(false);
      return;
    }
    // default add_ons empty; later we can collect add-ons via follow-up turns
    // Map minimal fields to EXPECTED_FEATURES numerically
    const carTypeMap: Record<string, number> = {
      'Sedan': 1,
      'SUV': 2,
      'Minivan': 3,
      'Sports Car': 4,
      'Van': 5,
      'Pickup': 6,
    };
    const urbanicityVal = slots.urbanicity === 'Urban' ? 1 : 0; // Urban=1, Rural=0
    const carTypeVal = slots.car_type ? carTypeMap[slots.car_type] ?? 0 : 0;
    const bluebook = slots.coverage_vehicle_value ? Math.round(slots.coverage_vehicle_value / 150) : 7000;

    const payload = {
      vehicle_category: slots.vehicle_category,
      cover_type: slots.cover_type,
      term_months: slots.term_months,
      add_ons: (slots.add_ons || []).map(a => a.code),
      // Top-level vehicle_value required by backend validators
      vehicle_value: slots.coverage_vehicle_value,
      coverage: {
        vehicle_value: slots.coverage_vehicle_value,
        vehicle_year: slots.coverage_vehicle_year
      },
      // EXPECTED_FEATURES values (provide sensible defaults)
      ID: 0,
      KIDSDRIV: 0,
      BIRTH: 0,
      AGE: slots.age ?? 30,
      HOMEKIDS: 0,
      YOJ: 5,
      INCOME: 50000,
      PARENT1: 0,
      HOME_VAL: 0,
      MSTATUS: 0, // 0=Single, 1=Married
      GENDER: 0, // 0=F, 1=M
      EDUCATION: 0,
      OCCUPATION: 0,
      TRAVTIME: slots.commute_minutes ?? 20,
      CAR_USE: slots.vehicle_category === 'Commercial' ? 1 : 0, // 0=Private,1=Commercial
      BLUEBOOK: bluebook,
      TIF: 0,
      CAR_TYPE: carTypeVal,
      RED_CAR: 0,
      OLDCLAIM: 0,
      CLM_FREQ: slots.claims_count ?? 0,
      REVOKED: 0,
      MVR_PTS: 0,
      CLM_AMT: slots.claims_amount ?? 0,
      CAR_AGE: slots.car_age ?? (slots.coverage_vehicle_year ? (new Date().getFullYear() - (slots.coverage_vehicle_year || 0)) : 5),
      URBANICITY: urbanicityVal,
    };

    try {
      addBot('Great! Calculating your quote...');
      const { data } = await axios.post<PredictResponse>('/api/predict', payload);
      addBot(`Quote: KES ${data.quote}. Risk level: ${data.risk_level}.`);
      if (data.valuation_required || data.mechanical_assessment_required) {
        addBot(`Issuance flags: valuation ${data.valuation_required ? 'required' : 'not required'}, mechanical assessment ${data.mechanical_assessment_required ? 'required' : 'not required'}.`);
      }
      setCollecting(false);
      setSlots({});
    } catch (e: any) {
      const err = e?.response?.data;
      const detail = err?.details?.errors ? `\n- ${err.details.errors.join('\n- ')}` : '';
      const msg = err?.error ? `${err.error}${detail}` : 'Unable to get quote.';
      addBot(msg);
      setCollecting(false);
    }
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    addUser(text);
    setInput('');
    if (!collecting) {
      if (/^quote\b/i.test(text) || /motor/i.test(text)) {
        if (!isAuthenticated) {
          addBot('Please log in first, then type "quote" to begin.');
        } else {
          setCollecting(true);
          addBot('To get your quote, I’ll ask a few basics.');
          // Ask the first required motor question immediately for clarity
          const opts = refData?.vehicle_categories?.join(', ') || 'Private, Commercial';
          addBot(`Vehicle category? (${opts})`);
        }
      } else {
        addBot('Type "quote" to start.');
      }
      return;
    }
    // collecting path
    if (nextMissing) {
      handleValueForSlot(nextMissing, text);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 bg-white rounded shadow flex flex-col h-full">
      <h2 className="text-2xl mb-4">Chatbot Interface</h2>
      <div ref={scrollRef} className="flex-grow overflow-auto border rounded p-4 mb-4 space-y-2">
        {messages.map((m, i) => (
          <div key={i} className={`p-2 rounded ${m.role === 'user' ? 'bg-blue-50 text-blue-900' : 'bg-gray-100 text-gray-900'}`}>
            {m.text}
          </div>
        ))}
        {loadingRef && <div className="text-sm text-gray-500">Loading reference...</div>}
      </div>
      <div className="flex">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-grow border rounded px-3 py-2 mr-2"
          placeholder={collecting ? 'Answer here...' : 'Type "quote" to start'}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />
        <button
          onClick={handleSend}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatbotInterface;
