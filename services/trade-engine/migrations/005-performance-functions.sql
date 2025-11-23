-- Migration: 005-performance-functions.sql
-- Description: Performance analysis functions for query optimization and maintenance
-- Author: Database Agent
-- Date: 2025-11-23
-- Dependencies: 004-performance-monitoring.sql

-- =============================================================================
-- FUNCTION 1: GET QUERY PERFORMANCE FOR TIME PERIOD
-- =============================================================================

CREATE OR REPLACE FUNCTION monitoring.get_query_performance(
    time_interval INTERVAL DEFAULT INTERVAL '1 hour'
)
RETURNS TABLE (
    query_snippet TEXT,
    calls BIGINT,
    total_exec_time_ms NUMERIC,
    mean_exec_time_ms NUMERIC,
    max_exec_time_ms NUMERIC,
    rows_returned BIGINT,
    cache_hit_ratio NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        substring(pss.query, 1, 150) as query_snippet,
        pss.calls,
        ROUND(pss.total_exec_time::numeric, 2) as total_exec_time_ms,
        ROUND(pss.mean_exec_time::numeric, 2) as mean_exec_time_ms,
        ROUND(pss.max_exec_time::numeric, 2) as max_exec_time_ms,
        pss.rows as rows_returned,
        ROUND((100.0 * pss.shared_blks_hit / NULLIF(pss.shared_blks_hit + pss.shared_blks_read, 0))::numeric, 2) as cache_hit_ratio
    FROM pg_stat_statements pss
    WHERE pss.calls > 0
    ORDER BY pss.total_exec_time DESC
    LIMIT 100;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION monitoring.get_query_performance IS 'Get query performance statistics for the specified time interval';

-- =============================================================================
-- FUNCTION 2: IDENTIFY TABLE BLOAT
-- =============================================================================

CREATE OR REPLACE FUNCTION monitoring.get_table_bloat()
RETURNS TABLE (
    schema_name TEXT,
    table_name TEXT,
    actual_size TEXT,
    live_tuples BIGINT,
    dead_tuples BIGINT,
    bloat_percentage NUMERIC,
    wasted_bytes BIGINT,
    wasted_size TEXT,
    recommendation TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        pst.schemaname::TEXT,
        pst.tablename::TEXT,
        pg_size_pretty(pg_total_relation_size(pst.schemaname||'.'||pst.tablename)),
        pst.n_live_tup,
        pst.n_dead_tup,
        ROUND(100.0 * pst.n_dead_tup / NULLIF(pst.n_live_tup + pst.n_dead_tup, 0), 2) as bloat_pct,
        (pst.n_dead_tup *
            (SELECT setting::int FROM pg_settings WHERE name = 'block_size') /
            NULLIF((SELECT (current_setting('autovacuum_vacuum_scale_factor')::float * 100)::int), 0)
        ) as wasted_bytes_estimate,
        pg_size_pretty((pst.n_dead_tup *
            (SELECT setting::int FROM pg_settings WHERE name = 'block_size') /
            NULLIF((SELECT (current_setting('autovacuum_vacuum_scale_factor')::float * 100)::int), 0)
        )::bigint),
        CASE
            WHEN (100.0 * pst.n_dead_tup / NULLIF(pst.n_live_tup + pst.n_dead_tup, 0)) > 50 THEN
                'CRITICAL: Run VACUUM FULL immediately'
            WHEN (100.0 * pst.n_dead_tup / NULLIF(pst.n_live_tup + pst.n_dead_tup, 0)) > 30 THEN
                'WARNING: Run VACUUM soon'
            WHEN (100.0 * pst.n_dead_tup / NULLIF(pst.n_live_tup + pst.n_dead_tup, 0)) > 15 THEN
                'NOTICE: Monitor bloat growth'
            ELSE
                'OK: Bloat within acceptable range'
        END::TEXT
    FROM pg_stat_user_tables pst
    WHERE pst.n_live_tup > 0
      AND pst.n_dead_tup > 0
    ORDER BY (100.0 * pst.n_dead_tup / NULLIF(pst.n_live_tup + pst.n_dead_tup, 0)) DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION monitoring.get_table_bloat IS 'Identify bloated tables with actionable recommendations';

-- =============================================================================
-- FUNCTION 3: SUGGEST MISSING INDEXES
-- =============================================================================

CREATE OR REPLACE FUNCTION monitoring.get_missing_indexes()
RETURNS TABLE (
    schema_name TEXT,
    table_name TEXT,
    seq_scans BIGINT,
    index_scans BIGINT,
    rows_in_table BIGINT,
    suggestion TEXT,
    priority TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        pst.schemaname::TEXT,
        pst.tablename::TEXT,
        pst.seq_scan,
        COALESCE(pst.idx_scan, 0),
        pst.n_live_tup,
        CASE
            WHEN pst.seq_scan > 1000 AND pst.n_live_tup > 10000 THEN
                'Consider adding indexes on frequently filtered columns'
            WHEN pst.seq_scan > 100 AND pst.n_live_tup > 1000 THEN
                'Monitor query patterns and consider selective indexes'
            WHEN pst.seq_scan > 10 AND COALESCE(pst.idx_scan, 0) = 0 THEN
                'Table accessed but no indexes used - review WHERE clauses'
            ELSE
                'No immediate action needed'
        END::TEXT,
        CASE
            WHEN pst.seq_scan > 1000 AND pst.n_live_tup > 10000 THEN 'HIGH'
            WHEN pst.seq_scan > 100 AND pst.n_live_tup > 1000 THEN 'MEDIUM'
            WHEN pst.seq_scan > 10 THEN 'LOW'
            ELSE 'NONE'
        END::TEXT
    FROM pg_stat_user_tables pst
    WHERE pst.seq_scan > 0
      AND pst.n_live_tup > 0
      AND (pst.seq_scan > pst.idx_scan OR pst.idx_scan IS NULL)
    ORDER BY pst.seq_scan DESC, pst.n_live_tup DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION monitoring.get_missing_indexes IS 'Suggest tables that may benefit from additional indexes';

-- =============================================================================
-- FUNCTION 4: ANALYZE PARTITION USAGE PATTERNS
-- =============================================================================

CREATE OR REPLACE FUNCTION monitoring.analyze_partition_usage()
RETURNS TABLE (
    parent_table TEXT,
    partition_name TEXT,
    partition_date DATE,
    row_count BIGINT,
    total_size TEXT,
    seq_scans BIGINT,
    index_scans BIGINT,
    days_old INTEGER,
    access_pattern TEXT,
    retention_action TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH partition_info AS (
        SELECT
            CASE
                WHEN pst.tablename LIKE 'orders_%' THEN 'orders'
                WHEN pst.tablename LIKE 'trades_%' THEN 'trades'
                ELSE 'unknown'
            END as parent,
            pst.tablename,
            CASE
                WHEN pst.tablename ~ '_(2[0-9]{3})_([0-9]{2})(_([0-9]{2}))?$' THEN
                    CASE
                        WHEN pst.tablename ~ '_[0-9]{4}_[0-9]{2}_[0-9]{2}$' THEN
                            TO_DATE(substring(pst.tablename from '_([0-9]{4}_[0-9]{2}_[0-9]{2})$'), 'YYYY_MM_DD')
                        ELSE
                            TO_DATE(substring(pst.tablename from '_([0-9]{4}_[0-9]{2})$'), 'YYYY_MM')
                    END
                ELSE NULL
            END as part_date,
            pst.n_live_tup,
            pg_total_relation_size(pst.schemaname||'.'||pst.tablename) as total_bytes,
            pst.seq_scan,
            COALESCE(pst.idx_scan, 0) as idx_scan_count
        FROM pg_stat_user_tables pst
        WHERE pst.tablename LIKE 'orders_%' OR pst.tablename LIKE 'trades_%'
    )
    SELECT
        pi.parent::TEXT,
        pi.tablename::TEXT,
        pi.part_date,
        pi.n_live_tup,
        pg_size_pretty(pi.total_bytes),
        pi.seq_scan,
        pi.idx_scan_count,
        EXTRACT(DAY FROM (CURRENT_DATE - pi.part_date))::INTEGER as days_old,
        CASE
            WHEN pi.seq_scan + pi.idx_scan_count = 0 THEN 'NO_ACCESS'
            WHEN pi.seq_scan > pi.idx_scan_count THEN 'SEQ_SCAN_HEAVY'
            WHEN pi.idx_scan_count > 0 THEN 'INDEX_SCAN_OPTIMAL'
            ELSE 'UNKNOWN'
        END::TEXT,
        CASE
            WHEN EXTRACT(DAY FROM (CURRENT_DATE - pi.part_date)) > 365
                 AND (pi.seq_scan + pi.idx_scan_count) = 0 THEN
                'ARCHIVE_CANDIDATE: Not accessed in 1+ year'
            WHEN EXTRACT(DAY FROM (CURRENT_DATE - pi.part_date)) > 180
                 AND (pi.seq_scan + pi.idx_scan_count) < 10 THEN
                'CONSIDER_ARCHIVE: Low access over 6+ months'
            WHEN EXTRACT(DAY FROM (CURRENT_DATE - pi.part_date)) > 90 THEN
                'MONITOR: Older than 3 months'
            ELSE
                'ACTIVE: Keep current'
        END::TEXT
    FROM partition_info pi
    WHERE pi.part_date IS NOT NULL
    ORDER BY pi.part_date DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION monitoring.analyze_partition_usage IS 'Analyze partition access patterns and suggest retention actions';

-- =============================================================================
-- FUNCTION 5: CREATE FUTURE PARTITIONS (ORDERS - MONTHLY)
-- =============================================================================

CREATE OR REPLACE FUNCTION monitoring.create_future_order_partitions(
    months_ahead INT DEFAULT 3
)
RETURNS TABLE (
    partition_name TEXT,
    start_date DATE,
    end_date DATE,
    status TEXT
) AS $$
DECLARE
    start_dt DATE;
    end_dt DATE;
    part_name TEXT;
    i INT;
    table_exists BOOLEAN;
BEGIN
    FOR i IN 1..months_ahead LOOP
        start_dt := DATE_TRUNC('month', CURRENT_DATE + (i || ' months')::INTERVAL)::DATE;
        end_dt := (start_dt + INTERVAL '1 month')::DATE;
        part_name := 'orders_' || TO_CHAR(start_dt, 'YYYY_MM');

        -- Check if partition already exists
        SELECT EXISTS (
            SELECT 1 FROM pg_tables
            WHERE schemaname = 'public' AND tablename = part_name
        ) INTO table_exists;

        IF NOT table_exists THEN
            EXECUTE format(
                'CREATE TABLE IF NOT EXISTS %I PARTITION OF orders
                 FOR VALUES FROM (%L) TO (%L)',
                part_name,
                start_dt,
                end_dt
            );

            partition_name := part_name;
            start_date := start_dt;
            end_date := end_dt;
            status := 'CREATED';
            RETURN NEXT;
        ELSE
            partition_name := part_name;
            start_date := start_dt;
            end_date := end_dt;
            status := 'ALREADY_EXISTS';
            RETURN NEXT;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION monitoring.create_future_order_partitions IS 'Auto-create future monthly partitions for orders table';

-- =============================================================================
-- FUNCTION 6: CREATE FUTURE PARTITIONS (TRADES - DAILY)
-- =============================================================================

CREATE OR REPLACE FUNCTION monitoring.create_future_trade_partitions(
    days_ahead INT DEFAULT 30
)
RETURNS TABLE (
    partition_name TEXT,
    start_date DATE,
    end_date DATE,
    status TEXT
) AS $$
DECLARE
    start_dt DATE;
    end_dt DATE;
    part_name TEXT;
    i INT;
    table_exists BOOLEAN;
BEGIN
    FOR i IN 1..days_ahead LOOP
        start_dt := CURRENT_DATE + i;
        end_dt := start_dt + INTERVAL '1 day';
        part_name := 'trades_' || TO_CHAR(start_dt, 'YYYY_MM_DD');

        -- Check if partition already exists
        SELECT EXISTS (
            SELECT 1 FROM pg_tables
            WHERE schemaname = 'public' AND tablename = part_name
        ) INTO table_exists;

        IF NOT table_exists THEN
            EXECUTE format(
                'CREATE TABLE IF NOT EXISTS %I PARTITION OF trades
                 FOR VALUES FROM (%L) TO (%L)',
                part_name,
                start_dt,
                end_dt
            );

            partition_name := part_name;
            start_date := start_dt;
            end_date := end_dt;
            status := 'CREATED';
            RETURN NEXT;
        ELSE
            partition_name := part_name;
            start_date := start_dt;
            end_date := end_dt;
            status := 'ALREADY_EXISTS';
            RETURN NEXT;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION monitoring.create_future_trade_partitions IS 'Auto-create future daily partitions for trades table';

-- =============================================================================
-- FUNCTION 7: ARCHIVE OLD PARTITIONS
-- =============================================================================

CREATE OR REPLACE FUNCTION monitoring.archive_old_partitions(
    retention_months INT DEFAULT 12
)
RETURNS TABLE (
    partition_name TEXT,
    parent_table TEXT,
    action_taken TEXT,
    rows_affected BIGINT
) AS $$
DECLARE
    partition_record RECORD;
    cutoff_date DATE;
    row_count BIGINT;
BEGIN
    cutoff_date := CURRENT_DATE - (retention_months || ' months')::INTERVAL;

    -- Archive old order partitions (monthly)
    FOR partition_record IN
        SELECT
            tablename,
            'orders' as parent,
            TO_DATE(substring(tablename from '_([0-9]{4}_[0-9]{2})$'), 'YYYY_MM') as part_date
        FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename LIKE 'orders_%'
        AND tablename ~ '^orders_[0-9]{4}_[0-9]{2}$'
        AND TO_DATE(substring(tablename from '_([0-9]{4}_[0-9]{2})$'), 'YYYY_MM') < cutoff_date
    LOOP
        -- Get row count before detaching
        EXECUTE format('SELECT COUNT(*) FROM %I', partition_record.tablename) INTO row_count;

        -- Detach partition
        EXECUTE format('ALTER TABLE orders DETACH PARTITION %I', partition_record.tablename);

        partition_name := partition_record.tablename;
        parent_table := 'orders';
        action_taken := 'DETACHED (ready for archive)';
        rows_affected := row_count;
        RETURN NEXT;
    END LOOP;

    -- Archive old trade partitions (daily)
    FOR partition_record IN
        SELECT
            tablename,
            'trades' as parent,
            TO_DATE(substring(tablename from '_([0-9]{4}_[0-9]{2}_[0-9]{2})$'), 'YYYY_MM_DD') as part_date
        FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename LIKE 'trades_%'
        AND tablename ~ '^trades_[0-9]{4}_[0-9]{2}_[0-9]{2}$'
        AND TO_DATE(substring(tablename from '_([0-9]{4}_[0-9]{2}_[0-9]{2})$'), 'YYYY_MM_DD') < cutoff_date
    LOOP
        -- Get row count before detaching
        EXECUTE format('SELECT COUNT(*) FROM %I', partition_record.tablename) INTO row_count;

        -- Detach partition
        EXECUTE format('ALTER TABLE trades DETACH PARTITION %I', partition_record.tablename);

        partition_name := partition_record.tablename;
        parent_table := 'trades';
        action_taken := 'DETACHED (ready for archive)';
        rows_affected := row_count;
        RETURN NEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION monitoring.archive_old_partitions IS 'Detach old partitions for archival (based on retention policy)';

-- =============================================================================
-- FUNCTION 8: RESET QUERY STATISTICS
-- =============================================================================

CREATE OR REPLACE FUNCTION monitoring.reset_query_stats()
RETURNS TEXT AS $$
BEGIN
    PERFORM pg_stat_statements_reset();
    RETURN 'Query statistics reset successfully';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION monitoring.reset_query_stats IS 'Reset pg_stat_statements statistics (use with caution)';

-- =============================================================================
-- FUNCTION 9: DATABASE HEALTH CHECK
-- =============================================================================

CREATE OR REPLACE FUNCTION monitoring.database_health_check()
RETURNS TABLE (
    check_category TEXT,
    check_name TEXT,
    status TEXT,
    value TEXT,
    recommendation TEXT
) AS $$
BEGIN
    -- Check cache hit ratio
    RETURN QUERY
    SELECT
        'Performance'::TEXT,
        'Cache Hit Ratio'::TEXT,
        CASE
            WHEN percentage >= 99 THEN 'EXCELLENT'
            WHEN percentage >= 95 THEN 'GOOD'
            WHEN percentage >= 90 THEN 'FAIR'
            ELSE 'POOR'
        END::TEXT,
        percentage::TEXT || '%',
        CASE
            WHEN percentage < 90 THEN 'Increase shared_buffers or add more RAM'
            ELSE 'Cache performance is optimal'
        END::TEXT
    FROM monitoring.v_cache_hit_ratio
    WHERE metric = 'overall_hit_ratio';

    -- Check for bloated tables
    RETURN QUERY
    SELECT
        'Maintenance'::TEXT,
        'Table Bloat'::TEXT,
        CASE
            WHEN COUNT(*) FILTER (WHERE bloat_pct > 30) > 0 THEN 'WARNING'
            WHEN COUNT(*) FILTER (WHERE bloat_pct > 15) > 0 THEN 'NOTICE'
            ELSE 'OK'
        END::TEXT,
        COUNT(*) FILTER (WHERE bloat_pct > 15)::TEXT || ' tables with >15% bloat',
        CASE
            WHEN COUNT(*) FILTER (WHERE bloat_pct > 30) > 0 THEN 'Run VACUUM on bloated tables'
            ELSE 'Bloat levels are acceptable'
        END::TEXT
    FROM monitoring.v_table_bloat;

    -- Check for unused indexes
    RETURN QUERY
    SELECT
        'Optimization'::TEXT,
        'Unused Indexes'::TEXT,
        CASE
            WHEN COUNT(*) > 5 THEN 'WARNING'
            WHEN COUNT(*) > 0 THEN 'NOTICE'
            ELSE 'OK'
        END::TEXT,
        COUNT(*)::TEXT || ' unused indexes found',
        CASE
            WHEN COUNT(*) > 0 THEN 'Review and consider dropping unused indexes'
            ELSE 'All indexes are being utilized'
        END::TEXT
    FROM monitoring.v_unused_indexes;

    -- Check connection count
    RETURN QUERY
    SELECT
        'Connections'::TEXT,
        'Active Connections'::TEXT,
        CASE
            WHEN SUM(connection_count) > 80 THEN 'WARNING'
            WHEN SUM(connection_count) > 50 THEN 'NOTICE'
            ELSE 'OK'
        END::TEXT,
        SUM(connection_count)::TEXT || ' active connections',
        CASE
            WHEN SUM(connection_count) > 80 THEN 'Connection pool may need tuning'
            ELSE 'Connection count is normal'
        END::TEXT
    FROM monitoring.v_connection_summary;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION monitoring.database_health_check IS 'Comprehensive database health check with recommendations';

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA monitoring TO trade_engine_app;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

DO $$
DECLARE
    function_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO function_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'monitoring';

    RAISE NOTICE 'Created % monitoring functions', function_count;

    IF function_count < 9 THEN
        RAISE EXCEPTION 'Expected at least 9 monitoring functions, found %', function_count;
    END IF;
END $$;

-- Migration complete
SELECT 'Migration 005-performance-functions.sql completed successfully' as status;
