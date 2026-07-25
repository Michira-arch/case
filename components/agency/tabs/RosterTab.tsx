'use client'
import React, { useState, useEffect } from 'react'

export default function RosterTab({ agencyId }: { agencyId: string }) {
  const [members, setMembers] = useState<any[]>([])
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteLink, setInviteLink] = useState('')
  const [editingMember, setEditingMember] = useState<any>(null)
  const [overlayForm, setOverlayForm] = useState({ custom_title: '', custom_rate: '', visibility_state: 'public' })

  const fetchRoster = async () => {
    try {
      const res = await fetch(`/api/agency/${agencyId}/members`)
      const data = await res.json()
      if (data.members) setMembers(data.members)
      if (data.requests) setRequests(data.requests)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRoster()
  }, [agencyId])

  const generateInvite = async () => {
    try {
      const res = await fetch(`/api/agency/${agencyId}/invite`, { method: 'POST' })
      const data = await res.json()
      if (data.link) {
        setInviteLink(`https://wa.me/?text=Join%20our%20agency:%20${encodeURIComponent(data.link)}`)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const approveRequest = async (id: string) => {
    try {
      await fetch(`/api/agency/${agencyId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: id })
      })
      fetchRoster()
    } catch (e) {
      console.error(e)
    }
  }

  const declineRequest = async (id: string) => {
    // Note: Would need a DELETE or PATCH on join_requests endpoint, but for now just mock local removal
    setRequests(requests.filter(r => r.id !== id))
  }

  const saveOverlay = async () => {
    if (!editingMember) return
    try {
      await fetch(`/api/agency/${agencyId}/members/${editingMember.user_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(overlayForm)
      })
      setEditingMember(null)
      fetchRoster()
    } catch (e) {
      console.error(e)
    }
  }

  const offboardMember = async (userId: string) => {
    try {
      await fetch(`/api/agency/${agencyId}/members/${userId}`, { method: 'DELETE' })
      fetchRoster()
    } catch (e) {
      console.error(e)
    }
  }

  const lowCompletenessCount = requests.filter(r => (r.profile?.completeness_score || 0) < 70).length

  return (
    <div style={{ display: 'flex', gap: '2rem', color: '#f9fafb', backgroundColor: '#0f1117', padding: '2rem', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      {/* Sidebar */}
      <div style={{ width: '250px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ padding: '1rem', backgroundColor: '#1a1d24', borderRadius: '8px' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>Stats</h3>
          <p style={{ margin: '0 0 0.25rem 0' }}>Total Active: {members.length}</p>
          <p style={{ margin: '0 0 0.25rem 0' }}>Pending Requests: {requests.length}</p>
          <p style={{ margin: 0, color: '#f59e0b' }}>Low Completeness: {lowCompletenessCount}</p>
        </div>
        
        <div style={{ padding: '1rem', backgroundColor: '#1a1d24', borderRadius: '8px' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>Invite Link Generator</h3>
          <button onClick={generateInvite} style={{ padding: '0.5rem', width: '100%', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Generate WhatsApp Invite Link
          </button>
          {inviteLink && (
            <div style={{ marginTop: '1rem', wordBreak: 'break-all', fontSize: '0.9rem', backgroundColor: '#2d3340', padding: '0.5rem', borderRadius: '4px' }}>
              <a href={inviteLink} target="_blank" rel="noreferrer" style={{ color: '#60a5fa' }}>{inviteLink}</a>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* Pending Requests Queue */}
        <div>
          <h2 style={{ borderBottom: '1px solid #2d3340', paddingBottom: '0.5rem' }}>Pending Requests</h2>
          {loading ? <p>Loading...</p> : requests.length === 0 ? <p>No pending requests.</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              {requests.map(req => {
                const score = req.profile?.completeness_score || 0
                const badgeColor = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444'
                
                return (
                  <div key={req.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1a1d24', padding: '1rem', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <img src={req.profile?.avatar_url || 'https://via.placeholder.com/40'} alt="avatar" style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
                      <div>
                        <strong>{req.profile?.display_name}</strong> <span style={{ color: '#9ca3af' }}>@{req.profile?.handle}</span>
                        <div style={{ fontSize: '0.85rem', color: '#9ca3af' }}>{req.profile?.category}</div>
                        {req.message && <div style={{ fontSize: '0.85rem', marginTop: '0.25rem', fontStyle: 'italic' }}>"{req.message}"</div>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span style={{ backgroundColor: badgeColor, padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                        Score: {score}%
                      </span>
                      <button onClick={() => approveRequest(req.id)} style={{ padding: '0.5rem 1rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Approve</button>
                      <button style={{ padding: '0.5rem 1rem', backgroundColor: '#4b5563', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Request Info</button>
                      <button onClick={() => declineRequest(req.id)} style={{ padding: '0.5rem 1rem', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Decline</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Active Roster Grid */}
        <div>
          <h2 style={{ borderBottom: '1px solid #2d3340', paddingBottom: '0.5rem' }}>Active Roster</h2>
          {loading ? <p>Loading...</p> : members.length === 0 ? <p>No members yet.</p> : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
              {members.map(member => (
                <div key={member.id} style={{ backgroundColor: '#1a1d24', padding: '1rem', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <img src={member.profile?.avatar_url || 'https://via.placeholder.com/40'} alt="avatar" style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
                    <div>
                      <strong>{member.profile?.display_name}</strong>
                      <div style={{ color: '#9ca3af', fontSize: '0.9rem' }}>@{member.profile?.handle}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ backgroundColor: '#374151', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>Role: {member.role}</span>
                    <span style={{ backgroundColor: member.overlay?.visibility_state === 'public' ? '#10b981' : '#f59e0b', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
                      {member.overlay?.visibility_state || 'public'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#d1d5db' }}>
                    <strong>Title:</strong> {member.overlay?.custom_title || member.profile?.role_line || 'N/A'}<br/>
                    <strong>Rate:</strong> {member.overlay?.custom_rate || 'N/A'}<br/>
                    <strong>Paystack:</strong> {member.paystack_subaccount_code ? 'Linked' : 'Pending'}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                    <button onClick={() => {
                      setEditingMember(member)
                      setOverlayForm({
                        custom_title: member.overlay?.custom_title || '',
                        custom_rate: member.overlay?.custom_rate || '',
                        visibility_state: member.overlay?.visibility_state || 'public'
                      })
                    }} style={{ flex: 1, padding: '0.5rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Edit Overlay</button>
                    <button onClick={() => offboardMember(member.user_id)} style={{ flex: 1, padding: '0.5rem', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Offboard</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Profile Normalizer / Overlay Editor Modal */}
      {editingMember && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: '#1a1d24', padding: '2rem', borderRadius: '8px', width: '800px', maxWidth: '90vw', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #2d3340', paddingBottom: '1rem' }}>
              <h2 style={{ margin: 0 }}>Profile Normalizer</h2>
              <button onClick={() => setEditingMember(null)} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '1.5rem' }}>&times;</button>
            </div>
            
            <div style={{ display: 'flex', gap: '2rem' }}>
              {/* Left Panel: Real Profile (Read-only) */}
              <div style={{ flex: 1, paddingRight: '2rem', borderRight: '1px solid #2d3340' }}>
                <h3 style={{ color: '#9ca3af', marginBottom: '1rem' }}>Core Profile (Read-only)</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#9ca3af', marginBottom: '0.25rem' }}>Display Name</label>
                    <input type="text" value={editingMember.profile?.display_name || ''} readOnly style={{ width: '100%', padding: '0.5rem', backgroundColor: '#0f1117', border: '1px solid #374151', color: '#9ca3af', borderRadius: '4px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#9ca3af', marginBottom: '0.25rem' }}>Role Line</label>
                    <input type="text" value={editingMember.profile?.role_line || ''} readOnly style={{ width: '100%', padding: '0.5rem', backgroundColor: '#0f1117', border: '1px solid #374151', color: '#9ca3af', borderRadius: '4px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#9ca3af', marginBottom: '0.25rem' }}>Category</label>
                    <input type="text" value={editingMember.profile?.category || ''} readOnly style={{ width: '100%', padding: '0.5rem', backgroundColor: '#0f1117', border: '1px solid #374151', color: '#9ca3af', borderRadius: '4px' }} />
                  </div>
                </div>
              </div>
              
              {/* Right Panel: Overlay Form */}
              <div style={{ flex: 1 }}>
                <h3 style={{ color: '#60a5fa', marginBottom: '1rem' }}>Agency Overlay (Editable)</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#d1d5db', marginBottom: '0.25rem' }}>Custom Title</label>
                    <input type="text" value={overlayForm.custom_title} onChange={e => setOverlayForm({...overlayForm, custom_title: e.target.value})} placeholder={editingMember.profile?.role_line || "e.g. Senior Developer"} style={{ width: '100%', padding: '0.5rem', backgroundColor: '#0f1117', border: '1px solid #4b5563', color: '#f9fafb', borderRadius: '4px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#d1d5db', marginBottom: '0.25rem' }}>Custom Rate</label>
                    <input type="text" value={overlayForm.custom_rate} onChange={e => setOverlayForm({...overlayForm, custom_rate: e.target.value})} placeholder="e.g. $50/hr" style={{ width: '100%', padding: '0.5rem', backgroundColor: '#0f1117', border: '1px solid #4b5563', color: '#f9fafb', borderRadius: '4px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#d1d5db', marginBottom: '0.25rem' }}>Visibility State</label>
                    <select value={overlayForm.visibility_state} onChange={e => setOverlayForm({...overlayForm, visibility_state: e.target.value})} style={{ width: '100%', padding: '0.5rem', backgroundColor: '#0f1117', border: '1px solid #4b5563', color: '#f9fafb', borderRadius: '4px' }}>
                      <option value="public">Public</option>
                      <option value="private">Private</option>
                      <option value="hidden">Hidden</option>
                    </select>
                  </div>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                  <button onClick={() => setEditingMember(null)} style={{ padding: '0.5rem 1rem', backgroundColor: 'transparent', color: '#f9fafb', border: '1px solid #4b5563', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                  <button onClick={saveOverlay} style={{ padding: '0.5rem 1rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Save Overlay</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
