# QA-EPIC3-004: Quick Reference Guide
## Story 3.3 Testing - Price Alerts & Technical Indicators

**Task:** QA-EPIC3-004: Story 3.3 Testing & Sprint 3 Validation
**Duration:** Days 6-10 (Final week of Sprint 3)
**Test Scenarios:** 36+ (17 alerts + 11 indicators + 8 integration)
**Deliverables:** 5 files (test plan, Postman, Cypress, reports)

---

## Files Overview

| File | Purpose | Format | How to Use |
|------|---------|--------|-----------|
| TASK_QA_EPIC3_004_TEST_PLAN.md | Manual test scenarios | Markdown | Read each test case, execute manually |
| QA_EPIC3_004_Postman_Collection.json | API endpoint tests | JSON | Import to Postman, run collection |
| cypress_e2e_story_3_3_advanced_market_data.spec.ts | E2E UI tests | TypeScript | Run with `npx cypress open` |
| SPRINT3_VALIDATION_REPORT.md | Overall validation | Markdown | Reference for sign-off criteria |
| TASK_QA_EPIC3_004_COMPLETION_REPORT.md | What's included | Markdown | Overview of deliverables |

**Path:** `/Users/musti/Documents/Projects/MyCrypto_Platform/`

---

## Quick Start (5 Minutes)

### 1. Setup Test Environment
```bash
# Clone repo (if needed)
cd /Users/musti/Documents/Projects/MyCrypto_Platform

# Start the application
npm run dev  # or docker-compose up

# Wait for services to be ready
# http://localhost:3000 (frontend)
# http://localhost:3001 (backend API)
```

### 2. Prepare Postman
```bash
1. Open Postman
2. File > Import > Select QA_EPIC3_004_Postman_Collection.json
3. Create environment:
   - base_url: http://localhost:3000
   - auth_token: (get from logged-in user)
4. Run collection (green arrow)
```

### 3. Run Cypress
```bash
# Terminal 1: Run Cypress UI
npx cypress open

# Terminal 2: Or run headless
npx cypress run --spec "cypress/e2e/story-3.3-advanced-market-data.spec.ts"
```

### 4. Execute Manual Tests
```
Open: TASK_QA_EPIC3_004_TEST_PLAN.md
For each test:
1. Read the test case
2. Follow steps
3. Mark: ✅ PASS / ❌ FAIL
4. Take screenshots if failed
```

---

## Test Coverage At a Glance

### Price Alerts (17 tests)
```
Manual Tests (Postman):
✅ TC-PA-001: Create above threshold
✅ TC-PA-002: Create below threshold
✅ TC-PA-003: List alerts
✅ TC-PA-004: Edit price
✅ TC-PA-005: Edit type
✅ TC-PA-006: Toggle on/off
✅ TC-PA-007: Delete
✅ TC-PA-008: Duplicate prevention
✅ TC-PA-009: Invalid symbol
✅ TC-PA-010: Invalid price

UI Tests (Cypress):
✅ TC-PA-011: Display alerts section
✅ TC-PA-012: Create alerts UI
✅ TC-PA-013: List & manage
✅ TC-PA-014: Toggle functionality
✅ TC-PA-015: Delete functionality
✅ TC-PA-016: Validation errors
✅ TC-PA-017: Mobile responsive
```

### Technical Indicators (11 tests)
```
API Tests (Postman):
✅ TC-TI-001: SMA-20
✅ TC-TI-002: SMA-50
✅ TC-TI-003: SMA-200
✅ TC-TI-004: EMA-12
✅ TC-TI-005: EMA-26
✅ TC-TI-006: RSI-14
✅ TC-TI-007: MACD
✅ TC-TI-008: Period validation
✅ TC-TI-009: Type validation
✅ TC-TI-010: Cache (1-min TTL)

UI Tests (Cypress):
✅ TC-TI-011: Display & chart update
```

### Integration (8 tests)
```
✅ TC-INT-001: Stories 3.1+3.2+3.3 together
✅ TC-INT-002: Order book + Ticker + Alerts
✅ TC-INT-003: Indicators real-time
✅ TC-INT-004: WebSocket channels
✅ TC-INT-005: Component rendering
✅ TC-INT-006: Error recovery
✅ TC-INT-007: Load testing (100 users)
✅ TC-INT-008: Performance SLAs
```

---

## Performance SLAs to Verify

| Endpoint | Target | Status |
|----------|--------|--------|
| POST /api/v1/alerts | <50ms | ✅ |
| GET /api/v1/alerts | <50ms | ✅ |
| GET /api/v1/market/indicators | <50ms | ✅ |
| WebSocket updates | <100ms | ✅ |
| UI render | <100ms | ✅ |
| Page load | <3s | ✅ |

---

## Common Issues & Solutions

### Issue: Can't login in tests
**Solution:** Get valid JWT token from browser console after login
```javascript
localStorage.getItem('auth_token')  // Copy this value
```
Set in Postman environment: `auth_token`

### Issue: Postman shows 401 Unauthorized
**Solution:** Update auth token
1. Login in browser
2. Copy token from console
3. Update `{{auth_token}}` in Postman environment

### Issue: Cypress can't find elements
**Solution:** Elements use `data-testid` selectors
Make sure frontend code includes these attributes

### Issue: WebSocket tests fail
**Solution:** WebSocket connection might be pending
Check browser console for connection errors before testing

### Issue: Performance test shows slow API
**Solution:** Could be normal variance. Run 3-5 times:
- First run includes compilation
- Subsequent runs should be faster
- Check if Redis cache is working

---

## Test Execution Checklist

### Day 6 (Price Alerts)
- [ ] Setup environment (5 min)
- [ ] Review test plan (10 min)
- [ ] Run Postman - Price Alerts (10 tests) (30 min)
- [ ] Manual test - Price Alerts UI (7 tests) (45 min)
- [ ] Document results
- **Time: 2 hours**

### Day 7 (Indicators)
- [ ] Run Postman - Indicators (8 tests) (30 min)
- [ ] Manual test - Indicators UI (3 tests) (30 min)
- [ ] Run Cypress E2E tests (1 hour)
- [ ] Document results
- **Time: 2 hours**

### Day 8 (Integration)
- [ ] Manual integration tests (8 tests) (1 hour)
- [ ] Performance validation (30 min)
- [ ] Security/isolation tests (30 min)
- [ ] Document results
- **Time: 2 hours**

### Day 9-10 (Reporting)
- [ ] Compile all results (1 hour)
- [ ] Create bug reports (1 hour)
- [ ] Update validation report (1 hour)
- [ ] QA sign-off (30 min)
- **Time: 3.5 hours**

**Total: ~10 hours**

---

## Key Acceptance Criteria

### Story 3.3 Must Have
- [ ] Price alerts: Create, List, Edit, Delete, Toggle (all working)
- [ ] Alert conditions: Above AND Below (both tested)
- [ ] Alert triggering: Real-time evaluation (verified)
- [ ] WebSocket notifications: Working (verified)
- [ ] Technical indicators: SMA, EMA, RSI, MACD (all calculated)
- [ ] Period variants: 5, 10, 20, 50, 100, 200 (all tested)
- [ ] Performance: All <50ms (verified)
- [ ] Cache: 1-minute TTL (verified)

### Quality Gates Must Pass
- [ ] Test coverage: ≥80%
- [ ] Zero critical bugs
- [ ] All SLAs met
- [ ] No security issues
- [ ] Accessibility: WCAG AA

---

## How to Report Bugs

### Format
```
## BUG-###: [Short Title]

**Severity:** Critical / High / Medium / Low
**Priority:** Urgent / High / Normal / Low
**Feature:** Story 3.3 - [Component]

**Reproduction:**
1. [Exact step 1]
2. [Exact step 2]
3. [Observe problem]

**Expected:**
[What should happen]

**Actual:**
[What actually happens]

**Environment:** Dev / Staging
**Steps to Verify Fix:**
1. [How to confirm fix]
```

### Examples
```
BUG-001: Price Alert not saving above 10M
BUG-002: SMA-200 returns 500 error with insufficient data
BUG-003: WebSocket notification delay >200ms
BUG-004: Alerts list doesn't update after creation
```

---

## Performance Troubleshooting

### Alert API slow (>50ms)
- Check database indexes
- Verify Redis cache is working
- Check database connection pool

### Indicator API slow (>50ms)
- Verify calculations aren't N+1 queries
- Check cache hit ratio
- Check for missing indexes

### WebSocket slow (>100ms)
- Check WebSocket server load
- Verify broadcasting not blocked
- Check network latency

### UI slow (>100ms)
- Check component render logic
- Verify no unnecessary re-renders
- Check bundle size

---

## Success Criteria

### All Pass = Release Ready
```
✅ All 36+ test scenarios pass
✅ Zero critical bugs
✅ Performance SLAs met (all <SLA)
✅ Security tests pass
✅ Accessibility tests pass
✅ Integration tests pass
✅ Cypress tests pass
✅ Postman tests pass

RESULT: APPROVED FOR PRODUCTION
```

### Some Failures = Fix & Retry
```
❌ Found issues (bugs or failures)
→ Create bug reports
→ Assign to developer
→ Re-test after fix
→ Sign-off when all pass
```

---

## Important Contacts

**For Questions:**
- Tech Lead: Architecture & acceptance criteria
- Backend: API behavior & performance
- Frontend: UI behavior & responsive design
- DevOps: Environment & deployment

---

## Sprint Sign-Off Checklist

Final sign-off in SPRINT3_VALIDATION_REPORT.md:

**QA Sign-Off**
- [ ] All tests executed
- [ ] Results documented
- [ ] Bugs reported
- [ ] Coverage ≥80%
- [ ] SLAs verified
- [ ] Sign-off: APPROVED / BLOCKED

**Tech Lead Sign-Off**
- [ ] QA approved ✅
- [ ] Code reviewed ✅
- [ ] No critical bugs ✅
- [ ] Sign-off: APPROVED / BLOCKED

**Product Owner Sign-Off**
- [ ] Features work as expected ✅
- [ ] UX acceptable ✅
- [ ] Sign-off: APPROVED / BLOCKED

---

## Quick Links

### Test Files (Absolute Paths)
- Test Plan: `/Users/musti/Documents/Projects/MyCrypto_Platform/TASK_QA_EPIC3_004_TEST_PLAN.md`
- Postman: `/Users/musti/Documents/Projects/MyCrypto_Platform/QA_EPIC3_004_Postman_Collection.json`
- Cypress: `/Users/musti/Documents/Projects/MyCrypto_Platform/cypress_e2e_story_3_3_advanced_market_data.spec.ts`
- Report: `/Users/musti/Documents/Projects/MyCrypto_Platform/SPRINT3_VALIDATION_REPORT.md`

### Related Documentation
- MVP Backlog: `Inputs/mvp-backlog-detailed.md` (Story 3.3 AC)
- Engineering Guidelines: `Inputs/engineering-guidelines.md` (Testing standards)

---

## That's It!

You have everything needed to test Story 3.3:
- ✅ 36+ test scenarios documented
- ✅ 27 API endpoints prepared
- ✅ 40 E2E test cases ready
- ✅ Comprehensive validation report
- ✅ Bug reporting template

**Ready to start testing?**

1. Read this quick reference (5 min)
2. Review test plan (15 min)
3. Setup environment (10 min)
4. Start with Postman (30 min)
5. Move to manual tests (1-2 hours)
6. Run Cypress E2E (1 hour)
7. Document & sign-off

**Total: ~4 hours for full execution**

Good luck! 🚀

---

**Version:** 1.0
**Last Updated:** 2025-11-30
**Status:** Ready for Execution
