package orderbook_test

import (
	"testing"

	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/mytrader/trade-engine/internal/domain"
	"github.com/mytrader/trade-engine/internal/orderbook"
)

// Test: NewPriceLevelTree
func TestPriceLevelTree_New(t *testing.T) {
	bidTree := orderbook.NewPriceLevelTree(domain.OrderSideBuy)
	assert.NotNil(t, bidTree)
	assert.Equal(t, 0, bidTree.GetLevelCount())
	assert.Equal(t, 0, bidTree.GetHeight())

	askTree := orderbook.NewPriceLevelTree(domain.OrderSideSell)
	assert.NotNil(t, askTree)
	assert.Equal(t, 0, askTree.GetLevelCount())
}

// Test: GetOrCreateLevel - Create New Level
func TestPriceLevelTree_GetOrCreateLevel_CreateNew(t *testing.T) {
	tree := orderbook.NewPriceLevelTree(domain.OrderSideBuy)

	price := decimal.NewFromFloat(50000.0)
	level := tree.GetOrCreateLevel(price)

	require.NotNil(t, level)
	assert.Equal(t, price.String(), level.Price.String())
	assert.Equal(t, 0, level.OrderCount)
	assert.True(t, level.TotalVolume.IsZero())
	assert.Equal(t, 1, tree.GetLevelCount())
}

// Test: GetOrCreateLevel - Get Existing Level
func TestPriceLevelTree_GetOrCreateLevel_GetExisting(t *testing.T) {
	tree := orderbook.NewPriceLevelTree(domain.OrderSideBuy)

	price := decimal.NewFromFloat(50000.0)

	// Create level
	level1 := tree.GetOrCreateLevel(price)
	level1.OrderCount = 5

	// Get same level
	level2 := tree.GetOrCreateLevel(price)

	// Should be same level
	assert.Equal(t, level1, level2)
	assert.Equal(t, 5, level2.OrderCount)
	assert.Equal(t, 1, tree.GetLevelCount())
}

// Test: RemoveLevel
func TestPriceLevelTree_RemoveLevel(t *testing.T) {
	tree := orderbook.NewPriceLevelTree(domain.OrderSideBuy)

	price := decimal.NewFromFloat(50000.0)
	tree.GetOrCreateLevel(price)

	assert.Equal(t, 1, tree.GetLevelCount())

	tree.RemoveLevel(price)

	assert.Equal(t, 0, tree.GetLevelCount())
}

// Test: RemoveLevel - Non-existent
func TestPriceLevelTree_RemoveLevel_NonExistent(t *testing.T) {
	tree := orderbook.NewPriceLevelTree(domain.OrderSideBuy)

	price := decimal.NewFromFloat(50000.0)

	// Should not panic
	tree.RemoveLevel(price)

	assert.Equal(t, 0, tree.GetLevelCount())
}

// Test: GetTopLevels - Buy Side (Descending)
func TestPriceLevelTree_GetTopLevels_BuySide(t *testing.T) {
	tree := orderbook.NewPriceLevelTree(domain.OrderSideBuy)

	// Add levels in random order
	prices := []float64{50000, 50100, 49900, 50200, 49800}
	for _, p := range prices {
		price := decimal.NewFromFloat(p)
		level := tree.GetOrCreateLevel(price)
		level.TotalVolume = decimal.NewFromFloat(1.0)
		level.OrderCount = 1
	}

	// Get top 3 levels
	levels := tree.GetTopLevels(3)

	// Should be sorted highest to lowest
	require.Equal(t, 3, len(levels))
	assert.Equal(t, "50200", levels[0].Price)
	assert.Equal(t, "50100", levels[1].Price)
	assert.Equal(t, "50000", levels[2].Price)
}

// Test: GetTopLevels - Sell Side (Ascending)
func TestPriceLevelTree_GetTopLevels_SellSide(t *testing.T) {
	tree := orderbook.NewPriceLevelTree(domain.OrderSideSell)

	// Add levels in random order
	prices := []float64{50100, 50000, 50200, 49900, 50300}
	for _, p := range prices {
		price := decimal.NewFromFloat(p)
		level := tree.GetOrCreateLevel(price)
		level.TotalVolume = decimal.NewFromFloat(1.0)
		level.OrderCount = 1
	}

	// Get top 3 levels
	levels := tree.GetTopLevels(3)

	// Should be sorted lowest to highest
	require.Equal(t, 3, len(levels))
	assert.Equal(t, "49900", levels[0].Price)
	assert.Equal(t, "50000", levels[1].Price)
	assert.Equal(t, "50100", levels[2].Price)
}

// Test: GetTopLevels - Request More Than Available
func TestPriceLevelTree_GetTopLevels_RequestMoreThanAvailable(t *testing.T) {
	tree := orderbook.NewPriceLevelTree(domain.OrderSideBuy)

	// Add 3 levels
	for i := 0; i < 3; i++ {
		price := decimal.NewFromFloat(50000.0 + float64(i*100))
		level := tree.GetOrCreateLevel(price)
		level.TotalVolume = decimal.NewFromFloat(1.0)
		level.OrderCount = 1
	}

	// Request 10 levels (more than available)
	levels := tree.GetTopLevels(10)

	// Should return all 3 available levels
	assert.Equal(t, 3, len(levels))
}

// Test: GetAllLevels
func TestPriceLevelTree_GetAllLevels(t *testing.T) {
	tree := orderbook.NewPriceLevelTree(domain.OrderSideBuy)

	// Add 10 levels
	for i := 0; i < 10; i++ {
		price := decimal.NewFromFloat(50000.0 + float64(i*100))
		level := tree.GetOrCreateLevel(price)
		level.TotalVolume = decimal.NewFromFloat(1.0)
		level.OrderCount = 1
	}

	levels := tree.GetAllLevels()

	assert.Equal(t, 10, len(levels))
	// Should be sorted highest to lowest for buy side
	assert.Equal(t, "50900", levels[0].Price)
	assert.Equal(t, "50000", levels[9].Price)
}

// Test: AVL Tree Balance - Right-Right Case
func TestPriceLevelTree_AVLBalance_RightRight(t *testing.T) {
	tree := orderbook.NewPriceLevelTree(domain.OrderSideBuy)

	// Insert in ascending order (will cause right-heavy tree)
	for i := 1; i <= 5; i++ {
		price := decimal.NewFromFloat(float64(i * 1000))
		tree.GetOrCreateLevel(price)
	}

	// Tree should be balanced
	assert.True(t, tree.Verify(), "Tree should be a valid AVL tree")
	assert.LessOrEqual(t, tree.GetHeight(), 4, "Height should be log(n)")
}

// Test: AVL Tree Balance - Left-Left Case
func TestPriceLevelTree_AVLBalance_LeftLeft(t *testing.T) {
	tree := orderbook.NewPriceLevelTree(domain.OrderSideBuy)

	// Insert in descending order (will cause left-heavy tree)
	for i := 5; i >= 1; i-- {
		price := decimal.NewFromFloat(float64(i * 1000))
		tree.GetOrCreateLevel(price)
	}

	// Tree should be balanced
	assert.True(t, tree.Verify(), "Tree should be a valid AVL tree")
	assert.LessOrEqual(t, tree.GetHeight(), 4, "Height should be log(n)")
}

// Test: AVL Tree Balance - Large Scale
func TestPriceLevelTree_AVLBalance_LargeScale(t *testing.T) {
	tree := orderbook.NewPriceLevelTree(domain.OrderSideBuy)

	// Insert 1000 levels
	for i := 0; i < 1000; i++ {
		price := decimal.NewFromFloat(50000.0 + float64(i))
		tree.GetOrCreateLevel(price)
	}

	// Tree should be balanced
	assert.True(t, tree.Verify(), "Tree should be a valid AVL tree")
	assert.Equal(t, 1000, tree.GetLevelCount())

	// Height should be O(log n) - for 1000 nodes, max height ~10
	assert.LessOrEqual(t, tree.GetHeight(), 15, "Height should be O(log n)")
}

// Test: Best Price Tracking - Buy Side
func TestPriceLevelTree_BestPrice_BuySide(t *testing.T) {
	tree := orderbook.NewPriceLevelTree(domain.OrderSideBuy)

	// Add levels
	tree.GetOrCreateLevel(decimal.NewFromFloat(50000))
	tree.GetOrCreateLevel(decimal.NewFromFloat(50100))
	tree.GetOrCreateLevel(decimal.NewFromFloat(49900))

	// Best bid should be highest price
	levels := tree.GetTopLevels(1)
	require.Equal(t, 1, len(levels))
	assert.Equal(t, "50100", levels[0].Price)
}

// Test: Best Price Tracking - Sell Side
func TestPriceLevelTree_BestPrice_SellSide(t *testing.T) {
	tree := orderbook.NewPriceLevelTree(domain.OrderSideSell)

	// Add levels
	tree.GetOrCreateLevel(decimal.NewFromFloat(50100))
	tree.GetOrCreateLevel(decimal.NewFromFloat(50000))
	tree.GetOrCreateLevel(decimal.NewFromFloat(50200))

	// Best ask should be lowest price
	levels := tree.GetTopLevels(1)
	require.Equal(t, 1, len(levels))
	assert.Equal(t, "50000", levels[0].Price)
}

// Test: Best Price Update After Removal
func TestPriceLevelTree_BestPrice_AfterRemoval(t *testing.T) {
	tree := orderbook.NewPriceLevelTree(domain.OrderSideBuy)

	// Add levels
	tree.GetOrCreateLevel(decimal.NewFromFloat(50000))
	tree.GetOrCreateLevel(decimal.NewFromFloat(50100))
	tree.GetOrCreateLevel(decimal.NewFromFloat(49900))

	// Remove best price
	tree.RemoveLevel(decimal.NewFromFloat(50100))

	// New best should be 50000
	levels := tree.GetTopLevels(1)
	require.Equal(t, 1, len(levels))
	assert.Equal(t, "50000", levels[0].Price)
}

// Test: Insertion and Removal - Random Order
func TestPriceLevelTree_InsertRemove_RandomOrder(t *testing.T) {
	tree := orderbook.NewPriceLevelTree(domain.OrderSideBuy)

	prices := []float64{50500, 50100, 50900, 50300, 50700, 50200, 50800, 50400, 50600}

	// Insert all
	for _, p := range prices {
		tree.GetOrCreateLevel(decimal.NewFromFloat(p))
	}

	assert.Equal(t, len(prices), tree.GetLevelCount())
	assert.True(t, tree.Verify())

	// Remove half
	for i := 0; i < len(prices)/2; i++ {
		tree.RemoveLevel(decimal.NewFromFloat(prices[i]))
	}

	assert.Equal(t, len(prices)-len(prices)/2, tree.GetLevelCount())
	assert.True(t, tree.Verify())
}

// Test: Empty Tree Operations
func TestPriceLevelTree_EmptyTree_Operations(t *testing.T) {
	tree := orderbook.NewPriceLevelTree(domain.OrderSideBuy)

	assert.Equal(t, 0, tree.GetLevelCount())
	assert.Equal(t, 0, tree.GetHeight())

	levels := tree.GetTopLevels(10)
	assert.Equal(t, 0, len(levels))

	allLevels := tree.GetAllLevels()
	assert.Equal(t, 0, len(allLevels))

	// Remove from empty tree should not panic
	tree.RemoveLevel(decimal.NewFromFloat(50000))
}

// Test: Single Level Tree
func TestPriceLevelTree_SingleLevel(t *testing.T) {
	tree := orderbook.NewPriceLevelTree(domain.OrderSideBuy)

	price := decimal.NewFromFloat(50000.0)
	level := tree.GetOrCreateLevel(price)
	level.TotalVolume = decimal.NewFromFloat(10.0)
	level.OrderCount = 5

	assert.Equal(t, 1, tree.GetLevelCount())
	assert.Equal(t, 1, tree.GetHeight())
	assert.True(t, tree.Verify())

	levels := tree.GetTopLevels(1)
	require.Equal(t, 1, len(levels))
	assert.Equal(t, "50000", levels[0].Price)
	assert.Equal(t, "10", levels[0].Volume)
	assert.Equal(t, 5, levels[0].OrderCount)
}

// Test: Verify AVL Property - After Many Operations
func TestPriceLevelTree_VerifyAVL_ManyOperations(t *testing.T) {
	tree := orderbook.NewPriceLevelTree(domain.OrderSideBuy)

	// Perform 500 insertions and 250 deletions
	prices := make([]decimal.Decimal, 500)
	for i := 0; i < 500; i++ {
		price := decimal.NewFromFloat(50000.0 + float64(i))
		prices[i] = price
		tree.GetOrCreateLevel(price)
	}

	// Verify after insertions
	assert.True(t, tree.Verify())

	// Remove every other level
	for i := 0; i < 250; i++ {
		tree.RemoveLevel(prices[i*2])
	}

	// Verify after deletions
	assert.True(t, tree.Verify())
	assert.Equal(t, 250, tree.GetLevelCount())
}

// Benchmark: GetOrCreateLevel
func BenchmarkPriceLevelTree_GetOrCreateLevel(b *testing.B) {
	tree := orderbook.NewPriceLevelTree(domain.OrderSideBuy)

	prices := make([]decimal.Decimal, b.N)
	for i := 0; i < b.N; i++ {
		prices[i] = decimal.NewFromFloat(50000.0 + float64(i%1000))
	}

	b.ResetTimer()

	for i := 0; i < b.N; i++ {
		tree.GetOrCreateLevel(prices[i])
	}
}

// Benchmark: RemoveLevel
func BenchmarkPriceLevelTree_RemoveLevel(b *testing.B) {
	tree := orderbook.NewPriceLevelTree(domain.OrderSideBuy)

	// Pre-populate tree
	prices := make([]decimal.Decimal, b.N)
	for i := 0; i < b.N; i++ {
		price := decimal.NewFromFloat(50000.0 + float64(i))
		prices[i] = price
		tree.GetOrCreateLevel(price)
	}

	b.ResetTimer()

	for i := 0; i < b.N; i++ {
		tree.RemoveLevel(prices[i])
	}
}

// Benchmark: GetTopLevels
func BenchmarkPriceLevelTree_GetTopLevels(b *testing.B) {
	tree := orderbook.NewPriceLevelTree(domain.OrderSideBuy)

	// Pre-populate with 1000 levels
	for i := 0; i < 1000; i++ {
		price := decimal.NewFromFloat(50000.0 + float64(i))
		level := tree.GetOrCreateLevel(price)
		level.TotalVolume = decimal.NewFromFloat(1.0)
		level.OrderCount = 1
	}

	b.ResetTimer()

	for i := 0; i < b.N; i++ {
		tree.GetTopLevels(10)
	}
}
