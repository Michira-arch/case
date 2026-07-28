import React from 'react';

export default function PrivacyPolicy() {
  return (
    <div style={{ backgroundColor: 'var(--paper)', color: 'var(--ink)', padding: '4rem 2rem', fontFamily: 'system-ui, sans-serif', minHeight: '100vh' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', lineHeight: '1.6' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', fontWeight: 'bold' }}>Privacy Policy</h1>
        <p style={{ marginBottom: '2rem', opacity: 0.7 }}>Last updated: July 2026</p>

        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', fontWeight: '600' }}>1. Introduction</h2>
          <p>Welcome to Case. We respect your privacy and are committed to protecting your personal data. This privacy policy explains how we collect, use, and safeguard your information when you use our software.</p>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', fontWeight: '600' }}>2. Data We Collect</h2>
          <p>We may collect, use, store, and transfer different kinds of personal data about you, including:</p>
          <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <li><strong>Identity Data:</strong> First name, last name, username or similar identifier.</li>
            <li><strong>Contact Data:</strong> Billing address, email address, and telephone numbers.</li>
            <li><strong>Financial Data:</strong> Handled securely by our payment processor, Paystack. We do not store your full credit card details.</li>
            <li><strong>Profile Data:</strong> Agency operations data, candidate details, preferences, and feedback.</li>
          </ul>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', fontWeight: '600' }}>3. Third-Party Authentication & Google API Data</h2>
          <p>You may choose to log in using third-party services, such as Google OAuth. By doing so, you grant us access to certain information (like your email address and basic profile name) as permitted by the third-party service. We use this information solely to facilitate your secure login and manage your account.</p>
          <p style={{ marginTop: '0.75rem', fontWeight: '500' }}>Case's use and transfer to any other app of information received from Google APIs will adhere to the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline', color: 'inherit' }}>Google API Services User Data Policy</a>, including the Limited Use requirements.</p>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', fontWeight: '600' }}>4. How We Use Your Data</h2>
          <p>We use your personal data to provide and improve our services, process your transactions securely via Paystack, manage your agency account, and communicate with you about updates or support. We use standard cookies to keep you logged in and understand how you interact with the platform.</p>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', fontWeight: '600' }}>5. Data Security</h2>
          <p>We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used, or accessed in an unauthorized way, altered, or disclosed. Access to your agency data is strictly limited to authorized personnel.</p>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', fontWeight: '600' }}>6. Contact Us</h2>
          <p>If you have any questions about this Privacy Policy, please contact us at support@caseshow.info.</p>
        </section>
      </div>
    </div>
  );
}
