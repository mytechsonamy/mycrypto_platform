# QA-EPIC3-002: Day 2 Integration Testing - Summary & Quick Reference

**Task ID:** QA-EPIC3-002
**Task Name:** Day 2 Integration Testing (Depth Chart & User Order Highlighting)
**Duration:** 2 hours (allocated time)
**Status:** Deliverables Complete - Ready for Execution
**Date Prepared:** 2025-11-25

---

## What You're Testing

### Story 3.1 Day 2 Features (Building on Day 1 Foundation)

**Day 1 (Already Done):**
- Basic order book API and display
- WebSocket subscription
- REST API endpoint

**Day 2 (What You'll Test):**
1. **Depth Chart API** - Enhanced data structure with cumulative volumes
2. **Depth Chart Component** - Visual depth chart display (Recharts)
3. **User Order Highlighting** - Real-time highlighting in order book
4. **Trade Engine Integration** - Real service (not mocked)
5. **Fallback Behavior** - Graceful degradation when service down
6. **Chart Features** - Zoom, pan, aggregate, export
7. **Performance Baselines** - SLA verification
8. **Error Scenarios** - Edge cases and failures

---

## Quick Reference: Test Scenarios

### 8 Required Test Scenarios

```
TS-001: Depth Chart API - Response Structure & Data Validation
        └─ Verify endpoint returns proper structure
        └─ Validate cumulative volume calculations
        └─ Check 50-level limit per side
        └─ Verify spread percentage

TS-002: Depth Chart Performance & Caching
        └─ 100 sequential requests
        └─ Cache hit < 20ms
        └─ Cache miss < 50ms p99
        └─ Cache hit ratio > 99%

TS-003: Depth Chart Component Rendering
        └─ Chart displays without errors
        └─ Green bids, red asks
        └─ Hover tooltips work
        └─ Desktop view responsive

TS-004: Responsive Design - Mobile, Tablet, Desktop
        └─ 375px (mobile) - stacked layout
        └─ 768px (tablet) - adjusted sizing
        └─ 1920px (desktop) - full layout

TS-005: User Order Highlighting - Real-Time Updates
        └─ User's orders highlighted
        └─ Correct prices highlighted
        └─ Volume displayed
        └─ Updates via WebSocket (< 500ms)

TS-006: Highlighting Service Performance
        └─ Response time < 20ms
        └─ Consistency under rapid calls
        └─ P99 latency < 20ms

TS-007: Trade Engine Integration - Real Service
        └─ Live data from Trade Engine
        └─ Circuit breaker patterns
        └─ Fallback to cache on timeout
        └─ Auto-recovery

TS-008: Fallback Behavior & Error Handling
        └─ Trade Engine timeout → cache
        └─ Network error → graceful message
        └─ User-friendly error messages
        └─ Automatic retry with backoff

TS-009: Chart Features - Zoom, Pan, Aggregate, Export
        └─ Zoom levels (1x, 2x, 5x, 10x)
        └─ Pan/scroll functionality
        └─ Aggregate selector (0.1%, 0.5%, 1%)
        └─ PNG export
        └─ Legend interactive

TS-010: WebSocket Real-Time Updates
        └─ Initial snapshot received
        └─ Updates within 100-500ms
        └─ 10+ updates in 1 minute
        └─ No missed or duplicate updates

TS-011: Performance Baselines - All Operations
        └─ Depth Chart API: p99 < 50ms
        └─ Component Render: < 100ms
        └─ Highlighting Service: < 20ms
        └─ WebSocket Update: < 500ms end-to-end

TS-012: Error Scenarios - Invalid Input & Large Order Books
        └─ Invalid symbol → 400 error
        └─ User not found → empty array
        └─ 1000+ orders → still < 50ms p99
        └─ WebSocket disconnect → reconnect

TS-013: Full Workflow Integration - End-to-End
        └─ Load page, display chart, highlighting
        └─ Receive real-time updates
        └─ Interact with chart
        └─ Mobile responsive
        └─ Error recovery
```

---

## Deliverables Checklist

### Documents Created (4 Total)

- [X] **EPIC3_STORY3.1_DAY2_INTEGRATION_TEST_PLAN.md** (40+ pages)
  - 13 detailed test scenarios with expected results
  - Pre-test checklist
  - Execution schedule
  - Jest unit test examples
  - Cypress E2E test examples
  - Definition of Done criteria

- [X] **EPIC3_STORY3.1_DAY2_Postman_Collection.json**
  - 5 test folders with 15+ requests
  - Automated assertions for each request
  - Performance testing scenarios
  - Error scenario testing
  - Cache hit verification
  - Ready for Newman CLI execution

- [X] **EPIC3_STORY3.1_DAY2_PERFORMANCE_REPORT.md**
  - Template for capturing latency metrics
  - Percentile analysis (p50, p95, p99)
  - SLA comparison tables
  - Resource utilization tracking
  - Optimization recommendations
  - Monitoring guidance for production

- [X] **EPIC3_QA_EPIC3_002_SUMMARY.md** (This Document)
  - Quick reference guide
  - All deliverables summary
  - How to execute tests
  - Key files and paths
  - Acceptance criteria checklist

---

## How to Execute the Tests

### Option 1: Manual Testing in Postman UI

```bash
# 1. Import the collection
- Open Postman
- File → Import → EPIC3_STORY3.1_DAY2_Postman_Collection.json
- Collection appears in left sidebar

# 2. Configure environment
- Set {{base_url}} = http://localhost:8080
- Set {{auth_token}} = [Your JWT token]

# 3. Run tests manually
- Click each request
- Click "Send"
- Review test results in "Tests" tab
- Screenshots for any failures
```

### Option 2: Automated Testing with Newman (CLI)

```bash
# Install Newman
npm install -g newman

# Run collection with HTML report
newman run EPIC3_STORY3.1_DAY2_Postman_Collection.json \
  -e postman_env.json \
  --reporters cli,html \
  --reporter-html-export test-results.html

# Results saved in test-results.html
```

### Option 3: E2E Testing with Cypress

```bash
# Open Cypress UI
npm run cypress:open

# Or run headless (CI/CD)
npm run cypress:run -- --spec "cypress/e2e/trading/depth-chart.spec.ts"
```

### Option 4: Manual Testing (Browser)

```
1. Start dev server: npm run start:dev (frontend)
2. Start backend: npm run dev (backend/NestJS)
3. Start Trade Engine: go run main.go (separate terminal)
4. Navigate to http://localhost:3000/trading/BTC_TRY
5. Open browser DevTools (F12)
6. Follow test scenarios from integration test plan
7. Screenshot failures
8. Log results in execution report
```

---

## Key Files & Paths

### Main Test Documents
```
/Users/musti/Documents/Projects/MyCrypto_Platform/
├── EPIC3_STORY3.1_DAY2_INTEGRATION_TEST_PLAN.md        (Main test plan)
├── EPIC3_STORY3.1_DAY2_Postman_Collection.json         (Postman tests)
├── EPIC3_STORY3.1_DAY2_PERFORMANCE_REPORT.md           (Performance metrics)
└── EPIC3_QA_EPIC3_002_SUMMARY.md                       (This file)
```

### Related Documents
```
├── EPIC3_STORY3.1_TEST_PLAN.md                         (Day 1 test plan)
├── EPIC3_STORY3.1_Postman_Collection.json              (Day 1 Postman)
├── EPIC3_DAY2_TASK_ASSIGNMENTS.md                      (Dev task assignments)
├── EPIC3_START_HERE.md                                 (Overall epic overview)
```

### Code Locations (For Reference)
```
frontend/
├── src/components/Trading/
│   ├── DepthChart.tsx                                  (Component to test)
│   ├── DepthChart.test.tsx                             (Unit tests)
│   └── OrderBook/                                       (Integration location)
├── src/api/tradingApi.ts                               (API client)
└── src/store/slices/tradingSlice.ts                    (Redux state)

services/api/
├── src/modules/market/
│   ├── market.controller.ts                            (API endpoint)
│   └── market.service.ts                               (Business logic)
└── src/services/
    └── trade-engine.client.ts                          (Trade Engine integration)
```

---

## Performance Targets (SLA)

Keep these targets in mind while testing:

```
Endpoint/Operation              Target            Category
─────────────────────────────────────────────────────────
GET /depth-chart (API)          p99 < 50ms       Critical
Component render (50 levels)    < 100ms          Critical
User highlighting service       < 20ms           Critical
WebSocket update latency        < 500ms e2e      Critical
Chart zoom/pan                  < 100ms          High
Export chart                    < 1000ms         High
Cache hit ratio                 > 95%            High
Availability                    > 99.5%          High
```

---

## Success Criteria

Testing is successful when:

### Minimum Requirements
- [ ] All 13 test scenarios executed
- [ ] 95%+ of tests passing
- [ ] All Critical/High SLAs met
- [ ] No unresolved Critical bugs
- [ ] Performance baselines documented

### For Sign-Off
- [ ] Test scenarios: 13/13 complete
- [ ] Pass rate: ≥ 95%
- [ ] Depth Chart API: < 50ms p99 verified
- [ ] Component render: < 100ms verified
- [ ] Highlighting service: < 20ms verified
- [ ] WebSocket updates: < 500ms e2e verified
- [ ] Error handling: All scenarios tested
- [ ] Responsive design: All viewports tested
- [ ] Documentation: All results logged
- [ ] Bugs: All Critical/High resolved

---

## Common Issues & Troubleshooting

### "Service Unavailable" Errors

**Cause:** Trade Engine not running
**Fix:**
```bash
# Terminal 1: Start Trade Engine
cd services/trade-engine
go run main.go

# Terminal 2: Verify it's running
curl http://localhost:8000/health
```

### "Cannot Connect to WebSocket"

**Cause:** WebSocket server not running
**Fix:**
```bash
# Verify backend is running with WebSocket support
curl -i http://localhost:8080/api/v1/market/orderbook/BTC_TRY
# Should return 200 OK
```

### "Cache Miss on Every Request"

**Cause:** Redis not running or cache disabled
**Fix:**
```bash
# Check Redis
redis-cli ping
# Should return PONG

# If not running:
redis-server
```

### "Latency Exceeds Target"

**Cause:**
- Database query slow
- Network latency
- Trade Engine overloaded
- Too many concurrent requests

**Fix:**
- Check database indexes: `EXPLAIN ANALYZE` queries
- Profile Trade Engine: Check its logs
- Reduce concurrent load
- Check resource utilization (CPU, RAM)

---

## Test Execution Timeline

### Pre-Test (15 minutes)
- [ ] Start all services (Trade Engine, Backend, Frontend, Redis, PostgreSQL)
- [ ] Import Postman collection
- [ ] Set up performance monitoring tools
- [ ] Prepare test data (order books with 50+ levels)
- [ ] Get JWT auth token

### Morning Session (2-3 hours)
- [ ] TS-001 & TS-001B: API Structure & Cumulative Volumes (15 min)
- [ ] TS-002: Performance & Caching (20 min)
- [ ] TS-003: Component Rendering (20 min)
- [ ] TS-004: Responsive Design (15 min)
- [ ] Break / Documentation (15 min)

### Afternoon Session (2-3 hours)
- [ ] TS-005 & TS-006: Highlighting (40 min)
- [ ] TS-007 & TS-008: Integration & Fallback (50 min)
- [ ] TS-009 & TS-010: Features & WebSocket (45 min)
- [ ] TS-011 & TS-012: Performance & Error Scenarios (30 min)
- [ ] TS-013: Full Workflow (30 min)
- [ ] Final reporting (15 min)

**Total: ~6-7 hours of testing**

---

## How to Report Results

### For Each Test Scenario

```markdown
### TS-XXX: [Scenario Name]

**Status:** Pass / Fail / Blocked
**Actual Result:** [What happened]
**Expected Result:** [What should happen]
**Performance:** [Actual latency if applicable]

[Screenshot if failed or for evidence]

**Notes:**
- [Any observations]
- [Any issues encountered]
- [Any recommendations]
```

### If Test Fails

```markdown
### BUG-XXX: [Brief Description]

**Severity:** Critical / High / Medium / Low
**Test Scenario:** TS-XXX
**Steps to Reproduce:**
1. [Step 1]
2. [Step 2]
3. [Observe the problem]

**Expected:**
[What should happen]

**Actual:**
[What happens instead]

**Environment:**
- Browser: Chrome 120
- OS: macOS
- Viewport: 1920x1080

**Logs:**
[Include console errors, network errors, screenshots]
```

---

## Acceptance Criteria Checklist

Story 3.1 Day 2 Acceptance Criteria:

- [ ] **AC 1:** Depth Chart API Endpoint
  - [ ] GET /depth-chart endpoint exists
  - [ ] Response structure correct (bids, asks, spread, max volumes)
  - [ ] Cumulative volumes calculated correctly
  - [ ] Percentage calculations verified
  - [ ] Max 50 levels per side
  - [ ] Performance < 50ms p99

- [ ] **AC 2:** Depth Chart Component Rendering
  - [ ] Component renders with mock data
  - [ ] Chart displays 50 levels correctly
  - [ ] Bids shown in green
  - [ ] Asks shown in red
  - [ ] Hover tooltips show price and volume
  - [ ] Responsive on mobile/tablet/desktop

- [ ] **AC 3:** User Order Highlighting - Real-time
  - [ ] User's orders highlighted in book
  - [ ] Correct prices highlighted
  - [ ] Volume displayed at each price
  - [ ] Real-time updates when orders change
  - [ ] Works with WebSocket streaming

- [ ] **AC 4:** Trade Engine Integration
  - [ ] Real Trade Engine service used (not mocked)
  - [ ] Order book updates with live data
  - [ ] Latency within SLA (< 100ms)
  - [ ] Error states handled (connection down, timeout)

- [ ] **AC 5:** Fallback Behavior
  - [ ] Trade Engine unavailable → show cached data
  - [ ] Timeout → graceful error message
  - [ ] Network error → retry with backoff
  - [ ] User sees clear status messages

- [ ] **AC 6:** Chart Features
  - [ ] Zoom functionality (2x, 5x, 10x)
  - [ ] Pan/scroll works on desktop and mobile
  - [ ] Aggregate level selector filters data
  - [ ] Export PNG works
  - [ ] Legend displayed correctly

- [ ] **AC 7:** Performance Baselines
  - [ ] Depth chart API: < 50ms p99
  - [ ] Component render: < 100ms
  - [ ] User highlighting service: < 20ms
  - [ ] WebSocket updates: < 100ms e2e

- [ ] **AC 8:** Error Scenarios
  - [ ] Invalid symbol → 400 error
  - [ ] Trade Engine timeout → cached data
  - [ ] Network down → error state + retry
  - [ ] User not found → no highlighting
  - [ ] Large order book (1000+ orders) → performance maintained

---

## Sign-Off Criteria

**Ready for Sign-Off When:**

1. ✅ All test scenarios (13/13) executed
2. ✅ All P0 tests passing (minimum 95% pass rate)
3. ✅ All performance SLAs verified and documented
4. ✅ All error scenarios tested successfully
5. ✅ No unresolved Critical bugs
6. ✅ Test artifacts collected (screenshots, logs, metrics)
7. ✅ Performance report completed with baseline data
8. ✅ Automated tests (Postman, Cypress) created and passing
9. ✅ Documentation complete and organized

**Final Sign-Off:**
- Tester: _______________  Date: _______________
- QA Lead: _______________  Date: _______________
- Tech Lead: _______________  Date: _______________

---

## Next Steps After Testing

### If All Tests Pass ✅
1. Create PR with test artifacts
2. Share test results with dev team
3. Begin Day 3 testing (Ticker display)
4. Archive performance baselines

### If Issues Found ❌
1. Log all bugs with proper severity
2. Prioritize Critical/High bugs
3. Wait for developer fixes
4. Re-test after fix
5. Sign off only when all Critical/High resolved

---

## Support & Questions

### Common Questions

**Q: What if Trade Engine API spec changes?**
A: Update mock data and expectations, but test structure remains same

**Q: Can I test in parallel (multiple test scenarios)?**
A: Yes, but performance tests should be sequential (reduce interference)

**Q: How long does a full test run take?**
A: ~6-7 hours for all scenarios (can be optimized with parallelization)

**Q: What if tests pass in dev but fail in staging?**
A: Document environment differences and re-run in staging

---

## Document Index

### Test Planning
1. EPIC3_STORY3.1_DAY2_INTEGRATION_TEST_PLAN.md - Full test scenarios

### Test Automation
2. EPIC3_STORY3.1_DAY2_Postman_Collection.json - API tests
3. Cypress E2E tests (in plan document)
4. Jest unit tests (in plan document)

### Performance
5. EPIC3_STORY3.1_DAY2_PERFORMANCE_REPORT.md - Baseline metrics

### Quick Reference
6. EPIC3_QA_EPIC3_002_SUMMARY.md - This document

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-25 | QA Agent | Initial creation with 4 deliverables |

---

**Document Prepared By:** QA Agent
**Date:** 2025-11-25
**Status:** READY FOR EXECUTION

---

*All deliverables are complete and ready for Day 2 integration testing execution.*
