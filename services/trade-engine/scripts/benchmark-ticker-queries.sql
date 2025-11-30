-- =============================================================================
-- TICKER QUERY PERFORMANCE BENCHMARK
-- Task: DB-EPIC3-003
-- Purpose: Analyze and optimize queries for Story 3.2 (Ticker Display)
-- Target: All queries < 30ms
-- =============================================================================

\timing on

-- =============================================================================
-- SETUP: Ensure we have recent data for testing
-- =============================================================================

\echo '============================================================================='
\echo 'DATA PREPARATION: Checking test data'
\echo '============================================================================='

-- Check data distribution
SELECT
    symbol,
    COUNT(*) as trade_count,
    MIN(executed_at) as first_trade,
    MAX(executed_at) as last_trade,
    AGE(MAX(executed_at), MIN(executed_at)) as time_span
FROM trades
GROUP BY symbol
ORDER BY trade_count DESC;

\echo ''
\echo '============================================================================='
\echo 'TEST 1: Recent Price Query (Last Trade)'
\echo 'Purpose: Show current price in ticker'
\echo 'Target: < 30ms'
\echo '============================================================================='

EXPLAIN (ANALYZE, BUFFERS, TIMING, VERBOSE)
SELECT price, executed_at
FROM trades
WHERE symbol = 'BTC/USDT'
ORDER BY executed_at DESC
LIMIT 1;

\echo ''
\echo '============================================================================='
\echo 'TEST 2: 24h High/Low/Volume Statistics'
\echo 'Purpose: Show 24h trading statistics'
\echo 'Target: < 30ms'
\echo '============================================================================='

EXPLAIN (ANALYZE, BUFFERS, TIMING, VERBOSE)
SELECT
  MAX(price) as high,
  MIN(price) as low,
  SUM(quantity) as volume
FROM trades
WHERE symbol = 'BTC/USDT'
  AND executed_at >= NOW() - INTERVAL '24 hours';

\echo ''
\echo '============================================================================='
\echo 'TEST 3: 24h OHLCV Statistics (with Open/Close)'
\echo 'Purpose: Full ticker display data'
\echo 'Target: < 30ms'
\echo '============================================================================='

EXPLAIN (ANALYZE, BUFFERS, TIMING, VERBOSE)
SELECT
  (ARRAY_AGG(price ORDER BY executed_at ASC))[1] as open,
  MAX(price) as high,
  MIN(price) as low,
  (ARRAY_AGG(price ORDER BY executed_at DESC))[1] as close,
  SUM(quantity) as volume,
  COUNT(*) as trade_count
FROM trades
WHERE symbol = 'BTC/USDT'
  AND executed_at >= NOW() - INTERVAL '24 hours';

\echo ''
\echo '============================================================================='
\echo 'TEST 4: 24h Price Change Calculation'
\echo 'Purpose: Calculate % change for ticker'
\echo 'Target: < 30ms'
\echo '============================================================================='

EXPLAIN (ANALYZE, BUFFERS, TIMING, VERBOSE)
WITH current_stats AS (
  SELECT
    (ARRAY_AGG(price ORDER BY executed_at ASC))[1] as open_price,
    (ARRAY_AGG(price ORDER BY executed_at DESC))[1] as close_price
  FROM trades
  WHERE symbol = 'BTC/USDT'
    AND executed_at >= NOW() - INTERVAL '24 hours'
)
SELECT
  open_price,
  close_price,
  close_price - open_price as change_abs,
  ROUND(((close_price - open_price) / NULLIF(open_price, 0) * 100)::numeric, 2) as change_pct
FROM current_stats;

\echo ''
\echo '============================================================================='
\echo 'TEST 5: Multi-Symbol Ticker (All Pairs)'
\echo 'Purpose: Display ticker for all trading pairs on homepage'
\echo 'Target: < 100ms for all symbols'
\echo '============================================================================='

EXPLAIN (ANALYZE, BUFFERS, TIMING, VERBOSE)
SELECT
  symbol,
  (ARRAY_AGG(price ORDER BY executed_at DESC))[1] as last_price,
  (ARRAY_AGG(price ORDER BY executed_at ASC))[1] as open_price,
  MAX(price) as high,
  MIN(price) as low,
  SUM(quantity) as volume,
  COUNT(*) as trade_count
FROM trades
WHERE executed_at >= NOW() - INTERVAL '24 hours'
GROUP BY symbol
ORDER BY symbol;

\echo ''
\echo '============================================================================='
\echo 'TEST 6: Index Usage Analysis'
\echo 'Purpose: Verify optimal index selection'
\echo '============================================================================='

SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch,
    pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND tablename LIKE 'trades%'
ORDER BY idx_scan DESC;

\echo ''
\echo '============================================================================='
\echo 'TEST 7: Existing Index Coverage'
\echo 'Purpose: List all indexes on trades table'
\echo '============================================================================='

SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'trades'
ORDER BY indexname;

\echo ''
\echo '============================================================================='
\echo 'TEST 8: Sequential Scan Detection'
\echo 'Purpose: Identify queries using seq scan instead of index scan'
\echo '============================================================================='

SELECT
    schemaname,
    relname,
    seq_scan,
    seq_tup_read,
    idx_scan,
    idx_tup_fetch,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND relname LIKE 'trades%'
ORDER BY seq_scan DESC;

\echo ''
\echo '============================================================================='
\echo 'TEST 9: Real-Time Performance Test (10 consecutive queries)'
\echo 'Purpose: Simulate real-time ticker updates'
\echo 'Target: Consistent < 30ms'
\echo '============================================================================='

-- Run the ticker query 10 times to test consistency
\set ECHO queries

SELECT price, executed_at FROM trades WHERE symbol = 'BTC/USDT' ORDER BY executed_at DESC LIMIT 1;
SELECT price, executed_at FROM trades WHERE symbol = 'ETH/USDT' ORDER BY executed_at DESC LIMIT 1;
SELECT price, executed_at FROM trades WHERE symbol = 'SOL/USDT' ORDER BY executed_at DESC LIMIT 1;
SELECT price, executed_at FROM trades WHERE symbol = 'BNB/USDT' ORDER BY executed_at DESC LIMIT 1;
SELECT price, executed_at FROM trades WHERE symbol = 'XRP/USDT' ORDER BY executed_at DESC LIMIT 1;
SELECT price, executed_at FROM trades WHERE symbol = 'BTC/USDT' ORDER BY executed_at DESC LIMIT 1;
SELECT price, executed_at FROM trades WHERE symbol = 'ETH/USDT' ORDER BY executed_at DESC LIMIT 1;
SELECT price, executed_at FROM trades WHERE symbol = 'SOL/USDT' ORDER BY executed_at DESC LIMIT 1;
SELECT price, executed_at FROM trades WHERE symbol = 'BNB/USDT' ORDER BY executed_at DESC LIMIT 1;
SELECT price, executed_at FROM trades WHERE symbol = 'XRP/USDT' ORDER BY executed_at DESC LIMIT 1;

\set ECHO none

\echo ''
\echo '============================================================================='
\echo 'TEST 10: Cache Performance (Warm Cache)'
\echo 'Purpose: Test performance with data in buffer cache'
\echo '============================================================================='

-- Run the same query twice to test warm cache performance
\echo 'First run (cold cache):'
SELECT
  MAX(price) as high,
  MIN(price) as low,
  SUM(quantity) as volume
FROM trades
WHERE symbol = 'BTC/USDT'
  AND executed_at >= NOW() - INTERVAL '24 hours';

\echo ''
\echo 'Second run (warm cache):'
SELECT
  MAX(price) as high,
  MIN(price) as low,
  SUM(quantity) as volume
FROM trades
WHERE symbol = 'BTC/USDT'
  AND executed_at >= NOW() - INTERVAL '24 hours';

\echo ''
\echo '============================================================================='
\echo 'BENCHMARK COMPLETE'
\echo '============================================================================='
\echo 'Next Steps:'
\echo '1. Review EXPLAIN ANALYZE outputs for index usage'
\echo '2. Identify any sequential scans'
\echo '3. Check if all queries meet < 30ms target'
\echo '4. Determine if partial index on 24h data would improve performance'
\echo '============================================================================='
