# Settlement Service Integration Guide

## For TASK-BACKEND-007: HTTP API Integration

This guide shows how to integrate the Settlement Service into the Trade Engine's main.go.

## Step 1: Initialize Settlement Service

In `/services/trade-engine/cmd/server/main.go`, add the settlement service initialization:

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

    "github.com/mytrader/trade-engine/internal/matching"
    "github.com/mytrader/trade-engine/internal/repository"
    "github.com/mytrader/trade-engine/internal/server"
    "github.com/mytrader/trade-engine/internal/service"
    "github.com/mytrader/trade-engine/pkg/clients"
    "github.com/mytrader/trade-engine/pkg/clients/wallet"
    "github.com/mytrader/trade-engine/pkg/config"
    "github.com/mytrader/trade-engine/pkg/logger"
    "go.uber.org/zap"
)

func main() {
    // Load configuration
    cfg, err := config.Load("config.yaml")
    if err != nil {
        fmt.Fprintf(os.Stderr, "Failed to load config: %v\n", err)
        os.Exit(1)
    }

    // Initialize logger
    log, err := logger.NewLogger(cfg.Logging.Level, cfg.Logging.Format)
    if err != nil {
        fmt.Fprintf(os.Stderr, "Failed to initialize logger: %v\n", err)
        os.Exit(1)
    }
    defer log.Sync()

    log = logger.WithService(log, "trade-engine")

    log.Info("Starting Trade Engine service",
        zap.String("version", cfg.ServiceVersion),
        zap.String("environment", cfg.Environment),
        zap.Int("http_port", cfg.Server.HTTPPort),
    )

    // Connect to PostgreSQL database
    db, err := clients.NewDatabaseClient(cfg, log)
    if err != nil {
        log.Fatal("Failed to connect to database", zap.Error(err))
    }
    defer func() {
        if err := clients.CloseDatabaseClient(db, log); err != nil {
            log.Error("Failed to close database connection", zap.Error(err))
        }
    }()

    // Connect to Redis
    redisClient, err := clients.NewRedisClient(cfg, log)
    if err != nil {
        log.Fatal("Failed to connect to Redis", zap.Error(err))
    }
    defer func() {
        if err := clients.CloseRedisClient(redisClient, log); err != nil {
            log.Error("Failed to close Redis connection", zap.Error(err))
        }
    }()

    // Initialize Wallet Client
    walletConfig := &wallet.ClientConfig{
        BaseURL:               cfg.WalletService.BaseURL,
        Timeout:               cfg.WalletService.Timeout,
        MaxRetries:            cfg.WalletService.MaxRetries,
        CircuitBreakerEnabled: cfg.WalletService.CircuitBreakerEnabled,
        UseMock:               cfg.Environment == "development", // Use mock in dev
    }
    walletClient, err := wallet.NewWalletClient(walletConfig, log)
    if err != nil {
        log.Fatal("Failed to initialize wallet client", zap.Error(err))
    }
    defer walletClient.Close()

    // Initialize Repositories
    orderRepo := repository.NewPostgresOrderRepository(db, log)
    tradeRepo := repository.NewPostgresTradeRepository(db, log)

    // Initialize Matching Engine
    matchingEngine := matching.NewMatchingEngine()

    // Initialize Settlement Service
    settlementService := service.NewSettlementService(walletClient, tradeRepo, log)
    settlementService.Start() // Start worker pool

    log.Info("Settlement service started",
        zap.Int("worker_count", 10),
        zap.Int("queue_size", 1000),
    )

    // Set up trade callback on matching engine
    matchingEngine.SetTradeCallback(func(trade *domain.Trade) {
        // 1. Persist trade to database (synchronous)
        ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
        defer cancel()

        err := tradeRepo.Create(ctx, trade)
        if err != nil {
            log.Error("Failed to persist trade",
                zap.String("trade_id", trade.ID.String()),
                zap.Error(err),
            )
            return
        }

        log.Info("Trade persisted to database",
            zap.String("trade_id", trade.ID.String()),
            zap.String("symbol", trade.Symbol),
            zap.String("quantity", trade.Quantity.String()),
            zap.String("price", trade.Price.String()),
        )

        // 2. Submit for settlement (asynchronous via worker pool)
        settlementService.Submit(trade)

        log.Debug("Trade submitted for settlement",
            zap.String("trade_id", trade.ID.String()),
        )
    })

    // Initialize Order Service
    orderService := service.NewOrderService(
        orderRepo,
        tradeRepo,
        matchingEngine,
        walletClient,
        log,
    )

    // Create HTTP router
    router := server.NewRouter(log, db, redisClient, cfg)

    // Create HTTP server
    httpServer := &http.Server{
        Addr:         fmt.Sprintf(":%d", cfg.Server.HTTPPort),
        Handler:      router,
        ReadTimeout:  cfg.Server.ReadTimeout,
        WriteTimeout: cfg.Server.WriteTimeout,
    }

    // Start HTTP server in goroutine
    go func() {
        log.Info("HTTP server starting", zap.String("addr", httpServer.Addr))
        if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
            log.Fatal("HTTP server failed", zap.Error(err))
        }
    }()

    // Wait for interrupt signal for graceful shutdown
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
    sig := <-quit

    log.Info("Received shutdown signal", zap.String("signal", sig.String()))

    // Create shutdown context with timeout
    shutdownCtx, cancel := context.WithTimeout(context.Background(), cfg.Server.ShutdownTimeout)
    defer cancel()

    // Gracefully shutdown settlement service worker pool
    log.Info("Shutting down settlement service...")
    if err := settlementService.Stop(shutdownCtx); err != nil {
        log.Error("Settlement service shutdown error", zap.Error(err))
    } else {
        log.Info("Settlement service stopped gracefully")
    }

    // Gracefully shutdown HTTP server
    log.Info("Shutting down HTTP server...")
    if err := httpServer.Shutdown(shutdownCtx); err != nil {
        log.Error("HTTP server forced to shutdown", zap.Error(err))
    }

    log.Info("Trade Engine service stopped gracefully")
}
```

## Step 2: Configuration

Add wallet service configuration to `config.yaml`:

```yaml
wallet_service:
  base_url: "http://localhost:3001"
  timeout: 5s
  max_retries: 3
  circuit_breaker_enabled: true
```

## Step 3: Domain Import

Ensure the trade callback has access to the domain package:

```go
import (
    "github.com/mytrader/trade-engine/internal/domain"
    // ... other imports
)
```

## Step 4: Monitoring Settlement

Add an endpoint to check settlement status (optional):

```go
// In server/handler.go or a new settlement_handler.go

func (h *Handler) GetSettlementMetrics(c *gin.Context) {
    total, failed := h.settlementService.GetMetrics()
    dlqSize := h.settlementService.GetDLQSize()

    c.JSON(http.StatusOK, gin.H{
        "total_settlements": total,
        "failed_settlements": failed,
        "success_rate": float64(total-failed) / float64(total) * 100,
        "dlq_size": dlqSize,
    })
}

func (h *Handler) GetDLQItems(c *gin.Context) {
    items := h.settlementService.GetDLQItems()
    c.JSON(http.StatusOK, gin.H{
        "dlq_items": items,
    })
}
```

## Step 5: Health Check

Add settlement service health to the health check endpoint:

```go
func (h *Handler) HealthCheck(c *gin.Context) {
    // ... existing checks

    // Settlement service health
    _, processed, failed := h.workerPool.GetMetrics()
    settlementHealth := "healthy"
    if failed > processed/2 { // More than 50% failure rate
        settlementHealth = "degraded"
    }

    c.JSON(http.StatusOK, gin.H{
        "status": "healthy",
        "database": dbHealth,
        "redis": redisHealth,
        "settlement": settlementHealth,
        "timestamp": time.Now(),
    })
}
```

## Testing the Integration

### 1. Place an Order

```bash
curl -X POST http://localhost:8080/api/v1/orders \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "symbol": "BTC/USDT",
    "side": "BUY",
    "type": "LIMIT",
    "quantity": "0.1",
    "price": "50000",
    "time_in_force": "GTC"
  }'
```

### 2. Check Logs

Look for settlement logs:
```
INFO  Starting trade settlement  {"trade_id": "...", "symbol": "BTC/USDT"}
INFO  Wallet settlement successful  {"settlement_id": "..."}
INFO  Trade settlement completed  {"settlement_id": "..."}
```

### 3. Check Metrics

```bash
curl http://localhost:8080/api/v1/settlement/metrics
```

Expected response:
```json
{
  "total_settlements": 10,
  "failed_settlements": 0,
  "success_rate": 100.0,
  "dlq_size": 0
}
```

### 4. Check DLQ (if failures occur)

```bash
curl http://localhost:8080/api/v1/settlement/dlq
```

## Troubleshooting

### Settlement Not Starting
**Symptom:** Trades persist but don't settle
**Solution:** Check that `settlementService.Start()` is called

### Worker Pool Deadlock
**Symptom:** Settlements hang
**Solution:** Ensure graceful shutdown is implemented correctly

### High Failure Rate
**Symptom:** Many trades in DLQ
**Solution:** Check wallet service connectivity and balance availability

### Memory Leak
**Symptom:** Increasing memory usage
**Solution:** Ensure DLQ is periodically cleared (add cleanup job)

## Production Considerations

1. **Distributed Deployment:** Current implementation is single-instance only. For multi-instance, implement distributed locking.

2. **DLQ Processing:** Add a background job to retry DLQ items periodically.

3. **Metrics Export:** Integrate with Prometheus for production monitoring.

4. **Alerting:** Set up alerts for:
   - High DLQ size
   - High failure rate
   - Worker pool queue full

5. **Database Connection Pool:** Ensure DB connection pool can handle concurrent settlements.

## Configuration Tuning

Adjust these based on load:

```go
// In settlement_service.go, modify DefaultWorkerPoolConfig()
config := WorkerPoolConfig{
    WorkerCount:       20,  // Increase for higher throughput
    QueueSize:         2000, // Increase for burst handling
    ShutdownTimeout:   60 * time.Second, // Allow more time for shutdown
    ProcessingTimeout: 15 * time.Second, // Allow more time per trade
}
```

## Summary

The settlement service is fully implemented and tested. Integration requires:
1. Initialize SettlementService with WalletClient and TradeRepository
2. Start the worker pool on app startup
3. Set trade callback on matching engine
4. Stop worker pool gracefully on shutdown

No changes needed to the settlement service code itself.
