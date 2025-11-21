# Sprint 3 - Story 2.4 QA Testing Documentation
**Feature:** Crypto Deposit (BTC, ETH, USDT)
**Status:** ✅ READY FOR QA TESTING
**Date:** 2025-11-21

---

## Quick Start for QA Engineers

### 1. Start Here 👇
Read **QA_READINESS_REPORT.md** first - it provides:
- Executive summary of what's ready
- Automated pre-check results
- Bug fix verification checklist
- Environment setup requirements

### 2. Then Execute Tests
Follow **QA_MANUAL_TEST_PLAN.md** - it contains:
- 27 detailed test cases with step-by-step instructions
- Curl commands for API testing
- Expected responses for verification
- Database queries for data validation

### 3. Run Automated Checks
Execute **automated_qa_checks.sh** before manual testing:
```bash
cd /Users/musti/Documents/Projects/MyCrypto_Platform/QA_TestPlans/Sprint3
chmod +x automated_qa_checks.sh
./automated_qa_checks.sh
```

---

## Documentation Index

### QA Testing Documents (Start Here)
| Document | Purpose | Lines | Priority |
|----------|---------|-------|----------|
| **QA_READINESS_REPORT.md** | Overall readiness status, pre-check results, sign-off template | 440 | 🔴 READ FIRST |
| **QA_MANUAL_TEST_PLAN.md** | 27 detailed manual test cases with curl commands | 927 | 🔴 EXECUTE |
| **automated_qa_checks.sh** | Automated pre-check script (10 tests) | 293 | 🟡 RUN FIRST |

### Technical Documentation (Reference)
| Document | Purpose | Lines | When to Use |
|----------|---------|-------|-------------|
| **SPRINT3_COMPLETION_SUMMARY.md** | Complete feature overview, bug fixes, metrics | 486 | Background reading |
| **TEST_EXECUTION_RESULTS.md** | Detailed unit test execution report | 354 | Verify test coverage |
| **BUG_FIXES_REPORT.md** | All 6 bugs documented with fixes | - | Understand what was fixed |
| **DEPLOYMENT_READINESS_CHECKLIST.md** | 14-point deployment guide | 494 | After QA approval |
| **TRC20_IMPLEMENTATION_PLAN.md** | Future enhancement (BUG-001 deferred) | - | Understanding scope |

---

## QA Testing Workflow

```
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: Environment Setup                                   │
├─────────────────────────────────────────────────────────────┤
│ □ Ensure all services running (wallet, auth, DB, Redis)    │
│ □ Verify environment variables configured                  │
│ □ Create test users (4 users with different KYC status)    │
│ □ Verify BlockCypher API token (optional but recommended)  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 2: Automated Pre-Checks                               │
├─────────────────────────────────────────────────────────────┤
│ $ ./automated_qa_checks.sh                                  │
│                                                             │
│ Verifies:                                                   │
│ ✓ Service health                                           │
│ ✓ TypeScript compilation (0 errors)                        │
│ ✓ Unit tests (114/114 passing)                            │
│ ✓ Database/Redis connectivity                             │
│ ✓ Environment variables                                    │
│ ✓ Database tables exist                                    │
│ ✓ API endpoint security                                    │
│ ✓ Log file errors                                          │
│ ✓ Test coverage (≥45%)                                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 3: Manual Test Execution (27 Test Cases)              │
├─────────────────────────────────────────────────────────────┤
│ Category 1: KYC Verification (TC-001) - 4 tests            │
│ Category 2: Webhook Security (TC-002) - 4 tests            │
│ Category 3: Wallet Credit (TC-003) - 8 tests               │
│ Category 4: Notifications (TC-004) - 3 tests               │
│ Category 5: Multi-Currency (TC-005) - 4 tests              │
│ Category 6: Transaction History (TC-006) - 1 test          │
│ Category 7: Error Handling (TC-007) - 2 tests              │
│ Category 8: Performance (TC-008) - 1 test                  │
│                                                             │
│ For each test:                                              │
│ 1. Read test description                                   │
│ 2. Execute curl command                                    │
│ 3. Verify expected response                                │
│ 4. Check database with SQL query                           │
│ 5. Document result (PASS/FAIL)                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 4: Results Documentation                              │
├─────────────────────────────────────────────────────────────┤
│ □ Fill out test results in QA_MANUAL_TEST_PLAN.md         │
│ □ Document any bugs found                                  │
│ □ Take screenshots for UI features                         │
│ □ Note performance metrics                                 │
│ □ Calculate pass rate                                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 5: QA Sign-off                                        │
├─────────────────────────────────────────────────────────────┤
│ Complete sign-off section in QA_READINESS_REPORT.md:       │
│ □ Overall result (APPROVED/REJECTED)                       │
│ □ Test summary (passed/failed counts)                      │
│ □ Critical bugs found                                      │
│ □ Recommendations                                          │
│ □ QA Engineer signature and date                           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ RESULT: Production Deployment Approval                     │
├─────────────────────────────────────────────────────────────┤
│ If APPROVED → Proceed to staging deployment                │
│ If REJECTED → Development team fixes bugs, re-test         │
└─────────────────────────────────────────────────────────────┘
```

---

## Bug Fix Summary (For QA Verification)

### ✅ BUG-002: Wallet Credit Integration (CRITICAL)
**What to Test:** TC-003.1 through TC-003.8
**What Was Fixed:**
- Implemented `creditUserWallet()` method
- ACID transactions with pessimistic locking
- Ledger entry creation for audit trail
- Cache invalidation after credit

**Key Test Cases:**
- TC-003.1: Credit existing wallet via webhook
- TC-003.3: Verify ledger entry creation
- TC-003.8: Concurrent deposits (race condition test)

---

### ✅ BUG-004: Missing KYC Verification (CRITICAL)
**What to Test:** TC-001.1 through TC-001.4
**What Was Fixed:**
- Created `KycVerificationService`
- Enforces KYC Level 1 approval
- Returns 403 for non-approved users

**Key Test Cases:**
- TC-001.1: User WITHOUT KYC → 403 Forbidden
- TC-001.2: User with PENDING KYC → 403 Forbidden
- TC-001.4: User with APPROVED KYC → 200 Success

---

### ✅ BUG-005: Webhook Security Vulnerability (CRITICAL)
**What to Test:** TC-002.1 through TC-002.4
**What Was Fixed:**
- Token-based webhook authentication
- `BLOCKCYPHER_WEBHOOK_TOKEN` validation
- Returns 401 for invalid tokens

**Key Test Cases:**
- TC-002.1: Webhook without token → 401 Unauthorized
- TC-002.2: Webhook with invalid token → 401 Unauthorized
- TC-002.3: Webhook with valid token → 200 Success

---

### ✅ BUG-003: Email Notifications Not Implemented (HIGH)
**What to Test:** TC-004.1 through TC-004.3
**What Was Fixed:**
- Created `NotificationService`
- Structured logging for all events
- Time estimates and hash formatting

**Key Test Cases:**
- TC-004.1: Deposit detected notification logged
- TC-004.2: Deposit credited notification logged
- TC-004.3: Correct time estimates

**Note:** Notifications are **logged** but not sent via email. This is expected behavior until email service integration is completed.

---

### ✅ BUG-006: No Unit Tests (HIGH)
**What to Test:** Run automated checks
**What Was Fixed:**
- 114 comprehensive unit tests
- 45% test coverage
- All tests passing

**Verification:** `./automated_qa_checks.sh` → TEST 3 should show "114/114 tests passed"

---

### 📋 BUG-001: TRC-20 USDT Not Supported (DEFERRED)
**Status:** Documented and deferred to Sprint 4
**Workaround:** Use ERC-20 USDT, BTC, or ETH
**Documentation:** TRC20_IMPLEMENTATION_PLAN.md

**Not a bug for MVP testing** - This is an acknowledged limitation.

---

## Test Environment Requirements

### Required Services
```bash
# Check all services are running
docker-compose ps

# Expected output:
# wallet-service    Up    0.0.0.0:3002->3002/tcp
# auth-service      Up    0.0.0.0:3001->3001/tcp
# postgres          Up    5432/tcp
# redis             Up    6379/tcp
```

### Required Environment Variables
```bash
# Critical for testing (wallet-service .env)
HD_WALLET_MNEMONIC="<24-word-testnet-mnemonic>"
BLOCKCYPHER_WEBHOOK_TOKEN="<openssl-rand-hex-32>"
AUTH_SERVICE_URL="http://auth-service:3001"
DATABASE_URL="postgresql://user:pass@localhost:5432/wallet_db"
REDIS_URL="redis://localhost:6379"
```

### Test Users (Auth Service)
Create 4 test users with different KYC status:

1. **User 1: No KYC**
   - Email: `test-no-kyc@example.com`
   - KYC Status: Not submitted
   - Usage: TC-001.1

2. **User 2: KYC Pending**
   - Email: `test-pending-kyc@example.com`
   - KYC Status: PENDING
   - Usage: TC-001.2

3. **User 3: KYC Rejected**
   - Email: `test-rejected-kyc@example.com`
   - KYC Status: REJECTED
   - Usage: TC-001.3

4. **User 4: KYC Approved**
   - Email: `test-approved-kyc@example.com`
   - KYC Status: APPROVED (Level 1)
   - Usage: TC-001.4, TC-003, TC-005

---

## Success Criteria

### For QA Approval
- [ ] All 27 test cases executed
- [ ] ≥95% pass rate (26/27 tests passing)
- [ ] 0 critical bugs found
- [ ] ≤2 minor bugs found (non-blocking)
- [ ] All 4 fixed bugs verified (BUG-002, BUG-003, BUG-004, BUG-005)
- [ ] Performance acceptable (<500ms response time)
- [ ] Documentation complete and accurate

### Critical Tests (Must Pass)
- ✅ TC-001.1: Non-KYC user blocked → 403
- ✅ TC-001.4: KYC approved user allowed → 200
- ✅ TC-002.3: Valid webhook token accepted → 200
- ✅ TC-003.1: Wallet credited correctly
- ✅ TC-003.3: Ledger entry created
- ✅ TC-005.1-003: All 3 currencies work (BTC, ETH, USDT)

---

## Common Issues & Troubleshooting

### Issue 1: Service Not Responding
**Symptom:** `curl: (7) Failed to connect to localhost port 3002`
**Solution:**
```bash
docker-compose ps  # Check if wallet-service is running
docker-compose logs wallet-service  # Check for errors
docker-compose restart wallet-service
```

### Issue 2: Auth Service Timeout
**Symptom:** TC-001 tests timeout or return 500 errors
**Solution:**
```bash
curl http://localhost:3001/health  # Verify auth-service is running
# Check AUTH_SERVICE_URL in wallet-service .env
```

### Issue 3: Database Connection Error
**Symptom:** Tests fail with "Cannot connect to database"
**Solution:**
```bash
psql $DATABASE_URL -c "SELECT 1"  # Test connection
docker-compose restart postgres
# Verify DATABASE_URL in .env
```

### Issue 4: Webhook Token Mismatch
**Symptom:** TC-002.3 returns 401 even with token
**Solution:**
```bash
# Verify BLOCKCYPHER_WEBHOOK_TOKEN in .env
echo $BLOCKCYPHER_WEBHOOK_TOKEN

# Use exact token in curl command
curl "http://localhost:3002/wallet/deposit/crypto/webhook?token=$BLOCKCYPHER_WEBHOOK_TOKEN"
```

### Issue 5: Missing Test Users
**Symptom:** Cannot get JWT tokens for different KYC statuses
**Solution:**
```bash
# Create test users in auth-service
# See QA_MANUAL_TEST_PLAN.md "Prerequisites" section for details
```

---

## QA Testing Timeline

### Estimated Time Breakdown
- **Environment Setup:** 30-60 minutes
- **Automated Pre-Checks:** 5 minutes
- **Manual Test Execution:** 3-4 hours
  - TC-001 (KYC): 30 minutes
  - TC-002 (Webhook): 30 minutes
  - TC-003 (Wallet Credit): 60 minutes
  - TC-004 (Notifications): 20 minutes
  - TC-005 (Multi-Currency): 45 minutes
  - TC-006 (History): 15 minutes
  - TC-007 (Errors): 20 minutes
  - TC-008 (Performance): 10 minutes
- **Documentation & Sign-off:** 30 minutes

**Total:** ~5 hours for complete QA cycle

---

## Contact & Support

### Documentation Location
```
/Users/musti/Documents/Projects/MyCrypto_Platform/QA_TestPlans/Sprint3/
├── README.md (this file)
├── QA_READINESS_REPORT.md
├── QA_MANUAL_TEST_PLAN.md
├── automated_qa_checks.sh
├── SPRINT3_COMPLETION_SUMMARY.md
├── TEST_EXECUTION_RESULTS.md
├── BUG_FIXES_REPORT.md
├── DEPLOYMENT_READINESS_CHECKLIST.md
└── TRC20_IMPLEMENTATION_PLAN.md
```

### API Documentation
- **OpenAPI/Swagger:** http://localhost:3002/api/docs
- **Health Endpoint:** http://localhost:3002/health

### Questions?
Refer to the detailed documentation files listed above. Each document has specific sections for troubleshooting and additional context.

---

## Quick Reference Card

### Essential Commands
```bash
# Check service health
curl http://localhost:3002/health

# Run automated checks
./automated_qa_checks.sh

# Check running services
docker-compose ps

# View service logs
docker-compose logs -f wallet-service

# Restart service
docker-compose restart wallet-service

# Run unit tests
npm test

# Check TypeScript
npx tsc --noEmit
```

### Essential Files
- 🔴 **QA_READINESS_REPORT.md** - Start here
- 🔴 **QA_MANUAL_TEST_PLAN.md** - Test execution guide
- 🟡 **automated_qa_checks.sh** - Automated pre-checks

### Test User Tokens
```bash
# Get JWT token for test user
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test-approved-kyc@example.com", "password": "Test123!"}'

# Use token in subsequent requests
curl -X POST http://localhost:3002/wallet/deposit/crypto/address/generate \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"currency": "BTC"}'
```

---

## Status Summary

| Category | Status | Details |
|----------|--------|---------|
| Development | ✅ COMPLETE | All code implemented and tested |
| Unit Tests | ✅ PASSED | 114/114 tests passing (45% coverage) |
| TypeScript | ✅ PASSED | 0 compilation errors |
| Build | ✅ PASSED | NestJS build successful |
| Bug Fixes | ✅ COMPLETE | 4 critical/high bugs fixed |
| Documentation | ✅ COMPLETE | 8 comprehensive documents |
| QA Status | 🔍 **READY** | **Awaiting manual testing** |
| Deployment | ⏳ PENDING | After QA approval |

---

**QA Team: You are cleared to begin testing!** 🚀

Start with **QA_READINESS_REPORT.md** → Run **automated_qa_checks.sh** → Execute **QA_MANUAL_TEST_PLAN.md**

---

**Last Updated:** 2025-11-21
**Sprint:** Sprint 3
**Story:** 2.4 - Crypto Deposit
**Status:** ✅ READY FOR QA TESTING
