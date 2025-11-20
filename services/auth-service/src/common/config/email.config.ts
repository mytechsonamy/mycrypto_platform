import { registerAs } from '@nestjs/config';

export const emailConfig = registerAs('email', () => ({
  host: process.env.MAIL_HOST || 'mailhog',
  port: parseInt(process.env.MAIL_PORT || '1025', 10),
  user: process.env.MAIL_USER || '',
  password: process.env.MAIL_PASSWORD || '',
  from: process.env.MAIL_FROM || 'noreply@exchange.local',
  templatesPath: process.env.MAIL_TEMPLATES_PATH || './templates/emails',
  secure: process.env.MAIL_SMTP_SECURE === 'true',
  ignoreTLS: process.env.MAIL_SMTP_IGNORE_TLS === 'true',
  verificationEnabled: process.env.EMAIL_VERIFICATION_ENABLED === 'true',
  verificationTokenExpiry: process.env.EMAIL_VERIFICATION_TOKEN_EXPIRY || '24h',
  verificationMaxRetries: parseInt(
    process.env.EMAIL_VERIFICATION_MAX_RETRIES || '3',
    10,
  ),
  notificationsQueue:
    process.env.EMAIL_NOTIFICATIONS_QUEUE || 'email.notifications',
  mockEmailService: process.env.MOCK_EMAIL_SERVICE === 'true',
  devEmailCapture: process.env.DEV_EMAIL_CAPTURE === 'true',
}));
