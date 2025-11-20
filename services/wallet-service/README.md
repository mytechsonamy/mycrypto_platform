# Wallet Service

Enterprise-grade wallet management service for the MyCrypto cryptocurrency exchange platform. Handles wallet balance management, fiat (TRY) deposits and withdrawals, transaction history, and ledger accounting with bank account verification.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Service](#running-the-service)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Database](#database)
- [Troubleshooting](#troubleshooting)

---

## Overview

The Wallet Service is a critical microservice responsible for:
- **Multi-currency wallet management** (TRY, BTC, ETH, USDT)
- **TRY deposit processing** via bank transfers with IBAN validation
- **TRY withdrawal processing** to verified bank accounts with 2FA
- **Transaction history** with filtering and pagination
- **Double-entry ledger accounting** for audit trails
- **Balance caching** with Redis (5-second TTL) for performance
- **Bank account management** with Turkish IBAN validation

**Current Implementation Status (Sprint 2):**
- ✅ Wallet balance endpoints (2)
- ✅ Bank account management (3 endpoints)
- ✅ TRY deposit management (3 endpoints)
- ✅ TRY withdrawal management (3 endpoints)
- ✅ Transaction history (1 endpoint)
- ⏳ Crypto deposits (Sprint 3)
- ⏳ Crypto withdrawals (Sprint 3)

## Technology Stack

- **Runtime:** Node.js 18.x+
- **Framework:** NestJS 10.x
- **Language:** TypeScript 5.x (strict mode)
- **Database:** PostgreSQL 15+ (via TypeORM)
- **Cache:** Redis 7+ (ioredis)
- **Message Queue:** RabbitMQ 3.x (infrastructure ready, integration pending)
- **Authentication:** JWT (RS256) with shared public key
- **API Documentation:** OpenAPI 3.0 (Swagger)
- **Validation:** class-validator, class-transformer
- **Testing:** Jest, Supertest

## Directory Structure

```
wallet-service/
├── src/
│   ├── wallet/              # Wallet balance module
│   ├── ledger/              # Transaction ledger module
│   ├── deposit/             # Deposit processing module
│   ├── withdrawal/          # Withdrawal processing module
│   ├── common/              # Shared utilities and modules
│   │   ├── redis/           # Redis caching service
│   │   └── health.controller.ts
│   ├── config/              # Configuration files
│   ├── app.module.ts        # Root application module
│   └── main.ts              # Application bootstrap
├── test/                    # E2E tests
├── migrations/              # Database migrations
├── Dockerfile              # Multi-stage Docker build
├── package.json
├── tsconfig.json
└── nest-cli.json
```

## Environment Variables

### Required Configuration

```bash
# Application
NODE_ENV=development
LOG_LEVEL=debug
PORT=3000

# Database
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/exchange_dev

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=redis_dev_password

# RabbitMQ
RABBITMQ_URL=amqp://rabbitmq:rabbitmq_dev_password@rabbitmq:5672

# Auth Service Integration
AUTH_SERVICE_URL=http://auth-service:3000
JWT_ALGORITHM=RS256
JWT_PUBLIC_KEY_PATH=/app/keys/public.pem

# Rate Limiting
RATE_LIMIT_TTL=60          # Time window in seconds
RATE_LIMIT_LIMIT=100       # Max requests per window

# Wallet Configuration
BALANCE_CACHE_TTL=5        # Balance cache TTL in seconds
WITHDRAWAL_LOCK_TTL=300    # Withdrawal lock duration in seconds

# TRY Limits (Turkish Lira)
TRY_MIN_DEPOSIT=100
TRY_MAX_DEPOSIT=50000
TRY_MIN_WITHDRAWAL=100
TRY_MAX_WITHDRAWAL=50000
TRY_WITHDRAWAL_FEE=5
```

## Getting Started

### Prerequisites

- Node.js 20 LTS
- npm or yarn
- PostgreSQL 16
- Redis 7
- RabbitMQ 3.12

### Installation

```bash
# Install dependencies
npm install

# Run database migrations
npm run typeorm:run
```

### Development

```bash
# Start in watch mode
npm run start:dev

# Start with debug mode
npm run start:debug
```

### Production Build

```bash
# Build TypeScript
npm run build

# Start production server
npm run start:prod
```

## Docker Deployment

### Build Image

```bash
docker build -t wallet-service:latest .
```

### Run with Docker Compose

The wallet service is integrated into the main docker-compose.yml:

```bash
# Start all services including wallet-service
docker-compose up -d

# View wallet service logs
docker-compose logs -f wallet-service

# Check health
curl http://localhost:3002/health
```

### Access Points

- **Service:** http://localhost:3002
- **API Docs:** http://localhost:3002/api/docs
- **Health Check:** http://localhost:3002/health
- **Readiness:** http://localhost:3002/health/ready

## API Endpoints (Planned)

### Wallet Balance
- `GET /api/v1/wallet/balances` - Get all user balances
- `GET /api/v1/wallet/{asset}/balance` - Get specific asset balance

### Deposits
- `POST /api/v1/wallet/deposit/try` - Initiate TRY deposit
- `POST /api/v1/wallet/deposit/crypto` - Get crypto deposit address

### Withdrawals
- `POST /api/v1/wallet/withdraw/try` - Request TRY withdrawal (requires 2FA)
- `POST /api/v1/wallet/withdraw/crypto` - Request crypto withdrawal (requires 2FA)

### Transaction History
- `GET /api/v1/wallet/transactions` - Get transaction history
- `GET /api/v1/wallet/transactions/export` - Export to CSV

### WebSocket Events
- `wallet.balance.updated` - Real-time balance updates
- `transaction.status.updated` - Transaction status changes

## Redis Caching Strategy

### Balance Caching
- **Key Pattern:** `balance:{userId}:{asset}`
- **TTL:** 5 seconds (as per requirements)
- **Invalidation:** On any balance change (deposit, withdrawal, trade)

### Withdrawal Locks
- **Key Pattern:** `withdrawal:lock:{userId}:{withdrawalId}`
- **TTL:** 300 seconds (5 minutes)
- **Purpose:** Prevent concurrent withdrawal processing

### Real-time Updates
- **Channel:** `wallet:balance:{userId}`
- **Pub/Sub:** For WebSocket balance updates

## Database Schema (To Be Created)

The wallet service will use the following tables:

### user_wallets
- Crypto balances (BTC, ETH, USDT)
- Available, locked, deposit address
- User association

### fiat_accounts
- TRY balances
- Virtual IBAN
- Available, locked balance

### ledger_entries
- Immutable transaction log
- Double-entry accounting
- Audit trail

### deposit_requests
- TRY and crypto deposit tracking
- Status workflow
- Reference codes

### withdrawal_requests
- TRY and crypto withdrawal tracking
- 2FA verification
- Admin approval

### bank_accounts
- User saved bank accounts
- IBAN validation
- Account holder verification

## Security Features

### Authentication & Authorization
- JWT token validation (shared public key with auth-service)
- User identity verification
- Role-based access control

### Withdrawal Security
- 2FA code verification required
- First withdrawal requires admin approval
- IBAN and account holder name validation
- Daily withdrawal limits enforced

### Data Security
- Non-root Docker user
- No secrets in code (environment variables only)
- Balance calculations verified against ledger
- Withdrawal locks to prevent double-spending

## Performance Considerations

### Caching
- Balance queries cached for 5 seconds
- Reduces database load
- Invalidated on balance changes

### Database Optimization
- Indexed queries on user_id, wallet_id
- Connection pooling
- Read replicas for transaction history

### Rate Limiting
- 100 requests per 60 seconds per user
- Prevents abuse
- Configurable per endpoint

## Monitoring & Observability

### Health Checks
- `/health` - Basic liveness probe
- `/health/ready` - Readiness probe (checks DB and Redis)

### Metrics (To Be Implemented)
- Balance query latency
- Deposit/withdrawal rates
- Failed transaction count
- Cache hit ratio

### Logging
- Structured JSON logging
- Request/response logging
- Error tracking with stack traces

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## Development Guidelines

### Adding New Features

1. Create feature module in appropriate directory (wallet/, deposit/, etc.)
2. Define DTOs with class-validator decorators
3. Create service with business logic
4. Create controller with OpenAPI decorators
5. Add to app.module.ts imports
6. Write unit tests (80% coverage minimum)
7. Update OpenAPI documentation

### Database Migrations

```bash
# Generate migration
npm run typeorm:generate -- -n MigrationName

# Run migrations
npm run typeorm:run

# Revert migration
npm run typeorm:revert
```

## Deployment Checklist

- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] Redis connection verified
- [ ] RabbitMQ connection verified
- [ ] JWT public key mounted
- [ ] Health checks passing
- [ ] Swagger docs accessible
- [ ] Logs flowing to centralized logging

## Dependencies on Other Services

### Auth Service
- JWT public key for token validation
- User identity verification
- 2FA verification

### Database Service
- PostgreSQL for wallet data
- Migrations applied

### Infrastructure Services
- Redis for caching
- RabbitMQ for async processing
- Bank API for TRY transfers (to be integrated)

## Next Steps for Backend Team

1. **Implement Wallet Module** (BE-021, BE-022)
   - Create wallet entities (UserWallet, FiatAccount)
   - Implement balance calculation service
   - Create GET /balances endpoint
   - Add Redis caching

2. **Implement WebSocket Gateway** (BE-023)
   - Real-time balance updates
   - Socket.IO integration
   - Channel subscription per user

3. **Implement Deposit Module** (BE-025, BE-026)
   - TRY deposit endpoint
   - Virtual IBAN generation
   - Bank callback handler

4. **Implement Withdrawal Module** (BE-029, BE-030, BE-031)
   - TRY withdrawal endpoint
   - IBAN validation
   - 2FA verification
   - Admin approval workflow

5. **Implement Ledger Module** (BE-034, BE-035, BE-036)
   - Transaction history
   - CSV export
   - Filtering and pagination

## Support

For questions or issues:
- Check Sprint 2 Plan: `/docs/SPRINT_2_PLAN.md`
- Review API docs: http://localhost:3002/api/docs
- Contact: DevOps Agent (infrastructure), Backend Agent (implementation)

## License

UNLICENSED - Internal MyCrypto Platform Service
