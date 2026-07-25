'use client'

import React from 'react'
import styles from './agencyOS.module.css'

interface SmartNudgePanelProps {
  agency: any
  rosterMembers: any[]
}

export default function SmartNudgePanel({ agency, rosterMembers }: SmartNudgePanelProps) {
  const topMember = rosterMembers[0]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
        <div className={styles.card}>
          <div style={{ fontSize: '0.85rem', color: '#9ca3af' }}>Client Fit Score Average</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#34d399', marginTop: '0.4rem' }}>96.4%</div>
        </div>
        <div className={styles.card}>
          <div style={{ fontSize: '0.85rem', color: '#9ca3af' }}>Repeat Booking Rate</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#818cf8', marginTop: '0.4rem' }}>42.8%</div>
        </div>
        <div className={styles.card}>
          <div style={{ fontSize: '0.85rem', color: '#9ca3af' }}>Roster Quality Standard</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fbbf24', marginTop: '0.4rem' }}>Grade A</div>
        </div>
      </div>

      {/* AI Smart Nudges Stream */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>
          <span>AI Smart Nudges & Automated Inference Stream</span>
          <span className={`${styles.badge} ${styles.badgeSuccess}`}>Live Intelligence</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
          <div style={{ background: '#11141b', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '12px', padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '1.5rem' }}>🎯</span>
            <div>
              <div style={{ fontWeight: 700, color: '#818cf8' }}>Automated Matchmaking Suggestion</div>
              <div style={{ fontSize: '0.9rem', color: '#e5e7eb', marginTop: '0.2rem' }}>
                Incoming catering inquiry matches <strong>{topMember?.profiles?.display_name || 'Aisha Njoroge'}</strong> with a 98% proof confidence fit score based on 4 verified client vouches.
              </div>
              <button className={styles.btnSecondary} style={{ marginTop: '0.75rem', padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}>
                Auto-Assemble Proposal Pitch
              </button>
            </div>
          </div>

          <div style={{ background: '#11141b', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '12px', padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '1.5rem' }}>⚠️</span>
            <div>
              <div style={{ fontWeight: 700, color: '#fbbf24' }}>Roster Completeness Audit Alert</div>
              <div style={{ fontSize: '0.9rem', color: '#e5e7eb', marginTop: '0.2rem' }}>
                1 member's completeness score is approaching the agency minimum gate (70%). Automated WhatsApp evidence refresh nudge queued.
              </div>
            </div>
          </div>

          <div style={{ background: '#11141b', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '12px', padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '1.5rem' }}>💡</span>
            <div>
              <div style={{ fontWeight: 700, color: '#34d399' }}>Split Optimization Opportunity</div>
              <div style={{ fontSize: '0.9rem', color: '#e5e7eb', marginTop: '0.2rem' }}>
                Talent completing 5+ successful bookings this month. Recommend applying 5% bonus cut incentive to maximize talent retention.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
