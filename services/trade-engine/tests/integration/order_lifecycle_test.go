package integration

import (
	"context"
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

// OrderLifecycleTestSuite tests the complete order lifecycle with real database
type OrderLifecycleTestSuite struct {
	suite.Suite
	testEnv *TestEnvironment
}

// SetupSuite runs once before all tests
func (s *OrderLifecycleTestSuite) SetupSuite() {
	var err error
	s.testEnv, err = NewTestEnvironment(context.Background())
	require.NoError(s.T(), err, "Failed to create test environment")

	err = s.testEnv.Setup(context.Background())
	require.NoError(s.T(), err, "Failed to setup test environment")
}

// TearDownSuite runs once after all tests
func (s *OrderLifecycleTestSuite) TearDownSuite() {
	if s.testEnv != nil {
		err := s.testEnv.Cleanup(context.Background())
		if err != nil {
			s.T().Logf("Failed to cleanup test environment: %v", err)
		}
	}
}

// SetupTest runs before each test
func (s *OrderLifecycleTestSuite) SetupTest() {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	err := s.testEnv.CleanDatabase(ctx)
	require.NoError(s.T(), err, "Failed to clean database before test")
}

// TestOrderLifecycle_PlaceLimitOrder_Success tests the complete lifecycle of placing a limit order
func (s *OrderLifecycleTestSuite) TestOrderLifecycle_PlaceLimitOrder_Success() {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	userID := uuid.New()
	price, err := decimal.NewFromString("50000.00000000")
	require.NoError(s.T(), err)
	quantity, err := decimal.NewFromString("1.50000000")
	require.NoError(s.T(), err)

	// Step 1: Place order
	order := &domain.Order{
		ID:        uuid.New(),
		UserID:    userID,
		Symbol:    "BTC/USDT",
		Side:      domain.OrderSideBuy,
		Type:      domain.OrderTypeLimit,
		Quantity:  quantity,
		Price:     &price,
		Status:    domain.OrderStatusPending,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	orderCreateErr := s.testEnv.OrderRepository.Create(ctx, order)
	require.NoError(s.T(), orderCreateErr, "Failed to create order")
	assert.NotEqual(s.T(), uuid.Nil, order.ID)

	// Step 2: Verify order in database
	dbOrder, err := s.testEnv.OrderRepository.GetByID(ctx, order.ID)
	require.NoError(s.T(), err, "Failed to retrieve order from database")
	assert.Equal(s.T(), userID, dbOrder.UserID)
	assert.Equal(s.T(), "BTC/USDT", dbOrder.Symbol)
	assert.Equal(s.T(), domain.OrderSideBuy, dbOrder.Side)
	assert.True(s.T(), dbOrder.Quantity.Equal(quantity), "Quantity should match")
	assert.True(s.T(), dbOrder.FilledQuantity.Equal(decimal.Zero), "FilledQuantity should be zero")
	assert.Equal(s.T(), domain.OrderStatusPending, dbOrder.Status)

	// Step 3: Simulate partial fill
	filledQty := decimal.NewFromFloat(0.5)
	dbOrder.FilledQuantity = filledQty
	dbOrder.Status = domain.OrderStatusPartiallyFilled
	dbOrder.UpdatedAt = time.Now()
	err = s.testEnv.OrderRepository.Update(ctx, dbOrder)
	require.NoError(s.T(), err, "Failed to update order with partial fill")

	// Step 4: Verify partial fill state
	updatedOrder, err := s.testEnv.OrderRepository.GetByID(ctx, order.ID)
	require.NoError(s.T(), err, "Failed to retrieve updated order")
	assert.Equal(s.T(), domain.OrderStatusPartiallyFilled, updatedOrder.Status)
	assert.Equal(s.T(), filledQty, updatedOrder.FilledQuantity)
	assert.Equal(s.T(), quantity.Sub(filledQty), updatedOrder.RemainingQuantity())

	// Step 5: Complete fill
	updatedOrder.FilledQuantity = quantity
	updatedOrder.Status = domain.OrderStatusFilled
	now := time.Now()
	updatedOrder.FilledAt = &now
	updatedOrder.UpdatedAt = now
	err = s.testEnv.OrderRepository.Update(ctx, updatedOrder)
	require.NoError(s.T(), err, "Failed to update order to filled")

	// Step 6: Verify final state
	finalOrder, err := s.testEnv.OrderRepository.GetByID(ctx, order.ID)
	require.NoError(s.T(), err, "Failed to retrieve final order")
	assert.Equal(s.T(), domain.OrderStatusFilled, finalOrder.Status)
	assert.True(s.T(), finalOrder.IsFilled())
	assert.NotNil(s.T(), finalOrder.FilledAt)
}

// TestOrderLifecycle_CancelOrder_Success tests cancelling an open order
func (s *OrderLifecycleTestSuite) TestOrderLifecycle_CancelOrder_Success() {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	userID := uuid.New()
	price := decimal.NewFromFloat(50000.0)

	// Step 1: Place order
	order := &domain.Order{
		ID:        uuid.New(),
		UserID:    userID,
		Symbol:    "BTC/USDT",
		Side:      domain.OrderSideBuy,
		Type:      domain.OrderTypeLimit,
		Quantity:  decimal.NewFromFloat(1.5),
		Price:     &price,
		Status:    domain.OrderStatusOpen,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	err := s.testEnv.OrderRepository.Create(ctx, order)
	require.NoError(s.T(), err, "Failed to create order")

	// Step 2: Cancel order
	err = s.testEnv.OrderRepository.Cancel(ctx, order.ID, userID)
	require.NoError(s.T(), err, "Failed to cancel order")

	// Step 3: Verify cancelled state
	cancelledOrder, err := s.testEnv.OrderRepository.GetByID(ctx, order.ID)
	require.NoError(s.T(), err, "Failed to retrieve cancelled order")
	assert.Equal(s.T(), domain.OrderStatusCancelled, cancelledOrder.Status)
	assert.NotNil(s.T(), cancelledOrder.CancelledAt)
}

// TestOrderLifecycle_MultipleOrders_FilterBySymbol tests filtering orders by symbol
func (s *OrderLifecycleTestSuite) TestOrderLifecycle_MultipleOrders_FilterBySymbol() {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	userID := uuid.New()
	price := decimal.NewFromFloat(50000.0)

	// Create multiple orders with different symbols
	symbols := []string{"BTC/USDT", "ETH/USDT", "BTC/USDT"}
	for i, symbol := range symbols {
		order := &domain.Order{
			ID:        uuid.New(),
			UserID:    userID,
			Symbol:    symbol,
			Side:      domain.OrderSideBuy,
			Type:      domain.OrderTypeLimit,
			Quantity:  decimal.NewFromFloat(1.0 + float64(i)),
			Price:     &price,
			Status:    domain.OrderStatusOpen,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}
		err := s.testEnv.OrderRepository.Create(ctx, order)
		require.NoError(s.T(), err, "Failed to create order")
	}

	// Test filter by BTC/USDT
	btcSymbol := "BTC/USDT"
	btcOrders, err := s.testEnv.OrderRepository.GetByUserID(ctx, userID, repository.OrderFilters{
		Symbol: &btcSymbol,
	})
	require.NoError(s.T(), err, "Failed to retrieve BTC orders")
	assert.Equal(s.T(), 2, len(btcOrders), "Expected 2 BTC/USDT orders")

	// Test filter by ETH/USDT
	ethSymbol := "ETH/USDT"
	ethOrders, err := s.testEnv.OrderRepository.GetByUserID(ctx, userID, repository.OrderFilters{
		Symbol: &ethSymbol,
	})
	require.NoError(s.T(), err, "Failed to retrieve ETH orders")
	assert.Equal(s.T(), 1, len(ethOrders), "Expected 1 ETH/USDT order")
}

// TestOrderLifecycle_Idempotency_DuplicateClientOrderID tests idempotency with client_order_id
func (s *OrderLifecycleTestSuite) TestOrderLifecycle_Idempotency_DuplicateClientOrderID() {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	userID := uuid.New()
	price := decimal.NewFromFloat(50000.0)
	clientOrderID := "client-order-123"

	// Place order with client_order_id
	order1 := &domain.Order{
		ID:            uuid.New(),
		UserID:        userID,
		Symbol:        "BTC/USDT",
		Side:          domain.OrderSideBuy,
		Type:          domain.OrderTypeLimit,
		Quantity:      decimal.NewFromFloat(1.5),
		Price:         &price,
		ClientOrderID: &clientOrderID,
		Status:        domain.OrderStatusOpen,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	err := s.testEnv.OrderRepository.Create(ctx, order1)
	require.NoError(s.T(), err, "Failed to create first order")

	// Try to place duplicate order with same client_order_id
	order2 := &domain.Order{
		ID:            uuid.New(),
		UserID:        userID,
		Symbol:        "BTC/USDT",
		Side:          domain.OrderSideBuy,
		Type:          domain.OrderTypeLimit,
		Quantity:      decimal.NewFromFloat(2.0), // Different quantity
		Price:         &price,
		ClientOrderID: &clientOrderID,
		Status:        domain.OrderStatusOpen,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	// This should fail due to unique constraint
	err = s.testEnv.OrderRepository.Create(ctx, order2)
	assert.Error(s.T(), err, "Expected error when creating duplicate client_order_id")

	// Verify only one order exists with this client_order_id
	existingOrder, err := s.testEnv.OrderRepository.GetByClientOrderID(ctx, userID, clientOrderID)
	require.NoError(s.T(), err, "Failed to retrieve order by client_order_id")
	assert.Equal(s.T(), order1.ID, existingOrder.ID)
	assert.Equal(s.T(), decimal.NewFromFloat(1.5), existingOrder.Quantity)
}

// TestOrderLifecycle_QueryWithFilters tests querying with multiple filters
func (s *OrderLifecycleTestSuite) TestOrderLifecycle_QueryWithFilters() {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	userID := uuid.New()
	price := decimal.NewFromFloat(50000.0)

	// Create orders with different properties
	symbols := []string{"BTC/USDT", "ETH/USDT", "BTC/USDT"}
	statuses := []domain.OrderStatus{
		domain.OrderStatusOpen,
		domain.OrderStatusFilled,
		domain.OrderStatusOpen,
	}

	for i := 0; i < 3; i++ {
		order := &domain.Order{
			ID:        uuid.New(),
			UserID:    userID,
			Symbol:    symbols[i],
			Side:      domain.OrderSideBuy,
			Type:      domain.OrderTypeLimit,
			Quantity:  decimal.NewFromFloat(1.0),
			Price:     &price,
			Status:    statuses[i],
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}

		if statuses[i] == domain.OrderStatusFilled {
			order.FilledQuantity = order.Quantity
			now := time.Now()
			order.FilledAt = &now
		}

		err := s.testEnv.OrderRepository.Create(ctx, order)
		require.NoError(s.T(), err, "Failed to create order")
	}

	// Test filter by symbol
	btcSymbol := "BTC/USDT"
	btcOrders, err := s.testEnv.OrderRepository.GetByUserID(ctx, userID, repository.OrderFilters{
		Symbol: &btcSymbol,
	})
	require.NoError(s.T(), err)
	assert.Equal(s.T(), 2, len(btcOrders), "Expected 2 BTC/USDT orders")

	// Test filter by status
	openStatus := domain.OrderStatusOpen
	openOrders, err := s.testEnv.OrderRepository.GetByUserID(ctx, userID, repository.OrderFilters{
		Status: &openStatus,
	})
	require.NoError(s.T(), err)
	assert.Equal(s.T(), 2, len(openOrders), "Expected 2 OPEN orders")

	// Test filter by symbol AND status
	btcOpenOrders, err := s.testEnv.OrderRepository.GetByUserID(ctx, userID, repository.OrderFilters{
		Symbol: &btcSymbol,
		Status: &openStatus,
	})
	require.NoError(s.T(), err)
	assert.Equal(s.T(), 2, len(btcOpenOrders), "Expected 2 BTC/USDT OPEN orders")
}

// TestOrderLifecycle_OrderNotFound tests handling of non-existent orders
func (s *OrderLifecycleTestSuite) TestOrderLifecycle_OrderNotFound() {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	nonExistentID := uuid.New()

	_, err := s.testEnv.OrderRepository.GetByID(ctx, nonExistentID)
	assert.Error(s.T(), err, "Expected error when retrieving non-existent order")
	assert.Equal(s.T(), repository.ErrOrderNotFound, err)
}

// TestOrderLifecycle_ValidationError tests order validation
func (s *OrderLifecycleTestSuite) TestOrderLifecycle_ValidationError() {
	userID := uuid.New()

	// Test invalid quantity
	order := &domain.Order{
		ID:        uuid.New(),
		UserID:    userID,
		Symbol:    "BTC/USDT",
		Side:      domain.OrderSideBuy,
		Type:      domain.OrderTypeLimit,
		Quantity:  decimal.Zero, // Invalid: zero quantity
		Price:     &decimal.Decimal{},
		Status:    domain.OrderStatusOpen,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	err := order.Validate()
	assert.Error(s.T(), err, "Expected validation error for zero quantity")
	assert.Equal(s.T(), domain.ErrInvalidQuantity, err)
}

// TestOrderLifecycle_GetActiveOrders tests retrieving active orders for a symbol
func (s *OrderLifecycleTestSuite) TestOrderLifecycle_GetActiveOrders() {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	userID1 := uuid.New()
	userID2 := uuid.New()
	price := decimal.NewFromFloat(50000.0)

	// Create active and inactive orders
	orders := []*domain.Order{
		{
			ID:        uuid.New(),
			UserID:    userID1,
			Symbol:    "BTC/USDT",
			Side:      domain.OrderSideBuy,
			Type:      domain.OrderTypeLimit,
			Quantity:  decimal.NewFromFloat(1.0),
			Price:     &price,
			Status:    domain.OrderStatusOpen,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		{
			ID:        uuid.New(),
			UserID:    userID2,
			Symbol:    "BTC/USDT",
			Side:      domain.OrderSideSell,
			Type:      domain.OrderTypeLimit,
			Quantity:  decimal.NewFromFloat(2.0),
			Price:     &price,
			Status:    domain.OrderStatusOpen,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		{
			ID:        uuid.New(),
			UserID:    userID1,
			Symbol:    "BTC/USDT",
			Side:      domain.OrderSideBuy,
			Type:      domain.OrderTypeLimit,
			Quantity:  decimal.NewFromFloat(1.5),
			Price:     &price,
			Status:    domain.OrderStatusFilled,
			FilledQuantity: decimal.NewFromFloat(1.5),
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
	}

	for _, order := range orders {
		err := s.testEnv.OrderRepository.Create(ctx, order)
		require.NoError(s.T(), err, "Failed to create order")
	}

	// Get active orders for BTC/USDT
	activeOrders, err := s.testEnv.OrderRepository.GetActiveOrders(ctx, "BTC/USDT")
	require.NoError(s.T(), err)

	// Should only include OPEN and PARTIALLY_FILLED, not FILLED
	assert.Equal(s.T(), 2, len(activeOrders), "Expected 2 active orders")
	for _, order := range activeOrders {
		assert.NotEqual(s.T(), domain.OrderStatusFilled, order.Status)
	}
}

// Run the test suite
func TestOrderLifecycleTestSuite(t *testing.T) {
	suite.Run(t, new(OrderLifecycleTestSuite))
}
