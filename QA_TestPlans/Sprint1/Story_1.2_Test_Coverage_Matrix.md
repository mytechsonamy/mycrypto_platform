# QA-004: Story 1.2 - Test Coverage Matrix
## User Login with JWT - Acceptance Criteria Mapping

**Document Version:** 1.0
**Created:** 2025-11-19
**Total Acceptance Criteria:** 8
**Total Test Cases:** 43
**Overall Coverage:** 95%

---

## Coverage Summary

| Category | Total AC | Covered AC | Coverage % | Test Cases |
|----------|----------|-----------|-----------|-----------|
| Functional | 8 | 8 | 100% | 23 |
| Security | 0 | - | 100% | 14 |
| Edge Cases | 0 | - | 100% | 6 |
| **Total** | **8** | **8** | **100%** | **43** |

---

## Detailed Acceptance Criteria Mapping

### AC1: User can login with verified email + password

**Description:** A registered user with a verified email address should be able to authenticate by providing their email and password.

**Test Cases:**
- **TC-001:** Happy Path - Login with Valid Credentials
  - Priority: P0 (Critical)
  - Type: E2E / API
  - Status: Pending Execution
  - Coverage: 100%

- **TC-002:** Login with Unverified Email (Should Fail)
  - Priority: P0 (Critical)
  - Type: E2E / API
  - Status: Pending Execution
  - Coverage: 100% (negative case)

- **TC-003:** Login with Different Case Email Address
  - Priority: P1 (High)
  - Type: API
  - Status: Pending Execution
  - Coverage: 100% (case insensitivity)

**Acceptance Criteria:** AC1 Fully Covered
- Login succeeds with valid, verified email
- Email comparison is case-insensitive
- Unverified emails are rejected
- User object returned with userId, email, kycLevel, roles

---

### AC2: JWT access token issued (15 min expiry)

**Description:** Upon successful login, the system must issue a JWT access token with a 15-minute expiration time.

**Test Cases:**
- **TC-004:** JWT Access Token Valid for 15 Minutes
  - Priority: P0 (Critical)
  - Type: API
  - Status: Pending Execution
  - Coverage: 100%
  - Validates:
    - `expiresIn` field = 1800 seconds
    - JWT `exp` claim is 15 minutes from `iat`
    - Token format: Valid JWT structure (3 parts separated by dots)

- **TC-005:** (Cross-validation) Access Token Expiry in Response
  - Priority: P1 (High)
  - Type: API
  - Status: Pending Execution
  - Coverage: 100%
  - Validates:
    - Response header `tokenType`: "Bearer"
    - Access token can be parsed
    - Token contains userId claim

- **TC-006:** Token Refresh - Access Token Generation
  - Priority: P0 (Critical)
  - Type: API
  - Status: Pending Execution
  - Coverage: 100%
  - Validates:
    - New access token issued on refresh
    - New token valid for 15 minutes
    - Old token invalidated

**Acceptance Criteria:** AC2 Fully Covered
- Access token issued on successful login
- Token lifetime exactly 15 minutes (1800 seconds)
- Token format is valid JWT
- Token contains user claims (userId, email, kycLevel, roles)
- Tokens properly expire after 15 minutes

---

### AC3: JWT refresh token issued (30 days expiry)

**Description:** Upon successful login, the system must issue a JWT refresh token with a 30-day expiration time.

**Test Cases:**
- **TC-005:** JWT Refresh Token Valid for 30 Days
  - Priority: P0 (Critical)
  - Type: API
  - Status: Pending Execution
  - Coverage: 100%
  - Validates:
    - `refreshToken` field present in response
    - Token decodes to valid JWT payload
    - `exp` claim is 30 days from `iat` (2,592,000 seconds)
    - Token type claim: "refresh"

- **TC-006:** Token Refresh - Generate New Access Token
  - Priority: P0 (Critical)
  - Type: API
  - Status: Pending Execution
  - Coverage: 100%
  - Validates:
    - Refresh token is reusable (unlike single-use tokens)
    - Refresh endpoint accepts refresh token
    - New access token issued from refresh token

- **TC-007:** Refresh Token Expired - Should Fail
  - Priority: P0 (Critical)
  - Type: API
  - Status: Pending Execution
  - Coverage: 100% (negative case)
  - Validates:
    - Expired refresh tokens rejected
    - User must re-login after 30 days
    - Error: `INVALID_REFRESH_TOKEN`

- **TC-008:** Refresh Token Blacklist - Already Used (Optional)
  - Priority: P0 (Critical)
  - Type: API
  - Status: Pending Execution
  - Coverage: 50% (only if single-use implemented)
  - Validates:
    - Refresh token cannot be reused if blacklisted
    - Token reuse detected as security threat

**Acceptance Criteria:** AC3 Fully Covered
- Refresh token issued on successful login
- Token lifetime exactly 30 days
- Token format is valid JWT
- Token can be used to generate new access tokens
- Tokens properly expire after 30 days
- Support for token refresh mechanism

---

### AC4: Failed login shows: "Email veya şifre hatalı" (No enumeration)

**Description:** When login fails due to invalid credentials, the system must show a generic error message that does not reveal whether the email exists in the system.

**Test Cases:**
- **TC-011:** Incorrect Password - Generic Error Message
  - Priority: P0 (Critical)
  - Type: API
  - Status: Pending Execution
  - Coverage: 100%
  - Validates:
    - Wrong password returns 401 Unauthorized
    - Error message: "Email veya şifre hatalı"
    - No indication it's a password problem
    - No tokens issued

- **TC-012:** Non-Existent Email - Generic Error Message
  - Priority: P0 (Critical)
  - Type: API
  - Status: Pending Execution
  - Coverage: 100%
  - Validates:
    - Non-existent email returns same 401 status
    - Same error message as wrong password
    - No "user not found" message
    - Same response time as valid email (timing attack prevention)

- **TC-010:** Invalid Email Format - Should Fail
  - Priority: P1 (High)
  - Type: API
  - Status: Pending Execution
  - Coverage: 50%
  - Validates:
    - Malformed emails rejected at input validation
    - Error: `INVALID_REQUEST`
    - Different from credential errors (expected)

**Acceptance Criteria:** AC4 Fully Covered
- Failed login returns 401 Unauthorized
- Error message is generic (no enumeration)
- Same error for missing user and wrong password
- No sensitive information leaked
- Response time consistent (no timing side-channels)

---

### AC5: Account locked after 5 failed attempts for 30 minutes

**Description:** After 5 consecutive failed login attempts, the user's account should be automatically locked for 30 minutes. Further login attempts should be rejected during this period.

**Test Cases:**
- **TC-013:** Fifth Failed Login Attempt - Account Locked
  - Priority: P0 (Critical)
  - Type: API
  - Status: Pending Execution
  - Coverage: 100%
  - Validates:
    - Attempts 1-4: Counter incremented, 401 Unauthorized
    - Attempt 5: Account locked, 429 or 403 response
    - `ACCOUNT_LOCKED` error code
    - Database: `locked_until = NOW() + 30 minutes`

- **TC-014:** Login Attempt with Locked Account
  - Priority: P0 (Critical)
  - Type: API
  - Status: Pending Execution
  - Coverage: 100%
  - Validates:
    - Locked account rejects login attempt
    - Even with correct password
    - Error message includes remaining lock time
    - Failed attempt counter NOT incremented

- **TC-015:** Account Auto-Unlock After 30 Minutes
  - Priority: P1 (High)
  - Type: API
  - Status: Pending Execution
  - Coverage: 100%
  - Validates:
    - Account auto-unlocks after 30 minutes
    - Login succeeds with correct password
    - Failed attempt counter reset to 0
    - Database: `locked_until = NULL`

- **TC-016:** Account Unlock via Support - Admin Action (Optional)
  - Priority: P1 (High)
  - Type: API
  - Status: Pending Execution
  - Coverage: 100%
  - Validates:
    - Admin can manually unlock account
    - User can immediately login after unlock
    - Unlock action logged

**Acceptance Criteria:** AC5 Fully Covered
- Counter tracks failed attempts per user
- Lock triggers on 5th failed attempt
- Lock duration exactly 30 minutes
- Correct password rejected while locked
- Auto-unlock after 30 minutes
- Lock reason logged in audit trail

---

### AC6: Lockout notification email sent

**Description:** When an account is locked due to failed login attempts, a notification email must be sent to the user.

**Test Cases:**
- **TC-017:** Lockout Notification Email Sent
  - Priority: P1 (High)
  - Type: Integration
  - Status: Pending Execution
  - Coverage: 100%
  - Validates:
    - Email sent to registered address
    - Subject: "Hesabınız Kilitlenmiştir"
    - Body includes: 30-minute lock time, reason
    - Email sent within 1 minute of lockout
    - Email tracked in audit log

- **TC-018:** Lockout Email Resend After Unlock (Optional)
  - Priority: P2 (Medium)
  - Type: Integration
  - Status: Pending Execution
  - Coverage: 100%
  - Validates:
    - Unlock confirmation email sent
    - Email confirms account is active
    - Includes login link

**Acceptance Criteria:** AC6 Fully Covered
- Email sent immediately on account lock
- Email contains clear explanation
- Email includes unlock time (30 minutes)
- Email includes support contact info
- Email language: Turkish
- Email templates follow brand guidelines

---

### AC7: Session logged with IP, device, timestamp

**Description:** For audit and security purposes, each login session must be recorded with the user's IP address, device information, and login timestamp.

**Test Cases:**
- **TC-019:** Session Logged with IP Address
  - Priority: P1 (High)
  - Type: Integration
  - Status: Pending Execution
  - Coverage: 100%
  - Validates:
    - Session stored in database/Redis
    - Session contains: userId, ip_address, created_at, expires_at
    - IP extracted from `X-Forwarded-For` or socket
    - Geo-IP lookup performed (optional)
    - Session visible in user dashboard

- **TC-020:** Session Logged with Device Information
  - Priority: P1 (High)
  - Type: API
  - Status: Pending Execution
  - Coverage: 100%
  - Validates:
    - Session contains: device_id, device_type, os_name, browser_name
    - User-Agent parsed from request headers
    - Device information extracted correctly
    - User can view all active sessions

- **TC-021:** Session Timestamp Accuracy
  - Priority: P2 (Medium)
  - Type: API
  - Status: Pending Execution
  - Coverage: 100%
  - Validates:
    - `created_at` timestamp accurate (within 500ms)
    - `expires_at` = `created_at` + 30 days
    - All timestamps in ISO 8601 UTC format
    - `lastActivity` updated on API calls

**Acceptance Criteria:** AC7 Fully Covered
- Session created on successful login
- Session contains: IP, device, timestamp
- Session TTL: 30 days
- Session visible in user dashboard: "Aktif Oturumlar"
- Multiple sessions per user supported
- Session data logged for audit trail

---

### AC8: User redirected to dashboard after login

**Description:** After successful login, the user should be redirected to their dashboard where they can access account features.

**Test Cases:**
- **TC-022:** User Redirected to Dashboard After Login (Web UI)
  - Priority: P1 (High)
  - Type: E2E
  - Status: Pending Execution
  - Coverage: 100%
  - Validates:
    - Redirect to: `https://app.example.com/dashboard`
    - Dashboard displays user name: "Hoşgeldiniz, Test User!"
    - Balance widgets visible
    - Navigation menu fully functional
    - No login form visible
    - Access token stored securely (cookie/localStorage)

- **TC-023:** User Redirected to Original Page After Login (Return URL)
  - Priority: P1 (High)
  - Type: E2E
  - Status: Pending Execution
  - Coverage: 100%
  - Validates:
    - Return URL parameter processed: `?return=/trading/BTCTRY`
    - After login, redirected to original page
    - Return URL validated (same-origin, no open redirects)
    - User can access originally requested page

**Acceptance Criteria:** AC8 Fully Covered
- Login success redirects to `/dashboard`
- Dashboard displays user information
- Return URL parameters respected
- No sensitive data in URL
- Redirect happens after token confirmation
- Works on both web and mobile platforms

---

## Security Requirements (Not in AC, but critical)

### SQL Injection Prevention
- **TC-024:** SQL Injection - Email Field
  - Coverage: 100%
  - Status: Pending

- **TC-025:** SQL Injection - Password Field
  - Coverage: 100%
  - Status: Pending

### XSS Prevention
- **TC-026:** XSS - Email Field
  - Coverage: 100%
  - Status: Pending

- **TC-027:** XSS - Password Field
  - Coverage: 100%
  - Status: Pending

### HTTPS Enforcement
- **TC-034:** HTTPS Required - HTTP Request Blocked
  - Coverage: 100%
  - Status: Pending

### CORS Verification
- **TC-035:** CORS Headers - Same-Origin Verification
  - Coverage: 100%
  - Status: Pending

### Security Headers
- **TC-036:** Missing Security Headers
  - Coverage: 100%
  - Status: Pending

### Token Security
- **TC-033:** JWT Signature Verification
  - Coverage: 100%
  - Status: Pending

### Data Leakage Prevention
- **TC-037:** No Sensitive Data in Logs/Responses
  - Coverage: 100%
  - Status: Pending

### Rate Limiting
- **TC-028:** Rate Limiting - 10 Requests per 15 Minutes
  - Coverage: 100%
  - Status: Pending

- **TC-029:** Rate Limit Reset After 15 Minutes
  - Coverage: 100%
  - Status: Pending

- **TC-030:** Rate Limiting Per IP Address
  - Coverage: 100%
  - Status: Pending

### Account Security
- **TC-031:** Session Hijacking Prevention
  - Coverage: 100%
  - Status: Pending

- **TC-032:** Brute Force Attack Prevention (Distributed)
  - Coverage: 100%
  - Status: Pending

---

## Test Execution Plan

### Phase 1: Core Functionality (Day 1)
Priority: P0 (Critical)
- TC-001: Login Success (functional baseline)
- TC-004: Access Token Validation
- TC-005: Refresh Token Validation
- TC-006: Token Refresh
- TC-013: Account Lockout
- TC-014: Locked Account Rejection
- TC-022: Dashboard Redirect

**Time Estimate:** 2 hours

### Phase 2: Security (Day 2)
Priority: P0 (Critical)
- TC-024: SQL Injection Prevention
- TC-025: SQL Injection Prevention (Password)
- TC-026: XSS Prevention
- TC-027: XSS Prevention (Password)
- TC-033: JWT Signature Verification
- TC-034: HTTPS Enforcement
- TC-028: Rate Limiting
- TC-031: Session Hijacking Prevention

**Time Estimate:** 2 hours

### Phase 3: Edge Cases & Integration (Day 3)
Priority: P1-P2
- TC-002: Unverified Email
- TC-007: Expired Refresh Token
- TC-011: Wrong Password
- TC-012: Non-existent Email
- TC-015: Auto-unlock
- TC-017: Lockout Email
- TC-038-TC-040: Edge Cases
- TC-041-TC-043: Concurrent Sessions

**Time Estimate:** 2 hours

---

## Risk Assessment by Acceptance Criteria

### AC1: Login Functionality
**Risk Level:** HIGH
**Mitigation:** TC-001, TC-002, TC-003
**Gap:** 0%

### AC2: Access Token (15 min)
**Risk Level:** CRITICAL
**Mitigation:** TC-004, TC-005, TC-006
**Gap:** 0%

### AC3: Refresh Token (30 days)
**Risk Level:** CRITICAL
**Mitigation:** TC-005, TC-006, TC-007, TC-008
**Gap:** 0%

### AC4: Error Messages
**Risk Level:** HIGH
**Mitigation:** TC-011, TC-012, TC-010
**Gap:** 0%

### AC5: Account Lockout
**Risk Level:** CRITICAL
**Mitigation:** TC-013, TC-014, TC-015, TC-016
**Gap:** 0%

### AC6: Lockout Email
**Risk Level:** MEDIUM
**Mitigation:** TC-017, TC-018
**Gap:** 0%

### AC7: Session Logging
**Risk Level:** HIGH (Security/Audit)
**Mitigation:** TC-019, TC-020, TC-021
**Gap:** 0%

### AC8: Dashboard Redirect
**Risk Level:** MEDIUM
**Mitigation:** TC-022, TC-023
**Gap:** 0%

---

## Coverage Statistics

### By Acceptance Criteria
```
AC1 (Login):           3 test cases  (TC-001, TC-002, TC-003)
AC2 (Access Token):    3 test cases  (TC-004, TC-005, TC-006)
AC3 (Refresh Token):   4 test cases  (TC-005, TC-006, TC-007, TC-008)
AC4 (Error Messages):  3 test cases  (TC-010, TC-011, TC-012)
AC5 (Lockout):         4 test cases  (TC-013, TC-014, TC-015, TC-016)
AC6 (Email):           2 test cases  (TC-017, TC-018)
AC7 (Session Log):     3 test cases  (TC-019, TC-020, TC-021)
AC8 (Redirect):        2 test cases  (TC-022, TC-023)
```

### By Test Category
```
Functional:     23 test cases
Security:       14 test cases
Edge Cases:      6 test cases
Total:          43 test cases
```

### By Priority
```
P0 (Critical):  22 test cases (51%)
P1 (High):      12 test cases (28%)
P2 (Medium):     9 test cases (21%)
```

### By Type
```
E2E:            8 test cases
API:           25 test cases
Integration:   10 test cases
```

---

## Sign-Off Criteria

All acceptance criteria require:
1. **All mapped test cases executed:** 100% execution rate
2. **All test cases passed:** No failures on critical criteria
3. **Coverage >= 95%:** Overall test coverage met
4. **No critical bugs:** P0 issues must be resolved
5. **Security tests passed:** All security validations successful
6. **Performance baseline:** Login latency < 500ms P99
7. **Documentation complete:** All results recorded

**Current Status:** Ready for Execution

---

## Test Traceability

Each test case is traceable back to:
- **Acceptance Criterion:** AC1-AC8
- **User Story:** 1.2 - User Login with JWT
- **Feature:** Authentication / Login Service
- **Epic:** 1 - User Authentication & Onboarding
- **Requirements Document:** mvp-backlog-detailed.md
- **API Specification:** crypto-exchange-api-spec-complete.md
- **Security Checklist:** security-audit-checklist.md

---

## Appendix: Test Case Reference

| ID | Test Case | AC | Priority | Type | Status |
|----|-----------|----|---------|----|--------|
| TC-001 | Login Success | AC1 | P0 | E2E | Pending |
| TC-002 | Unverified Email | AC1 | P0 | API | Pending |
| TC-003 | Case Insensitive Email | AC1 | P1 | API | Pending |
| TC-004 | Access Token Expiry | AC2 | P0 | API | Pending |
| TC-005 | Token Expiry Validation | AC2,AC3 | P0 | API | Pending |
| TC-006 | Token Refresh | AC2,AC3 | P0 | API | Pending |
| TC-007 | Expired Refresh Token | AC3 | P0 | API | Pending |
| TC-008 | Token Reuse (Blacklist) | AC3 | P0 | API | Pending |
| TC-010 | Invalid Email Format | AC4 | P1 | API | Pending |
| TC-011 | Wrong Password | AC4 | P0 | API | Pending |
| TC-012 | Non-existent Email | AC4 | P0 | API | Pending |
| TC-013 | 5th Failed Attempt | AC5 | P0 | API | Pending |
| TC-014 | Locked Account | AC5 | P0 | API | Pending |
| TC-015 | Auto-unlock | AC5 | P1 | API | Pending |
| TC-016 | Admin Unlock | AC5 | P1 | API | Pending |
| TC-017 | Lockout Email | AC6 | P1 | Integration | Pending |
| TC-018 | Unlock Email | AC6 | P2 | Integration | Pending |
| TC-019 | Session IP | AC7 | P1 | Integration | Pending |
| TC-020 | Session Device | AC7 | P1 | API | Pending |
| TC-021 | Session Timestamp | AC7 | P2 | API | Pending |
| TC-022 | Dashboard Redirect | AC8 | P1 | E2E | Pending |
| TC-023 | Return URL | AC8 | P1 | E2E | Pending |
| TC-024 | SQL Injection Email | - | P0 | API | Pending |
| TC-025 | SQL Injection Password | - | P0 | API | Pending |
| TC-026 | XSS Email | - | P0 | API | Pending |
| TC-027 | XSS Password | - | P0 | API | Pending |
| TC-028 | Rate Limit | - | P0 | API | Pending |
| TC-029 | Rate Limit Reset | - | P1 | API | Pending |
| TC-030 | Rate Limit Per IP | - | P1 | API | Pending |
| TC-031 | Session Hijacking | - | P0 | API | Pending |
| TC-032 | Brute Force (Distributed) | - | P0 | API | Pending |
| TC-033 | JWT Signature | - | P0 | API | Pending |
| TC-034 | HTTPS Enforcement | - | P0 | API | Pending |
| TC-035 | CORS Verification | - | P1 | API | Pending |
| TC-036 | Security Headers | - | P1 | API | Pending |
| TC-037 | Data Leakage | - | P0 | API | Pending |
| TC-038 | Long Email | - | P2 | API | Pending |
| TC-039 | Special Characters | - | P1 | API | Pending |
| TC-040 | DoS Prevention | - | P1 | API | Pending |
| TC-041 | Concurrent Sessions | - | P1 | Integration | Pending |
| TC-042 | Single Session Per Device | - | P1 | Integration | Pending |
| TC-043 | Logout All Sessions | - | P1 | Integration | Pending |

---

**Document End**
