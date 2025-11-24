-- ================================================================
-- Generate Test Data for Performance Benchmarking
-- Using dates within existing partition range
-- Database Engineer Agent
-- Date: 2025-11-23
-- ================================================================

\echo '=== GENERATING TEST DATA ==='
\echo ''

-- ================================================================
-- 1. Generate Test Orders (1000 orders) - Within partition range
-- ================================================================
\echo 'Generating 1000 test orders (2024-11 to 2025-10)...'

DO $$
DECLARE
    symbols TEXT[] := ARRAY['BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'SOL/USDT', 'XRP/USDT'];
    sides TEXT[] := ARRAY['BUY', 'SELL'];
    types TEXT[] := ARRAY['LIMIT', 'MARKET'];
    statuses TEXT[] := ARRAY['OPEN', 'PARTIALLY_FILLED', 'FILLED', 'CANCELLED'];
    i INTEGER;
    random_symbol TEXT;
    random_side TEXT;
    random_type TEXT;
    random_status TEXT;
    random_price NUMERIC;
    random_quantity NUMERIC;
    random_date TIMESTAMP;
    base_date TIMESTAMP := '2025-10-01 00:00:00'::TIMESTAMP;  -- Safe date within partitions
BEGIN
    FOR i IN 1..1000 LOOP
        random_symbol := symbols[1 + floor(random() * array_length(symbols, 1))::int];
        random_side := sides[1 + floor(random() * array_length(sides, 1))::int];
        random_type := types[1 + floor(random() * array_length(types, 1))::int];
        random_status := statuses[1 + floor(random() * array_length(statuses, 1))::int];

        -- Generate realistic prices
        random_price := CASE random_symbol
            WHEN 'BTC/USDT' THEN 40000 + (random() * 10000)
            WHEN 'ETH/USDT' THEN 2000 + (random() * 500)
            WHEN 'BNB/USDT' THEN 300 + (random() * 100)
            WHEN 'SOL/USDT' THEN 50 + (random() * 50)
            WHEN 'XRP/USDT' THEN 0.5 + (random() * 0.5)
            ELSE 100
        END;

        random_quantity := 0.01 + (random() * 10);

        -- Random date within 30 days from base_date
        random_date := base_date - (random() * INTERVAL '30 days');

        INSERT INTO orders (
            user_id,
            symbol,
            side,
            order_type,
            status,
            quantity,
            filled_quantity,
            price,
            created_at
        ) VALUES (
            gen_random_uuid(),
            random_symbol,
            random_side::order_side_enum,
            random_type::order_type_enum,
            random_status::order_status_enum,
            random_quantity,
            CASE WHEN random_status IN ('PARTIALLY_FILLED', 'FILLED')
                 THEN random_quantity * random()
                 ELSE 0
            END,
            CASE WHEN random_type = 'LIMIT' THEN random_price ELSE NULL END,
            random_date
        );
    END LOOP;
END $$;

\echo 'Orders generated successfully!'
\echo ''

-- ================================================================
-- 2. Generate Test Trades (5000 trades) - Current month only
-- ================================================================
\echo 'Generating 5000 test trades (2025-11-23 to 2025-12-22)...'

DO $$
DECLARE
    symbols TEXT[] := ARRAY['BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'SOL/USDT', 'XRP/USDT'];
    i INTEGER;
    random_symbol TEXT;
    random_price NUMERIC;
    random_quantity NUMERIC;
    random_date TIMESTAMP;
    base_date TIMESTAMP := NOW();  -- Current date (within trade partitions)
BEGIN
    FOR i IN 1..5000 LOOP
        random_symbol := symbols[1 + floor(random() * array_length(symbols, 1))::int];

        -- Generate realistic prices
        random_price := CASE random_symbol
            WHEN 'BTC/USDT' THEN 40000 + (random() * 10000)
            WHEN 'ETH/USDT' THEN 2000 + (random() * 500)
            WHEN 'BNB/USDT' THEN 300 + (random() * 100)
            WHEN 'SOL/USDT' THEN 50 + (random() * 50)
            WHEN 'XRP/USDT' THEN 0.5 + (random() * 0.5)
            ELSE 100
        END;

        random_quantity := 0.01 + (random() * 5);

        -- Random date within last 7 days (within current partition range)
        random_date := base_date - (random() * INTERVAL '7 days');

        INSERT INTO trades (
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
        ) VALUES (
            random_symbol,
            gen_random_uuid(),
            gen_random_uuid(),
            gen_random_uuid(),
            gen_random_uuid(),
            random_price,
            random_quantity,
            random_price * random_quantity * 0.001,  -- 0.1% taker fee
            random_price * random_quantity * 0.0005, -- 0.05% maker fee
            random() > 0.5,
            random_date
        );
    END LOOP;
END $$;

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
    MIN(created_at) as earliest,
    MAX(created_at) as latest
FROM orders
UNION ALL
SELECT
    'Trades' as table_name,
    COUNT(*) as total_rows,
    NULL as open_orders,
    MIN(executed_at) as earliest,
    MAX(executed_at) as latest
FROM trades;

\echo ''
\echo 'Data distribution by symbol:'
SELECT symbol, COUNT(*) as order_count FROM orders GROUP BY symbol ORDER BY symbol;

\echo ''
\echo 'Data distribution by status:'
SELECT status, COUNT(*) as order_count FROM orders GROUP BY status ORDER BY status;

\echo ''
\echo 'Running ANALYZE to update statistics...'
ANALYZE orders;
ANALYZE trades;

\echo ''
\echo '=== TEST DATA GENERATION COMPLETE ==='
