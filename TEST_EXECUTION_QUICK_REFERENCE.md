# Test Execution Quick Reference - Story 1.1 User Registration

**Quick Setup & Execution Guide**

---

## Files Location Summary

```
/Users/musti/Documents/Projects/MyCrypto_Platform/
├── test-plans/sprint-1/
│   └── user-registration-test-plan.md          [Main test plan - 56 test cases]
├── test-data/
│   └── registration-test-data.json             [Test data sets - 100+ data points]
├── postman/collections/
│   └── auth-service.json                       [API tests - 17 tests]
├── cypress/e2e/auth/
│   └── registration.spec.ts                    [E2E tests - 35+ scenarios]
└── QA_COMPLETION_REPORT_QA-001-PREP.md        [This summary]
```

---

## Test Execution Checklist

### Phase 1: Environment Setup (30 mins)

- [ ] Clone/pull latest code from all repositories
- [ ] Frontend: `npm install` in web project
- [ ] Backend: `npm install` in auth-service
- [ ] Start Docker services: `docker-compose up`
- [ ] Verify frontend loads: `http://localhost:3001/register`
- [ ] Verify backend API: `http://localhost:3000/health`
- [ ] Verify Mailhog: `http://localhost:8025`
- [ ] Verify database: PostgreSQL 16 running locally

### Phase 2: Manual UI Testing (2 hours)

**Test Scenarios:**
1. TC-001 to TC-010: Password validation
2. TC-011 to TC-015: Email validation
3. TC-016 to TC-017: Duplicate email
4. TC-021 to TC-025: Checkboxes
5. TC-031 to TC-035: Security (XSS, SQL)

**Execution Steps:**
1. Open test plan: `/test-plans/sprint-1/user-registration-test-plan.md`
2. For each test case:
   - Read "Steps" section carefully
   - Execute exactly as written
   - Verify "Expected Result"
   - Document actual result
   - Take screenshot if failed
   - Mark as Pass/Fail in spreadsheet

**Test Data Source:**
- Use values from: `/test-data/registration-test-data.json`
- Valid emails: `testCases.validEmails[]`
- Valid passwords: `testCases.validPasswords[]`
- Invalid emails: `testCases.invalidEmails[]`

### Phase 3: API Testing with Postman (1 hour)

**Setup:**
1. Open Postman
2. Import collection: `postman/collections/auth-service.json`
3. Set variable `base_url` = `http://localhost:3000`

**Execution:**
1. Open auth-service collection
2. Click "Run" button
3. Select all tests
4. Run with default environment
5. Review results:
   - Green = Passed
   - Red = Failed
6. Export results as HTML

**Individual Test Execution (if needed):**
1. Click on specific test request
2. Click "Send"
3. Review response in "Tests" tab
4. Verify all assertions pass

### Phase 4: E2E Testing with Cypress (1.5 hours)

**Setup:**
1. Install Cypress: `npm install cypress` (if not already installed)
2. Verify frontend running: `http://localhost:3001`

**Execution:**
1. Open Cypress: `npx cypress open`
2. Select "E2E Testing"
3. Select "Chrome" browser
4. Click on `registration.spec.ts`
5. Tests will run automatically
6. Review results in Cypress dashboard

**View Test Report:**
1. After tests complete, screenshot appears in Cypress
2. Click "View specs" to see test summary
3. Expand failed tests to see error details

**Headless Execution (CI/CD):**
```bash
npx cypress run --spec "cypress/e2e/auth/registration.spec.ts"
```

### Phase 5: Accessibility Testing (30 mins)

**Manual Checks:**
- [ ] Test keyboard navigation (Tab through form)
- [ ] Test screen reader (use VoiceOver/NVDA)
- [ ] Verify color contrast with axe DevTools
- [ ] Check label associations

**Automated Scan:**
1. Open registration page in browser
2. Install axe DevTools extension
3. Click axe DevTools icon
4. Click "Scan"
5. Review violations
6. Document issues

**Expected Result:**
- 0 Critical violations
- 0 Serious violations
- Max 3 Moderate issues (acceptable)

### Phase 6: Bug Reporting (30 mins)

**For Each Failed Test:**

1. **Identify Issue:**
   - Read Expected vs Actual result
   - Determine if it's a bug or test error

2. **Create Bug Report:**
   - File: Create issue in Jira/Linear
   - Title: Clear, one-line description
   - Severity: Use guidelines below
   - Steps to Reproduce: Copy from test case
   - Expected: From test plan
   - Actual: What you observed
   - Attach: Screenshot or video

3. **Severity Classification:**
   - **Critical:** System crash, data loss, registration fails completely
   - **High:** Feature partially broken, major validation issue
   - **Medium:** UI issue, minor validation, error message unclear
   - **Low:** Typo, spacing, non-critical styling

---

## Test Execution Timeline

| Phase | Duration | Owner | Deliverable |
|-------|----------|-------|-------------|
| Setup | 30 min | QA | Ready environment |
| Manual UI | 2 hrs | QA | Test results spreadsheet |
| Postman API | 1 hr | QA | HTML test report |
| Cypress E2E | 1.5 hrs | QA | Test execution report |
| Accessibility | 30 min | QA | axe scan report |
| Bug Review | 30 min | QA | Bug list with severity |
| **TOTAL** | **5.5 hrs** | | **Sign-off ready** |

---

## Key Test Cases by Priority

### Must Pass (P0 - Critical)

1. **TC-001:** Register with valid email & password
   - Acceptance: Registration succeeds, verification email sent

2. **TC-004-007:** Password validation
   - Acceptance: Invalid passwords rejected with specific errors

3. **TC-012:** Email validation
   - Acceptance: Invalid emails rejected

4. **TC-016:** Duplicate email prevention
   - Acceptance: Error "Bu email zaten kayıtlı" shown

5. **TC-021-023:** Checkbox requirements
   - Acceptance: Both checkboxes required to enable button

### Should Pass (P1 - High)

- TC-002: Medium strength password
- TC-015-017: Email verification flow
- TC-028-030: Password strength indicator
- TC-034-035: XSS prevention
- TC-047-053: Accessibility features
- TC-054: Performance (< 3 seconds)

---

## Common Issues & Troubleshooting

### Frontend Not Loading
```bash
# Solution:
cd /path/to/frontend
npm install
npm start
# Should be available at http://localhost:3001
```

### Backend API Not Responding
```bash
# Solution:
cd /path/to/auth-service
npm install
npm start
# Should respond at http://localhost:3000/health
```

### Mailhog Not Receiving Emails
```bash
# Solution:
# Check mailhog is running:
# Should be at http://localhost:8025
#
# If not running:
docker run -d -p 1025:1025 -p 8025:8025 mailhog/mailhog
```

### Cypress Tests Timing Out
```bash
# Solution: Increase timeout in cypress/e2e/auth/registration.spec.ts
cy.get('selector', { timeout: 10000 }).should('exist')
```

### Postman Tests Failing
```bash
# Solution:
1. Verify base_url is set correctly: http://localhost:3000
2. Check API is running
3. Review error response in Postman
4. Check test assertions are correct
```

---

## Expected Test Results Summary

### Manual UI Tests
- **Total:** 35 test cases
- **Expected Pass:** 32 (91%)
- **Known Issues:** 0-3 (will be documented)

### Postman API Tests
- **Total:** 17 test cases
- **Expected Pass:** 17 (100%)
- **Collections:** Can be exported as HTML

### Cypress E2E Tests
- **Total:** 35+ test scenarios
- **Expected Pass:** 30+ (85%+)
- **Report:** HTML with screenshots

### Performance Baseline
- Page Load: < 3 seconds
- API Response: < 500ms
- Email Delivery: < 60 seconds

---

## Sign-Off Criteria

Testing is complete when:

- [ ] All 56 test cases documented (pass or fail)
- [ ] All P0 (Critical) tests PASSED
- [ ] All P1 (High) tests PASSED (or documented as known issues)
- [ ] Bugs reported with complete details
- [ ] No critical/high security vulnerabilities
- [ ] Accessibility scan < 3 moderate issues
- [ ] Performance baselines established

---

## Report Generation

### Manual Test Results
```
Template: Test Case | Status | Notes
Example: TC-001 | PASS | Success message "Kayıt başarılı" shown
```

### API Test Results
```bash
# Export from Postman:
1. Click "Run"
2. After tests complete
3. Click "Export Results"
4. Save as HTML
5. Attach to report
```

### E2E Test Results
```bash
# Generate HTML report:
npx cypress run --reporter html --reporter-options reportDir=cypress/results
# Report saved to: cypress/results/index.html
```

---

## Contacts & Escalation

**For Test Environment Issues:**
- DevOps Team: [Contact info]

**For Backend API Issues:**
- Backend Team Lead: [Contact info]

**For Frontend Issues:**
- Frontend Team Lead: [Contact info]

**QA Lead:**
- [Name] - [Contact info]

---

## Additional Resources

- **Test Plan:** `/test-plans/sprint-1/user-registration-test-plan.md`
- **Test Data:** `/test-data/registration-test-data.json`
- **Postman Collection:** `/postman/collections/auth-service.json`
- **Cypress Tests:** `/cypress/e2e/auth/registration.spec.ts`
- **Completion Report:** `/QA_COMPLETION_REPORT_QA-001-PREP.md`
- **Engineering Guidelines:** `/Inputs/engineering-guidelines.md`
- **MVP Backlog:** `/Inputs/mvp-backlog-detailed.md`

---

**Good luck with testing! All preparation work is complete. Follow the phases above for smooth execution.**

*Document Created: 2025-11-19*
