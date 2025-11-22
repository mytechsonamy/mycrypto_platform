# TRADE ENGINE - ARCHITECTURE DESIGN

**Proje:** MyTrader White-Label Kripto Exchange Platform  
**Doküman:** Trade Engine Architecture Design  
**Versiyon:** 1.1 (Finalized)  
**Tarih:** 2024-11-22  
**Hazırlayan:** Techsonamy - Mustafa Yıldırım

---

## 📋 İÇİNDEKİLER

1. Architecture Overview
2. Technology Stack Selection
3. Component Design
4. Data Flow Architecture
5. API Design
6. Deployment Architecture
7. Scalability Strategy
8. Performance Optimization
9. Monitoring & Observability
10. Security Architecture

---

## 1. ARCHITECTURE OVERVIEW

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │   Web    │  │  Mobile  │  │   API    │  │  Admin   │       │
│  │   App    │  │   App    │  │ Clients  │  │  Panel   │       │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘       │
└───────┼─────────────┼─────────────┼─────────────┼──────────────┘
        │             │             │             │
        └─────────────┴─────────────┴─────────────┘
                      │
        ┌─────────────▼──────────────┐
        │      API GATEWAY           │
        │   (Kong / AWS API GW)      │
        │  - Rate Limiting           │
        │  - Authentication          │
        │  - Load Balancing          │
        └─────────────┬──────────────┘
                      │
        ┌─────────────▼──────────────────────────────────────────┐
        │              MICROSERVICES LAYER                        │
        │                                                          │
        │  ┌──────────────────┐      ┌──────────────────┐       │
        │  │  TRADE ENGINE    │◄────►│  WALLET SERVICE  │       │
        │  │  (This Design)   │      │  (Ledger-based)  │       │
        │  │                  │      └──────────────────┘       │
        │  │ - Order Book     │                                  │
        │  │ - Matching       │      ┌──────────────────┐       │
        │  │ - Trade Records  │◄────►│  RISK SERVICE    │       │
        │  │ - Event Pub      │      │  (Limits/Checks) │       │
        │  └────────┬─────────┘      └──────────────────┘       │
        │           │                                             │
        │           │                ┌──────────────────┐        │
        │           └───────────────►│ NOTIFICATION SVC │        │
        │                            │ (WS/Email/SMS)   │        │
        │                            └──────────────────┘        │
        │                                                         │
        │           ┌──────────────────┐                         │
        │           │  MARKET DATA SVC │                         │
        │           │  (Real-time Feed)│                         │
        │           └──────────────────┘                         │
        └─────────────────────────────────────────────────────────┘
                      │
        ┌─────────────▼──────────────┐
        │     MESSAGE BROKER          │
        │     (Apache Kafka)          │
        │  - Trade Events             │
        │  - Order Events             │
        │  - Market Data              │
        └─────────────┬───────────────┘
                      │
        ┌─────────────▼──────────────────────────────────────────┐
        │              DATA LAYER                                 │
        │                                                          │
        │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
        │  │  PostgreSQL  │  │    Redis     │  │  TimescaleDB │ │
        │  │  (Primary)   │  │  (Cache +    │  │  (Market     │ │
        │  │  - Orders    │  │   Order Book)│  │   Data)      │ │
        │  │  - Trades    │  │              │  │              │ │
        │  └──────────────┘  └──────────────┘  └──────────────┘ │
        └──────────────────────────────────────────────────────────┘
```

### 1.2 Design Principles

#### Event-Driven Architecture (EDA)
**Rationale:** Loose coupling, scalability, fault tolerance

```
Trade Engine → Event Publisher (NOT direct caller)
Other Services → Event Consumers (independent)
```

**Benefits:**
- Services can scale independently
- Failures in one service don't cascade
- Easy to add new consumers (Analytics, Compliance, etc.)
- Async processing improves response times

#### Domain-Driven Design (DDD)
**Bounded Contexts:**
- **Trading Context:** Orders, Matches, Trades
- **Financial Context:** Balances, Ledgers, Transactions
- **Risk Context:** Limits, Exposures, Alerts
- **Market Context:** Prices, Candles, Tickers

**Aggregate Roots:**
- `Order` (with OrderItems, OrderHistory)
- `Trade` (immutable once created)
- `OrderBook` (in-memory snapshot)

#### CQRS (Command Query Responsibility Segregation)
**Commands (Write):**
- PlaceOrder
- CancelOrder
- UpdateOrder

**Queries (Read):**
- GetOrder
- GetOrderBook
- GetTrades
- GetPositions

**Why CQRS?**
- Write path optimized for consistency (ACID)
- Read path optimized for performance (Redis cache)
- Different data models for different needs

#### Microservices Patterns
- **API Gateway:** Single entry point, routing, auth
- **Service Mesh (optional):** Istio for advanced traffic management
- **Circuit Breaker:** Prevent cascade failures
- **Saga Pattern:** Distributed transactions (order placement)

---

## 2. TECHNOLOGY STACK SELECTION

### 2.1 Core Trade Engine

#### Option Analysis

| Technology | Pros | Cons | Score |
|------------|------|------|-------|
| **Go** | Fast, concurrent, simple deployment, good ecosystem | GC pauses (rare but possible) | ⭐⭐⭐⭐⭐ |
| **Rust** | Fastest, zero-cost abstractions, memory safe | Steep learning curve, slower development | ⭐⭐⭐⭐ |
| **C++** | Maximum performance, mature | Complex, harder to maintain, longer dev time | ⭐⭐⭐ |
| **Java/Kotlin** | Mature ecosystem, good tooling | GC pauses, heavier | ⭐⭐⭐ |
| **Node.js** | Easy development, good for I/O | Single-threaded, not ideal for CPU-bound | ⭐⭐ |

#### **RECOMMENDATION: Go (Golang)**

**Justification:**
1. **Performance:** 
   - Sub-millisecond latency achievable
   - Native concurrency (goroutines) perfect for order matching
   - Compiled binary = fast execution

2. **Development Speed:**
   - Simple syntax, fast learning curve
   - Excellent tooling (go fmt, go test, go build)
   - 3-4x faster development than Rust

3. **Operational Excellence:**
   - Single binary deployment (no dependencies)
   - Built-in profiling (pprof)
   - Excellent observability tools

4. **Ecosystem:**
   - Strong library support (database, Kafka, Redis, gRPC)
   - Active community
   - Used by major exchanges (Coinbase, Kraken have Go components)

5. **Team Considerations:**
   - Easier to hire Go developers than Rust
   - Lower onboarding time
   - Suitable for Turkish dev market

**MVP Stack:**
```
Language: Go 1.21+
Framework: None (stdlib + select libraries)
Concurrency: Native goroutines + channels
Memory: Manual optimization where needed
```

### 2.2 Supporting Components

#### Message Broker: Apache Kafka

**Why Kafka over RabbitMQ?**

| Feature | Kafka | RabbitMQ |
|---------|-------|----------|
| Throughput | 100K+ msg/sec | 10-20K msg/sec |
| Persistence | Always (log-based) | Optional |
| Replay | Yes (offset-based) | No |
| Ordering | Per partition | Per queue |
| Use Case | Event streaming | Task queues |

**Decision: Apache Kafka**

**Rationale:**
- Trade events need to be replayed (audit, analytics)
- High throughput required (10K+ orders/sec target)
- Ordering guarantees critical (per symbol)
- Event sourcing friendly
- Industry standard for financial systems

**Configuration:**
```yaml
kafka:
  topics:
    - trade.events       # Trade executed
    - order.events       # Order state changes
    - orderbook.updates  # Order book snapshots
  partitions: 
    - By symbol (BTC/USDT → partition 0, ETH/USDT → partition 1)
  replication: 3
  retention: 30 days (configurable)
```

#### Primary Database: PostgreSQL 15+

**Why PostgreSQL?**
- ACID compliance (critical for financial data)
- JSON support (flexible metadata)
- Partitioning (time-series data)
- Mature, battle-tested
- Excellent Turkish support & community

**Configuration:**
```yaml
postgresql:
  version: 15+
  extensions:
    - pg_partman (partition management)
    - timescaledb (optional, for analytics)
  replication: 
    - Streaming replication (1 standby minimum)
    - Logical replication for read replicas
  connection_pool: PgBouncer (100-200 connections)
```

#### In-Memory Store: Redis 7+

**Use Cases:**
1. **Order Book Cache:**
   - Active order book (bids/asks)
   - Sub-millisecond read latency
   - Sorted sets for price levels

2. **Stop Orders Watchlist:**
   - Fast price monitoring
   - Trigger detection

3. **Session Management:**
   - WebSocket sessions
   - User tokens

4. **Rate Limiting:**
   - Token bucket algorithm
   - Per-user counters

**Configuration:**
```yaml
redis:
  version: 7+
  mode: Cluster (for HA) or Sentinel (simpler)
  persistence: 
    - AOF (Append-Only File) for durability
    - RDB snapshots (backup)
  max_memory: 32GB (MVP) → 128GB (production)
  eviction: noeviction (never evict order data)
```

**🔍 Redis Role Clarification:**

**Redis is NOT the source of truth** for critical data. Clear data ownership:

| Data Type | Source of Truth | Redis Role |
|-----------|----------------|------------|
| **Orders** | PostgreSQL `orders` table | Cache for fast lookups |
| **Trades** | PostgreSQL `trades` table | Not stored in Redis |
| **Order Book (active)** | In-memory (Go structs) | Snapshot backup every 1s |
| **User Balances** | PostgreSQL `ledger_entries` | Cache (1min TTL) |
| **User Sessions** | PostgreSQL (optional) | Primary store (with TTL) |
| **Rate Limits** | Config (DB/file) | Counter with TTL |

**Data Flow Examples:**

```go
// ❌ WRONG: Using Redis as source of truth
func (s *OrderService) GetOrder(id uuid.UUID) (*Order, error) {
    // Don't do this - what if Redis evicts the key?
    return s.redis.Get(fmt.Sprintf("order:%s", id))
}

// ✅ CORRECT: PostgreSQL is source, Redis is cache
func (s *OrderService) GetOrder(id uuid.UUID) (*Order, error) {
    // Try cache first (fast path)
    cached, err := s.redis.Get(ctx, fmt.Sprintf("order:%s", id)).Result()
    if err == nil {
        var order Order
        json.Unmarshal([]byte(cached), &order)
        return &order, nil
    }
    
    // Cache miss - query DB (source of truth)
    order, err := s.db.First(&Order{}, "id = ?", id).Error
    if err != nil {
        return nil, err
    }
    
    // Populate cache for next time
    data, _ := json.Marshal(order)
    s.redis.Set(ctx, fmt.Sprintf("order:%s", id), data, 1*time.Hour)
    
    return &order, nil
}
```

**Redis Failures - Graceful Degradation:**

```go
// If Redis is down, system still works (slower)
func (s *OrderService) GetOrder(id uuid.UUID) (*Order, error) {
    // Try cache
    cached, err := s.redis.Get(ctx, fmt.Sprintf("order:%s", id)).Result()
    if err == nil {
        // Cache hit - fast path
        return unmarshalOrder(cached), nil
    }
    
    // Redis down or cache miss - fallback to DB
    log.Warn("Redis cache miss or unavailable, using DB", "order_id", id)
    s.metrics.RedisCacheMiss.Inc()
    
    return s.db.First(&Order{}, "id = ?", id).Error
}
```

**WebSocket Fanout via Redis Pub/Sub:**

```go
// This is acceptable use of Redis as event bus (not source of truth)
func (ws *WebSocketHandler) BroadcastOrderUpdate(userID uuid.UUID, order *Order) {
    event := OrderUpdateEvent{
        Type:    "ORDER_UPDATE",
        OrderID: order.ID,
        Status:  order.Status,
    }
    
    // Publish to Redis channel
    ws.redis.Publish(ctx, fmt.Sprintf("user:%s:orders", userID), event.JSON())
    
    // All WS servers subscribed to this channel will receive it
    // If Redis Pub/Sub fails, event is lost (acceptable for real-time notifications)
    // Critical events already in Kafka (durable)
}
```

**Summary:**
- ✅ Redis = Performance layer (cache, rate limit, pub/sub)
- ❌ Redis ≠ Data persistence layer
- 🔄 PostgreSQL = Always source of truth for orders/trades
- 📊 In-memory OrderBook = Runtime state (reconstructible from PostgreSQL)
- 🚨 Redis failure → System degrades gracefully (slower, not broken)

#### Time-Series Database: TimescaleDB

**Why TimescaleDB?**
- PostgreSQL extension (familiar)
- Optimized for time-series (trades, candles)
- Automatic partitioning
- Compression (90% storage reduction)

**Use Cases:**
- Historical trades
- OHLCV candles
- Order book depth history
- Performance metrics

**NOT:** TimescaleDB is optional for MVP. Can start with plain PostgreSQL and migrate later.

### 2.3 API Layer

#### REST API: Go net/http + Chi Router

**Why Chi?**
- Lightweight, idiomatic Go
- Middleware support
- Context-aware routing
- No reflection overhead

**Alternative considered:** Gin (faster but less idiomatic)

#### WebSocket: Gorilla WebSocket

**Why Gorilla?**
- De facto standard in Go
- Robust, well-tested
- Handles 10K+ concurrent connections easily

#### API Documentation: OpenAPI 3.0 (Swagger)

**Tools:**
- swag (Go annotations → OpenAPI)
- Redoc (beautiful documentation UI)

### 2.4 Monitoring & Observability

#### Metrics: Prometheus + Grafana

**Why Prometheus?**
- Pull-based (doesn't add latency)
- Multi-dimensional metrics
- PromQL (powerful queries)
- Industry standard

**Key Metrics:**
```
# Business Metrics
orders_placed_total{symbol, type, side}
orders_matched_total{symbol}
trades_executed_total{symbol}
order_book_depth{symbol, side}

# Performance Metrics
order_placement_duration_seconds{quantile}
matching_duration_seconds{quantile}
trade_creation_duration_seconds{quantile}

# System Metrics
go_goroutines
go_memstats_alloc_bytes
http_requests_total{method, endpoint, status}
```

**Grafana Dashboards:**
- Trading volume (real-time)
- Order funnel (placed → filled)
- Performance (latency p50/p95/p99)
- System health (CPU, memory, goroutines)

#### Logging: Structured JSON + ELK Stack

**Why ELK?**
- Elasticsearch: Fast search
- Logstash: Log aggregation
- Kibana: Visualization

**Alternative:** Loki (simpler, but less mature)

**Log Format:**
```json
{
  "timestamp": "2024-11-22T10:30:45Z",
  "level": "INFO",
  "service": "trade-engine",
  "trace_id": "abc-123",
  "message": "Order matched",
  "order_id": "uuid-1",
  "symbol": "BTC/USDT",
  "price": 50000,
  "quantity": 1.5,
  "latency_ms": 8.5
}
```

#### Distributed Tracing: OpenTelemetry + Jaeger

**Why OpenTelemetry?**
- Vendor-neutral
- Auto-instrumentation for Go
- Trace entire request lifecycle

**Trace Example:**
```
Client → API Gateway → Trade Engine → Kafka → Wallet Service
         [100ms]       [50ms]          [5ms]    [20ms]
```

#### Alerting: Prometheus Alertmanager → PagerDuty/Opsgenie

**Critical Alerts:**
- Order placement latency > 200ms (p99)
- Matching engine stopped
- Database connection pool exhausted
- Kafka lag > 1000 messages
- Circuit breaker opened

---

## 3. COMPONENT DESIGN

### 3.1 Trade Engine Components

```
┌──────────────────────────────────────────────────────────┐
│                  TRADE ENGINE SERVICE                     │
│                                                           │
│  ┌────────────────────────────────────────────────────┐  │
│  │            API LAYER (HTTP + WebSocket)            │  │
│  │  - REST endpoints (/orders, /trades)               │  │
│  │  - WebSocket handler (real-time updates)           │  │
│  │  - Authentication middleware                        │  │
│  │  - Rate limiting middleware                         │  │
│  └─────────────────────┬──────────────────────────────┘  │
│                        │                                  │
│  ┌─────────────────────▼──────────────────────────────┐  │
│  │           ORDER MANAGEMENT LAYER                   │  │
│  │  - OrderService (create, cancel, update)           │  │
│  │  - OrderValidator (price, quantity, balance)       │  │
│  │  - OrderRepository (DB operations)                 │  │
│  └─────────────────────┬──────────────────────────────┘  │
│                        │                                  │
│  ┌─────────────────────▼──────────────────────────────┐  │
│  │         MATCHING ENGINE (CORE)                     │  │
│  │  ┌──────────────────────────────────────────────┐  │  │
│  │  │  OrderBook (In-Memory)                       │  │  │
│  │  │  - Bids (sorted by price desc, time asc)     │  │  │
│  │  │  - Asks (sorted by price asc, time asc)      │  │  │
│  │  │  - Stop orders watchlist                     │  │  │
│  │  └──────────────────────────────────────────────┘  │  │
│  │                                                     │  │
│  │  ┌──────────────────────────────────────────────┐  │  │
│  │  │  MatchingEngine                              │  │  │
│  │  │  - matchMarketOrder()                        │  │  │
│  │  │  - matchLimitOrder()                         │  │  │
│  │  │  - checkStopTriggers()                       │  │  │
│  │  │  - preventSelfTrading()                      │  │  │
│  │  └──────────────────────────────────────────────┘  │  │
│  └─────────────────────┬──────────────────────────────┘  │
│                        │                                  │
│  ┌─────────────────────▼──────────────────────────────┐  │
│  │            TRADE EXECUTION LAYER                   │  │
│  │  - TradeService (create trade records)             │  │
│  │  - TradeRepository (persist to DB)                 │  │
│  │  - EventPublisher (publish to Kafka)               │  │
│  └─────────────────────┬──────────────────────────────┘  │
│                        │                                  │
│  ┌─────────────────────▼──────────────────────────────┐  │
│  │           EXTERNAL INTEGRATIONS                    │  │
│  │  - Wallet Service Client (reserve/release)         │  │
│  │  - Risk Service Client (check limits)              │  │
│  │  - Market Data Client (subscribe to prices)        │  │
│  └────────────────────────────────────────────────────┘  │
│                                                           │
│  ┌────────────────────────────────────────────────────┐  │
│  │              INFRASTRUCTURE                        │  │
│  │  - Config Manager (env, consul, etc.)              │  │
│  │  - Logger (structured JSON)                        │  │
│  │  - Metrics Collector (Prometheus)                  │  │
│  │  - Tracer (OpenTelemetry)                          │  │
│  │  - Health Checker (liveness, readiness)            │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### 3.2 Key Components Detail

#### 3.2.1 OrderBook (In-Memory)

**Data Structure:**
```go
type OrderBook struct {
    Symbol string
    Bids   *PriceLevel  // Max heap (highest price first)
    Asks   *PriceLevel  // Min heap (lowest price first)
    mu     sync.RWMutex // Concurrent access protection
}

type PriceLevel struct {
    Price  decimal.Decimal
    Orders []*Order     // FIFO queue
}

type Order struct {
    ID           uuid.UUID
    UserID       uuid.UUID
    Side         Side           // BUY | SELL
    Type         OrderType      // MARKET | LIMIT | STOP
    Quantity     decimal.Decimal
    Price        decimal.Decimal
    StopPrice    decimal.Decimal
    FilledQty    decimal.Decimal
    Status       OrderStatus
    TimeInForce  TimeInForce
    CreatedAt    time.Time
}
```

**Operations:**
```go
// O(log n) - insert
func (ob *OrderBook) AddOrder(order *Order) error

// O(log n) - delete
func (ob *OrderBook) RemoveOrder(orderID uuid.UUID) error

// O(1) - get best price
func (ob *OrderBook) GetBestBid() *PriceLevel
func (ob *OrderBook) GetBestAsk() *PriceLevel

// O(n) - iterate for matching
func (ob *OrderBook) MatchOrder(incomingOrder *Order) []*Trade
```

**Persistence Strategy:**
```
1. Order Book lives in memory (Redis + Go structs)
2. Every order addition/removal → Persist to PostgreSQL
3. Every 1 second → Snapshot to Redis (backup)
4. On startup → Rebuild from PostgreSQL or Redis snapshot
```

#### 3.2.2 MatchingEngine

**Core Algorithm:**
```go
type MatchingEngine struct {
    orderBooks map[string]*OrderBook // symbol → OrderBook
    stopOrders map[string][]*Order   // symbol → stop orders
}

func (me *MatchingEngine) ProcessOrder(order *Order) ([]*Trade, error) {
    book := me.orderBooks[order.Symbol]
    
    // Validate
    if err := me.validateOrder(order); err != nil {
        return nil, err
    }
    
    // Self-trading prevention
    if me.isSelfTrade(order, book) {
        return nil, ErrSelfTrade
    }
    
    // Match
    var trades []*Trade
    switch order.Type {
    case MARKET:
        trades = me.matchMarketOrder(order, book)
    case LIMIT:
        trades = me.matchLimitOrder(order, book)
    case STOP:
        me.addToStopWatchlist(order)
    }
    
    // Add remaining quantity to book (if LIMIT)
    if order.Type == LIMIT && order.RemainingQty() > 0 {
        book.AddOrder(order)
    }
    
    return trades, nil
}

func (me *MatchingEngine) matchMarketOrder(order *Order, book *OrderBook) []*Trade {
    trades := []*Trade{}
    
    // Get opposite side
    levels := book.GetMatchableLevels(order.Side.Opposite())
    
    for _, level := range levels {
        if order.RemainingQty().IsZero() {
            break
        }
        
        for _, passiveOrder := range level.Orders {
            if order.RemainingQty().IsZero() {
                break
            }
            
            // Create trade
            trade := me.createTrade(order, passiveOrder)
            trades = append(trades, trade)
            
            // Update filled quantities
            order.FilledQty = order.FilledQty.Add(trade.Quantity)
            passiveOrder.FilledQty = passiveOrder.FilledQty.Add(trade.Quantity)
            
            // Remove if fully filled
            if passiveOrder.IsFilled() {
                book.RemoveOrder(passiveOrder.ID)
            }
        }
    }
    
    return trades
}

func (me *MatchingEngine) matchLimitOrder(order *Order, book *OrderBook) []*Trade {
    trades := []*Trade{}
    
    levels := book.GetMatchableLevels(order.Side.Opposite())
    
    for _, level := range levels {
        // Price check
        if !me.canMatch(order, level) {
            break // Price not favorable
        }
        
        if order.RemainingQty().IsZero() {
            break
        }
        
        for _, passiveOrder := range level.Orders {
            if order.RemainingQty().IsZero() {
                break
            }
            
            trade := me.createTrade(order, passiveOrder)
            trades = append(trades, trade)
            
            // Update quantities
            order.FilledQty = order.FilledQty.Add(trade.Quantity)
            passiveOrder.FilledQty = passiveOrder.FilledQty.Add(trade.Quantity)
            
            if passiveOrder.IsFilled() {
                book.RemoveOrder(passiveOrder.ID)
            }
        }
    }
    
    return trades
}
```

**Concurrency Model:**
```go
// Single goroutine per symbol (no race conditions)
type SymbolProcessor struct {
    symbol     string
    orderBook  *OrderBook
    orderChan  chan *Order
    ctx        context.Context
}

func (sp *SymbolProcessor) Start() {
    go func() {
        for {
            select {
            case order := <-sp.orderChan:
                trades, err := sp.matchingEngine.ProcessOrder(order)
                if err != nil {
                    log.Error("matching failed", "error", err)
                    continue
                }
                
                // Persist trades
                for _, trade := range trades {
                    sp.tradeRepo.Save(trade)
                    sp.eventPublisher.PublishTrade(trade)
                }
                
            case <-sp.ctx.Done():
                return
            }
        }
    }()
}
```

**Performance Optimization:**
- One goroutine per symbol (BTC/USDT, ETH/USDT, etc.)
- No locks within symbol processor (single-threaded per symbol)
- Order book operations optimized (heap, RB-tree, or skip list)
- Batch database writes (100 trades → 1 transaction)

#### 3.2.3 EventPublisher

**Kafka Integration:**
```go
type EventPublisher struct {
    producer sarama.AsyncProducer
}

func (ep *EventPublisher) PublishTrade(trade *Trade) error {
    event := TradeEvent{
        EventType:    "TRADE_EXECUTED",
        TradeID:      trade.ID,
        Symbol:       trade.Symbol,
        Price:        trade.Price,
        Quantity:     trade.Quantity,
        BuyerUserID:  trade.BuyerUserID,
        SellerUserID: trade.SellerUserID,
        Timestamp:    time.Now(),
    }
    
    msg := &sarama.ProducerMessage{
        Topic: "trade.events",
        Key:   sarama.StringEncoder(trade.Symbol), // Partition by symbol
        Value: sarama.ByteEncoder(event.JSON()),
    }
    
    ep.producer.Input() <- msg
    return nil
}

func (ep *EventPublisher) PublishOrderUpdate(order *Order) error {
    event := OrderEvent{
        EventType: "ORDER_STATUS_CHANGED",
        OrderID:   order.ID,
        UserID:    order.UserID,
        Symbol:    order.Symbol,
        Status:    order.Status,
        Timestamp: time.Now(),
    }
    
    msg := &sarama.ProducerMessage{
        Topic: "order.events",
        Key:   sarama.StringEncoder(order.UserID.String()),
        Value: sarama.ByteEncoder(event.JSON()),
    }
    
    ep.producer.Input() <- msg
    return nil
}
```

**Event Consistency with Outbox Pattern:**

**Challenge:** What if trade is saved to DB but Kafka publish fails?
```
Scenario:
1. Trade saved to PostgreSQL ✅
2. Kafka publish fails ❌
Result: DB has trade, but no event → Wallet Service never updates ledger
```

**Solution: Transactional Outbox Pattern**

```sql
-- Outbox table for guaranteed event delivery
CREATE TABLE trade_events_outbox (
    event_id UUID PRIMARY KEY,
    trade_id UUID NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    event_payload JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    published_at TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING | PUBLISHED | FAILED
    retry_count INT DEFAULT 0,
    
    INDEX idx_outbox_pending (status, created_at) WHERE status = 'PENDING'
);
```

**Updated Flow:**
```go
// Within DB transaction
func (s *TradeService) CreateTrade(trade *Trade) error {
    tx := s.db.Begin()
    defer tx.Rollback()
    
    // 1. Save trade
    if err := tx.Create(trade).Error; err != nil {
        return err
    }
    
    // 2. Save event to outbox (in same transaction)
    event := &TradeEventOutbox{
        EventID:     uuid.New(),
        TradeID:     trade.ID,
        EventType:   "TRADE_EXECUTED",
        EventPayload: trade.ToJSON(),
        Status:      "PENDING",
    }
    if err := tx.Create(event).Error; err != nil {
        return err
    }
    
    // 3. Commit transaction (atomic)
    return tx.Commit().Error
}

// Background publisher (separate goroutine)
func (ep *EventPublisher) PublishOutboxEvents() {
    ticker := time.NewTicker(100 * time.Millisecond)
    defer ticker.Stop()
    
    for range ticker.C {
        events, _ := ep.outboxRepo.GetPending(limit: 100)
        
        for _, event := range events {
            err := ep.publishToKafka(event)
            if err == nil {
                ep.outboxRepo.MarkPublished(event.EventID)
            } else {
                ep.outboxRepo.IncrementRetry(event.EventID)
                if event.RetryCount > 10 {
                    ep.outboxRepo.MarkFailed(event.EventID)
                    ep.alerting.Send("Outbox event failed after 10 retries")
                }
            }
        }
    }
}
```

**Benefits:**
- ✅ **Guaranteed event delivery** (DB commit = event will eventually be published)
- ✅ **At-least-once semantics** (Kafka consumers must be idempotent)
- ✅ **No data loss** (trade in DB → event in outbox → eventually in Kafka)
- ✅ **Retry mechanism** (failed events retry with exponential backoff)
- ✅ **Monitoring** (pending events metric alerts on lag)

**Alternative (Simpler for MVP):** 
```go
// Dual write (riskier but acceptable for MVP)
tx.Commit()  // Save trade
ep.PublishTrade(trade)  // Fire and forget (async)
// Monitoring alert if Kafka is down
```

**Event Schema (JSON):**
```json
{
  "event_type": "TRADE_EXECUTED",
  "event_id": "uuid",
  "timestamp": "2024-11-22T10:30:45Z",
  "trace_id": "abc-123",
  "payload": {
    "trade_id": "uuid",
    "symbol": "BTC/USDT",
    "buyer_order_id": "uuid",
    "seller_order_id": "uuid",
    "buyer_user_id": "uuid",
    "seller_user_id": "uuid",
    "price": "50000.00",
    "quantity": "1.5",
    "buyer_fee": "0.05",
    "seller_fee": "0.075",
    "is_buyer_maker": false
  }
}
```

---

#### 3.2.4 Risk Management Integration

**Two-Tiered Risk Approach:**

**Tier 1: Pre-Trade Checks (Synchronous - Within Trade Engine)**

Lightweight, cached checks performed **before** order enters matching engine:

```go
type RiskChecker struct {
    cache *redis.Client
}

func (rc *RiskChecker) CheckPreTrade(order *Order) error {
    // 1. User-level limits (cached in Redis for 1 minute)
    userLimits := rc.cache.Get(fmt.Sprintf("limits:user:%s", order.UserID))
    
    if userLimits.MaxOpenOrders > 0 {
        activeCount := rc.cache.Get(fmt.Sprintf("active_orders:%s", order.UserID))
        if activeCount >= userLimits.MaxOpenOrders {
            return ErrMaxOpenOrdersExceeded
        }
    }
    
    // 2. Daily notional limit
    todayVolume := rc.cache.Get(fmt.Sprintf("daily_volume:%s:%s", 
        order.UserID, time.Now().Format("2006-01-02")))
    
    if todayVolume + order.Notional() > userLimits.MaxDailyNotional {
        return ErrDailyLimitExceeded
    }
    
    // 3. Symbol-level limits (if configured)
    symbolLimit := rc.cache.Get(fmt.Sprintf("limits:symbol:%s:%s", 
        order.UserID, order.Symbol))
    
    if symbolLimit.MaxPositionSize > 0 {
        currentPosition := rc.cache.Get(fmt.Sprintf("position:%s:%s", 
            order.UserID, order.Symbol))
        
        if abs(currentPosition + order.SignedQuantity()) > symbolLimit.MaxPositionSize {
            return ErrPositionLimitExceeded
        }
    }
    
    return nil
}
```

**Characteristics:**
- ⚡ **Fast:** < 5ms (Redis lookup)
- 🔒 **Blocking:** Order rejected if limit exceeded
- 📊 **Simple metrics:** Max orders, daily volume, position size
- 💾 **Cached:** User limits cached from database

**Tier 2: Post-Trade Analysis (Asynchronous - Risk Service)**

Complex, ML-based risk analysis performed **after** trade execution:

```go
// Risk Service (separate microservice)
type RiskService struct {
    kafkaConsumer *kafka.Consumer
    riskEngine    *RiskEngine
}

func (rs *RiskService) ConsumeTradeEvents() {
    for msg := range rs.kafkaConsumer.Messages("trade.events") {
        trade := ParseTrade(msg.Value)
        
        // Complex risk calculations
        risk := rs.riskEngine.CalculateRisk(trade.UserID)
        
        // Portfolio risk (VaR, Greeks, etc.)
        if risk.PortfolioVaR > risk.Threshold {
            rs.alerting.Send(Alert{
                Type:    "HIGH_PORTFOLIO_RISK",
                UserID:  trade.UserID,
                Value:   risk.PortfolioVaR,
            })
        }
        
        // Concentration risk
        if risk.SymbolConcentration[trade.Symbol] > 0.30 {
            rs.alerting.Send(Alert{
                Type:    "HIGH_CONCENTRATION",
                UserID:  trade.UserID,
                Symbol:  trade.Symbol,
            })
        }
        
        // Wash trading detection (ML model)
        if rs.mlModel.DetectWashTrading(trade.UserID) {
            rs.compliance.Flag(trade.UserID, "SUSPECTED_WASH_TRADING")
        }
        
        // Update risk metrics (for next pre-trade check)
        rs.cache.Set(fmt.Sprintf("risk_score:%s", trade.UserID), risk.Score)
    }
}
```

**Characteristics:**
- 🧠 **Complex:** Portfolio VaR, concentration, ML models
- ⏱️ **Async:** Doesn't block trade execution
- 🚨 **Alerting:** Triggers alerts, not rejections
- 📈 **Institutional:** Regulatory reporting, compliance

**Summary:**

| Aspect | Pre-Trade (Sync) | Post-Trade (Async) |
|--------|------------------|---------------------|
| **Owner** | Trade Engine | Risk Service |
| **Timing** | Before matching | After trade |
| **Speed** | < 5ms | Seconds to minutes |
| **Action** | Reject order | Alert & flag |
| **Complexity** | Simple counts | ML, VaR, Greeks |
| **Data Source** | Redis cache | Full portfolio, historical |
| **Examples** | Max 100 open orders | 30% concentration in BTC |

**Design Rationale:**
- Trade Engine stays fast (< 100ms latency target)
- Risk Service can scale independently (heavy computation)
- Clear separation of concerns (trading vs risk)
- Regulatory compliance without impacting UX

---

## 4. DATA FLOW ARCHITECTURE

### 4.1 Order Placement Flow

```
┌─────────┐
│  Client │
└────┬────┘
     │ POST /api/orders
     ▼
┌──────────────┐
│ API Gateway  │ (Auth, Rate Limit)
└──────┬───────┘
       │
       ▼
┌───────────────────┐
│  Trade Engine     │
│  ┌─────────────┐  │
│  │ Validate    │  │ - Price, quantity, tick size
│  └──────┬──────┘  │ - User has balance?
│         │         │
│  ┌──────▼──────┐  │
│  │ Check       │  │ Call Wallet Service
│  │ Balance     │◄─┼─(gRPC/HTTP)─► Wallet Service
│  └──────┬──────┘  │               "Reserve balance"
│         │         │
│  ┌──────▼──────┐  │
│  │ Save Order  │  │ PostgreSQL (orders table)
│  │ to DB       │  │ Status: PENDING
│  └──────┬──────┘  │
│         │         │
│  ┌──────▼──────┐  │
│  │ Send to     │  │ Channel (in-process)
│  │ Matching    │  │ → SymbolProcessor goroutine
│  │ Engine      │  │
│  └──────┬──────┘  │
│         │         │
│  ┌──────▼──────┐  │
│  │ Match       │  │ - Check order book
│  │             │  │ - Create trades
│  └──────┬──────┘  │ - Update orders
│         │         │
│  ┌──────▼──────┐  │
│  │ Persist     │  │ PostgreSQL (trades table)
│  │ Trades      │  │ Batch write
│  └──────┬──────┘  │
│         │         │
│  ┌──────▼──────┐  │
│  │ Publish     │  │ Kafka
│  │ Events      │  │ - trade.events
│  └──────┬──────┘  │ - order.events
│         │         │
└─────────┼─────────┘
          │
          ├────────────────────────┬───────────────────────┐
          │                        │                       │
          ▼                        ▼                       ▼
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│  Wallet Service  │   │ Notification Svc │   │  Risk Service    │
│  (Consume Event) │   │  (Consume Event) │   │  (Consume Event) │
│                  │   │                  │   │                  │
│ - Update Ledger  │   │ - Send WS event  │   │ - Check limits   │
│ - Release/       │   │ - Send email     │   │ - Update metrics │
│   transfer funds │   │ - Send SMS       │   │                  │
└──────────────────┘   └──────────────────┘   └──────────────────┘
```

**Timeline:**
```
T+0ms:   Client sends POST /api/orders
T+10ms:  API Gateway auth & rate limit
T+20ms:  Trade Engine validates order
T+30ms:  Wallet Service reserves balance (gRPC call)
T+40ms:  Order saved to PostgreSQL (PENDING)
T+50ms:  Order sent to matching engine (in-process)
T+60ms:  Matching completes, trades created
T+70ms:  Trades saved to PostgreSQL (batch)
T+75ms:  Events published to Kafka
T+80ms:  Response sent to client {"order_id": "...", "status": "FILLED"}
---
T+100ms: Wallet Service updates ledger (async)
T+150ms: Notification sent via WebSocket (async)
T+200ms: Risk checks completed (async)
```

**Total Latency (Client perspective): ~80ms (p50), ~150ms (p99)**

---

### 4.1.5 Stop Order Trigger Flow

**Stop orders don't enter the order book immediately.** They're monitored and converted to market orders when price condition is met.

```
┌──────────────────┐
│ Market Data Svc  │ (Real-time price feed)
│                  │
│ - Binance API    │
│ - WebSocket      │
│ - 100ms updates  │
└────────┬─────────┘
         │ Price tick: BTC/USDT = $50,100
         │
         ▼
┌─────────────────────────────────────────────┐
│  Trade Engine - Stop Orders Monitor         │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │ Price Update Handler                   │ │
│  │                                        │ │
│  │ for symbol, price := range updates {  │ │
│  │     stopOrders := watchlist[symbol]   │ │
│  │                                        │ │
│  │     for _, order := range stopOrders {│ │
│  │         if shouldTrigger(order, price)│ │
│  │             triggerStopOrder(order)   │ │
│  │     }                                  │ │
│  │ }                                      │ │
│  └─────────────────┬──────────────────────┘ │
│                    │                         │
│  ┌─────────────────▼──────────────────────┐ │
│  │ Stop Orders Watchlist (Redis)          │ │
│  │                                        │ │
│  │ BTC/USDT:                              │ │
│  │   - Order #123: Stop $50,000 (SELL)   │ │
│  │   - Order #456: Stop $51,000 (BUY)    │ │ ◄── Triggered!
│  │                                        │ │     Price $50,100 >= $51,000
│  └─────────────────┬──────────────────────┘ │
│                    │                         │
│  ┌─────────────────▼──────────────────────┐ │
│  │ Trigger Logic                          │ │
│  │                                        │ │
│  │ if (side == SELL && price <= stop) {  │ │
│  │     convertToMarket(order)             │ │
│  │ }                                      │ │
│  │ if (side == BUY && price >= stop) {   │ │
│  │     convertToMarket(order)             │ │
│  │ }                                      │ │
│  └─────────────────┬──────────────────────┘ │
│                    │                         │
│  ┌─────────────────▼──────────────────────┐ │
│  │ Convert to Market Order                │ │
│  │                                        │ │
│  │ 1. Remove from stop watchlist          │ │
│  │ 2. Create market order                 │ │
│  │ 3. Send to matching engine             │ │
│  │ 4. Update order status: TRIGGERED      │ │
│  └─────────────────┬──────────────────────┘ │
└────────────────────┼────────────────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │  Matching Engine      │
         │  (Process as MARKET)  │
         └───────────────────────┘
```

**Implementation:**

```go
type StopOrderMonitor struct {
    watchlist   map[string][]*Order // symbol → stop orders
    marketData  *MarketDataClient
    matching    *MatchingEngine
    mu          sync.RWMutex
}

func (som *StopOrderMonitor) Start() {
    // Subscribe to market data
    priceChan := som.marketData.Subscribe("BTC/USDT", "ETH/USDT", ...)
    
    for priceUpdate := range priceChan {
        som.checkTriggers(priceUpdate.Symbol, priceUpdate.Price)
    }
}

func (som *StopOrderMonitor) checkTriggers(symbol string, currentPrice decimal.Decimal) {
    som.mu.RLock()
    stopOrders := som.watchlist[symbol]
    som.mu.RUnlock()
    
    for _, order := range stopOrders {
        triggered := false
        
        switch order.Side {
        case SELL: // Stop loss
            if currentPrice.LessThanOrEqual(order.StopPrice) {
                triggered = true
            }
        case BUY: // Stop buy (breakout)
            if currentPrice.GreaterThanOrEqual(order.StopPrice) {
                triggered = true
            }
        }
        
        if triggered {
            som.triggerOrder(order, currentPrice)
        }
    }
}

func (som *StopOrderMonitor) triggerOrder(order *Order, triggerPrice decimal.Decimal) {
    // Remove from watchlist
    som.removeFromWatchlist(order)
    
    // Convert to market order
    marketOrder := &Order{
        ID:        order.ID,
        UserID:    order.UserID,
        Symbol:    order.Symbol,
        Side:      order.Side,
        Type:      MARKET,
        Quantity:  order.Quantity,
        Status:    TRIGGERED,
    }
    
    // Update DB
    som.db.Model(order).Updates(map[string]interface{}{
        "status":        "TRIGGERED",
        "trigger_price": triggerPrice,
        "triggered_at":  time.Now(),
    })
    
    // Send to matching engine
    som.matching.ProcessOrder(marketOrder)
    
    // Publish event
    som.events.Publish(OrderTriggeredEvent{
        OrderID:      order.ID,
        TriggerPrice: triggerPrice,
        Timestamp:    time.Now(),
    })
}
```

**Market Data Service Integration:**

```yaml
market_data_service:
  sources:
    - name: Binance
      websocket: wss://stream.binance.com:9443/ws
      symbols: [btcusdt, ethusdt, ...]
      update_frequency: 100ms
    
    - name: Internal
      source: trade.events (Kafka)
      description: "Use our own trades as price source"
  
  fallback_strategy:
    - Primary: Binance WebSocket
    - Secondary: Binance REST API (1s poll)
    - Tertiary: Internal trades (last trade price)
  
  publish_to:
    - Kafka topic: market.prices
    - Redis pub/sub: price:{symbol}
    - WebSocket: clients subscribed to ticker
```

**Performance Considerations:**

- **Latency:** 100-200ms from price update to trigger
- **Throughput:** Can monitor 10,000+ stop orders per symbol
- **Accuracy:** Price feed latency determines trigger accuracy
- **Slippage:** Stop market orders may execute at worse price (market impact)

**Example Timeline:**

```
T+0ms:     BTC price hits $50,000 on Binance
T+50ms:    Market Data Service receives update
T+100ms:   Stop Order Monitor checks watchlist
T+110ms:   Order #123 triggered (stop $50,000)
T+120ms:   Converted to market order
T+130ms:   Sent to matching engine
T+150ms:   Market order executed at $49,980 (slippage)
T+160ms:   User receives notification
```

**Monitoring & Alerts:**

```yaml
alerts:
  - name: StopOrderLag
    condition: time_since_last_trigger > 60s AND stop_orders_count > 0
    severity: WARNING
    description: "Stop orders not being checked (market data issue?)"
  
  - name: HighSlippage
    condition: avg(trigger_price - execution_price) > 0.5%
    severity: WARNING
    description: "Excessive slippage on stop orders"
```

---

### 4.2 Trade Event Flow

```
┌──────────────────┐
│  Trade Engine    │
│  (Event Source)  │
└────────┬─────────┘
         │
         │ Publish to Kafka
         │
         ▼
┌─────────────────────────┐
│  Apache Kafka           │
│  Topic: trade.events    │
│  Partitions: by symbol  │
│  Replication: 3         │
└────────┬────────────────┘
         │
         ├─────────────────┬─────────────────┬──────────────────┐
         │                 │                 │                  │
         ▼                 ▼                 ▼                  ▼
┌────────────────┐ ┌───────────────┐ ┌──────────────┐ ┌───────────────┐
│ Wallet Service │ │ Notification  │ │ Analytics    │ │ Compliance    │
│                │ │ Service       │ │ Service      │ │ Service       │
│ Update Ledger  │ │ Send WS/Email │ │ Track Volume │ │ AML Checks    │
└────────────────┘ └───────────────┘ └──────────────┘ └───────────────┘
```

**Event Consumption Guarantees:**
- At-least-once delivery (Kafka consumer groups)
- Idempotent event processing (dedupe by trade_id)
- Retry with exponential backoff
- Dead letter queue for failed events

### 4.3 WebSocket Real-Time Updates

```
┌────────────┐
│  Client    │
└─────┬──────┘
      │ WS Connect: ws://api.mytrader.com/stream
      ▼
┌───────────────────┐
│  Trade Engine     │
│  WS Handler       │
│  ┌─────────────┐  │
│  │ Authenticate│  │ JWT validation
│  └──────┬──────┘  │
│         │         │
│  ┌──────▼──────┐  │
│  │ Subscribe   │  │ Subscribe to:
│  │ to Topics   │  │ - user:{user_id}:orders
│  │             │  │ - orderbook:{symbol}
│  └──────┬──────┘  │ - trades:{symbol}
│         │         │
│  ┌──────▼──────┐  │
│  │ Redis       │  │ Pub/Sub for WS fanout
│  │ Pub/Sub     │  │
│  └──────┬──────┘  │
│         │         │
└─────────┼─────────┘
          │
          │ When event occurs:
          │
    ┌─────▼─────────────────────────┐
    │ 1. Matching Engine creates    │
    │    trade                       │
    │                                │
    │ 2. Publish to Redis:           │
    │    PUBLISH user:123:orders     │
    │    {"event": "ORDER_FILLED"}   │
    │                                │
    │ 3. WS Handler receives from    │
    │    Redis subscription          │
    │                                │
    │ 4. Send to client via WS       │
    └────────────────────────────────┘
```

**WebSocket Message Format:**
```json
{
  "type": "ORDER_UPDATE",
  "sequence": 12345,
  "timestamp": "2024-11-22T10:30:45Z",
  "data": {
    "order_id": "uuid",
    "status": "FILLED",
    "filled_quantity": "1.5",
    "average_price": "50000.00"
  }
}
```

**Resync Mechanism:**
```javascript
// Client reconnects
client.send({
  "type": "RESYNC",
  "last_sequence": 12340
});

// Server responds
server.send({
  "type": "SNAPSHOT",
  "sequence": 12345,
  "data": {
    "orders": [...],  // All open orders
    "balances": {...}
  }
});
```

---

## 5. API DESIGN

### 5.1 REST API Endpoints

#### Order Management

```
POST   /api/v1/orders
GET    /api/v1/orders/:id
GET    /api/v1/orders (list with filters)
DELETE /api/v1/orders/:id (cancel)
PATCH  /api/v1/orders/:id (update price/quantity)
```

#### Order Book

```
GET    /api/v1/orderbook/:symbol
GET    /api/v1/orderbook/:symbol/depth (snapshot)
```

#### Trades

```
GET    /api/v1/trades (list recent trades)
GET    /api/v1/trades/my (user's trades)
GET    /api/v1/trades/:id (single trade)
```

#### Market Data

```
GET    /api/v1/ticker/:symbol (24h stats)
GET    /api/v1/symbols (list all trading pairs)
```

### 5.2 API Specification (OpenAPI 3.0 Sample)

```yaml
openapi: 3.0.0
info:
  title: MyTrader Trade Engine API
  version: 1.0.0
  description: Trade Engine REST API for order management

paths:
  /api/v1/orders:
    post:
      summary: Place a new order
      operationId: placeOrder
      tags:
        - Orders
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/PlaceOrderRequest'
      responses:
        '201':
          description: Order created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/OrderResponse'
        '400':
          description: Invalid request
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '429':
          description: Rate limit exceeded
        '401':
          description: Unauthorized

components:
  schemas:
    PlaceOrderRequest:
      type: object
      required:
        - symbol
        - side
        - order_type
        - quantity
        - client_order_id
      properties:
        symbol:
          type: string
          example: "BTC/USDT"
        side:
          type: string
          enum: [BUY, SELL]
        order_type:
          type: string
          enum: [MARKET, LIMIT, STOP]
        quantity:
          type: string
          format: decimal
          example: "1.5"
        price:
          type: string
          format: decimal
          example: "50000.00"
          description: Required for LIMIT orders
        stop_price:
          type: string
          format: decimal
          description: Required for STOP orders
        time_in_force:
          type: string
          enum: [GTC, IOC, FOK]
          default: GTC
        client_order_id:
          type: string
          maxLength: 100
          description: Idempotency key

    OrderResponse:
      type: object
      properties:
        order_id:
          type: string
          format: uuid
        status:
          type: string
          enum: [PENDING, OPEN, PARTIALLY_FILLED, FILLED, CANCELLED, REJECTED]
        symbol:
          type: string
        side:
          type: string
        order_type:
          type: string
        quantity:
          type: string
        filled_quantity:
          type: string
        price:
          type: string
        average_price:
          type: string
        created_at:
          type: string
          format: date-time
        updated_at:
          type: string
          format: date-time

  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
```

### 5.3 WebSocket API

#### Connection

```javascript
const ws = new WebSocket('wss://api.mytrader.com/stream');

// Authenticate
ws.send(JSON.stringify({
  type: 'AUTH',
  token: 'jwt-token'
}));
```

#### Subscriptions

```javascript
// Subscribe to user's orders
ws.send(JSON.stringify({
  type: 'SUBSCRIBE',
  channels: ['user.orders', 'user.trades']
}));

// Subscribe to order book
ws.send(JSON.stringify({
  type: 'SUBSCRIBE',
  channels: ['orderbook.BTC/USDT']
}));

// Subscribe to public trades
ws.send(JSON.stringify({
  type: 'SUBSCRIBE',
  channels: ['trades.BTC/USDT']
}));
```

#### Messages from Server

```javascript
// Order update
{
  "type": "ORDER_UPDATE",
  "channel": "user.orders",
  "sequence": 12345,
  "timestamp": "2024-11-22T10:30:45Z",
  "data": {
    "order_id": "uuid",
    "status": "FILLED",
    "filled_quantity": "1.5"
  }
}

// Order book update (incremental)
{
  "type": "ORDERBOOK_UPDATE",
  "channel": "orderbook.BTC/USDT",
  "sequence": 67890,
  "timestamp": "2024-11-22T10:30:45.123Z",
  "data": {
    "bids": [
      ["50000.00", "1.5"],  // [price, quantity]
      ["49999.00", "0.0"]   // 0 quantity = removed
    ],
    "asks": [
      ["50001.00", "2.1"]
    ]
  }
}

// Trade notification
{
  "type": "TRADE",
  "channel": "trades.BTC/USDT",
  "sequence": 11111,
  "timestamp": "2024-11-22T10:30:45.456Z",
  "data": {
    "trade_id": "uuid",
    "price": "50000.00",
    "quantity": "1.5",
    "side": "BUY",
    "is_buyer_maker": false
  }
}
```

---

## 6. DEPLOYMENT ARCHITECTURE

### 6.1 Infrastructure Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      KUBERNETES CLUSTER                          │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    NAMESPACE: trade                       │   │
│  │                                                            │   │
│  │  ┌─────────────────────────────────────────────────────┐  │   │
│  │  │  Trade Engine Deployment                            │  │   │
│  │  │  - Replicas: 3                                      │  │   │
│  │  │  - Resources:                                       │  │   │
│  │  │    * CPU: 2 cores (request), 4 cores (limit)       │  │   │
│  │  │    * Memory: 4GB (request), 8GB (limit)            │  │   │
│  │  │  - Health checks: /health/live, /health/ready      │  │   │
│  │  │  - Rolling update: maxSurge=1, maxUnavailable=0    │  │   │
│  │  └─────────────────────────────────────────────────────┘  │   │
│  │                                                            │   │
│  │  ┌─────────────────────────────────────────────────────┐  │   │
│  │  │  Service (ClusterIP)                                │  │   │
│  │  │  - Port: 8080 (HTTP/gRPC)                           │  │   │
│  │  │  - Port: 8081 (WebSocket)                           │  │   │
│  │  │  - Port: 9090 (Metrics)                             │  │   │
│  │  └─────────────────────────────────────────────────────┘  │   │
│  │                                                            │   │
│  │  ┌─────────────────────────────────────────────────────┐  │   │
│  │  │  HorizontalPodAutoscaler                            │  │   │
│  │  │  - Min replicas: 3                                  │  │   │
│  │  │  - Max replicas: 10                                 │  │   │
│  │  │  - Target CPU: 70%                                  │  │   │
│  │  │  - Target Memory: 80%                               │  │   │
│  │  │  - Custom metrics: orders_per_second               │  │   │
│  │  └─────────────────────────────────────────────────────┘  │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                NAMESPACE: data                            │   │
│  │                                                            │   │
│  │  ┌───────────────┐  ┌───────────────┐  ┌──────────────┐  │   │
│  │  │ PostgreSQL    │  │ Redis         │  │ Kafka        │  │   │
│  │  │ StatefulSet   │  │ StatefulSet   │  │ StatefulSet  │  │   │
│  │  │ Replicas: 3   │  │ Replicas: 3   │  │ Replicas: 3  │  │   │
│  │  └───────────────┘  └───────────────┘  └──────────────┘  │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │            NAMESPACE: monitoring                          │   │
│  │                                                            │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │   │
│  │  │ Prometheus   │  │ Grafana      │  │ Jaeger       │   │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘   │   │
│  └────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Kubernetes Manifests

#### Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: trade-engine
  namespace: trade
  labels:
    app: trade-engine
    version: v1.0.0
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: trade-engine
  template:
    metadata:
      labels:
        app: trade-engine
        version: v1.0.0
    spec:
      containers:
      - name: trade-engine
        image: mytrader/trade-engine:v1.0.0
        ports:
        - containerPort: 8080
          name: http
        - containerPort: 8081
          name: websocket
        - containerPort: 9090
          name: metrics
        env:
        - name: ENVIRONMENT
          value: "production"
        - name: LOG_LEVEL
          value: "INFO"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: trade-engine-secrets
              key: database-url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: trade-engine-secrets
              key: redis-url
        - name: KAFKA_BROKERS
          value: "kafka-0.kafka-headless:9092,kafka-1.kafka-headless:9092,kafka-2.kafka-headless:9092"
        resources:
          requests:
            cpu: "2000m"
            memory: "4Gi"
          limits:
            cpu: "4000m"
            memory: "8Gi"
        livenessProbe:
          httpGet:
            path: /health/live
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 2
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - trade-engine
              topologyKey: kubernetes.io/hostname
```

#### Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: trade-engine
  namespace: trade
  labels:
    app: trade-engine
spec:
  type: ClusterIP
  ports:
  - port: 8080
    targetPort: 8080
    protocol: TCP
    name: http
  - port: 8081
    targetPort: 8081
    protocol: TCP
    name: websocket
  - port: 9090
    targetPort: 9090
    protocol: TCP
    name: metrics
  selector:
    app: trade-engine
```

#### HorizontalPodAutoscaler

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: trade-engine-hpa
  namespace: trade
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: trade-engine
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 25
        periodSeconds: 60
```

### 6.3 Database Deployment (StatefulSet)

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: data
spec:
  serviceName: postgres-headless
  replicas: 3
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15-alpine
        ports:
        - containerPort: 5432
          name: postgres
        env:
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secrets
              key: password
        - name: POSTGRES_DB
          value: mytrader
        - name: PGDATA
          value: /var/lib/postgresql/data/pgdata
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
        resources:
          requests:
            cpu: "2000m"
            memory: "8Gi"
          limits:
            cpu: "4000m"
            memory: "16Gi"
  volumeClaimTemplates:
  - metadata:
      name: postgres-storage
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: fast-ssd
      resources:
        requests:
          storage: 500Gi
```

### 6.4 On-Premise Deployment (Turkish Banks)

**Hardware Requirements (Per Node):**
```
Minimum (MVP):
- CPU: 8 cores (16 threads)
- RAM: 32GB
- Storage: 1TB NVMe SSD
- Network: 10 Gbps

Recommended (Production):
- CPU: 16 cores (32 threads)
- RAM: 64GB
- Storage: 2TB NVMe SSD (RAID 10)
- Network: 10 Gbps

Cluster Size:
- Control Plane: 3 nodes
- Worker Nodes: 5-10 nodes
- Database Nodes: 3 nodes (dedicated)
```

**Network Topology:**
```
Internet
    │
    ▼
┌──────────────┐
│  Firewall    │ (Bank's perimeter)
│  (SPK/BDDK)  │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  DMZ Zone    │
│  - WAF       │
│  - LB        │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  App Zone    │
│  - K8s Cluster
│  - Trade Engine
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Data Zone   │
│  - PostgreSQL│
│  - Redis     │
│  - Kafka     │
└──────────────┘
```

---

## 7. SCALABILITY STRATEGY

### 7.1 Horizontal Scaling

**Symbol-Based Sharding:**
```
Symbol Range → Node Assignment

BTC/*, ETH/*, XRP/* → Node Group A (High volume)
LTC/*, BCH/*, ADA/* → Node Group B (Medium volume)
Other symbols        → Node Group C (Low volume)
```

**Benefits:**
- Hot symbols don't affect cold symbols
- Can scale high-volume pairs independently
- Simpler than user-based sharding

**Implementation:**
```go
func (lb *LoadBalancer) GetNode(symbol string) *Node {
    hash := consistentHash(symbol)
    return lb.ring.GetNode(hash)
}
```

### 7.2 Vertical Scaling

**Database:**
- Increase connection pool size (100 → 500)
- Add read replicas (1 → 3)
- Optimize queries (indexes, partitioning)
- Use pgBouncer (connection pooling)

**Redis:**
- Increase memory (32GB → 128GB)
- Use Redis Cluster (sharding)
- Enable persistence (AOF + RDB)

**Trade Engine:**
- Increase CPU cores (2 → 8)
- Increase memory (4GB → 16GB)
- Optimize goroutine pool

### 7.3 Performance Targets

| Metric | MVP | Production |
|--------|-----|------------|
| Throughput | 1,000 orders/sec | 10,000 orders/sec |
| Latency (p50) | < 50ms | < 20ms |
| Latency (p99) | < 150ms | < 100ms |
| Concurrent Users | 500 | 10,000 |
| Symbols | 50 | 500 |
| Database Size | 100GB | 5TB |
| Trade History | 1 year | 5 years |

---

## 8. PERFORMANCE OPTIMIZATION

### 8.1 Database Optimization

**Partitioning:**
```sql
-- Orders table partitioned by month
CREATE TABLE orders_2024_11 PARTITION OF orders
  FOR VALUES FROM ('2024-11-01') TO ('2024-12-01');

-- Trades table partitioned by day (high volume)
CREATE TABLE trades_2024_11_22 PARTITION OF trades
  FOR VALUES FROM ('2024-11-22') TO ('2024-11-23');

-- Auto-manage partitions with pg_partman
SELECT create_parent('public.orders', 'created_at', 'native', 'monthly');
```

**Indexes:**
```sql
-- Critical indexes
CREATE INDEX CONCURRENTLY idx_orders_user_symbol_status 
  ON orders(user_id, symbol, status) 
  WHERE status IN ('OPEN', 'PARTIALLY_FILLED');

CREATE INDEX CONCURRENTLY idx_orders_symbol_side_price 
  ON orders(symbol, side, price DESC) 
  WHERE status = 'OPEN';

CREATE INDEX CONCURRENTLY idx_trades_symbol_time 
  ON trades(symbol, executed_at DESC);

CREATE INDEX CONCURRENTLY idx_trades_user_time 
  ON trades(buyer_user_id, executed_at DESC);
```

**Connection Pooling (PgBouncer):**
```ini
[databases]
mytrader = host=postgres-primary port=5432 dbname=mytrader

[pgbouncer]
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 100
reserve_pool_size = 50
reserve_pool_timeout = 5
```

### 8.2 In-Memory Optimization

**Redis Data Structures:**
```
Order Book (Sorted Sets):
  ZADD orderbook:BTC/USDT:bids 50000 "order_id_1"
  ZADD orderbook:BTC/USDT:asks 50001 "order_id_2"

Stop Orders (Hash):
  HSET stop_orders:BTC/USDT order_id_1 "stop_price:49000"

Rate Limiting (String with TTL):
  INCR rate_limit:user:123:orders
  EXPIRE rate_limit:user:123:orders 60

Session Management:
  SETEX session:abc123 3600 "{user_id: 123}"
```

**Cache Strategy:**
```go
// Cache-Aside Pattern
func (s *OrderService) GetOrder(id uuid.UUID) (*Order, error) {
    // Try cache first
    cached, err := s.redis.Get(ctx, fmt.Sprintf("order:%s", id)).Result()
    if err == nil {
        var order Order
        json.Unmarshal([]byte(cached), &order)
        return &order, nil
    }
    
    // Cache miss - query DB
    order, err := s.repo.GetByID(id)
    if err != nil {
        return nil, err
    }
    
    // Write to cache
    data, _ := json.Marshal(order)
    s.redis.Set(ctx, fmt.Sprintf("order:%s", id), data, 24*time.Hour)
    
    return order, nil
}
```

### 8.3 Matching Engine Optimization

**Lock-Free Data Structures:**
```go
// Use atomic operations where possible
type OrderBook struct {
    bids atomic.Value // *PriceLevelTree
    asks atomic.Value // *PriceLevelTree
}

func (ob *OrderBook) GetBestBid() *PriceLevel {
    tree := ob.bids.Load().(*PriceLevelTree)
    return tree.Max()
}
```

**Batch Processing:**
```go
// Batch database writes
type TradeBatcher struct {
    trades    []*Trade
    mu        sync.Mutex
    maxSize   int
    flushChan chan struct{}
}

func (tb *TradeBatcher) Add(trade *Trade) {
    tb.mu.Lock()
    tb.trades = append(tb.trades, trade)
    if len(tb.trades) >= tb.maxSize {
        tb.flush()
    }
    tb.mu.Unlock()
}

func (tb *TradeBatcher) flush() {
    // Batch insert trades
    query := `INSERT INTO trades (trade_id, symbol, price, ...) VALUES `
    // Build bulk insert with 100+ rows
    s.db.Exec(query, ...)
}
```

**Memory Pooling:**
```go
var tradePool = sync.Pool{
    New: func() interface{} {
        return &Trade{}
    },
}

func createTrade(...) *Trade {
    trade := tradePool.Get().(*Trade)
    trade.Reset()
    // ... populate trade
    return trade
}

func releaseTrade(trade *Trade) {
    tradePool.Put(trade)
}
```

---

## 9. MONITORING & OBSERVABILITY

### 9.1 Prometheus Metrics

**Custom Metrics:**
```go
var (
    ordersPlaced = promauto.NewCounterVec(
        prometheus.CounterOpts{
            Name: "orders_placed_total",
            Help: "Total number of orders placed",
        },
        []string{"symbol", "type", "side"},
    )
    
    orderLatency = promauto.NewHistogramVec(
        prometheus.HistogramOpts{
            Name:    "order_placement_duration_seconds",
            Help:    "Order placement latency distribution",
            Buckets: []float64{.005, .01, .025, .05, .1, .25, .5, 1, 2.5, 5},
        },
        []string{"symbol"},
    )
    
    matchingLatency = promauto.NewHistogram(
        prometheus.HistogramOpts{
            Name:    "matching_duration_seconds",
            Help:    "Matching engine latency",
            Buckets: []float64{.001, .002, .005, .01, .02, .05, .1},
        },
    )
    
    orderBookDepth = promauto.NewGaugeVec(
        prometheus.GaugeOpts{
            Name: "order_book_depth",
            Help: "Number of orders in order book",
        },
        []string{"symbol", "side"},
    )
)

// Usage
ordersPlaced.WithLabelValues("BTC/USDT", "LIMIT", "BUY").Inc()

timer := prometheus.NewTimer(orderLatency.WithLabelValues("BTC/USDT"))
defer timer.ObserveDuration()
```

### 9.2 Grafana Dashboards

**Dashboard 1: Trading Overview**
- Orders placed (per minute)
- Orders filled vs cancelled
- Trade volume (USD)
- Active trading pairs
- Top traders

**Dashboard 2: Performance**
- Order placement latency (p50, p95, p99)
- Matching latency
- WebSocket connections
- API request rate
- Error rate

**Dashboard 3: System Health**
- CPU usage
- Memory usage
- Goroutines count
- Database connections
- Redis memory
- Kafka lag

**Dashboard 4: Order Book**
- Bid/ask spread
- Order book depth
- Price levels
- Liquidity heatmap

### 9.3 Alerting Rules

**Critical Alerts (PagerDuty):**
```yaml
groups:
- name: trade_engine_critical
  interval: 30s
  rules:
  - alert: HighOrderLatency
    expr: histogram_quantile(0.99, order_placement_duration_seconds) > 0.2
    for: 2m
    annotations:
      summary: "Order placement latency is high"
      description: "p99 latency is {{ $value }}s"
    
  - alert: MatchingEngineStopped
    expr: rate(orders_matched_total[1m]) == 0 AND rate(orders_placed_total[1m]) > 0
    for: 1m
    annotations:
      summary: "Matching engine appears stopped"
      description: "Orders are being placed but not matched"
  
  - alert: DatabaseConnectionPoolExhausted
    expr: pg_stat_activity_count > 95
    for: 1m
    annotations:
      summary: "Database connection pool nearly exhausted"
  
  - alert: KafkaConsumerLag
    expr: kafka_consumergroup_lag > 1000
    for: 5m
    annotations:
      summary: "Kafka consumer lag is high"
      description: "Lag is {{ $value }} messages"
```

**Warning Alerts (Email/Slack):**
```yaml
- alert: HighCPUUsage
  expr: rate(process_cpu_seconds_total[5m]) > 0.8
  for: 10m
  
- alert: HighMemoryUsage
  expr: go_memstats_alloc_bytes / go_memstats_sys_bytes > 0.9
  for: 10m

- alert: ElevatedErrorRate
  expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.01
  for: 5m
```

---

## 10. SECURITY ARCHITECTURE

### 10.1 Authentication & Authorization

**JWT-Based Authentication:**
```go
type Claims struct {
    UserID       uuid.UUID `json:"user_id"`
    InstitutionID uuid.UUID `json:"institution_id"`
    Role         string     `json:"role"`
    Permissions  []string   `json:"permissions"`
    jwt.RegisteredClaims
}

func (s *AuthService) ValidateToken(tokenString string) (*Claims, error) {
    token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
        return s.publicKey, nil
    })
    
    if err != nil || !token.Valid {
        return nil, ErrInvalidToken
    }
    
    claims := token.Claims.(*Claims)
    
    // Check token expiry
    if claims.ExpiresAt.Before(time.Now()) {
        return nil, ErrTokenExpired
    }
    
    return claims, nil
}
```

**Rate Limiting:**
```go
// Token bucket algorithm
type RateLimiter struct {
    redis *redis.Client
}

func (rl *RateLimiter) AllowOrder(userID uuid.UUID) (bool, error) {
    key := fmt.Sprintf("rate_limit:order:%s", userID)
    
    // Allow 10 orders per second
    count, err := rl.redis.Incr(ctx, key).Result()
    if err != nil {
        return false, err
    }
    
    if count == 1 {
        rl.redis.Expire(ctx, key, time.Second)
    }
    
    return count <= 10, nil
}
```

### 10.2 Data Encryption

**TLS/SSL:**
```yaml
# Kubernetes Ingress with TLS
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: trade-engine-ingress
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - api.mytrader.com
    secretName: mytrader-tls
  rules:
  - host: api.mytrader.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: trade-engine
            port:
              number: 8080
```

**Database Encryption:**
```sql
-- Enable transparent data encryption (TDE)
ALTER SYSTEM SET ssl = on;
ALTER SYSTEM SET ssl_cert_file = '/path/to/server.crt';
ALTER SYSTEM SET ssl_key_file = '/path/to/server.key';

-- Encrypt sensitive columns
CREATE EXTENSION pgcrypto;

CREATE TABLE users (
    user_id UUID PRIMARY KEY,
    email TEXT,
    phone_encrypted BYTEA, -- Encrypted with pgcrypto
    ...
);
```

### 10.3 Audit Trail

**Comprehensive Logging:**
```go
type AuditLog struct {
    ID          uuid.UUID
    UserID      uuid.UUID
    Action      string // "PLACE_ORDER", "CANCEL_ORDER", "ADMIN_HALT"
    Resource    string // "orders/123"
    OldValue    json.RawMessage
    NewValue    json.RawMessage
    IPAddress   string
    UserAgent   string
    Timestamp   time.Time
}

func (s *AuditService) Log(entry *AuditLog) {
    s.db.Create(entry)
    s.kafka.Publish("audit.logs", entry)
}
```

**Retention Policy:**
```
Audit logs: Retained for 7 years (regulatory compliance)
Order history: Retained for 5 years
Trade history: Retained for 5 years
User data: Retained for 10 years after account closure (KVKK)
```

---

## NEXT STEPS

### Phase 1: Prototype (Week 4-6)
1. Implement core matching engine in Go
2. In-memory order book with Redis persistence
3. Basic order types (Market, Limit, Stop)
4. PostgreSQL integration
5. Unit tests (80%+ coverage)
6. Performance benchmark (1K orders/sec)

### Phase 2: MVP Development (Week 7-12)
1. Complete API endpoints
2. WebSocket real-time updates
3. Kafka event publishing
4. Integration with Wallet Service
5. Admin controls
6. Monitoring & alerting setup
7. Load testing (10K orders/sec target)

### Phase 3: Production Preparation (Week 13-16)
1. Security hardening
2. Disaster recovery procedures
3. Deployment automation (CI/CD)
4. Documentation (API docs, runbooks)
5. Performance tuning
6. Compliance audit

### Phase 4: Production Launch (Week 17+)
1. Pilot testing with select users
2. Gradual rollout (5% → 25% → 50% → 100%)
3. 24/7 monitoring
4. On-call rotation
5. Incident response procedures

---

**Doküman Sonu**

**Onay:** _________________ (Techsonamy - Mustafa Yıldırım)  
**Tarih:** 2024-11-22
