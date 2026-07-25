'use client'

import React, { useState } from 'react'
import styles from './agencyOS.module.css'

interface PitchBuilderProps {
  agency: any
  rosterMembers: any[]
}

export default function PitchBuilder({ agency, rosterMembers }: PitchBuilderProps) {
  const [clientName, setClientName] = useState('')
  const [selectedTalentId, setSelectedTalentId] = useState('')
  const [packagePrice, setPackagePrice] = useState<number | ''>('')
  const [customNote, setCustomNote] = useState('')
  const [copied, setCopied] = useState(false)

  const selectedTalent = rosterMembers.find((m) => m.user_id === selectedTalentId)

  const generatedWhatsAppPitch = `*Proposal from ${agency.name} for ${clientName || 'Client'}*

Hello! Here is our proof-of-work talent recommendation for your project:

👤 *Talent:* ${selectedTalent?.profiles?.display_name || 'Selected Member'} (@${selectedTalent?.profiles?.handle || 'handle'})
💼 *Role:* ${selectedTalent?.profiles?.role_line || selectedTalent?.profiles?.category || 'Specialist'}
⭐ *Proof Profile:* https://case.app/@${selectedTalent?.profiles?.handle || ''}

💰 *Package Price:* ${agency.currency} ${packagePrice ? Number(packagePrice).toLocaleString() : '0'}
${customNote ? `\n📝 *Note:* ${customNote}` : ''}

🔗 View Full Agency Roster: https://case.app/agency/${agency.handle}`

  const handleCopyPitch = () => {
    navigator.clipboard.writeText(generatedWhatsAppPitch)
    setCopied(true)
    setTimeout(() => setCopied(false), 3000)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className={styles.card}>
        <div className={styles.cardTitle}>
          <span>Interactive Proposal Pitch Generator</span>
          <span className={`${styles.badge} ${styles.badgeIndigo}`}>Instant WhatsApp Sharing</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
          {/* Pitch Form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem' }}>Client / Company Name</label>
              <input
                type="text"
                placeholder="Nairobi Events Co."
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', background: '#11141b', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem' }}>Feature Roster Talent</label>
              <select
                value={selectedTalentId}
                onChange={(e) => setSelectedTalentId(e.target.value)}
                style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', background: '#11141b', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}
              >
                <option value="">Select Talent Member...</option>
                {rosterMembers.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.profiles?.display_name} (@{m.profiles?.handle})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem' }}>Package Price ({agency.currency})</label>
              <input
                type="number"
                placeholder="25000"
                value={packagePrice}
                onChange={(e) => setPackagePrice(e.target.value === '' ? '' : Number(e.target.value))}
                style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', background: '#11141b', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem' }}>Custom Proposal Note</label>
              <textarea
                rows={3}
                placeholder="Includes full styling, 3-hour session, and high-res deliverables."
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', background: '#11141b', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}
              />
            </div>
          </div>

          {/* Generated Live Pitch Preview */}
          <div style={{ background: '#11141b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.85rem', color: '#9ca3af', fontWeight: 600, marginBottom: '0.75rem' }}>Live WhatsApp Pitch Preview</div>
              <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '0.9rem', color: '#e5e7eb', background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '10px', margin: 0, lineHeight: 1.5 }}>
                {generatedWhatsAppPitch}
              </pre>
            </div>

            <div style={{ marginTop: '1.25rem' }}>
              <button onClick={handleCopyPitch} className={styles.btnPrimary} style={{ width: '100%', justifyContent: 'center' }}>
                {copied ? '✅ Pitch Copied to Clipboard!' : '📋 Copy WhatsApp Pitch Text'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
