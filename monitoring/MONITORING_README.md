# MyCrypto Platform - Production Monitoring & Alerting

**Version:** 1.0
**Status:** Production Ready
**Last Updated:** 2025-11-30
**Target Launch:** 2025-12-02

---

## Quick Start

### Local Development (Docker)

```bash
# Start monitoring stack
docker-compose -f monitoring/docker-compose.monitoring.yml up -d

# Access services
# Prometheus: http://localhost:9090
# Grafana: http://localhost:3000 (admin/admin)
# AlertManager: http://localhost:9093
```

### Production (Kubernetes)

```bash
# Deploy monitoring namespace and components
kubectl apply -f monitoring/K8S_DEPLOYMENT.md

# Verify deployment
kubectl -n monitoring get pods
```

---

## Directory Structure

```
monitoring/
├── MONITORING_README.md                   # This file
├── prometheus.yml                         # Main Prometheus config
├── alertmanager.yml                       # Alert routing config
├── docker-compose.monitoring.yml          # Docker Compose setup
├── K8S_DEPLOYMENT.md                      # Kubernetes deployment guide
│
├── prometheus/
│   ├── rules/
│   │   ├── recording.yml                 # Pre-computed metrics
│   │   ├── critical.yml                  # Critical alerts
│   │   └── warning.yml                   # Warning alerts
│   └── auth-alerts.yml                   # Auth service specific
│
├── grafana/
│   ├── provisioning/
│   │   ├── dashboards/
│   │   │   └── dashboards.yml            # Dashboard provisioning
│   │   └── datasources/
│   │       └── prometheus.yml            # Prometheus datasource
│   └── dashboards/
│       ├── system-health.json            # System overview
│       ├── auth-registration.json        # Auth metrics
│       └── [more dashboards...]
│
├── docs/
│   └── PRODUCTION_MONITORING_GUIDE.md    # Comprehensive guide
│
└── tests/
    └── alert-test-plan.md                # How to test alerts
```

---

## Components

### Prometheus (v2.48.1)
- **Purpose:** Metrics collection and alerting
- **Port:** 9090
- **Scrape Interval:** 15 seconds
- **Retention:** 30 days
- **Alert Rules:** 35+ (critical/warning)

### Grafana (v10.2.2)
- **Purpose:** Metrics visualization
- **Port:** 3000
- **Dashboards:** 7 production-ready dashboards
- **Datasources:** Prometheus, Loki

### AlertManager (v0.26.0)
- **Purpose:** Alert routing and notification
- **Port:** 9093
- **Channels:** Slack, PagerDuty, Email

### Exporters
- **PostgreSQL** - Database metrics
- **Redis** - Cache metrics
- **RabbitMQ** - Message queue metrics
- **Node** - System metrics

---

## Key Features

### Real-Time Visibility
- Service health (1-minute detection)
- Performance metrics (latency, throughput, errors)
- Infrastructure utilization (CPU, memory, disk)
- Business metrics (registrations, trading volume)

### Intelligent Alerting
- 35+ pre-configured alert rules
- 3 severity levels: Critical, Warning, Info
- Automatic routing to teams
- Alert inhibition to prevent storms
- PagerDuty integration for 24/7 on-call

### Comprehensive Dashboards
1. **System Health** - Service status, resources, connections
2. **Application Performance** - RPS, latency, error rate
3. **Trading Engine** - Order matching, throughput, latency
4. **Database & Cache** - Query performance, connection pools
5. **Business Metrics** - DAU, registrations, trading volume
6. **Security & Anomaly** - Failed logins, DDoS, fraud
7. **Infrastructure** - CPU, memory, disk, network

---

## Alert Rules Summary

### Critical Alerts (15+)
- ServiceDown
- HighErrorRate (>5%)
- APILatencyCritical (P99 > 2s)
- DatabaseConnectionPoolExhausted
- MatchingEngineDown
- BlockchainNodeNotSynced
- DDoSDetected
- SuspiciousLoginAttempts
- DiskSpaceCritical
- And 6 more...

### Warning Alerts (20+)
- HighErrorRateWarning (>1%)
- APILatencyWarning (P95 > 1s)
- DatabaseQueryLatencyWarning
- HighCPUUsage (>80%)
- HighMemoryUsage (>80%)
- DiskSpaceWarning
- RabbitMQQueueBacklogWarning
- KYCBacklog
- And 12 more...

---

## Recording Rules

Pre-computed metrics for dashboard performance:

```
job:http_requests_per_second        # RPS by service
job:http_error_rate                 # Error % by service
job:http_request_duration_p95       # P95 latency
job:http_request_duration_p99       # P99 latency
job:pg_connection_pool_usage        # Database pool %
job:redis_hit_rate                  # Cache hit %
job:dau                             # Daily active users
job:mau                             # Monthly active users
```

---

## Access & Credentials

### Development (Docker)

| Component | URL | User | Password |
|-----------|-----|------|----------|
| Prometheus | http://localhost:9090 | - | - |
| Grafana | http://localhost:3000 | admin | admin |
| AlertManager | http://localhost:9093 | - | - |

### Production (Kubernetes)

```bash
# Port-forward
kubectl -n monitoring port-forward svc/prometheus 9090:9090
kubectl -n monitoring port-forward svc/grafana 3000:3000
kubectl -n monitoring port-forward svc/alertmanager 9093:9093

# Or access via Ingress
https://monitoring.exchange.com/
```

---

## Deployment Steps

### Local (5 minutes)

```bash
# 1. Start monitoring stack
docker-compose -f monitoring/docker-compose.monitoring.yml up -d

# 2. Verify services
docker-compose -f monitoring/docker-compose.monitoring.yml ps

# 3. Check health
curl http://localhost:9090/-/healthy

# 4. Access dashboards
# Prometheus: http://localhost:9090
# Grafana: http://localhost:3000
```

### Production Kubernetes (15 minutes)

```bash
# 1. Create namespace
kubectl create namespace monitoring

# 2. Create ConfigMaps
kubectl create configmap prometheus-config --from-file=prometheus.yml -n monitoring

# 3. Create secrets
kubectl create secret generic alertmanager-secrets \
  --from-literal=slack-webhook-url='https://hooks.slack.com/...' \
  -n monitoring

# 4. Apply manifests
kubectl apply -f K8S_DEPLOYMENT.md

# 5. Verify
kubectl -n monitoring get pods
```

**See [K8S_DEPLOYMENT.md](./K8S_DEPLOYMENT.md) for detailed setup**

---

## Health Checks

Every service MUST expose `/health` endpoint:

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

---

## Metrics Exposed

### Application
```
http_requests_total
http_request_duration_seconds
auth_registration_total
orders_created_total
matching_engine_latency_seconds
```

### Infrastructure
```
pg_stat_database_*
redis_memory_used_bytes
rabbitmq_queue_*
node_cpu_seconds_total
node_memory_*
```

---

## Testing & Validation

### Test Alerts

```bash
# Trigger high error rate
ab -n 1000 -c 10 http://auth-service:3000/api/invalid

# View alerts
curl http://localhost:9090/api/v1/alerts
```

### Test Dashboards

```bash
# Port-forward
kubectl -n monitoring port-forward svc/grafana 3000:3000

# Access dashboards
# http://localhost:3000/d/system-health
# http://localhost:3000/d/app-performance
```

---

## Troubleshooting

### Prometheus can't scrape services
1. Check target is running: `kubectl get pods -A`
2. Check metrics endpoint: `curl http://service:port/metrics`
3. View Prometheus targets: http://localhost:9090/targets

### Grafana shows "No data"
1. Check Prometheus is scraping: http://localhost:9090/targets
2. Query metric in Prometheus UI
3. Check dashboard PromQL queries

### Alerts not firing
1. Check syntax: http://localhost:9090/alerts
2. Test PromQL in Graph tab
3. Check alert `for` duration

---

## Configuration

### prometheus.yml
- Scrape targets for all services
- Recording rules
- AlertManager address
- Retention policy (30 days)
- Kubernetes service discovery (optional)

### alertmanager.yml
- Severity-based routing
- Slack/PagerDuty webhooks
- Alert grouping and inhibition
- Team-specific receivers

### Environment Variables

```bash
export SLACK_WEBHOOK_URL="https://hooks.slack.com/..."
export PAGERDUTY_SERVICE_KEY="..."
export GRAFANA_ADMIN_PASSWORD="<password>"
```

---

## Maintenance

### Daily
- [ ] Check for critical alerts
- [ ] Verify service health

### Weekly
- [ ] Review alert patterns
- [ ] Check database performance

### Monthly
- [ ] Rebaseline metrics
- [ ] Update thresholds
- [ ] Capacity planning

---

## Documentation

- [PRODUCTION_MONITORING_GUIDE.md](./docs/PRODUCTION_MONITORING_GUIDE.md) - Comprehensive guide
- [K8S_DEPLOYMENT.md](./K8S_DEPLOYMENT.md) - Kubernetes deployment

---

## Summary

Production-grade monitoring providing:

✅ Real-time visibility into all services
✅ Intelligent alerting with 35+ rules
✅ 7 comprehensive dashboards
✅ 24/7 on-call support via PagerDuty
✅ Complete documentation and runbooks
✅ Easy deployment (Docker or Kubernetes)

**Status:** Ready for production deployment

---

**Last Updated:** 2025-11-30
**Owner:** DevOps / SRE Team
