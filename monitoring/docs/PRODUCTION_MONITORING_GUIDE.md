# Production Monitoring & Alerting Guide
## MyCrypto Platform - Cryptocurrency Exchange MVP

**Version:** 1.0
**Last Updated:** 2025-11-30
**Status:** Production Ready
**Target Audience:** DevOps, SRE, On-Call Engineers

---

## Table of Contents

1. [Overview](#overview)
2. [Monitoring Architecture](#monitoring-architecture)
3. [Components](#components)
4. [Access & Credentials](#access--credentials)
5. [Dashboard Guide](#dashboard-guide)
6. [Alert Configuration](#alert-configuration)
7. [Health Checks](#health-checks)
8. [Metrics Guide](#metrics-guide)
9. [Troubleshooting](#troubleshooting)
10. [Maintenance](#maintenance)
11. [On-Call Runbooks](#on-call-runbooks)

---

## Overview

The MyCrypto Platform monitoring stack provides real-time visibility into system health, performance, and business metrics across all microservices. The stack is designed for production reliability with:

- **Prometheus:** Time-series metrics collection and alerting
- **Grafana:** Interactive dashboards and visualizations
- **AlertManager:** Alert routing and notification management
- **Loki:** Centralized log aggregation (optional)
- **Jaeger:** Distributed tracing for performance analysis (optional)

### Monitoring Objectives

1. **Availability:** Detect service outages within 1 minute
2. **Performance:** Track latency and throughput metrics
3. **Reliability:** Monitor error rates and failure patterns
4. **Business:** Track trading volume, user registrations, KYC completions
5. **Security:** Detect anomalies, fraud, and attacks
6. **Infrastructure:** Monitor resource utilization and capacity

### SLO/SLA Targets

| Service | Metric | Target | Alert Threshold |
|---------|--------|--------|-----------------|
| **API Gateway** | Availability | 99.9% | < 99.5% |
| **API Gateway** | P95 Latency | < 500ms | > 1s |
| **Trading Engine** | Availability | 99.95% | < 99.5% |
| **Matching Engine** | P99 Latency | < 50ms | > 100ms |
| **Database** | Replication Lag | < 5s | > 30s |
| **Withdrawals** | Processing | 95% within 30min | > 1 hour |

---

## Monitoring Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Application Services                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Auth Service │  │Wallet Service│  │Trading Engine│          │
│  │  :3000/metrics  │  :3000/metrics  │  :8080/metrics          │
│  └──────┬───────┘  └────┬─────────┘  └──────┬───────┘          │
└─────────┼────────────────┼──────────────────┼──────────────────┘
          │                │                  │
          └────────────────┼──────────────────┘
                           ▼
          ┌─────────────────────────────────┐
          │    Prometheus (9090)             │
          │  • Scrapes metrics every 15s    │
          │  • Evaluates alert rules        │
          │  • Stores time-series data      │
          │  • 30-day retention              │
          └────────┬──────────────────┬──────┘
                   │                  │
          ┌────────▼──┐        ┌──────▼──────┐
          │  Grafana  │        │AlertManager │
          │  (3000)   │        │   (9093)    │
          │ Dashboards│        │ Routing     │
          └───────────┘        │ Webhooks    │
                               └──────┬──────┘
                                      │
                      ┌───────────────┼───────────────┐
                      ▼               ▼               ▼
                   Slack          PagerDuty         Email
                   Webhook        Integration      Notifications
```

---

## Components

### Prometheus

**Purpose:** Collect metrics from all services and infrastructure

**Key Features:**
- Pull-based metric scraping (services expose `/metrics` endpoint)
- Recording rules for pre-computed metrics
- Alert rule evaluation
- Built-in PromQL query language
- TSDB storage with configurable retention

**Configuration:** `monitoring/prometheus.yml`

**Retention Policy:**
- Detail metrics: 30 days
- Aggregated metrics: 1 year
- WAL (Write-Ahead Log): 2 hours

### Grafana

**Purpose:** Visualize metrics and create dashboards

**Key Features:**
- Pre-built dashboards for all services
- Real-time metric visualization
- Alert status overview
- Annotation support for deployments/incidents
- Multi-datasource support

**Dashboards:**
1. System Health Overview
2. Application Performance
3. Trading Engine Metrics
4. Database & Cache Performance
5. Business Metrics
6. Security & Anomaly Detection
7. Infrastructure Resources

### AlertManager

**Purpose:** Route and manage alerts from Prometheus

**Key Features:**
- Alert grouping and deduplication
- Multi-channel routing (Slack, PagerDuty, Email)
- Alert silencing and inhibition
- Webhook integration for custom actions
- Escalation rules

**Configuration:** `monitoring/alertmanager.yml`

---

## Access & Credentials

### Local Development

| Component | URL | Credentials |
|-----------|-----|-------------|
| **Prometheus** | http://localhost:9090 | No auth required |
| **Grafana** | http://localhost:3000 | admin / admin |
| **AlertManager** | http://localhost:9093 | No auth required |

### Production (Kubernetes)

```bash
# Port-forward to access services locally
kubectl -n monitoring port-forward svc/prometheus 9090:9090
kubectl -n monitoring port-forward svc/grafana 3000:3000
kubectl -n monitoring port-forward svc/alertmanager 9093:9093

# View logs
kubectl -n monitoring logs -f deployment/prometheus
kubectl -n monitoring logs -f deployment/grafana
```

### Access Control

In production, all components should be:
- Protected by reverse proxy (nginx/Kong) with authentication
- Accessed only by authorized personnel (SRE/DevOps team)
- Limited to organization IP ranges
- Audited for access logs

---

## Dashboard Guide

### 1. System Health Overview

**Refresh Rate:** 30 seconds
**Default Time Range:** Last 6 hours

**Panels:**
- **Service Status:** 1=Up, 0=Down for all services
- **Disk Usage:** Percentage used across all nodes
- **CPU Usage:** CPU utilization trending
- **Memory Usage:** RAM utilization trending
- **Active Connections:** Database and cache connections
- **Request Rate:** RPS per service

**Key Metrics:**
- `up{job=~".*-service"}` - Service availability
- `node_filesystem_avail_bytes` - Disk space
- `node_cpu_seconds_total` - CPU time
- `node_memory_MemAvailable_bytes` - Available memory

**Alerts Linked:**
- ServiceDown
- DiskSpaceCritical
- HighCPUUsage
- HighMemoryUsage

### 2. Application Performance

**Refresh Rate:** 10 seconds
**Default Time Range:** Last 1 hour

**Panels:**
- **Request Rate (RPS):** Requests per second by service
- **Error Rate:** HTTP 5xx errors as percentage
- **Latency (P50/P95/P99):** Response time percentiles
- **Status Code Distribution:** Breakdown by status
- **Apdex Score:** Application performance index
- **Successful Requests:** Count of 2xx responses

**Key Metrics:**
- `http_requests_total` - Total HTTP requests
- `http_request_duration_seconds` - Request latency histogram
- `http_requests_total{status=~"5.."}` - Server errors

**Alerts Linked:**
- HighErrorRate / HighErrorRateWarning
- APILatencyCritical / APILatencyWarning
- HighRateLimitViolations

### 3. Trading Engine Metrics

**Refresh Rate:** 5 seconds
**Default Time Range:** Last 1 hour

**Panels:**
- **Orders per Minute:** Order throughput
- **Matching Latency (P50/P95/P99):** Engine responsiveness
- **Match Success Rate:** Percentage of orders successfully matched
- **Rejection Rate:** Orders rejected
- **Order Book Depth:** Buy/sell side order count
- **Trade Volume:** TRY volume per hour

**Key Metrics:**
- `orders_created_total` - Total orders
- `orders_matched_total` - Successfully matched
- `matching_engine_latency_seconds` - Engine latency
- `trade_volume_try` - Trading volume

**Alerts Linked:**
- MatchingEngineDown
- MatchingEngineLatencyHigh
- LowOrderMatchSuccessRate
- HighOrderRejectionRate

### 4. Database & Cache Performance

**Refresh Rate:** 1 minute
**Default Time Range:** Last 6 hours

**PostgreSQL Panels:**
- **Query Latency (P50/P95/P99):** Query execution time
- **Connection Pool Usage:** Active connections / max
- **Cache Hit Ratio:** Percentage of heap blocks from cache
- **Slow Queries:** Queries exceeding 100ms
- **Replication Lag:** Time behind primary
- **Table Sizes:** Top tables by size

**Redis Panels:**
- **Memory Usage:** Bytes used / max
- **Operations/sec:** Redis commands per second
- **Hit Rate:** Cache hit percentage
- **Evicted Keys:** Keys evicted due to memory pressure

**Key Metrics:**
- `pg_stat_database_*` - PostgreSQL stats
- `redis_memory_used_bytes` - Redis memory
- `redis_keyspace_hits_total` - Cache hits

**Alerts Linked:**
- DatabaseConnectionPoolExhausted / Warning
- SlowQueriesDetected
- DatabaseReplicationLagCritical
- RedisMemoryCritical / Warning
- RedisCacheHitRateLow

### 5. Business Metrics

**Refresh Rate:** 5 minutes
**Default Time Range:** Last 24 hours

**Panels:**
- **Daily Active Users (DAU):** Unique users in last 24h
- **Monthly Active Users (MAU):** Unique users in last 30d
- **New Registrations (24h):** User signup rate
- **KYC Completion Rate:** Percentage of verified users
- **Trading Volume (24h):** Total TRY volume
- **Fee Revenue (24h):** Fees collected
- **Deposit/Withdrawal Volume:** Net flow

**Key Metrics:**
- `user_login_total` - User logins
- `kyc_status` - KYC application status
- `trade_volume_try` - Trading volume
- `trading_fees_collected_try` - Fee revenue

**Alerts Linked:**
- KYCBacklog
- LowKYCApprovalRate
- LowOrderMatchSuccessRate

### 6. Security & Anomaly Detection

**Refresh Rate:** 1 minute
**Default Time Range:** Last 24 hours

**Panels:**
- **Failed Login Attempts:** Brute-force detection
- **Account Lockouts:** Failed 2FA attempts
- **Rate Limit Violations:** Throttled requests
- **Unusual Trading:** Order pattern anomalies
- **DDoS Indicators:** Traffic spike detection
- **Withdrawal Anomalies:** Unusual withdrawal patterns
- **Geographic Anomalies:** Logins from new locations

**Key Metrics:**
- `auth_failed_login_attempts_total` - Failed logins
- `http_requests_limited_total` - Rate limited requests
- `orders_created_total` - Order volume
- `withdrawals_total` - Withdrawal attempts

**Alerts Linked:**
- DDoSDetected
- SuspiciousLoginAttempts
- UnusualOrderPattern
- HighWithdrawalFailureRate

---

## Alert Configuration

### Alert Severity Levels

**CRITICAL (Page/SMS 24/7)**
- Service down (any component)
- Error rate > 5%
- API latency P99 > 2 seconds
- Database connection pool exhausted
- Matching engine down
- Blockchain node out of sync
- DDoS detected
- Data loss risk

**WARNING (Email/Slack, business hours)**
- Error rate 1-5%
- API latency P95 > 1 second
- Database query latency > 1 second
- CPU > 80% sustained
- Memory > 80% sustained
- Disk space < 20%
- Rate limit violations
- High restart frequency

**INFO (Slack #monitoring channel)**
- Elevated error rate (0.5-1%)
- High resource usage (50-70%)
- KYC backlog building
- Cache hit rate < 70%

### Alert Routing

**Critical Alerts:**
- Immediate PagerDuty page (escalate if no ack in 5 min)
- SMS notification to on-call engineer
- Slack #critical-alerts channel
- Email to team mailing list

**Warnings:**
- Slack #platform-alerts channel
- Email digest (hourly)
- PagerDuty low-urgency (if SLA at risk)

**Info:**
- Slack #monitoring-info channel only

### Managing Alerts

#### Acknowledge an Alert (PagerDuty)

1. Receive page on phone
2. Open PagerDuty mobile app
3. Click "Acknowledge"
4. Investigate using dashboards and logs
5. Resolve incident when fixed

#### Silence an Alert (Prometheus)

For maintenance windows (only in AlertManager UI):

```
# Access AlertManager UI: http://alertmanager:9093
# Click "Silences" → "Create Silence"
# Select alerts to silence
# Set duration (e.g., 2 hours)
# Save silence
```

#### Update Alert Rules

1. Edit rule file: `monitoring/prometheus/rules/critical.yml`
2. Validate YAML syntax
3. Test expressions in Prometheus UI
4. Commit to Git
5. Redeploy Prometheus (config reload)

---

## Health Checks

Every service MUST expose a `/health` endpoint returning:

```json
{
  "status": "ok",
  "timestamp": "2025-11-30T10:30:00Z",
  "version": "1.0.0",
  "dependencies": {
    "database": "ok",
    "redis": "ok",
    "rabbitmq": "ok"
  }
}
```

### Liveness Probe (Kubernetes)

Restarts pod if health check fails 3 times:

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10
  failureThreshold: 3
```

### Readiness Probe (Kubernetes)

Removes pod from load balancer if health check fails:

```yaml
readinessProbe:
  httpGet:
    path: /health/ready
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 5
  failureThreshold: 2
```

### Health Check Implementation

**NestJS Example:**

```typescript
@Get('/health')
@Get('/health/ready')
async health(): Promise<{status: string}> {
  const db = await this.database.ping();
  const redis = await this.redis.ping();

  if (!db || !redis) {
    throw new ServiceUnavailableException();
  }

  return { status: 'ok' };
}
```

---

## Metrics Guide

### Custom Application Metrics

Services should expose metrics following these patterns:

#### Counter (continuously increasing)

```
# Service registration attempts
auth_registration_total{status="success"} 15234
auth_registration_total{status="failure"} 342

# Trading volume
trade_volume_try{symbol="BTC_TRY"} 1523450.50
```

#### Histogram (latency, duration)

```
# HTTP request duration buckets (seconds)
http_request_duration_seconds_bucket{le="0.01"} 234
http_request_duration_seconds_bucket{le="0.05"} 567
http_request_duration_seconds_bucket{le="0.1"} 890
http_request_duration_seconds_bucket{le="1"} 1200
http_request_duration_seconds_bucket{le="+Inf"} 1234

# Sum and count for averaging
http_request_duration_seconds_sum 1234.56
http_request_duration_seconds_count 1234
```

#### Gauge (instantaneous value)

```
# Current number of active orders
orders_active 1234

# Memory usage in bytes
process_resident_memory_bytes 104857600

# Cache hit ratio (0-1)
redis_memory_usage_ratio 0.75
```

### Standard HTTP Metrics

These should be exposed by all HTTP services:

```
http_requests_total{job="auth-service", method="POST", endpoint="/register", status="200"}
http_request_duration_seconds{job="auth-service", method="POST", endpoint="/register"}
http_request_size_bytes{job="auth-service"}
http_response_size_bytes{job="auth-service"}
```

### Recording Rules

Pre-computed metrics available in dashboards:

```
job:http_requests_per_second        # RPS by service
job:http_error_rate                 # 5xx error % by service
job:http_request_duration_p95       # P95 latency by service
job:pg_connection_pool_usage        # DB pool usage %
job:redis_hit_rate                  # Cache hit % by service
job:dau                             # Daily active users
job:mau                             # Monthly active users
```

---

## Troubleshooting

### Prometheus

#### Issue: Dashboard shows "No data"

**Solutions:**
1. Verify Prometheus is scraping targets:
   - Visit http://prometheus:9090/targets
   - Check if target shows "UP"

2. Check metric names match dashboard queries:
   - Visit http://prometheus:9090/graph
   - Enter metric name and click "Execute"
   - If no results, metric isn't being exposed

3. Verify service `/metrics` endpoint:
   ```bash
   curl http://auth-service:3000/metrics
   # Should return Prometheus format metrics
   ```

4. Check Prometheus logs:
   ```bash
   docker logs exchange_prometheus | grep error
   ```

#### Issue: Alerts not firing

**Solutions:**
1. Verify alert rule syntax at http://prometheus:9090/alerts
2. Test PromQL expression in Graph tab
3. Check alert `for` duration - must wait before firing
4. Verify alert condition is actually occurring
5. Reload Prometheus configuration

#### Issue: High memory usage

**Solutions:**
1. Reduce retention: `--storage.tsdb.retention.time=7d`
2. Increase scrape interval (trade-off with freshness)
3. Drop unnecessary metrics using relabel_configs
4. Implement recording rules to pre-compute queries

### Grafana

#### Issue: Can't authenticate

**Solutions:**
1. Reset admin password:
   ```bash
   docker exec exchange_grafana grafana-cli admin reset-admin-password newpassword
   ```

2. Check LDAP/OAuth config in `/etc/grafana/grafana.ini`

#### Issue: Dashboard panels are slow

**Solutions:**
1. Increase dashboard refresh interval
2. Use recording rules instead of complex PromQL
3. Limit time range in visualizations
4. Implement dashboard caching

### AlertManager

#### Issue: Alerts not reaching Slack

**Solutions:**
1. Verify webhook URL in `alertmanager.yml`:
   ```yaml
   slack_api_url: 'https://hooks.slack.com/...'
   ```

2. Check Slack channel exists and bot has permissions

3. View AlertManager logs:
   ```bash
   docker logs exchange_alertmanager | grep -i slack
   ```

4. Test webhook manually:
   ```bash
   curl -X POST -d '{"text":"test"}' YOUR_SLACK_WEBHOOK
   ```

#### Issue: Alert storm / duplicate alerts

**Solutions:**
1. Increase `group_wait` in alertmanager.yml
2. Implement alert inhibition rules
3. Group alerts by service/severity
4. Review alert thresholds

---

## Maintenance

### Daily Tasks

- [ ] Check dashboard for any red/critical alerts
- [ ] Review service health status
- [ ] Verify backup jobs completed
- [ ] Check disk space usage

### Weekly Tasks

- [ ] Review alert rules and adjust thresholds if needed
- [ ] Analyze error logs for patterns
- [ ] Check database performance stats
- [ ] Update Grafana dashboards if needed

### Monthly Tasks

- [ ] Rebaseline performance metrics
- [ ] Review and archive old alerts
- [ ] Update runbooks and documentation
- [ ] Capacity planning review
- [ ] Security audit of monitoring access

### Quarterly Tasks

- [ ] Upgrade Prometheus, Grafana, AlertManager
- [ ] Review retention policies
- [ ] Disaster recovery drill
- [ ] Team training on monitoring tools

---

## On-Call Runbooks

See [RUNBOOKS.md](./RUNBOOKS.md) for step-by-step guides to resolve critical alerts.

### Critical Alert Runbooks

1. **Service Down** → RUNBOOKS.md#service-down
2. **High Error Rate** → RUNBOOKS.md#high-error-rate
3. **Database Connection Pool** → RUNBOOKS.md#db-connection-pool
4. **Matching Engine Down** → RUNBOOKS.md#matching-engine-down
5. **DDoS Detected** → RUNBOOKS.md#ddos-detected
6. **Disk Space Critical** → RUNBOOKS.md#disk-space-critical

---

## Monitoring Best Practices

1. **Alert Fatigue Prevention**
   - Only page for truly critical issues
   - Tune thresholds based on baseline
   - Use escalation policies

2. **Metric Naming**
   - Use consistent prefixes (e.g., `auth_`, `trading_`)
   - Include unit in metric name
   - Use labels for dimensions

3. **Dashboard Design**
   - Group related panels together
   - Use consistent color schemes
   - Provide context with annotations
   - Link to runbooks

4. **Alert Management**
   - Document each alert's purpose
   - Define clear escalation paths
   - Regular review and tuning
   - Keep runbooks updated

5. **Data Retention**
   - Balance retention with storage cost
   - Archive old data to cold storage
   - Implement sampling for high-cardinality metrics

---

## Support & Escalation

### Slack Channels

- **#monitoring** - General monitoring discussions
- **#critical-alerts** - Critical alerts (on-call only)
- **#platform-alerts** - Warning alerts
- **#monitoring-info** - Info notifications

### Escalation Policy

1. **On-Call Engineer** (< 5 min) - Page via PagerDuty
2. **SRE Lead** (15 min no ack) - Escalate in PagerDuty
3. **Platform Team Lead** (30 min) - Call directly
4. **CTO** (1 hour) - Final escalation

### External Support

- **Prometheus Issues** → prometheus.io support
- **Grafana Issues** → grafana.com support
- **Cloud Infrastructure** → AWS/GCP support

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-30 | DevOps | Initial production setup |

---

**Owner:** DevOps / SRE Team
**Review Date:** 2025-12-30
**Last Updated:** 2025-11-30
