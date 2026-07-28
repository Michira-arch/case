'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from '../nanny-dashboard.module.css'
import type { NannyOrg } from '@/lib/nanny-types'

interface Props {
  org: NannyOrg
}

export default function SettingsClient({ org }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [aiSuccess, setAiSuccess] = useState(false)

  const [form, setForm] = useState({
    name: org.name,
    tagline: org.tagline ?? '',
    description: org.description ?? '',
    contact_email: org.contact_email ?? '',
    contact_phone: org.contact_phone ?? '',
    address: org.address ?? '',
    location_area: org.location_area ?? '',
    // Policy
    matching_mode: org.policy.matching_mode || 'manual',
    cancellation_grace_hours: org.policy.cancellation_grace_hours,
    overtime_threshold_hours: org.policy.overtime_threshold_hours,
    overtime_multiplier: org.policy.overtime_multiplier,
    emergency_surcharge_pct: org.policy.emergency_surcharge_pct,
    holiday_pay_rate: org.policy.holiday_pay_rate,
    payout_cadence: org.policy.payout_cadence,
    auto_invoice: org.policy.auto_invoice,
    require_timelog: org.policy.require_timelog,
    continuity_preference: org.policy.continuity_preference,
    agency_cut_pct: org.policy.agency_cut_pct,
    is_public: org.is_public,
    // Page Config
    hero_headline: org.page_config.hero_headline ?? '',
    hero_subtitle: org.page_config.hero_subtitle ?? '',
    pitch_title: org.page_config.pitch_title ?? '',
    pitch_body: org.page_config.pitch_body ?? '',
    cta_text: org.page_config.cta_text ?? '',
    cta_subtext: org.page_config.cta_subtext ?? '',
    show_workers: org.page_config.show_workers,
    show_services: org.page_config.show_services,
    hero_pattern: org.page_config.hero_pattern,
  })

  const set = (k: keyof typeof form, v: any) =>
    setForm((p) => ({ ...p, [k]: v }))

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const res = await fetch(`/api/nanny/org`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id: org.id,
          name: form.name,
          tagline: form.tagline,
          description: form.description,
          contact_email: form.contact_email,
          contact_phone: form.contact_phone,
          address: form.address,
          location_area: form.location_area,
          is_public: form.is_public,
          policy: {
            ...org.policy,
            matching_mode: form.matching_mode,
            cancellation_grace_hours: Number(form.cancellation_grace_hours),
            overtime_threshold_hours: Number(form.overtime_threshold_hours),
            overtime_multiplier: Number(form.overtime_multiplier),
            emergency_surcharge_pct: Number(form.emergency_surcharge_pct),
            holiday_pay_rate: Number(form.holiday_pay_rate),
            payout_cadence: form.payout_cadence,
            auto_invoice: form.auto_invoice,
            require_timelog: form.require_timelog,
            continuity_preference: form.continuity_preference,
            agency_cut_pct: Number(form.agency_cut_pct),
          },
          page_config: {
            ...org.page_config,
            hero_headline: form.hero_headline || null,
            hero_subtitle: form.hero_subtitle || null,
            pitch_title: form.pitch_title || 'Why choose us?',
            pitch_body: form.pitch_body || null,
            cta_text: form.cta_text || 'Book Now',
            cta_subtext: form.cta_subtext || '',
            show_workers: form.show_workers,
            show_services: form.show_services,
            hero_pattern: form.hero_pattern,
          },
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to save')
      setSaved(true)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleAiCustomize = async () => {
    if (!aiPrompt) return
    setAiLoading(true)
    setAiError(null)
    setAiSuccess(false)
    try {
      const res = await fetch('/api/ai/customize-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: org.id, prompt: aiPrompt })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'AI Failed')
      
      // Update form state with new page config
      setForm((p) => ({
        ...p,
        hero_headline: json.page_config?.hero_headline || p.hero_headline,
        hero_subtitle: json.page_config?.hero_subtitle || p.hero_subtitle,
        pitch_title: json.page_config?.pitch_title || p.pitch_title,
        pitch_body: json.page_config?.pitch_body || p.pitch_body,
        cta_text: json.page_config?.cta_text || p.cta_text,
        cta_subtext: json.page_config?.cta_subtext || p.cta_subtext,
        hero_pattern: json.page_config?.hero_pattern || p.hero_pattern,
      }))
      setAiSuccess(true)
      setAiPrompt('')
    } catch (err: any) {
      setAiError(err.message)
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <form onSubmit={handleSave}>
      {error && (
        <div className={`${styles.notice} ${styles.noticeDanger}`}>{error}</div>
      )}
      {saved && (
        <div className={`${styles.notice} ${styles.noticeVerified}`}>
          ✓ Settings saved successfully.
        </div>
      )}

      {/* Agency Identity */}
      <div className={styles.formSection}>
        <div className={styles.formSectionTitle}>Agency Identity</div>

        <div className={styles.field}>
          <label className={styles.label}>Agency Name</label>
          <input
            className={styles.input}
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            required
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Tagline</label>
          <input
            className={styles.input}
            value={form.tagline}
            onChange={(e) => set('tagline', e.target.value)}
            placeholder="Trusted care for every family"
            maxLength={120}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Description</label>
          <textarea
            className={`${styles.input} ${styles.textarea}`}
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Tell clients about your agency…"
            rows={4}
          />
        </div>

        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label className={styles.label}>Contact Email</label>
            <input
              type="email"
              className={styles.input}
              value={form.contact_email}
              onChange={(e) => set('contact_email', e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Contact Phone</label>
            <input
              type="tel"
              className={styles.input}
              value={form.contact_phone}
              onChange={(e) => set('contact_phone', e.target.value)}
            />
          </div>
        </div>

        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label className={styles.label}>Address</label>
            <input
              className={styles.input}
              value={form.address}
              onChange={(e) => set('address', e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Location Area</label>
            <input
              className={styles.input}
              value={form.location_area}
              onChange={(e) => set('location_area', e.target.value)}
              placeholder="e.g. Nairobi, Kenya"
            />
          </div>
        </div>

        <div className={styles.field}>
          <label
            style={{
              display: 'flex',
              gap: 10,
              alignItems: 'center',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={form.is_public}
              onChange={(e) => set('is_public', e.target.checked)}
            />
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Public listing</div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-muted)' }}>
                Allow clients to find and book your agency online.
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Matching & Billing Policy */}
      <div className={styles.formSection}>
        <div className={styles.formSectionTitle}>Matching & Billing Policy</div>

        <div className={styles.field}>
          <label className={styles.label}>Matching Mode</label>
          <select
            className={`${styles.input} ${styles.select}`}
            value={form.matching_mode}
            onChange={(e) => set('matching_mode', e.target.value)}
          >
            <option value="shortlist">Shortlist (manual pick)</option>
            <option value="auto_assign">Auto-assign</option>
          </select>
        </div>

        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label className={styles.label}>Platform Commission (%)</label>
            <input
              type="number"
              min={0}
              max={50}
              step={0.5}
              className={styles.input}
              value={form.agency_cut_pct}
              onChange={(e) => set('agency_cut_pct', e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Payout Cadence</label>
            <select
              className={`${styles.input} ${styles.select}`}
              value={form.payout_cadence}
              onChange={(e) => set('payout_cadence', e.target.value)}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
        </div>

        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label className={styles.label}>Cancellation Grace (hours)</label>
            <input
              type="number"
              min={0}
              className={styles.input}
              value={form.cancellation_grace_hours}
              onChange={(e) => set('cancellation_grace_hours', e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Emergency Surcharge (%)</label>
            <input
              type="number"
              min={0}
              className={styles.input}
              value={form.emergency_surcharge_pct}
              onChange={(e) => set('emergency_surcharge_pct', e.target.value)}
            />
          </div>
        </div>

        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label className={styles.label}>Overtime Threshold (hours/day)</label>
            <input
              type="number"
              min={1}
              className={styles.input}
              value={form.overtime_threshold_hours}
              onChange={(e) => set('overtime_threshold_hours', e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Overtime Multiplier</label>
            <input
              type="number"
              min={1}
              step={0.1}
              className={styles.input}
              value={form.overtime_multiplier}
              onChange={(e) => set('overtime_multiplier', e.target.value)}
            />
          </div>
        </div>

        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label className={styles.label}>Holiday Pay Rate (multiplier)</label>
            <input
              type="number"
              min={1}
              step={0.1}
              className={styles.input}
              value={form.holiday_pay_rate}
              onChange={(e) => set('holiday_pay_rate', e.target.value)}
            />
          </div>
        </div>

        {[
          {
            key: 'auto_invoice' as const,
            label: 'Auto-generate invoices',
            sub: 'Create invoice when assignment is completed.',
          },
          {
            key: 'require_timelog' as const,
            label: 'Require time logging',
            sub: 'Workers must clock in/out for assignments.',
          },
          {
            key: 'continuity_preference' as const,
            label: 'Continuity preference',
            sub: 'Prefer the same worker for repeat clients.',
          },
        ].map(({ key, label, sub }) => (
          <div key={key} className={styles.field}>
            <label
              style={{
                display: 'flex',
                gap: 10,
                alignItems: 'flex-start',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={form[key]}
                onChange={(e) => set(key, e.target.checked)}
                style={{ marginTop: 3 }}
              />
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{label}</div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-muted)' }}>
                  {sub}
                </div>
              </div>
            </label>
          </div>
        ))}
      </div>

      {/* Public Page Configuration */}
      <div className={styles.formSection}>
        <div className={styles.formSectionTitle}>Public Page Configuration</div>
        
        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label className={styles.label}>Hero Headline</label>
            <input
              className={styles.input}
              value={form.hero_headline}
              onChange={(e) => set('hero_headline', e.target.value)}
              placeholder="e.g. Care you can trust"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Hero Subtitle</label>
            <input
              className={styles.input}
              value={form.hero_subtitle}
              onChange={(e) => set('hero_subtitle', e.target.value)}
              placeholder="e.g. Vetted professionals for your family"
            />
          </div>
        </div>

        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label className={styles.label}>Pitch Title</label>
            <input
              className={styles.input}
              value={form.pitch_title}
              onChange={(e) => set('pitch_title', e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Hero Pattern</label>
            <select
              className={`${styles.input} ${styles.select}`}
              value={form.hero_pattern}
              onChange={(e) => set('hero_pattern', e.target.value)}
            >
              <option value="none">None</option>
              <option value="dots">Dots</option>
              <option value="grid">Grid</option>
              <option value="waves">Waves</option>
            </select>
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Pitch Body</label>
          <textarea
            className={`${styles.input} ${styles.textarea}`}
            value={form.pitch_body}
            onChange={(e) => set('pitch_body', e.target.value)}
            rows={3}
          />
        </div>

        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label className={styles.label}>CTA Text</label>
            <input
              className={styles.input}
              value={form.cta_text}
              onChange={(e) => set('cta_text', e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>CTA Subtext</label>
            <input
              className={styles.input}
              value={form.cta_subtext}
              onChange={(e) => set('cta_subtext', e.target.value)}
            />
          </div>
        </div>

        {[
          {
            key: 'show_services' as const,
            label: 'Show Services Section',
            sub: 'Display the list of services you offer.',
          },
          {
            key: 'show_workers' as const,
            label: 'Show Worker Directory',
            sub: 'Display a list of your active public workers.',
          },
        ].map(({ key, label, sub }) => (
          <div key={key} className={styles.field}>
            <label
              style={{
                display: 'flex',
                gap: 10,
                alignItems: 'flex-start',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={form[key]}
                onChange={(e) => set(key, e.target.checked)}
                style={{ marginTop: 3 }}
              />
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{label}</div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-muted)' }}>
                  {sub}
                </div>
              </div>
            </label>
          </div>
        ))}
      </div>

      {/* AI Design Customization */}
      <div className={styles.formSection} style={{ border: '1px solid var(--aim)', background: 'rgba(56, 189, 248, 0.05)' }}>
        <div className={styles.formSectionTitle} style={{ color: 'var(--aim)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>✨</span> AI Design Customization
        </div>
        <p style={{ fontSize: 13.5, color: 'var(--ink-muted)', marginBottom: 16 }}>
          Describe how you want your public page to look and feel, and our AI Copilot will update your configuration automatically.
        </p>

        {aiError && (
          <div className={`${styles.notice} ${styles.noticeDanger}`} style={{ marginBottom: 16 }}>{aiError}</div>
        )}
        {aiSuccess && (
          <div className={`${styles.notice} ${styles.noticeVerified}`} style={{ marginBottom: 16 }}>
            ✓ AI generated new settings! Click "Save Changes" below to apply them.
          </div>
        )}

        <div className={styles.field}>
          <textarea
            className={`${styles.input} ${styles.textarea}`}
            style={{ borderColor: 'var(--aim)' }}
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="e.g. Make my page look like a luxury hotel, formal tone, use 'grid' pattern..."
            rows={3}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
          <button
            type="button"
            className="btn btn--sm"
            style={{ background: 'var(--aim)', color: '#fff', border: 'none' }}
            onClick={handleAiCustomize}
            disabled={aiLoading || !aiPrompt.trim()}
          >
            {aiLoading ? 'Generating...' : '✨ Auto-fill with AI'}
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div
        className={styles.formSection}
        style={{ borderColor: 'var(--danger)', background: 'var(--danger-bg)' }}
      >
        <div className={styles.formSectionTitle} style={{ color: 'var(--danger)' }}>
          Danger Zone
        </div>
        <p style={{ fontSize: 13.5, color: 'var(--danger)', marginBottom: 16 }}>
          These actions are irreversible. Be very careful.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            className="btn btn--sm btn--outline"
            style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
            onClick={() => {
              if (
                confirm(
                  'Are you sure you want to suspend your agency? Clients will not be able to book.'
                )
              ) {
                fetch(`/api/nanny/org`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ org_id: org.id, status: 'suspended' }),
                })
              }
            }}
          >
            Suspend Agency
          </button>
        </div>
      </div>

      {/* Save */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button
          type="submit"
          className="btn btn--dark btn--lg"
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}
