package orderbook

import (
	"errors"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"github.com/mytrader/trade-engine/internal/domain"
)

var (
	// ErrSymbolMismatch is returned when an order symbol doesn't match the order book
	ErrSymbolMismatch = errors.New("order symbol does not match order book")
	// ErrMarketOrderNotSupported is returned when trying to add a market order to the book
	ErrMarketOrderNotSupported = errors.New("market orders cannot be added to order book")
	// ErrOrderNotFound is returned when an order is not found in the book
	ErrOrderNotFound = errors.New("order not found in order book")
	// ErrEmptyOrderBook is returned when the order book has no orders
	ErrEmptyOrderBook = errors.New("order book is empty")
	// ErrInvalidQuantity is returned when trying to fill an invalid quantity
	ErrInvalidQuantity = errors.New("invalid fill quantity")
)

// OrderBook represents an in-memory order book for a trading pair
// It maintains sorted price levels for both buy and sell orders
type OrderBook struct {
	Symbol    string
	Bids      *PriceLevelTree       // Buy side (max heap - highest price first)
	Asks      *PriceLevelTree       // Sell side (min heap - lowest price first)
	OrderMap  map[uuid.UUID]*OrderBookEntry // Fast O(1) lookup by order ID
	mu        sync.RWMutex          // Read-write mutex for concurrency
	UpdatedAt time.Time
}

// OrderBookEntry wraps an order with its location in the book
type OrderBookEntry struct {
	Order      *domain.Order
	PriceLevel *PriceLevel
}

// PriceLevel represents all orders at a specific price point
// Orders are maintained in FIFO order (time priority)
type PriceLevel struct {
	Price       decimal.Decimal
	Orders      []*domain.Order  // FIFO queue (time priority)
	TotalVolume decimal.Decimal  // Sum of all order quantities at this level
	OrderCount  int
}

// NewOrderBook creates a new order book for a symbol
func NewOrderBook(symbol string) *OrderBook {
	return &OrderBook{
		Symbol:    symbol,
		Bids:      NewPriceLevelTree(domain.OrderSideBuy),
		Asks:      NewPriceLevelTree(domain.OrderSideSell),
		OrderMap:  make(map[uuid.UUID]*OrderBookEntry),
		UpdatedAt: time.Now(),
	}
}

// AddOrder adds an order to the order book
// Complexity: O(log n) due to AVL tree insertion
func (ob *OrderBook) AddOrder(order *domain.Order) error {
	ob.mu.Lock()
	defer ob.mu.Unlock()

	// Validate order
	if order.Symbol != ob.Symbol {
		return ErrSymbolMismatch
	}

	if order.Type == domain.OrderTypeMarket || order.Price == nil {
		return ErrMarketOrderNotSupported
	}

	// Check if order already exists (idempotency)
	if _, exists := ob.OrderMap[order.ID]; exists {
		return nil // Order already in book, no-op
	}

	// Get or create price level
	var tree *PriceLevelTree
	if order.Side == domain.OrderSideBuy {
		tree = ob.Bids
	} else {
		tree = ob.Asks
	}

	priceLevel := tree.GetOrCreateLevel(*order.Price)

	// Add order to price level (FIFO - append to end)
	priceLevel.Orders = append(priceLevel.Orders, order)
	priceLevel.TotalVolume = priceLevel.TotalVolume.Add(order.RemainingQuantity())
	priceLevel.OrderCount++

	// Add to order map for fast lookup
	ob.OrderMap[order.ID] = &OrderBookEntry{
		Order:      order,
		PriceLevel: priceLevel,
	}

	ob.UpdatedAt = time.Now()

	return nil
}

// RemoveOrder removes an order from the order book
// Complexity: O(log n) for tree operations + O(k) for removing from FIFO queue
// where k is the number of orders at that price level (typically small)
func (ob *OrderBook) RemoveOrder(orderID uuid.UUID) error {
	ob.mu.Lock()
	defer ob.mu.Unlock()

	entry, exists := ob.OrderMap[orderID]
	if !exists {
		return ErrOrderNotFound
	}

	priceLevel := entry.PriceLevel
	order := entry.Order

	// Remove order from price level's FIFO queue
	for i, o := range priceLevel.Orders {
		if o.ID == orderID {
			// Remove from slice (preserve order)
			priceLevel.Orders = append(priceLevel.Orders[:i], priceLevel.Orders[i+1:]...)
			break
		}
	}

	priceLevel.TotalVolume = priceLevel.TotalVolume.Sub(order.RemainingQuantity())
	priceLevel.OrderCount--

	// If price level is empty, remove it from tree
	if priceLevel.OrderCount == 0 {
		var tree *PriceLevelTree
		if order.Side == domain.OrderSideBuy {
			tree = ob.Bids
		} else {
			tree = ob.Asks
		}
		tree.RemoveLevel(priceLevel.Price)
	}

	// Remove from order map
	delete(ob.OrderMap, orderID)

	ob.UpdatedAt = time.Now()

	return nil
}

// UpdateOrder updates an order's filled quantity (partial fill)
// Complexity: O(log n) if order becomes fully filled and needs removal
func (ob *OrderBook) UpdateOrder(orderID uuid.UUID, filledQty decimal.Decimal) error {
	ob.mu.Lock()
	defer ob.mu.Unlock()

	if filledQty.LessThanOrEqual(decimal.Zero) {
		return ErrInvalidQuantity
	}

	entry, exists := ob.OrderMap[orderID]
	if !exists {
		return ErrOrderNotFound
	}

	order := entry.Order
	priceLevel := entry.PriceLevel

	// Calculate volume change
	oldRemaining := order.RemainingQuantity()

	// Update the order's filled quantity
	err := order.Fill(filledQty)
	if err != nil {
		return err
	}

	newRemaining := order.RemainingQuantity()
	volumeChange := oldRemaining.Sub(newRemaining)

	// Update price level volume
	priceLevel.TotalVolume = priceLevel.TotalVolume.Sub(volumeChange)

	// If fully filled, remove from book
	if order.IsFilled() {
		// Remove from price level
		for i, o := range priceLevel.Orders {
			if o.ID == orderID {
				priceLevel.Orders = append(priceLevel.Orders[:i], priceLevel.Orders[i+1:]...)
				break
			}
		}
		priceLevel.OrderCount--

		// If price level is empty, remove it from tree
		if priceLevel.OrderCount == 0 {
			var tree *PriceLevelTree
			if order.Side == domain.OrderSideBuy {
				tree = ob.Bids
			} else {
				tree = ob.Asks
			}
			tree.RemoveLevel(priceLevel.Price)
		}

		// Remove from order map
		delete(ob.OrderMap, orderID)
	}

	ob.UpdatedAt = time.Now()

	return nil
}

// GetBestBid returns the highest bid price and total volume
// Complexity: O(1) - uses cached best pointer
func (ob *OrderBook) GetBestBid() (*PriceLevel, error) {
	ob.mu.RLock()
	defer ob.mu.RUnlock()

	if ob.Bids.Best == nil {
		return nil, ErrEmptyOrderBook
	}

	return ob.Bids.Best.Level, nil
}

// GetBestAsk returns the lowest ask price and total volume
// Complexity: O(1) - uses cached best pointer
func (ob *OrderBook) GetBestAsk() (*PriceLevel, error) {
	ob.mu.RLock()
	defer ob.mu.RUnlock()

	if ob.Asks.Best == nil {
		return nil, ErrEmptyOrderBook
	}

	return ob.Asks.Best.Level, nil
}

// GetSpread returns the difference between best ask and best bid
// Complexity: O(1)
func (ob *OrderBook) GetSpread() (decimal.Decimal, error) {
	ob.mu.RLock()
	defer ob.mu.RUnlock()

	if ob.Bids.Best == nil || ob.Asks.Best == nil {
		return decimal.Zero, ErrEmptyOrderBook
	}

	return ob.Asks.Best.Level.Price.Sub(ob.Bids.Best.Level.Price), nil
}

// GetMidPrice returns the mid-market price
// Complexity: O(1)
func (ob *OrderBook) GetMidPrice() (decimal.Decimal, error) {
	ob.mu.RLock()
	defer ob.mu.RUnlock()

	if ob.Bids.Best == nil || ob.Asks.Best == nil {
		return decimal.Zero, ErrEmptyOrderBook
	}

	bestBid := ob.Bids.Best.Level.Price
	bestAsk := ob.Asks.Best.Level.Price

	return bestBid.Add(bestAsk).Div(decimal.NewFromInt(2)), nil
}

// GetDepth returns order book depth up to N levels on each side
// Complexity: O(n) where n is the number of levels requested
func (ob *OrderBook) GetDepth(levels int) *OrderBookDepth {
	ob.mu.RLock()
	defer ob.mu.RUnlock()

	depth := &OrderBookDepth{
		Symbol:    ob.Symbol,
		Timestamp: time.Now(),
		Bids:      ob.Bids.GetTopLevels(levels),
		Asks:      ob.Asks.GetTopLevels(levels),
	}

	return depth
}

// GetOrdersAtPrice returns all orders at a specific price level
// Complexity: O(1) for lookup + O(k) for copying orders where k is orders at that price
func (ob *OrderBook) GetOrdersAtPrice(side domain.OrderSide, price decimal.Decimal) []*domain.Order {
	ob.mu.RLock()
	defer ob.mu.RUnlock()

	var tree *PriceLevelTree
	if side == domain.OrderSideBuy {
		tree = ob.Bids
	} else {
		tree = ob.Asks
	}

	priceStr := price.String()
	node, exists := tree.Levels[priceStr]
	if !exists {
		return []*domain.Order{}
	}

	// Return a copy to avoid race conditions
	orders := make([]*domain.Order, len(node.Level.Orders))
	copy(orders, node.Level.Orders)
	return orders
}

// GetOrder returns an order by ID
// Complexity: O(1)
func (ob *OrderBook) GetOrder(orderID uuid.UUID) (*domain.Order, error) {
	ob.mu.RLock()
	defer ob.mu.RUnlock()

	entry, exists := ob.OrderMap[orderID]
	if !exists {
		return nil, ErrOrderNotFound
	}

	return entry.Order, nil
}

// GetOrderCount returns the total number of orders in the book
// Complexity: O(1)
func (ob *OrderBook) GetOrderCount() int {
	ob.mu.RLock()
	defer ob.mu.RUnlock()

	return len(ob.OrderMap)
}

// GetSnapshot returns a full snapshot of the order book
// This is useful for WebSocket broadcasting
func (ob *OrderBook) GetSnapshot() *OrderBookSnapshot {
	ob.mu.RLock()
	defer ob.mu.RUnlock()

	return &OrderBookSnapshot{
		Symbol:     ob.Symbol,
		Timestamp:  time.Now(),
		Bids:       ob.Bids.GetAllLevels(),
		Asks:       ob.Asks.GetAllLevels(),
		OrderCount: len(ob.OrderMap),
	}
}

// OrderBookDepth represents order book depth snapshot
type OrderBookDepth struct {
	Symbol    string
	Timestamp time.Time
	Bids      []PriceLevelSnapshot // Sorted: highest to lowest
	Asks      []PriceLevelSnapshot // Sorted: lowest to highest
}

// OrderBookSnapshot represents a full order book snapshot
type OrderBookSnapshot struct {
	Symbol     string
	Timestamp  time.Time
	Bids       []PriceLevelSnapshot
	Asks       []PriceLevelSnapshot
	OrderCount int
}

// PriceLevelSnapshot represents a price level for external consumption
type PriceLevelSnapshot struct {
	Price      string `json:"price"`
	Volume     string `json:"volume"`
	OrderCount int    `json:"order_count"`
}
