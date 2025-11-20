# MyCrypto Platform - Development Setup Guide

Complete development infrastructure for the MyCrypto cryptocurrency exchange platform. This guide covers local development setup, Docker deployment, and Kubernetes orchestration.

## Table of Contents

- [Quick Start](#quick-start)
- [Local Development Setup](#local-development-setup)
- [Docker Compose Services](#docker-compose-services)
- [Kubernetes Deployment](#kubernetes-deployment)
- [Environment Configuration](#environment-configuration)
- [CI/CD Pipeline](#cicd-pipeline)
- [Health Checks](#health-checks)
- [Troubleshooting](#troubleshooting)
- [Access Credentials](#access-credentials)

## Quick Start

### Prerequisites

- Docker Desktop (with Kubernetes enabled) or Docker Engine + Docker Compose
- Node.js 20 LTS
- kubectl (for Kubernetes operations)
- Git

### Start Development Environment (5 minutes)

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/mycrypto-platform.git
cd mycrypto-platform

# 2. Copy environment file
cp .env.example .env

# 3. Start all services with Docker Compose
docker-compose up -d

# 4. Wait for services to be healthy
docker-compose ps

# 5. Verify all services
./scripts/verify-services.sh

# 6. Seed database (optional)
npm run db:seed --prefix services/auth-service
```

**Expected output:** All services showing "healthy" status

## Local Development Setup

### 1. Environment Configuration

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your local settings
# Minimum required variables:
# - DATABASE_URL: postgresql://postgres:postgres@localhost:5432/exchange_dev
# - REDIS_URL: redis://localhost:6379
# - JWT_SECRET: (generate a random 32+ character string)
```

### 2. Start Services

```bash
# Start all services in the background
docker-compose up -d

# View logs for all services
docker-compose logs -f

# View logs for specific service
docker-compose logs -f auth-service
docker-compose logs -f postgres
docker-compose logs -f redis
docker-compose logs -f rabbitmq

# Stop all services
docker-compose down

# Remove volumes (WARNING: deletes data)
docker-compose down -v
```

### 3. Verify Services

```bash
# Check service status
docker-compose ps

# Output should show:
# NAME                COMMAND                  SERVICE      STATUS      PORTS
# exchange_postgres   "docker-entrypoint..."   postgres     healthy     0.0.0.0:5432->5432/tcp
# exchange_redis      "redis-server --app..."  redis        healthy     0.0.0.0:6379->6379/tcp
# exchange_rabbitmq   "docker-entrypoint..."   rabbitmq     healthy     0.0.0.0:5672->5672/tcp, 0.0.0.0:15672->15672/tcp
# exchange_auth_serv  "docker-entrypoint..."   auth-service healthy     0.0.0.0:3001->3000/tcp
```

## Docker Compose Services

### PostgreSQL (Port 5432)

**Purpose:** Primary data store for users, orders, transactions

```bash
# Connect to database
psql postgresql://postgres:postgres@localhost:5432/exchange_dev

# Common commands
\dt                    # List tables
\d users               # Describe table structure
SELECT * FROM users;   # Query data
```

**Health Check:** `pg_isready -U postgres`

**Credentials:**
- User: `postgres`
- Password: `postgres`
- Database: `exchange_dev`

### Redis (Port 6379)

**Purpose:** Session store, caching, message broker

```bash
# Connect to Redis
redis-cli -h localhost -p 6379 -a redis_dev_password

# Common commands
PING                   # Test connection
KEYS *                 # List all keys
GET session:123        # Get specific key
FLUSHDB                # Clear all data (development only)
```

**Health Check:** `redis-cli ping`

**Credentials:**
- Host: `localhost`
- Port: `6379`
- Password: `redis_dev_password`

### RabbitMQ (Ports 5672 & 15672)

**Purpose:** Message queue for async tasks (emails, notifications)

**Management UI:** http://localhost:15672

**Credentials:**
- User: `rabbitmq`
- Password: `rabbitmq_dev_password`

**Queue Configuration:**
- `email.notifications` - Outgoing emails
- `sms.notifications` - SMS messages
- `kyc.processing` - KYC verification tasks
- `audit.logs` - Audit trail events
- `user.registration` - User signup events

**Health Check:** `rabbitmq-diagnostics ping`

### Auth Service (Port 3001)

**Purpose:** User authentication and authorization

```bash
# Test health endpoint
curl http://localhost:3001/health

# Expected response:
# {"status": "ok", "timestamp": "2025-11-19T12:00:00Z"}

# Test readiness endpoint
curl http://localhost:3001/health/ready

# Expected response:
# {"status": "ready", "checks": {"database": "ok", "redis": "ok"}}
```

**Key Endpoints:**
- `GET /health` - Liveness probe (dependencies optional)
- `GET /health/ready` - Readiness probe (all dependencies required)
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get current user profile

## Kubernetes Deployment

### Prerequisites

```bash
# Install kubectl
brew install kubectl  # macOS
# or
curl -LO https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl

# Verify installation
kubectl version --client

# Enable Kubernetes in Docker Desktop (Preferences > Kubernetes)
```

### Deploy to Local Kubernetes

```bash
# Create namespace
kubectl create namespace exchange

# Apply secrets (update values first!)
kubectl apply -f k8s/base/auth-service/service.yaml -n exchange

# Deploy auth-service
kubectl apply -f k8s/base/auth-service/deployment.yaml -n exchange

# Verify deployment
kubectl get deployments -n exchange
kubectl get pods -n exchange
kubectl get svc -n exchange

# Check logs
kubectl logs -f deployment/auth-service -n exchange

# Port forward to local machine
kubectl port-forward svc/auth-service 3001:80 -n exchange

# Test service
curl http://localhost:3001/health
```

### Kubernetes Manifests

```
k8s/base/auth-service/
├── deployment.yaml      # Pod deployment specification
├── service.yaml         # Service, RBAC, HPA, PDB, ServiceMonitor
└── kustomization.yaml   # Kustomize configuration

k8s/overlays/
├── dev/                 # Development environment patches
├── staging/             # Staging environment patches
└── production/          # Production environment patches
```

### Key Kubernetes Concepts

**Deployment:**
- 3 replicas for high availability
- Rolling update strategy (maxSurge: 1, maxUnavailable: 0)
- Resource limits: 512Mi RAM / 500m CPU (requests), 1Gi RAM / 1000m CPU (limits)
- Liveness probe: HTTP GET /health every 10s after 30s delay
- Readiness probe: HTTP GET /health/ready every 5s after 10s delay

**Horizontal Pod Autoscaler (HPA):**
- Min replicas: 3
- Max replicas: 10
- CPU target: 70% utilization
- Memory target: 80% utilization

**Pod Disruption Budget (PDB):**
- Minimum available: 1 (ensures at least 1 pod during maintenance)

## Environment Configuration

### Overview

All environment variables are documented in `.env.example`. Copy this file to `.env` for local development.

```bash
cp .env.example .env
# Edit .env as needed
```

### Critical Variables

```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/exchange_dev

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redis_dev_password

# RabbitMQ
RABBITMQ_URL=amqp://rabbitmq:rabbitmq_dev_password@localhost:5672

# JWT
JWT_SECRET=dev-jwt-secret-change-in-production-min-32-chars
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=30d

# Security
BCRYPT_ROUNDS=10
FORCE_HTTPS=false (development only)

# API
API_BASE_URL=http://localhost:3001
CORS_ORIGIN=http://localhost:3000,http://localhost:5173
```

### Production Secrets

For production, use AWS Secrets Manager instead of environment files:

```bash
# Store secrets in AWS
aws secretsmanager create-secret --name prod/database/url --secret-string "postgresql://..."
aws secretsmanager create-secret --name prod/jwt/secret --secret-string "your-secret"

# Kubernetes will fetch these via ExternalSecrets operator
kubectl apply -f k8s/base/external-secrets/
```

## CI/CD Pipeline

### GitHub Actions Workflow

**File:** `.github/workflows/auth-service-ci.yml`

**Triggers:**
- Push to `main`, `develop`, `feature/**`, `bugfix/**`, `release/**`
- Pull requests to `main` or `develop`
- Only runs when `services/auth-service/**` files change

**Jobs:**

1. **Lint** - ESLint and Prettier checks
2. **Unit Tests** - Jest tests with coverage reporting
3. **Integration Tests** - Testcontainers with PostgreSQL, Redis, RabbitMQ
4. **Security Scan** - npm audit, Snyk, Trivy
5. **Build** - Docker image build and push to ECR
6. **Deploy Dev** - Automatic deployment to development environment (from `develop` branch)
7. **Deploy Staging** - Manual deployment to staging (from `release/**` branches)
8. **Deploy Production** - Manual deployment to production (from `main` branch)

### Running Locally

```bash
# Test linting
npm run lint --prefix services/auth-service

# Run unit tests
npm run test:cov --prefix services/auth-service

# Run integration tests
npm run test:integration --prefix services/auth-service

# Build Docker image locally
docker build -t auth-service:local ./services/auth-service

# Test Docker image
docker run -p 3001:3000 auth-service:local
```

## Health Checks

### Liveness Probe (Is the service alive?)

```bash
curl -i http://localhost:3001/health

# Expected response:
# HTTP/1.1 200 OK
# {
#   "status": "ok",
#   "timestamp": "2025-11-19T12:00:00Z"
# }
```

**When to use:** Kubernetes restarts pod if this fails

### Readiness Probe (Is the service ready to serve requests?)

```bash
curl -i http://localhost:3001/health/ready

# Expected response:
# HTTP/1.1 200 OK
# {
#   "status": "ready",
#   "checks": {
#     "database": "ok",
#     "redis": "ok",
#     "rabbitmq": "ok"
#   }
# }
```

**When to use:** Kubernetes removes pod from load balancer if this fails

### Service Verification Script

```bash
#!/bin/bash
echo "PostgreSQL:"
docker-compose exec postgres pg_isready -U postgres

echo "Redis:"
docker-compose exec redis redis-cli ping

echo "RabbitMQ:"
docker-compose exec rabbitmq rabbitmq-diagnostics ping

echo "Auth Service:"
curl -f http://localhost:3001/health || echo "Auth service down"
curl -f http://localhost:3001/health/ready || echo "Auth service not ready"
```

## Troubleshooting

### Service Won't Start

```bash
# Check logs
docker-compose logs auth-service

# Check if ports are in use
lsof -i :3001      # Auth service
lsof -i :5432      # PostgreSQL
lsof -i :6379      # Redis
lsof -i :5672      # RabbitMQ

# Kill process using port
kill -9 <PID>

# Restart services
docker-compose restart auth-service
```

### Database Connection Error

```bash
# Verify PostgreSQL is running
docker-compose ps postgres

# Check credentials
psql postgresql://postgres:postgres@localhost:5432/exchange_dev

# Reset database
docker-compose down -v postgres
docker-compose up -d postgres
docker-compose exec postgres psql -U postgres -c "CREATE DATABASE exchange_dev;"

# Run migrations
npm run migration:run --prefix services/auth-service
```

### Redis Connection Error

```bash
# Verify Redis is running
docker-compose ps redis

# Test Redis connection
redis-cli -h localhost -p 6379 -a redis_dev_password ping

# Clear Redis data
redis-cli -h localhost -p 6379 -a redis_dev_password FLUSHDB

# Restart Redis
docker-compose restart redis
```

### RabbitMQ Issues

```bash
# Verify RabbitMQ is running
docker-compose ps rabbitmq

# Check management UI
open http://localhost:15672  # User: rabbitmq, Pass: rabbitmq_dev_password

# View queue status
docker-compose exec rabbitmq rabbitmqctl list_queues

# Reset RabbitMQ (WARNING: deletes all queues and messages)
docker-compose down -v rabbitmq
docker-compose up -d rabbitmq
```

### Kubernetes Pod Stuck in CrashLoopBackOff

```bash
# Check pod logs
kubectl logs -f pod/<pod-name> -n exchange

# Describe pod for events
kubectl describe pod <pod-name> -n exchange

# Check resource limits
kubectl top pods -n exchange

# Delete pod to trigger restart
kubectl delete pod <pod-name> -n exchange
```

## Access Credentials

### Local Development

| Service | URL | User | Password |
|---------|-----|------|----------|
| PostgreSQL | localhost:5432 | postgres | postgres |
| Redis | localhost:6379 | - | redis_dev_password |
| RabbitMQ Management | http://localhost:15672 | rabbitmq | rabbitmq_dev_password |
| Auth Service | http://localhost:3001 | - | - |
| Prometheus | http://localhost:9090 | - | - |
| Grafana | http://localhost:3000 | admin | admin |

### Kubernetes (Dev)

```bash
# Get auth-service URL
kubectl get svc auth-service -n exchange

# Port forward to local
kubectl port-forward svc/auth-service 3001:80 -n exchange

# View secret values
kubectl get secret database-secret -n exchange -o jsonpath='{.data.url}' | base64 -d
```

### AWS Production

| Service | Endpoint |
|---------|----------|
| RDS PostgreSQL | prod-postgres.rds.amazonaws.com:5432 |
| ElastiCache Redis | prod-redis.xxxxx.cache.amazonaws.com:6379 |
| RabbitMQ (MQ Broker) | prod-mq.xxxxx.mq.eu-west-1.amazonaws.com |
| Auth Service (ELB) | auth-service-load-balancer.xxxxx.elb.eu-west-1.amazonaws.com |

## Next Steps

1. **Database Agent** - Create schema migrations
2. **Backend Agent** - Implement API endpoints
3. **Frontend Agent** - Build React UI
4. **QA Engineer** - Write test scenarios

## Support

For infrastructure issues, contact the DevOps team at devops@exchange.com

## Document Metadata

- **Last Updated:** 2025-11-19
- **Version:** 1.0.0
- **Owner:** DevOps Team
- **Next Review:** 2025-12-19
