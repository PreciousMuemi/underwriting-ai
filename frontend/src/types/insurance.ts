export interface InsuranceData {
  ID: number;
  KIDSDRIV: number;
  BIRTH: number;
  AGE: number;
  HOMEKIDS: number;
  YOJ: number;
  INCOME: number;
  PARENT1: number;
  HOME_VAL: number;
  MSTATUS: number;
  GENDER: number;
  EDUCATION: number;
  OCCUPATION: number;
  TRAVTIME: number;
  CAR_USE: number;
  BLUEBOOK: number;
  TIF: number;
  CAR_TYPE: number;
  RED_CAR: number;
  OLDCLAIM: number;
  CLM_FREQ: number;
  REVOKED: number;
  MVR_PTS: number;
  CLM_AMT: number;
  CAR_AGE: number;
  URBANICITY: number;
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  isTyping?: boolean;
}

export interface QuestionConfig {
  field: keyof InsuranceData;
  question: string;
  type: 'text' | 'number' | 'select';
  options?: { label: string; value: number }[];
  validation?: (value: any) => boolean;
  errorMessage?: string;
}

export interface PredictionResponse {
  risk_score: number;
  risk_level: string;
  quote: number;
  status: string;
  error?: string;
}