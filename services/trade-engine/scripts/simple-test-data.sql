-- ================================================================
-- Simple Test Data Generator for Performance Benchmarking
-- Uses only current dates within partitions
-- Database Engineer Agent
-- Date: 2025-11-23
-- ================================================================

\echo '=== GENERATING SIMPLE TEST DATA ==='
\echo ''

-- ================================================================
-- 1. Generate Test Orders (1000 orders) - Current month only
-- ================================================================
\echo 'Generating 1000 test orders (current month)...'

INSERT INTO orders (
    order_id,
    user_id,
    symbol,
    side,
    order_type,
    status,
    quantity,
    filled_quantity,
    price,
    created_at
)
SELECT
    gen_random_uuid(),
    gen_random_uuid(),
    (ARRAY['BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'SOL/USDT', 'XRP/USDT'])[floor(random() * 5 + 1)::int],
    (ARRAY['BUY', 'SELL'])[floor(random() * 2 + 1)::int]::order_side_enum,
    'LIMIT'::order_type_enum,
    (ARRAY['OPEN', 'PARTIALLY_FILLED', 'FILLED', 'CANCELLED'])[floor(random() * 4 + 1)::int]::order_status_enum,
    (0.01 + random() * 10)::numeric(20,8),
    (random() * 5)::numeric(20,8),
    (40000 + random() * 10000)::numeric(20,8),
    '2025-10-15 00:00:00'::timestamp + (random() * INTERVAL '15 days')
FROM generate_series(1, 1000);

\echo 'Orders generated successfully!'
\echo ''

-- ================================================================
-- 2. Generate Test Trades (5000 trades) - Today only
-- ================================================================
\echo 'Generating 5000 test trades (today)...'

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
    (ARRAY['BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'SOL/USDT', 'XRP/USDT'])[floor(random() * 5 + 1)::int],
    gen_random_uuid(),
    gen_random_uuid(),
    gen_random_uuid(),
    gen_random_uuid(),
    (40000 + random() * 10000)::numeric(20,8),
    (0.01 + random() * 5)::numeric(20,8),
    ((40000 + random() * 10000) * (0.01 + random() * 5) * 0.001)::numeric(20,8),
    ((40000 + random() * 10000) * (0.01 + random() * 5) * 0.0005)::numeric(20,8),
    random() > 0.5,
    NOW() - (random() * INTERVAL '12 hours')
FROM generate_series(1, 5000);

\echo 'Trades generated successfully!'
\echo ''

-- ================================================================
-- 3. Verify Data
-- ================================================================
\echo 'Verifying generated data...'

SELECT
    'Orders' as table_name,
    COUNT(*) as total_rows,
    COUNT(*) FILTER (WHERE status = 'OPEN') as open_orders,
    COUNT(*) FILTER (WHERE created_at >= '2025-10-01') as in_range
FROM orders
UNION ALL
SELECT
    'Trades' as table_name,
    COUNT(*) as total_rows,
    NULL as open_orders,
    COUNT(*) FILTER (WHERE executed_at >= NOW() - INTERVAL '24 hours') as last_24h
FROM trades;

\echo ''
\echo 'Running ANALYZE to update statistics...'
ANALYZE orders;
ANALYZE trades;

\echo ''
\echo '=== TEST DATA GENERATION COMPLETE ==='
