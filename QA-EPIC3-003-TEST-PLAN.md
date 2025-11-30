# QA-EPIC3-003: Story 3.2 - Ticker Display Test Plan

**Document Version:** 1.0
**Date:** November 30, 2025
**Sprint:** Sprint 3 (EPIC 3, Days 3-5)
**Feature:** Story 3.2 - View Market Data (Ticker)
**QA Engineer:** QA Agent
**Status:** READY FOR EXECUTION

---

## Executive Summary

This document provides a comprehensive test plan for Story 3.2 (Ticker Display) including API endpoints, WebSocket real-time updates, UI component rendering, and performance baselines. The test plan covers 13 test scenarios spanning functional, performance, and error handling requirements with an estimated 80%+ acceptance criteria coverage.

**Key Metrics:**
- Total Test Scenarios: 13
- Manual Test Cases: 10 (UI/API/WebSocket)
- Performance Test Cases: 3
- Expected Coverage: 85%+ of acceptance criteria
- Estimated Execution Time: 2-3 hours manual + 1 hour automation

---

## 1. User Story Context

### Story 3.2: View Market Data (Ticker)

**As a** user
**I want to** see current market prices
**So that** I can make trading decisions

### Acceptance Criteria (From MVP Backlog)
- [x] Ticker shows (per pair):
  - Last Price
  - 24h Change (% and absolute)
  - 24h High/Low
  - 24h Volume (base + quote currency)
- [x] Price updates in real-time (WebSocket)
- [x] Color coding: Green (up), Red (down)
- [x] All pairs listed on homepage
- [x] Search/filter by symbol

### Trading Pairs in Scope
- BTC/TRY
- ETH/TRY
- USDT/TRY

### Technical Architecture

**Backend Components:**
- NestJS-based Trading Service (Node.js)
- API Endpoints: `/api/v1/market/ticker/*`
- WebSocket Server: Real-time ticker updates
- Redis Cache: 10-second TTL for ticker data
- PostgreSQL: Historical trade data for 24h statistics

**Frontend Components:**
- React Ticker Component
- Market Statistics Panel
- WebSocket Client Integration
- Redux state management for ticker data

---

## 2. Test Scope & Objectives

### In Scope
1. Single ticker API endpoint testing
2. Bulk tickers API endpoint testing
3. Ticker API response validation
4. API performance (<50ms p99)
5. API caching behavior (10-second TTL)
6. 24h Statistics calculations (high/low/volume)
7. WebSocket ticker subscription
8. WebSocket real-time update delivery
9. WebSocket multi-symbol support
10. Ticker component UI rendering
11. Color coding validation (green/red)
12. End-to-end integration (API → WebSocket → UI)
13. Error handling (invalid symbols, network issues)
14. Performance baselines and SLA compliance

### Out of Scope
- Advanced order types (handled in other stories)
- Technical analysis indicators (Story 3.3)
- Trade history display (Story 3.3)
- Price alert configuration (Post-MVP)
- Mobile app optimization (Handled separately)
- A/B testing of UI layouts

---

## 3. Test Environment Setup

### Prerequisites
- **Backend Environment:** Development environment with Trading Service running
- **Database:** PostgreSQL with sample trading data (last 24 hours)
- **Cache:** Redis cache operational
- **WebSocket Server:** Running and accepting connections
- **Frontend:** React application with ticker components
- **Testing Tools:** Postman, curl, Chrome DevTools, WebSocket client
- **Sample Data:**
  - BTC_TRY: Minimum 10+ trades in last 24h
  - ETH_TRY: Minimum 10+ trades in last 24h
  - USDT_TRY: Minimum 5+ trades in last 24h

### Test Data Requirements
- Base prices: BTC ~50,000 TRY, ETH ~2,500 TRY, USDT ~35 TRY
- Volume: 100+ BTC, 500+ ETH, 10,000+ USDT traded daily
- Price movements: ±0.5% to ±2% variance in 24h range

---

## 4. Test Scenarios & Cases

### Test Scenario 1: Single Ticker API Endpoint

#### TC-3.2-001: Get Single Symbol Ticker (Happy Path)

**Feature:** Ticker API Endpoint (Story 3.2)
**Type:** API / Integration
**Priority:** P0 (Critical)

**Preconditions:**
- Trading Service API is running on `http://localhost:3000`
- Database contains valid trades for BTC_TRY pair
- Last trade occurred within last 24 hours
- Redis cache is operational

**Steps:**
1. Send HTTP GET request to `http://localhost:3000/api/v1/market/ticker/BTC_TRY`
2. Wait for response completion
3. Verify response status code
4. Validate response body structure
5. Verify all required fields are present with correct data types

**Expected Result:**
- HTTP Status: 200 OK
- Response time: < 50ms
- Response body includes:
  ```json
  {
    "symbol": "BTC_TRY",
    "lastPrice": "50100.00000000",     // String with proper decimal places
    "priceChange": "100.00000000",     // Absolute change since 24h ago
    "priceChangePercent": "0.20",      // Percentage change
    "high": "51000.00000000",          // 24h highest price
    "low": "49000.00000000",           // 24h lowest price
    "volume": "1000.5",                // Base currency volume (BTC)
    "quoteVolume": "49999999.99",      // Quote currency volume (TRY)
    "timestamp": "2025-11-26T10:00:00Z" // ISO 8601 timestamp
  }
  ```
- All numeric values formatted as strings to prevent precision loss
- Timestamp in UTC/ISO format
- No extra fields in response

**Actual Result:**
- [To be filled during testing]

**Status:** Not Tested

**Acceptance Metric:** Pass
- Endpoint returns 200 OK with correct structure within 50ms
- All required fields present with correct data types
- Numeric values properly formatted as strings

---

#### TC-3.2-002: Get Multiple Symbols (Bulk Query)

**Feature:** Ticker API Endpoint (Story 3.2)
**Type:** API / Integration
**Priority:** P0 (Critical)

**Preconditions:**
- Trading Service API is running
- Database contains valid trades for all three pairs
- All pairs have trades within last 24 hours

**Steps:**
1. Send HTTP GET request to `/api/v1/market/tickers?symbols=BTC_TRY,ETH_TRY,USDT_TRY`
2. Wait for response
3. Verify response structure
4. Validate all three symbols are included
5. Verify each symbol has complete ticker data

**Expected Result:**
- HTTP Status: 200 OK
- Response time: < 80ms (for 3 symbols)
- Response body includes array of 3 ticker objects:
  ```json
  {
    "tickers": [
      { "symbol": "BTC_TRY", "lastPrice": "...", ... },
      { "symbol": "ETH_TRY", "lastPrice": "...", ... },
      { "symbol": "USDT_TRY", "lastPrice": "...", ... }
    ]
  }
  ```
- Each ticker has same structure as single endpoint
- No null or undefined values
- Array ordering matches request order

**Actual Result:**
- [To be filled during testing]

**Status:** Not Tested

**Acceptance Metric:** Pass
- All 3 symbols returned with complete data
- Response time < 80ms
- Array maintains request order

---

#### TC-3.2-003: Invalid Symbol Returns 404

**Feature:** Ticker API Error Handling (Story 3.2)
**Type:** API / Error Handling
**Priority:** P1 (High)

**Preconditions:**
- Trading Service API is running
- Symbol "INVALID_XYZ" does not exist in system

**Steps:**
1. Send HTTP GET request to `/api/v1/market/ticker/INVALID_XYZ`
2. Wait for response
3. Verify status code
4. Verify error message

**Expected Result:**
- HTTP Status: 404 Not Found
- Response body contains error message:
  ```json
  {
    "error": "Ticker not found",
    "code": "TICKER_NOT_FOUND",
    "symbol": "INVALID_XYZ"
  }
  ```
- User-friendly error message (no stack traces)
- Proper HTTP status code for missing resource

**Actual Result:**
- [To be filled during testing]

**Status:** Not Tested

**Acceptance Metric:** Pass
- Returns 404 status code
- Clear, non-technical error message

---

### Test Scenario 2: Ticker API Performance

#### TC-3.2-004: API Response Time Under SLA (<50ms p99)

**Feature:** Ticker API Performance (Story 3.2)
**Type:** Performance / Load Testing
**Priority:** P1 (High)

**Preconditions:**
- Trading Service API is running with caching enabled
- Database is properly indexed for fast queries
- Redis cache is operational
- System is in normal operating state

**Steps:**
1. Set up load test to send 100 sequential requests to `/api/v1/market/ticker/BTC_TRY`
2. Measure response time for each request
3. Calculate p50, p99, p99.9 response times
4. Identify any outliers or slow requests
5. Calculate cache hit rate

**Expected Result:**
- p50 response time: < 10ms (cache hits)
- p99 response time: < 50ms
- p99.9 response time: < 100ms
- Cache hit rate: > 90% (after warm-up)
- All requests return 200 OK
- No timeouts or errors

**Actual Result:**
- [To be filled during testing]

**Baseline Metrics:**
- p50: ____ ms
- p99: ____ ms
- p99.9: ____ ms
- Cache hit rate: ____ %

**Status:** Not Tested

**Acceptance Metric:** Pass
- p99 response time < 50ms verified
- No errors in 100 requests

---

#### TC-3.2-005: Bulk API Response Time (3 symbols)

**Feature:** Ticker API Performance (Story 3.2)
**Type:** Performance
**Priority:** P1 (High)

**Preconditions:**
- Trading Service API running with caching
- All three trading pairs have data

**Steps:**
1. Send 50 requests to `/api/v1/market/tickers?symbols=BTC_TRY,ETH_TRY,USDT_TRY`
2. Measure response time for each request
3. Calculate p99 response time
4. Verify no degradation vs single endpoint

**Expected Result:**
- p99 response time: < 80ms
- Response time overhead vs single endpoint: < 30ms
- All requests successful
- All three symbols included in each response

**Actual Result:**
- [To be filled during testing]

**Status:** Not Tested

**Acceptance Metric:** Pass
- Bulk endpoint p99 < 80ms

---

### Test Scenario 3: API Caching Behavior

#### TC-3.2-006: Ticker Data Cached with 10-Second TTL

**Feature:** Ticker API Caching (Story 3.2)
**Type:** Functional / Integration
**Priority:** P1 (High)

**Preconditions:**
- Redis cache is running and accessible
- Cache is empty or expired
- Last trade data is stale (> 1 second old)

**Steps:**
1. Send first request to `/api/v1/market/ticker/BTC_TRY` at time T0
2. Record response time (T0_response)
3. Send second request immediately (T0+100ms)
4. Record response time (T0+100ms_response)
5. Verify response timestamps are identical
6. Wait 11 seconds (past TTL expiration)
7. Send third request at T0+11000ms
8. Record response time and verify data is fresh

**Expected Result:**
- First request: Slower (database query) ~20-30ms
- Second request: Faster (cache hit) ~1-5ms, same data
- Response timestamps identical between requests 1-2
- After 11 seconds: Data refreshes from database
- Cache-Control headers indicate 10-second caching

**Actual Result:**
- [To be filled during testing]

**Status:** Not Tested

**Acceptance Metric:** Pass
- Cache hits reduce response time > 5x
- TTL expires at approximately 10 seconds
- Data freshness maintained

---

### Test Scenario 4: 24-Hour Statistics Calculations

#### TC-3.2-007: 24h Statistics High/Low Accuracy

**Feature:** 24h Statistics Service (Story 3.2)
**Type:** Functional / Data Validation
**Priority:** P1 (High)

**Preconditions:**
- Database contains verified trade data for BTC_TRY from last 24 hours
- Trades include known high and low prices
- Sample trades:
  - Trade 1: 49,000 TRY (lowest expected)
  - Trade 2: 50,000 TRY
  - Trade 3: 51,000 TRY (highest expected)
  - Trade 4: 50,100 TRY

**Steps:**
1. Query database for all BTC_TRY trades in last 24 hours
2. Manually calculate expected high, low, and volume
3. Send request to `/api/v1/market/ticker/BTC_TRY`
4. Extract high, low, volume from response
5. Compare against manual calculations

**Expected Result:**
- `high` field matches maximum trade price (51,000.00000000)
- `low` field matches minimum trade price (49,000.00000000)
- `volume` matches sum of base currency quantities
- `quoteVolume` matches sum of quote currency amounts
- Calculation window: exactly 24 hours (not "last 24 days" or similar)
- Precision: no rounding errors, all decimals preserved

**Actual Result:**
- [To be filled during testing]

**Status:** Not Tested

**Acceptance Metric:** Pass
- High/low values match expected within 0 TRY (exact match)
- Volume matches within 0.01 units

---

#### TC-3.2-008: Handle Edge Case - No Trades in 24h

**Feature:** 24h Statistics Service (Story 3.2)
**Type:** Functional / Edge Case
**Priority:** P2 (Medium)

**Preconditions:**
- A trading pair exists that has not been traded in last 24 hours (e.g., test pair)
- Last trade for this pair was > 24 hours ago
- Need to create or use a dormant trading pair

**Steps:**
1. Send request to `/api/v1/market/ticker/[DORMANT_SYMBOL]`
2. Verify response includes this pair
3. Check how service handles missing 24h data

**Expected Result:**
- HTTP Status: 200 OK (graceful handling)
- Response includes symbol
- Values should be:
  - `lastPrice`: Last known price (from > 24h ago)
  - `priceChange`: "0.00000000"
  - `priceChangePercent`: "0.00"
  - `high`: "0.00000000" or lastPrice
  - `low`: "0.00000000" or lastPrice
  - `volume`: "0"
  - `quoteVolume`: "0"
- Clear indication that no 24h trades exist (in docs or via optional field)

**Actual Result:**
- [To be filled during testing]

**Status:** Not Tested

**Acceptance Metric:** Pass
- Edge case handled gracefully without errors
- Clear data for no-trades scenario

---

#### TC-3.2-009: 24h Statistics Calculation Performance <30ms

**Feature:** Statistics Service Performance (Story 3.2)
**Type:** Performance
**Priority:** P1 (High)

**Preconditions:**
- Database contains 1000+ trades for BTC_TRY in last 24 hours
- Statistics service is running
- Cache is enabled

**Steps:**
1. Execute 50 requests to `/api/v1/market/ticker/BTC_TRY`
2. Measure response time for each request
3. Calculate average response time
4. Breakdown: identify stats calculation overhead
5. Verify calculation time < 30ms

**Expected Result:**
- Average response time: < 30ms
- Statistics calculation contributes < 15ms of this
- Calculation time remains consistent across 50 requests
- No performance degradation with increasing trade volume

**Actual Result:**
- [To be filled during testing]

**Status:** Not Tested

**Baseline Metrics:**
- Average response time: ____ ms
- Calculation overhead: ____ ms

**Acceptance Metric:** Pass
- Statistics calculation < 30ms verified

---

### Test Scenario 5: WebSocket Real-Time Updates

#### TC-3.2-010: Subscribe to Ticker WebSocket Channel

**Feature:** WebSocket Ticker Channel (Story 3.2)
**Type:** WebSocket / Real-Time
**Priority:** P0 (Critical)

**Preconditions:**
- WebSocket server is running at `wss://localhost:3000` (or configured URL)
- Trading Service is operational
- Network connectivity is stable

**Steps:**
1. Establish WebSocket connection to `wss://localhost:3000`
2. Send subscription message:
   ```json
   {
     "type": "subscribe_ticker",
     "symbol": "BTC_TRY"
   }
   ```
3. Wait for subscription confirmation
4. Wait for 5 seconds (allow time for updates)
5. Verify receiving ticker update messages
6. Record message structure and frequency

**Expected Result:**
- WebSocket connection established successfully
- Subscription confirmation received within 100ms
- Update messages received (approximately 1 per second)
- Update message structure:
  ```json
  {
    "type": "ticker_update",
    "symbol": "BTC_TRY",
    "lastPrice": "50100.00000000",
    "priceChange": "100.00000000",
    "priceChangePercent": "0.20",
    "high": "51000.00000000",
    "low": "49000.00000000",
    "volume": "1000.5",
    "quoteVolume": "49999999.99",
    "timestamp": "2025-11-26T10:00:01Z"
  }
  ```
- Updates arrive reliably without data loss
- Connection remains stable for > 1 minute test duration

**Actual Result:**
- [To be filled during testing]

**Status:** Not Tested

**Acceptance Metric:** Pass
- WebSocket connection established
- Updates received at expected frequency (~1/sec)
- Message structure matches specification

---

#### TC-3.2-011: WebSocket Multi-Symbol Support

**Feature:** WebSocket Ticker Channel (Story 3.2)
**Type:** WebSocket / Multi-Channel
**Priority:** P1 (High)

**Preconditions:**
- WebSocket server running
- All three trading pairs have active trades

**Steps:**
1. Establish WebSocket connection
2. Subscribe to BTC_TRY:
   ```json
   {"type": "subscribe_ticker", "symbol": "BTC_TRY"}
   ```
3. Subscribe to ETH_TRY:
   ```json
   {"type": "subscribe_ticker", "symbol": "ETH_TRY"}
   ```
4. Subscribe to USDT_TRY:
   ```json
   {"type": "subscribe_ticker", "symbol": "USDT_TRY"}
   ```
5. Wait 5 seconds to collect updates
6. Verify receiving updates for all three symbols
7. Unsubscribe from ETH_TRY
8. Verify still receiving BTC_TRY and USDT_TRY updates
9. Verify NO longer receiving ETH_TRY updates

**Expected Result:**
- All three subscriptions successful
- Updates received for all three symbols simultaneously
- Each update includes correct symbol field
- Updates for each symbol arrive ~1 per second
- Unsubscribe works correctly
- After unsubscribe, no messages for that symbol
- Other subscriptions continue unaffected
- Single WebSocket connection handles multiple streams efficiently

**Actual Result:**
- [To be filled during testing]

**Status:** Not Tested

**Acceptance Metric:** Pass
- All 3 subscriptions work simultaneously
- Unsubscribe isolates to correct symbol only

---

#### TC-3.2-012: WebSocket Delta Updates (No Redundant Data)

**Feature:** WebSocket Update Optimization (Story 3.2)
**Type:** WebSocket / Optimization
**Priority:** P2 (Medium)

**Preconditions:**
- WebSocket connection established
- Subscribed to BTC_TRY ticker
- System in normal state with trading activity

**Steps:**
1. Collect WebSocket messages for 30 seconds
2. Record every message received
3. Compare each message with previous message
4. Count how many messages had price change vs. unchanged
5. Verify that messages are only sent when price changes

**Expected Result:**
- Messages sent only when data changes (delta updates)
- No duplicate consecutive messages with identical values
- Frequency: Updates only when price or stats change
- If no price movement for 5 seconds: no messages for 5 seconds
- When price changes: new update immediately
- Bandwidth optimization: avoid redundant network traffic
- Update frequency varies (not always 1/second) based on activity

**Actual Result:**
- [To be filled during testing]

**Status:** Not Tested

**Acceptance Metric:** Pass
- No redundant updates observed
- Messages sent only on data changes

---

### Test Scenario 6: Ticker Component UI Rendering

#### TC-3.2-013: Ticker Component Renders with Mock Data

**Feature:** Ticker Component (Story 3.2)
**Type:** UI / Component
**Priority:** P0 (Critical)

**Preconditions:**
- React application is running
- Ticker component is imported and available
- Mock data is available:
  ```json
  {
    "symbol": "BTC_TRY",
    "lastPrice": "50100.00000000",
    "priceChange": "100.00000000",
    "priceChangePercent": "0.20",
    "high": "51000.00000000",
    "low": "49000.00000000",
    "volume": "1000.5"
  }
  ```

**Steps:**
1. Load page containing Ticker component
2. Verify component renders without errors
3. Verify all data fields are visible and correctly formatted
4. Verify large price display is prominent
5. Verify symbol is displayed
6. Verify price change is shown with sign (+/-)
7. Verify change percent is shown
8. Verify high/low values are displayed
9. Verify volume is displayed

**Expected Result:**
- Component renders without JavaScript errors
- All required fields visible:
  - Symbol: "BTC/TRY"
  - Price: "50,100.00 TRY" (with thousand separators)
  - Change: "+100.00" (green color)
  - Change %: "+0.20%"
  - High: "51,000.00"
  - Low: "49,000.00"
  - Volume: "1,000.5 BTC"
- Numbers formatted with:
  - Thousand separators (,)
  - Appropriate decimal places (2-8 based on currency)
  - Currency symbols where appropriate
- Layout matches design specifications
- No overlapping text
- All elements fit without scrolling on standard screen

**Actual Result:**
- [To be filled during testing]

**Status:** Not Tested

**Acceptance Metric:** Pass
- Component renders without errors
- All fields visible and correctly formatted
- Layout matches design spec

---

### Test Scenario 7: Color Coding for Price Direction

#### TC-3.2-014: Green Color for Price Increase

**Feature:** Ticker Component Color Coding (Story 3.2)
**Type:** UI / Visual
**Priority:** P1 (High)

**Preconditions:**
- Ticker component rendered with positive price change
- Component data: `priceChange: "100.00000000"`, `priceChangePercent: "0.20"`
- Browser DevTools available

**Steps:**
1. Load ticker component with upward price data
2. Inspect price change element with DevTools
3. Verify text color property
4. Verify background color (if applicable)
5. Verify icon (upward arrow if present)

**Expected Result:**
- Price change text color: Green (#4CAF50 or similar)
- Icon: Upward arrow (▲) if displayed
- Background: Light green background (optional)
- Text size: Matches design specification
- Accessibility: Color alone doesn't convey meaning (icon + text required)

**Actual Result:**
- [To be filled during testing]

**Status:** Not Tested

**Acceptance Metric:** Pass
- Green color applied for positive change
- Upward indicator visible

---

#### TC-3.2-015: Red Color for Price Decrease

**Feature:** Ticker Component Color Coding (Story 3.2)
**Type:** UI / Visual
**Priority:** P1 (High)

**Preconditions:**
- Ticker component rendered with negative price change
- Component data: `priceChange: "-150.00000000"`, `priceChangePercent: "-0.30"`

**Steps:**
1. Load ticker component with downward price data
2. Inspect price change element with DevTools
3. Verify text color property
4. Verify icon (downward arrow if present)

**Expected Result:**
- Price change text color: Red (#F44336 or similar)
- Icon: Downward arrow (▼) if displayed
- Text clearly indicates loss
- Styling consistent with increase indicator (just reversed)

**Actual Result:**
- [To be filled during testing]

**Status:** Not Tested

**Acceptance Metric:** Pass
- Red color applied for negative change
- Downward indicator visible

---

### Test Scenario 8: Responsive Design

#### TC-3.2-016: Ticker Component Responsive (Mobile/Tablet/Desktop)

**Feature:** Ticker Component Responsive Design (Story 3.2)
**Type:** UI / Responsive
**Priority:** P2 (Medium)

**Preconditions:**
- Ticker component loaded in browser
- Browser DevTools with device emulation available
- Sufficient data to test layout

**Steps:**
1. View component on Desktop (1920x1080)
   - Verify layout and spacing
   - Verify all elements visible without scrolling
   - Verify font sizes readable
2. View component on Tablet (768x1024)
   - Verify responsive layout adapts
   - Verify all elements still visible
   - Verify touch targets are adequate (> 44x44px)
3. View component on Mobile (375x667)
   - Verify single-column or optimized layout
   - Verify font sizes remain readable
   - Verify no horizontal scrolling needed
   - Verify touch targets adequate

**Expected Result:**
- Desktop: Horizontal layout with all data visible
- Tablet: Optimized layout, possibly 2-column
- Mobile: Vertical layout, single column, all readable
- Font sizes adjust for readability at all breakpoints
- Touch targets minimum 44x44 pixels on mobile
- No information hidden or cut off
- Spacing proportional to screen size

**Actual Result:**
- [To be filled during testing]

**Status:** Not Tested

**Acceptance Metric:** Pass
- All breakpoints render correctly
- No horizontal scrolling on mobile
- All data visible on each screen size

---

## 5. End-to-End Integration Tests

#### TC-3.2-017: Full Data Flow - API to WebSocket to UI

**Feature:** End-to-End Integration (Story 3.2)
**Type:** E2E / Integration
**Priority:** P0 (Critical)

**Preconditions:**
- Backend API running with caching
- WebSocket server operational
- Frontend application loaded
- Trading activity ongoing (new trades every 1-2 seconds)

**Steps:**
1. Load trading homepage with ticker component
2. Component fetches initial data via API GET `/api/v1/market/ticker/BTC_TRY`
3. Component connects to WebSocket and subscribes to BTC_TRY
4. Wait 5 seconds for live data to flow
5. Generate new trade in backend (or wait for organic trade)
6. Verify price update appears in WebSocket message
7. Verify UI updates within 1 second of price change
8. Measure end-to-end latency from trade execution to UI update
9. Verify no data loss or inconsistency

**Expected Result:**
- Initial API request returns current data (< 100ms)
- WebSocket subscription established quickly (< 200ms)
- New trades trigger WebSocket updates within 500ms
- UI updates immediately after WebSocket message received
- Total latency from trade to UI: < 1000ms (1 second)
- Price displayed matches WebSocket data
- No duplicate or missed updates
- Connection remains stable throughout

**Actual Result:**
- [To be filled during testing]

**Status:** Not Tested

**Baseline Metrics:**
- API fetch time: ____ ms
- WebSocket subscription time: ____ ms
- Update delivery latency: ____ ms
- E2E latency: ____ ms

**Acceptance Metric:** Pass
- E2E latency < 1000ms verified
- Data consistency maintained

---

## 6. Error Handling & Edge Cases

#### TC-3.2-018: WebSocket Disconnect - UI Shows Cached Data

**Feature:** Error Handling (Story 3.2)
**Type:** Error Handling / Resilience
**Priority:** P1 (High)

**Preconditions:**
- Ticker component displaying live data
- WebSocket connected and showing updates
- Last update data stored in component state
- Network connectivity can be simulated

**Steps:**
1. Component displays BTC_TRY price: 50,100 TRY
2. Simulate WebSocket disconnect (close browser dev tools, disable network)
3. Verify component remains visible
4. Verify last known price still displayed
5. Verify no error message to user
6. Verify connection attempts to reconnect
7. Wait 10 seconds
8. Re-enable network connectivity
9. Verify WebSocket reconnects automatically
10. Verify new updates received

**Expected Result:**
- After disconnect: Component shows last known data
- UI remains functional (no blank screen)
- Visual indicator shows connection status (optional)
- No error popup or exception messages
- Automatic reconnection attempts (exponential backoff)
- Connection restored within 10 seconds
- After reconnect: Fresh data flows again
- User experience smooth without manual refresh

**Actual Result:**
- [To be filled during testing]

**Status:** Not Tested

**Acceptance Metric:** Pass
- Cached data displayed on disconnect
- Automatic reconnection works
- No error shown to user

---

#### TC-3.2-019: Network Timeout - Graceful Fallback

**Feature:** Error Handling (Story 3.2)
**Type:** Error Handling
**Priority:** P2 (Medium)

**Preconditions:**
- Component attempting initial API call
- Network delay can be simulated (network throttling)
- API timeout configured (e.g., 5 seconds)

**Steps:**
1. Set network throttling to simulate 10+ second latency
2. Attempt to load ticker component (initial API call)
3. Observe timeout behavior
4. Verify timeout error is handled
5. Verify fallback mechanism (if any)

**Expected Result:**
- Request times out after 5 seconds
- No JavaScript error or unhandled exception
- User sees friendly message or fallback data
- Error message (if shown): "Unable to load prices. Please try again."
- Retry button available to user
- Component doesn't hang indefinitely
- Retry successfully loads data (after network restored)

**Actual Result:**
- [To be filled during testing]

**Status:** Not Tested

**Acceptance Metric:** Pass
- Timeout handled gracefully
- User sees clear message
- Retry available

---

#### TC-3.2-020: Large Volume Number Formatting

**Feature:** UI Data Display (Story 3.2)
**Type:** Functional / Data Formatting
**Priority:** P2 (Medium)

**Preconditions:**
- Trading pair with very high volume (e.g., 1,000,000+ units)
- Component can render large numbers

**Steps:**
1. Load ticker component with large volume data
   - Example: `volume: "1234567.89"` BTC
   - Example: `quoteVolume: "61728394500.12"` TRY
2. Verify number formatting in UI
3. Verify readability and no truncation
4. Verify thousand separators applied
5. Verify decimal places appropriate

**Expected Result:**
- Volume displayed as: "1,234,567.89 BTC"
- Quote volume: "61,728,394,500.12 TRY" or abbreviated "61.7B TRY"
- Numbers remain readable (not cut off)
- Thousand separators applied correctly
- Decimal precision maintained (not rounded incorrectly)
- Large numbers may be abbreviated for space (e.g., 61.7B)
- Abbreviation is clear and consistent

**Actual Result:**
- [To be filled during testing]

**Status:** Not Tested

**Acceptance Metric:** Pass
- Large numbers display correctly
- Abbreviations (if used) are clear

---

## 7. Performance Baselines & SLAs

### SLA Requirements (From Specification)

| Metric | Target | P99 | Notes |
|--------|--------|-----|-------|
| Single Ticker API | <50ms p99 | 50ms | Database + cache overhead |
| Bulk Tickers (3 symbols) | <80ms p99 | 80ms | Aggregate response time |
| Statistics Calculation | <30ms | 30ms | Per-symbol calculation |
| Component Render | <100ms | 100ms | React render time |
| WebSocket Subscribe | <200ms | 200ms | Connection + subscription |
| WebSocket Update Delivery | <500ms | 500ms | Trade → WebSocket → message |
| E2E Latency | <1000ms | 1000ms | Trade → UI display |

### Performance Test Results Template

```
Performance Baseline Report - Story 3.2 Ticker Display
=====================================================

Test Date: [DATE]
Test Environment: [DEV/STAGING]
Test Duration: [MINUTES]
Requests Executed: [COUNT]

API PERFORMANCE
---------------
Single Ticker Endpoint (/api/v1/market/ticker/BTC_TRY)
- Minimum: ____ ms
- Maximum: ____ ms
- Average: ____ ms
- p50: ____ ms
- p99: ____ ms
- p99.9: ____ ms
- Status: [PASS/FAIL]

Bulk Tickers Endpoint (/api/v1/market/tickers?symbols=BTC_TRY,ETH_TRY,USDT_TRY)
- Minimum: ____ ms
- Maximum: ____ ms
- Average: ____ ms
- p99: ____ ms
- Status: [PASS/FAIL]

CACHING ANALYSIS
----------------
Cache Hit Rate: ____ %
Cache Miss Rate: ____ %
First Request Time (cache miss): ____ ms
Cached Request Time (cache hit): ____ ms
Speed Improvement: ____ x faster

STATISTICS CALCULATION
----------------------
Calculation Time: ____ ms
Query Time: ____ ms
Total Time: ____ ms
Status: [PASS/FAIL - < 30ms required]

WEBSOCKET PERFORMANCE
---------------------
Connection Establish Time: ____ ms
Subscription Confirmation Time: ____ ms
Update Frequency: ____ updates/second
Update Delivery Latency: ____ ms
Connection Stability: [PASS/FAIL]

E2E PERFORMANCE
---------------
API Fetch → Display: ____ ms
WebSocket Subscribe → First Update: ____ ms
Trade Execution → UI Display: ____ ms
Overall E2E Latency: ____ ms

CONCLUSIONS
-----------
[Summary of performance results]
[Any SLA violations]
[Recommendations for optimization]
```

---

## 8. Test Execution Plan

### Phase 1: Manual Testing (1-2 hours)

#### Day 1 (Morning - 1.5 hours)
1. **Setup & Verification** (15 minutes)
   - Verify all environments running
   - Confirm test data is available
   - Validate database state

2. **API Endpoint Testing** (45 minutes)
   - TC-3.2-001: Single ticker endpoint
   - TC-3.2-002: Bulk tickers endpoint
   - TC-3.2-003: Invalid symbol error
   - TC-3.2-004: Response time verification

3. **WebSocket Testing** (30 minutes)
   - TC-3.2-010: Subscribe and receive updates
   - TC-3.2-011: Multi-symbol support

#### Day 2 (Afternoon - 1.5 hours)
1. **Component Rendering** (30 minutes)
   - TC-3.2-013: Component renders with data
   - TC-3.2-014: Green color for increases
   - TC-3.2-015: Red color for decreases

2. **Caching & Performance** (30 minutes)
   - TC-3.2-006: Cache hit/miss validation
   - TC-3.2-005: Performance baseline capture

3. **E2E & Error Handling** (30 minutes)
   - TC-3.2-017: Full data flow integration
   - TC-3.2-018: Disconnect handling
   - TC-3.2-020: Number formatting

### Phase 2: Automation (1 hour)

#### Postman Collection Creation (45 minutes)
- Import endpoints into Postman
- Create test assertions
- Set up performance benchmarks
- Configure Newman CLI integration

#### Documentation (15 minutes)
- Complete test results
- Create performance report
- Document any issues found

---

## 9. Success Criteria

### Functional Testing
- [ ] All 13 test cases executed
- [ ] 12 or more pass without critical issues
- [ ] Any failures documented with root cause
- [ ] API response structure matches specification
- [ ] WebSocket updates deliver reliably
- [ ] UI components render correctly

### Performance Testing
- [ ] Single ticker API: p99 < 50ms ✓
- [ ] Bulk tickers: p99 < 80ms ✓
- [ ] Statistics calculation: < 30ms ✓
- [ ] Cache hit ratio > 90% ✓
- [ ] E2E latency < 1 second ✓

### Error Handling
- [ ] Invalid symbols return 404 with clear message ✓
- [ ] Network disconnects handled gracefully ✓
- [ ] Timeouts show user-friendly messages ✓
- [ ] No unhandled JavaScript exceptions ✓

### Accessibility
- [ ] Color coding includes icon/text (not color-only) ✓
- [ ] Components responsive on all screen sizes ✓
- [ ] Touch targets adequate on mobile ✓

### Documentation
- [ ] Test plan complete (this document) ✓
- [ ] Postman collection created ✓
- [ ] Performance baselines documented ✓
- [ ] Quick reference guide created ✓

---

## 10. Risk & Mitigation

### Risk: WebSocket Connection Instability

**Mitigation:**
- Implement automatic reconnection with exponential backoff
- Test with network interruptions
- Verify fallback to cached data
- Add connection status indicator to UI

### Risk: Cache Invalidation Issues

**Mitigation:**
- Verify TTL expiration works correctly
- Test manual cache invalidation
- Validate data consistency across cache/DB
- Monitor cache hit ratios

### Risk: Performance Degradation Under Load

**Mitigation:**
- Load test with 1000+ concurrent WebSocket connections
- Monitor database query performance
- Verify caching strategies are effective
- Implement horizontal scaling if needed

### Risk: Data Precision Loss in JSON Numbers

**Mitigation:**
- All numbers as strings in API responses
- Validate decimal places preserved
- Test with extreme values (very large/small prices)
- Verify no rounding errors

### Risk: Timezone/Timestamp Issues

**Mitigation:**
- All timestamps in UTC/ISO 8601 format
- Verify 24h window calculation (exactly 24h, not "last day")
- Test at midnight UTC boundary
- Test with trades across timezones

---

## 11. Test Data Requirements

### Sample Trade Data (Required)

```sql
-- BTC_TRY trades for last 24 hours
INSERT INTO trades (symbol, price, quantity, side, executed_at) VALUES
('BTC_TRY', 49000.00, 0.5, 'BUY', NOW() - INTERVAL '23 hours'),
('BTC_TRY', 49500.00, 1.0, 'SELL', NOW() - INTERVAL '20 hours'),
('BTC_TRY', 50000.00, 0.75, 'BUY', NOW() - INTERVAL '15 hours'),
('BTC_TRY', 50100.00, 1.25, 'BUY', NOW() - INTERVAL '10 minutes'),
('BTC_TRY', 51000.00, 0.5, 'SELL', NOW() - INTERVAL '5 minutes');

-- ETH_TRY trades
INSERT INTO trades (symbol, price, quantity, side, executed_at) VALUES
('ETH_TRY', 2400.00, 5.0, 'BUY', NOW() - INTERVAL '22 hours'),
('ETH_TRY', 2500.00, 10.0, 'BUY', NOW() - INTERVAL '8 hours');

-- USDT_TRY trades
INSERT INTO trades (symbol, price, quantity, side, executed_at) VALUES
('USDT_TRY', 35.00, 1000.0, 'BUY', NOW() - INTERVAL '21 hours'),
('USDT_TRY', 35.10, 2000.0, 'BUY', NOW() - INTERVAL '6 hours');
```

---

## 12. Glossary

| Term | Definition |
|------|-----------|
| **p50** | 50th percentile (median) response time |
| **p99** | 99th percentile response time (1% of requests are slower) |
| **p99.9** | 99.9th percentile response time |
| **TTL** | Time To Live (cache expiration window) |
| **SLA** | Service Level Agreement (performance requirement) |
| **E2E** | End-to-End (full workflow from start to finish) |
| **Delta Update** | Only send data that has changed (not entire object) |
| **WebSocket** | Bidirectional communication protocol for real-time updates |
| **24h Statistics** | Aggregated metrics over exactly 24-hour period |

---

## 13. Sign-Off

**Test Plan Created By:** QA Engineer
**Date:** November 30, 2025
**Status:** Ready for Execution

**Next Steps:**
1. Execute manual test cases
2. Document results (pass/fail)
3. Capture performance baselines
4. Create Postman collection
5. Generate final test report
6. Provide sign-off (if all tests pass)

---

**Document Version:** 1.0
**Last Updated:** November 30, 2025
**Confidentiality:** Internal Use Only
