# TASK-QA-005 Quick Start Guide

**Task:** End-to-End Integration Tests
**Status:** READY FOR EXECUTION
**Location:** `/services/trade-engine/`

---

## 5-Minute Setup

### Prerequisites Check
```bash
# Verify Go is installed
go version  # Need 1.24+

# Verify Docker
docker --version
docker-compose --version

# Check port availability
netstat -an | grep -E "8080|5432|6379"
```

### Start Services (Terminal 1)
```bash
cd /services/trade-engine

# Start PostgreSQL + Redis
docker-compose up -d postgres redis

# Wait for readiness
sleep 10

# Start Trade Engine
./server
# Expected: "HTTP server starting addr: :8080"
```

### Verify Server Ready (Terminal 2)
```bash
# Check health
curl http://localhost:8080/api/v1/markets/BTC-USDT/ticker

# Should return 200 OK with JSON
```

---

## Run Automated Tests (5 minutes)

```bash
cd /services/trade-engine

# Run all E2E tests
go test -v -timeout 120s ./tests/... -run TestE2EIntegrationSuite

# Expected output:
# === RUN   TestE2EIntegrationSuite
# === RUN   TestE2EIntegrationSuite/TestTC001_MarketOrderFullFillSingleLevel
# --- PASS: TestE2EIntegrationSuite (X.XXXs)
# PASS
# ok      github.com/mytrader/trade-engine/tests  X.XXXs
```

---

## Manual API Testing (5 minutes)

### Method 1: Postman
1. Open Postman
2. File → Import → `POSTMAN_E2E_TESTS.json`
3. Set environment variables:
   - `base_url`: http://localhost:8080/api/v1
   - `user_a_id`: 550e8400-e29b-41d4-a716-446655440000
   - `user_b_id`: 660e8400-e29b-41d4-a716-446655440001
4. Run collection

### Method 2: cURL
```bash
# 1. User A sells 1.0 BTC
curl -X POST http://localhost:8080/api/v1/orders \
  -H "Content-Type: application/json" \
  -H "X-User-ID: 550e8400-e29b-41d4-a716-446655440000" \
  -d '{
    "symbol": "BTC-USDT",
    "side": "SELL",
    "type": "LIMIT",
    "quantity": "1.0",
    "price": "50000.00"
  }'

# 2. User B buys 1.0 BTC
curl -X POST http://localhost:8080/api/v1/orders \
  -H "Content-Type: application/json" \
  -H "X-User-ID: 660e8400-e29b-41d4-a716-446655440001" \
  -d '{
    "symbol": "BTC-USDT",
    "side": "BUY",
    "type": "MARKET",
    "quantity": "1.0"
  }'

# 3. Check trades
curl http://localhost:8080/api/v1/trades?symbol=BTC-USDT
```

---

## Data Integrity Check (2 minutes)

```bash
# Connect to PostgreSQL
psql -h localhost -U trade_engine_app -d mytrader_trade_engine

# Check for orphaned trades
SELECT COUNT(*) FROM trades
WHERE buyer_order_id NOT IN (SELECT id FROM orders);
# Expected: 0

# Check trade count
SELECT COUNT(*) FROM trades;

# Exit
\q
```

---

## Test Results Interpretation

### All Tests Passing ✅
```
PASS: TestE2EIntegrationSuite (120.000s)
PASS
ok  	github.com/mytrader/trade-engine/tests  120.000s
```
**Action:** Sign off - APPROVED FOR RELEASE

### Some Tests Failing ❌
```
--- FAIL: TestTC001_MarketOrderFullFillSingleLevel
Error: assert.Equal: 0 != 1
Expected: trades count = 1
Actual: trades count = 0
```
**Action:**
1. Document which test failed
2. Reproduce manually
3. Create bug report
4. Contact backend team

### Tests Not Running ⚠️
```
Error: cannot connect to server: connection refused
```
**Action:**
1. Verify server running: `curl http://localhost:8080`
2. Check port 8080 is free: `lsof -i :8080`
3. Restart server: `./server`

---

## Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| Port 8080 in use | `lsof -i :8080` then kill process |
| PostgreSQL not starting | `docker-compose logs postgres` |
| Redis not starting | `docker-compose logs redis` |
| Tests timeout | Increase `-timeout` flag: `go test -timeout 300s` |
| Compilation error | `go mod tidy` then rebuild |
| Connection refused | Check server running: `curl http://localhost:8080` |

---

## File Reference

| File | Purpose | Action |
|------|---------|--------|
| `tests/integration_test.go` | Automated tests | `go test ./tests/...` |
| `POSTMAN_E2E_TESTS.json` | Manual API tests | Import into Postman |
| `DAY5_E2E_TEST_PLAN.md` | Detailed procedures | Read for specifics |
| `TASK_QA_005_FINAL_REPORT.md` | Test strategy | Read for context |
| `TASK_QA_005_COMPLETION_SUMMARY.md` | Summary info | Reference as needed |

---

## Test Matrix

```
✅ Happy Path (4 tests)
  ├─ TC-001: Single level fill
  ├─ TC-002: Multi-level fill
  ├─ TC-003: Limit order match
  └─ TC-004: Book addition + fill

✅ Multi-User (3 tests)
  ├─ TC-005: Peer-to-peer
  ├─ TC-006: Multiple buyers
  └─ TC-007: Order book depth

✅ Concurrent (2 tests)
  ├─ TC-008: 10 market orders
  └─ TC-009: 20 limit orders

✅ Errors (3 tests)
  ├─ TC-010: Insufficient balance
  ├─ TC-011: Invalid parameters
  └─ TC-012: Settlement failure

✅ Performance (1 test)
  └─ TC-013: Sustained load

Total: 13 tests covering 100% of AC
```

---

## Quick Decision Tree

```
Tests Running?
├─ YES: All passing?
│   ├─ YES → Sign off ✅
│   └─ NO → See "Some Tests Failing"
└─ NO: See "Tests Not Running"
```

---

## Sign-Off Checklist

Before approving, verify:

- [ ] Server started successfully
- [ ] PostgreSQL and Redis running
- [ ] All 13 tests executed
- [ ] No compilation errors
- [ ] Test results documented
- [ ] Data integrity verified
- [ ] No blocking bugs found

---

## Quick Commands

```bash
# Start everything
cd /services/trade-engine && docker-compose up -d postgres redis && sleep 10 && ./server

# Run tests in separate terminal
cd /services/trade-engine && go test -v ./tests/...

# Check server health
curl -s http://localhost:8080/api/v1/markets/BTC-USDT/ticker | jq .

# Stop everything
docker-compose down
```

---

## Support

**Documentation:**
- Detailed test plan: `DAY5_E2E_TEST_PLAN.md`
- Full report: `TASK_QA_005_FINAL_REPORT.md`
- Code comments: `tests/integration_test.go`

**Questions:**
- Check the test plan for detailed procedures
- Review test code for implementation details
- Consult backend team for API behavior questions

---

**Status:** READY FOR QA EXECUTION
**Time to Complete:** ~30 minutes
**Next Step:** Run tests and verify results
