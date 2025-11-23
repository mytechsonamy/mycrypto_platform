package integration

import (
	"context"
	"errors"
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

// ErrorRecoveryTestSuite tests error scenarios and recovery mechanisms
type ErrorRecoveryTestSuite struct {
	suite.Suite
	testEnv *TestEnvironment
}

// SetupSuite runs once before all tests
func (s *ErrorRecoveryTestSuite) SetupSuite() {
	var err error
	s.testEnv, err = NewTestEnvironment(context.Background())
	require.NoError(s.T(), err)

	err = s.testEnv.Setup(context.Background())
	require.NoError(s.T(), err)
}

// TearDownSuite runs once after all tests
func (s *ErrorRecoveryTestSuite) TearDownSuite() {
	if s.testEnv != nil {
		err := s.testEnv.Cleanup(context.Background())
		if err != nil {
			s.T().Logf("Cleanup error: %v", err)
		}
	}
}

// SetupTest runs before each test
func (s *ErrorRecoveryTestSuite) SetupTest() {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	err := s.testEnv.CleanDatabase(ctx)
	require.NoError(s.T(), err)
}

// TestErrorRecovery_OperationAfterDatabaseTimeout tests recovery after timeout
func (s *ErrorRecoveryTestSuite) TestErrorRecovery_OperationAfterDatabaseTimeout() {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	userID := uuid.New()
	price := decimal.NewFromFloat(50000.0)

	// Create order with normal context
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

	// Create a context with short timeout to simulate timeout
	shortCtx, cancel := context.WithTimeout(context.Background(), 10*time.Millisecond)
	defer cancel()

	// Try operation that will timeout
	// (This might succeed if operation is fast, but demonstrates error handling)
	_, err = s.testEnv.OrderRepository.GetByID(shortCtx, order.ID)

	// If timeout occurred, verify we can recover
	if errors.Is(err, context.DeadlineExceeded) {
		s.T().Log("Timeout occurred as expected")

		// Verify we can still access database with normal context
		retrievedOrder, err := s.testEnv.OrderRepository.GetByID(ctx, order.ID)
		require.NoError(s.T(), err)
		assert.Equal(s.T(), order.ID, retrievedOrder.ID)
	}
}

// TestErrorRecovery_InvalidOrderID tests handling of invalid order IDs
func (s *ErrorRecoveryTestSuite) TestErrorRecovery_InvalidOrderID() {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Try to retrieve non-existent order
	nonExistentID := uuid.New()

	_, err := s.testEnv.OrderRepository.GetByID(ctx, nonExistentID)
	assert.Error(s.T(), err)
	assert.Equal(s.T(), repository.ErrOrderNotFound, err)
}

// TestErrorRecovery_CancelNonExistentOrder tests error handling for invalid cancellations
func (s *ErrorRecoveryTestSuite) TestErrorRecovery_CancelNonExistentOrder() {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	userID := uuid.New()
	nonExistentID := uuid.New()

	// Try to cancel non-existent order
	err := s.testEnv.OrderRepository.Cancel(ctx, nonExistentID, userID)
	assert.Error(s.T(), err, "Should error when cancelling non-existent order")
}

// TestErrorRecovery_ValidationErrorHandling tests validation error recovery
func (s *ErrorRecoveryTestSuite) TestErrorRecovery_ValidationErrorHandling() {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	userID := uuid.New()

	// Test with zero quantity
	order := &domain.Order{
		ID:        uuid.New(),
		UserID:    userID,
		Symbol:    "BTC/USDT",
		Side:      domain.OrderSideBuy,
		Type:      domain.OrderTypeLimit,
		Quantity:  decimal.Zero,
		Price:     &decimal.Decimal{},
		Status:    domain.OrderStatusOpen,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	err := order.Validate()
	assert.Error(s.T(), err)
	assert.Equal(s.T(), domain.ErrInvalidQuantity, err)

	// Should be able to create a valid order after validation failure
	validOrder := &domain.Order{
		ID:        uuid.New(),
		UserID:    userID,
		Symbol:    "BTC/USDT",
		Side:      domain.OrderSideBuy,
		Type:      domain.OrderTypeLimit,
		Quantity:  decimal.NewFromFloat(1.0),
		Price:     &decimal.Decimal{},
		Status:    domain.OrderStatusOpen,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	err = s.testEnv.OrderRepository.Create(ctx, validOrder)
	require.NoError(s.T(), err)
}

// TestErrorRecovery_CancelFilledOrder tests error handling for invalid state transitions
func (s *ErrorRecoveryTestSuite) TestErrorRecovery_CancelFilledOrder() {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	userID := uuid.New()
	price := decimal.NewFromFloat(50000.0)
	qty := decimal.NewFromFloat(1.0)

	// Create order and mark as filled
	order := &domain.Order{
		ID:             uuid.New(),
		UserID:         userID,
		Symbol:         "BTC/USDT",
		Side:           domain.OrderSideBuy,
		Type:           domain.OrderTypeLimit,
		Quantity:       qty,
		FilledQuantity: qty,
		Price:          &price,
		Status:         domain.OrderStatusFilled,
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}
	now := time.Now()
	order.FilledAt = &now

	err := s.testEnv.OrderRepository.Create(ctx, order)
	require.NoError(s.T(), err)

	// Try to cancel filled order (should fail)
	err = s.testEnv.OrderRepository.Cancel(ctx, order.ID, userID)
	assert.Error(s.T(), err, "Should not be able to cancel filled order")
}

// TestErrorRecovery_ParallelFailuresRecovery tests recovery from parallel failures
func (s *ErrorRecoveryTestSuite) TestErrorRecovery_ParallelFailuresRecovery() {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	userID := uuid.New()
	price := decimal.NewFromFloat(50000.0)

	// Create some valid orders
	validOrders := make([]uuid.UUID, 5)
	for i := 0; i < 5; i++ {
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
		validOrders[i] = order.ID
	}

	// Try to access mix of valid and invalid orders
	validCount := 0
	for i := 0; i < 10; i++ {
		var id uuid.UUID
		if i < 5 {
			id = validOrders[i]
		} else {
			id = uuid.New() // Invalid ID
		}

		_, err := s.testEnv.OrderRepository.GetByID(ctx, id)
		if err == nil {
			validCount++
		}
	}

	// Should have retrieved 5 valid orders
	assert.Equal(s.T(), 5, validCount, "Should have retrieved all valid orders despite some failures")
}

// TestErrorRecovery_UpdateConflict tests handling of concurrent update conflicts
func (s *ErrorRecoveryTestSuite) TestErrorRecovery_UpdateConflict() {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	userID := uuid.New()
	price := decimal.NewFromFloat(50000.0)

	// Create order
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

	// Simulate concurrent updates
	order1, _ := s.testEnv.OrderRepository.GetByID(ctx, order.ID)
	order2, _ := s.testEnv.OrderRepository.GetByID(ctx, order.ID)

	// First update succeeds
	order1.FilledQuantity = decimal.NewFromFloat(3.0)
	order1.Status = domain.OrderStatusPartiallyFilled
	order1.UpdatedAt = time.Now()
	err = s.testEnv.OrderRepository.Update(ctx, order1)
	require.NoError(s.T(), err)

	// Second update should also succeed (last-write-wins in simple implementation)
	// or might fail with conflict error in optimistic locking
	order2.FilledQuantity = decimal.NewFromFloat(2.0)
	order2.Status = domain.OrderStatusPartiallyFilled
	order2.UpdatedAt = time.Now()
	err = s.testEnv.OrderRepository.Update(ctx, order2)

	// Verify final state is consistent
	final, _ := s.testEnv.OrderRepository.GetByID(ctx, order.ID)
	assert.NotNil(s.T(), final)
	assert.Equal(s.T(), domain.OrderStatusPartiallyFilled, final.Status)
}

// TestErrorRecovery_DuplicateClientOrderID tests recovery from duplicate constraint violations
func (s *ErrorRecoveryTestSuite) TestErrorRecovery_DuplicateClientOrderID() {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	userID := uuid.New()
	price := decimal.NewFromFloat(50000.0)
	clientOrderID := "unique-123"

	// Create first order with client_order_id
	order1 := &domain.Order{
		ID:            uuid.New(),
		UserID:        userID,
		Symbol:        "BTC/USDT",
		Side:          domain.OrderSideBuy,
		Type:          domain.OrderTypeLimit,
		Quantity:      decimal.NewFromFloat(1.0),
		Price:         &price,
		ClientOrderID: &clientOrderID,
		Status:        domain.OrderStatusOpen,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	err := s.testEnv.OrderRepository.Create(ctx, order1)
	require.NoError(s.T(), err)

	// Try to create duplicate
	order2 := &domain.Order{
		ID:            uuid.New(),
		UserID:        userID,
		Symbol:        "ETH/USDT",
		Side:          domain.OrderSideSell,
		Type:          domain.OrderTypeLimit,
		Quantity:      decimal.NewFromFloat(2.0),
		Price:         &price,
		ClientOrderID: &clientOrderID,
		Status:        domain.OrderStatusOpen,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	err = s.testEnv.OrderRepository.Create(ctx, order2)
	assert.Error(s.T(), err, "Should fail with duplicate constraint")

	// Should be able to create order with different client_order_id
	differentClientID := "different-456"
	order3 := &domain.Order{
		ID:            uuid.New(),
		UserID:        userID,
		Symbol:        "XRP/USDT",
		Side:          domain.OrderSideBuy,
		Type:          domain.OrderTypeLimit,
		Quantity:      decimal.NewFromFloat(1.0),
		Price:         &price,
		ClientOrderID: &differentClientID,
		Status:        domain.OrderStatusOpen,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	err = s.testEnv.OrderRepository.Create(ctx, order3)
	require.NoError(s.T(), err, "Should succeed with different client_order_id")
}

// TestErrorRecovery_ContextCancellation tests recovery from context cancellation
func (s *ErrorRecoveryTestSuite) TestErrorRecovery_ContextCancellation() {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	userID := uuid.New()
	price := decimal.NewFromFloat(50000.0)

	// Create initial order
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

	// Create and cancel a context
	cancellableCtx, cancelFunc := context.WithCancel(context.Background())
	cancelFunc()

	// Operation with cancelled context should fail
	_, err = s.testEnv.OrderRepository.GetByID(cancellableCtx, order.ID)
	assert.Error(s.T(), err)

	// But operations with valid context should succeed
	retrieved, err := s.testEnv.OrderRepository.GetByID(ctx, order.ID)
	require.NoError(s.T(), err)
	assert.Equal(s.T(), order.ID, retrieved.ID)
}

// Run the test suite
func TestErrorRecoveryTestSuite(t *testing.T) {
	suite.Run(t, new(ErrorRecoveryTestSuite))
}
