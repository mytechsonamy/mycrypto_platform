// ============================================================================
// TEST MOCKS - Shared mock implementations for service tests
// ============================================================================
// This file consolidates mock implementations used across multiple test files
// to avoid duplication and maintain consistency
// ============================================================================

package service

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/mock"

	"github.com/mytrader/trade-engine/internal/domain"
	"github.com/mytrader/trade-engine/internal/repository"
)

// MockTradeRepository is a mock implementation of TradeRepository for testing
type MockTradeRepository struct {
	mock.Mock
}

func (m *MockTradeRepository) Create(ctx context.Context, trade *domain.Trade) error {
	args := m.Called(ctx, trade)
	return args.Error(0)
}

func (m *MockTradeRepository) CreateBatch(ctx context.Context, trades []*domain.Trade) error {
	args := m.Called(ctx, trades)
	return args.Error(0)
}

func (m *MockTradeRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.Trade, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Trade), args.Error(1)
}

func (m *MockTradeRepository) GetByOrderID(ctx context.Context, orderID uuid.UUID) ([]*domain.Trade, error) {
	args := m.Called(ctx, orderID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.Trade), args.Error(1)
}

func (m *MockTradeRepository) GetByUserID(ctx context.Context, userID uuid.UUID, filters repository.TradeFilters) ([]*domain.Trade, error) {
	args := m.Called(ctx, userID, filters)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.Trade), args.Error(1)
}

func (m *MockTradeRepository) GetBySymbol(ctx context.Context, symbol string, limit int) ([]*domain.Trade, error) {
	args := m.Called(ctx, symbol, limit)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.Trade), args.Error(1)
}

func (m *MockTradeRepository) Update(ctx context.Context, trade *domain.Trade) error {
	args := m.Called(ctx, trade)
	return args.Error(0)
}

func (m *MockTradeRepository) MarkSettled(ctx context.Context, tradeID, settlementID uuid.UUID) error {
	args := m.Called(ctx, tradeID, settlementID)
	return args.Error(0)
}

func (m *MockTradeRepository) GetPendingSettlement(ctx context.Context, limit int) ([]*domain.Trade, error) {
	args := m.Called(ctx, limit)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.Trade), args.Error(1)
}

func (m *MockTradeRepository) GetTradesByTimeRange(ctx context.Context, symbol string, startTime, endTime int64, limit, offset int) ([]*domain.Trade, int, error) {
	args := m.Called(ctx, symbol, startTime, endTime, limit, offset)
	if args.Get(0) == nil {
		return nil, args.Int(1), args.Error(2)
	}
	return args.Get(0).([]*domain.Trade), args.Int(1), args.Error(2)
}

func (m *MockTradeRepository) GetTradesForCandles(ctx context.Context, symbol string, startTime, endTime int64) ([]*domain.Trade, error) {
	args := m.Called(ctx, symbol, startTime, endTime)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.Trade), args.Error(1)
}

func (m *MockTradeRepository) Get24hAggregates(ctx context.Context, symbol string, since time.Time) (*repository.Statistics24h, error) {
	args := m.Called(ctx, symbol, since)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*repository.Statistics24h), args.Error(1)
}

// MockOrderRepository is a mock implementation of OrderRepository for testing
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

// MockWalletClient is a mock implementation of WalletClient for testing
type MockWalletClient struct {
	mock.Mock
}

func (m *MockWalletClient) GetUserBalance(ctx context.Context, userID uuid.UUID, currency string) (decimal.Decimal, error) {
	args := m.Called(ctx, userID, currency)
	return args.Get(0).(decimal.Decimal), args.Error(1)
}

func (m *MockWalletClient) HoldFunds(ctx context.Context, userID uuid.UUID, currency string, amount decimal.Decimal) error {
	args := m.Called(ctx, userID, currency, amount)
	return args.Error(0)
}

func (m *MockWalletClient) ReleaseFunds(ctx context.Context, userID uuid.UUID, currency string, amount decimal.Decimal) error {
	args := m.Called(ctx, userID, currency, amount)
	return args.Error(0)
}

func (m *MockWalletClient) SettleTrade(ctx context.Context, userID uuid.UUID, baseCurrency, quoteCurrency string, baseAmount, quoteAmount decimal.Decimal, tradeID uuid.UUID) error {
	args := m.Called(ctx, userID, baseCurrency, quoteCurrency, baseAmount, quoteAmount, tradeID)
	return args.Error(0)
}
