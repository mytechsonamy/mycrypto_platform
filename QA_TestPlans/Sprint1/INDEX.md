# QA Test Plans Index
## Story 1.2 - User Login with JWT

**Location:** `/Users/musti/Documents/Projects/MyCrypto_Platform/QA_TestPlans/`

## Documents

### 1. Main Test Plan (49 KB)
**File:** `Story_1.2_User_Login_Test_Plan.md`

Complete test case reference with 43 detailed test cases:
- Functional tests (TC-001 to TC-023)
- Security tests (TC-024 to TC-037)
- Edge cases & integration (TC-038 to TC-043)
- Test data setup
- Performance baselines

**Use:** Primary reference for QA execution

---

### 2. Postman API Collection (34 KB)
**File:** `Story_1.2_Postman_Collection.json`

Ready-to-import automated API tests (25+ test cases):
- Authentication tests
- Token management
- Account lockout
- Rate limiting
- Security validation
- Edge cases

**Use:** Newman CI/CD integration, automated testing

Import command:
```bash
newman run Story_1.2_Postman_Collection.json --environment staging.json
```

---

### 3. Test Coverage Matrix (19 KB)
**File:** `Story_1.2_Test_Coverage_Matrix.md`

Acceptance criteria to test case mapping:
- 8 acceptance criteria (100% covered)
- Test case traceability
- Coverage statistics
- Risk assessment by AC
- Type/priority breakdown

**Use:** Requirements verification, audit trail

---

### 4. Risk Assessment (30 KB)
**File:** `Story_1.2_Risk_Assessment.md`

Security and functionality risk analysis:
- 12 critical/high/medium risks
- Mitigation strategies
- Test coverage per risk
- Risk vs. test matrix
- Phase-based priorities

**Use:** Risk management, security review

---

### 5. Executive Summary (15 KB)
**File:** `Story_1.2_TEST_PLAN_SUMMARY.md`

High-level overview for stakeholders:
- Test breakdown
- 3-day execution timeline
- Success metrics & KPIs
- Sign-off requirements
- Defect resolution process

**Use:** Stakeholder communication, timeline planning

---

### 6. Quick Reference (README)
**File:** `README_Story_1.2.md`

Package overview and quick start guide:
- Document descriptions
- Quick start for different roles
- Execution setup
- File locations
- Usage examples

**Use:** Getting started, package overview

---

## Quick Navigation

### For QA Engineers
1. Read: Story_1.2_User_Login_Test_Plan.md
2. Import: Story_1.2_Postman_Collection.json
3. Reference: Story_1.2_Test_Coverage_Matrix.md
4. Track: Document results in coverage matrix

### For Tech Leads
1. Review: Story_1.2_TEST_PLAN_SUMMARY.md
2. Assess: Story_1.2_Risk_Assessment.md
3. Verify: Story_1.2_Test_Coverage_Matrix.md
4. Approve: Sign-off requirements

### For Developers
1. Study: Acceptance criteria in main plan
2. Review: Security tests section
3. Understand: Risk assessment
4. Implement: Mitigation strategies

### For Product Managers
1. Check: Story_1.2_TEST_PLAN_SUMMARY.md
2. Monitor: Test execution progress
3. Review: Sign-off criteria
4. Approve: Release decision

---

## Test Case Summary

**Total Tests:** 43

| Category | Count | Priority Distribution |
|----------|-------|----------------------|
| Functional | 23 | P0: 12, P1: 8, P2: 3 |
| Security | 14 | P0: 8, P1: 4, P2: 2 |
| Edge Cases | 6 | P0: 2, P1: 2, P2: 2 |
| **Total** | **43** | **P0: 22, P1: 14, P2: 7** |

---

## Acceptance Criteria Coverage

All 8 acceptance criteria covered:
- AC1: Login with verified email - 3 tests
- AC2: Access token (15 min) - 3 tests
- AC3: Refresh token (30 days) - 4 tests
- AC4: Error messages (no enumeration) - 3 tests
- AC5: Account lockout - 4 tests
- AC6: Lockout email - 2 tests
- AC7: Session logging - 3 tests
- AC8: Dashboard redirect - 2 tests

**Coverage: 100%**

---

## Risk Coverage

All 12 critical/high/medium risks covered:
1. Token expiration
2. Account lockout bypass
3. SQL injection
4. XSS vulnerability
5. Session hijacking
6. Rate limiting bypass
7. Unverified email login
8. Sensitive data exposure
9. Lockout email failure
10. Session not logged
11. Dashboard redirect issue
12. User enumeration

**Coverage: 100%**

---

## Execution Timeline

**Phase 1 (Day 1): Functional Tests - 2 hours**
- Login success, token validation, account lockout
- Exit: Basic functionality verified

**Phase 2 (Day 2): Security Tests - 2 hours**
- SQL injection, XSS, rate limiting, session security
- Exit: No security vulnerabilities

**Phase 3 (Day 3): Edge Cases & Integration - 2 hours**
- Email notifications, session logging, concurrent sessions
- Exit: Full coverage achieved

**Total: 6 hours manual + 2 hours automation = 8 hours**

---

## Sign-Off Criteria

- [ ] 100% of tests executed
- [ ] 100% P0 tests passed
- [ ] 95%+ coverage achieved
- [ ] 0 critical security issues
- [ ] Performance baselines met
- [ ] All documentation complete

---

## File Sizes & Locations

```
/Users/musti/Documents/Projects/MyCrypto_Platform/QA_TestPlans/

Story_1.2_User_Login_Test_Plan.md       49 KB
Story_1.2_Postman_Collection.json       34 KB
Story_1.2_Risk_Assessment.md            30 KB
Story_1.2_Test_Coverage_Matrix.md       19 KB
Story_1.2_TEST_PLAN_SUMMARY.md          15 KB
README_Story_1.2.md                     (guide)
INDEX.md                                (this file)

Total Package Size: 147 KB
```

---

## Next Steps

1. Review and approve test plan
2. Prepare test environment
3. Load test data
4. Execute tests (Phase 1-3)
5. Document results
6. Sign-off and release

---

**Package Status:** COMPLETE & READY FOR EXECUTION

For questions, refer to the specific document or contact QA Lead.
