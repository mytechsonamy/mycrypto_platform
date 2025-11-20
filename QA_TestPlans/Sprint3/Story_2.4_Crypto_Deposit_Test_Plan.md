# QA-024: Story 2.4 - Crypto Deposit (BTC/ETH/USDT)
## Comprehensive Test Plan

**Document Version:** 1.0
**Created:** 2025-11-20
**Feature:** Cryptocurrency Deposit (BTC/ETH/USDT)
**Story Points:** 13
**Priority:** P0 (Critical)
**Tech Lead Assigned:** QA Engineer

---

## Executive Summary

This document outlines comprehensive test cases for Story 2.4 (Crypto Deposit). The feature enables KYC-verified users to deposit cryptocurrencies (BTC, ETH, USDT) into their exchange wallets. Testing covers 42 distinct scenarios across functional, security, blockchain integration, and edge case categories, ensuring 100% coverage of acceptance criteria.

**Total Test Cases:** 42
**Priority Distribution:** P0: 20 | P1: 16 | P2: 6
**Estimated Execution Time:** 12-14 hours (manual) + 3 hours (automation)

---

## Test Scope

### In Scope
- Deposit address generation endpoint (`POST /api/v1/wallet/deposit/crypto/address`)
- Blockchain address validation (BTC, ETH network formats)
- QR code generation and display
- Blockchain confirmation monitoring (BlockCypher API integration)
- Balance credit after N confirmations (BTC: 3, ETH: 12, USDT: 12)
- Deposit history retrieval (`GET /api/v1/wallet/deposit/crypto/requests`)
- WebSocket notifications for deposit status changes
- Email notifications on deposit detection and credit
- Network selection for USDT (ERC-20 vs TRC-20)
- Transaction history display with txid
- Minimum deposit validation
- Security: Address format validation, injection attacks, rate limiting

### Out of Scope
- KYC verification process (covered in Story 1.5)
- Account balance management (covered in Story 2.1)
- TRY deposit process (covered in Story 2.2)
- Crypto withdrawal (covered in Story 2.5)
- Advanced wallet recovery mechanisms
- Cold wallet operations (backend only)
- Multi-sig transaction signing (admin only)

---

## Acceptance Criteria Mapping

| AC# | Acceptance Criteria | Test Cases | Coverage |
|-----|-------------------|-----------|----------|
| AC1 | User selects coin (BTC/ETH/USDT) | TC-001, TC-002, TC-003 | 100% |
| AC2 | System generates unique deposit address (per user) | TC-004, TC-005, TC-006, TC-007 | 100% |
| AC3 | QR code displayed for mobile scanning | TC-008, TC-009 | 100% |
| AC4 | Address copied with "Kopyalandı!" confirmation | TC-010, TC-011 | 100% |
| AC5 | Warning shown: "Minimum 3 confirmation gereklidir" | TC-012, TC-013 | 100% |
| AC6 | Network selection: ERC-20 or TRC-20 for USDT | TC-014, TC-015, TC-016 | 100% |
| AC7 | Deposit detected on blockchain within 10 minutes | TC-017, TC-018, TC-019 | 100% |
| AC8 | Balance credited after confirmations | TC-020, TC-021, TC-022, TC-023 | 100% |
| AC9 | Email notification on detection + final credit | TC-024, TC-025, TC-026 | 100% |
| AC10 | Transaction hash (txid) shown in history | TC-027, TC-028, TC-029 | 100% |
| SECURITY | Rate limiting, injection attacks, XSS | TC-030-TC-042 | 100% |

---

## Test Case Details

### FUNCTIONAL TESTS - COIN SELECTION

---

### TC-001: Select BTC Deposit

**Feature:** Crypto Deposit - Coin Selection
**Type:** E2E / UI
**Priority:** P0 (Critical)

**Preconditions:**
- User logged in with verified email and KYC Level 1 approved
- User navigated to Wallet section
- Dashboard displays all asset options
- BTC is listed as available currency

**Steps:**
1. Click "Kripto Yatır" button on dashboard
2. Verify currency selection modal appears
3. Click "Bitcoin (BTC)" option
4. Confirm currency selection
5. Wait for address generation screen to load

**Expected Result:**
- Currency selection modal closes
- Address generation page displays
- Page title shows: "Bitcoin (BTC) Yatırma"
- Coin icon displayed (orange Bitcoin icon)
- Address generation starts automatically
- No error messages displayed
- Page load time < 2 seconds

**Actual Result:**
[To be filled during execution]

**Status:** Not Tested

---

### TC-002: Select ETH Deposit

**Feature:** Crypto Deposit - Coin Selection
**Type:** E2E / UI
**Priority:** P0 (Critical)

**Preconditions:**
- User logged in and KYC approved
- User on Wallet deposit page
- ETH is listed as available

**Steps:**
1. Click "Kripto Yatır" button
2. Select "Ethereum (ETH)" from currency list
3. Confirm selection

**Expected Result:**
- Address generation page shows for ETH
- Page displays: "Ethereum (ETH) Yatırma"
- Correct ETH icon displayed
- Network shown as "Ethereum Mainnet"

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-003: Select USDT Deposit

**Feature:** Crypto Deposit - Coin Selection
**Type:** E2E / UI
**Priority:** P0 (Critical)

**Preconditions:**
- User logged in and KYC approved
- User on Wallet deposit page

**Steps:**
1. Click "Kripto Yatır"
2. Select "Tether (USDT)" from list
3. Confirm selection

**Expected Result:**
- Address generation page displays
- Title: "Tether (USDT) Yatırma"
- Network selection option appears (ERC-20 vs TRC-20)
- Default network: "ERC-20 (Ethereum)"

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### FUNCTIONAL TESTS - ADDRESS GENERATION

---

### TC-004: Generate Unique BTC Deposit Address

**Feature:** Crypto Deposit - Address Generation
**Type:** API
**Priority:** P0 (Critical)

**Preconditions:**
- User authenticated with valid JWT token
- User KYC Level 1 approved
- No previous BTC deposit addresses created for this user

**Steps:**
1. Send POST request to `/api/v1/wallet/deposit/crypto/address`
```json
{
  "currency": "BTC"
}
```
2. Verify response within 1 second
3. Extract generated address

**Expected Result:**
- HTTP Status: 201 Created
- Response contains:
  ```json
  {
    "success": true,
    "data": {
      "address": "3A1ELm...",
      "currency": "BTC",
      "label": "Deposit Address #1",
      "createdAt": "2025-11-20T10:00:00Z",
      "confirmationsRequired": 3,
      "minDeposit": "0.00001 BTC",
      "status": "ACTIVE"
    }
  }
  ```
- Address format matches BTC P2SH (starts with '3') or Bech32 (bc1)
- Address length: 26-35 characters
- Confirmation requirement: 3 blocks
- Address unique per user

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-005: Generate Unique ETH Deposit Address

**Feature:** Crypto Deposit - Address Generation
**Type:** API
**Priority:** P0 (Critical)

**Preconditions:**
- User authenticated and KYC approved
- No previous ETH deposit address

**Steps:**
1. POST to `/api/v1/wallet/deposit/crypto/address`
```json
{
  "currency": "ETH"
}
```

**Expected Result:**
- HTTP Status: 201 Created
- Address format: 42-character hex (0x...)
- Confirmation requirement: 12 blocks
- Min deposit: "0.001 ETH"
- Status: ACTIVE
- Address unique per user per currency

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-006: Multiple Address Generation Prevents Duplicates

**Feature:** Crypto Deposit - Address Uniqueness
**Type:** API
**Priority:** P1 (High)

**Preconditions:**
- User has previously generated a BTC address
- Previous address still ACTIVE

**Steps:**
1. Send POST to `/api/v1/wallet/deposit/crypto/address` with currency: BTC
2. Receive response
3. Compare new address with previously generated address

**Expected Result:**
- New unique address generated (different from previous)
- Previous address remains ACTIVE
- User can use either address for deposits
- Both addresses tracked separately
- Response time < 1 second

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-007: Address Generation Persists Across Sessions

**Feature:** Crypto Deposit - Address Persistence
**Type:** API
**Priority:** P1 (High)

**Preconditions:**
- User generated BTC address in previous session
- User logged out and back in

**Steps:**
1. Login to account
2. GET `/api/v1/wallet/deposit/crypto/requests?currency=BTC`
3. Verify previously generated address is returned

**Expected Result:**
- Previous address returned in history
- Address maintains ACTIVE status
- No new address generated unless explicitly requested
- Address still functional for deposits

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### FUNCTIONAL TESTS - QR CODE AND UI

---

### TC-008: QR Code Generated and Displayed

**Feature:** Crypto Deposit - QR Code Display
**Type:** E2E / UI
**Priority:** P0 (Critical)

**Preconditions:**
- User selected BTC deposit
- Address generated successfully
- User on deposit page

**Steps:**
1. Navigate to BTC deposit page
2. Wait for address display
3. Verify QR code appears on page
4. Inspect QR code element

**Expected Result:**
- QR code displays prominently on page
- QR code size: 200x200 pixels minimum
- Code format: SVG or PNG
- Code contains encoded address
- "Mobil için QR Kod" label displayed
- Can be scanned by standard QR code reader
- Mobile device can read code within 1 meter

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-009: QR Code Scanned Successfully on Mobile

**Feature:** Crypto Deposit - Mobile QR Scanning
**Type:** E2E / Mobile
**Priority:** P0 (Critical)

**Preconditions:**
- Mobile device with camera
- QR code displayed on desktop/tablet
- Mobile wallet app installed (e.g., Ledger Live, MetaMask)

**Steps:**
1. Open mobile wallet app
2. Select "Scan QR" or "Receive" option
3. Point camera at QR code on desktop
4. Wait for code to be recognized
5. Verify address populated in mobile wallet

**Expected Result:**
- Mobile app recognizes QR code within 3 seconds
- Deposit address auto-populated in mobile wallet
- Address matches address shown on desktop
- No manual copy-paste needed
- Mobile wallet confirms address matches expected format

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-010: Copy Address Button Shows Confirmation

**Feature:** Crypto Deposit - Address Copy
**Type:** E2E / UI
**Priority:** P0 (Critical)

**Preconditions:**
- User on BTC deposit page
- Address generated and displayed
- Click "Adresi Kopyala" button

**Steps:**
1. Click "Adresi Kopyala" button
2. Wait 500ms
3. Verify feedback message
4. Open text editor
5. Paste content (Ctrl+V / Cmd+V)

**Expected Result:**
- Button shows tooltip: "Kopyalandı!"
- Tooltip visible for 2-3 seconds then fades
- Address copied to system clipboard
- Pasted content matches displayed address
- Button state returns to normal after 3 seconds
- Can copy multiple times without errors

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-011: Copy Address Shows Toast Notification

**Feature:** Crypto Deposit - Copy Notification
**Type:** E2E / UI
**Priority:** P1 (High)

**Preconditions:**
- User on deposit address page

**Steps:**
1. Click copy button
2. Observe notification area

**Expected Result:**
- Toast notification appears (top-right of screen)
- Message: "Adres panoya kopyalandı" (Address copied to clipboard)
- Notification displays for 3-5 seconds
- No distraction to user workflow
- Notification auto-dismisses

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-012: Warning Display - Confirmation Requirements

**Feature:** Crypto Deposit - Confirmation Warning
**Type:** E2E / UI
**Priority:** P0 (Critical)

**Preconditions:**
- User on BTC deposit page
- Address successfully generated

**Steps:**
1. Scroll page to find warning message
2. Identify confirmation requirement text

**Expected Result:**
- Warning prominently displayed in yellow/orange box
- Text: "Minimum 3 confirmation gereklidir"
- Icon warning symbol displayed
- Additional text: "Balance will be credited after 3 network confirmations"
- BTC displays: "3 confirmations"
- ETH displays: "12 confirmations"
- USDT displays: "12 confirmations"

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-013: Information Box Shows Confirmation Details

**Feature:** Crypto Deposit - Confirmation Info
**Type:** E2E / UI
**Priority:** P1 (High)

**Preconditions:**
- User on deposit page

**Steps:**
1. Look for information section
2. Expand "Detaylı Bilgi" if collapsible

**Expected Result:**
- Shows estimated confirmation time
- BTC: "~30 minutes (6 blocks at 5 min/block)"
- ETH: "~4 minutes (12 blocks at 13 sec/block)"
- Typical network fees estimated
- Link to blockchain explorer
- "Neden 3 confirmation?" explanation

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### FUNCTIONAL TESTS - NETWORK SELECTION (USDT)

---

### TC-014: USDT Network Selection - Default ERC-20

**Feature:** Crypto Deposit - USDT Network Selection
**Type:** E2E / UI
**Priority:** P0 (Critical)

**Preconditions:**
- User selected USDT deposit
- Address generation page loaded

**Steps:**
1. Observe network selection section
2. Identify default selected network
3. Verify address format

**Expected Result:**
- Network selection dropdown visible
- Default selected: "Ethereum (ERC-20)"
- Address displayed matches Ethereum format (0x...)
- Confirmation requirement: 12 blocks
- Network cannot be changed after address generation (for security)
- Help text: "Ethereum ağında gönderilen USDT'yi kabul eder"

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-015: Switch USDT Network to TRC-20

**Feature:** Crypto Deposit - USDT Network Switch
**Type:** E2E / UI
**Priority:** P0 (Critical)

**Preconditions:**
- USDT network selection dropdown visible
- Default network: ERC-20

**Steps:**
1. Click network selection dropdown
2. Select "Tron (TRC-20)" option
3. Wait for address regeneration
4. Verify new address format

**Expected Result:**
- Dropdown opens with options: ERC-20, TRC-20
- TRC-20 option selectable
- Address regenerated for TRC-20 network
- New address starts with 'T' (Tron format)
- Address length: 34 characters
- Confirmation: 19-36 blocks required for Tron
- Help text updates: "Tron ağında gönderilen USDT'yi kabul eder"
- QR code regenerated with new address

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-016: Cannot Send ERC-20 USDT to TRC-20 Address

**Feature:** Crypto Deposit - Network Mismatch Prevention
**Type:** API
**Priority:** P0 (Critical)

**Preconditions:**
- User generates USDT address for TRC-20
- Third party sends ERC-20 USDT to TRC-20 address

**Steps:**
1. Monitor blockchain for transaction
2. Check if transaction is rejected

**Expected Result:**
- Transaction rejected by Tron network
- Funds not deposited to account
- User notification: "Transaction failed - wrong network"
- Help text: "ERC-20 USDT'yi TRC-20 adresine göndermeyin"
- Information box clearly distinguishes networks
- Network-specific address generation enforced

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### FUNCTIONAL TESTS - BLOCKCHAIN MONITORING

---

### TC-017: Deposit Detection on Blockchain - 1 Confirmation

**Feature:** Crypto Deposit - Blockchain Monitoring
**Type:** API / Integration
**Priority:** P0 (Critical)

**Preconditions:**
- User deposit address generated: `3A1ELm...` (BTC example)
- Mock blockchain transaction sent to address
- Transaction has 1 confirmation on blockchain
- BlockCypher webhook configured

**Steps:**
1. Send test transaction to generated address
2. Wait for blockchain to include transaction in block
3. Wait for 1 confirmation
4. Monitor API logs for transaction detection
5. Check wallet balance endpoint: `GET /api/v1/wallet/balance/BTC`

**Expected Result:**
- BlockCypher webhook received within 5 minutes
- Internal deposit request created with status: PENDING
- Transaction hash (txid) logged
- Balance not yet credited (awaiting 3 confirmations)
- Email sent: "Bitcoin yatırma tespiti edildi" (Detection notification)
- Deposit history shows transaction with status: PENDING
- txid displayed for user to track on blockchain explorer

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-018: Deposit Detection - Confirmation Progress

**Feature:** Crypto Deposit - Confirmation Tracking
**Type:** API / Integration
**Priority:** P0 (Critical)

**Preconditions:**
- Deposit transaction detected at 1 confirmation
- Transaction progressing on blockchain

**Steps:**
1. Wait for 2nd block confirmation
2. Query deposit status endpoint
3. Wait for 3rd confirmation
4. Query status again

**Expected Result:**
- After 2nd confirmation:
  - Deposit status: PENDING (2/3 confirmations)
  - User notified via WebSocket: `{event: 'deposit.confirmations', confirmations: 2}`
  - Balance still locked (not credited)
- After 3rd confirmation:
  - Status changes to CONFIRMED
  - WebSocket notification: `{event: 'deposit.confirmations', confirmations: 3}`
  - Deposit history updated
  - Ready for balance credit
- Timeline: ~15-20 minutes for BTC (assuming normal block time)

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-019: ETH Deposit Requires 12 Confirmations

**Feature:** Crypto Deposit - ETH Confirmation Requirement
**Type:** API / Integration
**Priority:** P0 (Critical)

**Preconditions:**
- ETH deposit address generated
- Test ETH transaction sent to address

**Steps:**
1. Send ETH to generated address
2. Monitor confirmations as blocks are added
3. Check deposit status at 6 confirmations
4. Check deposit status at 12 confirmations

**Expected Result:**
- At 6 confirmations: Status PENDING, balance not credited
- At 12 confirmations: Status CONFIRMED, ready to credit
- Each confirmation triggers WebSocket event
- Email sent after 6 confirmations: "Hazırlanıyor..." (Preparing)
- Email sent after 12 confirmations: "Tamamlandı" (Completed)
- Timeline: ~3-4 minutes (Ethereum blocks ~13 sec)

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### FUNCTIONAL TESTS - BALANCE CREDIT

---

### TC-020: Balance Credited After Confirmations - BTC

**Feature:** Crypto Deposit - Balance Credit
**Type:** API
**Priority:** P0 (Critical)

**Preconditions:**
- BTC deposit received and confirmed (3 confirmations)
- Deposit status: CONFIRMED
- User balance before deposit: 0 BTC
- Amount deposited: 0.5 BTC

**Steps:**
1. Query balance endpoint: `GET /api/v1/wallet/balance/BTC`
2. Verify deposited amount appears
3. Check balance on dashboard

**Expected Result:**
- HTTP Status: 200 OK
- Balance response:
  ```json
  {
    "success": true,
    "data": {
      "currency": "BTC",
      "available": "0.50000000 BTC",
      "locked": "0 BTC",
      "total": "0.50000000 BTC",
      "lastUpdated": "2025-11-20T10:15:00Z"
    }
  }
  ```
- Balance displays 8 decimal places: "0.50000000 BTC"
- Deposit history shows status: CREDITED
- No locked balance (fully available for trading)

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-021: Balance Credit Atomic Transaction

**Feature:** Crypto Deposit - Transaction Atomicity
**Type:** API
**Priority:** P1 (High)

**Preconditions:**
- Deposit confirmed
- System processing balance credit

**Steps:**
1. Check database transaction logs
2. Monitor balance update process
3. Verify no partial credits

**Expected Result:**
- Balance credit is atomic (all-or-nothing)
- If update fails, entire transaction rolls back
- No partial deposits recorded
- Audit log shows: `{event: 'deposit.credited', amount: 0.5, txid: 'abc...', timestamp: '...'}`
- User sees balance update within 5 seconds

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-022: Multiple Deposits Accumulate Correctly

**Feature:** Crypto Deposit - Multiple Deposits
**Type:** API
**Priority:** P1 (High)

**Preconditions:**
- User has 0.5 BTC balance from first deposit
- Second deposit confirmed: 0.3 BTC

**Steps:**
1. Query balance after second deposit confirmation
2. Verify total = 0.8 BTC

**Expected Result:**
- Balance updates to: 0.80000000 BTC
- Both deposits visible in history
- Total = 0.5 + 0.3 = 0.8 BTC
- No rounding errors
- Calculation: sum(all_credited_deposits)

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-023: Deposit Credit Delayed on Network Congestion

**Feature:** Crypto Deposit - Network Delay Handling
**Type:** Integration
**Priority:** P1 (High)

**Preconditions:**
- Network is congested (higher fees, slower blocks)
- Deposit confirmed slower than normal

**Steps:**
1. Send deposit during network congestion
2. Monitor confirmation times
3. Verify credit occurs regardless of delay

**Expected Result:**
- Credit happens when confirmations reached, regardless of time elapsed
- If takes 2 hours to get 3 confirmations, credit still occurs
- Balance credited accurately
- No timeout errors
- User receives email notification even if delayed

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### FUNCTIONAL TESTS - NOTIFICATIONS

---

### TC-024: Email Notification on Deposit Detection

**Feature:** Crypto Deposit - Email Notification (Detection)
**Type:** Integration / Email
**Priority:** P1 (High)

**Preconditions:**
- Deposit transaction detected (1 confirmation)
- User email: `user@example.com`
- Email service configured

**Steps:**
1. Send deposit to user address
2. Wait for BlockCypher webhook
3. Check user inbox
4. Verify email received

**Expected Result:**
- Email received within 5 minutes
- Subject: "Bitcoin Yatırma Tespiti"
- Body contains:
  - Amount: "0.5 BTC"
  - Transaction hash: full txid with link to blockchain explorer
  - Status: "Tespiti edildi - 1/3 confirmation"
  - "24-48 saatte tamamlanacak" note
  - "Sorumunuz mu?" support link
- Email formatted in HTML
- Email includes user name

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-025: Email Notification on Deposit Credit

**Feature:** Crypto Deposit - Email Notification (Credit)
**Type:** Integration / Email
**Priority:** P1 (High)

**Preconditions:**
- Deposit reached 3 confirmations
- Credit processed
- User email verified

**Steps:**
1. Monitor inbox after credit
2. Receive confirmation email

**Expected Result:**
- Email received within 2 minutes of credit
- Subject: "Bitcoin Yatırma Tamamlandı"
- Body contains:
  - Amount: "0.5 BTC"
  - Balance update: "Yeni bakiye: 1.0 BTC"
  - Transaction hash with explorer link
  - Timestamp
  - Account summary
- Email timestamp matches deposit credit time

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-026: WebSocket Notification for Deposit Status Change

**Feature:** Crypto Deposit - WebSocket Notification
**Type:** Integration / WebSocket
**Priority:** P1 (High)

**Preconditions:**
- User connected to WebSocket: `wss://api.example.com/wallet`
- Authenticated with JWT
- Deposit transaction being processed

**Steps:**
1. Connect to WebSocket
2. Send deposit transaction
3. Monitor WebSocket messages
4. Verify events received as confirmations increase

**Expected Result:**
- WebSocket event on detection:
  ```json
  {
    "event": "deposit.detected",
    "data": {
      "currency": "BTC",
      "amount": "0.5",
      "txid": "abc...",
      "confirmations": 1,
      "status": "PENDING"
    }
  }
  ```
- Event on 3rd confirmation:
  ```json
  {
    "event": "deposit.confirmed",
    "data": {
      "currency": "BTC",
      "amount": "0.5",
      "confirmations": 3,
      "status": "CONFIRMED"
    }
  }
  ```
- Event on balance credit:
  ```json
  {
    "event": "deposit.credited",
    "data": {
      "currency": "BTC",
      "amount": "0.5",
      "newBalance": "1.5",
      "status": "CREDITED"
    }
  }
  ```

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### FUNCTIONAL TESTS - DEPOSIT HISTORY

---

### TC-027: Deposit History Shows All Deposits with txid

**Feature:** Crypto Deposit - Deposit History
**Type:** E2E / API
**Priority:** P1 (High)

**Preconditions:**
- User completed 2 deposits
- Both deposits credited
- User on transaction history page

**Steps:**
1. Navigate to Deposit History
2. Filter by "Crypto" type
3. Verify all deposits listed
4. Click on transaction to see details

**Expected Result:**
- History shows all deposits
- Columns: Date, Currency, Amount, Status, txid
- Status progression: PENDING -> CONFIRMED -> CREDITED
- txid displayed and clickable
- Link opens blockchain explorer (blockchain.info for BTC, etherscan.io for ETH)
- Transaction details include:
  - Full txid (not truncated)
  - Timestamp
  - Confirmation count
  - Fee (if applicable)
  - Sender address (masked for privacy)

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-028: Deposit History API Returns txid

**Feature:** Crypto Deposit - History API
**Type:** API
**Priority:** P1 (High)

**Preconditions:**
- User completed multiple deposits

**Steps:**
1. GET `/api/v1/wallet/deposit/crypto/requests?page=1&limit=20`
2. Verify response format

**Expected Result:**
- Response:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "uuid",
        "currency": "BTC",
        "amount": "0.5",
        "status": "CREDITED",
        "txid": "1a2b3c...",
        "address": "3A1ELm...",
        "confirmations": 3,
        "createdAt": "2025-11-20T10:00:00Z",
        "creditedAt": "2025-11-20T10:15:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5
    }
  }
  ```
- txid always present for detected deposits
- Confirmations field shows current count

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-029: Deposit History CSV Export

**Feature:** Crypto Deposit - History Export
**Type:** API
**Priority:** P2 (Medium)

**Preconditions:**
- User has deposit history

**Steps:**
1. Click "CSV İndir" on history page
2. Verify file downloaded
3. Open CSV file
4. Verify data format

**Expected Result:**
- File downloaded: `deposit_history_2025-11-20.csv`
- Columns: Date, Type, Currency, Amount, Status, TxID, Link
- All deposits included (last 90 days)
- CSV properly formatted (quoted fields, escaped commas)
- File opens in Excel/Google Sheets correctly

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### SECURITY TESTS

---

### TC-030: Invalid Currency Rejected

**Feature:** Crypto Deposit - Input Validation
**Type:** API
**Priority:** P0 (Critical)

**Preconditions:**
- User authenticated

**Steps:**
1. Send POST to `/api/v1/wallet/deposit/crypto/address`
```json
{
  "currency": "INVALID_COIN"
}
```

**Expected Result:**
- HTTP Status: 400 Bad Request
- Error: "Invalid currency: INVALID_COIN"
- Allowed currencies returned: ["BTC", "ETH", "USDT"]
- No address generated
- Logged: `{event: 'invalid_currency', currency: 'INVALID_COIN', userId: '...'}`

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-031: SQL Injection Attempt on Currency

**Feature:** Crypto Deposit - SQL Injection Prevention
**Type:** API
**Priority:** P0 (Critical)

**Preconditions:**
- User authenticated

**Steps:**
1. Send POST with SQL injection payload:
```json
{
  "currency": "BTC'; DROP TABLE users; --"
}
```

**Expected Result:**
- HTTP Status: 400 Bad Request
- Error: "Invalid currency format"
- Payload treated as literal string, not SQL
- Database tables intact
- Logged: `{event: 'security_alert', type: 'sql_injection_attempt', userId: '...'}`
- No exception in logs

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-032: XSS Attempt in Currency Parameter

**Feature:** Crypto Deposit - XSS Prevention
**Type:** API
**Priority:** P0 (Critical)

**Preconditions:**
- User authenticated

**Steps:**
1. Send POST with XSS payload:
```json
{
  "currency": "<script>alert('XSS')</script>"
}
```

**Expected Result:**
- HTTP Status: 400 Bad Request
- Payload rejected (not matching allowed currencies)
- No script execution
- User never receives this in response
- All responses use Content-Type: application/json (not HTML)

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-033: Rate Limiting on Address Generation

**Feature:** Crypto Deposit - Rate Limiting
**Type:** API
**Priority:** P1 (High)

**Preconditions:**
- User authenticated

**Steps:**
1. Send 6 consecutive POST requests to `/api/v1/wallet/deposit/crypto/address`
2. Monitor responses

**Expected Result:**
- First 5 requests: HTTP 201 (or 200 if already exists)
- 6th request: HTTP 429 Too Many Requests
- Error: "Rate limit exceeded. Try again in 60 seconds"
- Rate limit header: `X-RateLimit-Remaining: 0`
- User sees rate limit message in UI
- Limit resets after 60 seconds

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-034: Unauthorized User Cannot Generate Address

**Feature:** Crypto Deposit - Authentication
**Type:** API
**Priority:** P0 (Critical)

**Preconditions:**
- No JWT token provided

**Steps:**
1. Send POST to `/api/v1/wallet/deposit/crypto/address` without JWT
2. Verify rejection

**Expected Result:**
- HTTP Status: 401 Unauthorized
- Error: "Missing or invalid authentication token"
- No address generated
- Request logged as unauthorized attempt

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-035: Non-KYC User Cannot Generate Address

**Feature:** Crypto Deposit - KYC Requirement
**Type:** API
**Priority:** P0 (Critical)

**Preconditions:**
- User authenticated with valid JWT
- User KYC status: PENDING (not approved)

**Steps:**
1. Send POST to `/api/v1/wallet/deposit/crypto/address`

**Expected Result:**
- HTTP Status: 403 Forbidden
- Error: "KYC Level 1 approval required to deposit crypto"
- No address generated
- User directed to KYC completion page

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-036: User Can Only Access Own Addresses

**Feature:** Crypto Deposit - Data Isolation
**Type:** API
**Priority:** P0 (Critical)

**Preconditions:**
- User A generated address
- User B logged in

**Steps:**
1. User B attempts to GET User A's deposit requests via API
2. Try: `GET /api/v1/wallet/deposit/crypto/requests?userId=USER_A_ID`

**Expected Result:**
- HTTP Status: 403 Forbidden
- Error: "Cannot access other users' data"
- User B cannot see User A's addresses
- User B only sees own addresses in GET requests
- No ID-based access - only authenticated user's own data returned

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-037: Address Format Validation - BTC

**Feature:** Crypto Deposit - Address Validation
**Type:** API
**Priority:** P1 (High)

**Preconditions:**
- Deposit address generated for BTC

**Steps:**
1. Verify generated address format
2. Run address validation script

**Expected Result:**
- Address matches BTC format: P2SH (3...) or Bech32 (bc1q...)
- Length: 26-35 characters
- Characters: alphanumeric (no special chars except 0)
- Checksum valid (can be verified with tools)
- Not matching address from other currency (no ETH format for BTC)

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-038: Address Format Validation - ETH

**Feature:** Crypto Deposit - Address Validation
**Type:** API
**Priority:** P1 (High)

**Preconditions:**
- Deposit address generated for ETH

**Steps:**
1. Verify generated address format

**Expected Result:**
- Address format: 0x followed by 40 hex characters
- Total length: 42 characters
- Checksum address (EIP-55): proper mixed-case
- Valid Ethereum address (can be validated via ethers.js)
- Address is checksummed correctly

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-039: Deposit Address Not Predictable

**Feature:** Crypto Deposit - Address Randomness
**Type:** API
**Priority:** P1 (High)

**Preconditions:**
- BTC addresses generated for multiple users

**Steps:**
1. Collect 100 generated BTC addresses
2. Analyze for patterns
3. Try to predict next address

**Expected Result:**
- No sequential pattern in addresses
- Cannot predict next address from previous ones
- Addresses use HD Wallet (BIP-44) standard
- Each address derived from master key + index
- Addresses appear random to outside observer
- Cannot predict address before generation

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-040: CORS Headers Configured Correctly

**Feature:** Crypto Deposit - CORS Security
**Type:** API
**Priority:** P1 (High)

**Preconditions:**
- Browser makes cross-origin request

**Steps:**
1. Send OPTIONS request to deposit endpoint
2. Check CORS headers

**Expected Result:**
- `Access-Control-Allow-Origin`: https://example.com (specific domain, not *)
- `Access-Control-Allow-Methods`: GET, POST, OPTIONS
- `Access-Control-Allow-Headers`: Content-Type, Authorization
- `Access-Control-Max-Age`: 3600
- No wildcard (*) for sensitive endpoints

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-041: Secure Headers Present on Deposit Page

**Feature:** Crypto Deposit - Security Headers
**Type:** E2E / HTTP
**Priority:** P1 (High)

**Preconditions:**
- Load deposit page in browser

**Steps:**
1. Inspect HTTP response headers
2. Check for security headers

**Expected Result:**
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY` (prevent clickjacking)
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000`
- `Content-Security-Policy: default-src 'self'`

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-042: BlockCypher Webhook Signature Verification

**Feature:** Crypto Deposit - Webhook Security
**Type:** Integration
**Priority:** P0 (Critical)

**Preconditions:**
- BlockCypher webhook endpoint configured
- Signature verification enabled

**Steps:**
1. Send fake webhook with invalid signature
2. Monitor for rejection

**Expected Result:**
- Webhook rejected (HTTP 401 or 403)
- No data processed
- Logged: `{event: 'webhook_signature_invalid', source: 'BlockCypher'}`
- Prevents MITM attacks on blockchain notifications
- Signature verified before trusting transaction data

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

## Test Execution Environment

### Prerequisites
- Test environment: DEV or STAGING
- Test user account with KYC Level 1 approved
- BlockCypher API key configured
- Test blockchain (testnet) access
- Email service configured
- WebSocket connection available
- Admin access to database for cleanup

### Test Data Requirements

**BTC Test Addresses:**
- Address: `tb1q...` (testnet)
- Has received multiple small test transactions
- Known UTXO history

**ETH Test Account:**
- Address: `0x...` (Sepolia testnet)
- Has test ETH balance
- Known transaction history

**Mock Blockchain Transactions:**
- BTC test tx: `hash_btc_test_001`
- ETH test tx: `hash_eth_test_001`
- USDT test tx: `hash_usdt_test_001`

### Test Cleanup
- Delete generated addresses after testing
- Clear test transactions from history
- Reset test user balance
- Clear any test notifications

---

## Test Execution Strategy

### Phase 1: API Testing (3 hours)
- TC-001 through TC-029 (API and integration tests)
- Use Postman collection
- Execute on DEV environment
- Focus on happy path first

### Phase 2: UI Testing (5 hours)
- TC-001 through TC-029 (UI tests)
- Browser testing (Chrome, Firefox, Safari)
- Mobile testing (iOS Safari, Android Chrome)
- Desktop and responsive layouts

### Phase 3: Security Testing (2 hours)
- TC-030 through TC-042
- Automated security scanning
- Manual penetration testing
- OWASP compliance verification

### Phase 4: Integration Testing (2 hours)
- BlockCypher webhook testing
- Email notification verification
- WebSocket real-time updates
- Database consistency checks

### Phase 5: Performance Testing (1 hour)
- Address generation response time
- Balance update latency
- Database query performance
- WebSocket connection stability

---

## Risk Assessment and Mitigation

### High-Risk Areas
1. **Blockchain Integration**
   - Risk: Transactions not detected by BlockCypher
   - Mitigation: Fallback polling mechanism, comprehensive monitoring

2. **Data Integrity**
   - Risk: Balance corruption due to race conditions
   - Mitigation: Atomic transactions, comprehensive logging

3. **Security**
   - Risk: Address hijacking or theft
   - Mitigation: HD Wallet with strong key management, address uniqueness

### Mitigation Verification Tests
- TC-042: Webhook signature verification
- TC-020, TC-021: Balance atomicity
- TC-006, TC-007: Address uniqueness and persistence

---

## Pass/Fail Criteria

### Must Pass (100% Required)
- All P0 (Critical) tests must pass
- 100% AC coverage must be verified
- No critical security vulnerabilities
- Balance credit must be accurate within 8 decimal places
- WebSocket notifications must be real-time (< 100ms latency)

### Should Pass (95% Required)
- 95% of P1 tests must pass
- Non-critical email formatting issues acceptable
- Minor UI layout issues acceptable

### Can Fail (Post-MVP)
- Performance optimization (< 2 second response times)
- Mobile-specific UI polish
- Advanced error messages

---

## Sign-Off Checklist

- [ ] All 42 test cases executed
- [ ] Test results documented (pass/fail)
- [ ] Screenshots captured for all failures
- [ ] API integration verified
- [ ] Security tests completed
- [ ] Blockchain integration tested
- [ ] Accessibility compliance verified
- [ ] Performance baselines established
- [ ] Risk assessment completed
- [ ] All critical bugs fixed and re-tested
- [ ] Coverage matrix 100% verified
- [ ] Postman collection tested
- [ ] QA sign-off: _______________  Date: _______

---

**Document Owner:** QA Engineer
**Review Cycle:** Per Sprint 3 completion
**Version:** 1.0
**Created:** 2025-11-20
