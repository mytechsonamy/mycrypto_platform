# Story 1.3: Two-Factor Authentication (2FA) - Comprehensive Test Plan

**Status:** ACTIVE
**Date Created:** 2025-11-20
**Feature:** Two-Factor Authentication with TOTP
**Priority:** P0 (Critical)
**Estimated Execution Time:** 6-8 hours

---

## Document Overview

This comprehensive test plan covers all aspects of Two-Factor Authentication implementation for Story 1.3. It includes test cases, API specifications, security testing, and UI/UX validation.

### Test Artifacts
- **Test Cases:** 48 scenarios across 5 categories
- **Coverage:** 100% of acceptance criteria
- **Security Focus:** Cryptography, rate limiting, replay attacks
- **Performance Testing:** Load simulation at 100+ concurrent users

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Acceptance Criteria Analysis](#acceptance-criteria-analysis)
3. [Test Case Specifications](#test-case-specifications)
4. [API Testing](#api-testing)
5. [Security Testing](#security-testing)
6. [UI/UX Testing](#ui-ux-testing)
7. [Performance Testing](#performance-testing)
8. [Test Environment Setup](#test-environment-setup)
9. [Risk Assessment](#risk-assessment)

---

## Executive Summary

### What We're Testing

**Feature:** Two-Factor Authentication (2FA) with TOTP (Time-based One-Time Password)

**Why It Matters:**
- Cryptocurrency exchange requires high security for user accounts
- 2FA prevents unauthorized access even if password is compromised
- Backup codes provide recovery mechanism for account lockout
- Must comply with industry security standards

### Acceptance Criteria (7 total)

From Story 1.3 backlog:
1. User can enable 2FA in Settings
2. QR code displayed for TOTP app (Google Auth, Authy)
3. Backup codes generated (10 codes, single-use)
4. User must verify first TOTP code to activate
5. 2FA required on every login after activation
6. Option to "Trust this device for 30 days"
7. 2FA disable requires email confirmation + current TOTP
8. Backup code used shows warning: "X codes remaining"

### Test Coverage Breakdown

| Category | # Tests | Priority | Est. Time |
|----------|---------|----------|-----------|
| 2FA Setup Flow | 12 | P0 | 90 min |
| 2FA Login Flow | 10 | P0 | 75 min |
| Backup Code Management | 8 | P0 | 60 min |
| Security Testing | 10 | P0 | 90 min |
| UI/UX Testing | 8 | P1 | 60 min |
| **TOTAL** | **48** | - | **375 min** |

---

## Acceptance Criteria Analysis

### AC1: User can enable 2FA in Settings

**Tests Required:**
- TC-001: Navigate to Settings > Security > 2FA section
- TC-002: Click "Enable 2FA" button
- TC-003: Confirm understanding of backup codes
- TC-004: Complete setup flow successfully
- TC-005: 2FA flag saved in database (two_fa_enabled = true)

### AC2: QR code displayed for TOTP app

**Tests Required:**
- TC-006: QR code is generated and visible
- TC-007: QR code scans successfully with Google Authenticator
- TC-008: QR code scans successfully with Authy
- TC-009: Manual entry key available as alternative
- TC-010: QR code is readable in various lighting conditions

### AC3: Backup codes generated (10 codes, single-use)

**Tests Required:**
- TC-011: Exactly 10 backup codes generated
- TC-012: Each code format: XXXX-XXXX (8 characters)
- TC-013: Codes are unique within the set
- TC-014: Codes are displayed to user before enabling
- TC-015: Codes can be copied, downloaded, printed

### AC4: User must verify first TOTP code to activate

**Tests Required:**
- TC-016: TOTP code field appears after QR code display
- TC-017: Setup not complete without valid TOTP code
- TC-018: Invalid TOTP code shows error message
- TC-019: Valid TOTP code enables 2FA successfully
- TC-020: Setup token expires after 15 minutes

### AC5: 2FA required on every login after activation

**Tests Required:**
- TC-021: Login with email/password triggers 2FA challenge
- TC-022: 2FA modal appears with code input field
- TC-023: User cannot access dashboard without 2FA verification
- TC-024: Valid TOTP code completes login
- TC-025: Invalid TOTP code prevents login

### AC6: Option to "Trust this device for 30 days"

**Tests Required:**
- TC-026: "Trust this device" checkbox visible on 2FA modal
- TC-027: When checked, device is remembered for 30 days
- TC-028: Subsequent logins from trusted device don't require 2FA
- TC-029: Device trust expires after 30 days
- TC-030: User can manually revoke device trust

### AC7: 2FA disable requires email confirmation + current TOTP

**Tests Required:**
- TC-031: "Disable 2FA" option in Settings
- TC-032: Disabling shows confirmation modal
- TC-033: Email confirmation link sent
- TC-034: Current TOTP code required on confirmation
- TC-035: Invalid TOTP code prevents disabling

### AC8: Backup code used shows warning: "X codes remaining"

**Tests Required:**
- TC-036: Using backup code shows remaining count
- TC-037: Warning shows correct count after each use
- TC-038: When 1 code remaining, special warning appears
- TC-039: When 0 codes remaining, regeneration prompt appears
- TC-040: Codes cannot be reused

---

## Test Case Specifications

### SETUP FLOW TEST CASES

#### TC-001: Navigate to Settings Security Section

**Feature:** 2FA Setup Flow
**Type:** UI/E2E
**Priority:** P0 (Critical)

**Preconditions:**
- User account created and email verified
- User logged into dashboard
- User account has 2FA disabled (two_fa_enabled = false)

**Steps:**
1. Click "Settings" in top navigation menu
2. Navigate to "Security" tab
3. Locate "Two-Factor Authentication" section

**Expected Result:**
- Settings page loads without errors
- Security tab displays
- 2FA section clearly visible with "Enable" button
- Current 2FA status shows: "Not Enabled"

**Status:** Not Tested

---

#### TC-002: 2FA Setup - Generate QR Code

**Feature:** 2FA Setup Flow
**Type:** API + E2E
**Priority:** P0 (Critical)

**Preconditions:**
- User on 2FA Setup page
- User has active authentication session

**Steps:**
1. Click "Enable 2FA" button
2. User reads warning about backup codes
3. Click "Continue" to proceed
4. System generates QR code

**Expected Result:**
- QR code displays on screen
- QR code contains valid otpauth:// URL
- Manual entry key (base32) shown as alternative
- Setup token generated (valid for 15 minutes)
- Response includes:
  ```json
  {
    "qrCode": "data:image/png;base64,...",
    "backupCodes": ["ABCD-1234", "EFGH-5678", ...],
    "setupToken": "token_uuid",
    "expiresAt": "2025-11-20T11:15:00Z"
  }
  ```

**API Endpoint:** `POST /api/v1/auth/2fa/setup`
**Status:** Not Tested

---

#### TC-003: Verify QR Code with Google Authenticator

**Feature:** 2FA Setup Flow
**Type:** E2E
**Priority:** P0 (Critical)

**Preconditions:**
- QR code displayed on setup page
- Google Authenticator app installed on test device
- User has backup codes backed up

**Steps:**
1. Open Google Authenticator
2. Tap "+" to add account
3. Select "Scan a QR code"
4. Point device at screen QR code
5. Verify code appears in app

**Expected Result:**
- QR code scans successfully
- Authenticator shows 6-digit code
- Code updates every 30 seconds
- Account name displays: "MyCrypto Exchange (test@example.com)"

**Notes:**
- Real authenticator app testing (not simulator)
- Document screenshot of generated code

**Status:** Not Tested

---

#### TC-004: Verify QR Code with Authy

**Feature:** 2FA Setup Flow
**Type:** E2E
**Priority:** P0 (Critical)

**Preconditions:**
- QR code displayed on setup page
- Authy app installed on test device
- User has backup codes backed up

**Steps:**
1. Open Authy app
2. Tap "+" to add account
3. Select "Scan QR code"
4. Point device at screen QR code
5. Verify code appears in app

**Expected Result:**
- QR code scans successfully
- Authy shows 6-digit code
- Code updates every 30 seconds
- Account properly labeled

**Status:** Not Tested

---

#### TC-005: Manual Entry Key Alternative

**Feature:** 2FA Setup Flow
**Type:** E2E
**Priority:** P1 (High)

**Preconditions:**
- QR code displayed on setup page
- Manual entry key visible below QR code

**Steps:**
1. Copy manual entry key (base32)
2. Open authenticator app (Google/Authy)
3. Select "Can't scan code?"
4. Paste manual entry key
5. Verify code appears in app

**Expected Result:**
- Manual key is 32 characters long
- Key is base32 encoded
- Code generated matches QR code
- No errors during manual entry

**Status:** Not Tested

---

#### TC-006: Backup Codes Generation

**Feature:** Backup Codes Management
**Type:** API + E2E
**Priority:** P0 (Critical)

**Preconditions:**
- User on 2FA setup page
- QR code displayed

**Steps:**
1. Scroll down to "Backup Codes" section
2. Observe list of 10 codes
3. Verify each code format

**Expected Result:**
- Exactly 10 codes displayed
- Each code format: XXXX-XXXX (8 characters)
- All codes are unique
- Codes are readable and copyable
- Display shows: "Save these codes in a secure location"
- All codes are visible in single view

**Example Format:**
```
ABCD-1234
EFGH-5678
IJKL-9012
MNOP-3456
...
```

**Status:** Not Tested

---

#### TC-007: Backup Codes Copy Functionality

**Feature:** Backup Codes Management
**Type:** E2E
**Priority:** P1 (High)

**Preconditions:**
- Backup codes displayed on setup page
- "Copy All" button visible

**Steps:**
1. Click "Copy All Codes" button
2. Paste into text editor
3. Verify all 10 codes present

**Expected Result:**
- "Copied!" confirmation message appears
- All 10 codes copied to clipboard
- Format preserved in clipboard
- User can paste codes elsewhere
- Each code on separate line

**Status:** Not Tested

---

#### TC-008: Backup Codes Download

**Feature:** Backup Codes Management
**Type:** E2E
**Priority:** P1 (High)

**Preconditions:**
- Backup codes displayed
- "Download" button visible

**Steps:**
1. Click "Download Backup Codes" button
2. File downloaded to device
3. Open downloaded file

**Expected Result:**
- File downloaded (2FA_Backup_Codes_[timestamp].txt)
- File contains all 10 codes
- File is plaintext or PDF
- Codes are clearly labeled
- Download completes without error

**Status:** Not Tested

---

#### TC-009: Backup Codes Print

**Feature:** Backup Codes Management
**Type:** E2E
**Priority:** P1 (High)

**Preconditions:**
- Backup codes displayed
- "Print" button visible

**Steps:**
1. Click "Print Backup Codes" button
2. Print dialog appears
3. Print to PDF or physical printer

**Expected Result:**
- Print dialog opens
- Preview shows all 10 codes
- Print layout is readable
- Codes are clearly visible
- Print completes without error

**Status:** Not Tested

---

#### TC-010: Backup Code Confirmation

**Feature:** Backup Codes Management
**Type:** E2E
**Priority:** P0 (Critical)

**Preconditions:**
- Backup codes displayed
- User shown acknowledgment checkbox

**Steps:**
1. Read warning: "These codes are secret. Store safely."
2. Check: "I have saved my backup codes safely"
3. Verify checkbox is required to continue

**Expected Result:**
- Checkbox is mandatory
- Cannot proceed to TOTP verification without checking
- Clear warning message displayed
- Instructions are clear and understandable

**Status:** Not Tested

---

#### TC-011: TOTP Code Entry (Valid Code)

**Feature:** 2FA Setup Flow
**Type:** E2E
**Priority:** P0 (Critical)

**Preconditions:**
- User has scanned QR code with authenticator
- Backup codes acknowledged
- TOTP input field visible

**Steps:**
1. Obtain 6-digit code from authenticator
2. Enter code in "Verification Code" field
3. Click "Verify and Enable 2FA"

**Expected Result:**
- Code field accepts 6 digits only
- Valid code submits successfully
- "2FA Enabled Successfully!" message appears
- Dashboard redirects after 2 seconds
- two_fa_enabled flag set to true in database
- Email confirmation sent to user
- Audit log records event: "2FA_ENABLED"

**Status:** Not Tested

---

#### TC-012: TOTP Code Entry (Invalid Code)

**Feature:** 2FA Setup Flow
**Type:** E2E
**Priority:** P0 (Critical)

**Preconditions:**
- User on TOTP verification screen
- Valid backup codes saved

**Steps:**
1. Enter incorrect 6-digit code (e.g., "000000")
2. Click "Verify and Enable 2FA"
3. Observe error response

**Expected Result:**
- Error message: "Invalid verification code. Please try again."
- 2FA not enabled
- User can retry
- Failed attempt count incremented
- Still at setup page (not redirected)
- Retry button available

**Status:** Not Tested

---

#### TC-013: Setup Token Expiration (15 minutes)

**Feature:** 2FA Setup Flow
**Type:** API
**Priority:** P0 (Critical)

**Preconditions:**
- User initiated 2FA setup
- Setup token generated
- 15 minutes elapsed (simulated)

**Steps:**
1. Wait 15 minutes without completing setup
2. Try to verify TOTP code
3. Observe error

**Expected Result:**
- Error: "Setup token expired. Please start again."
- User redirected to 2FA setup start
- Can generate new token
- Previous token invalid
- Database shows token removed from Redis

**Status:** Not Tested

---

#### TC-014: TOTP Code Rate Limiting (3 attempts per 30 sec)

**Feature:** Security - Rate Limiting
**Type:** API
**Priority:** P0 (Critical)

**Preconditions:**
- User on TOTP verification screen
- Setup token valid

**Steps:**
1. Enter invalid code
2. Attempt 3 consecutive wrong codes within 30 seconds
3. Attempt 4th code

**Expected Result:**
- First 3 attempts: Error message, can retry
- 4th attempt: "Too many attempts. Try again in 30 seconds."
- User locked out for 30 seconds
- After 30 seconds: Can retry
- Rate limit tracked per user_id + setup_token

**API Response:**
```json
{
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Too many attempts. Try again in 30 seconds.",
  "retryAfter": 30
}
```

**Status:** Not Tested

---

### LOGIN FLOW TEST CASES

#### TC-015: Login Triggers 2FA Challenge (Password + Email Correct)

**Feature:** 2FA Login Flow
**Type:** E2E
**Priority:** P0 (Critical)

**Preconditions:**
- User account has 2FA enabled (two_fa_enabled = true)
- User email verified
- User has not checked "Trust device"

**Steps:**
1. Navigate to login page
2. Enter email: test@example.com
3. Enter password: SecurePass123!
4. Click "Login"

**Expected Result:**
- Password verification succeeds silently
- 2FA modal appears (not dashboard)
- Modal title: "Verify Your Identity"
- Code input field visible
- "Use backup code" link visible
- "Remember this device" checkbox visible
- Timer showing code expiry (30 seconds)

**API Response (Partial Auth):**
```json
{
  "requiresTwoFactor": true,
  "challengeToken": "challenge_token_uuid",
  "message": "Enter verification code from your authenticator app"
}
```

**Status:** Not Tested

---

#### TC-016: 2FA Modal - Valid TOTP Code

**Feature:** 2FA Login Flow
**Type:** E2E
**Priority:** P0 (Critical)

**Preconditions:**
- 2FA modal visible after login
- Challenge token valid
- User has 2FA device with valid code

**Steps:**
1. Get 6-digit code from authenticator
2. Enter code in modal field
3. Code auto-submits when 6 digits entered

**Expected Result:**
- 2FA verification succeeds
- Modal closes
- User redirected to dashboard
- JWT tokens issued (access + refresh)
- Session established
- Login event logged: "LOGIN_2FA_VERIFIED"
- Balance and trading pages accessible

**API Endpoint:** `POST /api/v1/auth/2fa/verify`
**Status:** Not Tested

---

#### TC-017: 2FA Modal - Invalid Code

**Feature:** 2FA Login Flow
**Type:** E2E
**Priority:** P0 (Critical)

**Preconditions:**
- 2FA modal visible
- Challenge token valid

**Steps:**
1. Enter incorrect 6-digit code
2. Observe error

**Expected Result:**
- Error message: "Invalid code. Please try again."
- Modal stays open
- User can retry
- Failed attempt counter incremented
- Still on login modal (not redirected)

**Status:** Not Tested

---

#### TC-018: 2FA Modal - Challenge Token Expiration (5 min)

**Feature:** 2FA Login Flow
**Type:** API
**Priority:** P0 (Critical)

**Preconditions:**
- 2FA modal displayed
- 5 minutes elapsed since modal shown

**Steps:**
1. Wait 5 minutes
2. Try to enter TOTP code
3. Click submit

**Expected Result:**
- Error: "Challenge token expired. Please login again."
- Modal closes
- User redirected to login page
- Must re-enter email/password

**Status:** Not Tested

---

#### TC-019: 2FA Modal - Auto-Submit on 6 Digits

**Feature:** 2FA Login Flow - UX
**Type:** E2E
**Priority:** P1 (High)

**Preconditions:**
- 2FA modal open
- Code input field focused

**Steps:**
1. Enter 6-digit TOTP code one digit at a time
2. After 6th digit, observe

**Expected Result:**
- Code automatically submits when 6th digit entered
- No need to click submit button
- Reduces user friction
- Loading indicator shows during submission
- Improves UX significantly

**Status:** Not Tested

---

#### TC-020: 2FA Modal - Failed Attempts Lockout (5 attempts)

**Feature:** Security - Rate Limiting
**Type:** API
**Priority:** P0 (Critical)

**Preconditions:**
- 2FA modal open
- Challenge token valid

**Steps:**
1. Enter wrong code 5 times within 15 minutes
2. Attempt 6th code

**Expected Result:**
- After 5 failed attempts: User locked out
- Error: "Too many failed attempts. Please try again in 15 minutes."
- Cannot retry until lockout expires
- Session established 15 minutes later (automatic)
- Failed attempts logged in audit

**Rate Limiting:**
- 5 failed attempts per 15-minute window
- Lock applies to user_id + challenge_token combination

**Status:** Not Tested

---

#### TC-021: Trust Device for 30 Days

**Feature:** 2FA Login Flow
**Type:** E2E
**Priority:** P1 (High)

**Preconditions:**
- 2FA modal visible
- "Trust this device for 30 days" checkbox visible

**Steps:**
1. Check "Trust this device for 30 days"
2. Enter valid TOTP code
3. Login completes
4. Logout
5. Login again from same device
6. Observe 2FA requirement

**Expected Result:**
- First login with trust: 2FA required but checkbox checked
- Token/cookie set for 30 days with device fingerprint
- Second login from same device: No 2FA required
- Device identification includes: User-Agent, IP (approximate)
- Other devices still require 2FA
- After 30 days: 2FA required again

**Security:** Device cookie encrypted and HTTP-only

**Status:** Not Tested

---

#### TC-022: Use Backup Code (Valid)

**Feature:** Backup Code Usage
**Type:** E2E
**Priority:** P0 (Critical)

**Preconditions:**
- 2FA modal visible with code input
- User has backup codes remaining
- "Use backup code" link visible

**Steps:**
1. Click "Use backup code" link
2. Modal changes to backup code input
3. Enter valid backup code (XXXX-XXXX)
4. Click "Verify"

**Expected Result:**
- Backup code validates successfully
- User logged in (same as TOTP)
- Code marked as used in database
- Remaining count decremented (10 → 9)
- JWT tokens issued
- Session established
- Audit log: "LOGIN_2FA_BACKUP_CODE_USED"

**API Endpoint:** `POST /api/v1/auth/2fa/verify` (with backup_code param)
**Status:** Not Tested

---

#### TC-023: Use Backup Code (Already Used)

**Feature:** Backup Code Usage
**Type:** API
**Priority:** P0 (Critical)

**Preconditions:**
- User has 1 backup code already used
- 9 codes remaining

**Steps:**
1. Try to use same backup code again
2. Observe error

**Expected Result:**
- Error: "This backup code has already been used."
- Login fails
- User must use different code or TOTP
- Audit log: "LOGIN_2FA_BACKUP_CODE_REUSE_ATTEMPT"

**Status:** Not Tested

---

#### TC-024: Use Last Backup Code (Warning)

**Feature:** Backup Code Usage - Warnings
**Type:** E2E
**Priority:** P1 (High)

**Preconditions:**
- User has exactly 1 backup code remaining
- All other codes used

**Steps:**
1. Use the last backup code to login
2. Login successful
3. Observe warning notification

**Expected Result:**
- Login succeeds
- After login, warning appears: "Warning: No backup codes remaining. Regenerate codes in Settings immediately."
- Dashboard shows alert badge
- Settings link provided in warning

**Status:** Not Tested

---

#### TC-025: Use Backup Code When All Exhausted

**Feature:** Backup Code Usage - Error
**Type:** API
**Priority:** P0 (Critical)

**Preconditions:**
- User has used all 10 backup codes
- 0 codes remaining
- 2FA modal visible

**Steps:**
1. Try to use backup code when none available
2. System checks for available codes

**Expected Result:**
- No backup codes available for use
- User must use TOTP code only
- If also don't have authenticator: Account potentially locked
- Error message: "No valid backup codes available. Use your authenticator app."
- Regenerate codes option in Settings

**Status:** Not Tested

---

### BACKUP CODE MANAGEMENT TEST CASES

#### TC-026: View 2FA Status (Enabled)

**Feature:** 2FA Management
**Type:** API + E2E
**Priority:** P1 (High)

**Preconditions:**
- User has 2FA enabled
- User in Settings > Security

**Steps:**
1. Navigate to 2FA settings section
2. API call: GET /api/v1/auth/2fa/status

**Expected Result:**
- Status shows: "Enabled"
- Last enabled date: [timestamp]
- Remaining backup codes: [count]
- Button available: "Disable 2FA"
- Button available: "Regenerate Backup Codes"
- Last activity: [timestamp of last login using 2FA]

**API Response:**
```json
{
  "twoFactorEnabled": true,
  "enabledAt": "2025-11-19T10:30:00Z",
  "backupCodesRemaining": 7,
  "lastActivity": "2025-11-20T09:15:00Z",
  "trustedDevices": 1
}
```

**Status:** Not Tested

---

#### TC-027: Regenerate Backup Codes

**Feature:** Backup Code Management
**Type:** E2E
**Priority:** P1 (High)

**Preconditions:**
- User has 2FA enabled
- Backup codes section visible in Settings
- User has some codes remaining

**Steps:**
1. Click "Regenerate Backup Codes" button
2. Modal appears asking for TOTP code
3. Enter valid TOTP code
4. Click "Regenerate"

**Expected Result:**
- 10 new backup codes generated
- All old backup codes invalidated
- Old codes cannot be used
- New codes displayed
- Copy/Download/Print options available
- User must confirm new codes
- Audit log: "BACKUP_CODES_REGENERATED"
- Email sent: "Your backup codes were regenerated"

**API Endpoint:** `POST /api/v1/auth/2fa/backup-codes/regenerate`
**Status:** Not Tested

---

#### TC-028: Regenerate Codes - Invalid TOTP

**Feature:** Backup Code Management
**Type:** API
**Priority:** P0 (Critical)

**Preconditions:**
- Regenerate modal open
- TOTP code input visible

**Steps:**
1. Enter invalid TOTP code
2. Click "Regenerate"

**Expected Result:**
- Error: "Invalid TOTP code"
- Backup codes not regenerated
- Still on regenerate modal
- User can retry
- Failed attempt counter incremented

**Status:** Not Tested

---

#### TC-029: Disable 2FA (Complete Flow)

**Feature:** 2FA Management
**Type:** E2E
**Priority:** P0 (Critical)

**Preconditions:**
- User has 2FA enabled
- In Settings > Security > 2FA section
- "Disable 2FA" button visible

**Steps:**
1. Click "Disable 2FA"
2. Warning modal: "Disabling 2FA reduces security. Continue?"
3. Click "Yes, Disable"
4. TOTP code input field appears
5. Enter current valid TOTP code
6. Click "Confirm Disable"
7. Email confirmation link sent
8. User checks email
9. Click confirmation link

**Expected Result:**
- Step 1-2: Warning modal shown
- Step 3: Request sent to backend
- Step 5-6: TOTP verified server-side
- Step 7: Confirmation email sent
- Step 8-9: User clicks link
- After confirmation:
  - 2FA disabled (two_fa_enabled = false)
  - All backup codes deleted
  - Secret cleared
  - Session invalidated (re-login required)
  - Audit log: "2FA_DISABLED"
  - Email: "2FA has been disabled on your account"

**Security:** All sessions must be invalidated

**Status:** Not Tested

---

#### TC-030: Disable 2FA - Invalid TOTP Code

**Feature:** 2FA Management
**Type:** API
**Priority:** P0 (Critical)

**Preconditions:**
- Disable 2FA confirmation modal open
- TOTP code input field visible

**Steps:**
1. Enter invalid TOTP code
2. Click "Confirm Disable"

**Expected Result:**
- Error: "Invalid verification code"
- 2FA not disabled
- Still on confirmation page
- User can retry
- Failed attempts counted

**Status:** Not Tested

---

#### TC-031: Disable 2FA - Email Confirmation Required

**Feature:** 2FA Management
**Type:** E2E
**Priority:** P0 (Critical)

**Preconditions:**
- User initiated 2FA disable
- Confirmation email sent
- Email not yet confirmed

**Steps:**
1. Try to logout and login
2. User logs in (without 2FA since not yet disabled)
3. Observe session state
4. Don't click email confirmation link
5. Try 2FA operations in API

**Expected Result:**
- 2FA status still: enabled (until email confirmation)
- Disabling not complete without email link
- After email link clicked: Disabling takes effect
- Session invalidated at that point

**Status:** Not Tested

---

#### TC-032: View Backup Code Count

**Feature:** Backup Code Management
**Type:** E2E
**Priority:** P1 (High)

**Preconditions:**
- User has used some backup codes
- In Settings > Security > 2FA

**Steps:**
1. View "Backup Codes" section
2. Observe remaining count

**Expected Result:**
- Shows: "Remaining: [X] of 10"
- Accurate count based on database
- Updates in real-time if codes used
- Clear visual indicator
- Color change when < 3 codes: Yellow/Red

**Status:** Not Tested

---

#### TC-033: Backup Codes Remaining Warning (< 3 codes)

**Feature:** UI/UX
**Type:** E2E
**Priority:** P1 (High)

**Preconditions:**
- User has 2 or fewer backup codes remaining

**Steps:**
1. Login to dashboard
2. Check for warning notification

**Expected Result:**
- Warning appears: "Only 2 backup codes remaining. Generate new codes now."
- In Settings, backup code section highlighted in yellow
- "Regenerate" button emphasized
- Can dismiss warning but it reappears on next login

**Status:** Not Tested

---

---

## API Testing

### API Endpoint Summary

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/v1/auth/2fa/setup` | Initialize 2FA, generate QR code |
| POST | `/api/v1/auth/2fa/verify-setup` | Verify TOTP code and enable 2FA |
| POST | `/api/v1/auth/2fa/verify` | Verify 2FA during login |
| POST | `/api/v1/auth/2fa/backup-codes/regenerate` | Generate new backup codes |
| GET | `/api/v1/auth/2fa/status` | Get current 2FA status |
| DELETE | `/api/v1/auth/2fa` | Disable 2FA |

### API Test Cases

#### TC-034: POST /api/v1/auth/2fa/setup - Successful Response

**Endpoint:** `POST /api/v1/auth/2fa/setup`
**Type:** API
**Priority:** P0

**Request:**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Headers:**
- Authorization: Bearer [valid JWT]
- Content-Type: application/json

**Expected Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "qrCode": "data:image/png;base64,iVBORw0KGgo...",
    "backupCodes": [
      "ABCD-1234",
      "EFGH-5678",
      "IJKL-9012",
      "MNOP-3456",
      "QRST-7890",
      "UVWX-1234",
      "YZAB-5678",
      "CDEF-9012",
      "GHIJ-3456",
      "KLMN-7890"
    ],
    "setupToken": "setup_token_uuid_here",
    "expiresAt": "2025-11-20T11:15:00Z",
    "manualEntryKey": "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
  }
}
```

**Validations:**
- HTTP Status: 200
- QR code is valid base64 PNG
- Backup codes exactly 10
- Each code format: XXXX-XXXX
- All codes unique
- Setup token is UUID
- Expiry is 15 minutes from now
- Manual key is 32 base32 characters

**Status:** Not Tested

---

#### TC-035: POST /api/v1/auth/2fa/verify-setup - Verify and Enable

**Endpoint:** `POST /api/v1/auth/2fa/verify-setup`
**Type:** API
**Priority:** P0

**Request:**
```json
{
  "setupToken": "setup_token_uuid_here",
  "totpCode": "123456"
}
```

**Expected Response (200 OK):**
```json
{
  "status": "success",
  "message": "2FA enabled successfully",
  "data": {
    "twoFactorEnabled": true,
    "enabledAt": "2025-11-20T10:30:00Z"
  }
}
```

**Validations:**
- HTTP Status: 200
- two_fa_enabled flag set to true
- Secret encrypted in database
- Backup codes hashed and stored
- Audit log entry created
- Confirmation email sent

**Status:** Not Tested

---

#### TC-036: POST /api/v1/auth/2fa/verify - Login Verification

**Endpoint:** `POST /api/v1/auth/2fa/verify`
**Type:** API
**Priority:** P0

**Request:**
```json
{
  "challengeToken": "challenge_token_uuid",
  "totpCode": "123456",
  "rememberDevice": true
}
```

**Expected Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "expiresIn": 900,
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "test@example.com",
      "twoFactorEnabled": true
    }
  }
}
```

**Validations:**
- HTTP Status: 200
- Access token valid JWT
- Refresh token valid JWT
- Access token expires in 15 minutes
- Refresh token expires in 30 days
- User data returned
- Session created

**Status:** Not Tested

---

#### TC-037: POST /api/v1/auth/2fa/backup-codes/regenerate

**Endpoint:** `POST /api/v1/auth/2fa/backup-codes/regenerate`
**Type:** API
**Priority:** P1

**Request:**
```json
{
  "totpCode": "123456"
}
```

**Headers:**
- Authorization: Bearer [valid JWT]

**Expected Response (200 OK):**
```json
{
  "status": "success",
  "message": "Backup codes regenerated",
  "data": {
    "backupCodes": [
      "ABCD-1234",
      "EFGH-5678",
      ...
    ],
    "codesGenerated": 10,
    "oldCodesInvalidated": 8
  }
}
```

**Validations:**
- HTTP Status: 200
- Old codes marked as invalid
- New codes stored
- Email notification sent
- Audit log entry created

**Status:** Not Tested

---

#### TC-038: GET /api/v1/auth/2fa/status

**Endpoint:** `GET /api/v1/auth/2fa/status`
**Type:** API
**Priority:** P1

**Headers:**
- Authorization: Bearer [valid JWT]

**Expected Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "twoFactorEnabled": true,
    "enabledAt": "2025-11-19T10:30:00Z",
    "backupCodesRemaining": 7,
    "backupCodesTotal": 10,
    "lastActivity": "2025-11-20T09:15:00Z",
    "trustedDevices": 1
  }
}
```

**Status:** Not Tested

---

#### TC-039: DELETE /api/v1/auth/2fa - Disable 2FA

**Endpoint:** `DELETE /api/v1/auth/2fa`
**Type:** API
**Priority:** P0

**Request:**
```json
{
  "totpCode": "123456",
  "confirmationToken": "email_confirmation_token"
}
```

**Headers:**
- Authorization: Bearer [valid JWT]

**Expected Response (200 OK):**
```json
{
  "status": "success",
  "message": "2FA disabled successfully",
  "data": {
    "twoFactorEnabled": false,
    "disabledAt": "2025-11-20T10:30:00Z"
  }
}
```

**Validations:**
- HTTP Status: 200
- two_fa_enabled set to false
- Secret deleted
- Backup codes deleted
- All sessions invalidated
- Email sent
- Audit log: critical event

**Status:** Not Tested

---

---

## Security Testing

### TC-040: Replay Attack Prevention

**Type:** Security
**Priority:** P0 (Critical)

**Description:** Ensure same TOTP code cannot be used twice within 30-second window

**Preconditions:**
- Valid TOTP code generated
- Code valid for 30 seconds

**Steps:**
1. Obtain TOTP code from authenticator (e.g., "123456")
2. Use code successfully in login
3. Immediately try same code again (within 5 seconds)
4. Attempt to use for another operation

**Expected Result:**
- First use: Success
- Second use: Rejected with "Code already used"
- Database tracks nonce/timestamp
- Prevention mechanism: TOTP timestamp storage

**Implementation Check:**
- Verify `totp_used_timestamp` is stored per user
- Reject same timestamp twice

**Status:** Not Tested

---

### TC-041: Timing Attack Resistance

**Type:** Security
**Priority:** P0 (Critical)

**Description:** Code validation timing should be constant (not reveal code length/validity via timing)

**Preconditions:**
- 2FA verification endpoint
- Timing analysis tool

**Steps:**
1. Measure time to reject valid code format but invalid value (e.g., "111111")
2. Measure time to reject invalid format (e.g., "12345" - 5 digits)
3. Compare timing differences

**Expected Result:**
- Timing is consistent (within 10ms variance)
- No information leakage via timing
- Use constant-time comparison (bcrypt)
- Implementation: crypto.timingSafeEqual()

**Status:** Not Tested

---

### TC-042: Brute Force Protection (Rate Limiting)

**Type:** Security
**Priority:** P0 (Critical)

**Description:** Rapid wrong attempts should be blocked

**Preconditions:**
- 2FA modal open with challenge token
- Attacker attempting brute force

**Steps:**
1. Try wrong code 5 times in 60 seconds
2. On 6th attempt

**Expected Result:**
- After 5 failures: Lockout for 15 minutes
- Error: "Too many attempts. Try again in 15 minutes."
- Lock applies per challenge_token
- Log: All attempts with timestamp

**Verification:**
- Check Redis: `2fa:attempts:user_id:challenge_token`
- Verify TTL is 15 minutes
- After 15 min: Counter resets

**Status:** Not Tested

---

### TC-043: Secret Encryption Verification

**Type:** Security
**Priority:** P0 (Critical)

**Description:** TOTP secret must be encrypted at rest with AES-256-GCM

**Preconditions:**
- User has 2FA enabled
- Secret stored in database

**Steps:**
1. Query database for `two_fa_secret_encrypted` column
2. Attempt to read plaintext
3. Try to decrypt without key

**Expected Result:**
- Secret in database is NOT plaintext
- Secret is base64-encoded ciphertext
- Format: iv(hex) + authTag(hex) + encrypted(hex)
- Cannot decrypt without encryption key
- Encryption algorithm: AES-256-GCM
- Key rotation policy in place

**Verification:**
```sql
SELECT two_fa_secret_encrypted FROM users
WHERE id = 'user_id';
-- Should return: sFmK3h9Xm2N5L8Q...
-- NOT: ABCDEFGHIJKLMNOP
```

**Status:** Not Tested

---

#### TC-044: Backup Code Hashing

**Type:** Security
**Priority:** P0 (Critical)

**Description:** Backup codes must be hashed (not plaintext) in database

**Preconditions:**
- User has backup codes
- Codes stored in `backup_codes` table

**Steps:**
1. Query backup_codes table
2. Check code_hash column values
3. Verify they're hashed

**Expected Result:**
- code_hash contains bcrypt hash (not plaintext)
- Hash format: `$2b$10$...` (bcrypt format)
- Cannot reverse-engineer plaintext
- Codes are hashed with bcrypt (cost=10)

**Verification:**
```sql
SELECT code_hash FROM backup_codes
WHERE user_id = 'user_id';
-- Should return: $2b$10$...
-- NOT: ABCD-1234
```

**Status:** Not Tested

---

#### TC-045: SQL Injection Protection

**Type:** Security - OWASP A3
**Priority:** P0 (Critical)

**Description:** All inputs must be parameterized (no string concatenation)

**Preconditions:**
- 2FA endpoints
- Attacker attempting SQL injection

**Steps:**
1. In TOTP code field, enter: `" OR "1"="1`
2. In backup code field, enter: `admin'--`
3. In setup token field, enter: `'; DROP TABLE users;--`

**Expected Result:**
- All inputs treated as literal strings
- No SQL queries executed
- Input validation rejects non-numeric (TOTP)
- Parameterized queries used throughout
- No error leakage

**Status:** Not Tested

---

#### TC-046: XSS Prevention (QR Code)

**Type:** Security - OWASP A7
**Priority:** P0 (Critical)

**Description:** QR code must not inject malicious scripts

**Preconditions:**
- QR code generation endpoint
- Attacker attempting XSS

**Steps:**
1. Check QR code generation code
2. Verify email is properly escaped
3. Check if manual entry key is escaped

**Expected Result:**
- QR code is base64-encoded image (not HTML)
- Manual entry key HTML-escaped
- User input sanitized
- No inline scripts possible
- Content-Security-Policy headers set

**Code Review Points:**
- Manual key displayed with proper escaping
- No innerHTML used
- Only textContent or value attributes

**Status:** Not Tested

---

#### TC-047: CSRF Protection

**Type:** Security - OWASP A8
**Priority:** P0 (Critical)

**Description:** 2FA endpoints must use CSRF tokens

**Preconditions:**
- 2FA endpoints
- POST/DELETE requests

**Steps:**
1. Attempt POST /api/v1/auth/2fa/verify without CSRF token
2. Request from different domain
3. Check request headers

**Expected Result:**
- CSRF token required for state-changing operations
- Token validated on server
- Token tied to session
- Prevents cross-site attacks
- Headers check: X-CSRF-Token or from body

**Status:** Not Tested

---

#### TC-048: Information Disclosure

**Type:** Security
**Priority:** P0 (Critical)

**Description:** Error messages must not leak security information

**Preconditions:**
- 2FA endpoints with various error conditions

**Steps:**
1. Try invalid TOTP code
2. Try non-existent setup token
3. Try with expired challenge token
4. Monitor error messages

**Expected Result:**
- Generic error messages (no enumeration)
- Message: "Invalid code" (not "Code is 6 digits" or "Code must be numeric")
- Message: "Invalid token" (not "Token expired" - timing safe)
- No stack traces in production
- Logs contain details, but not exposed to user

**Examples - Bad Responses:**
```
❌ "Your code is incorrect. You've tried 3 of 5 times."
❌ "TOTP secret not found for user"
❌ "Setup token expired at 2025-11-20T11:30:00Z"
```

**Examples - Good Responses:**
```
✅ "Invalid code. Please try again."
✅ "Verification failed. Try again."
❌ No details leaking
```

**Status:** Not Tested

---

---

## UI/UX Testing

### TC-049: QR Code Display Quality

**Type:** E2E - UI
**Priority:** P1

**Preconditions:**
- User on 2FA setup page
- QR code displayed

**Steps:**
1. View QR code on desktop
2. View QR code on mobile (viewport 375x667)
3. View at different zoom levels (100%, 200%)
4. View in low light conditions

**Expected Result:**
- QR code is 200x200px minimum
- Sharp and clear
- High contrast (black on white)
- Scannable from 1-3 feet away
- Works at all zoom levels
- Centered on screen
- Responsive on mobile

**Status:** Not Tested

---

#### TC-050: Backup Codes Display Readability

**Type:** E2E - UI
**Priority:** P1

**Preconditions:**
- Backup codes displayed
- Various screen sizes

**Steps:**
1. View on desktop (1920x1080)
2. View on tablet (768x1024)
3. View on mobile (375x667)
4. View code font size

**Expected Result:**
- Codes use monospace font (Courier, Monaco, etc.)
- Font size minimum 14px
- Line height provides clear separation
- Codes clearly distinguishable (no ambiguous characters like 0/O, 1/I)
- Copy button accessible
- Layout responsive (grid or list based on screen)

**Status:** Not Tested

---

#### TC-051: Form Validation Feedback

**Type:** E2E - UI
**Priority:** P1

**Preconditions:**
- TOTP code input field
- Backup code input field

**Steps:**
1. Click field without entering anything
2. Enter invalid format (text instead of numbers)
3. Enter valid format
4. Observe feedback

**Expected Result:**
- TOTP field: Only accepts 6 digits
  - Auto-format as user types
  - Non-numeric input rejected
  - Placeholder: "000000"
- Backup code field: Accepts "XXXX-XXXX" format
  - Dashes auto-inserted
  - Non-alphanumeric rejected
  - Case-insensitive
- Real-time validation feedback
- Green checkmark on valid input
- Error message on invalid

**Status:** Not Tested

---

#### TC-052: Modal Accessibility

**Type:** E2E - Accessibility
**Priority:** P0

**Preconditions:**
- 2FA modal displayed

**Steps:**
1. Use keyboard only (no mouse)
2. Tab through elements
3. Use screen reader (NVDA/JAWS)
4. Check focus indicators

**Expected Result:**
- Tab order is logical
- Focus indicators clearly visible
- All interactive elements keyboard accessible
- Modal title announced by screen reader
- Error messages associated with fields
- Screen reader announces required fields
- ESC key closes modal (with confirmation)
- Focus returned to correct element on close

**WCAG 2.1 Level AA Compliance:**
- [ ] Contrast ratio ≥ 4.5:1 (text on background)
- [ ] Focus indicators visible
- [ ] Form labels associated
- [ ] Error messages linked to fields
- [ ] Instructions clear

**Status:** Not Tested

---

#### TC-053: Auto-Submit UX

**Type:** E2E - UI
**Priority:** P1

**Preconditions:**
- 2FA modal with code input
- Code input focused

**Steps:**
1. Enter 6-digit code digit by digit
2. After 6th digit, observe auto-submission
3. Don't press Enter or click button

**Expected Result:**
- Code auto-submits after 6th digit
- No need for manual button click
- Loading indicator shows
- Smooth transition
- Improves UX significantly
- Saves ~2 seconds per login

**Status:** Not Tested

---

#### TC-054: Error Message Clarity

**Type:** E2E - UX
**Priority:** P1

**Preconditions:**
- 2FA modal with various error conditions

**Steps:**
1. Enter invalid code
2. Wait for rate limit
3. Use expired challenge token
4. Read error messages

**Expected Result:**
- Error messages are clear and actionable
- Messages in user's preferred language (Turkish/English)
- Suggest next steps
- Not too technical
- Not too generic

**Examples:**
```
Good:
- "Invalid code. Please try again."
- "Too many attempts. Try again in 15 minutes."
- "This device setup has expired. Please try again."

Bad:
- "Code validation failed."
- "Error 401 Unauthorized"
- "TOTP verification failure: ERR_INVALID_TOKEN"
```

**Status:** Not Tested

---

#### TC-055: Mobile Experience

**Type:** E2E - E2E
**Priority:** P1

**Preconditions:**
- Testing on mobile browser or iOS/Android app
- 2FA modal visible

**Steps:**
1. On mobile (375px width), view 2FA modal
2. Enter code using numeric keyboard
3. Submit on mobile
4. Check usability

**Expected Result:**
- Modal is full-screen or properly sized
- TOTP input field triggers numeric keyboard on mobile
- Keyboard doesn't obscure input
- Buttons are touch-friendly (min 44x44px)
- One-handed usability possible
- No horizontal scrolling needed
- Font size readable without pinch-zoom

**Status:** Not Tested

---

---

## Performance Testing

### TC-056: 2FA Setup Performance

**Type:** Performance
**Priority:** P2

**Description:** QR code generation should be fast

**Test Conditions:**
- 1 concurrent user
- Baseline: No system load

**Steps:**
1. Measure time: POST /api/v1/auth/2fa/setup

**Expected Result:**
- Response time < 500ms (p95)
- 200ms average (p50)
- Includes QR code generation
- Includes backup code generation
- Database write included

**Measurement Tool:** Postman / k6

**Status:** Not Tested

---

#### TC-057: 2FA Verification Performance (Load)

**Type:** Performance - Load Testing
**Priority:** P2

**Description:** Verify endpoint should handle 500+ req/sec

**Test Setup:**
- k6 script with 100 concurrent users
- Duration: 5 minutes
- Ramp-up: 1 minute

**Steps:**
1. Simulate 100 concurrent 2FA verifications
2. Mix of valid and invalid codes
3. Monitor response times and errors

**Expected Result:**
- p95 response time < 200ms
- p99 response time < 500ms
- Error rate < 0.1%
- No memory leaks
- CPU usage < 80%
- Database connection pool healthy

**Load Profile:**
```
Ramp-up:    0-60s:    0 → 100 users
Sustain:   60-300s:   100 users
Ramp-down: 300-360s:  100 → 0 users
```

**Status:** Not Tested

---

#### TC-058: QR Code Generation Under Load

**Type:** Performance - Scalability
**Priority:** P2

**Description:** QR code service should handle 50+ concurrent generations

**Test Setup:**
- k6 load test
- 50 concurrent /2fa/setup calls
- All generating QR codes simultaneously

**Steps:**
1. Simulate 50 users initiating 2FA setup
2. Monitor QR generation service
3. Check response times

**Expected Result:**
- All requests complete < 1 second
- QR library doesn't bottleneck
- No queue buildup
- CPU < 70%
- Memory stable

**Status:** Not Tested

---

#### TC-059: Rate Limiting Performance

**Type:** Performance
**Priority:** P2

**Description:** Rate limit checks shouldn't add significant latency

**Test Conditions:**
- Single user
- Multiple rapid requests (brute force simulation)

**Steps:**
1. Send 10 requests in 2 seconds
2. Measure time for rate limit check
3. Compare to normal request time

**Expected Result:**
- Rate limit overhead < 10ms
- Check is fast (Redis lookup)
- No noticeable latency to user
- Lock timeout respected

**Status:** Not Tested

---

#### TC-060: Database Query Performance

**Type:** Performance - Database
**Priority:** P2

**Description:** All 2FA queries should be optimized

**Test Conditions:**
- 100,000 users in system
- Measure query times

**Queries to Test:**
1. SELECT ... FROM users WHERE two_fa_enabled = true
2. SELECT * FROM backup_codes WHERE user_id = ?
3. SELECT * FROM two_fa_audit_log WHERE user_id = ? ORDER BY created_at DESC

**Expected Result:**
- Query 1 (with index): < 50ms
- Query 2 (indexed by user_id): < 10ms
- Query 3 (with composite index): < 20ms
- All queries use indexes
- No full table scans

**Index Verification:**
```sql
-- Check indexes exist:
SELECT * FROM pg_stat_user_indexes
WHERE schemaname = 'public'
AND tablename IN ('users', 'backup_codes', 'two_fa_audit_log');
```

**Status:** Not Tested

---

---

## Test Environment Setup

### Prerequisites

#### Software Required
- Node.js 18+
- PostgreSQL 14+
- Redis 7+
- Postman or REST client
- Mobile authenticator apps:
  - Google Authenticator
  - Microsoft Authenticator
  - Authy
- Browsers: Chrome, Firefox, Safari, Edge

#### Infrastructure
- Test database (isolated)
- Test Redis instance
- Email testing service (MailHog)
- Mock SMTP server

#### Test Data
```sql
-- Create test user for 2FA testing
INSERT INTO users (
  id, email, email_verified, password_hash,
  two_fa_enabled, created_at
) VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'test2fa@example.com',
  true,
  '$2b$10$...', -- Hashed password: SecurePass123!
  false,
  NOW()
);

-- Create test user with 2FA enabled
INSERT INTO users (
  id, email, email_verified, password_hash,
  two_fa_enabled, two_fa_secret_encrypted, two_fa_enabled_at,
  created_at
) VALUES (
  '550e8400-e29b-41d4-a716-446655440001',
  'test2fa-enabled@example.com',
  true,
  '$2b$10$...',
  true,
  'sF4j3k9Xm2N5L8Q...',
  NOW(),
  NOW()
);
```

### Environment Variables

```bash
# 2FA Configuration
TWO_FACTOR_ENCRYPTION_KEY=sMF1I3Ol5Z2ZAybh9gnIIZMLb/VyZ2an+IzY7Y3y+ec=
TWO_FACTOR_ISSUER=MyCrypto Exchange
TWO_FACTOR_SETUP_EXPIRY=900
TWO_FACTOR_CHALLENGE_EXPIRY=300
TWO_FACTOR_MAX_ATTEMPTS=5
TWO_FACTOR_LOCKOUT_DURATION=900

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=1

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/mycrypto_test
```

### API Base URL
```
https://dev.api.mycrypto.local/api/v1
```

---

---

## Risk Assessment Summary

### Identified Risks (High Priority Only)

| Risk ID | Title | Severity | Impact | Mitigation |
|---------|-------|----------|--------|-----------|
| R-001 | Weak TOTP Secret Generation | Critical | Account compromise | Use secure random generation (speakeasy) |
| R-002 | Backup Code Brute Force | Critical | Account takeover | Rate limiting (3 attempts/30s) |
| R-003 | Secret Not Encrypted | Critical | Data breach | AES-256-GCM encryption |
| R-004 | TOTP Replay Attack | High | Unauthorized access | Nonce tracking |
| R-005 | Timing Attack | High | Code guessing | Constant-time comparison |
| R-006 | QR Code Vulnerability | High | Setup bypass | Validate code format |
| R-007 | Email Confirmation Bypass | High | Unauthorized disable | Email token validation |
| R-008 | Rate Limit Bypass | High | Brute force | Redis-backed limits |

---

## Execution Timeline

### Estimated Manual Testing: 6-8 hours

**Phase 1: Setup Flow** (2 hours)
- TC-001 to TC-014: QR code, backup codes, TOTP entry

**Phase 2: Login Flow** (2 hours)
- TC-015 to TC-025: 2FA login, backup codes, errors

**Phase 3: Management** (1 hour)
- TC-026 to TC-033: Status, regenerate, disable

**Phase 4: Security & Performance** (2 hours)
- TC-040 to TC-060: Security tests, load testing

**Phase 5: Automation** (1 hour)
- Import Postman collection
- Run API tests
- Verify all assertions pass

---

## Sign-Off Criteria

**All tests must pass (100%) before sign-off:**

- [ ] All 60 test cases executed (P0 + P1)
- [ ] Manual test results documented
- [ ] Postman collection passes all assertions
- [ ] No critical bugs found
- [ ] No high-severity security issues
- [ ] Performance benchmarks met
- [ ] Accessibility compliance verified
- [ ] Risk assessment reviewed
- [ ] Product owner approval
- [ ] Security team approval

---

**Test Plan Status:** READY FOR EXECUTION
**Created:** 2025-11-20
**Last Updated:** 2025-11-20
