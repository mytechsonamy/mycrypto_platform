package orderbook_test

import (
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/mytrader/trade-engine/internal/domain"
	"github.com/mytrader/trade-engine/internal/orderbook"
)

// Helper function to create a test order
func createOrder(symbol string, side domain.OrderSide, price float64, quantity float64) *domain.Order {
	p := decimal.NewFromFloat(price)
	return &domain.Order{
		ID:             uuid.New(),
		UserID:         uuid.New(),
		Symbol:         symbol,
		Side:           side,
		Type:           domain.OrderTypeLimit,
		Quantity:       decimal.NewFromFloat(quantity),
		FilledQuantity: decimal.Zero,
		Price:          &p,
		Status:         domain.OrderStatusOpen,
		TimeInForce:    domain.TimeInForceGTC,
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}
}

// Helper function to create an order with specific ID
func createOrderWithID(id uuid.UUID, symbol string, side domain.OrderSide, price decimal.Decimal, quantity float64) *domain.Order {
	return &domain.Order{
		ID:             id,
		UserID:         uuid.New(),
		Symbol:         symbol,
		Side:           side,
		Type:           domain.OrderTypeLimit,
		Quantity:       decimal.NewFromFloat(quantity),
		FilledQuantity: decimal.Zero,
		Price:          &price,
		Status:         domain.OrderStatusOpen,
		TimeInForce:    domain.TimeInForceGTC,
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}
}

// Test: AddOrder - Success
func TestOrderBook_AddOrder_Success(t *testing.T) {
	ob := orderbook.NewOrderBook("BTC/USDT")

	order := createOrder("BTC/USDT", domain.OrderSideBuy, 50000.0, 1.5)

	err := ob.AddOrder(order)
	require.NoError(t, err)

	// Verify order was added
	bestBid, err := ob.GetBestBid()
	require.NoError(t, err)
	assert.Equal(t, "50000", bestBid.Price.String())
	assert.Equal(t, 1, bestBid.OrderCount)
	assert.Equal(t, "1.5", bestBid.TotalVolume.String())

	// Verify order count
	assert.Equal(t, 1, ob.GetOrderCount())
}

// Test: AddOrder - Symbol Mismatch
func TestOrderBook_AddOrder_SymbolMismatch(t *testing.T) {
	ob := orderbook.NewOrderBook("BTC/USDT")

	order := createOrder("ETH/USDT", domain.OrderSideBuy, 3000.0, 5.0)

	err := ob.AddOrder(order)
	assert.Error(t, err)
	assert.Equal(t, orderbook.ErrSymbolMismatch, err)
}

// Test: AddOrder - Market Order Not Supported
func TestOrderBook_AddOrder_MarketOrderNotSupported(t *testing.T) {
	ob := orderbook.NewOrderBook("BTC/USDT")

	order := &domain.Order{
		ID:             uuid.New(),
		UserID:         uuid.New(),
		Symbol:         "BTC/USDT",
		Side:           domain.OrderSideBuy,
		Type:           domain.OrderTypeMarket,
		Quantity:       decimal.NewFromFloat(1.5),
		FilledQuantity: decimal.Zero,
		Price:          nil, // Market orders have no price
		Status:         domain.OrderStatusOpen,
		TimeInForce:    domain.TimeInForceGTC,
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}

	err := ob.AddOrder(order)
	assert.Error(t, err)
	assert.Equal(t, orderbook.ErrMarketOrderNotSupported, err)
}

// Test: AddOrder - Multiple Orders with Price Priority
func TestOrderBook_AddMultipleOrders_PricePriority(t *testing.T) {
	ob := orderbook.NewOrderBook("BTC/USDT")

	orders := []*domain.Order{
		createOrder("BTC/USDT", domain.OrderSideBuy, 50000.0, 1.0),
		createOrder("BTC/USDT", domain.OrderSideBuy, 50100.0, 1.5), // Higher price
		createOrder("BTC/USDT", domain.OrderSideBuy, 49900.0, 2.0), // Lower price
	}

	for _, order := range orders {
		err := ob.AddOrder(order)
		require.NoError(t, err)
	}

	// Best bid should be highest price (50100.0)
	bestBid, err := ob.GetBestBid()
	require.NoError(t, err)
	assert.Equal(t, "50100", bestBid.Price.String())
	assert.Equal(t, "1.5", bestBid.TotalVolume.String())

	// Verify order count
	assert.Equal(t, 3, ob.GetOrderCount())
}

// Test: AddOrder - Multiple Orders with Time Priority (FIFO)
func TestOrderBook_AddMultipleOrders_TimePriority(t *testing.T) {
	ob := orderbook.NewOrderBook("BTC/USDT")

	price := decimal.NewFromFloat(50000.0)

	id1 := uuid.New()
	id2 := uuid.New()
	id3 := uuid.New()

	order1 := createOrderWithID(id1, "BTC/USDT", domain.OrderSideBuy, price, 1.0)
	order2 := createOrderWithID(id2, "BTC/USDT", domain.OrderSideBuy, price, 1.5)
	order3 := createOrderWithID(id3, "BTC/USDT", domain.OrderSideBuy, price, 2.0)

	ob.AddOrder(order1)
	time.Sleep(1 * time.Millisecond) // Ensure different timestamps
	ob.AddOrder(order2)
	time.Sleep(1 * time.Millisecond)
	ob.AddOrder(order3)

	// Get all orders at this price level
	orders := ob.GetOrdersAtPrice(domain.OrderSideBuy, price)

	// Orders should be in FIFO order
	require.Equal(t, 3, len(orders))
	assert.Equal(t, id1, orders[0].ID)
	assert.Equal(t, id2, orders[1].ID)
	assert.Equal(t, id3, orders[2].ID)
}

// Test: AddOrder - Both Sides
func TestOrderBook_AddOrders_BothSides(t *testing.T) {
	ob := orderbook.NewOrderBook("BTC/USDT")

	bidOrder := createOrder("BTC/USDT", domain.OrderSideBuy, 50000.0, 1.0)
	askOrder := createOrder("BTC/USDT", domain.OrderSideSell, 50100.0, 1.5)

	ob.AddOrder(bidOrder)
	ob.AddOrder(askOrder)

	// Verify best bid
	bestBid, err := ob.GetBestBid()
	require.NoError(t, err)
	assert.Equal(t, "50000", bestBid.Price.String())

	// Verify best ask
	bestAsk, err := ob.GetBestAsk()
	require.NoError(t, err)
	assert.Equal(t, "50100", bestAsk.Price.String())

	// Verify spread
	spread, err := ob.GetSpread()
	require.NoError(t, err)
	assert.Equal(t, "100", spread.String())
}

// Test: RemoveOrder - Success
func TestOrderBook_RemoveOrder_Success(t *testing.T) {
	ob := orderbook.NewOrderBook("BTC/USDT")

	order := createOrder("BTC/USDT", domain.OrderSideBuy, 50000.0, 1.5)
	ob.AddOrder(order)

	err := ob.RemoveOrder(order.ID)
	require.NoError(t, err)

	// Order book should be empty
	_, err = ob.GetBestBid()
	assert.Error(t, err)
	assert.Equal(t, orderbook.ErrEmptyOrderBook, err)

	// Order count should be 0
	assert.Equal(t, 0, ob.GetOrderCount())
}

// Test: RemoveOrder - Order Not Found
func TestOrderBook_RemoveOrder_OrderNotFound(t *testing.T) {
	ob := orderbook.NewOrderBook("BTC/USDT")

	err := ob.RemoveOrder(uuid.New())
	assert.Error(t, err)
	assert.Equal(t, orderbook.ErrOrderNotFound, err)
}

// Test: RemoveOrder - Multiple Orders at Same Price
func TestOrderBook_RemoveOrder_MultipleAtSamePrice(t *testing.T) {
	ob := orderbook.NewOrderBook("BTC/USDT")

	price := decimal.NewFromFloat(50000.0)
	order1 := createOrderWithID(uuid.New(), "BTC/USDT", domain.OrderSideBuy, price, 1.0)
	order2 := createOrderWithID(uuid.New(), "BTC/USDT", domain.OrderSideBuy, price, 1.5)
	order3 := createOrderWithID(uuid.New(), "BTC/USDT", domain.OrderSideBuy, price, 2.0)

	ob.AddOrder(order1)
	ob.AddOrder(order2)
	ob.AddOrder(order3)

	// Remove middle order
	err := ob.RemoveOrder(order2.ID)
	require.NoError(t, err)

	// Price level should still exist with 2 orders
	bestBid, err := ob.GetBestBid()
	require.NoError(t, err)
	assert.Equal(t, "50000", bestBid.Price.String())
	assert.Equal(t, 2, bestBid.OrderCount)
	assert.Equal(t, "3", bestBid.TotalVolume.String()) // 1.0 + 2.0

	// Verify remaining orders
	orders := ob.GetOrdersAtPrice(domain.OrderSideBuy, price)
	require.Equal(t, 2, len(orders))
	assert.Equal(t, order1.ID, orders[0].ID)
	assert.Equal(t, order3.ID, orders[1].ID)
}

// Test: UpdateOrder - Partial Fill
func TestOrderBook_UpdateOrder_PartialFill(t *testing.T) {
	ob := orderbook.NewOrderBook("BTC/USDT")

	order := createOrder("BTC/USDT", domain.OrderSideBuy, 50000.0, 2.0)
	ob.AddOrder(order)

	// Partially fill 0.5 BTC
	filledQty := decimal.NewFromFloat(0.5)
	err := ob.UpdateOrder(order.ID, filledQty)
	require.NoError(t, err)

	// Check remaining volume
	bestBid, err := ob.GetBestBid()
	require.NoError(t, err)
	assert.Equal(t, "1.5", bestBid.TotalVolume.String()) // 2.0 - 0.5

	// Order should still be in book
	assert.Equal(t, 1, ob.GetOrderCount())
}

// Test: UpdateOrder - Fully Filled
func TestOrderBook_UpdateOrder_FullyFilled(t *testing.T) {
	ob := orderbook.NewOrderBook("BTC/USDT")

	order := createOrder("BTC/USDT", domain.OrderSideBuy, 50000.0, 1.5)
	ob.AddOrder(order)

	// Fully fill
	err := ob.UpdateOrder(order.ID, order.Quantity)
	require.NoError(t, err)

	// Order should be removed
	_, err = ob.GetBestBid()
	assert.Error(t, err)
	assert.Equal(t, orderbook.ErrEmptyOrderBook, err)

	// Order count should be 0
	assert.Equal(t, 0, ob.GetOrderCount())
}

// Test: UpdateOrder - Multiple Partial Fills
func TestOrderBook_UpdateOrder_MultiplePartialFills(t *testing.T) {
	ob := orderbook.NewOrderBook("BTC/USDT")

	order := createOrder("BTC/USDT", domain.OrderSideBuy, 50000.0, 3.0)
	ob.AddOrder(order)

	// First partial fill
	err := ob.UpdateOrder(order.ID, decimal.NewFromFloat(1.0))
	require.NoError(t, err)

	bestBid, _ := ob.GetBestBid()
	assert.Equal(t, "2", bestBid.TotalVolume.String())

	// Second partial fill
	err = ob.UpdateOrder(order.ID, decimal.NewFromFloat(1.0))
	require.NoError(t, err)

	bestBid, _ = ob.GetBestBid()
	assert.Equal(t, "1", bestBid.TotalVolume.String())

	// Final fill
	err = ob.UpdateOrder(order.ID, decimal.NewFromFloat(1.0))
	require.NoError(t, err)

	// Order should be removed
	_, err = ob.GetBestBid()
	assert.Equal(t, orderbook.ErrEmptyOrderBook, err)
}

// Test: GetSpread
func TestOrderBook_GetSpread(t *testing.T) {
	ob := orderbook.NewOrderBook("BTC/USDT")

	bidOrder := createOrder("BTC/USDT", domain.OrderSideBuy, 50000.0, 1.0)
	askOrder := createOrder("BTC/USDT", domain.OrderSideSell, 50100.0, 1.0)

	ob.AddOrder(bidOrder)
	ob.AddOrder(askOrder)

	spread, err := ob.GetSpread()
	require.NoError(t, err)
	assert.Equal(t, "100", spread.String()) // 50100 - 50000
}

// Test: GetSpread - Empty Book
func TestOrderBook_GetSpread_EmptyBook(t *testing.T) {
	ob := orderbook.NewOrderBook("BTC/USDT")

	_, err := ob.GetSpread()
	assert.Error(t, err)
	assert.Equal(t, orderbook.ErrEmptyOrderBook, err)
}

// Test: GetMidPrice
func TestOrderBook_GetMidPrice(t *testing.T) {
	ob := orderbook.NewOrderBook("BTC/USDT")

	bidOrder := createOrder("BTC/USDT", domain.OrderSideBuy, 50000.0, 1.0)
	askOrder := createOrder("BTC/USDT", domain.OrderSideSell, 50100.0, 1.0)

	ob.AddOrder(bidOrder)
	ob.AddOrder(askOrder)

	midPrice, err := ob.GetMidPrice()
	require.NoError(t, err)
	assert.Equal(t, "50050", midPrice.String()) // (50000 + 50100) / 2
}

// Test: GetDepth
func TestOrderBook_GetDepth(t *testing.T) {
	ob := orderbook.NewOrderBook("BTC/USDT")

	// Add multiple bid levels
	ob.AddOrder(createOrder("BTC/USDT", domain.OrderSideBuy, 50000.0, 1.0))
	ob.AddOrder(createOrder("BTC/USDT", domain.OrderSideBuy, 49900.0, 1.5))
	ob.AddOrder(createOrder("BTC/USDT", domain.OrderSideBuy, 49800.0, 2.0))

	// Add multiple ask levels
	ob.AddOrder(createOrder("BTC/USDT", domain.OrderSideSell, 50100.0, 1.2))
	ob.AddOrder(createOrder("BTC/USDT", domain.OrderSideSell, 50200.0, 1.8))

	depth := ob.GetDepth(3)

	// Check bids (sorted highest to lowest)
	require.Equal(t, 3, len(depth.Bids))
	assert.Equal(t, "50000", depth.Bids[0].Price)
	assert.Equal(t, "49900", depth.Bids[1].Price)
	assert.Equal(t, "49800", depth.Bids[2].Price)

	// Check asks (sorted lowest to highest)
	require.Equal(t, 2, len(depth.Asks))
	assert.Equal(t, "50100", depth.Asks[0].Price)
	assert.Equal(t, "50200", depth.Asks[1].Price)
}

// Test: GetOrder
func TestOrderBook_GetOrder(t *testing.T) {
	ob := orderbook.NewOrderBook("BTC/USDT")

	order := createOrder("BTC/USDT", domain.OrderSideBuy, 50000.0, 1.5)
	ob.AddOrder(order)

	retrievedOrder, err := ob.GetOrder(order.ID)
	require.NoError(t, err)
	assert.Equal(t, order.ID, retrievedOrder.ID)
	assert.Equal(t, order.Price.String(), retrievedOrder.Price.String())
	assert.Equal(t, order.Quantity.String(), retrievedOrder.Quantity.String())
}

// Test: GetOrder - Not Found
func TestOrderBook_GetOrder_NotFound(t *testing.T) {
	ob := orderbook.NewOrderBook("BTC/USDT")

	_, err := ob.GetOrder(uuid.New())
	assert.Error(t, err)
	assert.Equal(t, orderbook.ErrOrderNotFound, err)
}

// Test: AddOrder - Idempotency
func TestOrderBook_AddOrder_Idempotency(t *testing.T) {
	ob := orderbook.NewOrderBook("BTC/USDT")

	order := createOrder("BTC/USDT", domain.OrderSideBuy, 50000.0, 1.5)

	// Add order twice
	err := ob.AddOrder(order)
	require.NoError(t, err)

	err = ob.AddOrder(order)
	require.NoError(t, err) // Should not error

	// Should only have 1 order
	assert.Equal(t, 1, ob.GetOrderCount())

	bestBid, _ := ob.GetBestBid()
	assert.Equal(t, 1, bestBid.OrderCount)
}

// Test: GetSnapshot
func TestOrderBook_GetSnapshot(t *testing.T) {
	ob := orderbook.NewOrderBook("BTC/USDT")

	// Add some orders
	ob.AddOrder(createOrder("BTC/USDT", domain.OrderSideBuy, 50000.0, 1.0))
	ob.AddOrder(createOrder("BTC/USDT", domain.OrderSideBuy, 49900.0, 1.5))
	ob.AddOrder(createOrder("BTC/USDT", domain.OrderSideSell, 50100.0, 1.2))

	snapshot := ob.GetSnapshot()

	assert.Equal(t, "BTC/USDT", snapshot.Symbol)
	assert.Equal(t, 3, snapshot.OrderCount)
	assert.Equal(t, 2, len(snapshot.Bids))
	assert.Equal(t, 1, len(snapshot.Asks))
}

// Test: Concurrent AddOrder
func TestOrderBook_ConcurrentAddOrder(t *testing.T) {
	ob := orderbook.NewOrderBook("BTC/USDT")

	var wg sync.WaitGroup
	orderCount := 100

	// Add orders concurrently
	for i := 0; i < orderCount; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			price := 50000.0 + float64(i)
			order := createOrder("BTC/USDT", domain.OrderSideBuy, price, 1.0)
			ob.AddOrder(order)
		}(i)
	}

	wg.Wait()

	// Verify all orders added
	assert.Equal(t, orderCount, ob.GetOrderCount())

	// Verify best bid is highest price
	bestBid, err := ob.GetBestBid()
	require.NoError(t, err)
	assert.Equal(t, "50099", bestBid.Price.String())
}

// Test: Concurrent RemoveOrder
func TestOrderBook_ConcurrentRemoveOrder(t *testing.T) {
	ob := orderbook.NewOrderBook("BTC/USDT")

	// Add orders first
	orders := make([]*domain.Order, 100)
	for i := 0; i < 100; i++ {
		price := 50000.0 + float64(i)
		order := createOrder("BTC/USDT", domain.OrderSideBuy, price, 1.0)
		orders[i] = order
		ob.AddOrder(order)
	}

	// Remove orders concurrently
	var wg sync.WaitGroup
	for i := 0; i < 100; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			ob.RemoveOrder(orders[i].ID)
		}(i)
	}

	wg.Wait()

	// Order book should be empty
	assert.Equal(t, 0, ob.GetOrderCount())

	_, err := ob.GetBestBid()
	assert.Equal(t, orderbook.ErrEmptyOrderBook, err)
}

// Test: Concurrent Mixed Operations
func TestOrderBook_ConcurrentMixedOperations(t *testing.T) {
	ob := orderbook.NewOrderBook("BTC/USDT")

	// Pre-populate with some orders
	initialOrders := make([]*domain.Order, 50)
	for i := 0; i < 50; i++ {
		price := 50000.0 + float64(i*10)
		order := createOrder("BTC/USDT", domain.OrderSideBuy, price, 1.0)
		initialOrders[i] = order
		ob.AddOrder(order)
	}

	var wg sync.WaitGroup

	// Concurrent adds
	for i := 0; i < 25; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			price := 51000.0 + float64(i)
			order := createOrder("BTC/USDT", domain.OrderSideBuy, price, 1.0)
			ob.AddOrder(order)
		}(i)
	}

	// Concurrent removes
	for i := 0; i < 25; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			ob.RemoveOrder(initialOrders[i].ID)
		}(i)
	}

	// Concurrent reads
	for i := 0; i < 50; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			ob.GetBestBid()
			ob.GetDepth(5)
		}()
	}

	wg.Wait()

	// Verify order book is still functional
	assert.Greater(t, ob.GetOrderCount(), 0)

	_, err := ob.GetBestBid()
	assert.NoError(t, err)
}

// Test: Large Order Book
func TestOrderBook_LargeScale(t *testing.T) {
	ob := orderbook.NewOrderBook("BTC/USDT")

	// Add 10,000 orders
	orderCount := 10000
	for i := 0; i < orderCount; i++ {
		price := 50000.0 + float64(i%1000) // 1000 different price levels
		order := createOrder("BTC/USDT", domain.OrderSideBuy, price, 1.0)
		err := ob.AddOrder(order)
		require.NoError(t, err)
	}

	// Verify all orders added
	assert.Equal(t, orderCount, ob.GetOrderCount())

	// Verify best bid
	bestBid, err := ob.GetBestBid()
	require.NoError(t, err)
	assert.Equal(t, "50999", bestBid.Price.String())

	// Get depth should work efficiently
	start := time.Now()
	depth := ob.GetDepth(100)
	elapsed := time.Since(start)

	assert.Equal(t, 100, len(depth.Bids))
	assert.Less(t, elapsed.Milliseconds(), int64(10), "GetDepth should complete in <10ms")
}

// Test: Empty Order Book Operations
func TestOrderBook_EmptyBook_Operations(t *testing.T) {
	ob := orderbook.NewOrderBook("BTC/USDT")

	// GetBestBid on empty book
	_, err := ob.GetBestBid()
	assert.Equal(t, orderbook.ErrEmptyOrderBook, err)

	// GetBestAsk on empty book
	_, err = ob.GetBestAsk()
	assert.Equal(t, orderbook.ErrEmptyOrderBook, err)

	// GetSpread on empty book
	_, err = ob.GetSpread()
	assert.Equal(t, orderbook.ErrEmptyOrderBook, err)

	// GetDepth on empty book
	depth := ob.GetDepth(10)
	assert.Equal(t, 0, len(depth.Bids))
	assert.Equal(t, 0, len(depth.Asks))

	// GetOrderCount on empty book
	assert.Equal(t, 0, ob.GetOrderCount())
}
