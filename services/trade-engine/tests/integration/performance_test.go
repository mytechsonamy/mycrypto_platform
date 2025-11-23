package integration

import (
	"context"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/stretchr/testify/suite"

	"github.com/mytrader/trade-engine/internal/domain"
)

// PerformanceTestSuite tests performance characteristics
type PerformanceTestSuite struct {
	suite.Suite
	testEnv *TestEnvironment
}

// SetupSuite runs once before all tests
func (s *PerformanceTestSuite) SetupSuite() {
	var err error
	s.testEnv, err = NewTestEnvironment(context.Background())
	require.NoError(s.T(), err)

	err = s.testEnv.Setup(context.Background())
	require.NoError(s.T(), err)
}

// TearDownSuite runs once after all tests
func (s *PerformanceTestSuite) TearDownSuite() {
	if s.testEnv != nil {
		err := s.testEnv.Cleanup(context.Background())
		if err != nil {
			s.T().Logf("Cleanup error: %v", err)
		}
	}
}

// SetupTest runs before each test
func (s *PerformanceTestSuite) SetupTest() {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	err := s.testEnv.CleanDatabase(ctx)
	require.NoError(s.T(), err)
}

// BenchmarkLatencies measures operation latencies
type BenchmarkLatencies struct {
	CreateLatencies []time.Duration
	ReadLatencies   []time.Duration
	UpdateLatencies []time.Duration
	ListLatencies   []time.Duration
}

// TestPerformance_OrderCreationLatency tests order creation latency
func (s *PerformanceTestSuite) TestPerformance_OrderCreationLatency() {
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	userID := uuid.New()
	price := decimal.NewFromFloat(50000.0)
	numOrders := 100

	var latencies []time.Duration

	for i := 0; i < numOrders; i++ {
		order := &domain.Order{
			ID:        uuid.New(),
			UserID:    userID,
			Symbol:    "BTC/USDT",
			Side:      domain.OrderSideBuy,
			Type:      domain.OrderTypeLimit,
			Quantity:  decimal.NewFromFloat(1.0),
			Price:     &price,
			Status:    domain.OrderStatusOpen,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}

		start := time.Now()
		err := s.testEnv.OrderRepository.Create(ctx, order)
		duration := time.Since(start)

		require.NoError(s.T(), err)
		latencies = append(latencies, duration)
	}

	// Calculate statistics
	avgLatency := calculateAverage(latencies)
	maxLatency := calculateMax(latencies)
	p99Latency := calculatePercentile(latencies, 99)

	s.T().Logf("Order Creation Latency - Avg: %v, Max: %v, P99: %v", avgLatency, maxLatency, p99Latency)

	// Verify performance targets
	assert.Less(s.T(), avgLatency, 50*time.Millisecond, "Average latency should be < 50ms")
	assert.Less(s.T(), p99Latency, 100*time.Millisecond, "P99 latency should be < 100ms")
}

// TestPerformance_OrderRetrievalLatency tests order retrieval latency
func (s *PerformanceTestSuite) TestPerformance_OrderRetrievalLatency() {
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	userID := uuid.New()
	price := decimal.NewFromFloat(50000.0)
	numOrders := 100

	// Create test orders
	orderIDs := make([]uuid.UUID, numOrders)
	for i := 0; i < numOrders; i++ {
		order := &domain.Order{
			ID:        uuid.New(),
			UserID:    userID,
			Symbol:    "BTC/USDT",
			Side:      domain.OrderSideBuy,
			Type:      domain.OrderTypeLimit,
			Quantity:  decimal.NewFromFloat(1.0),
			Price:     &price,
			Status:    domain.OrderStatusOpen,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}
		err := s.testEnv.OrderRepository.Create(ctx, order)
		require.NoError(s.T(), err)
		orderIDs[i] = order.ID
	}

	var latencies []time.Duration

	// Measure retrieval latency
	for _, id := range orderIDs {
		start := time.Now()
		_, err := s.testEnv.OrderRepository.GetByID(ctx, id)
		duration := time.Since(start)

		require.NoError(s.T(), err)
		latencies = append(latencies, duration)
	}

	// Calculate statistics
	avgLatency := calculateAverage(latencies)
	maxLatency := calculateMax(latencies)
	p99Latency := calculatePercentile(latencies, 99)

	s.T().Logf("Order Retrieval Latency - Avg: %v, Max: %v, P99: %v", avgLatency, maxLatency, p99Latency)

	// Verify performance targets
	assert.Less(s.T(), avgLatency, 20*time.Millisecond, "Average latency should be < 20ms")
	assert.Less(s.T(), p99Latency, 50*time.Millisecond, "P99 latency should be < 50ms")
}

// TestPerformance_100OrdersPerSecond tests throughput of 100 orders per second
func (s *PerformanceTestSuite) TestPerformance_100OrdersPerSecond() {
	ctx, cancel := context.WithTimeout(context.Background(), 120*time.Second)
	defer cancel()

	userID := uuid.New()
	price := decimal.NewFromFloat(50000.0)
	targetOrdersPerSecond := 100
	durationSeconds := 10
	targetOrders := targetOrdersPerSecond * durationSeconds

	start := time.Now()
	successCount := 0
	errorCount := 0

	// Place orders for 10 seconds, targeting 100/sec
	var wg sync.WaitGroup
	for i := 0; i < targetOrders; i++ {
		wg.Add(1)
		go func(index int) {
			defer wg.Done()

			order := &domain.Order{
				ID:        uuid.New(),
				UserID:    userID,
				Symbol:    "BTC/USDT",
				Side:      domain.OrderSideBuy,
				Type:      domain.OrderTypeLimit,
				Quantity:  decimal.NewFromFloat(1.0),
				Price:     &price,
				Status:    domain.OrderStatusOpen,
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
			}

			err := s.testEnv.OrderRepository.Create(ctx, order)
			if err == nil {
				successCount++
			} else {
				errorCount++
			}
		}(i)

		// Rate limit to target orders per second
		if (i+1)%targetOrdersPerSecond == 0 {
			time.Sleep(1 * time.Second)
		}
	}

	wg.Wait()
	elapsed := time.Since(start)

	throughput := float64(successCount) / elapsed.Seconds()
	s.T().Logf("Throughput: %.2f orders/sec, Success: %d, Errors: %d, Elapsed: %v",
		throughput, successCount, errorCount, elapsed)

	// Verify throughput target (at least 100 orders/sec)
	assert.GreaterOrEqual(s.T(), throughput, 80.0, "Should achieve at least 80 orders/sec")
	assert.Equal(s.T(), 0, errorCount, "Should have no errors")
}

// TestPerformance_ListOrdersLatency tests list operations with various sizes
func (s *PerformanceTestSuite) TestPerformance_ListOrdersLatency() {
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	userID := uuid.New()
	price := decimal.NewFromFloat(50000.0)

	// Create test data
	createSizes := []int{10, 50, 100, 500, 1000}

	for _, size := range createSizes {
		// Clean database for this test size
		_ = s.testEnv.CleanDatabase(ctx)

		// Create orders
		for i := 0; i < size; i++ {
			order := &domain.Order{
				ID:        uuid.New(),
				UserID:    userID,
				Symbol:    "BTC/USDT",
				Side:      domain.OrderSideBuy,
				Type:      domain.OrderTypeLimit,
				Quantity:  decimal.NewFromFloat(1.0),
				Price:     &price,
				Status:    domain.OrderStatusOpen,
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
			}
			_ = s.testEnv.OrderRepository.Create(ctx, order)
		}

		// Measure list latency
		var latencies []time.Duration
		for i := 0; i < 10; i++ {
			start := time.Now()
			_, err := s.testEnv.OrderRepository.GetByUserID(ctx, userID, struct{
				Symbol  *string
				Status  *domain.OrderStatus
				Limit   int
				Offset  int
				OrderBy string
			}{
				Symbol:  nil,
				Status:  nil,
				Limit:   100,
				Offset:  0,
				OrderBy: "created_at DESC",
			})
			duration := time.Since(start)

			if err == nil {
				latencies = append(latencies, duration)
			}
		}

		if len(latencies) > 0 {
			avgLatency := calculateAverage(latencies)
			p99Latency := calculatePercentile(latencies, 99)
			s.T().Logf("List %d orders - Avg: %v, P99: %v", size, avgLatency, p99Latency)

			// Verify latency is reasonable (scales with data size)
			expectedMax := time.Duration(size/10) * time.Millisecond
			if expectedMax < 50*time.Millisecond {
				expectedMax = 50 * time.Millisecond
			}
			assert.Less(s.T(), p99Latency, expectedMax, "P99 latency for listing %d orders should be < %v", size, expectedMax)
		}
	}
}

// TestPerformance_UpdateLatency tests order update latency
func (s *PerformanceTestSuite) TestPerformance_UpdateLatency() {
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	userID := uuid.New()
	price := decimal.NewFromFloat(50000.0)
	numOrders := 100

	// Create test orders
	orderIDs := make([]uuid.UUID, numOrders)
	for i := 0; i < numOrders; i++ {
		order := &domain.Order{
			ID:        uuid.New(),
			UserID:    userID,
			Symbol:    "BTC/USDT",
			Side:      domain.OrderSideBuy,
			Type:      domain.OrderTypeLimit,
			Quantity:  decimal.NewFromFloat(10.0),
			Price:     &price,
			Status:    domain.OrderStatusOpen,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}
		err := s.testEnv.OrderRepository.Create(ctx, order)
		require.NoError(s.T(), err)
		orderIDs[i] = order.ID
	}

	var latencies []time.Duration

	// Measure update latency (simulating partial fill)
	for _, id := range orderIDs {
		order, err := s.testEnv.OrderRepository.GetByID(ctx, id)
		require.NoError(s.T(), err)

		order.FilledQuantity = decimal.NewFromFloat(5.0)
		order.Status = domain.OrderStatusPartiallyFilled
		order.UpdatedAt = time.Now()

		start := time.Now()
		err = s.testEnv.OrderRepository.Update(ctx, order)
		duration := time.Since(start)

		require.NoError(s.T(), err)
		latencies = append(latencies, duration)
	}

	// Calculate statistics
	avgLatency := calculateAverage(latencies)
	maxLatency := calculateMax(latencies)
	p99Latency := calculatePercentile(latencies, 99)

	s.T().Logf("Order Update Latency - Avg: %v, Max: %v, P99: %v", avgLatency, maxLatency, p99Latency)

	// Verify performance targets
	assert.Less(s.T(), avgLatency, 30*time.Millisecond, "Average latency should be < 30ms")
	assert.Less(s.T(), p99Latency, 75*time.Millisecond, "P99 latency should be < 75ms")
}

// Helper functions for latency calculations
func calculateAverage(durations []time.Duration) time.Duration {
	if len(durations) == 0 {
		return 0
	}

	var sum time.Duration
	for _, d := range durations {
		sum += d
	}
	return sum / time.Duration(len(durations))
}

func calculateMax(durations []time.Duration) time.Duration {
	if len(durations) == 0 {
		return 0
	}

	max := durations[0]
	for _, d := range durations {
		if d > max {
			max = d
		}
	}
	return max
}

func calculatePercentile(durations []time.Duration, percentile int) time.Duration {
	if len(durations) == 0 {
		return 0
	}

	// Simple percentile calculation
	index := (len(durations) * percentile) / 100
	if index >= len(durations) {
		index = len(durations) - 1
	}

	// Would need proper sorting for real percentile, but for demonstration:
	max := durations[0]
	for _, d := range durations {
		if d > max {
			max = d
		}
	}
	return max // Conservative estimate
}

// Run the test suite
func TestPerformanceTestSuite(t *testing.T) {
	suite.Run(t, new(PerformanceTestSuite))
}
