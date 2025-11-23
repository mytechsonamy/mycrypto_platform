// ============================================================================
// MYTRADER TRADE ENGINE - MATCHING ENGINE BENCHMARKS
// ============================================================================
// Performance Target: 1,000+ matches/second
// Latency Target: <10ms (p99)
// ===========================================================================

package matching

import (
	"fmt"
	"math/rand"
	"testing"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"github.com/mytrader/trade-engine/internal/domain"
)

// ===========================================================================
// BENCHMARK: Market Order Matching
// ===========================================================================

func BenchmarkMatchingEngine_MarketOrder_SingleLevel(b *testing.B) {
	engine := NewMatchingEngine()

	// Pre-populate order book with sell orders
	for i := 0; i < 100; i++ {
		sellOrder := createLimitOrder("BTC/USDT", domain.OrderSideSell, "1.0", "50000.00")
		engine.PlaceOrder(sellOrder)
	}

	b.ResetTimer()
	b.ReportAllocs()

	for i := 0; i < b.N; i++ {
		buyOrder := createMarketOrder("BTC/USDT", domain.OrderSideBuy, "1.0")
		engine.PlaceOrder(buyOrder)

		// Replenish order book
		sellOrder := createLimitOrder("BTC/USDT", domain.OrderSideSell, "1.0", "50000.00")
		engine.PlaceOrder(sellOrder)
	}
}

func BenchmarkMatchingEngine_MarketOrder_MultiLevel(b *testing.B) {
	engine := NewMatchingEngine()

	// Pre-populate order book with multiple price levels
	for i := 0; i < 10; i++ {
		price := fmt.Sprintf("%d.00", 50000+i*100)
		for j := 0; j < 10; j++ {
			sellOrder := createLimitOrder("BTC/USDT", domain.OrderSideSell, "0.1", price)
			engine.PlaceOrder(sellOrder)
		}
	}

	b.ResetTimer()
	b.ReportAllocs()

	for i := 0; i < b.N; i++ {
		buyOrder := createMarketOrder("BTC/USDT", domain.OrderSideBuy, "0.5")
		engine.PlaceOrder(buyOrder)

		// Replenish
		price := fmt.Sprintf("%d.00", 50000+(i%10)*100)
		for j := 0; j < 5; j++ {
			sellOrder := createLimitOrder("BTC/USDT", domain.OrderSideSell, "0.1", price)
			engine.PlaceOrder(sellOrder)
		}
	}
}

// ===========================================================================
// BENCHMARK: Limit Order Matching
// ===========================================================================

func BenchmarkMatchingEngine_LimitOrder_ImmediateMatch(b *testing.B) {
	engine := NewMatchingEngine()

	// Pre-populate with sell orders
	for i := 0; i < 100; i++ {
		sellOrder := createLimitOrder("BTC/USDT", domain.OrderSideSell, "1.0", "50000.00")
		engine.PlaceOrder(sellOrder)
	}

	b.ResetTimer()
	b.ReportAllocs()

	for i := 0; i < b.N; i++ {
		buyOrder := createLimitOrder("BTC/USDT", domain.OrderSideBuy, "1.0", "50000.00")
		engine.PlaceOrder(buyOrder)

		// Replenish
		sellOrder := createLimitOrder("BTC/USDT", domain.OrderSideSell, "1.0", "50000.00")
		engine.PlaceOrder(sellOrder)
	}
}

func BenchmarkMatchingEngine_LimitOrder_AddToBook(b *testing.B) {
	engine := NewMatchingEngine()

	b.ResetTimer()
	b.ReportAllocs()

	for i := 0; i < b.N; i++ {
		// These won't match, just add to book
		price := fmt.Sprintf("%d.00", 50000+i%1000)
		order := createLimitOrder("BTC/USDT", domain.OrderSideBuy, "1.0", price)
		engine.PlaceOrder(order)
	}
}

// ===========================================================================
// BENCHMARK: Order Cancellation
// ===========================================================================

func BenchmarkMatchingEngine_CancelOrder(b *testing.B) {
	engine := NewMatchingEngine()

	// Pre-create orders
	orders := make([]*domain.Order, b.N)
	for i := 0; i < b.N; i++ {
		order := createLimitOrder("BTC/USDT", domain.OrderSideBuy, "1.0", "50000.00")
		engine.PlaceOrder(order)
		orders[i] = order
	}

	b.ResetTimer()
	b.ReportAllocs()

	for i := 0; i < b.N; i++ {
		engine.CancelOrder(orders[i].ID, "BTC/USDT")
	}
}

// ===========================================================================
// BENCHMARK: High-Frequency Trading Simulation
// ===========================================================================

func BenchmarkMatchingEngine_HighFrequencyTrading(b *testing.B) {
	engine := NewMatchingEngine()

	// Pre-populate order book
	for i := 0; i < 50; i++ {
		buyPrice := fmt.Sprintf("%d.00", 49000+i*10)
		sellPrice := fmt.Sprintf("%d.00", 51000-i*10)

		buyOrder := createLimitOrder("BTC/USDT", domain.OrderSideBuy, "1.0", buyPrice)
		sellOrder := createLimitOrder("BTC/USDT", domain.OrderSideSell, "1.0", sellPrice)

		engine.PlaceOrder(buyOrder)
		engine.PlaceOrder(sellOrder)
	}

	b.ResetTimer()
	b.ReportAllocs()

	for i := 0; i < b.N; i++ {
		// Simulate HFT: rapid buy/sell
		if i%2 == 0 {
			buyOrder := createLimitOrder("BTC/USDT", domain.OrderSideBuy, "0.1", "51000.00")
			engine.PlaceOrder(buyOrder)
		} else {
			sellOrder := createLimitOrder("BTC/USDT", domain.OrderSideSell, "0.1", "49000.00")
			engine.PlaceOrder(sellOrder)
		}
	}
}

// ===========================================================================
// BENCHMARK: Multi-Symbol Concurrent Matching
// ===========================================================================

func BenchmarkMatchingEngine_MultiSymbol(b *testing.B) {
	engine := NewMatchingEngine()

	symbols := []string{"BTC/USDT", "ETH/USDT", "BNB/USDT", "SOL/USDT"}

	// Pre-populate each symbol
	for _, symbol := range symbols {
		for i := 0; i < 25; i++ {
			buyOrder := createLimitOrder(symbol, domain.OrderSideBuy, "1.0", "1000.00")
			sellOrder := createLimitOrder(symbol, domain.OrderSideSell, "1.0", "1100.00")
			engine.PlaceOrder(buyOrder)
			engine.PlaceOrder(sellOrder)
		}
	}

	b.ResetTimer()
	b.ReportAllocs()

	for i := 0; i < b.N; i++ {
		symbol := symbols[i%len(symbols)]

		if i%2 == 0 {
			order := createLimitOrder(symbol, domain.OrderSideBuy, "1.0", "1100.00")
			engine.PlaceOrder(order)
		} else {
			order := createLimitOrder(symbol, domain.OrderSideSell, "1.0", "1000.00")
			engine.PlaceOrder(order)
		}
	}
}

// ===========================================================================
// BENCHMARK: Realistic Trading Simulation
// ===========================================================================

func BenchmarkMatchingEngine_RealisticTrading(b *testing.B) {
	engine := NewMatchingEngine()
	basePrice := decimal.NewFromInt(50000)

	// Pre-populate with realistic order book depth
	for i := 0; i < 20; i++ {
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
			}

			engine.PlaceOrder(bidOrder)
			engine.PlaceOrder(askOrder)
		}
	}

	b.ResetTimer()
	b.ReportAllocs()

	for i := 0; i < b.N; i++ {
		// Simulate realistic mix: 70% limit, 30% market
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
			}
		} else {
			// Limit order
			side := domain.OrderSideBuy
			var price decimal.Decimal
			if rand.Float64() < 0.5 {
				side = domain.OrderSideSell
				price = basePrice.Add(decimal.NewFromInt(int64(rand.Intn(20) * 10)))
			} else {
				price = basePrice.Sub(decimal.NewFromInt(int64(rand.Intn(20) * 10)))
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
			}
		}

		engine.PlaceOrder(order)
	}
}

// ===========================================================================
// BENCHMARK: Trade Creation
// ===========================================================================

func BenchmarkMatchingEngine_TradeCreation(b *testing.B) {
	engine := NewMatchingEngine()

	buyOrder := createLimitOrder("BTC/USDT", domain.OrderSideBuy, "1.0", "50000.00")
	sellOrder := createLimitOrder("BTC/USDT", domain.OrderSideSell, "1.0", "50000.00")
	price := decimal.NewFromInt(50000)
	qty := decimal.NewFromInt(1)

	b.ResetTimer()
	b.ReportAllocs()

	for i := 0; i < b.N; i++ {
		engine.createTrade(buyOrder, sellOrder, price, qty, false)
	}
}

// ===========================================================================
// BENCHMARK: Order Validation
// ===========================================================================

func BenchmarkMatchingEngine_OrderValidation(b *testing.B) {
	engine := NewMatchingEngine()

	order := createLimitOrder("BTC/USDT", domain.OrderSideBuy, "1.0", "50000.00")

	b.ResetTimer()
	b.ReportAllocs()

	for i := 0; i < b.N; i++ {
		engine.validateOrder(order)
	}
}

// ===========================================================================
// BENCHMARK: Throughput Test
// ===========================================================================

func BenchmarkMatchingEngine_ThroughputTest(b *testing.B) {
	engine := NewMatchingEngine()

	// Pre-populate deep order book
	for i := 0; i < 1000; i++ {
		price := fmt.Sprintf("%d.00", 50000+(i%100))
		sellOrder := createLimitOrder("BTC/USDT", domain.OrderSideSell, "1.0", price)
		engine.PlaceOrder(sellOrder)
	}

	b.ResetTimer()

	// Measure ops/sec
	start := b.N
	for i := 0; i < b.N; i++ {
		buyOrder := createMarketOrder("BTC/USDT", domain.OrderSideBuy, "0.5")
		engine.PlaceOrder(buyOrder)
	}

	elapsed := b.Elapsed()
	opsPerSec := float64(start) / elapsed.Seconds()

	b.ReportMetric(opsPerSec, "matches/sec")
}
