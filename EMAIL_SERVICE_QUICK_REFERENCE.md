# Email Service - Quick Reference Guide

## Start Email Service

```bash
# Start all services including MailHog
docker-compose up -d

# View service status
docker-compose ps

# Verify MailHog health
curl -f http://localhost:8025 && echo "MailHog is running"
```

## Access MailHog Web UI

**URL:** http://localhost:8025

- View all captured emails
- Inspect HTML and text versions
- Check email headers
- Download as .eml file

## Check Email Logs

```bash
# View recent email-related logs
docker logs exchange_auth_service | grep -i email

# Follow logs in real-time
docker logs exchange_auth_service -f

# Get last 50 lines
docker logs exchange_auth_service --tail 50
```

## Environment Variables

**Development (.env):**
```env
MAIL_HOST=mailhog
MAIL_PORT=1025
MAIL_FROM=noreply@exchange.local
MAIL_TEMPLATES_PATH=./templates/emails
EMAIL_VERIFICATION_ENABLED=true
DEV_EMAIL_CAPTURE=true
```

**Production:**
- Update MAIL_HOST to AWS SES endpoint
- Set MAIL_USER and MAIL_PASSWORD
- Set MAIL_SMTP_SECURE=true

## Email Templates

**Location:** `/services/auth-service/templates/emails/`

**Available Templates:**
- `verify-email.html` & `verify-email.txt` - Email verification
- `reset-password.html` & `reset-password.txt` - Password reset

**Template Variables:**
```
{{userName}}              - User's name
{{verificationCode}}      - Verification code
{{verificationLink}}      - Link to verify email
{{resetLink}}            - Link to reset password
{{currentYear}}          - Current year
```

## Test Email Sending

**Option 1: Via MailHog API**
```bash
# Get all messages
curl http://localhost:8025/api/v1/messages

# Delete all messages
curl -X DELETE http://localhost:8025/api/v1/messages

# Get statistics
curl http://localhost:8025/api/v1/stats
```

**Option 2: Mock Mode**
```env
# In .env, set:
MOCK_EMAIL_SERVICE=true
# Then check auth service logs for email output
docker logs exchange_auth_service
```

## File Locations

| File | Purpose |
|------|---------|
| `docker-compose.yml` | MailHog service definition |
| `.env.example` | Email configuration template |
| `services/auth-service/templates/emails/*.html` | HTML email templates |
| `services/auth-service/templates/emails/*.txt` | Plain text email templates |
| `services/auth-service/src/common/services/email.service.ts` | Email service code |
| `services/auth-service/src/common/config/email.config.ts` | Email configuration |

## Troubleshooting

| Issue | Solution |
|-------|----------|
| MailHog not responding | `docker restart exchange_mailhog` |
| Emails not captured | Check `MAIL_HOST=mailhog` in docker-compose.yml |
| Template not found | Verify path: `./templates/emails/` |
| Container won't start | Check logs: `docker logs exchange_auth_service` |

## Docker Compose Commands

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f auth-service

# Restart a service
docker-compose restart auth-service

# Remove volumes (clears data)
docker-compose down -v

# Rebuild image
docker-compose up -d --build auth-service
```

## Common Tasks

**Send Test Email (when integrated):**
```bash
curl -X POST http://localhost:3001/auth/send-verification \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "userName": "Test User",
    "verificationCode": "123456",
    "verificationLink": "http://localhost:3000/verify?code=123456"
  }'
```

**Check Service Health:**
```bash
curl http://localhost:3001/health | jq '.services.email'
```

**View Email Service Variables:**
```bash
docker exec exchange_auth_service env | grep MAIL
```

## Performance Tips

1. **Use MailHog for local development** - No real email sending, instant capture
2. **Mock emails in CI/CD** - Set `MOCK_EMAIL_SERVICE=true`
3. **Delete old emails regularly** - `curl -X DELETE http://localhost:8025/api/v1/messages`
4. **Use plain text fallback** - All templates include `.txt` versions

## Notes

- MailHog emails are in-memory only (cleared on restart)
- All emails in development mode include both English and Turkish
- Verification link should include validation token
- Password reset links expire in 1 hour
- Production uses AWS SES (requires valid credentials)

---

**Quick Help:**
- MailHog UI: http://localhost:8025
- Auth Service: http://localhost:3001
- Docker Compose config valid: `docker-compose config`
