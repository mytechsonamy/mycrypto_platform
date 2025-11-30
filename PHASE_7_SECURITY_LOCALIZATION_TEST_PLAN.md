# PHASE 7: Security & Localization Testing Plan
**Duration:** 2 hours
**Start Date:** November 30, 2025
**Status:** PENDING

---

## PART A: SECURITY TESTING

### 1. Input Validation Testing

#### TC-SEC-INPUT-001: SQL Injection Prevention
**Feature:** Input Validation & Security
**Type:** Security
**Priority:** P0 (Critical)

**Preconditions:**
- All input forms available
- Postman or curl ready
- Database monitoring enabled

**Steps:**
1. **Email Field SQL Injection:**
   - Enter: `" OR "1"="1`
   - Enter: `admin'--`
   - Enter: `" UNION SELECT * FROM users--`
2. **Password Field:**
   - Enter: `' OR '1'='1`
   - Enter: `"; DROP TABLE users;--`
3. **Form Fields (IBAN, Name):**
   - Enter: `1'; DELETE FROM wallets WHERE '1'='1`
   - Enter: SQL keywords in normal fields
4. **API Direct Testing:**
   - POST to /api/v1/auth/register with SQL payloads
   - POST to /api/v1/orders with SQL payloads
5. **Monitor:**
   - Database logs for SQL errors
   - Application logs for injection attempts
   - Error messages (should not expose SQL)

**Expected Result:**
- All SQL injection attempts blocked
- Input treated as literal string
- No SQL syntax errors in logs
- Error messages user-friendly (no SQL exposed)
- Database not modified
- No unexpected queries executed
- Requests logged for audit

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

#### TC-SEC-INPUT-002: XSS (Cross-Site Scripting) Prevention
**Feature:** Input Validation & Security
**Type:** Security
**Priority:** P0 (Critical)

**Preconditions:**
- All input forms available
- Developer console ready

**Steps:**
1. **Basic XSS Payload:**
   - Full Name field: `<script>alert('XSS')</script>`
   - Email field: `test@example.com<script>alert('XSS')</script>`
2. **Event Handler XSS:**
   - IBAN field: `<img src=x onerror=alert('XSS')>`
   - TC Kimlik: `<svg onload=alert('XSS')>`
3. **HTML Injection:**
   - Name field: `<h1>Hacked</h1>`
   - Any text field: `<iframe src="http://evil.com"></iframe>`
4. **DOM-based XSS:**
   - Manipulate URL parameters
   - Try modifying localStorage
5. **Verify:**
   - Content displayed as literal text (escaped)
   - Script tags appear as text, not executed
   - No alerts triggered
   - HTML not rendered as markup
   - Console shows no errors
   - Event handlers not executed

**Expected Result:**
- All XSS payloads blocked
- HTML characters escaped (<, >, ", etc.)
- No JavaScript executed
- Content displayed as literal text
- No DOM manipulation from user input
- Security headers prevent inline scripts (CSP)
- Input sanitized before storage and display

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

#### TC-SEC-INPUT-003: CSRF (Cross-Site Request Forgery) Protection
**Feature:** CSRF Token Validation
**Type:** Security
**Priority:** P0 (Critical)

**Preconditions:**
- User logged in
- Browser DevTools Network tab open

**Steps:**
1. **Capture CSRF Token:**
   - View form source (Inspect Element)
   - Find hidden input with CSRF token
   - Verify token present on all forms
2. **Form Submission Without Token:**
   - Capture a form submission request
   - Replay request without CSRF token
   - Verify request is rejected
3. **Form Submission With Invalid Token:**
   - Modify token value in request
   - Submit form
   - Verify request is rejected
4. **State-Changing Operations:**
   - Test withdrawal form
   - Test 2FA setup
   - Test profile update
   - Verify all have CSRF tokens
5. **Same-Origin Verification:**
   - Check Referer header validation

**Expected Result:**
- All forms include CSRF token
- Token changes on each page load
- Invalid tokens rejected (403 Forbidden)
- Missing tokens rejected (403 Forbidden)
- State-changing ops protected
- Token validated on server
- Proper error message on failure

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

#### TC-SEC-INPUT-004: Rate Limiting Enforced
**Feature:** Brute Force Protection
**Type:** Security
**Priority:** P1 (High)

**Preconditions:**
- Login/registration forms available
- API endpoints accessible

**Steps:**
1. **Registration Rate Limit (5 attempts/hour/IP):**
   - Attempt registration 6 times rapidly
   - Verify 6th attempt blocked
   - Check error message
   - Wait and verify rate limit resets
2. **Login Rate Limit (5 failed attempts):**
   - Attempt login with wrong password 5 times
   - Verify account locked
   - Check lockout notification email
   - Verify unlock after 30 minutes (or test unlock mechanism)
3. **Password Reset Rate Limit (3 requests/hour):**
   - Request password reset 3 times rapidly
   - Verify 4th request blocked
   - Check rate limit response
4. **API Rate Limiting:**
   - Make rapid API requests to /api/v1/orders
   - Verify rate limit header response (429 Too Many Requests)
   - Check retry-after header

**Expected Result:**
- Rate limits enforce configured thresholds
- User-friendly error messages
- Rate limit headers present (Rate-Limit, Retry-After)
- Lockouts logged for audit
- Email notifications on lockout
- Account automatically unlocks after period

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

### 2. Authentication Security Testing

#### TC-SEC-AUTH-001: JWT Token Validation
**Feature:** Token Security
**Type:** Security
**Priority:** P0 (Critical)

**Preconditions:**
- User logged in (capture JWT token)
- Postman or curl ready

**Steps:**
1. **Valid Token Test:**
   - Capture JWT from login response
   - Use token in Authorization header
   - Access protected endpoint
   - Verify success (200)
2. **Invalid Token Test:**
   - Modify token value (change 1 character)
   - Try accessing protected endpoint
   - Verify rejection (401 Unauthorized)
3. **Expired Token Test:**
   - Verify JWT has expiration (exp claim)
   - Extract expiration time
   - Verify token valid until expiration
   - Test after expiration
   - Verify rejection (401)
4. **Token Structure:**
   - Decode JWT (jwt.io)
   - Verify signature is present
   - Check claims: exp, iat, userId, etc.
   - Verify no sensitive data in JWT
5. **Token in Request:**
   - Verify token sent in Authorization header
   - Verify not in URL or cookie
   - Test missing token (401)
   - Test malformed header (401)

**Expected Result:**
- Valid tokens accepted
- Invalid tokens rejected (401)
- Expired tokens rejected (401)
- Token signature verified
- Token claims present and valid
- Sensitive data not in JWT
- Token lifecycle respected
- 401 errors don't leak information

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

#### TC-SEC-AUTH-002: Token Expiration & Refresh
**Feature:** Token Lifecycle
**Type:** Security
**Priority:** P1 (High)

**Preconditions:**
- User logged in
- Access and refresh tokens captured

**Steps:**
1. **Access Token Expiration:**
   - Capture access token (15 min expiry)
   - Verify exp claim = 15 minutes from iat
   - Wait until near expiration (or manipulate system time)
   - Try using expired token
   - Verify rejection (401)
2. **Refresh Token Working:**
   - Capture refresh token (30 days expiry)
   - After access token expires, use refresh token
   - POST /api/v1/auth/refresh with refresh token
   - Verify new access token issued
   - Verify new token valid for 15 minutes
3. **Refresh Token Expiration:**
   - Verify refresh token expires after 30 days
   - Test with expired refresh token
   - Verify rejection (401)
   - Verify forced re-login
4. **Token Blacklist:**
   - Logout user
   - Try using old tokens
   - Verify both access and refresh rejected

**Expected Result:**
- Access token expires after 15 minutes
- Refresh token expires after 30 days
- Refresh endpoint issues new access token
- Expired refresh token rejected
- Logout invalidates both tokens
- Tokens not reusable after logout
- Token rotation on refresh (optional but good)

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

#### TC-SEC-AUTH-003: 2FA Bypass Prevention
**Feature:** Two-Factor Authentication Security
**Type:** Security
**Priority:** P0 (Critical)

**Preconditions:**
- Test account with 2FA enabled
- Postman ready

**Steps:**
1. **Login Without 2FA Code:**
   - Enter correct email and password
   - Try to skip 2FA screen
   - Try accessing protected endpoints without 2FA
   - Verify all attempts rejected
2. **Invalid 2FA Code:**
   - Enter email/password correctly
   - Enter invalid 2FA code
   - Verify rejection after 3 attempts
   - Verify lockout (rate limit)
3. **Backup Codes Security:**
   - Generate backup codes
   - Use backup code in 2FA field
   - Verify it works
   - Try using same code again
   - Verify single-use enforcement
4. **Session Without 2FA:**
   - Create session without completing 2FA
   - Try accessing wallet (requires full auth)
   - Verify access denied
   - Verify forced 2FA completion
5. **2FA Disable Security:**
   - Try disabling 2FA without TOTP code
   - Try disabling 2FA without email verification
   - Verify both required for disable

**Expected Result:**
- 2FA required for all protected operations
- Invalid codes rejected (max 3 attempts)
- Backup codes single-use only
- Cannot bypass 2FA authentication
- Session incomplete without 2FA
- 2FA cannot be disabled without verification
- No way to access account without 2FA if enabled

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

### 3. Authorization Testing

#### TC-SEC-AUTHZ-001: User Cannot Access Others' Data
**Feature:** Data Isolation
**Type:** Security
**Priority:** P0 (Critical)

**Preconditions:**
- At least 2 test user accounts (testuser1, testuser2)
- Both users logged in (in separate sessions)

**Steps:**
1. **Capture User IDs:**
   - Login as testuser1, capture user_id from token
   - Logout
   - Login as testuser2, capture user_id
2. **Direct API Access:**
   - As testuser2, try accessing testuser1's endpoint:
     - GET /api/v1/users/[testuser1_id]
     - GET /api/v1/wallet/[testuser1_id]/balances
     - GET /api/v1/orders?user_id=[testuser1_id]
   - Verify all rejected (403 Forbidden)
3. **Parameter Manipulation:**
   - Try changing user_id in request
   - Try changing in URL path
   - Try changing in query parameters
   - Try changing in request body
   - Verify all attempts rejected
4. **Transaction Access:**
   - As testuser2, try viewing testuser1's transactions
   - Verify access denied
5. **Cross-Wallet Transfers:**
   - Try transferring from testuser1's wallet
   - Verify transfer fails
   - Verify audit log records attempt

**Expected Result:**
- Cannot access other users' data
- Cannot modify other users' data
- All unauthorized access logged
- Clear error messages (403 Forbidden)
- No information leakage about other users
- User ID not enumerable
- Audit trail records all attempts

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

#### TC-SEC-AUTHZ-002: Role-Based Access Control
**Feature:** Permission System
**Type:** Security
**Priority:** P1 (High)

**Preconditions:**
- User with different roles (user, admin, moderator)
- Endpoints with role requirements

**Steps:**
1. **Standard User Access:**
   - Login as regular user
   - Try accessing admin endpoints:
     - GET /api/v1/admin/users
     - GET /api/v1/admin/kyc-reviews
     - POST /api/v1/admin/lock-account
   - Verify all rejected (403 Forbidden)
2. **Admin User Access:**
   - Login as admin
   - Verify access to admin endpoints
   - Verify cannot be escalated by regular user
3. **Role-Based UI:**
   - As regular user, verify admin menu not shown
   - As admin, verify admin menu visible
   - Check URL manipulation
   - Try accessing /admin routes as user
   - Verify redirected or 403

**Expected Result:**
- Roles properly enforced
- Users cannot escalate privileges
- Admin-only endpoints protected
- Admin-only UI hidden from users
- Direct URL access checked
- Proper error messages (403)
- Audit log of privilege checks

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

#### TC-SEC-AUTHZ-003: KYC Level Enforcement
**Feature:** Compliance Controls
**Type:** Security
**Priority:** P1 (High)

**Preconditions:**
- Test accounts with different KYC levels
- Account with KYC_PENDING
- Account with KYC_REJECTED
- Account with KYC_APPROVED

**Steps:**
1. **Unverified User (no KYC):**
   - Try depositing TRY: should be rejected
   - Try withdrawing TRY: should be rejected
   - Try trading: should be blocked
   - Try depositing crypto: may be allowed (verify spec)
2. **Pending KYC:**
   - Submit KYC
   - Try immediate withdrawal
   - Verify request queued or rejected
3. **Approved KYC:**
   - Complete KYC
   - Verify can deposit up to 50K TRY/day
   - Verify can withdraw up to 50K TRY/day
   - Try exceeding limit
   - Verify rejection with clear message
4. **Rejected KYC:**
   - Submit KYC with invalid data
   - Get rejection
   - Verify cannot withdraw
   - Verify "Retry" option available
5. **Level Boundaries:**
   - At 50K limit, try adding 1 TRY more
   - Verify rejection
   - Try next day, verify limit resets

**Expected Result:**
- Unverified users cannot withdraw
- Pending KYC users cannot withdraw
- Approved KYC users respect daily limits
- Rejected users must resubmit
- Daily limits enforced and reset
- Clear error messages about KYC requirements
- Cannot bypass verification

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

#### TC-SEC-AUTHZ-004: Withdrawal Limits Enforced
**Feature:** Transaction Controls
**Type:** Security
**Priority:** P1 (High)

**Preconditions:**
- KYC approved account
- Sufficient balance for testing

**Steps:**
1. **Daily Limit (50K TRY/day for LEVEL_1):**
   - Withdraw 25K TRY (success)
   - Withdraw 25K TRY (success, total 50K)
   - Try withdrawing 1 TRY more (fail)
   - Verify error message mentions daily limit
2. **Per-Transaction Limit (if any):**
   - Check if per-transaction limit exists
   - Try exceeding it
   - Verify appropriate rejection
3. **Minimum Withdrawal:**
   - Try withdrawing < 100 TRY
   - Verify rejection
4. **Maximum Withdrawal:**
   - Try withdrawing > 50K TRY in single transaction
   - Verify rejected
5. **Limit Reset:**
   - Wait until next day (or adjust system time)
   - Verify limit resets
   - Can withdraw another 50K

**Expected Result:**
- Daily limits enforced
- Per-transaction limits enforced
- Minimum withdrawal enforced
- Clear error messages
- Limits reset properly
- Cannot accumulate limits across days
- Audit log tracks all limit violations

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

### 4. Data Protection Testing

#### TC-SEC-DATA-001: Sensitive Data Not in Logs
**Feature:** Logging Security
**Type:** Security
**Priority:** P1 (High)

**Preconditions:**
- Application logs accessible
- Log aggregation tool available

**Steps:**
1. **Login and Capture Logs:**
   - Perform login with email/password
   - Check application logs
   - Verify no passwords logged
   - Verify no API keys logged
   - Verify no 2FA codes logged
2. **Withdrawal and Capture Logs:**
   - Perform withdrawal
   - Check logs for:
     - IBAN number (should be masked)
     - Account holder name (may be logged)
     - Withdrawal amount (safe to log)
3. **KYC Submission:**
   - Submit KYC with personal data
   - Check logs for:
     - TC Kimlik (should not be in logs)
     - Date of birth (should not be in logs)
     - Phone number (should be masked)
4. **Error Logs:**
   - Trigger errors
   - Verify error messages don't leak sensitive data
   - Verify stack traces don't expose credentials

**Expected Result:**
- No passwords in any logs
- No API keys or tokens in logs
- No full IBAN numbers in logs
- No full TC Kimlik in logs
- Sensitive data masked (e.g., **** for partial IBAN)
- Error messages user-friendly
- Stack traces only in dev logs
- Logs properly retained and rotated

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

#### TC-SEC-DATA-002: Passwords Properly Hashed
**Feature:** Password Security
**Type:** Security
**Priority:** P0 (Critical)

**Preconditions:**
- Database access for inspection
- Password hash inspection tool

**Steps:**
1. **Check Password Hash Algorithm:**
   - Access user record in database
   - Verify password_hash field
   - Check algorithm used (should be Argon2id)
   - Verify NOT plaintext, MD5, SHA1, or SHA256
2. **Hash Validation:**
   - Verify hash contains salt
   - Verify hash length appropriate (Argon2id = 97+ chars)
   - Verify hashes different for same password (salt)
3. **Hash Update on Password Change:**
   - Change password
   - Verify old hash discarded
   - Verify new hash different
   - Verify new hash valid
4. **Bcrypt/Scrypt Parameters (if used):**
   - Verify work factor >= 12 (bcrypt)
   - Verify not too fast (< 100ms to hash)
   - Verify not too slow (> 1s to hash)

**Expected Result:**
- All passwords hashed with Argon2id
- Hashes contain salt
- Hash length appropriate
- No plaintext passwords
- Hashes properly updated
- Work factors adequate
- Different hashes for same password input

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

#### TC-SEC-DATA-003: SSL/TLS Verification
**Feature:** Encryption in Transit
**Type:** Security
**Priority:** P0 (Critical)

**Preconditions:**
- HTTPS enforced
- SSL certificate installed

**Steps:**
1. **HTTPS Verification:**
   - Navigate to http://localhost:3000 (not HTTPS)
   - Verify redirect to https://
   - Or verify connection refused
2. **Certificate Validity:**
   - View certificate (lock icon in browser)
   - Verify certificate valid (not expired)
   - Verify certificate matches domain
   - Verify certificate chain trusted
3. **Protocol Version:**
   - Check SSL/TLS version (should be TLS 1.2+)
   - Not SSL 3.0, TLS 1.0, or TLS 1.1
4. **Cipher Strength:**
   - Use SSL Labs or similar to check ciphers
   - Verify strong ciphers used
   - Verify weak ciphers disabled
5. **API Calls:**
   - Monitor Network tab
   - Verify all API calls HTTPS
   - Verify no mixed content (HTTPS page with HTTP resources)
6. **WebSocket:**
   - Verify WebSocket uses WSS (secure)
   - Not WS (unencrypted)

**Expected Result:**
- All traffic HTTPS/TLS
- HTTP redirects to HTTPS
- Valid certificate
- TLS 1.2 or higher
- Strong ciphers only
- No mixed content
- WebSocket uses WSS
- Secure flags on cookies

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

#### TC-SEC-DATA-004: No Data Exposure in Responses
**Feature:** API Response Security
**Type:** Security
**Priority:** P1 (High)

**Preconditions:**
- API running
- Postman or curl ready
- User logged in

**Steps:**
1. **User Data Endpoint:**
   - GET /api/v1/users/profile
   - Verify response only includes needed fields
   - Verify no password_hash included
   - Verify no internal IDs exposed unnecessarily
2. **Transaction List:**
   - GET /api/v1/transactions
   - Verify only user's transactions returned
   - Verify no other users' data leaked
   - Verify sensitive fields masked (IBAN, TC Kimlik)
3. **Error Response:**
   - Trigger error (e.g., invalid order)
   - Verify error message user-friendly
   - Verify no sensitive data in error
   - Verify no stack traces
4. **Pagination:**
   - Request /api/v1/transactions?page=999999
   - Verify reasonable page size
   - Verify no data leakage with invalid page
   - Verify proper offset calculation
5. **Field Filtering:**
   - Try requesting extra fields: ?fields=password,internal_id
   - Verify only allowed fields returned
   - Verify no field injection

**Expected Result:**
- Only necessary fields in responses
- No password hashes exposed
- No sensitive data unmasked
- User-friendly error messages
- No data leakage on errors
- Reasonable pagination
- Field access controlled
- API responses consistent

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

### 5. API Security Testing

#### TC-SEC-API-001: CORS Properly Configured
**Feature:** Cross-Origin Security
**Type:** Security
**Priority:** P1 (High)

**Preconditions:**
- API running
- Different origin available for testing (e.g., different port)

**Steps:**
1. **CORS Headers Check:**
   - Make request to API from different origin
   - Check response headers for CORS headers
   - Expected headers:
     - Access-Control-Allow-Origin
     - Access-Control-Allow-Methods
     - Access-Control-Allow-Headers
   - Verify origin matches whitelist
2. **Preflight Request:**
   - Make cross-origin POST request
   - Verify browser sends OPTIONS preflight
   - Verify server responds with CORS headers
3. **Allowed Methods:**
   - Verify GET, POST, PUT, DELETE properly allowed
   - Verify methods not in whitelist are blocked
4. **Allowed Headers:**
   - Verify Authorization header allowed
   - Verify Content-Type header allowed
   - Verify custom headers if any are allowed
5. **Credentials:**
   - Verify credentials allowed if needed
   - Verify not too permissive

**Expected Result:**
- CORS headers properly configured
- Only allowed origins accepted
- Credentials handled securely
- Methods restricted appropriately
- Headers validated
- Preflight requests handled
- No wildcard (*) on sensitive endpoints

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

#### TC-SEC-API-002: Security Headers Verified
**Feature:** HTTP Security Headers
**Type:** Security
**Priority:** P1 (High)

**Preconditions:**
- API running
- Browser DevTools or curl

**Steps:**
1. **Capture Response Headers:**
   - Make request to API
   - Capture all response headers
   - Check for each header:
2. **X-Content-Type-Options:**
   - Should be: nosniff
   - Prevents MIME type sniffing
3. **X-Frame-Options:**
   - Should be: DENY or SAMEORIGIN
   - Prevents clickjacking
4. **X-XSS-Protection:**
   - Should be: 1; mode=block
   - Browser XSS protection
5. **Content-Security-Policy:**
   - Should restrict script sources
   - Should restrict form submissions
   - Should restrict frame embedding
6. **Strict-Transport-Security:**
   - Should be present
   - Should include max-age
   - Should include includeSubDomains
7. **Referrer-Policy:**
   - Should restrict referrer info

**Expected Result:**
- All security headers present
- Values appropriate for API
- CSP properly configured
- HSTS enabled
- Headers enforced consistently
- No conflicting headers

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

#### TC-SEC-API-003: DDoS Protection
**Feature:** Attack Mitigation
**Type:** Security
**Priority:** P2 (Medium)

**Preconditions:**
- API running
- Rate limiting configured
- DDoS protection tools available

**Steps:**
1. **Rate Limiting:**
   - Make rapid requests to API
   - Verify 429 Too Many Requests after threshold
   - Verify rate limit headers present
2. **Connection Limits:**
   - Open many connections
   - Verify graceful handling
   - Verify no server crash
3. **Payload Size Limits:**
   - Send very large POST body
   - Verify request rejected (413 Payload Too Large)
   - Verify reasonable limit (~10MB)
4. **Timeout Protection:**
   - Send request and don't complete
   - Verify server times out
   - Verify connection cleaned up

**Expected Result:**
- Rate limiting enforced
- Connection limits respected
- Payload size limits enforced
- Timeouts prevent resource exhaustion
- Graceful error handling
- No server crashes from attacks

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

---

## PART B: LOCALIZATION TESTING

### 1. Turkish Language Support

#### TC-LOC-TR-001: UI Text Translated to Turkish
**Feature:** Turkish Localization
**Type:** Localization
**Priority:** P1 (High)

**Preconditions:**
- Frontend with Turkish language support
- Language selector (if available) or manual Turkish content

**Steps:**
1. **Change Language to Turkish:**
   - Navigate to Settings
   - Find language/locale setting
   - Change to "Türkçe" or "Turkish"
   - Reload page
2. **Verify All Text Translated:**
   - Check each page/screen
   - Verify no English text remaining:
     - Labels, buttons, placeholders
     - Headings, menus, links
     - Error messages, alerts, notifications
     - Tooltips, help text
   - List any untranslated text
3. **Pages to Check:**
   - Home/Landing
   - Login page
   - Registration page
   - Dashboard
   - Trading page
   - Wallet page
   - Settings page
   - Help/FAQ

**Expected Result:**
- All UI text in Turkish
- No English words except proper nouns
- No mixed Turkish/English
- Currency symbols used (₺ for TRY, $ for USD)
- Date format correct (DD.MM.YYYY)
- No HTML tags visible
- Text readable and properly formatted

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

#### TC-LOC-TR-002: Date & Time Formatting
**Feature:** Localization Formatting
**Type:** Localization
**Priority:** P1 (High)

**Preconditions:**
- Turkish language selected
- Pages with dates/times loaded

**Steps:**
1. **Date Format Verification:**
   - Check transaction dates
   - Check order timestamps
   - Check profile creation date
   - Expected format: DD.MM.YYYY (e.g., 30.11.2025)
   - NOT MM/DD/YYYY (e.g., 11/30/2025)
2. **Time Format:**
   - Check transaction times
   - Check order times
   - Expected format: HH:MM:SS or HH:MM (e.g., 14:30:45)
   - 24-hour format, not 12-hour (no AM/PM)
3. **Combined Date-Time:**
   - Check if combined format is correct
   - Should be: DD.MM.YYYY HH:MM:SS
4. **Timezone Handling:**
   - Verify times are in user's timezone or clearly marked
   - Should show Istanbul time (UTC+3) or labeled UTC

**Expected Result:**
- All dates in DD.MM.YYYY format
- All times in 24-hour format
- Combined date-time correct
- Timezone properly handled
- No US date format (MM/DD/YYYY)
- No 12-hour format (AM/PM)

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

#### TC-LOC-TR-003: Currency Formatting
**Feature:** Localization Formatting
**Type:** Localization
**Priority:** P1 (High)

**Preconditions:**
- Turkish language selected
- Wallet and trading pages loaded

**Steps:**
1. **Turkish Lira (TRY) Formatting:**
   - Check balance display: should be "1.234,56 ₺" (comma for decimal)
   - NOT "1,234.56 TRY" (dot for thousand separator)
   - Verify ₺ symbol used (not "TL")
   - Verify space between amount and symbol
   - Example: "1.000,00 ₺" (1000 TRY)
2. **Cryptocurrency Formatting:**
   - Check BTC, ETH, USDT balances
   - Should use 8 decimal places minimum
   - Example: "0.12345678 BTC"
   - Should NOT use thousands separator
3. **Price Display:**
   - Check BTC/TRY prices in order book
   - Example: "500.000 TRY" (thousands with period)
   - Check decimal separator (comma for decimals)
4. **Fees & Percentages:**
   - Check fee amounts
   - Check percentage displays
   - Verify consistent formatting

**Expected Result:**
- TRY amounts show ₺ symbol
- Decimal separator is comma (,)
- Thousands separator is period (.)
- Format: 1.234,56 ₺
- Cryptocurrency amounts 8+ decimals
- No "TL" abbreviation
- Consistent formatting across platform

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

#### TC-LOC-TR-004: Form Validation Messages Translated
**Feature:** Error Message Localization
**Type:** Localization
**Priority:** P1 (High)

**Preconditions:**
- Turkish language selected
- Registration/login forms loaded

**Steps:**
1. **Empty Field Validation:**
   - Leave email empty, tab to next field
   - Verify error message in Turkish
   - Expected: "Bu alan zorunludur" or "Lütfen bu alanı doldurun"
2. **Invalid Email:**
   - Enter "notanemail"
   - Verify error: "Geçerli bir e-posta adresi girin"
3. **Weak Password:**
   - Enter "weak"
   - Verify error message in Turkish
   - Verify strength indicator in Turkish
4. **Mismatched Passwords:**
   - Password and confirm don't match
   - Verify error: "Şifreler eşleşmiyor"
5. **Duplicate Email:**
   - Register twice with same email
   - Verify error: "Bu email zaten kayıtlı"
6. **IBAN Validation:**
   - Enter invalid IBAN
   - Verify error: "Geçerli bir IBAN girin"
7. **Form Success:**
   - Complete form correctly
   - Verify success message in Turkish
   - Expected: "Kaydınız başarıyla tamamlandı"

**Expected Result:**
- All validation messages in Turkish
- Messages are clear and actionable
- Messages guide user to fix
- Messages appear in correct location
- No HTML entities or escape sequences
- Correct Turkish spelling and grammar

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

### 2. Compliance & Regulations

#### TC-LOC-COMP-001: KVKK (Turkish Data Protection) Compliance
**Feature:** Turkish Data Protection Law Compliance
**Type:** Compliance
**Priority:** P0 (Critical)

**Preconditions:**
- Privacy policy available
- Terms of service available
- KVKK text in Turkish

**Steps:**
1. **KVKK Consent on Registration:**
   - View registration form
   - Verify KVKK consent checkbox
   - Verify text is:
     - In Turkish
     - Clear and understandable
     - Refers to KVKK (Kişisel Verileri Koruma Kanunu)
     - Mentions data processing
   - Verify cannot register without consent
2. **Privacy Policy:**
   - Access privacy policy
   - Verify:
     - In Turkish
     - Explains data collection
     - Mentions KVKK compliance
     - States user rights
     - States data retention periods
3. **Right to be Forgotten:**
   - Verify user can request account deletion
   - Verify process documented
   - Verify data properly deleted (GDPR/KVKK requirement)
4. **Data Export:**
   - Verify user can export their data
   - Verify data format (JSON or CSV)
   - Verify includes all personal data
5. **Consent Management:**
   - Verify user can manage consents
   - Verify can withdraw consent
   - Verify process documented

**Expected Result:**
- KVKK consent clearly requested
- Text in Turkish and clear
- Privacy policy comprehensive
- Data export available
- Deletion process available
- Consent withdrawal available
- Records of consent kept

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

#### TC-LOC-COMP-002: Financial Regulations Compliance
**Feature:** Turkish Financial Regulations
**Type:** Compliance
**Priority:** P1 (High)

**Preconditions:**
- KYC forms available
- Terms clearly state limits

**Steps:**
1. **KYC Requirements:**
   - Verify KYC LEVEL_1 requirements met
   - Verify form asks for:
     - Full name
     - TC Kimlik (Turkish ID number)
     - Date of birth
     - Phone number
2. **Daily Limits (LEVEL_1):**
   - Verify 50K TRY/day deposit limit
   - Verify 50K TRY/day withdrawal limit
   - Verify limits enforced in code
   - Verify user informed of limits
3. **Market Pairs:**
   - Verify only BTC/TRY, ETH/TRY, USDT/TRY available
   - No other pairs
4. **Order Types:**
   - Verify only Market and Limit orders
   - No advanced orders (Stop-Loss, OCO, etc.)
5. **Terms & Conditions:**
   - Check T&Cs mention:
     - Financial limits
     - User responsibilities
     - Risk disclaimers
     - Dispute resolution (Turkish law)

**Expected Result:**
- KYC requirements met
- Daily limits enforced
- Only approved market pairs
- Only approved order types
- Terms mention regulations
- User understands limits
- Compliance controls in place

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

#### TC-LOC-COMP-003: Exchange Licensing & Disclaimers
**Feature:** Regulatory Disclosures
**Type:** Compliance
**Priority:** P1 (High)

**Preconditions:**
- Home page and terms available
- License information documented

**Steps:**
1. **Exchange License Display:**
   - Check home/footer for exchange license info
   - Verify includes:
     - License number (if applicable)
     - Issuing authority
     - Expiration date (if applicable)
   - Verify updated and current
2. **Risk Disclaimers:**
   - Trading page should state:
     - "Kripto varlık ticareti yüksek risklidir"
     - Risk of losing investment
   - Before first trade, disclaimer must be accepted
3. **Financial Advice Disclaimer:**
   - Verify platform doesn't give financial advice
   - Verify no "buy/sell recommendations"
   - Verify states "educational purposes only" if applicable
4. **Customer Support & Complaints:**
   - Verify contact info for complaints
   - Verify dispute process documented
   - Verify mentions regulatory authority

**Expected Result:**
- License information displayed (if required)
- Risk disclaimers prominent
- User understands risks
- No unlicensed advice given
- Complaint process clear
- Compliance information accessible

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

#### TC-LOC-COMP-004: KYC/AML Requirements Met
**Feature:** Know Your Customer & Anti-Money Laundering
**Type:** Compliance
**Priority:** P0 (Critical)

**Preconditions:**
- KYC submission process
- User account created

**Steps:**
1. **KYC Verification Steps:**
   - New user must complete KYC before trading
   - KYC form requests required information:
     - Full name
     - TC Kimlik (national ID)
     - Date of birth
     - Nationality
     - Residential address
   - Verify document upload:
     - ID front and back
     - Selfie with ID
     - Proof of residence (optional for LEVEL_1?)
2. **Verification Process:**
   - Submit KYC
   - Status shows "Beklemede" (Pending)
   - Manual or automated review
   - Approval or rejection with reason
3. **Limits Based on KYC:**
   - LEVEL_1 (approved): 50K TRY/day
   - LEVEL_1 (rejected): No withdrawals until resubmit
   - LEVEL_1 (pending): May not withdraw (verify spec)
4. **AML Checks:**
   - Verify system checks for suspicious patterns:
     - Rapid deposits and withdrawals
     - Unusual transaction sizes
     - Transactions to high-risk countries
   - Verify transaction monitoring (manual review if flagged)

**Expected Result:**
- KYC required before trading
- All required information collected
- Document upload supports required formats
- Verification process documented
- Status updates communicated
- Daily limits enforced by KYC level
- AML monitoring in place

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

## 6. Test Results Summary

### Security Tests
| Test Case | Status | Pass/Fail | Notes |
|-----------|--------|-----------|-------|
| TC-SEC-INPUT-001 | [ ] | [ ] | |
| TC-SEC-INPUT-002 | [ ] | [ ] | |
| TC-SEC-INPUT-003 | [ ] | [ ] | |
| TC-SEC-INPUT-004 | [ ] | [ ] | |
| TC-SEC-AUTH-001 | [ ] | [ ] | |
| TC-SEC-AUTH-002 | [ ] | [ ] | |
| TC-SEC-AUTH-003 | [ ] | [ ] | |
| TC-SEC-AUTHZ-001 | [ ] | [ ] | |
| TC-SEC-AUTHZ-002 | [ ] | [ ] | |
| TC-SEC-AUTHZ-003 | [ ] | [ ] | |
| TC-SEC-AUTHZ-004 | [ ] | [ ] | |
| TC-SEC-DATA-001 | [ ] | [ ] | |
| TC-SEC-DATA-002 | [ ] | [ ] | |
| TC-SEC-DATA-003 | [ ] | [ ] | |
| TC-SEC-DATA-004 | [ ] | [ ] | |
| TC-SEC-API-001 | [ ] | [ ] | |
| TC-SEC-API-002 | [ ] | [ ] | |
| TC-SEC-API-003 | [ ] | [ ] | |

### Localization Tests
| Test Case | Status | Pass/Fail | Notes |
|-----------|--------|-----------|-------|
| TC-LOC-TR-001 | [ ] | [ ] | |
| TC-LOC-TR-002 | [ ] | [ ] | |
| TC-LOC-TR-003 | [ ] | [ ] | |
| TC-LOC-TR-004 | [ ] | [ ] | |
| TC-LOC-COMP-001 | [ ] | [ ] | |
| TC-LOC-COMP-002 | [ ] | [ ] | |
| TC-LOC-COMP-003 | [ ] | [ ] | |
| TC-LOC-COMP-004 | [ ] | [ ] | |

---

## Next Steps
1. Execute all security tests
2. Execute all localization tests
3. Document results
4. Report any violations
5. Create Phase 7 Completion Report
6. Proceed to Phase 8 (Regression & Sign-Off)
