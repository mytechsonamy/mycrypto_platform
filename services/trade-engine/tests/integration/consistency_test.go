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

// DataConsistencyTestSuite tests data consistency and integrity
type DataConsistencyTestSuite struct {
	suite.Suite
	testEnv *TestEnvironment
}

// SetupSuite runs once before all tests
func (s *DataConsistencyTestSuite) SetupSuite() {
	var err error
	s.testEnv, err = NewTestEnvironment(context.Background())
	require.NoError(s.T(), err)

	err = s.testEnv.Setup(context.Background())
	require.NoError(s.T(), err)
}

// TearDownSuite runs once after all tests
func (s *DataConsistencyTestSuite) TearDownSuite() {
	if s.testEnv != nil {
		err := s.testEnv.Cleanup(context.Background())
		if err != nil {
			s.T().Logf("Cleanup error: %v", err)
		}
	}
}

// SetupTest runs before each test
func (s *DataConsistencyTestSuite) SetupTest() {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	err := s.testEnv.CleanDatabase(ctx)
	require.NoError(s.T(), err)
}

// TestConsistency_UniqueConstraints tests that unique constraints are enforced
func (s *DataConsistencyTestSuite) TestConsistency_UniqueConstraints() {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	userID := uuid.New()
	price := decimal.NewFromFloat(50000.0)
	clientOrderID := "unique-order-123"

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

	// Try to create duplicate with same client_order_id
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

	// Should fail due to unique constraint
	err = s.testEnv.OrderRepository.Create(ctx, order2)
	assert.Error(s.T(), err, "Expected unique constraint violation")
}

// TestConsistency_OrderStatusTransitions tests valid order status transitions
func (s *DataConsistencyTestSuite) TestConsistency_OrderStatusTransitions() {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	userID := uuid.New()
	price := decimal.NewFromFloat(50000.0)

	// Create order in PENDING status
	order := &domain.Order{
		ID:        uuid.New(),
		UserID:    userID,
		Symbol:    "BTC/USDT",
		Side:      domain.OrderSideBuy,
		Type:      domain.OrderTypeLimit,
		Quantity:  decimal.NewFromFloat(2.0),
		Price:     &price,
		Status:    domain.OrderStatusPending,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	err := s.testEnv.OrderRepository.Create(ctx, order)
	require.NoError(s.T(), err)

	// Transition: PENDING -> OPEN
	order.Status = domain.OrderStatusOpen
	order.UpdatedAt = time.Now()
	err = s.testEnv.OrderRepository.Update(ctx, order)
	require.NoError(s.T(), err)

	// Transition: OPEN -> PARTIALLY_FILLED
	order.FilledQuantity = decimal.NewFromFloat(0.5)
	order.Status = domain.OrderStatusPartiallyFilled
	order.UpdatedAt = time.Now()
	err = s.testEnv.OrderRepository.Update(ctx, order)
	require.NoError(s.T(), err)

	// Transition: PARTIALLY_FILLED -> FILLED
	order.FilledQuantity = order.Quantity
	order.Status = domain.OrderStatusFilled
	now := time.Now()
	order.FilledAt = &now
	order.UpdatedAt = now
	err = s.testEnv.OrderRepository.Update(ctx, order)
	require.NoError(s.T(), err)

	// Verify final state
	finalOrder, err := s.testEnv.OrderRepository.GetByID(ctx, order.ID)
	require.NoError(s.T(), err)
	assert.Equal(s.T(), domain.OrderStatusFilled, finalOrder.Status)
	assert.True(s.T(), finalOrder.IsFilled())
}

// TestConsistency_FilledQuantityTracking tests filled quantity accuracy
func (s *DataConsistencyTestSuite) TestConsistency_FilledQuantityTracking() {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	userID := uuid.New()
	price := decimal.NewFromFloat(50000.0)
	totalQty := decimal.NewFromFloat(10.0)

	order := &domain.Order{
		ID:        uuid.New(),
		UserID:    userID,
		Symbol:    "BTC/USDT",
		Side:      domain.OrderSideBuy,
		Type:      domain.OrderTypeLimit,
		Quantity:  totalQty,
		Price:     &price,
		Status:    domain.OrderStatusOpen,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	err := s.testEnv.OrderRepository.Create(ctx, order)
	require.NoError(s.T(), err)

	// Simulate multiple partial fills
	fills := []float64{2.0, 3.5, 2.0, 2.5}
	var totalFilled decimal.Decimal

	for _, fillAmount := range fills {
		order, err := s.testEnv.OrderRepository.GetByID(ctx, order.ID)
		require.NoError(s.T(), err)

		fillQty := decimal.NewFromFloat(fillAmount)
		totalFilled = totalFilled.Add(fillQty)
		order.FilledQuantity = totalFilled

		if totalFilled.LessThan(order.Quantity) {
			order.Status = domain.OrderStatusPartiallyFilled
		} else {
			order.Status = domain.OrderStatusFilled
			now := time.Now()
			order.FilledAt = &now
		}

		order.UpdatedAt = time.Now()
		err = s.testEnv.OrderRepository.Update(ctx, order)
		require.NoError(s.T(), err)
	}

	// Verify final filled quantity
	finalOrder, err := s.testEnv.OrderRepository.GetByID(ctx, order.ID)
	require.NoError(s.T(), err)
	assert.Equal(s.T(), totalQty, finalOrder.FilledQuantity)
	assert.Equal(s.T(), domain.OrderStatusFilled, finalOrder.Status)
}

// TestConsistency_RemainingQuantityCalculation tests remaining quantity accuracy
func (s *DataConsistencyTestSuite) TestConsistency_RemainingQuantityCalculation() {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	userID := uuid.New()
	price := decimal.NewFromFloat(50000.0)
	totalQty := decimal.NewFromFloat(100.0)

	order := &domain.Order{
		ID:        uuid.New(),
		UserID:    userID,
		Symbol:    "BTC/USDT",
		Side:      domain.OrderSideBuy,
		Type:      domain.OrderTypeLimit,
		Quantity:  totalQty,
		Price:     &price,
		Status:    domain.OrderStatusOpen,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	err := s.testEnv.OrderRepository.Create(ctx, order)
	require.NoError(s.T(), err)

	// Fill 30 units
	order.FilledQuantity = decimal.NewFromFloat(30.0)
	order.Status = domain.OrderStatusPartiallyFilled
	order.UpdatedAt = time.Now()
	err = s.testEnv.OrderRepository.Update(ctx, order)
	require.NoError(s.T(), err)

	// Verify remaining quantity
	updatedOrder, err := s.testEnv.OrderRepository.GetByID(ctx, order.ID)
	require.NoError(s.T(), err)
	remaining := updatedOrder.RemainingQuantity()
	assert.Equal(s.T(), decimal.NewFromFloat(70.0), remaining)
}

// TestConsistency_TimestampAccuracy tests that timestamps are properly recorded
func (s *DataConsistencyTestSuite) TestConsistency_TimestampAccuracy() {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	userID := uuid.New()
	price := decimal.NewFromFloat(50000.0)

	beforeCreate := time.Now()
	order := &domain.Order{
		ID:        uuid.New(),
		UserID:    userID,
		Symbol:    "BTC/USDT",
		Side:      domain.OrderSideBuy,
		Type:      domain.OrderTypeLimit,
		Quantity:  decimal.NewFromFloat(1.0),
		Price:     &price,
		Status:    domain.OrderStatusOpen,
		CreatedAt: beforeCreate,
		UpdatedAt: beforeCreate,
	}

	err := s.testEnv.OrderRepository.Create(ctx, order)
	require.NoError(s.T(), err)

	// Retrieve and check timestamps
	retrieved, err := s.testEnv.OrderRepository.GetByID(ctx, order.ID)
	require.NoError(s.T(), err)

	assert.False(s.T(), retrieved.CreatedAt.Before(beforeCreate))
	assert.False(s.T(), retrieved.UpdatedAt.Before(beforeCreate))
	assert.Nil(s.T(), retrieved.FilledAt)
	assert.Nil(s.T(), retrieved.CancelledAt)

	// Cancel order
	afterCancel := time.Now()
	err = s.testEnv.OrderRepository.Cancel(ctx, order.ID, userID)
	require.NoError(s.T(), err)

	// Verify cancellation timestamp
	cancelled, err := s.testEnv.OrderRepository.GetByID(ctx, order.ID)
	require.NoError(s.T(), err)
	assert.NotNil(s.T(), cancelled.CancelledAt)
	assert.False(s.T(), cancelled.CancelledAt.Before(afterCancel))
}

// TestConsistency_UserIsolation tests that users cannot see each other's orders
func (s *DataConsistencyTestSuite) TestConsistency_UserIsolation() {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	userID1 := uuid.New()
	userID2 := uuid.New()
	price := decimal.NewFromFloat(50000.0)

	// User 1 creates orders
	for i := 0; i < 3; i++ {
		order := &domain.Order{
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
		}
		err := s.testEnv.OrderRepository.Create(ctx, order)
		require.NoError(s.T(), err)
	}

	// User 2 creates orders
	for i := 0; i < 2; i++ {
		order := &domain.Order{
			ID:        uuid.New(),
			UserID:    userID2,
			Symbol:    "ETH/USDT",
			Side:      domain.OrderSideSell,
			Type:      domain.OrderTypeLimit,
			Quantity:  decimal.NewFromFloat(2.0),
			Price:     &price,
			Status:    domain.OrderStatusOpen,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}
		err := s.testEnv.OrderRepository.Create(ctx, order)
		require.NoError(s.T(), err)
	}

	// User 1 should only see their own orders
	user1Orders, err := s.testEnv.OrderRepository.GetByUserID(ctx, userID1, repository.OrderFilters{})
	require.NoError(s.T(), err)
	assert.Equal(s.T(), 3, len(user1Orders))
	for _, order := range user1Orders {
		assert.Equal(s.T(), userID1, order.UserID)
	}

	// User 2 should only see their own orders
	user2Orders, err := s.testEnv.OrderRepository.GetByUserID(ctx, userID2, repository.OrderFilters{})
	require.NoError(s.T(), err)
	assert.Equal(s.T(), 2, len(user2Orders))
	for _, order := range user2Orders {
		assert.Equal(s.T(), userID2, order.UserID)
	}
}

// TestConsistency_SymbolPartitioning tests symbol-based filtering accuracy
func (s *DataConsistencyTestSuite) TestConsistency_SymbolPartitioning() {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	userID := uuid.New()
	price := decimal.NewFromFloat(50000.0)

	// Create orders for different symbols
	symbols := []string{"BTC/USDT", "ETH/USDT", "XRP/USDT", "BTC/USDT", "ADA/USDT"}

	for _, symbol := range symbols {
		order := &domain.Order{
			ID:        uuid.New(),
			UserID:    userID,
			Symbol:    symbol,
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
	}

	// Test getting active orders by symbol
	btcOrders, err := s.testEnv.OrderRepository.GetActiveOrders(ctx, "BTC/USDT")
	require.NoError(s.T(), err)
	assert.Equal(s.T(), 2, len(btcOrders))
	for _, order := range btcOrders {
		assert.Equal(s.T(), "BTC/USDT", order.Symbol)
		assert.NotEqual(s.T(), domain.OrderStatusFilled, order.Status)
	}

	// Test getting open orders by symbol and side
	side := domain.OrderSideBuy
	buyOrders, err := s.testEnv.OrderRepository.GetOpenOrdersBySymbol(ctx, "ETH/USDT", &side)
	require.NoError(s.T(), err)
	assert.Equal(s.T(), 1, len(buyOrders))
	assert.Equal(s.T(), "ETH/USDT", buyOrders[0].Symbol)
	assert.Equal(s.T(), domain.OrderSideBuy, buyOrders[0].Side)
}

// TestConsistency_CountActiveOrders tests counting user active orders
func (s *DataConsistencyTestSuite) TestConsistency_CountActiveOrders() {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	userID := uuid.New()
	price := decimal.NewFromFloat(50000.0)

	// Create mix of open and filled orders
	for i := 0; i < 5; i++ {
		status := domain.OrderStatusOpen
		if i >= 3 {
			status = domain.OrderStatusFilled
		}

		order := &domain.Order{
			ID:        uuid.New(),
			UserID:    userID,
			Symbol:    "BTC/USDT",
			Side:      domain.OrderSideBuy,
			Type:      domain.OrderTypeLimit,
			Quantity:  decimal.NewFromFloat(1.0),
			Price:     &price,
			Status:    status,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}

		if status == domain.OrderStatusFilled {
			order.FilledQuantity = order.Quantity
		}

		err := s.testEnv.OrderRepository.Create(ctx, order)
		require.NoError(s.T(), err)
	}

	// Count active orders (should be 3: OPEN + PARTIALLY_FILLED, not FILLED)
	activeCount, err := s.testEnv.OrderRepository.CountUserActiveOrders(ctx, userID)
	require.NoError(s.T(), err)
	assert.Equal(s.T(), int64(3), activeCount)
}

// Run the test suite
func TestDataConsistencyTestSuite(t *testing.T) {
	suite.Run(t, new(DataConsistencyTestSuite))
}
