# Kurumsal Kripto Varlık Borsası Platformu
## Performance Testing Plan

**Version:** 1.0  
**Last Updated:** 2025-11-19  
**Purpose:** Pre-production performance validation  
**Target:** QA Engineers, Performance Engineers, DevOps

---

## 📋 Executive Summary

Bu doküman, Kripto Varlık Borsası platformunun performans test stratejisini tanımlar.

### Test Objectives

1. **Validate MVP Performance Targets**
   - Throughput: 10,000+ orders/sec
   - Latency: API p95 < 50ms, Matching Engine p95 < 10ms
   - Concurrent Users: 50,000+

2. **Identify Bottlenecks**
   - Database query optimization needs
   - Service scaling limits
   - Resource constraints

3. **Establish Baseline**
   - Current performance metrics
   - Capacity planning data
   - Cost-performance optimization

---

## 🎯 Performance Requirements

### MVP Targets

| Metric | Target | Critical Threshold |
|--------|--------|-------------------|
| **Order Throughput** | 10,000 orders/sec | 5,000 orders/sec |
| **Trade Throughput** | 5,000 trades/sec | 2,500 trades/sec |
| **API Latency (p95)** | < 50ms | < 100ms |
| **API Latency (p99)** | < 100ms | < 200ms |
| **Matching Engine (p95)** | < 10ms | < 20ms |
| **Matching Engine (p99)** | < 20ms | < 50ms |
| **WebSocket Latency** | < 100ms | < 200ms |
| **Concurrent Users** | 50,000 | 25,000 |
| **Database Queries (p95)** | < 10ms | < 50ms |
| **Error Rate** | < 0.1% | < 1% |
| **Uptime** | 99.9% | 99% |

### Production Targets (6-12 months)

| Metric | Target |
|--------|--------|
| **Order Throughput** | 100,000+ orders/sec |
| **Concurrent Users** | 500,000+ |
| **API Latency (p95)** | < 30ms |
| **Matching Engine (p95)** | < 5ms |

---

## 📊 Test Types

### 1. Load Testing
**Purpose:** Verify system performs under expected load

**Scenarios:**
- Normal business day
- Market open (peak hour)
- Weekend (low traffic)

**Duration:** 1-2 hours per scenario

---

### 2. Stress Testing
**Purpose:** Find breaking point

**Scenarios:**
- Gradual load increase until failure
- Sustained peak load (2x expected)

**Duration:** Until system fails or 4 hours

---

### 3. Spike Testing
**Purpose:** Verify system handles sudden traffic spikes

**Scenarios:**
- Normal → 10x load in 1 minute
- Simulates: Major news event, viral marketing

**Duration:** 30 minutes (with spikes)

---

### 4. Soak Testing (Endurance)
**Purpose:** Detect memory leaks, resource exhaustion

**Scenarios:**
- Sustained normal load for extended period

**Duration:** 24-72 hours

---

### 5. Scalability Testing
**Purpose:** Verify horizontal scaling works

**Scenarios:**
- Add pods during load
- Remove pods during load
- Auto-scaling triggers

**Duration:** 2-3 hours

---

## 🛠️ Test Tools

### Primary Tools

1. **k6** (Load generation)
   - Modern, scriptable (JavaScript)
   - Cloud-native, Kubernetes-friendly
   - Excellent for API testing

2. **Gatling** (Alternative)
   - JVM-based
   - Good for complex scenarios
   - Detailed HTML reports

3. **Locust** (Alternative)
   - Python-based
   - Distributed load testing
   - Easy to script

### Supporting Tools

- **Prometheus + Grafana:** Real-time metrics
- **Jaeger:** Distributed tracing
- **cAdvisor:** Container metrics
- **PostgreSQL pg_stat_statements:** Database profiling

---

## 📝 Test Scenarios

### Scenario 1: Normal Business Day

**Profile:**
```
Users: 10,000 concurrent
Duration: 2 hours
Ramp-up: 10 minutes
Pattern: Steady state

User Actions:
- 60% Market data viewing (ticker, orderbook)
- 20% Order placement (70% limit, 30% market)
- 15% Portfolio viewing
- 5% Withdrawals/deposits
```

**k6 Script:**
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '10m', target: 10000 }, // Ramp-up
    { duration: '2h', target: 10000 },  // Steady
    { duration: '5m', target: 0 },      // Ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<50'], // 95% < 50ms
    http_req_failed: ['rate<0.01'],  // <1% errors
  },
};

const BASE_URL = __ENV.BASE_URL || 'https://api-staging.yourbank.com';
let authToken = null;

export function setup() {
  // Login once, reuse token
  const loginRes = http.post(`${BASE_URL}/api/v1/auth/login`, JSON.stringify({
    email: 'loadtest@yourbank.com',
    password: 'LoadTest123!'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
  
  authToken = loginRes.json('data.accessToken');
  return { authToken };
}

export default function(data) {
  const headers = {
    'Authorization': `Bearer ${data.authToken}`,
    'Content-Type': 'application/json'
  };
  
  // Action distribution
  const rand = Math.random();
  
  if (rand < 0.6) {
    // 60%: View market data
    const res = http.get(`${BASE_URL}/api/v1/markets/BTCTRY/ticker`);
    check(res, { 'ticker status 200': (r) => r.status === 200 });
  } else if (rand < 0.8) {
    // 20%: Place order
    const orderType = Math.random() < 0.7 ? 'LIMIT' : 'MARKET';
    const side = Math.random() < 0.5 ? 'BUY' : 'SELL';
    
    const order = {
      symbol: 'BTCTRY',
      side: side,
      type: orderType,
      quantity: '0.001'
    };
    
    if (orderType === 'LIMIT') {
      order.price = '1850000.00';
      order.timeInForce = 'GTC';
    }
    
    const res = http.post(`${BASE_URL}/api/v1/orders`, JSON.stringify(order), { headers });
    check(res, { 'order status 200': (r) => r.status === 200 });
  } else if (rand < 0.95) {
    // 15%: View portfolio
    const res = http.get(`${BASE_URL}/api/v1/wallets/balances`, { headers });
    check(res, { 'balances status 200': (r) => r.status === 200 });
  } else {
    // 5%: Withdrawal (will be pending)
    const res = http.post(`${BASE_URL}/api/v1/wallets/BTC/withdraw`, JSON.stringify({
      amount: '0.001',
      address: 'bc1qtest...',
      network: 'BTC',
      twoFactorCode: '123456'
    }), { headers });
    // May fail due to 2FA, that's OK for load test
  }
  
  sleep(Math.random() * 3 + 1); // 1-4 seconds think time
}
```

**Run:**
```bash
k6 run --vus 10000 --duration 2h normal-business-day.js
```

---

### Scenario 2: Market Open Spike

**Profile:**
```
Peak Users: 50,000 concurrent
Duration: 30 minutes
Ramp-up: 5 minutes (0 → 50K)
Pattern: Sharp spike, sustain, gradual decrease

Focus: Order placement (80% of actions)
```

**k6 Script:**
```javascript
export let options = {
  stages: [
    { duration: '5m', target: 50000 },  // Spike!
    { duration: '15m', target: 50000 }, // Sustain peak
    { duration: '10m', target: 10000 }, // Gradual decrease
  ],
  thresholds: {
    http_req_duration: ['p(95)<100'], // Relaxed threshold for spike
    http_req_failed: ['rate<0.05'],   // 5% error acceptable during spike
  },
};

export default function(data) {
  const headers = {
    'Authorization': `Bearer ${data.authToken}`,
    'Content-Type': 'application/json'
  };
  
  // 80% order placement during spike
  if (Math.random() < 0.8) {
    const order = {
      symbol: 'BTCTRY',
      side: Math.random() < 0.5 ? 'BUY' : 'SELL',
      type: 'MARKET',
      quantity: '0.001'
    };
    
    http.post(`${BASE_URL}/api/v1/orders`, JSON.stringify(order), { headers });
  } else {
    http.get(`${BASE_URL}/api/v1/markets/BTCTRY/ticker`);
  }
  
  sleep(1); // Shorter think time during spike
}
```

---

### Scenario 3: Soak Test (24 hours)

**Profile:**
```
Users: 5,000 concurrent
Duration: 24 hours
Pattern: Constant load
Focus: Memory leaks, connection leaks
```

**k6 Script:**
```javascript
export let options = {
  stages: [
    { duration: '10m', target: 5000 },
    { duration: '24h', target: 5000 },
    { duration: '5m', target: 0 },
  ],
};

export default function(data) {
  // Realistic user behavior
  const actions = [
    () => http.get(`${BASE_URL}/api/v1/markets`),
    () => http.get(`${BASE_URL}/api/v1/markets/BTCTRY/ticker`),
    () => http.get(`${BASE_URL}/api/v1/wallets/balances`, { 
      headers: { 'Authorization': `Bearer ${data.authToken}` }
    }),
  ];
  
  // Random action
  actions[Math.floor(Math.random() * actions.length)]();
  
  sleep(5 + Math.random() * 5); // 5-10 seconds
}
```

**Monitoring during soak:**
```bash
# Check memory growth
watch -n 60 'kubectl top pods -n crypto-platform'

# Check connection pool
psql -h db-primary -c "SELECT count(*) FROM pg_stat_activity;"

# Check for errors
kubectl logs -f deploy/trading-service -n crypto-platform | grep -i error
```

---

### Scenario 4: Database Heavy

**Profile:**
```
Focus: Database queries
Users: 1,000 concurrent
Actions: Complex queries (order history, trade history, reports)
Duration: 1 hour
```

**k6 Script:**
```javascript
export default function(data) {
  const headers = {
    'Authorization': `Bearer ${data.authToken}`
  };
  
  // Database-heavy operations
  const rand = Math.random();
  
  if (rand < 0.3) {
    // Get order history (pagination)
    http.get(`${BASE_URL}/api/v1/orders?page=1&pageSize=100`, { headers });
  } else if (rand < 0.6) {
    // Get trade history
    http.get(`${BASE_URL}/api/v1/trades?startDate=2025-01-01&endDate=2025-11-19`, { headers });
  } else {
    // Get wallet transaction history
    http.get(`${BASE_URL}/api/v1/wallets/deposits?page=1&pageSize=50`, { headers });
    http.get(`${BASE_URL}/api/v1/wallets/withdrawals?page=1&pageSize=50`, { headers });
  }
  
  sleep(2);
}
```

---

### Scenario 5: WebSocket Load

**Profile:**
```
WebSocket Connections: 50,000
Subscriptions per connection: 3 (ticker, orderbook, trades)
Duration: 1 hour
Message Rate: ~100 msg/sec per connection
```

**Node.js Script:**
```javascript
const WebSocket = require('ws');
const { performance } = require('perf_hooks');

const WS_URL = 'wss://api-staging.yourbank.com/ws';
const CONNECTIONS = 50000;
const SUBSCRIPTIONS = ['ticker.BTCTRY', 'orderbook.BTCTRY', 'trades.BTCTRY'];

let connectedCount = 0;
let messageCount = 0;
let latencies = [];

function createConnection() {
  const ws = new WebSocket(WS_URL);
  
  ws.on('open', () => {
    connectedCount++;
    
    // Subscribe to channels
    SUBSCRIPTIONS.forEach(channel => {
      ws.send(JSON.stringify({
        method: 'SUBSCRIBE',
        params: { channel }
      }));
    });
    
    // Heartbeat every 30s
    setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        const sendTime = performance.now();
        ws.send(JSON.stringify({ method: 'PING' }), () => {
          // Measure round-trip time
          ws.once('message', (data) => {
            if (JSON.parse(data).method === 'PONG') {
              const latency = performance.now() - sendTime;
              latencies.push(latency);
            }
          });
        });
      }
    }, 30000);
  });
  
  ws.on('message', (data) => {
    messageCount++;
  });
  
  ws.on('error', (err) => {
    console.error('WebSocket error:', err.message);
  });
  
  ws.on('close', () => {
    connectedCount--;
  });
}

// Create connections gradually
let created = 0;
const interval = setInterval(() => {
  createConnection();
  created++;
  
  if (created >= CONNECTIONS) {
    clearInterval(interval);
    console.log(`All ${CONNECTIONS} connections created`);
    
    // Report stats every 10 seconds
    setInterval(() => {
      console.log(`Connected: ${connectedCount}, Messages: ${messageCount}/sec`);
      
      if (latencies.length > 0) {
        latencies.sort((a, b) => a - b);
        const p95 = latencies[Math.floor(latencies.length * 0.95)];
        console.log(`WebSocket latency p95: ${p95.toFixed(2)}ms`);
        latencies = [];
      }
      
      messageCount = 0;
    }, 10000);
  }
}, 10); // Create 100 connections/second
```

---

## 📈 Monitoring & Metrics

### Real-Time Dashboards

**1. Application Metrics (Grafana)**

```
Dashboard: "Load Test - Application Performance"

Panels:
- Request Rate (req/sec)
- Error Rate (%)
- Response Time p50/p95/p99 (ms)
- Active Connections
- Order Placement Rate
- Trade Execution Rate
- WebSocket Connections
- Cache Hit Rate
```

**2. Infrastructure Metrics**

```
Dashboard: "Load Test - Infrastructure"

Panels:
- CPU Usage (per pod, per node)
- Memory Usage (per pod, per node)
- Network I/O (Mbps)
- Disk I/O (IOPS)
- Pod Restart Count
```

**3. Database Metrics**

```
Dashboard: "Load Test - Database"

Panels:
- Active Connections
- Query Rate (queries/sec)
- Query Duration p95/p99 (ms)
- Cache Hit Ratio
- Deadlocks
- Replication Lag (if applicable)
- Transaction Rate (commits/sec)
```

### Prometheus Queries

```promql
# API Request Rate
rate(http_requests_total[1m])

# Error Rate
rate(http_requests_total{status=~"5.."}[1m]) / rate(http_requests_total[1m])

# P95 Latency
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Order Placement Rate
rate(orders_created_total[1m])

# Database Query Duration p95
histogram_quantile(0.95, rate(pg_query_duration_seconds_bucket[5m]))

# WebSocket Connections
websocket_connections_active
```

---

## 🧪 Test Execution

### Pre-Test Checklist

- [ ] **Environment prepared**
  - Dedicated test environment (not shared with dev)
  - Identical to production (same specs)
  - Clean state (no old test data)

- [ ] **Monitoring ready**
  - Grafana dashboards opened
  - Prometheus scraping all targets
  - Alerting temporarily disabled (avoid noise)

- [ ] **Test data prepared**
  - 100K+ test users created
  - Pre-funded accounts
  - Test market data seeded

- [ ] **Team ready**
  - Performance engineer (test execution)
  - DevOps engineer (monitoring)
  - Developer (troubleshooting)
  - Slack channel active

### During Test

**Every 15 minutes:**
- [ ] Check Grafana dashboards
- [ ] Check error logs
- [ ] Check resource utilization
- [ ] Document any anomalies

**If issues detected:**
- [ ] Take heap dump (memory leak suspected)
- [ ] Capture thread dump (deadlock suspected)
- [ ] Enable query logging (database slow)
- [ ] Increase log verbosity (debugging)

### Post-Test Checklist

- [ ] **Collect all metrics**
  - Export Grafana dashboards to PDF
  - Save Prometheus data snapshot
  - Save k6 HTML report

- [ ] **Analyze results**
  - Compare vs. targets
  - Identify bottlenecks
  - Calculate cost-performance

- [ ] **Create report**
  - Executive summary
  - Detailed findings
  - Recommendations

- [ ] **Cleanup**
  - Delete test data
  - Reset environment
  - Archive test scripts

---

## 📊 Sample Test Report

### Performance Test Report - v1.0.0

**Date:** 2025-11-19  
**Environment:** Staging (production-equivalent)  
**Duration:** 4 hours  
**Test Types:** Load, Stress, Spike

---

#### Test 1: Normal Business Day

**Configuration:**
- Users: 10,000 concurrent
- Duration: 2 hours
- Actions: Mixed (60% read, 40% write)

**Results:**

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Throughput | 5,000 req/sec | 6,200 req/sec | ✅ PASS |
| P95 Latency | < 50ms | 42ms | ✅ PASS |
| P99 Latency | < 100ms | 78ms | ✅ PASS |
| Error Rate | < 0.1% | 0.05% | ✅ PASS |

**Bottlenecks Identified:**
- Database connection pool maxed out at peak (95% utilization)
- Trading service CPU at 75% (acceptable but monitor)

**Recommendations:**
- Increase DB connection pool: 100 → 150
- Consider adding 1 more trading service replica

---

#### Test 2: Market Open Spike

**Configuration:**
- Peak Users: 50,000 concurrent
- Ramp: 0 → 50K in 5 minutes
- Duration: 30 minutes

**Results:**

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Throughput | 10,000 req/sec | 9,800 req/sec | ⚠️  CLOSE |
| P95 Latency | < 100ms | 95ms | ✅ PASS |
| Error Rate | < 5% | 3.2% | ✅ PASS |

**Bottlenecks Identified:**
- Matching Engine latency spiked to 25ms (p99) during peak
- Message queue (RabbitMQ) lag of 2 seconds

**Recommendations:**
- Tune Matching Engine (currently single instance)
- Consider message queue partitioning for higher throughput

---

#### Test 3: Soak Test (24 hours)

**Configuration:**
- Users: 5,000 concurrent
- Duration: 24 hours

**Results:**

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Memory Growth | < 5% | 2.3% | ✅ PASS |
| Connection Leaks | 0 | 0 | ✅ PASS |
| Error Rate | < 0.1% | 0.08% | ✅ PASS |

**Findings:**
- No memory leaks detected
- Stable performance over 24 hours
- Minor GC pauses (~50ms) every 4 hours (acceptable)

---

#### Overall Assessment

**🟢 System Ready for MVP Go-Live**

**Strengths:**
- Meets all MVP performance targets
- No critical bottlenecks
- Stable under sustained load
- Low error rates

**Areas for Improvement:**
- Matching Engine optimization (for future scale)
- Database connection pool tuning
- Message queue capacity planning

**Go/No-Go Decision:** ✅ GO

---

## 🔧 Performance Tuning Tips

### Application Layer

**1. Enable HTTP Keep-Alive**
```javascript
// Node.js
const http = require('http');
const agent = new http.Agent({ keepAlive: true });
```

**2. Use Connection Pooling**
```javascript
// PostgreSQL connection pool
const pool = new Pool({
  max: 100,           // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

**3. Implement Caching**
```javascript
// Redis caching for market data
const cachedTicker = await redis.get('ticker:BTCTRY');
if (cachedTicker) {
  return JSON.parse(cachedTicker);
}

const ticker = await fetchTickerFromDB();
await redis.setex('ticker:BTCTRY', 5, JSON.stringify(ticker)); // 5 sec TTL
```

**4. Async/Non-Blocking Operations**
```javascript
// BAD: Synchronous
const user = getUserSync();
const balance = getBalanceSync(user.id);

// GOOD: Asynchronous
const [user, balance] = await Promise.all([
  getUser(),
  getBalance(userId)
]);
```

---

### Database Layer

**1. Index Optimization**
```sql
-- Add index for common queries
CREATE INDEX idx_orders_user_status ON orders(user_id, status);
CREATE INDEX idx_trades_symbol_timestamp ON trades(symbol, timestamp DESC);

-- Analyze query plans
EXPLAIN ANALYZE SELECT * FROM orders WHERE user_id = 123 AND status = 'OPEN';
```

**2. Query Optimization**
```sql
-- BAD: N+1 query
-- For each order, query trades
SELECT * FROM orders WHERE user_id = 123;
-- Then for each order: SELECT * FROM trades WHERE order_id = ?

-- GOOD: Single query with JOIN
SELECT o.*, t.*
FROM orders o
LEFT JOIN trades t ON t.order_id = o.id
WHERE o.user_id = 123;
```

**3. Pagination**
```sql
-- Use LIMIT/OFFSET, but be aware of offset performance on large datasets
SELECT * FROM orders 
WHERE user_id = 123 
ORDER BY created_at DESC 
LIMIT 50 OFFSET 0;

-- For better performance on large offsets, use cursor-based pagination
SELECT * FROM orders 
WHERE user_id = 123 AND id < last_seen_id
ORDER BY id DESC 
LIMIT 50;
```

---

### Kubernetes/Infrastructure

**1. Resource Limits**
```yaml
resources:
  requests:
    memory: "512Mi"
    cpu: "500m"
  limits:
    memory: "1Gi"
    cpu: "1000m"
```

**2. Horizontal Pod Autoscaling**
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: trading-service
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: trading-service
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

**3. Pod Disruption Budget**
```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: trading-service
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: trading-service
```

---

## 📅 Testing Schedule

### Pre-MVP (Development Phase)

| Week | Test Type | Purpose |
|------|-----------|---------|
| W-8 | Baseline | Establish current performance |
| W-6 | Load Test | Validate under normal load |
| W-4 | Stress Test | Find breaking points |
| W-2 | Soak Test | Check for leaks (24h) |
| W-1 | Final Validation | All tests, go/no-go decision |

### Post-MVP (Production)

| Frequency | Test Type | Purpose |
|-----------|-----------|---------|
| **Weekly** | Load Test | Regression testing after deployments |
| **Monthly** | Stress Test | Capacity planning |
| **Quarterly** | Soak Test | Long-term stability check |

---

## 🚨 Test Failure Handling

### Critical Failures (Block Go-Live)

- ❌ Error rate > 5%
- ❌ P95 latency > 2x target
- ❌ Data corruption detected
- ❌ System crashes under load

**Action:** Full root cause analysis, fix, re-test

### Non-Critical Findings (Go-Live OK)

- ⚠️  Performance slightly below target (e.g., 9,500 vs 10,000 TPS)
- ⚠️  Minor memory growth (< 5% over 24h)
- ⚠️  Occasional errors (< 1%)

**Action:** Document, prioritize in backlog, monitor in production

---

## 📚 Related Documents

- [Technical Architecture](./crypto-exchange-architecture.md)
- [API Specification](./crypto-exchange-api-spec-complete.md)
- [Deployment Runbook](./deployment-runbook.md)
- [Security Audit Checklist](./security-audit-checklist.md)

---

**Document Owner:** QA Team  
**Review Frequency:** Before each major release  
**Next Review Date:** 2026-01-19