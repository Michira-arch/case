'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import type { NannyOrg } from '@/lib/nanny-types'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

export default function AgencyAICustomizationPage() {
  const supabase = createClient()
  const [org, setOrg] = useState<NannyOrg | null>(null)
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
    const loadOrg = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('owner_id', user.id)
        .single()

      if (!profile) return

      const { data: orgData } = await supabase
        .from('nanny_orgs')
        .select('*')
        .eq('owner_profile_id', profile.id)
        .limit(1)
        .single()

      if (orgData) {
        setOrg(orgData as NannyOrg)
        const config = orgData.page_config as any
        if (config?.draft_html) setDraftHtml(config.draft_html)
        else if (config?.custom_html) setDraftHtml(config.custom_html)
        setIsCustomPage(config?.is_custom_page || false)
      }
    }
    loadOrg()
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || !org) return

    const newMessages: Message[] = [...messages, { role: 'user', content: input }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/ai/customize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, orgId: org.id })
      })

      if (!res.ok) {
        throw new Error(await res.text())
      }

      const data = await res.json()
      
      setMessages([...newMessages, { role: 'assistant', content: "I've updated your layout! Check the preview on the right." }])
      
      if (data.html) {
        setDraftHtml(data.html)
        
        // Save draft to DB
        const currentConfig = org.page_config || {}
        const newConfig = { ...currentConfig, draft_html: data.html }
        await supabase
          .from('nanny_orgs')
          .update({ page_config: newConfig })
          .eq('id', org.id)
        
        setOrg({ ...org, page_config: newConfig })
      }
    } catch (err: any) {
      setMessages([...newMessages, { role: 'assistant', content: `Error: ${err.message}` }])
    } finally {
      setLoading(false)
    }
  }

  const handlePublish = async () => {
    if (!draftHtml || !org) return
    setPublishing(true)
    try {
      const currentConfig = org.page_config || {}
      const newConfig = { ...currentConfig, custom_html: draftHtml, is_custom_page: true }
      await supabase
        .from('nanny_orgs')
        .update({ page_config: newConfig })
        .eq('id', org.id)
      setIsCustomPage(true)
      setOrg({ ...org, page_config: newConfig })
    } catch (err) {
      console.error(err)
    } finally {
      setPublishing(false)
    }
  }

  const handleRevert = async () => {
    if (!org) return
    setPublishing(true)
    try {
      const currentConfig = org.page_config || {}
      const newConfig = { ...currentConfig, is_custom_page: false }
      await supabase
        .from('nanny_orgs')
        .update({ page_config: newConfig })
        .eq('id', org.id)
      setIsCustomPage(false)
      setOrg({ ...org, page_config: newConfig })
    } catch (err) {
      console.error(err)
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', background: 'var(--paper)', overflow: 'hidden' }}>
      
      {/* Mobile Drawer Toggle */}
      {isMobile && (
        <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 100 }}>
          <button 
            className="btn btn--brass"
            style={{ borderRadius: 999, boxShadow: 'var(--shadow-lg)' }}
            onClick={() => setShowChatOnMobile(!showChatOnMobile)}
          >
            {showChatOnMobile ? '👀 View Preview' : '💬 Open Chat'}
          </button>
        </div>
      )}

      {/* Chat Sidebar */}
      <div style={{ 
        width: isMobile ? '100%' : '350px', 
        borderRight: '1px solid var(--line)', 
        display: (isMobile && !showChatOnMobile) ? 'none' : 'flex', 
        flexDirection: 'column', 
        background: 'var(--paper-light)',
        position: isMobile ? 'absolute' : 'relative',
        height: '100%',
        zIndex: 50
      }}>
        <div style={{ padding: '20px', borderBottom: '1px solid var(--line)', background: 'var(--paper)' }}>
          <Link href="/dashboard/agency/nanny/settings" className="btn btn--outline btn--sm" style={{ marginBottom: 16 }}>← Back to Settings</Link>
          <h2 style={{ fontSize: 18, fontWeight: 600 }}>Agency Designer</h2>
          <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 4 }}>
            Chat with AI to design your public agency page. Ask for specific layouts, colors, or vibes.
          </p>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--ink-soft)', fontSize: 14, marginTop: 40 }}>
              <p>Try saying:</p>
              <ul style={{ listStyle: 'none', padding: 0, marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <li style={{ background: 'var(--card)', padding: '10px 16px', borderRadius: 8, border: '1px solid var(--line)', cursor: 'pointer' }} onClick={() => setInput("Make it look like a luxury hotel booking site")}>
                  "Make it look like a luxury hotel booking site"
                </li>
                <li style={{ background: 'var(--card)', padding: '10px 16px', borderRadius: 8, border: '1px solid var(--line)', cursor: 'pointer' }} onClick={() => setInput("Use a dark mode theme with neon blue accents")}>
                  "Use a dark mode theme with neon blue accents"
                </li>
              </ul>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} style={{ 
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              background: m.role === 'user' ? 'var(--brass)' : 'var(--card)',
              color: m.role === 'user' ? '#000' : 'var(--ink)',
              padding: '10px 14px',
              borderRadius: 12,
              maxWidth: '85%',
              border: m.role === 'assistant' ? '1px solid var(--line)' : 'none',
              fontSize: 14,
              lineHeight: 1.5
            }}>
              {m.content}
            </div>
          ))}
          {loading && (
            <div style={{ alignSelf: 'flex-start', color: 'var(--ink-soft)', fontSize: 14 }}>
              AI is designing...
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
            placeholder="Describe your design..."
            style={{ 
              width: '100%', 
              padding: '12px', 
              borderRadius: 8, 
              border: '1px solid var(--line)',
              background: 'var(--card)',
              color: 'var(--ink)',
              resize: 'none',
              height: 80,
              fontFamily: 'inherit',
              marginBottom: 12
            }}
          />
          <button 
            className="btn btn--brass" 
            style={{ width: '100%' }}
            onClick={handleSend}
            disabled={loading || !input.trim()}
          >
            {loading ? 'Working...' : 'Send'}
          </button>
        </div>
      </div>

      {/* Preview Area */}
      <div style={{ 
        flex: 1, 
        background: '#f1f1f1', 
        display: (isMobile && showChatOnMobile) ? 'none' : 'flex', 
        flexDirection: 'column' 
      }}>
        <div style={{ padding: '12px 24px', background: 'var(--paper)', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>Live Preview</div>
            {isCustomPage ? (
              <span style={{ fontSize: 12, background: 'var(--verified-bg)', color: 'var(--verified)', padding: '2px 8px', borderRadius: 999 }}>Active</span>
            ) : (
              <span style={{ fontSize: 12, background: 'var(--aim-bg)', color: 'var(--aim)', padding: '2px 8px', borderRadius: 999 }}>Standard Layout Active</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {isCustomPage && (
              <button className="btn btn--outline btn--sm" onClick={handleRevert} disabled={publishing}>
                Revert to Standard
              </button>
            )}
            <button className="btn btn--brass btn--sm" onClick={handlePublish} disabled={publishing || !draftHtml}>
              {publishing ? 'Publishing...' : 'Publish Custom Design'}
            </button>
          </div>
        </div>
        <div style={{ flex: 1, padding: '20px', display: 'flex', justifyContent: 'center' }}>
          <div style={{ 
            width: '100%', 
            maxWidth: 1200, 
            height: '100%', 
            background: '#fff', 
            borderRadius: 8, 
            boxShadow: '0 4px 20px rgba(0,0,0,0.05)', 
            overflow: 'hidden' 
          }}>
            {draftHtml ? (
              <iframe 
                srcDoc={draftHtml} 
                style={{ width: '100%', height: '100%', border: 'none' }}
                title="Preview"
              />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-muted)' }}>
                Your custom design preview will appear here.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
