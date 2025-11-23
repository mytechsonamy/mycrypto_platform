package orderbook

import (
	"sync"

	"github.com/shopspring/decimal"
	"github.com/mytrader/trade-engine/internal/domain"
)

// PriceLevelTree is a balanced AVL tree of price levels
// For buy side: max heap (highest price first)
// For sell side: min heap (lowest price first)
type PriceLevelTree struct {
	Root   *PriceLevelNode
	Levels map[string]*PriceLevelNode // price string -> node (fast lookup)
	Best   *PriceLevelNode            // Cached best price (O(1) access)
	Side   domain.OrderSide
	mu     sync.RWMutex
}

// PriceLevelNode represents a node in the AVL tree
type PriceLevelNode struct {
	Level  *PriceLevel
	Left   *PriceLevelNode
	Right  *PriceLevelNode
	Height int // For AVL tree balancing
}

// NewPriceLevelTree creates a new price level tree
func NewPriceLevelTree(side domain.OrderSide) *PriceLevelTree {
	return &PriceLevelTree{
		Levels: make(map[string]*PriceLevelNode),
		Side:   side,
	}
}

// GetOrCreateLevel gets an existing price level or creates a new one
// Complexity: O(log n) for tree insertion, O(1) for existing level
func (t *PriceLevelTree) GetOrCreateLevel(price decimal.Decimal) *PriceLevel {
	t.mu.Lock()
	defer t.mu.Unlock()

	priceStr := price.String()
	node, exists := t.Levels[priceStr]
	if exists {
		return node.Level
	}

	// Create new price level
	level := &PriceLevel{
		Price:       price,
		Orders:      make([]*domain.Order, 0, 10), // Pre-allocate capacity
		TotalVolume: decimal.Zero,
		OrderCount:  0,
	}

	// Insert into tree
	newNode := &PriceLevelNode{
		Level:  level,
		Height: 1,
	}

	t.Root = t.insert(t.Root, newNode)
	t.Levels[priceStr] = newNode

	// Update best price if needed
	t.updateBest()

	return level
}

// RemoveLevel removes a price level from the tree
// Complexity: O(log n)
func (t *PriceLevelTree) RemoveLevel(price decimal.Decimal) {
	t.mu.Lock()
	defer t.mu.Unlock()

	priceStr := price.String()
	if _, exists := t.Levels[priceStr]; !exists {
		return
	}

	t.Root = t.remove(t.Root, price)
	delete(t.Levels, priceStr)

	// Update best price
	t.updateBest()
}

// GetTopLevels returns top N price levels
// Complexity: O(n) where n is the number of levels requested
func (t *PriceLevelTree) GetTopLevels(n int) []PriceLevelSnapshot {
	t.mu.RLock()
	defer t.mu.RUnlock()

	result := make([]PriceLevelSnapshot, 0, n)
	count := 0

	// In-order traversal (for SELL) or reverse in-order (for BUY)
	var traverse func(*PriceLevelNode)
	traverse = func(node *PriceLevelNode) {
		if node == nil || count >= n {
			return
		}

		if t.Side == domain.OrderSideBuy {
			// Reverse in-order (highest to lowest)
			traverse(node.Right)
			if count < n {
				result = append(result, PriceLevelSnapshot{
					Price:      node.Level.Price.String(),
					Volume:     node.Level.TotalVolume.String(),
					OrderCount: node.Level.OrderCount,
				})
				count++
			}
			traverse(node.Left)
		} else {
			// In-order (lowest to highest)
			traverse(node.Left)
			if count < n {
				result = append(result, PriceLevelSnapshot{
					Price:      node.Level.Price.String(),
					Volume:     node.Level.TotalVolume.String(),
					OrderCount: node.Level.OrderCount,
				})
				count++
			}
			traverse(node.Right)
		}
	}

	traverse(t.Root)
	return result
}

// GetAllLevels returns all price levels
// Complexity: O(n) where n is total number of levels
func (t *PriceLevelTree) GetAllLevels() []PriceLevelSnapshot {
	t.mu.RLock()
	defer t.mu.RUnlock()

	result := make([]PriceLevelSnapshot, 0, len(t.Levels))

	// In-order traversal (for SELL) or reverse in-order (for BUY)
	var traverse func(*PriceLevelNode)
	traverse = func(node *PriceLevelNode) {
		if node == nil {
			return
		}

		if t.Side == domain.OrderSideBuy {
			// Reverse in-order (highest to lowest)
			traverse(node.Right)
			result = append(result, PriceLevelSnapshot{
				Price:      node.Level.Price.String(),
				Volume:     node.Level.TotalVolume.String(),
				OrderCount: node.Level.OrderCount,
			})
			traverse(node.Left)
		} else {
			// In-order (lowest to highest)
			traverse(node.Left)
			result = append(result, PriceLevelSnapshot{
				Price:      node.Level.Price.String(),
				Volume:     node.Level.TotalVolume.String(),
				OrderCount: node.Level.OrderCount,
			})
			traverse(node.Right)
		}
	}

	traverse(t.Root)
	return result
}

// updateBest updates the cached best price
// Complexity: O(log n) worst case, typically O(1) with balanced tree
func (t *PriceLevelTree) updateBest() {
	if t.Root == nil {
		t.Best = nil
		return
	}

	if t.Side == domain.OrderSideBuy {
		// Find rightmost (highest price)
		node := t.Root
		for node.Right != nil {
			node = node.Right
		}
		t.Best = node
	} else {
		// Find leftmost (lowest price)
		node := t.Root
		for node.Left != nil {
			node = node.Left
		}
		t.Best = node
	}
}

// AVL Tree Operations

// insert inserts a new node into the AVL tree
// Complexity: O(log n)
func (t *PriceLevelTree) insert(node, newNode *PriceLevelNode) *PriceLevelNode {
	if node == nil {
		return newNode
	}

	if newNode.Level.Price.LessThan(node.Level.Price) {
		node.Left = t.insert(node.Left, newNode)
	} else if newNode.Level.Price.GreaterThan(node.Level.Price) {
		node.Right = t.insert(node.Right, newNode)
	} else {
		// Equal prices should not happen in practice
		return node
	}

	// Update height
	node.Height = 1 + max(height(node.Left), height(node.Right))

	// Balance the tree
	return t.balance(node)
}

// remove removes a node from the AVL tree
// Complexity: O(log n)
func (t *PriceLevelTree) remove(node *PriceLevelNode, price decimal.Decimal) *PriceLevelNode {
	if node == nil {
		return nil
	}

	if price.LessThan(node.Level.Price) {
		node.Left = t.remove(node.Left, price)
	} else if price.GreaterThan(node.Level.Price) {
		node.Right = t.remove(node.Right, price)
	} else {
		// Node found - remove it
		if node.Left == nil {
			return node.Right
		} else if node.Right == nil {
			return node.Left
		}

		// Node has two children - find inorder successor (smallest in right subtree)
		minRight := t.findMin(node.Right)
		node.Level = minRight.Level
		node.Right = t.remove(node.Right, minRight.Level.Price)
	}

	if node == nil {
		return nil
	}

	// Update height
	node.Height = 1 + max(height(node.Left), height(node.Right))

	// Balance the tree
	return t.balance(node)
}

// balance performs AVL tree balancing
// Complexity: O(1) for rotations
func (t *PriceLevelTree) balance(node *PriceLevelNode) *PriceLevelNode {
	if node == nil {
		return nil
	}

	balanceFactor := height(node.Left) - height(node.Right)

	// Left heavy
	if balanceFactor > 1 {
		if height(node.Left.Left) >= height(node.Left.Right) {
			// Left-Left case
			return t.rotateRight(node)
		} else {
			// Left-Right case
			node.Left = t.rotateLeft(node.Left)
			return t.rotateRight(node)
		}
	}

	// Right heavy
	if balanceFactor < -1 {
		if height(node.Right.Right) >= height(node.Right.Left) {
			// Right-Right case
			return t.rotateLeft(node)
		} else {
			// Right-Left case
			node.Right = t.rotateRight(node.Right)
			return t.rotateLeft(node)
		}
	}

	return node
}

// rotateLeft performs left rotation
// Complexity: O(1)
func (t *PriceLevelTree) rotateLeft(node *PriceLevelNode) *PriceLevelNode {
	newRoot := node.Right
	node.Right = newRoot.Left
	newRoot.Left = node

	// Update heights
	node.Height = 1 + max(height(node.Left), height(node.Right))
	newRoot.Height = 1 + max(height(newRoot.Left), height(newRoot.Right))

	return newRoot
}

// rotateRight performs right rotation
// Complexity: O(1)
func (t *PriceLevelTree) rotateRight(node *PriceLevelNode) *PriceLevelNode {
	newRoot := node.Left
	node.Left = newRoot.Right
	newRoot.Right = node

	// Update heights
	node.Height = 1 + max(height(node.Left), height(node.Right))
	newRoot.Height = 1 + max(height(newRoot.Left), height(newRoot.Right))

	return newRoot
}

// findMin finds the minimum node in a subtree (leftmost)
// Complexity: O(log n)
func (t *PriceLevelTree) findMin(node *PriceLevelNode) *PriceLevelNode {
	for node.Left != nil {
		node = node.Left
	}
	return node
}

// height returns the height of a node
// Complexity: O(1)
func height(node *PriceLevelNode) int {
	if node == nil {
		return 0
	}
	return node.Height
}

// max returns the maximum of two integers
func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}

// GetHeight returns the height of the tree (for testing)
func (t *PriceLevelTree) GetHeight() int {
	t.mu.RLock()
	defer t.mu.RUnlock()
	return height(t.Root)
}

// GetLevelCount returns the number of price levels in the tree
func (t *PriceLevelTree) GetLevelCount() int {
	t.mu.RLock()
	defer t.mu.RUnlock()
	return len(t.Levels)
}

// Verify checks if the tree is a valid AVL tree (for testing)
func (t *PriceLevelTree) Verify() bool {
	t.mu.RLock()
	defer t.mu.RUnlock()
	return t.verifyNode(t.Root)
}

func (t *PriceLevelTree) verifyNode(node *PriceLevelNode) bool {
	if node == nil {
		return true
	}

	// Check AVL balance factor
	balanceFactor := height(node.Left) - height(node.Right)
	if balanceFactor < -1 || balanceFactor > 1 {
		return false
	}

	// Check BST property
	if node.Left != nil && node.Left.Level.Price.GreaterThanOrEqual(node.Level.Price) {
		return false
	}
	if node.Right != nil && node.Right.Level.Price.LessThanOrEqual(node.Level.Price) {
		return false
	}

	// Recursively verify children
	return t.verifyNode(node.Left) && t.verifyNode(node.Right)
}
