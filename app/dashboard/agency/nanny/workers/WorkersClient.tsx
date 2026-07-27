'use client'

import { useState } from 'react'
import Link from 'next/link'
import styles from '../nanny-dashboard.module.css'
import type { NannyWorker, WorkerState, WorkerComplianceRow } from '@/lib/nanny-types'
import WorkerCard from '@/components/agency/WorkerCard'

const STATE_FILTERS: { key: WorkerState | 'all'; label: string }[] = [
  { key: 'all',       label: 'All' },
  { key: 'active',    label: 'Active' },
  { key: 'vetted',    label: 'Vetted' },
  { key: 'applicant', label: 'Applicant' },
  { key: 'on_break',  label: 'On Break' },
  { key: 'suspended', label: 'Suspended' },
  { key: 'inactive',  label: 'Inactive' },
]

interface Props {
  workers: NannyWorker[]
  compliance: WorkerComplianceRow[]
  orgHandle: string
}

export default function WorkersClient({ workers, compliance, orgHandle }: Props) {
  const [tab, setTab] = useState<WorkerState | 'all'>('all')
  const [search, setSearch] = useState('')

  // Build compliance map: workerId → {ok, total}
  const complianceMap = compliance.reduce<Record<string, { ok: number; total: number }>>(
    (acc, row) => {
      if (!acc[row.worker_id]) acc[row.worker_id] = { ok: 0, total: 0 }
      acc[row.worker_id].total++
      if (row.compliance_status === 'ok') acc[row.worker_id].ok++
      return acc
    },
    {}
  )

  const filtered = workers
    .filter((w) => tab === 'all' || w.worker_state === tab)
    .filter((w) => {
      if (!search) return true
      const name = (
        w.profile?.display_name ?? w.shadow_name ?? ''
      ).toLowerCase()
      return name.includes(search.toLowerCase())
    })

  return (
    <>
      {/* Controls */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          marginBottom: 20,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <input
          className={styles.input}
          style={{ maxWidth: 260 }}
          placeholder="Search workers…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className={styles.tabs} style={{ marginBottom: 0 }}>
          {STATE_FILTERS.map((f) => {
            const count =
              f.key === 'all'
                ? workers.length
                : workers.filter((w) => w.worker_state === f.key).length
            return (
              <button
                key={f.key}
                className={`${styles.tab} ${tab === f.key ? styles.tabActive : ''}`}
                onClick={() => setTab(f.key)}
              >
                {f.label}
                {count > 0 && (
                  <span
                    style={{
                      marginLeft: 6,
                      fontSize: 11,
                      background: tab === f.key ? 'var(--brass)' : 'var(--line)',
                      color: tab === f.key ? '#2A1D0C' : 'var(--ink-muted)',
                      padding: '1px 6px',
                      borderRadius: 'var(--radius-full)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>👥</div>
          <div className={styles.emptyTitle}>No workers found</div>
          <p className={styles.emptyText}>
            {search
              ? `No workers matching "${search}".`
              : 'Add your first worker to get started.'}
          </p>
          <Link
            href="/dashboard/agency/nanny/workers/new"
            className="btn btn--dark"
          >
            + Add Worker
          </Link>
        </div>
      ) : (
        <div className={styles.workerGrid}>
          {filtered.map((worker) => {
            const cpl = complianceMap[worker.id] ?? { ok: 0, total: 0 }
            return (
              <WorkerCard
                key={worker.id}
                worker={worker}
                href={`/dashboard/agency/nanny/workers/${worker.id}`}
                complianceOk={cpl.ok}
                complianceTotal={cpl.total}
              />
            )
          })}
        </div>
      )}
    </>
  )
}
