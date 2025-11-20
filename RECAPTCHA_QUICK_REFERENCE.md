# reCAPTCHA Quick Reference Guide

## Available Credentials (Development)

```
RECAPTCHA_SITE_KEY:       6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI
RECAPTCHA_SECRET_KEY:     6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe
RECAPTCHA_SCORE_THRESHOLD: 0.5
```

**Note:** These are Google's official test keys. Always pass verification. Perfect for development.

## For Backend (BE-005)

### Receive Token
```javascript
const token = req.body.recaptchaToken; // From frontend
```

### Verify with Google
```javascript
const axios = require('axios');

const response = await axios.post(
  'https://www.google.com/recaptcha/api/siteverify',
  null,
  {
    params: {
      secret: process.env.RECAPTCHA_SECRET_KEY,
      response: token
    }
  }
);

const { success, score, action } = response.data;
```

### Check Score
```javascript
const THRESHOLD = parseFloat(process.env.RECAPTCHA_SCORE_THRESHOLD);

if (success && score >= THRESHOLD) {
  // Allow registration
} else {
  // Reject as potential bot
  throw new Error('reCAPTCHA verification failed');
}
```

## For Frontend (FE-004)

### Load Script
```html
<script src="https://www.google.com/recaptcha/api.js"></script>
```

### Execute on Registration Form
```javascript
grecaptcha.ready(() => {
  grecaptcha.execute(
    '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI',
    { action: 'register' }
  ).then(token => {
    // Send to backend
    fetch('/api/register', {
      method: 'POST',
      body: JSON.stringify({
        email: formData.email,
        password: formData.password,
        recaptchaToken: token
      })
    });
  });
});
```

## Score Interpretation

| Score | Meaning |
|-------|---------|
| 0.9+ | Very likely human |
| 0.5-0.9 | Likely human |
| 0.1-0.5 | Suspicious behavior |
| 0.0-0.1 | Very likely bot |

**Threshold = 0.5:** Balanced approach - accepts suspicious but not obviously bot-like behavior.

## Files Updated

- ✅ `/docker-compose.yml` - Environment variables for auth-service
- ✅ `/.env.example` - Documentation and placeholders
- ✅ `/services/auth-service/.env` - Active development configuration
- ✅ `/services/auth-service/.env.example` - Reference documentation

## Documentation

Full details: `/DO-004_RECAPTCHA_CONFIGURATION.md`

## Support

Blocked tasks can now proceed:
- BE-005: User Registration Validation
- FE-004: User Registration UI

All required credentials and documentation are ready.
