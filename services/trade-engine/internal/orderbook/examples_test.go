package orderbook_test

import (
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"github.com/mytrader/trade-engine/internal/domain"
	"github.com/mytrader/trade-engine/internal/orderbook"
)

// Example_basicUsage demonstrates basic order book operations
func Example_basicUsage() {
	// Create a new order book for BTC/USDT
	ob := orderbook.NewOrderBook("BTC/USDT")

	// Create a limit buy order
	price := decimal.NewFromFloat(50000.0)
	order := &domain.Order{
		ID:             uuid.New(),
		UserID:         uuid.New(),
		Symbol:         "BTC/USDT",
		Side:           domain.OrderSideBuy,
		Type:           domain.OrderTypeLimit,
		Quantity:       decimal.NewFromFloat(1.5),
		FilledQuantity: decimal.Zero,
		Price:          &price,
		Status:         domain.OrderStatusOpen,
		TimeInForce:    domain.TimeInForceGTC,
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}

	// Add order to book
	err := ob.AddOrder(order)
	if err != nil {
		panic(err)
	}

	// Get best bid
	bestBid, err := ob.GetBestBid()
	if err != nil {
		panic(err)
	}

	fmt.Printf("Best Bid Price: %s\n", bestBid.Price)
	fmt.Printf("Best Bid Volume: %s\n", bestBid.TotalVolume)
	fmt.Printf("Orders at Best Bid: %d\n", bestBid.OrderCount)

	// Output:
	// Best Bid Price: 50000
	// Best Bid Volume: 1.5
	// Orders at Best Bid: 1
}

// Example_marketDepth demonstrates retrieving market depth
func Example_marketDepth() {
	ob := orderbook.NewOrderBook("BTC/USDT")

	// Add multiple bid levels
	bids := []struct {
		price    float64
		quantity float64
	}{
		{50000.0, 1.0},
		{49900.0, 1.5},
		{49800.0, 2.0},
		{49700.0, 2.5},
	}

	for _, bid := range bids {
		p := decimal.NewFromFloat(bid.price)
		order := &domain.Order{
			ID:             uuid.New(),
			UserID:         uuid.New(),
			Symbol:         "BTC/USDT",
			Side:           domain.OrderSideBuy,
			Type:           domain.OrderTypeLimit,
			Quantity:       decimal.NewFromFloat(bid.quantity),
			FilledQuantity: decimal.Zero,
			Price:          &p,
			Status:         domain.OrderStatusOpen,
			TimeInForce:    domain.TimeInForceGTC,
			CreatedAt:      time.Now(),
			UpdatedAt:      time.Now(),
		}
		ob.AddOrder(order)
	}

	// Get top 3 levels
	depth := ob.GetDepth(3)

	fmt.Printf("Top 3 Bid Levels:\n")
	for i, level := range depth.Bids {
		fmt.Printf("%d. Price: %s, Volume: %s\n", i+1, level.Price, level.Volume)
	}

	// Output:
	// Top 3 Bid Levels:
	// 1. Price: 50000, Volume: 1
	// 2. Price: 49900, Volume: 1.5
	// 3. Price: 49800, Volume: 2
}

// Example_spreadCalculation demonstrates spread and mid-price calculation
func Example_spreadCalculation() {
	ob := orderbook.NewOrderBook("BTC/USDT")

	// Add a bid
	bidPrice := decimal.NewFromFloat(50000.0)
	bidOrder := &domain.Order{
		ID:             uuid.New(),
		UserID:         uuid.New(),
		Symbol:         "BTC/USDT",
		Side:           domain.OrderSideBuy,
		Type:           domain.OrderTypeLimit,
		Quantity:       decimal.NewFromFloat(1.0),
		FilledQuantity: decimal.Zero,
		Price:          &bidPrice,
		Status:         domain.OrderStatusOpen,
		TimeInForce:    domain.TimeInForceGTC,
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}
	ob.AddOrder(bidOrder)

	// Add an ask
	askPrice := decimal.NewFromFloat(50100.0)
	askOrder := &domain.Order{
		ID:             uuid.New(),
		UserID:         uuid.New(),
		Symbol:         "BTC/USDT",
		Side:           domain.OrderSideSell,
		Type:           domain.OrderTypeLimit,
		Quantity:       decimal.NewFromFloat(1.0),
		FilledQuantity: decimal.Zero,
		Price:          &askPrice,
		Status:         domain.OrderStatusOpen,
		TimeInForce:    domain.TimeInForceGTC,
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}
	ob.AddOrder(askOrder)

	// Calculate spread
	spread, _ := ob.GetSpread()
	midPrice, _ := ob.GetMidPrice()

	fmt.Printf("Spread: %s\n", spread)
	fmt.Printf("Mid Price: %s\n", midPrice)

	// Output:
	// Spread: 100
	// Mid Price: 50050
}

// Example_partialFill demonstrates partial order filling
func Example_partialFill() {
	ob := orderbook.NewOrderBook("BTC/USDT")

	// Create a large order
	price := decimal.NewFromFloat(50000.0)
	order := &domain.Order{
		ID:             uuid.New(),
		UserID:         uuid.New(),
		Symbol:         "BTC/USDT",
		Side:           domain.OrderSideBuy,
		Type:           domain.OrderTypeLimit,
		Quantity:       decimal.NewFromFloat(3.0),
		FilledQuantity: decimal.Zero,
		Price:          &price,
		Status:         domain.OrderStatusOpen,
		TimeInForce:    domain.TimeInForceGTC,
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}
	ob.AddOrder(order)

	fmt.Printf("Initial Volume: %s\n", order.Quantity)

	// First partial fill
	ob.UpdateOrder(order.ID, decimal.NewFromFloat(1.0))
	bestBid, _ := ob.GetBestBid()
	fmt.Printf("After 1st fill: %s\n", bestBid.TotalVolume)

	// Second partial fill
	ob.UpdateOrder(order.ID, decimal.NewFromFloat(1.0))
	bestBid, _ = ob.GetBestBid()
	fmt.Printf("After 2nd fill: %s\n", bestBid.TotalVolume)

	// Final fill (removes from book)
	ob.UpdateOrder(order.ID, decimal.NewFromFloat(1.0))
	_, err := ob.GetBestBid()
	if err == orderbook.ErrEmptyOrderBook {
		fmt.Println("Order book is empty")
	}

	// Output:
	// Initial Volume: 3
	// After 1st fill: 2
	// After 2nd fill: 1
	// Order book is empty
}

// Example_priceLevelConsolidation demonstrates multiple orders at same price
func Example_priceLevelConsolidation() {
	ob := orderbook.NewOrderBook("BTC/USDT")

	price := decimal.NewFromFloat(50000.0)

	// Add 3 orders at the same price
	for i := 0; i < 3; i++ {
		order := &domain.Order{
			ID:             uuid.New(),
			UserID:         uuid.New(),
			Symbol:         "BTC/USDT",
			Side:           domain.OrderSideBuy,
			Type:           domain.OrderTypeLimit,
			Quantity:       decimal.NewFromFloat(1.0),
			FilledQuantity: decimal.Zero,
			Price:          &price,
			Status:         domain.OrderStatusOpen,
			TimeInForce:    domain.TimeInForceGTC,
			CreatedAt:      time.Now(),
			UpdatedAt:      time.Now(),
		}
		ob.AddOrder(order)
	}

	// Get all orders at this price
	orders := ob.GetOrdersAtPrice(domain.OrderSideBuy, price)

	bestBid, _ := ob.GetBestBid()
	fmt.Printf("Price Level: %s\n", bestBid.Price)
	fmt.Printf("Total Volume: %s\n", bestBid.TotalVolume)
	fmt.Printf("Order Count: %d\n", len(orders))

	// Output:
	// Price Level: 50000
	// Total Volume: 3
	// Order Count: 3
}

// Example_orderBookSnapshot demonstrates getting a full snapshot
func Example_orderBookSnapshot() {
	ob := orderbook.NewOrderBook("BTC/USDT")

	// Add some bids
	for i := 0; i < 3; i++ {
		p := decimal.NewFromFloat(50000.0 - float64(i*100))
		order := &domain.Order{
			ID:             uuid.New(),
			UserID:         uuid.New(),
			Symbol:         "BTC/USDT",
			Side:           domain.OrderSideBuy,
			Type:           domain.OrderTypeLimit,
			Quantity:       decimal.NewFromFloat(1.0),
			FilledQuantity: decimal.Zero,
			Price:          &p,
			Status:         domain.OrderStatusOpen,
			TimeInForce:    domain.TimeInForceGTC,
			CreatedAt:      time.Now(),
			UpdatedAt:      time.Now(),
		}
		ob.AddOrder(order)
	}

	// Add some asks
	for i := 0; i < 2; i++ {
		p := decimal.NewFromFloat(50100.0 + float64(i*100))
		order := &domain.Order{
			ID:             uuid.New(),
			UserID:         uuid.New(),
			Symbol:         "BTC/USDT",
			Side:           domain.OrderSideSell,
			Type:           domain.OrderTypeLimit,
			Quantity:       decimal.NewFromFloat(1.0),
			FilledQuantity: decimal.Zero,
			Price:          &p,
			Status:         domain.OrderStatusOpen,
			TimeInForce:    domain.TimeInForceGTC,
			CreatedAt:      time.Now(),
			UpdatedAt:      time.Now(),
		}
		ob.AddOrder(order)
	}

	snapshot := ob.GetSnapshot()

	fmt.Printf("Symbol: %s\n", snapshot.Symbol)
	fmt.Printf("Total Orders: %d\n", snapshot.OrderCount)
	fmt.Printf("Bid Levels: %d\n", len(snapshot.Bids))
	fmt.Printf("Ask Levels: %d\n", len(snapshot.Asks))

	// Output:
	// Symbol: BTC/USDT
	// Total Orders: 5
	// Bid Levels: 3
	// Ask Levels: 2
}

// Example_errorHandling demonstrates error handling
func Example_errorHandling() {
	ob := orderbook.NewOrderBook("BTC/USDT")

	// Try to get best bid from empty book
	_, err := ob.GetBestBid()
	if err == orderbook.ErrEmptyOrderBook {
		fmt.Println("Error: Order book is empty")
	}

	// Try to add order with wrong symbol
	price := decimal.NewFromFloat(50000.0)
	order := &domain.Order{
		ID:             uuid.New(),
		UserID:         uuid.New(),
		Symbol:         "ETH/USDT", // Wrong symbol
		Side:           domain.OrderSideBuy,
		Type:           domain.OrderTypeLimit,
		Quantity:       decimal.NewFromFloat(1.0),
		FilledQuantity: decimal.Zero,
		Price:          &price,
		Status:         domain.OrderStatusOpen,
		TimeInForce:    domain.TimeInForceGTC,
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}

	err = ob.AddOrder(order)
	if err == orderbook.ErrSymbolMismatch {
		fmt.Println("Error: Symbol mismatch")
	}

	// Try to remove non-existent order
	err = ob.RemoveOrder(uuid.New())
	if err == orderbook.ErrOrderNotFound {
		fmt.Println("Error: Order not found")
	}

	// Output:
	// Error: Order book is empty
	// Error: Symbol mismatch
	// Error: Order not found
}

// Example_timePriority demonstrates FIFO time priority
func Example_timePriority() {
	ob := orderbook.NewOrderBook("BTC/USDT")

	price := decimal.NewFromFloat(50000.0)

	// Add orders at same price (with slight time delay)
	orderIDs := make([]uuid.UUID, 3)
	for i := 0; i < 3; i++ {
		id := uuid.New()
		orderIDs[i] = id

		order := &domain.Order{
			ID:             id,
			UserID:         uuid.New(),
			Symbol:         "BTC/USDT",
			Side:           domain.OrderSideBuy,
			Type:           domain.OrderTypeLimit,
			Quantity:       decimal.NewFromFloat(1.0),
			FilledQuantity: decimal.Zero,
			Price:          &price,
			Status:         domain.OrderStatusOpen,
			TimeInForce:    domain.TimeInForceGTC,
			CreatedAt:      time.Now(),
			UpdatedAt:      time.Now(),
		}
		ob.AddOrder(order)
		time.Sleep(1 * time.Millisecond) // Ensure different timestamps
	}

	// Get orders at price level
	orders := ob.GetOrdersAtPrice(domain.OrderSideBuy, price)

	fmt.Println("Order Priority (FIFO):")
	for i, order := range orders {
		fmt.Printf("%d. Order ID: %s\n", i+1, order.ID)
	}

	// First order should match first ID
	if orders[0].ID == orderIDs[0] {
		fmt.Println("Time priority maintained: First in, first out")
	}

	// Output (order IDs will vary):
	// Order Priority (FIFO):
	// 1. Order ID: <uuid>
	// 2. Order ID: <uuid>
	// 3. Order ID: <uuid>
	// Time priority maintained: First in, first out
}
