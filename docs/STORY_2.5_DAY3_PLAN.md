# Story 2.5 - Day 3 Implementation Plan
## Crypto Withdrawal - Blockchain Broadcasting & Processing

**Date:** November 23, 2025
**Sprint:** 3
**Story Points:** 13 (Total) | 5 points (Day 3)
**Status:** 📋 PLANNING

---

## Day 3 Overview

**Goal:** Implement blockchain broadcasting, transaction signing, and admin approval workflow to complete the crypto withdrawal feature.

**Estimated Time:** 10-12 hours

**Prerequisites (COMPLETED ✅):**
- Day 1: Database schema, address validation, DTOs
- Day 2: Fee calculation, 2FA verification, withdrawal request service, API controller

---

## Day 3 Tasks Breakdown

### Task 1: Transaction Signing Service (3 hours)
**Priority:** P0 (Critical)

**Objective:** Implement cryptographic transaction signing for BTC, ETH, and USDT

**Deliverables:**
1. `TransactionSigningService` with methods:
   - `signBitcoinTransaction()` - BIP-44 HD wallet signing
   - `signEthereumTransaction()` - Web3/ethers transaction signing
   - `signUSDTTransaction()` - ERC20/TRC20 token transfer signing
   - `validateSignature()` - Signature verification

2. **Security Requirements:**
   - Private keys loaded from environment variables (encrypted at rest)
   - HSM integration placeholder for production
   - Transaction validation before signing
   - Nonce management for Ethereum
   - UTXO selection for Bitcoin

3. **Test Coverage:** 20+ tests
   - Sign valid BTC transaction
   - Sign valid ETH transaction
   - Sign valid USDT (ERC20) transaction
   - Sign valid USDT (TRC20) transaction
   - Handle invalid transaction data
   - Verify signatures
   - Test nonce collision handling

**Files to Create:**
- `services/wallet-service/src/withdrawal/services/transaction-signing.service.ts`
- `services/wallet-service/src/withdrawal/services/transaction-signing.service.spec.ts`

---

### Task 2: Blockchain Broadcasting Service (4 hours)
**Priority:** P0 (Critical)

**Objective:** Broadcast signed transactions to blockchain networks and track confirmations

**Deliverables:**
1. `BlockchainBroadcastingService` with methods:
   - `broadcastBitcoinTransaction()` - Broadcast to BTC network
   - `broadcastEthereumTransaction()` - Broadcast to ETH network
   - `broadcastUSDTTransaction()` - Broadcast USDT (detect network)
   - `getTransactionStatus()` - Check confirmation count
   - `estimateConfirmationTime()` - Estimate completion

2. **Blockchain Integration:**
   - BlockCypher API for Bitcoin (testnet/mainnet)
   - Infura/Alchemy for Ethereum (testnet/mainnet)
   - TRON Grid for TRC20 USDT
   - Retry logic with exponential backoff
   - Transaction pool monitoring

3. **Confirmation Requirements:**
   - BTC: 3 confirmations (~30 min)
   - ETH: 12 confirmations (~3 min)
   - USDT (ERC20): 12 confirmations
   - USDT (TRC20): 19 confirmations

4. **Test Coverage:** 25+ tests
   - Broadcast BTC transaction successfully
   - Broadcast ETH transaction successfully
   - Broadcast USDT (ERC20) successfully
   - Broadcast USDT (TRC20) successfully
   - Handle network errors with retry
   - Handle insufficient gas fees
   - Track confirmation progress
   - Estimate confirmation time

**Files to Create:**
- `services/wallet-service/src/withdrawal/services/blockchain-broadcasting.service.ts`
- `services/wallet-service/src/withdrawal/services/blockchain-broadcasting.service.spec.ts`

---

### Task 3: Withdrawal Processing Service (2 hours)
**Priority:** P0 (Critical)

**Objective:** Orchestrate the complete withdrawal flow from PENDING to COMPLETED

**Deliverables:**
1. `WithdrawalProcessingService` with methods:
   - `processWithdrawal()` - Main workflow orchestrator
   - `processAutomaticWithdrawal()` - Auto-approve < $10K
   - `finalizeWithdrawal()` - Mark as completed
   - `handleBroadcastFailure()` - Rollback on failure

2. **Workflow States:**
   ```
   PENDING → APPROVED → SIGNING → BROADCASTING → BROADCASTED → COMPLETED
                ↓                      ↓              ↓
           REJECTED              FAILED         FAILED
   ```

3. **Integration Points:**
   - TransactionSigningService
   - BlockchainBroadcastingService
   - WithdrawalRequestService (update status)
   - LedgerService (create entries)
   - Redis (cache invalidation)

4. **Test Coverage:** 15+ tests
   - Process auto-approved withdrawal
   - Process admin-approved withdrawal
   - Handle signing failure
   - Handle broadcast failure
   - Rollback on failure
   - Update wallet balances correctly

**Files to Create:**
- `services/wallet-service/src/withdrawal/services/withdrawal-processing.service.ts`
- `services/wallet-service/src/withdrawal/services/withdrawal-processing.service.spec.ts`

---

### Task 4: Admin Approval Controller (2 hours)
**Priority:** P1 (High)

**Objective:** Create admin endpoints for approving/rejecting large withdrawals

**Deliverables:**
1. `AdminWithdrawalController` with endpoints:
   - `GET /api/v1/admin/withdrawals/pending` - List pending approvals
   - `POST /api/v1/admin/withdrawals/:id/approve` - Approve withdrawal
   - `POST /api/v1/admin/withdrawals/:id/reject` - Reject withdrawal
   - `GET /api/v1/admin/withdrawals/:id` - Get details

2. **Security:**
   - JWT authentication required
   - Admin role required (JwtAdminGuard)
   - Audit logging for all actions
   - Rejection reason required

3. **DTOs:**
   - `AdminWithdrawalFilterDto` - Pagination + filters
   - `ApproveWithdrawalDto` - Approval notes
   - `RejectWithdrawalDto` - Rejection reason

4. **Test Coverage:** 10+ tests
   - List pending withdrawals
   - Approve withdrawal successfully
   - Reject withdrawal with reason
   - Only admin can approve/reject
   - Non-pending withdrawal cannot be approved

**Files to Create:**
- `services/wallet-service/src/withdrawal/admin/admin-withdrawal.controller.ts`
- `services/wallet-service/src/withdrawal/admin/admin-withdrawal.controller.spec.ts`
- `services/wallet-service/src/withdrawal/dto/admin-withdrawal.dto.ts`
- `services/wallet-service/src/common/guards/jwt-admin.guard.ts`

---

### Task 5: Webhook & Status Updates (1.5 hours)
**Priority:** P2 (Medium)

**Objective:** Implement background job to check transaction confirmations and update statuses

**Deliverables:**
1. `WithdrawalStatusUpdateService` with methods:
   - `checkPendingWithdrawals()` - Cron job every 2 minutes
   - `updateWithdrawalStatus()` - Update based on blockchain
   - `sendStatusNotification()` - Emit event for email service

2. **Background Jobs:**
   - NestJS `@Cron` decorator
   - Check all BROADCASTED withdrawals
   - Update confirmation count
   - Mark as COMPLETED when confirmed
   - Emit events for email notifications

3. **Test Coverage:** 8+ tests
   - Check pending withdrawals
   - Update status when confirmed
   - Don't update already completed
   - Handle blockchain query errors

**Files to Create:**
- `services/wallet-service/src/withdrawal/services/withdrawal-status-update.service.ts`
- `services/wallet-service/src/withdrawal/services/withdrawal-status-update.service.spec.ts`

---

### Task 6: Integration & End-to-End Testing (1.5 hours)
**Priority:** P0 (Critical)

**Objective:** Create integration tests for complete withdrawal flow

**Deliverables:**
1. Integration test suite:
   - `withdrawal-flow.integration.spec.ts`

2. **Test Scenarios:**
   - Complete withdrawal < $10K (auto-approve)
   - Complete withdrawal > $10K (admin approval)
   - Withdrawal with broadcast failure
   - Withdrawal cancellation before broadcast
   - Concurrent withdrawal attempts

3. **Test Coverage Target:** 80%+

**Files to Create:**
- `services/wallet-service/src/withdrawal/tests/withdrawal-flow.integration.spec.ts`

---

## Environment Variables Required

```bash
# Hot Wallet Private Keys (ENCRYPTED IN PRODUCTION!)
BTC_HOT_WALLET_PRIVATE_KEY=your_encrypted_key_here
ETH_HOT_WALLET_PRIVATE_KEY=your_encrypted_key_here
USDT_HOT_WALLET_PRIVATE_KEY=your_encrypted_key_here

# Blockchain API Keys
BLOCKCYPHER_API_TOKEN=your_blockcypher_token
INFURA_PROJECT_ID=your_infura_project_id
INFURA_PROJECT_SECRET=your_infura_secret
ALCHEMY_API_KEY=your_alchemy_key
TRONGRID_API_KEY=your_trongrid_key

# Network Configuration
BITCOIN_NETWORK=testnet # testnet | mainnet
ETHEREUM_NETWORK=sepolia # sepolia | mainnet
TRON_NETWORK=shasta # shasta | mainnet

# Confirmation Requirements
BTC_CONFIRMATION_COUNT=3
ETH_CONFIRMATION_COUNT=12
USDT_CONFIRMATION_COUNT=12

# Processing
WITHDRAWAL_PROCESSING_ENABLED=true
WITHDRAWAL_STATUS_CHECK_INTERVAL=120000 # 2 minutes
WITHDRAWAL_MAX_RETRIES=3
WITHDRAWAL_RETRY_DELAY=5000 # 5 seconds
```

---

## NPM Dependencies to Add

```bash
npm install --save @ethereumjs/tx @ethereumjs/common
npm install --save bitcoinjs-lib bip32 bip39
npm install --save tronweb
npm install --save @nestjs/schedule # for cron jobs
```

---

## Module Updates

**File:** `services/wallet-service/src/withdrawal/withdrawal.module.ts`

**Add:**
- ScheduleModule (for cron jobs)
- TransactionSigningService
- BlockchainBroadcastingService
- WithdrawalProcessingService
- WithdrawalStatusUpdateService
- AdminWithdrawalController

---

## Definition of Done - Day 3

### Services ✅
- [ ] TransactionSigningService implemented (20+ tests)
- [ ] BlockchainBroadcastingService implemented (25+ tests)
- [ ] WithdrawalProcessingService implemented (15+ tests)
- [ ] WithdrawalStatusUpdateService implemented (8+ tests)
- [ ] All services registered in module

### Controllers ✅
- [ ] AdminWithdrawalController created (10+ tests)
- [ ] All endpoints implemented
- [ ] OpenAPI documentation complete

### Integration ✅
- [ ] Complete withdrawal flow tested (5+ scenarios)
- [ ] All services integrated correctly
- [ ] Background jobs configured

### Testing ✅
- [ ] 80+ new tests written
- [ ] All tests passing (250+ total)
- [ ] Coverage: 80%+ for new code

### Quality ✅
- [ ] TypeScript: 0 errors
- [ ] Build: SUCCESS
- [ ] No security vulnerabilities
- [ ] Structured logging
- [ ] Error handling comprehensive

### Documentation ✅
- [ ] OpenAPI updated
- [ ] Environment variables documented
- [ ] Day 3 completion report created

### Git ✅
- [ ] All changes committed
- [ ] Pushed to main branch
- [ ] Commit message follows convention

---

## Success Metrics - Day 3

| Metric | Target | Status |
|--------|--------|--------|
| Services implemented | 4 | ⏳ |
| Admin controller | 1 | ⏳ |
| Tests written | 80+ | ⏳ |
| Test pass rate | 100% | ⏳ |
| TypeScript errors | 0 | ⏳ |
| Build success | ✅ | ⏳ |
| Coverage (new code) | 80%+ | ⏳ |
| Integration tests | 5+ | ⏳ |

---

## Risk Assessment

### High Risks 🔴
1. **Blockchain API Rate Limits** - BlockCypher/Infura limits
   - Mitigation: Implement caching, use multiple providers

2. **Private Key Security** - Hot wallet keys in env
   - Mitigation: Document HSM requirement for production

3. **Transaction Broadcasting Failures** - Network issues
   - Mitigation: Retry logic, manual admin override

### Medium Risks 🟡
1. **Nonce Collision** - Concurrent ETH transactions
   - Mitigation: Database-backed nonce tracking

2. **Gas Fee Estimation** - Volatile gas prices
   - Mitigation: Real-time fee estimation with buffer

### Low Risks 🟢
1. **Test Coverage** - Complex integration scenarios
   - Mitigation: Mock blockchain APIs for testing

---

## Timeline Estimate

- **09:00 - 12:00** (3h): TransactionSigningService + Tests
- **12:00 - 13:00** (1h): Lunch Break
- **13:00 - 17:00** (4h): BlockchainBroadcastingService + Tests
- **17:00 - 19:00** (2h): WithdrawalProcessingService + Tests
- **19:00 - 21:00** (2h): AdminWithdrawalController + Tests
- **21:00 - 22:30** (1.5h): Webhook & Status Updates
- **22:30 - 24:00** (1.5h): Integration Tests + Documentation

**Total:** ~12 hours

---

## Post-Day 3 Features (Future)

- [ ] Multi-signature cold wallet withdrawals (3-of-5)
- [ ] Whitelist address management UI
- [ ] Email notifications for status changes
- [ ] CSV export for withdrawal history
- [ ] Advanced analytics dashboard
- [ ] Hardware Security Module (HSM) integration
- [ ] Hot/cold wallet threshold management
- [ ] Automatic wallet rebalancing

---

**Ready to Start:** ✅ YES
**Blockers:** None
**Dependencies:** All Day 2 work completed

---

**Next Steps:**
1. Install required NPM packages
2. Create environment variable template
3. Start with TransactionSigningService
4. Follow task order (1 → 6)
5. Commit after each major component
6. Create completion report at end

---

**Report Generated:** November 23, 2025
**Status:** 📋 PLANNING COMPLETE
