'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from '../../nanny-dashboard.module.css'

export default function CronClient({ org, initialJobs }: { org: any, initialJobs: any[] }) {
  const router = useRouter()
  const [jobs, setJobs] = useState(initialJobs)
  const [prompt, setPrompt] = useState('')
  const [schedule, setSchedule] = useState('weekly')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleAddJob = async (e: React.FormEvent) => {
    e.preventDefault()
    if (jobs.length >= 3) {
      setError('Maximum of 3 cron jobs allowed.')
      return
    }
    if (!prompt.trim()) return

    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/nanny/cron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: org.id, prompt, schedule })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to add job')
      setJobs([data.job, ...jobs])
      setPrompt('')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteJob = async (id: string) => {
    try {
      await fetch(`/api/nanny/cron/${id}`, { method: 'DELETE' })
      setJobs(jobs.filter(j => j.id !== id))
      router.refresh()
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px' }}>
      <div style={{ marginBottom: 24 }}>
        <Link href="/dashboard/agency/nanny/copilot" style={{ color: 'var(--ink-muted)', textDecoration: 'none', fontSize: 14 }}>
          ← Back to Copilot
        </Link>
      </div>
      
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>⏱️ AI Cron Jobs</h1>
      <p style={{ color: 'var(--ink-muted)', fontSize: 14, marginBottom: 24 }}>
        Automate your agency tasks with AI. You can have up to 3 active cron jobs.
      </p>

      {error && <div className={`${styles.notice} ${styles.noticeDanger}`} style={{ marginBottom: 16 }}>{error}</div>}

      <div className={styles.formSection} style={{ marginBottom: 32 }}>
        <div className={styles.formSectionTitle}>Create New Job</div>
        <form onSubmit={handleAddJob}>
          <div className={styles.field}>
            <label className={styles.label}>Task Prompt</label>
            <input 
              type="text" 
              className={styles.input}
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="e.g. Every Monday, email me a summary of bookings..."
              disabled={jobs.length >= 3 || loading}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Schedule</label>
            <select 
              className={`${styles.input} ${styles.select}`}
              value={schedule}
              onChange={e => setSchedule(e.target.value)}
              disabled={jobs.length >= 3 || loading}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <button type="submit" className="btn btn--dark" disabled={jobs.length >= 3 || loading || !prompt.trim()}>
            {loading ? 'Creating...' : 'Create Job'}
          </button>
          {jobs.length >= 3 && (
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--danger)' }}>Maximum of 3 jobs reached.</div>
          )}
        </form>
      </div>

      <div className={styles.formSection}>
        <div className={styles.formSectionTitle}>Active Jobs ({jobs.length}/3)</div>
        {jobs.length === 0 ? (
          <div style={{ color: 'var(--ink-muted)', fontSize: 14 }}>No active cron jobs.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {jobs.map(job => (
              <div key={job.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--card)', padding: 16, borderRadius: 'var(--radius-md)', border: '1px solid var(--paper)', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 500, marginBottom: 4 }}>{job.prompt}</div>
                  <div style={{ fontSize: 13, color: 'var(--ink-muted)' }}>Schedule: {job.schedule}</div>
                </div>
                <button onClick={() => handleDeleteJob(job.id)} className="btn btn--sm btn--outline" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}>
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
