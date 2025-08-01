import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Mic, MicOff, Volume2 } from 'lucide-react';
import { useVoiceInput } from '../hooks/useVoiceInput';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  language?: string;
  disabled?: boolean;
  className?: string;
}

const VoiceInput: React.FC<VoiceInputProps> = ({
  onTranscript,
  language = 'en-US',
  disabled = false,
  className = '',
}) => {
  const { t, i18n } = useTranslation();
  
  // Map i18n language codes to speech recognition language codes
  const getSpeechLanguage = (lang: string) => {
    const languageMap: Record<string, string> = {
      'en': 'en-US',
      'sw': 'sw-KE', // Swahili (Kenya)
    };
    return languageMap[lang] || 'en-US';
  };

  const speechLanguage = getSpeechLanguage(language || i18n.language);
  
  const {
    isListening,
    transcript,
    error,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
  } = useVoiceInput({
    language: speechLanguage,
    continuous: false,
    interimResults: true,
  });

  // Send transcript to parent when it changes and is final
  useEffect(() => {
    if (transcript && !isListening) {
      onTranscript(transcript);
      resetTranscript();
    }
  }, [transcript, isListening, onTranscript, resetTranscript]);

  const handleToggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  if (!isSupported) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="p-2 rounded-full bg-gray-100 cursor-not-allowed">
          <MicOff className="w-5 h-5 text-gray-400" />
        </div>
        <span className="text-xs text-gray-500">
          {t('chatbot.voiceNotSupported')}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <button
        type="button"
        onClick={handleToggleListening}
        disabled={disabled}
        className={`p-2 rounded-full transition-all duration-200 ${
          isListening
            ? 'bg-red-500 hover:bg-red-600 animate-pulse'
            : 'bg-blue-500 hover:bg-blue-600'
        } ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        }`}
        title={isListening ? t('chatbot.stopListening') : t('chatbot.speak')}
      >
        {isListening ? (
          <Volume2 className="w-5 h-5 text-white" />
        ) : (
          <Mic className="w-5 h-5 text-white" />
        )}
      </button>

      {isListening && (
        <div className="flex items-center space-x-2">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
          <span className="text-sm text-red-600 font-medium">
            {t('chatbot.listening')}
          </span>
        </div>
      )}

      {transcript && (
        <div className="bg-blue-50 border border-blue-200 rounded px-3 py-1 max-w-xs">
          <p className="text-sm text-blue-800 truncate">{transcript}</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded px-3 py-1">
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
};

export default VoiceInput;