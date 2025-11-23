# Trade Engine Service

High-performance cryptocurrency exchange trade matching engine built with Go, PostgreSQL, Redis, and RabbitMQ.

## Overview

The Trade Engine is a critical component of the MyCrypto Platform that handles:
- Order placement and management
- Order book maintenance
- Trade matching and execution
- Real-time order book updates via WebSocket
- Event-driven architecture with message queues

## Technology Stack

- **Language:** Go 1.21+
- **Database:** PostgreSQL 16 with monthly partitioning
- **Cache:** Redis 7
- **Message Broker:** RabbitMQ 3 with Management UI
- **Connection Pooling:** PgBouncer
- **Container:** Docker & Docker Compose
- **Router:** Chi v5
- **Logger:** Zap
- **Config:** Viper

## Quick Start

### Prerequisites

- Docker Desktop (or Docker + Docker Compose)
- Go 1.21+ (for local development)
- Make (optional, but recommended)

### Setup Development Environment

```bash
# Navigate to service directory
cd services/trade-engine

# Copy environment file
cp .env.example .env

# Start all services
docker-compose up -d

# Verify services are healthy
make health
# or
./scripts/verify-services.sh

# Run database migrations (when Backend Agent is ready)
make migrate

# Start the application (when ready)
make run
```

### Quick Health Checks

```bash
# Check all services
make health

# View service status
make ps

# View logs
make logs

# Connect to database
make db-shell

# Access RabbitMQ Management UI
make rabbitmq-ui  # Opens http://localhost:15673
# Credentials: admin / changeme
```

## Service Architecture

### Docker Services

All services run in Docker containers with proper networking and health checks.

#### PostgreSQL (Port 5433)
- **Container Port:** 5432
- **Host Port:** 5433
- **Database:** trade_engine_db
- **User:** trade_engine_user
- **Volume:** `postgres-data:/var/lib/postgresql/data`

Database includes:
- ENUM types for orders, trades, and symbols
- `orders` table with monthly partitioning
- `trades` table with daily partitioning
- `symbols` table with 10 default trading pairs
- Indexes for optimized query performance
- Views for monitoring and analytics
- Automated partition management functions

Connection string (from Docker):
```
postgresql://trade_engine_user:trade_engine_pass@postgres:5432/trade_engine_db
```

Connection string (from Host):
```
postgresql://trade_engine_user:trade_engine_pass@localhost:5433/trade_engine_db
```

#### Redis (Port 6380)
- **Container Port:** 6379
- **Host Port:** 6380
- **Volume:** `redis-data:/data`
- **Features:** Persistence with AOF (Append-Only File)

Used for:
- Order book caching
- Real-time order updates
- Session management
- Rate limiting

#### RabbitMQ (Port 5673)
- **Container Port (AMQP):** 5672
- **Host Port (AMQP):** 5673
- **Management UI Port:** 15673
- **Default User:** admin
- **Default Password:** changeme
- **Volume:** `rabbitmq-data:/var/lib/rabbitmq`

Used for:
- Order event publishing
- Trade notifications
- Risk management queue
- Trade settlements

Management UI: http://localhost:15673

#### PgBouncer (Port 6433)
- **Container Port:** 5432
- **Host Port:** 6433
- **Pool Mode:** transaction
- **Max Connections:** 100
- **Default Pool Size:** 20

Provides connection pooling for efficient database access:
```
postgresql://trade_engine_user:trade_engine_pass@localhost:6433/trade_engine_db
```

## Database Schema

### Tables

#### `symbols`
Trading pair configurations (e.g., BTC/USDT, ETH/USDT)
- Default 10 pairs loaded on migration
- Active/halted/maintenance/delisted status
- Min/max order sizes and price steps

#### `orders` (partitioned by month)
- 12 monthly partitions created
- Columns: order_id, user_id, symbol, side, type, status, quantity, filled_quantity, price, stop_price, time_in_force, timestamps
- Indexes on: user_id, symbol+status, created_at
- Performance: < 100ms for typical queries

#### `trades` (partitioned by day)
- 30 daily partitions created
- Columns: trade_id, buy_order_id, sell_order_id, buyer_user_id, seller_user_id, symbol, quantity, price, executed_at
- Indexes on: symbol+executed_at, buyer_user_id, seller_user_id
- Used for: Order execution history, performance analytics

#### Auxiliary Tables
- `stop_orders_watchlist`: Active stop order monitoring
- `order_book_snapshots`: Periodic order book snapshots for recovery
- `partition_retention_config`: Data retention policies (60 months default)

### ENUM Types

```sql
order_side_enum: BUY, SELL
order_type_enum: MARKET, LIMIT, STOP, STOP_LIMIT, TRAILING_STOP
order_status_enum: PENDING, OPEN, PARTIALLY_FILLED, FILLED, CANCELLED, REJECTED, EXPIRED
time_in_force_enum: GTC, IOC, FOK, DAY
symbol_status_enum: ACTIVE, HALTED, MAINTENANCE, DELISTED
```

### Views

Monitoring and analytics views:
- `v_active_orders`: Currently active orders by symbol
- `v_trade_volume_24h`: 24-hour trading volume by pair
- `v_order_status_distribution`: Order status breakdown
- `mv_order_book_snapshot`: Materialized view for fast order book access

### Functions

Automated management functions:
- `maintain_partitions()`: Create partitions for next 3 months (orders) and 7 days (trades)
- `check_partition_health()`: Health status of all partitions
- `refresh_order_book_snapshot()`: Update materialized views
- `check_db_connections()`: Monitor active connections
- `check_table_sizes()`: Monitor table sizes for capacity planning

## Project Structure

```
/services/trade-engine/
├── cmd/
│   └── server/
│       └── main.go                 # Application entry point
├── internal/                       # Private application code
│   ├── config/                     # Configuration management
│   ├── server/                     # HTTP server setup
│   ├── order/                      # Order domain logic
│   ├── matching/                   # Matching engine
│   └── trade/                      # Trade execution
├── pkg/                            # Reusable packages
│   ├── config/                     # Configuration loading
│   ├── logger/                     # Structured logging
│   └── clients/                    # External service clients
├── src/
│   └── database/
│       └── migrations/             # TypeORM migrations (6 files)
├── config/
│   ├── config.yaml                 # Application configuration
│   └── config.example.yaml         # Configuration template
├── migrations/                     # Database migration files
├── tests/
│   ├── unit/                       # Unit tests
│   ├── integration/                # Integration tests
│   └── e2e/                        # End-to-end tests
├── docs/
│   ├── database-schema.md          # Database documentation
│   ├── api.md                      # API documentation
│   └── architecture.md             # Architecture overview
├── scripts/                        # Utility scripts
│   ├── verify-services.sh          # Service health verification
│   └── verify-schema.sh            # Database schema verification
├── docker-compose.yml              # Multi-service Docker setup
├── Dockerfile                      # Go application container
├── .env.example                    # Environment variables template
├── .gitignore                      # Git ignore rules
├── go.mod                          # Go module definition
├── go.sum                          # Go dependencies lock file
├── Makefile                        # Common commands
└── README.md                       # This file
```

## Make Commands

Common development tasks:

### Docker Management
```bash
make up              # Start all services
make down            # Stop all services
make ps              # Show service status
make logs            # View all service logs
make logs-postgres   # View PostgreSQL logs
make logs-redis      # View Redis logs
make logs-rabbitmq   # View RabbitMQ logs
make health          # Check service health
```

### Database
```bash
make migrate         # Run database migrations
make migrate-revert  # Revert last migration
make migrate-show    # Show migration status
make db-shell        # Connect to PostgreSQL
make schema-verify   # Verify database schema
```

### Service Access
```bash
make redis-shell          # Connect to Redis CLI
make rabbitmq-ui          # Open RabbitMQ Management UI
make db-shell-pgbouncer   # Connect via PgBouncer
```

### Development
```bash
make build           # Build the binary
make run             # Build and run locally
make test            # Run unit tests
make test-race       # Run tests with race detector
make test-coverage   # Generate coverage report
make lint            # Format and lint code
make fmt             # Format code
```

### Setup & Cleanup
```bash
make setup           # Initialize dev environment
make clean           # Remove build artifacts
make clean-volumes   # Remove Docker volumes (WARNING: deletes data)
make version         # Show service version
make status          # Show detailed status
```

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and update values:

```env
# Database
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=trade_engine_db
POSTGRES_USER=trade_engine_user
POSTGRES_PASSWORD=changeme

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# RabbitMQ
RABBITMQ_HOST=rabbitmq
RABBITMQ_PORT=5672
RABBITMQ_USER=admin
RABBITMQ_PASS=changeme

# Application
SERVER_HTTP_PORT=8080
LOG_LEVEL=info
```

### YAML Configuration

See `config/config.example.yaml` for all available options:

```yaml
server:
  http_port: 8080
  websocket_port: 8081
  read_timeout: 30s
  write_timeout: 30s

database:
  host: localhost
  port: 5433
  database: trade_engine_db
  user: trade_engine_user
  password: changeme

redis:
  host: localhost
  port: 6380

rabbitmq:
  host: localhost
  port: 5673
```

Environment variables override YAML config. Use `TRADE_ENGINE_` prefix:
```bash
TRADE_ENGINE_SERVER_HTTP_PORT=9000 go run cmd/server/main.go
```

## API Endpoints

### Health Checks

**GET /health**
```bash
curl http://localhost:8080/health
# Response: {"status": "ok", "version": "1.0.0"}
```

**GET /ready**
```bash
curl http://localhost:8080/ready
# Response: {"status": "ready", "services": {"database": "ok", "redis": "ok"}}
```

Additional endpoints will be documented as they are implemented.

## Testing

### Run Tests
```bash
# Unit tests
make test

# With race detector
make test-race

# Generate coverage report
make test-coverage
```

### Verification Scripts

Database schema verification:
```bash
./scripts/verify-schema.sh
```

Service health verification:
```bash
./scripts/verify-services.sh
# or
make verify
```

## Development Workflow

### 1. Initial Setup
```bash
cd services/trade-engine
cp .env.example .env
make setup
```

### 2. Verify Services
```bash
make health
./scripts/verify-services.sh
```

### 3. Run Migrations
```bash
make migrate
make schema-verify
```

### 4. Start Development
```bash
make run
```

### 5. Test Endpoints
```bash
curl http://localhost:8080/health
curl http://localhost:8080/ready
```

## Debugging

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f postgres
docker-compose logs -f redis
docker-compose logs -f rabbitmq
docker-compose logs -f pgbouncer
```

### Check Ports
```bash
# See which processes are using ports
lsof -i :5433
lsof -i :6380
lsof -i :5673
lsof -i :6433
```

### Check Volumes
```bash
# List volumes
docker volume ls

# Inspect volume
docker volume inspect trade-engine_postgres-data

# Remove all volumes (WARNING: destructive)
make clean-volumes
```

### Connect to Services

**PostgreSQL:**
```bash
psql -h localhost -p 5433 -U trade_engine_user -d trade_engine_db

# Check tables
\dt

# Check ENUM types
\dT+

# Check partitions
SELECT tablename FROM pg_tables WHERE tablename LIKE 'orders_%';
```

**Redis:**
```bash
redis-cli -h localhost -p 6380
> PING
PONG
> SELECT 0
> KEYS *
```

**RabbitMQ:**
- Management UI: http://localhost:15673
- Default credentials: admin / changeme

## Performance Tuning

### Database Connection Pooling
- Use PgBouncer (port 6433) for high-traffic scenarios
- Configure `max_client_conn` in environment variables
- Recommended: 20-25 connections per worker

### Redis Configuration
- Persistence: AOF enabled for durability
- Memory management: Configure maxmemory policy as needed
- Replication: Can be added for high availability

### Partition Management
- Automated daily maintenance via `maintain_partitions()` function
- Manually trigger: `SELECT maintain_partitions();`
- Monitor partition health: `SELECT * FROM check_partition_health();`

## Troubleshooting

### Issue: "Cannot connect to PostgreSQL"
```bash
# Check if service is running
docker-compose ps postgres

# Check health
docker-compose exec postgres pg_isready -U trade_engine_user

# View logs
docker-compose logs postgres

# Restart
docker-compose restart postgres
```

### Issue: "PgBouncer connection failed"
```bash
# PgBouncer depends on PostgreSQL being healthy
docker-compose ps
docker-compose logs pgbouncer

# Ensure PostgreSQL is healthy first
make health
```

### Issue: "Redis timeout"
```bash
# Check Redis is running
docker-compose exec redis redis-cli ping

# Check memory usage
docker-compose exec redis redis-cli info memory

# View logs
docker-compose logs redis
```

### Issue: "Port already in use"
```bash
# Find process using port
lsof -i :5433

# Kill process (if not needed)
kill -9 <PID>

# Or change port in .env
```

## Database Maintenance

### Backup
```bash
# Backup entire database
pg_dump -h localhost -p 5433 -U trade_engine_user trade_engine_db > backup.sql

# Restore
psql -h localhost -p 5433 -U trade_engine_user trade_engine_db < backup.sql
```

### Check Partition Health
```bash
psql -h localhost -p 5433 -U trade_engine_user -d trade_engine_db -c "SELECT * FROM check_partition_health();"
```

### Monitor Table Sizes
```bash
psql -h localhost -p 5433 -U trade_engine_user -d trade_engine_db -c "SELECT * FROM check_table_sizes();"
```

### Monitor Connections
```bash
psql -h localhost -p 5433 -U trade_engine_user -d trade_engine_db -c "SELECT * FROM check_db_connections();"
```

## Security Considerations

### Development Environment
- Default credentials are for local development only
- Change passwords in `.env` before deploying to production
- Enable SSL/TLS for production PostgreSQL connections
- Use authenticated connections for Redis in production
- Use VPC/security groups for RabbitMQ access in production

### Production Deployment
- Use secrets management (AWS Secrets Manager, Vault)
- Enable database backups and replication
- Configure proper RBAC in PostgreSQL
- Use connection pooling (PgBouncer) with authentication
- Enable monitoring and alerting
- Implement data retention policies

## Monitoring and Observability

The service includes health check endpoints for Kubernetes-style orchestration:

**GET /health** - Basic health status
**GET /ready** - Readiness check (includes dependency checks)

For advanced monitoring, see `/docs/observability.md` (to be created).

## Documentation

- **Database Schema:** `/docs/database-schema.md`
- **API Documentation:** `/docs/api.md` (to be created)
- **Architecture:** `/docs/architecture.md` (to be created)
- **Handoff Notes:** `/docs/HANDOFF-TO-DEVOPS.md`

## Support

### For Issues
1. Check troubleshooting section above
2. View logs: `docker-compose logs -f`
3. Run verification: `./scripts/verify-services.sh`
4. Check database health: `make schema-verify`

### For Questions
- Database issues: See Database Agent handoff
- Application issues: See Backend Agent notes
- Infrastructure issues: Check this README and Docker Compose logs

## Related Services

- **Auth Service:** Authentication and authorization (port 3001)
- **Wallet Service:** Deposit/withdrawal management (port 3002)
- **Trade Engine:** This service (port 8080)

## Next Steps

1. Backend Agent (TASK-BACKEND-001):
   - Initialize Go module
   - Create HTTP server with health endpoints
   - Implement configuration management
   - Set up database connections

2. QA Agent (TASK-QA-001):
   - Create test plan templates
   - Develop integration tests
   - Verify all infrastructure

## License

This is part of the MyCrypto Platform. All rights reserved.

---

**Last Updated:** 2025-11-23
**Version:** 1.0.0
**Status:** Infrastructure Ready ✅
