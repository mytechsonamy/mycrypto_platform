# TASK-DEVOPS-002 Handoff to Backend Agent

**From:** DevOps Engineer Agent
**To:** Backend Agent (TASK-BACKEND-002 & TASK-BACKEND-003)
**Date:** 2025-11-23
**Status:** Ready for Backend Implementation

---

## CI/CD Pipeline - Ready to Use

### GitHub Actions Workflow
**Location:** `.github/workflows/trade-engine-ci.yml`

**What it does:**
- Triggers on every PR and push to main/develop
- Runs tests, linting, and security checks
- Builds Docker image
- Uploads coverage reports to Codecov

**For You:**
- Write tests → Workflow validates automatically
- Push to GitHub → Coverage report generated
- Merge to main → Docker image pushed to registry

**No action needed** - Just commit your code and let the workflow run.

### Running Tests Locally

```bash
cd services/trade-engine

# Run all tests
make test

# Run specific test
go test -v ./internal/domain/...

# Check coverage
make test-coverage

# Run linter
make lint

# Run security check
make security
```

**CI will fail if:**
- Coverage drops below 80%
- Linter finds issues
- Any test fails
- Security scanner finds vulnerabilities

---

## Metrics Infrastructure - Ready for Integration

### Key Metrics Available

**HTTP Requests** (automatically tracked):
```go
// These are recorded automatically for every request
- http_requests_total{method, path, status}
- http_request_duration_seconds{method, path}
- http_response_size_bytes{method, path, status}
```

**Business Metrics** (use in your service):
```go
import "github.com/yourusername/mycrypto-platform/services/trade-engine/pkg/metrics"

// When creating an order
metrics.RecordOrderCreated("BUY", "LIMIT")

// When cancelling an order
metrics.RecordOrderCancelled("USER_REQUESTED")

// When executing a trade
metrics.RecordTradeExecuted("BTC/USDT", 1.5)

// Update active orders gauge
metrics.ActiveOrders.WithLabelValues("BUY", "BTC/USDT").Set(float64(activeCount))
```

**Database Queries** (in repository layer):
```go
import "github.com/yourusername/mycrypto-platform/services/trade-engine/pkg/metrics"

start := time.Now()
result := db.WithContext(ctx).Create(order)
duration := time.Since(start).Seconds()

metrics.RecordDatabaseQuery("insert", "orders", duration, result.Error)
```

**Cache Operations** (if using cache):
```go
// Record cache hit
metrics.RecordCacheOperation("orderbook", true)

// Record cache miss
metrics.RecordCacheOperation("orderbook", false)

// Update cache size
metrics.CacheSize.WithLabelValues("orderbook").Set(float64(sizeInBytes))
```

### Accessing Metrics

**View all metrics:**
```bash
curl http://localhost:8085/metrics
```

**Via Prometheus:**
```bash
make metrics
# Opens http://localhost:9095
# Query examples in /docs/monitoring.md
```

**Via Grafana:**
```bash
make dashboard
# Opens http://localhost:3005 (admin/admin)
# 3 dashboards ready to use
```

---

## Monitoring Stack - Already Running

### Start Everything
```bash
# All services including monitoring
make docker-up

# Just monitoring (if containers already running)
make monitoring-up
```

### Check Status
```bash
# Health checks
curl http://localhost:8085/health     # Trade Engine
curl http://localhost:9095/-/healthy  # Prometheus
curl http://localhost:3005/api/health # Grafana

# Or use Makefile
make metrics-test
make prometheus-targets
make grafana-health
```

### Expected URLs
- **Trade Engine:** http://localhost:8085
- **Metrics Endpoint:** http://localhost:8085/metrics
- **Prometheus:** http://localhost:9095
- **Grafana:** http://localhost:3005

### Default Credentials
- **Grafana:** admin / admin
- **Prometheus:** No auth (development)

---

## Implementing TASK-BACKEND-002: Order API

### Domain Layer Integration

**When creating Order model:**
```go
// Order.go
package domain

// Add metrics tracking to your domain methods
func (o *Order) Validate() error {
    if o.Quantity.LessThanOrEqual(decimal.Zero) {
        return ErrInvalidQuantity
    }
    // ... rest of validation
    return nil
}
```

**In tests:**
```go
// Domain tests already have metrics available
// No special setup needed - metrics are global singletons
```

### Service Layer Integration

**When implementing OrderService:**
```go
// order_service.go
package service

import "github.com/yourusername/mycrypto-platform/services/trade-engine/pkg/metrics"

type OrderService struct {
    repo repository.OrderRepository
    logger *zap.Logger
}

func (s *OrderService) PlaceOrder(ctx context.Context, order *domain.Order) (*domain.Order, error) {
    // Validate
    if err := order.Validate(); err != nil {
        return nil, err
    }

    // Create
    start := time.Now()
    created, err := s.repo.Create(ctx, order)

    // Record metrics
    if err == nil {
        metrics.RecordOrderCreated(string(order.Side), string(order.Type))
    }

    // Record query time
    metrics.RecordDatabaseQuery("insert", "orders", time.Since(start).Seconds(), err)

    return created, err
}
```

### API Handler Integration

**When implementing OrderHandler:**
```go
// handler.go
package httpapi

func (h *OrderHandler) PlaceOrder(w http.ResponseWriter, r *http.Request) {
    // ... validation and service call ...

    // Metrics are already recorded by middleware:
    // - http_requests_total
    // - http_request_duration_seconds
    // - http_response_size_bytes

    // Just focus on business logic
    h.respondJSON(w, http.StatusCreated, h.toOrderResponse(createdOrder))
}
```

---

## Testing with Metrics

### Unit Tests
```go
// No special setup needed for metrics
// They're global and auto-initialized

func TestOrderService_PlaceOrder(t *testing.T) {
    // Your test code
    svc := NewOrderService(mockRepo)
    order, err := svc.PlaceOrder(ctx, newOrder)

    // Metrics are automatically recorded
    // Verify in Prometheus after test run
}
```

### Integration Tests
```go
// Tests with real services
// Metrics available in Prometheus

func TestOrderAPI_PlaceOrder_Integration(t *testing.T) {
    // Start server
    server := setupTestServer(t)

    // Make request
    req := httptest.NewRequest("POST", "/api/v1/orders", body)
    resp := httptest.NewRecorder()
    server.Handler.ServeHTTP(resp, req)

    // Verify response
    assert.Equal(t, http.StatusCreated, resp.Code)

    // Metrics auto-recorded via middleware
}
```

### Load Tests
After implementation, test with:
```bash
# Make multiple requests
for i in {1..100}; do
  curl -X POST http://localhost:8085/api/v1/orders \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer token" \
    -d '{"symbol":"BTC/USDT","side":"BUY",...}'
done

# Then check metrics
make metrics
# View request rate, latency, error rate
```

---

## Monitoring Your Implementation

### Health Check Your Endpoint
```bash
# After implementing POST /api/v1/orders
curl -X POST http://localhost:8085/api/v1/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $(your-jwt-token)" \
  -d '{
    "symbol": "BTC/USDT",
    "side": "BUY",
    "type": "LIMIT",
    "quantity": "1.5",
    "price": "50000.00",
    "time_in_force": "GTC"
  }'
```

### View Metrics in Real-Time
```bash
# Terminal 1: Start server
make docker-up

# Terminal 2: Watch metrics update
watch -n 1 'curl -s http://localhost:8085/metrics | grep trade_engine_orders_created_total'

# Terminal 3: Send requests
curl -X POST http://localhost:8085/api/v1/orders ...
```

### Grafana Dashboards Track Your Progress
- **System Health:** Overall API metrics
- **API Performance:** Your endpoint's latency and errors
- **Database Performance:** Query times for order operations

---

## Wallet Service Integration (TASK-BACKEND-003)

The wallet client stub is ready for implementation. When implementing, use the same metrics patterns:

```go
// In wallet client calls
start := time.Now()
resp, err := c.ReserveBalance(ctx, req)
duration := time.Since(start).Seconds()

metrics.RecordDatabaseQuery("reserve_balance", "wallet", duration, err)
```

---

## Dependencies Ready

### Go Dependencies
```
go.mod has been updated with:
- github.com/prometheus/client_golang - Metrics library
- github.com/go-chi/chi/v5 - HTTP router
- github.com/go-redis/redis/v8 - Redis client
- go.uber.org/zap - Structured logging
- gorm.io/gorm - ORM (already included)
```

Install locally:
```bash
cd services/trade-engine
go mod download
```

### Docker Dependencies
All services already configured:
- PostgreSQL (port 5436)
- Redis (port 6382)
- Kafka (port 29094)
- Prometheus (port 9095)
- Grafana (port 3005)

---

## Known Issues & Workarounds

### Issue: Metrics not appearing in Prometheus
**Cause:** Service not running
**Solution:** `make docker-up` and wait 5 seconds

### Issue: Grafana dashboards empty
**Cause:** No data points collected yet
**Solution:** Generate traffic: `curl http://localhost:8085/health` several times

### Issue: Test coverage drops below 80%
**Cause:** New code without tests
**Solution:** Add unit tests for domain logic, repository tests with mocks

### Issue: Linter failures
**Common:** Unused imports, unused variables
**Solution:** `make fmt` and `make vet` before committing

---

## Quick Start for Backend Agent

```bash
# 1. Navigate to project
cd /Users/musti/Documents/Projects/MyCrypto_Platform/services/trade-engine

# 2. Start infrastructure
make docker-up
sleep 10  # Wait for services to be ready

# 3. Verify setup
make metrics-test           # Check metrics endpoint
make prometheus-targets     # Check scrape targets
make grafana-health         # Check Grafana

# 4. Open dashboards
make dashboard             # Open Grafana (admin/admin)
make metrics               # Open Prometheus

# 5. Begin implementation
# Edit internal/domain/order.go
# Edit internal/service/order_service.go
# Edit internal/server/handler.go
# Use metrics package for tracking

# 6. Test changes
make test                  # Run tests with coverage
make lint                  # Check code style

# 7. Commit when ready
git add .
git commit -m "Implement Order Management API"
git push
```

---

## Support & Questions

**CI/CD Pipeline Issues:**
- Check: `.github/workflows/trade-engine-ci.yml`
- Debug: `act -j test` (GitHub Actions locally)
- Docs: `docs/monitoring.md` section 1-3

**Metrics & Monitoring Issues:**
- Check: `pkg/metrics/metrics.go`
- Usage: `docs/monitoring.md` section 11
- Health: `make prometheus-targets`, `make grafana-health`

**Code Issues:**
- Linter: `make lint`
- Format: `make fmt`
- Tests: `make test`

---

## Acceptance Criteria for Your Tasks

### TASK-BACKEND-002: Order API
- [ ] POST /api/v1/orders endpoint implemented
- [ ] Order domain model with validation
- [ ] Repository layer with database integration
- [ ] Service layer with business logic
- [ ] Request/response DTOs
- [ ] Error handling (validation, auth, server errors)
- [ ] Unit tests for domain (>80% coverage)
- [ ] Integration tests with database
- [ ] Metrics tracking: orders_created_total
- [ ] Linter passing
- [ ] Code review by Tech Lead

### TASK-BACKEND-003: Wallet Client
- [ ] Wallet client interface defined
- [ ] HTTP client implementation
- [ ] Mock client for testing
- [ ] Circuit breaker pattern
- [ ] Timeout configuration (5s)
- [ ] Retry logic
- [ ] Error types defined
- [ ] Unit tests (>80% coverage)
- [ ] Integration tests with mocks
- [ ] Metrics integration optional (add if time permits)

---

## Resources

**In the Repository:**
- `docs/monitoring.md` - Complete monitoring guide
- `TASK-DEVOPS-002-COMPLETION-REPORT.md` - What was delivered
- `monitoring/alerts.yml` - Alert rules (20+ examples)
- `pkg/metrics/metrics.go` - Metrics definitions

**External:**
- [Prometheus Go Client](https://github.com/prometheus/client_golang)
- [PromQL Query Language](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Grafana Dashboard Guide](https://grafana.com/docs/grafana/latest/dashboards/)

---

## Next Steps After TASK-BACKEND-002

Once Order API is complete and merged to main:
1. GitHub Actions workflow automatically runs tests
2. Coverage report generated and uploaded
3. Docker image built and pushed
4. Metrics available in Grafana dashboards
5. Tech Lead reviews code and metrics
6. QA Agent (TASK-QA-002) can begin comprehensive testing

---

**Ready to build! Good luck with TASK-BACKEND-002!**

The infrastructure is set up and waiting for your business logic. Every test you write, every order you create, and every trade you execute will be automatically tracked and visible in the monitoring dashboards.

🚀 Happy coding!
