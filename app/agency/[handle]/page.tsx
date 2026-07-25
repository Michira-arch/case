import React from 'react';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

// Since this is a server component mock, we'll implement the interactive parts 
// (filters and booking modal) via inline client components defined in this file.

export const revalidate = 60;

export default async function AgencyShowcasePage({ params }: { params: { handle: string } }) {
  // 1. Mock DB Fetch
  // In reality: const supabase = createClient();
  // const { data: agency } = await supabase.from('agencies').select('*').eq('handle', params.handle).single();
  const agency = {
    id: 'a1',
    handle: params.handle,
    name: 'Neon Creatives',
    tagline: 'Future-focused digital experiences',
    primary_color: '#ff0055',
    secondary_color: '#00ffff',
    is_verified: true,
    location: 'London, UK',
    banner_url: '',
    admin_whatsapp: '1234567890'
  };

  const roster = [
    { id: 't1', name: 'Zane', handle: 'zane', avatar: '', custom_title: '3D Motion Lead', category: 'Design', custom_rate: 1000, availability: true },
    { id: 't2', name: 'Elara', handle: 'elara', avatar: '', custom_title: 'Fullstack Dev', category: 'Engineering', custom_rate: null, availability: true },
    { id: 't3', name: 'Jax', handle: 'jax', avatar: '', custom_title: 'Growth Marketer', category: 'Marketing', custom_rate: 800, availability: false },
  ];

  const categories = Array.from(new Set(roster.map(r => r.category)));

  return (
    <div style={{ backgroundColor: '#0a0a0a', color: '#fff', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <style>{`:root { --agency-primary: ${agency.primary_color}; --agency-secondary: ${agency.secondary_color}; }`}</style>
      
      {/* Meta Tags Note: In Next.js App Router, these go in generateMetadata() exported from the page file, 
          but for visual completeness of this single file: */}
      <head>
        <title>{agency.name} | Case</title>
        <meta name="description" content={agency.tagline} />
        <meta property="og:title" content={agency.name} />
        <meta property="og:description" content={agency.tagline} />
      </head>

      {/* Hero Section */}
      <header style={{ 
        width: '100%', 
        height: '300px', 
        background: agency.banner_url ? `url(${agency.banner_url})` : `linear-gradient(135deg, var(--agency-primary) 0%, #111 100%)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        borderBottom: '1px solid #333'
      }}>
        <div style={{ 
          width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#222', border: '2px solid var(--agency-primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold', marginBottom: '16px'
        }}>
          {agency.name.charAt(0)}
        </div>
        <h1 style={{ fontSize: '36px', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {agency.name}
          {agency.is_verified && (
            <span style={{ fontSize: '18px', color: 'var(--agency-secondary)' }}>✓</span>
          )}
        </h1>
        <p style={{ fontSize: '18px', color: '#ddd', margin: '0 0 8px 0' }}>{agency.tagline}</p>
        <p style={{ fontSize: '14px', color: '#aaa', margin: 0 }}>📍 {agency.location}</p>
      </header>

      {/* Interactive Roster Client Component */}
      <ClientInteractiveShowcase roster={roster} categories={categories} agencyId={agency.id} adminWhatsapp={agency.admin_whatsapp} />

    </div>
  );
}

// Inline Client Component for Interactivity
'use client';
import { useState } from 'react';

function ClientInteractiveShowcase({ roster, categories, agencyId, adminWhatsapp }: { roster: any[], categories: string[], agencyId: string, adminWhatsapp: string }) {
  const [filterCategory, setFilterCategory] = useState('');
  const [filterAvailability, setFilterAvailability] = useState(false);
  const [selectedTalent, setSelectedTalent] = useState<any | null>(null);
  
  // Booking Modal State
  const [isBookingModalOpen, setBookingModalOpen] = useState(false);
  const [bookingStep, setBookingStep] = useState(1);
  const [bookingData, setBookingData] = useState({ talentIds: [] as string[], service: '', date: '', budget: 5000, name: '', email: '', phone: '', whatsapp: '' });

  const filteredRoster = roster.filter(t => {
    if (filterCategory && t.category !== filterCategory) return false;
    if (filterAvailability && !t.availability) return false;
    return true;
  });

  const handleBookingSubmit = async () => {
    try {
      await fetch(`/api/agency/${agencyId}/inquiry`, {
        method: 'POST',
        body: JSON.stringify(bookingData)
      });
      // Redirect to WhatsApp
      const text = encodeURIComponent(`New Inquiry from ${bookingData.name} for ${bookingData.service}. Budget: $${bookingData.budget}`);
      window.location.href = `https://wa.me/${adminWhatsapp}?text=${text}`;
    } catch (e) {
      alert('Error submitting inquiry.');
    }
  };

  return (
    <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 24px' }}>
      
      {/* Filter Bar */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '32px', alignItems: 'center' }}>
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} style={{ padding: '8px 12px', backgroundColor: '#1e1e1e', color: '#fff', border: '1px solid #333', borderRadius: '4px' }}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input type="checkbox" checked={filterAvailability} onChange={(e) => setFilterAvailability(e.target.checked)} />
          Available Now
        </label>
      </div>

      {/* Roster Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
        {filteredRoster.map(t => (
          <div 
            key={t.id} 
            onClick={() => setSelectedTalent(t)}
            style={{ 
              backgroundColor: '#1e1e1e', borderRadius: '8px', overflow: 'hidden', border: '1px solid #333',
              cursor: 'pointer', transition: 'border-color 0.2s'
            }}
            onMouseOver={(e) => (e.currentTarget.style.borderColor = 'var(--agency-primary)')}
            onMouseOut={(e) => (e.currentTarget.style.borderColor = '#333')}
          >
            <div style={{ height: '200px', backgroundColor: '#2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {/* Avatar placeholder */}
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{t.name.charAt(0)}</div>
            </div>
            <div style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '18px' }}>{t.name}</h3>
                  <p style={{ margin: 0, fontSize: '14px', color: '#aaa' }}>@{t.handle}</p>
                </div>
                <span style={{ fontSize: '12px', padding: '4px 8px', backgroundColor: '#333', borderRadius: '12px', color: 'var(--agency-secondary)' }}>
                  {t.category}
                </span>
              </div>
              <p style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 'bold' }}>{t.custom_title}</p>
              {t.custom_rate && <p style={{ margin: 0, fontSize: '14px', color: '#888' }}>Starts at ${t.custom_rate}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* Talent Slide-over Drawer (Client-side) */}
      {selectedTalent && (
        <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '400px', backgroundColor: '#1a1a1a', borderLeft: '1px solid #333', padding: '24px', zIndex: 100, boxShadow: '-5px 0 20px rgba(0,0,0,0.5)', overflowY: 'auto' }}>
          <button onClick={() => setSelectedTalent(null)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '24px', cursor: 'pointer', float: 'right' }}>&times;</button>
          
          <div style={{ width: '100px', height: '100px', borderRadius: '50%', backgroundColor: '#444', margin: '0 auto 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>
            {selectedTalent.name.charAt(0)}
          </div>
          <h2 style={{ textAlign: 'center', margin: '0 0 8px 0' }}>{selectedTalent.name}</h2>
          <p style={{ textAlign: 'center', color: 'var(--agency-primary)', fontWeight: 'bold', margin: '0 0 24px 0' }}>{selectedTalent.custom_title}</p>
          
          <div style={{ backgroundColor: '#2a2a2a', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
            <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#aaa' }}>Category: <span style={{ color: '#fff' }}>{selectedTalent.category}</span></p>
            <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#aaa' }}>Rate: <span style={{ color: '#fff' }}>{selectedTalent.custom_rate ? `$${selectedTalent.custom_rate}` : 'Upon request'}</span></p>
            <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#aaa' }}>Proofs: <span style={{ color: '#fff' }}>12 Vouched</span></p>
          </div>

          <p style={{ lineHeight: '1.6', fontSize: '14px', color: '#ccc' }}>Mock bio representing the talent's full Case profile snapshot. This would normally be fetched via SWR.</p>
        </div>
      )}

      {/* Floating Book Button */}
      <button 
        onClick={() => setBookingModalOpen(true)}
        style={{ 
          position: 'fixed', bottom: '32px', right: '32px', padding: '16px 32px', 
          backgroundColor: 'var(--agency-primary)', color: '#fff', border: 'none', borderRadius: '32px', 
          fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', zIndex: 90
        }}
      >
        Book This Agency
      </button>

      {/* Booking Modal */}
      {isBookingModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ backgroundColor: '#1e1e1e', padding: '32px', borderRadius: '12px', width: '500px', border: '1px solid #333' }}>
            <h2 style={{ margin: '0 0 24px 0' }}>Book Inquiry (Step {bookingStep}/3)</h2>
            
            {bookingStep === 1 && (
              <div>
                <p style={{ marginBottom: '16px' }}>Select Talent:</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '24px' }}>
                  {roster.map(t => (
                    <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', backgroundColor: '#2a2a2a', borderRadius: '4px', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={bookingData.talentIds.includes(t.id)}
                        onChange={(e) => {
                          const ids = e.target.checked ? [...bookingData.talentIds, t.id] : bookingData.talentIds.filter(id => id !== t.id);
                          setBookingData({ ...bookingData, talentIds: ids });
                        }}
                      />
                      {t.name}
                    </label>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <button onClick={() => setBookingModalOpen(false)} style={{ padding: '10px 20px', background: 'none', color: '#fff', border: 'none', cursor: 'pointer' }}>Cancel</button>
                  <button onClick={() => setBookingStep(2)} style={{ padding: '10px 20px', backgroundColor: 'var(--agency-primary)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Next</button>
                </div>
              </div>
            )}

            {bookingStep === 2 && (
              <div>
                <textarea 
                  placeholder="Service description..." 
                  value={bookingData.service}
                  onChange={(e) => setBookingData({ ...bookingData, service: e.target.value })}
                  style={{ width: '100%', height: '100px', marginBottom: '16px', padding: '12px', backgroundColor: '#2a2a2a', color: '#fff', border: '1px solid #444', borderRadius: '4px' }}
                />
                <input 
                  type="date" 
                  value={bookingData.date}
                  onChange={(e) => setBookingData({ ...bookingData, date: e.target.value })}
                  style={{ width: '100%', marginBottom: '16px', padding: '12px', backgroundColor: '#2a2a2a', color: '#fff', border: '1px solid #444', borderRadius: '4px' }}
                />
                <div style={{ marginBottom: '24px' }}>
                  <p style={{ margin: '0 0 8px 0' }}>Budget: ${bookingData.budget}</p>
                  <input 
                    type="range" min="5000" max="5000000" step="5000" 
                    value={bookingData.budget}
                    onChange={(e) => setBookingData({ ...bookingData, budget: Number(e.target.value) })}
                    style={{ width: '100%' }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <button onClick={() => setBookingStep(1)} style={{ padding: '10px 20px', background: 'none', color: '#fff', border: 'none', cursor: 'pointer' }}>Back</button>
                  <button onClick={() => setBookingStep(3)} style={{ padding: '10px 20px', backgroundColor: 'var(--agency-primary)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Next</button>
                </div>
              </div>
            )}

            {bookingStep === 3 && (
              <div>
                <input 
                  type="text" placeholder="Your Name" 
                  value={bookingData.name} onChange={(e) => setBookingData({ ...bookingData, name: e.target.value })}
                  style={{ width: '100%', marginBottom: '12px', padding: '12px', backgroundColor: '#2a2a2a', color: '#fff', border: '1px solid #444', borderRadius: '4px' }}
                />
                <input 
                  type="email" placeholder="Email" 
                  value={bookingData.email} onChange={(e) => setBookingData({ ...bookingData, email: e.target.value })}
                  style={{ width: '100%', marginBottom: '12px', padding: '12px', backgroundColor: '#2a2a2a', color: '#fff', border: '1px solid #444', borderRadius: '4px' }}
                />
                <input 
                  type="tel" placeholder="Phone" 
                  value={bookingData.phone} onChange={(e) => setBookingData({ ...bookingData, phone: e.target.value })}
                  style={{ width: '100%', marginBottom: '12px', padding: '12px', backgroundColor: '#2a2a2a', color: '#fff', border: '1px solid #444', borderRadius: '4px' }}
                />
                <input 
                  type="tel" placeholder="WhatsApp Number (for direct chat)" 
                  value={bookingData.whatsapp} onChange={(e) => setBookingData({ ...bookingData, whatsapp: e.target.value })}
                  style={{ width: '100%', marginBottom: '24px', padding: '12px', backgroundColor: '#2a2a2a', color: '#fff', border: '1px solid #444', borderRadius: '4px' }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <button onClick={() => setBookingStep(2)} style={{ padding: '10px 20px', background: 'none', color: '#fff', border: 'none', cursor: 'pointer' }}>Back</button>
                  <button onClick={handleBookingSubmit} style={{ padding: '10px 20px', backgroundColor: 'var(--agency-primary)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Submit Inquiry</button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </main>
  );
}
