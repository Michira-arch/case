import { sendEmail } from './lib/email';


async function test() {
  console.log('Sending test email to elingtonmici@gmail.com...');
  try {
    await sendEmail({
      to: 'elingtonmici@gmail.com',
      fromName: 'Case+ Billing',
      subject: 'Invoice #INV-2026-089 for Completed Caregiving Services',
      html: `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #111827; margin: 0; font-size: 24px; letter-spacing: -0.5px;">Case+</h1>
            <p style="color: #6b7280; font-size: 14px; margin-top: 4px;">Secure Payment Portal</p>
          </div>
          
          <h2 style="color: #111827; font-size: 20px; font-weight: 600; margin-bottom: 16px;">Hello Elington,</h2>
          
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
            Your recent booking has been successfully completed. An invoice has been generated for the caregiving services provided.
          </p>
          
          <div style="background-color: #f9fafb; border-radius: 6px; padding: 20px; margin-bottom: 24px;">
            <p style="margin: 0; color: #374151; font-weight: 600; font-size: 16px;">Amount Due: <span style="float: right;">KES 4,500.00</span></p>
          </div>
          
          <div style="text-align: center; margin-bottom: 32px;">
            <a href="https://case.app/invoice/test-123" style="display: inline-block; padding: 14px 28px; background-color: #111827; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; width: 80%; text-align: center;">
              View & Pay Invoice
            </a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin-bottom: 24px;" />
          
          <p style="color: #9ca3af; font-size: 12px; line-height: 1.5; text-align: center;">
            This is an automated message from Case+ Billing.<br>
            If you have any questions regarding this invoice, please reply directly to this email.
          </p>
        </div>
      `
    });
    console.log('Email sent successfully!');
  } catch (error) {
    console.error('Failed to send email:', error);
  }
}

test();
