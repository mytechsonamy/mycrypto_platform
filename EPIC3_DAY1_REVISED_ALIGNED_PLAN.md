# EPIC 3: Trading Engine - Day 1 REVISED PLAN
## Aligned with Trade Engine Week 2 (Nov 24-30)

**Date:** November 24, 2025
**Sprint:** Sprint 3, Day 1
**Status:** ✅ REVISED - Removed backend duplication with Trade Engine
**Key Change:** EPIC 3 now consumes Trade Engine APIs instead of building them

---

## 📋 Key Alignment

### Trade Engine Week 2 (Nov 24-30) - Parallel Tasks

**Trade Engine will deliver (BACKEND-010, BACKEND-011, BACKEND-012):**
```
✅ WebSocket server with real-time channels
✅ Market data APIs (GET /orderbook, /ticker, /trades)
✅ Advanced order types (Stop, IOC, FOK, Post-Only)
✅ Performance optimization
```

**EPIC 3 should consume these, not duplicate them:**
- ❌ NO: Building orderbook API (Trade Engine does this)
- ❌ NO: Building WebSocket gateway (Trade Engine does this)
- ✅ YES: Building OrderBook UI component
- ✅ YES: Creating Trade Engine API client wrapper
- ✅ YES: Integrating WebSocket into frontend

---

## 🎯 Revised Day 1 Objectives

1. ✅ **Trade Engine API Client** - Wrapper for all Trade Engine endpoints
2. ✅ **OrderBook React Component** - Consume Trade Engine orderbook API
3. ✅ **WebSocket Integration** - Subscribe to Trade Engine WS channels
4. ✅ **Redux Trading Store** - Manage market data state
5. ✅ **API & WebSocket Tests** - Unit & integration tests
6. ✅ **Test Plan** - QA scenarios for integration

---

## 📋 REVISED Task Breakdown by Role

### 👨‍💻 Backend Developer (NestJS)

#### Task BE-EPIC3-001: Trade Engine API Client (REVISED)
**Duration:** 2.5 hours
**Points:** 1.5

**What Changed:**
- ✅ KEEP: Create wrapper client for Trade Engine APIs
- ❌ REMOVE: Building API endpoints (Trade Engine does this)
- ✅ ADD: WebSocket client methods

**Acceptance Criteria:**
- [ ] Create `src/services/trade-engine.client.ts`
- [ ] Implement methods for:
  - `getOrderBook(symbol, depth)` → calls Trade Engine
  - `getTicker(symbol)` → calls Trade Engine
  - `getRecentTrades(symbol)` → calls Trade Engine
  - `placeOrder(order)` → calls Trade Engine
  - `cancelOrder(orderId)` → calls Trade Engine
  - `subscribeToOrderbook(symbol, callback)` → WebSocket
  - `subscribeToTicker(symbol, callback)` → WebSocket
  - `subscribeToPrices(symbols, callback)` → WebSocket
- [ ] Error handling (timeout, connection errors, retry logic)
- [ ] Type definitions for all Trade Engine responses
- [ ] Unit tests (>80% coverage)

**Trade Engine Endpoints (Will be available Day 5-6):**
```
GET /api/v1/orderbook/{symbol}
GET /api/v1/ticker/{symbol}
GET /api/v1/trades/{symbol}
POST /api/v1/orders
DELETE /api/v1/orders/{orderId}
GET /api/v1/orders/open
WS /ws (orderbook:{symbol}, ticker:{symbol}, trades:{symbol})
```

**Implementation Example:**
```typescript
export class TradeEngineClient {
  async getOrderBook(symbol: string, depth = 20) {
    const response = await axios.get(
      `${process.env.TRADE_ENGINE_URL}/api/v1/orderbook/${symbol}`,
      { params: { depth } }
    );
    return response.data;
  }

  subscribeToOrderbook(symbol: string, callback: Function) {
    this.socket.on(`orderbook:${symbol}`, callback);
    this.socket.emit('subscribe', { channel: `orderbook:${symbol}` });
  }
}
```

---

#### Task BE-EPIC3-002: API Client Integration Tests (REVISED)
**Duration:** 2 hours
**Points:** 1.5

**What Changed:**
- ✅ Test API client wrapper
- ❌ Don't test Trade Engine endpoints (Trade Engine tests those)
- ✅ Test integration with Trade Engine APIs
- ✅ Add WebSocket subscription tests

**Acceptance Criteria:**
- [ ] Tests for API client:
  - [ ] getOrderBook returns correct structure
  - [ ] getTicker returns correct structure
  - [ ] getRecentTrades returns array
  - [ ] Error handling (timeout, bad response)
  - [ ] Retry logic verification
- [ ] Tests for WebSocket:
  - [ ] Subscribe/unsubscribe
  - [ ] Message event handling
  - [ ] Connection lifecycle
- [ ] Mock Trade Engine responses
- [ ] Coverage: >80%

**Note:** These are mocks for now. Real Trade Engine APIs will be integrated in next day.

---

### 🎨 Frontend Developer (React) - UNCHANGED

#### Task FE-EPIC3-001: Trading Page Scaffold & Redux
**Duration:** 2 hours
**Points:** 1.5
**Status:** ✅ VALID - No changes needed

---

#### Task FE-EPIC3-002: OrderBook Component
**Duration:** 3 hours
**Points:** 2
**Status:** ✅ VALID - Will consume Trade Engine API

**Update:** Instead of local API, will call:
```typescript
const orderBook = await tradeEngineClient.getOrderBook('BTC_TRY', 20);
```

---

#### Task FE-EPIC3-003: API Client Module
**Duration:** 1.5 hours
**Points:** 1
**Status:** ✅ VALID - Keep as-is

**Note:** This wraps `tradeEngineClient`, providing React-specific helpers

---

#### Task FE-EPIC3-004: WebSocket Service
**Duration:** 1.5 hours
**Points:** 1
**Status:** ✅ VALID - Connect to Trade Engine WS

**Update:** Will subscribe to Trade Engine channels:
```typescript
tradeEngineClient.subscribeToOrderbook('BTC_TRY', (data) => {
  dispatch(updateOrderBook(data));
});
```

---

#### Task FE-EPIC3-005: Component Tests
**Duration:** 2 hours
**Points:** 1.5
**Status:** ✅ VALID - Test with mocked Trade Engine responses

---

### 🗄️ Database Engineer

#### Task DB-EPIC3-001: Trading Indexes (UNCHANGED)
**Duration:** 2 hours
**Points:** 1.5
**Status:** ✅ VALID - No changes needed

---

### 🧪 QA Engineer

#### Task QA-EPIC3-001: Integration Test Plan (REVISED)
**Duration:** 2 hours
**Points:** 1.5

**What Changed:**
- ✅ Test integration between EPIC 3 frontend and Trade Engine
- ❌ Don't test Trade Engine endpoints directly (Trade Engine QA does that)
- ✅ Test the consumer side (API client, WebSocket subscription)

**Acceptance Criteria:**
- [ ] Create test plan: `EPIC3_STORY3.1_INTEGRATION_TEST_PLAN.md`
- [ ] Test scenarios:
  - [ ] API client successfully calls Trade Engine
  - [ ] WebSocket subscription works with Trade Engine
  - [ ] OrderBook component displays data from Trade Engine API
  - [ ] Error handling when Trade Engine is down
  - [ ] Latency: Frontend updates within 100ms of API call
  - [ ] WebSocket message handling
- [ ] Postman collection for API client integration:
  - [ ] GET /api/v1/orderbook (mocked)
  - [ ] WebSocket subscription (mocked)
- [ ] Test data: Sample Trade Engine responses
- [ ] Acceptance test cases

**Important:** These tests will mock Trade Engine initially, then use real Trade Engine APIs from Day 5 onwards.

---

## ⏰ Timeline - Day 1 (Parallel Execution)

```
9:00 AM
├─ Backend: API client setup (2.5h)
├─ Frontend: Redux store setup (2h)
├─ Database: Index review (2h)
└─ QA: Integration test plan (2h)

11:30 AM
├─ Backend: API client tests (2h)
├─ Frontend: OrderBook component (3h)
└─ Database: Query optimization (PARALLEL)

1:30 PM (LUNCH)

2:30 PM
├─ Backend: Refine tests
├─ Frontend: API integration
└─ QA: Test tools setup

4:00 PM
├─ Frontend: WebSocket service (1.5h)
├─ Frontend: Component tests (2h)
└─ Backend: Final review

6:00 PM
└─ Final integration check + commit
```

**Total:** Still ~10-11 hours of parallel work

---

## 📊 What's Different From Original Plan

### Backend Changes

**REMOVED Tasks:**
- ❌ BE-EPIC3-002: GET /api/v1/market/orderbook/{symbol} endpoint
  - Reason: Trade Engine Week 2 (BACKEND-011) builds this
  - Action: Remove from EPIC 3, focus on consuming it

- ❌ BE-EPIC3-003: WebSocket orderbook channel
  - Reason: Trade Engine Week 2 (BACKEND-010) builds WebSocket server
  - Action: Remove from EPIC 3, focus on subscribing to it

**RETAINED Tasks:**
- ✅ BE-EPIC3-001: Trade Engine API client (CRITICAL)
- ✅ BE-EPIC3-004: API client & WebSocket tests (renamed from BE-EPIC3-002)

**Hours Freed:** 5.5 hours (was 9.5 total backend, now 4.5)

### Frontend Changes

**ALL FRONTEND TASKS VALID:**
- ✅ FE-EPIC3-001: Trading page scaffold
- ✅ FE-EPIC3-002: OrderBook component (now consumes Trade Engine)
- ✅ FE-EPIC3-003: API client
- ✅ FE-EPIC3-004: WebSocket service
- ✅ FE-EPIC3-005: Component tests

**Total Hours:** 10.5 hours (unchanged)

### Database & QA

**UNCHANGED:**
- ✅ DB-EPIC3-001: Trading indexes (2h)
- ✅ QA-EPIC3-001: Integration test plan (2h)

---

## ✅ Deliverables (End of Day)

### Code
- ✅ Trade Engine API client wrapper
- ✅ API client tests (with mocks)
- ✅ Trading page scaffold + Redux slice
- ✅ OrderBook component with mock data
- ✅ API integration module
- ✅ WebSocket service

### Documentation
- ✅ API client documentation
- ✅ Integration test plan
- ✅ Component specs
- ✅ WebSocket usage guide

### Tests
- ✅ API client unit tests (>80%)
- ✅ Component tests (>80%)
- ✅ WebSocket service tests
- ✅ Integration test plan + Postman collection

### Ready For
- ✅ Trade Engine API integration (Day 5)
- ✅ Real WebSocket connection (Day 5)
- ✅ End-to-end testing (Day 7)

---

## 🔄 Integration Timeline

```
Day 1 (Nov 24): EPIC 3 Foundation
├─ API client: Ready to receive Trade Engine endpoints
├─ Frontend: Ready to render Trade Engine data
└─ Tests: Ready for Trade Engine integration

Day 5-6 (Nov 28-29): Trade Engine Week 2 Complete
├─ WebSocket server: Available
├─ Market data APIs: Available (BACKEND-011)
├─ Advanced order types: Available (BACKEND-009)
└─ EPIC 3 integrates

Day 7-8 (Nov 30 - Dec 1): Full Integration
├─ API client: Connected to Trade Engine
├─ Frontend: Consuming real Trade Engine data
├─ WebSocket: Real-time updates flowing
└─ Story 3.1: Order Book live with real data
```

---

## 💡 Key Benefits of This Alignment

1. **No Duplication:** Trade Engine builds API/WebSocket, EPIC 3 consumes
2. **Faster Integration:** Less rework, clean separation of concerns
3. **Single Source of Truth:** One authoritative API implementation
4. **Better Testing:** Both teams test their own, less overlap
5. **Cleaner Code:** No competing implementations

---

## ⚠️ Important Notes

1. **Trade Engine APIs Available Day 5-6:**
   - Use mocked responses for development (Day 1-4)
   - Swap in real Trade Engine APIs when ready (Day 5+)
   - API client design supports both

2. **WebSocket Integration:**
   - Trade Engine will provide WS server (BACKEND-010)
   - EPIC 3 frontend subscribes to channels
   - No local WebSocket gateway needed

3. **Advanced Order Types:**
   - Trade Engine provides Stop, IOC, FOK, Post-Only (BACKEND-009)
   - Story 3.5 frontend uses these types
   - No local order type implementation needed

4. **Testing Strategy:**
   - Day 1-4: Test with mocked Trade Engine responses
   - Day 5+: Swap mocks with real Trade Engine APIs
   - QA tests integration points, not Trade Engine itself

---

## 🚀 Next Steps

1. **Read this revised plan** (you're doing it!)
2. **Check Trade Engine Week 2 plan** for expected APIs
3. **Start Day 1 tasks** (focus on consuming, not building)
4. **Daily sync with Trade Engine team** (optional but helpful)
5. **Day 5:** Integrate Trade Engine APIs when ready

---

**Status:** ✅ **READY TO START (ALIGNED VERSION)**

This plan now perfectly aligns with Trade Engine's parallel work.
No conflicts, no duplication, maximum efficiency! 🎯
