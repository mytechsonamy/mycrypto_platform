// ============================================================================
// MYTRADER TRADE ENGINE - COMPREHENSIVE PERFORMANCE BENCHMARKS
// ============================================================================
// Purpose: Comprehensive performance benchmarks for profiling and optimization
// Target: 1,000+ matches/second, <10ms p99 latency
// Usage: go test -bench=. -benchmem -cpuprofile=cpu.prof -memprofile=mem.prof
// ============================================================================

package benchmarks

import (
	"fmt"
	"math/rand"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"github.com/mytrader/trade-engine/internal/domain"
	"github.com/mytrader/trade-engine/internal/matching"
	"github.com/mytrader/trade-engine/internal/orderbook"
)

// ============================================================================
// Helper Functions
// ============================================================================

func createTestLimitOrder(symbol string, side domain.OrderSide, qty, price string) *domain.Order {
	qtyDec, _ := decimal.NewFromString(qty)
	priceDec, _ := decimal.NewFromString(price)

	return &domain.Order{
		ID:             uuid.New(),
		UserID:         uuid.New(),
		Symbol:         symbol,
		Side:           side,
		Type:           domain.OrderTypeLimit,
		Quantity:       qtyDec,
		FilledQuantity: decimal.Zero,
		Price:          &priceDec,
		TimeInForce:    domain.TimeInForceGTC,
		CreatedAt:      time.Now(),
	}
}

func createTestMarketOrder(symbol string, side domain.OrderSide, qty string) *domain.Order {
	qtyDec, _ := decimal.NewFromString(qty)

	return &domain.Order{
		ID:             uuid.New(),
		UserID:         uuid.New(),
		Symbol:         symbol,
		Side:           side,
		Type:           domain.OrderTypeMarket,
		Quantity:       qtyDec,
		FilledQuantity: decimal.Zero,
		TimeInForce:    domain.TimeInForceGTC,
		CreatedAt:      time.Now(),
	}
}

func setupMatchingEngine() *matching.MatchingEngine {
	engine := matching.NewMatchingEngine()
	engine.SetFeeRates(decimal.NewFromFloat(0.0005), decimal.NewFromFloat(0.0010))
	return engine
}

func setupOrderBook() *orderbook.OrderBook {
	return orderbook.NewOrderBook("BTC/USDT")
}

// ============================================================================
// BENCHMARK 1: Matching Engine - Order Placement
// ============================================================================

func BenchmarkMatchingEngine_PlaceOrder_Market(b *testing.B) {
	engine := setupMatchingEngine()

	// Pre-populate with sell orders
	for i := 0; i < 100; i++ {
		order := createTestLimitOrder("BTC/USDT", domain.OrderSideSell, "1.0", "50000.00")
		engine.PlaceOrder(order)
	}

	b.ResetTimer()
	b.ReportAllocs()

	for i := 0; i < b.N; i++ {
		order := createTestMarketOrder("BTC/USDT", domain.OrderSideBuy, "0.1")
		engine.PlaceOrder(order)

		// Replenish
		replenish := createTestLimitOrder("BTC/USDT", domain.OrderSideSell, "0.1", "50000.00")
		engine.PlaceOrder(replenish)
	}
}

func BenchmarkMatchingEngine_PlaceOrder_Limit_Immediate(b *testing.B) {
	engine := setupMatchingEngine()

	// Pre-populate with sell orders
	for i := 0; i < 100; i++ {
		order := createTestLimitOrder("BTC/USDT", domain.OrderSideSell, "1.0", "50000.00")
		engine.PlaceOrder(order)
	}

	b.ResetTimer()
	b.ReportAllocs()

	for i := 0; i < b.N; i++ {
		order := createTestLimitOrder("BTC/USDT", domain.OrderSideBuy, "0.1", "50000.00")
		engine.PlaceOrder(order)

		// Replenish
		replenish := createTestLimitOrder("BTC/USDT", domain.OrderSideSell, "0.1", "50000.00")
		engine.PlaceOrder(replenish)
	}
}

func BenchmarkMatchingEngine_PlaceOrder_Limit_ToBook(b *testing.B) {
	engine := setupMatchingEngine()

	b.ResetTimer()
	b.ReportAllocs()

	for i := 0; i < b.N; i++ {
		// Bid below market, won't match
		price := fmt.Sprintf("%d.00", 49000-i%1000)
		order := createTestLimitOrder("BTC/USDT", domain.OrderSideBuy, "1.0", price)
		engine.PlaceOrder(order)
	}
}

// ============================================================================
// BENCHMARK 2: Order Book Operations
// ============================================================================

func BenchmarkOrderBook_AddOrder(b *testing.B) {
	ob := setupOrderBook()

	b.ResetTimer()
	b.ReportAllocs()

	for i := 0; i < b.N; i++ {
		price := fmt.Sprintf("%d.00", 50000+i%100)
		order := createTestLimitOrder("BTC/USDT", domain.OrderSideBuy, "1.0", price)
		ob.AddOrder(order)
	}
}

func BenchmarkOrderBook_RemoveOrder(b *testing.B) {
	ob := setupOrderBook()

	// Pre-populate
	orders := make([]*domain.Order, b.N)
	for i := 0; i < b.N; i++ {
		order := createTestLimitOrder("BTC/USDT", domain.OrderSideBuy, "1.0", "50000.00")
		ob.AddOrder(order)
		orders[i] = order
	}

	b.ResetTimer()
	b.ReportAllocs()

	for i := 0; i < b.N; i++ {
		ob.RemoveOrder(orders[i].ID)
	}
}

func BenchmarkOrderBook_GetBestBid(b *testing.B) {
	ob := setupOrderBook()

	// Pre-populate with various bids
	for i := 0; i < 100; i++ {
		price := fmt.Sprintf("%d.00", 49000+i*10)
		order := createTestLimitOrder("BTC/USDT", domain.OrderSideBuy, "1.0", price)
		ob.AddOrder(order)
	}

	b.ResetTimer()
	b.ReportAllocs()

	for i := 0; i < b.N; i++ {
		ob.GetBestBid()
	}
}

func BenchmarkOrderBook_GetBestAsk(b *testing.B) {
	ob := setupOrderBook()

	// Pre-populate with various asks
	for i := 0; i < 100; i++ {
		price := fmt.Sprintf("%d.00", 51000+i*10)
		order := createTestLimitOrder("BTC/USDT", domain.OrderSideSell, "1.0", price)
		ob.AddOrder(order)
	}

	b.ResetTimer()
	b.ReportAllocs()

	for i := 0; i < b.N; i++ {
		ob.GetBestAsk()
	}
}

func BenchmarkOrderBook_GetDepth(b *testing.B) {
	ob := setupOrderBook()

	// Pre-populate deep order book
	for i := 0; i < 100; i++ {
		buyPrice := fmt.Sprintf("%d.00", 49000+i*10)
		sellPrice := fmt.Sprintf("%d.00", 51000+i*10)

		buyOrder := createTestLimitOrder("BTC/USDT", domain.OrderSideBuy, "1.0", buyPrice)
		sellOrder := createTestLimitOrder("BTC/USDT", domain.OrderSideSell, "1.0", sellPrice)

		ob.AddOrder(buyOrder)
		ob.AddOrder(sellOrder)
	}

	b.ResetTimer()
	b.ReportAllocs()

	for i := 0; i < b.N; i++ {
		ob.GetDepth(20)
	}
}

func BenchmarkOrderBook_UpdateOrder(b *testing.B) {
	ob := setupOrderBook()

	// Pre-populate
	orders := make([]*domain.Order, 100)
	for i := 0; i < 100; i++ {
		order := createTestLimitOrder("BTC/USDT", domain.OrderSideBuy, "1.0", "50000.00")
		ob.AddOrder(order)
		orders[i] = order
	}

	b.ResetTimer()
	b.ReportAllocs()

	for i := 0; i < b.N; i++ {
		order := orders[i%len(orders)]
		fillQty := decimal.NewFromFloat(0.1)
		ob.UpdateOrder(order.ID, fillQty)
	}
}

// ============================================================================
// BENCHMARK 3: Multi-Level Matching
// ============================================================================

func BenchmarkMatchingEngine_MultiLevel_5Levels(b *testing.B) {
	engine := setupMatchingEngine()

	// Pre-populate 5 price levels with 10 orders each
	for i := 0; i < 5; i++ {
		price := fmt.Sprintf("%d.00", 50000+i*10)
		for j := 0; j < 10; j++ {
			order := createTestLimitOrder("BTC/USDT", domain.OrderSideSell, "0.1", price)
			engine.PlaceOrder(order)
		}
	}

	b.ResetTimer()
	b.ReportAllocs()

	for i := 0; i < b.N; i++ {
		// Market buy will sweep through levels
		order := createTestMarketOrder("BTC/USDT", domain.OrderSideBuy, "2.5")
		engine.PlaceOrder(order)

		// Replenish
		for j := 0; j < 5; j++ {
			price := fmt.Sprintf("%d.00", 50000+j*10)
			for k := 0; k < 5; k++ {
				replenish := createTestLimitOrder("BTC/USDT", domain.OrderSideSell, "0.1", price)
				engine.PlaceOrder(replenish)
			}
		}
	}
}

func BenchmarkMatchingEngine_MultiLevel_10Levels(b *testing.B) {
	engine := setupMatchingEngine()

	// Pre-populate 10 price levels
	for i := 0; i < 10; i++ {
		price := fmt.Sprintf("%d.00", 50000+i*10)
		for j := 0; j < 10; j++ {
			order := createTestLimitOrder("BTC/USDT", domain.OrderSideSell, "0.1", price)
			engine.PlaceOrder(order)
		}
	}

	b.ResetTimer()
	b.ReportAllocs()

	for i := 0; i < b.N; i++ {
		order := createTestMarketOrder("BTC/USDT", domain.OrderSideBuy, "5.0")
		engine.PlaceOrder(order)

		// Replenish
		for j := 0; j < 10; j++ {
			price := fmt.Sprintf("%d.00", 50000+j*10)
			for k := 0; k < 5; k++ {
				replenish := createTestLimitOrder("BTC/USDT", domain.OrderSideSell, "0.1", price)
				engine.PlaceOrder(replenish)
			}
		}
	}
}

// ============================================================================
// BENCHMARK 4: Order Cancellation
// ============================================================================

func BenchmarkMatchingEngine_CancelOrder(b *testing.B) {
	engine := setupMatchingEngine()

	// Pre-create orders
	orders := make([]*domain.Order, b.N)
	for i := 0; i < b.N; i++ {
		order := createTestLimitOrder("BTC/USDT", domain.OrderSideBuy, "1.0", "50000.00")
		engine.PlaceOrder(order)
		orders[i] = order
	}

	b.ResetTimer()
	b.ReportAllocs()

	for i := 0; i < b.N; i++ {
		engine.CancelOrder(orders[i].ID, "BTC/USDT")
	}
}

// ============================================================================
// BENCHMARK 5: High-Frequency Trading Simulation
// ============================================================================

func BenchmarkMatchingEngine_HFT_BuySell(b *testing.B) {
	engine := setupMatchingEngine()

	// Pre-populate order book
	for i := 0; i < 50; i++ {
		buyPrice := fmt.Sprintf("%d.00", 49000+i*10)
		sellPrice := fmt.Sprintf("%d.00", 51000-i*10)

		buyOrder := createTestLimitOrder("BTC/USDT", domain.OrderSideBuy, "1.0", buyPrice)
		sellOrder := createTestLimitOrder("BTC/USDT", domain.OrderSideSell, "1.0", sellPrice)

		engine.PlaceOrder(buyOrder)
		engine.PlaceOrder(sellOrder)
	}

	b.ResetTimer()
	b.ReportAllocs()

	for i := 0; i < b.N; i++ {
		if i%2 == 0 {
			order := createTestLimitOrder("BTC/USDT", domain.OrderSideBuy, "0.1", "51000.00")
			engine.PlaceOrder(order)
		} else {
			order := createTestLimitOrder("BTC/USDT", domain.OrderSideSell, "0.1", "49000.00")
			engine.PlaceOrder(order)
		}
	}
}

// ============================================================================
// BENCHMARK 6: Multi-Symbol Concurrent Operations
// ============================================================================

func BenchmarkMatchingEngine_MultiSymbol(b *testing.B) {
	engine := setupMatchingEngine()
	symbols := []string{"BTC/USDT", "ETH/USDT", "BNB/USDT", "SOL/USDT"}

	// Pre-populate each symbol
	for _, symbol := range symbols {
		for i := 0; i < 25; i++ {
			buyOrder := createTestLimitOrder(symbol, domain.OrderSideBuy, "1.0", "1000.00")
			sellOrder := createTestLimitOrder(symbol, domain.OrderSideSell, "1.0", "1100.00")
			engine.PlaceOrder(buyOrder)
			engine.PlaceOrder(sellOrder)
		}
	}

	b.ResetTimer()
	b.ReportAllocs()

	for i := 0; i < b.N; i++ {
		symbol := symbols[i%len(symbols)]

		if i%2 == 0 {
			order := createTestLimitOrder(symbol, domain.OrderSideBuy, "1.0", "1100.00")
			engine.PlaceOrder(order)
		} else {
			order := createTestLimitOrder(symbol, domain.OrderSideSell, "1.0", "1000.00")
			engine.PlaceOrder(order)
		}
	}
}

// ============================================================================
// BENCHMARK 7: Realistic Trading Mix
// ============================================================================

func BenchmarkMatchingEngine_RealisticMix(b *testing.B) {
	engine := setupMatchingEngine()
	basePrice := decimal.NewFromInt(50000)

	// Pre-populate realistic order book
	for i := 0; i < 50; i++ {
		bidPrice := basePrice.Sub(decimal.NewFromInt(int64(i * 10)))
		askPrice := basePrice.Add(decimal.NewFromInt(int64(i * 10)))

		for j := 0; j < 5; j++ {
			qty := decimal.NewFromFloat(rand.Float64() * 2)

			bidOrder := &domain.Order{
				ID:             uuid.New(),
				UserID:         uuid.New(),
				Symbol:         "BTC/USDT",
				Side:           domain.OrderSideBuy,
				Type:           domain.OrderTypeLimit,
				Quantity:       qty,
				FilledQuantity: decimal.Zero,
				Price:          &bidPrice,
				TimeInForce:    domain.TimeInForceGTC,
				CreatedAt:      time.Now(),
			}

			askOrder := &domain.Order{
				ID:             uuid.New(),
				UserID:         uuid.New(),
				Symbol:         "BTC/USDT",
				Side:           domain.OrderSideSell,
				Type:           domain.OrderTypeLimit,
				Quantity:       qty,
				FilledQuantity: decimal.Zero,
				Price:          &askPrice,
				TimeInForce:    domain.TimeInForceGTC,
				CreatedAt:      time.Now(),
			}

			engine.PlaceOrder(bidOrder)
			engine.PlaceOrder(askOrder)
		}
	}

	b.ResetTimer()
	b.ReportAllocs()

	for i := 0; i < b.N; i++ {
		// 70% limit, 30% market
		var order *domain.Order

		if rand.Float64() < 0.3 {
			// Market order
			side := domain.OrderSideBuy
			if rand.Float64() < 0.5 {
				side = domain.OrderSideSell
			}
			qty := decimal.NewFromFloat(rand.Float64() * 1)
			order = &domain.Order{
				ID:             uuid.New(),
				UserID:         uuid.New(),
				Symbol:         "BTC/USDT",
				Side:           side,
				Type:           domain.OrderTypeMarket,
				Quantity:       qty,
				FilledQuantity: decimal.Zero,
				TimeInForce:    domain.TimeInForceGTC,
				CreatedAt:      time.Now(),
			}
		} else {
			// Limit order
			side := domain.OrderSideBuy
			var price decimal.Decimal
			if rand.Float64() < 0.5 {
				side = domain.OrderSideSell
				price = basePrice.Add(decimal.NewFromInt(int64(rand.Intn(50) * 10)))
			} else {
				price = basePrice.Sub(decimal.NewFromInt(int64(rand.Intn(50) * 10)))
			}

			qty := decimal.NewFromFloat(rand.Float64() * 2)
			order = &domain.Order{
				ID:             uuid.New(),
				UserID:         uuid.New(),
				Symbol:         "BTC/USDT",
				Side:           side,
				Type:           domain.OrderTypeLimit,
				Quantity:       qty,
				FilledQuantity: decimal.Zero,
				Price:          &price,
				TimeInForce:    domain.TimeInForceGTC,
				CreatedAt:      time.Now(),
			}
		}

		engine.PlaceOrder(order)
	}
}

// ============================================================================
// BENCHMARK 8: Trade Creation (Isolated)
// ============================================================================

func BenchmarkTrade_Creation(b *testing.B) {
	engine := setupMatchingEngine()

	buyOrder := createTestLimitOrder("BTC/USDT", domain.OrderSideBuy, "1.0", "50000.00")
	sellOrder := createTestLimitOrder("BTC/USDT", domain.OrderSideSell, "1.0", "50000.00")

	b.ResetTimer()
	b.ReportAllocs()

	// Note: createTrade is private, so we measure through PlaceOrder
	// This gives us the full path including trade creation
	for i := 0; i < b.N; i++ {
		b.StopTimer()
		// Setup
		engine = setupMatchingEngine()
		engine.PlaceOrder(sellOrder)
		b.StartTimer()

		// Measure
		engine.PlaceOrder(buyOrder)
	}
}

// ============================================================================
// BENCHMARK 9: Throughput Test
// ============================================================================

func BenchmarkMatchingEngine_Throughput(b *testing.B) {
	engine := setupMatchingEngine()

	// Pre-populate deep order book
	for i := 0; i < 1000; i++ {
		price := fmt.Sprintf("%d.00", 50000+(i%100))
		order := createTestLimitOrder("BTC/USDT", domain.OrderSideSell, "1.0", price)
		engine.PlaceOrder(order)
	}

	b.ResetTimer()

	for i := 0; i < b.N; i++ {
		order := createTestMarketOrder("BTC/USDT", domain.OrderSideBuy, "0.5")
		engine.PlaceOrder(order)
	}

	// Calculate throughput
	elapsed := b.Elapsed()
	if elapsed.Seconds() > 0 {
		opsPerSec := float64(b.N) / elapsed.Seconds()
		b.ReportMetric(opsPerSec, "matches/sec")
	}
}

// ============================================================================
// BENCHMARK 10: Memory Allocation Patterns
// ============================================================================

func BenchmarkMemory_OrderCreation(b *testing.B) {
	b.ReportAllocs()

	for i := 0; i < b.N; i++ {
		createTestLimitOrder("BTC/USDT", domain.OrderSideBuy, "1.0", "50000.00")
	}
}

func BenchmarkMemory_TradeSliceGrowth(b *testing.B) {
	engine := setupMatchingEngine()

	// Pre-populate
	for i := 0; i < 100; i++ {
		order := createTestLimitOrder("BTC/USDT", domain.OrderSideSell, "0.1", "50000.00")
		engine.PlaceOrder(order)
	}

	b.ResetTimer()
	b.ReportAllocs()

	for i := 0; i < b.N; i++ {
		// This will generate multiple trades
		order := createTestMarketOrder("BTC/USDT", domain.OrderSideBuy, "5.0")
		engine.PlaceOrder(order)

		// Replenish
		for j := 0; j < 50; j++ {
			replenish := createTestLimitOrder("BTC/USDT", domain.OrderSideSell, "0.1", "50000.00")
			engine.PlaceOrder(replenish)
		}
	}
}
