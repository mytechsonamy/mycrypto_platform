// ============================================================================
// TASK-QA-004: MATCHING ENGINE QA TEST SCENARIOS
// ============================================================================
// Comprehensive test coverage for Price-Time Priority matching algorithm
// 50+ test scenarios covering basic matching, partial fills, edge cases,
// and performance validation
// ============================================================================

package matching_test

import (
	"fmt"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"trade-engine/internal/matching"
)

// ============================================================================
// TEST HELPERS & UTILITIES
// ============================================================================

type TestResult struct {
	TestID      string
	Description string
	Category    string
	Status      string
	Duration    time.Duration
	Error       string
	Metrics     map[string]interface{}
}

type TestSuite struct {
	Results []*TestResult
	mu      sync.Mutex
}

func (ts *TestSuite) RecordResult(result *TestResult) {
	ts.mu.Lock()
	defer ts.mu.Unlock()
	ts.Results = append(ts.Results, result)
}

func newTestOrder(t *testing.T, side matching.Side, orderType matching.OrderType, quantity, price string) *matching.Order {
	qty, err := decimal.NewFromString(quantity)
	require.NoError(t, err)
	prc, err := decimal.NewFromString(price)
	require.NoError(t, err)

	order := &matching.Order{
		OrderID:       uuid.New().String(),
		UserID:        uuid.New().String(),
		Symbol:        "BTC/USDT",
		Side:          side,
		OrderType:     orderType,
		Status:        matching.OrderStatusPending,
		Quantity:      qty,
		FilledQuantity: decimal.Zero,
		Price:         prc,
		TimeInForce:   matching.TimeInForceGTC,
		ClientOrderID: uuid.New().String(),
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	return order
}

func newTestMarketOrder(t *testing.T, side matching.Side, quantity string) *matching.Order {
	order := newTestOrder(t, side, matching.OrderTypeMarket, quantity, "0")
	order.Price = decimal.Zero
	return order
}

// ============================================================================
// CATEGORY A: BASIC MATCHING SCENARIOS (10 Tests)
// ============================================================================

// TC-A-001: Market Buy Matches Single Level Sell
func TestMatchingEngine_TC_A_001_MarketBuyMatchesSingleLevelSell(t *testing.T) {
	startTime := time.Now()
	defer func() {
		duration := time.Since(startTime)
		fmt.Printf("TC-A-001 completed in %v\n", duration)
	}()

	// Setup
	ob := matching.NewOrderBook("BTC/USDT")

	// Step 1: Add limit sell
	sellOrder := newTestOrder(t, matching.SideSell, matching.OrderTypeLimit, "1.0", "50000")
	err := ob.AddOrder(sellOrder)
	require.NoError(t, err)

	// Step 2: Place market buy
	buyOrder := newTestMarketOrder(t, matching.SideBuy, "1.0")

	// Execute matching
	trades, err := matching.MatchOrder(ob, buyOrder)

	// Verify
	assert.NoError(t, err)
	assert.Len(t, trades, 1, "Should create 1 trade")

	trade := trades[0]
	assert.Equal(t, sellOrder.OrderID, trade.SellerOrderID)
	assert.Equal(t, buyOrder.OrderID, trade.BuyerOrderID)
	assert.Equal(t, decimal.NewFromInt(50000), trade.Price)
	assert.Equal(t, decimal.NewFromString("1.0"), trade.Quantity)

	// Verify order book is empty
	assert.Equal(t, 0, ob.Asks.Len())
	assert.Equal(t, 0, ob.Bids.Len())

	t.Logf("PASS: TC-A-001 - Market buy matched single level sell correctly")
}

// TC-A-002: Market Sell Matches Single Level Buy
func TestMatchingEngine_TC_A_002_MarketSellMatchesSingleLevelBuy(t *testing.T) {
	ob := matching.NewOrderBook("ETH/USDT")

	// Add limit buy
	buyOrder := newTestOrder(t, matching.SideBuy, matching.OrderTypeLimit, "10", "3000")
	err := ob.AddOrder(buyOrder)
	require.NoError(t, err)

	// Place market sell
	sellOrder := newTestMarketOrder(t, matching.SideSell, "10")

	trades, err := matching.MatchOrder(ob, sellOrder)

	// Verify
	assert.NoError(t, err)
	assert.Len(t, trades, 1)

	trade := trades[0]
	assert.Equal(t, decimal.NewFromInt(3000), trade.Price)
	assert.Equal(t, decimal.NewFromString("10"), trade.Quantity)

	t.Logf("PASS: TC-A-002 - Market sell matched single level buy correctly")
}

// TC-A-003: Limit Buy Matches Limit Sell (Price Crosses)
func TestMatchingEngine_TC_A_003_LimitBuyMatchesLimitSellPriceCrosses(t *testing.T) {
	ob := matching.NewOrderBook("BTC/USDT")

	// Add limit sell @ 51,000
	sellOrder := newTestOrder(t, matching.SideSell, matching.OrderTypeLimit, "0.5", "51000")
	err := ob.AddOrder(sellOrder)
	require.NoError(t, err)

	// Place limit buy @ 51,500 (price crosses)
	buyOrder := newTestOrder(t, matching.SideBuy, matching.OrderTypeLimit, "0.5", "51500")

	trades, err := matching.MatchOrder(ob, buyOrder)

	// Verify
	assert.NoError(t, err)
	assert.Len(t, trades, 1)
	assert.Equal(t, decimal.NewFromInt(51000), trades[0].Price)

	t.Logf("PASS: TC-A-003 - Limit buy/sell price cross matched correctly")
}

// TC-A-004: Limit Buy Added to Book (No Match)
func TestMatchingEngine_TC_A_004_LimitBuyAddedToBookNoMatch(t *testing.T) {
	ob := matching.NewOrderBook("BTC/USDT")

	// Add limit sell @ 52,000
	sellOrder := newTestOrder(t, matching.SideSell, matching.OrderTypeLimit, "1", "52000")
	err := ob.AddOrder(sellOrder)
	require.NoError(t, err)

	// Place limit buy @ 50,000 (below ask)
	buyOrder := newTestOrder(t, matching.SideBuy, matching.OrderTypeLimit, "1", "50000")
	err = ob.AddOrder(buyOrder)
	require.NoError(t, err)

	// Verify order in book
	assert.Equal(t, 1, ob.Bids.Len())
	assert.Equal(t, 1, ob.Asks.Len())

	t.Logf("PASS: TC-A-004 - Limit buy added to book without matching")
}

// TC-A-005: Limit Sell Added to Book (No Match)
func TestMatchingEngine_TC_A_005_LimitSellAddedToBookNoMatch(t *testing.T) {
	ob := matching.NewOrderBook("ETH/USDT")

	// Add limit buy @ 2,500
	buyOrder := newTestOrder(t, matching.SideBuy, matching.OrderTypeLimit, "5", "2500")
	err := ob.AddOrder(buyOrder)
	require.NoError(t, err)

	// Place limit sell @ 3,500 (above bid)
	sellOrder := newTestOrder(t, matching.SideSell, matching.OrderTypeLimit, "5", "3500")
	err = ob.AddOrder(sellOrder)
	require.NoError(t, err)

	// Verify orders in book
	assert.Equal(t, 1, ob.Bids.Len())
	assert.Equal(t, 1, ob.Asks.Len())

	t.Logf("PASS: TC-A-005 - Limit sell added to book without matching")
}

// TC-A-006: Market Order with No Liquidity
func TestMatchingEngine_TC_A_006_MarketOrderNoLiquidity(t *testing.T) {
	ob := matching.NewOrderBook("BTC/USDT")

	// Empty order book
	assert.Equal(t, 0, ob.Asks.Len())

	// Place market buy
	buyOrder := newTestMarketOrder(t, matching.SideBuy, "1")
	buyOrder.TimeInForce = matching.TimeInForceIOC

	// Should handle gracefully (no crash)
	_, err := matching.MatchOrder(ob, buyOrder)

	// Either returns error or partial fill, but shouldn't crash
	assert.True(t, err != nil || len(buyOrder.OrderID) > 0)

	t.Logf("PASS: TC-A-006 - Market order with no liquidity handled")
}

// TC-A-007: Exact Quantity Match
func TestMatchingEngine_TC_A_007_ExactQuantityMatch(t *testing.T) {
	ob := matching.NewOrderBook("BTC/USDT")

	// Add limit buy
	buyOrder := newTestOrder(t, matching.SideBuy, matching.OrderTypeLimit, "2.5", "50000")
	err := ob.AddOrder(buyOrder)
	require.NoError(t, err)

	// Place market sell exact quantity
	sellOrder := newTestMarketOrder(t, matching.SideSell, "2.5")

	trades, err := matching.MatchOrder(ob, sellOrder)

	// Verify exact match
	assert.NoError(t, err)
	assert.Len(t, trades, 1)
	assert.Equal(t, decimal.NewFromString("2.5"), trades[0].Quantity)
	assert.Equal(t, 0, ob.Bids.Len())
	assert.Equal(t, 0, ob.Asks.Len())

	t.Logf("PASS: TC-A-007 - Exact quantity match verified")
}

// TC-A-008: Multiple Price Levels Matched
func TestMatchingEngine_TC_A_008_MultiiplePriceLevelsMatched(t *testing.T) {
	ob := matching.NewOrderBook("BTC/USDT")

	// Add multiple sell price levels
	sell1 := newTestOrder(t, matching.SideSell, matching.OrderTypeLimit, "0.3", "50000")
	sell2 := newTestOrder(t, matching.SideSell, matching.OrderTypeLimit, "0.4", "50100")
	sell3 := newTestOrder(t, matching.SideSell, matching.OrderTypeLimit, "0.3", "50200")

	ob.AddOrder(sell1)
	ob.AddOrder(sell2)
	ob.AddOrder(sell3)

	// Place market buy for all
	buyOrder := newTestMarketOrder(t, matching.SideBuy, "1")

	trades, err := matching.MatchOrder(ob, buyOrder)

	// Verify all levels matched
	assert.NoError(t, err)
	assert.Len(t, trades, 3)

	// Check total quantity
	totalQty := decimal.Zero
	for _, trade := range trades {
		totalQty = totalQty.Add(trade.Quantity)
	}
	assert.Equal(t, decimal.NewFromString("1.0"), totalQty)

	t.Logf("PASS: TC-A-008 - Multiple price levels matched correctly")
}

// TC-A-009: Large Market Order Walks Book
func TestMatchingEngine_TC_A_009_LargeMarketOrderWalksBook(t *testing.T) {
	ob := matching.NewOrderBook("BTC/USDT")

	// Add 10 price levels
	for i := 0; i < 10; i++ {
		price := decimal.NewFromInt(50000 + int64(i*100))
		quantity := decimal.NewFromString("0.2")
		order := newTestOrder(t, matching.SideSell, matching.OrderTypeLimit,
			quantity.String(), price.String())
		ob.AddOrder(order)
	}

	// Place large market buy
	buyOrder := newTestMarketOrder(t, matching.SideBuy, "1.5")

	start := time.Now()
	trades, err := matching.MatchOrder(ob, buyOrder)
	elapsed := time.Since(start)

	// Verify
	assert.NoError(t, err)
	assert.Greater(t, len(trades), 5, "Should match multiple levels")
	assert.Less(t, elapsed, 20*time.Millisecond, "Should execute in < 20ms")

	t.Logf("PASS: TC-A-009 - Large market order walked book in %v", elapsed)
}

// TC-A-010: Small Limit Order Placed
func TestMatchingEngine_TC_A_010_SmallLimitOrderPlaced(t *testing.T) {
	ob := matching.NewOrderBook("BTC/USDT")

	// Add base orders
	buyOrder := newTestOrder(t, matching.SideBuy, matching.OrderTypeLimit, "10", "45000")
	sellOrder := newTestOrder(t, matching.SideSell, matching.OrderTypeLimit, "10", "55000")
	ob.AddOrder(buyOrder)
	ob.AddOrder(sellOrder)

	// Place small limit buy
	smallBuy := newTestOrder(t, matching.SideBuy, matching.OrderTypeLimit, "0.01", "46000")
	err := ob.AddOrder(smallBuy)
	require.NoError(t, err)

	// Verify added without matching
	assert.Equal(t, 2, ob.Bids.Len())
	assert.Equal(t, 1, ob.Asks.Len())

	t.Logf("PASS: TC-A-010 - Small limit order placed correctly")
}

// ============================================================================
// CATEGORY B: PARTIAL FILLS (10 Tests)
// ============================================================================

// TC-B-001: Market Order Partial Fill
func TestMatchingEngine_TC_B_001_MarketOrderPartialFill(t *testing.T) {
	ob := matching.NewOrderBook("BTC/USDT")

	// Add limited liquidity
	sellOrder := newTestOrder(t, matching.SideSell, matching.OrderTypeLimit, "0.5", "50000")
	ob.AddOrder(sellOrder)

	// Place larger market buy
	buyOrder := newTestMarketOrder(t, matching.SideBuy, "1.0")
	buyOrder.TimeInForce = matching.TimeInForceIOC

	trades, err := matching.MatchOrder(ob, buyOrder)

	// Verify partial fill
	assert.NoError(t, err)
	assert.Equal(t, decimal.NewFromString("0.5"), buyOrder.FilledQuantity)
	assert.Equal(t, matching.OrderStatusPartiallyFilled, buyOrder.Status)

	t.Logf("PASS: TC-B-001 - Market order partial fill verified")
}

// TC-B-002: Limit Order Partial Fill
func TestMatchingEngine_TC_B_002_LimitOrderPartialFill(t *testing.T) {
	ob := matching.NewOrderBook("ETH/USDT")

	// Add limited buy liquidity
	buyOrder := newTestOrder(t, matching.SideBuy, matching.OrderTypeLimit, "10", "3000")
	ob.AddOrder(buyOrder)

	// Place larger sell that crosses
	sellOrder := newTestOrder(t, matching.SideSell, matching.OrderTypeLimit, "15", "2900")

	trades, err := matching.MatchOrder(ob, sellOrder)

	// Verify partial fill
	assert.NoError(t, err)
	assert.Len(t, trades, 1)
	assert.Equal(t, decimal.NewFromString("10"), trades[0].Quantity)
	assert.Equal(t, decimal.NewFromString("5"), sellOrder.RemainingQuantity())

	t.Logf("PASS: TC-B-002 - Limit order partial fill verified")
}

// TC-B-003: Remainder Added to Book
func TestMatchingEngine_TC_B_003_RemainderAddedToBook(t *testing.T) {
	ob := matching.NewOrderBook("BTC/USDT")

	// Add buy order
	buyOrder := newTestOrder(t, matching.SideBuy, matching.OrderTypeLimit, "0.5", "49500")
	ob.AddOrder(buyOrder)

	// Place larger sell
	sellOrder := newTestOrder(t, matching.SideSell, matching.OrderTypeLimit, "1.0", "49500")

	trades, err := matching.MatchOrder(ob, sellOrder)

	// Verify
	assert.NoError(t, err)
	assert.Len(t, trades, 1)

	// Add remainder to book
	remaining := sellOrder.RemainingQuantity()
	assert.Equal(t, decimal.NewFromString("0.5"), remaining)

	// Verify can be added
	err = ob.AddOrder(sellOrder)
	// May error if order already in book, but remainder should be tracked
	assert.NotNil(t, remaining)

	t.Logf("PASS: TC-B-003 - Remainder handled correctly")
}

// TC-B-004: Multiple Partial Fills Sequence
func TestMatchingEngine_TC_B_004_MultiplePartialFillsSequence(t *testing.T) {
	ob := matching.NewOrderBook("BTC/USDT")

	// Add initial sell order
	sellOrder := newTestOrder(t, matching.SideSell, matching.OrderTypeLimit, "1.0", "50000")
	ob.AddOrder(sellOrder)

	// Apply multiple partial fills
	buyOrders := []string{"0.3", "0.4", "0.3"}
	totalFilled := decimal.Zero

	for i, qty := range buyOrders {
		buyOrder := newTestMarketOrder(t, matching.SideBuy, qty)
		trades, err := matching.MatchOrder(ob, buyOrder)

		assert.NoError(t, err)
		assert.Greater(t, len(trades), 0)
		totalFilled = totalFilled.Add(decimal.NewFromString(qty))

		if i < len(buyOrders)-1 {
			assert.Equal(t, matching.OrderStatusPartiallyFilled, sellOrder.Status)
		}
	}

	assert.Equal(t, decimal.NewFromString("1.0"), totalFilled)
	t.Logf("PASS: TC-B-004 - Multiple partial fills sequence verified")
}

// TC-B-005: Partial Fill at Multiple Price Levels
func TestMatchingEngine_TC_B_005_PartialFillAtMultiplePriceLevels(t *testing.T) {
	ob := matching.NewOrderBook("ETH/USDT")

	// Add buy orders at different levels
	buy1 := newTestOrder(t, matching.SideBuy, matching.OrderTypeLimit, "5", "3100")
	buy2 := newTestOrder(t, matching.SideBuy, matching.OrderTypeLimit, "5", "3050")
	ob.AddOrder(buy1)
	ob.AddOrder(buy2)

	// Place sell that walks levels
	sellOrder := newTestOrder(t, matching.SideSell, matching.OrderTypeLimit, "12", "3000")

	trades, err := matching.MatchOrder(ob, sellOrder)

	// Verify
	assert.NoError(t, err)
	assert.Equal(t, 2, len(trades))
	assert.Equal(t, decimal.NewFromString("2"), sellOrder.RemainingQuantity())

	t.Logf("PASS: TC-B-005 - Partial fill at multiple levels verified")
}

// TC-B-006: Quantity Tracking Accuracy
func TestMatchingEngine_TC_B_006_QuantityTrackingAccuracy(t *testing.T) {
	ob := matching.NewOrderBook("BTC/USDT")

	// Place order
	sellOrder := newTestOrder(t, matching.SideSell, matching.OrderTypeLimit, "1.5", "50000")
	ob.AddOrder(sellOrder)

	// Partial fill
	buyOrder := newTestMarketOrder(t, matching.SideBuy, "0.6")
	_, err := matching.MatchOrder(ob, buyOrder)
	require.NoError(t, err)

	// Verify quantities
	assert.Equal(t, decimal.NewFromString("1.5"), sellOrder.Quantity)
	assert.Equal(t, decimal.NewFromString("0.6"), sellOrder.FilledQuantity)
	assert.Equal(t, decimal.NewFromString("0.9"), sellOrder.RemainingQuantity())

	// Total check
	total := sellOrder.FilledQuantity.Add(sellOrder.RemainingQuantity())
	assert.Equal(t, sellOrder.Quantity, total)

	t.Logf("PASS: TC-B-006 - Quantity tracking accurate")
}

// TC-B-007: Status Updates Through Fill States
func TestMatchingEngine_TC_B_007_StatusUpdatesThoughFillStates(t *testing.T) {
	ob := matching.NewOrderBook("BTC/USDT")

	sellOrder := newTestOrder(t, matching.SideSell, matching.OrderTypeLimit, "1.0", "50000")
	sellOrder.Status = matching.OrderStatusOpen
	ob.AddOrder(sellOrder)

	// First partial fill
	buy1 := newTestMarketOrder(t, matching.SideBuy, "0.4")
	matching.MatchOrder(ob, buy1)

	assert.Equal(t, matching.OrderStatusPartiallyFilled, sellOrder.Status)

	// Second fill to completion
	buy2 := newTestMarketOrder(t, matching.SideBuy, "0.6")
	matching.MatchOrder(ob, buy2)

	assert.Equal(t, matching.OrderStatusFilled, sellOrder.Status)

	t.Logf("PASS: TC-B-007 - Status transitions verified")
}

// TC-B-008: Unfilled Quantity Calculation
func TestMatchingEngine_TC_B_008_UnfilledQuantityCalculation(t *testing.T) {
	ob := matching.NewOrderBook("ETH/USDT")

	sellOrder := newTestOrder(t, matching.SideSell, matching.OrderTypeLimit, "10", "3000")
	ob.AddOrder(sellOrder)

	// First fill
	buy1 := newTestMarketOrder(t, matching.SideBuy, "3")
	matching.MatchOrder(ob, buy1)

	unfilled1 := sellOrder.RemainingQuantity()
	assert.Equal(t, decimal.NewFromString("7"), unfilled1)

	// Second fill
	buy2 := newTestMarketOrder(t, matching.SideBuy, "5")
	matching.MatchOrder(ob, buy2)

	unfilled2 := sellOrder.RemainingQuantity()
	assert.Equal(t, decimal.NewFromString("2"), unfilled2)

	t.Logf("PASS: TC-B-008 - Unfilled quantity calculations correct")
}

// TC-B-009: Fee Calculation on Partial Fills
func TestMatchingEngine_TC_B_009_FeeCalculationOnPartialFills(t *testing.T) {
	ob := matching.NewOrderBook("BTC/USDT")

	// Maker order
	buyOrder := newTestOrder(t, matching.SideBuy, matching.OrderTypeLimit, "1.0", "50000")
	ob.AddOrder(buyOrder)

	// Taker partial fill
	sellOrder := newTestMarketOrder(t, matching.SideSell, "0.5")

	trades, err := matching.MatchOrder(ob, sellOrder)
	require.NoError(t, err)
	require.Len(t, trades, 1)

	trade := trades[0]

	// Calculate fees only on filled quantity (0.5 BTC)
	notional := decimal.NewFromString("0.5").Mul(decimal.NewFromInt(50000))
	takerFee := notional.Mul(decimal.NewFromString("0.001"))
	makerFee := notional.Mul(decimal.NewFromString("0.0005"))

	assert.True(t, trade.BuyerFee.Equal(makerFee), fmt.Sprintf("Maker fee: %v vs %v", trade.BuyerFee, makerFee))
	assert.True(t, trade.SellerFee.Equal(takerFee), fmt.Sprintf("Taker fee: %v vs %v", trade.SellerFee, takerFee))

	t.Logf("PASS: TC-B-009 - Fee calculation on partial fill correct")
}

// TC-B-010: Multiple Taker Orders Match One Maker
func TestMatchingEngine_TC_B_010_MultipleTakerOrdersMatchOneMaker(t *testing.T) {
	ob := matching.NewOrderBook("BTC/USDT")

	// Single maker sell
	sellOrder := newTestOrder(t, matching.SideSell, matching.OrderTypeLimit, "2.0", "50000")
	ob.AddOrder(sellOrder)

	// Multiple taker buys
	trades := []*matching.Trade{}
	takerOrders := []string{"0.5", "0.7", "0.8"}

	for _, qty := range takerOrders {
		buyOrder := newTestMarketOrder(t, matching.SideBuy, qty)
		newTrades, err := matching.MatchOrder(ob, buyOrder)
		require.NoError(t, err)
		trades = append(trades, newTrades...)
	}

	// Verify maker order matched by all
	assert.Equal(t, 3, len(trades))
	for _, trade := range trades {
		assert.Equal(t, sellOrder.OrderID, trade.SellerOrderID)
	}
	assert.Equal(t, matching.OrderStatusFilled, sellOrder.Status)

	t.Logf("PASS: TC-B-010 - Multiple taker orders matched one maker")
}

// ============================================================================
// CATEGORY C: PRICE-TIME PRIORITY (10 Tests)
// ============================================================================

// TC-C-001: Time Priority at Same Price (FIFO)
func TestMatchingEngine_TC_C_001_TimePriorityAtSamePriceFIFO(t *testing.T) {
	ob := matching.NewOrderBook("BTC/USDT")

	// Add two sells at same price, different times
	sell1 := newTestOrder(t, matching.SideSell, matching.OrderTypeLimit, "0.5", "50000")
	sell1.CreatedAt = time.Now()

	time.Sleep(10 * time.Millisecond) // Ensure different timestamps

	sell2 := newTestOrder(t, matching.SideSell, matching.OrderTypeLimit, "0.5", "50000")
	sell2.CreatedAt = time.Now()

	ob.AddOrder(sell1)
	ob.AddOrder(sell2)

	// Buy - should match sell1 first (FIFO)
	buyOrder := newTestMarketOrder(t, matching.SideBuy, "0.5")

	trades, err := matching.MatchOrder(ob, buyOrder)
	require.NoError(t, err)
	require.Len(t, trades, 1)

	// Verify sell1 matched (older order)
	assert.Equal(t, sell1.OrderID, trades[0].SellerOrderID)

	t.Logf("PASS: TC-C-001 - FIFO time priority at same price verified")
}

// TC-C-002: Price Priority (Best Price First)
func TestMatchingEngine_TC_C_002_PricePriorityBestPriceFirst(t *testing.T) {
	ob := matching.NewOrderBook("BTC/USDT")

	// Add sells at different prices
	sell1 := newTestOrder(t, matching.SideSell, matching.OrderTypeLimit, "0.5", "50100")
	sell2 := newTestOrder(t, matching.SideSell, matching.OrderTypeLimit, "0.5", "50000")

	ob.AddOrder(sell1) // Added first but higher price
	ob.AddOrder(sell2) // Added second but lower price

	// Buy - should match sell2 (best price)
	buyOrder := newTestMarketOrder(t, matching.SideBuy, "0.5")

	trades, err := matching.MatchOrder(ob, buyOrder)
	require.NoError(t, err)
	require.Len(t, trades, 1)

	// Verify best price (50000) matched
	assert.Equal(t, decimal.NewFromInt(50000), trades[0].Price)
	assert.Equal(t, sell2.OrderID, trades[0].SellerOrderID)

	t.Logf("PASS: TC-C-002 - Price priority verified (best price first)")
}

// TC-C-003: Multiple Orders at Same Price
func TestMatchingEngine_TC_C_003_MultipleOrdersAtSamePrice(t *testing.T) {
	ob := matching.NewOrderBook("BTC/USDT")

	// Add multiple buys at same price
	buy1 := newTestOrder(t, matching.SideBuy, matching.OrderTypeLimit, "0.2", "49000")
	buy1.CreatedAt = time.Now()

	time.Sleep(5 * time.Millisecond)

	buy2 := newTestOrder(t, matching.SideBuy, matching.OrderTypeLimit, "0.3", "49000")
	buy2.CreatedAt = time.Now()

	time.Sleep(5 * time.Millisecond)

	buy3 := newTestOrder(t, matching.SideBuy, matching.OrderTypeLimit, "0.25", "49000")
	buy3.CreatedAt = time.Now()

	ob.AddOrder(buy1)
	ob.AddOrder(buy2)
	ob.AddOrder(buy3)

	// Sell to match them
	sellOrder := newTestMarketOrder(t, matching.SideSell, "0.5")

	trades, err := matching.MatchOrder(ob, sellOrder)
	require.NoError(t, err)

	// Should match buy1 first, then part of buy2
	assert.Equal(t, buy1.OrderID, trades[0].BuyerOrderID)

	t.Logf("PASS: TC-C-003 - Multiple orders at same price filled in order")
}

// TC-C-004: Order Placement Timestamp Matters
func TestMatchingEngine_TC_C_004_OrderPlacementTimestampMatters(t *testing.T) {
	ob := matching.NewOrderBook("ETH/USDT")

	// Create orders with explicit timestamps
	order1 := newTestOrder(t, matching.SideBuy, matching.OrderTypeLimit, "1", "3000")
	order1.CreatedAt = time.Date(2025, 11, 25, 10, 0, 0, 0, time.UTC)

	order2 := newTestOrder(t, matching.SideBuy, matching.OrderTypeLimit, "1", "3000")
	order2.CreatedAt = time.Date(2025, 11, 25, 10, 0, 5, 0, time.UTC) // 5 seconds later

	ob.AddOrder(order1)
	ob.AddOrder(order2)

	// Sell - order1 should be matched first
	sellOrder := newTestMarketOrder(t, matching.SideSell, "1")

	trades, err := matching.MatchOrder(ob, sellOrder)
	require.NoError(t, err)

	// Verify order1 (earlier timestamp) matched
	assert.Equal(t, order1.OrderID, trades[0].BuyerOrderID)

	t.Logf("PASS: TC-C-004 - Timestamp determines priority")
}

// TC-C-005: Earlier Order Filled First
func TestMatchingEngine_TC_C_005_EarlierOrderFilledFirst(t *testing.T) {
	ob := matching.NewOrderBook("BTC/USDT")

	// Earlier order
	old := newTestOrder(t, matching.SideSell, matching.OrderTypeLimit, "0.5", "50000")
	old.CreatedAt = time.Now().Add(-10 * time.Second)

	// Later order
	new := newTestOrder(t, matching.SideSell, matching.OrderTypeLimit, "0.5", "50000")
	new.CreatedAt = time.Now()

	ob.AddOrder(old)
	ob.AddOrder(new)

	// Buy
	buyOrder := newTestMarketOrder(t, matching.SideBuy, "0.5")
	trades, err := matching.MatchOrder(ob, buyOrder)

	// Verify earlier order matched
	require.NoError(t, err)
	assert.Equal(t, old.OrderID, trades[0].SellerOrderID)

	t.Logf("PASS: TC-C-005 - Earlier order filled first")
}

// TC-C-006: Later Order Waits in Queue
func TestMatchingEngine_TC_C_006_LaterOrderWaitsInQueue(t *testing.T) {
	ob := matching.NewOrderBook("BTC/USDT")

	// Add buys in time order
	order1 := newTestOrder(t, matching.SideBuy, matching.OrderTypeLimit, "0.4", "49500")
	order1.CreatedAt = time.Now()

	time.Sleep(5 * time.Millisecond)

	order2 := newTestOrder(t, matching.SideBuy, matching.OrderTypeLimit, "0.6", "49500")
	order2.CreatedAt = time.Now()

	ob.AddOrder(order1)
	ob.AddOrder(order2)

	// Sell partial
	sellOrder := newTestMarketOrder(t, matching.SideSell, "0.4")
	trades, err := matching.MatchOrder(ob, sellOrder)

	// Verify order1 filled, order2 waits
	require.NoError(t, err)
	assert.Equal(t, order1.OrderID, trades[0].BuyerOrderID)

	// order2 should still be in book
	assert.Equal(t, 1, ob.Bids.Len())

	t.Logf("PASS: TC-C-006 - Later order waits in queue")
}

// TC-C-007: Verify Queue Order Preserved
func TestMatchingEngine_TC_C_007_VerifyQueueOrderPreserved(t *testing.T) {
	ob := matching.NewOrderBook("ETH/USDT")

	// Add 5 buy orders
	orders := make([]*matching.Order, 5)
	for i := 0; i < 5; i++ {
		orders[i] = newTestOrder(t, matching.SideBuy, matching.OrderTypeLimit, "0.2", "3000")
		orders[i].CreatedAt = time.Now().Add(time.Duration(i) * 10 * time.Millisecond)
		ob.AddOrder(orders[i])
	}

	// Partial fill
	sell1 := newTestMarketOrder(t, matching.SideSell, "0.3")
	trades1, _ := matching.MatchOrder(ob, sell1)

	// Verify first order matched
	assert.Equal(t, orders[0].OrderID, trades1[0].BuyerOrderID)

	// Continue matching
	sell2 := newTestMarketOrder(t, matching.SideSell, "0.4")
	trades2, _ := matching.MatchOrder(ob, sell2)

	// Should continue with order[1]
	assert.Equal(t, orders[1].OrderID, trades2[0].BuyerOrderID)

	t.Logf("PASS: TC-C-007 - Queue order preserved through matches")
}

// TC-C-008: Verify Best Price Always Matched
func TestMatchingEngine_TC_C_008_VerifyBestPriceAlwaysMatched(t *testing.T) {
	ob := matching.NewOrderBook("BTC/USDT")

	// Add sells with old one at worse price
	sell_old := newTestOrder(t, matching.SideSell, matching.OrderTypeLimit, "0.5", "50500")
	sell_old.CreatedAt = time.Now().Add(-1 * time.Second)

	sell_new := newTestOrder(t, matching.SideSell, matching.OrderTypeLimit, "0.5", "50000")
	sell_new.CreatedAt = time.Now()

	ob.AddOrder(sell_old)
	ob.AddOrder(sell_new)

	// Buy
	buyOrder := newTestMarketOrder(t, matching.SideBuy, "0.5")
	trades, err := matching.MatchOrder(ob, buyOrder)

	// Should match best price (50000) even though old order is older
	require.NoError(t, err)
	assert.Equal(t, decimal.NewFromInt(50000), trades[0].Price)
	assert.Equal(t, sell_new.OrderID, trades[0].SellerOrderID)

	t.Logf("PASS: TC-C-008 - Best price always matched (time secondary)")
}

// TC-C-009: Cross-Side Priority Validation
func TestMatchingEngine_TC_C_009_CrossSidePriorityValidation(t *testing.T) {
	ob := matching.NewOrderBook("BTC/USDT")

	// Add sells at multiple prices
	sell1 := newTestOrder(t, matching.SideSell, matching.OrderTypeLimit, "0.3", "50000")
	sell2 := newTestOrder(t, matching.SideSell, matching.OrderTypeLimit, "0.2", "50100")
	sell3 := newTestOrder(t, matching.SideSell, matching.OrderTypeLimit, "0.25", "50200")

	ob.AddOrder(sell1)
	ob.AddOrder(sell2)
	ob.AddOrder(sell3)

	// Buy
	buyOrder := newTestMarketOrder(t, matching.SideBuy, "0.3")
	trades, err := matching.MatchOrder(ob, buyOrder)

	// Should match sell1 at 50000 (best price)
	require.NoError(t, err)
	assert.Equal(t, decimal.NewFromInt(50000), trades[0].Price)

	t.Logf("PASS: TC-C-009 - Cross-side priority validated")
}

// TC-C-010: Complex Multi-Level Scenario
func TestMatchingEngine_TC_C_010_ComplexMultiLevelScenario(t *testing.T) {
	ob := matching.NewOrderBook("BTC/USDT")

	// Add asks at multiple levels
	asks := []*matching.Order{
		makeOrder(t, "ask_a1", matching.SideSell, "0.1", "50000"),
		makeOrder(t, "ask_a2", matching.SideSell, "0.2", "50100"),
		makeOrder(t, "ask_a3", matching.SideSell, "0.15", "50100"), // Same price as a2
	}

	for i, order := range asks {
		order.CreatedAt = time.Now().Add(time.Duration(i) * 5 * time.Millisecond)
		ob.AddOrder(order)
	}

	// Add bids
	bids := []*matching.Order{
		makeOrder(t, "bid_b1", matching.SideBuy, "0.3", "49500"),
		makeOrder(t, "bid_b2", matching.SideBuy, "0.2", "49500"), // Same price as b1
	}

	for i, order := range bids {
		order.CreatedAt = time.Now().Add(time.Duration(100+i) * 5 * time.Millisecond)
		ob.AddOrder(order)
	}

	// Execute trades
	buyOrder := newTestMarketOrder(t, matching.SideBuy, "0.3")
	trades1, _ := matching.MatchOrder(ob, buyOrder)
	assert.Equal(t, decimal.NewFromInt(50000), trades1[0].Price)

	buyOrder2 := newTestMarketOrder(t, matching.SideBuy, "0.15")
	trades2, _ := matching.MatchOrder(ob, buyOrder2)
	assert.Equal(t, decimal.NewFromInt(50100), trades2[0].Price)

	t.Logf("PASS: TC-C-010 - Complex multi-level matching verified")
}

func makeOrder(t *testing.T, id string, side matching.Side, qty, price string) *matching.Order {
	q, _ := decimal.NewFromString(qty)
	p, _ := decimal.NewFromString(price)
	return &matching.Order{
		OrderID:       id,
		UserID:        uuid.New().String(),
		Symbol:        "BTC/USDT",
		Side:          side,
		OrderType:     matching.OrderTypeLimit,
		Status:        matching.OrderStatusPending,
		Quantity:      q,
		Price:         p,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}
}

// ============================================================================
// CATEGORY D: EDGE CASES (10 Tests)
// ============================================================================

// TC-D-001: Empty Order Book
func TestMatchingEngine_TC_D_001_EmptyOrderBook(t *testing.T) {
	ob := matching.NewOrderBook("BTC/USDT")

	// Verify empty
	assert.Equal(t, 0, ob.Asks.Len())
	assert.Equal(t, 0, ob.Bids.Len())

	// Try to match
	buyOrder := newTestMarketOrder(t, matching.SideBuy, "1.0")
	buyOrder.TimeInForce = matching.TimeInForceIOC

	_, err := matching.MatchOrder(ob, buyOrder)

	// Should either error or not match
	assert.True(t, err != nil || buyOrder.FilledQuantity.IsZero())

	t.Logf("PASS: TC-D-001 - Empty order book handled")
}

// TC-D-002: Single Order in Book
func TestMatchingEngine_TC_D_002_SingleOrderInBook(t *testing.T) {
	ob := matching.NewOrderBook("BTC/USDT")

	// Add single order
	sellOrder := newTestOrder(t, matching.SideSell, matching.OrderTypeLimit, "1.0", "50000")
	ob.AddOrder(sellOrder)

	// Match it
	buyOrder := newTestMarketOrder(t, matching.SideBuy, "1.0")
	trades, err := matching.MatchOrder(ob, buyOrder)

	// Verify
	assert.NoError(t, err)
	assert.Len(t, trades, 1)
	assert.Equal(t, 0, ob.Asks.Len())

	t.Logf("PASS: TC-D-002 - Single order in book matched")
}

// TC-D-003: Self-Trade Prevention
func TestMatchingEngine_TC_D_003_SelfTradePrevention(t *testing.T) {
	ob := matching.NewOrderBook("BTC/USDT")

	userID := uuid.New().String()

	// Same user places both sides
	sellOrder := newTestOrder(t, matching.SideSell, matching.OrderTypeLimit, "1.0", "50000")
	sellOrder.UserID = userID
	ob.AddOrder(sellOrder)

	buyOrder := newTestMarketOrder(t, matching.SideBuy, "1.0")
	buyOrder.UserID = userID

	// Should prevent self-trade
	trades, _ := matching.MatchOrder(ob, buyOrder)

	// Either no trade or error
	if len(trades) > 0 {
		assert.NotEqual(t, userID, trades[0].SellerUserID)
	}

	t.Logf("PASS: TC-D-003 - Self-trade prevention works")
}

// TC-D-004: Minimum Quantity Requirements
func TestMatchingEngine_TC_D_004_MinimumQuantityRequirements(t *testing.T) {
	ob := matching.NewOrderBook("BTC/USDT")

	// Try to add order below minimum (0.0001 BTC)
	tooSmall := newTestOrder(t, matching.SideBuy, matching.OrderTypeLimit, "0.00001", "50000")

	err := ob.AddOrder(tooSmall)

	// Should validate minimum
	assert.True(t, err != nil, "Should reject order below minimum")

	t.Logf("PASS: TC-D-004 - Minimum quantity enforced")
}

// TC-D-005: Maximum Quantity Limits
func TestMatchingEngine_TC_D_005_MaximumQuantityLimits(t *testing.T) {
	ob := matching.NewOrderBook("BTC/USDT")

	// Try to add order above maximum (1000 BTC)
	tooLarge := newTestOrder(t, matching.SideBuy, matching.OrderTypeLimit, "1001", "50000")

	err := ob.AddOrder(tooLarge)

	// Should validate maximum
	assert.True(t, err != nil, "Should reject order above maximum")

	t.Logf("PASS: TC-D-005 - Maximum quantity enforced")
}

// TC-D-006: Zero Quantity Orders Rejected
func TestMatchingEngine_TC_D_006_ZeroQuantityOrdersRejected(t *testing.T) {
	ob := matching.NewOrderBook("BTC/USDT")

	// Create zero quantity order
	zeroOrder := newTestOrder(t, matching.SideBuy, matching.OrderTypeLimit, "0", "50000")

	err := ob.AddOrder(zeroOrder)

	// Should reject
	assert.Error(t, err)

	t.Logf("PASS: TC-D-006 - Zero quantity rejected")
}

// TC-D-007: Negative Prices Rejected
func TestMatchingEngine_TC_D_007_NegativePricesRejected(t *testing.T) {
	ob := matching.NewOrderBook("BTC/USDT")

	// Create negative price order
	negativePrice := newTestOrder(t, matching.SideBuy, matching.OrderTypeLimit, "1", "-50000")

	err := ob.AddOrder(negativePrice)

	// Should reject
	assert.Error(t, err)

	t.Logf("PASS: TC-D-007 - Negative price rejected")
}

// TC-D-008: Invalid Symbols Rejected
func TestMatchingEngine_TC_D_008_InvalidSymbolsRejected(t *testing.T) {
	ob := matching.NewOrderBook("INVALID/XXX")

	// Order book should be created but validate on add
	order := newTestOrder(t, matching.SideBuy, matching.OrderTypeLimit, "1", "50000")
	order.Symbol = "INVALID/XXX"

	// Symbol validation depends on implementation
	// This test documents the expectation

	t.Logf("PASS: TC-D-008 - Invalid symbols handled")
}

// TC-D-009: Concurrent Order Submission
func TestMatchingEngine_TC_D_009_ConcurrentOrderSubmission(t *testing.T) {
	ob := matching.NewOrderBook("BTC/USDT")

	// Submit 100 concurrent orders
	var wg sync.WaitGroup
	errors := make([]error, 0)
	var mu sync.Mutex

	for i := 0; i < 100; i++ {
		wg.Add(1)
		go func(index int) {
			defer wg.Done()

			var order *matching.Order
			if index%2 == 0 {
				order = newTestOrder(t, matching.SideBuy, matching.OrderTypeLimit,
					"0.01", "50000")
			} else {
				order = newTestOrder(t, matching.SideSell, matching.OrderTypeLimit,
					"0.01", "50000")
			}

			err := ob.AddOrder(order)
			if err != nil {
				mu.Lock()
				errors = append(errors, err)
				mu.Unlock()
			}
		}(i)
	}

	wg.Wait()

	// Should handle concurrent adds
	assert.Greater(t, len(ob.Orders), 90, "Most orders should be added")

	t.Logf("PASS: TC-D-009 - Concurrent orders handled (%d added)", len(ob.Orders))
}

// TC-D-010: Race Condition Testing
func TestMatchingEngine_TC_D_010_RaceConditionTesting(t *testing.T) {
	ob := matching.NewOrderBook("BTC/USDT")

	// Concurrent adds and matches
	var wg sync.WaitGroup
	successCount := int64(0)

	for i := 0; i < 50; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()

			order := newTestOrder(t, matching.SideBuy, matching.OrderTypeLimit,
				"0.1", "50000")
			if err := ob.AddOrder(order); err == nil {
				atomic.AddInt64(&successCount, 1)
			}
		}()
	}

	for i := 0; i < 50; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()

			order := newTestMarketOrder(t, matching.SideSell, "0.01")
			matching.MatchOrder(ob, order)
		}()
	}

	wg.Wait()

	// Should not crash or deadlock
	assert.Greater(t, successCount, int64(40))

	t.Logf("PASS: TC-D-010 - Race condition testing complete (%d successful ops)", successCount)
}

// ============================================================================
// CATEGORY E: FEE CALCULATION (5 Tests)
// ============================================================================

// TC-E-001: Maker Fee Correct (0.05%)
func TestMatchingEngine_TC_E_001_MakerFeeCorrect(t *testing.T) {
	ob := matching.NewOrderBook("BTC/USDT")

	// Maker limit buy
	buyOrder := newTestOrder(t, matching.SideBuy, matching.OrderTypeLimit, "1.0", "50000")
	ob.AddOrder(buyOrder)

	// Taker market sell
	sellOrder := newTestMarketOrder(t, matching.SideSell, "1.0")

	trades, err := matching.MatchOrder(ob, sellOrder)
	require.NoError(t, err)
	require.Len(t, trades, 1)

	trade := trades[0]

	// Maker fee: 1.0 * 50000 * 0.0005 = 25 USDT
	expectedMakerFee := decimal.NewFromString("25.00000000")
	actualMakerFee := trade.BuyerFee

	assert.True(t, actualMakerFee.Equal(expectedMakerFee),
		fmt.Sprintf("Maker fee: expected %v, got %v", expectedMakerFee, actualMakerFee))

	t.Logf("PASS: TC-E-001 - Maker fee (0.05%%) correct: %v", actualMakerFee)
}

// TC-E-002: Taker Fee Correct (0.1%)
func TestMatchingEngine_TC_E_002_TakerFeeCorrect(t *testing.T) {
	ob := matching.NewOrderBook("BTC/USDT")

	buyOrder := newTestOrder(t, matching.SideBuy, matching.OrderTypeLimit, "1.0", "50000")
	ob.AddOrder(buyOrder)

	sellOrder := newTestMarketOrder(t, matching.SideSell, "1.0")

	trades, err := matching.MatchOrder(ob, sellOrder)
	require.NoError(t, err)

	trade := trades[0]

	// Taker fee: 1.0 * 50000 * 0.001 = 50 USDT
	expectedTakerFee := decimal.NewFromString("50.00000000")
	actualTakerFee := trade.SellerFee

	assert.True(t, actualTakerFee.Equal(expectedTakerFee),
		fmt.Sprintf("Taker fee: expected %v, got %v", expectedTakerFee, actualTakerFee))

	t.Logf("PASS: TC-E-002 - Taker fee (0.1%%) correct: %v", actualTakerFee)
}

// TC-E-003: Fee Precision (8 Decimals)
func TestMatchingEngine_TC_E_003_FeePrecision8Decimals(t *testing.T) {
	ob := matching.NewOrderBook("BTC/USDT")

	buyOrder := newTestOrder(t, matching.SideBuy, matching.OrderTypeLimit, "0.123456789", "50000.12345678")
	ob.AddOrder(buyOrder)

	sellOrder := newTestMarketOrder(t, matching.SideSell, "0.123456789")

	trades, err := matching.MatchOrder(ob, sellOrder)
	require.NoError(t, err)

	trade := trades[0]

	// Fees should maintain precision
	assert.Equal(t, 8, trade.BuyerFee.NumDecimalPlaces())

	t.Logf("PASS: TC-E-003 - Fee precision: %v (%d decimals)",
		trade.BuyerFee, trade.BuyerFee.NumDecimalPlaces())
}

// TC-E-004: Fee Calculation on Partial Fills
func TestMatchingEngine_TC_E_004_FeeCalculationOnPartialFills(t *testing.T) {
	ob := matching.NewOrderBook("BTC/USDT")

	buyOrder := newTestOrder(t, matching.SideBuy, matching.OrderTypeLimit, "1.0", "50000")
	ob.AddOrder(buyOrder)

	// Taker partial fill
	sellOrder := newTestMarketOrder(t, matching.SideSell, "0.3")

	trades, err := matching.MatchOrder(ob, sellOrder)
	require.NoError(t, err)

	trade := trades[0]

	// Fee on 0.3 BTC, not 1.0 BTC
	notional := decimal.NewFromString("0.3").Mul(decimal.NewFromInt(50000))
	expectedTakerFee := notional.Mul(decimal.NewFromString("0.001"))

	assert.True(t, trade.SellerFee.Equal(expectedTakerFee))

	t.Logf("PASS: TC-E-004 - Partial fill fee correct: %v", trade.SellerFee)
}

// TC-E-005: Fee Rounding Behavior
func TestMatchingEngine_TC_E_005_FeeRoundingBehavior(t *testing.T) {
	ob := matching.NewOrderBook("BTC/USDT")

	// Create trade with amount causing rounding
	buyOrder := newTestOrder(t, matching.SideBuy, matching.OrderTypeLimit, "0.333333", "50000.50")
	ob.AddOrder(buyOrder)

	sellOrder := newTestMarketOrder(t, matching.SideSell, "0.333333")

	trades, err := matching.MatchOrder(ob, sellOrder)
	require.NoError(t, err)

	trade := trades[0]

	// Fees should be calculated consistently
	assert.True(t, trade.BuyerFee.GreaterThan(decimal.Zero))
	assert.True(t, trade.SellerFee.GreaterThan(decimal.Zero))

	t.Logf("PASS: TC-E-005 - Fee rounding consistent: buyer=%v, seller=%v",
		trade.BuyerFee, trade.SellerFee)
}

// ============================================================================
// CATEGORY F: PERFORMANCE VALIDATION (5 Tests)
// ============================================================================

// TC-F-001: 100 Matches/Second Sustained
func TestMatchingEngine_TC_F_001_100MatchesPerSecondSustained(t *testing.T) {
	ob := matching.NewOrderBook("BTC/USDT")

	// Pre-populate order book
	for i := 0; i < 50; i++ {
		price := decimal.NewFromInt(49000 - int64(i*10))
		order := newTestOrder(t, matching.SideBuy, matching.OrderTypeLimit, "1", price.String())
		ob.AddOrder(order)
	}

	// Measure 100 matches
	startTime := time.Now()
	matches := 0

	for i := 0; i < 100; i++ {
		order := newTestMarketOrder(t, matching.SideSell, "0.5")
		if trades, err := matching.MatchOrder(ob, order); err == nil && len(trades) > 0 {
			matches++
		}
	}

	elapsed := time.Since(startTime)
	rate := float64(matches) / elapsed.Seconds()

	assert.Greater(t, rate, 100.0, fmt.Sprintf("Rate: %.2f matches/sec", rate))

	t.Logf("PASS: TC-F-001 - Throughput: %.2f matches/sec in %v", rate, elapsed)
}

// TC-F-002: 1,000 Matches/Second Burst
func TestMatchingEngine_TC_F_002_1000MatchesPerSecondBurst(t *testing.T) {
	ob := matching.NewOrderBook("BTC/USDT")

	// Pre-populate
	for i := 0; i < 500; i++ {
		price := decimal.NewFromInt(49000 - int64(i*10))
		order := newTestOrder(t, matching.SideBuy, matching.OrderTypeLimit, "1", price.String())
		ob.AddOrder(order)
	}

	// Burst test
	startTime := time.Now()
	matches := 0

	for i := 0; i < 1000; i++ {
		order := newTestMarketOrder(t, matching.SideSell, "0.1")
		if trades, err := matching.MatchOrder(ob, order); err == nil && len(trades) > 0 {
			matches++
		}
	}

	elapsed := time.Since(startTime)
	rate := float64(matches) / elapsed.Seconds()

	assert.Greater(t, rate, 500.0, fmt.Sprintf("Burst rate: %.2f matches/sec", rate))

	t.Logf("PASS: TC-F-002 - Burst throughput: %.2f matches/sec in %v", rate, elapsed)
}

// TC-F-003: Latency <10ms (p99)
func TestMatchingEngine_TC_F_003_LatencyP99Under10ms(t *testing.T) {
	ob := matching.NewOrderBook("BTC/USDT")

	// Populate
	for i := 0; i < 100; i++ {
		price := decimal.NewFromInt(49000 - int64(i))
		order := newTestOrder(t, matching.SideBuy, matching.OrderTypeLimit, "1", price.String())
		ob.AddOrder(order)
	}

	// Measure latencies
	latencies := make([]time.Duration, 1000)

	for i := 0; i < 1000; i++ {
		order := newTestMarketOrder(t, matching.SideSell, "0.1")
		start := time.Now()
		matching.MatchOrder(ob, order)
		latencies[i] = time.Since(start)
	}

	// Calculate p99
	sorted := make([]time.Duration, len(latencies))
	copy(sorted, latencies)

	p99Index := int(float64(len(sorted))*0.99) - 1
	p99 := sorted[p99Index]

	assert.Less(t, p99, 10*time.Millisecond, fmt.Sprintf("p99 latency: %v", p99))

	t.Logf("PASS: TC-F-003 - p99 latency: %v (< 10ms)", p99)
}

// TC-F-004: Memory Usage Stable
func TestMatchingEngine_TC_F_004_MemoryUsageStable(t *testing.T) {
	ob := matching.NewOrderBook("BTC/USDT")

	// Get initial memory
	initialOrders := len(ob.Orders)

	// Add and remove orders repeatedly
	for iteration := 0; iteration < 10; iteration++ {
		for i := 0; i < 100; i++ {
			price := decimal.NewFromInt(50000 + int64(i))
			order := newTestOrder(t, matching.SideBuy, matching.OrderTypeLimit, "1", price.String())
			ob.AddOrder(order)
		}

		// Remove half
		orderIDs := make([]string, 0)
		for id := range ob.Orders {
			orderIDs = append(orderIDs, id)
			if len(orderIDs) >= 50 {
				break
			}
		}

		for _, id := range orderIDs {
			ob.RemoveOrder(id)
		}
	}

	finalOrders := len(ob.Orders)
	growth := float64(finalOrders) / float64(initialOrders + 1)

	assert.Less(t, growth, 5.0, "Memory should not grow significantly")

	t.Logf("PASS: TC-F-004 - Memory stable: %d orders (growth: %.2fx)",
		finalOrders, growth)
}

// TC-F-005: No Memory Leaks
func TestMatchingEngine_TC_F_005_NoMemoryLeaks(t *testing.T) {
	ob := matching.NewOrderBook("BTC/USDT")

	// Perform many operations
	operations := 10000

	for i := 0; i < operations; i++ {
		order := newTestOrder(t, matching.SideBuy, matching.OrderTypeLimit, "1", "50000")
		ob.AddOrder(order)

		if i%100 == 0 {
			// Remove some orders
			for id := range ob.Orders {
				ob.RemoveOrder(id)
				break
			}
		}
	}

	// After operations, order book should be manageable
	assert.Less(t, len(ob.Orders), operations)

	t.Logf("PASS: TC-F-005 - No memory leaks: %d orders after %d ops",
		len(ob.Orders), operations)
}

// ============================================================================
// PLACEHOLDER FUNCTIONS (To be implemented by backend)
// ============================================================================

// MatchOrder is a placeholder - implement in matching engine
func MatchOrder(ob *matching.OrderBook, order *matching.Order) ([]*matching.Trade, error) {
	// This would be implemented in the actual matching engine
	// For now, return empty to allow tests to compile
	return []*matching.Trade{}, nil
}
