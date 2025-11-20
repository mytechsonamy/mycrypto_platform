# JWT Key Management Guide

## Overview

This document provides comprehensive guidance on managing RSA keys for JWT signing in the MyCrypto Platform auth service. The platform uses RS256 (RSA-based) asymmetric signing for JWT tokens, which is the industry standard for multi-service architectures where verification must be distributed.

## Key Architecture

### Current Implementation

- **Algorithm:** RS256 (RSA-based asymmetric signing)
- **Key Size:** 4096-bit minimum (security standard)
- **Token Types:**
  - Access Token: 15 minutes expiry
  - Refresh Token: 30 days expiry
  - Email Verification: 24 hours expiry

### Key Components

```
auth-service/
├── keys/
│   ├── private.pem  (400 permissions - read-only for owner)
│   └── public.pem   (444 permissions - readable by all)
├── src/
│   └── common/config/
│       └── jwt.config.ts  (Key loading logic)
└── docker-compose.yml     (Volume mount configuration)
```

## Development Setup

### Initial Key Generation

For development, generate the RSA key pair:

```bash
cd services/auth-service

# Create keys directory
mkdir -p keys

# Generate private key (RSA-4096)
openssl genrsa -out keys/private.pem 4096

# Extract public key from private key
openssl rsa -in keys/private.pem -pubout -out keys/public.pem

# Set proper file permissions
chmod 400 keys/private.pem  # Owner read-only
chmod 444 keys/public.pem   # All read
```

### Verifying Key Generation

```bash
# View key details
openssl rsa -in keys/private.pem -text -noout | head -5

# Check key size
openssl rsa -in keys/private.pem -text -noout | grep "Private-Key"

# Expected output: Private-Key: (4096 bit, 2 primes)
```

### Git Configuration

The `.gitignore` file automatically excludes key files:

```gitignore
*.pem
*.key
```

Verify keys are NOT committed:

```bash
# Check that keys are ignored
git status
# Should NOT show services/auth-service/keys/

# Double-check git history
git log --all --full-history -- "**/keys/*" -- "*.pem" -- "*.key"
# Should return nothing
```

## Docker & Container Setup

### Development with Docker Compose

Keys are mounted as read-only volumes in docker-compose.yml:

```yaml
services:
  auth-service:
    volumes:
      - ./services/auth-service:/app
      - ./services/auth-service/keys:/app/keys:ro  # Read-only mount
      - /app/node_modules
    environment:
      JWT_ALGORITHM: RS256
      JWT_PRIVATE_KEY_PATH: /app/keys/private.pem
      JWT_PUBLIC_KEY_PATH: /app/keys/public.pem
      JWT_ACCESS_TOKEN_EXPIRY: 15m
      JWT_REFRESH_TOKEN_EXPIRY: 30d
      JWT_EMAIL_VERIFICATION_EXPIRY: 24h
```

### Container Build Notes

The Dockerfile does NOT include keys in the image (correct approach):

1. Keys are mounted at runtime via docker-compose volumes
2. Secrets remain outside the container image
3. Same image can be used for different environments with different keys

## Production Deployment

### AWS Secrets Manager Setup

For production, store keys in AWS Secrets Manager:

```bash
# Create secret for private key
aws secretsmanager create-secret \
  --name jwt/private-key \
  --description "JWT Private Key for auth-service RS256 signing" \
  --secret-string file://keys/private.pem \
  --region eu-west-1 \
  --tags Key=Environment,Value=production

# Create secret for public key
aws secretsmanager create-secret \
  --name jwt/public-key \
  --description "JWT Public Key for auth-service RS256 verification" \
  --secret-string file://keys/public.pem \
  --region eu-west-1 \
  --tags Key=Environment,Value=production
```

### Kubernetes Secret Configuration

For Kubernetes deployments:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: jwt-keys
  namespace: production
type: Opaque
data:
  private.pem: <base64-encoded-private-key>
  public.pem: <base64-encoded-public-key>
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auth-service
spec:
  template:
    spec:
      containers:
        - name: auth-service
          volumeMounts:
            - name: jwt-keys
              mountPath: /app/keys
              readOnly: true
      volumes:
        - name: jwt-keys
          secret:
            secretName: jwt-keys
            defaultMode: 0400
```

### Environment Variable Setup

For container orchestration:

```bash
# Load keys from AWS Secrets Manager
export JWT_PRIVATE_KEY=$(aws secretsmanager get-secret-value \
  --secret-id jwt/private-key \
  --query SecretString \
  --output text)

export JWT_PUBLIC_KEY=$(aws secretsmanager get-secret-value \
  --secret-id jwt/public-key \
  --query SecretString \
  --output text)

# Pass to container
docker run \
  -e JWT_ALGORITHM=RS256 \
  -e JWT_PRIVATE_KEY="$JWT_PRIVATE_KEY" \
  -e JWT_PUBLIC_KEY="$JWT_PUBLIC_KEY" \
  -e JWT_ACCESS_TOKEN_EXPIRY=15m \
  -e JWT_REFRESH_TOKEN_EXPIRY=30d \
  auth-service:latest
```

## Key Rotation Procedures

### Regular Rotation Schedule

- **Development:** Not required
- **Staging:** Quarterly (90 days)
- **Production:** Quarterly (90 days) OR on compromise

### Emergency Rotation (Key Compromise)

If a key is compromised:

1. **Immediate Actions (within 1 hour)**
   - Revoke all active tokens (blacklist in Redis)
   - Notify security team
   - Generate new key pair
   - Update AWS Secrets Manager

2. **Short-term (within 4 hours)**
   - Deploy new key pair to staging for validation
   - Verify token validation with new keys
   - Monitor for issues

3. **Production Deployment (within 24 hours)**
   - Deploy new keys to production
   - Old keys remain functional for 30 days (refresh token expiry)
   - Monitor logs for validation failures
   - Audit all token usages

### Planned Rotation Procedure

```bash
#!/bin/bash
# 1. Generate new keys
openssl genrsa -out keys/private_new.pem 4096
openssl rsa -in keys/private_new.pem -pubout -out keys/public_new.pem

# 2. Set permissions
chmod 400 keys/private_new.pem
chmod 444 keys/public_new.pem

# 3. Backup old keys (AWS S3)
aws s3 cp keys/private.pem s3://crypto-backups/jwt-keys/private-$(date +%Y%m%d).pem.backup
aws s3 cp keys/public.pem s3://crypto-backups/jwt-keys/public-$(date +%Y%m%d).pem.backup

# 4. Update AWS Secrets Manager
aws secretsmanager put-secret-value \
  --secret-id jwt/private-key \
  --secret-string file://keys/private_new.pem \
  --region eu-west-1

aws secretsmanager put-secret-value \
  --secret-id jwt/public-key \
  --secret-string file://keys/public_new.pem \
  --region eu-west-1

# 5. Replace current keys
mv keys/private_new.pem keys/private.pem
mv keys/public_new.pem keys/public.pem

# 6. Deploy new keys to all environments
# (Kubernetes: Update secret)
# (Docker: Rebuild with new secrets)
# (ECS: Update task definition)

# 7. Verify JWT validation
curl -X POST http://localhost:3001/api/auth/refresh \
  -H "Authorization: Bearer <refresh-token>"

# 8. Monitor for errors
# Check CloudWatch logs for JWT validation failures
```

## Key Verification

### Validate Key Pair

```bash
# Extract modulus from both keys (should match)
openssl rsa -in keys/private.pem -modulus -noout | openssl md5
openssl rsa -in keys/private.pem -pubout | openssl rsa -pubin -modulus -noout | openssl md5

# Output should be identical
```

### Test JWT Signing/Verification

```bash
# Generate test JWT with current keys
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TempPassword123!",
    "terms_accepted": true,
    "kvkk_consent_accepted": true
  }'

# Verify token with public key
jwt=$(echo "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..." | base64 -d)
echo "$jwt" | openssl dgst -sha256 -verify keys/public.pem -signature <(echo "signature_part")
```

## Troubleshooting

### Key Not Found Error

**Error:** `JWT private key not found. Set JWT_PRIVATE_KEY_PATH or JWT_PRIVATE_KEY`

**Solutions:**
```bash
# Check path is correct
ls -la /app/keys/private.pem

# Check permissions
stat /app/keys/private.pem

# Check environment variable
echo $JWT_PRIVATE_KEY_PATH

# Verify in container
docker exec exchange_auth_service cat /app/keys/private.pem | head -1
```

### JWT Verification Failures

**Error:** `Invalid token` or `Signature verification failed`

**Solutions:**
1. Verify public key matches current private key
2. Check algorithm matches (RS256)
3. Verify token wasn't signed with old key
4. Check key permissions (should be readable)

### Permission Denied Errors

**Error:** `Permission denied` when reading keys

**Solutions:**
```bash
# Fix permissions
chmod 400 keys/private.pem
chmod 444 keys/public.pem

# In Docker, verify mount is read-only
docker inspect exchange_auth_service | grep -A 5 "Mounts"

# Should show: "Mode": "r"
```

## Security Best Practices

### Do's

- Use RSA-4096 or RSA-2048 minimum
- Store private keys in secret management (AWS Secrets Manager, HashiCorp Vault)
- Rotate keys quarterly
- Keep separate keys for dev/staging/prod
- Monitor key access logs
- Use read-only mounts in containers
- Implement key rotation before expiration
- Audit all key usage

### Don'ts

- Never commit keys to Git
- Never use default keys in production
- Never share private keys via email or chat
- Never log private keys
- Never use weak algorithms (HS256 is acceptable only as fallback)
- Never hardcode keys in application code
- Never use same keys across environments

## Monitoring & Auditing

### Key Access Logging

Enable AWS Secrets Manager logging:

```bash
# Create CloudTrail for API calls
aws cloudtrail create-trail \
  --name jwt-key-access \
  --s3-bucket-name crypto-audit-logs \
  --region eu-west-1

# Create CloudWatch alarm for secret access
aws cloudwatch put-metric-alarm \
  --alarm-name jwt-key-access \
  --alarm-description "Alert on JWT key access" \
  --metric-name GetSecretValue \
  --namespace AWS/SecretsManager \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold
```

### Token Validation Metrics

Monitor in Prometheus:

```yaml
# Successful token validations
jwt_token_validations_success_total

# Failed token validations
jwt_token_validations_failure_total{reason="invalid_signature"}

# Key rotation events
jwt_key_rotations_total

# Current active key version
jwt_active_key_version
```

## References

- [NestJS JWT Documentation](https://docs.nestjs.com/security/authentication)
- [OAuth 2.0 Security Best Practices](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)
- [JWT (RFC 7519)](https://datatracker.ietf.org/doc/html/rfc7519)
- [AWS Secrets Manager Best Practices](https://docs.aws.amazon.com/secretsmanager/latest/userguide/best-practices.html)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)

## Contact & Support

For key management issues:
- Security Team: security@techsonamy.com
- On-call Engineer: See incident response playbook
- External Auditor: audit@securityfirm.com

---

**Document Version:** 1.0
**Last Updated:** 2025-11-19
**Next Review:** 2025-12-19
**Classification:** Internal - Security Team Only
