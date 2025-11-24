-- ================================================================
-- Performance Benchmark Queries
-- Database Engineer Agent
-- Date: 2025-11-23
-- ================================================================

\timing on

\echo '========================================'
\echo 'PERFORMANCE BENCHMARK SUITE'
\echo 'Target: All queries < 10ms'
\echo '========================================'
\echo ''

-- ================================================================
-- Query 1: Active orders by symbol (CRITICAL)
-- ================================================================
\echo '----------------------------------------'
\echo 'Query 1: Active orders by symbol'
\echo 'Target: < 10ms'
\echo '----------------------------------------'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM orders
WHERE symbol = 'BTC/USDT' AND status = 'OPEN'
LIMIT 100;

\echo ''
\echo '----------------------------------------'
\echo 'Query 2: Recent trades by symbol'
\echo 'Target: < 10ms'
\echo '----------------------------------------'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM trades
WHERE symbol = 'BTC/USDT'
ORDER BY executed_at DESC
LIMIT 100;

\echo ''
\echo '----------------------------------------'
\echo 'Query 3: Trade volume (24h aggregation)'
\echo 'Target: < 10ms'
\echo '----------------------------------------'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT
  symbol,
  COUNT(*) as trade_count,
  SUM(quantity) as total_quantity,
  SUM(quantity * price) as total_volume
FROM trades
WHERE executed_at >= NOW() - INTERVAL '24 hours'
GROUP BY symbol;

\echo ''
\echo '----------------------------------------'
\echo 'Query 4: 24h statistics for symbol'
\echo 'Target: < 10ms'
\echo '----------------------------------------'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT
  MAX(price) as high,
  MIN(price) as low,
  SUM(quantity) as volume,
  COUNT(*) as trade_count
FROM trades
WHERE symbol = 'BTC/USDT' AND executed_at >= NOW() - INTERVAL '24 hours';

\echo ''
\echo '----------------------------------------'
\echo 'Query 5: Order book depth (bids + asks)'
\echo 'Target: < 10ms'
\echo '----------------------------------------'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT
  side,
  price,
  SUM(quantity - filled_quantity) as total_quantity,
  COUNT(*) as order_count
FROM orders
WHERE symbol = 'BTC/USDT' AND status = 'OPEN'
GROUP BY side, price
ORDER BY
  CASE WHEN side = 'BUY' THEN price END DESC,
  CASE WHEN side = 'SELL' THEN price END ASC
LIMIT 20;

\echo ''
\echo '========================================'
\echo 'BENCHMARKS COMPLETE'
\echo '========================================'

\timing off
