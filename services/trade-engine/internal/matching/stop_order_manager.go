// ============================================================================
// MYTRADER TRADE ENGINE - STOP ORDER MANAGER
// ============================================================================
// Component: Stop Order Management with Price Trigger System
// Version: 1.0
// Purpose: Manages stop orders that activate when trigger prices are reached
// Thread Safety: Full concurrency support
// ============================================================================

package matching

import (
	"sync"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"github.com/mytrader/trade-engine/internal/domain"
)

// StopOrderManager manages stop orders that activate when trigger prices are reached
//
// ARCHITECTURE:
//   - Stop orders are stored separately from the main order book
//   - They are triggered when market price crosses their stop price
//   - Once triggered, they convert to market orders and enter the matching engine
//   - Thread-safe with RWMutex protection
//
// TRIGGER RULES:
//   - STOP-SELL (Stop-Loss): Triggers when price <= stop_price
//   - STOP-BUY: Triggers when price >= stop_price
//
// PERFORMANCE:
//   - O(n) trigger check where n is number of stop orders
//   - Could be optimized with price-indexed data structures if needed
type StopOrderManager struct {
	// Map of stop orders by order ID
	stopOrders map[uuid.UUID]*domain.Order

	// Track last known market price for trigger detection
	lastMarketPrice decimal.Decimal

	// Mutex for thread safety
	mu sync.RWMutex
}

// NewStopOrderManager creates a new stop order manager
func NewStopOrderManager() *StopOrderManager {
	return &StopOrderManager{
		stopOrders:      make(map[uuid.UUID]*domain.Order),
		lastMarketPrice: decimal.Zero,
	}
}

// AddStopOrder adds a stop order to the manager
//
// Parameters:
//   - order: Stop order with stop_price set
//
// Returns: error if order is invalid
func (som *StopOrderManager) AddStopOrder(order *domain.Order) error {
	if order.Type != domain.OrderTypeStop {
		return ErrUnsupportedOrderType
	}

	if order.StopPrice == nil || order.StopPrice.LessThanOrEqual(decimal.Zero) {
		return ErrInvalidPrice
	}

	som.mu.Lock()
	defer som.mu.Unlock()

	// Store stop order
	som.stopOrders[order.ID] = order

	return nil
}

// RemoveStopOrder removes a stop order from the manager (e.g., when cancelled)
//
// Parameters:
//   - orderID: UUID of the order to remove
func (som *StopOrderManager) RemoveStopOrder(orderID uuid.UUID) {
	som.mu.Lock()
	defer som.mu.Unlock()

	delete(som.stopOrders, orderID)
}

// GetStopOrder retrieves a stop order by ID
//
// Parameters:
//   - orderID: UUID of the order
//
// Returns: Order pointer or nil if not found
func (som *StopOrderManager) GetStopOrder(orderID uuid.UUID) *domain.Order {
	som.mu.RLock()
	defer som.mu.RUnlock()

	return som.stopOrders[orderID]
}

// CheckTriggers checks if any stop orders should be triggered based on the current market price
//
// TRIGGER LOGIC:
//   - STOP-SELL (Stop-Loss): price <= stop_price
//     Example: Stop-sell @ 49,000 triggers when price hits 49,000 or below
//
//   - STOP-BUY: price >= stop_price
//     Example: Stop-buy @ 51,000 triggers when price hits 51,000 or above
//
// Parameters:
//   - currentPrice: Current market price (from last trade)
//
// Returns: Slice of orders that should be triggered
func (som *StopOrderManager) CheckTriggers(currentPrice decimal.Decimal) []*domain.Order {
	som.mu.Lock()
	defer som.mu.Unlock()

	// Update last known market price
	som.lastMarketPrice = currentPrice

	triggeredOrders := make([]*domain.Order, 0)

	// Check each stop order
	for orderID, order := range som.stopOrders {
		shouldTrigger := false

		if order.Side == domain.OrderSideSell {
			// STOP-SELL (Stop-Loss): Trigger when price <= stop_price
			// Example: User wants to sell if price drops to or below stop_price
			shouldTrigger = currentPrice.LessThanOrEqual(*order.StopPrice)
		} else if order.Side == domain.OrderSideBuy {
			// STOP-BUY: Trigger when price >= stop_price
			// Example: User wants to buy if price rises to or above stop_price
			shouldTrigger = currentPrice.GreaterThanOrEqual(*order.StopPrice)
		}

		if shouldTrigger {
			// Mark order as triggered
			order.Status = domain.OrderStatusTriggered
			// Remove from stop order manager
			delete(som.stopOrders, orderID)
			// Add to triggered list
			triggeredOrders = append(triggeredOrders, order)
		}
	}

	return triggeredOrders
}

// GetStopOrderCount returns the current number of stop orders
func (som *StopOrderManager) GetStopOrderCount() int {
	som.mu.RLock()
	defer som.mu.RUnlock()

	return len(som.stopOrders)
}

// GetStopOrdersBySymbol returns all stop orders for a specific symbol
func (som *StopOrderManager) GetStopOrdersBySymbol(symbol string) []*domain.Order {
	som.mu.RLock()
	defer som.mu.RUnlock()

	orders := make([]*domain.Order, 0)
	for _, order := range som.stopOrders {
		if order.Symbol == symbol {
			orders = append(orders, order)
		}
	}

	return orders
}

// GetAllStopOrders returns all stop orders (for debugging/testing)
func (som *StopOrderManager) GetAllStopOrders() []*domain.Order {
	som.mu.RLock()
	defer som.mu.RUnlock()

	orders := make([]*domain.Order, 0, len(som.stopOrders))
	for _, order := range som.stopOrders {
		orders = append(orders, order)
	}

	return orders
}

// GetLastMarketPrice returns the last known market price
func (som *StopOrderManager) GetLastMarketPrice() decimal.Decimal {
	som.mu.RLock()
	defer som.mu.RUnlock()

	return som.lastMarketPrice
}
