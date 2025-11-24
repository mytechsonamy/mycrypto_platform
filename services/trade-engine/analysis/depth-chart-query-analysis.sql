-- =============================================================================
-- DEPTH CHART QUERY PERFORMANCE ANALYSIS
-- Task: DB-EPIC3-002
-- Date: 2025-11-24
-- Engineer: Database Agent
-- =============================================================================
--
-- PURPOSE:
-- Analyze and optimize depth chart queries for Story 3.1 (Order Book Display)
-- Target: <50ms execution time with 1000+ orders in the order book
--
-- =============================================================================

-- =============================================================================
-- PART 1: CURRENT STATE ANALYSIS
-- =============================================================================

-- Show current indexes on orders table
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'orders'
ORDER BY indexname;

-- Show table statistics
SELECT
    schemaname,
    tablename,
    n_live_tup as row_count,
    n_dead_tup as dead_rows,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables
WHERE tablename LIKE 'orders%';

-- =============================================================================
-- PART 2: DEPTH CHART QUERY PATTERNS
-- =============================================================================

-- Query Pattern 1: BID SIDE (Highest prices first, top 50 levels)
-- This aggregates all open/partially filled BUY orders by price
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT
    price,
    SUM(quantity - filled_quantity) as volume,
    COUNT(*) as order_count
FROM orders
WHERE symbol = 'BTC_TRY'
  AND status IN ('OPEN', 'PARTIALLY_FILLED')
  AND side = 'BUY'
  AND price IS NOT NULL
GROUP BY price
ORDER BY price DESC
LIMIT 50;

-- Query Pattern 2: ASK SIDE (Lowest prices first, top 50 levels)
-- This aggregates all open/partially filled SELL orders by price
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT
    price,
    SUM(quantity - filled_quantity) as volume,
    COUNT(*) as order_count
FROM orders
WHERE symbol = 'BTC_TRY'
  AND status IN ('OPEN', 'PARTIALLY_FILLED')
  AND side = 'SELL'
  AND price IS NOT NULL
GROUP BY price
ORDER BY price ASC
LIMIT 50;

-- Query Pattern 3: COMBINED DEPTH (Both sides with cumulative calculation)
-- This is what the backend will use for depth chart API
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
WITH bid_levels AS (
    SELECT
        price,
        SUM(quantity - filled_quantity) as volume,
        COUNT(*) as order_count
    FROM orders
    WHERE symbol = 'BTC_TRY'
      AND status IN ('OPEN', 'PARTIALLY_FILLED')
      AND side = 'BUY'
      AND price IS NOT NULL
    GROUP BY price
    ORDER BY price DESC
    LIMIT 50
),
ask_levels AS (
    SELECT
        price,
        SUM(quantity - filled_quantity) as volume,
        COUNT(*) as order_count
    FROM orders
    WHERE symbol = 'BTC_TRY'
      AND status IN ('OPEN', 'PARTIALLY_FILLED')
      AND side = 'SELL'
      AND price IS NOT NULL
    GROUP BY price
    ORDER BY price ASC
    LIMIT 50
)
SELECT 'BID' as side, price, volume, order_count FROM bid_levels
UNION ALL
SELECT 'ASK' as side, price, volume, order_count FROM ask_levels;

-- =============================================================================
-- PART 3: INDEX ANALYSIS
-- =============================================================================

-- Check index usage statistics
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch,
    ROUND(100.0 * idx_scan / NULLIF(idx_scan + seq_scan, 0), 2) as index_usage_pct
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND tablename LIKE 'orders%'
ORDER BY idx_scan DESC;

-- Analyze index size
SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
    idx_scan,
    idx_tup_read
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND tablename LIKE 'orders%'
ORDER BY pg_relation_size(indexrelid) DESC;

-- =============================================================================
-- PART 4: QUERY OPTIMIZATION RECOMMENDATIONS
-- =============================================================================

-- Recommendation 1: Partial Index on Active Orders with Price
-- This index will cover: symbol, status, side, price (for active orders only)
-- Benefit: Smaller index, faster scans for depth chart queries
-- Trade-off: ~30-40% smaller than full index, only for OPEN/PARTIALLY_FILLED

-- Recommendation 2: Composite Index with INCLUDE clause
-- This would be a covering index that includes computed columns
-- Benefit: Avoid table lookups for depth aggregation
-- Trade-off: Larger index size, more maintenance overhead

-- Recommendation 3: Materialized View for Top 50 Levels
-- Pre-compute depth chart data, refresh every 1-5 seconds
-- Benefit: Ultra-fast reads (<1ms)
-- Trade-off: Slightly stale data, refresh overhead

-- =============================================================================
-- PART 5: EXPECTED PERFORMANCE BASELINE
-- =============================================================================

-- With current indexes (idx_orders_symbol_status):
-- Expected: 5-20ms for 100 orders, 20-80ms for 1000 orders
--
-- With partial index on (symbol, side, status, price) WHERE status IN ('OPEN', 'PARTIALLY_FILLED'):
-- Expected: 2-10ms for 100 orders, 10-30ms for 1000 orders
--
-- With covering index INCLUDE (quantity, filled_quantity):
-- Expected: 1-5ms for 100 orders, 5-15ms for 1000 orders

-- =============================================================================
-- PART 6: STRESS TEST QUERY
-- =============================================================================

-- Count active orders by symbol (baseline)
SELECT
    symbol,
    side,
    COUNT(*) as order_count,
    COUNT(DISTINCT price) as price_levels
FROM orders
WHERE status IN ('OPEN', 'PARTIALLY_FILLED')
  AND price IS NOT NULL
GROUP BY symbol, side
ORDER BY order_count DESC;

-- Measure aggregation performance
SELECT
    symbol,
    AVG(execution_time_ms) as avg_time_ms,
    MAX(execution_time_ms) as max_time_ms,
    COUNT(*) as query_count
FROM (
    SELECT
        'BTC_TRY' as symbol,
        EXTRACT(EPOCH FROM (clock_timestamp() - query_start)) * 1000 as execution_time_ms,
        query_start
    FROM (
        SELECT
            clock_timestamp() as query_start,
            price,
            SUM(quantity - filled_quantity) as volume
        FROM orders
        WHERE symbol = 'BTC_TRY'
          AND status IN ('OPEN', 'PARTIALLY_FILLED')
          AND side = 'BUY'
          AND price IS NOT NULL
        GROUP BY price
        ORDER BY price DESC
        LIMIT 50
    ) q
) timings
GROUP BY symbol;

-- =============================================================================
-- PART 7: CACHE ANALYSIS
-- =============================================================================

-- Check cache hit ratio for orders table
SELECT
    schemaname,
    tablename,
    heap_blks_read,
    heap_blks_hit,
    ROUND(100.0 * heap_blks_hit / NULLIF(heap_blks_read + heap_blks_hit, 0), 2) as cache_hit_ratio
FROM pg_statio_user_tables
WHERE tablename LIKE 'orders%'
ORDER BY cache_hit_ratio DESC;

-- Check index cache hit ratio
SELECT
    schemaname,
    tablename,
    indexname,
    idx_blks_read,
    idx_blks_hit,
    ROUND(100.0 * idx_blks_hit / NULLIF(idx_blks_read + idx_blks_hit, 0), 2) as cache_hit_ratio
FROM pg_statio_user_indexes
WHERE tablename LIKE 'orders%'
ORDER BY cache_hit_ratio DESC;

-- =============================================================================
-- PART 8: VALIDATION QUERIES
-- =============================================================================

-- Verify data distribution
SELECT
    status,
    side,
    COUNT(*) as order_count,
    COUNT(DISTINCT symbol) as symbol_count,
    COUNT(DISTINCT price) as price_levels
FROM orders
WHERE price IS NOT NULL
GROUP BY status, side
ORDER BY order_count DESC;

-- Check for missing indexes (sequential scans)
SELECT
    schemaname,
    tablename,
    seq_scan,
    seq_tup_read,
    idx_scan,
    idx_tup_fetch,
    ROUND(100.0 * seq_tup_read / NULLIF(seq_tup_read + idx_tup_fetch, 0), 2) as seq_scan_pct
FROM pg_stat_user_tables
WHERE tablename LIKE 'orders%'
  AND seq_scan > 0
ORDER BY seq_tup_read DESC;

-- =============================================================================
-- END OF ANALYSIS SCRIPT
-- =============================================================================
--
-- NEXT STEPS:
-- 1. Run this script against the database
-- 2. Analyze EXPLAIN ANALYZE output
-- 3. Identify bottlenecks (sequential scans, large buffer usage)
-- 4. Determine if new indexes are needed
-- 5. Create migration script if optimization is required
-- 6. Re-run analysis to validate improvements
--
-- =============================================================================
