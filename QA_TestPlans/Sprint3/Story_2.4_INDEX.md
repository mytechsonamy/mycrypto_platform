# Story 2.4 - Crypto Deposit Test Plan Index

**Feature:** Cryptocurrency Deposit (BTC/ETH/USDT)
**Story Points:** 13
**Sprint:** Sprint 3
**Version:** 1.0
**Created:** 2025-11-20

---

## Document Overview

This index serves as a quick reference guide to all test documentation for Story 2.4 (Crypto Deposit). Use this to navigate between documents, find specific test cases, and understand the overall test strategy.

**Total Documents:** 6 (this is document #6)
**Total Pages:** ~180 pages
**Total Test Cases:** 42
**Estimated Read Time:** 2 hours (all documents)

---

## Document Package Contents

### 1. Story_2.4_Crypto_Deposit_Test_Plan.md (38-49 KB)

**Purpose:** Comprehensive test plan with all detailed test cases

**Key Sections:**
- Executive Summary (test scope, metrics)
- 42 detailed test cases (TC-001 through TC-042)
- Test case structure: Preconditions, Steps, Expected Result
- Priority breakdown: P0 (20), P1 (16), P2 (6)
- Test environment requirements
- Risk assessment integration
- Sign-off checklist

**Use When:** You need the detailed procedure for a specific test case

**Quick Links Within:**
- Functional Tests (TC-001 to TC-029)
- Security Tests (TC-030 to TC-042)
- Test Execution Strategy (5 phases)
- Risk Mitigation Verification

**Time to Read:** 60-90 minutes

**File Size:** 38-49 KB

**Example Test Case:**
```
TC-004: Generate BTC Deposit Address
- Type: API
- Priority: P0 (Critical)
- Preconditions: User authenticated, KYC approved
- Steps: POST /api/v1/wallet/deposit/crypto/address with currency: BTC
- Expected: HTTP 201, valid BTC address, 3 confirmation requirement
```

---

### 2. Story_2.4_Postman_Collection.json (29-38 KB)

**Purpose:** Ready-to-import Postman collection for automated API testing

**Key Features:**
- 25+ automated API tests
- Pre-request scripts (authentication, setup)
- Test assertions (validations, expectations)
- Environment variables (BASE_URL, ACCESS_TOKEN, etc.)
- Newman CI/CD integration ready
- Request examples for all endpoints

**Use When:** Executing automated API tests via Postman or Newman

**Quick Start:**
1. Import file into Postman
2. Set environment variables (BASE_URL, TEST_USER_EMAIL, TEST_USER_PASSWORD)
3. Click "Run" to execute all tests
4. Review test results and assertions

**Test Folders:**
- Setup & Authentication (1 test)
- Address Generation Tests (4 tests)
- Blockchain Monitoring Tests (2 tests)
- Balance Update Tests (2 tests)
- Deposit History Tests (3 tests)
- Security Tests (6 tests)
- Rate Limiting Tests (1 test)

**Environment Variables:**
```json
BASE_URL: http://localhost:3000
TEST_USER_EMAIL: test.crypto@example.com
TEST_USER_PASSWORD: SecurePassword123!
ACCESS_TOKEN: (auto-populated after login)
BTC_ADDRESS: (auto-populated after TC-004)
ETH_ADDRESS: (auto-populated after TC-005)
```

**Time to Execute:** 3-5 minutes (automated)

**File Size:** 29-38 KB

**Newman Command:**
```bash
newman run Story_2.4_Crypto_Deposit_Postman_Collection.json \
  --environment environment.json \
  --reporters cli,json \
  --reporter-json-export results.json
```

---

### 3. Story_2.4_Test_Coverage_Matrix.md (14-19 KB)

**Purpose:** Acceptance criteria to test case traceability matrix

**Key Sections:**
- AC1-AC10 mapping to test cases
- Security requirements mapping
- 100% coverage verification
- Test case statistics (42 total)
- Priority distribution
- Risk coverage analysis
- Regression test suite definition

**Use When:** Verifying AC coverage or understanding test priorities

**Coverage Summary:**
| Category | Test Cases | Coverage |
|----------|-----------|----------|
| Functional | 29 | 100% |
| Security | 13 | 100% |
| Total | 42 | 100% |

**AC Mapping Example:**
```
AC1: User selects coin (BTC/ETH/USDT)
├── TC-001: Select BTC
├── TC-002: Select ETH
└── TC-003: Select USDT
```

**Key Metrics:**
- Total AC Coverage: 100% (10/10 ACs mapped)
- Total Test Cases: 42
- P0 (Critical): 20 (48%)
- P1 (High): 16 (38%)
- P2 (Medium): 6 (14%)

**Time to Review:** 20-30 minutes

**File Size:** 14-19 KB

---

### 4. Story_2.4_Risk_Assessment.md (25-30 KB)

**Purpose:** Comprehensive risk analysis with CVSS scoring

**Key Sections:**
- Executive Summary (overall risk: 7.8/10)
- 17 risks identified and analyzed
- CVSS 3.1 scoring methodology
- OWASP Top 10 (2021) mapping
- Critical Risks: RISK-001 to RISK-003 (CVSS ≥ 9.0)
- High Risks: RISK-004 to RISK-008 (CVSS 7.0-8.9)
- Medium/Low Risks: RISK-009 to RISK-017
- Mitigation strategies for each risk
- Test coverage verification

**Use When:** Understanding risk management or CVSS scoring

**Risk Summary:**
| Severity | Count | CVSS Range | Status |
|----------|-------|-----------|--------|
| Critical | 3 | 9.0-10.0 | Mitigated |
| High | 5 | 7.0-8.9 | Mitigated |
| Medium | 7 | 4.0-6.9 | Mitigated |
| Low | 2 | <4.0 | Accepted |

**Critical Risks:**
1. RISK-001: Address theft (CVSS 9.8)
2. RISK-002: Balance corruption (CVSS 9.5)
3. RISK-003: Network mismatch USDT (CVSS 9.2)

**Example Risk:**
```
RISK-001: Blockchain Address Theft
- CVSS Score: 9.8 (Critical)
- Vector: CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H
- Mitigation: HD Wallet, HTTPS, address validation
- Test Coverage: TC-037, TC-038, TC-039
- Residual Risk: 3.2 (Low after mitigation)
```

**OWASP Top 10 Coverage:**
- A01: Broken Access Control → RISK-005
- A02: Cryptographic Failures → RISK-001
- A03: Injection → RISK-004
- A04: Insecure Design → RISK-003, RISK-008
- A05: Security Misconfiguration → RISK-013
- A06: Vulnerable Components → RISK-006, RISK-007
- A07: Authentication Failures → RISK-035
- A08: Data Integrity → RISK-002
- A09: Logging & Monitoring → RISK-004
- Coverage: 9/10 (100%)

**Time to Review:** 45-60 minutes

**File Size:** 25-30 KB

---

### 5. Story_2.4_TEST_PLAN_SUMMARY.md (12-16 KB)

**Purpose:** Executive summary for stakeholders

**Key Sections:**
- Executive Summary (high-level overview)
- Quick Reference (document links)
- Test Execution Timeline (5 phases, 16-17 hours total)
- Test Environment Requirements
- Pass/Fail Criteria
- Risk Mitigation Verification
- Defect Tracking Process
- Success Criteria Checklist
- Role-Based Instructions (QA, Developers, Tech Lead)
- Communication & Escalation
- Test Metrics
- Appendices (test users, endpoints, networks)

**Use When:** Planning test execution or reporting status to stakeholders

**Timeline Overview:**
| Phase | Duration | Focus |
|-------|----------|-------|
| Setup | 0.5h | Authentication, environment |
| Functional | 6-7h | Core features, UI, integration |
| Security | 3-4h | Input validation, auth, headers |
| Bug Fix | 3-4h | Report and verify fixes |
| Regression | 1-2h | Final verification |
| **Total** | **16-17h** | **Complete coverage** |

**Pass/Fail Criteria:**
- Must Pass: All 42 tests, 100% AC coverage, all P0 tests passing
- Should Pass: 95% P1 tests, email within 5 minutes
- Nice to Have: Performance <1 second, multi-language support

**Sign-Off Checklist:**
- [ ] All 42 test cases executed
- [ ] Test results documented
- [ ] All critical bugs fixed
- [ ] 100% AC coverage verified
- [ ] Security tests passing
- [ ] No critical vulnerabilities
- [ ] Integration tests passing
- [ ] Coverage matrix verified

**Key Contacts:**
- Tech Lead: [Name]
- Engineering Manager: [Name]
- DevOps Lead: [Name]
- Security Lead: [Name]

**Time to Read:** 30-45 minutes

**File Size:** 12-16 KB

---

### 6. Story_2.4_INDEX.md (18-20 KB - THIS DOCUMENT)

**Purpose:** Navigation guide for entire test documentation package

**Contains:**
- Overview of all documents
- Quick reference table
- Test case categorization
- Navigation paths for different roles
- Suggested reading order
- Key metrics summary
- FAQ and troubleshooting

**Use When:** Finding specific information or understanding document structure

**Time to Read:** 15-20 minutes

**File Size:** 18-20 KB

---

## Quick Navigation Guide

### I'm a QA Engineer - Where Do I Start?

1. **First Read:** Story_2.4_TEST_PLAN_SUMMARY.md
   - Understand timeline and environment
   - Review pass/fail criteria
   - Set up your test environment

2. **Then Read:** Story_2.4_Crypto_Deposit_Test_Plan.md
   - Review all 42 test cases
   - Note preconditions and test data
   - Prepare for manual testing

3. **For Automation:** Story_2.4_Postman_Collection.json
   - Import into Postman
   - Configure environment variables
   - Execute API tests

4. **For Reference:** Story_2.4_Test_Coverage_Matrix.md
   - Verify AC coverage
   - Track which test cases completed
   - Document results

5. **For Context:** Story_2.4_Risk_Assessment.md
   - Understand what could go wrong
   - Why certain tests are critical
   - How risks are mitigated

---

### I'm a Developer - Where Do I Start?

1. **First Read:** Story_2.4_Risk_Assessment.md
   - Understand OWASP Top 10 risks
   - Review security requirements
   - Plan secure implementation

2. **Then Read:** Story_2.4_Crypto_Deposit_Test_Plan.md
   - Sections: Functional Tests (TC-001 to TC-029)
   - Sections: Security Tests (TC-030 to TC-042)
   - Understand acceptance criteria mapping

3. **For Testing:** Story_2.4_Postman_Collection.json
   - Understand expected API responses
   - Review test assertions
   - Ensure your implementation matches

4. **For Reference:** Story_2.4_Test_Coverage_Matrix.md
   - Verify your implementation covers all ACs
   - Check test case priorities

---

### I'm a Tech Lead - Where Do I Start?

1. **First Read:** Story_2.4_TEST_PLAN_SUMMARY.md
   - Timeline and metrics
   - Risk mitigation summary
   - Success criteria

2. **Executive Review:** Story_2.4_Risk_Assessment.md
   - Identify critical risks (RISK-001, RISK-002, RISK-003)
   - Review CVSS scores
   - Approve mitigation strategies

3. **Coverage Review:** Story_2.4_Test_Coverage_Matrix.md
   - Verify 100% AC coverage
   - Check priority distribution
   - Approve test plan

4. **Detail Review:** Story_2.4_Crypto_Deposit_Test_Plan.md
   - Skim all test cases
   - Review test execution strategy
   - Approve overall plan

5. **Automation Review:** Story_2.4_Postman_Collection.json
   - Verify API test coverage
   - Check test assertions
   - Approve automation approach

---

### I'm a Product Manager - Where Do I Start?

1. **Executive Summary:** Story_2.4_TEST_PLAN_SUMMARY.md
   - Timeline (16-17 hours)
   - Key metrics
   - Success criteria
   - Risk summary

2. **Coverage Review:** Story_2.4_Test_Coverage_Matrix.md
   - Verify all ACs tested
   - Check test statistics

3. **Risk Review:** Story_2.4_Risk_Assessment.md
   - Executive summary section
   - Critical risks overview
   - Mitigation strategies

---

## Test Case Reference by Category

### Functional Tests (TC-001 to TC-029)

#### Coin Selection (3 tests)
- TC-001: Select BTC
- TC-002: Select ETH
- TC-003: Select USDT

#### Address Generation (4 tests)
- TC-004: Generate BTC address
- TC-005: Generate ETH address
- TC-006: Unique address generation
- TC-007: Address persistence

#### QR Code & UI (2 tests)
- TC-008: QR code display
- TC-009: QR code mobile scanning

#### Copy Address (2 tests)
- TC-010: Copy confirmation tooltip
- TC-011: Copy toast notification

#### Confirmation Warning (2 tests)
- TC-012: Confirmation warning display
- TC-013: Confirmation details

#### Network Selection (3 tests)
- TC-014: USDT ERC-20 (default)
- TC-015: USDT TRC-20 (switch)
- TC-016: Network mismatch prevention

#### Blockchain Monitoring (3 tests)
- TC-017: 1 confirmation detection
- TC-018: Confirmation progress tracking
- TC-019: ETH 12 confirmation requirement

#### Balance Credit (4 tests)
- TC-020: Balance credited after 3 BTC confirmations
- TC-021: Atomic transaction verification
- TC-022: Multiple deposits accumulate
- TC-023: Delayed credit on congestion

#### Notifications (3 tests)
- TC-024: Email on detection
- TC-025: Email on credit
- TC-026: WebSocket real-time notification

#### Deposit History (3 tests)
- TC-027: History shows all deposits with txid
- TC-028: API returns txid format
- TC-029: CSV export

### Security Tests (TC-030 to TC-042)

#### Input Validation (3 tests)
- TC-030: Invalid currency rejected
- TC-031: SQL injection prevention
- TC-032: XSS attack prevention

#### Rate Limiting (1 test)
- TC-033: Rate limiting enforced

#### Authentication & Authorization (3 tests)
- TC-034: Unauthorized access denied
- TC-035: Non-KYC user blocked
- TC-036: User data isolation

#### Address Validation (3 tests)
- TC-037: BTC address format
- TC-038: ETH address format
- TC-039: Address randomness/unpredictability

#### HTTP Security (3 tests)
- TC-040: CORS headers
- TC-041: Security headers (HSTS, CSP, etc.)
- TC-042: Webhook signature verification

---

## Test Metrics Summary

### Coverage Metrics
| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| AC Coverage | 10/10 (100%) | 100% | ✅ |
| Test Cases | 42 | 35+ | ✅ Exceeded |
| Security Tests | 13 | 25%+ | ✅ Met |
| Risk Mitigation | 17/17 (100%) | 100% | ✅ |

### Priority Distribution
| Priority | Count | Percentage | Target |
|----------|-------|-----------|--------|
| P0 (Critical) | 20 | 48% | 40%+ |
| P1 (High) | 16 | 38% | 30%+ |
| P2 (Medium) | 6 | 14% | - |

### Risk Assessment
| Severity | Count | CVSS Range | Status |
|----------|-------|-----------|--------|
| Critical | 3 | 9.0-10.0 | Mitigated |
| High | 5 | 7.0-8.9 | Mitigated |
| Medium | 7 | 4.0-6.9 | Mitigated |
| Low | 2 | <4.0 | Accepted |
| **Overall** | **17** | **7.8/10** | **High Risk** |

### OWASP Top 10 Coverage
| OWASP Risk | Risk ID | Coverage |
|-----------|---------|----------|
| A01: Broken Access Control | RISK-005 | ✅ |
| A02: Cryptographic Failures | RISK-001 | ✅ |
| A03: Injection | RISK-004 | ✅ |
| A04: Insecure Design | RISK-003, RISK-008 | ✅ |
| A05: Security Misconfiguration | RISK-013 | ✅ |
| A06: Vulnerable Components | RISK-006, RISK-007 | ✅ |
| A07: Authentication Failures | RISK-035 | ✅ |
| A08: Data Integrity | RISK-002 | ✅ |
| A09: Logging & Monitoring | RISK-004 | ✅ |
| A10: SSRF | N/A | N/A |
| **Coverage** | **9/10** | **✅ 90%** |

---

## Frequently Asked Questions

### Q: Where do I find test case details?
**A:** Story_2.4_Crypto_Deposit_Test_Plan.md contains all 42 test cases with detailed steps, preconditions, and expected results.

### Q: How long will testing take?
**A:** Total estimated time is 16-17 hours (manual testing 13-14 hours + API automation 3 hours). See Timeline section in TEST_PLAN_SUMMARY.md.

### Q: Where are the automated tests?
**A:** Story_2.4_Postman_Collection.json contains 25+ automated API tests. Import into Postman and run.

### Q: What are the critical risks?
**A:** RISK-001 (Address theft, CVSS 9.8), RISK-002 (Balance corruption, CVSS 9.5), RISK-003 (Network mismatch, CVSS 9.2). Details in Risk_Assessment.md.

### Q: How do I verify acceptance criteria coverage?
**A:** See Test_Coverage_Matrix.md for complete AC-to-test-case mapping with 100% coverage proof.

### Q: What if a test fails?
**A:** Create bug report per template in TEST_PLAN_SUMMARY.md. Include severity, reproduction steps, and expected vs actual results.

### Q: When can I sign off on testing?
**A:** Only after: (1) All 42 tests executed, (2) All critical/high bugs fixed, (3) 100% AC coverage verified. See Success Criteria Checklist in TEST_PLAN_SUMMARY.md.

### Q: What's the test execution order?
**A:** Phase 1 (Setup), Phase 2 (Functional), Phase 3 (Security), Phase 4 (Bug Fixes), Phase 5 (Regression). See Timeline in TEST_PLAN_SUMMARY.md.

### Q: How are API tests automated?
**A:** Use Postman Collection with pre-request scripts for auth and test assertions for validation. Run via Postman UI or Newman CLI.

### Q: What test data do I need?
**A:** Test user account with KYC Level 1 approved, BlockCypher API access, email service configured. See Environment Requirements in TEST_PLAN_SUMMARY.md.

---

## Document Statistics

| Document | Size | Pages | Read Time | Purpose |
|----------|------|-------|-----------|---------|
| Test_Plan.md | 38-49 KB | 45-55 | 60-90 min | All 42 test cases |
| Postman_Collection.json | 29-38 KB | N/A | 3-5 min (run) | API automation |
| Coverage_Matrix.md | 14-19 KB | 18-22 | 20-30 min | AC traceability |
| Risk_Assessment.md | 25-30 KB | 35-40 | 45-60 min | Risk analysis |
| TEST_PLAN_SUMMARY.md | 12-16 KB | 15-20 | 30-45 min | Executive summary |
| INDEX.md (this) | 18-20 KB | 22-25 | 15-20 min | Navigation guide |
| **TOTAL** | **~165 KB** | **~175** | **~3 hours** | **Complete package** |

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-20 | QA Engineer | Initial creation |
| - | - | - | - |

---

## Approval Sign-Off

This document package is approved for use in Story 2.4 testing:

- QA Lead: _______________________ Date: _______
- Tech Lead: ______________________ Date: _______
- Product Manager: ________________ Date: _______

---

## Document Navigation

**← [Previous Document]** Story_2.4_TEST_PLAN_SUMMARY.md

**Main Index:** This is the final document. Use the table of contents above to navigate.

---

**Document Owner:** QA Engineer
**Created:** 2025-11-20
**Version:** 1.0
**Last Updated:** 2025-11-20
**Review Cycle:** Per Sprint 3 completion

---

**End of Story 2.4 Index**

For questions or clarifications, contact the QA Engineer or Tech Lead.
