# Task Assignment: TASK-BACKEND-008
## Trade Settlement Integration

**Agent:** Backend Developer
**Priority:** P0 (Critical - Core settlement flow)
**Story:** TE-304 (Settlement Layer)
**Sprint:** Trade Engine Sprint 1 - Day 5
**Estimated Hours:** 4 hours
**Story Points:** 1.5
**Deadline:** November 23, 2025 - 7:00 PM
**Status:** 🎯 ASSIGNED

---

## User Story Reference

**Epic:** Trade Engine (Epic 3)
**Story TE-304:** Settlement Layer
> As the trade engine,
> I want to automatically settle trades by updating user wallets,
> So that buyers receive purchased assets and sellers receive payment.

---

## Description

Implement the settlement layer that connects the matching engine to the Wallet Service, ensuring that trade executions result in correct balance updates for buyers and sellers. This includes fund transfers, fee collection, error handling, and rollback capabilities for failed settlements.

**Core Work:**
1. Create SettlementService with Wallet Client integration
2. Implement settlement flow (buyer debit/credit, seller debit/credit)
3. Build rollback mechanism for partial failures
4. Add retry logic for transient errors
5. Wire settlement callbacks to matching engine

---

## Acceptance Criteria

**Settlement Service (6/6):**
- [ ] SettlementService struct created with Wallet Client dependency
  - Clean dependency injection pattern
  - Thread-safe implementation
  - Configurable via config.yaml

- [ ] SettleTrade(trade) method with full error handling
  - Parse symbol to extract base and quote currencies
  - Calculate exact amounts for all 4 operations
  - Execute wallet operations in correct order
  - Return detailed error if any operation fails

- [ ] Transaction rollback support for failed settlements
  - Track all completed operations
  - Reverse operations in LIFO order if failure occurs
  - Log all rollback attempts and results
  - Return rollback status to caller

- [ ] Retry logic for transient failures (3 attempts with backoff)
  - Exponential backoff: 1s, 2s, 4s
  - Only retry on transient errors (network timeout, 5xx)
  - Don't retry on permanent errors (insufficient balance, 4xx)
  - Log all retry attempts

- [ ] Settlement status tracking (PENDING, SETTLED, FAILED)
  - Update trade.settlement_status field
  - Record settlement_timestamp on success
  - Track retry_count for failed settlements
  - Store failure_reason for debugging

- [ ] Async settlement via goroutine pool (don't block matching)
  - Worker pool with configurable size (default: 10)
  - Buffered job queue (capacity: 1000)
  - Graceful shutdown support
  - Monitor queue depth and worker utilization

**Wallet Integration (5/5):**
- [ ] Buyer debit: quote_currency (price × quantity + buyer_fee)
  - Call walletClient.DebitBalance()
  - Include trade_id in metadata
  - Verify sufficient balance before debiting
  - Handle INSUFFICIENT_BALANCE error

- [ ] Buyer credit: base_currency (quantity)
  - Call walletClient.CreditBalance()
  - Credit exact trade quantity
  - Update buyer's base currency balance
  - Handle credit failures (log + rollback debit)

- [ ] Seller debit: base_currency (quantity)
  - Call walletClient.DebitBalance()
  - Debit exact trade quantity
  - Handle INSUFFICIENT_BALANCE error (should never happen)
  - Log if seller balance mismatch detected

- [ ] Seller credit: quote_currency (price × quantity - seller_fee)
  - Call walletClient.CreditBalance()
  - Deduct seller fee from credit amount
  - Update seller's quote currency balance
  - Handle credit failures (log + rollback)

- [ ] Fee collection: Transfer fees to exchange wallet
  - Sum buyer_fee + seller_fee
  - Credit EXCHANGE_FEE_WALLET_USER_ID
  - Currency: quote_currency
  - Log total fees collected

**Error Handling (4/4):**
- [ ] Insufficient balance detection (reject before matching)
  - Check balance via walletClient.GetBalance() before placing order
  - Prevent order placement if insufficient funds
  - Return clear error message to user
  - Log insufficient balance attempts for monitoring

- [ ] Partial settlement rollback (undo completed operations)
  - If buyer debit succeeds but buyer credit fails: rollback buyer debit
  - If seller operations fail: rollback buyer operations
  - If fee collection fails: log warning but don't rollback trade
  - Return detailed error with rollback status

- [ ] Settlement failure logging (include trade ID, reason)
  - Log level: ERROR
  - Include: trade_id, buyer_id, seller_id, symbol, error message
  - Structured logging (JSON format)
  - Alert on failure rate > 5%

- [ ] Dead letter queue for failed settlements (manual review)
  - After 3 retry attempts, move to DLQ
  - Store: trade_id, attempts, last_error, timestamp
  - Admin API to view and retry DLQ items
  - Monitor DLQ depth (alert if > 10 items)

**Database Integration (3/3):**
- [ ] Trade status field updated (SETTLED / SETTLEMENT_FAILED)
  - Enum values: PENDING, SETTLED, SETTLEMENT_FAILED
  - Default: PENDING (set when trade created)
  - Updated to SETTLED on successful settlement
  - Updated to SETTLEMENT_FAILED after max retries

- [ ] Settlement timestamp recorded
  - Field: settled_at (nullable timestamp)
  - Set to current time on successful settlement
  - NULL for failed settlements
  - Used for settlement latency metrics

- [ ] Retry counter tracked for failed settlements
  - Field: settlement_retry_count (integer, default 0)
  - Incremented on each retry attempt
  - Max value: 3 (then move to DLQ)
  - Used to determine retry eligibility

**Testing (4/4):**
- [ ] Unit tests with mock Wallet Client
  - Test all success scenarios
  - Test all failure scenarios
  - Test rollback logic
  - Coverage > 85%

- [ ] Success scenario test
  - Happy path: All 4 operations succeed
  - Verify all wallet calls made with correct amounts
  - Verify trade status updated to SETTLED
  - Verify settlement_timestamp set

- [ ] Failure scenarios (insufficient balance, network error, partial failure)
  - Buyer debit fails: No further operations
  - Buyer credit fails: Rollback buyer debit
  - Seller debit fails: Rollback buyer operations
  - Seller credit fails: Rollback all operations
  - Network timeout: Retry with backoff

- [ ] Concurrent settlement test (10 trades simultaneously)
  - 10 goroutines settle 10 different trades
  - Verify no race conditions (go test -race)
  - Verify all settlements complete successfully
  - Check worker pool handles load correctly

---

## Dependencies

**Completed (Ready to Use):**
- ✅ TASK-BACKEND-003 (Wallet Client) - Day 2 COMPLETE
  - Location: /services/trade-engine/pkg/clients/wallet/
  - API: DebitBalance(), CreditBalance(), GetBalance()
  - Mock client available for testing

- ✅ TASK-BACKEND-006 (Matching Engine) - Day 4 COMPLETE
  - Location: /services/trade-engine/internal/matching/engine.go
  - API: SetTradeCallback()
  - Trade struct with all settlement fields

- ✅ TASK-DB-004 (Trade Schema) - Day 4 COMPLETE
  - Location: /services/trade-engine/migrations/004_trades_schema.sql
  - Fields: settlement_status, settled_at, settlement_retry_count

**Parallel Tasks:**
- 🔄 TASK-BACKEND-007 (HTTP API) - Day 5 PARALLEL
  - Can develop in parallel
  - Settlement callback wired after both tasks complete

**Blocking Tasks:**
- ⏳ TASK-QA-005 (E2E Tests) - Day 5 DEPENDS ON THIS
  - E2E tests verify settlement flow
  - Balance conservation checks require settlement

---

## Files to Create/Modify

### New Files (4 files)

```
/services/trade-engine/internal/service/settlement_service.go
/services/trade-engine/internal/service/settlement_service_test.go
/services/trade-engine/internal/service/settlement_worker_pool.go
/services/trade-engine/internal/service/settlement_worker_pool_test.go
```

### Modified Files (3 files)

```
/services/trade-engine/cmd/server/main.go
  - Initialize SettlementService
  - Configure matching engine trade callback
  - Start settlement worker pool

/services/trade-engine/internal/domain/trade.go
  - Add settlement_status field
  - Add settled_at timestamp field
  - Add settlement_retry_count field

/services/trade-engine/internal/config/config.go
  - Add settlement configuration section
  - Worker pool size, retry attempts, timeouts
```

---

## Implementation Steps

### Phase 1: Settlement Service Core (1.5 hours)

**Step 1.1: Create SettlementService Struct (0.5 hours)**

Create `/services/trade-engine/internal/service/settlement_service.go`:

```go
package service

import (
    "context"
    "errors"
    "fmt"
    "strings"
    "time"

    "github.com/google/uuid"
    "github.com/shopspring/decimal"
    "go.uber.org/zap"

    "trade-engine/internal/domain"
    "trade-engine/internal/repository"
    "trade-engine/pkg/clients/wallet"
)

// SettlementService handles trade settlement with wallet updates
type SettlementService struct {
    walletClient wallet.WalletClient
    tradeRepo    repository.TradeRepository
    logger       *zap.Logger
    config       *SettlementConfig
}

type SettlementConfig struct {
    WorkerPoolSize   int
    RetryMaxAttempts int
    RetryBackoffMs   int
    RetryMaxBackoffMs int
    TimeoutMs        int
}

func NewSettlementService(
    walletClient wallet.WalletClient,
    tradeRepo repository.TradeRepository,
    logger *zap.Logger,
    config *SettlementConfig,
) *SettlementService {
    return &SettlementService{
        walletClient: walletClient,
        tradeRepo:    tradeRepo,
        logger:       logger,
        config:       config,
    }
}

// Exchange fee wallet constant
const EXCHANGE_FEE_WALLET_USER_ID = "00000000-0000-0000-0000-000000000001"
```

**Step 1.2: Implement SettleTrade Method (0.5 hours)**

```go
// SettleTrade executes wallet operations to settle a trade
func (s *SettlementService) SettleTrade(trade *domain.Trade) error {
    ctx, cancel := context.WithTimeout(
        context.Background(),
        time.Duration(s.config.TimeoutMs)*time.Millisecond,
    )
    defer cancel()

    s.logger.Info("settling trade",
        zap.String("trade_id", trade.ID.String()),
        zap.String("symbol", trade.Symbol),
        zap.String("buyer", trade.BuyerUserID.String()),
        zap.String("seller", trade.SellerUserID.String()),
    )

    // 1. Parse symbol to get currencies
    baseCurrency, quoteCurrency, err := s.parseSymbol(trade.Symbol)
    if err != nil {
        return fmt.Errorf("invalid symbol: %w", err)
    }

    // 2. Calculate amounts
    tradeValue := trade.Price.Mul(trade.Quantity)
    buyerDebitAmount := tradeValue.Add(trade.BuyerFee)
    buyerCreditAmount := trade.Quantity
    sellerDebitAmount := trade.Quantity
    sellerCreditAmount := tradeValue.Sub(trade.SellerFee)
    totalFees := trade.BuyerFee.Add(trade.SellerFee)

    // 3. Execute settlement operations
    completedOps := []WalletOperation{}

    // Operation 1: Debit buyer (quote currency)
    err = s.walletClient.DebitBalance(ctx, wallet.DebitRequest{
        UserID:   trade.BuyerUserID,
        Currency: quoteCurrency,
        Amount:   buyerDebitAmount,
        Reason:   "TRADE_SETTLEMENT",
        TradeID:  trade.ID.String(),
    })
    if err != nil {
        s.logger.Error("buyer debit failed", zap.Error(err))
        return s.handleSettlementFailure(trade, completedOps, err)
    }
    completedOps = append(completedOps, WalletOperation{
        Type:     "debit",
        UserID:   trade.BuyerUserID,
        Currency: quoteCurrency,
        Amount:   buyerDebitAmount,
    })

    // Operation 2: Credit buyer (base currency)
    err = s.walletClient.CreditBalance(ctx, wallet.CreditRequest{
        UserID:   trade.BuyerUserID,
        Currency: baseCurrency,
        Amount:   buyerCreditAmount,
        Reason:   "TRADE_SETTLEMENT",
        TradeID:  trade.ID.String(),
    })
    if err != nil {
        s.logger.Error("buyer credit failed", zap.Error(err))
        return s.handleSettlementFailure(trade, completedOps, err)
    }
    completedOps = append(completedOps, WalletOperation{
        Type:     "credit",
        UserID:   trade.BuyerUserID,
        Currency: baseCurrency,
        Amount:   buyerCreditAmount,
    })

    // Operation 3: Debit seller (base currency)
    err = s.walletClient.DebitBalance(ctx, wallet.DebitRequest{
        UserID:   trade.SellerUserID,
        Currency: baseCurrency,
        Amount:   sellerDebitAmount,
        Reason:   "TRADE_SETTLEMENT",
        TradeID:  trade.ID.String(),
    })
    if err != nil {
        s.logger.Error("seller debit failed", zap.Error(err))
        return s.handleSettlementFailure(trade, completedOps, err)
    }
    completedOps = append(completedOps, WalletOperation{
        Type:     "debit",
        UserID:   trade.SellerUserID,
        Currency: baseCurrency,
        Amount:   sellerDebitAmount,
    })

    // Operation 4: Credit seller (quote currency)
    err = s.walletClient.CreditBalance(ctx, wallet.CreditRequest{
        UserID:   trade.SellerUserID,
        Currency: quoteCurrency,
        Amount:   sellerCreditAmount,
        Reason:   "TRADE_SETTLEMENT",
        TradeID:  trade.ID.String(),
    })
    if err != nil {
        s.logger.Error("seller credit failed", zap.Error(err))
        return s.handleSettlementFailure(trade, completedOps, err)
    }
    completedOps = append(completedOps, WalletOperation{
        Type:     "credit",
        UserID:   trade.SellerUserID,
        Currency: quoteCurrency,
        Amount:   sellerCreditAmount,
    })

    // Operation 5: Collect fees (exchange wallet)
    err = s.walletClient.CreditBalance(ctx, wallet.CreditRequest{
        UserID:   uuid.MustParse(EXCHANGE_FEE_WALLET_USER_ID),
        Currency: quoteCurrency,
        Amount:   totalFees,
        Reason:   "FEE_COLLECTION",
        TradeID:  trade.ID.String(),
    })
    if err != nil {
        // Don't rollback trade if fee collection fails, just log
        s.logger.Error("fee collection failed",
            zap.Error(err),
            zap.String("trade_id", trade.ID.String()),
            zap.String("amount", totalFees.String()),
        )
    }

    // 4. Update trade status to SETTLED
    trade.SettlementStatus = domain.SettlementStatusSettled
    trade.SettledAt = timePtr(time.Now())

    err = s.tradeRepo.Update(ctx, trade)
    if err != nil {
        s.logger.Error("trade update failed",
            zap.Error(err),
            zap.String("trade_id", trade.ID.String()),
        )
        // Don't fail settlement if DB update fails, settlement already completed
    }

    s.logger.Info("trade settled successfully",
        zap.String("trade_id", trade.ID.String()),
        zap.String("buyer_debit", buyerDebitAmount.String()),
        zap.String("seller_credit", sellerCreditAmount.String()),
    )

    return nil
}

func (s *SettlementService) parseSymbol(symbol string) (base, quote string, err error) {
    parts := strings.Split(symbol, "/")
    if len(parts) != 2 {
        return "", "", fmt.Errorf("invalid symbol format: %s", symbol)
    }
    return parts[0], parts[1], nil
}

func timePtr(t time.Time) *time.Time {
    return &t
}
```

**Step 1.3: Implement Rollback Logic (0.5 hours)**

```go
type WalletOperation struct {
    Type     string // "debit" or "credit"
    UserID   uuid.UUID
    Currency string
    Amount   decimal.Decimal
}

func (s *SettlementService) handleSettlementFailure(
    trade *domain.Trade,
    completedOps []WalletOperation,
    originalErr error,
) error {
    s.logger.Error("settlement failed, initiating rollback",
        zap.String("trade_id", trade.ID.String()),
        zap.Int("ops_to_rollback", len(completedOps)),
        zap.Error(originalErr),
    )

    // Rollback in reverse order (LIFO)
    rollbackErrors := []error{}
    for i := len(completedOps) - 1; i >= 0; i-- {
        op := completedOps[i]

        var err error
        if op.Type == "debit" {
            // Reverse debit = credit
            err = s.walletClient.CreditBalance(context.Background(), wallet.CreditRequest{
                UserID:   op.UserID,
                Currency: op.Currency,
                Amount:   op.Amount,
                Reason:   "SETTLEMENT_ROLLBACK",
                TradeID:  trade.ID.String(),
            })
        } else {
            // Reverse credit = debit
            err = s.walletClient.DebitBalance(context.Background(), wallet.DebitRequest{
                UserID:   op.UserID,
                Currency: op.Currency,
                Amount:   op.Amount,
                Reason:   "SETTLEMENT_ROLLBACK",
                TradeID:  trade.ID.String(),
            })
        }

        if err != nil {
            s.logger.Error("rollback operation failed",
                zap.String("op_type", op.Type),
                zap.String("user_id", op.UserID.String()),
                zap.String("currency", op.Currency),
                zap.Error(err),
            )
            rollbackErrors = append(rollbackErrors, err)
        }
    }

    // Update trade status to SETTLEMENT_FAILED
    trade.SettlementStatus = domain.SettlementStatusFailed
    trade.SettlementRetryCount++

    ctx := context.Background()
    if err := s.tradeRepo.Update(ctx, trade); err != nil {
        s.logger.Error("failed to update trade status",
            zap.String("trade_id", trade.ID.String()),
            zap.Error(err),
        )
    }

    // Return combined error
    if len(rollbackErrors) > 0 {
        return fmt.Errorf("settlement failed: %w, rollback errors: %v",
            originalErr, rollbackErrors)
    }

    return fmt.Errorf("settlement failed (rolled back): %w", originalErr)
}
```

---

### Phase 2: Retry & Worker Pool (1 hour)

**Step 2.1: Retry Logic (0.5 hours)**

```go
func (s *SettlementService) SettleTradeWithRetry(trade *domain.Trade) error {
    var lastErr error

    for attempt := 0; attempt <= s.config.RetryMaxAttempts; attempt++ {
        if attempt > 0 {
            // Exponential backoff
            backoff := time.Duration(s.config.RetryBackoffMs) * time.Millisecond
            backoff = backoff * time.Duration(1<<uint(attempt-1)) // 2^(n-1)

            maxBackoff := time.Duration(s.config.RetryMaxBackoffMs) * time.Millisecond
            if backoff > maxBackoff {
                backoff = maxBackoff
            }

            s.logger.Info("retrying settlement",
                zap.String("trade_id", trade.ID.String()),
                zap.Int("attempt", attempt),
                zap.Duration("backoff", backoff),
            )

            time.Sleep(backoff)
        }

        err := s.SettleTrade(trade)
        if err == nil {
            if attempt > 0 {
                s.logger.Info("settlement succeeded after retry",
                    zap.String("trade_id", trade.ID.String()),
                    zap.Int("attempts", attempt+1),
                )
            }
            return nil
        }

        lastErr = err

        // Don't retry on permanent errors
        if !s.isRetryableError(err) {
            s.logger.Error("permanent settlement error, not retrying",
                zap.String("trade_id", trade.ID.String()),
                zap.Error(err),
            )
            break
        }
    }

    // Max retries exceeded, move to DLQ
    s.logger.Error("settlement failed after max retries",
        zap.String("trade_id", trade.ID.String()),
        zap.Int("attempts", s.config.RetryMaxAttempts+1),
        zap.Error(lastErr),
    )

    // TODO: Add to dead letter queue
    // s.addToDeadLetterQueue(trade, lastErr)

    return lastErr
}

func (s *SettlementService) isRetryableError(err error) bool {
    // Retry on network errors, timeouts, 5xx
    // Don't retry on 4xx (insufficient balance, invalid request, etc.)
    errMsg := err.Error()

    retryablePatterns := []string{
        "timeout",
        "connection refused",
        "network unreachable",
        "500",
        "502",
        "503",
        "504",
    }

    for _, pattern := range retryablePatterns {
        if strings.Contains(strings.ToLower(errMsg), pattern) {
            return true
        }
    }

    return false
}
```

**Step 2.2: Worker Pool (0.5 hours)**

Create `/services/trade-engine/internal/service/settlement_worker_pool.go`:

```go
package service

import (
    "sync"

    "go.uber.org/zap"
    "trade-engine/internal/domain"
)

type SettlementWorkerPool struct {
    settlementService *SettlementService
    jobQueue          chan *domain.Trade
    workers           int
    wg                sync.WaitGroup
    shutdown          chan struct{}
    logger            *zap.Logger
}

func NewSettlementWorkerPool(
    settlementService *SettlementService,
    workers int,
    queueSize int,
    logger *zap.Logger,
) *SettlementWorkerPool {
    return &SettlementWorkerPool{
        settlementService: settlementService,
        jobQueue:          make(chan *domain.Trade, queueSize),
        workers:           workers,
        shutdown:          make(chan struct{}),
        logger:            logger,
    }
}

func (p *SettlementWorkerPool) Start() {
    for i := 0; i < p.workers; i++ {
        p.wg.Add(1)
        go p.worker(i)
    }
    p.logger.Info("settlement worker pool started",
        zap.Int("workers", p.workers),
        zap.Int("queue_size", cap(p.jobQueue)),
    )
}

func (p *SettlementWorkerPool) worker(id int) {
    defer p.wg.Done()

    p.logger.Info("settlement worker started", zap.Int("worker_id", id))

    for {
        select {
        case trade := <-p.jobQueue:
            err := p.settlementService.SettleTradeWithRetry(trade)
            if err != nil {
                p.logger.Error("settlement job failed",
                    zap.Int("worker_id", id),
                    zap.String("trade_id", trade.ID.String()),
                    zap.Error(err),
                )
            }

        case <-p.shutdown:
            p.logger.Info("settlement worker shutting down", zap.Int("worker_id", id))
            return
        }
    }
}

func (p *SettlementWorkerPool) Submit(trade *domain.Trade) bool {
    select {
    case p.jobQueue <- trade:
        return true
    default:
        p.logger.Error("settlement queue full, trade dropped",
            zap.String("trade_id", trade.ID.String()),
        )
        return false
    }
}

func (p *SettlementWorkerPool) Shutdown() {
    p.logger.Info("shutting down settlement worker pool")
    close(p.shutdown)
    p.wg.Wait()
    close(p.jobQueue)
    p.logger.Info("settlement worker pool shut down complete")
}

func (p *SettlementWorkerPool) QueueDepth() int {
    return len(p.jobQueue)
}
```

---

### Phase 3: Integration & Testing (1.5 hours)

**Step 3.1: Wire to Main (0.5 hours)**

Modify `/services/trade-engine/cmd/server/main.go`:

```go
func main() {
    // ... existing setup ...

    // Initialize wallet client
    walletConfig := wallet.DefaultConfig()
    walletConfig.BaseURL = cfg.WalletService.URL
    walletClient := wallet.NewHTTPClient(walletConfig, logger)

    // Create settlement service
    settlementConfig := &service.SettlementConfig{
        WorkerPoolSize:    cfg.Settlement.WorkerPoolSize,
        RetryMaxAttempts:  cfg.Settlement.RetryMaxAttempts,
        RetryBackoffMs:    cfg.Settlement.RetryBackoffMs,
        RetryMaxBackoffMs: cfg.Settlement.RetryMaxBackoffMs,
        TimeoutMs:         cfg.Settlement.TimeoutMs,
    }
    settlementService := service.NewSettlementService(
        walletClient,
        tradeRepo,
        logger,
        settlementConfig,
    )

    // Start settlement worker pool
    settlementPool := service.NewSettlementWorkerPool(
        settlementService,
        cfg.Settlement.WorkerPoolSize,
        1000, // queue size
        logger,
    )
    settlementPool.Start()
    defer settlementPool.Shutdown()

    // Configure matching engine trade callback
    matchingEngine.SetTradeCallback(func(trade *domain.Trade) {
        // Persist trade (sync)
        if err := tradeRepo.Save(context.Background(), trade); err != nil {
            logger.Error("trade persistence failed",
                zap.String("trade_id", trade.ID.String()),
                zap.Error(err))
            return
        }

        // Submit to settlement pool (async)
        if !settlementPool.Submit(trade) {
            logger.Error("failed to submit trade for settlement",
                zap.String("trade_id", trade.ID.String()))
        }
    })

    // ... rest of setup ...
}
```

**Step 3.2: Unit Tests (0.5 hours)**

Create `/services/trade-engine/internal/service/settlement_service_test.go`:

```go
func TestSettlementService_SettleTrade_Success(t *testing.T) {
    mockWallet := wallet.NewMockClient()
    mockRepo := &MockTradeRepository{}
    logger := zap.NewNop()

    config := &SettlementConfig{
        RetryMaxAttempts: 3,
        RetryBackoffMs:   1000,
        TimeoutMs:        5000,
    }

    service := NewSettlementService(mockWallet, mockRepo, logger, config)

    // Setup test trade
    trade := &domain.Trade{
        ID:            uuid.New(),
        Symbol:        "BTC/USDT",
        BuyerUserID:   uuid.New(),
        SellerUserID:  uuid.New(),
        Price:         decimal.NewFromInt(50000),
        Quantity:      decimal.NewFromFloat(1.0),
        BuyerFee:      decimal.NewFromFloat(25.0),
        SellerFee:     decimal.NewFromFloat(50.0),
        IsBuyerMaker:  false,
    }

    // Setup wallet balances
    mockWallet.SetBalance(trade.BuyerUserID, "USDT", decimal.NewFromInt(100000))
    mockWallet.SetBalance(trade.SellerUserID, "BTC", decimal.NewFromFloat(10.0))

    // Execute settlement
    err := service.SettleTrade(trade)

    // Assertions
    assert.NoError(t, err)
    assert.Equal(t, domain.SettlementStatusSettled, trade.SettlementStatus)
    assert.NotNil(t, trade.SettledAt)

    // Verify buyer balances
    buyerUSDT := mockWallet.GetBalance(trade.BuyerUserID, "USDT")
    expectedBuyerDebit := decimal.NewFromInt(50000).Add(decimal.NewFromFloat(25.0))
    assert.Equal(t, decimal.NewFromInt(100000).Sub(expectedBuyerDebit), buyerUSDT)

    buyerBTC := mockWallet.GetBalance(trade.BuyerUserID, "BTC")
    assert.Equal(t, decimal.NewFromFloat(1.0), buyerBTC)

    // Verify seller balances
    sellerBTC := mockWallet.GetBalance(trade.SellerUserID, "BTC")
    assert.Equal(t, decimal.NewFromFloat(9.0), sellerBTC) // 10 - 1

    sellerUSDT := mockWallet.GetBalance(trade.SellerUserID, "USDT")
    expectedSellerCredit := decimal.NewFromInt(50000).Sub(decimal.NewFromFloat(50.0))
    assert.Equal(t, expectedSellerCredit, sellerUSDT)
}

func TestSettlementService_BuyerCreditFails_Rollback(t *testing.T) {
    mockWallet := wallet.NewMockClient()
    mockWallet.SetCreditError(errors.New("network timeout"))

    service := NewSettlementService(mockWallet, mockRepo, logger, config)

    trade := createTestTrade()
    mockWallet.SetBalance(trade.BuyerUserID, "USDT", decimal.NewFromInt(100000))

    err := service.SettleTrade(trade)

    assert.Error(t, err)
    assert.Equal(t, domain.SettlementStatusFailed, trade.SettlementStatus)

    // Verify rollback: buyer USDT balance should be unchanged
    buyerUSDT := mockWallet.GetBalance(trade.BuyerUserID, "USDT")
    assert.Equal(t, decimal.NewFromInt(100000), buyerUSDT)
}

func TestSettlementService_RetryLogic(t *testing.T) {
    mockWallet := wallet.NewMockClient()
    mockWallet.SetTransientError(2) // Fail first 2 attempts, succeed on 3rd

    service := NewSettlementService(mockWallet, mockRepo, logger, config)

    trade := createTestTrade()
    err := service.SettleTradeWithRetry(trade)

    assert.NoError(t, err)
    assert.Equal(t, 3, mockWallet.GetCallCount()) // 1 initial + 2 retries
}
```

**Step 3.3: Integration Test (0.5 hours)**

```go
func TestSettlement_Integration(t *testing.T) {
    // Use real wallet service (or dockerized mock)
    // Real database
    // Real matching engine

    // Place orders, execute trades, verify settlements
}
```

---

## Configuration

Add to `/services/trade-engine/internal/config/config.go`:

```yaml
# config.yaml
settlement:
  worker_pool_size: 10
  retry_max_attempts: 3
  retry_backoff_ms: 1000
  retry_max_backoff_ms: 30000
  timeout_ms: 5000
  dead_letter_queue_enabled: true
```

---

## Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Settlement Latency | <100ms | p99, excluding wallet service |
| Throughput | 50 settlements/sec | Limited by wallet capacity |
| Rollback Time | <200ms | Critical for consistency |
| Retry Success Rate | >95% | Transient errors resolve |

---

## Verification Commands

```bash
# Run unit tests
go test -v ./internal/service/settlement*

# Run with coverage
go test -cover ./internal/service/settlement*
go test -coverprofile=coverage-settlement.out ./internal/service/settlement*
go tool cover -html=coverage-settlement.out -o coverage-settlement.html

# Check coverage
go tool cover -func=coverage-settlement.out | grep total
# Target: >85%

# Run race detector
go test -v -race ./internal/service/settlement*

# Run benchmarks
go test -bench=BenchmarkSettlement -benchmem ./internal/service/...
```

---

## Definition of Done

**Implementation Complete (6/6):**
- [ ] SettlementService created
- [ ] SettleTrade() with 4 wallet operations
- [ ] Rollback logic implemented
- [ ] Retry mechanism with backoff
- [ ] Worker pool implementation
- [ ] Integration with matching engine callback

**Testing Complete (4/4):**
- [ ] Unit tests (success + failures)
- [ ] Rollback test
- [ ] Retry test
- [ ] Concurrent settlement test

**Database Integration (3/3):**
- [ ] Trade status updated
- [ ] Settlement timestamp recorded
- [ ] Retry counter tracked

**Quality Gates (4/4):**
- [ ] All tests passing
- [ ] Coverage >85%
- [ ] No race conditions
- [ ] Code reviewed

---

## Handoff Notes

**To TASK-BACKEND-007:**
- Trade callback signature ready for integration
- SettlementWorkerPool.Submit(trade) for async settlement
- Errors logged, don't block matching

**To QA Agent (TASK-QA-005):**
- Settlement flow ready for E2E testing
- Balance conservation should verify correctly
- Mock wallet client available for testing

---

**Estimated Time:** 4 hours
**Actual Time:** [To be filled]
**Status:** 🎯 READY TO START
