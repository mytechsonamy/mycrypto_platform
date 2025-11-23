// ============================================================================
// MYTRADER TRADE ENGINE - WEBSOCKET EVENT PUBLISHER
// ============================================================================
// Component: Publishes trading events to WebSocket clients
// Version: 1.0
// Purpose: Bridge between matching engine and WebSocket connections
// ============================================================================

package websocket

import (
	"github.com/mytrader/trade-engine/internal/domain"
	"github.com/mytrader/trade-engine/internal/orderbook"
	"github.com/shopspring/decimal"
	"go.uber.org/zap"
)

// Publisher publishes events to WebSocket clients via the connection manager
type Publisher struct {
	connectionManager *ConnectionManager
	logger            *zap.Logger
}

// NewPublisher creates a new WebSocket event publisher
func NewPublisher(connectionManager *ConnectionManager, logger *zap.Logger) *Publisher {
	return &Publisher{
		connectionManager: connectionManager,
		logger:            logger.With(zap.String("component", "websocket_publisher")),
	}
}

// PublishOrderUpdate publishes an order status update
func (p *Publisher) PublishOrderUpdate(order *domain.Order) {
	if order == nil {
		return
	}

	// Determine action based on order status
	action := p.getOrderAction(order)

	msg := NewOrderUpdateMessage(
		action,
		order.ID,
		order.UserID,
		order.Symbol,
		string(order.Side),
		string(order.Status),
		order.Quantity,
		order.FilledQuantity,
		order.Price,
	)

	p.connectionManager.PublishOrderUpdate(msg)

	p.logger.Debug("Published order update",
		zap.String("order_id", order.ID.String()),
		zap.String("action", action),
		zap.String("status", string(order.Status)),
	)
}

// PublishTradeExecution publishes a trade execution event
func (p *Publisher) PublishTradeExecution(trade *domain.Trade) {
	if trade == nil {
		return
	}

	msg := NewTradeExecutedMessage(
		trade.ID,
		trade.Symbol,
		trade.Price,
		trade.Quantity,
		trade.BuyerUserID,
		trade.SellerUserID,
		trade.BuyerFee,
		trade.SellerFee,
		trade.ExecutedAt,
	)

	p.connectionManager.PublishTradeExecution(msg)

	p.logger.Debug("Published trade execution",
		zap.String("trade_id", trade.ID.String()),
		zap.String("symbol", trade.Symbol),
		zap.String("price", trade.Price.String()),
		zap.String("quantity", trade.Quantity.String()),
	)
}

// PublishOrderBookChange publishes an order book depth change
func (p *Publisher) PublishOrderBookChange(symbol string, ob *orderbook.OrderBook) {
	if ob == nil {
		return
	}

	// Get best bid and ask
	bestBid, _ := ob.GetBestBid()
	bestAsk, _ := ob.GetBestAsk()

	var bestBidPrice, bestAskPrice, bidQty, askQty, spread *decimal.Decimal

	if bestBid != nil {
		bestBidPrice = &bestBid.Price
		if len(bestBid.Orders) > 0 {
			qty := decimal.Zero
			for _, order := range bestBid.Orders {
				qty = qty.Add(order.RemainingQuantity())
			}
			bidQty = &qty
		}
	}

	if bestAsk != nil {
		bestAskPrice = &bestAsk.Price
		if len(bestAsk.Orders) > 0 {
			qty := decimal.Zero
			for _, order := range bestAsk.Orders {
				qty = qty.Add(order.RemainingQuantity())
			}
			askQty = &qty
		}
	}

	// Calculate spread
	if bestBidPrice != nil && bestAskPrice != nil {
		s := bestAskPrice.Sub(*bestBidPrice)
		spread = &s
	}

	msg := NewOrderBookUpdateMessage(symbol, bestBidPrice, bestAskPrice, bidQty, askQty, spread)

	p.connectionManager.PublishOrderBookChange(msg)

	p.logger.Debug("Published order book change",
		zap.String("symbol", symbol),
	)
}

// getOrderAction determines the action type from order status
func (p *Publisher) getOrderAction(order *domain.Order) string {
	switch order.Status {
	case domain.OrderStatusOpen:
		if order.FilledQuantity.IsZero() {
			return "created"
		}
		return "updated"
	case domain.OrderStatusPartiallyFilled:
		return "partially_filled"
	case domain.OrderStatusFilled:
		return "filled"
	case domain.OrderStatusCancelled:
		return "cancelled"
	case domain.OrderStatusRejected:
		return "rejected"
	default:
		return "updated"
	}
}

// Start starts the publisher (currently no-op, but reserved for future use)
func (p *Publisher) Start() {
	p.logger.Info("WebSocket publisher started")
}

// Stop stops the publisher (currently no-op, but reserved for future use)
func (p *Publisher) Stop() {
	p.logger.Info("WebSocket publisher stopped")
}
