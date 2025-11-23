-- Migration 007: Enhance Trades Table for Matching Engine
-- Adds fee tracking and maker/taker identification
-- Adds performance indexes and analytics views
-- Creates utility functions for trade queries

-- =============================================================================
-- PART 1: ALTER TRADES TABLE - Add Missing Fields
-- =============================================================================

-- Add fee columns to trades table
ALTER TABLE trades
    ADD COLUMN IF NOT EXISTS buyer_fee DECIMAL(20, 8) NOT NULL DEFAULT 0 CHECK (buyer_fee >= 0),
    ADD COLUMN IF NOT EXISTS seller_fee DECIMAL(20, 8) NOT NULL DEFAULT 0 CHECK (seller_fee >= 0),
    ADD COLUMN IF NOT EXISTS is_buyer_maker BOOLEAN NOT NULL DEFAULT FALSE;

-- Add comments for documentation
COMMENT ON COLUMN trades.buyer_fee IS 'Fee charged to buyer (0.05% maker, 0.10% taker)';
COMMENT ON COLUMN trades.seller_fee IS 'Fee charged to seller (0.05% maker, 0.10% taker)';
COMMENT ON COLUMN trades.is_buyer_maker IS 'True if buyer was maker (in order book first)';

-- =============================================================================
-- PART 2: ADDITIONAL PERFORMANCE INDEXES
-- =============================================================================

-- Composite index for order lookup (both buyer and seller)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trades_buyer_order
    ON trades(buy_order_id)
    WHERE buy_order_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trades_seller_order
    ON trades(sell_order_id)
    WHERE sell_order_id IS NOT NULL;

-- Composite index for user trade history with fees
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trades_buyer_user_executed
    ON trades(buyer_user_id, executed_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trades_seller_user_executed
    ON trades(seller_user_id, executed_at DESC);

-- Composite index for volume analysis (symbol, time, volume data)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trades_symbol_time_volume
    ON trades(symbol, executed_at, quantity, price);

-- Index for maker/taker analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trades_maker_flag
    ON trades(is_buyer_maker, executed_at DESC);

-- =============================================================================
-- PART 3: ANALYTICS VIEWS
-- =============================================================================

-- View: Recent Trades (Last 1000 trades per symbol)
CREATE OR REPLACE VIEW v_recent_trades AS
SELECT
    t.trade_id,
    t.symbol,
    t.price,
    t.quantity,
    t.quantity * t.price AS trade_value,
    t.buyer_user_id,
    t.seller_user_id,
    t.buyer_fee,
    t.seller_fee,
    t.is_buyer_maker,
    t.executed_at
FROM trades t
WHERE t.executed_at >= NOW() - INTERVAL '24 hours'
ORDER BY t.executed_at DESC;

COMMENT ON VIEW v_recent_trades IS 'Recent trades in the last 24 hours for all symbols';

-- View: 24-Hour Trade Volume by Symbol
CREATE OR REPLACE VIEW v_trade_volume_24h AS
SELECT
    symbol,
    COUNT(*) AS trade_count,
    SUM(quantity) AS total_quantity,
    SUM(quantity * price) AS total_volume_quote,
    AVG(price) AS avg_price,
    MIN(price) AS min_price,
    MAX(price) AS max_price,
    MIN(executed_at) AS first_trade_time,
    MAX(executed_at) AS last_trade_time
FROM trades
WHERE executed_at >= NOW() - INTERVAL '24 hours'
GROUP BY symbol
ORDER BY total_volume_quote DESC;

COMMENT ON VIEW v_trade_volume_24h IS '24-hour trading statistics by symbol';

-- View: User Trade History with Fees
CREATE OR REPLACE VIEW v_user_trade_history AS
SELECT
    t.trade_id,
    CASE
        WHEN t.buyer_user_id = u.user_id THEN 'BUY'
        ELSE 'SELL'
    END AS side,
    t.symbol,
    t.price,
    t.quantity,
    t.quantity * t.price AS trade_value,
    CASE
        WHEN t.buyer_user_id = u.user_id THEN t.buyer_fee
        ELSE t.seller_fee
    END AS fee_paid,
    CASE
        WHEN t.buyer_user_id = u.user_id THEN t.is_buyer_maker
        ELSE NOT t.is_buyer_maker
    END AS is_maker,
    t.executed_at,
    u.user_id
FROM trades t
CROSS JOIN (SELECT DISTINCT buyer_user_id AS user_id FROM trades
            UNION
            SELECT DISTINCT seller_user_id FROM trades) u
WHERE t.buyer_user_id = u.user_id OR t.seller_user_id = u.user_id
ORDER BY t.executed_at DESC;

COMMENT ON VIEW v_user_trade_history IS 'User-centric view of trade history with fees and maker/taker status';

-- View: Symbol Price History (OHLCV - Candlestick Data)
CREATE OR REPLACE VIEW v_symbol_price_history AS
WITH hourly_candles AS (
    SELECT
        symbol,
        DATE_TRUNC('hour', executed_at) AS candle_time,
        (ARRAY_AGG(price ORDER BY executed_at ASC))[1] AS open_price,
        MAX(price) AS high_price,
        MIN(price) AS low_price,
        (ARRAY_AGG(price ORDER BY executed_at DESC))[1] AS close_price,
        SUM(quantity) AS volume,
        COUNT(*) AS trade_count,
        MIN(executed_at) AS first_trade,
        MAX(executed_at) AS last_trade
    FROM trades
    WHERE executed_at >= NOW() - INTERVAL '7 days'
    GROUP BY symbol, DATE_TRUNC('hour', executed_at)
)
SELECT
    symbol,
    candle_time,
    open_price,
    high_price,
    low_price,
    close_price,
    volume,
    volume * close_price AS volume_quote,
    trade_count,
    first_trade,
    last_trade
FROM hourly_candles
ORDER BY symbol, candle_time DESC;

COMMENT ON VIEW v_symbol_price_history IS 'Hourly OHLCV candlestick data for symbols (last 7 days)';

-- =============================================================================
-- PART 4: UTILITY FUNCTIONS
-- =============================================================================

-- Function: Get User Trades
CREATE OR REPLACE FUNCTION get_user_trades(
    p_user_id UUID,
    p_symbol VARCHAR(20) DEFAULT NULL,
    p_limit INT DEFAULT 100
)
RETURNS TABLE (
    trade_id UUID,
    side VARCHAR(4),
    symbol VARCHAR(20),
    price DECIMAL(20, 8),
    quantity DECIMAL(20, 8),
    trade_value DECIMAL(20, 8),
    fee_paid DECIMAL(20, 8),
    is_maker BOOLEAN,
    executed_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.trade_id,
        CASE
            WHEN t.buyer_user_id = p_user_id THEN 'BUY'::VARCHAR(4)
            ELSE 'SELL'::VARCHAR(4)
        END AS side,
        t.symbol,
        t.price,
        t.quantity,
        t.quantity * t.price AS trade_value,
        CASE
            WHEN t.buyer_user_id = p_user_id THEN t.buyer_fee
            ELSE t.seller_fee
        END AS fee_paid,
        CASE
            WHEN t.buyer_user_id = p_user_id THEN t.is_buyer_maker
            ELSE NOT t.is_buyer_maker
        END AS is_maker,
        t.executed_at
    FROM trades t
    WHERE (t.buyer_user_id = p_user_id OR t.seller_user_id = p_user_id)
      AND (p_symbol IS NULL OR t.symbol = p_symbol)
    ORDER BY t.executed_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_user_trades IS 'Get trade history for a specific user with optional symbol filter';

-- Function: Get Symbol Trades
CREATE OR REPLACE FUNCTION get_symbol_trades(
    p_symbol VARCHAR(20),
    p_start_time TIMESTAMPTZ DEFAULT NOW() - INTERVAL '24 hours',
    p_end_time TIMESTAMPTZ DEFAULT NOW(),
    p_limit INT DEFAULT 1000
)
RETURNS TABLE (
    trade_id UUID,
    price DECIMAL(20, 8),
    quantity DECIMAL(20, 8),
    trade_value DECIMAL(20, 8),
    buyer_user_id UUID,
    seller_user_id UUID,
    is_buyer_maker BOOLEAN,
    executed_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.trade_id,
        t.price,
        t.quantity,
        t.quantity * t.price AS trade_value,
        t.buyer_user_id,
        t.seller_user_id,
        t.is_buyer_maker,
        t.executed_at
    FROM trades t
    WHERE t.symbol = p_symbol
      AND t.executed_at >= p_start_time
      AND t.executed_at <= p_end_time
    ORDER BY t.executed_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_symbol_trades IS 'Get trades for a specific symbol within time range';

-- Function: Calculate VWAP (Volume-Weighted Average Price)
CREATE OR REPLACE FUNCTION calculate_vwap(
    p_symbol VARCHAR(20),
    p_interval INTERVAL DEFAULT INTERVAL '1 hour'
)
RETURNS DECIMAL(20, 8) AS $$
DECLARE
    v_vwap DECIMAL(20, 8);
BEGIN
    SELECT
        COALESCE(
            SUM(price * quantity) / NULLIF(SUM(quantity), 0),
            0
        )
    INTO v_vwap
    FROM trades
    WHERE symbol = p_symbol
      AND executed_at >= NOW() - p_interval;

    RETURN v_vwap;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION calculate_vwap IS 'Calculate Volume-Weighted Average Price for a symbol over specified interval';

-- Function: Get OHLCV Data
CREATE OR REPLACE FUNCTION get_ohlcv(
    p_symbol VARCHAR(20),
    p_interval INTERVAL DEFAULT INTERVAL '1 hour',
    p_lookback INTERVAL DEFAULT INTERVAL '24 hours'
)
RETURNS TABLE (
    candle_time TIMESTAMPTZ,
    open_price DECIMAL(20, 8),
    high_price DECIMAL(20, 8),
    low_price DECIMAL(20, 8),
    close_price DECIMAL(20, 8),
    volume DECIMAL(20, 8),
    trade_count BIGINT
) AS $$
DECLARE
    v_bucket_seconds INT;
BEGIN
    -- Convert interval to seconds for time bucketing
    v_bucket_seconds := EXTRACT(EPOCH FROM p_interval)::INT;

    RETURN QUERY
    SELECT
        TO_TIMESTAMP(FLOOR(EXTRACT(EPOCH FROM t.executed_at) / v_bucket_seconds) * v_bucket_seconds) AS candle_time,
        (ARRAY_AGG(t.price ORDER BY t.executed_at ASC))[1] AS open_price,
        MAX(t.price) AS high_price,
        MIN(t.price) AS low_price,
        (ARRAY_AGG(t.price ORDER BY t.executed_at DESC))[1] AS close_price,
        SUM(t.quantity) AS volume,
        COUNT(*) AS trade_count
    FROM trades t
    WHERE t.symbol = p_symbol
      AND t.executed_at >= NOW() - p_lookback
    GROUP BY candle_time
    ORDER BY candle_time DESC;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_ohlcv IS 'Get OHLCV candlestick data for symbol with configurable interval and lookback';

-- =============================================================================
-- PART 5: PARTITION MAINTENANCE FUNCTIONS
-- =============================================================================

-- Function: Create next 30 days of trade partitions
CREATE OR REPLACE FUNCTION create_trade_partitions_30days()
RETURNS TABLE (
    partition_name TEXT,
    start_date DATE,
    end_date DATE,
    created BOOLEAN
) AS $$
DECLARE
    v_start_date DATE;
    v_end_date DATE;
    v_partition_name TEXT;
    v_created BOOLEAN;
BEGIN
    v_start_date := CURRENT_DATE;

    FOR i IN 0..29 LOOP
        v_end_date := v_start_date + INTERVAL '1 day';
        v_partition_name := 'trades_' || TO_CHAR(v_start_date, 'YYYY_MM_DD');

        BEGIN
            EXECUTE format(
                'CREATE TABLE IF NOT EXISTS %I PARTITION OF trades
                 FOR VALUES FROM (%L) TO (%L)',
                v_partition_name,
                v_start_date,
                v_end_date
            );
            v_created := TRUE;
        EXCEPTION WHEN duplicate_table THEN
            v_created := FALSE;
        END;

        partition_name := v_partition_name;
        start_date := v_start_date;
        end_date := v_end_date;
        created := v_created;

        RETURN NEXT;

        v_start_date := v_end_date;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_trade_partitions_30days IS 'Create next 30 days of trade partitions (idempotent)';

-- Function: Create single partition for tomorrow
CREATE OR REPLACE FUNCTION create_trade_partition()
RETURNS TEXT AS $$
DECLARE
    v_tomorrow DATE := CURRENT_DATE + INTERVAL '1 day';
    v_day_after DATE := v_tomorrow + INTERVAL '1 day';
    v_partition_name TEXT := 'trades_' || TO_CHAR(v_tomorrow, 'YYYY_MM_DD');
BEGIN
    EXECUTE format(
        'CREATE TABLE IF NOT EXISTS %I PARTITION OF trades
         FOR VALUES FROM (%L) TO (%L)',
        v_partition_name,
        v_tomorrow,
        v_day_after
    );

    RETURN v_partition_name;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_trade_partition IS 'Create partition for tomorrow (run daily via cron)';

-- Function: Drop old trade partitions (older than retention period)
CREATE OR REPLACE FUNCTION drop_old_trade_partitions(
    p_retention_days INT DEFAULT 90
)
RETURNS TABLE (
    partition_name TEXT,
    partition_date DATE,
    dropped BOOLEAN
) AS $$
DECLARE
    v_partition RECORD;
    v_cutoff_date DATE := CURRENT_DATE - p_retention_days;
    v_partition_date DATE;
    v_dropped BOOLEAN;
BEGIN
    FOR v_partition IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename LIKE 'trades_20%'
        ORDER BY tablename
    LOOP
        -- Extract date from partition name (trades_YYYY_MM_DD)
        BEGIN
            v_partition_date := TO_DATE(
                SUBSTRING(v_partition.tablename FROM 8),
                'YYYY_MM_DD'
            );

            IF v_partition_date < v_cutoff_date THEN
                EXECUTE format('DROP TABLE IF EXISTS %I', v_partition.tablename);
                v_dropped := TRUE;
            ELSE
                v_dropped := FALSE;
            END IF;

            partition_name := v_partition.tablename;
            partition_date := v_partition_date;
            dropped := v_dropped;

            RETURN NEXT;
        EXCEPTION WHEN OTHERS THEN
            -- Skip partitions with invalid date format
            CONTINUE;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION drop_old_trade_partitions IS 'Drop trade partitions older than retention period (default 90 days)';

-- =============================================================================
-- PART 6: PERFORMANCE OPTIMIZATION
-- =============================================================================

-- Update table statistics for better query planning
ANALYZE trades;

-- Create statistics on commonly queried columns
CREATE STATISTICS IF NOT EXISTS trades_symbol_time_stats
    ON symbol, executed_at FROM trades;

CREATE STATISTICS IF NOT EXISTS trades_user_time_stats
    ON buyer_user_id, seller_user_id, executed_at FROM trades;

-- =============================================================================
-- PART 7: MONITORING VIEWS
-- =============================================================================

-- View: Partition information and sizes
CREATE OR REPLACE VIEW v_trade_partition_info AS
SELECT
    schemaname,
    tablename AS partition_name,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    (SELECT COUNT(*) FROM pg_class WHERE relname = tablename) AS row_estimate,
    obj_description((schemaname||'.'||tablename)::regclass) AS description
FROM pg_tables
WHERE tablename LIKE 'trades_%'
  AND schemaname = 'public'
ORDER BY tablename DESC;

COMMENT ON VIEW v_trade_partition_info IS 'Monitor trade partition sizes and row counts';

-- View: Trade Index Usage Statistics
CREATE OR REPLACE VIEW v_trade_index_usage AS
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan AS scans,
    idx_tup_read AS tuples_read,
    idx_tup_fetch AS tuples_fetched,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE tablename LIKE 'trades%'
ORDER BY idx_scan DESC;

COMMENT ON VIEW v_trade_index_usage IS 'Monitor trade index usage and effectiveness';

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================

-- Final validation
DO $$
DECLARE
    v_partition_count INT;
    v_index_count INT;
BEGIN
    -- Count partitions
    SELECT COUNT(*) INTO v_partition_count
    FROM pg_tables
    WHERE tablename LIKE 'trades_%';

    -- Count indexes
    SELECT COUNT(*) INTO v_index_count
    FROM pg_indexes
    WHERE tablename = 'trades';

    RAISE NOTICE 'Migration 007 completed successfully';
    RAISE NOTICE 'Trade partitions: %', v_partition_count;
    RAISE NOTICE 'Trade indexes: %', v_index_count;
END $$;
