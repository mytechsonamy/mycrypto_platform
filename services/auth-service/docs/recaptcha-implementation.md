# reCAPTCHA v3 Implementation Documentation

## Overview
This document describes the implementation of Google reCAPTCHA v3 verification for the auth service registration endpoint to protect against bots.

## Implementation Details

### 1. RecaptchaService (`/src/common/services/recaptcha.service.ts`)
- **Purpose**: Handles reCAPTCHA token verification with Google API
- **Key Features**:
  - Verifies tokens against Google reCAPTCHA API endpoint
  - Configurable score threshold (default: 0.5)
  - Automatic bypass in test environment
  - Comprehensive logging for monitoring
  - Error handling for network issues

### 2. RecaptchaGuard (`/src/common/guards/recaptcha.guard.ts`)
- **Purpose**: NestJS guard that enforces reCAPTCHA verification
- **Key Features**:
  - Extracts token from `X-Recaptcha-Token` header
  - Falls back to body `recaptchaToken` field for backward compatibility
  - Returns 403 Forbidden for failed verification
  - Logs verification attempts with IP and user agent
  - Turkish error messages for user-facing errors

### 3. Integration with Registration Endpoint
- **Endpoint**: `POST /api/v1/auth/register`
- **Guards Applied**: `RecaptchaGuard`, `RateLimiterGuard`
- **Documentation**: Updated OpenAPI spec with header requirement

## Configuration

### Environment Variables
```env
RECAPTCHA_SITE_KEY=6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI    # Test key
RECAPTCHA_SECRET_KEY=6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe  # Test key
RECAPTCHA_SCORE_THRESHOLD=0.5                                   # Minimum score
```

**Note**: These are Google's test keys that always pass verification. Replace with production keys before deployment.

## API Usage

### Request Example
```bash
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -H "X-Recaptcha-Token: YOUR_RECAPTCHA_TOKEN" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!",
    "name": "Test User"
  }'
```

### Response Examples

#### Success (201 Created)
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "email_verified": false,
      "created_at": "2025-11-19T10:30:45.123Z"
    },
    "message": "Kayıt başarılı. Lütfen email adresinize gönderilen doğrulama linkine tıklayınız."
  },
  "meta": {
    "timestamp": "2025-11-19T10:30:45.123Z",
    "request_id": "req_abc123"
  }
}
```

#### reCAPTCHA Failed (403 Forbidden)
```json
{
  "success": false,
  "error": {
    "code": "RECAPTCHA_FAILED",
    "message": "Bot algılandı. Lütfen tekrar deneyin."
  },
  "meta": {
    "timestamp": "2025-11-19T10:30:45.123Z",
    "request_id": "req_abc123"
  }
}
```

## Monitoring and Logging

### Log Format
All reCAPTCHA verification attempts are logged with the following information:
- IP address
- User agent
- Verification result (success/failure)
- Score (for v3)
- Action type
- Hostname
- Error codes (if any)

### Example Log Entry
```json
{
  "timestamp": "2025-11-19T10:30:45.123Z",
  "level": "info",
  "service": "auth-service",
  "class": "RecaptchaGuard",
  "message": "reCAPTCHA verification successful",
  "context": {
    "ip": "192.168.1.1",
    "userAgent": "Mozilla/5.0...",
    "endpoint": "/api/v1/auth/register",
    "score": 0.9,
    "action": "register",
    "hostname": "example.com"
  }
}
```

## Testing

### Unit Tests
- **RecaptchaService Tests**: `/src/common/services/recaptcha.service.spec.ts`
  - Token verification
  - Score validation
  - Error handling
  - Environment-based behavior

- **RecaptchaGuard Tests**: `/src/common/guards/recaptcha.guard.spec.ts`
  - Token extraction
  - Verification flow
  - Error responses
  - Logging behavior

### Test Environment
- reCAPTCHA verification is automatically bypassed when `NODE_ENV=test`
- Returns success with score 1.0 in test environment

### Running Tests
```bash
# Run all tests
npm test

# Run reCAPTCHA tests only
npm test -- --testNamePattern="Recaptcha"

# With coverage
npm test -- --coverage
```

## Frontend Integration

### Required Steps for Frontend
1. Load reCAPTCHA v3 script with site key
2. Execute reCAPTCHA on registration form submission
3. Send token in `X-Recaptcha-Token` header
4. Handle 403 responses appropriately

### Example Frontend Code
```javascript
// Load reCAPTCHA
const script = document.createElement('script');
script.src = `https://www.google.com/recaptcha/api.js?render=${SITE_KEY}`;
document.head.appendChild(script);

// On form submission
grecaptcha.ready(() => {
  grecaptcha.execute(SITE_KEY, { action: 'register' })
    .then(token => {
      // Include token in registration request
      fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Recaptcha-Token': token
        },
        body: JSON.stringify(formData)
      });
    });
});
```

## Security Considerations

1. **Score Threshold**: Default 0.5 is moderate. Adjust based on monitoring:
   - Higher (0.7-0.9): More strict, may block legitimate users
   - Lower (0.3-0.5): More permissive, may allow more bots

2. **Rate Limiting**: reCAPTCHA works alongside existing rate limiting
   - Registration: 5 attempts per hour per IP
   - Both protections must pass for successful registration

3. **Token Validation**: Tokens are single-use and expire quickly
   - Frontend should request new token for each attempt
   - Don't cache or reuse tokens

## Production Checklist

- [ ] Replace test keys with production reCAPTCHA keys
- [ ] Configure appropriate score threshold based on testing
- [ ] Set up monitoring for reCAPTCHA scores
- [ ] Implement alerts for unusual bot activity
- [ ] Test with real users to ensure threshold is appropriate
- [ ] Document score threshold decisions
- [ ] Plan for fallback if Google API is unavailable

## Troubleshooting

### Common Issues

1. **403 Forbidden on all requests**
   - Check if reCAPTCHA keys are configured
   - Verify frontend is sending token in header
   - Check score threshold isn't too high

2. **Timeout errors**
   - Google API may be slow/unavailable
   - Consider implementing circuit breaker pattern
   - May need to increase timeout (currently 5s)

3. **Low scores for legitimate users**
   - Review user behavior patterns
   - Consider lowering threshold
   - Check if site key matches domain

## Future Enhancements

1. **Adaptive Scoring**: Adjust threshold based on attack patterns
2. **Analytics Dashboard**: Track bot detection rates
3. **Fallback Mechanism**: Alternative verification if reCAPTCHA fails
4. **A/B Testing**: Test different thresholds for optimal balance
5. **Cache Verification Results**: For improved performance (with care)

## References

- [Google reCAPTCHA v3 Documentation](https://developers.google.com/recaptcha/docs/v3)
- [NestJS Guards Documentation](https://docs.nestjs.com/guards)
- [Test Keys for Development](https://developers.google.com/recaptcha/docs/faq#id-like-to-run-automated-tests-with-recaptcha.-what-should-i-do)