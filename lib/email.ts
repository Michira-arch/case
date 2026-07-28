import nodemailer from 'nodemailer';
import { getNannyOrgBySlug } from './nanny-data';
import { createServiceClient } from './supabase/server';

export const sendEmail = async ({
  to,
  subject,
  html,
  fromName,
}: {
  to: string;
  subject: string;
  html: string;
  fromName?: string;
}) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER;
  const from = fromName ? `"${fromName}" <${fromEmail}>` : fromEmail;

  const mailOptions = {
    from,
    to,
    subject,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent: %s', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error };
  }
};

export const sendAgencyEmail = async ({
  orgSlug,
  orgId,
  to,
  subject,
  htmlBody,
  preheader,
}: {
  orgSlug?: string;
  orgId?: string;
  to: string;
  subject: string;
  htmlBody: string;
  preheader?: string;
}) => {
  const supabase = createServiceClient();
  let orgName = 'Caregiving Agency';
  let accentColor = '#000000';
  let logoUrl = '';

  if (orgSlug || orgId) {
    let query = supabase.from('nanny_orgs').select('name, logo_url, page_config');
    if (orgId) query = query.eq('id', orgId);
    else if (orgSlug) query = query.eq('slug', orgSlug);
    
    const { data } = await query.single();
    if (data) {
      orgName = data.name;
      if (data.logo_url) logoUrl = data.logo_url;
      if (data.page_config && typeof data.page_config === 'object' && 'accent_color' in data.page_config) {
        accentColor = (data.page_config as any).accent_color || accentColor;
      }
    }
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f9f9f9; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; border-radius: 8px; margin-top: 40px; margin-bottom: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
          .header { text-align: center; padding-bottom: 20px; border-bottom: 2px solid ${accentColor}; margin-bottom: 20px; }
          .logo { max-height: 60px; max-width: 200px; }
          .title { font-size: 24px; font-weight: 600; margin: 0; color: #111; }
          .content { font-size: 15px; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #888; text-align: center; }
          .preheader { display: none; max-height: 0px; overflow: hidden; }
          .btn { display: inline-block; padding: 12px 24px; background-color: ${accentColor}; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 500; margin-top: 20px; }
        </style>
      </head>
      <body>
        ${preheader ? `<div class="preheader">${preheader}</div>` : ''}
        <div class="container">
          <div class="header">
            ${logoUrl ? `<img src="${logoUrl}" alt="${orgName}" class="logo" />` : `<h1 class="title">${orgName}</h1>`}
          </div>
          <div class="content">
            ${htmlBody}
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} ${orgName}. All rights reserved.<br>
            Powered by Case
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to,
    subject: `[${orgName}] ${subject}`,
    html,
    fromName: orgName,
  });
};
