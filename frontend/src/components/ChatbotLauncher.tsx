import React, { useState } from 'react'
import { ChatbotFloat } from './ChatbotFloat'
import { ChatWindow } from './ChatWindow'

const ChatbotLauncher: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)

  const toggleOpen = () => {
    if (isOpen && !isMinimized) {
      // already open as window; do nothing
      return
    }
    setIsOpen(true)
    setIsMinimized(false)
  }

  return (
    <>
      <ChatbotFloat
        isOpen={isOpen}
        isMinimized={isMinimized}
        onClick={toggleOpen}
      />
      <ChatWindow
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onMinimize={() => setIsMinimized((v) => !v)}
      />
    </>
  )
}

export default ChatbotLauncher