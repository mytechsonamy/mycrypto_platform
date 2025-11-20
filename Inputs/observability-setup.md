# Observability Setup
## Monitoring, Dashboards & Alerting

**Version:** 1.0  
**Last Updated:** 2025-11-19  
**Target:** DevOps, SRE, On-Call Engineers  
**Purpose:** Monitor system health and detect issues proactively

---

## 🎯 Observability Strategy

**The Three Pillars:**

1. **Metrics** (Prometheus + Grafana) → System & business metrics
2. **Logs** (ELK Stack) → Debugging & audit trail
3. **Traces** (Jaeger) → Request flow & performance bottlenecks

---

## 📊 Grafana Dashboards

### Dashboard 1: System Overview

**Purpose:** High-level health check  
**Refresh:** 30 seconds  
**URL:** `/d/system-overview`

#### Panels

**Row 1: Service Health**
- Panel 1.1: **Service Status** (table)
  - Columns: Service Name, Status (UP/DOWN), Uptime %, Last Restart
  - Query: `up{job=~".*-service"}`
  - Color: Green (up), Red (down)

- Panel 1.2: **API Latency (P95)** (graph)
  - Query: `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))`
  - Threshold lines: 500ms (warning), 1000ms (critical)

- Panel 1.3: **Error Rate** (graph)
  - Query: `rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) * 100`
  - Target: < 1%

**Row 2: Infrastructure**
- Panel 2.1: **CPU Usage** (gauge per service)
  - Query: `rate(process_cpu_seconds_total[5m]) * 100`
  - Thresholds: 50% (ok), 70% (warning), 90% (critical)

- Panel 2.2: **Memory Usage** (graph)
  - Query: `process_resident_memory_bytes / 1024 / 1024`
  - Unit: MB

- Panel 2.3: **Active Connections** (stat)
  - Database: `pg_stat_activity_count`
  - Redis: `redis_connected_clients`

**Row 3: Business Metrics**
- Panel 3.1: **Active Users (24h)** (stat)
  - Query: `count(rate(user_login_total[24h]) > 0)`

- Panel 3.2: **Trading Volume (24h)** (stat)
  - Query: `sum(increase(trade_volume_try[24h]))`
  - Unit: TRY

- Panel 3.3: **Orders Per Minute** (graph)
  - Query: `rate(orders_created_total[1m]) * 60`

---

### Dashboard 2: Trading Engine

**Purpose:** Monitor matching engine & order flow  
**Refresh:** 10 seconds  
**URL:** `/d/trading-engine`

#### Panels

**Row 1: Matching Engine**
- Panel 1.1: **Order Matching Latency** (heatmap)
  - Query: `histogram_quantile(0.99, rate(matching_engine_latency_seconds_bucket[1m]))`
  - Target: P99 < 10ms

- Panel 1.2: **Matching Throughput** (graph)
  - Query: `rate(orders_matched_total[1m]) * 60`
  - Unit: orders/min

- Panel 1.3: **Order Book Depth** (graph)
  - Query: `orderbook_depth{side="buy"}`, `orderbook_depth{side="sell"}`
  - Legend: Buy Side (green), Sell Side (red)

**Row 2: Order Lifecycle**
- Panel 2.1: **Orders by Status** (pie chart)
  - Query: `sum by (status) (order_status_total)`
  - Segments: Open, Filled, Cancelled, Rejected

- Panel 2.2: **Order Rejection Rate** (stat)
  - Query: `rate(orders_rejected_total[5m]) / rate(orders_created_total[5m]) * 100`
  - Target: < 1%

- Panel 2.3: **Partial Fill Rate** (graph)
  - Query: `rate(orders_partially_filled_total[5m])`

**Row 3: Trading Pairs**
- Panel 3.1: **Volume by Pair (24h)** (bar chart)
  - Query: `sum by (symbol) (increase(trade_volume_try{symbol=~"BTC_TRY|ETH_TRY|USDT_TRY"}[24h]))`

- Panel 3.2: **Spread (%)** (graph)
  - Query: `(orderbook_best_ask - orderbook_best_bid) / orderbook_best_ask * 100`
  - Target: < 0.5%

---

### Dashboard 3: Wallet & Transactions

**Purpose:** Monitor deposits, withdrawals, blockchain sync  
**Refresh:** 1 minute  
**URL:** `/d/wallet-transactions`

#### Panels

**Row 1: Wallet Balances**
- Panel 1.1: **Hot Wallet Balances** (table)
  - Columns: Asset, Balance, USD Value, % of Total
  - Query: `hot_wallet_balance{asset=~"BTC|ETH|USDT|TRY"}`

- Panel 1.2: **Cold Wallet Balances** (table)
  - Query: `cold_wallet_balance{asset=~"BTC|ETH|USDT"}`

- Panel 1.3: **Hot/Cold Ratio** (gauge)
  - Query: `hot_wallet_balance / (hot_wallet_balance + cold_wallet_balance) * 100`
  - Target: 10-20%

**Row 2: Deposits**
- Panel 2.1: **Pending Deposits** (stat)
  - Query: `count(deposit_status{status="pending"})`
  - Alert: > 50 for > 5 min

- Panel 2.2: **Deposit Processing Time (P95)** (graph)
  - Query: `histogram_quantile(0.95, rate(deposit_processing_duration_seconds_bucket[5m]))`
  - Target: < 10 minutes (crypto), < 30 min (fiat)

- Panel 2.3: **Deposits by Asset (24h)** (bar chart)
  - Query: `sum by (asset) (increase(deposits_total[24h]))`

**Row 3: Withdrawals**
- Panel 3.1: **Pending Withdrawals** (stat)
  - Query: `count(withdrawal_status{status="pending"})`

- Panel 3.2: **Withdrawal Processing Time (P95)** (graph)
  - Query: `histogram_quantile(0.95, rate(withdrawal_processing_duration_seconds_bucket[5m]))`
  - Target: < 30 minutes

- Panel 3.3: **Withdrawal Failures** (graph)
  - Query: `rate(withdrawals_failed_total[5m])`
  - Alert: > 5% failure rate

**Row 4: Blockchain Sync**
- Panel 4.1: **BTC Node Sync Status** (stat)
  - Query: `bitcoin_node_synced`
  - Values: 1 (synced), 0 (syncing)

- Panel 4.2: **ETH Node Block Height** (graph)
  - Query: `ethereum_node_block_height`
  - Compare with: Latest block (external API)

- Panel 4.3: **Blockchain API Latency** (graph)
  - Query: `blockchain_api_latency_seconds{provider="blockcypher"}`

---

### Dashboard 4: Database & Cache

**Purpose:** Monitor PostgreSQL & Redis performance  
**Refresh:** 1 minute  
**URL:** `/d/database-cache`

#### Panels

**Row 1: PostgreSQL**
- Panel 1.1: **Active Connections** (graph)
  - Query: `pg_stat_database_numbackends{datname="exchange_prod"}`
  - Max: 20 (configured pool size)

- Panel 1.2: **Slow Queries (> 1s)** (table)
  - Query: `pg_stat_statements_mean_exec_time_seconds > 1`
  - Columns: Query, Avg Time, Calls

- Panel 1.3: **Lock Waits** (graph)
  - Query: `rate(pg_stat_database_conflicts_total[5m])`

- Panel 1.4: **Replication Lag** (stat)
  - Query: `pg_replication_lag_seconds`
  - Target: < 5 seconds

**Row 2: Redis**
- Panel 2.1: **Memory Usage** (gauge)
  - Query: `redis_memory_used_bytes / redis_memory_max_bytes * 100`
  - Threshold: 80% (warning)

- Panel 2.2: **Operations/sec** (graph)
  - Query: `rate(redis_commands_processed_total[1m])`

- Panel 2.3: **Cache Hit Rate** (stat)
  - Query: `redis_keyspace_hits_total / (redis_keyspace_hits_total + redis_keyspace_misses_total) * 100`
  - Target: > 90%

- Panel 2.4: **Evicted Keys** (graph)
  - Query: `rate(redis_evicted_keys_total[5m])`
  - Alert: Sudden spike

---

### Dashboard 5: KYC & Compliance

**Purpose:** Monitor compliance operations  
**Refresh:** 5 minutes  
**URL:** `/d/compliance`

#### Panels

**Row 1: KYC**
- Panel 1.1: **Pending KYC Reviews** (stat)
  - Query: `count(kyc_status{status="pending"})`
  - SLA: < 48 hours

- Panel 1.2: **KYC Approval Rate** (gauge)
  - Query: `kyc_approved_total / (kyc_approved_total + kyc_rejected_total) * 100`
  - Benchmark: 70-80%

- Panel 1.3: **KYC Processing Time (P95)** (graph)
  - Query: `histogram_quantile(0.95, rate(kyc_processing_duration_seconds_bucket[1h]))`
  - Target: < 24 hours

**Row 2: AML**
- Panel 2.1: **Suspicious Activity Flags (24h)** (stat)
  - Query: `increase(aml_flags_total[24h])`

- Panel 2.2: **High-Risk Transactions** (table)
  - Query: `aml_transaction_risk_score > 0.7`
  - Columns: User ID, Amount, Risk Score, Timestamp

---

### Dashboard 6: Business Metrics

**Purpose:** Executive dashboard for business KPIs  
**Refresh:** 5 minutes  
**URL:** `/d/business`

#### Panels

**Row 1: User Metrics**
- Panel 1.1: **Total Registered Users** (stat)
  - Query: `count(user_created_at)`

- Panel 1.2: **New Registrations (24h)** (stat)
  - Query: `increase(user_registrations_total[24h])`

- Panel 1.3: **KYC Approved Users** (stat)
  - Query: `count(kyc_status{status="approved"})`

- Panel 1.4: **Active Traders (24h)** (stat)
  - Query: `count(last_trade_time > now() - 24h)`

**Row 2: Trading Metrics**
- Panel 2.1: **24h Trading Volume (TRY)** (stat)
  - Query: `sum(increase(trade_volume_try[24h]))`
  - Format: Currency (₺)

- Panel 2.2: **24h Trade Count** (stat)
  - Query: `increase(trades_total[24h])`

- Panel 2.3: **Average Trade Size (TRY)** (stat)
  - Query: `avg(trade_amount_try)`

- Panel 2.4: **Top Trading Pair (24h)** (stat)
  - Query: `topk(1, sum by (symbol) (increase(trade_volume_try[24h])))`

**Row 3: Revenue Metrics**
- Panel 3.1: **Total Fees Collected (24h)** (stat)
  - Query: `sum(increase(trading_fees_collected_try[24h]))`
  - Format: Currency (₺)

- Panel 3.2: **Fees by Pair (24h)** (pie chart)
  - Query: `sum by (symbol) (increase(trading_fees_collected_try[24h]))`

- Panel 3.3: **Average Fee per Trade** (stat)
  - Query: `sum(increase(trading_fees_collected_try[24h])) / increase(trades_total[24h])`

**Row 4: Deposit/Withdrawal**
- Panel 4.1: **24h Deposits (TRY)** (stat)
  - Query: `sum(increase(deposits_try[24h]))`

- Panel 4.2: **24h Withdrawals (TRY)** (stat)
  - Query: `sum(increase(withdrawals_try[24h]))`

- Panel 4.3: **Net Flow (TRY)** (stat)
  - Query: `sum(increase(deposits_try[24h])) - sum(increase(withdrawals_try[24h]))`
  - Color: Green (positive), Red (negative)

---

## 🚨 Prometheus Alerting Rules

### Alert File Structure

**File:** `prometheus/alerts/critical.yml`

```yaml
groups:
  - name: critical_alerts
    interval: 30s
    rules:
      - alert: ServiceDown
        expr: up{job=~".*-service"} == 0
        for: 1m
        labels:
          severity: critical
          team: platform
        annotations:
          summary: "Service {{ $labels.job }} is down"
          description: "{{ $labels.job }} has been down for more than 1 minute."
          runbook: "https://runbook.exchange.com/alerts/service-down"

      - alert: HighErrorRate
        expr: |
          rate(http_requests_total{status=~"5.."}[5m]) 
          / rate(http_requests_total[5m]) * 100 > 5
        for: 5m
        labels:
          severity: critical
          team: platform
        annotations:
          summary: "High error rate on {{ $labels.job }}"
          description: "Error rate is {{ $value }}% (threshold: 5%)"
          runbook: "https://runbook.exchange.com/alerts/high-error-rate"

      - alert: APILatencyHigh
        expr: |
          histogram_quantile(0.95, 
            rate(http_request_duration_seconds_bucket[5m])
          ) > 1
        for: 10m
        labels:
          severity: warning
          team: platform
        annotations:
          summary: "API latency is high on {{ $labels.job }}"
          description: "P95 latency is {{ $value }}s (threshold: 1s)"

      - alert: DatabaseConnectionPoolExhausted
        expr: pg_stat_database_numbackends >= 18
        for: 5m
        labels:
          severity: critical
          team: database
        annotations:
          summary: "Database connection pool near limit"
          description: "{{ $value }} active connections (max: 20)"

      - alert: HotWalletBalanceLow
        expr: |
          hot_wallet_balance{asset="TRY"} < 100000
        for: 5m
        labels:
          severity: warning
          team: finance
        annotations:
          summary: "TRY hot wallet balance is low"
          description: "Balance: {{ $value }} TRY (threshold: 100,000 TRY)"

      - alert: PendingWithdrawalsBacklog
        expr: count(withdrawal_status{status="pending"}) > 100
        for: 10m
        labels:
          severity: warning
          team: finance
        annotations:
          summary: "Pending withdrawals backlog"
          description: "{{ $value }} pending withdrawals (threshold: 100)"

      - alert: MatchingEngineLatencyHigh
        expr: |
          histogram_quantile(0.99, 
            rate(matching_engine_latency_seconds_bucket[1m])
          ) > 0.05
        for: 5m
        labels:
          severity: critical
          team: trading
        annotations:
          summary: "Matching engine latency is high"
          description: "P99 latency is {{ $value }}s (threshold: 50ms)"
          runbook: "https://runbook.exchange.com/alerts/matching-latency"

      - alert: BlockchainNodeNotSynced
        expr: bitcoin_node_synced == 0 or ethereum_node_synced == 0
        for: 15m
        labels:
          severity: critical
          team: blockchain
        annotations:
          summary: "Blockchain node out of sync"
          description: "{{ $labels.network }} node is not synced for 15+ minutes"

      - alert: KYCBacklog
        expr: count(kyc_status{status="pending"}) > 500
        for: 1h
        labels:
          severity: warning
          team: compliance
        annotations:
          summary: "KYC review backlog"
          description: "{{ $value }} pending KYC reviews (threshold: 500)"

      - alert: RedisMemoryHigh
        expr: |
          redis_memory_used_bytes 
          / redis_memory_max_bytes * 100 > 90
        for: 5m
        labels:
          severity: warning
          team: platform
        annotations:
          summary: "Redis memory usage is high"
          description: "Memory usage: {{ $value }}% (threshold: 90%)"

      - alert: DiskSpaceLow
        expr: |
          (node_filesystem_avail_bytes{mountpoint="/"} 
          / node_filesystem_size_bytes{mountpoint="/"}) * 100 < 15
        for: 5m
        labels:
          severity: critical
          team: platform
        annotations:
          summary: "Disk space low on {{ $labels.instance }}"
          description: "Available: {{ $value }}% (threshold: 15%)"
```

---

## 📋 SLO/SLA Definitions

### Service Level Objectives (Internal)

| Service | Metric | SLO Target | Measurement Window |
|---------|--------|------------|-------------------|
| **API Gateway** | Availability | 99.9% | 30 days |
| **API Gateway** | P95 Latency | < 500ms | 5 minutes |
| **Trading Service** | Availability | 99.95% | 30 days |
| **Matching Engine** | P99 Latency | < 50ms | 1 minute |
| **Wallet Service** | Deposit Processing | < 30 min (P95) | 1 hour |
| **Wallet Service** | Withdrawal Processing | < 60 min (P95) | 1 hour |
| **Database** | Replication Lag | < 5 seconds | 1 minute |

### Service Level Agreements (Customer-Facing)

| Service | SLA | Penalty (if breached) |
|---------|-----|----------------------|
| **Platform Uptime** | 99.5% monthly | Fee refund (1 day) |
| **Order Execution** | 99% within 1s | Trading fee waiver |
| **Deposit Processing** | 95% within 1 hour | No penalty (informational) |
| **Withdrawal Processing** | 95% within 2 hours | Priority processing + support ticket |

---

## 🔔 Alert Routing (PagerDuty)

### Severity Levels

| Severity | Response Time | Notification |
|----------|---------------|--------------|
| **Critical** | Immediate (24/7) | PagerDuty → SMS + Call |
| **High** | < 30 min (business hours) | PagerDuty → Push |
| **Warning** | < 2 hours | Slack + Email |
| **Info** | Best effort | Slack only |

### On-Call Rotation

- **Primary On-Call:** Rotates weekly (Monday 9 AM)
- **Secondary On-Call:** Escalation after 5 minutes (no ack)
- **Escalation Manager:** CTO (after 15 min)

---

## 📈 Performance Baselines

### Baseline Metrics (as of MVP launch)

| Metric | Baseline | P95 | P99 |
|--------|----------|-----|-----|
| **API Latency** | 150ms | 300ms | 500ms |
| **DB Query Time** | 50ms | 100ms | 200ms |
| **Order Matching** | 5ms | 10ms | 20ms |
| **Cache Hit Rate** | 92% | - | - |
| **Error Rate** | 0.5% | - | - |

*Note: Re-baseline quarterly based on load*

---

## 🛠️ Observability Tools Setup

### Prometheus Configuration

**File:** `prometheus/prometheus.yml`

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    cluster: 'production'
    region: 'eu-west-1'

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']

rule_files:
  - 'alerts/critical.yml'
  - 'alerts/warning.yml'

scrape_configs:
  - job_name: 'auth-service'
    kubernetes_sd_configs:
      - role: pod
        namespaces:
          names: ['production']
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_label_app]
        regex: auth-service
        action: keep
      - source_labels: [__meta_kubernetes_pod_name]
        target_label: instance

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']

  - job_name: 'node-exporter'
    kubernetes_sd_configs:
      - role: node
```

---

### Grafana Provisioning

**File:** `grafana/provisioning/datasources/prometheus.yml`

```yaml
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: false
```

**File:** `grafana/provisioning/dashboards/dashboards.yml`

```yaml
apiVersion: 1

providers:
  - name: 'default'
    orgId: 1
    folder: ''
    type: file
    options:
      path: /var/lib/grafana/dashboards
```

---

## 📊 Log Aggregation (ELK)

### Elasticsearch Index Template

```json
{
  "index_patterns": ["logs-*"],
  "template": {
    "settings": {
      "number_of_shards": 3,
      "number_of_replicas": 1,
      "index.lifecycle.name": "logs-policy",
      "index.lifecycle.rollover_alias": "logs"
    },
    "mappings": {
      "properties": {
        "timestamp": { "type": "date" },
        "level": { "type": "keyword" },
        "service": { "type": "keyword" },
        "message": { "type": "text" },
        "trace_id": { "type": "keyword" },
        "user_id": { "type": "keyword" },
        "error": {
          "properties": {
            "message": { "type": "text" },
            "stack": { "type": "text" }
          }
        }
      }
    }
  }
}
```

---

## 🔍 Distributed Tracing (Jaeger)

### Key Traces to Monitor

- **User Login Flow:** Auth Service → Database → Redis
- **Order Placement:** Trading Service → Matching Engine → Wallet Service → Database
- **Deposit Processing:** Wallet Service → Blockchain Node → Database → Notification Service

---

## 📚 Runbook Links

All alerts link to runbooks:
- `https://runbook.exchange.com/alerts/{alert-name}`
- Each runbook includes:
  - Symptoms
  - Causes
  - Investigation steps
  - Resolution steps
  - Prevention measures

---

**Document Owner:** SRE Team  
**Review Frequency:** Monthly  
**Next Review Date:** 2025-12-19
