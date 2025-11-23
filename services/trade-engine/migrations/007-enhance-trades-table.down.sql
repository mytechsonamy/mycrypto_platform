-- Migration 007 ROLLBACK: Enhance Trades Table
-- Removes fee columns, indexes, views, and functions added in migration 007

-- =============================================================================
-- PART 1: DROP MONITORING VIEWS
-- =============================================================================

DROP VIEW IF EXISTS v_trade_index_usage CASCADE;
DROP VIEW IF EXISTS v_trade_partition_info CASCADE;

-- =============================================================================
-- PART 2: DROP STATISTICS
-- =============================================================================

DROP STATISTICS IF EXISTS trades_user_time_stats;
DROP STATISTICS IF EXISTS trades_symbol_time_stats;

-- =============================================================================
-- PART 3: DROP PARTITION MAINTENANCE FUNCTIONS
-- =============================================================================

DROP FUNCTION IF EXISTS drop_old_trade_partitions(INT);
DROP FUNCTION IF EXISTS create_trade_partition();
DROP FUNCTION IF EXISTS create_trade_partitions_30days();

-- =============================================================================
-- PART 4: DROP UTILITY FUNCTIONS
-- =============================================================================

DROP FUNCTION IF EXISTS get_ohlcv(VARCHAR, INTERVAL, INTERVAL);
DROP FUNCTION IF EXISTS calculate_vwap(VARCHAR, INTERVAL);
DROP FUNCTION IF EXISTS get_symbol_trades(VARCHAR, TIMESTAMPTZ, TIMESTAMPTZ, INT);
DROP FUNCTION IF EXISTS get_user_trades(UUID, VARCHAR, INT);

-- =============================================================================
-- PART 5: DROP ANALYTICS VIEWS
-- =============================================================================

DROP VIEW IF EXISTS v_symbol_price_history CASCADE;
DROP VIEW IF EXISTS v_user_trade_history CASCADE;
DROP VIEW IF EXISTS v_trade_volume_24h CASCADE;
DROP VIEW IF EXISTS v_recent_trades CASCADE;

-- =============================================================================
-- PART 6: DROP ADDITIONAL INDEXES
-- =============================================================================

DROP INDEX IF EXISTS idx_trades_maker_flag;
DROP INDEX IF EXISTS idx_trades_symbol_time_volume;
DROP INDEX IF EXISTS idx_trades_seller_user_executed;
DROP INDEX IF EXISTS idx_trades_buyer_user_executed;
DROP INDEX IF EXISTS idx_trades_seller_order;
DROP INDEX IF EXISTS idx_trades_buyer_order;

-- =============================================================================
-- PART 7: REMOVE COLUMNS FROM TRADES TABLE
-- =============================================================================

ALTER TABLE trades
    DROP COLUMN IF EXISTS is_buyer_maker,
    DROP COLUMN IF EXISTS seller_fee,
    DROP COLUMN IF EXISTS buyer_fee;

-- =============================================================================
-- ROLLBACK COMPLETE
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Migration 007 rollback completed successfully';
    RAISE NOTICE 'Removed: fee columns, maker/taker flag, indexes, views, and utility functions';
END $$;
