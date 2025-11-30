# MyCrypto Platform - Architecture Documentation

**Version:** 1.0.0
**Last Updated:** 2025-11-30
**Status:** Production Ready
**Owner:** Tech Lead & Architecture Team

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Microservices Architecture](#2-microservices-architecture)
3. [Database Architecture](#3-database-architecture)
4. [Real-Time Communication](#4-real-time-communication)
5. [Message Queue Architecture](#5-message-queue-architecture)
6. [Caching Strategy](#6-caching-strategy)
7. [API Gateway & Routing](#7-api-gateway--routing)
8. [Monitoring & Observability](#8-monitoring--observability)
9. [Security Architecture](#9-security-architecture)
10. [Deployment Architecture](#10-deployment-architecture)
11. [Data Flow Sequences](#11-data-flow-sequences)
12. [Scalability & Performance](#12-scalability--performance)
13. [Disaster Recovery & Backup](#13-disaster-recovery--backup)

---

## 1. System Overview

### 1.1 High-Level Architecture

The MyCrypto Platform is a microservices-based cryptocurrency exchange built with a modern tech stack designed for scalability, reliability, and high performance.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND LAYER                               │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  React 18 + TypeScript Frontend (Port 3003)                  │   │
│  │  - User Authentication UI                                     │   │
│  │  - Wallet Management Dashboard                                │   │
│  │  - Trading Interface (Order Book, Charts)                     │   │
│  │  - Real-time WebSocket Integration                            │   │
│  └─────────────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ HTTPS/WSS
┌──────────────────────────▼──────────────────────────────────────────┐
│                      MICROSERVICES LAYER                             │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐   │
│  │ Auth Service │  │Wallet Service│  │  Trade Engine (Go)     │   │
│  │  (NestJS)    │  │   (NestJS)   │  │  - Matching Engine     │   │
│  │  Port 3001   │  │  Port 3002   │  │  - Order Management    │   │
│  │              │  │              │  │  - WebSocket Server    │   │
│  │              │  │              │  │  Port 8085             │   │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬─────────────┘   │
│         │                  │                      │                  │
└─────────┼──────────────────┼──────────────────────┼──────────────────┘
          │                  │                      │
          │                  │                      │
┌─────────▼──────────────────▼──────────────────────▼──────────────────┐
│                      INFRASTRUCTURE LAYER                             │
│  ┌─────────────────┐  ┌─────────────┐  ┌──────────────────────┐    │
│  │   PostgreSQL    │  │    Redis    │  │  RabbitMQ + Kafka    │    │
│  │   (Port 5432)   │  │ (Port 6379) │  │  (Ports 5672/9092)   │    │
│  │  - exchange_dev │  │  - Sessions │  │  - Email Queue       │    │
│  │  - mytrader_te  │  │  - Cache    │  │  - Order Events      │    │
│  └─────────────────┘  └─────────────┘  └──────────────────────┘    │
│                                                                       │
│  ┌─────────────────┐  ┌─────────────┐  ┌──────────────────────┐    │
│  │   Prometheus    │  │   Grafana   │  │  MinIO (S3 Storage)  │    │
│  │  (Port 9090)    │  │ (Port 3000) │  │  (Ports 9000/9001)   │    │
│  │  - Metrics      │  │  - Dashb.   │  │  - KYC Documents     │    │
│  └─────────────────┘  └─────────────┘  └──────────────────────┘    │
└───────────────────────────────────────────────────────────────────────┘
```

### 1.2 Component Breakdown

The platform consists of three primary microservices:

1. **Auth Service (NestJS)** - User authentication, authorization, 2FA
2. **Wallet Service (NestJS)** - Fiat/crypto deposits, withdrawals, balance management
3. **Trade Engine (Go)** - High-performance order matching, trade execution

Supporting infrastructure includes:
- PostgreSQL (relational data storage)
- Redis (caching and rate limiting)
- RabbitMQ (async task processing)
- Kafka (event streaming for trades)
- Prometheus & Grafana (monitoring)
- MinIO (object storage for KYC documents)

### 1.3 Technology Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 18, TypeScript, Vite, TanStack Query, WebSockets |
| **Backend Services** | NestJS (Node.js 20), TypeScript, TypeORM |
| **Trade Engine** | Go 1.21+, Gin, Chi, PostgreSQL drivers |
| **Databases** | PostgreSQL 16 (with partitioning), Redis 7 |
| **Message Queues** | RabbitMQ 3.12, Kafka 7.5 |
| **Monitoring** | Prometheus, Grafana, Zap logging |
| **Deployment** | Docker, Docker Compose, Kubernetes (planned) |
| **CI/CD** | GitHub Actions, AWS ECR, AWS ECS/EKS |

---

## 2. Microservices Architecture

### 2.1 Auth Service (NestJS)

**Port:** 3001
**Language:** TypeScript/Node.js
**Database:** exchange_dev (PostgreSQL)

#### Responsibilities
- User registration and email verification
- Login with JWT (RS256 algorithm with RSA keys)
- Two-factor authentication (TOTP)
- Session management
- Password reset flows
- reCAPTCHA integration for bot protection
- User profile management

#### Key Endpoints
```
POST   /api/auth/register          - Create new user account
POST   /api/auth/login             - Authenticate user
POST   /api/auth/verify-email      - Verify email token
POST   /api/auth/refresh           - Refresh access token
POST   /api/auth/logout            - Invalidate session
GET    /api/auth/profile           - Get current user profile
POST   /api/auth/2fa/setup         - Initialize 2FA
POST   /api/auth/2fa/verify        - Verify 2FA code
POST   /api/auth/password/reset    - Request password reset
```

#### Dependencies
- **PostgreSQL:** User data, sessions
- **Redis:** Session storage, rate limiting (100 req/min)
- **RabbitMQ:** Email queue (verification, password reset)
- **Mailpit:** Email service (dev environment)

#### Database Schema (Key Tables)
```sql
users (id, email, password_hash, email_verified, created_at, updated_at)
sessions (id, user_id, token, expires_at, ip_address)
two_factor_secrets (user_id, encrypted_secret, backup_codes, enabled)
audit_logs (id, user_id, action, ip_address, timestamp)
```

#### Security Features
- RSA-based JWT signing (RS256)
- bcrypt password hashing (10 rounds)
- Session invalidation on logout
- Rate limiting per IP and per user
- CSRF protection
- reCAPTCHA v3 score threshold (0.5)

---

### 2.2 Wallet Service (NestJS)

**Port:** 3002
**Language:** TypeScript/Node.js
**Database:** exchange_dev (PostgreSQL)

#### Responsibilities
- Fiat (TRY) deposits and withdrawals
- Crypto deposits and withdrawals
- Balance queries with caching (5s TTL)
- Transaction history
- Bank account management (IBAN/SWIFT validation)
- KYC document verification
- Withdrawal fee calculation

#### Key Endpoints
```
GET    /api/wallet/balance/:currency     - Get balance for currency
POST   /api/wallet/deposit/fiat          - Initiate fiat deposit
POST   /api/wallet/withdraw/fiat         - Request fiat withdrawal
POST   /api/wallet/deposit/crypto        - Get crypto deposit address
POST   /api/wallet/withdraw/crypto       - Submit crypto withdrawal
GET    /api/wallet/transactions          - List transaction history
POST   /api/wallet/bank-accounts         - Add bank account
GET    /api/wallet/bank-accounts         - List bank accounts
```

#### Dependencies
- **PostgreSQL:** Wallet balances, transactions
- **Redis:** Balance caching (5s TTL), withdrawal locks (5 min)
- **Auth Service:** JWT validation (shared RSA public key)
- **RabbitMQ:** Withdrawal processing queue

#### Database Schema (Key Tables)
```sql
wallets (id, user_id, currency, balance, locked_balance, updated_at)
transactions (id, user_id, type, currency, amount, fee, status, created_at)
bank_accounts (id, user_id, bank_name, iban, swift, verified, created_at)
crypto_addresses (id, user_id, currency, address, tag, created_at)
withdrawals (id, user_id, currency, amount, address, status, processed_at)
```

#### Business Rules
- **TRY Deposits:** Min 100 TRY, Max 50,000 TRY
- **TRY Withdrawals:** Min 100 TRY, Max 50,000 TRY, Fee 5 TRY
- **Crypto Withdrawals:** Dynamic fees based on network congestion
- **Balance Locking:** Withdrawals lock balance until processed
- **KYC Requirements:** Level 1 (1,000 TRY/day), Level 2 (50,000 TRY/day)

---

### 2.3 Trade Engine (Go)

**Port:** 8085 (HTTP), 8086 (WebSocket)
**Language:** Go 1.21+
**Database:** mytrader_trade_engine (PostgreSQL)

#### Responsibilities
- Order placement (market, limit, stop, stop-limit)
- Order book maintenance (in-memory + Redis)
- Trade matching (price-time priority)
- Trade execution and settlement
- Real-time order updates via WebSocket
- Market data streaming
- Order cancellation and amendments

#### Key Endpoints
```
POST   /api/v1/orders                - Place new order
GET    /api/v1/orders/:id            - Get order details
DELETE /api/v1/orders/:id            - Cancel order
GET    /api/v1/orders                - List user orders
GET    /api/v1/orderbook/:symbol     - Get order book snapshot
GET    /api/v1/trades                - Get recent trades
WS     /ws/orderbook/:symbol         - Order book stream
WS     /ws/orders                    - User order updates
WS     /ws/trades/:symbol            - Trade execution stream
```

#### Dependencies
- **PostgreSQL:** Orders, trades (partitioned tables)
- **Redis:** Order book cache, active orders
- **Kafka:** Trade events, order events
- **Wallet Service:** Balance verification, settlement

#### Database Schema (Key Tables)
```sql
-- Partitioned by month
orders (
  order_id, user_id, symbol, side, type, status,
  quantity, filled_quantity, price, stop_price,
  time_in_force, created_at, updated_at
)

-- Partitioned by day
trades (
  trade_id, buy_order_id, sell_order_id,
  buyer_user_id, seller_user_id, symbol,
  quantity, price, maker_fee, taker_fee,
  executed_at
)

symbols (symbol, base_currency, quote_currency, status, tick_size, min_order_size)
```

#### Matching Engine Algorithm
1. **Order Validation:** Check balance, price limits, quantity
2. **Order Book Lookup:** Fetch matching orders from Redis cache
3. **Price-Time Priority:** Match best price first, then earliest timestamp
4. **Partial Fills:** Support partial execution with remaining quantity
5. **Trade Generation:** Create trade records for each match
6. **Settlement:** Update wallet balances via Wallet Service API
7. **Event Publishing:** Publish trade events to Kafka
8. **WebSocket Broadcast:** Notify connected clients of updates

#### Performance Characteristics
- **Matching Latency:** <10ms (p99)
- **Order Throughput:** 10,000 orders/second
- **WebSocket Connections:** 10,000 concurrent
- **Order Book Depth:** 1,000 levels per side

---

## 3. Database Architecture

### 3.1 PostgreSQL Configuration

#### Two Separate Databases

1. **exchange_dev** (Auth & Wallet Services)
   - Host: postgres:5432
   - User: postgres
   - Extensions: uuid-ossp, pg_stat_statements

2. **mytrader_trade_engine** (Trade Engine)
   - Host: postgres:5432
   - User: trade_engine_app
   - Extensions: uuid-ossp, pg_stat_statements

#### Why Two Databases?
- **Service Isolation:** Prevents cross-service schema conflicts
- **Independent Scaling:** Can scale Trade Engine database separately
- **Migration Independence:** Each service manages its own migrations
- **Security Boundary:** Limits blast radius of SQL injection or privilege escalation

### 3.2 Table Partitioning Strategy

The Trade Engine uses PostgreSQL table partitioning for high-volume tables:

#### Orders Table (Monthly Partitioning)
```sql
CREATE TABLE orders (
  order_id UUID PRIMARY KEY,
  created_at TIMESTAMP NOT NULL,
  ...
) PARTITION BY RANGE (created_at);

-- Partitions created automatically
orders_2025_01 FOR VALUES FROM ('2025-01-01') TO ('2025-02-01')
orders_2025_02 FOR VALUES FROM ('2025-02-01') TO ('2025-03-01')
...
```

**Benefits:**
- Query performance: WHERE created_at filters scan only relevant partition
- Data archival: DROP old partitions instead of DELETE (instant)
- Maintenance: VACUUM and ANALYZE per partition (less locking)

#### Trades Table (Daily Partitioning)
```sql
CREATE TABLE trades (
  trade_id UUID PRIMARY KEY,
  executed_at TIMESTAMP NOT NULL,
  ...
) PARTITION BY RANGE (executed_at);

-- Daily partitions for recent data
trades_2025_11_30
trades_2025_12_01
...
```

### 3.3 Indexing Strategy

#### Auth Service Indexes
```sql
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at DESC);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
```

#### Wallet Service Indexes
```sql
CREATE INDEX idx_wallets_user_currency ON wallets(user_id, currency);
CREATE INDEX idx_transactions_user_id ON transactions(user_id, created_at DESC);
CREATE INDEX idx_transactions_status ON transactions(status, created_at DESC);
```

#### Trade Engine Indexes
```sql
CREATE INDEX idx_orders_user_id ON orders(user_id, created_at DESC);
CREATE INDEX idx_orders_symbol_status ON orders(symbol, status, created_at);
CREATE INDEX idx_trades_symbol_time ON trades(symbol, executed_at DESC);
CREATE INDEX idx_trades_buyer ON trades(buyer_user_id, executed_at DESC);
CREATE INDEX idx_trades_seller ON trades(seller_user_id, executed_at DESC);
```

### 3.4 Data Retention Policies

- **Orders:** 60 months (partitions auto-dropped after)
- **Trades:** 36 months
- **Audit Logs:** 24 months
- **Sessions:** 30 days (auto-cleanup via cron)
- **Email Verification Tokens:** 24 hours

---

## 4. Real-Time Communication

### 4.1 WebSocket Architecture

The Trade Engine provides WebSocket connections for real-time updates:

#### Connection Flow
```
Client                    Trade Engine
  │                            │
  ├────── WS Connect ──────────▶
  │       /ws/orderbook/BTCUSDT │
  │                            │
  ◀──── Connection Ack ────────┤
  │      { type: "connected" } │
  │                            │
  ◀──── Order Book Snapshot ───┤
  │      { bids: [], asks: [] }│
  │                            │
  ◀──── Incremental Updates ───┤
  │      { type: "update",     │
  │        side: "buy",         │
  │        price: "...",        │
  │        quantity: "..." }    │
```

#### WebSocket Channels

1. **Order Book Channel** (`/ws/orderbook/:symbol`)
   - Initial snapshot of top 100 levels
   - Incremental updates on order placement/cancellation
   - Aggregated by price level
   - Update frequency: Real-time (no throttling)

2. **User Orders Channel** (`/ws/orders`)
   - Authenticated connection (JWT in query param)
   - Order status updates (placed, filled, cancelled)
   - Partial fill notifications
   - Private channel (user-specific)

3. **Trade Stream** (`/ws/trades/:symbol`)
   - Public trade executions
   - Schema: `{ tradeId, price, quantity, side, timestamp }`
   - Throttled to 10 updates/second per client

### 4.2 Message Format

All WebSocket messages use JSON:

```json
{
  "type": "orderbook_update",
  "symbol": "BTCUSDT",
  "timestamp": 1701360000000,
  "data": {
    "side": "buy",
    "price": "42500.00",
    "quantity": "0.5",
    "action": "add"
  }
}
```

### 4.3 Connection Management

- **Heartbeat:** Ping/Pong every 30 seconds
- **Reconnection:** Exponential backoff (1s, 2s, 4s, max 30s)
- **Max Connections:** 10,000 per Trade Engine instance
- **Idle Timeout:** 5 minutes without activity
- **Auth Token Expiry:** Reconnect required after 15 minutes

---

## 5. Message Queue Architecture

### 5.1 RabbitMQ (Async Task Processing)

**Port:** 5672 (AMQP), 15672 (Management UI)
**User:** rabbitmq / rabbitmq_dev_password

#### Queue Definitions

1. **email.notifications**
   - Purpose: Outgoing emails (verification, password reset, withdrawal confirmations)
   - Consumers: Email Worker Service
   - Durability: Persistent
   - Max Retries: 3 with exponential backoff
   - Dead Letter Queue: email.dlq

2. **kyc.processing**
   - Purpose: KYC document verification tasks
   - Consumers: KYC Verification Service
   - Processing Time: 1-5 minutes per document
   - Priority Queue: Enabled (priority 0-10)

3. **withdrawal.processing**
   - Purpose: Fiat and crypto withdrawal execution
   - Consumers: Withdrawal Service
   - Concurrency: 10 workers
   - Idempotency: Withdrawal ID deduplication

4. **audit.logs**
   - Purpose: Async audit log persistence
   - Consumers: Audit Service
   - Batch Size: 100 messages
   - Flush Interval: 5 seconds

#### Exchange Topology
```
                       ┌─────────────────┐
                       │  Topic Exchange │
                       │  "notifications"│
                       └────────┬────────┘
                                │
          ┌─────────────────────┼─────────────────────┐
          │                     │                     │
    routing_key:          routing_key:          routing_key:
    "email.verify"        "email.reset"        "sms.2fa"
          │                     │                     │
          ▼                     ▼                     ▼
    [email.verify]      [email.reset]          [sms.queue]
```

### 5.2 Kafka (Event Streaming)

**Port:** 9092 (internal), 29092 (external)
**Zookeeper Port:** 2181

#### Topics

1. **trade-events**
   - Partitions: 12 (keyed by symbol for ordering)
   - Retention: 7 days
   - Schema:
     ```json
     {
       "tradeId": "uuid",
       "symbol": "BTCUSDT",
       "buyOrderId": "uuid",
       "sellOrderId": "uuid",
       "price": "42500.00",
       "quantity": "0.5",
       "executedAt": 1701360000000
     }
     ```

2. **order-events**
   - Partitions: 12 (keyed by user_id)
   - Retention: 7 days
   - Events: ORDER_PLACED, ORDER_FILLED, ORDER_CANCELLED, ORDER_EXPIRED

3. **wallet-events**
   - Partitions: 6
   - Events: DEPOSIT_COMPLETED, WITHDRAWAL_COMPLETED, BALANCE_UPDATED

#### Consumer Groups

- **trade-settlement-service:** Processes trade-events for wallet balance updates
- **analytics-service:** Aggregates trade data for reporting
- **notification-service:** Sends user notifications on order fills

---

## 6. Caching Strategy

### 6.1 Redis Configuration

**Port:** 6379
**Password:** redis_dev_password
**Max Memory:** 2GB (production: 16GB)
**Eviction Policy:** allkeys-lru

### 6.2 Cache Patterns

#### 1. Session Storage
```
Key: session:{sessionId}
TTL: 30 days
Value: { userId, ipAddress, createdAt, lastActivity }
```

#### 2. Balance Cache
```
Key: balance:{userId}:{currency}
TTL: 5 seconds
Value: { balance, lockedBalance, updatedAt }
```
**Strategy:** Cache-aside with TTL expiration

#### 3. Rate Limiting
```
Key: ratelimit:{userId}:{endpoint}
TTL: 60 seconds
Value: request count
Algorithm: Token bucket
```
**Limits:**
- API requests: 100/minute per user
- Order placement: 10/second per user

#### 4. Order Book Cache
```
Key: orderbook:{symbol}
TTL: No expiration (manually invalidated)
Value: Sorted set of orders { price, quantity, orderId, timestamp }
```
**Update Strategy:** Write-through (update DB + cache simultaneously)

#### 5. Market Data Cache
```
Key: ticker:{symbol}
TTL: 1 second
Value: { lastPrice, 24hVolume, 24hHigh, 24hLow, priceChange }
```

### 6.3 Cache Invalidation

- **Manual Invalidation:** On order placement/cancellation
- **TTL Expiration:** For frequently changing data (balances, tickers)
- **Event-Driven:** Kafka consumer invalidates cache on wallet events

---

## 7. API Gateway & Routing

### 7.1 Frontend Proxy Configuration

The React frontend uses Vite's proxy to route API requests:

```javascript
// vite.config.ts
export default {
  server: {
    proxy: {
      '/api/auth': 'http://localhost:3001',
      '/api/wallet': 'http://localhost:3002',
      '/api/v1': 'http://localhost:8085',
      '/ws': {
        target: 'ws://localhost:8085',
        ws: true
      }
    }
  }
}
```

### 7.2 Production API Gateway (AWS ALB)

In production, an Application Load Balancer routes traffic:

```
Internet → ALB (HTTPS) → Target Groups
                │
                ├─ /api/auth/* → Auth Service (ECS Tasks)
                ├─ /api/wallet/* → Wallet Service (ECS Tasks)
                ├─ /api/v1/* → Trade Engine (ECS Tasks)
                └─ /ws/* → Trade Engine WebSocket (ECS Tasks)
```

**SSL/TLS:** AWS Certificate Manager (ACM)
**WAF:** AWS WAF rules for SQL injection, XSS protection
**DDoS:** AWS Shield Standard (free tier)

### 7.3 Service Discovery

**Development:** Hardcoded container names in docker-compose
**Production:** AWS Cloud Map for service discovery

---

## 8. Monitoring & Observability

### 8.1 Prometheus Metrics

**Port:** 9090
**Scrape Interval:** 15 seconds

#### Metrics Collected

**Auth Service:**
- `auth_login_total` (counter) - Total login attempts
- `auth_login_failures` (counter) - Failed login attempts
- `auth_2fa_verifications` (counter) - 2FA verifications
- `auth_jwt_tokens_issued` (counter) - JWT tokens issued
- `auth_sessions_active` (gauge) - Active sessions

**Wallet Service:**
- `wallet_balance_queries` (counter) - Balance queries
- `wallet_deposits_total` (counter) - Total deposits by currency
- `wallet_withdrawals_total` (counter) - Total withdrawals
- `wallet_withdrawal_fees` (summary) - Withdrawal fee distribution
- `wallet_balance_cache_hits` (counter) - Cache hit rate

**Trade Engine:**
- `orders_placed_total` (counter) - Orders placed by symbol
- `orders_filled_total` (counter) - Orders fully filled
- `orders_cancelled_total` (counter) - Orders cancelled
- `trade_matching_latency` (histogram) - Matching latency (ms)
- `trade_execution_latency` (histogram) - Execution latency (ms)
- `orderbook_depth` (gauge) - Current order book depth
- `websocket_connections` (gauge) - Active WebSocket connections

### 8.2 Grafana Dashboards

**Port:** 3000 (with monitoring profile)
**Admin Credentials:** admin / admin

#### Pre-configured Dashboards

1. **System Overview**
   - Service health status
   - Request rates (req/sec)
   - Error rates by service
   - CPU and memory usage

2. **Trade Engine Performance**
   - Order throughput (orders/sec)
   - Matching latency (p50, p95, p99)
   - Order book depth by symbol
   - WebSocket connection count

3. **Business Metrics**
   - Trading volume (24h, 7d, 30d)
   - Active traders
   - Order fill rate
   - Fee revenue

4. **Database Performance**
   - Query latency by table
   - Connection pool usage
   - Cache hit rates
   - Table sizes and partition health

### 8.3 Logging Strategy

#### Log Levels
- **DEBUG:** Development only (verbose)
- **INFO:** Operational events (order placed, withdrawal initiated)
- **WARN:** Recoverable errors (rate limit exceeded, cache miss)
- **ERROR:** Unrecoverable errors (database connection failed)

#### Log Format (JSON)
```json
{
  "timestamp": "2025-11-30T12:00:00Z",
  "level": "INFO",
  "service": "trade-engine",
  "message": "Order placed successfully",
  "userId": "uuid",
  "orderId": "uuid",
  "symbol": "BTCUSDT",
  "side": "buy",
  "price": "42500.00",
  "quantity": "0.5",
  "traceId": "correlation-id"
}
```

#### Log Aggregation
- **Development:** Docker logs (`docker-compose logs -f`)
- **Production:** AWS CloudWatch Logs with log groups per service

### 8.4 Alert Rules

#### Critical Alerts (PagerDuty)
- Database connection pool exhausted (>90% usage)
- Order matching latency >100ms (p99)
- Service health check failing (3 consecutive failures)
- Disk space <10% free

#### Warning Alerts (Slack)
- Order fill rate <80%
- Cache hit rate <70%
- WebSocket reconnection rate >10%

---

## 9. Security Architecture

### 9.1 Authentication Flow

#### JWT Token Structure
```json
{
  "header": {
    "alg": "RS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "user_id",
    "email": "user@example.com",
    "roles": ["USER"],
    "iat": 1701360000,
    "exp": 1701361800
  }
}
```

**Signing:** RSA private key (4096-bit)
**Verification:** RSA public key (shared across services)
**Expiry:** 15 minutes (access token), 30 days (refresh token)

#### Key Management
- **Development:** Keys stored in `services/auth-service/keys/`
- **Production:** AWS Secrets Manager rotation (90 days)

### 9.2 Authorization (Role-Based Access Control)

#### Roles
- **USER:** Regular user (can trade, deposit, withdraw)
- **ADMIN:** Platform administrator (can view all orders, manage users)
- **SUPPORT:** Customer support (read-only access to user data)

#### Permission Matrix
| Resource | USER | ADMIN | SUPPORT |
|----------|------|-------|---------|
| Place Order | ✅ | ✅ | ❌ |
| Cancel Own Order | ✅ | ✅ | ❌ |
| View Own Orders | ✅ | ✅ | ❌ |
| View All Orders | ❌ | ✅ | ✅ |
| Manage Users | ❌ | ✅ | ❌ |
| Withdraw Funds | ✅ | ✅ | ❌ |

### 9.3 Rate Limiting

#### Per-User Limits
- API requests: 100/minute
- Order placement: 10/second
- Login attempts: 5/5 minutes (lockout after)
- Password reset: 3/hour

#### Per-IP Limits
- Registration: 5/hour
- Login attempts: 20/5 minutes

#### Implementation
```typescript
@UseGuards(ThrottlerGuard)
@Throttle(10, 60) // 10 requests per 60 seconds
@Post('orders')
async placeOrder(@Body() orderDto: CreateOrderDto) {
  // ...
}
```

### 9.4 IBAN/SWIFT Validation

The Wallet Service validates bank account information:

```typescript
// IBAN validation
const validateIBAN = (iban: string): boolean => {
  // Remove spaces and convert to uppercase
  const cleanIBAN = iban.replace(/\s/g, '').toUpperCase();

  // Check length (15-34 characters)
  if (cleanIBAN.length < 15 || cleanIBAN.length > 34) return false;

  // Verify checksum using mod-97 algorithm
  const rearranged = cleanIBAN.slice(4) + cleanIBAN.slice(0, 4);
  const numericIBAN = rearranged.replace(/[A-Z]/g, char =>
    (char.charCodeAt(0) - 55).toString()
  );

  return BigInt(numericIBAN) % 97n === 1n;
};

// SWIFT/BIC validation
const validateSWIFT = (swift: string): boolean => {
  // Format: AAAABBCCXXX (8 or 11 characters)
  const swiftRegex = /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/;
  return swiftRegex.test(swift.replace(/\s/g, '').toUpperCase());
};
```

### 9.5 KYC Verification Flow

```
User Uploads Document → MinIO Storage → Virus Scan (ClamAV)
                                           │
                                           ├─ Infected → Reject
                                           │
                                           ▼
                                      Manual Review Queue
                                           │
                                           ├─ Approved → Update KYC Level
                                           │
                                           └─ Rejected → Notify User
```

**KYC Levels:**
- **Level 0:** Unverified (0 TRY/day)
- **Level 1:** Email verified (1,000 TRY/day)
- **Level 2:** ID document + selfie (50,000 TRY/day)
- **Level 3:** Address proof (unlimited)

---

## 10. Deployment Architecture

### 10.1 Docker Compose (Development)

**File:** `/docker-compose.yml`

All services run in a single Docker network (`exchange_network`) with health checks and dependency management.

**Start All Services:**
```bash
docker-compose up -d
```

**Service Ports:**
- Auth Service: 3001
- Wallet Service: 3002
- Trade Engine: 8085
- PostgreSQL: 5432
- Redis: 6379
- RabbitMQ: 5672, 15672 (UI)
- Kafka: 9092, 29092
- Prometheus: 9090 (with `--profile monitoring`)
- Grafana: 3000 (with `--profile monitoring`)

### 10.2 Kubernetes Deployment (Production)

#### Namespace
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: exchange
```

#### Deployment Strategy
- **Rolling Updates:** maxSurge=1, maxUnavailable=0 (zero downtime)
- **Replicas:** Auth (3), Wallet (3), Trade Engine (5)
- **HPA:** Auto-scale Trade Engine from 5 to 20 based on CPU (70%)

#### Resource Limits
```yaml
resources:
  requests:
    cpu: 500m
    memory: 512Mi
  limits:
    cpu: 1000m
    memory: 1Gi
```

#### Health Probes
```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /health/ready
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 5
```

### 10.3 CI/CD Pipeline

**Tool:** GitHub Actions

#### Workflow Stages

1. **Lint & Format**
   - ESLint (TypeScript)
   - golangci-lint (Go)
   - Prettier

2. **Unit Tests**
   - Jest (NestJS services)
   - go test (Trade Engine)
   - Coverage threshold: 80%

3. **Integration Tests**
   - Testcontainers (PostgreSQL, Redis, RabbitMQ)
   - End-to-end API tests

4. **Security Scan**
   - npm audit
   - Snyk vulnerability scan
   - Trivy container scan

5. **Build Docker Images**
   - Multi-stage builds
   - Tag: `{service}:{git-sha}`
   - Push to AWS ECR

6. **Deploy to Dev**
   - Auto-deploy from `develop` branch
   - AWS ECS task definition update

7. **Deploy to Staging**
   - Manual approval required
   - Smoke tests after deployment

8. **Deploy to Production**
   - Manual approval required
   - Blue/Green deployment
   - Automatic rollback on health check failure

---

## 11. Data Flow Sequences

### 11.1 User Registration Flow

```
User → Frontend → Auth Service → PostgreSQL
                      │              │
                      │              └─ Insert user record
                      │
                      ├─ Generate email verification token
                      │
                      └─ RabbitMQ (email.queue) → Email Service
                                                       │
                                                       └─ Send verification email
```

**Timeline:** <500ms (excluding email delivery)

### 11.2 User Login Flow

```
User → Frontend → Auth Service
                      │
                      ├─ Validate credentials (bcrypt)
                      │
                      ├─ Check 2FA enabled?
                      │    │
                      │    ├─ Yes → Require 2FA code
                      │    └─ No  → Generate JWT
                      │
                      ├─ Sign JWT with RSA private key
                      │
                      ├─ Store session in Redis (TTL: 30 days)
                      │
                      └─ Return access token + refresh token
```

**Timeline:** <200ms

### 11.3 Wallet Balance Query Flow

```
User → Frontend → Wallet Service
                      │
                      ├─ Check Redis cache
                      │    │
                      │    ├─ Hit → Return cached balance
                      │    └─ Miss → Query PostgreSQL
                      │              │
                      │              ├─ SELECT balance FROM wallets
                      │              │
                      │              └─ Store in Redis (TTL: 5s)
                      │
                      └─ Return balance
```

**Timeline:** <50ms (cache hit), <150ms (cache miss)

### 11.4 Fiat Deposit Flow

```
User → Frontend → Wallet Service → PostgreSQL
                      │                │
                      │                ├─ Insert transaction (PENDING)
                      │                │
                      │                └─ Lock wallet for update
                      │
                      ├─ Call payment gateway API
                      │
                      ├─ Await payment confirmation (webhook)
                      │
                      ├─ Update transaction status (COMPLETED)
                      │
                      ├─ Update wallet balance
                      │
                      ├─ Invalidate Redis cache
                      │
                      └─ Kafka → wallet-events topic
                                   │
                                   └─ Notification Service → User email
```

**Timeline:** 2-5 minutes (payment gateway processing)

### 11.5 Order Placement Flow

```
User → Frontend → Trade Engine → Wallet Service (balance check)
                      │                │
                      │                └─ Verify sufficient balance
                      │
                      ├─ Validate order (price, quantity, symbol)
                      │
                      ├─ Lock balance in wallet
                      │
                      ├─ Insert order into PostgreSQL
                      │
                      ├─ Add order to in-memory order book
                      │
                      ├─ Cache order in Redis
                      │
                      ├─ Trigger matching engine
                      │    │
                      │    ├─ Find matching orders
                      │    │
                      │    ├─ Execute trades
                      │    │
                      │    └─ Settle trades (update wallets)
                      │
                      ├─ Kafka → order-events, trade-events
                      │
                      └─ WebSocket → Broadcast order book update
```

**Timeline:** <10ms (p99)

### 11.6 Trade Execution Flow

```
Matching Engine
  │
  ├─ Match buy order (limit $42,500) with sell order (limit $42,500)
  │
  ├─ Create trade record in PostgreSQL
  │    │
  │    └─ trade_id, buyer_user_id, seller_user_id, price, quantity, fees
  │
  ├─ Update order statuses (FILLED or PARTIALLY_FILLED)
  │
  ├─ Call Wallet Service settlement API
  │    │
  │    ├─ Deduct buyer's USDT balance
  │    ├─ Add buyer's BTC balance
  │    ├─ Deduct seller's BTC balance
  │    ├─ Add seller's USDT balance
  │    └─ Apply maker/taker fees
  │
  ├─ Kafka → Publish trade-events
  │
  └─ WebSocket → Broadcast to:
       ├─ Order book subscribers (all users)
       ├─ User order channel (buyer and seller)
       └─ Trade stream subscribers (all users)
```

**Timeline:** <20ms (p99)

---

## 12. Scalability & Performance

### 12.1 Horizontal Scaling

#### Services
- **Auth Service:** Stateless, scale to 3-10 replicas
- **Wallet Service:** Stateless, scale to 3-10 replicas
- **Trade Engine:** Stateful (order book), scale to 5-20 replicas with sharding by symbol

#### Databases
- **PostgreSQL:** Read replicas for reporting queries (not for trading)
- **Redis:** Redis Cluster with 6 nodes (3 masters, 3 replicas)

### 12.2 Database Indexing

All high-frequency queries have covering indexes:

```sql
-- Order queries by user (most common)
CREATE INDEX idx_orders_user_symbol ON orders(user_id, symbol, created_at DESC);

-- Order book queries by symbol
CREATE INDEX idx_orders_symbol_price ON orders(symbol, side, price, created_at)
WHERE status IN ('OPEN', 'PARTIALLY_FILLED');

-- Trade history queries
CREATE INDEX idx_trades_symbol_time ON trades(symbol, executed_at DESC);
```

### 12.3 Caching Layers

**Layer 1:** In-memory order book (Go maps)
**Layer 2:** Redis cache (order book snapshots, balances)
**Layer 3:** PostgreSQL (persistent storage)

### 12.4 Connection Pooling

- **Auth/Wallet Services:** TypeORM connection pool (max 50 connections)
- **Trade Engine:** pgx pool (max 100 connections)
- **Redis:** Connection pool (max 200 connections)

### 12.5 Rate Limiting Tiers

| Tier | API Requests | Orders | Websocket |
|------|--------------|--------|-----------|
| Free | 100/min | 10/sec | 1 connection |
| Basic | 500/min | 50/sec | 5 connections |
| Pro | 2000/min | 200/sec | 20 connections |
| VIP | Unlimited | 1000/sec | 100 connections |

---

## 13. Disaster Recovery & Backup

### 13.1 Backup Strategy

#### PostgreSQL Backups
- **Full Backup:** Daily at 2 AM UTC
- **Incremental Backup:** Every 6 hours
- **WAL Archiving:** Continuous
- **Retention:** 30 days
- **Storage:** AWS S3 with versioning
- **Encryption:** AES-256

#### Redis Backups
- **AOF Persistence:** Enabled (fsync every second)
- **RDB Snapshots:** Every 6 hours
- **Retention:** 7 days

### 13.2 Recovery Procedures

#### Database Restore
```bash
# Stop services
docker-compose down

# Restore PostgreSQL from S3 backup
aws s3 cp s3://exchange-backups/postgres/2025-11-30.sql.gz .
gunzip 2025-11-30.sql.gz
psql -U postgres -d exchange_dev < 2025-11-30.sql

# Restart services
docker-compose up -d
```

**RTO (Recovery Time Objective):** 30 minutes
**RPO (Recovery Point Objective):** 6 hours (incremental backups)

#### Service Failover
- **AWS RDS:** Multi-AZ with automatic failover (<60s)
- **Redis:** Redis Sentinel for HA (automatic failover)
- **Trade Engine:** Blue/Green deployment (manual switch)

### 13.3 Data Retention Policies

| Data Type | Retention | Archive After | Deletion After |
|-----------|-----------|---------------|----------------|
| Orders | 60 months | 12 months | 60 months |
| Trades | 36 months | 12 months | 36 months |
| Transactions | Permanent | 12 months | Never |
| Audit Logs | 24 months | 6 months | 24 months |
| Sessions | 30 days | N/A | 30 days |
| Email Logs | 12 months | 3 months | 12 months |

---

## Appendix A: Port Reference

| Service | Internal Port | External Port | Protocol |
|---------|---------------|---------------|----------|
| Auth Service | 3000 | 3001 | HTTP |
| Wallet Service | 3000 | 3002 | HTTP |
| Trade Engine | 8080 | 8085 | HTTP/WS |
| PostgreSQL | 5432 | 5432 | TCP |
| Redis | 6379 | 6379 | TCP |
| RabbitMQ (AMQP) | 5672 | 5672 | AMQP |
| RabbitMQ (UI) | 15672 | 15672 | HTTP |
| Kafka | 9092 | 9092, 29092 | TCP |
| Zookeeper | 2181 | 2181 | TCP |
| Kafka UI | 8080 | 8095 | HTTP |
| Prometheus | 9090 | 9090 | HTTP |
| Grafana | 3000 | 3000 | HTTP |
| MinIO API | 9000 | 9000 | HTTP |
| MinIO Console | 9001 | 9001 | HTTP |
| Mailpit SMTP | 1025 | 1025 | SMTP |
| Mailpit UI | 8025 | 8025 | HTTP |

---

## Appendix B: Environment Variables

### Auth Service
```env
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/exchange_dev
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=redis_dev_password
JWT_ALGORITHM=RS256
JWT_PRIVATE_KEY_PATH=/app/keys/private.pem
JWT_PUBLIC_KEY_PATH=/app/keys/public.pem
JWT_ACCESS_TOKEN_EXPIRY=15m
JWT_REFRESH_TOKEN_EXPIRY=30d
BCRYPT_ROUNDS=10
MAIL_HOST=mailpit
MAIL_PORT=1025
RECAPTCHA_SECRET_KEY=6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe
TWO_FACTOR_ENCRYPTION_KEY=base64-encoded-key
```

### Wallet Service
```env
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/exchange_dev
REDIS_HOST=redis
REDIS_PASSWORD=redis_dev_password
AUTH_SERVICE_URL=http://auth-service:3000
BALANCE_CACHE_TTL=5
TRY_MIN_WITHDRAWAL=100
TRY_MAX_WITHDRAWAL=50000
TRY_WITHDRAWAL_FEE=5
```

### Trade Engine
```env
DB_HOST=postgres
DB_PORT=5432
DB_NAME=mytrader_trade_engine
DB_USER=trade_engine_app
DB_PASSWORD=dev_password_change_in_prod
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=redis_dev_password
KAFKA_BROKERS=kafka:9092
LOG_LEVEL=info
PORT=8080
```

---

## Appendix C: API Authentication

All API requests (except public endpoints) require a JWT token in the `Authorization` header:

```
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

Public endpoints:
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/verify-email`
- `GET /api/v1/orderbook/:symbol` (read-only)
- `GET /api/v1/trades` (read-only)

---

## Appendix D: Error Codes

| Code | Meaning | HTTP Status |
|------|---------|-------------|
| AUTH_001 | Invalid credentials | 401 |
| AUTH_002 | Email not verified | 403 |
| AUTH_003 | 2FA required | 403 |
| AUTH_004 | Invalid 2FA code | 401 |
| WALLET_001 | Insufficient balance | 400 |
| WALLET_002 | Withdrawal limit exceeded | 400 |
| WALLET_003 | Invalid bank account | 400 |
| ORDER_001 | Invalid symbol | 400 |
| ORDER_002 | Invalid price | 400 |
| ORDER_003 | Order not found | 404 |
| ORDER_004 | Cannot cancel filled order | 400 |
| TRADE_001 | Matching engine error | 500 |

---

## Document Changelog

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-11-30 | Tech Lead | Initial architecture documentation |

---

**End of Architecture Documentation**
