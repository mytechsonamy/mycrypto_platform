// ============================================================================
// MYTRADER TRADE ENGINE - WEBSOCKET INTEGRATION TESTS
// ============================================================================
// Component: Comprehensive WebSocket functionality tests
// Version: 1.0
// Coverage Target: >80%
// Test Scenarios: 25+ scenarios covering all WebSocket features
// ============================================================================

package tests

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"

	"github.com/mytrader/trade-engine/internal/domain"
	"github.com/mytrader/trade-engine/internal/matching"
	"github.com/mytrader/trade-engine/internal/orderbook"
	"github.com/mytrader/trade-engine/internal/server"
	ws "github.com/mytrader/trade-engine/internal/websocket"
)

// Helper function to create a test WebSocket server
func setupWebSocketTestServer(t *testing.T) (*httptest.Server, *matching.MatchingEngine, *ws.ConnectionManager, *ws.Publisher) {
	logger, _ := zap.NewDevelopment()

	// Create matching engine
	engine := matching.NewMatchingEngine()

	// Create WebSocket components
	connManager := ws.NewConnectionManager(logger)
	connManager.Start()

	publisher := ws.NewPublisher(connManager, logger)
	publisher.Start()

	// Wire callbacks
	engine.SetOrderUpdateCallback(publisher.PublishOrderUpdate)
	engine.SetTradeCallback(publisher.PublishTradeExecution)

	// Create WebSocket handler
	wsHandler := server.NewWebSocketHandler(connManager, logger)

	// Create test HTTP server
	mux := http.NewServeMux()
	mux.HandleFunc("/ws", wsHandler.HandleGeneralStream)
	mux.HandleFunc("/ws/orders", wsHandler.HandleOrdersStream)
	mux.HandleFunc("/ws/trades", wsHandler.HandleTradesStream)
	mux.HandleFunc("/ws/markets", wsHandler.HandleMarketStream)

	srv := httptest.NewServer(mux)

	t.Cleanup(func() {
		srv.Close()
		connManager.Stop()
		publisher.Stop()
	})

	return srv, engine, connManager, publisher
}

// Helper function to connect to WebSocket
func connectWebSocket(t *testing.T, serverURL, path, userID string) *websocket.Conn {
	wsURL := "ws" + strings.TrimPrefix(serverURL, "http") + path
	if userID != "" {
		if strings.Contains(path, "?") {
			wsURL += "&user_id=" + userID
		} else {
			wsURL += "?user_id=" + userID
		}
	}

	conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	require.NoError(t, err)

	t.Cleanup(func() {
		conn.Close()
	})

	return conn
}

// ============================================================================
// CONNECTION TESTS
// ============================================================================

func TestWebSocket_ConnectAndDisconnect(t *testing.T) {
	srv, _, _, _ := setupWebSocketTestServer(t)
	userID := uuid.New().String()

	// Connect
	conn := connectWebSocket(t, srv.URL, "/ws/orders", userID)

	// Send ping
	err := conn.WriteMessage(websocket.PingMessage, []byte{})
	assert.NoError(t, err)

	// Disconnect
	err = conn.Close()
	assert.NoError(t, err)
}

func TestWebSocket_MultipleClientsSimultaneous(t *testing.T) {
	srv, _, connManager, _ := setupWebSocketTestServer(t)

	// Connect 10 clients
	clientCount := 10
	clients := make([]*websocket.Conn, clientCount)

	for i := 0; i < clientCount; i++ {
		userID := uuid.New().String()
		clients[i] = connectWebSocket(t, srv.URL, "/ws/orders", userID)
		defer clients[i].Close()
	}

	// Wait for all connections to be established
	time.Sleep(200 * time.Millisecond)

	// Verify client count
	stats := connManager.GetStats()
	assert.Equal(t, clientCount, stats["total_clients"])
}

func TestWebSocket_ClientDisconnectCleanup(t *testing.T) {
	srv, _, connManager, _ := setupWebSocketTestServer(t)
	userID := uuid.New().String()

	// Connect
	conn := connectWebSocket(t, srv.URL, "/ws/orders", userID)

	// Wait for connection to be registered
	time.Sleep(50 * time.Millisecond)

	initialStats := connManager.GetStats()
	assert.Equal(t, 1, initialStats["total_clients"])

	// Disconnect
	conn.Close()

	// Wait for cleanup
	time.Sleep(100 * time.Millisecond)

	// Verify cleanup
	finalStats := connManager.GetStats()
	assert.Equal(t, 0, finalStats["total_clients"])
}

func TestWebSocket_ErrorOnInvalidUpgrade(t *testing.T) {
	srv, _, _, _ := setupWebSocketTestServer(t)

	// Try to connect without WebSocket upgrade
	resp, err := http.Get(srv.URL + "/ws/orders?user_id=" + uuid.New().String())
	require.NoError(t, err)
	defer resp.Body.Close()

	// Should fail to upgrade
	assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
}

func TestWebSocket_MissingUserID(t *testing.T) {
	srv, _, _, _ := setupWebSocketTestServer(t)

	// Try to connect without user_id
	wsURL := "ws" + strings.TrimPrefix(srv.URL, "http") + "/ws/orders"
	_, resp, err := websocket.DefaultDialer.Dial(wsURL, nil)

	// Should return 400 Bad Request
	require.Error(t, err)
	assert.NotNil(t, resp)
	assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
}

// ============================================================================
// SUBSCRIPTION TESTS
// ============================================================================

func TestWebSocket_SubscribeToOrders(t *testing.T) {
	srv, _, _, _ := setupWebSocketTestServer(t)
	userID := uuid.New().String()

	conn := connectWebSocket(t, srv.URL, "/ws", userID)
	defer conn.Close()

	// Subscribe to orders stream
	subMsg := ws.SubscriptionMessage{
		Action: "subscribe",
		Stream: ws.StreamTypeOrders,
	}

	data, _ := json.Marshal(subMsg)
	err := conn.WriteMessage(websocket.TextMessage, data)
	require.NoError(t, err)

	// Read subscription response
	_, message, err := conn.ReadMessage()
	require.NoError(t, err)

	var response ws.SubscriptionResponseMessage
	err = json.Unmarshal(message, &response)
	require.NoError(t, err)

	assert.Equal(t, ws.MessageTypeSubscribed, response.Type)
	assert.True(t, response.Success)
}

func TestWebSocket_SubscribeToTrades(t *testing.T) {
	srv, _, _, _ := setupWebSocketTestServer(t)
	userID := uuid.New().String()

	conn := connectWebSocket(t, srv.URL, "/ws", userID)
	defer conn.Close()

	// Subscribe to trades stream
	subMsg := ws.SubscriptionMessage{
		Action: "subscribe",
		Stream: ws.StreamTypeTrades,
	}

	data, _ := json.Marshal(subMsg)
	err := conn.WriteMessage(websocket.TextMessage, data)
	require.NoError(t, err)

	// Read subscription response
	_, message, err := conn.ReadMessage()
	require.NoError(t, err)

	var response ws.SubscriptionResponseMessage
	err = json.Unmarshal(message, &response)
	require.NoError(t, err)

	assert.Equal(t, ws.MessageTypeSubscribed, response.Type)
	assert.True(t, response.Success)
}

func TestWebSocket_SubscribeToOrderBook(t *testing.T) {
	srv, _, _, _ := setupWebSocketTestServer(t)
	userID := uuid.New().String()

	conn := connectWebSocket(t, srv.URL, "/ws", userID)
	defer conn.Close()

	// Subscribe to order book stream
	subMsg := ws.SubscriptionMessage{
		Action: "subscribe",
		Stream: ws.StreamTypeOrderBook,
		Symbol: "BTC/USDT",
	}

	data, _ := json.Marshal(subMsg)
	err := conn.WriteMessage(websocket.TextMessage, data)
	require.NoError(t, err)

	// Read subscription response
	_, message, err := conn.ReadMessage()
	require.NoError(t, err)

	var response ws.SubscriptionResponseMessage
	err = json.Unmarshal(message, &response)
	require.NoError(t, err)

	assert.Equal(t, ws.MessageTypeSubscribed, response.Type)
	assert.True(t, response.Success)
	assert.Equal(t, "BTC/USDT", response.Symbol)
}

func TestWebSocket_UnsubscribeFromStream(t *testing.T) {
	srv, _, _, _ := setupWebSocketTestServer(t)
	userID := uuid.New().String()

	conn := connectWebSocket(t, srv.URL, "/ws", userID)
	defer conn.Close()

	// Subscribe first
	subMsg := ws.SubscriptionMessage{
		Action: "subscribe",
		Stream: ws.StreamTypeOrders,
	}
	data, _ := json.Marshal(subMsg)
	conn.WriteMessage(websocket.TextMessage, data)
	conn.ReadMessage() // Read subscribe response

	// Unsubscribe
	unsubMsg := ws.SubscriptionMessage{
		Action: "unsubscribe",
		Stream: ws.StreamTypeOrders,
	}
	data, _ = json.Marshal(unsubMsg)
	err := conn.WriteMessage(websocket.TextMessage, data)
	require.NoError(t, err)

	// Read unsubscribe response
	_, message, err := conn.ReadMessage()
	require.NoError(t, err)

	var response ws.SubscriptionResponseMessage
	err = json.Unmarshal(message, &response)
	require.NoError(t, err)

	assert.Equal(t, ws.MessageTypeUnsubscribed, response.Type)
	assert.True(t, response.Success)
}

func TestWebSocket_MultipleSubscriptions(t *testing.T) {
	srv, _, _, _ := setupWebSocketTestServer(t)
	userID := uuid.New().String()

	conn := connectWebSocket(t, srv.URL, "/ws", userID)
	defer conn.Close()

	streams := []ws.StreamType{ws.StreamTypeOrders, ws.StreamTypeTrades}

	for _, stream := range streams {
		subMsg := ws.SubscriptionMessage{
			Action: "subscribe",
			Stream: stream,
		}
		data, _ := json.Marshal(subMsg)
		err := conn.WriteMessage(websocket.TextMessage, data)
		require.NoError(t, err)

		// Read response
		_, message, err := conn.ReadMessage()
		require.NoError(t, err)

		var response ws.SubscriptionResponseMessage
		err = json.Unmarshal(message, &response)
		require.NoError(t, err)

		assert.True(t, response.Success)
	}
}

// ============================================================================
// MESSAGE TESTS
// ============================================================================

func TestWebSocket_OrderUpdateMessage(t *testing.T) {
	srv, engine, _, _ := setupWebSocketTestServer(t)
	userID := uuid.New()

	conn := connectWebSocket(t, srv.URL, "/ws/orders", userID.String())
	defer conn.Close()

	// Wait for connection to be established
	time.Sleep(50 * time.Millisecond)

	// Place an order
	price := decimal.NewFromFloat(50000)
	order := &domain.Order{
		UserID:      userID,
		Symbol:      "BTC/USDT",
		Side:        domain.OrderSideBuy,
		Type:        domain.OrderTypeLimit,
		Quantity:    decimal.NewFromFloat(1.0),
		Price:       &price,
		TimeInForce: domain.TimeInForceGTC,
	}

	_, err := engine.PlaceOrder(order)
	require.NoError(t, err)

	// Read order update message
	conn.SetReadDeadline(time.Now().Add(2 * time.Second))
	_, message, err := conn.ReadMessage()
	require.NoError(t, err)

	var orderUpdate ws.OrderUpdateMessage
	err = json.Unmarshal(message, &orderUpdate)
	require.NoError(t, err)

	assert.Equal(t, ws.MessageTypeOrderUpdate, orderUpdate.Type)
	assert.Equal(t, "created", orderUpdate.Action)
	assert.Equal(t, order.ID, orderUpdate.OrderID)
	assert.Equal(t, userID, orderUpdate.UserID)
	assert.Equal(t, "BTC/USDT", orderUpdate.Symbol)
}

func TestWebSocket_TradeExecutedMessage(t *testing.T) {
	srv, engine, _, _ := setupWebSocketTestServer(t)
	buyerID := uuid.New()
	sellerID := uuid.New()

	// Connect as buyer and seller
	buyerConn := connectWebSocket(t, srv.URL, "/ws/trades", buyerID.String())
	defer buyerConn.Close()

	sellerConn := connectWebSocket(t, srv.URL, "/ws/trades", sellerID.String())
	defer sellerConn.Close()

	// Wait for connections
	time.Sleep(50 * time.Millisecond)

	// Place matching orders
	buyPrice := decimal.NewFromFloat(50000)
	buyOrder := &domain.Order{
		UserID:      buyerID,
		Symbol:      "BTC/USDT",
		Side:        domain.OrderSideBuy,
		Type:        domain.OrderTypeLimit,
		Quantity:    decimal.NewFromFloat(1.0),
		Price:       &buyPrice,
		TimeInForce: domain.TimeInForceGTC,
	}

	sellPrice := decimal.NewFromFloat(50000)
	sellOrder := &domain.Order{
		UserID:      sellerID,
		Symbol:      "BTC/USDT",
		Side:        domain.OrderSideSell,
		Type:        domain.OrderTypeLimit,
		Quantity:    decimal.NewFromFloat(1.0),
		Price:       &sellPrice,
		TimeInForce: domain.TimeInForceGTC,
	}

	// Place buy order first (goes into book)
	engine.PlaceOrder(buyOrder)

	// Place sell order (matches)
	engine.PlaceOrder(sellOrder)

	// Both clients should receive trade message
	buyerConn.SetReadDeadline(time.Now().Add(2 * time.Second))
	_, message, err := buyerConn.ReadMessage()
	require.NoError(t, err)

	var tradeMsg ws.TradeExecutedMessage
	err = json.Unmarshal(message, &tradeMsg)
	require.NoError(t, err)

	assert.Equal(t, ws.MessageTypeTradeExecuted, tradeMsg.Type)
	assert.Equal(t, "BTC/USDT", tradeMsg.Symbol)
	assert.Equal(t, "50000", tradeMsg.Price)
	assert.Equal(t, "1", tradeMsg.Quantity)
}

func TestWebSocket_OrderBookUpdateMessage(t *testing.T) {
	srv, _, _, publisher := setupWebSocketTestServer(t)
	userID := uuid.New()

	conn := connectWebSocket(t, srv.URL, "/ws/markets?symbol=BTC/USDT", userID.String())
	defer conn.Close()

	// Wait for connection
	time.Sleep(50 * time.Millisecond)

	// Create order book and publish update
	ob := orderbook.NewOrderBook("BTC/USDT")
	publisher.PublishOrderBookChange("BTC/USDT", ob)

	// Read message
	conn.SetReadDeadline(time.Now().Add(2 * time.Second))
	_, message, err := conn.ReadMessage()
	require.NoError(t, err)

	var obMsg ws.OrderBookUpdateMessage
	err = json.Unmarshal(message, &obMsg)
	require.NoError(t, err)

	assert.Equal(t, ws.MessageTypeOrderBookUpdate, obMsg.Type)
	assert.Equal(t, "BTC/USDT", obMsg.Symbol)
}

func TestWebSocket_MessageFormatting(t *testing.T) {
	msg := ws.NewOrderUpdateMessage(
		"created",
		uuid.New(),
		uuid.New(),
		"BTC/USDT",
		"BUY",
		"OPEN",
		decimal.NewFromFloat(1.0),
		decimal.Zero,
		nil,
	)

	data, err := ws.ToJSON(msg)
	require.NoError(t, err)
	assert.Contains(t, string(data), `"type":"order_update"`)
	assert.Contains(t, string(data), `"action":"created"`)
}

// ============================================================================
// BROADCASTING TESTS
// ============================================================================

func TestWebSocket_BroadcastToAllClients(t *testing.T) {
	srv, engine, _, _ := setupWebSocketTestServer(t)

	// Connect 3 clients to trades stream
	clients := make([]*websocket.Conn, 3)
	for i := 0; i < 3; i++ {
		clients[i] = connectWebSocket(t, srv.URL, "/ws/trades", uuid.New().String())
		defer clients[i].Close()
	}

	time.Sleep(100 * time.Millisecond)

	// Place matching orders to trigger trade
	buyPrice := decimal.NewFromFloat(50000)
	buyOrder := &domain.Order{
		UserID:      uuid.New(),
		Symbol:      "BTC/USDT",
		Side:        domain.OrderSideBuy,
		Type:        domain.OrderTypeLimit,
		Quantity:    decimal.NewFromFloat(1.0),
		Price:       &buyPrice,
		TimeInForce: domain.TimeInForceGTC,
	}

	sellPrice := decimal.NewFromFloat(50000)
	sellOrder := &domain.Order{
		UserID:      uuid.New(),
		Symbol:      "BTC/USDT",
		Side:        domain.OrderSideSell,
		Type:        domain.OrderTypeLimit,
		Quantity:    decimal.NewFromFloat(1.0),
		Price:       &sellPrice,
		TimeInForce: domain.TimeInForceGTC,
	}

	engine.PlaceOrder(buyOrder)
	engine.PlaceOrder(sellOrder)

	// All clients should receive the trade message
	receivedCount := 0
	for _, client := range clients {
		client.SetReadDeadline(time.Now().Add(2 * time.Second))
		_, message, err := client.ReadMessage()
		if err == nil {
			var tradeMsg ws.TradeExecutedMessage
			if json.Unmarshal(message, &tradeMsg) == nil {
				receivedCount++
			}
		}
	}

	assert.Equal(t, 3, receivedCount, "All clients should receive trade message")
}

func TestWebSocket_FilterByUserID(t *testing.T) {
	srv, engine, _, _ := setupWebSocketTestServer(t)
	user1ID := uuid.New()
	user2ID := uuid.New()

	// Connect two clients to orders stream
	user1Conn := connectWebSocket(t, srv.URL, "/ws/orders", user1ID.String())
	defer user1Conn.Close()

	user2Conn := connectWebSocket(t, srv.URL, "/ws/orders", user2ID.String())
	defer user2Conn.Close()

	time.Sleep(50 * time.Millisecond)

	// Place order for user1
	price := decimal.NewFromFloat(50000)
	order := &domain.Order{
		UserID:      user1ID,
		Symbol:      "BTC/USDT",
		Side:        domain.OrderSideBuy,
		Type:        domain.OrderTypeLimit,
		Quantity:    decimal.NewFromFloat(1.0),
		Price:       &price,
		TimeInForce: domain.TimeInForceGTC,
	}

	engine.PlaceOrder(order)

	// User1 should receive message
	user1Conn.SetReadDeadline(time.Now().Add(1 * time.Second))
	_, message, err := user1Conn.ReadMessage()
	require.NoError(t, err)

	var orderUpdate ws.OrderUpdateMessage
	err = json.Unmarshal(message, &orderUpdate)
	require.NoError(t, err)
	assert.Equal(t, user1ID, orderUpdate.UserID)

	// User2 should NOT receive message (different user)
	user2Conn.SetReadDeadline(time.Now().Add(500 * time.Millisecond))
	_, _, err = user2Conn.ReadMessage()
	assert.Error(t, err, "User2 should not receive user1's order update")
}

func TestWebSocket_FilterBySymbol(t *testing.T) {
	srv, _, _, publisher := setupWebSocketTestServer(t)

	// Connect two clients to different symbols
	btcConn := connectWebSocket(t, srv.URL, "/ws/markets?symbol=BTC/USDT", uuid.New().String())
	defer btcConn.Close()

	ethConn := connectWebSocket(t, srv.URL, "/ws/markets?symbol=ETH/USDT", uuid.New().String())
	defer ethConn.Close()

	time.Sleep(50 * time.Millisecond)

	// Publish BTC order book update
	btcOB := orderbook.NewOrderBook("BTC/USDT")
	publisher.PublishOrderBookChange("BTC/USDT", btcOB)

	// BTC client should receive message
	btcConn.SetReadDeadline(time.Now().Add(1 * time.Second))
	_, message, err := btcConn.ReadMessage()
	require.NoError(t, err)

	var obMsg ws.OrderBookUpdateMessage
	err = json.Unmarshal(message, &obMsg)
	require.NoError(t, err)
	assert.Equal(t, "BTC/USDT", obMsg.Symbol)

	// ETH client should NOT receive message (different symbol)
	ethConn.SetReadDeadline(time.Now().Add(500 * time.Millisecond))
	_, _, err = ethConn.ReadMessage()
	assert.Error(t, err, "ETH client should not receive BTC updates")
}

func TestWebSocket_ConcurrentBroadcasting(t *testing.T) {
	srv, engine, _, _ := setupWebSocketTestServer(t)

	// Connect multiple clients
	clientCount := 10
	clients := make([]*websocket.Conn, clientCount)
	for i := 0; i < clientCount; i++ {
		clients[i] = connectWebSocket(t, srv.URL, "/ws/trades", uuid.New().String())
		defer clients[i].Close()
	}

	time.Sleep(100 * time.Millisecond)

	// Place multiple orders concurrently
	var wg sync.WaitGroup
	orderCount := 5

	for i := 0; i < orderCount; i++ {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()

			buyPrice := decimal.NewFromFloat(50000 + float64(idx))
			buyOrder := &domain.Order{
				UserID:      uuid.New(),
				Symbol:      "BTC/USDT",
				Side:        domain.OrderSideBuy,
				Type:        domain.OrderTypeLimit,
				Quantity:    decimal.NewFromFloat(1.0),
				Price:       &buyPrice,
				TimeInForce: domain.TimeInForceGTC,
			}

			sellPrice := decimal.NewFromFloat(50000 + float64(idx))
			sellOrder := &domain.Order{
				UserID:      uuid.New(),
				Symbol:      "BTC/USDT",
				Side:        domain.OrderSideSell,
				Type:        domain.OrderTypeLimit,
				Quantity:    decimal.NewFromFloat(1.0),
				Price:       &sellPrice,
				TimeInForce: domain.TimeInForceGTC,
			}

			engine.PlaceOrder(buyOrder)
			time.Sleep(10 * time.Millisecond)
			engine.PlaceOrder(sellOrder)
		}(i)
	}

	wg.Wait()

	// Verify clients received messages (at least some)
	receivedCount := 0
	for _, client := range clients {
		client.SetReadDeadline(time.Now().Add(2 * time.Second))
		for {
			_, _, err := client.ReadMessage()
			if err != nil {
				break
			}
			receivedCount++
		}
	}

	assert.Greater(t, receivedCount, 0, "Clients should receive broadcast messages")
}

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

func TestWebSocket_PlaceOrder_SendsUpdate(t *testing.T) {
	srv, engine, _, _ := setupWebSocketTestServer(t)
	userID := uuid.New()

	conn := connectWebSocket(t, srv.URL, "/ws/orders", userID.String())
	defer conn.Close()

	time.Sleep(50 * time.Millisecond)

	// Place order
	price := decimal.NewFromFloat(50000)
	order := &domain.Order{
		UserID:      userID,
		Symbol:      "BTC/USDT",
		Side:        domain.OrderSideBuy,
		Type:        domain.OrderTypeLimit,
		Quantity:    decimal.NewFromFloat(1.0),
		Price:       &price,
		TimeInForce: domain.TimeInForceGTC,
	}

	_, err := engine.PlaceOrder(order)
	require.NoError(t, err)

	// Verify order update received
	conn.SetReadDeadline(time.Now().Add(2 * time.Second))
	_, message, err := conn.ReadMessage()
	require.NoError(t, err)

	var orderUpdate ws.OrderUpdateMessage
	err = json.Unmarshal(message, &orderUpdate)
	require.NoError(t, err)

	assert.Equal(t, ws.MessageTypeOrderUpdate, orderUpdate.Type)
	assert.Equal(t, "created", orderUpdate.Action)
}

func TestWebSocket_MatchTrade_BroadcastsExecution(t *testing.T) {
	srv, engine, _, _ := setupWebSocketTestServer(t)

	conn := connectWebSocket(t, srv.URL, "/ws/trades", uuid.New().String())
	defer conn.Close()

	time.Sleep(50 * time.Millisecond)

	// Place matching orders
	buyPrice := decimal.NewFromFloat(50000)
	buyOrder := &domain.Order{
		UserID:      uuid.New(),
		Symbol:      "BTC/USDT",
		Side:        domain.OrderSideBuy,
		Type:        domain.OrderTypeLimit,
		Quantity:    decimal.NewFromFloat(1.0),
		Price:       &buyPrice,
		TimeInForce: domain.TimeInForceGTC,
	}

	sellPrice := decimal.NewFromFloat(50000)
	sellOrder := &domain.Order{
		UserID:      uuid.New(),
		Symbol:      "BTC/USDT",
		Side:        domain.OrderSideSell,
		Type:        domain.OrderTypeLimit,
		Quantity:    decimal.NewFromFloat(1.0),
		Price:       &sellPrice,
		TimeInForce: domain.TimeInForceGTC,
	}

	engine.PlaceOrder(buyOrder)
	engine.PlaceOrder(sellOrder)

	// Verify trade message received
	conn.SetReadDeadline(time.Now().Add(2 * time.Second))
	_, message, err := conn.ReadMessage()
	require.NoError(t, err)

	var tradeMsg ws.TradeExecutedMessage
	err = json.Unmarshal(message, &tradeMsg)
	require.NoError(t, err)

	assert.Equal(t, ws.MessageTypeTradeExecuted, tradeMsg.Type)
	assert.Equal(t, "BTC/USDT", tradeMsg.Symbol)
}

func TestWebSocket_OrderBookChange_NotifiesSubscribers(t *testing.T) {
	srv, _, _, publisher := setupWebSocketTestServer(t)

	conn := connectWebSocket(t, srv.URL, "/ws/markets?symbol=BTC/USDT", uuid.New().String())
	defer conn.Close()

	time.Sleep(50 * time.Millisecond)

	// Publish order book update
	ob := orderbook.NewOrderBook("BTC/USDT")
	publisher.PublishOrderBookChange("BTC/USDT", ob)

	// Verify message received
	conn.SetReadDeadline(time.Now().Add(2 * time.Second))
	_, message, err := conn.ReadMessage()
	require.NoError(t, err)

	var obMsg ws.OrderBookUpdateMessage
	err = json.Unmarshal(message, &obMsg)
	require.NoError(t, err)

	assert.Equal(t, ws.MessageTypeOrderBookUpdate, obMsg.Type)
}

func TestWebSocket_Load_100Clients_1000Messages(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping load test in short mode")
	}

	srv, _, connManager, publisher := setupWebSocketTestServer(t)

	// Connect 100 clients
	clientCount := 100
	clients := make([]*websocket.Conn, clientCount)

	for i := 0; i < clientCount; i++ {
		clients[i] = connectWebSocket(t, srv.URL, "/ws/trades", uuid.New().String())
		defer clients[i].Close()
	}

	time.Sleep(500 * time.Millisecond)

	// Verify all connected
	stats := connManager.GetStats()
	assert.Equal(t, clientCount, stats["total_clients"])

	// Send 1000 messages
	messageCount := 1000
	startTime := time.Now()

	for i := 0; i < messageCount; i++ {
		trade := &domain.Trade{
			ID:           uuid.New(),
			Symbol:       "BTC/USDT",
			Price:        decimal.NewFromFloat(50000),
			Quantity:     decimal.NewFromFloat(1.0),
			BuyerUserID:  uuid.New(),
			SellerUserID: uuid.New(),
			BuyerFee:     decimal.NewFromFloat(25),
			SellerFee:    decimal.NewFromFloat(50),
			ExecutedAt:   time.Now(),
		}
		publisher.PublishTradeExecution(trade)
	}

	duration := time.Since(startTime)

	t.Logf("Sent %d messages to %d clients in %v", messageCount, clientCount, duration)
	t.Logf("Average latency: %v per message", duration/time.Duration(messageCount))

	// Verify performance: should be < 50ms per message
	avgLatency := duration / time.Duration(messageCount)
	assert.Less(t, avgLatency, 50*time.Millisecond, "Average latency should be < 50ms")
}

func TestWebSocket_Reconnection_HistoryNotReplayed(t *testing.T) {
	srv, engine, _, _ := setupWebSocketTestServer(t)
	userID := uuid.New()

	// Connect and disconnect
	conn1 := connectWebSocket(t, srv.URL, "/ws/orders", userID.String())
	time.Sleep(50 * time.Millisecond)

	// Place order while connected
	price := decimal.NewFromFloat(50000)
	order := &domain.Order{
		UserID:      userID,
		Symbol:      "BTC/USDT",
		Side:        domain.OrderSideBuy,
		Type:        domain.OrderTypeLimit,
		Quantity:    decimal.NewFromFloat(1.0),
		Price:       &price,
		TimeInForce: domain.TimeInForceGTC,
	}

	engine.PlaceOrder(order)

	// Read message
	conn1.SetReadDeadline(time.Now().Add(1 * time.Second))
	conn1.ReadMessage()

	// Disconnect
	conn1.Close()
	time.Sleep(100 * time.Millisecond)

	// Reconnect
	conn2 := connectWebSocket(t, srv.URL, "/ws/orders", userID.String())
	defer conn2.Close()

	// Should NOT receive historical messages
	conn2.SetReadDeadline(time.Now().Add(500 * time.Millisecond))
	_, _, err := conn2.ReadMessage()
	assert.Error(t, err, "Should not receive historical messages on reconnect")
}

// ============================================================================
// ERROR HANDLING TESTS
// ============================================================================

func TestWebSocket_InvalidSubscriptionMessage(t *testing.T) {
	srv, _, _, _ := setupWebSocketTestServer(t)
	userID := uuid.New().String()

	conn := connectWebSocket(t, srv.URL, "/ws", userID)
	defer conn.Close()

	// Send invalid JSON
	err := conn.WriteMessage(websocket.TextMessage, []byte(`{"invalid json`))
	require.NoError(t, err)

	// Should receive error message
	conn.SetReadDeadline(time.Now().Add(1 * time.Second))
	_, message, err := conn.ReadMessage()
	require.NoError(t, err)

	var errMsg ws.ErrorMessage
	err = json.Unmarshal(message, &errMsg)
	require.NoError(t, err)

	assert.Equal(t, ws.MessageTypeError, errMsg.Type)
	assert.Equal(t, "INVALID_MESSAGE", errMsg.Code)
}

func TestWebSocket_SubscribeOrderBookWithoutSymbol(t *testing.T) {
	srv, _, _, _ := setupWebSocketTestServer(t)
	userID := uuid.New().String()

	conn := connectWebSocket(t, srv.URL, "/ws", userID)
	defer conn.Close()

	// Try to subscribe to order book without symbol
	subMsg := ws.SubscriptionMessage{
		Action: "subscribe",
		Stream: ws.StreamTypeOrderBook,
		// Missing Symbol
	}

	data, _ := json.Marshal(subMsg)
	err := conn.WriteMessage(websocket.TextMessage, data)
	require.NoError(t, err)

	// Should receive error response
	conn.SetReadDeadline(time.Now().Add(1 * time.Second))
	_, message, err := conn.ReadMessage()
	require.NoError(t, err)

	var response ws.SubscriptionResponseMessage
	err = json.Unmarshal(message, &response)
	require.NoError(t, err)

	assert.False(t, response.Success)
	assert.Contains(t, response.Message, "symbol required")
}

// ============================================================================
// STATS AND MONITORING TESTS
// ============================================================================

func TestWebSocket_GetStats(t *testing.T) {
	srv, _, connManager, _ := setupWebSocketTestServer(t)

	// Initial stats
	stats := connManager.GetStats()
	assert.Equal(t, 0, stats["total_clients"])

	// Connect clients
	conn1 := connectWebSocket(t, srv.URL, "/ws/orders", uuid.New().String())
	defer conn1.Close()
	conn2 := connectWebSocket(t, srv.URL, "/ws/trades", uuid.New().String())
	defer conn2.Close()

	time.Sleep(100 * time.Millisecond)

	// Check stats
	stats = connManager.GetStats()
	assert.Equal(t, 2, stats["total_clients"])
	assert.GreaterOrEqual(t, stats["order_updates_queue"].(int), 0)
	assert.GreaterOrEqual(t, stats["trades_queue"].(int), 0)
	assert.GreaterOrEqual(t, stats["orderbook_queue"].(int), 0)
}

func TestWebSocket_PublishChannelFull(t *testing.T) {
	_, _, connManager, publisher := setupWebSocketTestServer(t)

	// Don't connect any clients, just publish many messages
	// This tests the default case when channels are full

	for i := 0; i < 10; i++ {
		order := &domain.Order{
			ID:             uuid.New(),
			UserID:         uuid.New(),
			Symbol:         "BTC/USDT",
			Side:           domain.OrderSideBuy,
			Type:           domain.OrderTypeLimit,
			Quantity:       decimal.NewFromFloat(1.0),
			FilledQuantity: decimal.Zero,
			Status:         domain.OrderStatusOpen,
		}
		publisher.PublishOrderUpdate(order)
	}

	// Wait a bit for processing
	time.Sleep(100 * time.Millisecond)

	// No errors should occur
	stats := connManager.GetStats()
	assert.NotNil(t, stats)
}

// ============================================================================
// BENCHMARK TESTS
// ============================================================================

func BenchmarkWebSocket_SingleClient(b *testing.B) {
	logger, _ := zap.NewDevelopment()
	engine := matching.NewMatchingEngine()
	connManager := ws.NewConnectionManager(logger)
	connManager.Start()
	defer connManager.Stop()

	publisher := ws.NewPublisher(connManager, logger)
	publisher.Start()
	defer publisher.Stop()

	engine.SetTradeCallback(publisher.PublishTradeExecution)

	wsHandler := server.NewWebSocketHandler(connManager, logger)
	mux := http.NewServeMux()
	mux.HandleFunc("/ws/trades", wsHandler.HandleTradesStream)
	srv := httptest.NewServer(mux)
	defer srv.Close()

	conn := connectWebSocket(&testing.T{}, srv.URL, "/ws/trades", uuid.New().String())
	defer conn.Close()

	time.Sleep(50 * time.Millisecond)

	b.ResetTimer()

	for i := 0; i < b.N; i++ {
		trade := &domain.Trade{
			ID:           uuid.New(),
			Symbol:       "BTC/USDT",
			Price:        decimal.NewFromFloat(50000),
			Quantity:     decimal.NewFromFloat(1.0),
			BuyerUserID:  uuid.New(),
			SellerUserID: uuid.New(),
			ExecutedAt:   time.Now(),
		}
		publisher.PublishTradeExecution(trade)
	}
}

func BenchmarkWebSocket_100Clients(b *testing.B) {
	logger, _ := zap.NewDevelopment()
	engine := matching.NewMatchingEngine()
	connManager := ws.NewConnectionManager(logger)
	connManager.Start()
	defer connManager.Stop()

	publisher := ws.NewPublisher(connManager, logger)
	publisher.Start()
	defer publisher.Stop()

	engine.SetTradeCallback(publisher.PublishTradeExecution)

	wsHandler := server.NewWebSocketHandler(connManager, logger)
	mux := http.NewServeMux()
	mux.HandleFunc("/ws/trades", wsHandler.HandleTradesStream)
	srv := httptest.NewServer(mux)
	defer srv.Close()

	// Connect 100 clients
	clients := make([]*websocket.Conn, 100)
	for i := 0; i < 100; i++ {
		clients[i] = connectWebSocket(&testing.T{}, srv.URL, "/ws/trades", uuid.New().String())
		defer clients[i].Close()
	}

	time.Sleep(500 * time.Millisecond)

	b.ResetTimer()

	for i := 0; i < b.N; i++ {
		trade := &domain.Trade{
			ID:           uuid.New(),
			Symbol:       fmt.Sprintf("BTC/USDT-%d", i),
			Price:        decimal.NewFromFloat(50000),
			Quantity:     decimal.NewFromFloat(1.0),
			BuyerUserID:  uuid.New(),
			SellerUserID: uuid.New(),
			ExecutedAt:   time.Now(),
		}
		publisher.PublishTradeExecution(trade)
	}
}
