// ============================================================================
// MYTRADER TRADE ENGINE - WEBSOCKET CONNECTION MANAGER
// ============================================================================
// Component: Manages WebSocket client connections and subscriptions
// Version: 1.0
// Purpose: Track connected clients, manage subscriptions, and route messages
// Performance: Supports 100+ concurrent connections
// ============================================================================

package websocket

import (
	"context"
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"go.uber.org/zap"
)

const (
	// Message queue size per client
	messageQueueSize = 100

	// Read/write timeouts
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingInterval   = 30 * time.Second
	maxMessageSize = 1024 * 1024 // 1MB
)

// Client represents a connected WebSocket client
type Client struct {
	ID            string
	UserID        uuid.UUID
	Conn          *websocket.Conn
	SendQueue     chan []byte
	Subscriptions map[string]*Subscription
	mu            sync.RWMutex
	logger        *zap.Logger
	closed        bool
	closeMu       sync.Mutex
}

// Subscription represents a client's subscription to an event stream
type Subscription struct {
	StreamType StreamType
	Symbol     string // empty for non-symbol-specific streams
}

// ConnectionManager manages all WebSocket connections and message routing
type ConnectionManager struct {
	clients       map[string]*Client
	mu            sync.RWMutex
	logger        *zap.Logger
	upgrader      websocket.Upgrader
	ctx           context.Context
	cancel        context.CancelFunc

	// Event channels for broadcasting
	orderUpdates     chan *OrderUpdateMessage
	tradeExecutions  chan *TradeExecutedMessage
	orderBookChanges chan *OrderBookUpdateMessage
}

// NewConnectionManager creates a new connection manager
func NewConnectionManager(logger *zap.Logger) *ConnectionManager {
	ctx, cancel := context.WithCancel(context.Background())

	return &ConnectionManager{
		clients: make(map[string]*Client),
		logger:  logger,
		upgrader: websocket.Upgrader{
			ReadBufferSize:  1024,
			WriteBufferSize: 1024,
			CheckOrigin: func(r *http.Request) bool {
				// TODO: Implement proper origin checking for production
				return true
			},
		},
		ctx:              ctx,
		cancel:           cancel,
		orderUpdates:     make(chan *OrderUpdateMessage, 1000),
		tradeExecutions:  make(chan *TradeExecutedMessage, 1000),
		orderBookChanges: make(chan *OrderBookUpdateMessage, 1000),
	}
}

// Start begins processing events
func (cm *ConnectionManager) Start() {
	cm.logger.Info("Starting WebSocket connection manager")

	// Start event processors
	go cm.processOrderUpdates()
	go cm.processTradeExecutions()
	go cm.processOrderBookChanges()
}

// Stop stops the connection manager and closes all connections
func (cm *ConnectionManager) Stop() {
	cm.logger.Info("Stopping WebSocket connection manager")
	cm.cancel()

	cm.mu.Lock()
	defer cm.mu.Unlock()

	for _, client := range cm.clients {
		cm.disconnectClient(client)
	}
}

// AddClient registers a new WebSocket client
func (cm *ConnectionManager) AddClient(conn *websocket.Conn, userID uuid.UUID) *Client {
	client := &Client{
		ID:            uuid.New().String(),
		UserID:        userID,
		Conn:          conn,
		SendQueue:     make(chan []byte, messageQueueSize),
		Subscriptions: make(map[string]*Subscription),
		logger:        cm.logger.With(zap.String("client_id", uuid.New().String())),
	}

	cm.mu.Lock()
	cm.clients[client.ID] = client
	cm.mu.Unlock()

	cm.logger.Info("Client connected",
		zap.String("client_id", client.ID),
		zap.String("user_id", userID.String()),
	)

	// Start client handlers
	go cm.readPump(client)
	go cm.writePump(client)

	return client
}

// RemoveClient unregisters a WebSocket client
func (cm *ConnectionManager) RemoveClient(clientID string) {
	cm.mu.Lock()
	client, exists := cm.clients[clientID]
	if !exists {
		cm.mu.Unlock()
		return
	}
	delete(cm.clients, clientID)
	cm.mu.Unlock()

	cm.disconnectClient(client)

	cm.logger.Info("Client disconnected",
		zap.String("client_id", clientID),
	)
}

// disconnectClient closes a client connection and cleanup resources
func (cm *ConnectionManager) disconnectClient(client *Client) {
	client.closeMu.Lock()
	defer client.closeMu.Unlock()

	if client.closed {
		return
	}

	client.closed = true
	client.Conn.Close()
	close(client.SendQueue)
}

// Subscribe adds a subscription for a client
func (cm *ConnectionManager) Subscribe(clientID string, stream StreamType, symbol string) error {
	cm.mu.RLock()
	client, exists := cm.clients[clientID]
	cm.mu.RUnlock()

	if !exists {
		return fmt.Errorf("client not found: %s", clientID)
	}

	// Validate subscription
	if stream == StreamTypeOrderBook && symbol == "" {
		return fmt.Errorf("symbol required for orderbook stream")
	}

	client.mu.Lock()
	defer client.mu.Unlock()

	subKey := string(stream)
	if symbol != "" {
		subKey = fmt.Sprintf("%s:%s", stream, symbol)
	}

	client.Subscriptions[subKey] = &Subscription{
		StreamType: stream,
		Symbol:     symbol,
	}

	client.logger.Info("Client subscribed",
		zap.String("stream", string(stream)),
		zap.String("symbol", symbol),
	)

	return nil
}

// Unsubscribe removes a subscription for a client
func (cm *ConnectionManager) Unsubscribe(clientID string, stream StreamType, symbol string) error {
	cm.mu.RLock()
	client, exists := cm.clients[clientID]
	cm.mu.RUnlock()

	if !exists {
		return fmt.Errorf("client not found: %s", clientID)
	}

	client.mu.Lock()
	defer client.mu.Unlock()

	subKey := string(stream)
	if symbol != "" {
		subKey = fmt.Sprintf("%s:%s", stream, symbol)
	}

	delete(client.Subscriptions, subKey)

	client.logger.Info("Client unsubscribed",
		zap.String("stream", string(stream)),
		zap.String("symbol", symbol),
	)

	return nil
}

// PublishOrderUpdate publishes an order update to subscribed clients
func (cm *ConnectionManager) PublishOrderUpdate(msg *OrderUpdateMessage) {
	select {
	case cm.orderUpdates <- msg:
	case <-cm.ctx.Done():
	default:
		cm.logger.Warn("Order update channel full, dropping message")
	}
}

// PublishTradeExecution publishes a trade execution to subscribed clients
func (cm *ConnectionManager) PublishTradeExecution(msg *TradeExecutedMessage) {
	select {
	case cm.tradeExecutions <- msg:
	case <-cm.ctx.Done():
	default:
		cm.logger.Warn("Trade execution channel full, dropping message")
	}
}

// PublishOrderBookChange publishes an order book change to subscribed clients
func (cm *ConnectionManager) PublishOrderBookChange(msg *OrderBookUpdateMessage) {
	select {
	case cm.orderBookChanges <- msg:
	case <-cm.ctx.Done():
	default:
		cm.logger.Warn("Order book change channel full, dropping message")
	}
}

// processOrderUpdates processes order update events
func (cm *ConnectionManager) processOrderUpdates() {
	for {
		select {
		case msg := <-cm.orderUpdates:
			cm.broadcastOrderUpdate(msg)
		case <-cm.ctx.Done():
			return
		}
	}
}

// processTradeExecutions processes trade execution events
func (cm *ConnectionManager) processTradeExecutions() {
	for {
		select {
		case msg := <-cm.tradeExecutions:
			cm.broadcastTradeExecution(msg)
		case <-cm.ctx.Done():
			return
		}
	}
}

// processOrderBookChanges processes order book change events
func (cm *ConnectionManager) processOrderBookChanges() {
	for {
		select {
		case msg := <-cm.orderBookChanges:
			cm.broadcastOrderBookChange(msg)
		case <-cm.ctx.Done():
			return
		}
	}
}

// broadcastOrderUpdate broadcasts order updates to relevant clients
func (cm *ConnectionManager) broadcastOrderUpdate(msg *OrderUpdateMessage) {
	data, err := ToJSON(msg)
	if err != nil {
		cm.logger.Error("Failed to serialize order update", zap.Error(err))
		return
	}

	cm.mu.RLock()
	defer cm.mu.RUnlock()

	// Send only to the user who owns the order
	for _, client := range cm.clients {
		if client.UserID == msg.UserID {
			client.mu.RLock()
			_, subscribed := client.Subscriptions[string(StreamTypeOrders)]
			client.mu.RUnlock()

			if subscribed {
				select {
				case client.SendQueue <- data:
				default:
					cm.logger.Warn("Client send queue full, dropping message",
						zap.String("client_id", client.ID),
					)
				}
			}
		}
	}
}

// broadcastTradeExecution broadcasts trade executions to all subscribed clients
func (cm *ConnectionManager) broadcastTradeExecution(msg *TradeExecutedMessage) {
	data, err := ToJSON(msg)
	if err != nil {
		cm.logger.Error("Failed to serialize trade execution", zap.Error(err))
		return
	}

	cm.mu.RLock()
	defer cm.mu.RUnlock()

	// Send to all clients subscribed to trades (market data)
	for _, client := range cm.clients {
		client.mu.RLock()
		_, subscribed := client.Subscriptions[string(StreamTypeTrades)]
		client.mu.RUnlock()

		if subscribed {
			select {
			case client.SendQueue <- data:
			default:
				cm.logger.Warn("Client send queue full, dropping message",
					zap.String("client_id", client.ID),
				)
			}
		}
	}
}

// broadcastOrderBookChange broadcasts order book changes to subscribed clients
func (cm *ConnectionManager) broadcastOrderBookChange(msg *OrderBookUpdateMessage) {
	data, err := ToJSON(msg)
	if err != nil {
		cm.logger.Error("Failed to serialize order book change", zap.Error(err))
		return
	}

	cm.mu.RLock()
	defer cm.mu.RUnlock()

	subKey := fmt.Sprintf("%s:%s", StreamTypeOrderBook, msg.Symbol)

	// Send to clients subscribed to this symbol's order book
	for _, client := range cm.clients {
		client.mu.RLock()
		_, subscribed := client.Subscriptions[subKey]
		client.mu.RUnlock()

		if subscribed {
			select {
			case client.SendQueue <- data:
			default:
				cm.logger.Warn("Client send queue full, dropping message",
					zap.String("client_id", client.ID),
				)
			}
		}
	}
}

// readPump reads messages from the WebSocket connection
func (cm *ConnectionManager) readPump(client *Client) {
	defer cm.RemoveClient(client.ID)

	client.Conn.SetReadDeadline(time.Now().Add(pongWait))
	client.Conn.SetPongHandler(func(string) error {
		client.Conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})
	client.Conn.SetReadLimit(maxMessageSize)

	for {
		_, message, err := client.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				client.logger.Error("WebSocket read error", zap.Error(err))
			}
			break
		}

		// Parse subscription message
		var subMsg SubscriptionMessage
		if err := FromJSON(message, &subMsg); err != nil {
			client.logger.Warn("Invalid subscription message", zap.Error(err))
			cm.sendError(client, "INVALID_MESSAGE", "Invalid message format")
			continue
		}

		// Handle subscription/unsubscription
		cm.handleSubscriptionMessage(client, &subMsg)
	}
}

// writePump writes messages to the WebSocket connection
func (cm *ConnectionManager) writePump(client *Client) {
	ticker := time.NewTicker(pingInterval)
	defer func() {
		ticker.Stop()
		client.Conn.Close()
	}()

	for {
		select {
		case message, ok := <-client.SendQueue:
			client.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				client.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			if err := client.Conn.WriteMessage(websocket.TextMessage, message); err != nil {
				return
			}

		case <-ticker.C:
			client.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := client.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// handleSubscriptionMessage handles subscription/unsubscription requests
func (cm *ConnectionManager) handleSubscriptionMessage(client *Client, msg *SubscriptionMessage) {
	var err error
	var response *SubscriptionResponseMessage

	switch msg.Action {
	case "subscribe":
		err = cm.Subscribe(client.ID, msg.Stream, msg.Symbol)
		if err != nil {
			response = NewSubscriptionResponse(MessageTypeSubscribed, msg.Stream, msg.Symbol, false, err.Error())
		} else {
			response = NewSubscriptionResponse(MessageTypeSubscribed, msg.Stream, msg.Symbol, true, "Successfully subscribed")
		}

	case "unsubscribe":
		err = cm.Unsubscribe(client.ID, msg.Stream, msg.Symbol)
		if err != nil {
			response = NewSubscriptionResponse(MessageTypeUnsubscribed, msg.Stream, msg.Symbol, false, err.Error())
		} else {
			response = NewSubscriptionResponse(MessageTypeUnsubscribed, msg.Stream, msg.Symbol, true, "Successfully unsubscribed")
		}

	default:
		cm.sendError(client, "INVALID_ACTION", "Invalid action: "+msg.Action)
		return
	}

	// Send response
	data, err := ToJSON(response)
	if err != nil {
		client.logger.Error("Failed to serialize subscription response", zap.Error(err))
		return
	}

	select {
	case client.SendQueue <- data:
	default:
		client.logger.Warn("Client send queue full, dropping subscription response")
	}
}

// sendError sends an error message to a client
func (cm *ConnectionManager) sendError(client *Client, code, message string) {
	errMsg := NewErrorMessage(code, message)
	data, err := ToJSON(errMsg)
	if err != nil {
		client.logger.Error("Failed to serialize error message", zap.Error(err))
		return
	}

	select {
	case client.SendQueue <- data:
	default:
		client.logger.Warn("Client send queue full, dropping error message")
	}
}

// GetStats returns statistics about connected clients
func (cm *ConnectionManager) GetStats() map[string]interface{} {
	cm.mu.RLock()
	defer cm.mu.RUnlock()

	return map[string]interface{}{
		"total_clients":       len(cm.clients),
		"order_updates_queue": len(cm.orderUpdates),
		"trades_queue":        len(cm.tradeExecutions),
		"orderbook_queue":     len(cm.orderBookChanges),
	}
}
