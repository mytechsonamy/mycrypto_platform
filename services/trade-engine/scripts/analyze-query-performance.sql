-- =============================================================================
-- QUERY PERFORMANCE ANALYSIS SCRIPT
-- =============================================================================
-- Description: Run EXPLAIN ANALYZE on key queries to verify index usage and performance
-- Author: Database Agent
-- Date: 2025-11-23
-- Usage: psql -U trade_engine_app -d mytrader_trade_engine -f analyze-query-performance.sql
-- =============================================================================

\timing on
\echo '========================================================================='
\echo 'QUERY PERFORMANCE ANALYSIS - Trade Engine Database'
\echo '========================================================================='
\echo ''

-- =============================================================================
-- QUERY 1: Order Listing by User (Most Common Query)
-- =============================================================================
\echo 'QUERY 1: Get orders by user_id with status filter'
\echo '---------------------------------------------------------------------'

EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT TEXT)
SELECT *
FROM orders
WHERE user_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid
  AND status IN ('OPEN', 'PARTIALLY_FILLED')
ORDER BY created_at DESC
LIMIT 50;

\echo ''
\echo 'Expected: Index scan on idx_orders_user_status or idx_orders_user_symbol_status'
\echo ''

-- =============================================================================
-- QUERY 2: Order Book Depth Query
-- =============================================================================
\echo 'QUERY 2: Get order book depth for symbol'
\echo '---------------------------------------------------------------------'

EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT TEXT)
SELECT
    side,
    price,
    SUM(quantity) as total_quantity,
    COUNT(*) as order_count
FROM order_book
WHERE symbol = 'BTC/USDT'
  AND side = 'BUY'
GROUP BY side, price
ORDER BY price DESC
LIMIT 20;

\echo ''
\echo 'Expected: Index scan on idx_orderbook_symbol_side_price'
\echo ''

-- =============================================================================
-- QUERY 3: Trade History by Symbol
-- =============================================================================
\echo 'QUERY 3: Get recent trades for symbol (last 24 hours)'
\echo '---------------------------------------------------------------------'

EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT TEXT)
SELECT
    symbol,
    price,
    quantity,
    executed_at,
    side
FROM trades
WHERE symbol = 'BTC/USDT'
  AND executed_at >= NOW() - INTERVAL '24 hours'
ORDER BY executed_at DESC
LIMIT 100;

\echo ''
\echo 'Expected: Index scan on idx_trades_symbol_time with partition pruning'
\echo ''

-- =============================================================================
-- QUERY 4: User's Trade History
-- =============================================================================
\echo 'QUERY 4: Get user trade history'
\echo '---------------------------------------------------------------------'

EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT TEXT)
SELECT
    t.symbol,
    t.price,
    t.quantity,
    t.executed_at,
    t.side,
    t.fee_amount
FROM trades t
WHERE (t.maker_user_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid
   OR t.taker_user_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid)
  AND t.executed_at >= NOW() - INTERVAL '30 days'
ORDER BY t.executed_at DESC
LIMIT 50;

\echo ''
\echo 'Expected: Bitmap scan on idx_trades_maker_user_time or idx_trades_taker_user_time'
\echo ''

-- =============================================================================
-- QUERY 5: Market Data Latest Ticker
-- =============================================================================
\echo 'QUERY 5: Get latest market data for symbol'
\echo '---------------------------------------------------------------------'

EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT TEXT)
SELECT *
FROM market_data
WHERE symbol = 'BTC/USDT'
ORDER BY timestamp DESC
LIMIT 1;

\echo ''
\echo 'Expected: Index scan on idx_market_data_symbol_timestamp'
\echo ''

-- =============================================================================
-- QUERY 6: Candle Data for Chart
-- =============================================================================
\echo 'QUERY 6: Get candle data for chart (1-hour interval, last 7 days)'
\echo '---------------------------------------------------------------------'

EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT TEXT)
SELECT
    symbol,
    interval,
    open_time,
    open,
    high,
    low,
    close,
    volume
FROM candles
WHERE symbol = 'BTC/USDT'
  AND interval = '1h'
  AND open_time >= NOW() - INTERVAL '7 days'
ORDER BY open_time ASC;

\echo ''
\echo 'Expected: Index scan on idx_candles_symbol_interval_time'
\echo ''

-- =============================================================================
-- QUERY 7: Partition Pruning Test (Orders)
-- =============================================================================
\echo 'QUERY 7: Partition pruning test - orders from specific month'
\echo '---------------------------------------------------------------------'

EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT TEXT)
SELECT COUNT(*)
FROM orders
WHERE created_at >= '2024-11-01'::timestamp
  AND created_at < '2024-12-01'::timestamp;

\echo ''
\echo 'Expected: Only November 2024 partition scanned (partition pruning working)'
\echo ''

-- =============================================================================
-- QUERY 8: Partition Pruning Test (Trades)
-- =============================================================================
\echo 'QUERY 8: Partition pruning test - trades from specific day'
\echo '---------------------------------------------------------------------'

EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT TEXT)
SELECT COUNT(*)
FROM trades
WHERE executed_at >= '2024-11-22'::timestamp
  AND executed_at < '2024-11-23'::timestamp;

\echo ''
\echo 'Expected: Only 2024-11-22 partition scanned (partition pruning working)'
\echo ''

-- =============================================================================
-- QUERY 9: Order Status Aggregation
-- =============================================================================
\echo 'QUERY 9: Order status aggregation by symbol'
\echo '---------------------------------------------------------------------'

EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT TEXT)
SELECT
    symbol,
    status,
    COUNT(*) as order_count,
    SUM(quantity - filled_quantity) as remaining_quantity
FROM orders
WHERE status IN ('OPEN', 'PARTIALLY_FILLED')
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY symbol, status;

\echo ''
\echo 'Expected: Index scan on idx_orders_status_created or parallel seq scan if many rows'
\echo ''

-- =============================================================================
-- QUERY 10: Complex Join - Order with Trades
-- =============================================================================
\echo 'QUERY 10: Orders with associated trades (join query)'
\echo '---------------------------------------------------------------------'

EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT TEXT)
SELECT
    o.id as order_id,
    o.symbol,
    o.quantity,
    o.filled_quantity,
    COUNT(t.id) as trade_count,
    SUM(t.quantity) as total_trade_quantity
FROM orders o
LEFT JOIN trades t ON (t.maker_order_id = o.id OR t.taker_order_id = o.id)
WHERE o.user_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid
  AND o.created_at >= NOW() - INTERVAL '30 days'
GROUP BY o.id, o.symbol, o.quantity, o.filled_quantity
ORDER BY o.created_at DESC
LIMIT 20;

\echo ''
\echo 'Expected: Nested loop or hash join with index scans'
\echo ''

-- =============================================================================
-- SUMMARY: Index Usage Statistics
-- =============================================================================
\echo ''
\echo '========================================================================='
\echo 'INDEX USAGE SUMMARY'
\echo '========================================================================='

SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

\echo ''
\echo '========================================================================='
\echo 'PERFORMANCE ANALYSIS COMPLETE'
\echo '========================================================================='
\echo ''
\echo 'Review the EXPLAIN ANALYZE output above to verify:'
\echo '  1. Indexes are being used (look for "Index Scan" or "Index Only Scan")'
\echo '  2. Partition pruning is working (check partitions scanned)'
\echo '  3. Query execution times are acceptable (<100ms for most queries)'
\echo '  4. Buffer cache hit rates are high (>99%)'
\echo ''
\echo 'If you see "Seq Scan" on large tables, consider adding indexes.'
\echo 'If partition pruning is not working, check partition key constraints.'
\echo ''
