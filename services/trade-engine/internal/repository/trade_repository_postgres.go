package repository

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/mytrader/trade-engine/internal/domain"
)

// PostgresTradeRepository implements TradeRepository using PostgreSQL
type PostgresTradeRepository struct {
	db     *gorm.DB
	logger *zap.Logger
}

// NewPostgresTradeRepository creates a new PostgreSQL trade repository
func NewPostgresTradeRepository(db *gorm.DB, logger *zap.Logger) TradeRepository {
	return &PostgresTradeRepository{
		db:     db,
		logger: logger,
	}
}

// Create creates a new trade in the database
func (r *PostgresTradeRepository) Create(ctx context.Context, trade *domain.Trade) error {
	if err := r.db.WithContext(ctx).Create(trade).Error; err != nil {
		r.logger.Error("Failed to create trade",
			zap.Error(err),
			zap.String("trade_id", trade.ID.String()),
		)
		return err
	}

	r.logger.Debug("Trade created",
		zap.String("trade_id", trade.ID.String()),
		zap.String("symbol", trade.Symbol),
	)

	return nil
}

// CreateBatch creates multiple trades in a single transaction
func (r *PostgresTradeRepository) CreateBatch(ctx context.Context, trades []*domain.Trade) error {
	if len(trades) == 0 {
		return nil
	}

	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for _, trade := range trades {
			if err := tx.Create(trade).Error; err != nil {
				return err
			}
		}
		return nil
	})

	if err != nil {
		r.logger.Error("Failed to create trades batch",
			zap.Error(err),
			zap.Int("count", len(trades)),
		)
		return err
	}

	r.logger.Debug("Trades batch created",
		zap.Int("count", len(trades)),
	)

	return nil
}

// GetByID retrieves a trade by its ID
func (r *PostgresTradeRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.Trade, error) {
	var trade domain.Trade
	err := r.db.WithContext(ctx).First(&trade, "id = ?", id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrTradeNotFound
		}
		r.logger.Error("Failed to get trade by ID",
			zap.Error(err),
			zap.String("trade_id", id.String()),
		)
		return nil, err
	}

	return &trade, nil
}

// GetByOrderID retrieves all trades for a specific order
func (r *PostgresTradeRepository) GetByOrderID(ctx context.Context, orderID uuid.UUID) ([]*domain.Trade, error) {
	var trades []*domain.Trade
	err := r.db.WithContext(ctx).
		Where("buyer_order_id = ? OR seller_order_id = ?", orderID, orderID).
		Order("executed_at DESC").
		Find(&trades).Error

	if err != nil {
		r.logger.Error("Failed to get trades by order ID",
			zap.Error(err),
			zap.String("order_id", orderID.String()),
		)
		return nil, err
	}

	return trades, nil
}

// GetByUserID retrieves trades for a specific user with filters
func (r *PostgresTradeRepository) GetByUserID(ctx context.Context, userID uuid.UUID, filters TradeFilters) ([]*domain.Trade, error) {
	query := r.db.WithContext(ctx).
		Where("buyer_user_id = ? OR seller_user_id = ?", userID, userID)

	// Apply filters
	if filters.Symbol != nil {
		query = query.Where("symbol = ?", *filters.Symbol)
	}

	if filters.OrderID != nil {
		query = query.Where("buyer_order_id = ? OR seller_order_id = ?", *filters.OrderID, *filters.OrderID)
	}

	// Apply ordering
	if filters.OrderBy != "" {
		query = query.Order(filters.OrderBy)
	} else {
		query = query.Order("executed_at DESC")
	}

	// Apply pagination
	if filters.Limit > 0 {
		query = query.Limit(filters.Limit)
	}
	if filters.Offset > 0 {
		query = query.Offset(filters.Offset)
	}

	var trades []*domain.Trade
	if err := query.Find(&trades).Error; err != nil {
		r.logger.Error("Failed to get trades by user ID",
			zap.Error(err),
			zap.String("user_id", userID.String()),
		)
		return nil, err
	}

	return trades, nil
}

// GetBySymbol retrieves recent trades for a symbol
func (r *PostgresTradeRepository) GetBySymbol(ctx context.Context, symbol string, limit int) ([]*domain.Trade, error) {
	if limit <= 0 {
		limit = 50 // Default limit
	}
	if limit > 500 {
		limit = 500 // Max limit
	}

	var trades []*domain.Trade
	err := r.db.WithContext(ctx).
		Where("symbol = ?", symbol).
		Order("executed_at DESC").
		Limit(limit).
		Find(&trades).Error

	if err != nil {
		r.logger.Error("Failed to get trades by symbol",
			zap.Error(err),
			zap.String("symbol", symbol),
		)
		return nil, err
	}

	return trades, nil
}

// Update updates an existing trade
func (r *PostgresTradeRepository) Update(ctx context.Context, trade *domain.Trade) error {
	err := r.db.WithContext(ctx).Save(trade).Error
	if err != nil {
		r.logger.Error("Failed to update trade",
			zap.Error(err),
			zap.String("trade_id", trade.ID.String()),
		)
		return err
	}

	r.logger.Debug("Trade updated",
		zap.String("trade_id", trade.ID.String()),
	)

	return nil
}

// MarkSettled marks a trade as settled
func (r *PostgresTradeRepository) MarkSettled(ctx context.Context, tradeID, settlementID uuid.UUID) error {
	now := time.Now()
	err := r.db.WithContext(ctx).Model(&domain.Trade{}).
		Where("id = ?", tradeID).
		Updates(map[string]interface{}{
			"settlement_id":     settlementID,
			"settlement_status": "SETTLED",
			"settled_at":        now,
		}).Error

	if err != nil {
		r.logger.Error("Failed to mark trade as settled",
			zap.Error(err),
			zap.String("trade_id", tradeID.String()),
			zap.String("settlement_id", settlementID.String()),
		)
		return err
	}

	r.logger.Debug("Trade marked as settled",
		zap.String("trade_id", tradeID.String()),
		zap.String("settlement_id", settlementID.String()),
	)

	return nil
}

// GetPendingSettlement retrieves trades pending settlement
func (r *PostgresTradeRepository) GetPendingSettlement(ctx context.Context, limit int) ([]*domain.Trade, error) {
	if limit <= 0 {
		limit = 100 // Default limit
	}
	if limit > 1000 {
		limit = 1000 // Max limit
	}

	var trades []*domain.Trade
	err := r.db.WithContext(ctx).
		Where("settlement_status = ?", "PENDING").
		Order("executed_at ASC").
		Limit(limit).
		Find(&trades).Error

	if err != nil {
		r.logger.Error("Failed to get pending settlement trades",
			zap.Error(err),
		)
		return nil, err
	}

	return trades, nil
}

// GetTradesByTimeRange retrieves trades for a symbol within a time range with pagination
func (r *PostgresTradeRepository) GetTradesByTimeRange(
	ctx context.Context,
	symbol string,
	startTime, endTime int64,
	limit, offset int,
) ([]*domain.Trade, int, error) {
	// Validate limit
	if limit <= 0 {
		limit = 100
	}
	if limit > 1000 {
		limit = 1000
	}
	if offset < 0 {
		offset = 0
	}

	// Convert timestamps to time.Time
	start := time.Unix(startTime, 0)
	end := time.Unix(endTime, 0)

	// Get total count
	var total int64
	if err := r.db.WithContext(ctx).
		Model(&domain.Trade{}).
		Where("symbol = ? AND executed_at >= ? AND executed_at <= ?", symbol, start, end).
		Count(&total).Error; err != nil {
		r.logger.Error("Failed to count trades by time range",
			zap.Error(err),
			zap.String("symbol", symbol),
		)
		return nil, 0, err
	}

	// Get paginated trades
	var trades []*domain.Trade
	err := r.db.WithContext(ctx).
		Where("symbol = ? AND executed_at >= ? AND executed_at <= ?", symbol, start, end).
		Order("executed_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&trades).Error

	if err != nil {
		r.logger.Error("Failed to get trades by time range",
			zap.Error(err),
			zap.String("symbol", symbol),
		)
		return nil, 0, err
	}

	r.logger.Debug("Trades retrieved by time range",
		zap.String("symbol", symbol),
		zap.Int("count", len(trades)),
		zap.Int64("total", total),
	)

	return trades, int(total), nil
}

// GetTradesForCandles retrieves all trades for candle generation (no pagination)
func (r *PostgresTradeRepository) GetTradesForCandles(
	ctx context.Context,
	symbol string,
	startTime, endTime int64,
) ([]*domain.Trade, error) {
	// Convert timestamps to time.Time
	start := time.Unix(startTime, 0)
	end := time.Unix(endTime, 0)

	var trades []*domain.Trade
	err := r.db.WithContext(ctx).
		Where("symbol = ? AND executed_at >= ? AND executed_at <= ?", symbol, start, end).
		Order("executed_at ASC").
		Find(&trades).Error

	if err != nil {
		r.logger.Error("Failed to get trades for candles",
			zap.Error(err),
			zap.String("symbol", symbol),
		)
		return nil, err
	}

	r.logger.Debug("Trades retrieved for candles",
		zap.String("symbol", symbol),
		zap.Int("count", len(trades)),
	)

	return trades, nil
}

// Get24hAggregates retrieves 24-hour aggregated statistics for a symbol
func (r *PostgresTradeRepository) Get24hAggregates(
	ctx context.Context,
	symbol string,
	since time.Time,
) (*Statistics24h, error) {
	// Query to get aggregated data
	type AggregateResult struct {
		High        *float64
		Low         *float64
		Volume      *float64
		VolumeQuote *float64
		Trades      int64
	}

	var result AggregateResult
	err := r.db.WithContext(ctx).
		Model(&domain.Trade{}).
		Select(`
			MAX(price) as high,
			MIN(price) as low,
			SUM(quantity) as volume,
			SUM(price * quantity) as volume_quote,
			COUNT(*) as trades
		`).
		Where("symbol = ? AND executed_at >= ?", symbol, since).
		Scan(&result).Error

	if err != nil {
		r.logger.Error("Failed to get 24h aggregates",
			zap.Error(err),
			zap.String("symbol", symbol),
		)
		return nil, err
	}

	// If no trades found
	if result.Trades == 0 {
		return nil, ErrTradeNotFound
	}

	// Get first and last trade prices for price change calculation
	var firstTrade, lastTrade domain.Trade

	// Get first trade (oldest)
	err = r.db.WithContext(ctx).
		Where("symbol = ? AND executed_at >= ?", symbol, since).
		Order("executed_at ASC").
		First(&firstTrade).Error

	if err != nil {
		r.logger.Error("Failed to get first trade",
			zap.Error(err),
			zap.String("symbol", symbol),
		)
		return nil, err
	}

	// Get last trade (most recent)
	err = r.db.WithContext(ctx).
		Where("symbol = ? AND executed_at >= ?", symbol, since).
		Order("executed_at DESC").
		First(&lastTrade).Error

	if err != nil {
		r.logger.Error("Failed to get last trade",
			zap.Error(err),
			zap.String("symbol", symbol),
		)
		return nil, err
	}

	// Convert to decimal
	high := decimal.NewFromFloat(*result.High)
	low := decimal.NewFromFloat(*result.Low)
	volume := decimal.NewFromFloat(*result.Volume)
	volumeQuote := decimal.NewFromFloat(*result.VolumeQuote)

	// Calculate price change
	priceChange := lastTrade.Price.Sub(firstTrade.Price)
	priceChangePercent := decimal.Zero
	if firstTrade.Price.GreaterThan(decimal.Zero) {
		priceChangePercent = priceChange.Div(firstTrade.Price).Mul(decimal.NewFromInt(100))
	}

	stats := &Statistics24h{
		High:               high,
		Low:                low,
		Volume:             volume,
		VolumeQuote:        volumeQuote,
		Trades:             int(result.Trades),
		PriceChange:        priceChange,
		PriceChangePercent: priceChangePercent,
		LastPrice:          lastTrade.Price,
		FirstPrice:         firstTrade.Price,
	}

	r.logger.Debug("24h aggregates retrieved",
		zap.String("symbol", symbol),
		zap.String("high", stats.High.String()),
		zap.String("low", stats.Low.String()),
		zap.Int("trades", stats.Trades),
	)

	return stats, nil
}
