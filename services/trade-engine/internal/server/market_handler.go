package server

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/shopspring/decimal"
	"go.uber.org/zap"

	"github.com/mytrader/trade-engine/internal/matching"
	"github.com/mytrader/trade-engine/internal/repository"
)

// MarketHandler handles market data related HTTP requests
type MarketHandler struct {
	matchingEngine *matching.MatchingEngine
	tradeRepo      repository.TradeRepository
	logger         *zap.Logger
}

// NewMarketHandler creates a new MarketHandler
func NewMarketHandler(
	matchingEngine *matching.MatchingEngine,
	tradeRepo repository.TradeRepository,
	logger *zap.Logger,
) *MarketHandler {
	return &MarketHandler{
		matchingEngine: matchingEngine,
		tradeRepo:      tradeRepo,
		logger:         logger,
	}
}

// TickerResponse represents market ticker data
type TickerResponse struct {
	Symbol            string  `json:"symbol"`
	LastPrice         *string `json:"last_price,omitempty"`
	BestBidPrice      *string `json:"best_bid_price,omitempty"`
	BestAskPrice      *string `json:"best_ask_price,omitempty"`
	BestBidVolume     *string `json:"best_bid_volume,omitempty"`
	BestAskVolume     *string `json:"best_ask_volume,omitempty"`
	Spread            *string `json:"spread,omitempty"`
	SpreadPercentage  *string `json:"spread_percentage,omitempty"`
	TotalBidsVolume   string  `json:"total_bids_volume"`
	TotalAsksVolume   string  `json:"total_asks_volume"`
	Timestamp         string  `json:"timestamp"`
}

// GetTicker godoc
// @Summary Get market ticker
// @Description Retrieve current market ticker data for a symbol
// @Tags market
// @Produce json
// @Param symbol path string true "Trading symbol (e.g., BTC-USDT)"
// @Success 200 {object} TickerResponse
// @Failure 400 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/v1/markets/{symbol}/ticker [get]
func (h *MarketHandler) GetTicker(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Get symbol from URL
	symbol := chi.URLParam(r, "symbol")
	if symbol == "" {
		h.respondError(w, http.StatusBadRequest, "Symbol is required", nil)
		return
	}

	// Get order book snapshot for best bid/ask
	snapshot := h.matchingEngine.GetOrderBookSnapshot(symbol, 1)
	if snapshot == nil {
		h.respondError(w, http.StatusNotFound, "Market not found for symbol", nil)
		return
	}

	// Build ticker response
	response := &TickerResponse{
		Symbol:    symbol,
		Timestamp: snapshot.Timestamp.Format("2006-01-02T15:04:05Z07:00"),
	}

	// Calculate total volumes from full order book
	fullSnapshot := h.matchingEngine.GetOrderBookSnapshot(symbol, 100)
	if fullSnapshot != nil {
		totalBidsVolume := decimal.Zero
		totalAsksVolume := decimal.Zero

		for _, bid := range fullSnapshot.Bids {
			vol, err := decimal.NewFromString(bid.Volume)
			if err == nil {
				totalBidsVolume = totalBidsVolume.Add(vol)
			}
		}

		for _, ask := range fullSnapshot.Asks {
			vol, err := decimal.NewFromString(ask.Volume)
			if err == nil {
				totalAsksVolume = totalAsksVolume.Add(vol)
			}
		}

		response.TotalBidsVolume = totalBidsVolume.String()
		response.TotalAsksVolume = totalAsksVolume.String()
	} else {
		response.TotalBidsVolume = "0"
		response.TotalAsksVolume = "0"
	}

	// Best bid (highest buy price)
	if len(snapshot.Bids) > 0 {
		bestBid := snapshot.Bids[0]
		response.BestBidPrice = &bestBid.Price
		response.BestBidVolume = &bestBid.Volume
	}

	// Best ask (lowest sell price)
	if len(snapshot.Asks) > 0 {
		bestAsk := snapshot.Asks[0]
		response.BestAskPrice = &bestAsk.Price
		response.BestAskVolume = &bestAsk.Volume
	}

	// Calculate spread if both bid and ask exist
	if response.BestBidPrice != nil && response.BestAskPrice != nil {
		bidPrice, err1 := decimal.NewFromString(*response.BestBidPrice)
		askPrice, err2 := decimal.NewFromString(*response.BestAskPrice)

		if err1 == nil && err2 == nil && bidPrice.GreaterThan(decimal.Zero) {
			spread := askPrice.Sub(bidPrice)
			spreadStr := spread.String()
			response.Spread = &spreadStr

			// Calculate spread percentage: (spread / bid) * 100
			spreadPercentage := spread.Div(bidPrice).Mul(decimal.NewFromInt(100))
			spreadPctStr := spreadPercentage.StringFixed(2)
			response.SpreadPercentage = &spreadPctStr
		}
	}

	// Get last trade price
	recentTrades, err := h.tradeRepo.GetBySymbol(ctx, symbol, 1)
	if err == nil && len(recentTrades) > 0 {
		lastPrice := recentTrades[0].Price.String()
		response.LastPrice = &lastPrice
	}

	h.logger.Debug("Ticker retrieved",
		zap.String("symbol", symbol),
		zap.Bool("has_bid", response.BestBidPrice != nil),
		zap.Bool("has_ask", response.BestAskPrice != nil),
		zap.Bool("has_last_price", response.LastPrice != nil),
	)

	h.respondJSON(w, http.StatusOK, response)
}

// Helper functions

func (h *MarketHandler) respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(data); err != nil {
		h.logger.Error("Failed to encode JSON response", zap.Error(err))
	}
}

func (h *MarketHandler) respondError(w http.ResponseWriter, status int, message string, err error) {
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
