'use client';

import React, { useState, useEffect } from 'react';

// --- Type Definitions ---
type Member = {
  id: string;
  user_id: string;
  role: 'admin' | 'manager' | 'member';
  joined_at: string;
  profiles?: { full_name: string; handle: string; avatar_url: string };
};

type Rule = {
  id: string;
  rule_type: string;
  configuration: any;
  is_active: boolean;
};

type EventLog = {
  id: string;
  event_type: string;
  metadata: any;
  created_at: string;
  actor?: { full_name: string; handle: string; avatar_url: string };
};

// --- Styles ---
const theme = {
  bg: '#121212',
  surface: '#1E1E1E',
  surfaceHover: '#2A2A2A',
  border: '#333333',
  text: '#FFFFFF',
  textMuted: '#A0A0A0',
  primary: '#FFFFFF',
  danger: '#EF4444',
  dangerBg: '#EF444420',
  success: '#10B981',
  warning: '#F59E0B',
  info: '#3B82F6',
  indigo: '#6366F1'
};

const styles = {
  container: {
    backgroundColor: theme.bg,
    color: theme.text,
    minHeight: '100vh',
    padding: '24px',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  },
  header: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '24px'
  },
  tabList: {
    display: 'flex',
    gap: '16px',
    borderBottom: `1px solid ${theme.border}`,
    marginBottom: '24px',
    overflowX: 'auto' as const
  },
  tabButton: (isActive: boolean) => ({
    padding: '12px 16px',
    background: 'none',
    border: 'none',
    borderBottom: isActive ? `2px solid ${theme.primary}` : '2px solid transparent',
    color: isActive ? theme.primary : theme.textMuted,
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: isActive ? '600' : '400',
    whiteSpace: 'nowrap' as const,
    transition: 'all 0.2s'
  }),
  card: {
    backgroundColor: theme.surface,
    border: `1px solid ${theme.border}`,
    borderRadius: '8px',
    padding: '24px',
    marginBottom: '16px'
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    marginBottom: '8px',
    color: theme.textMuted
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    backgroundColor: theme.bg,
    border: `1px solid ${theme.border}`,
    borderRadius: '6px',
    color: theme.text,
    marginBottom: '16px',
    fontSize: '14px'
  },
  button: (variant: 'primary' | 'danger' | 'outline' = 'primary', disabled = false) => ({
    padding: '10px 16px',
    backgroundColor: disabled ? theme.border : variant === 'primary' ? theme.primary : variant === 'danger' ? theme.danger : 'transparent',
    color: variant === 'primary' && !disabled ? '#000' : variant === 'outline' ? theme.text : '#FFF',
    border: variant === 'outline' ? `1px solid ${theme.border}` : 'none',
    borderRadius: '6px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: '600',
    fontSize: '14px',
    opacity: disabled ? 0.7 : 1,
  }),
  row: {
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
    marginBottom: '16px'
  },
  badge: (type: string) => {
    let bg = theme.border;
    let color = theme.text;
    if (type === 'member_approved' || type === 'success') { bg = '#10B98120'; color = theme.success; }
    if (type === 'member_left' || type === 'warning') { bg = '#F59E0B20'; color = theme.warning; }
    if (type === 'rule_changed' || type === 'info') { bg = '#3B82F620'; color = theme.info; }
    if (type === 'pitch_sent') { bg = '#6366F120'; color = theme.indigo; }
    if (type === 'payout_released') { bg = '#10B98120'; color = theme.success; }
    if (type === 'danger') { bg = '#EF444420'; color = theme.danger; }
    return {
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: '600',
      backgroundColor: bg,
      color: color,
      display: 'inline-block'
    };
  }
};

// --- Main Component ---
export default function SettingsTab({ agencyId, currentUserRole }: { agencyId: string, currentUserRole: 'admin' | 'manager' | 'member' }) {
  const [activeTab, setActiveTab] = useState('BRANDING');

  return (
    <div style={styles.container}>
      <h1 style={styles.header}>Agency Settings</h1>
      
      <div style={styles.tabList}>
        {['BRANDING', 'OPERATIONAL RULES', 'TEAM & ROLES', 'AUDIT LOG', 'DANGER ZONE'].map(tab => (
          <button
            key={tab}
            style={styles.tabButton(activeTab === tab)}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div style={{ marginTop: '24px' }}>
        {activeTab === 'BRANDING' && <BrandingTab agencyId={agencyId} canEdit={currentUserRole === 'admin' || currentUserRole === 'manager'} />}
        {activeTab === 'OPERATIONAL RULES' && <OperationalRulesTab agencyId={agencyId} canEdit={currentUserRole === 'admin' || currentUserRole === 'manager'} />}
        {activeTab === 'TEAM & ROLES' && <TeamRolesTab agencyId={agencyId} isAdmin={currentUserRole === 'admin'} />}
        {activeTab === 'AUDIT LOG' && <AuditLogTab agencyId={agencyId} />}
        {activeTab === 'DANGER ZONE' && <DangerZoneTab agencyId={agencyId} isAdmin={currentUserRole === 'admin'} />}
      </div>
    </div>
  );
}

// --- Sub-Tab: BRANDING ---
function BrandingTab({ agencyId, canEdit }: { agencyId: string, canEdit: boolean }) {
  const [form, setForm] = useState({
    name: '',
    primary_color: '#FFFFFF',
    secondary_color: '#000000',
    logo_url: '',
    banner_url: '',
    location: { city: '', country: '' },
    showcase_type: 'open'
  });
  const [saving, setSaving] = useState(false);

  // In a real app, fetch initial branding data here

  const handleSave = async () => {
    setSaving(true);
    await fetch(`/api/agency/${agencyId}/branding`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    setSaving(false);
    alert('Branding saved!');
  };

  return (
    <div style={styles.card}>
      <h2 style={{ marginBottom: '24px' }}>Brand Appearance</h2>
      
      <label style={styles.label}>Agency Name</label>
      <input style={styles.input} value={form.name} onChange={e => setForm({...form, name: e.target.value})} disabled={!canEdit} />

      <div style={styles.row}>
        <div style={{ flex: 1 }}>
          <label style={styles.label}>Primary Color</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input type="color" value={form.primary_color} onChange={e => setForm({...form, primary_color: e.target.value})} disabled={!canEdit} />
            <input style={styles.input} value={form.primary_color} onChange={e => setForm({...form, primary_color: e.target.value})} disabled={!canEdit} />
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <label style={styles.label}>Secondary Color</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input type="color" value={form.secondary_color} onChange={e => setForm({...form, secondary_color: e.target.value})} disabled={!canEdit} />
            <input style={styles.input} value={form.secondary_color} onChange={e => setForm({...form, secondary_color: e.target.value})} disabled={!canEdit} />
          </div>
        </div>
      </div>

      <label style={styles.label}>Logo URL</label>
      <input style={styles.input} value={form.logo_url} onChange={e => setForm({...form, logo_url: e.target.value})} disabled={!canEdit} />
      {form.logo_url && <img src={form.logo_url} alt="Logo Preview" style={{ width: '64px', height: '64px', borderRadius: '8px', marginBottom: '16px', objectFit: 'cover' }} />}

      <label style={styles.label}>Banner URL</label>
      <input style={styles.input} value={form.banner_url} onChange={e => setForm({...form, banner_url: e.target.value})} disabled={!canEdit} />

      <div style={styles.row}>
        <div style={{ flex: 1 }}>
          <label style={styles.label}>City</label>
          <input style={styles.input} value={form.location.city} onChange={e => setForm({...form, location: {...form.location, city: e.target.value}})} disabled={!canEdit} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={styles.label}>Country</label>
          <input style={styles.input} value={form.location.country} onChange={e => setForm({...form, location: {...form.location, country: e.target.value}})} disabled={!canEdit} />
        </div>
      </div>

      <label style={styles.label}>Public Showcase</label>
      <select style={styles.input} value={form.showcase_type} onChange={e => setForm({...form, showcase_type: e.target.value})} disabled={!canEdit}>
        <option value="open">Open Roster (Show all members and projects)</option>
        <option value="curated">Curated (Hand-pick portfolio items)</option>
      </select>

      {canEdit && (
        <button style={styles.button('primary', saving)} onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Branding'}
        </button>
      )}
    </div>
  );
}

// --- Sub-Tab: OPERATIONAL RULES ---
function OperationalRulesTab({ agencyId, canEdit }: { agencyId: string, canEdit: boolean }) {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/agency/${agencyId}/rules`)
      .then(res => res.json())
      .then(data => {
        setRules(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  }, [agencyId]);

  const updateRule = async (rule_type: string, configuration: any, is_active: boolean) => {
    if (!canEdit) return;
    const res = await fetch(`/api/agency/${agencyId}/rules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rule_type, configuration, is_active })
    });
    if (res.ok) {
      const updatedRule = await res.json();
      setRules(prev => {
        const exists = prev.find(r => r.rule_type === rule_type);
        if (exists) return prev.map(r => r.rule_type === rule_type ? updatedRule : r);
        return [...prev, updatedRule];
      });
    }
  };

  const getRule = (type: string) => rules.find(r => r.rule_type === type);

  if (loading) return <div>Loading rules...</div>;

  const defaultSplit = getRule('DEFAULT_SPLIT')?.configuration?.agency_percentage || 20;
  const minScore = getRule('MIN_COMPLETENESS_SCORE')?.configuration?.score || 80;
  const autoApprove = getRule('AUTO_APPROVE_THRESHOLD')?.configuration?.threshold || 90;
  const invoiceAutoSend = getRule('INVOICE_AUTO_SEND')?.is_active ?? false;
  const requireProof = getRule('REQUIRE_VOUCHED_PROOF')?.is_active ?? true;

  return (
    <div>
      <div style={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: 0 }}>Default Split (%)</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: theme.textMuted }}>Agency {defaultSplit}% / Talent {100 - defaultSplit}%</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <input 
              type="range" min="0" max="50" value={defaultSplit} 
              onChange={e => updateRule('DEFAULT_SPLIT', { agency_percentage: parseInt(e.target.value) }, true)}
              disabled={!canEdit}
            />
            <span style={styles.badge(getRule('DEFAULT_SPLIT')?.is_active ? 'success' : 'warning')}>
              {getRule('DEFAULT_SPLIT')?.is_active !== false ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
      </div>

      <div style={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: 0 }}>Min Completeness Score</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: theme.textMuted }}>Profile completeness required to be listed.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <input 
              type="range" min="40" max="95" value={minScore} 
              onChange={e => updateRule('MIN_COMPLETENESS_SCORE', { score: parseInt(e.target.value) }, true)}
              disabled={!canEdit}
            />
            <span>{minScore}</span>
          </div>
        </div>
      </div>
      
      <div style={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0 }}>Auto-Approve Vouch Threshold</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: theme.textMuted }}>Trust score required to bypass review.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <input 
              type="number" style={{ ...styles.input, width: '80px', marginBottom: 0 }} value={autoApprove}
              onChange={e => updateRule('AUTO_APPROVE_THRESHOLD', { threshold: parseInt(e.target.value) }, true)}
              disabled={!canEdit}
            />
          </div>
        </div>
      </div>

      <div style={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0 }}>Auto-Send Invoices</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: theme.textMuted }}>Send invoice automatically upon milestone completion.</p>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input 
              type="checkbox" checked={invoiceAutoSend}
              onChange={e => updateRule('INVOICE_AUTO_SEND', {}, e.target.checked)}
              disabled={!canEdit}
              style={{ width: '20px', height: '20px' }}
            />
          </label>
        </div>
      </div>

      <div style={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0 }}>Require Vouched Proof</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: theme.textMuted }}>Talent must have vouched proof to join pitches.</p>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input 
              type="checkbox" checked={requireProof}
              onChange={e => updateRule('REQUIRE_VOUCHED_PROOF', {}, e.target.checked)}
              disabled={!canEdit}
              style={{ width: '20px', height: '20px' }}
            />
          </label>
        </div>
      </div>

      {canEdit && (
        <button style={styles.button('outline')} onClick={() => alert('JSON editor modal would open here')}>
          + Add Custom Rule
        </button>
      )}
    </div>
  );
}

// --- Sub-Tab: TEAM & ROLES ---
function TeamRolesTab({ agencyId, isAdmin }: { agencyId: string, isAdmin: boolean }) {
  const [members, setMembers] = useState<Member[]>([]);

  const fetchMembers = () => {
    fetch(`/api/agency/${agencyId}/members`)
      .then(res => res.json())
      .then(data => {
        if (data.members) setMembers(data.members);
      });
  };

  useEffect(() => {
    fetchMembers();
  }, [agencyId]);

  const changeRole = async (memberId: string, newRole: string) => {
    if (!isAdmin) return;
    const res = await fetch(`/api/agency/${agencyId}/members/${memberId}/role`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole })
    });
    if (res.ok) {
      fetchMembers();
    } else {
      const err = await res.json();
      alert(`Error: ${err.error}`);
    }
  };

  const removeMember = async (memberId: string) => {
    if (!isAdmin) return;
    if (confirm('Are you sure you want to offboard this member?')) {
      const res = await fetch(`/api/agency/${agencyId}/members/${memberId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchMembers();
      } else {
        const err = await res.json();
        alert(`Error: ${err.error || 'Failed to remove member'}`);
      }
    }
  };

  return (
    <div>
      <div style={styles.card}>
        <h3 style={{ marginBottom: '16px' }}>Agency Roster</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${theme.border}` }}>
              <th style={{ padding: '12px 0', color: theme.textMuted }}>Member</th>
              <th style={{ padding: '12px 0', color: theme.textMuted }}>Role</th>
              <th style={{ padding: '12px 0', color: theme.textMuted }}>Joined</th>
              <th style={{ padding: '12px 0', color: theme.textMuted }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m: any) => {
              const profile = m.profile || m.profiles || {};
              const displayName = profile.display_name || profile.full_name || 'Member';
              const handle = profile.handle ? `@${profile.handle}` : '';
              return (
                <tr key={m.id || m.user_id} style={{ borderBottom: `1px solid ${theme.border}` }}>
                  <td style={{ padding: '12px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: theme.indigo, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px' }}>
                        {displayName.charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontWeight: '500' }}>{displayName}</div>
                        <div style={{ fontSize: '12px', color: theme.textMuted }}>{handle}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 0' }}>
                    {isAdmin ? (
                      <select 
                        value={m.role} 
                        onChange={(e) => changeRole(m.user_id || m.id, e.target.value)}
                        style={{ ...styles.input, width: 'auto', marginBottom: 0, padding: '4px 8px' }}
                      >
                        <option value="admin">Admin</option>
                        <option value="manager">Manager</option>
                        <option value="talent">Talent</option>
                        <option value="member">Member</option>
                      </select>
                    ) : (
                      <span style={styles.badge('info')}>{m.role?.toUpperCase()}</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 0', color: theme.textMuted, fontSize: '14px' }}>
                    {m.joined_at ? new Date(m.joined_at).toLocaleDateString() : 'Active'}
                  </td>
                  <td style={{ padding: '12px 0' }}>
                    {isAdmin && (
                      <button style={styles.button('danger')} onClick={() => removeMember(m.user_id || m.id)}>Remove</button>
                    )}
                  </td>
                </tr>
              );
            })}
            {members.length === 0 && (
              <tr><td colSpan={4} style={{ padding: '24px 0', textAlign: 'center', color: theme.textMuted }}>No active members in roster.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={styles.card}>
        <h3 style={{ marginBottom: '16px' }}>Permissions Matrix</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${theme.border}`, color: theme.textMuted, textAlign: 'left' }}>
                <th style={{ padding: '8px' }}>Action</th>
                <th style={{ padding: '8px' }}>Admin</th>
                <th style={{ padding: '8px' }}>Manager</th>
                <th style={{ padding: '8px' }}>Member</th>
              </tr>
            </thead>
            <tbody>
              {['Manage Roster', 'Edit Branding', 'Manage Rules', 'Manage Financials', 'Dissolve Agency'].map((action, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${theme.border}` }}>
                  <td style={{ padding: '8px' }}>{action}</td>
                  <td style={{ padding: '8px', color: theme.success }}>✓</td>
                  <td style={{ padding: '8px', color: action.includes('Financials') || action.includes('Dissolve') ? theme.danger : theme.success }}>
                    {action.includes('Financials') || action.includes('Dissolve') ? '✗' : '✓'}
                  </td>
                  <td style={{ padding: '8px', color: theme.danger }}>✗</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// --- Sub-Tab: AUDIT LOG ---
function AuditLogTab({ agencyId }: { agencyId: string }) {
  const [logs, setLogs] = useState<EventLog[]>([]);

  useEffect(() => {
    fetch(`/api/agency/${agencyId}/events`)
      .then(res => res.json())
      .then(data => {
        const eventsList = Array.isArray(data) ? data : (data.events || []);
        setLogs(eventsList);
      });
  }, [agencyId]);

  return (
    <div style={styles.card}>
      <h3 style={{ marginBottom: '24px' }}>Event Timeline</h3>
      {logs.length === 0 ? (
        <p style={{ color: theme.textMuted }}>No events recorded yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {logs.map(log => (
            <div key={log.id} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', paddingBottom: '16px', borderBottom: `1px solid ${theme.border}` }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: theme.indigo, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0 }}>
                ⚡
              </div>
              <div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: '500' }}>{log.actor?.full_name || 'System / User'}</span>
                  <span style={styles.badge(log.event_type)}>{log.event_type.replace(/_/g, ' ').toUpperCase()}</span>
                  <span style={{ fontSize: '12px', color: theme.textMuted }}>{new Date(log.created_at).toLocaleString()}</span>
                </div>
                <div style={{ fontSize: '14px', color: theme.textMuted, fontFamily: 'monospace' }}>
                  {JSON.stringify(log.metadata)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Sub-Tab: DANGER ZONE ---
function DangerZoneTab({ agencyId, isAdmin }: { agencyId: string, isAdmin: boolean }) {
  const [confirmHandle, setConfirmHandle] = useState('');
  const [checklist, setChecklist] = useState({ activePitches: 0, pendingPayouts: 0, members: 0 });

  useEffect(() => {
    Promise.all([
      fetch(`/api/agency/${agencyId}/pitches`).then(res => res.json()).catch(() => ({})),
      fetch(`/api/agency/${agencyId}/payouts`).then(res => res.json()).catch(() => ({})),
      fetch(`/api/agency/${agencyId}/members`).then(res => res.json()).catch(() => ({}))
    ]).then(([pitchData, payoutData, memberData]) => {
      const activePitches = (pitchData.pitches || []).filter((p: any) => p.status === 'sent' || p.status === 'viewed').length;
      const pendingPayouts = (payoutData.payouts || []).filter((p: any) => p.available_balance > 0).length;
      const memberCount = (memberData.members || []).length;
      setChecklist({ activePitches, pendingPayouts, members: memberCount });
    });
  }, [agencyId]);

  const canDissolve = checklist.activePitches === 0 && checklist.pendingPayouts === 0 && confirmHandle.trim().length > 0;

  const handleDissolve = async () => {
    if (!isAdmin) return;
    const res = await fetch(`/api/agency/${agencyId}/dissolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmation_string: confirmHandle })
    });
    if (res.ok) {
      alert('Agency dissolved.');
      window.location.href = '/dashboard/agency';
    } else {
      const err = await res.json();
      alert(`Error: ${err.error || 'Failed to dissolve agency'}`);
    }
  };

  if (!isAdmin) {
    return <div style={{...styles.card, borderColor: theme.danger}}>Only admins can view this section.</div>;
  }

  return (
    <div style={{...styles.card, borderColor: theme.danger, backgroundColor: theme.dangerBg}}>
      <h2 style={{ color: theme.danger, marginTop: 0 }}>Dissolve Agency</h2>
      <p style={{ color: '#FCA5A5', marginBottom: '24px' }}>
        This action is irreversible. It will archive all financial records, cancel active subscriptions, and remove the agency's public brand page. Talent data remains safe.
      </p>

      <div style={{ backgroundColor: theme.bg, padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
        <h4 style={{ margin: '0 0 12px 0' }}>Dissolution Checklist</h4>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: checklist.activePitches === 0 ? theme.success : theme.danger }}>
              {checklist.activePitches === 0 ? '✓' : '✗'}
            </span>
            <span>{checklist.activePitches} Active Pitches</span>
          </li>
          <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: checklist.pendingPayouts === 0 ? theme.success : theme.danger }}>
              {checklist.pendingPayouts === 0 ? '✓' : '✗'}
            </span>
            <span>{checklist.pendingPayouts} Pending Payouts</span>
          </li>
          <li style={{ display: 'flex', alignItems: 'center', gap: '8px', color: theme.textMuted }}>
            <span>•</span>
            <span>{checklist.members} Active Members will be notified</span>
          </li>
        </ul>
      </div>

      <label style={styles.label}>Type confirmation string to proceed</label>
      <input 
        style={{...styles.input, borderColor: theme.danger}} 
        value={confirmHandle} 
        onChange={e => setConfirmHandle(e.target.value)} 
        placeholder="type anything to confirm"
      />

      <button 
        style={styles.button('danger', !canDissolve)} 
        disabled={!canDissolve}
        onClick={handleDissolve}
      >
        Dissolve Agency
      </button>
    </div>
  );
}

