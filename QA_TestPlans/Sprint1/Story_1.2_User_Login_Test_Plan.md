# QA-004: Story 1.2 - User Login with JWT
## Comprehensive Test Plan

**Document Version:** 1.0
**Created:** 2025-11-19
**Feature:** User Login (Email/Password Authentication)
**Story Points:** 5
**Priority:** P0 (Critical)
**Tech Lead Assigned:** QA Engineer

---

## Executive Summary

This document outlines comprehensive test cases for Story 1.2 (User Login with JWT). The feature enables registered users to authenticate via email and password, receiving JWT access and refresh tokens for API access. Testing covers 40 distinct scenarios across functional, security, and edge case categories, ensuring 95% coverage of acceptance criteria.

**Total Test Cases:** 40
**Priority Distribution:** P0: 22 | P1: 12 | P2: 6
**Estimated Execution Time:** 8-10 hours (manual) + 2 hours (automation)

---

## Test Scope

### In Scope
- Login endpoint (`POST /api/v1/auth/login`) behavior
- JWT token generation and validation (access + refresh)
- Account lockout after failed attempts
- Rate limiting (10 requests per 15 minutes)
- Session management
- Error handling (invalid credentials, locked accounts)
- Security vulnerabilities (SQL injection, XSS)
- 2FA requirement validation
- Session logging (IP, device, timestamp)

### Out of Scope
- Password strength validation (covered in Story 1.1)
- Email verification (covered in Story 1.1)
- Password reset flow (covered in Story 1.4)
- 2FA setup/configuration (covered in Story 1.3)
- Account recovery/unlock process
- Third-party OAuth integrations

---

## Acceptance Criteria Mapping

| AC# | Acceptance Criteria | Test Cases | Coverage |
|-----|-------------------|-----------|----------|
| AC1 | User can login with verified email + password | TC-001, TC-002, TC-003 | 100% |
| AC2 | JWT access token issued (15 min expiry) | TC-004, TC-005, TC-006 | 100% |
| AC3 | JWT refresh token issued (30 days expiry) | TC-007, TC-008, TC-009 | 100% |
| AC4 | Failed login shows: "Email veya şifre hatalı" | TC-010, TC-011, TC-012 | 100% |
| AC5 | Account locked after 5 failed attempts (30 min) | TC-013, TC-014, TC-015, TC-016 | 100% |
| AC6 | Lockout notification email sent | TC-017, TC-018 | 100% |
| AC7 | Session logged with IP, device, timestamp | TC-019, TC-020, TC-021 | 100% |
| AC8 | User redirected to dashboard after login | TC-022, TC-023 | 100% |
| SECURITY | SQL injection, XSS, rate limiting | TC-024-TC-040 | 100% |

---

## Test Case Details

### FUNCTIONAL TESTS

---

### TC-001: Happy Path - Login with Valid Credentials

**Feature:** User Login (Story 1.2)
**Type:** E2E / API
**Priority:** P0 (Critical)

**Preconditions:**
- User account exists with email: `test.user@example.com`
- Email is verified (account status: `VERIFIED`)
- Password: `ValidPassword123!`
- Account is not locked
- No failed login attempts in the last 30 minutes

**Steps:**
1. Navigate to login page: `GET https://api.example.com/login`
2. Enter email: `test.user@example.com`
3. Enter password: `ValidPassword123!`
4. Click "Giriş Yap" button
5. System processes request: `POST /api/v1/auth/login`
6. Verify response received within 2 seconds

**Expected Result:**
- HTTP Status: 200 OK
- Response contains `accessToken` (JWT format)
- Response contains `refreshToken`
- `expiresIn`: 1800 (15 minutes)
- `tokenType`: "Bearer"
- User object contains: `userId`, `email`, `kycLevel`, `roles`
- User redirected to dashboard
- Session created in Redis with TTL 30 days
- No error messages displayed

**Sample Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "refresh_token_abc123xyz",
    "expiresIn": 1800,
    "tokenType": "Bearer",
    "user": {
      "userId": "usr_12345",
      "email": "test.user@example.com",
      "kycLevel": "LEVEL_1",
      "roles": ["USER"]
    }
  }
}
```

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach screenshot of dashboard after login]

---

### TC-002: Login with Unverified Email (Should Fail)

**Feature:** User Login (Story 1.2)
**Type:** E2E / API
**Priority:** P0 (Critical)

**Preconditions:**
- User account exists with email: `unverified.user@example.com`
- Email is NOT verified (account status: `PENDING_VERIFICATION`)
- Password: `ValidPassword123!`

**Steps:**
1. POST `https://api.example.com/api/v1/auth/login`
2. Request body:
```json
{
  "email": "unverified.user@example.com",
  "password": "ValidPassword123!",
  "deviceId": "device-uuid-123"
}
```

**Expected Result:**
- HTTP Status: 401 Unauthorized
- Error code: `UNAUTHORIZED`
- Error message: "Email doğrulanmamış. Lütfen email onay linkine tıklayınız."
- No tokens issued
- Session NOT created
- No dashboard access

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested

---

### TC-003: Login with Different Case Email Address

**Feature:** User Login (Story 1.2)
**Type:** API
**Priority:** P1 (High)

**Preconditions:**
- User registered with email: `Test.User@Example.com`
- Password: `ValidPassword123!`
- Email verified and account active

**Steps:**
1. POST `/api/v1/auth/login`
2. Email: `test.user@example.com` (lowercase)
3. Password: `ValidPassword123!`

**Expected Result:**
- HTTP Status: 200 OK
- Login successful (email matching case-insensitive)
- Access token issued
- User can access dashboard

**Rationale:** Email validation should be case-insensitive per RFC 5321

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested

---

### TC-004: JWT Access Token Valid for 15 Minutes

**Feature:** JWT Token Expiry (Story 1.2)
**Type:** API
**Priority:** P0 (Critical)

**Preconditions:**
- User logged in successfully
- Access token received: `eyJhbGc...`
- Current time: T+0

**Steps:**
1. Decode access token and verify `exp` claim
2. Calculate: `expiresAt = iat + 900` (900 seconds = 15 minutes)
3. Verify token can be used in requests at T+0, T+5min, T+14min59sec
4. Verify token is rejected at T+15min01sec

**Expected Result:**
- Token expires exactly 900 seconds (15 minutes) after issuance
- `expiresIn` field in response: 1800 (milliseconds? or seconds?)
- Token payload (decoded) shows:
  - `exp`: timestamp 15 minutes in future
  - `iat`: current timestamp
  - `userId`: matching logged-in user
- After expiry: 401 Unauthorized when using token

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested

---

### TC-005: JWT Refresh Token Valid for 30 Days

**Feature:** JWT Token Expiry (Story 1.2)
**Type:** API
**Priority:** P0 (Critical)

**Preconditions:**
- User logged in successfully
- Refresh token received
- Current time: T+0

**Steps:**
1. Decode refresh token and verify `exp` claim
2. Calculate: `expiresAt = iat + 2592000` (30 days in seconds)
3. Verify token is valid at T+0, T+15days, T+29days23hours
4. Verify token rejected at T+30days01min

**Expected Result:**
- Refresh token expires exactly 2,592,000 seconds (30 days) after issuance
- Token claims include:
  - `exp`: 30 days from now
  - `iat`: current timestamp
  - `type`: "refresh"
  - `userId`: matching user
- Token stored in Redis with TTL 30 days
- After expiry, refresh request fails with 401

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested

---

### TC-006: Token Refresh - Generate New Access Token

**Feature:** Token Refresh Endpoint (Story 1.2)
**Type:** API
**Priority:** P0 (Critical)

**Preconditions:**
- User logged in successfully
- Access token expired (or will expire)
- Valid refresh token: `refresh_token_xyz`
- Refresh token not expired

**Steps:**
1. POST `/api/v1/auth/refresh`
2. Request body:
```json
{
  "refreshToken": "refresh_token_xyz"
}
```
3. Capture response
4. Decode new access token

**Expected Result:**
- HTTP Status: 200 OK
- New access token issued
- New token valid for 15 minutes
- Old access token becomes invalid
- Refresh token remains valid (can be reused)
- Response contains:
  - `accessToken`: (new JWT)
  - `expiresIn`: 1800
  - `tokenType`: "Bearer"

**Sample Request:**
```bash
curl -X POST https://api.example.com/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "refresh_token_xyz"
  }'
```

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested

---

### TC-007: Refresh Token Expired - Should Fail

**Feature:** Token Refresh (Story 1.2)
**Type:** API
**Priority:** P0 (Critical)

**Preconditions:**
- User previously logged in (30+ days ago)
- Refresh token has expired
- Token in Redis deleted (TTL expired)

**Steps:**
1. POST `/api/v1/auth/refresh`
2. Send expired refresh token

**Expected Result:**
- HTTP Status: 401 Unauthorized
- Error code: `INVALID_REFRESH_TOKEN`
- Error message: "Oturum sonlanmış. Lütfen tekrar giriş yapınız."
- No new token issued
- User must re-login

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested

---

### TC-008: Refresh Token Blacklist - Already Used

**Feature:** Token Refresh Security (Story 1.2)
**Type:** API
**Priority:** P0 (Critical)

**Preconditions:**
- User logged in, has refresh token
- Refresh token already used once to generate new access token
- Token stored in Redis blacklist: `blacklist:refresh_token_xyz`

**Steps:**
1. POST `/api/v1/auth/refresh`
2. Send same refresh token again (attempting token reuse)

**Expected Result:**
- HTTP Status: 401 Unauthorized
- Error code: `TOKEN_ALREADY_USED`
- Error message: "Bu token daha önce kullanılmış."
- Possible security flag: Mark account for suspicious activity
- User logged out (clear all sessions)

**Rationale:** Prevent refresh token replay attacks

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested

---

### TC-009: Remember Me Functionality (Extended Token Lifetime)

**Feature:** Session Persistence (Story 1.2)
**Type:** E2E / API
**Priority:** P1 (High)

**Preconditions:**
- User wants to stay logged in for longer period

**Steps:**
1. Login with "Remember Me" checkbox checked
2. Capture access token lifetime
3. Compare with standard login (without remember me)

**Expected Result:**
- If "Remember Me" enabled:
  - Access token lifetime: 7 days (instead of 15 min)
  - OR browser stores refresh token in secure cookie (HttpOnly)
  - OR extended session timeout
- Session persists across browser restart
- User cookie/token stored securely

**Note:** Verify implementation details with backend team

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested

---

### TC-010: Invalid Email Format - Should Fail

**Feature:** Login Validation (Story 1.2)
**Type:** API
**Priority:** P1 (High)

**Preconditions:**
- None

**Steps:**
1. POST `/api/v1/auth/login`
2. Email: `notanemail` (no @ symbol)
3. Password: `ValidPassword123!`

**Expected Result:**
- HTTP Status: 400 Bad Request
- Error code: `INVALID_REQUEST`
- Error message: "Geçersiz email formatı"
- No token issued

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested

---

### TC-011: Incorrect Password - Generic Error Message

**Feature:** Login Error Handling (Story 1.2)
**Type:** API
**Priority:** P0 (Critical)

**Preconditions:**
- User exists: `test.user@example.com`
- Correct password: `CorrectPassword123!`
- User entering: `WrongPassword456!`

**Steps:**
1. POST `/api/v1/auth/login`
2. Email: `test.user@example.com`
3. Password: `WrongPassword456!`

**Expected Result:**
- HTTP Status: 401 Unauthorized
- Error message: "Email veya şifre hatalı" (generic, no enumeration)
- Does NOT reveal whether email exists in system
- Failed attempt counter incremented
- No tokens issued

**Security Rationale:** Generic error prevents user enumeration attacks

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested

---

### TC-012: Non-Existent Email - Generic Error Message

**Feature:** Login Error Handling (Story 1.2)
**Type:** API
**Priority:** P0 (Critical)

**Preconditions:**
- Email does NOT exist in system

**Steps:**
1. POST `/api/v1/auth/login`
2. Email: `nonexistent@example.com`
3. Password: `SomePassword123!`

**Expected Result:**
- HTTP Status: 401 Unauthorized
- Error message: "Email veya şifre hatalı" (same as wrong password)
- Does NOT reveal "email not found"
- Response time similar to valid email (timing attack prevention)

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested

---

### TC-013: Fifth Failed Login Attempt - Account Locked

**Feature:** Account Lockout (Story 1.2)
**Type:** API
**Priority:** P0 (Critical)

**Preconditions:**
- Fresh user account with email: `locked.user@example.com`
- Account not previously locked
- No failed attempts in last 30 minutes

**Steps:**
1. Attempt 1: POST `/api/v1/auth/login` with wrong password
   - Expected: 401, counter = 1
2. Attempt 2: POST `/api/v1/auth/login` with wrong password
   - Expected: 401, counter = 2
3. Attempt 3: POST `/api/v1/auth/login` with wrong password
   - Expected: 401, counter = 3
4. Attempt 4: POST `/api/v1/auth/login` with wrong password
   - Expected: 401, counter = 4
5. Attempt 5: POST `/api/v1/auth/login` with wrong password
   - Expected: 401, counter = 5, account locked

**Expected Result - Attempt 5:**
- HTTP Status: 429 Too Many Attempts (or 403 Forbidden)
- Error code: `ACCOUNT_LOCKED`
- Error message: "Hesabınız 30 dakika boyunca kilitlenmiştir. Lütfen daha sonra deneyiniz."
- Account status in database: `LOCKED` (expires after 30 minutes)
- Lock time stored: current timestamp
- Lock expiry: current timestamp + 1800 seconds (30 minutes)

**Database State:**
- Table: `users`
- Update: `SET locked_until = NOW() + INTERVAL '30 minutes', failed_login_attempts = 5`

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested

---

### TC-014: Login Attempt with Locked Account

**Feature:** Account Lockout (Story 1.2)
**Type:** API
**Priority:** P0 (Critical)

**Preconditions:**
- Account is currently locked (from TC-013)
- Lock expires in 25 minutes

**Steps:**
1. POST `/api/v1/auth/login` with correct password
2. Email: `locked.user@example.com`
3. Password: `CorrectPassword123!`

**Expected Result:**
- HTTP Status: 403 Forbidden
- Error code: `ACCOUNT_LOCKED`
- Error message: "Hesabınız kilitlenmiştir. Lütfen 25 dakika sonra tekrar deneyiniz."
- Message includes remaining lock time (calculated)
- No tokens issued
- Failed attempt counter NOT incremented

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested

---

### TC-015: Account Auto-Unlock After 30 Minutes

**Feature:** Account Lockout (Story 1.2)
**Type:** API
**Priority:** P1 (High)

**Preconditions:**
- Account was locked 30 minutes ago (from TC-013)
- Current time: T+30min

**Steps:**
1. Fast-forward system time (in test environment) or wait 30 minutes
2. POST `/api/v1/auth/login` with correct password
3. Email: `locked.user@example.com`
4. Password: `CorrectPassword123!`

**Expected Result:**
- HTTP Status: 200 OK
- Access token issued
- Login successful
- Account auto-unlocked
- Database: `locked_until = NULL`, `failed_login_attempts = 0`

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested

---

### TC-016: Account Unlock via Support - Admin Action

**Feature:** Account Lockout (Story 1.2)
**Type:** API
**Priority:** P1 (High)

**Preconditions:**
- Account locked
- Admin action available: Unlock account

**Steps:**
1. Admin calls API: `POST /api/v1/admin/users/{userId}/unlock`
2. Verify account status changes to `ACTIVE`

**Expected Result:**
- Account immediately unlocked
- User can login with correct password
- Failed attempt counter reset to 0
- Unlock action logged with admin ID and timestamp

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested

---

### TC-017: Lockout Notification Email Sent

**Feature:** Account Lockout (Story 1.2)
**Type:** Integration
**Priority:** P1 (High)

**Preconditions:**
- Account locked (from TC-013)
- Email service available

**Steps:**
1. Trigger 5 failed login attempts (from TC-013)
2. Check email inbox for notification
3. Verify email content

**Expected Result:**
- Email sent to user address: `locked.user@example.com`
- Email subject: "Hesabınız Kilitlenmiştir"
- Email body includes:
  - "Hesabınız 5 başarısız girişten sonra güvenlik amacıyla kilitlenmiştir."
  - Unlock time: "30 dakika"
  - Contact link: support@exchange.com
- Email sent within 1 minute of lockout
- Email tracked in audit log

**Email Template Verification:**
- [ ] Branding (logo, colors)
- [ ] Turkish language
- [ ] Clear unlock time
- [ ] Security advice
- [ ] Support contact info

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested

---

### TC-018: Lockout Email Resend After Unlock

**Feature:** Account Lockout (Story 1.2)
**Type:** Integration
**Priority:** P2 (Medium)

**Preconditions:**
- Account was locked and then unlocked
- User successful login after unlock

**Steps:**
1. Check email for unlock confirmation

**Expected Result:**
- Email sent with subject: "Hesabınız Açılmıştır"
- Email confirms account is now active
- Includes login link

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested

---

### TC-019: Session Logged with IP Address

**Feature:** Session Management (Story 1.2)
**Type:** Integration
**Priority:** P1 (High)

**Preconditions:**
- User logs in from IP: `192.168.1.100`
- Session created in Redis

**Steps:**
1. Login successfully
2. Query database table: `user_sessions` or Redis key
3. Verify session record contains IP address

**Expected Result:**
- Session stored with:
  - `userId`: `usr_12345`
  - `ip_address`: `192.168.1.100` (client IP from `X-Forwarded-For` or socket)
  - `created_at`: login timestamp
  - `expires_at`: login timestamp + 30 days
- Geo-IP lookup performed (optional): Country, City
- Session visible in user dashboard: "Aktif Oturumlar"

**Database Query:**
```sql
SELECT user_id, ip_address, device_info, created_at, expires_at
FROM user_sessions
WHERE user_id = 'usr_12345'
ORDER BY created_at DESC;
```

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested

---

### TC-020: Session Logged with Device Information

**Feature:** Session Management (Story 1.2)
**Type:** API
**Priority:** P1 (High)

**Preconditions:**
- User logs in from device: iPhone 12 Pro / iOS 17
- Device ID provided: `device-uuid-abc123`

**Steps:**
1. POST `/api/v1/auth/login` with `deviceId`: `device-uuid-abc123`
2. Login successful
3. Query session table

**Expected Result:**
- Session stored with device information:
  - `device_id`: `device-uuid-abc123`
  - `device_name`: User-provided name (optional)
  - `device_type`: `MOBILE` / `WEB` / `DESKTOP`
  - `browser_name`: Extracted from User-Agent header
  - `os_name`: iOS, Android, Windows, macOS
  - `user_agent`: Full User-Agent string
- User can view active sessions in settings

**Sample Session Record:**
```json
{
  "sessionId": "sess_xyz",
  "userId": "usr_12345",
  "deviceId": "device-uuid-abc123",
  "deviceType": "MOBILE",
  "osName": "iOS",
  "browserName": "Safari",
  "ipAddress": "192.168.1.100",
  "geolocation": {
    "country": "TR",
    "city": "Istanbul"
  },
  "createdAt": "2025-11-19T10:30:00Z",
  "expiresAt": "2025-12-19T10:30:00Z",
  "lastActivity": "2025-11-19T10:35:00Z"
}
```

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested

---

### TC-021: Session Timestamp Accuracy

**Feature:** Session Management (Story 1.2)
**Type:** API
**Priority:** P2 (Medium)

**Preconditions:**
- Server time synchronized (NTP)
- User logs in at precise time

**Steps:**
1. Note current server time: `2025-11-19T10:30:00.123Z`
2. POST `/api/v1/auth/login`
3. Query session creation time
4. Compare with login timestamp

**Expected Result:**
- Session `created_at` within 500ms of login time
- `expires_at` = `created_at` + 30 days
- Timestamp format: ISO 8601 with milliseconds
- All timestamps in UTC (Z timezone)

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested

---

### TC-022: User Redirected to Dashboard After Login (Web UI)

**Feature:** Login Flow (Story 1.2)
**Type:** E2E
**Priority:** P1 (High)

**Preconditions:**
- User navigates to login page: `https://app.example.com/login`
- User verified and account active

**Steps:**
1. Enter email: `test.user@example.com`
2. Enter password: `ValidPassword123!`
3. Click "Giriş Yap" button
4. Wait for response
5. Verify current URL

**Expected Result:**
- Page redirects to dashboard: `https://app.example.com/dashboard`
- Dashboard displays welcome message: "Hoşgeldiniz, Test User!"
- User balance widgets visible
- Navigation menu shows: Dashboard, Piyasalar, Emirler, Cüzdan, Ayarlar
- No login form visible
- Access token stored in secure cookie or localStorage

**UI Expectations:**
- [ ] URL changed to `/dashboard`
- [ ] Page title changed to "Pano"
- [ ] Welcome greeting displayed
- [ ] User balance visible
- [ ] Navigation fully functional

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach screenshot of dashboard after login]

---

### TC-023: User Redirected to Original Page After Login (Return URL)

**Feature:** Login Flow (Story 1.2)
**Type:** E2E
**Priority:** P1 (High)

**Preconditions:**
- User tries to access protected page: `/trading/BTCTRY`
- Gets redirected to login with return URL: `/login?return=/trading/BTCTRY`

**Steps:**
1. User on page: `https://app.example.com/trading/BTCTRY`
2. Session expires / user not authenticated
3. Redirected to: `https://app.example.com/login?return=/trading/BTCTRY`
4. User logs in with valid credentials
5. Verify final destination

**Expected Result:**
- After successful login, redirected to original page: `/trading/BTCTRY`
- Return parameter properly decoded and safe (no open redirects)
- User can immediately see trading interface

**Security Check:**
- [ ] Return URL must be same-origin (whitelist check)
- [ ] Prevent redirecting to external URLs
- [ ] No XSS via return parameter

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested

---

## SECURITY TESTS

### TC-024: SQL Injection in Email Field

**Feature:** Security - Input Validation (Story 1.2)
**Type:** API
**Priority:** P0 (Critical)

**Preconditions:**
- None

**Steps:**
1. POST `/api/v1/auth/login`
2. Email field: `' OR '1'='1`
3. Password: `anything`

**Expected Result:**
- HTTP Status: 400 Bad Request (invalid email format)
- No database error messages exposed
- No records returned
- No authentication bypass
- Login attempt logged as suspicious

**Database Should NOT Execute:**
```sql
SELECT * FROM users WHERE email = '' OR '1'='1'
```

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested

---

### TC-025: SQL Injection in Password Field

**Feature:** Security - Input Validation (Story 1.2)
**Type:** API
**Priority:** P0 (Critical)

**Preconditions:**
- None

**Steps:**
1. POST `/api/v1/auth/login`
2. Email: `test@example.com`
3. Password: `" OR "1"="1`

**Expected Result:**
- HTTP Status: 401 Unauthorized
- Generic error: "Email veya şifre hatalı"
- No database executed directly (parameterized queries)
- Attempted password hashed before comparison

**Verification:**
- Confirm application uses parameterized queries (prepared statements)
- No string concatenation in database queries
- Bcrypt/Argon2 used for password comparison (safe against timing attacks)

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested

---

### TC-026: XSS Payload in Email Field

**Feature:** Security - XSS Prevention (Story 1.2)
**Type:** API
**Priority:** P0 (Critical)

**Preconditions:**
- None

**Steps:**
1. POST `/api/v1/auth/login`
2. Email: `<script>alert('XSS')</script>@example.com`
3. Password: `ValidPassword123!`

**Expected Result:**
- HTTP Status: 400 Bad Request
- Invalid email format error
- No script executed
- No XSS payload reflected in response
- Response properly sanitized (Content-Type: application/json)

**Response Validation:**
- [ ] `Content-Type: application/json; charset=utf-8`
- [ ] No HTML tags in response
- [ ] No unescaped special characters
- [ ] CSP header present: `Content-Security-Policy: default-src 'self'`

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested

---

### TC-027: XSS Payload in Password Field

**Feature:** Security - XSS Prevention (Story 1.2)
**Type:** API
**Priority:** P0 (Critical)

**Preconditions:**
- None

**Steps:**
1. POST `/api/v1/auth/login`
2. Email: `test@example.com`
3. Password: `<img src=x onerror="alert('XSS')">`

**Expected Result:**
- HTTP Status: 401 Unauthorized
- No script execution
- No XSS payload in response
- Password treated as string literal (not executed)

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested

---

### TC-028: Rate Limiting - 10 Requests per 15 Minutes

**Feature:** Rate Limiting (Story 1.2)
**Type:** API
**Priority:** P0 (Critical)

**Preconditions:**
- Fresh IP address: `203.0.113.100`
- No prior requests in last 15 minutes

**Steps:**
1. Send login request (valid credentials) 10 times
2. Each request from same IP
3. Capture timestamps of each request
4. Send 11th request

**Expected Result - Requests 1-10:**
- HTTP Status: 200 OK (or 401 if invalid)
- Headers include rate limit info:
  - `X-RateLimit-Limit: 20`
  - `X-RateLimit-Remaining: 19, 18, 17...1, 0`
  - `X-RateLimit-Reset: 1700392800` (15 minutes from first request)

**Expected Result - Request 11:**
- HTTP Status: 429 Too Many Requests
- Error message: "Çok fazla deneme. Lütfen 15 dakika sonra tekrar deneyiniz."
- Response headers:
  - `X-RateLimit-Remaining: 0`
  - `X-RateLimit-Reset: 1700392800` (same as before)
  - `Retry-After: 891` (seconds until reset)

**Rate Limit Storage:**
- Stored in Redis: `rate_limit:auth:login:{ip_address}`
- TTL: 15 minutes
- Increment counter on each request

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested

---

### TC-029: Rate Limiting Reset After 15 Minutes

**Feature:** Rate Limiting (Story 1.2)
**Type:** API
**Priority:** P1 (High)

**Preconditions:**
- IP blocked from rate limit (from TC-028)
- Current time: T+15 minutes

**Steps:**
1. Wait 15 minutes (or fast-forward in test environment)
2. Send login request again

**Expected Result:**
- HTTP Status: 200 OK (or 401 based on credentials)
- Rate limit counter reset
- `X-RateLimit-Remaining: 19` (fresh counter)

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested

---

### TC-030: Rate Limiting Per IP Address

**Feature:** Rate Limiting (Story 1.2)
**Type:** API
**Priority:** P1 (High)

**Preconditions:**
- IP A: `203.0.113.100`
- IP B: `198.51.100.200`

**Steps:**
1. IP A sends 10 login requests → Reaching limit
2. IP B sends 1 login request

**Expected Result:**
- IP A: Rate limited on 11th request
- IP B: 11th request succeeds (different IP, separate rate limit bucket)
- Rate limit keys in Redis:
  - `rate_limit:auth:login:203.0.113.100` (10 requests)
  - `rate_limit:auth:login:198.51.100.200` (1 request)

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested

---

### TC-031: Session Hijacking Prevention - Immutable Session Token

**Feature:** Security - Session Management (Story 1.2)
**Type:** API
**Priority:** P0 (Critical)

**Preconditions:**
- User A logs in from IP: `192.168.1.100`
- Obtains access token: `token_abc123`
- User B (attacker) obtains this token

**Steps:**
1. User B attempts API request from different IP: `192.168.1.101`
2. Request includes: `Authorization: Bearer token_abc123`
3. Verify if request is allowed/blocked

**Expected Result - Strict Binding:**
- HTTP Status: 401 Unauthorized
- Error: "Token için oturum şüpheli"
- IP address bound to token, mismatch detected
- Suspicious activity logged
- All sessions for User A terminated
- User A notified via email

**OR Expected - Lenient Binding:**
- Request allowed but:
- Suspicious activity flag in audit log
- 2FA challenge triggered
- Device fingerprint checked

**Recommendation:** Strict binding preferred for security

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested

---

### TC-032: Brute Force Attack Prevention - Distributed

**Feature:** Security - Account Protection (Story 1.2)
**Type:** API
**Priority:** P0 (Critical)

**Preconditions:**
- Target account: `test@example.com`
- Attacker uses distributed IPs

**Steps:**
1. Attacker sends failed login attempts from multiple IPs
2. Each IP: `203.0.113.100`, `203.0.113.101`, ... `203.0.113.110`
3. Total: 20+ failed attempts

**Expected Result:**
- System detects brute force pattern (not just per-IP)
- Account gets locked despite distributed attack
- Possible mechanisms:
  - Username-based rate limit: `rate_limit:auth:login:test@example.com`
  - Failed attempt counter per user
  - Geographic anomaly detection
- Account locked: "Şüpheli giriş faaliyeti nedeniyle hesabınız kilitlenmiştir."
- User must verify via email confirmation

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested

---

### TC-033: JWT Token Signature Verification

**Feature:** Security - Token Validation (Story 1.2)
**Type:** API
**Priority:** P0 (Critical)

**Preconditions:**
- Valid access token received from login
- Attacker modifies token payload

**Steps:**
1. Obtain valid token: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c3JfMTIzNDUifQ.signature_here`
2. Modify payload: `userId` changed from `usr_12345` to `usr_99999` (admin)
3. Keep original signature
4. Use modified token in API request

**Expected Result:**
- HTTP Status: 401 Unauthorized
- Error: "Geçersiz token"
- Token signature verification fails
- Request rejected
- Token marked as invalid
- Security event logged

**JWT Validation Checklist:**
- [ ] Signature verified with correct secret
- [ ] Signature algorithm matches expected (HS256, RS256, etc.)
- [ ] Token not expired
- [ ] Token not in blacklist
- [ ] Token type matches (access vs refresh)
- [ ] UserId matches session

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested

---

### TC-034: HTTPS Required - HTTP Request Blocked

**Feature:** Security - Transport Layer (Story 1.2)
**Type:** API
**Priority:** P0 (Critical)

**Preconditions:**
- API endpoint accessible over HTTP (test only)

**Steps:**
1. POST `http://api.example.com/api/v1/auth/login` (unencrypted)
2. Send valid credentials

**Expected Result:**
- HTTP Status: 301/302 Redirect to HTTPS
- OR HTTP Status: 400 Bad Request
- OR Connection refused
- Request NOT processed over HTTP
- Credentials never transmitted unencrypted
- HSTS header present: `Strict-Transport-Security: max-age=31536000; includeSubDomains`

**Server Configuration:**
- [ ] HTTPS only (no HTTP fallback)
- [ ] TLS 1.2+ required
- [ ] Valid SSL certificate
- [ ] Certificate chains verified
- [ ] Cipher suites: modern, no weak ciphers

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested

---

### TC-035: CORS Headers - Same-Origin Verification

**Feature:** Security - CORS (Story 1.2)
**Type:** API
**Priority:** P1 (High)

**Preconditions:**
- Frontend: `https://app.example.com`
- Backend API: `https://api.example.com`
- Attacker site: `https://attacker.com`

**Steps:**
1. From `https://attacker.com`, send login request via AJAX
2. Browser enforces CORS, request includes `Origin: https://attacker.com`

**Expected Result:**
- Request blocked by CORS policy
- No `Access-Control-Allow-Origin` header in response
- OR `Access-Control-Allow-Origin` header: `https://app.example.com` (only)
- Browser console error: "CORS policy: The value of the 'Access-Control-Allow-Origin' header..."
- Credentials NOT sent cross-domain

**CORS Configuration Validation:**
- [ ] `Access-Control-Allow-Origin` whitelist checked
- [ ] No `Access-Control-Allow-Origin: *` with credentials
- [ ] `Access-Control-Allow-Credentials: true` only for trusted origins
- [ ] Preflight requests (OPTIONS) handled correctly

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested

---

### TC-036: Missing Security Headers

**Feature:** Security - HTTP Headers (Story 1.2)
**Type:** API
**Priority:** P1 (High)

**Preconditions:**
- Login request submitted

**Steps:**
1. POST `/api/v1/auth/login`
2. Capture response headers
3. Verify presence of security headers

**Expected Result:**
- Response includes all security headers:
  - [ ] `X-Content-Type-Options: nosniff` (prevents MIME sniffing)
  - [ ] `X-Frame-Options: DENY` (prevents clickjacking)
  - [ ] `X-XSS-Protection: 1; mode=block` (browser XSS filter)
  - [ ] `Content-Security-Policy: default-src 'self'` (CSP policy)
  - [ ] `Strict-Transport-Security: max-age=31536000; includeSubDomains` (HSTS)
  - [ ] `Referrer-Policy: strict-origin-when-cross-origin`
  - [ ] `Permissions-Policy: geolocation=(), microphone=()` (feature policy)

**Response Headers (Sample):**
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'; script-src 'self' https://cdn.example.com
Strict-Transport-Security: max-age=31536000; includeSubDomains
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=()
```

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested

---

### TC-037: No Sensitive Data in Logs/Responses

**Feature:** Security - Data Leakage (Story 1.2)
**Type:** API
**Priority:** P0 (Critical)

**Preconditions:**
- User logs in
- Request/response captured in logs

**Steps:**
1. Login with password: `ValidPassword123!`
2. Check application logs: `/var/log/auth-service/app.log`
3. Check browser dev console
4. Check API response body

**Expected Result:**
- Logs contain NO passwords
- Logs contain NO access tokens
- Logs contain NO refresh tokens
- Error messages generic (no enumeration)
- Debug mode disabled in production

**Log Entry Examples (Safe):**
```
[2025-11-19 10:30:00] INFO: Login attempt for user: test@example.com from IP: 192.168.1.100
[2025-11-19 10:30:01] INFO: Login successful for userId: usr_12345
[2025-11-19 10:30:02] INFO: Session created: sess_xyz
```

**Log Entry Examples (UNSAFE - NEVER):**
```
[2025-11-19 10:30:00] INFO: Login with email: test@example.com, password: ValidPassword123!
[2025-11-19 10:30:01] INFO: Generated token: eyJhbGc...
[DEBUG] Token secret: super_secret_key_123
```

**Sensitive Fields Audit:**
- [ ] Passwords never logged (plain text)
- [ ] Tokens never logged
- [ ] API secrets never logged
- [ ] Credit card data never logged (if applicable)
- [ ] Personal identifiable info (PII) minimized in logs
- [ ] Encryption in logs for PII if necessary

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested

---

## EDGE CASE TESTS

### TC-038: Very Long Email Address (Buffer Overflow / Injection)

**Feature:** Input Validation - Edge Cases (Story 1.2)
**Type:** API
**Priority:** P2 (Medium)

**Preconditions:**
- None

**Steps:**
1. POST `/api/v1/auth/login`
2. Email: 10,000+ character string
3. Password: `ValidPassword123!`

**Expected Result:**
- HTTP Status: 400 Bad Request
- Error: "Email çok uzun. Maksimum 254 karakter izinlidir."
- Request rejected at input validation layer
- No buffer overflow
- Application performance not affected

**Input Validation Rules:**
- [ ] Email max length: 254 characters (RFC 5321)
- [ ] Password max length: 512 characters
- [ ] Request body max size: 1MB
- [ ] Field length validation at API gateway

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested

---

### TC-039: Special Characters in Email - Turkish Characters

**Feature:** Input Validation - Internationalization (Story 1.2)
**Type:** API
**Priority:** P1 (High)

**Preconditions:**
- User registered with email: `test+label@example.com`
- Turkish characters might appear in subdomains

**Steps:**
1. Test email: `user+test@example.com` (plus sign)
2. Test email: `user.name@example.com` (dot)
3. Test email: `user@örnek.tr` (Turkish domain - if supported)

**Expected Result:**
- Plus/dot/dash recognized as valid email characters
- Email validation follows RFC 5321 standards
- Login succeeds with correct credentials
- Rejection only for invalid formats

**Email Validation RFC 5321:**
- [ ] Allows: alphanumeric, dots, hyphens, underscores, plus sign
- [ ] Rejects: spaces, commas, special chars (except those listed)
- [ ] Local part max: 64 chars
- [ ] Domain max: 255 chars

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested

---

### TC-040: Rapid-Fire Login Attempts (DoS Prevention)

**Feature:** Security - DoS Prevention (Story 1.2)
**Type:** API
**Priority:** P1 (High)

**Preconditions:**
- Attacker sends 100 login requests in 1 second
- From single IP: `203.0.113.100`

**Steps:**
1. Send concurrent login requests: 100 requests in 1 second
2. Monitor server response time
3. Check for degraded performance

**Expected Result:**
- Requests queued/throttled gracefully
- Response time acceptable (< 5 seconds)
- Server does NOT crash
- Rate limit kicks in and blocks further requests
- Possible rate limit response: `429 Too Many Requests`

**Performance SLA:**
- [ ] P99 latency < 500ms under normal load
- [ ] P99 latency < 5s under attack
- [ ] Server maintains stability
- [ ] No memory leaks
- [ ] No connections dropped

**Monitoring:**
- [ ] CPU usage monitored
- [ ] Memory usage monitored
- [ ] Connection count monitored
- [ ] Queue depth monitored

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested

---

## INTEGRATION TESTS

### TC-041: Multiple Concurrent Logins - Same User

**Feature:** Concurrent Sessions (Story 1.2)
**Type:** Integration
**Priority:** P1 (High)

**Preconditions:**
- Single user account: `test@example.com`
- Logged in from Device 1 (browser on laptop)
- Now logging in from Device 2 (mobile app)

**Steps:**
1. Device 1: Login successful, session created
2. Device 2: Login successful, new session created
3. Query session table for user

**Expected Result:**
- Multiple sessions allowed (per AC: "multiple simultaneous sessions")
- Each session has:
  - Unique session ID
  - Unique device ID
  - Different IP addresses (if different locations)
  - Separate tokens issued
- Both sessions active simultaneously
- Both devices can make authenticated requests
- User can view both active sessions in dashboard

**Session Table:**
```sql
SELECT session_id, device_id, ip_address, created_at FROM user_sessions
WHERE user_id = 'usr_12345'
ORDER BY created_at DESC;
```

**Expected Output:**
```
session_id    | device_id      | ip_address     | created_at
sess_device2  | device_uuid_2  | 192.168.1.101  | 2025-11-19 10:35:00
sess_device1  | device_uuid_1  | 192.168.1.100  | 2025-11-19 10:30:00
```

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested

---

### TC-042: Single Session Only - Per Device (Option A)

**Feature:** Session Management Policy (Story 1.2)
**Type:** Integration
**Priority:** P1 (High)

**Preconditions:**
- Application policy: One session per device (if implemented)
- User logged in on Device 1

**Steps:**
1. Device 1: Login and logout, then login again
2. Device 2: Attempt login with same account
3. Verify Device 1 session status

**Expected Result (if policy enforced):**
- New Device 2 login invalidates Device 1 session
- Device 1 receives notification: "Başka bir cihazdan giriş yapıldı"
- OR both sessions allowed (see TC-041)
- Depends on app design (verify with product owner)

**Note:** Test plan assumes multiple sessions (more user-friendly)

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested

---

### TC-043: Logout Invalidates All Sessions (Option B)

**Feature:** Logout Behavior (Story 1.2)
**Type:** Integration
**Priority:** P1 (High)

**Preconditions:**
- User has 3 active sessions (Device 1, 2, 3)
- User clicks logout on Device 1

**Steps:**
1. Device 1: POST `/api/v1/auth/logout`
2. Query active sessions for user
3. Verify session status on Device 2 and Device 3

**Expected Result - Logout Current Session Only:**
- Session on Device 1 invalidated
- Sessions on Device 2, Device 3 remain active
- User can continue using app on other devices
- Device 1 redirected to login page

**OR Expected - Logout All Sessions:**
- All sessions invalidated
- User logged out everywhere
- All devices must re-login
- Depends on implementation/user preference

**Logout Request:**
```json
POST /api/v1/auth/logout
Content-Type: application/json
Authorization: Bearer {accessToken}

{
  "logoutScope": "CURRENT_SESSION" // or "ALL_SESSIONS"
}
```

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested

---

## Test Coverage Matrix

| Acceptance Criteria | Coverage % | Test Cases |
|--------------------|-----------|-----------|
| Login with verified email | 100% | TC-001, TC-002, TC-003 |
| JWT access token (15 min) | 100% | TC-004, TC-005, TC-006 |
| JWT refresh token (30 days) | 100% | TC-007, TC-008, TC-009 |
| Error message (generic) | 100% | TC-010, TC-011, TC-012 |
| Account lockout (5 attempts) | 100% | TC-013, TC-014, TC-015, TC-016 |
| Lockout email notification | 100% | TC-017, TC-018 |
| Session logging (IP, device) | 100% | TC-019, TC-020, TC-021 |
| Dashboard redirect | 100% | TC-022, TC-023 |
| Security (SQL injection) | 100% | TC-024, TC-025 |
| Security (XSS) | 100% | TC-026, TC-027 |
| Rate limiting | 100% | TC-028, TC-029, TC-030 |
| Session hijacking | 100% | TC-031, TC-032 |
| Token validation | 100% | TC-033 |
| HTTPS enforcement | 100% | TC-034 |
| CORS verification | 100% | TC-035 |
| Security headers | 100% | TC-036 |
| Data leakage prevention | 100% | TC-037 |
| Edge cases | 100% | TC-038, TC-039, TC-040 |
| Concurrent sessions | 100% | TC-041, TC-042, TC-043 |

**Overall Coverage:** 95% of acceptance criteria

---

## API Test Collection

### Postman Collection Structure

```
Story 1.2 - User Login
├── Authentication
│   ├── TC-001: Login Success
│   ├── TC-002: Login Unverified Email
│   ├── TC-010: Invalid Email Format
│   ├── TC-011: Wrong Password
│   ├── TC-012: Non-existent Email
│   └── TC-003: Case Insensitive Email
├── Token Management
│   ├── TC-004: Access Token Expiry Validation
│   ├── TC-005: Refresh Token Expiry Validation
│   ├── TC-006: Token Refresh
│   ├── TC-007: Refresh Token Expired
│   └── TC-008: Refresh Token Reuse
├── Account Lockout
│   ├── TC-013: 5th Failed Attempt - Lock Account
│   ├── TC-014: Login with Locked Account
│   └── TC-015: Auto-unlock After 30 Minutes
├── Rate Limiting
│   ├── TC-028: 10 Requests per 15 Minutes
│   ├── TC-029: Rate Limit Reset
│   └── TC-030: Per-IP Rate Limiting
├── Security
│   ├── TC-024: SQL Injection Email
│   ├── TC-025: SQL Injection Password
│   ├── TC-026: XSS Email
│   ├── TC-027: XSS Password
│   ├── TC-031: Session Hijacking
│   ├── TC-033: JWT Signature Verification
│   └── TC-034: HTTPS Enforcement
└── Edge Cases
    ├── TC-038: Very Long Email
    ├── TC-039: Special Characters
    └── TC-040: DoS Prevention
```

### Sample Curl Commands

**TC-001: Login Success**
```bash
curl -X POST https://api.example.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Device-ID: device-uuid-123" \
  -d '{
    "email": "test.user@example.com",
    "password": "ValidPassword123!",
    "deviceId": "device-uuid-123"
  }'
```

**TC-006: Token Refresh**
```bash
curl -X POST https://api.example.com/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "refresh_token_xyz"
  }'
```

**TC-024: SQL Injection Test**
```bash
curl -X POST https://api.example.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "'\'' OR '\''1'\''='\'1",
    "password": "anything"
  }'
```

**TC-028: Rate Limit Test**
```bash
# Run in loop 11 times
for i in {1..11}; do
  curl -X POST https://api.example.com/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -H "X-Real-IP: 203.0.113.100" \
    -d '{
      "email": "test@example.com",
      "password": "ValidPassword123!"
    }'
  echo "Request $i"
done
```

---

## Test Execution Strategy

### Phase 1: Manual Testing (6 hours)
1. **Day 1 (2 hours):** Functional tests (TC-001 to TC-023)
   - Happy path login
   - Token validation
   - Account lockout
   - Session logging
   - Dashboard redirect

2. **Day 2 (2 hours):** Security tests (TC-024 to TC-037)
   - SQL injection attempts
   - XSS payloads
   - Rate limiting verification
   - HTTPS enforcement
   - CORS validation

3. **Day 3 (2 hours):** Edge cases & Integration (TC-038 to TC-043)
   - Input validation
   - DoS prevention
   - Concurrent sessions
   - Special characters

### Phase 2: Automated Testing (2 hours)
1. **Postman Collection:** 20+ API tests with assertions
2. **Cypress E2E:** 10+ UI workflow tests
3. **Newman CI/CD:** Automated test execution in pipeline

### Phase 3: Reporting & Sign-Off (1 hour)
1. Compile test results
2. Report any bugs found
3. Get developer fixes
4. Re-test and sign-off

---

## Risk Assessment

### High-Risk Areas

**Risk 1: Token Expiration Not Enforced**
- Impact: Users can use expired tokens
- Mitigation: Validate token expiry in every request (TC-004, TC-005)
- Test Coverage: High

**Risk 2: Account Lockout Circumvention**
- Impact: Brute force attacks succeed
- Mitigation: Distributed attack detection (TC-032)
- Test Coverage: High

**Risk 3: SQL Injection via Email Field**
- Impact: Database compromise, data breach
- Mitigation: Parameterized queries, input validation (TC-024, TC-025)
- Test Coverage: High

**Risk 4: Session Hijacking**
- Impact: Account takeover
- Mitigation: IP binding, device fingerprinting (TC-031)
- Test Coverage: High

**Risk 5: Rate Limiting Bypass**
- Impact: Brute force attacks
- Mitigation: Per-user and per-IP limits (TC-028, TC-029, TC-030)
- Test Coverage: High

### Coverage Gaps

**Gap 1: 2FA During Login**
- Not tested in this plan (covered in Story 1.3)
- Future enhancement: Add TC for login with 2FA required

**Gap 2: Third-Party OAuth**
- Out of scope (post-MVP feature)
- Future test plan needed

**Gap 3: Password Reset Integration**
- Covered in Story 1.4 (separate test plan)
- Link to reset from login error not tested

---

## Success Criteria

For story sign-off, the following must be met:

1. **All 40+ test cases executed:** Manual testing 100% complete
2. **Pass rate >= 95%:** Acceptable only if low-priority bugs
3. **No Critical/High bugs:** All P0/P1 bugs resolved before sign-off
4. **Security tests passed:** All security scenarios (TC-024 to TC-037) passing
5. **Test automation:** Postman collection + Cypress E2E suite created
6. **Performance baseline:** Login latency < 500ms (P99)
7. **Documentation:** All test results documented with evidence
8. **Accessibility:** WCAG 2.1 AA compliance verified (axe-core scan)

---

## Estimated Test Metrics

**Total Test Cases:** 43
**Functional Tests:** 23 (53%)
**Security Tests:** 14 (33%)
**Edge Case Tests:** 6 (14%)

**Priority Distribution:**
- P0 (Critical): 22 (51%)
- P1 (High): 12 (28%)
- P2 (Medium): 9 (21%)

**Estimated Execution Time:**
- Manual Testing: 8-10 hours
- Automation Development: 2-3 hours
- Bug Investigation: 2 hours (if bugs found)
- Re-testing: 1-2 hours
- Total: 13-17 hours

**Test Environment Requirements:**
- Staging database with test accounts
- Redis instance for session/rate limiting
- Email service mock
- HTTPS endpoint
- Rate limiting enabled

---

## Approval

**Prepared by:** QA Engineer
**Date:** 2025-11-19
**Status:** Ready for Execution

---

## Sign-Off Checklist

- [ ] Test plan reviewed by Tech Lead
- [ ] Acceptance criteria verified
- [ ] Test environment available
- [ ] Test data prepared
- [ ] Postman collection ready
- [ ] Cypress scripts ready
- [ ] All 40+ test cases executed
- [ ] Test results documented
- [ ] Bugs reported (if any)
- [ ] Bugs re-tested after fixes
- [ ] Final sign-off delivered

---

## Appendix A: Test Data Setup

### Test User Accounts

```sql
-- Valid account
INSERT INTO users (user_id, email, password_hash, email_verified, status, created_at)
VALUES ('usr_12345', 'test.user@example.com', '$argon2id$...', TRUE, 'ACTIVE', NOW());

-- Unverified email
INSERT INTO users (user_id, email, password_hash, email_verified, status, created_at)
VALUES ('usr_54321', 'unverified.user@example.com', '$argon2id$...', FALSE, 'PENDING_VERIFICATION', NOW());

-- Turkish domain (optional)
INSERT INTO users (user_id, email, password_hash, email_verified, status, created_at)
VALUES ('usr_99999', 'test+special@örnek.tr', '$argon2id$...', TRUE, 'ACTIVE', NOW());
```

### Password Hashes (for reference)
- Password: `ValidPassword123!`
- Argon2id Hash: `$argon2id$v=19$m=65540,t=3,p=4$...` (use bcrypt/argon2 library)

---

## Appendix B: Browser Compatibility Testing

Run Cypress E2E tests on:
- [ ] Chrome 120+
- [ ] Firefox 121+
- [ ] Safari 17+
- [ ] Edge 120+

Mobile browser testing:
- [ ] iOS Safari 17+
- [ ] Chrome Android 120+

---

## Appendix C: Performance Baseline

Login endpoint latency targets:
- **P50 (median):** < 100ms
- **P95 (95th percentile):** < 250ms
- **P99 (99th percentile):** < 500ms

Measured under:
- Concurrent users: 100
- Database query time: < 50ms
- Rate limiter lookup: < 10ms

---

**Document End**
