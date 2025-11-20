# QA-002: Complete User Registration Flow - Test Execution Plan

**Task ID:** QA-002
**Priority:** High
**Feature:** User Registration & Email Verification (Story 1.1 + Story 1.2 partial)
**Sprint:** 1-2
**Created:** 2025-11-19
**Status:** IN PROGRESS

---

## Executive Summary

This document provides comprehensive testing execution for the complete user registration flow including:
1. User Registration Form Validation (Story 1.1)
2. Email Verification Flow (Story 1.2 partial)
3. API Endpoint Testing
4. Accessibility & Security Testing

**Test Scope:** 25 detailed test cases across UI, API, and integration layers.

---

## Story 1.1: User Registration - Acceptance Criteria

From mvp-backlog-detailed.md:

- [x] User can enter email, password (min 8 chars, 1 uppercase, 1 number, 1 special)
- [x] Email verification link sent within 60 seconds
- [x] Email verification expires in 24 hours
- [x] User sees success message after email verification
- [x] Duplicate email shows error: "Bu email zaten kayıtlı"
- [x] Password strength indicator displayed (weak/medium/strong)
- [x] Terms & Conditions checkbox required (v1.0 dated 2025-11-19)
- [x] KVKK consent checkbox required
- [x] reCAPTCHA v3 validation (score > 0.5)

**Story Points:** 5

---

## Story 1.2: Email Verification (Partial) - Acceptance Criteria

From mvp-backlog-detailed.md (only email verification portion):

- [x] User can login with verified email + password
- [x] JWT access token issued (15 min expiry)
- [x] JWT refresh token issued (30 days expiry)
- [x] Failed login shows: "Email veya şifre hatalı" (no enumeration)
- [x] Account locked after 5 failed attempts for 30 minutes
- [x] Lockout notification email sent
- [x] Session logged with IP, device, timestamp
- [x] User redirected to dashboard after login

**Story Points:** 5

---

## Test Environment Requirements

### Infrastructure Setup

**Services to be running:**
1. PostgreSQL 16 (Port 5432) - Database
2. Redis 7 (Port 6379) - Cache & Session Store
3. RabbitMQ 3.12 (Ports 5672, 15672) - Message Queue
4. Auth Service (Port 3001) - Backend API
5. Frontend (Port 3000) - React application
6. MailHog (Port 8025) - Email Testing UI

**Docker Compose Command:**
```bash
docker-compose up -d postgres redis rabbitmq auth-service mailhog
```

**Health Check:**
```bash
# Verify all services are running
curl -f http://localhost:3001/health          # Auth Service
curl -f http://localhost:8025                 # MailHog UI
psql -h localhost -U postgres -d exchange_dev  # PostgreSQL
redis-cli -h localhost ping                    # Redis
```

### Testing Tools Required

| Tool | Version | Purpose |
|------|---------|---------|
| Postman | Latest | API Testing |
| Newman | CLI | Postman CLI Runner |
| Cypress | 13.x | E2E Testing |
| axe-core | Latest | Accessibility Testing |
| Chrome/Firefox | Latest | Manual UI Testing |

---

## Test Execution Plan

### Phase 1: Manual UI Testing (Browser)

#### Registration Form Tests (TC-001 to TC-010)

### Test Case: TC-001 - Valid Registration with Strong Password

**Feature:** User Registration (Story 1.1)
**Type:** E2E / UI
**Priority:** P0 (Critical)

**Preconditions:**
- Frontend application running at http://localhost:3000
- Authentication service ready at http://localhost:3001
- MailHog running at http://localhost:8025
- Database is clean (no test user exists)
- reCAPTCHA mocked to return score > 0.5

**Steps:**
1. Navigate to http://localhost:3000/register
2. Enter valid email: `testuser001@example.com`
3. Enter strong password: `SecurePass123!@#`
4. Confirm password: `SecurePass123!@#`
5. Verify password strength indicator shows "Strong" (green)
6. Check Terms & Conditions checkbox
7. Check KVKK checkbox
8. Click "Sign Up" button
9. Wait for API response (max 5 seconds)
10. Check for success notification/message

**Expected Result:**
- Form submission succeeds
- User is redirected to verification pending page
- Success message: "Kaydınız başarılı. Lütfen emailinizi doğrulayınız."
- Email verification link received in MailHog within 60 seconds
- Verification link format: `/verify-email?token=<64-char-hex-token>`
- No sensitive data in browser console logs

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested / ✅ Passed / ❌ Failed

**Screenshots:**
[To be attached if failed]

---

### Test Case: TC-002 - Invalid Email Format

**Feature:** User Registration (Story 1.1)
**Type:** E2E / UI
**Priority:** P1 (High)

**Preconditions:**
- Frontend application running
- Clean database state
- User has not started registration

**Steps:**
1. Navigate to http://localhost:3000/register
2. Enter invalid email: `notanemail`
3. Enter valid password: `SecurePass123!@#`
4. Confirm password: `SecurePass123!@#`
5. Click "Sign Up" button
6. Observe form validation

**Expected Result:**
- Form shows inline error message
- Error message (Turkish): "Geçerli bir email adresi girin"
- Email field highlighted with red border
- Submit button remains disabled until error is fixed
- No API request is sent to backend

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested / ✅ Passed / ❌ Failed

---

### Test Case: TC-003 - Weak Password (No Uppercase)

**Feature:** User Registration (Story 1.1)
**Type:** E2E / UI
**Priority:** P1 (High)

**Preconditions:**
- Frontend application running
- Registration form displayed

**Steps:**
1. Enter email: `test003@example.com`
2. Enter password: `securepass123!@#`
3. Confirm password: `securepass123!@#`
4. Observe password strength indicator
5. Click "Sign Up" button

**Expected Result:**
- Password strength indicator shows "Weak" (red)
- Error message: "Şifre en az bir büyük harf içermelidir"
- Form shows validation error below password field
- Submit button is disabled (cannot click)

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested / ✅ Passed / ❌ Failed

---

### Test Case: TC-004 - Weak Password (No Special Character)

**Feature:** User Registration (Story 1.1)
**Type:** E2E / UI
**Priority:** P1 (High)

**Preconditions:**
- Frontend application running

**Steps:**
1. Enter email: `test004@example.com`
2. Enter password: `SecurePass12345`
3. Confirm password: `SecurePass12345`
4. Observe password strength indicator
5. Click "Sign Up" button

**Expected Result:**
- Password strength indicator shows "Weak" (red)
- Error message: "Şifre en az bir özel karakter (!@#$%^&*) içermelidir"
- Form validation prevents submission

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested / ✅ Passed / ❌ Failed

---

### Test Case: TC-005 - Password Too Short

**Feature:** User Registration (Story 1.1)
**Type:** E2E / UI
**Priority:** P1 (High)

**Preconditions:**
- Frontend application running

**Steps:**
1. Enter email: `test005@example.com`
2. Enter password: `Pass1!`
3. Confirm password: `Pass1!`
4. Click "Sign Up"

**Expected Result:**
- Validation error: "Şifre minimum 8 karakterden oluşmalıdır"
- Field highlighted in red
- Button disabled

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested / ✅ Passed / ❌ Failed

---

### Test Case: TC-006 - Duplicate Email Registration

**Feature:** User Registration (Story 1.1)
**Type:** E2E / UI
**Priority:** P0 (Critical)

**Preconditions:**
- User `existing@example.com` already exists in database
- Frontend loaded

**Steps:**
1. Enter email: `existing@example.com`
2. Enter password: `SecurePass123!@#`
3. Confirm password: `SecurePass123!@#`
4. Check Terms & Conditions
5. Check KVKK
6. Click "Sign Up"
7. Wait for server response (5-10 seconds)

**Expected Result:**
- Form shows error: "Bu email zaten kayıtlı"
- Error appears above submit button (in red)
- Form remains on registration page (no redirect)
- Email field is focused
- No new user record created

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested / ✅ Passed / ❌ Failed

---

### Test Case: TC-007 - Terms Not Accepted

**Feature:** User Registration (Story 1.1)
**Type:** E2E / UI
**Priority:** P1 (High)

**Preconditions:**
- Frontend loaded

**Steps:**
1. Enter valid email: `test007@example.com`
2. Enter strong password: `SecurePass123!@#`
3. Confirm password
4. DO NOT check Terms & Conditions checkbox
5. Check KVKK checkbox
6. Click "Sign Up"

**Expected Result:**
- Form shows validation error
- Error message: "Kullanım Şartlarını kabul etmelisiniz"
- Terms checkbox field is highlighted
- Button remains disabled
- No API request sent

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested / ✅ Passed / ❌ Failed

---

### Test Case: TC-008 - KVKK Not Accepted

**Feature:** User Registration (Story 1.1)
**Type:** E2E / UI
**Priority:** P1 (High)

**Preconditions:**
- Frontend loaded

**Steps:**
1. Enter valid email: `test008@example.com`
2. Enter strong password: `SecurePass123!@#`
3. Confirm password
4. Check Terms & Conditions
5. DO NOT check KVKK checkbox
6. Click "Sign Up"

**Expected Result:**
- Form shows validation error
- Error message: "KVKK'yı kabul etmelisiniz"
- KVKK checkbox highlighted
- Button disabled

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested / ✅ Passed / ❌ Failed

---

### Test Case: TC-009 - Empty Form Submission

**Feature:** User Registration (Story 1.1)
**Type:** E2E / UI
**Priority:** P0 (Critical)

**Preconditions:**
- Fresh registration page loaded

**Steps:**
1. Click "Sign Up" button without entering any data
2. Observe form validation

**Expected Result:**
- All fields show required error: "Bu alan gereklidir"
- All fields highlighted in red
- Button remains disabled
- No API request sent

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested / ✅ Passed / ❌ Failed

---

### Test Case: TC-010 - Password Visibility Toggle

**Feature:** User Registration (Story 1.1)
**Type:** E2E / UI
**Priority:** P2 (Medium)

**Preconditions:**
- Registration form loaded

**Steps:**
1. Enter password: `SecurePass123!@#`
2. Observe password field (should be masked: •••••••••)
3. Click eye icon/toggle to show password
4. Observe password field
5. Click toggle again to hide password

**Expected Result:**
- Initial state: password masked with dots
- After clicking "show": password displayed as plain text
- After clicking "hide": password masked again
- Toggle works smoothly without losing input value

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested / ✅ Passed / ❌ Failed

---

## Email Verification Tests (TC-011 to TC-018)

### Test Case: TC-011 - Verification Email Received

**Feature:** Email Verification (Story 1.2)
**Type:** Integration / Email
**Priority:** P0 (Critical)

**Preconditions:**
- User `verify001@example.com` registered successfully
- MailHog accessible at http://localhost:8025

**Steps:**
1. Complete registration with email: `verify001@example.com`
2. Open MailHog UI: http://localhost:8025
3. Wait up to 60 seconds
4. Check for email from `noreply@exchange.local`
5. Verify email subject contains verification instruction

**Expected Result:**
- Email arrives within 60 seconds
- From address: `noreply@exchange.local`
- Subject: "Email Doğrulama" or "Verify Your Email"
- Email body contains verification link
- Email body contains clear instructions (Turkish)
- No errors in logs

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested / ✅ Passed / ❌ Failed

---

### Test Case: TC-012 - Verification Link Format Correct

**Feature:** Email Verification (Story 1.2)
**Type:** Email Validation
**Priority:** P0 (Critical)

**Preconditions:**
- Verification email received in MailHog
- Email contains verification link

**Steps:**
1. Open the received email in MailHog
2. Extract the verification link/token
3. Examine the link format
4. Count the token characters

**Expected Result:**
- Link format: `http://localhost:3000/verify-email?token=<TOKEN>`
- TOKEN is exactly 64 hexadecimal characters
- TOKEN format: `^[a-f0-9]{64}$`
- URL is properly encoded (no special characters that need escaping)

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested / ✅ Passed / ❌ Failed

---

### Test Case: TC-013 - Valid Token Verification Success

**Feature:** Email Verification (Story 1.2)
**Type:** E2E / UI + API
**Priority:** P0 (Critical)

**Preconditions:**
- User registered with email: `verify013@example.com`
- Verification email received with valid token
- User not yet verified

**Steps:**
1. Extract verification token from MailHog email
2. Navigate to: `http://localhost:3000/verify-email?token=<TOKEN>`
3. Wait for page to load and process (3-5 seconds)
4. Observe success message
5. Check user status in database

**Expected Result:**
- Page loads successfully
- Success message displayed: "Email adresiniz başarıyla doğrulandı"
- User is redirected to login page after 2-3 seconds
- Database: `users.email_verified = true`
- Database: `users.email_verification_token = NULL`
- Session logs created with timestamp and IP

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested / ✅ Passed / ❌ Failed

---

### Test Case: TC-014 - Invalid Token Verification

**Feature:** Email Verification (Story 1.2)
**Type:** E2E / API
**Priority:** P1 (High)

**Preconditions:**
- Verification page accessible

**Steps:**
1. Navigate to: `http://localhost:3000/verify-email?token=invalid_token_1234567890`
2. Wait for response (3-5 seconds)
3. Observe error message

**Expected Result:**
- Page shows error: "Geçersiz doğrulama linki"
- Error message is user-friendly (Turkish)
- Form shows "Resend verification email" option
- No redirect occurs
- Invalid token rejected at API level

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested / ✅ Passed / ❌ Failed

---

### Test Case: TC-015 - Expired Token Verification

**Feature:** Email Verification (Story 1.2)
**Type:** Integration / API
**Priority:** P1 (High)

**Preconditions:**
- Token exists but is older than 24 hours
- Simulated expired token in test database

**Steps:**
1. Manually insert expired token in database (created_at = 25 hours ago)
2. Navigate to verification page with that token
3. Wait for response
4. Observe error

**Expected Result:**
- Page shows error: "Doğrulama linki süresi geçti"
- User is directed to resend verification option
- Token is automatically deleted from database
- Error is logged with reason "TOKEN_EXPIRED"

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested / ✅ Passed / ❌ Failed

---

### Test Case: TC-016 - Resend Verification Email

**Feature:** Email Verification (Story 1.2)
**Type:** Integration / API
**Priority:** P1 (High)

**Preconditions:**
- User registered but not verified: `resend016@example.com`
- Previous verification email may or may not exist
- MailHog accessible

**Steps:**
1. Go to login page
2. Click "Didn't receive the email?" or similar link
3. Enter email: `resend016@example.com`
4. Click "Resend Verification Email"
5. Wait up to 10 seconds
6. Check MailHog for new email
7. Compare new token with old token (if it exists)

**Expected Result:**
- New verification email sent
- Email arrives within 10 seconds
- New token is different from old token (regenerated)
- Success message: "Doğrulama emaili tekrar gönderildi"
- Rate limit respected (not exceeded)

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested / ✅ Passed / ❌ Failed

---

### Test Case: TC-017 - Resend for Already Verified Email

**Feature:** Email Verification (Story 1.2)
**Type:** API / Error Handling
**Priority:** P2 (Medium)

**Preconditions:**
- User already verified: `verified017@example.com`
- User is logged in or on resend page

**Steps:**
1. Navigate to verification resend page
2. Enter already-verified email: `verified017@example.com`
3. Click "Resend"
4. Observe response

**Expected Result:**
- API returns 400 Bad Request
- Error message: "Bu email zaten doğrulanmış"
- No email is sent
- User is informed that verification is not needed

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested / ✅ Passed / ❌ Failed

---

### Test Case: TC-018 - Rate Limiting on Resend

**Feature:** Email Verification (Story 1.2)
**Type:** API / Security
**Priority:** P1 (High)

**Preconditions:**
- User unverified: `ratelimit018@example.com`
- Rate limit configured: 3 resend attempts per hour per IP

**Steps:**
1. Call resend verification endpoint with email 1st time
2. Wait 1 second
3. Call resend verification endpoint 2nd time
4. Wait 1 second
5. Call resend verification endpoint 3rd time
6. Wait 1 second
7. Call resend verification endpoint 4th time (expect rate limit)

**Expected Result:**
- First 3 requests: 200 OK, email sent
- 4th request: 429 Too Many Requests
- Error message: "Çok fazla başarısız deneme. Lütfen 1 saat sonra tekrar deneyin"
- Rate limit resets after 1 hour

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested / ✅ Passed / ❌ Failed

---

## API Tests (TC-019 to TC-025)

### Test Case: TC-019 - POST /api/v1/auth/register - Success

**Feature:** User Registration API (Story 1.1)
**Type:** API / Backend
**Priority:** P0 (Critical)

**Preconditions:**
- Auth service running at http://localhost:3001
- PostgreSQL database accessible
- MailHog service running
- Email: `api019@example.com` does not exist in database

**Steps:**
1. Send POST request to `/api/v1/auth/register`
2. Request body:
   ```json
   {
     "email": "api019@example.com",
     "password": "SecurePass123!@#",
     "termsAccepted": true,
     "kvkkAccepted": true,
     "recaptchaToken": "mock-token-with-score-0.8"
   }
   ```
3. Wait for response
4. Check response status and body

**Expected Result:**
- HTTP Status: 201 Created
- Response body:
  ```json
  {
    "success": true,
    "message": "Kaydınız başarılı. Lütfen emailinizi doğrulayınız.",
    "data": {
      "userId": "uuid",
      "email": "api019@example.com",
      "emailVerified": false,
      "createdAt": "2025-11-19T10:00:00Z"
    },
    "meta": {
      "timestamp": "2025-11-19T10:00:00Z",
      "request_id": "req_xxx"
    }
  }
  ```
- User created in database
- Verification email queued

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested / ✅ Passed / ❌ Failed

---

### Test Case: TC-020 - POST /api/v1/auth/register - Validation Errors

**Feature:** User Registration API (Story 1.1)
**Type:** API / Validation
**Priority:** P1 (High)

**Preconditions:**
- Auth service running

**Steps:**
1. Send POST with missing email field
2. Observe error response
3. Send POST with weak password
4. Observe error response
5. Send POST with invalid email format

**Expected Result:**
- HTTP Status: 400 Bad Request
- Response includes error details array:
  ```json
  {
    "success": false,
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Doğrulama başarısız",
      "details": [
        {
          "field": "email",
          "message": "Geçerli bir email adresi girin"
        }
      ]
    }
  }
  ```

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested / ✅ Passed / ❌ Failed

---

### Test Case: TC-021 - POST /api/v1/auth/register - Duplicate Email

**Feature:** User Registration API (Story 1.1)
**Type:** API / Business Logic
**Priority:** P0 (Critical)

**Preconditions:**
- User `duplicate021@example.com` already exists
- Auth service running

**Steps:**
1. Send POST /api/v1/auth/register
2. Request body with duplicate email: `duplicate021@example.com`
3. Observe response

**Expected Result:**
- HTTP Status: 409 Conflict
- Response:
  ```json
  {
    "success": false,
    "error": {
      "code": "EMAIL_ALREADY_EXISTS",
      "message": "Bu email zaten kayıtlı"
    }
  }
  ```

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested / ✅ Passed / ❌ Failed

---

### Test Case: TC-022 - POST /api/v1/auth/verify-email - Success

**Feature:** Email Verification API (Story 1.2)
**Type:** API / Verification
**Priority:** P0 (Critical)

**Preconditions:**
- User registered but not verified
- Valid token exists in database
- Token is not expired

**Steps:**
1. Get valid token from database test record
2. Send POST /api/v1/auth/verify-email
3. Request body:
   ```json
   {
     "token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2"
   }
   ```
4. Observe response

**Expected Result:**
- HTTP Status: 200 OK
- Response:
  ```json
  {
    "success": true,
    "message": "Email adresi başarıyla doğrulandı",
    "data": {
      "email": "user@example.com",
      "emailVerified": true
    }
  }
  ```
- Database: user record updated with `email_verified = true`

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested / ✅ Passed / ❌ Failed

---

### Test Case: TC-023 - POST /api/v1/auth/verify-email - Invalid Token

**Feature:** Email Verification API (Story 1.2)
**Type:** API / Error Handling
**Priority:** P1 (High)

**Preconditions:**
- Auth service running

**Steps:**
1. Send POST /api/v1/auth/verify-email
2. Request body with invalid token:
   ```json
   {
     "token": "not_a_valid_token_short"
   }
   ```
3. Observe response

**Expected Result:**
- HTTP Status: 400 Bad Request
- Response:
  ```json
  {
    "success": false,
    "error": {
      "code": "INVALID_TOKEN",
      "message": "Geçersiz doğrulama linki"
    }
  }
  ```

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested / ✅ Passed / ❌ Failed

---

### Test Case: TC-024 - POST /api/v1/auth/resend-verification - Success

**Feature:** Resend Verification API (Story 1.2)
**Type:** API / Email Service
**Priority:** P1 (High)

**Preconditions:**
- User registered but not verified
- User exists in database with `email_verified = false`

**Steps:**
1. Send POST /api/v1/auth/resend-verification
2. Request body:
   ```json
   {
     "email": "unverified@example.com"
   }
   ```
3. Wait for response
4. Check MailHog for new email

**Expected Result:**
- HTTP Status: 200 OK
- Response:
  ```json
  {
    "success": true,
    "message": "Doğrulama emaili tekrar gönderildi"
  }
  ```
- New email received in MailHog
- New token generated (different from before)

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested / ✅ Passed / ❌ Failed

---

### Test Case: TC-025 - POST /api/v1/auth/resend-verification - Not Found

**Feature:** Resend Verification API (Story 1.2)
**Type:** API / Error Handling
**Priority:** P2 (Medium)

**Preconditions:**
- Auth service running
- Email does not exist: `nonexistent@example.com`

**Steps:**
1. Send POST /api/v1/auth/resend-verification
2. Request body:
   ```json
   {
     "email": "nonexistent@example.com"
   }
   ```
3. Observe response

**Expected Result:**
- HTTP Status: 404 Not Found
- Response:
  ```json
  {
    "success": false,
    "error": {
      "code": "USER_NOT_FOUND",
      "message": "Kullanıcı bulunamadı"
    }
  }
  ```

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested / ✅ Passed / ❌ Failed

---

## Test Results Summary

### Manual Tests Execution Status

| Test Case | Title | Status | Notes |
|-----------|-------|--------|-------|
| TC-001 | Valid Registration | ⬜ Pending | |
| TC-002 | Invalid Email | ⬜ Pending | |
| TC-003 | Weak Password (No Uppercase) | ⬜ Pending | |
| TC-004 | Weak Password (No Special Char) | ⬜ Pending | |
| TC-005 | Password Too Short | ⬜ Pending | |
| TC-006 | Duplicate Email | ⬜ Pending | |
| TC-007 | Terms Not Accepted | ⬜ Pending | |
| TC-008 | KVKK Not Accepted | ⬜ Pending | |
| TC-009 | Empty Form | ⬜ Pending | |
| TC-010 | Password Visibility Toggle | ⬜ Pending | |
| TC-011 | Verification Email Received | ⬜ Pending | |
| TC-012 | Verification Link Format | ⬜ Pending | |
| TC-013 | Valid Token Verification | ⬜ Pending | |
| TC-014 | Invalid Token | ⬜ Pending | |
| TC-015 | Expired Token | ⬜ Pending | |
| TC-016 | Resend Verification | ⬜ Pending | |
| TC-017 | Resend (Already Verified) | ⬜ Pending | |
| TC-018 | Rate Limiting | ⬜ Pending | |
| TC-019 | POST /api/v1/auth/register (Success) | ⬜ Pending | |
| TC-020 | POST /api/v1/auth/register (Validation) | ⬜ Pending | |
| TC-021 | POST /api/v1/auth/register (Duplicate) | ⬜ Pending | |
| TC-022 | POST /api/v1/auth/verify-email (Success) | ⬜ Pending | |
| TC-023 | POST /api/v1/auth/verify-email (Invalid) | ⬜ Pending | |
| TC-024 | POST /api/v1/auth/resend-verification | ⬜ Pending | |
| TC-025 | POST /api/v1/auth/resend-verification (Not Found) | ⬜ Pending | |

**Summary:**
- **Total:** 25 test cases
- **Passed:** 0
- **Failed:** 0
- **Blocked:** 0
- **Pending:** 25

---

## Accessibility Testing

### Accessibility Audit (axe-core)

**Tool:** axe-core Chrome DevTools Extension
**Standards:** WCAG 2.1 Level AA

**Test Procedure:**
1. Navigate to http://localhost:3000/register
2. Open DevTools (F12)
3. Open axe DevTools extension
4. Run scan
5. Document violations and warnings

**Expected Results:**
- 0 Critical violations
- 0-2 Serious violations (if any, log as issues)
- Warnings documented for review

**Actual Results:**
[To be filled during testing]

---

## Security Testing

### Password Security
- Passwords hashed with bcrypt (10 rounds in dev)
- SHA256 hashing for tokens
- No plain text passwords in logs
- No passwords in error messages

### Token Security
- Tokens are 64-character random hex strings
- Tokens expire after 24 hours
- Used tokens cannot be reused
- Tokens stored as SHA256 hashes in database

### Input Validation
- SQL injection attempts blocked
- XSS payloads sanitized
- Email validation per RFC 5322
- Rate limiting on registration and resend

---

## Bug Reporting

If bugs are found during testing, report using this format:

### Bug Report Template

```markdown
### BUG-QA-002-XXX: [Clear Problem Description]

**Severity:** Critical / High / Medium / Low
**Priority:** High / Medium / Low
**Found In:** [Feature Name] ([Test Case])
**Environment:** Development

**Description:**
[Concise explanation of the problem]

**Steps to Reproduce:**
1. [Exact step with specific values]
2. [Next step]
3. [Observe the problem]

**Expected:**
- [What should happen]
- [Specific response/behavior]

**Actual:**
- [What actually happens]
- [Actual response/behavior]

**API Endpoint:** [If applicable]
**Request Body:**
```json
[Include exact request]
```

**Response:**
```json
[Include actual response]
```

**Logs:**
[Attach relevant error logs]

**Impact:**
[Describe user impact and business impact]

**Suggested Fix:**
[Technical suggestion if identifiable]
```

---

## Automation - Postman Collection

**File:** `auth-registration-verification.postman_collection.json`
**Tests:** 6 API tests
**Variables:** Environment-based (localhost:3001)

### Collection Structure

```
MyCrypto Platform - Auth
├── Registration
│   ├── POST /api/v1/auth/register - Valid
│   ├── POST /api/v1/auth/register - Invalid Email
│   ├── POST /api/v1/auth/register - Weak Password
│   └── POST /api/v1/auth/register - Duplicate Email
├── Email Verification
│   ├── POST /api/v1/auth/verify-email - Valid
│   ├── POST /api/v1/auth/verify-email - Invalid Token
│   ├── POST /api/v1/auth/resend-verification - Success
│   └── POST /api/v1/auth/resend-verification - Not Found
└── Test Data
    └── Global variables (base URL, test emails)
```

**Execution:**
```bash
# Using Newman (CLI)
newman run auth-registration-verification.postman_collection.json \
  --environment env-dev.postman_environment.json \
  --reporters cli,json \
  --reporter-json-export results.json
```

---

## Automation - Cypress E2E Tests

**File:** `registration-verification.spec.ts`
**Tests:** 15+ E2E scenarios
**Framework:** Cypress 13.x

### Test Scenarios

```typescript
describe('User Registration & Email Verification Flow', () => {
  // Registration form validation tests
  // Email verification flow tests
  // Error handling tests
  // Success path tests
})
```

**Execution:**
```bash
# Interactive mode
npx cypress open --spec "cypress/e2e/registration-verification.spec.ts"

# Headless mode
npx cypress run --spec "cypress/e2e/registration-verification.spec.ts"
```

---

## Sign-Off Criteria

✅ **SIGN-OFF APPROVED** when:
1. All 25 test cases executed
2. No Critical or High severity bugs remaining
3. All API responses match OpenAPI spec
4. Error messages are user-friendly (Turkish)
5. Accessibility: 0 violations
6. Test coverage ≥ 80% of acceptance criteria

❌ **BLOCKED** if:
- Critical bugs found (must be fixed first)
- Docker services cannot start
- Database connectivity issues
- Email service unavailable

---

## Completion Report

[To be generated after testing completion]

### Test Summary
- Total Tests: 25
- Passed: ___ ✅
- Failed: ___ ❌
- Blocked: ___

### Bugs Found
[To be documented]

### Sign-Off Decision
[✅ APPROVED / ❌ BLOCKED]

---

**Document Status:** DRAFT - Ready for Execution
**Last Updated:** 2025-11-19
**QA Agent:** Senior QA Engineer
