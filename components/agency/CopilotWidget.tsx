'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import styles from './copilot-widget.module.css'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const TIPS = [
  "Tip: Ask me to draft client emails.",
  "Did you know? I can summarize your pending credentials.",
  "Tip: Tell me to 'create a new cron job' for weekly reports.",
  "Did you know? I can check your monthly revenue.",
  "Tip: Ask me to list unassigned bookings.",
  "Tip: You can ask me how to scale your agency."
]

const GREETINGS = [
  "You summoned me! What should we conquer today?",
  "Reporting for duty! Ready for your command.",
  "At your service! What's the master plan?",
  "Systems online. How can we scale the agency today?",
  "I'm awake! What's our next strategic move?",
  "Ready when you are! Let's make some magic happen.",
  "Awaiting instructions. How can I lighten your workload today?"
]

export default function CopilotWidget({ orgId }: { orgId: string }) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [currentTip, setCurrentTip] = useState(TIPS[0])
  const [greeting, setGreeting] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setGreeting(GREETINGS[Math.floor(Math.random() * GREETINGS.length)])
  }, [])
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (isOpen) {
      scrollToBottom()
      if (messages.length === 0) {
        fetchHistory()
      }
    }
  }, [isOpen, messages.length])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (loading) {
      interval = setInterval(() => {
        setCurrentTip(TIPS[Math.floor(Math.random() * TIPS.length)])
      }, 4000)
    }
    return () => clearInterval(interval)
  }, [loading])

  const fetchHistory = async () => {
    try {
      const res = await fetch(`/api/ai/chat?orgId=${orgId}`)
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages || [])
      }
    } catch (e) {
      console.error(e)
    }
  }

  const executeSequenceFeedback = async (feedbackText: string, currentMessages: Message[]) => {
    const tempMessages = [...currentMessages, { role: 'user' as const, content: `[System Update]: ${feedbackText}` }];
    setMessages(tempMessages);
    setLoading(true);

    const h1s = Array.from(document.querySelectorAll('h1')).map(el => el.innerText).join(', ');
    const uiContext = `User is currently on path: ${window.location.pathname}` + (h1s ? `. Visible Headings: ${h1s}` : '');

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: tempMessages, orgId, uiContext })
      })
      const data = await res.json()
      if (res.ok && data.message) {
        const finalMessages = [...tempMessages, { role: 'assistant' as const, content: data.message.content }];
        setMessages(finalMessages);
        
        if (data.uiAction) {
          handleUiAction(data.uiAction, finalMessages);
        }
      } else {
        throw new Error(data.error || 'Failed to get response')
      }
    } catch (err: any) {
      setMessages([...tempMessages, { role: 'assistant', content: `**Error:** ${err.message}` }])
    } finally {
      setLoading(false)
    }
  }

  const handleUiAction = (uiAction: any, currentMessages: Message[]) => {
    const { action, selector, value, url } = uiAction;
    if (action === 'redirect' && url) {
      router.push(url);
      // Wait for router push, but state might be lost on full reload. We assume SPA navigation.
      setTimeout(() => executeSequenceFeedback(`Successfully redirected to: ${url}. You may need to wait for the page to load or proceed with the next step.`, currentMessages), 1500);
    } else if (action === 'click' && selector) {
      const el = document.querySelector(selector) as HTMLElement;
      if (el) {
        el.click();
        setTimeout(() => executeSequenceFeedback(`Successfully clicked element: ${selector}. Proceed with the next step if necessary.`, currentMessages), 1000);
      } else {
        setTimeout(() => executeSequenceFeedback(`Failed to find element to click: ${selector}.`, currentMessages), 1000);
      }
    } else if (action === 'fill' && selector && value !== undefined) {
      const el = document.querySelector(selector) as HTMLInputElement;
      if (el) {
        el.value = value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        setTimeout(() => executeSequenceFeedback(`Successfully filled form field: ${selector} with value: ${value}. Proceed with the next step if necessary.`, currentMessages), 1000);
      } else {
        setTimeout(() => executeSequenceFeedback(`Failed to find form field to fill: ${selector}.`, currentMessages), 1000);
      }
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    const newMessages = [...messages, { role: 'user' as const, content: input }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    const h1s = Array.from(document.querySelectorAll('h1')).map(el => el.innerText).join(', ');
    const uiContext = `User is currently on path: ${window.location.pathname}` + (h1s ? `. Visible Headings: ${h1s}` : '');

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, orgId, uiContext })
      })
      const data = await res.json()
      if (res.ok && data.message) {
        const finalMessages = [...newMessages, { role: 'assistant' as const, content: data.message.content }];
        setMessages(finalMessages)
        
        if (data.uiAction) {
          handleUiAction(data.uiAction, finalMessages);
        }
      } else {
        throw new Error(data.error || 'Failed to get response')
      }
    } catch (err: any) {
      setMessages([...newMessages, { role: 'assistant', content: `**Error:** ${err.message}` }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button 
        className={styles.fab} 
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle AI Copilot"
      >
        ✨
      </button>

      {isOpen && (
        <div className={styles.widgetContainer}>
          <div className={styles.header}>
            <div className={styles.headerTitle}>✨ Agency Copilot</div>
            <button className={styles.closeBtn} onClick={() => setIsOpen(false)}>✕</button>
          </div>
          
          <div className={styles.chatArea}>
            {messages.length === 0 && !loading && (
              <div className={styles.emptyState}>
                {greeting}
              </div>
            )}
            
            {messages.map((msg, i) => (
              <div key={i} className={`${styles.message} ${msg.role === 'user' ? styles.userMessage : styles.aiMessage}`}>
                {msg.role === 'assistant' ? (
                  <div className={styles.markdown}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  msg.content
                )}
              </div>
            ))}
            
            {loading && (
              <div className={`${styles.message} ${styles.aiMessage}`}>
                <div className={styles.thinking}>
                  <div className={styles.dots}><span>.</span><span>.</span><span>.</span></div>
                  <div className={styles.tipText}>{currentTip}</div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={sendMessage} className={styles.inputArea}>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask me anything..."
              className={styles.input}
              disabled={loading}
            />
            <button type="submit" disabled={loading || !input.trim()} className={styles.sendBtn}>
              ➤
            </button>
          </form>
        </div>
      )}
    </>
  )
}
