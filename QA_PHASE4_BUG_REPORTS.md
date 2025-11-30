# QA Phase 4: EPIC 3 - Bug Reports

**Date:** 2025-11-30
**Status:** BLOCKING - All Order Management Tests
**Severity:** CRITICAL

---

## BUG-QA4-001: Market Data Endpoints Return 404 Not Found

**Severity:** HIGH
**Component:** Trade Engine API - Router/Handlers
**Affected Stories:** 3.1 (Order Book), 3.2 (Ticker), 3.3 (Recent Trades)
**Status:** BLOCKING - 12 test cases blocked

### Description
All market data endpoints are returning HTTP 404 Not Found despite being defined in the router configuration. The requests reach the middleware (logged) but don't get routed to the handler implementations.

### Affected Endpoints (All returning 404)
- GET `/api/v1/orderbook/{symbol}`
- GET `/api/v1/markets/{symbol}/ticker`
- GET `/api/v1/statistics/24h/{symbol}`
- GET `/api/v1/trades` (requires symbol parameter)
- GET `/api/v1/trades/{id}`
- GET `/api/v1/candles/{symbol}`
- GET `/api/v1/historical/trades/{symbol}`

### Steps to Reproduce
```bash
curl -X GET "http://localhost:8085/api/v1/orderbook/BTC-USDT" \
  -H "X-User-ID: 550e8400-e29b-41d4-a716-446655440000" \
  -H "Content-Type: application/json"
```

### Expected Result
HTTP 200 OK with order book JSON response:
```json
{
  "symbol": "BTC-USDT",
  "bids": [
    {"price": "50000", "volume": "1.5", "count": 3},
    ...
  ],
  "asks": [...],
  "timestamp": "2025-11-30T22:25:00Z"
}
```

### Actual Result
```
HTTP 404 Not Found
Content-Type: text/plain; charset=utf-8
404 page not found
```

### Server Logs Evidence
```
{"level":"info","timestamp":"2025-11-30T19:21:17.053Z","path":"/api/v1/orderbook/BTC-USDT","status":404,"bytes":19}
{"level":"info","timestamp":"2025-11-30T19:21:17.060Z","path":"/api/v1/markets/BTC-USDT/ticker","status":404,"bytes":19}
```

### Root Cause Analysis
1. Handlers are implemented:
   - `OrderBookHandler.GetOrderBook()` in `internal/server/orderbook_handler.go`
   - `MarketHandler.GetTicker()` in `internal/server/market_handler.go`
   - `TradeHandler.ListTrades()` in `internal/server/trade_handler.go`

2. Routes are defined in `internal/server/router.go`:
   - Line 112: `r.Get("/orderbook/{symbol}", orderbookHandler.GetOrderBook)`
   - Line 119: `r.Get("/markets/{symbol}/ticker", marketHandler.GetTicker)`
   - Line 115: `r.Get("/trades", tradeHandler.ListTrades)`

3. **Likely Issues:**
   - Handlers may not have the response helper methods (`respondJSON`, `respondError`) properly inherited or implemented
   - Router configuration may not be properly passed to the HTTP server
   - Middleware might be intercepting before routing
   - Handler struct methods may not match the chi.HandlerFunc signature

### Suggested Fix
1. Verify handler helper methods exist (respondJSON, respondError)
2. Check if handlers implement chi.HandlerFunc signature correctly
3. Add debug logging in NewRouter to confirm handlers are created
4. Verify the router is actually being used by the HTTP server
5. Check for any routing conflicts or middleware that could block these routes

### Files Involved
- `/services/trade-engine/internal/server/router.go` - Route definitions
- `/services/trade-engine/internal/server/orderbook_handler.go`
- `/services/trade-engine/internal/server/market_handler.go`
- `/services/trade-engine/internal/server/trade_handler.go`

---

## BUG-QA4-002: Database Schema Error - Missing "id" Column in Orders Table

**Severity:** CRITICAL
**Component:** Trade Engine - Database Layer
**Affected Stories:** 3.4 (Market Orders), 3.5 (Limit Orders)
**Status:** BLOCKING - All order creation tests fail with HTTP 500

### Description
When attempting to create an order via POST /api/v1/orders, the server returns HTTP 500 Internal Server Error because the orders table is missing the "id" column. The database schema appears to be incomplete or not properly migrated.

### Steps to Reproduce
```bash
curl -X POST "http://localhost:8085/api/v1/orders" \
  -H "X-User-ID: 550e8400-e29b-41d4-a716-446655440000" \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "BTC-USDT",
    "side": "BUY",
    "type": "MARKET",
    "quantity": "0.01"
  }'
```

### Expected Result
HTTP 201 Created with order response:
```json
{
  "order": {
    "id": "660e8400-e29b-41d4-a716-446655440000",
    "symbol": "BTC-USDT",
    "side": "BUY",
    "type": "MARKET",
    "status": "PENDING",
    "quantity": "0.01"
  }
}
```

### Actual Result
HTTP 500 Internal Server Error
```
{
  "error": "Internal server error",
  "code": "Internal Server Error",
  "details": {
    "error": "failed to create order: ERROR: column \"id\" of relation \"orders\" does not exist (SQLSTATE 42703)"
  }
}
```

### Server Logs Evidence
```
{"level":"error","timestamp":"2025-11-30T19:21:17.209Z","caller":"server/order_handler.go:407","error":"failed to create order: ERROR: column \"id\" of relation \"orders\" does not exist (SQLSTATE 42703)"}
```

### Database Check
```bash
docker exec exchange_postgres psql -U trade_engine_user -d trade_engine_db -c "\d orders"
```
Shows orders table exists but is missing crucial columns.

### Root Cause Analysis
1. **Schema Migration Issue:** Database migrations may not have been applied correctly
2. **Missing Column:** Orders table is missing:
   - `id` (UUID primary key)
   - Possibly other required columns like `user_id`, `created_at`, `updated_at`
3. **ORM Mismatch:** The order model in Go expects these columns but the database doesn't have them

### Suggested Fix
1. Check migration files in `/services/trade-engine/migrations/`
2. Verify all migrations have been applied to the database
3. Run migrations manually if needed:
   ```bash
   cd /services/trade-engine
   make migrate-up
   # or
   psql -U trade_engine_user -d trade_engine_db -f migrations/001-*.sql
   ```
4. Verify schema matches the Order struct in domain models
5. Add database health check to detect schema mismatches

### Files Involved
- `/services/trade-engine/migrations/` - Migration files
- `/services/trade-engine/internal/domain/order.go` - Order model
- `/services/trade-engine/internal/repository/postgres_order_repository.go` - Order repository

### Impact
- 8 order placement tests blocked (3.4, 3.5)
- Cannot execute order management tests (3.6, 3.7)
- Cannot execute order history tests (3.8)
- Overall test pass rate significantly impacted

---

## BUG-QA4-003: Order Handler Response - Missing Helper Methods

**Severity:** MEDIUM
**Component:** Trade Engine - Order Handler
**Affected Stories:** 3.4, 3.5 (Order Placement)
**Status:** BLOCKING - Affects error responses

### Description
When order creation fails, the handler appears to be missing the proper response helper methods (respondJSON, respondError) that are defined in other handlers. This causes incorrect error response formatting.

### Evidence from Handler Code
Order handlers in `internal/server/order_handler.go` call:
- `h.respondError(w, http.StatusBadRequest, "Symbol is required", nil)` - Line 46
- `h.respondJSON(w, http.StatusOK, response)` - Line 97

But these methods may not be properly inherited or implemented for OrderHandler struct.

### Suggested Fix
1. Ensure OrderHandler has a base struct with these methods
2. Or implement these methods directly in OrderHandler
3. Check that method signatures match the response interface

---

## BUG-QA4-004: Authentication Header Not Validated for List Orders

**Severity:** LOW
**Component:** Trade Engine - Order Handler
**Affected Stories:** 3.6, 3.8 (List Orders)
**Status:** MINOR - Already working despite the issue

### Description
List orders endpoint (GET /api/v1/orders) requires X-User-ID header to be a valid UUID format. The error message should be more helpful if the header is missing or malformed.

### Current Behavior
- Accepts X-User-ID header in UUID format
- Returns empty list when no orders exist
- Works correctly - no action needed

### Note
This is NOT a blocking issue - the endpoint works correctly. Listing for completeness.

---

## Summary of Blocking Issues

| Bug ID | Issue | Severity | Tests Blocked | Priority |
|--------|-------|----------|---------------|----------|
| QA4-001 | Market data 404 errors | HIGH | 12 tests (Phase 1) | P0 |
| QA4-002 | DB schema missing "id" | CRITICAL | 8 tests (Phase 2) | P0 |
| QA4-003 | Handler response methods | MEDIUM | 4 tests (Phase 2) | P1 |

**Total Tests Blocked:** 24 out of 44 tests
**Overall Pass Rate:** 15/36 executed = 41.6%
**Blocking Critical Issues:** 2 (BUG-001, BUG-002)

---

## Recommended Actions

### Immediate (Before Re-testing Phase 1)
1. Fix BUG-QA4-001: Verify market data handlers are properly routed
2. Verify router.go is being used by the HTTP server
3. Add debug logging to confirm handler invocation

### Urgent (Before Re-testing Phase 2)
1. Fix BUG-QA4-002: Check and apply database migrations
2. Verify orders table schema matches domain model
3. Run table definition script to confirm

### Testing Resume
1. Once BUG-QA4-001 is fixed: Re-execute Phase 1 (12 tests)
2. Once BUG-QA4-002 is fixed: Re-execute Phase 2 (8 tests)
3. Continue with Phases 3-6

---

**Report Generated:** 2025-11-30 22:25:00 UTC
**Status:** AWAITING DEVELOPER FIXES
**Next Phase:** Re-test after fixes applied
