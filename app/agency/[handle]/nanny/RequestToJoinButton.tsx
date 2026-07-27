'use client';

import { useState } from 'react';

export default function RequestToJoinButton({ orgId }: { orgId: string }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  const handleRequest = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/agency/join-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ org_id: orgId })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send request');
      }

      setMessage({ text: 'Request sent successfully! The agency admin will review it.', type: 'success' });
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: 20 }}>
      {message && (
        <div style={{ 
          marginBottom: 12, 
          padding: 10, 
          borderRadius: 6, 
          fontSize: 14,
          background: message.type === 'success' ? 'var(--verified-bg)' : 'var(--aim-bg)',
          color: message.type === 'success' ? 'var(--verified)' : 'var(--aim)'
        }}>
          {message.text}
        </div>
      )}
      
      {!message || message.type !== 'success' ? (
        <button
          onClick={handleRequest}
          disabled={loading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            background: 'var(--paper)',
            border: '1px solid var(--line)',
            color: 'var(--ink)',
            padding: '10px 24px',
            borderRadius: 'var(--radius-md)',
            fontWeight: 600,
            fontSize: 14,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            transition: 'all 150ms ease',
          }}
        >
          {loading ? 'Sending...' : 'Request to Join as a Worker'}
        </button>
      ) : null}
    </div>
  );
}
