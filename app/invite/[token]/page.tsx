import React from 'react';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function InvitePage({ params }: { params: { token: string } }) {
  // Mock DB Check
  // const supabase = createClient();
  // const { data: request } = await supabase.from('agency_join_requests').select('*, agencies(*)').eq('token', params.token).single();
  
  // Simulated request data
  const request = {
    id: 'req_1',
    token: params.token,
    status: 'pending', // could be 'pending', 'accepted', 'expired'
    created_at: new Date().toISOString(), // Mocking within 72hrs
    agency: {
      name: 'Neon Creatives',
      tagline: 'Future-focused digital experiences',
      primary_color: '#ff0055'
    }
  };

  // Logic: Check if valid, not expired (within 72hrs), and status == pending
  const createdTime = new Date(request.created_at).getTime();
  const nowTime = new Date().getTime();
  const hoursSinceCreation = (nowTime - createdTime) / (1000 * 60 * 60);
  
  const isValid = request.status === 'pending' && hoursSinceCreation < 72;

  if (!isValid) {
    return (
      <div style={{ backgroundColor: '#0a0a0a', color: '#fff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
        <div style={{ textAlign: 'center', backgroundColor: '#1e1e1e', padding: '40px', borderRadius: '12px', border: '1px solid #333', maxWidth: '400px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <h1 style={{ fontSize: '24px', margin: '0 0 16px 0' }}>Invalid or Expired Invite</h1>
          <p style={{ color: '#aaa', margin: '0 0 24px 0' }}>This agency invite token has expired or has already been used.</p>
          <Link href="/" style={{ padding: '12px 24px', backgroundColor: '#333', color: '#fff', textDecoration: 'none', borderRadius: '4px', display: 'inline-block' }}>
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  // Client form action component (mocked)
  return (
    <div style={{ backgroundColor: '#0a0a0a', color: '#fff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      <div style={{ textAlign: 'center', backgroundColor: '#1e1e1e', padding: '40px', borderRadius: '12px', border: '1px solid #333', maxWidth: '400px', width: '100%' }}>
        <div style={{ 
          width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#222', border: `2px solid ${request.agency.primary_color}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold', margin: '0 auto 24px auto'
        }}>
          {request.agency.name.charAt(0)}
        </div>
        <h1 style={{ fontSize: '24px', margin: '0 0 8px 0' }}>You've been invited!</h1>
        <p style={{ color: '#ccc', margin: '0 0 8px 0' }}>Join <strong>{request.agency.name}</strong></p>
        <p style={{ color: '#888', fontSize: '14px', margin: '0 0 32px 0' }}>{request.agency.tagline}</p>
        
        <form action="/api/agency/join-request" method="POST">
          <input type="hidden" name="token" value={request.token} />
          <button 
            type="submit" 
            style={{ 
              width: '100%', padding: '16px', backgroundColor: request.agency.primary_color, color: '#fff', 
              border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' 
            }}
          >
            Join This Agency
          </button>
        </form>
        
        <p style={{ fontSize: '12px', color: '#666', marginTop: '16px' }}>This invite will expire in 72 hours.</p>
      </div>
    </div>
  );
}
