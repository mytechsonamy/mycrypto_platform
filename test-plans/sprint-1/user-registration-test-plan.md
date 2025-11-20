# User Registration Test Plan (Story 1.1)

**Document Version:** 1.0
**Last Updated:** 2025-11-19
**Test Lead:** QA Team
**Feature:** User Registration (Story 1.1)
**Priority:** P0 (Critical)
**Sprint:** Sprint 1

---

## Executive Summary

This test plan covers comprehensive testing for User Registration functionality. The feature allows new users to register with email and password, with password strength validation, email verification, consent checkboxes, and reCAPTCHA protection.

**Test Coverage Goals:**
- 95% of acceptance criteria coverage
- Happy path + error scenarios + edge cases
- Security testing (SQL injection, XSS, CSRF)
- Accessibility compliance (WCAG 2.1 Level AA)
- Performance baseline establishment

---

## Scope

### In Scope
- User registration form UI and validation
- Email/password input validation
- Password strength indicator
- Duplicate email detection
- Terms & Conditions checkbox requirement
- KVKK (Privacy Policy) consent requirement
- reCAPTCHA v3 integration
- Email verification process
- API endpoint: `POST /api/v1/auth/register`
- Email template rendering
- Rate limiting (5 attempts per IP per hour)

### Out of Scope
- Social login (SSO, Google, Apple) - Future feature
- Email resend functionality - Story 1.2
- Account recovery after verification failure
- International phone number validation

---

## Acceptance Criteria Mapping

| AC # | Acceptance Criteria | Test Case ID | Type |
|------|---------------------|--------------|------|
| 1 | User can enter email, password (min 8 chars, 1 uppercase, 1 number, 1 special) | TC-001 to TC-010 | Functional |
| 2 | Email verification link sent within 60 seconds | TC-011 to TC-013 | Functional |
| 3 | Email verification expires in 24 hours | TC-014 | Functional |
| 4 | User sees success message after email verification | TC-015 to TC-016 | Functional |
| 5 | Duplicate email shows error: "Bu email zaten kayıtlı" | TC-017 to TC-018 | Functional |
| 6 | Password strength indicator displayed (weak/medium/strong) | TC-019 to TC-021 | Functional |
| 7 | Terms & Conditions checkbox required (v1.0 dated 2025-11-19) | TC-022 to TC-023 | Functional |
| 8 | KVKK consent checkbox required | TC-024 to TC-025 | Functional |
| 9 | reCAPTCHA v3 validation (score > 0.5) | TC-026 to TC-027 | Functional |
| - | SQL Injection attempts blocked | TC-100 to TC-102 | Security |
| - | XSS attempts blocked | TC-103 to TC-105 | Security |
| - | CSRF protection | TC-106 | Security |
| - | Rate limiting enforced | TC-107 to TC-108 | Security |
| - | Form accessibility (WCAG 2.1 AA) | TC-109 to TC-115 | Accessibility |

---

## Test Environment Requirements

### Development Environment
- **Backend API:** `http://localhost:3000` (Auth Service - NestJS)
- **Frontend:** `http://localhost:3001` (React)
- **Database:** PostgreSQL 16 (local)
- **Cache:** Redis 7 (local)
- **Email Service:** Mock/Dev (mailhog or similar)
- **reCAPTCHA:** Test keys (bypass in dev mode)

### Test Data
- See `/test-data/registration-test-data.json`
- Valid/invalid email addresses
- Password combinations (weak, medium, strong)
- Turkish character test cases (ç, ğ, ı, ö, ş, ü)

---

## Test Execution Strategy

### Phase 1: Manual Testing (Day 1-2)
1. **UI Form Testing** - Validate form rendering, field behavior
2. **Input Validation** - Test email/password formats
3. **API Testing** - Postman collection execution
4. **Email Verification** - Check email sending and verification flow
5. **Security Testing** - Manual injection attempts

### Phase 2: Automated Testing (Day 3)
1. **E2E Tests** - Cypress test suite execution
2. **API Tests** - Newman CLI (Postman collection)
3. **Accessibility Scan** - axe-core automated scan

### Phase 3: Regression (Day 4)
1. Re-execute all tests after bug fixes
2. Generate final coverage report

---

## Detailed Test Cases

### Test Case Group 1: Valid Password Entry

#### TC-001: Valid password - All requirements met

**Feature:** User Registration
**Type:** Functional / UI
**Priority:** P0 (Critical)

**Preconditions:**
- Frontend is loaded at `/register` page
- All form fields are visible and enabled
- JavaScript is enabled in browser

**Steps:**
1. Navigate to `http://localhost:3001/register`
2. Click on "Email" input field
3. Enter email: `testuser.valid001@example.com`
4. Click on "Password" input field
5. Enter password: `ValidPass123!`
6. Verify password strength indicator displays
7. Verify both checkboxes (Terms & KVKK) are unchecked
8. Scroll down to see "Register" button (verify it's disabled)
9. Check both checkboxes: "Kullanım Koşullarını Kabul Ediyorum" and "KVKK Onayı"
10. Verify "Register" button becomes enabled
11. Click "Register" button

**Expected Result:**
- Step 2: Email field is focused with cursor visible
- Step 3: Email text is accepted without validation error
- Step 5: Password characters are masked (shown as dots/asterisks)
- Step 6: Password strength indicator shows "STRONG" (green) because password contains:
  - Length: 13 characters (≥8 required)
  - Uppercase: V, P (≥1 required)
  - Number: 1, 2, 3 (≥1 required)
  - Special: ! (≥1 required)
- Step 8: Register button is visually disabled (grayed out, not clickable)
- Step 10: Register button becomes enabled (clickable, blue background)
- Step 11: Form submits, success message appears: "Kayıt başarılı! Lütfen email'inizi kontrol edin."

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach screenshots showing successful registration]

---

#### TC-002: Valid password - Minimum requirements only

**Feature:** User Registration
**Type:** Functional / UI
**Priority:** P0 (Critical)

**Preconditions:**
- Frontend loaded at `/register`
- Database is clean (no existing users)

**Steps:**
1. Enter email: `minreq.user@test.com`
2. Enter password: `Qwerty1!` (8 characters: Q=upper, 1=number, !=special)
3. Check both checkboxes
4. Click "Register"

**Expected Result:**
- Password strength indicator shows "MEDIUM" (yellow)
- Password is accepted (meets minimum requirements)
- Registration succeeds with verification email sent
- Email should arrive within 60 seconds

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach if failed]

---

#### TC-003: Valid password - Complex (strong)

**Feature:** User Registration
**Type:** Functional / UI
**Priority:** P0 (Critical)

**Preconditions:**
- Frontend loaded at `/register`

**Steps:**
1. Enter email: `complex.user@crypto.com`
2. Enter password: `Tr0pical$Sunset#2025@`
3. Observe password strength indicator
4. Check both checkboxes
5. Submit registration

**Expected Result:**
- Password strength shows "STRONG" (green)
- All characters display as masked dots
- Registration succeeds
- Email verification sent within 60 seconds

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach if failed]

---

### Test Case Group 2: Invalid Password Entry

#### TC-004: Password too short (7 characters)

**Feature:** User Registration
**Type:** Functional / Validation
**Priority:** P0 (Critical)

**Preconditions:**
- Frontend loaded at `/register`

**Steps:**
1. Enter email: `short.pwd@test.com`
2. Enter password: `Abcd1!` (only 6 chars)
3. Click outside password field (blur event)
4. Observe error message

**Expected Result:**
- Error message displays: "Şifre en az 8 karakter olmalıdır"
- Password strength indicator shows "WEAK" (red)
- Register button remains disabled
- Form is not submitted

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach validation error]

---

#### TC-005: Password missing uppercase letter

**Feature:** User Registration
**Type:** Functional / Validation
**Priority:** P0 (Critical)

**Preconditions:**
- Frontend loaded at `/register`

**Steps:**
1. Enter email: `noupper@test.com`
2. Enter password: `lowercase1!`
3. Blur password field
4. Observe validation

**Expected Result:**
- Error message shows: "Şifre en az bir büyük harf içermelidir"
- Password strength: "WEAK"
- Register button disabled
- No form submission

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach if failed]

---

#### TC-006: Password missing number

**Feature:** User Registration
**Type:** Functional / Validation
**Priority:** P0 (Critical)

**Preconditions:**
- Frontend loaded at `/register`

**Steps:**
1. Enter email: `nonumber@test.com`
2. Enter password: `ValidPass!` (no digits)
3. Blur password field

**Expected Result:**
- Error: "Şifre en az bir sayı içermelidir"
- Password strength: "WEAK"
- Register disabled

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach if failed]

---

#### TC-007: Password missing special character

**Feature:** User Registration
**Type:** Functional / Validation
**Priority:** P0 (Critical)

**Preconditions:**
- Frontend loaded at `/register`

**Steps:**
1. Enter email: `nospchar@test.com`
2. Enter password: `ValidPass123` (no special chars)
3. Blur password field

**Expected Result:**
- Error: "Şifre en az bir özel karakter (!@#$%^&*) içermelidir"
- Password strength: "WEAK"
- Register disabled

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach if failed]

---

#### TC-008: Password with unsafe special characters

**Feature:** User Registration
**Type:** Functional / Validation
**Priority:** P1 (High)

**Preconditions:**
- Frontend loaded at `/register`

**Steps:**
1. Enter email: `unsafe.chars@test.com`
2. Enter password: `ValidPass<script>`
3. Blur password field

**Expected Result:**
- Password accepted (special chars allowed)
- Verify special chars are properly escaped in API request
- Password strength indicator shows appropriate level

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach if failed]

---

#### TC-009: Very long password (1000+ characters)

**Feature:** User Registration
**Type:** Functional / Edge Case
**Priority:** P1 (High)

**Preconditions:**
- Frontend loaded at `/register`

**Steps:**
1. Enter email: `longpwd@test.com`
2. Generate password: 1000+ characters including upper, lower, number, special
3. Paste into password field
4. Verify field behavior

**Expected Result:**
- Password field accepts input (no hard limit on display)
- Form submission is allowed
- API validation checks for max length (e.g., 256 chars)
- If exceeds max: Error message "Şifre maksimum 256 karakter olabilir"
- If within limits: Registration proceeds

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach if failed]

---

#### TC-010: Password contains spaces

**Feature:** User Registration
**Type:** Functional / Edge Case
**Priority:** P1 (High)

**Preconditions:**
- Frontend loaded at `/register`

**Steps:**
1. Enter email: `spaces.pwd@test.com`
2. Enter password: `Valid Pass1!` (space in middle)
3. Blur field

**Expected Result:**
- Clarify behavior: Are spaces allowed?
- Expected: Spaces should be allowed (OWASP allows)
- Should pass validation if other requirements met
- Or: Error if spaces are not allowed: "Şifre boşluk içeremez"

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach if failed]

---

### Test Case Group 3: Email Validation

#### TC-011: Valid email formats - Various domains

**Feature:** User Registration
**Type:** Functional / Validation
**Priority:** P0 (Critical)

**Preconditions:**
- Frontend loaded at `/register`

**Steps:**
1. Test Case A: Enter email `user@example.com`
   - Verify no error shown
   - Enter valid password
   - Check checkboxes
   - Submit
2. Test Case B: Enter email `firstname.lastname@example.co.uk`
   - Verify accepted
3. Test Case C: Enter email `user+tag@example.com`
   - Verify accepted
4. Test Case D: Enter email `user123@test-domain.org`
   - Verify accepted

**Expected Result:**
- All valid email formats are accepted
- No validation error
- Form can be submitted
- API accepts the registration

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach if failed]

---

#### TC-012: Invalid email formats

**Feature:** User Registration
**Type:** Functional / Validation
**Priority:** P0 (Critical)

**Preconditions:**
- Frontend loaded at `/register`

**Steps:**
1. Test Case A: Enter `notanemail` (no @)
2. Test Case B: Enter `@example.com` (no local part)
3. Test Case C: Enter `user@` (no domain)
4. Test Case D: Enter `user@@example.com` (double @)
5. Test Case E: Enter `user@.com` (no domain name)
6. For each, blur field and observe

**Expected Result:**
- Each invalid email shows error: "Lütfen geçerli bir email adresi girin"
- Register button stays disabled
- No form submission

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach all validation errors]

---

#### TC-013: Email with Turkish characters

**Feature:** User Registration
**Type:** Functional / Validation
**Priority:** P1 (High)

**Preconditions:**
- Frontend loaded at `/register`
- Browser encoding set to UTF-8

**Steps:**
1. Enter email: `kullanıcı@örnek.com` (with Turkish chars)
2. Try to submit

**Expected Result:**
- Either: Email is accepted (RFC 6531 allows international emails)
- Or: Error message shown: "Email yalnızca ASCII karakterler içerebilir"
- Verify behavior is consistent and documented

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach if failed]

---

#### TC-014: Email case sensitivity

**Feature:** User Registration
**Type:** Functional / Edge Case
**Priority:** P1 (High)

**Preconditions:**
- Backend configured to treat emails as case-insensitive (standard)
- Database has test user: `testuser@example.com`

**Steps:**
1. Register with email: `TestUser@example.com`
2. Verify it's treated as duplicate of `testuser@example.com`
3. Error should appear: "Bu email zaten kayıtlı"

**Expected Result:**
- Email comparison is case-insensitive
- User receives duplicate email error
- No duplicate account created

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach if failed]

---

#### TC-015: Email whitespace handling

**Feature:** User Registration
**Type:** Functional / Edge Case
**Priority:** P1 (High)

**Preconditions:**
- Frontend loaded at `/register`

**Steps:**
1. Enter email: `  testuser@example.com  ` (with leading/trailing spaces)
2. Submit registration

**Expected Result:**
- Frontend trims whitespace: `testuser@example.com`
- Or: Shows validation error requesting user to remove spaces
- API also trims whitespace before processing
- Consistent behavior across all inputs

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach if failed]

---

### Test Case Group 4: Duplicate Email & Existing Accounts

#### TC-016: Duplicate email (case-insensitive)

**Feature:** User Registration
**Type:** Functional / Business Logic
**Priority:** P0 (Critical)

**Preconditions:**
- Database contains existing user: `john.doe@example.com`
- Frontend loaded at `/register`

**Steps:**
1. Enter email: `john.doe@example.com`
2. Enter valid password: `SecurePass123!`
3. Check both checkboxes
4. Click Register

**Expected Result:**
- API returns error (HTTP 409 or 400)
- Frontend displays error: "Bu email zaten kayıtlı"
- Form is not cleared (user can edit and retry)
- No account is created
- No verification email sent

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach error message]

---

#### TC-017: Duplicate email with different password attempt

**Feature:** User Registration
**Type:** Functional / Security
**Priority:** P1 (High)

**Preconditions:**
- Database has: `existing@test.com` (already registered)
- Frontend loaded at `/register`

**Steps:**
1. Enter email: `existing@test.com`
2. Enter password: `DifferentPass456!`
3. Check checkboxes
4. Click Register

**Expected Result:**
- Same error as TC-016: "Bu email zaten kayıtlı"
- Does NOT reveal password information
- No information about existing account leaked
- Rate limit counter might increment (check if applicable)

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach if failed]

---

### Test Case Group 5: Email Verification Flow

#### TC-018: Email verification link sent within 60 seconds

**Feature:** User Registration
**Type:** Functional / Email
**Priority:** P0 (Critical)

**Preconditions:**
- Dev email service (mailhog) running on `http://localhost:1025`
- Frontend loaded at `/register`
- Mailhog UI at `http://localhost:8025`

**Steps:**
1. Register new user: Email `verify.test001@example.com`, Password `TestPass123!`
2. Check both checkboxes and submit
3. Note current time (T0)
4. Open Mailhog UI
5. Observe inbox for new email
6. Record time when email arrives (T1)
7. Calculate elapsed time: T1 - T0

**Expected Result:**
- Email arrives within 60 seconds (T1 - T0 <= 60s)
- Email sender: `noreply@cryptoexchange.com`
- Email subject: `Lütfen email adresinizi doğrulayın`
- Email contains verification link: `/auth/verify-email?token=<JWT>`
- Link is valid and clickable

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach mailhog screenshot showing email]

---

#### TC-019: Email verification link expires after 24 hours

**Feature:** User Registration
**Type:** Functional / Email
**Priority:** P0 (Critical)

**Preconditions:**
- User registered and email sent
- JWT library configured with 24h expiry for verification tokens
- Current time can be mocked (use system clock or test framework)

**Steps:**
1. Register user: `expire.test@example.com`
2. Capture verification link from email
3. Extract JWT token from link
4. Verify token claims: `exp` field should be current_time + 86400 seconds (24h)
5. In test environment:
   - Advance system clock by 24h + 1 minute
   - OR manually create expired token with same structure
6. Click verification link (or call verification endpoint with expired token)
7. Observe error

**Expected Result:**
- Error message: "Doğrulama linki süresi dolmuş. Lütfen tekrar kayıt olun."
- HTTP 401 or 400 response
- User account remains unverified
- User can register again with same email (if no rate limit)

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach error message and token details]

---

#### TC-020: User sees success message after email verification

**Feature:** User Registration
**Type:** Functional / Email Verification
**Priority:** P0 (Critical)

**Preconditions:**
- User registered: `success.verify@example.com`
- Email with verification link received
- Browser window open

**Steps:**
1. Get verification link from email: `/auth/verify-email?token=JWT`
2. Click link or navigate to URL
3. Observe browser behavior
4. Wait for page load (should redirect to login or success page)
5. Observe success message

**Expected Result:**
- Page redirects to: `/auth/verify-success` or `/login`
- Success message displays: "Email adresiniz başarıyla doğrulandı! Şimdi giriş yapabilirsiniz."
- Button "Giriş Yap" links to login page
- User can now login with email + password

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach success page]

---

### Test Case Group 6: Checkbox & Consent Requirements

#### TC-021: Terms & Conditions checkbox required

**Feature:** User Registration
**Type:** Functional / Compliance
**Priority:** P0 (Critical)

**Preconditions:**
- Frontend loaded at `/register`

**Steps:**
1. Fill email: `checkbox.test@example.com`
2. Fill password: `ValidPass123!`
3. Leave "Terms & Conditions" checkbox UNCHECKED
4. Check ONLY "KVKK" checkbox
5. Try to click Register button

**Expected Result:**
- Register button is DISABLED (grayed out)
- Hover over Register shows tooltip: "Lütfen kullanım koşullarını kabul edin"
- Or: After clicking disabled button, error shows: "Lütfen kullanım koşullarını kabul edin"
- Form is not submitted

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach disabled button and tooltip]

---

#### TC-022: KVKK consent checkbox required

**Feature:** User Registration
**Type:** Functional / Compliance
**Priority:** P0 (Critical)

**Preconditions:**
- Frontend loaded at `/register`

**Steps:**
1. Fill email: `kvkk.test@example.com`
2. Fill password: `ValidPass123!`
3. Check "Terms & Conditions" checkbox
4. Leave "KVKK" checkbox UNCHECKED
5. Try to click Register button

**Expected Result:**
- Register button is DISABLED
- Tooltip or error: "Lütfen kişisel verilerin işlenmesini onaylayın"
- No submission

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach disabled state]

---

#### TC-023: Both checkboxes required together

**Feature:** User Registration
**Type:** Functional / Compliance
**Priority:** P0 (Critical)

**Preconditions:**
- Frontend loaded at `/register`

**Steps:**
1. Fill email and password (valid)
2. Leave BOTH checkboxes unchecked
3. Try to click Register

**Expected Result:**
- Register button DISABLED
- Both checkboxes must be checked to enable button
- After checking BOTH: Button becomes enabled

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach enabled state with both checked]

---

#### TC-024: Verify Terms & Conditions link

**Feature:** User Registration
**Type:** Functional / Compliance
**Priority:** P1 (High)

**Preconditions:**
- Frontend loaded at `/register`
- Terms document available at `/terms` or external link

**Steps:**
1. Click on "Kullanım Koşulları" link (if clickable)
2. Observe page/modal

**Expected Result:**
- Opens Terms & Conditions document (v1.0, dated 2025-11-19)
- Should show current terms version
- Link opens in new tab or modal (doesn't lose form state)
- User can read terms and return to form

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach terms page]

---

#### TC-025: Verify KVKK consent link

**Feature:** User Registration
**Type:** Functional / Compliance
**Priority:** P1 (High)

**Preconditions:**
- Frontend loaded at `/register`

**Steps:**
1. Click on "KVKK Onayı" or "Gizlilik Politikası" link
2. Observe document

**Expected Result:**
- Privacy policy document opens (new tab/modal)
- Shows current version
- User can return to registration form
- Form state preserved

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach privacy policy page]

---

### Test Case Group 7: reCAPTCHA Integration

#### TC-026: reCAPTCHA v3 integration present

**Feature:** User Registration
**Type:** Functional / Security
**Priority:** P0 (Critical)

**Preconditions:**
- Frontend loaded at `/register`
- reCAPTCHA v3 configured with test keys (bypass in dev)
- Browser developer tools open (Network tab)

**Steps:**
1. Fill registration form (all valid)
2. Check both checkboxes
3. Open Network tab in DevTools
4. Click Register
5. Observe network requests
6. Look for request to `www.google.com/recaptcha/api.js` or similar

**Expected Result:**
- Network request shows reCAPTCHA token request
- Request includes `key=<test_key>`
- API endpoint receives `recaptchaToken` in request body
- Backend validates token: score > 0.5
- If score OK: Registration proceeds
- If score low: Error "Lütfen tekrar deneyin" (bot-like behavior detected)

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach network tab showing reCAPTCHA request]

---

#### TC-027: reCAPTCHA token validation backend

**Feature:** User Registration
**Type:** Functional / Security
**Priority:** P0 (Critical)

**Preconditions:**
- Backend API endpoint: `POST /api/v1/auth/register`
- reCAPTCHA keys configured

**Steps:**
1. Create manual API request (Postman) to register endpoint
2. Include valid email, password, checkboxes
3. Include reCAPTCHA token:
   - Case A: Valid token (from frontend)
   - Case B: Expired token
   - Case C: Invalid token
   - Case D: Missing token

**Expected Result:**
- Case A (valid): Registration succeeds
- Case B (expired): HTTP 400 "reCAPTCHA token expired"
- Case C (invalid): HTTP 400 "reCAPTCHA validation failed"
- Case D (missing): HTTP 400 "reCAPTCHA token required"

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach Postman responses]

---

### Test Case Group 8: Password Strength Indicator

#### TC-028: Weak password strength indicator

**Feature:** User Registration
**Type:** Functional / UI
**Priority:** P1 (High)

**Preconditions:**
- Frontend loaded at `/register`

**Steps:**
1. Enter email: `indicator.test@example.com`
2. Enter password: `Weak1!` (6 chars - too short)
3. Observe strength indicator bar below password field

**Expected Result:**
- Strength indicator shows "WEAK" label
- Bar color is RED
- Bar fills only ~25% width
- Message: "Zayıf şifre" or similar

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach indicator display]

---

#### TC-029: Medium password strength indicator

**Feature:** User Registration
**Type:** Functional / UI
**Priority:** P1 (High)

**Preconditions:**
- Frontend loaded at `/register`

**Steps:**
1. Enter email: `medium.test@example.com`
2. Enter password: `Qwerty1!` (8 chars, meets minimum)
3. Observe strength indicator

**Expected Result:**
- Strength indicator shows "MEDIUM"
- Bar color is YELLOW/ORANGE
- Bar fills ~65% width
- Message: "Orta seviye şifre" or similar

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach indicator display]

---

#### TC-030: Strong password strength indicator

**Feature:** User Registration
**Type:** Functional / UI
**Priority:** P1 (High)

**Preconditions:**
- Frontend loaded at `/register`

**Steps:**
1. Enter email: `strong.test@example.com`
2. Enter password: `VeryStr0ng!P@ss#2025` (complex, long)
3. Observe strength indicator

**Expected Result:**
- Strength indicator shows "STRONG"
- Bar color is GREEN
- Bar fills 100% width
- Message: "Güçlü şifre" or similar

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach indicator display]

---

### Test Case Group 9: Security Testing - SQL Injection

#### TC-031: SQL injection in email field

**Feature:** User Registration
**Type:** Security / Input Validation
**Priority:** P0 (Critical)

**Preconditions:**
- Frontend loaded at `/register`
- Backend ORM/prepared statements configured

**Steps:**
1. Enter email: `' OR '1'='1`
2. Enter valid password
3. Check checkboxes
4. Try to submit

**Expected Result:**
- Email is rejected (not a valid email format)
- Or: Email is parameterized in database query (safe)
- No SQL error
- No database schema exposed
- Error message: "Lütfen geçerli bir email adresi girin"

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach validation or error response]

---

#### TC-032: SQL injection in password field

**Feature:** User Registration
**Type:** Security / Input Validation
**Priority:** P0 (Critical)

**Preconditions:**
- Frontend loaded at `/register`

**Steps:**
1. Enter email: `safe@example.com`
2. Enter password: `Pass123!"; DROP TABLE users; --`
3. Check checkboxes
4. Submit

**Expected Result:**
- Password accepted (contains valid characters)
- API uses parameterized queries (password is data, not SQL)
- Registration succeeds
- Users table NOT dropped
- Database is safe

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach successful registration, not SQL error]

---

#### TC-033: SQL injection with Unicode bypass attempt

**Feature:** User Registration
**Type:** Security / Input Validation
**Priority:** P1 (High)

**Preconditions:**
- Frontend loaded at `/register`

**Steps:**
1. Enter email with SQL characters: `test%27 UNION SELECT * --%40test.com`
2. Submit form

**Expected Result:**
- Input is treated as data (literal string)
- Email validation rejects it (invalid format)
- No SQL execution
- Backend parameterized queries protect even if validation bypassed

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach if failed]

---

### Test Case Group 10: Security Testing - XSS (Cross-Site Scripting)

#### TC-034: XSS in email field with script tag

**Feature:** User Registration
**Type:** Security / Input Validation
**Priority:** P0 (Critical)

**Preconditions:**
- Frontend loaded at `/register`

**Steps:**
1. Enter email: `<script>alert('XSS')</script>@test.com`
2. Enter valid password
3. Check checkboxes
4. Submit

**Expected Result:**
- Email validation rejects (not valid email format)
- No JavaScript execution (no alert popup)
- Validation error shown: "Lütfen geçerli bir email adresi girin"

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach validation message, no alert]

---

#### TC-035: XSS in password with event handler

**Feature:** User Registration
**Type:** Security / Input Validation
**Priority:** P0 (Critical)

**Preconditions:**
- Frontend loaded at `/register`

**Steps:**
1. Enter email: `safe@example.com`
2. Enter password: `Pass123!"><img src=x onerror="alert('XSS')">`
3. Check checkboxes
4. Submit registration
5. Observe if any script executes during registration or display

**Expected Result:**
- Password accepted as text (special chars allowed)
- No JavaScript execution
- No alert popup
- Password stored safely (escaped/hashed)
- If API displays this password anywhere: Must be HTML-escaped
- Registration succeeds

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach successful registration, no alert]

---

#### TC-036: XSS in verification email link

**Feature:** User Registration
**Type:** Security / Email Safety
**Priority:** P0 (Critical)

**Preconditions:**
- User registered and verification email sent
- Mailhog UI available

**Steps:**
1. Register user: `xss.test@example.com`
2. Check verification email in Mailhog
3. Inspect email HTML source
4. Look for verification link
5. Verify link is properly escaped (no unescaped user input in href)

**Expected Result:**
- Link format: `/auth/verify-email?token=<JWT>`
- User email is NOT in the link (only token)
- Token is signed JWT (cannot be manipulated)
- Email content is HTML-escaped
- Clicking link is safe (no XSS payload execution)

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach email HTML source]

---

### Test Case Group 11: Rate Limiting & Brute Force Protection

#### TC-037: Rate limiting - 5 attempts per IP per hour

**Feature:** User Registration
**Type:** Security / Rate Limiting
**Priority:** P0 (Critical)

**Preconditions:**
- Single IP address (e.g., 127.0.0.1 in dev)
- Rate limiter configured: 5 attempts/hour per IP

**Steps:**
1. Attempt registration with invalid data (failed validation) 5 times
   - Attempt 1: `invalid.email1` (invalid email)
   - Attempt 2: `invalid.email2` (invalid email)
   - Attempt 3: `invalid.email3` (invalid email)
   - Attempt 4: `invalid.email4` (invalid email)
   - Attempt 5: `invalid.email5` (invalid email)
2. Record timestamp of 5th attempt
3. Attempt registration 6th time: `valid@example.com` with valid password

**Expected Result:**
- First 5 attempts: Handled normally with validation errors
- 6th attempt (from same IP): HTTP 429 "Too Many Requests"
- Error message: "Çok fazla deneme yaptınız. Lütfen daha sonra tekrar deneyin."
- Rate limit reset after 1 hour

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach HTTP 429 response]

---

#### TC-038: Rate limiting reset after 1 hour

**Feature:** User Registration
**Type:** Security / Rate Limiting
**Priority:** P1 (High)

**Preconditions:**
- Previous 5 registration attempts exhausted
- System time can be mocked or advanced

**Steps:**
1. Wait 1 hour (or mock system clock forward)
2. Attempt registration again with valid email and password
3. Submit form

**Expected Result:**
- Rate limit counter is reset
- 6th attempt succeeds (no 429 error)
- Registration proceeds normally
- Verification email sent

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach successful registration]

---

#### TC-039: Rate limiting per IP (multiple IPs allowed)

**Feature:** User Registration
**Type:** Security / Rate Limiting
**Priority:** P1 (High)

**Preconditions:**
- Test environment supports multiple IP simulation (VPN, proxy, or test harness)

**Steps:**
1. From IP Address A: 5 failed registration attempts
2. From IP Address B: 1st registration attempt with valid data
3. Submit from IP B

**Expected Result:**
- IP A is rate-limited (after 5 attempts)
- IP B is NOT rate-limited (separate counter)
- IP B registration succeeds
- Each IP has independent rate limit counters

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach responses from both IPs]

---

### Test Case Group 12: API Testing (Backend Validation)

#### TC-040: API request with all valid fields

**Feature:** User Registration API
**Type:** API / Functional
**Priority:** P0 (Critical)

**Preconditions:**
- Backend API running on `http://localhost:3000`
- Postman installed or test framework ready
- Database is clean

**Steps:**
1. Create POST request to `/api/v1/auth/register`
2. Headers:
   - `Content-Type: application/json`
   - `X-Recaptcha-Token: <valid_token>`
3. Body:
```json
{
  "email": "api.test@example.com",
  "password": "ApiTest123!",
  "acceptTerms": true,
  "acceptKVKK": true
}
```
4. Send request

**Expected Result:**
- HTTP 201 Created
- Response body:
```json
{
  "success": true,
  "data": {
    "userId": "usr_<UUID>",
    "email": "api.test@example.com",
    "status": "PENDING_VERIFICATION"
  },
  "meta": {
    "timestamp": "2025-11-19T...",
    "request_id": "req_..."
  }
}
```
- Email sent to `api.test@example.com`
- User created in database with `email_verified = false`

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach Postman response]

---

#### TC-041: API request missing required field - email

**Feature:** User Registration API
**Type:** API / Validation
**Priority:** P0 (Critical)

**Preconditions:**
- Backend API running

**Steps:**
1. POST to `/api/v1/auth/register`
2. Body (missing email):
```json
{
  "password": "ApiTest123!",
  "acceptTerms": true,
  "acceptKVKK": true
}
```
3. Send request

**Expected Result:**
- HTTP 400 Bad Request
- Response:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "Email is required"
      }
    ]
  }
}
```

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach error response]

---

#### TC-042: API request missing required field - password

**Feature:** User Registration API
**Type:** API / Validation
**Priority:** P0 (Critical)

**Preconditions:**
- Backend API running

**Steps:**
1. POST to `/api/v1/auth/register`
2. Body (missing password):
```json
{
  "email": "test@example.com",
  "acceptTerms": true,
  "acceptKVKK": true
}
```
3. Send

**Expected Result:**
- HTTP 400
- Error about missing password field

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach error response]

---

#### TC-043: API request missing reCAPTCHA token

**Feature:** User Registration API
**Type:** API / Security
**Priority:** P0 (Critical)

**Preconditions:**
- Backend API running
- reCAPTCHA validation required

**Steps:**
1. POST to `/api/v1/auth/register`
2. Body (valid but no reCAPTCHA token):
```json
{
  "email": "test@example.com",
  "password": "TestPass123!",
  "acceptTerms": true,
  "acceptKVKK": true
}
```
3. Send (either no header or missing token)

**Expected Result:**
- HTTP 400 or 403
- Error: "reCAPTCHA token required" or "Invalid reCAPTCHA validation"
- No account created

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach error response]

---

#### TC-044: API - Password validation backend

**Feature:** User Registration API
**Type:** API / Validation
**Priority:** P0 (Critical)

**Preconditions:**
- Backend API running

**Steps:**
1. POST to `/api/v1/auth/register`
2. Test Case A: Password too short
   - `password: "Pass1!"`
3. Test Case B: Missing uppercase
   - `password: "password123!"`
4. Test Case C: Missing number
   - `password: "Password!"`
5. Test Case D: Missing special char
   - `password: "Password123"`

**Expected Result:**
- All cases return HTTP 400
- Each case includes specific validation error in response
- User not created
- Examples:
  - "Password must be at least 8 characters"
  - "Password must contain at least one uppercase letter"
  - "Password must contain at least one number"
  - "Password must contain at least one special character"

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach error responses for all cases]

---

#### TC-045: API - Duplicate email handling

**Feature:** User Registration API
**Type:** API / Business Logic
**Priority:** P0 (Critical)

**Preconditions:**
- Database contains: `existing@test.com`
- Backend API running

**Steps:**
1. POST to `/api/v1/auth/register`
2. Body:
```json
{
  "email": "existing@test.com",
  "password": "NewPass123!",
  "acceptTerms": true,
  "acceptKVKK": true,
  "recaptchaToken": "<token>"
}
```
3. Send

**Expected Result:**
- HTTP 409 Conflict (or 400)
- Error message: "Bu email zaten kayıtlı" (Turkish)
- Or English: "This email is already registered"
- No duplicate account created
- Existing account not modified

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach error response]

---

#### TC-046: API - Response includes userId for later reference

**Feature:** User Registration API
**Type:** API / Response Format
**Priority:** P1 (High)

**Preconditions:**
- Backend API running
- Valid registration request

**Steps:**
1. POST to `/api/v1/auth/register` with valid data
2. Check response body

**Expected Result:**
- Response includes `data.userId` (UUID format)
- User can use this ID for future operations
- Example: `"userId": "usr_550e8400-e29b-41d4-a716-446655440000"`

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach response body]

---

### Test Case Group 13: Accessibility Testing (WCAG 2.1 Level AA)

#### TC-047: Form labels properly associated with inputs

**Feature:** User Registration
**Type:** Accessibility
**Priority:** P1 (High)

**Preconditions:**
- Frontend loaded at `/register`
- Browser DevTools or accessibility scanner available

**Steps:**
1. Open DevTools → Accessibility tab
2. Inspect email input
3. Check for associated label
4. Inspect password input
5. Check for associated label

**Expected Result:**
- Email input has associated `<label>` with `for="email"` or ARIA label
- Password input has associated `<label>` with `for="password"` or ARIA label
- Screen readers announce label when input is focused
- Accessibility tree shows proper structure

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach accessibility tree view]

---

#### TC-048: Form keyboard navigation

**Feature:** User Registration
**Type:** Accessibility
**Priority:** P1 (High)

**Preconditions:**
- Frontend loaded at `/register`

**Steps:**
1. Start with page loaded
2. Press Tab key repeatedly
3. Observe focus movement
4. Expected order:
   - Email input
   - Password input
   - Terms checkbox
   - KVKK checkbox
   - Register button
5. Verify each element receives visible focus indicator
6. Test Shift+Tab (reverse navigation)

**Expected Result:**
- Focus moves in logical order
- Focus indicator visible (blue outline or highlight)
- Links have sufficient color contrast
- Can reach all interactive elements with Tab key
- Reverse order with Shift+Tab works

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach focus indicator on each element]

---

#### TC-049: Form error messages announced to screen readers

**Feature:** User Registration
**Type:** Accessibility
**Priority:** P1 (High)

**Preconditions:**
- Frontend loaded at `/register`
- Screen reader (NVDA/JAWS on Windows, VoiceOver on Mac)

**Steps:**
1. Enter invalid email: `notanemail`
2. Blur field
3. Listen to screen reader announcement
4. Observe ARIA live region update

**Expected Result:**
- Screen reader announces error message
- Error is announced when field loses focus
- Error message includes field name: "Email: Invalid email format"
- Can be heard clearly
- ARIA role="alert" on error message

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach ARIA attributes on error element]

---

#### TC-050: Sufficient color contrast for labels and instructions

**Feature:** User Registration
**Type:** Accessibility
**Priority:** P1 (High)

**Preconditions:**
- Frontend loaded at `/register`
- Color contrast analyzer tool (WebAIM, axe)

**Steps:**
1. Use WebAIM contrast checker or axe DevTools
2. Check contrast ratio of:
   - Form labels (e.g., "Email:")
   - Password requirements text
   - Error messages
   - Button text (Register)
3. Measure foreground vs background color

**Expected Result:**
- All text meets WCAG AA standard: 4.5:1 for normal text
- Large text (18pt+): 3:1 ratio
- Password strength indicator colors + text are distinguishable
- No color-only information (e.g., red dot alone)

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach contrast checker results]

---

#### TC-051: Password strength indicator accessible to screen readers

**Feature:** User Registration
**Type:** Accessibility
**Priority:** P1 (High)

**Preconditions:**
- Frontend loaded at `/register`
- Screen reader enabled

**Steps:**
1. Enter password: `Weak1!`
2. Listen to screen reader
3. Verify strength indicator announcement
4. Tab to password strength indicator element

**Expected Result:**
- Screen reader announces: "Password strength: Weak" (or similar)
- Strength indicator has `aria-label` or `aria-describedby`
- Color change is NOT the only indicator (text label present)
- Screen reader communicates strength level to blind users

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach aria attributes]

---

#### TC-052: Required field indicators accessible

**Feature:** User Registration
**Type:** Accessibility
**Priority:** P1 (High)

**Preconditions:**
- Frontend loaded at `/register`

**Steps:**
1. Check for required field indicators (*)
2. Verify indicator accessibility
3. Test with screen reader

**Expected Result:**
- Required fields marked with `*` or `(required)`
- `*` is not the ONLY indicator
- Label includes "required" or asterisk is marked with `aria-label`
- Screen reader announces: "Email, required, edit text"

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach HTML showing aria attributes]

---

#### TC-053: Checkbox labels linked correctly for accessibility

**Feature:** User Registration
**Type:** Accessibility
**Priority:** P1 (High)

**Preconditions:**
- Frontend loaded at `/register`

**Steps:**
1. Click on checkbox label text (not the checkbox itself)
2. Verify checkbox state toggles
3. Test with keyboard: Tab to checkbox, use Space to toggle

**Expected Result:**
- Clicking label text toggles checkbox
- Checkbox and label are properly associated
- HTML structure: `<label><input type="checkbox"> Text</label>` or `<label for="chk_id"><input id="chk_id"></label>`
- Keyboard accessible

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach HTML structure]

---

### Test Case Group 14: Performance & Load Testing

#### TC-054: Page load time under 3 seconds

**Feature:** User Registration
**Type:** Performance
**Priority:** P1 (High)

**Preconditions:**
- Frontend loaded in Chrome
- Network set to 4G (throttled)

**Steps:**
1. Open DevTools → Lighthouse
2. Run Lighthouse audit on `/register` page
3. Check "Performance" score
4. Note "First Contentful Paint" and "Largest Contentful Paint"

**Expected Result:**
- Page loads in < 3 seconds (4G network)
- Lighthouse Performance score > 85
- First Contentful Paint < 1.5 seconds
- Largest Contentful Paint < 2.5 seconds

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach Lighthouse report]

---

#### TC-055: API response time under 500ms

**Feature:** User Registration API
**Type:** Performance
**Priority:** P1 (High)

**Preconditions:**
- Backend API running
- Postman or test harness ready

**Steps:**
1. Create 10 consecutive POST requests to `/api/v1/auth/register`
2. Record response time for each
3. Calculate average

**Expected Result:**
- Each response completes within 500ms
- Average response time < 300ms
- No timeouts or connection issues
- Database queries optimized

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach Postman response times]

---

#### TC-056: Email sending performance (within 60 seconds)

**Feature:** User Registration
**Type:** Performance
**Priority:** P1 (High)

**Preconditions:**
- User registers: `perf.test@example.com`
- Mailhog monitoring active

**Steps:**
1. Register user
2. Note registration time
3. Check Mailhog for email arrival
4. Record email arrival time
5. Calculate: Arrival time - Registration time

**Expected Result:**
- Email arrives within 60 seconds
- No delays or failures
- Queue processing is efficient

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach email delivery metrics]

---

## Test Data Sets

Reference: `/test-data/registration-test-data.json`

### Valid Email Addresses
- `user@example.com`
- `firstname.lastname@example.co.uk`
- `user+tag@example.com`
- `user_name@test-domain.org`
- `123456@example.com`
- `a@b.com`

### Invalid Email Addresses
- `notanemail`
- `@example.com`
- `user@`
- `user@@example.com`
- `user@.com`
- `user @example.com` (space before @)

### Valid Passwords
- `SecurePass123!` - STRONG
- `ValidPass123!` - STRONG
- `Tr0pical$Sunset#2025@` - STRONG
- `Qwerty1!` - MEDIUM (minimum + limited variation)

### Invalid Passwords
- `Pass1!` - Too short (6 chars)
- `lowercase123!` - No uppercase
- `ValidPass!` - No number
- `ValidPass123` - No special character

### Turkish Character Test Cases
- `türk@örnek.com`
- `kullanıcı@test.com`
- Password: `Türkçe1!Şifre`

---

## Test Results Summary Template

```markdown
## Test Execution Results - User Registration (Story 1.1)

**Execution Date:** [DATE]
**Executed By:** [QA ENGINEER]
**Environment:** Development

### Manual Test Results

| Test Case | Status | Notes |
|-----------|--------|-------|
| TC-001 | ⬜/✅/❌ | [Results] |
| TC-002 | ⬜/✅/❌ | [Results] |
| ... | ... | ... |

**Summary:**
- Total: XX test cases
- Passed: XX (XX%)
- Failed: XX (XX%)
- Blocked: XX (XX%)

### API Test Results
- Postman collection: `auth-service.json` - XX tests executed
- Passed: XX
- Failed: XX

### Accessibility Results
- axe-core scan: XX issues
- WCAG 2.1 AA: PASS/FAIL
- Critical issues: XX

### Security Test Results
- SQL Injection: PASS (no vulnerabilities)
- XSS: PASS (no vulnerabilities)
- Rate Limiting: PASS

### Performance Baselines
- Page Load Time: [X]ms
- API Response Time (avg): [X]ms
- Email Delivery Time (avg): [X]ms

### Bugs Reported
1. [BUG-XXX] - [Title] ([Severity])
2. ...

### Sign-Off
[PASS/FAIL] - All acceptance criteria covered and tested.
```

---

## Success Criteria

This test plan is considered complete when:

1. **Coverage:** All 56 test cases executed
2. **Pass Rate:** >= 95% of test cases pass
3. **Bugs:** All critical/high bugs resolved before sign-off
4. **Accessibility:** WCAG 2.1 AA compliance verified
5. **Security:** No high/critical security vulnerabilities found
6. **Performance:** API < 500ms, Page load < 3s
7. **Documentation:** All results logged with evidence

---

## Approvals

| Role | Name | Date | Signature |
|------|------|------|-----------|
| QA Lead | [Name] | [Date] | [Signature] |
| Tech Lead | [Name] | [Date] | [Signature] |
| Product Owner | [Name] | [Date] | [Signature] |

---

**Document Owner:** QA Team
**Last Updated:** 2025-11-19
**Version:** 1.0
