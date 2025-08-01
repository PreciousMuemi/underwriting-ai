import React, { useState } from 'react';
import { ChatWindow } from './components/ChatWindow';
import { ChatbotFloat } from './components/ChatbotFloat';
import { Shield, Check, Users, Clock } from 'lucide-react';
import './App.css';

function App() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isChatMinimized, setIsChatMinimized] = useState(false);

  const handleChatToggle = () => {
    if (isChatMinimized) {
      setIsChatMinimized(false);
      setIsChatOpen(true);
    } else {
      setIsChatOpen(!isChatOpen);
    }
  };

  const handleChatClose = () => {
    setIsChatOpen(false);
    setIsChatMinimized(false);
  };

  const handleChatMinimize = () => {
    setIsChatOpen(false);
    setIsChatMinimized(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-primary-500 to-secondary-400 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">InsureBot</h1>
                <p className="text-sm text-gray-600">AI-Powered Insurance Assistant</p>
              </div>
            </div>
            <button
              onClick={handleChatToggle}
              className="bg-primary-500 hover:bg-primary-600 text-white px-6 py-2 rounded-lg transition-colors duration-200 flex items-center space-x-2"
            >
              <Shield size={16} />
              <span>Get Quote</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Get Your Personalized Insurance Quote in{' '}
            <span className="text-primary-600">Minutes</span>
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Our AI-powered chatbot makes getting insurance quotes fast, easy, and transparent. 
            Answer a few questions and get an instant personalized quote.
          </p>
          <button
            onClick={handleChatToggle}
            className="bg-gradient-to-r from-primary-500 to-secondary-400 hover:from-primary-600 hover:to-secondary-500 text-white text-lg px-8 py-4 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
          >
            Start Your Quote Now
          </button>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
              <Clock className="w-6 h-6 text-primary-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Quick & Easy</h3>
            <p className="text-gray-600">
              Get your quote in under 5 minutes with our conversational AI assistant.
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="w-12 h-12 bg-secondary-100 rounded-lg flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-secondary-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Personalized</h3>
            <p className="text-gray-600">
              Advanced ML algorithms provide quotes tailored specifically to your profile.
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
              <Check className="w-6 h-6 text-primary-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Transparent</h3>
            <p className="text-gray-600">
              Clear pricing with no hidden fees. Know exactly what you're paying for.
            </p>
          </div>
        </div>

        {/* How it Works */}
        <div className="bg-white rounded-lg p-8 shadow-sm border border-gray-200">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">How It Works</h3>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-500 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                1
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Chat with AI</h4>
              <p className="text-gray-600">
                Answer questions about yourself, your vehicle, and driving history through our friendly chatbot.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-secondary-500 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                2
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">AI Analysis</h4>
              <p className="text-gray-600">
                Our machine learning model analyzes your risk profile using advanced algorithms.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                3
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Get Quote</h4>
              <p className="text-gray-600">
                Receive your personalized insurance quote instantly with detailed risk assessment.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-16">
          <p className="text-lg text-gray-600 mb-4">
            Ready to get started? Click the chatbot icon below! 👇
          </p>
        </div>
      </main>

      {/* Chatbot Components */}
      <ChatbotFloat
        isOpen={isChatOpen}
        isMinimized={isChatMinimized}
        onClick={handleChatToggle}
      />
      
      <ChatWindow
        isOpen={isChatOpen}
        onClose={handleChatClose}
        onMinimize={handleChatMinimize}
      />
    </div>
  );
}

export default App;