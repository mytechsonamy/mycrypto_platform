# Two-Factor Authentication (2FA) Infrastructure Configuration

## Overview
This document describes the complete infrastructure configuration for Two-Factor Authentication (2FA) support in the MyCrypto Exchange platform. 2FA uses Time-based One-Time Password (TOTP) protocol compatible with authenticator apps like Google Authenticator and Authy.

## Architecture

### Components
- **Auth Service**: NestJS application implementing 2FA logic
- **Redis**: Temporary token and rate limit storage
- **PostgreSQL**: Persistent storage of encrypted TOTP secrets and backup codes
- **Prometheus**: Metrics collection for 2FA events
- **Grafana**: Dashboards and alerts

## 1. Encryption Key Setup

### Key Generation
The Two-Factor Encryption Key is a 256-bit (32 bytes) AES encryption key used to encrypt TOTP secrets at rest.

**Generated Key (for development):**
```
sMF1I3Ol5Z2ZAybh9gnIIZMLb/VyZ2an+IzY7Y3y+ec=
```

### Key Specifications
- **Algorithm**: AES-256 (256-bit key)
- **Format**: Base64 encoded
- **Length**: 32 bytes (256 bits) when decoded
- **Purpose**: Encrypt TOTP secrets before database storage

### Security Requirements
- Never log or print the encryption key
- Store in environment variables only
- Rotate keys every 90 days in production
- Use AWS Secrets Manager or HashiCorp Vault for key storage in production
- Ensure key access is restricted via IAM policies

### Key Rotation Procedure
1. Generate new encryption key
2. Deploy new key to Auth Service via environment variables
3. Decrypt all existing secrets with old key in memory
4. Re-encrypt with new key
5. Store updated secrets in database
6. Remove old key from environment
7. Document rotation in audit log

## 2. Redis Configuration for 2FA

### Key Patterns and TTLs

#### Setup Phase
```
Key Pattern: 2fa:setup:{userId}
Type: String (JSON)
TTL: 15 minutes (900 seconds)
Content: Temporary TOTP secret + backup codes
Usage: Temporary storage during 2FA setup process
Cleanup: Automatic after TTL expires or explicit deletion after verification
```

#### Challenge Phase
```
Key Pattern: 2fa:challenge:{userId}
Type: String (JSON)
TTL: 5 minutes (300 seconds)
Content: Challenge token + metadata
Usage: Temporary token during login 2FA verification
Cleanup: Automatic after TTL expires
```

#### Rate Limiting
```
Key Pattern: 2fa:attempts:{userId}
Type: Counter (Integer)
TTL: 15 minutes (900 seconds)
Content: Failed verification attempt count
Threshold: Maximum 5 failed attempts before lockout
Lockout: 15-minute lockout after exceeding threshold
Usage: Prevent brute force attacks
```

#### Failed Attempts per IP
```
Key Pattern: 2fa:attempts:ip:{ipAddress}
Type: Counter (Integer)
TTL: 1 hour (3600 seconds)
Content: Failed verification attempt count per IP
Threshold: Maximum 50 failed attempts per hour
Usage: Detect distributed brute force attacks
```

### Redis Configuration
```bash
# In docker-compose.yml, Redis is configured with:
- Password authentication: redis_dev_password
- Persistence: AOF (Append Only File)
- Host: redis
- Port: 6379
```

### Implementation Notes
- Use pipelining for batch operations
- Implement exponential backoff for retry logic
- Monitor Redis memory usage (all keys are temporary)
- Set up Redis persistence for production (RDB + AOF)
- Implement Redis cluster for high availability in production

## 3. Environment Variables

### Required 2FA Variables
```bash
# Two-Factor Authentication
TWO_FACTOR_ENCRYPTION_KEY=sMF1I3Ol5Z2ZAybh9gnIIZMLb/VyZ2an+IzY7Y3y+ec=
TWO_FACTOR_ISSUER=MyCrypto Exchange
TWO_FACTOR_SETUP_EXPIRY=15m
TWO_FACTOR_CHALLENGE_EXPIRY=5m
TWO_FACTOR_MAX_ATTEMPTS=5
TWO_FACTOR_LOCKOUT_DURATION=15m
```

### Environment Variable Descriptions
- **TWO_FACTOR_ENCRYPTION_KEY**: Base64-encoded 256-bit encryption key for TOTP secrets
- **TWO_FACTOR_ISSUER**: Issuer name displayed in authenticator apps (max 32 chars)
- **TWO_FACTOR_SETUP_EXPIRY**: Duration temporary setup tokens remain valid
- **TWO_FACTOR_CHALLENGE_EXPIRY**: Duration login challenge tokens remain valid
- **TWO_FACTOR_MAX_ATTEMPTS**: Maximum failed verification attempts before lockout
- **TWO_FACTOR_LOCKOUT_DURATION**: Duration of lockout after exceeding max attempts

## 4. Database Schema Requirements

### User Entity Extensions
```sql
-- Add to users table
ALTER TABLE users ADD COLUMN two_fa_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN two_fa_secret_encrypted TEXT; -- Encrypted TOTP secret
ALTER TABLE users ADD COLUMN two_fa_backup_codes TEXT; -- Encrypted backup codes
ALTER TABLE users ADD COLUMN two_fa_enabled_at TIMESTAMP;
ALTER TABLE users ADD COLUMN two_fa_disabled_at TIMESTAMP;

-- Create backup codes tracking table
CREATE TABLE two_fa_backup_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code_hash VARCHAR(255) NOT NULL, -- Hash of backup code
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, code_hash)
);

-- Create 2FA audit log table
CREATE TABLE two_fa_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL, -- 'SETUP', 'VERIFY', 'VALIDATE', 'BACKUP_USED', 'DISABLE', 'FAILED'
    ip_address INET,
    user_agent TEXT,
    status VARCHAR(50), -- 'SUCCESS', 'FAILED', 'LOCKED'
    error_code VARCHAR(50),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (user_id, created_at),
    INDEX (event_type, created_at)
);
```

## 5. API Endpoints (Reference)

### Generate 2FA Setup
```
POST /auth/2fa/setup
Response: QR Code, Manual Entry Key, Backup Codes
```

### Verify 2FA Setup
```
POST /auth/2fa/verify
Body: { code: "123456", setupToken: "..." }
Response: Success confirmation
```

### Validate 2FA During Login
```
POST /auth/2fa/validate
Body: { code: "123456" or "XXXX-XXXX" }
Response: Access token, Refresh token
```

### Regenerate Backup Codes
```
POST /auth/2fa/backup-codes/regenerate
Response: New backup codes
```

### Disable 2FA
```
POST /auth/2fa/disable
Body: { code: "123456" }
Response: Success confirmation
```

## 6. Security Considerations

### Encryption
- TOTP secrets encrypted with AES-256 before database storage
- Encryption keys stored in environment variables only
- Never log or transmit unencrypted secrets
- Implement key rotation every 90 days

### Rate Limiting
- Maximum 5 failed 2FA attempts per user before 15-minute lockout
- Maximum 50 failed attempts per IP address per hour
- Log all rate limit violations
- Alert on suspicious patterns

### Audit Logging
- Log all 2FA events (setup, verification, disable, failures)
- Include user ID, IP address, user agent, timestamp
- Store in database for long-term audit trail
- Implement data retention policies (minimum 1 year)

### Backup Codes
- Generate 8 backup codes during 2FA setup
- Each code used only once
- Store as bcrypt hashes in database
- Display codes only during setup (never retrievable after)
- Allow regeneration with current 2FA code verification

### Time Synchronization
- Use TOTP with 30-second window
- Accept current and previous time window (±1 window tolerance)
- Verify server time is synchronized (NTP)
- Log time synchronization issues

## 7. Monitoring and Alerts

### Key Metrics
- `auth_2fa_setup_total`: Total 2FA setup attempts (counter)
- `auth_2fa_setup_success_total`: Successful 2FA setups (counter)
- `auth_2fa_verify_total`: Total 2FA verifications during setup (counter)
- `auth_2fa_validate_total`: Total 2FA validations during login (counter)
- `auth_2fa_validate_success_total`: Successful login validations (counter)
- `auth_2fa_failed_total`: Failed 2FA attempts (counter)
- `auth_2fa_backup_used_total`: Backup codes used (counter)
- `auth_2fa_lockout_total`: 2FA lockout events (counter)
- `auth_2fa_disabled_total`: 2FA disablements (counter)

### Alert Thresholds
- High failed 2FA attempt rate: > 10% failure rate over 5 minutes
- Unusual backup code usage: > 2 backup codes per hour per user
- 2FA setup failures: > 20% failure rate over 5 minutes
- Distributed brute force: > 50 attempts per IP per hour

## 8. Testing and Validation

### Setup Testing
1. Verify encryption key is 256-bit when decoded
2. Test TOTP generation with known secret
3. Verify QR code generation and format
4. Test backup code generation (8 codes, correct format)
5. Verify Redis key creation and TTL

### Validation Testing
1. Test valid TOTP code acceptance (within 30-second window)
2. Test invalid TOTP code rejection
3. Test rate limiting (5 attempts lockout)
4. Test backup code acceptance and marking as used
5. Test backup code one-time use enforcement

### Security Testing
1. Verify encryption key is never logged
2. Verify TOTP secrets are stored encrypted
3. Test rate limit bypass prevention
4. Test brute force prevention
5. Verify audit logging of all events

## 9. Production Deployment Checklist

- [ ] Encryption key generated and stored in AWS Secrets Manager
- [ ] Environment variables configured via Secrets Manager
- [ ] Database migrations applied (schema, indexes)
- [ ] Redis cluster configured with replication
- [ ] Prometheus scrape configs updated
- [ ] Grafana dashboard deployed
- [ ] Alert rules configured and tested
- [ ] Audit logging implemented
- [ ] Backup code generation tested
- [ ] Rate limiting tested under load
- [ ] TOTP secret encryption verified
- [ ] Key rotation procedure documented
- [ ] Disaster recovery plan documented
- [ ] Team trained on 2FA operations
- [ ] Monitoring verified and alerting tested

## 10. Troubleshooting

### Common Issues

**TOTP Code Not Working**
- Verify server time is synchronized (NTP)
- Check if code is within ±1 window (±30 seconds)
- Verify TOTP secret was not corrupted during encryption
- Check database for correct secret storage

**Rate Limiting Blocking Valid Users**
- Verify IP detection is correct (may be behind proxy)
- Check Redis connection health
- Verify rate limit counters are expiring (TTL)
- Consider implementing IP whitelist for office locations

**Redis Connection Errors**
- Verify Redis password is correct in environment
- Check Redis service is running and healthy
- Verify network connectivity to Redis
- Check Redis logs for errors

**Encryption Issues**
- Verify encryption key is correct Base64
- Ensure key is 32 bytes when decoded
- Check for key rotation issues (old vs new key)
- Verify database field sizes for encrypted data

## References
- TOTP (RFC 6238): https://tools.ietf.org/html/rfc6238
- Redis TTL Documentation: https://redis.io/commands/expire
- OWASP 2FA Guidelines: https://owasp.org/www-community/attacks/Brute_force_attack
