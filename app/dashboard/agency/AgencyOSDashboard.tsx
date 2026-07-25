'use client'

import { useState } from 'react'
import RosterManager from '@/components/agency/RosterManager'
import InvoiceSplitEngine from '@/components/agency/InvoiceSplitEngine'
import PitchBuilder from '@/components/agency/PitchBuilder'
import AgencyRuleCustomizer from '@/components/agency/AgencyRuleCustomizer'
import SmartNudgePanel from '@/components/agency/SmartNudgePanel'
import styles from '@/components/agency/agencyOS.module.css'
import Link from 'next/link'

interface AgencyOSProps {
  agency: any
  rosterMembers: any[]
  pendingRequests: any[]
  transactions: any[]
}

export default function AgencyOSDashboard({
  agency,
  rosterMembers,
  pendingRequests,
  transactions,
}: AgencyOSProps) {
  const [activeTab, setActiveTab] = useState<'roster' | 'financials' | 'pitches' | 'intelligence' | 'settings'>('roster')

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.titleGroup}>
          <h1 className={styles.title}>
            <span>{agency.name}</span>
            {agency.is_verified && <span className={`${styles.badge} ${styles.badgeSuccess}`}>Verified</span>}
          </h1>
          <p className={styles.subtitle}>
            case.app/agency/@{agency.handle} · {agency.country_code} ({agency.currency})
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link
            href={`/agency/${agency.handle}`}
            target="_blank"
            className={styles.btnSecondary}
          >
            Public Showcase ↗
          </Link>
        </div>
      </header>

      {/* Tabs Navigation */}
      <nav className={styles.tabsNav}>
        <button
          className={`${styles.tabBtn} ${activeTab === 'roster' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('roster')}
        >
          👥 Roster & Overlays ({rosterMembers.length})
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'financials' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('financials')}
        >
          💳 Split Invoices & Payouts
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'pitches' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('pitches')}
        >
          📑 Proposal Pitches
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'intelligence' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('intelligence')}
        >
          🧠 AI Smart Nudges
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'settings' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          ⚙️ Rules & Branding
        </button>
      </nav>

      {/* Main Tab Content */}
      <main>
        {activeTab === 'roster' && (
          <RosterManager
            agency={agency}
            rosterMembers={rosterMembers}
            pendingRequests={pendingRequests}
          />
        )}

        {activeTab === 'financials' && (
          <InvoiceSplitEngine
            agency={agency}
            rosterMembers={rosterMembers}
            transactions={transactions}
          />
        )}

        {activeTab === 'pitches' && (
          <PitchBuilder
            agency={agency}
            rosterMembers={rosterMembers}
          />
        )}

        {activeTab === 'intelligence' && (
          <SmartNudgePanel
            agency={agency}
            rosterMembers={rosterMembers}
          />
        )}

        {activeTab === 'settings' && (
          <AgencyRuleCustomizer
            agency={agency}
          />
        )}
      </main>
    </div>
  )
}
