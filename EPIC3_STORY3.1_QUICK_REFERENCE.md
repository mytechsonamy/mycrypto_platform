# Story 3.1: Order Book - Quick Reference Guide

## Overview
- **Story:** 3.1 - View Order Book (Real-Time Display)
- **Epic:** EPIC 3 - Trading Engine
- **Points:** 8
- **Priority:** P0 (Critical)
- **Status:** Ready for Testing

## Key Testing Areas

### 1. API Endpoint Testing
```bash
# Get orderbook with defaults
curl -X GET http://localhost:8080/api/v1/market/orderbook/BTC_TRY

# Get with depth parameter
curl -X GET http://localhost:8080/api/v1/market/orderbook/BTC_TRY?depth=100

# Test all symbols
# - BTC_TRY
# - ETH_TRY
# - USDT_TRY
```

### 2. Performance Baselines (Must Meet)
| Metric | Target | Notes |
|--------|--------|-------|
| p99 Latency | < 100ms | Under normal load |
| Mean Latency | < 50ms | Average response |
| Cache Hit Response | < 20ms | Redis cached data |
| Cache Miss Response | 50-100ms | Fresh from database |
| Update Frequency | 10+ updates/sec | WebSocket real-time |

### 3. Test Case Count
- **Total:** 30 test cases
- **Functional:** 9 (TC-001 to TC-009)
- **Error Handling:** 6 (TC-010 to TC-013, TC-026 to TC-027)
- **Performance:** 4 (TC-014 to TC-015, TC-019)
- **Caching:** 4 (TC-016 to TC-019)
- **WebSocket:** 6 (TC-020 to TC-025)
- **Data Validation:** 5 (TC-004 to TC-005, TC-028 to TC-030)

## Quick Test Execution

### Phase 1: REST API (30 minutes)
1. Run Postman collection: `EPIC3_STORY3.1_Postman_Collection.json`
2. Verify all TC-001 to TC-013 assertions pass
3. Record response times for performance baseline

### Phase 2: WebSocket (30 minutes)
1. Connect to `ws://localhost:8080/ws/orderbook`
2. Subscribe to BTC_TRY: `{"action":"subscribe","channel":"orderbook","symbol":"BTC_TRY"}`
3. Verify snapshot arrives within 1 second
4. Monitor updates for 10 seconds (expect ~100 updates)
5. Test multi-symbol subscription

### Phase 3: Performance Verification (20 minutes)
1. Execute 100 consecutive requests via Postman
2. Calculate p99 latency
3. Verify < 100ms requirement
4. Test cache hit ratio (expect >95%)

### Phase 4: Error Handling (20 minutes)
1. Test invalid symbols (expect 400)
2. Test SQL injection (expect 400, no SQL errors)
3. Stop Trade Engine, verify graceful degradation
4. Verify cache fallback when service down

## Acceptance Criteria Checklist

- [ ] **AC1:** Get orderbook, response structure correct
  - Verify `symbol`, `bids`, `asks`, `spread`, `timestamp` fields
  - Test all 3 symbols: BTC_TRY, ETH_TRY, USDT_TRY

- [ ] **AC2:** Invalid symbol returns 400 error
  - Test with INVALID_SYMBOL
  - Verify error message is user-friendly

- [ ] **AC3:** Response time < 100ms p99
  - Run 100+ requests
  - Calculate p99 percentile
  - Document baseline metrics

- [ ] **AC4:** Second request faster (Redis cache hit)
  - First request: ~50-100ms
  - Second request: < 20ms
  - Hit ratio > 95%

- [ ] **AC5:** WebSocket real-time subscription works
  - Subscribe to orderbook channel
  - Receive snapshot within 1 second
  - Receive updates within 500ms

- [ ] **AC6:** Graceful degradation when Trade Engine down
  - Service returns cached data or 503 error
  - No 500 internal server errors
  - User-friendly error message

- [ ] **AC7:** ?depth=20 and ?depth=100 work correctly
  - depth=20 returns ≤20 levels
  - depth=100 returns ≤100 levels
  - Default is 20 when omitted

- [ ] **AC8:** All required fields in response
  - `symbol` (string)
  - `bids` (array with price, volume, count)
  - `asks` (array with price, volume, count)
  - `spread` (decimal)
  - `timestamp` (ISO 8601)

## Test Environment Setup

### Prerequisites
```bash
# 1. Start Trade Engine
cd services/trade-engine
go run ./cmd/main.go

# 2. Verify Redis is running
redis-cli ping
# Expected output: PONG

# 3. Verify PostgreSQL is running
psql -U trade_engine_user -d trade_engine_db -c "SELECT 1"
# Expected output: 1

# 4. Create test data (if needed)
# Seed BTC_TRY, ETH_TRY, USDT_TRY order books
```

### Clear Cache Between Tests (if needed)
```bash
# Clear Redis cache for specific symbol
redis-cli DEL orderbook:BTC_TRY
redis-cli DEL orderbook:ETH_TRY
redis-cli DEL orderbook:USDT_TRY

# Or clear all cache
redis-cli FLUSHALL
```

## Response Examples

### Success Response (200 OK)
```json
{
  "symbol": "BTC_TRY",
  "bids": [
    {"price": "1500000.00", "volume": "0.5", "count": 2},
    {"price": "1499900.00", "volume": "1.2", "count": 3}
  ],
  "asks": [
    {"price": "1500100.00", "volume": "0.3", "count": 1},
    {"price": "1500200.00", "volume": "2.0", "count": 4}
  ],
  "spread": "100.00",
  "timestamp": "2025-11-24T14:30:45Z"
}
```

### Error Response (400 Bad Request)
```json
{
  "error": "Invalid symbol",
  "code": "BAD_REQUEST",
  "details": {}
}
```

### WebSocket Subscription Message
```json
{
  "action": "subscribe",
  "channel": "orderbook",
  "symbol": "BTC_TRY"
}
```

### WebSocket Snapshot Message
```json
{
  "event": "snapshot",
  "channel": "orderbook",
  "symbol": "BTC_TRY",
  "data": {
    "symbol": "BTC_TRY",
    "bids": [...],
    "asks": [...],
    "spread": "100.00",
    "timestamp": "2025-11-24T14:30:45Z"
  }
}
```

### WebSocket Update Message
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

## Common Issues & Troubleshooting

### Issue: Service returns 503 or connection refused
**Cause:** Trade Engine not running
**Solution:** Start Trade Engine service
```bash
cd services/trade-engine && go run ./cmd/main.go
```

### Issue: Orderbook returns null or empty
**Cause:** No order book data for symbol
**Solution:** Seed test data or use active trading pair

### Issue: Latency > 100ms consistently
**Cause:** Database slow or cache not working
**Solution:**
- Check Redis is running: `redis-cli ping`
- Verify database indexes: `SELECT * FROM pg_stat_user_indexes`
- Check query performance

### Issue: WebSocket updates not arriving
**Cause:** Connection dropped or subscription failed
**Solution:**
- Verify subscription ACK received
- Check WebSocket connection is open
- Monitor browser console for errors

### Issue: Cache hit ratio < 95%
**Cause:** TTL too short or cache clearing between requests
**Solution:**
- Verify Redis TTL is set (typically 30 seconds)
- Check no external cache invalidation
- Increase TTL if test duration > 30 seconds

## Sign-Off Criteria

The test plan is complete and ready for sign-off when:

1. ✅ All 30 test cases executed (manual or automated)
2. ✅ ≥95% test pass rate achieved
3. ✅ p99 latency verified < 100ms
4. ✅ Cache hit ratio > 95% confirmed
5. ✅ WebSocket real-time updates working
6. ✅ Error handling tested (invalid symbols, service down)
7. ✅ All Critical/High bugs fixed and re-tested
8. ✅ Test coverage report generated (≥80%)
9. ✅ Postman collection created with assertions
10. ✅ Tech Lead and Product Owner sign-off

## Related Artifacts

- **Full Test Plan:** `/EPIC3_STORY3.1_TEST_PLAN.md`
- **Postman Collection:** `/EPIC3_STORY3.1_Postman_Collection.json`
- **Performance Baseline:** (Captured during testing)
- **Bug Report Template:** See engineering guidelines
- **WebSocket Test Harness:** (Custom Go/Node.js client)

## Contact & Escalation

- **QA Lead:** QA Agent (QA Team)
- **Tech Lead:** Backend Team Lead
- **Product Owner:** Product Manager

---

**Last Updated:** 2025-11-24
**Version:** 1.0
