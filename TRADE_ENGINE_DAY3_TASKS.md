# Trade Engine Sprint 1 - Day 3 Task Assignments

**Date:** 2025-11-24
**Sprint:** Trade Engine Sprint 1 (Foundation & Infrastructure)
**Day:** 3 of 12
**Tech Lead:** Tech Lead Agent
**Status:** Ready for Execution

---

## Day 3 Overview

**Goal:** Complete testing infrastructure, improve quality, and advance toward matching engine readiness

**Building on Day 2 Success:**
- CI/CD: GitHub Actions pipeline operational
- Monitoring: Prometheus + Grafana with 20+ metrics and 3 dashboards
- Database: Performance monitoring (13 views, 14 functions)
- Backend: Wallet client library (88.6% coverage, circuit breaker)
- API: Order Management API (4 endpoints, validation, metrics)
- Testing: 19 test scenarios, 12/19 passing

**Day 3 Strategic Focus:**

Based on Day 2 completion report and sprint planning analysis:

1. **Quality First:** Address technical debt before advancing
   - Complete missing service/handler tests (from QA report)
   - Increase test coverage from 50.4% to >80%
   - Fix integration test gaps

2. **Matching Engine Preparation:** Lay foundation for Week 2
   - Implement Order Book data structure
   - Create matching algorithm skeleton
   - Test order book operations

3. **Production Readiness:** Enhance robustness
   - End-to-end integration testing
   - Performance benchmarking
   - Error scenario coverage

**Total Story Points:** 4.5 points (from Sprint 1 total of 38)
**Total Estimated Hours:** 18 hours
**Target Completion:** End of Day 3 (6 PM)

**Critical Path:** TASK-BACKEND-004 (tests) → TASK-BACKEND-005 (order book) → TASK-QA-003 (integration)

---

## Sprint 1 Progress Tracking

| Metric | Day 2 | Day 3 Target | Cumulative |
|--------|-------|--------------|------------|
| Story Points | 8.5 | 4.5 | 13.0 / 38 (34%) |
| Days Elapsed | 2 | 3 | 3 / 12 (25%) |
| Phase Progress | Foundation + API | + Order Book | Week 1: 65% |
| Test Coverage | 50.4% | >80% | Quality gate achieved |
| Services Running | 6 | 6 | Infrastructure stable |

**Status Analysis:** AHEAD OF SCHEDULE
- 34% story points with 25% time = **136% velocity**
- Using surplus to invest in quality and future readiness
- Week 1 goal (infrastructure + order mgmt foundation): On track

---

## Task Assignment: TASK-BACKEND-004

**Agent:** Backend Agent
**Priority:** P0 (Critical - Technical debt reduction)
**Story:** TE-201 (Order Creation API - Part 2: Testing)
**Sprint:** Trade Engine Sprint 1
**Estimated Hours:** 5 hours
**Story Points:** 1.5
**Deadline:** 2025-11-24 2:00 PM
**Dependencies:** TASK-BACKEND-002 (Complete ✅)

### Description

Complete missing unit tests for service and handler layers identified in QA report. This is essential technical debt that must be resolved before advancing to matching engine. Focus on achieving >80% coverage across all layers with comprehensive test scenarios.

**Scope for Day 3:**
- Service layer unit tests (OrderService)
- Handler layer unit tests (OrderHandler)
- Repository layer unit tests (OrderRepository)
- Edge case coverage
- Error path testing
- Mock-based isolation testing

### Acceptance Criteria

#### Service Layer Tests
- [ ] Test file created at `/internal/service/order_service_test.go`
- [ ] PlaceOrder happy path test (valid order creation)
- [ ] PlaceOrder validation error tests (invalid quantity, price, symbol)
- [ ] PlaceOrder wallet integration tests (balance check, reservation)
- [ ] PlaceOrder error scenarios (insufficient balance, wallet service down)
- [ ] Idempotency test (duplicate client_order_id)
- [ ] Service test coverage >80%

#### Handler Layer Tests
- [ ] Test file created at `/internal/server/order_handler_test.go`
- [ ] PlaceOrder request parsing tests
- [ ] PlaceOrder authentication tests (missing auth, invalid token)
- [ ] PlaceOrder response format tests
- [ ] PlaceOrder error response tests (validation errors, server errors)
- [ ] GetOrder handler tests (by ID, not found, unauthorized)
- [ ] ListOrders handler tests (filters, pagination)
- [ ] CancelOrder handler tests (success, not found, already filled)
- [ ] Handler test coverage >80%

#### Repository Layer Tests
- [ ] Test file created at `/internal/repository/postgres/order_repository_test.go`
- [ ] Create order test (success, duplicate client_order_id)
- [ ] GetByID test (found, not found)
- [ ] GetByUserID test (filters, pagination)
- [ ] Update order test (status change, filled quantity update)
- [ ] Cancel order test (success, invalid status)
- [ ] GetActiveOrders test (symbol filtering)
- [ ] Repository test coverage >80%

#### Integration Testing
- [ ] All tests use proper mocking (wallet client, database)
- [ ] All tests are isolated (no shared state)
- [ ] All tests are deterministic (no flaky tests)
- [ ] Test execution time < 2 seconds per test file

### Technical Specifications

#### Service Layer Test Example

```go
package service_test

import (
    "context"
    "testing"
    "time"

    "github.com/google/uuid"
    "github.com/shopspring/decimal"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/mock"
    "github.com/stretchr/testify/require"

    "github.com/mytrader/trade-engine/internal/domain"
    "github.com/mytrader/trade-engine/internal/repository"
    "github.com/mytrader/trade-engine/internal/service"
    "github.com/mytrader/trade-engine/pkg/clients/wallet"
)

// Mock implementations
type MockOrderRepository struct {
    mock.Mock
}

func (m *MockOrderRepository) Create(ctx context.Context, order *domain.Order) error {
    args := m.Called(ctx, order)
    return args.Error(0)
}

func (m *MockOrderRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.Order, error) {
    args := m.Called(ctx, id)
    if args.Get(0) == nil {
        return nil, args.Error(1)
    }
    return args.Get(0).(*domain.Order), args.Error(1)
}

// Additional mock methods...

type MockWalletClient struct {
    mock.Mock
}

func (m *MockWalletClient) ReserveBalance(ctx context.Context, req *wallet.ReserveBalanceRequest) (*wallet.ReserveBalanceResponse, error) {
    args := m.Called(ctx, req)
    if args.Get(0) == nil {
        return nil, args.Error(1)
    }
    return args.Get(0).(*wallet.ReserveBalanceResponse), args.Error(1)
}

// Additional mock methods...

func TestOrderService_PlaceOrder_Success(t *testing.T) {
    // Setup
    mockRepo := new(MockOrderRepository)
    mockWallet := new(MockWalletClient)
    svc := service.NewOrderService(mockRepo, mockWallet, nil)

    ctx := context.Background()
    userID := uuid.New()
    price := decimal.NewFromFloat(50000.0)
    quantity := decimal.NewFromFloat(1.5)

    order := &domain.Order{
        UserID:   userID,
        Symbol:   "BTC/USDT",
        Side:     domain.OrderSideBuy,
        Type:     domain.OrderTypeLimit,
        Quantity: quantity,
        Price:    &price,
    }

    // Mock wallet reservation success
    mockWallet.On("ReserveBalance", ctx, mock.MatchedBy(func(req *wallet.ReserveBalanceRequest) bool {
        return req.UserID == userID && req.Asset == "USDT"
    })).Return(&wallet.ReserveBalanceResponse{
        ReservationID:    uuid.New(),
        Success:          true,
        AvailableBalance: decimal.NewFromFloat(100000),
        ReservedBalance:  decimal.NewFromFloat(75000),
    }, nil)

    // Mock repository create success
    mockRepo.On("Create", ctx, mock.AnythingOfType("*domain.Order")).Return(nil)

    // Execute
    createdOrder, err := svc.PlaceOrder(ctx, order)

    // Assert
    require.NoError(t, err)
    assert.NotNil(t, createdOrder)
    assert.NotEqual(t, uuid.Nil, createdOrder.ID)
    assert.Equal(t, domain.OrderStatusPending, createdOrder.Status)
    assert.Equal(t, quantity, createdOrder.Quantity)
    assert.Equal(t, decimal.Zero, createdOrder.FilledQuantity)

    // Verify mocks were called
    mockWallet.AssertExpectations(t)
    mockRepo.AssertExpectations(t)
}

func TestOrderService_PlaceOrder_InsufficientBalance(t *testing.T) {
    // Setup
    mockRepo := new(MockOrderRepository)
    mockWallet := new(MockWalletClient)
    svc := service.NewOrderService(mockRepo, mockWallet, nil)

    ctx := context.Background()
    userID := uuid.New()
    price := decimal.NewFromFloat(50000.0)
    quantity := decimal.NewFromFloat(1.5)

    order := &domain.Order{
        UserID:   userID,
        Symbol:   "BTC/USDT",
        Side:     domain.OrderSideBuy,
        Type:     domain.OrderTypeLimit,
        Quantity: quantity,
        Price:    &price,
    }

    // Mock wallet reservation failure (insufficient balance)
    mockWallet.On("ReserveBalance", ctx, mock.Anything).Return(
        nil,
        wallet.ErrInsufficientBalance,
    )

    // Execute
    createdOrder, err := svc.PlaceOrder(ctx, order)

    // Assert
    assert.Error(t, err)
    assert.Nil(t, createdOrder)
    assert.Equal(t, service.ErrInsufficientBalance, err)

    // Repository create should NOT be called
    mockRepo.AssertNotCalled(t, "Create")
    mockWallet.AssertExpectations(t)
}

func TestOrderService_PlaceOrder_InvalidQuantity(t *testing.T) {
    // Setup
    mockRepo := new(MockOrderRepository)
    mockWallet := new(MockWalletClient)
    svc := service.NewOrderService(mockRepo, mockWallet, nil)

    ctx := context.Background()
    userID := uuid.New()
    price := decimal.NewFromFloat(50000.0)

    testCases := []struct {
        name     string
        quantity decimal.Decimal
        wantErr  error
    }{
        {
            name:     "Zero quantity",
            quantity: decimal.Zero,
            wantErr:  domain.ErrInvalidQuantity,
        },
        {
            name:     "Negative quantity",
            quantity: decimal.NewFromFloat(-1.5),
            wantErr:  domain.ErrInvalidQuantity,
        },
    }

    for _, tc := range testCases {
        t.Run(tc.name, func(t *testing.T) {
            order := &domain.Order{
                UserID:   userID,
                Symbol:   "BTC/USDT",
                Side:     domain.OrderSideBuy,
                Type:     domain.OrderTypeLimit,
                Quantity: tc.quantity,
                Price:    &price,
            }

            // Execute
            createdOrder, err := svc.PlaceOrder(ctx, order)

            // Assert
            assert.Error(t, err)
            assert.Nil(t, createdOrder)
            assert.Equal(t, tc.wantErr, err)

            // No external calls should be made
            mockWallet.AssertNotCalled(t, "ReserveBalance")
            mockRepo.AssertNotCalled(t, "Create")
        })
    }
}

func TestOrderService_PlaceOrder_WalletServiceDown(t *testing.T) {
    // Setup
    mockRepo := new(MockOrderRepository)
    mockWallet := new(MockWalletClient)
    svc := service.NewOrderService(mockRepo, mockWallet, nil)

    ctx := context.Background()
    userID := uuid.New()
    price := decimal.NewFromFloat(50000.0)
    quantity := decimal.NewFromFloat(1.5)

    order := &domain.Order{
        UserID:   userID,
        Symbol:   "BTC/USDT",
        Side:     domain.OrderSideBuy,
        Type:     domain.OrderTypeLimit,
        Quantity: quantity,
        Price:    &price,
    }

    // Mock wallet service unavailable
    mockWallet.On("ReserveBalance", ctx, mock.Anything).Return(
        nil,
        wallet.ErrWalletServiceDown,
    )

    // Execute
    createdOrder, err := svc.PlaceOrder(ctx, order)

    // Assert
    assert.Error(t, err)
    assert.Nil(t, createdOrder)
    assert.Equal(t, service.ErrWalletServiceUnavailable, err)

    // Repository create should NOT be called
    mockRepo.AssertNotCalled(t, "Create")
    mockWallet.AssertExpectations(t)
}

func TestOrderService_PlaceOrder_Idempotency(t *testing.T) {
    // Setup
    mockRepo := new(MockOrderRepository)
    mockWallet := new(MockWalletClient)
    svc := service.NewOrderService(mockRepo, mockWallet, nil)

    ctx := context.Background()
    userID := uuid.New()
    price := decimal.NewFromFloat(50000.0)
    quantity := decimal.NewFromFloat(1.5)
    clientOrderID := "client-order-123"

    order := &domain.Order{
        UserID:        userID,
        Symbol:        "BTC/USDT",
        Side:          domain.OrderSideBuy,
        Type:          domain.OrderTypeLimit,
        Quantity:      quantity,
        Price:         &price,
        ClientOrderID: &clientOrderID,
    }

    existingOrderID := uuid.New()

    // Mock repository returns existing order with same client_order_id
    mockRepo.On("GetByClientOrderID", ctx, userID, clientOrderID).Return(&domain.Order{
        ID:            existingOrderID,
        UserID:        userID,
        Symbol:        "BTC/USDT",
        Side:          domain.OrderSideBuy,
        Type:          domain.OrderTypeLimit,
        Quantity:      quantity,
        Price:         &price,
        ClientOrderID: &clientOrderID,
        Status:        domain.OrderStatusOpen,
    }, nil)

    // Execute
    createdOrder, err := svc.PlaceOrder(ctx, order)

    // Assert - should return existing order, not create new one
    require.NoError(t, err)
    assert.NotNil(t, createdOrder)
    assert.Equal(t, existingOrderID, createdOrder.ID)

    // Create should NOT be called (idempotency)
    mockRepo.AssertNotCalled(t, "Create")
    mockWallet.AssertNotCalled(t, "ReserveBalance")
}
```

#### Handler Layer Test Example

```go
package httpapi_test

import (
    "bytes"
    "encoding/json"
    "net/http"
    "net/http/httptest"
    "testing"

    "github.com/google/uuid"
    "github.com/shopspring/decimal"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/mock"
    "github.com/stretchr/testify/require"

    "github.com/mytrader/trade-engine/internal/domain"
    "github.com/mytrader/trade-engine/internal/server"
    "github.com/mytrader/trade-engine/internal/service"
)

type MockOrderService struct {
    mock.Mock
}

func (m *MockOrderService) PlaceOrder(ctx context.Context, order *domain.Order) (*domain.Order, error) {
    args := m.Called(ctx, order)
    if args.Get(0) == nil {
        return nil, args.Error(1)
    }
    return args.Get(0).(*domain.Order), args.Error(1)
}

// Additional mock methods...

func TestOrderHandler_PlaceOrder_Success(t *testing.T) {
    // Setup
    mockService := new(MockOrderService)
    handler := server.NewOrderHandler(mockService, nil)

    userID := uuid.New()
    orderID := uuid.New()
    price := decimal.NewFromFloat(50000.0)
    quantity := decimal.NewFromFloat(1.5)

    reqBody := server.PlaceOrderRequest{
        Symbol:      "BTC/USDT",
        Side:        "BUY",
        Type:        "LIMIT",
        Quantity:    "1.5",
        Price:       stringPtr("50000.00"),
        TimeInForce: "GTC",
    }

    // Mock service response
    mockService.On("PlaceOrder", mock.Anything, mock.AnythingOfType("*domain.Order")).Return(&domain.Order{
        ID:             orderID,
        UserID:         userID,
        Symbol:         "BTC/USDT",
        Side:           domain.OrderSideBuy,
        Type:           domain.OrderTypeLimit,
        Status:         domain.OrderStatusPending,
        Quantity:       quantity,
        FilledQuantity: decimal.Zero,
        Price:          &price,
    }, nil)

    // Create request
    body, _ := json.Marshal(reqBody)
    req := httptest.NewRequest("POST", "/api/v1/orders", bytes.NewReader(body))
    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("X-User-ID", userID.String())

    // Execute
    w := httptest.NewRecorder()
    handler.PlaceOrder(w, req)

    // Assert
    assert.Equal(t, http.StatusCreated, w.Code)

    var response server.OrderResponse
    err := json.Unmarshal(w.Body.Bytes(), &response)
    require.NoError(t, err)

    assert.Equal(t, orderID.String(), response.ID)
    assert.Equal(t, "BTC/USDT", response.Symbol)
    assert.Equal(t, "BUY", response.Side)
    assert.Equal(t, "LIMIT", response.Type)
    assert.Equal(t, "PENDING", response.Status)
    assert.Equal(t, "1.5", response.Quantity)
    assert.Equal(t, "0", response.FilledQuantity)

    mockService.AssertExpectations(t)
}

func TestOrderHandler_PlaceOrder_MissingAuth(t *testing.T) {
    // Setup
    mockService := new(MockOrderService)
    handler := server.NewOrderHandler(mockService, nil)

    reqBody := server.PlaceOrderRequest{
        Symbol:   "BTC/USDT",
        Side:     "BUY",
        Type:     "LIMIT",
        Quantity: "1.5",
        Price:    stringPtr("50000.00"),
    }

    // Create request WITHOUT X-User-ID header
    body, _ := json.Marshal(reqBody)
    req := httptest.NewRequest("POST", "/api/v1/orders", bytes.NewReader(body))
    req.Header.Set("Content-Type", "application/json")

    // Execute
    w := httptest.NewRecorder()
    handler.PlaceOrder(w, req)

    // Assert
    assert.Equal(t, http.StatusUnauthorized, w.Code)

    var errResp server.ErrorResponse
    err := json.Unmarshal(w.Body.Bytes(), &errResp)
    require.NoError(t, err)

    assert.Contains(t, errResp.Error, "Unauthorized")

    // Service should NOT be called
    mockService.AssertNotCalled(t, "PlaceOrder")
}

func TestOrderHandler_PlaceOrder_InvalidRequestBody(t *testing.T) {
    // Setup
    mockService := new(MockOrderService)
    handler := server.NewOrderHandler(mockService, nil)

    userID := uuid.New()

    // Create request with invalid JSON
    req := httptest.NewRequest("POST", "/api/v1/orders", bytes.NewReader([]byte("invalid json")))
    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("X-User-ID", userID.String())

    // Execute
    w := httptest.NewRecorder()
    handler.PlaceOrder(w, req)

    // Assert
    assert.Equal(t, http.StatusBadRequest, w.Code)

    var errResp server.ErrorResponse
    err := json.Unmarshal(w.Body.Bytes(), &errResp)
    require.NoError(t, err)

    assert.Contains(t, errResp.Error, "Invalid request body")

    // Service should NOT be called
    mockService.AssertNotCalled(t, "PlaceOrder")
}

func TestOrderHandler_PlaceOrder_ValidationErrors(t *testing.T) {
    // Setup
    mockService := new(MockOrderService)
    handler := server.NewOrderHandler(mockService, nil)

    userID := uuid.New()

    testCases := []struct {
        name        string
        requestBody server.PlaceOrderRequest
        wantErrMsg  string
    }{
        {
            name: "Missing symbol",
            requestBody: server.PlaceOrderRequest{
                Side:     "BUY",
                Type:     "LIMIT",
                Quantity: "1.5",
                Price:    stringPtr("50000.00"),
            },
            wantErrMsg: "symbol",
        },
        {
            name: "Invalid side",
            requestBody: server.PlaceOrderRequest{
                Symbol:   "BTC/USDT",
                Side:     "INVALID",
                Type:     "LIMIT",
                Quantity: "1.5",
                Price:    stringPtr("50000.00"),
            },
            wantErrMsg: "side",
        },
        {
            name: "Missing price for LIMIT order",
            requestBody: server.PlaceOrderRequest{
                Symbol:   "BTC/USDT",
                Side:     "BUY",
                Type:     "LIMIT",
                Quantity: "1.5",
            },
            wantErrMsg: "price",
        },
    }

    for _, tc := range testCases {
        t.Run(tc.name, func(t *testing.T) {
            body, _ := json.Marshal(tc.requestBody)
            req := httptest.NewRequest("POST", "/api/v1/orders", bytes.NewReader(body))
            req.Header.Set("Content-Type", "application/json")
            req.Header.Set("X-User-ID", userID.String())

            w := httptest.NewRecorder()
            handler.PlaceOrder(w, req)

            assert.Equal(t, http.StatusBadRequest, w.Code)

            var errResp server.ErrorResponse
            err := json.Unmarshal(w.Body.Bytes(), &errResp)
            require.NoError(t, err)

            assert.Contains(t, errResp.Error, tc.wantErrMsg)

            // Service should NOT be called
            mockService.AssertNotCalled(t, "PlaceOrder")
        })
    }
}

func stringPtr(s string) *string {
    return &s
}
```

### Handoff Notes

**From:** TASK-BACKEND-002 (Order API implementation), QA report (test gaps identified)
**Context:** Day 2 achieved 50.4% domain test coverage. Service and handler layers have no tests yet, creating technical debt and quality risk.

**Handoff To:** QA Agent (TASK-QA-003 - integration testing)
**What to provide:**
1. Test coverage report showing >80% for all layers
2. Test execution results (all passing)
3. Mock implementations documentation
4. Test patterns guide for future development
5. Coverage HTML report

### Verification Commands

```bash
# Navigate to trade-engine directory
cd /Users/musti/Documents/Projects/MyCrypto_Platform/services/trade-engine

# Run all unit tests with coverage
go test -v -cover ./internal/service/... ./internal/server/... ./internal/repository/...

# Generate coverage report
go test -coverprofile=coverage.out ./internal/...
go tool cover -html=coverage.out -o coverage.html

# Check coverage percentage
go tool cover -func=coverage.out | grep total

# Run specific test suites
go test -v -run TestOrderService_ ./internal/service/...
go test -v -run TestOrderHandler_ ./internal/server/...
go test -v -run TestOrderRepository_ ./internal/repository/...

# Run tests with race detector
go test -v -race ./internal/...

# Run tests with timeout
go test -v -timeout 30s ./internal/...

# Generate test report
go test -v -json ./internal/... > test-results.json
```

### Definition of Done
- [ ] Service layer tests complete (coverage >80%)
- [ ] Handler layer tests complete (coverage >80%)
- [ ] Repository layer tests complete (coverage >80%)
- [ ] All tests passing (100%)
- [ ] No race conditions detected
- [ ] Test execution time < 10 seconds total
- [ ] Coverage report generated and reviewed
- [ ] Code reviewed by Tech Lead
- [ ] Documentation updated with test patterns

---

## Task Assignment: TASK-BACKEND-005

**Agent:** Backend Agent
**Priority:** P0 (Critical - Matching engine foundation)
**Story:** TE-301 (In-Memory Order Book - Part 1)
**Sprint:** Trade Engine Sprint 1
**Estimated Hours:** 6 hours
**Story Points:** 2.0
**Deadline:** 2025-11-24 5:00 PM
**Dependencies:** TASK-BACKEND-004 (parallel execution acceptable)

### Description

Implement the in-memory Order Book data structure that will power the matching engine. This is the foundation for Week 2's matching algorithm implementation. Focus on performance-optimized data structures with proper concurrency handling.

**Scope for Day 3:**
- Order Book data structure (sorted price levels)
- Add/Remove/Update order operations
- Best bid/ask tracking
- Depth calculation
- Unit tests for all operations
- Performance benchmarks

### Acceptance Criteria

#### Data Structure Implementation
- [ ] OrderBook struct created at `/internal/matching/orderbook.go`
- [ ] PriceLevel struct with FIFO order queue
- [ ] Sorted data structure for price levels (heap or RB-tree)
- [ ] Separate bid and ask sides
- [ ] Thread-safe operations (mutex or channels)
- [ ] Memory-efficient design

#### Core Operations
- [ ] AddOrder(order) - O(log n) complexity
- [ ] RemoveOrder(orderID) - O(log n) complexity
- [ ] UpdateOrder(orderID, newQuantity) - O(log n) complexity
- [ ] GetBestBid() - O(1) complexity
- [ ] GetBestAsk() - O(1) complexity
- [ ] GetDepth(levels) - O(n) complexity for n levels
- [ ] GetOrdersAtPrice(price) - O(1) complexity

#### Performance Targets
- [ ] Add order: < 1ms
- [ ] Remove order: < 1ms
- [ ] Get best bid/ask: < 100μs
- [ ] Support 10,000+ orders per symbol
- [ ] Concurrent access: 1,000 ops/sec

#### Testing
- [ ] Unit tests for all operations
- [ ] Edge case tests (empty book, single order, duplicate prices)
- [ ] Concurrency tests (race detector passing)
- [ ] Performance benchmarks (Go benchmark tests)
- [ ] Test coverage >80%

### Technical Specifications

#### Order Book Data Structure

```go
package matching

import (
    "sync"
    "time"

    "github.com/google/uuid"
    "github.com/shopspring/decimal"
    "github.com/mytrader/trade-engine/internal/domain"
)

// OrderBook represents an in-memory order book for a trading pair
type OrderBook struct {
    Symbol    string
    Bids      *PriceLevelTree  // Max heap (highest price first)
    Asks      *PriceLevelTree  // Min heap (lowest price first)
    OrderMap  map[uuid.UUID]*OrderBookEntry  // Fast O(1) lookup by order ID
    mu        sync.RWMutex
    UpdatedAt time.Time
}

// OrderBookEntry wraps an order with its location in the book
type OrderBookEntry struct {
    Order      *domain.Order
    PriceLevel *PriceLevel
}

// PriceLevel represents all orders at a specific price point
type PriceLevel struct {
    Price       decimal.Decimal
    Orders      []*domain.Order  // FIFO queue (time priority)
    TotalVolume decimal.Decimal  // Sum of all order quantities
    OrderCount  int
}

// PriceLevelTree is a balanced tree (or heap) of price levels
type PriceLevelTree struct {
    Root      *PriceLevelNode
    Levels    map[string]*PriceLevelNode  // price string -> node (fast lookup)
    Best      *PriceLevelNode             // Cached best price
    Side      domain.OrderSide
    mu        sync.RWMutex
}

type PriceLevelNode struct {
    Level  *PriceLevel
    Left   *PriceLevelNode
    Right  *PriceLevelNode
    Height int  // For AVL tree balancing
}

// NewOrderBook creates a new order book for a symbol
func NewOrderBook(symbol string) *OrderBook {
    return &OrderBook{
        Symbol:   symbol,
        Bids:     NewPriceLevelTree(domain.OrderSideBuy),
        Asks:     NewPriceLevelTree(domain.OrderSideSell),
        OrderMap: make(map[uuid.UUID]*OrderBookEntry),
    }
}

// AddOrder adds an order to the order book
func (ob *OrderBook) AddOrder(order *domain.Order) error {
    ob.mu.Lock()
    defer ob.mu.Unlock()

    if order.Symbol != ob.Symbol {
        return ErrSymbolMismatch
    }

    if order.Price == nil {
        return ErrMarketOrderNotSupported
    }

    // Get or create price level
    var tree *PriceLevelTree
    if order.Side == domain.OrderSideBuy {
        tree = ob.Bids
    } else {
        tree = ob.Asks
    }

    priceLevel := tree.GetOrCreateLevel(*order.Price)

    // Add order to price level (FIFO - append to end)
    priceLevel.Orders = append(priceLevel.Orders, order)
    priceLevel.TotalVolume = priceLevel.TotalVolume.Add(order.RemainingQuantity())
    priceLevel.OrderCount++

    // Add to order map for fast lookup
    ob.OrderMap[order.ID] = &OrderBookEntry{
        Order:      order,
        PriceLevel: priceLevel,
    }

    ob.UpdatedAt = time.Now()

    return nil
}

// RemoveOrder removes an order from the order book
func (ob *OrderBook) RemoveOrder(orderID uuid.UUID) error {
    ob.mu.Lock()
    defer ob.mu.Unlock()

    entry, exists := ob.OrderMap[orderID]
    if !exists {
        return ErrOrderNotFound
    }

    priceLevel := entry.PriceLevel
    order := entry.Order

    // Remove order from price level
    for i, o := range priceLevel.Orders {
        if o.ID == orderID {
            // Remove from slice (preserve FIFO order)
            priceLevel.Orders = append(priceLevel.Orders[:i], priceLevel.Orders[i+1:]...)
            break
        }
    }

    priceLevel.TotalVolume = priceLevel.TotalVolume.Sub(order.RemainingQuantity())
    priceLevel.OrderCount--

    // If price level is empty, remove it from tree
    if priceLevel.OrderCount == 0 {
        var tree *PriceLevelTree
        if order.Side == domain.OrderSideBuy {
            tree = ob.Bids
        } else {
            tree = ob.Asks
        }
        tree.RemoveLevel(priceLevel.Price)
    }

    // Remove from order map
    delete(ob.OrderMap, orderID)

    ob.UpdatedAt = time.Now()

    return nil
}

// UpdateOrder updates an order's quantity (partial fill)
func (ob *OrderBook) UpdateOrder(orderID uuid.UUID, filledQty decimal.Decimal) error {
    ob.mu.Lock()
    defer ob.mu.Unlock()

    entry, exists := ob.OrderMap[orderID]
    if !exists {
        return ErrOrderNotFound
    }

    order := entry.Order
    priceLevel := entry.PriceLevel

    // Update volumes
    oldRemaining := order.RemainingQuantity()
    order.FilledQuantity = order.FilledQuantity.Add(filledQty)
    newRemaining := order.RemainingQuantity()

    volumeChange := oldRemaining.Sub(newRemaining)
    priceLevel.TotalVolume = priceLevel.TotalVolume.Sub(volumeChange)

    // If fully filled, remove from book
    if order.IsFilled() {
        return ob.RemoveOrder(orderID)
    }

    ob.UpdatedAt = time.Now()

    return nil
}

// GetBestBid returns the highest bid price and total volume
func (ob *OrderBook) GetBestBid() (*PriceLevel, error) {
    ob.mu.RLock()
    defer ob.mu.RUnlock()

    if ob.Bids.Best == nil {
        return nil, ErrEmptyOrderBook
    }

    return ob.Bids.Best.Level, nil
}

// GetBestAsk returns the lowest ask price and total volume
func (ob *OrderBook) GetBestAsk() (*PriceLevel, error) {
    ob.mu.RLock()
    defer ob.mu.RUnlock()

    if ob.Asks.Best == nil {
        return nil, ErrEmptyOrderBook
    }

    return ob.Asks.Best.Level, nil
}

// GetDepth returns order book depth up to N levels
func (ob *OrderBook) GetDepth(levels int) *OrderBookDepth {
    ob.mu.RLock()
    defer ob.mu.RUnlock()

    depth := &OrderBookDepth{
        Symbol:    ob.Symbol,
        Timestamp: time.Now(),
        Bids:      ob.Bids.GetTopLevels(levels),
        Asks:      ob.Asks.GetTopLevels(levels),
    }

    return depth
}

// GetSpread returns the difference between best ask and best bid
func (ob *OrderBook) GetSpread() (decimal.Decimal, error) {
    bestBid, err := ob.GetBestBid()
    if err != nil {
        return decimal.Zero, err
    }

    bestAsk, err := ob.GetBestAsk()
    if err != nil {
        return decimal.Zero, err
    }

    return bestAsk.Price.Sub(bestBid.Price), nil
}

// OrderBookDepth represents order book depth snapshot
type OrderBookDepth struct {
    Symbol    string
    Timestamp time.Time
    Bids      []PriceLevelSnapshot  // Sorted: highest to lowest
    Asks      []PriceLevelSnapshot  // Sorted: lowest to highest
}

type PriceLevelSnapshot struct {
    Price       string  `json:"price"`
    Volume      string  `json:"volume"`
    OrderCount  int     `json:"order_count"`
}

// Errors
var (
    ErrSymbolMismatch          = errors.New("order symbol does not match order book")
    ErrMarketOrderNotSupported = errors.New("market orders cannot be added to order book")
    ErrOrderNotFound           = errors.New("order not found in order book")
    ErrEmptyOrderBook          = errors.New("order book is empty")
)
```

#### Price Level Tree Implementation (AVL Tree for performance)

```go
package matching

import (
    "github.com/shopspring/decimal"
    "github.com/mytrader/trade-engine/internal/domain"
)

// NewPriceLevelTree creates a new price level tree
func NewPriceLevelTree(side domain.OrderSide) *PriceLevelTree {
    return &PriceLevelTree{
        Levels: make(map[string]*PriceLevelNode),
        Side:   side,
    }
}

// GetOrCreateLevel gets an existing price level or creates a new one
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
        Orders:      make([]*domain.Order, 0, 10),
        TotalVolume: decimal.Zero,
        OrderCount:  0,
    }

    // Insert into tree
    node = &PriceLevelNode{
        Level:  level,
        Height: 1,
    }

    t.Root = t.insert(t.Root, node)
    t.Levels[priceStr] = node

    // Update best price if needed
    t.updateBest()

    return level
}

// RemoveLevel removes a price level from the tree
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

// updateBest updates the cached best price
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

// AVL tree operations (insert, remove, rotate, balance)
// ... (implementation details for AVL tree balancing)

func (t *PriceLevelTree) insert(node, newNode *PriceLevelNode) *PriceLevelNode {
    if node == nil {
        return newNode
    }

    if newNode.Level.Price.LessThan(node.Level.Price) {
        node.Left = t.insert(node.Left, newNode)
    } else {
        node.Right = t.insert(node.Right, newNode)
    }

    // Update height and balance
    node.Height = 1 + max(height(node.Left), height(node.Right))
    return t.balance(node)
}

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

        // Node has two children - find inorder successor
        minRight := t.findMin(node.Right)
        node.Level = minRight.Level
        node.Right = t.remove(node.Right, minRight.Level.Price)
    }

    if node == nil {
        return nil
    }

    // Update height and balance
    node.Height = 1 + max(height(node.Left), height(node.Right))
    return t.balance(node)
}

func (t *PriceLevelTree) balance(node *PriceLevelNode) *PriceLevelNode {
    balanceFactor := height(node.Left) - height(node.Right)

    // Left heavy
    if balanceFactor > 1 {
        if height(node.Left.Left) >= height(node.Left.Right) {
            return t.rotateRight(node)
        } else {
            node.Left = t.rotateLeft(node.Left)
            return t.rotateRight(node)
        }
    }

    // Right heavy
    if balanceFactor < -1 {
        if height(node.Right.Right) >= height(node.Right.Left) {
            return t.rotateLeft(node)
        } else {
            node.Right = t.rotateRight(node.Right)
            return t.rotateLeft(node)
        }
    }

    return node
}

func (t *PriceLevelTree) rotateLeft(node *PriceLevelNode) *PriceLevelNode {
    newRoot := node.Right
    node.Right = newRoot.Left
    newRoot.Left = node

    node.Height = 1 + max(height(node.Left), height(node.Right))
    newRoot.Height = 1 + max(height(newRoot.Left), height(newRoot.Right))

    return newRoot
}

func (t *PriceLevelTree) rotateRight(node *PriceLevelNode) *PriceLevelNode {
    newRoot := node.Left
    node.Left = newRoot.Right
    newRoot.Right = node

    node.Height = 1 + max(height(node.Left), height(node.Right))
    newRoot.Height = 1 + max(height(newRoot.Left), height(newRoot.Right))

    return newRoot
}

func (t *PriceLevelTree) findMin(node *PriceLevelNode) *PriceLevelNode {
    for node.Left != nil {
        node = node.Left
    }
    return node
}

func height(node *PriceLevelNode) int {
    if node == nil {
        return 0
    }
    return node.Height
}

func max(a, b int) int {
    if a > b {
        return a
    }
    return b
}
```

#### Unit Tests

```go
package matching_test

import (
    "testing"
    "time"

    "github.com/google/uuid"
    "github.com/shopspring/decimal"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"

    "github.com/mytrader/trade-engine/internal/domain"
    "github.com/mytrader/trade-engine/internal/matching"
)

func TestOrderBook_AddOrder_Success(t *testing.T) {
    ob := matching.NewOrderBook("BTC/USDT")

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
    }

    err := ob.AddOrder(order)
    require.NoError(t, err)

    // Verify order was added
    bestBid, err := ob.GetBestBid()
    require.NoError(t, err)
    assert.Equal(t, price, bestBid.Price)
    assert.Equal(t, 1, bestBid.OrderCount)
    assert.Equal(t, order.Quantity, bestBid.TotalVolume)
}

func TestOrderBook_AddMultipleOrders_PricePriority(t *testing.T) {
    ob := matching.NewOrderBook("BTC/USDT")

    orders := []*domain.Order{
        createOrder("BTC/USDT", domain.OrderSideBuy, 50000.0, 1.0),
        createOrder("BTC/USDT", domain.OrderSideBuy, 50100.0, 1.5),  // Higher price
        createOrder("BTC/USDT", domain.OrderSideBuy, 49900.0, 2.0),  // Lower price
    }

    for _, order := range orders {
        err := ob.AddOrder(order)
        require.NoError(t, err)
    }

    // Best bid should be highest price (50100.0)
    bestBid, err := ob.GetBestBid()
    require.NoError(t, err)
    assert.Equal(t, "50100", bestBid.Price.String())
}

func TestOrderBook_AddMultipleOrders_TimePriority(t *testing.T) {
    ob := matching.NewOrderBook("BTC/USDT")

    price := decimal.NewFromFloat(50000.0)

    order1 := createOrderWithID(uuid.New(), "BTC/USDT", domain.OrderSideBuy, price, 1.0)
    order2 := createOrderWithID(uuid.New(), "BTC/USDT", domain.OrderSideBuy, price, 1.5)
    order3 := createOrderWithID(uuid.New(), "BTC/USDT", domain.OrderSideBuy, price, 2.0)

    time.Sleep(1 * time.Millisecond)  // Ensure different timestamps

    ob.AddOrder(order1)
    ob.AddOrder(order2)
    ob.AddOrder(order3)

    // Get price level
    priceLevel := ob.Bids.GetOrCreateLevel(price)

    // Orders should be in FIFO order
    assert.Equal(t, 3, len(priceLevel.Orders))
    assert.Equal(t, order1.ID, priceLevel.Orders[0].ID)
    assert.Equal(t, order2.ID, priceLevel.Orders[1].ID)
    assert.Equal(t, order3.ID, priceLevel.Orders[2].ID)
}

func TestOrderBook_RemoveOrder_Success(t *testing.T) {
    ob := matching.NewOrderBook("BTC/USDT")

    order := createOrder("BTC/USDT", domain.OrderSideBuy, 50000.0, 1.5)
    ob.AddOrder(order)

    err := ob.RemoveOrder(order.ID)
    require.NoError(t, err)

    // Order book should be empty
    _, err = ob.GetBestBid()
    assert.Error(t, err)
    assert.Equal(t, matching.ErrEmptyOrderBook, err)
}

func TestOrderBook_UpdateOrder_PartialFill(t *testing.T) {
    ob := matching.NewOrderBook("BTC/USDT")

    order := createOrder("BTC/USDT", domain.OrderSideBuy, 50000.0, 2.0)
    ob.AddOrder(order)

    // Partially fill 0.5 BTC
    filledQty := decimal.NewFromFloat(0.5)
    err := ob.UpdateOrder(order.ID, filledQty)
    require.NoError(t, err)

    // Check remaining volume
    bestBid, err := ob.GetBestBid()
    require.NoError(t, err)
    assert.Equal(t, "1.5", bestBid.TotalVolume.String())  // 2.0 - 0.5
}

func TestOrderBook_UpdateOrder_FullyFilled(t *testing.T) {
    ob := matching.NewOrderBook("BTC/USDT")

    order := createOrder("BTC/USDT", domain.OrderSideBuy, 50000.0, 1.5)
    ob.AddOrder(order)

    // Fully fill
    err := ob.UpdateOrder(order.ID, order.Quantity)
    require.NoError(t, err)

    // Order should be removed
    _, err = ob.GetBestBid()
    assert.Error(t, err)
    assert.Equal(t, matching.ErrEmptyOrderBook, err)
}

func TestOrderBook_GetSpread(t *testing.T) {
    ob := matching.NewOrderBook("BTC/USDT")

    bidOrder := createOrder("BTC/USDT", domain.OrderSideBuy, 50000.0, 1.0)
    askOrder := createOrder("BTC/USDT", domain.OrderSideSell, 50100.0, 1.0)

    ob.AddOrder(bidOrder)
    ob.AddOrder(askOrder)

    spread, err := ob.GetSpread()
    require.NoError(t, err)
    assert.Equal(t, "100", spread.String())  // 50100 - 50000
}

func TestOrderBook_GetDepth(t *testing.T) {
    ob := matching.NewOrderBook("BTC/USDT")

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

func TestOrderBook_ConcurrentOperations(t *testing.T) {
    ob := matching.NewOrderBook("BTC/USDT")

    // Concurrent adds
    done := make(chan bool)
    for i := 0; i < 100; i++ {
        go func(i int) {
            price := 50000.0 + float64(i)
            order := createOrder("BTC/USDT", domain.OrderSideBuy, price, 1.0)
            ob.AddOrder(order)
            done <- true
        }(i)
    }

    // Wait for all goroutines
    for i := 0; i < 100; i++ {
        <-done
    }

    // Verify all orders added
    depth := ob.GetDepth(100)
    assert.Equal(t, 100, len(depth.Bids))
}

// Benchmark tests
func BenchmarkOrderBook_AddOrder(b *testing.B) {
    ob := matching.NewOrderBook("BTC/USDT")

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

func BenchmarkOrderBook_GetBestBid(b *testing.B) {
    ob := matching.NewOrderBook("BTC/USDT")

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

// Helper functions
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
        CreatedAt:      time.Now(),
    }
}

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
        CreatedAt:      time.Now(),
    }
}
```

### Handoff Notes

**From:** Sprint planning (Week 2 will focus on matching engine)
**Context:** Need order book foundation before implementing matching algorithm. This is the critical data structure that enables efficient price-time priority matching.

**Handoff To:** Backend Agent (Day 4+ - matching algorithm), QA Agent (TASK-QA-003)
**What to provide:**
1. Order Book API documentation
2. Performance benchmark results
3. Concurrency testing results
4. Memory profiling report (if applicable)
5. Usage examples

### Verification Commands

```bash
# Navigate to trade-engine directory
cd /Users/musti/Documents/Projects/MyCrypto_Platform/services/trade-engine

# Run order book unit tests
go test -v ./internal/matching/...

# Run with coverage
go test -v -cover ./internal/matching/...
go test -coverprofile=coverage-matching.out ./internal/matching/...
go tool cover -html=coverage-matching.out

# Run benchmarks
go test -bench=. -benchmem ./internal/matching/...

# Run race detector
go test -v -race ./internal/matching/...

# Performance profile
go test -cpuprofile=cpu.prof -memprofile=mem.prof -bench=. ./internal/matching/...
go tool pprof cpu.prof
go tool pprof mem.prof

# Test with 10,000 orders
go test -v -run TestOrderBook_LargeScale ./internal/matching/...
```

### Definition of Done
- [ ] OrderBook struct implemented with all operations
- [ ] PriceLevelTree with AVL tree balancing complete
- [ ] All operations meet performance targets
- [ ] Unit tests passing (coverage >80%)
- [ ] Concurrency tests passing (no race conditions)
- [ ] Benchmark results documented
- [ ] Code reviewed by Tech Lead
- [ ] API documentation complete

---

## Task Assignment: TASK-QA-003

**Agent:** QA Agent
**Priority:** P0 (Critical - End-to-end validation)
**Story:** TE-601 (Integration Testing Suite - Part 1)
**Sprint:** Trade Engine Sprint 1
**Estimated Hours:** 4 hours
**Story Points:** 1.0
**Deadline:** 2025-11-24 6:00 PM
**Dependencies:** TASK-BACKEND-004 (Complete), TASK-BACKEND-005 (Parallel)

### Description

Create comprehensive integration test suite that validates end-to-end workflows across all components. This goes beyond Day 2's API testing to verify complete order lifecycle scenarios with real database, real services, and realistic data.

**Scope for Day 3:**
- Full order lifecycle integration tests
- Database integration tests (real PostgreSQL)
- Service integration tests (mock wallet, real order service)
- Error scenario testing (what happens when things fail)
- Performance validation under realistic load
- Data consistency verification

### Acceptance Criteria

#### Integration Test Suite
- [ ] Test suite created at `/tests/integration/order_lifecycle_test.go`
- [ ] Database fixtures and seed data prepared
- [ ] Testcontainers setup for PostgreSQL
- [ ] End-to-end test scenarios (10+ scenarios)
- [ ] All tests passing with real database
- [ ] Test cleanup (no test pollution)

#### Test Scenarios
- [ ] Complete order lifecycle: place → fill → settle
- [ ] Order cancellation lifecycle: place → cancel → verify
- [ ] Partial fill scenario: place → partial match → verify state
- [ ] Multiple users placing orders
- [ ] Concurrent order placement (race condition testing)
- [ ] Database transaction rollback on error
- [ ] Wallet service failure handling
- [ ] Order book consistency after operations

#### Performance Testing
- [ ] Latency tests: Order placement <100ms
- [ ] Throughput tests: 100 orders/sec sustained
- [ ] Concurrent users: 10 simultaneous users
- [ ] Database query performance: All queries <50ms
- [ ] Memory leak tests: No leaks after 1000 operations

#### Quality Gates
- [ ] All integration tests passing (100%)
- [ ] No flaky tests (3 consecutive runs)
- [ ] Test execution time <60 seconds total
- [ ] Coverage report includes integration scenarios
- [ ] Performance regression check (vs Day 2 baseline)

### Technical Specifications

#### Integration Test Setup

```go
package integration_test

import (
    "context"
    "database/sql"
    "fmt"
    "testing"
    "time"

    "github.com/google/uuid"
    "github.com/shopspring/decimal"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
    "github.com/stretchr/testify/suite"
    "github.com/testcontainers/testcontainers-go"
    "github.com/testcontainers/testcontainers-go/wait"
    "gorm.io/driver/postgres"
    "gorm.io/gorm"

    "github.com/mytrader/trade-engine/internal/domain"
    "github.com/mytrader/trade-engine/internal/repository/postgres"
    "github.com/mytrader/trade-engine/internal/service"
    "github.com/mytrader/trade-engine/pkg/clients/wallet"
)

// OrderLifecycleTestSuite is the integration test suite
type OrderLifecycleTestSuite struct {
    suite.Suite
    db            *gorm.DB
    container     testcontainers.Container
    orderRepo     repository.OrderRepository
    orderService  service.OrderService
    walletClient  wallet.WalletClient
}

// SetupSuite runs once before all tests
func (s *OrderLifecycleTestSuite) SetupSuite() {
    ctx := context.Background()

    // Start PostgreSQL container
    req := testcontainers.ContainerRequest{
        Image:        "postgres:15-alpine",
        ExposedPorts: []string{"5432/tcp"},
        Env: map[string]string{
            "POSTGRES_USER":     "test",
            "POSTGRES_PASSWORD": "test",
            "POSTGRES_DB":       "trade_engine_test",
        },
        WaitingFor: wait.ForLog("database system is ready to accept connections"),
    }

    container, err := testcontainers.GenericContainer(ctx, testcontainers.GenericContainerRequest{
        ContainerRequest: req,
        Started:          true,
    })
    require.NoError(s.T(), err)
    s.container = container

    // Get container endpoint
    host, err := container.Host(ctx)
    require.NoError(s.T(), err)

    port, err := container.MappedPort(ctx, "5432")
    require.NoError(s.T(), err)

    // Connect to database
    dsn := fmt.Sprintf("host=%s port=%s user=test password=test dbname=trade_engine_test sslmode=disable",
        host, port.Port())

    db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
    require.NoError(s.T(), err)
    s.db = db

    // Run migrations
    err = s.runMigrations()
    require.NoError(s.T(), err)

    // Setup repositories and services
    s.orderRepo = postgres.NewOrderRepository(s.db)
    s.walletClient = wallet.NewMockWalletClient()
    s.orderService = service.NewOrderService(s.orderRepo, s.walletClient, nil)
}

// TearDownSuite runs once after all tests
func (s *OrderLifecycleTestSuite) TearDownSuite() {
    if s.container != nil {
        s.container.Terminate(context.Background())
    }
}

// SetupTest runs before each test
func (s *OrderLifecycleTestSuite) SetupTest() {
    // Clean database before each test
    s.db.Exec("TRUNCATE TABLE orders CASCADE")
    s.db.Exec("TRUNCATE TABLE trades CASCADE")
}

// Test complete order lifecycle
func (s *OrderLifecycleTestSuite) TestOrderLifecycle_PlaceLimitOrder_Success() {
    ctx := context.Background()
    userID := uuid.New()
    price := decimal.NewFromFloat(50000.0)
    quantity := decimal.NewFromFloat(1.5)

    // Step 1: Place order
    order := &domain.Order{
        UserID:   userID,
        Symbol:   "BTC/USDT",
        Side:     domain.OrderSideBuy,
        Type:     domain.OrderTypeLimit,
        Quantity: quantity,
        Price:    &price,
    }

    createdOrder, err := s.orderService.PlaceOrder(ctx, order)
    require.NoError(s.T(), err)
    assert.NotEqual(s.T(), uuid.Nil, createdOrder.ID)
    assert.Equal(s.T(), domain.OrderStatusPending, createdOrder.Status)

    // Step 2: Verify order in database
    dbOrder, err := s.orderRepo.GetByID(ctx, createdOrder.ID)
    require.NoError(s.T(), err)
    assert.Equal(s.T(), userID, dbOrder.UserID)
    assert.Equal(s.T(), "BTC/USDT", dbOrder.Symbol)
    assert.Equal(s.T(), domain.OrderSideBuy, dbOrder.Side)
    assert.Equal(s.T(), quantity, dbOrder.Quantity)
    assert.Equal(s.T(), decimal.Zero, dbOrder.FilledQuantity)

    // Step 3: Simulate partial fill
    filledQty := decimal.NewFromFloat(0.5)
    dbOrder.FilledQuantity = filledQty
    dbOrder.Status = domain.OrderStatusPartiallyFilled
    err = s.orderRepo.Update(ctx, dbOrder)
    require.NoError(s.T(), err)

    // Step 4: Verify partial fill state
    updatedOrder, err := s.orderRepo.GetByID(ctx, createdOrder.ID)
    require.NoError(s.T(), err)
    assert.Equal(s.T(), domain.OrderStatusPartiallyFilled, updatedOrder.Status)
    assert.Equal(s.T(), filledQty, updatedOrder.FilledQuantity)
    assert.Equal(s.T(), quantity.Sub(filledQty), updatedOrder.RemainingQuantity())

    // Step 5: Complete fill
    updatedOrder.FilledQuantity = quantity
    updatedOrder.Status = domain.OrderStatusFilled
    err = s.orderRepo.Update(ctx, updatedOrder)
    require.NoError(s.T(), err)

    // Step 6: Verify final state
    finalOrder, err := s.orderRepo.GetByID(ctx, createdOrder.ID)
    require.NoError(s.T(), err)
    assert.Equal(s.T(), domain.OrderStatusFilled, finalOrder.Status)
    assert.True(s.T(), finalOrder.IsFilled())
}

func (s *OrderLifecycleTestSuite) TestOrderLifecycle_CancelOrder_Success() {
    ctx := context.Background()
    userID := uuid.New()
    price := decimal.NewFromFloat(50000.0)

    // Step 1: Place order
    order := &domain.Order{
        UserID:   userID,
        Symbol:   "BTC/USDT",
        Side:     domain.OrderSideBuy,
        Type:     domain.OrderTypeLimit,
        Quantity: decimal.NewFromFloat(1.5),
        Price:    &price,
    }

    createdOrder, err := s.orderService.PlaceOrder(ctx, order)
    require.NoError(s.T(), err)

    // Step 2: Cancel order
    err = s.orderRepo.Cancel(ctx, createdOrder.ID)
    require.NoError(s.T(), err)

    // Step 3: Verify cancelled state
    cancelledOrder, err := s.orderRepo.GetByID(ctx, createdOrder.ID)
    require.NoError(s.T(), err)
    assert.Equal(s.T(), domain.OrderStatusCancelled, cancelledOrder.Status)
    assert.NotNil(s.T(), cancelledOrder.CancelledAt)
}

func (s *OrderLifecycleTestSuite) TestOrderLifecycle_ConcurrentOrders_NoRaceConditions() {
    ctx := context.Background()
    userID := uuid.New()
    price := decimal.NewFromFloat(50000.0)

    // Place 10 orders concurrently
    done := make(chan bool, 10)
    orderIDs := make([]uuid.UUID, 10)

    for i := 0; i < 10; i++ {
        go func(index int) {
            order := &domain.Order{
                UserID:   userID,
                Symbol:   "BTC/USDT",
                Side:     domain.OrderSideBuy,
                Type:     domain.OrderTypeLimit,
                Quantity: decimal.NewFromFloat(1.0),
                Price:    &price,
            }

            createdOrder, err := s.orderService.PlaceOrder(ctx, order)
            assert.NoError(s.T(), err)
            orderIDs[index] = createdOrder.ID
            done <- true
        }(i)
    }

    // Wait for all goroutines
    for i := 0; i < 10; i++ {
        <-done
    }

    // Verify all orders created
    orders, err := s.orderRepo.GetByUserID(ctx, userID, repository.OrderFilters{})
    require.NoError(s.T(), err)
    assert.Equal(s.T(), 10, len(orders))

    // Verify no duplicate IDs
    idSet := make(map[uuid.UUID]bool)
    for _, order := range orders {
        assert.False(s.T(), idSet[order.ID], "Duplicate order ID found")
        idSet[order.ID] = true
    }
}

func (s *OrderLifecycleTestSuite) TestOrderLifecycle_WalletServiceDown_OrderRejected() {
    ctx := context.Background()
    userID := uuid.New()
    price := decimal.NewFromFloat(50000.0)

    // Configure mock wallet to fail
    mockWallet := s.walletClient.(*wallet.MockWalletClient)
    mockWallet.SetShouldFail(true)

    order := &domain.Order{
        UserID:   userID,
        Symbol:   "BTC/USDT",
        Side:     domain.OrderSideBuy,
        Type:     domain.OrderTypeLimit,
        Quantity: decimal.NewFromFloat(1.5),
        Price:    &price,
    }

    // Should fail due to wallet service
    createdOrder, err := s.orderService.PlaceOrder(ctx, order)
    assert.Error(s.T(), err)
    assert.Nil(s.T(), createdOrder)

    // Verify order NOT in database
    orders, err := s.orderRepo.GetByUserID(ctx, userID, repository.OrderFilters{})
    require.NoError(s.T(), err)
    assert.Equal(s.T(), 0, len(orders))

    // Reset mock
    mockWallet.SetShouldFail(false)
}

func (s *OrderLifecycleTestSuite) TestOrderLifecycle_QueryWithFilters() {
    ctx := context.Background()
    userID := uuid.New()

    // Create multiple orders with different properties
    symbols := []string{"BTC/USDT", "ETH/USDT", "BTC/USDT"}
    statuses := []domain.OrderStatus{
        domain.OrderStatusOpen,
        domain.OrderStatusFilled,
        domain.OrderStatusOpen,
    }

    for i := 0; i < 3; i++ {
        price := decimal.NewFromFloat(50000.0 + float64(i*100))
        order := &domain.Order{
            UserID:         userID,
            Symbol:         symbols[i],
            Side:           domain.OrderSideBuy,
            Type:           domain.OrderTypeLimit,
            Quantity:       decimal.NewFromFloat(1.0),
            Price:          &price,
            Status:         statuses[i],
            FilledQuantity: decimal.Zero,
        }

        if statuses[i] == domain.OrderStatusFilled {
            order.FilledQuantity = order.Quantity
        }

        err := s.orderRepo.Create(ctx, order)
        require.NoError(s.T(), err)
    }

    // Test filter by symbol
    btcOrders, err := s.orderRepo.GetByUserID(ctx, userID, repository.OrderFilters{
        Symbol: stringPtr("BTC/USDT"),
    })
    require.NoError(s.T(), err)
    assert.Equal(s.T(), 2, len(btcOrders))

    // Test filter by status
    openStatus := domain.OrderStatusOpen
    openOrders, err := s.orderRepo.GetByUserID(ctx, userID, repository.OrderFilters{
        Status: &openStatus,
    })
    require.NoError(s.T(), err)
    assert.Equal(s.T(), 2, len(openOrders))

    // Test filter by symbol AND status
    btcOpenOrders, err := s.orderRepo.GetByUserID(ctx, userID, repository.OrderFilters{
        Symbol: stringPtr("BTC/USDT"),
        Status: &openStatus,
    })
    require.NoError(s.T(), err)
    assert.Equal(s.T(), 2, len(btcOpenOrders))
}

func (s *OrderLifecycleTestSuite) TestOrderLifecycle_Performance_100OrdersPerSecond() {
    ctx := context.Background()
    userID := uuid.New()
    price := decimal.NewFromFloat(50000.0)

    start := time.Now()
    orderCount := 100

    for i := 0; i < orderCount; i++ {
        order := &domain.Order{
            UserID:   userID,
            Symbol:   "BTC/USDT",
            Side:     domain.OrderSideBuy,
            Type:     domain.OrderTypeLimit,
            Quantity: decimal.NewFromFloat(1.0),
            Price:    &price,
        }

        _, err := s.orderService.PlaceOrder(ctx, order)
        require.NoError(s.T(), err)
    }

    elapsed := time.Since(start)

    // Should complete in <1 second (100 orders/sec target)
    assert.Less(s.T(), elapsed.Seconds(), 1.0,
        "Should place 100 orders in <1 second, took %v", elapsed)

    s.T().Logf("Placed %d orders in %v (%.2f orders/sec)",
        orderCount, elapsed, float64(orderCount)/elapsed.Seconds())
}

// Helper functions
func (s *OrderLifecycleTestSuite) runMigrations() error {
    // Read and execute DDL from file or use AutoMigrate
    err := s.db.AutoMigrate(
        &domain.Order{},
        &domain.Trade{},
    )
    return err
}

func stringPtr(s string) *string {
    return &s
}

// Run the test suite
func TestOrderLifecycleTestSuite(t *testing.T) {
    suite.Run(t, new(OrderLifecycleTestSuite))
}
```

#### Additional Test Scenarios

```go
func (s *OrderLifecycleTestSuite) TestOrderLifecycle_Idempotency_DuplicateClientOrderID() {
    ctx := context.Background()
    userID := uuid.New()
    price := decimal.NewFromFloat(50000.0)
    clientOrderID := "client-order-123"

    // Place order with client_order_id
    order1 := &domain.Order{
        UserID:        userID,
        Symbol:        "BTC/USDT",
        Side:          domain.OrderSideBuy,
        Type:          domain.OrderTypeLimit,
        Quantity:      decimal.NewFromFloat(1.5),
        Price:         &price,
        ClientOrderID: &clientOrderID,
    }

    createdOrder1, err := s.orderService.PlaceOrder(ctx, order1)
    require.NoError(s.T(), err)

    // Place duplicate order with same client_order_id
    order2 := &domain.Order{
        UserID:        userID,
        Symbol:        "BTC/USDT",
        Side:          domain.OrderSideBuy,
        Type:          domain.OrderTypeLimit,
        Quantity:      decimal.NewFromFloat(2.0),  // Different quantity
        Price:         &price,
        ClientOrderID: &clientOrderID,
    }

    createdOrder2, err := s.orderService.PlaceOrder(ctx, order2)
    require.NoError(s.T(), err)

    // Should return same order (idempotency)
    assert.Equal(s.T(), createdOrder1.ID, createdOrder2.ID)

    // Verify only one order in database
    orders, err := s.orderRepo.GetByUserID(ctx, userID, repository.OrderFilters{})
    require.NoError(s.T(), err)
    assert.Equal(s.T(), 1, len(orders))
}

func (s *OrderLifecycleTestSuite) TestOrderLifecycle_DatabaseTransaction_Rollback() {
    ctx := context.Background()
    userID := uuid.New()
    price := decimal.NewFromFloat(50000.0)

    // Start transaction
    tx := s.db.Begin()
    txRepo := postgres.NewOrderRepository(tx)

    // Create order in transaction
    order := &domain.Order{
        UserID:   userID,
        Symbol:   "BTC/USDT",
        Side:     domain.OrderSideBuy,
        Type:     domain.OrderTypeLimit,
        Quantity: decimal.NewFromFloat(1.5),
        Price:    &price,
    }

    err := txRepo.Create(ctx, order)
    require.NoError(s.T(), err)

    // Rollback transaction
    tx.Rollback()

    // Verify order NOT in database (rollback worked)
    orders, err := s.orderRepo.GetByUserID(ctx, userID, repository.OrderFilters{})
    require.NoError(s.T(), err)
    assert.Equal(s.T(), 0, len(orders))
}
```

### Handoff Notes

**From:** TASK-BACKEND-004 (unit tests complete), TASK-QA-002 (API tests)
**Context:** Unit tests verify components in isolation. Integration tests verify components working together end-to-end with real database and realistic scenarios.

**Handoff To:** Tech Lead (Day 3 completion report)
**What to provide:**
1. Integration test execution report
2. Test coverage including integration scenarios
3. Performance test results (latency, throughput)
4. List of bugs found (if any)
5. Recommendations for Day 4

### Verification Commands

```bash
# Navigate to trade-engine directory
cd /Users/musti/Documents/Projects/MyCrypto_Platform/services/trade-engine

# Run integration tests
go test -v -tags=integration ./tests/integration/...

# Run with coverage
go test -v -tags=integration -coverprofile=coverage-integration.out ./tests/integration/...

# Run specific test suite
go test -v -tags=integration -run TestOrderLifecycleTestSuite ./tests/integration/...

# Run with race detector
go test -v -tags=integration -race ./tests/integration/...

# Run performance tests only
go test -v -tags=integration -run Performance ./tests/integration/...

# Generate test report
go test -v -tags=integration -json ./tests/integration/... > integration-test-results.json

# Check container logs (if tests fail)
docker logs <container-id>
```

### Definition of Done
- [ ] Integration test suite complete (10+ scenarios)
- [ ] All tests passing with real database
- [ ] Performance tests pass (100 orders/sec)
- [ ] No race conditions detected
- [ ] Test execution time <60 seconds
- [ ] Test cleanup verified (no pollution)
- [ ] Test report generated
- [ ] Code reviewed
- [ ] Handoff notes provided

---

## Task Assignment: TASK-DB-003

**Agent:** Database Agent
**Priority:** P2 (Medium - Performance optimization)
**Story:** TE-102 (Database Schema - Continued optimization)
**Sprint:** Trade Engine Sprint 1
**Estimated Hours:** 3 hours
**Story Points:** 0.5 (reduced from standard to fit schedule)
**Deadline:** 2025-11-24 12:00 PM
**Dependencies:** TASK-DB-002 (Complete ✅)

### Description

Continue database performance optimization based on Day 2 monitoring insights. Add additional indexes based on query patterns, create materialized views for analytics, and setup automated performance reporting.

**Note:** This is a lower priority task that can be deferred if team capacity is tight.

### Acceptance Criteria

#### Index Optimization
- [ ] Query log analysis from Day 2 reviewed
- [ ] Additional indexes created for slow queries
- [ ] Index usage statistics collected
- [ ] Unused indexes identified and documented

#### Materialized Views
- [ ] Materialized view for order statistics
- [ ] Materialized view for trade volume (24h)
- [ ] Refresh strategy defined (hourly/daily)
- [ ] Performance improvement measured

#### Automated Reporting
- [ ] Cron job for daily performance report
- [ ] Email/Slack notification setup (optional)
- [ ] Performance baseline tracking
- [ ] Recommendations documented

### Technical Specifications

#### Additional Indexes

```sql
-- Composite index for user order listing with status filter
CREATE INDEX CONCURRENTLY idx_orders_user_status_created
ON orders(user_id, status, created_at DESC)
WHERE status IN ('OPEN', 'PARTIALLY_FILLED');

-- Index for symbol-based queries
CREATE INDEX CONCURRENTLY idx_orders_symbol_side_price
ON orders(symbol, side, price)
WHERE status = 'OPEN';

-- Index for time-based queries
CREATE INDEX CONCURRENTLY idx_orders_created_at_symbol
ON orders(created_at DESC, symbol)
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days';

-- Index for client_order_id lookups
CREATE INDEX CONCURRENTLY idx_orders_client_order_id_user
ON orders(client_order_id, user_id)
WHERE client_order_id IS NOT NULL;
```

#### Materialized Views

```sql
-- 24-hour trading statistics
CREATE MATERIALIZED VIEW monitoring.trading_stats_24h AS
SELECT
    symbol,
    COUNT(*) as trade_count,
    SUM(quantity) as total_quantity,
    SUM(quantity * price) as total_volume,
    MIN(price) as low_price,
    MAX(price) as high_price,
    AVG(price) as avg_price,
    (ARRAY_AGG(price ORDER BY executed_at ASC))[1] as open_price,
    (ARRAY_AGG(price ORDER BY executed_at DESC))[1] as close_price
FROM trades
WHERE executed_at >= NOW() - INTERVAL '24 hours'
GROUP BY symbol;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX ON monitoring.trading_stats_24h(symbol);

-- Auto-refresh every hour
CREATE OR REPLACE FUNCTION monitoring.refresh_trading_stats()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY monitoring.trading_stats_24h;
END;
$$ LANGUAGE plpgsql;

-- User order statistics
CREATE MATERIALIZED VIEW monitoring.user_order_stats AS
SELECT
    user_id,
    symbol,
    COUNT(*) as total_orders,
    SUM(CASE WHEN status = 'FILLED' THEN 1 ELSE 0 END) as filled_orders,
    SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) as cancelled_orders,
    SUM(quantity) as total_quantity,
    AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_time_to_fill
FROM orders
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY user_id, symbol;
```

#### Performance Monitoring Automation

```sql
-- Daily performance report function
CREATE OR REPLACE FUNCTION monitoring.generate_daily_performance_report()
RETURNS TABLE (
    metric_name TEXT,
    metric_value TEXT,
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        'Slow Queries (>100ms)' as metric_name,
        COUNT(*)::TEXT as metric_value,
        CASE WHEN COUNT(*) > 10 THEN 'WARNING' ELSE 'OK' END as status
    FROM pg_stat_statements
    WHERE mean_exec_time > 100

    UNION ALL

    SELECT
        'Unused Indexes',
        COUNT(*)::TEXT,
        CASE WHEN COUNT(*) > 5 THEN 'WARNING' ELSE 'OK' END
    FROM pg_stat_user_indexes
    WHERE idx_scan = 0

    UNION ALL

    SELECT
        'Table Bloat',
        COUNT(*)::TEXT,
        CASE WHEN COUNT(*) > 0 THEN 'WARNING' ELSE 'OK' END
    FROM monitoring.table_bloat
    WHERE bloat_pct > 20;
END;
$$ LANGUAGE plpgsql;
```

### Handoff Notes

**From:** TASK-DB-002 (monitoring setup)
**Context:** Day 2 established monitoring. Day 3 adds additional optimizations based on actual usage patterns.

**Handoff To:** DevOps Agent (for cron job setup)
**What to provide:**
1. New indexes created and purpose
2. Materialized view refresh schedule
3. Performance improvement metrics
4. Recommendations for Week 2

### Verification Commands

```bash
# Connect to database
psql -h localhost -p 5433 -U trade_engine_user -d trade_engine_db

# Check new indexes
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

# Refresh materialized views
SELECT monitoring.refresh_trading_stats();

# Generate performance report
SELECT * FROM monitoring.generate_daily_performance_report();

# Check query performance improvement
EXPLAIN ANALYZE
SELECT * FROM orders
WHERE user_id = 'some-uuid'
  AND status IN ('OPEN', 'PARTIALLY_FILLED')
ORDER BY created_at DESC;
```

### Definition of Done
- [ ] Additional indexes created
- [ ] Materialized views created and tested
- [ ] Refresh automation implemented
- [ ] Performance report function working
- [ ] Documentation updated
- [ ] Handoff notes provided

---

## Day 3 Success Criteria

**All tasks must meet Definition of Done:**
- [ ] Code complete and self-reviewed
- [ ] Unit tests written and passing (≥80% coverage)
- [ ] Integration tests passing (where applicable)
- [ ] Code reviewed by Tech Lead
- [ ] Documentation updated
- [ ] Handoff notes provided to dependent tasks

**Quality Success (Primary Goal):**
- [ ] Test coverage >80% for ALL layers (domain, service, handler, repository)
- [ ] All unit tests passing (100%)
- [ ] All integration tests passing (100%)
- [ ] Zero P0 bugs
- [ ] No race conditions detected

**Feature Success:**
- [ ] Order Book data structure complete and tested
- [ ] Order Book operations meet performance targets
- [ ] End-to-end order lifecycle validated

**Technical Debt Eliminated:**
- [ ] Service layer tests complete (was 0%, now >80%)
- [ ] Handler layer tests complete (was 0%, now >80%)
- [ ] Repository layer tests complete (was 0%, now >80%)

---

## Day 3 Dependencies and Execution Order

```
Day 2 Complete
     |
     ├─── TASK-BACKEND-004 (Service/Handler Tests) [5h]
     |         |
     |         └─── TASK-QA-003 (Integration Tests) [4h]
     |
     ├─── TASK-BACKEND-005 (Order Book) [6h]
     |         |
     |         └─── TASK-QA-003 (Integration Tests) [4h]
     |
     └─── TASK-DB-003 (DB Optimization) [3h]

All converge → Day 3 Complete
```

**Execution Strategy:**
1. **Morning (9 AM - 12 PM):**
   - Backend Agent: Start TASK-BACKEND-004 (tests)
   - Database Agent: Execute TASK-DB-003 (finish by noon)

2. **Afternoon (12 PM - 5 PM):**
   - Backend Agent: Continue TASK-BACKEND-004, start TASK-BACKEND-005 (parallel if capacity allows)
   - QA Agent: Start TASK-QA-003 after TASK-BACKEND-004 completes

3. **Evening (5 PM - 6 PM):**
   - Complete TASK-BACKEND-005 and TASK-QA-003
   - Day 3 standup and status report
   - Prepare Day 4 task assignments

---

## Estimated Completion Time

| Task | Agent | Hours | Start | End | Status |
|------|-------|-------|-------|-----|--------|
| TASK-BACKEND-004 | Backend | 5h | 9:00 AM | 2:00 PM | Pending |
| TASK-BACKEND-005 | Backend | 6h | 2:00 PM | 5:00 PM | Pending |
| TASK-DB-003 | Database | 3h | 9:00 AM | 12:00 PM | Pending |
| TASK-QA-003 | QA | 4h | 2:00 PM | 6:00 PM | Pending |
| **Total** | - | **18h** | - | - | - |

**Agent Utilization:**
- Backend Agent: 11 hours (137% of 8-hour day) ⚠️ **OVER CAPACITY**
- Database Agent: 3 hours (37% of 8-hour day)
- QA Agent: 4 hours (50% of 8-hour day)

**Capacity Adjustment Options:**
1. **Option A (Recommended):** Backend Agent works extended hours on Day 3 (acceptable given we're ahead of schedule)
2. **Option B:** Defer TASK-DB-003 to Day 4 (it's lower priority)
3. **Option C:** Split TASK-BACKEND-005 across Days 3-4 (partial delivery)

**Recommendation:** Option A - Backend Agent extended hours acceptable because:
- We're 36% ahead of schedule (22.4% done with 16.7% time)
- Day 4 can be lighter to compensate
- Quality debt must be resolved now (technical debt is expensive)

---

## Risk Assessment

### High Risk
- **Backend Agent capacity:** 11 hours allocated (137% utilization)
  - **Mitigation:** Backend Agent is experienced, tasks are well-scoped, can work extended hours
  - **Contingency:** If running over, defer TASK-BACKEND-005 completion to Day 4 morning

### Medium Risk
- **Integration test complexity:** First use of testcontainers
  - **Mitigation:** QA Agent has experience, good documentation available
  - **Contingency:** Use simpler database mocks if testcontainers setup is problematic

### Low Risk
- **Order Book implementation:** Well-defined data structure with clear requirements
- **Database optimization:** Straightforward index creation and materialized views

---

## Communication Plan

### Morning Standup (9:00 AM)
- Review Day 2 achievements
- Assign Day 3 tasks
- Clarify Backend Agent extended hours
- Set expectations for quality focus

### Midday Check-in (12:00 PM)
- Backend: Service/handler tests progress
- Database: DB optimization completion
- Address blockers immediately

### Afternoon Check-in (3:00 PM)
- Backend: Order Book implementation progress
- QA: Integration test setup status
- Adjust evening timeline if needed

### Evening Standup (6:00 PM)
- Review completed tasks
- Test results from all agents
- Quality metrics review (coverage, pass rate)
- Plan Day 4 tasks
- Update sprint burndown

---

## Metrics to Track

### Velocity
- Story points completed: 4.5 / 4.5 (target 100%)
- Story points cumulative: 13.0 / 38 (target 34%)
- Velocity trend: Maintaining 136% pace

### Quality
- Test coverage: Increase from 50.4% to >80%
- Test pass rate: Maintain 100%
- Critical bugs: Maintain 0
- Code review quality: All reviews completed

### Performance
- Order Book operations: <1ms target
- Integration test execution: <60 seconds
- Database query time: <50ms

### Team Health
- Backend Agent: Extended hours (137% utilization) - monitor closely
- Other agents: Healthy utilization (37-50%)
- Blockers: <1 per day target
- Handoff quality: Clear and complete

---

## Next Steps After Day 3

### Day 4 Preview

Assuming Day 3 completes successfully:

1. **Matching Algorithm (start):**
   - TE-302: Price-Time Priority Algorithm skeleton
   - TE-303: Market Order Matching logic
   - Unit tests for matching scenarios

2. **Order Management (complete):**
   - Remaining API endpoints (GET list, DELETE cancel)
   - Error handling improvements
   - API documentation completion

3. **Infrastructure:**
   - Performance tuning based on Day 3 benchmarks
   - Additional monitoring dashboards
   - Week 1 review and retrospective

**Estimated Day 4 workload:** 4-5 story points (lighter to compensate for Day 3)

**Week 1 Goal Check:**
- Target: Infrastructure + Order Management foundation
- Current Progress: 34% story points (13/38)
- Week 1 Days: 5 days (Days 1-5)
- Projected Week 1 completion: 65% (on track!)

---

## Appendix: Task Summary Table

| Task ID | Agent | Priority | Story Points | Hours | Dependencies | Status |
|---------|-------|----------|--------------|-------|--------------|--------|
| TASK-BACKEND-004 | Backend | P0 | 1.5 | 5h | TASK-BACKEND-002 ✅ | Pending |
| TASK-BACKEND-005 | Backend | P0 | 2.0 | 6h | None (parallel OK) | Pending |
| TASK-DB-003 | Database | P2 | 0.5 | 3h | TASK-DB-002 ✅ | Pending |
| TASK-QA-003 | QA | P0 | 1.0 | 4h | TASK-BACKEND-004 | Pending |
| **TOTAL** | - | - | **4.5** | **18h** | - | - |

---

## Day 3 Strategic Rationale

**Why This Plan?**

1. **Quality First:** Day 2 revealed 50.4% domain coverage with service/handler layers untested. This is technical debt that compounds if not addressed immediately.

2. **Ahead of Schedule Advantage:** At 136% velocity, we can afford to invest 137% capacity on Day 3 to eliminate technical debt without jeopardizing sprint goals.

3. **Matching Engine Preparation:** Week 2 focuses on matching engine. Order Book implementation on Day 3 ensures we have a solid foundation before tackling complex matching algorithms.

4. **Integration Testing Maturity:** Moving beyond API tests to full integration tests with real database validates our architecture end-to-end before complexity increases.

5. **Sustainable Pace:** One day of extended hours (Day 3) balanced by lighter Day 4 maintains team health while maximizing quality.

**Success Metrics for Day 3:**
- Coverage jumps from 50.4% to >80% (quality gate achieved)
- Order Book foundation ready for matching engine
- Zero technical debt in testing infrastructure
- Team ready for Week 2 complexity increase

---

**Tech Lead Sign-off Required:**
- [ ] All Day 3 tasks assigned and understood
- [ ] Dependencies verified
- [ ] Backend Agent extended hours approved
- [ ] Risks acknowledged and mitigated
- [ ] Agents ready to execute

**Tech Lead:** ___________________  **Date:** 2025-11-24

---

**End of Day 3 Task Assignments**
