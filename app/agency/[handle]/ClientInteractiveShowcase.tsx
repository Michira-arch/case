'use client'

import { useState } from 'react'

interface TalentEntry {
  id: string
  name: string
  handle: string
  avatar: string
  custom_title: string
  category: string
  custom_rate: number | null
  availability: boolean
}

interface Props {
  roster: TalentEntry[]
  categories: string[]
  agencyId: string
  adminWhatsapp: string
}

export default function ClientInteractiveShowcase({ roster, categories, agencyId, adminWhatsapp }: Props) {
  const [filterCategory, setFilterCategory] = useState('')
  const [filterAvailability, setFilterAvailability] = useState(false)
  const [selectedTalent, setSelectedTalent] = useState<TalentEntry | null>(null)
  const [isBookingModalOpen, setBookingModalOpen] = useState(false)
  const [bookingStep, setBookingStep] = useState(1)
  const [bookingData, setBookingData] = useState({
    talentIds: [] as string[],
    service: '',
    date: '',
    budget: 5000,
    name: '',
    email: '',
    phone: '',
    whatsapp: '',
  })
  const [submitting, setSubmitting] = useState(false)

  const filteredRoster = roster.filter(t => {
    if (filterCategory && t.category !== filterCategory) return false
    if (filterAvailability && !t.availability) return false
    return true
  })

  const handleBookingSubmit = async () => {
    setSubmitting(true)
    try {
      await fetch(`/api/agency/${agencyId}/inquiry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData),
      })
      const text = encodeURIComponent(
        `Hi! I'm ${bookingData.name}. I'd like to enquire about "${bookingData.service}" on ${bookingData.date}. Budget: $${bookingData.budget.toLocaleString()}. My email: ${bookingData.email}`
      )
      window.open(`https://wa.me/${adminWhatsapp}?text=${text}`, '_blank')
      setBookingModalOpen(false)
      setBookingStep(1)
    } catch {
      alert('Error submitting inquiry. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const btn = (label: string, onClick: () => void, variant: 'primary' | 'ghost' = 'primary') => (
    <button
      onClick={onClick}
      style={{
        padding: '10px 20px',
        backgroundColor: variant === 'primary' ? 'var(--agency-primary)' : 'transparent',
        color: '#fff',
        border: variant === 'ghost' ? '1px solid #444' : 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '0.9rem',
        fontWeight: 600,
      }}
    >
      {label}
    </button>
  )

  return (
    <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 24px' }}>
      {/* Filter Bar */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '32px', alignItems: 'center', flexWrap: 'wrap' }}>
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          style={{ padding: '8px 14px', backgroundColor: '#1e1e1e', color: '#fff', border: '1px solid #333', borderRadius: '6px', fontSize: '0.9rem' }}
        >
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#d1d5db', fontSize: '0.9rem' }}>
          <input type="checkbox" checked={filterAvailability} onChange={e => setFilterAvailability(e.target.checked)} />
          Available Now
        </label>
        <span style={{ marginLeft: 'auto', color: '#6b7280', fontSize: '0.85rem' }}>
          {filteredRoster.length} of {roster.length} talent
        </span>
      </div>

      {/* Roster Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px', marginBottom: '80px' }}>
        {filteredRoster.map(t => (
          <div
            key={t.id}
            onClick={() => setSelectedTalent(t)}
            role="button"
            tabIndex={0}
            style={{
              backgroundColor: '#141418',
              borderRadius: '12px',
              overflow: 'hidden',
              border: '1px solid #2a2a2a',
              cursor: 'pointer',
              transition: 'border-color 0.2s, transform 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--agency-primary)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2a2a'; e.currentTarget.style.transform = 'translateY(0)' }}
          >
            {/* Card image area */}
            <div style={{ height: '160px', background: 'linear-gradient(135deg, #1e1e2e 0%, #16181f 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {t.avatar ? (
                <img src={t.avatar} alt={t.name} style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '72px', height: '72px', borderRadius: '50%', backgroundColor: '#2a2a3a', border: '2px solid var(--agency-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 700, color: '#fff' }}>
                  {t.name.charAt(0)}
                </div>
              )}
            </div>

            <div style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div>
                  <h3 style={{ margin: '0 0 3px 0', fontSize: '16px', fontWeight: 700, color: '#f9fafb' }}>{t.name}</h3>
                  <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>@{t.handle}</p>
                </div>
                <span style={{ fontSize: '11px', padding: '3px 8px', backgroundColor: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '12px', color: '#a5b4fc', whiteSpace: 'nowrap' }}>
                  {t.category}
                </span>
              </div>
              <p style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 600, color: '#e5e7eb' }}>{t.custom_title}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {t.custom_rate
                  ? <span style={{ fontSize: '13px', color: '#10b981', fontWeight: 600 }}>From ${t.custom_rate.toLocaleString()}</span>
                  : <span style={{ fontSize: '13px', color: '#6b7280' }}>Rate on request</span>
                }
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: t.availability ? '#10b981' : '#6b7280', display: 'inline-block' }} title={t.availability ? 'Available' : 'Unavailable'} />
              </div>
            </div>
          </div>
        ))}

        {filteredRoster.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 0', color: '#4b5563' }}>
            <p style={{ fontSize: '2rem', margin: '0 0 8px 0' }}>🔍</p>
            <p style={{ margin: 0 }}>No talent matches these filters.</p>
          </div>
        )}
      </div>

      {/* Talent Slide-over Drawer */}
      {selectedTalent && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setSelectedTalent(null)}
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 99 }}
          />
          <aside style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '400px', backgroundColor: '#111116', borderLeft: '1px solid #2a2a2a', padding: '32px 24px', zIndex: 100, overflowY: 'auto' }}>
            <button onClick={() => setSelectedTalent(null)} style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: '22px', cursor: 'pointer', float: 'right', lineHeight: 1 }}>✕</button>
            <div style={{ clear: 'both' }} />

            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ width: '96px', height: '96px', borderRadius: '50%', backgroundColor: '#2a2a3a', border: '2px solid var(--agency-primary)', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', fontWeight: 700 }}>
                {selectedTalent.name.charAt(0)}
              </div>
              <h2 style={{ margin: '0 0 4px 0', fontSize: '1.4rem', fontWeight: 800 }}>{selectedTalent.name}</h2>
              <p style={{ margin: '0 0 4px 0', color: '#6b7280', fontSize: '0.9rem' }}>@{selectedTalent.handle}</p>
              <p style={{ margin: 0, color: 'var(--agency-primary)', fontWeight: 700, fontSize: '0.95rem' }}>{selectedTalent.custom_title}</p>
            </div>

            <div style={{ backgroundColor: '#1a1a20', padding: '16px', borderRadius: '10px', marginBottom: '20px' }}>
              {[
                ['Category', selectedTalent.category],
                ['Rate', selectedTalent.custom_rate ? `$${selectedTalent.custom_rate.toLocaleString()}` : 'Upon request'],
                ['Availability', selectedTalent.availability ? '✅ Available' : '⏸ Unavailable'],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #2a2a2a', fontSize: '0.875rem' }}>
                  <span style={{ color: '#6b7280' }}>{label}</span>
                  <span style={{ color: '#f9fafb', fontWeight: 600 }}>{value}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => { setSelectedTalent(null); setBookingData(d => ({ ...d, talentIds: [selectedTalent.id] })); setBookingModalOpen(true) }}
              style={{ width: '100%', padding: '12px', backgroundColor: 'var(--agency-primary)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem' }}
            >
              Book {selectedTalent.name}
            </button>
          </aside>
        </>
      )}

      {/* Floating Book Button */}
      <button
        onClick={() => setBookingModalOpen(true)}
        style={{
          position: 'fixed', bottom: '32px', right: '32px',
          padding: '16px 28px',
          backgroundColor: 'var(--agency-primary)',
          color: '#fff', border: 'none', borderRadius: '32px',
          fontSize: '1rem', fontWeight: 700, cursor: 'pointer',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          zIndex: 90,
        }}
      >
        📋 Book This Agency
      </button>

      {/* Booking Modal */}
      {isBookingModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '24px' }}>
          <div style={{ backgroundColor: '#111116', padding: '32px', borderRadius: '16px', width: '100%', maxWidth: '520px', border: '1px solid #2a2a2a' }}>
            {/* Progress */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
              {[1, 2, 3].map(s => (
                <div key={s} style={{ flex: 1, height: '3px', borderRadius: '2px', backgroundColor: bookingStep >= s ? 'var(--agency-primary)' : '#2a2a2a', transition: 'background-color 0.3s' }} />
              ))}
            </div>

            <h2 style={{ margin: '0 0 6px 0', fontSize: '1.2rem', fontWeight: 800 }}>
              {bookingStep === 1 ? '🎭 Select Talent' : bookingStep === 2 ? '📋 Job Details' : '📞 Your Contact'}
            </h2>
            <p style={{ margin: '0 0 24px 0', color: '#6b7280', fontSize: '0.875rem' }}>Step {bookingStep} of 3</p>

            {bookingStep === 1 && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '24px' }}>
                  {roster.map(t => (
                    <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', backgroundColor: bookingData.talentIds.includes(t.id) ? 'rgba(99,102,241,0.15)' : '#1a1a20', border: `1px solid ${bookingData.talentIds.includes(t.id) ? 'rgba(99,102,241,0.5)' : '#2a2a2a'}`, borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem', transition: 'all 0.15s' }}>
                      <input
                        type="checkbox"
                        checked={bookingData.talentIds.includes(t.id)}
                        onChange={e => {
                          const ids = e.target.checked
                            ? [...bookingData.talentIds, t.id]
                            : bookingData.talentIds.filter(id => id !== t.id)
                          setBookingData({ ...bookingData, talentIds: ids })
                        }}
                        style={{ accentColor: 'var(--agency-primary)' }}
                      />
                      <span style={{ color: '#e5e7eb', fontWeight: 600 }}>{t.name}</span>
                    </label>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  {btn('Cancel', () => setBookingModalOpen(false), 'ghost')}
                  {btn('Next →', () => setBookingStep(2))}
                </div>
              </div>
            )}

            {bookingStep === 2 && (
              <div>
                <textarea
                  placeholder="Describe the service you need…"
                  value={bookingData.service}
                  onChange={e => setBookingData({ ...bookingData, service: e.target.value })}
                  style={{ width: '100%', height: '90px', marginBottom: '12px', padding: '12px', backgroundColor: '#1a1a20', color: '#f9fafb', border: '1px solid #2a2a2a', borderRadius: '8px', resize: 'vertical', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
                <input
                  type="date"
                  value={bookingData.date}
                  onChange={e => setBookingData({ ...bookingData, date: e.target.value })}
                  style={{ width: '100%', marginBottom: '16px', padding: '11px 12px', backgroundColor: '#1a1a20', color: '#f9fafb', border: '1px solid #2a2a2a', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.875rem', color: '#9ca3af' }}>Budget</span>
                    <span style={{ fontSize: '0.875rem', color: '#10b981', fontWeight: 700 }}>${bookingData.budget.toLocaleString()}</span>
                  </div>
                  <input
                    type="range" min="5000" max="5000000" step="5000"
                    value={bookingData.budget}
                    onChange={e => setBookingData({ ...bookingData, budget: Number(e.target.value) })}
                    style={{ width: '100%', accentColor: 'var(--agency-primary)' } as React.CSSProperties}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '0.75rem', color: '#4b5563' }}>
                    <span>$5k</span><span>$5M</span>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  {btn('← Back', () => setBookingStep(1), 'ghost')}
                  {btn('Next →', () => setBookingStep(3))}
                </div>
              </div>
            )}

            {bookingStep === 3 && (
              <div>
                {[
                  { placeholder: 'Full Name', type: 'text', key: 'name' },
                  { placeholder: 'Email Address', type: 'email', key: 'email' },
                  { placeholder: 'Phone Number', type: 'tel', key: 'phone' },
                  { placeholder: 'WhatsApp Number (optional)', type: 'tel', key: 'whatsapp' },
                ].map(field => (
                  <input
                    key={field.key}
                    type={field.type}
                    placeholder={field.placeholder}
                    value={(bookingData as any)[field.key]}
                    onChange={e => setBookingData({ ...bookingData, [field.key]: e.target.value })}
                    style={{ width: '100%', marginBottom: '12px', padding: '11px 12px', backgroundColor: '#1a1a20', color: '#f9fafb', border: '1px solid #2a2a2a', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }}
                  />
                ))}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                  {btn('← Back', () => setBookingStep(2), 'ghost')}
                  <button
                    onClick={handleBookingSubmit}
                    disabled={submitting || !bookingData.name || !bookingData.email}
                    style={{ padding: '10px 20px', backgroundColor: submitting ? '#4b5563' : 'var(--agency-primary)', color: '#fff', border: 'none', borderRadius: '6px', cursor: submitting ? 'not-allowed' : 'pointer', fontSize: '0.9rem', fontWeight: 700 }}
                  >
                    {submitting ? 'Sending…' : 'Submit & WhatsApp →'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  )
}
