package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/shopspring/decimal"
	"go.uber.org/zap"

	"github.com/mytrader/trade-engine/internal/domain"
	"github.com/mytrader/trade-engine/internal/repository"
)

// Errors
var (
	ErrInvalidTimeframe    = errors.New("invalid timeframe")
	ErrInvalidTimeRange    = errors.New("invalid time range")
	ErrInvalidLimit        = errors.New("invalid limit")
	ErrNoTradesFound       = errors.New("no trades found for symbol")
)

// Candle represents an OHLCV candlestick
type Candle struct {
	Time   int64           `json:"time"`
	Open   decimal.Decimal `json:"open"`
	High   decimal.Decimal `json:"high"`
	Low    decimal.Decimal `json:"low"`
	Close  decimal.Decimal `json:"close"`
	Volume decimal.Decimal `json:"volume"`
}

// Statistics24h is an alias for repository.Statistics24h
type Statistics24h = repository.Statistics24h

// MarketDataService provides market data operations
type MarketDataService struct {
	tradeRepo repository.TradeRepository
	logger    *zap.Logger
}

// NewMarketDataService creates a new market data service
func NewMarketDataService(
	tradeRepo repository.TradeRepository,
	logger *zap.Logger,
) *MarketDataService {
	return &MarketDataService{
		tradeRepo: tradeRepo,
		logger:    logger,
	}
}

// GetCandles generates OHLCV candles for the specified symbol and timeframe
func (mds *MarketDataService) GetCandles(
	ctx context.Context,
	symbol string,
	timeframe string,
	startTime, endTime int64,
	limit int,
) ([]*Candle, error) {
	// Validate parameters
	if symbol == "" {
		return nil, errors.New("symbol is required")
	}

	// Validate timeframe
	bucketSize, err := mds.timeframeToSeconds(timeframe)
	if err != nil {
		return nil, err
	}

	// Validate time range
	if startTime > endTime {
		return nil, ErrInvalidTimeRange
	}

	// Validate limit
	if limit <= 0 {
		limit = 100 // Default
	}
	if limit > 1000 {
		limit = 1000 // Maximum
	}

	mds.logger.Debug("Getting candles",
		zap.String("symbol", symbol),
		zap.String("timeframe", timeframe),
		zap.Int64("start_time", startTime),
		zap.Int64("end_time", endTime),
		zap.Int("limit", limit),
	)

	// Get trades from repository
	trades, err := mds.tradeRepo.GetTradesForCandles(ctx, symbol, startTime, endTime)
	if err != nil {
		mds.logger.Error("Failed to get trades for candles",
			zap.Error(err),
			zap.String("symbol", symbol),
		)
		return nil, err
	}

	if len(trades) == 0 {
		mds.logger.Debug("No trades found for candle generation",
			zap.String("symbol", symbol),
		)
		return []*Candle{}, nil
	}

	// Generate candles from trades
	candles := mds.generateCandles(trades, bucketSize, startTime, endTime)

	// Apply limit (return most recent candles)
	if len(candles) > limit {
		candles = candles[len(candles)-limit:]
	}

	mds.logger.Debug("Candles generated",
		zap.String("symbol", symbol),
		zap.Int("candle_count", len(candles)),
		zap.Int("trade_count", len(trades)),
	)

	return candles, nil
}

// GetHistoricalTrades retrieves historical trades with pagination
func (mds *MarketDataService) GetHistoricalTrades(
	ctx context.Context,
	symbol string,
	startTime, endTime int64,
	limit, offset int,
) ([]*domain.Trade, int, error) {
	// Validate parameters
	if symbol == "" {
		return nil, 0, errors.New("symbol is required")
	}

	// Validate time range
	if startTime > endTime {
		return nil, 0, ErrInvalidTimeRange
	}

	// Validate and set defaults
	if limit <= 0 {
		limit = 100
	}
	if limit > 1000 {
		limit = 1000
	}
	if offset < 0 {
		offset = 0
	}

	mds.logger.Debug("Getting historical trades",
		zap.String("symbol", symbol),
		zap.Int64("start_time", startTime),
		zap.Int64("end_time", endTime),
		zap.Int("limit", limit),
		zap.Int("offset", offset),
	)

	// Get trades and total count
	trades, total, err := mds.tradeRepo.GetTradesByTimeRange(
		ctx,
		symbol,
		startTime,
		endTime,
		limit,
		offset,
	)
	if err != nil {
		mds.logger.Error("Failed to get historical trades",
			zap.Error(err),
			zap.String("symbol", symbol),
		)
		return nil, 0, err
	}

	mds.logger.Debug("Historical trades retrieved",
		zap.String("symbol", symbol),
		zap.Int("count", len(trades)),
		zap.Int("total", total),
	)

	return trades, total, nil
}

// Get24hStats calculates 24-hour statistics for a symbol
func (mds *MarketDataService) Get24hStats(
	ctx context.Context,
	symbol string,
) (*Statistics24h, error) {
	// Validate parameters
	if symbol == "" {
		return nil, errors.New("symbol is required")
	}

	// Calculate 24 hours ago
	since := time.Now().Add(-24 * time.Hour)

	mds.logger.Debug("Getting 24h statistics",
		zap.String("symbol", symbol),
		zap.Time("since", since),
	)

	// Get aggregated data from repository
	stats, err := mds.tradeRepo.Get24hAggregates(ctx, symbol, since)
	if err != nil {
		if errors.Is(err, repository.ErrTradeNotFound) {
			// Return empty stats if no trades found
			return &Statistics24h{
				High:               decimal.Zero,
				Low:                decimal.Zero,
				Volume:             decimal.Zero,
				VolumeQuote:        decimal.Zero,
				Trades:             0,
				PriceChange:        decimal.Zero,
				PriceChangePercent: decimal.Zero,
				LastPrice:          decimal.Zero,
			}, nil
		}
		mds.logger.Error("Failed to get 24h aggregates",
			zap.Error(err),
			zap.String("symbol", symbol),
		)
		return nil, err
	}

	mds.logger.Debug("24h statistics retrieved",
		zap.String("symbol", symbol),
		zap.String("high", stats.High.String()),
		zap.String("low", stats.Low.String()),
		zap.String("volume", stats.Volume.String()),
		zap.Int("trades", stats.Trades),
	)

	return stats, nil
}

// timeframeToSeconds converts a timeframe string to seconds
func (mds *MarketDataService) timeframeToSeconds(timeframe string) (int64, error) {
	switch timeframe {
	case "1m":
		return 60, nil
	case "5m":
		return 300, nil
	case "15m":
		return 900, nil
	case "1h":
		return 3600, nil
	case "4h":
		return 14400, nil
	case "1d":
		return 86400, nil
	default:
		return 0, fmt.Errorf("%w: %s (supported: 1m, 5m, 15m, 1h, 4h, 1d)", ErrInvalidTimeframe, timeframe)
	}
}

// generateCandles generates candles from trades
func (mds *MarketDataService) generateCandles(
	trades []*domain.Trade,
	bucketSize int64,
	startTime, endTime int64,
) []*Candle {
	if len(trades) == 0 {
		return []*Candle{}
	}

	// Group trades by time buckets
	buckets := mds.groupTradesByTime(trades, bucketSize, startTime, endTime)

	// Generate candles from buckets
	candles := make([]*Candle, 0, len(buckets))

	// Sort bucket times
	bucketTimes := make([]int64, 0, len(buckets))
	for bucketTime := range buckets {
		bucketTimes = append(bucketTimes, bucketTime)
	}

	// Simple sort for int64 slice
	for i := 0; i < len(bucketTimes); i++ {
		for j := i + 1; j < len(bucketTimes); j++ {
			if bucketTimes[i] > bucketTimes[j] {
				bucketTimes[i], bucketTimes[j] = bucketTimes[j], bucketTimes[i]
			}
		}
	}

	for _, bucketTime := range bucketTimes {
		bucketTrades := buckets[bucketTime]
		candle := mds.calculateCandle(bucketTime, bucketTrades)
		candles = append(candles, candle)
	}

	return candles
}

// groupTradesByTime groups trades into time buckets
func (mds *MarketDataService) groupTradesByTime(
	trades []*domain.Trade,
	bucketSize int64,
	startTime, endTime int64,
) map[int64][]*domain.Trade {
	buckets := make(map[int64][]*domain.Trade)

	for _, trade := range trades {
		tradeTime := trade.ExecutedAt.Unix()

		// Skip trades outside the range
		if tradeTime < startTime || tradeTime > endTime {
			continue
		}

		// Calculate bucket time (floor to nearest bucket)
		bucketTime := (tradeTime / bucketSize) * bucketSize

		buckets[bucketTime] = append(buckets[bucketTime], trade)
	}

	return buckets
}

// calculateCandle calculates OHLCV for a bucket of trades
func (mds *MarketDataService) calculateCandle(
	bucketTime int64,
	trades []*domain.Trade,
) *Candle {
	if len(trades) == 0 {
		return &Candle{
			Time:   bucketTime,
			Open:   decimal.Zero,
			High:   decimal.Zero,
			Low:    decimal.Zero,
			Close:  decimal.Zero,
			Volume: decimal.Zero,
		}
	}

	// Sort trades by execution time (earliest first)
	sortedTrades := make([]*domain.Trade, len(trades))
	copy(sortedTrades, trades)

	for i := 0; i < len(sortedTrades); i++ {
		for j := i + 1; j < len(sortedTrades); j++ {
			if sortedTrades[i].ExecutedAt.After(sortedTrades[j].ExecutedAt) {
				sortedTrades[i], sortedTrades[j] = sortedTrades[j], sortedTrades[i]
			}
		}
	}

	// OPEN: First trade price
	open := sortedTrades[0].Price

	// CLOSE: Last trade price
	close := sortedTrades[len(sortedTrades)-1].Price

	// HIGH: Maximum price
	high := sortedTrades[0].Price
	for _, trade := range sortedTrades {
		if trade.Price.GreaterThan(high) {
			high = trade.Price
		}
	}

	// LOW: Minimum price
	low := sortedTrades[0].Price
	for _, trade := range sortedTrades {
		if trade.Price.LessThan(low) {
			low = trade.Price
		}
	}

	// VOLUME: Sum of quantities
	volume := decimal.Zero
	for _, trade := range sortedTrades {
		volume = volume.Add(trade.Quantity)
	}

	return &Candle{
		Time:   bucketTime,
		Open:   open,
		High:   high,
		Low:    low,
		Close:  close,
		Volume: volume,
	}
}
