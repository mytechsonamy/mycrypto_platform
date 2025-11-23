# Handoff Documentation: Infrastructure to Backend Agent

**From:** DevOps Engineer (TASK-DEVOPS-001)
**To:** Backend Agent (TASK-BACKEND-001)
**Date:** 2025-11-23
**Status:** READY FOR HANDOFF ✅

---

## Executive Summary

All infrastructure for the Trade Engine service is complete and verified healthy. The complete project structure, Docker Compose setup with all required services, and comprehensive documentation are ready for Backend Agent to begin implementation.

This document provides everything you need to get started with TASK-BACKEND-001.

---

## What's Ready for You

### 1. Complete Project Structure

The project structure is fully scaffolded at `/services/trade-engine/`:

```
/services/trade-engine/
├── cmd/server/main.go                 ✅ Empty placeholder - create your main entry point
├── internal/                          ✅ Package structure ready for your code
│   ├── config/                        Create config management here
│   ├── server/                        Create HTTP server setup here
│   ├── order/                         (For later phases)
│   ├── matching/                      (For later phases)
│   └── trade/                         (For later phases)
├── pkg/                               ✅ Reusable packages ready
│   ├── config/                        Create Viper config loading
│   ├── logger/                        Create Zap logging setup
│   └── clients/                       (For later phases)
├── config/
│   ├── config.example.yaml            ✅ Template with all settings
│   └── config.yaml                    Create this from example
├── tests/
│   ├── unit/                          Create your unit tests
│   ├── integration/                   Create integration tests
│   └── e2e/                           Create E2E tests
├── docs/                              ✅ Complete documentation
│   ├── database-schema.md             Database schema from DB Agent
│   ├── HANDOFF-TO-DEVOPS.md           Infrastructure details
│   └── TASK-DB-001-COMPLETION-REPORT.md
└── ... (other files below)
```

### 2. Docker Services (All Running & Healthy)

All services are up and verified healthy:

```
PostgreSQL 16    ✅ Host: localhost:5433
Redis 7          ✅ Host: localhost:6380
RabbitMQ 3       ✅ Host: localhost:5673 (AMQP), 15673 (Management UI)
PgBouncer        ✅ Host: localhost:6433 (connection pooling)
```

Start services anytime with:
```bash
cd /services/trade-engine
docker-compose up -d
```

### 3. Environment Configuration

**`.env` file is ready** with all variables set to development defaults:

```env
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=trade_engine_db
POSTGRES_USER=trade_engine_user
POSTGRES_PASSWORD=changeme

REDIS_HOST=redis
REDIS_PORT=6379

RABBITMQ_HOST=rabbitmq
RABBITMQ_PORT=5672
RABBITMQ_USER=admin
RABBITMQ_PASS=changeme

# ... more variables in .env file
```

### 4. Go Module Setup

**`go.mod` is ready** with all required dependencies declared:

- Chi router v5
- Viper configuration management
- Zap structured logging
- GORM with PostgreSQL driver
- Redis client
- RabbitMQ client
- UUID generation

Just run:
```bash
go mod tidy
```

### 5. Database Schema (Complete from DB Agent)

**Database is ready with:**
- ✅ 5 ENUM types (order_side, order_type, order_status, time_in_force, symbol_status)
- ✅ 3 main tables (symbols, orders, trades) with 12+ monthly and 30+ daily partitions
- ✅ 17+ performance indexes
- ✅ 6 utility functions for management
- ✅ 7 views for analytics and monitoring
- ✅ 10 default trading symbols loaded
- ✅ Automated partition management

See: `/docs/database-schema.md` for complete schema documentation

---

## Your TASK-BACKEND-001 Checklist

### Acceptance Criteria (from task definition)

- [ ] Go module initialized ✅ (already done - verify with `go mod tidy`)
- [ ] Dependencies added ✅ (declared in go.mod - run `go mod tidy`)
- [ ] Configuration management package created (pkg/config/)
  - [ ] Load from YAML file (config/config.yaml)
  - [ ] Support environment variable overrides
  - [ ] TRADE_ENGINE_ prefix for env vars
- [ ] Logger package created (pkg/logger/)
  - [ ] Structured JSON logging with Zap
  - [ ] Support for debug/info/warn/error/fatal levels
  - [ ] Output to stdout in development
- [ ] HTTP server created (internal/server/router.go)
  - [ ] Use Chi router
  - [ ] Implement GET /health endpoint
  - [ ] Implement GET /ready endpoint
- [ ] Main entry point (cmd/server/main.go)
  - [ ] Load config from config/config.yaml
  - [ ] Initialize logger
  - [ ] Create HTTP server
  - [ ] Handle graceful shutdown
  - [ ] Server starts on port 8080 by default
- [ ] Health endpoint returns: `{"status": "ok", "version": "1.0.0"}`
- [ ] Ready endpoint checks:
  - [ ] Database connectivity (ping)
  - [ ] Redis connectivity (ping)
  - [ ] Returns 200 if all healthy, 503 if any down
- [ ] Server starts successfully: `go run cmd/server/main.go`
- [ ] Configuration file: config/config.yaml (see config/config.example.yaml)
- [ ] Example configuration: config/config.example.yaml ✅ (already provided)
- [ ] Environment variable overrides work
  - [ ] Example: `TRADE_ENGINE_SERVER_HTTP_PORT=9000 go run cmd/server/main.go`
- [ ] JSON logging output (not text)
- [ ] Unit tests created (coverage > 80%)
- [ ] Integration test for server startup

---

## Getting Started (Quick Start)

### Step 1: Verify Services Are Running

```bash
cd /services/trade-engine
make health
```

Expected output:
```
✓ PostgreSQL
✓ Redis
✓ RabbitMQ
✓ PgBouncer
```

### Step 2: Download Go Dependencies

```bash
cd /services/trade-engine
go mod tidy
```

### Step 3: Copy Configuration

```bash
cp config/config.example.yaml config/config.yaml
# Edit config/config.yaml if needed for your local setup
```

### Step 4: Test Database Connection

```bash
make db-shell
# In psql:
\dt              # Should see tables
\dT+             # Should see ENUM types
exit
```

### Step 5: Start Building Your Code

Create the following packages in order:
1. `pkg/config/` - Configuration management
2. `pkg/logger/` - Structured logging
3. `internal/server/` - HTTP server with Chi
4. Update `cmd/server/main.go` - Main entry point

---

## Available Make Commands

For your convenience during development:

```bash
make up              # Start Docker services
make down            # Stop services
make health          # Check service health
make logs            # View service logs
make db-shell        # Connect to PostgreSQL
make redis-shell     # Connect to Redis
make rabbitmq-ui     # Open RabbitMQ UI
make migrate         # Run database migrations (when ready)
make build           # Build your binary
make run             # Run your application
make test            # Run unit tests
make test-coverage   # Generate coverage report
make clean           # Remove build artifacts
```

---

## Database Connection Details

### From Your Go Application

**Use this connection string in your code:**

```go
// Environment variables (configured in .env)
host := os.Getenv("POSTGRES_HOST")      // "postgres" for docker network
port := os.Getenv("POSTGRES_PORT")      // "5432" for docker network
dbName := os.Getenv("POSTGRES_DB")      // "trade_engine_db"
user := os.Getenv("POSTGRES_USER")      // "trade_engine_user"
password := os.Getenv("POSTGRES_PASSWORD") // "changeme"

// Connection string for GORM
dsn := fmt.Sprintf("host=%s port=%s dbname=%s user=%s password=%s sslmode=disable",
    host, port, dbName, user, password)

// Open database
db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
```

### From Your Local Machine (for testing)

```bash
psql -h localhost -p 5433 -U trade_engine_user -d trade_engine_db
```

### Via PgBouncer (connection pooling)

```bash
psql -h localhost -p 6433 -U trade_engine_user -d trade_engine_db
```

---

## Redis Configuration

### In Your Go Code

```go
client := redis.NewClient(&redis.Options{
    Addr:     "redis:6379",  // From docker network
    Password: "",
    DB:       0,
})

// For local development from host:
// Addr: "localhost:6380"
```

### Testing from CLI

```bash
redis-cli -h localhost -p 6380
# Inside redis-cli:
> PING
PONG
> SET key value
> GET key
```

---

## RabbitMQ Configuration

### Connection Details

```
Host: rabbitmq (Docker) / localhost (host)
AMQP Port: 5672 (Docker) / 5673 (host)
User: admin
Password: changeme
VHost: /
```

### Management UI

Open in browser: http://localhost:15673
- Default credentials: admin / changeme

### In Your Go Code

```go
conn, err := amqp.Dial("amqp://admin:changeme@rabbitmq:5672/")
```

---

## Configuration Structure (config.yaml)

See `config/config.example.yaml` for complete example.

Key sections you'll need:

```yaml
server:
  http_port: 8080
  websocket_port: 8081
  read_timeout: 30s
  write_timeout: 30s
  shutdown_timeout: 30s

database:
  host: postgres
  port: 5432
  database: trade_engine_db
  user: trade_engine_user
  password: changeme
  max_open_conns: 25
  max_idle_conns: 5
  conn_max_lifetime: 5m

redis:
  host: redis
  port: 6379
  db: 0
  pool_size: 10

rabbitmq:
  host: rabbitmq
  port: 5672
  user: admin
  password: changeme

logging:
  level: info
  format: json
```

---

## Testing Tips

### Test Database Connection

```go
// In your code
sqlDB, err := db.DB()
if err != nil {
    // Handle error
}
defer sqlDB.Close()

err = sqlDB.Ping()
if err != nil {
    // Database not available
}
```

### Test Redis Connection

```go
// In your ready endpoint
status := client.Ping(ctx)
if status.Err() != nil {
    // Redis not available
}
```

### Test RabbitMQ Connection

```go
// Simple connection test
conn, err := amqp.Dial(rabbitmqURL)
if err != nil {
    // RabbitMQ not available
}
defer conn.Close()
```

---

## Documentation Available

- **README.md** - Complete setup guide with all commands
- **docs/database-schema.md** - Full database schema documentation
- **docs/HANDOFF-TO-DEVOPS.md** - Infrastructure details from DB Agent
- **config/config.example.yaml** - Configuration template with descriptions
- **TASK-DEVOPS-001-COMPLETION-REPORT.md** - Complete infrastructure details

---

## Important Notes

### Port Usage

Your application will run on **port 8080** (configurable).

All infrastructure services use different ports (no conflicts):
- PostgreSQL: 5433
- Redis: 6380
- RabbitMQ: 5673 + 15673
- PgBouncer: 6433

### Environment Consistency

When running in Docker container later:
```
postgres:5432    (internal Docker network)
redis:6379       (internal Docker network)
rabbitmq:5672    (internal Docker network)
```

When running locally:
```
localhost:5433   (PostgreSQL)
localhost:6380   (Redis)
localhost:5673   (RabbitMQ)
```

.env file and code should handle both automatically via environment variables.

### Database Migrations

Database schema is **already created** from DB Agent (TASK-DB-001).

You don't need to run migrations - the schema is ready.

If you need to verify schema:
```bash
make db-shell
# Inside psql, check tables:
\dt
\dT+   # See ENUM types
```

### Graceful Shutdown

Implement graceful shutdown in main.go:
```go
sigChan := make(chan os.Signal, 1)
signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
<-sigChan

// Shutdown with timeout
ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
defer cancel()
server.Shutdown(ctx)
```

---

## Health Check Endpoints (Requirements)

### GET /health

Must return 200 OK immediately with basic status:

```json
{
  "status": "ok",
  "version": "1.0.0"
}
```

Used by: Load balancers, orchestrators for liveness detection

### GET /ready

Must return 200 OK only when all dependencies are healthy:

```json
{
  "status": "ready",
  "services": {
    "database": "ok",
    "redis": "ok"
  }
}
```

Returns 503 Service Unavailable if any dependency is down.

Used by: Orchestrators to determine if service can accept traffic

---

## Next Phase Preview

After TASK-BACKEND-001 is complete, QA Agent will:
- Create test plans and templates
- Develop integration tests
- Create verification scripts
- Generate test coverage reports

Then additional phases will add:
- Order management endpoints
- Order book management
- Trade matching engine
- WebSocket real-time updates
- Monitoring and observability

---

## Questions or Issues?

### Database Questions
See: `/docs/database-schema.md` and `/docs/HANDOFF-TO-DEVOPS.md`

### Infrastructure Questions
See: `/README.md` and `/TASK-DEVOPS-001-COMPLETION-REPORT.md`

### Make Commands Help
```bash
make help
```

### Docker Issues
```bash
# View logs
docker-compose logs -f

# Check service health
docker-compose ps

# Restart services
docker-compose down && docker-compose up -d
```

---

## Success Criteria for TASK-BACKEND-001

When you're done, ensure:

1. **Server Starts Successfully**
   ```bash
   go run cmd/server/main.go
   # Should output: "Starting Trade Engine service"
   ```

2. **Health Endpoint Works**
   ```bash
   curl http://localhost:8080/health
   # Should return: {"status":"ok","version":"1.0.0"}
   ```

3. **Ready Endpoint Works**
   ```bash
   curl http://localhost:8080/ready
   # Should return: {"status":"ready","services":{"database":"ok","redis":"ok"}}
   ```

4. **Configuration Works**
   ```bash
   TRADE_ENGINE_SERVER_HTTP_PORT=9000 go run cmd/server/main.go
   # Server should start on port 9000
   ```

5. **Logging is JSON**
   ```bash
   go run cmd/server/main.go 2>&1 | jq .
   # Logs should be valid JSON
   ```

6. **Tests Pass**
   ```bash
   go test -v -cover ./...
   # All tests should pass with > 80% coverage
   ```

---

## Ready to Start!

Everything is in place. The infrastructure is healthy, the database is ready, and the project structure is prepared.

**You can start TASK-BACKEND-001 immediately.**

Good luck! The foundation is solid and ready for your implementation.

---

**Handoff Date:** 2025-11-23
**Infrastructure Status:** ✅ VERIFIED HEALTHY
**Database Status:** ✅ SCHEMA COMPLETE
**Documentation Status:** ✅ COMPREHENSIVE
**Ready for Backend Development:** ✅ YES

**Next Agent:** Backend Agent (TASK-BACKEND-001)

---

**End of Handoff Document**
