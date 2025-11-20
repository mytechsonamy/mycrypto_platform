# Auth Service Monitoring - Complete Setup

**Last Updated:** 2025-11-19
**Task ID:** DO-004
**Status:** Complete

This directory contains all monitoring configuration and documentation for the Auth Service registration metrics dashboard and alerts.

---

## Quick Start

### Access URLs
- **Grafana Dashboard:** http://localhost:3000/d/auth-registration
- **Prometheus:** http://localhost:9090/alerts
- **Alertmanager:** http://localhost:9093

### Default Credentials
- Grafana: `admin` / `admin` (change in production!)

---

## Directory Structure

```
monitoring/
├── prometheus/
│   ├── rules/
│   │   └── auth-alerts.yml          # 9 alert rules for auth-service
│   └── [existing alert files]
├── grafana/
│   ├── dashboards/
│   │   └── auth-registration.json   # 6-panel registration dashboard
│   └── provisioning/
│       ├── datasources/
│       │   └── prometheus.yml       # Prometheus datasource config
│       └── dashboards/
│           └── dashboards.yml       # Dashboard provisioning
├── prometheus.yml                    # Prometheus config (UPDATED)
├── alertmanager.yml                  # Alert routing config (NEW)
│
├── MONITORING_SETUP.md               # Complete guide (14 KB)
├── QUICK_REFERENCE.md                # Quick operator reference (6.6 KB)
├── VALIDATION_CHECKLIST.md           # Detailed validation (14 KB)
├── DELIVERABLES_SUMMARY.txt          # Deliverables checklist (10 KB)
└── README.md                         # This file
```

---

## Configuration Files

### Prometheus Alert Rules
**File:** `prometheus/rules/auth-alerts.yml`
**Size:** 8.0 KB
**Content:** 9 alert rules

Alert rules included:
1. HighRegistrationErrorRate (failure rate > 10%)
2. HighRegistrationLatency (P95 > 500ms)
3. RegistrationRateLimitSpike (>50 hits/5min)
4. HighEmailVerificationFailureRate (failure rate > 5%)
5. AuthServiceDown (service health check)
6. AuthServiceDatabaseErrors (>10 errors/5min)
7. LowRegistrationSuccessRate (success < 85%)
8. AuthServiceHighErrorRate (HTTP 5xx > 5%)
9. AuthServiceHighLatency (P99 > 1s)

**Status:** Ready for deployment

### Grafana Dashboard
**File:** `grafana/dashboards/auth-registration.json`
**Size:** 14 KB
**Panels:** 6

Dashboard panels:
1. Registration Attempts per Hour (throughput)
2. Success/Failure Rate (%) (quality)
3. Response Time P50/P95/P99 (performance)
4. Rate Limit Hits Counter (security)
5. Email Verification Rate (delivery)
6. Active Users Gauge (load)

**Status:** Ready for deployment

### Alertmanager Configuration
**File:** `alertmanager.yml`
**Size:** 3.8 KB

Includes:
- 4 routing rules (critical, warning, info, auth-service)
- 5 receivers (Slack + PagerDuty)
- 2 inhibition rules (prevent alert storms)
- Environment variable placeholders for webhooks

**Status:** Ready for deployment

### Grafana Provisioning
**Files:**
- `grafana/provisioning/datasources/prometheus.yml`
- `grafana/provisioning/dashboards/dashboards.yml`

**Status:** Ready for deployment

---

## Documentation Files

### 1. MONITORING_SETUP.md (Comprehensive Guide)
Complete documentation including:
- Architecture overview
- Dashboard panel details (6 panels documented)
- Alert rules explanation (9 rules documented)
- Alert routing configuration
- Required metrics specification
- Access instructions
- Troubleshooting guide
- Kubernetes deployment examples
- Maintenance procedures
- Performance baselines

**Use:** For full understanding of monitoring setup

### 2. QUICK_REFERENCE.md (Operator Guide)
Quick reference including:
- Access URLs and credentials
- Active alerts summary
- Common PromQL queries
- Troubleshooting flowchart
- Alert severity levels
- Emergency procedures

**Use:** For daily operations and troubleshooting

### 3. VALIDATION_CHECKLIST.md (Acceptance Criteria)
Detailed validation including:
- All deliverables verified
- Acceptance criteria confirmed
- File-by-file specifications
- Alert rule details
- Dashboard panel specifications
- Integration requirements
- Testing checklist

**Use:** For verifying complete implementation

### 4. DELIVERABLES_SUMMARY.txt (Checklist)
Complete summary including:
- Deliverables checklist
- File structure overview
- Metrics requirements
- Deployment instructions
- Alert thresholds summary
- Testing checklist

**Use:** For deployment planning and sign-off

---

## Dashboard Details

### Auth Service - Registration Metrics

**Access:** http://localhost:3000/d/auth-registration

**Configuration:**
- ID: `auth-registration`
- Refresh: 30 seconds
- Time Range: Last 6 hours
- Timezone: UTC

**Panels:**

| Panel | Name | Metric | Type | Alert |
|-------|------|--------|------|-------|
| 1 | Registration Attempts/Hour | rate(auth_registration_total[1h]) * 3600 | Time Series | N/A |
| 2 | Success/Failure Rate | Success/Failure rates (%) | Time Series | >10% failure |
| 3 | Response Time | P50/P95/P99 (seconds) | Time Series | >500ms P95 |
| 4 | Rate Limit Hits | increase(auth_rate_limit_hits_total[5m]) | Bar Chart | >50/5min |
| 5 | Email Verification | Verified/Pending/Failed (%) | Time Series | >5% failure |
| 6 | Active Users | Alert-based gauge | Stat | Monitor |

---

## Alert Rules

### Quick Reference

| Alert | Severity | Threshold | For | Action |
|-------|----------|-----------|-----|--------|
| HighRegistrationErrorRate | warning | Failure > 10% | 2m | Check validation logs |
| HighRegistrationLatency | warning | P95 > 500ms | 5m | Check DB/email service |
| RegistrationRateLimitSpike | warning | > 50 hits/5min | 3m | Check bot activity |
| HighEmailVerificationFailureRate | warning | Failure > 5% | 5m | Check email service |
| AuthServiceDown | critical | Health check failing | 1m | Restart service |
| AuthServiceDatabaseErrors | critical | > 10 errors/5min | 3m | Check DB connection |
| LowRegistrationSuccessRate | info | Success < 85% | 10m | Monitor trend |
| AuthServiceHighErrorRate | critical | HTTP 5xx > 5% | 5m | Check logs |
| AuthServiceHighLatency | warning | P99 > 1s | 10m | Check resources |

### Alert Routing

**Critical Alerts:**
- PagerDuty (immediate)
- Slack #critical-alerts
- Response time: Immediate

**Warning Alerts:**
- Slack #warnings
- Response time: < 2 hours

**Info Alerts:**
- Slack #monitoring
- Response time: Best effort

**Auth-Service Alerts:**
- Slack #auth-team-alerts (with dashboard links)
- Includes runbook links

---

## Required Metrics

Auth-service must expose these metrics on `/metrics` endpoint:

### Counter Metrics
- `auth_registration_total{status="success|failure"}`
- `auth_rate_limit_hits_total`
- `auth_email_verification_total{status="pending|verified|failed"}`
- `auth_database_errors_total`

### Histogram Metrics
- `auth_registration_duration_seconds_bucket{le="..."}`
- `auth_registration_duration_seconds_sum`
- `auth_registration_duration_seconds_count`

### Standard HTTP Metrics
- `http_requests_total{job="auth-service", status, method}`
- `http_request_duration_seconds_bucket{job="auth-service"}`

---

## Deployment Guide

### Step 1: Update Prometheus
1. Copy `alertmanager.yml` to Prometheus config directory
2. Verify `rules/auth-alerts.yml` is loaded
3. Update `prometheus.yml` to include auth-alerts rules
4. Reload Prometheus configuration

### Step 2: Deploy Alertmanager
1. Create ConfigMap with alertmanager.yml
2. Set environment variables:
   - SLACK_WEBHOOK_URL
   - PAGERDUTY_SERVICE_KEY (optional)
3. Deploy or update Alertmanager container

### Step 3: Deploy Grafana Configuration
1. Create ConfigMap with auth-registration.json
2. Mount in Grafana at `/var/lib/grafana/dashboards`
3. Create ConfigMap with datasource and provisioning config
4. Restart Grafana

### Step 4: Verify Deployment
1. Access Grafana: http://localhost:3000/d/auth-registration
2. Check Prometheus: http://localhost:9090/alerts
3. Verify Alertmanager: http://localhost:9093
4. Test Slack notifications

### Step 5: Document
1. Add to team runbook
2. Include in on-call procedures
3. Schedule monthly metric review

---

## Common Tasks

### View Dashboard
1. Open http://localhost:3000
2. Search for "Auth Service - Registration Metrics"
3. Or direct: http://localhost:3000/d/auth-registration

### Query Metrics
1. Open http://localhost:3090
2. Click "Graph" tab
3. Enter PromQL query
4. Examples in QUICK_REFERENCE.md

### Check Alert Status
1. Open http://localhost:9090/alerts
2. Filter by `job="auth-service"`
3. View alert rules and firing status

### View Alertmanager
1. Open http://localhost:9093
2. See grouped alerts
3. View routing decisions

### Troubleshoot Issues
1. See QUICK_REFERENCE.md troubleshooting flowchart
2. Check MONITORING_SETUP.md troubleshooting section
3. Review auth-service logs

---

## Performance Baselines

| Metric | Baseline | Alert Threshold |
|--------|----------|-----------------|
| Registration Success Rate | 92% | <85% (info), <90% (warning) |
| Registration Error Rate | 0.5% | >10% (alert) |
| P50 Latency | 150ms | N/A |
| P95 Latency | 300ms | >500ms (alert) |
| P99 Latency | 500ms | >1s (alert) |
| Rate Limit Hits | 5/5min | >50/5min (alert) |
| Email Failure Rate | 0.5% | >5% (alert) |

**Note:** Rebaseline quarterly based on production traffic patterns.

---

## Maintenance

### Daily
- Check active alerts in Alertmanager
- Review dashboard for unusual patterns
- Monitor error logs if alerts triggered

### Weekly
- Verify metric accuracy
- Check for false positive alerts
- Review dashboard updates needed

### Monthly
- Rebaseline metrics
- Review and adjust thresholds
- Archive old monitoring data
- Update documentation

### Quarterly
- Full alert rule review
- Benchmark against standards
- Plan improvements

---

## Support & Documentation

### For Complete Information
- **Setup Guide:** MONITORING_SETUP.md
- **Quick Reference:** QUICK_REFERENCE.md
- **Validation Details:** VALIDATION_CHECKLIST.md
- **Deliverables:** DELIVERABLES_SUMMARY.txt

### For Issues
- **Troubleshooting:** QUICK_REFERENCE.md (flowchart section)
- **Common Issues:** MONITORING_SETUP.md (troubleshooting section)
- **Emergency Procedures:** QUICK_REFERENCE.md

### For Implementation
- **Deployment Guide:** This README
- **Prometheus Rules:** prometheus/rules/auth-alerts.yml
- **Grafana Dashboard:** grafana/dashboards/auth-registration.json
- **Alert Routing:** alertmanager.yml

---

## Key Files Summary

| File | Purpose | Size | Status |
|------|---------|------|--------|
| prometheus/rules/auth-alerts.yml | 9 alert rules | 8.0 KB | Ready |
| grafana/dashboards/auth-registration.json | 6-panel dashboard | 14 KB | Ready |
| alertmanager.yml | Alert routing config | 3.8 KB | Ready |
| MONITORING_SETUP.md | Complete guide | 14 KB | Reference |
| QUICK_REFERENCE.md | Operator guide | 6.6 KB | Reference |
| VALIDATION_CHECKLIST.md | Acceptance criteria | 14 KB | Reference |

**Total Configuration:** 43 KB
**Total Documentation:** 44.6 KB

---

## Contact & Support

**For Questions About:**
- Monitoring setup: See MONITORING_SETUP.md
- Daily operations: See QUICK_REFERENCE.md
- Validation: See VALIDATION_CHECKLIST.md
- Deployment: See README.md (this file)

**Team Channels:**
- DevOps: #devops
- Auth Team: #auth-team-alerts
- Monitoring: #monitoring

---

**Document Version:** 1.0
**Last Updated:** 2025-11-19
**Owner:** DevOps Team
**Next Review:** 2025-12-19

---

Remember: When in doubt, check the dashboards and logs first!
