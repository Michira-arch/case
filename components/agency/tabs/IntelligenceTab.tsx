'use client';

import React, { useState, useEffect } from 'react';

// Mock Data Types
type Member = {
  id: string;
  name: string;
  category: string;
  visibility: 'public' | 'private';
  custom_rate?: number;
  role: 'admin' | 'talent';
  joined_at: string;
  completeness_score: number;
};

type EventLog = {
  id: string;
  event_type: string;
  metadata: any;
  created_at: string;
  suggestion?: string;
};

export default function IntelligenceTab({ agencyId }: { agencyId: string }) {
  // Mock Roster
  const [roster] = useState<Member[]>([
    { id: '1', name: 'Alice', category: 'Design', visibility: 'public', custom_rate: 150, role: 'talent', joined_at: '2026-06-01T00:00:00Z', completeness_score: 95 },
    { id: '2', name: 'Bob', category: 'Engineering', visibility: 'public', role: 'talent', joined_at: '2025-01-01T00:00:00Z', completeness_score: 75 },
    { id: '3', name: 'Charlie', category: 'Design', visibility: 'private', role: 'admin', joined_at: '2026-07-10T00:00:00Z', completeness_score: 100 },
    { id: '4', name: 'Diana', category: 'Marketing', visibility: 'public', custom_rate: 200, role: 'talent', joined_at: '2025-10-01T00:00:00Z', completeness_score: 60 },
  ]);

  // Matchmaking State
  const [inquiry, setInquiry] = useState('');
  const [category, setCategory] = useState('Design');
  const [budget, setBudget] = useState(5000);
  const [matches, setMatches] = useState<(Member & { score: number })[]>([]);

  const handleMatchmaking = () => {
    const scored = roster.map(member => {
      let score = 0;
      if (member.category === category) score += 40;
      if (member.visibility === 'public') score += 20;
      if (member.custom_rate) score += 10;
      if (member.role !== 'admin') score += 20;
      
      const daysSinceJoined = (new Date().getTime() - new Date(member.joined_at).getTime()) / (1000 * 3600 * 24);
      if (daysSinceJoined < 30) {
        score += 10;
      } else {
        score += 15; // Bonus if established
      }
      
      return { ...member, score };
    }).sort((a, b) => b.score - a.score);
    
    setMatches(scored);
  };

  // Churn Risk
  const getChurnStatus = (joinedAt: string) => {
    const days = (new Date().getTime() - new Date(joinedAt).getTime()) / (1000 * 3600 * 24);
    if (days < 30) return { label: 'New', color: '#3b82f6', days: Math.floor(days) };
    if (days < 90) return { label: 'Active', color: '#22c55e', days: Math.floor(days) };
    if (days < 180) return { label: 'Cooling', color: '#f59e0b', days: Math.floor(days) };
    return { label: 'At-Risk', color: '#ef4444', days: Math.floor(days) };
  };

  const [nudgeModal, setNudgeModal] = useState<{ isOpen: boolean; member: Member | null; message: string }>({
    isOpen: false, member: null, message: ''
  });

  // Completeness Audit
  const minThreshold = 80;
  const handleUpdateNudge = async (memberId: string) => {
    try {
      await fetch(`/api/agency/${agencyId}/nudge`, {
        method: 'POST',
        body: JSON.stringify({ memberId, type: 'completeness' })
      });
      alert('Nudge sent!');
    } catch (e) {
      console.error(e);
      alert('Failed to send nudge, mock response.');
    }
  };

  // Pattern Learning Feed
  const [events] = useState<EventLog[]>([
    { id: 'e1', event_type: 'member_approved', metadata: {}, created_at: new Date().toISOString() },
    { id: 'e2', event_type: 'member_approved', metadata: {}, created_at: new Date().toISOString() },
    { id: 'e3', event_type: 'member_approved', metadata: {}, created_at: new Date().toISOString(), suggestion: 'Consider creating a Manager role to delegate roster approvals' },
  ]);

  // Client Sentiment (6 months)
  const sentimentData = [
    { month: 'Feb', rate: 65 },
    { month: 'Mar', rate: 70 },
    { month: 'Apr', rate: 60 },
    { month: 'May', rate: 85 },
    { month: 'Jun', rate: 90 },
    { month: 'Jul', rate: 88 },
  ];

  return (
    <div style={{ padding: '24px', color: '#fff', backgroundColor: '#121212', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: '24px', marginBottom: '24px', fontWeight: 'bold' }}>AI Smart Nudges & Intelligence</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        
        {/* Matchmaking Panel */}
        <div style={{ backgroundColor: '#1e1e1e', padding: '20px', borderRadius: '8px', border: '1px solid #333' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Matchmaking Panel</h2>
          <textarea 
            placeholder="Paste client inquiry..." 
            value={inquiry}
            onChange={(e) => setInquiry(e.target.value)}
            style={{ width: '100%', height: '80px', marginBottom: '12px', padding: '8px', backgroundColor: '#2a2a2a', color: '#fff', border: '1px solid #444', borderRadius: '4px' }}
          />
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
            <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ padding: '8px', backgroundColor: '#2a2a2a', color: '#fff', border: '1px solid #444', borderRadius: '4px', flex: 1 }}>
              <option value="Design">Design</option>
              <option value="Engineering">Engineering</option>
              <option value="Marketing">Marketing</option>
            </select>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>${budget}</span>
              <input type="range" min="1000" max="50000" step="1000" value={budget} onChange={(e) => setBudget(Number(e.target.value))} style={{ flex: 1 }} />
            </div>
          </div>
          <button onClick={handleMatchmaking} style={{ width: '100%', padding: '10px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Find Best Match
          </button>

          {matches.length > 0 && (
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {matches.map(m => (
                <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: '#2a2a2a', borderRadius: '4px' }}>
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{m.name}</div>
                    <div style={{ fontSize: '12px', color: '#aaa' }}>{m.category}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ padding: '4px 8px', backgroundColor: '#333', borderRadius: '12px', fontSize: '12px' }}>{m.score} pts</span>
                    <button style={{ padding: '6px 12px', backgroundColor: '#22c55e', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Add to Pitch</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Completeness Audit */}
        <div style={{ backgroundColor: '#1e1e1e', padding: '20px', borderRadius: '8px', border: '1px solid #333' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Completeness Audit</h2>
          <div style={{ fontSize: '14px', marginBottom: '16px', color: '#aaa' }}>Target Threshold: {minThreshold}%</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #444' }}>
                <th style={{ paddingBottom: '8px' }}>Member</th>
                <th style={{ paddingBottom: '8px' }}>Score</th>
                <th style={{ paddingBottom: '8px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {roster.map(m => (
                <tr key={m.id} style={{ borderBottom: '1px solid #333' }}>
                  <td style={{ padding: '12px 0' }}>{m.name}</td>
                  <td style={{ padding: '12px 0', color: m.completeness_score < minThreshold ? '#f59e0b' : '#22c55e' }}>
                    {m.completeness_score}%
                  </td>
                  <td style={{ padding: '12px 0' }}>
                    {m.completeness_score < minThreshold && (
                      <button onClick={() => handleUpdateNudge(m.id)} style={{ padding: '6px 12px', backgroundColor: '#f59e0b', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                        Send Update Nudge
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        
        {/* Churn Risk Monitor */}
        <div style={{ backgroundColor: '#1e1e1e', padding: '20px', borderRadius: '8px', border: '1px solid #333' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Churn Risk Monitor</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {roster.map(m => {
              const status = getChurnStatus(m.joined_at);
              return (
                <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: '#2a2a2a', borderRadius: '4px', borderLeft: `4px solid ${status.color}` }}>
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{m.name}</div>
                    <div style={{ fontSize: '12px', color: '#aaa' }}>{status.days} days active</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ color: status.color, fontSize: '14px', fontWeight: 'bold' }}>{status.label}</span>
                    <button 
                      onClick={() => setNudgeModal({ isOpen: true, member: m, message: `Hi ${m.name}, we've missed you! Check out some new opportunities.` })} 
                      style={{ padding: '6px 12px', backgroundColor: '#444', color: '#fff', border: '1px solid #555', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                    >
                      Send Nudge
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Sentiment & Patterns */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div style={{ backgroundColor: '#1e1e1e', padding: '20px', borderRadius: '8px', border: '1px solid #333' }}>
            <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Client Sentiment Trend</h2>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '150px', paddingBottom: '24px', position: 'relative' }}>
              {sentimentData.map((d, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                  <div style={{ width: '100%', backgroundColor: '#3b82f6', height: `${d.rate}%`, borderRadius: '4px 4px 0 0', transition: 'height 0.3s' }} />
                  <div style={{ position: 'absolute', bottom: 0, fontSize: '12px', color: '#aaa' }}>{d.month}</div>
                  <div style={{ position: 'absolute', bottom: '155px', fontSize: '10px', color: '#fff' }}>{d.rate}%</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ backgroundColor: '#1e1e1e', padding: '20px', borderRadius: '8px', border: '1px solid #333' }}>
            <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Pattern Learning Feed</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {events.map((e, i) => (
                <div key={e.id} style={{ padding: '12px', backgroundColor: '#2a2a2a', borderRadius: '4px', border: '1px solid #444' }}>
                  <div style={{ fontSize: '14px', marginBottom: '4px' }}>Event: {e.event_type}</div>
                  <div style={{ fontSize: '12px', color: '#aaa', marginBottom: e.suggestion ? '8px' : '0' }}>{new Date(e.created_at).toLocaleString()}</div>
                  {e.suggestion && (
                    <div style={{ padding: '8px', backgroundColor: '#3b82f620', border: '1px solid #3b82f6', borderRadius: '4px', marginTop: '8px' }}>
                      <div style={{ fontSize: '13px', color: '#60a5fa', marginBottom: '8px' }}>💡 {e.suggestion}</div>
                      <button style={{ padding: '4px 8px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                        Apply Suggestion
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {nudgeModal.isOpen && nudgeModal.member && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: '#1e1e1e', padding: '24px', borderRadius: '8px', width: '400px', border: '1px solid #444' }}>
            <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Send Nudge to {nudgeModal.member.name}</h3>
            <textarea 
              value={nudgeModal.message}
              onChange={(e) => setNudgeModal({ ...nudgeModal, message: e.target.value })}
              style={{ width: '100%', height: '100px', marginBottom: '16px', padding: '8px', backgroundColor: '#2a2a2a', color: '#fff', border: '1px solid #444', borderRadius: '4px' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setNudgeModal({ isOpen: false, member: null, message: '' })} style={{ padding: '8px 16px', backgroundColor: '#333', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => { alert('Nudge sent!'); setNudgeModal({ isOpen: false, member: null, message: '' }); }} style={{ padding: '8px 16px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Send</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
