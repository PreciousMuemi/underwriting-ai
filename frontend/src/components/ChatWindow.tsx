import React, { useState, useEffect, useRef } from 'react';
import { X, Minimize2, RotateCcw } from 'lucide-react';
import { ChatBubble } from './ChatBubble';
import { ChatInput } from './ChatInput';
import { ChatMessage, InsuranceData, PredictionResponse } from '../types/insurance';
import { insuranceQuestions } from '../data/questions';
import { cn } from '../lib/utils';

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
      const response = await fetch('http://127.0.0.1:5000/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result: PredictionResponse = await response.json();
      
      if (result.status === 'success') {
        const riskText = result.risk_level.toLowerCase();
        const quoteText = `Based on your data, your predicted risk is ${riskText}. Your insurance quote is KES ${result.quote.toLocaleString()}.`;
        
        setTimeout(() => {
          addBotMessage(quoteText);
          setIsLoading(false);
        }, 2000);
      } else {
        addBotMessage("I'm sorry, there was an error calculating your quote. Please try again later.");
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Prediction error:', error);
      addBotMessage("I'm having trouble connecting to our servers. Please check that the backend is running on http://127.0.0.1:5000 and try again.");
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

      {/* Input */}
      <ChatInput
        currentQuestion={getCurrentQuestion()}
        onSend={handleUserResponse}
        disabled={isWaitingForResponse || isLoading}
      />

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