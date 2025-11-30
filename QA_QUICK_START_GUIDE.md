# QA Testing Quick Start Guide
## MyCrypto Platform MVP - Test Execution Instructions

**Status:** Ready to Execute
**Created:** 2025-11-30
**Duration:** 5 Days
**Target Launch:** 2025-12-02 (contingent on QA)

---

## In 30 Seconds...

This platform has 23 user stories across 3 major features (Authentication, Wallet, Trading). Phase 1 planning is complete. Phase 2 is now executing tests. **Start with Day 1: EPIC 1 (User Authentication)** using the comprehensive test plan.

---

## What to Do RIGHT NOW

### Step 1: Environment Verification (5 minutes)
```bash
# Verify services running
curl http://localhost:3001/health        # Backend API
curl http://localhost:3003               # Frontend
redis-cli ping                           # Redis
psql -c "SELECT 1"                       # PostgreSQL
curl http://localhost:1025/api/messages  # Mailhog
```

### Step 2: Open Test Documents (5 minutes)
1. **Main Test Plan:** Open `QA_COMPREHENSIVE_TEST_PLAN.md`
2. **Quick Reference:** Open `QA_TESTING_STATUS_AND_CHECKLIST.md`
3. **Tracking:** Open `QA_TEST_EXECUTION_REPORT.md`

### Step 3: Start Day 1 Testing (Immediate)
- Read EPIC 1 test cases from the test plan
- Open Chrome DevTools
- Start testing Story 1.1 (User Registration)
- Follow test cases step-by-step

---

## Test Execution Flow

```
Day 1: EPIC 1 Authentication (4-6 hours)
  ├─ Story 1.1: User Registration
  ├─ Story 1.2: User Login
  ├─ Story 1.3: 2FA Setup
  ├─ Story 1.4: Password Reset
  ├─ Story 1.5: KYC Submission
  └─ Story 1.6: KYC Status Check

Day 2: EPIC 2 Wallet (4-6 hours)
  ├─ Story 2.1: View Balances
  ├─ Story 2.2: TRY Deposit
  ├─ Story 2.3: TRY Withdrawal
  ├─ Story 2.4: Crypto Deposit
  ├─ Story 2.5: Crypto Withdrawal
  └─ Story 2.6: Transaction History

Day 3: EPIC 3 Part 1 + Cross-Browser (4-6 hours)
  ├─ Story 3.1-3.5: Trading Features
  └─ Test on Chrome, Firefox, Safari, Edge

Day 4: EPIC 3 Part 2 + Mobile + Accessibility (4-6 hours)
  ├─ Story 3.6-3.11: Trading Management
  ├─ Test iOS Safari, Android Chrome
  └─ Run WCAG 2.1 AA audit

Day 5: Performance + Security + Sign-Off (4-6 hours)
  ├─ Performance testing
  ├─ Security validation
  ├─ Regression testing (bug fixes)
  └─ Final QA sign-off
```

---

## Key Documents & Their Purpose

| Document | Purpose | When to Use |
|----------|---------|------------|
| **QA_COMPREHENSIVE_TEST_PLAN.md** | Detailed test cases for all stories | During testing - reference for each test |
| **QA_TEST_EXECUTION_REPORT.md** | Track test results | Daily - log pass/fail for each test |
| **QA_TESTING_STATUS_AND_CHECKLIST.md** | Day-by-day execution guide | Daily - follow checklist items |
| **QA_PHASE_1_COMPLETION_SUMMARY.md** | Phase 1 overview & status | Reference - understand what's done |
| **QA_QUICK_START_GUIDE.md** | This guide - quick reference | Now - get started quickly |

---

## How to Execute Each Test

### For Every Test Case:

1. **SETUP (2-3 min)**
   - Check preconditions are met
   - Clear browser cache/cookies
   - Open the right URL/tool
   - Have test data ready

2. **EXECUTE (5-10 min)**
   - Follow steps exactly as written
   - Note what you see
   - Take screenshot if issue found
   - Don't skip any steps

3. **VERIFY (2-3 min)**
   - Compare actual vs expected
   - Check error messages (should be Turkish)
   - Verify data saved correctly
   - Check for UI errors

4. **DOCUMENT (2-3 min)**
   - Mark PASS or FAIL
   - Note any issues
   - Attach screenshots
   - Update coverage %

5. **REPORT (if bug found)**
   - Create bug report using template
   - Include reproduction steps
   - Assign severity
   - Send to developer

**Total per test:** 12-20 minutes

---

## Test Case Example

From QA_COMPREHENSIVE_TEST_PLAN.md - Story 1.1:

**Test Case: TC-1.1.1 - Valid Registration**

```
PRECONDITIONS:
- Fresh user email (not registered)
- Valid password (8+ chars, uppercase, number, special)

STEPS:
1. Navigate to /register
2. Enter email: test.user.001@example.com
3. Enter password: SecurePass123!
4. Confirm: SecurePass123!
5. Check "Terms" checkbox
6. Check "KVKK" checkbox
7. Click "Kayit Ol" button
8. Verify email received
9. Click verification link

EXPECTED RESULT:
- Success message: "Kayit basarili"
- Redirect to /verify-email
- Email received within 60 seconds
- User can login after verification

ACTUAL RESULT:
[You fill this in when testing]

STATUS: PASS / FAIL / BLOCKED
```

---

## Common Testing Scenarios

### Scenario A: Test Passes
```
What I expected: ✅ Happened
What I saw: ✅ Exactly what expected
Result: ✅ PASS
Action: Mark as PASS, move to next test
Time: 12-15 minutes per test
```

### Scenario B: Test Fails
```
What I expected: ✅ Form accepts valid email
What I saw: ❌ Error message shown
Expected: Email format is valid
Actual: "Invalid email" error shown
Result: ❌ FAIL
Action: 1. Take screenshot
        2. Create bug report
        3. Mark test as FAILED
        4. Note bug ID
Time: 15-20 minutes per test
```

### Scenario C: Test Blocked
```
What I expected: ✅ API response
What I see: ❌ Service unavailable
Reason: Backend database not running
Result: ⬜ BLOCKED
Action: 1. Fix environment issue
        2. Resume testing
        3. Mark as BLOCKED (not FAILED)
Time: Until unblocked
```

---

## Bug Report Quick Reference

When you find a bug:

```
BUG-XXX: [Clear title]

Severity: Critical / High / Medium / Low
Found In: Story X.X
Test Case: TC-X.X.X

Steps to Reproduce:
1. Step 1
2. Step 2
3. Observe the issue

Expected: [What should happen]
Actual: [What happens instead]

Screenshot: [Attach here]
```

**Severity Guide:**
- **Critical:** App crash, can't login, can't trade, security issue
- **High:** Major feature broken, no workaround
- **Medium:** Feature works but with issues, workaround exists
- **Low:** Typo, cosmetic, doesn't affect function

---

## Daily Status Report Template

Create at end of each day:

```
DAY X: [Date] - [EPIC X Story]
═══════════════════════════════════

Tests Executed: X
- Passed: X ✅
- Failed: X ❌
- Blocked: X ⬜

Bugs Found: X
- Critical: X
- High: X
- Medium: X
- Low: X

Coverage: X% of AC

Blockers: [Any?]

Tomorrow: [What's next?]

Time Spent: X hours
```

---

## Tools Cheat Sheet

### Browser Testing
```
Chrome DevTools:
- F12 or Ctrl+Shift+I
- Use Console, Network, Application tabs
- Check for errors
- Monitor WebSocket messages

Firefox DevTools:
- F12 or Ctrl+Shift+I
- Similar to Chrome

Accessibility:
- Install axe DevTools (Chrome/Firefox)
- Run scan on each page
- Check for violations

Performance:
- Chrome DevTools → Lighthouse
- Check load times
- Check opportunities to optimize
```

### API Testing
```
Postman:
- Import collection
- Set environment variables
- Run tests for each endpoint
- Check response status codes
- Verify response format

Curl (quick test):
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"pass"}'

Browser Console:
const res = await fetch('/api/v1/auth/login', {
  method: 'POST',
  body: JSON.stringify({email, password}),
  headers: {'Content-Type': 'application/json'}
});
console.log(await res.json());
```

### Email Testing
```
Mailhog (local email testing):
UI: http://localhost:1025
API: http://localhost:1025/api/messages

Check emails:
curl http://localhost:1025/api/messages

Verify verification link in email:
1. Go to Mailhog UI
2. Find email from auth-service
3. Copy verification link
4. Paste in browser
5. Verify email marked as confirmed
```

---

## Coverage Tracking

**Target:** ≥80% of acceptance criteria tested

**How to track:**
```
Story 1.1: 8 AC total
- TC-1.1.1: ✅ PASS (covers AC 1-2)
- TC-1.1.2: ✅ PASS (covers AC 3)
- TC-1.1.3: ✅ PASS (covers AC 4)
- TC-1.1.4: ✅ PASS (covers AC 5)
- TC-1.1.5: ✅ PASS (covers AC 6-8)

Coverage: 8/8 AC = 100% ✅

Story Totals:
- EPIC 1: XX/XX AC = XX%
- EPIC 2: XX/XX AC = XX%
- EPIC 3: XX/XX AC = XX%

Overall: XXX/120+ AC = XX%
```

---

## Sign-Off Checklist

Before providing QA sign-off on Day 5:

- [ ] All 100+ test cases executed
- [ ] ≥80% of AC covered
- [ ] All critical bugs fixed
- [ ] All high bugs fixed
- [ ] Cross-browser tested (4 browsers)
- [ ] Mobile tested (iOS/Android)
- [ ] Accessibility audit passed
- [ ] Performance targets met
- [ ] Security audit passed
- [ ] Localization verified
- [ ] Integration journeys work
- [ ] Regression testing done

If ALL checked: **✅ APPROVED FOR LAUNCH**
If ANY unchecked: **❌ BLOCKED** (pending fixes)

---

## Time Management

### Daily Schedule
```
9:00 - 9:30   Setup + Review plan
9:30 - 12:00  Execute tests (6-8 tests)
12:00 - 1:00  Lunch break
1:00 - 4:00   Execute tests (6-8 tests)
4:00 - 4:30   Documentation + bug reports
4:30 - 5:00   Prepare for tomorrow
```

### Expected Test Speed
- **Simple test:** 12-15 minutes
- **Complex test:** 18-25 minutes
- **With bug:** 20-30 minutes
- **Average:** 18 minutes per test

### Daily Target
- **Tests to execute:** 12-16 per day
- **Hours available:** 6-7 testing hours
- **Days available:** 5
- **Total tests:** 60-80 tests

---

## Troubleshooting

### "I can't login"
1. Check if backend is running: `curl http://localhost:3001/health`
2. Clear browser cookies: Ctrl+Shift+Delete
3. Check test user exists in database
4. Check email was verified first

### "Email not received"
1. Check Mailhog: http://localhost:1025
2. Check email service running
3. Check request logs for errors
4. Resend from form

### "WebSocket not working"
1. Check connection: Check browser Network tab
2. Check WebSocket URL: ws://localhost:3001
3. Check backend WebSocket server running
4. Check for CORS issues in console

### "Postman collection not working"
1. Check environment variables set
2. Check API is running
3. Run collection runner in debug mode
4. Check response format matches expected

### "Test blocked"
1. Note blocker details
2. Report to tech lead
3. Continue with next test
4. Return when blocker fixed

---

## Quick Links

**Frontend:** http://localhost:3003
**Backend API:** http://localhost:3001
**Mailhog Email:** http://localhost:1025
**Redis:** redis-cli
**PostgreSQL:** psql

**Documents:**
- Main Test Plan: `QA_COMPREHENSIVE_TEST_PLAN.md`
- Execution Report: `QA_TEST_EXECUTION_REPORT.md`
- Daily Checklist: `QA_TESTING_STATUS_AND_CHECKLIST.md`
- Status Summary: `QA_PHASE_1_COMPLETION_SUMMARY.md`

---

## Success Tips

1. **Follow test cases exactly** - Don't deviate from steps
2. **Take screenshots of failures** - Evidence for bug reports
3. **Test on real data** - Not "test123", use realistic data
4. **Test all error cases** - Not just happy path
5. **Test in Turkish** - UI language is Turkish
6. **Verify real-time updates** - WebSocket functionality
7. **Test on multiple browsers** - Not just Chrome
8. **Test on mobile** - Not just desktop
9. **Document everything** - Pass, fail, and blockers
10. **Report bugs immediately** - Don't wait until end of day

---

## Communication

### When you find a bug:
- **Immediately:** Take screenshot, note exact steps
- **Within 30 min:** Create bug report with full details
- **Same day:** Send to developer with reproduction steps

### Daily status:
- **End of day:** Update test execution report
- **Next morning:** Brief summary of progress

### Blockers:
- **Immediately:** Report to tech lead
- **Every 30 min:** Check if resolved
- **Document:** Why you're blocked

---

## End of Phase 2

**Congratulations on completing Phase 2!**

What happens next:
1. Report all findings (bugs, coverage, results)
2. Developers fix critical/high bugs
3. You re-test bug fixes
4. Move to Phase 3 (cross-browser)
5. Continue through Phase 8 (sign-off)

---

## Start Testing NOW

1. **Open:** QA_COMPREHENSIVE_TEST_PLAN.md
2. **Find:** Story 1.1 Test Cases
3. **Read:** TC-1.1.1 - Valid Registration
4. **Setup:** Browser, test account, Mailhog
5. **Execute:** Follow steps 1-9
6. **Verify:** Compare actual vs expected
7. **Document:** Mark PASS/FAIL
8. **Move:** Next test case

---

**Status:** READY TO TEST ✅
**Start:** NOW
**Target Launch:** 2025-12-02

**You've got this!** Follow the test plan, be thorough, document everything, and we'll have a high-quality launch. 🚀

---

**Quick Reference Created:** 2025-11-30
**Document:** QA_QUICK_START_GUIDE.md
**Purpose:** Fast onboarding to testing execution
