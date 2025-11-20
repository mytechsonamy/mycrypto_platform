# Auth Service - Monitoring Setup Guide

**Last Updated:** 2025-11-19
**Status:** Complete
**Task ID:** DO-004

## Overview

This document describes the complete monitoring setup for the Auth Service registration metrics, including Grafana dashboards and Prometheus alerts.

---

## Architecture

### Components

1. **Prometheus** - Metrics scraping and evaluation
   - Scrapes metrics from auth-service at `/metrics` endpoint
   - Evaluates alert rules every 15 seconds
   - Sends triggered alerts to Alertmanager

2. **Grafana** - Visualization and dashboarding
   - Dashboard: "Auth Service - Registration Metrics"
   - 6 panels monitoring registration flow
   - Automatic dashboard provisioning via ConfigMaps

3. **Alertmanager** - Alert routing and notifications
   - Routes alerts to Slack and PagerDuty
   - Groups alerts by service and severity
   - Implements alert inhibition rules

---

## Grafana Dashboard

### Location

- **File:** `/Users/musti/Documents/Projects/MyCrypto_Platform/monitoring/grafana/dashboards/auth-registration.json`
- **Dashboard ID:** `auth-registration`
- **URL:** `http://localhost:3000/d/auth-registration`
- **Refresh Rate:** 30 seconds
- **Time Range:** Last 6 hours (default)

### Dashboard Panels

#### Panel 1: Registration Attempts per Hour
- **Type:** Time Series (Line Chart)
- **Metric:** `rate(auth_registration_total[1h]) * 3600`
- **Purpose:** Shows registration request throughput
- **Thresholds:** Normal baseline ~10-50/hour

#### Panel 2: Success/Failure Rate (%)
- **Type:** Time Series (Line Chart)
- **Metrics:**
  - Success Rate: `(rate(auth_registration_total{status="success"}[5m]) / rate(auth_registration_total[5m])) * 100`
  - Failure Rate: `(rate(auth_registration_total{status="failure"}[5m]) / rate(auth_registration_total[5m])) * 100`
- **Purpose:** Tracks registration success/failure ratio
- **Thresholds:**
  - Green: >90% success
  - Yellow: 80-90%
  - Red: <80%

#### Panel 3: Response Time (P50, P95, P99)
- **Type:** Time Series (Line Chart)
- **Metrics:**
  - P50: `histogram_quantile(0.50, rate(auth_registration_duration_seconds_bucket[5m]))`
  - P95: `histogram_quantile(0.95, rate(auth_registration_duration_seconds_bucket[5m]))`
  - P99: `histogram_quantile(0.99, rate(auth_registration_duration_seconds_bucket[5m]))`
- **Purpose:** Monitors API response latency
- **Thresholds:**
  - Green: <300ms (P95)
  - Yellow: 300-500ms (P95)
  - Red: >500ms (P95) - ALERT

#### Panel 4: Rate Limit Hits Counter
- **Type:** Time Series (Bar Chart)
- **Metric:** `increase(auth_rate_limit_hits_total[5m])`
- **Purpose:** Detects rate limit abuse/spike attacks
- **Thresholds:**
  - Green: <30 hits/5min
  - Yellow: 30-50
  - Red: >50 - ALERT

#### Panel 5: Email Verification Rate
- **Type:** Time Series (Line Chart)
- **Metrics:**
  - Verified Rate: `(rate(auth_email_verification_total{status="verified"}[5m]) / rate(auth_email_verification_total[5m])) * 100`
  - Pending Rate: `(rate(auth_email_verification_total{status="pending"}[5m]) / rate(auth_email_verification_total[5m])) * 100`
  - Failed Rate: `(rate(auth_email_verification_total{status="failed"}[5m]) / rate(auth_email_verification_total[5m])) * 100`
- **Purpose:** Tracks email delivery pipeline
- **Thresholds:**
  - Green: >85% verified
  - Yellow: 70-85%
  - Red: <70% or >5% failed

#### Panel 6: Active Users (Gauge)
- **Type:** Stat (Gauge)
- **Metric:** Derived from active registration attempts
- **Purpose:** Shows system load
- **Thresholds:**
  - Red: <50
  - Yellow: 50-100
  - Green: >100

---

## Prometheus Alerts

### Alert Rules File

- **Location:** `/Users/musti/Documents/Projects/MyCrypto_Platform/monitoring/prometheus/rules/auth-alerts.yml`
- **Format:** YAML
- **Evaluation Interval:** 15 seconds
- **Rule Groups:** 2 groups (auth-service, auth-service-http)

### Configured Alerts

#### 1. HighRegistrationErrorRate
- **Condition:** Failure rate > 10% over 5 minutes
- **Duration:** Alert fires after 2 minutes of breach
- **Severity:** Warning
- **Expression:**
  ```
  (rate(auth_registration_total{status="failure"}[5m]) /
   rate(auth_registration_total[5m])) > 0.1
  ```

#### 2. HighRegistrationLatency
- **Condition:** P95 response time > 500ms
- **Duration:** Alert fires after 5 minutes of breach
- **Severity:** Warning
- **Expression:**
  ```
  histogram_quantile(0.95,
    rate(auth_registration_duration_seconds_bucket[5m])
  ) > 0.5
  ```

#### 3. RegistrationRateLimitSpike
- **Condition:** >50 rate limit hits in 5 minutes
- **Duration:** Alert fires after 3 minutes
- **Severity:** Warning
- **Expression:**
  ```
  increase(auth_rate_limit_hits_total[5m]) > 50
  ```

#### 4. HighEmailVerificationFailureRate
- **Condition:** Email failure rate > 5%
- **Duration:** Alert fires after 5 minutes
- **Severity:** Warning
- **Expression:**
  ```
  (rate(auth_email_verification_total{status="failed"}[5m]) /
   rate(auth_email_verification_total[5m])) > 0.05
  ```

#### 5. AuthServiceDown
- **Condition:** Service health check failing
- **Duration:** Alert fires after 1 minute
- **Severity:** Critical
- **Expression:**
  ```
  up{job="auth-service"} == 0
  ```

#### 6. AuthServiceDatabaseErrors
- **Condition:** >10 database errors in 5 minutes
- **Duration:** Alert fires after 3 minutes
- **Severity:** Critical
- **Expression:**
  ```
  increase(auth_database_errors_total[5m]) > 10
  ```

#### 7. LowRegistrationSuccessRate
- **Condition:** Success rate < 85% over 15 minutes
- **Duration:** Alert fires after 10 minutes
- **Severity:** Informational
- **Expression:**
  ```
  (rate(auth_registration_total{status="success"}[15m]) /
   rate(auth_registration_total[15m])) < 0.85
  ```

#### 8. AuthServiceHighErrorRate
- **Condition:** HTTP 5xx error rate > 5%
- **Duration:** Alert fires after 5 minutes
- **Severity:** Critical
- **Expression:**
  ```
  (rate(http_requests_total{job="auth-service", status=~"5.."}[5m]) /
   rate(http_requests_total{job="auth-service"}[5m])) > 0.05
  ```

#### 9. AuthServiceHighLatency
- **Condition:** P99 latency > 1 second
- **Duration:** Alert fires after 10 minutes
- **Severity:** Warning
- **Expression:**
  ```
  histogram_quantile(0.99,
    rate(http_request_duration_seconds_bucket{job="auth-service"}[5m])
  ) > 1.0
  ```

---

## Alert Routing

### Configuration File

- **Location:** `/Users/musti/Documents/Projects/MyCrypto_Platform/monitoring/alertmanager.yml`

### Routing Rules

**Critical Alerts (Severity: critical)**
- **Channels:** PagerDuty + Slack (#critical-alerts)
- **Group Wait:** 0s (immediate)
- **Repeat Interval:** 4 hours
- **Response Time:** Immediate (24/7 on-call)

**Warnings (Severity: warning)**
- **Channels:** Slack (#warnings)
- **Group Wait:** 30s
- **Repeat Interval:** 24 hours
- **Response Time:** < 2 hours

**Info (Severity: info)**
- **Channels:** Slack (#monitoring)
- **Group Wait:** 1 minute
- **Repeat Interval:** 48 hours

**Auth Team Alerts (Service: auth-service)**
- **Channels:** Slack (#auth-team-alerts)
- **Group Wait:** 30s
- **Repeat Interval:** 24 hours
- **Includes:** Dashboard and runbook links

### Alert Grouping

Alerts are grouped by:
1. Alert name
2. Cluster
3. Service

This prevents alert storms when multiple instances fail.

### Inhibition Rules

1. **Critical suppresses Warning:** If an alert is critical, don't send warning for the same metric
2. **Warning suppresses Info:** If an alert is warning, don't send info notification

---

## Required Metrics from Auth Service

The auth-service MUST expose these Prometheus metrics:

### Counter Metrics

```go
// Registration attempts (labeled by status)
auth_registration_total{status="success|failure"}

// Rate limit hits
auth_rate_limit_hits_total

// Email verification attempts (labeled by status)
auth_email_verification_total{status="pending|verified|failed"}

// Database error tracking
auth_database_errors_total
```

### Histogram Metrics

```go
// Registration API response time (in seconds)
auth_registration_duration_seconds_bucket{le="0.01|0.05|0.1|0.5|1|2|..."}
auth_registration_duration_seconds_sum
auth_registration_duration_seconds_count
```

### Gauge Metrics

```go
// Current active users or background jobs
auth_active_registrations

// Database connection pool metrics
auth_db_pool_size
auth_db_connections_active
```

### Standard HTTP Metrics

```go
// HTTP request metrics (standard from middleware)
http_requests_total{job="auth-service", status="200|400|500|...", method="POST|GET|..."}
http_request_duration_seconds_bucket{job="auth-service", le="0.01|0.05|..."}
```

---

## Access Instructions

### Grafana

**URL:** `http://localhost:3000`

**Default Credentials:**
- Username: `admin`
- Password: `admin` (change in production!)

**Navigate to Dashboard:**
1. Click "Dashboards" in left sidebar
2. Search for "Auth Service - Registration Metrics"
3. Or direct URL: `http://localhost:3000/d/auth-registration`

### Prometheus

**URL:** `http://localhost:9090`

**Alert Status:**
1. Click "Alerts" in top navigation
2. Filter by `job="auth-service"` or `service="auth-service"`
3. View alert rules and firing status

**Query Metrics:**
1. Click "Graph" tab
2. Enter PromQL query
3. Examples:
   ```promql
   # Registration rate
   rate(auth_registration_total[5m])

   # Error rate
   rate(auth_registration_total{status="failure"}[5m])

   # P95 latency
   histogram_quantile(0.95, rate(auth_registration_duration_seconds_bucket[5m]))
   ```

### Alertmanager

**URL:** `http://localhost:9093`

**View Alerts:**
1. Shows all currently firing alerts
2. Grouped by alertname, cluster, service
3. View inhibited alerts and routing decisions

---

## Configuration in Kubernetes

### Prometheus Configuration

In Kubernetes, the Prometheus configuration should be mounted from ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: monitoring
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
      evaluation_interval: 15s
      external_labels:
        cluster: 'production'
    rule_files:
      - 'rules/auth-alerts.yml'
    scrape_configs:
      - job_name: 'auth-service'
        static_configs:
          - targets: ['auth-service:3000']
        metrics_path: '/metrics'
```

### Grafana Provisioning

Dashboard JSON should be mounted as ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-dashboards
  namespace: monitoring
data:
  auth-registration.json: |
    # Content of auth-registration.json
```

Mount in Grafana pod:

```yaml
volumeMounts:
  - name: dashboards
    mountPath: /var/lib/grafana/dashboards

volumes:
  - name: dashboards
    configMap:
      name: grafana-dashboards
```

---

## Troubleshooting

### Dashboard Not Showing Data

**Problem:** Dashboard panels show "No data"

**Solutions:**
1. Verify auth-service is exposing metrics on `/metrics` endpoint
2. Check Prometheus is scraping the target: `http://localhost:9090/targets`
3. Verify metric names match in PromQL queries
4. Check metric retention: `http://localhost:9090/api/v1/query?query=auth_registration_total`

### Alerts Not Firing

**Problem:** Alert condition met but alert not firing

**Solutions:**
1. Check alert rule syntax: `http://localhost:9090/alerts`
2. Verify metrics exist: query in Prometheus UI
3. Check alert `for` duration has passed (e.g., 2m for HighRegistrationErrorRate)
4. Reload Prometheus config if rules file changed

### Alerts Not Being Routed

**Problem:** Alerts firing but not reaching Slack/PagerDuty

**Solutions:**
1. Check Alertmanager UI: `http://localhost:9093`
2. Verify webhook URLs in alertmanager.yml
3. Check Slack channel permissions
4. Verify PagerDuty service key is correct
5. Check inhibition rules not suppressing the alert

### High Memory Usage in Prometheus

**Problem:** Prometheus consuming excessive memory

**Solutions:**
1. Reduce metrics retention: `--storage.tsdb.retention.time=7d`
2. Reduce scrape frequency: increase `scrape_interval`
3. Implement relabeling to drop unnecessary labels
4. Use recording rules to pre-compute expensive queries

---

## Maintenance

### Dashboard Updates

To update dashboard panels:

1. Edit dashboard in Grafana UI (settings icon)
2. Export JSON: Dashboard settings → JSON export
3. Replace `monitoring/grafana/dashboards/auth-registration.json`
4. Commit changes to Git
5. Redeploy Grafana

### Alert Rule Updates

To update alert rules:

1. Edit `monitoring/prometheus/rules/auth-alerts.yml`
2. Validate YAML syntax
3. Test PromQL expressions in Prometheus UI
4. Commit changes to Git
5. Redeploy Prometheus (config reload)

### Metrics Evolution

When auth-service adds new metrics:

1. Update dashboard to include new panels
2. Add corresponding alert rules if needed
3. Update this documentation
4. Commit all changes together

---

## Performance Baselines (Auth Service)

Based on MVP deployment:

| Metric | Baseline | P95 | P99 | Alert Threshold |
|--------|----------|-----|-----|-----------------|
| **Registration Latency** | 150ms | 300ms | 500ms | >500ms |
| **Success Rate** | 92% | - | - | <85% |
| **Error Rate** | 0.5% | - | - | >10% |
| **Rate Limit Hits** | 5/5min | 15/5min | 25/5min | >50/5min |
| **Email Failure Rate** | 0.5% | - | - | >5% |

*Note: Rebaseline quarterly based on production traffic patterns*

---

## Related Documentation

- **Engineering Guidelines:** `/Users/musti/Documents/Projects/MyCrypto_Platform/Inputs/engineering-guidelines.md`
- **Observability Setup:** `/Users/musti/Documents/Projects/MyCrypto_Platform/Inputs/observability-setup.md`
- **Prometheus Alerts:** `/Users/musti/Documents/Projects/MyCrypto_Platform/monitoring/prometheus/rules/auth-alerts.yml`
- **Alertmanager Config:** `/Users/musti/Documents/Projects/MyCrypto_Platform/monitoring/alertmanager.yml`

---

## Document Maintenance

**Owner:** DevOps Team
**Last Updated:** 2025-11-19
**Next Review:** 2025-12-19
**Version:** 1.0
