import React, { useState, useEffect, useRef } from 'react';
import { api as apiClient } from '../lib/api/client';
import { X, Minimize2, RotateCcw } from 'lucide-react';
import { ChatBubble } from './ChatBubble';
import { ChatInput } from './ChatInput';
import { ChatMessage, InsuranceData, PredictionResponse } from '../types/insurance';
import { insuranceQuestions } from '../data/questions';
// import { cn } from '../lib/utils';

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

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Start the conversation
      addBotMessage(insuranceQuestions[0].question);
    }
  }, [isOpen]);

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

    // Update insurance data
    const currentQuestion = insuranceQuestions[currentQuestionIndex];
    const updatedData = { ...insuranceData, [currentQuestion.field]: value };
    setInsuranceData(updatedData);

    // Simulate typing delay before next question
    setTimeout(async () => {
      const nextIndex = currentQuestionIndex + 1;
      
      if (nextIndex < insuranceQuestions.length) {
        // Ask next question
        setCurrentQuestionIndex(nextIndex);
        addBotMessage(insuranceQuestions[nextIndex].question, true);
        setIsWaitingForResponse(false);
      } else {
        // All questions answered, get prediction
        setIsComplete(true);
        addBotMessage("Perfect! I have all the information I need. Let me calculate your personalized insurance quote... 🤔", true);
        
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

      const { data: result } = await apiClient.post<PredictionResponse>('/api/predict', modelPayload, {
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (result.status === 'success') {
        const riskText = result.risk_level.toLowerCase();
        const conf = (result as any).confidence;
        const confText = typeof conf === 'number' ? ` (confidence ${(conf * 100).toFixed(0)}%)` : '';
        const quoteText = `Based on your data, your predicted risk is ${riskText}${confText}. Your insurance quote is KES ${result.quote.toLocaleString()}.`;
        
        setTimeout(() => {
          addBotMessage(quoteText);
          setIsLoading(false);
        }, 2000);
      } else {
        addBotMessage("I'm sorry, there was an error calculating your quote. Please try again later.");
        setIsLoading(false);
      }
    } catch (error: any) {
      console.error('Prediction error:', error);
      // Try to show backend-provided error details (e.g., missing fields)
      const backendMsg = error?.response?.data?.error as string | undefined;
      if (backendMsg) {
        addBotMessage(`I couldn't calculate the quote: ${backendMsg}. Please review your answers and try again.`);
      } else {
        addBotMessage("I'm having trouble connecting to our servers. Please ensure the backend is running and try again.");
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
    addBotMessage(insuranceQuestions[0].question);
  };

  const getCurrentQuestion = () => {
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
            <h3 className="font-semibold text-sm">Insurance Assistant</h3>
            <p className="text-xs opacity-90">Get your personalized quote</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
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