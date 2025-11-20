# QA-001: Story 1.4 - Logout & Password Reset Test Plan

**Document Version:** 1.0
**Last Updated:** 2025-11-19
**QA Engineer:** Senior QA Automation Specialist
**Status:** Ready for Execution

---

## 1. TEST PLANNING OVERVIEW

### 1.1 Story Coverage
This test plan covers two critical authentication features:
- **Story 1.4:** Password Reset (User Story from Epic 1)
- **Session Management:** Logout functionality (part of Story 1.2 Login - Session Management)

### 1.2 Acceptance Criteria Covered

#### Password Reset (Story 1.4) - AC from MVP Backlog
- [ ] User enters email on "Forgot Password" page
- [ ] Reset link sent to email (expires in 1 hour)
- [ ] Reset link is single-use only
- [ ] User enters new password (same complexity rules)
- [ ] All existing sessions invalidated after reset
- [ ] Email confirmation sent after successful reset
- [ ] Rate limit: 3 reset requests per email per hour

#### Logout (Session Management)
- [ ] Token invalidation upon logout
- [ ] Session revocation in Redis
- [ ] Database session termination
- [ ] Client-side token removal capability
- [ ] Multiple device logout scenarios
- [ ] Token blacklist verification

### 1.3 APIs Under Test

1. **POST /api/v1/auth/logout**
   - Requires: Bearer token
   - Action: Blacklists token in Redis, revokes session in DB
   - Rate Limit: 100/hour

2. **POST /api/v1/auth/password/reset-request**
   - Requires: Email address (public endpoint)
   - Action: Sends password reset email with token
   - Rate Limit: 5/hour per email
   - Behavior: Returns 200 regardless of email existence (prevent enumeration)

3. **POST /api/v1/auth/password/reset**
   - Requires: Reset token (from email)
   - Action: Updates password, invalidates all sessions, sends confirmation
   - Rate Limit: 5/hour per token

---

## 2. TEST CASE SPECIFICATIONS

### LOGOUT FUNCTIONALITY TESTS

#### TC-001: Successful Logout with Valid Token

**Feature:** Logout (Session Management)
**Type:** API / E2E
**Priority:** P0 (Critical)

**Preconditions:**
- User is registered and verified
- User has successfully logged in
- Valid JWT access token obtained
- Session exists in Redis and database

**Steps:**
1. Use valid Bearer token from login response
2. Send POST request to `/api/v1/auth/logout`
3. Verify response status code
4. Attempt API call with same token immediately after logout
5. Check Redis for token blacklist entry
6. Query database for session revocation

**Expected Result:**
- Logout returns 200 OK with success message
- Response includes confirmation message: "Başarıyla çıkış yapıldı"
- Token appears in Redis blacklist (TTL matches JWT expiry time)
- Session marked as inactive/revoked in database
- Subsequent API call with same token returns 401 Unauthorized
- Token blacklist entry persists for entire JWT lifetime (15 minutes)

**Actual Result:**
[To be filled during execution]

**Status:** Not Tested

**Screenshots:**
[Attach if failed]

---

#### TC-002: Logout with Invalid/Expired Token

**Feature:** Logout
**Type:** API
**Priority:** P1 (High)

**Preconditions:**
- Expired JWT token available (wait for expiry or use manipulated token)
- OR malformed token
- OR token from different user

**Steps:**
1. Send POST `/api/v1/auth/logout` with expired/invalid token
2. Verify response code
3. Check error message

**Expected Result:**
- Returns 401 Unauthorized
- Error message: "Token geçersiz veya süresi dolmuş"
- No database changes occur
- Redis unaffected

**Actual Result:**
[To be filled during execution]

**Status:** Not Tested

---

#### TC-003: Token Blacklist Verification

**Feature:** Logout - Token Blacklist
**Type:** API / Backend Verification
**Priority:** P0 (Critical)

**Preconditions:**
- Valid authenticated user with token
- Logout completed successfully

**Steps:**
1. Perform logout with valid token
2. Execute Redis command: `GET token:blacklist:{token_hash}`
3. Verify blacklist entry exists
4. Check Redis TTL matches remaining JWT lifetime
5. Attempt using same token immediately after logout
6. Attempt using same token after 1 minute
7. Attempt using same token at token expiry time + 1 second

**Expected Result:**
- Blacklist entry exists in Redis with format: `token:blacklist:{hashed_token} = {logout_timestamp}`
- TTL in Redis = remaining JWT lifetime (approximately 15 mins - elapsed time)
- API calls return 401 with message "Token siyah listeye alınmış"
- Token removed from blacklist after JWT expiry naturally (cleanup occurs)
- No lingering entries after expiry window

**Actual Result:**
[To be filled during execution]

**Status:** Not Tested

---

#### TC-004: Session Revocation in Database

**Feature:** Logout - Session Management
**Type:** Backend Verification
**Priority:** P0 (Critical)

**Preconditions:**
- User logged in with session tracked in database
- Valid authentication token

**Steps:**
1. Query database table `sessions` for user's active session
2. Note session details (id, user_id, status = 'ACTIVE')
3. Perform logout
4. Query database again for same session
5. Check session status field
6. Verify session.revoked_at timestamp
7. Verify session.ip_address and device_id in record
8. Query for any remaining ACTIVE sessions for this user

**Expected Result:**
- Session status changes from 'ACTIVE' to 'REVOKED'
- revoked_at field populated with logout timestamp (UTC)
- revoked_by field set to 'USER_INITIATED' or similar
- Original session details (IP, device, timestamp) preserved
- No other sessions affected
- Session record remains in database (audit trail)
- User.last_logout timestamp updated

**Actual Result:**
[To be filled during execution]

**Status:** Not Tested

---

#### TC-005: Multiple Device Logout Scenario

**Feature:** Logout - Multi-device Support
**Type:** E2E / API
**Priority:** P1 (High)

**Preconditions:**
- User logged in from Device A (Browser)
- User logged in from Device B (Mobile)
- User logged in from Device C (Another Browser)
- All devices have valid tokens

**Steps:**
1. Login and obtain token from Device A
2. Login and obtain token from Device B (different device_id)
3. Login and obtain token from Device C (different device_id)
4. From Device A, perform logout (single device logout)
5. Attempt API call with Device A token
6. Attempt API call with Device B token
7. Attempt API call with Device C token
8. Verify database sessions for all devices
9. Query Redis blacklist for all three tokens

**Expected Result:**
- Device A logout succeeds with 200 OK
- Device A token blacklisted immediately
- Device A API calls return 401 Unauthorized
- Device B and C tokens remain valid (unaffected)
- Device B and C API calls succeed with 200
- Database shows:
  - Device A session: status = 'REVOKED'
  - Device B session: status = 'ACTIVE'
  - Device C session: status = 'ACTIVE'
- Logout event logs device and IP information for audit trail

**Actual Result:**
[To be filled during execution]

**Status:** Not Tested

---

#### TC-006: Logout Rate Limiting

**Feature:** Logout - Rate Limiting
**Type:** API
**Priority:** P2 (Medium)

**Preconditions:**
- Multiple valid authentication tokens
- Rate limit configured: 100 logout requests/hour

**Steps:**
1. Send 100 logout requests in quick succession (with valid tokens)
2. Send 101st logout request
3. Check response for 101st request
4. Verify X-RateLimit headers
5. Wait for rate limit reset window
6. Send logout request again

**Expected Result:**
- Requests 1-100 all succeed with 200 OK
- Request 101 returns 429 Too Many Requests
- Response headers include:
  - `X-RateLimit-Limit: 100`
  - `X-RateLimit-Remaining: 0`
  - `Retry-After: {seconds_until_reset}`
- Error message: "Çok fazla istek. Lütfen {N} saniye bekleyin"
- After rate limit window expires, request succeeds
- Rate limit applied per user, not global

**Actual Result:**
[To be filled during execution]

**Status:** Not Tested

---

### PASSWORD RESET FUNCTIONALITY TESTS

#### TC-007: Happy Path - Successful Password Reset Request

**Feature:** Password Reset - Request Phase
**Type:** API / Email Verification
**Priority:** P0 (Critical)

**Preconditions:**
- User exists in system with verified email
- User email: test@example.com
- No recent password reset requests (within rate limit window)
- Email service operational

**Steps:**
1. Send POST request to `/api/v1/auth/password/reset-request`
   ```json
   {
     "email": "test@example.com"
   }
   ```
2. Verify response status and body
3. Check email inbox for reset email (within 60 seconds)
4. Verify email content and reset link
5. Note reset token from email
6. Extract token validity period from email
7. Verify email sender address

**Expected Result:**
- Request returns 200 OK (regardless of email existence)
- Response body: `{"success": true, "message": "Şifre sıfırlama bağlantısı e-posta adresinize gönderilmiştir"}`
- Email received within 60 seconds
- Email subject: "Şifrenizi Sıfırlamak İçin Bağlantı"
- Email contains:
  - Reset link with token: `https://platform.com/password-reset?token={JWT_RESET_TOKEN}`
  - Expiry notice: "Bu bağlantı 1 saat geçerlidir"
  - User-friendly instructions in Turkish
  - Support contact information
  - Warning about sharing link
- Reset token is JWT with claims:
  - `scope: "password_reset"`
  - `email: "test@example.com"`
  - `exp: current_time + 3600` (1 hour)
  - `iat: current_timestamp`
  - `sub: user_id`
- Email from address: no-reply@platform.com
- Email is HTML formatted and plain text fallback

**Actual Result:**
[To be filled during execution]

**Status:** Not Tested

**Screenshots:**
[Attach email screenshot]

---

#### TC-008: Password Reset Request - Non-Existent Email (User Enumeration Prevention)

**Feature:** Password Reset - Security (Enumeration Prevention)
**Type:** API
**Priority:** P0 (Critical)

**Preconditions:**
- Email that doesn't exist in system: nonexistent@example.com
- Email service operational

**Steps:**
1. Send POST request with non-existent email:
   ```json
   {
     "email": "nonexistent@example.com"
   }
   ```
2. Record response time (A)
3. Send POST request with existing email:
   ```json
   {
     "email": "test@example.com"
   }
   ```
4. Record response time (B)
5. Repeat steps 1-4 ten times to measure variation
6. Check if non-existent email generates notification or log

**Expected Result:**
- Request returns 200 OK (same as valid email)
- Response body identical: `{"success": true, "message": "..."}`
- Response time similar (±50ms) for both existing and non-existing emails
- No email sent for non-existent address
- No user enumeration possible from response
- Response timing doesn't leak information about email existence
- Logs record attempt without exposing email existence status to client
- Rate limiting applied even for non-existent emails

**Actual Result:**
[To be filled during execution]

**Status:** Not Tested

---

#### TC-009: Password Reset Request - Rate Limiting (3 per email per hour)

**Feature:** Password Reset - Rate Limiting
**Type:** API
**Priority:** P0 (Critical)

**Preconditions:**
- Test email: ratelimit@example.com
- User exists
- No recent reset requests
- Rate limit window fresh

**Steps:**
1. Send reset request #1 for ratelimit@example.com
2. Send reset request #2 for ratelimit@example.com
3. Send reset request #3 for ratelimit@example.com
4. Send reset request #4 for ratelimit@example.com (should fail)
5. Wait 15 minutes and send request #5 (should still fail)
6. Wait remaining time to reach 1 hour and send request #6 (should succeed)
7. Record timestamps and response codes for all requests

**Expected Result:**
- Requests 1-3: 200 OK with email sent
- Request 4: 429 Too Many Requests
- Error code: `RATE_LIMIT_EXCEEDED`
- Error message: "Bu saatte çok fazla şifre sıfırlama talebiniz olmuş. Lütfen bir saat bekleyin."
- Response includes:
  - `X-RateLimit-Limit: 3`
  - `X-RateLimit-Remaining: 0`
  - `X-RateLimit-Reset: {unix_timestamp_of_hour_expiry}`
- Rate limit tracked per email (not IP)
- Request 5 (after 15 mins): Still 429 (window not expired)
- Request 6 (after 60 mins): 200 OK (window reset)
- Separate user same email: Subject to same rate limit (per email)
- Different user different email: Independent rate limit counter

**Actual Result:**
[To be filled during execution]

**Status:** Not Tested

---

#### TC-010: Password Reset - Token Validation and Expiry

**Feature:** Password Reset - Confirm Phase
**Type:** API
**Priority:** P0 (Critical)

**Preconditions:**
- Reset token generated and sent via email
- Token extracted from email link
- Expiry configured: 1 hour (3600 seconds)

**Steps:**
1. Extract valid reset token from email
2. Send POST request to `/api/v1/auth/password/reset` with valid token:
   ```json
   {
     "token": "{JWT_RESET_TOKEN}",
     "newPassword": "NewSecurePass123!"
   }
   ```
3. Verify immediate response
4. Test token 30 minutes later (still valid)
5. Test token 59 minutes later (at edge)
6. Test token 60 minutes 1 second later (expired)
7. Test manipulated/invalid token
8. Test token from different user attempt

**Expected Result:**
- Valid token: Returns 200 OK with password update confirmation
- 30-min check: Token valid, password update succeeds
- 59-min check: Token valid, password update succeeds
- 60-min 1-sec check: Returns 401 Unauthorized with "Token geçerliliği süresi dolmuş"
- Manipulated token: 401 Unauthorized with "Geçersiz token"
- Different user token attempt: 401 Unauthorized
- Token claims validated:
  - Check signature
  - Check expiry time
  - Verify scope = "password_reset"
  - Verify email matches user email
  - Check token not already used (Redis blacklist)

**Actual Result:**
[To be filled during execution]

**Status:** Not Tested

---

#### TC-011: Password Reset - Single-Use Token (No Token Reuse)

**Feature:** Password Reset - Token Reuse Prevention
**Type:** API
**Priority:** P0 (Critical)

**Preconditions:**
- Fresh reset token generated
- Token not yet used
- Email received with token

**Steps:**
1. Extract token from email
2. Send first reset request with new password:
   ```json
   {
     "token": "{TOKEN}",
     "newPassword": "FirstNewPass123!"
   }
   ```
3. Verify password change succeeds (200 OK)
4. Query database to confirm password updated
5. Try using same token again with different password:
   ```json
   {
     "token": "{TOKEN}",
     "newPassword": "SecondNewPass456!"
   }
   ```
6. Verify second request rejected
7. Login attempt with original password (should fail)
8. Login attempt with first new password (should succeed)
9. Login attempt with second new password (should fail)

**Expected Result:**
- First request: 200 OK, password updated in database
- Token added to Redis blacklist: `token:blacklist:{token_hash} = used_timestamp`
- Second request: 401 Unauthorized with message "Bu token zaten kullanılmış"
- Database password hashes:
  - Original hash removed
  - New hash (from request #1) stored
  - NOT updated with second attempt
- Login tests confirm only first new password works
- Token cannot be reused even with same email

**Actual Result:**
[To be filled during execution]

**Status:** Not Tested

---

#### TC-012: Password Reset - All Sessions Invalidated After Reset

**Feature:** Password Reset - Session Termination
**Type:** API / Backend Verification
**Priority:** P0 (Critical)

**Preconditions:**
- User logged in on Device A (with token A)
- User logged in on Device B (with token B)
- User has open session in database
- User has session in Redis
- Reset token generated and ready

**Steps:**
1. Before reset:
   - Verify Device A token valid (GET /api/v1/users/profile succeeds)
   - Verify Device B token valid (GET /api/v1/users/profile succeeds)
   - Query database for all user sessions (should see 2 ACTIVE)
   - Check Redis for active sessions (should see 2 entries)

2. Execute password reset:
   - Send POST /api/v1/auth/password/reset with new password
   - Verify 200 OK response

3. After reset:
   - Attempt Device A API call with old token A
   - Attempt Device B API call with old token B
   - Query database for user sessions
   - Check Redis session cache
   - Query user password hash (verify updated)

**Expected Result:**
- Before reset:
  - Both tokens return 200 OK for API calls
  - Database shows 2 sessions with status='ACTIVE'
  - Redis contains both session keys

- After reset:
  - Device A token returns 401 Unauthorized
  - Device B token returns 401 Unauthorized
  - Both tokens appear in Redis token blacklist
  - Database shows:
    - 2 sessions with status='REVOKED'
    - invalidated_at field populated
    - invalidated_reason='PASSWORD_RESET'
  - Redis sessions cleared for user
  - User password hash updated (bcrypt different)
  - Logout event recorded for all sessions
  - Email sent to user: "Şifreniz değiştirildi" with session termination notice

**Actual Result:**
[To be filled during execution]

**Status:** Not Tested

---

#### TC-013: Password Reset Confirmation Email

**Feature:** Password Reset - Email Notification
**Type:** Email / Functional
**Priority:** P1 (High)

**Preconditions:**
- Password reset completed successfully
- Email service operational
- User email: reset@example.com

**Steps:**
1. Complete password reset process
2. Check email inbox for confirmation email
3. Verify email received within 5 seconds
4. Examine email content
5. Verify email formatting (HTML + plain text)
6. Check for security warnings

**Expected Result:**
- Email received within 5 seconds of password update
- Subject: "Şifreniz Başarıyla Değiştirildi"
- Email body includes:
  - Confirmation message in Turkish
  - Timestamp of password change
  - IP address from which change made
  - Device/browser information
  - Security notice: "Bu şifre değişikliğini siz yapmadıysanız..."
  - Action link: "Hesabı Güvenli Hale Getir" (to 2FA setup)
  - Support email contact
  - Session termination notice: "Diğer tüm oturumlar kapatılmıştır"
- Email sender: no-reply@platform.com
- Email properly formatted with logo and branding
- Plain text version available

**Actual Result:**
[To be filled during execution]

**Status:** Not Tested

**Screenshots:**
[Attach email screenshot]

---

#### TC-014: Password Reset - Password Complexity Validation

**Feature:** Password Reset - Password Requirements
**Type:** API
**Priority:** P1 (High)

**Preconditions:**
- Valid reset token obtained
- Token: {VALID_RESET_TOKEN}

**Steps:**
Test each invalid password scenario:

1. Too short (< 8 chars):
   ```json
   {"token": "{VALID_RESET_TOKEN}", "newPassword": "Short1!"}
   ```

2. No uppercase:
   ```json
   {"token": "{VALID_RESET_TOKEN}", "newPassword": "lowercase123!"}
   ```

3. No lowercase:
   ```json
   {"token": "{VALID_RESET_TOKEN}", "newPassword": "UPPERCASE123!"}
   ```

4. No number:
   ```json
   {"token": "{VALID_RESET_TOKEN}", "newPassword": "NoNumber!ABC"}
   ```

5. No special character:
   ```json
   {"token": "{VALID_RESET_TOKEN}", "newPassword": "NoSpecial123ABC"}
   ```

6. Valid password:
   ```json
   {"token": "{VALID_RESET_TOKEN}", "newPassword": "NewSecurePass123!"}
   ```

**Expected Result:**
- All 5 invalid passwords return 400 Bad Request
- Error code: `PASSWORD_VALIDATION_FAILED`
- Validation errors returned:
  ```json
  {
    "success": false,
    "error": {
      "code": "PASSWORD_VALIDATION_FAILED",
      "message": "Şifre aşağıdaki gereksinimleri karşılamıyor",
      "details": {
        "requirements": [
          {"rule": "minimum_length", "required": 8, "current": 7, "status": "FAILED"},
          {"rule": "uppercase", "required": true, "status": "FAILED"},
          {"rule": "lowercase", "required": true, "status": "OK"},
          {"rule": "number", "required": true, "status": "OK"},
          {"rule": "special_char", "required": true, "status": "OK"}
        ]
      }
    }
  }
  ```
- Valid password returns 200 OK
- Password strength indicator calculated
- Token remains valid for retry (multiple validation attempts allowed)

**Actual Result:**
[To be filled during execution]

**Status:** Not Tested

---

### SECURITY TESTS

#### TC-015: User Enumeration Prevention - Timing Attack

**Feature:** Password Reset - Timing Attack Prevention
**Type:** Security / API
**Priority:** P0 (Critical)

**Preconditions:**
- Multiple test emails (both existing and non-existing)
- Benchmarking tools ready (JMeter, Apache Bench, or similar)
- Network latency baseline measured

**Steps:**
1. Send reset request with existing email: admin@platform.com
2. Send reset request with non-existent email: fakeemail123456@example.com
3. Measure response time for existing email (record 10x)
4. Measure response time for non-existent email (record 10x)
5. Calculate average response time for each
6. Perform statistical analysis (mean, std dev, 95th percentile)
7. Measure difference between the two groups

**Expected Result:**
- Response times for existing and non-existent emails show no significant difference
- Mean response time difference: < 50ms
- Standard deviation overlap: Should show ~95% confidence the times are similar
- Statistical test (t-test): p-value > 0.05 (no significant difference)
- Both return 200 OK with identical response body
- Database lookup time obfuscated with artificial delay if needed
- No database query count differences observable in logs
- No external timing side-channels (e.g., email sending completes before response)

**Actual Result:**
[To be filled during execution]

**Status:** Not Tested

**Note:** This test requires careful execution to avoid false positives from network variability

---

#### TC-016: SQL Injection in Password Reset Request

**Feature:** Password Reset - SQL Injection Protection
**Type:** Security / API
**Priority:** P0 (Critical)

**Preconditions:**
- Password reset endpoint ready
- Database monitoring available (query logs)

**Steps:**
1. Send reset request with SQL injection in email field:
   ```json
   {
     "email": "test@example.com' OR '1'='1"
   }
   ```

2. Send reset request with comment-based injection:
   ```json
   {
     "email": "test@example.com'; DROP TABLE users; --"
   }
   ```

3. Send reset request with UNION-based injection:
   ```json
   {
     "email": "test@example.com' UNION SELECT * FROM users --"
   }
   ```

4. Monitor database logs for actual SQL queries
5. Verify no unusual database activity
6. Check if legitimate users affected

**Expected Result:**
- All injection attempts return 400 Bad Request
- Error message: "Geçersiz email adresi"
- No SQL errors exposed to client
- Database query logs show:
  - Parameterized queries used
  - No actual malicious SQL executed
  - Injection strings treated as email literals
- No database modification
- No unauthorized data access
- No database errors logged
- Email validation applied server-side (RFC 5322)

**Actual Result:**
[To be filled during execution]

**Status:** Not Tested

---

#### TC-017: XSS in Password Reset Form

**Feature:** Password Reset - XSS Protection
**Type:** Security / E2E
**Priority:** P1 (High)

**Preconditions:**
- Password reset form accessible
- Browser developer tools available
- JavaScript execution monitoring enabled

**Steps:**
1. Access "Forgot Password" page
2. In email field, enter: `test@example.com"><script>alert('XSS')</script>`
3. Attempt to submit form
4. Check browser console for JavaScript execution
5. In new password field, enter: `<img src=x onerror="alert('XSS')">`
6. Observe field behavior

**Expected Result:**
- XSS payload in email field: Rejected by client-side validation or escaped on display
- No JavaScript execution in browser
- Alert box does not appear
- No errors in browser console related to script execution
- Form validation prevents submission with malicious content
- Backend escapes/sanitizes any data in error messages
- CSP headers prevent inline script execution
- Email input accepts only valid email addresses (RFC 5322)
- No stored XSS if email echoed in responses
- No reflected XSS in error messages

**Actual Result:**
[To be filled during execution]

**Status:** Not Tested

---

#### TC-018: CSRF Protection in Password Reset

**Feature:** Password Reset - CSRF Token Validation
**Type:** Security / API
**Priority:** P1 (High)

**Preconditions:**
- Password reset endpoint accessible via browser
- CSRF token implementation in place
- Attacker domain available (for cross-site test)

**Steps:**
1. Access password reset form at `/password-reset`
2. Inspect HTML source for CSRF token: `<input name="_csrf" value="..."`
3. Send POST request WITHOUT CSRF token:
   ```bash
   curl -X POST https://platform.com/api/v1/auth/password/reset-request \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com"}'
   ```
4. Send POST request WITH CSRF token from form
5. Send POST request WITH INVALID CSRF token
6. From attacker site, attempt to trigger password reset via form submission

**Expected Result:**
- Request without CSRF token:
  - If CSRF protection on: 403 Forbidden or 400 Bad Request
  - Message: "CSRF token hatası" or "İstek geçersiz"
  - No email sent

- Request with valid CSRF token:
  - 200 OK
  - Email sent successfully

- Request with invalid CSRF token:
  - 403 Forbidden
  - Message: "CSRF token geçersiz"

- Cross-site form submission:
  - Token validation fails
  - No password reset email sent
  - Browser SameSite cookie restriction prevents credential forwarding

**Actual Result:**
[To be filled during execution]

**Status:** Not Tested

---

#### TC-019: Token Brute Force Protection

**Feature:** Password Reset - Brute Force Prevention
**Type:** Security / API
**Priority:** P0 (Critical)

**Preconditions:**
- Multiple reset tokens generated
- Systematic approach to test tokens

**Steps:**
1. Generate valid reset token A for user@example.com
2. Attempt to use token on other user's password reset:
   - User B tries to reset password with Token A
3. Attempt to guess tokens by brute force:
   - Generate 1000 random tokens
   - Attempt reset with each
   - Monitor success rate
4. Monitor rate limiting on invalid token attempts
5. Check for account lockout mechanisms

**Expected Result:**
- Token from User A cannot reset User B's password:
  - Returns 400 Bad Request or 401 Unauthorized
  - Message: "Bu token bu hesap için geçerli değil"
  - No information about which user it belongs to

- Brute force attempt:
  - First 3-5 invalid token attempts: 400/401 Bad Request
  - After limit: 429 Too Many Requests
  - Rate limiting per IP (or global) activated
  - Account lockout NOT triggered (should not lock legitimate user)
  - Logs record suspicious activity

- Rate limit includes:
  - `X-RateLimit-Remaining: {N}`
  - `Retry-After: {seconds}`

**Actual Result:**
[To be filled during execution]

**Status:** Not Tested

---

### UI/UX TESTS

#### TC-020: Password Reset Form - Client-Side Validation

**Feature:** Password Reset UI - Forgot Password Form
**Type:** E2E / UI
**Priority:** P2 (Medium)

**Preconditions:**
- Browser accessible to application
- Password reset form loaded: `/forgot-password`
- JavaScript enabled

**Steps:**
1. Access forgot password page
2. Leave email field empty, attempt submit
3. Enter invalid email format: "notanemail"
4. Enter email with special chars: "test+spam@example.com"
5. Enter valid email: "test@example.com"
6. Click submit button
7. Observe loading state and success message

**Expected Result:**
- Empty field:
  - Red error border appears
  - Error message: "E-posta adresi zorunludur"
  - Submit button disabled or grayed out

- Invalid email format:
  - Red error border
  - Message: "Geçerli bir e-posta adresi girin"
  - Submit button disabled

- Special characters (valid):
  - No error
  - Email accepted: "test+spam@example.com"
  - Submit button enabled

- Valid email:
  - Green checkmark appears
  - Submit button enabled and highlighted

- After submit:
  - Loading spinner appears
  - Button text changes to: "Gönderiliyor..."
  - Button becomes disabled during submission
  - Success message appears: "Şifre sıfırlama bağlantısı gönderildi"
  - Redirects to confirmation page or shows modal

**Actual Result:**
[To be filled during execution]

**Status:** Not Tested

**Screenshots:**
[Attach form validation screenshots]

---

#### TC-021: Password Reset Form - Password Strength Indicator

**Feature:** Password Reset - Password Strength UI
**Type:** E2E / UI
**Priority:** P2 (Medium)

**Preconditions:**
- Password reset page loaded (after clicking link)
- Form with new password field displayed

**Steps:**
1. Type weak password: "pass"
   - Observe strength indicator
2. Type medium password: "Pass1234"
   - Observe strength indicator
3. Type strong password: "SecurePass123!@#"
   - Observe strength indicator
4. Type very strong password: "MyP@ssw0rd!Secure2025"
   - Observe strength indicator

**Expected Result:**
- Weak password:
  - Indicator shows red color
  - Label: "Zayıf"
  - Suggestion: "En az 8 karakter, büyük harf, küçük harf, sayı ve özel karakter gereklidir"

- Medium password:
  - Indicator shows yellow/orange
  - Label: "Orta"
  - Suggestion: "Daha güçlü bir şifre kullanın"

- Strong password:
  - Indicator shows green
  - Label: "Güçlü"
  - All requirement checks pass

- Very strong password:
  - Indicator shows dark green
  - Label: "Çok Güçlü"
  - Estimated strength calculation shown

- Visual feedback:
  - Strength bar shows progress
  - Requirements list shows checkmarks/X marks
  - Color transitions are smooth
  - Real-time update as user types

**Actual Result:**
[To be filled during execution]

**Status:** Not Tested

**Screenshots:**
[Attach strength indicator screenshots]

---

#### TC-022: Password Reset - Responsive Design (Mobile/Tablet)

**Feature:** Password Reset - Responsive UI
**Type:** E2E / UI
**Priority:** P1 (High)

**Preconditions:**
- Application accessible
- Browser DevTools for responsive testing
- Mobile emulation enabled

**Steps:**
1. Test on mobile (375px width - iPhone SE)
   - Load forgot password form
   - Enter email and submit
   - Verify form responsiveness

2. Test on tablet (768px width - iPad)
   - Repeat form interaction

3. Test on desktop (1920px width)
   - Verify layout

**Expected Result:**
- Mobile (375px):
  - Form fields full width with 16px padding
  - Button full width, finger-friendly size (48px min height)
  - Email input type="email" (shows email keyboard)
  - Password input type="password" (shows password keyboard)
  - No horizontal scrolling
  - Touch targets 48x48px minimum
  - Font size readable (16px minimum)

- Tablet (768px):
  - Form content centered
  - Form width 80% or max 600px
  - Two-column layout if applicable

- Desktop (1920px):
  - Centered form
  - Max width 500px
  - Proper spacing

- All breakpoints:
  - Form elements properly aligned
  - No text overflow
  - Images/icons scale correctly
  - Success/error messages visible and formatted

**Actual Result:**
[To be filled during execution]

**Status:** Not Tested

**Screenshots:**
[Attach responsive design screenshots for each breakpoint]

---

#### TC-023: Accessibility - Password Reset Form (WCAG 2.1 AA)

**Feature:** Password Reset - Accessibility
**Type:** E2E / Accessibility
**Priority:** P1 (High)

**Preconditions:**
- axe DevTools browser extension installed
- WAVE accessibility checker available
- Screen reader (NVDA for Windows or VoiceOver for Mac)

**Steps:**
1. Open forgot password page
2. Run axe-core accessibility scan
3. Run WAVE accessibility checker
4. Test with screen reader:
   - Tab through form elements
   - Activate buttons
   - Read error messages
5. Test keyboard-only navigation
6. Check color contrast ratios

**Expected Result:**
- axe-core scan:
  - No violations (critical)
  - Max 2 warnings

- WAVE results:
  - All form inputs properly labeled
  - Label tags associated with inputs: `<label for="email">`
  - Error messages marked as aria-live

- Screen reader (NVDA/VoiceOver):
  - Form title announced
  - Each input label announced clearly
  - Error messages announced when validation fails
  - Button purpose clear when focused
  - Success message announced when form submitted

- Keyboard navigation:
  - Tab key moves focus through form
  - Tab order logical (email → password → submit)
  - Enter key submits form
  - Escape key can close modals

- Color contrast:
  - Text vs background: 4.5:1 minimum
  - Form borders: 3:1 minimum
  - Error text (red): Sufficient contrast against background

**Actual Result:**
[To be filled during execution]

**Status:** Not Tested

**Accessibility Report:**
[Attach axe and WAVE reports]

---

---

## 3. EDGE CASES & ERROR SCENARIOS

#### TC-024: Session Timeout During Password Reset

**Feature:** Password Reset - Session Timeout
**Type:** E2E
**Priority:** P2 (Medium)

**Preconditions:**
- Reset token generated (expires in 1 hour)
- Session timeout configured: 15 minutes

**Steps:**
1. Click reset link from email
2. Start password reset form
3. Wait 16+ minutes without activity
4. Attempt to submit form with new password

**Expected Result:**
- Form submission fails
- Session expires message displayed
- User redirected to login or error page
- Request returns 401 Unauthorized with "Oturum süresi doldu"
- User must start process over (login → forgot password)

**Actual Result:**
[To be filled during execution]

**Status:** Not Tested

---

#### TC-025: Logout with Corrupted/Malformed Token

**Feature:** Logout - Token Validation
**Type:** API
**Priority:** P2 (Medium)

**Preconditions:**
- Invalid token formats available

**Steps:**
1. Send logout with JWT missing payload
2. Send logout with JWT missing signature
3. Send logout with random string instead of JWT
4. Send logout with null/empty Bearer token

**Expected Result:**
- All return 401 Unauthorized
- Error message: "Geçersiz token"
- No partial processing or security bypasses
- No stack trace exposed

**Actual Result:**
[To be filled during execution]

**Status:** Not Tested

---

#### TC-026: Password Reset with Unverified Email

**Feature:** Password Reset - Email Verification Requirement
**Type:** API
**Priority:** P1 (High)

**Preconditions:**
- User registered but email not yet verified
- Email verification pending

**Steps:**
1. Send password reset request for unverified email
2. Send POST request with reset token for unverified user
3. Attempt login with reset password

**Expected Result:**
- Reset request: 200 OK (cannot enumerate users)
- Email not sent for unverified address (optional: sent with warning)
- Reset token creation: May fail or warn about unverified email
- Login with reset password: Fails with "E-postanızı önce doğrulayın"

**Actual Result:**
[To be filled during execution]

**Status:** Not Tested

---

---

## 4. TEST EXECUTION ENVIRONMENT

### 4.1 Environment Configuration

**Test Environment:** Development / Staging
**API Base URL:** `https://api-dev.platform.com/api/v1`
**Frontend URL:** `https://dev.platform.com`
**Email Test Service:** `http://mailhog-dev:1025` (or equivalent)

### 4.2 Test Data Requirements

```json
{
  "testUsers": [
    {
      "email": "testuser1@example.com",
      "password": "InitialPass123!",
      "userId": "usr_test001",
      "verified": true
    },
    {
      "email": "testuser2@example.com",
      "password": "InitialPass456!",
      "userId": "usr_test002",
      "verified": true
    },
    {
      "email": "ratelimitTest@example.com",
      "password": "InitialPass789!",
      "userId": "usr_test003",
      "verified": true
    }
  ],
  "testEmails": [
    "nonexistent@example.com",
    "another-fake@domain.test"
  ]
}
```

### 4.3 Tools Required

- **API Testing:** Postman 10+, Newman, curl
- **E2E Testing:** Cypress 12+, Selenium
- **Email Testing:** MailHog, Mailtrap, or similar
- **Security Testing:** OWASP ZAP, Burp Suite Community
- **Accessibility:** axe DevTools, WAVE, NVDA/VoiceOver
- **Database Tools:** pgAdmin, DBeaver for PostgreSQL queries
- **Monitoring:** Redis CLI for token blacklist verification

---

## 5. TEST EXECUTION STRATEGY

### 5.1 Execution Phases

**Phase 1 - Unit Level Tests (Backend Team)**
- Password validation logic
- Token generation and expiry
- Session management database updates
- Email template rendering

**Phase 2 - API Integration Tests (QA - Automated)**
- All TC-001 through TC-026 (automated Postman/Newman)
- Security tests (TC-015 through TC-019)
- Rate limiting tests
- Database state verification

**Phase 3 - UI Integration Tests (QA - Manual + Cypress)**
- Form validation (TC-020, TC-021)
- Responsive design (TC-022)
- Accessibility (TC-023)
- User flow E2E (TC-001 through TC-006 as E2E)

**Phase 4 - Security Review**
- Penetration testing
- OWASP Top 10 verification
- Compliance audit

### 5.2 Test Execution Order

1. **Critical Path (must pass first)**
   - TC-001: Successful logout
   - TC-007: Successful password reset request
   - TC-011: Single-use token verification

2. **Security Tests (before sign-off)**
   - TC-015: User enumeration prevention
   - TC-016: SQL injection protection
   - TC-017: XSS protection
   - TC-018: CSRF protection
   - TC-019: Brute force protection

3. **Supporting Tests**
   - All remaining test cases

### 5.3 Success Criteria

- All P0 tests must pass: 100%
- All P1 tests must pass: 100%
- P2 tests must pass: 95%+
- Zero critical/high security vulnerabilities
- 80%+ code coverage for modified code
- All accessibility tests pass (WCAG 2.1 AA)

---

## 6. KNOWN LIMITATIONS & ASSUMPTIONS

### 6.1 Test Environment Assumptions
- Email service responds within 5 seconds
- Redis is operational and accessible
- Database is writable and queriable
- Time synchronization within ±5 seconds between services

### 6.2 Scope Limitations
- Does not test SMS-based password reset (out of scope for Story 1.4)
- Does not test social login password reset (future feature)
- Does not test biometric authentication logout (Story 1.3 2FA scope)

### 6.3 Known Issues to Track
- [To be filled during execution]
- [Document any blocker issues here]

---

## 7. SIGN-OFF CHECKLIST

- [ ] All test cases documented and reviewed
- [ ] Test environment validated and ready
- [ ] Test data prepared and loaded
- [ ] All P0/P1 tests executed and passed
- [ ] Security tests completed with no critical findings
- [ ] Accessibility audit passed
- [ ] Performance benchmarks within acceptable range
- [ ] Regression testing completed (related features unaffected)
- [ ] Bug reports filed for any failures
- [ ] Developer feedback incorporated
- [ ] Final acceptance signoff provided

---

## Document Control

**Version:** 1.0
**Created:** 2025-11-19
**Last Modified:** 2025-11-19
**Owner:** Senior QA Engineer
**Review Status:** Ready for Distribution
