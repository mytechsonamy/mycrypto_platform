-- ================================================================
-- TASK: Stream 3 - Performance Benchmarks
-- Database Engineer Agent
-- Date: 2025-11-23
-- ================================================================

\timing on

\echo '=== PERFORMANCE BENCHMARKS ==='
\echo ''
\echo 'Running critical query performance tests...'
\echo ''

-- ================================================================
-- TEST 1: Get active orders by symbol (CRITICAL)
-- ================================================================
\echo '========================================='
\echo 'TEST 1: Get Active Orders by Symbol'
\echo 'Target: <10ms'
\echo 'Query: Active BTC/USDT orders'
\echo '========================================='
EXPLAIN ANALYZE
SELECT * FROM orders
WHERE symbol = 'BTC/USDT' AND status IN ('OPEN', 'PARTIALLY_FILLED')
LIMIT 100;

\echo ''
\echo '========================================='
\echo 'TEST 2: Get Order History by User'
\echo 'Target: <10ms'
\echo 'Query: User orders in last 7 days'
\echo '========================================='
-- First, let's see if we have any users
SELECT user_id FROM orders LIMIT 1 \gset

EXPLAIN ANALYZE
SELECT * FROM orders
WHERE user_id = :'user_id' AND created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 100;

\echo ''
\echo '========================================='
\echo 'TEST 3: Get Recent Trades by Symbol'
\echo 'Target: <10ms'
\echo 'Query: BTC/USDT trades'
\echo '========================================='
EXPLAIN ANALYZE
SELECT * FROM trades
WHERE symbol = 'BTC/USDT'
ORDER BY executed_at DESC
LIMIT 100;

\echo ''
\echo '========================================='
\echo 'TEST 4: Calculate 24h Statistics'
\echo 'Target: <10ms'
\echo 'Query: 24h high, low, volume'
\echo '========================================='
EXPLAIN ANALYZE
SELECT
  MAX(price) as high,
  MIN(price) as low,
  SUM(quantity) as volume
FROM trades
WHERE symbol = 'BTC/USDT' AND executed_at >= NOW() - INTERVAL '24 hours';

\echo ''
\echo '========================================='
\echo 'TEST 5: Settlement Queries'
\echo 'Target: <10ms'
\echo 'Query: Pending settlement trades'
\echo '========================================='
EXPLAIN ANALYZE
SELECT * FROM trades
WHERE status = 'PENDING_SETTLEMENT'
ORDER BY executed_at
LIMIT 100;

\echo ''
\echo '========================================='
\echo 'TEST 6: User Trade History'
\echo 'Target: <10ms'
\echo 'Query: User trades (buyer side)'
\echo '========================================='
-- Get a buyer_user_id if exists
SELECT buyer_user_id FROM trades LIMIT 1 \gset

EXPLAIN ANALYZE
SELECT * FROM trades
WHERE buyer_user_id = :'buyer_user_id'
ORDER BY executed_at DESC
LIMIT 100;

\echo ''
\echo '========================================='
\echo 'TEST 7: Symbol Volume Calculation'
\echo 'Target: <10ms'
\echo 'Query: Symbol trading volume'
\echo '========================================='
EXPLAIN ANALYZE
SELECT
  symbol,
  COUNT(*) as trade_count,
  SUM(quantity) as total_quantity,
  SUM(quantity * price) as total_volume
FROM trades
WHERE executed_at >= NOW() - INTERVAL '24 hours'
GROUP BY symbol;

\echo ''
\echo '========================================='
\echo 'TEST 8: Order Book Depth'
\echo 'Target: <10ms'
\echo 'Query: Get order book bids and asks'
\echo '========================================='
EXPLAIN ANALYZE
SELECT side, price, SUM(quantity - filled_quantity) as total_quantity
FROM orders
WHERE symbol = 'BTC/USDT' AND status IN ('OPEN', 'PARTIALLY_FILLED')
GROUP BY side, price
ORDER BY
  CASE WHEN side = 'BUY' THEN price END DESC,
  CASE WHEN side = 'SELL' THEN price END ASC
LIMIT 20;

\echo ''
\echo '=== PERFORMANCE BENCHMARKS COMPLETE ==='

\timing off
