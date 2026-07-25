'use client'

import React, { useState } from 'react'
import Link from 'next/link'

interface Props {
  pitchId: string
  status: string
  totalValue: number
  currency: string
  primaryColor: string
  clientEmail: string
  existingClientProfile: any | null
}

export default function PitchAcceptClient({
  pitchId,
  status,
  totalValue,
  currency,
  primaryColor,
  clientEmail,
  existingClientProfile,
}: Props) {
  const [currentStatus, setCurrentStatus] = useState(status)
  const [loading, setLoading] = useState(false)
  const [companyName, setCompanyName] = useState(existingClientProfile?.company_name || '')
  const [companyHandle, setCompanyHandle] = useState(existingClientProfile?.handle || '')
  const [showModal, setShowModal] = useState(false)
  const [resultData, setResultData] = useState<any>(null)

  const handleAccept = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/client/pitch/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pitch_id: pitchId,
          company_name: companyName || clientEmail.split('@')[0],
          company_handle: companyHandle || null,
        }),
      })

      const data = await res.json()
      if (data.success) {
        setCurrentStatus('accepted')
        setResultData(data.result)
        setShowModal(false)
      } else {
        alert(`Error: ${data.error || 'Failed to accept pitch'}`)
      }
    } catch (e: any) {
      alert(`Error accepting pitch: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  if (currentStatus === 'accepted') {
    return (
      <div style={{ backgroundColor: '#111116', borderRadius: '16px', border: '1px solid #10b981', padding: '32px', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🎉</div>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '1.4rem', fontWeight: 800, color: '#34d399' }}>
          Proposal Accepted & Escrow Locked!
        </h3>
        <p style={{ margin: '0 0 24px 0', color: '#9ca3af', fontSize: '0.95rem', lineHeight: 1.5 }}>
          Payment split of {currency} {totalValue.toLocaleString()} has been recorded into virtual escrow. A 2-sided campaign node has been generated for your Client Case Profile.
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            href="/dashboard/client"
            style={{ padding: '12px 24px', backgroundColor: '#6366f1', color: '#fff', textDecoration: 'none', borderRadius: '8px', fontWeight: 700 }}
          >
            Go to Client Dashboard →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ backgroundColor: '#111116', borderRadius: '16px', border: '1px solid #2a2a3a', padding: '32px', textAlign: 'center' }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', fontWeight: 800 }}>Accept Proposal & Lock Escrow</h3>
        <p style={{ margin: '0 0 24px 0', color: '#9ca3af', fontSize: '0.9rem' }}>
          By accepting, funds are committed to escrow and a 2-sided verified campaign item will be attributed to your Brand Case Profile upon completion.
        </p>

        <button
          onClick={() => {
            if (existingClientProfile) {
              handleAccept()
            } else {
              setShowModal(true)
            }
          }}
          disabled={loading}
          style={{
            width: '100%',
            padding: '16px',
            backgroundColor: primaryColor,
            color: '#fff',
            border: 'none',
            borderRadius: '12px',
            fontSize: '1.05rem',
            fontWeight: 800,
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: `0 8px 24px ${primaryColor}44`,
          }}
        >
          {loading ? 'Processing Escrow Lock…' : `💳 1-Tap Accept & Lock Escrow (${currency} ${totalValue.toLocaleString()})`}
        </button>
      </div>

      {/* Brand Profile Quick Setup Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '24px' }}>
          <div style={{ backgroundColor: '#111116', padding: '32px', borderRadius: '16px', maxWidth: '440px', width: '100%', border: '1px solid #2a2a3a', boxSizing: 'border-box' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.3rem', fontWeight: 800 }}>Confirm Your Client Brand Profile</h3>
            <p style={{ margin: '0 0 20px 0', color: '#9ca3af', fontSize: '0.9rem' }}>
              Your brand profile will receive verified campaign attribution for this project.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#9ca3af', marginBottom: '4px' }}>Company / Brand Name</label>
                <input
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  placeholder="e.g. Acme Studio"
                  style={{ width: '100%', padding: '12px', backgroundColor: '#1a1a24', color: '#fff', border: '1px solid #2a2a3a', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#9ca3af', marginBottom: '4px' }}>Brand Handle (Optional)</label>
                <input
                  value={companyHandle}
                  onChange={e => setCompanyHandle(e.target.value)}
                  placeholder="e.g. acme-studio"
                  style={{ width: '100%', padding: '12px', backgroundColor: '#1a1a24', color: '#fff', border: '1px solid #2a2a3a', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setShowModal(false)}
                style={{ padding: '10px 18px', backgroundColor: '#1a1a24', color: '#9ca3af', border: '1px solid #2a2a3a', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
              >
                Cancel
              </button>
              <button
                onClick={handleAccept}
                disabled={loading || !companyName}
                style={{ padding: '10px 20px', backgroundColor: primaryColor, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 800 }}
              >
                {loading ? 'Processing…' : 'Confirm & Accept Pitch →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
