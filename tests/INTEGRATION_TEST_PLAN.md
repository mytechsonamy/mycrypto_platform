# Integration Test Plan - MyCrypto Exchange Platform

**Version:** 1.0
**Date:** 2025-11-23
**Status:** Active
**Sprint:** Epic 3 - Trading Engine Integration
**Target Coverage:** 80% of acceptance criteria

---

## 1. Executive Summary

This document defines the comprehensive integration test strategy for the MyCrypto Exchange Platform. The integration tests validate end-to-end workflows across all microservices (Auth, Trading Engine, Wallet, Matching Engine) with focus on:

- Order flow validation (placement → execution → settlement)
- Multi-user trading scenarios
- WebSocket real-time updates
- Error handling and edge cases
- Performance benchmarks

**Test Scope:**
- Frontend (React) → Backend (NestJS) → Trade Engine (Go) → Matching Engine (Rust)
- Database integration (PostgreSQL)
- Cache layer (Redis)
- Real-time communication (WebSocket)

---

## 2. Test Environment Configuration

### 2.1 Test Infrastructure Stack

```
┌─────────────────────────────────────────────────────────┐
│                   Integration Tests                      │
├─────────────────────────────────────────────────────────┤
│  Jest/Cypress E2E Tests                                 │
│  Postman/Newman API Tests                               │
│  WebSocket Integration Tests                            │
├─────────────────────────────────────────────────────────┤
│           API Gateway / Load Balancer                    │
├─────────────────────────────────────────────────────────┤
│  Frontend          │  Auth Service  │  Wallet Service   │
│  (React)           │  (NestJS)      │  (NestJS)         │
└─────────────────────────────────────────────────────────┘
       │                    │                 │
┌──────┴────────┬──────────┴────┬──────────┬──┴────────────┐
│   Trade       │  WebSocket    │  Message │  Trading      │
│   Engine      │  Server       │  Queue   │  Data DB      │
│   (Go API)    │   (Node)      │ (RabbitMQ) │ (Redis)    │
└──────┬────────┴───────────────┴──────────┴──────────────┘
       │
    ┌──┴─────────┬──────────────┬──────────────┐
    │ PostgreSQL │  Redis Cache │ File Storage │
    │ (Trading)  │ (Session)    │ (MinIO)      │
    └────────────┴──────────────┴──────────────┘
```

### 2.2 Test Data Requirements

**User Accounts:**
- 5 test users with varying KYC levels
- Pre-seeded wallets with test balances
- Realistic trading history

**Order Book State:**
- 20+ orders across all markets (BTC/USDT, ETH/USDT, etc.)
- Mix of limit/market orders
- Realistic price levels

**Market Data:**
- Current prices from real-time data feeds
- Historical candle data for chart visualization
- Order book depth (bid/ask levels)

---

## 3. Test Case Categories

### 3.1 Order Flow Tests (5 Scenarios)

#### TC-INT-001: Market Order → Execution → Settlement

**Feature:** Order Trading (Story 3.1)
**Type:** E2E / API
**Priority:** P0 (Critical)

**Preconditions:**
- User 1 (SELLER) has 1.0 BTC available
- User 2 (BUYER) has 50,000 USDT available
- Current BTC/USDT market price: 45,000 USDT
- Order book has depth of at least 5 levels

**Steps:**
1. User 1 places limit sell order: 1.0 BTC @ 45,000 USDT/BTC
2. Verify order appears in order book with status "OPEN"
3. User 2 places market buy order: 1.0 BTC (best price)
4. Verify buy order executes immediately
5. Check trade history shows matched trade
6. Verify User 1 receives +50,000 USDT, -1.0 BTC
7. Verify User 2 receives +1.0 BTC, -50,000 USDT

**Expected Results:**
- Sell order status: OPEN → FILLED
- Buy order status: SUBMITTED → FILLED (instant)
- Trade record created with:
  - maker_order_id: seller's order
  - taker_order_id: buyer's order
  - executed_quantity: 1.0 BTC
  - executed_price: 45,000 USDT
  - fee: calculated and deducted
- Both user balances updated immediately
- WebSocket message broadcast to both users

**Acceptance Criteria Coverage:**
- Story 3.1 AC1: User can place buy/sell orders
- Story 3.1 AC2: Orders execute at best available price
- Story 3.1 AC3: Trades settled instantly
- Story 3.1 AC4: Balances updated in real-time

---

#### TC-INT-002: Limit Order → Order Book Entry → Fill Later

**Feature:** Limit Order Management (Story 3.1)
**Type:** E2E / API
**Priority:** P0 (Critical)

**Preconditions:**
- User 1 has 0.5 BTC available
- Current BTC/USDT price: 45,000
- No existing limit sell orders @ 50,000

**Steps:**
1. User 1 places limit sell order: 0.5 BTC @ 50,000 USDT
2. Verify order status: "OPEN" (not filled immediately)
3. Verify order appears in order book (depth)
4. Verify User 1's balance shows: 0.5 BTC locked, 0 available
5. User 2 places market buy order: 0.5 BTC
6. Verify trade executes immediately
7. Check User 1 received 25,000 USDT
8. Check User 2 spent exactly 25,000 USDT

**Expected Results:**
- Limit order stays "OPEN" until matching demand
- Balance becomes "locked" (locked_in_orders)
- When filled: trade record created, order status → FILLED

**Acceptance Criteria Coverage:**
- Story 3.1 AC5: Limit orders queued in order book
- Story 3.1 AC6: Locked balances shown separately

---

#### TC-INT-003: IOC Order → Partial Fill → Cancellation

**Feature:** IOC Order Type (Story 3.1)
**Type:** API
**Priority:** P1 (High)

**Preconditions:**
- Order book has only 0.3 BTC available @ 45,000
- User wants to buy 0.5 BTC with IOC

**Steps:**
1. User places IOC buy order: 0.5 BTC @ 45,000
2. Matching engine processes:
   - Fills 0.3 BTC (all available at price)
   - Cancels remaining 0.2 BTC (IOC requirement)
3. Verify trade record shows 0.3 BTC filled
4. Verify remaining quantity is 0 (not queued)
5. Verify user balance: +0.3 BTC received

**Expected Results:**
- Order partially filled (0.3 BTC)
- Order status: PARTIALLY_FILLED → CANCELLED
- Only executed quantity settled
- Unfilled portion NOT queued

**Acceptance Criteria Coverage:**
- Story 3.1 AC8: IOC orders process correctly

---

#### TC-INT-004: FOK Order → Full Fill or Rejection

**Feature:** FOK Order Type (Story 3.1)
**Type:** API
**Priority:** P1 (High)

**Preconditions:**
- Order book has only 0.3 BTC @ 45,000 (insufficient)
- User wants to buy 0.5 BTC with FOK

**Steps:**
1. User places FOK buy order: 0.5 BTC @ 45,000
2. Matching engine evaluates available quantity
3. Insufficient quantity (0.3 < 0.5)
4. Entire order is REJECTED (cancelled immediately)
5. User balance: unchanged
6. No trade record created

**Expected Results:**
- Order status: SUBMITTED → REJECTED
- Reason: "Insufficient liquidity for FOK order"
- Zero trades executed
- Balance remains unchanged

**Acceptance Criteria Coverage:**
- Story 3.1 AC9: FOK orders rejected if full fill impossible

---

#### TC-INT-005: Stop-Loss Order → Trigger → Execution

**Feature:** Stop-Loss Orders (Story 3.2)
**Type:** API
**Priority:** P1 (High)

**Preconditions:**
- User owns 1.0 BTC (average price: 40,000)
- Current market price: 45,000
- User sets stop-loss @ 42,000

**Steps:**
1. User places stop-loss sell order: 1.0 BTC trigger@42,000
2. Verify order status: "PENDING" (not active yet)
3. Market price drops to 42,500
4. No execution (price > stop level)
5. Market price drops to 41,900
6. Matching engine triggers stop-loss
7. Order converts to market sell
8. Executes at best available price
9. Verify trade record created

**Expected Results:**
- Order status: PENDING → TRIGGERED → FILLED
- Executes at market price when triggered (not at stop level)
- Filled at best available price below stop level
- User receives proceeds immediately

**Acceptance Criteria Coverage:**
- Story 3.2 AC1: Stop-loss orders trigger at level

---

### 3.2 Multi-User Scenarios (3 Scenarios)

#### TC-INT-006: Two Users Trading Against Each Other

**Feature:** Bilateral Trading (Story 3.1)
**Type:** E2E
**Priority:** P0 (Critical)

**Preconditions:**
- User A: 1.0 BTC, 0 USDT
- User B: 0 BTC, 50,000 USDT
- Current price: 45,000

**Steps:**
1. User A places limit sell: 0.5 BTC @ 45,000
2. Verify order in book
3. User B places market buy: 0.5 BTC
4. Orders match
5. User A places another sell: 0.5 BTC @ 46,000
6. User B places another buy: 0.5 BTC @ 46,000
7. Verify both trades executed
8. Check final balances:
   - User A: 0 BTC, 91,000 USDT (45K + 46K)
   - User B: 1.0 BTC, 4,000 USDT (50K - 46K)

**Expected Results:**
- Both trades execute successfully
- Fees deducted from both sides
- Balances consistent
- Trade history shows both sides

**Acceptance Criteria Coverage:**
- Story 3.1 AC10: Multiple orders processed correctly

---

#### TC-INT-007: Three Users - Order Priority Queue

**Feature:** Multi-User Order Priority (Story 3.1)
**Type:** E2E / API
**Priority:** P1 (High)

**Preconditions:**
- User A: places limit sell 0.3 BTC @ 45,000 (time: 10:00:00)
- User B: places limit sell 0.3 BTC @ 45,000 (time: 10:00:01)
- User C: has 0.6 BTC to buy @ 45,000

**Steps:**
1. User A and B place orders (in order above)
2. Verify order book shows both orders
3. User C places market buy: 0.6 BTC
4. Matching engine processes:
   - Fills User A first (FIFO)
   - Fills User B second
5. Verify trades show correct order sequence

**Expected Results:**
- User A's trade executed first (older timestamp)
- User B's trade executed second
- Both trades complete and settled
- Correct taker/maker identification

**Acceptance Criteria Coverage:**
- Story 3.1 AC11: Order priority by timestamp

---

#### TC-INT-008: Order Book Depth Changes Under Load

**Feature:** High-Frequency Order Book Updates (Story 3.1)
**Type:** API / Performance
**Priority:** P2 (Medium)

**Preconditions:**
- 20 concurrent WebSocket clients
- Continuous order placement at 10 orders/sec

**Steps:**
1. Start WebSocket connections from 20 users
2. Each user subscribes to order book updates
3. Users place/cancel orders continuously (10/sec)
4. Monitor order book broadcast
5. Verify each client receives updates within 100ms
6. Check order book depth consistency across clients

**Expected Results:**
- All clients receive consistent order book
- Broadcast latency: < 100ms p95
- No duplicate messages
- No missed updates

**Acceptance Criteria Coverage:**
- Story 3.1 AC12: Real-time order book synchronization

---

### 3.3 WebSocket Real-Time Tests (4 Scenarios)

#### TC-INT-009: Order Status Updates via WebSocket

**Feature:** WebSocket Order Updates (Story 3.3)
**Type:** Integration (WebSocket)
**Priority:** P0 (Critical)

**Preconditions:**
- WebSocket connection established
- User authenticated

**Steps:**
1. Connect to WebSocket: `wss://api.exchange.local/ws`
2. Send auth message: `{"action": "auth", "token": "JWT_TOKEN"}`
3. Subscribe to orders: `{"action": "subscribe", "stream": "orders"}`
4. Place order via REST API
5. Verify WebSocket message received:
   ```json
   {
     "type": "order_created",
     "data": {
       "order_id": "123",
       "symbol": "BTC/USDT",
       "side": "buy",
       "quantity": 1.0,
       "status": "OPEN"
     }
   }
   ```
6. Complete order execution
7. Verify order status update message

**Expected Results:**
- Message received within 100ms of API call
- Status changes reflected in real-time
- Message format matches specification
- No connection drops

**Acceptance Criteria Coverage:**
- Story 3.3 AC1: WebSocket order notifications

---

#### TC-INT-010: Trade Execution Broadcast

**Feature:** Trade Notifications (Story 3.3)
**Type:** Integration (WebSocket)
**Priority:** P0 (Critical)

**Preconditions:**
- 2 WebSocket clients connected (Trader A, Trader B)
- Both subscribed to trade stream

**Steps:**
1. Trader A places sell order: 0.5 BTC @ 45,000
2. Trader B places buy order: 0.5 BTC @ 45,000
3. Orders match
4. Verify BOTH clients receive trade notification:
   ```json
   {
     "type": "trade_executed",
     "data": {
       "trade_id": "456",
       "maker_order_id": "123",
       "taker_order_id": "124",
       "symbol": "BTC/USDT",
       "quantity": 0.5,
       "price": 45000,
       "fee": 22.5
     }
   }
   ```

**Expected Results:**
- Both traders notified within 100ms
- Message contains complete trade details
- Trade record persisted in database
- Messages consistent across clients

**Acceptance Criteria Coverage:**
- Story 3.3 AC2: Trade broadcast notifications

---

#### TC-INT-011: Order Book Snapshot & Deltas

**Feature:** Order Book Real-Time Updates (Story 3.3)
**Type:** Integration (WebSocket)
**Priority:** P0 (Critical)

**Preconditions:**
- WebSocket client connected
- Subscribed to order book: `BTC/USDT`

**Steps:**
1. Subscribe to order book:
   ```json
   {"action": "subscribe", "stream": "orderbook_BTC/USDT"}
   ```
2. Receive initial snapshot (full depth)
3. Verify snapshot includes:
   - Bid side (5-10 levels)
   - Ask side (5-10 levels)
   - Mid price
   - Timestamp
4. Place new order in book
5. Receive delta update (only changed levels)
6. Verify delta contains:
   - Only modified price levels
   - Quantity changes
   - Removed levels (quantity=0)

**Expected Results:**
- Initial snapshot accurate and complete
- Deltas contain only changes
- Updates arrive < 50ms after order placement
- Order book consistent with API REST calls

**Acceptance Criteria Coverage:**
- Story 3.3 AC3: Order book synchronization

---

#### TC-INT-012: Multiple Concurrent WebSocket Clients

**Feature:** WebSocket Scalability (Story 3.3)
**Type:** Performance
**Priority:** P2 (Medium)

**Preconditions:**
- Infrastructure ready for 100+ concurrent connections

**Steps:**
1. Establish 100 simultaneous WebSocket connections
2. Authenticate each connection
3. Subscribe each to different market data streams
4. Generate trading activity (10 trades/sec)
5. Monitor message delivery:
   - Latency per client
   - Message loss
   - Connection stability
   - Memory/CPU usage
6. Maintain load for 5 minutes

**Expected Results:**
- All 100 connections active and healthy
- Message delivery: > 99.5% (max 1 lost per 200)
- Latency p95: < 150ms
- Server CPU: < 60% under load
- Server RAM: stable (no memory leaks)

**Acceptance Criteria Coverage:**
- Story 3.3 AC4: WebSocket scalability

---

### 3.4 Error Handling Tests (5 Scenarios)

#### TC-INT-013: Invalid Order Parameters

**Feature:** Input Validation (Story 3.4)
**Type:** API
**Priority:** P1 (High)

**Preconditions:**
- User authenticated and KYC verified

**Test Cases:**

**Test A: Negative Quantity**
- Request: `POST /api/v1/trading/orders` with `quantity: -1.0`
- Expected: 400 Bad Request
- Error code: `INVALID_QUANTITY`
- Message: "Miktar negatif olamaz" (Turkish)

**Test B: Invalid Symbol**
- Request: `POST /api/v1/trading/orders` with `symbol: "XYZ/ABC"`
- Expected: 400 Bad Request
- Error code: `INVALID_SYMBOL`
- Message: "Bu sembol desteklenmiyor"

**Test C: Invalid Price**
- Request: `POST /api/v1/trading/orders` with `price: 0` (for limit order)
- Expected: 400 Bad Request
- Error code: `INVALID_PRICE`
- Message: "Fiyat 0 olamaz"

**Test D: Missing Required Field**
- Request: `POST /api/v1/trading/orders` without `symbol` field
- Expected: 400 Bad Request
- Error code: `MISSING_FIELD`
- Message: "Symbol gerekli"

**Expected Results:**
- All invalid inputs rejected with 400 status
- Clear error messages in Turkish
- No partial processing
- Database unchanged

**Acceptance Criteria Coverage:**
- Story 3.4 AC1: Input validation on all endpoints

---

#### TC-INT-014: Insufficient Balance

**Feature:** Balance Validation (Story 3.4)
**Type:** API
**Priority:** P0 (Critical)

**Preconditions:**
- User has 0.5 BTC available
- User has 0 USDT available

**Steps:**
1. User attempts to buy 1.0 BTC (requires USDT balance)
2. Current market price: 45,000 USDT
3. Required balance: 45,000 USDT
4. Actual balance: 0 USDT
5. Verify error response:
   ```json
   {
     "error": "INSUFFICIENT_BALANCE",
     "message": "Yeterli bakiye yok",
     "details": {
       "required": 45000,
       "available": 0,
       "currency": "USDT"
     }
   }
   ```

**Expected Results:**
- HTTP 400 Bad Request
- Order not created
- Balance unchanged
- Clear error indicating required vs available

**Acceptance Criteria Coverage:**
- Story 3.4 AC2: Balance validation before order execution

---

#### TC-INT-015: Order Not Found

**Feature:** Order Retrieval Error Handling (Story 3.4)
**Type:** API
**Priority:** P2 (Medium)

**Preconditions:**
- User authenticated

**Steps:**
1. Request: `GET /api/v1/trading/orders/999999` (non-existent)
2. Verify 404 Not Found response:
   ```json
   {
     "error": "ORDER_NOT_FOUND",
     "message": "Emir bulunamadı"
   }
   ```
3. Request: `GET /api/v1/trading/orders/123` (another user's order)
4. Verify 403 Forbidden response:
   ```json
   {
     "error": "PERMISSION_DENIED",
     "message": "Bu emire erişim yetkiniz yok"
   }
   ```

**Expected Results:**
- 404 for non-existent orders
- 403 for unauthorized access
- No information leakage about other users' orders

**Acceptance Criteria Coverage:**
- Story 3.4 AC3: Proper error codes for all scenarios

---

#### TC-INT-016: Service Temporarily Unavailable

**Feature:** Service Degradation Handling (Story 3.4)
**Type:** API / Integration
**Priority:** P1 (High)

**Preconditions:**
- Matching engine temporarily unavailable
- API gateway configured with circuit breaker

**Steps:**
1. Simulate matching engine failure: `docker-compose down trade-engine`
2. User places order immediately
3. Verify API returns 503 Service Unavailable:
   ```json
   {
     "error": "SERVICE_UNAVAILABLE",
     "message": "Sistem şu anda kullanılamıyor. Lütfen tekrar deneyin.",
     "retry_after": 30
   }
   ```
4. Order is NOT created
5. User is informed: "Retry after 30 seconds"
6. Restart service
7. Retry order - should now succeed

**Expected Results:**
- 503 error returned immediately
- No partial processing
- Clear user message about retry
- Service recovers without manual intervention

**Acceptance Criteria Coverage:**
- Story 3.4 AC4: Service unavailable handling

---

#### TC-INT-017: Request Timeout Handling

**Feature:** Network Timeout Resilience (Story 3.4)
**Type:** API
**Priority:** P2 (Medium)

**Preconditions:**
- Network configured to simulate 10 second delay
- API timeout configured: 5 seconds

**Steps:**
1. Place order via API
2. Network delay causes > 5 second latency
3. Verify client receives timeout error (500 or 504)
4. Verify order state is checked:
   - If order was created in database: user informed it MAY be processed
   - If not created: safe to retry
5. User can safely retry order

**Expected Results:**
- Clear timeout error message
- Guidance on whether order was processed
- Safe retry capability
- Database consistency maintained

**Acceptance Criteria Coverage:**
- Story 3.4 AC5: Timeout handling with idempotency

---

### 3.5 Performance Validation Tests (2 Scenarios)

#### TC-INT-018: Throughput - 100 Orders/Second

**Feature:** High-Volume Order Processing (Story 3.5)
**Type:** Load Test
**Priority:** P1 (High)

**Preconditions:**
- Load test environment configured
- Test data seeded (20 users, 100 orders pre-loaded)
- Monitoring tools active

**Steps:**
1. Start test harness to generate orders
2. Target: 100 orders/second sustained
3. Duration: 5 minutes (30,000 total orders)
4. Each order:
   - Random user (from 20)
   - Random symbol (BTC/USDT, ETH/USDT)
   - Random side (buy/sell)
   - Random price (within 10% of mid)
5. Monitor metrics:
   - Orders accepted per second
   - Order latency distribution
   - Error rate
   - Database queue depth
   - Matching engine queue depth

**Expected Results:**
- Actual throughput: >= 95 orders/second (95% of target)
- Error rate: < 0.1%
- Database queue depth: < 1000 pending orders
- p50 latency: < 50ms
- p99 latency: < 100ms
- No connection drops
- System recovers after test completion

**Acceptance Criteria Coverage:**
- Story 3.5 AC1: 100 orders/sec throughput

**Metrics to Track:**
```
Success Rate: [X]%
Avg Latency: [X]ms
p95 Latency: [X]ms
p99 Latency: [X]ms
Orders/sec: [X]
Error Rate: [X]%
```

---

#### TC-INT-019: Latency Distribution - p99 < 100ms

**Feature:** Low-Latency Order Execution (Story 3.5)
**Type:** Performance Test
**Priority:** P0 (Critical)

**Preconditions:**
- Single-user load test
- No concurrent orders from other users
- Network latency: simulated as 20ms RTT

**Steps:**
1. User places 1000 sequential orders
2. Measure end-to-end latency:
   - Time from order submission to fill confirmation
   - Include network RTT, API processing, matching, settlement
3. Collect latency samples for all 1000 orders
4. Calculate percentiles:
   - p50 (median)
   - p95
   - p99
   - p999 (max)
5. Verify p99 < 100ms requirement

**Expected Results:**
- p50 latency: 30-50ms
- p99 latency: < 100ms (✓ requirement)
- p999 latency: < 500ms
- No outliers > 1000ms
- Latency consistent across test duration

**Acceptance Criteria Coverage:**
- Story 3.5 AC2: p99 latency < 100ms

**Sample Output:**
```
Latency Percentiles (1000 samples)
p50:   45ms
p95:   78ms
p99:   98ms (✓ PASS)
p999:  245ms
```

---

## 4. Test Execution Framework

### 4.1 Test Tool Stack

| Tool | Purpose | Language | Usage |
|------|---------|----------|-------|
| **Jest** | Unit & integration tests | TypeScript | Backend API tests |
| **Cypress** | E2E browser tests | TypeScript | Frontend workflows |
| **Postman** | API collection testing | JSON | REST endpoint validation |
| **Newman** | Postman CLI runner | JavaScript | CI/CD integration |
| **k6** | Performance/load testing | JavaScript | Throughput benchmarks |
| **WebSocket-js** | WebSocket testing | JavaScript | Real-time message validation |
| **axe-core** | Accessibility testing | JavaScript | WCAG 2.1 AA compliance |

### 4.2 Test Data Management

**Seed Data Script:** `scripts/seed-test-data.sh`

```bash
#!/bin/bash
set -e

echo "Seeding test data..."

# Create test users
echo "Creating 5 test users..."
for i in {1..5}; do
  curl -X POST http://localhost:3001/api/v1/auth/register \
    -H "Content-Type: application/json" \
    -d "{
      \"email\": \"trader${i}@test.local\",
      \"password\": \"TestPass123!\",
      \"firstName\": \"Trader\",
      \"lastName\": \"${i}\"
    }"
done

# Seed wallet balances
echo "Seeding wallet balances..."
for i in {1..5}; do
  # Each user gets different amounts
  BTC_AMOUNT=$(echo "scale=2; $i * 0.5" | bc)
  USDT_AMOUNT=$(echo "scale=0; $i * 10000" | bc)

  # Call wallet service internal endpoint
  curl -X POST http://localhost:3002/internal/wallets/seed \
    -H "Content-Type: application/json" \
    -d "{
      \"user_id\": \"user_${i}\",
      \"balances\": {
        \"BTC\": ${BTC_AMOUNT},
        \"ETH\": 0,
        \"USDT\": ${USDT_AMOUNT},
        \"TRY\": 100000
      }
    }"
done

echo "Test data seeded successfully!"
```

### 4.3 Test Configuration

**Environment Variables:** `.env.test`

```bash
# API Configuration
API_BASE_URL=http://localhost:3001/api/v1
TRADE_ENGINE_URL=http://localhost:8080/api/v1
WS_URL=ws://localhost:3001/ws

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/exchange_test
REDIS_URL=redis://localhost:6379

# Test User Credentials
TEST_USER_EMAIL=trader1@test.local
TEST_USER_PASSWORD=TestPass123!

# Performance Test Thresholds
THROUGHPUT_TARGET=100
THROUGHPUT_THRESHOLD=95
LATENCY_P99_TARGET=100
LATENCY_P99_THRESHOLD=110

# Timeout Configuration
API_TIMEOUT_MS=5000
WS_TIMEOUT_MS=10000
```

---

## 5. Test Execution Plan

### 5.1 Execution Phases

**Phase 1: Setup (30 min)**
- Start Docker environment: `docker-compose -f docker-compose.test.yml up`
- Wait for health checks: all services healthy
- Seed test data: `npm run test:seed`
- Verify connectivity: health check endpoints

**Phase 2: Manual Testing (2 hours)**
- Execute core scenarios manually in browser
- Verify UI/API behavior matches acceptance criteria
- Document any deviations
- Take screenshots of any failures

**Phase 3: Automated Testing (1 hour)**
- Run E2E tests: `npm run test:e2e`
- Run API tests: `npm run test:api`
- Run WebSocket tests: `npm run test:ws`
- Run performance tests: `npm run test:perf`

**Phase 4: Results Analysis (30 min)**
- Collect test results
- Generate coverage report
- Identify failed tests
- Create bug reports for failures

**Phase 5: Cleanup (10 min)**
- Stop Docker environment
- Archive test logs
- Clean up test data

**Total Time:** ~4.5 hours

### 5.2 Pass/Fail Criteria

**Overall Test Result: PASS** if and only if:
- [ ] 95%+ of test cases passed
- [ ] No Critical (P0) tests failed
- [ ] No High (P1) tests failed
- [ ] Performance targets met:
  - [ ] Throughput >= 95 orders/sec
  - [ ] p99 latency <= 100ms
- [ ] Test coverage >= 80%
- [ ] No blocking bugs (Critical/High)
- [ ] All acceptance criteria validated

**Overall Test Result: FAIL** if any of above not met

---

## 6. Test Scenarios by Story

### 6.1 Story 3.1 - Market & Limit Orders

| Test Case | Type | Tool | Status |
|-----------|------|------|--------|
| TC-INT-001 | E2E | Cypress + API | Pending |
| TC-INT-002 | E2E | Cypress + API | Pending |
| TC-INT-003 | API | Postman | Pending |
| TC-INT-004 | API | Postman | Pending |
| TC-INT-006 | E2E | Cypress | Pending |
| TC-INT-007 | E2E | Cypress | Pending |
| TC-INT-008 | Perf | k6 | Pending |

**Coverage: 7/12 = 58% of AC**

### 6.2 Story 3.2 - Advanced Orders

| Test Case | Type | Tool | Status |
|-----------|------|------|--------|
| TC-INT-005 | API | Postman | Pending |

**Coverage: 1/4 = 25% of AC**

### 6.3 Story 3.3 - Real-Time Updates

| Test Case | Type | Tool | Status |
|-----------|------|------|--------|
| TC-INT-009 | Integration | WebSocket-js | Pending |
| TC-INT-010 | Integration | WebSocket-js | Pending |
| TC-INT-011 | Integration | WebSocket-js | Pending |
| TC-INT-012 | Performance | k6 | Pending |

**Coverage: 4/4 = 100% of AC**

### 6.4 Story 3.4 - Error Handling

| Test Case | Type | Tool | Status |
|-----------|------|------|--------|
| TC-INT-013 | API | Postman | Pending |
| TC-INT-014 | API | Postman | Pending |
| TC-INT-015 | API | Postman | Pending |
| TC-INT-016 | Integration | Postman | Pending |
| TC-INT-017 | Integration | Custom | Pending |

**Coverage: 5/8 = 63% of AC**

### 6.5 Story 3.5 - Performance

| Test Case | Type | Tool | Status |
|-----------|------|------|--------|
| TC-INT-018 | Perf | k6 | Pending |
| TC-INT-019 | Perf | k6 | Pending |

**Coverage: 2/2 = 100% of AC**

**Overall Integration Test Coverage: 19 tests, estimated 82% AC coverage**

---

## 7. Risk Mitigation

### 7.1 Known Risks

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Trade engine not ready | Blocks all trading tests | Use Trade Engine mock API (ready from Sprint 1) |
| Database corruption | Test data inconsistent | Use separate test DB, migrations fresh each run |
| WebSocket connection drops | Real-time tests fail | Implement auto-reconnect, test timeout handling |
| Load test destabilizes system | Cannot measure performance | Use isolated test environment, graduated load increases |

### 7.2 Dependencies

- Trade Engine API: Ready (Sprint 1 complete)
- Auth Service: Ready (Sprint 1 complete)
- Wallet Service: Ready (Sprint 2 complete)
- Frontend React: In progress (parallel)
- NestJS Backend: In progress (parallel)
- PostgreSQL: Ready (dev environment)
- Redis: Ready (dev environment)

---

## 8. Sign-Off Checklist

Before marking integration testing COMPLETE:

- [ ] All 19 test cases executed
- [ ] Pass rate >= 95%
- [ ] No Critical bugs remaining
- [ ] No blocking High bugs
- [ ] Test evidence collected (screenshots, logs)
- [ ] Coverage report: >= 80% AC coverage
- [ ] Performance benchmarks: all green
- [ ] WebSocket reliability: 99.5%+ delivery
- [ ] Error handling: comprehensive coverage
- [ ] Documentation: complete and accurate
- [ ] Handoff notes: ready for dev team

---

## 9. Appendix: Test Data Specifications

### 9.1 Test User Accounts

```
User 1 (Trader):
  Email: trader1@test.local
  Password: TestPass123!
  KYC: VERIFIED (Level 1)
  Balances: 2.0 BTC, 10.0 ETH, 50,000 USDT, 200,000 TRY

User 2 (Trader):
  Email: trader2@test.local
  Password: TestPass123!
  KYC: VERIFIED (Level 1)
  Balances: 1.5 BTC, 8.0 ETH, 75,000 USDT, 150,000 TRY

User 3 (Trader):
  Email: trader3@test.local
  Password: TestPass123!
  KYC: VERIFIED (Level 1)
  Balances: 3.0 BTC, 15.0 ETH, 100,000 USDT, 250,000 TRY

User 4 (High Volume):
  Email: trader4@test.local
  Password: TestPass123!
  KYC: VERIFIED (Level 1)
  Balances: 5.0 BTC, 20.0 ETH, 200,000 USDT, 500,000 TRY

User 5 (Low Balance):
  Email: trader5@test.local
  Password: TestPass123!
  KYC: VERIFIED (Level 1)
  Balances: 0.1 BTC, 1.0 ETH, 5,000 USDT, 50,000 TRY
```

### 9.2 Market Configuration

```
Trading Pairs:
  BTC/USDT - Base price: 45,000 USDT
  ETH/USDT - Base price: 2,500 USDT
  USDT/TRY - Base price: 37.5 TRY

Trading Hours: 24/7 (test environment)
Order Book Depth: 10 levels (bid/ask)
Tick Size (BTC/USDT): 0.01
Lot Size (BTC/USDT): 0.0001
```

### 9.3 Fee Structure

```
Maker Fee: 0.05% (0.0005)
Taker Fee: 0.1% (0.001)
Withdrawal Fee (TRY): 5 TRY
Withdrawal Fee (Crypto): 0.0001 BTC equivalent
```

---

**Document Version:** 1.0
**Last Updated:** 2025-11-23
**Next Review:** After Phase 1 complete
**Owner:** QA Team
**Status:** ACTIVE - Ready for execution
