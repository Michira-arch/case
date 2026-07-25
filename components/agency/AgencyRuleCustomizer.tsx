'use client'

import React, { useState } from 'react'
import styles from './agencyOS.module.css'

interface AgencyRuleCustomizerProps {
  agency: any
}

export default function AgencyRuleCustomizer({ agency }: AgencyRuleCustomizerProps) {
  const [splitPct, setSplitPct] = useState(agency?.rules?.default_agency_split_pct || 20)
  const [minScore, setMinScore] = useState(agency?.rules?.min_completeness_score || 70)
  const [autoApprove, setAutoApprove] = useState(agency?.rules?.auto_approve_members || false)
  const [requireVouched, setRequireVouched] = useState(agency?.rules?.require_vouched_proofs || true)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSaveRules = async () => {
    setLoading(true)
    setSaved(false)
    try {
      const res = await fetch('/api/agency/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          handle: agency.handle,
          name: agency.name,
          country_code: agency.country_code,
          currency: agency.currency,
          rules: {
            default_agency_split_pct: Number(splitPct),
            min_completeness_score: Number(minScore),
            auto_approve_members: autoApprove,
            require_vouched_proofs: requireVouched,
          },
        }),
      })

      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className={styles.card}>
        <div className={styles.cardTitle}>
          <span>Agency Operational Rule Engine & Branding</span>
          {saved && <span className={`${styles.badge} ${styles.badgeSuccess}`}>Rules Saved</span>}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', marginTop: '1rem' }}>
          {/* Default Agency Split % */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <label style={{ fontWeight: 600, fontSize: '0.95rem' }}>Default Agency Commission Cut</label>
              <span style={{ color: '#818cf8', fontWeight: 700 }}>{splitPct}% Agency / {100 - splitPct}% Talent</span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              step="1"
              value={splitPct}
              onChange={(e) => setSplitPct(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#6366f1' }}
            />
            <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Standard cut applied to client invoices unless member custom split is set.</span>
          </div>

          {/* Minimum Completeness Gate */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <label style={{ fontWeight: 600, fontSize: '0.95rem' }}>Minimum Completeness Score Gate</label>
              <span style={{ color: '#34d399', fontWeight: 700 }}>{minScore}% Score Required</span>
            </div>
            <input
              type="range"
              min="40"
              max="90"
              step="5"
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#10b981' }}
            />
            <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Applicants below this score will be flagged for review.</span>
          </div>

          {/* Toggles */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: '#11141b', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
              <div>
                <div style={{ fontWeight: 600 }}>Auto-Approve Applicants</div>
                <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Automatically admit talent meeting the completeness score gate.</div>
              </div>
              <input
                type="checkbox"
                checked={autoApprove}
                onChange={(e) => setAutoApprove(e.target.checked)}
                style={{ width: '20px', height: '20px', accentColor: '#6366f1' }}
              />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
              <div>
                <div style={{ fontWeight: 600 }}>Require Verified Vouches</div>
                <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Require at least 1 third-party vouched proof before featuring on agency roster.</div>
              </div>
              <input
                type="checkbox"
                checked={requireVouched}
                onChange={(e) => setRequireVouched(e.target.checked)}
                style={{ width: '20px', height: '20px', accentColor: '#6366f1' }}
              />
            </label>
          </div>

          <div>
            <button onClick={handleSaveRules} disabled={loading} className={styles.btnPrimary}>
              {loading ? 'Saving Rules...' : 'Save Operational Rules'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
