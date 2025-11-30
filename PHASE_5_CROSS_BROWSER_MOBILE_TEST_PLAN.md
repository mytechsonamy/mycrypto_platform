# PHASE 5: Cross-Browser & Mobile Testing Plan
**Duration:** 2-3 hours
**Start Date:** November 30, 2025
**Status:** IN PROGRESS

---

## 1. Test Environments

### Desktop Browsers
- **Chrome (Latest)** - Version 142.0.7144.176
- **Firefox (Latest)** - Latest stable
- **Safari (Latest)** - macOS 13+

### Mobile Browsers
- **Mobile Safari (iOS)** - iPhone 12/13 emulation (375px, 667px viewport)
- **Chrome Mobile (Android)** - Pixel 4 emulation (360px, 720px viewport)

---

## 2. Test Cases by Category

### A. CHROME DESKTOP (Latest)

#### TC-CB-001: User Registration Flow (Chrome)
**Feature:** User Registration (Story 1.1)
**Type:** E2E / UI
**Priority:** P0 (Critical)

**Preconditions:**
- Frontend application running on http://localhost:3000
- Chrome browser with latest version
- No cached user data (clear localStorage/cookies)

**Steps:**
1. Open http://localhost:3000 in Chrome
2. Click "Register" button on landing page
3. Fill in email: "testcb001@example.com"
4. Fill in password: "TestPassword123!"
5. Confirm password matches
6. Review and accept Terms & Conditions
7. Review and accept KVKK consent
8. Complete reCAPTCHA v3 challenge
9. Click "Register" button
10. Verify email verification message displays
11. Check browser console for errors (F12)
12. Verify page load performance in DevTools

**Expected Result:**
- Registration form renders correctly with all fields
- No console errors (red X marks)
- No network errors (4xx, 5xx responses)
- Form submission successful (2xx response)
- Confirmation message displayed
- Page load time < 2 seconds (Lighthouse metrics)
- Lighthouse performance score > 80

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

**Screenshots:**
[Attach if failed]

---

#### TC-CB-002: Login Flow (Chrome)
**Feature:** User Login (Story 1.2)
**Type:** E2E / UI
**Priority:** P0 (Critical)

**Preconditions:**
- User registered with email: "testcb001@example.com"
- Email verified
- 2FA not enabled
- Chrome browser

**Steps:**
1. Navigate to http://localhost:3000
2. Click "Login" button
3. Enter email: "testcb001@example.com"
4. Enter password: "TestPassword123!"
5. Click "Login" button
6. Observe dashboard loads
7. Check browser console for errors

**Expected Result:**
- Login form renders correctly
- Authentication request succeeds (2xx response)
- Redirected to dashboard
- User profile displays correctly
- No console errors
- WebSocket connection established (check Network tab)
- Wallet balances displayed

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

#### TC-CB-003: Trading Page Functionality (Chrome)
**Feature:** Order Book Display (Story 3.1)
**Type:** E2E / UI
**Priority:** P0 (Critical)

**Preconditions:**
- User logged in
- KYC approved (use test account)
- Chrome DevTools open

**Steps:**
1. Navigate to Trading page
2. Verify BTC/TRY order book loads
3. Switch between BTC/TRY, ETH/TRY, USDT/TRY
4. Verify order book updates in real-time
5. Check console for WebSocket messages
6. Monitor Network tab for API requests
7. Check performance: first contentful paint, largest contentful paint
8. Scroll order book (check for jank/stuttering)

**Expected Result:**
- Order book renders with bid/ask sides
- Price levels display correctly
- Real-time updates visible (no more than 100ms latency)
- No console errors
- WebSocket frames show in Network tab
- Lighthouse performance > 80
- No frame drops during scrolling

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

#### TC-CB-004: Wallet Operations (Chrome)
**Feature:** Wallet Management (Story 2.1-2.5)
**Type:** E2E / UI
**Priority:** P0 (Critical)

**Preconditions:**
- User logged in and KYC approved
- Test account has BTC, ETH, USDT balances

**Steps:**
1. Navigate to Wallet page
2. Verify all asset balances display (BTC, ETH, USDT, TRY)
3. Click "View Details" for each asset
4. Verify balance breakdown (Available, Locked, Total)
5. Check USD equivalent calculations
6. Click "Deposit" for each asset
7. Verify deposit instructions display
8. Click "Withdraw" for each asset
9. Verify withdrawal form displays
10. Check form validation messages

**Expected Result:**
- Wallet balances display correctly
- Real-time balance updates work
- All currencies format correctly (₺ for TRY, 8 decimals for crypto)
- Deposit addresses generate and display
- Withdrawal form validates input
- No console errors
- All forms accessible and responsive

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

#### TC-CB-005: Form Validation (Chrome)
**Feature:** Form Input Validation
**Type:** UI
**Priority:** P1 (High)

**Preconditions:**
- Frontend application running
- Chrome browser

**Steps:**
1. Navigate to Registration form
2. Try submitting with empty fields
3. Enter invalid email format (e.g., "notanemail")
4. Enter password with insufficient complexity
5. Try 2FA setup with invalid input
6. Try withdrawal form with invalid IBAN
7. Monitor all validation messages
8. Check error styling (red borders, error icons)
9. Check console for validation errors

**Expected Result:**
- Empty field validation shows error message
- Invalid email shows specific error message
- Password strength indicator updates in real-time
- All error messages display below fields
- Error styling consistent across forms
- Validation prevents form submission when invalid
- No console errors

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

#### TC-CB-006: Performance Metrics (Chrome)
**Feature:** Web Performance
**Type:** Performance
**Priority:** P1 (High)

**Preconditions:**
- Chrome DevTools Network tab available
- Performance tab available

**Steps:**
1. Open DevTools (F12)
2. Go to Performance tab
3. Click "Start recording" (Ctrl+Shift+E)
4. Reload page (Cmd+R)
5. Stop recording after page fully loads
6. Record metrics:
   - First Contentful Paint (FCP)
   - Largest Contentful Paint (LCP)
   - Cumulative Layout Shift (CLS)
   - Time to Interactive (TTI)
7. Go to Network tab
8. Clear cache
9. Reload page
10. Record:
    - Total page load time
    - Total requests
    - Total size (MB)
    - Largest assets

**Expected Result:**
- FCP < 1.5 seconds
- LCP < 2.5 seconds
- CLS < 0.1
- TTI < 3 seconds
- Total load time < 3 seconds
- No failed requests (4xx, 5xx)

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

### B. FIREFOX DESKTOP (Latest)

#### TC-FF-001: User Registration Flow (Firefox)
**Feature:** User Registration (Story 1.1)
**Type:** E2E / UI
**Priority:** P0 (Critical)

**Preconditions:**
- Firefox latest version installed
- Frontend running on http://localhost:3000
- Developer Tools available

**Steps:**
1. Open http://localhost:3000 in Firefox
2. Click "Register"
3. Fill in email: "testff001@example.com"
4. Fill in password: "TestPassword123!"
5. Confirm password
6. Accept Terms & KVKK
7. Complete reCAPTCHA
8. Click "Register"
9. Open Developer Tools (F12)
10. Check Console tab for errors
11. Check Network tab for all requests
12. Verify styling looks correct (no layout issues)

**Expected Result:**
- Form renders correctly in Firefox
- All CSS applied correctly (colors, fonts, spacing)
- No layout shifts
- Console shows no errors
- Network requests all successful
- Form submission works
- Confirmation message displays

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

#### TC-FF-002: CSS Rendering & JavaScript Compatibility (Firefox)
**Feature:** Web Compatibility
**Type:** Compatibility
**Priority:** P1 (High)

**Preconditions:**
- Firefox latest version
- All pages/components loaded

**Steps:**
1. Navigate to each page (Home, Register, Login, Dashboard, Trading, Wallet)
2. Check for CSS layout issues:
   - Text overlaps form fields
   - Buttons cut off or misaligned
   - Charts not rendering
   - Colors appear different
3. Check JavaScript functionality:
   - Form validation works
   - WebSocket connections established
   - Modal dialogs display correctly
   - Dropdowns/selects functional
4. Test form submissions on each page
5. Check responsive behavior (resize browser)
6. Monitor console for errors

**Expected Result:**
- All pages render correctly
- No CSS layout issues
- All JavaScript features work
- Responsive design functions properly
- Form submissions work
- WebSockets connect successfully
- No console errors

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

### C. SAFARI DESKTOP (macOS)

#### TC-SAF-001: User Login & WebSocket Connectivity (Safari)
**Feature:** Authentication & Real-time Updates (Stories 1.2, 2.1)
**Type:** E2E / UI
**Priority:** P0 (Critical)

**Preconditions:**
- Safari latest version (macOS 13+)
- Test user registered and email verified
- Safari Web Inspector available

**Steps:**
1. Open http://localhost:3000 in Safari
2. Navigate to login page
3. Enter credentials: testuser@example.com / TestPassword123!
4. Click "Login"
5. Wait for dashboard to load
6. Open Safari Web Inspector (Cmd+Option+I)
7. Go to Network tab
8. Look for WebSocket connections
9. Verify order book updates in real-time
10. Verify wallet balance updates in real-time
11. Check Console for errors
12. Check if SVG charts render correctly

**Expected Result:**
- Login successful
- Dashboard loads
- WebSocket connection established (WS protocol in Network tab)
- Real-time updates visible
- SVG charts display correctly
- No console errors
- Performance acceptable

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

#### TC-SAF-002: SVG Chart Rendering (Safari)
**Feature:** Market Data Visualization (Story 3.1, 3.3)
**Type:** Compatibility
**Priority:** P1 (High)

**Preconditions:**
- Safari latest version
- User logged in on Trading page

**Steps:**
1. Navigate to Trading page (order book view)
2. Verify depth chart renders:
   - X-axis and Y-axis visible
   - Grid lines present
   - Area fill visible
   - Text labels readable
3. Navigate to Market Analysis page (if available)
4. Verify all SVG charts render:
   - Candlestick charts
   - Line charts
   - Indicator overlays
5. Interact with charts:
   - Hover over candlesticks (tooltip should show)
   - Zoom in/out (if supported)
   - Pan horizontally (if supported)

**Expected Result:**
- All SVG charts render correctly
- No blank/missing chart areas
- Tooltips display on hover
- Chart interactions work
- Text is readable
- Colors appear correct

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

### D. MOBILE SAFARI (iOS iPhone)

#### TC-IOS-001: Responsive Design 375px (iPhone SE)
**Feature:** Mobile Responsiveness
**Type:** UI / Responsive
**Priority:** P1 (High)

**Preconditions:**
- Safari on iPhone or iPhone simulator (375px viewport)
- Frontend running on accessible server (localhost with port forwarding or dev server)

**Steps:**
1. Open http://localhost:3000 on iPhone (or use Chrome DevTools device emulation: 375x667)
2. Navigate to Home page
3. Check layout:
   - No horizontal scrolling
   - All elements fit within viewport
   - Text readable without zoom
   - Buttons large enough to tap (min 44x44 pt)
4. Navigate to Login page
5. Check form:
   - Input fields full width
   - Keyboard doesn't hide form
   - Error messages visible
6. Tap Login to go to Dashboard
7. Check Dashboard layout:
   - Wallet balances visible
   - No content cut off
   - Bottom navigation accessible
8. Navigate to Trading page
9. Check order book:
   - Price levels readable
   - Bid/ask sides visible
   - Scrollable without issues

**Expected Result:**
- No horizontal scrolling needed
- All content accessible without zoom
- Buttons and inputs tappable
- Keyboard doesn't hide critical form fields
- Layout shifts minimally
- Text contrast readable
- Responsive images load appropriately

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

#### TC-IOS-002: Touch Interactions (iPhone)
**Feature:** Touch Event Handling
**Type:** Interaction
**Priority:** P1 (High)

**Preconditions:**
- iPhone or emulation with touch support
- User logged in

**Steps:**
1. Test tap interactions:
   - Tap Login button
   - Tap form fields (keyboard appears)
   - Tap back/close buttons
2. Test scrolling:
   - Scroll order book
   - Scroll wallet history
   - Momentum scrolling works smoothly
3. Test pinch/zoom:
   - Try pinch zoom on charts (should zoom if supported)
   - Try two-finger rotation (should rotate if supported)
4. Test long-press:
   - Long-press on address to copy
   - Long-press on transaction to show context menu
5. Test swipe:
   - Swipe back (browser native)
   - Swipe between tabs (if tab UI)

**Expected Result:**
- All tap targets respond immediately
- No 300ms delay observed
- Scrolling smooth without jank
- Momentum scrolling works
- Form inputs respond to touch
- No accidental activations
- Touch feedback visible

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

#### TC-IOS-003: Form Input Handling (iPhone)
**Feature:** Mobile Form Interaction
**Type:** Interaction
**Priority:** P1 (High)

**Preconditions:**
- iPhone (375px viewport)
- User on registration or login form

**Steps:**
1. Tap email field
2. Verify iOS keyboard appears (email type)
3. Enter email: "testios@example.com"
4. Verify autocomplete suggestions if any
5. Tap password field
6. Verify iOS keyboard switches to password type
7. Verify dots appear instead of typed characters
8. Tap show/hide password toggle (if present)
9. Verify "Autofill" suggestion appears
10. Try filling form using iOS Autofill
11. Check that form doesn't shift when keyboard appears
12. Submit form

**Expected Result:**
- Correct keyboard types appear for each field
- Password dots display
- Keyboard doesn't hide form
- Form scrolls to show all fields
- Autofill works if user saved credentials
- No layout shifts
- Form submission successful

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

#### TC-IOS-004: Performance on 4G Network (iPhone)
**Feature:** Mobile Performance
**Type:** Performance
**Priority:** P2 (Medium)

**Preconditions:**
- iPhone or emulation with network throttling
- Chrome DevTools available (for emulation)

**Steps:**
1. Open Chrome DevTools
2. Go to Network tab
3. Set throttling to "Slow 4G" (400 kbps down, 400 kbps up)
4. Reload page (Cmd+R)
5. Record metrics:
   - Time until first interactive element appears
   - Time until fully loaded
   - Largest image sizes
   - Total page size
6. Monitor for timeouts or failed requests
7. Test login with throttled network
8. Test form submission with throttled network

**Expected Result:**
- Page starts loading within 2 seconds
- Page fully usable within 5 seconds
- Login succeeds within 10 seconds
- No requests timeout
- Images load progressively
- Text content loads first
- User can interact with page before images load

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

### E. CHROME MOBILE (Android)

#### TC-AND-001: Responsive Design 360px (Pixel 4)
**Feature:** Mobile Responsiveness
**Type:** UI / Responsive
**Priority:** P1 (High)

**Preconditions:**
- Chrome on Android or Chrome DevTools (360x720 viewport)
- Frontend accessible

**Steps:**
1. Set viewport to 360x720 (Pixel 4)
2. Navigate to http://localhost:3000
3. Check Home page layout:
   - No horizontal scrolling
   - All text readable
   - Buttons sized for touch (min 48dp)
4. Test Registration form:
   - Fields fit without scrolling
   - Labels visible
   - Error messages don't overlap
5. Test Login flow:
   - Form accessible
   - Keyboard doesn't hide form
   - Success page displays
6. Test Dashboard:
   - Wallet cards responsive
   - Portfolio value visible
   - Transaction history scrollable
7. Test Trading page:
   - Order book readable
   - Bid/ask sides distinct
   - Price levels scrollable

**Expected Result:**
- No horizontal scrolling
- All content accessible
- Buttons min 48dp (48x48 pixels)
- Text contrast meets WCAG AA
- Responsive images appropriate for viewport
- No layout shifts during load

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

#### TC-AND-002: Touch Interactions (Android)
**Feature:** Touch Event Handling
**Type:** Interaction
**Priority:** P1 (High)

**Preconditions:**
- Android device or emulation with touch
- User logged in

**Steps:**
1. Tap on various buttons and verify response
2. Test form field interactions:
   - Tap to focus
   - Type text
   - Clear field
3. Test scrolling:
   - Scroll order book
   - Scroll transaction history
   - Check for smooth scrolling
4. Test double-tap zoom (should not zoom unless needed)
5. Test long-press interactions:
   - Copy address to clipboard
   - Show context menu
6. Test gesture navigation (if supported):
   - Swipe back
   - Swipe forward

**Expected Result:**
- All interactive elements respond to tap
- No 300ms delay observed
- Scrolling smooth and responsive
- Double-tap zoom works appropriately
- Long-press shows expected behavior
- Touch feedback visible (ripple effect on Material Design)
- No accidental activations

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

#### TC-AND-003: Form Validation (Android)
**Feature:** Form Input Validation
**Type:** Interaction
**Priority:** P1 (High)

**Preconditions:**
- Android device or emulation (360x720)
- User on registration or login form

**Steps:**
1. Navigate to registration form
2. Try submitting without entering any data
3. Verify error message appears for each field
4. Enter invalid email: "notanemail"
5. Verify email error message
6. Fix email, enter weak password: "weak"
7. Verify password strength indicator
8. Fix password, check all validations pass
9. Navigate to withdrawal form (if applicable)
10. Enter invalid IBAN format
11. Verify IBAN error message
12. Check error messages are readable and non-overlapping

**Expected Result:**
- All validation errors display immediately
- Error messages are clear and actionable
- Error styling visible on Android (red outline/text)
- No overlapping error messages
- Password strength indicator updates in real-time
- Form prevents submission when invalid
- Success feedback shown when form valid

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

#### TC-AND-004: WebSocket Reliability (Android)
**Feature:** Real-time Updates
**Type:** Functional
**Priority:** P0 (Critical)

**Preconditions:**
- Android device or emulation
- User logged in on Trading page
- Network conditions can be simulated

**Steps:**
1. Navigate to Trading page
2. Open Chrome DevTools on connected device
3. Monitor order book updates for 1 minute
4. Simulate network interruption (toggle WiFi off/on)
5. Verify connection re-establishes
6. Continue monitoring updates for 1 minute
7. Check that no data is lost during reconnection
8. Monitor console for WebSocket errors

**Expected Result:**
- WebSocket connection established
- Real-time updates flow continuously
- Connection re-establishes on network recovery
- No data corruption or loss
- Order book remains consistent
- No console errors related to WebSocket

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

## 3. Cross-Browser Compatibility Matrix

| Feature | Chrome | Firefox | Safari | iOS Safari | Android Chrome |
|---------|--------|---------|--------|-----------|-----------------|
| Registration | ✓ | ✓ | ✓ | ✓ | ✓ |
| Login | ✓ | ✓ | ✓ | ✓ | ✓ |
| Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ |
| Trading Page | ✓ | ✓ | ✓ | ✓ | ✓ |
| Wallet Ops | ✓ | ✓ | ✓ | ✓ | ✓ |
| Form Validation | ✓ | ✓ | ✓ | ✓ | ✓ |
| WebSocket | ✓ | ✓ | ✓ | ✓ | ✓ |
| SVG Charts | ✓ | ✓ | ✓ | ✓ | ✓ |
| Responsive | ✓ | ✓ | ✓ | ✓ | ✓ |
| Touch Events | - | - | - | ✓ | ✓ |

---

## 4. Test Execution Instructions

### Pre-Execution Checklist
- [ ] Frontend running on http://localhost:3000
- [ ] Backend services operational (Auth, Trading, Wallet)
- [ ] Database seeded with test data
- [ ] Test user accounts created
- [ ] Browser developer tools available
- [ ] Mobile emulation tools available or devices ready
- [ ] Network throttling tools available

### Execution Steps
1. **Execute Chrome tests first** (most important)
2. **Execute Firefox tests** (cross-browser validation)
3. **Execute Safari tests** (macOS compatibility)
4. **Execute mobile tests** (iOS and Android)
5. **Document all results** in this plan
6. **Capture screenshots** of any failures

### Success Criteria
- All main flows work on all browsers
- No console errors (error logs, exceptions)
- Load times < 2 seconds on desktop, < 4 seconds on mobile
- WebSocket connectivity working on all platforms
- Responsive design correct from 360px to 1920px
- Form validation working consistently across browsers
- No data loss during testing

---

## 5. Test Results Summary

### Chrome Desktop
| Test Case | Status | Issues |
|-----------|--------|--------|
| TC-CB-001 | [ ] | [ ] |
| TC-CB-002 | [ ] | [ ] |
| TC-CB-003 | [ ] | [ ] |
| TC-CB-004 | [ ] | [ ] |
| TC-CB-005 | [ ] | [ ] |
| TC-CB-006 | [ ] | [ ] |

### Firefox Desktop
| Test Case | Status | Issues |
|-----------|--------|--------|
| TC-FF-001 | [ ] | [ ] |
| TC-FF-002 | [ ] | [ ] |

### Safari Desktop
| Test Case | Status | Issues |
|-----------|--------|--------|
| TC-SAF-001 | [ ] | [ ] |
| TC-SAF-002 | [ ] | [ ] |

### iOS Mobile
| Test Case | Status | Issues |
|-----------|--------|--------|
| TC-IOS-001 | [ ] | [ ] |
| TC-IOS-002 | [ ] | [ ] |
| TC-IOS-003 | [ ] | [ ] |
| TC-IOS-004 | [ ] | [ ] |

### Android Mobile
| Test Case | Status | Issues |
|-----------|--------|--------|
| TC-AND-001 | [ ] | [ ] |
| TC-AND-002 | [ ] | [ ] |
| TC-AND-003 | [ ] | [ ] |
| TC-AND-004 | [ ] | [ ] |

---

## Next Steps
1. Execute all test cases in order
2. Document results in table above
3. Report any bugs found with BUG-XXX format
4. Create Phase 5 Completion Report
5. Proceed to Phase 6 (Accessibility & Performance)
