-- Migration 010: Price Alerts and Technical Indicators
-- Creates tables for price alerts and cached technical indicator values
-- Optimized for <50ms query performance with 1000+ records per user

-- =============================================================================
-- PART 1: ENUMS FOR ALERT AND INDICATOR TYPES
-- =============================================================================

-- Alert type enum (above/below price)
CREATE TYPE alert_type_enum AS ENUM ('ABOVE', 'BELOW');

-- Indicator type enum (supported technical indicators)
CREATE TYPE indicator_type_enum AS ENUM (
    'SMA',      -- Simple Moving Average
    'EMA',      -- Exponential Moving Average
    'RSI',      -- Relative Strength Index
    'MACD',     -- Moving Average Convergence Divergence
    'BBANDS',   -- Bollinger Bands
    'VOLUME'    -- Volume indicators
);

COMMENT ON TYPE alert_type_enum IS 'Price alert trigger conditions: ABOVE or BELOW target price';
COMMENT ON TYPE indicator_type_enum IS 'Technical indicator types for caching calculated values';

-- =============================================================================
-- PART 2: PRICE ALERTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS price_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    alert_type alert_type_enum NOT NULL,
    target_price NUMERIC(20, 8) NOT NULL CHECK (target_price > 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    notifications_sent INT NOT NULL DEFAULT 0 CHECK (notifications_sent >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    triggered_at TIMESTAMPTZ,
    last_checked_at TIMESTAMPTZ,

    -- Constraints
    -- Note: Allow is_active=false with triggered_at=null for manual deactivation
    CONSTRAINT chk_alert_triggered CHECK (
        triggered_at IS NULL OR is_active = false
    )
);

-- Table comments
COMMENT ON TABLE price_alerts IS 'User price alerts for crypto symbols with trigger tracking';
COMMENT ON COLUMN price_alerts.id IS 'Unique alert identifier';
COMMENT ON COLUMN price_alerts.user_id IS 'User who created the alert (references users table)';
COMMENT ON COLUMN price_alerts.symbol IS 'Trading pair symbol (e.g., BTC_TRY, ETH_TRY)';
COMMENT ON COLUMN price_alerts.alert_type IS 'Alert trigger condition: ABOVE or BELOW target price';
COMMENT ON COLUMN price_alerts.target_price IS 'Price threshold that triggers the alert';
COMMENT ON COLUMN price_alerts.is_active IS 'Whether alert is currently active (false after triggered)';
COMMENT ON COLUMN price_alerts.notifications_sent IS 'Counter for notification attempts (for monitoring)';
COMMENT ON COLUMN price_alerts.created_at IS 'Timestamp when alert was created';
COMMENT ON COLUMN price_alerts.triggered_at IS 'Timestamp when alert was triggered (null if not triggered)';
COMMENT ON COLUMN price_alerts.last_checked_at IS 'Last time alert was evaluated against current price';

-- =============================================================================
-- PART 3: PRICE ALERTS INDEXES (Optimized for <50ms queries)
-- =============================================================================

-- Primary query: Get active alerts for user and symbol
CREATE INDEX idx_alerts_user_symbol ON price_alerts(user_id, symbol)
    WHERE is_active = true;

-- Alert evaluation query: Get all active alerts for a symbol
CREATE INDEX idx_alerts_active_symbol ON price_alerts(symbol)
    WHERE is_active = true;

-- Cleanup/archive query: Find triggered alerts
CREATE INDEX idx_alerts_triggered ON price_alerts(triggered_at DESC)
    WHERE triggered_at IS NOT NULL;

-- Admin monitoring: Recently created alerts
CREATE INDEX idx_alerts_created ON price_alerts(created_at DESC);

-- Composite index for symbol-based queries with alert type
CREATE INDEX idx_alerts_symbol_type_active ON price_alerts(symbol, alert_type, is_active, target_price);

-- =============================================================================
-- PART 4: INDICATOR VALUES TABLE (Cache for calculated indicators)
-- =============================================================================

CREATE TABLE IF NOT EXISTS indicator_values (
    id BIGSERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    indicator_type indicator_type_enum NOT NULL,
    period INT CHECK (period > 0 OR period IS NULL),
    value NUMERIC(15, 8) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Additional metadata for complex indicators
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Ensure uniqueness per indicator calculation
    CONSTRAINT uq_indicator_symbol_type_period_timestamp
        UNIQUE (symbol, indicator_type, period, timestamp)
);

-- Table comments
COMMENT ON TABLE indicator_values IS 'Cached technical indicator values for performance optimization';
COMMENT ON COLUMN indicator_values.id IS 'Auto-incrementing unique identifier';
COMMENT ON COLUMN indicator_values.symbol IS 'Trading pair symbol (e.g., BTC_TRY, ETH_TRY)';
COMMENT ON COLUMN indicator_values.indicator_type IS 'Type of technical indicator (SMA, EMA, RSI, MACD, etc.)';
COMMENT ON COLUMN indicator_values.period IS 'Indicator period (e.g., 14 for RSI-14, 20 for SMA-20). Null for period-less indicators';
COMMENT ON COLUMN indicator_values.value IS 'Calculated indicator value';
COMMENT ON COLUMN indicator_values.timestamp IS 'Timestamp of the candle/data point this indicator applies to';
COMMENT ON COLUMN indicator_values.calculated_at IS 'When this indicator value was calculated and cached';
COMMENT ON COLUMN indicator_values.metadata IS 'Additional indicator data (e.g., MACD signal, histogram, BB upper/lower bands)';

-- =============================================================================
-- PART 5: INDICATOR VALUES INDEXES (Optimized for <50ms queries)
-- =============================================================================

-- Primary query: Get latest indicators for symbol and type
CREATE INDEX idx_indicators_symbol_type_time ON indicator_values(symbol, indicator_type, timestamp DESC);

-- Specific indicator query with period
CREATE INDEX idx_indicators_symbol_type_period ON indicator_values(symbol, indicator_type, period, timestamp DESC);

-- Time-range queries for charting
CREATE INDEX idx_indicators_time_symbol ON indicator_values(timestamp DESC, symbol);

-- Note: Removed idx_indicators_calculated_at with WHERE clause using CURRENT_TIMESTAMP
-- as WHERE clause functions must be IMMUTABLE. Cleanup queries will use seq scan.

-- Composite index for full indicator specification
CREATE INDEX idx_indicators_full_spec ON indicator_values(symbol, indicator_type, period, timestamp DESC)
    WHERE period IS NOT NULL;

-- =============================================================================
-- PART 6: PARTITIONING FOR INDICATOR_VALUES (Time-based)
-- =============================================================================

-- Note: For MVP, we'll start without partitioning for indicator_values
-- Partitioning can be added post-MVP if data volume requires it
-- Current design handles 1M+ rows efficiently with proper indexes

-- =============================================================================
-- PART 7: UTILITY FUNCTIONS
-- =============================================================================

-- Function: Get active alerts for a user
CREATE OR REPLACE FUNCTION get_user_active_alerts(
    p_user_id UUID,
    p_symbol VARCHAR(20) DEFAULT NULL
)
RETURNS TABLE (
    alert_id UUID,
    symbol VARCHAR(20),
    alert_type alert_type_enum,
    target_price NUMERIC(20, 8),
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        pa.id AS alert_id,
        pa.symbol,
        pa.alert_type,
        pa.target_price,
        pa.created_at
    FROM price_alerts pa
    WHERE pa.user_id = p_user_id
      AND pa.is_active = true
      AND (p_symbol IS NULL OR pa.symbol = p_symbol)
    ORDER BY pa.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_user_active_alerts IS 'Get active price alerts for a user, optionally filtered by symbol';

-- Function: Trigger price alert
CREATE OR REPLACE FUNCTION trigger_price_alert(
    p_alert_id UUID,
    p_current_price NUMERIC(20, 8)
)
RETURNS BOOLEAN AS $$
DECLARE
    v_updated INT;
BEGIN
    UPDATE price_alerts
    SET
        is_active = false,
        triggered_at = CURRENT_TIMESTAMP,
        last_checked_at = CURRENT_TIMESTAMP,
        notifications_sent = notifications_sent + 1
    WHERE id = p_alert_id
      AND is_active = true;

    GET DIAGNOSTICS v_updated = ROW_COUNT;

    RETURN v_updated > 0;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION trigger_price_alert IS 'Trigger a price alert when target price is reached';

-- Function: Update alert check timestamp
CREATE OR REPLACE FUNCTION update_alert_check_time(
    p_alert_ids UUID[]
)
RETURNS VOID AS $$
BEGIN
    UPDATE price_alerts
    SET last_checked_at = CURRENT_TIMESTAMP
    WHERE id = ANY(p_alert_ids);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_alert_check_time IS 'Batch update last_checked_at for multiple alerts';

-- Function: Get latest indicator value
CREATE OR REPLACE FUNCTION get_latest_indicator(
    p_symbol VARCHAR(20),
    p_indicator_type indicator_type_enum,
    p_period INT DEFAULT NULL
)
RETURNS TABLE (
    value NUMERIC(15, 8),
    indicator_timestamp TIMESTAMPTZ,
    metadata JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        iv.value,
        iv.timestamp,
        iv.metadata
    FROM indicator_values iv
    WHERE iv.symbol = p_symbol
      AND iv.indicator_type = p_indicator_type
      AND (p_period IS NULL OR iv.period = p_period)
    ORDER BY iv.timestamp DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_latest_indicator IS 'Get the most recent indicator value for a symbol and type';

-- Function: Get indicator time series
CREATE OR REPLACE FUNCTION get_indicator_series(
    p_symbol VARCHAR(20),
    p_indicator_type indicator_type_enum,
    p_period INT DEFAULT NULL,
    p_start_time TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP - INTERVAL '24 hours',
    p_end_time TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    p_limit INT DEFAULT 100
)
RETURNS TABLE (
    value NUMERIC(15, 8),
    indicator_timestamp TIMESTAMPTZ,
    metadata JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        iv.value,
        iv.timestamp,
        iv.metadata
    FROM indicator_values iv
    WHERE iv.symbol = p_symbol
      AND iv.indicator_type = p_indicator_type
      AND (p_period IS NULL OR iv.period = p_period)
      AND iv.timestamp >= p_start_time
      AND iv.timestamp <= p_end_time
    ORDER BY iv.timestamp DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_indicator_series IS 'Get indicator values over a time range for charting';

-- Function: Cleanup old indicator values
CREATE OR REPLACE FUNCTION cleanup_old_indicators(
    p_retention_days INT DEFAULT 30
)
RETURNS TABLE (
    deleted_count BIGINT,
    oldest_deleted TIMESTAMPTZ
) AS $$
DECLARE
    v_cutoff_time TIMESTAMPTZ;
    v_deleted_count BIGINT;
    v_oldest_deleted TIMESTAMPTZ;
BEGIN
    v_cutoff_time := CURRENT_TIMESTAMP - (p_retention_days || ' days')::INTERVAL;

    -- Get oldest timestamp before deletion
    SELECT MIN(calculated_at) INTO v_oldest_deleted
    FROM indicator_values
    WHERE calculated_at < v_cutoff_time;

    -- Delete old indicators
    DELETE FROM indicator_values
    WHERE calculated_at < v_cutoff_time;

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

    deleted_count := v_deleted_count;
    oldest_deleted := v_oldest_deleted;

    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_indicators IS 'Delete indicator values older than retention period (default 30 days)';

-- =============================================================================
-- PART 8: MONITORING VIEWS
-- =============================================================================

-- View: Alert statistics by symbol
CREATE OR REPLACE VIEW v_alert_stats_by_symbol AS
SELECT
    symbol,
    COUNT(*) FILTER (WHERE is_active = true) AS active_alerts,
    COUNT(*) FILTER (WHERE is_active = false) AS triggered_alerts,
    COUNT(*) AS total_alerts,
    AVG(target_price) FILTER (WHERE is_active = true) AS avg_target_price,
    MIN(target_price) FILTER (WHERE is_active = true) AS min_target_price,
    MAX(target_price) FILTER (WHERE is_active = true) AS max_target_price
FROM price_alerts
GROUP BY symbol
ORDER BY total_alerts DESC;

COMMENT ON VIEW v_alert_stats_by_symbol IS 'Alert statistics aggregated by symbol';

-- View: Alert statistics by user
CREATE OR REPLACE VIEW v_alert_stats_by_user AS
SELECT
    user_id,
    COUNT(*) FILTER (WHERE is_active = true) AS active_alerts,
    COUNT(*) FILTER (WHERE is_active = false) AS triggered_alerts,
    COUNT(*) AS total_alerts,
    MAX(created_at) AS last_alert_created,
    MIN(created_at) AS first_alert_created
FROM price_alerts
GROUP BY user_id
HAVING COUNT(*) FILTER (WHERE is_active = true) > 0
ORDER BY active_alerts DESC;

COMMENT ON VIEW v_alert_stats_by_user IS 'Alert statistics aggregated by user (only users with active alerts)';

-- View: Indicator cache statistics
CREATE OR REPLACE VIEW v_indicator_cache_stats AS
SELECT
    symbol,
    indicator_type,
    period,
    COUNT(*) AS cached_values,
    MIN(timestamp) AS oldest_data,
    MAX(timestamp) AS newest_data,
    MAX(calculated_at) AS last_calculation,
    pg_size_pretty(
        pg_total_relation_size('indicator_values')
    ) AS total_size
FROM indicator_values
GROUP BY symbol, indicator_type, period
ORDER BY symbol, indicator_type, period;

COMMENT ON VIEW v_indicator_cache_stats IS 'Statistics on cached indicator values by symbol and type';

-- =============================================================================
-- PART 9: PERFORMANCE OPTIMIZATION
-- =============================================================================

-- Update table statistics for better query planning
ANALYZE price_alerts;
ANALYZE indicator_values;

-- Create statistics on commonly queried columns
CREATE STATISTICS IF NOT EXISTS alerts_user_symbol_stats
    ON user_id, symbol FROM price_alerts;

CREATE STATISTICS IF NOT EXISTS alerts_symbol_type_stats
    ON symbol, alert_type, is_active FROM price_alerts;

CREATE STATISTICS IF NOT EXISTS indicators_symbol_type_stats
    ON symbol, indicator_type, period FROM indicator_values;

-- =============================================================================
-- PART 10: AUTOMATED MAINTENANCE (Background jobs)
-- =============================================================================

-- Note: These should be scheduled via pg_cron or external scheduler

-- Example cron job: Cleanup old indicators daily at 2 AM
-- SELECT cron.schedule('cleanup-old-indicators', '0 2 * * *',
--     'SELECT cleanup_old_indicators(30)');

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================

DO $$
DECLARE
    v_alert_index_count INT;
    v_indicator_index_count INT;
BEGIN
    -- Count indexes on price_alerts
    SELECT COUNT(*) INTO v_alert_index_count
    FROM pg_indexes
    WHERE tablename = 'price_alerts';

    -- Count indexes on indicator_values
    SELECT COUNT(*) INTO v_indicator_index_count
    FROM pg_indexes
    WHERE tablename = 'indicator_values';

    RAISE NOTICE 'Migration 010 completed successfully';
    RAISE NOTICE 'Price alerts table created with % indexes', v_alert_index_count;
    RAISE NOTICE 'Indicator values table created with % indexes', v_indicator_index_count;
    RAISE NOTICE 'Performance target: < 50ms query response time';
    RAISE NOTICE 'Alert capacity: 1000+ alerts per user';
    RAISE NOTICE 'Indicator cache: Optimized for real-time charting';
END $$;
