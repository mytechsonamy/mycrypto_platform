# Baseline Performance Metrics - Week 2

## Environment

- **Platform**: darwin/arm64
- **CPU**: Apple M5
- **Go Version**: go1.23 (inferred)
- **Date**: 2025-11-23
- **Test Duration**: 2s per benchmark

## Baseline Benchmark Results

### 1. Order Placement Performance

| Operation | ns/op | Throughput | B/op | allocs/op | Status |
|-----------|-------|------------|------|-----------|--------|
| Market Order | 4,280 ns | ~233K ops/sec | 11,352 B | 97 | GOOD |
| Limit Order (Immediate) | 4,540 ns | ~220K ops/sec | 11,551 B | 105 | GOOD |
| Limit Order (To Book) | 1,520 ns | ~657K ops/sec | 1,072 B | 33 | EXCELLENT |

**Analysis:**
- Limit orders to book are 3x faster (no matching required)
- Market orders have high allocation count (97 allocs/op)
- Immediate limit matches similar to market orders

### 2. Order Book Operations

| Operation | ns/op | Throughput | B/op | allocs/op | Status |
|-----------|-------|------------|------|-----------|--------|
| AddOrder | 1,295 ns | ~772K ops/sec | 791 B | 23 | EXCELLENT |
| RemoveOrder | 61,643 ns | ~16K ops/sec | 168 B | 7 | CONCERN |
| GetBestBid | 4.089 ns | ~244M ops/sec | 0 B | 0 | EXCELLENT |
| GetBestAsk | 3.882 ns | ~257M ops/sec | 0 B | 0 | EXCELLENT |
| GetDepth | 4,317 ns | ~231K ops/sec | 3,489 B | 243 | GOOD |
| UpdateOrder | 360.2 ns | ~2.7M ops/sec | 128 B | 5 | EXCELLENT |

**Analysis:**
- Best bid/ask access is extremely fast (cached)
- RemoveOrder is slow (61µs) - requires linear scan
- GetDepth has high allocation count (243 allocs)

### 3. Multi-Level Matching

| Operation | ns/op | Throughput | B/op | allocs/op | Status |
|-----------|-------|------------|------|-----------|--------|
| 5 Levels | 58,258 ns | ~17K ops/sec | 69,540 B | 2,144 | CONCERN |
| 10 Levels | 115,672 ns | ~8.6K ops/sec | 138,881 B | 4,280 | CONCERN |

**Analysis:**
- Linear relationship: 10 levels = 2x time, 2x memory
- High allocation count indicates slice growth
- Each level adds ~400 allocations

### 4. Advanced Operations

| Operation | ns/op | Throughput | B/op | allocs/op | Status |
|-----------|-------|------------|------|-----------|--------|
| CancelOrder | 62,584 ns | ~16K ops/sec | 192 B | 8 | CONCERN |
| HFT Buy/Sell | 1,710 ns | ~584K ops/sec | 1,805 B | 56 | GOOD |
| Multi-Symbol | 1,401 ns | ~713K ops/sec | 1,079 B | 31 | EXCELLENT |
| Realistic Mix | 2,853 ns | ~350K ops/sec | 2,700 B | 72 | GOOD |

**Analysis:**
- CancelOrder performance bottleneck (same as RemoveOrder)
- Multi-symbol scales well (good lock design)
- HFT simulation shows good performance

### 5. Throughput Test

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Matches/sec | 1,422,318 | >1,000,000 | PASS |

**Analysis:**
- Exceeds target by 42%
- Strong throughput performance
- Good headroom for optimization

## CPU Profiling Analysis

### Top CPU Consumers (>2% CPU time)

| Function | CPU Time | % Total | Analysis |
|----------|----------|---------|----------|
| runtime.memmove | 26.88s | 25.61% | Memory copy overhead |
| runtime.madvise | 10.50s | 10.00% | Memory management |
| BenchmarkMatchingEngine_CancelOrder | 7.49s | 7.14% | Test overhead |
| math/big.(*Int).Sub | 7.17s | 6.83% | Decimal arithmetic |
| runtime.kevent | 7.08s | 6.74% | System events |
| runtime.mapaccess2 | 6.48s | 6.17% | Map lookups |
| runtime.memclrNoHeapPointers | 3.93s | 3.74% | Memory clearing |
| runtime.scanobject | 3.04s | 2.90% | GC scanning |
| domain.(*Order).Cancel | 2.93s | 2.79% | Order cancellation |
| runtime.(*mspan).heapBitsSmallForAddr | 2.69s | 2.56% | Memory allocation |

**Key Findings:**
1. **Memory Operations** (25.61%): High memory copying overhead
2. **GC Pressure** (16.24%): Combined GC-related functions
3. **Decimal Arithmetic** (6.83%): shopspring/decimal overhead
4. **Map Access** (6.17%): Order lookup in order book

## Memory Profiling Analysis

### Top Memory Allocators (>2% of allocations)

| Function | Allocated | % Total | Analysis |
|----------|-----------|---------|----------|
| math/big.nat.make | 9,193.88 MB | 28.31% | Decimal arithmetic |
| matchMarketOrder | 3,739 MB | 11.51% | Market order matching |
| matchLimitOrder | 3,632.07 MB | 11.18% | Limit order matching |
| createTestLimitOrder | 3,340.27 MB | 10.29% | Test helper (ignore) |
| decimal.Decimal.rescale | 3,110.59 MB | 9.58% | Decimal operations |
| decimal.Decimal.Sub | 1,373.54 MB | 4.23% | Decimal subtraction |
| createTestMarketOrder | 1,208.29 MB | 3.72% | Test helper (ignore) |
| decimal.Decimal.Add | 1,148.54 MB | 3.54% | Decimal addition |
| createTrade | 1,078.23 MB | 3.32% | Trade object creation |
| orderbook.AddOrder | 975.83 MB | 3.00% | Order book insertion |
| decimal.Decimal.Mul | 608.02 MB | 1.87% | Decimal multiplication |

**Key Findings:**
1. **Decimal Operations** (61.3%): Majority of allocations from decimal arithmetic
2. **Order Matching** (22.69%): matchMarketOrder + matchLimitOrder
3. **Trade Creation** (3.32%): Opportunity for object pooling
4. **Order Book Operations** (3.00%): Slice growth during insertion

## Identified Bottlenecks

### Critical (High Impact)

1. **RemoveOrder/CancelOrder Performance** (61-62µs)
   - **Issue**: Linear scan through orders
   - **Impact**: 40x slower than AddOrder
   - **Fix**: Use map-based lookup (already exists in GetOrder)

2. **High Allocation Rate in Matching** (97 allocs/op)
   - **Issue**: Slice growth, temporary objects
   - **Impact**: GC pressure, memory bandwidth
   - **Fix**: Pre-allocate slices, object pooling

3. **Decimal Arithmetic Overhead** (61.3% of allocations)
   - **Issue**: shopspring/decimal creates many big.Int objects
   - **Impact**: Memory allocations, GC pressure
   - **Fix**: Limited optimization (library dependency)

### Medium (Moderate Impact)

4. **GetDepth Allocation Count** (243 allocs/op)
   - **Issue**: Slice growth when collecting depth data
   - **Impact**: Unnecessary allocations
   - **Fix**: Pre-allocate result slices

5. **Multi-Level Matching** (2,144 allocs for 5 levels)
   - **Issue**: Creates many temporary order copies
   - **Impact**: Memory churn
   - **Fix**: Reduce copying, reuse slices

### Low (Minor Impact)

6. **UUID Generation** (658.51 MB, 2.03%)
   - **Issue**: UUID.New() allocates
   - **Impact**: Minor compared to other sources
   - **Fix**: Not critical for MVP

## Optimization Opportunities

### Safe, High-Impact Optimizations

| Optimization | Target | Est. Improvement | Risk | Priority |
|-------------|--------|------------------|------|----------|
| Object pooling for trades | createTrade | 10-15% reduction in allocations | Very Low | HIGH |
| Pre-allocate slices | GetDepth, matching | 20-30% reduction in allocations | Very Low | HIGH |
| Optimize RemoveOrder | CancelOrder | 60-80% latency reduction | Low | HIGH |
| Cache best bid/ask | GetBestBid/Ask | Already optimal | N/A | DONE |
| Reduce lock scope | Order book | 10-20% contention reduction | Low | MEDIUM |

### Not Recommended (High Risk or Low Benefit)

- Replace shopspring/decimal (high risk, massive refactor)
- Lock-free data structures (high complexity)
- Custom memory allocator (overkill for this scale)

## Performance Targets

### Current vs Target

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Order Placement | 4.3µs | <2.5µs | FAIL (need optimization) |
| Order Book Scan | 4.3µs | <50µs | PASS |
| Matching Throughput | 1.42M/sec | >1.0M/sec | PASS |
| Trade Settlement | N/A | <600µs | Not measured |

**Note**: Order placement target is aggressive. Current performance is good but doesn't meet <2.5µs target. However, throughput target is exceeded.

## Recommendations

### Immediate Actions (Next 2 hours)

1. Implement object pooling for Trade objects
2. Pre-allocate slices in matching functions
3. Optimize RemoveOrder to use map lookup
4. Pre-allocate depth result slices

### Future Considerations (Week 3+)

1. Profile with production-like workload
2. Add performance regression tests to CI
3. Monitor GC pause times in production
4. Consider caching frequently accessed order book snapshots

## Baseline Summary

**Strengths:**
- Excellent throughput (1.42M matches/sec)
- Fast best bid/ask access (3-4ns)
- Good multi-symbol scaling
- Strong order book insert performance

**Weaknesses:**
- High allocation rate (97 allocs/op in matching)
- Slow order removal (61µs)
- Decimal arithmetic overhead (inherent)
- GetDepth allocation count (243 allocs)

**Overall Grade**: B+ (Good performance, room for optimization)
