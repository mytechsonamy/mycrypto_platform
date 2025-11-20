# CI/CD Pipeline & Branch Strategy
## DevOps Playbook

**Version:** 1.0  
**Last Updated:** 2025-11-19  
**Target:** DevOps Team, Developers  
**Purpose:** Automate build, test, and deployment processes

---

## 🌳 Git Branching Strategy (Git Flow)

### Branch Structure

```
main (production)
  ├── develop (integration)
  │   ├── feature/SHORT-123-add-2fa
  │   ├── feature/SHORT-124-kyc-upload
  │   └── bugfix/SHORT-125-fix-login
  ├── release/v1.0.0
  └── hotfix/SHORT-126-critical-security-patch
```

### Branch Descriptions

| Branch | Purpose | Protected | Merge From | Deploy To |
|--------|---------|-----------|------------|-----------|
| `main` | Production code | ✅ Yes | `release/*`, `hotfix/*` | Production |
| `develop` | Integration | ✅ Yes | `feature/*`, `bugfix/*` | Dev environment |
| `feature/*` | New features | ❌ No | `develop` | Dev (auto) |
| `bugfix/*` | Bug fixes | ❌ No | `develop` | Dev (auto) |
| `release/*` | Release prep | ✅ Yes | `develop` | Staging |
| `hotfix/*` | Emergency fixes | ✅ Yes | `main` | Staging → Production |

---

### Branch Protection Rules

#### `main` Branch

- [x] Require pull request before merging
- [x] Require 2 approvals
- [x] Require status checks to pass:
  - All tests (unit + integration)
  - Lint
  - Security scan
  - Build success
- [x] Require branches to be up to date
- [x] Require signed commits
- [x] Include administrators in restrictions
- [x] Restrict who can push: Release Managers only

#### `develop` Branch

- [x] Require pull request before merging
- [x] Require 1 approval
- [x] Require status checks to pass:
  - All tests
  - Lint
- [x] Require branches to be up to date

---

### Workflow Examples

#### Feature Development

```bash
# 1. Create feature branch from develop
git checkout develop
git pull origin develop
git checkout -b feature/SHORT-123-add-2fa

# 2. Develop and commit
git add .
git commit -m "feat(auth): add TOTP 2FA support"

# 3. Push and create PR
git push origin feature/SHORT-123-add-2fa
# Create PR: feature/SHORT-123-add-2fa → develop

# 4. After PR approval and merge, delete branch
git branch -d feature/SHORT-123-add-2fa
git push origin --delete feature/SHORT-123-add-2fa
```

#### Release Process

```bash
# 1. Create release branch from develop
git checkout develop
git pull origin develop
git checkout -b release/v1.0.0

# 2. Update version, changelog, final fixes
echo "1.0.0" > VERSION
git commit -am "chore: bump version to 1.0.0"

# 3. Merge to main (via PR)
# Create PR: release/v1.0.0 → main

# 4. After merge, tag the release
git checkout main
git pull origin main
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0

# 5. Merge back to develop
git checkout develop
git merge release/v1.0.0
git push origin develop

# 6. Delete release branch
git branch -d release/v1.0.0
git push origin --delete release/v1.0.0
```

#### Hotfix Process

```bash
# 1. Create hotfix from main
git checkout main
git pull origin main
git checkout -b hotfix/SHORT-126-security-fix

# 2. Fix and commit
git commit -am "fix(auth): patch SQL injection vulnerability"

# 3. Merge to main (via PR)
# Create PR: hotfix/SHORT-126-security-fix → main

# 4. Tag hotfix
git checkout main
git tag -a v1.0.1 -m "Hotfix v1.0.1"
git push origin v1.0.1

# 5. Merge to develop
git checkout develop
git merge hotfix/SHORT-126-security-fix
git push origin develop

# 6. Delete hotfix branch
git branch -d hotfix/SHORT-126-security-fix
```

---

## 🏗️ Environments

| Environment | Branch | Auto-Deploy | Purpose |
|-------------|--------|-------------|---------|
| **Development** | `develop`, `feature/*` | ✅ Yes | Daily development, feature testing |
| **QA** | `develop` | ⚠️  Manual | QA team testing |
| **Staging** | `release/*` | ⚠️  Manual | Pre-production validation |
| **Production** | `main` | ❌ Manual (approval) | Live system |

### Environment Configuration

**Dev:**
- **URL:** `https://dev.exchange.com`
- **Database:** `dev-postgres.rds.amazonaws.com`
- **Replica:** No
- **Monitoring:** Basic (Grafana)
- **Data:** Anonymized production data (refreshed weekly)

**QA:**
- **URL:** `https://qa.exchange.com`
- **Database:** `qa-postgres.rds.amazonaws.com`
- **Replica:** No
- **Monitoring:** Full (Prometheus + Grafana)
- **Data:** Synthetic test data

**Staging:**
- **URL:** `https://staging.exchange.com`
- **Database:** `staging-postgres.rds.amazonaws.com`
- **Replica:** Yes (read replica)
- **Monitoring:** Full + alerts
- **Data:** Production-like (obfuscated PII)
- **Infrastructure:** Identical to production (scaled down)

**Production:**
- **URL:** `https://exchange.com`
- **Database:** `prod-postgres.rds.amazonaws.com` (Multi-AZ)
- **Replica:** Yes (read replicas in 2 AZs)
- **Monitoring:** Full + PagerDuty alerts
- **Backup:** Hourly snapshots, 30-day retention

---

## 🚀 CI/CD Pipeline

### Pipeline Overview

```
Code Push → GitHub Actions
  ├─> Lint & Format Check
  ├─> Unit Tests (Jest/Go test/pytest)
  ├─> Integration Tests (Testcontainers)
  ├─> Security Scan (Snyk, Trivy)
  ├─> Build Docker Image
  ├─> Push to Container Registry (ECR)
  └─> Deploy (ArgoCD)
      ├─> Dev (auto)
      ├─> QA (manual approval)
      ├─> Staging (manual approval)
      └─> Production (manual approval + change ticket)
```

---

### GitHub Actions Workflows

#### 1. CI Workflow (All Branches)

**File:** `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: ['**']
  pull_request:
    branches: [develop, main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run ESLint
        run: npm run lint
      
      - name: Run Prettier
        run: npm run format:check

  unit-tests:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        service: [auth-service, wallet-service, trading-service]
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install dependencies
        working-directory: ./services/${{ matrix.service }}
        run: npm ci
      
      - name: Run unit tests
        working-directory: ./services/${{ matrix.service }}
        run: npm run test:cov
      
      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: ./services/${{ matrix.service }}/coverage/lcov.info
          flags: ${{ matrix.service }}

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
      
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
          REDIS_URL: redis://localhost:6379

  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Run Snyk Security Scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high
      
      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          format: 'sarif'
          output: 'trivy-results.sarif'
      
      - name: Upload Trivy results to GitHub Security
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: 'trivy-results.sarif'
```

---

#### 2. Build & Deploy Workflow

**File:** `.github/workflows/deploy.yml`

```yaml
name: Build & Deploy

on:
  push:
    branches:
      - develop
      - main
      - 'release/**'

env:
  AWS_REGION: eu-west-1
  ECR_REGISTRY: 123456789012.dkr.ecr.eu-west-1.amazonaws.com

jobs:
  build:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        service: [auth-service, wallet-service, trading-service, matching-engine]
    steps:
      - uses: actions/checkout@v4
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}
      
      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2
      
      - name: Build and tag Docker image
        working-directory: ./services/${{ matrix.service }}
        run: |
          docker build -t ${{ env.ECR_REGISTRY }}/${{ matrix.service }}:${{ github.sha }} .
          docker tag ${{ env.ECR_REGISTRY }}/${{ matrix.service }}:${{ github.sha }} \
                     ${{ env.ECR_REGISTRY }}/${{ matrix.service }}:latest
      
      - name: Scan image with Trivy
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: ${{ env.ECR_REGISTRY }}/${{ matrix.service }}:${{ github.sha }}
          format: 'sarif'
          output: 'trivy-image-results.sarif'
      
      - name: Push to ECR
        run: |
          docker push ${{ env.ECR_REGISTRY }}/${{ matrix.service }}:${{ github.sha }}
          docker push ${{ env.ECR_REGISTRY }}/${{ matrix.service }}:latest
      
      - name: Update ArgoCD image tag
        run: |
          # Update kustomization.yaml or helm values
          yq eval ".images[0].newTag = \"${{ github.sha }}\"" -i \
            ./k8s/overlays/dev/kustomization.yaml

  deploy-dev:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/develop'
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to Dev via ArgoCD
        run: |
          argocd app sync exchange-dev --grpc-web
        env:
          ARGOCD_SERVER: argocd.exchange.com
          ARGOCD_AUTH_TOKEN: ${{ secrets.ARGOCD_TOKEN }}

  deploy-staging:
    needs: build
    runs-on: ubuntu-latest
    if: startsWith(github.ref, 'refs/heads/release/')
    environment:
      name: staging
      url: https://staging.exchange.com
    steps:
      - name: Deploy to Staging
        run: |
          argocd app sync exchange-staging --grpc-web
        env:
          ARGOCD_SERVER: argocd.exchange.com
          ARGOCD_AUTH_TOKEN: ${{ secrets.ARGOCD_TOKEN }}
      
      - name: Run smoke tests
        run: |
          npm run test:smoke -- --baseUrl https://staging.exchange.com

  deploy-production:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment:
      name: production
      url: https://exchange.com
    steps:
      - name: Create Change Ticket
        run: |
          # Integrate with ticketing system (Jira, ServiceNow)
          echo "Change ticket required for production deploy"
      
      - name: Deploy to Production
        run: |
          argocd app sync exchange-prod --grpc-web
        env:
          ARGOCD_SERVER: argocd.exchange.com
          ARGOCD_AUTH_TOKEN: ${{ secrets.ARGOCD_TOKEN }}
      
      - name: Run smoke tests
        run: |
          npm run test:smoke -- --baseUrl https://exchange.com
      
      - name: Notify Slack
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "🚀 Production deployment complete: ${{ github.sha }}"
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

---

#### 3. Database Migration Workflow

**File:** `.github/workflows/db-migration.yml`

```yaml
name: Database Migration

on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Target environment'
        required: true
        type: choice
        options:
          - dev
          - qa
          - staging
          - production

jobs:
  migrate:
    runs-on: ubuntu-latest
    environment: ${{ github.event.inputs.environment }}
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run migrations
        run: npm run migration:run
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
      
      - name: Verify migrations
        run: npm run migration:show
      
      - name: Create backup (production only)
        if: github.event.inputs.environment == 'production'
        run: |
          pg_dump ${{ secrets.DATABASE_URL }} > backup-$(date +%Y%m%d-%H%M%S).sql
          aws s3 cp backup-*.sql s3://exchange-db-backups/
```

---

## 🐳 Docker Configuration

### Multi-stage Dockerfile (NestJS)

**File:** `services/auth-service/Dockerfile`

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./

# Install dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy source
COPY src ./src

# Build
RUN npm run build

# Runtime stage
FROM node:20-alpine

WORKDIR /app

# Install dumb-init (PID 1 handling)
RUN apk add --no-cache dumb-init

# Copy from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
```

---

### Docker Compose (Local Development)

**File:** `docker-compose.yml`

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: exchange_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  rabbitmq:
    image: rabbitmq:3-management-alpine
    environment:
      RABBITMQ_DEFAULT_USER: rabbitmq
      RABBITMQ_DEFAULT_PASS: rabbitmq
    ports:
      - "5672:5672"
      - "15672:15672"
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq

  auth-service:
    build:
      context: ./services/auth-service
      dockerfile: Dockerfile
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/exchange_dev
      REDIS_URL: redis://redis:6379
      JWT_SECRET: dev-secret-change-in-prod
    ports:
      - "3001:3000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./services/auth-service:/app
      - /app/node_modules

volumes:
  postgres_data:
  redis_data:
  rabbitmq_data:
```

---

## ☸️ Kubernetes Deployment (ArgoCD)

### Kustomize Structure

```
k8s/
├── base/
│   ├── auth-service/
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   ├── hpa.yaml
│   │   └── kustomization.yaml
│   ├── wallet-service/
│   └── ...
└── overlays/
    ├── dev/
    │   ├── kustomization.yaml
    │   └── patches/
    ├── qa/
    ├── staging/
    └── production/
```

### Deployment Example

**File:** `k8s/base/auth-service/deployment.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auth-service
  labels:
    app: auth-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: auth-service
  template:
    metadata:
      labels:
        app: auth-service
        version: v1
    spec:
      serviceAccountName: auth-service
      containers:
        - name: auth-service
          image: 123456789012.dkr.ecr.eu-west-1.amazonaws.com/auth-service:latest
          ports:
            - containerPort: 3000
              name: http
          env:
            - name: NODE_ENV
              value: "production"
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: database-secret
                  key: url
            - name: JWT_SECRET
              valueFrom:
                secretKeyRef:
                  name: jwt-secret
                  key: secret
          resources:
            requests:
              memory: "512Mi"
              cpu: "500m"
            limits:
              memory: "1Gi"
              cpu: "1000m"
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
            timeoutSeconds: 5
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 5
            timeoutSeconds: 3
            failureThreshold: 3
```

---

## 📊 Deployment Metrics & Monitoring

### Key Metrics to Track

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| **Deployment Success Rate** | > 95% | < 90% |
| **Deployment Duration** | < 10 min | > 15 min |
| **Rollback Rate** | < 5% | > 10% |
| **MTTR (Mean Time To Restore)** | < 30 min | > 1 hour |
| **Change Failure Rate** | < 5% | > 10% |

### Deployment Dashboard (Grafana)

- Deployments per day/week
- Success vs. failed deployments
- Average deployment time
- Rollback frequency
- Services deployed by environment

---

## 🔄 Rollback Procedure

### Automatic Rollback Triggers

- Health check failures (3 consecutive)
- Error rate > 5% (within 5 min)
- Response time > 2x baseline

### Manual Rollback

```bash
# Via ArgoCD
argocd app rollback exchange-prod <REVISION>

# Via kubectl
kubectl rollout undo deployment/auth-service -n production

# Verify
kubectl rollout status deployment/auth-service -n production
```

---

## 🔐 Secrets Management

### Development

- `.env` files (git-ignored)
- Example: `.env.example` committed

### QA/Staging/Production

- **AWS Secrets Manager** or **HashiCorp Vault**
- Kubernetes `ExternalSecrets` operator
- Secrets rotated every 90 days

**Example: ExternalSecret**

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: database-secret
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: ClusterSecretStore
  target:
    name: database-secret
    creationPolicy: Owner
  data:
    - secretKey: url
      remoteRef:
        key: prod/database/url
```

---

## 📋 Pre-Deployment Checklist

- [ ] All tests pass (unit + integration)
- [ ] Code review approved (2 reviewers for prod)
- [ ] Security scan passed
- [ ] Database migrations tested
- [ ] Rollback plan documented
- [ ] Monitoring dashboards ready
- [ ] On-call engineer notified
- [ ] Change ticket created (production only)
- [ ] Stakeholders informed

---

## 🚨 Incident Response

### Deployment Failure

1. **Immediate Actions:**
   - Stop deployment
   - Assess impact (% users affected)
   - Rollback if critical

2. **Communication:**
   - Notify #incidents Slack channel
   - Update status page (if customer-facing)

3. **Root Cause Analysis:**
   - Within 24h, document RCA
   - Identify preventive measures

---

**Document Owner:** DevOps Lead  
**Review Frequency:** Monthly  
**Next Review Date:** 2025-12-19
