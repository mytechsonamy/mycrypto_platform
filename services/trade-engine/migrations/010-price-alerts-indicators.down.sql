-- Migration 010 Rollback: Price Alerts and Technical Indicators
-- Drops all tables, views, functions, and enums created in migration 010
-- Safe rollback: Drops in reverse dependency order

-- =============================================================================
-- PART 1: DROP VIEWS (No dependencies)
-- =============================================================================

DROP VIEW IF EXISTS v_indicator_cache_stats;
DROP VIEW IF EXISTS v_alert_stats_by_user;
DROP VIEW IF EXISTS v_alert_stats_by_symbol;

-- =============================================================================
-- PART 2: DROP FUNCTIONS
-- =============================================================================

DROP FUNCTION IF EXISTS cleanup_old_indicators(INT);
DROP FUNCTION IF EXISTS get_indicator_series(VARCHAR, indicator_type_enum, INT, TIMESTAMPTZ, TIMESTAMPTZ, INT);
DROP FUNCTION IF EXISTS get_latest_indicator(VARCHAR, indicator_type_enum, INT);
DROP FUNCTION IF EXISTS update_alert_check_time(UUID[]);
DROP FUNCTION IF EXISTS trigger_price_alert(UUID, NUMERIC);
DROP FUNCTION IF EXISTS get_user_active_alerts(UUID, VARCHAR);

-- =============================================================================
-- PART 3: DROP STATISTICS
-- =============================================================================

DROP STATISTICS IF EXISTS indicators_symbol_type_stats;
DROP STATISTICS IF EXISTS alerts_symbol_type_stats;
DROP STATISTICS IF EXISTS alerts_user_symbol_stats;

-- =============================================================================
-- PART 4: DROP INDEXES (Will be dropped automatically with tables, but explicit for clarity)
-- =============================================================================

-- Price alerts indexes
DROP INDEX IF EXISTS idx_alerts_symbol_type_active;
DROP INDEX IF EXISTS idx_alerts_created;
DROP INDEX IF EXISTS idx_alerts_triggered;
DROP INDEX IF EXISTS idx_alerts_active_symbol;
DROP INDEX IF EXISTS idx_alerts_user_symbol;

-- Indicator values indexes
DROP INDEX IF EXISTS idx_indicators_full_spec;
DROP INDEX IF EXISTS idx_indicators_time_symbol;
DROP INDEX IF EXISTS idx_indicators_symbol_type_period;
DROP INDEX IF EXISTS idx_indicators_symbol_type_time;

-- =============================================================================
-- PART 5: DROP TABLES
-- =============================================================================

DROP TABLE IF EXISTS indicator_values;
DROP TABLE IF EXISTS price_alerts;

-- =============================================================================
-- PART 6: DROP ENUMS
-- =============================================================================

DROP TYPE IF EXISTS indicator_type_enum;
DROP TYPE IF EXISTS alert_type_enum;

-- =============================================================================
-- ROLLBACK COMPLETE
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Migration 010 rollback completed successfully';
    RAISE NOTICE 'Dropped: price_alerts table';
    RAISE NOTICE 'Dropped: indicator_values table';
    RAISE NOTICE 'Dropped: 2 enum types';
    RAISE NOTICE 'Dropped: 6 utility functions';
    RAISE NOTICE 'Dropped: 3 monitoring views';
    RAISE NOTICE 'System restored to pre-migration 010 state';
END $$;
