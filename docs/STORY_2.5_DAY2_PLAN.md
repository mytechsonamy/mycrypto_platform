# Story 2.5: Crypto Withdrawal - Day 2 Implementation Plan
**Sprint:** 3
**Story Points:** 13 (Total) | 5 points (Day 2)
**Date:** 2025-11-22
**Status:** 🚀 STARTING DAY 2

---

## Day 2 Objectives

### Primary Goals
1. ✅ Implement fee calculation service (network + platform fees)
2. ✅ Create withdrawal request creation logic
3. ✅ Add 2FA verification integration with auth-service
4. ✅ Implement balance checking and fund locking
5. ✅ Add comprehensive tests for withdrawal flow

### Secondary Goals
- Begin hot wallet setup (testnet)
- Create withdrawal history endpoints
- Add cancellation logic

---

## Day 1 Recap

**Completed:**
- ✅ Database schema (CryptoWithdrawalRequest, WhitelistedAddress)
- ✅ AddressValidationService (BTC, ETH, USDT)
- ✅ DTOs and Controller skeleton
- ✅ 15 tests for address validation
- ✅ 129/129 tests passing

**Today's Starting Point:**
- Database entities: Ready
- Address validation: Production-ready
- API skeleton: Ready for implementation

---

## Task Breakdown - Day 2

### 1. Fee Calculation Service (HIGH PRIORITY)

**File:** `services/wallet-service/src/withdrawal/services/fee-calculation.service.ts`

**Objectives:**
- Calculate network fees dynamically from blockchain
- Apply platform fees from configuration
- Enforce min/max withdrawal limits
- Return fee breakdown for user display

**Methods to Implement:**

```typescript
@Injectable()
export class FeeCalculationService {
  /**
   * Calculate total fees for a withdrawal
   * @returns { networkFee, platformFee, totalFee, totalAmount }
   */
  async calculateWithdrawalFees(
    currency: 'BTC' | 'ETH' | 'USDT',
    amount: string,
    network?: string
  ): Promise<FeeCalculationResult>

  /**
   * Get current network fee estimate
   */
  async getNetworkFee(currency: string, network?: string): Promise<string>

  /**
   * Get platform fee from config
   */
  getPlatformFee(currency: string): string

  /**
   * Validate withdrawal amount against limits
   */
  validateWithdrawalAmount(
    currency: string,
    amount: string
  ): { isValid: boolean; errors?: string[] }
}
```

**Configuration Required:**
```typescript
// .env
BTC_MIN_WITHDRAWAL=0.001
ETH_MIN_WITHDRAWAL=0.01
USDT_MIN_WITHDRAWAL=10.0

BTC_PLATFORM_FEE=0.0005
ETH_PLATFORM_FEE=0.005
USDT_PLATFORM_FEE=1.0

BTC_MAX_WITHDRAWAL=10.0
ETH_MAX_WITHDRAWAL=100.0
USDT_MAX_WITHDRAWAL=100000.0
```

**Network Fee Sources:**
- BTC: BlockCypher API fee estimates
- ETH: Infura/Alchemy gas price * gas limit
- USDT: Same as ETH (ERC-20)

**Estimated Time:** 3 hours

---

### 2. Withdrawal Request Service (HIGH PRIORITY)

**File:** `services/wallet-service/src/withdrawal/services/withdrawal-request.service.ts`

**Objectives:**
- Create withdrawal requests with proper validation
- Lock user funds in database
- Create ledger entries
- Check KYC status
- Verify 2FA code

**Methods to Implement:**

```typescript
@Injectable()
export class WithdrawalRequestService {
  /**
   * Create a new withdrawal request
   * - Validate address
   * - Check balance
   * - Verify 2FA
   * - Calculate fees
   * - Lock funds
   * - Create request
   */
  async createWithdrawalRequest(
    userId: string,
    dto: CreateWithdrawalRequestDto
  ): Promise<CryptoWithdrawalRequest>

  /**
   * Check if user has sufficient balance
   */
  async checkSufficientBalance(
    userId: string,
    currency: string,
    totalAmount: string
  ): Promise<boolean>

  /**
   * Lock funds for pending withdrawal
   */
  async lockFunds(
    userId: string,
    currency: string,
    amount: string,
    withdrawalId: string
  ): Promise<void>

  /**
   * Unlock funds (if withdrawal cancelled)
   */
  async unlockFunds(withdrawalId: string): Promise<void>
}
```

**Workflow:**
1. Validate address using AddressValidationService
2. Check KYC Level 1 approval
3. Verify 2FA code with auth-service
4. Calculate fees using FeeCalculationService
5. Check sufficient balance (amount + fees)
6. Lock funds in wallet
7. Create withdrawal request in database
8. Create ledger entry
9. Return withdrawal details

**Estimated Time:** 4 hours

---

### 3. 2FA Verification Integration (HIGH PRIORITY)

**File:** `services/wallet-service/src/withdrawal/services/two-factor-verification.service.ts`

**Objectives:**
- Verify 2FA code with auth-service
- Handle verification failures
- Rate limiting on attempts

**Methods to Implement:**

```typescript
@Injectable()
export class TwoFactorVerificationService {
  /**
   * Verify 2FA code with auth-service
   */
  async verify2FACode(
    userId: string,
    code: string
  ): Promise<{ isValid: boolean; error?: string }>

  /**
   * Call auth-service API to verify TOTP code
   */
  private async callAuthService(
    userId: string,
    code: string
  ): Promise<boolean>
}
```

**Auth Service Integration:**
- Endpoint: `POST /api/v1/auth/2fa/verify`
- Request: `{ userId, code }`
- Response: `{ valid: boolean }`

**Error Handling:**
- Invalid code: Return error to user
- Auth service down: Log warning, optionally allow (configurable)
- Rate limiting: Max 5 attempts per 5 minutes

**Estimated Time:** 2 hours

---

### 4. Controller Implementation (MEDIUM PRIORITY)

**File:** `services/wallet-service/src/withdrawal/withdrawal.controller.ts`

**Update Endpoints:**

#### `POST /wallet/withdraw/crypto/request`
- Remove NotImplementedException
- Call WithdrawalRequestService.createWithdrawalRequest
- Return WithdrawalResponseDto
- Handle errors (insufficient balance, invalid 2FA, etc.)

#### `GET /wallet/withdraw/crypto/fees/:currency`
- Call FeeCalculationService.calculateWithdrawalFees
- Return current fee estimates
- Include min/max limits

#### `GET /wallet/withdraw/crypto/history`
- Query CryptoWithdrawalRequest by userId
- Pagination support
- Return WithdrawalHistoryResponseDto

#### `POST /wallet/withdraw/crypto/:id/cancel`
- Verify ownership
- Check status (only PENDING can be cancelled)
- Unlock funds
- Update status to CANCELLED

#### `GET /wallet/withdraw/crypto/:id`
- Find withdrawal by ID
- Verify ownership
- Return WithdrawalResponseDto

**Estimated Time:** 2 hours

---

### 5. Testing (HIGH PRIORITY)

**Test Files to Create:**

1. `fee-calculation.service.spec.ts` (20+ tests)
   - Network fee calculation
   - Platform fee application
   - Min/max validation
   - Edge cases (zero amount, negative, etc.)

2. `withdrawal-request.service.spec.ts` (30+ tests)
   - Happy path (successful withdrawal request)
   - Insufficient balance
   - Invalid 2FA
   - KYC not approved
   - Invalid address
   - Fund locking/unlocking
   - Ledger entry creation

3. `two-factor-verification.service.spec.ts` (10+ tests)
   - Valid code verification
   - Invalid code
   - Auth service timeout
   - Rate limiting

4. `withdrawal.controller.spec.ts` (Integration tests - 15+ tests)
   - Create withdrawal request
   - Get fee estimates
   - Get withdrawal history
   - Cancel withdrawal
   - Get withdrawal details

**Target:** 75+ new tests, 80%+ coverage

**Estimated Time:** 3 hours

---

## Environment Configuration

**Add to `.env`:**

```bash
# Withdrawal Limits
BTC_MIN_WITHDRAWAL=0.001
ETH_MIN_WITHDRAWAL=0.01
USDT_MIN_WITHDRAWAL=10.0

BTC_MAX_WITHDRAWAL=10.0
ETH_MAX_WITHDRAWAL=100.0
USDT_MAX_WITHDRAWAL=100000.0

# Platform Fees
BTC_PLATFORM_FEE=0.0005
ETH_PLATFORM_FEE=0.005
USDT_PLATFORM_FEE=1.0

# 2FA Settings
TWO_FA_REQUIRED=true
TWO_FA_MAX_ATTEMPTS=5
TWO_FA_ATTEMPT_WINDOW_MINUTES=5

# Auth Service
AUTH_SERVICE_URL=http://auth-service:3001

# Network Fee Sources
BLOCKCYPHER_API_TOKEN=your_token_here
INFURA_API_KEY=your_key_here
```

---

## Dependencies Integration

### Auth Service API
**Endpoint:** `POST /api/v1/auth/2fa/verify`

**Mock for Development:**
```typescript
// For testing when auth-service is unavailable
if (process.env.NODE_ENV === 'development' && !authServiceAvailable) {
  // Accept code "123456" for testing
  return code === '123456';
}
```

### Blockchain APIs
- **BlockCypher:** Fee estimates for Bitcoin
- **Infura/Alchemy:** Gas prices for Ethereum

---

## Definition of Done - Day 2

### Services ✅
- [ ] FeeCalculationService implemented with all methods
- [ ] WithdrawalRequestService implemented with full workflow
- [ ] TwoFactorVerificationService implemented
- [ ] All services registered in WithdrawalModule

### Controller ✅
- [ ] POST /request - Fully implemented
- [ ] GET /fees/:currency - Fully implemented
- [ ] GET /history - Fully implemented
- [ ] POST /:id/cancel - Fully implemented
- [ ] GET /:id - Fully implemented

### Testing ✅
- [ ] Fee calculation tests (20+ tests)
- [ ] Withdrawal request tests (30+ tests)
- [ ] 2FA verification tests (10+ tests)
- [ ] Controller integration tests (15+ tests)
- [ ] All tests passing
- [ ] Coverage: 80%+ for new code

### Integration ✅
- [ ] 2FA verification works with auth-service
- [ ] Balance checking integrated with WalletService
- [ ] Ledger entries created correctly
- [ ] Fund locking/unlocking works

### Quality ✅
- [ ] TypeScript: 0 errors
- [ ] Build: SUCCESS
- [ ] No security vulnerabilities
- [ ] Error handling comprehensive
- [ ] Logging structured and complete

---

## Risk Management

### High Risks

**Risk 1: Auth Service Unavailable**
- Impact: Cannot verify 2FA
- Mitigation: Graceful degradation, return 503 error
- Contingency: Mock 2FA in development

**Risk 2: Insufficient Balance Edge Cases**
- Impact: User could overdraw account
- Mitigation: Pessimistic locking, ACID transactions
- Contingency: Comprehensive testing

**Risk 3: Fee Calculation Errors**
- Impact: Incorrect fee charges
- Mitigation: Multiple validation layers, logging
- Contingency: Manual review for large withdrawals

### Medium Risks

**Risk 4: Network Fee API Failures**
- Impact: Cannot estimate fees
- Mitigation: Fallback to configured default fees
- Contingency: Cache last known good fees

---

## Success Metrics - Day 2

| Metric | Target | Status |
|--------|--------|--------|
| Services implemented | 3 | ⏳ |
| Controller endpoints | 5 | ⏳ |
| Tests written | 75+ | ⏳ |
| Test pass rate | 100% | ⏳ |
| TypeScript errors | 0 | ⏳ |
| Build success | ✅ | ⏳ |
| Coverage (new code) | 80%+ | ⏳ |

---

## Timeline - Day 2

### Hour 1-3: Fee Calculation Service
- Implement FeeCalculationService
- Add configuration loading
- Write 20+ tests
- Verify network fee integration

### Hour 4-7: Withdrawal Request Service
- Implement WithdrawalRequestService
- Add fund locking logic
- Create ledger integration
- Write 30+ tests

### Hour 8-9: 2FA Verification
- Implement TwoFactorVerificationService
- Add auth-service HTTP client
- Write 10+ tests
- Add mock for development

### Hour 10-11: Controller Implementation
- Update all 5 endpoints
- Remove NotImplementedException
- Add error handling
- Write 15+ integration tests

### Hour 12: Final Testing & Verification
- Run all tests
- Fix any failures
- Verify TypeScript compilation
- Check code coverage
- Create Day 2 completion report

---

## Handoffs & Dependencies

### From Day 1
- ✅ AddressValidationService (ready to use)
- ✅ Database entities (ready)
- ✅ DTOs (ready)
- ✅ Controller skeleton (ready for implementation)

### To Day 3
- Withdrawal request creation working
- Fee calculation accurate
- 2FA integration complete
- Ready for blockchain broadcasting

---

## Communication Plan

### Mid-Day Check-in (Hour 6)
- Services implementation status
- Test progress
- Any blockers

### End-of-Day Report
- All tasks completed
- Test results
- Coverage metrics
- Day 3 readiness

---

**Day 2 Status:** 🚀 READY TO START
**Estimated Completion:** 12 hours
**Next Review:** Mid-day check-in (Hour 6)

---

**Prepared By:** Tech Lead
**Date:** 2025-11-22
**Story:** 2.5 - Crypto Withdrawal
**Sprint:** 3
