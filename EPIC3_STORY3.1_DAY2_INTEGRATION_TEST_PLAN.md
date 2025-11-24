# Story 3.1 (Day 2): Integration Testing Plan - Depth Chart & User Order Highlighting

**Document Version:** 2.0 (Day 2 Continuation)
**Last Updated:** 2025-11-25
**Test Lead:** QA Agent
**Feature:** Order Book Depth Chart & User Order Highlighting (Story 3.1 Day 2)
**Epic:** EPIC 3 - Trading Engine
**Priority:** P0 (Critical)
**Sprint:** Sprint 3 (Days 2-5)
**Story Points:** 1.0 (QA portion)

---

## Executive Summary

This document outlines the integration test plan for **Day 2 of Story 3.1**, focusing on advanced features built on the Day 1 foundation:

1. **Depth Chart API Endpoint** - Enhanced orderbook data for visualization
2. **Depth Chart Component Rendering** - Visual display with real-time updates
3. **User Order Highlighting** - Real-time highlighting of user's own orders
4. **Trade Engine Integration** - Live service usage (no mocking)
5. **Fallback Behavior** - Graceful degradation when services unavailable
6. **Chart Features** - Zoom, pan, aggregate, export capabilities
7. **Performance Baselines** - SLA verification for all operations
8. **Error Scenarios** - Comprehensive error handling tests

**Test Coverage Goals:**
- 100% of Day 2 acceptance criteria coverage
- 8+ distinct test scenarios
- Happy path + error cases + edge cases
- Performance baseline establishment (<50ms API p99, <100ms component render)
- WebSocket real-time validation
- Responsive design verification

---

## Scope

### In Scope (Day 2 Specific)
- `GET /api/v1/market/orderbook/:symbol/depth-chart` endpoint
- Depth chart component rendering (React/Recharts)
- User order highlighting service
- Real Trade Engine integration (live service)
- Fallback strategies (cached data when service down)
- Chart zoom, pan, export features
- Real-time WebSocket updates to depth chart
- Performance testing (API, component render, service latency)
- Error handling (timeout, connection down, invalid symbol)
- Mobile/tablet/desktop responsive design

### Out of Scope
- Day 1 orderbook tests (TC-001 to TC-030 already covered)
- Advanced aggregation algorithms beyond 0.1%, 0.5%, 1%
- Load testing beyond baseline (1000+ order books)
- Proprietary trading analytics
- Mobile app WebSocket (delegated to mobile QA)

---

## Acceptance Criteria Mapping

| AC # | Acceptance Criteria | Test Scenario ID | Type |
|------|---------------------|------------------|------|
| 1 | Depth Chart API Endpoint - Response structure, cumulative volumes, spread | TS-001, TS-002 | API/Functional |
| 2 | Depth Chart Component Rendering - Display levels, colors, hover, responsive | TS-003, TS-004 | UI/Component |
| 3 | User Order Highlighting - Real-time updates, correct prices, volumes | TS-005, TS-006 | Functional/Real-time |
| 4 | Trade Engine Integration - Real service, live data, <100ms latency | TS-007 | Integration |
| 5 | Fallback Behavior - Cache, error messages, retry logic | TS-008 | Error Handling |
| 6 | Chart Features - Zoom, pan, aggregate, export, legend | TS-009, TS-010 | UI/Features |
| 7 | Performance Baselines - <50ms API p99, <100ms render, <20ms highlighting | TS-011 | Performance |
| 8 | Error Scenarios - Invalid symbol, timeout, connection down, large orders | TS-012, TS-013 | Error Handling |

---

## Test Environment Requirements

### Services
- **Trade Engine:** Go service running on `http://localhost:8080` (or configured URL)
- **Backend API:** NestJS on port 8080
- **Frontend:** React dev server on port 3000
- **Redis Cache:** localhost:6379 (for data caching)
- **PostgreSQL:** localhost:5432 (order storage)
- **WebSocket:** ws://localhost:8080/ws/orderbook

### Testing Tools
- **API Testing:** Postman, Newman (CLI), curl
- **Performance Testing:** Custom timing script, k6 (optional)
- **E2E Testing:** Cypress
- **Component Testing:** React Testing Library, Jest
- **Browser Testing:** Chrome/Firefox (desktop, tablet, mobile viewport)

### Test Data Requirements
- **BTC_TRY, ETH_TRY, USDT_TRY** order books with 50+ levels each
- **Sample user orders** at specific price levels for highlighting
- **Cumulative volume calculations** validated against manual calculation

---

## Test Scenarios (8+ Required)

### Test Scenario 1: Depth Chart API Endpoint - Response Structure & Data Validation

**ID:** TS-001
**Type:** API / Functional Testing
**Priority:** P0 (Critical)
**Feature:** Depth Chart API Enhancement
**Duration:** 15 minutes

**Preconditions:**
- Trade Engine service running with active order books
- BTC_TRY, ETH_TRY, USDT_TRY have sufficient depth (50+ levels)
- Redis cache operational

**Steps:**
1. Execute GET request to `/api/v1/market/orderbook/BTC_TRY/depth-chart`
2. Verify response structure and all required fields
3. Validate cumulative volume calculations
4. Check spread percentage calculation
5. Verify maximum 50 levels per side

**Expected Results:**

```json
{
  "symbol": "BTC_TRY",
  "bids": [
    {
      "price": "50000",
      "volume": "10.5",
      "cumulative": "10.5",
      "percentage": 45
    },
    {
      "price": "49990",
      "volume": "8.3",
      "cumulative": "18.8",
      "percentage": 80
    }
  ],
  "asks": [
    {
      "price": "50100",
      "volume": "5.2",
      "cumulative": "5.2",
      "percentage": 22
    }
  ],
  "spread": {
    "value": "100",
    "percentage": "0.20%"
  },
  "maxBidVolume": "10.5",
  "maxAskVolume": "12.1",
  "timestamp": "2025-11-25T10:00:00Z"
}
```

**Validation Points:**
- HTTP 200 OK response
- All required fields present: symbol, bids, asks, spread, maxBidVolume, maxAskVolume, timestamp
- Bid array has exactly 50 or fewer levels
- Ask array has exactly 50 or fewer levels
- Cumulative volumes correct (each level = sum of its volume + all better prices)
- Percentage = (volume / maxVolume) * 100, correctly calculated
- Spread = best_ask - best_bid
- Timestamp in ISO 8601 format
- Response time < 50ms p99

**Test Data:**
```
BTC_TRY: bids [50000, 49990, 49980...], asks [50100, 50110, 50120...]
```

**Actual Results:**
[To be filled during testing]

**Status:** Not Tested

**Screenshots:**
[Postman response, timing, calculation verification]

---

### Test Scenario 2: Depth Chart API Performance & Caching

**ID:** TS-002
**Type:** Performance / Caching Testing
**Priority:** P0 (Critical)
**Feature:** Depth Chart API Performance
**Duration:** 20 minutes

**Preconditions:**
- Depth Chart API endpoint working
- Redis cache configured with 5-second TTL
- Performance measurement tools ready

**Steps:**
1. Clear Redis cache for BTC_TRY
2. Execute GET `/api/v1/market/orderbook/BTC_TRY/depth-chart` 100 times sequentially
3. Measure response time for each request
4. Calculate p99, p95, mean latencies
5. Verify cache hit ratio
6. Verify Redis cache stores results

**Expected Results:**
- **First request (cache miss):** 50-100ms
- **Subsequent requests (cache hit):** < 20ms
- **P99 latency:** < 50ms
- **Mean latency:** < 30ms
- **Cache hit ratio:** > 99%
- **Response header includes** `X-Cache: HIT` or `X-Cache: MISS`

**Performance Metrics to Record:**
```
Metric              Target      Actual
────────────────────────────────────
Min Latency         < 10ms      [X]ms
Mean Latency        < 30ms      [X]ms
P50 Latency         < 30ms      [X]ms
P95 Latency         < 45ms      [X]ms
P99 Latency         < 50ms      [X]ms
Max Latency         < 100ms     [X]ms
Cache Hit Ratio     > 99%       [X]%
```

**Actual Results:**
[To be filled during testing]

**Status:** Not Tested

**Screenshots:**
[Performance graph, latency distribution, cache statistics]

---

### Test Scenario 3: Depth Chart Component Rendering - Basic Display

**ID:** TS-003
**Type:** UI / Component Testing
**Priority:** P0 (Critical)
**Feature:** Depth Chart Component
**Duration:** 20 minutes

**Preconditions:**
- Frontend development environment running
- React component `DepthChartComponent.tsx` implemented
- Mock depth chart data available
- Browser DevTools open for inspection

**Steps:**
1. Navigate to Trading page with BTC_TRY pair selected
2. Wait for depth chart to render
3. Verify component displays without errors
4. Inspect rendered DOM structure
5. Verify chart displays all data levels
6. Check color coding (green bids, red asks)
7. Verify hover tooltips show price and volume
8. Check responsive layout (desktop view)

**Expected Results:**

**Visual Elements:**
- Depth chart renders as SVG/Canvas element
- Chart has labeled X-axis (prices) and Y-axis (cumulative volumes)
- Green shaded area for bids (below midpoint)
- Red shaded area for asks (above midpoint)
- Hover tooltip shows: Price | Volume | Cumulative
- Legend visible showing "Bids" (green) and "Asks" (red)
- Grid lines visible for reference

**Data Display:**
- All 50 price levels visible in chart
- Chart correctly represents cumulative volumes
- Spread clearly marked between bid and ask curves
- Tooltip updates correctly on mouse movement
- No console errors or warnings

**Performance:**
- Chart renders in < 100ms
- Smooth interaction (no jank on hover)
- No memory leaks detected

**Actual Results:**
[To be filled during testing]

**Status:** Not Tested

**Screenshots:**
[Chart rendering, hover tooltip, element inspector, console output]

---

### Test Scenario 4: Depth Chart Responsive Design - Mobile, Tablet, Desktop

**ID:** TS-004
**Type:** UI / Responsive Design Testing
**Priority:** P1 (High)
**Feature:** Depth Chart Responsiveness
**Duration:** 15 minutes

**Preconditions:**
- Depth chart component fully rendered
- Browser DevTools with responsive mode available
- Test on Chrome/Firefox/Safari

**Viewport Sizes:**
```
Desktop:  1920x1080, 1366x768, 1024x768
Tablet:   768x1024 (iPad), 600x800 (Android)
Mobile:   375x667 (iPhone), 360x640 (Android)
```

**Steps (Desktop):**
1. View depth chart at 1920x1080 resolution
2. Verify chart width extends to fill container
3. Verify chart height proportional (e.g., 400px)
4. Check axis labels readable
5. Verify legend positioned correctly

**Steps (Tablet):**
1. Resize browser to 768x1024
2. Verify chart remains visible and functional
3. Check touch hover functionality (if applicable)
4. Verify responsive adjustments
5. Check if height adjusted for smaller viewport

**Steps (Mobile):**
1. Resize to 375x667
2. Verify chart stacks vertically with orderbook
3. Check chart still shows depth (may scroll horizontally)
4. Verify touch interactions work
5. Check text remains readable
6. Verify no horizontal scroll issues

**Expected Results:**

**Desktop (1920x1080):**
- Chart takes 60-80% of container width
- Height approximately 400-500px
- Axis labels clear and readable
- Legend positioned above or below chart
- Hover tooltips positioned within viewport

**Tablet (768x1024):**
- Chart adjusts to 50-70% width
- Height reduced to 300-400px
- Text still readable
- All interactive elements accessible
- No overflow or clipping

**Mobile (375x667):**
- Chart stacks vertically with orderbook
- Chart height 200-300px
- Width fills available space
- Able to scroll if needed
- Touch-friendly hover zones (no tiny tooltips)
- No horizontal scroll issues

**Actual Results:**
[To be filled during testing - document for each viewport]

**Status:** Not Tested

**Screenshots:**
[Desktop, tablet, mobile views - with responsive layout visible]

---

### Test Scenario 5: User Order Highlighting - Real-Time Updates

**ID:** TS-005
**Type:** Functional / Real-Time Testing
**Priority:** P0 (Critical)
**Feature:** User Order Highlighting
**Duration:** 25 minutes

**Preconditions:**
- User logged in and authenticated
- User has open orders in BTC_TRY at specific price levels
- WebSocket connection established
- Order book displaying

**User's Test Orders:**
```
BTC_TRY:
- Buy order at 49990: 1.5 BTC
- Buy order at 49980: 2.3 BTC
- Sell order at 50100: 0.8 BTC
```

**Steps:**
1. Load trading page with BTC_TRY
2. Display order book and user's open orders list (sidebar)
3. Verify order book rows at user's price levels are highlighted
4. Verify highlighting shows:
   - Subtle highlight color (light yellow/blue background)
   - User's total volume at that price level
   - Visual distinction from other orders
5. Hover over highlighted row → Tooltip shows:
   - User's order count at this price
   - User's total volume: "2.3 BTC (2 orders)"
6. Place a new order at different price level via API
7. Verify highlighting updates immediately via WebSocket
8. Cancel an order
9. Verify highlighting updates or removes if no more orders at that price

**Expected Results:**

**Initial State:**
- Rows at 49990, 49980, 50100 have yellow/blue background highlight
- Highlight is subtle (doesn't obscure price/volume text)
- User's volume displayed clearly in the row
- Other rows have no special highlighting

**Hover Tooltip:**
```
User's Orders at 49990 TRY:
2 orders | Total: 1.5 BTC
```

**Real-Time Update (New Order):**
- New order placed at 50050 via API
- Order book row at 50050 highlighted immediately (< 100ms)
- Tooltip updates to reflect new volume
- No page refresh required

**Cancel Update:**
- Cancel one order at 49990 (leaving 1 more)
- Highlight remains at 49990
- Tooltip updates: "1 order | Total: 1.5 BTC"
- Cancel second order at 49990
- Highlight disappears from 49990

**WebSocket Messages Received:**
```json
{
  "type": "user_order_prices",
  "userId": "user-uuid",
  "prices": ["49990", "49980", "50100"],
  "timestamp": "2025-11-25T10:00:00Z"
}
```

**Actual Results:**
[To be filled during testing]

**Status:** Not Tested

**Screenshots:**
[Initial highlighting, hover tooltip, real-time update sequence, cancel update]

---

### Test Scenario 6: User Order Highlighting - Service Performance

**ID:** TS-006
**Type:** Performance / Service Testing
**Priority:** P1 (High)
**Feature:** User Order Highlighting Service Performance
**Duration:** 15 minutes

**Preconditions:**
- User has 5-10 open orders at different prices
- UserOrderHighlightService operational
- Performance monitoring enabled

**Steps:**
1. Call UserOrderHighlightService.getHighlightedPrices(userId)
2. Measure response time
3. Verify response contains correct prices
4. Call 50 times in rapid succession
5. Measure average response time
6. Verify no memory leaks or slowdown

**Expected Results:**
- **Single call latency:** < 20ms
- **Average latency (50 calls):** < 15ms
- **P99 latency:** < 25ms
- **Response format:** `["49990", "49980", "50100"]` (array of price strings)
- **Correctness:** All prices match user's open orders

**Actual Results:**
[To be filled during testing]

**Performance Metrics:**
```
Metric          Target      Actual
──────────────────────────────
Single Call     < 20ms      [X]ms
Average (50x)   < 15ms      [X]ms
P99             < 25ms      [X]ms
```

**Status:** Not Tested

**Screenshots:**
[Performance metrics, response time graph]

---

### Test Scenario 7: Trade Engine Integration - Real Service Usage

**ID:** TS-007
**Type:** Integration Testing
**Priority:** P0 (Critical)
**Feature:** Trade Engine Integration
**Duration:** 30 minutes

**Preconditions:**
- Real Trade Engine service running (not mocked)
- Backend configured with Trade Engine URL (TRADE_ENGINE_API_URL)
- Trade Engine has live order book data
- Circuit breaker implementation ready
- Correlation IDs enabled for tracing

**Steps:**
1. Verify Trade Engine service is reachable
2. Execute GET `/api/v1/market/orderbook/BTC_TRY` 10 times
3. Measure latency for each request
4. Verify response contains live Trade Engine data (compare timestamps)
5. Check correlation ID in request headers (for tracing)
6. Stop Trade Engine service intentionally
7. Execute GET request → verify fallback to cache
8. Restart Trade Engine
9. Verify auto-recovery and switching back to live data
10. Verify circuit breaker state transitions (closed → open → half-open → closed)

**Expected Results:**

**Normal Operation (Service Running):**
- HTTP 200 OK with live data
- Response time: < 100ms p99
- Timestamp reflects current order book state (within 1 second)
- Correlation ID in response headers: `X-Correlation-ID: [uuid]`
- Data reflects Trade Engine's live order book

**Service Unavailable (Timeout/Down):**
- Initial request timeout or error → immediately trigger circuit breaker
- Subsequent requests: HTTP 200 with cached data
- Error message: "Data may be outdated (service unavailable)"
- Response time: < 20ms (from cache)
- User-friendly message in UI

**Recovery (Service Restarts):**
- Circuit breaker enters "half-open" state
- Next request probes Trade Engine
- If successful: Circuit closes, resume normal operation
- If failed: Circuit reopens, continue serving cache
- Recovery time: < 30 seconds total

**Circuit Breaker State Machine:**
```
CLOSED (normal)
  ↓ [3 failures]
OPEN (failing, serve cache)
  ↓ [5 seconds]
HALF_OPEN (testing recovery)
  ↓ [success]
CLOSED
  ↓ [if failure in half-open]
OPEN
```

**Actual Results:**
[To be filled during testing]

**Status:** Not Tested

**Screenshots:**
[Live data response, timeout scenario, cache fallback, recovery sequence]

---

### Test Scenario 8: Fallback Behavior - Graceful Degradation

**ID:** TS-008
**Type:** Error Handling / Resilience Testing
**Priority:** P0 (Critical)
**Feature:** Fallback Behavior
**Duration:** 20 minutes

**Preconditions:**
- Cache is warm with recent data
- Trade Engine API configured
- Error handling middleware in place
- User-friendly error messages configured

**Test Cases:**

**Case A: Trade Engine Timeout (5 seconds)**
1. Stop Trade Engine service
2. Execute GET `/api/v1/market/orderbook/BTC_TRY`
3. Wait for timeout (5 seconds)
4. Verify fallback to cached data

Expected: HTTP 200 with cached data + error message "Data may be outdated"

**Case B: Network Error (connection refused)**
1. Block Trade Engine port in firewall
2. Execute GET `/api/v1/market/orderbook/BTC_TRY`
3. Observe immediate error

Expected: HTTP 200 with cache + message, OR HTTP 503 + retry instruction

**Case C: Trade Engine Returns 503**
1. Configure Trade Engine to return 503 error
2. Execute GET request
3. Verify fallback behavior

Expected: HTTP 200 with cache, OR HTTP 503 with user message

**Case D: Cache Expired (no fallback available)**
1. Clear Redis cache
2. Stop Trade Engine
3. Execute GET request
4. Observe error handling

Expected: HTTP 503 "Service temporarily unavailable" or HTTP 200 with empty orderbook

**Case E: Retry with Exponential Backoff**
1. Simulate transient failure (single timeout)
2. Next request should retry immediately
3. Verify retry logic works

Expected: Automatic retry, eventually succeeds or falls back

**Expected Results (Summary):**

| Scenario | Status | Response | Message | Action |
|----------|--------|----------|---------|--------|
| Timeout | Degraded | 200 + Cache | "Data may be outdated" | Retry |
| Connection Error | Degraded | 200 + Cache | "Connection issue" | Retry |
| 503 Error | Degraded | 200 + Cache | "Service unavailable" | Retry |
| Cache Expired | Failed | 503 | "Service unavailable" | User retry |
| Recovery | Normal | 200 + Live | None | Continue |

**Error Messages (Turkish/English):**
- English: "Data may be outdated (service temporarily unavailable). Retrying..."
- Turkish: "Veriler güncel olmayabilir (hizmet geçici olarak kullanılamıyor). Yeniden deneniyor..."

**Actual Results:**
[To be filled during testing]

**Status:** Not Tested

**Screenshots:**
[Each error scenario with UI message displayed]

---

### Test Scenario 9: Chart Features - Zoom, Pan, Aggregate, Export

**ID:** TS-009
**Type:** UI / Feature Testing
**Priority:** P1 (High)
**Feature:** Advanced Chart Features
**Duration:** 25 minutes

**Preconditions:**
- Depth chart component rendered
- Chart has interactive controls visible
- Export functionality implemented
- Zoom/pan library integrated

**Features to Test:**

**Feature 1: Zoom Functionality**
1. Display depth chart at default zoom (100%)
2. Click or pinch-zoom to 2x (200%)
3. Verify chart zooms in on price range
4. Verify axes adjust accordingly
5. Pan to different price range
6. Click 5x zoom button
7. Verify price range narrows further
8. Click 10x zoom button
9. Verify fine-grained price view

Expected: Zoom levels [1x (default), 2x, 5x, 10x] all functional, smooth transitions

**Feature 2: Pan/Scroll**
1. At 2x zoom level, click and drag on chart left/right
2. Verify chart pans smoothly
3. Can scroll through entire price range
4. On mobile: Verify swipe gesture works

Expected: Smooth panning, responsive to gesture, bounds checking (can't pan beyond data)

**Feature 3: Aggregate Level Selector**
1. Dropdown with options: "0.1%", "0.5%", "1%"
2. Select "0.1%" → Chart shows fine-grained data (many levels)
3. Select "0.5%" → Chart aggregates to fewer levels (less granular)
4. Select "1%" → Chart aggregates further (even fewer levels)
5. Verify data updates correctly without reload

Expected: Data aggregation working, chart updates in < 100ms, smooth transitions

**Feature 4: Export as PNG**
1. Click "Export Chart" button
2. Verify PNG file downloads
3. Open PNG in image viewer
4. Verify chart image quality (not blurry)
5. Verify all labels readable
6. Check file size reasonable (< 500KB)

Expected: PNG exports successfully, high quality, includes timestamp/symbol in filename

**Feature 5: Legend Display**
1. Verify legend visible (below or beside chart)
2. Legend shows "Bids (Green)" and "Asks (Red)"
3. Legend is interactive (click to toggle visibility)
4. Click "Bids" in legend → Bids disappear
5. Click again → Bids reappear

Expected: Legend functional, interactive, clear visual distinction

**Actual Results:**
[To be filled during testing]

**Status:** Not Tested

**Screenshots:**
[Zoom levels, pan action, aggregate selector, export dialog, legend interaction]

---

### Test Scenario 10: Chart Features - Real-Time WebSocket Updates

**ID:** TS-010
**Type:** Real-Time / WebSocket Testing
**Priority:** P0 (Critical)
**Feature:** Real-Time Chart Updates via WebSocket
**Duration:** 20 minutes

**Preconditions:**
- Depth chart component rendering
- WebSocket connection established
- Trade Engine actively updating order book
- Chart subscription to orderbook channel

**Steps:**
1. Display depth chart for BTC_TRY
2. Subscribe to orderbook WebSocket channel
3. Receive initial snapshot
4. Monitor for real-time updates
5. Measure latency from order change to chart update
6. Verify chart reflects new data
7. Continue for 1 minute with active order flow
8. Count number of updates received
9. Verify no missed updates

**Expected Results:**

**Initial Update:**
- WebSocket subscription succeeds within 100ms
- Snapshot received showing full order book
- Chart renders immediately

**Real-Time Updates:**
- New orders/cancellations trigger WebSocket update message
- Chart updates within 100-500ms of order change
- Visual transition smooth (no jank or flicker)
- Chart axes adjust if needed (e.g., new max volume)

**Performance Over Time:**
- 1-minute test with active order flow
- Receive minimum 10+ updates
- Average latency: < 200ms
- No hung or stalled updates
- CPU/memory usage reasonable
- No memory leaks

**Update Message Format:**
```json
{
  "event": "update",
  "channel": "orderbook",
  "symbol": "BTC_TRY",
  "data": {
    "side": "buy",
    "price": "50000",
    "volume": "10.5",
    "cumulative": "10.5",
    "percentage": 45,
    "timestamp": "2025-11-25T10:00:01Z"
  }
}
```

**Actual Results:**
[To be filled during testing]

**Metrics:**
- Updates Received: [X]
- Average Latency: [X]ms
- Min Latency: [X]ms
- Max Latency: [X]ms

**Status:** Not Tested

**Screenshots:**
[WebSocket update sequence, chart changes, latency measurements]

---

### Test Scenario 11: Performance Baselines - All Operations

**ID:** TS-011
**Type:** Performance Testing
**Priority:** P0 (Critical)
**Feature:** Performance Baseline Establishment
**Duration:** 30 minutes

**Preconditions:**
- All services running and warmed up
- Performance monitoring enabled
- Test environment isolated (no other heavy processes)
- Clean browser cache

**Measurements:**

**1. Depth Chart API Response Time**
- Execute 100 sequential requests to `/depth-chart` endpoint
- Measure each request time
- Calculate percentiles: min, p50, p95, p99, max

Expected Performance:
```
Metric          Target      Pass Criteria
────────────────────────────────────────
Min Latency     ~10ms       < 15ms
P50 Latency     ~20ms       < 30ms
P95 Latency     ~40ms       < 45ms
P99 Latency     ~45ms       < 50ms
Max Latency     ~100ms      < 100ms
Mean Latency    ~25ms       < 30ms
```

**2. Depth Chart Component Render Time**
- Measure time from API response received to chart rendered in DOM
- Test with 50 levels, 100 levels
- Measure in React DevTools Profiler

Expected Performance:
```
Levels    Target          Pass Criteria
──────────────────────────────────────
50        < 80ms          < 100ms
100       < 100ms         < 120ms
```

**3. User Order Highlighting Service Response**
- Call service 100 times with varying user orders
- Measure each response time

Expected Performance:
```
Metric          Target      Pass Criteria
────────────────────────────────────────
Mean Latency    ~10ms       < 20ms
P99 Latency     ~18ms       < 20ms
```

**4. WebSocket Update Latency (end-to-end)**
- Measure time from order placement to WebSocket update received
- Measure time from update received to chart visually updated
- Test with 10+ concurrent updates

Expected Performance:
```
Phase                   Target          Pass Criteria
─────────────────────────────────────────────────────
Order → WebSocket       < 50ms          < 100ms
WebSocket → Chart       < 100ms         < 150ms
Total (end-to-end)      < 150ms         < 200ms
```

**5. Chart Interaction Performance**
- Measure time to zoom in/out
- Measure time to pan/scroll
- Measure time to change aggregate level

Expected Performance:
```
Action          Target          Pass Criteria
───────────────────────────────────────────
Zoom action     < 50ms          < 100ms
Pan/Scroll      < 30ms          < 50ms
Aggregate       < 100ms         < 150ms
Export          < 500ms         < 1000ms
```

**Performance Results Table:**

| Operation | Min | P50 | P95 | P99 | Max | Status |
|-----------|-----|-----|-----|-----|-----|--------|
| Depth API | [X] | [X] | [X] | [X] | [X] | Pass/Fail |
| Component Render | [X] | [X] | [X] | [X] | [X] | Pass/Fail |
| Highlighting | [X] | [X] | [X] | [X] | [X] | Pass/Fail |
| WebSocket Update | [X] | [X] | [X] | [X] | [X] | Pass/Fail |
| Chart Zoom | [X] | [X] | [X] | [X] | [X] | Pass/Fail |

**Actual Results:**
[To be filled during testing]

**Status:** Not Tested

**Screenshots:**
[Performance dashboard, React Profiler results, latency graphs]

---

### Test Scenario 12: Error Scenarios - Invalid Input & Large Order Books

**ID:** TS-012
**Type:** Error Handling / Edge Case Testing
**Priority:** P1 (High)
**Feature:** Error Handling
**Duration:** 20 minutes

**Test Cases:**

**Case A: Invalid Symbol for Depth Chart**
```
Request: GET /api/v1/market/orderbook/INVALID/depth-chart
Expected: HTTP 400 Bad Request
Response: { "error": "Symbol not found" }
```

**Case B: Trade Engine Timeout on Depth Chart**
```
Condition: Trade Engine takes > 5 seconds to respond
Expected: HTTP 200 with cached data OR HTTP 503
Message: "Data may be outdated due to slow service"
```

**Case C: Large Order Book (1000+ orders)**
```
Condition: BTC_TRY has 1000+ orders in depth
Request: GET /depth-chart endpoint
Expected: Still returns < 50ms p99 latency
Result: Limited to 50 levels per side (no performance degradation)
```

**Case D: User Not Found for Highlighting**
```
Request: GET highlighted prices for non-existent user
Expected: HTTP 200 with empty array []
No error thrown
```

**Case E: WebSocket Connection Drop**
```
Condition: WebSocket connection drops during real-time updates
Expected:
  1. Connection closes gracefully (code 1000 or 1001)
  2. Frontend attempts reconnect
  3. Attempts exponential backoff
  4. Success on reconnect
```

**Expected Results:**

All error cases should:
- Return appropriate HTTP status code
- Provide user-friendly error message
- Not expose internal system details
- Gracefully degrade (serve cached data if possible)
- Log error for debugging
- Retry automatically where appropriate

**Actual Results:**
[To be filled during testing]

**Status:** Not Tested

**Screenshots:**
[Each error scenario response, browser console logs, Network tab]

---

### Test Scenario 13: Comprehensive Integration - Full User Workflow

**ID:** TS-013
**Type:** End-to-End Integration Testing
**Priority:** P0 (Critical)
**Feature:** Full Workflow Integration
**Duration:** 30 minutes

**Preconditions:**
- All services running (Trade Engine, Backend, Frontend, Redis)
- User authenticated and logged in
- User has some open orders
- WebSocket connection enabled

**Complete Workflow:**

**Step 1: Load Trading Page (BTC_TRY)**
- Navigate to `/trading/BTC_TRY`
- Order book loads from REST API
- Depth chart loads and renders
- User's orders highlighted in book
- WebSocket subscription active

Expected:
- Page loads in < 2 seconds
- Order book displays within 1 second
- Depth chart renders within 2 seconds
- Highlighting visible within 1 second
- No console errors

**Step 2: Interact with Chart**
- Zoom into price range (2x)
- Pan to left (lower prices)
- Change aggregate to 0.5%
- Verify all interactions smooth

Expected:
- All interactions < 100ms response time
- Chart updates visually smooth
- No lag or stutter

**Step 3: Receive Real-Time Updates**
- Trade Engine places new order
- WebSocket sends update
- Order book updates (1-2 rows change)
- Depth chart curve updates
- User highlighting updates if new order at user's price

Expected:
- All updates visible within 500ms
- Chart axes adjust if needed
- No flickering or visual artifacts

**Step 4: Responsive Design Check**
- Resize browser to mobile width (375px)
- Verify all components still visible
- Touch interactions work (if applicable)
- Chart scales appropriately

Expected:
- Mobile layout responsive
- All elements accessible
- No horizontal scroll
- Text readable

**Step 5: Error Scenario**
- Simulate Trade Engine timeout
- Observe fallback to cached data
- Verify user message displayed
- Continue trading with cached data

Expected:
- Error message clear and helpful
- UI doesn't crash or freeze
- User can continue using app
- Automatic recovery when service restores

**Full Workflow Results:**

| Phase | Status | Time | Notes |
|-------|--------|------|-------|
| Page Load | Pass/Fail | [X]s | |
| API Request | Pass/Fail | [X]ms | |
| Chart Render | Pass/Fail | [X]ms | |
| Highlighting | Pass/Fail | [X]ms | |
| Chart Zoom | Pass/Fail | [X]ms | |
| Real-Time Update | Pass/Fail | [X]ms | |
| Mobile Responsive | Pass/Fail | [X]s | |
| Error Recovery | Pass/Fail | [X]s | |

**Actual Results:**
[To be filled during testing]

**Status:** Not Tested

**Screenshots:**
[Full workflow screenshots showing each phase]

---

## Test Execution Schedule

### Pre-Test Checklist (5 minutes)
- [ ] All services running and healthy (Trade Engine, Backend, Frontend)
- [ ] Redis cache operational
- [ ] PostgreSQL database accessible
- [ ] WebSocket server responding
- [ ] Test data seeded (BTC_TRY, ETH_TRY, USDT_TRY with 50+ levels)
- [ ] Performance monitoring tools ready
- [ ] Postman collection imported and configured
- [ ] Cypress configured for E2E tests

### Day 2 Execution Plan

**Morning Session (2-3 hours):**
1. TS-001: Depth Chart API Structure (15 min) - Manual Postman
2. TS-002: Depth Chart Performance (20 min) - Performance test
3. TS-003: Chart Component Rendering (20 min) - Browser inspection
4. TS-004: Responsive Design (15 min) - DevTools viewport testing

**Afternoon Session (2-3 hours):**
5. TS-005: User Order Highlighting (25 min) - Manual testing
6. TS-006: Highlighting Service Performance (15 min) - Timing script
7. TS-007: Trade Engine Integration (30 min) - Circuit breaker testing
8. TS-008: Fallback Behavior (20 min) - Error scenario testing
9. TS-009: Chart Features (25 min) - UI feature testing
10. TS-010: WebSocket Real-Time Updates (20 min) - Monitoring
11. TS-011: Performance Baselines (30 min) - Comprehensive performance
12. TS-012: Error Scenarios (20 min) - Edge case testing
13. TS-013: Full Workflow (30 min) - End-to-end integration

**Total Time:** ~6-7 hours (fits within 8-hour work day with breaks)

---

## Postman Collection - Day 2 Endpoints

### Collection: EPIC3-Story3.1-Day2-DepthChart

#### Folder 1: Depth Chart API Endpoints

**Request 1: GET /depth-chart (BTC_TRY)**
```
GET http://localhost:8080/api/v1/market/orderbook/BTC_TRY/depth-chart

Tests:
- Status code is 200
- Response has required fields
- Cumulative volumes correct
- Spread calculation verified
- Response time < 50ms
```

**Request 2: GET /depth-chart (ETH_TRY)**
```
GET http://localhost:8080/api/v1/market/orderbook/ETH_TRY/depth-chart

Tests:
- Status code is 200
- Symbol is ETH_TRY
- Data structure valid
```

**Request 3: GET /depth-chart (USDT_TRY)**
```
GET http://localhost:8080/api/v1/market/orderbook/USDT_TRY/depth-chart

Tests:
- Status code is 200
- Symbol is USDT_TRY
- Data structure valid
```

#### Folder 2: User Highlighting API

**Request 1: GET /user-highlighted-prices**
```
GET http://localhost:8080/api/v1/trading/user-highlighted-prices

Headers:
  Authorization: Bearer [JWT_TOKEN]

Tests:
- Status code is 200
- Response is array of strings (prices)
- Array contains user's open order prices
- Response time < 20ms
```

#### Folder 3: Performance Baseline Tests

**Request 1: Performance Test - 100 Sequential Requests**
```
Pre-request Script:
  - Set up request loop counter
  - Initialize timing array

Test Script:
  - Record response time
  - Store in array
  - Calculate percentiles on final request
```

---

## Cypress E2E Tests - Day 2

### Test File: `cypress/e2e/trading/depth-chart.spec.ts`

```typescript
describe('Story 3.1 Day 2: Depth Chart & User Highlighting', () => {

  beforeEach(() => {
    cy.visit('/trading/BTC_TRY');
    cy.get('[data-testid="depth-chart"]').should('be.visible');
  });

  context('Depth Chart Display', () => {
    it('should render depth chart with bids and asks', () => {
      cy.get('[data-testid="depth-chart"]').within(() => {
        cy.get('[data-testid="bids-area"]').should('be.visible');
        cy.get('[data-testid="asks-area"]').should('be.visible');
      });
    });

    it('should show hover tooltip on chart hover', () => {
      cy.get('[data-testid="depth-chart"] svg')
        .trigger('mouseover', { x: 100, y: 100 });
      cy.get('[data-testid="chart-tooltip"]').should('be.visible');
    });
  });

  context('User Order Highlighting', () => {
    it('should highlight user orders in chart', () => {
      // Assumes user has orders at specific prices
      cy.get('[data-testid="depth-row"][data-price="50000"]')
        .should('have.class', 'user-highlighted');
    });

    it('should update highlighting on new order', () => {
      // Place new order via API
      cy.api.post('/api/v1/trading/orders', {
        symbol: 'BTC_TRY',
        side: 'buy',
        price: '49950',
        quantity: 1
      });

      // Verify highlighting updates
      cy.get('[data-testid="depth-row"][data-price="49950"]')
        .should('have.class', 'user-highlighted');
    });
  });

  context('Chart Features', () => {
    it('should zoom chart on zoom button click', () => {
      cy.get('[data-testid="zoom-button-2x"]').click();
      cy.get('[data-testid="depth-chart"]')
        .should('have.attr', 'data-zoom', '2');
    });

    it('should export chart as PNG', () => {
      cy.get('[data-testid="export-button"]').click();
      cy.readFile('cypress/downloads/depth-chart-*.png')
        .should('exist');
    });
  });

  context('Responsive Design', () => {
    it('should be responsive on mobile', () => {
      cy.viewport('iphone-x');
      cy.get('[data-testid="depth-chart"]').should('be.visible');
      cy.get('[data-testid="orderbook"]').should('be.visible');
    });
  });
});
```

---

## Jest Unit Tests - Day 2

### Test File: `frontend/src/components/Trading/DepthChart.test.tsx`

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import DepthChart from './DepthChart';

describe('DepthChart Component', () => {
  const mockData = {
    bids: [
      { price: '50000', volume: '10.5', cumulative: '10.5', percentage: 45 },
      { price: '49990', volume: '8.3', cumulative: '18.8', percentage: 80 }
    ],
    asks: [
      { price: '50100', volume: '5.2', cumulative: '5.2', percentage: 22 }
    ],
    spread: { value: '100', percentage: '0.20%' },
    maxBidVolume: '10.5',
    maxAskVolume: '12.1'
  };

  it('should render with mock data', () => {
    render(<DepthChart data={mockData} />);
    expect(screen.getByTestId('depth-chart')).toBeInTheDocument();
  });

  it('should render correct number of bid levels', () => {
    render(<DepthChart data={mockData} />);
    const bidLevels = screen.getAllByTestId('bid-level');
    expect(bidLevels).toHaveLength(2);
  });

  it('should show tooltip on hover', () => {
    render(<DepthChart data={mockData} />);
    const chart = screen.getByTestId('depth-chart');
    fireEvent.mouseOver(chart);
    expect(screen.getByTestId('chart-tooltip')).toBeVisible();
  });

  it('should update on zoom', () => {
    const { rerender } = render(<DepthChart data={mockData} zoom={1} />);
    expect(screen.getByTestId('depth-chart')).toHaveAttribute('data-zoom', '1');

    rerender(<DepthChart data={mockData} zoom={2} />);
    expect(screen.getByTestId('depth-chart')).toHaveAttribute('data-zoom', '2');
  });
});
```

---

## Bug Tracking Template

If bugs are found during testing, use this format:

```markdown
### BUG-XXX: [Clear Problem Description]

**Severity:** Critical / High / Medium / Low
**Component:** Depth Chart API / Component / Highlighting Service
**Found in Test:** TS-XXX

**Description:**
[Brief description of the issue]

**Steps to Reproduce:**
1. [Step 1]
2. [Step 2]
3. [Observe the problem]

**Expected:**
[What should happen]

**Actual:**
[What actually happens]

**Environment:**
- Browser: [Chrome/Firefox/Safari]
- OS: [Windows/macOS/Linux]
- Test Environment: Dev/Staging

**Logs:**
[Include console errors, network errors, server logs]

**Suggested Fix:**
[If identifiable]
```

---

## Test Results Summary Template

```markdown
## Test Execution Results - Day 2 Integration Testing

**Date:** 2025-11-25
**Tester:** [QA Agent]
**Test Environment:** Dev
**Total Scenarios:** 13
**Passed:** [X]
**Failed:** [X]
**Blocked:** [X]

### Results by Scenario

| TS # | Scenario | Status | Notes |
|------|----------|--------|-------|
| TS-001 | Depth Chart API Structure | Pass/Fail | |
| TS-002 | Performance & Caching | Pass/Fail | |
| TS-003 | Component Rendering | Pass/Fail | |
| ... | ... | ... | |

### Critical Issues Found
[List any Critical/High severity bugs]

### Performance Metrics
[Summary of performance baselines achieved]

### Sign-Off
- [ ] All P0 tests passing
- [ ] All P1 tests passing (or documented with workaround)
- [ ] Performance baselines met
- [ ] No critical bugs outstanding
- [ ] Ready for merge to main

**Sign-Off Date:** [X]
**QA Engineer:** [Name]
```

---

## Definition of Done (Day 2 Integration Testing)

Integration testing is complete when:

1. **Test Scenario Coverage:** All 13+ test scenarios executed
2. **Pass Rate:** ≥ 95% of tests passing
3. **Performance:** All SLAs met
   - Depth Chart API: < 50ms p99
   - Component Render: < 100ms
   - Highlighting: < 20ms
   - WebSocket: < 100ms end-to-end
4. **Caching:** Cache hit ratio > 95%
5. **Real-Time:** WebSocket updates < 500ms latency
6. **Error Handling:** Graceful degradation verified
7. **Responsive Design:** Tested on 3+ viewport sizes
8. **Security:** Input validation prevents injection
9. **Documentation:** All results logged with evidence
10. **Bugs:** Critical/High bugs resolved or tracked
11. **Automated Tests:** Postman + Cypress tests created and passing
12. **Test Artifacts:** Screenshots, performance graphs, logs archived

---

## References

- **Feature Spec:** Story 3.1 - Order Book Real-Time Display
- **Day 2 Tasks:** EPIC3_DAY2_TASK_ASSIGNMENTS.md
- **Day 1 Test Plan:** EPIC3_STORY3.1_TEST_PLAN.md
- **Postman Collection:** EPIC3_STORY3.1_Postman_Collection.json
- **Engineering Guidelines:** engineering-guidelines.md (when available)

---

## Document Information

**Document Owner:** QA Agent
**Test Lead:** QA Team
**Created:** 2025-11-25
**Version:** 1.0 (Day 2 Continuation)
**Status:** Ready for Execution

---

## Sign-Off

**Prepared by:** QA Engineer Agent
**Date:** 2025-11-25
**Review Status:** Awaiting Execution & Validation

---

*This test plan will be executed on Day 2 of Story 3.1 development. All test results will be documented and tracked for quality assurance sign-off.*
