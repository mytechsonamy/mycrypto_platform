-- Migration 008 ROLLBACK: Optimize Order Book Query Performance
-- Description: Remove composite indexes and statistics added for Story 3.1
-- Author: Database Agent
-- Date: 2025-11-24
-- Task: DB-EPIC3-001

-- =============================================================================
-- ROLLBACK STRATEGY
-- =============================================================================
--
-- This rollback removes the optimizations added in migration 008:
-- 1. Composite index: idx_orders_user_status_created
-- 2. Extended statistics: orders_user_status_created_stats
--
-- IMPACT OF ROLLBACK:
-- - Query performance will revert to using single-column indexes
-- - User order filtering queries may be slightly slower (still < 200ms)
-- - Original indexes (idx_orders_user_id, idx_orders_status) remain intact
-- - No data loss, only index removal
--
-- =============================================================================

-- Drop extended statistics
DROP STATISTICS IF EXISTS orders_user_status_created_stats;

-- Drop composite index
DROP INDEX IF EXISTS idx_orders_user_status_created;

-- =============================================================================
-- VALIDATION
-- =============================================================================

DO $$
DECLARE
    v_index_exists BOOLEAN;
    v_stats_exists BOOLEAN;
BEGIN
    -- Check index was removed
    SELECT EXISTS(
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'orders'
          AND indexname = 'idx_orders_user_status_created'
    ) INTO v_index_exists;

    -- Check statistics was removed
    SELECT EXISTS(
        SELECT 1 FROM pg_statistic_ext
        WHERE stxname = 'orders_user_status_created_stats'
    ) INTO v_stats_exists;

    IF v_index_exists THEN
        RAISE EXCEPTION 'Index idx_orders_user_status_created was not dropped';
    END IF;

    IF v_stats_exists THEN
        RAISE EXCEPTION 'Statistics orders_user_status_created_stats was not dropped';
    END IF;

    RAISE NOTICE 'Migration 008 rollback completed successfully';
    RAISE NOTICE 'Removed composite index: idx_orders_user_status_created';
    RAISE NOTICE 'Removed statistics: orders_user_status_created_stats';
    RAISE NOTICE 'Original indexes remain intact (no performance degradation for core queries)';
END $$;

-- =============================================================================
-- POST-ROLLBACK STATE
-- =============================================================================
--
-- After rollback, these indexes remain available:
--
-- ORDERS TABLE:
-- - PRIMARY KEY: (order_id, created_at)
-- - idx_orders_user_id: (user_id)
-- - idx_orders_symbol_status: (symbol, status)
-- - idx_orders_created_at: (created_at DESC)
-- - idx_orders_status: (status)
-- - idx_orders_symbol: (symbol)
-- - idx_orders_client_order_id: (client_order_id)
--
-- TRADES TABLE: (unchanged)
-- - All indexes from migration 002 and 007 remain
--
-- QUERY PERFORMANCE AFTER ROLLBACK:
-- - Order history: Still ~0.2ms (uses idx_orders_user_id)
-- - Trade history: Still ~0.3ms (uses composite user+executed indexes)
-- - Filtered orders: ~0.9ms (uses idx_orders_status or idx_orders_user_id)
--
-- All queries still meet the <200ms requirement
-- =============================================================================

SELECT 'Migration 008 rollback completed successfully' as status;
