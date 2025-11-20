# Auth Service Monitoring - Quick Reference

**Last Updated:** 2025-11-19

---

## Quick Links

| Service | URL | Default Credentials |
|---------|-----|-------------------|
| Grafana | http://localhost:3000 | admin / admin |
| Prometheus | http://localhost:9090 | (no auth) |
| Alertmanager | http://localhost:9093 | (no auth) |

---

## Dashboards

### Auth Service - Registration Metrics
- **URL:** http://localhost:3000/d/auth-registration
- **Refresh:** 30 seconds
- **Panels:** 6 (throughput, success rate, latency, rate limits, email, active users)

---

## Active Alerts

### Critical Alerts (Requires Immediate Action)

| Alert | Threshold | Impact |
|-------|-----------|--------|
| AuthServiceDown | Service health check failing | Users cannot register/login |
| AuthServiceHighErrorRate | HTTP 5xx > 5% | API errors affecting users |
| AuthServiceDatabaseErrors | > 10 DB errors in 5 min | Database connectivity issues |

### Warning Alerts (Requires Investigation)

| Alert | Threshold | Action |
|-------|-----------|--------|
| HighRegistrationErrorRate | Failure rate > 10% | Check validation logs |
| HighRegistrationLatency | P95 response > 500ms | Check database/email service |
| RegistrationRateLimitSpike | > 50 hits in 5 min | Check for bot activity |
| HighEmailVerificationFailureRate | Failure rate > 5% | Check email service provider |
| AuthServiceHighLatency | P99 > 1 second | Check resource utilization |

### Info Alerts (Monitor)

| Alert | Threshold |
|-------|-----------|
| LowRegistrationSuccessRate | Success rate < 85% |

---

## Common Queries (Prometheus)

### Throughput
```promql
# Registrations per second
rate(auth_registration_total[5m])

# Registrations per hour (approximation)
rate(auth_registration_total[1h]) * 3600
```

### Success/Failure Rates
```promql
# Success rate (%)
(rate(auth_registration_total{status="success"}[5m]) / rate(auth_registration_total[5m])) * 100

# Failure rate (%)
(rate(auth_registration_total{status="failure"}[5m]) / rate(auth_registration_total[5m])) * 100
```

### Latency
```promql
# P50 (median)
histogram_quantile(0.50, rate(auth_registration_duration_seconds_bucket[5m]))

# P95
histogram_quantile(0.95, rate(auth_registration_duration_seconds_bucket[5m]))

# P99
histogram_quantile(0.99, rate(auth_registration_duration_seconds_bucket[5m]))
```

### Rate Limiting
```promql
# Rate limit hits in 5 minutes
increase(auth_rate_limit_hits_total[5m])

# Rate limit hit rate (per second)
rate(auth_rate_limit_hits_total[5m])
```

### Email Verification
```promql
# Verification rate (%)
(rate(auth_email_verification_total{status="verified"}[5m]) / rate(auth_email_verification_total[5m])) * 100

# Failed verification rate (%)
(rate(auth_email_verification_total{status="failed"}[5m]) / rate(auth_email_verification_total[5m])) * 100
```

---

## Troubleshooting Flowchart

```
Issue: Dashboard showing "No data"
├─ Check Prometheus targets: /targets
├─ Check metric names in queries
├─ Check auth-service is running and exposing /metrics
└─ Verify metrics are being scraped

Issue: Alert firing but no notification
├─ Check Alertmanager UI: /alerts
├─ Verify webhook URLs
├─ Check Slack channel permissions
├─ Verify PagerDuty service key
└─ Check inhibition rules not suppressing alert

Issue: High latency alert
├─ Check database query performance
├─ Check email service response time
├─ Check Redis cache hit rate
├─ Check CPU/memory utilization
└─ Review recent code changes

Issue: High error rate alert
├─ Check error logs: kubectl logs -l app=auth-service
├─ Check database connectivity
├─ Check Redis cache availability
├─ Check external service dependencies
└─ Review recent deployments
```

---

## Alert Severity & Response Times

| Severity | Notification | Response Time | Who |
|----------|--------------|---------------|-----|
| Critical | PagerDuty + Slack | Immediate | On-call engineer |
| Warning | Slack #warnings | < 2 hours | Team lead |
| Info | Slack #monitoring | Best effort | Monitoring team |

---

## Files Location

| File | Purpose |
|------|---------|
| `monitoring/grafana/dashboards/auth-registration.json` | Dashboard definition |
| `monitoring/prometheus/rules/auth-alerts.yml` | Alert rules (9 rules) |
| `monitoring/alertmanager.yml` | Alert routing configuration |
| `monitoring/MONITORING_SETUP.md` | Complete documentation |
| `monitoring/VALIDATION_CHECKLIST.md` | Acceptance criteria verification |

---

## Maintenance Tasks

### Daily
- Monitor active alerts in Alertmanager
- Check Grafana dashboard for unusual patterns
- Review error logs if any warnings triggered

### Weekly
- Review alert frequency (false positives?)
- Check dashboard data accuracy
- Verify auth-service metrics are being scraped

### Monthly
- Re-baseline performance metrics
- Review and update alert thresholds if needed
- Archive old logs from monitoring stack

---

## Emergency Procedures

### If Auth Service is Down
1. Check service pods: `kubectl get pods -l app=auth-service`
2. Check service logs: `kubectl logs -l app=auth-service --tail=100`
3. Check database connection: Can other services connect?
4. Restart pod if needed: `kubectl delete pod <pod-name>`
5. Monitor for recovery in dashboard

### If Metrics Are Not Being Scraped
1. Verify auth-service is exposing /metrics endpoint
2. Check Prometheus targets: http://localhost:9090/targets
3. Verify network connectivity between Prometheus and auth-service
4. Check for port conflicts or firewall rules
5. Reload Prometheus configuration if rules changed

### If Alerts Are Stuck "Pending"
1. Check alert expression in Prometheus UI
2. Verify metrics exist in database
3. Check for large time gaps in metrics
4. May need to wait for `for` duration to pass
5. Restart Prometheus if configuration was changed

---

## Performance Baseline (Reference)

| Metric | Baseline | Alert Threshold |
|--------|----------|-----------------|
| Success Rate | 92% | <85% (info), <90% (issue) |
| Error Rate | 0.5% | >10% (alert) |
| P95 Latency | 300ms | >500ms (alert) |
| P99 Latency | 500ms | >1000ms (alert) |
| Rate Limit Hits | 5/5min | >50/5min (alert) |
| Email Failure Rate | 0.5% | >5% (alert) |

---

## Getting Help

### Documentation
- Full guide: `monitoring/MONITORING_SETUP.md`
- Validation details: `monitoring/VALIDATION_CHECKLIST.md`
- Engineering standards: `/Inputs/engineering-guidelines.md`
- Observability strategy: `/Inputs/observability-setup.md`

### Common Issues
See troubleshooting section in MONITORING_SETUP.md

### Contact
- On-call: Check PagerDuty
- Team lead: auth-team Slack channel
- DevOps: devops Slack channel

---

**Remember:** When in doubt, check the dashboards and logs first!
