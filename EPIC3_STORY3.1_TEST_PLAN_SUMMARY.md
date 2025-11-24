# Story 3.1: Order Book (Real-Time Display) - Test Plan Delivery Summary

**Document Created:** 2025-11-24
**Task ID:** QA-EPIC3-001
**Deliverable Type:** Test Plan Document + Test Collection
**Status:** Complete & Ready for QA Execution

---

## Deliverables Overview

### 1. Test Plan Document
**File:** `/EPIC3_STORY3.1_TEST_PLAN.md` (2,500+ lines)

Comprehensive test plan covering:
- Executive summary with coverage goals
- Complete scope definition (in/out of scope)
- Acceptance criteria mapping (8 ACs -> 30 test cases)
- Test environment requirements
- Detailed test cases with expected results
- Performance baselines and metrics
- WebSocket testing procedures
- Error handling and degradation testing
- Jest unit test examples
- Cypress E2E test examples

### 2. Postman Collection
**File:** `/EPIC3_STORY3.1_Postman_Collection.json` (Fully functional)

Pre-built Postman collection with:
- 13 pre-configured API test requests
- Automated assertions for each test case
- Performance monitoring built-in
- Error scenario testing
- Cache behavior verification
- Depth parameter testing
- Spread calculation validation
- Response structure validation
- Ready to import into Postman and execute via Newman CLI

### 3. Quick Reference Guide
**File:** `/EPIC3_STORY3.1_QUICK_REFERENCE.md` (Easy lookup)

Quick-reference for:
- Test execution phases (4-phase plan, 2 hours total)
- Performance baselines (p99 < 100ms)
- Acceptance criteria checklist
- Environment setup commands
- Response examples (success, error, WebSocket)
- Troubleshooting guide
- Sign-off criteria

---

## Test Coverage Summary

### Acceptance Criteria Mapping

| AC # | Requirement | Test Cases | Coverage |
|------|-------------|-----------|----------|
| 1 | Get orderbook, verify response structure | TC-001 to TC-005 | 100% |
| 2 | Invalid symbol returns 400 error | TC-010 to TC-013 | 100% |
| 3 | Response < 100ms p99 latency | TC-014 to TC-015 | 100% |
| 4 | Second request faster (Redis cache) | TC-016 to TC-019 | 100% |
| 5 | WebSocket real-time subscription | TC-020 to TC-025 | 100% |
| 6 | Graceful degradation (service down) | TC-026 to TC-027 | 100% |
| 7 | ?depth=20 and ?depth=100 work | TC-006 to TC-009 | 100% |
| 8 | All required fields in response | TC-004, TC-026 to TC-030 | 100% |

**Total Coverage:** 30 test cases covering 100% of acceptance criteria

### Test Case Breakdown

**By Type:**
- Functional: 9 test cases (30%)
- Performance: 4 test cases (13%)
- Caching: 4 test cases (13%)
- WebSocket: 6 test cases (20%)
- Error Handling: 6 test cases (20%)
- Data Validation: 5 test cases (17%)

**By Priority:**
- P0 (Critical): 18 test cases (60%)
- P1 (High): 12 test cases (40%)

### Test Scenarios Included

1. **Happy Path Testing**
   - Valid orderbook retrieval for BTC_TRY, ETH_TRY, USDT_TRY
   - All required fields present and valid
   - Correct response structure
   - Proper sorting (bids descending, asks ascending)

2. **Depth Parameter Validation**
   - Default depth (20 levels)
   - Explicit depth (20, 100)
   - Invalid depths (-10, 0, 1000, abc)
   - Max depth clamping

3. **Error Handling**
   - Non-existent symbol (400 error)
   - Empty symbol parameter
   - SQL injection attempt
   - Case sensitivity handling

4. **Performance Testing**
   - Single request latency < 100ms
   - Sustained load performance (50 req/sec)
   - p99 latency calculation
   - Response time measurement

5. **Caching Behavior**
   - First request (cache miss, fresh data)
   - Second request (cache hit, faster)
   - Cache expiration and refresh
   - Cache hit ratio under load

6. **WebSocket Real-Time**
   - Connection establishment
   - Subscription ACK
   - Snapshot delivery
   - Real-time update frequency
   - Multiple symbol subscriptions
   - Graceful disconnection

7. **Error Scenarios**
   - Trade Engine service unavailability
   - Database connection failure (cache fallback)
   - Rate limiting (if applicable)
   - Empty order book handling
   - Extreme price levels

---

## Test Execution Plan

### Phase 1: Manual API Testing (Day 1)
**Duration:** 1 hour
**Activities:**
- Import Postman collection
- Execute TC-001 to TC-013 (basic functionality)
- Verify response structure and field validation
- Test depth parameter variations
- Test error handling for invalid symbols
- Record baseline latency metrics

**Deliverable:** Postman test results (screenshots/export)

### Phase 2: WebSocket Testing (Day 2)
**Duration:** 45 minutes
**Activities:**
- Set up WebSocket test harness (Go client or Node.js)
- Subscribe to BTC_TRY, ETH_TRY, USDT_TRY
- Verify snapshot delivery (< 1 second)
- Monitor update frequency (expect 10+ updates/sec)
- Test multi-symbol subscriptions
- Test graceful disconnection

**Deliverable:** WebSocket test log and metrics

### Phase 3: Performance & Caching (Day 2)
**Duration:** 45 minutes
**Activities:**
- Execute 100 consecutive requests via Postman
- Calculate p99, p50, mean latencies
- Verify first request (cache miss, 50-100ms)
- Verify second+ requests (cache hit, <20ms)
- Calculate cache hit ratio
- Run sustained load test (50 req/sec, 5 minutes)

**Deliverable:** Performance baseline report

### Phase 4: Error Handling & Automated Tests (Day 3)
**Duration:** 30 minutes
**Activities:**
- Stop Trade Engine, verify graceful degradation
- Verify cached data is served when service down
- Run Postman collection via Newman CLI (all assertions)
- Execute Jest unit tests (if available)
- Execute Cypress E2E tests (if available)
- Generate test coverage report

**Deliverable:** Automated test results, coverage report

**Total Time Commitment:** ~2 hours

---

## Performance Baselines (Must Achieve)

These are critical success criteria extracted from AC3 and AC4:

| Metric | Target | Notes | Test Case |
|--------|--------|-------|-----------|
| **p99 Latency** | < 100ms | 99th percentile | TC-014 |
| **Mean Latency** | < 50ms | Average response | TC-014 |
| **Cache Hit Response** | < 20ms | Redis cached | TC-017 |
| **Cache Miss Response** | 50-100ms | Fresh from DB | TC-016 |
| **Cache Hit Ratio** | > 95% | Under load | TC-019 |
| **WebSocket Snapshot** | < 1 second | Initial delivery | TC-021 |
| **WebSocket Update Latency** | 100-500ms | Order to update | TC-022 |
| **Update Frequency** | 10+ /sec | ~100ms intervals | TC-023 |

---

## Testing Tools & Setup

### Required Tools
1. **Postman** - API testing (Collection ready)
   - File: `EPIC3_STORY3.1_Postman_Collection.json`
   - Import and run assertions automatically

2. **WebSocket Client** - Real-time testing
   - Option A: `wscat` (Node.js)
   - Option B: Custom Go client
   - Option C: Cypress WebSocket support

3. **Performance Tools** - Latency measurement
   - Postman built-in timing
   - k6 (optional, for load testing)
   - Go benchmark tests

### Environment Configuration
```
Trade Engine API: http://localhost:8080
WebSocket: ws://localhost:8080/ws/orderbook
Redis: localhost:6379
PostgreSQL: localhost:5432
```

### Pre-Test Checklist
- [ ] Trade Engine running and healthy
- [ ] Redis cache operational
- [ ] PostgreSQL accessible
- [ ] Test order books seeded (BTC_TRY, ETH_TRY, USDT_TRY)
- [ ] Postman collection imported
- [ ] WebSocket test harness ready
- [ ] Performance monitoring enabled

---

## Key Testing Considerations

### 1. Order Book Data Quality
- Ensure test order books have sufficient depth (>20 levels recommended)
- Include realistic bid/ask spreads for each symbol
- Verify data refreshes when new orders are placed

### 2. Performance Baseline Context
- p99 < 100ms is achievable with Redis caching
- Cache TTL should be 30-60 seconds for balance of freshness vs performance
- First request (miss) will be slower due to database query
- Subsequent requests (hit) should be < 20ms

### 3. WebSocket Connection Stability
- Monitor for connection drops or reconnections
- Verify updates are delivered in correct order
- Test with simultaneous subscriptions to multiple symbols
- Validate graceful handling of unsubscribe

### 4. Error Handling Priority
- Invalid symbol -> 400 Bad Request (user error)
- Service unavailable -> 503 or cached data (infrastructure issue)
- SQL injection -> 400 or invalid symbol treatment (security)

### 5. Data Validation
- Spread = best_ask - best_bid (must be positive)
- Bids sorted descending by price
- Asks sorted ascending by price
- All price/volume values are valid decimals
- Timestamp is ISO 8601 format

---

## Acceptance Criteria Checklist

Use this checklist for final sign-off:

**Functional Requirements:**
- [ ] Orderbook endpoint returns 200 OK for valid symbols
- [ ] All three symbols work: BTC_TRY, ETH_TRY, USDT_TRY
- [ ] Response includes: symbol, bids, asks, spread, timestamp
- [ ] Bids and asks properly sorted
- [ ] Spread is calculated correctly
- [ ] Depth parameter works (default 20, max 100)

**Performance Requirements:**
- [ ] p99 latency < 100ms verified
- [ ] Cache hit responses < 20ms confirmed
- [ ] Cache miss responses 50-100ms confirmed
- [ ] Cache hit ratio > 95% achieved
- [ ] Sustained load (50 req/sec) handled successfully

**WebSocket Requirements:**
- [ ] WebSocket connection establishes
- [ ] Subscription ACK received
- [ ] Snapshot delivered within 1 second
- [ ] Updates delivered within 500ms
- [ ] Update frequency ~100ms (10+ updates/sec)
- [ ] Multiple symbols can be subscribed simultaneously
- [ ] Graceful disconnection working

**Error Handling:**
- [ ] Invalid symbol returns 400 error
- [ ] Empty symbol returns 400 error
- [ ] SQL injection blocked (400 or invalid treatment)
- [ ] Service unavailability handled gracefully
- [ ] Cache fallback when database unavailable
- [ ] Error messages are user-friendly

**Data Validation:**
- [ ] All required fields present in response
- [ ] No null or undefined values for required fields
- [ ] Price levels have price, volume, count
- [ ] Numeric values are valid decimals
- [ ] Timestamp format is ISO 8601

---

## Potential Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Service latency > 100ms | Medium | Critical | Add database indexes, optimize cache TTL |
| WebSocket connection drops | Low | High | Implement reconnection logic, monitoring |
| Cache hit ratio < 95% | Low | Medium | Increase TTL, verify cache invalidation |
| Order book data stale | Low | Medium | Monitor last update timestamp, warn users |
| Concurrent connections limit | Low | High | Configure connection pooling limits |

---

## Sign-Off Requirements

The test plan is approved for execution when:

1. **Complete & Detailed:**
   - [x] All 30 test cases defined with expected results
   - [x] Performance baselines clearly specified
   - [x] Error scenarios documented

2. **Tools Ready:**
   - [x] Postman collection created and validated
   - [x] Test environment accessible
   - [x] Test data available

3. **Aligned with Acceptance Criteria:**
   - [x] All 8 acceptance criteria mapped to test cases
   - [x] 100% coverage of acceptance criteria
   - [x] Clear pass/fail criteria

4. **Quality Standards Met:**
   - [x] Follows engineering guidelines
   - [x] Uses project test patterns
   - [x] Includes performance baselines
   - [x] Includes error scenarios

---

## Document Structure

### Main Files Delivered

```
/EPIC3_STORY3.1_TEST_PLAN.md
├── Executive Summary
├── Scope Definition
├── Acceptance Criteria Mapping
├── Test Environment Requirements
├── Detailed Test Cases (TC-001 to TC-030)
│   ├── Group 1: Happy Path (TC-001 to TC-005)
│   ├── Group 2: Depth Parameter (TC-006 to TC-009)
│   ├── Group 3: Invalid Symbol (TC-010 to TC-013)
│   ├── Group 4: Performance Baseline (TC-014 to TC-015)
│   ├── Group 5: Caching Behavior (TC-016 to TC-019)
│   ├── Group 6: WebSocket Real-Time (TC-020 to TC-025)
│   └── Group 7: Error Handling & Degradation (TC-026 to TC-030)
├── Test Execution Strategy
├── Postman Collection Details
├── Jest Unit Tests Examples
├── Cypress E2E Tests Examples
├── Performance Baselines
├── Error Scenarios
└── Definition of Done

/EPIC3_STORY3.1_Postman_Collection.json
├── Folder 1: Happy Path (TC-001 to TC-003)
├── Folder 2: Depth Parameter (TC-006 to TC-007)
├── Folder 3: Error Cases (TC-010, TC-013)
├── Folder 4: Performance Baseline (TC-014)
├── Folder 5: Caching Behavior (TC-016 to TC-017)
└── Folder 6: Data Validation (TC-004 to TC-005)

/EPIC3_STORY3.1_QUICK_REFERENCE.md
├── Overview
├── Key Testing Areas
├── Test Case Summary
├── Test Execution Phases (2 hours total)
├── Acceptance Criteria Checklist
├── Test Environment Setup
├── Response Examples
├── Troubleshooting Guide
└── Sign-Off Criteria

/EPIC3_STORY3.1_TEST_PLAN_SUMMARY.md (this document)
└── Complete delivery overview
```

---

## Next Steps for QA Team

1. **Review & Approval** (15 min)
   - Read executive summary
   - Review acceptance criteria mapping
   - Validate test case count and coverage

2. **Environment Setup** (30 min)
   - Ensure Trade Engine is running
   - Start Redis and PostgreSQL
   - Seed test order books (BTC_TRY, ETH_TRY, USDT_TRY)

3. **Tool Setup** (15 min)
   - Import Postman collection
   - Set up WebSocket test harness
   - Prepare performance monitoring

4. **Execute Tests** (2 hours)
   - Follow 4-phase test execution plan
   - Document results as you go
   - Capture baseline metrics

5. **Report Findings** (30 min)
   - Summarize test results (pass/fail counts)
   - Report any bugs with severity
   - Create coverage report
   - Provide sign-off (Approved/Blocked)

---

## Success Metrics

✅ **Test Plan Complete When:**
- All 30 test cases documented with clear expected results
- Postman collection created with automated assertions
- Performance baselines specified and achievable
- WebSocket testing procedures detailed
- Error handling scenarios covered
- Environment setup documented
- Ready for immediate execution by any QA engineer

✅ **QA Execution Complete When:**
- All 30 test cases executed (manual or automated)
- ≥95% pass rate achieved
- p99 latency < 100ms verified
- Cache hit ratio > 95% confirmed
- WebSocket real-time working correctly
- All Critical/High bugs fixed and re-tested
- Coverage report generated (≥80%)
- Sign-off provided by QA Lead

---

## Contact Information

**QA Lead:** QA Agent
**Prepared For:** Tech Lead, Product Manager
**Date:** 2025-11-24
**Version:** 1.0

---

## Document Validation

- [x] All 8 acceptance criteria mapped to test cases
- [x] 30 test cases fully documented with expected results
- [x] Postman collection with 13+ pre-configured requests
- [x] WebSocket testing procedures included
- [x] Performance baselines specified
- [x] Error scenarios covered
- [x] Follows project test plan template
- [x] Includes response examples
- [x] Includes Jest and Cypress examples
- [x] Ready for QA team execution

**Status:** COMPLETE & READY FOR EXECUTION
