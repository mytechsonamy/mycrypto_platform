-- ================================================================
-- TASK: Stream 3 - Database Index Verification
-- Database Engineer Agent
-- Date: 2025-11-23
-- ================================================================

\echo '=== DATABASE INDEX VERIFICATION ==='
\echo ''
\echo 'Checking all indexes on orders and trades tables...'
\echo ''

-- ================================================================
-- 1. ORDERS TABLE INDEXES
-- ================================================================
\echo '1. ORDERS TABLE INDEXES:'
\echo '------------------------'
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'orders'
ORDER BY indexname;

\echo ''
\echo '2. TRADES TABLE INDEXES:'
\echo '------------------------'
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename LIKE 'trades%'
ORDER BY indexname;

\echo ''
\echo '3. INDEX SIZES:'
\echo '---------------'
SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
    pg_relation_size(indexrelid) as size_bytes
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;

\echo ''
\echo '4. INDEX USAGE STATISTICS:'
\echo '--------------------------'
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan as scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched,
    CASE
        WHEN idx_scan = 0 THEN 'UNUSED'
        WHEN idx_scan < 10 THEN 'LOW USAGE'
        WHEN idx_scan < 100 THEN 'MODERATE USAGE'
        ELSE 'HIGH USAGE'
    END as usage_level
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

\echo ''
\echo '5. TABLE STATISTICS:'
\echo '--------------------'
SELECT
    schemaname,
    tablename,
    n_live_tup as row_count,
    n_dead_tup as dead_rows,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY tablename;

\echo ''
\echo '6. INDEX BLOAT CHECK:'
\echo '---------------------'
SELECT
    current_database() AS database,
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
    idx_scan AS index_scans,
    idx_tup_read AS tuples_read,
    idx_tup_fetch AS tuples_fetched,
    CASE
        WHEN idx_scan = 0 THEN 'Consider dropping - never used'
        WHEN idx_scan < 50 AND pg_relation_size(indexrelid) > 1000000 THEN 'Review usage - low scans for size'
        ELSE 'OK'
    END AS recommendation
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;

\echo ''
\echo '=== VERIFICATION COMPLETE ==='
