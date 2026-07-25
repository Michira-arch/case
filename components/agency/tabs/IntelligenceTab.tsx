'use client';

import React, { useState, useEffect } from 'react';

type Member = {
  id: string;
  name: string;
  category: string;
  visibility: 'public' | 'private';
  custom_rate?: number;
  role: 'admin' | 'talent' | 'manager' | 'member';
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
  const [roster, setRoster] = useState<Member[]>([]);
  const [events, setEvents] = useState<EventLog[]>([]);
  const [minThreshold, setMinThreshold] = useState(70);

  // Matchmaking State
  const [inquiry, setInquiry] = useState('');
  const [category, setCategory] = useState('General');
  const [budget, setBudget] = useState(5000);
  const [matches, setMatches] = useState<(Member & { score: number })[]>([]);

  const [nudgeModal, setNudgeModal] = useState<{ isOpen: boolean; member: Member | null; message: string }>({
    isOpen: false, member: null, message: ''
  });

  useEffect(() => {
    // Fetch DB members
    fetch(`/api/agency/${agencyId}/members`)
      .then(res => res.json())
      .then(data => {
        if (data.members) {
          const mapped: Member[] = data.members.map((m: any) => {
            const p = m.profile || {};
            const o = m.overlay || {};
            return {
              id: m.user_id || m.id,
              name: p.display_name || p.full_name || 'Talent',
              category: o.category || p.category || 'General',
              visibility: o.visibility_state || 'public',
              custom_rate: o.custom_rate || null,
              role: m.role || 'talent',
              joined_at: m.joined_at || new Date().toISOString(),
              completeness_score: p.completeness_score || 85,
            };
          });
          setRoster(mapped);
          if (mapped.length > 0) {
            setCategory(mapped[0].category || 'General');
          }
        }
      });

    // Fetch DB events
    fetch(`/api/agency/${agencyId}/events`)
      .then(res => res.json())
      .then(data => {
        const eventsList = Array.isArray(data) ? data : (data.events || []);
        setEvents(eventsList);
      });

    // Fetch DB rules
    fetch(`/api/agency/${agencyId}/rules`)
      .then(res => res.json())
      .then(data => {
        const rulesList = data.rules || Array.isArray(data) ? data : [];
        const minRule = rulesList.find((r: any) => r.rule_type === 'MIN_COMPLETENESS_SCORE');
        if (minRule?.configuration?.min_score) {
          setMinThreshold(minRule.configuration.min_score);
        }
      });
  }, [agencyId]);

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
        score += 15;
      }
      
      return { ...member, score };
    }).sort((a, b) => b.score - a.score);
    
    setMatches(scored);
  };

  const getChurnStatus = (joinedAt: string) => {
    const days = (new Date().getTime() - new Date(joinedAt).getTime()) / (1000 * 3600 * 24);
    if (days < 30) return { label: 'New', color: '#3b82f6', days: Math.max(1, Math.floor(days)) };
    if (days < 90) return { label: 'Active', color: '#22c55e', days: Math.floor(days) };
    if (days < 180) return { label: 'Cooling', color: '#f59e0b', days: Math.floor(days) };
    return { label: 'At-Risk', color: '#ef4444', days: Math.floor(days) };
  };

  const handleUpdateNudge = async (memberId: string, customMessage?: string) => {
    try {
      const res = await fetch(`/api/agency/${agencyId}/nudge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, type: 'completeness', message: customMessage || 'Please update your profile details.' })
      });
      if (res.ok) {
        alert('Nudge saved and logged!');
        // Refresh events
        fetch(`/api/agency/${agencyId}/events`).then(r => r.json()).then(d => setEvents(Array.isArray(d) ? d : (d.events || [])));
      } else {
        alert('Failed to send nudge');
      }
    } catch (e) {
      console.error(e);
      alert('Error sending nudge');
    }
  };

  // Client Sentiment (6 months)
  const sentimentData = [
    { month: 'Feb', rate: 65 },
    { month: 'Mar', rate: 70 },
    { month: 'Apr', rate: 60 },
    { month: 'May', rate: 85 },
    { month: 'Jun', rate: 90 },
    { month: 'Jul', rate: 88 },
  ];

  const uniqueCategories = Array.from(new Set(roster.map(r => r.category)));

  return (
    <div style={{ padding: '24px', color: '#fff', backgroundColor: '#0f172a', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: '24px', marginBottom: '24px', fontWeight: 'bold' }}>AI Smart Nudges & Intelligence</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginBottom: '24px' }}>
        
        {/* Matchmaking Panel */}
        <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #334155' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Matchmaking Panel</h2>
          <textarea 
            placeholder="Paste client inquiry or project description..." 
            value={inquiry}
            onChange={(e) => setInquiry(e.target.value)}
            style={{ width: '100%', height: '80px', marginBottom: '12px', padding: '10px', backgroundColor: '#0f172a', color: '#fff', border: '1px solid #334155', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
          />
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ padding: '8px 12px', backgroundColor: '#0f172a', color: '#fff', border: '1px solid #334155', borderRadius: '6px', flex: 1, minWidth: '120px' }}>
              {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
              {uniqueCategories.length === 0 && <option value="General">General</option>}
            </select>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', minWidth: '140px' }}>
              <span style={{ fontSize: '14px', color: '#10b981', fontWeight: 'bold' }}>${budget}</span>
              <input type="range" min="1000" max="50000" step="1000" value={budget} onChange={(e) => setBudget(Number(e.target.value))} style={{ flex: 1 }} />
            </div>
          </div>
          <button onClick={handleMatchmaking} style={{ width: '100%', padding: '10px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
            Find Best Match
          </button>

          {matches.length > 0 && (
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto' }}>
              {matches.map(m => (
                <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: '#0f172a', borderRadius: '6px', border: '1px solid #334155' }}>
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{m.name}</div>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>{m.category}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ padding: '4px 8px', backgroundColor: '#1e293b', borderRadius: '12px', fontSize: '12px', color: '#60a5fa', fontWeight: 'bold' }}>{m.score} pts</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Completeness Audit */}
        <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #334155' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Completeness Audit</h2>
          <div style={{ fontSize: '14px', marginBottom: '16px', color: '#94a3b8' }}>Agency Minimum Target: <strong style={{ color: '#f59e0b' }}>{minThreshold}%</strong></div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid #334155', color: '#94a3b8', fontSize: '13px' }}>
                  <th style={{ paddingBottom: '8px' }}>Member</th>
                  <th style={{ paddingBottom: '8px' }}>Score</th>
                  <th style={{ paddingBottom: '8px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {roster.map(m => (
                  <tr key={m.id} style={{ borderBottom: '1px solid #334155' }}>
                    <td style={{ padding: '12px 0', fontWeight: '500' }}>{m.name}</td>
                    <td style={{ padding: '12px 0', fontWeight: 'bold', color: m.completeness_score < minThreshold ? '#f59e0b' : '#22c55e' }}>
                      {m.completeness_score}%
                    </td>
                    <td style={{ padding: '12px 0' }}>
                      {m.completeness_score < minThreshold ? (
                        <button onClick={() => handleUpdateNudge(m.id)} style={{ padding: '6px 12px', backgroundColor: '#f59e0b', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>
                          Send Nudge
                        </button>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#22c55e' }}>✓ Compliant</span>
                      )}
                    </td>
                  </tr>
                ))}
                {roster.length === 0 && (
                  <tr><td colSpan={3} style={{ padding: '20px 0', textAlign: 'center', color: '#64748b' }}>No members in roster yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        
        {/* Churn Risk Monitor */}
        <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #334155' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Churn Risk Monitor</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {roster.map(m => {
              const status = getChurnStatus(m.joined_at);
              return (
                <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: '#0f172a', borderRadius: '8px', borderLeft: `4px solid ${status.color}`, border: '1px solid #334155', borderLeftWidth: '4px' }}>
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{m.name}</div>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>{status.days} days active</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ color: status.color, fontSize: '13px', fontWeight: 'bold' }}>{status.label}</span>
                    <button 
                      onClick={() => setNudgeModal({ isOpen: true, member: m, message: `Hi ${m.name}, check out new agency opportunities.` })} 
                      style={{ padding: '6px 12px', backgroundColor: '#334155', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
                    >
                      Nudge
                    </button>
                  </div>
                </div>
              );
            })}
            {roster.length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>No active roster members to track.</div>
            )}
          </div>
        </div>

        {/* Sentiment & Patterns */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #334155' }}>
            <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Client Sentiment Trend</h2>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '150px', paddingBottom: '24px', position: 'relative' }}>
              {sentimentData.map((d, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                  <div style={{ width: '100%', backgroundColor: '#3b82f6', height: `${d.rate}%`, borderRadius: '4px 4px 0 0', transition: 'height 0.3s' }} />
                  <div style={{ position: 'absolute', bottom: 0, fontSize: '12px', color: '#94a3b8' }}>{d.month}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #334155' }}>
            <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Pattern Learning Feed</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '250px', overflowY: 'auto' }}>
              {events.map((e) => (
                <div key={e.id} style={{ padding: '12px', backgroundColor: '#0f172a', borderRadius: '6px', border: '1px solid #334155' }}>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>
                    Event: {e.event_type.replace(/_/g, ' ').toUpperCase()}
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>{new Date(e.created_at).toLocaleString()}</div>
                </div>
              ))}
              {events.length === 0 && (
                <div style={{ textAlign: 'center', padding: '16px', color: '#64748b' }}>No system events logged yet.</div>
              )}
            </div>
          </div>

        </div>

      </div>

      {nudgeModal.isOpen && nudgeModal.member && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: '#1e293b', padding: '24px', borderRadius: '12px', width: '400px', border: '1px solid #334155' }}>
            <h3 style={{ fontSize: '18px', marginBottom: '16px', marginTop: 0 }}>Send Nudge to {nudgeModal.member.name}</h3>
            <textarea 
              value={nudgeModal.message}
              onChange={(e) => setNudgeModal({ ...nudgeModal, message: e.target.value })}
              style={{ width: '100%', height: '100px', marginBottom: '16px', padding: '10px', backgroundColor: '#0f172a', color: '#fff', border: '1px solid #334155', borderRadius: '6px', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setNudgeModal({ isOpen: false, member: null, message: '' })} style={{ padding: '8px 16px', backgroundColor: '#334155', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => { handleUpdateNudge(nudgeModal.member!.id, nudgeModal.message); setNudgeModal({ isOpen: false, member: null, message: '' }); }} style={{ padding: '8px 16px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Send</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
