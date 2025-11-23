// ============================================================================
// MYTRADER TRADE ENGINE - SETTLEMENT WORKER POOL TESTS
// ============================================================================
// Component: Settlement Worker Pool Unit Tests
// Version: 1.0
// Coverage Target: >85%
// ============================================================================

package service

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/mytrader/trade-engine/internal/domain"
	"github.com/mytrader/trade-engine/pkg/clients/wallet"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"go.uber.org/zap"
)

// TestWorkerPool_StartStop tests worker pool lifecycle
func TestWorkerPool_StartStop(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	mockWallet := new(MockSettlementWalletClient)
	mockRepo := new(MockTradeRepository)

	service := NewSettlementService(mockWallet, mockRepo, logger)
	pool := service.workerPool

	// Start pool
	pool.Start()

	// Stop pool
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	err := pool.Stop(ctx)
	assert.NoError(t, err)
}

// TestWorkerPool_ProcessSingleTrade tests processing a single trade
func TestWorkerPool_ProcessSingleTrade(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	mockWallet := new(MockSettlementWalletClient)
	mockRepo := new(MockTradeRepository)

	service := NewSettlementService(mockWallet, mockRepo, logger)
	pool := service.workerPool

	// Setup mocks
	trade := createTestTrade("BTC/USDT", decimal.NewFromInt(50000), decimal.NewFromFloat(0.1))
	settlementID := uuid.New()

	mockWallet.On("SettleTrade", mock.AnythingOfType("*wallet.SettleTradeRequest")).
		Return(&wallet.SettleTradeResponse{
			Success:                   true,
			SettlementID:              settlementID,
			BuyerReservationReleased:  true,
			SellerReservationReleased: true,
		}, nil).Once()

	mockRepo.On("Update", mock.Anything, trade).Return(nil).Once()

	// Start pool
	pool.Start()

	// Submit trade
	pool.Submit(trade)

	// Wait for processing
	time.Sleep(100 * time.Millisecond)

	// Stop pool
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	err := pool.Stop(ctx)
	assert.NoError(t, err)

	// Verify trade was processed
	assert.True(t, trade.IsSettled())

	submitted, processed, failed := pool.GetMetrics()
	assert.Equal(t, int64(1), submitted)
	assert.Equal(t, int64(1), processed)
	assert.Equal(t, int64(0), failed)

	mockWallet.AssertExpectations(t)
	mockRepo.AssertExpectations(t)
}

// TestWorkerPool_ProcessMultipleTrades tests processing multiple trades concurrently
func TestWorkerPool_ProcessMultipleTrades(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	mockWallet := new(MockSettlementWalletClient)
	mockRepo := new(MockTradeRepository)

	service := NewSettlementService(mockWallet, mockRepo, logger)
	pool := service.workerPool

	numTrades := 20
	trades := make([]*domain.Trade, numTrades)

	// Setup trades and mocks
	for i := 0; i < numTrades; i++ {
		trades[i] = createTestTrade("BTC/USDT", decimal.NewFromInt(50000), decimal.NewFromFloat(0.1))

		settlementID := uuid.New()
		mockWallet.On("SettleTrade", mock.AnythingOfType("*wallet.SettleTradeRequest")).
			Return(&wallet.SettleTradeResponse{
				Success:                   true,
				SettlementID:              settlementID,
				BuyerReservationReleased:  true,
				SellerReservationReleased: true,
			}, nil).Once()

		mockRepo.On("Update", mock.Anything, mock.AnythingOfType("*domain.Trade")).
			Return(nil).Once()
	}

	// Start pool
	pool.Start()

	// Submit all trades
	for _, trade := range trades {
		pool.Submit(trade)
	}

	// Wait for processing (with timeout)
	deadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(deadline) {
		_, processed, _ := pool.GetMetrics()
		if processed == int64(numTrades) {
			break
		}
		time.Sleep(50 * time.Millisecond)
	}

	// Stop pool
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	err := pool.Stop(ctx)
	assert.NoError(t, err)

	// Verify metrics
	submitted, processed, failed := pool.GetMetrics()
	assert.Equal(t, int64(numTrades), submitted)
	assert.Equal(t, int64(numTrades), processed)
	assert.Equal(t, int64(0), failed)

	mockWallet.AssertExpectations(t)
	mockRepo.AssertExpectations(t)
}

// TestWorkerPool_FailedSettlement tests handling of failed settlements
func TestWorkerPool_FailedSettlement(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	mockWallet := new(MockSettlementWalletClient)
	mockRepo := new(MockTradeRepository)

	service := NewSettlementService(mockWallet, mockRepo, logger)
	service.SetRetryPolicy(&RetryPolicy{
		MaxAttempts:       2,
		InitialBackoff:    10 * time.Millisecond,
		MaxBackoff:        50 * time.Millisecond,
		BackoffMultiplier: 2.0,
	})

	pool := service.workerPool

	// Setup failed trade
	trade := createTestTrade("BTC/USDT", decimal.NewFromInt(50000), decimal.NewFromFloat(0.1))

	// All attempts fail
	mockWallet.On("SettleTrade", mock.AnythingOfType("*wallet.SettleTradeRequest")).
		Return(nil, wallet.ErrInsufficientBalance).Times(2)

	mockRepo.On("Update", mock.Anything, trade).Return(nil).Times(2)

	// Start pool
	pool.Start()

	// Submit trade
	pool.Submit(trade)

	// Wait for processing
	time.Sleep(500 * time.Millisecond)

	// Stop pool
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	err := pool.Stop(ctx)
	assert.NoError(t, err)

	// Verify trade failed
	assert.Equal(t, "FAILED", trade.SettlementStatus)

	// Verify it's in DLQ
	assert.Equal(t, 1, pool.GetDLQSize())

	submitted, processed, failed := pool.GetMetrics()
	assert.Equal(t, int64(1), submitted)
	assert.Equal(t, int64(0), processed)
	assert.Equal(t, int64(1), failed)

	mockWallet.AssertExpectations(t)
	mockRepo.AssertExpectations(t)
}

// TestWorkerPool_QueueFull tests behavior when queue is full
func TestWorkerPool_QueueFull(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	mockWallet := new(MockSettlementWalletClient)
	mockRepo := new(MockTradeRepository)

	service := NewSettlementService(mockWallet, mockRepo, logger)

	// Create pool with small queue
	config := DefaultWorkerPoolConfig()
	config.QueueSize = 2
	config.WorkerCount = 1
	pool := &WorkerPool{
		config:        config,
		settlementSvc: service,
		logger:        logger,
		jobQueue:      make(chan *domain.Trade, config.QueueSize),
		workers:       make([]*worker, 1),
		stopped:       make(chan struct{}),
		dlq:           NewDeadLetterQueue(logger),
	}

	pool.workers[0] = &worker{
		id:     0,
		pool:   pool,
		logger: logger,
	}

	// Don't start the pool (workers won't consume from queue)

	// Fill the queue
	trade1 := createTestTrade("BTC/USDT", decimal.NewFromInt(50000), decimal.NewFromFloat(0.1))
	trade2 := createTestTrade("BTC/USDT", decimal.NewFromInt(50000), decimal.NewFromFloat(0.1))
	trade3 := createTestTrade("BTC/USDT", decimal.NewFromInt(50000), decimal.NewFromFloat(0.1))

	pool.Submit(trade1) // Should succeed
	pool.Submit(trade2) // Should succeed
	pool.Submit(trade3) // Should go to DLQ (queue full)

	// Verify DLQ
	assert.Equal(t, 1, pool.GetDLQSize())

	submitted, _, failed := pool.GetMetrics()
	assert.Equal(t, int64(2), submitted)
	assert.Equal(t, int64(1), failed)
}

// TestWorkerPool_GracefulShutdown tests graceful shutdown with pending jobs
func TestWorkerPool_GracefulShutdown(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	mockWallet := new(MockSettlementWalletClient)
	mockRepo := new(MockTradeRepository)

	service := NewSettlementService(mockWallet, mockRepo, logger)
	pool := service.workerPool

	numTrades := 5
	trades := make([]*domain.Trade, numTrades)

	// Setup trades and mocks
	for i := 0; i < numTrades; i++ {
		trades[i] = createTestTrade("BTC/USDT", decimal.NewFromInt(50000), decimal.NewFromFloat(0.1))

		settlementID := uuid.New()
		mockWallet.On("SettleTrade", mock.AnythingOfType("*wallet.SettleTradeRequest")).
			Return(&wallet.SettleTradeResponse{
				Success:                   true,
				SettlementID:              settlementID,
				BuyerReservationReleased:  true,
				SellerReservationReleased: true,
			}, nil).Once()

		mockRepo.On("Update", mock.Anything, mock.AnythingOfType("*domain.Trade")).
			Return(nil).Once()
	}

	// Start pool
	pool.Start()

	// Submit all trades
	for _, trade := range trades {
		pool.Submit(trade)
	}

	// Immediately stop (should wait for pending jobs)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	err := pool.Stop(ctx)
	assert.NoError(t, err)

	// All trades should be processed
	_, processed, _ := pool.GetMetrics()
	assert.Equal(t, int64(numTrades), processed)

	mockWallet.AssertExpectations(t)
	mockRepo.AssertExpectations(t)
}

// TestWorkerPool_SubmitAfterStop tests submitting after pool is stopped
func TestWorkerPool_SubmitAfterStop(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	mockWallet := new(MockSettlementWalletClient)
	mockRepo := new(MockTradeRepository)

	service := NewSettlementService(mockWallet, mockRepo, logger)
	pool := service.workerPool

	// Start and stop pool
	pool.Start()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	err := pool.Stop(ctx)
	assert.NoError(t, err)

	// Try to submit after stop
	trade := createTestTrade("BTC/USDT", decimal.NewFromInt(50000), decimal.NewFromFloat(0.1))
	pool.Submit(trade)

	// Should not panic, but trade won't be processed
	submitted, processed, _ := pool.GetMetrics()
	assert.Equal(t, int64(0), submitted)
	assert.Equal(t, int64(0), processed)
}

// TestDeadLetterQueue tests DLQ functionality
func TestDeadLetterQueue(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	dlq := NewDeadLetterQueue(logger)

	// Initially empty
	assert.Equal(t, 0, dlq.Size())

	// Add items
	trade1 := createTestTrade("BTC/USDT", decimal.NewFromInt(50000), decimal.NewFromFloat(0.1))
	trade2 := createTestTrade("ETH/USDT", decimal.NewFromInt(3000), decimal.NewFromInt(1))

	dlq.Add(trade1, "insufficient balance")
	dlq.Add(trade2, "timeout")

	assert.Equal(t, 2, dlq.Size())

	// Get all items
	items := dlq.GetAll()
	assert.Len(t, items, 2)

	// Remove specific item
	removed := dlq.Remove(items[0].AttemptID)
	assert.True(t, removed)
	assert.Equal(t, 1, dlq.Size())

	// Clear all
	cleared := dlq.Clear()
	assert.Equal(t, 1, cleared)
	assert.Equal(t, 0, dlq.Size())

	// Remove non-existent item
	removed = dlq.Remove(uuid.New())
	assert.False(t, removed)
}

// TestWorkerPool_RetrySuccess tests successful retry after transient failure
func TestWorkerPool_RetrySuccess(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	mockWallet := new(MockSettlementWalletClient)
	mockRepo := new(MockTradeRepository)

	service := NewSettlementService(mockWallet, mockRepo, logger)
	service.SetRetryPolicy(&RetryPolicy{
		MaxAttempts:       3,
		InitialBackoff:    10 * time.Millisecond,
		MaxBackoff:        100 * time.Millisecond,
		BackoffMultiplier: 2.0,
	})

	pool := service.workerPool

	trade := createTestTrade("BTC/USDT", decimal.NewFromInt(50000), decimal.NewFromFloat(0.1))

	// First call fails with timeout, second succeeds
	settlementID := uuid.New()
	mockWallet.On("SettleTrade", mock.AnythingOfType("*wallet.SettleTradeRequest")).
		Return(nil, wallet.ErrTimeout).Once()

	mockWallet.On("SettleTrade", mock.AnythingOfType("*wallet.SettleTradeRequest")).
		Return(&wallet.SettleTradeResponse{
			Success:                   true,
			SettlementID:              settlementID,
			BuyerReservationReleased:  true,
			SellerReservationReleased: true,
		}, nil).Once()

	mockRepo.On("Update", mock.Anything, trade).Return(nil)

	// Start pool
	pool.Start()

	// Submit trade
	pool.Submit(trade)

	// Wait for processing with retries
	time.Sleep(500 * time.Millisecond)

	// Stop pool
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	err := pool.Stop(ctx)
	assert.NoError(t, err)

	// Verify trade was settled after retry
	assert.True(t, trade.IsSettled())

	submitted, processed, failed := pool.GetMetrics()
	assert.Equal(t, int64(1), submitted)
	assert.Equal(t, int64(1), processed)
	assert.Equal(t, int64(0), failed)

	// Should not be in DLQ
	assert.Equal(t, 0, pool.GetDLQSize())

	mockWallet.AssertExpectations(t)
	mockRepo.AssertExpectations(t)
}

// BenchmarkWorkerPool benchmarks worker pool throughput
func BenchmarkWorkerPool(b *testing.B) {
	logger, _ := zap.NewDevelopment()
	mockWallet := new(MockSettlementWalletClient)
	mockRepo := new(MockTradeRepository)

	service := NewSettlementService(mockWallet, mockRepo, logger)
	pool := service.workerPool

	settlementID := uuid.New()
	mockWallet.On("SettleTrade", mock.AnythingOfType("*wallet.SettleTradeRequest")).
		Return(&wallet.SettleTradeResponse{
			Success:                   true,
			SettlementID:              settlementID,
			BuyerReservationReleased:  true,
			SellerReservationReleased: true,
		}, nil)

	mockRepo.On("Update", mock.Anything, mock.AnythingOfType("*domain.Trade")).
		Return(nil)

	pool.Start()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		trade := createTestTrade("BTC/USDT", decimal.NewFromInt(50000), decimal.NewFromFloat(0.1))
		pool.Submit(trade)
	}

	// Wait for all to complete
	deadline := time.Now().Add(10 * time.Second)
	for time.Now().Before(deadline) {
		submitted, processed, _ := pool.GetMetrics()
		if processed >= submitted {
			break
		}
		time.Sleep(10 * time.Millisecond)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_ = pool.Stop(ctx)
}
