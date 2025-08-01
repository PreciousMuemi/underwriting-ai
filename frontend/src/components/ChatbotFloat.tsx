import React from 'react';
import { MessageCircle, Minimize2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface ChatbotFloatProps {
  isOpen: boolean;
  isMinimized: boolean;
  onClick: () => void;
  hasNewMessage?: boolean;
}

export const ChatbotFloat: React.FC<ChatbotFloatProps> = ({ 
  isOpen, 
  isMinimized,
  onClick, 
  hasNewMessage = false 
}) => {
  if (isOpen && !isMinimized) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40">
      <button
        onClick={onClick}
        className={cn(
          "group relative w-14 h-14 bg-gradient-to-r from-primary-500 to-secondary-400",
          "rounded-full shadow-lg hover:shadow-xl",
          "transition-all duration-300 transform hover:scale-110",
          "flex items-center justify-center text-white",
          "animate-bounce-gentle"
        )}
      >
        {isMinimized ? (
          <Minimize2 size={24} />
        ) : (
          <MessageCircle size={24} />
        )}
        
        {/* Pulse effect */}
        <div className="absolute inset-0 rounded-full bg-primary-400 animate-ping opacity-75 scale-75"></div>
        
        {/* New message indicator */}
        {hasNewMessage && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full"></div>
          </div>
        )}
        
        {/* Tooltip */}
        <div className={cn(
          "absolute right-full mr-3 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg",
          "opacity-0 group-hover:opacity-100 transition-opacity duration-200",
          "whitespace-nowrap pointer-events-none"
        )}>
          {isMinimized ? 'Expand chat' : 'Get your insurance quote!'}
          <div className="absolute top-1/2 -right-1 w-2 h-2 bg-gray-800 transform rotate-45 -translate-y-1/2"></div>
        </div>
      </button>
    </div>
  );
};