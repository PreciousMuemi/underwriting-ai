import React, { useState } from 'react';

const ChatbotInterface: React.FC = () => {
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (input.trim() === '') return;
    setMessages([...messages, input]);
    setInput('');
  };

  return (
    <div className="max-w-3xl mx-auto p-4 bg-white rounded shadow flex flex-col h-full">
      <h2 className="text-2xl mb-4">Chatbot Interface</h2>
      <div className="flex-grow overflow-auto border rounded p-4 mb-4">
        {messages.length === 0 ? (
          <p>No messages yet. Start the conversation!</p>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className="mb-2 p-2 bg-gray-100 rounded">
              {msg}
            </div>
          ))
        )}
      </div>
      <div className="flex">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-grow border rounded px-3 py-2 mr-2"
          placeholder="Type your message..."
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
