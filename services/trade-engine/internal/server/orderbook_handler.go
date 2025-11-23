package server

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/go-chi/chi/v5"
	"go.uber.org/zap"

	"github.com/mytrader/trade-engine/internal/matching"
)

// OrderBookHandler handles order book related HTTP requests
type OrderBookHandler struct {
	matchingEngine *matching.MatchingEngine
	logger         *zap.Logger
}

// NewOrderBookHandler creates a new OrderBookHandler
func NewOrderBookHandler(matchingEngine *matching.MatchingEngine, logger *zap.Logger) *OrderBookHandler {
	return &OrderBookHandler{
		matchingEngine: matchingEngine,
		logger:         logger,
	}
}

// OrderBookResponse represents the HTTP response for order book data
type OrderBookResponse struct {
	Symbol    string             `json:"symbol"`
	Bids      []PriceLevelData   `json:"bids"`
	Asks      []PriceLevelData   `json:"asks"`
	Timestamp string             `json:"timestamp"`
}

// PriceLevelData represents a price level in the order book
type PriceLevelData struct {
	Price  string `json:"price"`
	Volume string `json:"volume"`
	Count  int    `json:"count"`
}

// GetOrderBook godoc
// @Summary Get order book for a symbol
// @Description Retrieve current order book with bids and asks
// @Tags orderbook
// @Produce json
// @Param symbol path string true "Trading symbol (e.g., BTC-USDT)"
// @Param depth query int false "Number of price levels to return (default: 50, max: 100)"
// @Success 200 {object} OrderBookResponse
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/v1/orderbook/{symbol} [get]
func (h *OrderBookHandler) GetOrderBook(w http.ResponseWriter, r *http.Request) {
	// Get symbol from URL
	symbol := chi.URLParam(r, "symbol")
	if symbol == "" {
		h.respondError(w, http.StatusBadRequest, "Symbol is required", nil)
		return
	}

	// Parse depth parameter
	depth := 50 // Default depth
	if depthStr := r.URL.Query().Get("depth"); depthStr != "" {
		var parsedDepth int
		if _, err := fmt.Sscanf(depthStr, "%d", &parsedDepth); err == nil && parsedDepth > 0 {
			depth = parsedDepth
			if depth > 100 {
				depth = 100 // Max depth
			}
		}
	}

	// Get order book snapshot from matching engine
	snapshot := h.matchingEngine.GetOrderBookSnapshot(symbol, depth)
	if snapshot == nil {
		h.respondError(w, http.StatusNotFound, "Order book not found for symbol", nil)
		return
	}

	// Convert to response format
	response := &OrderBookResponse{
		Symbol:    snapshot.Symbol,
		Timestamp: snapshot.Timestamp.Format("2006-01-02T15:04:05Z07:00"),
		Bids:      make([]PriceLevelData, len(snapshot.Bids)),
		Asks:      make([]PriceLevelData, len(snapshot.Asks)),
	}

	for i, bid := range snapshot.Bids {
		response.Bids[i] = PriceLevelData{
			Price:  bid.Price,
			Volume: bid.Volume,
			Count:  bid.OrderCount,
		}
	}

	for i, ask := range snapshot.Asks {
		response.Asks[i] = PriceLevelData{
			Price:  ask.Price,
			Volume: ask.Volume,
			Count:  ask.OrderCount,
		}
	}

	h.logger.Debug("Order book retrieved",
		zap.String("symbol", symbol),
		zap.Int("depth", depth),
		zap.Int("bids", len(response.Bids)),
		zap.Int("asks", len(response.Asks)),
	)

	h.respondJSON(w, http.StatusOK, response)
}

// Helper functions

func (h *OrderBookHandler) respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(data); err != nil {
		h.logger.Error("Failed to encode JSON response", zap.Error(err))
	}
}

func (h *OrderBookHandler) respondError(w http.ResponseWriter, status int, message string, err error) {
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
