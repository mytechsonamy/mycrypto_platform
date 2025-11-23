package server

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"go.uber.org/zap"

	"github.com/mytrader/trade-engine/internal/service"
)

// MarketDataHandler handles market data API requests
type MarketDataHandler struct {
	marketDataService *service.MarketDataService
	logger            *zap.Logger
}

// NewMarketDataHandler creates a new MarketDataHandler
func NewMarketDataHandler(
	marketDataService *service.MarketDataService,
	logger *zap.Logger,
) *MarketDataHandler {
	return &MarketDataHandler{
		marketDataService: marketDataService,
		logger:            logger,
	}
}

// CandlesResponse represents the candles API response
type CandlesResponse struct {
	Success bool                    `json:"success"`
	Data    CandlesResponseData     `json:"data"`
	Meta    map[string]interface{}  `json:"meta"`
}

type CandlesResponseData struct {
	Symbol     string            `json:"symbol"`
	Timeframe  string            `json:"timeframe"`
	Candles    []*service.Candle `json:"candles"`
	Pagination PaginationInfo    `json:"pagination"`
}

// HistoricalTradesResponse represents the historical trades API response
type HistoricalTradesResponse struct {
	Success bool                          `json:"success"`
	Data    HistoricalTradesResponseData  `json:"data"`
	Meta    map[string]interface{}        `json:"meta"`
}

type HistoricalTradesResponseData struct {
	Symbol     string           `json:"symbol"`
	Trades     []TradeInfo      `json:"trades"`
	Pagination PaginationInfo   `json:"pagination"`
}

type TradeInfo struct {
	ID         string `json:"id"`
	Price      string `json:"price"`
	Quantity   string `json:"quantity"`
	Side       string `json:"side"`
	Timestamp  int64  `json:"timestamp"`
	BuyerFee   string `json:"buyer_fee"`
	SellerFee  string `json:"seller_fee"`
}

// Statistics24hResponse represents the 24h statistics API response
type Statistics24hResponse struct {
	Success bool                       `json:"success"`
	Data    Statistics24hResponseData  `json:"data"`
	Meta    map[string]interface{}     `json:"meta"`
}

type Statistics24hResponseData struct {
	Symbol   string                  `json:"symbol"`
	Stats24h *service.Statistics24h  `json:"stats_24h"`
}

type PaginationInfo struct {
	Total  int `json:"total"`
	Limit  int `json:"limit"`
	Offset int `json:"offset"`
}

// GetCandles godoc
// @Summary Get OHLCV candles
// @Description Retrieve historical candlestick data for a trading symbol
// @Tags market-data
// @Produce json
// @Param symbol path string true "Trading symbol (e.g., BTC-USDT)"
// @Param timeframe query string false "Timeframe (1m, 5m, 15m, 1h, 4h, 1d)" default(1h)
// @Param start query int64 true "Start timestamp (Unix seconds)"
// @Param end query int64 true "End timestamp (Unix seconds)"
// @Param limit query int false "Maximum number of candles to return" default(100)
// @Success 200 {object} CandlesResponse
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/v1/candles/{symbol} [get]
func (h *MarketDataHandler) GetCandles(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := r.Context().Value("request_id").(string)

	// Get symbol from URL
	symbol := chi.URLParam(r, "symbol")
	if symbol == "" {
		h.respondError(w, http.StatusBadRequest, "Symbol is required", nil)
		return
	}

	// Get query parameters
	timeframe := r.URL.Query().Get("timeframe")
	if timeframe == "" {
		timeframe = "1h" // Default timeframe
	}

	startStr := r.URL.Query().Get("start")
	endStr := r.URL.Query().Get("end")
	limitStr := r.URL.Query().Get("limit")

	// Parse start time
	startTime, err := strconv.ParseInt(startStr, 10, 64)
	if err != nil || startTime <= 0 {
		h.respondError(w, http.StatusBadRequest, "Invalid start time", err)
		return
	}

	// Parse end time
	endTime, err := strconv.ParseInt(endStr, 10, 64)
	if err != nil || endTime <= 0 {
		h.respondError(w, http.StatusBadRequest, "Invalid end time", err)
		return
	}

	// Parse limit
	limit := 100 // Default
	if limitStr != "" {
		limit, err = strconv.Atoi(limitStr)
		if err != nil || limit <= 0 {
			h.respondError(w, http.StatusBadRequest, "Invalid limit", err)
			return
		}
	}

	h.logger.Debug("Getting candles",
		zap.String("request_id", requestID),
		zap.String("symbol", symbol),
		zap.String("timeframe", timeframe),
		zap.Int64("start", startTime),
		zap.Int64("end", endTime),
		zap.Int("limit", limit),
	)

	// Get candles from service
	candles, err := h.marketDataService.GetCandles(
		ctx,
		symbol,
		timeframe,
		startTime,
		endTime,
		limit,
	)
	if err != nil {
		h.logger.Error("Failed to get candles",
			zap.Error(err),
			zap.String("request_id", requestID),
			zap.String("symbol", symbol),
		)
		h.respondError(w, http.StatusInternalServerError, "Failed to retrieve candles", err)
		return
	}

	// Build response
	response := CandlesResponse{
		Success: true,
		Data: CandlesResponseData{
			Symbol:    symbol,
			Timeframe: timeframe,
			Candles:   candles,
			Pagination: PaginationInfo{
				Total:  len(candles),
				Limit:  limit,
				Offset: 0,
			},
		},
		Meta: map[string]interface{}{
			"timestamp":  time.Now().Unix(),
			"request_id": requestID,
		},
	}

	h.respondJSON(w, http.StatusOK, response)
}

// GetHistoricalTrades godoc
// @Summary Get historical trades
// @Description Retrieve historical trades for a trading symbol with time filtering
// @Tags market-data
// @Produce json
// @Param symbol path string true "Trading symbol (e.g., BTC-USDT)"
// @Param start query int64 true "Start timestamp (Unix seconds)"
// @Param end query int64 true "End timestamp (Unix seconds)"
// @Param limit query int false "Maximum number of trades to return" default(100)
// @Param offset query int false "Number of trades to skip" default(0)
// @Success 200 {object} HistoricalTradesResponse
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/v1/historical/trades/{symbol} [get]
func (h *MarketDataHandler) GetHistoricalTrades(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := r.Context().Value("request_id").(string)

	// Get symbol from URL
	symbol := chi.URLParam(r, "symbol")
	if symbol == "" {
		h.respondError(w, http.StatusBadRequest, "Symbol is required", nil)
		return
	}

	// Get query parameters
	startStr := r.URL.Query().Get("start")
	endStr := r.URL.Query().Get("end")
	limitStr := r.URL.Query().Get("limit")
	offsetStr := r.URL.Query().Get("offset")

	// Parse start time
	startTime, err := strconv.ParseInt(startStr, 10, 64)
	if err != nil || startTime <= 0 {
		h.respondError(w, http.StatusBadRequest, "Invalid start time", err)
		return
	}

	// Parse end time
	endTime, err := strconv.ParseInt(endStr, 10, 64)
	if err != nil || endTime <= 0 {
		h.respondError(w, http.StatusBadRequest, "Invalid end time", err)
		return
	}

	// Parse limit
	limit := 100 // Default
	if limitStr != "" {
		limit, err = strconv.Atoi(limitStr)
		if err != nil || limit <= 0 {
			h.respondError(w, http.StatusBadRequest, "Invalid limit", err)
			return
		}
	}

	// Parse offset
	offset := 0 // Default
	if offsetStr != "" {
		offset, err = strconv.Atoi(offsetStr)
		if err != nil || offset < 0 {
			h.respondError(w, http.StatusBadRequest, "Invalid offset", err)
			return
		}
	}

	h.logger.Debug("Getting historical trades",
		zap.String("request_id", requestID),
		zap.String("symbol", symbol),
		zap.Int64("start", startTime),
		zap.Int64("end", endTime),
		zap.Int("limit", limit),
		zap.Int("offset", offset),
	)

	// Get trades from service
	trades, total, err := h.marketDataService.GetHistoricalTrades(
		ctx,
		symbol,
		startTime,
		endTime,
		limit,
		offset,
	)
	if err != nil {
		h.logger.Error("Failed to get historical trades",
			zap.Error(err),
			zap.String("request_id", requestID),
			zap.String("symbol", symbol),
		)
		h.respondError(w, http.StatusInternalServerError, "Failed to retrieve historical trades", err)
		return
	}

	// Convert trades to response format
	tradeInfos := make([]TradeInfo, len(trades))
	for i, trade := range trades {
		side := "sell"
		if trade.IsBuyerMaker {
			side = "buy"
		}

		tradeInfos[i] = TradeInfo{
			ID:        trade.ID.String(),
			Price:     trade.Price.String(),
			Quantity:  trade.Quantity.String(),
			Side:      side,
			Timestamp: trade.ExecutedAt.Unix(),
			BuyerFee:  trade.BuyerFee.String(),
			SellerFee: trade.SellerFee.String(),
		}
	}

	// Build response
	response := HistoricalTradesResponse{
		Success: true,
		Data: HistoricalTradesResponseData{
			Symbol: symbol,
			Trades: tradeInfos,
			Pagination: PaginationInfo{
				Total:  total,
				Limit:  limit,
				Offset: offset,
			},
		},
		Meta: map[string]interface{}{
			"timestamp":  time.Now().Unix(),
			"request_id": requestID,
		},
	}

	h.respondJSON(w, http.StatusOK, response)
}

// Get24hStats godoc
// @Summary Get 24-hour statistics
// @Description Retrieve 24-hour market statistics for a trading symbol
// @Tags market-data
// @Produce json
// @Param symbol path string true "Trading symbol (e.g., BTC-USDT)"
// @Success 200 {object} Statistics24hResponse
// @Failure 400 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/v1/statistics/24h/{symbol} [get]
func (h *MarketDataHandler) Get24hStats(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := r.Context().Value("request_id").(string)

	// Get symbol from URL
	symbol := chi.URLParam(r, "symbol")
	if symbol == "" {
		h.respondError(w, http.StatusBadRequest, "Symbol is required", nil)
		return
	}

	h.logger.Debug("Getting 24h statistics",
		zap.String("request_id", requestID),
		zap.String("symbol", symbol),
	)

	// Get statistics from service
	stats, err := h.marketDataService.Get24hStats(ctx, symbol)
	if err != nil {
		h.logger.Error("Failed to get 24h statistics",
			zap.Error(err),
			zap.String("request_id", requestID),
			zap.String("symbol", symbol),
		)
		h.respondError(w, http.StatusInternalServerError, "Failed to retrieve statistics", err)
		return
	}

	// Build response
	response := Statistics24hResponse{
		Success: true,
		Data: Statistics24hResponseData{
			Symbol:   symbol,
			Stats24h: stats,
		},
		Meta: map[string]interface{}{
			"timestamp":  time.Now().Unix(),
			"request_id": requestID,
		},
	}

	h.respondJSON(w, http.StatusOK, response)
}

// Helper functions

func (h *MarketDataHandler) respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(data); err != nil {
		h.logger.Error("Failed to encode JSON response", zap.Error(err))
	}
}

func (h *MarketDataHandler) respondError(w http.ResponseWriter, status int, message string, err error) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)

	errResp := ErrorResponse{
		Error:   message,
		Code:    http.StatusText(status),
		Details: make(map[string]interface{}),
	}

	if err != nil {
		errResp.Details["error"] = err.Error()
	}

	if err := json.NewEncoder(w).Encode(errResp); err != nil {
		h.logger.Error("Failed to encode error response", zap.Error(err))
	}
}
