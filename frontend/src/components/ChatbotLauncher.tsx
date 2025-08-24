import React, { useEffect, useState } from 'react'
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

  // Auto-open when returning from KYC or other flows that set a flag
  useEffect(() => {
    try {
      const flag = localStorage.getItem('openChatOnReturn')
      if (flag === '1') {
        setIsOpen(true)
        setIsMinimized(false)
        localStorage.removeItem('openChatOnReturn')
      }
    } catch {}
  }, [])

  // Also support a direct event to open the chat
  useEffect(() => {
    const handler = () => {
      setIsOpen(true)
      setIsMinimized(false)
    }
    window.addEventListener('open-floating-chat', handler as EventListener)
    return () => window.removeEventListener('open-floating-chat', handler as EventListener)
  }, [])

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