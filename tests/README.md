# Integration Test Suite - MyCrypto Exchange Platform

Comprehensive integration testing infrastructure for full-stack trading platform validation.

## Quick Start

### 1. Start Test Environment
```bash
./scripts/test-environment-setup.sh up
```

This will:
- Build and start all microservices (Auth, Wallet, Trade Engine)
- Initialize PostgreSQL with migrations
- Start Redis, RabbitMQ, and supporting services
- Run health checks
- Seed test data

### 2. Run Tests

#### Jest Integration Tests
```bash
npm run test:integration
```

Tests cover:
- Order flow (placement → execution → settlement)
- Error handling (invalid inputs, insufficient balance)
- WebSocket real-time updates
- Multi-user scenarios
- Performance benchmarks

#### Postman/Newman API Tests
```bash
npm run test:api
```

Validates:
- REST endpoint functionality
- Request/response formats
- Error handling
- Authentication

#### End-to-End Cypress Tests (optional)
```bash
npm run test:e2e
```

Complete user workflows in browser.

### 3. Stop Environment
```bash
./scripts/test-environment-setup.sh down
```

---

## Test Plan Overview

**Document:** `/tests/INTEGRATION_TEST_PLAN.md`

### Test Coverage

| Category | Test Cases | Coverage | Priority |
|----------|-----------|----------|----------|
| Order Flow | 5 scenarios | Core trading | P0 |
| Multi-User | 3 scenarios | Concurrency | P1 |
| WebSocket | 4 scenarios | Real-time | P0 |
| Error Handling | 5 scenarios | Resilience | P1 |
| Performance | 2 scenarios | Throughput/Latency | P0 |
| **Total** | **19 tests** | **82% AC coverage** | |

### Key Test Cases

#### TC-INT-001: Market Order Execution
- Seller places limit order
- Buyer places market order
- Orders match and execute
- Balances updated in real-time
- Trade record created

**Expected Outcome:** Status 201, both trades executed, balances accurate

#### TC-INT-009: WebSocket Order Updates
- Client connects via WebSocket
- Subscribes to order stream
- Places order via REST API
- Receives WebSocket update within 100ms
- Message format matches spec

**Expected Outcome:** WebSocket message received, latency < 100ms

#### TC-INT-018: Throughput - 100 Orders/Second
- Generate 30,000 orders over 5 minutes
- Maintain 100 orders/sec sustained rate
- Monitor latency, error rate, resource usage

**Expected Outcome:** 95+ orders/sec, p99 latency < 100ms, < 0.1% error rate

---

## Environment Configuration

### Services

```
┌─────────────────────────────────────────┐
│     Docker Compose Test Environment     │
├─────────────────────────────────────────┤
│ PostgreSQL 16         (port 5433)       │
│ Redis 7               (port 6380)       │
│ RabbitMQ 3.12         (port 5673)       │
│ Trade Engine (Go)     (port 8080)       │
│ Auth Service (NestJS) (port 3001)       │
│ Wallet Service (NestJS)(port 3002)      │
│ Mailpit (Email)       (port 1026)       │
│ MinIO (Storage)       (port 9000)       │
└─────────────────────────────────────────┘
```

### Environment Variables

**File:** `.env.test` (auto-created by setup script)

```bash
# API URLs
API_BASE_URL=http://localhost:3001/api/v1
TRADE_ENGINE_URL=http://localhost:8080/api/v1
WS_URL=ws://localhost:3001/ws

# Database
DATABASE_URL=postgresql://test:test_password_secure@localhost:5433/exchange_test

# Redis
REDIS_URL=redis://:test_redis_password@localhost:6380

# Performance Targets
THROUGHPUT_TARGET=100        # orders/sec
LATENCY_P99_TARGET=100       # milliseconds
```

### Test Users

Created automatically by seed script:

```
trader1@test.local - High balance trader
trader2@test.local - Medium balance trader
trader3@test.local - High volume trader
trader4@test.local - Low balance trader
trader5@test.local - High crypto holder

Password: TestPass123!
```

Each user seeded with realistic balances:
- BTC: 0.1 - 5.0
- ETH: 1.0 - 20.0
- USDT: 5,000 - 200,000
- TRY: 50,000 - 500,000

---

## Test Execution Workflow

### Phase 1: Manual Testing (2 hours)
Execute core scenarios manually to verify UI/API behavior:
1. Login as test user
2. Place limit order
3. Cancel order
4. View order book
5. Check wallet balances
6. Verify WebSocket updates

### Phase 2: Automated Testing (1 hour)
Run full automated test suite:
```bash
# Run all tests
npm run test:integration
npm run test:api
npm run test:perf

# Run specific test
npm run test:integration -- --testNamePattern="Market Order"
```

### Phase 3: Results Analysis (30 min)
- Review test reports
- Check coverage metrics (target: ≥80%)
- Identify failed tests
- Create bug reports for failures

### Phase 4: Cleanup (10 min)
```bash
./scripts/test-environment-setup.sh clean
```

---

## Available Scripts

### Setup & Teardown
```bash
# Start test environment
./scripts/test-environment-setup.sh up

# Stop services
./scripts/test-environment-setup.sh down

# Complete reset (removes all data)
./scripts/test-environment-setup.sh clean

# View logs
./scripts/test-environment-setup.sh logs

# Health check
./scripts/test-environment-setup.sh health
```

### Test Execution
```bash
# Integration tests (Jest)
npm run test:integration
npm run test:integration:watch    # Watch mode
npm run test:integration:coverage # Coverage report

# API tests (Postman/Newman)
npm run test:api

# End-to-end tests (Cypress)
npm run test:e2e

# Performance tests
npm run test:perf

# All tests
npm run test:all
```

### Data Management
```bash
# Seed test data
npm run test:seed

# Clear test data
npm run test:clean-data
```

---

## Test File Structure

```
tests/
├── INTEGRATION_TEST_PLAN.md          # Master test plan document
├── README.md                          # This file
├── integration/
│   ├── integration.test.ts           # Main integration tests
│   └── websocket.test.ts             # WebSocket integration tests
├── e2e/
│   ├── order-flow.cy.ts              # E2E order flow tests
│   ├── wallet.cy.ts                  # E2E wallet tests
│   └── trading.cy.ts                 # E2E trading tests
└── fixtures/
    ├── orders.json                   # Sample order data
    └── users.json                    # Sample user data
```

---

## Debugging Tests

### View Test Logs
```bash
# Jest tests with verbose output
npm run test:integration -- --verbose

# Postman/Newman with detailed output
npm run test:api -- --reporter cli

# Docker logs
docker-compose -f docker-compose.test.yml logs -f [service-name]
```

### Debug Specific Test
```bash
# Run single test file
npm run test:integration -- --testPathPattern="integration.test.ts"

# Run single test case
npm run test:integration -- --testNamePattern="Market Order"

# Debug in VS Code
# Add breakpoint and run: node --inspect-brk node_modules/.bin/jest
```

### Database Inspection
```bash
# Connect to test database
psql postgresql://test:test_password_secure@localhost:5433/exchange_test

# Example queries
SELECT * FROM users;
SELECT * FROM orders;
SELECT * FROM trades;
```

### Redis Inspection
```bash
# Connect to test Redis
redis-cli -h localhost -p 6380 -a test_redis_password

# Check keys
KEYS *

# Monitor commands
MONITOR
```

---

## Performance Testing

### Throughput Benchmark (TC-INT-018)
```bash
npm run test:perf -- --throughput
```

Generates 100 orders/sec for 5 minutes, measures:
- Orders accepted per second
- Error rate
- p50, p95, p99 latencies
- Database queue depth

**Target:** ≥95 orders/sec, <0.1% error rate

### Latency Distribution (TC-INT-019)
```bash
npm run test:perf -- --latency
```

Measures p99 latency across 1000 sequential orders:
- p50: 30-50ms
- p95: <80ms
- p99: <100ms ✓ REQUIREMENT

---

## Troubleshooting

### Services Don't Start
```bash
# Check Docker is running
docker ps

# View service logs
docker-compose -f docker-compose.test.yml logs

# Rebuild images
docker-compose -f docker-compose.test.yml build --no-cache
```

### Database Connection Error
```bash
# Check PostgreSQL is healthy
docker-compose -f docker-compose.test.yml ps postgres

# Check port is available
lsof -i :5433

# Reset database
./scripts/test-environment-setup.sh clean
./scripts/test-environment-setup.sh up
```

### WebSocket Tests Timeout
```bash
# Increase timeout in .env.test
WS_TIMEOUT_MS=20000

# Check WebSocket is accessible
curl -i -N -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: test" \
  http://localhost:3001/ws
```

### Performance Tests Are Slow
```bash
# Reduce test duration
npm run test:perf -- --duration=60  # 60 seconds instead of 300

# Reduce order volume
npm run test:perf -- --throughput=50  # 50 orders/sec instead of 100
```

---

## Test Results Interpretation

### Pass/Fail Criteria

**TEST SUITE PASSES if:**
- 95%+ of test cases pass
- No Critical (P0) failures
- No High (P1) test blocks
- Performance targets met:
  - Throughput ≥ 95 orders/sec
  - p99 latency ≤ 100ms
- Test coverage ≥ 80% of acceptance criteria

**TEST SUITE FAILS if:**
- < 95% pass rate
- Any Critical bug found
- Any blocking High bug found
- Performance below thresholds
- Coverage < 80%

### Sample Test Report
```
=========================== Test Results ===========================

Integration Tests
  PASSED: 18/19 (94.7%)
  FAILED: 1

  ✓ TC-INT-001: Market Order Execution
  ✓ TC-INT-002: Limit Order Queue
  ✗ TC-INT-009: WebSocket Order Updates (timeout)
  ...

Performance Tests
  Throughput: 98.5 orders/sec (target: 95) ✓
  p99 Latency: 87ms (target: 100ms) ✓

Coverage: 82% of acceptance criteria ✓

Failed Test Details
  TC-INT-009: WebSocket message timeout
  - WebSocket connection: OK
  - Message received: TIMEOUT after 10000ms
  - Issue: Possible slow server response

Blocking Issues: None
Recommendations: Investigate WebSocket latency

============================= Summary ==============================
Status: PASS (with 1 non-blocking failure)
Approved For: STAGING DEPLOYMENT
============================= END REPORT ==============================
```

---

## Sign-Off Checklist

Before approving feature for release:

- [ ] All test cases executed
- [ ] Pass rate ≥ 95%
- [ ] No Critical bugs
- [ ] No blocking High bugs
- [ ] Test coverage ≥ 80%
- [ ] Performance targets met
- [ ] WebSocket reliability verified (99.5%+)
- [ ] Error handling validated
- [ ] Documentation complete
- [ ] Handoff notes prepared

---

## Integration with CI/CD

### GitHub Actions Workflow
```yaml
name: Integration Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup test environment
        run: ./scripts/test-environment-setup.sh up
      - name: Run integration tests
        run: npm run test:integration
      - name: Run API tests
        run: npm run test:api
      - name: Publish results
        uses: actions/upload-artifact@v3
```

---

## Support & Contact

**Test Plan Owner:** QA Team
**Last Updated:** 2025-11-23
**Status:** Active - Ready for execution

For issues or questions, refer to:
1. `/tests/INTEGRATION_TEST_PLAN.md` - Detailed test scenarios
2. Test team chat channel
3. Bug tracking system (Jira/Linear)

---

## Appendix: Performance Baselines

Historical performance data (when available):

| Metric | Target | P95 | P99 |
|--------|--------|-----|-----|
| Order Placement Latency | <50ms | <80ms | <100ms |
| WebSocket Message Delivery | <100ms | <150ms | <200ms |
| Throughput (orders/sec) | 100+ | - | - |
| Error Rate | <0.1% | - | - |
| Order Book Update (bids/asks) | <50ms | <80ms | <100ms |

---

**Version 1.0** | Integration Test Suite Complete | Ready for Full-Stack Testing
