# EPIC 3: Trading Engine - Days 3-5 Task Assignments
## Sprint 3, Days 3-5: Story 3.1 Polish + Story 3.2 (Ticker Display)

**Date:** November 26-28, 2025
**Sprint:** Sprint 3 (Days 3-5 of 10)
**Focus:** Story 3.1 (Polish & Optimization) + Story 3.2 (Ticker Display)
**Total Points:** ~10 points
**Estimated Hours:** 15 hours (parallel tasks, 5 hours per day)
**Status:** 🎯 Ready to Start

---

## 🎯 Days 3-5 Objectives

Building on the complete Story 3.1 foundation, Days 3-5 focus on:

1. ✅ Story 3.1 Polish: Additional refinements and optimizations
2. ✅ Story 3.2 Foundation: Ticker display system
3. ✅ Real-time 24h statistics
4. ✅ Price alerts and monitoring

---

## 📋 Task Breakdown by Role

### 👨‍💻 Backend Developer (NestJS)

#### Task BE-EPIC3-008: Ticker API Endpoint
**Duration:** 2 hours
**Points:** 1.5

**Acceptance Criteria:**
- [ ] Create `GET /api/v1/market/ticker/:symbol` endpoint
- [ ] Return 24h statistics: last price, change, change%, high, low, volume
- [ ] Support multiple symbols: `GET /api/v1/market/tickers?symbols=BTC_TRY,ETH_TRY`
- [ ] Cache: Redis 10-second TTL
- [ ] Performance: <50ms p99
- [ ] Integration tests

**Response Format:**
```json
{
  "symbol": "BTC_TRY",
  "lastPrice": "50100.00000000",
  "priceChange": "100.00000000",
  "priceChangePercent": "0.20",
  "high": "51000.00000000",
  "low": "49000.00000000",
  "volume": "1000.5",
  "quoteVolume": "49999999.99",
  "timestamp": "2025-11-26T10:00:00Z"
}
```

---

#### Task BE-EPIC3-009: 24h Statistics Service
**Duration:** 2 hours
**Points:** 1.5

**Acceptance Criteria:**
- [ ] Create `StatisticsService` for 24h calculations
- [ ] Calculate: high, low, open, close, volume
- [ ] Method: `get24hStats(symbol): Promise<Statistics>`
- [ ] Cache with 10-second TTL
- [ ] Performance: <30ms response time
- [ ] Handle edge cases (no trades in 24h, new symbol)
- [ ] Unit tests (>80% coverage)

---

#### Task BE-EPIC3-010: WebSocket Ticker Channel
**Duration:** 1.5 hours
**Points:** 1

**Acceptance Criteria:**
- [ ] Create WebSocket ticker channel: `ticker:{symbol}`
- [ ] Subscribe: `socket.emit('subscribe_ticker', {symbol})`
- [ ] Broadcast: Price updates every 1 second
- [ ] Message: `{type: 'ticker_update', symbol, lastPrice, change, changePercent}`
- [ ] Multi-client support
- [ ] Unit tests

---

### 🎨 Frontend Developer (React)

#### Task FE-EPIC3-010: Ticker Component
**Duration:** 2.5 hours
**Points:** 2

**Acceptance Criteria:**
- [ ] Create `TickerComponent.tsx` (already partially done from Day 1 bonus)
- [ ] Display: Symbol, last price, 24h change, change %
- [ ] Color coding: Green for up, red for down
- [ ] Large price display (responsive to screen size)
- [ ] Real-time updates via WebSocket
- [ ] Responsive design (mobile, tablet, desktop)
- [ ] Unit tests

**Layout:**
```
┌─────────────────────────────────┐
│  BTC/TRY                         │
│  50,100.00                       │
│  ▲ +100.00 (+0.20%)              │
│  High: 51,000  Low: 49,000       │
│  Volume: 1,000 BTC               │
└─────────────────────────────────┘
```

---

#### Task FE-EPIC3-011: Statistics Display Component
**Duration:** 2 hours
**Points:** 1.5

**Acceptance Criteria:**
- [ ] Create `MarketStatsPanel.tsx`
- [ ] Display 24h stats: high, low, volume, quote volume
- [ ] Grid layout with stats cards
- [ ] Real-time updates
- [ ] Responsive design
- [ ] Unit tests

---

#### Task FE-EPIC3-012: Real-time Ticker Updates
**Duration:** 1.5 hours
**Points:** 1

**Acceptance Criteria:**
- [ ] Integrate ticker WebSocket into trading page
- [ ] Fetch ticker data on mount
- [ ] Update in real-time (every 1 second)
- [ ] Handle errors gracefully
- [ ] Fallback to cached data
- [ ] Unit tests

---

### 🗄️ Database Engineer

#### Task DB-EPIC3-003: Ticker Query Optimization
**Duration:** 1.5 hours
**Points:** 1

**Acceptance Criteria:**
- [ ] Analyze 24h statistics query performance
- [ ] Create index if needed (likely `idx_trades_symbol_executed_at`)
- [ ] Verify execution time <30ms
- [ ] Test with high-volume trading
- [ ] Document query patterns
- [ ] Create migration if needed

---

### 🧪 QA Engineer

#### Task QA-EPIC3-003: Story 3.2 Testing
**Duration:** 1.5 hours
**Points:** 1

**Acceptance Criteria:**
- [ ] Create test plan for Story 3.2 (Ticker display)
- [ ] Test scenarios: ticker API, WebSocket, component rendering
- [ ] Performance baselines documented
- [ ] Error scenarios covered
- [ ] Postman collection for API tests
- [ ] Quick reference guide

---

## 📅 Parallel Execution Timeline

```
Days 3-5 (15 hours total work = 5h/day)

Day 3 Morning (9:00 AM - 12:00 PM, 3 hours)
├─ Backend: Ticker API endpoint (2h)
├─ Frontend: Ticker component (2.5h, parallel)
└─ Database: Query optimization (1.5h, parallel)

Day 3 Afternoon (1:00 PM - 4:00 PM, 3 hours)
├─ Backend: 24h Statistics service (2h)
├─ Frontend: Statistics panel (2h, parallel)
└─ QA: Test plan creation (1.5h, parallel)

Day 4 (5 hours)
├─ Backend: WebSocket ticker channel (1.5h)
├─ Frontend: Real-time integration (1.5h, parallel)
└─ Testing & refinement (2h, parallel)

Day 5 (4 hours)
├─ Story 3.1 Polish: Performance optimization
├─ Story 3.1 Polish: Additional features
├─ Story 3.1 Polish: Code review & testing
└─ Integration testing & sign-off

Total: ~15 hours = 3 days of focused development
```

---

## ✅ Completion Checklist

### Backend
- [ ] Ticker endpoint working with real data
- [ ] Statistics service operational
- [ ] WebSocket channel streaming updates
- [ ] All error scenarios handled
- [ ] Unit tests passing (>80%)
- [ ] Documentation complete

### Frontend
- [ ] Ticker component renders correctly
- [ ] Statistics panel displays all metrics
- [ ] Real-time updates working
- [ ] All responsive designs verified
- [ ] Error states handled
- [ ] All tests passing

### Database
- [ ] Query performance <30ms verified
- [ ] Indexes optimized
- [ ] Migration created (if needed)
- [ ] Performance report documented

### QA
- [ ] Test plan complete
- [ ] Postman collection ready
- [ ] Performance baselines documented
- [ ] All test scenarios passing

### Integration
- [ ] Ticker data flowing end-to-end
- [ ] WebSocket updates real-time
- [ ] Performance targets met
- [ ] Error scenarios handled

---

## 🎁 Deliverables (End of Days 3-5)

1. **Code:**
   - ✅ Backend: 3 tasks complete (Ticker API, Stats service, WebSocket)
   - ✅ Frontend: 3 tasks complete (Ticker component, Stats panel, Integration)
   - ✅ Database: Query optimization verified
   - ✅ All tests passing (>80% coverage)

2. **Documentation:**
   - ✅ Ticker API documentation
   - ✅ Statistics service documentation
   - ✅ Component guides
   - ✅ Query optimization report
   - ✅ Test plan document

3. **Commits:**
   - ✅ Feature branch: `feature/epic3-story3.2-ticker`
   - ✅ Commits: 1 per task (clean history)
   - ✅ PR description with acceptance criteria

4. **Status Report:**
   - ✅ Test coverage: >80%
   - ✅ No TypeScript errors
   - ✅ Performance baselines recorded
   - ✅ Story 3.1 polish complete
   - ✅ Story 3.2 50% complete

---

## 🚀 Next Steps (Days 6-10)

**Days 6-10 will focus on:**
1. Story 3.2 - Additional features (price alerts, indicators)
2. Story 3.3 - Charting system (OHLC, volume)
3. Story 3.4 - Advanced market data
4. Integration testing & performance tuning
5. Production deployment preparation

---

## 📊 Story Point Distribution

```
Days 3-5 Tasks: 10.0 points

Backend (3 tasks)
├── BE-EPIC3-008: Ticker API .................. 1.5 pts
├── BE-EPIC3-009: 24h Statistics ............. 1.5 pts
└── BE-EPIC3-010: WebSocket channel ......... 1.0 pt
Total Backend: 4.0 pts

Frontend (3 tasks)
├── FE-EPIC3-010: Ticker component ........... 2.0 pts
├── FE-EPIC3-011: Statistics panel ........... 1.5 pts
└── FE-EPIC3-012: Real-time integration ...... 1.0 pt
Total Frontend: 4.5 pts

Database (1 task)
└── DB-EPIC3-003: Query optimization ........ 1.0 pt

QA (1 task)
└── QA-EPIC3-003: Testing .................... 1.0 pt

Total: 10.0 story points (fits in 15-hour time box)
```

---

**Status:** 🟢 READY TO KICKOFF
**Prepared by:** Tech Lead Orchestrator
**Date:** 2025-11-26
