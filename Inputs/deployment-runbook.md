# Kurumsal Kripto Varlık Borsası Platformu
## Production Deployment Runbook

**Version:** 1.0  
**Last Updated:** 2025-11-19  
**Purpose:** Production deployment step-by-step guide  
**Target:** DevOps Engineers, SRE Team

---

## 📋 Document Overview

Bu runbook, Kripto Varlık Borsası platformunun production ortamına deployment sürecini adım adım anlatır.

### Deployment Types

| Type | Frequency | Risk | Downtime | Approval |
|------|-----------|------|----------|----------|
| **Hotfix** | Ad-hoc | 🔴 HIGH | ~5 min | CTO Approval |
| **Minor Release** | 2 weeks | 🟡 MEDIUM | ~15 min | Tech Lead |
| **Major Release** | Monthly | 🟠 HIGH | ~30 min | C-Level |

---

## 🎯 Pre-Deployment Checklist

### 1 Week Before

- [ ] **Code freeze announced** (Major releases only)
- [ ] **Release notes prepared** (changelog, new features, breaking changes)
- [ ] **Stakeholders notified** (Business, Support, Compliance teams)
- [ ] **Rollback plan reviewed**
- [ ] **Maintenance window scheduled** (if downtime needed)

### 1 Day Before

- [ ] **Final QA testing completed** on staging
- [ ] **Performance tests passed** (load test results reviewed)
- [ ] **Security scan passed** (SAST/DAST clean, or issues acknowledged)
- [ ] **Database migration scripts tested** on staging
- [ ] **Backup verification** (recent backup exists and restorable)
- [ ] **On-call engineer assigned** for deployment window

### 1 Hour Before

- [ ] **Deployment team assembled** (Slack/Teams channel active)
- [ ] **Monitoring dashboards opened** (Grafana, DataDog, etc.)
- [ ] **Incident management ready** (PagerDuty, ticket system)
- [ ] **Communication channels alerted** (status page, support team)

---

## 🚀 Deployment Process

### Phase 1: Pre-Deployment Verification (15 min)

#### 1.1 System Health Check

```bash
# Check all services are healthy
kubectl get pods -n crypto-platform
# Expected: All pods Running, 0 restarts

# Check database connectivity
psql -h db-primary.internal -U platform_user -d crypto_db -c "SELECT 1;"
# Expected: 1 row returned

# Check Redis connectivity
redis-cli -h redis.internal ping
# Expected: PONG

# Check blockchain nodes
curl http://btc-node.internal:8332 -u user:pass --data-binary '{"jsonrpc": "1.0", "id":"check", "method": "getblockchaininfo", "params": []}'
# Expected: JSON response with current block height
```

#### 1.2 Create Full Backup

```bash
# Database backup
pg_dump -h db-primary.internal -U platform_user crypto_db | \
  gzip > /backups/pre-deploy-$(date +%Y%m%d-%H%M%S).sql.gz

# Upload to S3
aws s3 cp /backups/pre-deploy-*.sql.gz s3://crypto-platform-backups/pre-deploy/

# Verify backup uploaded
aws s3 ls s3://crypto-platform-backups/pre-deploy/ | tail -1
```

#### 1.3 Announce Maintenance (if downtime)

```bash
# Update status page
curl -X POST https://status.yourbank.com/api/incidents \
  -H "Authorization: Bearer $STATUS_API_KEY" \
  -d '{
    "incident": {
      "name": "Scheduled Maintenance - Platform Upgrade",
      "status": "investigating",
      "message": "We are performing scheduled maintenance. Expected duration: 30 minutes."
    }
  }'

# Send notification to users (if critical)
# Via notification service API
```

---

### Phase 2: Database Migration (10-20 min)

#### 2.1 Put Application in Maintenance Mode

```bash
# Scale down non-critical services
kubectl scale deployment trading-service --replicas=1 -n crypto-platform
kubectl scale deployment wallet-service --replicas=1 -n crypto-platform

# Enable maintenance mode flag (prevents new orders)
kubectl set env deployment/api-gateway MAINTENANCE_MODE=true -n crypto-platform

# Wait for in-flight requests to complete
sleep 30
```

#### 2.2 Run Database Migrations

```bash
# Connect to migration pod
kubectl exec -it migration-runner -n crypto-platform -- bash

# Inside pod:
cd /app/migrations

# Dry-run (verify SQL)
npx db-migrate up --dry-run

# Run migrations
npx db-migrate up

# Verify migration success
psql -h db-primary.internal -U platform_user -d crypto_db \
  -c "SELECT * FROM schema_migrations ORDER BY id DESC LIMIT 5;"
```

**Common Migration Issues:**

| Issue | Solution |
|-------|----------|
| Lock timeout | Increase `lock_timeout`, retry |
| Foreign key violation | Check data integrity, fix data first |
| Out of disk space | Free space, increase volume size |

#### 2.3 Verify Database State

```bash
# Check table counts
psql -h db-primary.internal -U platform_user -d crypto_db << EOF
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;
EOF

# Check recent data
psql -h db-primary.internal -U platform_user -d crypto_db \
  -c "SELECT COUNT(*) FROM orders WHERE created_at > NOW() - INTERVAL '1 hour';"
```

---

### Phase 3: Application Deployment (20-30 min)

#### 3.1 Build and Push Docker Images

```bash
# Set version
export VERSION=v1.2.0
export REGISTRY=registry.yourbank.com

# Build all services
docker-compose -f docker-compose.prod.yml build

# Tag images
docker tag crypto-platform/auth-service:latest $REGISTRY/auth-service:$VERSION
docker tag crypto-platform/trading-service:latest $REGISTRY/trading-service:$VERSION
docker tag crypto-platform/wallet-service:latest $REGISTRY/wallet-service:$VERSION
# ... (all services)

# Push to registry
docker push $REGISTRY/auth-service:$VERSION
docker push $REGISTRY/trading-service:$VERSION
docker push $REGISTRY/wallet-service:$VERSION
# ... (all services)

# Verify images pushed
curl -u admin:password https://registry.yourbank.com/v2/auth-service/tags/list
```

#### 3.2 Update Kubernetes Manifests

```bash
# Update image tags in deployment files
cd k8s/prod

# Method 1: Using kustomize
kustomize edit set image \
  auth-service=$REGISTRY/auth-service:$VERSION \
  trading-service=$REGISTRY/trading-service:$VERSION \
  wallet-service=$REGISTRY/wallet-service:$VERSION

# Method 2: Using sed
find . -name "*.yaml" -exec sed -i "s|:latest|:$VERSION|g" {} \;

# Verify changes
git diff
```

#### 3.3 Deploy Services (Rolling Update)

**Deployment Order (Important!):**

1. Infrastructure services (Redis, RabbitMQ) - if updates
2. Auth Service
3. User/KYC Service
4. Wallet Service
5. Compliance Service
6. Payment Service
7. Trading Service
8. Matching Engine (last, most critical)
9. API Gateway

```bash
# Deploy one by one, verify each before next

# 1. Auth Service
kubectl set image deployment/auth-service \
  auth-service=$REGISTRY/auth-service:$VERSION \
  -n crypto-platform

# Wait for rollout
kubectl rollout status deployment/auth-service -n crypto-platform

# Check pods healthy
kubectl get pods -l app=auth-service -n crypto-platform

# Smoke test
curl https://api.yourbank.com/api/v1/public/time
# Expected: 200 OK, current timestamp

# 2. Trading Service
kubectl set image deployment/trading-service \
  trading-service=$REGISTRY/trading-service:$VERSION \
  -n crypto-platform

kubectl rollout status deployment/trading-service -n crypto-platform

# Smoke test
curl https://api.yourbank.com/api/v1/markets
# Expected: 200 OK, markets list

# ... repeat for each service
```

#### 3.4 Deploy Matching Engine (Critical)

```bash
# Matching Engine: ZERO downtime strategy

# Step 1: Deploy new version alongside old
kubectl apply -f k8s/prod/matching-engine-v2.yaml
# This creates matching-engine-v2 deployment

# Step 2: Gradually shift traffic (Canary)
# Using Istio VirtualService or similar
kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: matching-engine
  namespace: crypto-platform
spec:
  hosts:
  - matching-engine.crypto-platform.svc.cluster.local
  http:
  - match:
    - headers:
        x-version:
          exact: v2
    route:
    - destination:
        host: matching-engine-v2
        port:
          number: 8080
  - route:
    - destination:
        host: matching-engine
        port:
          number: 8080
      weight: 90
    - destination:
        host: matching-engine-v2
        port:
          number: 8080
      weight: 10
EOF

# Step 3: Monitor latency for 5 minutes
# Check Grafana dashboard: Matching Engine p95 latency

# Step 4: If OK, shift 100% traffic
kubectl patch virtualservice matching-engine -n crypto-platform --type merge -p '
{
  "spec": {
    "http": [{
      "route": [{
        "destination": {
          "host": "matching-engine-v2",
          "port": {"number": 8080}
        }
      }]
    }]
  }
}'

# Step 5: Remove old version
kubectl delete deployment matching-engine -n crypto-platform
```

---

### Phase 4: Post-Deployment Verification (15 min)

#### 4.1 Health Checks

```bash
# Check all pods running
kubectl get pods -n crypto-platform | grep -v Running | grep -v Completed
# Expected: Empty (no non-Running pods)

# Check service endpoints
for svc in auth-service trading-service wallet-service; do
  echo "Checking $svc..."
  kubectl exec -it deploy/api-gateway -n crypto-platform -- \
    curl -s http://$svc:8080/health | jq '.status'
done
# Expected: All return "healthy"
```

#### 4.2 Smoke Tests

```bash
# Create smoke test script
cat > smoke-test.sh << 'EOF'
#!/bin/bash
BASE_URL="https://api.yourbank.com"

echo "=== Smoke Tests ==="

# Test 1: Server time
echo -n "Test 1: Server time... "
RESPONSE=$(curl -s "$BASE_URL/api/v1/public/time")
if echo "$RESPONSE" | jq -e '.success' > /dev/null; then
  echo "✅ PASS"
else
  echo "❌ FAIL: $RESPONSE"
  exit 1
fi

# Test 2: Markets list
echo -n "Test 2: Markets... "
RESPONSE=$(curl -s "$BASE_URL/api/v1/markets")
if echo "$RESPONSE" | jq -e '.data | length > 0' > /dev/null; then
  echo "✅ PASS"
else
  echo "❌ FAIL: $RESPONSE"
  exit 1
fi

# Test 3: Login (test user)
echo -n "Test 3: Login... "
TOKEN=$(curl -s -X POST "$BASE_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@yourbank.com","password":"Test123!"}' \
  | jq -r '.data.accessToken')

if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
  echo "✅ PASS"
else
  echo "❌ FAIL: Login failed"
  exit 1
fi

# Test 4: Get balances (authenticated)
echo -n "Test 4: Get balances... "
RESPONSE=$(curl -s "$BASE_URL/api/v1/wallets/balances" \
  -H "Authorization: Bearer $TOKEN")
if echo "$RESPONSE" | jq -e '.success' > /dev/null; then
  echo "✅ PASS"
else
  echo "❌ FAIL: $RESPONSE"
  exit 1
fi

echo ""
echo "=== All Smoke Tests Passed ✅ ==="
EOF

chmod +x smoke-test.sh
./smoke-test.sh
```

#### 4.3 Performance Verification

```bash
# Check response times (p95 latency)
kubectl exec -it prometheus-0 -n monitoring -- promtool query instant \
  'http_request_duration_seconds{job="api-gateway",quantile="0.95"}'

# Expected: < 100ms

# Check error rate
kubectl exec -it prometheus-0 -n monitoring -- promtool query instant \
  'rate(http_requests_total{status=~"5.."}[5m])'

# Expected: < 0.01 (1%)

# Check database connections
psql -h db-primary.internal -U platform_user -d crypto_db \
  -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';"

# Expected: < 100 active connections
```

#### 4.4 Business Metrics Verification

```bash
# Check order placement works
# Place a test order via admin panel or API

# Check recent orders
psql -h db-primary.internal -U platform_user -d crypto_db << EOF
SELECT 
  COUNT(*) as order_count,
  status,
  created_at::date as date
FROM orders 
WHERE created_at > NOW() - INTERVAL '10 minutes'
GROUP BY status, date;
EOF

# Check websocket connections
kubectl exec -it deploy/api-gateway -n crypto-platform -- \
  curl -s http://localhost:9090/metrics | grep websocket_connections

# Expected: > 0 active connections
```

---

### Phase 5: Enable Full Traffic & Cleanup (10 min)

#### 5.1 Disable Maintenance Mode

```bash
# Remove maintenance mode flag
kubectl set env deployment/api-gateway MAINTENANCE_MODE=false -n crypto-platform

# Scale up services to normal replica count
kubectl scale deployment auth-service --replicas=3 -n crypto-platform
kubectl scale deployment trading-service --replicas=5 -n crypto-platform
kubectl scale deployment wallet-service --replicas=3 -n crypto-platform
# ... (all services to production replica count)

# Verify scaling
kubectl get deployments -n crypto-platform
```

#### 5.2 Update Status Page

```bash
# Mark maintenance complete
curl -X PATCH https://status.yourbank.com/api/incidents/$INCIDENT_ID \
  -H "Authorization: Bearer $STATUS_API_KEY" \
  -d '{
    "incident": {
      "status": "resolved",
      "message": "Maintenance completed successfully. All systems operational."
    }
  }'
```

#### 5.3 Cleanup Old Resources

```bash
# Remove old ReplicaSets (keep last 3)
kubectl delete rs $(kubectl get rs -n crypto-platform --sort-by=.metadata.creationTimestamp | head -n -3 | awk '{print $1}') -n crypto-platform

# Clean up old Docker images (on nodes)
# Via ansible or manual
ssh node1.internal "docker image prune -a -f --filter 'until=72h'"
```

#### 5.4 Final Monitoring Check

```bash
# Open Grafana dashboard
# Check for 30 minutes:
# - Error rate normal
# - Latency normal
# - No alerts firing
# - Business metrics (orders, trades) normal

# Check logs for errors
kubectl logs -f deploy/trading-service -n crypto-platform --tail=100 | grep -i error

# If all clear after 30 min → Deployment successful ✅
```

---

## 🔙 Rollback Procedures

### When to Rollback?

Immediate rollback if:
- 🔴 Error rate > 5%
- 🔴 P95 latency > 500ms
- 🔴 Critical feature broken (e.g., order placement)
- 🔴 Data corruption detected
- 🔴 Security vulnerability introduced

### Rollback Process (10 min)

#### Option 1: Kubernetes Rollback (Preferred)

```bash
# Rollback all deployments to previous version
for deploy in $(kubectl get deployments -n crypto-platform -o name); do
  kubectl rollout undo $deploy -n crypto-platform
done

# Verify rollback
kubectl rollout status deployment/trading-service -n crypto-platform

# Check app version
kubectl get pods -n crypto-platform -o jsonpath='{.items[0].spec.containers[0].image}'
```

#### Option 2: Database Rollback (If Migration Failed)

```bash
# Connect to migration pod
kubectl exec -it migration-runner -n crypto-platform -- bash

# Rollback last migration
npx db-migrate down

# Verify
psql -h db-primary.internal -U platform_user -d crypto_db \
  -c "SELECT * FROM schema_migrations ORDER BY id DESC LIMIT 5;"
```

#### Option 3: Full Restore from Backup (Nuclear Option)

```bash
# Stop all services
kubectl scale deployment --all --replicas=0 -n crypto-platform

# Restore database
aws s3 cp s3://crypto-platform-backups/pre-deploy/pre-deploy-20251119-100000.sql.gz /tmp/
gunzip /tmp/pre-deploy-20251119-100000.sql.gz
psql -h db-primary.internal -U platform_user -d crypto_db < /tmp/pre-deploy-20251119-100000.sql

# Redeploy previous version
kubectl set image deployment/trading-service \
  trading-service=$REGISTRY/trading-service:v1.1.0 \
  -n crypto-platform
# ... (all services)

# Scale up
kubectl scale deployment --all --replicas=3 -n crypto-platform
```

---

## 📊 Deployment Metrics

### Success Criteria

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Deployment duration | < 60 min | ____ min | ⬜ |
| Downtime | < 5 min | ____ min | ⬜ |
| Error rate post-deploy | < 1% | ____% | ⬜ |
| P95 latency | < 100ms | ____ ms | ⬜ |
| Failed smoke tests | 0 | ____ | ⬜ |
| Rollback needed | No | ⬜ Yes / ⬜ No | ⬜ |

### Post-Deployment Report Template

```markdown
# Deployment Report - v1.2.0

**Date:** 2025-11-19
**Duration:** 45 minutes
**Downtime:** 3 minutes
**Status:** ✅ Success / ❌ Failed

## Changes Deployed
- New feature: Advanced order types (stop-loss, OCO)
- Bug fix: Withdrawal approval notification
- Performance: Matching engine optimization

## Issues Encountered
- [ ] None
- [ ] Minor: (describe)
- [ ] Major: (describe, how resolved)

## Rollback
- [ ] Not needed
- [ ] Partial rollback: (which services)
- [ ] Full rollback: (reason)

## Metrics
- Pre-deploy error rate: 0.3%
- Post-deploy error rate: 0.2% ✅
- Pre-deploy p95 latency: 45ms
- Post-deploy p95 latency: 42ms ✅

## Team
- Deployment Lead: [Name]
- Database Admin: [Name]
- On-call Engineer: [Name]

## Lessons Learned
- (What went well)
- (What could be improved)
- (Action items for next deployment)

---
**Report by:** [Your Name]
**Approved by:** [CTO/Tech Lead]
```

---

## 🚨 Emergency Procedures

### Critical Production Issue During Deployment

**STOP deployment immediately if:**

1. **Database corruption detected**
   ```bash
   # Immediate actions:
   - Stop all writes (enable read-only mode)
   - Alert DBA team
   - Prepare for restore from backup
   ```

2. **Security breach suspected**
   ```bash
   # Immediate actions:
   - Isolate affected services
   - Alert security team
   - Enable enhanced logging
   - Preserve evidence
   ```

3. **Cascading failures**
   ```bash
   # Immediate actions:
   - Rollback immediately
   - Enable circuit breakers
   - Scale down load (rate limiting)
   - Investigate root cause
   ```

### Emergency Contacts

| Role | Name | Phone | Slack |
|------|------|-------|-------|
| CTO | [Name] | +90-XXX-XXX-XXXX | @cto |
| DevOps Lead | [Name] | +90-XXX-XXX-XXXX | @devops-lead |
| DBA | [Name] | +90-XXX-XXX-XXXX | @dba |
| Security Lead | [Name] | +90-XXX-XXX-XXXX | @security |

**Incident Hotline:** +90-XXX-XXX-XXXX (24/7)

---

## 📚 Post-Deployment Tasks

### Within 24 Hours

- [ ] Monitor error rates and latency
- [ ] Check for memory leaks (gradual memory increase)
- [ ] Review customer support tickets (new issues reported?)
- [ ] Update documentation (if API changes)
- [ ] Announce deployment in company-wide channel

### Within 1 Week

- [ ] Complete deployment post-mortem meeting
- [ ] Update runbook with lessons learned
- [ ] Address technical debt introduced (if any)
- [ ] Plan next release

---

## 🔧 Automation Opportunities

**Current manual steps that could be automated:**

1. Pre-deployment health checks → CI/CD pipeline
2. Database migration dry-run → Automated in staging
3. Smoke tests → Automated test suite
4. Image tagging and pushing → CI/CD
5. Status page updates → Deployment script

**Future improvements:**

- Blue-Green deployment (zero downtime)
- Automated canary analysis (Kayenta, Flagger)
- Auto-rollback on error threshold
- ChatOps integration (deploy via Slack command)

---

## 📖 Related Documents

- [Security Audit Checklist](./security-audit-checklist.md)
- [Performance Testing Plan](./performance-testing-plan.md)
- [Incident Response Plan](./incident-response-plan.md)
- [Architecture Documentation](./crypto-exchange-architecture.md)
- [API Specification](./crypto-exchange-api-spec-complete.md)

---

## ✅ Deployment Checklist (Quick Reference)

**Pre-Deployment:**
- [ ] Code freeze announced
- [ ] Release notes prepared
- [ ] Backup created
- [ ] Deployment team ready

**Deployment:**
- [ ] Maintenance mode enabled
- [ ] Database migrations run
- [ ] Services deployed (correct order)
- [ ] Health checks passed
- [ ] Smoke tests passed

**Post-Deployment:**
- [ ] Maintenance mode disabled
- [ ] Monitoring verified (30 min)
- [ ] Status page updated
- [ ] Deployment report created

**Rollback (if needed):**
- [ ] Kubernetes rollback executed
- [ ] Database rollback (if applicable)
- [ ] Incident ticket created
- [ ] Post-mortem scheduled

---

**Document Owner:** DevOps Team  
**Review Frequency:** After each major deployment  
**Next Review Date:** 2026-01-19

**Version History:**
- v1.0 (2025-11-19): Initial version
- v1.1 (TBD): Update with automation improvements
