# Email Service Infrastructure Setup

## Overview

The MyCrypto Exchange platform uses a robust email service infrastructure for sending critical communications such as email verification, password reset requests, and notifications. This document provides a complete guide to the email service setup, configuration, and testing.

### Architecture

```
┌─────────────────────────────────────────────────┐
│           Email Service Architecture            │
├─────────────────────────────────────────────────┤
│                                                  │
│  Auth Service (NestJS)                          │
│  ├─ Email Service Module                        │
│  ├─ Email Templates (HTML + Text)               │
│  └─ Environment Configuration                   │
│                   │                              │
│                   ▼                              │
│  SMTP Transporter                               │
│  ├─ Development: MailHog (localhost:1025)       │
│  ├─ Production: AWS SES                         │
│  └─ SMTP Relay Support                          │
│                   │                              │
│                   ▼                              │
│  Email Client                                   │
│  ├─ SMTP Server                                 │
│  └─ Web UI (MailHog: http://localhost:8025)     │
│                                                  │
└─────────────────────────────────────────────────┘
```

## Components

### 1. MailHog Service (Development)

MailHog is a local email server for development and testing purposes. It captures all outgoing emails without actually sending them, allowing developers to test email functionality in isolation.

**Key Features:**
- SMTP server at `mailhog:1025` (within Docker network)
- Web UI at `http://localhost:8025`
- No authentication required
- In-memory storage (emails not persisted across restarts)
- HTTP API for programmatic email inspection

**Configuration in docker-compose.yml:**
```yaml
mailhog:
  image: mailhog/mailhog:latest
  container_name: exchange_mailhog
  ports:
    - "1025:1025"   # SMTP server port
    - "8025:8025"   # Web UI port
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:8025"]
    interval: 10s
    timeout: 5s
    retries: 5
```

### 2. Email Templates

Professional HTML and plain text email templates for both English and Turkish (Turkish language support for our global market).

**Available Templates:**

#### verify-email (Email Verification)
- **Location:** `/services/auth-service/templates/emails/verify-email.{html,txt}`
- **Purpose:** Sent when user registers to verify their email address
- **Variables:**
  - `{{userName}}` - User's display name
  - `{{verificationCode}}` - 6-8 digit verification code
  - `{{verificationLink}}` - Clickable verification link
  - `{{currentYear}}` - Current year for copyright

**Template Features:**
- Bilingual: English and Turkish versions in single email
- Professional gradient header with MyCrypto branding
- Clear call-to-action button
- Verification code displayed prominently
- Security warnings and expiration notice
- Responsive design (mobile-friendly)
- HTML and plain text versions for maximum compatibility

#### reset-password (Password Reset)
- **Location:** `/services/auth-service/templates/emails/reset-password.{html,txt}`
- **Purpose:** Sent when user requests password reset
- **Variables:**
  - `{{userName}}` - User's display name
  - `{{resetLink}}` - Secure password reset link
  - `{{currentYear}}` - Current year for copyright

**Template Features:**
- Bilingual: English and Turkish versions
- Clear step-by-step instructions
- Link expiration notice (1 hour)
- Security warnings and best practices
- Fallback link for email clients that don't support HTML

### 3. Email Service Module

The EmailService is a NestJS service responsible for:
- Loading and compiling email templates
- Interpolating template variables
- Sending emails via SMTP
- Providing convenience methods for common email types
- Logging and error handling

**Location:** `/services/auth-service/src/common/services/email.service.ts`

**Key Methods:**
```typescript
// Send custom email with template
sendEmail(options: EmailOptions): Promise<EmailResult>

// Send verification email
sendVerificationEmail(
  email: string,
  userName: string,
  verificationCode: string,
  verificationLink: string
): Promise<EmailResult>

// Send password reset email
sendPasswordResetEmail(
  email: string,
  userName: string,
  resetLink: string
): Promise<EmailResult>

// Health check
healthCheck(): Promise<{ healthy: boolean; message: string }>
```

### 4. Configuration

**Environment Variables:**

The email service is configured via environment variables. See `.env.example` for complete list.

**Development Configuration:**
```env
# Email service configuration
MAIL_HOST=mailhog
MAIL_PORT=1025
MAIL_USER=
MAIL_PASSWORD=
MAIL_FROM=noreply@exchange.local
MAIL_TEMPLATES_PATH=./templates/emails
MAIL_SMTP_SECURE=false
MAIL_SMTP_IGNORE_TLS=true

# Feature flags
EMAIL_VERIFICATION_ENABLED=true
EMAIL_VERIFICATION_TOKEN_EXPIRY=24h
EMAIL_VERIFICATION_MAX_RETRIES=3

# Development settings
MOCK_EMAIL_SERVICE=false
DEV_EMAIL_CAPTURE=true
```

**Production Configuration (AWS SES):**
```env
# Email service configuration
MAIL_HOST=email.eu-west-1.amazonaws.com
MAIL_PORT=587
MAIL_USER=your-ses-smtp-username
MAIL_PASSWORD=your-ses-smtp-password
MAIL_FROM=noreply@exchange.local
MAIL_SMTP_SECURE=true
MAIL_SMTP_IGNORE_TLS=false

# Feature flags
EMAIL_VERIFICATION_ENABLED=true
EMAIL_VERIFICATION_TOKEN_EXPIRY=24h
```

**Configuration File:**
Located at `/services/auth-service/src/common/config/email.config.ts`

## Development Setup & Testing

### Quick Start

1. **Start the development environment:**
   ```bash
   docker-compose up -d
   ```
   This starts:
   - PostgreSQL database
   - Redis cache
   - RabbitMQ message broker
   - MailHog email server
   - Auth Service

2. **Verify MailHog is running:**
   ```bash
   curl -f http://localhost:8025 && echo "MailHog is healthy"
   ```

3. **Access MailHog Web UI:**
   Open browser and navigate to: `http://localhost:8025`

### Testing Email Functionality

#### Test via API

**1. Send Verification Email:**
```bash
curl -X POST http://localhost:3001/auth/send-verification \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "userName": "John Doe",
    "verificationCode": "123456",
    "verificationLink": "http://localhost:3000/verify?code=123456"
  }'
```

**2. Check MailHog for captured email:**
```bash
# Via Web UI: http://localhost:8025
# Via API:
curl http://localhost:8025/api/v1/messages
```

#### Test via MailHog Web UI

1. **Navigate to:** `http://localhost:8025`
2. **View captured emails:**
   - Each email is displayed with:
     - Sender and recipient information
     - Subject line
     - HTML and text content
     - Headers and raw MIME data
3. **Inspect email content:**
   - Click on any email to see full details
   - Switch between HTML and text views
   - Download email as .eml file

#### Mock Testing (No SMTP Required)

For testing without actual email sending:

**Enable mock mode in `.env`:**
```env
MOCK_EMAIL_SERVICE=true
```

When enabled:
- All emails are logged to console
- No SMTP connection attempted
- Useful for CI/CD pipelines and unit testing

### Health Checks

**Email Service Health Check:**
```bash
# The service performs health check on startup
# Check service logs:
docker logs exchange_auth_service | grep -i email

# Health check endpoint:
curl http://localhost:3001/health
```

Expected output:
```json
{
  "status": "ok",
  "timestamp": "2025-11-19T09:30:00Z",
  "services": {
    "database": "healthy",
    "redis": "healthy",
    "rabbitmq": "healthy",
    "email": "healthy"
  }
}
```

## Integration with Auth Service

The email service is integrated with the authentication flow:

### Email Verification Flow
```
1. User registers with email
2. Auth Service generates verification token
3. Email Service sends verification email with code
4. User clicks link or enters code
5. Auth Service verifies code and marks email as verified
6. User account fully activated
```

### Password Reset Flow
```
1. User requests password reset
2. Auth Service generates secure reset token (expires in 1 hour)
3. Email Service sends password reset email with link
4. User clicks link and enters new password
5. Auth Service validates token and updates password
6. Old sessions are invalidated
```

## Production Deployment

### AWS SES Configuration

1. **Verify Sender Email in AWS SES Console:**
   - Go to AWS SES Dashboard
   - Add "noreply@exchange.local" (or your domain)
   - Verify email by clicking confirmation link

2. **Create SMTP Credentials:**
   - AWS SES Console → SMTP Settings
   - Generate SMTP credentials
   - Note the SMTP hostname and credentials

3. **Configure Environment Variables:**
   ```env
   MAIL_HOST=email.eu-west-1.amazonaws.com
   MAIL_PORT=587
   MAIL_USER=<SMTP_USERNAME>
   MAIL_PASSWORD=<SMTP_PASSWORD>
   MAIL_FROM=noreply@exchange.local
   MAIL_SMTP_SECURE=true
   MAIL_SMTP_IGNORE_TLS=false
   ```

4. **Request SES Send Quota Increase:**
   - Initially, SES is in sandbox mode (25 emails/day)
   - Submit request to AWS to increase quota for production
   - Typically approved within 24 hours

### Security Considerations

1. **Secrets Management:**
   - Never commit `.env` file to Git
   - Use AWS Secrets Manager for production credentials
   - Rotate SMTP credentials regularly

2. **TLS/SSL:**
   - Always use `MAIL_SMTP_SECURE=true` in production
   - Verify certificate validation is enabled
   - Use STARTTLS for port 587

3. **Rate Limiting:**
   - Implement rate limiting on email endpoints
   - AWS SES has rate limits (24 emails/second max)
   - Monitor bounce and complaint rates

4. **Email Address Validation:**
   - All email addresses validated before sending
   - Implement DKIM/SPF/DMARC for domain authentication
   - Monitor deliverability metrics

## Monitoring & Troubleshooting

### Logs

**Email Service Logs:**
```bash
docker logs exchange_auth_service | grep -i email
```

**MailHog API for Email Statistics:**
```bash
curl http://localhost:8025/api/v1/stats
```

### Common Issues

**1. MailHog Not Responding**
```bash
# Check if container is running
docker ps | grep mailhog

# Restart if needed
docker restart exchange_mailhog

# Check MailHog logs
docker logs exchange_mailhog
```

**2. Emails Not Being Captured**
```bash
# Verify MAIL_HOST and MAIL_PORT in auth service
docker exec exchange_auth_service env | grep MAIL

# Test SMTP connectivity
telnet mailhog 1025
```

**3. Template Not Found Error**
```bash
# Verify template files exist
ls -la /services/auth-service/templates/emails/

# Check MAIL_TEMPLATES_PATH configuration
docker exec exchange_auth_service env | grep MAIL_TEMPLATES_PATH
```

**4. Email Sending Fails**
```bash
# Check auth service logs
docker logs exchange_auth_service --tail 100 -f

# Verify all required environment variables are set
docker exec exchange_auth_service env | grep -E "MAIL|EMAIL"
```

### Performance Metrics

**Monitor via MailHog API:**
```bash
# Get message count
curl http://localhost:8025/api/v1/stats | jq .

# Get all messages
curl http://localhost:8025/api/v1/messages | jq length

# Delete all messages
curl -X DELETE http://localhost:8025/api/v1/messages
```

## File Structure

```
services/auth-service/
├── templates/
│   └── emails/
│       ├── verify-email.html      # Email verification template (HTML)
│       ├── verify-email.txt       # Email verification template (plain text)
│       ├── reset-password.html    # Password reset template (HTML)
│       └── reset-password.txt     # Password reset template (plain text)
├── src/
│   └── common/
│       ├── services/
│       │   └── email.service.ts   # EmailService implementation
│       └── config/
│           └── email.config.ts    # Email configuration
└── docker-compose.yml             # Includes MailHog service definition
```

## Deployment Checklist

- [ ] Email templates are in place
- [ ] Environment variables configured correctly
- [ ] Docker Compose syntax validated
- [ ] MailHog service running in development
- [ ] Email service health check passing
- [ ] Template files readable by auth service
- [ ] SMTP credentials secured (not in Git)
- [ ] Email sending tested manually
- [ ] Logs reviewed for any errors
- [ ] Rate limiting configured
- [ ] Backup email fallback mechanism ready (for production)

## Integration with Backend Service (BE-002)

The email service is ready for integration with the backend authentication service:

1. **Import EmailService in AuthModule**
2. **Inject into AuthService**
3. **Call sendVerificationEmail() on user registration**
4. **Call sendPasswordResetEmail() on password reset request**
5. **Add email verification endpoint**

Example integration:
```typescript
import { EmailService } from '../common/services/email.service';

// In AuthService
async registerUser(registerDto: RegisterDto) {
  // Create user...

  // Send verification email
  const result = await this.emailService.sendVerificationEmail(
    registerDto.email,
    registerDto.firstName,
    verificationCode,
    verificationLink
  );

  if (!result.success) {
    this.logger.error('Failed to send verification email');
  }

  return { ...user, emailVerificationPending: true };
}
```

## Support & Escalation

**For Issues:**
1. Check logs: `docker logs exchange_auth_service`
2. Verify MailHog is accessible: `http://localhost:8025`
3. Test SMTP connection: `telnet mailhog 1025`
4. Review environment variables
5. Check template file permissions

**For Production SES Issues:**
1. Verify sender domain in SES console
2. Check bounce and complaint rates
3. Monitor send quota usage
4. Review CloudWatch logs
5. Contact AWS support if quota increases needed

## References

- MailHog Documentation: https://github.com/mailhog/MailHog
- NestJS Configuration: https://docs.nestjs.com/techniques/configuration
- AWS SES SMTP: https://docs.aws.amazon.com/ses/latest/dg/send-email-smtp.html
- Email Template Best Practices: https://litmus.com/blog/

## Glossary

- **SMTP** - Simple Mail Transfer Protocol, used for sending emails
- **SES** - AWS Simple Email Service
- **MailHog** - Local email server for development
- **Template Interpolation** - Replacing {{variables}} with actual values
- **TLS/SSL** - Secure communication protocols for SMTP
- **DKIM/SPF/DMARC** - Email authentication mechanisms

---

**Document Version:** 1.0
**Last Updated:** 2025-11-19
**Status:** Ready for Backend Integration
