# Trade Engine Week 2 Strategic Plan
## Advanced Features & Optimization (Days 6-12)

**Sprint:** Trade Engine Sprint 1
**Week:** 2 of 2
**Duration:** November 24-30, 2025 (7 days planned, 6-7 available)
**Target Story Points:** 16 / 38 total (42% of sprint)
**Estimated Hours:** 18 hours (lighter workload than Week 1)

---

## Executive Summary

**Week 2 transitions from foundation to feature development.** With Week 1's core components production-ready, Week 2 focuses on:
1. Advanced order types (Stop, Post-only, IOC, FOK)
2. WebSocket real-time updates
3. Market data APIs
4. Performance optimization

**Strategic Approach:** Build atop Week 1's solid foundation with parallel task development to maintain velocity.

---

## Sprint Progress Summary

### Week 1 Results (Days 1-5)
- **Points Delivered:** 22.0 / 38 (57.9%)
- **Days Used:** 5 / 6 (1 day ahead)
- **Velocity:** 4.4 points/day

### Week 2 Targets (Days 6-12)
- **Points Remaining:** 16 / 38 (42.1%)
- **Days Available:** 7
- **Velocity Required:** 2.3 points/day (realistic, achievable)
- **Confidence Level:** VERY HIGH ✅

---

## Week 2 Components & Tasks

### Task Assignment Overview

| Task ID | Component | Points | Hours | Priority | Status |
|---------|-----------|--------|-------|----------|--------|
| **TASK-BACKEND-009** | Advanced Order Types | 4.0 | 8h | P0 | 🎯 Assigned |
| **TASK-BACKEND-010** | WebSocket Updates | 3.0 | 6h | P0 | 🎯 Assigned |
| **TASK-BACKEND-011** | Market Data APIs | 3.0 | 4h | P1 | 🎯 Assigned |
| **TASK-BACKEND-012** | Performance Optimization | 3.0 | 4h | P2 | 🎯 Assigned |
| **TASK-QA-006** | Integration Testing | 3.0 | 6h | P1 | 🎯 Assigned |
| **Contingency Buffer** | Blockers/Surprises | - | 2h | P3 | Reserve |
| **Total** | **Week 2** | **16.0** | **28h** | - | On track |

---

## Detailed Task Specifications

### TASK-BACKEND-009: Advanced Order Types
**Points:** 4.0 | **Hours:** 8 | **Priority:** P0 (Critical)

#### Objectives

Enhance matching engine to support advanced order types required for professional traders:

1. **Stop Orders**
   - Trigger: Market price reaches threshold
   - Execution: Convert to market order when triggered
   - Variants: Stop-buy, stop-sell

2. **Post-Only Orders**
   - Constraint: Can only add liquidity (not match)
   - Benefit: Fee incentive for liquidity providers
   - Rejection: Immediate if would execute

3. **Immediate-or-Cancel (IOC)**
   - Execution: Match immediately, cancel unfilled portion
   - Use case: Quick execution with remainder cancel

4. **Fill-or-Kill (FOK)**
   - Execution: All or nothing
   - Rejection: Cancel entire order if can't fill 100%

#### Implementation Architecture

```
Request Handler
    ↓
Order Validator (type-specific rules)
    ├─> Stop Order: Validate trigger price
    ├─> Post-Only: Verify non-matching
    ├─> IOC: Mark order property
    └─> FOK: Mark order property
    ↓
Matching Engine (type-aware logic)
    ├─> Stop: Check trigger, convert if hit
    ├─> Post-Only: Reject if would match
    ├─> IOC: Execute + cancel remainder
    └─> FOK: Execute all or cancel
    ↓
Trade Callbacks (persist, settle)
```

#### Acceptance Criteria

**Stop Orders (3/3):**
- [ ] Stop-buy triggers at/below price
- [ ] Stop-sell triggers at/above price
- [ ] Conversion to market order automatic
- [ ] Trigger price validation (sanity checks)

**Post-Only Orders (2/2):**
- [ ] Rejected immediately if would match
- [ ] Can add to order book if no match
- [ ] Accurate fee structure (maker fees only)

**IOC Orders (2/2):**
- [ ] Match as much as possible immediately
- [ ] Cancel unfilled portion automatically
- [ ] Accurate filled_quantity tracking

**FOK Orders (2/2):**
- [ ] Accept only if 100% fill available
- [ ] Cancel immediately if partial only
- [ ] Proper error response

#### Files to Create/Modify

**New Files:**
```
/internal/domain/order_type.go          (enum definitions)
/internal/matching/stop_order_manager.go (stop order logic)
/internal/matching/order_type_handler.go (type-specific validation)
/internal/service/advanced_order_service.go
/tests/advanced_orders_test.go
```

**Modified Files:**
```
/internal/matching/engine.go             (add type checking)
/internal/server/order_handler.go        (validate types)
/internal/domain/order.go                (type + trigger fields)
```

#### Testing Strategy

**Unit Tests:**
- Stop order trigger logic (unit tests)
- Post-only matching prevention (unit tests)
- IOC fill + cancel logic (unit tests)
- FOK all-or-nothing validation (unit tests)
- Coverage: >85%

**Integration Tests:**
- Stop orders with real matching engine
- Post-only preventing unwanted matches
- IOC with partial fills
- FOK all-or-nothing scenarios
- Multiple order type combinations

**Performance Tests:**
- 1000 stop orders in order book (memory)
- Trigger evaluation performance (latency)
- Matching with mixed order types (throughput)

#### Success Criteria

- [x] All 4 order types implemented
- [x] Validation rules enforced
- [x] Matching logic correct
- [x] Unit tests passing (>85% coverage)
- [x] Integration tests passing
- [x] Performance not degraded
- [x] Documentation complete

---

### TASK-BACKEND-010: WebSocket Real-Time Updates
**Points:** 3.0 | **Hours:** 6 | **Priority:** P0 (Critical)

#### Objectives

Implement WebSocket server for real-time client notifications:

1. **Order Update Stream**
   - Event: Order created, filled, cancelled
   - Content: Order ID, status, filled quantity
   - Frequency: Real-time

2. **Trade Execution Stream**
   - Event: New trade executed
   - Content: Price, quantity, timestamp, fees
   - Frequency: Real-time

3. **Order Book Depth Updates**
   - Event: Best bid/ask changed
   - Content: New bid/ask levels
   - Frequency: Real-time

4. **Market Ticker Updates**
   - Event: Periodic (1-second) ticker
   - Content: Last price, 24h stats
   - Frequency: 1 second interval

#### Architecture

```
HTTP Server (Gin)
    ↓
WebSocket Upgrade Handler
    ↓
Client Connection Manager
    ├─> Track active connections
    ├─> Handle subscriptions
    └─> Route messages to subscribers
    ↓
Event Publishers
    ├─> Order Update Channel
    ├─> Trade Execution Channel
    ├─> Order Book Change Channel
    └─> Market Ticker Channel
    ↓
Broadcasting Logic
    ├─> Filter subscribers
    ├─> Serialize JSON
    └─> Send to client
```

#### Message Format

**Order Update:**
```json
{
  "type": "order_update",
  "order_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "filled",
  "filled_quantity": "1.5",
  "timestamp": "2025-11-24T10:30:45.234Z"
}
```

**Trade Execution:**
```json
{
  "type": "trade_executed",
  "trade_id": "trd_789012",
  "symbol": "BTC/USDT",
  "price": "50000.00",
  "quantity": "1.0",
  "buyer_fee": "25.00",
  "seller_fee": "50.00",
  "timestamp": "2025-11-24T10:30:45.200Z"
}
```

**Order Book Update:**
```json
{
  "type": "orderbook_update",
  "symbol": "BTC/USDT",
  "best_bid": "49999.00",
  "best_ask": "50001.00",
  "bid_quantity": "2.5",
  "ask_quantity": "3.0",
  "spread": "2.00",
  "timestamp": "2025-11-24T10:30:45.234Z"
}
```

#### Acceptance Criteria

**WebSocket Endpoints (3/3):**
- [ ] GET /ws/orders - Order update stream
- [ ] GET /ws/trades - Trade execution stream
- [ ] GET /ws/markets/:symbol - Market updates stream

**Connection Management (4/4):**
- [ ] Accept WebSocket upgrade requests
- [ ] Track active client connections
- [ ] Handle graceful disconnection
- [ ] Broadcast to multiple subscribers

**Message Publishing (4/4):**
- [ ] Publish order updates from matching engine callbacks
- [ ] Publish trade execution immediately
- [ ] Publish order book changes
- [ ] Publish market ticker (1-second intervals)

**Performance (2/2):**
- [ ] 100+ concurrent WebSocket connections
- [ ] <50ms latency for event delivery
- [ ] No memory leaks

#### Files to Create/Modify

**New Files:**
```
/internal/server/websocket_handler.go
/internal/websocket/connection_manager.go
/internal/websocket/publisher.go
/internal/websocket/message.go
/tests/websocket_test.go
```

**Modified Files:**
```
/cmd/server/main.go                      (register WebSocket handlers)
/internal/server/router.go               (add WebSocket routes)
/internal/matching/engine.go             (publish events from callbacks)
```

#### Testing Strategy

**Unit Tests:**
- Connection manager (add/remove clients)
- Message serialization
- Event filtering
- Coverage: >80%

**Integration Tests:**
- Real WebSocket connections
- Multiple concurrent clients
- Event delivery verification
- Message correctness

**Performance Tests:**
- 100+ concurrent connections
- Sustained message throughput
- Latency measurement

#### Success Criteria

- [x] WebSocket server operational
- [x] 3 event streams implemented
- [x] 100+ concurrent connections
- [x] Unit tests passing (>80%)
- [x] Integration tests passing
- [x] Latency <50ms
- [x] Documentation complete

---

### TASK-BACKEND-011: Market Data APIs
**Points:** 3.0 | **Hours:** 4 | **Priority:** P1 (Important)

#### Objectives

Create market data endpoints for charting and analysis:

1. **Historical Candles (OHLCV)**
   - Timeframes: 1m, 5m, 15m, 1h, 4h, 1d
   - Data: Open, High, Low, Close, Volume
   - Query: Symbol, start_time, end_time

2. **Historical Trades**
   - Extended version of GET /trades
   - Query: Symbol, start_time, end_time, limit

3. **24h Statistics**
   - Aggregated from trades table
   - Metrics: High, Low, Volume, Volume24h
   - Real-time calculation

4. **Depth Snapshots**
   - Historical order book snapshots
   - Point-in-time depth data
   - Archive for analysis

#### Endpoints

```
GET /api/v1/candles/:symbol?tf=1h&start=...&end=...
GET /api/v1/historical/trades/:symbol?start=...&end=...
GET /api/v1/statistics/24h/:symbol
GET /api/v1/snapshots/:symbol?time=...
```

#### Data Source

**For MVP:**
- Candles: Calculate from trades table
- Trades: Query trades table directly
- Statistics: Aggregate from trades
- Snapshots: Store periodically (not real-time)

**For Future:**
- Time-series database (InfluxDB, TimescaleDB)
- Pre-calculated rollups
- Caching layer (Redis)

#### Acceptance Criteria

**Candle API (3/3):**
- [ ] Generate candles from trades
- [ ] Support 6 timeframes (1m, 5m, 15m, 1h, 4h, 1d)
- [ ] Correct OHLCV calculation

**Historical Trades (2/2):**
- [ ] Filter by time range
- [ ] Pagination support

**Statistics (2/2):**
- [ ] Accurate 24h high/low/volume
- [ ] Real-time calculation
- [ ] Caching for performance

**Snapshots (1/1):**
- [ ] Store at regular intervals
- [ ] Query by timestamp

#### Files to Create/Modify

**New Files:**
```
/internal/service/market_data_service.go
/internal/server/candle_handler.go
/internal/server/statistics_handler.go
/internal/repository/candle_repository.go
/tests/market_data_test.go
```

**Modified Files:**
```
/internal/server/router.go               (add new routes)
/cmd/server/main.go                      (initialize service)
/migrations/008-candles-table.sql        (if needed)
```

#### Testing Strategy

**Unit Tests:**
- Candle generation from trades
- OHLCV calculation correctness
- Time-based filtering
- Coverage: >80%

**Integration Tests:**
- API endpoints functionality
- Query correctness
- Performance

#### Success Criteria

- [x] Candle API working
- [x] 6 timeframes supported
- [x] Historical trades queryable
- [x] 24h statistics accurate
- [x] Unit tests passing (>80%)
- [x] Integration tests passing

---

### TASK-BACKEND-012: Performance Optimization & Profiling
**Points:** 3.0 | **Hours:** 4 | **Priority:** P2 (Enhancement)

#### Objectives

Profile, analyze, and optimize Week 1 components:

1. **CPU Profiling**
   - Identify hotspots in matching engine
   - Analyze order book operations
   - Find optimization opportunities

2. **Memory Profiling**
   - Check for leaks
   - Analyze allocation patterns
   - Optimize data structures

3. **Optimization Implementation**
   - Reduce allocations
   - Improve algorithm efficiency
   - Cache frequently accessed data

#### Profiling Tools

```bash
# CPU profiling
go test -cpuprofile=cpu.prof ./internal/matching/...
go tool pprof cpu.prof

# Memory profiling
go test -memprofile=mem.prof ./internal/matching/...
go tool pprof mem.prof

# Benchmarking
go test -bench=. -benchmem ./internal/matching/...

# Trace analysis
go test -trace=trace.out ./internal/matching/...
go tool trace trace.out
```

#### Expected Optimizations

1. **Order Book:**
   - Reduce allocations per operation
   - Optimize price-level iteration
   - Cache frequently accessed levels

2. **Matching Engine:**
   - Reduce trade struct allocations
   - Optimize matching algorithm
   - Batch trade processing

3. **Database:**
   - Add statement caching
   - Optimize query plans
   - Connection pooling

#### Acceptance Criteria

**Profiling (3/3):**
- [ ] CPU profile generated
- [ ] Memory profile generated
- [ ] Hotspots identified

**Optimization (3/3):**
- [ ] 10%+ improvement in matching speed
- [ ] Memory usage reduced
- [ ] Performance benchmarks still passing

**Documentation (1/1):**
- [ ] Profiling results documented
- [ ] Optimization changes documented
- [ ] Performance improvements measured

#### Files to Create/Modify

**New Files:**
```
/docs/PERFORMANCE_PROFILING_REPORT.md
/benchmarks/ (detailed benchmark results)
```

**Modified Files:**
```
/internal/matching/engine.go             (if optimizations needed)
/internal/matching/order_book.go         (if optimizations needed)
/internal/repository/*.go                (if optimizations needed)
```

#### Testing Strategy

**Benchmarks:**
- Baseline measurements before optimization
- Post-optimization measurements
- Comparison analysis

**Load Testing:**
- Verify performance maintained
- Check for regressions
- Validate improvements

#### Success Criteria

- [x] Profiling complete
- [x] Hotspots identified
- [x] Optimizations implemented
- [x] 10%+ improvement achieved
- [x] No regressions
- [x] Documentation complete

---

### TASK-QA-006: Week 2 Integration Testing
**Points:** 3.0 | **Hours:** 6 | **Priority:** P1 (Important)

#### Objectives

Comprehensive testing of Week 2 features:

1. **Advanced Order Type Tests**
   - Stop order trigger behavior
   - Post-only matching prevention
   - IOC fill + cancel logic
   - FOK all-or-nothing

2. **WebSocket Tests**
   - Connection management
   - Event delivery
   - Multiple subscribers
   - Reconnection handling

3. **Market Data Tests**
   - Candle generation accuracy
   - Time-based filtering
   - Statistics calculation
   - Query performance

4. **Regression Tests**
   - All Week 1 features still working
   - Performance not degraded
   - No data corruption

#### Test Coverage

**Scenarios:**
- 20+ advanced order type scenarios
- 15+ WebSocket scenarios
- 10+ market data scenarios
- 5+ regression scenarios
- **Total: 50+ scenarios**

#### Acceptance Criteria

**Test Execution (3/3):**
- [ ] All scenarios passing
- [ ] Coverage >80%
- [ ] Zero regressions

**Performance (2/2):**
- [ ] Week 1 performance maintained
- [ ] New features meet targets
- [ ] No unexpected degradation

**Documentation (1/1):**
- [ ] Test report generated
- [ ] Results documented

#### Files to Create/Modify

**New Files:**
```
/tests/advanced_orders_integration_test.go
/tests/websocket_integration_test.go
/tests/market_data_integration_test.go
/tests/regression_test.go
/reports/WEEK2_QA_REPORT.md
```

#### Success Criteria

- [x] 50+ test scenarios executed
- [x] 100% pass rate
- [x] Coverage >80%
- [x] No regressions found
- [x] Test report complete

---

## Week 2 Schedule

### Day 6 (Monday) - Foundation Phase

**Morning (9:00 AM - 12:00 PM):**
- TASK-BACKEND-009 Start: Advanced order types validation layer
- TASK-BACKEND-010 Start: WebSocket server setup
- Sprint planning & daily standup

**Afternoon (1:00 PM - 4:00 PM):**
- TASK-BACKEND-009 Continue: Stop order logic
- TASK-BACKEND-010 Continue: Connection manager

**Evening (4:00 PM - 7:00 PM):**
- TASK-BACKEND-009 Continue: Post-only & IOC logic
- TASK-BACKEND-010 Continue: Event publishers

---

### Day 7 (Tuesday) - Feature Implementation

**Morning (9:00 AM - 12:00 PM):**
- TASK-BACKEND-009 Continue: FOK implementation
- TASK-BACKEND-010 Continue: Message formatting

**Afternoon (1:00 PM - 4:00 PM):**
- TASK-BACKEND-009 Testing
- TASK-BACKEND-010 Testing
- TASK-BACKEND-011 Start: Market data service

**Evening (4:00 PM - 7:00 PM):**
- TASK-BACKEND-011 Continue: Candle generation
- TASK-BACKEND-012 Start: Profiling setup

---

### Day 8 (Wednesday) - Continuation

**All Day:**
- TASK-BACKEND-009 Finalization
- TASK-BACKEND-010 Finalization
- TASK-BACKEND-011 Candle endpoints
- TASK-BACKEND-012 CPU profiling

---

### Day 9 (Thursday) - Optimization

**All Day:**
- TASK-BACKEND-011 Historical trades
- TASK-BACKEND-012 Memory profiling
- TASK-BACKEND-012 Optimization implementation
- TASK-QA-006 Start: Test infrastructure

---

### Day 10 (Friday) - Testing

**All Day:**
- TASK-BACKEND-012 Finalization
- TASK-QA-006 Advanced order type tests
- TASK-QA-006 WebSocket tests
- TASK-QA-006 Market data tests

---

### Day 11 (Saturday) - Regression & Polish

**All Day:**
- TASK-QA-006 Regression testing
- TASK-QA-006 Performance validation
- Final code review
- Documentation updates

---

### Day 12 (Sunday) - Week 2 Completion

**All Day:**
- TASK-QA-006 Report generation
- Week 2 completion report
- Sprint 1 final summary
- Deployment preparation

---

## Success Metrics

### Code Delivery

| Task | Points | Target | Status |
|------|--------|--------|--------|
| TASK-BACKEND-009 | 4.0 | Complete | 🎯 |
| TASK-BACKEND-010 | 3.0 | Complete | 🎯 |
| TASK-BACKEND-011 | 3.0 | Complete | 🎯 |
| TASK-BACKEND-012 | 3.0 | Complete | 🎯 |
| TASK-QA-006 | 3.0 | Complete | 🎯 |
| **Total** | **16.0** | **Complete** | **🎯** |

### Quality Targets

| Metric | Target | Status |
|--------|--------|--------|
| Coverage | >80% | 🎯 |
| Performance | No regression | 🎯 |
| Bugs | Zero critical | 🎯 |
| Debt | Zero | 🎯 |

### Schedule

| Metric | Target | Status |
|--------|--------|--------|
| Days Available | 7 | 🎯 |
| Days Needed | 6-7 | 🎯 |
| Buffer | 0-1 | 🎯 |

---

## Risk Management

### Identified Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|-----------|
| Advanced orders complexity | Medium | Medium | Phased implementation |
| WebSocket scaling | Low | Medium | Connection manager design |
| Performance regression | Low | High | Profiling first |
| Integration issues | Low | Medium | Daily integration tests |

### Contingency Plan

**If Behind Schedule:**
1. Defer TASK-BACKEND-012 (optimization)
2. Reduce WebSocket features (MVP only)
3. Simplify market data APIs

**If Ahead of Schedule:**
1. Add self-trade prevention
2. Add performance regression tests
3. Improve documentation
4. Add monitoring/alerting

---

## Team Coordination

### Parallel Task Execution

**Backend Agent 1:** TASK-BACKEND-009 & TASK-BACKEND-012
**Backend Agent 2:** TASK-BACKEND-010 & TASK-BACKEND-011
**QA Agent:** TASK-QA-006

### Daily Synchronization

- 9:00 AM: Stand-up
- 2:00 PM: Mid-day check-in
- 7:00 PM: Evening report
- 11:00 PM: Day-end summary

### Code Review

- Daily reviews during development
- Final review before completion
- Tech lead approval required

---

## Dependencies & Blockers

### Internal Dependencies

- Week 1 components: ✅ Ready
- HTTP API: ✅ Ready
- Matching engine: ✅ Ready
- Database: ✅ Ready

### External Dependencies

- None expected

### Known Blockers

- None currently

---

## Deliverables

### Code

- Advanced order type handlers (NEW)
- WebSocket server (NEW)
- Market data service (NEW)
- Performance optimizations (ENHANCED)

### Tests

- 50+ integration test scenarios
- Performance benchmarks
- Regression test suite

### Documentation

- Week 2 completion report
- API updates (WebSocket, market data)
- Performance profiling report
- Sprint 1 final summary

---

## Success Definition

**Week 2 is successful when:**

1. All 16 story points delivered ✓
2. All 50+ tests passing ✓
3. Coverage >80% ✓
4. No critical bugs ✓
5. Performance targets met ✓
6. Sprint 1 complete ✓

---

## Week 2 Confidence Assessment

| Factor | Status | Comments |
|--------|--------|----------|
| Week 1 Foundation | ✅ Solid | All components ready |
| Task Clarity | ✅ Clear | Well-defined acceptance criteria |
| Team Capacity | ✅ Good | 2.3 pts/day realistic |
| Risk Level | ✅ Low | No major blockers |
| Schedule | ✅ Achievable | 7 days, 6 needed |

**Overall Confidence:** **VERY HIGH** ✅

---

## Conclusion

Week 2 builds on Week 1's exceptional foundation to deliver advanced features that enable professional trading and real-time client experience. With clear task definitions, parallel development, and comprehensive testing, Week 2 is well-positioned to meet all objectives.

**Target:** Complete Sprint 1 with 38 story points by end of Day 12
**Current:** 22.0 / 38 (57.9%) after Week 1
**Remaining:** 16.0 / 38 (42.1%) for Week 2
**Confidence:** VERY HIGH ✅

---

**Document Prepared By:** Tech Lead Agent
**Date:** November 23, 2025
**Version:** 1.0 - Initial Plan
**Next Review:** Day 6 morning standup
