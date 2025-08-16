import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { QuestionConfig } from '../types/insurance';
import { cn } from '../lib/utils';

interface ChatInputProps {
  currentQuestion: QuestionConfig | null;
  onSend: (message: string, value: number) => void;
  disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ 
  currentQuestion, 
  onSend, 
  disabled = false 
}) => {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentQuestion || disabled) return;
    
    let numericValue: number;
    let displayText = inputValue;
    
    if (currentQuestion.type === 'select') {
      const selectedOption = currentQuestion.options?.find(opt => opt.label === inputValue);
      if (!selectedOption) {
        setError('Please select a valid option');
        return;
      }
      numericValue = selectedOption.value;
      displayText = selectedOption.label;
    } else {
      numericValue = parseFloat(inputValue);
      if (isNaN(numericValue)) {
        setError('Please enter a valid number');
        return;
      }
      
      if (currentQuestion.validation && !currentQuestion.validation(numericValue)) {
        setError(currentQuestion.errorMessage || 'Invalid input');
        return;
      }
    }
    
    setError('');
    setInputValue('');
    onSend(displayText, numericValue);
  };

  const handleOptionClick = (option: { label: string; value: number }) => {
    // Clear any previous input to avoid setting text into numeric inputs on next question
    setInputValue('');
    setError('');
    onSend(option.label, option.value);
  };

  if (!currentQuestion) return null;

  return (
    <div className="border-t border-gray-200 p-4 bg-white">
      {error && (
        <div className="mb-2 text-red-500 text-sm">{error}</div>
      )}
      
      {currentQuestion.type === 'select' ? (
        <div className="grid grid-cols-1 gap-2">
          {currentQuestion.options?.map((option) => (
            <button
              key={option.value}
              onClick={() => handleOptionClick(option)}
              disabled={disabled}
              className={cn(
                "w-full p-3 text-left rounded-lg border-2 transition-all duration-200",
                "hover:border-primary-400 hover:bg-primary-50",
                "focus:outline-none focus:border-primary-500 focus:bg-primary-50",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type={currentQuestion.type === 'number' ? 'number' : 'text'}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type your answer..."
            disabled={disabled}
            className={cn(
              "flex-1 p-3 border border-gray-300 rounded-lg",
              "focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          />
          <button
            type="submit"
            disabled={disabled || !inputValue.trim()}
            className={cn(
              "px-4 py-3 bg-primary-500 text-white rounded-lg",
              "hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "transition-colors duration-200"
            )}
          >
            <Send size={18} />
          </button>
        </form>
      )}
    </div>
  );
};