'use client'

import React, { useState } from 'react'
import styles from './agencyOS.module.css'

interface RosterManagerProps {
  agency: any
  rosterMembers: any[]
  pendingRequests: any[]
}

export default function RosterManager({ agency, rosterMembers, pendingRequests }: RosterManagerProps) {
  const [selectedMember, setSelectedMember] = useState<any | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [customRoleLine, setCustomRoleLine] = useState('')
  const [customSplitPct, setCustomSplitPct] = useState<number | ''>('')
  const [loading, setLoading] = useState(false)

  const handleOpenEditModal = (member: any) => {
    setSelectedMember(member)
    setCustomRoleLine(member.overlay_data?.role_line || member.profiles?.role_line || '')
    setCustomSplitPct(member.custom_split_pct ?? '')
    setIsEditModalOpen(true)
  }

  const handleSaveOverlay = async () => {
    if (!selectedMember) return
    setLoading(true)
    try {
      const res = await fetch('/api/agency/approve-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: selectedMember.id,
          custom_split_pct: customSplitPct === '' ? null : Number(customSplitPct),
          overlay_data: { role_line: customRoleLine },
        }),
      })
      if (res.ok) {
        setIsEditModalOpen(false)
        window.location.reload()
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Pending Join Requests */}
      {pendingRequests && pendingRequests.length > 0 && (
        <div className={styles.card} style={{ border: '1px solid rgba(245, 158, 11, 0.3)', background: 'rgba(245, 158, 11, 0.05)' }}>
          <div className={styles.cardTitle}>
            <span>Pending Join Requests ({pendingRequests.length})</span>
            <span className={`${styles.badge} ${styles.badgeWarning}`}>Needs Review</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {pendingRequests.map((req) => (
              <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#161a22', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{req.profiles?.display_name || 'Applicant'}</div>
                  <div style={{ fontSize: '0.85rem', color: '#9ca3af' }}>@{req.profiles?.handle} · {req.profiles?.category || 'Talent'}</div>
                  {req.message && <div style={{ fontSize: '0.9rem', color: '#e5e7eb', marginTop: '0.3rem' }}>"{req.message}"</div>}
                </div>
                <form action="/api/agency/approve-member" method="POST">
                  <input type="hidden" name="request_id" value={req.id} />
                  <button type="submit" className={styles.btnPrimary} style={{ background: '#10b981' }}>
                    Approve Member
                  </button>
                </form>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Roster */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>
          <span>Active Roster ({rosterMembers.length})</span>
          <span className={`${styles.badge} ${styles.badgeIndigo}`}>Max 4 Agencies Limit Enforced</span>
        </div>

        {rosterMembers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#9ca3af' }}>
            No active members in roster yet. Share your agency link to recruit talent!
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '1.25rem' }}>
            {rosterMembers.map((m) => (
              <div key={m.id} style={{ background: '#11141b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <img src={m.profiles?.avatar_url || '/default-avatar.png'} alt="" style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }} />
                  <div>
                    <div style={{ fontWeight: 700 }}>{m.profiles?.display_name}</div>
                    <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>@{m.profiles?.handle}</div>
                  </div>
                </div>

                <div style={{ fontSize: '0.85rem', color: '#d1d5db', background: 'rgba(255,255,255,0.03)', padding: '0.5rem 0.75rem', borderRadius: '8px' }}>
                  Role Line: {m.overlay_data?.role_line || m.profiles?.role_line || 'Standard'}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#9ca3af' }}>
                  <span>Split: {m.custom_split_pct ? `${m.custom_split_pct}% Custom` : 'Agency Default'}</span>
                  <span>Subaccount: {m.paystack_subaccount ? '✅ Linked' : 'Manual'}</span>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button onClick={() => handleOpenEditModal(m)} className={styles.btnSecondary} style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem' }}>
                    Edit Overlay
                  </button>
                  <form action="/api/agency/leave" method="POST" style={{ flex: 1 }}>
                    <input type="hidden" name="agency_id" value={agency.id} />
                    <button type="submit" className={styles.btnSecondary} style={{ width: '100%', padding: '0.5rem', fontSize: '0.8rem', color: '#fca5a5' }}>
                      Offboard
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Overlay Modal */}
      {isEditModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3 style={{ marginTop: 0 }}>Edit Talent Overlay Profile</h3>
            <p style={{ color: '#9ca3af', fontSize: '0.85rem' }}>
              Customizing role line or split % for agency display only. The talent's personal Case profile remains 100% untouched.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', margin: '1.25rem 0' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.4rem' }}>Agency Role Line</label>
                <input
                  type="text"
                  value={customRoleLine}
                  onChange={(e) => setCustomRoleLine(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', background: '#11141b', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.4rem' }}>Custom Commission Split %</label>
                <input
                  type="number"
                  placeholder="e.g. 15 for 15% agency cut"
                  value={customSplitPct}
                  onChange={(e) => setCustomSplitPct(e.target.value === '' ? '' : Number(e.target.value))}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', background: '#11141b', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setIsEditModalOpen(false)} className={styles.btnSecondary}>Cancel</button>
              <button onClick={handleSaveOverlay} disabled={loading} className={styles.btnPrimary}>
                {loading ? 'Saving...' : 'Save Overlay'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
