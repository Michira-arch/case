'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function NewAgencyPage() {
  const router = useRouter()
  const [handle, setHandle] = useState('')
  const [name, setName] = useState('')
  const [tagline, setTagline] = useState('')
  const [description, setDescription] = useState('')
  const [countryCode, setCountryCode] = useState('KE')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/agency/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          handle: handle.toLowerCase().trim(),
          name: name.trim(),
          tagline: tagline.trim() || null,
          description: description.trim() || null,
          country_code: countryCode,
          currency: countryCode === 'KE' ? 'KES' : countryCode === 'NG' ? 'NGN' : countryCode === 'ZA' ? 'ZAR' : 'USD',
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create agency')
      }

      router.push(`/dashboard/agency?id=${data.agency.id}`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '640px', margin: '4rem auto', padding: '0 1.5rem', color: '#f3f4f6' }}>
      <div style={{ marginBottom: '2rem' }}>
        <Link href="/dashboard" style={{ color: '#9ca3af', textDecoration: 'none', fontSize: '0.9rem' }}>
          ← Back to Dashboard
        </Link>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.5rem' }}>Create an Agency</h1>
        <p style={{ color: '#9ca3af' }}>Build your proof-of-work agency roster and start collecting client split payments.</p>
      </div>

      {error && (
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', padding: '0.85rem 1rem', borderRadius: '10px', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.4rem' }}>
            Agency Handle (case.app/agency/@handle)
          </label>
          <input
            type="text"
            required
            placeholder="nairobi-creatives"
            value={handle}
            onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))}
            style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', backgroundColor: '#161a22', border: '1px solid rgba(255,255,255,0.15)', color: '#ffffff' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.4rem' }}>
            Agency Name
          </label>
          <input
            type="text"
            required
            placeholder="Nairobi Creatives Agency"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', backgroundColor: '#161a22', border: '1px solid rgba(255,255,255,0.15)', color: '#ffffff' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.4rem' }}>
            Tagline
          </label>
          <input
            type="text"
            placeholder="Top-tier braiders & stylists in Westlands"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', backgroundColor: '#161a22', border: '1px solid rgba(255,255,255,0.15)', color: '#ffffff' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.4rem' }}>
            Primary Operating Country
          </label>
          <select
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
            style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', backgroundColor: '#161a22', border: '1px solid rgba(255,255,255,0.15)', color: '#ffffff' }}
          >
            <option value="KE">Kenya (KES - Paystack M-Pesa Native)</option>
            <option value="NG">Nigeria (NGN - Paystack Native)</option>
            <option value="ZA">South Africa (ZAR - Paystack Native)</option>
            <option value="US">United States / Global ($ USD)</option>
            <option value="IN">India (₹ INR - Ledger & Payout Escrow)</option>
            <option value="SE">South-East Asia ($ USD)</option>
            <option value="EG">Egypt (EGP)</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            marginTop: '1rem',
            padding: '0.85rem 1.5rem',
            borderRadius: '12px',
            backgroundColor: '#6366f1',
            color: '#ffffff',
            fontWeight: 700,
            border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Creating Agency...' : 'Create Agency & Launch Roster'}
        </button>
      </form>
    </div>
  )
}
