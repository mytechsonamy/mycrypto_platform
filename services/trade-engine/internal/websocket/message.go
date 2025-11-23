// ============================================================================
// MYTRADER TRADE ENGINE - WEBSOCKET MESSAGE TYPES
// ============================================================================
// Component: WebSocket message definitions for real-time updates
// Version: 1.0
// Purpose: Define message structures for order updates, trades, and market data
// ============================================================================

package websocket

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// MessageType represents the type of WebSocket message
type MessageType string

const (
	MessageTypeOrderUpdate     MessageType = "order_update"
	MessageTypeTradeExecuted   MessageType = "trade_executed"
	MessageTypeOrderBookUpdate MessageType = "orderbook_update"
	MessageTypeError           MessageType = "error"
	MessageTypeSubscribe       MessageType = "subscribe"
	MessageTypeUnsubscribe     MessageType = "unsubscribe"
	MessageTypeSubscribed      MessageType = "subscribed"
	MessageTypeUnsubscribed    MessageType = "unsubscribed"
)

// StreamType represents the type of event stream
type StreamType string

const (
	StreamTypeOrders    StreamType = "orders"
	StreamTypeTrades    StreamType = "trades"
	StreamTypeOrderBook StreamType = "orderbook"
)

// Message is the base message structure
type Message struct {
	Type      MessageType     `json:"type"`
	Timestamp time.Time       `json:"timestamp"`
	Data      json.RawMessage `json:"data,omitempty"`
}

// OrderUpdateMessage represents an order status update
type OrderUpdateMessage struct {
	Type           MessageType `json:"type"`
	Action         string      `json:"action"` // created, filled, partially_filled, cancelled
	OrderID        uuid.UUID   `json:"order_id"`
	UserID         uuid.UUID   `json:"user_id"`
	Symbol         string      `json:"symbol"`
	Side           string      `json:"side"`
	Status         string      `json:"status"`
	Quantity       string      `json:"quantity"`
	FilledQuantity string      `json:"filled_quantity"`
	Price          string      `json:"price,omitempty"`
	Timestamp      time.Time   `json:"timestamp"`
}

// TradeExecutedMessage represents a trade execution
type TradeExecutedMessage struct {
	Type       MessageType `json:"type"`
	TradeID    uuid.UUID   `json:"trade_id"`
	Symbol     string      `json:"symbol"`
	Price      string      `json:"price"`
	Quantity   string      `json:"quantity"`
	BuyerID    uuid.UUID   `json:"buyer_id"`
	SellerID   uuid.UUID   `json:"seller_id"`
	BuyerFee   string      `json:"buyer_fee"`
	SellerFee  string      `json:"seller_fee"`
	ExecutedAt time.Time   `json:"executed_at"`
}

// OrderBookUpdateMessage represents order book depth changes
type OrderBookUpdateMessage struct {
	Type        MessageType `json:"type"`
	Symbol      string      `json:"symbol"`
	BestBid     string      `json:"best_bid,omitempty"`
	BestAsk     string      `json:"best_ask,omitempty"`
	BidQuantity string      `json:"bid_quantity,omitempty"`
	AskQuantity string      `json:"ask_quantity,omitempty"`
	Spread      string      `json:"spread,omitempty"`
	Timestamp   time.Time   `json:"timestamp"`
}

// ErrorMessage represents an error message
type ErrorMessage struct {
	Type      MessageType `json:"type"`
	Code      string      `json:"code"`
	Message   string      `json:"message"`
	Timestamp time.Time   `json:"timestamp"`
}

// SubscriptionMessage represents a subscription request from client
type SubscriptionMessage struct {
	Action string     `json:"action"` // subscribe, unsubscribe
	Stream StreamType `json:"stream"` // orders, trades, orderbook
	Symbol string     `json:"symbol,omitempty"` // required for orderbook stream
}

// SubscriptionResponseMessage represents a response to subscription request
type SubscriptionResponseMessage struct {
	Type      MessageType `json:"type"`
	Stream    StreamType  `json:"stream"`
	Symbol    string      `json:"symbol,omitempty"`
	Success   bool        `json:"success"`
	Message   string      `json:"message,omitempty"`
	Timestamp time.Time   `json:"timestamp"`
}

// NewOrderUpdateMessage creates an order update message
func NewOrderUpdateMessage(action string, orderID, userID uuid.UUID, symbol, side, status string,
	quantity, filledQuantity decimal.Decimal, price *decimal.Decimal) *OrderUpdateMessage {

	msg := &OrderUpdateMessage{
		Type:           MessageTypeOrderUpdate,
		Action:         action,
		OrderID:        orderID,
		UserID:         userID,
		Symbol:         symbol,
		Side:           side,
		Status:         status,
		Quantity:       quantity.String(),
		FilledQuantity: filledQuantity.String(),
		Timestamp:      time.Now(),
	}

	if price != nil {
		msg.Price = price.String()
	}

	return msg
}

// NewTradeExecutedMessage creates a trade executed message
func NewTradeExecutedMessage(tradeID uuid.UUID, symbol string, price, quantity decimal.Decimal,
	buyerID, sellerID uuid.UUID, buyerFee, sellerFee decimal.Decimal, executedAt time.Time) *TradeExecutedMessage {

	return &TradeExecutedMessage{
		Type:       MessageTypeTradeExecuted,
		TradeID:    tradeID,
		Symbol:     symbol,
		Price:      price.String(),
		Quantity:   quantity.String(),
		BuyerID:    buyerID,
		SellerID:   sellerID,
		BuyerFee:   buyerFee.String(),
		SellerFee:  sellerFee.String(),
		ExecutedAt: executedAt,
	}
}

// NewOrderBookUpdateMessage creates an order book update message
func NewOrderBookUpdateMessage(symbol string, bestBid, bestAsk, bidQty, askQty, spread *decimal.Decimal) *OrderBookUpdateMessage {
	msg := &OrderBookUpdateMessage{
		Type:      MessageTypeOrderBookUpdate,
		Symbol:    symbol,
		Timestamp: time.Now(),
	}

	if bestBid != nil {
		msg.BestBid = bestBid.String()
	}
	if bestAsk != nil {
		msg.BestAsk = bestAsk.String()
	}
	if bidQty != nil {
		msg.BidQuantity = bidQty.String()
	}
	if askQty != nil {
		msg.AskQuantity = askQty.String()
	}
	if spread != nil {
		msg.Spread = spread.String()
	}

	return msg
}

// NewErrorMessage creates an error message
func NewErrorMessage(code, message string) *ErrorMessage {
	return &ErrorMessage{
		Type:      MessageTypeError,
		Code:      code,
		Message:   message,
		Timestamp: time.Now(),
	}
}

// NewSubscriptionResponse creates a subscription response message
func NewSubscriptionResponse(msgType MessageType, stream StreamType, symbol string, success bool, message string) *SubscriptionResponseMessage {
	return &SubscriptionResponseMessage{
		Type:      msgType,
		Stream:    stream,
		Symbol:    symbol,
		Success:   success,
		Message:   message,
		Timestamp: time.Now(),
	}
}

// ToJSON serializes a message to JSON bytes
func ToJSON(v interface{}) ([]byte, error) {
	return json.Marshal(v)
}

// FromJSON deserializes JSON bytes to a message
func FromJSON(data []byte, v interface{}) error {
	return json.Unmarshal(data, v)
}
