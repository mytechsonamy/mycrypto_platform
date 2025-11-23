// ============================================================================
// MYTRADER TRADE ENGINE - WEBSOCKET HANDLERS
// ============================================================================
// Component: HTTP handlers for WebSocket upgrade and connection management
// Version: 1.0
// Purpose: Handle WebSocket upgrade requests for different event streams
// ============================================================================

package server

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"go.uber.org/zap"

	ws "github.com/mytrader/trade-engine/internal/websocket"
)

// WebSocketHandler handles WebSocket connection requests
type WebSocketHandler struct {
	connectionManager *ws.ConnectionManager
	logger            *zap.Logger
	upgrader          websocket.Upgrader
}

// NewWebSocketHandler creates a new WebSocket handler
func NewWebSocketHandler(connectionManager *ws.ConnectionManager, logger *zap.Logger) *WebSocketHandler {
	return &WebSocketHandler{
		connectionManager: connectionManager,
		logger:            logger.With(zap.String("handler", "websocket")),
		upgrader: websocket.Upgrader{
			ReadBufferSize:  1024,
			WriteBufferSize: 1024,
			CheckOrigin: func(r *http.Request) bool {
				// TODO: Implement proper CORS origin checking for production
				// For now, allow all origins
				return true
			},
		},
	}
}

// HandleOrdersStream handles WebSocket connections for order updates
// GET /ws/orders
func (h *WebSocketHandler) HandleOrdersStream(w http.ResponseWriter, r *http.Request) {
	// Extract user ID from context (set by authentication middleware)
	// For now, we'll use a header or query parameter
	userIDStr := r.Header.Get("X-User-ID")
	if userIDStr == "" {
		userIDStr = r.URL.Query().Get("user_id")
	}

	if userIDStr == "" {
		h.logger.Warn("Missing user ID in WebSocket request")
		http.Error(w, "Missing user_id", http.StatusBadRequest)
		return
	}

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		h.logger.Warn("Invalid user ID format", zap.String("user_id", userIDStr), zap.Error(err))
		http.Error(w, "Invalid user_id format", http.StatusBadRequest)
		return
	}

	// Upgrade HTTP connection to WebSocket
	conn, err := h.upgrader.Upgrade(w, r, nil)
	if err != nil {
		h.logger.Error("Failed to upgrade connection", zap.Error(err))
		return
	}

	// Add client to connection manager
	client := h.connectionManager.AddClient(conn, userID)

	// Auto-subscribe to orders stream
	if err := h.connectionManager.Subscribe(client.ID, ws.StreamTypeOrders, ""); err != nil {
		h.logger.Error("Failed to auto-subscribe client to orders",
			zap.String("client_id", client.ID),
			zap.Error(err),
		)
	}

	h.logger.Info("Client connected to orders stream",
		zap.String("client_id", client.ID),
		zap.String("user_id", userID.String()),
	)
}

// HandleTradesStream handles WebSocket connections for trade executions
// GET /ws/trades
func (h *WebSocketHandler) HandleTradesStream(w http.ResponseWriter, r *http.Request) {
	// Extract user ID (optional for public trade stream)
	userIDStr := r.Header.Get("X-User-ID")
	if userIDStr == "" {
		userIDStr = r.URL.Query().Get("user_id")
	}

	var userID uuid.UUID
	if userIDStr != "" {
		var err error
		userID, err = uuid.Parse(userIDStr)
		if err != nil {
			h.logger.Warn("Invalid user ID format", zap.String("user_id", userIDStr), zap.Error(err))
			http.Error(w, "Invalid user_id format", http.StatusBadRequest)
			return
		}
	} else {
		// Generate anonymous user ID for public streams
		userID = uuid.New()
	}

	// Upgrade HTTP connection to WebSocket
	conn, err := h.upgrader.Upgrade(w, r, nil)
	if err != nil {
		h.logger.Error("Failed to upgrade connection", zap.Error(err))
		return
	}

	// Add client to connection manager
	client := h.connectionManager.AddClient(conn, userID)

	// Auto-subscribe to trades stream
	if err := h.connectionManager.Subscribe(client.ID, ws.StreamTypeTrades, ""); err != nil {
		h.logger.Error("Failed to auto-subscribe client to trades",
			zap.String("client_id", client.ID),
			zap.Error(err),
		)
	}

	h.logger.Info("Client connected to trades stream",
		zap.String("client_id", client.ID),
		zap.String("user_id", userID.String()),
	)
}

// HandleMarketStream handles WebSocket connections for market data (order book)
// GET /ws/markets/{symbol}
func (h *WebSocketHandler) HandleMarketStream(w http.ResponseWriter, r *http.Request) {
	// Extract symbol from URL path (chi router) or query param (for testing)
	symbol := chi.URLParam(r, "symbol")
	if symbol == "" {
		symbol = r.URL.Query().Get("symbol")
	}
	if symbol == "" {
		h.logger.Warn("Missing symbol in WebSocket request")
		http.Error(w, "Missing symbol", http.StatusBadRequest)
		return
	}

	// Extract user ID (optional for public market data)
	userIDStr := r.Header.Get("X-User-ID")
	if userIDStr == "" {
		userIDStr = r.URL.Query().Get("user_id")
	}

	var userID uuid.UUID
	if userIDStr != "" {
		var err error
		userID, err = uuid.Parse(userIDStr)
		if err != nil {
			h.logger.Warn("Invalid user ID format", zap.String("user_id", userIDStr), zap.Error(err))
			http.Error(w, "Invalid user_id format", http.StatusBadRequest)
			return
		}
	} else {
		// Generate anonymous user ID for public streams
		userID = uuid.New()
	}

	// Upgrade HTTP connection to WebSocket
	conn, err := h.upgrader.Upgrade(w, r, nil)
	if err != nil {
		h.logger.Error("Failed to upgrade connection", zap.Error(err))
		return
	}

	// Add client to connection manager
	client := h.connectionManager.AddClient(conn, userID)

	// Auto-subscribe to order book stream for this symbol
	if err := h.connectionManager.Subscribe(client.ID, ws.StreamTypeOrderBook, symbol); err != nil {
		h.logger.Error("Failed to auto-subscribe client to market data",
			zap.String("client_id", client.ID),
			zap.String("symbol", symbol),
			zap.Error(err),
		)
	}

	h.logger.Info("Client connected to market stream",
		zap.String("client_id", client.ID),
		zap.String("symbol", symbol),
		zap.String("user_id", userID.String()),
	)
}

// HandleGeneralStream handles generic WebSocket connections with manual subscription
// GET /ws
func (h *WebSocketHandler) HandleGeneralStream(w http.ResponseWriter, r *http.Request) {
	// Extract user ID (optional)
	userIDStr := r.Header.Get("X-User-ID")
	if userIDStr == "" {
		userIDStr = r.URL.Query().Get("user_id")
	}

	var userID uuid.UUID
	if userIDStr != "" {
		var err error
		userID, err = uuid.Parse(userIDStr)
		if err != nil {
			h.logger.Warn("Invalid user ID format", zap.String("user_id", userIDStr), zap.Error(err))
			http.Error(w, "Invalid user_id format", http.StatusBadRequest)
			return
		}
	} else {
		// Generate anonymous user ID
		userID = uuid.New()
	}

	// Upgrade HTTP connection to WebSocket
	conn, err := h.upgrader.Upgrade(w, r, nil)
	if err != nil {
		h.logger.Error("Failed to upgrade connection", zap.Error(err))
		return
	}

	// Add client to connection manager (no auto-subscription)
	client := h.connectionManager.AddClient(conn, userID)

	h.logger.Info("Client connected to general stream",
		zap.String("client_id", client.ID),
		zap.String("user_id", userID.String()),
	)
}
