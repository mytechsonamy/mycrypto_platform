# Task Assignment: TASK-BACKEND-007
## Matching Engine HTTP API Integration

**Agent:** Backend Developer
**Priority:** P0 (Critical - Blocking E2E tests)
**Story:** TE-303 (HTTP API Layer)
**Sprint:** Trade Engine Sprint 1 - Day 5
**Estimated Hours:** 6 hours
**Story Points:** 2.0
**Deadline:** November 23, 2025 - 7:00 PM
**Status:** 🎯 ASSIGNED

---

## User Story Reference

**Epic:** Trade Engine (Epic 3)
**Story TE-303:** HTTP API Layer
> As a frontend developer,
> I want to place and manage orders via REST API,
> So that users can trade through the web interface.

---

## Description

Integrate the Day 4 Matching Engine with the HTTP API layer to enable external clients to place orders, cancel orders, and query market data. This task wires together all Week 1 components (HTTP handlers, Matching Engine, Order Book) into a cohesive API that will be validated by Day 5 E2E tests.

**Core Work:**
1. Create OrderService business logic layer
2. Integrate OrderService with Matching Engine
3. Implement HTTP handlers for orderbook, trades, ticker
4. Configure trade/order callbacks for persistence
5. Comprehensive integration testing

---

## Acceptance Criteria

**API Endpoints (7/7):**
- [ ] POST /api/v1/orders - Create order with full validation
  - Accept: symbol, side, type, quantity, price (optional), time_in_force
  - Return: order details + trades (if executed)
  - Error codes: 400 (invalid), 401 (auth), 500 (server)

- [ ] DELETE /api/v1/orders/:orderId - Cancel order (idempotent)
  - Return: cancelled order details
  - Error codes: 404 (not found), 400 (already filled), 401 (auth)

- [ ] GET /api/v1/orders/:orderId - Fetch order by ID
  - Return: order details with fill status
  - Error codes: 404 (not found), 401 (auth)

- [ ] GET /api/v1/orders - List orders with pagination
  - Filters: status (open, filled, cancelled), symbol, side
  - Pagination: page, limit (default 20, max 100)
  - Return: orders array + pagination meta

- [ ] GET /api/v1/orderbook/:symbol - Snapshot with depth parameter
  - Query params: depth (default 10, max 50)
  - Return: bids, asks, spread
  - Cache: 5-second TTL (via middleware)

- [ ] GET /api/v1/trades - Trade history with filters
  - Filters: symbol, user_id (admin only), start_time, end_time
  - Pagination: page, limit (default 20, max 100)
  - Return: trades array + pagination meta

- [ ] GET /api/v1/markets/:symbol/ticker - Market summary data
  - Return: last_price, 24h_high, 24h_low, 24h_volume, 24h_change
  - Source: Aggregate from trades table or cache

**Request/Response Handling (4/4):**
- [ ] Request validation (use validator package)
  - Symbol format: "BASE/QUOTE" (e.g., "BTC/USDT")
  - Quantity: decimal > 0, max 8 decimals
  - Price: decimal > 0, max 2 decimals (for limit orders)
  - Time-in-Force: GTC, IOC, or FOK

- [ ] User authentication via JWT
  - Extract user_id from token claims
  - Validate token signature
  - Handle expired tokens (401)

- [ ] Error responses follow standard format
  ```json
  {
    "success": false,
    "error": {
      "code": "INVALID_QUANTITY",
      "message": "Order quantity must be greater than 0",
      "details": { "field": "quantity", "value": "-1.5" }
    },
    "meta": { "request_id": "req_123", "timestamp": "2025-11-23T10:00:00Z" }
  }
  ```

- [ ] Success responses include request_id for tracing
  ```json
  {
    "success": true,
    "data": { ... },
    "meta": { "request_id": "req_123", "timestamp": "2025-11-23T10:00:00Z" }
  }
  ```

**Matching Engine Integration (5/5):**
- [ ] OrderService instantiates matching engine (singleton pattern)
  - One engine instance per application
  - Thread-safe access
  - Configured on application startup

- [ ] PlaceOrder() called with validated order
  - Convert HTTP request → domain.Order
  - Call matchingEngine.PlaceOrder(order)
  - Handle matching errors gracefully

- [ ] Trades from matching returned to caller
  - Include all trades in response
  - Each trade: id, price, quantity, fees, timestamp

- [ ] Order status updated based on fill results
  - No fill: status = "open"
  - Partial fill: status = "partially_filled"
  - Full fill: status = "filled"

- [ ] CancelOrder() integrated with proper error handling
  - Call matchingEngine.CancelOrder(orderID, symbol)
  - Handle "order not found" error
  - Handle "order already filled" error

**Trade Callbacks (4/4):**
- [ ] SetTradeCallback configured on engine initialization
  - Register callback function in main.go or service initialization
  - Pass TradeRepository as dependency

- [ ] Callback function persists trades to database
  - Async persistence (don't block matching)
  - Batch insert optimization (buffer 100 trades)
  - Error logging if persistence fails

- [ ] Callback triggers settlement flow (async)
  - Call SettlementService.SettleTrade(trade) in goroutine
  - Don't block on settlement completion
  - Settlement errors logged, not returned to client

- [ ] Error handling for callback failures (log, don't block)
  - Log all callback errors with trade details
  - Continue matching engine operation
  - Monitor callback failure rate

**WebSocket Preparation (3/3):**
- [ ] Event structure defined (OrderUpdate, TradeExecuted)
  ```go
  type OrderUpdateEvent struct {
    Type      string    `json:"type"`  // "order.update"
    OrderID   uuid.UUID `json:"order_id"`
    Status    string    `json:"status"`
    Filled    decimal.Decimal `json:"filled_quantity"`
    Timestamp time.Time `json:"timestamp"`
  }

  type TradeExecutedEvent struct {
    Type      string    `json:"type"`  // "trade.executed"
    TradeID   uuid.UUID `json:"trade_id"`
    Symbol    string    `json:"symbol"`
    Price     decimal.Decimal `json:"price"`
    Quantity  decimal.Decimal `json:"quantity"`
    Timestamp time.Time `json:"timestamp"`
  }
  ```

- [ ] Callback functions emit events to channel
  - Create buffered channels (capacity 1000)
  - Non-blocking send (use select with default)
  - Monitor channel overflow

- [ ] WebSocket handler skeleton created (defer full impl to Week 2)
  - Route: GET /ws/market/:symbol
  - Basic connection handling
  - Placeholder for event broadcasting
  - Full implementation deferred to Week 2

**Testing (5/5):**
- [ ] Unit tests for each endpoint handler (mock service)
  - PlaceOrderHandler: 5 test cases
  - CancelOrderHandler: 3 test cases
  - GetOrderHandler: 2 test cases
  - GetOrderBookHandler: 2 test cases
  - GetTradesHandler: 2 test cases

- [ ] Integration tests with real matching engine
  - End-to-end order placement
  - Order cancellation
  - Order book snapshot
  - Trade history query

- [ ] Error scenario tests (invalid input, not found, etc.)
  - Invalid quantity (-1.5)
  - Invalid symbol ("INVALID")
  - Order not found
  - Unauthorized access

- [ ] Concurrent request tests (100 simultaneous orders)
  - 10 users × 10 orders each
  - Verify no race conditions
  - Verify all orders processed

- [ ] Coverage: >80% for new handler code
  - Run: go test -cover ./internal/server/...
  - Run: go test -cover ./internal/service/...
  - Generate HTML report: go tool cover -html=coverage.out

---

## Dependencies

**Completed (Ready to Use):**
- ✅ TASK-BACKEND-006 (Matching Engine) - Day 4 COMPLETE
  - Location: /services/trade-engine/internal/matching/engine.go
  - API: PlaceOrder(), CancelOrder(), GetOrderBookSnapshot()

- ✅ TASK-BACKEND-002 (Order Handlers) - Day 2 COMPLETE
  - Location: /services/trade-engine/internal/server/order_handler.go
  - Existing: PlaceOrderHandler, CancelOrderHandler

- ✅ TASK-DB-004 (Trade Schema) - Day 4 COMPLETE
  - Location: /services/trade-engine/migrations/004_trades_schema.sql
  - Tables: trades, trades_summary, views

**Parallel Tasks:**
- 🔄 TASK-BACKEND-008 (Settlement Service) - Day 5 PARALLEL
  - Can develop in parallel
  - Settlement integrated via callback after this task completes

**Blocking Tasks:**
- ⏳ TASK-QA-005 (E2E Tests) - Day 5 DEPENDS ON THIS
  - Waits for API endpoints to be functional
  - Can start infrastructure setup in parallel

---

## Files to Create/Modify

### New Files (7 files)

```
/services/trade-engine/internal/service/order_service.go
/services/trade-engine/internal/service/order_service_test.go
/services/trade-engine/internal/server/orderbook_handler.go
/services/trade-engine/internal/server/orderbook_handler_test.go
/services/trade-engine/internal/server/trade_handler.go
/services/trade-engine/internal/server/trade_handler_test.go
/services/trade-engine/internal/server/market_handler.go
/services/trade-engine/internal/server/market_handler_test.go
/services/trade-engine/internal/server/websocket_handler.go  (skeleton only)
```

### Modified Files (4 files)

```
/services/trade-engine/internal/server/order_handler.go
  - Integrate OrderService
  - Update PlaceOrderHandler to return trades
  - Enhance error handling

/services/trade-engine/internal/server/order_handler_test.go
  - Add integration tests with real matching engine
  - Add concurrent request tests

/services/trade-engine/internal/server/router.go
  - Add new routes (orderbook, trades, ticker, websocket)
  - Group routes by resource

/services/trade-engine/cmd/server/main.go
  - Initialize matching engine singleton
  - Configure trade and order callbacks
  - Wire OrderService to handlers
```

---

## Implementation Steps

### Phase 1: Service Layer (2 hours)

**Step 1.1: Create OrderService (1 hour)**

Create `/services/trade-engine/internal/service/order_service.go`:

```go
package service

import (
    "context"
    "errors"
    "github.com/google/uuid"
    "github.com/shopspring/decimal"
    "go.uber.org/zap"

    "trade-engine/internal/domain"
    "trade-engine/internal/matching"
    "trade-engine/internal/repository"
)

type OrderService struct {
    matchingEngine *matching.MatchingEngine
    orderRepo      repository.OrderRepository
    tradeRepo      repository.TradeRepository
    logger         *zap.Logger
}

func NewOrderService(
    engine *matching.MatchingEngine,
    orderRepo repository.OrderRepository,
    tradeRepo repository.TradeRepository,
    logger *zap.Logger,
) *OrderService {
    return &OrderService{
        matchingEngine: engine,
        orderRepo:      orderRepo,
        tradeRepo:      tradeRepo,
        logger:         logger,
    }
}

// PlaceOrder creates and submits order to matching engine
func (s *OrderService) PlaceOrder(
    ctx context.Context,
    userID uuid.UUID,
    req *PlaceOrderRequest,
) (*PlaceOrderResponse, error) {
    // 1. Validate request
    if err := req.Validate(); err != nil {
        return nil, err
    }

    // 2. Create domain order
    order := &domain.Order{
        ID:          uuid.New(),
        UserID:      userID,
        Symbol:      req.Symbol,
        Side:        req.Side,
        Type:        req.Type,
        Quantity:    req.Quantity,
        Price:       req.Price,  // nil for market orders
        TimeInForce: req.TimeInForce,
        Status:      domain.OrderStatusOpen,
        CreatedAt:   time.Now(),
    }

    // 3. Submit to matching engine
    trades, err := s.matchingEngine.PlaceOrder(order)
    if err != nil {
        s.logger.Error("matching engine error",
            zap.String("order_id", order.ID.String()),
            zap.Error(err))
        return nil, err
    }

    // 4. Persist order (updated status from matching)
    if err := s.orderRepo.Save(ctx, order); err != nil {
        s.logger.Error("order persistence failed",
            zap.String("order_id", order.ID.String()),
            zap.Error(err))
        // Don't fail the request, order is in matching engine
    }

    // 5. Build response
    return &PlaceOrderResponse{
        Order:  order,
        Trades: trades,
    }, nil
}

// CancelOrder cancels an open order
func (s *OrderService) CancelOrder(
    ctx context.Context,
    userID uuid.UUID,
    orderID uuid.UUID,
    symbol string,
) (*domain.Order, error) {
    // 1. Verify order ownership
    order, err := s.orderRepo.FindByID(ctx, orderID)
    if err != nil {
        return nil, errors.New("order not found")
    }

    if order.UserID != userID {
        return nil, errors.New("unauthorized: order belongs to different user")
    }

    // 2. Cancel in matching engine
    if err := s.matchingEngine.CancelOrder(orderID, symbol); err != nil {
        return nil, err
    }

    // 3. Update order status in database
    order.Status = domain.OrderStatusCancelled
    order.UpdatedAt = time.Now()
    if err := s.orderRepo.Update(ctx, order); err != nil {
        s.logger.Error("order update failed", zap.Error(err))
    }

    return order, nil
}

// GetOrder retrieves order by ID
func (s *OrderService) GetOrder(
    ctx context.Context,
    userID uuid.UUID,
    orderID uuid.UUID,
) (*domain.Order, error) {
    order, err := s.orderRepo.FindByID(ctx, orderID)
    if err != nil {
        return nil, err
    }

    if order.UserID != userID {
        return nil, errors.New("unauthorized")
    }

    return order, nil
}

// ListOrders retrieves user orders with filters
func (s *OrderService) ListOrders(
    ctx context.Context,
    userID uuid.UUID,
    filters *OrderFilters,
) (*OrderListResponse, error) {
    orders, total, err := s.orderRepo.FindByUser(ctx, userID, filters)
    if err != nil {
        return nil, err
    }

    return &OrderListResponse{
        Orders: orders,
        Pagination: &Pagination{
            Page:  filters.Page,
            Limit: filters.Limit,
            Total: total,
            Pages: (total + filters.Limit - 1) / filters.Limit,
        },
    }, nil
}
```

**Step 1.2: Initialize Matching Engine in main.go (0.5 hours)**

Modify `/services/trade-engine/cmd/server/main.go`:

```go
func main() {
    // ... existing setup ...

    // Initialize repositories
    orderRepo := repository.NewOrderRepository(db, logger)
    tradeRepo := repository.NewTradeRepository(db, logger)

    // Create matching engine (singleton)
    matchingEngine := matching.NewMatchingEngine()

    // Configure trade callback (persistence + settlement)
    matchingEngine.SetTradeCallback(func(trade *domain.Trade) {
        // Persist trade to database (async)
        go func() {
            if err := tradeRepo.Save(context.Background(), trade); err != nil {
                logger.Error("trade persistence failed",
                    zap.String("trade_id", trade.ID.String()),
                    zap.Error(err))
            }
        }()

        // Trigger settlement (async, handled by TASK-BACKEND-008)
        // Settlement service will be wired here after TASK-BACKEND-008 completes
    })

    // Configure order update callback
    matchingEngine.SetOrderUpdateCallback(func(order *domain.Order) {
        // Update order status in database (async)
        go func() {
            if err := orderRepo.Update(context.Background(), order); err != nil {
                logger.Error("order update failed",
                    zap.String("order_id", order.ID.String()),
                    zap.Error(err))
            }
        }()
    })

    // Create order service
    orderService := service.NewOrderService(
        matchingEngine,
        orderRepo,
        tradeRepo,
        logger,
    )

    // Wire to handlers
    handlers := server.NewHandlers(orderService, logger)

    // ... existing router setup ...
}
```

**Step 1.3: Write OrderService Tests (0.5 hours)**

Create `/services/trade-engine/internal/service/order_service_test.go`:

```go
func TestOrderService_PlaceOrder_MarketOrder(t *testing.T) {
    mockEngine := &MockMatchingEngine{}
    mockOrderRepo := &MockOrderRepository{}
    mockTradeRepo := &MockTradeRepository{}
    logger := zap.NewNop()

    service := NewOrderService(mockEngine, mockOrderRepo, mockTradeRepo, logger)

    req := &PlaceOrderRequest{
        Symbol:      "BTC/USDT",
        Side:        domain.OrderSideBuy,
        Type:        domain.OrderTypeMarket,
        Quantity:    decimal.NewFromFloat(1.0),
        TimeInForce: domain.TimeInForceGTC,
    }

    userID := uuid.New()
    resp, err := service.PlaceOrder(context.Background(), userID, req)

    assert.NoError(t, err)
    assert.NotNil(t, resp)
    assert.Equal(t, 1, mockEngine.PlaceOrderCallCount)
    assert.Equal(t, 1, mockOrderRepo.SaveCallCount)
}
```

---

### Phase 2: HTTP Handlers (2 hours)

**Step 2.1: Enhance PlaceOrderHandler (0.5 hours)**

Modify `/services/trade-engine/internal/server/order_handler.go`:

```go
// PlaceOrderHandler handles POST /api/v1/orders
func (h *Handler) PlaceOrderHandler(c *gin.Context) {
    // 1. Extract user ID from JWT
    userID, err := h.getUserIDFromContext(c)
    if err != nil {
        c.JSON(401, ErrorResponse{
            Success: false,
            Error: &APIError{
                Code:    "UNAUTHORIZED",
                Message: "Invalid or missing authentication token",
            },
        })
        return
    }

    // 2. Parse request body
    var req PlaceOrderRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(400, ErrorResponse{
            Success: false,
            Error: &APIError{
                Code:    "INVALID_REQUEST",
                Message: "Failed to parse request body",
                Details: map[string]interface{}{"error": err.Error()},
            },
        })
        return
    }

    // 3. Call order service
    resp, err := h.orderService.PlaceOrder(c.Request.Context(), userID, &req)
    if err != nil {
        h.handleServiceError(c, err)
        return
    }

    // 4. Return success response
    c.JSON(201, SuccessResponse{
        Success: true,
        Data: map[string]interface{}{
            "order":  resp.Order,
            "trades": resp.Trades,
        },
        Meta: &ResponseMeta{
            RequestID: c.GetString("request_id"),
            Timestamp: time.Now(),
        },
    })
}
```

**Step 2.2: Create OrderBook Handler (0.5 hours)**

Create `/services/trade-engine/internal/server/orderbook_handler.go`:

```go
package server

import (
    "net/http"
    "strconv"

    "github.com/gin-gonic/gin"
)

// GetOrderBookHandler handles GET /api/v1/orderbook/:symbol
func (h *Handler) GetOrderBookHandler(c *gin.Context) {
    // 1. Extract parameters
    symbol := c.Param("symbol")
    depthStr := c.DefaultQuery("depth", "10")

    depth, err := strconv.Atoi(depthStr)
    if err != nil || depth < 1 || depth > 50 {
        c.JSON(http.StatusBadRequest, ErrorResponse{
            Success: false,
            Error: &APIError{
                Code:    "INVALID_DEPTH",
                Message: "Depth must be between 1 and 50",
            },
        })
        return
    }

    // 2. Get order book snapshot from matching engine
    snapshot := h.orderService.GetOrderBookSnapshot(symbol, depth)
    if snapshot == nil {
        c.JSON(http.StatusNotFound, ErrorResponse{
            Success: false,
            Error: &APIError{
                Code:    "SYMBOL_NOT_FOUND",
                Message: "Order book not found for symbol",
            },
        })
        return
    }

    // 3. Transform to response format
    resp := &OrderBookResponse{
        Symbol:    symbol,
        Timestamp: time.Now(),
        Bids:      transformPriceLevels(snapshot.Bids),
        Asks:      transformPriceLevels(snapshot.Asks),
        Spread:    calculateSpread(snapshot.Bids, snapshot.Asks),
    }

    // 4. Return with caching headers
    c.Header("Cache-Control", "public, max-age=5")
    c.JSON(http.StatusOK, SuccessResponse{
        Success: true,
        Data:    resp,
        Meta: &ResponseMeta{
            RequestID: c.GetString("request_id"),
            Timestamp: time.Now(),
        },
    })
}

func transformPriceLevels(levels []*matching.PriceLevel) []PriceLevelResponse {
    result := make([]PriceLevelResponse, len(levels))
    for i, level := range levels {
        result[i] = PriceLevelResponse{
            Price:     level.Price,
            Quantity:  level.TotalQuantity,
            NumOrders: level.NumOrders,
        }
    }
    return result
}

func calculateSpread(bids, asks []*matching.PriceLevel) decimal.Decimal {
    if len(bids) == 0 || len(asks) == 0 {
        return decimal.Zero
    }
    return asks[0].Price.Sub(bids[0].Price)
}
```

**Step 2.3: Create Trade Handler (0.5 hours)**

Create `/services/trade-engine/internal/server/trade_handler.go`:

```go
package server

// GetTradesHandler handles GET /api/v1/trades
func (h *Handler) GetTradesHandler(c *gin.Context) {
    // 1. Extract filters from query params
    filters := &TradeFilters{
        Symbol:    c.Query("symbol"),
        UserID:    c.Query("user_id"),  // Admin only
        StartTime: parseTime(c.Query("start_time")),
        EndTime:   parseTime(c.Query("end_time")),
        Page:      parseIntDefault(c.Query("page"), 1),
        Limit:     parseIntDefault(c.Query("limit"), 20),
    }

    // 2. Validate filters
    if filters.Limit > 100 {
        filters.Limit = 100
    }

    // 3. Query trades from repository
    trades, total, err := h.tradeRepo.Find(c.Request.Context(), filters)
    if err != nil {
        h.logger.Error("trade query failed", zap.Error(err))
        c.JSON(http.StatusInternalServerError, ErrorResponse{
            Success: false,
            Error: &APIError{
                Code:    "INTERNAL_ERROR",
                Message: "Failed to query trades",
            },
        })
        return
    }

    // 4. Return paginated response
    c.JSON(http.StatusOK, SuccessResponse{
        Success: true,
        Data:    trades,
        Pagination: &Pagination{
            Page:  filters.Page,
            Limit: filters.Limit,
            Total: total,
            Pages: (total + filters.Limit - 1) / filters.Limit,
        },
        Meta: &ResponseMeta{
            RequestID: c.GetString("request_id"),
            Timestamp: time.Now(),
        },
    })
}
```

**Step 2.4: Create Market Handler (0.5 hours)**

Create `/services/trade-engine/internal/server/market_handler.go`:

```go
package server

// GetTickerHandler handles GET /api/v1/markets/:symbol/ticker
func (h *Handler) GetTickerHandler(c *gin.Context) {
    symbol := c.Param("symbol")

    // Query 24h stats from trades table
    stats, err := h.tradeRepo.Get24HStats(c.Request.Context(), symbol)
    if err != nil {
        c.JSON(http.StatusInternalServerError, ErrorResponse{
            Success: false,
            Error: &APIError{
                Code:    "INTERNAL_ERROR",
                Message: "Failed to fetch ticker data",
            },
        })
        return
    }

    ticker := &TickerResponse{
        Symbol:       symbol,
        LastPrice:    stats.LastPrice,
        High24h:      stats.High,
        Low24h:       stats.Low,
        Volume24h:    stats.Volume,
        Change24h:    stats.Change,
        ChangePercent: stats.ChangePercent,
        Timestamp:    time.Now(),
    }

    c.JSON(http.StatusOK, SuccessResponse{
        Success: true,
        Data:    ticker,
        Meta: &ResponseMeta{
            RequestID: c.GetString("request_id"),
            Timestamp: time.Now(),
        },
    })
}
```

---

### Phase 3: Testing (2 hours)

**Step 3.1: Unit Tests for Handlers (1 hour)**

Create tests for each handler with mock dependencies:

```go
// order_handler_test.go
func TestPlaceOrderHandler_Success(t *testing.T) {
    mockService := &MockOrderService{
        PlaceOrderFunc: func(ctx context.Context, userID uuid.UUID, req *PlaceOrderRequest) (*PlaceOrderResponse, error) {
            return &PlaceOrderResponse{
                Order: &domain.Order{
                    ID:     uuid.New(),
                    Status: domain.OrderStatusFilled,
                },
                Trades: []*domain.Trade{
                    {
                        ID:       uuid.New(),
                        Price:    decimal.NewFromInt(50000),
                        Quantity: decimal.NewFromFloat(1.0),
                    },
                },
            }, nil
        },
    }

    handler := NewHandler(mockService, logger)

    w := httptest.NewRecorder()
    c, _ := gin.CreateTestContext(w)

    req := PlaceOrderRequest{
        Symbol:   "BTC/USDT",
        Side:     "buy",
        Type:     "market",
        Quantity: "1.0",
    }
    body, _ := json.Marshal(req)
    c.Request = httptest.NewRequest("POST", "/api/v1/orders", bytes.NewReader(body))
    c.Set("user_id", uuid.New())

    handler.PlaceOrderHandler(c)

    assert.Equal(t, 201, w.Code)

    var resp SuccessResponse
    json.Unmarshal(w.Body.Bytes(), &resp)
    assert.True(t, resp.Success)
}

func TestPlaceOrderHandler_InvalidQuantity(t *testing.T) {
    // Test error scenario: negative quantity
}

func TestPlaceOrderHandler_Unauthorized(t *testing.T) {
    // Test error scenario: missing JWT token
}
```

**Step 3.2: Integration Tests (0.5 hours)**

```go
// integration_test.go
func TestPlaceOrder_Integration(t *testing.T) {
    // Setup: Real matching engine, real database
    db := setupTestDB(t)
    defer db.Close()

    engine := matching.NewMatchingEngine()
    orderRepo := repository.NewOrderRepository(db, logger)
    tradeRepo := repository.NewTradeRepository(db, logger)

    service := service.NewOrderService(engine, orderRepo, tradeRepo, logger)
    handler := server.NewHandler(service, logger)

    // Test: Place limit sell order
    sellReq := PlaceOrderRequest{
        Symbol:      "BTC/USDT",
        Side:        "sell",
        Type:        "limit",
        Quantity:    "1.0",
        Price:       "50000.00",
        TimeInForce: "GTC",
    }

    sellResp := callPlaceOrder(handler, sellReq)
    assert.Equal(t, 201, sellResp.StatusCode)
    assert.Equal(t, "open", sellResp.Order.Status)

    // Test: Place market buy order (should match)
    buyReq := PlaceOrderRequest{
        Symbol:   "BTC/USDT",
        Side:     "buy",
        Type:     "market",
        Quantity: "1.0",
    }

    buyResp := callPlaceOrder(handler, buyReq)
    assert.Equal(t, 201, buyResp.StatusCode)
    assert.Equal(t, "filled", buyResp.Order.Status)
    assert.Len(t, buyResp.Trades, 1)
    assert.Equal(t, "50000.00", buyResp.Trades[0].Price.String())
}
```

**Step 3.3: Concurrent Tests (0.5 hours)**

```go
func TestPlaceOrder_Concurrent(t *testing.T) {
    numUsers := 10
    ordersPerUser := 10

    var wg sync.WaitGroup
    errors := make(chan error, numUsers*ordersPerUser)

    for i := 0; i < numUsers; i++ {
        wg.Add(1)
        go func(userIdx int) {
            defer wg.Done()

            for j := 0; j < ordersPerUser; j++ {
                req := PlaceOrderRequest{
                    Symbol:   "BTC/USDT",
                    Side:     randomSide(),
                    Type:     "limit",
                    Quantity: "0.1",
                    Price:    randomPrice(),
                }

                _, err := callPlaceOrder(handler, req)
                if err != nil {
                    errors <- err
                }
            }
        }(i)
    }

    wg.Wait()
    close(errors)

    assert.Zero(t, len(errors), "expected no errors")
}
```

---

## Performance Targets

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Place Order API | p99 < 50ms | Load test: hey -n 1000 -c 100 |
| Cancel Order API | p99 < 20ms | Benchmark test |
| Get Order Book | p99 < 10ms | Cached response |
| Throughput | 100 orders/sec | Sustained 1 min |
| Concurrent Users | 50+ simultaneous | Stress test |

**Measurement Commands:**

```bash
# Throughput test
hey -z 60s -c 50 -m POST \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"symbol":"BTC/USDT","side":"buy","type":"market","quantity":"0.1"}' \
    http://localhost:8080/api/v1/orders

# Get order book benchmark
hey -n 10000 -c 100 \
    -H "Authorization: Bearer $TOKEN" \
    http://localhost:8080/api/v1/orderbook/BTC/USDT?depth=10

# Cancel order latency
go test -bench=BenchmarkCancelOrder -benchtime=10s ./internal/server/...
```

---

## Verification Commands

```bash
# Navigate to project
cd /Users/musti/Documents/Projects/MyCrypto_Platform/services/trade-engine

# Run unit tests
go test -v ./internal/service/...
go test -v ./internal/server/...

# Run with coverage
go test -cover ./internal/service/...
go test -cover ./internal/server/...

# Generate coverage report
go test -coverprofile=coverage-api.out ./internal/service/... ./internal/server/...
go tool cover -html=coverage-api.out -o coverage-api.html

# Check coverage percentage
go tool cover -func=coverage-api.out | grep total
# Target: > 80%

# Run integration tests
go test -v -tags=integration ./tests/integration/...

# Run race detector
go test -v -race ./internal/service/...
go test -v -race ./internal/server/...

# Run benchmarks
go test -bench=. -benchmem -benchtime=5s ./internal/server/...

# Test HTTP endpoints manually
# (After server is running)

# Place market order
curl -X POST http://localhost:8080/api/v1/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "BTC/USDT",
    "side": "buy",
    "type": "market",
    "quantity": "1.0"
  }'

# Get order book
curl -X GET "http://localhost:8080/api/v1/orderbook/BTC/USDT?depth=10" \
  -H "Authorization: Bearer $TOKEN"

# Get trades
curl -X GET "http://localhost:8080/api/v1/trades?symbol=BTC/USDT&limit=20" \
  -H "Authorization: Bearer $TOKEN"

# Get ticker
curl -X GET "http://localhost:8080/api/v1/markets/BTC/USDT/ticker" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Definition of Done

**Implementation Complete (7/7):**
- [ ] OrderService layer created with all methods
- [ ] Matching engine integrated via OrderService
- [ ] All 7 API endpoints implemented
- [ ] Trade callbacks configured
- [ ] Order update callbacks configured
- [ ] WebSocket event structures defined
- [ ] Routes registered in router

**Testing Complete (5/5):**
- [ ] Unit tests for OrderService (>80% coverage)
- [ ] Unit tests for all handlers (>80% coverage)
- [ ] Integration tests with real matching engine
- [ ] Concurrent request tests passing
- [ ] Performance benchmarks meeting targets

**Documentation Complete (3/3):**
- [ ] API endpoints documented in OpenAPI spec
- [ ] Inline GoDoc comments for all public methods
- [ ] Integration guide for frontend developers

**Quality Gates (5/5):**
- [ ] All tests passing (100%)
- [ ] No race conditions (go test -race)
- [ ] No linting errors (golangci-lint)
- [ ] Coverage > 80%
- [ ] Code reviewed and approved

---

## Handoff Notes

**To QA Agent (TASK-QA-005):**
- All API endpoints functional and tested
- Integration test suite demonstrates E2E flow
- Performance benchmarks available for reference
- Known limitations: WebSocket full impl deferred to Week 2

**To Backend Agent (TASK-BACKEND-008):**
- Trade callback placeholder ready for settlement integration
- Callback signature: `func(trade *domain.Trade)`
- Settlement service should be called asynchronously
- Error handling: Log errors, don't block matching

**To Tech Lead:**
- Implementation follows standard response format
- All error codes consistent with API documentation
- Performance targets validated via benchmarks
- Ready for E2E integration testing

---

**Estimated Time:** 6 hours
**Actual Time:** [To be filled upon completion]
**Blockers:** None
**Status:** 🎯 READY TO START

---

*Task Assignment Created: November 23, 2025*
*Sprint: Trade Engine Sprint 1 - Day 5*
*Tech Lead: Approved for execution*
