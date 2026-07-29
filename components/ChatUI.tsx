'use client'

import { useState, useEffect, useRef } from 'react'
import { sendChatMessage, getChatMessages } from '@/lib/actions/chat-actions'
import { createBrowserClient } from '@supabase/ssr'

interface ChatUIProps {
  clientId: string
  orgId: string
  senderType: 'agency' | 'client'
  senderId?: string
}

export default function ChatUI({ 
  clientId, 
  orgId, 
  senderType, 
  senderId 
}: ChatUIProps): JSX.Element {
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const fetchMessages = async () => {
    try {
      const data = await getChatMessages(clientId)
      setMessages(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMessages()
    
    // Poll for new messages every 5 seconds (works for both auth'd agency and anon client)
    const interval = setInterval(() => {
      fetchMessages()
    }, 5000)

    return () => {
      clearInterval(interval)
    }
  }, [clientId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!newMessage.trim() || sending) return

    setSending(true)
    try {
      await sendChatMessage({
        clientId,
        orgId,
        message: newMessage,
        senderType,
        senderId
      })
      setNewMessage('')
      fetchMessages()
    } catch (err) {
      console.error(err)
      alert('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return <div className="p-4 text-center">Loading chat...</div>
  }

  return (
    <div className="flex flex-col h-[500px] border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 font-semibold text-gray-700">
        Messages
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 text-sm mt-10">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_type === senderType
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div 
                  className={`max-w-[75%] px-4 py-2 rounded-2xl ${
                    isMe 
                      ? 'bg-blue-600 text-white rounded-br-none' 
                      : 'bg-gray-200 text-gray-800 rounded-bl-none'
                  }`}
                >
                  <div className="text-sm">{msg.message}</div>
                  <div className={`text-[10px] mt-1 ${isMe ? 'text-blue-100' : 'text-gray-500'} text-right`}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="bg-white border-t border-gray-200 p-3">
        <form onSubmit={handleSend} className="flex gap-2">
          <input 
            type="text" 
            className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            placeholder="Type your message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={sending}
          />
          <button 
            type="submit" 
            disabled={sending || !newMessage.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-5 py-2 font-medium text-sm transition-colors disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  )
}
