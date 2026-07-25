'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'

export default function ClientDashboardPage() {
  const [clientProfile, setClientProfile] = useState<any>(null)
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'campaigns' | 'profile'>('campaigns')

  // Profile Form State
  const [form, setForm] = useState({
    company_name: '',
    tagline: '',
    industry: '',
    website_url: '',
    tax_id: '',
    logo_url: '',
  })
  const [saving, setSaving] = useState(false)

  const fetchData = async () => {
    try {
      const [profRes, campRes] = await Promise.all([
        fetch('/api/client/profile'),
        fetch('/api/client/campaigns'),
      ])

      const profData = await profRes.json()
      const campData = await campRes.json()

      if (profData.clientProfile) {
        setClientProfile(profData.clientProfile)
        setForm({
          company_name: profData.clientProfile.company_name || '',
          tagline: profData.clientProfile.tagline || '',
          industry: profData.clientProfile.industry || '',
          website_url: profData.clientProfile.website_url || '',
          tax_id: profData.clientProfile.tax_id || '',
          logo_url: profData.clientProfile.logo_url || '',
        })
      }
      setCampaigns(campData.campaigns || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const saveProfile = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/client/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.clientProfile) {
        setClientProfile(data.clientProfile)
        alert('Client Brand Profile saved!')
      } else if (data.error) {
        alert(`Error: ${data.error}`)
      }
    } catch (e: any) {
      alert(`Error saving profile: ${e.message}`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ backgroundColor: '#0a0a0f', minHeight: '100vh', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>Loading Client Dashboard…</p>
      </div>
    )
  }

  return (
    <div style={{ backgroundColor: '#0a0a0f', color: '#f9fafb', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <header
        style={{
          borderBottom: '1px solid #1f1f2e',
          padding: '24px 32px',
          background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(16,185,129,0.06) 100%)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800 }}>
              {clientProfile?.company_name || 'Client Portal'}
            </h1>
            <span style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)', padding: '2px 10px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700 }}>
              VERIFIED CLIENT
            </span>
          </div>
          <p style={{ margin: 0, color: '#9ca3af', fontSize: '0.9rem' }}>
            {clientProfile?.handle ? `case.app/client/@${clientProfile.handle}` : 'Manage your agency pitches, escrow settlements, & brand portfolio'}
          </p>
        </div>

        {clientProfile?.handle && (
          <Link
            href={`/client/${clientProfile.handle}`}
            target="_blank"
            style={{ background: 'rgba(255,255,255,0.08)', color: '#e5e7eb', border: '1px solid rgba(255,255,255,0.12)', padding: '8px 16px', borderRadius: '10px', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600 }}
          >
            View Brand Profile ↗
          </Link>
        )}
      </header>

      {/* Tabs */}
      <nav style={{ borderBottom: '1px solid #1f1f2e', padding: '0 32px', display: 'flex', gap: '8px' }}>
        {[
          { id: 'campaigns', label: '🎨 Active Campaigns', icon: '🎨' },
          { id: 'profile', label: '🏢 Brand Profile & Billing', icon: '🏢' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: activeTab === t.id ? '2px solid #6366f1' : '2px solid transparent',
              color: activeTab === t.id ? '#a5b4fc' : '#6b7280',
              padding: '14px 16px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: activeTab === t.id ? 700 : 500,
            }}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px', boxSizing: 'border-box' }}>
        {activeTab === 'campaigns' && (
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '20px' }}>2-Sided Campaign Nodes</h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
              {campaigns.map(camp => (
                <div key={camp.id} style={{ backgroundColor: '#111116', padding: '24px', borderRadius: '16px', border: '1px solid #2a2a3a' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{camp.title}</h3>
                    <span style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)', padding: '2px 8px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700 }}>
                      {camp.status?.toUpperCase()}
                    </span>
                  </div>

                  <p style={{ margin: '0 0 16px 0', color: '#9ca3af', fontSize: '0.9rem' }}>
                    Executed by <strong>{camp.agency?.name || 'Agency Partner'}</strong>
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid #1f1f2e' }}>
                    <span style={{ color: '#10b981', fontWeight: 800, fontSize: '1.1rem' }}>
                      {camp.currency} {Number(camp.budget).toLocaleString()}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                      {new Date(camp.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}

              {campaigns.length === 0 && (
                <div style={{ gridColumn: '1/-1', backgroundColor: '#111116', padding: '48px', borderRadius: '16px', border: '1px solid #2a2a3a', textAlign: 'center', color: '#6b7280' }}>
                  <p style={{ fontSize: '2.5rem', margin: '0 0 12px 0' }}>📋</p>
                  <h3 style={{ margin: '0 0 8px 0', color: '#e5e7eb' }}>No active campaigns yet</h3>
                  <p style={{ margin: 0, fontSize: '0.95rem' }}>
                    When an agency sends you a pitch link, accept it to lock escrow and automatically create a campaign node!
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div style={{ backgroundColor: '#111116', padding: '32px', borderRadius: '16px', border: '1px solid #2a2a3a', maxWidth: '640px' }}>
            <h2 style={{ margin: '0 0 20px 0', fontSize: '1.3rem', fontWeight: 800 }}>Company Brand Profile</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#9ca3af', marginBottom: '6px' }}>Company / Brand Name</label>
                <input
                  value={form.company_name}
                  onChange={e => setForm({ ...form, company_name: e.target.value })}
                  placeholder="e.g. Acme Corporation"
                  style={{ width: '100%', padding: '12px', backgroundColor: '#1a1a24', color: '#fff', border: '1px solid #2a2a3a', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#9ca3af', marginBottom: '6px' }}>Brand Tagline</label>
                <input
                  value={form.tagline}
                  onChange={e => setForm({ ...form, tagline: e.target.value })}
                  placeholder="e.g. Building the future of digital retail"
                  style={{ width: '100%', padding: '12px', backgroundColor: '#1a1a24', color: '#fff', border: '1px solid #2a2a3a', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#9ca3af', marginBottom: '6px' }}>Industry</label>
                <input
                  value={form.industry}
                  onChange={e => setForm({ ...form, industry: e.target.value })}
                  placeholder="e.g. FinTech, Fashion, AI, E-Commerce"
                  style={{ width: '100%', padding: '12px', backgroundColor: '#1a1a24', color: '#fff', border: '1px solid #2a2a3a', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#9ca3af', marginBottom: '6px' }}>Website URL</label>
                <input
                  value={form.website_url}
                  onChange={e => setForm({ ...form, website_url: e.target.value })}
                  placeholder="e.g. https://acme.com"
                  style={{ width: '100%', padding: '12px', backgroundColor: '#1a1a24', color: '#fff', border: '1px solid #2a2a3a', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#9ca3af', marginBottom: '6px' }}>Corporate Tax ID / Registration</label>
                <input
                  value={form.tax_id}
                  onChange={e => setForm({ ...form, tax_id: e.target.value })}
                  placeholder="e.g. US-EIN-1234567"
                  style={{ width: '100%', padding: '12px', backgroundColor: '#1a1a24', color: '#fff', border: '1px solid #2a2a3a', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              </div>

              <button
                onClick={saveProfile}
                disabled={saving || !form.company_name}
                style={{
                  marginTop: '12px',
                  padding: '12px 24px',
                  backgroundColor: '#6366f1',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 700,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  fontSize: '0.95rem',
                }}
              >
                {saving ? 'Saving…' : 'Save Brand Profile'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
