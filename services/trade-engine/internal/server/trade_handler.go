package server

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"go.uber.org/zap"

	"github.com/mytrader/trade-engine/internal/repository"
)

// TradeHandler handles trade-related HTTP requests
type TradeHandler struct {
	tradeRepo repository.TradeRepository
	logger    *zap.Logger
}

// NewTradeHandler creates a new TradeHandler
func NewTradeHandler(tradeRepo repository.TradeRepository, logger *zap.Logger) *TradeHandler {
	return &TradeHandler{
		tradeRepo: tradeRepo,
		logger:    logger,
	}
}

// ListTrades godoc
// @Summary List recent trades
// @Description Retrieve recent trades with optional filters
// @Tags trades
// @Produce json
// @Param symbol query string false "Filter by symbol (e.g., BTC-USDT)"
// @Param limit query int false "Limit number of results (default: 50, max: 500)"
// @Success 200 {array} TradeResponse
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/v1/trades [get]
func (h *TradeHandler) ListTrades(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Parse symbol filter
	symbol := r.URL.Query().Get("symbol")
	if symbol == "" {
		h.respondError(w, http.StatusBadRequest, "Symbol parameter is required", nil)
		return
	}

	// Parse limit parameter
	limit := 50 // Default limit
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		var parsedLimit int
		if _, err := fmt.Sscanf(limitStr, "%d", &parsedLimit); err == nil && parsedLimit > 0 {
			limit = parsedLimit
			if limit > 500 {
				limit = 500 // Max limit
			}
		}
	}

	// Get trades from repository
	trades, err := h.tradeRepo.GetBySymbol(ctx, symbol, limit)
	if err != nil {
		h.logger.Error("Failed to get trades",
			zap.Error(err),
			zap.String("symbol", symbol),
		)
		h.respondError(w, http.StatusInternalServerError, "Failed to retrieve trades", err)
		return
	}

	// Convert to response format
	response := make([]*TradeResponse, len(trades))
	for i, trade := range trades {
		response[i] = &TradeResponse{
			ID:             trade.ID.String(),
			Symbol:         trade.Symbol,
			Price:          trade.Price.String(),
			Quantity:       trade.Quantity.String(),
			BuyerOrderID:   trade.BuyerOrderID.String(),
			SellerOrderID:  trade.SellerOrderID.String(),
			BuyerUserID:    trade.BuyerUserID.String(),
			SellerUserID:   trade.SellerUserID.String(),
			BuyerFee:       trade.BuyerFee.String(),
			SellerFee:      trade.SellerFee.String(),
			IsBuyerMaker:   trade.IsBuyerMaker,
			ExecutedAt:     trade.ExecutedAt.Format("2006-01-02T15:04:05Z07:00"),
		}
	}

	h.logger.Debug("Trades retrieved",
		zap.String("symbol", symbol),
		zap.Int("count", len(trades)),
	)

	h.respondJSON(w, http.StatusOK, response)
}

// GetTrade godoc
// @Summary Get trade by ID
// @Description Retrieve trade details by ID
// @Tags trades
// @Produce json
// @Param id path string true "Trade ID"
// @Success 200 {object} TradeResponse
// @Failure 400 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Router /api/v1/trades/{id} [get]
func (h *TradeHandler) GetTrade(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Get trade ID from URL
	tradeIDStr := chi.URLParam(r, "id")
	tradeID, err := uuid.Parse(tradeIDStr)
	if err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid trade ID", err)
		return
	}

	// Get trade from repository
	trade, err := h.tradeRepo.GetByID(ctx, tradeID)
	if err != nil {
		if err == repository.ErrTradeNotFound {
			h.respondError(w, http.StatusNotFound, "Trade not found", err)
			return
		}
		h.logger.Error("Failed to get trade",
			zap.Error(err),
			zap.String("trade_id", tradeIDStr),
		)
		h.respondError(w, http.StatusInternalServerError, "Failed to retrieve trade", err)
		return
	}

	// Convert to response format
	response := &TradeResponse{
		ID:             trade.ID.String(),
		Symbol:         trade.Symbol,
		Price:          trade.Price.String(),
		Quantity:       trade.Quantity.String(),
		BuyerOrderID:   trade.BuyerOrderID.String(),
		SellerOrderID:  trade.SellerOrderID.String(),
		BuyerUserID:    trade.BuyerUserID.String(),
		SellerUserID:   trade.SellerUserID.String(),
		BuyerFee:       trade.BuyerFee.String(),
		SellerFee:      trade.SellerFee.String(),
		IsBuyerMaker:   trade.IsBuyerMaker,
		ExecutedAt:     trade.ExecutedAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	h.logger.Debug("Trade retrieved",
		zap.String("trade_id", tradeIDStr),
		zap.String("symbol", trade.Symbol),
	)

	h.respondJSON(w, http.StatusOK, response)
}

// Helper functions

func (h *TradeHandler) respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(data); err != nil {
		h.logger.Error("Failed to encode JSON response", zap.Error(err))
	}
}

func (h *TradeHandler) respondError(w http.ResponseWriter, status int, message string, err error) {
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
