# TRADE ENGINE - SPRINT 1 DETAILED PLAN
## Complete Task Breakdown & Day 1 Assignments

**Project:** MyTrader White-Label Kripto Exchange Platform
**Component:** Trade Engine - Sprint 1 (Foundation & Infrastructure)
**Version:** 1.0
**Date:** 2024-11-23
**Sprint Duration:** Days 1-12 (Foundation & Infrastructure Phase)
**Prepared by:** Tech Lead Agent

---

## EXECUTIVE SUMMARY

Sprint 1 establishes the complete foundational infrastructure for the Trade Engine with all core components operational. This sprint focuses on:

- Complete service scaffolding with Go/NestJS
- Production-ready database schemas with partitioning
- RabbitMQ message queue infrastructure (MVP choice)
- Wallet Service API extensions for trade integration
- Docker containerization and CI/CD pipeline
- Monitoring and observability setup

**Sprint Goal:** All services running, database operational, CI/CD working - Quality Gate 1

---

## SPRINT 1 BACKLOG

### Story Point Distribution

| Story ID | Title | Points | Agent | Priority | Days |
|----------|-------|--------|-------|----------|------|
| TE-101 | Docker Containerization | 3 | DevOps | P0 | 1 |
| TE-102 | Database Schema Implementation | 5 | Database | P0 | 2 |
| TE-103 | Redis Setup for Order Book | 2 | DevOps | P0 | 1 |
| TE-104 | Message Queue Setup (RabbitMQ) | 3 | DevOps | P0 | 1.5 |
| TE-105 | API Scaffolding (REST + WebSocket) | 5 | Backend | P0 | 2 |
| TE-106 | Configuration Management | 2 | Backend | P0 | 1 |
| TE-107 | Monitoring & Observability Setup | 5 | DevOps | P1 | 2 |
| TE-108 | CI/CD Pipeline (GitHub Actions) | 5 | DevOps | P1 | 2 |
| TE-109 | Wallet Service API Extensions | 8 | Backend | P0 | 3.5 |

**Total Story Points:** 38 points
**Team Capacity:** 60 agent-days (6 agents × 10 days)
**Velocity Target:** 38 points in 12 days

---

## DETAILED USER STORIES

### TE-101: Docker Containerization

**Epic:** EPIC-1 (Infrastructure & DevOps)
**Points:** 3
**Owner:** DevOps Agent
**Priority:** P0 (Critical)
**Estimated:** 1 day

**Description:**
As a developer, I want the Trade Engine to run in Docker containers so that we have consistent environments across dev/staging/prod.

**Acceptance Criteria:**
- Dockerfile for Trade Engine service (Go 1.21)
- Docker Compose for local development (all dependencies)
- Multi-stage build for optimization
- Health check endpoint included
- Environment variables externalized
- Build time < 2 minutes

**Technical Specifications:**
```dockerfile
# Multi-stage build
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o trade-engine ./cmd/server

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/trade-engine .
COPY --from=builder /app/config ./config
EXPOSE 8080 8081 9090
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -qO- http://localhost:8080/health || exit 1
CMD ["./trade-engine"]
```

**Docker Compose Services:**
- Trade Engine (Go service)
- PostgreSQL 16
- Redis 7
- RabbitMQ 3.12
- PgBouncer (connection pooling)

**Definition of Done:**
- Code reviewed by Backend Agent
- Builds successfully in <2 minutes
- Passes health check
- docker-compose up runs all services
- Documentation in README.md
- Deployed to local dev environment

---

### TE-102: Database Schema Implementation

**Epic:** EPIC-1 (Infrastructure & DevOps)
**Points:** 5
**Owner:** Database Agent
**Priority:** P0 (Critical)
**Estimated:** 2 days

**Description:**
As a backend developer, I need production-ready database tables so that I can store orders, trades, and related data.

**Acceptance Criteria:**
- `orders` table with monthly partitioning
- `trades` table with daily partitioning
- Appropriate indexes for performance
- ENUM types defined (order_side, order_type, order_status)
- Foreign key constraints
- Check constraints for data integrity
- Migration scripts (up and down)
- Performance: >1000 inserts/sec

**Schema Details:**

```sql
-- ENUM Types (aligned with global schema V2.1)
CREATE TYPE order_side_enum AS ENUM ('BUY', 'SELL');
CREATE TYPE order_type_enum AS ENUM ('MARKET', 'LIMIT', 'STOP', 'STOP_LIMIT');
CREATE TYPE order_status_enum AS ENUM ('PENDING', 'OPEN', 'PARTIALLY_FILLED', 'FILLED', 'CANCELLED', 'REJECTED', 'EXPIRED');
CREATE TYPE time_in_force_enum AS ENUM ('GTC', 'IOC', 'FOK', 'DAY');

-- Orders Table with Partitioning
CREATE TABLE orders (
  order_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  institution_id UUID,
  symbol VARCHAR(20) NOT NULL,
  side order_side_enum NOT NULL,
  order_type order_type_enum NOT NULL,
  status order_status_enum NOT NULL DEFAULT 'PENDING',
  quantity DECIMAL(20,8) NOT NULL,
  filled_quantity DECIMAL(20,8) DEFAULT 0,
  price DECIMAL(20,8),
  stop_price DECIMAL(20,8),
  time_in_force time_in_force_enum DEFAULT 'GTC',
  client_order_id VARCHAR(100),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  filled_at TIMESTAMP,
  cancelled_at TIMESTAMP,

  CONSTRAINT chk_quantity_positive CHECK (quantity > 0),
  CONSTRAINT chk_filled_lte_quantity CHECK (filled_quantity <= quantity),
  CONSTRAINT chk_market_no_price CHECK (order_type != 'MARKET' OR price IS NULL),
  CONSTRAINT chk_limit_has_price CHECK (order_type != 'LIMIT' OR price IS NOT NULL)
) PARTITION BY RANGE (created_at);

-- Indexes
CREATE INDEX idx_orders_user_symbol_status ON orders(user_id, symbol, status);
CREATE INDEX idx_orders_symbol_status ON orders(symbol, status) WHERE status IN ('OPEN', 'PARTIALLY_FILLED');
CREATE INDEX idx_orders_status_created ON orders(status, created_at);
CREATE UNIQUE INDEX idx_orders_client_order ON orders(client_order_id, user_id) WHERE client_order_id IS NOT NULL;

-- Initial Partitions (November-December 2024)
CREATE TABLE orders_2024_11 PARTITION OF orders
  FOR VALUES FROM ('2024-11-01') TO ('2024-12-01');
CREATE TABLE orders_2024_12 PARTITION OF orders
  FOR VALUES FROM ('2024-12-01') TO ('2025-01-01');

-- Trades Table
CREATE TABLE trades (
  trade_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol VARCHAR(20) NOT NULL,
  buyer_order_id UUID NOT NULL,
  seller_order_id UUID NOT NULL,
  buyer_user_id UUID NOT NULL,
  seller_user_id UUID NOT NULL,
  price DECIMAL(20,8) NOT NULL,
  quantity DECIMAL(20,8) NOT NULL,
  buyer_fee DECIMAL(20,8) NOT NULL DEFAULT 0,
  seller_fee DECIMAL(20,8) NOT NULL DEFAULT 0,
  is_buyer_maker BOOLEAN NOT NULL,
  executed_at TIMESTAMP NOT NULL DEFAULT NOW(),

  FOREIGN KEY (buyer_order_id) REFERENCES orders(order_id),
  FOREIGN KEY (seller_order_id) REFERENCES orders(order_id)
) PARTITION BY RANGE (executed_at);

-- Indexes for Trades
CREATE INDEX idx_trades_buyer ON trades(buyer_user_id, executed_at DESC);
CREATE INDEX idx_trades_seller ON trades(seller_user_id, executed_at DESC);
CREATE INDEX idx_trades_symbol_time ON trades(symbol, executed_at DESC);

-- Daily Partitions for Trades
CREATE TABLE trades_2024_11_23 PARTITION OF trades
  FOR VALUES FROM ('2024-11-23') TO ('2024-11-24');
```

**Migration Management:**
- Use golang-migrate or Flyway
- Automated partition management (monthly for orders, daily for trades)
- Rollback scripts for each migration

**Definition of Done:**
- Code reviewed by Tech Lead
- Migration runs without errors
- All constraints tested
- Performance benchmarked (>1000 inserts/sec)
- Rollback script tested
- Documentation updated

---

### TE-103: Redis Setup for Order Book

**Epic:** EPIC-1 (Infrastructure & DevOps)
**Points:** 2
**Owner:** DevOps Agent
**Priority:** P0 (Critical)
**Estimated:** 1 day

**Description:**
As a backend developer, I need Redis configured for in-memory order book storage.

**Acceptance Criteria:**
- Redis 7.x deployed
- Persistence configured (AOF + RDB)
- Max memory policy set (noeviction for order data)
- Connection pooling configured (100 connections)
- Health monitoring enabled
- Redis cluster mode (for HA) or Sentinel (simpler)

**Configuration:**
```yaml
# redis.conf
port 6379
bind 0.0.0.0
protected-mode no
requirepass ${REDIS_PASSWORD}

# Persistence
appendonly yes
appendfsync everysec
save 900 1
save 300 10
save 60 10000

# Memory
maxmemory 32gb
maxmemory-policy noeviction

# Performance
tcp-backlog 511
timeout 0
tcp-keepalive 300
```

**Docker Compose:**
```yaml
redis:
  image: redis:7-alpine
  ports:
    - "6379:6379"
  volumes:
    - redis_data:/data
    - ./config/redis.conf:/usr/local/etc/redis/redis.conf
  command: redis-server /usr/local/etc/redis/redis.conf
  healthcheck:
    test: ["CMD", "redis-cli", "ping"]
    interval: 10s
    timeout: 3s
    retries: 5
```

**Definition of Done:**
- Redis running in container
- Persistence verified (AOF + RDB)
- Connection pool tested under load (100 connections)
- Monitoring alerts configured
- Health check endpoint working
- Documentation in README.md

---

### TE-104: Message Queue Setup (RabbitMQ)

**Epic:** EPIC-1 (Infrastructure & DevOps)
**Points:** 3
**Owner:** DevOps Agent
**Priority:** P0 (Critical)
**Estimated:** 1.5 days

**Description:**
As a backend developer, I need a message queue for publishing trade events so that other services can consume them asynchronously.

**Technology Decision: RabbitMQ for MVP**

**Rationale:**
- Simpler setup than Kafka (faster MVP delivery)
- Sufficient for 1000 orders/sec MVP target
- Can migrate to Kafka later if needed
- Excellent Go client libraries
- Lower operational complexity

**Acceptance Criteria:**
- RabbitMQ 3.12 deployed
- Exchanges created (`trade.events`, `order.events`)
- Queues configured with durability
- Dead letter queue setup
- Producer/consumer tested
- Monitoring configured (management UI)

**Queue Configuration:**
```yaml
exchanges:
  - name: trade.events
    type: topic
    durable: true
  - name: order.events
    type: topic
    durable: true

queues:
  - name: wallet.service.trades
    durable: true
    arguments:
      x-message-ttl: 86400000  # 24 hours
      x-dead-letter-exchange: dlx
      x-dead-letter-routing-key: failed.trades

  - name: notification.service.trades
    durable: true

  - name: dlx.failed
    durable: true
```

**Docker Compose:**
```yaml
rabbitmq:
  image: rabbitmq:3-management-alpine
  ports:
    - "5672:5672"    # AMQP
    - "15672:15672"  # Management UI
  environment:
    RABBITMQ_DEFAULT_USER: admin
    RABBITMQ_DEFAULT_PASS: ${RABBITMQ_PASSWORD}
  volumes:
    - rabbitmq_data:/var/lib/rabbitmq
    - ./config/rabbitmq.conf:/etc/rabbitmq/rabbitmq.conf
  healthcheck:
    test: rabbitmq-diagnostics -q ping
    interval: 30s
    timeout: 10s
    retries: 5
```

**Definition of Done:**
- RabbitMQ running and healthy
- Exchanges and queues created
- Producer can send 1000 msgs/sec
- Consumer group setup verified
- Dead letter queue tested
- Management UI accessible
- Monitoring alerts configured

---

### TE-105: API Scaffolding (REST + WebSocket)

**Epic:** EPIC-2 (Core Order Management)
**Points:** 5
**Owner:** Backend Agent
**Priority:** P0 (Critical)
**Estimated:** 2 days

**Description:**
As a developer, I need basic API structure with routing, middleware, and error handling.

**Technology Stack:**
- Language: Go 1.21
- HTTP Framework: Chi Router
- WebSocket: Gorilla WebSocket
- Validation: go-playground/validator
- Logging: zap (structured JSON)

**Acceptance Criteria:**
- HTTP server (Chi framework)
- WebSocket server (gorilla/websocket)
- JWT authentication middleware
- Rate limiting middleware (Redis-based)
- Error handling middleware
- Request validation
- Logging middleware (structured JSON)
- Health check endpoints (/health/live, /health/ready)

**Project Structure:**
```
/services/trade-engine/
├── cmd/
│   └── server/
│       └── main.go
├── internal/
│   ├── api/
│   │   ├── http/
│   │   │   ├── router.go
│   │   │   ├── middleware/
│   │   │   │   ├── auth.go
│   │   │   │   ├── ratelimit.go
│   │   │   │   ├── logging.go
│   │   │   │   └── recovery.go
│   │   │   └── handlers/
│   │   │       ├── health.go
│   │   │       ├── orders.go
│   │   │       └── trades.go
│   │   └── websocket/
│   │       ├── server.go
│   │       ├── handler.go
│   │       └── client.go
│   ├── domain/
│   │   ├── order.go
│   │   ├── trade.go
│   │   └── orderbook.go
│   ├── repository/
│   │   ├── order_repository.go
│   │   └── trade_repository.go
│   ├── service/
│   │   ├── order_service.go
│   │   ├── matching_engine.go
│   │   └── event_publisher.go
│   └── config/
│       └── config.go
├── pkg/
│   ├── logger/
│   │   └── logger.go
│   ├── metrics/
│   │   └── prometheus.go
│   └── errors/
│       └── errors.go
├── config/
│   ├── config.yaml
│   └── config.example.yaml
├── go.mod
├── go.sum
├── Dockerfile
└── README.md
```

**Middleware Chain:**
```go
router := chi.NewRouter()

// Global middleware
router.Use(middleware.RealIP)
router.Use(middleware.Logger)
router.Use(middleware.Recoverer)
router.Use(middleware.RequestID)
router.Use(middleware.Timeout(60 * time.Second))

// Custom middleware
router.Use(logging.Middleware(logger))
router.Use(metrics.Middleware())
router.Use(cors.Handler(corsConfig))

// API routes (authenticated)
router.Route("/api/v1", func(r chi.Router) {
    r.Use(auth.JWTAuthMiddleware)
    r.Use(ratelimit.UserRateLimitMiddleware)

    r.Post("/orders", handlers.PlaceOrder)
    r.Get("/orders/{orderID}", handlers.GetOrder)
    r.Delete("/orders/{orderID}", handlers.CancelOrder)
    r.Get("/trades", handlers.GetTrades)
})

// Health checks (unauthenticated)
router.Get("/health/live", handlers.LivenessCheck)
router.Get("/health/ready", handlers.ReadinessCheck)

// Metrics (unauthenticated, scraped by Prometheus)
router.Get("/metrics", promhttp.Handler())

// WebSocket (authenticated via query param token)
router.Get("/ws", websocket.Handler)
```

**Definition of Done:**
- All middleware tested
- Rate limiting verified (10 req/sec per user)
- WebSocket handshake works
- Logs in JSON format
- Health checks return correct status
- API documentation started (OpenAPI spec)
- Unit tests for middleware (>80% coverage)

---

### TE-106: Configuration Management

**Epic:** EPIC-1 (Infrastructure & DevOps)
**Points:** 2
**Owner:** Backend Agent
**Priority:** P0 (Critical)
**Estimated:** 1 day

**Description:**
As a developer, I need centralized configuration management using environment variables and config files.

**Acceptance Criteria:**
- YAML config file structure
- Environment variable overrides
- Config validation on startup
- Secret management (placeholder for Vault)
- Config hot-reload capability (optional for MVP)
- Default values for all settings

**Configuration Library:** viper (Go)

**Config Structure:**
```yaml
# config/config.yaml
server:
  http_port: 8080
  websocket_port: 8081
  metrics_port: 9090
  read_timeout: 60s
  write_timeout: 60s
  shutdown_timeout: 30s

database:
  host: ${DATABASE_HOST:localhost}
  port: ${DATABASE_PORT:5432}
  name: ${DATABASE_NAME:mytrader}
  user: ${DATABASE_USER:postgres}
  password: ${DATABASE_PASSWORD}
  max_open_conns: 100
  max_idle_conns: 10
  conn_max_lifetime: 1h
  log_queries: ${DATABASE_LOG_QUERIES:false}

redis:
  host: ${REDIS_HOST:localhost}
  port: ${REDIS_PORT:6379}
  password: ${REDIS_PASSWORD}
  db: ${REDIS_DB:0}
  pool_size: 100
  max_retries: 3

rabbitmq:
  url: ${RABBITMQ_URL:amqp://guest:guest@localhost:5672/}
  exchange_trade_events: trade.events
  exchange_order_events: order.events
  publisher_confirms: true

matching:
  symbols: [BTC/USDT, ETH/USDT, XRP/USDT]
  tick_sizes:
    BTC/USDT: "0.01"
    ETH/USDT: "0.01"
    XRP/USDT: "0.0001"
  min_order_sizes:
    BTC/USDT: "0.0001"
    ETH/USDT: "0.001"
    XRP/USDT: "10"

logging:
  level: ${LOG_LEVEL:info}
  format: json
  output: stdout

monitoring:
  prometheus_enabled: true
  jaeger_enabled: ${JAEGER_ENABLED:false}
  jaeger_endpoint: ${JAEGER_ENDPOINT}
```

**Config Loader:**
```go
package config

import (
    "github.com/spf13/viper"
    "time"
)

type Config struct {
    Server     ServerConfig
    Database   DatabaseConfig
    Redis      RedisConfig
    RabbitMQ   RabbitMQConfig
    Matching   MatchingConfig
    Logging    LoggingConfig
    Monitoring MonitoringConfig
}

func Load(configPath string) (*Config, error) {
    viper.SetConfigFile(configPath)
    viper.AutomaticEnv()
    viper.SetEnvPrefix("TRADE_ENGINE")

    if err := viper.ReadInConfig(); err != nil {
        return nil, fmt.Errorf("failed to read config: %w", err)
    }

    var config Config
    if err := viper.Unmarshal(&config); err != nil {
        return nil, fmt.Errorf("failed to unmarshal config: %w", err)
    }

    // Validate config
    if err := config.Validate(); err != nil {
        return nil, fmt.Errorf("invalid config: %w", err)
    }

    return &config, nil
}

func (c *Config) Validate() error {
    // Validation logic
    if c.Server.HTTPPort == 0 {
        return fmt.Errorf("server.http_port is required")
    }
    if c.Database.Host == "" {
        return fmt.Errorf("database.host is required")
    }
    // ... more validations
    return nil
}
```

**Definition of Done:**
- Config loads from file and env vars
- Invalid config causes startup failure
- All options documented
- Example config files provided
- Validation tests pass
- README updated with config guide

---

### TE-107: Monitoring & Observability Setup

**Epic:** EPIC-1 (Infrastructure & DevOps)
**Points:** 5
**Owner:** DevOps Agent
**Priority:** P1 (High)
**Estimated:** 2 days

**Description:**
As an operator, I need monitoring dashboards and alerting so that I can track system health.

**Acceptance Criteria:**
- Prometheus metrics endpoint
- Grafana dashboards
- Alert rules configured
- Key metrics exposed (orders/sec, latency, errors)
- Distributed tracing setup (Jaeger)

**Metrics to Expose:**
```go
// Business Metrics
ordersPlacedTotal = promauto.NewCounterVec(
    prometheus.CounterOpts{
        Name: "orders_placed_total",
        Help: "Total number of orders placed",
    },
    []string{"symbol", "type", "side"},
)

ordersMatchedTotal = promauto.NewCounterVec(
    prometheus.CounterOpts{
        Name: "orders_matched_total",
        Help: "Total number of orders matched",
    },
    []string{"symbol"},
)

// Performance Metrics
orderPlacementDuration = promauto.NewHistogramVec(
    prometheus.HistogramOpts{
        Name:    "order_placement_duration_seconds",
        Help:    "Order placement latency distribution",
        Buckets: prometheus.DefBuckets,
    },
    []string{"symbol"},
)

matchingDuration = promauto.NewHistogram(
    prometheus.HistogramOpts{
        Name:    "matching_duration_seconds",
        Help:    "Matching engine latency",
        Buckets: []float64{.001, .002, .005, .01, .02, .05, .1},
    },
)

// System Metrics (auto-collected)
// - go_goroutines
// - go_memstats_alloc_bytes
// - http_requests_total
```

**Grafana Dashboard:**
- Trading volume (real-time)
- Order funnel (placed → filled)
- Performance (latency p50/p95/p99)
- System health (CPU, memory, goroutines)
- Error rate

**Alert Rules:**
```yaml
groups:
- name: trade_engine_alerts
  interval: 30s
  rules:
  - alert: HighOrderLatency
    expr: histogram_quantile(0.99, order_placement_duration_seconds) > 0.2
    for: 2m
    annotations:
      summary: "Order placement latency too high"

  - alert: MatchingEngineStopped
    expr: rate(orders_matched_total[1m]) == 0 AND rate(orders_placed_total[1m]) > 0
    for: 1m
    annotations:
      summary: "Matching engine appears stopped"
```

**Definition of Done:**
- Metrics endpoint /metrics works
- Dashboard shows real-time data
- Alerts trigger correctly
- Jaeger tracing operational
- Runbook created for alerts
- Documentation in README.md

---

### TE-108: CI/CD Pipeline (GitHub Actions)

**Epic:** EPIC-1 (Infrastructure & DevOps)
**Points:** 5
**Owner:** DevOps Agent
**Priority:** P1 (High)
**Estimated:** 2 days

**Description:**
As a developer, I want automated builds and deployments so that we can release frequently with confidence.

**Acceptance Criteria:**
- Build pipeline (compile, test, lint)
- Docker image build & push
- Automated tests run on PR
- Staging deployment on merge to main
- Production deployment manual trigger
- Rollback capability

**GitHub Actions Workflow:**
```yaml
name: CI/CD Pipeline

on:
  push:
    branches: ['main', 'develop']
  pull_request:
    branches: ['main', 'develop']

env:
  GO_VERSION: '1.21'
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}/trade-engine

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v4
        with:
          go-version: ${{ env.GO_VERSION }}
      - name: Run golangci-lint
        uses: golangci/golangci-lint-action@v3
        with:
          version: latest

  test:
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
      - uses: actions/setup-go@v4
        with:
          go-version: ${{ env.GO_VERSION }}

      - name: Run tests
        run: |
          go test -v -race -coverprofile=coverage.txt -covermode=atomic ./...

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage.txt

  build-and-push:
    needs: [lint, test]
    runs-on: ubuntu-latest
    if: github.event_name == 'push'
    permissions:
      contents: read
      packages: write

    steps:
      - uses: actions/checkout@v4

      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: |
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest

  deploy-staging:
    needs: build-and-push
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment:
      name: staging
      url: https://staging.mytrader.com

    steps:
      - name: Deploy to Kubernetes
        run: |
          # Update image tag in k8s manifests
          # kubectl set image deployment/trade-engine ...
          echo "Deploying to staging"
```

**Definition of Done:**
- Pipeline runs on every PR
- All tests pass
- Docker image pushed to registry
- Staging auto-deploys on main
- Production deployment available (manual)
- Rollback tested
- Documentation updated

---

### TE-109: Wallet Service API Extensions

**Epic:** EPIC-4 (Trade Execution & Settlement)
**Points:** 8
**Owner:** Backend Agent
**Priority:** P0 (Critical)
**Estimated:** 3.5 days

**Description:**
As a Trade Engine, I need to integrate with Wallet Service for balance management (reserve, release, settle-trade operations).

**Background:**
The existing Wallet Service (NestJS) manages user balances via a ledger system. Trade Engine needs new API endpoints to:
1. Reserve balance when order is placed
2. Release balance when order is cancelled
3. Settle trade (atomic balance transfer between buyer/seller)

**Acceptance Criteria:**
- New API endpoints in Wallet Service: `/reserve`, `/release`, `/settle-trade`
- Trade Engine client library for Wallet Service integration
- Atomic transactions for trade settlement
- Idempotency for all operations
- Error handling and retry logic
- Integration tests between services
- Circuit breaker pattern for resilience

**API Design:**

**1. Reserve Balance (When Order Placed)**
```typescript
POST /api/v1/wallets/reserve

Request:
{
  "user_id": "uuid",
  "asset": "USDT",
  "amount": "1000.00",
  "order_id": "uuid",  // Idempotency key
  "reason": "BUY_ORDER"
}

Response:
{
  "success": true,
  "reservation_id": "uuid",
  "available_balance": "4000.00",
  "reserved_balance": "1000.00"
}
```

**2. Release Balance (When Order Cancelled)**
```typescript
POST /api/v1/wallets/release

Request:
{
  "user_id": "uuid",
  "asset": "USDT",
  "amount": "1000.00",
  "order_id": "uuid",  // Must match reservation
  "reason": "ORDER_CANCELLED"
}

Response:
{
  "success": true,
  "available_balance": "5000.00",
  "reserved_balance": "0.00"
}
```

**3. Settle Trade (When Trade Executed)**
```typescript
POST /api/v1/wallets/settle-trade

Request:
{
  "trade_id": "uuid",  // Idempotency key
  "buyer_user_id": "uuid",
  "seller_user_id": "uuid",
  "base_asset": "BTC",
  "quote_asset": "USDT",
  "quantity": "0.5",
  "price": "50000.00",
  "buyer_fee": "0.0005",
  "seller_fee": "25.00",
  "buyer_fee_asset": "BTC",
  "seller_fee_asset": "USDT"
}

Response:
{
  "success": true,
  "buyer_ledger_entry_id": "uuid",
  "seller_ledger_entry_id": "uuid",
  "buyer_balances": {
    "BTC": { "available": "0.4995", "reserved": "0.00" },
    "USDT": { "available": "0.00", "reserved": "0.00" }
  },
  "seller_balances": {
    "BTC": { "available": "0.00", "reserved": "0.00" },
    "USDT": { "available": "24975.00", "reserved": "0.00" }
  }
}
```

**Wallet Service Implementation (NestJS):**

```typescript
// services/wallet-service/src/wallet/wallet.controller.ts

@Controller('api/v1/wallets')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Post('reserve')
  @UsePipes(new ValidationPipe({ transform: true }))
  async reserveBalance(@Body() dto: ReserveBalanceDto) {
    return await this.walletService.reserveBalance(dto);
  }

  @Post('release')
  @UsePipes(new ValidationPipe({ transform: true }))
  async releaseBalance(@Body() dto: ReleaseBalanceDto) {
    return await this.walletService.releaseBalance(dto);
  }

  @Post('settle-trade')
  @UsePipes(new ValidationPipe({ transform: true }))
  async settleTrade(@Body() dto: SettleTradeDto) {
    return await this.walletService.settleTrade(dto);
  }
}

// services/wallet-service/src/wallet/wallet.service.ts

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wallet) private walletRepo: Repository<Wallet>,
    @InjectRepository(LedgerEntry) private ledgerRepo: Repository<LedgerEntry>,
    private readonly logger: LoggerService,
  ) {}

  async reserveBalance(dto: ReserveBalanceDto): Promise<ReserveBalanceResponse> {
    return await this.walletRepo.manager.transaction(async (transactionalEntityManager) => {
      // Check idempotency
      const existing = await transactionalEntityManager.findOne(LedgerEntry, {
        where: { reference_id: dto.order_id, entry_type: 'RESERVE' }
      });

      if (existing) {
        // Already reserved, return success (idempotent)
        return this.buildReserveResponse(dto.user_id, dto.asset);
      }

      // Get current wallet
      const wallet = await transactionalEntityManager.findOne(Wallet, {
        where: { user_id: dto.user_id, asset: dto.asset },
        lock: { mode: 'pessimistic_write' }
      });

      if (!wallet || wallet.available_balance < dto.amount) {
        throw new BadRequestException('Insufficient balance');
      }

      // Update wallet balances
      wallet.available_balance -= dto.amount;
      wallet.reserved_balance += dto.amount;
      await transactionalEntityManager.save(wallet);

      // Create ledger entry
      const ledgerEntry = this.ledgerRepo.create({
        user_id: dto.user_id,
        asset: dto.asset,
        amount: dto.amount,
        entry_type: 'RESERVE',
        reference_id: dto.order_id,
        description: `Reserved for order ${dto.order_id}`,
        created_at: new Date(),
      });
      await transactionalEntityManager.save(ledgerEntry);

      this.logger.log('Balance reserved', { user_id: dto.user_id, amount: dto.amount });

      return {
        success: true,
        reservation_id: ledgerEntry.id,
        available_balance: wallet.available_balance,
        reserved_balance: wallet.reserved_balance,
      };
    });
  }

  async releaseBalance(dto: ReleaseBalanceDto): Promise<ReleaseBalanceResponse> {
    return await this.walletRepo.manager.transaction(async (transactionalEntityManager) => {
      // Check if already released (idempotency)
      const existing = await transactionalEntityManager.findOne(LedgerEntry, {
        where: { reference_id: dto.order_id, entry_type: 'RELEASE' }
      });

      if (existing) {
        return this.buildReleaseResponse(dto.user_id, dto.asset);
      }

      // Get wallet with lock
      const wallet = await transactionalEntityManager.findOne(Wallet, {
        where: { user_id: dto.user_id, asset: dto.asset },
        lock: { mode: 'pessimistic_write' }
      });

      if (!wallet || wallet.reserved_balance < dto.amount) {
        throw new BadRequestException('Invalid release amount');
      }

      // Release reserved balance
      wallet.reserved_balance -= dto.amount;
      wallet.available_balance += dto.amount;
      await transactionalEntityManager.save(wallet);

      // Create ledger entry
      const ledgerEntry = this.ledgerRepo.create({
        user_id: dto.user_id,
        asset: dto.asset,
        amount: dto.amount,
        entry_type: 'RELEASE',
        reference_id: dto.order_id,
        description: `Released from order ${dto.order_id}`,
        created_at: new Date(),
      });
      await transactionalEntityManager.save(ledgerEntry);

      return {
        success: true,
        available_balance: wallet.available_balance,
        reserved_balance: wallet.reserved_balance,
      };
    });
  }

  async settleTrade(dto: SettleTradeDto): Promise<SettleTradeResponse> {
    return await this.walletRepo.manager.transaction(async (transactionalEntityManager) => {
      // Idempotency check
      const existing = await transactionalEntityManager.findOne(LedgerEntry, {
        where: { reference_id: dto.trade_id }
      });

      if (existing) {
        return this.buildSettleResponse(dto.buyer_user_id, dto.seller_user_id);
      }

      // Lock all 4 wallets (buyer BTC, buyer USDT, seller BTC, seller USDT)
      const buyerBaseWallet = await this.getWalletWithLock(
        transactionalEntityManager, dto.buyer_user_id, dto.base_asset
      );
      const buyerQuoteWallet = await this.getWalletWithLock(
        transactionalEntityManager, dto.buyer_user_id, dto.quote_asset
      );
      const sellerBaseWallet = await this.getWalletWithLock(
        transactionalEntityManager, dto.seller_user_id, dto.base_asset
      );
      const sellerQuoteWallet = await this.getWalletWithLock(
        transactionalEntityManager, dto.seller_user_id, dto.quote_asset
      );

      const totalQuote = dto.quantity * dto.price;

      // Buyer: Release reserved quote, receive base (minus fee)
      buyerQuoteWallet.reserved_balance -= totalQuote;
      buyerBaseWallet.available_balance += (dto.quantity - dto.buyer_fee);

      // Seller: Release reserved base, receive quote (minus fee)
      sellerBaseWallet.reserved_balance -= dto.quantity;
      sellerQuoteWallet.available_balance += (totalQuote - dto.seller_fee);

      // Save all wallets
      await transactionalEntityManager.save([
        buyerBaseWallet,
        buyerQuoteWallet,
        sellerBaseWallet,
        sellerQuoteWallet,
      ]);

      // Create ledger entries (double-entry bookkeeping)
      const ledgerEntries = [
        // Buyer receives BTC
        this.createLedgerEntry(dto.buyer_user_id, dto.base_asset, dto.quantity - dto.buyer_fee,
          'TRADE_BUY', dto.trade_id, `Trade ${dto.trade_id}`),
        // Buyer pays USDT
        this.createLedgerEntry(dto.buyer_user_id, dto.quote_asset, -totalQuote,
          'TRADE_BUY', dto.trade_id, `Trade ${dto.trade_id}`),
        // Seller receives USDT
        this.createLedgerEntry(dto.seller_user_id, dto.quote_asset, totalQuote - dto.seller_fee,
          'TRADE_SELL', dto.trade_id, `Trade ${dto.trade_id}`),
        // Seller pays BTC
        this.createLedgerEntry(dto.seller_user_id, dto.base_asset, -dto.quantity,
          'TRADE_SELL', dto.trade_id, `Trade ${dto.trade_id}`),
      ];

      await transactionalEntityManager.save(ledgerEntries);

      return {
        success: true,
        buyer_ledger_entry_id: ledgerEntries[0].id,
        seller_ledger_entry_id: ledgerEntries[2].id,
        buyer_balances: this.buildBalancesResponse([buyerBaseWallet, buyerQuoteWallet]),
        seller_balances: this.buildBalancesResponse([sellerBaseWallet, sellerQuoteWallet]),
      };
    });
  }
}
```

**Trade Engine Client (Go):**
```go
// internal/client/wallet_client.go

package client

import (
    "context"
    "encoding/json"
    "fmt"
    "github.com/sony/gobreaker"
    "net/http"
    "time"
)

type WalletClient struct {
    baseURL    string
    httpClient *http.Client
    cb         *gobreaker.CircuitBreaker
}

func NewWalletClient(baseURL string) *WalletClient {
    settings := gobreaker.Settings{
        Name:        "WalletService",
        MaxRequests: 10,
        Interval:    60 * time.Second,
        Timeout:     30 * time.Second,
        ReadyToTrip: func(counts gobreaker.Counts) bool {
            return counts.ConsecutiveFailures > 5
        },
    }

    return &WalletClient{
        baseURL:    baseURL,
        httpClient: &http.Client{Timeout: 10 * time.Second},
        cb:         gobreaker.NewCircuitBreaker(settings),
    }
}

func (wc *WalletClient) ReserveBalance(ctx context.Context, req *ReserveBalanceRequest) (*ReserveBalanceResponse, error) {
    result, err := wc.cb.Execute(func() (interface{}, error) {
        return wc.doReserveBalance(ctx, req)
    })

    if err != nil {
        return nil, fmt.Errorf("reserve balance failed: %w", err)
    }

    return result.(*ReserveBalanceResponse), nil
}

func (wc *WalletClient) ReleaseBalance(ctx context.Context, req *ReleaseBalanceRequest) (*ReleaseBalanceResponse, error) {
    result, err := wc.cb.Execute(func() (interface{}, error) {
        return wc.doReleaseBalance(ctx, req)
    })

    if err != nil {
        return nil, fmt.Errorf("release balance failed: %w", err)
    }

    return result.(*ReleaseBalanceResponse), nil
}

func (wc *WalletClient) SettleTrade(ctx context.Context, req *SettleTradeRequest) (*SettleTradeResponse, error) {
    result, err := wc.cb.Execute(func() (interface{}, error) {
        return wc.doSettleTrade(ctx, req)
    })

    if err != nil {
        return nil, fmt.Errorf("settle trade failed: %w", err)
    }

    return result.(*SettleTradeResponse), nil
}

// Helper methods with retry logic
func (wc *WalletClient) doReserveBalance(ctx context.Context, req *ReserveBalanceRequest) (*ReserveBalanceResponse, error) {
    // Implementation with HTTP POST
    // Retry on network errors (up to 3 times with exponential backoff)
    // ...
}
```

**Integration Tests:**
```go
// test/integration/wallet_integration_test.go

func TestWalletServiceIntegration(t *testing.T) {
    // Setup test database and Wallet Service
    walletService := setupWalletService(t)
    defer walletService.Shutdown()

    walletClient := NewWalletClient(walletService.URL())

    t.Run("Reserve and Release Balance", func(t *testing.T) {
        // Reserve
        reserveResp, err := walletClient.ReserveBalance(ctx, &ReserveBalanceRequest{
            UserID:  userID,
            Asset:   "USDT",
            Amount:  1000.00,
            OrderID: orderID,
            Reason:  "BUY_ORDER",
        })
        require.NoError(t, err)
        assert.Equal(t, true, reserveResp.Success)

        // Release
        releaseResp, err := walletClient.ReleaseBalance(ctx, &ReleaseBalanceRequest{
            UserID:  userID,
            Asset:   "USDT",
            Amount:  1000.00,
            OrderID: orderID,
            Reason:  "ORDER_CANCELLED",
        })
        require.NoError(t, err)
        assert.Equal(t, true, releaseResp.Success)
    })

    t.Run("Settle Trade (Atomic)", func(t *testing.T) {
        // Setup: Buyer has reserved 50000 USDT, Seller has reserved 1 BTC
        // ...

        settleResp, err := walletClient.SettleTrade(ctx, &SettleTradeRequest{
            TradeID:        tradeID,
            BuyerUserID:    buyerID,
            SellerUserID:   sellerID,
            BaseAsset:      "BTC",
            QuoteAsset:     "USDT",
            Quantity:       1.0,
            Price:          50000.00,
            BuyerFee:       0.001,
            SellerFee:      50.00,
            BuyerFeeAsset:  "BTC",
            SellerFeeAsset: "USDT",
        })
        require.NoError(t, err)
        assert.Equal(t, true, settleResp.Success)

        // Verify buyer received 0.999 BTC (1 - 0.001 fee)
        // Verify seller received 49950 USDT (50000 - 50 fee)
    })

    t.Run("Idempotency - Duplicate Settle Trade", func(t *testing.T) {
        // Call settle-trade twice with same trade_id
        resp1, err := walletClient.SettleTrade(ctx, settleReq)
        require.NoError(t, err)

        resp2, err := walletClient.SettleTrade(ctx, settleReq)
        require.NoError(t, err)

        // Both should succeed with same response
        assert.Equal(t, resp1.BuyerLedgerEntryID, resp2.BuyerLedgerEntryID)
    })
}
```

**Definition of Done:**
- Wallet Service API endpoints implemented (reserve, release, settle-trade)
- Trade Engine client library complete
- Atomic transactions verified
- Idempotency tested (duplicate requests)
- Circuit breaker pattern working
- Integration tests pass (>80% coverage)
- Error handling tested (insufficient balance, network errors)
- Documentation updated (API specs, integration guide)
- Performance: settle-trade < 50ms (p99)

---

## DAY 1 TASK ASSIGNMENTS

### Daily Schedule: 9:00 AM - 6:00 PM (9 hours productive time)

---

### TASK-DB-001: Create Database ENUM Types & Base Schema

**Agent:** Database Agent
**Estimate:** 3 hours
**Priority:** P0 (Blocking)
**Dependencies:** None
**Story:** TE-102

**Description:**
Create PostgreSQL ENUM types and base table structures for orders and trades tables. This is the foundation for all order management.

**Acceptance Criteria:**
- [ ] ENUM types created (order_side_enum, order_type_enum, order_status_enum, time_in_force_enum)
- [ ] Base `orders` table structure created (without partitions initially)
- [ ] Base `trades` table structure created (without partitions initially)
- [ ] All constraints defined
- [ ] Migration script created (001_create_enums_and_base_tables.sql)
- [ ] Rollback script created
- [ ] Migration tested on local PostgreSQL

**Technical Specifications:**
```sql
-- File: migrations/001_create_enums_and_base_tables.sql

-- ENUM Types
CREATE TYPE order_side_enum AS ENUM ('BUY', 'SELL');
CREATE TYPE order_type_enum AS ENUM ('MARKET', 'LIMIT', 'STOP', 'STOP_LIMIT');
CREATE TYPE order_status_enum AS ENUM ('PENDING', 'OPEN', 'PARTIALLY_FILLED', 'FILLED', 'CANCELLED', 'REJECTED', 'EXPIRED');
CREATE TYPE time_in_force_enum AS ENUM ('GTC', 'IOC', 'FOK', 'DAY');

-- Orders Table (will be converted to partitioned later)
CREATE TABLE orders (
  order_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  institution_id UUID,
  symbol VARCHAR(20) NOT NULL,
  side order_side_enum NOT NULL,
  order_type order_type_enum NOT NULL,
  status order_status_enum NOT NULL DEFAULT 'PENDING',
  quantity DECIMAL(20,8) NOT NULL,
  filled_quantity DECIMAL(20,8) DEFAULT 0,
  price DECIMAL(20,8),
  stop_price DECIMAL(20,8),
  time_in_force time_in_force_enum DEFAULT 'GTC',
  client_order_id VARCHAR(100),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  filled_at TIMESTAMP,
  cancelled_at TIMESTAMP,

  CONSTRAINT chk_quantity_positive CHECK (quantity > 0),
  CONSTRAINT chk_filled_lte_quantity CHECK (filled_quantity <= quantity),
  CONSTRAINT chk_market_no_price CHECK (order_type != 'MARKET' OR price IS NULL),
  CONSTRAINT chk_limit_has_price CHECK (order_type != 'LIMIT' OR price IS NOT NULL)
);

-- Trades Table (will be converted to partitioned later)
CREATE TABLE trades (
  trade_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol VARCHAR(20) NOT NULL,
  buyer_order_id UUID NOT NULL,
  seller_order_id UUID NOT NULL,
  buyer_user_id UUID NOT NULL,
  seller_user_id UUID NOT NULL,
  price DECIMAL(20,8) NOT NULL,
  quantity DECIMAL(20,8) NOT NULL,
  buyer_fee DECIMAL(20,8) NOT NULL DEFAULT 0,
  seller_fee DECIMAL(20,8) NOT NULL DEFAULT 0,
  is_buyer_maker BOOLEAN NOT NULL,
  executed_at TIMESTAMP NOT NULL DEFAULT NOW(),

  FOREIGN KEY (buyer_order_id) REFERENCES orders(order_id),
  FOREIGN KEY (seller_order_id) REFERENCES orders(order_id)
);

-- Indexes
CREATE INDEX idx_orders_user_symbol_status ON orders(user_id, symbol, status);
CREATE INDEX idx_orders_symbol_status ON orders(symbol, status);
CREATE INDEX idx_orders_status_created ON orders(status, created_at);
CREATE INDEX idx_trades_buyer ON trades(buyer_user_id, executed_at DESC);
CREATE INDEX idx_trades_seller ON trades(seller_user_id, executed_at DESC);
CREATE INDEX idx_trades_symbol_time ON trades(symbol, executed_at DESC);
```

**Rollback Script:**
```sql
-- File: migrations/001_create_enums_and_base_tables.down.sql

DROP TABLE IF EXISTS trades CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TYPE IF EXISTS time_in_force_enum;
DROP TYPE IF EXISTS order_status_enum;
DROP TYPE IF EXISTS order_type_enum;
DROP TYPE IF EXISTS order_side_enum;
```

**Commands:**
```bash
cd /Users/musti/Documents/Projects/MyCrypto_Platform
mkdir -p services/trade-engine/migrations
# Create migration files
psql -U postgres -d mytrader -f services/trade-engine/migrations/001_create_enums_and_base_tables.sql
# Test rollback
psql -U postgres -d mytrader -f services/trade-engine/migrations/001_create_enums_and_base_tables.down.sql
```

**Handoff:** Backend Agent (after completion for Go models)

---

### TASK-DEVOPS-001: Setup Project Structure & Docker Compose

**Agent:** DevOps Agent
**Estimate:** 4 hours
**Priority:** P0 (Blocking)
**Dependencies:** None
**Story:** TE-101, TE-103, TE-104

**Description:**
Create complete project structure for Trade Engine service and setup Docker Compose with all infrastructure dependencies (PostgreSQL, Redis, RabbitMQ).

**Acceptance Criteria:**
- [ ] Project directory structure created at `/services/trade-engine/`
- [ ] Docker Compose file with all services (PostgreSQL, Redis, RabbitMQ, PgBouncer)
- [ ] All services start with `docker-compose up`
- [ ] Health checks working for all services
- [ ] Persistent volumes configured
- [ ] `.env.example` file created
- [ ] README.md with setup instructions

**Project Structure:**
```bash
mkdir -p /Users/musti/Documents/Projects/MyCrypto_Platform/services/trade-engine/{cmd/server,internal/{api/{http/{handlers,middleware},websocket},config,domain,repository,service},pkg/{logger,metrics,errors},config,migrations,test/{integration,unit}}
```

**Docker Compose:**
```yaml
# File: services/trade-engine/docker-compose.yml

version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: trade-engine-postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-postgres}
      POSTGRES_DB: mytrader
      PGDATA: /var/lib/postgresql/data/pgdata
    ports:
      - "5433:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./migrations:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - trade-engine-network

  redis:
    image: redis:7-alpine
    container_name: trade-engine-redis
    ports:
      - "6380:6379"
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD:-redis}
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5
    networks:
      - trade-engine-network

  rabbitmq:
    image: rabbitmq:3-management-alpine
    container_name: trade-engine-rabbitmq
    environment:
      RABBITMQ_DEFAULT_USER: ${RABBITMQ_USER:-admin}
      RABBITMQ_DEFAULT_PASS: ${RABBITMQ_PASSWORD:-admin}
    ports:
      - "5673:5672"   # AMQP
      - "15673:15672" # Management UI
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq
    healthcheck:
      test: rabbitmq-diagnostics -q ping
      interval: 30s
      timeout: 10s
      retries: 5
    networks:
      - trade-engine-network

  pgbouncer:
    image: edoburu/pgbouncer:latest
    container_name: trade-engine-pgbouncer
    environment:
      DATABASE_URL: postgres://postgres:${POSTGRES_PASSWORD:-postgres}@postgres:5432/mytrader
      POOL_MODE: transaction
      MAX_CLIENT_CONN: 1000
      DEFAULT_POOL_SIZE: 100
    ports:
      - "6433:5432"
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - trade-engine-network

volumes:
  postgres_data:
  redis_data:
  rabbitmq_data:

networks:
  trade-engine-network:
    driver: bridge
```

**.env.example:**
```bash
# File: services/trade-engine/.env.example

# PostgreSQL
POSTGRES_PASSWORD=postgres
DATABASE_URL=postgres://postgres:postgres@localhost:5433/mytrader

# Redis
REDIS_PASSWORD=redis
REDIS_URL=redis://:redis@localhost:6380/0

# RabbitMQ
RABBITMQ_USER=admin
RABBITMQ_PASSWORD=admin
RABBITMQ_URL=amqp://admin:admin@localhost:5673/

# Application
LOG_LEVEL=debug
SERVER_PORT=8080
```

**Commands:**
```bash
cd /Users/musti/Documents/Projects/MyCrypto_Platform/services/trade-engine
cp .env.example .env
docker-compose up -d
docker-compose ps  # Verify all services running
docker-compose logs -f  # Check logs
```

**Verification:**
```bash
# PostgreSQL
psql -h localhost -p 5433 -U postgres -d mytrader -c "SELECT version();"

# Redis
redis-cli -h localhost -p 6380 -a redis ping

# RabbitMQ Management UI
open http://localhost:15673  # Login: admin/admin
```

**Handoff:** Backend Agent (database connections), Database Agent (migration setup)

---

### TASK-BACKEND-001: Initialize Go Module & Basic HTTP Server

**Agent:** Backend Agent
**Estimate:** 4 hours
**Priority:** P0
**Dependencies:** TASK-DEVOPS-001
**Story:** TE-105, TE-106

**Description:**
Initialize Go module, setup basic HTTP server with Chi router, health check endpoints, and configuration management using Viper.

**Acceptance Criteria:**
- [ ] Go module initialized with dependencies
- [ ] Basic HTTP server running on port 8080
- [ ] Health check endpoints (`/health/live`, `/health/ready`)
- [ ] Configuration loaded from YAML + env vars
- [ ] Structured logging with zap
- [ ] Server starts and responds to health checks
- [ ] README with run instructions

**Dependencies to Install:**
```bash
go mod init github.com/mytrader/trade-engine

# HTTP Router
go get github.com/go-chi/chi/v5

# Config
go get github.com/spf13/viper

# Logging
go get go.uber.org/zap

# Database
go get gorm.io/gorm
go get gorm.io/driver/postgres

# Redis
go get github.com/redis/go-redis/v9

# RabbitMQ
go get github.com/rabbitmq/amqp091-go

# Validation
go get github.com/go-playground/validator/v10

# UUID
go get github.com/google/uuid

# Decimal
go get github.com/shopspring/decimal
```

**File: cmd/server/main.go**
```go
package main

import (
    "context"
    "fmt"
    "net/http"
    "os"
    "os/signal"
    "syscall"
    "time"

    "github.com/mytrader/trade-engine/internal/api/http"
    "github.com/mytrader/trade-engine/internal/config"
    "github.com/mytrader/trade-engine/pkg/logger"
    "go.uber.org/zap"
)

func main() {
    // Load configuration
    cfg, err := config.Load("config/config.yaml")
    if err != nil {
        panic(fmt.Sprintf("Failed to load config: %v", err))
    }

    // Initialize logger
    log, err := logger.NewLogger(cfg.Logging.Level, cfg.Logging.Format)
    if err != nil {
        panic(fmt.Sprintf("Failed to initialize logger: %v", err))
    }
    defer log.Sync()

    log.Info("Starting Trade Engine", zap.String("environment", cfg.Environment))

    // Create HTTP server
    router := httpapi.NewRouter(log)

    server := &http.Server{
        Addr:         fmt.Sprintf(":%d", cfg.Server.HTTPPort),
        Handler:      router,
        ReadTimeout:  cfg.Server.ReadTimeout,
        WriteTimeout: cfg.Server.WriteTimeout,
    }

    // Start server in goroutine
    go func() {
        log.Info("HTTP server starting", zap.Int("port", cfg.Server.HTTPPort))
        if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
            log.Fatal("Server failed", zap.Error(err))
        }
    }()

    // Graceful shutdown
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
    <-quit

    log.Info("Shutting down server...")

    ctx, cancel := context.WithTimeout(context.Background(), cfg.Server.ShutdownTimeout)
    defer cancel()

    if err := server.Shutdown(ctx); err != nil {
        log.Fatal("Server forced to shutdown", zap.Error(err))
    }

    log.Info("Server exited")
}
```

**File: internal/api/http/router.go**
```go
package httpapi

import (
    "net/http"

    "github.com/go-chi/chi/v5"
    "github.com/go-chi/chi/v5/middleware"
    "github.com/mytrader/trade-engine/internal/api/http/handlers"
    "go.uber.org/zap"
)

func NewRouter(logger *zap.Logger) http.Handler {
    r := chi.NewRouter()

    // Global middleware
    r.Use(middleware.RealIP)
    r.Use(middleware.RequestID)
    r.Use(middleware.Recoverer)
    r.Use(middleware.Timeout(60 * time.Second))

    // Health checks (unauthenticated)
    r.Get("/health/live", handlers.LivenessCheck)
    r.Get("/health/ready", handlers.ReadinessCheck)

    // API routes (will be protected later)
    r.Route("/api/v1", func(r chi.Router) {
        r.Get("/status", handlers.Status)
    })

    return r
}
```

**File: internal/api/http/handlers/health.go**
```go
package handlers

import (
    "encoding/json"
    "net/http"
)

type HealthResponse struct {
    Status string `json:"status"`
}

func LivenessCheck(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(HealthResponse{Status: "alive"})
}

func ReadinessCheck(w http.ResponseWriter, r *http.Request) {
    // TODO: Check database, Redis, RabbitMQ connectivity
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(HealthResponse{Status: "ready"})
}

func Status(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]string{
        "service": "trade-engine",
        "version": "0.1.0",
        "status":  "running",
    })
}
```

**File: internal/config/config.go**
```go
package config

import (
    "fmt"
    "time"

    "github.com/spf13/viper"
)

type Config struct {
    Environment string
    Server      ServerConfig
    Database    DatabaseConfig
    Redis       RedisConfig
    RabbitMQ    RabbitMQConfig
    Logging     LoggingConfig
}

type ServerConfig struct {
    HTTPPort        int           `mapstructure:"http_port"`
    ReadTimeout     time.Duration `mapstructure:"read_timeout"`
    WriteTimeout    time.Duration `mapstructure:"write_timeout"`
    ShutdownTimeout time.Duration `mapstructure:"shutdown_timeout"`
}

type DatabaseConfig struct {
    Host     string `mapstructure:"host"`
    Port     int    `mapstructure:"port"`
    Name     string `mapstructure:"name"`
    User     string `mapstructure:"user"`
    Password string `mapstructure:"password"`
}

type RedisConfig struct {
    Host     string `mapstructure:"host"`
    Port     int    `mapstructure:"port"`
    Password string `mapstructure:"password"`
    DB       int    `mapstructure:"db"`
}

type RabbitMQConfig struct {
    URL                  string `mapstructure:"url"`
    ExchangeTradeEvents  string `mapstructure:"exchange_trade_events"`
    ExchangeOrderEvents  string `mapstructure:"exchange_order_events"`
}

type LoggingConfig struct {
    Level  string `mapstructure:"level"`
    Format string `mapstructure:"format"`
}

func Load(configPath string) (*Config, error) {
    viper.SetConfigFile(configPath)
    viper.AutomaticEnv()
    viper.SetEnvPrefix("TRADE_ENGINE")

    if err := viper.ReadInConfig(); err != nil {
        return nil, fmt.Errorf("failed to read config: %w", err)
    }

    var config Config
    if err := viper.Unmarshal(&config); err != nil {
        return nil, fmt.Errorf("failed to unmarshal config: %w", err)
    }

    return &config, nil
}
```

**File: config/config.yaml**
```yaml
environment: development

server:
  http_port: 8080
  read_timeout: 60s
  write_timeout: 60s
  shutdown_timeout: 30s

database:
  host: localhost
  port: 5433
  name: mytrader
  user: postgres
  password: postgres

redis:
  host: localhost
  port: 6380
  password: redis
  db: 0

rabbitmq:
  url: amqp://admin:admin@localhost:5673/
  exchange_trade_events: trade.events
  exchange_order_events: order.events

logging:
  level: debug
  format: json
```

**File: pkg/logger/logger.go**
```go
package logger

import (
    "go.uber.org/zap"
    "go.uber.org/zap/zapcore"
)

func NewLogger(level, format string) (*zap.Logger, error) {
    var config zap.Config

    if format == "json" {
        config = zap.NewProductionConfig()
    } else {
        config = zap.NewDevelopmentConfig()
    }

    // Set log level
    var zapLevel zapcore.Level
    if err := zapLevel.UnmarshalText([]byte(level)); err != nil {
        zapLevel = zapcore.InfoLevel
    }
    config.Level = zap.NewAtomicLevelAt(zapLevel)

    return config.Build()
}
```

**Commands:**
```bash
cd /Users/musti/Documents/Projects/MyCrypto_Platform/services/trade-engine

# Initialize go module
go mod init github.com/mytrader/trade-engine

# Install dependencies
go get github.com/go-chi/chi/v5
go get github.com/spf13/viper
go get go.uber.org/zap

# Run server
go run cmd/server/main.go

# Test health checks
curl http://localhost:8080/health/live
curl http://localhost:8080/health/ready
curl http://localhost:8080/api/v1/status
```

**Handoff:** QA Agent (for health check verification), Frontend Agent (API endpoints ready)

---

### TASK-QA-001: Create Test Plan Templates & Verification Scripts

**Agent:** QA Agent
**Estimate:** 3 hours
**Priority:** P1
**Dependencies:** None
**Story:** TE-107 (Preparation for testing)

**Description:**
Create comprehensive test plan templates for Sprint 1 components and write verification scripts for infrastructure setup.

**Acceptance Criteria:**
- [ ] Test plan template created for each story
- [ ] Verification script for Docker Compose services
- [ ] Health check verification script
- [ ] Database connectivity test script
- [ ] Redis connectivity test script
- [ ] RabbitMQ connectivity test script
- [ ] Test execution documentation

**Test Plan Template:**
```markdown
# File: test-plans/sprint-1/TE-101-docker-containerization-test-plan.md

# Test Plan: TE-101 - Docker Containerization

## Test Environment
- OS: macOS/Linux/Windows
- Docker Version: 24.x
- Docker Compose Version: 2.x

## Test Cases

### TC-001: Docker Build Success
**Priority:** P0
**Description:** Verify Docker image builds without errors

**Steps:**
1. cd services/trade-engine
2. docker build -t trade-engine:test .

**Expected Result:**
- Build completes in < 2 minutes
- No errors in output
- Image created successfully

### TC-002: Docker Compose Up
**Priority:** P0
**Description:** All services start successfully

**Steps:**
1. docker-compose up -d
2. docker-compose ps

**Expected Result:**
- All services show "running" status
- Health checks passing

### TC-003: Service Health Checks
**Priority:** P0
**Description:** Individual service health checks

**Steps:**
1. Test PostgreSQL: `psql -h localhost -p 5433 -U postgres -d mytrader -c "SELECT 1;"`
2. Test Redis: `redis-cli -h localhost -p 6380 -a redis ping`
3. Test RabbitMQ: `curl http://localhost:15673/api/health/checks/alarms`

**Expected Result:**
- PostgreSQL returns "1"
- Redis returns "PONG"
- RabbitMQ returns 200 OK

### TC-004: Persistent Volumes
**Priority:** P1
**Description:** Data persists across container restarts

**Steps:**
1. docker-compose down
2. docker-compose up -d
3. Verify data still exists

**Expected Result:**
- PostgreSQL database still exists
- Redis data persists
- RabbitMQ queues persist

## Test Execution Log
- Date: ___________
- Tester: ___________
- Results: Pass/Fail
- Notes: ___________
```

**Verification Script:**
```bash
#!/bin/bash
# File: test/verify-infrastructure.sh

set -e

echo "=== Infrastructure Verification ==="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check Docker Compose services
echo "1. Checking Docker Compose services..."
if docker-compose ps | grep -q "Up"; then
    echo -e "${GREEN}✓ Docker Compose services running${NC}"
else
    echo -e "${RED}✗ Docker Compose services not running${NC}"
    exit 1
fi

# Test PostgreSQL
echo "2. Testing PostgreSQL connection..."
if psql -h localhost -p 5433 -U postgres -d mytrader -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PostgreSQL connection successful${NC}"
else
    echo -e "${RED}✗ PostgreSQL connection failed${NC}"
    exit 1
fi

# Test Redis
echo "3. Testing Redis connection..."
if redis-cli -h localhost -p 6380 -a redis ping | grep -q "PONG"; then
    echo -e "${GREEN}✓ Redis connection successful${NC}"
else
    echo -e "${RED}✗ Redis connection failed${NC}"
    exit 1
fi

# Test RabbitMQ
echo "4. Testing RabbitMQ connection..."
if curl -s -u admin:admin http://localhost:15673/api/health/checks/alarms | grep -q "ok"; then
    echo -e "${GREEN}✓ RabbitMQ connection successful${NC}"
else
    echo -e "${RED}✗ RabbitMQ connection failed${NC}"
    exit 1
fi

# Test HTTP Server
echo "5. Testing Trade Engine HTTP server..."
if curl -s http://localhost:8080/health/live | grep -q "alive"; then
    echo -e "${GREEN}✓ Trade Engine HTTP server responding${NC}"
else
    echo -e "${RED}✗ Trade Engine HTTP server not responding${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}=== All infrastructure checks passed ===${NC}"
```

**Database Schema Test:**
```bash
#!/bin/bash
# File: test/verify-database-schema.sh

set -e

echo "=== Database Schema Verification ==="

# Check ENUM types
echo "1. Checking ENUM types..."
psql -h localhost -p 5433 -U postgres -d mytrader -c "\dT+ order_side_enum"

# Check tables exist
echo "2. Checking tables..."
psql -h localhost -p 5433 -U postgres -d mytrader -c "\dt orders"
psql -h localhost -p 5433 -U postgres -d mytrader -c "\dt trades"

# Check indexes
echo "3. Checking indexes..."
psql -h localhost -p 5433 -U postgres -d mytrader -c "\di idx_orders_user_symbol_status"

# Insert test data
echo "4. Testing data insertion..."
psql -h localhost -p 5433 -U postgres -d mytrader <<EOF
INSERT INTO orders (user_id, symbol, side, order_type, quantity, price, status)
VALUES
  ('123e4567-e89b-12d3-a456-426614174000', 'BTC/USDT', 'BUY', 'LIMIT', 1.5, 50000.00, 'OPEN');
EOF

# Verify insertion
echo "5. Verifying insertion..."
psql -h localhost -p 5433 -U postgres -d mytrader -c "SELECT * FROM orders;"

echo "=== Database schema verification complete ==="
```

**Commands:**
```bash
chmod +x test/verify-infrastructure.sh
chmod +x test/verify-database-schema.sh

# Run verification
./test/verify-infrastructure.sh
./test/verify-database-schema.sh
```

**Handoff:** Tech Lead (test results), All Agents (test templates)

---

## DAY 1 SUCCESS CRITERIA

**By End of Day 1 (6:00 PM), the following must be complete:**

### Infrastructure
- [ ] Docker Compose running all services (PostgreSQL, Redis, RabbitMQ, PgBouncer)
- [ ] All services passing health checks
- [ ] Project structure created at `/services/trade-engine/`

### Database
- [ ] ENUM types created in PostgreSQL
- [ ] Base `orders` and `trades` tables created
- [ ] Migration scripts tested (up and down)
- [ ] Indexes created

### Application
- [ ] Go module initialized
- [ ] Basic HTTP server running on port 8080
- [ ] Health check endpoints responding
- [ ] Configuration management working (YAML + env vars)
- [ ] Structured logging operational

### Testing
- [ ] Verification scripts created and passing
- [ ] Test plan templates created
- [ ] All infrastructure checks green

### Documentation
- [ ] README.md with setup instructions
- [ ] .env.example file created
- [ ] API endpoint documentation started

---

## DAY 1 EVENING STANDUP TEMPLATE

**Time:** 6:00 PM
**Duration:** 15 minutes
**Attendees:** All agents + Tech Lead

**Format:**

**Database Agent:**
- Completed: [List tasks]
- Blockers: [Any issues]
- Tomorrow: [Partition implementation]

**DevOps Agent:**
- Completed: [List tasks]
- Blockers: [Any issues]
- Tomorrow: [Monitoring setup]

**Backend Agent:**
- Completed: [List tasks]
- Blockers: [Any issues]
- Tomorrow: [Middleware implementation]

**QA Agent:**
- Completed: [List tasks]
- Blockers: [Any issues]
- Tomorrow: [Integration testing]

**Tech Lead:**
- Sprint health: [On track / At risk / Blocked]
- Decisions needed: [Any architectural decisions]
- Next day priorities: [Focus areas]

---

## SPRINT 1 REMAINING DAYS (OVERVIEW)

### Days 2-3: Core Infrastructure Completion
- Database partitioning implementation
- RabbitMQ queue setup and testing
- Middleware development (auth, rate limiting)
- Prometheus metrics integration

### Days 4-6: Wallet Service Integration
- Wallet Service API implementation (reserve, release, settle-trade)
- Trade Engine client library
- Integration tests
- Error handling and retry logic

### Days 7-9: Monitoring & CI/CD
- Grafana dashboards
- Alert rules
- GitHub Actions pipeline
- End-to-end testing

### Days 10-12: Quality Gate & Buffer
- Performance testing
- Security review
- Documentation completion
- Quality Gate 1 verification
- Sprint retrospective

---

## RISK REGISTER

| Risk ID | Risk | Probability | Impact | Mitigation |
|---------|------|-------------|--------|------------|
| RISK-001 | Docker networking issues on different OS | Medium | Medium | Test on all platforms early |
| RISK-002 | Database migration conflicts | Low | High | Version control migrations, test rollbacks |
| RISK-003 | RabbitMQ vs Kafka confusion | Medium | Low | Clear documentation of MVP choice |
| RISK-004 | Wallet Service integration delays | Medium | High | Start integration tests early |
| RISK-005 | Configuration management complexity | Low | Medium | Simple config structure, good defaults |

---

## COMMUNICATION PLAN

### Daily Standups
- **Time:** 9:00 AM daily
- **Duration:** 15 minutes
- **Format:** What I did yesterday, what I'm doing today, any blockers

### Code Reviews
- **SLA:** Within 4 hours
- **Required Approvals:** 1 (Tech Lead for critical changes)
- **Checklist:** Use engineering-guidelines.md

### Blockers
- **Escalation:** Immediate notification in chat
- **Resolution Target:** < 4 hours
- **Fallback:** Tech Lead reassignment

### Sprint Review
- **Day 12:** Sprint demo to stakeholders
- **Duration:** 1 hour
- **Format:** Live demo + metrics review

---

## QUALITY GATE 1 CRITERIA

**Sprint 1 passes Quality Gate 1 if:**

- [ ] All P0 stories completed (TE-101 through TE-109)
- [ ] All services running in Docker Compose
- [ ] Database schema operational with partitioning
- [ ] HTTP server responding to health checks
- [ ] Wallet Service API extensions working
- [ ] CI/CD pipeline operational (at least basic build)
- [ ] Monitoring dashboards showing basic metrics
- [ ] Zero P0 bugs
- [ ] Test coverage > 70% for implemented code
- [ ] Documentation complete (README, API docs)
- [ ] Tech Lead sign-off

---

## DOCUMENT VERSION CONTROL

**Version:** 1.0
**Last Updated:** 2024-11-23
**Status:** Approved
**Next Review:** End of Day 1

**Approvals:**
- Tech Lead Agent: _________________ (Date: _________)
- Product Owner: _________________ (Date: _________)

---

## APPENDIX A: QUICK REFERENCE COMMANDS

**Start Infrastructure:**
```bash
cd /Users/musti/Documents/Projects/MyCrypto_Platform/services/trade-engine
docker-compose up -d
```

**Run Database Migrations:**
```bash
psql -h localhost -p 5433 -U postgres -d mytrader -f migrations/001_create_enums_and_base_tables.sql
```

**Start Trade Engine:**
```bash
go run cmd/server/main.go
```

**Run Tests:**
```bash
./test/verify-infrastructure.sh
./test/verify-database-schema.sh
```

**Check Logs:**
```bash
docker-compose logs -f postgres
docker-compose logs -f redis
docker-compose logs -f rabbitmq
```

---

**END OF DOCUMENT**
