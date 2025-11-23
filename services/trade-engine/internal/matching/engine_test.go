// ============================================================================
// MYTRADER TRADE ENGINE - MATCHING ENGINE TESTS
// ============================================================================
// Component: Comprehensive test suite for matching engine
// Coverage Target: >80%
// Test Categories: Market Orders, Limit Orders, Price-Time Priority, Concurrency
// ============================================================================

package matching

import (
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/mytrader/trade-engine/internal/domain"
)

// ===========================================================================
// TEST HELPERS
// ===========================================================================

// createTestOrder creates a test order with specified parameters
func createTestOrder(symbol string, side domain.OrderSide, orderType domain.OrderType,
	quantity string, price string) *domain.Order {

	qty, _ := decimal.NewFromString(quantity)

	order := &domain.Order{
		ID:             uuid.New(),
		UserID:         uuid.New(),
		Symbol:         symbol,
		Side:           side,
		Type:           orderType,
		Quantity:       qty,
		FilledQuantity: decimal.Zero,
		TimeInForce:    domain.TimeInForceGTC,
	}

	if orderType == domain.OrderTypeLimit {
		prc, _ := decimal.NewFromString(price)
		order.Price = &prc
	}

	return order
}

// createMarketOrder creates a market order
func createMarketOrder(symbol string, side domain.OrderSide, quantity string) *domain.Order {
	return createTestOrder(symbol, side, domain.OrderTypeMarket, quantity, "0")
}

// createLimitOrder creates a limit order
func createLimitOrder(symbol string, side domain.OrderSide, quantity, price string) *domain.Order {
	return createTestOrder(symbol, side, domain.OrderTypeLimit, quantity, price)
}

// ===========================================================================
// MARKET ORDER TESTS
// ===========================================================================

func TestMatchingEngine_MarketOrder_FullyFilledSingleLevel(t *testing.T) {
	engine := NewMatchingEngine()

	// Place limit sell order (maker)
	sellOrder := createLimitOrder("BTC/USDT", domain.OrderSideSell, "1.0", "50000.00")
	trades, err := engine.PlaceOrder(sellOrder)
	require.NoError(t, err)
	assert.Empty(t, trades) // No match yet

	// Place market buy order (taker)
	buyOrder := createMarketOrder("BTC/USDT", domain.OrderSideBuy, "1.0")
	trades, err = engine.PlaceOrder(buyOrder)
	require.NoError(t, err)

	// Verify trade created
	require.Len(t, trades, 1)
	assert.Equal(t, "50000", trades[0].Price.String())
	assert.Equal(t, "1", trades[0].Quantity.String())
	assert.Equal(t, buyOrder.UserID, trades[0].BuyerUserID)
	assert.Equal(t, sellOrder.UserID, trades[0].SellerUserID)
	assert.False(t, trades[0].IsBuyerMaker) // Buyer is taker

	// Verify orders filled
	assert.Equal(t, domain.OrderStatusFilled, buyOrder.Status)
	assert.True(t, buyOrder.IsFilled())
	assert.Equal(t, domain.OrderStatusFilled, sellOrder.Status)
	assert.True(t, sellOrder.IsFilled())
}

func TestMatchingEngine_MarketOrder_MultiLevelMatching(t *testing.T) {
	engine := NewMatchingEngine()

	// Place multiple limit sell orders at different prices
	sellOrder1 := createLimitOrder("BTC/USDT", domain.OrderSideSell, "0.5", "50000.00")
	sellOrder2 := createLimitOrder("BTC/USDT", domain.OrderSideSell, "0.5", "50100.00")
	sellOrder3 := createLimitOrder("BTC/USDT", domain.OrderSideSell, "0.5", "50200.00")

	engine.PlaceOrder(sellOrder1)
	engine.PlaceOrder(sellOrder2)
	engine.PlaceOrder(sellOrder3)

	// Place market buy order that needs multiple levels
	buyOrder := createMarketOrder("BTC/USDT", domain.OrderSideBuy, "1.2")
	trades, err := engine.PlaceOrder(buyOrder)
	require.NoError(t, err)

	// Verify 3 trades created at different prices
	require.Len(t, trades, 3)

	// First trade at best price (50000)
	assert.Equal(t, "50000", trades[0].Price.String())
	assert.Equal(t, "0.5", trades[0].Quantity.String())

	// Second trade at next price (50100)
	assert.Equal(t, "50100", trades[1].Price.String())
	assert.Equal(t, "0.5", trades[1].Quantity.String())

	// Third trade at highest price (50200) for remaining quantity
	assert.Equal(t, "50200", trades[2].Price.String())
	assert.Equal(t, "0.2", trades[2].Quantity.String())

	// Verify buy order fully filled
	assert.Equal(t, domain.OrderStatusFilled, buyOrder.Status)
	assert.Equal(t, "1.2", buyOrder.FilledQuantity.String())
}

func TestMatchingEngine_MarketOrder_PartialFillInsufficientLiquidity(t *testing.T) {
	engine := NewMatchingEngine()

	// Place limit sell order with limited quantity
	sellOrder := createLimitOrder("BTC/USDT", domain.OrderSideSell, "0.5", "50000.00")
	engine.PlaceOrder(sellOrder)

	// Place market buy order for more than available
	buyOrder := createMarketOrder("BTC/USDT", domain.OrderSideBuy, "1.0")
	trades, err := engine.PlaceOrder(buyOrder)
	require.NoError(t, err)

	// Verify partial fill
	require.Len(t, trades, 1)
	assert.Equal(t, "0.5", trades[0].Quantity.String())

	// Buyer partially filled
	assert.Equal(t, domain.OrderStatusPartiallyFilled, buyOrder.Status)
	assert.Equal(t, "0.5", buyOrder.FilledQuantity.String())
	assert.Equal(t, "0.5", buyOrder.RemainingQuantity().String())

	// Seller fully filled
	assert.Equal(t, domain.OrderStatusFilled, sellOrder.Status)
}

func TestMatchingEngine_MarketOrder_EmptyOrderBook(t *testing.T) {
	engine := NewMatchingEngine()

	// Place market order with no liquidity available
	buyOrder := createMarketOrder("BTC/USDT", domain.OrderSideBuy, "1.0")
	trades, err := engine.PlaceOrder(buyOrder)
	require.NoError(t, err)

	// No trades executed
	assert.Empty(t, trades)

	// Order remains open but unfilled
	assert.Equal(t, domain.OrderStatusOpen, buyOrder.Status)
	assert.True(t, buyOrder.FilledQuantity.IsZero())
}

func TestMatchingEngine_MarketOrder_FOK_Rejected(t *testing.T) {
	engine := NewMatchingEngine()

	// Place limit sell order with insufficient quantity
	sellOrder := createLimitOrder("BTC/USDT", domain.OrderSideSell, "0.5", "50000.00")
	engine.PlaceOrder(sellOrder)

	// Place FOK market buy order that cannot fill completely
	buyOrder := createMarketOrder("BTC/USDT", domain.OrderSideBuy, "1.0")
	buyOrder.TimeInForce = domain.TimeInForceFOK

	trades, err := engine.PlaceOrder(buyOrder)

	// FOK order should be rejected
	assert.Error(t, err)
	assert.Equal(t, ErrFOKNotFilled, err)
	assert.Nil(t, trades)

	// Sell order should remain untouched
	assert.Equal(t, domain.OrderStatusOpen, sellOrder.Status)
}

func TestMatchingEngine_MarketOrder_FOK_FullyFilled(t *testing.T) {
	engine := NewMatchingEngine()

	// Place limit sell order with sufficient quantity
	sellOrder := createLimitOrder("BTC/USDT", domain.OrderSideSell, "1.0", "50000.00")
	engine.PlaceOrder(sellOrder)

	// Place FOK market buy order that can fill completely
	buyOrder := createMarketOrder("BTC/USDT", domain.OrderSideBuy, "1.0")
	buyOrder.TimeInForce = domain.TimeInForceFOK

	trades, err := engine.PlaceOrder(buyOrder)

	// FOK order should succeed
	require.NoError(t, err)
	require.Len(t, trades, 1)
	assert.Equal(t, domain.OrderStatusFilled, buyOrder.Status)
}

func TestMatchingEngine_MarketSellOrder(t *testing.T) {
	engine := NewMatchingEngine()

	// Place limit buy orders (bid side)
	buyOrder1 := createLimitOrder("BTC/USDT", domain.OrderSideBuy, "0.5", "50000.00")
	buyOrder2 := createLimitOrder("BTC/USDT", domain.OrderSideBuy, "0.5", "49900.00")

	engine.PlaceOrder(buyOrder1)
	engine.PlaceOrder(buyOrder2)

	// Place market sell order
	sellOrder := createMarketOrder("BTC/USDT", domain.OrderSideSell, "0.7")
	trades, err := engine.PlaceOrder(sellOrder)
	require.NoError(t, err)

	// Should match against highest bid first (50000)
	require.Len(t, trades, 2)
	assert.Equal(t, "50000", trades[0].Price.String())
	assert.Equal(t, "0.5", trades[0].Quantity.String())
	assert.Equal(t, "49900", trades[1].Price.String())
	assert.Equal(t, "0.2", trades[1].Quantity.String())

	// Verify sell order filled
	assert.Equal(t, domain.OrderStatusFilled, sellOrder.Status)
}

// ===========================================================================
// LIMIT ORDER TESTS
// ===========================================================================

func TestMatchingEngine_LimitOrder_ImmediateMatch(t *testing.T) {
	engine := NewMatchingEngine()

	// Place limit sell order
	sellOrder := createLimitOrder("BTC/USDT", domain.OrderSideSell, "1.0", "50000.00")
	engine.PlaceOrder(sellOrder)

	// Place limit buy order that crosses (higher price)
	buyOrder := createLimitOrder("BTC/USDT", domain.OrderSideBuy, "1.0", "50100.00")
	trades, err := engine.PlaceOrder(buyOrder)
	require.NoError(t, err)

	// Should match immediately at maker's price (50000)
	require.Len(t, trades, 1)
	assert.Equal(t, "50000", trades[0].Price.String()) // Price improvement for buyer
	assert.Equal(t, "1", trades[0].Quantity.String())

	// Both orders filled
	assert.Equal(t, domain.OrderStatusFilled, buyOrder.Status)
	assert.Equal(t, domain.OrderStatusFilled, sellOrder.Status)
}

func TestMatchingEngine_LimitOrder_NoMatch_AddedToBook(t *testing.T) {
	engine := NewMatchingEngine()

	// Place limit sell order at 50000
	sellOrder := createLimitOrder("BTC/USDT", domain.OrderSideSell, "1.0", "50000.00")
	trades, err := engine.PlaceOrder(sellOrder)
	require.NoError(t, err)

	// No match
	assert.Empty(t, trades)
	assert.Equal(t, domain.OrderStatusOpen, sellOrder.Status)

	// Verify order added to book
	ob := engine.GetOrderBook("BTC/USDT")
	assert.Equal(t, 1, ob.GetOrderCount())

	bestAsk, err := ob.GetBestAsk()
	require.NoError(t, err)
	assert.Equal(t, "50000", bestAsk.Price.String())
}

func TestMatchingEngine_LimitOrder_PartialMatchRemainderToBook(t *testing.T) {
	engine := NewMatchingEngine()

	// Place limit sell order for 0.5 BTC
	sellOrder := createLimitOrder("BTC/USDT", domain.OrderSideSell, "0.5", "50000.00")
	engine.PlaceOrder(sellOrder)

	// Place limit buy order for 1.0 BTC (more than available)
	buyOrder := createLimitOrder("BTC/USDT", domain.OrderSideBuy, "1.0", "50000.00")
	trades, err := engine.PlaceOrder(buyOrder)
	require.NoError(t, err)

	// Partial match
	require.Len(t, trades, 1)
	assert.Equal(t, "0.5", trades[0].Quantity.String())

	// Buyer partially filled, remainder in book
	assert.Equal(t, domain.OrderStatusPartiallyFilled, buyOrder.Status)
	assert.Equal(t, "0.5", buyOrder.FilledQuantity.String())

	// Verify remaining 0.5 BTC buy order in book
	ob := engine.GetOrderBook("BTC/USDT")
	bestBid, err := ob.GetBestBid()
	require.NoError(t, err)
	assert.Equal(t, "50000", bestBid.Price.String())
	assert.Equal(t, "0.5", bestBid.TotalVolume.String())
}

func TestMatchingEngine_LimitOrder_IOC_CancelUnfilled(t *testing.T) {
	engine := NewMatchingEngine()

	// Place limit sell order for 0.5 BTC
	sellOrder := createLimitOrder("BTC/USDT", domain.OrderSideSell, "0.5", "50000.00")
	engine.PlaceOrder(sellOrder)

	// Place IOC limit buy order for 1.0 BTC
	buyOrder := createLimitOrder("BTC/USDT", domain.OrderSideBuy, "1.0", "50000.00")
	buyOrder.TimeInForce = domain.TimeInForceIOC

	trades, err := engine.PlaceOrder(buyOrder)
	require.NoError(t, err)

	// Partial match (0.5 filled)
	require.Len(t, trades, 1)
	assert.Equal(t, "0.5", trades[0].Quantity.String())

	// Order partially filled, but remainder NOT added to book (IOC)
	assert.Equal(t, domain.OrderStatusPartiallyFilled, buyOrder.Status)

	// Verify no buy orders in book
	ob := engine.GetOrderBook("BTC/USDT")
	_, err = ob.GetBestBid()
	assert.Error(t, err) // No bids in book
}

func TestMatchingEngine_LimitOrder_FOK_CompletelyFilled(t *testing.T) {
	engine := NewMatchingEngine()

	// Place limit sell order for 1.0 BTC
	sellOrder := createLimitOrder("BTC/USDT", domain.OrderSideSell, "1.0", "50000.00")
	engine.PlaceOrder(sellOrder)

	// Place FOK limit buy order for 1.0 BTC
	buyOrder := createLimitOrder("BTC/USDT", domain.OrderSideBuy, "1.0", "50000.00")
	buyOrder.TimeInForce = domain.TimeInForceFOK

	trades, err := engine.PlaceOrder(buyOrder)
	require.NoError(t, err)

	// Complete match
	require.Len(t, trades, 1)
	assert.Equal(t, domain.OrderStatusFilled, buyOrder.Status)
}

func TestMatchingEngine_LimitOrder_FOK_Rejected(t *testing.T) {
	engine := NewMatchingEngine()

	// Place limit sell order for 0.5 BTC (insufficient)
	sellOrder := createLimitOrder("BTC/USDT", domain.OrderSideSell, "0.5", "50000.00")
	engine.PlaceOrder(sellOrder)

	// Place FOK limit buy order for 1.0 BTC
	buyOrder := createLimitOrder("BTC/USDT", domain.OrderSideBuy, "1.0", "50000.00")
	buyOrder.TimeInForce = domain.TimeInForceFOK

	trades, err := engine.PlaceOrder(buyOrder)

	// FOK order rejected
	assert.Error(t, err)
	assert.Equal(t, ErrFOKNotFilled, err)
	assert.Nil(t, trades)

	// Sell order untouched
	assert.Equal(t, domain.OrderStatusOpen, sellOrder.Status)
}

func TestMatchingEngine_LimitOrder_PriceImprovement(t *testing.T) {
	engine := NewMatchingEngine()

	// Place limit sell order at 50000
	sellOrder := createLimitOrder("BTC/USDT", domain.OrderSideSell, "1.0", "50000.00")
	engine.PlaceOrder(sellOrder)

	// Place limit buy order willing to pay 51000 (price improvement possible)
	buyOrder := createLimitOrder("BTC/USDT", domain.OrderSideBuy, "1.0", "51000.00")
	trades, err := engine.PlaceOrder(buyOrder)
	require.NoError(t, err)

	// Match at seller's price (50000), not buyer's limit (51000)
	require.Len(t, trades, 1)
	assert.Equal(t, "50000", trades[0].Price.String())
}

func TestMatchingEngine_LimitOrder_MultiLevelMatching(t *testing.T) {
	engine := NewMatchingEngine()

	// Place multiple limit sell orders
	sellOrder1 := createLimitOrder("BTC/USDT", domain.OrderSideSell, "0.5", "50000.00")
	sellOrder2 := createLimitOrder("BTC/USDT", domain.OrderSideSell, "0.5", "50100.00")
	sellOrder3 := createLimitOrder("BTC/USDT", domain.OrderSideSell, "0.5", "50200.00")

	engine.PlaceOrder(sellOrder1)
	engine.PlaceOrder(sellOrder2)
	engine.PlaceOrder(sellOrder3)

	// Place limit buy order that crosses multiple levels
	buyOrder := createLimitOrder("BTC/USDT", domain.OrderSideBuy, "1.2", "50200.00")
	trades, err := engine.PlaceOrder(buyOrder)
	require.NoError(t, err)

	// Should match 3 trades at increasing prices
	require.Len(t, trades, 3)
	assert.Equal(t, "50000", trades[0].Price.String())
	assert.Equal(t, "50100", trades[1].Price.String())
	assert.Equal(t, "50200", trades[2].Price.String())
}

// ===========================================================================
// PRICE-TIME PRIORITY TESTS
// ===========================================================================

func TestMatchingEngine_PriceTimePriority_PriceFirst(t *testing.T) {
	engine := NewMatchingEngine()

	// Add sell orders at different prices (worse price added first)
	sellOrder1 := createLimitOrder("BTC/USDT", domain.OrderSideSell, "1.0", "50100.00")
	sellOrder2 := createLimitOrder("BTC/USDT", domain.OrderSideSell, "1.0", "50000.00") // Better price

	engine.PlaceOrder(sellOrder1) // Added first
	time.Sleep(1 * time.Millisecond)
	engine.PlaceOrder(sellOrder2) // Added second, but better price

	// Place market buy order
	buyOrder := createMarketOrder("BTC/USDT", domain.OrderSideBuy, "1.0")
	trades, err := engine.PlaceOrder(buyOrder)
	require.NoError(t, err)

	// Should match against better price (50000) despite being added second
	require.Len(t, trades, 1)
	assert.Equal(t, "50000", trades[0].Price.String())
	assert.Equal(t, sellOrder2.ID, trades[0].SellerOrderID)
}

func TestMatchingEngine_PriceTimePriority_TimeSecond(t *testing.T) {
	engine := NewMatchingEngine()

	// Add multiple sell orders at SAME price (time priority should apply)
	sellOrder1 := createLimitOrder("BTC/USDT", domain.OrderSideSell, "0.5", "50000.00")
	time.Sleep(1 * time.Millisecond)
	sellOrder2 := createLimitOrder("BTC/USDT", domain.OrderSideSell, "0.5", "50000.00")
	time.Sleep(1 * time.Millisecond)
	sellOrder3 := createLimitOrder("BTC/USDT", domain.OrderSideSell, "0.5", "50000.00")

	engine.PlaceOrder(sellOrder1) // First in time
	engine.PlaceOrder(sellOrder2) // Second
	engine.PlaceOrder(sellOrder3) // Third

	// Place market buy order for 1.0 BTC (matches 2 orders)
	buyOrder := createMarketOrder("BTC/USDT", domain.OrderSideBuy, "1.0")
	trades, err := engine.PlaceOrder(buyOrder)
	require.NoError(t, err)

	// Should match in FIFO order (sellOrder1, then sellOrder2)
	require.Len(t, trades, 2)
	assert.Equal(t, sellOrder1.ID, trades[0].SellerOrderID)
	assert.Equal(t, sellOrder2.ID, trades[1].SellerOrderID)
}

func TestMatchingEngine_PriceTimePriority_Combined(t *testing.T) {
	engine := NewMatchingEngine()

	// Create complex order book:
	// Price 49900: Order A (time 1)
	// Price 50000: Order B (time 2), Order C (time 3)
	// Price 50100: Order D (time 4)

	orderA := createLimitOrder("BTC/USDT", domain.OrderSideSell, "0.3", "49900.00")
	orderB := createLimitOrder("BTC/USDT", domain.OrderSideSell, "0.3", "50000.00")
	orderC := createLimitOrder("BTC/USDT", domain.OrderSideSell, "0.3", "50000.00")
	orderD := createLimitOrder("BTC/USDT", domain.OrderSideSell, "0.3", "50100.00")

	engine.PlaceOrder(orderA)
	time.Sleep(1 * time.Millisecond)
	engine.PlaceOrder(orderB)
	time.Sleep(1 * time.Millisecond)
	engine.PlaceOrder(orderC)
	time.Sleep(1 * time.Millisecond)
	engine.PlaceOrder(orderD)

	// Place market buy for 0.7 BTC
	buyOrder := createMarketOrder("BTC/USDT", domain.OrderSideBuy, "0.7")
	trades, err := engine.PlaceOrder(buyOrder)
	require.NoError(t, err)

	// Should match:
	// 1. Order A (best price 49900)
	// 2. Order B (next best price 50000, earlier than C)
	// 3. Order C (same price as B, but 0.1 BTC remaining)
	require.Len(t, trades, 3)
	assert.Equal(t, orderA.ID, trades[0].SellerOrderID)
	assert.Equal(t, "49900", trades[0].Price.String())
	assert.Equal(t, orderB.ID, trades[1].SellerOrderID)
	assert.Equal(t, "50000", trades[1].Price.String())
	assert.Equal(t, orderC.ID, trades[2].SellerOrderID)
	assert.Equal(t, "50000", trades[2].Price.String())
	assert.Equal(t, "0.1", trades[2].Quantity.String())
}

// ===========================================================================
// CANCEL ORDER TESTS
// ===========================================================================

func TestMatchingEngine_CancelOrder_Success(t *testing.T) {
	engine := NewMatchingEngine()

	// Place limit order
	order := createLimitOrder("BTC/USDT", domain.OrderSideBuy, "1.0", "50000.00")
	_, err := engine.PlaceOrder(order)
	require.NoError(t, err)

	// Cancel order
	err = engine.CancelOrder(order.ID, "BTC/USDT")
	assert.NoError(t, err)
	assert.Equal(t, domain.OrderStatusCancelled, order.Status)

	// Verify removed from order book
	ob := engine.GetOrderBook("BTC/USDT")
	_, err = ob.GetOrder(order.ID)
	assert.Error(t, err)
}

func TestMatchingEngine_CancelOrder_NotFound(t *testing.T) {
	engine := NewMatchingEngine()

	// Try to cancel non-existent order
	err := engine.CancelOrder(uuid.New(), "BTC/USDT")
	assert.Error(t, err)
	assert.Equal(t, ErrOrderNotFound, err)
}

func TestMatchingEngine_CancelOrder_AlreadyFilled(t *testing.T) {
	engine := NewMatchingEngine()

	// Create matched orders
	sellOrder := createLimitOrder("BTC/USDT", domain.OrderSideSell, "1.0", "50000.00")
	buyOrder := createLimitOrder("BTC/USDT", domain.OrderSideBuy, "1.0", "50000.00")

	engine.PlaceOrder(sellOrder)
	engine.PlaceOrder(buyOrder)

	// Try to cancel filled order
	err := engine.CancelOrder(sellOrder.ID, "BTC/USDT")
	assert.Error(t, err)
	assert.Equal(t, ErrOrderNotFound, err) // Order removed from book after fill
}

// ===========================================================================
// FEE CALCULATION TESTS
// ===========================================================================

func TestMatchingEngine_FeeCalculation_MakerTaker(t *testing.T) {
	engine := NewMatchingEngine()

	// Maker order (in book first)
	makerOrder := createLimitOrder("BTC/USDT", domain.OrderSideSell, "1.0", "50000.00")
	engine.PlaceOrder(makerOrder)

	// Taker order (aggressive)
	takerOrder := createMarketOrder("BTC/USDT", domain.OrderSideBuy, "1.0")
	trades, err := engine.PlaceOrder(takerOrder)
	require.NoError(t, err)

	require.Len(t, trades, 1)
	trade := trades[0]

	// Trade value: 50000 * 1.0 = 50000 USDT
	expectedTradeValue := decimal.NewFromInt(50000)
	assert.True(t, trade.GetTotalValue().Equal(expectedTradeValue))

	// Buyer (taker) fee: 0.10% of 50000 = 50 USDT
	expectedBuyerFee := decimal.NewFromInt(50)
	assert.True(t, trade.BuyerFee.Equal(expectedBuyerFee))

	// Seller (maker) fee: 0.05% of 50000 = 25 USDT
	expectedSellerFee := decimal.NewFromFloat(25)
	assert.True(t, trade.SellerFee.Equal(expectedSellerFee))

	// Total fees: 75 USDT
	expectedTotalFees := decimal.NewFromInt(75)
	assert.True(t, trade.GetTotalFees().Equal(expectedTotalFees))
}

// ===========================================================================
// CONCURRENCY TESTS
// ===========================================================================

func TestMatchingEngine_ConcurrentOrders_SameSymbol(t *testing.T) {
	engine := NewMatchingEngine()

	// Place 100 orders concurrently
	var wg sync.WaitGroup
	orderCount := 100

	for i := 0; i < orderCount; i++ {
		wg.Add(1)
		go func(index int) {
			defer wg.Done()

			var order *domain.Order
			if index%2 == 0 {
				// Even: Buy orders
				order = createLimitOrder("BTC/USDT", domain.OrderSideBuy, "1.0", "49900.00")
			} else {
				// Odd: Sell orders
				order = createLimitOrder("BTC/USDT", domain.OrderSideSell, "1.0", "50100.00")
			}

			_, err := engine.PlaceOrder(order)
			assert.NoError(t, err)
		}(i)
	}

	wg.Wait()

	// Verify statistics
	stats := engine.GetStatistics()
	assert.Equal(t, int64(orderCount), stats.OrdersProcessed)
}

func TestMatchingEngine_ConcurrentOrders_DifferentSymbols(t *testing.T) {
	engine := NewMatchingEngine()

	symbols := []string{"BTC/USDT", "ETH/USDT", "BNB/USDT", "SOL/USDT"}
	var wg sync.WaitGroup

	for _, symbol := range symbols {
		for i := 0; i < 25; i++ {
			wg.Add(1)
			go func(sym string, index int) {
				defer wg.Done()

				var order *domain.Order
				if index%2 == 0 {
					order = createLimitOrder(sym, domain.OrderSideBuy, "1.0", "1000.00")
				} else {
					order = createLimitOrder(sym, domain.OrderSideSell, "1.0", "1100.00")
				}

				_, err := engine.PlaceOrder(order)
				assert.NoError(t, err)
			}(symbol, i)
		}
	}

	wg.Wait()

	// Verify 4 order books created
	stats := engine.GetStatistics()
	assert.Equal(t, 4, stats.OrderBooksCount)
	assert.Equal(t, int64(100), stats.OrdersProcessed)
}

// ===========================================================================
// VALIDATION TESTS
// ===========================================================================

func TestMatchingEngine_Validation_InvalidQuantity(t *testing.T) {
	engine := NewMatchingEngine()

	order := createMarketOrder("BTC/USDT", domain.OrderSideBuy, "0")
	_, err := engine.PlaceOrder(order)

	assert.Error(t, err)
	assert.Equal(t, ErrInvalidQuantity, err)
	assert.Equal(t, domain.OrderStatusRejected, order.Status)
}

func TestMatchingEngine_Validation_LimitOrderNoPrice(t *testing.T) {
	engine := NewMatchingEngine()

	order := &domain.Order{
		ID:             uuid.New(),
		UserID:         uuid.New(),
		Symbol:         "BTC/USDT",
		Side:           domain.OrderSideBuy,
		Type:           domain.OrderTypeLimit,
		Quantity:       decimal.NewFromInt(1),
		FilledQuantity: decimal.Zero,
		TimeInForce:    domain.TimeInForceGTC,
		Price:          nil, // No price set
	}

	_, err := engine.PlaceOrder(order)
	assert.Error(t, err)
	assert.Equal(t, ErrInvalidPrice, err)
}

func TestMatchingEngine_Validation_EmptySymbol(t *testing.T) {
	engine := NewMatchingEngine()

	order := createMarketOrder("", domain.OrderSideBuy, "1.0")
	_, err := engine.PlaceOrder(order)

	assert.Error(t, err)
	assert.Equal(t, ErrInvalidSymbol, err)
}

// ===========================================================================
// STATISTICS TESTS
// ===========================================================================

func TestMatchingEngine_Statistics_TrackingAccurate(t *testing.T) {
	engine := NewMatchingEngine()

	// Execute some trades
	sellOrder := createLimitOrder("BTC/USDT", domain.OrderSideSell, "1.0", "50000.00")
	buyOrder := createMarketOrder("BTC/USDT", domain.OrderSideBuy, "1.0")

	engine.PlaceOrder(sellOrder)
	trades, _ := engine.PlaceOrder(buyOrder)

	// Verify statistics
	stats := engine.GetStatistics()
	assert.Equal(t, int64(1), stats.TradesExecuted)
	assert.Equal(t, int64(2), stats.OrdersProcessed)
	assert.True(t, stats.TotalVolume.GreaterThan(decimal.Zero))
	assert.True(t, stats.TotalFees.GreaterThan(decimal.Zero))

	// Verify fee calculation
	expectedVolume := trades[0].Price.Mul(trades[0].Quantity)
	assert.True(t, stats.TotalVolume.Equal(expectedVolume))
}
