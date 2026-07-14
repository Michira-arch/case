'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import styles from './onboarding.module.css'

type Persona = 'service' | 'professional' | 'jobseeker'
type Step = 'persona' | 'name' | 'handle' | 'tagline' | 'did' | 'trained' | 'final'

interface ChatMessage {
  id: string
  sender: 'genie' | 'user'
  text: string
  isTyping?: boolean
}

const PERSONA_DATA = {
  service: {
    label: 'Service provider',
    emoji: '✂️',
    desc: 'Hairstylist, electrician, mechanic, tailor, cook — you book clients and do the work.',
    didPrompt: "What is one thing you are most proud of that you did recently? e.g. a recent job or project you completed.",
    trainedPrompt: 'Where or how did you learn your trade or gain your qualifications?',
    placeholderDid: "e.g. Rewired a 3-bedroom home's electrical",
    placeholderTrained: "e.g. 2-year apprenticeship under James Mwenda",
  },
  professional: {
    label: 'Credentialed professional',
    emoji: '🏥',
    desc: 'Nurse, accountant, engineer, lawyer — your credentials matter and need to be visible.',
    didPrompt: "What is one thing you are most proud of that you did recently? e.g. your most important recent role or responsibility.",
    trainedPrompt: "What is your most important credential, degree, or qualification?",
    placeholderDid: "e.g. Led implementation of nursing care plans in ICU",
    placeholderTrained: "e.g. B.Sc. in Nursing, University of Nairobi",
  },
  jobseeker: {
    label: 'Job seeker',
    emoji: '📋',
    desc: "Looking for employment — you want a recruiter or employer to see exactly what you've done.",
    didPrompt: "What is one thing you are most proud of that you did recently? e.g. the most impressive thing you did at work.",
    trainedPrompt: "What is your highest qualification or most relevant training?",
    placeholderDid: "e.g. Optimized database queries reducing load times by 40%",
    placeholderTrained: "e.g. Certified Scrum Master & AWS Practitioner",
  },
}

function OnboardingPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  // Onboarding steps state
  const [step, setStep] = useState<Step>('persona')
  const [persona, setPersona] = useState<Persona | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [handle, setHandle] = useState('')
  const [handleStatus, setHandleStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')
  const [suggestedHandles, setSuggestedHandles] = useState<string[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [roleLine, setRoleLine] = useState('')
  const [didItem, setDidItem] = useState('')
  const [trainedItem, setTrainedItem] = useState('')
  
  // Submit state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Chat message log state
  const [messages, setMessages] = useState<ChatMessage[]>([])
  
  // Ref for auto-scrolling
  const messageEndRef = useRef<HTMLDivElement>(null)
  
  // Ref for handle check debounce
  const checkHandleRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize conversation
  useEffect(() => {
    setMessages([
      {
        id: 'genie-intro',
        sender: 'genie',
        text: "✨ Jambo! I'm your automated Case setup guide. I am not an AI and cannot understand questions or chat, but I will walk you through building your digital profile in under a minute. Let's start by choosing what best describes your work.",
      }
    ])
  }, [])

  // Auto-scroll on new messages
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Step 1: Handle Persona Selection
  const handleSelectPersona = (selected: Persona) => {
    setPersona(selected)
    
    // User message
    const userMsgId = `user-persona-${Date.now()}`
    setMessages(prev => [
      ...prev,
      {
        id: userMsgId,
        sender: 'user',
        text: `${PERSONA_DATA[selected].label} ${PERSONA_DATA[selected].emoji}`
      }
    ])

    // Genie typing indicator
    const typingId = `typing-name-${Date.now()}`
    setMessages(prev => [...prev, { id: typingId, sender: 'genie', text: '', isTyping: true }])

    setTimeout(() => {
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== typingId)
        return [
          ...filtered,
          {
            id: `genie-name-${Date.now()}`,
            sender: 'genie',
            text: `Excellent. A profile tailored for a ${PERSONA_DATA[selected].label.toLowerCase()} is perfect! Let's get your name. What should we display on your page?`
          }
        ]
      })
      setStep('name')
    }, 750)
  }

  // Step 2: Handle Display Name Submission
  const handleSetName = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!displayName.trim()) return

    // User message
    setMessages(prev => [
      ...prev,
      { id: `user-name-${Date.now()}`, sender: 'user', text: displayName.trim() }
    ])

    // Genie typing indicator
    const typingId = `typing-handle-${Date.now()}`
    setMessages(prev => [...prev, { id: typingId, sender: 'genie', text: '', isTyping: true }])

    // Begin generating handle suggestions from Name
    setLoadingSuggestions(true)
    const suggested = await generateAndCheckHandles(displayName.trim())
    setSuggestedHandles(suggested)
    setLoadingSuggestions(false)

    // Pre-select the first suggestion to make it easy
    if (suggested.length > 0) {
      setHandle(suggested[0])
      setHandleStatus('available')
    }

    setTimeout(() => {
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== typingId)
        return [
          ...filtered,
          {
            id: `genie-handle-${Date.now()}`,
            sender: 'genie',
            text: `Nice to meet you, ${displayName.trim()}! Let's choose your handle. This is your public link: case.app/@yourhandle.\n\nI've checked a few available usernames below. Tap one or type your own!`
          }
        ]
      })
      setStep('handle')
    }, 750)
  }

  // Generate handle suggestions and query Supabase for availability
  const generateAndCheckHandles = async (name: string) => {
    const clean = name.toLowerCase().trim().replace(/[^a-z0-9\s._-]/g, '')
    const parts = clean.split(/\s+/)
    const baseSuggestions: string[] = []

    if (parts.length === 1 && parts[0]) {
      baseSuggestions.push(parts[0])
      baseSuggestions.push(`${parts[0]}254`)
      baseSuggestions.push(`${parts[0]}_`)
    } else if (parts.length >= 2) {
      const first = parts[0]
      const last = parts[parts.length - 1]
      baseSuggestions.push(`${first}.${last}`)
      baseSuggestions.push(`${first}${last}`)
      baseSuggestions.push(`${first.charAt(0)}.${last}`)
      baseSuggestions.push(`${first}.${last.charAt(0)}`)
    }

    let suggestions = Array.from(new Set(baseSuggestions))
      .map(h => h.slice(0, 30))
      .filter(h => h.length >= 3)

    if (suggestions.length === 0) {
      suggestions = ['my.case', 'member', 'member254']
    }

    try {
      const { data } = await supabase
        .from('profiles')
        .select('handle')
        .in('handle', suggestions)

      const taken = new Set(data?.map((p: any) => p.handle) || [])
      let available = suggestions.filter(s => !taken.has(s))

      // If we don't have enough available, fallback & append random numbers
      let counter = 1
      const base = suggestions[0] || 'member'
      while (available.length < 3 && counter < 15) {
        const candidate = `${base}${counter}`.slice(0, 30)
        const { data: check } = await supabase
          .from('profiles')
          .select('id')
          .eq('handle', candidate)
          .maybeSingle()
        if (!check) {
          available.push(candidate)
        }
        counter++
      }

      return available.slice(0, 4)
    } catch (err) {
      console.error('Error generating handles:', err)
      return suggestions.slice(0, 3)
    }
  }

  // Handle Input Verification (debounced check)
  const verifyHandle = (value: string) => {
    const cleaned = value.toLowerCase().replace(/[^a-z0-9._-]/g, '')
    setHandle(cleaned)

    if (cleaned.length < 3) {
      setHandleStatus('idle')
      return
    }

    setHandleStatus('checking')

    if (checkHandleRef.current) {
      clearTimeout(checkHandleRef.current)
    }

    checkHandleRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('handle', cleaned)
        .maybeSingle()

      setHandleStatus(data ? 'taken' : 'available')
    }, 400)
  }

  // Step 3: Handle username submission
  const handleConfirmHandle = (e: React.FormEvent) => {
    e.preventDefault()
    if (handleStatus !== 'available') return

    // User message
    setMessages(prev => [
      ...prev,
      { id: `user-handle-${Date.now()}`, sender: 'user', text: `@${handle}` }
    ])

    // Genie typing indicator
    const typingId = `typing-tagline-${Date.now()}`
    setMessages(prev => [...prev, { id: typingId, sender: 'genie', text: '', isTyping: true }])

    setTimeout(() => {
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== typingId)
        return [
          ...filtered,
          {
            id: `genie-tagline-${Date.now()}`,
            sender: 'genie',
            text: `Perfect! Next up, let's write a quick headline or tagline. What is your current role or what do you offer? (e.g. "${
              persona === 'service'
                ? 'Freelance hairstylist & braider · Nairobi'
                : persona === 'professional'
                ? 'ICU Nurse Practitioner · Aga Khan'
                : 'Software engineer seeking frontend roles'
            }")`
          }
        ]
      })
      setStep('tagline')
    }, 750)
  }

  // Step 4: Tagline submission
  const handleConfirmTagline = (e?: React.FormEvent, isSkip = false) => {
    if (e) e.preventDefault()
    
    const value = isSkip ? '' : roleLine.trim()
    setRoleLine(value)

    // User message
    setMessages(prev => [
      ...prev,
      { id: `user-tagline-${Date.now()}`, sender: 'user', text: isSkip ? 'Skipped tagline' : value }
    ])

    // Genie typing indicator
    const typingId = `typing-did-${Date.now()}`
    setMessages(prev => [...prev, { id: typingId, sender: 'genie', text: '', isTyping: true }])

    setTimeout(() => {
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== typingId)
        const promptText = persona ? PERSONA_DATA[persona].didPrompt : "What is one thing you are most proud of that you did recently?"
        return [
          ...filtered,
          {
            id: `genie-did-${Date.now()}`,
            sender: 'genie',
            text: `Got it. A great profile needs proof of work! Let's start with a "did" item. ${promptText}`
          }
        ]
      })
      setStep('did')
    }, 750)
  }

  // Step 5: Did Item submission
  const handleConfirmDid = (e: React.FormEvent) => {
    e.preventDefault()
    if (!didItem.trim()) return

    // User message
    setMessages(prev => [
      ...prev,
      { id: `user-did-${Date.now()}`, sender: 'user', text: didItem.trim() }
    ])

    // Genie typing indicator
    const typingId = `typing-trained-${Date.now()}`
    setMessages(prev => [...prev, { id: typingId, sender: 'genie', text: '', isTyping: true }])

    setTimeout(() => {
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== typingId)
        const promptText = persona ? PERSONA_DATA[persona].trainedPrompt : "Where or how did you learn your trade?"
        return [
          ...filtered,
          {
            id: `genie-trained-${Date.now()}`,
            sender: 'genie',
            text: `Excellent. Now, let's add a "trained" item so clients see your qualifications. ${promptText}`
          }
        ]
      })
      setStep('trained')
    }, 750)
  }

  // Step 6: Trained Item submission
  const handleConfirmTrained = (e?: React.FormEvent, isSkip = false) => {
    if (e) e.preventDefault()

    const value = isSkip ? '' : trainedItem.trim()
    setTrainedItem(value)

    // User message
    setMessages(prev => [
      ...prev,
      { id: `user-trained-${Date.now()}`, sender: 'user', text: isSkip ? 'Skipped credentials' : value }
    ])

    // Genie typing indicator
    const typingId = `typing-final-${Date.now()}`
    setMessages(prev => [...prev, { id: typingId, sender: 'genie', text: '', isTyping: true }])

    setTimeout(() => {
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== typingId)
        return [
          ...filtered,
          {
            id: `genie-final-${Date.now()}`,
            sender: 'genie',
            text: "All set! We have everything we need to build your brand new Case page. Ready to launch?"
          }
        ]
      })
      setStep('final')
    }, 750)
  }

  // Go back to the previous step in the conversation
  const handleGoBack = () => {
    setError('')
    if (step === 'name') {
      setPersona(null)
      setStep('persona')
      setMessages(prev => prev.slice(0, 1))
    } else if (step === 'handle') {
      setDisplayName('')
      setStep('name')
      setMessages(prev => prev.slice(0, 3))
    } else if (step === 'tagline') {
      setStep('handle')
      setMessages(prev => prev.slice(0, 5))
    } else if (step === 'did') {
      setRoleLine('')
      setStep('tagline')
      setMessages(prev => prev.slice(0, 7))
    } else if (step === 'trained') {
      setDidItem('')
      setStep('did')
      setMessages(prev => prev.slice(0, 9))
    } else if (step === 'final') {
      setTrainedItem('')
      setStep('trained')
      setMessages(prev => prev.slice(0, 11))
    }
  }

  // Final Action: Insert into Supabase and Redirect to Dashboard
  const handleCreateProfile = async () => {
    if (!persona || !handle || !displayName || handleStatus !== 'available') return
    setLoading(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Create profile
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .insert({
          owner_id: user.id,
          handle,
          persona,
          display_name: displayName,
          role_line: roleLine,
        })
        .select()
        .single()

      if (profileErr) throw profileErr

      // Seed proof items
      const seeds = []
      if (didItem.trim()) {
        seeds.push({ profile_id: profile.id, pillar: 'did', title: didItem.trim() })
      }
      if (trainedItem.trim()) {
        seeds.push({ profile_id: profile.id, pillar: 'trained', title: trainedItem.trim() })
      }

      if (seeds.length > 0) {
        await supabase.from('proof_items').insert(seeds)
      }

      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'An error occurred while creating your profile.')
    } finally {
      setLoading(false)
    }
  }

  // Compute active step percentage
  const getProgressPercentage = () => {
    switch (step) {
      case 'persona': return 15
      case 'name': return 30
      case 'handle': return 50
      case 'tagline': return 65
      case 'did': return 80
      case 'trained': return 92
      case 'final': return 100
      default: return 0
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.chatBox}>
        {/* Non-AI Disclaimer Banner */}
        <div className={styles.disclaimerBanner}>
          🤖 Automated Step-by-Step Wizard (Not AI). Follow the prompts to build your profile.
        </div>
        {/* Progress Bar Header */}
        <div className={styles.chatHeader}>
          <div className={styles.headerTitle}>
            <span className={styles.genieIcon}>🧞</span>
            <div>
              <h3>Case Guide</h3>
              <p>Automated Setup Wizard (Not AI)</p>
            </div>
          </div>
          <div className={styles.progressContainer}>
            <div 
              className={styles.progressBar} 
              style={{ width: `${getProgressPercentage()}%` }} 
            />
          </div>
        </div>

        {/* Message Log */}
        <div className={styles.messageLog}>
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`${styles.messageWrapper} ${msg.sender === 'user' ? styles.userWrapper : styles.genieWrapper}`}
            >
              {msg.sender === 'genie' && (
                <div className={styles.avatar}>🧞</div>
              )}
              <div 
                className={`${styles.bubble} ${msg.sender === 'user' ? styles.userBubble : styles.genieBubble}`}
              >
                {msg.isTyping ? (
                  <div className={styles.typingIndicator}>
                    <span className={styles.typingDot}></span>
                    <span className={styles.typingDot}></span>
                    <span className={styles.typingDot}></span>
                  </div>
                ) : (
                  <p className={styles.bubbleText}>{msg.text}</p>
                )}
              </div>
            </div>
          ))}
          <div ref={messageEndRef} />
        </div>

        {/* Error Notice */}
        {error && (
          <div className={styles.errorNotice}>
            <span>⚠️ {error}</span>
          </div>
        )}

        {/* Active Input Panel */}
        <div className={styles.inputPanel}>
          {/* STEP 1: Persona */}
          {step === 'persona' && (
            <div className={styles.personaOptionList}>
              {(Object.entries(PERSONA_DATA) as [Persona, typeof PERSONA_DATA.service][]).map(([key, data]) => (
                <button
                  key={key}
                  type="button"
                  className={styles.personaOptionCard}
                  onClick={() => handleSelectPersona(key)}
                >
                  <span className={styles.personaEmoji}>{data.emoji}</span>
                  <div className={styles.personaOptionDetails}>
                    <span className={styles.personaLabel}>{data.label}</span>
                    <span className={styles.personaDesc}>{data.desc}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* STEP 2: Display Name */}
          {step === 'name' && (
            <form onSubmit={handleSetName} className={styles.inputForm}>
              <div className={styles.inputWrapper}>
                <input
                  type="text"
                  className={styles.textInput}
                  placeholder="e.g. Aisha Njoroge"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  autoFocus
                  required
                />
                <button 
                  type="submit" 
                  className={styles.sendButton}
                  disabled={!displayName.trim()}
                >
                  Confirm ➔
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: Handle Selection */}
          {step === 'handle' && (
            <div className={styles.handlePanel}>
              {suggestedHandles.length > 0 && (
                <div className={styles.suggestionsContainer}>
                  <p className={styles.suggestionTitle}>Suggested available handles:</p>
                  <div className={styles.suggestionsList}>
                    {suggestedHandles.map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        className={`${styles.suggestionChip} ${handle === sug ? styles.activeChip : ''}`}
                        onClick={() => {
                          setHandle(sug)
                          setHandleStatus('available')
                        }}
                      >
                        @{sug}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <form onSubmit={handleConfirmHandle} className={styles.inputForm}>
                <div className={styles.handleInputContainer}>
                  <span className={styles.handleAtPrefix}>@</span>
                  <input
                    type="text"
                    className={styles.handleTextInput}
                    placeholder="yourhandle"
                    value={handle}
                    onChange={(e) => verifyHandle(e.target.value)}
                    maxLength={30}
                    required
                  />
                </div>

                <div className={styles.handleStatusLine}>
                  {handleStatus === 'checking' && (
                    <span className={styles.statusChecking}>🔍 Checking availability...</span>
                  )}
                  {handleStatus === 'available' && (
                    <span className={styles.statusAvailable}>✓ Available! Your link: case.app/@{handle}</span>
                  )}
                  {handleStatus === 'taken' && (
                    <span className={styles.statusTaken}>✗ Already taken. Try another</span>
                  )}
                  {handleStatus === 'idle' && handle.length > 0 && handle.length < 3 && (
                    <span className={styles.statusTaken}>Must be at least 3 characters</span>
                  )}
                </div>

                <button 
                  type="submit" 
                  className={styles.fullWidthButton}
                  disabled={handleStatus !== 'available'}
                >
                  Secure Handle ➔
                </button>
              </form>
            </div>
          )}

          {/* STEP 4: Tagline */}
          {step === 'tagline' && (
            <form onSubmit={(e) => handleConfirmTagline(e, false)} className={styles.inputForm}>
              <div className={styles.inputWrapper}>
                <input
                  type="text"
                  className={styles.textInput}
                  placeholder={
                    persona === 'service'
                      ? 'e.g. Freelance hairstylist & braider · Nairobi'
                      : persona === 'professional'
                      ? 'e.g. Accountant & Auditor'
                      : 'e.g. Web Developer searching for full-time work'
                  }
                  value={roleLine}
                  onChange={(e) => setRoleLine(e.target.value)}
                  autoFocus
                />
                <button 
                  type="submit" 
                  className={styles.sendButton}
                  disabled={!roleLine.trim()}
                >
                  Save ➔
                </button>
              </div>
              <button
                type="button"
                className={styles.skipButton}
                onClick={(e) => handleConfirmTagline(undefined, true)}
              >
                Skip tagline
              </button>
            </form>
          )}

          {/* STEP 5: Did Item */}
          {step === 'did' && persona && (
            <form onSubmit={handleConfirmDid} className={styles.inputForm}>
              <div className={styles.inputLabelLine}>
                <span className="stamp stamp--did">did</span>
              </div>
              <div className={styles.inputWrapper}>
                <input
                  type="text"
                  className={styles.textInput}
                  placeholder={PERSONA_DATA[persona].placeholderDid}
                  value={didItem}
                  onChange={(e) => setDidItem(e.target.value)}
                  autoFocus
                  required
                />
                <button 
                  type="submit" 
                  className={styles.sendButton}
                  disabled={!didItem.trim()}
                >
                  Add Proof ➔
                </button>
              </div>
            </form>
          )}

          {/* STEP 6: Trained Item */}
          {step === 'trained' && persona && (
            <form onSubmit={(e) => handleConfirmTrained(e, false)} className={styles.inputForm}>
              <div className={styles.inputLabelLine}>
                <span className="stamp stamp--trained">trained</span>
              </div>
              <div className={styles.inputWrapper}>
                <input
                  type="text"
                  className={styles.textInput}
                  placeholder={PERSONA_DATA[persona].placeholderTrained}
                  value={trainedItem}
                  onChange={(e) => setTrainedItem(e.target.value)}
                  autoFocus
                />
                <button 
                  type="submit" 
                  className={styles.sendButton}
                  disabled={!trainedItem.trim()}
                >
                  Add Qualification ➔
                </button>
              </div>
              <button
                type="button"
                className={styles.skipButton}
                onClick={(e) => handleConfirmTrained(undefined, true)}
              >
                Skip credentials
              </button>
            </form>
          )}

          {/* STEP 7: Final Submission */}
          {step === 'final' && (
            <div className={styles.finalPanel}>
              <button
                type="button"
                className={styles.publishButton}
                onClick={handleCreateProfile}
                disabled={loading}
              >
                {loading ? 'Building your profile...' : 'Build My Case Profile 🚀'}
              </button>
            </div>
          )}

          {/* Back button to revert previous step */}
          {step !== 'persona' && (
            <button
              type="button"
              className={styles.backStepButton}
              onClick={handleGoBack}
              disabled={loading}
            >
              ← Back to previous question
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="spinner" style={{ margin: '100px auto' }} />}>
      <OnboardingPageContent />
    </Suspense>
  )
}
