-- =============================================================================
-- DEPTH CHART PERFORMANCE TESTING SCRIPT
-- Task: DB-EPIC3-002
-- Date: 2025-11-24
-- Purpose: Comprehensive performance analysis of depth chart queries
-- =============================================================================

-- =============================================================================
-- STEP 1: CREATE MISSING PARTITION FOR CURRENT MONTH
-- =============================================================================
CREATE TABLE IF NOT EXISTS orders_2025_11 PARTITION OF orders
    FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');

RAISE NOTICE 'Partition orders_2025_11 created or already exists';

-- =============================================================================
-- STEP 2: CHECK CURRENT DATA STATE
-- =============================================================================
\echo '=============================================================================';
\echo 'CURRENT DATA STATE';
\echo '=============================================================================';

SELECT
    'Total Orders' as metric,
    COUNT(*)::text as value
FROM orders
UNION ALL
SELECT
    'Active Orders' as metric,
    COUNT(*)::text as value
FROM orders
WHERE status IN ('OPEN', 'PARTIALLY_FILLED')
UNION ALL
SELECT
    'BTC_TRY Active Orders' as metric,
    COUNT(*)::text as value
FROM orders
WHERE symbol = 'BTC_TRY'
  AND status IN ('OPEN', 'PARTIALLY_FILLED')
UNION ALL
SELECT
    'Unique Prices (BTC_TRY)' as metric,
    COUNT(DISTINCT price)::text as value
FROM orders
WHERE symbol = 'BTC_TRY'
  AND status IN ('OPEN', 'PARTIALLY_FILLED')
  AND price IS NOT NULL;

-- =============================================================================
-- STEP 3: SHOW EXISTING INDEXES ON ORDERS TABLE
-- =============================================================================
\echo '';
\echo '=============================================================================';
\echo 'EXISTING INDEXES ON ORDERS TABLE';
\echo '=============================================================================';

SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'orders'
ORDER BY indexname;

-- =============================================================================
-- STEP 4: DEPTH CHART QUERY - BID SIDE (EXPLAIN ANALYZE)
-- =============================================================================
\echo '';
\echo '=============================================================================';
\echo 'QUERY 1: BID SIDE DEPTH CHART (Top 50 Levels)';
\echo '=============================================================================';

EXPLAIN (ANALYZE, BUFFERS, TIMING, VERBOSE)
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

-- =============================================================================
-- STEP 5: DEPTH CHART QUERY - ASK SIDE (EXPLAIN ANALYZE)
-- =============================================================================
\echo '';
\echo '=============================================================================';
\echo 'QUERY 2: ASK SIDE DEPTH CHART (Top 50 Levels)';
\echo '=============================================================================';

EXPLAIN (ANALYZE, BUFFERS, TIMING, VERBOSE)
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

-- =============================================================================
-- STEP 6: COMBINED DEPTH QUERY (REALISTIC API PATTERN)
-- =============================================================================
\echo '';
\echo '=============================================================================';
\echo 'QUERY 3: COMBINED DEPTH CHART (Both Sides with CTE)';
\echo '=============================================================================';

EXPLAIN (ANALYZE, BUFFERS, TIMING, VERBOSE)
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
-- STEP 7: INDEX USAGE STATISTICS
-- =============================================================================
\echo '';
\echo '=============================================================================';
\echo 'INDEX USAGE STATISTICS';
\echo '=============================================================================';

SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch,
    CASE
        WHEN (idx_scan + seq_scan) = 0 THEN 0
        ELSE ROUND(100.0 * idx_scan / (idx_scan + seq_scan), 2)
    END as index_usage_pct
FROM pg_stat_user_indexes
JOIN pg_stat_user_tables USING (schemaname, tablename)
WHERE schemaname = 'public'
  AND tablename LIKE 'orders%'
ORDER BY idx_scan DESC
LIMIT 20;

-- =============================================================================
-- STEP 8: CACHE HIT RATIOS
-- =============================================================================
\echo '';
\echo '=============================================================================';
\echo 'CACHE HIT RATIOS';
\echo '=============================================================================';

WITH table_stats AS (
    SELECT
        schemaname,
        tablename,
        heap_blks_read,
        heap_blks_hit,
        CASE
            WHEN (heap_blks_read + heap_blks_hit) = 0 THEN 100.0
            ELSE ROUND(100.0 * heap_blks_hit / (heap_blks_read + heap_blks_hit), 2)
        END as cache_hit_ratio
    FROM pg_statio_user_tables
    WHERE tablename LIKE 'orders%'
),
index_stats AS (
    SELECT
        schemaname,
        tablename,
        indexname,
        idx_blks_read,
        idx_blks_hit,
        CASE
            WHEN (idx_blks_read + idx_blks_hit) = 0 THEN 100.0
            ELSE ROUND(100.0 * idx_blks_hit / (idx_blks_read + idx_blks_hit), 2)
        END as cache_hit_ratio
    FROM pg_statio_user_indexes
    WHERE tablename LIKE 'orders%'
)
SELECT 'TABLE' as type, tablename as name, cache_hit_ratio FROM table_stats
UNION ALL
SELECT 'INDEX' as type, indexname as name, cache_hit_ratio FROM index_stats
ORDER BY type, cache_hit_ratio DESC;

-- =============================================================================
-- STEP 9: TABLE AND INDEX SIZES
-- =============================================================================
\echo '';
\echo '=============================================================================';
\echo 'TABLE AND INDEX SIZES';
\echo '=============================================================================';

SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
    pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as indexes_size
FROM pg_tables
WHERE tablename LIKE 'orders%'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- =============================================================================
-- STEP 10: QUERY EXECUTION TIME BENCHMARK (Multiple Runs)
-- =============================================================================
\echo '';
\echo '=============================================================================';
\echo 'BENCHMARK: AVERAGE EXECUTION TIME (10 Runs)';
\echo '=============================================================================';

DO $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    execution_times DECIMAL[] := ARRAY[]::DECIMAL[];
    exec_time DECIMAL;
    i INT;
    result_count INT;
BEGIN
    -- Benchmark BID query
    FOR i IN 1..10 LOOP
        start_time := clock_timestamp();

        SELECT COUNT(*) INTO result_count FROM (
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
        ) q;

        end_time := clock_timestamp();
        exec_time := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
        execution_times := array_append(execution_times, exec_time);
    END LOOP;

    RAISE NOTICE 'BID Query Benchmark (10 runs):';
    RAISE NOTICE '  Min: % ms', (SELECT MIN(v) FROM unnest(execution_times) v);
    RAISE NOTICE '  Max: % ms', (SELECT MAX(v) FROM unnest(execution_times) v);
    RAISE NOTICE '  Avg: % ms', (SELECT ROUND(AVG(v), 3) FROM unnest(execution_times) v);
    RAISE NOTICE '  Median: % ms', (SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY v) FROM unnest(execution_times) v);

    -- Benchmark ASK query
    execution_times := ARRAY[]::DECIMAL[];
    FOR i IN 1..10 LOOP
        start_time := clock_timestamp();

        SELECT COUNT(*) INTO result_count FROM (
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
        ) q;

        end_time := clock_timestamp();
        exec_time := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
        execution_times := array_append(execution_times, exec_time);
    END LOOP;

    RAISE NOTICE '';
    RAISE NOTICE 'ASK Query Benchmark (10 runs):';
    RAISE NOTICE '  Min: % ms', (SELECT MIN(v) FROM unnest(execution_times) v);
    RAISE NOTICE '  Max: % ms', (SELECT MAX(v) FROM unnest(execution_times) v);
    RAISE NOTICE '  Avg: % ms', (SELECT ROUND(AVG(v), 3) FROM unnest(execution_times) v);
    RAISE NOTICE '  Median: % ms', (SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY v) FROM unnest(execution_times) v);
END $$;

-- =============================================================================
-- STEP 11: SAMPLE RESULTS (Verify Query Correctness)
-- =============================================================================
\echo '';
\echo '=============================================================================';
\echo 'SAMPLE RESULTS: Top 10 BID Levels';
\echo '=============================================================================';

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
LIMIT 10;

\echo '';
\echo '=============================================================================';
\echo 'SAMPLE RESULTS: Top 10 ASK Levels';
\echo '=============================================================================';

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
LIMIT 10;

-- =============================================================================
-- STEP 12: RECOMMENDATIONS
-- =============================================================================
\echo '';
\echo '=============================================================================';
\echo 'PERFORMANCE ANALYSIS COMPLETE';
\echo '=============================================================================';
\echo 'Review the EXPLAIN ANALYZE output above to determine:';
\echo '1. Are indexes being used? (Look for "Index Scan" vs "Seq Scan")';
\echo '2. Is execution time < 50ms? (Look for "Execution Time")';
\echo '3. Are there unnecessary sorts? (Look for "Sort" nodes)';
\echo '4. What is the buffer hit rate? (Look for "Buffers: shared hit=X read=Y")';
\echo '';
\echo 'Optimization criteria:';
\echo '- Target: < 50ms execution time';
\echo '- Index usage: Should use idx_orders_symbol_status or better';
\echo '- Cache hit ratio: Should be > 95%';
\echo '- Buffer usage: Minimize disk reads';
\echo '';
\echo 'Next steps:';
\echo '1. If sequential scans found: Create partial index on (symbol, side, status, price)';
\echo '2. If execution time > 50ms: Consider covering index with INCLUDE clause';
\echo '3. If cache hit ratio < 95%: Increase shared_buffers or warm up cache';
\echo '=============================================================================';
