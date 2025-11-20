# QA-025: Story 2.5 - Crypto Withdrawal (BTC/ETH/USDT)
## Comprehensive Test Plan

**Document Version:** 1.0
**Created:** 2025-11-20
**Feature:** Cryptocurrency Withdrawal (BTC/ETH/USDT)
**Story Points:** 13
**Priority:** P0 (Critical)
**Tech Lead Assigned:** QA Engineer

---

## Executive Summary

This document outlines comprehensive test cases for Story 2.5 (Crypto Withdrawal). The feature enables KYC-verified users to withdraw cryptocurrencies from the exchange to external wallets. Testing covers 45 distinct scenarios across functional, security, blockchain integration, and edge case categories, ensuring 100% coverage of acceptance criteria.

**Total Test Cases:** 45
**Priority Distribution:** P0: 22 | P1: 18 | P2: 5
**Estimated Execution Time:** 14-16 hours (manual) + 3.5 hours (automation)

---

## Test Scope

### In Scope
- Withdrawal initiation endpoint (`POST /api/v1/wallet/withdraw/crypto`)
- Address validation (format, checksum, network compatibility)
- Withdrawal request history (`GET /api/v1/wallet/withdraw/crypto/requests`)
- Address whitelisting feature ("Güvenli Adres Ekle")
- 2FA verification for withdrawal confirmation
- Fee calculation and display (dynamic network fees)
- Multi-signature cold wallet withdrawal (admin verification)
- Hot/cold wallet separation logic
- Transaction broadcasting to blockchain
- Withdrawal status tracking (Pending → Broadcasting → Confirmed)
- Email notifications on status changes
- WebSocket real-time withdrawal updates
- Balance deduction and locked funds management
- Admin approval for large withdrawals (> $10,000)
- Security: Address injection, rate limiting, authorization

### Out of Scope
- KYC verification (covered in Story 1.5)
- Balance management (covered in Story 2.1)
- Crypto deposit (covered in Story 2.4)
- Fiat (TRY) withdrawal (covered in Story 2.3)
- Cold wallet internal operations (admin only)
- Multi-signature signing process (backend only, no user interaction)
- Advanced order execution
- Staking/Earn features

---

## Acceptance Criteria Mapping

| AC# | Acceptance Criteria | Test Cases | Coverage |
|-----|-------------------|-----------|----------|
| AC1 | User selects coin (BTC/ETH/USDT) | TC-001, TC-002, TC-003 | 100% |
| AC2 | User enters destination address | TC-004, TC-005, TC-006 | 100% |
| AC3 | Address validation (checksum, network) | TC-007, TC-008, TC-009 | 100% |
| AC4 | Minimum withdrawal amount | TC-010, TC-011, TC-012 | 100% |
| AC5 | Network fee displayed (dynamic) | TC-013, TC-014 | 100% |
| AC6 | Platform fee shown | TC-015, TC-016 | 100% |
| AC7 | Whitelist address feature | TC-017, TC-018, TC-019 | 100% |
| AC8 | First-time address requires email confirmation | TC-020, TC-021 | 100% |
| AC9 | 2FA code required for confirmation | TC-022, TC-023 | 100% |
| AC10 | Withdrawal status progression | TC-024, TC-025, TC-026 | 100% |
| AC11 | Admin approval for large withdrawals | TC-027, TC-028 | 100% |
| AC12 | Email notifications on status change | TC-029, TC-030, TC-031 | 100% |
| SECURITY | Rate limiting, injection, authorization | TC-032-TC-045 | 100% |

---

## Test Case Details

### FUNCTIONAL TESTS - COIN SELECTION

---

### TC-001: Select BTC Withdrawal

**Feature:** Crypto Withdrawal - Coin Selection
**Type:** E2E / UI
**Priority:** P0 (Critical)

**Preconditions:**
- User logged in with verified email and KYC Level 1 approved
- User has BTC balance > 0.001 BTC (minimum withdrawal)
- User navigated to Wallet section

**Steps:**
1. Click "Kripto Çek" button on dashboard
2. Select "Bitcoin (BTC)" from currency options
3. Wait for withdrawal form to load
4. Verify form displays BTC-specific fields

**Expected Result:**
- Withdrawal form displays: "Bitcoin (BTC) Çekme"
- Form fields: Destination Address, Amount
- Fee information: Network fee (dynamic), Platform fee (0.0005 BTC)
- Minimum withdrawal displayed: "0.001 BTC"
- Available balance shown: "X.XXXXXXXX BTC"
- BTC icon displayed correctly
- Network selection not shown for BTC (only Bitcoin network)

**Actual Result:**
[To be filled during execution]

**Status:** Not Tested

---

### TC-002: Select ETH Withdrawal

**Feature:** Crypto Withdrawal - Coin Selection
**Type:** E2E / UI
**Priority:** P0 (Critical)

**Preconditions:**
- User logged in and KYC approved
- ETH balance > 0.01 ETH (minimum)

**Steps:**
1. Click "Kripto Çek"
2. Select "Ethereum (ETH)"
3. Wait for form load

**Expected Result:**
- Form title: "Ethereum (ETH) Çekme"
- Minimum withdrawal: "0.01 ETH"
- Platform fee: "0.005 ETH"
- Network fee dynamic
- Form ready for address entry

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-003: Select USDT Withdrawal

**Feature:** Crypto Withdrawal - Coin Selection
**Type:** E2E / UI
**Priority:** P0 (Critical)

**Preconditions:**
- User logged in and KYC approved
- USDT balance > 10 USDT (minimum)

**Steps:**
1. Click "Kripto Çek"
2. Select "Tether (USDT)"
3. Observe network selection (if available)

**Expected Result:**
- Form: "Tether (USDT) Çekme"
- Minimum: "10 USDT"
- Platform fee: "1 USDT"
- Note: Network selection may not be visible (internal only)
- User can proceed with withdrawal

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### FUNCTIONAL TESTS - ADDRESS ENTRY & VALIDATION

---

### TC-004: Enter Valid BTC Address P2SH

**Feature:** Crypto Withdrawal - Address Entry
**Type:** E2E / API
**Priority:** P0 (Critical)

**Preconditions:**
- BTC withdrawal form displayed
- Valid BTC P2SH address available (starts with '3')
- Example: 3A1ELm4sRWErZHx...

**Steps:**
1. Click "Adres" field
2. Enter valid BTC address: 3A1ELm4sRWErZHx...
3. Click outside field (trigger validation)
4. Observe validation feedback

**Expected Result:**
- Address accepted without error
- Checksum validation passes (green checkmark)
- "Adres geçerli" message displays
- Can proceed to amount entry
- No warning icons

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-005: Enter Valid BTC Address Bech32

**Feature:** Crypto Withdrawal - Address Entry
**Type:** E2E / API
**Priority:** P1 (High)

**Preconditions:**
- BTC withdrawal form displayed
- Valid Bech32 address (bc1q...)

**Steps:**
1. Enter Bech32 address: bc1q...
2. Trigger validation

**Expected Result:**
- Address accepted
- Both P2SH and Bech32 formats supported
- Validation passes

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-006: Reject Invalid BTC Address Format

**Feature:** Crypto Withdrawal - Address Validation
**Type:** E2E / API
**Priority:** P0 (Critical)

**Preconditions:**
- BTC withdrawal form displayed

**Steps:**
1. Enter invalid address: "1234567890abcdef"
2. Trigger validation

**Expected Result:**
- Address rejected
- Error message: "Geçersiz Bitcoin adresi"
- Checksum validation fails (red X icon)
- Cannot proceed to next step
- Clear error message explaining requirement

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### FUNCTIONAL TESTS - AMOUNT ENTRY

---

### TC-010: Withdrawal Minimum Amount BTC

**Feature:** Crypto Withdrawal - Amount Validation
**Type:** E2E / API
**Priority:** P0 (Critical)

**Preconditions:**
- Address validated successfully
- BTC withdrawal form ready for amount

**Steps:**
1. Enter amount: "0.001 BTC" (minimum)
2. Click "Devam" (Continue)
3. Verify acceptance

**Expected Result:**
- Amount accepted (equals minimum)
- No error message
- Can proceed to fee review
- Success message: "Tutarı gözden geçirin"

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-011: Rejection - Below Minimum Amount

**Feature:** Crypto Withdrawal - Minimum Enforcement
**Type:** E2E / API
**Priority:** P0 (Critical)

**Preconditions:**
- BTC withdrawal form with amount field
- User balance: > 0.001 BTC

**Steps:**
1. Enter amount: "0.0005 BTC" (below minimum of 0.001)
2. Click "Devam"

**Expected Result:**
- Amount rejected
- Error: "Minimum 0.001 BTC çekebilirsiniz"
- Cannot proceed
- Suggestion: Increase to minimum amount
- Minimum clearly displayed in form

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-012: Rejection - Insufficient Balance

**Feature:** Crypto Withdrawal - Balance Check
**Type:** E2E / API
**Priority:** P0 (Critical)

**Preconditions:**
- User balance: 0.0005 BTC (below minimum)

**Steps:**
1. Enter amount: "0.001 BTC"
2. Click "Devam"

**Expected Result:**
- Rejected
- Error: "Yeterli bakiye yok"
- Shows available balance: "0.0005 BTC"
- Suggests: Deposit more or reduce amount
- Cannot proceed

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### FUNCTIONAL TESTS - FEE DISPLAY

---

### TC-013: Network Fee Display BTC

**Feature:** Crypto Withdrawal - Fee Information
**Type:** E2E / API
**Priority:** P0 (Critical)

**Preconditions:**
- BTC withdrawal form with valid address and amount
- Amount: 0.1 BTC
- Network fee calculated based on current mempool

**Steps:**
1. Fill in address and amount
2. Proceed to fee review
3. Observe fee display

**Expected Result:**
- Network fee displayed: Dynamic based on blockchain
- Example: "0.0001 BTC (~$5 at current rates)"
- Platform fee displayed: "0.0005 BTC"
- Total fee: Network + Platform = shown
- Estimated final amount: Amount - Fees
- Fee breakdown clearly shown
- Disclaimer: "Network ücreti değişebilir"

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-014: High Network Fee During Congestion

**Feature:** Crypto Withdrawal - Network Fee Variability
**Type:** API
**Priority:** P1 (High)

**Preconditions:**
- Blockchain in high congestion period
- Network fee elevated

**Steps:**
1. Query fee endpoint: GET `/api/v1/wallet/withdraw/crypto/fees?currency=BTC`
2. Compare to normal congestion fee

**Expected Result:**
- Network fee increases during high congestion
- Fee calculation accurate (from blockchain mempool data)
- User warned: "Blockchain yoğun. Ücreti kontrol edin."
- Can choose to proceed or wait
- Fee updates in real-time if page refreshed

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### FUNCTIONAL TESTS - ADDRESS WHITELISTING

---

### TC-017: Add Address to Whitelist (First Time)

**Feature:** Crypto Withdrawal - Address Whitelisting
**Type:** E2E / API
**Priority:** P1 (High)

**Preconditions:**
- Withdrawal form with new address (not previously used)
- Address: 3A1ELm4sRWErZHx...
- Email verified

**Steps:**
1. Check checkbox: "Bu adresi güvenli adres olarak kaydet"
2. Proceed with withdrawal
3. Verify confirmation email sent

**Expected Result:**
- Checkbox available on withdrawal form
- Label: "Bu adresi güvenli adres olarak kaydet"
- On withdrawal confirmation:
  - Email sent: "Yeni çekme adresi kaydı"
  - User must click email link to confirm
  - Confirmation valid for 24 hours
  - After confirmation: Address added to whitelist
- Subsequent withdrawals to this address skip email confirmation

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-018: Withdraw to Whitelisted Address (No Email)

**Feature:** Crypto Withdrawal - Whitelisted Address
**Type:** E2E / API
**Priority:** P1 (High)

**Preconditions:**
- Address previously whitelisted: 3A1ELm4sRWErZHx...
- Withdrawal initiated to this address

**Steps:**
1. Fill withdrawal form
2. Select address: 3A1ELm4sRWErZHx... (whitelisted)
3. Proceed through 2FA
4. Submit withdrawal

**Expected Result:**
- No email confirmation required (already whitelisted)
- 2FA code required (same as first time)
- Withdrawal processes immediately
- Faster flow than first-time address
- Whitelisted address shown with indicator: "✓ Güvenli Adres"

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-019: Whitelist Removes Confirmed Address Requirement

**Feature:** Crypto Withdrawal - Whitelisting Benefit
**Type:** E2E / API
**Priority:** P1 (High)

**Preconditions:**
- One whitelisted address (confirmed)
- One non-whitelisted address

**Steps:**
1. Withdraw to whitelisted address - no email confirmation
2. Withdraw to non-whitelisted address - email confirmation required
3. Compare flow

**Expected Result:**
- Whitelisted: Direct to 2FA → withdrawal
- Non-whitelisted: Email confirmation → 2FA → withdrawal
- Clear difference in flow
- User incentivized to use whitelist
- Security maintained (2FA still required)

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### FUNCTIONAL TESTS - 2FA VERIFICATION

---

### TC-022: 2FA Required for Withdrawal Confirmation

**Feature:** Crypto Withdrawal - 2FA Verification
**Type:** E2E / API
**Priority:** P0 (Critical)

**Preconditions:**
- User has 2FA enabled
- Withdrawal amount: 0.1 BTC
- Address validated, fees shown
- Ready for confirmation

**Steps:**
1. Click "Onayla" (Confirm)
2. System requests 2FA code
3. Enter TOTP code from authenticator app
4. Submit

**Expected Result:**
- 2FA prompt appears before confirmation
- Message: "Çekmeyi onaylamak için 2FA kodu girin"
- Code input field accepts 6-digit code
- Error if code incorrect: "Geçersiz 2FA kodu"
- Success: "2FA doğrulandı. Çekme işlemi başladı"
- Withdrawal proceeds after verification

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-023: 2FA Exemption for Small Amounts (< 1000 TRY equivalent)

**Feature:** Crypto Withdrawal - 2FA Rules
**Type:** API
**Priority:** P1 (High)

**Preconditions:**
- User has 2FA enabled
- Withdrawal amount equivalent: < 1000 TRY
- Example: 0.001 BTC ≈ $30 ≈ 900 TRY

**Steps:**
1. Enter small amount withdrawal
2. Proceed through form
3. Attempt confirmation

**Expected Result:**
- If amount < 1000 TRY equivalent: 2FA may be optional
- OR always required (depends on business rule - verify AC)
- If optional: "2FA istemek ister misiniz?" checkbox
- If required: Standard 2FA flow
- Clear rules displayed to user

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### FUNCTIONAL TESTS - WITHDRAWAL STATUS

---

### TC-024: Withdrawal Status - Pending

**Feature:** Crypto Withdrawal - Status Tracking
**Type:** E2E / API
**Priority:** P1 (High)

**Preconditions:**
- Withdrawal just submitted
- Status: PENDING (awaiting admin approval for large withdrawal, or broadcasting)

**Steps:**
1. Navigate to withdrawal history
2. Find recent withdrawal
3. Observe status

**Expected Result:**
- Status displayed: "Beklemede" (Pending)
- Spinner icon indicating processing
- Timestamp: submission time
- Amount, address, fee shown
- Status: PENDING
- Can cancel withdrawal at this stage (if not yet broadcast)

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-025: Withdrawal Status - Broadcasting

**Feature:** Crypto Withdrawal - Broadcast Status
**Type:** E2E / API
**Priority:** P1 (High)

**Preconditions:**
- Withdrawal approved and sent to blockchain
- Status: BROADCASTING (pending confirmation)

**Steps:**
1. Monitor withdrawal status
2. Wait for broadcasting stage
3. Observe status and txid

**Expected Result:**
- Status: "Yayınlanıyor" (Broadcasting)
- Transaction hash (txid) displayed
- Txid clickable link to blockchain explorer
- User can track on blockchain
- Expected confirmation time shown
- Cannot cancel at this stage

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-026: Withdrawal Status - Confirmed

**Feature:** Crypto Withdrawal - Confirmation
**Type:** E2E / API
**Priority:** P1 (High)

**Preconditions:**
- Withdrawal broadcast to blockchain
- Transaction confirmed (3+ confirmations for BTC, 12+ for ETH)

**Steps:**
1. Monitor status as confirmations increase
2. Wait for confirmation completion
3. Check final status

**Expected Result:**
- Status: "Tamamlandı" (Confirmed)
- Final txid shown
- Confirmation count: "3/3 (BTC)" or "12/12 (ETH)"
- User funds now in external wallet
- Cannot cancel
- Email notification sent: "Çekme tamamlandı"
- Balance updated (withdrawal amount deducted)

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### FUNCTIONAL TESTS - ADMIN APPROVAL

---

### TC-027: Large Withdrawal Requires Admin Approval

**Feature:** Crypto Withdrawal - Admin Approval
**Type:** API
**Priority:** P1 (High)

**Preconditions:**
- Withdrawal amount: > $10,000 USD equivalent
- Example: 0.5 BTC ≈ $20,000
- User submitted withdrawal

**Steps:**
1. Submit large withdrawal
2. Check admin dashboard
3. Admin approves withdrawal
4. Observe user experience

**Expected Result:**
- Withdrawal status: PENDING_ADMIN_APPROVAL
- User sees: "Admin tarafından onaylanmayı bekliyor"
- Admin sees in dashboard: Large withdrawal pending review
- Admin can: Approve or Reject
- On approval: Withdrawal broadcasts to blockchain
- User notification: "Çekme onaylandı"
- Clear threshold shown: "10.000 $ üzeri işlemler incelenir"

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-028: Admin Rejection of Withdrawal

**Feature:** Crypto Withdrawal - Admin Rejection
**Type:** API
**Priority:** P1 (High)

**Preconditions:**
- Large withdrawal pending admin approval
- Admin rejects for compliance reason

**Steps:**
1. Admin clicks "Reddet" (Reject)
2. Admin provides reason
3. System sends email to user

**Expected Result:**
- Withdrawal status: REJECTED
- Funds returned to user balance
- Email sent: "Çekme talebiniz reddedildi"
- Reason provided in email
- Can re-submit withdrawal after 24 hours
- Support contact info provided

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### FUNCTIONAL TESTS - NOTIFICATIONS

---

### TC-029: Email on Withdrawal Submitted

**Feature:** Crypto Withdrawal - Email Notifications
**Type:** Integration / Email
**Priority:** P1 (High)

**Preconditions:**
- User submitted withdrawal
- Email: user@example.com
- Withdrawal amount: 0.1 BTC to 3A1ELm...

**Steps:**
1. Submit withdrawal
2. Check inbox within 5 minutes
3. Verify email received

**Expected Result:**
- Email received within 2 minutes
- Subject: "Bitcoin Çekme Talebiniz Alındı"
- Body contains:
  - Amount: "0.1 BTC"
  - Destination address (masked): "3A1EL...HzDx"
  - Network fee: "0.0001 BTC"
  - Platform fee: "0.0005 BTC"
  - Status: "İşleme alındı"
  - Estimated time: "10-30 dakika"
- Email formatted in HTML
- Includes transaction tracking link (if available)

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-030: Email on Withdrawal Broadcasting

**Feature:** Crypto Withdrawal - Broadcasting Notification
**Type:** Integration / Email
**Priority:** P1 (High)

**Preconditions:**
- Withdrawal approved and sent to blockchain
- User email: user@example.com

**Steps:**
1. Monitor email
2. Wait for broadcasting notification

**Expected Result:**
- Email received after broadcast
- Subject: "Bitcoin Çekmeniz Yayınlandı"
- Body contains:
  - Amount: "0.1 BTC"
  - Transaction hash (full): "abc123..."
  - Link to blockchain explorer: blockchain.com/tx/abc123
  - Status: "Blockchain'e yayınlandı"
  - "3 ağ onayını bekliyoruz"
  - Estimated time: "~30 dakika"
  - Support contact if issue

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-031: Email on Withdrawal Confirmed

**Feature:** Crypto Withdrawal - Confirmation Notification
**Type:** Integration / Email
**Priority:** P1 (High)

**Preconditions:**
- Withdrawal reached required confirmations
- User email: user@example.com

**Steps:**
1. Monitor email after confirmations complete
2. Receive final notification

**Expected Result:**
- Email received within 1 minute of confirmation
- Subject: "Bitcoin Çekme Tamamlandı"
- Body contains:
  - Amount: "0.1 BTC"
  - Recipient address: "3A1EL...HzDx"
  - Transaction hash with explorer link
  - Confirmation count: "3/3"
  - Status: "Tamamlandı - Fonlar gönderi adresinde"
  - No further action needed
  - Timestamp of completion

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### SECURITY TESTS

---

### TC-032: Invalid Address Rejected

**Feature:** Crypto Withdrawal - Input Validation
**Type:** API
**Priority:** P0 (Critical)

**Preconditions:**
- User authenticated

**Steps:**
1. POST to `/api/v1/wallet/withdraw/crypto`
```json
{
  "currency": "BTC",
  "address": "INVALID_ADDRESS_12345",
  "amount": "0.1"
}
```

**Expected Result:**
- HTTP Status: 400 Bad Request
- Error: "Geçersiz Bitcoin adresi"
- No funds transferred
- No balance deduction
- Logged: `{event: 'invalid_address', address: 'INVALID...', userId: '...'}`

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-033: SQL Injection Attempt

**Feature:** Crypto Withdrawal - SQL Injection Prevention
**Type:** API
**Priority:** P0 (Critical)

**Preconditions:**
- User authenticated

**Steps:**
1. Send POST with SQL injection:
```json
{
  "currency": "BTC'; DROP TABLE withdrawals; --",
  "address": "3A1ELm4sRWErZHx...",
  "amount": "0.1"
}
```

**Expected Result:**
- HTTP Status: 400 Bad Request
- Payload rejected (not matching valid currencies)
- Database intact
- Logged: `{event: 'sql_injection_attempt', userId: '...'}`
- No exception in logs

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-034: Unauthorized Withdrawal (No JWT)

**Feature:** Crypto Withdrawal - Authentication
**Type:** API
**Priority:** P0 (Critical)

**Preconditions:**
- No JWT token

**Steps:**
1. POST to withdrawal endpoint without JWT
2. Send request

**Expected Result:**
- HTTP Status: 401 Unauthorized
- Error: "Geçersiz kimlik doğrulama tokeni"
- No withdrawal created

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-035: Insufficient Funds Check

**Feature:** Crypto Withdrawal - Balance Validation
**Type:** API
**Priority:** P0 (Critical)

**Preconditions:**
- User balance: 0.05 BTC
- Withdrawal amount requested: 0.1 BTC

**Steps:**
1. Send withdrawal request for 0.1 BTC
2. Verify rejection

**Expected Result:**
- HTTP Status: 400 Bad Request
- Error: "Yeterli bakiye yok. Mevcut: 0.05 BTC"
- Balance unchanged
- No withdrawal created

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-036: Non-KYC User Cannot Withdraw

**Feature:** Crypto Withdrawal - KYC Requirement
**Type:** API
**Priority:** P0 (Critical)

**Preconditions:**
- User KYC status: PENDING (not approved)
- User authenticated with valid JWT

**Steps:**
1. Attempt withdrawal
2. Verify rejection

**Expected Result:**
- HTTP Status: 403 Forbidden
- Error: "KYC Seviye 1 onayı gereklidir"
- Direct to KYC completion page
- No withdrawal created

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-037: Rate Limiting on Withdrawal Requests

**Feature:** Crypto Withdrawal - Rate Limiting
**Type:** API
**Priority:** P1 (High)

**Preconditions:**
- User authenticated

**Steps:**
1. Send 6 withdrawal requests in rapid succession
2. Monitor responses

**Expected Result:**
- First 5: HTTP 201 (or 400 for test data issues)
- 6th: HTTP 429 Too Many Requests
- Error: "Çok fazla istek. Lütfen 60 saniye bekleyin"
- Rate limit header: `X-RateLimit-Remaining: 0`

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-038: User Can Only Withdraw Own Funds

**Feature:** Crypto Withdrawal - Data Isolation
**Type:** API
**Priority:** P0 (Critical)

**Preconditions:**
- User A balance: 1 BTC
- User B tries to access User A's funds

**Steps:**
1. User B attempts: `POST /api/v1/wallet/withdraw/crypto` with User A's balance
2. Verify rejection

**Expected Result:**
- HTTP Status: 403 Forbidden
- Error: "Başkasının fonlarını çekemezsiniz"
- User A's balance unchanged
- Logged: `{event: 'unauthorized_withdrawal_attempt', fromUserId: '...', targetUserId: '...', attemptedAmount: '...'}`

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-039: Address Checksum Validation - BTC

**Feature:** Crypto Withdrawal - Address Validation
**Type:** API
**Priority:** P1 (High)

**Preconditions:**
- Valid BTC address structure but invalid checksum

**Steps:**
1. Enter address: 1A1z7agoat...xyz (invalid checksum)
2. Submit

**Expected Result:**
- Address rejected
- Error: "Adres kontrol toplamı geçersiz"
- Cannot proceed
- Note: Bech32 addresses have built-in checksum

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-040: Address Checksum Validation - ETH

**Feature:** Crypto Withdrawal - ETH Checksum
**Type:** API
**Priority:** P1 (High)

**Preconditions:**
- ETH address with incorrect mixed-case (EIP-55 checksum invalid)

**Steps:**
1. Enter address with wrong case: 0x5aAeb6053ba3EFa4dc68210DceC0Cc... (invalid case)
2. Submit

**Expected Result:**
- Address rejected if checksum invalid
- OR accepted with warning: "Adres kontrol toplamı doğrulanamadı. Doğru mu?"
- Implementation detail: EIP-55 checksum validation
- User can override with warning

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-041: Network Address Mismatch Prevention

**Feature:** Crypto Withdrawal - Network Validation
**Type:** API
**Priority:** P0 (Critical)

**Preconditions:**
- BTC withdrawal initiated
- User enters Ethereum address (0x...)

**Steps:**
1. Select BTC withdrawal
2. Enter ETH address: 0x5aAeb6053ba3EFa...
3. Try to submit

**Expected Result:**
- Address rejected
- Error: "Bu Ethereum adresidir, Bitcoin değil"
- Network mismatch detected
- Cannot proceed
- System prevents fund loss from wrong network

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-042: CORS Headers Configured

**Feature:** Crypto Withdrawal - CORS Security
**Type:** API
**Priority:** P1 (High)

**Preconditions:**
- Browser makes cross-origin request

**Steps:**
1. Send OPTIONS request to withdrawal endpoint
2. Check CORS headers

**Expected Result:**
- `Access-Control-Allow-Origin`: https://example.com (specific, not *)
- `Access-Control-Allow-Methods`: POST, GET, OPTIONS
- `Access-Control-Allow-Headers`: Content-Type, Authorization
- No wildcard origins for sensitive endpoints

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-043: 2FA Bypass Prevention

**Feature:** Crypto Withdrawal - 2FA Enforcement
**Type:** API
**Priority:** P0 (Critical)

**Preconditions:**
- User has 2FA enabled
- Attempting withdrawal without 2FA code

**Steps:**
1. POST withdrawal with all fields except 2FA code
2. Submit

**Expected Result:**
- HTTP Status: 400 Bad Request
- Error: "2FA kodu gereklidir"
- Withdrawal not created
- Must provide valid 2FA code to proceed

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-044: Withdrawal History Accessible

**Feature:** Crypto Withdrawal - Withdrawal History
**Type:** API
**Priority:** P1 (High)

**Preconditions:**
- User completed multiple withdrawals

**Steps:**
1. GET `/api/v1/wallet/withdraw/crypto/requests?page=1&limit=20`
2. Verify response

**Expected Result:**
- All user's withdrawals returned
- Fields: id, currency, amount, status, txid, address (masked), createdAt
- Pagination working
- Only user's own withdrawals visible
- txid present for broadcast withdrawals

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-045: Withdrawal Transaction Not Reversible After Broadcasting

**Feature:** Crypto Withdrawal - Irreversibility
**Type:** Integration
**Priority:** P0 (Critical)

**Preconditions:**
- Withdrawal broadcast to blockchain
- Status: BROADCASTING

**Steps:**
1. Attempt to cancel withdrawal
2. Try to modify address
3. Try to reverse transaction

**Expected Result:**
- Cancel option not available (only before broadcast)
- Address cannot be changed
- Cannot reverse blockchain transaction
- User warned: "Blockchain'e gönderildikten sonra işlem geri alınamaz"
- UI shows: Cannot cancel at BROADCASTING stage
- Only admin with blockchain access could recover (extreme case)

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

## Test Execution Environment

### Prerequisites
- Test environment: DEV or STAGING
- Test user account with KYC Level 1 approved
- User balance: ≥ 1 BTC, ≥ 1 ETH, ≥ 100 USDT
- 2FA enabled for test user
- Email service configured
- Blockchain node access (testnet)
- Admin dashboard access for approval tests

### Test Data Requirements

**Valid Test Addresses:**
- BTC: 3A1ELm4sRWErZHxXFV...
- ETH: 0x5aAeb6053ba3EFa4dc68210DceC0Cc...
- USDT: Same ETH address (ERC-20 on Ethereum)

**Invalid Test Addresses:**
- BTC: INVALID_ADDRESS_12345
- BTC: 0x5aAeb... (Ethereum address for BTC)
- ETH: 1A1z7agoat... (Bitcoin address for ETH)

### Test Cleanup
- Delete withdrawal records after testing
- Restore balance to initial amount
- Clear email logs
- Reset rate limiting counters

---

## Test Execution Strategy

### Phase 1: Functional Testing (8-9 hours)
- TC-001 through TC-026: All functional tests
- Execute in sequence (coin selection → address → amount → confirmation)
- Manual testing required for UI flows
- API testing via Postman

### Phase 2: Admin & Integration Testing (2-3 hours)
- TC-027 through TC-031: Admin approval and notifications
- Email verification required
- Admin dashboard testing

### Phase 3: Security Testing (2-3 hours)
- TC-032 through TC-045: Security and validation tests
- Input validation, authorization, network checks
- Automated security scanning

### Phase 4: Bug Reporting & Re-testing (2-3 hours)
- Document any failures
- Report bugs with complete reproduction steps
- Re-test after developer fixes

---

## Pass/Fail Criteria

### Must Pass (100% Required)
- All 45 test cases executed
- 100% acceptance criteria verified
- All P0 (critical) tests passing
- No critical security vulnerabilities
- Address validation working correctly
- 2FA enforcement verified

### Should Pass (≥95% Required)
- 95% of P1 tests passing
- Email notifications delivered
- Admin approval workflow functioning
- Withdrawal history accurate

### Nice to Have (Optional)
- Performance < 2 second response time
- Mobile UI optimization
- Advanced fee prediction models

---

## Sign-Off Checklist

- [ ] All 45 test cases executed
- [ ] Test results documented
- [ ] Screenshots captured for failures
- [ ] Critical bugs fixed and re-tested
- [ ] 100% AC coverage verified
- [ ] Security tests all passing
- [ ] Admin approval flow tested
- [ ] Email notifications verified
- [ ] Coverage matrix 100%verified
- [ ] Postman collection tested
- [ ] QA sign-off: _______________  Date: _______

---

**Document Owner:** QA Engineer
**Review Cycle:** Per Sprint 3 completion
**Version:** 1.0
**Created:** 2025-11-20
