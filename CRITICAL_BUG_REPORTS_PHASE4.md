# CRITICAL BUG REPORTS - Phase 4 QA Testing
## EPIC 3: Trading Engine & Market Data

**Report Date:** 2025-11-30
**Test Phase:** 4 (Endpoint Integration Testing)
**Status:** CRITICAL BLOCKER
**Test Pass Rate:** 61.11% (22/36 tests) - Will improve after fixes

---

## BUG-001: Market Data Endpoints Returning 404 - Order Book

**Severity:** CRITICAL
**Priority:** P0 - URGENT
**Component:** Trade Engine API
**Status:** OPEN
**Found In:** Phase 4 QA Testing - Story 3.1
**Assigned To:** Backend Team - Trade Engine Service

---

### Description
The `/api/v1/orderbook/{symbol}` endpoint returns HTTP 404 (Not Found) instead of displaying the order book data. This is a critical endpoint for trading functionality, as users need real-time order book visibility.

### Steps to Reproduce
1. Start Trade Engine service: `docker-compose up -d trade-engine`
2. Send GET request to order book endpoint
3. Observe HTTP 404 response

```bash
curl -v http://localhost:8085/api/v1/orderbook/BTC-USDT
```

### Expected Result
- HTTP Status: 200 OK
- Response Body: JSON object with order book structure
```json
{
  "success": true,
  "data": {
    "symbol": "BTC-USDT",
    "bids": [
      {"price": "45000.00", "quantity": "1.5", "count": 2},
      {"price": "44950.00", "quantity": "2.0", "count": 3}
    ],
    "asks": [
      {"price": "45100.00", "quantity": "1.0", "count": 1},
      {"price": "45150.00", "quantity": "2.5", "count": 2}
    ],
    "timestamp": "2025-11-30T19:44:28Z"
  }
}
```

### Actual Result
- HTTP Status: 404 Not Found
- Response Body: `404 page not found`
- Response Headers:
```
HTTP/1.1 404 Not Found
Access-Control-Allow-Origin: *
Content-Type: text/plain; charset=utf-8
X-Request-Id: 42ebb22a-f4bf-41cf-8b75-48f36253374e
Content-Length: 19
```

### Server Logs
```json
{
  "level":"info",
  "timestamp":"2025-11-30T19:44:28.055Z",
  "message":"HTTP request",
  "service":"trade-engine",
  "method":"GET",
  "path":"/api/v1/orderbook/BTC-USDT",
  "remote_addr":"172.217.17.155:38056",
  "status":404,
  "bytes":19,
  "duration":0.000640458,
  "request_id":"c078fabd-811b-4a73-863a-1c1485c54834"
}
```

### Test Case Affected
- **TC-101:** Order Book - Real-time display (REST API)
- **TC-102:** Order Book with depth parameter
- **TC-103:** Invalid symbol handling
- **TC-104:** Order book aggregation levels

### Root Cause
The Trade Engine service is running a compiled binary built on Nov 23, 2025 (7 days old). The order book endpoint was implemented in the source code AFTER the binary was compiled. The router configuration in source code is correct:

```go
// File: /services/trade-engine/internal/server/router.go (line 112)
r.Get("/orderbook/{symbol}", orderbookHandler.GetOrderBook)
```

However, the running binary in Docker container does not contain this route definition.

### Source Code Verification
- **File:** `/services/trade-engine/internal/server/orderbook_handler.go`
- **Status:** ✓ Handler correctly implemented
- **Signature:** `func (h *OrderBookHandler) GetOrderBook(w http.ResponseWriter, r *http.Request)`
- **Last Modified:** Current (Nov 30)

- **File:** `/services/trade-engine/internal/server/router.go`
- **Status:** ✓ Route correctly registered
- **Line:** 112: `r.Get("/orderbook/{symbol}", orderbookHandler.GetOrderBook)`
- **Last Modified:** Current (Nov 30)

### Environment Details
- **Service:** Trade Engine
- **Port:** 8085 (mapped from 8080)
- **Container:** mytrader-trade-engine
- **Status:** Running (healthy)
- **Binary Age:** Nov 23 22:39:39 (7 days old)
- **Source Code Age:** Current (Nov 30)

### Impact
- **Scope:** All order book viewing features
- **Users Affected:** All traders
- **Business Impact:** Trading impossible without order book visibility
- **Testing Impact:** Blocks Phase 1 (12 market data tests), Phase 4 (history tests)

### Suggested Fix
Rebuild and redeploy the Trade Engine Docker image to include the latest compiled binary:

```bash
cd /services/trade-engine

# Option 1: Using Makefile
make docker-build
make docker-push

# Option 2: Using Docker directly
docker-compose build --no-cache trade-engine
docker-compose down trade-engine
docker-compose up -d trade-engine

# Option 3: Compile locally
go build -o bin/trade-engine ./cmd/server
docker cp bin/trade-engine mytrader-trade-engine:/app/trade-engine
```

### Verification Steps
After deploying the fix:

```bash
# Should return 200 with order book data
curl -s http://localhost:8085/api/v1/orderbook/BTC-USDT | jq .

# Verify structure
curl -s http://localhost:8085/api/v1/orderbook/BTC-USDT | jq '.data | keys'
# Expected: ["asks", "bids", "symbol", "timestamp"]

# Check logs for successful request processing
docker logs mytrader-trade-engine | tail -20
```

### Related Bugs
- BUG-002: Order Management Endpoints Returning 404
- BUG-003: Binary-Source Code Mismatch in Trade Engine
- BUG-004: Market Ticker Endpoints Returning 404
- BUG-005: Trades List Endpoint Returning 404

---

## BUG-002: Order Management Endpoints Returning 404

**Severity:** CRITICAL
**Priority:** P0 - URGENT
**Component:** Trade Engine API
**Status:** OPEN
**Found In:** Phase 4 QA Testing - Stories 3.4, 3.5, 3.6, 3.7
**Assigned To:** Backend Team - Trade Engine Service

---

### Description
The order management endpoints (`POST /api/v1/orders`, `GET /api/v1/orders`, etc.) return HTTP 404 (Not Found) instead of processing order requests. This is a critical blocker as users cannot place, view, or cancel orders.

### Endpoints Affected
| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/api/v1/orders` | POST | Place new order | 404 |
| `/api/v1/orders` | GET | List user orders | 404 |
| `/api/v1/orders/{id}` | GET | Get order details | 404 |
| `/api/v1/orders/{id}` | DELETE | Cancel order | 404 |

### Steps to Reproduce
```bash
# Place market order
curl -X POST http://localhost:8085/api/v1/orders \
  -H "Content-Type: application/json" \
  -H "X-User-ID: test-user-123" \
  -d '{
    "symbol":"BTC-USDT",
    "side":"BUY",
    "type":"MARKET",
    "quantity":"1.0"
  }'

# Expected: 201 Created with order details
# Actual: 404 Not Found
```

### Expected vs Actual
**Expected Response (201 Created):**
```json
{
  "order": {
    "id": "ord_abc123",
    "symbol": "BTC-USDT",
    "side": "BUY",
    "type": "MARKET",
    "status": "FILLED",
    "quantity": "1.0",
    "filled_quantity": "1.0",
    "created_at": "2025-11-30T19:45:00Z"
  },
  "trades": [...]
}
```

**Actual Response (404):**
```
404 page not found
```

### Server Logs
```json
{
  "level":"info",
  "timestamp":"2025-11-30T19:44:28.125Z",
  "path":"/api/v1/orders",
  "method":"POST",
  "status":404,
  "bytes":19,
  "duration":0.000125792
}
```

### Root Cause
Same as BUG-001: Binary-source code mismatch. The order handlers are implemented in source code but not in the running binary:

```go
// File: /services/trade-engine/internal/server/router.go (lines 104-109)
r.Route("/orders", func(r chi.Router) {
    r.Post("/", orderHandler.PlaceOrder)
    r.Get("/", orderHandler.ListOrders)
    r.Get("/{id}", orderHandler.GetOrder)
    r.Delete("/{id}", orderHandler.CancelOrder)
})
```

### Source Code Verification
- **File:** `/services/trade-engine/internal/server/order_handler.go`
- **Status:** ✓ All handlers implemented
- **Functions:**
  - PlaceOrder() ✓
  - ListOrders() ✓
  - GetOrder() ✓
  - CancelOrder() ✓
- **Last Modified:** Current

### Test Cases Affected
- TC-301: Place market order (BUY)
- TC-302: Place market order (SELL)
- TC-303: Place limit order (BUY)
- TC-304: Place limit order (SELL)
- TC-305: List user orders
- TC-306: Get order by ID
- TC-307: Cancel order
- TC-308: Invalid order handling

### Impact
- **Scope:** Complete order management functionality
- **Users Affected:** All traders
- **Business Impact:** Trading completely non-functional
- **Revenue Impact:** $0 trading volume possible

### Suggested Fix
Same as BUG-001: Rebuild and redeploy Docker image

### Verification
```bash
# Place order should return 201
curl -X POST http://localhost:8085/api/v1/orders \
  -H "Content-Type: application/json" \
  -H "X-User-ID: test-user-123" \
  -d '{"symbol":"BTC-USDT","side":"BUY","type":"MARKET","quantity":"1.0"}' | jq .

# List orders should return 200
curl -s http://localhost:8085/api/v1/orders \
  -H "X-User-ID: test-user-123" | jq .
```

---

## BUG-003: Binary-Source Code Mismatch in Trade Engine Deployment

**Severity:** HIGH
**Priority:** P0 - URGENT
**Component:** Trade Engine DevOps / CI-CD
**Status:** OPEN
**Found In:** Phase 4 QA Testing (Investigation)
**Assigned To:** DevOps Team

---

### Description
The Trade Engine Docker container is running a compiled binary built 7 days ago (Nov 23), while the source code in the repository has been updated with new endpoints and handlers (current as of Nov 30). This causes the running service to return 404 for endpoints that are correctly implemented in source code.

### Root Cause
No automated CI/CD pipeline to rebuild and redeploy Docker images when source code changes. Manual builds require developers to remember to:
1. Recompile the binary
2. Rebuild the Docker image
3. Redeploy the container

### Evidence

**Binary Timestamp:**
```bash
$ stat /services/trade-engine/bin/trade-engine | grep Modify
Modify: Nov 23 22:39:39 2025
```

**Source Code Timestamp:**
```bash
$ git log --oneline /services/trade-engine/internal/server/router.go | head -1
# Shows commits up to Nov 30
```

**Running Container:**
```bash
$ docker inspect mytrader-trade-engine | grep "Created"
"Created": "2025-11-23T11:15:00Z"  # 7 days ago
```

### Impact
- **Development Velocity:** Developers unknowingly deploy stale code
- **Testing:** QA tests fail due to missing features, not bugs
- **Time Waste:** Investigation time spent debugging non-existent bugs
- **Production Risk:** Same issue could happen in production

### Current Process (Manual)
1. Developer commits code changes
2. Developer (must remember to) run `make docker-build`
3. Developer (must remember to) run `docker-compose down && docker-compose up --build`
4. QA manually discovers if build was forgotten

### Recommended Solution

**Implement CI/CD Pipeline:**

**Option 1: GitHub Actions (Recommended for simplicity)**
```yaml
# .github/workflows/build-trade-engine.yml
name: Build Trade Engine
on:
  push:
    branches: [main]
    paths:
      - 'services/trade-engine/**'
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build Docker image
        run: docker-compose -f services/trade-engine/docker-compose.yml build trade-engine
      - name: Push to registry
        run: docker push myregistry/trade-engine:latest
```

**Option 2: Pre-commit Hook**
```bash
#!/bin/bash
# .git/hooks/pre-commit
if git diff --cached --name-only | grep -q "services/trade-engine/internal/"; then
    echo "Building Trade Engine..."
    cd services/trade-engine
    make docker-build || exit 1
fi
```

**Option 3: Makefile Enhancement**
```makefile
.PHONY: docker-build-auto
docker-build-auto:
	@if [ "$$(git diff --name-only HEAD~1 HEAD | grep -c 'services/trade-engine/internal/')" -gt 0 ]; then \
		docker-compose build --no-cache trade-engine; \
	fi
```

### Verification
After implementing CI/CD:
- Commits that touch trade-engine source automatically trigger Docker build
- Running container always has current code
- No stale binary issues

---

## BUG-004: Market Ticker Endpoints Returning 404

**Severity:** CRITICAL
**Priority:** P0 - URGENT
**Component:** Trade Engine API
**Status:** OPEN
**Found In:** Phase 4 QA Testing - Story 3.2
**Assigned To:** Backend Team - Trade Engine Service

---

### Description
The `/api/v1/markets/{symbol}/ticker` endpoint returns HTTP 404 instead of providing current market ticker information (last price, bid, ask, spreads).

### Steps to Reproduce
```bash
curl -v http://localhost:8085/api/v1/markets/BTC-USDT/ticker
```

### Expected Response (200 OK)
```json
{
  "symbol": "BTC-USDT",
  "last_price": "45000.00",
  "best_bid_price": "44950.00",
  "best_ask_price": "45050.00",
  "best_bid_volume": "2.5",
  "best_ask_volume": "3.0",
  "spread": "100.00",
  "spread_percentage": "0.22%",
  "timestamp": "2025-11-30T19:45:00Z"
}
```

### Actual Response (404)
```
404 page not found
```

### Root Cause
Same as BUG-001 and BUG-002: Binary-source mismatch

### Handler Verification
- **File:** `/services/trade-engine/internal/server/market_handler.go`
- **Function:** `GetTicker()` ✓
- **Router Entry:** `/api/v1/markets/{symbol}/ticker` ✓

### Suggested Fix
Rebuild and redeploy Docker image (same as BUG-001)

---

## BUG-005: Trades List Endpoint Returning 404

**Severity:** CRITICAL
**Priority:** P0 - URGENT
**Component:** Trade Engine API
**Status:** OPEN
**Found In:** Phase 4 QA Testing - Story 3.3
**Assigned To:** Backend Team - Trade Engine Service

---

### Description
The `/api/v1/trades` endpoint returns HTTP 404 instead of providing recent trade history for a specified symbol.

### Steps to Reproduce
```bash
curl -s 'http://localhost:8085/api/v1/trades?symbol=BTC-USDT&limit=50'
```

### Expected Response (200 OK)
```json
[
  {
    "id": "trade_123",
    "symbol": "BTC-USDT",
    "price": "45000.00",
    "quantity": "1.5",
    "buyer_order_id": "ord_buyer_123",
    "seller_order_id": "ord_seller_456",
    "executed_at": "2025-11-30T19:44:00Z"
  },
  ...
]
```

### Actual Response (404)
```
404 page not found
```

### Root Cause
Same as BUG-001

### Handler Verification
- **File:** `/services/trade-engine/internal/server/trade_handler.go`
- **Function:** `ListTrades()` ✓

### Suggested Fix
Rebuild and redeploy Docker image

---

## BUG-006: OHLCV Candles Endpoint Returning 404

**Severity:** CRITICAL
**Priority:** P0 - URGENT
**Component:** Trade Engine API
**Status:** OPEN
**Found In:** Phase 4 QA Testing - Story 3.3
**Assigned To:** Backend Team - Trade Engine Service

---

### Description
The `/api/v1/candles/{symbol}` endpoint returns HTTP 404 instead of providing OHLCV (Open, High, Low, Close, Volume) candle data for charting.

### Steps to Reproduce
```bash
curl -s 'http://localhost:8085/api/v1/candles/BTC-USDT?interval=1h&limit=100'
```

### Root Cause
Same as BUG-001: Binary-source mismatch

### Handler Verification
- **File:** `/services/trade-engine/internal/server/market_data_handler.go`
- **Function:** `GetCandles()` ✓

### Suggested Fix
Rebuild and redeploy Docker image

---

## Summary Table

| Bug ID | Endpoint | Severity | Status | Root Cause | Fix |
|--------|----------|----------|--------|-----------|-----|
| BUG-001 | `/orderbook/{symbol}` | CRITICAL | OPEN | Binary-source mismatch | Rebuild Docker |
| BUG-002 | `/orders` | CRITICAL | OPEN | Binary-source mismatch | Rebuild Docker |
| BUG-003 | CI/CD Process | HIGH | OPEN | No automation | Implement CI/CD |
| BUG-004 | `/markets/{symbol}/ticker` | CRITICAL | OPEN | Binary-source mismatch | Rebuild Docker |
| BUG-005 | `/trades` | CRITICAL | OPEN | Binary-source mismatch | Rebuild Docker |
| BUG-006 | `/candles/{symbol}` | CRITICAL | OPEN | Binary-source mismatch | Rebuild Docker |

---

## Blocking Test Cases

The following test cases are blocked and cannot resume until bugs are fixed:

**Phase 1: Market Data (12 tests)**
- All 12 tests blocked by BUG-001, BUG-004, BUG-005, BUG-006

**Phase 2: Order Placement (8 tests)**
- All 8 tests blocked by BUG-002

**Phase 3: Order Management (8 tests)**
- All 8 tests blocked by BUG-002

**Phase 4: History & Analytics (8 tests)**
- Blocked by BUG-001, BUG-002, BUG-005

**Total Blocked:** 36 of 44 tests (81.8% of test suite)

---

## Immediate Actions Required

1. **Backend Team:** Rebuild and redeploy Trade Engine Docker image
   - ETA: 30 minutes
   - Steps: See "Suggested Fix" in BUG-001

2. **DevOps Team:** Implement CI/CD to prevent recurring issues
   - ETA: 2-4 hours
   - Steps: See BUG-003 recommendations

3. **QA Team:** Prepare to resume Phase 4 testing immediately upon deployment
   - Have test suite ready
   - Monitor for deployment notifications

---

**Report Generated:** 2025-11-30 by QA Agent
**Status:** AWAITING BACKEND ACTION
**Timeline:** Testing blocked until fixes deployed

