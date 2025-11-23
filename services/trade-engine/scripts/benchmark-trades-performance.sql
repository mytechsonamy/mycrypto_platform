-- Performance Benchmark Script for Trades Table
-- Tests insert, query, and analytics performance

\timing on

\echo '========================================='
\echo 'TRADES TABLE PERFORMANCE BENCHMARK'
\echo '========================================='
\echo ''

-- =============================================================================
-- SETUP: Create sample UUIDs for testing
-- =============================================================================

\echo 'Setup: Creating test data variables...'

DO $$
DECLARE
    v_user1 UUID := gen_random_uuid();
    v_user2 UUID := gen_random_uuid();
    v_order1 UUID := gen_random_uuid();
    v_order2 UUID := gen_random_uuid();
BEGIN
    -- Store in temp table for reuse
    CREATE TEMP TABLE IF NOT EXISTS test_uuids (
        user1 UUID,
        user2 UUID,
        order1 UUID,
        order2 UUID
    );

    TRUNCATE test_uuids;

    INSERT INTO test_uuids VALUES (v_user1, v_user2, v_order1, v_order2);

    RAISE NOTICE 'Test UUIDs created';
END $$;

-- =============================================================================
-- BENCHMARK 1: Single Trade Insert (Target: <5ms)
-- =============================================================================

\echo ''
\echo 'Benchmark 1: Single Trade Insert'
\echo '-----------------------------------------'

EXPLAIN ANALYZE
INSERT INTO trades (
    trade_id,
    symbol,
    buy_order_id,
    sell_order_id,
    buyer_user_id,
    seller_user_id,
    price,
    quantity,
    buyer_fee,
    seller_fee,
    is_buyer_maker,
    executed_at
)
SELECT
    gen_random_uuid(),
    'BTC/USDT',
    (SELECT order1 FROM test_uuids),
    (SELECT order2 FROM test_uuids),
    (SELECT user1 FROM test_uuids),
    (SELECT user2 FROM test_uuids),
    50000.00,
    1.5,
    75.00,    -- 0.10% taker fee (50000 * 1.5 * 0.001)
    37.50,    -- 0.05% maker fee (50000 * 1.5 * 0.0005)
    FALSE,
    NOW();

\echo ''
\echo 'Result: Single insert completed (check execution time above)'
\echo 'Target: <5ms'
\echo ''

-- =============================================================================
-- BENCHMARK 2: Bulk Insert 1000 Trades (Target: <1 second)
-- =============================================================================

\echo 'Benchmark 2: Bulk Insert 1000 Trades'
\echo '-----------------------------------------'

EXPLAIN ANALYZE
INSERT INTO trades (
    trade_id,
    symbol,
    buy_order_id,
    sell_order_id,
    buyer_user_id,
    seller_user_id,
    price,
    quantity,
    buyer_fee,
    seller_fee,
    is_buyer_maker,
    executed_at
)
SELECT
    gen_random_uuid(),
    CASE (random() * 3)::int
        WHEN 0 THEN 'BTC/USDT'
        WHEN 1 THEN 'ETH/USDT'
        WHEN 2 THEN 'SOL/USDT'
        ELSE 'BTC/USDT'
    END,
    gen_random_uuid(),
    gen_random_uuid(),
    gen_random_uuid(),
    gen_random_uuid(),
    (40000 + random() * 20000)::DECIMAL(20, 8),
    (0.01 + random() * 2)::DECIMAL(20, 8),
    ((40000 + random() * 20000) * (0.01 + random() * 2) * 0.001)::DECIMAL(20, 8),
    ((40000 + random() * 20000) * (0.01 + random() * 2) * 0.0005)::DECIMAL(20, 8),
    random() > 0.5,
    NOW() - (random() * INTERVAL '24 hours')
FROM generate_series(1, 1000);

\echo ''
\echo 'Result: 1000 trades inserted (check execution time above)'
\echo 'Target: <1 second'
\echo ''

-- =============================================================================
-- BENCHMARK 3: Query Trades by User (Target: <50ms)
-- =============================================================================

\echo 'Benchmark 3: Query Trades by User (24h)'
\echo '-----------------------------------------'

EXPLAIN ANALYZE
SELECT
    trade_id,
    symbol,
    price,
    quantity,
    buyer_fee + seller_fee AS total_fees,
    executed_at
FROM trades
WHERE buyer_user_id = (SELECT user1 FROM test_uuids LIMIT 1)
   OR seller_user_id = (SELECT user1 FROM test_uuids LIMIT 1)
ORDER BY executed_at DESC
LIMIT 100;

\echo ''
\echo 'Result: User trades query completed (check execution time above)'
\echo 'Target: <50ms'
\echo ''

-- =============================================================================
-- BENCHMARK 4: Query Trades by Symbol (Target: <100ms)
-- =============================================================================

\echo 'Benchmark 4: Query Trades by Symbol (24h)'
\echo '-----------------------------------------'

EXPLAIN ANALYZE
SELECT
    trade_id,
    price,
    quantity,
    price * quantity AS trade_value,
    executed_at
FROM trades
WHERE symbol = 'BTC/USDT'
  AND executed_at >= NOW() - INTERVAL '24 hours'
ORDER BY executed_at DESC
LIMIT 1000;

\echo ''
\echo 'Result: Symbol trades query completed (check execution time above)'
\echo 'Target: <100ms'
\echo ''

-- =============================================================================
-- BENCHMARK 5: Aggregate Volume Query (Target: <200ms)
-- =============================================================================

\echo 'Benchmark 5: Aggregate 24h Volume by Symbol'
\echo '-----------------------------------------'

EXPLAIN ANALYZE
SELECT
    symbol,
    COUNT(*) AS trade_count,
    SUM(quantity) AS total_quantity,
    SUM(price * quantity) AS total_volume,
    AVG(price) AS avg_price,
    MIN(price) AS min_price,
    MAX(price) AS max_price
FROM trades
WHERE executed_at >= NOW() - INTERVAL '24 hours'
GROUP BY symbol
ORDER BY total_volume DESC;

\echo ''
\echo 'Result: Volume aggregation completed (check execution time above)'
\echo 'Target: <200ms'
\echo ''

-- =============================================================================
-- BENCHMARK 6: VWAP Calculation (Target: <100ms)
-- =============================================================================

\echo 'Benchmark 6: VWAP Calculation'
\echo '-----------------------------------------'

EXPLAIN ANALYZE
SELECT calculate_vwap('BTC/USDT', INTERVAL '1 hour') AS vwap_1h;

\echo ''
\echo 'Result: VWAP calculation completed (check execution time above)'
\echo 'Target: <100ms'
\echo ''

-- =============================================================================
-- BENCHMARK 7: OHLCV Data Generation (Target: <300ms)
-- =============================================================================

\echo 'Benchmark 7: OHLCV Candlestick Data'
\echo '-----------------------------------------'

EXPLAIN ANALYZE
SELECT * FROM get_ohlcv('BTC/USDT', INTERVAL '1 hour', INTERVAL '24 hours')
LIMIT 24;

\echo ''
\echo 'Result: OHLCV data generation completed (check execution time above)'
\echo 'Target: <300ms'
\echo ''

-- =============================================================================
-- BENCHMARK 8: User Trade History Function (Target: <50ms)
-- =============================================================================

\echo 'Benchmark 8: User Trade History Function'
\echo '-----------------------------------------'

EXPLAIN ANALYZE
SELECT * FROM get_user_trades(
    (SELECT user1 FROM test_uuids LIMIT 1),
    'BTC/USDT',
    100
);

\echo ''
\echo 'Result: User trade history completed (check execution time above)'
\echo 'Target: <50ms'
\echo ''

-- =============================================================================
-- BENCHMARK 9: Partition Pruning Verification
-- =============================================================================

\echo 'Benchmark 9: Verify Partition Pruning'
\echo '-----------------------------------------'

EXPLAIN (ANALYZE, BUFFERS)
SELECT COUNT(*)
FROM trades
WHERE executed_at >= CURRENT_DATE
  AND executed_at < CURRENT_DATE + INTERVAL '1 day';

\echo ''
\echo 'Check above: Should show only 1 partition scanned'
\echo ''

-- =============================================================================
-- BENCHMARK 10: Index Usage Verification
-- =============================================================================

\echo 'Benchmark 10: Index Usage Statistics'
\echo '-----------------------------------------'

SELECT
    indexname,
    idx_scan AS scans,
    idx_tup_read AS tuples_read,
    idx_tup_fetch AS tuples_fetched,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE tablename = 'trades'
ORDER BY idx_scan DESC;

\echo ''

-- =============================================================================
-- PERFORMANCE SUMMARY
-- =============================================================================

\echo ''
\echo '========================================='
\echo 'PERFORMANCE BENCHMARK SUMMARY'
\echo '========================================='
\echo ''
\echo 'Target Performance Criteria:'
\echo '  1. Single insert:         <5ms       ✓ Check timing above'
\echo '  2. Bulk 1000 inserts:     <1s        ✓ Check timing above'
\echo '  3. User query (24h):      <50ms      ✓ Check timing above'
\echo '  4. Symbol query (24h):    <100ms     ✓ Check timing above'
\echo '  5. Volume aggregation:    <200ms     ✓ Check timing above'
\echo '  6. VWAP calculation:      <100ms     ✓ Check timing above'
\echo '  7. OHLCV generation:      <300ms     ✓ Check timing above'
\echo '  8. User history function: <50ms      ✓ Check timing above'
\echo ''
\echo 'Review EXPLAIN ANALYZE output above to verify:'
\echo '  - Index scans (not sequential scans)'
\echo '  - Partition pruning working'
\echo '  - Reasonable execution times'
\echo ''
\echo 'Next: Review index usage statistics above'
\echo '========================================='
\echo ''

\timing off
