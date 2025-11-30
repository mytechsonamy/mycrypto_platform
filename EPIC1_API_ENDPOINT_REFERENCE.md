# EPIC 1 API ENDPOINT REFERENCE
## Complete Auth Service API Documentation

**Base URL:** `http://localhost:3001`
**Version:** 1.0
**Last Updated:** 2025-11-30

---

## REGISTRATION & VERIFICATION

### POST /auth/register
**Purpose:** Register a new user account
**Rate Limit:** 5 per hour per IP
**Authentication:** None (public endpoint)
**Headers Required:** X-Recaptcha-Token

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "confirmPassword": "SecurePassword123!",
  "terms": true,
  "kvkk": true
}
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "email_verified": false,
      "created_at": "2025-11-30T10:30:45.123Z"
    },
    "message": "Kayıt başarılı. Lütfen email adresinize gönderilen doğrulama linkine tıklayınız."
  },
  "meta": {
    "timestamp": "2025-11-30T10:30:45.123Z",
    "request_id": "req_abc123def456"
  }
}
```

**Error Responses:**
- **400 Bad Request:** Validation error (password complexity, email format)
- **409 Conflict:** Email already exists
- **429 Too Many Requests:** Rate limit exceeded
- **403 Forbidden:** reCAPTCHA validation failed

**Password Requirements:**
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 digit
- At least 1 special character (!@#$%^&*)

---

### POST /auth/verify-email
**Purpose:** Verify email address with token
**Rate Limit:** 10 per hour
**Authentication:** None
**Headers Required:** None

**Request Body:**
```json
{
  "email": "user@example.com",
  "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Email adresi başarıyla doğrulandı",
  "data": {
    "email": "user@example.com",
    "emailVerified": true
  },
  "meta": {
    "timestamp": "2025-11-30T10:30:45.123Z",
    "request_id": "req_abc123def456"
  }
}
```

**Error Responses:**
- **400 Bad Request:** Invalid or expired token
- **404 Not Found:** Email not found
- **429 Too Many Requests:** Too many verification attempts

**Token Details:**
- Expiry: 24 hours from generation
- Single-use only (invalid after verification)
- Scope: email_verification

---

### POST /auth/resend-verification
**Purpose:** Send a new verification email
**Rate Limit:** 3 per hour per email
**Authentication:** None
**Headers Required:** None

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Doğrulama emaili tekrar gönderildi",
  "meta": {
    "timestamp": "2025-11-30T10:30:45.123Z",
    "request_id": "req_abc123def456"
  }
}
```

**Error Responses:**
- **400 Bad Request:** Email already verified
- **404 Not Found:** Email not found
- **429 Too Many Requests:** Too many resend attempts

---

## AUTHENTICATION

### POST /auth/login
**Purpose:** Authenticate user and issue tokens
**Rate Limit:** 5 per 15 minutes per user
**Authentication:** None
**Account Lockout:** 5 failed attempts = 30-minute lockout

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "email_verified": true
    }
  },
  "meta": {
    "timestamp": "2025-11-30T10:30:45.123Z",
    "request_id": "req_abc123def456"
  }
}
```

**Error Responses:**
- **401 Unauthorized:** Invalid credentials (generic message for both email/password)
- **423 Locked:** Account locked due to failed attempts
- **429 Too Many Requests:** Rate limit exceeded

**Token Details:**
- Access Token:
  - Algorithm: RS256 (asymmetric)
  - Expiry: 15 minutes
  - Claims: user_id, email, exp, iat

- Refresh Token:
  - Algorithm: RS256
  - Expiry: 30 days
  - Claims: user_id, email, exp, iat, type=refresh

---

### POST /auth/refresh-token
**Purpose:** Refresh access token using refresh token
**Rate Limit:** 10 per minute
**Authentication:** Requires valid refresh token
**Headers Required:** Authorization: Bearer {refresh_token}

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "meta": {
    "timestamp": "2025-11-30T10:30:45.123Z",
    "request_id": "req_abc123def456"
  }
}
```

**Error Responses:**
- **401 Unauthorized:** Invalid or expired refresh token
- **429 Too Many Requests:** Rate limit exceeded

---

### POST /auth/logout
**Purpose:** Logout user and invalidate tokens
**Rate Limit:** None
**Authentication:** Requires valid access token
**Headers Required:** Authorization: Bearer {access_token}

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Başarıyla çıkış yapıldı",
  "meta": {
    "timestamp": "2025-11-30T10:30:45.123Z",
    "request_id": "req_abc123def456"
  }
}
```

---

## PASSWORD MANAGEMENT

### POST /auth/password-reset-request
**Purpose:** Request password reset token
**Rate Limit:** 3 per hour per email
**Authentication:** None
**Headers Required:** None

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Şifre sıfırlama emaili gönderildi",
  "meta": {
    "timestamp": "2025-11-30T10:30:45.123Z",
    "request_id": "req_abc123def456"
  }
}
```

**Email Contents:**
- Reset link: `/password-reset?token={jwt_token}`
- Token expiry: 1 hour
- Single-use only

**Error Responses:**
- **404 Not Found:** Email not registered
- **429 Too Many Requests:** Too many reset requests

---

### POST /auth/password-reset-confirm
**Purpose:** Confirm password reset with new password
**Rate Limit:** None
**Authentication:** None (requires valid reset token)
**Headers Required:** None

**Request Body:**
```json
{
  "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "password": "NewSecurePassword123!",
  "confirmPassword": "NewSecurePassword123!"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Şifreniz başarıyla sıfırlandı",
  "meta": {
    "timestamp": "2025-11-30T10:30:45.123Z",
    "request_id": "req_abc123def456"
  }
}
```

**Side Effects:**
- Password hashed with Argon2id
- All existing refresh tokens invalidated
- All sessions terminated
- Confirmation email sent

**Error Responses:**
- **400 Bad Request:** Invalid token or password validation failed
- **401 Unauthorized:** Token expired

**Password Requirements:**
- Same as registration (8+ chars, 1 upper, 1 lower, 1 digit, 1 special)

---

## TWO-FACTOR AUTHENTICATION

### POST /auth/2fa/setup
**Purpose:** Generate TOTP secret and backup codes
**Rate Limit:** None
**Authentication:** Requires valid access token
**Headers Required:** Authorization: Bearer {access_token}

**Request Body:**
```json
{}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAA...",
    "secret": "JBSWY3DPEBLW64TMMQ======",
    "backupCodes": [
      "ABCD1234",
      "EFGH5678",
      "IJKL9012",
      "MNOP3456",
      "QRST7890",
      "UVWX1234",
      "YZAB5678",
      "CDEF9012",
      "GHIJ3456",
      "KLMN7890"
    ]
  },
  "meta": {
    "timestamp": "2025-11-30T10:30:45.123Z",
    "request_id": "req_abc123def456"
  }
}
```

**Setup Instructions:**
1. User scans QR code with authenticator app (Google Authenticator, Authy, etc.)
2. User saves backup codes in secure location
3. User enters first TOTP code to verify setup

**Backup Codes Details:**
- 10 codes generated
- Single-use only
- 8 characters each
- Cannot be reused
- Can be regenerated (new codes issued)

---

### POST /auth/2fa/verify
**Purpose:** Verify TOTP code or backup code
**Rate Limit:** 3 per 30 seconds per user
**Authentication:** Requires valid access token
**Headers Required:** Authorization: Bearer {access_token}

**Request Body:**
```json
{
  "code": "123456"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "enabled": true,
    "remainingCodes": 9,
    "message": "2FA başarıyla doğrulandı"
  },
  "meta": {
    "timestamp": "2025-11-30T10:30:45.123Z",
    "request_id": "req_abc123def456"
  }
}
```

**Code Validation:**
- TOTP: 6-digit code, time window ±30 seconds
- Backup: 8-character code, single-use
- Invalid codes: Returns 401 error

**Error Responses:**
- **400 Bad Request:** Invalid code format
- **401 Unauthorized:** Invalid code
- **429 Too Many Requests:** Too many failed attempts

---

### POST /auth/2fa/disable
**Purpose:** Disable 2FA (requires email confirmation + current TOTP)
**Rate Limit:** None
**Authentication:** Requires valid access token
**Headers Required:** Authorization: Bearer {access_token}

**Request Body:**
```json
{
  "code": "123456",
  "disableToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "2FA devre dışı bırakıldı",
  "meta": {
    "timestamp": "2025-11-30T10:30:45.123Z",
    "request_id": "req_abc123def456"
  }
}
```

**Process:**
1. User requests 2FA disable
2. Confirmation email sent with one-time token
3. User verifies email link and enters current TOTP
4. 2FA disabled, new backup codes issued

---

## KYC (KNOW YOUR CUSTOMER)

### POST /kyc/submit
**Purpose:** Submit KYC Level 1 documents
**Rate Limit:** 3 per day per user
**Authentication:** Requires valid access token
**Headers Required:** Authorization: Bearer {access_token}
**Content-Type:** multipart/form-data

**Request Body (Form Data):**
```
fullName: "John Doe"
tcKimlikNo: "12345678900"
birthDate: "1990-01-15"
phone: "+905301234567"
idFront: <binary JPG/PNG, max 5MB>
idBack: <binary JPG/PNG, max 5MB>
selfie: <binary JPG/PNG, max 5MB>
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "submissionId": "kyc_550e8400-e29b-41d4-a716-446655440000",
    "status": "PENDING",
    "level": "LEVEL_1",
    "submissionDate": "2025-11-30T10:30:45.123Z",
    "estimatedReviewTime": "24-48 saat",
    "message": "KYC başvurunuz alındı. Lütfen bekleyiniz.",
    "limits": {
      "depositLimit": "50000 TRY/day",
      "withdrawalLimit": "50000 TRY/day"
    }
  },
  "meta": {
    "timestamp": "2025-11-30T10:30:45.123Z",
    "request_id": "req_abc123def456"
  }
}
```

**Validation Rules:**
- TC Kimlik: 11-digit, valid checksum algorithm
- Phone: Turkish format (+905XXXXXXXXX or 05XXXXXXXXX)
- Birth Date: Valid date, age >= 18
- File Formats: JPG, PNG only
- File Sizes: Max 5MB each
- Full Name: Non-empty, 2+ characters

**Document Storage:**
- Location: AWS S3 (encrypted at rest)
- Naming: `kyc/{user_id}/{document_type}_{timestamp}.{ext}`
- Retention: 7 years (regulatory requirement)

**Processing:**
- Immediate: Status set to PENDING
- Auto-review: MKS API integration (if available)
- Manual review: Admin dashboard within 24 hours
- Notification: Email on approval/rejection

**Error Responses:**
- **400 Bad Request:** Validation error (format, size, checksum)
- **409 Conflict:** KYC already submitted (resubmit allowed for REJECTED)
- **413 Payload Too Large:** File exceeds 5MB

---

### GET /kyc/status
**Purpose:** Get current KYC status and limits
**Rate Limit:** None
**Authentication:** Requires valid access token
**Headers Required:** Authorization: Bearer {access_token}

**Request Parameters:** None

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "status": "PENDING",
    "level": "LEVEL_1",
    "submissionDate": "2025-11-30T10:30:45.123Z",
    "reviewDate": null,
    "depositLimit": "50000 TRY/day",
    "withdrawalLimit": "50000 TRY/day",
    "tradingLimit": "Unlimited",
    "rejectionReason": null,
    "badge": {
      "status": "PENDING",
      "color": "yellow",
      "label": "Beklemede"
    }
  },
  "meta": {
    "timestamp": "2025-11-30T10:30:45.123Z",
    "request_id": "req_abc123def456"
  }
}
```

**Status Values:**
- **PENDING** (yellow badge): Under review
- **APPROVED** (green badge): Verified, limits active
- **REJECTED** (red badge): Manual resubmission required
- **NOT_STARTED** (gray badge): User hasn't submitted KYC yet

**Rejection Reasons:**
- "Belge okunamıyor" - Document illegible
- "Bilgiler eşleşmiyor" - Information mismatch
- "Fotoğraf kalitesi düşük" - Photo quality too low
- "Belge süresi dolmuş" - Expired document
- "Diğer" - Other (with admin notes)

**Limits:**
- LEVEL_1:
  - Deposit: 50,000 TRY/day
  - Withdrawal: 50,000 TRY/day
  - Trading: Unlimited

- NOT_STARTED:
  - Deposit: 0 TRY
  - Withdrawal: 0 TRY
  - Trading: Not allowed

---

## ERROR RESPONSE FORMAT

All errors follow this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "User-friendly Turkish message",
    "details": [
      {
        "field": "fieldName",
        "message": "Specific field validation message"
      }
    ]
  },
  "meta": {
    "timestamp": "2025-11-30T10:30:45.123Z",
    "request_id": "req_abc123def456"
  }
}
```

### Common Error Codes
- `VALIDATION_ERROR` - Input validation failed
- `INVALID_CREDENTIALS` - Login failed
- `EMAIL_ALREADY_EXISTS` - Email is registered
- `INVALID_TOKEN` - Token is invalid/expired
- `RATE_LIMIT_EXCEEDED` - Rate limit hit
- `ACCOUNT_LOCKED` - Account locked due to failed attempts
- `UNAUTHORIZED` - Missing/invalid authorization
- `RECAPTCHA_FAILED` - reCAPTCHA validation failed

---

## AUTHENTICATION HEADERS

### Bearer Token Format
```
Authorization: Bearer {access_token}
```

### Request Example
```bash
curl -X POST http://localhost:3001/auth/2fa/setup \
  -H "Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## RATE LIMITING HEADERS

When rate-limited, response includes:
```
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1635590000
```

---

## TESTING ENDPOINTS

### Test Authentication
```bash
# Register
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -H "X-Recaptcha-Token: dummy_dev_token" \
  -d '{"email":"test@example.com","password":"SecurePassword123!","confirmPassword":"SecurePassword123!","terms":true,"kvkk":true}'

# Login
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecurePassword123!"}'

# Get KYC Status
curl -X GET http://localhost:3001/kyc/status \
  -H "Authorization: Bearer {access_token}"
```

---

**Documentation Version:** 1.0
**Last Updated:** 2025-11-30
**Status:** TESTED & VERIFIED
