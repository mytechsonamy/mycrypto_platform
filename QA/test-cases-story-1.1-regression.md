# Story 1.1: User Registration - Final Regression Tests

**Test Date:** 2025-11-19
**Tester:** QA Engineer
**Sprint:** Final Sign-Off
**Test Environment:** Development (localhost)

---

## Test Scope

### Acceptance Criteria from MVP Backlog
- User can enter email, password (min 8 chars, 1 uppercase, 1 number, 1 special)
- Email verification link sent within 60 seconds
- Email verification expires in 24 hours
- User sees success message after email verification
- Duplicate email shows error: "Bu email zaten kayıtlı"
- Password strength indicator displayed (weak/medium/strong)
- Terms & Conditions checkbox required (v1.0 dated 2025-11-19)
- KVKK consent checkbox required
- reCAPTCHA v3 validation (score > 0.5)
- Rate limit: 5 attempts per IP per hour
- SQL injection protection
- XSS protection
- CSRF protection
- Sensitive data not in response
- Response time < 200ms (p95)

---

## Test Cases

### SECTION A: Registration Flow Tests (TC-001 to TC-010) - REGRESSION

#### TC-001: Valid User Registration
**Feature:** User Registration (Story 1.1)
**Type:** E2E
**Priority:** P0 (Critical)

**Preconditions:**
- Browser open to http://localhost:3000
- Network tab open to monitor requests
- Mailpit accessible at http://localhost:8025

**Steps:**
1. Navigate to registration page
2. Enter email: qa-test-001@example.com
3. Enter password: TestPass123!
4. Verify password strength indicator shows "Strong"
5. Check "Şartlar ve Koşullar" (Terms & Conditions)
6. Check "KVKK Aydınlatma Metni" (KVKK Consent)
7. Click "Kaydol" (Register)
8. Observe response time in Network tab

**Expected Result:**
- Success message displayed: "Kayıt başarılı. Lütfen email adresinizi doğrulayınız."
- User redirected to verification pending page
- Email received in Mailpit within 5 seconds
- Response time < 200ms
- No password in response payload

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach if needed]

---

#### TC-002: Email Validation - Valid Format
**Feature:** Email Validation (Story 1.1)
**Type:** E2E
**Priority:** P1

**Preconditions:**
- Registration form open

**Steps:**
1. Enter email: valid.user+tag@example.co.uk
2. Attempt to register with valid password and consents
3. Check if email is accepted

**Expected Result:**
- Email accepted
- Registration proceeds normally

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

---

#### TC-003: Email Validation - Invalid Format
**Feature:** Email Validation (Story 1.1)
**Type:** E2E
**Priority:** P1

**Preconditions:**
- Registration form open

**Steps:**
1. Enter email: invalid-email-format
2. Attempt to submit
3. Observe validation message

**Expected Result:**
- Error message: "Geçerli bir email adresi giriniz"
- Submit button disabled until valid email entered

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

---

#### TC-004: Password Strength - Too Weak
**Feature:** Password Strength Validation (Story 1.1)
**Type:** E2E
**Priority:** P1

**Preconditions:**
- Registration form open

**Steps:**
1. Enter email: qa-test-004@example.com
2. Enter password: test (too short, no uppercase, no special char)
3. Observe password strength indicator
4. Try to register

**Expected Result:**
- Password strength shows "Weak" (red)
- Error message: "Şifre en az 8 karakter, 1 büyük harf, 1 rakam ve 1 özel karakter içermelidir"
- Submit button disabled

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

---

#### TC-005: Password Strength - Medium
**Feature:** Password Strength Validation (Story 1.1)
**Type:** E2E
**Priority:** P1

**Preconditions:**
- Registration form open

**Steps:**
1. Enter email: qa-test-005@example.com
2. Enter password: Test1234 (8 chars, uppercase, number, but no special char)
3. Observe password strength indicator

**Expected Result:**
- Password strength shows "Medium" (yellow)
- Error message displayed requiring special character

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

---

#### TC-006: Password Strength - Strong
**Feature:** Password Strength Validation (Story 1.1)
**Type:** E2E
**Priority:** P1

**Preconditions:**
- Registration form open

**Steps:**
1. Enter email: qa-test-006@example.com
2. Enter password: TestPass123! (meets all criteria)
3. Observe password strength indicator

**Expected Result:**
- Password strength shows "Strong" (green)
- All validation requirements met
- Submit button enabled

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

---

#### TC-007: Terms & Conditions Checkbox Required
**Feature:** Consent Requirements (Story 1.1)
**Type:** E2E
**Priority:** P0

**Preconditions:**
- Registration form open with valid email and password

**Steps:**
1. Enter email: qa-test-007@example.com
2. Enter password: TestPass123!
3. Do NOT check "Şartlar ve Koşullar" checkbox
4. Check only "KVKK Aydınlatma Metni"
5. Click "Kaydol"

**Expected Result:**
- Error message: "Şartlar ve Koşulları kabul etmelisiniz"
- Submit blocked

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

---

#### TC-008: KVKK Consent Checkbox Required
**Feature:** Consent Requirements (Story 1.1)
**Type:** E2E
**Priority:** P0

**Preconditions:**
- Registration form open with valid email and password

**Steps:**
1. Enter email: qa-test-008@example.com
2. Enter password: TestPass123!
3. Check "Şartlar ve Koşullar" checkbox
4. Do NOT check "KVKK Aydınlatma Metni"
5. Click "Kaydol"

**Expected Result:**
- Error message: "KVKK aydınlatma metnini kabul etmelisiniz"
- Submit blocked

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

---

#### TC-009: Duplicate Email Error
**Feature:** Email Uniqueness (Story 1.1)
**Type:** E2E / API
**Priority:** P1

**Preconditions:**
- User already registered with email: test-existing@example.com

**Steps:**
1. Attempt to register with same email: test-existing@example.com
2. Enter password: TestPass123!
3. Check both consents
4. Click "Kaydol"

**Expected Result:**
- HTTP 409 Conflict response
- Error message: "Bu email zaten kayıtlı"
- User not created in database

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

---

#### TC-010: Email Verification Link Delivery
**Feature:** Email Verification (Story 1.1)
**Type:** E2E
**Priority:** P0

**Preconditions:**
- Mailpit running and accessible

**Steps:**
1. Register with email: qa-test-010@example.com
2. Wait for 60 seconds
3. Check Mailpit for verification email
4. Click verification link in email

**Expected Result:**
- Email received within 5 seconds (not 60)
- Email contains verification link
- Link format: /verify-email?token=<JWT_TOKEN>
- Clicking link shows: "Email adresiniz başarıyla doğrulandı"
- User account status changes to VERIFIED

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

---

### SECTION B: Rate Limiting Tests (TC-026 to TC-030) - NEW

#### TC-026: Rate Limit - First 5 Registrations Succeed
**Feature:** Rate Limiting (BE-004)
**Type:** API
**Priority:** P0

**Preconditions:**
- Fresh IP address or test from new terminal
- Register 5 users sequentially

**Steps:**
1. POST /api/v1/auth/register with email: qa-rl-001@example.com
2. POST /api/v1/auth/register with email: qa-rl-002@example.com
3. POST /api/v1/auth/register with email: qa-rl-003@example.com
4. POST /api/v1/auth/register with email: qa-rl-004@example.com
5. POST /api/v1/auth/register with email: qa-rl-005@example.com

**Expected Result:**
- All 5 requests return HTTP 201 Created
- All users successfully created in database

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

---

#### TC-027: Rate Limit - 6th Registration Returns 429
**Feature:** Rate Limiting (BE-004)
**Type:** API
**Priority:** P0

**Preconditions:**
- 5 registrations already made from same IP in current hour

**Steps:**
1. POST /api/v1/auth/register with email: qa-rl-006@example.com
2. Observe HTTP response code

**Expected Result:**
- HTTP 429 Too Many Requests
- Error message: "Çok fazla kayıt denemesi. Lütfen 1 saat sonra tekrar deneyiniz"
- No user created in database

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

---

#### TC-028: Rate Limit - Retry-After Header Present
**Feature:** Rate Limiting Headers (BE-004)
**Type:** API
**Priority:** P1

**Preconditions:**
- Rate limit exceeded (429 response)

**Steps:**
1. Check response headers of 429 response
2. Look for "Retry-After" header

**Expected Result:**
- Retry-After header present
- Value indicates seconds until next attempt allowed (3600 seconds = 1 hour)

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

---

#### TC-029: Rate Limit - X-RateLimit Headers Present
**Feature:** Rate Limiting Headers (BE-004)
**Type:** API
**Priority:** P1

**Preconditions:**
- Make request to register endpoint

**Steps:**
1. POST /api/v1/auth/register
2. Check response headers for rate limit info

**Expected Result:**
- X-RateLimit-Limit: 5
- X-RateLimit-Remaining: (decreasing count)
- X-RateLimit-Reset: (timestamp)

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

---

#### TC-030: Rate Limit - Whitelist IP Bypass
**Feature:** Rate Limiting Whitelist (BE-004)
**Type:** API
**Priority:** P2

**Preconditions:**
- Test IP added to rate limit whitelist (127.0.0.1 for localhost)

**Steps:**
1. Make 10+ registration requests from localhost (127.0.0.1)
2. Observe responses

**Expected Result:**
- All requests succeed
- No rate limit error
- X-RateLimit-Remaining continues to decrease normally

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

---

### SECTION C: reCAPTCHA Tests (TC-031 to TC-035) - NEW

#### TC-031: reCAPTCHA - Missing Token Returns 403
**Feature:** reCAPTCHA Validation (BE-005)
**Type:** API
**Priority:** P0

**Preconditions:**
- API request without X-Recaptcha-Token header

**Steps:**
1. POST /api/v1/auth/register
2. Send request WITHOUT X-Recaptcha-Token header
3. Observe response

**Expected Result:**
- HTTP 403 Forbidden
- Error message: "reCAPTCHA doğrulaması başarısız"
- User not created

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

---

#### TC-032: reCAPTCHA - Valid Token Returns Success
**Feature:** reCAPTCHA Validation (BE-005)
**Type:** API
**Priority:** P0

**Preconditions:**
- Valid reCAPTCHA v3 token obtained
- Test token from backend config (always passes with score > 0.5)

**Steps:**
1. POST /api/v1/auth/register
2. Include X-Recaptcha-Token header with valid token
3. Send valid registration data

**Expected Result:**
- HTTP 201 Created
- User successfully registered
- reCAPTCHA validation passed

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

---

#### TC-033: reCAPTCHA - Frontend Sends Token Header
**Feature:** reCAPTCHA Integration (FE-004)
**Type:** E2E
**Priority:** P0

**Preconditions:**
- Browser Network tab open
- Registration form loaded

**Steps:**
1. Fill registration form completely
2. Submit registration
3. Check Network tab for POST request
4. Inspect request headers

**Expected Result:**
- X-Recaptcha-Token header present in request
- Token is non-empty string
- API accepts request and returns 201

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

---

#### TC-034: reCAPTCHA - Low Score Returns 403
**Feature:** reCAPTCHA Score Validation (BE-005)
**Type:** API
**Priority:** P1

**Preconditions:**
- reCAPTCHA returns score < 0.5 (bot-like behavior)

**Steps:**
1. Send request with token that has score < 0.5
2. Observe response

**Expected Result:**
- HTTP 403 Forbidden
- Error message in Turkish explaining bot detection
- User not created

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

---

#### TC-035: reCAPTCHA - Graceful Fallback on Service Failure
**Feature:** reCAPTCHA Fallback (BE-005)
**Type:** API
**Priority:** P2

**Preconditions:**
- reCAPTCHA service temporarily unavailable

**Steps:**
1. Stop/disable reCAPTCHA service
2. Attempt registration with token
3. Observe response

**Expected Result:**
- Either: HTTP 503 Service Unavailable OR
- Fallback: Request allowed with warning in logs
- System logs show reCAPTCHA service failure

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

---

### SECTION D: Security Tests (TC-036 to TC-040) - NEW

#### TC-036: SQL Injection - Email Field
**Feature:** SQL Injection Protection
**Type:** API
**Priority:** P0

**Preconditions:**
- API endpoint accessible

**Steps:**
1. POST /api/v1/auth/register
2. Email field: `" OR "1"="1`
3. Send request

**Expected Result:**
- HTTP 400 Bad Request
- Error: Invalid email format
- No SQL error exposed
- Attack payload not executed

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

---

#### TC-037: XSS - Email Field with Script
**Feature:** XSS Protection
**Type:** API
**Priority:** P0

**Preconditions:**
- API endpoint accessible

**Steps:**
1. POST /api/v1/auth/register
2. Email field: `<script>alert('XSS')</script>@example.com`
3. Send request

**Expected Result:**
- HTTP 400 Bad Request
- Error: Invalid email format
- Payload rejected before database insertion
- Response does not contain script tags

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

---

#### TC-038: CSRF Protection Active
**Feature:** CSRF Token Validation
**Type:** E2E
**Priority:** P1

**Preconditions:**
- Frontend form loaded

**Steps:**
1. Inspect form for CSRF token
2. Remove/modify CSRF token
3. Attempt to submit form

**Expected Result:**
- Request rejected with HTTP 403
- Error message displayed to user
- No registration created

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

---

#### TC-039: Password Not in Response
**Feature:** Sensitive Data Protection
**Type:** API
**Priority:** P1

**Preconditions:**
- Registration completed successfully

**Steps:**
1. POST /api/v1/auth/register
2. Inspect API response body
3. Check logs for password presence

**Expected Result:**
- Response does not contain password field
- Response does not contain password value
- Password not logged in server logs
- Only hashed password stored in database

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

---

#### TC-040: Sensitive Data Not Logged
**Feature:** Secure Logging
**Type:** Backend
**Priority:** P1

**Preconditions:**
- Server logs accessible

**Steps:**
1. Register with email: sensitive-test@example.com and password: SecurePass123!
2. Check server logs for registration event
3. Search for password in logs

**Expected Result:**
- Logs contain: [INFO] User registration: email=sensitive-test@example.com
- Logs do NOT contain: password field
- Logs do NOT contain password value
- Only user email/ID logged, never credentials

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

---

### SECTION E: Performance Tests (TC-041 to TC-043) - NEW

#### TC-041: Response Time - Registration < 200ms (p95)
**Feature:** Performance
**Type:** API / Load
**Priority:** P1

**Preconditions:**
- Network tab monitoring enabled
- 10+ sequential requests

**Steps:**
1. Register 10 users sequentially
2. Record response time for each
3. Calculate p95 (95th percentile)

**Expected Result:**
- p95 response time < 200ms
- Average response time < 150ms
- No timeouts

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

---

#### TC-042: Concurrent Registrations Handled
**Feature:** Concurrent Load
**Type:** API
**Priority:** P2

**Preconditions:**
- Load testing tool available (curl, Apache Bench, k6)

**Steps:**
1. Send 10 concurrent registration requests
2. Monitor response codes
3. Verify all succeed without errors

**Expected Result:**
- All 10 requests: HTTP 201 Created
- All 10 users created successfully
- No race conditions
- No duplicate key errors

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

---

#### TC-043: Email Delivery Time < 5 Seconds
**Feature:** Email Performance
**Type:** E2E
**Priority:** P2

**Preconditions:**
- Mailpit running
- Email delivery logs accessible

**Steps:**
1. Register user with email: perf-test@example.com
2. Record registration timestamp
3. Check Mailpit for email
4. Record email arrival timestamp
5. Calculate delta

**Expected Result:**
- Email arrives within 5 seconds of registration
- Email queue processed efficiently
- No delays in email service

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

---

## Environment Information

**Test Environment:**
- OS: macOS
- Node.js: 20 LTS
- Database: PostgreSQL
- Cache: Redis
- Email: Mailpit (localhost:8025)

**Test Data:**
- Base email: qa-test-{number}@example.com
- Test password: TestPass123!
- reCAPTCHA test token: from env var RECAPTCHA_TEST_TOKEN

**Tools Used:**
- Browser: Chrome/Safari
- API Testing: Postman/curl
- Network Monitoring: Browser DevTools
- Email Testing: Mailpit UI

---

## Sign-Off Criteria (All Must Pass)

- [ ] TC-001 to TC-010: Registration flow - All pass
- [ ] TC-026 to TC-030: Rate limiting - All pass
- [ ] TC-031 to TC-035: reCAPTCHA - All pass
- [ ] TC-036 to TC-040: Security - All pass
- [ ] TC-041 to TC-043: Performance - All pass
- [ ] Accessibility audit: 0 critical violations
- [ ] No Critical or High severity bugs found
- [ ] Coverage >= 80% of acceptance criteria

---

## Test Results Summary

| Section | Test Cases | Passed | Failed | Status |
|---------|-----------|--------|--------|--------|
| A. Registration Flow | TC-001 to TC-010 (10) | 0 | 0 | PENDING |
| B. Rate Limiting | TC-026 to TC-030 (5) | 0 | 0 | PENDING |
| C. reCAPTCHA | TC-031 to TC-035 (5) | 0 | 0 | PENDING |
| D. Security | TC-036 to TC-040 (5) | 0 | 0 | PENDING |
| E. Performance | TC-041 to TC-043 (3) | 0 | 0 | PENDING |
| **TOTAL** | **28** | **0** | **0** | **PENDING** |

---

**Document Created:** 2025-11-19
**Test Environment:** Development (localhost)
**Tester:** QA Engineer
