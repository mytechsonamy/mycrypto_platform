-- =============================================================================
-- Migration 009 ROLLBACK: Optimize Depth Chart Query Performance
-- =============================================================================
-- Task: DB-EPIC3-002
-- Date: 2025-11-24
-- Author: Database Agent
--
-- PURPOSE:
-- Rollback the depth chart query optimizations added in migration 009.
-- This removes the partial covering index and extended statistics.
--
-- IMPACT:
-- - Query performance will revert to baseline (~0.4ms instead of ~0.2ms)
-- - Queries will use idx_orders_symbol_status instead
-- - Bitmap Heap Scan instead of Index-only scan
-- - Still well within <50ms performance requirement
-- - No data loss, only index removal
--
-- =============================================================================

-- =============================================================================
-- PART 1: DROP EXTENDED STATISTICS
-- =============================================================================

DROP STATISTICS IF EXISTS orders_depth_chart_stats;

-- =============================================================================
-- PART 2: DROP PARTIAL COVERING INDEX
-- =============================================================================

DROP INDEX IF EXISTS idx_orders_depth_chart;

-- Note: This will automatically drop indexes on all partitions

-- =============================================================================
-- PART 3: REFRESH TABLE STATISTICS
-- =============================================================================

-- Update statistics after index removal
ANALYZE orders;

-- =============================================================================
-- PART 4: VALIDATION
-- =============================================================================

DO $$
DECLARE
    v_index_exists BOOLEAN;
    v_stats_exists BOOLEAN;
BEGIN
    -- Verify index was removed
    SELECT EXISTS(
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'orders'
          AND indexname = 'idx_orders_depth_chart'
    ) INTO v_index_exists;

    -- Verify statistics was removed
    SELECT EXISTS(
        SELECT 1 FROM pg_statistic_ext
        WHERE stxname = 'orders_depth_chart_stats'
    ) INTO v_stats_exists;

    IF v_index_exists THEN
        RAISE EXCEPTION 'Index idx_orders_depth_chart was not dropped';
    END IF;

    IF v_stats_exists THEN
        RAISE EXCEPTION 'Statistics orders_depth_chart_stats was not dropped';
    END IF;

    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'Migration 009 ROLLBACK: Depth Chart Query Optimization - SUCCESS';
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'Removed index: idx_orders_depth_chart';
    RAISE NOTICE 'Removed statistics: orders_depth_chart_stats';
    RAISE NOTICE '';
    RAISE NOTICE 'Post-Rollback State:';
    RAISE NOTICE '  - Queries will use: idx_orders_symbol_status';
    RAISE NOTICE '  - Expected performance: ~0.4ms (still well within 50ms target)';
    RAISE NOTICE '  - Scan type: Bitmap Heap Scan (acceptable performance)';
    RAISE NOTICE '';
    RAISE NOTICE 'Remaining Indexes on orders table:';
    RAISE NOTICE '  - idx_orders_symbol_status (symbol, status)';
    RAISE NOTICE '  - idx_orders_symbol (symbol)';
    RAISE NOTICE '  - idx_orders_user_id (user_id)';
    RAISE NOTICE '  - idx_orders_status (status)';
    RAISE NOTICE '  - idx_orders_created_at (created_at DESC)';
    RAISE NOTICE '  - idx_orders_user_status_created (user_id, status, created_at DESC)';
    RAISE NOTICE '';
    RAISE NOTICE 'All depth chart queries will continue to function correctly.';
    RAISE NOTICE '=============================================================================';
END $$;

-- =============================================================================
-- PART 5: VERIFY QUERY PLAN (Optional - for testing)
-- =============================================================================

-- Uncomment to verify query plan after rollback:
-- EXPLAIN (ANALYZE, BUFFERS) SELECT price, SUM(quantity - filled_quantity) as volume, COUNT(*) as order_count FROM orders WHERE symbol = 'BTC/USDT' AND status IN ('OPEN', 'PARTIALLY_FILLED') AND side = 'BUY' AND price IS NOT NULL GROUP BY price ORDER BY price DESC LIMIT 50;

-- =============================================================================
-- END OF MIGRATION 009 ROLLBACK
-- =============================================================================

SELECT 'Migration 009 rollback completed successfully' as status;
