package orderbook_test

import (
	"testing"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"

	"github.com/mytrader/trade-engine/internal/domain"
	"github.com/mytrader/trade-engine/internal/orderbook"
)

// Benchmark: AddOrder
func BenchmarkOrderBook_AddOrder(b *testing.B) {
	ob := orderbook.NewOrderBook("BTC/USDT")

	orders := make([]*domain.Order, b.N)
	for i := 0; i < b.N; i++ {
		price := 50000.0 + float64(i%1000)
		orders[i] = createOrder("BTC/USDT", domain.OrderSideBuy, price, 1.0)
	}

	b.ResetTimer()

	for i := 0; i < b.N; i++ {
		ob.AddOrder(orders[i])
	}
}

// Benchmark: RemoveOrder
func BenchmarkOrderBook_RemoveOrder(b *testing.B) {
	ob := orderbook.NewOrderBook("BTC/USDT")

	// Pre-populate with orders
	orders := make([]*domain.Order, b.N)
	for i := 0; i < b.N; i++ {
		price := 50000.0 + float64(i%1000)
		orders[i] = createOrder("BTC/USDT", domain.OrderSideBuy, price, 1.0)
		ob.AddOrder(orders[i])
	}

	b.ResetTimer()

	for i := 0; i < b.N; i++ {
		ob.RemoveOrder(orders[i].ID)
	}
}

// Benchmark: UpdateOrder - Partial Fill
func BenchmarkOrderBook_UpdateOrder(b *testing.B) {
	ob := orderbook.NewOrderBook("BTC/USDT")

	// Pre-populate with orders
	orders := make([]*domain.Order, b.N)
	for i := 0; i < b.N; i++ {
		price := 50000.0 + float64(i%1000)
		order := createOrder("BTC/USDT", domain.OrderSideBuy, price, 10.0)
		orders[i] = order
		ob.AddOrder(order)
	}

	fillQty := decimal.NewFromFloat(0.5)

	b.ResetTimer()

	for i := 0; i < b.N; i++ {
		ob.UpdateOrder(orders[i].ID, fillQty)
	}
}

// Benchmark: GetBestBid
func BenchmarkOrderBook_GetBestBid(b *testing.B) {
	ob := orderbook.NewOrderBook("BTC/USDT")

	// Pre-populate with 1000 orders
	for i := 0; i < 1000; i++ {
		price := 50000.0 + float64(i)
		ob.AddOrder(createOrder("BTC/USDT", domain.OrderSideBuy, price, 1.0))
	}

	b.ResetTimer()

	for i := 0; i < b.N; i++ {
		ob.GetBestBid()
	}
}

// Benchmark: GetBestAsk
func BenchmarkOrderBook_GetBestAsk(b *testing.B) {
	ob := orderbook.NewOrderBook("BTC/USDT")

	// Pre-populate with 1000 orders
	for i := 0; i < 1000; i++ {
		price := 50100.0 + float64(i)
		ob.AddOrder(createOrder("BTC/USDT", domain.OrderSideSell, price, 1.0))
	}

	b.ResetTimer()

	for i := 0; i < b.N; i++ {
		ob.GetBestAsk()
	}
}

// Benchmark: GetSpread
func BenchmarkOrderBook_GetSpread(b *testing.B) {
	ob := orderbook.NewOrderBook("BTC/USDT")

	// Add some orders on both sides
	for i := 0; i < 100; i++ {
		ob.AddOrder(createOrder("BTC/USDT", domain.OrderSideBuy, 50000.0-float64(i), 1.0))
		ob.AddOrder(createOrder("BTC/USDT", domain.OrderSideSell, 50100.0+float64(i), 1.0))
	}

	b.ResetTimer()

	for i := 0; i < b.N; i++ {
		ob.GetSpread()
	}
}

// Benchmark: GetDepth - 10 levels
func BenchmarkOrderBook_GetDepth10(b *testing.B) {
	ob := orderbook.NewOrderBook("BTC/USDT")

	// Pre-populate with 100 price levels on each side
	for i := 0; i < 100; i++ {
		ob.AddOrder(createOrder("BTC/USDT", domain.OrderSideBuy, 50000.0-float64(i), 1.0))
		ob.AddOrder(createOrder("BTC/USDT", domain.OrderSideSell, 50100.0+float64(i), 1.0))
	}

	b.ResetTimer()

	for i := 0; i < b.N; i++ {
		ob.GetDepth(10)
	}
}

// Benchmark: GetDepth - 50 levels
func BenchmarkOrderBook_GetDepth50(b *testing.B) {
	ob := orderbook.NewOrderBook("BTC/USDT")

	// Pre-populate with 100 price levels on each side
	for i := 0; i < 100; i++ {
		ob.AddOrder(createOrder("BTC/USDT", domain.OrderSideBuy, 50000.0-float64(i), 1.0))
		ob.AddOrder(createOrder("BTC/USDT", domain.OrderSideSell, 50100.0+float64(i), 1.0))
	}

	b.ResetTimer()

	for i := 0; i < b.N; i++ {
		ob.GetDepth(50)
	}
}

// Benchmark: GetOrder - O(1) lookup
func BenchmarkOrderBook_GetOrder(b *testing.B) {
	ob := orderbook.NewOrderBook("BTC/USDT")

	// Pre-populate with 1000 orders
	orders := make([]*domain.Order, 1000)
	for i := 0; i < 1000; i++ {
		price := 50000.0 + float64(i)
		order := createOrder("BTC/USDT", domain.OrderSideBuy, price, 1.0)
		orders[i] = order
		ob.AddOrder(order)
	}

	b.ResetTimer()

	for i := 0; i < b.N; i++ {
		ob.GetOrder(orders[i%1000].ID)
	}
}

// Benchmark: GetOrdersAtPrice
func BenchmarkOrderBook_GetOrdersAtPrice(b *testing.B) {
	ob := orderbook.NewOrderBook("BTC/USDT")

	price := decimal.NewFromFloat(50000.0)

	// Add 100 orders at the same price
	for i := 0; i < 100; i++ {
		order := createOrderWithID(uuid.New(), "BTC/USDT", domain.OrderSideBuy, price, 1.0)
		ob.AddOrder(order)
	}

	b.ResetTimer()

	for i := 0; i < b.N; i++ {
		ob.GetOrdersAtPrice(domain.OrderSideBuy, price)
	}
}

// Benchmark: GetSnapshot
func BenchmarkOrderBook_GetSnapshot(b *testing.B) {
	ob := orderbook.NewOrderBook("BTC/USDT")

	// Pre-populate with 100 orders on each side
	for i := 0; i < 100; i++ {
		ob.AddOrder(createOrder("BTC/USDT", domain.OrderSideBuy, 50000.0-float64(i), 1.0))
		ob.AddOrder(createOrder("BTC/USDT", domain.OrderSideSell, 50100.0+float64(i), 1.0))
	}

	b.ResetTimer()

	for i := 0; i < b.N; i++ {
		ob.GetSnapshot()
	}
}

// Benchmark: Mixed Operations - Realistic Workload
func BenchmarkOrderBook_MixedOperations(b *testing.B) {
	ob := orderbook.NewOrderBook("BTC/USDT")

	// Pre-populate with some orders
	initialOrders := make([]*domain.Order, 100)
	for i := 0; i < 100; i++ {
		price := 50000.0 + float64(i)
		order := createOrder("BTC/USDT", domain.OrderSideBuy, price, 10.0)
		initialOrders[i] = order
		ob.AddOrder(order)
	}

	b.ResetTimer()

	for i := 0; i < b.N; i++ {
		switch i % 5 {
		case 0:
			// Add order (40% of operations)
			price := 50000.0 + float64(i%1000)
			order := createOrder("BTC/USDT", domain.OrderSideBuy, price, 1.0)
			ob.AddOrder(order)
		case 1:
			// Get best bid (20% of operations)
			ob.GetBestBid()
		case 2:
			// Get depth (20% of operations)
			ob.GetDepth(10)
		case 3:
			// Update order (10% of operations)
			if len(initialOrders) > 0 {
				ob.UpdateOrder(initialOrders[i%len(initialOrders)].ID, decimal.NewFromFloat(0.1))
			}
		case 4:
			// Remove order (10% of operations)
			if len(initialOrders) > 0 && i%10 == 0 {
				ob.RemoveOrder(initialOrders[i%len(initialOrders)].ID)
			}
		}
	}
}

// Benchmark: Large Order Book - 10,000 orders
func BenchmarkOrderBook_LargeScale_10K(b *testing.B) {
	ob := orderbook.NewOrderBook("BTC/USDT")

	// Pre-populate with 10,000 orders
	orders := make([]*domain.Order, 10000)
	for i := 0; i < 10000; i++ {
		price := 50000.0 + float64(i%1000)
		order := createOrder("BTC/USDT", domain.OrderSideBuy, price, 1.0)
		orders[i] = order
		ob.AddOrder(order)
	}

	b.ResetTimer()

	for i := 0; i < b.N; i++ {
		// Perform various operations
		switch i % 4 {
		case 0:
			ob.GetBestBid()
		case 1:
			ob.GetDepth(10)
		case 2:
			ob.GetOrder(orders[i%10000].ID)
		case 3:
			ob.UpdateOrder(orders[i%10000].ID, decimal.NewFromFloat(0.01))
		}
	}
}

// Benchmark: Concurrent Reads
func BenchmarkOrderBook_ConcurrentReads(b *testing.B) {
	ob := orderbook.NewOrderBook("BTC/USDT")

	// Pre-populate with 1000 orders
	for i := 0; i < 1000; i++ {
		price := 50000.0 + float64(i)
		ob.AddOrder(createOrder("BTC/USDT", domain.OrderSideBuy, price, 1.0))
	}

	b.ResetTimer()
	b.RunParallel(func(pb *testing.PB) {
		for pb.Next() {
			ob.GetBestBid()
			ob.GetDepth(10)
		}
	})
}

// Benchmark: Concurrent Writes
func BenchmarkOrderBook_ConcurrentWrites(b *testing.B) {
	ob := orderbook.NewOrderBook("BTC/USDT")

	b.ResetTimer()
	b.RunParallel(func(pb *testing.PB) {
		i := 0
		for pb.Next() {
			price := 50000.0 + float64(i%1000)
			order := createOrder("BTC/USDT", domain.OrderSideBuy, price, 1.0)
			ob.AddOrder(order)
			i++
		}
	})
}

// Benchmark: Concurrent Mixed Operations
func BenchmarkOrderBook_ConcurrentMixed(b *testing.B) {
	ob := orderbook.NewOrderBook("BTC/USDT")

	// Pre-populate
	orders := make([]*domain.Order, 1000)
	for i := 0; i < 1000; i++ {
		price := 50000.0 + float64(i)
		order := createOrder("BTC/USDT", domain.OrderSideBuy, price, 10.0)
		orders[i] = order
		ob.AddOrder(order)
	}

	b.ResetTimer()
	b.RunParallel(func(pb *testing.PB) {
		i := 0
		for pb.Next() {
			switch i % 3 {
			case 0:
				// Read operations
				ob.GetBestBid()
			case 1:
				// Add operation
				price := 51000.0 + float64(i%100)
				order := createOrder("BTC/USDT", domain.OrderSideBuy, price, 1.0)
				ob.AddOrder(order)
			case 2:
				// Update operation
				ob.UpdateOrder(orders[i%1000].ID, decimal.NewFromFloat(0.01))
			}
			i++
		}
	})
}
