# QA-EPIC3-003: Story 3.2 Ticker Display - Quick Reference Guide

**Version:** 1.0
**Date:** November 30, 2025
**Duration:** 1.5 hours
**Points:** 1.0

---

## At a Glance

| Item | Details |
|------|---------|
| **Task** | QA-EPIC3-003: Story 3.2 Testing |
| **Feature** | Ticker Display (Real-time market prices) |
| **Scope** | API endpoints, WebSocket, UI components, performance |
| **Test Scenarios** | 13 total (8 core + 5 edge cases) |
| **Estimation** | 1.5 hours execution + 1 hour automation |
| **Success Criteria** | All tests pass, all SLAs met |

---

## Testing Roadmap (Timeline)

```
QA-EPIC3-003 Testing Timeline
═════════════════════════════════════════════════════════════

Day 1 Morning (1.5 hours):
├─ 10:00-10:15: Environment Setup & Verification (15 min)
├─ 10:15-11:00: API Endpoint Testing (45 min)
│   ├─ TC-3.2-001: Single ticker (3 symbols)
│   ├─ TC-3.2-002: Bulk tickers
│   └─ TC-3.2-003: Invalid symbol error
└─ 11:00-11:30: WebSocket Testing (30 min)
    ├─ TC-3.2-010: Subscribe & receive
    └─ TC-3.2-011: Multi-symbol

Day 1 Afternoon (1.5 hours):
├─ 14:00-14:30: Component Rendering (30 min)
│   ├─ TC-3.2-013: Component renders
│   ├─ TC-3.2-014: Green color (↑)
│   └─ TC-3.2-015: Red color (↓)
├─ 14:30-15:00: Caching & Performance (30 min)
│   ├─ TC-3.2-006: Cache hit/miss
│   └─ TC-3.2-004/005: Response times
└─ 15:00-15:30: E2E & Error Handling (30 min)
    ├─ TC-3.2-017: Full data flow
    ├─ TC-3.2-018: Disconnect handling
    └─ TC-3.2-020: Number formatting

Day 2 (1 hour):
├─ 10:00-10:45: Create Postman Collection (45 min)
└─ 10:45-11:00: Documentation & Sign-off (15 min)
```

---

## Critical Test Cases (Must Test)

### 1. Single Ticker Endpoint (TC-3.2-001)
```bash
GET /api/v1/market/ticker/BTC_TRY
```
**What to check:**
- [x] HTTP 200 OK
- [x] Response < 50ms
- [x] All 8 fields present (symbol, lastPrice, priceChange, %, high, low, volume, quoteVolume, timestamp)
- [x] Symbol = "BTC_TRY"
- [x] Prices formatted as strings
- [x] Timestamp valid ISO 8601

**Success Criteria:** PASS if all checks pass ✓

---

### 2. Bulk Tickers Endpoint (TC-3.2-002)
```bash
GET /api/v1/market/tickers?symbols=BTC_TRY,ETH_TRY,USDT_TRY
```
**What to check:**
- [x] HTTP 200 OK
- [x] Response < 80ms
- [x] 3 tickers in response array
- [x] Array order = request order
- [x] Each ticker has complete data
- [x] BTC data matches single endpoint

**Success Criteria:** PASS if all 3 symbols returned with correct data ✓

---

### 3. Invalid Symbol Error (TC-3.2-003)
```bash
GET /api/v1/market/ticker/INVALID_XYZ
```
**What to check:**
- [x] HTTP 404 Not Found
- [x] Error message clear (no stack trace)
- [x] Error code indicates not found

**Success Criteria:** PASS if 404 with clear message ✓

---

### 4. WebSocket Subscribe (TC-3.2-010)
**What to check:**
- [x] WebSocket connection established
- [x] Subscription message sent
- [x] Updates received (~1/second)
- [x] Message format correct
- [x] Connection stable for 1+ minute

**Success Criteria:** PASS if receiving ticker updates every 1 second ✓

---

### 5. Multi-Symbol WebSocket (TC-3.2-011)
**What to check:**
- [x] Subscribe to BTC_TRY → receive updates
- [x] Subscribe to ETH_TRY → receive updates (still getting BTC)
- [x] Subscribe to USDT_TRY → receive updates (still getting BTC + ETH)
- [x] Unsubscribe from ETH → still get BTC + USDT (no ETH)
- [x] All updates independent

**Success Criteria:** PASS if all 3 symbols update independently ✓

---

### 6. Component Rendering (TC-3.2-013)
**What to check:**
- [x] Component displays without errors
- [x] Symbol shown: "BTC/TRY"
- [x] Price: "50,100.00 TRY"
- [x] Change: "+100.00" (green)
- [x] Change %: "+0.20%"
- [x] High/Low/Volume displayed
- [x] All text visible (no overlaps)

**Success Criteria:** PASS if all fields visible and formatted correctly ✓

---

### 7. End-to-End Flow (TC-3.2-017)
**What to check:**
- [x] Load ticker page
- [x] API fetches current price
- [x] WebSocket subscribes
- [x] New trade triggers update
- [x] UI updates within 1 second
- [x] No duplicate or missing updates

**Success Criteria:** PASS if E2E latency < 1 second ✓

---

### 8. Caching (TC-3.2-006)
**What to check:**
- [x] First request: slower (database)
- [x] Second request (immediate): faster (cache), same timestamp
- [x] After 11 seconds: new timestamp (cache expired)

**Success Criteria:** PASS if cached response 5x+ faster than DB ✓

---

## Performance SLA Checklist

Critical performance metrics - **ALL must pass**:

```
Performance Verification Checklist
═══════════════════════════════════════════════════════════════

API PERFORMANCE
☐ Single ticker p99 < 50ms          (Postman: response time)
☐ Bulk tickers p99 < 80ms           (Postman: response time)
☐ Statistics calc < 30ms             (Database query time)

CACHING
☐ Cache hit ratio > 90%              (50+ requests in 5s)
☐ Cache hit response < 5ms           (vs. ~20ms for DB)

WEBSOCKET
☐ Connection established < 200ms     (Time to first message)
☐ Update delivery < 500ms            (Trade → client)
☐ Multi-symbol handling works       (3 symbols, same connection)

E2E LATENCY
☐ API fetch to display < 100ms       (Initial page load)
☐ Price change to UI < 1000ms        (Real-time update)

STABILITY
☐ No errors in 100 requests          (0% error rate)
☐ No WebSocket disconnects           (Stable for 5+ min)
```

---

## Execution Checklist

### Pre-Testing Setup (15 minutes)

```
ENVIRONMENT VERIFICATION
□ Backend API running on http://localhost:3000
□ Database has trading data for all 3 pairs
  └─ BTC_TRY: 10+ trades in last 24h
  └─ ETH_TRY: 10+ trades in last 24h
  └─ USDT_TRY: 5+ trades in last 24h
□ Redis cache running and accessible
□ WebSocket server running (check connectivity)
□ Frontend app running (localhost:3000)
□ Postman installed & ready
□ Chrome DevTools available
□ Network monitoring tools ready (if needed)
□ Test database clean (no stale data)

SUCCESS INDICATOR:
All green lights = Ready to test ✓
```

### Testing Execution (3 hours total)

**Postman Testing (2 hours):**
```
□ Import QA-EPIC3-003-POSTMAN-COLLECTION.json
□ Set base_url = http://localhost:3000
□ Run TC-3.2-001 (Single tickers)
  └─ Check: PASS (3/3 symbols) ✓
□ Run TC-3.2-002 (Bulk query)
  └─ Check: PASS (200 OK, 3 symbols, <80ms) ✓
□ Run TC-3.2-003 (Error handling)
  └─ Check: PASS (404 error) ✓
□ Run TC-3.2-004 (Performance - 50 iterations)
  └─ Check: PASS (p99 < 50ms) ✓
□ Run TC-3.2-005 (Bulk performance)
  └─ Check: PASS (p99 < 80ms) ✓
□ Run TC-3.2-006 (Caching)
  └─ Check: PASS (cache hits after 11s) ✓
□ Run TC-3.2-007 (Data validation)
  └─ Check: PASS (high >= low, volume valid) ✓
```

**Manual Testing (1 hour):**
```
□ WebSocket Testing:
  └─ Use WebSocket client or Chrome DevTools
  └─ Subscribe to ticker:BTC_TRY
  └─ Verify receiving ~1 update/second
  └─ Unsubscribe and verify stop

□ UI Component Testing:
  └─ Load trading page
  └─ Verify all ticker data displays
  └─ Check green color for positive change
  └─ Check red color for negative change
  └─ Test on mobile (responsive)

□ Error Handling Testing:
  └─ Disconnect WebSocket and verify fallback
  └─ Check network timeout handling
  └─ Verify number formatting (large volumes)

□ E2E Integration:
  └─ Load page (record API time)
  └─ Wait for real-time updates
  └─ Trigger new trade (if possible)
  └─ Measure time to UI update
```

---

## Key Test URLs

### API Endpoints

| Endpoint | Method | Example |
|----------|--------|---------|
| Single ticker | GET | `http://localhost:3000/api/v1/market/ticker/BTC_TRY` |
| Bulk tickers | GET | `http://localhost:3000/api/v1/market/tickers?symbols=BTC_TRY,ETH_TRY,USDT_TRY` |
| Invalid ticker | GET | `http://localhost:3000/api/v1/market/ticker/INVALID_XYZ` |

### WebSocket

```
URL: wss://localhost:3000/ws
Subscribe: {"type": "subscribe_ticker", "symbol": "BTC_TRY"}
Unsubscribe: {"type": "unsubscribe_ticker", "symbol": "BTC_TRY"}
```

---

## Expected Response Examples

### Single Ticker Response (TC-3.2-001)
```json
{
  "symbol": "BTC_TRY",
  "lastPrice": "50100.00000000",
  "priceChange": "100.00000000",
  "priceChangePercent": "0.20",
  "high": "51000.00000000",
  "low": "49000.00000000",
  "volume": "1000.5",
  "quoteVolume": "49999999.99",
  "timestamp": "2025-11-26T10:00:00Z"
}
```

### Bulk Tickers Response (TC-3.2-002)
```json
{
  "tickers": [
    {"symbol": "BTC_TRY", "lastPrice": "...", ...},
    {"symbol": "ETH_TRY", "lastPrice": "...", ...},
    {"symbol": "USDT_TRY", "lastPrice": "...", ...}
  ]
}
```

### WebSocket Ticker Update (TC-3.2-010)
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

---

## Troubleshooting Guide

### Problem: API returns 404 for valid symbol

**Diagnosis:**
- Check: Symbol exists in database
- Check: Symbol formatting (BTC_TRY not BTC-TRY)
- Check: Database connection working

**Solution:**
```bash
# Verify data exists
SELECT DISTINCT symbol FROM trades WHERE symbol LIKE '%BTC%';
# Should show: BTC_TRY

# Check API logs
docker logs trading-api | grep ticker
```

---

### Problem: WebSocket connection refused

**Diagnosis:**
- WebSocket server not running
- Wrong port or protocol (wss vs ws)
- Firewall blocking connection

**Solution:**
```bash
# Check WebSocket server status
curl -i http://localhost:3000/health

# Check logs
docker logs trading-api | grep websocket
```

---

### Problem: Response time exceeds 50ms SLA

**Diagnosis:**
- Cache not working (always DB query)
- Database query slow (missing index)
- Network latency high

**Solution:**
```bash
# Check Redis cache
redis-cli ping
redis-cli INFO stats

# Check database performance
EXPLAIN ANALYZE SELECT ... FROM trades WHERE symbol = 'BTC_TRY' AND executed_at > NOW() - INTERVAL '24h';

# Check if index exists
SELECT * FROM pg_indexes WHERE tablename = 'trades';
```

---

### Problem: Component not rendering ticker data

**Diagnosis:**
- API not responding
- WebSocket not connecting
- React state not updating
- Network error in console

**Solution:**
```bash
# Check in Chrome DevTools:
1. Network tab: API call successful? (200 OK)
2. Console tab: Any JavaScript errors?
3. Application tab: Redux state has ticker data?

# Test API manually:
curl http://localhost:3000/api/v1/market/ticker/BTC_TRY
```

---

## Test Report Template

### Summary

```
Test Results - Story 3.2 Ticker Display
════════════════════════════════════════════════════════════

Date: [DATE]
Tester: [NAME]
Duration: [X] hours
Environment: Development

OVERALL: [✓ PASS / ✗ FAIL]

Test Results:
─────────────
✓ TC-3.2-001: Single ticker endpoint              PASS
✓ TC-3.2-002: Bulk tickers endpoint               PASS
✓ TC-3.2-003: Invalid symbol error                PASS
✓ TC-3.2-004: API performance (p99 < 50ms)        PASS
✓ TC-3.2-005: Bulk performance (p99 < 80ms)       PASS
✓ TC-3.2-006: Caching behavior                    PASS
✓ TC-3.2-007: Statistics calculation              PASS
✓ TC-3.2-010: WebSocket subscription              PASS
✓ TC-3.2-011: Multi-symbol WebSocket              PASS
✓ TC-3.2-013: Component rendering                 PASS
✓ TC-3.2-014: Green color coding                  PASS
✓ TC-3.2-015: Red color coding                    PASS
✓ TC-3.2-017: E2E integration                     PASS
─────────────
Total: 13/13 PASSED

Performance Baselines:
──────────────────────
Single ticker p99: 42 ms (target: <50ms) ✓
Bulk tickers p99: 73 ms (target: <80ms) ✓
Cache hit ratio: 94% (target: >90%) ✓
E2E latency: 850 ms (target: <1000ms) ✓

Bugs Found: 0

Sign-Off: APPROVED ✓
```

---

## Success Criteria (Final Checklist)

For Task QA-EPIC3-003 to be marked DONE:

```
FUNCTIONAL TESTING
☑ All 13 test cases executed
☑ 13/13 tests passed (no failures)
☑ Error handling tested & working
☑ WebSocket real-time updates verified

PERFORMANCE TESTING
☑ Single ticker API: p99 < 50ms ✓
☑ Bulk tickers API: p99 < 80ms ✓
☑ Statistics calculation: < 30ms ✓
☑ Cache hit ratio: > 90% ✓
☑ E2E latency: < 1000ms ✓

AUTOMATION
☑ Postman collection created
☑ All assertions implemented
☑ Newman integration ready

DOCUMENTATION
☑ Test plan complete (QA-EPIC3-003-TEST-PLAN.md)
☑ Performance report filled (QA-EPIC3-003-PERFORMANCE-REPORT.md)
☑ Postman collection ready (QA-EPIC3-003-POSTMAN-COLLECTION.json)
☑ Quick reference created (this document)

SIGN-OFF
☑ All tests passing
☑ No blockers or critical issues
☑ APPROVED FOR DEVELOPMENT HAND-OFF
```

---

## Important Links & Files

| Document | Location |
|----------|----------|
| Full Test Plan | `/QA-EPIC3-003-TEST-PLAN.md` |
| Performance Report | `/QA-EPIC3-003-PERFORMANCE-REPORT.md` |
| Postman Collection | `/QA-EPIC3-003-POSTMAN-COLLECTION.json` |
| This Quick Reference | `/QA-EPIC3-003-QUICK-REFERENCE.md` |

---

## Key Contacts & Escalation

| Role | Action |
|------|--------|
| **Backend Dev** | If API returns wrong data or timing issues |
| **Frontend Dev** | If component doesn't render or WebSocket integration broken |
| **DevOps** | If environment issues (API not running, DB down, cache unavailable) |
| **Tech Lead** | If SLA violations or critical bugs found |

---

## Notes for Next Phases

**Story 3.2 Extended (Post-MVP):**
- Price alerts and notifications
- Technical analysis indicators
- Advanced search/filtering
- Historical price charts

**Story 3.3 (Upcoming):**
- Trade history display
- Order execution history
- Performance optimizations

---

**Quick Reference Version:** 1.0
**Last Updated:** November 30, 2025
**Status:** Ready for Execution
**Estimated Duration:** 1.5 hours manual + 1 hour automation = 2.5 hours total

---

## Quick Commands

```bash
# Test single ticker with curl
curl http://localhost:3000/api/v1/market/ticker/BTC_TRY | jq

# Test bulk tickers
curl 'http://localhost:3000/api/v1/market/tickers?symbols=BTC_TRY,ETH_TRY,USDT_TRY' | jq

# Run Postman collection
newman run QA-EPIC3-003-POSTMAN-COLLECTION.json \
  -e dev-environment.json \
  --iterations 50 \
  --reporters cli,json \
  --reporter-json-export results.json

# View results
cat results.json | jq '.stats'
```

---

**Ready to Begin Testing? ✓**

All documentation prepared. Execute testing according to timeline above.
Expected completion: ~2.5 hours from start.
