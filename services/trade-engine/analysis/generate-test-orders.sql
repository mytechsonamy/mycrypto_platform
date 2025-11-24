-- =============================================================================
-- GENERATE TEST ORDERS FOR DEPTH CHART STRESS TESTING
-- Task: DB-EPIC3-002
-- Purpose: Create 1000+ realistic orders for performance testing
-- =============================================================================

-- =============================================================================
-- CONFIGURATION
-- =============================================================================
DO $$
DECLARE
    v_test_user_id UUID := '00000000-0000-0000-0000-000000000001'::UUID;
    v_symbol VARCHAR := 'BTC_TRY';
    v_base_price DECIMAL := 3500000.00; -- 3,500,000 TRY base price
    v_order_count INT := 1200; -- Generate 1200 orders (600 bids, 600 asks)
    v_price_spread DECIMAL := 0.05; -- 5% spread around base price
    v_min_qty DECIMAL := 0.001;
    v_max_qty DECIMAL := 10.0;
    v_order_id UUID;
    v_price DECIMAL;
    v_quantity DECIMAL;
    v_side VARCHAR;
    v_status VARCHAR;
    v_filled_pct DECIMAL;
    v_filled_qty DECIMAL;
    v_created_at TIMESTAMPTZ;
    i INT;
BEGIN
    RAISE NOTICE 'Starting test order generation...';
    RAISE NOTICE 'Base price: %, Symbol: %, Order count: %', v_base_price, v_symbol, v_order_count;

    -- Generate BID orders (BUY side, below base price)
    FOR i IN 1..600 LOOP
        v_order_id := gen_random_uuid();

        -- Price: Random between base_price * (1 - spread) and base_price
        -- This creates a realistic bid ladder
        v_price := v_base_price * (1 - (random() * v_price_spread));
        v_price := ROUND(v_price, 2);

        -- Quantity: Random between min and max
        v_quantity := v_min_qty + (random() * (v_max_qty - v_min_qty));
        v_quantity := ROUND(v_quantity, 8);

        -- Status: 80% OPEN, 20% PARTIALLY_FILLED
        IF random() < 0.8 THEN
            v_status := 'OPEN';
            v_filled_qty := 0;
        ELSE
            v_status := 'PARTIALLY_FILLED';
            v_filled_pct := 0.1 + (random() * 0.5); -- 10-60% filled
            v_filled_qty := ROUND(v_quantity * v_filled_pct, 8);
        END IF;

        -- Created at: Random time in last 2 hours (to stay within current partition)
        v_created_at := NOW() - (random() * interval '2 hours');

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
            time_in_force,
            created_at,
            updated_at
        ) VALUES (
            v_order_id,
            v_test_user_id,
            v_symbol,
            'BUY',
            'LIMIT',
            v_status::order_status_enum,
            v_quantity,
            v_filled_qty,
            v_price,
            'GTC',
            v_created_at,
            v_created_at
        )
        ON CONFLICT (order_id, created_at) DO NOTHING;

        IF i % 100 = 0 THEN
            RAISE NOTICE 'Generated % BID orders...', i;
        END IF;
    END LOOP;

    RAISE NOTICE 'BID orders generation complete!';

    -- Generate ASK orders (SELL side, above base price)
    FOR i IN 1..600 LOOP
        v_order_id := gen_random_uuid();

        -- Price: Random between base_price and base_price * (1 + spread)
        -- This creates a realistic ask ladder
        v_price := v_base_price * (1 + (random() * v_price_spread));
        v_price := ROUND(v_price, 2);

        -- Quantity: Random between min and max
        v_quantity := v_min_qty + (random() * (v_max_qty - v_min_qty));
        v_quantity := ROUND(v_quantity, 8);

        -- Status: 80% OPEN, 20% PARTIALLY_FILLED
        IF random() < 0.8 THEN
            v_status := 'OPEN';
            v_filled_qty := 0;
        ELSE
            v_status := 'PARTIALLY_FILLED';
            v_filled_pct := 0.1 + (random() * 0.5); -- 10-60% filled
            v_filled_qty := ROUND(v_quantity * v_filled_pct, 8);
        END IF;

        -- Created at: Random time in last 2 hours (to stay within current partition)
        v_created_at := NOW() - (random() * interval '2 hours');

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
            time_in_force,
            created_at,
            updated_at
        ) VALUES (
            v_order_id,
            v_test_user_id,
            v_symbol,
            'SELL',
            'LIMIT',
            v_status::order_status_enum,
            v_quantity,
            v_filled_qty,
            v_price,
            'GTC',
            v_created_at,
            v_created_at
        )
        ON CONFLICT (order_id, created_at) DO NOTHING;

        IF i % 100 = 0 THEN
            RAISE NOTICE 'Generated % ASK orders...', i;
        END IF;
    END LOOP;

    RAISE NOTICE 'ASK orders generation complete!';

    -- Summary statistics
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'TEST DATA GENERATION SUMMARY';
    RAISE NOTICE '=============================================================================';
END $$;

-- Verify generated data
SELECT
    'SUMMARY' as report_type,
    COUNT(*) as total_orders,
    COUNT(DISTINCT symbol) as symbols,
    COUNT(DISTINCT price) as unique_prices,
    MIN(price) as min_price,
    MAX(price) as max_price,
    SUM(quantity) as total_volume
FROM orders
WHERE symbol = 'BTC_TRY'
  AND status IN ('OPEN', 'PARTIALLY_FILLED');

-- Breakdown by side
SELECT
    side,
    status,
    COUNT(*) as order_count,
    COUNT(DISTINCT price) as price_levels,
    SUM(quantity - filled_quantity) as remaining_volume,
    AVG(price) as avg_price,
    MIN(price) as min_price,
    MAX(price) as max_price
FROM orders
WHERE symbol = 'BTC_TRY'
  AND status IN ('OPEN', 'PARTIALLY_FILLED')
GROUP BY side, status
ORDER BY side, status;

-- Show top 10 bid levels
SELECT
    'BID' as side,
    price,
    SUM(quantity - filled_quantity) as volume,
    COUNT(*) as order_count
FROM orders
WHERE symbol = 'BTC_TRY'
  AND status IN ('OPEN', 'PARTIALLY_FILLED')
  AND side = 'BUY'
GROUP BY price
ORDER BY price DESC
LIMIT 10;

-- Show top 10 ask levels
SELECT
    'ASK' as side,
    price,
    SUM(quantity - filled_quantity) as volume,
    COUNT(*) as order_count
FROM orders
WHERE symbol = 'BTC_TRY'
  AND status IN ('OPEN', 'PARTIALLY_FILLED')
  AND side = 'SELL'
GROUP BY price
ORDER BY price ASC
LIMIT 10;

-- =============================================================================
-- CLEANUP (USE WITH CAUTION)
-- =============================================================================

-- To remove all test orders:
-- DELETE FROM orders WHERE user_id = '00000000-0000-0000-0000-000000000001'::UUID;

-- =============================================================================
