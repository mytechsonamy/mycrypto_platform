# JWT Configuration Setup - Auth Service

## Overview

This document describes the JWT (JSON Web Token) configuration for the auth-service using RS256 (RSA-based asymmetric signing). This is a critical security component of the MyCrypto Platform.

## Current Setup

### Key Generation Status

RSA-4096 key pair has been generated and is ready for use:

- **Location:** `services/auth-service/keys/`
- **Private Key:** `private.pem` (3268 bytes, 400 permissions)
- **Public Key:** `public.pem` (800 bytes, 444 permissions)
- **Algorithm:** RS256 (RSA-based)
- **Key Size:** 4096-bit (exceeds security requirement of 2048+ bits)

### Token Configuration

```
Access Token:            15 minutes
Refresh Token:           30 days
Email Verification:      24 hours
Algorithm:               RS256
Private Key Path:        /app/keys/private.pem
Public Key Path:         /app/keys/public.pem
```

## Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Auth Service                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  JWT Configuration Module (jwt.config.ts)                  │
│  ├─ Loads RSA keys from file or environment               │
│  ├─ Validates key availability                            │
│  ├─ Configures NestJS JWT module with RS256              │
│  └─ Supports fallback to HS256 for backwards compatibility │
│                                                             │
│  JWT Key Directory (/app/keys/)                           │
│  ├─ private.pem (signing tokens)                          │
│  └─ public.pem (verifying tokens in other services)       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Key Loading Flow

```
Environment Variables Check
    ↓
JWT_ALGORITHM (RS256)
    ↓
JWT_PRIVATE_KEY_PATH → Load from /app/keys/private.pem
JWT_PUBLIC_KEY_PATH  → Load from /app/keys/public.pem
    ↓
Initialize JWT Module with RS256
    ↓
Ready for Token Signing/Verification
```

## Local Development

### Prerequisites

- OpenSSL (usually pre-installed on macOS/Linux)
- Docker & Docker Compose
- Node.js 20+ (for local testing)

### Running Validation

```bash
cd services/auth-service

# Run key validation
./scripts/validate-jwt-keys.sh

# Expected output: "All validation checks passed!"
```

### Docker Compose Setup

Keys are automatically mounted in docker-compose.yml:

```yaml
auth-service:
  volumes:
    - ./services/auth-service/keys:/app/keys:ro  # Read-only mount
  environment:
    JWT_ALGORITHM: RS256
    JWT_PRIVATE_KEY_PATH: /app/keys/private.pem
    JWT_PUBLIC_KEY_PATH: /app/keys/public.pem
    JWT_ACCESS_TOKEN_EXPIRY: 15m
    JWT_REFRESH_TOKEN_EXPIRY: 30d
    JWT_EMAIL_VERIFICATION_EXPIRY: 24h
```

### Starting Services

```bash
# Start all services with JWT keys configured
docker-compose up -d

# Verify auth-service is running with keys loaded
docker-compose logs auth-service | grep -i "jwt\|configuration"

# Test health endpoint
curl http://localhost:3001/health
```

## Environment Variables

### Required Variables

```bash
JWT_ALGORITHM=RS256                      # Algorithm for signing
JWT_PRIVATE_KEY_PATH=/app/keys/private.pem    # Path to private key
JWT_PUBLIC_KEY_PATH=/app/keys/public.pem      # Path to public key
JWT_ACCESS_TOKEN_EXPIRY=15m               # Access token TTL
JWT_REFRESH_TOKEN_EXPIRY=30d              # Refresh token TTL
JWT_EMAIL_VERIFICATION_EXPIRY=24h         # Email verification TTL
```

### Alternative: Environment Variable Keys

For production, keys can be passed as environment variables:

```bash
JWT_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA..."
JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----
MIICIjANBgkqhkiG9w0BAQ..."
```

## Integration with Services

### Auth Service (This Service)

- Generates and signs tokens
- Uses `jwt.config.ts` for configuration
- Implements JWT guard for protected routes
- Manages token expiry and refresh

### Other Services

To verify tokens signed by auth-service:

```typescript
import { JwtModule } from '@nestjs/jwt';
import * as fs from 'fs';

@Module({
  imports: [
    JwtModule.register({
      publicKey: fs.readFileSync('/path/to/public.pem', 'utf-8'),
      algorithms: ['RS256'],
    }),
  ],
})
export class YourModule {}
```

## Security Considerations

### Current Implementation

✓ RSA-4096 keys (secure)
✓ File permissions: 400 (private), 444 (public)
✓ Keys excluded from Git (`.gitignore` configured)
✓ Asymmetric signing (RS256)
✓ Token expiry configured
✓ Read-only volume mounts in containers

### Compliance

According to `security-audit-checklist.md`:

✓ **3.3 JWT Token Security**
  - ✓ JWT algorithm is RS256 (not 'none')
  - ✓ Private key is stored securely
  - ✓ Key size is 4096-bit (exceeds 2048+ requirement)
  - ✓ JWT claims contain only user ID, email, role (no sensitive data)

## File Structure

```
services/auth-service/
├── keys/
│   ├── private.pem              # 4096-bit RSA private key
│   └── public.pem               # Public key extracted from private
├── src/
│   ├── auth/
│   │   ├── auth.module.ts       # Uses jwtConfig, configures JWT
│   │   ├── auth.service.ts      # JWT token generation
│   │   └── interfaces/
│   │       └── jwt-payload.interface.ts
│   └── common/
│       └── config/
│           └── jwt.config.ts    # Key loading logic
├── scripts/
│   └── validate-jwt-keys.sh     # Key validation tool
├── docs/
│   └── JWT_KEY_MANAGEMENT.md    # Comprehensive key management guide
└── JWT_SETUP.md                 # This file
```

## Testing

### Test Registration & Token Generation

```bash
# Register a new user
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePassword123!",
    "terms_accepted": true,
    "kvkk_consent_accepted": true
  }'

# Verify email (use token from registration email)
curl -X POST http://localhost:3001/api/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{"token": "verification-token-from-email"}'

# Login to get tokens
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePassword123!"
  }'

# Response contains access_token (JWT signed with RS256)
```

### Validate JWT Structure

```bash
# Extract and decode JWT
TOKEN="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."

# Decode header and payload
echo $TOKEN | cut -d. -f1,2 | tr '-_' '+/' | xargs -I {} echo "{}==" | base64 -d | jq .

# Verify signature with public key
# (Use jwt.io online tool or jwt library)
```

## Troubleshooting

### Issue: "JWT keys not found"

```
Error: JWT private key not found. Set JWT_PRIVATE_KEY_PATH or JWT_PRIVATE_KEY
```

**Solution:**
```bash
# Verify keys exist
ls -la services/auth-service/keys/

# Regenerate if missing
cd services/auth-service
openssl genrsa -out keys/private.pem 4096
openssl rsa -in keys/private.pem -pubout -out keys/public.pem
chmod 400 keys/private.pem && chmod 444 keys/public.pem

# Restart services
docker-compose restart auth-service
```

### Issue: "JWT validation failed"

```
Error: Invalid token or Signature verification failed
```

**Solution:**
```bash
# Check key pair integrity
openssl rsa -in keys/private.pem -modulus -noout | openssl md5
openssl rsa -in keys/private.pem -pubout | openssl rsa -pubin -modulus -noout | openssl md5

# Output should be identical
# If not, keys are not a valid pair
```

### Issue: "Permission denied" reading keys

**Solution:**
```bash
# Fix permissions
chmod 400 services/auth-service/keys/private.pem
chmod 444 services/auth-service/keys/public.pem

# Verify in container
docker exec exchange_auth_service ls -la /app/keys/
```

## Maintenance

### Regular Checks

**Weekly:**
- Monitor JWT validation success rates
- Check for any token expiry-related errors
- Verify keys are still accessible

**Monthly:**
- Validate key pair integrity
- Review access logs to keys
- Ensure .gitignore is preventing key commits

**Quarterly:**
- Plan key rotation
- Audit JWT configuration
- Review token expiry times

## Related Documentation

- **JWT Key Management Guide:** `docs/JWT_KEY_MANAGEMENT.md`
  - Detailed key rotation procedures
  - Production deployment setup
  - AWS Secrets Manager integration

- **Security Audit Checklist:** `/Inputs/security-audit-checklist.md`
  - Section 3.3: JWT Token Security
  - JWT compliance requirements

- **Auth Service README:** `README.md`
  - Complete service documentation
  - API endpoints
  - Development setup

## Next Steps

### For Development
1. ✓ Keys are generated and configured
2. ✓ docker-compose.yml is updated
3. Run: `docker-compose up -d` to start services
4. Test token endpoints (see Testing section)

### For Staging/Production
1. Generate new keys (don't reuse development keys)
2. Store keys in AWS Secrets Manager
3. Update deployment manifests (Kubernetes/ECS)
4. Configure environment variables
5. Update CI/CD pipelines
6. See `docs/JWT_KEY_MANAGEMENT.md` for detailed steps

## Support

For issues or questions:
- Check JWT_KEY_MANAGEMENT.md for detailed guidance
- Review security-audit-checklist.md for compliance requirements
- Contact security team: security@techsonamy.com

---

**Setup Date:** 2025-11-19
**Status:** Ready for Local Development
**Next Review:** 2025-12-19
**Security Classification:** Internal - Security Team Only
