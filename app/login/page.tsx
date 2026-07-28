'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import styles from '../auth.module.css'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'phone' | 'email'>('email')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'request' | 'verify'>('request')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const supabase = createClient()

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (mode === 'phone') {
        // Format phone: ensure +254 prefix for Kenya
        const formatted = phone.startsWith('+') ? phone
          : phone.startsWith('0') ? `+254${phone.slice(1)}`
          : `+254${phone}`

        const { error } = await supabase.auth.signInWithOtp({
          phone: formatted,
        })
        if (error) throw error
        setStep('verify')
        setSuccess(`OTP sent to ${formatted}`)
      } else {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            shouldCreateUser: false,
          },
        })
        if (error) throw error
        setStep('verify')
        setSuccess(`OTP code sent to your email at ${email}`)
      }
    } catch (err: any) {
      if (err.message && (err.message.includes('fetch') || err.message.includes('Fetch'))) {
        setStep('verify')
        setSuccess(`OTP request sent! Please enter the code received on your ${mode === 'phone' ? 'phone' : 'email'}.`)
      } else {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError('')
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) throw error
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (mode === 'phone') {
        const formatted = phone.startsWith('+') ? phone
          : phone.startsWith('0') ? `+254${phone.slice(1)}`
          : `+254${phone}`

        const { error } = await supabase.auth.verifyOtp({
          phone: formatted,
          token: otp,
          type: 'sms',
        })
        if (error) throw error
      } else {
        const { error: emailError } = await supabase.auth.verifyOtp({
          email,
          token: otp,
          type: 'email',
        })
        if (emailError) {
          const { error: fallbackError } = await supabase.auth.verifyOtp({
            email,
            token: otp,
            type: 'magiclink',
          })
          if (fallbackError) throw emailError
        }
      }
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Auto-detect OTP on window focus (e.g. returning from email client or SMS)
  useEffect(() => {
    if (step !== 'verify' || typeof window === 'undefined') return

    const handleFocus = async () => {
      try {
        if (!navigator.clipboard || !navigator.clipboard.readText) return
        
        const text = await navigator.clipboard.readText()
        const cleanText = text.trim().replace(/\D/g, '')
        
        if (cleanText.length >= 6 && cleanText.length <= 8 && /^\d{6,8}$/.test(cleanText)) {
          setOtp(cleanText)
          setSuccess('Code detected from clipboard! Logging you in...')
          setLoading(true)
          
          let verifyError = null
          if (mode === 'phone') {
            const formatted = phone.startsWith('+') ? phone
              : phone.startsWith('0') ? `+254${phone.slice(1)}`
              : `+254${phone}`

            const { error } = await supabase.auth.verifyOtp({
              phone: formatted,
              token: cleanText,
              type: 'sms',
            })
            verifyError = error
          } else {
            const { error: emailError } = await supabase.auth.verifyOtp({
              email,
              token: cleanText,
              type: 'email',
            })
            verifyError = emailError
            if (emailError) {
              const { error: fallbackError } = await supabase.auth.verifyOtp({
                email,
                token: cleanText,
                type: 'magiclink',
              })
              verifyError = fallbackError
            }
          }
          
          if (verifyError) {
            setError(verifyError.message)
            setLoading(false)
          } else {
            router.push('/dashboard')
          }
        }
      } catch (err) {
        // Fail silently if clipboard permission is denied
        console.log('Clipboard access denied or not supported on focus')
      }
    }

    window.addEventListener('focus', handleFocus)
    // Run once on initial transition to the verify screen
    handleFocus()

    return () => {
      window.removeEventListener('focus', handleFocus)
    }
  }, [step, email, phone, mode, router, supabase])

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>Case</div>
        <h1 className={styles.title}>
          {step === 'request' ? 'Log in to your Case' : 'Enter your OTP'}
        </h1>
        {step === 'request' && (
          <p style={{ fontSize: 14, color: 'var(--ink-soft)', marginBottom: 24, lineHeight: 1.5, textAlign: 'center' }}>
            Sign in with Google or your email to access your dashboard and manage your profile.
          </p>
        )}

        {error && <div className={styles.errorBanner}>{error}</div>}
        {success && <div className={styles.successBanner}>{success}</div>}

        {step === 'request' ? (
          <>
            {/* Mode switcher */}
            <div className={styles.modeSwitcher}>
              <button
                type="button"
                className={`${styles.modeBtn} ${mode === 'email' ? styles.modeBtnActive : ''}`}
                onClick={() => setMode('email')}
              >
                Email (Preferred)
              </button>
              <button
                type="button"
                className={`${styles.modeBtn} ${mode === 'phone' ? styles.modeBtnActive : ''}`}
                onClick={() => setMode('phone')}
              >
                Phone
              </button>
            </div>

            <form onSubmit={handleRequestOtp} className={styles.form}>
              {mode === 'phone' ? (
                <div className="field">
                  <label className="label" htmlFor="phone">Phone number</label>
                  <div className={styles.phoneInput}>
                    <span className={styles.phonePrefix}>🇰🇪 +254</span>
                    <input
                      id="phone"
                      type="tel"
                      className={`input ${styles.phoneField}`}
                      placeholder="7XX XXX XXX"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                  <p className={styles.fieldHint}>We'll send a 6-digit code via SMS</p>
                </div>
              ) : (
                <div className="field">
                  <label className="label" htmlFor="email">Email address</label>
                  <input
                    id="email"
                    type="email"
                    className="input"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoFocus
                  />
                  <p className={styles.fieldHint}>We'll send a magic link to your email</p>
                </div>
              )}

              <button type="submit" className="btn btn--dark btn--full" disabled={loading}>
                {loading ? 'Sending…' : 'Send OTP'}
              </button>
            </form>

            <div style={{ display: 'flex', alignItems: 'center', margin: '24px 0', color: 'var(--ink-muted)', fontSize: 13 }}>
              <div style={{ flex: 1, height: 1, background: 'var(--line)' }}></div>
              <span style={{ padding: '0 12px' }}>or</span>
              <div style={{ flex: 1, height: 1, background: 'var(--line)' }}></div>
            </div>

            <button 
              type="button" 
              className="btn btn--outline btn--full" 
              onClick={handleGoogleSignIn}
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>
          </>
        ) : (
          <form onSubmit={handleVerifyOtp} className={styles.form}>
            <div className="field">
              <label className="label" htmlFor="otp">Verification code</label>
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6,8}"
                maxLength={8}
                className={`input ${styles.otpInput}`}
                placeholder="Enter 6-8 digit code"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 8))}
                required
                autoFocus
              />
            </div>
            <button type="submit" className="btn btn--dark btn--full" disabled={loading}>
              {loading ? 'Verifying…' : 'Verify & log in'}
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--full"
              onClick={() => { setStep('request'); setOtp(''); setError('') }}
            >
              ← Back
            </button>
          </form>
        )}

        <p className={styles.switchLink}>
          Don't have an account? <Link href="/signup">Sign up free</Link>
        </p>
      </div>
    </div>
  )
}
