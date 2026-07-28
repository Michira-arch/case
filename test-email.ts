import { loadEnvConfig } from '@next/env';
import nodemailer from 'nodemailer';
const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function testEmail() {
  console.log('Testing with: ', process.env.SMTP_USER, process.env.SMTP_HOST);
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: 'admin@example.com',
      subject: 'Test Email',
      html: '<h1>Hello World</h1>'
    });
    console.log('Success:', info.messageId);
  } catch (error: any) {
    console.error('Failed to send:', error.message);
  }
}

testEmail();
