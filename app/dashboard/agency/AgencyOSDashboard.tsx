'use client'

import { useState } from 'react'
import RosterTab from '@/components/agency/tabs/RosterTab'
import FinancialsTab from '@/components/agency/tabs/FinancialsTab'
import IntelligenceTab from '@/components/agency/tabs/IntelligenceTab'
import SettingsTab from '@/components/agency/tabs/SettingsTab'
import Link from 'next/link'

interface AgencyOSProps {
  agency: any
  currentUserRole?: 'admin' | 'manager' | 'member'
  pendingCount?: number
}

const tabs = [
  { id: 'roster', label: 'Roster & Talent', icon: '👥' },
  { id: 'financials', label: 'Invoices & Payouts', icon: '💳' },
  { id: 'intelligence', label: 'Intelligence', icon: '🧠' },
  { id: 'settings', label: 'Settings & Rules', icon: '⚙️' },
]

const shell: React.CSSProperties = {
  minHeight: '100vh',
  backgroundColor: '#080c14',
  color: '#f9fafb',
  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
}

const headerStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(16,185,129,0.06) 100%)',
  borderBottom: '1px solid rgba(255,255,255,0.07)',
  padding: '1.5rem 2rem',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '1rem',
}

export default function AgencyOSDashboard({
  agency,
  currentUserRole = 'admin',
  pendingCount = 0,
}: AgencyOSProps) {
  const [activeTab, setActiveTab] = useState<string>('roster')

  if (!agency) return null

  return (
    <div style={shell}>
      {/* Agency Header */}
      <header style={headerStyle}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800 }}>{agency.name}</h1>
            {agency.is_verified && (
              <span style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)', padding: '2px 10px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.04em' }}>
                VERIFIED
              </span>
            )}
          </div>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#6b7280' }}>
            case.app/agency/<strong style={{ color: '#9ca3af' }}>@{agency.handle}</strong>
            {agency.country_code && ` · ${agency.country_code}`}
            {agency.currency && ` (${agency.currency})`}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link
            href={`/agency/${agency.handle}`}
            target="_blank"
            style={{ background: 'rgba(255,255,255,0.06)', color: '#e5e7eb', border: '1px solid rgba(255,255,255,0.1)', padding: '0.55rem 1.1rem', borderRadius: '10px', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600 }}
          >
            View Showcase ↗
          </Link>
          <Link
            href="/dashboard/agency/new"
            style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)', padding: '0.55rem 1.1rem', borderRadius: '10px', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600 }}
          >
            + New Agency
          </Link>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '0 2rem', display: 'flex', gap: '0.25rem', overflowX: 'auto' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #6366f1' : '2px solid transparent',
              color: activeTab === tab.id ? '#a5b4fc' : '#6b7280',
              padding: '1rem 1.25rem',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: activeTab === tab.id ? 700 : 500,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
            }}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            {tab.id === 'roster' && pendingCount > 0 && (
              <span style={{ background: '#f59e0b', color: '#000', borderRadius: '999px', padding: '1px 6px', fontSize: '0.7rem', fontWeight: 800 }}>
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Tab Content */}
      <div style={{ padding: '2rem', maxWidth: '1300px', margin: '0 auto' }}>
        {activeTab === 'roster' && (
          <RosterTab agencyId={agency.id} />
        )}

        {activeTab === 'financials' && (
          <FinancialsTab agencyId={agency.id} />
        )}

        {activeTab === 'intelligence' && (
          <IntelligenceTab agencyId={agency.id} />
        )}

        {activeTab === 'settings' && (
          <SettingsTab agencyId={agency.id} currentUserRole={currentUserRole} />
        )}
      </div>
    </div>
  )
}
