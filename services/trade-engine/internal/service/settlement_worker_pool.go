// ============================================================================
// MYTRADER TRADE ENGINE - SETTLEMENT WORKER POOL
// ============================================================================
// Component: Async Settlement Worker Pool with Dead Letter Queue
// Version: 1.0
// Functionality: Processes trade settlements asynchronously with retry and DLQ
// ============================================================================

package service

import (
	"context"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/mytrader/trade-engine/internal/domain"
	"go.uber.org/zap"
)

// WorkerPoolConfig holds configuration for the worker pool
type WorkerPoolConfig struct {
	WorkerCount        int
	QueueSize          int
	ShutdownTimeout    time.Duration
	ProcessingTimeout  time.Duration
}

// DefaultWorkerPoolConfig returns default worker pool configuration
func DefaultWorkerPoolConfig() WorkerPoolConfig {
	return WorkerPoolConfig{
		WorkerCount:       10,
		QueueSize:         1000,
		ShutdownTimeout:   30 * time.Second,
		ProcessingTimeout: 10 * time.Second,
	}
}

// WorkerPool manages a pool of workers for async trade settlement
type WorkerPool struct {
	config           WorkerPoolConfig
	settlementSvc    *SettlementService
	logger           *zap.Logger

	// Job queue
	jobQueue         chan *domain.Trade

	// Worker management
	workers          []*worker
	wg               sync.WaitGroup
	stopOnce         sync.Once
	stopped          chan struct{}

	// Dead Letter Queue for failed settlements
	dlq              *DeadLetterQueue

	// Metrics
	submitted        int64
	processed        int64
	failed           int64
	metricsLock      sync.RWMutex
}

// NewWorkerPool creates a new worker pool with specified worker count
func NewWorkerPool(workerCount int, settlementSvc *SettlementService, logger *zap.Logger) *WorkerPool {
	config := DefaultWorkerPoolConfig()
	config.WorkerCount = workerCount

	pool := &WorkerPool{
		config:        config,
		settlementSvc: settlementSvc,
		logger:        logger.With(zap.String("component", "settlement-worker-pool")),
		jobQueue:      make(chan *domain.Trade, config.QueueSize),
		workers:       make([]*worker, workerCount),
		stopped:       make(chan struct{}),
		dlq:           NewDeadLetterQueue(logger),
	}

	// Create workers
	for i := 0; i < workerCount; i++ {
		pool.workers[i] = &worker{
			id:     i,
			pool:   pool,
			logger: logger.With(zap.Int("worker_id", i)),
		}
	}

	return pool
}

// Start starts all workers in the pool
func (wp *WorkerPool) Start() {
	wp.logger.Info("Starting worker pool",
		zap.Int("worker_count", wp.config.WorkerCount),
		zap.Int("queue_size", wp.config.QueueSize),
	)

	for _, w := range wp.workers {
		wp.wg.Add(1)
		go w.start()
	}

	wp.logger.Info("Worker pool started successfully")
}

// Stop gracefully stops the worker pool
func (wp *WorkerPool) Stop(ctx context.Context) error {
	wp.logger.Info("Stopping worker pool")

	var stopErr error
	wp.stopOnce.Do(func() {
		// Close job queue to signal workers to stop after processing pending jobs
		close(wp.jobQueue)

		// Wait for workers to finish with timeout
		done := make(chan struct{})
		go func() {
			wp.wg.Wait()
			close(done)
		}()

		select {
		case <-done:
			wp.logger.Info("All workers stopped gracefully")
		case <-ctx.Done():
			wp.logger.Warn("Worker pool shutdown timed out, some jobs may be incomplete")
			stopErr = ctx.Err()
		}

		close(wp.stopped)
	})

	return stopErr
}

// Submit adds a trade to the settlement queue
func (wp *WorkerPool) Submit(trade *domain.Trade) {
	select {
	case <-wp.stopped:
		wp.logger.Warn("Cannot submit job, worker pool is stopped",
			zap.String("trade_id", trade.ID.String()),
		)
		return
	case wp.jobQueue <- trade:
		wp.incrementSubmitted()
		wp.logger.Debug("Trade submitted for settlement",
			zap.String("trade_id", trade.ID.String()),
		)
	default:
		// Queue is full, add to DLQ
		wp.logger.Error("Job queue is full, adding to DLQ",
			zap.String("trade_id", trade.ID.String()),
		)
		wp.dlq.Add(trade, "queue_full")
		wp.incrementFailed()
	}
}

// GetMetrics returns worker pool metrics
func (wp *WorkerPool) GetMetrics() (submitted, processed, failed int64) {
	wp.metricsLock.RLock()
	defer wp.metricsLock.RUnlock()
	return wp.submitted, wp.processed, wp.failed
}

// GetDLQSize returns the number of items in the dead letter queue
func (wp *WorkerPool) GetDLQSize() int {
	return wp.dlq.Size()
}

// GetDLQItems returns all items in the dead letter queue
func (wp *WorkerPool) GetDLQItems() []DeadLetterItem {
	return wp.dlq.GetAll()
}

// incrementSubmitted increments submitted job counter
func (wp *WorkerPool) incrementSubmitted() {
	wp.metricsLock.Lock()
	defer wp.metricsLock.Unlock()
	wp.submitted++
}

// incrementProcessed increments processed job counter
func (wp *WorkerPool) incrementProcessed() {
	wp.metricsLock.Lock()
	defer wp.metricsLock.Unlock()
	wp.processed++
}

// incrementFailed increments failed job counter
func (wp *WorkerPool) incrementFailed() {
	wp.metricsLock.Lock()
	defer wp.metricsLock.Unlock()
	wp.failed++
}

// worker represents a single worker in the pool
type worker struct {
	id     int
	pool   *WorkerPool
	logger *zap.Logger
}

// start runs the worker's main loop
func (w *worker) start() {
	defer w.pool.wg.Done()

	w.logger.Info("Worker started")

	for trade := range w.pool.jobQueue {
		w.processTrade(trade)
	}

	w.logger.Info("Worker stopped")
}

// processTrade processes a single trade settlement with timeout
func (w *worker) processTrade(trade *domain.Trade) {
	logger := w.logger.With(zap.String("trade_id", trade.ID.String()))

	logger.Debug("Processing trade settlement")
	startTime := time.Now()

	// Create context with timeout for settlement
	ctx, cancel := context.WithTimeout(context.Background(), w.pool.config.ProcessingTimeout)
	defer cancel()

	// Attempt settlement with retry
	result := w.pool.settlementSvc.SettleTradeWithRetry(ctx, trade)

	duration := time.Since(startTime)

	if result.Success {
		w.pool.incrementProcessed()
		logger.Info("Trade settlement completed",
			zap.String("settlement_id", result.SettlementID.String()),
			zap.Int("retry_count", result.RetryCount),
			zap.Duration("duration", duration),
		)
	} else {
		w.pool.incrementFailed()
		logger.Error("Trade settlement failed after all retries",
			zap.Error(result.Error),
			zap.Int("retry_count", result.RetryCount),
			zap.Duration("duration", duration),
		)

		// Add to dead letter queue
		w.pool.dlq.Add(trade, result.Error.Error())
	}
}

// DeadLetterItem represents a failed settlement in the DLQ
type DeadLetterItem struct {
	Trade       *domain.Trade
	Reason      string
	FailedAt    time.Time
	AttemptID   uuid.UUID
}

// DeadLetterQueue stores trades that failed settlement after all retries
type DeadLetterQueue struct {
	items  []DeadLetterItem
	mu     sync.RWMutex
	logger *zap.Logger
}

// NewDeadLetterQueue creates a new dead letter queue
func NewDeadLetterQueue(logger *zap.Logger) *DeadLetterQueue {
	return &DeadLetterQueue{
		items:  make([]DeadLetterItem, 0),
		logger: logger.With(zap.String("component", "dlq")),
	}
}

// Add adds a failed trade to the DLQ
func (dlq *DeadLetterQueue) Add(trade *domain.Trade, reason string) {
	dlq.mu.Lock()
	defer dlq.mu.Unlock()

	item := DeadLetterItem{
		Trade:     trade,
		Reason:    reason,
		FailedAt:  time.Now(),
		AttemptID: uuid.New(),
	}

	dlq.items = append(dlq.items, item)

	dlq.logger.Error("Trade added to dead letter queue",
		zap.String("trade_id", trade.ID.String()),
		zap.String("reason", reason),
		zap.String("attempt_id", item.AttemptID.String()),
		zap.Int("dlq_size", len(dlq.items)),
	)
}

// Size returns the number of items in the DLQ
func (dlq *DeadLetterQueue) Size() int {
	dlq.mu.RLock()
	defer dlq.mu.RUnlock()
	return len(dlq.items)
}

// GetAll returns all items in the DLQ
func (dlq *DeadLetterQueue) GetAll() []DeadLetterItem {
	dlq.mu.RLock()
	defer dlq.mu.RUnlock()

	// Return a copy to avoid race conditions
	items := make([]DeadLetterItem, len(dlq.items))
	copy(items, dlq.items)
	return items
}

// Clear removes all items from the DLQ
func (dlq *DeadLetterQueue) Clear() int {
	dlq.mu.Lock()
	defer dlq.mu.Unlock()

	count := len(dlq.items)
	dlq.items = make([]DeadLetterItem, 0)

	dlq.logger.Info("Dead letter queue cleared",
		zap.Int("items_cleared", count),
	)

	return count
}

// Remove removes a specific item from the DLQ by attempt ID
func (dlq *DeadLetterQueue) Remove(attemptID uuid.UUID) bool {
	dlq.mu.Lock()
	defer dlq.mu.Unlock()

	for i, item := range dlq.items {
		if item.AttemptID == attemptID {
			// Remove item by replacing with last element and truncating
			dlq.items[i] = dlq.items[len(dlq.items)-1]
			dlq.items = dlq.items[:len(dlq.items)-1]

			dlq.logger.Info("Item removed from dead letter queue",
				zap.String("trade_id", item.Trade.ID.String()),
				zap.String("attempt_id", attemptID.String()),
			)

			return true
		}
	}

	return false
}
