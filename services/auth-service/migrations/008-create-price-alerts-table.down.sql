-- Rollback: Drop price_alerts table

DROP TRIGGER IF EXISTS trigger_update_price_alerts_updated_at ON price_alerts;
DROP FUNCTION IF EXISTS update_price_alerts_updated_at();
DROP INDEX IF EXISTS idx_price_alerts_unique;
DROP INDEX IF EXISTS idx_price_alerts_user_symbol;
DROP INDEX IF EXISTS idx_price_alerts_active;
DROP INDEX IF EXISTS idx_price_alerts_symbol;
DROP INDEX IF EXISTS idx_price_alerts_user_id;
DROP TABLE IF EXISTS price_alerts;
