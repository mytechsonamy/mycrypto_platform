// ============================================================================
// MYTRADER TRADE ENGINE - CORE MATCHING ENGINE PROTOTYPE
// ============================================================================
// Project: MyTrader White-Label Kripto Exchange Platform
// Component: Matching Engine (In-Memory)
// Language: Go 1.21+
// Version: 1.0
// Date: 2024-11-22
// Description: Production-ready matching engine with Price-Time Priority
// ============================================================================

package matching

import (
	"container/heap"
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// ============================================================================
// TYPES & ENUMS
// ============================================================================

type Side string

const (
	SideBuy  Side = "BUY"
	SideSell Side = "SELL"
)

type OrderType string

const (
	OrderTypeMarket OrderType = "MARKET"
	OrderTypeLimit  OrderType = "LIMIT"
	OrderTypeStop   OrderType = "STOP"
)

type OrderStatus string

const (
	OrderStatusPending         OrderStatus = "PENDING"
	OrderStatusOpen            OrderStatus = "OPEN"
	OrderStatusPartiallyFilled OrderStatus = "PARTIALLY_FILLED"
	OrderStatusFilled          OrderStatus = "FILLED"
	OrderStatusCancelled       OrderStatus = "CANCELLED"
	OrderStatusRejected        OrderStatus = "REJECTED"
)

type TimeInForce string

const (
	TimeInForceGTC TimeInForce = "GTC" // Good Till Cancelled
	TimeInForceIOC TimeInForce = "IOC" // Immediate or Cancel
	TimeInForceFOK TimeInForce = "FOK" // Fill or Kill
)

// ============================================================================
// ORDER STRUCTURE
// ============================================================================

type Order struct {
	OrderID          string          `json:"order_id"`
	UserID           string          `json:"user_id"`
	Symbol           string          `json:"symbol"`
	Side             Side            `json:"side"`
	OrderType        OrderType       `json:"order_type"`
	Status           OrderStatus     `json:"status"`
	Quantity         decimal.Decimal `json:"quantity"`
	FilledQuantity   decimal.Decimal `json:"filled_quantity"`
	Price            decimal.Decimal `json:"price"`            // Nil for MARKET
	StopPrice        decimal.Decimal `json:"stop_price"`       // For STOP orders
	TimeInForce      TimeInForce     `json:"time_in_force"`
	ClientOrderID    string          `json:"client_order_id"`
	CreatedAt        time.Time       `json:"created_at"`
	UpdatedAt        time.Time       `json:"updated_at"`
	
	// Internal fields
	index int // Heap index for priority queue
}

// RemainingQuantity returns unfilled quantity
func (o *Order) RemainingQuantity() decimal.Decimal {
	return o.Quantity.Sub(o.FilledQuantity)
}

// IsFilled checks if order is completely filled
func (o *Order) IsFilled() bool {
	return o.FilledQuantity.Equal(o.Quantity)
}

// ============================================================================
// TRADE STRUCTURE
// ============================================================================

type Trade struct {
	TradeID         string          `json:"trade_id"`
	Symbol          string          `json:"symbol"`
	BuyerOrderID    string          `json:"buyer_order_id"`
	SellerOrderID   string          `json:"seller_order_id"`
	BuyerUserID     string          `json:"buyer_user_id"`
	SellerUserID    string          `json:"seller_user_id"`
	Price           decimal.Decimal `json:"price"`
	Quantity        decimal.Decimal `json:"quantity"`
	BuyerFee        decimal.Decimal `json:"buyer_fee"`
	SellerFee       decimal.Decimal `json:"seller_fee"`
	IsBuyerMaker    bool            `json:"is_buyer_maker"`
	ExecutedAt      time.Time       `json:"executed_at"`
}

// ============================================================================
// PRICE LEVEL (Order aggregation at same price)
// ============================================================================

type PriceLevel struct {
	Price    decimal.Decimal
	Orders   []*Order // FIFO queue at this price
	Quantity decimal.Decimal // Total quantity at this level
}

func NewPriceLevel(price decimal.Decimal) *PriceLevel {
	return &PriceLevel{
		Price:    price,
		Orders:   make([]*Order, 0),
		Quantity: decimal.Zero,
	}
}

func (pl *PriceLevel) AddOrder(order *Order) {
	pl.Orders = append(pl.Orders, order)
	pl.Quantity = pl.Quantity.Add(order.RemainingQuantity())
}

func (pl *PriceLevel) RemoveOrder(orderID string) bool {
	for i, order := range pl.Orders {
		if order.OrderID == orderID {
			pl.Quantity = pl.Quantity.Sub(order.RemainingQuantity())
			pl.Orders = append(pl.Orders[:i], pl.Orders[i+1:]...)
			return true
		}
	}
	return false
}

func (pl *PriceLevel) IsEmpty() bool {
	return len(pl.Orders) == 0
}

// ============================================================================
// PRIORITY QUEUE (Min-Heap for Asks, Max-Heap for Bids)
// ============================================================================

type PriceQueue struct {
	levels []*PriceLevel
	isAsk  bool // true for ask (min-heap), false for bid (max-heap)
}

func NewPriceQueue(isAsk bool) *PriceQueue {
	pq := &PriceQueue{
		levels: make([]*PriceLevel, 0),
		isAsk:  isAsk,
	}
	heap.Init(pq)
	return pq
}

// Implement heap.Interface
func (pq PriceQueue) Len() int { return len(pq.levels) }

func (pq PriceQueue) Less(i, j int) bool {
	if pq.isAsk {
		// Min-heap for asks (lowest price first)
		return pq.levels[i].Price.LessThan(pq.levels[j].Price)
	}
	// Max-heap for bids (highest price first)
	return pq.levels[i].Price.GreaterThan(pq.levels[j].Price)
}

func (pq PriceQueue) Swap(i, j int) {
	pq.levels[i], pq.levels[j] = pq.levels[j], pq.levels[i]
}

func (pq *PriceQueue) Push(x interface{}) {
	pq.levels = append(pq.levels, x.(*PriceLevel))
}

func (pq *PriceQueue) Pop() interface{} {
	old := pq.levels
	n := len(old)
	item := old[n-1]
	pq.levels = old[0 : n-1]
	return item
}

func (pq *PriceQueue) Peek() *PriceLevel {
	if len(pq.levels) == 0 {
		return nil
	}
	return pq.levels[0]
}

// ============================================================================
// ORDER BOOK (Single Symbol)
// ============================================================================

type OrderBook struct {
	Symbol     string
	Bids       *PriceQueue            // Buy orders (max-heap)
	Asks       *PriceQueue            // Sell orders (min-heap)
	Orders     map[string]*Order      // Order ID -> Order
	PriceLevels map[string]*PriceLevel // Price -> PriceLevel (for quick access)
	mu         sync.RWMutex
	
	// Statistics
	LastPrice      decimal.Decimal
	LastUpdateTime time.Time
}

func NewOrderBook(symbol string) *OrderBook {
	return &OrderBook{
		Symbol:      symbol,
		Bids:        NewPriceQueue(false), // Max-heap
		Asks:        NewPriceQueue(true),  // Min-heap
		Orders:      make(map[string]*Order),
		PriceLevels: make(map[string]*PriceLevel),
		LastPrice:   decimal.Zero,
	}
}

// AddOrder adds an order to the order book
func (ob *OrderBook) AddOrder(order *Order) error {
	ob.mu.Lock()
	defer ob.mu.Unlock()
	
	if order.Price.IsZero() {
		return errors.New("cannot add market order to order book")
	}
	
	// Check for duplicate
	if _, exists := ob.Orders[order.OrderID]; exists {
		return errors.New("order already exists in order book")
	}
	
	// Add to orders map
	ob.Orders[order.OrderID] = order
	
	// Find or create price level
	priceKey := order.Price.String()
	priceLevel, exists := ob.PriceLevels[priceKey]
	
	if !exists {
		priceLevel = NewPriceLevel(order.Price)
		ob.PriceLevels[priceKey] = priceLevel
		
		// Add price level to appropriate queue
		if order.Side == SideBuy {
			heap.Push(ob.Bids, priceLevel)
		} else {
			heap.Push(ob.Asks, priceLevel)
		}
	}
	
	// Add order to price level
	priceLevel.AddOrder(order)
	ob.LastUpdateTime = time.Now()
	
	return nil
}

// RemoveOrder removes an order from the order book
func (ob *OrderBook) RemoveOrder(orderID string) error {
	ob.mu.Lock()
	defer ob.mu.Unlock()
	
	order, exists := ob.Orders[orderID]
	if !exists {
		return errors.New("order not found")
	}
	
	// Remove from price level
	priceKey := order.Price.String()
	priceLevel := ob.PriceLevels[priceKey]
	
	if priceLevel != nil {
		priceLevel.RemoveOrder(orderID)
		
		// Remove price level if empty
		if priceLevel.IsEmpty() {
			delete(ob.PriceLevels, priceKey)
			// Note: Heap cleanup happens during matching
		}
	}
	
	// Remove from orders map
	delete(ob.Orders, orderID)
	ob.LastUpdateTime = time.Now()
	
	return nil
}

// GetBestBid returns the highest bid price
func (ob *OrderBook) GetBestBid() decimal.Decimal {
	ob.mu.RLock()
	defer ob.mu.RUnlock()
	
	level := ob.Bids.Peek()
	if level == nil {
		return decimal.Zero
	}
	return level.Price
}

// GetBestAsk returns the lowest ask price
func (ob *OrderBook) GetBestAsk() decimal.Decimal {
	ob.mu.RLock()
	defer ob.mu.RUnlock()
	
	level := ob.Asks.Peek()
	if level == nil {
		return decimal.Zero
	}
	return level.Price
}

// GetDepth returns order book depth (price levels with quantities)
func (ob *OrderBook) GetDepth(levels int) (bids, asks [][]string) {
	ob.mu.RLock()
	defer ob.mu.RUnlock()
	
	// Get bids
	bids = make([][]string, 0, levels)
	bidCount := 0
	for _, level := range ob.Bids.levels {
		if bidCount >= levels {
			break
		}
		bids = append(bids, []string{
			level.Price.String(),
			level.Quantity.String(),
		})
		bidCount++
	}
	
	// Get asks
	asks = make([][]string, 0, levels)
	askCount := 0
	for _, level := range ob.Asks.levels {
		if askCount >= levels {
			break
		}
		asks = append(asks, []string{
			level.Price.String(),
			level.Quantity.String(),
		})
		askCount++
	}
	
	return bids, asks
}

// ============================================================================
// MATCHING ENGINE
// ============================================================================

// MatchingEngine manages order books for multiple trading symbols.
//
// ARCHITECTURE DECISION: Multi-Symbol Engine with Per-Symbol Locking
//
// Current Implementation:
//   - Single MatchingEngine instance manages ALL symbols
//   - Each OrderBook has its own sync.RWMutex (symbol-level locking)
//   - GetOrCreateOrderBook() is thread-safe with engine-level mutex
//
// Concurrency Strategy:
//   ✅ GOOD: Multiple symbols can be matched concurrently (no cross-symbol blocking)
//   ✅ GOOD: Read operations (GetDepth, GetBestBid/Ask) don't block writes on other symbols
//   ⚠️  CONSIDERATION: High-frequency single symbol might benefit from dedicated engine
//
// Alternative Architectures:
//   1. One Engine Per Symbol: Better isolation, more memory overhead
//      - Use when: Single symbol has >10K orders/sec
//      - Deploy: Separate instances per BTC/USDT, ETH/USDT, etc.
//
//   2. Sharded Engines: Group symbols by activity level
//      - Hot symbols (BTC, ETH): Dedicated engines
//      - Warm symbols (BNB, SOL): Shared engine
//      - Cold symbols (long-tail): Single shared engine
//
// Production Recommendation:
//   - Start with current multi-symbol approach
//   - Monitor per-symbol latency and contention
//   - Split hot symbols to dedicated engines if p99 latency > 50ms
//
// Redis Integration (Production):
//   - Current: In-memory Go maps
//   - Production: Redis-backed order book with local cache
//   - Write: Sync to Redis (persistence)
//   - Read: Local cache + Redis fallback
//
type MatchingEngine struct {
	OrderBooks map[string]*OrderBook // Symbol -> OrderBook
	mu         sync.RWMutex
	
	// Fee configuration
	MakerFee decimal.Decimal
	TakerFee decimal.Decimal
	
	// Callbacks
	OnTrade func(trade *Trade)
	OnOrderUpdate func(order *Order)
}

func NewMatchingEngine() *MatchingEngine {
	return &MatchingEngine{
		OrderBooks: make(map[string]*OrderBook),
		MakerFee:   decimal.NewFromFloat(0.0005), // 0.05%
		TakerFee:   decimal.NewFromFloat(0.0010), // 0.10%
	}
}

// GetOrCreateOrderBook returns order book for symbol
func (me *MatchingEngine) GetOrCreateOrderBook(symbol string) *OrderBook {
	me.mu.Lock()
	defer me.mu.Unlock()
	
	ob, exists := me.OrderBooks[symbol]
	if !exists {
		ob = NewOrderBook(symbol)
		me.OrderBooks[symbol] = ob
	}
	
	return ob
}

// PlaceOrder places a new order and attempts to match it
func (me *MatchingEngine) PlaceOrder(order *Order) ([]*Trade, error) {
	// Validate order
	if err := me.validateOrder(order); err != nil {
		order.Status = OrderStatusRejected
		return nil, err
	}
	
	order.Status = OrderStatusOpen
	order.CreatedAt = time.Now()
	order.UpdatedAt = time.Now()
	order.FilledQuantity = decimal.Zero
	
	// Get order book
	ob := me.GetOrCreateOrderBook(order.Symbol)
	
	// Match order
	var trades []*Trade
	var err error
	
	switch order.OrderType {
	case OrderTypeMarket:
		trades, err = me.matchMarketOrder(order, ob)
	case OrderTypeLimit:
		trades, err = me.matchLimitOrder(order, ob)
	default:
		return nil, fmt.Errorf("unsupported order type: %s", order.OrderType)
	}
	
	if err != nil {
		return trades, err
	}
	
	// Update order status
	if order.IsFilled() {
		order.Status = OrderStatusFilled
	} else if order.FilledQuantity.IsPositive() {
		order.Status = OrderStatusPartiallyFilled
	}
	
	// Callback
	if me.OnOrderUpdate != nil {
		me.OnOrderUpdate(order)
	}
	
	return trades, nil
}

// CancelOrder cancels an open order
func (me *MatchingEngine) CancelOrder(orderID string, symbol string) error {
	ob := me.GetOrCreateOrderBook(symbol)
	
	ob.mu.Lock()
	order, exists := ob.Orders[orderID]
	ob.mu.Unlock()
	
	if !exists {
		return errors.New("order not found")
	}
	
	if order.Status != OrderStatusOpen && order.Status != OrderStatusPartiallyFilled {
		return errors.New("order cannot be cancelled")
	}
	
	// Remove from order book
	if err := ob.RemoveOrder(orderID); err != nil {
		return err
	}
	
	order.Status = OrderStatusCancelled
	order.UpdatedAt = time.Now()
	
	// Callback
	if me.OnOrderUpdate != nil {
		me.OnOrderUpdate(order)
	}
	
	return nil
}

// validateOrder validates order parameters
func (me *MatchingEngine) validateOrder(order *Order) error {
	if order.Quantity.LessThanOrEqual(decimal.Zero) {
		return errors.New("quantity must be positive")
	}
	
	if order.OrderType == OrderTypeLimit && order.Price.LessThanOrEqual(decimal.Zero) {
		return errors.New("limit order must have positive price")
	}
	
	return nil
}

// matchMarketOrder matches a market order
func (me *MatchingEngine) matchMarketOrder(order *Order, ob *OrderBook) ([]*Trade, error) {
	trades := make([]*Trade, 0)
	remaining := order.Quantity
	
	// Determine which side of the book to match against
	var queue *PriceQueue
	if order.Side == SideBuy {
		queue = ob.Asks // Buy matches against sell orders
	} else {
		queue = ob.Bids // Sell matches against buy orders
	}
	
	// Match against available liquidity
	for remaining.IsPositive() && queue.Len() > 0 {
		// Get best price level
		level := queue.Peek()
		if level == nil || level.IsEmpty() {
			break
		}
		
		// Match against orders at this level (FIFO)
		for len(level.Orders) > 0 && remaining.IsPositive() {
			matchOrder := level.Orders[0]
			
			// Calculate fill quantity
			fillQty := decimal.Min(remaining, matchOrder.RemainingQuantity())
			
			// Create trade
			trade := me.createTrade(order, matchOrder, level.Price, fillQty, false)
			trades = append(trades, trade)
			
			// Update filled quantities
			order.FilledQuantity = order.FilledQuantity.Add(fillQty)
			matchOrder.FilledQuantity = matchOrder.FilledQuantity.Add(fillQty)
			remaining = remaining.Sub(fillQty)
			
			// Update match order status
			if matchOrder.IsFilled() {
				matchOrder.Status = OrderStatusFilled
				level.RemoveOrder(matchOrder.OrderID)
				ob.Orders[matchOrder.OrderID] = nil
				delete(ob.Orders, matchOrder.OrderID)
				
				if me.OnOrderUpdate != nil {
					me.OnOrderUpdate(matchOrder)
				}
			} else {
				matchOrder.Status = OrderStatusPartiallyFilled
				level.Quantity = level.Quantity.Sub(fillQty)
				
				if me.OnOrderUpdate != nil {
					me.OnOrderUpdate(matchOrder)
				}
			}
			
			// Callback for trade
			if me.OnTrade != nil {
				me.OnTrade(trade)
			}
		}
		
		// Remove empty price level
		if level.IsEmpty() {
			heap.Pop(queue)
			delete(ob.PriceLevels, level.Price.String())
		}
	}
	
	// Check if FOK and not filled
	if order.TimeInForce == TimeInForceFOK && remaining.IsPositive() {
		// Rollback trades (in production, this would be handled differently)
		return nil, errors.New("FOK order could not be filled completely")
	}
	
	// Update last price
	if len(trades) > 0 {
		ob.LastPrice = trades[len(trades)-1].Price
	}
	
	return trades, nil
}

// matchLimitOrder matches a limit order
func (me *MatchingEngine) matchLimitOrder(order *Order, ob *OrderBook) ([]*Trade, error) {
	trades := make([]*Trade, 0)
	remaining := order.Quantity
	
	// Determine if order can be matched
	var queue *PriceQueue
	var canMatch func(decimal.Decimal) bool
	
	if order.Side == SideBuy {
		queue = ob.Asks
		canMatch = func(price decimal.Decimal) bool {
			return order.Price.GreaterThanOrEqual(price)
		}
	} else {
		queue = ob.Bids
		canMatch = func(price decimal.Decimal) bool {
			return order.Price.LessThanOrEqual(price)
		}
	}
	
	// Try to match
	for remaining.IsPositive() && queue.Len() > 0 {
		level := queue.Peek()
		if level == nil || !canMatch(level.Price) {
			break
		}
		
		// Match against orders at this level
		for len(level.Orders) > 0 && remaining.IsPositive() {
			matchOrder := level.Orders[0]
			
			fillQty := decimal.Min(remaining, matchOrder.RemainingQuantity())
			
			// Create trade (incoming limit order is taker)
			trade := me.createTrade(order, matchOrder, level.Price, fillQty, false)
			trades = append(trades, trade)
			
			order.FilledQuantity = order.FilledQuantity.Add(fillQty)
			matchOrder.FilledQuantity = matchOrder.FilledQuantity.Add(fillQty)
			remaining = remaining.Sub(fillQty)
			
			// Update match order
			if matchOrder.IsFilled() {
				matchOrder.Status = OrderStatusFilled
				level.RemoveOrder(matchOrder.OrderID)
				delete(ob.Orders, matchOrder.OrderID)
				
				if me.OnOrderUpdate != nil {
					me.OnOrderUpdate(matchOrder)
				}
			} else {
				matchOrder.Status = OrderStatusPartiallyFilled
				level.Quantity = level.Quantity.Sub(fillQty)
				
				if me.OnOrderUpdate != nil {
					me.OnOrderUpdate(matchOrder)
				}
			}
			
			if me.OnTrade != nil {
				me.OnTrade(trade)
			}
		}
		
		if level.IsEmpty() {
			heap.Pop(queue)
			delete(ob.PriceLevels, level.Price.String())
		}
	}
	
	// Add remaining quantity to order book (maker)
	if remaining.IsPositive() {
		if order.TimeInForce == TimeInForceIOC {
			// IOC: Don't add to book
			return trades, nil
		}
		
		if order.TimeInForce == TimeInForceFOK && remaining.Equal(order.Quantity) {
			// FOK: Must fill completely
			return nil, errors.New("FOK order could not be filled")
		}
		
		// Add to order book
		if err := ob.AddOrder(order); err != nil {
			return trades, err
		}
	}
	
	// Update last price
	if len(trades) > 0 {
		ob.LastPrice = trades[len(trades)-1].Price
	}
	
	return trades, nil
}

// createTrade creates a trade record
func (me *MatchingEngine) createTrade(incomingOrder, matchOrder *Order, price, quantity decimal.Decimal, isMaker bool) *Trade {
	trade := &Trade{
		TradeID:      uuid.New().String(),
		Symbol:       incomingOrder.Symbol,
		Price:        price,
		Quantity:     quantity,
		ExecutedAt:   time.Now(),
	}
	
	// Determine buyer and seller
	if incomingOrder.Side == SideBuy {
		trade.BuyerOrderID = incomingOrder.OrderID
		trade.BuyerUserID = incomingOrder.UserID
		trade.SellerOrderID = matchOrder.OrderID
		trade.SellerUserID = matchOrder.UserID
		trade.IsBuyerMaker = isMaker
	} else {
		trade.BuyerOrderID = matchOrder.OrderID
		trade.BuyerUserID = matchOrder.UserID
		trade.SellerOrderID = incomingOrder.OrderID
		trade.SellerUserID = incomingOrder.UserID
		trade.IsBuyerMaker = !isMaker
	}
	
	// Calculate fees
	tradeValue := price.Mul(quantity)
	if trade.IsBuyerMaker {
		trade.BuyerFee = tradeValue.Mul(me.MakerFee)
		trade.SellerFee = tradeValue.Mul(me.TakerFee)
	} else {
		trade.BuyerFee = tradeValue.Mul(me.TakerFee)
		trade.SellerFee = tradeValue.Mul(me.MakerFee)
	}
	
	return trade
}

// ============================================================================
// STATISTICS & MONITORING
// ============================================================================

// GetOrderBookSnapshot returns current order book state
func (me *MatchingEngine) GetOrderBookSnapshot(symbol string, depth int) map[string]interface{} {
	ob := me.GetOrCreateOrderBook(symbol)
	bids, asks := ob.GetDepth(depth)
	
	return map[string]interface{}{
		"symbol":      symbol,
		"bids":        bids,
		"asks":        asks,
		"last_price":  ob.LastPrice.String(),
		"best_bid":    ob.GetBestBid().String(),
		"best_ask":    ob.GetBestAsk().String(),
		"timestamp":   ob.LastUpdateTime.Format(time.RFC3339),
	}
}

// GetStatistics returns matching engine statistics
func (me *MatchingEngine) GetStatistics() map[string]interface{} {
	me.mu.RLock()
	defer me.mu.RUnlock()
	
	stats := map[string]interface{}{
		"total_symbols": len(me.OrderBooks),
		"symbols":       make(map[string]interface{}),
	}
	
	for symbol, ob := range me.OrderBooks {
		ob.mu.RLock()
		stats["symbols"].(map[string]interface{})[symbol] = map[string]interface{}{
			"total_orders":  len(ob.Orders),
			"bid_levels":    ob.Bids.Len(),
			"ask_levels":    ob.Asks.Len(),
			"last_price":    ob.LastPrice.String(),
			"best_bid":      ob.GetBestBid().String(),
			"best_ask":      ob.GetBestAsk().String(),
		}
		ob.mu.RUnlock()
	}
	
	return stats
}

// ============================================================================
// END OF MATCHING ENGINE
// ============================================================================
