package service

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"

	"github.com/mytrader/trade-engine/internal/domain"
	"github.com/mytrader/trade-engine/internal/repository"
	"github.com/mytrader/trade-engine/pkg/clients/wallet"
)

// OrderService-specific mocks (using different interface than generic test_mocks.go)

// MockOrderRepository implements repository.OrderRepository for tests
type MockOrderRepository struct {
	mock.Mock
}

func (m *MockOrderRepository) Create(ctx context.Context, order *domain.Order) error {
	args := m.Called(ctx, order)
	return args.Error(0)
}

func (m *MockOrderRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.Order, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Order), args.Error(1)
}

func (m *MockOrderRepository) GetByUserID(ctx context.Context, userID uuid.UUID, filters repository.OrderFilters) ([]*domain.Order, error) {
	args := m.Called(ctx, userID, filters)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.Order), args.Error(1)
}

func (m *MockOrderRepository) GetByClientOrderID(ctx context.Context, userID uuid.UUID, clientOrderID string) (*domain.Order, error) {
	args := m.Called(ctx, userID, clientOrderID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Order), args.Error(1)
}

func (m *MockOrderRepository) Update(ctx context.Context, order *domain.Order) error {
	args := m.Called(ctx, order)
	return args.Error(0)
}

func (m *MockOrderRepository) Cancel(ctx context.Context, id uuid.UUID, userID uuid.UUID) error {
	args := m.Called(ctx, id, userID)
	return args.Error(0)
}

func (m *MockOrderRepository) GetActiveOrders(ctx context.Context, symbol string) ([]*domain.Order, error) {
	args := m.Called(ctx, symbol)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.Order), args.Error(1)
}

func (m *MockOrderRepository) GetOpenOrdersBySymbol(ctx context.Context, symbol string, side *domain.OrderSide) ([]*domain.Order, error) {
	args := m.Called(ctx, symbol, side)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.Order), args.Error(1)
}

func (m *MockOrderRepository) CountUserActiveOrders(ctx context.Context, userID uuid.UUID) (int64, error) {
	args := m.Called(ctx, userID)
	return args.Get(0).(int64), args.Error(1)
}

type MockWalletClient struct {
	mock.Mock
}

func (m *MockWalletClient) GetBalance(userID uuid.UUID, currency string) (*wallet.BalanceResponse, error) {
	args := m.Called(userID, currency)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*wallet.BalanceResponse), args.Error(1)
}

func (m *MockWalletClient) ReserveBalance(req *wallet.ReserveBalanceRequest) (*wallet.ReserveBalanceResponse, error) {
	args := m.Called(req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*wallet.ReserveBalanceResponse), args.Error(1)
}

func (m *MockWalletClient) ReleaseBalance(req *wallet.ReleaseBalanceRequest) (*wallet.ReleaseBalanceResponse, error) {
	args := m.Called(req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*wallet.ReleaseBalanceResponse), args.Error(1)
}

func (m *MockWalletClient) SettleTrade(req *wallet.SettleTradeRequest) (*wallet.SettleTradeResponse, error) {
	args := m.Called(req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*wallet.SettleTradeResponse), args.Error(1)
}

func (m *MockWalletClient) Close() error {
	args := m.Called()
	return args.Error(0)
}

// Test PlaceOrder - Happy Path
func TestOrderService_PlaceOrder_Success(t *testing.T) {
	// Setup
	mockRepo := new(MockOrderRepository)
	mockWallet := new(MockWalletClient)
	logger := zap.NewNop()
	svc := NewOrderService(mockRepo, mockWallet, logger)

	ctx := context.Background()
	userID := uuid.New()
	price := decimal.NewFromFloat(50000.0)
	quantity := decimal.NewFromFloat(1.5)

	req := &PlaceOrderRequest{
		UserID:      userID,
		Symbol:      "BTC/USDT",
		Side:        domain.OrderSideBuy,
		Type:        domain.OrderTypeLimit,
		Quantity:    quantity,
		Price:       &price,
		TimeInForce: domain.TimeInForceGTC,
	}

	// Mock wallet reservation success
	mockWallet.On("ReserveBalance", mock.MatchedBy(func(r *wallet.ReserveBalanceRequest) bool {
		return r.UserID == userID && r.Currency == "USDT" && r.Amount.Equal(quantity.Mul(price))
	})).Return(&wallet.ReserveBalanceResponse{
		ReservationID:    uuid.New(),
		Success:          true,
		AvailableBalance: decimal.NewFromFloat(100000),
		ReservedBalance:  decimal.NewFromFloat(75000),
	}, nil)

	// Mock repository GetByClientOrderID (for idempotency check)
	mockRepo.On("GetByClientOrderID", ctx, userID, mock.Anything).Return(
		nil,
		repository.ErrOrderNotFound,
	).Maybe()

	// Mock repository create success
	mockRepo.On("Create", ctx, mock.MatchedBy(func(o *domain.Order) bool {
		return o.UserID == userID && o.Symbol == "BTC/USDT" && o.Status == domain.OrderStatusPending
	})).Return(nil)

	// Mock repository update (for status change to OPEN)
	mockRepo.On("Update", ctx, mock.MatchedBy(func(o *domain.Order) bool {
		return o.Status == domain.OrderStatusOpen
	})).Return(nil)

	// Execute
	createdOrder, err := svc.PlaceOrder(ctx, req)

	// Assert
	require.NoError(t, err)
	assert.NotNil(t, createdOrder)
	assert.Equal(t, domain.OrderStatusOpen, createdOrder.Status)
	assert.True(t, quantity.Equal(createdOrder.Quantity))
	assert.True(t, createdOrder.FilledQuantity.Equal(decimal.Zero) || createdOrder.FilledQuantity.IsZero())
	assert.Equal(t, userID, createdOrder.UserID)
	assert.Equal(t, "BTC/USDT", createdOrder.Symbol)

	// Verify mocks were called
	mockWallet.AssertExpectations(t)
	mockRepo.AssertExpectations(t)
}

// Test PlaceOrder - Insufficient Balance
func TestOrderService_PlaceOrder_InsufficientBalance(t *testing.T) {
	// Setup
	mockRepo := new(MockOrderRepository)
	mockWallet := new(MockWalletClient)
	logger := zap.NewNop()
	svc := NewOrderService(mockRepo, mockWallet, logger)

	ctx := context.Background()
	userID := uuid.New()
	price := decimal.NewFromFloat(50000.0)
	quantity := decimal.NewFromFloat(1.5)

	req := &PlaceOrderRequest{
		UserID:      userID,
		Symbol:      "BTC/USDT",
		Side:        domain.OrderSideBuy,
		Type:        domain.OrderTypeLimit,
		Quantity:    quantity,
		Price:       &price,
		TimeInForce: domain.TimeInForceGTC,
	}

	// Mock wallet reservation failure (insufficient balance)
	mockWallet.On("ReserveBalance", mock.Anything).Return(
		nil,
		wallet.ErrInsufficientBalance,
	)

	// Execute
	createdOrder, err := svc.PlaceOrder(ctx, req)

	// Assert
	assert.Error(t, err)
	assert.Nil(t, createdOrder)
	assert.Equal(t, ErrInsufficientBalance, err)

	// Repository create should NOT be called
	mockRepo.AssertNotCalled(t, "Create")
	mockWallet.AssertExpectations(t)
}

// Test PlaceOrder - Invalid Quantity
func TestOrderService_PlaceOrder_InvalidQuantity(t *testing.T) {
	// Setup
	mockRepo := new(MockOrderRepository)
	mockWallet := new(MockWalletClient)
	logger := zap.NewNop()
	svc := NewOrderService(mockRepo, mockWallet, logger)

	ctx := context.Background()
	userID := uuid.New()
	price := decimal.NewFromFloat(50000.0)

	testCases := []struct {
		name     string
		quantity decimal.Decimal
		wantErr  error
	}{
		{
			name:     "Zero quantity",
			quantity: decimal.Zero,
			wantErr:  domain.ErrInvalidQuantity,
		},
		{
			name:     "Negative quantity",
			quantity: decimal.NewFromFloat(-1.5),
			wantErr:  domain.ErrInvalidQuantity,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			req := &PlaceOrderRequest{
				UserID:      userID,
				Symbol:      "BTC/USDT",
				Side:        domain.OrderSideBuy,
				Type:        domain.OrderTypeLimit,
				Quantity:    tc.quantity,
				Price:       &price,
				TimeInForce: domain.TimeInForceGTC,
			}

			// Execute
			createdOrder, err := svc.PlaceOrder(ctx, req)

			// Assert
			assert.Error(t, err)
			assert.Nil(t, createdOrder)
			assert.True(t, errors.Is(err, ErrInvalidOrderRequest))

			// No external calls should be made
			mockWallet.AssertNotCalled(t, "ReserveBalance")
			mockRepo.AssertNotCalled(t, "Create")
		})
	}
}

// Test PlaceOrder - Invalid Price
func TestOrderService_PlaceOrder_InvalidPrice(t *testing.T) {
	// Setup
	mockRepo := new(MockOrderRepository)
	mockWallet := new(MockWalletClient)
	logger := zap.NewNop()
	svc := NewOrderService(mockRepo, mockWallet, logger)

	ctx := context.Background()
	userID := uuid.New()
	quantity := decimal.NewFromFloat(1.5)

	testCases := []struct {
		name    string
		price   *decimal.Decimal
		wantErr error
	}{
		{
			name:    "No price for limit order",
			price:   nil,
			wantErr: domain.ErrLimitOrderNoPrice,
		},
		{
			name:    "Zero price",
			price:   ptrDecimal(decimal.Zero),
			wantErr: domain.ErrLimitOrderNoPrice,
		},
		{
			name:    "Negative price",
			price:   ptrDecimal(decimal.NewFromFloat(-100)),
			wantErr: domain.ErrLimitOrderNoPrice,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			req := &PlaceOrderRequest{
				UserID:      userID,
				Symbol:      "BTC/USDT",
				Side:        domain.OrderSideBuy,
				Type:        domain.OrderTypeLimit,
				Quantity:    quantity,
				Price:       tc.price,
				TimeInForce: domain.TimeInForceGTC,
			}

			// Execute
			createdOrder, err := svc.PlaceOrder(ctx, req)

			// Assert
			assert.Error(t, err)
			assert.Nil(t, createdOrder)
			assert.True(t, errors.Is(err, ErrInvalidOrderRequest))

			// No external calls should be made
			mockWallet.AssertNotCalled(t, "ReserveBalance")
			mockRepo.AssertNotCalled(t, "Create")
		})
	}
}

// Test PlaceOrder - Wallet Service Down
func TestOrderService_PlaceOrder_WalletServiceDown(t *testing.T) {
	// Setup
	mockRepo := new(MockOrderRepository)
	mockWallet := new(MockWalletClient)
	logger := zap.NewNop()
	svc := NewOrderService(mockRepo, mockWallet, logger)

	ctx := context.Background()
	userID := uuid.New()
	price := decimal.NewFromFloat(50000.0)
	quantity := decimal.NewFromFloat(1.5)

	req := &PlaceOrderRequest{
		UserID:      userID,
		Symbol:      "BTC/USDT",
		Side:        domain.OrderSideBuy,
		Type:        domain.OrderTypeLimit,
		Quantity:    quantity,
		Price:       &price,
		TimeInForce: domain.TimeInForceGTC,
	}

	// Mock wallet service unavailable
	mockWallet.On("ReserveBalance", mock.Anything).Return(
		nil,
		wallet.ErrWalletServiceDown,
	)

	// Execute
	createdOrder, err := svc.PlaceOrder(ctx, req)

	// Assert
	assert.Error(t, err)
	assert.Nil(t, createdOrder)
	assert.Equal(t, ErrWalletServiceUnavailable, err)

	// Repository create should NOT be called
	mockRepo.AssertNotCalled(t, "Create")
	mockWallet.AssertExpectations(t)
}

// Test PlaceOrder - Circuit Breaker Open
func TestOrderService_PlaceOrder_CircuitBreakerOpen(t *testing.T) {
	// Setup
	mockRepo := new(MockOrderRepository)
	mockWallet := new(MockWalletClient)
	logger := zap.NewNop()
	svc := NewOrderService(mockRepo, mockWallet, logger)

	ctx := context.Background()
	userID := uuid.New()
	price := decimal.NewFromFloat(50000.0)
	quantity := decimal.NewFromFloat(1.5)

	req := &PlaceOrderRequest{
		UserID:      userID,
		Symbol:      "BTC/USDT",
		Side:        domain.OrderSideBuy,
		Type:        domain.OrderTypeLimit,
		Quantity:    quantity,
		Price:       &price,
		TimeInForce: domain.TimeInForceGTC,
	}

	// Mock circuit breaker open
	mockWallet.On("ReserveBalance", mock.Anything).Return(
		nil,
		wallet.ErrCircuitOpen,
	)

	// Execute
	createdOrder, err := svc.PlaceOrder(ctx, req)

	// Assert
	assert.Error(t, err)
	assert.Nil(t, createdOrder)
	assert.Equal(t, ErrWalletServiceUnavailable, err)

	// Repository create should NOT be called
	mockRepo.AssertNotCalled(t, "Create")
	mockWallet.AssertExpectations(t)
}

// Test PlaceOrder - Duplicate Client Order ID
func TestOrderService_PlaceOrder_DuplicateClientOrderID(t *testing.T) {
	// Setup
	mockRepo := new(MockOrderRepository)
	mockWallet := new(MockWalletClient)
	logger := zap.NewNop()
	svc := NewOrderService(mockRepo, mockWallet, logger)

	ctx := context.Background()
	userID := uuid.New()
	price := decimal.NewFromFloat(50000.0)
	quantity := decimal.NewFromFloat(1.5)
	clientOrderID := "client-order-123"

	req := &PlaceOrderRequest{
		UserID:        userID,
		Symbol:        "BTC/USDT",
		Side:          domain.OrderSideBuy,
		Type:          domain.OrderTypeLimit,
		Quantity:      quantity,
		Price:         &price,
		TimeInForce:   domain.TimeInForceGTC,
		ClientOrderID: &clientOrderID,
	}

	existingOrderID := uuid.New()

	// Mock repository returns existing order with same client_order_id
	mockRepo.On("GetByClientOrderID", ctx, userID, clientOrderID).Return(&domain.Order{
		ID:            existingOrderID,
		UserID:        userID,
		Symbol:        "BTC/USDT",
		Side:          domain.OrderSideBuy,
		Type:          domain.OrderTypeLimit,
		Quantity:      quantity,
		Price:         &price,
		ClientOrderID: &clientOrderID,
		Status:        domain.OrderStatusOpen,
	}, nil)

	// Execute
	createdOrder, err := svc.PlaceOrder(ctx, req)

	// Assert
	assert.Error(t, err)
	assert.Nil(t, createdOrder)
	assert.Equal(t, ErrDuplicateClientOrderID, err)

	// Create should NOT be called (idempotency check failed)
	mockRepo.AssertNotCalled(t, "Create")
	mockWallet.AssertNotCalled(t, "ReserveBalance")
}

// Test PlaceOrder - Database Error on Create
func TestOrderService_PlaceOrder_DatabaseError(t *testing.T) {
	// Setup
	mockRepo := new(MockOrderRepository)
	mockWallet := new(MockWalletClient)
	logger := zap.NewNop()
	svc := NewOrderService(mockRepo, mockWallet, logger)

	ctx := context.Background()
	userID := uuid.New()
	price := decimal.NewFromFloat(50000.0)
	quantity := decimal.NewFromFloat(1.5)

	req := &PlaceOrderRequest{
		UserID:      userID,
		Symbol:      "BTC/USDT",
		Side:        domain.OrderSideBuy,
		Type:        domain.OrderTypeLimit,
		Quantity:    quantity,
		Price:       &price,
		TimeInForce: domain.TimeInForceGTC,
	}

	reservationID := uuid.New()

	// Mock wallet reservation success
	mockWallet.On("ReserveBalance", mock.Anything).Return(&wallet.ReserveBalanceResponse{
		ReservationID:    reservationID,
		Success:          true,
		AvailableBalance: decimal.NewFromFloat(100000),
		ReservedBalance:  decimal.NewFromFloat(75000),
	}, nil)

	// Mock repository create failure
	mockRepo.On("Create", ctx, mock.Anything).Return(errors.New("database connection error"))

	// Mock wallet release (rollback)
	mockWallet.On("ReleaseBalance", mock.MatchedBy(func(r *wallet.ReleaseBalanceRequest) bool {
		return r.ReservationID == reservationID && r.Reason == "ORDER_CREATION_FAILED"
	})).Return(&wallet.ReleaseBalanceResponse{
		Success:        true,
		ReleasedAmount: quantity.Mul(price),
	}, nil)

	// Execute
	createdOrder, err := svc.PlaceOrder(ctx, req)

	// Assert
	assert.Error(t, err)
	assert.Nil(t, createdOrder)

	// Verify rollback was called
	mockWallet.AssertExpectations(t)
	mockRepo.AssertExpectations(t)
}

// Test CancelOrder - Success
func TestOrderService_CancelOrder_Success(t *testing.T) {
	// Setup
	mockRepo := new(MockOrderRepository)
	mockWallet := new(MockWalletClient)
	logger := zap.NewNop()
	svc := NewOrderService(mockRepo, mockWallet, logger)

	ctx := context.Background()
	userID := uuid.New()
	orderID := uuid.New()
	reservationID := uuid.New()
	price := decimal.NewFromFloat(50000.0)

	// Mock repository GetByID returns order
	mockRepo.On("GetByID", ctx, orderID).Return(&domain.Order{
		ID:            orderID,
		UserID:        userID,
		Symbol:        "BTC/USDT",
		Side:          domain.OrderSideBuy,
		Type:          domain.OrderTypeLimit,
		Status:        domain.OrderStatusOpen,
		Quantity:      decimal.NewFromFloat(1.5),
		Price:         &price,
		ReservationID: &reservationID,
	}, nil)

	// Mock repository cancel success
	mockRepo.On("Cancel", ctx, orderID, userID).Return(nil)

	// Mock wallet release
	mockWallet.On("ReleaseBalance", mock.MatchedBy(func(r *wallet.ReleaseBalanceRequest) bool {
		return r.ReservationID == reservationID && r.OrderID == orderID
	})).Return(&wallet.ReleaseBalanceResponse{
		Success:        true,
		ReleasedAmount: decimal.NewFromFloat(75000),
	}, nil)

	// Execute
	err := svc.CancelOrder(ctx, orderID, userID)

	// Assert
	require.NoError(t, err)
	mockRepo.AssertExpectations(t)
	mockWallet.AssertExpectations(t)
}

// Test CancelOrder - Order Not Found
func TestOrderService_CancelOrder_OrderNotFound(t *testing.T) {
	// Setup
	mockRepo := new(MockOrderRepository)
	mockWallet := new(MockWalletClient)
	logger := zap.NewNop()
	svc := NewOrderService(mockRepo, mockWallet, logger)

	ctx := context.Background()
	userID := uuid.New()
	orderID := uuid.New()

	// Mock repository GetByID returns not found
	mockRepo.On("GetByID", ctx, orderID).Return(nil, repository.ErrOrderNotFound)

	// Execute
	err := svc.CancelOrder(ctx, orderID, userID)

	// Assert
	assert.Error(t, err)
	assert.Equal(t, ErrOrderNotFound, err)
	mockRepo.AssertExpectations(t)
	mockWallet.AssertNotCalled(t, "ReleaseBalance")
}

// Test CancelOrder - Unauthorized
func TestOrderService_CancelOrder_Unauthorized(t *testing.T) {
	// Setup
	mockRepo := new(MockOrderRepository)
	mockWallet := new(MockWalletClient)
	logger := zap.NewNop()
	svc := NewOrderService(mockRepo, mockWallet, logger)

	ctx := context.Background()
	userID := uuid.New()
	differentUserID := uuid.New()
	orderID := uuid.New()
	price := decimal.NewFromFloat(50000.0)

	// Mock repository GetByID returns order with different user ID
	mockRepo.On("GetByID", ctx, orderID).Return(&domain.Order{
		ID:       orderID,
		UserID:   differentUserID,
		Symbol:   "BTC/USDT",
		Side:     domain.OrderSideBuy,
		Type:     domain.OrderTypeLimit,
		Status:   domain.OrderStatusOpen,
		Quantity: decimal.NewFromFloat(1.5),
		Price:    &price,
	}, nil)

	// Execute
	err := svc.CancelOrder(ctx, orderID, userID)

	// Assert
	assert.Error(t, err)
	assert.Equal(t, ErrUnauthorized, err)
	mockRepo.AssertExpectations(t)
	mockRepo.AssertNotCalled(t, "Cancel")
	mockWallet.AssertNotCalled(t, "ReleaseBalance")
}

// Test CancelOrder - Already Filled
func TestOrderService_CancelOrder_AlreadyFilled(t *testing.T) {
	// Setup
	mockRepo := new(MockOrderRepository)
	mockWallet := new(MockWalletClient)
	logger := zap.NewNop()
	svc := NewOrderService(mockRepo, mockWallet, logger)

	ctx := context.Background()
	userID := uuid.New()
	orderID := uuid.New()
	price := decimal.NewFromFloat(50000.0)

	// Mock repository GetByID returns filled order
	mockRepo.On("GetByID", ctx, orderID).Return(&domain.Order{
		ID:       orderID,
		UserID:   userID,
		Symbol:   "BTC/USDT",
		Side:     domain.OrderSideBuy,
		Type:     domain.OrderTypeLimit,
		Status:   domain.OrderStatusFilled,
		Quantity: decimal.NewFromFloat(1.5),
		Price:    &price,
	}, nil)

	// Execute
	err := svc.CancelOrder(ctx, orderID, userID)

	// Assert
	assert.Error(t, err)
	assert.Equal(t, ErrOrderNotCancellable, err)
	mockRepo.AssertExpectations(t)
	mockRepo.AssertNotCalled(t, "Cancel")
	mockWallet.AssertNotCalled(t, "ReleaseBalance")
}

// Test GetOrder - Success
func TestOrderService_GetOrder_Success(t *testing.T) {
	// Setup
	mockRepo := new(MockOrderRepository)
	mockWallet := new(MockWalletClient)
	logger := zap.NewNop()
	svc := NewOrderService(mockRepo, mockWallet, logger)

	ctx := context.Background()
	userID := uuid.New()
	orderID := uuid.New()
	price := decimal.NewFromFloat(50000.0)

	expectedOrder := &domain.Order{
		ID:       orderID,
		UserID:   userID,
		Symbol:   "BTC/USDT",
		Side:     domain.OrderSideBuy,
		Type:     domain.OrderTypeLimit,
		Status:   domain.OrderStatusOpen,
		Quantity: decimal.NewFromFloat(1.5),
		Price:    &price,
	}

	// Mock repository GetByID
	mockRepo.On("GetByID", ctx, orderID).Return(expectedOrder, nil)

	// Execute
	order, err := svc.GetOrder(ctx, orderID, userID)

	// Assert
	require.NoError(t, err)
	assert.NotNil(t, order)
	assert.Equal(t, expectedOrder.ID, order.ID)
	assert.Equal(t, expectedOrder.UserID, order.UserID)
	mockRepo.AssertExpectations(t)
}

// Test GetOrder - Unauthorized
func TestOrderService_GetOrder_Unauthorized(t *testing.T) {
	// Setup
	mockRepo := new(MockOrderRepository)
	mockWallet := new(MockWalletClient)
	logger := zap.NewNop()
	svc := NewOrderService(mockRepo, mockWallet, logger)

	ctx := context.Background()
	userID := uuid.New()
	differentUserID := uuid.New()
	orderID := uuid.New()
	price := decimal.NewFromFloat(50000.0)

	// Mock repository GetByID returns order with different user ID
	mockRepo.On("GetByID", ctx, orderID).Return(&domain.Order{
		ID:       orderID,
		UserID:   differentUserID,
		Symbol:   "BTC/USDT",
		Side:     domain.OrderSideBuy,
		Type:     domain.OrderTypeLimit,
		Status:   domain.OrderStatusOpen,
		Quantity: decimal.NewFromFloat(1.5),
		Price:    &price,
	}, nil)

	// Execute
	order, err := svc.GetOrder(ctx, orderID, userID)

	// Assert
	assert.Error(t, err)
	assert.Nil(t, order)
	assert.Equal(t, ErrUnauthorized, err)
	mockRepo.AssertExpectations(t)
}

// Test GetUserOrders - Success
func TestOrderService_GetUserOrders_Success(t *testing.T) {
	// Setup
	mockRepo := new(MockOrderRepository)
	mockWallet := new(MockWalletClient)
	logger := zap.NewNop()
	svc := NewOrderService(mockRepo, mockWallet, logger)

	ctx := context.Background()
	userID := uuid.New()
	price := decimal.NewFromFloat(50000.0)

	expectedOrders := []*domain.Order{
		{
			ID:       uuid.New(),
			UserID:   userID,
			Symbol:   "BTC/USDT",
			Side:     domain.OrderSideBuy,
			Type:     domain.OrderTypeLimit,
			Status:   domain.OrderStatusOpen,
			Quantity: decimal.NewFromFloat(1.5),
			Price:    &price,
		},
		{
			ID:       uuid.New(),
			UserID:   userID,
			Symbol:   "ETH/USDT",
			Side:     domain.OrderSideSell,
			Type:     domain.OrderTypeLimit,
			Status:   domain.OrderStatusFilled,
			Quantity: decimal.NewFromFloat(2.0),
			Price:    &price,
		},
	}

	filters := repository.OrderFilters{
		Limit: 50,
	}

	// Mock repository GetByUserID
	mockRepo.On("GetByUserID", ctx, userID, filters).Return(expectedOrders, nil)

	// Execute
	orders, err := svc.GetUserOrders(ctx, userID, filters)

	// Assert
	require.NoError(t, err)
	assert.NotNil(t, orders)
	assert.Equal(t, 2, len(orders))
	mockRepo.AssertExpectations(t)
}

// Test GetActiveOrders - Success
func TestOrderService_GetActiveOrders_Success(t *testing.T) {
	// Setup
	mockRepo := new(MockOrderRepository)
	mockWallet := new(MockWalletClient)
	logger := zap.NewNop()
	svc := NewOrderService(mockRepo, mockWallet, logger)

	ctx := context.Background()
	symbol := "BTC/USDT"
	price := decimal.NewFromFloat(50000.0)

	expectedOrders := []*domain.Order{
		{
			ID:       uuid.New(),
			UserID:   uuid.New(),
			Symbol:   symbol,
			Side:     domain.OrderSideBuy,
			Type:     domain.OrderTypeLimit,
			Status:   domain.OrderStatusOpen,
			Quantity: decimal.NewFromFloat(1.5),
			Price:    &price,
		},
	}

	// Mock repository GetActiveOrders
	mockRepo.On("GetActiveOrders", ctx, symbol).Return(expectedOrders, nil)

	// Execute
	orders, err := svc.GetActiveOrders(ctx, symbol)

	// Assert
	require.NoError(t, err)
	assert.NotNil(t, orders)
	assert.Equal(t, 1, len(orders))
	mockRepo.AssertExpectations(t)
}

// Test PlaceOrder - Sell Order (different currency)
func TestOrderService_PlaceOrder_SellOrder(t *testing.T) {
	// Setup
	mockRepo := new(MockOrderRepository)
	mockWallet := new(MockWalletClient)
	logger := zap.NewNop()
	svc := NewOrderService(mockRepo, mockWallet, logger)

	ctx := context.Background()
	userID := uuid.New()
	price := decimal.NewFromFloat(50000.0)
	quantity := decimal.NewFromFloat(1.5)

	req := &PlaceOrderRequest{
		UserID:      userID,
		Symbol:      "BTC/USDT",
		Side:        domain.OrderSideSell,
		Type:        domain.OrderTypeLimit,
		Quantity:    quantity,
		Price:       &price,
		TimeInForce: domain.TimeInForceGTC,
	}

	// Mock wallet reservation success (for sell, reserve BTC)
	mockWallet.On("ReserveBalance", mock.MatchedBy(func(r *wallet.ReserveBalanceRequest) bool {
		return r.UserID == userID && r.Currency == "BTC" && r.Amount.Equal(quantity)
	})).Return(&wallet.ReserveBalanceResponse{
		ReservationID:    uuid.New(),
		Success:          true,
		AvailableBalance: decimal.NewFromFloat(10),
		ReservedBalance:  decimal.NewFromFloat(1.5),
	}, nil)

	// Mock repository operations
	mockRepo.On("Create", ctx, mock.Anything).Return(nil)
	mockRepo.On("Update", ctx, mock.Anything).Return(nil)

	// Execute
	createdOrder, err := svc.PlaceOrder(ctx, req)

	// Assert
	require.NoError(t, err)
	assert.NotNil(t, createdOrder)
	assert.Equal(t, domain.OrderSideSell, createdOrder.Side)
	mockWallet.AssertExpectations(t)
	mockRepo.AssertExpectations(t)
}

// Test PlaceOrder - Market Order (no price validation)
func TestOrderService_PlaceOrder_MarketOrder(t *testing.T) {
	// Setup
	mockRepo := new(MockOrderRepository)
	mockWallet := new(MockWalletClient)
	logger := zap.NewNop()
	svc := NewOrderService(mockRepo, mockWallet, logger)

	ctx := context.Background()
	userID := uuid.New()
	quantity := decimal.NewFromFloat(1.5)

	req := &PlaceOrderRequest{
		UserID:      userID,
		Symbol:      "BTC/USDT",
		Side:        domain.OrderSideSell,
		Type:        domain.OrderTypeMarket,
		Quantity:    quantity,
		TimeInForce: domain.TimeInForceIOC,
	}

	// Mock wallet reservation (for sell, reserve BTC)
	mockWallet.On("ReserveBalance", mock.Anything).Return(&wallet.ReserveBalanceResponse{
		ReservationID:    uuid.New(),
		Success:          true,
		AvailableBalance: decimal.NewFromFloat(10),
		ReservedBalance:  decimal.NewFromFloat(1.5),
	}, nil)

	// Mock repository operations
	mockRepo.On("Create", ctx, mock.Anything).Return(nil)
	mockRepo.On("Update", ctx, mock.Anything).Return(nil)

	// Execute
	createdOrder, err := svc.PlaceOrder(ctx, req)

	// Assert
	require.NoError(t, err)
	assert.NotNil(t, createdOrder)
	assert.Equal(t, domain.OrderTypeMarket, createdOrder.Type)
	assert.Nil(t, createdOrder.Price)
	mockWallet.AssertExpectations(t)
	mockRepo.AssertExpectations(t)
}

// Helper functions
func ptrDecimal(d decimal.Decimal) *decimal.Decimal {
	return &d
}
