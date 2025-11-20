# Sprint 2 QA Test Plan - Wallet Management & Regression Testing

**Document ID:** SPRINT2_TEST_PLAN
**Date:** 2025-11-20
**Version:** 1.0
**Prepared By:** QA Engineer
**Status:** ACTIVE

---

## 1. Executive Summary

This test plan covers comprehensive QA testing for Sprint 2 deliverables including:
- **Sprint 2 API Testing:** 11 wallet service endpoints (Balance, Deposit, Withdrawal, Transaction History)
- **Sprint 1 Regression Testing:** Authentication endpoints to ensure no regressions

**Test Scope:** API-level testing only (Frontend UI not yet implemented)
**Testing Period:** 2025-11-20
**Environment:** Development (docker-compose)

---

## 2. Test Scope & Objectives

### 2.1 Sprint 2 In Scope (Story 2.1 - 2.3, 2.6)

#### Story 2.1: View Wallet Balances (2 endpoints)
- `GET /api/v1/wallet/balances` - Get all balances
- `GET /api/v1/wallet/balance/:currency` - Get specific currency balance

#### Story 2.2: TRY Deposit (3 endpoints, note: only 3 core endpoints implemented)
- `POST /api/v1/wallet/bank-accounts` - Add bank account
- `GET /api/v1/wallet/bank-accounts` - List bank accounts
- `DELETE /api/v1/wallet/bank-accounts/:id` - Remove bank account
- `POST /api/v1/wallet/deposit/try` - Create deposit request
- `GET /api/v1/wallet/deposit/:id` - Get deposit status

#### Story 2.3: TRY Withdrawal (3 endpoints)
- `POST /api/v1/wallet/withdraw/try` - Create withdrawal with 2FA
- `GET /api/v1/wallet/withdraw/:id` - Check withdrawal status
- `POST /api/v1/wallet/withdraw/:id/cancel` - Cancel pending withdrawal

#### Story 2.6: Transaction History (1 endpoint)
- `GET /api/v1/wallet/transactions` - Get transaction history with pagination/filters

**Total Endpoints:** 11

### 2.2 Sprint 1 Regression Scope (Authentication)

- `POST /api/v1/auth/register` - User registration with KVKK consent
- `POST /api/v1/auth/login` - Email/password login
- `POST /api/v1/auth/refresh` - Refresh token
- `POST /api/v1/auth/logout` - User logout
- `POST /api/v1/auth/password/reset-request` - Password reset request
- `POST /api/v1/auth/password/reset` - Reset password
- `POST /api/v1/auth/2fa/setup` - Enable 2FA
- `POST /api/v1/auth/2fa/verify` - Verify 2FA code
- `POST /api/v1/auth/2fa/enable` - Enable 2FA on account
- `POST /api/v1/auth/2fa/disable` - Disable 2FA

---

## 3. Test Coverage Matrix

### 3.1 Test Categories per Endpoint

For each endpoint, test coverage includes:

1. **Happy Path (Success Scenarios)**
   - Valid inputs → Expected success response
   - Correct HTTP status codes
   - Response format validation

2. **Authentication & Authorization**
   - Missing JWT token → 401 Unauthorized
   - Invalid JWT token → 401 Unauthorized
   - Expired token handling
   - Rate limiting enforcement

3. **Input Validation & Business Rules**
   - Invalid amounts (negative, zero, exceeds limits)
   - Missing required fields
   - Invalid formats (IBAN, currency codes)
   - Boundary conditions (min/max values)
   - Turkish character support

4. **Error Handling**
   - Proper HTTP status codes (400, 401, 404, 409, 422, 429, 500)
   - Error messages in Turkish where specified
   - Error response format consistency
   - Descriptive error codes (e.g., INVALID_IBAN, INSUFFICIENT_BALANCE)

5. **Edge Cases**
   - Zero balance scenarios
   - Concurrent requests
   - Duplicate entries (bank accounts, withdrawal IDs)
   - State transitions (Pending → Processing → Completed)

### 3.2 Coverage Requirements

| Category | Target Coverage | Tool |
|----------|-----------------|------|
| **Balance Endpoints** | 100% (happy path + errors) | Postman + cURL |
| **Deposit Endpoints** | 100% (including 2FA, limits) | Postman + cURL |
| **Withdrawal Endpoints** | 100% (including 2FA, limits) | Postman + cURL |
| **Ledger Endpoint** | 100% (pagination, filters) | Postman + cURL |
| **Auth Regression** | 100% (critical flows) | Postman |

**Expected Coverage:** ≥ 95% of acceptance criteria

---

## 4. Test Data Requirements

### 4.1 User Accounts for Testing

- **Test User 1:** Newly registered, KYC pending, zero balances
- **Test User 2:** KYC approved, multi-currency balances (TRY, BTC, ETH, USDT)
- **Test User 3:** 2FA enabled, withdrawal history

### 4.2 Test Data Sets

#### Balance Testing
- Empty wallet (all zero balances)
- Multi-currency balances with locked amounts
- Large balance amounts (near 50K TRY daily limit)

#### Deposit Testing
- Valid Turkish IBAN: TR + 24 digits (e.g., TR330006100519786457841326)
- Invalid IBANs: Non-Turkish, wrong length, invalid checksum
- Amount boundaries: 100 TRY (min), 50,000 TRY (max), 25,000 TRY (mid-range)
- Duplicate IBAN attempts

#### Withdrawal Testing
- Valid withdrawal amounts: 105 TRY (100 min + 5 fee), 50,000 TRY (max)
- Invalid scenarios: 50 TRY (below min), 50,005 TRY (exceeds limit)
- Multiple daily limits: 1 withdrawal, 5 withdrawals (daily max)
- 2FA code: Valid TOTP, invalid TOTP, expired TOTP

#### Transaction History
- Filter by currency: TRY, BTC, ETH, USDT
- Filter by type: DEPOSIT, WITHDRAWAL, FEE
- Date range: Last 7 days, last 30 days, custom range
- Pagination: page=1, page=5, limit=20, limit=100

---

## 5. Test Environment Setup

### 5.1 Services Required

| Service | Port | Status |
|---------|------|--------|
| PostgreSQL | 5432 | Running |
| Redis | 6379 | Running |
| RabbitMQ | 5672 | Running |
| Auth Service | 3001 | Running |
| Wallet Service | 3002 | Running (NEW) |
| Mailpit | 8025 | Running (Email testing) |

### 5.2 Preconditions

1. All services running via docker-compose
2. Database initialized with schema
3. Test user accounts created via auth-service
4. JWT tokens obtained from auth-service

### 5.3 Tools

- **Postman:** Primary API testing tool
- **cURL:** Command-line API requests
- **Newman:** Automated test execution via CLI
- **PostgreSQL Client:** Database verification
- **Redis CLI:** Cache verification

---

## 6. Test Execution Approach

### Phase 1: Manual Testing (Days 1-2)
1. Execute all test cases manually in Postman
2. Verify request/response formats
3. Document all results with screenshots
4. Identify and report bugs with severity levels

### Phase 2: Automated Testing (Days 2-3)
1. Create Postman collection with all endpoints
2. Develop test scripts for assertions
3. Execute via Newman CLI
4. Generate automated test report

### Phase 3: Regression Testing (Day 3)
1. Re-test all Sprint 1 auth endpoints
2. Verify no functionality regression
3. Document results

### Phase 4: Report & Sign-off (Day 4)
1. Compile all test results
2. Generate coverage report
3. Issue QA sign-off based on criteria
4. Deliver test documentation

---

## 7. Sign-off Criteria

### PASS Status
- 0 P0 (Critical) bugs
- < 3 P1 (High) bugs
- ≥ 95% acceptance criteria coverage
- All critical paths working end-to-end
- No regressions in Sprint 1 features

### CONDITIONAL PASS Status
- < 2 P0 bugs with documented workarounds
- < 5 P1 bugs
- ≥ 90% acceptance criteria coverage
- Blocking bugs identified with fix timeline

### FAIL Status
- ≥ 2 P0 bugs (no workarounds)
- Critical functionality broken
- ≥ 10 P1 bugs

---

## 8. Known Limitations

1. **Frontend UI:** Not implemented - testing API only
2. **Bank API Integration:** Mocked in development environment
3. **Deposit Approval:** Manual admin approval process (not automated)
4. **Admin Panel:** Not yet built - cannot test admin workflows
5. **2FA Integration:** Depends on auth-service TOTP functionality

---

## 9. Testing Resources

| Resource | Owner | Status |
|----------|-------|--------|
| Test Plan | QA Engineer | Complete |
| Test Cases | QA Engineer | In Progress |
| Postman Collection | QA Engineer | In Progress |
| Test Data | QA Engineer | Ready |
| Test Environment | DevOps | Running |

---

## 10. Deliverables

1. **SPRINT2_API_TEST_RESULTS.md** - Detailed test case results
2. **SPRINT2_BUG_REPORT.md** - All bugs found (if any)
3. **SPRINT2_REGRESSION_RESULTS.md** - Sprint 1 regression testing results
4. **SPRINT2_TEST_SUMMARY.md** - Executive summary with sign-off
5. **SPRINT2_POSTMAN_COLLECTION.json** - Automated test collection
6. **SPRINT2_NEWMAN_REPORT.html** - CLI test execution report

---

## 11. Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| QA Lead | [QA Engineer] | | 2025-11-20 |
| Tech Lead | [Tech Lead] | | |
| Product Manager | [PM] | | |

---

**Next Review:** Upon completion of Sprint 2 testing
