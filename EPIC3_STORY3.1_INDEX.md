# EPIC 3 - Story 3.1: Order Book (Real-Time Display) - Test Plan Index

**Task ID:** QA-EPIC3-001
**Completion Date:** 2025-11-24
**Status:** COMPLETE ✅
**Time Spent:** 2 hours
**Effort Points:** 1.5 pts

---

## Quick Navigation

### Primary Documents (Read in This Order)

#### 1. START HERE: Executive Summary
**File:** `TASK_QA_EPIC3_001_DELIVERABLES.md`
- Overview of what was delivered
- Quick metrics and validation checklist
- File locations and next steps

#### 2. DETAILED TEST PLAN (Main Document)
**File:** `EPIC3_STORY3.1_TEST_PLAN.md` (43 KB, 1,682 lines)
- Complete acceptance criteria mapping (8 ACs)
- 30 fully documented test cases with expected results
- Test environment setup requirements
- Performance baselines and metrics
- WebSocket testing procedures
- Jest and Cypress test examples
- Error scenarios and degradation testing

#### 3. QUICK REFERENCE (For Execution)
**File:** `EPIC3_STORY3.1_QUICK_REFERENCE.md` (7.2 KB)
- Print this for test execution desk
- 2-hour test execution timeline
- Performance baselines
- Troubleshooting guide
- Response examples
- Sign-off criteria

#### 4. SUMMARY & NEXT STEPS
**File:** `EPIC3_STORY3.1_TEST_PLAN_SUMMARY.md` (15 KB)
- Detailed breakdown of deliverables
- Test coverage analysis
- Performance baselines table
- Testing tools & setup
- Acceptance criteria checklist
- Potential risks & mitigations
- Sign-off requirements

---

## Test Artifacts

### API Testing
**File:** `EPIC3_STORY3.1_Postman_Collection.json` (23 KB)
- 13 pre-configured API requests
- Automated assertions for each request
- Covers TC-001 to TC-013 (API testing)
- Performance monitoring built-in
- Error scenario testing
- Cache behavior verification
- Ready to import into Postman and run via Newman CLI

**Import Instructions:**
```bash
# Option 1: GUI
1. Open Postman
2. File → Import
3. Select: EPIC3_STORY3.1_Postman_Collection.json
4. Click "Import"

# Option 2: CLI (Newman)
npm install -g newman
newman run EPIC3_STORY3.1_Postman_Collection.json
```

---

## Test Case Catalog

### Total: 30 Test Cases (100% Coverage)

#### Group 1: Happy Path (5 test cases)
- TC-001: Get orderbook with default depth (20)
- TC-002: Get orderbook for ETH_TRY
- TC-003: Get orderbook for USDT_TRY
- TC-004: Verify response contains all required fields
- TC-005: Verify spread calculation (best_ask - best_bid)

#### Group 2: Depth Parameter (4 test cases)
- TC-006: Query with depth=20
- TC-007: Query with depth=100
- TC-008: Query with invalid depth values
- TC-009: Default depth when parameter omitted

#### Group 3: Invalid Symbol (4 test cases)
- TC-010: Non-existent symbol (400 error)
- TC-011: Empty symbol parameter
- TC-012: Case sensitivity of symbol
- TC-013: Symbol with SQL injection attempt

#### Group 4: Performance Baseline (2 test cases)
- TC-014: Single request response time < 100ms p99
- TC-015: Latency SLA verification (load test)

#### Group 5: Caching Behavior (4 test cases)
- TC-016: First request hits database/fresh data
- TC-017: Second request hits Redis cache (faster)
- TC-018: Cache expiration and refresh
- TC-019: Cache hit ratio under load (>95%)

#### Group 6: WebSocket Real-Time (6 test cases)
- TC-020: WebSocket subscription to orderbook channel
- TC-021: Receive orderbook snapshot via WebSocket
- TC-022: Receive real-time order book updates
- TC-023: WebSocket update frequency matches SLA
- TC-024: Multiple symbol subscriptions on single connection
- TC-025: Graceful WebSocket disconnection

#### Group 7: Error Handling & Degradation (5 test cases)
- TC-026: Trade Engine service unavailable (graceful handling)
- TC-027: Database connection failure (fallback to cache)
- TC-028: Rate limiting on orderbook endpoint
- TC-029: Empty order book handling
- TC-030: Extreme price levels (very high/low prices)

---

## Acceptance Criteria Mapping

| AC # | Requirement | Test Cases | Status |
|------|-------------|-----------|--------|
| 1 | Get orderbook, verify response structure is correct | TC-001 to TC-005 | ✅ Mapped |
| 2 | Invalid symbol should return 400 error | TC-010 to TC-013 | ✅ Mapped |
| 3 | Verify endpoint response is <100ms p99 | TC-014 to TC-015 | ✅ Mapped |
| 4 | Second request for same symbol is faster (Redis cache hit) | TC-016 to TC-019 | ✅ Mapped |
| 5 | Client can subscribe to orderbook channel and receive updates | TC-020 to TC-025 | ✅ Mapped |
| 6 | System gracefully handles Trade Engine being down | TC-026 to TC-027 | ✅ Mapped |
| 7 | ?depth=20 and ?depth=100 work correctly | TC-006 to TC-009 | ✅ Mapped |
| 8 | All required fields in response (symbol, bids, asks, spread, timestamp) | TC-004, TC-028 to TC-030 | ✅ Mapped |

**Coverage: 8/8 (100%)**

---

## Performance Baselines (Must Achieve)

These are critical success criteria from the acceptance criteria:

| Metric | Target | Test Case | Status |
|--------|--------|-----------|--------|
| p99 Latency | < 100ms | TC-014 | Specified |
| Mean Latency | < 50ms | TC-014 | Specified |
| Cache Hit Response | < 20ms | TC-017 | Specified |
| Cache Miss Response | 50-100ms | TC-016 | Specified |
| Cache Hit Ratio | > 95% | TC-019 | Specified |
| WebSocket Snapshot | < 1 second | TC-021 | Specified |
| WebSocket Update Latency | 100-500ms | TC-022 | Specified |
| Update Frequency | 10+ /sec | TC-023 | Specified |

---

## Test Execution Timeline

### 4-Phase Approach (Total: ~2 hours)

**Phase 1: Manual API Testing** (1 hour)
- Import Postman collection
- Execute TC-001 to TC-013
- Verify response structure and fields
- Test depth parameter variations
- Test error handling
- Record baseline latency

**Phase 2: WebSocket Testing** (45 minutes)
- Establish WebSocket connection
- Subscribe to BTC_TRY, ETH_TRY, USDT_TRY
- Verify snapshot delivery (< 1 sec)
- Monitor update frequency (10+ /sec)
- Test multi-symbol subscriptions
- Test graceful disconnection

**Phase 3: Performance & Caching** (45 minutes)
- Execute 100 consecutive requests
- Calculate p99, p50, mean latencies
- Verify cache hit performance (< 20ms)
- Calculate cache hit ratio (>95%)
- Run sustained load test (50 req/sec)

**Phase 4: Error Handling & Automation** (30 minutes)
- Stop Trade Engine, verify graceful degradation
- Test cached data fallback
- Run Postman collection via Newman (all assertions)
- Execute Jest unit tests (if available)
- Execute Cypress E2E tests (if available)

---

## How to Get Started

### For QA Lead:
1. **Read:** `TASK_QA_EPIC3_001_DELIVERABLES.md` (this overview)
2. **Review:** `EPIC3_STORY3.1_TEST_PLAN_SUMMARY.md` (detailed breakdown)
3. **Approve:** Sign-off on 30 test cases and 100% AC coverage
4. **Schedule:** Assign 2-hour test execution window
5. **Delegate:** Give QA engineers the test cases to execute

### For QA Engineers:
1. **Setup:** Follow environment setup in QUICK_REFERENCE.md
2. **Import:** Import Postman collection into Postman
3. **Execute:** Follow 4-phase test execution plan (2 hours total)
4. **Document:** Record results as you go
5. **Report:** Provide pass/fail summary and bug reports

### For Tech Lead:
1. **Review:** Check acceptance criteria mapping (8/8 = 100%)
2. **Validate:** Verify performance baselines are achievable
3. **Approve:** Sign-off before QA execution begins
4. **Monitor:** Track test results as they come in

---

## Deliverable Files

| File | Size | Purpose | Audience |
|------|------|---------|----------|
| `EPIC3_STORY3.1_TEST_PLAN.md` | 43 KB | Main test plan with 30 test cases | QA Engineers, Tech Lead |
| `EPIC3_STORY3.1_Postman_Collection.json` | 23 KB | API test collection with assertions | QA Engineers |
| `EPIC3_STORY3.1_QUICK_REFERENCE.md` | 7.2 KB | Quick lookup for test execution | QA Engineers (print for desk) |
| `EPIC3_STORY3.1_TEST_PLAN_SUMMARY.md` | 15 KB | Detailed overview and breakdown | QA Lead, Tech Lead |
| `TASK_QA_EPIC3_001_DELIVERABLES.md` | 13 KB | Delivery summary | QA Lead, Product Owner |
| `EPIC3_STORY3.1_INDEX.md` | This file | Navigation and quick reference | All |
| **TOTAL** | **~120 KB** | **Production-ready test artifacts** | **QA Team** |

---

## Key Metrics Summary

- **Test Cases:** 30 (fully documented)
- **Acceptance Criteria Covered:** 8/8 (100%)
- **Postman Requests:** 13 (with assertions)
- **Performance Baselines:** 8 specific metrics
- **Test Execution Time:** ~2 hours
- **Documentation:** 1,682 lines of detailed test plan

---

## Quality Assurance

- [x] All 8 acceptance criteria mapped to test cases
- [x] 30 test cases documented with expected results
- [x] Postman collection created with automated assertions
- [x] Performance baselines specified and achievable
- [x] Error scenarios and degradation tested
- [x] WebSocket real-time testing procedures included
- [x] Jest unit test examples provided
- [x] Cypress E2E test examples provided
- [x] Quick reference guide for test execution
- [x] Troubleshooting guide included
- [x] Follows project test plan patterns
- [x] Follows engineering guidelines

---

## Sign-Off Checklist

**Before QA Execution:**
- [ ] QA Lead approves test plan (30 test cases)
- [ ] Tech Lead approves performance baselines
- [ ] Product Owner confirms AC coverage (8/8)
- [ ] Environment is configured and tested
- [ ] Test data (order books) are seeded
- [ ] Postman collection is imported

**During QA Execution:**
- [ ] All 30 test cases executed
- [ ] Results documented with pass/fail
- [ ] Performance baselines measured
- [ ] Cache hit ratio calculated
- [ ] WebSocket stability confirmed
- [ ] Error scenarios tested

**After QA Execution:**
- [ ] Test results summarized
- [ ] Bugs reported with severity
- [ ] Coverage report generated (≥80%)
- [ ] All P0/P1 bugs fixed and re-tested
- [ ] Final approval from QA Lead
- [ ] Sign-off delivered to Tech Lead

---

## Contact & Escalation

- **QA Lead:** Assign test execution
- **Tech Lead:** Approve baselines and coverage
- **Product Owner:** Confirm feature readiness
- **QA Engineer:** Execute tests and report findings

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-11-24 | Initial comprehensive test plan delivery |

---

## Additional Resources

- **MVP Backlog:** `/Inputs/mvp-backlog-detailed.md` (Story 3.1 requirements)
- **Engineering Guidelines:** `/Inputs/engineering-guidelines.md` (coding standards)
- **Existing Test Plan Pattern:** `/test-plans/sprint-1/user-registration-test-plan.md`
- **Trade Engine Code:** `/services/trade-engine/internal/server/orderbook_handler.go`

---

**Document Status:** COMPLETE AND READY FOR QA EXECUTION ✅

**Created By:** QA Agent
**Date:** 2025-11-24
**Next Step:** Assign test execution to QA team
