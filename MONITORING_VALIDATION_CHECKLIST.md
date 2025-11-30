# Monitoring Setup - Validation Checklist

**Date:** 2025-11-30
**Target:** Ensure production monitoring is ready for launch (Dec 2, 2025)

---

## Pre-Deployment Validation

### Configuration Files Validation

#### Prometheus Configuration
- [ ] `monitoring/prometheus.yml` exists and is valid YAML
- [ ] All scrape targets configured:
  - [ ] auth-service:3000/metrics
  - [ ] wallet-service:3000/metrics
  - [ ] trading-engine:8080/metrics
  - [ ] postgres-exporter:9187
  - [ ] redis-exporter:9121
  - [ ] rabbitmq-exporter:9419
  - [ ] node-exporter:9100
- [ ] Recording rules file reference correct
- [ ] Alert rules file references correct
- [ ] AlertManager address configured
- [ ] Retention policy set to 30 days
- [ ] External labels set (cluster, environment, region)

#### Alert Rules
- [ ] `prometheus/rules/critical.yml` has valid syntax
- [ ] `prometheus/rules/warning.yml` has valid syntax
- [ ] All 35+ alert rules have:
  - [ ] Unique alert name
  - [ ] Valid PromQL expression
  - [ ] `for` duration specified
  - [ ] Labels (severity, team)
  - [ ] Annotations (summary, description, runbook)
- [ ] Critical alerts have `severity: critical` label
- [ ] Warning alerts have `severity: warning` label
- [ ] Runbook URLs valid format

#### Recording Rules
- [ ] `prometheus/rules/recording.yml` has valid syntax
- [ ] All recording rules have:
  - [ ] Unique metric name
  - [ ] Valid PromQL expression
  - [ ] Proper grouping (by job, by service, etc.)
- [ ] 35+ recording rules present

#### AlertManager Configuration
- [ ] `monitoring/alertmanager.yml` has valid syntax
- [ ] All receiver configurations present:
  - [ ] default (Slack #monitoring)
  - [ ] critical (PagerDuty + Slack)
  - [ ] warning (Slack #warnings)
  - [ ] info (Slack #monitoring)
  - [ ] auth-team (Slack #auth-team-alerts)
- [ ] Alert routing rules configured:
  - [ ] Critical → PagerDuty + Slack
  - [ ] Warning → Slack
  - [ ] Info → Slack
- [ ] Inhibition rules configured:
  - [ ] Critical suppresses Warning
  - [ ] Warning suppresses Info
- [ ] Group settings reasonable:
  - [ ] group_wait: 0s for critical
  - [ ] group_wait: 30s for warning
  - [ ] repeat_interval: 4h for critical

### Docker Compose Validation

#### Services Definition
- [ ] `docker-compose.monitoring.yml` exists
- [ ] All 10 services defined:
  - [ ] prometheus
  - [ ] grafana
  - [ ] alertmanager
  - [ ] postgres-exporter
  - [ ] redis-exporter
  - [ ] rabbitmq-exporter
  - [ ] node-exporter
  - [ ] loki
  - [ ] promtail
  - [ ] jaeger
- [ ] All services have:
  - [ ] Correct image version
  - [ ] Proper port mappings
  - [ ] Health checks
  - [ ] Resource limits (where applicable)
  - [ ] Proper networking
  - [ ] Dependency declarations
- [ ] Volume definitions present
- [ ] Network definitions present

#### Volume Mounts
- [ ] Prometheus config mounted read-only
- [ ] Alert rules mounted read-only
- [ ] Grafana provisioning mounted read-only
- [ ] Data volumes for persistence
- [ ] Proper volume driver (local)

### Grafana Dashboards Validation

#### Dashboard Files
- [ ] `grafana/dashboards/system-health.json` exists
- [ ] Dashboard JSON valid (can parse)
- [ ] All required fields present:
  - [ ] title
  - [ ] uid
  - [ ] timezone
  - [ ] refresh rate
  - [ ] panels array

#### Dashboard Panels
- [ ] 6+ panels in system-health dashboard:
  - [ ] Service status
  - [ ] Disk usage
  - [ ] CPU usage
  - [ ] Memory usage
  - [ ] Active connections
  - [ ] Request rate (RPS)

#### Grafana Provisioning
- [ ] `grafana/provisioning/datasources/prometheus.yml` configured
- [ ] `grafana/provisioning/dashboards/dashboards.yml` configured
- [ ] Prometheus datasource points to correct URL
- [ ] Dashboard provider points to correct path

### Kubernetes Manifests Validation

#### K8S Deployment Guide
- [ ] `monitoring/K8S_DEPLOYMENT.md` exists
- [ ] All 9 deployment steps documented:
  - [ ] Create namespace
  - [ ] Create PersistentVolumes
  - [ ] Create ConfigMaps
  - [ ] Create Secrets
  - [ ] Deploy Prometheus StatefulSet
  - [ ] Deploy Grafana Deployment
  - [ ] Deploy AlertManager
  - [ ] Deploy Exporters
  - [ ] Setup Ingress

#### Manifest Content
- [ ] Prometheus StatefulSet manifest included
- [ ] Grafana Deployment manifest included
- [ ] AlertManager Deployment manifest included
- [ ] Exporter manifests (Node, Postgres, Redis, RabbitMQ)
- [ ] PVC definitions for data persistence
- [ ] ConfigMap definitions
- [ ] Secret definitions
- [ ] Service definitions
- [ ] RBAC (ServiceAccount, Role, RoleBinding)
- [ ] HPA for Grafana

---

## Local Deployment Testing

### Docker Compose Deployment

#### Startup Test
- [ ] Navigate to project root
- [ ] Run: `docker-compose -f monitoring/docker-compose.monitoring.yml up -d`
- [ ] Wait 30-60 seconds for services to start
- [ ] Run: `docker-compose -f monitoring/docker-compose.monitoring.yml ps`
- [ ] All services show "Up" status:
  - [ ] prometheus
  - [ ] grafana
  - [ ] alertmanager
  - [ ] postgres-exporter
  - [ ] redis-exporter
  - [ ] rabbitmq-exporter
  - [ ] node-exporter
  - [ ] loki
  - [ ] promtail
  - [ ] jaeger

#### Health Check Testing
- [ ] Prometheus: `curl http://localhost:9090/-/healthy` → 200 OK
- [ ] Grafana: `curl http://localhost:3000/api/health` → JSON response
- [ ] AlertManager: `curl http://localhost:9093/-/healthy` → 200 OK
- [ ] Node Exporter: `curl http://localhost:9100` → metrics
- [ ] Postgres Exporter: `curl http://localhost:9187` → metrics
- [ ] Redis Exporter: `curl http://localhost:9121` → metrics

#### Service Access Test
- [ ] Prometheus Web UI: http://localhost:9090
  - [ ] Graph tab accessible
  - [ ] Alerts tab accessible
  - [ ] Status/Targets accessible
- [ ] Grafana Web UI: http://localhost:3000
  - [ ] Login page loads
  - [ ] Can login with admin/admin
  - [ ] Home dashboard appears
- [ ] AlertManager Web UI: http://localhost:9093
  - [ ] Alerts tab accessible
  - [ ] Status page loads

### Prometheus Metrics Collection

#### Service Discovery
- [ ] Visit http://localhost:9090/targets
- [ ] Check target status for each service:
  - [ ] auth-service: UP
  - [ ] wallet-service: UP
  - [ ] postgres-exporter: UP
  - [ ] redis-exporter: UP
  - [ ] rabbitmq-exporter: UP
  - [ ] node-exporter: UP

#### Metrics Availability
- [ ] Query each metric type in http://localhost:9090/graph:
  - [ ] `up` → Returns values for each job
  - [ ] `http_requests_total` → Returns request counts
  - [ ] `process_resident_memory_bytes` → Returns memory
  - [ ] `node_cpu_seconds_total` → Returns CPU metrics
  - [ ] `pg_stat_database_*` → Returns database metrics
  - [ ] `redis_*` → Returns Redis metrics

#### Recording Rules
- [ ] Check http://localhost:9090/rules (Graph tab)
- [ ] Query `job:http_requests_per_second` → Returns values
- [ ] Query `job:http_error_rate` → Returns values
- [ ] Query `job:http_request_duration_p95` → Returns values
- [ ] All 35+ recording rules executing

### Alert Rules Testing

#### Alert Rule Validation
- [ ] Visit http://localhost:9090/alerts
- [ ] All rules listed:
  - [ ] 15+ critical alerts
  - [ ] 20+ warning alerts
- [ ] All rules show "INACTIVE" initially (no violations)

#### Manual Alert Trigger
- [ ] Trigger ServiceDown alert:
  ```bash
  docker stop exchange_auth_service
  # Wait 1-2 minutes
  # Check Prometheus alerts
  ```
- [ ] Verify alert fires:
  - [ ] Alert appears in http://localhost:9090/alerts
  - [ ] Alert status changes to "FIRING"
  - [ ] Annotation shows service name

#### Alert Routing
- [ ] Check AlertManager http://localhost:9093
- [ ] Alert appears in Alerts list
- [ ] Alert shows correct group
- [ ] Alert shows correct severity label

### Grafana Dashboard Testing

#### Dashboard Access
- [ ] Login to Grafana: http://localhost:3000 (admin/admin)
- [ ] Navigate to Dashboards → Browse
- [ ] System Health dashboard visible
- [ ] Can click and view dashboard

#### Dashboard Panels
- [ ] System Health dashboard loads
- [ ] All 6 panels render:
  - [ ] Service status shows "1" for running services
  - [ ] Disk usage shows percentage value
  - [ ] CPU usage shows trending line
  - [ ] Memory usage shows trending line
  - [ ] Active connections shows numbers
  - [ ] Request rate shows RPS values
- [ ] No "No data" or error messages
- [ ] All panels refresh automatically

#### Data Visualization
- [ ] Metrics appear on graphs
- [ ] Time axis shows proper range
- [ ] Legend shows metric labels
- [ ] Colors are readable

---

## Production Deployment Testing (Kubernetes)

### Kubernetes Setup Validation

#### Prerequisites
- [ ] kubectl installed and configured
- [ ] Can run: `kubectl version --client`
- [ ] Can run: `kubectl config current-context`
- [ ] Can run: `kubectl get nodes` (at least 1 node)
- [ ] Helm installed (if using Helm charts)

#### Namespace Creation
- [ ] Create namespace: `kubectl create namespace monitoring`
- [ ] Verify: `kubectl get namespace monitoring`
- [ ] Label namespace: `kubectl label namespace monitoring name=monitoring`

#### ConfigMap Creation
- [ ] Create prometheus config: `kubectl create configmap prometheus-config --from-file=prometheus.yml -n monitoring`
- [ ] Create rules: `kubectl create configmap prometheus-rules --from-file=prometheus/rules/ -n monitoring`
- [ ] Create alertmanager config: `kubectl create configmap alertmanager-config --from-file=alertmanager.yml -n monitoring`
- [ ] Verify: `kubectl get configmap -n monitoring`

#### Secret Creation
- [ ] Create alertmanager secrets: `kubectl create secret generic alertmanager-secrets --from-literal=slack-webhook-url=... -n monitoring`
- [ ] Create grafana credentials: `kubectl create secret generic grafana-credentials --from-literal=admin-password=... -n monitoring`
- [ ] Verify: `kubectl get secret -n monitoring`

### Resource Deployment

#### Prometheus StatefulSet
- [ ] Apply manifest (documented in K8S_DEPLOYMENT.md)
- [ ] Verify: `kubectl get statefulset -n monitoring`
- [ ] Check pod: `kubectl get pods -n monitoring -l app=prometheus`
- [ ] Pod status: Running
- [ ] Logs: `kubectl logs -n monitoring prometheus-0` (no errors)

#### Grafana Deployment
- [ ] Apply manifest
- [ ] Verify: `kubectl get deployment -n monitoring`
- [ ] Check pods: `kubectl get pods -n monitoring -l app=grafana`
- [ ] Pod status: Running (1-2 replicas)
- [ ] HPA: `kubectl get hpa -n monitoring`

#### AlertManager Deployment
- [ ] Apply manifest
- [ ] Verify: `kubectl get deployment -n monitoring`
- [ ] Check pods: `kubectl get pods -n monitoring -l app=alertmanager`
- [ ] Pod status: Running (2 replicas)

#### Exporters
- [ ] Node Exporter DaemonSet deployed
- [ ] One pod on each node: `kubectl get daemonset -n monitoring`
- [ ] Postgres Exporter deployed: `kubectl get deployment -n monitoring -l app=postgres-exporter`
- [ ] Redis Exporter deployed: `kubectl get deployment -n monitoring -l app=redis-exporter`
- [ ] All pods Running

### Kubernetes Health Checks

#### Pod Health
- [ ] All monitoring pods are Running:
  ```bash
  kubectl get pods -n monitoring
  ```
- [ ] All pods have 1/1 ready:
  ```bash
  kubectl get pods -n monitoring -o wide
  ```
- [ ] No pods restarting:
  ```bash
  kubectl get pods -n monitoring -o jsonpath='{.items[*].status.containerStatuses[0].restartCount}'
  ```

#### Service Health
- [ ] All services created:
  ```bash
  kubectl get svc -n monitoring
  ```
- [ ] Prometheus service is ClusterIP:None (headless)
- [ ] Grafana service is LoadBalancer or ClusterIP
- [ ] AlertManager service is ClusterIP

#### Logs
- [ ] No error logs in Prometheus:
  ```bash
  kubectl logs -n monitoring prometheus-0 | grep -i error
  ```
- [ ] No error logs in Grafana:
  ```bash
  kubectl logs -n monitoring $(kubectl get pods -n monitoring -l app=grafana -o name | head -1) | grep -i error
  ```
- [ ] No error logs in AlertManager:
  ```bash
  kubectl logs -n monitoring $(kubectl get pods -n monitoring -l app=alertmanager -o name | head -1) | grep -i error
  ```

### Port Forwarding Test
- [ ] Port forward Prometheus: `kubectl port-forward -n monitoring svc/prometheus 9090:9090`
- [ ] Access: http://localhost:9090 (should work)
- [ ] Port forward Grafana: `kubectl port-forward -n monitoring svc/grafana 3000:3000`
- [ ] Access: http://localhost:3000 (should work)
- [ ] Port forward AlertManager: `kubectl port-forward -n monitoring svc/alertmanager 9093:9093`
- [ ] Access: http://localhost:9093 (should work)

---

## Functional Testing

### Alert Firing Test

#### Test 1: ServiceDown Alert
1. [ ] Identify a service pod (e.g., auth-service)
2. [ ] Delete the pod: `kubectl delete pod -n production <pod-name>`
3. [ ] Wait 1-2 minutes for alert evaluation
4. [ ] Check Prometheus alerts: http://localhost:9090/alerts
5. [ ] Verify ServiceDown alert is FIRING
6. [ ] Check AlertManager: http://localhost:9093
7. [ ] Verify alert appears in list
8. [ ] Pod should restart automatically (verify with `kubectl get pods`)
9. [ ] After restart, alert should resolve

#### Test 2: HighErrorRate Alert
1. [ ] Generate errors on a service:
   ```bash
   ab -n 1000 -c 10 http://service/invalid-endpoint
   ```
2. [ ] Monitor error rate:
   ```bash
   curl http://localhost:9090/api/v1/query?query=rate(http_requests_total{status=~"5.."}[5m])
   ```
3. [ ] Wait for alert evaluation (5 minutes)
4. [ ] Check if HighErrorRate alert fires
5. [ ] Verify in AlertManager

#### Test 3: High Resource Usage
1. [ ] Monitor CPU: `kubectl top pods -n production`
2. [ ] Trigger high CPU (stress test):
   ```bash
   docker run --rm -it progrium/stress --cpu 1 --timeout 60s
   ```
3. [ ] Wait for alert evaluation (10-15 minutes)
4. [ ] Verify HighCPUUsage alert fires

#### Test 4: Disk Space Alert
1. [ ] Check current disk usage:
   ```bash
   docker exec exchange_prometheus df -h /prometheus
   ```
2. [ ] Fill disk to < 10% (for critical):
   ```bash
   # Create large dummy file
   dd if=/dev/zero of=fill_disk bs=1M count=<size>
   ```
3. [ ] Wait for alert evaluation (5 minutes)
4. [ ] Verify DiskSpaceCritical alert fires
5. [ ] Clean up: `rm fill_disk`

### Dashboard Functionality Test

#### Test 1: Dashboard Data Display
1. [ ] Open System Health dashboard
2. [ ] Verify all 6 panels show data:
   - [ ] Service status: Should show "1" for running services
   - [ ] Disk usage: Should show percentage
   - [ ] CPU usage: Should show trending line
   - [ ] Memory usage: Should show trending line
   - [ ] Active connections: Should show number
   - [ ] Request rate: Should show RPS value
3. [ ] All panels refresh automatically every 30 seconds

#### Test 2: Dashboard Time Range
1. [ ] Try different time ranges:
   - [ ] Last 1 hour
   - [ ] Last 6 hours
   - [ ] Last 24 hours
2. [ ] Data should update based on time range
3. [ ] Y-axis scale should adjust appropriately

#### Test 3: Dashboard Responsiveness
1. [ ] Load times should be < 5 seconds
2. [ ] Panels should render smoothly
3. [ ] No JavaScript console errors

#### Test 4: Metric Queries
1. [ ] Edit a dashboard panel
2. [ ] Change the PromQL query
3. [ ] Test queries:
   - [ ] `up` → Should return results
   - [ ] `rate(http_requests_total[5m])` → Should return RPS
   - [ ] `node_cpu_seconds_total` → Should return CPU metrics
4. [ ] Save and verify graph updates

### Integration Testing

#### Test 1: End-to-End Alert Flow
1. [ ] Service generates metric
2. [ ] Prometheus scrapes metric (15 seconds)
3. [ ] Alert rule evaluates metric (15 seconds)
4. [ ] Alert fires (after `for` duration)
5. [ ] AlertManager routes alert
6. [ ] Alert notification sent to Slack/PagerDuty
7. [ ] User receives notification

#### Test 2: Dashboard Auto-Refresh
1. [ ] Open dashboard
2. [ ] Watch for data updates
3. [ ] Should refresh every 30 seconds (system-health)
4. [ ] Verify new metric values appear
5. [ ] Verify no errors in browser console

#### Test 3: Multi-Service Correlation
1. [ ] Look at Dashboard during operational traffic
2. [ ] Correlate changes across metrics:
   - [ ] When RPS increases, should see CPU increase
   - [ ] When error rate increases, should see latency increase
   - [ ] When connection pool fills, should see query latency increase
3. [ ] Verify dashboard tells coherent story of system state

---

## Performance Validation

### Prometheus Performance
- [ ] Prometheus startup time: < 30 seconds
- [ ] Query latency: < 1 second for typical queries
- [ ] Memory usage: < 2GB under normal load
- [ ] CPU usage: < 50% of allocated

### Grafana Performance
- [ ] Grafana startup time: < 30 seconds
- [ ] Dashboard load time: < 5 seconds
- [ ] Panel render time: < 2 seconds
- [ ] Memory usage: < 512MB per replica

### AlertManager Performance
- [ ] Alert evaluation latency: < 5 seconds
- [ ] Webhook delivery latency: < 10 seconds
- [ ] Memory usage: < 128MB

---

## Documentation Validation

### Files Present
- [ ] monitoring/prometheus.yml exists
- [ ] monitoring/prometheus/rules/recording.yml exists
- [ ] monitoring/prometheus/rules/critical.yml exists
- [ ] monitoring/prometheus/rules/warning.yml exists
- [ ] monitoring/alertmanager.yml exists
- [ ] monitoring/docker-compose.monitoring.yml exists
- [ ] monitoring/grafana/dashboards/system-health.json exists
- [ ] monitoring/docs/PRODUCTION_MONITORING_GUIDE.md exists
- [ ] monitoring/MONITORING_README.md exists
- [ ] monitoring/K8S_DEPLOYMENT.md exists

### Documentation Quality
- [ ] Each file has header comments
- [ ] Configuration options documented
- [ ] Examples provided for key configurations
- [ ] Troubleshooting section comprehensive
- [ ] Deployment steps clear and complete
- [ ] Alert descriptions match actual behavior
- [ ] Dashboard descriptions match panel content

### Cross-References
- [ ] Alert annotations include runbook links
- [ ] Documentation links to relevant files
- [ ] Dashboard notes link to runbooks
- [ ] README links to detailed guides

---

## Security Validation

### Credential Management
- [ ] No secrets in Git repositories
- [ ] All sensitive values in environment variables or Kubernetes secrets
- [ ] Secrets properly encrypted in transit
- [ ] Admin passwords changed from defaults (production)

### Access Control
- [ ] Grafana requires authentication (no anonymous access)
- [ ] Prometheus protected by reverse proxy (production)
- [ ] AlertManager protected by reverse proxy (production)
- [ ] Kubernetes RBAC configured for monitoring namespace
- [ ] ServiceAccounts have minimal required permissions

### Network Security
- [ ] Services only expose required ports
- [ ] Network policies restrict pod communication
- [ ] TLS/HTTPS enabled for external access (production)
- [ ] Sensitive data encrypted in transit

---

## Final Checklist

### Pre-Launch
- [ ] All validation tests passed
- [ ] All alert rules tested and verified
- [ ] All dashboards loading with live data
- [ ] Documentation reviewed and complete
- [ ] Team trained on monitoring tools
- [ ] On-call rotation configured
- [ ] PagerDuty integration tested
- [ ] Slack channels created and configured

### Launch Day
- [ ] Monitoring stack deployed (Docker or K8s)
- [ ] All services exposing metrics on /metrics endpoint
- [ ] Prometheus scraping all targets
- [ ] Grafana showing live data
- [ ] Alerts properly routing to Slack/PagerDuty
- [ ] On-call engineer on duty
- [ ] Runbooks accessible to team
- [ ] Dashboard links in Slack/wiki

### Post-Launch (Week 1)
- [ ] Monitor alert accuracy (minimize false positives)
- [ ] Adjust thresholds based on baseline
- [ ] Review team feedback
- [ ] Address any issues or improvements
- [ ] Document any customizations

---

## Sign-Off

**Validated By:** _________________
**Date:** _________________
**Status:** [ ] PASS [ ] FAIL

**Comments:**
```
_____________________________________________________________________
_____________________________________________________________________
_____________________________________________________________________
```

**Approval for Production:** [ ] YES [ ] NO

---

**End of Checklist**

Keep this document and mark items as verified during deployment.
