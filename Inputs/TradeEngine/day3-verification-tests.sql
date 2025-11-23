-- ============================================================================
-- TRADE ENGINE - DAY 3 VERIFICATION & TESTING SCRIPT
-- ============================================================================
-- Task: TASK-DB-003
-- Purpose: Verify all performance optimizations and test functionality
-- Run after: day3-performance-optimization.sql
-- ============================================================================

-- Set client encoding and output format
\timing on
\x auto

-- ============================================================================
-- TEST 1: Verify Index Creation
-- ============================================================================

\echo ''
\echo '=========================================='
\echo 'TEST 1: Verifying Index Creation'
\echo '=========================================='

-- Check composite indexes
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE indexname IN (
    'idx_orders_user_status_created',
    'idx_orders_symbol_side_price',
    'idx_orders_created_at_symbol',
    'idx_orders_client_order_id_user',
    'idx_orders_depth_covering',
    'idx_trades_buyer_seller_symbol',
    'idx_trades_time_symbol_volume'
)
ORDER BY tablename, indexname;

-- Check index sizes
SELECT
    schemaname || '.' || tablename AS table_name,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
    idx_scan AS scans,
    idx_tup_read AS tuples_read,
    idx_tup_fetch AS tuples_fetched
FROM pg_stat_user_indexes
WHERE indexname LIKE 'idx_orders_%' OR indexname LIKE 'idx_trades_%'
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 20;

-- ============================================================================
-- TEST 2: Verify Materialized Views
-- ============================================================================

\echo ''
\echo '=========================================='
\echo 'TEST 2: Verifying Materialized Views'
\echo '=========================================='

-- List all materialized views in monitoring schema
SELECT
    schemaname,
    matviewname,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||matviewname)) AS size,
    CASE
        WHEN ispopulated THEN 'POPULATED'
        ELSE 'NOT POPULATED'
    END AS status
FROM pg_matviews
WHERE schemaname = 'monitoring'
ORDER BY matviewname;

-- Check if indexes exist on materialized views
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'monitoring'
  AND tablename LIKE 'mv_%'
ORDER BY tablename, indexname;

-- ============================================================================
-- TEST 3: Test Materialized View Refresh
-- ============================================================================

\echo ''
\echo '=========================================='
\echo 'TEST 3: Testing Materialized View Refresh'
\echo '=========================================='

-- Refresh trading stats
SELECT monitoring.refresh_trading_stats() AS result;

-- Refresh user stats
SELECT monitoring.refresh_user_stats() AS result;

-- Verify data in materialized views (if data exists)
\echo ''
\echo 'Sample data from mv_trading_summary_24h:'
SELECT * FROM monitoring.mv_trading_summary_24h LIMIT 5;

\echo ''
\echo 'Sample data from mv_order_flow_metrics:'
SELECT * FROM monitoring.mv_order_flow_metrics LIMIT 5;

-- ============================================================================
-- TEST 4: Test Performance Reporting Functions
-- ============================================================================

\echo ''
\echo '=========================================='
\echo 'TEST 4: Testing Performance Reporting'
\echo '=========================================='

-- Generate daily performance report
\echo 'Generating daily performance report...'
SELECT monitoring.generate_daily_performance_report() AS report_id;

-- View latest report
\echo ''
\echo 'Latest performance report:'
SELECT
    report_id,
    report_type,
    report_date,
    total_queries,
    slow_queries_count,
    avg_query_time_ms,
    cache_hit_ratio,
    active_connections,
    issues_critical,
    issues_warning,
    recommendations
FROM monitoring.performance_reports
ORDER BY report_id DESC
LIMIT 1;

-- ============================================================================
-- TEST 5: Test Utility Functions
-- ============================================================================

\echo ''
\echo '=========================================='
\echo 'TEST 5: Testing Utility Functions'
\echo '=========================================='

-- Test index improvement suggestions
\echo 'Index improvement suggestions:'
SELECT * FROM monitoring.suggest_index_improvements()
LIMIT 5;

-- Test slow query analysis (if pg_stat_statements is enabled)
\echo ''
\echo 'Slow query analysis (>50ms):'
SELECT
    query_id,
    LEFT(query_text, 80) AS query_snippet,
    calls,
    mean_time_ms,
    max_time_ms,
    cache_hit_pct
FROM monitoring.analyze_slow_queries(50)
LIMIT 5;

-- Test partition size report
\echo ''
\echo 'Partition size report:'
SELECT
    partition_name,
    partition_type,
    rows_estimate,
    total_size_mb,
    table_size_mb,
    index_size_mb
FROM monitoring.partition_size_report()
ORDER BY total_size_mb DESC
LIMIT 10;

-- Test table fragmentation check
\echo ''
\echo 'Table fragmentation check:'
SELECT
    table_name,
    total_size_mb,
    bloat_pct,
    dead_tuples,
    live_tuples,
    recommendation
FROM monitoring.table_fragmentation_check()
ORDER BY bloat_pct DESC NULLS LAST
LIMIT 10;

-- Test index usage analysis
\echo ''
\echo 'Index usage analysis:'
SELECT
    table_name,
    index_name,
    index_size_mb,
    index_scans,
    usage_ratio,
    recommendation
FROM monitoring.index_usage_analysis()
ORDER BY index_scans ASC
LIMIT 10;

-- ============================================================================
-- TEST 6: Verify Monitoring Views
-- ============================================================================

\echo ''
\echo '=========================================='
\echo 'TEST 6: Verifying Monitoring Views'
\echo '=========================================='

-- Test query performance view
\echo 'Query performance summary (top 5 by total time):'
SELECT
    LEFT(query_snippet, 60) AS query,
    calls,
    mean_time_ms,
    max_time_ms,
    cache_hit_pct,
    performance_status
FROM monitoring.v_query_performance
LIMIT 5;

-- Test connection status view
\echo ''
\echo 'Connection pool status:'
SELECT * FROM monitoring.v_connection_status;

-- Test table sizes view
\echo ''
\echo 'Table sizes (top 5):'
SELECT
    tablename,
    total_size,
    table_size,
    indexes_size,
    row_estimate,
    dead_row_pct,
    last_vacuum
FROM monitoring.v_table_sizes
LIMIT 5;

-- Test partition health view
\echo ''
\echo 'Partition health status:'
SELECT
    parent_table,
    total_partitions,
    oldest_partition,
    newest_partition,
    days_until_newest,
    total_size,
    health_status
FROM monitoring.v_partition_health;

-- ============================================================================
-- TEST 7: Performance Baseline Tracking
-- ============================================================================

\echo ''
\echo '=========================================='
\echo 'TEST 7: Performance Baseline Tracking'
\echo '=========================================='

-- View all performance baselines
SELECT
    metric_name,
    current_value,
    threshold_warning,
    threshold_critical,
    unit,
    CASE
        WHEN current_value >= threshold_critical THEN 'CRITICAL'
        WHEN current_value >= threshold_warning THEN 'WARNING'
        ELSE 'OK'
    END AS status,
    last_checked_at
FROM monitoring.performance_baselines
WHERE is_enabled = TRUE
ORDER BY metric_name;

-- Check for active alerts
\echo ''
\echo 'Active performance alerts:'
SELECT
    metric_name,
    current_value,
    threshold_warning,
    threshold_critical,
    severity,
    message
FROM monitoring.check_performance_alerts();

-- ============================================================================
-- TEST 8: Index Performance Testing with EXPLAIN
-- ============================================================================

\echo ''
\echo '=========================================='
\echo 'TEST 8: Index Performance Testing'
\echo '=========================================='

-- Test composite index for user orders with status
\echo 'Testing idx_orders_user_status_created...'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT order_id, symbol, side, price, quantity, status, created_at
FROM orders
WHERE user_id = '00000000-0000-0000-0000-000000000001'
  AND status IN ('OPEN', 'PARTIALLY_FILLED')
ORDER BY created_at DESC
LIMIT 10;

-- Test covering index for order book depth
\echo ''
\echo 'Testing idx_orders_depth_covering...'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT symbol, side, price, SUM(quantity - filled_quantity) AS total_quantity
FROM orders
WHERE symbol = 'BTC/USDT'
  AND status IN ('OPEN', 'PARTIALLY_FILLED')
  AND price IS NOT NULL
GROUP BY symbol, side, price
ORDER BY price DESC
LIMIT 20;

-- Test trade history index
\echo ''
\echo 'Testing idx_trades_buyer_seller_symbol...'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT trade_id, symbol, price, quantity, executed_at
FROM trades
WHERE buyer_user_id = '00000000-0000-0000-0000-000000000001'
ORDER BY executed_at DESC
LIMIT 10;

-- ============================================================================
-- TEST 9: Materialized View Performance Comparison
-- ============================================================================

\echo ''
\echo '=========================================='
\echo 'TEST 9: Materialized View Performance'
\echo '=========================================='

-- Compare regular query vs materialized view for 24h stats
\echo 'Regular query performance (24h trading stats):'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT
    symbol,
    COUNT(*) as trade_count,
    SUM(quantity) as total_volume,
    MIN(price) as low_price,
    MAX(price) as high_price,
    AVG(price) as avg_price
FROM trades
WHERE executed_at >= NOW() - INTERVAL '24 hours'
GROUP BY symbol;

\echo ''
\echo 'Materialized view performance (same data):'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT
    symbol,
    trade_count,
    total_volume,
    low_price,
    high_price,
    avg_price
FROM monitoring.mv_trading_summary_24h;

-- ============================================================================
-- TEST 10: Database Statistics Summary
-- ============================================================================

\echo ''
\echo '=========================================='
\echo 'TEST 10: Database Statistics Summary'
\echo '=========================================='

-- Database size and statistics
SELECT
    current_database() AS database_name,
    pg_size_pretty(pg_database_size(current_database())) AS database_size,
    (SELECT COUNT(*) FROM pg_stat_user_tables WHERE schemaname = 'public') AS table_count,
    (SELECT COUNT(*) FROM pg_stat_user_indexes WHERE schemaname = 'public') AS index_count,
    (SELECT COUNT(*) FROM pg_matviews WHERE schemaname = 'monitoring') AS matview_count,
    (SELECT setting FROM pg_settings WHERE name = 'shared_buffers') AS shared_buffers,
    (SELECT setting FROM pg_settings WHERE name = 'effective_cache_size') AS effective_cache_size,
    (SELECT setting FROM pg_settings WHERE name = 'max_connections') AS max_connections;

-- Cache hit ratio
SELECT
    'Cache Hit Ratio' AS metric,
    ROUND(
        SUM(blks_hit)::NUMERIC / NULLIF(SUM(blks_hit + blks_read), 0) * 100, 2
    ) AS value,
    '%' AS unit
FROM pg_stat_database
WHERE datname = current_database();

-- Transaction statistics
SELECT
    'Transactions' AS metric,
    xact_commit AS commits,
    xact_rollback AS rollbacks,
    ROUND(xact_commit::NUMERIC / NULLIF(xact_commit + xact_rollback, 0) * 100, 2) AS commit_ratio_pct
FROM pg_stat_database
WHERE datname = current_database();

-- ============================================================================
-- TEST 11: Verify Grants and Permissions
-- ============================================================================

\echo ''
\echo '=========================================='
\echo 'TEST 11: Verifying Grants and Permissions'
\echo '=========================================='

-- Check schema permissions
SELECT
    nspname AS schema_name,
    nspowner::regrole AS owner,
    array_agg(DISTINCT grantee::text) AS grantees
FROM pg_namespace
LEFT JOIN LATERAL (
    SELECT grantee
    FROM information_schema.role_usage_grants
    WHERE object_schema = nspname
) AS grants ON TRUE
WHERE nspname = 'monitoring'
GROUP BY nspname, nspowner;

-- Check table permissions
SELECT
    schemaname,
    tablename,
    tableowner,
    has_table_privilege('trade_engine_app', schemaname||'.'||tablename, 'SELECT') AS app_can_select,
    has_table_privilege('trade_engine_readonly', schemaname||'.'||tablename, 'SELECT') AS readonly_can_select
FROM pg_tables
WHERE schemaname = 'monitoring'
ORDER BY tablename;

-- ============================================================================
-- TEST 12: Performance Benchmarks
-- ============================================================================

\echo ''
\echo '=========================================='
\echo 'TEST 12: Performance Benchmarks'
\echo '=========================================='

-- Benchmark: Order book depth query
\echo 'Benchmark: Order book depth query (run 100 times):'
DO $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    i INT;
    result RECORD;
BEGIN
    start_time := clock_timestamp();

    FOR i IN 1..100 LOOP
        SELECT COUNT(*) INTO result
        FROM orders
        WHERE symbol = 'BTC/USDT'
          AND status IN ('OPEN', 'PARTIALLY_FILLED')
          AND price IS NOT NULL;
    END LOOP;

    end_time := clock_timestamp();

    RAISE NOTICE 'Execution time for 100 queries: % ms',
        EXTRACT(MILLISECONDS FROM (end_time - start_time));
    RAISE NOTICE 'Average per query: % ms',
        EXTRACT(MILLISECONDS FROM (end_time - start_time)) / 100;
END $$;

-- Benchmark: Materialized view query
\echo ''
\echo 'Benchmark: Materialized view query (run 100 times):'
DO $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    i INT;
    result RECORD;
BEGIN
    start_time := clock_timestamp();

    FOR i IN 1..100 LOOP
        SELECT COUNT(*) INTO result
        FROM monitoring.mv_trading_summary_24h;
    END LOOP;

    end_time := clock_timestamp();

    RAISE NOTICE 'Execution time for 100 queries: % ms',
        EXTRACT(MILLISECONDS FROM (end_time - start_time));
    RAISE NOTICE 'Average per query: % ms',
        EXTRACT(MILLISECONDS FROM (end_time - start_time)) / 100;
END $$;

-- ============================================================================
-- FINAL SUMMARY
-- ============================================================================

\echo ''
\echo '=========================================='
\echo 'VERIFICATION COMPLETE'
\echo '=========================================='
\echo ''
\echo 'All tests executed. Review results above.'
\echo ''
\echo 'Key metrics to monitor:'
\echo '1. Cache hit ratio should be >95%'
\echo '2. Slow queries should be <10 per day'
\echo '3. Index usage ratio should be high for critical indexes'
\echo '4. Materialized views should be faster than raw queries'
\echo '5. No critical alerts in performance baselines'
\echo ''
\echo 'Next steps:'
\echo '1. Review slow query analysis and optimize as needed'
\echo '2. Set up pg_cron for automated refresh schedules'
\echo '3. Configure alerting for critical performance issues'
\echo '4. Monitor partition health and create new partitions'
\echo '=========================================='

\timing off
