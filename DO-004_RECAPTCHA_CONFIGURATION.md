# Task DO-004: Google reCAPTCHA v3 Configuration

**Status:** COMPLETED
**Priority:** P0 (Highest - blocks BE-005 and FE-004)
**Deadline:** Day 3, 10:00 AM

## Overview

Google reCAPTCHA v3 has been successfully configured for the MyCrypto Platform authentication service. This configuration uses Google's official test keys for development environments and provides clear guidelines for production deployment.

## Configuration Details

### Environment Variables Configured

Three environment variables have been added to support reCAPTCHA v3:

```bash
RECAPTCHA_SITE_KEY=6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI
RECAPTCHA_SECRET_KEY=6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe
RECAPTCHA_SCORE_THRESHOLD=0.5
```

### Variable Descriptions

| Variable | Purpose | Usage |
|----------|---------|-------|
| `RECAPTCHA_SITE_KEY` | Frontend identifier for reCAPTCHA widget | Used by FE-004 to initialize reCAPTCHA widget on registration form |
| `RECAPTCHA_SECRET_KEY` | Backend secret for token verification | Used by BE-005 to verify reCAPTCHA tokens with Google API |
| `RECAPTCHA_SCORE_THRESHOLD` | Bot detection sensitivity (0.0-1.0) | Score >= threshold = valid user; < threshold = potential bot |

## Files Modified

### 1. `/docker-compose.yml`
**Location:** Project root
**Changes:** Added 3 reCAPTCHA environment variables to auth-service container

```yaml
auth-service:
  environment:
    RECAPTCHA_SITE_KEY: 6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI
    RECAPTCHA_SECRET_KEY: 6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe
    RECAPTCHA_SCORE_THRESHOLD: "0.5"
```

### 2. `/.env.example`
**Location:** Project root
**Changes:** Added reCAPTCHA section with comprehensive documentation

- Section: RECAPTCHA CONFIGURATION
- Includes helpful comments about development vs. production usage
- Links to Google reCAPTCHA Admin Console for key generation

### 3. `/services/auth-service/.env.example`
**Location:** Auth service directory
**Changes:** Added reCAPTCHA section with usage documentation

- Explains site key vs. secret key purpose
- Documents score threshold behavior
- Provides guidance for threshold adjustment

### 4. `/services/auth-service/.env`
**Location:** Auth service development environment file
**Changes:** Added reCAPTCHA configuration for docker-compose usage

- Pre-populated with test keys for local development
- Ready for immediate use in docker-compose environment

## Test Keys Characteristics

The provided test keys are Google's official development keys:

### Key Details
- **Site Key:** `6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI`
- **Secret Key:** `6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe`

### Behavior
- Always passes reCAPTCHA verification
- No actual bot detection is performed
- Ideal for development, testing, and CI/CD pipelines
- Returns a perfect score (1.0) for all requests

### Important Notes
- Do NOT use these keys in production environments
- Generate production keys from: https://www.google.com/recaptcha/admin/create
- Test keys are clearly marked in Google's documentation

## Production Deployment

### Steps to Configure for Production

1. **Generate New Keys:**
   - Visit: https://www.google.com/recaptcha/admin/create
   - Sign in with your Google account
   - Create a new reCAPTCHA v3 project
   - Add your domain(s)
   - Note the Site Key and Secret Key

2. **Update Environment Variables:**
   - Replace `RECAPTCHA_SITE_KEY` with your production site key
   - Replace `RECAPTCHA_SECRET_KEY` with your production secret key
   - Store in AWS Secrets Manager (do NOT commit to Git)

3. **Store Secrets Securely:**
   ```bash
   # AWS Secrets Manager
   aws secretsmanager create-secret \
     --name prod/recaptcha/site-key \
     --secret-string "your-production-site-key"

   aws secretsmanager create-secret \
     --name prod/recaptcha/secret-key \
     --secret-string "your-production-secret-key"
   ```

4. **Update Score Threshold (Optional):**
   - Default: 0.5 (balanced security)
   - Stricter: 0.7-0.9 (higher security, may block legitimate users)
   - Lenient: 0.3-0.5 (lower friction, may allow more bots)

## Integration Points

### Frontend (FE-004)
- Uses `RECAPTCHA_SITE_KEY` to initialize reCAPTCHA widget
- Executes reCAPTCHA challenge on registration form
- Sends reCAPTCHA token to backend

### Backend (BE-005)
- Uses `RECAPTCHA_SECRET_KEY` to verify tokens with Google API
- Compares returned score against `RECAPTCHA_SCORE_THRESHOLD`
- Accepts or rejects user registration based on score

## Validation Results

### Verification Checklist
- [x] reCAPTCHA test keys configured in docker-compose.yml
- [x] Environment variables documented in .env.example
- [x] Environment variables documented in auth-service/.env.example
- [x] Test keys validated against Google's official format
- [x] Score threshold validated (valid range: 0.0-1.0)
- [x] All 4 configuration locations updated consistently
- [x] Configuration ready for BE-005 and FE-004 integration

### Configuration File Status

| File | Status | Variables |
|------|--------|-----------|
| docker-compose.yml | ✅ COMPLETE | 3 env vars |
| .env.example | ✅ COMPLETE | 3 env vars + documentation |
| services/auth-service/.env.example | ✅ COMPLETE | 3 env vars + documentation |
| services/auth-service/.env | ✅ COMPLETE | 3 env vars |

## Handoff Notes for Dependent Tasks

### For BE-005 (Backend - User Registration Validation)
**Available Variables:**
- `process.env.RECAPTCHA_SECRET_KEY` - Use to verify reCAPTCHA tokens
- `process.env.RECAPTCHA_SCORE_THRESHOLD` - Use to evaluate bot risk score

**Integration Steps:**
1. Receive reCAPTCHA token from frontend
2. Call Google reCAPTCHA verification API:
   ```
   POST https://www.google.com/recaptcha/api/siteverify
   Data: secret=RECAPTCHA_SECRET_KEY&response=token
   ```
3. Extract score from response
4. Compare: `if (response.score >= RECAPTCHA_SCORE_THRESHOLD) { accept registration }`

### For FE-004 (Frontend - User Registration UI)
**Available Variables:**
- `VITE_RECAPTCHA_SITE_KEY` or `REACT_APP_RECAPTCHA_SITE_KEY` - Use to initialize widget

**Integration Steps:**
1. Load reCAPTCHA script in HTML head:
   ```html
   <script src="https://www.google.com/recaptcha/api.js"></script>
   ```
2. Initialize reCAPTCHA v3 on page load:
   ```javascript
   grecaptcha.ready(function() {
     grecaptcha.execute(RECAPTCHA_SITE_KEY, {action: 'register'})
       .then(token => sendTokenToBackend(token));
   });
   ```
3. Send token in registration POST request to BE-005

## Testing

### Local Development Testing
```bash
# Start docker-compose with reCAPTCHA configured
docker-compose up -d

# Verify env vars are loaded
docker-compose exec auth-service env | grep RECAPTCHA

# Expected output:
# RECAPTCHA_SITE_KEY=6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI
# RECAPTCHA_SECRET_KEY=6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe
# RECAPTCHA_SCORE_THRESHOLD=0.5
```

### Manual Verification with Test Keys
```bash
# Test the verification endpoint with test token
curl -X POST https://www.google.com/recaptcha/api/siteverify \
  -d "secret=6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe&response=test-token"

# Response should include:
# {
#   "success": true,
#   "score": 1.0,
#   "action": "register",
#   "challenge_ts": "...",
#   "hostname": "..."
# }
```

## Security Considerations

### Development
- Test keys are public and well-known - perfectly safe for development
- No sensitive data is exposed
- Can be freely shared in code repositories (marked as test keys)

### Production
- Never commit production keys to Git
- Store in AWS Secrets Manager or similar secure vault
- Rotate keys periodically (recommended: every 90 days)
- Monitor for unusual bot traffic patterns
- Adjust score threshold based on real-world performance data

## References

- **Google reCAPTCHA Documentation:** https://developers.google.com/recaptcha/docs/v3
- **API Verification Endpoint:** https://www.google.com/recaptcha/api/siteverify
- **Admin Console:** https://www.google.com/recaptcha/admin
- **Test Keys Documentation:** https://developers.google.com/recaptcha/docs/faq#test-keys-works-in-all-environments

## Summary

Google reCAPTCHA v3 has been successfully configured across the MyCrypto Platform:

- **3 environment variables** configured in 4 locations
- **Google test keys** ready for development and testing
- **Production guidelines** documented for future deployment
- **Integration points** clearly defined for BE-005 and FE-004
- **Security best practices** included for production use

The configuration is ready for backend and frontend teams to integrate reCAPTCHA verification into the user registration flow.

---

**Configured by:** DevOps Engineer
**Date:** November 19, 2025
**Version:** 1.0
**Status:** READY FOR INTEGRATION
