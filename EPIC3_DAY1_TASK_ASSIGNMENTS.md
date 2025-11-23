# EPIC 3: Trading Engine - Day 1 Task Assignments
## Sprint 3, Day 1: Foundation & Setup

**Date:** November 24, 2025
**Sprint:** Sprint 3 (Days 1-10)
**Focus:** Story 3.1 - Order Book (Real-Time Display)
**Total Points:** ~8 points
**Estimated Hours:** 10 hours (parallel tasks)
**Status:** 🎯 Ready to Start

---

## 🎯 Day 1 Objectives

Today marks the start of **EPIC 3: Trading Engine** module development. We're starting with **Story 3.1 - Order Book**, which is the **foundation for all other trading features**.

**Key Goals:**
1. ✅ Backend: GET /api/v1/market/orderbook/{symbol} endpoint
2. ✅ Frontend: OrderBook React component scaffold
3. ✅ WebSocket: Basic connection + orderbook channel subscription
4. ✅ Integration: Trade Engine API client setup
5. ✅ Testing: Unit tests for components & endpoints

**Parallelization:** All tasks run in parallel → 10 hours total, not 40

---

## 📋 Task Breakdown by Role

### 👨‍💻 Backend Developer (NestJS)

#### Task BE-EPIC3-001: Trade Engine API Client Setup
**Duration:** 2 hours
**Points:** 1.5

**Acceptance Criteria:**
- [ ] Create `src/services/trade-engine.client.ts`
- [ ] Implement Trade Engine API client with methods:
  - `getOrderBook(symbol: string, depth?: number)`
  - `getTickerData(symbol: string)`
  - `getRecentTrades(symbol: string)`
  - `placeOrder(order: OrderRequest)`
  - `cancelOrder(orderId: uuid)`
  - `getOpenOrders(userId: uuid)`
- [ ] Error handling (timeout, connection errors)
- [ ] Retry logic (3 attempts, exponential backoff)
- [ ] Request/response logging
- [ ] Type definitions for all responses
- [ ] Unit tests (>80% coverage)

**Implementation Details:**
```typescript
// src/services/trade-engine.client.ts
import axios from 'axios';
import { Logger } from '@nestjs/common';

export interface OrderBookResponse {
  symbol: string;
  bids: Array<[price: string, quantity: string, total: string]>;
  asks: Array<[price: string, quantity: string, total: string]>;
  lastUpdateId: number;
  spread: string;
  timestamp: string;
}

export class TradeEngineClient {
  private client = axios.create({
    baseURL: process.env.TRADE_ENGINE_API_URL,
    timeout: 5000,
  });

  async getOrderBook(symbol: string, depth = 20): Promise<OrderBookResponse> {
    // Implementation with retry logic
  }
  // ... other methods
}
```

**Resources:**
- Trade Engine API spec: `/Inputs/TradeEngine/trade-engine-api-spec.yaml`
- Existing clients: `src/services/wallet.client.ts`

**Definition of Done:**
- [ ] All methods implemented
- [ ] Error handling tested
- [ ] Retry logic verified
- [ ] Unit tests pass (>80%)
- [ ] TypeScript strict mode

---

#### Task BE-EPIC3-002: Market Orderbook Endpoint
**Duration:** 3 hours
**Points:** 2

**Acceptance Criteria:**
- [ ] Create `src/modules/market/market.controller.ts`
- [ ] Endpoint: `GET /api/v1/market/orderbook/{symbol}`
- [ ] Response structure:
  ```json
  {
    "symbol": "BTC_TRY",
    "bids": [["50000", "0.5", "25000"], ...],
    "asks": [["50100", "0.3", "15030"], ...],
    "lastUpdateId": 12345,
    "spread": "100",
    "timestamp": "2025-11-24T10:00:00Z"
  }
  ```
- [ ] Request validation (symbol exists: BTC_TRY, ETH_TRY, USDT_TRY)
- [ ] Query param: `?depth=20` (default 20, max 100)
- [ ] Cache: Redis 5-second TTL
- [ ] Error handling (Trade Engine down, invalid symbol)
- [ ] Latency SLA: <100ms p99
- [ ] Integration tests with mocked Trade Engine

**Implementation Details:**
```typescript
// src/modules/market/market.controller.ts
import { Controller, Get, Param, Query } from '@nestjs/common';
import { MarketService } from './market.service';

@Controller('api/v1/market')
export class MarketController {
  constructor(private marketService: MarketService) {}

  @Get('orderbook/:symbol')
  async getOrderBook(
    @Param('symbol') symbol: string,
    @Query('depth') depth: number = 20,
  ) {
    return this.marketService.getOrderBook(symbol, depth);
  }
}
```

**Dependencies:**
- ✅ Task BE-EPIC3-001 (Trade Engine client)
- ✅ Redis caching module (already exists)

**Definition of Done:**
- [ ] Endpoint working and tested
- [ ] Cache working (verify with Redis)
- [ ] Latency <100ms p99
- [ ] Integration tests pass
- [ ] Error scenarios tested

---

#### Task BE-EPIC3-003: WebSocket Server - Orderbook Channel
**Duration:** 2.5 hours
**Points:** 2

**Acceptance Criteria:**
- [ ] Setup WebSocket server (NestJS gateway)
- [ ] Create `src/gateways/market.gateway.ts`
- [ ] Channel: `orderbook:{symbol}`
- [ ] Client subscription: Subscribe to `orderbook:BTC_TRY`
- [ ] Server broadcasts:
  - Initial snapshot on connection
  - Incremental updates (100ms batches)
- [ ] Message format:
  ```json
  {
    "type": "orderbook_snapshot|orderbook_update",
    "symbol": "BTC_TRY",
    "bids": [[...], ...],
    "asks": [[...], ...],
    "lastUpdateId": 12345,
    "timestamp": "2025-11-24T10:00:00Z"
  }
  ```
- [ ] Connection management (heartbeat, disconnect)
- [ ] Unit tests (mocked clients)

**Implementation Details:**
```typescript
// src/gateways/market.gateway.ts
import { WebSocketGateway, WebSocketServer, SubscribeMessage } from '@nestjs/websockets';

@WebSocketGateway()
export class MarketGateway {
  @WebSocketServer() server: Server;

  @SubscribeMessage('subscribe')
  handleSubscribe(client: Socket, payload: { channel: string }) {
    client.join(payload.channel);
    // Send initial snapshot
  }

  broadcastOrderbookUpdate(symbol: string, data: OrderBookResponse) {
    this.server.to(`orderbook:${symbol}`).emit('update', {
      type: 'orderbook_update',
      ...data,
    });
  }
}
```

**Definition of Done:**
- [ ] WebSocket server operational
- [ ] Subscribe/unsubscribe working
- [ ] Broadcast testing passed
- [ ] Connection lifecycle tested
- [ ] Unit tests pass

---

#### Task BE-EPIC3-004: Unit Tests for Backend Tasks
**Duration:** 2 hours
**Points:** 1.5

**Acceptance Criteria:**
- [ ] Tests for BE-EPIC3-001 (Trade Engine client)
  - [ ] Successful API calls
  - [ ] Retry logic
  - [ ] Timeout handling
  - [ ] Validation
- [ ] Tests for BE-EPIC3-002 (Orderbook endpoint)
  - [ ] Valid symbol
  - [ ] Invalid symbol (400)
  - [ ] Cache hit/miss
  - [ ] Latency SLA verification
- [ ] Tests for BE-EPIC3-003 (WebSocket)
  - [ ] Subscription
  - [ ] Broadcast
  - [ ] Disconnect
- [ ] Coverage: >80% for all tasks
- [ ] All tests passing

**Command:**
```bash
npm run test -- --coverage src/services/trade-engine.client.ts
npm run test -- --coverage src/modules/market/market.controller.ts
npm run test -- --coverage src/gateways/market.gateway.ts
```

---

### 🎨 Frontend Developer (React)

#### Task FE-EPIC3-001: Trading Page Scaffold & Redux Store
**Duration:** 2 hours
**Points:** 1.5

**Acceptance Criteria:**
- [ ] Create `src/pages/TradingPage.tsx`
- [ ] Create Redux slice: `src/store/slices/tradingSlice.ts`
- [ ] Redux state structure:
  ```typescript
  {
    trading: {
      selectedSymbol: 'BTC_TRY',
      orderBook: {
        bids: [],
        asks: [],
        lastUpdateId: 0,
        spread: '0',
      },
      ticker: {
        lastPrice: '0',
        priceChange: '0',
        volume: '0',
      },
      recentTrades: [],
      loading: false,
      error: null,
    }
  }
  ```
- [ ] Dispatch actions: `setSelectedSymbol`, `setOrderBook`, `setTicker`, `setRecentTrades`
- [ ] Default layout scaffold (3-column: orderbook, chart, form)
- [ ] Placeholder components
- [ ] TypeScript types defined

**Implementation:**
```typescript
// src/pages/TradingPage.tsx
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';

export const TradingPage: React.FC = () => {
  const dispatch = useDispatch();
  const { selectedSymbol, orderBook } = useSelector((state: RootState) => state.trading);

  return (
    <div className="trading-page">
      {/* Content will be filled in by component tasks */}
    </div>
  );
};
```

---

#### Task FE-EPIC3-002: OrderBook Component - Table View
**Duration:** 3 hours
**Points:** 2

**Acceptance Criteria:**
- [ ] Create `src/components/Trading/OrderBook/OrderBookComponent.tsx`
- [ ] Display bids (left) and asks (right) in tables
- [ ] Columns: Price, Amount, Total, %Depth
- [ ] Bids: Descending price order, green background
- [ ] Asks: Ascending price order, red background
- [ ] Spread display: "Spread: 100 TRY (0.20%)"
- [ ] Hover highlights (light shade)
- [ ] Responsive grid (bids 40%, asks 40%, spread/chart 20%)
- [ ] Mock data initially (replace with real API later)
- [ ] Component test with mock data
- [ ] TypeScript strict mode

**Implementation:**
```typescript
// src/components/Trading/OrderBook/OrderBookComponent.tsx
interface OrderBookProps {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  spread: Decimal;
  symbol: string;
}

export const OrderBookComponent: React.FC<OrderBookProps> = ({
  bids,
  asks,
  spread,
  symbol,
}) => {
  return (
    <div className="order-book">
      {/* Bids table */}
      {/* Spread display */}
      {/* Asks table */}
    </div>
  );
};
```

**Styling:**
- Use Material-UI or existing component library
- Consistent with existing wallet UI
- Responsive (mobile: stack vertically)

**Definition of Done:**
- [ ] Component renders correctly
- [ ] Tables display mock data
- [ ] Responsive design verified
- [ ] Tests passing
- [ ] No TypeScript errors

---

#### Task FE-EPIC3-003: API Client for Trading Module
**Duration:** 1.5 hours
**Points:** 1

**Acceptance Criteria:**
- [ ] Create `src/api/tradingApi.ts`
- [ ] Axios client with methods:
  - `getOrderBook(symbol: string)`
  - `getTicker(symbol: string)`
  - `getRecentTrades(symbol: string)`
  - `placeOrder(order: OrderRequest)`
  - `getOpenOrders()`
  - `cancelOrder(orderId: uuid)`
  - `getOrderHistory(page: number)`
  - `getTradeHistory(page: number)`
- [ ] Error handling (retry, error messages)
- [ ] Request/response interceptors
- [ ] TypeScript types for all endpoints

**Dependencies:**
- ✅ Existing API setup (src/api/auth.ts, src/api/wallet.ts)

---

#### Task FE-EPIC3-004: WebSocket Client Setup
**Duration:** 1.5 hours
**Points:** 1

**Acceptance Criteria:**
- [ ] Create `src/services/websocket.service.ts`
- [ ] Socket.io client initialization
- [ ] Methods:
  - `connect(token: string)`
  - `subscribe(channel: string)`
  - `unsubscribe(channel: string)`
  - `disconnect()`
  - `onMessage(callback: Function)`
- [ ] Event handlers for:
  - `orderbook_snapshot`
  - `orderbook_update`
  - `order_update`
  - `balance_update`
- [ ] Connection retry logic
- [ ] Unit tests (mocked socket)

**Implementation:**
```typescript
// src/services/websocket.service.ts
import io, { Socket } from 'socket.io-client';

export class WebSocketService {
  private socket: Socket | null = null;

  connect(token: string) {
    this.socket = io(process.env.REACT_APP_WS_URL, {
      auth: { token },
    });
  }

  subscribe(channel: string) {
    this.socket?.emit('subscribe', { channel });
  }

  // ...
}
```

---

#### Task FE-EPIC3-005: Component Tests
**Duration:** 2 hours
**Points:** 1.5

**Acceptance Criteria:**
- [ ] Tests for TradingPage
  - [ ] Renders correctly
  - [ ] Redux state connected
  - [ ] Symbol selector works
- [ ] Tests for OrderBookComponent
  - [ ] Renders bids and asks
  - [ ] Correct coloring
  - [ ] Spread displayed
  - [ ] Responsive layout
- [ ] Tests for API client
  - [ ] All methods exist
  - [ ] Correct URLs called
  - [ ] Error handling
- [ ] Tests for WebSocket service
  - [ ] Connection works
  - [ ] Subscribe/unsubscribe
  - [ ] Message events
- [ ] Coverage: >80%

**Commands:**
```bash
npm run test -- src/pages/TradingPage.test.tsx
npm run test -- src/components/Trading/OrderBook/OrderBookComponent.test.tsx
npm run test -- src/api/tradingApi.test.ts
npm run test -- src/services/websocket.service.test.ts
```

---

### 🗄️ Database Engineer

#### Task DB-EPIC3-001: Trading Indexes & Optimization
**Duration:** 2 hours
**Points:** 1.5

**Acceptance Criteria:**
- [ ] Verify Trade Engine database schema (from Trade Engine DDL)
- [ ] Check indexes on orders table:
  - [ ] PRIMARY: id
  - [ ] INDEX: user_id, symbol, status
  - [ ] INDEX: created_at (for sorting/pagination)
- [ ] Check indexes on trades table:
  - [ ] PRIMARY: id
  - [ ] INDEX: buyer_user_id, seller_user_id
  - [ ] INDEX: symbol, executed_at
- [ ] Query optimization:
  - [ ] Order history query <200ms for 50 rows
  - [ ] Trade history query <200ms for 50 rows
- [ ] Create migration if any missing indexes
- [ ] EXPLAIN ANALYZE on slow queries
- [ ] Document findings

**Queries to Optimize:**
```sql
-- Order history pagination
SELECT * FROM orders
WHERE user_id = $1
ORDER BY created_at DESC
LIMIT 50 OFFSET $2;

-- Trade history
SELECT * FROM trades
WHERE buyer_user_id = $1 OR seller_user_id = $1
ORDER BY executed_at DESC
LIMIT 50 OFFSET $2;
```

---

### 🧪 QA Engineer

#### Task QA-EPIC3-001: Test Plan for Story 3.1
**Duration:** 2 hours
**Points:** 1.5

**Acceptance Criteria:**
- [ ] Create comprehensive test plan: `EPIC3_STORY3.1_TEST_PLAN.md`
- [ ] Test scenarios:
  - [ ] Happy path: Get orderbook, verify structure
  - [ ] Invalid symbol: 400 error
  - [ ] Latency: <100ms p99
  - [ ] Cache: Second request faster
  - [ ] WebSocket: Subscribe and receive updates
  - [ ] Error handling: Trade Engine down
- [ ] Test tools: Postman collection, Jest tests
- [ ] Expected results documented
- [ ] Test data: Sample orderbooks for BTC_TRY, ETH_TRY

**Postman Collection:**
```json
{
  "name": "EPIC3 - Trading - Story 3.1",
  "item": [
    {
      "name": "GET /api/v1/market/orderbook/BTC_TRY",
      "request": {
        "method": "GET",
        "url": "{{base_url}}/api/v1/market/orderbook/BTC_TRY"
      }
    }
  ]
}
```

---

## 📅 Parallel Execution Timeline

```
9:00 AM
├─ Backend: Setup Trade Engine client (2h)
├─ Frontend: Redux store setup (2h)
├─ Database: Index review (2h)
└─ QA: Test plan (2h)

11:30 AM
├─ Backend: Orderbook endpoint (3h)
├─ Frontend: OrderBook component (3h)
└─ Database: Query optimization (PARALLEL)

1:30 PM (LUNCH)

2:30 PM
├─ Backend: WebSocket orderbook channel (2.5h)
├─ Frontend: API client setup (1.5h)
└─ QA: Test case preparation

4:30 PM
├─ Backend: Unit tests (2h)
├─ Frontend: WebSocket client (1.5h)
└─ QA: Test tool setup

6:30 PM
└─ Frontend: Component tests (2h)

8:00 PM
└─ Integration testing (if time permits)
```

**Total:** 10 hours of work spread across 4 agents = 10 effective hours

---

## ✅ Completion Checklist

### Backend
- [ ] Trade Engine client implemented & tested
- [ ] Orderbook endpoint working
- [ ] WebSocket gateway operational
- [ ] All unit tests passing (>80% coverage)
- [ ] Error handling verified
- [ ] Documentation updated

### Frontend
- [ ] Trading page scaffold complete
- [ ] Redux store configured
- [ ] OrderBook component displays mock data
- [ ] API client ready
- [ ] WebSocket service created
- [ ] All tests passing (>80% coverage)

### Database
- [ ] Indexes verified/created
- [ ] Slow queries optimized
- [ ] Performance baseline documented

### QA
- [ ] Test plan complete
- [ ] Postman collection ready
- [ ] Test scenarios documented
- [ ] Ready for E2E testing

### Integration
- [ ] Backend + Frontend connects
- [ ] Real API calls working (mock Trade Engine)
- [ ] WebSocket messages flowing
- [ ] Error scenarios handled

---

## 🎁 Deliverables (End of Day)

1. **Code:**
   - ✅ Backend: 4 tasks complete (Trade Engine client, Orderbook endpoint, WebSocket, tests)
   - ✅ Frontend: 5 tasks complete (Page, component, API client, WebSocket, tests)
   - ✅ Database: Indexes verified + migrations if needed
   - ✅ All tests passing

2. **Documentation:**
   - ✅ Trade Engine client API docs
   - ✅ Orderbook endpoint spec
   - ✅ WebSocket channel docs
   - ✅ Component Storybook entries
   - ✅ Test plan document

3. **Commits:**
   - ✅ Feature branch: `feature/epic3-story3.1-foundation`
   - ✅ Commits: 1 per task (clean history)
   - ✅ PR description with acceptance criteria

4. **Status Report:**
   - ✅ Test coverage: >80%
   - ✅ No TypeScript errors
   - ✅ Performance baselines recorded
   - ✅ Blockers identified (if any)

---

## 🚀 Next Steps (Day 2)

**Day 2 will focus on:**
1. Story 3.1 - Depth Chart visualization
2. Story 3.1 - User order highlighting
3. Story 3.1 - Real Trade Engine API integration
4. Story 3.2 - Ticker component start

---

**Status:** 🟢 READY TO KICKOFF
**Prepared by:** Claude Code
**Date:** 2025-11-23
