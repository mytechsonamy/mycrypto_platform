# Wallet Service Client Library

A robust Go client library for interacting with the Wallet Service from the Trade Engine. This library provides a clean interface for balance management, fund reservation, and trade settlement operations with built-in resilience patterns.

## Features

- **Clean Interface**: Well-defined interface for all wallet operations
- **Resilience Patterns**:
  - Circuit breaker to prevent cascading failures
  - Exponential backoff retry with configurable attempts
  - Configurable timeouts
  - Connection pooling
  - Optional rate limiting
- **Mock Implementation**: In-memory mock client for testing without real Wallet Service
- **Comprehensive Error Handling**: Typed errors for common failure scenarios
- **High Test Coverage**: 88.6% code coverage with extensive unit tests

## Installation

```bash
go get github.com/google/uuid
go get github.com/shopspring/decimal
go get github.com/sony/gobreaker
go get go.uber.org/zap
go get golang.org/x/time/rate
```

## Quick Start

### Basic Usage with Mock Client (Development/Testing)

```go
package main

import (
    "github.com/google/uuid"
    "github.com/shopspring/decimal"
    "go.uber.org/zap"
    "github.com/mytrader/trade-engine/pkg/clients/wallet"
)

func main() {
    logger, _ := zap.NewProduction()

    // Create a mock wallet client for testing
    config := wallet.DefaultConfig()
    config.UseMock = true

    client, err := wallet.NewWalletClient(config, logger)
    if err != nil {
        panic(err)
    }
    defer client.Close()

    // Use the client
    userID := uuid.New()
    balance, err := client.GetBalance(userID, "BTC")
    if err != nil {
        logger.Error("Failed to get balance", zap.Error(err))
        return
    }

    logger.Info("User balance retrieved",
        zap.String("currency", balance.Currency),
        zap.String("available", balance.AvailableBalance.String()),
    )
}
```

### Production Usage with HTTP Client

```go
package main

import (
    "time"
    "github.com/google/uuid"
    "github.com/shopspring/decimal"
    "go.uber.org/zap"
    "github.com/mytrader/trade-engine/pkg/clients/wallet"
)

func main() {
    logger, _ := zap.NewProduction()

    // Create HTTP wallet client for production
    config := &wallet.ClientConfig{
        BaseURL:                    "http://wallet-service:3002",
        Timeout:                    5 * time.Second,
        MaxRetries:                 3,
        RetryWaitTime:              100 * time.Millisecond,
        RetryMaxWaitTime:           2 * time.Second,
        CircuitBreakerEnabled:      true,
        CircuitBreakerMaxRequests:  3,
        CircuitBreakerInterval:     10 * time.Second,
        CircuitBreakerTimeout:      30 * time.Second,
        CircuitBreakerFailureRatio: 0.6,
        MaxIdleConns:               100,
        MaxIdleConnsPerHost:        10,
        IdleConnTimeout:            90 * time.Second,
        RateLimitEnabled:           false,
        RateLimitRPS:               100,
        UseMock:                    false,
    }

    client, err := wallet.NewWalletClient(config, logger)
    if err != nil {
        panic(err)
    }
    defer client.Close()

    // Use the client
    userID := uuid.New()
    balance, err := client.GetBalance(userID, "BTC")
    if err != nil {
        logger.Error("Failed to get balance", zap.Error(err))
        return
    }

    logger.Info("User balance retrieved",
        zap.String("available", balance.AvailableBalance.String()),
        zap.String("reserved", balance.ReservedBalance.String()),
    )
}
```

## API Reference

### Client Interface

```go
type WalletClient interface {
    GetBalance(userID uuid.UUID, currency string) (*BalanceResponse, error)
    ReserveBalance(req *ReserveBalanceRequest) (*ReserveBalanceResponse, error)
    ReleaseBalance(req *ReleaseBalanceRequest) (*ReleaseBalanceResponse, error)
    SettleTrade(req *SettleTradeRequest) (*SettleTradeResponse, error)
    Close() error
}
```

### Operations

#### 1. Get Balance

Retrieve the current balance for a user and currency.

```go
userID := uuid.MustParse("123e4567-e89b-12d3-a456-426614174000")
balance, err := client.GetBalance(userID, "BTC")
if err != nil {
    // Handle error
    return
}

fmt.Printf("Available: %s BTC\n", balance.AvailableBalance.String())
fmt.Printf("Reserved: %s BTC\n", balance.ReservedBalance.String())
fmt.Printf("Total: %s BTC\n", balance.TotalBalance.String())
```

#### 2. Reserve Balance

Lock funds when an order is placed.

```go
req := &wallet.ReserveBalanceRequest{
    UserID:   userID,
    Currency: "USDT",
    Amount:   decimal.NewFromFloat(1000.50),
    OrderID:  orderID,
    Reason:   "ORDER_PLACEMENT",
}

resp, err := client.ReserveBalance(req)
if err != nil {
    if errors.Is(err, wallet.ErrInsufficientBalance) {
        // Handle insufficient balance
        return
    }
    // Handle other errors
    return
}

if resp.Success {
    fmt.Printf("Reserved successfully. Reservation ID: %s\n", resp.ReservationID)
}
```

#### 3. Release Balance

Unlock reserved funds when an order is cancelled or expires.

```go
req := &wallet.ReleaseBalanceRequest{
    ReservationID: reservationID, // Or use OrderID if reservation ID is not available
    OrderID:       orderID,
    Reason:        "ORDER_CANCELLED",
}

resp, err := client.ReleaseBalance(req)
if err != nil {
    // Handle error
    return
}

if resp.Success {
    fmt.Printf("Released: %s\n", resp.ReleasedAmount.String())
}
```

#### 4. Settle Trade

Execute fund transfer after a trade is completed.

```go
req := &wallet.SettleTradeRequest{
    TradeID:       tradeID,
    BuyerID:       buyerID,
    SellerID:      sellerID,
    BuyerOrderID:  buyerOrderID,
    SellerOrderID: sellerOrderID,
    BaseCurrency:  "BTC",
    QuoteCurrency: "USDT",
    BaseAmount:    decimal.NewFromFloat(0.5),
    QuoteAmount:   decimal.NewFromFloat(25000.0),
    Price:         decimal.NewFromFloat(50000.0),
    BuyerFee:      decimal.NewFromFloat(25.0),
    SellerFee:     decimal.NewFromFloat(0.0005),
}

resp, err := client.SettleTrade(req)
if err != nil {
    // Handle error
    return
}

if resp.Success {
    fmt.Printf("Trade settled. Settlement ID: %s\n", resp.SettlementID)
}
```

## Error Handling

The client provides typed errors for common failure scenarios:

```go
import "errors"

balance, err := client.GetBalance(userID, currency)
if err != nil {
    switch {
    case errors.Is(err, wallet.ErrInsufficientBalance):
        // User doesn't have enough funds
    case errors.Is(err, wallet.ErrUserNotFound):
        // User doesn't exist
    case errors.Is(err, wallet.ErrReservationNotFound):
        // Reservation doesn't exist
    case errors.Is(err, wallet.ErrWalletServiceDown):
        // Wallet service is unavailable
    case errors.Is(err, wallet.ErrCircuitOpen):
        // Circuit breaker is open
    case errors.Is(err, wallet.ErrTimeout):
        // Request timed out
    case errors.Is(err, wallet.ErrInvalidRequest):
        // Invalid request parameters
    case errors.Is(err, wallet.ErrInvalidResponse):
        // Invalid response from wallet service
    default:
        // Other error
    }
}
```

## Configuration

### Environment Variables

Configuration can be loaded from YAML file or environment variables:

```yaml
wallet_client:
  base_url: http://localhost:3002
  timeout: 5s
  max_retries: 3
  retry_wait_time: 100ms
  retry_max_wait_time: 2s
  circuit_breaker_enabled: true
  circuit_breaker_max_requests: 3
  circuit_breaker_interval: 10s
  circuit_breaker_timeout: 30s
  circuit_breaker_failure_ratio: 0.6
  max_idle_conns: 100
  max_idle_conns_per_host: 10
  idle_conn_timeout: 90s
  rate_limit_enabled: false
  rate_limit_rps: 100
  use_mock: false  # Set to true for testing
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `base_url` | string | `http://localhost:3002` | Wallet service base URL |
| `timeout` | duration | `5s` | Request timeout |
| `max_retries` | int | `3` | Maximum retry attempts |
| `retry_wait_time` | duration | `100ms` | Initial wait time between retries |
| `retry_max_wait_time` | duration | `2s` | Maximum wait time between retries |
| `circuit_breaker_enabled` | bool | `true` | Enable circuit breaker |
| `circuit_breaker_max_requests` | uint32 | `3` | Max requests in half-open state |
| `circuit_breaker_interval` | duration | `10s` | Failure count reset interval |
| `circuit_breaker_timeout` | duration | `30s` | Duration of open state |
| `circuit_breaker_failure_ratio` | float64 | `0.6` | Failure ratio to trip circuit (0.0-1.0) |
| `max_idle_conns` | int | `100` | Maximum idle connections |
| `max_idle_conns_per_host` | int | `10` | Maximum idle connections per host |
| `idle_conn_timeout` | duration | `90s` | Idle connection timeout |
| `rate_limit_enabled` | bool | `false` | Enable rate limiting |
| `rate_limit_rps` | int | `100` | Requests per second limit |
| `use_mock` | bool | `false` | Use mock client (for testing) |

## Testing

### Running Tests

```bash
# Run all tests
go test -v ./pkg/clients/wallet/...

# Run tests with coverage
go test -v -cover ./pkg/clients/wallet/...

# Generate coverage report
go test -coverprofile=coverage.out ./pkg/clients/wallet/...
go tool cover -html=coverage.out
```

### Using Mock Client in Tests

```go
func TestOrderService(t *testing.T) {
    logger := zaptest.NewLogger(t)

    // Create mock wallet client
    config := wallet.DefaultConfig()
    config.UseMock = true

    walletClient, err := wallet.NewWalletClient(config, logger)
    require.NoError(t, err)

    // If you need to set initial balances
    mockClient := walletClient.(*wallet.MockWalletClient)
    mockClient.SetBalance(userID, "BTC", decimal.NewFromFloat(10.0))

    // If you need to simulate failures
    mockClient.SetShouldFail(true, wallet.ErrInsufficientBalance)

    // Use the mock client in your tests
    orderService := NewOrderService(walletClient)
    // ... test your code
}
```

## Best Practices

1. **Always Close the Client**: Call `client.Close()` when done to release resources
   ```go
   defer client.Close()
   ```

2. **Handle All Errors**: Check for specific error types and handle appropriately
   ```go
   if errors.Is(err, wallet.ErrInsufficientBalance) {
       // Specific handling
   }
   ```

3. **Use Context for Timeouts**: While the client has built-in timeouts, you can add additional timeout control
   ```go
   ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
   defer cancel()
   // Note: Current implementation doesn't accept context, but can be extended
   ```

4. **Monitor Circuit Breaker**: Log when circuit breaker state changes (automatic in HTTP client)

5. **Use Mock Client for Testing**: Don't hit real Wallet Service in unit tests
   ```go
   config.UseMock = true
   ```

6. **Configure Retries Appropriately**: Balance between resilience and latency
   - Development: Low retries (1-2)
   - Production: Higher retries (3-5)

7. **Circuit Breaker Tuning**: Adjust based on your service's reliability requirements
   - High availability: Lower failure ratio (0.4-0.5)
   - Prevent cascading failures: Higher failure ratio (0.6-0.8)

## Architecture

```
┌─────────────────┐
│  Trade Engine   │
│   (Order API)   │
└────────┬────────┘
         │
         │ Uses
         ▼
┌─────────────────────────────────────┐
│     Wallet Client Library           │
│  ┌────────────┐   ┌──────────────┐ │
│  │   HTTP     │   │    Mock      │ │
│  │  Client    │   │   Client     │ │
│  │            │   │              │ │
│  │ • Retry    │   │ • In-Memory  │ │
│  │ • Circuit  │   │ • Testing    │ │
│  │   Breaker  │   │              │ │
│  │ • Timeout  │   │              │ │
│  └────────────┘   └──────────────┘ │
└─────────┬───────────────────────────┘
          │ HTTP/REST
          ▼
┌─────────────────────────────┐
│    Wallet Service (NestJS)  │
│   • Balance Management      │
│   • Fund Reservation        │
│   • Trade Settlement        │
└─────────────────────────────┘
```

## Performance Considerations

- **Connection Pooling**: Configured via `max_idle_conns` and `max_idle_conns_per_host`
- **Request Timeout**: Default 5 seconds, configurable
- **Retry Overhead**: Exponential backoff can add latency (configure wisely)
- **Circuit Breaker**: Prevents wasting resources on failing service
- **Rate Limiting**: Optional, can be enabled to prevent overwhelming Wallet Service

## Troubleshooting

### Circuit Breaker is Open

**Symptom**: Getting `ErrCircuitOpen` errors

**Solution**:
1. Check Wallet Service health
2. Review circuit breaker logs
3. Adjust `circuit_breaker_failure_ratio` if too sensitive
4. Increase `circuit_breaker_timeout` for recovery

### Connection Timeouts

**Symptom**: Getting `ErrTimeout` or `ErrWalletServiceDown` errors

**Solution**:
1. Check network connectivity to Wallet Service
2. Increase `timeout` configuration
3. Verify Wallet Service is running and healthy
4. Check firewall/security group rules

### Insufficient Balance Errors

**Symptom**: Getting `ErrInsufficientBalance` frequently

**Solution**:
1. Verify balance reservation/release logic
2. Check for orphaned reservations
3. Implement balance pre-checks before order placement

## License

Copyright © 2025 MyTrader Platform
