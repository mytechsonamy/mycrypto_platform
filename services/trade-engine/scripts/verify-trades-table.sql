-- Verification Script for Enhanced Trades Table
-- Tests schema, indexes, views, functions, and performance

\echo '========================================='
\echo 'TRADES TABLE VERIFICATION SCRIPT'
\echo '========================================='
\echo ''

-- =============================================================================
-- PART 1: TABLE STRUCTURE VERIFICATION
-- =============================================================================

\echo 'Part 1: Verifying Trades Table Structure'
\echo '-----------------------------------------'

-- Show table definition
\d trades

\echo ''
\echo 'Checking for required columns...'

SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'trades'
  AND column_name IN ('buyer_fee', 'seller_fee', 'is_buyer_maker')
ORDER BY column_name;

\echo ''
\echo 'Checking constraints...'

SELECT
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'trades'::regclass
ORDER BY contype, conname;

-- =============================================================================
-- PART 2: PARTITION VERIFICATION
-- =============================================================================

\echo ''
\echo 'Part 2: Verifying Partitions'
\echo '-----------------------------------------'

SELECT
    tablename AS partition_name,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE tablename LIKE 'trades_%'
  AND schemaname = 'public'
ORDER BY tablename DESC
LIMIT 10;

\echo ''
\echo 'Partition count:'

SELECT COUNT(*) AS total_partitions
FROM pg_tables
WHERE tablename LIKE 'trades_%'
  AND schemaname = 'public';

-- =============================================================================
-- PART 3: INDEX VERIFICATION
-- =============================================================================

\echo ''
\echo 'Part 3: Verifying Indexes'
\echo '-----------------------------------------'

SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'trades'
ORDER BY indexname;

\echo ''
\echo 'Index count:'

SELECT COUNT(*) AS total_indexes
FROM pg_indexes
WHERE tablename = 'trades';

-- =============================================================================
-- PART 4: VIEW VERIFICATION
-- =============================================================================

\echo ''
\echo 'Part 4: Verifying Views'
\echo '-----------------------------------------'

SELECT
    viewname,
    definition
FROM pg_views
WHERE viewname LIKE 'v_%trade%'
  AND schemaname = 'public'
ORDER BY viewname;

-- =============================================================================
-- PART 5: FUNCTION VERIFICATION
-- =============================================================================

\echo ''
\echo 'Part 5: Verifying Functions'
\echo '-----------------------------------------'

SELECT
    proname AS function_name,
    pg_get_function_identity_arguments(oid) AS arguments,
    pg_get_function_result(oid) AS return_type
FROM pg_proc
WHERE proname IN (
    'get_user_trades',
    'get_symbol_trades',
    'calculate_vwap',
    'get_ohlcv',
    'create_trade_partition',
    'create_trade_partitions_30days',
    'drop_old_trade_partitions'
)
ORDER BY proname;

-- =============================================================================
-- PART 6: STATISTICS VERIFICATION
-- =============================================================================

\echo ''
\echo 'Part 6: Verifying Statistics Objects'
\echo '-----------------------------------------'

SELECT
    stxname AS statistics_name,
    (SELECT array_agg(attname)
     FROM pg_attribute
     WHERE attrelid = stxrelid
       AND attnum = ANY(stxkeys)) AS columns
FROM pg_statistic_ext
WHERE stxname LIKE '%trades%';

-- =============================================================================
-- PART 7: SAMPLE DATA VERIFICATION
-- =============================================================================

\echo ''
\echo 'Part 7: Checking Existing Data'
\echo '-----------------------------------------'

SELECT
    COUNT(*) AS total_trades,
    COUNT(DISTINCT symbol) AS unique_symbols,
    MIN(executed_at) AS earliest_trade,
    MAX(executed_at) AS latest_trade
FROM trades;

\echo ''
\echo 'Sample trades with new columns:'

SELECT
    trade_id,
    symbol,
    price,
    quantity,
    buyer_fee,
    seller_fee,
    is_buyer_maker,
    executed_at
FROM trades
ORDER BY executed_at DESC
LIMIT 5;

-- =============================================================================
-- VERIFICATION COMPLETE
-- =============================================================================

\echo ''
\echo '========================================='
\echo 'VERIFICATION COMPLETE'
\echo '========================================='
\echo ''
\echo 'Next Steps:'
\echo '1. Run performance benchmark: \i scripts/benchmark-trades-performance.sql'
\echo '2. Test functions: \i scripts/test-trade-functions.sql'
\echo '3. Insert sample data: \i scripts/insert-sample-trades.sql'
\echo ''
