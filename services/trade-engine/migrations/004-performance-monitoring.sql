-- Migration: 004-performance-monitoring.sql
-- Description: Enable pg_stat_statements and create performance monitoring infrastructure
-- Author: Database Agent
-- Date: 2025-11-23
-- Dependencies: 001-enums.sql, 002-core-tables.sql

-- =============================================================================
-- PART 1: ENABLE EXTENSIONS
-- =============================================================================

-- Enable pg_stat_statements for query performance monitoring
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Enable pg_trgm for text search optimization (if needed in future)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Enable btree_gist for advanced index types (if needed for exclusion constraints)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- =============================================================================
-- PART 2: CREATE MONITORING SCHEMA
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS monitoring;
COMMENT ON SCHEMA monitoring IS 'Performance monitoring views and utilities';

-- =============================================================================
-- PART 3: QUERY PERFORMANCE MONITORING VIEWS
-- =============================================================================

-- View: Slow queries (queries with mean execution time > 100ms)
CREATE OR REPLACE VIEW monitoring.v_slow_queries AS
SELECT
    substring(query, 1, 100) as query_snippet,
    calls,
    ROUND(total_exec_time::numeric, 2) as total_exec_time_ms,
    ROUND(mean_exec_time::numeric, 2) as mean_exec_time_ms,
    ROUND(min_exec_time::numeric, 2) as min_exec_time_ms,
    ROUND(max_exec_time::numeric, 2) as max_exec_time_ms,
    ROUND(stddev_exec_time::numeric, 2) as stddev_exec_time_ms,
    rows,
    ROUND((100.0 * shared_blks_hit / NULLIF(shared_blks_hit + shared_blks_read, 0))::numeric, 2) as cache_hit_ratio
FROM pg_stat_statements
WHERE mean_exec_time > 100  -- Queries taking more than 100ms on average
ORDER BY mean_exec_time DESC
LIMIT 50;

COMMENT ON VIEW monitoring.v_slow_queries IS 'Queries with mean execution time > 100ms';

-- View: Top queries by total execution time
CREATE OR REPLACE VIEW monitoring.v_top_queries_by_time AS
SELECT
    substring(query, 1, 100) as query_snippet,
    calls,
    ROUND(total_exec_time::numeric, 2) as total_exec_time_ms,
    ROUND(mean_exec_time::numeric, 2) as mean_exec_time_ms,
    ROUND((100.0 * total_exec_time / SUM(total_exec_time) OVER ())::numeric, 2) as pct_total_time,
    rows,
    ROUND((rows::numeric / NULLIF(calls, 0))::numeric, 2) as rows_per_call
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 50;

COMMENT ON VIEW monitoring.v_top_queries_by_time IS 'Top 50 queries by total execution time';

-- =============================================================================
-- PART 4: TABLE STATISTICS VIEWS
-- =============================================================================

-- View: Table sizes and growth
CREATE OR REPLACE VIEW monitoring.v_table_stats AS
SELECT
    pst.schemaname,
    pst.relname as tablename,
    pg_size_pretty(pg_total_relation_size(pst.relid)) as total_size,
    pg_size_pretty(pg_relation_size(pst.relid)) as table_size,
    pg_size_pretty(pg_total_relation_size(pst.relid) - pg_relation_size(pst.relid)) as indexes_size,
    pst.n_live_tup,
    pst.n_dead_tup,
    ROUND(100.0 * pst.n_dead_tup / NULLIF(pst.n_live_tup + pst.n_dead_tup, 0), 2) as bloat_pct,
    pst.last_vacuum,
    pst.last_autovacuum,
    pst.last_analyze,
    pst.last_autoanalyze,
    pst.seq_scan,
    pst.idx_scan,
    ROUND(100.0 * pst.idx_scan / NULLIF(pst.seq_scan + pst.idx_scan, 0), 2) as index_usage_pct
FROM pg_stat_user_tables pst
ORDER BY pg_total_relation_size(pst.relid) DESC;

COMMENT ON VIEW monitoring.v_table_stats IS 'Comprehensive table statistics including size, bloat, and vacuum status';

-- View: Table bloat (dead tuples percentage)
CREATE OR REPLACE VIEW monitoring.v_table_bloat AS
SELECT
    pst.schemaname,
    pst.relname as tablename,
    pg_size_pretty(pg_total_relation_size(pst.relid)) as size,
    pst.n_live_tup,
    pst.n_dead_tup,
    ROUND(100.0 * pst.n_dead_tup / NULLIF(pst.n_live_tup + pst.n_dead_tup, 0), 2) as bloat_pct,
    pst.last_vacuum,
    pst.last_autovacuum
FROM pg_stat_user_tables pst
WHERE pst.n_live_tup > 0
  AND pst.n_dead_tup > 0
  AND (100.0 * pst.n_dead_tup / NULLIF(pst.n_live_tup + pst.n_dead_tup, 0)) > 10  -- More than 10% bloat
ORDER BY pst.n_dead_tup DESC;

COMMENT ON VIEW monitoring.v_table_bloat IS 'Tables with >10% dead tuples (bloat)';

-- =============================================================================
-- PART 5: INDEX USAGE AND EFFICIENCY VIEWS
-- =============================================================================

-- View: Index usage statistics
CREATE OR REPLACE VIEW monitoring.v_index_usage AS
SELECT
    psi.schemaname,
    psi.relname as tablename,
    psi.indexrelname as indexname,
    psi.idx_scan,
    psi.idx_tup_read,
    psi.idx_tup_fetch,
    pg_size_pretty(pg_relation_size(psi.indexrelid)) as index_size,
    CASE
        WHEN psi.idx_scan = 0 THEN 'UNUSED'
        WHEN psi.idx_scan < 100 THEN 'LOW_USAGE'
        ELSE 'ACTIVE'
    END as usage_category
FROM pg_stat_user_indexes psi
ORDER BY psi.idx_scan ASC, pg_relation_size(psi.indexrelid) DESC;

COMMENT ON VIEW monitoring.v_index_usage IS 'Index usage statistics with categorization';

-- View: Unused indexes (potential candidates for removal)
CREATE OR REPLACE VIEW monitoring.v_unused_indexes AS
SELECT
    psi.schemaname,
    psi.relname as tablename,
    psi.indexrelname as indexname,
    pg_size_pretty(pg_relation_size(psi.indexrelid)) as index_size,
    psi.idx_scan,
    psi.idx_tup_read,
    psi.idx_tup_fetch
FROM pg_stat_user_indexes psi
WHERE psi.idx_scan = 0
  AND psi.indexrelname NOT LIKE '%pkey'  -- Don't suggest removing primary keys
ORDER BY pg_relation_size(psi.indexrelid) DESC;

COMMENT ON VIEW monitoring.v_unused_indexes IS 'Indexes that have never been scanned (candidates for removal)';

-- View: Index cache hit ratio
CREATE OR REPLACE VIEW monitoring.v_index_cache_hit_ratio AS
SELECT
    psi.schemaname,
    psi.relname as tablename,
    psi.indexrelname as indexname,
    psi.idx_blks_hit,
    psi.idx_blks_read,
    CASE
        WHEN (psi.idx_blks_hit + psi.idx_blks_read) = 0 THEN NULL
        ELSE ROUND(100.0 * psi.idx_blks_hit / NULLIF(psi.idx_blks_hit + psi.idx_blks_read, 0), 2)
    END as cache_hit_ratio
FROM pg_statio_user_indexes psi
WHERE (psi.idx_blks_hit + psi.idx_blks_read) > 0
ORDER BY cache_hit_ratio ASC NULLS LAST;

COMMENT ON VIEW monitoring.v_index_cache_hit_ratio IS 'Index cache hit ratios (low ratios may indicate need for more RAM)';

-- =============================================================================
-- PART 6: CONNECTION AND ACTIVITY MONITORING
-- =============================================================================

-- View: Active connections and wait events
CREATE OR REPLACE VIEW monitoring.v_connection_stats AS
SELECT
    datname as database,
    usename as username,
    application_name,
    client_addr,
    state,
    wait_event_type,
    wait_event,
    backend_start,
    state_change,
    query_start,
    EXTRACT(EPOCH FROM (NOW() - query_start)) as query_duration_seconds,
    substring(query, 1, 100) as query_snippet
FROM pg_stat_activity
WHERE datname = current_database()
  AND pid != pg_backend_pid()  -- Exclude this query itself
ORDER BY query_start ASC NULLS LAST;

COMMENT ON VIEW monitoring.v_connection_stats IS 'Active database connections with wait events and query duration';

-- View: Database connection summary
CREATE OR REPLACE VIEW monitoring.v_connection_summary AS
SELECT
    state,
    COUNT(*) as connection_count,
    COUNT(*) FILTER (WHERE wait_event_type IS NOT NULL) as waiting_count,
    MAX(EXTRACT(EPOCH FROM (NOW() - query_start))) as max_query_duration_seconds
FROM pg_stat_activity
WHERE datname = current_database()
  AND pid != pg_backend_pid()
GROUP BY state
ORDER BY connection_count DESC;

COMMENT ON VIEW monitoring.v_connection_summary IS 'Connection count by state with waiting and duration summary';

-- =============================================================================
-- PART 7: PARTITION HEALTH MONITORING
-- =============================================================================

-- View: Partition health and size
CREATE OR REPLACE VIEW monitoring.v_partition_health AS
SELECT
    pst.schemaname,
    pst.relname as tablename,
    pg_size_pretty(pg_total_relation_size(pst.relid)) as total_size,
    pg_size_pretty(pg_relation_size(pst.relid)) as table_size,
    pst.n_live_tup as row_count,
    CASE
        WHEN pst.relname LIKE 'orders_%' THEN 'orders'
        WHEN pst.relname LIKE 'trades_%' THEN 'trades'
        ELSE 'unknown'
    END as parent_table,
    CASE
        WHEN pst.relname ~ '_(2[0-9]{3})_([0-9]{2})(_([0-9]{2}))?$' THEN
            CASE
                WHEN pst.relname ~ '_[0-9]{4}_[0-9]{2}_[0-9]{2}$' THEN
                    TO_DATE(substring(pst.relname from '_([0-9]{4}_[0-9]{2}_[0-9]{2})$'), 'YYYY_MM_DD')
                ELSE
                    TO_DATE(substring(pst.relname from '_([0-9]{4}_[0-9]{2})$'), 'YYYY_MM')
            END
        ELSE NULL
    END as partition_date,
    pst.last_vacuum,
    pst.last_autovacuum,
    pst.last_analyze,
    pst.last_autoanalyze
FROM pg_stat_user_tables pst
WHERE pst.relname LIKE 'orders_%' OR pst.relname LIKE 'trades_%'
ORDER BY partition_date DESC NULLS LAST;

COMMENT ON VIEW monitoring.v_partition_health IS 'Health and size metrics for partitioned tables';

-- View: Partition growth trends (rows per partition)
CREATE OR REPLACE VIEW monitoring.v_partition_growth AS
WITH partition_sizes AS (
    SELECT
        parent_table,
        row_count,
        schemaname,
        tablename
    FROM monitoring.v_partition_health
    WHERE row_count > 0
)
SELECT
    ps.parent_table,
    COUNT(*) as partition_count,
    SUM(ps.row_count) as total_rows,
    ROUND(AVG(ps.row_count)) as avg_rows_per_partition,
    MAX(ps.row_count) as max_rows_per_partition,
    MIN(ps.row_count) as min_rows_per_partition,
    pg_size_pretty(SUM(pg_total_relation_size((ps.schemaname||'.'||ps.tablename)::regclass))) as total_size
FROM partition_sizes ps
GROUP BY ps.parent_table;

COMMENT ON VIEW monitoring.v_partition_growth IS 'Partition growth trends and distribution';

-- =============================================================================
-- PART 8: CACHE HIT RATIO MONITORING
-- =============================================================================

-- View: Overall cache hit ratio (should be >99% for optimal performance)
CREATE OR REPLACE VIEW monitoring.v_cache_hit_ratio AS
SELECT
    'table_hit_ratio' as metric,
    ROUND(100.0 * SUM(heap_blks_hit) / NULLIF(SUM(heap_blks_hit + heap_blks_read), 0), 2) as percentage
FROM pg_statio_user_tables
UNION ALL
SELECT
    'index_hit_ratio' as metric,
    ROUND(100.0 * SUM(idx_blks_hit) / NULLIF(SUM(idx_blks_hit + idx_blks_read), 0), 2) as percentage
FROM pg_statio_user_indexes
UNION ALL
SELECT
    'overall_hit_ratio' as metric,
    ROUND(100.0 * SUM(blks_hit) / NULLIF(SUM(blks_hit + blks_read), 0), 2) as percentage
FROM pg_stat_database
WHERE datname = current_database();

COMMENT ON VIEW monitoring.v_cache_hit_ratio IS 'Cache hit ratios (should be >99% for optimal performance)';

-- =============================================================================
-- PART 9: LOCKS AND BLOCKING QUERIES
-- =============================================================================

-- View: Blocking queries and lock contention
CREATE OR REPLACE VIEW monitoring.v_blocking_queries AS
SELECT
    blocked_locks.pid AS blocked_pid,
    blocked_activity.usename AS blocked_user,
    blocking_locks.pid AS blocking_pid,
    blocking_activity.usename AS blocking_user,
    blocked_activity.query AS blocked_statement,
    blocking_activity.query AS blocking_statement,
    blocked_activity.application_name AS blocked_application,
    blocking_activity.application_name AS blocking_application
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks
    ON blocking_locks.locktype = blocked_locks.locktype
    AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
    AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
    AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
    AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
    AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
    AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
    AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
    AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
    AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
    AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;

COMMENT ON VIEW monitoring.v_blocking_queries IS 'Queries that are blocking other queries (lock contention)';

-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- Test that all views are accessible
DO $$
DECLARE
    view_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO view_count
    FROM information_schema.views
    WHERE table_schema = 'monitoring';

    RAISE NOTICE 'Created % monitoring views', view_count;

    IF view_count < 10 THEN
        RAISE EXCEPTION 'Expected at least 10 monitoring views, found %', view_count;
    END IF;
END $$;

-- Grant permissions to application users
GRANT USAGE ON SCHEMA monitoring TO trade_engine_app;
GRANT SELECT ON ALL TABLES IN SCHEMA monitoring TO trade_engine_app;

-- Migration complete
SELECT 'Migration 004-performance-monitoring.sql completed successfully' as status;
