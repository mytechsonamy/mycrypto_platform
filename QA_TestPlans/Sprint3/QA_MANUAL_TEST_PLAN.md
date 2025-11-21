# QA Manual Test Plan - Sprint 3 Story 2.4
**Feature:** Crypto Deposit (BTC, ETH, USDT)
**Test Date:** 2024-11-21
**Tester:** QA Team
**Environment:** Staging
**Status:** 🔄 IN PROGRESS

---

## Test Objective

Verify that all 4 critical/high priority bugs have been fixed and the crypto deposit feature works end-to-end in a production-like environment.

---

## Pre-requisites

### Environment Setup
- [x] Staging environment deployed
- [ ] Database configured and accessible
- [ ] Redis configured and accessible
- [ ] Auth service available
- [ ] Environment variables configured

### Test Data
- [ ] Test user with KYC Level 1 APPROVED
- [ ] Test user with KYC NOT SUBMITTED
- [ ] Test user with KYC PENDING
- [ ] Valid JWT tokens for each test user

### Tools Required
- [ ] Postman or curl for API testing
- [ ] Database client (pgAdmin, DBeaver, etc.)
- [ ] Redis client (redis-cli, RedisInsight)
- [ ] Blockchain explorer (blockchain.com, etherscan.io)

---

## Test Cases

## TC-001: BUG-004 - KYC Verification Enforcement ✅ CRITICAL

**Objective:** Verify KYC Level 1 approval is required for crypto address generation

### Test Steps

#### TC-001.1: User WITHOUT KYC Cannot Generate Address
**Priority:** CRITICAL
**Expected:** 403 Forbidden

```bash
# 1. Get JWT token for user without KYC
# 2. Attempt to generate BTC address
curl -X POST http://localhost:3002/wallet/deposit/crypto/address/generate \
  -H "Authorization: Bearer <USER_WITHOUT_KYC_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "currency": "BTC"
  }'

# Expected Response:
# Status: 403 Forbidden
# Body: {
#   "error": "KYC_REQUIRED",
#   "message": "KYC Level 1 approval required for crypto deposits",
#   "details": {
#     "hasKyc": false,
#     "status": "NOT_SUBMITTED",
#     "requiredLevel": "LEVEL_1",
#     "requiredStatus": "APPROVED"
#   }
# }
```

**Result:** [ ] PASS [ ] FAIL
**Notes:** _____________________

---

#### TC-001.2: User WITH KYC PENDING Cannot Generate Address
**Priority:** CRITICAL
**Expected:** 403 Forbidden

```bash
# 1. Get JWT token for user with KYC pending
# 2. Attempt to generate ETH address
curl -X POST http://localhost:3002/wallet/deposit/crypto/address/generate \
  -H "Authorization: Bearer <USER_KYC_PENDING_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "currency": "ETH"
  }'

# Expected Response:
# Status: 403 Forbidden
# Body: {
#   "error": "KYC_REQUIRED",
#   "message": "KYC Level 1 approval required for crypto deposits",
#   "details": {
#     "hasKyc": true,
#     "status": "PENDING",
#     "requiredLevel": "LEVEL_1",
#     "requiredStatus": "APPROVED"
#   }
# }
```

**Result:** [ ] PASS [ ] FAIL
**Notes:** _____________________

---

#### TC-001.3: User WITH KYC APPROVED Can Generate Address
**Priority:** CRITICAL
**Expected:** 201 Created with address details

```bash
# 1. Get JWT token for user with KYC approved
# 2. Generate USDT address
curl -X POST http://localhost:3002/wallet/deposit/crypto/address/generate \
  -H "Authorization: Bearer <USER_KYC_APPROVED_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "currency": "USDT"
  }'

# Expected Response:
# Status: 201 Created
# Body: {
#   "address": "0x...",
#   "currency": "USDT",
#   "qrCode": "data:image/png;base64,...",
#   "network": "Ethereum",
#   "minDeposit": "1.0",
#   "confirmationsRequired": 12
# }
```

**Result:** [ ] PASS [ ] FAIL
**Actual Address:** _____________________
**Notes:** _____________________

---

#### TC-001.4: Verify Address Stored in Database
**Priority:** HIGH
**Expected:** Address saved with correct user association

```sql
-- Check blockchain_addresses table
SELECT
  id,
  user_id,
  currency,
  address,
  derivation_path,
  is_active,
  created_at
FROM blockchain_addresses
WHERE user_id = '<USER_ID>'
  AND currency = 'USDT'
ORDER BY created_at DESC
LIMIT 1;

-- Expected:
-- 1 row returned with correct address
-- is_active = true
-- derivation_path follows BIP-44 format
```

**Result:** [ ] PASS [ ] FAIL
**Notes:** _____________________

---

## TC-002: BUG-005 - Webhook Security ✅ CRITICAL

**Objective:** Verify webhook endpoint requires authentication token

### Test Steps

#### TC-002.1: Webhook WITHOUT Token is Rejected
**Priority:** CRITICAL
**Expected:** 401 Unauthorized

```bash
# Attempt webhook call without token
curl -X POST http://localhost:3002/wallet/deposit/crypto/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "hash": "abc123def456ghi789jkl012mno345pqr678stu901vwx234yz567890",
    "address": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    "chain": "btc",
    "value": 150000,
    "confirmations": 1
  }'

# Expected Response:
# Status: 401 Unauthorized
# Body: {
#   "error": "INVALID_WEBHOOK_TOKEN",
#   "message": "Webhook token validation failed"
# }
```

**Result:** [ ] PASS [ ] FAIL
**Notes:** _____________________

---

#### TC-002.2: Webhook WITH Invalid Token is Rejected
**Priority:** CRITICAL
**Expected:** 401 Unauthorized

```bash
# Attempt webhook call with invalid token
curl -X POST "http://localhost:3002/wallet/deposit/crypto/webhook?token=invalid_token_123" \
  -H "Content-Type: application/json" \
  -d '{
    "hash": "abc123def456ghi789jkl012mno345pqr678stu901vwx234yz567890",
    "address": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    "chain": "btc",
    "value": 150000,
    "confirmations": 1
  }'

# Expected Response:
# Status: 401 Unauthorized
```

**Result:** [ ] PASS [ ] FAIL
**Notes:** _____________________

---

#### TC-002.3: Webhook WITH Valid Token is Accepted
**Priority:** CRITICAL
**Expected:** 200 OK

```bash
# Get the correct webhook token from environment
WEBHOOK_TOKEN="<from .env BLOCKCYPHER_WEBHOOK_TOKEN>"

# Webhook call with valid token
curl -X POST "http://localhost:3002/wallet/deposit/crypto/webhook?token=${WEBHOOK_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "hash": "abc123def456ghi789jkl012mno345pqr678stu901vwx234yz567890",
    "address": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    "chain": "btc",
    "value": 150000,
    "confirmations": 1
  }'

# Expected Response:
# Status: 200 OK
# Body: {
#   "message": "Webhook received successfully",
#   "processed": true
# }
```

**Result:** [ ] PASS [ ] FAIL
**Notes:** _____________________

---

#### TC-002.4: Webhook With Malformed Data is Rejected
**Priority:** HIGH
**Expected:** 400 Bad Request

```bash
# Webhook with missing required fields
curl -X POST "http://localhost:3002/wallet/deposit/crypto/webhook?token=${WEBHOOK_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "hash": "short",
    "address": ""
  }'

# Expected Response:
# Status: 400 Bad Request
# Body: Error message about validation failure
```

**Result:** [ ] PASS [ ] FAIL
**Notes:** _____________________

---

## TC-003: BUG-002 - Wallet Credit Integration ✅ CRITICAL

**Objective:** Verify deposits are credited to user wallets correctly

### Test Steps

#### TC-003.1: Check Initial Balance
**Priority:** HIGH
**Expected:** User has specific balance before deposit

```bash
# Get user's BTC balance before deposit
curl -X GET http://localhost:3002/wallet/balance \
  -H "Authorization: Bearer <USER_TOKEN>"

# Expected Response:
# {
#   "balances": [
#     {
#       "currency": "BTC",
#       "availableBalance": "0.00000000",
#       "lockedBalance": "0.00000000",
#       "totalBalance": "0.00000000"
#     },
#     ...
#   ]
# }
```

**Initial BTC Balance:** _____________________
**Result:** [ ] PASS [ ] FAIL
**Notes:** _____________________

---

#### TC-003.2: Simulate Deposit Transaction (First Confirmation)
**Priority:** CRITICAL
**Expected:** Transaction recorded but not credited yet

```bash
# Get the BTC address generated in TC-001.3
BTC_ADDRESS="<from TC-001.3>"

# Simulate webhook notification for first confirmation
curl -X POST "http://localhost:3002/wallet/deposit/crypto/webhook?token=${WEBHOOK_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"hash\": \"test_tx_$(date +%s)_abc123def456ghi789jkl012mno345pqr678stu901\",
    \"address\": \"${BTC_ADDRESS}\",
    \"chain\": \"btc\",
    \"value\": 150000,
    \"confirmations\": 1
  }"

# Expected: Transaction saved but balance NOT updated (needs 3 confirmations)
```

**Result:** [ ] PASS [ ] FAIL
**Notes:** _____________________

---

#### TC-003.3: Verify Transaction in Database (Pending)
**Priority:** HIGH
**Expected:** Transaction exists with PENDING status

```sql
-- Check blockchain_transactions table
SELECT
  id,
  user_id,
  currency,
  tx_hash,
  amount,
  confirmations,
  required_confirmations,
  status,
  created_at
FROM blockchain_transactions
WHERE tx_hash LIKE 'test_tx_%'
ORDER BY created_at DESC
LIMIT 1;

-- Expected:
-- status = 'PENDING'
-- confirmations = 1
-- required_confirmations = 3
-- amount = '0.00150000' (150000 satoshis)
```

**Result:** [ ] PASS [ ] FAIL
**Transaction ID:** _____________________
**Notes:** _____________________

---

#### TC-003.4: Simulate Deposit Transaction (3 Confirmations)
**Priority:** CRITICAL
**Expected:** Balance updated, ledger entry created

```bash
# Get transaction hash from TC-003.2
TX_HASH="<from TC-003.2>"

# Simulate webhook notification for 3rd confirmation
curl -X POST "http://localhost:3002/wallet/deposit/crypto/webhook?token=${WEBHOOK_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"hash\": \"${TX_HASH}\",
    \"address\": \"${BTC_ADDRESS}\",
    \"chain\": \"btc\",
    \"value\": 150000,
    \"confirmations\": 3
  }"

# Expected: Balance updated, status = COMPLETED
```

**Result:** [ ] PASS [ ] FAIL
**Notes:** _____________________

---

#### TC-003.5: Verify Balance Updated
**Priority:** CRITICAL
**Expected:** BTC balance increased by 0.00150000

```bash
# Get user's BTC balance after deposit
curl -X GET http://localhost:3002/wallet/balance \
  -H "Authorization: Bearer <USER_TOKEN>"

# Expected Response:
# {
#   "balances": [
#     {
#       "currency": "BTC",
#       "availableBalance": "0.00150000",  # Increased
#       ...
#     }
#   ]
# }
```

**Final BTC Balance:** _____________________
**Balance Increase:** _____________________
**Result:** [ ] PASS [ ] FAIL
**Notes:** _____________________

---

#### TC-003.6: Verify Ledger Entry Created
**Priority:** CRITICAL
**Expected:** Ledger entry with DEPOSIT type

```sql
-- Check ledger_entries table
SELECT
  id,
  user_id,
  currency,
  type,
  amount,
  balance_before,
  balance_after,
  reference_id,
  reference_type,
  description,
  created_at
FROM ledger_entries
WHERE user_id = '<USER_ID>'
  AND currency = 'BTC'
  AND type = 'DEPOSIT'
ORDER BY created_at DESC
LIMIT 1;

-- Expected:
-- type = 'DEPOSIT'
-- amount = '0.00150000'
-- balance_before = '0.00000000'
-- balance_after = '0.00150000'
-- reference_type = 'CRYPTO_DEPOSIT'
```

**Result:** [ ] PASS [ ] FAIL
**Ledger Entry ID:** _____________________
**Notes:** _____________________

---

#### TC-003.7: Verify Transaction Status Updated
**Priority:** HIGH
**Expected:** Transaction status = COMPLETED

```sql
-- Check transaction status
SELECT
  id,
  status,
  confirmations,
  credited_at
FROM blockchain_transactions
WHERE tx_hash = '<TX_HASH>';

-- Expected:
-- status = 'COMPLETED'
-- confirmations = 3
-- credited_at IS NOT NULL
```

**Result:** [ ] PASS [ ] FAIL
**Notes:** _____________________

---

#### TC-003.8: Verify Cache Invalidation
**Priority:** MEDIUM
**Expected:** Redis cache cleared for user balance

```bash
# Check Redis cache (should be empty or updated)
redis-cli GET "user:balances:<USER_ID>"

# Expected: Key not found OR updated value with new balance
```

**Result:** [ ] PASS [ ] FAIL
**Notes:** _____________________

---

## TC-004: BUG-003 - Notification System ✅ HIGH

**Objective:** Verify notifications are logged for deposit events

### Test Steps

#### TC-004.1: Deposit Detected Notification
**Priority:** HIGH
**Expected:** Log entry for deposit detected

```bash
# Monitor logs during TC-003.2 (first confirmation)
docker-compose logs -f wallet-service | grep "Crypto deposit detected"

# Expected Log Entry:
# {
#   "message": "Crypto deposit detected notification",
#   "type": "CRYPTO_DEPOSIT_DETECTED",
#   "userId": "<USER_ID>",
#   "data": {
#     "currency": "BTC",
#     "amount": "0.00150000",
#     "txHash": "<TX_HASH>",
#     "confirmations": 1,
#     "requiredConfirmations": 3,
#     "estimatedTime": "20 minutes"
#   },
#   "timestamp": "2024-11-21T..."
# }
```

**Result:** [ ] PASS [ ] FAIL
**Log Found:** [ ] YES [ ] NO
**Notes:** _____________________

---

#### TC-004.2: Deposit Credited Notification
**Priority:** HIGH
**Expected:** Log entry for deposit credited

```bash
# Monitor logs during TC-003.4 (3rd confirmation)
docker-compose logs -f wallet-service | grep "Crypto deposit credited"

# Expected Log Entry:
# {
#   "message": "Crypto deposit credited notification",
#   "type": "CRYPTO_DEPOSIT_CREDITED",
#   "userId": "<USER_ID>",
#   "data": {
#     "currency": "BTC",
#     "amount": "0.00150000",
#     "txHash": "<TX_HASH>",
#     "newBalance": "0.00150000",
#     "shortTxHash": "test_tx_...stu901"
#   },
#   "timestamp": "2024-11-21T..."
# }
```

**Result:** [ ] PASS [ ] FAIL
**Log Found:** [ ] YES [ ] NO
**Notes:** _____________________

---

#### TC-004.3: Verify Time Estimation Accuracy
**Priority:** MEDIUM
**Expected:** Time estimates match blockchain specs

```bash
# Check estimated times in logs:
# BTC (1 to 3 confirmations): ~20 minutes (2 blocks * 10 min)
# ETH (5 to 12 confirmations): ~2 minutes (7 blocks * 15 sec)
# USDT (8 to 12 confirmations): ~1 minute (4 blocks * 15 sec)
```

**Result:** [ ] PASS [ ] FAIL
**Notes:** _____________________

---

## TC-005: Multi-Currency Support ✅ HIGH

**Objective:** Verify BTC, ETH, and USDT all work correctly

### Test Steps

#### TC-005.1: Generate BTC Address
**Priority:** HIGH
**Expected:** Valid BTC address (bc1... format)

```bash
curl -X POST http://localhost:3002/wallet/deposit/crypto/address/generate \
  -H "Authorization: Bearer <USER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"currency": "BTC"}'

# Expected: BTC address starting with bc1 (Bech32 format)
```

**Result:** [ ] PASS [ ] FAIL
**Address:** _____________________
**Notes:** _____________________

---

#### TC-005.2: Generate ETH Address
**Priority:** HIGH
**Expected:** Valid ETH address (0x... format)

```bash
curl -X POST http://localhost:3002/wallet/deposit/crypto/address/generate \
  -H "Authorization: Bearer <USER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"currency": "ETH"}'

# Expected: ETH address starting with 0x (42 characters)
```

**Result:** [ ] PASS [ ] FAIL
**Address:** _____________________
**Notes:** _____________________

---

#### TC-005.3: Generate USDT Address
**Priority:** HIGH
**Expected:** Valid USDT address (0x... format, same as ETH)

```bash
curl -X POST http://localhost:3002/wallet/deposit/crypto/address/generate \
  -H "Authorization: Bearer <USER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"currency": "USDT"}'

# Expected: USDT address starting with 0x (ERC-20 on Ethereum)
```

**Result:** [ ] PASS [ ] FAIL
**Address:** _____________________
**Notes:** _____________________

---

#### TC-005.4: Verify Different Addresses Per Currency
**Priority:** HIGH
**Expected:** Each currency has unique address

```sql
-- Check all addresses for user
SELECT
  currency,
  address,
  derivation_path
FROM blockchain_addresses
WHERE user_id = '<USER_ID>'
  AND is_active = true
ORDER BY currency;

-- Expected:
-- 3 rows (BTC, ETH, USDT)
-- All addresses different
-- Derivation paths follow BIP-44: m/44'/coin'/0'/0/index
```

**Result:** [ ] PASS [ ] FAIL
**Notes:** _____________________

---

## TC-006: Transaction History ✅ MEDIUM

**Objective:** Verify deposit history is accessible

### Test Steps

#### TC-006.1: Get Deposit History
**Priority:** MEDIUM
**Expected:** List of all deposits

```bash
curl -X GET "http://localhost:3002/wallet/deposit/crypto/history?page=1&limit=10" \
  -H "Authorization: Bearer <USER_TOKEN>"

# Expected Response:
# {
#   "data": [
#     {
#       "id": "...",
#       "currency": "BTC",
#       "amount": "0.00150000",
#       "txHash": "...",
#       "status": "COMPLETED",
#       "confirmations": 3,
#       "createdAt": "...",
#       "creditedAt": "..."
#     }
#   ],
#   "pagination": {
#     "page": 1,
#     "limit": 10,
#     "total": 1
#   }
# }
```

**Result:** [ ] PASS [ ] FAIL
**Notes:** _____________________

---

## TC-007: Error Handling ✅ MEDIUM

**Objective:** Verify proper error messages for invalid inputs

### Test Steps

#### TC-007.1: Invalid Currency
**Priority:** MEDIUM
**Expected:** 400 Bad Request

```bash
curl -X POST http://localhost:3002/wallet/deposit/crypto/address/generate \
  -H "Authorization: Bearer <USER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"currency": "DOGE"}'

# Expected: 400 Bad Request with clear error message
```

**Result:** [ ] PASS [ ] FAIL
**Notes:** _____________________

---

#### TC-007.2: Missing Authorization
**Priority:** HIGH
**Expected:** 401 Unauthorized

```bash
curl -X POST http://localhost:3002/wallet/deposit/crypto/address/generate \
  -H "Content-Type: application/json" \
  -d '{"currency": "BTC"}'

# Expected: 401 Unauthorized
```

**Result:** [ ] PASS [ ] FAIL
**Notes:** _____________________

---

## TC-008: Performance Testing ✅ LOW

**Objective:** Verify acceptable response times

### Test Steps

#### TC-008.1: Address Generation Response Time
**Priority:** LOW
**Expected:** < 500ms

```bash
time curl -X POST http://localhost:3002/wallet/deposit/crypto/address/generate \
  -H "Authorization: Bearer <USER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"currency": "BTC"}'

# Expected: Total time < 500ms
```

**Response Time:** _____ ms
**Result:** [ ] PASS [ ] FAIL
**Notes:** _____________________

---

## Test Summary

### Test Execution Summary

| Test Case | Priority | Status | Notes |
|-----------|----------|--------|-------|
| TC-001.1 | CRITICAL | [ ] P / [ ] F | KYC not submitted rejection |
| TC-001.2 | CRITICAL | [ ] P / [ ] F | KYC pending rejection |
| TC-001.3 | CRITICAL | [ ] P / [ ] F | KYC approved success |
| TC-001.4 | HIGH | [ ] P / [ ] F | DB verification |
| TC-002.1 | CRITICAL | [ ] P / [ ] F | Webhook no token |
| TC-002.2 | CRITICAL | [ ] P / [ ] F | Webhook invalid token |
| TC-002.3 | CRITICAL | [ ] P / [ ] F | Webhook valid token |
| TC-002.4 | HIGH | [ ] P / [ ] F | Webhook malformed data |
| TC-003.1 | HIGH | [ ] P / [ ] F | Initial balance |
| TC-003.2 | CRITICAL | [ ] P / [ ] F | First confirmation |
| TC-003.3 | HIGH | [ ] P / [ ] F | Transaction pending |
| TC-003.4 | CRITICAL | [ ] P / [ ] F | 3rd confirmation |
| TC-003.5 | CRITICAL | [ ] P / [ ] F | Balance updated |
| TC-003.6 | CRITICAL | [ ] P / [ ] F | Ledger entry |
| TC-003.7 | HIGH | [ ] P / [ ] F | Transaction completed |
| TC-003.8 | MEDIUM | [ ] P / [ ] F | Cache invalidation |
| TC-004.1 | HIGH | [ ] P / [ ] F | Deposit detected log |
| TC-004.2 | HIGH | [ ] P / [ ] F | Deposit credited log |
| TC-004.3 | MEDIUM | [ ] P / [ ] F | Time estimation |
| TC-005.1 | HIGH | [ ] P / [ ] F | BTC address |
| TC-005.2 | HIGH | [ ] P / [ ] F | ETH address |
| TC-005.3 | HIGH | [ ] P / [ ] F | USDT address |
| TC-005.4 | HIGH | [ ] P / [ ] F | Unique addresses |
| TC-006.1 | MEDIUM | [ ] P / [ ] F | Deposit history |
| TC-007.1 | MEDIUM | [ ] P / [ ] F | Invalid currency |
| TC-007.2 | HIGH | [ ] P / [ ] F | Missing auth |
| TC-008.1 | LOW | [ ] P / [ ] F | Performance |

### Statistics
- **Total Test Cases:** 27
- **Passed:** _____
- **Failed:** _____
- **Pass Rate:** _____%

---

## Bug Report Template

If any test fails, use this template to report:

```
BUG ID: BUG-XXX
Severity: [CRITICAL/HIGH/MEDIUM/LOW]
Test Case: TC-XXX.X
Title: Brief description

Steps to Reproduce:
1.
2.
3.

Expected Result:


Actual Result:


Environment:
- Service: wallet-service
- Environment: Staging
- Date: 2024-11-21

Logs/Screenshots:


```

---

## Sign-off

### QA Approval

**Tested By:** _____________________
**Date:** _____________________
**Test Environment:** _____________________

**Overall Result:** [ ] APPROVED FOR PRODUCTION [ ] REJECTED

**Comments:**
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

**Signature:** _____________________

---

**Test Plan Version:** 1.0
**Last Updated:** 2024-11-21
**Next Review:** After bug fixes (if any)
