'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

export default function AICustomizationPage() {
  const supabase = createClient()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [draftHtml, setDraftHtml] = useState('')
  const [isCustomPage, setIsCustomPage] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [showChatOnMobile, setShowChatOnMobile] = useState(true)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (!mobile) setShowChatOnMobile(true)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('profiles')
        .select('draft_html, custom_html, is_custom_page')
        .eq('owner_id', user.id)
        .single()

      if (data) {
        if (data.draft_html) {
          setDraftHtml(data.draft_html)
        } else if (data.custom_html) {
          setDraftHtml(data.custom_html)
        }
        setIsCustomPage(data.is_custom_page || false)
      }
    }
    loadProfile()
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim()) return

    const newMessages: Message[] = [...messages, { role: 'user', content: input }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/ai/customize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages })
      })

      if (!res.ok) {
        throw new Error(await res.text())
      }

      const data = await res.json()
      
      setMessages([...newMessages, { role: 'assistant', content: "I've updated your layout! Check the preview on the right." }])
      
      if (data.html) {
        setDraftHtml(data.html)
        
        // Save draft to DB
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase
            .from('profiles')
            .update({ draft_html: data.html })
            .eq('owner_id', user.id)
        }
      }
    } catch (err: any) {
      setMessages([...newMessages, { role: 'assistant', content: `Error: ${err.message}` }])
    } finally {
      setLoading(false)
    }
  }

  const handlePublish = async () => {
    setPublishing(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await supabase
        .from('profiles')
        .update({
          custom_html: draftHtml,
          is_custom_page: true
        })
        .eq('owner_id', user.id)
        
      setIsCustomPage(true)
      alert("Published successfully!")
    } catch (err: any) {
      alert(`Publish failed: ${err.message}`)
    } finally {
      setPublishing(false)
    }
  }
  
  const handleRevert = async () => {
    setPublishing(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await supabase
        .from('profiles')
        .update({
          is_custom_page: false
        })
        .eq('owner_id', user.id)
        
      setIsCustomPage(false)
      alert("Reverted to default layout.")
    } catch (err: any) {
      alert(`Revert failed: ${err.message}`)
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', flexDirection: 'column' }}>
      <header style={{ padding: '16px 24px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link href="/dashboard/settings" className="btn btn--outline btn--sm">← Back</Link>
          <h1 style={{ fontSize: '18px', margin: 0 }}>AI Customization</h1>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {isCustomPage && (
             <button className="btn btn--outline btn--sm" onClick={handleRevert} disabled={publishing}>
               Disable Custom Layout
             </button>
          )}
          <button className="btn btn--dark btn--sm" onClick={handlePublish} disabled={publishing || !draftHtml}>
            {publishing ? 'Publishing...' : 'Publish to Live'}
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        {/* Chat Left Side (or Drawer on mobile) */}
        <div style={{ 
          width: isMobile ? '100%' : '400px', 
          borderRight: isMobile ? 'none' : '1px solid var(--line)', 
          display: showChatOnMobile ? 'flex' : 'none', 
          flexDirection: 'column', 
          backgroundColor: 'var(--paper-light)',
          position: isMobile ? 'absolute' : 'relative',
          top: 0, bottom: 0, left: 0, zIndex: 10
        }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {messages.length === 0 && (
              <div style={{ color: 'var(--ink-soft)', fontSize: '14px', textAlign: 'center', marginTop: '40px' }}>
                Describe how you want your website to look! Try "Make it dark mode with neon green accents" or "Create a minimal layout with a large hero section."
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} style={{ 
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                backgroundColor: m.role === 'user' ? 'var(--ink)' : 'var(--card)',
                color: m.role === 'user' ? 'var(--paper)' : 'var(--ink)',
                padding: '10px 14px',
                borderRadius: '8px',
                maxWidth: '85%',
                fontSize: '14px',
                border: m.role === 'assistant' ? '1px solid var(--line)' : 'none'
              }}>
                {m.content}
              </div>
            ))}
            {loading && (
              <div style={{ alignSelf: 'flex-start', backgroundColor: 'var(--card)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--line)', fontSize: '14px' }}>
                Generating...
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          
          <div style={{ padding: '16px', borderTop: '1px solid var(--line)', backgroundColor: 'var(--paper)' }}>
            <textarea 
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder="E.g. Change the background to dark blue..."
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--line)', resize: 'none', minHeight: '60px', fontFamily: 'inherit', fontSize: '14px' }}
            />
            <button 
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="btn btn--dark"
              style={{ width: '100%', marginTop: '8px' }}
            >
              Send
            </button>
          </div>
        </div>

        {/* Preview Right Side */}
        <div style={{ flex: 1, backgroundColor: '#f0f0f0', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
          {draftHtml ? (
            <iframe 
              srcDoc={draftHtml}
              sandbox="allow-scripts allow-same-origin"
              style={{ width: '100%', height: '100%', border: 'none', backgroundColor: '#fff' }}
            />
          ) : (
            <div style={{ color: '#888' }}>No preview available yet. Chat to generate a design!</div>
          )}
          
          {/* Mobile Toggle Button */}
          {isMobile && (
            <button 
              onClick={() => setShowChatOnMobile(!showChatOnMobile)}
              className="btn btn--dark"
              style={{ 
                position: 'absolute', 
                bottom: '24px', 
                right: '24px', 
                zIndex: 20,
                borderRadius: '50px',
                padding: '12px 24px',
                boxShadow: 'var(--shadow-lg)'
              }}
            >
              {showChatOnMobile ? 'Hide Chat' : 'Open Chat'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
