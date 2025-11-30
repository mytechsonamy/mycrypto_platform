# QA PHASES 5-8: MANUAL TESTING GUIDE
## MyCrypto Platform MVP - Final QA Phases

**Date:** November 30, 2025
**Status:** READY FOR EXECUTION
**Expected Duration:** 8-13 hours total

---

## PHASE 5: CROSS-BROWSER & MOBILE TESTING (14 tests, 1-2 hours)

### Purpose
Verify the application works consistently across all major browsers and mobile devices.

### Browsers to Test
- ✓ **Desktop:** Chrome (latest), Firefox (latest), Safari (latest)
- ✓ **Mobile:** iOS Safari (latest), Android Chrome (latest)

### Viewports to Test
- **Desktop:** 1920x1080, 1366x768, 1024x768
- **Tablet:** iPad (768x1024)
- **Mobile:** iPhone (375x812), Android (360x800)

### Test Cases

#### TC-501: Cross-Browser Registration Form
**Steps:**
1. Open application in each browser
2. Navigate to registration page
3. Fill out all required fields
4. Submit form
5. Verify email verification page appears

**Expected Results:**
- Form renders correctly in all browsers
- All fields are properly aligned
- Submit button is clickable
- Success message appears consistently

**Platforms:** Chrome, Firefox, Safari, iOS, Android

---

#### TC-502: Cross-Browser Login
**Steps:**
1. Open application in each browser
2. Navigate to login page
3. Enter credentials
4. Click login button
5. Verify dashboard loads

**Expected Results:**
- Form is responsive and usable
- Password field is masked
- Login button shows loading state
- Dashboard loads without errors

**Platforms:** All browsers

---

#### TC-503: Mobile Responsiveness - Navigation
**Steps:**
1. Open app on mobile device
2. Verify menu is accessible
3. Navigate through menu items
4. Verify no horizontal scrolling

**Expected Results:**
- Navigation is touch-friendly
- Text is readable (no zoom needed)
- Buttons are 44px minimum touch target
- No layout shifts when navigating

**Platforms:** iOS Safari, Android Chrome

---

#### TC-504: Mobile Responsiveness - Forms
**Steps:**
1. Open deposit form on mobile
2. Attempt to fill all fields
3. Verify keyboard doesn't cover inputs
4. Submit form

**Expected Results:**
- Keyboard dismisses after input
- Form inputs scroll into view
- Labels are visible
- Submit button is accessible

**Platforms:** iOS, Android

---

#### TC-505: Mobile Performance - Page Load
**Steps:**
1. Clear browser cache
2. Open application on mobile on 4G connection
3. Measure load time
4. Verify page is interactive

**Expected Results:**
- First paint < 2 seconds
- Page interactive < 3 seconds
- All critical assets loaded
- No stale content displayed

**Platforms:** iOS, Android

---

#### TC-506: Browser DevTools - Console Errors
**Steps:**
1. Open browser DevTools
2. Open application
3. Navigate through all pages
4. Check Console tab

**Expected Results:**
- Zero JavaScript errors
- Zero TypeScript errors
- Only normal warnings (if any)
- No 404 resource errors

**Platforms:** Chrome, Firefox, Safari

---

#### TC-507: Browser Cache Behavior
**Steps:**
1. Load application (first time)
2. Navigate to different page
3. Go back to first page
4. Verify data is current

**Expected Results:**
- Page loads from cache
- Data is fresh (not stale)
- No caching issues
- Timestamps are current

**Platforms:** All browsers

---

#### TC-508: Mobile Landscape Mode
**Steps:**
1. Open app in portrait mode
2. Rotate device to landscape
3. Verify layout adapts
4. Navigate and interact

**Expected Results:**
- Layout is responsive
- No content is hidden
- Touch targets still accessible
- Orientation change handled gracefully

**Platforms:** iOS, Android

---

### Success Criteria
- ✅ All 8 tests PASS in all 5 platforms
- ✅ No layout shifts or scrolling issues
- ✅ Touch targets 44px minimum
- ✅ Performance <3s on 4G
- ✅ Zero console errors

---

## PHASE 6: ACCESSIBILITY & PERFORMANCE TESTING (24 tests, 2-3 hours)

### Part A: Accessibility Testing (WCAG 2.1 AA)

#### TC-601: Keyboard Navigation
**Steps:**
1. Disable mouse
2. Use only Tab, Shift+Tab, Enter keys
3. Navigate through entire application
4. Verify all interactive elements are accessible

**Expected Results:**
- Tab order is logical (left to right, top to bottom)
- Focus is always visible
- No keyboard traps
- All functionality accessible via keyboard

**Tools:** Keyboard only navigation

---

#### TC-602: Screen Reader Testing
**Steps:**
1. Use NVDA (Windows) or VoiceOver (Mac)
2. Navigate application
3. Read form labels and buttons
4. Navigate data tables

**Expected Results:**
- All content is announced
- Form labels are associated with inputs
- Button purposes are clear
- Tables have proper headers

**Tools:** NVDA, VoiceOver, or JAWS

---

#### TC-603: Color Contrast
**Steps:**
1. Use axe DevTools or WAVE
2. Scan every page
3. Check contrast ratios
4. Verify text is readable

**Expected Results:**
- All text has 4.5:1 contrast (AA standard)
- All UI components have 3:1 contrast
- No reliance on color alone

**Tools:** axe DevTools, WAVE Browser Extension

---

#### TC-604: Form Accessibility
**Steps:**
1. Review all forms on application
2. Verify labels are present
3. Test required field indicators
4. Check error messages

**Expected Results:**
- Every input has a label
- Required fields are marked (*)
- Error messages are associated with fields
- Hints are available where needed

---

#### TC-605: Image Alt Text
**Steps:**
1. Review all images on application
2. Verify alt text is present
3. Check alt text describes image
4. Verify decorative images are skipped

**Expected Results:**
- All meaningful images have alt text
- Alt text is descriptive
- Decorative images have empty alt=""
- Icons have aria-label if text-less

---

### Part B: Performance Testing

#### TC-606: API Response Time - Market Data
**Steps:**
1. Use browser DevTools Network tab
2. Request: GET /api/v1/orderbook/BTC-USDT
3. Measure response time
4. Repeat 10 times

**Expected Results:**
- p50 latency < 50ms
- p95 latency < 100ms
- p99 latency < 200ms
- No timeouts

**Tools:** Chrome DevTools, Postman

---

#### TC-607: API Response Time - Orders
**Steps:**
1. Using Postman or curl
2. Request: GET /api/v1/orders
3. Measure response time
4. Run 10 requests

**Expected Results:**
- p50 latency < 100ms
- p95 latency < 200ms
- Consistent performance
- No degradation

**Tools:** Postman, curl with time tracking

---

#### TC-608: Page Load Performance
**Steps:**
1. Use Google Lighthouse
2. Test on desktop
3. Test on mobile (4G throttling)
4. Record metrics

**Expected Results:**
- Desktop score > 85
- Mobile score > 70
- First Contentful Paint < 2s
- Largest Contentful Paint < 4s

**Tools:** Google Lighthouse

---

#### TC-609: Database Query Performance
**Steps:**
1. Enable slow query log
2. Run typical user operations
3. Analyze execution times
4. Check for N+1 queries

**Expected Results:**
- All queries complete in <100ms
- No full table scans
- Proper use of indexes
- No N+1 query patterns

**Tools:** PostgreSQL EXPLAIN, query analyzer

---

#### TC-610: Memory Leaks
**Steps:**
1. Open DevTools Memory tab
2. Take heap snapshot
3. Navigate application for 2 minutes
4. Take second heap snapshot
5. Compare memory usage

**Expected Results:**
- Heap size stable
- No continuous growth
- Detached DOM nodes < 5
- No memory leaks detected

**Tools:** Chrome DevTools Memory tab

---

#### TC-611: Cache Effectiveness
**Steps:**
1. Monitor Redis cache hits
2. Perform repeated requests
3. Measure cache hit ratio
4. Analyze cache invalidation

**Expected Results:**
- Cache hit ratio > 95%
- Data freshness appropriate
- TTL properly configured
- No stale data served

**Tools:** Redis CLI, application metrics

---

### Success Criteria
- ✅ All pages WCAG 2.1 AA compliant
- ✅ Keyboard and screen reader navigation works
- ✅ API response times meet SLA
- ✅ Lighthouse scores > 80 (desktop), > 70 (mobile)
- ✅ Zero memory leaks detected
- ✅ Cache hit ratio > 95%

---

## PHASE 7: SECURITY & LOCALIZATION TESTING (26 tests, 2-3 hours)

### Part A: Security Testing

#### TC-701: SQL Injection Protection
**Steps:**
1. Attempt SQL injection in login field:
   - Test: `' OR '1'='1`
   - Test: `admin'--`
   - Test: `" UNION SELECT * FROM users--`
2. Monitor error messages
3. Check application response

**Expected Results:**
- All injections are sanitized
- Query fails safely
- No database error details exposed
- Request is logged for audit

**Tools:** Burp Suite, OWASP ZAP

---

#### TC-702: Cross-Site Scripting (XSS) Protection
**Steps:**
1. Attempt XSS in form fields:
   - Test: `<script>alert('XSS')</script>`
   - Test: `<img src=x onerror=alert('XSS')>`
   - Test: `javascript:alert('XSS')`
2. Submit form
3. Check if script executes

**Expected Results:**
- All scripts are escaped
- HTML tags are rendered as text
- No JavaScript execution
- Content is properly sanitized

**Tools:** Burp Suite, manual testing

---

#### TC-703: CSRF Protection
**Steps:**
1. Identify CSRF token location
2. Attempt request without token
3. Attempt request with wrong token
4. Verify proper token validation

**Expected Results:**
- Forms include CSRF token
- Token validation works
- Requests without token fail
- Error message is appropriate

**Tools:** Burp Suite

---

#### TC-704: Password Security
**Steps:**
1. Attempt weak password: "123456"
2. Attempt no special chars: "abcdefgh"
3. Attempt valid password: "SecurePass123!"
4. Verify hashing in database

**Expected Results:**
- Weak passwords rejected with message
- Password policy enforced
- Passwords are hashed (Argon2id)
- Passwords never logged

---

#### TC-705: Authentication Token Security
**Steps:**
1. Obtain JWT token after login
2. Modify token (change payload)
3. Use modified token in request
4. Check if request is rejected

**Expected Results:**
- Modified token is rejected
- Signature verification fails
- Error is 401 Unauthorized
- Request is logged

---

#### TC-706: Rate Limiting
**Steps:**
1. Send 100 requests to /api/v1/orders/place in 1 second
2. Monitor responses
3. Check rate limit headers
4. Verify blocking after limit exceeded

**Expected Results:**
- First N requests succeed (rate limit = N)
- Subsequent requests return 429 (Too Many Requests)
- Rate limit headers present
- X-RateLimit-Remaining updates

---

#### TC-707: Sensitive Data Protection
**Steps:**
1. Monitor network traffic (DevTools)
2. Look for password in requests
3. Check HTTPS usage
4. Verify no PII in logs

**Expected Results:**
- All requests use HTTPS
- Passwords never sent in plaintext
- Sensitive data encrypted at rest
- Audit logs don't contain sensitive data

---

### Part B: Localization Testing (Turkish - tr-TR)

#### TC-708: Language Switching
**Steps:**
1. Open application
2. Locate language selector
3. Switch to Turkish
4. Verify all text changes

**Expected Results:**
- All UI text translates to Turkish
- Language preference persists
- Date formats match locale
- Number formats match locale (comma as decimal)

---

#### TC-709: Form Localization
**Steps:**
1. Switch to Turkish
2. Open any form
3. Verify all labels, placeholders, errors in Turkish
4. Test validation messages

**Expected Results:**
- All form labels in Turkish
- Placeholder text in Turkish
- Validation errors in Turkish
- Error messages helpful and localized

---

#### TC-710: Date & Time Localization
**Steps:**
1. Switch to Turkish
2. View any date/time field
3. Check format matches tr-TR locale
4. Verify timezone handling

**Expected Results:**
- Date format: DD/MM/YYYY (Turkish standard)
- Time format: HH:mm:ss
- Timezone correctly displayed
- Date pickers show Turkish calendar

---

#### TC-711: Number Localization
**Steps:**
1. Switch to Turkish
2. View any numerical values
3. Check currency formatting
4. Verify decimal separator

**Expected Results:**
- Numbers use comma as decimal (1.000,50)
- Currency shows as TRY or appropriate symbol
- Thousands separator correct
- Percentages display correctly

---

#### TC-712: RTL Text Support
**Steps:**
1. Add test text in right-to-left language
2. Verify text direction
3. Check layout adjustments
4. Verify form alignment

**Expected Results:**
- RTL text displays correctly
- Layout mirrors for RTL (if needed)
- Icons/elements properly positioned
- No text overflow

---

### Part C: KVKK Compliance (Turkish Privacy Law)

#### TC-713: Privacy Policy Display
**Steps:**
1. Look for privacy policy link
2. Access privacy policy
3. Verify Turkish language
4. Check content comprehensiveness

**Expected Results:**
- Privacy policy is accessible
- Clearly states data usage
- Explains data retention
- Provides opt-out mechanisms

---

#### TC-714: Consent Management
**Steps:**
1. Check for cookie consent banner
2. Verify user can refuse non-essential
3. Allow only essential cookies
4. Verify preference persists

**Expected Results:**
- Cookie banner appears
- Granular consent controls
- Preferences are saved
- User choice is respected

---

#### TC-715: Data Export Request
**Steps:**
1. Locate data export option
2. Request data export
3. Verify format (JSON/CSV)
4. Check completeness

**Expected Results:**
- Export functionality available
- All user data included
- Format is standard/parseable
- Export downloads correctly

---

### Success Criteria
- ✅ All SQL injection attempts blocked
- ✅ All XSS attempts blocked
- ✅ CSRF protection verified
- ✅ Rate limiting working
- ✅ All UI text translates to Turkish
- ✅ Number/date formats localized
- ✅ Privacy policy displayed
- ✅ Data export functionality working

---

## PHASE 8: REGRESSION & FINAL SIGN-OFF (12+ tests, 1-2 hours)

### Purpose
Verify all previously tested functionality still works and is production-ready.

### Critical User Journeys

#### CJ-801: Complete Registration & KYC
**Steps:**
1. Register new user
2. Verify email
3. Set up 2FA
4. Complete KYC
5. Verify account is active

**Expected Result:** ✅ PASS
**Time:** 10 minutes

---

#### CJ-802: Deposit Fiat & Place Order
**Steps:**
1. Login
2. Deposit fiat currency
3. View balance update
4. Place limit order
5. Verify order appears

**Expected Result:** ✅ PASS
**Time:** 10 minutes

---

#### CJ-803: Execute Trade & View History
**Steps:**
1. Place market order
2. Verify execution
3. View trade history
4. Export trade data
5. Verify P&L calculation

**Expected Result:** ✅ PASS
**Time:** 10 minutes

---

#### CJ-804: Withdraw Fiat
**Steps:**
1. Request fiat withdrawal
2. Verify pending status
3. Check balance locked
4. Complete withdrawal
5. Verify final balance

**Expected Result:** ✅ PASS
**Time:** 10 minutes

---

### Go/No-Go Decision Framework

| Criteria | Target | Status |
|----------|--------|--------|
| **Functionality** | 100% working | REQUIRED |
| **Performance** | SLA met | REQUIRED |
| **Security** | All controls verified | REQUIRED |
| **Usability** | Accessible & responsive | REQUIRED |
| **Stability** | No crashes | REQUIRED |
| **Data Integrity** | 100% accurate | REQUIRED |

### Final Sign-Off Checklist

- [ ] All Phase 4 tests PASSED (80%+ pass rate)
- [ ] All Phase 5 tests PASSED (cross-browser working)
- [ ] All Phase 6 tests PASSED (accessible & performant)
- [ ] All Phase 7 tests PASSED (secure & localized)
- [ ] All Phase 8 tests PASSED (regression verified)
- [ ] Zero critical bugs
- [ ] Zero high-priority bugs (or with documented workarounds)
- [ ] Performance SLAs met
- [ ] Security controls verified
- [ ] Team consensus on readiness
- [ ] QA sign-off obtained
- [ ] PM approval obtained
- [ ] Tech Lead approval obtained

### Sign-Off Signatures

**QA Lead:** _________________________ Date: _________
**Project Manager:** _________________________ Date: _________
**Tech Lead:** _________________________ Date: _________

---

## Execution Timeline

| Phase | Duration | Tests | Expected Pass Rate |
|-------|----------|-------|-------------------|
| Phase 5 (Browser) | 1-2 hours | 14 | 95%+ |
| Phase 6 (A11y & Perf) | 2-3 hours | 24 | 90%+ |
| Phase 7 (Security & i18n) | 2-3 hours | 26 | 95%+ |
| Phase 8 (Regression) | 1-2 hours | 12+ | 100% |
| **TOTAL** | **8-13 hours** | **80+ tests** | **95%+** |

---

## Tools Required

- Chrome DevTools (built-in)
- Firefox Developer Tools (built-in)
- axe DevTools (accessibility)
- WAVE Browser Extension (accessibility)
- Google Lighthouse (performance)
- Burp Suite (security - optional)
- OWASP ZAP (security - optional)
- Postman (API testing)
- Screen reader: VoiceOver (Mac) or NVDA (Windows)

---

## Issue Reporting

For any issues found during testing:

```markdown
**BUG-PHASE-X-XXX: [Title]**

Severity: [Critical/High/Medium/Low]
Phase: [5-8]
Test Case: [TC-XXX]

**Steps to Reproduce:**
1. Step 1
2. Step 2
3. Step 3

**Expected Result:**
[What should happen]

**Actual Result:**
[What actually happened]

**Evidence:**
[Screenshot, video, log excerpt]

**Browser/Platform:**
[Specify where it fails]
```

---

## Completion Criteria

- ✅ All 80+ tests executed
- ✅ 95%+ pass rate
- ✅ Zero critical bugs
- ✅ Sign-off obtained from QA, PM, Tech Lead
- ✅ Production deployment approved

**Status: READY FOR PRODUCTION LAUNCH**

---

**Prepared By:** QA Team
**Date:** November 30, 2025
**Target Launch:** December 2, 2025

