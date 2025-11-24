# EPIC 3: Trading Engine - Day 2 Task Assignments
## Sprint 3, Days 2-5: Story 3.1 Continuation & Story 3.2 Foundation

**Date:** November 25-28, 2025
**Sprint:** Sprint 3 (Days 2-10)
**Focus:** Story 3.1 (Completion) + Story 3.2 (Foundation)
**Total Points:** ~9 points
**Estimated Hours:** 10 hours (parallel tasks)
**Status:** 🎯 Ready to Start

---

## 🎯 Day 2 Objectives

Building on the **Day 1 foundation**, Day 2 focuses on:

1. ✅ Depth chart visualization for order book
2. ✅ User order highlighting in real-time
3. ✅ Live Trade Engine service integration
4. ✅ Advanced chart features
5. ✅ Real-time websocket optimization

This completes **Story 3.1 (Order Book - Real-Time Display)** and starts **Story 3.2 (Ticker Display)**.

---

## 📋 Task Breakdown by Role

### 👨‍💻 Backend Developer (NestJS)

#### Task BE-EPIC3-005: Orderbook Depth Chart API Enhancement
**Duration:** 2.5 hours
**Points:** 1.5

**Acceptance Criteria:**
- [ ] Enhance existing `GET /api/v1/market/orderbook/:symbol` with depth chart data
- [ ] Add endpoint: `GET /api/v1/market/orderbook/:symbol/depth-chart`
- [ ] Response includes cumulative volume at each price level
- [ ] Return data optimized for chart rendering (max 50 levels)
- [ ] Calculate spread percentage
- [ ] Cache: Redis 5-second TTL
- [ ] Performance: <50ms p99
- [ ] Integration tests

**Response Format:**
```json
{
  "symbol": "BTC_TRY",
  "bids": [
    {"price": "50000", "volume": "10.5", "cumulative": "10.5", "percentage": 45},
    {"price": "49990", "volume": "8.3", "cumulative": "18.8", "percentage": 80}
  ],
  "asks": [
    {"price": "50100", "volume": "5.2", "cumulative": "5.2", "percentage": 22},
    {"price": "50110", "volume": "12.1", "cumulative": "17.3", "percentage": 75}
  ],
  "spread": {"value": "100", "percentage": "0.20%"},
  "maxBidVolume": "10.5",
  "maxAskVolume": "12.1",
  "timestamp": "2025-11-25T10:00:00Z"
}
```

**Implementation Details:**
- Calculate cumulative volumes from best price down/up
- Calculate percentage of max volume at each level
- Limit to 50 levels per side (optimize for frontend)
- Use existing trade engine client
- Cache response (5s TTL)

---

#### Task BE-EPIC3-006: User Order Highlighting Service
**Duration:** 2 hours
**Points:** 1.5

**Acceptance Criteria:**
- [ ] Create `UserOrderHighlightService` in trading module
- [ ] Method: `getHighlightedPrices(userId: uuid): Promise<string[]>`
- [ ] Returns: Array of price levels where user has open orders
- [ ] Real-time updates via WebSocket
- [ ] Performance: <20ms response time
- [ ] Error handling (user not found, no orders)
- [ ] Unit tests

**Implementation:**
- Query open orders from trade engine client
- Extract unique price levels
- Return sorted array
- Broadcast updates via WebSocket when orders change
- Cache with 1-second TTL

**WebSocket Event:**
```json
{
  "type": "user_order_prices",
  "userId": "user-uuid",
  "prices": ["50000", "49990", "50100"],
  "timestamp": "2025-11-25T10:00:00Z"
}
```

---

#### Task BE-EPIC3-007: Real Trade Engine Integration
**Duration:** 2 hours
**Points:** 1.5

**Acceptance Criteria:**
- [ ] Update Trade Engine client to use real service URL (from config)
- [ ] Implement request signing/authentication if needed
- [ ] Add request tracing/correlation IDs
- [ ] Implement circuit breaker for service resilience
- [ ] Add fallback to cached data when service unavailable
- [ ] Monitor Trade Engine API latency
- [ ] Integration tests with mock Trade Engine
- [ ] Handle all error scenarios

**Implementation:**
- Use `TRADE_ENGINE_API_URL` from environment
- Add correlation IDs to all requests
- Implement circuit breaker pattern (3 failures = open)
- Fall back to 30-second cached data if circuit open
- Log all API interactions
- Emit metrics for latency monitoring

**Error Handling:**
- Timeout (5s): Return cached data or empty orderbook
- 503 Service Unavailable: Return cached data
- Authentication error: Log and alert
- Network error: Return cached data + retry

---

### 🎨 Frontend Developer (React)

#### Task FE-EPIC3-006: Depth Chart Visualization Component
**Duration:** 3 hours
**Points:** 2

**Acceptance Criteria:**
- [ ] Create `DepthChartComponent.tsx` with React + Canvas/SVG
- [ ] Display cumulative volume curve
- [ ] X-axis: Price levels
- [ ] Y-axis: Cumulative volume
- [ ] Color: Green for bids, red for asks
- [ ] Interactive: Hover shows price & volume
- [ ] Responsive: Desktop (800x400), Tablet (600x300), Mobile (stack with orderbook)
- [ ] Real-time updates (WebSocket)
- [ ] Performance: <100ms render time
- [ ] Unit tests

**Implementation Options:**
- Use Recharts (simpler, built-in responsiveness)
- Use Canvas (faster, custom rendering)
- Use SVG (scalable, easiest animation)

**Recommended:** Recharts for rapid development with good performance

**Data Structure:**
```typescript
interface DepthData {
  bids: DepthLevel[];
  asks: DepthLevel[];
  spread: { value: string; percentage: string };
}

interface DepthLevel {
  price: string;
  volume: string;
  cumulative: string;
  percentage: number;
}
```

---

#### Task FE-EPIC3-007: User Order Highlighting Feature
**Duration:** 2 hours
**Points:** 1.5

**Acceptance Criteria:**
- [ ] Integrate user order highlighting into OrderBookComponent
- [ ] Highlight rows with user's open orders
- [ ] Show user's order volume at each price level
- [ ] Update in real-time via WebSocket
- [ ] Styling: Subtle highlight color (optional light yellow background)
- [ ] Tooltip: Show user's order details on hover
- [ ] Responsive: Works on all screen sizes
- [ ] Unit tests

**Implementation:**
- Fetch user's highlighted prices from WebSocket
- Mark rows with matching prices
- Display user's total volume at that price
- Refresh when WebSocket emits `user_order_prices` event
- Use Redux to store highlighted prices
- Show quick tooltip with order count and total volume

**Redux Slice Addition:**
```typescript
{
  trading: {
    // ... existing state
    userHighlightedPrices: { // NEW
      prices: ["50000", "49990"],
      volumes: { "50000": "1.5", "49990": "2.3" },
      orderCounts: { "50000": 2, "49990": 1 }
    }
  }
}
```

---

#### Task FE-EPIC3-008: Live Trade Engine Integration
**Duration:** 1.5 hours
**Points:** 1

**Acceptance Criteria:**
- [ ] Update API client to use real Trade Engine URL
- [ ] Configure base URL from environment: `REACT_APP_TRADE_ENGINE_URL`
- [ ] Implement request error handling (timeout, network, 5xx errors)
- [ ] Show error state in UI when Trade Engine unavailable
- [ ] Fallback UI: Show cached data or last-known state
- [ ] Add loading spinner during initial fetch
- [ ] Monitor API performance (log slow requests)
- [ ] Unit tests

**Implementation:**
- Update `tradingApi.ts` to use config-based URL
- Add timeout handling (5 seconds)
- Add retry logic for transient failures
- Show user-friendly error messages
- Implement fallback strategy (show cached/previous data)
- Add debug logging (console in dev, metrics in prod)

---

#### Task FE-EPIC3-009: Advanced Chart Features
**Duration:** 2 hours
**Points:** 1.5

**Acceptance Criteria:**
- [ ] Zoom capability: Users can zoom in on price levels
- [ ] Pan capability: Scroll through price ranges
- [ ] Aggregate level selector: 0.1%, 0.5%, 1% (already in orderbook)
- [ ] Export: Download chart as PNG
- [ ] Legend: Show bids/asks colors
- [ ] Grid lines: Subtle background grid
- [ ] Performance: Maintains <100ms render time
- [ ] Unit tests

**Implementation:**
- Add zoom state to Redux
- Implement pan by dragging on chart
- Add aggregate level filter to depth chart data
- Use Chart.js or Recharts export capabilities
- Add legend component
- Optimize re-renders with useMemo

---

### 🗄️ Database Engineer

#### Task DB-EPIC3-002: Order Book Query Performance Tuning
**Duration:** 1.5 hours
**Points:** 1

**Acceptance Criteria:**
- [ ] Analyze current depth chart query performance
- [ ] Create index if needed for cumulative volume calculations
- [ ] Verify query executes in <50ms
- [ ] Test with 1000+ orders in book
- [ ] Document query patterns
- [ ] Create migration if needed
- [ ] Add query hints/statistics

**Implementation:**
- Run EXPLAIN ANALYZE on depth chart queries
- Verify index usage (should use idx_orders_symbol_status)
- Check for sequential scans (if found, optimize)
- Create partial index on active orders if needed
- Test performance under load (benchmark with 1000+ orders)
- Document recommendations

**Query to Optimize:**
```sql
SELECT price, SUM(quantity) as volume
FROM orders
WHERE symbol = $1 AND status IN ('OPEN', 'PARTIALLY_FILLED')
GROUP BY price
ORDER BY price DESC/ASC
LIMIT 50;
```

---

### 🧪 QA Engineer

#### Task QA-EPIC3-002: Day 2 Integration Testing
**Duration:** 2 hours
**Points:** 1

**Acceptance Criteria:**
- [ ] Create integration test plan for Day 2 features
- [ ] Test depth chart endpoint and visualization
- [ ] Test user order highlighting real-time updates
- [ ] Test live Trade Engine integration
- [ ] Test fallback behavior (Trade Engine down)
- [ ] Performance testing: <100ms for all operations
- [ ] Test error scenarios
- [ ] Create Postman collection for new endpoints
- [ ] Test plan document

**Test Scenarios:**
1. Depth chart API returns correct data
2. Depth chart component renders correctly
3. User order highlighting highlights correct prices
4. Real-time updates via WebSocket work
5. Trade Engine unavailable → show cached data
6. Network timeout → graceful error display
7. Performance: All operations <100ms
8. Responsive design: Mobile, tablet, desktop

**Deliverables:**
- Integration test plan (5 pages)
- Postman collection for new endpoints
- Performance baseline report

---

## 📅 Parallel Execution Timeline

```
Day 2 Morning (9:00 AM - 12:30 PM)
├─ Backend: Depth chart API (2.5h)
├─ Frontend: Depth chart component (3h)
├─ Frontend: Order highlighting (2h)
├─ Database: Query optimization (1.5h)
└─ QA: Test plan creation (1h)

Day 2 Afternoon (1:30 PM - 4:30 PM)
├─ Backend: User highlighting service (2h)
├─ Backend: Trade Engine integration (2h)
├─ Frontend: Trade Engine integration (1.5h)
├─ Frontend: Advanced charts (2h)
└─ QA: Integration testing (1h)

Total: 10 hours of work spread across 4 agents = 10 effective hours
```

---

## ✅ Completion Checklist

### Backend
- [ ] Depth chart API endpoint working
- [ ] User highlighting service operational
- [ ] Real Trade Engine integration complete
- [ ] All error scenarios handled
- [ ] Unit tests passing (>80% coverage)
- [ ] Integration tests passing

### Frontend
- [ ] Depth chart component renders correctly
- [ ] User highlighting works in real-time
- [ ] Trade Engine integration complete
- [ ] Advanced chart features working
- [ ] All responsive designs verified
- [ ] Error states handled
- [ ] All tests passing (>80% coverage)

### Database
- [ ] Query performance <50ms verified
- [ ] Indexes optimized
- [ ] Migration created (if needed)
- [ ] Performance report documented

### QA
- [ ] Integration test plan complete
- [ ] Postman collection ready
- [ ] Performance baselines documented
- [ ] All test scenarios passing

### Integration
- [ ] Backend + Frontend connects with live data
- [ ] WebSocket real-time updates working
- [ ] Error scenarios handled gracefully
- [ ] Performance targets met

---

## 🎁 Deliverables (End of Day 2)

1. **Code:**
   - ✅ Backend: 3 tasks complete (depth chart, highlighting, Trade Engine integration)
   - ✅ Frontend: 4 tasks complete (depth chart, highlighting, integration, advanced features)
   - ✅ Database: Index optimization verified
   - ✅ All tests passing (>80% coverage)

2. **Documentation:**
   - ✅ Depth chart API documentation
   - ✅ User highlighting service docs
   - ✅ Trade Engine integration guide
   - ✅ Advanced features documentation
   - ✅ Integration test plan
   - ✅ Performance benchmark report

3. **Commits:**
   - ✅ Feature branch: `feature/epic3-story3.1-continuation`
   - ✅ Commits: 1 per task (clean history)
   - ✅ PR description with acceptance criteria

4. **Status Report:**
   - ✅ Test coverage: >80%
   - ✅ No TypeScript errors
   - ✅ Performance baselines recorded
   - ✅ Blockers identified (if any)

---

## 🚀 Next Steps (Day 3+)

**Day 3 will focus on:**
1. Story 3.1 - Polish and optimization
2. Story 3.2 - Ticker Display (foundation)
3. Story 3.2 - Real-time ticker updates
4. Story 3.2 - 24h statistics

---

## 📊 Story Point Distribution

```
Day 2 Tasks: 9.0 points
├── Backend (3 tasks) .................. 5.5 pts
├── Frontend (4 tasks) ................ 5.0 pts
├── Database (1 task) ................. 1.0 pt
└── QA (1 task) ....................... 1.0 pt

Total: 9.0 story points (fits in 10-hour time box)
```

---

**Status:** 🟢 READY TO KICKOFF
**Prepared by:** Tech Lead Orchestrator
**Date:** 2025-11-25
