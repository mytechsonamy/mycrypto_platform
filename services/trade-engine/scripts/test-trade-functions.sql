-- Test Script for Trade Utility Functions
-- Comprehensive functional testing of all trade-related functions

\echo '========================================='
\echo 'TRADE FUNCTIONS TEST SUITE'
\echo '========================================='
\echo ''

-- =============================================================================
-- SETUP: Create test data
-- =============================================================================

\echo 'Setup: Creating test data...'
\echo '-----------------------------------------'

DO $$
DECLARE
    v_user1 UUID := gen_random_uuid();
    v_user2 UUID := gen_random_uuid();
    v_user3 UUID := gen_random_uuid();
BEGIN
    -- Create temp table for test data
    CREATE TEMP TABLE IF NOT EXISTS test_users (
        user_id UUID,
        user_name TEXT
    );

    TRUNCATE test_users;

    INSERT INTO test_users VALUES
        (v_user1, 'Alice'),
        (v_user2, 'Bob'),
        (v_user3, 'Charlie');

    -- Insert sample trades for testing
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
        CASE (i % 3)
            WHEN 0 THEN 'BTC/USDT'
            WHEN 1 THEN 'ETH/USDT'
            ELSE 'SOL/USDT'
        END,
        gen_random_uuid(),
        gen_random_uuid(),
        CASE
            WHEN i % 2 = 0 THEN v_user1
            ELSE v_user2
        END,
        CASE
            WHEN i % 2 = 0 THEN v_user2
            ELSE v_user1
        END,
        (40000 + (i * 100))::DECIMAL(20, 8),
        (0.5 + (i * 0.1))::DECIMAL(20, 8),
        ((40000 + (i * 100)) * (0.5 + (i * 0.1)) * 0.001)::DECIMAL(20, 8),
        ((40000 + (i * 100)) * (0.5 + (i * 0.1)) * 0.0005)::DECIMAL(20, 8),
        i % 2 = 0,
        NOW() - ((i % 48) * INTERVAL '30 minutes')
    FROM generate_series(1, 50) AS i;

    RAISE NOTICE 'Test data created: 50 trades for 3 users across 3 symbols';
END $$;

-- =============================================================================
-- TEST 1: get_user_trades() - All symbols
-- =============================================================================

\echo ''
\echo 'Test 1: get_user_trades() - All Symbols'
\echo '-----------------------------------------'

SELECT
    'User: ' || u.user_name AS test_case,
    COUNT(*) AS trade_count,
    COUNT(DISTINCT t.symbol) AS symbol_count,
    SUM(CASE WHEN t.side = 'BUY' THEN 1 ELSE 0 END) AS buy_count,
    SUM(CASE WHEN t.side = 'SELL' THEN 1 ELSE 0 END) AS sell_count,
    SUM(t.fee_paid) AS total_fees
FROM test_users u
CROSS JOIN LATERAL get_user_trades(u.user_id, NULL, 100) t
GROUP BY u.user_name
ORDER BY u.user_name;

\echo ''
\echo 'Expected: Each user should have multiple trades'
\echo ''

-- =============================================================================
-- TEST 2: get_user_trades() - Specific symbol filter
-- =============================================================================

\echo 'Test 2: get_user_trades() - BTC/USDT Only'
\echo '-----------------------------------------'

SELECT
    'BTC/USDT trades for Alice' AS test_case,
    COUNT(*) AS trade_count,
    MIN(price) AS min_price,
    MAX(price) AS max_price,
    SUM(quantity) AS total_quantity
FROM get_user_trades(
    (SELECT user_id FROM test_users WHERE user_name = 'Alice'),
    'BTC/USDT',
    100
);

\echo ''
\echo 'Expected: Only BTC/USDT trades shown'
\echo ''

-- =============================================================================
-- TEST 3: get_user_trades() - Limit parameter
-- =============================================================================

\echo 'Test 3: get_user_trades() - Limit 5 Trades'
\echo '-----------------------------------------'

SELECT
    trade_id,
    side,
    symbol,
    price,
    quantity,
    fee_paid,
    executed_at
FROM get_user_trades(
    (SELECT user_id FROM test_users WHERE user_name = 'Alice'),
    NULL,
    5
)
ORDER BY executed_at DESC;

\echo ''
\echo 'Expected: Exactly 5 trades, most recent first'
\echo ''

-- =============================================================================
-- TEST 4: get_symbol_trades() - Time range filter
-- =============================================================================

\echo 'Test 4: get_symbol_trades() - Last 1 Hour'
\echo '-----------------------------------------'

SELECT
    'BTC/USDT last 1 hour' AS test_case,
    COUNT(*) AS trade_count,
    MIN(executed_at) AS earliest_trade,
    MAX(executed_at) AS latest_trade,
    SUM(trade_value) AS total_volume
FROM get_symbol_trades(
    'BTC/USDT',
    NOW() - INTERVAL '1 hour',
    NOW(),
    1000
);

\echo ''

-- =============================================================================
-- TEST 5: get_symbol_trades() - All trades in 24h
-- =============================================================================

\echo 'Test 5: get_symbol_trades() - Last 24 Hours'
\echo '-----------------------------------------'

SELECT
    'Symbol: ' || symbol AS test_case,
    COUNT(*) AS trade_count,
    SUM(trade_value) AS total_volume,
    AVG(price) AS avg_price
FROM (
    SELECT 'BTC/USDT' AS symbol
    UNION ALL SELECT 'ETH/USDT'
    UNION ALL SELECT 'SOL/USDT'
) symbols
CROSS JOIN LATERAL get_symbol_trades(
    symbols.symbol,
    NOW() - INTERVAL '24 hours',
    NOW(),
    1000
)
GROUP BY symbols.symbol
ORDER BY symbols.symbol;

\echo ''

-- =============================================================================
-- TEST 6: calculate_vwap() - Different intervals
-- =============================================================================

\echo 'Test 6: calculate_vwap() - Different Intervals'
\echo '-----------------------------------------'

SELECT
    symbol,
    calculate_vwap(symbol, INTERVAL '1 hour') AS vwap_1h,
    calculate_vwap(symbol, INTERVAL '6 hours') AS vwap_6h,
    calculate_vwap(symbol, INTERVAL '24 hours') AS vwap_24h
FROM (
    SELECT 'BTC/USDT' AS symbol
    UNION ALL SELECT 'ETH/USDT'
    UNION ALL SELECT 'SOL/USDT'
) symbols
ORDER BY symbol;

\echo ''
\echo 'Expected: VWAP values should be reasonable prices'
\echo ''

-- =============================================================================
-- TEST 7: calculate_vwap() - No trades scenario
-- =============================================================================

\echo 'Test 7: calculate_vwap() - Symbol with No Trades'
\echo '-----------------------------------------'

SELECT
    'XRP/USDT' AS symbol,
    calculate_vwap('XRP/USDT', INTERVAL '24 hours') AS vwap_24h,
    'Should be 0 or NULL' AS expected;

\echo ''

-- =============================================================================
-- TEST 8: get_ohlcv() - 1 hour candles
-- =============================================================================

\echo 'Test 8: get_ohlcv() - 1 Hour Candles'
\echo '-----------------------------------------'

SELECT
    candle_time,
    open_price,
    high_price,
    low_price,
    close_price,
    volume,
    trade_count
FROM get_ohlcv('BTC/USDT', INTERVAL '1 hour', INTERVAL '6 hours')
ORDER BY candle_time DESC
LIMIT 6;

\echo ''
\echo 'Expected: Hourly candles with OHLC logic (High >= Open/Close, Low <= Open/Close)'
\echo ''

-- =============================================================================
-- TEST 9: get_ohlcv() - 15 minute candles
-- =============================================================================

\echo 'Test 9: get_ohlcv() - 15 Minute Candles'
\echo '-----------------------------------------'

SELECT
    candle_time,
    open_price,
    high_price,
    low_price,
    close_price,
    volume,
    trade_count
FROM get_ohlcv('BTC/USDT', INTERVAL '15 minutes', INTERVAL '2 hours')
ORDER BY candle_time DESC
LIMIT 8;

\echo ''
\echo 'Expected: 15-minute candles'
\echo ''

-- =============================================================================
-- TEST 10: Partition Creation Function
-- =============================================================================

\echo 'Test 10: create_trade_partition() - Tomorrow'
\echo '-----------------------------------------'

SELECT create_trade_partition() AS new_partition;

\echo ''
\echo 'Expected: Returns partition name for tomorrow'
\echo ''

-- =============================================================================
-- TEST 11: Batch Partition Creation
-- =============================================================================

\echo 'Test 11: create_trade_partitions_30days()'
\echo '-----------------------------------------'

SELECT
    partition_name,
    start_date,
    end_date,
    created
FROM create_trade_partitions_30days()
ORDER BY start_date
LIMIT 10;

\echo ''
\echo 'Expected: Shows 30 partitions (some may already exist)'
\echo ''

-- =============================================================================
-- TEST 12: View - v_recent_trades
-- =============================================================================

\echo 'Test 12: v_recent_trades View'
\echo '-----------------------------------------'

SELECT
    COUNT(*) AS total_recent_trades,
    COUNT(DISTINCT symbol) AS symbol_count,
    MIN(executed_at) AS earliest,
    MAX(executed_at) AS latest
FROM v_recent_trades;

\echo ''

SELECT
    trade_id,
    symbol,
    price,
    quantity,
    trade_value,
    buyer_fee + seller_fee AS total_fees,
    is_buyer_maker
FROM v_recent_trades
ORDER BY executed_at DESC
LIMIT 5;

\echo ''

-- =============================================================================
-- TEST 13: View - v_trade_volume_24h
-- =============================================================================

\echo 'Test 13: v_trade_volume_24h View'
\echo '-----------------------------------------'

SELECT
    symbol,
    trade_count,
    total_quantity,
    total_volume_quote,
    avg_price,
    min_price,
    max_price
FROM v_trade_volume_24h
ORDER BY total_volume_quote DESC;

\echo ''

-- =============================================================================
-- TEST 14: View - v_user_trade_history
-- =============================================================================

\echo 'Test 14: v_user_trade_history View'
\echo '-----------------------------------------'

SELECT
    u.user_name,
    COUNT(*) AS trade_count,
    SUM(CASE WHEN uth.side = 'BUY' THEN 1 ELSE 0 END) AS buy_count,
    SUM(CASE WHEN uth.side = 'SELL' THEN 1 ELSE 0 END) AS sell_count,
    SUM(uth.fee_paid) AS total_fees
FROM test_users u
JOIN v_user_trade_history uth ON u.user_id = uth.user_id
GROUP BY u.user_name
ORDER BY u.user_name;

\echo ''

-- =============================================================================
-- TEST 15: View - v_symbol_price_history
-- =============================================================================

\echo 'Test 15: v_symbol_price_history View (OHLCV)'
\echo '-----------------------------------------'

SELECT
    symbol,
    COUNT(*) AS candle_count,
    MIN(candle_time) AS earliest_candle,
    MAX(candle_time) AS latest_candle,
    SUM(volume) AS total_volume
FROM v_symbol_price_history
GROUP BY symbol
ORDER BY symbol;

\echo ''

SELECT
    candle_time,
    symbol,
    open_price,
    high_price,
    low_price,
    close_price,
    volume,
    trade_count
FROM v_symbol_price_history
WHERE symbol = 'BTC/USDT'
ORDER BY candle_time DESC
LIMIT 5;

\echo ''

-- =============================================================================
-- TEST 16: Data Integrity Checks
-- =============================================================================

\echo 'Test 16: Data Integrity Validation'
\echo '-----------------------------------------'

-- Check fee constraints
SELECT
    'Fee Constraints' AS test,
    COUNT(*) AS total_trades,
    COUNT(*) FILTER (WHERE buyer_fee >= 0) AS valid_buyer_fees,
    COUNT(*) FILTER (WHERE seller_fee >= 0) AS valid_seller_fees,
    COUNT(*) FILTER (WHERE buyer_fee >= 0 AND seller_fee >= 0) AS both_valid
FROM trades;

\echo ''

-- Check price/quantity constraints
SELECT
    'Price/Quantity Constraints' AS test,
    COUNT(*) AS total_trades,
    COUNT(*) FILTER (WHERE price > 0) AS valid_prices,
    COUNT(*) FILTER (WHERE quantity > 0) AS valid_quantities
FROM trades;

\echo ''

-- =============================================================================
-- TEST SUMMARY
-- =============================================================================

\echo ''
\echo '========================================='
\echo 'TEST SUITE COMPLETE'
\echo '========================================='
\echo ''
\echo 'All functions and views tested:'
\echo '  ✓ get_user_trades() - with filters and limits'
\echo '  ✓ get_symbol_trades() - with time ranges'
\echo '  ✓ calculate_vwap() - multiple intervals'
\echo '  ✓ get_ohlcv() - candlestick generation'
\echo '  ✓ create_trade_partition() - single partition'
\echo '  ✓ create_trade_partitions_30days() - batch creation'
\echo '  ✓ v_recent_trades - recent trades view'
\echo '  ✓ v_trade_volume_24h - volume aggregation'
\echo '  ✓ v_user_trade_history - user-centric view'
\echo '  ✓ v_symbol_price_history - OHLCV view'
\echo '  ✓ Data integrity constraints verified'
\echo ''
\echo 'Review results above for correctness'
\echo '========================================='
\echo ''
