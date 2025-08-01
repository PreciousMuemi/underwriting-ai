import React from 'react';
import { ChatMessage } from '../types/insurance';
import { cn } from '../lib/utils';

interface ChatBubbleProps {
  message: ChatMessage;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  return (
    <div className={cn(
      "flex mb-4 animate-slide-up",
      message.sender === 'user' ? 'justify-end' : 'justify-start'
    )}>
      <div className={cn(
        "chat-bubble",
        message.sender === 'user' ? 'chat-bubble user bg-primary-500 text-white' : 'chat-bubble bot'
      )}>
        {message.isTyping ? (
          <div className="typing-indicator">
            <div className="typing-dot"></div>
            <div className="typing-dot"></div>
            <div className="typing-dot"></div>
          </div>
        ) : (
          <p className="text-sm">{message.text}</p>
        )}
      </div>
    </div>
  );
};