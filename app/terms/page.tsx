import React from 'react';

export default function TermsOfService() {
  return (
    <div style={{ backgroundColor: 'var(--paper)', color: 'var(--ink)', padding: '4rem 2rem', fontFamily: 'system-ui, sans-serif', minHeight: '100vh' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', lineHeight: '1.6' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', fontWeight: 'bold' }}>Terms of Service</h1>
        <p style={{ marginBottom: '2rem', opacity: 0.7 }}>Last updated: July 2026</p>

        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', fontWeight: '600' }}>1. Acceptance of Terms</h2>
          <p>By accessing or using Case+, you agree to be bound by these Terms of Service. If you disagree with any part of the terms, then you may not access our service.</p>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', fontWeight: '600' }}>2. Description of Service</h2>
          <p>Case+ provides a comprehensive business management software tailored for nanny agencies. We reserve the right to modify or discontinue, temporarily or permanently, the service with or without notice.</p>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', fontWeight: '600' }}>3. Accounts and Authentication</h2>
          <p>When you create an account, whether directly or via third-party services like Google OAuth, you must provide information that is accurate and complete. You are responsible for safeguarding the password and for all activities under your account.</p>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', fontWeight: '600' }}>4. Payments and Billing</h2>
          <p>All payments are processed securely through our payment provider, Paystack. By subscribing to our paid plans, you agree to our pricing and billing terms. Subscription fees are non-refundable except as required by law or explicitly stated otherwise.</p>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', fontWeight: '600' }}>5. Agency Data and Content</h2>
          <p>You retain all rights to the candidate and agency data you input into Case+. You grant us a license to host and process this data solely for the purpose of providing the service to you.</p>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', fontWeight: '600' }}>6. Limitation of Liability</h2>
          <p>In no event shall Case+, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the service.</p>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', fontWeight: '600' }}>7. Governing Law</h2>
          <p>These Terms shall be governed and construed in accordance with the applicable laws, without regard to its conflict of law provisions.</p>
        </section>
      </div>
    </div>
  );
}
