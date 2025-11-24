package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"go.uber.org/zap"

	"github.com/mytrader/trade-engine/internal/domain"
	"github.com/mytrader/trade-engine/internal/repository"
)

// Test GetCandles - Valid 1 hour timeframe
func TestGetCandles_1Hour_Valid(t *testing.T) {
	mockRepo := new(MockTradeRepository)
	logger := zap.NewNop()
	service := NewMarketDataService(mockRepo, logger)

	ctx := context.Background()
	symbol := "BTC-USDT"
	startTime := int64(1700000000)
	endTime := int64(1700003600) // 1 hour later
	limit := 100

	// Create mock trades - all within the same hour bucket
	// Start time: 1700000000 = Nov 14 2023 22:13:20 UTC
	// Bucket start: 1700000000 (rounded down to nearest hour)
	baseTime := time.Unix(startTime, 0)
	trades := []*domain.Trade{
		{
			ID:         uuid.New(),
			Symbol:     symbol,
			Price:      decimal.NewFromInt(50000),
			Quantity:   decimal.NewFromFloat(0.5),
			ExecutedAt: baseTime.Add(1 * time.Minute),
		},
		{
			ID:         uuid.New(),
			Symbol:     symbol,
			Price:      decimal.NewFromInt(50500),
			Quantity:   decimal.NewFromFloat(0.3),
			ExecutedAt: baseTime.Add(10 * time.Minute),
		},
		{
			ID:         uuid.New(),
			Symbol:     symbol,
			Price:      decimal.NewFromInt(49800),
			Quantity:   decimal.NewFromFloat(0.2),
			ExecutedAt: baseTime.Add(20 * time.Minute),
		},
		{
			ID:         uuid.New(),
			Symbol:     symbol,
			Price:      decimal.NewFromInt(50200),
			Quantity:   decimal.NewFromFloat(0.4),
			ExecutedAt: baseTime.Add(30 * time.Minute),
		},
	}

	mockRepo.On("GetTradesForCandles", ctx, symbol, startTime, endTime).Return(trades, nil)

	// Execute
	candles, err := service.GetCandles(ctx, symbol, "1h", startTime, endTime, limit)

	// Assert
	assert.NoError(t, err)
	assert.NotNil(t, candles)
	assert.GreaterOrEqual(t, len(candles), 1) // At least one bucket

	// Find the main bucket
	var mainCandle *Candle
	for _, c := range candles {
		if c.Volume.GreaterThan(decimal.Zero) {
			mainCandle = c
			break
		}
	}
	assert.NotNil(t, mainCandle)

	// Verify OHLCV values (order matters due to time-based sorting)
	assert.Equal(t, "50000", mainCandle.Open.String())
	assert.Equal(t, "50500", mainCandle.High.String())
	assert.Equal(t, "49800", mainCandle.Low.String())
	assert.Equal(t, "50200", mainCandle.Close.String())
	assert.True(t, mainCandle.Volume.GreaterThan(decimal.Zero))

	mockRepo.AssertExpectations(t)
}

// Test GetCandles - 5 minute timeframe with correct aggregation
func TestGetCandles_5Minute_CorrectAggregation(t *testing.T) {
	mockRepo := new(MockTradeRepository)
	logger := zap.NewNop()
	service := NewMarketDataService(mockRepo, logger)

	ctx := context.Background()
	symbol := "BTC-USDT"
	startTime := int64(1700000000)
	endTime := int64(1700000900) // 15 minutes later
	limit := 100

	// Create mock trades spanning 3 buckets (5m each)
	baseTime := time.Unix(startTime, 0)
	trades := []*domain.Trade{
		// Bucket 1 (0-5min)
		{
			ID:         uuid.New(),
			Symbol:     symbol,
			Price:      decimal.NewFromInt(50000),
			Quantity:   decimal.NewFromFloat(0.5),
			ExecutedAt: baseTime.Add(1 * time.Minute),
		},
		{
			ID:         uuid.New(),
			Symbol:     symbol,
			Price:      decimal.NewFromInt(50100),
			Quantity:   decimal.NewFromFloat(0.3),
			ExecutedAt: baseTime.Add(3 * time.Minute),
		},
		// Bucket 2 (5-10min)
		{
			ID:         uuid.New(),
			Symbol:     symbol,
			Price:      decimal.NewFromInt(50200),
			Quantity:   decimal.NewFromFloat(0.4),
			ExecutedAt: baseTime.Add(6 * time.Minute),
		},
		// Bucket 3 (10-15min)
		{
			ID:         uuid.New(),
			Symbol:     symbol,
			Price:      decimal.NewFromInt(50300),
			Quantity:   decimal.NewFromFloat(0.6),
			ExecutedAt: baseTime.Add(12 * time.Minute),
		},
	}

	mockRepo.On("GetTradesForCandles", ctx, symbol, startTime, endTime).Return(trades, nil)

	// Execute
	candles, err := service.GetCandles(ctx, symbol, "5m", startTime, endTime, limit)

	// Assert
	assert.NoError(t, err)
	assert.NotNil(t, candles)
	assert.GreaterOrEqual(t, len(candles), 3)

	// Verify that we have multiple buckets
	totalVolume := decimal.Zero
	for _, c := range candles {
		totalVolume = totalVolume.Add(c.Volume)
	}
	assert.Equal(t, "1.8", totalVolume.String())

	mockRepo.AssertExpectations(t)
}

// Test GetCandles - Invalid timeframe
func TestGetCandles_InvalidTimeframe_Error(t *testing.T) {
	mockRepo := new(MockTradeRepository)
	logger := zap.NewNop()
	service := NewMarketDataService(mockRepo, logger)

	ctx := context.Background()
	symbol := "BTC-USDT"
	startTime := int64(1700000000)
	endTime := int64(1700003600)
	limit := 100

	// Execute with invalid timeframe
	candles, err := service.GetCandles(ctx, symbol, "3h", startTime, endTime, limit)

	// Assert
	assert.Error(t, err)
	assert.Nil(t, candles)
	assert.Contains(t, err.Error(), "invalid timeframe")
}

// Test GetCandles - Pagination
func TestGetCandles_Pagination(t *testing.T) {
	mockRepo := new(MockTradeRepository)
	logger := zap.NewNop()
	service := NewMarketDataService(mockRepo, logger)

	ctx := context.Background()
	symbol := "BTC-USDT"
	startTime := int64(1700000000)
	endTime := int64(1700086400) // 24 hours
	limit := 5 // Limit to 5 candles

	// Create mock trades for 10 hours
	baseTime := time.Unix(startTime, 0)
	trades := make([]*domain.Trade, 0)
	for i := 0; i < 10; i++ {
		trades = append(trades, &domain.Trade{
			ID:         uuid.New(),
			Symbol:     symbol,
			Price:      decimal.NewFromInt(50000 + int64(i*100)),
			Quantity:   decimal.NewFromFloat(0.5),
			ExecutedAt: baseTime.Add(time.Duration(i) * time.Hour).Add(30 * time.Minute),
		})
	}

	mockRepo.On("GetTradesForCandles", ctx, symbol, startTime, endTime).Return(trades, nil)

	// Execute
	candles, err := service.GetCandles(ctx, symbol, "1h", startTime, endTime, limit)

	// Assert
	assert.NoError(t, err)
	assert.NotNil(t, candles)
	assert.LessOrEqual(t, len(candles), limit)

	mockRepo.AssertExpectations(t)
}

// Test GetCandles - Empty result
func TestGetCandles_EmptyResult(t *testing.T) {
	mockRepo := new(MockTradeRepository)
	logger := zap.NewNop()
	service := NewMarketDataService(mockRepo, logger)

	ctx := context.Background()
	symbol := "BTC-USDT"
	startTime := int64(1700000000)
	endTime := int64(1700003600)
	limit := 100

	mockRepo.On("GetTradesForCandles", ctx, symbol, startTime, endTime).Return([]*domain.Trade{}, nil)

	// Execute
	candles, err := service.GetCandles(ctx, symbol, "1h", startTime, endTime, limit)

	// Assert
	assert.NoError(t, err)
	assert.NotNil(t, candles)
	assert.Len(t, candles, 0)

	mockRepo.AssertExpectations(t)
}

// Test GetHistoricalTrades - Time range
func TestGetHistoricalTrades_TimeRange(t *testing.T) {
	mockRepo := new(MockTradeRepository)
	logger := zap.NewNop()
	service := NewMarketDataService(mockRepo, logger)

	ctx := context.Background()
	symbol := "BTC-USDT"
	startTime := int64(1700000000)
	endTime := int64(1700003600)
	limit := 100
	offset := 0

	// Create mock trades
	trades := []*domain.Trade{
		{
			ID:         uuid.New(),
			Symbol:     symbol,
			Price:      decimal.NewFromInt(50000),
			Quantity:   decimal.NewFromFloat(0.5),
			ExecutedAt: time.Unix(startTime+100, 0),
		},
		{
			ID:         uuid.New(),
			Symbol:     symbol,
			Price:      decimal.NewFromInt(50100),
			Quantity:   decimal.NewFromFloat(0.3),
			ExecutedAt: time.Unix(startTime+200, 0),
		},
	}
	total := 2

	mockRepo.On("GetTradesByTimeRange", ctx, symbol, startTime, endTime, limit, offset).Return(trades, total, nil)

	// Execute
	result, resultTotal, err := service.GetHistoricalTrades(ctx, symbol, startTime, endTime, limit, offset)

	// Assert
	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Len(t, result, 2)
	assert.Equal(t, total, resultTotal)

	mockRepo.AssertExpectations(t)
}

// Test GetHistoricalTrades - Pagination
func TestGetHistoricalTrades_Pagination(t *testing.T) {
	mockRepo := new(MockTradeRepository)
	logger := zap.NewNop()
	service := NewMarketDataService(mockRepo, logger)

	ctx := context.Background()
	symbol := "BTC-USDT"
	startTime := int64(1700000000)
	endTime := int64(1700003600)
	limit := 50
	offset := 100

	trades := []*domain.Trade{}
	total := 500

	mockRepo.On("GetTradesByTimeRange", ctx, symbol, startTime, endTime, limit, offset).Return(trades, total, nil)

	// Execute
	result, resultTotal, err := service.GetHistoricalTrades(ctx, symbol, startTime, endTime, limit, offset)

	// Assert
	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, total, resultTotal)

	mockRepo.AssertExpectations(t)
}

// Test GetHistoricalTrades - Empty result
func TestGetHistoricalTrades_EmptyResult(t *testing.T) {
	mockRepo := new(MockTradeRepository)
	logger := zap.NewNop()
	service := NewMarketDataService(mockRepo, logger)

	ctx := context.Background()
	symbol := "ETH-USDT"
	startTime := int64(1700000000)
	endTime := int64(1700003600)
	limit := 100
	offset := 0

	mockRepo.On("GetTradesByTimeRange", ctx, symbol, startTime, endTime, limit, offset).Return([]*domain.Trade{}, 0, nil)

	// Execute
	result, total, err := service.GetHistoricalTrades(ctx, symbol, startTime, endTime, limit, offset)

	// Assert
	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Len(t, result, 0)
	assert.Equal(t, 0, total)

	mockRepo.AssertExpectations(t)
}

// Test Get24hStats - Accurate
func TestGet24hStats_Accurate(t *testing.T) {
	mockRepo := new(MockTradeRepository)
	logger := zap.NewNop()
	service := NewMarketDataService(mockRepo, logger)

	ctx := context.Background()
	symbol := "BTC-USDT"

	// Create mock stats
	stats := &repository.Statistics24h{
		High:               decimal.NewFromInt(51500),
		Low:                decimal.NewFromInt(48900),
		Volume:             decimal.NewFromFloat(1250.75),
		VolumeQuote:        decimal.NewFromInt(62500000),
		Trades:             5432,
		PriceChange:        decimal.NewFromInt(1250),
		PriceChangePercent: decimal.NewFromFloat(2.55),
		LastPrice:          decimal.NewFromInt(50000),
		FirstPrice:         decimal.NewFromInt(48750),
	}

	mockRepo.On("Get24hAggregates", ctx, symbol, mock.AnythingOfType("time.Time")).Return(stats, nil)

	// Execute
	result, err := service.Get24hStats(ctx, symbol)

	// Assert
	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, "51500", result.High.String())
	assert.Equal(t, "48900", result.Low.String())
	assert.Equal(t, "1250.75", result.Volume.String())
	assert.Equal(t, 5432, result.Trades)

	mockRepo.AssertExpectations(t)
}

// Test Get24hStats - No trades
func TestGet24hStats_EdgeCase_NoTrades(t *testing.T) {
	mockRepo := new(MockTradeRepository)
	logger := zap.NewNop()
	service := NewMarketDataService(mockRepo, logger)

	ctx := context.Background()
	symbol := "NEW-USDT"

	mockRepo.On("Get24hAggregates", ctx, symbol, mock.AnythingOfType("time.Time")).Return(nil, repository.ErrTradeNotFound)

	// Execute
	result, err := service.Get24hStats(ctx, symbol)

	// Assert
	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, "0", result.High.String())
	assert.Equal(t, "0", result.Volume.String())
	assert.Equal(t, 0, result.Trades)

	mockRepo.AssertExpectations(t)
}

// Test Get24hStats - Repository error
func TestGet24hStats_RepositoryError(t *testing.T) {
	mockRepo := new(MockTradeRepository)
	logger := zap.NewNop()
	service := NewMarketDataService(mockRepo, logger)

	ctx := context.Background()
	symbol := "BTC-USDT"

	mockRepo.On("Get24hAggregates", ctx, symbol, mock.AnythingOfType("time.Time")).Return(nil, errors.New("database error"))

	// Execute
	result, err := service.Get24hStats(ctx, symbol)

	// Assert
	assert.Error(t, err)
	assert.Nil(t, result)

	mockRepo.AssertExpectations(t)
}

// Test timeframeToSeconds
func TestTimeframeToSeconds(t *testing.T) {
	mockRepo := new(MockTradeRepository)
	logger := zap.NewNop()
	service := NewMarketDataService(mockRepo, logger)

	tests := []struct {
		name      string
		timeframe string
		expected  int64
		hasError  bool
	}{
		{"1 minute", "1m", 60, false},
		{"5 minutes", "5m", 300, false},
		{"15 minutes", "15m", 900, false},
		{"1 hour", "1h", 3600, false},
		{"4 hours", "4h", 14400, false},
		{"1 day", "1d", 86400, false},
		{"invalid", "3h", 0, true},
		{"invalid", "2d", 0, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := service.timeframeToSeconds(tt.timeframe)
			if tt.hasError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tt.expected, result)
			}
		})
	}
}

// Test GetCandles - Invalid time range
func TestGetCandles_InvalidTimeRange(t *testing.T) {
	mockRepo := new(MockTradeRepository)
	logger := zap.NewNop()
	service := NewMarketDataService(mockRepo, logger)

	ctx := context.Background()
	symbol := "BTC-USDT"
	startTime := int64(1700003600)
	endTime := int64(1700000000) // End before start
	limit := 100

	// Execute
	candles, err := service.GetCandles(ctx, symbol, "1h", startTime, endTime, limit)

	// Assert
	assert.Error(t, err)
	assert.Nil(t, candles)
	assert.Equal(t, ErrInvalidTimeRange, err)
}

// Test GetHistoricalTrades - Invalid time range
func TestGetHistoricalTrades_InvalidTimeRange(t *testing.T) {
	mockRepo := new(MockTradeRepository)
	logger := zap.NewNop()
	service := NewMarketDataService(mockRepo, logger)

	ctx := context.Background()
	symbol := "BTC-USDT"
	startTime := int64(1700003600)
	endTime := int64(1700000000) // End before start
	limit := 100
	offset := 0

	// Execute
	result, total, err := service.GetHistoricalTrades(ctx, symbol, startTime, endTime, limit, offset)

	// Assert
	assert.Error(t, err)
	assert.Nil(t, result)
	assert.Equal(t, 0, total)
	assert.Equal(t, ErrInvalidTimeRange, err)
}
