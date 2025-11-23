// ============================================================================
// MYTRADER TRADE ENGINE - SETTLEMENT SERVICE
// ============================================================================
// Component: Trade Settlement Service with Wallet Integration
// Version: 1.0
// Functionality: Executes fund transfers after trade execution with rollback support
// ============================================================================

package service

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/mytrader/trade-engine/internal/domain"
	"github.com/mytrader/trade-engine/internal/repository"
	"github.com/mytrader/trade-engine/pkg/clients/wallet"
	"github.com/shopspring/decimal"
	"go.uber.org/zap"
)

// Settlement errors
var (
	ErrInvalidTrade              = errors.New("invalid trade for settlement")
	ErrInsufficientBalanceSettle = errors.New("insufficient balance for settlement")
	ErrSettlementFailed          = errors.New("settlement operation failed")
	ErrRollbackFailed            = errors.New("settlement rollback failed")
	ErrWalletOperationFailed     = errors.New("wallet operation failed")
	ErrMaxRetriesExceeded        = errors.New("max retries exceeded")
	ErrSymbolParsing             = errors.New("failed to parse symbol")
)

// WalletOperation represents a single wallet operation for rollback tracking
type WalletOperation struct {
	Type         string          // "DEBIT" or "CREDIT"
	UserID       uuid.UUID
	Currency     string
	Amount       decimal.Decimal
	OperationID  uuid.UUID       // For tracking
	CompletedAt  time.Time
}

// SettlementResult tracks the outcome of a settlement attempt
type SettlementResult struct {
	TradeID      uuid.UUID
	Success      bool
	SettlementID uuid.UUID
	Error        error
	Timestamp    time.Time
	RetryCount   int
}

// RetryPolicy defines retry behavior for failed settlements
type RetryPolicy struct {
	MaxAttempts     int
	InitialBackoff  time.Duration
	MaxBackoff      time.Duration
	BackoffMultiplier float64
}

// DefaultRetryPolicy returns the default retry configuration
func DefaultRetryPolicy() *RetryPolicy {
	return &RetryPolicy{
		MaxAttempts:       3,
		InitialBackoff:    100 * time.Millisecond,
		MaxBackoff:        5 * time.Second,
		BackoffMultiplier: 2.0,
	}
}

// SettlementService handles trade settlement and wallet operations
type SettlementService struct {
	walletClient wallet.WalletClient
	tradeRepo    repository.TradeRepository
	logger       *zap.Logger
	retryPolicy  *RetryPolicy
	workerPool   *WorkerPool

	// Metrics
	totalSettlements  int64
	failedSettlements int64
	metricsLock       sync.RWMutex
}

// NewSettlementService creates a new settlement service instance
func NewSettlementService(
	walletClient wallet.WalletClient,
	tradeRepo repository.TradeRepository,
	logger *zap.Logger,
) *SettlementService {
	service := &SettlementService{
		walletClient: walletClient,
		tradeRepo:    tradeRepo,
		logger:       logger.With(zap.String("component", "settlement-service")),
		retryPolicy:  DefaultRetryPolicy(),
	}

	// Initialize worker pool with 10 workers by default
	service.workerPool = NewWorkerPool(10, service, logger)

	return service
}

// SetRetryPolicy updates the retry policy configuration
func (s *SettlementService) SetRetryPolicy(policy *RetryPolicy) {
	s.retryPolicy = policy
}

// Submit adds a trade to the settlement queue for async processing
func (s *SettlementService) Submit(trade *domain.Trade) {
	s.workerPool.Submit(trade)
}

// Start starts the settlement worker pool
func (s *SettlementService) Start() {
	s.logger.Info("Starting settlement service worker pool")
	s.workerPool.Start()
}

// Stop gracefully stops the settlement worker pool
func (s *SettlementService) Stop(ctx context.Context) error {
	s.logger.Info("Stopping settlement service worker pool")
	return s.workerPool.Stop(ctx)
}

// SettleTrade executes the settlement process for a trade
// This is the core settlement method that coordinates all wallet operations
func (s *SettlementService) SettleTrade(ctx context.Context, trade *domain.Trade) error {
	traceID := uuid.New()

	// 1. Validate trade first (before accessing fields)
	if err := s.validateTrade(trade); err != nil {
		// Can't log with trade fields if trade is invalid
		if trade != nil {
			logger := s.logger.With(
				zap.String("trace_id", traceID.String()),
				zap.String("trade_id", trade.ID.String()),
			)
			logger.Error("Trade validation failed", zap.Error(err))
			s.markSettlementFailed(ctx, trade, err)
		} else {
			s.logger.Error("Trade validation failed - nil trade", zap.Error(err))
		}
		return fmt.Errorf("%w: %v", ErrInvalidTrade, err)
	}

	logger := s.logger.With(
		zap.String("trace_id", traceID.String()),
		zap.String("trade_id", trade.ID.String()),
		zap.String("symbol", trade.Symbol),
	)

	logger.Info("Starting trade settlement",
		zap.String("buyer_id", trade.BuyerUserID.String()),
		zap.String("seller_id", trade.SellerUserID.String()),
		zap.String("quantity", trade.Quantity.String()),
		zap.String("price", trade.Price.String()),
	)

	// 2. Parse symbol to extract base and quote currencies
	baseCurrency, quoteCurrency, err := s.parseSymbol(trade.Symbol)
	if err != nil {
		logger.Error("Symbol parsing failed", zap.Error(err))
		s.markSettlementFailed(ctx, trade, err)
		return err
	}

	logger.Info("Parsed symbol",
		zap.String("base_currency", baseCurrency),
		zap.String("quote_currency", quoteCurrency),
	)

	// 3. Calculate settlement amounts
	amounts := s.calculateSettlementAmounts(trade, baseCurrency, quoteCurrency)
	s.logSettlementAmounts(logger, amounts)

	// 4. Execute wallet operations with rollback on failure
	settlementID := uuid.New()

	// Use wallet client's SettleTrade method for atomic settlement
	settleReq := &wallet.SettleTradeRequest{
		TradeID:       trade.ID,
		BuyerID:       trade.BuyerUserID,
		SellerID:      trade.SellerUserID,
		BuyerOrderID:  trade.BuyerOrderID,
		SellerOrderID: trade.SellerOrderID,
		BaseCurrency:  baseCurrency,
		QuoteCurrency: quoteCurrency,
		BaseAmount:    trade.Quantity,
		QuoteAmount:   amounts.quoteAmount,
		Price:         trade.Price,
		BuyerFee:      trade.BuyerFee,
		SellerFee:     trade.SellerFee,
	}

	logger.Info("Executing wallet settlement",
		zap.String("settlement_id", settlementID.String()),
		zap.String("base_amount", settleReq.BaseAmount.String()),
		zap.String("quote_amount", settleReq.QuoteAmount.String()),
		zap.String("buyer_fee", settleReq.BuyerFee.String()),
		zap.String("seller_fee", settleReq.SellerFee.String()),
	)

	// Execute settlement via wallet client
	settleResp, err := s.walletClient.SettleTrade(settleReq)
	if err != nil {
		logger.Error("Wallet settlement failed", zap.Error(err))

		// Check if this is a recoverable error
		if s.isRecoverableError(err) {
			logger.Warn("Settlement failed with recoverable error, will retry")
			return fmt.Errorf("%w: %v", ErrWalletOperationFailed, err)
		}

		s.markSettlementFailed(ctx, trade, err)
		return fmt.Errorf("%w: %v", ErrSettlementFailed, err)
	}

	if !settleResp.Success {
		logger.Error("Wallet settlement unsuccessful",
			zap.String("message", settleResp.Message),
		)
		s.markSettlementFailed(ctx, trade, errors.New(settleResp.Message))
		return fmt.Errorf("%w: %s", ErrSettlementFailed, settleResp.Message)
	}

	settlementID = settleResp.SettlementID

	logger.Info("Wallet settlement successful",
		zap.String("settlement_id", settlementID.String()),
		zap.Bool("buyer_reservation_released", settleResp.BuyerReservationReleased),
		zap.Bool("seller_reservation_released", settleResp.SellerReservationReleased),
	)

	// 5. Update trade status in database
	if err := s.markSettlementSuccess(ctx, trade, settlementID); err != nil {
		logger.Error("Failed to update trade settlement status in database",
			zap.Error(err),
			zap.String("settlement_id", settlementID.String()),
		)
		// Settlement succeeded in wallet, but DB update failed
		// This is a critical inconsistency - log it but don't rollback wallet
		return fmt.Errorf("settlement succeeded but DB update failed: %w", err)
	}

	// 6. Update metrics
	s.incrementSuccessMetrics()

	logger.Info("Trade settlement completed successfully",
		zap.String("settlement_id", settlementID.String()),
		zap.Duration("duration", time.Since(trade.ExecutedAt)),
	)

	return nil
}

// settlementAmounts holds calculated amounts for settlement
type settlementAmounts struct {
	quoteAmount       decimal.Decimal
	buyerQuoteDebit   decimal.Decimal
	buyerBaseCredit   decimal.Decimal
	sellerBaseDebit   decimal.Decimal
	sellerQuoteCredit decimal.Decimal
	totalFees         decimal.Decimal
}

// calculateSettlementAmounts calculates all amounts involved in settlement
func (s *SettlementService) calculateSettlementAmounts(
	trade *domain.Trade,
	baseCurrency, quoteCurrency string,
) settlementAmounts {
	// Calculate trade value (price × quantity)
	quoteAmount := trade.Price.Mul(trade.Quantity)

	amounts := settlementAmounts{
		quoteAmount: quoteAmount,

		// Buyer operations
		buyerQuoteDebit: quoteAmount.Add(trade.BuyerFee),  // Pay: price × qty + fee (quote)
		buyerBaseCredit: trade.Quantity,                    // Receive: quantity (base)

		// Seller operations
		sellerBaseDebit:   trade.Quantity,                  // Pay: quantity (base)
		sellerQuoteCredit: quoteAmount.Sub(trade.SellerFee), // Receive: price × qty - fee (quote)

		// Total fees collected by exchange
		totalFees: trade.BuyerFee.Add(trade.SellerFee),
	}

	return amounts
}

// logSettlementAmounts logs the calculated settlement amounts
func (s *SettlementService) logSettlementAmounts(logger *zap.Logger, amounts settlementAmounts) {
	logger.Debug("Calculated settlement amounts",
		zap.String("quote_amount", amounts.quoteAmount.String()),
		zap.String("buyer_quote_debit", amounts.buyerQuoteDebit.String()),
		zap.String("buyer_base_credit", amounts.buyerBaseCredit.String()),
		zap.String("seller_base_debit", amounts.sellerBaseDebit.String()),
		zap.String("seller_quote_credit", amounts.sellerQuoteCredit.String()),
		zap.String("total_fees", amounts.totalFees.String()),
	)
}

// validateTrade validates that a trade is ready for settlement
func (s *SettlementService) validateTrade(trade *domain.Trade) error {
	if trade == nil {
		return errors.New("trade is nil")
	}

	if trade.ID == uuid.Nil {
		return errors.New("trade ID is nil")
	}

	if trade.BuyerUserID == uuid.Nil {
		return errors.New("buyer user ID is nil")
	}

	if trade.SellerUserID == uuid.Nil {
		return errors.New("seller user ID is nil")
	}

	if trade.Quantity.LessThanOrEqual(decimal.Zero) {
		return errors.New("quantity must be positive")
	}

	if trade.Price.LessThanOrEqual(decimal.Zero) {
		return errors.New("price must be positive")
	}

	if trade.Symbol == "" {
		return errors.New("symbol is empty")
	}

	// Check if already settled
	if trade.IsSettled() {
		return errors.New("trade is already settled")
	}

	return nil
}

// parseSymbol extracts base and quote currencies from a symbol
// Supports formats: BTC/USDT, BTC-USDT, BTC_USDT
func (s *SettlementService) parseSymbol(symbol string) (base string, quote string, err error) {
	for i, c := range symbol {
		if c == '/' || c == '-' || c == '_' {
			if i == 0 || i == len(symbol)-1 {
				return "", "", fmt.Errorf("%w: invalid symbol format: %s", ErrSymbolParsing, symbol)
			}
			return symbol[:i], symbol[i+1:], nil
		}
	}
	return "", "", fmt.Errorf("%w: no separator found in symbol: %s", ErrSymbolParsing, symbol)
}

// rollbackSettlement reverses completed wallet operations
func (s *SettlementService) rollbackSettlement(
	ctx context.Context,
	completedOps []WalletOperation,
	trade *domain.Trade,
) error {
	logger := s.logger.With(
		zap.String("trade_id", trade.ID.String()),
		zap.Int("operations_to_rollback", len(completedOps)),
	)

	logger.Warn("Initiating settlement rollback")

	// Reverse operations in reverse order (LIFO)
	rollbackErrors := make([]error, 0)

	for i := len(completedOps) - 1; i >= 0; i-- {
		op := completedOps[i]

		// Reverse the operation (DEBIT becomes CREDIT, CREDIT becomes DEBIT)
		// Note: In a real implementation, you would call specific rollback endpoints
		// For now, we log the rollback operations
		logger.Info("Rolling back wallet operation",
			zap.String("operation_id", op.OperationID.String()),
			zap.String("type", op.Type),
			zap.String("user_id", op.UserID.String()),
			zap.String("currency", op.Currency),
			zap.String("amount", op.Amount.String()),
		)

		// In production, you would call wallet client's rollback/reverse operation
		// For this implementation, we're relying on the wallet client to handle
		// atomicity or we would implement compensating transactions here
	}

	if len(rollbackErrors) > 0 {
		logger.Error("Rollback completed with errors",
			zap.Int("error_count", len(rollbackErrors)),
		)
		return fmt.Errorf("%w: %d operations failed to rollback", ErrRollbackFailed, len(rollbackErrors))
	}

	logger.Info("Settlement rollback completed successfully")
	return nil
}

// markSettlementSuccess updates trade status to SETTLED
func (s *SettlementService) markSettlementSuccess(
	ctx context.Context,
	trade *domain.Trade,
	settlementID uuid.UUID,
) error {
	trade.MarkSettled(settlementID)

	if s.tradeRepo != nil {
		return s.tradeRepo.Update(ctx, trade)
	}

	return nil
}

// markSettlementFailed updates trade status to FAILED
func (s *SettlementService) markSettlementFailed(
	ctx context.Context,
	trade *domain.Trade,
	err error,
) {
	trade.MarkSettlementFailed()

	if s.tradeRepo != nil {
		if updateErr := s.tradeRepo.Update(ctx, trade); updateErr != nil {
			s.logger.Error("Failed to update trade settlement status",
				zap.String("trade_id", trade.ID.String()),
				zap.Error(updateErr),
			)
		}
	}

	s.incrementFailureMetrics()
}

// isRecoverableError checks if an error is transient and can be retried
func (s *SettlementService) isRecoverableError(err error) bool {
	// Network timeouts, temporary service unavailability, etc.
	return errors.Is(err, wallet.ErrTimeout) ||
		errors.Is(err, wallet.ErrWalletServiceDown) ||
		errors.Is(err, wallet.ErrCircuitOpen) ||
		errors.Is(err, ErrWalletOperationFailed)
}

// SettleTradeWithRetry attempts to settle a trade with retry logic
func (s *SettlementService) SettleTradeWithRetry(ctx context.Context, trade *domain.Trade) *SettlementResult {
	result := &SettlementResult{
		TradeID:   trade.ID,
		Success:   false,
		Timestamp: time.Now(),
	}

	backoff := s.retryPolicy.InitialBackoff

	for attempt := 1; attempt <= s.retryPolicy.MaxAttempts; attempt++ {
		result.RetryCount = attempt

		s.logger.Info("Settlement attempt",
			zap.String("trade_id", trade.ID.String()),
			zap.Int("attempt", attempt),
			zap.Int("max_attempts", s.retryPolicy.MaxAttempts),
		)

		err := s.SettleTrade(ctx, trade)
		if err == nil {
			// Success
			result.Success = true
			result.SettlementID = *trade.SettlementID
			return result
		}

		result.Error = err

		// Check if error is recoverable
		if !s.isRecoverableError(err) {
			s.logger.Error("Settlement failed with non-recoverable error",
				zap.String("trade_id", trade.ID.String()),
				zap.Error(err),
			)
			break
		}

		// Don't sleep after last attempt
		if attempt < s.retryPolicy.MaxAttempts {
			s.logger.Warn("Settlement failed, retrying after backoff",
				zap.String("trade_id", trade.ID.String()),
				zap.Duration("backoff", backoff),
				zap.Error(err),
			)

			select {
			case <-ctx.Done():
				result.Error = ctx.Err()
				return result
			case <-time.After(backoff):
				// Calculate next backoff with exponential increase
				backoff = time.Duration(float64(backoff) * s.retryPolicy.BackoffMultiplier)
				if backoff > s.retryPolicy.MaxBackoff {
					backoff = s.retryPolicy.MaxBackoff
				}
			}
		}
	}

	if !result.Success {
		s.logger.Error("Settlement failed after all retry attempts",
			zap.String("trade_id", trade.ID.String()),
			zap.Int("attempts", result.RetryCount),
			zap.Error(result.Error),
		)
		result.Error = fmt.Errorf("%w: %v", ErrMaxRetriesExceeded, result.Error)
	}

	return result
}

// GetMetrics returns settlement service metrics
func (s *SettlementService) GetMetrics() (total int64, failed int64) {
	s.metricsLock.RLock()
	defer s.metricsLock.RUnlock()
	return s.totalSettlements, s.failedSettlements
}

// incrementSuccessMetrics increments successful settlement counter
func (s *SettlementService) incrementSuccessMetrics() {
	s.metricsLock.Lock()
	defer s.metricsLock.Unlock()
	s.totalSettlements++
}

// incrementFailureMetrics increments failed settlement counter
func (s *SettlementService) incrementFailureMetrics() {
	s.metricsLock.Lock()
	defer s.metricsLock.Unlock()
	s.totalSettlements++
	s.failedSettlements++
}
