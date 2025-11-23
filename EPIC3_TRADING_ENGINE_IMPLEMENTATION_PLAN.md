# EPIC 3: Trading Engine - Implementation Plan
## Story 3.1-3.11: Complete Trading Module

**Project:** MyCrypto Platform MVP
**EPIC:** 3 (Trading Engine)
**Sprint:** 3-5
**Scope:** Frontend + Backend Integration with Trade Engine Service
**Total Story Points:** 89 points
**Estimated Duration:** 3 sprints (30-35 days)

---

## 📋 Executive Summary

Build a complete **cryptocurrency trading module** that integrates with the parallel Trade Engine service (Day 5 in progress). This plan covers:

1. **Frontend:** React components for trading UI (Order Book, Forms, History)
2. **Backend:** REST API endpoints for trading operations
3. **Real-time:** WebSocket integration for live updates
4. **Integration:** Connect with Trade Engine API, Wallet Service, Auth Service

**Parallelization:**
- ✅ Trade Engine: Running in parallel (Day 5-12)
- ✅ Frontend Development: Can start immediately (uses Trade Engine API)
- ✅ Backend API Layer: Supports frontend (communicates with Trade Engine)
- ✅ QA Testing: E2E tests after integration

---

## 🎯 Implementation Strategy

### Phase 1: Foundation (Story 3.1-3.3)
**Duration:** ~5-7 days
**Focus:** Real-time market data display

- **3.1 Order Book:** WebSocket + API snapshot
- **3.2 Market Ticker:** Real-time price updates
- **3.3 Trade History:** Recent trades stream

### Phase 2: Order Management (Story 3.4-3.7)
**Duration:** ~8-10 days
**Focus:** Order placement and lifecycle

- **3.4 Market Orders:** Immediate execution
- **3.5 Limit Orders:** Price-specific execution
- **3.6 Open Orders:** Portfolio management
- **3.7 Cancel Order:** Order lifecycle

### Phase 3: History & Analytics (Story 3.8-3.11)
**Duration:** ~5-7 days
**Focus:** Reporting and insights

- **3.8 Order History:** Past orders
- **3.9 Trade History:** Executed trades + P&L
- **3.10 Fee Structure:** Educational page
- **3.11 Price Alerts:** (Optional) Notifications

---

## 📊 Story Breakdown with Dependencies

```
Story 3.1 (Order Book - 8 pts)
├─ Depends: Trade Engine API /orderbook (Day 5)
├─ Frontend: OrderBook component
├─ Backend: GET /api/v1/market/orderbook/{symbol}
├─ WebSocket: orderbook updates
└─ Acceptance: ✓ Top 20 levels ✓ Real-time ✓ Depth chart

Story 3.2 (Ticker - 5 pts)
├─ Depends: Trade Engine API /ticker (Day 5)
├─ Frontend: Ticker display component
├─ Backend: GET /api/v1/market/ticker/{symbol}
├─ WebSocket: ticker updates
└─ Acceptance: ✓ Price, Change, Volume, High/Low

Story 3.3 (Trade History - 3 pts)
├─ Depends: Trade Engine API /trades (Day 5)
├─ Frontend: Recent trades component
├─ Backend: GET /api/v1/market/trades/{symbol}
├─ WebSocket: trade stream
└─ Acceptance: ✓ Last 50 trades ✓ Side coloring

Story 3.4 (Market Order - 13 pts) ⭐ CRITICAL
├─ Depends: 3.1, 3.2, Trade Engine API /order (POST)
├─ Frontend: Market order form + validation
├─ Backend: POST /api/v1/trading/order (market)
├─ Integration: Wallet balance check, Fee calc, 2FA verify
├─ WebSocket: order callbacks
└─ Acceptance: ✓ Place order ✓ Confirmation ✓ Execution

Story 3.5 (Limit Order - 13 pts) ⭐ CRITICAL
├─ Depends: 3.1, 3.2, Trade Engine API /order (POST)
├─ Frontend: Limit order form + validation
├─ Backend: POST /api/v1/trading/order (limit)
├─ Integration: Price validation, Time-in-Force (GTC/IOC/FOK)
├─ WebSocket: order callbacks, partial fills
└─ Acceptance: ✓ Place order ✓ Confirmation ✓ Book placement

Story 3.6 (Open Orders - 5 pts)
├─ Depends: 3.4, 3.5, Trade Engine API /orders/open
├─ Frontend: Open orders list + cancel button
├─ Backend: GET /api/v1/trading/orders/open
├─ WebSocket: real-time order updates
└─ Acceptance: ✓ List all open ✓ Cancel functionality

Story 3.7 (Cancel Order - 5 pts)
├─ Depends: 3.6, Trade Engine API /order/{id} (DELETE)
├─ Frontend: Cancel button confirmation
├─ Backend: DELETE /api/v1/trading/order/{orderId}
├─ Integration: Balance unlock, WebSocket notification
└─ Acceptance: ✓ Cancel order ✓ Release balance ✓ <200ms latency

Story 3.8 (Order History - 8 pts)
├─ Depends: Trade Engine persistence, Database queries
├─ Frontend: Order history table + filters/export
├─ Backend: GET /api/v1/trading/orders/history
├─ Pagination: 50 per page
├─ Export: CSV for last 90 days
└─ Acceptance: ✓ All order statuses ✓ Filters ✓ CSV export

Story 3.9 (Trade History - 5 pts)
├─ Depends: Trade Engine trades table, User trades
├─ Frontend: Trades table + P&L display
├─ Backend: GET /api/v1/trading/trades
├─ Pagination: 50 per page
├─ Export: CSV for last 90 days
└─ Acceptance: ✓ Executed trades ✓ P&L calc ✓ CSV export

Story 3.10 (Fee Structure - 2 pts)
├─ Frontend: Static info page
├─ Content: Maker 0.2%, Taker 0.2%, Example calculations
└─ Acceptance: ✓ Fee info displayed ✓ Examples shown

Story 3.11 (Price Alerts - 8 pts) [OPTIONAL]
├─ Depends: Ticker updates, Notification service
├─ Frontend: Alert settings form
├─ Backend: POST /api/v1/alerts, Alert trigger service
├─ Notifications: Email + push when triggered
└─ Acceptance: ✓ Set alerts ✓ Trigger ✓ Notifications
```

---

## 🔧 Technical Architecture

### Frontend Components (React)

#### Directory Structure
```
src/pages/
├── TradingPage.tsx (Main trading view)
│   ├── OrderBook (left side - 30%)
│   ├── Chart (top-right - 30%)
│   └── OrderForm (bottom-right - 40%)
├── OrderBookPage.tsx (Dedicated view)
├── OrderFormPage.tsx
├── OpenOrdersPage.tsx
├── OrderHistoryPage.tsx
└── TradeHistoryPage.tsx

src/components/Trading/
├── OrderBook/
│   ├── OrderBookComponent.tsx
│   ├── DepthChart.tsx
│   └── OrderBookTable.tsx
├── OrderForms/
│   ├── MarketOrderForm.tsx
│   ├── LimitOrderForm.tsx
│   └── OrderConfirmationModal.tsx
├── OpenOrders/
│   ├── OpenOrdersList.tsx
│   └── CancelOrderButton.tsx
├── History/
│   ├── OrderHistory.tsx
│   ├── TradeHistory.tsx
│   └── HistoryTable.tsx
├── Market/
│   ├── Ticker.tsx
│   ├── RecentTrades.tsx
│   └── MarketStats.tsx
└── Common/
    ├── FeeCalculator.tsx
    ├── SlippageWarning.tsx
    └── 2FAVerification.tsx
```

#### Component Specs

**OrderBook Component (Story 3.1)**
```typescript
interface OrderBookProps {
  symbol: string;
  depth?: number; // default 20
  updateInterval?: number; // milliseconds
}

Features:
- Shows bids (descending) and asks (ascending)
- Color-coded: Green (buy), Red (sell)
- Spread highlighted
- User's orders in different color
- Aggregate options (0.1%, 0.5%, 1%)
- Depth visualization (bars on right)

Data Source:
- WebSocket: 100ms updates
- REST: Initial snapshot
```

**MarketOrderForm Component (Story 3.4)**
```typescript
interface MarketOrderFormProps {
  symbol: string;
  userBalance: Decimal;
  currentPrice: Decimal;
}

State:
- Side (BUY/SELL)
- Amount (base or quote currency)
- Percentage slider (25/50/75/100)
- Estimated total
- Fee calculation
- 2FA requirement flag

Validation:
- Min 100 TRY equivalent
- Sufficient balance
- Max 100% of available
```

**LimitOrderForm Component (Story 3.5)**
```typescript
interface LimitOrderFormProps {
  symbol: string;
  userBalance: Decimal;
  currentPrice: Decimal;
}

State:
- Side (BUY/SELL)
- Price (validate ±10% of current)
- Amount (base currency or %)
- Time-in-Force (GTC/IOC/FOK)
- Post-only flag

Validation:
- Price within ±10% of last price
- Min 100 TRY equivalent
- Sufficient balance
```

### Backend API Endpoints (NestJS)

#### Market Data Endpoints (Stories 3.1-3.3)

```
GET /api/v1/market/orderbook/{symbol}
├─ Response: {
│   symbol: string
│   bids: [[price, quantity, total], ...]
│   asks: [[price, quantity, total], ...]
│   lastUpdateId: number
│   spread: Decimal
│   timestamp: ISOString
│ }
├─ Latency SLA: <100ms
└─ Cache: 5 seconds

GET /api/v1/market/ticker/{symbol}
├─ Response: {
│   symbol: string
│   lastPrice: Decimal
│   priceChange: Decimal
│   priceChangePercent: Decimal
│   highPrice: Decimal
│   lowPrice: Decimal
│   volume: Decimal
│   quoteAssetVolume: Decimal
│ }
├─ Latency SLA: <50ms
└─ Cache: 1 second

GET /api/v1/market/trades/{symbol}?limit=50
├─ Response: [{
│   id: uuid
│   symbol: string
│   price: Decimal
│   quantity: Decimal
│   side: 'BUY' | 'SELL'
│   executedAt: ISOString
│ }, ...]
├─ Latency SLA: <100ms
└─ Cache: Real-time
```

#### Order Management Endpoints (Stories 3.4-3.7)

```
POST /api/v1/trading/order
├─ Request: {
│   symbol: string (BTC_TRY, ETH_TRY, USDT_TRY)
│   side: 'BUY' | 'SELL'
│   type: 'MARKET' | 'LIMIT'
│   quantity: Decimal
│   price?: Decimal (for LIMIT)
│   timeInForce?: 'GTC' | 'IOC' | 'FOK' (default: GTC)
│   postOnly?: boolean (for LIMIT)
│   clientOrderId?: uuid (for idempotency)
│ }
├─ Response: {
│   orderId: uuid
│   symbol: string
│   side: string
│   type: string
│   quantity: Decimal
│   price?: Decimal
│   estimatedTotal: Decimal
│   fees: Decimal
│   status: 'PENDING' | 'OPEN' | 'FILLED' | 'CANCELLED'
│   createdAt: ISOString
│ }
├─ Validations:
│   - Min order: 100 TRY
│   - 2FA for >10,000 TRY
│   - Balance check (fee included)
│   - Price validation (±10% for limit)
└─ Latency SLA: <100ms p99

DELETE /api/v1/trading/order/{orderId}
├─ Response: {
│   orderId: uuid
│   status: 'CANCELLED'
│   releasedBalance: Decimal
│ }
├─ Validations:
│   - Order ownership check
│   - Only OPEN/PENDING orders
└─ Latency SLA: <200ms p99

GET /api/v1/trading/orders/open?pair=BTC_TRY&side=BUY
├─ Response: [{
│   orderId: uuid
│   symbol: string
│   side: 'BUY' | 'SELL'
│   type: 'MARKET' | 'LIMIT'
│   price?: Decimal
│   quantity: Decimal
│   filled: Decimal
│   status: 'OPEN' | 'PARTIALLY_FILLED'
│   createdAt: ISOString
│ }, ...]
├─ Pagination: limit=20, offset=0
└─ Latency SLA: <100ms
```

#### History Endpoints (Stories 3.8-3.9)

```
GET /api/v1/trading/orders/history?page=1&limit=50&pair=BTC_TRY&status=FILLED
├─ Response: {
│   orders: [{
│     orderId: uuid
│     symbol: string
│     side: string
│     type: string
│     price: Decimal
│     quantity: Decimal
│     filled: Decimal
│     filledPercent: number
│     fees: Decimal
│     status: string
│     createdAt: ISOString
│     closedAt?: ISOString
│   }, ...]
│   total: number
│   page: number
│ }
├─ Filters: pair, side, status, dateRange
├─ Export: CSV for past 90 days
└─ Latency SLA: <200ms

GET /api/v1/trading/trades?page=1&limit=50&pair=BTC_TRY
├─ Response: {
│   trades: [{
│     tradeId: uuid
│     symbol: string
│     side: string
│     price: Decimal
│     quantity: Decimal
│     fee: Decimal
│     total: Decimal
│     executedAt: ISOString
│   }, ...]
│   total: number
│   pnl?: {
│     realizedPnl: Decimal
│     avgCost: Decimal
│     avgPrice: Decimal
│   }
│ }
├─ Filters: pair, side, dateRange
├─ Export: CSV for past 90 days
└─ Latency SLA: <200ms
```

### WebSocket Real-Time Updates

```
Connection: wss://api.exchange.com/ws?token={JWT}

Subscriptions:

1. Order Book Updates
   Channel: orderbook:{symbol}
   Message: {
     type: 'orderbook_snapshot' | 'orderbook_update'
     symbol: string
     bids: [[price, quantity, action], ...]
     asks: [[price, quantity, action], ...]
     lastUpdateId: number
     timestamp: ISOString
   }
   Frequency: 100ms batches

2. Ticker Updates
   Channel: ticker:{symbol}
   Message: {
     type: 'ticker'
     symbol: string
     lastPrice: Decimal
     priceChange: Decimal
     ... (same as REST response)
   }
   Frequency: 1 second

3. Trade Updates
   Channel: trades:{symbol}
   Message: {
     type: 'trade'
     tradeId: uuid
     symbol: string
     side: 'BUY' | 'SELL'
     price: Decimal
     quantity: Decimal
     executedAt: ISOString
   }
   Frequency: Real-time

4. User Order Updates
   Channel: orders (private, authenticated)
   Message: {
     type: 'order_created' | 'order_updated' | 'order_filled' | 'order_cancelled'
     orderId: uuid
     symbol: string
     status: string
     filled: Decimal
     ... (full order details)
   }
   Frequency: Real-time

5. User Balance Updates
   Channel: balances (private)
   Message: {
     type: 'balance_updated'
     asset: 'TRY' | 'BTC' | 'ETH' | 'USDT'
     available: Decimal
     locked: Decimal
     total: Decimal
     timestamp: ISOString
   }
   Frequency: Real-time
```

---

## 📅 Sprint-by-Sprint Breakdown

### Sprint 3: Phase 1 (Market Data Display)
**Duration:** Days 1-10 (roughly 2 weeks)
**Points:** ~16 points

#### Day 1-3: Story 3.1 - Order Book
- **Backend Task:**
  - GET /api/v1/market/orderbook/{symbol} endpoint
  - Integration with Trade Engine API
  - Snapshot caching (Redis)
  - Response formatting
  - Tests (unit + integration)

- **Frontend Task:**
  - OrderBook component with Bids/Asks table
  - DepthChart visualization (bars)
  - Spread highlighting
  - User order highlighting
  - Mock data for testing
  - Component tests

- **WebSocket:**
  - Channel: orderbook:{symbol}
  - Real-time update integration
  - Client-side reconciliation

#### Day 4-6: Story 3.2 - Ticker
- **Backend Task:**
  - GET /api/v1/market/ticker/{symbol} endpoint
  - Trade Engine integration
  - Cache (1 second TTL)
  - Response formatting
  - Tests

- **Frontend Task:**
  - Ticker display component
  - Color coding (green/red)
  - All pairs listing
  - Search/filter functionality
  - Component tests

- **WebSocket:**
  - Channel: ticker:{symbol}
  - Update frequency: 1 second

#### Day 7-9: Story 3.3 - Trade History
- **Backend Task:**
  - GET /api/v1/market/trades/{symbol}?limit=50
  - Trade Engine integration
  - Sorting by timestamp (DESC)
  - Tests

- **Frontend Task:**
  - Recent trades list
  - Side coloring
  - Scrollable
  - Auto-scroll option (toggle)
  - Tests

- **WebSocket:**
  - Channel: trades:{symbol}
  - Real-time trade stream

#### Day 10: Integration & Testing
- E2E tests for order book + ticker + trades
- Performance testing (latency)
- Load testing (concurrent WebSocket connections)
- Fix bugs

**Deliverables:**
- ✅ Order book real-time display
- ✅ Market ticker
- ✅ Recent trades stream
- ✅ All WebSocket channels
- ✅ Test coverage >80%

---

### Sprint 4: Phase 2 (Order Management)
**Duration:** Days 11-20
**Points:** ~36 points

#### Day 11-15: Story 3.4 & 3.5 - Place Orders
- **Backend Tasks (Parallel):**
  - POST /api/v1/trading/order endpoint
  - Request validation (min order, balance, price range)
  - 2FA verification (for >10K TRY)
  - Fee calculation integration
  - Trade Engine API integration (`PlaceOrder()`)
  - Database persistence
  - Response formatting
  - Comprehensive tests

- **Frontend Tasks (Parallel):**
  - MarketOrderForm component
  - LimitOrderForm component
  - Amount input options (base, quote, percentage)
  - Price validation (±10%)
  - Time-in-Force options (GTC/IOC/FOK)
  - Confirmation modals
  - Error handling
  - Component tests

- **Integration:**
  - Wallet balance check
  - Fee display
  - 2FA prompt if needed
  - Order notification

#### Day 16-18: Story 3.6 & 3.7 - Open Orders
- **Backend Tasks:**
  - GET /api/v1/trading/orders/open endpoint
  - DELETE /api/v1/trading/order/{orderId} endpoint
  - Order filtering (pair, side, type)
  - Pagination
  - Wallet integration (balance unlock)
  - Tests

- **Frontend Tasks:**
  - OpenOrdersList component
  - Cancel button with confirmation
  - Real-time updates (WebSocket)
  - Filtering UI
  - Cancel All functionality
  - Tests

- **WebSocket:**
  - Channel: orders (private)
  - Messages: order_created, order_updated, order_cancelled

#### Day 19-20: Testing & Fixes
- Integration tests for order placement
- E2E tests (place order → execution → balance update)
- Performance testing (100 orders/sec)
- Bug fixes

**Deliverables:**
- ✅ Market & Limit order placement
- ✅ Open orders management
- ✅ Order cancellation
- ✅ Real-time order updates
- ✅ Test coverage >80%

---

### Sprint 5: Phase 3 (History & Analytics)
**Duration:** Days 21-30
**Points:** ~20 points

#### Day 21-23: Story 3.8 - Order History
- **Backend Task:**
  - GET /api/v1/trading/orders/history endpoint
  - Pagination (50 per page)
  - Filters (pair, side, status, dateRange)
  - CSV export functionality
  - Database queries (optimized)
  - Tests

- **Frontend Task:**
  - OrderHistory component with table
  - Filtering UI (pair, status, date range)
  - Pagination controls
  - CSV export button
  - Order detail modal (fill history)
  - Tests

#### Day 24-26: Story 3.9 - Trade History
- **Backend Task:**
  - GET /api/v1/trading/trades endpoint
  - P&L calculation (basic)
  - Pagination
  - Filters
  - CSV export
  - Tests

- **Frontend Task:**
  - TradeHistory component
  - P&L display
  - Filtering UI
  - Pagination
  - CSV export
  - Tests

#### Day 27-28: Story 3.10 - Fee Structure
- **Frontend Task:**
  - Static info page
  - Maker/Taker fee display
  - Example calculations
  - Design consistency

#### Day 29-30: Integration & Testing
- E2E tests for complete trading flow
- Performance baselines
- Security review
- Production readiness

**Deliverables:**
- ✅ Order & trade history
- ✅ History filtering & export
- ✅ P&L calculations
- ✅ Fee information page
- ✅ Complete test coverage

---

## 🔌 Integration Checklist

### With Trade Engine Service

- [ ] **Verify Trade Engine API is available** (Day 5-6)
- [ ] **Snapshot API endpoint:** `GET /api/v1/orderbook/{symbol}`
- [ ] **WebSocket server:** `wss://...` for real-time updates
- [ ] **Order placement API:** `POST /api/v1/orders`
- [ ] **Order cancellation API:** `DELETE /api/v1/orders/{id}`
- [ ] **Order book object structure** matches schema
- [ ] **Error handling** for Trade Engine unavailability

### With Wallet Service

- [ ] **Balance endpoint:** `GET /api/v1/wallet/balances`
- [ ] **Balance lock:** `POST /api/v1/wallet/lock` (for order placement)
- [ ] **Balance unlock:** `POST /api/v1/wallet/unlock` (for cancellation)
- [ ] **Transaction history:** For trade settlement records

### With Auth Service

- [ ] **JWT token validation** in API endpoints
- [ ] **2FA verification** for large orders
- [ ] **User context extraction** from token

### With Frontend

- [ ] **Redux store** for trading state
- [ ] **API client** (Axios) with interceptors
- [ ] **WebSocket client** connection management
- [ ] **Error boundaries** for component resilience

---

## 📈 Success Criteria

### Functional Requirements
- ✅ All 11 stories implemented (or 10 if 3.11 deferred)
- ✅ Market data display real-time (<100ms latency)
- ✅ Order placement & cancellation working
- ✅ Order/trade history functional
- ✅ WebSocket connections stable

### Performance Targets
- ✅ Order placement: <100ms p99
- ✅ API responses: <200ms p99
- ✅ WebSocket updates: <100ms
- ✅ 1000 orders/sec sustained (from Trade Engine)

### Quality Gates
- ✅ Test coverage: >80%
- ✅ Critical bugs: 0
- ✅ TypeScript errors: 0
- ✅ Security review passed

### User Experience
- ✅ Responsive design (mobile + desktop)
- ✅ Loading states clear
- ✅ Error messages helpful
- ✅ Accessibility (WCAG 2.1 AA)

---

## 🚀 Next Steps

### Immediate (This Week)
1. **Trade Engine Day 5-6 Completion**
   - Verify HTTP API endpoints ready
   - Confirm WebSocket server operational
   - Get API documentation

2. **Frontend Setup**
   - Create Trading page scaffold
   - Setup Redux slices for trading state
   - Create API client module

3. **Backend Setup**
   - Create controller/service structure
   - Setup Trade Engine client
   - Create basic endpoints

### Week 2
1. **Story 3.1 Development**
   - Order Book component + API
   - WebSocket integration
   - Initial testing

2. **Story 3.2 Development**
   - Ticker component + API
   - Real-time updates

3. **Story 3.3 Development**
   - Trade history component + API

### Week 3+
1. **Stories 3.4-3.7:** Order management
2. **Stories 3.8-3.9:** History & analytics
3. **Story 3.10:** Fee information
4. **Story 3.11:** (Optional) Price alerts

---

## 📞 Dependencies & Blockers

### External Dependencies
- ✅ **Trade Engine API** (Available from Day 5)
- ✅ **Wallet Service** (Already implemented)
- ✅ **Auth Service** (Already implemented)
- ⏳ **RabbitMQ** (For notifications, can mock initially)

### Potential Blockers
- ⚠️ Trade Engine API changes (monitor closely)
- ⚠️ WebSocket server scaling (test with 500+ connections)
- ⚠️ Database query performance (add indexes)

### Mitigation Strategies
- Mock Trade Engine responses for frontend development
- Use feature flags for gradual rollout
- Load testing early (Week 2)
- Database performance testing (Week 3)

---

**Status:** 🟢 READY TO START
**Last Updated:** 2025-11-23
**Next Review:** After Trade Engine Day 5 completion
