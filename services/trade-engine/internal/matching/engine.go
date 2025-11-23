// ============================================================================
// MYTRADER TRADE ENGINE - MATCHING ENGINE (Production Implementation)
// ============================================================================
// Component: Matching Engine with Price-Time Priority Algorithm
// Version: 2.0 (integrates with Day 3 OrderBook)
// Performance Target: 1,000+ matches/second
// Thread Safety: Full concurrency support with symbol-level locking
// ============================================================================

package matching

import (
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"github.com/mytrader/trade-engine/internal/domain"
	"github.com/mytrader/trade-engine/internal/orderbook"
)

// Error definitions
var (
	ErrInvalidOrder        = errors.New("invalid order")
	ErrInvalidQuantity     = errors.New("quantity must be greater than 0")
	ErrInvalidPrice        = errors.New("price must be greater than 0 for limit orders")
	ErrInvalidSymbol       = errors.New("invalid or empty symbol")
	ErrUnsupportedOrderType = errors.New("unsupported order type")
	ErrOrderNotFound       = errors.New("order not found")
	ErrCannotCancelOrder   = errors.New("order cannot be cancelled in current status")
	ErrFOKNotFilled        = errors.New("FOK order could not be filled completely")
	ErrInsufficientLiquidity = errors.New("insufficient liquidity to fill market order")
)

// MatchingEngine manages order books for multiple trading symbols and executes trades
// using the Price-Time Priority algorithm.
//
// ARCHITECTURE:
//   - Multi-Symbol Support: One engine manages all trading pairs
//   - Symbol-Level Locking: Each OrderBook has its own RWMutex (concurrent symbol trading)
//   - Engine-Level Locking: OrderBooks map protected by engine RWMutex
//   - Thread-Safe: Supports concurrent order placement across symbols
//
// PERFORMANCE:
//   - Target: 1,000+ matches/second
//   - OrderBook: 476K ops/sec (Day 3 benchmark)
//   - Latency: <10ms (p99) for matching operations
//
// ALGORITHM: Price-Time Priority
//   1. Price Priority: Best prices matched first (highest bid, lowest ask)
//   2. Time Priority: FIFO at same price level (first order filled first)
//   3. Partial Fills: Orders can match across multiple price levels
//   4. Maker/Taker: Passive orders (in book) are makers, aggressive orders are takers
type MatchingEngine struct {
	// Order books mapped by symbol (e.g., "BTC/USDT" -> OrderBook)
	orderBooks map[string]*orderbook.OrderBook
	mu         sync.RWMutex

	// Fee configuration (as decimal percentages)
	makerFeeRate decimal.Decimal // Default: 0.0005 (0.05%)
	takerFeeRate decimal.Decimal // Default: 0.0010 (0.10%)

	// Event callbacks (for async processing)
	onTrade       func(*domain.Trade)            // Called when trade executes
	onOrderUpdate func(*domain.Order)            // Called when order status changes

	// Metrics and statistics
	stats *EngineStatistics
	statsM sync.RWMutex
}

// EngineStatistics tracks matching engine metrics
type EngineStatistics struct {
	TradesExecuted   int64           // Total number of trades
	OrdersProcessed  int64           // Total orders processed
	TotalVolume      decimal.Decimal // Total volume matched (in quote currency)
	TotalFees        decimal.Decimal // Total fees collected
	LastUpdateTime   time.Time
	OrderBooksCount  int             // Number of active symbol order books
}

// NewMatchingEngine creates a new matching engine with default configuration
func NewMatchingEngine() *MatchingEngine {
	return &MatchingEngine{
		orderBooks:   make(map[string]*orderbook.OrderBook),
		makerFeeRate: decimal.NewFromFloat(0.0005), // 0.05%
		takerFeeRate: decimal.NewFromFloat(0.0010), // 0.10%
		stats: &EngineStatistics{
			TotalVolume:    decimal.Zero,
			TotalFees:      decimal.Zero,
			LastUpdateTime: time.Now(),
		},
	}
}

// SetFeeRates updates the maker and taker fee rates
func (me *MatchingEngine) SetFeeRates(makerRate, takerRate decimal.Decimal) {
	me.mu.Lock()
	defer me.mu.Unlock()

	me.makerFeeRate = makerRate
	me.takerFeeRate = takerRate
}

// SetTradeCallback sets the callback function for trade events
func (me *MatchingEngine) SetTradeCallback(callback func(*domain.Trade)) {
	me.onTrade = callback
}

// SetOrderUpdateCallback sets the callback function for order status updates
func (me *MatchingEngine) SetOrderUpdateCallback(callback func(*domain.Order)) {
	me.onOrderUpdate = callback
}

// PlaceOrder is the main entry point for order matching.
// It validates the order, attempts to match it against the order book,
// and returns any trades that were executed.
//
// Returns:
//   - []*domain.Trade: List of trades executed (empty if no match)
//   - error: Validation or execution error
//
// Complexity: O(k * log n) where k is number of matched orders, n is price levels
func (me *MatchingEngine) PlaceOrder(order *domain.Order) ([]*domain.Trade, error) {
	// 1. Validate order
	if err := me.validateOrder(order); err != nil {
		order.Status = domain.OrderStatusRejected
		if me.onOrderUpdate != nil {
			me.onOrderUpdate(order)
		}
		return nil, err
	}

	// 2. Initialize order state
	if order.ID == uuid.Nil {
		order.ID = uuid.New()
	}
	order.Status = domain.OrderStatusOpen
	order.FilledQuantity = decimal.Zero
	now := time.Now()
	if order.CreatedAt.IsZero() {
		order.CreatedAt = now
	}
	order.UpdatedAt = now

	// 3. Get or create order book for symbol
	ob := me.getOrCreateOrderBook(order.Symbol)

	// 4. Match order based on type
	var trades []*domain.Trade
	var err error

	switch order.Type {
	case domain.OrderTypeMarket:
		trades, err = me.matchMarketOrder(order, ob)
	case domain.OrderTypeLimit:
		trades, err = me.matchLimitOrder(order, ob)
	default:
		return nil, ErrUnsupportedOrderType
	}

	if err != nil {
		order.Status = domain.OrderStatusRejected
		if me.onOrderUpdate != nil {
			me.onOrderUpdate(order)
		}
		return trades, err
	}

	// 5. Update order status based on fill
	if order.IsFilled() {
		order.Status = domain.OrderStatusFilled
	} else if order.IsPartiallyFilled() {
		order.Status = domain.OrderStatusPartiallyFilled
	}

	// 6. Update statistics
	me.updateStatistics(trades, order)

	// 7. Trigger order update callback
	if me.onOrderUpdate != nil {
		me.onOrderUpdate(order)
	}

	return trades, nil
}

// CancelOrder cancels an open order in the order book
//
// Parameters:
//   - orderID: UUID of the order to cancel
//   - symbol: Trading symbol (e.g., "BTC/USDT")
//
// Returns error if order not found or cannot be cancelled
func (me *MatchingEngine) CancelOrder(orderID uuid.UUID, symbol string) error {
	ob := me.getOrCreateOrderBook(symbol)

	// Get order from order book
	order, err := ob.GetOrder(orderID)
	if err != nil {
		return ErrOrderNotFound
	}

	// Check if order can be cancelled
	if !order.CanBeCancelled() {
		return ErrCannotCancelOrder
	}

	// Remove from order book
	if err := ob.RemoveOrder(orderID); err != nil {
		return err
	}

	// Update order status
	if err := order.Cancel(); err != nil {
		return err
	}

	// Trigger callback
	if me.onOrderUpdate != nil {
		me.onOrderUpdate(order)
	}

	return nil
}

// matchMarketOrder matches a market order against the order book
//
// Market orders consume liquidity from the opposite side of the book:
//   - Market BUY: Matches against ask orders (sell side), walking up price levels
//   - Market SELL: Matches against bid orders (buy side), walking down price levels
//
// The order will match until:
//   1. Fully filled, OR
//   2. Order book exhausted (no more liquidity)
//
// For FOK (Fill-or-Kill) orders, the entire order must fill or it's rejected.
//
// Complexity: O(k * log n) where k is matched orders, n is price levels
func (me *MatchingEngine) matchMarketOrder(order *domain.Order, ob *orderbook.OrderBook) ([]*domain.Trade, error) {
	trades := make([]*domain.Trade, 0)
	remaining := order.Quantity

	// Determine opposite side to match against
	var getBestLevel func() (*orderbook.PriceLevel, error)
	if order.Side == domain.OrderSideBuy {
		getBestLevel = ob.GetBestAsk // Buy against sell orders
	} else {
		getBestLevel = ob.GetBestBid // Sell against buy orders
	}

	// Keep matching until order filled or book exhausted
	for remaining.IsPositive() {
		// Get best price level
		level, err := getBestLevel()
		if err != nil || level == nil {
			// No more liquidity available
			break
		}

		// Match against orders at this price level (FIFO order - time priority)
		matchedOrders := level.Orders
		if len(matchedOrders) == 0 {
			break
		}

		for _, matchOrder := range matchedOrders {
			if remaining.IsZero() {
				break
			}

			// Calculate fill quantity (minimum of what's needed and what's available)
			fillQty := decimal.Min(remaining, matchOrder.RemainingQuantity())

			// Create trade at this price level
			trade := me.createTrade(order, matchOrder, level.Price, fillQty, false)
			trades = append(trades, trade)

			// Update incoming order
			order.FilledQuantity = order.FilledQuantity.Add(fillQty)
			remaining = remaining.Sub(fillQty)

			// Update matched order in order book
			if err := ob.UpdateOrder(matchOrder.ID, fillQty); err != nil {
				// Order book handles removal if fully filled
				return trades, fmt.Errorf("failed to update order in book: %w", err)
			}

			// Trigger callbacks
			if me.onOrderUpdate != nil {
				me.onOrderUpdate(matchOrder)
			}
			if me.onTrade != nil {
				me.onTrade(trade)
			}
		}
	}

	// Check Fill-or-Kill constraint
	if order.TimeInForce == domain.TimeInForceFOK && remaining.IsPositive() {
		// FOK order could not fill completely - reject it
		return nil, ErrFOKNotFilled
	}

	return trades, nil
}

// matchLimitOrder matches a limit order against the order book
//
// Limit orders have two phases:
//   1. TAKER PHASE: If price crosses (buy >= ask or sell <= bid), match immediately
//   2. MAKER PHASE: If not fully filled, add remaining quantity to book as maker order
//
// Price improvement is allowed: execution price can be better than limit price.
//
// Time-in-Force handling:
//   - GTC (Good-Till-Cancel): Remains in book until filled or cancelled
//   - IOC (Immediate-or-Cancel): Match immediately, cancel unfilled portion
//   - FOK (Fill-or-Kill): Fill completely or reject entire order
//
// Complexity: O(k * log n) where k is matched orders, n is price levels
func (me *MatchingEngine) matchLimitOrder(order *domain.Order, ob *orderbook.OrderBook) ([]*domain.Trade, error) {
	trades := make([]*domain.Trade, 0)
	remaining := order.Quantity

	// Determine matching conditions based on order side
	var getBestLevel func() (*orderbook.PriceLevel, error)
	var canMatch func(decimal.Decimal) bool

	if order.Side == domain.OrderSideBuy {
		getBestLevel = ob.GetBestAsk
		// Buy limit crosses if our price >= ask price (price improvement possible)
		canMatch = func(askPrice decimal.Decimal) bool {
			return order.Price.GreaterThanOrEqual(askPrice)
		}
	} else {
		getBestLevel = ob.GetBestBid
		// Sell limit crosses if our price <= bid price (price improvement possible)
		canMatch = func(bidPrice decimal.Decimal) bool {
			return order.Price.LessThanOrEqual(bidPrice)
		}
	}

	// PHASE 1: TAKER - Try to match against existing orders
	for remaining.IsPositive() {
		level, err := getBestLevel()
		if err != nil || level == nil || !canMatch(level.Price) {
			// No matching price available
			break
		}

		// Match against orders at this level (FIFO - time priority)
		matchedOrders := level.Orders
		if len(matchedOrders) == 0 {
			break
		}

		for _, matchOrder := range matchedOrders {
			if remaining.IsZero() {
				break
			}

			fillQty := decimal.Min(remaining, matchOrder.RemainingQuantity())

			// Create trade (incoming order is taker, matched order is maker)
			trade := me.createTrade(order, matchOrder, level.Price, fillQty, false)
			trades = append(trades, trade)

			// Update incoming order
			order.FilledQuantity = order.FilledQuantity.Add(fillQty)
			remaining = remaining.Sub(fillQty)

			// Update matched order in book
			if err := ob.UpdateOrder(matchOrder.ID, fillQty); err != nil {
				return trades, fmt.Errorf("failed to update order in book: %w", err)
			}

			// Trigger callbacks
			if me.onOrderUpdate != nil {
				me.onOrderUpdate(matchOrder)
			}
			if me.onTrade != nil {
				me.onTrade(trade)
			}
		}
	}

	// PHASE 2: MAKER - Add remaining quantity to order book
	if remaining.IsPositive() {
		// Check Time-in-Force constraints
		switch order.TimeInForce {
		case domain.TimeInForceIOC:
			// Immediate-or-Cancel: Don't add to book, return partial fill
			return trades, nil

		case domain.TimeInForceFOK:
			// Fill-or-Kill: Must fill completely
			if len(trades) == 0 {
				// No fills at all
				return nil, ErrFOKNotFilled
			}
			// Partial fill - reject
			return nil, ErrFOKNotFilled

		case domain.TimeInForceGTC:
			// Good-Till-Cancel: Add to book as maker
			if err := ob.AddOrder(order); err != nil {
				return trades, fmt.Errorf("failed to add order to book: %w", err)
			}
		}
	}

	return trades, nil
}

// createTrade creates a trade record from two matching orders
//
// Parameters:
//   - incomingOrder: The aggressive order (taker)
//   - matchOrder: The passive order (maker, in the book)
//   - price: Execution price (always the maker's price)
//   - quantity: Fill quantity
//   - isIncomingMaker: Whether incoming order is maker (typically false for market/limit taker)
//
// Returns: Populated Trade struct with fees calculated
func (me *MatchingEngine) createTrade(
	incomingOrder, matchOrder *domain.Order,
	price, quantity decimal.Decimal,
	isIncomingMaker bool,
) *domain.Trade {
	trade := &domain.Trade{
		ID:         uuid.New(),
		Symbol:     incomingOrder.Symbol,
		Price:      price,
		Quantity:   quantity,
		ExecutedAt: time.Now(),
	}

	// Determine buyer and seller based on incoming order side
	if incomingOrder.Side == domain.OrderSideBuy {
		// Incoming is buy order
		trade.BuyerOrderID = incomingOrder.ID
		trade.BuyerUserID = incomingOrder.UserID
		trade.SellerOrderID = matchOrder.ID
		trade.SellerUserID = matchOrder.UserID
		trade.IsBuyerMaker = isIncomingMaker
	} else {
		// Incoming is sell order
		trade.BuyerOrderID = matchOrder.ID
		trade.BuyerUserID = matchOrder.UserID
		trade.SellerOrderID = incomingOrder.ID
		trade.SellerUserID = incomingOrder.UserID
		trade.IsBuyerMaker = !isIncomingMaker
	}

	// Calculate fees based on maker/taker roles
	tradeValue := price.Mul(quantity)

	if trade.IsBuyerMaker {
		// Buyer is maker (lower fee), seller is taker (higher fee)
		trade.BuyerFee = tradeValue.Mul(me.makerFeeRate)
		trade.SellerFee = tradeValue.Mul(me.takerFeeRate)
	} else {
		// Buyer is taker (higher fee), seller is maker (lower fee)
		trade.BuyerFee = tradeValue.Mul(me.takerFeeRate)
		trade.SellerFee = tradeValue.Mul(me.makerFeeRate)
	}

	return trade
}

// validateOrder validates order parameters before matching
func (me *MatchingEngine) validateOrder(order *domain.Order) error {
	if order == nil {
		return ErrInvalidOrder
	}

	// Validate quantity
	if order.Quantity.LessThanOrEqual(decimal.Zero) {
		return ErrInvalidQuantity
	}

	// Validate symbol
	if order.Symbol == "" {
		return ErrInvalidSymbol
	}

	// Validate side
	if !order.Side.IsValid() {
		return errors.New("invalid order side")
	}

	// Validate type-specific requirements
	if order.Type == domain.OrderTypeLimit {
		if order.Price == nil || order.Price.LessThanOrEqual(decimal.Zero) {
			return ErrInvalidPrice
		}
	}

	// Validate time-in-force
	if !order.TimeInForce.IsValid() {
		return errors.New("invalid time in force")
	}

	return nil
}

// getOrCreateOrderBook gets or creates an order book for a symbol
// Thread-safe with engine-level locking
func (me *MatchingEngine) getOrCreateOrderBook(symbol string) *orderbook.OrderBook {
	// Try to get existing order book (read lock)
	me.mu.RLock()
	ob, exists := me.orderBooks[symbol]
	me.mu.RUnlock()

	if exists {
		return ob
	}

	// Create new order book (write lock)
	me.mu.Lock()
	defer me.mu.Unlock()

	// Double-check (another goroutine might have created it)
	if ob, exists := me.orderBooks[symbol]; exists {
		return ob
	}

	// Create and store new order book
	ob = orderbook.NewOrderBook(symbol)
	me.orderBooks[symbol] = ob

	return ob
}

// updateStatistics updates matching engine statistics
func (me *MatchingEngine) updateStatistics(trades []*domain.Trade, order *domain.Order) {
	me.statsM.Lock()
	defer me.statsM.Unlock()

	me.stats.TradesExecuted += int64(len(trades))
	me.stats.OrdersProcessed++

	for _, trade := range trades {
		volume := trade.Price.Mul(trade.Quantity)
		me.stats.TotalVolume = me.stats.TotalVolume.Add(volume)
		me.stats.TotalFees = me.stats.TotalFees.Add(trade.GetTotalFees())
	}

	me.stats.LastUpdateTime = time.Now()
}

// GetOrderBookSnapshot returns order book snapshot for a symbol
func (me *MatchingEngine) GetOrderBookSnapshot(symbol string, depth int) *orderbook.OrderBookDepth {
	ob := me.getOrCreateOrderBook(symbol)
	return ob.GetDepth(depth)
}

// GetStatistics returns current matching engine statistics
func (me *MatchingEngine) GetStatistics() *EngineStatistics {
	me.statsM.RLock()
	defer me.statsM.RUnlock()

	me.mu.RLock()
	me.stats.OrderBooksCount = len(me.orderBooks)
	me.mu.RUnlock()

	// Return a copy to avoid race conditions
	statsCopy := *me.stats
	return &statsCopy
}

// GetOrderBook returns the order book for a symbol (for testing/debugging)
func (me *MatchingEngine) GetOrderBook(symbol string) *orderbook.OrderBook {
	return me.getOrCreateOrderBook(symbol)
}
