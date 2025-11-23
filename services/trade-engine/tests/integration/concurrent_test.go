package integration

import (
	"context"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/stretchr/testify/suite"

	"github.com/mytrader/trade-engine/internal/domain"
	"github.com/mytrader/trade-engine/internal/repository"
)

// ConcurrentOperationsTestSuite tests concurrent operations and race conditions
type ConcurrentOperationsTestSuite struct {
	suite.Suite
	testEnv *TestEnvironment
}

// SetupSuite runs once before all tests
func (s *ConcurrentOperationsTestSuite) SetupSuite() {
	var err error
	s.testEnv, err = NewTestEnvironment(context.Background())
	require.NoError(s.T(), err)

	err = s.testEnv.Setup(context.Background())
	require.NoError(s.T(), err)
}

// TearDownSuite runs once after all tests
func (s *ConcurrentOperationsTestSuite) TearDownSuite() {
	if s.testEnv != nil {
		err := s.testEnv.Cleanup(context.Background())
		if err != nil {
			s.T().Logf("Cleanup error: %v", err)
		}
	}
}

// SetupTest runs before each test
func (s *ConcurrentOperationsTestSuite) SetupTest() {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	err := s.testEnv.CleanDatabase(ctx)
	require.NoError(s.T(), err)
}

// TestConcurrentOrderPlacement tests placing multiple orders simultaneously
func (s *ConcurrentOperationsTestSuite) TestConcurrentOrderPlacement() {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	userID := uuid.New()
	numOrders := 50
	price := decimal.NewFromFloat(50000.0)

	var wg sync.WaitGroup
	successCount := atomic.Int32{}
	errorCount := atomic.Int32{}

	// Place orders concurrently
	for i := 0; i < numOrders; i++ {
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
			if err != nil {
				errorCount.Add(1)
			} else {
				successCount.Add(1)
			}
		}(i)
	}

	wg.Wait()

	// Verify all orders were created successfully
	assert.Equal(s.T(), int32(numOrders), successCount.Load(), "Expected all orders to be created successfully")
	assert.Equal(s.T(), int32(0), errorCount.Load(), "Expected no errors during concurrent creation")

	// Verify all orders exist in database
	orders, err := s.testEnv.OrderRepository.GetByUserID(ctx, userID, repository.OrderFilters{})
	require.NoError(s.T(), err)
	assert.Equal(s.T(), numOrders, len(orders), "Expected all orders to exist in database")

	// Verify no duplicate IDs
	idSet := make(map[uuid.UUID]bool)
	for _, order := range orders {
		assert.False(s.T(), idSet[order.ID], "Found duplicate order ID")
		idSet[order.ID] = true
	}
}

// TestConcurrentOrderUpdates tests updating orders concurrently
func (s *ConcurrentOperationsTestSuite) TestConcurrentOrderUpdates() {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	userID := uuid.New()
	price := decimal.NewFromFloat(50000.0)

	// Create base order
	baseOrder := &domain.Order{
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

	err := s.testEnv.OrderRepository.Create(ctx, baseOrder)
	require.NoError(s.T(), err)

	var wg sync.WaitGroup
	successCount := atomic.Int32{}
	errorCount := atomic.Int32{}

	// Update order concurrently (simulate partial fills)
	for i := 0; i < 10; i++ {
		wg.Add(1)
		go func(index int) {
			defer wg.Done()

			// Fetch order
			order, err := s.testEnv.OrderRepository.GetByID(ctx, baseOrder.ID)
			if err != nil {
				errorCount.Add(1)
				return
			}

			// Simulate partial fill
			fillQty := decimal.NewFromFloat(0.1)
			order.FilledQuantity = order.FilledQuantity.Add(fillQty)
			if order.FilledQuantity.GreaterThan(order.Quantity) {
				order.FilledQuantity = order.Quantity
			}

			// Update order
			order.UpdatedAt = time.Now()
			if !order.IsFilled() {
				order.Status = domain.OrderStatusPartiallyFilled
			} else {
				order.Status = domain.OrderStatusFilled
				now := time.Now()
				order.FilledAt = &now
			}

			err = s.testEnv.OrderRepository.Update(ctx, order)
			if err != nil {
				errorCount.Add(1)
			} else {
				successCount.Add(1)
			}
		}(i)
	}

	wg.Wait()

	// Verify final state
	finalOrder, err := s.testEnv.OrderRepository.GetByID(ctx, baseOrder.ID)
	require.NoError(s.T(), err)

	// Should be either partially filled or fully filled
	assert.True(s.T(), finalOrder.Status == domain.OrderStatusPartiallyFilled ||
		finalOrder.Status == domain.OrderStatusFilled,
		"Order should be partially or fully filled after concurrent updates")
}

// TestConcurrentReadsAndWrites tests concurrent reads and writes to different orders
func (s *ConcurrentOperationsTestSuite) TestConcurrentReadsAndWrites() {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	userID := uuid.New()
	numOrders := 20
	price := decimal.NewFromFloat(50000.0)

	// Create initial orders
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

	var wg sync.WaitGroup
	readCount := atomic.Int32{}
	writeCount := atomic.Int32{}
	errorCount := atomic.Int32{}

	// Concurrent reads and writes
	for i := 0; i < numOrders; i++ {
		// Reader
		wg.Add(1)
		go func(index int) {
			defer wg.Done()

			_, err := s.testEnv.OrderRepository.GetByID(ctx, orderIDs[index])
			if err != nil {
				errorCount.Add(1)
			} else {
				readCount.Add(1)
			}
		}(i)

		// Writer
		wg.Add(1)
		go func(index int) {
			defer wg.Done()

			order, err := s.testEnv.OrderRepository.GetByID(ctx, orderIDs[index])
			if err != nil {
				errorCount.Add(1)
				return
			}

			// Update price (simulate price update)
			newPrice := decimal.NewFromFloat(51000.0 + float64(index))
			order.Price = &newPrice
			order.UpdatedAt = time.Now()

			err = s.testEnv.OrderRepository.Update(ctx, order)
			if err != nil {
				errorCount.Add(1)
			} else {
				writeCount.Add(1)
			}
		}(i)
	}

	wg.Wait()

	// Verify results
	assert.Equal(s.T(), int32(numOrders), readCount.Load())
	assert.Equal(s.T(), int32(numOrders), writeCount.Load())
	assert.Equal(s.T(), int32(0), errorCount.Load())
}

// TestConcurrentCancellations tests cancelling multiple orders concurrently
func (s *ConcurrentOperationsTestSuite) TestConcurrentCancellations() {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	userID := uuid.New()
	numOrders := 30
	price := decimal.NewFromFloat(50000.0)

	// Create orders to cancel
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

	var wg sync.WaitGroup
	successCount := atomic.Int32{}
	errorCount := atomic.Int32{}

	// Cancel orders concurrently
	for i := 0; i < numOrders; i++ {
		wg.Add(1)
		go func(index int) {
			defer wg.Done()

			err := s.testEnv.OrderRepository.Cancel(ctx, orderIDs[index], userID)
			if err != nil {
				errorCount.Add(1)
			} else {
				successCount.Add(1)
			}
		}(i)
	}

	wg.Wait()

	// Verify all cancellations were successful
	assert.Equal(s.T(), int32(numOrders), successCount.Load())
	assert.Equal(s.T(), int32(0), errorCount.Load())

	// Verify all orders are cancelled
	orders, err := s.testEnv.OrderRepository.GetByUserID(ctx, userID, repository.OrderFilters{})
	require.NoError(s.T(), err)

	for _, order := range orders {
		assert.Equal(s.T(), domain.OrderStatusCancelled, order.Status)
		assert.NotNil(s.T(), order.CancelledAt)
	}
}

// TestNoRaceConditions runs with -race flag to detect race conditions
func (s *ConcurrentOperationsTestSuite) TestNoRaceConditions() {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	userID := uuid.New()
	price := decimal.NewFromFloat(50000.0)

	var wg sync.WaitGroup

	// Concurrent mixed operations
	for i := 0; i < 20; i++ {
		// Create
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
			_ = s.testEnv.OrderRepository.Create(ctx, order)
		}(i)

		// Read
		if i > 0 {
			wg.Add(1)
			go func() {
				defer wg.Done()
				_, _ = s.testEnv.OrderRepository.GetByUserID(ctx, userID, repository.OrderFilters{})
			}()
		}
	}

	wg.Wait()
}

// Run the test suite
func TestConcurrentOperationsTestSuite(t *testing.T) {
	suite.Run(t, new(ConcurrentOperationsTestSuite))
}
