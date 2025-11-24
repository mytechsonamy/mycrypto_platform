# Story 3.1: Order Book (Real-Time Display) - Test Plan

**Document Version:** 1.0
**Last Updated:** 2025-11-24
**Test Lead:** QA Agent
**Feature:** Order Book Real-Time Display (Story 3.1)
**Epic:** EPIC 3 - Trading Engine
**Priority:** P0 (Critical)
**Sprint:** Sprint 3
**Story Points:** 8

---

## Executive Summary

This test plan covers comprehensive testing for the Order Book feature, which allows users to view real-time market depth for trading pairs (BTC/TRY, ETH/TRY, USDT/TRY). The feature includes both REST API snapshot retrieval and WebSocket real-time updates.

**Test Coverage Goals:**
- 100% of acceptance criteria coverage
- Happy path + error scenarios + edge cases
- Performance baseline establishment (< 100ms p99 latency)
- Cache hit verification (Redis)
- WebSocket real-time update validation
- Graceful degradation when Trade Engine is down

---

## Scope

### In Scope
- REST API: `GET /api/v1/market/orderbook/{symbol}`
- Query parameters: `?depth=20`, `?depth=100`
- WebSocket subscription: Order book real-time channel
- Response structure validation (symbol, bids, asks, spread, timestamp)
- Redis caching behavior
- Error handling (invalid symbols, service unavailability)
- Performance testing (latency, p99, caching hits)
- Data validation (all required fields present)

### Out of Scope
- Advanced order aggregation algorithms
- Market data streaming for other symbols beyond MVP
- Proprietary depth visualization algorithms
- Mobile app WebSocket testing (delegated to mobile QA)
- Load testing beyond baseline capacity

---

## Acceptance Criteria Mapping

| AC # | Acceptance Criteria | Test Case ID | Type |
|------|---------------------|--------------|------|
| 1 | Get orderbook, verify response structure is correct | TC-001 to TC-005 | Functional |
| 2 | Invalid symbol should return 400 error | TC-006 to TC-008 | Error Handling |
| 3 | Verify endpoint response is <100ms p99 | TC-009 to TC-010 | Performance |
| 4 | Second request for same symbol is faster (Redis cache hit) | TC-011 to TC-013 | Performance/Caching |
| 5 | Client can subscribe to orderbook channel and receive updates | TC-014 to TC-018 | WebSocket |
| 6 | System gracefully handles Trade Engine being down | TC-019 to TC-020 | Error Handling |
| 7 | ?depth=20 and ?depth=100 work correctly | TC-021 to TC-025 | Functional |
| 8 | All required fields in response (symbol, bids, asks, spread, timestamp) | TC-026 to TC-030 | Data Validation |

---

## Test Environment Requirements

### API Endpoint
- **Base URL (Dev):** `http://localhost:8080`
- **Base URL (Staging):** `https://api-staging.crypto-exchange.com`
- **API Version:** v1
- **Port:** 8080 (Go Trade Engine Service)

### WebSocket Endpoint
- **Dev:** `ws://localhost:8080/ws/orderbook`
- **Staging:** `wss://api-staging.crypto-exchange.com/ws/orderbook`

### Services
- **Trade Engine:** Go (must be running)
- **Redis Cache:** localhost:6379 (for caching verification)
- **PostgreSQL:** localhost:5432 (trade data)

### Testing Tools
- **API Testing:** Postman, curl, Newman (CLI)
- **WebSocket Testing:** ws (Node.js library), wscat, or custom test harness
- **Performance Testing:** Apache JMeter, k6, or custom Go benchmark
- **Real-Time Updates:** Cypress E2E tests with WebSocket support

### Test Data - Sample Order Books

#### BTC_TRY
```json
{
  "symbol": "BTC_TRY",
  "bids": [
    { "price": "1500000.00", "volume": "0.5", "count": 2 },
    { "price": "1499900.00", "volume": "1.2", "count": 3 },
    { "price": "1499800.00", "volume": "0.8", "count": 1 }
  ],
  "asks": [
    { "price": "1500100.00", "volume": "0.3", "count": 1 },
    { "price": "1500200.00", "volume": "2.0", "count": 4 },
    { "price": "1500300.00", "volume": "1.5", "count": 2 }
  ],
  "spread": "100.00",
  "timestamp": "2025-11-24T14:30:45Z"
}
```

#### ETH_TRY
```json
{
  "symbol": "ETH_TRY",
  "bids": [
    { "price": "100000.00", "volume": "5.0", "count": 5 },
    { "price": "99900.00", "volume": "10.0", "count": 8 },
    { "price": "99800.00", "volume": "2.5", "count": 2 }
  ],
  "asks": [
    { "price": "100100.00", "volume": "3.0", "count": 2 },
    { "price": "100200.00", "volume": "7.5", "count": 6 },
    { "price": "100300.00", "volume": "5.0", "count": 3 }
  ],
  "spread": "100.00",
  "timestamp": "2025-11-24T14:30:45Z"
}
```

#### USDT_TRY
```json
{
  "symbol": "USDT_TRY",
  "bids": [
    { "price": "35.50", "volume": "100000.0", "count": 50 },
    { "price": "35.49", "volume": "50000.0", "count": 25 },
    { "price": "35.48", "volume": "75000.0", "count": 40 }
  ],
  "asks": [
    { "price": "35.51", "volume": "80000.0", "count": 45 },
    { "price": "35.52", "volume": "120000.0", "count": 60 },
    { "price": "35.53", "volume": "60000.0", "count": 30 }
  ],
  "spread": "0.01",
  "timestamp": "2025-11-24T14:30:45Z"
}
```

---

## Test Execution Strategy

### Phase 1: Manual API Testing (Day 1)
1. **API Snapshot Testing** - REST endpoint behavior
2. **Depth Parameter Testing** - ?depth=20, ?depth=100
3. **Invalid Symbol Handling** - 400 errors
4. **Response Structure Validation** - Field verification
5. **Performance Baseline** - Response time measurement

### Phase 2: WebSocket Testing (Day 2)
1. **WebSocket Connection** - Subscription flow
2. **Real-Time Updates** - Data reception
3. **Event Streaming** - Multiple updates validation
4. **Connection Closure** - Graceful disconnection

### Phase 3: Performance & Caching Testing (Day 2)
1. **Cache Hit Verification** - Redis performance
2. **Latency Measurement** - p99 validation
3. **Concurrent Requests** - Load baseline

### Phase 4: Error Handling Testing (Day 3)
1. **Service Unavailability** - Graceful degradation
2. **Invalid Inputs** - Boundary testing
3. **Rate Limiting** - If applicable

### Phase 5: Automated Testing (Day 3-4)
1. **Postman Collection** - API tests
2. **Cypress E2E** - WebSocket + UI workflow
3. **Jest Unit Tests** - Component/service validation

---

## Detailed Test Cases

### Test Case Group 1: Happy Path - Valid Order Book Retrieval

#### TC-001: Get orderbook with default depth (20)

**Feature:** Order Book Real-Time Display
**Type:** Functional / API
**Priority:** P0 (Critical)

**Preconditions:**
- Trade Engine service is running and healthy
- Order book data exists for BTC_TRY
- Redis cache is operational

**Steps:**
1. Execute GET request to `/api/v1/market/orderbook/BTC_TRY`
2. No query parameters specified (default depth=20)
3. Capture response and timestamp

**Expected Result:**
- HTTP 200 OK
- Response includes:
  - `symbol`: "BTC_TRY"
  - `bids`: Array with up to 20 price levels (descending price)
  - `asks`: Array with up to 20 price levels (ascending price)
  - `timestamp`: ISO 8601 format (e.g., "2025-11-24T14:30:45Z")
  - `spread`: Numeric value (best_ask - best_bid)
- Response time < 100ms
- All price levels have `price`, `volume`, `count` fields
- Bids sorted by price descending
- Asks sorted by price ascending

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach Postman response or curl output]

---

#### TC-002: Get orderbook for ETH_TRY

**Feature:** Order Book Real-Time Display
**Type:** Functional / API
**Priority:** P0 (Critical)

**Preconditions:**
- ETH_TRY pair has active order book
- Trade Engine is running

**Steps:**
1. Execute GET `/api/v1/market/orderbook/ETH_TRY`
2. Observe response

**Expected Result:**
- HTTP 200 OK
- Response structure matches BTC_TRY format
- `symbol`: "ETH_TRY"
- Contains valid bid/ask data for ETH
- Response time < 100ms

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach response]

---

#### TC-003: Get orderbook for USDT_TRY

**Feature:** Order Book Real-Time Display
**Type:** Functional / API
**Priority:** P0 (Critical)

**Preconditions:**
- USDT_TRY pair is active
- Trade Engine running

**Steps:**
1. Execute GET `/api/v1/market/orderbook/USDT_TRY`
2. Verify response

**Expected Result:**
- HTTP 200 OK
- Correct symbol in response
- Valid bid/ask arrays
- All fields present

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach response]

---

#### TC-004: Verify response contains all required fields

**Feature:** Order Book Real-Time Display
**Type:** Data Validation
**Priority:** P0 (Critical)

**Preconditions:**
- API is responding with orderbook data

**Steps:**
1. Get orderbook snapshot
2. Inspect response JSON structure
3. Verify each required field exists

**Expected Result:**
- Response has top-level fields:
  - `symbol` (string): Trading pair symbol
  - `bids` (array): Bid orders array
  - `asks` (array): Ask orders array
  - `spread` (decimal): Numeric value
  - `timestamp` (string): ISO 8601 timestamp
- Each bid/ask level has:
  - `price` (decimal string)
  - `volume` (decimal string)
  - `count` (integer): Number of orders at this level
- No null/undefined values for required fields
- Numeric strings are valid decimal format

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach JSON response]

---

#### TC-005: Verify spread calculation (best_ask - best_bid)

**Feature:** Order Book Real-Time Display
**Type:** Data Validation
**Priority:** P1 (High)

**Preconditions:**
- Orderbook response received

**Steps:**
1. Get orderbook for BTC_TRY
2. Extract: best_bid = bids[0].price, best_ask = asks[0].price
3. Calculate expected_spread = best_ask - best_bid
4. Compare with response.spread

**Expected Result:**
- `spread` field matches calculated value (within floating point tolerance)
- Spread is always positive (asks > bids)
- Spread is reasonable for the symbol:
  - BTC_TRY: typically 100-500 TRY
  - ETH_TRY: typically 50-200 TRY
  - USDT_TRY: typically 0.01-0.05 TRY

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach calculation verification]

---

### Test Case Group 2: Depth Parameter Testing

#### TC-006: Query with depth=20

**Feature:** Order Book Real-Time Display
**Type:** Functional / Parameter Validation
**Priority:** P0 (Critical)

**Preconditions:**
- API is running
- BTC_TRY has sufficient order book depth

**Steps:**
1. Execute GET `/api/v1/market/orderbook/BTC_TRY?depth=20`
2. Count returned bid and ask levels
3. Verify limits

**Expected Result:**
- HTTP 200 OK
- Response includes exactly 20 (or fewer if unavailable) bids
- Response includes exactly 20 (or fewer if unavailable) asks
- Response time < 100ms
- Data is valid and properly ordered

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach response with depth=20]

---

#### TC-007: Query with depth=100

**Feature:** Order Book Real-Time Display
**Type:** Functional / Parameter Validation
**Priority:** P0 (Critical)

**Preconditions:**
- API running
- Order book has substantial depth

**Steps:**
1. Execute GET `/api/v1/market/orderbook/BTC_TRY?depth=100`
2. Count price levels returned

**Expected Result:**
- HTTP 200 OK
- Returns up to 100 bids (or fewer if unavailable)
- Returns up to 100 asks (or fewer if unavailable)
- Response time < 150ms (slightly higher due to more data)
- All data valid and sorted correctly

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach response with depth=100]

---

#### TC-008: Query with invalid depth values

**Feature:** Order Book Real-Time Display
**Type:** Error Handling / Validation
**Priority:** P1 (High)

**Preconditions:**
- API running

**Steps:**
1. Test Case A: `?depth=-10` (negative)
2. Test Case B: `?depth=0` (zero)
3. Test Case C: `?depth=1000` (exceeds max of 100)
4. Test Case D: `?depth=abc` (non-numeric)
5. Test Case E: `?depth=50.5` (decimal, should be int)

**Expected Result:**
- Case A & B: HTTP 400 or use default depth (20)
  - Error: "Depth must be positive"
  - Or: Silently use default
- Case C: Capped at max (100)
  - HTTP 200 OK with 100 levels
- Case D: HTTP 400
  - Error: "Invalid depth parameter"
- Case E: HTTP 400 or parsed as 50
  - Depends on implementation

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach all error responses]

---

#### TC-009: Default depth when parameter omitted

**Feature:** Order Book Real-Time Display
**Type:** Functional / Default Behavior
**Priority:** P0 (Critical)

**Preconditions:**
- API running

**Steps:**
1. Execute GET `/api/v1/market/orderbook/BTC_TRY` (no depth param)
2. Count returned levels
3. Check documentation for default value

**Expected Result:**
- Default depth should be 20 (per spec: "Top 20 levels each side displayed")
- HTTP 200 OK
- Returns approximately 20 bids and 20 asks
- Response time < 100ms

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach response]

---

### Test Case Group 3: Invalid Symbol Handling

#### TC-010: Non-existent symbol (400 error)

**Feature:** Order Book Real-Time Display
**Type:** Error Handling / Validation
**Priority:** P0 (Critical)

**Preconditions:**
- API running
- Only BTC_TRY, ETH_TRY, USDT_TRY are valid pairs

**Steps:**
1. Execute GET `/api/v1/market/orderbook/UNKNOWN_PAIR`
2. Observe response status and body

**Expected Result:**
- HTTP 400 Bad Request (or 404 Not Found)
- Error message: "Invalid symbol" or "Symbol not found"
- Response includes error code
- No order book data returned
- Response time < 50ms (quick error return)

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach error response]

---

#### TC-011: Empty symbol parameter

**Feature:** Order Book Real-Time Display
**Type:** Error Handling / Validation
**Priority:** P0 (Critical)

**Preconditions:**
- API running

**Steps:**
1. Execute GET `/api/v1/market/orderbook/` (empty symbol)
2. Or: GET `/api/v1/market/orderbook` (missing symbol entirely)

**Expected Result:**
- HTTP 400 Bad Request
- Error: "Symbol is required" or "Invalid symbol"
- Consistent error response format

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach error response]

---

#### TC-012: Case sensitivity of symbol

**Feature:** Order Book Real-Time Display
**Type:** Functional / Edge Case
**Priority:** P1 (High)

**Preconditions:**
- Valid symbol: BTC_TRY

**Steps:**
1. Test Case A: GET `/api/v1/market/orderbook/BTC_TRY` (correct case)
2. Test Case B: GET `/api/v1/market/orderbook/btc_try` (lowercase)
3. Test Case C: GET `/api/v1/market/orderbook/Btc_Try` (mixed case)

**Expected Result:**
- All cases should either:
  - All succeed (case-insensitive): HTTP 200, same data
  - Or: Only case A succeeds, B & C return 400
- Behavior consistent and documented
- No ambiguity in symbol matching

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach all three responses]

---

#### TC-013: Symbol with SQL injection attempt

**Feature:** Order Book Real-Time Display
**Type:** Security / Input Validation
**Priority:** P0 (Critical)

**Preconditions:**
- API running with proper input sanitization

**Steps:**
1. Execute GET `/api/v1/market/orderbook/BTC_TRY'; DROP TABLE orderbook; --`
2. Observe response
3. Verify order book table still exists

**Expected Result:**
- HTTP 400 Bad Request
- Error: "Invalid symbol"
- No SQL execution (injection prevented)
- Database remains intact
- No SQL errors exposed in response

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach error response and DB verification]

---

### Test Case Group 4: Performance Baseline

#### TC-014: Single request response time < 100ms p99

**Feature:** Order Book Real-Time Display
**Type:** Performance
**Priority:** P0 (Critical)

**Preconditions:**
- Trade Engine running
- Network latency is normal (< 10ms)
- Redis cache is warm

**Steps:**
1. Execute 100 consecutive GET requests to `/api/v1/market/orderbook/BTC_TRY`
2. Measure response time for each request
3. Calculate p99 (99th percentile) latency
4. Record min, max, mean, p50, p99

**Expected Result:**
- p99 latency < 100ms
- Mean latency < 50ms
- Min latency < 20ms (cache hits)
- Max latency < 150ms (acceptable outlier)
- Consistent performance across 100 requests

**Actual Result:**
[To be filled during testing]

**Metrics:**
- Min: [X]ms
- Mean: [X]ms
- p50: [X]ms
- p99: [X]ms
- Max: [X]ms

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach benchmark results or load testing output]

---

#### TC-015: Latency SLA verification

**Feature:** Order Book Real-Time Display
**Type:** Performance
**Priority:** P0 (Critical)

**Preconditions:**
- Test environment baseline established

**Steps:**
1. Run sustained load test (50 req/sec for 5 minutes)
2. Measure latency throughout duration
3. Calculate p99 latency
4. Verify SLA compliance

**Expected Result:**
- p99 latency consistently < 100ms
- No requests exceed 200ms
- No timeouts or errors
- Performance stable over time
- CPU/Memory usage reasonable

**Actual Result:**
[To be filled during testing]

**Load Test Results:**
- Duration: 5 minutes
- Rate: 50 req/sec (300 total requests)
- Total Requests: [X]
- Successful: [X] (100%)
- Failed: 0
- p99 Latency: [X]ms

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach load test report]

---

### Test Case Group 5: Caching Behavior

#### TC-016: First request hits database/fresh data

**Feature:** Order Book Real-Time Display
**Type:** Caching / Performance
**Priority:** P1 (High)

**Preconditions:**
- Redis cache is empty for BTC_TRY
- Trade Engine has latest order book data

**Steps:**
1. Clear Redis cache: `redis-cli DEL orderbook:BTC_TRY`
2. Execute GET `/api/v1/market/orderbook/BTC_TRY`
3. Measure response time (T1)
4. Record timestamp from response
5. Verify data is fresh (timestamp is recent)

**Expected Result:**
- HTTP 200 OK
- Response time: 50-100ms (fresh from database)
- Timestamp is within last 1 second
- Data reflects current order book state
- No cached data header

**Actual Result:**
[To be filled during testing]

**Time (T1):** [X]ms
**Cache Status:** Miss
**Data Age:** [X]ms

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach response and timestamp verification]

---

#### TC-017: Second request hits Redis cache (faster)

**Feature:** Order Book Real-Time Display
**Type:** Caching / Performance
**Priority:** P1 (High)

**Preconditions:**
- First request completed (cache is populated)
- Within cache TTL window (typically 5-30 seconds)

**Steps:**
1. Execute first request (TC-016) - populates cache
2. Wait 100ms (minimal delay)
3. Execute second request immediately: GET `/api/v1/market/orderbook/BTC_TRY`
4. Measure response time (T2)
5. Compare T2 vs T1

**Expected Result:**
- HTTP 200 OK
- Response time: < 20ms (cache hit)
- Same data as first request (same timestamp)
- Response includes cache indicator header (e.g., `X-Cache: HIT`)
- T2 < T1 (cache is faster)
- Typically: T2 is 3-5x faster than T1

**Actual Result:**
[To be filled during testing]

**Time (T1 - First):** [X]ms
**Time (T2 - Second):** [X]ms
**Speedup Ratio:** [X]x faster
**Cache Status:** Hit

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach both responses showing cache header and timing]

---

#### TC-018: Cache expiration and refresh

**Feature:** Order Book Real-Time Display
**Type:** Caching / Behavior
**Priority:** P1 (High)

**Preconditions:**
- Cache TTL is known (e.g., 30 seconds)

**Steps:**
1. Get orderbook (populates cache, record T1)
2. Wait for cache TTL to expire
3. Get orderbook again (record T2 and timestamp)
4. Verify timestamp has advanced

**Expected Result:**
- First request: Cached data (T2 < 20ms)
- After TTL expires: Fresh data fetched (T2 50-100ms)
- New timestamp is newer than original
- Cache automatically refreshes after expiration
- No manual cache clearing required

**Actual Result:**
[To be filled during testing]

**Cache TTL:** [X] seconds
**Data Age Change:** [X]ms

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach timestamps showing refresh]

---

#### TC-019: Cache hit ratio under load

**Feature:** Order Book Real-Time Display
**Type:** Caching / Performance
**Priority:** P1 (High)

**Preconditions:**
- Load test setup ready

**Steps:**
1. Clear cache
2. Send 100 requests to same symbol within cache TTL
3. Count cache hits vs misses
4. Observe average response time
5. Calculate hit ratio

**Expected Result:**
- First request: Cache MISS (< 1)
- Requests 2-100: Cache HIT (99 hits)
- Hit ratio: 99% (99/100)
- Average response time: < 25ms
- Demonstrates effective caching

**Actual Result:**
[To be filled during testing]

**Total Requests:** 100
**Cache Hits:** [X]
**Cache Misses:** [X]
**Hit Ratio:** [X]%
**Avg Response Time:** [X]ms

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach cache statistics]

---

### Test Case Group 6: WebSocket Real-Time Updates

#### TC-020: WebSocket subscription to orderbook channel

**Feature:** Order Book Real-Time Display
**Type:** WebSocket / Real-Time
**Priority:** P0 (Critical)

**Preconditions:**
- WebSocket server running on `ws://localhost:8080/ws/orderbook`
- Client WebSocket support available
- BTC_TRY has active orders

**Steps:**
1. Establish WebSocket connection
2. Send subscription message:
```json
{
  "action": "subscribe",
  "channel": "orderbook",
  "symbol": "BTC_TRY"
}
```
3. Wait for confirmation
4. Observe incoming data

**Expected Result:**
- WebSocket connection established (HTTP 101 Switching Protocols)
- Subscription ACK received:
```json
{
  "event": "subscribed",
  "channel": "orderbook",
  "symbol": "BTC_TRY",
  "message": "Successfully subscribed"
}
```
- Connection remains open and stable
- No connection timeout within 1 minute

**Actual Result:**
[To be filled during testing]

**Connection Established:** [Yes/No]
**Subscription ACK Time:** [X]ms

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach WebSocket debug log]

---

#### TC-021: Receive orderbook snapshot via WebSocket

**Feature:** Order Book Real-Time Display
**Type:** WebSocket / Data Delivery
**Priority:** P0 (Critical)

**Preconditions:**
- WebSocket subscription active (TC-020 passed)

**Steps:**
1. Subscribe to BTC_TRY orderbook
2. Wait for snapshot message
3. Inspect data structure and content

**Expected Result:**
- Receive initial snapshot within 1 second:
```json
{
  "event": "snapshot",
  "channel": "orderbook",
  "symbol": "BTC_TRY",
  "data": {
    "symbol": "BTC_TRY",
    "bids": [...],
    "asks": [...],
    "spread": 100.00,
    "timestamp": "2025-11-24T14:30:45Z"
  }
}
```
- Snapshot contains complete order book state
- All required fields present
- Data is valid and sorted correctly

**Actual Result:**
[To be filled during testing]

**Snapshot Delivery Time:** [X]ms
**Data Size:** [X] bytes

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach snapshot message]

---

#### TC-022: Receive real-time order book updates

**Feature:** Order Book Real-Time Display
**Type:** WebSocket / Real-Time Updates
**Priority:** P0 (Critical)

**Preconditions:**
- WebSocket subscribed and snapshot received
- Trade Engine has active order flow

**Steps:**
1. Subscribe to orderbook
2. Receive snapshot
3. Wait for update messages
4. Place test order in Trade Engine to trigger update
5. Observe update message within 500ms

**Expected Result:**
- Receive update messages in format:
```json
{
  "event": "update",
  "channel": "orderbook",
  "symbol": "BTC_TRY",
  "data": {
    "side": "buy",
    "price": "1500050.00",
    "volume": "0.25",
    "count": 1,
    "timestamp": "2025-11-24T14:30:46Z"
  }
}
```
- Updates delivered within 100-500ms of order change
- Update includes: side, price, volume, count, timestamp
- Multiple updates arrive in order
- No missed updates

**Actual Result:**
[To be filled during testing]

**Update Delivery Latency:** [X]ms (avg)
**Updates Received:** [X]

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach update sequence]

---

#### TC-023: WebSocket update frequency matches SLA

**Feature:** Order Book Real-Time Display
**Type:** WebSocket / Performance
**Priority:** P0 (Critical)

**Preconditions:**
- WebSocket connected
- Order book actively changing (orders being placed/cancelled)

**Steps:**
1. Monitor WebSocket for 10 seconds with active order flow
2. Count number of updates received
3. Calculate update frequency
4. Measure latency of each update

**Expected Result:**
- Updates delivered at ~100ms frequency (per spec)
- At least 100 updates in 10 seconds = 10 updates/second
- Latency consistent (no drops or delays)
- No gaps > 500ms between updates
- Updates are sequential and in correct order

**Actual Result:**
[To be filled during testing]

**Duration:** 10 seconds
**Updates Received:** [X]
**Avg Frequency:** [X] updates/sec
**Min Latency:** [X]ms
**Max Latency:** [X]ms
**Missed Updates:** 0

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach update timeline]

---

#### TC-024: Multiple symbol subscriptions on single connection

**Feature:** Order Book Real-Time Display
**Type:** WebSocket / Multi-Channel
**Priority:** P1 (High)

**Preconditions:**
- WebSocket connection established

**Steps:**
1. Subscribe to BTC_TRY
2. Subscribe to ETH_TRY
3. Subscribe to USDT_TRY (on same connection)
4. Receive snapshots for all 3
5. Verify updates for all symbols arrive

**Expected Result:**
- All 3 subscriptions succeed on single connection
- Receive snapshots for each symbol
- Updates for all symbols delivered separately
- No cross-contamination between streams
- Connection remains stable

**Actual Result:**
[To be filled during testing]

**Subscriptions Active:** 3
**Snapshots Received:** 3
**Update Streams:** 3 (concurrent)

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach multi-channel log]

---

#### TC-025: Graceful WebSocket disconnection

**Feature:** Order Book Real-Time Display
**Type:** WebSocket / Error Handling
**Priority:** P1 (High)

**Preconditions:**
- WebSocket connection active with subscriptions

**Steps:**
1. Send unsubscribe message:
```json
{
  "action": "unsubscribe",
  "channel": "orderbook",
  "symbol": "BTC_TRY"
}
```
2. Wait for ACK
3. Close connection gracefully
4. Verify no updates after close

**Expected Result:**
- Unsubscribe ACK received:
```json
{
  "event": "unsubscribed",
  "channel": "orderbook",
  "symbol": "BTC_TRY"
}
```
- Connection closes cleanly (code 1000)
- No updates received after close
- Server logs no errors
- Reconnection possible immediately

**Actual Result:**
[To be filled during testing]

**Unsubscribe Time:** [X]ms
**Close Code:** 1000
**Post-Close Updates:** 0

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach WebSocket close handshake]

---

### Test Case Group 7: Error Handling & Degradation

#### TC-026: Trade Engine service unavailable (graceful handling)

**Feature:** Order Book Real-Time Display
**Type:** Error Handling / Resilience
**Priority:** P0 (Critical)

**Preconditions:**
- Trade Engine service is running
- API requests are successful

**Steps:**
1. Verify normal operation: GET `/api/v1/market/orderbook/BTC_TRY` returns 200
2. Stop Trade Engine service
3. Wait 5 seconds
4. Execute GET request to same endpoint
5. Observe error handling

**Expected Result:**
- Request returns graceful error (HTTP 503 or cached data)
- Error message: "Service unavailable" or cached data is served
- Response time < 5 seconds (timeout or cache fallback)
- User-friendly error message in Turkish/English
- No internal server errors (500) exposed
- Frontend shows: "Data may be outdated" if serving cache
- System recovers when Trade Engine restarts

**Actual Result:**
[To be filled during testing]

**HTTP Status:** [X]
**Response Time:** [X]ms
**Error Message:** [Message]

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach error response]

---

#### TC-027: Database connection failure (fallback to cache)

**Feature:** Order Book Real-Time Display
**Type:** Error Handling / Caching
**Priority:** P1 (High)

**Preconditions:**
- Cache is warm (recent data available)
- Database is accessible

**Steps:**
1. Verify normal operation
2. Stop database service temporarily
3. Ensure cache TTL has not expired
4. Execute GET request
5. Observe response

**Expected Result:**
- Request succeeds using cached data (HTTP 200)
- Data served from Redis cache (not fresh)
- Response includes indicator: `X-Cache: HIT` or timestamp is older
- No 500 error
- After 30 seconds (typical TTL), subsequent requests fail gracefully
- User data is not lost or corrupted

**Actual Result:**
[To be filled during testing]

**Fallback Used:** [Cache/Error]
**Cache Age:** [X] seconds old

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach cached response]

---

#### TC-028: Rate limiting on orderbook endpoint

**Feature:** Order Book Real-Time Display
**Type:** Performance / Security
**Priority:** P1 (High)

**Preconditions:**
- Rate limiting is configured (if applicable)
- Limit is documented (e.g., 1000 req/min per IP)

**Steps:**
1. Send 100 rapid requests in 1 second
2. Verify all succeed or graceful limiting
3. Continue sending for 2 minutes
4. Observe rate limit response

**Expected Result:**
- First requests: HTTP 200 (served)
- After limit exceeded: HTTP 429 Too Many Requests
- Rate limit headers present:
  - `X-RateLimit-Limit: 1000`
  - `X-RateLimit-Remaining: [X]`
  - `X-RateLimit-Reset: [timestamp]`
- Rate limit resets after window expires
- Graceful queue/backoff possible

**Actual Result:**
[To be filled during testing]

**Requests Sent:** 100
**Requests Accepted:** [X]
**Rate Limited (429):** [X]

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach rate limit response]

---

#### TC-029: Empty order book handling

**Feature:** Order Book Real-Time Display
**Type:** Error Handling / Edge Case
**Priority:** P1 (High)

**Preconditions:**
- Order book exists but has no active orders (unlikely but possible)

**Steps:**
1. Request orderbook for symbol with no orders
2. Observe response

**Expected Result:**
- HTTP 200 OK
- Response structure is valid:
```json
{
  "symbol": "BTC_TRY",
  "bids": [],
  "asks": [],
  "spread": null,
  "timestamp": "2025-11-24T14:30:45Z"
}
```
- Empty arrays instead of null
- Spread is null or omitted if no orders
- No error thrown
- Frontend handles empty orderbook gracefully

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach empty orderbook response]

---

#### TC-030: Extreme price levels (very high/low prices)

**Feature:** Order Book Real-Time Display
**Type:** Data Validation / Edge Case
**Priority:** P1 (High)

**Preconditions:**
- Order book contains edge case prices

**Steps:**
1. Create test orders at extreme prices (if testable)
   - Very high: 100,000,000 TRY
   - Very low: 0.00000001 TRY
2. Get orderbook
3. Verify response handles large numbers

**Expected Result:**
- Prices are returned as decimal strings (not scientific notation)
- Example: "0.00000001" (not "1e-8")
- No precision loss
- Sorting is correct despite extreme values
- Response is valid JSON

**Actual Result:**
[To be filled during testing]

**Status:** ⬜ Not Tested

**Screenshots:**
[Attach extreme price response]

---

## Test Execution Plan

### Pre-Test Checklist
- [ ] All services running and healthy (Trade Engine, Redis, PostgreSQL)
- [ ] Test environment configured correctly
- [ ] Postman collection imported
- [ ] WebSocket test harness ready
- [ ] Performance baselines recorded
- [ ] Test data prepared (BTC_TRY, ETH_TRY, USDT_TRY with test orders)

### Test Execution Steps
1. **Day 1 - API Testing:**
   - Execute TC-001 to TC-019 (Manual + Postman)
   - Record baseline latency and caching behavior
   - Verify all 3 trading pairs respond correctly

2. **Day 2 - WebSocket Testing:**
   - Execute TC-020 to TC-025 (WebSocket harness)
   - Verify real-time updates arrive within SLA
   - Test multi-symbol subscriptions
   - Monitor for connection stability

3. **Day 3 - Error Handling & Performance:**
   - Execute TC-026 to TC-030 (Error scenarios)
   - Run load testing for p99 latency
   - Verify graceful degradation when services are down
   - Execute full Postman collection via Newman

4. **Day 4 - Automated Tests:**
   - Run Cypress E2E tests for orderbook UI workflow
   - Run Jest unit tests for components/services
   - Generate coverage report (target: ≥80%)
   - Document all results

### Post-Test Activities
- [ ] Review all test results
- [ ] Document any failures with screenshots
- [ ] Report bugs with proper severity and reproduction steps
- [ ] Generate test coverage report
- [ ] Archive test logs and performance baselines
- [ ] Create sign-off report

---

## Test Case Summary Table

| TC ID | Description | Type | Priority | Status |
|-------|-------------|------|----------|--------|
| TC-001 | Get orderbook with default depth (20) | Functional | P0 | ⬜ Not Tested |
| TC-002 | Get orderbook for ETH_TRY | Functional | P0 | ⬜ Not Tested |
| TC-003 | Get orderbook for USDT_TRY | Functional | P0 | ⬜ Not Tested |
| TC-004 | Verify all required fields present | Data Validation | P0 | ⬜ Not Tested |
| TC-005 | Verify spread calculation | Data Validation | P1 | ⬜ Not Tested |
| TC-006 | Query with depth=20 | Parameter Validation | P0 | ⬜ Not Tested |
| TC-007 | Query with depth=100 | Parameter Validation | P0 | ⬜ Not Tested |
| TC-008 | Query with invalid depth values | Error Handling | P1 | ⬜ Not Tested |
| TC-009 | Default depth behavior | Functional | P0 | ⬜ Not Tested |
| TC-010 | Non-existent symbol (400 error) | Error Handling | P0 | ⬜ Not Tested |
| TC-011 | Empty symbol parameter | Error Handling | P0 | ⬜ Not Tested |
| TC-012 | Case sensitivity of symbol | Functional | P1 | ⬜ Not Tested |
| TC-013 | Symbol with SQL injection attempt | Security | P0 | ⬜ Not Tested |
| TC-014 | Single request response time < 100ms p99 | Performance | P0 | ⬜ Not Tested |
| TC-015 | Latency SLA verification | Performance | P0 | ⬜ Not Tested |
| TC-016 | First request hits database (fresh data) | Caching | P1 | ⬜ Not Tested |
| TC-017 | Second request hits Redis cache (faster) | Caching | P1 | ⬜ Not Tested |
| TC-018 | Cache expiration and refresh | Caching | P1 | ⬜ Not Tested |
| TC-019 | Cache hit ratio under load | Caching | P1 | ⬜ Not Tested |
| TC-020 | WebSocket subscription to orderbook | WebSocket | P0 | ⬜ Not Tested |
| TC-021 | Receive orderbook snapshot via WebSocket | WebSocket | P0 | ⬜ Not Tested |
| TC-022 | Receive real-time order book updates | WebSocket | P0 | ⬜ Not Tested |
| TC-023 | WebSocket update frequency matches SLA | WebSocket | P0 | ⬜ Not Tested |
| TC-024 | Multiple symbol subscriptions | WebSocket | P1 | ⬜ Not Tested |
| TC-025 | Graceful WebSocket disconnection | WebSocket | P1 | ⬜ Not Tested |
| TC-026 | Trade Engine unavailable handling | Error Handling | P0 | ⬜ Not Tested |
| TC-027 | Database failure fallback to cache | Error Handling | P1 | ⬜ Not Tested |
| TC-028 | Rate limiting on endpoint | Performance | P1 | ⬜ Not Tested |
| TC-029 | Empty order book handling | Error Handling | P1 | ⬜ Not Tested |
| TC-030 | Extreme price levels | Data Validation | P1 | ⬜ Not Tested |

---

## Postman Collection Structure

### Collection Name: `EPIC3 - Trading - Story 3.1`

#### Folder 1: Orderbook API - Happy Path
1. **GET /orderbook/BTC_TRY**
   - Description: Get BTC_TRY order book with default depth
   - Expected: 200 OK, valid orderbook response
   - Assertions: Status 200, has symbol, has bids, has asks, has timestamp

2. **GET /orderbook/BTC_TRY?depth=20**
   - Description: BTC_TRY with explicit depth=20
   - Expected: 200 OK, ≤20 levels per side
   - Assertions: bids.length ≤ 20, asks.length ≤ 20

3. **GET /orderbook/BTC_TRY?depth=100**
   - Description: BTC_TRY with depth=100
   - Expected: 200 OK, ≤100 levels per side
   - Assertions: bids.length ≤ 100, asks.length ≤ 100

4. **GET /orderbook/ETH_TRY**
   - Description: Get ETH_TRY order book
   - Expected: 200 OK
   - Assertions: symbol === "ETH_TRY"

5. **GET /orderbook/USDT_TRY**
   - Description: Get USDT_TRY order book
   - Expected: 200 OK
   - Assertions: symbol === "USDT_TRY"

#### Folder 2: Orderbook API - Error Cases
1. **GET /orderbook/INVALID_SYMBOL**
   - Description: Request with invalid symbol
   - Expected: 400 Bad Request
   - Assertions: Status 400, error message present

2. **GET /orderbook** (no symbol)
   - Description: Request without symbol
   - Expected: 400 Bad Request
   - Assertions: Status 400

3. **GET /orderbook/BTC_TRY?depth=-10**
   - Description: Negative depth parameter
   - Expected: 400 or default depth
   - Assertions: Valid response or error

#### Folder 3: Orderbook API - Performance Baseline
1. **Performance Test - 100 Requests (Sequential)**
   - Test: Execute 100 sequential GET requests
   - Measure: Response time for each
   - Assertions: All p99 < 100ms

2. **Cache Hit Test - Multiple Requests**
   - Test: Two rapid requests to same symbol
   - Measure: Response times
   - Assertions: Second request faster (cache hit)

#### Folder 4: Orderbook API - Data Validation
1. **GET /orderbook/BTC_TRY - Verify Response Structure**
   - Test: Validate JSON schema
   - Assertions:
     - `symbol` (string)
     - `bids` (array of objects with price, volume, count)
     - `asks` (array of objects with price, volume, count)
     - `spread` (decimal)
     - `timestamp` (ISO 8601)

2. **GET /orderbook/BTC_TRY - Verify Bid/Ask Ordering**
   - Test: Check sort order
   - Assertions:
     - Bids sorted descending by price
     - Asks sorted ascending by price

3. **GET /orderbook/BTC_TRY - Verify Spread Calculation**
   - Test: Calculate and compare spread
   - Assertions: `spread === asks[0].price - bids[0].price`

---

## Jest Unit Tests

### Test File: `orderbook.service.spec.ts`

```typescript
describe('OrderBookService', () => {
  // Test 1: getOrderBook - happy path
  it('should return valid orderbook snapshot for valid symbol', async () => {
    const result = await service.getOrderBook('BTC_TRY', 20);
    expect(result).toBeDefined();
    expect(result.symbol).toBe('BTC_TRY');
    expect(Array.isArray(result.bids)).toBe(true);
    expect(Array.isArray(result.asks)).toBe(true);
    expect(result.timestamp).toBeDefined();
  });

  // Test 2: getOrderBook - invalid symbol
  it('should throw error for invalid symbol', async () => {
    await expect(service.getOrderBook('INVALID', 20))
      .rejects.toThrow('Symbol not found');
  });

  // Test 3: depth parameter clamping
  it('should clamp depth to maximum 100', async () => {
    const result = await service.getOrderBook('BTC_TRY', 500);
    expect(result.bids.length).toBeLessThanOrEqual(100);
    expect(result.asks.length).toBeLessThanOrEqual(100);
  });

  // Test 4: caching behavior
  it('should return cached data on second request', async () => {
    const spy = jest.spyOn(redis, 'get');

    // First request
    await service.getOrderBook('BTC_TRY', 20);

    // Second request
    await service.getOrderBook('BTC_TRY', 20);

    // Cache should have been checked
    expect(spy).toHaveBeenCalledWith('orderbook:BTC_TRY');
  });

  // Test 5: spread calculation
  it('should calculate spread correctly', async () => {
    const result = await service.getOrderBook('BTC_TRY', 20);
    const expectedSpread = result.asks[0].price - result.bids[0].price;
    expect(result.spread).toBe(expectedSpread);
  });
});
```

---

## Cypress E2E Tests

### Test File: `orderbook.spec.ts`

```typescript
describe('Order Book Real-Time Display', () => {
  beforeEach(() => {
    cy.visit('/trading/BTC_TRY');
  });

  // Test 1: Orderbook displays with data
  it('should display orderbook with bids and asks', () => {
    cy.get('[data-testid="orderbook-bids"]')
      .should('be.visible')
      .find('[data-testid="bid-row"]')
      .should('have.length.greaterThan', 0);

    cy.get('[data-testid="orderbook-asks"]')
      .should('be.visible')
      .find('[data-testid="ask-row"]')
      .should('have.length.greaterThan', 0);
  });

  // Test 2: Real-time updates via WebSocket
  it('should update orderbook in real-time', () => {
    cy.get('[data-testid="orderbook-timestamp"]')
      .then(($el) => $el.text())
      .then((initialTime) => {
        // Wait for update
        cy.wait(2000);

        cy.get('[data-testid="orderbook-timestamp"]')
          .should(($el) => {
            expect($el.text()).not.toBe(initialTime);
          });
      });
  });

  // Test 3: Depth parameter in UI
  it('should allow changing depth parameter', () => {
    cy.get('[data-testid="depth-selector"]').select('100');
    cy.get('[data-testid="bid-row"]').should('have.length.lte', 100);
  });

  // Test 4: Spread visualization
  it('should display spread clearly', () => {
    cy.get('[data-testid="spread-indicator"]')
      .should('be.visible')
      .contains(/\d+\.\d+/);
  });
});
```

---

## Performance Baselines

### Expected Performance Metrics

| Metric | Target | Notes |
|--------|--------|-------|
| **API Response Time (p99)** | < 100ms | Measured over 100+ requests |
| **API Response Time (mean)** | < 50ms | Average response time |
| **Cache Hit Response Time** | < 20ms | Second+ requests |
| **Cache Miss Response Time** | 50-100ms | Fresh data from DB |
| **WebSocket Latency** | 100-500ms | From order to update delivery |
| **WebSocket Update Frequency** | 10+ updates/sec | ~100ms intervals |
| **Cache Hit Ratio** | > 95% | Under normal load |
| **Availability** | > 99.5% | Under normal conditions |

---

## Error Scenarios and Handling

### Scenario 1: Trade Engine Service Down
- **Impact:** Users cannot get fresh order book data
- **Handling:** Return cached data with "outdated" indicator
- **User Message:** "Data may be from a few minutes ago"
- **Recovery:** Auto-retry when service recovers

### Scenario 2: Database Connection Failure
- **Impact:** Cannot fetch fresh data
- **Handling:** Fall back to Redis cache immediately
- **Recovery:** Retry connection pool, eventually fail with 503

### Scenario 3: Redis Cache Down
- **Impact:** Loss of cache layer (performance impact)
- **Handling:** Query database directly (slower)
- **Recovery:** Cache service restarts automatically

### Scenario 4: Network Latency Issues
- **Impact:** Slower responses
- **Handling:** Implement connection pooling and timeouts
- **Recovery:** Requests queued, served when network recovers

### Scenario 5: Invalid Input
- **Impact:** Malformed requests
- **Handling:** Input validation, return 400 error
- **Example:** Invalid symbol, negative depth
- **Recovery:** User corrects request and retries

---

## Definition of Done

All test cases must be completed with the following criteria:

1. **Test Coverage:** All 30 test cases executed
2. **Pass Rate:** ≥ 95% of test cases pass
3. **Performance:** p99 latency < 100ms verified
4. **Caching:** Cache hit ratio > 95% confirmed
5. **WebSocket:** Real-time updates verified with < 500ms latency
6. **Graceful Degradation:** Service unavailability handled gracefully
7. **Security:** Input validation prevents SQL injection, XSS
8. **Documentation:** All results logged with screenshots/evidence
9. **Bugs:** All Critical/High bugs resolved before sign-off
10. **Automated Tests:** Postman, Cypress, Jest tests created and passing

---

## Approval Checklist

- [ ] All test cases executed and documented
- [ ] Test results reviewed by QA Lead
- [ ] All Critical/High bugs assigned and tracked
- [ ] Performance baselines met or exceeded
- [ ] WebSocket stability verified
- [ ] Error handling tested and working
- [ ] Automated test suites created and passing
- [ ] Coverage report generated (≥80%)
- [ ] Sign-off by Tech Lead
- [ ] Sign-off by Product Owner

---

## Document Information

**Document Owner:** QA Agent
**Test Lead:** QA Team
**Last Updated:** 2025-11-24
**Version:** 1.0
**Status:** Ready for Execution

---

## References

- **Feature Spec:** Story 3.1 - View Order Book (Real-Time) from `mvp-backlog-detailed.md`
- **API Documentation:** Trade Engine OpenAPI spec
- **Database Schema:** Order book tables documentation
- **Engineering Guidelines:** `/Inputs/engineering-guidelines.md`
