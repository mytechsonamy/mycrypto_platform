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

// Note: MockOrderRepository and MockWalletClient specific to OrderService are defined in order_service_test.go
// because they use different interface signatures than the generic repository interfaces
