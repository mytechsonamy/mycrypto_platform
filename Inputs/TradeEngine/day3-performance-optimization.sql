-- ============================================================================
-- TRADE ENGINE - DAY 3 PERFORMANCE OPTIMIZATION & ANALYTICS
-- ============================================================================
-- Task: TASK-DB-003
-- Sprint: Trade Engine Sprint 1 - Day 3
-- Date: 2025-11-24
-- Database: PostgreSQL 15+
-- Description: Performance optimization, materialized views, and monitoring
-- ============================================================================

-- ============================================================================
-- PART 1: MONITORING SCHEMA (Dedicated schema for monitoring objects)
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS monitoring;
COMMENT ON SCHEMA monitoring IS 'Dedicated schema for performance monitoring and analytics';

-- ============================================================================
-- PART 2: ADDITIONAL COMPOSITE INDEXES
-- ============================================================================

-- Composite index for user order listing with status filter
-- Query pattern: SELECT * FROM orders WHERE user_id = ? AND status IN ('OPEN', 'PARTIALLY_FILLED') ORDER BY created_at DESC
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_user_status_created
ON orders(user_id, status, created_at DESC)
WHERE status IN ('OPEN', 'PARTIALLY_FILLED');

COMMENT ON INDEX idx_orders_user_status_created IS 'Optimizes user order queries with status filter and time ordering';

-- Index for symbol-based queries with side and price
-- Query pattern: SELECT * FROM orders WHERE symbol = ? AND side = ? AND status = 'OPEN' ORDER BY price
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_symbol_side_price
ON orders(symbol, side, price)
WHERE status = 'OPEN' AND price IS NOT NULL;

COMMENT ON INDEX idx_orders_symbol_side_price IS 'Optimizes order book queries by symbol and side';

-- Index for recent orders (time-based queries)
-- Query pattern: SELECT * FROM orders WHERE created_at >= NOW() - INTERVAL '30 days' AND symbol = ?
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_created_at_symbol
ON orders(created_at DESC, symbol)
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days';

COMMENT ON INDEX idx_orders_created_at_symbol IS 'Optimizes recent order queries with symbol filter';

-- Index for client_order_id lookups (idempotency checks)
-- Query pattern: SELECT * FROM orders WHERE client_order_id = ? AND user_id = ?
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_client_order_id_user
ON orders(client_order_id, user_id)
WHERE client_order_id IS NOT NULL;

COMMENT ON INDEX idx_orders_client_order_id_user IS 'Optimizes idempotency checks for client order IDs';

-- Covering index for order book depth queries
-- Query pattern: SELECT symbol, side, price, SUM(quantity - filled_quantity) FROM orders WHERE symbol = ? AND status IN ('OPEN', 'PARTIALLY_FILLED') GROUP BY symbol, side, price
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_depth_covering
ON orders(symbol, side, price) INCLUDE (quantity, filled_quantity)
WHERE status IN ('OPEN', 'PARTIALLY_FILLED') AND price IS NOT NULL;

COMMENT ON INDEX idx_orders_depth_covering IS 'Covering index for order book depth calculations (index-only scan)';

-- Index for trade history queries by user
-- Query pattern: SELECT * FROM trades WHERE (buyer_user_id = ? OR seller_user_id = ?) AND symbol = ? ORDER BY executed_at DESC
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trades_buyer_seller_symbol
ON trades(buyer_user_id, seller_user_id, symbol, executed_at DESC);

COMMENT ON INDEX idx_trades_buyer_seller_symbol IS 'Optimizes user trade history queries with symbol filter';

-- Index for trade volume analytics
-- Query pattern: SELECT symbol, SUM(quantity * price) FROM trades WHERE executed_at >= ? GROUP BY symbol
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trades_time_symbol_volume
ON trades(executed_at DESC, symbol) INCLUDE (quantity, price);

COMMENT ON INDEX idx_trades_time_symbol_volume IS 'Optimizes trade volume analytics with covering columns';

-- ============================================================================
-- PART 3: MATERIALIZED VIEWS FOR STATISTICS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Materialized View: 24-hour Trading Summary by Symbol
-- ----------------------------------------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS monitoring.mv_trading_summary_24h AS
SELECT
    symbol,
    COUNT(*) as trade_count,
    SUM(quantity) as total_volume,
    SUM(quantity * price) as total_quote_volume,
    MIN(price) as low_price,
    MAX(price) as high_price,
    AVG(price) as avg_price,
    STDDEV(price) as price_stddev,
    -- Get first price (open)
    (ARRAY_AGG(price ORDER BY executed_at ASC))[1] as open_price,
    -- Get last price (close)
    (ARRAY_AGG(price ORDER BY executed_at DESC))[1] as close_price,
    -- Price change
    ((ARRAY_AGG(price ORDER BY executed_at DESC))[1] -
     (ARRAY_AGG(price ORDER BY executed_at ASC))[1]) as price_change,
    -- Price change percentage
    ROUND(
        (((ARRAY_AGG(price ORDER BY executed_at DESC))[1] -
          (ARRAY_AGG(price ORDER BY executed_at ASC))[1]) /
         NULLIF((ARRAY_AGG(price ORDER BY executed_at ASC))[1], 0) * 100
        )::NUMERIC, 2
    ) as price_change_pct,
    -- Maker/Taker ratio
    COUNT(*) FILTER (WHERE is_buyer_maker = TRUE OR NOT is_buyer_maker) as maker_trades,
    COUNT(*) FILTER (WHERE is_buyer_maker = FALSE OR is_buyer_maker) as taker_trades,
    -- Time range
    MIN(executed_at) as period_start,
    MAX(executed_at) as period_end,
    NOW() as refreshed_at
FROM trades
WHERE executed_at >= NOW() - INTERVAL '24 hours'
GROUP BY symbol;

-- Create unique index for CONCURRENT refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_trading_summary_24h_symbol
ON monitoring.mv_trading_summary_24h(symbol);

COMMENT ON MATERIALIZED VIEW monitoring.mv_trading_summary_24h IS '24-hour trading statistics by symbol (refreshed hourly)';

-- ----------------------------------------------------------------------------
-- Materialized View: User Trading Performance Statistics
-- ----------------------------------------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS monitoring.mv_user_trading_stats AS
SELECT
    user_id,
    symbol,
    -- Order statistics
    COUNT(DISTINCT order_id) as total_orders,
    SUM(CASE WHEN status = 'FILLED' THEN 1 ELSE 0 END) as filled_orders,
    SUM(CASE WHEN status = 'PARTIALLY_FILLED' THEN 1 ELSE 0 END) as partially_filled_orders,
    SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) as cancelled_orders,
    SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) as rejected_orders,
    -- Volume statistics
    SUM(quantity) as total_quantity_ordered,
    SUM(filled_quantity) as total_quantity_filled,
    SUM(quantity * COALESCE(price, 0)) as total_order_value,
    -- Fill rate
    ROUND(
        (SUM(filled_quantity) / NULLIF(SUM(quantity), 0) * 100)::NUMERIC, 2
    ) as fill_rate_pct,
    -- Average time to fill (for filled orders)
    AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) FILTER (WHERE status = 'FILLED') as avg_time_to_fill_seconds,
    -- Side distribution
    COUNT(*) FILTER (WHERE side = 'BUY') as buy_orders,
    COUNT(*) FILTER (WHERE side = 'SELL') as sell_orders,
    -- Time range (last 30 days)
    MIN(created_at) as first_order_at,
    MAX(created_at) as last_order_at,
    NOW() as refreshed_at
FROM orders
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY user_id, symbol;

-- Create unique index for CONCURRENT refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_user_trading_stats_user_symbol
ON monitoring.mv_user_trading_stats(user_id, symbol);

COMMENT ON MATERIALIZED VIEW monitoring.mv_user_trading_stats IS 'User trading performance metrics (last 30 days, refreshed daily)';

-- ----------------------------------------------------------------------------
-- Materialized View: Order Flow Metrics (Buy/Sell Pressure)
-- ----------------------------------------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS monitoring.mv_order_flow_metrics AS
SELECT
    symbol,
    -- Buy side metrics
    COUNT(*) FILTER (WHERE side = 'BUY' AND status IN ('OPEN', 'PARTIALLY_FILLED')) as active_buy_orders,
    SUM(quantity - filled_quantity) FILTER (WHERE side = 'BUY' AND status IN ('OPEN', 'PARTIALLY_FILLED')) as total_buy_quantity,
    AVG(price) FILTER (WHERE side = 'BUY' AND status IN ('OPEN', 'PARTIALLY_FILLED')) as avg_buy_price,
    -- Sell side metrics
    COUNT(*) FILTER (WHERE side = 'SELL' AND status IN ('OPEN', 'PARTIALLY_FILLED')) as active_sell_orders,
    SUM(quantity - filled_quantity) FILTER (WHERE side = 'SELL' AND status IN ('OPEN', 'PARTIALLY_FILLED')) as total_sell_quantity,
    AVG(price) FILTER (WHERE side = 'SELL' AND status IN ('OPEN', 'PARTIALLY_FILLED')) as avg_sell_price,
    -- Best bid/ask
    MAX(price) FILTER (WHERE side = 'BUY' AND status IN ('OPEN', 'PARTIALLY_FILLED')) as best_bid,
    MIN(price) FILTER (WHERE side = 'SELL' AND status IN ('OPEN', 'PARTIALLY_FILLED')) as best_ask,
    -- Spread
    (MIN(price) FILTER (WHERE side = 'SELL' AND status IN ('OPEN', 'PARTIALLY_FILLED')) -
     MAX(price) FILTER (WHERE side = 'BUY' AND status IN ('OPEN', 'PARTIALLY_FILLED'))) as spread,
    -- Spread percentage
    ROUND(
        ((MIN(price) FILTER (WHERE side = 'SELL' AND status IN ('OPEN', 'PARTIALLY_FILLED')) -
          MAX(price) FILTER (WHERE side = 'BUY' AND status IN ('OPEN', 'PARTIALLY_FILLED'))) /
         NULLIF(MAX(price) FILTER (WHERE side = 'BUY' AND status IN ('OPEN', 'PARTIALLY_FILLED')), 0) * 100
        )::NUMERIC, 4
    ) as spread_pct,
    -- Order flow imbalance (positive = buy pressure, negative = sell pressure)
    (SUM(quantity - filled_quantity) FILTER (WHERE side = 'BUY' AND status IN ('OPEN', 'PARTIALLY_FILLED')) -
     SUM(quantity - filled_quantity) FILTER (WHERE side = 'SELL' AND status IN ('OPEN', 'PARTIALLY_FILLED'))) as order_flow_imbalance,
    -- Time range
    NOW() as refreshed_at
FROM orders
WHERE status IN ('OPEN', 'PARTIALLY_FILLED')
GROUP BY symbol;

-- Create unique index for CONCURRENT refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_order_flow_metrics_symbol
ON monitoring.mv_order_flow_metrics(symbol);

COMMENT ON MATERIALIZED VIEW monitoring.mv_order_flow_metrics IS 'Order flow analysis showing buy/sell pressure (refreshed every 5 minutes)';

-- ============================================================================
-- PART 4: MATERIALIZED VIEW REFRESH FUNCTIONS
-- ============================================================================

-- Function: Refresh all trading statistics materialized views
CREATE OR REPLACE FUNCTION monitoring.refresh_trading_stats()
RETURNS TEXT AS $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    result TEXT;
BEGIN
    start_time := clock_timestamp();

    -- Refresh 24h trading summary
    REFRESH MATERIALIZED VIEW CONCURRENTLY monitoring.mv_trading_summary_24h;

    -- Refresh order flow metrics
    REFRESH MATERIALIZED VIEW CONCURRENTLY monitoring.mv_order_flow_metrics;

    end_time := clock_timestamp();
    result := format('Trading stats refreshed in %s ms',
                     EXTRACT(MILLISECONDS FROM (end_time - start_time)));

    RETURN result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION monitoring.refresh_trading_stats() IS 'Refresh all trading statistics materialized views (run every 5 minutes)';

-- Function: Refresh user trading statistics (less frequent)
CREATE OR REPLACE FUNCTION monitoring.refresh_user_stats()
RETURNS TEXT AS $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    result TEXT;
BEGIN
    start_time := clock_timestamp();

    -- Refresh user trading stats
    REFRESH MATERIALIZED VIEW CONCURRENTLY monitoring.mv_user_trading_stats;

    end_time := clock_timestamp();
    result := format('User stats refreshed in %s ms',
                     EXTRACT(MILLISECONDS FROM (end_time - start_time)));

    RETURN result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION monitoring.refresh_user_stats() IS 'Refresh user trading statistics (run daily)';

-- ============================================================================
-- PART 5: PERFORMANCE BASELINE TRACKING
-- ============================================================================

-- Table: Performance baselines with threshold configuration
CREATE TABLE IF NOT EXISTS monitoring.performance_baselines (
    baseline_id SERIAL PRIMARY KEY,
    metric_name VARCHAR(100) NOT NULL UNIQUE,
    metric_description TEXT,
    current_value NUMERIC,
    threshold_warning NUMERIC,
    threshold_critical NUMERIC,
    unit VARCHAR(50),
    check_frequency_minutes INT DEFAULT 60,
    last_checked_at TIMESTAMP,
    last_alert_at TIMESTAMP,
    is_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE monitoring.performance_baselines IS 'Performance baseline metrics with alert thresholds';

-- Insert baseline metrics with thresholds
INSERT INTO monitoring.performance_baselines (metric_name, metric_description, threshold_warning, threshold_critical, unit, check_frequency_minutes) VALUES
('cache_hit_ratio', 'Buffer cache hit ratio', 95.0, 90.0, 'percentage', 15),
('avg_query_latency', 'Average query execution time', 50.0, 100.0, 'milliseconds', 15),
('connection_count', 'Active database connections', 80, 95, 'connections', 5),
('table_bloat_orders', 'Table bloat for orders table', 10.0, 20.0, 'percentage', 360),
('table_bloat_trades', 'Table bloat for trades table', 10.0, 20.0, 'percentage', 360),
('index_bloat', 'Average index bloat across all indexes', 15.0, 30.0, 'percentage', 360),
('slow_query_count', 'Number of queries slower than 100ms', 10, 50, 'queries', 60),
('partition_lag_days', 'Days until next partition needed', 3, 1, 'days', 1440),
('disk_usage_pct', 'Database disk usage', 70.0, 85.0, 'percentage', 60),
('locks_waiting', 'Number of queries waiting on locks', 5, 15, 'queries', 5)
ON CONFLICT (metric_name) DO NOTHING;

-- Table: Performance reports history
CREATE TABLE IF NOT EXISTS monitoring.performance_reports (
    report_id BIGSERIAL PRIMARY KEY,
    report_type VARCHAR(50) NOT NULL, -- 'DAILY', 'HOURLY', 'ALERT'
    report_date DATE NOT NULL,
    report_time TIMESTAMP NOT NULL DEFAULT NOW(),

    -- Query performance metrics
    total_queries BIGINT,
    slow_queries_count BIGINT,
    avg_query_time_ms NUMERIC(10,2),
    max_query_time_ms NUMERIC(10,2),

    -- Cache metrics
    cache_hit_ratio NUMERIC(5,2),
    buffers_alloc BIGINT,
    buffers_hit BIGINT,

    -- Connection metrics
    active_connections INT,
    idle_connections INT,
    max_connections INT,

    -- Table metrics
    total_table_size_mb NUMERIC(10,2),
    orders_table_size_mb NUMERIC(10,2),
    trades_table_size_mb NUMERIC(10,2),
    total_index_size_mb NUMERIC(10,2),

    -- Partition health
    partitions_exist INT,
    partitions_needed INT,
    oldest_partition_date DATE,
    newest_partition_date DATE,

    -- Issues found
    issues_critical INT DEFAULT 0,
    issues_warning INT DEFAULT 0,
    issues_detail JSONB,

    -- Recommendations
    recommendations TEXT[],

    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_performance_reports_date ON monitoring.performance_reports(report_date DESC);
CREATE INDEX idx_performance_reports_type ON monitoring.performance_reports(report_type, report_date DESC);

COMMENT ON TABLE monitoring.performance_reports IS 'Historical performance reports with automated analysis';

-- ============================================================================
-- PART 6: AUTOMATED PERFORMANCE REPORTING
-- ============================================================================

-- Function: Generate daily performance report
CREATE OR REPLACE FUNCTION monitoring.generate_daily_performance_report()
RETURNS BIGINT AS $$
DECLARE
    report_id BIGINT;
    v_total_queries BIGINT;
    v_slow_queries BIGINT;
    v_avg_query_time NUMERIC;
    v_max_query_time NUMERIC;
    v_cache_hit_ratio NUMERIC;
    v_active_conns INT;
    v_idle_conns INT;
    v_max_conns INT;
    v_issues_critical INT := 0;
    v_issues_warning INT := 0;
    v_issues JSONB := '[]'::JSONB;
    v_recommendations TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Collect query statistics (requires pg_stat_statements extension)
    SELECT
        SUM(calls),
        SUM(CASE WHEN mean_exec_time > 100 THEN calls ELSE 0 END),
        AVG(mean_exec_time),
        MAX(mean_exec_time)
    INTO v_total_queries, v_slow_queries, v_avg_query_time, v_max_query_time
    FROM pg_stat_statements
    WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database());

    -- Collect cache hit ratio
    SELECT
        ROUND(
            SUM(blks_hit)::NUMERIC / NULLIF(SUM(blks_hit + blks_read), 0) * 100, 2
        )
    INTO v_cache_hit_ratio
    FROM pg_stat_database
    WHERE datname = current_database();

    -- Collect connection statistics
    SELECT
        COUNT(*) FILTER (WHERE state = 'active'),
        COUNT(*) FILTER (WHERE state = 'idle'),
        setting::INT
    INTO v_active_conns, v_idle_conns, v_max_conns
    FROM pg_stat_activity
    CROSS JOIN pg_settings
    WHERE pg_settings.name = 'max_connections';

    -- Check for issues and generate recommendations

    -- Issue: Low cache hit ratio
    IF v_cache_hit_ratio < 95 THEN
        v_issues_critical := v_issues_critical + 1;
        v_issues := v_issues || jsonb_build_object(
            'severity', 'CRITICAL',
            'metric', 'cache_hit_ratio',
            'current_value', v_cache_hit_ratio,
            'threshold', 95,
            'message', 'Cache hit ratio below 95%'
        );
        v_recommendations := v_recommendations || 'Consider increasing shared_buffers';
    END IF;

    -- Issue: High number of slow queries
    IF v_slow_queries > 100 THEN
        v_issues_warning := v_issues_warning + 1;
        v_issues := v_issues || jsonb_build_object(
            'severity', 'WARNING',
            'metric', 'slow_queries',
            'current_value', v_slow_queries,
            'threshold', 100,
            'message', format('Found %s queries slower than 100ms', v_slow_queries)
        );
        v_recommendations := v_recommendations || 'Review slow queries with monitoring.analyze_slow_queries(100)';
    END IF;

    -- Issue: High connection usage
    IF v_active_conns + v_idle_conns > v_max_conns * 0.8 THEN
        v_issues_warning := v_issues_warning + 1;
        v_issues := v_issues || jsonb_build_object(
            'severity', 'WARNING',
            'metric', 'connection_usage',
            'current_value', v_active_conns + v_idle_conns,
            'threshold', v_max_conns * 0.8,
            'message', 'Connection pool usage above 80%'
        );
        v_recommendations := v_recommendations || 'Consider increasing max_connections or implementing connection pooling';
    END IF;

    -- Insert report
    INSERT INTO monitoring.performance_reports (
        report_type,
        report_date,
        total_queries,
        slow_queries_count,
        avg_query_time_ms,
        max_query_time_ms,
        cache_hit_ratio,
        active_connections,
        idle_connections,
        max_connections,
        issues_critical,
        issues_warning,
        issues_detail,
        recommendations
    ) VALUES (
        'DAILY',
        CURRENT_DATE,
        v_total_queries,
        v_slow_queries,
        v_avg_query_time,
        v_max_query_time,
        v_cache_hit_ratio,
        v_active_conns,
        v_idle_conns,
        v_max_conns,
        v_issues_critical,
        v_issues_warning,
        v_issues,
        v_recommendations
    ) RETURNING performance_reports.report_id INTO report_id;

    -- Update baseline metrics
    UPDATE monitoring.performance_baselines
    SET current_value = v_cache_hit_ratio,
        last_checked_at = NOW()
    WHERE metric_name = 'cache_hit_ratio';

    UPDATE monitoring.performance_baselines
    SET current_value = v_avg_query_time,
        last_checked_at = NOW()
    WHERE metric_name = 'avg_query_latency';

    UPDATE monitoring.performance_baselines
    SET current_value = v_active_conns + v_idle_conns,
        last_checked_at = NOW()
    WHERE metric_name = 'connection_count';

    RETURN report_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION monitoring.generate_daily_performance_report() IS 'Generate comprehensive daily performance report with issue detection';

-- ============================================================================
-- PART 7: UTILITY FUNCTIONS FOR ANALYSIS
-- ============================================================================

-- Function: Suggest index improvements based on missing indexes
CREATE OR REPLACE FUNCTION monitoring.suggest_index_improvements()
RETURNS TABLE (
    table_name TEXT,
    suggested_columns TEXT[],
    reason TEXT,
    estimated_benefit TEXT,
    sample_query TEXT
) AS $$
BEGIN
    RETURN QUERY
    -- Analyze pg_stat_statements for sequential scans on large tables
    SELECT
        schemaname || '.' || relname AS table_name,
        ARRAY['Consider analyzing query patterns']::TEXT[] AS suggested_columns,
        format('Sequential scans: %s, Rows: %s', seq_scan, n_live_tup) AS reason,
        CASE
            WHEN seq_scan > 1000 AND n_live_tup > 10000 THEN 'HIGH'
            WHEN seq_scan > 100 AND n_live_tup > 1000 THEN 'MEDIUM'
            ELSE 'LOW'
        END AS estimated_benefit,
        'Review queries using EXPLAIN ANALYZE' AS sample_query
    FROM pg_stat_user_tables
    WHERE seq_scan > 100
      AND n_live_tup > 1000
      AND schemaname = 'public'
    ORDER BY seq_scan * n_live_tup DESC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION monitoring.suggest_index_improvements() IS 'Analyze query patterns and suggest potential index improvements';

-- Function: Analyze slow queries with detailed breakdown
CREATE OR REPLACE FUNCTION monitoring.analyze_slow_queries(threshold_ms NUMERIC DEFAULT 100)
RETURNS TABLE (
    query_id BIGINT,
    query_text TEXT,
    calls BIGINT,
    total_time_ms NUMERIC,
    mean_time_ms NUMERIC,
    max_time_ms NUMERIC,
    stddev_time_ms NUMERIC,
    rows_avg NUMERIC,
    cache_hit_pct NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        pss.queryid,
        LEFT(pss.query, 200) AS query_text,
        pss.calls,
        ROUND(pss.total_exec_time::NUMERIC, 2) AS total_time_ms,
        ROUND(pss.mean_exec_time::NUMERIC, 2) AS mean_time_ms,
        ROUND(pss.max_exec_time::NUMERIC, 2) AS max_time_ms,
        ROUND(pss.stddev_exec_time::NUMERIC, 2) AS stddev_time_ms,
        ROUND(pss.rows::NUMERIC / NULLIF(pss.calls, 0), 2) AS rows_avg,
        ROUND(
            (pss.shared_blks_hit::NUMERIC /
             NULLIF(pss.shared_blks_hit + pss.shared_blks_read, 0) * 100
            ), 2
        ) AS cache_hit_pct
    FROM pg_stat_statements pss
    WHERE pss.mean_exec_time > threshold_ms
      AND pss.dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
    ORDER BY pss.mean_exec_time DESC
    LIMIT 20;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION monitoring.analyze_slow_queries(NUMERIC) IS 'Detailed analysis of slow queries above threshold (default 100ms)';

-- Function: Partition size and growth report
CREATE OR REPLACE FUNCTION monitoring.partition_size_report()
RETURNS TABLE (
    partition_name TEXT,
    partition_type TEXT,
    rows_estimate BIGINT,
    total_size_mb NUMERIC,
    table_size_mb NUMERIC,
    index_size_mb NUMERIC,
    created_for_date DATE,
    growth_rate_mb_per_day NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.relname::TEXT AS partition_name,
        CASE
            WHEN c.relname LIKE 'orders_%' THEN 'orders'
            WHEN c.relname LIKE 'trades_%' THEN 'trades'
            ELSE 'other'
        END AS partition_type,
        c.reltuples::BIGINT AS rows_estimate,
        ROUND((pg_total_relation_size(c.oid) / 1024.0 / 1024.0)::NUMERIC, 2) AS total_size_mb,
        ROUND((pg_table_size(c.oid) / 1024.0 / 1024.0)::NUMERIC, 2) AS table_size_mb,
        ROUND((pg_indexes_size(c.oid) / 1024.0 / 1024.0)::NUMERIC, 2) AS index_size_mb,
        -- Extract date from partition name (e.g., orders_2024_11 or trades_2024_11_22)
        CASE
            WHEN c.relname ~ '\d{4}_\d{2}_\d{2}$' THEN
                TO_DATE(substring(c.relname from '\d{4}_\d{2}_\d{2}$'), 'YYYY_MM_DD')
            WHEN c.relname ~ '\d{4}_\d{2}$' THEN
                TO_DATE(substring(c.relname from '\d{4}_\d{2}$') || '_01', 'YYYY_MM_DD')
            ELSE NULL
        END AS created_for_date,
        -- Estimate growth rate (simplified)
        CASE
            WHEN c.reltuples > 0 THEN
                ROUND((pg_total_relation_size(c.oid) / 1024.0 / 1024.0 /
                       GREATEST(EXTRACT(DAY FROM NOW() - pg_stat_file('base/'||c.oid::TEXT)::RECORD).mtime), 1)
                      )::NUMERIC, 2)
            ELSE 0
        END AS growth_rate_mb_per_day
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'r'
      AND n.nspname = 'public'
      AND (c.relname LIKE 'orders_%' OR c.relname LIKE 'trades_%')
    ORDER BY total_size_mb DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION monitoring.partition_size_report() IS 'Report on partition sizes and growth rates';

-- Function: Table fragmentation and bloat check
CREATE OR REPLACE FUNCTION monitoring.table_fragmentation_check()
RETURNS TABLE (
    schema_name TEXT,
    table_name TEXT,
    total_size_mb NUMERIC,
    bloat_size_mb NUMERIC,
    bloat_pct NUMERIC,
    dead_tuples BIGINT,
    live_tuples BIGINT,
    last_vacuum TIMESTAMP,
    last_analyze TIMESTAMP,
    recommendation TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        schemaname::TEXT,
        tablename::TEXT,
        ROUND((pg_total_relation_size(schemaname||'.'||tablename) / 1024.0 / 1024.0)::NUMERIC, 2) AS total_size_mb,
        -- Simplified bloat estimation
        ROUND(((n_dead_tup *
                (SELECT setting::INT FROM pg_settings WHERE name = 'autovacuum_vacuum_scale_factor')
               ) / 1024.0 / 1024.0)::NUMERIC, 2) AS bloat_size_mb,
        ROUND((n_dead_tup::NUMERIC / NULLIF(n_live_tup + n_dead_tup, 0) * 100), 2) AS bloat_pct,
        n_dead_tup AS dead_tuples,
        n_live_tup AS live_tuples,
        last_vacuum,
        last_analyze,
        CASE
            WHEN n_dead_tup::NUMERIC / NULLIF(n_live_tup + n_dead_tup, 0) > 0.2 THEN 'VACUUM RECOMMENDED'
            WHEN n_dead_tup::NUMERIC / NULLIF(n_live_tup + n_dead_tup, 0) > 0.1 THEN 'MONITOR CLOSELY'
            ELSE 'OK'
        END AS recommendation
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
      AND n_live_tup > 0
    ORDER BY bloat_pct DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION monitoring.table_fragmentation_check() IS 'Check tables for fragmentation and bloat, recommend VACUUM';

-- Function: Index usage statistics and recommendations
CREATE OR REPLACE FUNCTION monitoring.index_usage_analysis()
RETURNS TABLE (
    schema_name TEXT,
    table_name TEXT,
    index_name TEXT,
    index_size_mb NUMERIC,
    index_scans BIGINT,
    tuples_read BIGINT,
    tuples_fetched BIGINT,
    usage_ratio NUMERIC,
    recommendation TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        schemaname::TEXT,
        tablename::TEXT,
        indexrelname::TEXT,
        ROUND((pg_relation_size(indexrelid) / 1024.0 / 1024.0)::NUMERIC, 2) AS index_size_mb,
        idx_scan AS index_scans,
        idx_tup_read AS tuples_read,
        idx_tup_fetch AS tuples_fetched,
        ROUND((idx_scan::NUMERIC / NULLIF(seq_scan + idx_scan, 0) * 100), 2) AS usage_ratio,
        CASE
            WHEN idx_scan = 0 AND pg_relation_size(indexrelid) > 1024*1024 THEN 'UNUSED - CONSIDER DROPPING'
            WHEN idx_scan < 100 AND pg_relation_size(indexrelid) > 10*1024*1024 THEN 'RARELY USED - REVIEW'
            WHEN idx_scan > 10000 THEN 'HEAVILY USED - GOOD'
            ELSE 'MONITOR'
        END AS recommendation
    FROM pg_stat_user_indexes psu
    JOIN pg_stat_user_tables pst ON psu.relid = pst.relid
    WHERE schemaname = 'public'
    ORDER BY idx_scan ASC, index_size_mb DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION monitoring.index_usage_analysis() IS 'Analyze index usage and identify unused or underutilized indexes';

-- ============================================================================
-- PART 8: ENHANCED MONITORING VIEWS
-- ============================================================================

-- View: Query performance summary
CREATE OR REPLACE VIEW monitoring.v_query_performance AS
SELECT
    queryid,
    LEFT(query, 100) AS query_snippet,
    calls,
    ROUND(total_exec_time::NUMERIC, 2) AS total_time_ms,
    ROUND(mean_exec_time::NUMERIC, 2) AS mean_time_ms,
    ROUND(min_exec_time::NUMERIC, 2) AS min_time_ms,
    ROUND(max_exec_time::NUMERIC, 2) AS max_time_ms,
    ROUND(stddev_exec_time::NUMERIC, 2) AS stddev_time_ms,
    rows,
    ROUND((shared_blks_hit::NUMERIC / NULLIF(shared_blks_hit + shared_blks_read, 0) * 100), 2) AS cache_hit_pct,
    CASE
        WHEN mean_exec_time > 1000 THEN 'CRITICAL'
        WHEN mean_exec_time > 100 THEN 'WARNING'
        ELSE 'OK'
    END AS performance_status
FROM pg_stat_statements
WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
ORDER BY total_exec_time DESC;

COMMENT ON VIEW monitoring.v_query_performance IS 'Query performance metrics with performance status';

-- View: Connection pool status
CREATE OR REPLACE VIEW monitoring.v_connection_status AS
SELECT
    COUNT(*) AS total_connections,
    COUNT(*) FILTER (WHERE state = 'active') AS active,
    COUNT(*) FILTER (WHERE state = 'idle') AS idle,
    COUNT(*) FILTER (WHERE state = 'idle in transaction') AS idle_in_transaction,
    COUNT(*) FILTER (WHERE wait_event IS NOT NULL) AS waiting,
    COUNT(*) FILTER (WHERE state = 'active' AND NOW() - state_change > INTERVAL '1 minute') AS long_running,
    (SELECT setting::INT FROM pg_settings WHERE name = 'max_connections') AS max_connections,
    ROUND(
        COUNT(*)::NUMERIC / (SELECT setting::INT FROM pg_settings WHERE name = 'max_connections') * 100, 2
    ) AS usage_pct
FROM pg_stat_activity
WHERE datname = current_database();

COMMENT ON VIEW monitoring.v_connection_status IS 'Real-time connection pool status and utilization';

-- View: Table size and growth tracking
CREATE OR REPLACE VIEW monitoring.v_table_sizes AS
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    pg_size_pretty(pg_table_size(schemaname||'.'||tablename)) AS table_size,
    pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) AS indexes_size,
    ROUND((pg_total_relation_size(schemaname||'.'||tablename) / 1024.0 / 1024.0)::NUMERIC, 2) AS total_size_mb,
    n_live_tup AS row_estimate,
    n_dead_tup AS dead_rows,
    ROUND((n_dead_tup::NUMERIC / NULLIF(n_live_tup, 0) * 100), 2) AS dead_row_pct,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

COMMENT ON VIEW monitoring.v_table_sizes IS 'Table sizes with vacuum and analyze status';

-- View: Partition health check
CREATE OR REPLACE VIEW monitoring.v_partition_health AS
WITH partition_info AS (
    SELECT
        parent.relname AS parent_table,
        child.relname AS partition_name,
        CASE
            WHEN child.relname ~ '\d{4}_\d{2}_\d{2}$' THEN
                TO_DATE(substring(child.relname from '\d{4}_\d{2}_\d{2}$'), 'YYYY_MM_DD')
            WHEN child.relname ~ '\d{4}_\d{2}$' THEN
                TO_DATE(substring(child.relname from '\d{4}_\d{2}$') || '_01', 'YYYY_MM_DD')
            ELSE NULL
        END AS partition_date,
        pg_size_pretty(pg_total_relation_size(child.oid)) AS size,
        (pg_total_relation_size(child.oid) / 1024.0 / 1024.0) AS size_mb
    FROM pg_inherits
    JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
    JOIN pg_class child ON pg_inherits.inhrelid = child.oid
    WHERE parent.relname IN ('orders', 'trades')
)
SELECT
    parent_table,
    COUNT(*) AS total_partitions,
    MIN(partition_date) AS oldest_partition,
    MAX(partition_date) AS newest_partition,
    CURRENT_DATE - MAX(partition_date) AS days_until_newest,
    pg_size_pretty(SUM(size_mb * 1024 * 1024)::BIGINT) AS total_size,
    ROUND(AVG(size_mb)::NUMERIC, 2) AS avg_partition_size_mb,
    CASE
        WHEN CURRENT_DATE - MAX(partition_date) > 30 THEN 'CRITICAL - CREATE PARTITIONS'
        WHEN CURRENT_DATE - MAX(partition_date) > 7 THEN 'WARNING - CREATE SOON'
        ELSE 'OK'
    END AS health_status
FROM partition_info
WHERE partition_date IS NOT NULL
GROUP BY parent_table;

COMMENT ON VIEW monitoring.v_partition_health IS 'Monitor partition health and alert when new partitions needed';

-- ============================================================================
-- PART 9: ALERT FUNCTIONS
-- ============================================================================

-- Function: Check all performance baselines and raise alerts
CREATE OR REPLACE FUNCTION monitoring.check_performance_alerts()
RETURNS TABLE (
    metric_name VARCHAR(100),
    current_value NUMERIC,
    threshold_warning NUMERIC,
    threshold_critical NUMERIC,
    severity TEXT,
    message TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        pb.metric_name,
        pb.current_value,
        pb.threshold_warning,
        pb.threshold_critical,
        CASE
            WHEN pb.current_value >= pb.threshold_critical THEN 'CRITICAL'
            WHEN pb.current_value >= pb.threshold_warning THEN 'WARNING'
            ELSE 'OK'
        END AS severity,
        CASE
            WHEN pb.current_value >= pb.threshold_critical THEN
                format('CRITICAL: %s is %s%s (threshold: %s%s)',
                       pb.metric_name, pb.current_value, COALESCE(pb.unit, ''),
                       pb.threshold_critical, COALESCE(pb.unit, ''))
            WHEN pb.current_value >= pb.threshold_warning THEN
                format('WARNING: %s is %s%s (threshold: %s%s)',
                       pb.metric_name, pb.current_value, COALESCE(pb.unit, ''),
                       pb.threshold_warning, COALESCE(pb.unit, ''))
            ELSE
                format('OK: %s is %s%s',
                       pb.metric_name, pb.current_value, COALESCE(pb.unit, ''))
        END AS message
    FROM monitoring.performance_baselines pb
    WHERE pb.is_enabled = TRUE
      AND (pb.current_value >= pb.threshold_warning OR pb.current_value >= pb.threshold_critical)
    ORDER BY
        CASE
            WHEN pb.current_value >= pb.threshold_critical THEN 1
            WHEN pb.current_value >= pb.threshold_warning THEN 2
            ELSE 3
        END;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION monitoring.check_performance_alerts() IS 'Check all performance baselines and return active alerts';

-- ============================================================================
-- PART 10: SCHEDULE RECOMMENDATIONS (pg_cron)
-- ============================================================================

-- NOTE: Requires pg_cron extension
-- To enable: CREATE EXTENSION IF NOT EXISTS pg_cron;

COMMENT ON SCHEMA monitoring IS '
Performance Monitoring Schedule Recommendations:

1. Every 5 minutes:
   SELECT monitoring.refresh_trading_stats();

2. Every 15 minutes:
   SELECT monitoring.check_performance_alerts();

3. Every hour:
   SELECT monitoring.generate_daily_performance_report();

4. Daily (02:00 AM):
   SELECT monitoring.refresh_user_stats();
   SELECT monitoring.table_fragmentation_check();

5. Weekly (Sunday 03:00 AM):
   SELECT monitoring.index_usage_analysis();
   SELECT monitoring.partition_size_report();

Example pg_cron setup:
SELECT cron.schedule(''refresh-trading-stats'', ''*/5 * * * *'', ''SELECT monitoring.refresh_trading_stats()'');
SELECT cron.schedule(''check-alerts'', ''*/15 * * * *'', ''SELECT monitoring.check_performance_alerts()'');
SELECT cron.schedule(''daily-report'', ''0 2 * * *'', ''SELECT monitoring.generate_daily_performance_report()'');
SELECT cron.schedule(''refresh-user-stats'', ''0 2 * * *'', ''SELECT monitoring.refresh_user_stats()'');
';

-- ============================================================================
-- PART 11: GRANTS AND PERMISSIONS
-- ============================================================================

-- Grant read access to monitoring schema
GRANT USAGE ON SCHEMA monitoring TO trade_engine_app;
GRANT SELECT ON ALL TABLES IN SCHEMA monitoring TO trade_engine_app;
GRANT SELECT ON ALL TABLES IN SCHEMA monitoring TO trade_engine_readonly;

-- Grant execute on monitoring functions to application role
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA monitoring TO trade_engine_app;

-- Grant all privileges to admin role
GRANT ALL ON SCHEMA monitoring TO trade_engine_admin;
GRANT ALL ON ALL TABLES IN SCHEMA monitoring TO trade_engine_admin;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA monitoring TO trade_engine_admin;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Test index creation
DO $$
BEGIN
    RAISE NOTICE 'Verifying indexes created...';

    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_orders_user_status_created') THEN
        RAISE NOTICE '✓ Index idx_orders_user_status_created created';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_orders_depth_covering') THEN
        RAISE NOTICE '✓ Index idx_orders_depth_covering created';
    END IF;

    RAISE NOTICE 'Index verification complete';
END $$;

-- Test materialized views
DO $$
BEGIN
    RAISE NOTICE 'Verifying materialized views...';

    IF EXISTS (SELECT 1 FROM pg_matviews WHERE schemaname = 'monitoring' AND matviewname = 'mv_trading_summary_24h') THEN
        RAISE NOTICE '✓ Materialized view mv_trading_summary_24h created';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_matviews WHERE schemaname = 'monitoring' AND matviewname = 'mv_user_trading_stats') THEN
        RAISE NOTICE '✓ Materialized view mv_user_trading_stats created';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_matviews WHERE schemaname = 'monitoring' AND matviewname = 'mv_order_flow_metrics') THEN
        RAISE NOTICE '✓ Materialized view mv_order_flow_metrics created';
    END IF;

    RAISE NOTICE 'Materialized view verification complete';
END $$;

-- ============================================================================
-- COMPLETION SUMMARY
-- ============================================================================

DO $$
DECLARE
    index_count INT;
    matview_count INT;
    function_count INT;
    view_count INT;
BEGIN
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes
    WHERE indexname LIKE 'idx_orders_%' OR indexname LIKE 'idx_trades_%';

    SELECT COUNT(*) INTO matview_count
    FROM pg_matviews
    WHERE schemaname = 'monitoring';

    SELECT COUNT(*) INTO function_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'monitoring';

    SELECT COUNT(*) INTO view_count
    FROM pg_views
    WHERE schemaname = 'monitoring';

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'DAY 3 PERFORMANCE OPTIMIZATION COMPLETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Indexes created: %', index_count;
    RAISE NOTICE 'Materialized views: %', matview_count;
    RAISE NOTICE 'Functions created: %', function_count;
    RAISE NOTICE 'Monitoring views: %', view_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Refresh materialized views: SELECT monitoring.refresh_trading_stats()';
    RAISE NOTICE '2. Generate performance report: SELECT monitoring.generate_daily_performance_report()';
    RAISE NOTICE '3. Check for alerts: SELECT * FROM monitoring.check_performance_alerts()';
    RAISE NOTICE '4. Review slow queries: SELECT * FROM monitoring.analyze_slow_queries(100)';
    RAISE NOTICE '========================================';
END $$;
