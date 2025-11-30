# QA Phase 3: EPIC 2 (Wallet Management & Multi-Currency Support) - Comprehensive Test Plan

**Date:** 2025-11-30
**QA Engineer:** Senior QA Agent
**Phase:** Phase 3 - EPIC 2 Functional Testing
**Status:** In Progress

---

## Executive Summary

EPIC 2 covers wallet management functionality with 6 user stories totaling 36 story points:
- Story 2.1: Multi-Currency Balance Display (4 test cases)
- Story 2.2: TRY Bank Deposits (4 test cases)
- Story 2.3: TRY Bank Withdrawals (4 test cases)
- Story 2.4: Crypto Deposits (HD Wallet) (4 test cases)
- Story 2.5: Crypto Withdrawals (Blockchain) (4 test cases)
- Story 2.6: Transaction History & Export (4 test cases)

**Total Test Cases:** 24 scenarios covering deposits, withdrawals, balance management, and transaction history.

---

## Story 2.1: Multi-Currency Balance Display

### Test Case: TC-2.1.1 - View All Wallet Balances (Happy Path)

**Feature:** Multi-Currency Balance Display (Story 2.1)
**Type:** API / E2E
**Priority:** P0 (Critical)

**Preconditions:**
- User is authenticated with valid JWT token
- User has existing wallet records in database
- Wallet service is running on http://localhost:3002
- Database contains wallet data with multiple currencies (TRY, BTC, ETH, USDT)

**Steps:**
1. Retrieve authentication token from auth service
2. Call `GET /api/v1/wallet/balances` with Bearer token
3. Verify response structure and status code
4. Validate all 4 currency balances returned
5. Check balance decimal precision (TRY: 2 decimals, crypto: 8 decimals)

**Expected Result:**
- HTTP 200 OK response
- Response contains all 4 currencies: TRY, BTC, ETH, USDT
- Each wallet includes: currency, availableBalance, lockedBalance, totalBalance
- Balances properly formatted as strings for precision
- Response metadata includes timestamp and requestId

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested

---

### Test Case: TC-2.1.2 - View Single Currency Balance

**Feature:** Multi-Currency Balance Display (Story 2.1)
**Type:** API
**Priority:** P1 (High)

**Preconditions:**
- User is authenticated
- User has TRY wallet balance > 0
- Wallet service running

**Steps:**
1. Call `GET /api/v1/wallet/balance/TRY` with Bearer token
2. Verify response structure
3. Validate TRY balance returned

**Expected Result:**
- HTTP 200 OK
- Single TRY balance returned with format: { currency: "TRY", availableBalance, lockedBalance, totalBalance }
- Available + Locked = Total

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested

---

### Test Case: TC-2.1.3 - View Unsupported Currency

**Feature:** Multi-Currency Balance Display (Story 2.1)
**Type:** API
**Priority:** P2 (Medium)

**Preconditions:**
- User is authenticated
- Wallet service running

**Steps:**
1. Call `GET /api/v1/wallet/balance/XYZ` with Bearer token
2. Verify error response

**Expected Result:**
- HTTP 404 Not Found
- Error message: "Currency XYZ is not supported"

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested

---

### Test Case: TC-2.1.4 - Rate Limiting on Balance Endpoint

**Feature:** Multi-Currency Balance Display (Story 2.1)
**Type:** API
**Priority:** P1 (High)

**Preconditions:**
- User is authenticated
- Rate limit is 100 requests per minute per endpoint

**Steps:**
1. Make 100 requests to `/api/v1/wallet/balances` rapidly
2. Verify all 100 requests succeed with 200 OK
3. Make 101st request
4. Verify 101st request is rate limited

**Expected Result:**
- First 100 requests: HTTP 200 OK
- 101st request: HTTP 429 Too Many Requests
- Response includes Retry-After header

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested

---

## Story 2.2: TRY Bank Deposits

### Test Case: TC-2.2.1 - Initiate TRY Deposit (Happy Path)

**Feature:** TRY Bank Deposits (Story 2.2)
**Type:** API
**Priority:** P0 (Critical)

**Preconditions:**
- User is authenticated
- User has completed KYC verification (Level 1)
- Wallet service running
- Database accessible

**Steps:**
1. Call `POST /api/v1/deposit/fiat/initiate` with:
   ```json
   {
     "currency": "TRY",
     "amount": "1000.00",
     "bankAccountId": "acct_123"
   }
   ```
2. Verify response structure
3. Extract deposit ID from response
4. Verify deposit status in database is PENDING

**Expected Result:**
- HTTP 201 Created
- Response includes: depositId, status (PENDING), accountNumber, bankName, amount
- Deposit created in database with status PENDING
- User can proceed to bank transfer

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested

---

### Test Case: TC-2.2.2 - Insufficient KYC Level

**Feature:** TRY Bank Deposits (Story 2.2)
**Type:** API
**Priority:** P0 (Critical)

**Preconditions:**
- User is authenticated
- User has NOT completed KYC verification
- Wallet service running

**Steps:**
1. Call `POST /api/v1/deposit/fiat/initiate` with deposit details
2. Verify error response

**Expected Result:**
- HTTP 403 Forbidden
- Error message: "User must complete KYC Level 1 verification"

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested

---

### Test Case: TC-2.2.3 - Invalid Bank Account

**Feature:** TRY Bank Deposits (Story 2.2)
**Type:** API
**Priority:** P1 (High)

**Preconditions:**
- User is authenticated
- User has valid KYC Level 1
- Wallet service running

**Steps:**
1. Call `POST /api/v1/deposit/fiat/initiate` with:
   ```json
   {
     "currency": "TRY",
     "amount": "1000.00",
     "bankAccountId": "invalid_id"
   }
   ```
2. Verify error response

**Expected Result:**
- HTTP 404 Not Found
- Error message: "Bank account not found"

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested

---

### Test Case: TC-2.2.4 - Daily Deposit Limit Exceeded

**Feature:** TRY Bank Deposits (Story 2.2)
**Type:** API
**Priority:** P1 (High)

**Preconditions:**
- User is authenticated with Level 1 KYC (50K TRY/day limit)
- User has already deposited 50K TRY today
- Wallet service running

**Steps:**
1. Call `POST /api/v1/deposit/fiat/initiate` with amount: 1000 TRY
2. Verify error response

**Expected Result:**
- HTTP 422 Unprocessable Entity
- Error message: "Daily deposit limit exceeded. Remaining: 0 TRY"

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested

---

## Story 2.3: TRY Bank Withdrawals

### Test Case: TC-2.3.1 - Initiate TRY Withdrawal (Happy Path)

**Feature:** TRY Bank Withdrawals (Story 2.3)
**Type:** API
**Priority:** P0 (Critical)

**Preconditions:**
- User is authenticated
- User has TRY balance >= 1010 TRY (amount + 10 TRY fee)
- User has registered bank account for withdrawal
- Wallet service running
- 2FA service available

**Steps:**
1. Call `POST /api/v1/withdrawal/fiat/initiate` with:
   ```json
   {
     "currency": "TRY",
     "amount": "1000.00",
     "bankAccountId": "acct_456",
     "totpCode": "123456"
   }
   ```
2. Verify response structure
3. Extract withdrawal ID
4. Verify withdrawal status is PENDING_CONFIRMATION

**Expected Result:**
- HTTP 201 Created
- Response includes: withdrawalId, status (PENDING_CONFIRMATION), fee (10.00), totalAmount (1010.00)
- Withdrawal recorded in database
- Balance shows locked amount for withdrawal

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested

---

### Test Case: TC-2.3.2 - Insufficient Balance

**Feature:** TRY Bank Withdrawals (Story 2.3)
**Type:** API
**Priority:** P0 (Critical)

**Preconditions:**
- User is authenticated
- User has TRY balance < 1010 TRY
- Wallet service running

**Steps:**
1. Call `POST /api/v1/withdrawal/fiat/initiate` with amount: 1000 TRY
2. Verify error response

**Expected Result:**
- HTTP 422 Unprocessable Entity
- Error message: "Insufficient balance. Available: X TRY, Required: 1010.00 TRY"

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested

---

### Test Case: TC-2.3.3 - Invalid 2FA Code

**Feature:** TRY Bank Withdrawals (Story 2.3)
**Type:** API
**Priority:** P1 (High)

**Preconditions:**
- User is authenticated
- User has sufficient TRY balance
- 2FA is enabled for user
- Wallet service running

**Steps:**
1. Call `POST /api/v1/withdrawal/fiat/initiate` with invalid TOTP code: "000000"
2. Verify error response

**Expected Result:**
- HTTP 401 Unauthorized
- Error message: "Invalid 2FA code"
- Withdrawal NOT created

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested

---

### Test Case: TC-2.3.4 - Withdrawal Fee Calculation

**Feature:** TRY Bank Withdrawals (Story 2.3)
**Type:** API
**Priority:** P2 (Medium)

**Preconditions:**
- User is authenticated
- User has TRY balance >= 1010 TRY
- Withdrawal fee is 10 TRY (fixed)
- Wallet service running

**Steps:**
1. Call `POST /api/v1/withdrawal/fiat/initiate` with amount: 1000.00 TRY
2. Verify response includes fee breakdown
3. Confirm total: 1010.00 TRY

**Expected Result:**
- Response shows: amount (1000.00), fee (10.00), total (1010.00)
- Withdrawal locked balance = 1010.00 TRY
- Available balance reduced by 1010.00 TRY

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested

---

## Story 2.4: Crypto Deposits (HD Wallet)

### Test Case: TC-2.4.1 - Generate Bitcoin Deposit Address

**Feature:** Crypto Deposits (Story 2.4)
**Type:** API
**Priority:** P0 (Critical)

**Preconditions:**
- User is authenticated
- User has completed KYC Level 1
- Wallet service running
- HD wallet service initialized

**Steps:**
1. Call `POST /api/v1/deposit/crypto/address/generate` with:
   ```json
   {
     "currency": "BTC"
   }
   ```
2. Verify response structure
3. Extract deposit address
4. Validate Bitcoin address format

**Expected Result:**
- HTTP 201 Created
- Response includes: currency (BTC), address (valid BTC format), network (mainnet/testnet), expiresAt
- Address stored in database for user
- User can deposit to this address

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested

---

### Test Case: TC-2.4.2 - Generate Ethereum Deposit Address

**Feature:** Crypto Deposits (Story 2.4)
**Type:** API
**Priority:** P0 (Critical)

**Preconditions:**
- User is authenticated
- User has completed KYC Level 1
- Wallet service running

**Steps:**
1. Call `POST /api/v1/deposit/crypto/address/generate` with:
   ```json
   {
     "currency": "ETH"
   }
   ```
2. Verify response structure
3. Extract deposit address
4. Validate Ethereum address format (0x...)

**Expected Result:**
- HTTP 201 Created
- Response includes: currency (ETH), address (0x..., 42 chars), network (mainnet/testnet)
- Address is valid Ethereum format

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested

---

### Test Case: TC-2.4.3 - Confirm Crypto Deposit

**Feature:** Crypto Deposits (Story 2.4)
**Type:** API
**Priority:** P0 (Critical)

**Preconditions:**
- User has generated BTC deposit address
- BTC transaction sent to address and confirmed (6 confirmations)
- Blockchain integration service running

**Steps:**
1. Monitor deposit webhook: `POST /api/v1/deposit/crypto/confirm`
2. Verify balance updated in wallet after confirmation
3. Query database for deposit record

**Expected Result:**
- Deposit status changes from PENDING to CONFIRMED
- User wallet balance increased by deposit amount
- Ledger entry created for audit trail
- Transaction hash recorded in database

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested

---

### Test Case: TC-2.4.4 - Multiple Addresses for Same Currency

**Feature:** Crypto Deposits (Story 2.4)
**Type:** API
**Priority:** P2 (Medium)

**Preconditions:**
- User is authenticated
- User has generated 1 BTC address previously
- Wallet service running

**Steps:**
1. Call `POST /api/v1/deposit/crypto/address/generate` again with currency: BTC
2. Verify response
3. Compare with previous address

**Expected Result:**
- New BTC address generated
- New address differs from previous address
- Both addresses remain valid for deposits
- User can receive deposits on either address

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested

---

## Story 2.5: Crypto Withdrawals (Blockchain)

### Test Case: TC-2.5.1 - Initiate Bitcoin Withdrawal

**Feature:** Crypto Withdrawals (Story 2.5)
**Type:** API
**Priority:** P0 (Critical)

**Preconditions:**
- User is authenticated
- User has BTC balance >= 0.001 BTC
- Blockchain integration ready
- 2FA enabled and code available
- Wallet service running

**Steps:**
1. Call `POST /api/v1/withdrawal/crypto/initiate` with:
   ```json
   {
     "currency": "BTC",
     "amount": "0.001",
     "toAddress": "bc1qxy...",
     "totpCode": "123456",
     "networkFeeLevel": "standard"
   }
   ```
2. Verify response structure
3. Extract withdrawal ID and transaction reference

**Expected Result:**
- HTTP 201 Created
- Response includes: withdrawalId, status (PENDING_NETWORK), txHash (null initially), estimatedFee
- Withdrawal locked in database
- Balance shows locked BTC

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested

---

### Test Case: TC-2.5.2 - Insufficient Crypto Balance

**Feature:** Crypto Withdrawals (Story 2.5)
**Type:** API
**Priority:** P0 (Critical)

**Preconditions:**
- User is authenticated
- User has BTC balance < 0.001 BTC
- Wallet service running

**Steps:**
1. Call `POST /api/v1/withdrawal/crypto/initiate` with amount: 0.001 BTC
2. Verify error response

**Expected Result:**
- HTTP 422 Unprocessable Entity
- Error message: "Insufficient balance. Available: X BTC, Required: 0.001 BTC"

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested

---

### Test Case: TC-2.5.3 - Invalid Withdrawal Address

**Feature:** Crypto Withdrawals (Story 2.5)
**Type:** API
**Priority:** P1 (High)

**Preconditions:**
- User is authenticated
- User has sufficient BTC balance
- Wallet service running

**Steps:**
1. Call `POST /api/v1/withdrawal/crypto/initiate` with toAddress: "invalid_address"
2. Verify error response

**Expected Result:**
- HTTP 422 Unprocessable Entity
- Error message: "Invalid Bitcoin address format"

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested

---

### Test Case: TC-2.5.4 - Network Fee Estimation

**Feature:** Crypto Withdrawals (Story 2.5)
**Type:** API
**Priority:** P2 (Medium)

**Preconditions:**
- User is authenticated
- Blockchain integration running
- Network fee data available

**Steps:**
1. Call `GET /api/v1/withdrawal/crypto/fee-estimate` with:
   ```json
   {
     "currency": "BTC",
     "amount": "0.001",
     "networkFeeLevel": "standard"
   }
   ```
2. Verify response structure
3. Compare slow vs standard vs fast fees

**Expected Result:**
- HTTP 200 OK
- Response includes: estimatedFee, feeLevel, estimatedTime
- Fast fee > Standard fee > Slow fee
- Estimated time varies by fee level

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested

---

## Story 2.6: Transaction History & Export

### Test Case: TC-2.6.1 - View Transaction History (Paginated)

**Feature:** Transaction History & Export (Story 2.6)
**Type:** API
**Priority:** P0 (Critical)

**Preconditions:**
- User is authenticated
- User has multiple transactions (deposits, withdrawals) in database
- Wallet service running

**Steps:**
1. Call `GET /api/v1/transactions?page=1&limit=10` with Bearer token
2. Verify response structure
3. Validate pagination metadata
4. Check transaction details

**Expected Result:**
- HTTP 200 OK
- Response includes: transactions array (10 items max), pagination (page, limit, total, pages)
- Each transaction has: id, type (DEPOSIT/WITHDRAWAL), currency, amount, status, timestamp
- Sorted by timestamp descending (newest first)

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested

---

### Test Case: TC-2.6.2 - Filter Transactions by Currency

**Feature:** Transaction History & Export (Story 2.6)
**Type:** API
**Priority:** P1 (High)

**Preconditions:**
- User is authenticated
- User has transactions in multiple currencies
- Wallet service running

**Steps:**
1. Call `GET /api/v1/transactions?currency=BTC&page=1&limit=10`
2. Verify all returned transactions are BTC only

**Expected Result:**
- HTTP 200 OK
- All transactions in response have currency = BTC
- Other currencies excluded from results

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested

---

### Test Case: TC-2.6.3 - Export Transaction History as CSV

**Feature:** Transaction History & Export (Story 2.6)
**Type:** API
**Priority:** P1 (High)

**Preconditions:**
- User is authenticated
- User has multiple transactions
- Wallet service running

**Steps:**
1. Call `GET /api/v1/transactions/export/csv` with Bearer token
2. Verify response content-type
3. Save downloaded CSV file
4. Validate CSV structure

**Expected Result:**
- HTTP 200 OK
- Content-Type: text/csv
- CSV includes headers: ID, Type, Currency, Amount, Status, Timestamp
- Each row has transaction data
- File can be opened in Excel/Google Sheets

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested

---

### Test Case: TC-2.6.4 - Export Transaction History as PDF

**Feature:** Transaction History & Export (Story 2.6)
**Type:** API
**Priority:** P1 (High)

**Preconditions:**
- User is authenticated
- User has multiple transactions
- Wallet service running
- PDF generation service available

**Steps:**
1. Call `GET /api/v1/transactions/export/pdf` with Bearer token
2. Verify response content-type
3. Save downloaded PDF file
4. Validate PDF structure

**Expected Result:**
- HTTP 200 OK
- Content-Type: application/pdf
- PDF includes user name, date range, transaction table
- File can be opened in PDF reader
- Contains all transaction details

**Actual Result:**
[To be filled during execution]

**Status:** ⬜ Not Tested

---

## Test Execution Summary

**Total Test Cases:** 24
**Planned Status:**
- Not Tested: 24
- In Progress: 0
- Passed: 0
- Failed: 0

**Pass Rate:** 0% (baseline)

---

## Acceptance Criteria Coverage

### Story 2.1: Multi-Currency Balance Display (9 AC)
- [ ] User can view all wallet balances (TRY, BTC, ETH, USDT)
- [ ] Balance display shows available, locked, and total balances
- [ ] Balances are cached with 5-second TTL for performance
- [ ] Proper decimal formatting: TRY (2), Crypto (8)
- [ ] Rate limiting enforced (100 req/min)
- [ ] Unauthorized requests return 401
- [ ] Non-existent currency returns 404
- [ ] Response includes metadata (timestamp, requestId)
- [ ] Balance calculation is atomic and accurate

**Coverage: 0/9 (0%)**

### Story 2.2: TRY Bank Deposits (10 AC)
- [ ] Authenticated users can initiate TRY deposits
- [ ] Deposit requires KYC Level 1 verification
- [ ] Deposit amount validation (min 10 TRY, max 50K/day Level 1)
- [ ] Bank account validation (IBAN/SWIFT)
- [ ] Deposit creates pending transaction record
- [ ] Deposit reference number generated
- [ ] User receives deposit instructions (bank details)
- [ ] Webhook confirms deposit from bank
- [ ] Balance updated upon confirmation
- [ ] Ledger entry created for audit

**Coverage: 0/10 (0%)**

### Story 2.3: TRY Bank Withdrawals (10 AC)
- [ ] Authenticated users can initiate TRY withdrawals
- [ ] Withdrawal requires 2FA verification
- [ ] Withdrawal fee calculated (10 TRY fixed)
- [ ] Balance validation (must have amount + fee)
- [ ] Bank account validation required
- [ ] Withdrawal limit enforced (50K/day Level 1)
- [ ] Withdrawal creates pending transaction
- [ ] Balance locked during pending state
- [ ] Admin approval process (manual review)
- [ ] Confirmation email sent on completion

**Coverage: 0/10 (0%)**

### Story 2.4: Crypto Deposits (HD Wallet) (10 AC)
- [ ] User can generate BTC, ETH, USDT deposit addresses
- [ ] HD wallet addresses generated (BIP39/BIP44)
- [ ] Addresses are unique per user per currency
- [ ] Address reusable for multiple deposits
- [ ] Deposit address remains active indefinitely
- [ ] User can view deposit history by address
- [ ] Blockchain confirmation monitoring (6 blocks)
- [ ] Balance updated upon confirmation
- [ ] Transaction hash stored in database
- [ ] Ledger entry created for deposit

**Coverage: 0/10 (0%)**

### Story 2.5: Crypto Withdrawals (Blockchain) (10 AC)
- [ ] User can withdraw BTC, ETH, USDT to external addresses
- [ ] Withdrawal requires 2FA verification
- [ ] Address validation per blockchain standard
- [ ] Network fee estimation provided (slow/standard/fast)
- [ ] Withdrawal creates pending blockchain transaction
- [ ] Estimated confirmation time provided
- [ ] Balance locked until confirmed on blockchain
- [ ] Transaction hash tracked from blockchain
- [ ] Confirmation monitoring (6 block threshold)
- [ ] User notified on confirmation/failure

**Coverage: 0/10 (0%)**

### Story 2.6: Transaction History & Export (8 AC)
- [ ] User can view transaction history with pagination
- [ ] Filtering by currency, type, status, date range
- [ ] Sorting by date, amount, status
- [ ] Transaction details include all metadata
- [ ] Export as CSV format
- [ ] Export as PDF format (with receipt)
- [ ] Export includes user details and date range
- [ ] Rate limiting on export endpoints

**Coverage: 0/8 (0%)**

**TOTAL ACCEPTANCE CRITERIA: 0/57 (0%)**

---

## Testing Environment

### Services Required
- Wallet Service: http://localhost:3002
- Auth Service: http://localhost:3001
- PostgreSQL: wallet schema
- Redis: balance caching
- Blockchain Integration: BTC/ETH nodes

### Test Credentials
- Email: testuser001@example.com
- Password: SecurePassword123!
- KYC Status: Approved (Level 1)
- 2FA: Enabled

### Configuration
- Rate limit: 100 req/min per endpoint
- Cache TTL: 5 seconds (balances)
- Deposit fee: Free for TRY
- Withdrawal fee: 10 TRY (fixed)
- Crypto withdrawal fee: Network dependent

---

## Notes
- Test execution will begin after environment verification
- Wallet service must be running with active database connection
- All tests require authentication with valid JWT tokens
- 2FA codes must be generated dynamically or mocked
- Blockchain integration tests may be mocked in dev environment

---

**End of Test Plan**
