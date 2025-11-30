# TASK QA-EPIC3-004: Story 3.3 Testing & Sprint 3 Validation

**Task ID:** QA-EPIC3-004
**Sprint:** 3 (Days 6-10, Final Week)
**Feature:** Story 3.3 - Advanced Market Data (Price Alerts & Technical Indicators)
**Type:** QA Testing - Manual + Automated
**Duration:** 2 hours
**Points:** 1.5
**Status:** IN PROGRESS

---

## Test Plan Overview

This comprehensive test plan covers Story 3.3 (Advanced Market Data) which includes:

### Part 1: Price Alert Testing (15+ scenarios)
- Alert creation (above/below price thresholds)
- Alert management (list, edit, delete, toggle)
- Alert triggering and notifications
- Data isolation and performance

### Part 2: Technical Indicators Testing (10+ scenarios)
- SMA, EMA, RSI, MACD calculations
- Period variants and type validation
- Real-time updates and caching
- Performance requirements

### Part 3: Integration Testing (8+ scenarios)
- Story 3.1 + 3.2 + 3.3 end-to-end
- WebSocket real-time updates
- Error recovery and edge cases
- System stability under load

### Part 4: Sprint 3 Validation
- All 50 story points verified
- All acceptance criteria met
- Quality gates passed
- Production readiness confirmed

---

## Part 1: Price Alert Testing (15+ Scenarios)

### Test Environment Setup
**Preconditions:**
- Authenticated user with KYC approved
- Test database with seed data
- WebSocket connection available
- Market data flowing in real-time

---

### TC-PA-001: Create Price Alert - Above Threshold

**Feature:** Story 3.3 - Price Alerts
**Type:** API + UI
**Priority:** P0 (Critical)

**Preconditions:**
- User authenticated (token valid)
- User has KYC approved
- Symbol: BTC/TRY exists
- Current price: 2,500,000 TRY

**Steps:**
1. Navigate to Trading > Price Alerts
2. Click "Add Alert" button
3. Select symbol: BTC/TRY
4. Select condition: Above
5. Enter target price: 2,550,000
6. Click "Create Alert"

**Expected Result:**
- Alert created successfully
- Response code: 201 Created
- Alert displayed in active alerts list
- Database entry: alerts.is_active = true
- User sees confirmation: "Alert created successfully"

**Actual Result:**
[To be filled after testing]

**Status:** Not Tested

---

### TC-PA-002: Create Price Alert - Below Threshold

**Feature:** Story 3.3 - Price Alerts
**Type:** API + UI
**Priority:** P0

**Steps:**
1. Navigate to Trading > Price Alerts
2. Click "Add Alert" button
3. Select symbol: ETH/TRY
4. Select condition: Below
5. Enter target price: 150,000
6. Click "Create Alert"

**Expected Result:**
- Alert created with condition: "BELOW"
- Alert visible in list
- API response includes: userId, symbol, alertType, targetPrice, isActive=true

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-PA-003: List User's Price Alerts

**Feature:** Story 3.3 - Price Alerts
**Type:** API
**Priority:** P0

**Preconditions:**
- User has 3 active alerts (BTC above, ETH below, USDT above)
- User has 1 inactive alert (archived)

**Steps:**
1. Call API: `GET /api/v1/alerts`
2. Verify response includes all user's alerts
3. Check filtering: active=true (should return 3)

**Expected Result:**
- Response code: 200 OK
- Returns array with 3 active alerts
- Each alert contains: id, symbol, alertType, targetPrice, isActive, createdAt
- Inactive alerts excluded (unless filtered)
- Performance: <50ms

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-PA-004: Edit Alert Price

**Feature:** Story 3.3 - Price Alerts
**Type:** API
**Priority:** P0

**Preconditions:**
- Alert ID: alert_123 exists
- Current target: 2,500,000 TRY
- Alert status: active

**Steps:**
1. Call API: `PUT /api/v1/alerts/{alertId}`
2. Request body: `{ "targetPrice": "2,600,000" }`
3. Verify response

**Expected Result:**
- Response code: 200 OK
- Alert updated: targetPrice = 2,600,000
- isActive remains true
- updatedAt timestamp changed
- No notification sent (just edit, not trigger)

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-PA-005: Edit Alert Type (Above ↔ Below)

**Feature:** Story 3.3 - Price Alerts
**Type:** API
**Priority:** P0

**Steps:**
1. Call API: `PUT /api/v1/alerts/{alertId}`
2. Request body: `{ "alertType": "below" }`
3. Current type: "above"

**Expected Result:**
- Type changed successfully
- Response includes updated alertType
- Triggered field reset (if was triggered before)
- Alert remains active

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-PA-006: Delete Price Alert

**Feature:** Story 3.3 - Price Alerts
**Type:** API
**Priority:** P0

**Steps:**
1. Call API: `DELETE /api/v1/alerts/{alertId}`
2. Verify response

**Expected Result:**
- Response code: 204 No Content
- Alert removed from database
- Alert removed from UI list
- GET /api/v1/alerts no longer includes deleted alert

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-PA-007: Toggle Alert On/Off

**Feature:** Story 3.3 - Price Alerts
**Type:** API
**Priority:** P0

**Steps:**
1. Get active alert: alert_123 (isActive=true)
2. Call API: `PATCH /api/v1/alerts/{alertId}/toggle`
3. Verify isActive = false
4. Call again to toggle back

**Expected Result:**
- First call: isActive changes to false
- Alert still exists but not evaluated
- Second call: isActive back to true
- No data loss

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-PA-008: Prevent Duplicate Alerts

**Feature:** Story 3.3 - Price Alerts
**Type:** API
**Priority:** P1

**Preconditions:**
- User has existing alert: BTC/TRY above 2,500,000 (active)

**Steps:**
1. Try to create identical alert again
2. Call API: `POST /api/v1/alerts` with same params

**Expected Result:**
- Response code: 409 Conflict
- Error message: "Alert already exists for this symbol and condition"
- No duplicate created in database

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-PA-009: Price Crosses Threshold - Alert Triggers

**Feature:** Story 3.3 - Price Alerts
**Type:** Integration
**Priority:** P0

**Preconditions:**
- Active alert: BTC/TRY above 2,500,000
- Current market price: 2,480,000
- Alert service polling enabled

**Steps:**
1. Market price updates to: 2,550,000 (crosses threshold upward)
2. Wait for alert evaluation (max 10 seconds)
3. Verify alert triggered

**Expected Result:**
- Alert service detects price crossed threshold
- Alert.triggeredAt timestamp set
- Alert.isActive remains true (can trigger again if price falls below and rises again)
- WebSocket event sent: `alert.triggered` with alert details
- User receives notification (WebSocket push)

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-PA-010: WebSocket Notification on Alert Trigger

**Feature:** Story 3.3 - Price Alerts + WebSocket
**Type:** Integration
**Priority:** P0

**Preconditions:**
- User connected to WebSocket: `/ws/alerts`
- Active alert: BTC/TRY below 2,400,000
- Current price: 2,450,000

**Steps:**
1. Open WebSocket listener
2. Trigger alert by setting price to 2,350,000
3. Monitor WebSocket for message

**Expected Result:**
- WebSocket receives: `{ event: "alert.triggered", alert: {...} }`
- Message includes: alertId, symbol, alertType, targetPrice, currentPrice, triggeredAt
- UI shows notification toast (e.g., "Alert triggered: BTC crossed 2,400,000")
- User can click notification to view alert details

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-PA-011: Alert Reset After Trigger

**Feature:** Story 3.3 - Price Alerts
**Type:** Integration
**Priority:** P0

**Preconditions:**
- Alert triggered: BTC above 2,500,000 (price was 2,550,000)
- Alert.triggeredAt is set

**Steps:**
1. Price drops below threshold: 2,450,000
2. Price rises above threshold again: 2,550,000
3. Verify alert triggers again

**Expected Result:**
- Alert can trigger multiple times (not one-shot)
- Each trigger updates triggeredAt timestamp
- User receives notification each time threshold crossed
- Alert remains active until manually disabled

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-PA-012: Invalid Symbol Rejection

**Feature:** Story 3.3 - Price Alerts
**Type:** API
**Priority:** P1

**Steps:**
1. Call API: `POST /api/v1/alerts`
2. Request body: `{ symbol: "INVALID_PAIR", alertType: "above", targetPrice: "1000" }`

**Expected Result:**
- Response code: 400 Bad Request
- Error message: "Invalid symbol. Supported: BTC_TRY, ETH_TRY, USDT_TRY"
- Alert not created

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-PA-013: Invalid Price Rejection

**Feature:** Story 3.3 - Price Alerts
**Type:** API
**Priority:** P1

**Steps:**
1. Try to create alert with invalid price: -1000
2. Try with price: 0
3. Try with non-numeric price: "abc"

**Expected Result:**
- Response code: 400 Bad Request for all cases
- Error message specifies issue (negative, zero, non-numeric)
- No alerts created

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-PA-014: User Isolation - Cannot See Other User's Alerts

**Feature:** Story 3.3 - Security
**Type:** API
**Priority:** P1

**Preconditions:**
- User A has alert: alert_123 (BTC above 2,500,000)
- User B authenticated with different token

**Steps:**
1. User A: `GET /api/v1/alerts` returns alert_123
2. User B: `GET /api/v1/alerts` (should NOT see alert_123)
3. User B: Try `GET /api/v1/alerts/alert_123` (User A's alert ID)

**Expected Result:**
- User A sees only their own alerts
- User B sees empty list or only their own alerts
- Accessing other user's alert returns: 403 Forbidden or 404 Not Found

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-PA-015: Performance: API Response <50ms

**Feature:** Story 3.3 - Performance
**Type:** Performance
**Priority:** P0

**Steps:**
1. Create 100 alerts for test user
2. Call API: `GET /api/v1/alerts`
3. Measure response time
4. Repeat 10 times, calculate average

**Expected Result:**
- Average response time: <50ms
- P95 response time: <100ms
- All responses return 200 OK
- Database query uses proper indexes

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-PA-016: Concurrent Alert Creations

**Feature:** Story 3.3 - Concurrency
**Type:** Performance
**Priority:** P1

**Steps:**
1. Send 10 concurrent POST requests to create alerts
2. Each request has different alert parameters
3. Verify all succeed without conflicts

**Expected Result:**
- All 10 alerts created successfully
- No race conditions
- No duplicate alerts
- All have unique IDs
- Total time: <2 seconds for 10 requests

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-PA-017: Alert Persistence Across Sessions

**Feature:** Story 3.3 - Persistence
**Type:** Integration
**Priority:** P0

**Preconditions:**
- User creates alert: BTC above 2,500,000
- Alert ID: alert_123

**Steps:**
1. User logs out
2. User logs back in
3. Call API: `GET /api/v1/alerts`
4. Check if alert_123 is returned

**Expected Result:**
- Alert persists after logout/login cycle
- Alert settings unchanged
- Alert status preserved (active/inactive)
- User can continue managing alerts

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

## Part 2: Technical Indicators Testing (10+ Scenarios)

### Test Environment Setup
**Preconditions:**
- Market data service running (real or mocked prices)
- Technical indicators service deployed
- Redis cache operational
- Historical price data available (last 200 days minimum)

---

### TC-TI-001: SMA-20 Calculation Accuracy

**Feature:** Story 3.3 - Technical Indicators
**Type:** API
**Priority:** P0

**Preconditions:**
- Historical prices for BTC/TRY (last 20 days)
- Sample prices: [100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119]
- Expected SMA-20: 109.5 (average of all 20)

**Steps:**
1. Call API: `GET /api/v1/market/indicators/BTC_TRY?period=20&type=sma`
2. Verify SMA-20 value

**Expected Result:**
- Response code: 200 OK
- Returns SMA value: 109.5 (with 2 decimal precision)
- Calculation matches: sum(prices) / 20
- Response includes: timestamp, value, symbol, period, type

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-TI-002: SMA Variants (20, 50, 200)

**Feature:** Story 3.3 - Technical Indicators
**Type:** API
**Priority:** P0

**Steps:**
1. Call API for SMA-20: `?period=20&type=sma`
2. Call API for SMA-50: `?period=50&type=sma`
3. Call API for SMA-200: `?period=200&type=sma`

**Expected Result:**
- All three variants return successfully (200 OK)
- SMA-50 > SMA-20 (typically, in uptrend)
- SMA-200 is longer-term average
- Each calculation is accurate
- Performance: each <50ms

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-TI-003: EMA-12 Calculation

**Feature:** Story 3.3 - Technical Indicators
**Type:** API
**Priority:** P0

**Steps:**
1. Call API: `GET /api/v1/market/indicators/BTC_TRY?period=12&type=ema`
2. Verify EMA calculation (exponential weighting)

**Expected Result:**
- Returns EMA-12 value
- EMA gives more weight to recent prices
- EMA typically responds faster to price changes than SMA
- Performance: <50ms

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-TI-004: EMA-26 Calculation

**Feature:** Story 3.3 - Technical Indicators
**Type:** API
**Priority:** P0

**Steps:**
1. Call API: `?period=26&type=ema`
2. Compare with EMA-12

**Expected Result:**
- EMA-26 returns correctly
- EMA-26 typically < EMA-12 in uptrend (slower response)
- Used for MACD calculations

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-TI-005: RSI-14 Calculation (0-100 range)

**Feature:** Story 3.3 - Technical Indicators
**Type:** API
**Priority:** P0

**Steps:**
1. Call API: `?period=14&type=rsi`
2. Verify RSI value is between 0-100

**Expected Result:**
- Returns RSI value (0-100)
- RSI > 70: overbought condition
- RSI < 30: oversold condition
- RSI = 50: neutral
- Performance: <50ms

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-TI-006: MACD Calculation

**Feature:** Story 3.3 - Technical Indicators
**Type:** API
**Priority:** P0

**Steps:**
1. Call API: `?period=26&type=macd`
2. Verify response includes: MACD line, Signal line, Histogram

**Expected Result:**
- Returns object with:
  - `macdLine`: EMA-12 minus EMA-26
  - `signalLine`: EMA-9 of MACD line
  - `histogram`: MACD line minus Signal line
- All values are numeric
- Performance: <50ms

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-TI-007: Period Validation

**Feature:** Story 3.3 - Technical Indicators
**Type:** API
**Priority:** P1

**Preconditions:**
- Valid periods: 5, 10, 20, 50, 100, 200
- Invalid periods: 1, 0, -5, 300, "abc"

**Steps:**
1. Test valid periods (should all succeed)
2. Test invalid periods (should all fail)

**Expected Result:**
- Valid periods: 200 OK
- Invalid periods: 400 Bad Request
- Error message: "Invalid period. Supported: 5, 10, 20, 50, 100, 200"

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-TI-008: Type Validation

**Feature:** Story 3.3 - Technical Indicators
**Type:** API
**Priority:** P1

**Preconditions:**
- Valid types: sma, ema, rsi, macd
- Invalid types: unknown, sma2, ema-bad

**Steps:**
1. Test valid types (should all succeed)
2. Test invalid types (should all fail)

**Expected Result:**
- Valid types: 200 OK
- Invalid types: 400 Bad Request
- Error message: "Invalid type. Supported: sma, ema, rsi, macd"

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-TI-009: Insufficient Data Handling

**Feature:** Story 3.3 - Technical Indicators
**Type:** API
**Priority:** P1

**Preconditions:**
- Request SMA-200 but only 50 days of data available

**Steps:**
1. Call API: `?period=200&type=sma`

**Expected Result:**
- Response code: 400 Bad Request OR
- Response code: 200 OK with partial data warning
- Error message: "Insufficient data for SMA-200. Need 200 days, have 50."
- Clear guidance to user

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-TI-010: Cache Effectiveness (1-minute TTL)

**Feature:** Story 3.3 - Technical Indicators
**Type:** Performance
**Priority:** P0

**Steps:**
1. Call API: `?period=20&type=sma`
   - Measure response time: T1
2. Call same endpoint again within 1 minute
   - Measure response time: T2
3. Wait >1 minute, call again
   - Measure response time: T3

**Expected Result:**
- T1: ~50ms (database + calculation)
- T2: <10ms (from Redis cache)
- T3: ~50ms (cache expired, recalculates)
- Cache hit ratio: >90% for same params within TTL

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-TI-011: Real-Time Indicator Updates

**Feature:** Story 3.3 - Technical Indicators
**Type:** Integration
**Priority:** P0

**Steps:**
1. Get initial RSI-14: 45.3
2. Wait 1 minute for market update
3. Get RSI-14 again

**Expected Result:**
- RSI changes as new price data arrives
- Updates visible within 1 minute
- Historical values consistent
- No data inconsistencies

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

## Part 3: Integration Testing (8+ Scenarios)

### TC-INT-001: Story 3.1 + 3.2 + 3.3 Full Integration

**Feature:** All Trading Features
**Type:** E2E
**Priority:** P0

**Preconditions:**
- All services running (Market, Trading, Notification)
- User authenticated and KYC approved
- WebSocket connected

**Steps:**
1. User views Order Book (Story 3.1)
2. User views Ticker data (Story 3.2)
3. User sets Price Alert (Story 3.3)
4. User views Technical Indicators (Story 3.3)
5. User places Market Order
6. Wait for Order execution
7. Verify alert triggers if price crosses threshold

**Expected Result:**
- All features work together seamlessly
- Real-time data flows correctly
- Alerts trigger based on executed order prices
- No race conditions or data inconsistencies
- All notifications delivered

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-INT-002: Order Book + Ticker + Alerts

**Feature:** Integration
**Type:** E2E
**Priority:** P0

**Steps:**
1. Monitor Order Book (top bid/ask prices)
2. Monitor Ticker (last price)
3. Monitor Price Alert (set above last price)
4. Market updates order book
5. New execution at high price
6. Verify alert triggers

**Expected Result:**
- Order book updates in real-time
- Ticker reflects latest execution
- Alert triggers when price >= target
- All data consistent across components

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-INT-003: Technical Indicators Real-Time Updates

**Feature:** Integration
**Type:** E2E
**Priority:** P0

**Steps:**
1. View SMA-20 indicator: 2,500,000
2. New price arrives: 2,510,000
3. SMA recalculates
4. View updated SMA-20: should change
5. Chart updates in real-time

**Expected Result:**
- Indicators update automatically
- Chart reflects new calculations
- No manual refresh needed
- Performance acceptable (<100ms for chart render)

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-INT-004: WebSocket Channels for All Features

**Feature:** Integration
**Type:** E2E
**Priority:** P0

**Steps:**
1. Connect to `/ws/market` for order book + ticker
2. Connect to `/ws/alerts` for alert notifications
3. Connect to `/ws/indicators` for indicator updates
4. Verify separate channels don't interfere
5. Send commands on one channel, verify isolation

**Expected Result:**
- All WebSocket channels operational
- Data isolation between channels
- Messages deliver correctly to each channel
- Connection stability <99% uptime
- Auto-reconnect on disconnect

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-INT-005: Component Rendering with Real Data

**Feature:** Integration
**Type:** E2E
**Priority:** P0

**Steps:**
1. Load dashboard with all market components
2. Verify Order Book renders with real data
3. Verify Ticker shows correct prices
4. Verify Price Alerts list shows user's alerts
5. Verify Technical Indicators chart displays

**Expected Result:**
- All components render correctly
- Data is accurate
- No missing data or null values (except where expected)
- Page load time: <3 seconds
- Interactive elements respond <200ms

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-INT-006: Error Recovery Scenarios

**Feature:** Integration
**Type:** E2E
**Priority:** P0

**Preconditions:**
- Market data service available
- Redis cache available

**Steps:**
1. Simulate Redis failure:
   - Stop Redis cache
   - Call indicator endpoint
   - Verify fallback to database
2. Simulate market data delay:
   - Delay price updates by 5 seconds
   - Verify system handles gracefully
3. Simulate network interruption:
   - Disconnect WebSocket
   - Verify automatic reconnection
   - Verify data consistency after reconnect

**Expected Result:**
- Graceful degradation when cache unavailable
- Clear error messages to user
- Auto-reconnection on network issues
- Data integrity maintained after failures

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-INT-007: System Stability Under Load

**Feature:** Integration
**Type:** Performance
**Priority:** P0

**Steps:**
1. Simulate 100 concurrent users:
   - Each creates 5 alerts
   - Each views indicators (10 calls per user)
   - Total: 500 alert creations + 1000 indicator API calls
2. Monitor system resources:
   - CPU usage
   - Memory consumption
   - Database connection pool
3. Measure response times during load

**Expected Result:**
- All requests complete successfully
- Response times remain <100ms (p95)
- CPU usage: <80%
- Memory stable (no memory leaks)
- Database connections: <50/100 pool
- Error rate: <0.1%

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

### TC-INT-008: Performance SLAs Met

**Feature:** Integration
**Type:** Performance
**Priority:** P0

**Acceptance Criteria from mvp-backlog-detailed.md:**
- Price alert API: <50ms
- Technical indicators: <50ms
- WebSocket updates: <100ms
- UI render: <100ms

**Steps:**
1. Execute 100 requests for each endpoint
2. Calculate P50, P95, P99 latencies
3. Verify all meet SLA targets

**Expected Result:**
- Alert API: P95 <50ms ✅
- Indicators API: P95 <50ms ✅
- WebSocket messages: P95 <100ms ✅
- UI components: P95 <100ms ✅
- No requests exceed 2x SLA

**Actual Result:**
[To be filled]

**Status:** Not Tested

---

## Part 4: Sprint 3 Validation

### Acceptance Criteria Sign-Off

#### Story 3.1: View Order Book (Real-Time)
**Status:** ✅ VERIFIED / ❌ FAILED / ⏳ PENDING

**Acceptance Criteria Tested:**
- [ ] Order book shows bids/asks with Price, Amount, Total
- [ ] Top 20 levels each side displayed
- [ ] Real-time updates via WebSocket
- [ ] Visual bar chart showing depth
- [ ] Current spread highlighted
- [ ] User's own orders highlighted
- [ ] Aggregate view option (0.1%, 0.5%, 1%)

**Test Results:**
- Total AC: 7
- Verified: [X]
- Failed: [X]
- Status: [PASS/FAIL]

---

#### Story 3.2: View Market Data (Ticker)
**Status:** ✅ VERIFIED / ❌ FAILED / ⏳ PENDING

**Acceptance Criteria Tested:**
- [ ] Ticker shows: Last Price, 24h Change (% + absolute), 24h High/Low, Volume
- [ ] Price updates real-time (WebSocket)
- [ ] Color coding: Green (up), Red (down)
- [ ] All pairs listed on homepage
- [ ] Search/filter by symbol

**Test Results:**
- Total AC: 5
- Verified: [X]
- Failed: [X]
- Status: [PASS/FAIL]

---

#### Story 3.3: Advanced Market Data (NEW)
**Status:** ✅ VERIFIED / ❌ FAILED / ⏳ PENDING

**Acceptance Criteria Tested:**
- [ ] Price alerts: Create, List, Edit, Delete, Toggle
- [ ] Alert conditions: Above/Below threshold
- [ ] Alert triggering: Real-time evaluation
- [ ] WebSocket notifications on trigger
- [ ] Technical indicators: SMA, EMA, RSI, MACD
- [ ] Period variants: 5, 10, 20, 50, 100, 200
- [ ] Performance: <50ms for all APIs
- [ ] Caching: 1-minute TTL for indicators

**Test Results:**
- Total AC: 8
- Verified: [X]
- Failed: [X]
- Status: [PASS/FAIL]

---

### Quality Gates

#### Test Coverage
- [ ] API endpoints: >80% of AC covered
- [ ] UI components: >80% of AC covered
- [ ] Integration scenarios: >80% covered
- [ ] Edge cases: >80% covered
- **Overall Target:** >80% of acceptance criteria

**Coverage Report:**
- Total AC across Stories 3.1-3.3: 20
- AC covered by tests: [X]
- Coverage %: [X%]
- Status: PASS / FAIL

---

#### Security & Compliance
- [ ] User isolation verified (cross-user data access blocked)
- [ ] Input validation tested (invalid data rejected)
- [ ] Error messages don't leak sensitive info
- [ ] Rate limiting (if applicable) working
- [ ] No SQL injection vulnerabilities
- [ ] No XSS vulnerabilities

**Status:** [PASS/FAIL]

---

#### Performance
- [ ] Alert API: P95 <50ms ✅
- [ ] Indicator API: P95 <50ms ✅
- [ ] WebSocket: P95 <100ms ✅
- [ ] UI render: P95 <100ms ✅
- [ ] Cache hit ratio: >90% ✅

**Status:** [PASS/FAIL]

---

#### Accessibility
- [ ] WCAG 2.1 AA compliance checked (axe-core)
- [ ] Keyboard navigation tested
- [ ] Screen reader compatibility verified
- [ ] Color contrast ratios validated

**Status:** [PASS/FAIL]

---

### Critical Bugs & Blockers

**Found Issues:**
1. [BUG-###]: [Issue description]
   - Severity: Critical / High / Medium / Low
   - Status: Open / Fixed / Verified
   - Assigned to: [Agent]

[Add more as found during testing]

---

## Test Execution Summary

### Manual Testing Results

| Category | Total | Passed | Failed | Blocked |
|----------|-------|--------|--------|---------|
| Price Alerts | 15 | __ | __ | __ |
| Technical Indicators | 10 | __ | __ | __ |
| Integration | 8 | __ | __ | __ |
| **TOTAL** | **33** | **__** | **__** | **__** |

### Automated Tests Created

**Postman Collection:** `QA_EPIC3_004_Postman.json`
- Price Alert endpoints (CRUD)
- Technical Indicator endpoints
- Integration scenarios
- Performance baselines

**Cypress E2E Tests:** `cypress/e2e/story-3.3.spec.ts`
- Alert management flow
- Indicator visualization
- WebSocket notifications
- Real-time updates

---

## Sign-Off Criteria

### For QA Agent:
- [ ] All 33+ test scenarios executed
- [ ] Manual test results documented
- [ ] Automated tests created and passing
- [ ] Bugs reported (with severity + repro steps)
- [ ] Test coverage ≥80% of AC
- [ ] Postman collection validated
- [ ] Cypress tests validated
- [ ] Sign-off ready (if all pass)

### For Tech Lead:
- [ ] QA testing completed
- [ ] All critical issues resolved
- [ ] Performance SLAs verified
- [ ] Sprint 3 ready for deployment
- [ ] Documentation complete
- [ ] Final approval granted

---

## Deliverables Checklist

- [ ] Test Plan (this document)
- [ ] Test Case Results (spreadsheet or document)
- [ ] Postman Collection (JSON file)
- [ ] Cypress E2E Tests (TypeScript files)
- [ ] Bug Reports (if any)
- [ ] Sprint 3 Validation Report
- [ ] Deployment Checklist

---

## Notes & Observations

[To be filled during testing]

---

**Test Plan Created By:** QA Agent
**Date:** 2025-11-30
**Last Updated:** [Date]
**Status:** IN PROGRESS
