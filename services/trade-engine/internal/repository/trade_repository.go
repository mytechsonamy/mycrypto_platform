package repository

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"github.com/mytrader/trade-engine/internal/domain"
)

// Trade repository errors
var (
	ErrTradeNotFound = errors.New("trade not found")
)

// TradeFilters defines filters for querying trades
type TradeFilters struct {
	Symbol  *string
	UserID  *uuid.UUID  // Filter by buyer or seller
	OrderID *uuid.UUID  // Filter by order ID (buyer or seller order)
	Limit   int
	Offset  int
	OrderBy string // e.g., "executed_at DESC"
}

// TradeRepository defines the interface for trade persistence
type TradeRepository interface {
	// Create creates a new trade in the database
	Create(ctx context.Context, trade *domain.Trade) error

	// CreateBatch creates multiple trades in a single transaction
	CreateBatch(ctx context.Context, trades []*domain.Trade) error

	// GetByID retrieves a trade by its ID
	GetByID(ctx context.Context, id uuid.UUID) (*domain.Trade, error)

	// GetByOrderID retrieves all trades for a specific order
	GetByOrderID(ctx context.Context, orderID uuid.UUID) ([]*domain.Trade, error)

	// GetByUserID retrieves trades for a specific user with filters
	GetByUserID(ctx context.Context, userID uuid.UUID, filters TradeFilters) ([]*domain.Trade, error)

	// GetBySymbol retrieves recent trades for a symbol
	GetBySymbol(ctx context.Context, symbol string, limit int) ([]*domain.Trade, error)

	// Update updates an existing trade (for settlement tracking)
	Update(ctx context.Context, trade *domain.Trade) error

	// MarkSettled marks a trade as settled
	MarkSettled(ctx context.Context, tradeID, settlementID uuid.UUID) error

	// GetPendingSettlement retrieves trades pending settlement
	GetPendingSettlement(ctx context.Context, limit int) ([]*domain.Trade, error)

	// GetTradesByTimeRange retrieves trades for a symbol within a time range with pagination
	GetTradesByTimeRange(ctx context.Context, symbol string, startTime, endTime int64, limit, offset int) ([]*domain.Trade, int, error)

	// GetTradesForCandles retrieves all trades for candle generation (no pagination)
	GetTradesForCandles(ctx context.Context, symbol string, startTime, endTime int64) ([]*domain.Trade, error)

	// Get24hAggregates retrieves 24-hour aggregated statistics for a symbol
	Get24hAggregates(ctx context.Context, symbol string, since time.Time) (*Statistics24h, error)
}

// Statistics24h represents aggregated 24-hour statistics
type Statistics24h struct {
	High               decimal.Decimal
	Low                decimal.Decimal
	Volume             decimal.Decimal
	VolumeQuote        decimal.Decimal
	Trades             int
	PriceChange        decimal.Decimal
	PriceChangePercent decimal.Decimal
	LastPrice          decimal.Decimal
	FirstPrice         decimal.Decimal
}
