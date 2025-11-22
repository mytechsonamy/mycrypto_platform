# Trade Engine - Monitoring & Observability Guide

## Overview

This document describes the monitoring and observability setup for the Trade Engine service. The system uses Prometheus for metrics collection and Grafana for visualization and dashboarding.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Trade Engine Service                      │
│                                                              │
│  ┌──────────────────┐          ┌──────────────────┐         │
│  │   HTTP Handler   │          │   Metrics Pkg    │         │
│  │   (Chi Router)   │─────────▶│  (Prometheus)    │         │
│  └──────────────────┘          └──────────────────┘         │
│           │                              │                   │
│           └──────────────────┬───────────┘                   │
│                              │                               │
│                       ┌──────▼─────────┐                     │
│                       │  /metrics      │                     │
│                       │  Endpoint      │                     │
│                       └──────┬─────────┘                     │
└────────────────────────────┬─────────────────────────────────┘
                             │
                    ┌────────▼─────────┐
                    │   Prometheus     │
                    │   Port: 9095     │
                    │                  │
                    │ - Scrapes /metrics
                    │ - Evaluates alerts
                    │ - Stores metrics
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │     Grafana      │
                    │   Port: 3005     │
                    │                  │
                    │ - Dashboards     │
                    │ - Visualization  │
                    │ - Alerting UI    │
                    └──────────────────┘
```

## Components

### 1. Prometheus Metrics

The Trade Engine exposes metrics at the `/metrics` endpoint in Prometheus text format.

**Access:**
```bash
curl http://localhost:8085/metrics
```

**Key Metric Categories:**

#### HTTP Request Metrics
- `trade_engine_http_requests_total` - Total HTTP requests by method, path, status
- `trade_engine_http_request_duration_seconds` - Request latency histogram
- `trade_engine_http_response_size_bytes` - Response size histogram

#### Business Logic Metrics
- `trade_engine_orders_created_total` - Orders created by side and type
- `trade_engine_orders_cancelled_total` - Cancelled orders by reason
- `trade_engine_trades_executed_total` - Executed trades by symbol
- `trade_engine_trade_volume_total` - Trading volume by symbol
- `trade_engine_active_orders` - Current active orders by side and symbol

#### Database Metrics
- `trade_engine_database_query_duration_seconds` - Query latency by operation
- `trade_engine_database_errors_total` - Database errors by operation
- `trade_engine_database_connection_pool_size` - Connection pool metrics

#### Cache Metrics
- `trade_engine_cache_hits_total` - Cache hits by cache name
- `trade_engine_cache_misses_total` - Cache misses by cache name
- `trade_engine_cache_size_bytes` - Cache size in bytes

#### System Metrics (Go runtime)
- `go_goroutines` - Number of goroutines
- `go_memstats_alloc_bytes` - Memory allocated
- `go_memstats_heap_alloc_bytes` - Heap allocated

### 2. Prometheus Configuration

**Location:** `./monitoring/prometheus.yml`

**Scrape Targets:**
- Trade Engine: `http://trade-engine:8080/metrics` (15s interval)
- PostgreSQL: `postgres-exporter:9187` (30s interval)
- Redis: `redis-exporter:9121` (30s interval)
- Prometheus: `localhost:9090` (default)

**Configuration Features:**
- 15-second global scrape interval
- 15-day data retention
- External labels for clustering and environment

### 3. Alert Rules

**Location:** `./monitoring/alerts.yml`

**Alert Groups:**

#### Service Health
- `TradeEngineServiceDown` - Service unreachable for >1 minute
- `TradeEngineUnhealthy` - Health endpoint failing
- `HighMemoryUsage` - Memory usage >0.8GB
- `HighGoroutineCount` - Goroutines >1000

#### API Performance
- `HighAPILatencyP99` - p99 latency >200ms
- `HighAPILatencyP95` - p95 latency >500ms
- `HighErrorRate` - Error rate >5%
- `Elevated4xxErrorRate` - 4xx error rate >20%
- `LowRequestRate` - Request rate <1/sec

#### Database
- `PostgreSQLDown` - Database unreachable
- `DBConnectionPoolExhaustion` - Active connections >90
- `SlowQueryDetected` - Query time >100ms
- `HighTransactionCount` - Transaction rate >100/sec
- `TableBloat` - Dead tuples >1000

#### Redis
- `RedisDown` - Redis unreachable
- `RedisHighMemory` - Memory usage >90%
- `RedisEvictions` - Eviction rate >100/sec
- `RedisRejectedConnections` - Connection rejections detected

#### Business Logic
- `NoOrdersBeingCreated` - No orders in 10 minutes
- `NoTradesExecuted` - No trades in 15 minutes
- `OrderCancellationSpike` - Cancellation rate >10/sec

## Grafana Dashboards

### 1. Trade Engine - System Health
**UID:** `trade-engine-health`

**Panels:**
- HTTP Request Rate by Method
- API Latency Percentiles (p50, p95, p99)
- HTTP Error Rate (5xx)
- Memory Usage
- Goroutine Count
- Database Connections

**Use Case:** Overall system health monitoring, trend analysis

### 2. Trade Engine - API Performance
**UID:** `trade-engine-api`

**Panels:**
- Error Rate (5xx) - Stat
- P99 Latency - Stat
- Request Rate - Stat
- Total Requests (5m) - Stat
- Request Latency Distribution (5m) - Heatmap
- Requests by Endpoint - Time series
- Requests by Status Code - Stacked bars

**Use Case:** API performance monitoring, endpoint analysis

### 3. Trade Engine - Database Performance
**UID:** `trade-engine-db`

**Panels:**
- Active Connections - Stat
- Average Query Time - Stat
- Total Queries - Stat
- Cache Hit Ratio - Stat
- Database Connections Over Time - Time series
- Query Execution Time - Time series
- Table Scans (Sequential vs Index) - Time series

**Use Case:** Database performance, query optimization

**Access:** http://localhost:3005 (admin/admin)

## Running Monitoring Stack

### Quick Start

Start all services including monitoring:
```bash
cd services/trade-engine
docker-compose up -d
```

Start only monitoring stack:
```bash
make monitoring-up
```

### Access Points

- **Trade Engine API:** http://localhost:8085
- **Metrics Endpoint:** http://localhost:8085/metrics
- **Prometheus:** http://localhost:9095
- **Grafana:** http://localhost:3005 (admin/admin)

### Verify Setup

Check Prometheus targets:
```bash
make prometheus-targets
```

Check Alert Rules:
```bash
make prometheus-alerts
```

Test metrics endpoint:
```bash
make metrics-test
```

Check Grafana health:
```bash
make grafana-health
```

## Using Prometheus

### Access Prometheus UI
```bash
make metrics
# or
open http://localhost:9095
```

### Query Examples

#### Request Rate
```promql
sum(rate(trade_engine_http_requests_total[5m])) by (method)
```

#### Error Rate
```promql
sum(rate(trade_engine_http_requests_total{status=~"5.."}[5m])) /
sum(rate(trade_engine_http_requests_total[5m]))
```

#### P99 Latency
```promql
histogram_quantile(0.99, rate(trade_engine_http_request_duration_seconds_bucket[5m]))
```

#### Active Goroutines
```promql
go_goroutines{job="trade-engine"}
```

#### Database Connections
```promql
pg_stat_activity_count{datname="mytrader_trade_engine"}
```

## Using Grafana

### Access Grafana
```bash
make dashboard
# or
open http://localhost:3005
```

Default credentials: admin / admin

### Add Custom Dashboard

1. Click "+" in left sidebar
2. Select "Create" → "Dashboard"
3. Add panels with queries
4. Save with unique UID

### Create Custom Alerts

1. Click on panel gear icon
2. Select "Alert" tab
3. Configure threshold and notification channel
4. Save

## Metrics Instrumentation in Go Code

The Trade Engine uses Prometheus Go client library for metrics.

### HTTP Request Tracking

Automatically tracked via `MetricsMiddleware`:
```go
// Applied to all routes in router.go
r.Use(MetricsMiddleware)
```

Metrics recorded:
- Request count (method, path, status)
- Request duration (method, path)
- Response size (method, path, status)

### Business Logic Metrics

In domain services:
```go
import "github.com/yourusername/mycrypto-platform/services/trade-engine/pkg/metrics"

// Record order creation
metrics.RecordOrderCreated("BUY", "LIMIT")

// Record trade execution
metrics.RecordTradeExecuted("BTC/USDT", 1.5)

// Update active orders gauge
metrics.ActiveOrders.WithLabelValues("BUY", "BTC/USDT").Set(float64(count))
```

### Database Query Tracking

In repository layer:
```go
import "github.com/yourusername/mycrypto-platform/services/trade-engine/pkg/metrics"

start := time.Now()
result := db.Query(sql)
duration := time.Since(start).Seconds()

metrics.RecordDatabaseQuery("select", "orders", duration, result.Error)
```

### Cache Tracking

```go
// Record cache hit
metrics.RecordCacheOperation("orderbook", true)

// Record cache miss
metrics.RecordCacheOperation("orderbook", false)

// Update cache size
metrics.CacheSize.WithLabelValues("orderbook").Set(float64(sizeInBytes))
```

## Performance Tuning

### Prometheus Configuration
- **Scrape Interval:** 15 seconds (adjust via `prometheus.yml`)
- **Storage Retention:** 15 days (adjust `--storage.tsdb.retention.time`)
- **Disk Space:** ~2GB per day for typical load

### Grafana Configuration
- **Refresh Rate:** 30s (default)
- **Query Timeout:** 60s
- **Data Source:** Prometheus at `http://prometheus:9090`

## Troubleshooting

### Prometheus not scraping metrics
1. Verify service is running: `docker-compose ps`
2. Check Prometheus targets: `make prometheus-targets`
3. Test metrics endpoint: `make metrics-test`
4. Check logs: `docker-compose logs prometheus`

### Grafana dashboards not loading
1. Verify Prometheus datasource: `make grafana-datasources`
2. Check Grafana logs: `docker-compose logs grafana`
3. Manually add Prometheus datasource:
   - Settings → Data Sources → Add → Prometheus
   - URL: `http://prometheus:9090`

### High memory usage
1. Check Go runtime metrics: `go_memstats_alloc_bytes`
2. Review goroutine count: `go_goroutines`
3. Check for memory leaks in application code
4. Consider scaling or optimizing algorithms

### Slow queries
1. Check database metrics: `trade_engine_database_query_duration_seconds`
2. Run EXPLAIN ANALYZE on slow queries
3. Review indexes: `monitoring.index_usage` (PostgreSQL)
4. Consider query optimization or caching

## Best Practices

1. **Always set Alert Thresholds Appropriately**
   - Too low: alert fatigue
   - Too high: missed issues

2. **Monitor Business Metrics**
   - Track orders, trades, volume
   - Understand normal vs abnormal patterns

3. **Use Consistent Labeling**
   - Methods, paths, symbols should be consistent
   - Helps in aggregation and filtering

4. **Regular Maintenance**
   - Archive old Prometheus data
   - Review and update alert rules quarterly
   - Test alert notification channels

5. **Documentation**
   - Document what each metric means
   - Update runbooks for alerts
   - Keep dashboard descriptions current

## Links

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Go Client Library](https://github.com/prometheus/client_golang)
- [PromQL Query Language](https://prometheus.io/docs/prometheus/latest/querying/basics/)

## Contact & Support

For issues with monitoring setup, contact the DevOps team.
For metrics instrumentation questions, contact the Backend team.
