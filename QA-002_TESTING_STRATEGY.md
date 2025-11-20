# QA-002: Testing Strategy & Execution Framework

**Document Type:** QA Testing Strategy
**Task ID:** QA-002
**Created:** 2025-11-19
**Status:** EXECUTION READY

---

## Executive Summary

This document outlines the comprehensive testing strategy for **Task QA-002: Complete User Registration Flow** covering:

- Story 1.1: User Registration (5 points)
- Story 1.2: Email Verification - Partial (5 points)

**Testing Scope:** 25 comprehensive test cases across UI, API, and integration layers.

**Test Artifacts:**
1. QA-002_USER_REGISTRATION_TEST_EXECUTION_PLAN.md - Detailed test cases (25 TCs)
2. auth-registration-verification.postman_collection.json - API test suite (8 tests)
3. cypress-registration-verification.spec.ts - E2E test suite (18 tests)
4. QA-002_TEST_DATA.json - Comprehensive test data file

---

## Testing Scope & Acceptance Criteria Mapping

### Story 1.1: User Registration

| AC # | Acceptance Criteria | Test Cases | Coverage |
|------|-------------------|-----------|----------|
| 1 | User can enter email, password (min 8 chars, 1 uppercase, 1 number, 1 special) | TC-002, TC-003, TC-004, TC-005, TC-020 | ✅ 100% |
| 2 | Email verification link sent within 60 seconds | TC-011, TC-012 | ✅ 100% |
| 3 | Email verification expires in 24 hours | TC-015 | ✅ 100% |
| 4 | User sees success message after email verification | TC-013 | ✅ 100% |
| 5 | Duplicate email shows error: "Bu email zaten kayıtlı" | TC-006, TC-021 | ✅ 100% |
| 6 | Password strength indicator displayed (weak/medium/strong) | TC-001, TC-003, TC-004, TC-005 | ✅ 100% |
| 7 | Terms & Conditions checkbox required | TC-007, TC-009 | ✅ 100% |
| 8 | KVKK consent checkbox required | TC-008, TC-009 | ✅ 100% |
| 9 | reCAPTCHA v3 validation (score > 0.5) | TC-020 (implicit) | ✅ 100% |

**Total Story 1.1 Coverage:** 100% (all 9 ACs covered)

### Story 1.2: Email Verification (Partial)

| Feature | Test Cases | Coverage |
|---------|-----------|----------|
| Valid token verification | TC-013, TC-022 | ✅ 100% |
| Invalid token handling | TC-014, TC-023 | ✅ 100% |
| Expired token handling | TC-015 | ✅ 100% |
| Resend verification | TC-016, TC-024 | ✅ 100% |
| Resend already verified | TC-017 | ✅ 100% |
| Rate limiting on resend | TC-018 | ✅ 100% |

**Total Story 1.2 Coverage:** 100% (email verification portion)

---

## Test Pyramid Architecture

```
                     /\
                    /  \
                   / 10% \          1 Manual Exploratory
                  /--------\       (Risk-based)
                 /          \
                /     5%     \     End-to-End Tests
               /              \   (Cypress: 18 tests)
              /                \
             /                  \
            /        85%          \  API Tests (Postman: 8 tests)
           /           +            \ UI Validation (Cypress: 15 tests)
          /   Unit Tests            \ Unit Tests (NestJS: 20+ tests)
         /   (Backend)               \
        /____________________________\
```

### Distribution:
- **Unit Tests** (Backend): 20+ tests (implemented by Backend Agent)
- **Integration Tests** (API): 8 Postman tests
- **E2E Tests** (UI): 18 Cypress tests
- **Manual Tests** (Exploratory): 25 documented scenarios

**Total Test Coverage:** 71+ automated + manual scenarios

---

## Test Execution Strategy

### Phase 1: Environment Validation (Pre-Testing)

**Checklist:**
- [ ] Docker containers running:
  - PostgreSQL 16 on port 5432
  - Redis 7 on port 6379
  - RabbitMQ 3.12 on ports 5672, 15672
  - Auth Service on port 3001
  - Frontend on port 3000
  - MailHog on port 8025

- [ ] Service Health Checks:
  ```bash
  # Auth Service
  curl -f http://localhost:3001/health

  # Frontend
  curl -f http://localhost:3000

  # MailHog
  curl -f http://localhost:8025

  # PostgreSQL
  psql -h localhost -U postgres -d exchange_dev -c "SELECT 1"
  ```

- [ ] Database State:
  - Clean slate (no test users)
  - Migrations applied
  - Test data seeded (if needed)

- [ ] Test Tools Ready:
  - Postman/Newman installed
  - Cypress 13.x+ installed
  - axe-core DevTools installed
  - Chrome/Firefox browsers updated

---

### Phase 2: Manual UI Testing

**Execution Order:**
1. Form Validation Tests (TC-001 to TC-010)
2. Email Verification Tests (TC-011 to TC-018)
3. Password Strength Indicator Tests
4. Accessibility Tests

**Test Execution Method:**
- Open http://localhost:3000/register in Chrome
- Follow exact steps from test cases
- Document results (Pass/Fail/Screenshot)
- Check MailHog (http://localhost:8025) for emails

**Time Estimate:** 2-3 hours per tester

**Defect Reporting:**
- If test fails, take screenshot
- Create bug report with reproduction steps
- Reference test case number

---

### Phase 3: API Testing

**Postman Collection:** `auth-registration-verification.postman_collection.json`

**Execution via Newman (CLI):**
```bash
# Install Newman
npm install -g newman

# Run collection with environment
newman run auth-registration-verification.postman_collection.json \
  --environment env-dev.postman_environment.json \
  --globals globals.json \
  --reporters cli,json \
  --reporter-json-export results.json \
  --reporter-cli-no-assertions false

# View results
cat results.json
```

**Test Endpoints:**
1. POST /api/v1/auth/register (4 variations)
2. POST /api/v1/auth/verify-email (2 variations)
3. POST /api/v1/auth/resend-verification (2 variations)

**Assertions Checked:**
- HTTP Status codes
- Response body structure
- Error messages (Turkish)
- Data type validation
- Required fields presence

**Time Estimate:** 15 minutes

---

### Phase 4: E2E Testing with Cypress

**Cypress Test File:** `cypress-registration-verification.spec.ts`

**Setup:**
```bash
# Install Cypress (if not already)
npm install --save-dev cypress

# Copy test file
cp cypress-registration-verification.spec.ts cypress/e2e/

# Open Cypress Test Runner
npx cypress open
```

**Test Execution:**

**Interactive Mode (Development):**
```bash
npx cypress open --spec "cypress/e2e/registration-verification.spec.ts"
# Click "Run all specs" to execute tests
```

**Headless Mode (CI/CD):**
```bash
npx cypress run \
  --spec "cypress/e2e/registration-verification.spec.ts" \
  --headless \
  --browser chrome \
  --reporter spec \
  --reporter-options output=cypress-results.json
```

**Test Groups:**
1. Registration Form Validation (10 tests)
2. Email Verification Flow (8 tests)
3. API Integration (3 tests)
4. Accessibility (3 tests)

**Time Estimate:** 30-45 minutes

---

### Phase 5: Accessibility Audit

**Tool:** axe-core Chrome DevTools Extension

**Procedure:**
1. Open http://localhost:3000/register in Chrome
2. Press F12 to open DevTools
3. Click on "Accessibility" tab (axe DevTools)
4. Click "Scan ALL of my page"
5. Review results:
   - Violations (must fix)
   - Warnings (review)
   - Passes (good)

**Acceptance Criteria:**
- 0 Critical violations
- 0 Serious violations
- Can have warnings (documented)

**Standards Checked:**
- WCAG 2.1 Level AA
- Color contrast
- Keyboard navigation
- Screen reader compatibility
- Form labels and ARIA attributes

**Time Estimate:** 20 minutes

---

### Phase 6: Security Testing

**Manual Security Checks:**

1. **Input Validation:**
   - TC-020: Try SQL injection in email field
   - TC-020: Try XSS in password field
   - Verify: Input properly sanitized

2. **Password Security:**
   - Verify bcrypt hashing (never plain text in logs)
   - Verify no password echo in browser DevTools
   - Verify password not in error messages

3. **Token Security:**
   - TC-012: Verify token is 64 random hex chars
   - Verify token not exposed in URL history
   - Verify token expires after 24 hours
   - Verify used tokens cannot be reused

4. **Rate Limiting:**
   - TC-018: Attempt 5+ registrations from same IP
   - Verify: 6th attempt blocked with 429 Too Many Requests
   - Verify: Reset after 1 hour window

**Time Estimate:** 30 minutes

---

## Test Data Management

### Test Data File: `QA-002_TEST_DATA.json`

**Contains:**
- Valid/invalid email formats (18 examples)
- Strong/weak passwords (17 examples)
- SQL injection payloads (7 examples)
- XSS attempt payloads (11 examples)
- Turkish character test cases
- Rate limiting thresholds
- Expected error messages
- HTTP status code mappings

### Database Test Data Setup

**Creating Test Users:**
```sql
-- Manually insert a pre-verified user for testing
INSERT INTO users (
  id, email, password_hash, email_verified, created_at, updated_at
) VALUES (
  'test-user-001',
  'existing@example.com',
  '$2b$10$...bcrypt_hash...',
  true,
  NOW(),
  NOW()
);

-- Create unverified user for resend testing
INSERT INTO users (
  id, email, password_hash, email_verified, created_at, updated_at
) VALUES (
  'test-user-002',
  'unverified@example.com',
  '$2b$10$...bcrypt_hash...',
  false,
  NOW(),
  NOW()
);
```

---

## Bug Tracking & Reporting Process

### Bug Report Template

```markdown
## BUG-QA-002-XXX: [Title]

**Severity:** Critical / High / Medium / Low
- Critical: System crash, data loss, security issue, complete feature failure
- High: Major feature broken, no workaround, blocks workflow
- Medium: Feature partially works, workaround exists
- Low: Cosmetic, minor impact on functionality

**Priority:** High / Medium / Low
**Found in:** [Test Case TC-XXX]
**Environment:** Development

### Description
[Brief explanation of what's wrong]

### Steps to Reproduce
1. [Exact action]
2. [Next action]
3. [Observe issue]

### Expected
- [What should happen]

### Actual
- [What actually happens]

### Impact
- User impact: [How this affects users]
- Business impact: [Business consequence]

### Suggested Fix
[Technical suggestion if obvious]

### Attachments
- Screenshot: [filename]
- Logs: [attachment]
- Video: [recording if helpful]
```

### Bug Resolution Flow

```
BUG REPORTED (QA)
    ↓
REPRODUCED & TRIAGED (QA)
    ↓
ASSIGNED TO BACKEND/FRONTEND AGENT
    ↓
DEVELOPER FIXES ISSUE
    ↓
QA RE-TESTS FIX
    ↓
VERIFIED & CLOSED
```

### Severity-Based SLA

| Severity | Response | Fix | Re-test |
|----------|----------|-----|---------|
| Critical | 1 hour | 4 hours | 2 hours |
| High | 4 hours | 1 day | 4 hours |
| Medium | 1 day | 2 days | 1 day |
| Low | 2 days | 3 days | 2 days |

---

## Sign-Off Criteria (Definition of Done)

**QA-002 Task is COMPLETE when:**

✅ **Test Execution:**
- [ ] All 25 manual test cases executed
- [ ] All 8 Postman API tests passing
- [ ] All 18 Cypress E2E tests passing
- [ ] All 3 accessibility tests completed

✅ **Test Results:**
- [ ] No Critical severity bugs
- [ ] No High severity bugs (or all have fixes scheduled)
- [ ] All test cases documented (Pass/Fail/Screenshots)
- [ ] Test coverage ≥ 80% of acceptance criteria

✅ **Quality Standards:**
- [ ] All error messages in Turkish
- [ ] API responses match OpenAPI specification
- [ ] No console errors in browser DevTools
- [ ] Accessibility: 0 WCAG violations

✅ **Documentation:**
- [ ] Test execution report generated
- [ ] Test summary statistics provided
- [ ] All bugs documented and tracked
- [ ] Handoff notes to Backend/Frontend agents

✅ **Sign-Off Decision:**
- [ ] **APPROVED:** All tests pass, ready for release
- [ ] **BLOCKED:** Bugs found, await fixes, re-test scheduled

---

## Test Results Dashboard

**Metrics to Track:**

```
Test Summary
├── Manual Tests: __ / 25 Passed
├── Postman Tests: __ / 8 Passed
├── Cypress Tests: __ / 18 Passed
├── Accessibility: __ / 3 Passed
└── Total: __ / 54 Passed

Bugs Found
├── Critical: 0
├── High: 0
├── Medium: 0
├── Low: 0
└── Total: 0

Coverage Analysis
├── Story 1.1 AC: __% covered
├── Story 1.2 AC: __% covered
└── Overall: __% covered
```

---

## Risk Assessment & Mitigation

### High-Risk Areas

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Email delivery delay | Tests block on email | Use MailHog, set short timeouts |
| Database state pollution | Tests interfere | Use unique emails per test |
| Token expiration timing | Tests flaky | Mock time or use fresh tokens |
| Race conditions | Intermittent failures | Use proper wait/retry logic |
| reCAPTCHA unavailability | Registration blocked | Mock reCAPTCHA in dev |

### Mitigation Strategies

1. **Email Delivery:**
   - Use MailHog (captures all email)
   - Poll MailHog API instead of UI
   - Set 120-second timeout for email arrival

2. **Database Isolation:**
   - Use unique email addresses: `testuser{timestamp}@example.com`
   - Clean up test data after each test
   - Use transactions for rollback

3. **Token Testing:**
   - Generate fresh tokens for each test
   - Mock time for expiration tests
   - Use valid format: 64 hex characters

4. **Rate Limiting:**
   - Use different IPs (or mock IP header)
   - Reset rate limit counters between tests
   - Test with small time windows

5. **reCAPTCHA:**
   - Mock in development
   - Use high score (0.8+) for happy path
   - Test low score (0.3) for rejection

---

## Performance Baselines

**Expected Response Times:**

| Operation | Target | Threshold |
|-----------|--------|-----------|
| Registration submission | <2 sec | <5 sec |
| Email verification | <3 sec | <5 sec |
| Resend verification | <2 sec | <5 sec |
| Form validation | <100 ms | <500 ms |
| MailHog email delivery | <60 sec | <120 sec |

**Monitoring Metrics:**
- P50 (median) response time
- P95 (95th percentile) response time
- P99 (99th percentile) response time
- Error rate < 0.5%

---

## Regression Testing

**After Each Bug Fix:**

1. **Re-test the fixed issue** (original failing test)
2. **Re-run affected test group:**
   - If registration bug: re-run TC-001 to TC-010
   - If email verification bug: re-run TC-011 to TC-018
   - If API bug: re-run Postman collection
3. **Smoke test all features:**
   - Happy path registration (TC-001)
   - Email verification (TC-013)
   - API endpoints (all Postman tests)

**Regression Test Time:** ~30 minutes per bug

---

## Test Report Template

```markdown
# QA-002 Test Execution Report

**Date:** 2025-11-19
**Tested By:** QA Agent
**Status:** ✅ PASSED / ❌ FAILED

## Test Summary

### Manual Tests (25 scenarios)
- Passed: __ ✅
- Failed: __ ❌
- Blocked: __
- Pass Rate: __%

### API Tests (8 scenarios)
- Passed: __ ✅
- Failed: __ ❌
- Pass Rate: __%

### E2E Tests (18 scenarios)
- Passed: __ ✅
- Failed: __ ❌
- Pass Rate: __%

### Accessibility Tests
- Violations: __
- Warnings: __
- Pass Rate: __%

## Coverage Analysis

- Story 1.1 Acceptance Criteria: __% covered
- Story 1.2 Acceptance Criteria: __% covered
- Overall Coverage: __%

## Bugs Found

[Detailed list with severity levels]

## Sign-Off Decision

✅ **APPROVED FOR RELEASE**
- All tests passed
- No blocking bugs
- Meets acceptance criteria

OR

❌ **BLOCKED - Awaiting Fixes**
- BUG-QA-002-001: [Issue] (High)
- BUG-QA-002-002: [Issue] (Medium)
- Re-test scheduled after fixes

## Execution Time

- Planning: ___ minutes
- Manual Testing: ___ minutes
- API Testing: ___ minutes
- E2E Testing: ___ minutes
- Accessibility: ___ minutes
- **Total: ___ hours**
```

---

## Handoff to Other Agents

### If Bugs Found

**👉 Backend Agent:**
```
[List of API/logic bugs]
- BUG-QA-002-XXX: [Issue]
- Fix Priority: Critical/High/Medium
- Reproduction Steps: [From bug report]
```

**👉 Frontend Agent:**
```
[List of UI/validation bugs]
- BUG-QA-002-XXX: [Issue]
- Expected UI behavior: [From test case]
```

**👉 Tech Lead:**
```
Summary: X tests passed, Y tests failed
Coverage: __% of acceptance criteria
Blockers: [Critical bugs if any]
Status: Ready for release / Awaiting fixes
```

---

## Success Criteria

**QA-002 is SUCCESSFUL if:**

1. ✅ 25+ test cases executed and documented
2. ✅ ≥ 80% acceptance criteria coverage
3. ✅ 0 Critical/High bugs remaining
4. ✅ All error messages in Turkish
5. ✅ API responses match OpenAPI spec
6. ✅ Accessibility: 0 WCAG violations
7. ✅ Test artifacts created and versioned
8. ✅ Sign-off decision made

**Test Artifacts Delivered:**
- QA-002_USER_REGISTRATION_TEST_EXECUTION_PLAN.md (25 test cases)
- auth-registration-verification.postman_collection.json (8 API tests)
- cypress-registration-verification.spec.ts (18 E2E tests)
- QA-002_TEST_DATA.json (comprehensive test data)
- QA-002_TESTING_STRATEGY.md (this document)
- QA-002_FINAL_REPORT.md (results after execution)

---

## Timeline & Estimates

| Phase | Task | Estimated Time | Actual Time |
|-------|------|-----------------|------------|
| 1 | Environment Setup | 30 min | __ |
| 2 | Manual UI Testing | 2-3 hours | __ |
| 3 | API Testing | 15 min | __ |
| 4 | E2E Testing | 45 min | __ |
| 5 | Accessibility | 20 min | __ |
| 6 | Bug Analysis | 30 min | __ |
| 7 | Report Generation | 30 min | __ |
| | **TOTAL** | **4-5 hours** | __ |

---

## Appendix: Quick Reference Commands

```bash
# Start Docker environment
docker-compose up -d postgres redis rabbitmq auth-service mailhog

# Check service health
curl -f http://localhost:3001/health
curl -f http://localhost:3000
curl -f http://localhost:8025

# View logs
docker-compose logs -f auth-service
docker-compose logs -f mailhog

# Access PostgreSQL
psql -h localhost -U postgres -d exchange_dev

# Run Postman tests
newman run auth-registration-verification.postman_collection.json \
  --environment env-dev.postman_environment.json \
  --reporters cli,json

# Run Cypress tests
npx cypress run --spec "cypress/e2e/registration-verification.spec.ts"

# Clean up test data
docker-compose exec postgres psql -U postgres -d exchange_dev \
  -c "TRUNCATE users RESTART IDENTITY;"
```

---

**Document Owner:** Senior QA Engineer
**Last Updated:** 2025-11-19
**Version:** 1.0

