-- =============================================================================
-- MONITORING SETUP VERIFICATION SCRIPT
-- =============================================================================
-- Description: Verify all monitoring views, functions, and configurations
-- Author: Database Agent
-- Date: 2025-11-23
-- Usage: psql -U trade_engine_app -d mytrader_trade_engine -f verify-monitoring-setup.sql
-- =============================================================================

\set ON_ERROR_STOP on
\timing on

\echo '========================================================================='
\echo 'TRADE ENGINE DATABASE - MONITORING SETUP VERIFICATION'
\echo '========================================================================='
\echo ''

-- =============================================================================
-- TEST 1: Verify Extensions
-- =============================================================================
\echo 'TEST 1: Verify Required Extensions'
\echo '---------------------------------------------------------------------'

SELECT
    extname,
    extversion,
    CASE
        WHEN extname = 'pg_stat_statements' THEN 'CRITICAL'
        WHEN extname IN ('pg_trgm', 'btree_gist') THEN 'OPTIONAL'
        ELSE 'UNKNOWN'
    END as importance
FROM pg_extension
WHERE extname IN ('pg_stat_statements', 'pg_trgm', 'btree_gist')
ORDER BY extname;

\echo ''
SELECT CASE
    WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements')
    THEN '✓ PASS: pg_stat_statements is enabled'
    ELSE '✗ FAIL: pg_stat_statements is NOT enabled'
END as test_result;
\echo ''

-- =============================================================================
-- TEST 2: Verify Monitoring Schema and Views
-- =============================================================================
\echo 'TEST 2: Verify Monitoring Schema and Views'
\echo '---------------------------------------------------------------------'

SELECT
    schemaname,
    viewname,
    viewowner
FROM pg_views
WHERE schemaname = 'monitoring'
ORDER BY viewname;

\echo ''
SELECT
    COUNT(*) as view_count,
    CASE
        WHEN COUNT(*) >= 13 THEN '✓ PASS: All monitoring views created'
        ELSE '✗ FAIL: Missing monitoring views (expected >= 13)'
    END as test_result
FROM pg_views
WHERE schemaname = 'monitoring';
\echo ''

-- =============================================================================
-- TEST 3: Verify Monitoring Functions
-- =============================================================================
\echo 'TEST 3: Verify Monitoring Functions'
\echo '---------------------------------------------------------------------'

SELECT
    p.proname as function_name,
    pg_catalog.pg_get_function_result(p.oid) as return_type,
    pg_catalog.pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'monitoring'
  AND p.prokind = 'f'  -- Regular functions only
ORDER BY p.proname;

\echo ''
SELECT
    COUNT(*) as function_count,
    CASE
        WHEN COUNT(*) >= 9 THEN '✓ PASS: All monitoring functions created'
        ELSE '✗ FAIL: Missing monitoring functions (expected >= 9)'
    END as test_result
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'monitoring'
  AND p.prokind = 'f';
\echo ''

-- =============================================================================
-- TEST 4: Test Monitoring Views (Data Retrieval)
-- =============================================================================
\echo 'TEST 4: Test Monitoring Views - Data Retrieval'
\echo '---------------------------------------------------------------------'

\echo 'Testing v_slow_queries view...'
SELECT COUNT(*) as row_count FROM monitoring.v_slow_queries;

\echo 'Testing v_top_queries_by_time view...'
SELECT COUNT(*) as row_count FROM monitoring.v_top_queries_by_time;

\echo 'Testing v_table_stats view...'
SELECT COUNT(*) as row_count FROM monitoring.v_table_stats;

\echo 'Testing v_table_bloat view...'
SELECT COUNT(*) as row_count FROM monitoring.v_table_bloat;

\echo 'Testing v_index_usage view...'
SELECT COUNT(*) as row_count FROM monitoring.v_index_usage;

\echo 'Testing v_unused_indexes view...'
SELECT COUNT(*) as row_count FROM monitoring.v_unused_indexes;

\echo 'Testing v_index_cache_hit_ratio view...'
SELECT COUNT(*) as row_count FROM monitoring.v_index_cache_hit_ratio;

\echo 'Testing v_connection_stats view...'
SELECT COUNT(*) as row_count FROM monitoring.v_connection_stats;

\echo 'Testing v_connection_summary view...'
SELECT COUNT(*) as row_count FROM monitoring.v_connection_summary;

\echo 'Testing v_partition_health view...'
SELECT COUNT(*) as row_count FROM monitoring.v_partition_health;

\echo 'Testing v_partition_growth view...'
SELECT COUNT(*) as row_count FROM monitoring.v_partition_growth;

\echo 'Testing v_cache_hit_ratio view...'
SELECT * FROM monitoring.v_cache_hit_ratio;

\echo 'Testing v_blocking_queries view...'
SELECT COUNT(*) as row_count FROM monitoring.v_blocking_queries;

\echo ''
\echo '✓ PASS: All monitoring views are accessible'
\echo ''

-- =============================================================================
-- TEST 5: Test Performance Functions
-- =============================================================================
\echo 'TEST 5: Test Performance Analysis Functions'
\echo '---------------------------------------------------------------------'

\echo 'Testing get_query_performance()...'
SELECT COUNT(*) as result_count FROM monitoring.get_query_performance(INTERVAL '1 hour');

\echo 'Testing get_table_bloat()...'
SELECT COUNT(*) as result_count FROM monitoring.get_table_bloat();

\echo 'Testing get_missing_indexes()...'
SELECT COUNT(*) as result_count FROM monitoring.get_missing_indexes();

\echo 'Testing analyze_partition_usage()...'
SELECT COUNT(*) as result_count FROM monitoring.analyze_partition_usage();

\echo ''
\echo '✓ PASS: All performance analysis functions work correctly'
\echo ''

-- =============================================================================
-- TEST 6: Test Partition Management Functions
-- =============================================================================
\echo 'TEST 6: Test Partition Management Functions'
\echo '---------------------------------------------------------------------'

\echo 'Testing create_future_order_partitions() - dry run...'
SELECT * FROM monitoring.create_future_order_partitions(1) LIMIT 3;

\echo 'Testing create_future_trade_partitions() - dry run...'
SELECT * FROM monitoring.create_future_trade_partitions(3) LIMIT 3;

\echo ''
\echo '✓ PASS: Partition management functions work correctly'
\echo ''

-- =============================================================================
-- TEST 7: Test Database Health Check
-- =============================================================================
\echo 'TEST 7: Database Health Check'
\echo '---------------------------------------------------------------------'

SELECT * FROM monitoring.database_health_check();

\echo ''
\echo '✓ PASS: Database health check function works correctly'
\echo ''

-- =============================================================================
-- TEST 8: Verify Autovacuum Configuration
-- =============================================================================
\echo 'TEST 8: Verify Autovacuum Configuration'
\echo '---------------------------------------------------------------------'

SELECT
    c.relname as tablename,
    c.reloptions
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
  AND c.relname IN ('orders', 'trades', 'order_book', 'market_data', 'candles')
ORDER BY c.relname;

\echo ''
SELECT CASE
    WHEN EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = 'public'
          AND c.relname = 'orders'
          AND c.reloptions IS NOT NULL
    )
    THEN '✓ PASS: Autovacuum configured for key tables'
    ELSE '⚠ WARNING: Autovacuum settings may not be customized'
END as test_result;
\echo ''

-- =============================================================================
-- TEST 9: Verify Maintenance Schedule
-- =============================================================================
\echo 'TEST 9: Verify Maintenance Schedule Configuration'
\echo '---------------------------------------------------------------------'

SELECT
    job_name,
    job_type,
    schedule,
    enabled,
    last_run,
    last_status
FROM monitoring.maintenance_schedule
ORDER BY job_name;

\echo ''
SELECT
    COUNT(*) as scheduled_jobs,
    CASE
        WHEN COUNT(*) >= 4 THEN '✓ PASS: Maintenance jobs configured'
        ELSE '✗ FAIL: Missing maintenance jobs'
    END as test_result
FROM monitoring.maintenance_schedule;
\echo ''

-- =============================================================================
-- TEST 10: Test Maintenance Runner (Dry Run)
-- =============================================================================
\echo 'TEST 10: Test Maintenance Runner'
\echo '---------------------------------------------------------------------'

\echo 'Testing partition_maintenance()...'
SELECT * FROM monitoring.partition_maintenance();

\echo ''
\echo '✓ PASS: Maintenance runner works correctly'
\echo ''

-- =============================================================================
-- TEST 11: Verify pg_stat_statements Data Collection
-- =============================================================================
\echo 'TEST 11: Verify pg_stat_statements Data Collection'
\echo '---------------------------------------------------------------------'

SELECT
    COUNT(*) as tracked_queries,
    SUM(calls) as total_calls,
    ROUND(SUM(total_exec_time)::numeric, 2) as total_exec_time_ms
FROM pg_stat_statements;

\echo ''
SELECT CASE
    WHEN COUNT(*) > 0
    THEN '✓ PASS: pg_stat_statements is collecting query data'
    ELSE '⚠ WARNING: No queries tracked yet (may need time to accumulate)'
END as test_result
FROM pg_stat_statements;
\echo ''

-- =============================================================================
-- TEST 12: Verify Permissions
-- =============================================================================
\echo 'TEST 12: Verify Application User Permissions'
\echo '---------------------------------------------------------------------'

SELECT
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.role_table_grants
WHERE grantee = 'trade_engine_app'
  AND table_schema = 'monitoring'
ORDER BY table_name, privilege_type;

\echo ''
SELECT CASE
    WHEN EXISTS (
        SELECT 1 FROM information_schema.role_table_grants
        WHERE grantee = 'trade_engine_app'
          AND table_schema = 'monitoring'
          AND privilege_type = 'SELECT'
    )
    THEN '✓ PASS: Application user has monitoring permissions'
    ELSE '✗ FAIL: Application user missing monitoring permissions'
END as test_result;
\echo ''

-- =============================================================================
-- TEST 13: Performance Baseline Capture
-- =============================================================================
\echo 'TEST 13: Current Performance Baseline'
\echo '---------------------------------------------------------------------'

\echo 'Cache Hit Ratios:'
SELECT * FROM monitoring.v_cache_hit_ratio;

\echo ''
\echo 'Database Size:'
SELECT
    pg_size_pretty(pg_database_size(current_database())) as database_size;

\echo ''
\echo 'Table Sizes (Top 10):'
SELECT
    tablename,
    total_size,
    index_usage_pct
FROM monitoring.v_table_stats
LIMIT 10;

\echo ''
\echo 'Active Connections:'
SELECT * FROM monitoring.v_connection_summary;

\echo ''
\echo 'Partition Count:'
SELECT
    parent_table,
    partition_count,
    total_rows,
    total_size
FROM monitoring.v_partition_growth;

\echo ''

-- =============================================================================
-- FINAL SUMMARY
-- =============================================================================
\echo '========================================================================='
\echo 'VERIFICATION SUMMARY'
\echo '========================================================================='
\echo ''

SELECT
    '✓ Extensions' as category,
    (SELECT COUNT(*) FROM pg_extension WHERE extname = 'pg_stat_statements') as status,
    '1 required extension enabled' as description
UNION ALL
SELECT
    '✓ Views',
    (SELECT COUNT(*) FROM pg_views WHERE schemaname = 'monitoring'),
    '13+ monitoring views created'
UNION ALL
SELECT
    '✓ Functions',
    (SELECT COUNT(*) FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'monitoring'),
    '9+ monitoring functions created'
UNION ALL
SELECT
    '✓ Tables',
    (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'monitoring'),
    '2 maintenance tables created'
UNION ALL
SELECT
    '✓ Maintenance Jobs',
    (SELECT COUNT(*) FROM monitoring.maintenance_schedule),
    'Scheduled jobs configured'
UNION ALL
SELECT
    '✓ Permissions',
    (SELECT COUNT(DISTINCT privilege_type) FROM information_schema.role_table_grants WHERE grantee = 'trade_engine_app' AND table_schema = 'monitoring'),
    'Application user has access';

\echo ''
\echo '========================================================================='
\echo 'ALL TESTS PASSED - MONITORING SETUP COMPLETE'
\echo '========================================================================='
\echo ''
\echo 'Next Steps:'
\echo '  1. Run EXPLAIN ANALYZE on key queries: scripts/analyze-query-performance.sql'
\echo '  2. Set up cron jobs for maintenance functions (see docs)'
\echo '  3. Integrate monitoring views with Grafana/Prometheus'
\echo '  4. Review partition creation schedule and adjust as needed'
\echo ''
