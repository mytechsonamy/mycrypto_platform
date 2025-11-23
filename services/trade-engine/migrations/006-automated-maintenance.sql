-- Migration: 006-automated-maintenance.sql
-- Description: Configure automated maintenance (VACUUM, ANALYZE, partition management)
-- Author: Database Agent
-- Date: 2025-11-23
-- Dependencies: 005-performance-functions.sql

-- =============================================================================
-- PART 1: AUTOVACUUM TUNING
-- =============================================================================

-- Configure autovacuum for high-throughput tables (orders, trades)
-- These settings balance performance with maintenance overhead

-- Orders table: Medium frequency writes
ALTER TABLE orders SET (
    autovacuum_vacuum_scale_factor = 0.1,    -- Vacuum when 10% of rows are dead
    autovacuum_analyze_scale_factor = 0.05,  -- Analyze when 5% of rows change
    autovacuum_vacuum_cost_delay = 10,       -- Reduce I/O impact (10ms delay)
    autovacuum_vacuum_cost_limit = 1000      -- Higher I/O budget for larger tables
);

COMMENT ON TABLE orders IS 'Autovacuum: vacuum_scale_factor=0.1, analyze_scale_factor=0.05';

-- Trades table: High frequency writes
ALTER TABLE trades SET (
    autovacuum_vacuum_scale_factor = 0.05,   -- Vacuum when 5% of rows are dead
    autovacuum_analyze_scale_factor = 0.02,  -- Analyze when 2% of rows change
    autovacuum_vacuum_cost_delay = 5,        -- Lower delay for faster cleanup
    autovacuum_vacuum_cost_limit = 2000      -- Higher I/O budget for high-volume table
);

COMMENT ON TABLE trades IS 'Autovacuum: vacuum_scale_factor=0.05, analyze_scale_factor=0.02 (high frequency)';

-- Order book table: Very high frequency updates
ALTER TABLE order_book SET (
    autovacuum_vacuum_scale_factor = 0.02,   -- Vacuum when 2% of rows are dead
    autovacuum_analyze_scale_factor = 0.01,  -- Analyze when 1% of rows change
    autovacuum_vacuum_cost_delay = 2,        -- Minimal delay for real-time updates
    autovacuum_vacuum_cost_limit = 3000      -- Highest I/O budget
);

COMMENT ON TABLE order_book IS 'Autovacuum: vacuum_scale_factor=0.02, analyze_scale_factor=0.01 (very high frequency)';

-- Market data tables: Read-heavy, infrequent writes
ALTER TABLE market_data SET (
    autovacuum_vacuum_scale_factor = 0.2,    -- Vacuum when 20% of rows are dead
    autovacuum_analyze_scale_factor = 0.1,   -- Analyze when 10% of rows change
    autovacuum_vacuum_cost_delay = 20        -- Higher delay for lower priority
);

ALTER TABLE candles SET (
    autovacuum_vacuum_scale_factor = 0.2,
    autovacuum_analyze_scale_factor = 0.1,
    autovacuum_vacuum_cost_delay = 20
);

-- =============================================================================
-- PART 2: MANUAL VACUUM/ANALYZE FUNCTION (FOR SCHEDULED MAINTENANCE)
-- =============================================================================

CREATE OR REPLACE FUNCTION monitoring.run_maintenance_vacuum()
RETURNS TABLE (
    table_name TEXT,
    action TEXT,
    duration_seconds NUMERIC,
    status TEXT
) AS $$
DECLARE
    tbl RECORD;
    start_time TIMESTAMP;
    end_time TIMESTAMP;
BEGIN
    -- Vacuum analyze all user tables
    FOR tbl IN
        SELECT schemaname, tablename
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
        ORDER BY n_dead_tup DESC
    LOOP
        start_time := clock_timestamp();

        BEGIN
            EXECUTE format('VACUUM ANALYZE %I.%I', tbl.schemaname, tbl.tablename);
            end_time := clock_timestamp();

            table_name := tbl.tablename;
            action := 'VACUUM ANALYZE';
            duration_seconds := EXTRACT(EPOCH FROM (end_time - start_time));
            status := 'SUCCESS';
            RETURN NEXT;

        EXCEPTION WHEN OTHERS THEN
            table_name := tbl.tablename;
            action := 'VACUUM ANALYZE';
            duration_seconds := 0;
            status := 'FAILED: ' || SQLERRM;
            RETURN NEXT;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION monitoring.run_maintenance_vacuum IS 'Run VACUUM ANALYZE on all tables (for scheduled maintenance window)';

-- =============================================================================
-- PART 3: STATISTICS UPDATE FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION monitoring.update_table_statistics()
RETURNS TABLE (
    table_name TEXT,
    status TEXT,
    duration_seconds NUMERIC
) AS $$
DECLARE
    tbl RECORD;
    start_time TIMESTAMP;
    end_time TIMESTAMP;
BEGIN
    -- Run ANALYZE on all tables to update statistics
    FOR tbl IN
        SELECT schemaname, tablename
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
        ORDER BY n_live_tup DESC  -- Prioritize larger tables
    LOOP
        start_time := clock_timestamp();

        BEGIN
            EXECUTE format('ANALYZE %I.%I', tbl.schemaname, tbl.tablename);
            end_time := clock_timestamp();

            table_name := tbl.tablename;
            status := 'SUCCESS';
            duration_seconds := EXTRACT(EPOCH FROM (end_time - start_time));
            RETURN NEXT;

        EXCEPTION WHEN OTHERS THEN
            table_name := tbl.tablename;
            status := 'FAILED: ' || SQLERRM;
            duration_seconds := 0;
            RETURN NEXT;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION monitoring.update_table_statistics IS 'Update table statistics (planner statistics) for all tables';

-- =============================================================================
-- PART 4: PARTITION MAINTENANCE SCHEDULER FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION monitoring.partition_maintenance()
RETURNS TABLE (
    operation TEXT,
    partition_count INTEGER,
    status TEXT
) AS $$
DECLARE
    orders_created INTEGER;
    trades_created INTEGER;
BEGIN
    -- Create future partitions for orders (3 months ahead)
    SELECT COUNT(*) INTO orders_created
    FROM monitoring.create_future_order_partitions(3)
    WHERE status = 'CREATED';

    operation := 'CREATE_ORDER_PARTITIONS';
    partition_count := orders_created;
    status := orders_created || ' partitions created';
    RETURN NEXT;

    -- Create future partitions for trades (30 days ahead)
    SELECT COUNT(*) INTO trades_created
    FROM monitoring.create_future_trade_partitions(30)
    WHERE status = 'CREATED';

    operation := 'CREATE_TRADE_PARTITIONS';
    partition_count := trades_created;
    status := trades_created || ' partitions created';
    RETURN NEXT;

    -- Archive old partitions (older than 12 months)
    -- NOTE: This only detaches, doesn't drop. Manual review recommended.
    -- Uncomment the following block to enable automated archiving:
    /*
    SELECT COUNT(*) INTO archived_count
    FROM monitoring.archive_old_partitions(12);

    operation := 'ARCHIVE_PARTITIONS';
    partition_count := archived_count;
    status := archived_count || ' partitions archived';
    RETURN NEXT;
    */

    -- For safety, just log what would be archived
    operation := 'ARCHIVE_CHECK';
    SELECT COUNT(*) INTO partition_count
    FROM monitoring.analyze_partition_usage()
    WHERE retention_action LIKE 'ARCHIVE_CANDIDATE%';
    status := partition_count || ' partitions eligible for archive';
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION monitoring.partition_maintenance IS 'Automated partition creation and archive detection (run daily)';

-- =============================================================================
-- PART 5: INDEX MAINTENANCE FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION monitoring.rebuild_bloated_indexes(
    bloat_threshold_pct NUMERIC DEFAULT 50.0
)
RETURNS TABLE (
    index_name TEXT,
    table_name TEXT,
    action TEXT,
    status TEXT
) AS $$
DECLARE
    idx RECORD;
BEGIN
    -- Note: This is a placeholder for index bloat detection
    -- Full implementation would require pg_stat_user_indexes analysis
    -- For now, we'll just return a report of index sizes

    FOR idx IN
        SELECT
            indexrelname,
            tablename,
            pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
            idx_scan
        FROM pg_stat_user_indexes
        WHERE schemaname = 'public'
        ORDER BY pg_relation_size(indexrelid) DESC
        LIMIT 10
    LOOP
        index_name := idx.indexrelname;
        table_name := idx.tablename;
        action := 'ANALYZE';
        status := 'Index size: ' || idx.index_size || ', Scans: ' || idx.idx_scan;
        RETURN NEXT;
    END LOOP;

    -- Note: Actual REINDEX should be done during maintenance windows
    -- with REINDEX INDEX CONCURRENTLY (PostgreSQL 12+)
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION monitoring.rebuild_bloated_indexes IS 'Identify bloated indexes (manual REINDEX recommended during maintenance)';

-- =============================================================================
-- PART 6: SCHEDULED MAINTENANCE CONFIGURATION TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS monitoring.maintenance_schedule (
    id SERIAL PRIMARY KEY,
    job_name VARCHAR(100) UNIQUE NOT NULL,
    job_type VARCHAR(50) NOT NULL,  -- 'VACUUM', 'ANALYZE', 'PARTITION', 'STATS'
    schedule VARCHAR(50) NOT NULL,   -- Cron format: '0 2 * * *' = daily at 2am
    enabled BOOLEAN DEFAULT TRUE,
    last_run TIMESTAMP,
    last_status TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE monitoring.maintenance_schedule IS 'Scheduled maintenance job configuration';

-- Insert default maintenance jobs
INSERT INTO monitoring.maintenance_schedule (job_name, job_type, schedule, enabled) VALUES
    ('daily_partition_creation', 'PARTITION', '0 1 * * *', TRUE),      -- Daily at 1 AM
    ('daily_statistics_update', 'ANALYZE', '0 2 * * *', TRUE),         -- Daily at 2 AM
    ('weekly_vacuum', 'VACUUM', '0 3 * * 0', TRUE),                   -- Weekly Sunday at 3 AM
    ('hourly_query_stats', 'STATS', '0 * * * *', TRUE)                -- Every hour
ON CONFLICT (job_name) DO NOTHING;

-- =============================================================================
-- PART 7: MAINTENANCE EXECUTION LOG TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS monitoring.maintenance_log (
    id BIGSERIAL PRIMARY KEY,
    job_name VARCHAR(100) NOT NULL,
    started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP,
    duration_seconds NUMERIC,
    status VARCHAR(50),  -- 'SUCCESS', 'FAILED', 'PARTIAL'
    details JSONB,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_maintenance_log_job_started ON monitoring.maintenance_log(job_name, started_at DESC);
CREATE INDEX idx_maintenance_log_status ON monitoring.maintenance_log(status, started_at DESC);

COMMENT ON TABLE monitoring.maintenance_log IS 'Log of all maintenance job executions';

-- =============================================================================
-- PART 8: MAINTENANCE RUNNER FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION monitoring.run_scheduled_maintenance(
    p_job_name VARCHAR(100)
)
RETURNS JSONB AS $$
DECLARE
    v_job RECORD;
    v_log_id BIGINT;
    v_start_time TIMESTAMP;
    v_end_time TIMESTAMP;
    v_result JSONB;
    v_status TEXT;
    v_error TEXT;
BEGIN
    -- Get job configuration
    SELECT * INTO v_job
    FROM monitoring.maintenance_schedule
    WHERE job_name = p_job_name AND enabled = TRUE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'status', 'SKIPPED',
            'message', 'Job not found or disabled'
        );
    END IF;

    -- Create log entry
    INSERT INTO monitoring.maintenance_log (job_name, started_at, status)
    VALUES (p_job_name, NOW(), 'RUNNING')
    RETURNING id INTO v_log_id;

    v_start_time := clock_timestamp();

    BEGIN
        -- Execute job based on type
        CASE v_job.job_type
            WHEN 'PARTITION' THEN
                SELECT jsonb_agg(row_to_json(pm.*)) INTO v_result
                FROM monitoring.partition_maintenance() pm;
                v_status := 'SUCCESS';

            WHEN 'ANALYZE' THEN
                SELECT jsonb_agg(row_to_json(uts.*)) INTO v_result
                FROM monitoring.update_table_statistics() uts;
                v_status := 'SUCCESS';

            WHEN 'VACUUM' THEN
                SELECT jsonb_agg(row_to_json(rmv.*)) INTO v_result
                FROM monitoring.run_maintenance_vacuum() rmv;
                v_status := 'SUCCESS';

            WHEN 'STATS' THEN
                v_result := jsonb_build_object(
                    'cache_hit_ratio', (SELECT jsonb_agg(row_to_json(vchr.*)) FROM monitoring.v_cache_hit_ratio vchr),
                    'table_bloat', (SELECT COUNT(*) FROM monitoring.v_table_bloat)
                );
                v_status := 'SUCCESS';

            ELSE
                v_status := 'FAILED';
                v_error := 'Unknown job type: ' || v_job.job_type;
        END CASE;

        v_end_time := clock_timestamp();

        -- Update log entry
        UPDATE monitoring.maintenance_log
        SET
            completed_at = v_end_time,
            duration_seconds = EXTRACT(EPOCH FROM (v_end_time - v_start_time)),
            status = v_status,
            details = v_result
        WHERE id = v_log_id;

        -- Update schedule
        UPDATE monitoring.maintenance_schedule
        SET
            last_run = v_end_time,
            last_status = v_status,
            updated_at = v_end_time
        WHERE job_name = p_job_name;

        RETURN jsonb_build_object(
            'status', v_status,
            'duration_seconds', EXTRACT(EPOCH FROM (v_end_time - v_start_time)),
            'details', v_result
        );

    EXCEPTION WHEN OTHERS THEN
        v_end_time := clock_timestamp();
        v_error := SQLERRM;

        UPDATE monitoring.maintenance_log
        SET
            completed_at = v_end_time,
            duration_seconds = EXTRACT(EPOCH FROM (v_end_time - v_start_time)),
            status = 'FAILED',
            error_message = v_error
        WHERE id = v_log_id;

        RETURN jsonb_build_object(
            'status', 'FAILED',
            'error', v_error
        );
    END;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION monitoring.run_scheduled_maintenance IS 'Execute a scheduled maintenance job and log results';

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

GRANT SELECT, INSERT, UPDATE ON monitoring.maintenance_schedule TO trade_engine_app;
GRANT SELECT, INSERT ON monitoring.maintenance_log TO trade_engine_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA monitoring TO trade_engine_app;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- Verify autovacuum settings
SELECT
    c.relname as tablename,
    c.reloptions
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
  AND c.relname IN ('orders', 'trades', 'order_book')
ORDER BY c.relname;

-- Verify maintenance schedule
SELECT * FROM monitoring.maintenance_schedule ORDER BY job_name;

-- Migration complete
SELECT 'Migration 006-automated-maintenance.sql completed successfully' as status;
